import express from 'express';
import request from 'supertest';
import { WebSocketServer } from 'ws';
import { webappMCP } from '../../src/middleware/index';

// Mock WebSocketServer
jest.mock('ws');
jest.mock('http', () => ({
  createServer: jest.fn(() => ({
    listen: jest.fn((port, host, callback) => {
      callback();
      return { on: jest.fn() };
    })
  }))
}));

describe('WebApp MCP Middleware', () => {
  let app: express.Application;
  let mockWss: jest.Mocked<WebSocketServer>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock WebSocketServer
    mockWss = {
      on: jest.fn(),
      clients: new Set(),
      close: jest.fn()
    } as any;
    
    (WebSocketServer as jest.MockedClass<typeof WebSocketServer>).mockImplementation(() => mockWss);
  });

  describe('Middleware initialization', () => {
    it('should initialize with default configuration', () => {
      const middleware = webappMCP();
      app.use(middleware);
      
      expect(WebSocketServer).toHaveBeenCalledWith({ server: expect.any(Object) });
    });

    it('should initialize with custom configuration', () => {
      const middleware = webappMCP({
        wsPort: 5000,
        wsHost: 'localhost',
        debug: true,
        transport: 'none'
      });
      app.use(middleware);
      
      expect(WebSocketServer).toHaveBeenCalledWith({ server: expect.any(Object) });
    });
  });

  describe('Status endpoint', () => {
    it('should return status information', async () => {
      const middleware = webappMCP({
        wsPort: 5000,
        permissions: {
          read: true,
          write: false,
          screenshot: true,
          state: false
        }
      });
      app.use(middleware);

      const response = await request(app)
        .get('/__webappmcp/status')
        .expect(200);

      expect(response.body).toEqual({
        connected: 0,
        permissions: {
          read: true,
          write: false,
          screenshot: true,
          state: false
        },
        wsPort: 5000
      });
    });
  });

  describe('Clients endpoint', () => {
    it('should return empty client list initially', async () => {
      const middleware = webappMCP();
      app.use(middleware);

      const response = await request(app)
        .get('/__webappmcp/clients')
        .expect(200);

      expect(response.body).toEqual({ clients: [] });
    });
  });

  describe('Tools endpoint', () => {
    it('should list available tools', async () => {
      const middleware = webappMCP();
      app.use(middleware);

      const response = await request(app)
        .get('/__webappmcp/tools')
        .expect(200);

      expect(response.body.tools).toContain('dom_query');
      expect(response.body.tools).toContain('interaction_click');
      expect(response.body.tools).toContain('capture_screenshot');
      expect(response.body.tools.length).toBeGreaterThan(10);
    });
  });

  describe('WebSocket connection handling', () => {
    it('should handle WebSocket connections', () => {
      const middleware = webappMCP();
      app.use(middleware);

      // Verify WebSocketServer event handlers were set up
      expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('should reject unauthorized connections when auth is enabled', () => {
      const middleware = webappMCP({
        authentication: {
          enabled: true,
          token: 'test-token'
        }
      });
      app.use(middleware);

      // Get the connection handler
      const connectionHandler = mockWss.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];

      // Mock WebSocket and request
      const mockWs = {
        close: jest.fn(),
        on: jest.fn(),
        send: jest.fn()
      };
      const mockRequest = {
        headers: {},
        url: '/'
      };

      // Trigger connection without auth
      if (connectionHandler) connectionHandler.call(mockWss, mockWs, mockRequest);

      expect(mockWs.close).toHaveBeenCalledWith(1008, 'Unauthorized');
    });

    it('should accept authorized connections', () => {
      const middleware = webappMCP({
        authentication: {
          enabled: true,
          token: 'test-token'
        }
      });
      app.use(middleware);

      // Get the connection handler
      const connectionHandler = mockWss.on.mock.calls.find(
        call => call[0] === 'connection'
      )?.[1];

      // Mock WebSocket and request with auth
      const mockWs = {
        close: jest.fn(),
        on: jest.fn(),
        send: jest.fn()
      };
      const mockRequest = {
        headers: {
          authorization: 'Bearer test-token'
        },
        url: '/'
      };

      // Trigger connection with auth
      if (connectionHandler) connectionHandler.call(mockWss, mockWs, mockRequest);

      expect(mockWs.close).not.toHaveBeenCalled();
      expect(mockWs.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"connected"')
      );
    });
  });

  describe('Debug logging', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should not log when debug is false', () => {
      const middleware = webappMCP({ debug: false });
      app.use(middleware);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[WebAppMCP]')
      );
    });

    it('should log when debug is true', () => {
      const middleware = webappMCP({ debug: true, transport: 'none' });
      app.use(middleware);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WebAppMCP]'),
        expect.any(String)
      );
    });
  });
});