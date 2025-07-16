import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [filter, setFilter] = useState('all');
  
  // Load todos from localStorage on mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }
  }, []);
  
  // Save todos to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);
  
  const addTodo = (e) => {
    e.preventDefault();
    if (newTodo.trim()) {
      const todo = {
        id: Date.now(),
        text: newTodo.trim(),
        completed: false
      };
      setTodos([...todos, todo]);
      setNewTodo('');
      console.log('Added todo:', todo.text);
    }
  };
  
  const toggleTodo = (id) => {
    const updatedTodos = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updatedTodos);
    const todo = todos.find(t => t.id === id);
    console.log('Toggled todo:', todo.text, 'completed:', !todo.completed);
  };
  
  const deleteTodo = (id) => {
    const todoToDelete = todos.find(t => t.id === id);
    setTodos(todos.filter(todo => todo.id !== id));
    console.log('Deleted todo:', todoToDelete.text);
  };
  
  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
    console.log('Cleared completed todos');
  };
  
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });
  
  const completedCount = todos.filter(todo => todo.completed).length;
  const activeCount = todos.filter(todo => !todo.completed).length;
  
  return (
    <div className="app">
      <header className="header">
        <h1>React Todos</h1>
        <p className="subtitle">WebApp MCP Integration Demo</p>
      </header>
      
      <div className="container">
        <form onSubmit={addTodo} className="todo-form">
          <input
            type="text"
            id="new-todo"
            className="todo-input"
            placeholder="What needs to be done?"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" id="add-todo" className="add-button">
            Add
          </button>
        </form>
        
        <div className="filters">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            data-filter="all"
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
            data-filter="active"
          >
            Active
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
            data-filter="completed"
          >
            Completed
          </button>
        </div>
        
        <ul className="todo-list">
          {filteredTodos.map(todo => (
            <li key={todo.id} className="todo-item" data-id={todo.id}>
              <input
                type="checkbox"
                className="todo-checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id)}
              />
              <span className={`todo-text ${todo.completed ? 'completed' : ''}`}>
                {todo.text}
              </span>
              <button
                className="todo-delete"
                onClick={() => deleteTodo(todo.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        
        <div className="footer">
          <span className="todo-count">
            {activeCount} {activeCount === 1 ? 'item' : 'items'} left
          </span>
          {completedCount > 0 && (
            <button
              id="clear-completed"
              className="clear-completed"
              onClick={clearCompleted}
            >
              Remove Completed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;