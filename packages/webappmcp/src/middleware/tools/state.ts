import { ToolDefinition } from '../types.js';

export const stateTools: ToolDefinition[] = [
  {
    name: 'state_get_variable',
    description: 'Get the current value of a JavaScript variable from the live web application context',
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
    description: 'Read or write to the localStorage of the currently connected web application',
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
    description: 'Retrieve real-time console logs from the running web application',
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
  {
    name: 'webapp_list_clients',
    description: 'List all browser clients/sessions currently connected to this web application instance',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];