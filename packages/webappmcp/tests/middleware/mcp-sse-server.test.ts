import { MCPSSEServer } from '../../src/middleware/mcp-sse-server';
import { WebSocket } from 'ws';
import { Request, Response } from 'express';

// Mock WebSocket
jest.mock('ws');

// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('@modelcontextprotocol/sdk/server/sse.js', () => ({
  SSEServerTransport: jest.fn().mockImplementation((path, res) => ({
    sessionId: 'test-session-id',
    send: jest.fn().mockResolvedValue(undefined),
    handlePostMessage: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('MCPSSEServer', () => {
  let server: MCPSSEServer;
  let mockWs: jest.Mocked<WebSocket>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      off: jest.fn(),
      readyState: WebSocket.OPEN
    } as any;

    (WebSocket as jest.MockedClass<typeof WebSocket>).mockImplementation(() => mockWs);
  });

  describe('Initialization', () => {
    it('should initialize with required config', async () => {
      server = new MCPSSEServer({
        wsUrl: 'ws://localhost:4835',
        debug: false
      });

      await server.initialize();

      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:4835');
    });

    it('should initialize with auth token', async () => {
      server = new MCPSSEServer({
        wsUrl: 'ws://localhost:4835',
        authToken: 'test-token',
        debug: false
      });

      await server.initialize();

      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:4835?token=test-token');
    });

    it('should handle WebSocket connection', async () => {
      server = new MCPSSEServer({
        wsUrl: 'ws://localhost:4835',
        debug: false
      });

      const initPromise = server.initialize();

      // Trigger WebSocket open event
      const openHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')?.[1];
      if (openHandler) openHandler.call(mockWs);

      await initPromise;

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'init',
          url: 'mcp-sse-server'
        })
      );
    });

    it('should handle WebSocket errors', async () => {
      server = new MCPSSEServer({
        wsUrl: 'ws://localhost:4835',
        debug: false
      });

      const initPromise = server.initialize();

      // Trigger WebSocket error
      const errorHandler = mockWs.on.mock.calls.find(call => call[0] === 'error')?.[1];
      const testError = new Error('Connection failed');
      if (errorHandler) errorHandler.call(mockWs, testError);

      await expect(initPromise).rejects.toThrow('Connection failed');
    });
  });

  describe('SSE Request Handling', () => {
    let mockReq: jest.Mocked<Request>;
    let mockRes: jest.Mocked<Response>;

    beforeEach(() => {
      mockReq = {
        method: 'GET',
        url: '/mcp/sse',
        path: '/mcp/sse',
        query: {},
        headers: {},
        on: jest.fn()
      } as any;

      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        write: jest.fn(),
        end: jest.fn(),
        headersSent: false
      } as any;
    });

    it('should handle GET requests for SSE connection', async () => {
      server = new MCPSSEServer({
        wsUrl: 'ws://localhost:4835',
        debug: false
      });

      await server.initialize();
      await server.handleSSERequest(mockReq, mockRes);

      // Should create SSE transport
      const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
      expect(SSEServerTransport).toHaveBeenCalledWith('/mcp/sse', mockRes);

      // Should handle connection close
      expect(mockReq.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should handle POST requests with session ID', async () => {
      mockReq.method = 'POST';
      mockReq.query = { sessionId: 'test-session-id' };

      server = new MCPSSEServer({
        wsUrl: 'ws://localhost:4835',
        debug: false
      });

      await server.initialize();
      
      // First create a session with GET
      const getReq = { ...mockReq, method: 'GET' };
      await server.handleSSERequest(getReq, mockRes);

      // Then handle POST
      await server.handleSSERequest(mockReq, mockRes);

      expect(mockRes.status).not.toHaveBeenCalledWith(404);
    });

    it('should reject POST without session ID', async () => {
      mockReq.method = 'POST';
      mockReq.query = {};

      server = new MCPSSEServer({
        wsUrl: 'ws://localhost:4835',
        debug: false
      });

      await server.initialize();
      await server.handleSSERequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Session ID required for POST requests'
      });
    });

    it('should handle request errors gracefully', async () => {
      mockReq.method = 'INVALID';

      server = new MCPSSEServer({
        wsUrl: 'ws://localhost:4835',
        debug: false
      });

      await server.initialize();
      
      // Mock Server to throw error
      const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
      Server.mockImplementationOnce(() => {
        throw new Error('Server creation failed');
      });

      await server.handleSSERequest(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to establish SSE connection'
      });
    });
  });

  describe('Debug logging', () => {
    let consoleSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should not log when debug is false', async () => {
      server = new MCPSSEServer({
        wsUrl: 'ws://localhost:4835',
        debug: false
      });

      await server.initialize();

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[MCP SSE]')
      );
    });

    it('should log when debug is true', async () => {
      server = new MCPSSEServer({
        wsUrl: 'ws://localhost:4835',
        debug: true
      });

      await server.initialize();

      // Trigger WebSocket open
      const openHandler = mockWs.on.mock.calls.find(call => call[0] === 'open')?.[1];
      if (openHandler) openHandler.call(mockWs);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MCP SSE]',
        expect.stringContaining('Connected to WebSocket')
      );
    });

    it('should always log errors', async () => {
      server = new MCPSSEServer({
        wsUrl: 'ws://localhost:4835',
        debug: false
      });

      const initPromise = server.initialize();

      // Trigger WebSocket error
      const errorHandler = mockWs.on.mock.calls.find(call => call[0] === 'error')?.[1];
      if (errorHandler) errorHandler.call(mockWs, new Error('Test error'));

      try {
        await initPromise;
      } catch {}

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[MCP SSE Error]',
        expect.any(String),
        expect.any(Error)
      );
    });
  });
});