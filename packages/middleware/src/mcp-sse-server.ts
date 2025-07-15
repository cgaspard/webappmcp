import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { WebSocket } from 'ws';
import { registerTools } from './tools/index.js';
import { Request, Response } from 'express';

export interface MCPSSEConfig {
  wsUrl: string;
  authToken?: string;
  getClients?: () => Array<{ id: string; url: string; connectedAt: Date; type: string }>;
}

export class MCPSSEServer {
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private authToken?: string;
  private isConnected = false;
  private sseTransports = new Map<string, SSEServerTransport>();
  private getClients?: () => Array<{ id: string; url: string; connectedAt: Date; type: string }>;

  constructor(config: MCPSSEConfig) {
    this.wsUrl = config.wsUrl;
    this.authToken = config.authToken;
    this.getClients = config.getClients;
  }

  private createServer(): Server {
    const server = new Server(
      {
        name: 'webapp-mcp-sse',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log(`[MCP SSE] ListTools request received`);
      const tools = registerTools();
      console.log(`[MCP SSE] Returning ${tools.length} tools`);
      return {
        tools: tools,
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.log(`[MCP SSE] ====== TOOL CALL REQUEST ======`);
      console.log(`[MCP SSE] Full request:`, JSON.stringify(request, null, 2));
      
      const { name, arguments: args } = request.params;
      
      console.log(`[MCP SSE] Tool: ${name}`);
      console.log(`[MCP SSE] Arguments:`, JSON.stringify(args, null, 2));
      
      // Special handling for webapp_list_clients - doesn't need WebSocket connection
      if (name === 'webapp_list_clients') {
        console.log(`[MCP SSE] Handling webapp_list_clients tool`);
        const clients = this.getClients ? this.getClients() : [];
        const result = {
          content: [
            {
              type: 'text',
              text: JSON.stringify(clients, null, 2),
            },
          ],
        };
        console.log(`[MCP SSE] webapp_list_clients result:`, JSON.stringify(result, null, 2));
        return result;
      }
      
      if (!this.isConnected) {
        console.log(`[MCP SSE] Not connected to web application`);
        throw new Error('Not connected to web application');
      }

      try {
        console.log(`[MCP SSE] Executing tool ${name} on client`);
        
        const result = await this.executeToolOnClient(name, args);
        console.log(`[MCP SSE] Tool ${name} execution completed with result:`, JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.log(`[MCP SSE] Tool ${name} execution failed:`, error);
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

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.authToken 
        ? `${this.wsUrl}?token=${this.authToken}`
        : this.wsUrl;

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('MCP SSE Server connected to WebSocket');
        this.isConnected = true;
        this.ws!.send(JSON.stringify({
          type: 'init',
          url: 'mcp-sse-server',
        }));
        resolve();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          console.log(`MCP SSE Server registered with clientId: ${message.clientId}`);
        }
      });

      this.ws.on('close', () => {
        console.log('MCP SSE Server disconnected from WebSocket');
        this.isConnected = false;
      });

      this.ws.on('error', (error) => {
        console.error('MCP SSE Server WebSocket error:', error);
        reject(error);
      });
    });
  }

  private async executeToolOnClient(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(7);
      console.log(`[MCP SSE] Executing tool ${toolName} on client with requestId: ${requestId}`);
      console.log(`[MCP SSE] Tool arguments:`, JSON.stringify(args));
      
      const timeout = setTimeout(() => {
        console.log(`[MCP SSE] Tool execution timeout for requestId: ${requestId}`);
        reject(new Error('Tool execution timeout'));
      }, 30000);

      const messageHandler = (data: Buffer) => {
        const message = JSON.parse(data.toString());
        console.log(`[MCP SSE] Received WebSocket message:`, JSON.stringify(message));
        if (message.requestId === requestId) {
          clearTimeout(timeout);
          this.ws!.off('message', messageHandler);
          console.log(`[MCP SSE] Tool response received for requestId: ${requestId}`);
          
          if (message.error) {
            reject(new Error(message.error));
          } else {
            resolve({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(message.result, null, 2),
                },
              ],
            });
          }
        }
      };

      this.ws!.on('message', messageHandler);
      
      const executeMessage = {
        type: 'execute_tool',
        requestId,
        tool: toolName,
        args,
      };
      console.log(`[MCP SSE] Sending execute_tool message:`, JSON.stringify(executeMessage));
      this.ws!.send(JSON.stringify(executeMessage));
    });
  }

  async initialize() {
    try {
      await this.connectWebSocket();
      console.log('MCP SSE Server initialized');
    } catch (error) {
      console.error('Failed to initialize MCP SSE Server:', error);
      throw error;
    }
  }

  async handleSSERequest(req: Request, res: Response) {
    console.log(`[MCP SSE] Handling ${req.method} request to ${req.path}`);
    
    try {
      if (req.method === 'GET') {
        console.log(`[MCP SSE] Creating new server instance for GET request`);
        
        // Create a new server instance for this connection
        const server = this.createServer();
        
        // Create SSE transport for this request
        console.log(`[MCP SSE] Creating SSE transport for endpoint /mcp/sse`);
        const sseTransport = new SSEServerTransport('/mcp/sse', res);
        
        // Log what the SSE transport is sending
        console.log(`[MCP SSE] SSE Transport created with sessionId: ${sseTransport.sessionId}`);
        
        // Override the send method to log messages
        const originalSend = sseTransport.send.bind(sseTransport);
        sseTransport.send = async (message: any) => {
          console.log(`[MCP SSE] Sending SSE message:`, JSON.stringify(message));
          return originalSend(message);
        };
        
        // Connect the server to the SSE transport (this automatically calls start())
        console.log(`[MCP SSE] Connecting server to SSE transport`);
        await server.connect(sseTransport);
        
        // Store the transport with its session ID
        this.sseTransports.set(sseTransport.sessionId, sseTransport);
        
        console.log(`[MCP SSE] Server connected to client: ${sseTransport.sessionId}`);
        console.log(`[MCP SSE] Active SSE transports: ${this.sseTransports.size}`);
        console.log(`[MCP SSE] SSE endpoint should be: /mcp/sse?sessionId=${sseTransport.sessionId}`);
        
        // Handle connection close
        req.on('close', () => {
          this.sseTransports.delete(sseTransport.sessionId);
          console.log(`[MCP SSE] Client disconnected: ${sseTransport.sessionId}`);
          console.log(`[MCP SSE] Active SSE transports: ${this.sseTransports.size}`);
        });
        
      } else if (req.method === 'POST') {
        // Extract session ID from URL params
        const sessionId = req.query.sessionId as string;
        console.log(`[MCP SSE] POST request for session: ${sessionId}`);
        
        if (!sessionId) {
          console.log(`[MCP SSE] No session ID provided in POST request`);
          return res.status(400).json({ error: 'Session ID required for POST requests' });
        }
        
        const sseTransport = this.sseTransports.get(sessionId);
        if (!sseTransport) {
          console.log(`[MCP SSE] Session not found: ${sessionId}`);
          console.log(`[MCP SSE] Available sessions: ${Array.from(this.sseTransports.keys()).join(', ')}`);
          return res.status(404).json({ error: 'SSE session not found' });
        }
        
        console.log(`[MCP SSE] Handling POST message for session: ${sessionId}`);
        
        // Add logging to see what's being posted
        const originalWrite = res.write;
        const originalEnd = res.end;
        
        res.write = function(...args: any[]) {
          console.log(`[MCP SSE] Response write:`, args[0]);
          return originalWrite.apply(res, args as any);
        };
        
        res.end = function(...args: any[]) {
          console.log(`[MCP SSE] Response end:`, args[0]);
          return originalEnd.apply(res, args as any);
        };
        
        // Handle incoming POST messages (don't consume the body here - let SSE transport handle it)
        await sseTransport.handlePostMessage(req, res);
      }
      
    } catch (error) {
      console.error(`[MCP SSE] Failed to handle SSE request:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to establish SSE connection' });
      }
    }
  }

}