export interface MCPLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  source: 'websocket' | 'mcp' | 'client';
  message: string;
  data?: any;
}

export class MCPDevTools {
  private container: HTMLElement | null = null;
  private isExpanded = false;
  private logs: MCPLog[] = [];
  private maxLogs = 100;
  private connectionStatus: 'connected' | 'connecting' | 'disconnected' = 'disconnected';

  constructor() {
    this.createDevToolsUI();
    this.setupEventListeners();
  }

  private createDevToolsUI() {
    this.container = document.createElement('div');
    this.container.id = 'mcp-devtools';
    this.container.innerHTML = `
      <div class="mcp-devtools-indicator" id="mcp-indicator">
        <div class="mcp-status-dot" id="mcp-status-dot"></div>
        <span class="mcp-label">MCP</span>
      </div>
      <div class="mcp-devtools-panel" id="mcp-panel" style="display: none;">
        <div class="mcp-devtools-header">
          <span>MCP DevTools</span>
          <button class="mcp-close-btn" id="mcp-close-btn">×</button>
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
              <span>Console Logs</span>
              <button class="mcp-clear-btn" id="mcp-clear-btn">Clear</button>
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
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
        bottom: 30px;
        right: 0;
        width: 400px;
        height: 300px;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
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
    `;
    document.head.appendChild(style);
  }

  private setupEventListeners() {
    const indicator = this.container?.querySelector('#mcp-indicator');
    const closeBtn = this.container?.querySelector('#mcp-close-btn');
    const clearBtn = this.container?.querySelector('#mcp-clear-btn');

    indicator?.addEventListener('click', () => this.togglePanel());
    closeBtn?.addEventListener('click', () => this.togglePanel());
    clearBtn?.addEventListener('click', () => this.clearLogs());
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

  public addLog(level: 'info' | 'warning' | 'error', source: 'websocket' | 'mcp' | 'client', message: string, data?: any) {
    const log: MCPLog = {
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      data
    };

    this.logs.push(log);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    this.renderLogs();
  }

  private renderLogs() {
    const logsContainer = this.container?.querySelector('#mcp-logs');
    if (!logsContainer) return;

    logsContainer.innerHTML = this.logs.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const dataStr = log.data ? ` ${this.safeStringify(log.data)}` : '';
      return `
        <div class="mcp-log-entry ${log.level}">
          <span class="mcp-log-timestamp">[${time}]</span> [${log.source.toUpperCase()}] ${log.message}${dataStr}
        </div>
      `;
    }).join('');

    logsContainer.scrollTop = logsContainer.scrollHeight;
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
}