import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { registerTools } from './tools/index.js';
import { Request, Response } from 'express';
import { WebAppMCPPlugin, PluginContext } from './index.js';

export interface MCPSSEConfig {
  getClients?: () => Array<{ id: string; url: string; connectedAt: Date; type: string }>;
  executeTool?: (toolName: string, args: any) => Promise<any>;
  debug?: boolean;
  plugins?: WebAppMCPPlugin[];
}

export class MCPSSEServer {
  private sseTransports = new Map<string, SSEServerTransport>();
  private getClients?: () => Array<{ id: string; url: string; connectedAt: Date; type: string }>;
  private executeTool?: (toolName: string, args: any) => Promise<any>;
  private debug: boolean;
  private plugins: WebAppMCPPlugin[];

  constructor(config: MCPSSEConfig) {
    this.getClients = config.getClients;
    this.executeTool = config.executeTool;
    this.debug = config.debug ?? false;
    this.plugins = config.plugins ?? [];
  }

  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[webappmcp]', ...args);
    }
  }

  private logError(...args: any[]): void {
    // Always log errors
    console.error('[webappmcp]', ...args);
  }

  private createServer(): Server {
    const server = new Server(
      {
        name: 'webapp-mcp-sse',
        version: '0.1.0',
        description: 'MCP server connected to a running web application instance. This server provides direct access to the DOM, state, and functionality of the currently connected web app.',
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.log(`ListTools request received`);
      const builtInTools = registerTools();
      
      // Convert plugin tools to MCP format
      const pluginTools = this.plugins.flatMap(plugin => 
        (plugin.tools || []).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema || {
            type: 'object' as const,
            properties: {},
          },
        }))
      );
      
      const allTools = [...builtInTools, ...pluginTools];
      this.log(`Returning ${allTools.length} tools (${builtInTools.length} built-in, ${pluginTools.length} from plugins)`);
      return {
        tools: allTools,
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      this.log(`====== TOOL CALL REQUEST ======`);
      this.log(`Full request:`, JSON.stringify(request, null, 2));
      
      const { name, arguments: args } = request.params;
      
      this.log(`Tool: ${name}`);
      this.log(`Arguments:`, JSON.stringify(args, null, 2));
      
      // Special handling for webapp_list_clients - doesn't need WebSocket connection
      if (name === 'webapp_list_clients') {
        this.log(`Handling webapp_list_clients tool`);
        const clients = this.getClients ? this.getClients() : [];
        const result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(clients, null, 2),
            },
          ],
        };
        this.log(`webapp_list_clients result:`, JSON.stringify(result, null, 2));
        return result;
      }
      
      // Check if this is a plugin tool
      for (const plugin of this.plugins) {
        const pluginTool = plugin.tools?.find(t => t.name === name);
        if (pluginTool) {
          this.log(`Executing plugin tool ${name} from plugin ${plugin.name}`);
          try {
            const context: PluginContext = {
              executeClientTool: this.executeTool || (async () => { throw new Error('Client tool execution not available'); }),
              getClients: this.getClients || (() => []),
              log: this.log.bind(this),
            };
            
            const result = await pluginTool.handler(args || {}, context);
            this.log(`Plugin tool ${name} execution completed`);
            return {
              content: [
                {
                  type: 'text',
                  text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                },
              ],
            };
          } catch (error) {
            this.log(`Plugin tool ${name} execution failed:`, error);
            return {
              content: [
                {
                  type: 'text',
                  text: `Error executing plugin tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              ],
            };
          }
        }
      }
      
      if (!this.executeTool) {
        this.log(`No tool execution function provided`);
        return {
          content: [
            {
              type: 'text',
              text: 'Tool execution not available. Please check middleware configuration.',
            },
          ],
        };
      }

      try {
        this.log(`Executing tool ${name} via middleware`);
        
        const result = await this.executeTool(name, args);
        this.log(`Tool ${name} execution completed with result:`, JSON.stringify(result, null, 2));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        this.log(`Tool ${name} execution failed:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    });

    return server;
  }


  async initialize() {
    try {
      this.log('Initializing SSE server...');
      // Don't require WebSocket connection during initialization
      // The connection will be established when needed for tool execution
      this.log('SSE server initialized successfully (WebSocket connection deferred)');
    } catch (error) {
      this.logError('Failed to initialize server:', error);
      throw error;
    }
  }

  async handleSSERequest(req: Request, res: Response) {
    const timestamp = new Date().toISOString();
    this.log(`\n[${timestamp}] ====== INCOMING REQUEST ======`);
    this.log(`[${timestamp}] ${req.method} ${req.url}`);
    this.log(`[${timestamp}] Path: ${req.path}`);
    this.log(`[${timestamp}] Query:`, req.query);
    this.log(`[${timestamp}] Headers:`, JSON.stringify(req.headers, null, 2));
    this.log(`[${timestamp}] User-Agent: ${req.headers['user-agent']}`);
    this.log(`[${timestamp}] Content-Type: ${req.headers['content-type']}`);
    this.log(`[${timestamp}] Accept: ${req.headers['accept']}`);
    
    // Log authorization header specifically
    const authHeader = req.headers.authorization;
    if (authHeader) {
      this.log(`[${timestamp}] Authorization header present: ${authHeader}`);
    } else {
      this.log(`No authorization header found`);
    }
    
    try {
      if (req.method === 'GET') {
        this.log(`Creating new server instance for GET request`);
        
        // Create a new server instance for this connection
        const server = this.createServer();
        
        // Create SSE transport for this request
        this.log(`Creating SSE transport for endpoint /mcp/sse`);
        const sseTransport = new SSEServerTransport('/mcp/sse', res);
        
        // Log what the SSE transport is sending
        this.log(`SSE Transport created with sessionId: ${sseTransport.sessionId}`);
        
        // Override the send method to log messages
        const originalSend = sseTransport.send.bind(sseTransport);
        sseTransport.send = async (message: any) => {
          this.log(`Sending SSE message:`, JSON.stringify(message));
          return originalSend(message);
        };
        
        // Connect the server to the SSE transport (this automatically calls start())
        this.log(`Connecting server to SSE transport`);
        try {
          // Add timeout to prevent hanging
          const connectPromise = server.connect(sseTransport);
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Server connection timeout')), 10000);
          });
          
          await Promise.race([connectPromise, timeoutPromise]);
          this.log(`Successfully connected server to transport`);
        } catch (connectError) {
          this.logError(`ERROR connecting server to transport:`, connectError);
          throw connectError;
        }
        
        // Store the transport with its session ID
        this.sseTransports.set(sseTransport.sessionId, sseTransport);
        
        this.log(`Server connected to client: ${sseTransport.sessionId}`);
        this.log(`Active SSE transports: ${this.sseTransports.size}`);
        this.log(`SSE endpoint should be: /mcp/sse?sessionId=${sseTransport.sessionId}`);
        
        // Handle connection close
        req.on('close', () => {
          this.sseTransports.delete(sseTransport.sessionId);
          this.log(`Client disconnected: ${sseTransport.sessionId}`);
          this.log(`Active SSE transports: ${this.sseTransports.size}`);
        });
        
      } else if (req.method === 'POST') {
        // Extract session ID from URL params
        const sessionId = req.query.sessionId as string;
        this.log(`POST request for session: ${sessionId}`);
        
        if (!sessionId) {
          this.log(`No session ID provided in POST request`);
          return res.status(400).json({ error: 'Session ID required for POST requests' });
        }
        
        const sseTransport = this.sseTransports.get(sessionId);
        if (!sseTransport) {
          this.log(`Session not found: ${sessionId}`);
          this.log(`Available sessions: ${Array.from(this.sseTransports.keys()).join(', ')}`);
          return res.status(404).json({ error: 'SSE session not found' });
        }
        
        this.log(`Handling POST message for session: ${sessionId}`);
        
        // Add logging to see what's being posted
        const originalWrite = res.write;
        const originalEnd = res.end;
        const self = this;
        
        res.write = function(...args: any[]) {
          self.log(`Response write:`, args[0]);
          return originalWrite.apply(res, args as any);
        };
        
        res.end = function(...args: any[]) {
          self.log(`Response end:`, args[0]);
          return originalEnd.apply(res, args as any);
        };
        
        // Handle incoming POST messages (don't consume the body here - let SSE transport handle it)
        await sseTransport.handlePostMessage(req, res);
      }
      
    } catch (error) {
      this.logError(`Failed to handle SSE request:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to establish SSE connection' });
      }
    }
  }

}