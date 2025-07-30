#!/usr/bin/env node
/**
 * MCP Regression Test Runner for Vue Todo App
 * 
 * This script runs regression tests using the MCP SDK directly
 * Requires: Vue app running on localhost:4834
 * Run with: node tests/mcp-regression-runner.js
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

class TestRunner {
  constructor() {
    this.client = null;
    this.transport = null;
    this.results = [];
    this.currentTest = null;
  }

  async connect() {
    console.log('🔌 Connecting to MCP server...');
    
    this.transport = new SSEClientTransport(
      new URL('http://localhost:4834/mcp/sse'),
      {
        headers: {
          'Authorization': 'Bearer demo-token'
        }
      }
    );
    
    this.client = new Client(
      {
        name: 'vue-regression-test',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );
    
    await this.client.connect(this.transport);
    console.log('✅ Connected to MCP server\n');
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
    }
  }

  async runTest(name, testFn) {
    this.currentTest = { name, status: 'running', startTime: Date.now() };
    console.log(`🧪 ${name}...`);
    
    try {
      await testFn();
      this.currentTest.status = 'passed';
      this.currentTest.duration = Date.now() - this.currentTest.startTime;
      console.log(`   ✅ PASSED (${this.currentTest.duration}ms)\n`);
    } catch (error) {
      this.currentTest.status = 'failed';
      this.currentTest.error = error.message;
      this.currentTest.duration = Date.now() - this.currentTest.startTime;
      console.log(`   ❌ FAILED: ${error.message} (${this.currentTest.duration}ms)\n`);
    }
    
    this.results.push({ ...this.currentTest });
  }

  async callTool(toolName, args) {
    const result = await this.client.callTool({
      name: `mcp__webapp-sse__${toolName}`,
      arguments: args
    });
    return result.content[0];
  }

  async clearTodos() {
    const result = await this.callTool('dom_query', {
      selector: '.todo-item',
      limit: 50
    });
    
    const todos = result.elements || [];
    for (let i = todos.length - 1; i >= 0; i--) {
      const deleteButton = `[data-id="${todos[i].attributes['data-id']}"] .delete-button`;
      await this.callTool('interaction_click', { selector: deleteButton });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const total = this.results.length;
    
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed tests:');
      this.results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`  ❌ ${r.name}: ${r.error}`);
      });
    }
    
    return failed === 0;
  }
}

// Main test execution
async function runRegressionTests() {
  const runner = new TestRunner();
  
  try {
    await runner.connect();
    
    // Test 1: Vue app loads successfully
    await runner.runTest('Vue app loads successfully', async () => {
      const result = await runner.callTool('dom_query', {
        selector: '#app',
        limit: 1
      });
      
      if (!result.elements || result.elements.length === 0) {
        throw new Error('App element not found');
      }
      
      if (result.elements[0].tagName !== 'div') {
        throw new Error(`Expected div, got ${result.elements[0].tagName}`);
      }
    });
    
    // Test 2: Add a new todo
    await runner.runTest('Add a new todo item', async () => {
      await runner.clearTodos();
      
      await runner.callTool('interaction_type', {
        selector: '#new-todo',
        text: 'Regression test todo',
        clear: true
      });
      
      await runner.callTool('interaction_click', {
        selector: 'button'
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const result = await runner.callTool('dom_query', {
        selector: '.todo-item',
        limit: 10
      });
      
      if (!result.elements || result.elements.length !== 1) {
        throw new Error(`Expected 1 todo, found ${result.elements?.length || 0}`);
      }
      
      if (!result.elements[0].text.includes('Regression test todo')) {
        throw new Error('Todo text not found');
      }
    });
    
    // Test 3: Multiple todos
    await runner.runTest('Handle multiple todos', async () => {
      await runner.clearTodos();
      
      const todos = ['First todo', 'Second todo', 'Third todo'];
      
      for (const text of todos) {
        await runner.callTool('interaction_type', {
          selector: '#new-todo',
          text: text,
          clear: true
        });
        
        await runner.callTool('interaction_click', {
          selector: 'button'
        });
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      const result = await runner.callTool('dom_query', {
        selector: '.todo-item',
        limit: 10
      });
      
      if (!result.elements || result.elements.length !== 3) {
        throw new Error(`Expected 3 todos, found ${result.elements?.length || 0}`);
      }
    });
    
    // Test 4: Delete todo
    await runner.runTest('Delete todo items', async () => {
      await runner.clearTodos();
      
      await runner.callTool('interaction_type', {
        selector: '#new-todo',
        text: 'Todo to delete',
        clear: true
      });
      
      await runner.callTool('interaction_click', {
        selector: 'button'
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let result = await runner.callTool('dom_query', {
        selector: '.todo-item',
        limit: 10
      });
      
      if (!result.elements || result.elements.length !== 1) {
        throw new Error('Todo not created');
      }
      
      const deleteButton = `[data-id="${result.elements[0].attributes['data-id']}"] .delete-button`;
      await runner.callTool('interaction_click', { selector: deleteButton });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      result = await runner.callTool('dom_query', {
        selector: '.todo-item',
        limit: 10
      });
      
      if (result.elements && result.elements.length > 0) {
        throw new Error('Todo was not deleted');
      }
    });
    
    // Test 5: Visual regression
    await runner.runTest('Visual regression - screenshot capture', async () => {
      await runner.clearTodos();
      
      const result = await runner.callTool('capture_screenshot', {
        fullPage: true,
        format: 'png'
      });
      
      if (!result.success || !result.path) {
        throw new Error('Screenshot capture failed');
      }
      
      console.log(`   📸 Screenshot saved: ${result.path}`);
    });
    
    // Print summary
    const allPassed = runner.printSummary();
    
    await runner.disconnect();
    
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test runner error:', error);
    await runner.disconnect();
    process.exit(1);
  }
}

// Run tests
runRegressionTests();