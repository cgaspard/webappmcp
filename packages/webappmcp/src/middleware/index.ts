import { Express, Request, Response, NextFunction } from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { IntegratedMCPServer } from './mcp-server.js';
import { MCPSSEServer } from './mcp-sse-server.js';
import { MCPSocketServer } from './mcp-socket-server.js';
import { interceptAllLoggers, interceptProcessStreams } from './logger-interceptors.js';
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
    serverExec?: boolean;  // Allow server-side JS execution (defaults to false in production)
  };
  cors?: cors.CorsOptions;
  mcpEndpointPath?: string;
  transport?: 'sse' | 'stdio' | 'socket' | 'none';  // MCP transport mode (defaults to 'sse')
  socketPath?: string;  // Unix socket path (only used when transport is 'socket')
  debug?: boolean;  // Enable debug logging (defaults to false)
  plugins?: WebAppMCPPlugin[];  // Custom application plugins
  screenshotDir?: string;  // Directory to save screenshots (defaults to .webappmcp/screenshots)
  captureServerLogs?: boolean;  // Enable server console log capture (defaults to true)
  serverLogLimit?: number;  // Maximum number of server logs to keep (defaults to 1000)
  serverTools?: boolean;  // Enable server-side tools (defaults to false in production)
  winstonLogger?: any;  // Optional Winston logger instance to capture logs from (recommended approach)
  logCapture?: {  // Granular log capture configuration
    console?: boolean;  // Capture console.log/warn/error/info (defaults to true)
    streams?: boolean;  // Capture stdout/stderr streams (defaults to true)
    winston?: boolean;  // Capture Winston logs via transport (defaults to true)
    bunyan?: boolean;  // Capture Bunyan logs (defaults to true)
    pino?: boolean;  // Capture Pino logs (defaults to true)
    debug?: boolean;  // Capture debug library logs (defaults to true)
    log4js?: boolean;  // Capture log4js logs (defaults to true)
  };
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

export interface ServerLogEntry {
  level: string;
  timestamp: string;
  args: string[];
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
      serverExec: process.env.NODE_ENV !== 'production',  // Disabled in production by default
    },
    cors: corsOptions = {
      origin: '*',
      credentials: true,
    },
    mcpEndpointPath = '/mcp/sse',
    debug = false,  // Default to no debug logging
    plugins = [],  // Default to no plugins
    screenshotDir = '.webappmcp/screenshots',  // Default screenshot directory
    captureServerLogs = true,  // Default to capturing server logs
    serverLogLimit = 1000,  // Default limit for server logs
    serverTools = process.env.NODE_ENV !== 'production',  // Disabled in production by default
    winstonLogger = null,  // Optional Winston logger instance
    logCapture = {
      console: true,  // Default to capturing console logs
      streams: true,  // Default to capturing streams
      winston: true,  // Default to capturing Winston
      bunyan: true,  // Default to capturing Bunyan
      pino: true,  // Default to capturing Pino
      debug: true,  // Default to capturing debug
      log4js: true,  // Default to capturing log4js
    },
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

  // Server console log storage
  const serverLogs: ServerLogEntry[] = [];

  // Store reference for late Winston attachment
  let winstonAttached = false;
  
  // Setup server console interception if enabled
  if (captureServerLogs) {
    // If Winston logger is provided directly, attach to it (recommended approach)
    if (winstonLogger && logCapture.winston) {
      try {
        const { createWinstonTransport } = require('./winston-transport.js');
        const transport = createWinstonTransport(serverLogs, serverLogLimit);
        if (transport) {
          winstonLogger.add(transport);
          log('Attached Winston transport to provided logger');
        }
      } catch (error) {
        logError('Failed to attach Winston transport:', error);
      }
    }

    // First, try to intercept known logging libraries based on config
    const interceptedLoggers = interceptAllLoggers(serverLogs, serverLogLimit, logCapture);
    if (interceptedLoggers.length > 0) {
      log(`Intercepted logging libraries: ${interceptedLoggers.join(', ')}`);
    }
    
    // Conditionally intercept console methods
    if (logCapture.console) {
      const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
      };
      
      const interceptor = (level: string, originalMethod: Function) => {
        return (...args: any[]) => {
          // Don't capture our own webappmcp logs to avoid infinite loops
          const isOwnLog = args.length > 0 && args[0] === '[webappmcp]';
          
          if (!isOwnLog) {
            serverLogs.push({
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
            
            // Maintain circular buffer
            if (serverLogs.length > serverLogLimit) {
              serverLogs.shift();
            }
          }
          
          // Call original method
          originalMethod.apply(console, args);
        };
      };
      
      console.log = interceptor('log', originalConsole.log);
      console.info = interceptor('info', originalConsole.info);
      console.warn = interceptor('warn', originalConsole.warn);
      console.error = interceptor('error', originalConsole.error);
    }
    
    // Conditionally intercept process.stdout/stderr
    if (logCapture.streams) {
      interceptProcessStreams(serverLogs, serverLogLimit);
    }
    
    // Build status message
    const captureTypes = [];
    if (interceptedLoggers.length > 0) captureTypes.push(`libraries (${interceptedLoggers.join(', ')})`);
    if (logCapture.console) captureTypes.push('console');
    if (logCapture.streams) captureTypes.push('streams');
    
    log(`Server log capture enabled with: ${captureTypes.join(', ')}`);
  }

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
          getServerLogs: captureServerLogs ? (level?: string, limit?: number, regex?: string) => {
            let logs = serverLogs;
            if (level && level !== 'all') {
              logs = logs.filter((log) => log.level === level);
            }
            
            // Apply regex filtering if provided
            if (regex) {
              try {
                const pattern = new RegExp(regex);
                logs = logs.filter((log) => {
                  // Concatenate all log arguments into a single string for matching
                  const logMessage = log.args.join(' ');
                  return pattern.test(logMessage);
                });
              } catch (e) {
                // Return empty array on invalid regex
                return [];
              }
            }
            
            return logs.slice(-(limit || 100));
          } : undefined,
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
      // Handle server-side tools first (no client connection needed)
      if (['webapp_console_get_server_logs', 'webapp_server_execute_js', 'webapp_server_get_system_info', 'webapp_server_get_env'].includes(toolName)) {
        return new Promise((resolve, reject) => {
          // These tools are handled directly in the server-side logic below
          const timeout = setTimeout(() => {
            reject(new Error('Tool execution timeout'));
          }, 30000);

          // Handle server-side tools that don't require client connection
          if (toolName === 'webapp_console_get_server_logs') {
            clearTimeout(timeout);
            
            const { level = 'all', limit = 100, regex } = args;
            let logs = serverLogs;
            
            if (level !== 'all') {
              logs = logs.filter((log) => log.level === level);
            }
            
            // Apply regex filtering if provided
            if (regex) {
              try {
                const pattern = new RegExp(regex);
                logs = logs.filter((log) => {
                  // Concatenate all log arguments into a single string for matching
                  const logMessage = log.args.join(' ');
                  return pattern.test(logMessage);
                });
              } catch (e) {
                reject(new Error(`Invalid regex pattern: ${regex}`));
                return;
              }
            }
            
            resolve({ logs: logs.slice(-limit) });
            return;
          }
          
          // Handle server_execute_js tool
          if (toolName === 'webapp_server_execute_js') {
            clearTimeout(timeout);
            
            if (!serverTools || !permissions.serverExec) {
              reject(new Error('Server-side JavaScript execution is disabled. Enable serverTools and permissions.serverExec in config.'));
              return;
            }
            
            const { code, timeout: execTimeout = 5000 } = args;
            
            try {
              // Create a sandboxed context with limited globals
              const vm = require('vm');
              const sandbox = {
                console,
                process: {
                  version: process.version,
                  platform: process.platform,
                  arch: process.arch,
                  uptime: process.uptime,
                  memoryUsage: process.memoryUsage,
                  cpuUsage: process.cpuUsage,
                },
                require: (module: string) => {
                  // Only allow specific safe modules
                  const allowedModules = ['os', 'path', 'url', 'querystring', 'util'];
                  if (allowedModules.includes(module)) {
                    return require(module);
                  }
                  throw new Error(`Module '${module}' is not allowed`);
                },
                __dirname: process.cwd(),
                Date,
                Math,
                JSON,
                parseInt,
                parseFloat,
                Buffer,
              };
              
              const script = new vm.Script(code);
              const result = script.runInNewContext(sandbox, {
                timeout: execTimeout,
                displayErrors: true,
              });
              
              resolve({ result: result !== undefined ? result : 'Code executed successfully', executionTime: Date.now() });
            } catch (error) {
              reject(new Error(`Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
            return;
          }
          
          // Handle server_get_system_info tool
          if (toolName === 'webapp_server_get_system_info') {
            clearTimeout(timeout);
            
            if (!serverTools) {
              reject(new Error('Server tools are disabled. Enable serverTools in config.'));
              return;
            }
            
            const memUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            resolve({
              process: {
                pid: process.pid,
                version: process.version,
                platform: process.platform,
                arch: process.arch,
                uptime: process.uptime(),
                cwd: process.cwd(),
              },
              memory: {
                rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
                heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
              },
              cpu: {
                user: `${(cpuUsage.user / 1000000).toFixed(2)}s`,
                system: `${(cpuUsage.system / 1000000).toFixed(2)}s`,
              },
              os: {
                hostname: os.hostname(),
                type: os.type(),
                release: os.release(),
                totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                loadAverage: os.loadavg(),
                cpus: os.cpus().length,
              },
            });
            return;
          }
          
          // Handle server_get_env tool
          if (toolName === 'webapp_server_get_env') {
            clearTimeout(timeout);
            
            if (!serverTools) {
              reject(new Error('Server tools are disabled. Enable serverTools in config.'));
              return;
            }
            
            const { filter = [], showAll = false } = args;
            
            // Sensitive patterns to mask
            const sensitivePatterns = [
              /key/i, /secret/i, /password/i, /token/i, /auth/i,
              /credential/i, /private/i, /api/i
            ];
            
            const maskValue = (key: string, value: string): string => {
              if (sensitivePatterns.some(pattern => pattern.test(key))) {
                return value.substring(0, 3) + '*'.repeat(Math.max(0, value.length - 3));
              }
              return value;
            };
            
            let envVars: Record<string, string> = {};
            
            if (filter.length > 0) {
              // Return only requested variables
              filter.forEach((key: string) => {
                if (process.env[key] !== undefined) {
                  envVars[key] = maskValue(key, process.env[key]!);
                }
              });
            } else if (showAll) {
              // Return all non-sensitive variables
              Object.entries(process.env).forEach(([key, value]) => {
                if (value !== undefined) {
                  envVars[key] = maskValue(key, value);
                }
              });
            } else {
              // Return a safe subset
              const safeKeys = ['NODE_ENV', 'PORT', 'HOST', 'NODE_VERSION', 'npm_package_name', 'npm_package_version'];
              safeKeys.forEach(key => {
                if (process.env[key] !== undefined) {
                  envVars[key] = process.env[key]!;
                }
              });
            }
            
            resolve({ env: envVars });
            return;
          }
        });
      }

      // For client-side tools, proceed with browser client connection logic
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
              if (toolName === 'webapp_capture_screenshot' || toolName === 'webapp_capture_element_screenshot') {
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
              } else if (toolName === 'webapp_console_save_to_file') {
                // Handle console log save to file
                const saveConsoleLogs = async () => {
                  try {
                    const result = message.result;
                    if (result && result.logs) {
                      // Determine logs directory
                      const logsPath = path.isAbsolute('.webappmcp/logs') 
                        ? '.webappmcp/logs' 
                        : path.join(process.cwd(), '.webappmcp/logs');
                      
                      // Create logs directory
                      await fs.mkdir(logsPath, { recursive: true });
                      
                      // Generate filename with timestamp and random suffix
                      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                      const randomSuffix = Math.random().toString(36).substring(2, 8);
                      const format = result.format || 'json';
                      const extension = format === 'json' ? 'json' : 'txt';
                      const filename = `console-logs-${timestamp}-${randomSuffix}.${extension}`;
                      const filepath = path.join(logsPath, filename);
                      
                      // Format and write file
                      let fileContent: string;
                      if (format === 'json') {
                        fileContent = JSON.stringify(result.logs, null, 2);
                      } else {
                        // Text format
                        fileContent = result.logs.map((log: any) => {
                          const timestamp = log.timestamp || new Date().toISOString();
                          const level = (log.level || 'log').toUpperCase();
                          const message = log.args ? log.args.join(' ') : '';
                          return `[${timestamp}] [${level}] ${message}`;
                        }).join('\n');
                      }
                      
                      await fs.writeFile(filepath, fileContent, 'utf8');
                      
                      log(`Console logs saved to: ${filepath}`);
                      
                      // Return path and metadata
                      resolve({
                        path: filepath,
                        filename: filename,
                        directory: logsPath,
                        logCount: result.logs.length,
                        format: format
                      });
                    } else {
                      resolve(result);
                    }
                  } catch (error) {
                    log('Error saving console logs:', error);
                    resolve(message.result); // Fall back to original result
                  }
                };
                saveConsoleLogs();
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

  // Function to attach Winston logger after initialization
  const attachWinston = (logger: any) => {
    if (!logger) {
      logError('attachWinston: No logger provided');
      return false;
    }

    if (winstonAttached) {
      log('Winston logger already attached, skipping');
      return false;
    }

    try {
      const { createWinstonTransport } = require('./winston-transport.js');
      const transport = createWinstonTransport(serverLogs, serverLogLimit);
      if (transport) {
        logger.add(transport);
        winstonAttached = true;
        log('Winston logger attached successfully');
        return true;
      } else {
        logError('Failed to create Winston transport');
        return false;
      }
    } catch (error) {
      logError('Error attaching Winston logger:', error);
      return false;
    }
  };

  // Create middleware function
  const middleware = (req: Request, res: Response, next: NextFunction) => {

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
      const body = req.body || {};
      const { clientId, ...args } = body;

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

    // Get server logs endpoint
    if (req.path === '/__webappmcp/server-logs' && req.method === 'GET') {
      const { level = 'all', limit = 100 } = req.query;
      let logs = serverLogs;
      
      if (level !== 'all') {
        logs = logs.filter((log) => log.level === level);
      }
      
      return res.json({ logs: logs.slice(-Number(limit)) });
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
        'console_get_logs',
        'console_get_server_logs',
        'server_execute_js',
        'server_get_system_info',
        'server_get_env'
      ];
      return res.json({ tools });
    }

    next();
  };

  // Attach the Winston attachment function to the middleware
  (middleware as any).attachWinston = attachWinston;

  return middleware;
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

// Type definition for the middleware with attachWinston method
export interface WebAppMCPMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
  attachWinston: (logger: any) => boolean;
}