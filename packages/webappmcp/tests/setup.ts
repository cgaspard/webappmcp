// Jest setup file for global test configuration
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for TextEncoder/TextDecoder in Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock WebSocket for tests
class MockWebSocket {
  readyState: number = 0;
  url: string;
  onopen: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose({ type: 'close' });
    }
  }

  mockOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen({ type: 'open' });
    }
  }

  mockMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data), type: 'message' });
    }
  }

  mockError(error: any) {
    if (this.onerror) {
      this.onerror({ type: 'error', error });
    }
  }
}

(global as any).WebSocket = MockWebSocket;

// Mock DOM for client tests
if (typeof document === 'undefined') {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
  });

  global.document = dom.window.document;
  global.window = dom.window as any;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  global.MouseEvent = dom.window.MouseEvent;
  global.Event = dom.window.Event;
  global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn()
  };
}

// Mock Express request/response objects for middleware tests
if (!global.Request) {
  global.Request = class Request {} as any;
  global.Response = class Response {} as any;
}

// Increase timeout for integration tests
jest.setTimeout(10000);