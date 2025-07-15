export interface WebAppMCPClientConfig {
  serverUrl: string;
  authToken?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class WebAppMCPClient {
  private ws: WebSocket | null = null;
  private config: WebAppMCPClientConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: any;
  private messageHandlers = new Map<string, (data: any) => void>();
  private consoleLogs: any[] = [];
  private isConnected = false;

  constructor(config: WebAppMCPClientConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      ...config,
    };
    this.setupConsoleInterception();
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const url = new URL(this.config.serverUrl);
      if (this.config.authToken) {
        url.searchParams.set('token', this.config.authToken);
      }

      this.ws = new WebSocket(url.toString());
      this.setupWebSocketHandlers();
    } catch (error) {
      console.error('Failed to connect to WebApp MCP server:', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.isConnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('Connected to WebApp MCP server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.sendMessage({
        type: 'init',
        url: window.location.href,
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from WebApp MCP server');
      this.isConnected = false;
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (
      this.reconnectAttempts >= (this.config.maxReconnectAttempts || 10) ||
      this.reconnectTimer
    ) {
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.config.reconnectInterval);
  }

  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  private handleMessage(message: any): void {
    const { type, requestId, tool, args } = message;

    if (type === 'connected') {
      console.log('WebApp MCP client registered:', message.clientId);
      return;
    }

    if (type === 'execute_tool') {
      this.executeToolHandler(requestId, tool, args);
      return;
    }

    const handler = this.messageHandlers.get(type);
    if (handler) {
      handler(message);
    }
  }

  private async executeToolHandler(
    requestId: string,
    toolName: string,
    args: any
  ): Promise<void> {
    try {
      let result: any;

      switch (toolName) {
        case 'dom_query':
          result = await this.domQuery(args);
          break;
        case 'dom_get_properties':
          result = await this.domGetProperties(args);
          break;
        case 'dom_get_text':
          result = await this.domGetText(args);
          break;
        case 'dom_get_html':
          result = await this.domGetHTML(args);
          break;
        case 'interaction_click':
          result = await this.interactionClick(args);
          break;
        case 'interaction_type':
          result = await this.interactionType(args);
          break;
        case 'interaction_scroll':
          result = await this.interactionScroll(args);
          break;
        case 'interaction_hover':
          result = await this.interactionHover(args);
          break;
        case 'capture_screenshot':
          result = await this.captureScreenshot(args);
          break;
        case 'capture_element_screenshot':
          result = await this.captureElementScreenshot(args);
          break;
        case 'state_get_variable':
          result = await this.stateGetVariable(args);
          break;
        case 'state_local_storage':
          result = await this.stateLocalStorage(args);
          break;
        case 'console_get_logs':
          result = await this.consoleGetLogs(args);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      this.sendMessage({
        type: 'tool_response',
        requestId,
        result,
      });
    } catch (error) {
      this.sendMessage({
        type: 'tool_response',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private setupConsoleInterception(): void {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    const interceptor = (level: string) => {
      return (...args: any[]) => {
        this.consoleLogs.push({
          level,
          timestamp: new Date().toISOString(),
          args: args.map((arg) => {
            try {
              return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
            } catch {
              return String(arg);
            }
          }),
        });

        if (this.consoleLogs.length > 1000) {
          this.consoleLogs.shift();
        }

        (originalConsole as any)[level](...args);
      };
    };

    console.log = interceptor('log');
    console.info = interceptor('info');
    console.warn = interceptor('warn');
    console.error = interceptor('error');
  }

  private async domQuery(args: any): Promise<any> {
    const { selector, limit = 10 } = args;
    const elements = Array.from(document.querySelectorAll(selector)).slice(0, limit);

    return {
      elements: elements.map((el) => ({
        selector,
        tagName: el.tagName.toLowerCase(),
        id: el.id || undefined,
        className: el.className || undefined,
        text: el.textContent?.trim().substring(0, 100),
        attributes: Array.from(el.attributes).reduce((acc: Record<string, string>, attr: Attr) => {
          acc[attr.name] = attr.value;
          return acc;
        }, {}),
      })),
    };
  }

  private async domGetProperties(args: any): Promise<any> {
    const { selector, properties = [] } = args;
    const element = document.querySelector(selector);

    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const result: Record<string, any> = {};
    for (const prop of properties) {
      try {
        result[prop] = (element as any)[prop];
      } catch {
        result[prop] = undefined;
      }
    }

    return result;
  }

  private async domGetText(args: any): Promise<any> {
    const { selector, includeHidden = false } = args;
    const elements = document.querySelectorAll(selector);

    const texts: string[] = [];
    elements.forEach((el) => {
      if (includeHidden || (el as HTMLElement).offsetParent !== null) {
        const text = el.textContent?.trim();
        if (text) texts.push(text);
      }
    });

    return { texts };
  }

  private async domGetHTML(args: any): Promise<any> {
    const { selector, outerHTML = false } = args;
    const element = document.querySelector(selector);

    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    return {
      html: outerHTML ? element.outerHTML : element.innerHTML,
    };
  }

  private async interactionClick(args: any): Promise<any> {
    const { selector, button = 'left' } = args;
    const element = document.querySelector(selector) as HTMLElement;

    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      button: button === 'right' ? 2 : button === 'middle' ? 1 : 0,
    });

    element.dispatchEvent(event);
    return { success: true };
  }

  private async interactionType(args: any): Promise<any> {
    const { selector, text, clear = false } = args;
    const element = document.querySelector(selector) as HTMLInputElement;

    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    if (clear) {
      element.value = '';
    }

    element.focus();
    element.value += text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return { success: true };
  }

  private async interactionScroll(args: any): Promise<any> {
    const { selector, direction, amount = 100 } = args;
    const element = selector ? document.querySelector(selector) : window;

    if (!element && selector) {
      throw new Error(`Element not found: ${selector}`);
    }

    const scrollOptions: ScrollToOptions = {
      behavior: 'smooth',
    };

    if (direction === 'up' || direction === 'down') {
      scrollOptions.top = direction === 'down' ? amount : -amount;
    } else {
      scrollOptions.left = direction === 'right' ? amount : -amount;
    }

    if (element === window) {
      window.scrollBy(scrollOptions);
    } else {
      (element as HTMLElement).scrollBy(scrollOptions);
    }

    return { success: true };
  }

  private async interactionHover(args: any): Promise<any> {
    const { selector } = args;
    const element = document.querySelector(selector) as HTMLElement;

    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    element.dispatchEvent(
      new MouseEvent('mouseenter', {
        view: window,
        bubbles: true,
        cancelable: true,
      })
    );

    element.dispatchEvent(
      new MouseEvent('mouseover', {
        view: window,
        bubbles: true,
        cancelable: true,
      })
    );

    return { success: true };
  }

  private async captureScreenshot(args: any): Promise<any> {
    throw new Error('Screenshot capture requires server-side implementation');
  }

  private async captureElementScreenshot(args: any): Promise<any> {
    throw new Error('Element screenshot capture requires server-side implementation');
  }

  private async stateGetVariable(args: any): Promise<any> {
    const { path } = args;
    const parts = path.split('.');
    let current: any = window;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        throw new Error(`Variable not found: ${path}`);
      }
    }

    return { value: current };
  }

  private async stateLocalStorage(args: any): Promise<any> {
    const { operation, key, value } = args;

    switch (operation) {
      case 'get':
        return { value: localStorage.getItem(key) };
      case 'set':
        localStorage.setItem(key, value);
        return { success: true };
      case 'remove':
        localStorage.removeItem(key);
        return { success: true };
      case 'clear':
        localStorage.clear();
        return { success: true };
      case 'getAll':
        const items: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) items[k] = localStorage.getItem(k) || '';
        }
        return { items };
      default:
        throw new Error(`Unknown localStorage operation: ${operation}`);
    }
  }

  private async consoleGetLogs(args: any): Promise<any> {
    const { level = 'all', limit = 100 } = args;
    
    let logs = this.consoleLogs;
    if (level !== 'all') {
      logs = logs.filter((log) => log.level === level);
    }

    return { logs: logs.slice(-limit) };
  }
}

if (typeof window !== 'undefined') {
  (window as any).WebAppMCPClient = WebAppMCPClient;
}