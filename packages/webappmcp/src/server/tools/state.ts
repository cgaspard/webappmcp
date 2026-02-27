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
        regex: {
          type: 'string',
          description: 'Regular expression pattern to filter log messages (matches against full log message)',
        },
      },
    },
  },
  {
    name: 'console_get_server_logs',
    description: 'Retrieve console logs from the Node.js Express server. Logs are returned newest first. Use offset to page backwards through older logs (offset=0 returns the most recent). Use startTime/endTime to filter to a specific time window. Response includes totalCount of matching logs for paging.',
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
        regex: {
          type: 'string',
          description: 'Regular expression pattern to filter log messages (matches against full log message)',
        },
        offset: {
          type: 'number',
          description: 'Number of logs to skip from the most recent end (for paging backwards through history)',
          default: 0,
        },
        startTime: {
          type: 'string',
          description: 'ISO 8601 timestamp — only return logs at or after this time',
        },
        endTime: {
          type: 'string',
          description: 'ISO 8601 timestamp — only return logs before or at this time',
        },
      },
    },
  },
];