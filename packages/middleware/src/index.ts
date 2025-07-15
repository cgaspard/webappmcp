import { Express, Request, Response, NextFunction } from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

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
}

export interface ClientInfo {
  id: string;
  ws: any;
  url: string;
  connectedAt: Date;
}

export function webappMCP(config: WebAppMCPConfig = {}) {
  const {
    wsPort = 3101,
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
  } = config;

  const clients = new Map<string, ClientInfo>();
  let wss: WebSocketServer | null = null;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!wss) {
      const server = createServer();
      wss = new WebSocketServer({ server });

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

      server.listen(wsPort, () => {
        console.log(`WebApp MCP WebSocket server listening on port ${wsPort}`);
      });
    }

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
  const { type, requestId, tool, args } = message;

  if (type === 'init') {
    client.url = message.url || client.url;
    return;
  }

  if (type === 'tool_response') {
    return;
  }

  client.ws.send(JSON.stringify({
    type: 'error',
    requestId,
    error: `Unknown message type: ${type}`,
  }));
}

export default webappMCP;