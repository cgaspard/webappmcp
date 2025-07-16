import { WebSocket } from 'ws';
import { Request, Response } from 'express';

/**
 * Create a mock WebSocket instance
 */
export function createMockWebSocket(): jest.Mocked<WebSocket> {
  return {
    readyState: WebSocket.OPEN,
    on: jest.fn(),
    off: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    ping: jest.fn(),
    pong: jest.fn(),
    terminate: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
    setMaxListeners: jest.fn(),
    getMaxListeners: jest.fn(),
    listeners: jest.fn(),
    rawListeners: jest.fn(),
    listenerCount: jest.fn(),
    prependListener: jest.fn(),
    prependOnceListener: jest.fn(),
    eventNames: jest.fn(),
  } as any;
}

/**
 * Create a mock Express Request
 */
export function createMockRequest(overrides: Partial<Request> = {}): jest.Mocked<Request> {
  return {
    method: 'GET',
    url: '/',
    path: '/',
    headers: {},
    query: {},
    params: {},
    body: {},
    on: jest.fn(),
    ...overrides
  } as any;
}

/**
 * Create a mock Express Response
 */
export function createMockResponse(): jest.Mocked<Response> {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    write: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    headersSent: false,
  };
  return res;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}

/**
 * Create a mock DOM element
 */
export function createMockElement(options: {
  tagName?: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes?: Record<string, string>;
} = {}): HTMLElement {
  const element = document.createElement(options.tagName || 'div');
  
  if (options.id) element.id = options.id;
  if (options.className) element.className = options.className;
  if (options.textContent) element.textContent = options.textContent;
  
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  return element;
}

/**
 * Mock console methods and capture output
 */
export class ConsoleMock {
  private originalConsole: any = {};
  private logs: Array<{ level: string; args: any[] }> = [];

  constructor() {
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };
  }

  start() {
    console.log = (...args: any[]) => {
      this.logs.push({ level: 'log', args });
    };
    console.error = (...args: any[]) => {
      this.logs.push({ level: 'error', args });
    };
    console.warn = (...args: any[]) => {
      this.logs.push({ level: 'warn', args });
    };
    console.info = (...args: any[]) => {
      this.logs.push({ level: 'info', args });
    };
  }

  stop() {
    Object.assign(console, this.originalConsole);
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }
}

/**
 * Create a test WebSocket server for integration tests
 */
export class TestWebSocketServer {
  private clients: Set<WebSocket> = new Set();
  private messageHandlers: Map<string, (message: any) => any> = new Map();

  addClient(client: WebSocket) {
    this.clients.add(client);
    
    client.on('message', (data) => {
      const message = JSON.parse(data.toString());
      const handler = this.messageHandlers.get(message.type);
      
      if (handler) {
        const response = handler(message);
        if (response) {
          client.send(JSON.stringify(response));
        }
      }
    });

    client.on('close', () => {
      this.clients.delete(client);
    });
  }

  onMessage(type: string, handler: (message: any) => any) {
    this.messageHandlers.set(type, handler);
  }

  broadcast(message: any) {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  getClients() {
    return Array.from(this.clients);
  }

  close() {
    this.clients.forEach(client => client.close());
    this.clients.clear();
    this.messageHandlers.clear();
  }
}