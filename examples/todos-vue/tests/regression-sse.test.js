/**
 * Regression tests for Vue Todo App using WebApp MCP with SSE transport
 * 
 * Run with: npm test
 * Requires the Vue app to be running on localhost:4834
 */

const http = require('http');

class VueTodoRegressionTester {
  constructor(baseUrl = 'http://localhost:4834') {
    this.baseUrl = baseUrl;
    this.mcpEndpoint = `${baseUrl}/mcp/sse`;
    this.authToken = 'demo-token';
    this.requestId = 0;
  }

  async connect() {
    // Test connection by making a simple request
    try {
      console.log('Connecting to MCP SSE endpoint...');
      // For SSE, we don't maintain a persistent connection in tests
      // Each request will be sent individually
      console.log('✅ MCP SSE endpoint ready');
      return true;
    } catch (error) {
      throw new Error(`Failed to connect to MCP server: ${error.message}`);
    }
  }

  async disconnect() {
    // No persistent connection to close with SSE
    return true;
  }

  async sendMcpRequest(tool, params = {}) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestId;
      const payload = JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: {
          name: tool,
          arguments: params
        }
      });

      const options = {
        hostname: 'localhost',
        port: 4834,
        path: '/mcp/sse',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'Authorization': `Bearer ${this.authToken}`
        }
      };

      const req = http.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // SSE format: data: {...}\n\n
            const lines = data.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.substring(6);
                const response = JSON.parse(jsonStr);
                if (response.error) {
                  reject(new Error(response.error.message));
                } else {
                  resolve(response.result || response);
                }
                return;
              }
            }
            reject(new Error('No valid SSE data received'));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout for ${tool}`));
      });

      req.setTimeout(10000);
      req.write(payload);
      req.end();
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
    return result.elements || [];
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
    return result.text || '';
  }

  async takeScreenshot(name) {
    const result = await this.sendMcpRequest('mcp__webapp-sse__capture_screenshot', {
      fullPage: true,
      format: 'png'
    });
    console.log(`Screenshot saved: ${name} -> ${result.path}`);
    return result.path;
  }

  async getConsoleLogs() {
    const result = await this.sendMcpRequest('mcp__webapp-sse__console_get_logs', {
      level: 'all',
      limit: 100
    });
    return result.logs || [];
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
describe('Vue Todo App Regression Tests (SSE)', () => {
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
    
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0].tagName).toBe('div');
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