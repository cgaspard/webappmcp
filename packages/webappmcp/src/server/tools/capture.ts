import { ToolDefinition } from '../types.js';

export const captureTools: ToolDefinition[] = [
  {
    name: 'capture_screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: {
      type: 'object',
      properties: {
        fullPage: {
          type: 'boolean',
          description: 'Capture the full page height',
          default: true,
        },
        format: {
          type: 'string',
          enum: ['png', 'jpeg'],
          description: 'Image format',
          default: 'png',
        },
      },
    },
  },
  {
    name: 'capture_element_screenshot',
    description: 'Take a screenshot of a specific element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the element to capture',
        },
        format: {
          type: 'string',
          enum: ['png', 'jpeg'],
          description: 'Image format',
          default: 'png',
        },
      },
      required: ['selector'],
    },
  },
];