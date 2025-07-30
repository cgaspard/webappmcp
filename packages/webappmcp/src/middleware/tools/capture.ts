import { ToolDefinition } from '../types.js';

export const captureTools: ToolDefinition[] = [
  {
    name: 'capture_screenshot',
    description: 'Take a screenshot of the connected web app. Can capture either the visible viewport or the entire page including content below the fold.',
    inputSchema: {
      type: 'object',
      properties: {
        fullPage: {
          type: 'boolean',
          description: 'true = capture entire page height (including scrolled content), false = capture only visible viewport',
          default: true,
        },
        format: {
          type: 'string',
          enum: ['png', 'jpeg'],
          description: 'Image format',
          default: 'png',
        },
        clientId: {
          type: 'string',
          description: 'Client ID to capture from (optional, uses first available browser if not specified)',
        },
      },
    },
  },
  {
    name: 'capture_element_screenshot',
    description: 'Take a screenshot of a specific element in the running web application',
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
        clientId: {
          type: 'string',
          description: 'Client ID to capture from (optional, uses first available browser if not specified)',
        },
      },
      required: ['selector'],
    },
  },
];