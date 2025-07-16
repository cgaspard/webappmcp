import { ToolDefinition } from '../types.js';
import { domTools } from './dom.js';
import { interactionTools } from './interaction.js';
import { captureTools } from './capture.js';
import { stateTools } from './state.js';
import { diagnosticTools } from './diagnostic.js';
import { executeTools } from './execute.js';

export function registerTools(): ToolDefinition[] {
  return [
    ...domTools,
    ...interactionTools,
    ...captureTools,
    ...stateTools,
    ...diagnosticTools,
    ...executeTools,
  ];
}