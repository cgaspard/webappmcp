// Middleware exports
export { webappMCP } from './middleware/index';
export type { WebAppMCPConfig, ClientInfo } from './middleware/index';

// Client exports  
export { default as WebAppMCPClient } from './client/index';

// Server exports - using WebAppMCPServer to match the actual export
export { WebAppMCPServer } from './server/index';
export { WebSocketManager } from './server/websocket-manager';

// Re-export shared types from both modules
export type { 
  ClientConnection,
  DOMQueryResult,
  ScreenshotResult,
  ToolDefinition
} from './middleware/types';