import { ToolDefinition } from '../types.js';
import { domTools } from './dom.js';
import { interactionTools } from './interaction.js';
import { captureTools } from './capture.js';
import { stateTools } from './state.js';

export function registerTools(): ToolDefinition[] {
  return [
    ...domTools,
    ...interactionTools,
    ...captureTools,
    ...stateTools,
  ];
}