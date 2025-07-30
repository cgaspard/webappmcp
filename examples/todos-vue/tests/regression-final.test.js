/**
 * Regression tests for Vue Todo App using WebApp MCP
 * Uses direct WebSocket connection to match server implementation
 * 
 * Run with: npm test
 * Requires the Vue app to be running on localhost:4834
 */

const WebSocket = require('ws');

class VueTodoRegressionTester {
  constructor() {
    this.ws = null;
    this.clientId = null;
    this.messageHandlers = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout. Make sure Vue app is running on localhost:4834'));
      }, 5000);

      // Connect to the WebSocket endpoint the server actually exposes
      this.ws = new WebSocket('ws://localhost:4835', {
        headers: {
          'Authorization': 'Bearer demo-token'
        }
      });

      this.ws.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ Connected to WebApp MCP WebSocket server');
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('Received message:', message.type, message);
          
          // Handle initial connection message
          if (message.type === 'connected' && message.clientId) {
            this.clientId = message.clientId;
            console.log(`Assigned client ID: ${this.clientId}`);
            resolve();
          }
          
          // Handle tool responses
          if (message.type === 'tool_response' && message.requestId) {
            const handler = this.messageHandlers.get(message.requestId);
            if (handler) {
              this.messageHandlers.delete(message.requestId);
              
              if (message.success === false) {
                handler.reject(new Error(message.error || 'Tool execution failed'));
              } else {
                handler.resolve(message.result);
              }
            }
          }
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      });

      this.ws.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      this.ws.on('close', () => {
        console.log('WebSocket connection closed');
      });
    });
  }

  async disconnect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  async callTool(toolName, args = {}) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const requestId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(requestId);
        reject(new Error(`Tool call timeout: ${toolName}`));
      }, 10000);

      this.messageHandlers.set(requestId, {
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        }
      });

      // Send message in the format the server expects
      const message = {
        type: 'tool_execute',
        requestId: requestId,
        tool: toolName,
        args: args
      };
      console.log('Sending tool request:', message);
      this.ws.send(JSON.stringify(message));
    });
  }

  async addTodo(text) {
    await this.callTool('interaction_type', {
      selector: '#new-todo',
      text: text,
      clear: true
    });
    
    await this.callTool('interaction_click', {
      selector: 'button'
    });
  }

  async getTodoItems() {
    const result = await this.callTool('dom_query', {
      selector: '.todo-item',
      limit: 50
    });
    return result?.elements || [];
  }

  async deleteTodo(index) {
    const todos = await this.getTodoItems();
    if (todos[index]) {
      const deleteButton = `[data-id="${todos[index].attributes['data-id']}"] .delete-button`;
      await this.callTool('interaction_click', {
        selector: deleteButton
      });
    }
  }

  async getTodoCount() {
    const result = await this.callTool('dom_get_text', {
      selector: '.todo-count, .items-left'
    });
    return result?.text || '';
  }

  async takeScreenshot(name) {
    const result = await this.callTool('capture_screenshot', {
      fullPage: true,
      format: 'png'
    });
    console.log(`Screenshot: ${name} -> ${result?.path}`);
    return result?.path;
  }

  async getConsoleLogs() {
    const result = await this.callTool('console_get_logs', {
      level: 'all',
      limit: 100
    });
    return result?.logs || [];
  }

  async clearTodos() {
    const todos = await this.getTodoItems();
    for (let i = todos.length - 1; i >= 0; i--) {
      await this.deleteTodo(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async waitForConnection() {
    // Wait a bit for the client to fully initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Test Suite
describe('Vue Todo App Regression Tests', () => {
  let tester;

  beforeAll(async () => {
    tester = new VueTodoRegressionTester();
    await tester.connect();
    await tester.waitForConnection();
  });

  afterAll(async () => {
    await tester.disconnect();
  });

  beforeEach(async () => {
    await tester.clearTodos();
  });

  test('should load Vue app successfully', async () => {
    const result = await tester.callTool('dom_query', {
      selector: '#app'
    });
    
    expect(result?.elements).toBeDefined();
    expect(result.elements).toHaveLength(1);
    expect(result.elements[0].tagName).toBe('div');
  });

  test('should add a new todo item', async () => {
    const todoText = 'Regression test todo';
    
    await tester.addTodo(todoText);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for DOM update
    
    const todos = await tester.getTodoItems();
    expect(todos).toHaveLength(1);
    expect(todos[0].text).toContain(todoText);
  });

  test('should handle multiple todos', async () => {
    await tester.addTodo('First todo');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await tester.addTodo('Second todo');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await tester.addTodo('Third todo');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const todos = await tester.getTodoItems();
    expect(todos).toHaveLength(3);
  });

  test('should delete todo items', async () => {
    await tester.addTodo('Todo to delete');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let todos = await tester.getTodoItems();
    expect(todos).toHaveLength(1);
    
    await tester.deleteTodo(0);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    todos = await tester.getTodoItems();
    expect(todos).toHaveLength(0);
  });

  test('visual regression - empty state', async () => {
    const screenshotPath = await tester.takeScreenshot('vue-todo-empty');
    expect(screenshotPath).toBeTruthy();
  });

  test('visual regression - with todos', async () => {
    await tester.addTodo('Visual test todo 1');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await tester.addTodo('Visual test todo 2');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const screenshotPath = await tester.takeScreenshot('vue-todo-with-items');
    expect(screenshotPath).toBeTruthy();
  });
});