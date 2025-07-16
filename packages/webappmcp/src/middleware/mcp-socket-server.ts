import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { WebSocket } from 'ws';
import { registerTools } from './tools/index.js';
import * as net from 'net';
import * as fs from 'fs';
import * as readline from 'readline';

export interface MCPSocketConfig {
  socketPath: string;
  wsUrl: string;
  authToken?: string;
  getClients?: () => Array<{ id: string; url: string; connectedAt: Date; type: string }>;
}

export class MCPSocketServer {
  private server: Server;
  private socketServer: net.Server | null = null;
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private authToken?: string;
  private socketPath: string;
  private isConnected = false;
  private getClients?: () => Array<{ id: string; url: string; connectedAt: Date; type: string }>;

  constructor(config: MCPSocketConfig) {
    this.socketPath = config.socketPath;
    this.wsUrl = config.wsUrl;
    this.authToken = config.authToken;
    this.getClients = config.getClients;
    
    this.server = new Server(
      {
        name: 'webapp-mcp-socket',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      console.log(`[MCP Socket] ListTools request received`);
      const tools = registerTools();
      console.log(`[MCP Socket] Returning ${tools.length} tools`);
      return {
        tools: tools,
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.log(`[MCP Socket] Tool call: ${request.params.name}`);
      const { name, arguments: args } = request.params;
      
      // Special handling for webapp_list_clients
      if (name === 'webapp_list_clients') {
        const clients = this.getClients ? this.getClients() : [];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(clients, null, 2),
            },
          ],
        };
      }
      
      if (!this.isConnected) {
        throw new Error('Not connected to web application');
      }

      try {
        const result = await this.executeToolOnClient(name, args);
        return result;
      } catch (error) {
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
  }

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.authToken 
        ? `${this.wsUrl}?token=${this.authToken}`
        : this.wsUrl;

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('[MCP Socket] Connected to WebSocket');
        this.isConnected = true;
        this.ws!.send(JSON.stringify({
          type: 'init',
          url: 'mcp-socket-server',
        }));
        resolve();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          console.log(`[MCP Socket] Registered with clientId: ${message.clientId}`);
        }
      });

      this.ws.on('close', () => {
        console.log('[MCP Socket] Disconnected from WebSocket');
        this.isConnected = false;
      });

      this.ws.on('error', (error) => {
        console.error('[MCP Socket] WebSocket error:', error);
        reject(error);
      });
    });
  }

  private async handleToolCall(params: any): Promise<any> {
    const { name, arguments: args } = params;
    
    // Special handling for webapp_list_clients
    if (name === 'webapp_list_clients') {
      const clients = this.getClients ? this.getClients() : [];
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(clients, null, 2),
          },
        ],
      };
    }
    
    if (!this.isConnected) {
      throw new Error('Not connected to web application');
    }

    return await this.executeToolOnClient(name, args);
  }

  private async executeToolOnClient(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(7);
      
      const timeout = setTimeout(() => {
        reject(new Error('Tool execution timeout'));
      }, 30000);

      const messageHandler = (data: Buffer) => {
        const message = JSON.parse(data.toString());
        if (message.requestId === requestId) {
          clearTimeout(timeout);
          this.ws!.off('message', messageHandler);
          
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
      
      this.ws!.send(JSON.stringify({
        type: 'execute_tool',
        requestId,
        tool: toolName,
        args,
      }));
    });
  }

  async start() {
    try {
      // Connect to WebSocket first
      await this.connectWebSocket();
      
      // Remove existing socket if it exists
      if (fs.existsSync(this.socketPath)) {
        fs.unlinkSync(this.socketPath);
      }

      // Create Unix socket server
      this.socketServer = net.createServer((socket) => {
        console.log(`[MCP Socket] Client connected to ${this.socketPath}`);
        
        let buffer = '';
        const rl = readline.createInterface({
          input: socket,
          output: socket,
          terminal: false
        });

        rl.on('line', async (line) => {
          try {
            const message = JSON.parse(line);
            console.log(`[MCP Socket] Received: ${message.method}`);
            
            // Handle different message types
            let response;
            if (message.method === 'initialize') {
              response = {
                jsonrpc: '2.0',
                id: message.id,
                result: {
                  protocolVersion: '2024-11-05',
                  capabilities: { tools: {} },
                  serverInfo: { name: 'webapp-mcp-socket', version: '0.1.0' }
                }
              };
            } else if (message.method === 'tools/list') {
              const tools = registerTools();
              response = {
                jsonrpc: '2.0',
                id: message.id,
                result: { tools }
              };
            } else if (message.method === 'tools/call') {
              try {
                const result = await this.handleToolCall(message.params);
                response = {
                  jsonrpc: '2.0',
                  id: message.id,
                  result
                };
              } catch (error) {
                response = {
                  jsonrpc: '2.0',
                  id: message.id,
                  error: {
                    code: -32603,
                    message: error instanceof Error ? error.message : 'Internal error'
                  }
                };
              }
            } else {
              response = {
                jsonrpc: '2.0',
                id: message.id,
                error: {
                  code: -32601,
                  message: 'Method not found'
                }
              };
            }
            
            socket.write(JSON.stringify(response) + '\n');
          } catch (error) {
            console.error('[MCP Socket] Error processing request:', error);
            const errorResponse = {
              jsonrpc: '2.0',
              id: null,
              error: {
                code: -32700,
                message: 'Parse error'
              }
            };
            socket.write(JSON.stringify(errorResponse) + '\n');
          }
        });
        
        socket.on('end', () => {
          console.log('[MCP Socket] Client disconnected');
          rl.close();
        });
        
        socket.on('error', (err) => {
          console.error('[MCP Socket] Socket error:', err);
          rl.close();
        });
      });

      this.socketServer.listen(this.socketPath, () => {
        console.log(`[MCP Socket] Unix socket server listening on ${this.socketPath}`);
        console.log(`[MCP Socket] Configure Claude CLI with:`);
        console.log(`[MCP Socket] claude mcp add webapp-socket "socat - UNIX-CONNECT:${this.socketPath}"`);
      });

      // Cleanup on exit
      process.on('SIGINT', this.cleanup.bind(this));
      process.on('SIGTERM', this.cleanup.bind(this));
      
    } catch (error) {
      console.error('[MCP Socket] Failed to start:', error);
      throw error;
    }
  }

  private cleanup() {
    console.log('[MCP Socket] Shutting down...');
    if (this.socketServer) {
      this.socketServer.close();
    }
    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }
    if (this.ws) {
      this.ws.close();
    }
  }
}