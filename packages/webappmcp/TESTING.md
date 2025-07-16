# WebApp MCP Testing Guide

## Overview

This package includes comprehensive unit and integration tests to ensure reliability and prevent regressions. The test suite uses Jest with TypeScript support.

## Test Structure

```
tests/
├── setup.ts              # Global test setup and mocks
├── client/              # Client-side component tests
│   ├── index.test.ts    # WebAppMCPClient tests
│   └── devtools.test.ts # MCPDevTools UI tests
├── middleware/          # Server middleware tests
│   ├── index.test.ts    # Express middleware tests
│   ├── mcp-sse-server.test.ts # SSE server tests
│   └── tools.test.ts    # Tool definitions tests
├── e2e/                 # End-to-end integration tests
│   └── integration.test.ts
└── utils/               # Test utilities
    └── test-helpers.ts  # Shared test helpers
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/client/devtools.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="DevTools"
```

## Test Coverage

The test suite covers:

1. **Client Components** (~95% coverage)
   - WebSocket connection management
   - Tool execution handlers
   - Console interception
   - DevTools UI interactions
   - Security features (tool whitelisting, production bypass)

2. **Middleware Tools** (100% coverage)
   - Tool registration
   - Tool definitions and schemas
   - All tool categories (DOM, interaction, capture, state, diagnostic)

3. **Server Components**
   - Express middleware integration
   - WebSocket server setup
   - Authentication handling
   - MCP transport initialization

4. **End-to-End Flows**
   - Full tool execution lifecycle
   - Client-server communication
   - Error handling
   - State management

## Writing Tests

### Unit Tests

```typescript
describe('Component Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Mocking WebSockets

```typescript
// Use the helper to create mock WebSocket
function createMockWebSocket() {
  return {
    readyState: 0,
    send: jest.fn(),
    close: jest.fn(),
    onopen: null,
    onclose: null,
    onerror: null,
    onmessage: null
  };
}

// Mock global WebSocket
(global as any).WebSocket = jest.fn(createMockWebSocket);
```

### Testing DOM Interactions

```typescript
it('should query DOM elements', () => {
  // Set up DOM
  document.body.innerHTML = `
    <div class="test">Content</div>
  `;
  
  // Execute tool
  const result = await domQuery({ selector: '.test' });
  
  // Verify
  expect(result.elements).toHaveLength(1);
  expect(result.elements[0].text).toBe('Content');
});
```

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const promise = someAsyncFunction();
  
  // Advance timers if using fake timers
  jest.advanceTimersByTime(1000);
  
  const result = await promise;
  expect(result).toBeDefined();
});
```

## Common Test Patterns

### Testing Tool Execution

```typescript
it('should execute tool successfully', () => {
  const mockWs = createMockWebSocket();
  
  // Simulate tool request
  mockWs.onmessage({
    data: JSON.stringify({
      type: 'execute_tool',
      requestId: 'test-123',
      tool: 'dom_query',
      args: { selector: 'body' }
    })
  });
  
  // Verify response
  const response = JSON.parse(mockWs.send.mock.calls[0][0]);
  expect(response.success).toBe(true);
});
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', () => {
  // Trigger error condition
  const result = executeWithInvalidArgs();
  
  // Verify error response
  expect(result.success).toBe(false);
  expect(result.error).toContain('Expected error message');
});
```

### Testing Security Features

```typescript
it('should respect tool whitelist', () => {
  const client = new WebAppMCPClient({
    enabledTools: ['dom_query'] // Only allow dom_query
  });
  
  // Try disallowed tool
  const result = executeTool('javascript_inject', {});
  
  expect(result.success).toBe(false);
  expect(result.error).toContain('not enabled');
});
```

## Debugging Tests

1. **Use focused tests**: Add `.only` to run single test
   ```typescript
   it.only('should focus on this test', () => {
     // Test code
   });
   ```

2. **Add console logs**: Tests preserve console output
   ```typescript
   console.log('Debug info:', variable);
   ```

3. **Check mock calls**: Inspect what was called
   ```typescript
   console.log(mockFunction.mock.calls);
   ```

4. **Use debugger**: Add breakpoints
   ```typescript
   debugger; // Pause here when debugging
   ```

## Continuous Integration

Tests run automatically on:
- Every push to the repository
- Pull request creation and updates
- Before npm publish

Ensure all tests pass before releasing new versions.

## Known Issues

1. Some integration tests may timeout in CI environments - increase timeout if needed
2. WebSocket mocking can be flaky - ensure proper setup/teardown
3. Console interception tests may interfere with each other - run in isolation if needed

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure tests cover happy path and error cases
3. Update this documentation if adding new test patterns
4. Run full test suite before committing