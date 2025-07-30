import { McpRegressionTester } from './mcp-regression-tester';

describe('Vue Todo App - Regression Tests', () => {
  let tester: McpRegressionTester;

  beforeAll(async () => {
    tester = new McpRegressionTester({
      serverUrl: 'ws://localhost:3101',
      timeout: 30000
    });
    await tester.connect();
  });

  afterAll(async () => {
    await tester.disconnect();
  });

  beforeEach(async () => {
    await tester.refreshPage();
    await tester.clearStorage();
  });

  describe('Core Todo Functionality', () => {
    test('should add a new todo item', async () => {
      const testTodo = 'Test regression todo';
      
      await tester.addTodo(testTodo);
      
      const todoItems = await tester.getTodoItems();
      expect(todoItems).toHaveLength(1);
      expect(todoItems[0].text).toContain(testTodo);
      
      const itemCount = await tester.getTodoCount();
      expect(itemCount).toBe('1 item left');
    });

    test('should complete and uncomplete todos', async () => {
      await tester.addTodo('Test completion');
      
      await tester.toggleTodo(0);
      let todos = await tester.getTodoItems();
      expect(todos[0].completed).toBe(true);
      
      await tester.toggleTodo(0);
      todos = await tester.getTodoItems();
      expect(todos[0].completed).toBe(false);
    });

    test('should delete todos', async () => {
      await tester.addTodo('Test deletion');
      await tester.deleteTodo(0);
      
      const todoItems = await tester.getTodoItems();
      expect(todoItems).toHaveLength(0);
      
      const itemCount = await tester.getTodoCount();
      expect(itemCount).toBe('0 items left');
    });

    test('should filter todos by status', async () => {
      await tester.addTodo('Active todo');
      await tester.addTodo('Completed todo');
      await tester.toggleTodo(1);
      
      await tester.setFilter('active');
      let visibleTodos = await tester.getVisibleTodos();
      expect(visibleTodos).toHaveLength(1);
      expect(visibleTodos[0].text).toContain('Active todo');
      
      await tester.setFilter('completed');
      visibleTodos = await tester.getVisibleTodos();
      expect(visibleTodos).toHaveLength(1);
      expect(visibleTodos[0].text).toContain('Completed todo');
      
      await tester.setFilter('all');
      visibleTodos = await tester.getVisibleTodos();
      expect(visibleTodos).toHaveLength(2);
    });
  });

  describe('Visual Regression', () => {
    test('should match visual baseline - empty state', async () => {
      await tester.takeScreenshot('empty-state');
      await tester.compareWithBaseline('empty-state');
    });

    test('should match visual baseline - with todos', async () => {
      await tester.addTodo('First todo');
      await tester.addTodo('Second todo');
      await tester.toggleTodo(0);
      
      await tester.takeScreenshot('with-todos');
      await tester.compareWithBaseline('with-todos');
    });
  });

  describe('Error Handling', () => {
    test('should handle console errors gracefully', async () => {
      const initialLogs = await tester.getConsoleLogs();
      const errorCount = initialLogs.filter(log => log.level === 'error').length;
      
      await tester.addTodo('Test error handling');
      
      const finalLogs = await tester.getConsoleLogs();
      const finalErrorCount = finalLogs.filter(log => log.level === 'error').length;
      
      expect(finalErrorCount).toBe(errorCount);
    });
  });

  describe('State Persistence', () => {
    test('should persist state after page refresh', async () => {
      await tester.addTodo('Persistent todo');
      await tester.refreshPage();
      
      const todoItems = await tester.getTodoItems();
      expect(todoItems).toHaveLength(1);
      expect(todoItems[0].text).toContain('Persistent todo');
    });
  });
});