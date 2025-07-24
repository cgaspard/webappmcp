// Don't mock express for e2e tests
jest.unmock('express');
jest.unmock('http');

import express from 'express';
import { Server } from 'http';
import { WebSocket } from 'ws';
import { webappMCP } from '../../src/middleware/index';
import WebAppMCPClient from '../../src/client/index';

// Mock browser environment for client
require('../setup');

// Helper to create mock WebSocket
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

describe('WebApp MCP E2E Integration', () => {
  let app: express.Application;
  let server: Server;
  let client: WebAppMCPClient;
  let serverPort: number;

  beforeEach((done) => {
    // Reset WebSocket mock
    (global as any).WebSocket = jest.fn(createMockWebSocket);

    // Create Express app with middleware
    app = express();
    app.use(express.json());
    app.use(webappMCP({
      wsPort: 0, // Use random port
      transport: 'none', // No MCP transport for tests
      debug: false
    }));

    // Add test endpoint
    app.get('/test', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Start server on random port
    server = app.listen(0, () => {
      serverPort = (server.address() as any).port;
      done();
    });
  });

  afterEach((done) => {
    // Cleanup
    if (client) {
      client.disconnect();
    }
    server.close(done);
  });

  describe('Basic connectivity', () => {
    it('should establish WebSocket connection between client and server', (done) => {
      // Wait for WebSocket server to be ready
      setTimeout(() => {
        client = new WebAppMCPClient({
          serverUrl: `ws://localhost:4835`,
          enableDevTools: false
        });

        client.connect();

        // Get mock WebSocket instance
        const mockWs = (global as any).WebSocket.mock.results[0].value;
        
        // Simulate successful connection
        mockWs.readyState = 1;
        if (mockWs.onopen) mockWs.onopen();

        // Verify client connected
        expect(client.isConnected).toBe(true);
        
        // Verify init message sent
        expect(mockWs.send).toHaveBeenCalledWith(
          expect.stringContaining('"type":"init"')
        );
        
        done();
      }, 100);
    });

    it('should handle authentication when enabled', (done) => {
      // Create app with auth
      const authApp = express();
      authApp.use(webappMCP({
        wsPort: 0,
        transport: 'none',
        authentication: {
          enabled: true,
          token: 'test-token-123'
        },
        debug: false
      }));

      const authServer = authApp.listen(0, () => {
        setTimeout(() => {
          client = new WebAppMCPClient({
            serverUrl: `ws://localhost:4835`,
            authToken: 'test-token-123',
            enableDevTools: false
          });

          client.connect();

          // Verify auth token in URL
          expect((global as any).WebSocket).toHaveBeenCalledWith(
            expect.stringContaining('token=test-token-123')
          );

          authServer.close();
          done();
        }, 100);
      });
    });
  });

  describe('Tool execution flow', () => {
    let mockWs: any;

    beforeEach(() => {
      // Set up connected client
      client = new WebAppMCPClient({
        serverUrl: `ws://localhost:4835`,
        enableDevTools: false
      });

      client.connect();
      
      mockWs = (global as any).WebSocket.mock.results[0].value;
      mockWs.readyState = 1;
      if (mockWs.onopen) mockWs.onopen();
    });

    it('should execute dom_query tool end-to-end', () => {
      // Set up DOM
      document.body.innerHTML = `
        <div id="test-container">
          <p class="test-paragraph">Test content 1</p>
          <p class="test-paragraph">Test content 2</p>
        </div>
      `;

      // Simulate tool execution request from server
      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify({
            type: 'execute_tool',
            requestId: 'req-123',
            tool: 'dom_query',
            args: { selector: '.test-paragraph', limit: 10 }
          })
        });
      }

      // Verify response sent
      const response = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(response.type).toBe('tool_response');
      expect(response.requestId).toBe('req-123');
      expect(response.success).toBe(true);
      expect(response.result.elements).toHaveLength(2);
      expect(response.result.elements[0].text).toBe('Test content 1');
      expect(response.result.elements[1].text).toBe('Test content 2');
    });

    it('should execute interaction_type tool end-to-end', () => {
      // Set up DOM with input
      document.body.innerHTML = `
        <input id="test-input" type="text" value="initial" />
      `;

      const input = document.getElementById('test-input') as HTMLInputElement;
      expect(input.value).toBe('initial');

      // Simulate tool execution
      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify({
            type: 'execute_tool',
            requestId: 'req-456',
            tool: 'interaction_type',
            args: { 
              selector: '#test-input',
              text: ' added text',
              clear: false
            }
          })
        });
      }

      // Verify input updated
      expect(input.value).toBe('initial added text');

      // Verify response
      const response = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(response.success).toBe(true);
    });

    it('should handle tool execution errors gracefully', () => {
      // Simulate tool execution with invalid selector
      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify({
            type: 'execute_tool',
            requestId: 'req-789',
            tool: 'interaction_click',
            args: { selector: '#non-existent-element' }
          })
        });
      }

      // Verify error response
      const response = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(response.type).toBe('tool_response');
      expect(response.requestId).toBe('req-789');
      expect(response.success).toBe(false);
      expect(response.error).toContain('Element not found');
    });
  });

  describe('Security features', () => {
    it('should respect tool whitelist', () => {
      client = new WebAppMCPClient({
        serverUrl: `ws://localhost:4835`,
        enableDevTools: false,
        enabledTools: ['dom_query', 'dom_get_text']
      });

      client.connect();
      
      const mockWs = (global as any).WebSocket.mock.results[0].value;
      mockWs.readyState = 1;
      if (mockWs.onopen) mockWs.onopen();

      // Try allowed tool
      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify({
            type: 'execute_tool',
            requestId: 'req-allow',
            tool: 'dom_query',
            args: { selector: 'body' }
          })
        });
      }

      let response = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(response.success).toBe(true);

      // Try disallowed tool
      mockWs.send.mockClear();
      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify({
            type: 'execute_tool',
            requestId: 'req-deny',
            tool: 'javascript_inject',
            args: { code: 'alert(1)' }
          })
        });
      }

      response = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(response.success).toBe(false);
      expect(response.error).toContain('is not enabled');
    });

    it('should handle production bypass', () => {
      // Reset WebSocket mock to track calls
      const WebSocketSpy = jest.fn(createMockWebSocket);
      (global as any).WebSocket = WebSocketSpy;

      client = new WebAppMCPClient({
        serverUrl: `ws://localhost:4835`,
        enableConnection: false
      });

      client.connect();

      // Should not create WebSocket
      expect(WebSocketSpy).not.toHaveBeenCalled();
      expect(client.isConnected).toBe(false);
    });
  });

  describe('Console interception', () => {
    it('should capture console logs when enabled', () => {
      client = new WebAppMCPClient({
        serverUrl: `ws://localhost:4835`,
        enableDevTools: false,
        interceptConsole: true
      });

      client.connect();
      
      const mockWs = (global as any).WebSocket.mock.results[0].value;
      mockWs.readyState = 1;
      if (mockWs.onopen) mockWs.onopen();

      // Log messages
      console.log('Test log message');
      console.error('Test error message');
      console.warn('Test warning message');

      // Execute console_get_logs
      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify({
            type: 'execute_tool',
            requestId: 'req-console',
            tool: 'console_get_logs',
            args: { level: 'all', limit: 10 }
          })
        });
      }

      const response = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(response.success).toBe(true);
      expect(response.result.logs).toHaveLength(3);
      
      const logTypes = response.result.logs.map((log: any) => log.level);
      expect(logTypes).toContain('log');
      expect(logTypes).toContain('error');
      expect(logTypes).toContain('warn');
    });

    it('should not interfere with console when disabled', () => {
      const originalLog = console.log;
      
      client = new WebAppMCPClient({
        serverUrl: `ws://localhost:4835`,
        enableDevTools: false,
        interceptConsole: false
      });

      // Console should remain unchanged
      expect(console.log).toBe(originalLog);
    });
  });

  describe('State management', () => {
    it('should handle localStorage operations', () => {
      client = new WebAppMCPClient({
        serverUrl: `ws://localhost:4835`,
        enableDevTools: false
      });

      client.connect();
      
      const mockWs = (global as any).WebSocket.mock.results[0].value;
      mockWs.readyState = 1;
      if (mockWs.onopen) mockWs.onopen();

      // Set item
      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify({
            type: 'execute_tool',
            requestId: 'req-ls-set',
            tool: 'state_local_storage',
            args: {
              operation: 'set',
              key: 'test-key',
              value: 'test-value'
            }
          })
        });
      }

      expect(localStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');

      // Get item
      mockWs.send.mockClear();
      (localStorage.getItem as jest.Mock).mockReturnValue('test-value');
      
      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify({
            type: 'execute_tool',
            requestId: 'req-ls-get',
            tool: 'state_local_storage',
            args: {
              operation: 'get',
              key: 'test-key'
            }
          })
        });
      }

      // Wait for async execution
      setTimeout(() => {
        expect(mockWs.send).toHaveBeenCalled();
        const response = JSON.parse(mockWs.send.mock.calls[0][0]);
        expect(response.result.value).toBe('test-value');
      }, 10);
    });

    it('should access JavaScript variables', () => {
      client = new WebAppMCPClient({
        serverUrl: `ws://localhost:4835`,
        enableDevTools: false
      });

      client.connect();
      
      const mockWs = (global as any).WebSocket.mock.results[0].value;
      mockWs.readyState = 1;
      if (mockWs.onopen) mockWs.onopen();

      // Set up test variable
      (window as any).testApp = {
        config: {
          version: '1.2.3'
        }
      };

      // Get variable
      if (mockWs.onmessage) {
        mockWs.onmessage({
          data: JSON.stringify({
            type: 'execute_tool',
            requestId: 'req-var',
            tool: 'state_get_variable',
            args: {
              path: 'testApp.config.version'
            }
          })
        });
      }

      // Wait for async execution
      setTimeout(() => {
        expect(mockWs.send).toHaveBeenCalled();
        const response = JSON.parse(mockWs.send.mock.calls[0][0]);
        expect(response.success).toBe(true);
        expect(response.result.value).toBe('1.2.3');
      }, 10);
    });
  });
});