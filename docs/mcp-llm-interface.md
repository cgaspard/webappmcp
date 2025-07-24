# WebApp MCP Server - LLM Interface Documentation

## Overview

The WebApp MCP Server provides a Model Context Protocol (MCP) interface that allows Large Language Models (LLMs) to interact with **live, running web applications**. When an LLM connects to this MCP server, it gains direct access to manipulate and inspect a specific web application instance that is currently active in a user's browser.

## Key Concept: Live Application Instance

The MCP server **does not** provide generic web automation capabilities. Instead, it represents a **specific, running instance** of a web application that:

1. Is currently loaded in a browser
2. Has an active WebSocket connection to the MCP server
3. Contains real-time state, DOM elements, and user data
4. Can be interacted with as if a human user were controlling it

## What the LLM Sees

### Server Metadata
```json
{
  "name": "webapp-mcp-sse",
  "version": "0.1.0",
  "description": "MCP server connected to a running web application instance. This server provides direct access to the DOM, state, and functionality of the currently connected web app."
}
```

### Available Tools

The LLM has access to the following tool categories, each operating on the **live application**:

#### 1. DOM Inspection Tools
- **dom_query**: Query DOM elements in the currently connected web application using CSS selectors
- **dom_get_properties**: Get real-time properties and attributes of DOM elements
- **dom_get_text**: Get the current text content of DOM elements
- **dom_get_html**: Get the current HTML content of DOM elements

#### 2. User Interaction Tools
- **interaction_click**: Click on DOM elements in the live web application
- **interaction_type**: Type text into input fields in the running application
- **interaction_scroll**: Scroll the page or elements in the connected application
- **interaction_hover**: Hover over elements to trigger hover effects

#### 3. Application State Tools
- **state_get_variable**: Get current values of JavaScript variables from the live application
- **state_local_storage**: Read/write to the localStorage of the connected application
- **console_get_logs**: Retrieve real-time console logs from the running application
- **webapp_list_clients**: List all browser clients currently connected to this application

#### 4. Visual Capture Tools
- **capture_screenshot**: Take a screenshot of the currently displayed page
- **capture_element_screenshot**: Take a screenshot of specific elements

#### 5. Code Execution
- **execute_javascript**: Execute JavaScript code in the context of the connected application

### Framework-Specific Tools (via Plugins)

When framework plugins are loaded, additional tools become available:

#### React Plugin Tools
- **react_get_current_route**: Get the current route from React Router or Next.js
- **react_navigate**: Navigate to different routes in the React application
- **react_get_component_tree**: Inspect the React component hierarchy
- **react_get_state**: Access exposed component state

#### Vue Plugin Tools
- **vue_get_current_route**: Get the current route from Vue Router
- **vue_navigate**: Navigate to different routes in the Vue application
- **vue_list_routes**: List all available routes
- **vue_get_component_tree**: Inspect the Vue component hierarchy

## How LLMs Should Use These Tools

### 1. Understanding Context
The LLM should understand that:
- It's interacting with a **specific user's application instance**
- Changes made are **immediately visible** to the user
- The application has **real user data and state**
- Actions are **not simulations** but actual interactions

### 2. Tool Usage Patterns

#### Inspection Before Action
```
1. Use dom_query to find elements
2. Use dom_get_properties to verify element state
3. Then use interaction_click or interaction_type
```

#### State Verification
```
1. Use console_get_logs to check for errors
2. Use state_get_variable to verify application state
3. Use capture_screenshot to visually confirm changes
```

### 3. Multi-Client Awareness
- Use **webapp_list_clients** to see all connected browsers
- Specify **clientId** in capture tools to target specific instances
- Understand that actions affect the specified client's view

## Security and Permissions

The MCP server enforces:
- **Authentication**: Clients must provide valid auth tokens
- **Tool Whitelisting**: Clients can restrict which tools are available
- **Read/Write Permissions**: Operations can be limited to read-only
- **Rate Limiting**: Prevents abuse of tool execution

## Example LLM Interactions

### Example 1: Form Filling
```
LLM: "I'll help you fill out the contact form. Let me first check what fields are available."
1. Uses dom_query with selector "form input, form textarea"
2. Uses interaction_type to fill each field
3. Uses interaction_click to submit the form
4. Uses console_get_logs to verify no errors occurred
```

### Example 2: Navigation Testing
```
LLM: "I'll test the navigation menu for you."
1. Uses capture_screenshot to see current state
2. Uses dom_query to find navigation links
3. Uses interaction_click on each link
4. Uses react_get_current_route to verify navigation
5. Uses capture_screenshot after each navigation
```

### Example 3: Debugging
```
LLM: "Let me help debug why the button isn't working."
1. Uses dom_query to find the button
2. Uses dom_get_properties to check if it's disabled
3. Uses console_get_logs to check for JavaScript errors
4. Uses execute_javascript to add event listeners for debugging
5. Uses interaction_click to trigger the button
```

## Best Practices for LLMs

1. **Always verify before acting**: Check element existence before interacting
2. **Use appropriate tools**: Don't use execute_javascript when specific tools exist
3. **Provide feedback**: Describe what you're doing and what you observe
4. **Handle errors gracefully**: Check for tool execution failures
5. **Respect user data**: Remember this is a real application with real data
6. **Batch related operations**: Group related queries for efficiency

## Connection Flow

1. User's web application loads the WebApp MCP client library
2. Client establishes WebSocket connection to the MCP server
3. MCP server registers the client and exposes tools via MCP protocol
4. LLM connects to MCP server and can now interact with the live application
5. All tool executions are routed through the WebSocket to the browser client
6. Results are returned in real-time to the LLM

This architecture ensures that the LLM always operates on the **current, live state** of the application, making it ideal for testing, automation, assistance, and debugging tasks.