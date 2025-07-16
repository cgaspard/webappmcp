import { registerTools } from '../../src/middleware/tools/index';
import { 
  domTools,
  interactionTools,
  captureTools,
  stateTools,
  diagnosticTools,
  executeTools
} from '../../src/middleware/tools/index';

describe('MCP Tools Registration', () => {
  it('should register all tool categories', () => {
    const tools = registerTools();

    // Should have tools from all categories
    const toolNames = tools.map(tool => tool.name);

    // DOM tools
    expect(toolNames).toContain('dom_query');
    expect(toolNames).toContain('dom_get_properties');
    expect(toolNames).toContain('dom_get_text');
    expect(toolNames).toContain('dom_get_html');

    // Interaction tools
    expect(toolNames).toContain('interaction_click');
    expect(toolNames).toContain('interaction_type');
    expect(toolNames).toContain('interaction_scroll');
    expect(toolNames).toContain('interaction_hover');

    // Capture tools
    expect(toolNames).toContain('capture_screenshot');
    expect(toolNames).toContain('capture_element_screenshot');

    // State tools
    expect(toolNames).toContain('state_get_variable');
    expect(toolNames).toContain('state_local_storage');
    expect(toolNames).toContain('console_get_logs');

    // Diagnostic tools
    expect(toolNames).toContain('dom_manipulate');
    expect(toolNames).toContain('javascript_inject');
    expect(toolNames).toContain('webapp_list_clients');
    
    // Execute tools
    expect(toolNames).toContain('execute_javascript');
  });

  it('should have proper tool definitions', () => {
    const tools = registerTools();

    tools.forEach(tool => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
      expect(tool.inputSchema).toHaveProperty('type', 'object');
      expect(tool.inputSchema).toHaveProperty('properties');
    });
  });
});

describe('DOM Tools', () => {
  it('should define dom_query tool correctly', () => {
    const tool = domTools.find((t: any) => t.name === 'dom_query');
    
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Query DOM elements');
    expect(tool?.inputSchema.properties).toHaveProperty('selector');
    expect(tool?.inputSchema.properties).toHaveProperty('limit');
    expect(tool?.inputSchema.required).toContain('selector');
  });

  it('should define dom_get_properties tool correctly', () => {
    const tool = domTools.find((t: any) => t.name === 'dom_get_properties');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('selector');
    expect(tool?.inputSchema.properties).toHaveProperty('properties');
    expect(tool?.inputSchema.required).toContain('selector');
  });

  it('should define dom_get_text tool correctly', () => {
    const tool = domTools.find((t: any) => t.name === 'dom_get_text');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('selector');
    expect(tool?.inputSchema.properties).toHaveProperty('includeHidden');
    expect(tool?.inputSchema.properties.includeHidden.default).toBe(false);
  });

  it('should define dom_get_html tool correctly', () => {
    const tool = domTools.find((t: any) => t.name === 'dom_get_html');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('selector');
    expect(tool?.inputSchema.properties).toHaveProperty('outerHTML');
    expect(tool?.inputSchema.properties.outerHTML.default).toBe(false);
  });
});

describe('Interaction Tools', () => {
  it('should define interaction_click tool correctly', () => {
    const tool = interactionTools.find((t: any) => t.name === 'interaction_click');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('selector');
    expect(tool?.inputSchema.properties).toHaveProperty('button');
    expect(tool?.inputSchema.properties.button.enum).toEqual(['left', 'right', 'middle']);
    expect(tool?.inputSchema.properties.button.default).toBe('left');
  });

  it('should define interaction_type tool correctly', () => {
    const tool = interactionTools.find((t: any) => t.name === 'interaction_type');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('selector');
    expect(tool?.inputSchema.properties).toHaveProperty('text');
    expect(tool?.inputSchema.properties).toHaveProperty('clear');
    expect(tool?.inputSchema.required).toContain('selector');
    expect(tool?.inputSchema.required).toContain('text');
  });

  it('should define interaction_scroll tool correctly', () => {
    const tool = interactionTools.find((t: any) => t.name === 'interaction_scroll');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('direction');
    expect(tool?.inputSchema.properties).toHaveProperty('amount');
    expect(tool?.inputSchema.properties).toHaveProperty('selector');
    expect(tool?.inputSchema.properties.direction.enum).toEqual(['up', 'down', 'left', 'right']);
    expect(tool?.inputSchema.required).toContain('direction');
  });

  it('should define interaction_hover tool correctly', () => {
    const tool = interactionTools.find((t: any) => t.name === 'interaction_hover');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('selector');
    expect(tool?.inputSchema.required).toContain('selector');
  });
});

describe('Capture Tools', () => {
  it('should define capture_screenshot tool correctly', () => {
    const tool = captureTools.find((t: any) => t.name === 'capture_screenshot');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('fullPage');
    expect(tool?.inputSchema.properties).toHaveProperty('format');
    expect(tool?.inputSchema.properties).toHaveProperty('clientId');
    expect(tool?.inputSchema.properties.fullPage.default).toBe(true);
    expect(tool?.inputSchema.properties.format.enum).toEqual(['png', 'jpeg']);
  });

  it('should define capture_element_screenshot tool correctly', () => {
    const tool = captureTools.find((t: any) => t.name === 'capture_element_screenshot');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('selector');
    expect(tool?.inputSchema.properties).toHaveProperty('format');
    expect(tool?.inputSchema.properties).toHaveProperty('clientId');
    expect(tool?.inputSchema.required).toContain('selector');
  });
});

describe('State Tools', () => {
  it('should define state_get_variable tool correctly', () => {
    const tool = stateTools.find((t: any) => t.name === 'state_get_variable');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('path');
    expect(tool?.inputSchema.required).toContain('path');
  });

  it('should define state_local_storage tool correctly', () => {
    const tool = stateTools.find((t: any) => t.name === 'state_local_storage');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('operation');
    expect(tool?.inputSchema.properties).toHaveProperty('key');
    expect(tool?.inputSchema.properties).toHaveProperty('value');
    expect(tool?.inputSchema.properties.operation.enum).toEqual(['get', 'set', 'remove', 'clear', 'getAll']);
    expect(tool?.inputSchema.required).toContain('operation');
  });

  it('should define console_get_logs tool correctly', () => {
    const tool = stateTools.find((t: any) => t.name === 'console_get_logs');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('level');
    expect(tool?.inputSchema.properties).toHaveProperty('limit');
    expect(tool?.inputSchema.properties.level.enum).toEqual(['all', 'log', 'info', 'warn', 'error']);
    expect(tool?.inputSchema.properties.level.default).toBe('all');
    expect(tool?.inputSchema.properties.limit.default).toBe(100);
  });
});

describe('Diagnostic Tools', () => {
  it('should define dom_manipulate tool correctly', () => {
    const tool = diagnosticTools.find((t: any) => t.name === 'dom_manipulate');
    
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('diagnostic purposes');
    expect(tool?.inputSchema.properties).toHaveProperty('action');
    expect(tool?.inputSchema.properties).toHaveProperty('selector');
    expect(tool?.inputSchema.properties).toHaveProperty('value');
    expect(tool?.inputSchema.properties).toHaveProperty('attribute');
    expect(tool?.inputSchema.properties).toHaveProperty('property');
    expect(tool?.inputSchema.required).toEqual(['action', 'selector']);
  });

  it('should define javascript_inject tool correctly', () => {
    const tool = diagnosticTools.find((t: any) => t.name === 'javascript_inject');
    
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('diagnostic purposes');
    expect(tool?.inputSchema.properties).toHaveProperty('code');
    expect(tool?.inputSchema.properties).toHaveProperty('returnValue');
    expect(tool?.inputSchema.required).toContain('code');
  });

  it('should define webapp_list_clients tool correctly', () => {
    const tool = diagnosticTools.find((t: any) => t.name === 'webapp_list_clients');
    
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('List all connected');
    expect(tool?.inputSchema.properties).toEqual({});
  });
});

describe('Execute Tools', () => {
  it('should define execute_javascript tool correctly', () => {
    const tool = executeTools.find((t: any) => t.name === 'execute_javascript');
    
    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty('code');
    expect(tool?.inputSchema.properties).toHaveProperty('returnValue');
    expect(tool?.inputSchema.properties).toHaveProperty('async');
    expect(tool?.inputSchema.properties.async.default).toBe(false);
    expect(tool?.inputSchema.properties.returnValue.default).toBe(false);
    expect(tool?.inputSchema.required).toContain('code');
  });
});