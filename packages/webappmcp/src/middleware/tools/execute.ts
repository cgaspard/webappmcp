import { ToolDefinition } from '../types.js';

export const executeTools: ToolDefinition[] = [
  {
    name: 'webapp_execute_javascript',
    description: 'Execute JavaScript code in the context of the currently connected web application',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute'
        },
        returnValue: {
          type: 'boolean',
          description: 'Whether to return the result of the execution',
          default: false
        },
        async: {
          type: 'boolean', 
          description: 'Whether to execute asynchronously',
          default: false
        }
      },
      required: ['code']
    }
  }
];