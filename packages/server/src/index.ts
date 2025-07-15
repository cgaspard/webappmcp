import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { WebSocketManager } from './websocket-manager.js';
import { registerTools } from './tools/index.js';
import { ClientConnection } from './types.js';

export class WebAppMCPServer {
  private server: Server;
  private wsManager: WebSocketManager;
  private connections: Map<string, ClientConnection> = new Map();

  constructor(config: {
    wsPort: number;
    authToken?: string;
  }) {
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

    this.wsManager = new WebSocketManager({
      port: config.wsPort,
      authToken: config.authToken,
      onConnection: this.handleClientConnection.bind(this),
      onDisconnection: this.handleClientDisconnection.bind(this),
      onMessage: this.handleClientMessage.bind(this),
    });

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
      
      const activeConnection = this.getActiveConnection();
      if (!activeConnection) {
        throw new Error('No active client connection');
      }

      try {
        const result = await this.executeToolOnClient(activeConnection, name, args);
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

  private handleClientConnection(clientId: string, ws: any) {
    this.connections.set(clientId, {
      id: clientId,
      ws,
      url: '',
      isActive: true,
    });
  }

  private handleClientDisconnection(clientId: string) {
    this.connections.delete(clientId);
  }

  private handleClientMessage(clientId: string, message: any) {
    const connection = this.connections.get(clientId);
    if (connection && message.type === 'init') {
      connection.url = message.url || '';
    }
  }

  private getActiveConnection(): ClientConnection | null {
    for (const connection of this.connections.values()) {
      if (connection.isActive) {
        return connection;
      }
    }
    return null;
  }

  private async executeToolOnClient(
    connection: ClientConnection,
    toolName: string,
    args: any
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(7);
      
      const timeout = setTimeout(() => {
        reject(new Error('Tool execution timeout'));
      }, 30000);

      const messageHandler = (data: any) => {
        if (data.requestId === requestId) {
          clearTimeout(timeout);
          connection.ws.off('message', messageHandler);
          
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve({
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data.result, null, 2),
                },
              ],
            });
          }
        }
      };

      connection.ws.on('message', messageHandler);
      
      connection.ws.send(JSON.stringify({
        type: 'execute_tool',
        requestId,
        tool: toolName,
        args,
      }));
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    await this.wsManager.start();
    console.error('WebApp MCP Server started');
  }
}

async function main() {
  const wsPort = parseInt(process.env.WS_PORT || '4835');
  const authToken = process.env.MCP_AUTH_TOKEN;

  const server = new WebAppMCPServer({
    wsPort,
    authToken,
  });

  await server.start();
}

if (require.main === module) {
  main().catch(console.error);
}