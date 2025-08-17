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
        regex: {
          type: 'string',
          description: 'Regular expression pattern to filter log messages (matches against full log message)',
        },
      },
    },
  },
  {
    name: 'console_save_to_file',
    description: 'Save browser console logs to a file in the .webappmcp directory for large log analysis',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['all', 'log', 'info', 'warn', 'error'],
          description: 'Log level to filter by',
          default: 'all',
        },
        format: {
          type: 'string',
          enum: ['json', 'text'],
          description: 'Output format for the log file',
          default: 'json',
        },
        clientId: {
          type: 'string',
          description: 'Client ID to capture logs from (optional, uses first available browser if not specified)',
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
  {
    name: 'console_get_server_logs',
    description: 'Retrieve console logs from the Node.js Express server',
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
    name: 'server_execute_js',
    description: 'Execute JavaScript code on the Node.js server (disabled in production)',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute',
        },
        timeout: {
          type: 'number',
          description: 'Execution timeout in milliseconds',
          default: 5000,
        },
      },
      required: ['code'],
    },
  },
  {
    name: 'server_get_system_info',
    description: 'Get server process and system information',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'server_get_env',
    description: 'Get filtered environment variables (sensitive values masked)',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'List of environment variable names to retrieve',
        },
        showAll: {
          type: 'boolean',
          description: 'Show all non-sensitive environment variables',
          default: false,
        },
      },
    },
  },
];