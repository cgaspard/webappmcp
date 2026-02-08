import { ToolDefinition } from '../types.js';

export const diagnosticTools: ToolDefinition[] = [
  {
    name: 'webapp_dom_manipulate',
    description: 'Manipulate DOM elements for diagnostic purposes',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: 'The manipulation action to perform (setAttribute, removeAttribute, setProperty, addClass, removeClass, setInnerHTML, setTextContent, setStyle, remove)'
        },
        selector: {
          type: 'string',
          description: 'CSS selector for the target element'
        },
        value: {
          type: 'string',
          description: 'Value to set (for actions that require a value)'
        },
        attribute: {
          type: 'string',
          description: 'Attribute name (for setAttribute/removeAttribute actions)'
        },
        property: {
          type: 'string',
          description: 'Property or style property name'
        }
      },
      required: ['action', 'selector']
    }
  },
  {
    name: 'webapp_javascript_inject',
    description: 'Execute JavaScript code in the browser for diagnostic purposes',
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'JavaScript code to execute'
        },
        returnValue: {
          type: 'boolean',
          description: 'Whether to return the result of the code execution'
        }
      },
      required: ['code']
    }
  }
];