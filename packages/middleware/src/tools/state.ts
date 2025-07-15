import { ToolDefinition } from '../types.js';

export const stateTools: ToolDefinition[] = [
  {
    name: 'state_get_variable',
    description: 'Get the value of a JavaScript variable from the page context',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the variable (e.g., "window.myApp.config")',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'state_local_storage',
    description: 'Read or write to localStorage',
    inputSchema: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['get', 'set', 'remove', 'clear', 'getAll'],
          description: 'Operation to perform',
        },
        key: {
          type: 'string',
          description: 'Storage key (required for get, set, remove)',
        },
        value: {
          type: 'string',
          description: 'Value to set (required for set operation)',
        },
      },
      required: ['operation'],
    },
  },
  {
    name: 'console_get_logs',
    description: 'Retrieve console logs from the page',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['all', 'log', 'info', 'warn', 'error'],
          description: 'Log level to filter by',
          default: 'all',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of logs to return',
          default: 100,
        },
      },
    },
  },
];