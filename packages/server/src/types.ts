export interface ClientConnection {
  id: string;
  ws: any;
  url: string;
  isActive: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface DOMQueryResult {
  elements: Array<{
    selector: string;
    tagName: string;
    id?: string;
    className?: string;
    text?: string;
    attributes: Record<string, string>;
  }>;
}

export interface ScreenshotResult {
  data: string;
  mimeType: string;
  width: number;
  height: number;
}