import WebAppMCPClient from '../../src/client/index';

describe('WebAppMCPClient', () => {
  let client: WebAppMCPClient;
  let mockWebSocket: any;
  let originalConsole: any;

  beforeEach(() => {
    // Clear any existing mocks
    jest.clearAllMocks();
    
    // Store original console methods
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };

    // Mock WebSocket globally
    mockWebSocket = {
      readyState: 0,
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    (global as any).WebSocket = jest.fn(() => mockWebSocket);
    (global as any).WebSocket.OPEN = 1;
    (global as any).WebSocket.CONNECTING = 0;
    (global as any).WebSocket.CLOSING = 2;
    (global as any).WebSocket.CLOSED = 3;
  });

  afterEach(() => {
    // Restore console methods
    Object.assign(console, originalConsole);
    
    // Disconnect client if connected
    if (client) {
      client.disconnect();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        enableDevTools: false
      });

      expect(client).toBeDefined();
      expect(client.isConnected).toBe(false);
    });

    it('should initialize with custom configuration', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        authToken: 'test-token',
        reconnectInterval: 10000,
        maxReconnectAttempts: 5,
        enableDevTools: false,
        debug: true,
        enableConnection: true,
        interceptConsole: false,
        enabledTools: ['dom_query', 'interaction_click'],
        devToolsPosition: 'top-left',
        devToolsTheme: 'dark'
      });

      expect(client).toBeDefined();
    });

    it('should not intercept console when disabled', () => {
      const logSpy = jest.spyOn(console, 'log');
      
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        interceptConsole: false,
        enableDevTools: false
      });

      console.log('test message');
      
      expect(logSpy).toHaveBeenCalledWith('test message');
      expect(logSpy).toHaveBeenCalledTimes(1);
    });

    it('should intercept console when enabled', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        interceptConsole: true,
        enableDevTools: false
      });

      console.log('test message');
      
      // Console should be intercepted
      // The originalConsole.log is the actual console.log, not a mock
      // so we need to check that console.log is not the same as originalConsole.log
      expect(console.log).not.toBe(originalConsole.log);
    });
  });

  describe('Connection management', () => {
    it('should not connect when enableConnection is false', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        enableConnection: false,
        enableDevTools: false
      });

      client.connect();

      expect(global.WebSocket).not.toHaveBeenCalled();
    });

    it('should connect with auth token in URL', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        authToken: 'test-token',
        enableDevTools: false
      });

      client.connect();

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:4835/?token=test-token');
    });

    it('should handle successful connection', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835'
      });

      client.connect();

      // Simulate WebSocket open
      mockWebSocket.readyState = 1; // OPEN
      mockWebSocket.onopen();

      expect(client.isConnected).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'init',
          url: 'http://localhost/'
        })
      );
    });

    it('should handle connection errors', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        maxReconnectAttempts: 2,
        reconnectInterval: 100,
        enableDevTools: false
      });

      client.connect();

      // Simulate error
      mockWebSocket.onerror(new Error('Connection failed'));

      expect(client.isConnected).toBe(false);
    });

    it('should attempt reconnection on close', (done) => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        maxReconnectAttempts: 2,
        reconnectInterval: 50,
        enableDevTools: false
      });

      client.connect();
      expect(global.WebSocket).toHaveBeenCalledTimes(1);

      // Simulate close
      mockWebSocket.onclose();

      // Wait for reconnection attempt
      setTimeout(() => {
        expect(global.WebSocket).toHaveBeenCalledTimes(2);
        done();
      }, 100);
    });

    it('should stop reconnecting after max attempts', (done) => {
      jest.useFakeTimers();
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        maxReconnectAttempts: 2,
        reconnectInterval: 50,
        enableDevTools: false
      });

      client.connect();

      // Simulate initial close
      mockWebSocket.onclose();
      
      // First reconnect attempt
      jest.advanceTimersByTime(50);
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
      
      // Simulate second close
      mockWebSocket.onclose();
      
      // Second reconnect attempt
      jest.advanceTimersByTime(50);
      expect(global.WebSocket).toHaveBeenCalledTimes(3);
      
      // Simulate third close (should not trigger more reconnects)
      mockWebSocket.onclose();
      jest.advanceTimersByTime(50);
      
      // Should still be 3 (initial + 2 reconnects)
      expect(global.WebSocket).toHaveBeenCalledTimes(3);
      
      jest.useRealTimers();
      done();
    });
  });

  describe('Message handling', () => {
    beforeEach(() => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        enableDevTools: false
      });
      client.connect();
      mockWebSocket.readyState = 1; // OPEN
      mockWebSocket.onopen(); // Trigger connection
      mockWebSocket.send.mockClear(); // Clear init message
    });

    it('should handle connected message', () => {
      const message = {
        type: 'connected',
        clientId: 'test-client-id',
        permissions: { read: true, write: true }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });

      // Should process without error
      // The connected message doesn't change isConnected state, only WebSocket state does
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should handle execute_tool message', async () => {
      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'dom_query',
        args: { selector: 'body' }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));

      // Should send response
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"tool_response"')
      );
    });

    it('should handle tool whitelist', async () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        enabledTools: ['dom_query'],
        enableDevTools: false
      });
      client.connect();
      mockWebSocket.readyState = 1;
      mockWebSocket.onopen(); // Trigger connection
      mockWebSocket.send.mockClear(); // Clear init message

      // Allowed tool
      const allowedMessage = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'dom_query',
        args: { selector: 'body' }
      };
      mockWebSocket.onmessage({ data: JSON.stringify(allowedMessage) });
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"success":true')
      );

      // Reset mock
      mockWebSocket.send.mockClear();

      // Disallowed tool
      const disallowedMessage = {
        type: 'execute_tool',
        requestId: 'req-456',
        tool: 'javascript_inject',
        args: { code: 'alert(1)' }
      };
      mockWebSocket.onmessage({ data: JSON.stringify(disallowedMessage) });
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"success":false')
      );
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('is not enabled')
      );
    });

    it('should handle invalid JSON messages', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockWebSocket.onmessage({ data: 'invalid json' });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[webappmcp]'),
        expect.any(String),
        expect.any(Error)
      );
    });
  });

  describe('Tool execution', () => {
    beforeEach(() => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        enableDevTools: false
      });
      client.connect();
      mockWebSocket.readyState = 1; // OPEN
      mockWebSocket.onopen(); // Trigger the open event to complete connection
      
      // Clear any calls from initialization
      mockWebSocket.send.mockClear();
    });

    it('should execute dom_query tool', async () => {
      // Create test elements
      document.body.innerHTML = '<div class="test">Test Content</div>';

      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'dom_query',
        args: { selector: '.test', limit: 5 }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockWebSocket.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('tool_response');
      expect(sentMessage.success).toBe(true);
      expect(sentMessage.result.elements).toHaveLength(1);
      expect(sentMessage.result.elements[0].text).toBe('Test Content');
    });

    it('should execute interaction_click tool', async () => {
      document.body.innerHTML = '<button id="test-btn">Click me</button>';

      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'interaction_click',
        args: { selector: '#test-btn' }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Check that the response was sent
      expect(mockWebSocket.send).toHaveBeenCalled();
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('tool_response');
      
      // If the click failed, log the error for debugging
      if (!sentMessage.success) {
        console.log('Click tool failed with error:', sentMessage.error);
      }
      
      expect(sentMessage.success).toBe(true);
      expect(sentMessage.result.success).toBe(true);
    });

    it('should execute state_local_storage tool', async () => {
      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'state_local_storage',
        args: { operation: 'set', key: 'test-key', value: 'test-value' }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(localStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
      
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.success).toBe(true);
    });

    it('should handle tool execution errors', async () => {
      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'interaction_click',
        args: { selector: '.non-existent-element' } // Element doesn't exist
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));

      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('tool_response');
      expect(sentMessage.success).toBe(false);
      expect(sentMessage.error).toBeDefined();
    });

    it('should handle unknown tools', () => {
      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'unknown_tool',
        args: {}
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });

      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.success).toBe(false);
      expect(sentMessage.error).toContain('Unknown tool');
    });
  });

  describe('Console log capture', () => {
    it('should capture console logs when enabled', async () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        interceptConsole: true,
        enableDevTools: false
      });
      client.connect();
      mockWebSocket.readyState = 1;
      mockWebSocket.onopen(); // Trigger the open event
      
      // Clear any calls from initialization
      mockWebSocket.send.mockClear();

      // Log some messages
      console.log('Test log');
      console.error('Test error');
      console.warn('Test warning');

      // Execute console_get_logs tool
      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'console_get_logs',
        args: { level: 'all', limit: 10 }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));

      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.result.logs).toHaveLength(3);
      expect(sentMessage.result.logs[0].args).toContain('Test log');
      expect(sentMessage.result.logs[1].args).toContain('Test error');
      expect(sentMessage.result.logs[2].args).toContain('Test warning');
    });

    it('should filter logs by level', async () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        interceptConsole: true,
        enableDevTools: false
      });
      client.connect();
      mockWebSocket.readyState = 1;
      mockWebSocket.onopen(); // Trigger the open event
      
      // Clear any calls from initialization
      mockWebSocket.send.mockClear();

      // Log different levels
      console.log('Log message');
      console.error('Error message');
      console.warn('Warning message');

      // Get only errors
      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'console_get_logs',
        args: { level: 'error', limit: 10 }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });
      
      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));

      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.result.logs).toHaveLength(1);
      expect(sentMessage.result.logs[0].level).toBe('error');
    });
  });
});