export interface MCPLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'tool';
  source: 'websocket' | 'mcp' | 'client' | 'tool';
  message: string;
  data?: any;
}

export interface MCPDevToolsConfig {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: 'light' | 'dark';
}

export class MCPDevTools {
  private container: HTMLElement | null = null;
  private isExpanded = false;
  private logs: MCPLog[] = [];
  private maxLogs = 500;
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';
  private config: MCPDevToolsConfig;

  constructor(config: MCPDevToolsConfig = {}) {
    this.config = {
      position: 'bottom-right',
      theme: 'dark',
      ...config
    };
    this.addStyles();
    this.createDevToolsUI();
    this.setupEventListeners();
  }

  private createDevToolsUI() {
    this.container = document.createElement('div');
    this.container.id = 'mcp-devtools';
    this.container.className = `mcp-theme-${this.config.theme} mcp-position-${this.config.position}`;
    this.container.innerHTML = `
      <div class="mcp-devtools-indicator" id="mcp-indicator">
        <div class="mcp-status-dot" id="mcp-status-dot"></div>
        <span class="mcp-label">MCP</span>
      </div>
      <div class="mcp-devtools-panel" id="mcp-panel" style="display: none;">
        <div class="mcp-devtools-header">
          <span>MCP DevTools</span>
          <div class="mcp-header-controls">
            <button class="mcp-theme-toggle" id="mcp-theme-btn" title="Toggle theme">🌓</button>
            <button class="mcp-close-btn" id="mcp-close-btn">×</button>
          </div>
        </div>
        <div class="mcp-devtools-content">
          <div class="mcp-status-section">
            <div class="mcp-status-item">
              <label>WebSocket:</label>
              <span id="mcp-ws-status">Disconnected</span>
            </div>
            <div class="mcp-status-item">
              <label>MCP Server:</label>
              <span id="mcp-server-status">Disconnected</span>
            </div>
          </div>
          <div class="mcp-logs-section">
            <div class="mcp-logs-header">
              <span>Activity Log</span>
              <div class="mcp-logs-controls">
                <label class="mcp-checkbox">
                  <input type="checkbox" id="mcp-autoscroll" checked>
                  Auto-scroll
                </label>
                <button class="mcp-clear-btn" id="mcp-clear-btn">Clear</button>
              </div>
            </div>
            <div class="mcp-logs-container" id="mcp-logs"></div>
          </div>
        </div>
      </div>
    `;

    this.addStyles();
    document.body.appendChild(this.container);
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #mcp-devtools {
        position: fixed;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      /* Positioning */
      #mcp-devtools.mcp-position-bottom-right {
        bottom: 20px;
        right: 20px;
      }
      
      #mcp-devtools.mcp-position-bottom-left {
        bottom: 20px;
        left: 20px;
      }
      
      #mcp-devtools.mcp-position-top-right {
        top: 20px;
        right: 20px;
      }
      
      #mcp-devtools.mcp-position-top-left {
        top: 20px;
        left: 20px;
      }

      .mcp-devtools-indicator {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.9);
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      .mcp-label {
        font-size: 10px;
        font-weight: 600;
        color: #495057;
        user-select: none;
      }

      .mcp-status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background-color: #dc3545;
        border: 2px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: background-color 0.3s ease;
      }

      .mcp-status-dot.connecting {
        background-color: #ffc107;
        animation: pulse 1.5s infinite;
      }

      .mcp-status-dot.connected {
        background-color: #28a745;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .mcp-devtools-panel {
        position: absolute;
        width: 500px;
        height: 400px;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
      }
      
      /* Panel positioning based on indicator position */
      .mcp-position-bottom-right .mcp-devtools-panel {
        bottom: 40px;
        right: 0;
      }
      
      .mcp-position-bottom-left .mcp-devtools-panel {
        bottom: 40px;
        left: 0;
      }
      
      .mcp-position-top-right .mcp-devtools-panel {
        top: 40px;
        right: 0;
      }
      
      .mcp-position-top-left .mcp-devtools-panel {
        top: 40px;
        left: 0;
      }

      .mcp-devtools-header {
        padding: 12px 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #e0e0e0;
        border-radius: 8px 8px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 600;
        font-size: 14px;
      }

      .mcp-close-btn {
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #6c757d;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .mcp-close-btn:hover {
        color: #495057;
      }

      .mcp-devtools-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .mcp-status-section {
        padding: 12px 16px;
        border-bottom: 1px solid #e0e0e0;
        background: #f8f9fa;
      }

      .mcp-status-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        font-size: 12px;
      }

      .mcp-status-item label {
        font-weight: 500;
        color: #495057;
      }

      .mcp-status-item span {
        color: #6c757d;
      }

      .mcp-logs-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .mcp-logs-header {
        padding: 8px 16px;
        background: #f8f9fa;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        font-weight: 500;
      }

      .mcp-clear-btn {
        background: none;
        border: 1px solid #dee2e6;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 11px;
        cursor: pointer;
        color: #6c757d;
      }

      .mcp-clear-btn:hover {
        background: #e9ecef;
      }

      .mcp-logs-container {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        font-size: 11px;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      }

      .mcp-log-entry {
        margin-bottom: 4px;
        padding: 4px 8px;
        border-radius: 4px;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .mcp-log-entry.info {
        background: #e7f3ff;
        color: #0c5460;
      }

      .mcp-log-entry.warning {
        background: #fff3cd;
        color: #856404;
      }

      .mcp-log-entry.error {
        background: #f8d7da;
        color: #721c24;
      }

      .mcp-log-timestamp {
        color: #6c757d;
        font-size: 10px;
      }
      
      /* Header controls */
      .mcp-header-controls {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .mcp-theme-toggle {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 0;
        opacity: 0.6;
        transition: opacity 0.2s;
      }
      
      .mcp-theme-toggle:hover {
        opacity: 1;
      }
      
      /* Log controls */
      .mcp-logs-controls {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .mcp-checkbox {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        cursor: pointer;
      }
      
      .mcp-checkbox input {
        cursor: pointer;
      }
      
      /* Tool execution logs */
      .mcp-log-entry.tool {
        background: #e7f3ff;
        color: #004085;
        border-left: 3px solid #004085;
      }
      
      .mcp-tool-details {
        font-size: 10px;
        margin-top: 4px;
        padding-left: 16px;
        opacity: 0.8;
      }
      
      /* Dark theme */
      .mcp-theme-dark .mcp-devtools-indicator {
        background: rgba(30, 30, 30, 0.9);
        border-color: rgba(255, 255, 255, 0.1);
      }
      
      .mcp-theme-dark .mcp-label {
        color: #e0e0e0;
      }
      
      .mcp-theme-dark .mcp-devtools-panel {
        background: #1e1e1e;
        border-color: #333;
      }
      
      .mcp-theme-dark .mcp-devtools-header {
        background: #2d2d2d;
        border-color: #333;
        color: #e0e0e0;
      }
      
      .mcp-theme-dark .mcp-devtools-content {
        background: #1e1e1e;
      }
      
      .mcp-theme-dark .mcp-status-section {
        background: #2d2d2d;
        border-color: #333;
      }
      
      .mcp-theme-dark .mcp-status-item label {
        color: #b0b0b0;
      }
      
      .mcp-theme-dark .mcp-status-item span {
        color: #e0e0e0;
      }
      
      .mcp-theme-dark .mcp-logs-header {
        background: #2d2d2d;
        border-color: #333;
        color: #e0e0e0;
      }
      
      .mcp-theme-dark .mcp-logs-container {
        background: #252525;
        border-color: #333;
      }
      
      .mcp-theme-dark .mcp-log-entry {
        background: #2d2d2d;
        color: #e0e0e0;
        border-color: #333;
      }
      
      .mcp-theme-dark .mcp-log-entry.warning {
        background: #4a3800;
        color: #ffc107;
      }
      
      .mcp-theme-dark .mcp-log-entry.error {
        background: #4a0000;
        color: #ff6b6b;
      }
      
      .mcp-theme-dark .mcp-log-entry.tool {
        background: #003366;
        color: #66b3ff;
        border-left-color: #66b3ff;
      }
      
      .mcp-theme-dark .mcp-log-timestamp {
        color: #888;
      }
      
      .mcp-theme-dark .mcp-clear-btn,
      .mcp-theme-dark .mcp-close-btn {
        color: #e0e0e0;
        border-color: #555;
      }
      
      .mcp-theme-dark .mcp-clear-btn:hover,
      .mcp-theme-dark .mcp-close-btn:hover {
        background: #444;
      }
      }
    `;
    document.head.appendChild(style);
  }

  private setupEventListeners() {
    const indicator = this.container?.querySelector('#mcp-indicator');
    const closeBtn = this.container?.querySelector('#mcp-close-btn');
    const clearBtn = this.container?.querySelector('#mcp-clear-btn');
    const themeBtn = this.container?.querySelector('#mcp-theme-btn');

    indicator?.addEventListener('click', () => this.togglePanel());
    closeBtn?.addEventListener('click', () => this.togglePanel());
    clearBtn?.addEventListener('click', () => this.clearLogs());
    themeBtn?.addEventListener('click', () => this.toggleTheme());
  }
  
  private toggleTheme() {
    if (!this.container) return;
    
    this.config.theme = this.config.theme === 'light' ? 'dark' : 'light';
    this.container.className = `mcp-theme-${this.config.theme} mcp-position-${this.config.position}`;
  }

  private togglePanel() {
    this.isExpanded = !this.isExpanded;
    const panel = this.container?.querySelector('#mcp-panel') as HTMLElement;
    if (panel) {
      panel.style.display = this.isExpanded ? 'flex' : 'none';
    }
  }

  public setConnectionStatus(status: 'connected' | 'connecting' | 'disconnected') {
    this.connectionStatus = status;
    const dot = this.container?.querySelector('#mcp-status-dot');
    const wsStatus = this.container?.querySelector('#mcp-ws-status');
    const serverStatus = this.container?.querySelector('#mcp-server-status');

    if (dot) {
      dot.className = `mcp-status-dot ${status}`;
    }

    if (wsStatus && serverStatus) {
      const statusText = status.charAt(0).toUpperCase() + status.slice(1);
      wsStatus.textContent = statusText;
      serverStatus.textContent = statusText;
    }

    this.addLog('info', 'client', `Connection status: ${status}`);
  }

  public addLog(level: 'info' | 'warning' | 'error' | 'tool', source: 'websocket' | 'mcp' | 'client' | 'tool', message: string, data?: any) {
    const log: MCPLog = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      data
    };

    this.logs.unshift(log);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    this.renderLogs();
  }

  private renderLogs() {
    const logsContainer = this.container?.querySelector('#mcp-logs') as HTMLElement;
    if (!logsContainer) return;

    logsContainer.innerHTML = this.logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      
      if (log.level === 'tool' && log.data) {
        // Special formatting for tool logs
        const details = log.data;
        let detailsHtml = '';
        
        if (details.args) {
          detailsHtml += `<div class="mcp-tool-details">Args: ${this.safeStringify(details.args)}</div>`;
        }
        
        if (details.error) {
          detailsHtml += `<div class="mcp-tool-details">Error: ${details.error}</div>`;
        }
        
        if (details.result && details.status === 'completed') {
          const resultStr = this.safeStringify(details.result);
          if (resultStr.length > 100) {
            detailsHtml += `<div class="mcp-tool-details">Result: ${resultStr.substring(0, 100)}...</div>`;
          } else {
            detailsHtml += `<div class="mcp-tool-details">Result: ${resultStr}</div>`;
          }
        }
        
        return `
          <div class="mcp-log-entry ${log.level}">
            <span class="mcp-log-timestamp">[${time}]</span> [${log.source.toUpperCase()}] ${log.message}
            ${detailsHtml}
          </div>
        `;
      } else {
        // Regular log formatting
        const dataStr = log.data ? ` ${this.safeStringify(log.data)}` : '';
        return `
          <div class="mcp-log-entry ${log.level}">
            <span class="mcp-log-timestamp">[${time}]</span> [${log.source.toUpperCase()}] ${log.message}${dataStr}
          </div>
        `;
      }
    }).join('');

    // Auto-scroll to top if enabled (latest items are at the top)
    const autoScrollCheckbox = this.container?.querySelector('#mcp-autoscroll') as HTMLInputElement;
    if (autoScrollCheckbox?.checked) {
      logsContainer.scrollTop = 0;
    }
  }

  private safeStringify(obj: any): string {
    try {
      // Handle simple types
      if (obj === null || obj === undefined) {
        return String(obj);
      }
      
      if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return String(obj);
      }

      // Handle arrays and objects with circular reference protection
      const seen = new Set();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }
        return value;
      });
    } catch (error) {
      return `[Error stringifying: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }

  private clearLogs() {
    this.logs = [];
    this.renderLogs();
  }

  public logWebSocketEvent(event: string, data?: any) {
    this.addLog('info', 'websocket', event, data);
  }

  public logMCPEvent(event: string, data?: any) {
    this.addLog('info', 'mcp', event, data);
  }

  public logError(source: 'websocket' | 'mcp' | 'client', message: string, error?: any) {
    this.addLog('error', source, message, error);
  }
  
  public logToolExecution(toolName: string, args: any, success: boolean | null, message: string, executionTime?: number, result?: any) {
    const status = success === null ? 'started' : (success ? 'completed' : 'failed');
    const details = {
      tool: toolName,
      status,
      args,
      executionTime: executionTime ? `${executionTime}ms` : undefined,
      result: success && result ? result : undefined,
      error: !success && message !== 'Success' ? message : undefined
    };
    
    const logMessage = `Tool ${toolName} ${status}${executionTime ? ` (${executionTime}ms)` : ''}`;
    this.addLog(success === false ? 'error' : 'tool', 'tool', logMessage, details);
  }
}