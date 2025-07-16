import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';

export interface WebSocketManagerConfig {
  port: number;
  authToken?: string;
  onConnection: (clientId: string, ws: any) => void;
  onDisconnection: (clientId: string) => void;
  onMessage: (clientId: string, message: any) => void;
}

export class WebSocketManager {
  private wss: WebSocketServer;
  private server: any;
  private config: WebSocketManagerConfig;

  constructor(config: WebSocketManagerConfig) {
    this.config = config;
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      
      if (this.config.authToken) {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${this.config.authToken}`) {
          ws.close(1008, 'Unauthorized');
          return;
        }
      }

      console.error(`Client connected: ${clientId}`);
      this.config.onConnection(clientId, ws);

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.config.onMessage(clientId, message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.error(`Client disconnected: ${clientId}`);
        this.config.onDisconnection(clientId);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
      });

      ws.send(JSON.stringify({
        type: 'connected',
        clientId,
      }));
    });
  }

  async start() {
    return new Promise<void>((resolve) => {
      this.server.listen(this.config.port, () => {
        console.error(`WebSocket server listening on port ${this.config.port}`);
        resolve();
      });
    });
  }

  async stop() {
    return new Promise<void>((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          resolve();
        });
      });
    });
  }
}