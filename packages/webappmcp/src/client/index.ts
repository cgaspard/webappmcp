import { MCPDevTools } from './devtools';

interface WebAppMCPClientConfig {
  serverUrl: string;
  authToken?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enableDevTools?: boolean;
  debug?: boolean;
  enableConnection?: boolean; // Set to false to bypass connection in production
  interceptConsole?: boolean; // Set to false to disable console interception
  enabledTools?: string[]; // Whitelist of enabled tools (empty = all enabled)
  devToolsPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  devToolsTheme?: 'light' | 'dark';
}

class WebAppMCPClient {
  private ws: WebSocket | null = null;
  private config: WebAppMCPClientConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: any;
  private messageHandlers = new Map<string, (data: any) => void>();
  private consoleLogs: any[] = [];
  private _isConnected = false;
  private devTools: MCPDevTools | null = null;
  private pluginHandlers: Record<string, (args: any) => Promise<any>> = {};
  
  get isConnected(): boolean {
    return this._isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  constructor(config: WebAppMCPClientConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      enableDevTools: true,
      debug: false,
      enableConnection: true,
      interceptConsole: true,
      enabledTools: [], // Empty array means all tools enabled
      devToolsPosition: 'bottom-right',
      devToolsTheme: 'dark',
      ...config,
    };
    
    // Only intercept console if enabled
    if (this.config.interceptConsole) {
      this.setupConsoleInterception();
    }
    
    // Auto-load html2canvas for screenshot functionality
    this.loadHtml2Canvas();
    
    if (this.config.enableDevTools && this.config.enableConnection) {
      this.devTools = new MCPDevTools({
        position: this.config.devToolsPosition,
        theme: this.config.devToolsTheme,
      });
      this.devTools.setConnectionStatus('disconnected');
    }
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[webappmcp]', ...args);
    }
  }

  private logError(...args: any[]): void {
    // Always log errors regardless of debug setting
    console.error('[webappmcp]', ...args);
  }

  connect(): void {
    // Bypass connection if disabled (e.g., in production)
    if (!this.config.enableConnection) {
      this.log('Connection disabled by configuration');
      return;
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.devTools?.setConnectionStatus('connecting');
    this.devTools?.logWebSocketEvent('Attempting to connect', { url: this.config.serverUrl });

    try {
      const url = new URL(this.config.serverUrl);
      const headers: Record<string, string> = {};
      
      if (this.config.authToken) {
        headers['Authorization'] = `Bearer ${this.config.authToken}`;
      }

      // WebSocket in browser doesn't support custom headers directly
      // So we'll pass the token in the URL
      if (this.config.authToken) {
        url.searchParams.set('token', this.config.authToken);
      }

      this.ws = new WebSocket(url.toString());
      this.setupWebSocketHandlers();
    } catch (error) {
      this.logError('Failed to connect to WebApp MCP server:', error);
      this.devTools?.logError('websocket', 'Failed to connect', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this._isConnected = false;
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
      this.log('Connected to WebApp MCP server');
      this._isConnected = true;
      this.reconnectAttempts = 0;
      this.devTools?.setConnectionStatus('connected');
      this.devTools?.logWebSocketEvent('Connected to WebApp MCP server');
      this.sendMessage({
        type: 'init',
        url: window.location.href,
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.devTools?.logWebSocketEvent('Message received', message);
        this.handleMessage(message);
      } catch (error) {
        this.logError('Failed to parse WebSocket message:', error);
        this.devTools?.logError('websocket', 'Failed to parse message', error);
      }
    };

    this.ws.onerror = (error) => {
      this.logError('WebSocket error:', error);
      this.devTools?.logError('websocket', 'WebSocket error', error);
    };

    this.ws.onclose = () => {
      this.log('Disconnected from WebApp MCP server');
      this._isConnected = false;
      this.devTools?.setConnectionStatus('disconnected');
      this.devTools?.logWebSocketEvent('Disconnected from WebApp MCP server');
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
    this.log(
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
      this.devTools?.logWebSocketEvent('Message sent', message);
    } else {
      this.logError('WebSocket is not connected');
    }
  }

  private handleMessage(message: any): void {
    const { type, requestId, tool, args } = message;
    this.log('[WebApp Client] Received message:', JSON.stringify(message));

    if (type === 'connected') {
      this.log('WebApp MCP client registered:', message.clientId);
      this.devTools?.logMCPEvent('Client registered', { clientId: message.clientId });
      return;
    }

    if (type === 'execute_tool') {
      this.log(`[WebApp Client] Executing tool: ${tool} with requestId: ${requestId}`);
      this.devTools?.logMCPEvent(`Executing tool: ${tool}`, { requestId, args });
      this.executeToolHandler(requestId, tool, args);
      return;
    }

    if (type === 'plugin_extension') {
      this.log(`[WebApp Client] Loading plugin extension`);
      this.loadPluginExtension(message.extension);
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
    // Check if tool is enabled
    if (this.config.enabledTools && this.config.enabledTools.length > 0) {
      if (!this.config.enabledTools.includes(toolName)) {
        const error = `Tool ${toolName} is not enabled`;
        this.logError(error);
        this.devTools?.logToolExecution(toolName, args, false, error);
        this.sendMessage({
          type: 'tool_response',
          requestId,
          success: false,
          error,
        });
        return;
      }
    }
    
    this.log(`[WebApp Client] Executing tool handler for ${toolName}`);
    this.log(`[WebApp Client] Tool args:`, JSON.stringify(args));
    this.devTools?.logToolExecution(toolName, args, null, 'Started');
    
    const startTime = Date.now();
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
        case 'dom_manipulate':
          result = await this.domManipulate(args);
          break;
        case 'javascript_inject':
          result = await this.javascriptInject(args);
          break;
        case 'webapp_list_clients':
          result = await this.webappListClients(args);
          break;
        case 'execute_javascript':
          result = await this.executeJavascript(args);
          break;
        default:
          // Check if this is a plugin-provided tool
          if (this.pluginHandlers && this.pluginHandlers[toolName]) {
            result = await this.pluginHandlers[toolName](args);
          } else {
            throw new Error(`Unknown tool: ${toolName}`);
          }
      }

      const executionTime = Date.now() - startTime;
      this.log(`[WebApp Client] Tool execution successful, sending response`);
      this.devTools?.logToolExecution(toolName, args, true, 'Success', executionTime, result);
      this.sendMessage({
        type: 'tool_response',
        requestId,
        result,
        success: true,
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logError(`[WebApp Client] Tool execution failed:`, error);
      this.devTools?.logToolExecution(toolName, args, false, errorMessage, executionTime);
      this.sendMessage({
        type: 'tool_response',
        requestId,
        success: false,
        error: errorMessage,
      });
    }
  }

  private loadHtml2Canvas(): void {
    // Check if html2canvas is already loaded
    if (typeof (window as any).html2canvas !== 'undefined') {
      return;
    }
    
    // Create script element
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.async = true;
    script.onload = () => {
      if (this.config.debug) {
        console.log('[WebAppMCP] html2canvas loaded successfully');
      }
    };
    script.onerror = () => {
      console.warn('[WebAppMCP] Failed to load html2canvas - screenshots will use fallback mode');
    };
    
    document.head.appendChild(script);
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
        attributes: (() => {
          const attrs: Record<string, string> = {};
          for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            attrs[attr.name] = attr.value;
          }
          return attrs;
        })(),
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
    const { fullPage = true, format = 'png' } = args;
    
    try {
      // Use a more sophisticated approach to capture actual content
      const width = fullPage ? Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
        document.documentElement.offsetWidth,
        document.body.offsetWidth,
        document.documentElement.clientWidth
      ) : window.innerWidth;
      
      const height = fullPage ? Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        document.documentElement.offsetHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight
      ) : window.innerHeight;

      // Create a canvas to draw the content
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }

      // Try to use html2canvas if available
      if (typeof (window as any).html2canvas !== 'undefined') {
        const html2canvas = (window as any).html2canvas;
        const capturedCanvas = await html2canvas(document.body, {
          width: width,
          height: height,
          windowWidth: width,
          windowHeight: height,
          x: 0,
          y: 0,
          scrollX: fullPage ? 0 : window.scrollX,
          scrollY: fullPage ? 0 : window.scrollY,
          useCORS: true,
          allowTaint: true
        });
        
        const dataUrl = capturedCanvas.toDataURL(`image/${format}`);
        
        return {
          success: true,
          dataUrl,
          width,
          height,
          message: 'Screenshot captured successfully'
        };
      }
      
      // Fallback: Create a more detailed representation
      // This is still a fallback but provides more information than a blank placeholder
      
      // Fill background
      const bgColor = window.getComputedStyle(document.body).backgroundColor || '#ffffff';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      
      // Add some context about the page
      ctx.fillStyle = '#666';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      
      const info = [
        `Page Title: ${document.title}`,
        `URL: ${window.location.href}`,
        `Dimensions: ${width}x${height}`,
        '',
        'Note: For full screenshot functionality, include html2canvas library:',
        '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>'
      ];
      
      let y = 30;
      info.forEach(line => {
        ctx.fillText(line, 20, y);
        y += 25;
      });
      
      // Draw a border
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, width - 2, height - 2);
      
      const dataUrl = canvas.toDataURL(`image/${format}`);
      
      return {
        success: true,
        dataUrl,
        width,
        height,
        message: 'Screenshot captured (basic mode - add html2canvas for full rendering)'
      };
    } catch (error) {
      throw new Error(`Failed to capture screenshot: ${error}`);
    }
  }

  private async captureElementScreenshot(args: any): Promise<any> {
    const { selector, format = 'png' } = args;
    
    if (!selector) {
      throw new Error('Selector is required for element screenshot');
    }

    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    try {
      const rect = element.getBoundingClientRect();
      
      // Try to use html2canvas if available
      if (typeof (window as any).html2canvas !== 'undefined') {
        const html2canvas = (window as any).html2canvas;
        const capturedCanvas = await html2canvas(element, {
          width: rect.width,
          height: rect.height,
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          scrollX: -rect.left,
          scrollY: -rect.top,
          useCORS: true,
          allowTaint: true
        });
        
        const dataUrl = capturedCanvas.toDataURL(`image/${format}`);
        
        return {
          success: true,
          dataUrl,
          width: rect.width,
          height: rect.height,
          selector,
          message: 'Element screenshot captured successfully'
        };
      }
      
      // Fallback approach
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }

      canvas.width = rect.width;
      canvas.height = rect.height;

      // Get element styles
      const styles = window.getComputedStyle(element);
      const bgColor = styles.backgroundColor || '#ffffff';
      
      // Draw element representation
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, rect.width, rect.height);
      
      // Draw border
      ctx.strokeStyle = styles.borderColor || '#ddd';
      ctx.lineWidth = parseInt(styles.borderWidth) || 1;
      ctx.strokeRect(0, 0, rect.width, rect.height);
      
      // Add element info
      ctx.fillStyle = '#666';
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      
      const lines = [
        `Element: ${selector}`,
        `Size: ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        `Tag: ${element.tagName.toLowerCase()}`,
        element.className ? `Class: ${element.className}` : '',
        'Add html2canvas for full rendering'
      ].filter(Boolean);
      
      let y = Math.max(20, rect.height / 2 - (lines.length * 15) / 2);
      lines.forEach(line => {
        ctx.fillText(line, rect.width/2, y);
        y += 15;
      });
      
      const dataUrl = canvas.toDataURL(`image/${format}`);
      
      return {
        success: true,
        dataUrl,
        width: rect.width,
        height: rect.height,
        selector,
        message: 'Element screenshot captured (basic mode - add html2canvas for full rendering)'
      };
    } catch (error) {
      throw new Error(`Failed to capture element screenshot: ${error}`);
    }
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

  private async domManipulate(args: any): Promise<any> {
    const { action, selector, value, attribute, property } = args;
    
    if (!selector) {
      throw new Error('Selector is required for DOM manipulation');
    }

    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    switch (action) {
      case 'setAttribute':
        if (!attribute || value === undefined) {
          throw new Error('Attribute name and value are required for setAttribute');
        }
        element.setAttribute(attribute, value);
        return { success: true, message: `Set attribute ${attribute}="${value}" on ${selector}` };

      case 'removeAttribute':
        if (!attribute) {
          throw new Error('Attribute name is required for removeAttribute');
        }
        element.removeAttribute(attribute);
        return { success: true, message: `Removed attribute ${attribute} from ${selector}` };

      case 'setProperty':
        if (!property || value === undefined) {
          throw new Error('Property name and value are required for setProperty');
        }
        (element as any)[property] = value;
        return { success: true, message: `Set property ${property}=${value} on ${selector}` };

      case 'addClass':
        if (!value) {
          throw new Error('Class name is required for addClass');
        }
        element.classList.add(value);
        return { success: true, message: `Added class "${value}" to ${selector}` };

      case 'removeClass':
        if (!value) {
          throw new Error('Class name is required for removeClass');
        }
        element.classList.remove(value);
        return { success: true, message: `Removed class "${value}" from ${selector}` };

      case 'setInnerHTML':
        if (value === undefined) {
          throw new Error('HTML content is required for setInnerHTML');
        }
        element.innerHTML = value;
        return { success: true, message: `Set innerHTML on ${selector}` };

      case 'setTextContent':
        if (value === undefined) {
          throw new Error('Text content is required for setTextContent');
        }
        element.textContent = value;
        return { success: true, message: `Set textContent on ${selector}` };

      case 'setStyle':
        if (!property || value === undefined) {
          throw new Error('Style property and value are required for setStyle');
        }
        (element.style as any)[property] = value;
        return { success: true, message: `Set style ${property}=${value} on ${selector}` };

      case 'remove':
        element.remove();
        return { success: true, message: `Removed element ${selector}` };

      default:
        throw new Error(`Unknown DOM manipulation action: ${action}`);
    }
  }

  private async javascriptInject(args: any): Promise<any> {
    const { code, returnValue = false } = args;
    
    if (!code) {
      throw new Error('JavaScript code is required');
    }

    try {
      let result;
      if (returnValue) {
        // Use eval to return a value
        result = eval(code);
      } else {
        // Use Function constructor for execution without return
        const func = new Function(code);
        result = func();
      }

      return { 
        success: true, 
        result: result !== undefined ? result : null,
        message: 'JavaScript executed successfully'
      };
    } catch (error) {
      throw new Error(`JavaScript execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async webappListClients(args: any): Promise<any> {
    // This returns information about the current client
    return {
      clients: [{
        id: 'browser-client',
        type: 'browser',
        url: window.location.href,
        userAgent: navigator.userAgent,
        connected: this.isConnected,
        timestamp: new Date().toISOString()
      }]
    };
  }

  private async executeJavascript(args: any): Promise<any> {
    const { code, returnValue = false, async = false } = args;
    
    if (!code) {
      throw new Error('JavaScript code is required');
    }

    try {
      let result;
      
      if (async) {
        // Execute asynchronously
        if (returnValue) {
          result = await eval(`(async () => { return ${code}; })()`);
        } else {
          result = await eval(`(async () => { ${code}; })()`);
        }
      } else {
        // Execute synchronously
        if (returnValue) {
          result = eval(`(() => { return ${code}; })()`);
        } else {
          eval(code);
          result = undefined;
        }
      }

      return { 
        success: true, 
        result: result !== undefined ? result : null,
        message: 'JavaScript executed successfully',
        executionTime: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`JavaScript execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private loadPluginExtension(extension: any): void {
    try {
      // Execute the plugin code
      const pluginCode = `
        (function() {
          ${extension.code}
        })();
      `;
      eval(pluginCode);
      this.log(`[WebApp Client] Plugin extension loaded successfully`);
    } catch (error) {
      this.logError(`[WebApp Client] Failed to load plugin extension:`, error);
    }
  }

  registerPluginHandler(toolName: string, handler: (args: any) => Promise<any>): void {
    this.pluginHandlers[toolName] = handler;
    this.log(`[WebApp Client] Registered plugin handler for tool: ${toolName}`);
  }
}

// Named export
export { WebAppMCPClient };

// Default export
export default WebAppMCPClient;

if (typeof window !== 'undefined') {
  (window as any).WebAppMCP = { WebAppMCPClient };
}
