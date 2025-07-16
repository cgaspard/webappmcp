import { MCPDevTools } from '../../src/client/devtools';

describe('MCPDevTools', () => {
  let devTools: MCPDevTools;

  beforeEach(() => {
    // Clear the DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up
    if (devTools) {
      const container = document.getElementById('mcp-devtools');
      container?.remove();
    }
  });

  describe('Initialization', () => {
    it('should create DevTools UI with default configuration', () => {
      devTools = new MCPDevTools();

      const container = document.getElementById('mcp-devtools');
      expect(container).toBeTruthy();
      expect(container?.classList.contains('mcp-theme-light')).toBe(true);
      expect(container?.classList.contains('mcp-position-bottom-right')).toBe(true);
    });

    it('should create DevTools UI with custom configuration', () => {
      devTools = new MCPDevTools({
        position: 'top-left',
        theme: 'dark'
      });

      const container = document.getElementById('mcp-devtools');
      expect(container).toBeTruthy();
      expect(container?.classList.contains('mcp-theme-dark')).toBe(true);
      expect(container?.classList.contains('mcp-position-top-left')).toBe(true);
    });

    it('should create all UI elements', () => {
      devTools = new MCPDevTools();

      expect(document.getElementById('mcp-indicator')).toBeTruthy();
      expect(document.getElementById('mcp-panel')).toBeTruthy();
      expect(document.getElementById('mcp-status-dot')).toBeTruthy();
      expect(document.getElementById('mcp-ws-status')).toBeTruthy();
      expect(document.getElementById('mcp-logs')).toBeTruthy();
      expect(document.getElementById('mcp-theme-btn')).toBeTruthy();
      expect(document.getElementById('mcp-autoscroll')).toBeTruthy();
    });
  });

  describe('Panel toggle', () => {
    it('should toggle panel visibility on indicator click', () => {
      devTools = new MCPDevTools();

      const indicator = document.getElementById('mcp-indicator');
      const panel = document.getElementById('mcp-panel') as HTMLElement;

      expect(panel.style.display).toBe('none');

      // Click to open
      indicator?.click();
      expect(panel.style.display).toBe('flex');

      // Click to close
      indicator?.click();
      expect(panel.style.display).toBe('none');
    });

    it('should close panel on close button click', () => {
      devTools = new MCPDevTools();

      const indicator = document.getElementById('mcp-indicator');
      const closeBtn = document.getElementById('mcp-close-btn');
      const panel = document.getElementById('mcp-panel') as HTMLElement;

      // Open panel
      indicator?.click();
      expect(panel.style.display).toBe('flex');

      // Close with close button
      closeBtn?.click();
      expect(panel.style.display).toBe('none');
    });
  });

  describe('Theme toggle', () => {
    it('should toggle between light and dark themes', () => {
      devTools = new MCPDevTools({ theme: 'light' });

      const container = document.getElementById('mcp-devtools');
      const themeBtn = document.getElementById('mcp-theme-btn');

      expect(container?.classList.contains('mcp-theme-light')).toBe(true);

      // Toggle to dark
      themeBtn?.click();
      expect(container?.classList.contains('mcp-theme-dark')).toBe(true);
      expect(container?.classList.contains('mcp-theme-light')).toBe(false);

      // Toggle back to light
      themeBtn?.click();
      expect(container?.classList.contains('mcp-theme-light')).toBe(true);
      expect(container?.classList.contains('mcp-theme-dark')).toBe(false);
    });
  });

  describe('Connection status', () => {
    it('should update connection status', () => {
      devTools = new MCPDevTools();

      const statusDot = document.getElementById('mcp-status-dot');
      const wsStatus = document.getElementById('mcp-ws-status');
      const serverStatus = document.getElementById('mcp-server-status');

      // Set to connecting
      devTools.setConnectionStatus('connecting');
      expect(statusDot?.classList.contains('connecting')).toBe(true);
      expect(wsStatus?.textContent).toBe('Connecting');
      expect(serverStatus?.textContent).toBe('Connecting');

      // Set to connected
      devTools.setConnectionStatus('connected');
      expect(statusDot?.classList.contains('connected')).toBe(true);
      expect(wsStatus?.textContent).toBe('Connected');

      // Set to disconnected
      devTools.setConnectionStatus('disconnected');
      expect(statusDot?.className).toBe('mcp-status-dot disconnected');
      expect(wsStatus?.textContent).toBe('Disconnected');
    });
  });

  describe('Logging', () => {
    it('should add and display logs', () => {
      devTools = new MCPDevTools();

      const logsContainer = document.getElementById('mcp-logs');

      devTools.addLog('info', 'client', 'Test info message');
      devTools.addLog('warning', 'websocket', 'Test warning');
      devTools.addLog('error', 'mcp', 'Test error');

      const logs = logsContainer?.querySelectorAll('.mcp-log-entry');
      expect(logs?.length).toBe(3);

      expect(logs?.[0].classList.contains('info')).toBe(true);
      expect(logs?.[0].textContent).toContain('Test info message');

      expect(logs?.[1].classList.contains('warning')).toBe(true);
      expect(logs?.[1].textContent).toContain('Test warning');

      expect(logs?.[2].classList.contains('error')).toBe(true);
      expect(logs?.[2].textContent).toContain('Test error');
    });

    it('should clear logs', () => {
      devTools = new MCPDevTools();

      devTools.addLog('info', 'client', 'Test message 1');
      devTools.addLog('info', 'client', 'Test message 2');

      const clearBtn = document.getElementById('mcp-clear-btn');
      clearBtn?.click();

      const logsContainer = document.getElementById('mcp-logs');
      const logs = logsContainer?.querySelectorAll('.mcp-log-entry');
      expect(logs?.length).toBe(0);
    });

    it('should respect max log limit', () => {
      devTools = new MCPDevTools();

      // Add more than max logs (500)
      for (let i = 0; i < 510; i++) {
        devTools.addLog('info', 'client', `Message ${i}`);
      }

      const logsContainer = document.getElementById('mcp-logs');
      const logs = logsContainer?.querySelectorAll('.mcp-log-entry');
      expect(logs?.length).toBe(500);

      // First log should be Message 10 (0-9 were removed)
      expect(logs?.[0].textContent).toContain('Message 10');
    });

    it('should handle tool execution logs', () => {
      devTools = new MCPDevTools();

      devTools.logToolExecution(
        'dom_query',
        { selector: '.test' },
        true,
        'Success',
        150,
        { elements: [] }
      );

      const logsContainer = document.getElementById('mcp-logs');
      const logs = logsContainer?.querySelectorAll('.mcp-log-entry');
      
      expect(logs?.length).toBe(1);
      expect(logs?.[0].classList.contains('tool')).toBe(true);
      expect(logs?.[0].textContent).toContain('Tool dom_query completed');
      expect(logs?.[0].textContent).toContain('150ms');
    });

    it('should handle failed tool execution logs', () => {
      devTools = new MCPDevTools();

      devTools.logToolExecution(
        'interaction_click',
        { selector: '#missing' },
        false,
        'Element not found',
        50
      );

      const logsContainer = document.getElementById('mcp-logs');
      const logs = logsContainer?.querySelectorAll('.mcp-log-entry');
      
      expect(logs?.length).toBe(1);
      expect(logs?.[0].classList.contains('error')).toBe(true);
      expect(logs?.[0].textContent).toContain('Tool interaction_click failed');
      expect(logs?.[0].textContent).toContain('50ms');
    });
  });

  describe('Auto-scroll', () => {
    it('should auto-scroll when checkbox is checked', () => {
      devTools = new MCPDevTools();

      const logsContainer = document.getElementById('mcp-logs') as HTMLElement;
      const autoScrollCheckbox = document.getElementById('mcp-autoscroll') as HTMLInputElement;

      // Should be checked by default
      expect(autoScrollCheckbox.checked).toBe(true);

      // Mock scrollHeight and scrollTop
      Object.defineProperty(logsContainer, 'scrollHeight', { value: 1000, writable: true });
      Object.defineProperty(logsContainer, 'scrollTop', { value: 0, writable: true });

      // Add a log
      devTools.addLog('info', 'client', 'Test message');

      // Should have scrolled
      expect(logsContainer.scrollTop).toBe(1000);
    });

    it('should not auto-scroll when checkbox is unchecked', () => {
      devTools = new MCPDevTools();

      const logsContainer = document.getElementById('mcp-logs') as HTMLElement;
      const autoScrollCheckbox = document.getElementById('mcp-autoscroll') as HTMLInputElement;

      // Uncheck auto-scroll
      autoScrollCheckbox.checked = false;

      // Mock scrollHeight and scrollTop
      Object.defineProperty(logsContainer, 'scrollHeight', { value: 1000, writable: true });
      Object.defineProperty(logsContainer, 'scrollTop', { value: 0, writable: true });

      // Add a log
      devTools.addLog('info', 'client', 'Test message');

      // Should not have scrolled
      expect(logsContainer.scrollTop).toBe(0);
    });
  });

  describe('Helper methods', () => {
    it('should log WebSocket events', () => {
      devTools = new MCPDevTools();

      devTools.logWebSocketEvent('Connection established', { url: 'ws://localhost:4835' });

      const logsContainer = document.getElementById('mcp-logs');
      const logs = logsContainer?.querySelectorAll('.mcp-log-entry');
      
      expect(logs?.length).toBe(1);
      expect(logs?.[0].textContent).toContain('[WEBSOCKET] Connection established');
    });

    it('should log MCP events', () => {
      devTools = new MCPDevTools();

      devTools.logMCPEvent('Tool registered', { tool: 'dom_query' });

      const logsContainer = document.getElementById('mcp-logs');
      const logs = logsContainer?.querySelectorAll('.mcp-log-entry');
      
      expect(logs?.length).toBe(1);
      expect(logs?.[0].textContent).toContain('[MCP] Tool registered');
    });

    it('should log errors', () => {
      devTools = new MCPDevTools();

      devTools.logError('websocket', 'Connection failed', new Error('Network error'));

      const logsContainer = document.getElementById('mcp-logs');
      const logs = logsContainer?.querySelectorAll('.mcp-log-entry');
      
      expect(logs?.length).toBe(1);
      expect(logs?.[0].classList.contains('error')).toBe(true);
      expect(logs?.[0].textContent).toContain('[WEBSOCKET] Connection failed');
    });
  });
});