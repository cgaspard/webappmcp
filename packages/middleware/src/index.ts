import { Express, Request, Response, NextFunction } from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { IntegratedMCPServer } from './mcp-server.js';

export interface WebAppMCPConfig {
  wsPort?: number;
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
  startMCPServer?: boolean;
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
    startMCPServer = false,
  } = config;

  const clients = new Map<string, ClientInfo>();
  let wss: WebSocketServer | null = null;

  // Create WebSocket server immediately, not in middleware
  const server = createServer();
  wss = new WebSocketServer({ server });
  
  let isListening = false;

  wss.on('connection', (ws, request) => {
        const clientId = uuidv4();

        if (authentication.enabled && authentication.token) {
          const authHeader = request.headers.authorization;
          if (!authHeader || authHeader !== `Bearer ${authentication.token}`) {
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
        console.log(`WebApp MCP client connected: ${clientId}`);

        ws.on('message', async (data) => {
          try {
            const message = JSON.parse(data.toString());
            await handleClientMessage(client, message, permissions);
          } catch (error) {
            console.error('Error handling WebSocket message:', error);
            ws.send(JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
            }));
          }
        });

        ws.on('close', () => {
          clients.delete(clientId);
          console.log(`WebApp MCP client disconnected: ${clientId}`);
        });

        ws.on('error', (error) => {
          console.error(`WebSocket error for client ${clientId}:`, error);
        });

    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      permissions,
    }));
  });

  // Start the WebSocket server if not already listening
  if (!isListening) {
    server.listen(wsPort, async () => {
      isListening = true;
      console.log(`WebApp MCP WebSocket server listening on port ${wsPort}`);
      
      // Start MCP server if configured
      if (startMCPServer) {
        console.log('Starting integrated MCP server...');
        const mcpServer = new IntegratedMCPServer({
          wsUrl: `ws://localhost:${wsPort}`,
          authToken: authentication.token,
        });
        
        try {
          await mcpServer.start();
        } catch (error) {
          console.error('Failed to start MCP server:', error);
        }
      }
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`WebSocket port ${wsPort} is already in use, skipping WebSocket server creation`);
        isListening = true; // Prevent further attempts
      } else {
        console.error('WebSocket server error:', err);
      }
    });
  }

  return (req: Request, res: Response, next: NextFunction) => {

    if (req.path === '/__webappmcp/status') {
      return res.json({
        connected: clients.size,
        permissions,
        wsPort,
      });
    }

    next();
  };
}

async function handleClientMessage(
  client: ClientInfo,
  message: any,
  permissions: any
) {
  const { type, requestId } = message;

  if (type === 'init') {
    client.url = message.url || client.url;
    return;
  }

  if (type === 'tool_response') {
    // Tool responses are handled by the MCP server
    return;
  }

  // For any other message type, just log it
  console.log(`Received message type: ${type} from client ${client.id}`);
}

export default webappMCP;