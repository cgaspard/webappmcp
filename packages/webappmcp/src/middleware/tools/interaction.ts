import { ToolDefinition } from '../types.js';

export const interactionTools: ToolDefinition[] = [
  {
    name: 'interaction_click',
    description: 'Click on a DOM element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the element to click',
        },
        button: {
          type: 'string',
          enum: ['left', 'right', 'middle'],
          description: 'Mouse button to use',
          default: 'left',
        },
      },
      required: ['selector'],
    },
  },
  {
    name: 'interaction_type',
    description: 'Type text into an input field',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the input element',
        },
        text: {
          type: 'string',
          description: 'Text to type',
        },
        clear: {
          type: 'boolean',
          description: 'Clear the field before typing',
          default: false,
        },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'interaction_scroll',
    description: 'Scroll the page or an element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for element to scroll (optional, scrolls page if not provided)',
        },
        direction: {
          type: 'string',
          enum: ['up', 'down', 'left', 'right'],
          description: 'Scroll direction',
        },
        amount: {
          type: 'number',
          description: 'Amount to scroll in pixels',
          default: 100,
        },
      },
      required: ['direction'],
    },
  },
  {
    name: 'interaction_hover',
    description: 'Hover over a DOM element',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'CSS selector for the element to hover over',
        },
      },
      required: ['selector'],
    },
  },
];