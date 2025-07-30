import { Express, Request, Response, NextFunction } from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { IntegratedMCPServer } from './mcp-server.js';
import { MCPSSEServer } from './mcp-sse-server.js';
import { MCPSocketServer } from './mcp-socket-server.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export interface WebAppMCPConfig {
  wsPort?: number;
  wsHost?: string;  // WebSocket host (defaults to '0.0.0.0' to bind to all interfaces)
  appPort?: number;  // Express app port (defaults to process.env.PORT || 3000)
  authentication?: {
    enabled: boolean;
    token?: string;
  };
  permissions?: {
    read?: boolean;
    write?: boolean;
    screenshot?: boolean;
    state?: boolean;
  };
  cors?: cors.CorsOptions;
  mcpEndpointPath?: string;
  transport?: 'sse' | 'stdio' | 'socket' | 'none';  // MCP transport mode (defaults to 'sse')
  socketPath?: string;  // Unix socket path (only used when transport is 'socket')
  debug?: boolean;  // Enable debug logging (defaults to false)
  plugins?: WebAppMCPPlugin[];  // Custom application plugins
  screenshotDir?: string;  // Directory to save screenshots (defaults to .webappmcp/screenshots)
}

export interface WebAppMCPPlugin {
  name: string;
  description?: string;
  version?: string;
  
  // Server-side tools
  tools?: PluginTool[];
  
  // Client-side extensions
  clientExtensions?: ClientExtension[];
  
  // Initialization hook
  initialize?: (context: PluginInitContext) => Promise<void>;
}

export interface PluginTool {
  name: string;
  description: string;
  inputSchema?: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
  handler: (args: any, context: PluginContext) => Promise<any>;
}

export interface ClientExtension {
  // JavaScript code to inject into the client
  code: string;
  
  // When to inject (on connection, or on demand)
  timing?: 'onConnect' | 'onDemand';
  
  // Dependencies this extension requires
  dependencies?: string[];
}

export interface PluginContext {
  executeClientTool: (toolName: string, args: any, clientId?: string) => Promise<any>;
  getClients: () => { id: string; url: string; connectedAt: Date; type: string }[];
  log: (...args: any[]) => void;
}

export interface PluginInitContext {
  log: (...args: any[]) => void;
  config: WebAppMCPConfig;
}

export interface ClientInfo {
  id: string;
  ws: any;
  url: string;
  connectedAt: Date;
}

export function webappMCP(config: WebAppMCPConfig = {}) {
  const {
    wsPort = 4835,
    wsHost = '0.0.0.0',  // Bind to all interfaces by default
    appPort = parseInt(process.env.PORT || '3000'),  // Express app port
    transport = 'sse',  // Default to sse transport
    socketPath = process.env.MCP_SOCKET_PATH || '/tmp/webapp-mcp.sock',
    authentication = { enabled: false },
    permissions = {
      read: true,
      write: true,
      screenshot: true,
      state: true,
    },
    cors: corsOptions = {
      origin: '*',
      credentials: true,
    },
    mcpEndpointPath = '/mcp/sse',
    debug = false,  // Default to no debug logging
    plugins = [],  // Default to no plugins
    screenshotDir = '.webappmcp/screenshots',  // Default screenshot directory
  } = config;

  // Logger helper that respects debug setting
  const log = (...args: any[]) => {
    if (debug) {
      console.log('[webappmcp]', ...args);
    }
  };

  const logError = (...args: any[]) => {
    // Always log errors regardless of debug setting
    console.error('[webappmcp]', ...args);
  };

  const clients = new Map<string, ClientInfo>();
  let wss: WebSocketServer | null = null;
  let mcpSSEServer: MCPSSEServer | null = null;

  // Store reference to execute tools
  let executeToolFunction: ((toolName: string, args: any, clientId?: string) => Promise<any>) | null = null;

  // Create WebSocket server immediately, not in middleware
  const server = createServer();
  wss = new WebSocketServer({ server });

  let isListening = false;

  wss.on('connection', (ws, request) => {
    const clientId = uuidv4();

    if (authentication.enabled && authentication.token) {
      // Check Authorization header first
      const authHeader = request.headers.authorization;

      // Also check URL parameter as fallback (browsers can't set WebSocket headers)
      const url = new URL(request.url || '', `http://localhost`);
      const tokenParam = url.searchParams.get('token');

      const providedToken = authHeader?.replace('Bearer ', '') || tokenParam;

      if (!providedToken || providedToken !== authentication.token) {
        ws.close(1008, 'Unauthorized');
        return;
      }
    }

    const client: ClientInfo = {
      id: clientId,
      ws,
      url: request.url || '',
      connectedAt: new Date(),
    };

    clients.set(clientId, client);
    log(`WebApp MCP client connected: ${clientId}`);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleClientMessage(client, message, permissions, clients, log);
      } catch (error) {
        logError('Error handling WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      log(`WebApp MCP client disconnected: ${clientId}`);
    });

    ws.on('error', (error) => {
      logError(`WebSocket error for client ${clientId}:`, error);
    });

    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      permissions,
    }));

    // Send plugin extensions to the client
    for (const plugin of plugins) {
      if (plugin.clientExtensions) {
        for (const extension of plugin.clientExtensions) {
          if (extension.timing === 'onConnect' || !extension.timing) {
            log(`Sending client extension from plugin ${plugin.name} to client ${clientId}`);
            ws.send(JSON.stringify({
              type: 'plugin_extension',
              extension: {
                pluginName: plugin.name,
                code: extension.code,
                dependencies: extension.dependencies,
              },
            }));
          }
        }
      }
    }
  });

  // Start the WebSocket server if not already listening
  if (!isListening) {
    server.listen(wsPort, wsHost, async () => {
      isListening = true;
      log(`WebApp MCP WebSocket server listening on ${wsHost}:${wsPort}`);
      log(`=== STARTING MCP TRANSPORT CONFIGURATION ===`);
      log(`Transport type: ${transport}`);

      // Start MCP transport based on configuration
      if (transport === 'stdio') {
        log('Starting integrated stdio MCP server...');
        const mcpServer = new IntegratedMCPServer({
          wsUrl: `ws://${wsHost === '0.0.0.0' ? 'localhost' : wsHost}:${wsPort}`,
          authToken: authentication.token,
        });

        try {
          await mcpServer.start();
          log('Stdio MCP transport started successfully');
        } catch (error) {
          logError('Failed to start stdio MCP server:', error);
          process.exit(1); // Exit on stdio failure since it's the only transport
        }
      } else if (transport === 'sse') {
        log('=== INITIALIZING MCP SSE SERVER ===');
        log(`SSE endpoint will be available at: ${mcpEndpointPath}`);
        log(`WebSocket URL: ws://${wsHost === '0.0.0.0' ? 'localhost' : wsHost}:${wsPort}`);
        log(`Auth token: ${authentication.token}`);

        mcpSSEServer = new MCPSSEServer({
          debug: debug,
          getClients: () => {
            return Array.from(clients.entries()).map(([id, client]) => ({
              id,
              url: client.url,
              connectedAt: client.connectedAt,
              type: client.url === 'mcp-server' ? 'mcp-server' : 'browser',
            }));
          },
          executeTool: executeToolFunction || undefined,
          plugins: plugins,
        });

        try {
          log('Calling mcpSSEServer.initialize()...');
          await mcpSSEServer.initialize();
          log('✅ SSE MCP transport initialized successfully');
          log(`✅ SSE endpoint registered at: ${mcpEndpointPath}`);
          log(`✅ MCPSSEServer instance created: ${mcpSSEServer ? 'Yes' : 'No'}`);
          log('✅ Ready to accept MCP connections');
          
          // Display the MCP URL with configured port
          const displayHost = wsHost === '0.0.0.0' ? 'localhost' : wsHost;
          console.log('\n' + '='.repeat(60));
          console.log('🚀 MCP Server SSE Interface Ready!');
          console.log('='.repeat(60));
          console.log(`📡 Add this URL to your AI tool's MCP configuration:`);
          console.log(`   http://${displayHost}:${appPort}${mcpEndpointPath}`);
          console.log('');
          console.log(`   Note: If your Express app runs on a different port,`);
          console.log(`   update the URL or set appPort in the config.`);
          console.log('='.repeat(60) + '\n');
        } catch (error) {
          logError('❌ Failed to initialize MCP SSE server:', error);
        }
      } else if (transport === 'socket') {
        log('Starting MCP Unix socket server...');
        const mcpSocketServer = new MCPSocketServer({
          socketPath: socketPath,
          wsUrl: `ws://${wsHost === '0.0.0.0' ? 'localhost' : wsHost}:${wsPort}`,
          authToken: authentication.token,
          getClients: () => {
            return Array.from(clients.entries()).map(([id, client]) => ({
              id,
              url: client.url,
              connectedAt: client.connectedAt,
              type: client.url === 'mcp-server' ? 'mcp-server' : 'browser',
            }));
          },
        });

        try {
          await mcpSocketServer.start();
          log('Unix socket MCP transport started successfully');
        } catch (error) {
          logError('Failed to start MCP socket server:', error);
          process.exit(1); // Exit on socket failure since it's the only transport
        }
      } else if (transport === 'none') {
        log('No MCP transport configured');
      }
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        log(`WebSocket port ${wsPort} is already in use, skipping WebSocket server creation`);
        isListening = true; // Prevent further attempts
      } else {
        logError('WebSocket server error:', err);
      }
    });
  }

  // Always set up tool execution for integrated MCP servers
  executeToolFunction = async (toolName: string, args: any, clientId?: string) => {
      let targetClient: ClientInfo | undefined;

      if (clientId) {
        // Use specific client if provided
        targetClient = clients.get(clientId);
        if (!targetClient) {
          throw new Error(`Client ${clientId} not found`);
        }
      } else {
        // Find first browser client (not MCP server)
        targetClient = Array.from(clients.values()).find(
          client => client.url && client.url !== 'mcp-server'
        );
        if (!targetClient) {
          throw new Error('No browser client connected. Please open the webapp in a browser.');
        }
      }

      return new Promise((resolve, reject) => {
        const requestId = uuidv4();
        const timeout = setTimeout(() => {
          reject(new Error('Tool execution timeout'));
        }, 30000);

        const messageHandler = (data: Buffer) => {
          const message = JSON.parse(data.toString());
          if (message.requestId === requestId) {
            clearTimeout(timeout);
            targetClient.ws.off('message', messageHandler);

            if (message.error) {
              reject(new Error(message.error));
            } else {
              // Handle screenshot tools specially - save to file
              if (toolName === 'capture_screenshot' || toolName === 'capture_element_screenshot') {
                const saveScreenshot = async () => {
                  try {
                    const result = message.result;
                    if (result && result.dataUrl) {
                      // Extract base64 data from data URL
                      const matches = result.dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
                      if (matches) {
                        const format = matches[1];
                        const base64Data = matches[2];
                        
                        // Determine screenshot directory
                        const screenshotsPath = path.isAbsolute(screenshotDir) 
                          ? screenshotDir 
                          : path.join(process.cwd(), screenshotDir);
                        
                        // Create screenshots directory
                        await fs.mkdir(screenshotsPath, { recursive: true });
                        
                        // Generate filename with timestamp and random suffix
                        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                        const randomSuffix = Math.random().toString(36).substring(2, 8);
                        const filename = `screenshot-${timestamp}-${randomSuffix}.${format}`;
                        const filepath = path.join(screenshotsPath, filename);
                        
                        // Write file
                        await fs.writeFile(filepath, Buffer.from(base64Data, 'base64'));
                        
                        log(`Screenshot saved to: ${filepath}`);
                        
                        // Return path instead of data URL
                        resolve({
                          ...result,
                          path: filepath,
                          filename: filename,
                          directory: screenshotsPath,
                          dataUrl: undefined // Remove dataUrl from response
                        });
                      } else {
                        resolve(result);
                      }
                    } else {
                      resolve(result);
                    }
                  } catch (error) {
                    log('Error saving screenshot:', error);
                    resolve(message.result); // Fall back to original result
                  }
                };
                saveScreenshot();
              } else {
                resolve(message.result);
              }
            }
          }
        };

        targetClient.ws.on('message', messageHandler);

        targetClient.ws.send(JSON.stringify({
          type: 'execute_tool',
          requestId,
          tool: toolName,
          args,
        }));
      });
    };

  return (req: Request, res: Response, next: NextFunction) => {

    if (req.path === '/__webappmcp/status') {
      return res.json({
        connected: clients.size,
        permissions,
        wsPort,
      });
    }

    // List all connected clients
    if (req.path === '/__webappmcp/clients' && req.method === 'GET') {
      const clientList = Array.from(clients.entries()).map(([id, client]) => ({
        id,
        url: client.url,
        connectedAt: client.connectedAt,
        type: client.url === 'mcp-server' ? 'mcp-server' : 'browser',
      }));
      return res.json({ clients: clientList });
    }

    // MCP SSE endpoint
    if (req.path === mcpEndpointPath) {
      log(`[Middleware] Request to MCP SSE endpoint: ${req.method} ${req.path}`);

      if (!mcpSSEServer) {
        log(`[Middleware] ERROR: MCP SSE server not initialized`);
        return res.status(503).json({ error: 'MCP SSE server not initialized' });
      }

      return mcpSSEServer.handleSSERequest(req, res);
    }

    // HTTP API for MCP tools
    if (req.path.startsWith('/__webappmcp/tools/') && req.method === 'POST') {
      const toolName = req.path.replace('/__webappmcp/tools/', '');
      const { clientId, ...args } = req.body;

      if (!executeToolFunction) {
        return res.status(503).json({ error: 'MCP server not available' });
      }

      if (clients.size === 0) {
        return res.status(503).json({ error: 'No connected clients' });
      }

      executeToolFunction(toolName, args, clientId)
        .then(result => {
          res.json({ success: true, result });
        })
        .catch(error => {
          res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });
      return;
    }

    // List available tools
    if (req.path === '/__webappmcp/tools' && req.method === 'GET') {
      const tools = [
        'dom_query',
        'dom_get_properties',
        'dom_get_text',
        'dom_get_html',
        'interaction_click',
        'interaction_type',
        'interaction_scroll',
        'capture_screenshot',
        'capture_element_screenshot',
        'state_get_variable',
        'state_local_storage',
        'console_get_logs'
      ];
      return res.json({ tools });
    }

    next();
  };
}

async function handleClientMessage(
  client: ClientInfo,
  message: any,
  permissions: any,
  clients: Map<string, ClientInfo>,
  log: (...args: any[]) => void
) {
  const { type, requestId } = message;
  log(`[WebSocket] Received message from client ${client.id}:`, JSON.stringify(message));

  if (type === 'init') {
    client.url = message.url || client.url;
    log(`[WebSocket] Client ${client.id} initialized with URL: ${client.url}`);
    return;
  }

  if (type === 'tool_response') {
    // Tool responses need to be forwarded back to the MCP server that sent the request
    log(`[WebSocket] Tool response from client ${client.id}:`, message);
    // Forward to all MCP servers (they will filter by requestId)
    clients.forEach((otherClient) => {
      if (otherClient.url === 'mcp-server' || otherClient.url === 'mcp-sse-server') {
        log(`[WebSocket] Forwarding tool response to MCP client ${otherClient.id}`);
        otherClient.ws.send(JSON.stringify(message));
      }
    });
    return;
  }

  if (type === 'execute_tool') {
    // Forward execute_tool messages from MCP servers to browser clients
    log(`[WebSocket] Execute tool request from ${client.id}, forwarding to browser clients`);
    let browserClients = 0;
    clients.forEach((otherClient) => {
      if (otherClient.url !== 'mcp-server' && otherClient.url !== 'mcp-sse-server' && otherClient.id !== client.id) {
        log(`[WebSocket] Forwarding execute_tool to browser client ${otherClient.id}`);
        otherClient.ws.send(JSON.stringify(message));
        browserClients++;
      }
    });
    log(`[WebSocket] Forwarded execute_tool to ${browserClients} browser clients`);
    return;
  }

  // For any other message type, just log it
  log(`[WebSocket] Unhandled message type: ${type} from client ${client.id}`);
}

export default webappMCP;
export { IntegratedMCPServer } from './mcp-server.js';