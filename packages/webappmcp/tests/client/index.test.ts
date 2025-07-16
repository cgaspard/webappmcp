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
        serverUrl: 'ws://localhost:4835'
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
        interceptConsole: false
      });

      console.log('test message');
      
      expect(logSpy).toHaveBeenCalledWith('test message');
      expect(logSpy).toHaveBeenCalledTimes(1);
    });

    it('should intercept console when enabled', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        interceptConsole: true
      });

      console.log('test message');
      
      // Console should be intercepted
      expect(originalConsole.log).toHaveBeenCalledWith('test message');
    });
  });

  describe('Connection management', () => {
    it('should not connect when enableConnection is false', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        enableConnection: false
      });

      client.connect();

      expect(global.WebSocket).not.toHaveBeenCalled();
    });

    it('should connect with auth token in URL', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        authToken: 'test-token'
      });

      client.connect();

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:4835?token=test-token');
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
        reconnectInterval: 100
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
        reconnectInterval: 50
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
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        maxReconnectAttempts: 2,
        reconnectInterval: 50
      });

      client.connect();

      // Simulate multiple failures
      for (let i = 0; i < 3; i++) {
        mockWebSocket.onclose();
        jest.advanceTimersByTime(60);
      }

      setTimeout(() => {
        // Should not exceed max attempts + 1 (initial connection)
        expect(global.WebSocket).toHaveBeenCalledTimes(3);
        done();
      }, 200);
    });
  });

  describe('Message handling', () => {
    beforeEach(() => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835'
      });
      client.connect();
      mockWebSocket.readyState = 1; // OPEN
    });

    it('should handle connected message', () => {
      const message = {
        type: 'connected',
        clientId: 'test-client-id',
        permissions: { read: true, write: true }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });

      // Should process without error
      expect(client.isConnected).toBe(true);
    });

    it('should handle execute_tool message', () => {
      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'dom_query',
        args: { selector: 'body' }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });

      // Should send response
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"tool_response"')
      );
    });

    it('should handle tool whitelist', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        enabledTools: ['dom_query']
      });
      client.connect();
      mockWebSocket.readyState = 1;

      // Allowed tool
      const allowedMessage = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'dom_query',
        args: { selector: 'body' }
      };
      mockWebSocket.onmessage({ data: JSON.stringify(allowedMessage) });
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
        expect.stringContaining('[WebAppMCP Client Error]'),
        expect.any(String),
        expect.any(Error)
      );
    });
  });

  describe('Tool execution', () => {
    beforeEach(() => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835'
      });
      client.connect();
      mockWebSocket.readyState = 1;
    });

    it('should execute dom_query tool', () => {
      // Create test elements
      document.body.innerHTML = '<div class="test">Test Content</div>';

      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'dom_query',
        args: { selector: '.test', limit: 5 }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });

      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe('tool_response');
      expect(sentMessage.success).toBe(true);
      expect(sentMessage.result.elements).toHaveLength(1);
      expect(sentMessage.result.elements[0].text).toBe('Test Content');
    });

    it('should execute interaction_click tool', () => {
      const clickHandler = jest.fn();
      document.body.innerHTML = '<button id="test-btn">Click me</button>';
      document.getElementById('test-btn')!.addEventListener('click', clickHandler);

      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'interaction_click',
        args: { selector: '#test-btn' }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });

      expect(clickHandler).toHaveBeenCalled();
      
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.success).toBe(true);
    });

    it('should execute state_local_storage tool', () => {
      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'state_local_storage',
        args: { operation: 'set', key: 'test-key', value: 'test-value' }
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });

      expect(localStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
      
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.success).toBe(true);
    });

    it('should handle tool execution errors', () => {
      const message = {
        type: 'execute_tool',
        requestId: 'req-123',
        tool: 'dom_query',
        args: { selector: null } // Invalid selector
      };

      mockWebSocket.onmessage({ data: JSON.stringify(message) });

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
    it('should capture console logs when enabled', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        interceptConsole: true
      });
      client.connect();
      mockWebSocket.readyState = 1;

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

      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.result.logs).toHaveLength(3);
      expect(sentMessage.result.logs[0].args).toContain('Test log');
      expect(sentMessage.result.logs[1].args).toContain('Test error');
      expect(sentMessage.result.logs[2].args).toContain('Test warning');
    });

    it('should filter logs by level', () => {
      client = new WebAppMCPClient({
        serverUrl: 'ws://localhost:4835',
        interceptConsole: true
      });
      client.connect();
      mockWebSocket.readyState = 1;

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

      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentMessage.result.logs).toHaveLength(1);
      expect(sentMessage.result.logs[0].level).toBe('error');
    });
  });
});