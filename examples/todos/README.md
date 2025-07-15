# Todos App - WebApp MCP Example

A fully functional todos application demonstrating WebApp MCP Server capabilities.

## Features

- ✅ Add new todos
- ✅ Mark todos as complete/incomplete
- ✅ Delete individual todos
- ✅ Filter by All/Active/Completed
- ✅ Clear all completed todos
- ✅ Real-time statistics
- ✅ MCP integration for AI control

## Running the Example

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open http://localhost:3456 in your browser

## MCP Integration

The app exposes its state through `window.todosApp` for MCP access:

```javascript
window.todosApp = {
  todos: [...],        // Array of all todos
  filter: 'all',       // Current filter (all/active/completed)
  stats: {
    total: 0,          // Total number of todos
    active: 0,         // Number of active todos
    completed: 0       // Number of completed todos
  }
}
```

## Example MCP Commands

Once connected, you can ask your AI assistant to:

### Basic Operations
- "Add a new todo: 'Buy groceries'"
- "Mark the first todo as completed"
- "Delete the todo about groceries"
- "Clear all completed todos"

### Filtering
- "Show only active todos"
- "Show completed todos"
- "Show all todos"

### Queries
- "How many todos are there?"
- "What todos are currently active?"
- "Is there a todo about 'WebApp MCP'?"
- "What's the current filter setting?"

### Bulk Operations
- "Mark all todos as completed"
- "Add 3 new todos about testing"
- "Delete all completed todos"

## API Endpoints

- `GET /api/todos` - Get all todos
- `POST /api/todos` - Create a new todo
- `PUT /api/todos/:id` - Update a todo
- `DELETE /api/todos/:id` - Delete a todo
- `POST /api/todos/clear-completed` - Clear completed todos

## Testing MCP Tools

The following MCP tools work great with this app:

1. **dom_query**
   - Find todo items: `selector: ".todo-item"`
   - Find checkboxes: `selector: ".todo-checkbox"`
   - Find the input: `selector: "#new-todo"`

2. **interaction_click**
   - Toggle todos: `selector: ".todo-checkbox"`
   - Delete todos: `selector: ".todo-delete"`
   - Change filter: `selector: "[data-filter='active']"`

3. **interaction_type**
   - Add new todo: `selector: "#new-todo", text: "New task"`

4. **state_get_variable**
   - Get todos: `path: "window.todosApp.todos"`
   - Get stats: `path: "window.todosApp.stats"`

## Architecture

The app uses:
- Express.js backend with in-memory storage
- Vanilla JavaScript frontend
- RESTful API for todo operations
- WebSocket connection for MCP integration
- Real-time UI updates