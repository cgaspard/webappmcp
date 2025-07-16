import { ToolDefinition } from '../types.js';

export const domTools: ToolDefinition[] = [
  {
    name: 'dom_query',
    description: 'Query DOM elements using CSS selectors',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector to query elements',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of elements to return',
          default: 10,
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'dom_get_properties',
    description: 'Get properties and attributes of a DOM element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the element',
        },
        properties: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'List of properties to retrieve',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'dom_get_text',
    description: 'Get text content of DOM elements',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the elements',
        },
        includeHidden: {
          type: 'boolean',
          description: 'Include text from hidden elements',
          default: false,
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'dom_get_html',
    description: 'Get HTML content of DOM elements',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the element',
        },
        outerHTML: {
          type: 'boolean',
          description: 'Get outerHTML instead of innerHTML',
          default: false,
        },
      },
      required: ['selector'],
    },
  },
];