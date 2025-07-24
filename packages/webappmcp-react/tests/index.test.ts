import reactPlugin, { useWebAppMCP } from '../src/index';
import type { PluginContext } from '@cgaspard/webappmcp';

describe('React Plugin', () => {
  let mockContext: PluginContext;
  let mockExecuteClientTool: jest.Mock;
  let mockGetClients: jest.Mock;
  let mockLog: jest.Mock;

  beforeEach(() => {
    mockExecuteClientTool = jest.fn();
    mockGetClients = jest.fn(() => []);
    mockLog = jest.fn();
    
    mockContext = {
      executeClientTool: mockExecuteClientTool,
      getClients: mockGetClients,
      log: mockLog
    };
  });

  describe('Plugin Structure', () => {
    it('should have correct plugin metadata', () => {
      expect(reactPlugin.name).toBe('react-plugin');
      expect(reactPlugin.description).toBe('React and React Router tools for WebApp MCP');
      expect(reactPlugin.tools).toBeDefined();
      expect(reactPlugin.tools?.length).toBeGreaterThan(0);
      expect(reactPlugin.clientExtensions).toBeDefined();
      expect(reactPlugin.initialize).toBeDefined();
    });

    it('should have all expected tools', () => {
      const toolNames = reactPlugin.tools?.map(t => t.name) || [];
      expect(toolNames).toContain('react_get_current_route');
      expect(toolNames).toContain('react_navigate');
      expect(toolNames).toContain('react_get_component_tree');
      expect(toolNames).toContain('react_get_state');
    });
  });

  describe('react_get_current_route', () => {
    it('should get current route from Next.js', async () => {
      const tool = reactPlugin.tools?.find(t => t.name === 'react_get_current_route');
      expect(tool).toBeDefined();

      mockExecuteClientTool.mockResolvedValue({
        result: {
          type: 'nextjs',
          pathname: '/products/[id]',
          query: { id: '123', category: 'electronics' },
          asPath: '/products/123?category=electronics',
          route: '/products/[id]',
          locale: 'en'
        }
      });

      const result = await tool!.handler({}, mockContext);

      expect(mockLog).toHaveBeenCalledWith('Getting current React route...');
      expect(mockExecuteClientTool).toHaveBeenCalledWith(
        'execute_javascript',
        expect.objectContaining({
          code: expect.stringContaining('window.next.router'),
          returnValue: true
        }),
        undefined
      );
      expect(result).toHaveProperty('type', 'nextjs');
      expect(result).toHaveProperty('pathname', '/products/[id]');
    });

    it('should get current route from React Router v6', async () => {
      const tool = reactPlugin.tools?.find(t => t.name === 'react_get_current_route');
      
      mockExecuteClientTool.mockResolvedValue({
        result: {
          type: 'react-router-v6',
          pathname: '/users/123',
          search: '?tab=profile',
          hash: '#section',
          state: null,
          key: 'default'
        }
      });

      const result = await tool!.handler({}, mockContext);
      expect(result).toHaveProperty('type', 'react-router-v6');
    });

    it('should fall back to window location', async () => {
      const tool = reactPlugin.tools?.find(t => t.name === 'react_get_current_route');
      
      mockExecuteClientTool.mockResolvedValue({
        result: {
          type: 'none',
          pathname: '/page',
          search: '?query=test',
          hash: '#top',
          href: 'http://localhost/page?query=test#top'
        }
      });

      const result = await tool!.handler({}, mockContext);
      expect(result).toHaveProperty('type', 'none');
      expect(result).toHaveProperty('pathname', '/page');
    });
  });

  describe('react_navigate', () => {
    it('should navigate using Next.js router', async () => {
      const tool = reactPlugin.tools?.find(t => t.name === 'react_navigate');
      expect(tool).toBeDefined();

      mockExecuteClientTool.mockResolvedValue({
        result: { success: true, type: 'nextjs' }
      });

      const args = {
        path: '/products',
        query: { category: 'electronics' }
      };

      const result = await tool!.handler(args, mockContext);

      expect(mockLog).toHaveBeenCalledWith('Navigating to /products...');
      expect(mockExecuteClientTool).toHaveBeenCalledWith(
        'execute_javascript',
        expect.objectContaining({
          code: expect.stringContaining("router[replace ? 'replace' : 'push']"),
          returnValue: true,
          async: true
        }),
        undefined
      );
      expect(result).toEqual({ success: true, type: 'nextjs' });
    });

    it('should navigate using React Router v6', async () => {
      const tool = reactPlugin.tools?.find(t => t.name === 'react_navigate');
      
      mockExecuteClientTool.mockResolvedValue({
        result: { success: true, type: 'react-router-v6' }
      });

      const args = {
        path: '/about',
        replace: true
      };

      const result = await tool!.handler(args, mockContext);
      
      expect(mockExecuteClientTool).toHaveBeenCalledWith(
        'execute_javascript',
        expect.objectContaining({
          code: expect.stringContaining('__reactRouterNavigate')
        }),
        undefined
      );
      expect(result).toEqual({ success: true, type: 'react-router-v6' });
    });

    it('should fall back to native navigation', async () => {
      const tool = reactPlugin.tools?.find(t => t.name === 'react_navigate');
      
      mockExecuteClientTool.mockResolvedValue({
        result: { success: true, type: 'native' }
      });

      const args = { path: '/fallback' };

      const result = await tool!.handler(args, mockContext);
      
      expect(mockExecuteClientTool).toHaveBeenCalledWith(
        'execute_javascript',
        expect.objectContaining({
          code: expect.stringContaining('window.location.href')
        }),
        undefined
      );
      expect(result).toEqual({ success: true, type: 'native' });
    });
  });

  describe('react_get_component_tree', () => {
    it('should detect React DevTools', async () => {
      const tool = reactPlugin.tools?.find(t => t.name === 'react_get_component_tree');
      expect(tool).toBeDefined();

      mockExecuteClientTool.mockResolvedValue({
        result: {
          type: 'react-devtools',
          message: 'React DevTools detected',
          rendererCount: 1,
          info: 'Full component tree inspection requires React DevTools browser extension'
        }
      });

      const result = await tool!.handler({ maxDepth: 5 }, mockContext);

      expect(mockLog).toHaveBeenCalledWith('Getting React component tree...');
      expect(result).toHaveProperty('type', 'react-devtools');
    });

    it('should detect React DOM root', async () => {
      const tool = reactPlugin.tools?.find(t => t.name === 'react_get_component_tree');
      
      mockExecuteClientTool.mockResolvedValue({
        result: {
          type: 'react-dom',
          hasRoot: true,
          rootElement: 'div#root'
        }
      });

      const result = await tool!.handler({}, mockContext);
      expect(result).toHaveProperty('type', 'react-dom');
      expect(result).toHaveProperty('hasRoot', true);
    });
  });

  describe('react_get_state', () => {
    it('should get exposed component state', async () => {
      const tool = reactPlugin.tools?.find(t => t.name === 'react_get_state');
      expect(tool).toBeDefined();

      mockExecuteClientTool.mockResolvedValue({
        result: {
          name: 'UserProfile',
          state: { user: { id: 1, name: 'John' }, isLoading: false },
          props: { userId: '123' },
          hooks: {}
        }
      });

      const result = await tool!.handler({ componentName: 'UserProfile' }, mockContext);

      expect(mockLog).toHaveBeenCalledWith('Getting state for component: UserProfile');
      expect(result).toHaveProperty('name', 'UserProfile');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('props');
    });

    it('should handle component not found', async () => {
      const tool = reactPlugin.tools?.find(t => t.name === 'react_get_state');
      
      mockExecuteClientTool.mockResolvedValue({
        result: {
          error: 'Component not found. Components must be explicitly exposed to WebApp MCP.'
        }
      });

      const result = await tool!.handler({ componentName: 'Unknown' }, mockContext);
      expect(result).toHaveProperty('error');
    });
  });

  describe('Client Extensions', () => {
    it('should have client extension code', () => {
      expect(reactPlugin.clientExtensions).toBeDefined();
      expect(reactPlugin.clientExtensions!.length).toBeGreaterThan(0);
      
      const extension = reactPlugin.clientExtensions![0];
      expect(extension.code).toContain('React plugin client extension');
      expect(extension.code).toContain('setupRouteMonitoring');
      expect(extension.code).toContain('registerReactComponent');
      expect(extension.code).toContain('useWebAppMCPRouter');
      expect(extension.timing).toBe('onConnect');
    });
  });

  describe('Plugin Initialization', () => {
    it('should initialize properly', async () => {
      const mockInitContext = {
        log: jest.fn(),
        config: {
          wsPort: 4835,
          transport: 'sse' as const
        }
      };

      await reactPlugin.initialize!(mockInitContext);
      
      expect(mockInitContext.log).toHaveBeenCalledWith('React plugin initialized');
    });
  });

  describe('useWebAppMCP Hook', () => {
    it('should return null when not in browser', () => {
      const result = useWebAppMCP();
      expect(result).toBeNull();
    });

    it('should return hook function when available', () => {
      const mockHook = jest.fn();
      (global as any).window = { useWebAppMCPRouter: mockHook };
      
      const result = useWebAppMCP();
      expect(result).toBe(mockHook);
      
      delete (global as any).window;
    });
  });
});