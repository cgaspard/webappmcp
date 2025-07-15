import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { WebSocket } from 'ws';
import { registerTools } from './tools/index.js';

export interface MCPConfig {
  wsUrl: string;
  authToken?: string;
}

export class IntegratedMCPServer {
  private server: Server;
  private ws: WebSocket | null = null;
  private wsUrl: string;
  private authToken?: string;
  private reconnectTimer: any;
  private isConnected = false;

  constructor(config: MCPConfig) {
    this.wsUrl = config.wsUrl;
    this.authToken = config.authToken;
    
    this.server = new Server(
      {
        name: 'webapp-mcp',
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
      return {
        tools: registerTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
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
      const headers: any = {};
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      this.ws = new WebSocket(this.wsUrl, { headers });

      this.ws.on('open', () => {
        console.error('Connected to WebApp WebSocket');
        this.isConnected = true;
        this.ws!.send(JSON.stringify({
          type: 'init',
          url: 'mcp-server',
        }));
        resolve();
      });

      this.ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          console.error(`MCP Server registered with clientId: ${message.clientId}`);
        }
      });

      this.ws.on('close', () => {
        console.error('Disconnected from WebApp WebSocket');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.connectWebSocket();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, 5000);
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
      
      // Then start MCP server
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error('Integrated MCP Server started');
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  }
}