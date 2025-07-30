/**
 * Regression tests for Vue Todo App using WebApp MCP
 * 
 * Run with: npm test
 * Requires the Vue app to be running on localhost:3000
 */

const { WebSocket } = require('ws');

class VueTodoRegressionTester {
  constructor(wsUrl = 'ws://localhost:4835') {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.requestId = 0;
    this.authToken = 'demo-token';
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout. Make sure Vue app is running on localhost:4834'));
      }, 5000);

      this.ws = new WebSocket(this.wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      this.ws.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ Connected to MCP WebSocket server');
        resolve();
      });
      
      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket connection failed: ${error.message}. Ensure Vue app is running.`));
      });
    });
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  async sendMcpRequest(tool, params = {}) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      const message = {
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: {
          name: tool,
          arguments: params
        }
      };

      const timeout = setTimeout(() => {
        reject(new Error(`Request timeout for ${tool}`));
      }, 10000);

      const handleMessage = (data) => {
        try {
          const response = JSON.parse(data);
          if (response.id === requestId) {
            clearTimeout(timeout);
            this.ws.off('message', handleMessage);
            if (response.error) {
              reject(new Error(response.error.message));
            } else {
              resolve(response.result);
            }
          }
        } catch (e) {
          // Ignore parsing errors for other messages
        }
      };

      this.ws.on('message', handleMessage);
      this.ws.send(JSON.stringify(message));
    });
  }

  async addTodo(text) {
    await this.sendMcpRequest('mcp__webapp-sse__interaction_type', {
      selector: '#new-todo',
      text: text,
      clear: true
    });

    await this.sendMcpRequest('mcp__webapp-sse__interaction_click', {
      selector: 'button'
    });
  }

  async getTodoItems() {
    const result = await this.sendMcpRequest('mcp__webapp-sse__dom_query', {
      selector: '.todo-item',
      limit: 50
    });
    return result.content?.elements || [];
  }

  async deleteTodo(index) {
    const todos = await this.getTodoItems();
    if (todos[index]) {
      const deleteButton = `[data-id="${todos[index].attributes['data-id']}"] .delete-button`;
      await this.sendMcpRequest('mcp__webapp-sse__interaction_click', {
        selector: deleteButton
      });
    }
  }

  async getTodoCount() {
    const result = await this.sendMcpRequest('mcp__webapp-sse__dom_get_text', {
      selector: '.todo-count, .items-left'
    });
    return result.content?.text || '';
  }

  async takeScreenshot(name) {
    const result = await this.sendMcpRequest('mcp__webapp-sse__capture_screenshot', {
      fullPage: true,
      format: 'png'
    });
    console.log(`Screenshot saved: ${name} -> ${result.content?.path}`);
    return result.content?.path;
  }

  async getConsoleLogs() {
    const result = await this.sendMcpRequest('mcp__webapp-sse__console_get_logs', {
      level: 'all',
      limit: 100
    });
    return result.content?.logs || [];
  }

  async clearTodos() {
    const todos = await this.getTodoItems();
    for (let i = todos.length - 1; i >= 0; i--) {
      await this.deleteTodo(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Test Suite
describe('Vue Todo App Regression Tests', () => {
  let tester;

  beforeAll(async () => {
    tester = new VueTodoRegressionTester();
    await tester.connect();
  });

  afterAll(async () => {
    await tester.disconnect();
  });

  beforeEach(async () => {
    await tester.clearTodos();
  });

  test('should load Vue app successfully', async () => {
    const result = await tester.sendMcpRequest('mcp__webapp-sse__dom_query', {
      selector: '#app'
    });

    expect(result.content?.elements).toHaveLength(1);
    expect(result.content?.elements[0].tagName).toBe('div');
  });

  test('should add a new todo item', async () => {
    const todoText = 'Regression test todo';

    await tester.addTodo(todoText);

    const todos = await tester.getTodoItems();
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toContain(todoText);
  });

  test('should handle multiple todos', async () => {
    await tester.addTodo('First todo');
    await tester.addTodo('Second todo');
    await tester.addTodo('Third todo');

    const todos = await tester.getTodoItems();
    expect(todos).toHaveLength(3);
    expect(todos[0].text).toContain('First todo');
    expect(todos[1].text).toContain('Second todo');
    expect(todos[2].text).toContain('Third todo');
  });

  test('should delete todo items', async () => {
    await tester.addTodo('Todo to delete');

    let todos = await tester.getTodoItems();
    expect(todos).toHaveLength(1);

    await tester.deleteTodo(0);

    todos = await tester.getTodoItems();
    expect(todos).toHaveLength(0);
  });

  test('should update todo count correctly', async () => {
    let count = await tester.getTodoCount();
    expect(count).toContain('0 items');

    await tester.addTodo('Test count');
    count = await tester.getTodoCount();
    expect(count).toContain('1 item');

    await tester.addTodo('Second item');
    count = await tester.getTodoCount();
    expect(count).toContain('2 items');
  });

  test('should not have console errors during normal operation', async () => {
    const initialLogs = await tester.getConsoleLogs();
    const initialErrors = initialLogs.filter(log => log.level === 'error').length;

    await tester.addTodo('Error test todo');
    await tester.deleteTodo(0);

    const finalLogs = await tester.getConsoleLogs();
    const finalErrors = finalLogs.filter(log => log.level === 'error').length;

    expect(finalErrors).toBe(initialErrors);
  });

  test('visual regression - empty state', async () => {
    const screenshotPath = await tester.takeScreenshot('vue-todo-empty');
    expect(screenshotPath).toBeTruthy();
  });

  test('visual regression - with todos', async () => {
    await tester.addTodo('Visual test todo 1');
    await tester.addTodo('Visual test todo 2');

    const screenshotPath = await tester.takeScreenshot('vue-todo-with-items');
    expect(screenshotPath).toBeTruthy();
  });
});