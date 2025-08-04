<template>
  <div class="app">
    <header class="header">
      <h1>Vue Todos</h1>
      <p class="subtitle">WebApp MCP Integration Demo</p>
    </header>
    
    <div class="container">
      <form @submit.prevent="addTodo" class="todo-form">
        <input
          type="text"
          id="new-todo"
          class="todo-input"
          placeholder="What needs to be done?"
          v-model="newTodo"
          autocomplete="off"
        />
        <button type="submit" id="add-todo" class="add-button">
          Create
        </button>
      </form>
      
      <div class="filters">
        <button
          :class="['filter-btn', { active: filter === 'all' }]"
          @click="filter = 'all'"
          data-filter="all"
        >
          All
        </button>
        <button
          :class="['filter-btn', { active: filter === 'active' }]"
          @click="filter = 'active'"
          data-filter="active"
        >
          Active
        </button>
        <button
          :class="['filter-btn', { active: filter === 'completed' }]"
          @click="filter = 'completed'"
          data-filter="completed"
        >
          Completed
        </button>
      </div>
      
      <ul class="todo-list">
        <li
          v-for="todo in filteredTodos"
          :key="todo.id"
          class="todo-item"
          :data-id="todo.id"
        >
          <input
            type="checkbox"
            class="todo-checkbox"
            :checked="todo.completed"
            @change="toggleTodo(todo.id)"
          />
          <span :class="['todo-text', { completed: todo.completed }]">
            {{ todo.text }}
          </span>
          <button
            class="todo-delete"
            @click="deleteTodo(todo.id)"
          >
            Delete
          </button>
        </li>
      </ul>
      
      <div class="footer">
        <span class="todo-count">
          {{ activeCount }} {{ activeCount === 1 ? 'item' : 'items' }} left
        </span>
        <button
          v-if="completedCount > 0"
          id="clear-completed"
          class="clear-completed"
          @click="clearCompleted"
        >
          Remove Completed
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';

// State
const todos = ref([]);
const newTodo = ref('');
const filter = ref('all');

// Load todos from localStorage on mount
onMounted(() => {
  console.log('[Vue Todos] App mounted - initializing...');
  console.info('[Vue Todos] Loading todos from localStorage');
  
  const savedTodos = localStorage.getItem('todos');
  if (savedTodos) {
    todos.value = JSON.parse(savedTodos);
    console.log(`[Vue Todos] Loaded ${todos.value.length} todos from storage`);
  } else {
    console.warn('[Vue Todos] No saved todos found in localStorage');
  }
  
  // Test different console methods
  console.log('[Vue Todos] Testing console methods:');
  console.debug('[Vue Todos] Debug message - may not appear in production');
  console.info('[Vue Todos] Info message - application ready');
  console.warn('[Vue Todos] Warning message - this is just a test');
  
  // Log an object
  console.log('[Vue Todos] App state:', {
    todosCount: todos.value.length,
    currentFilter: filter.value,
    timestamp: new Date().toISOString()
  });
  
  // Add a periodic heartbeat log
  setInterval(() => {
    console.info(`[Vue Todos] Heartbeat - ${todos.value.length} todos, filter: ${filter.value}`);
  }, 30000); // Every 30 seconds
  
  // Simulate an error condition (caught)
  try {
    // This won't actually throw, just for demonstration
    if (Math.random() < 0.1) {
      throw new Error('[Vue Todos] Simulated error for testing');
    }
  } catch (error) {
    console.error('[Vue Todos] Caught error:', error.message);
  }
});

// Save todos to localStorage whenever they change
watch(todos, (newTodos) => {
  localStorage.setItem('todos', JSON.stringify(newTodos));
  console.info(`[Vue Todos] Saved ${newTodos.length} todos to localStorage`);
}, { deep: true });

// Watch filter changes
watch(filter, (newFilter) => {
  console.log(`[Vue Todos] Filter changed to: ${newFilter}`);
  const visibleCount = filteredTodos.value.length;
  console.info(`[Vue Todos] Showing ${visibleCount} todos with filter: ${newFilter}`);
});

// Methods
const addTodo = () => {
  if (newTodo.value.trim()) {
    const todo = {
      id: Date.now(),
      text: newTodo.value.trim(),
      completed: false
    };
    todos.value.push(todo);
    console.log('[Vue Todos] Added new todo:', todo.text);
    console.info('[Vue Todos] Todo details:', todo);
    console.log(`[Vue Todos] Total todos: ${todos.value.length}`);
    newTodo.value = '';
  } else {
    console.warn('[Vue Todos] Cannot add empty todo');
  }
};

const toggleTodo = (id) => {
  const todo = todos.value.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    console.log('Toggled todo:', todo.text, 'completed:', todo.completed);
  }
};

const deleteTodo = (id) => {
  const index = todos.value.findIndex(t => t.id === id);
  if (index > -1) {
    const deleted = todos.value[index];
    todos.value.splice(index, 1);
    console.log('Deleted todo:', deleted.text);
  }
};

const clearCompleted = () => {
  const beforeCount = todos.value.length;
  const completedCount = todos.value.filter(t => t.completed).length;
  todos.value = todos.value.filter(todo => !todo.completed);
  console.log(`[Vue Todos] Cleared ${completedCount} completed todos`);
  console.info(`[Vue Todos] Todos before: ${beforeCount}, after: ${todos.value.length}`);
  
  if (completedCount === 0) {
    console.warn('[Vue Todos] No completed todos to clear');
  }
};

// Computed properties
const filteredTodos = computed(() => {
  switch (filter.value) {
    case 'active':
      return todos.value.filter(todo => !todo.completed);
    case 'completed':
      return todos.value.filter(todo => todo.completed);
    default:
      return todos.value;
  }
});

const completedCount = computed(() => {
  return todos.value.filter(todo => todo.completed).length;
});

const activeCount = computed(() => {
  return todos.value.filter(todo => !todo.completed).length;
});
</script>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app {
  min-height: 100vh;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: #f5f5f5;
  color: #333;
  line-height: 1.4;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.header h1 {
  font-size: 48px;
  font-weight: 300;
  color: #42b883;
  margin-bottom: 10px;
}

.subtitle {
  color: #666;
  font-size: 14px;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.todo-form {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.todo-input {
  flex: 1;
  padding: 12px 16px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  outline: none;
}

.todo-input:focus {
  border-color: #42b883;
}

.add-button {
  padding: 12px 24px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.add-button:hover {
  background-color: #33a06f;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  justify-content: center;
}

.filter-btn {
  padding: 6px 16px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #42b883;
}

.filter-btn.active {
  background-color: #42b883;
  color: white;
  border-color: #42b883;
}

.todo-list {
  list-style: none;
  margin-bottom: 20px;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #eee;
  gap: 12px;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.todo-text {
  flex: 1;
  font-size: 16px;
}

.todo-text.completed {
  text-decoration: line-through;
  color: #999;
}

.todo-delete {
  padding: 4px 12px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.todo-delete:hover {
  background-color: #c82333;
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #666;
}

.clear-completed {
  padding: 4px 12px;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.clear-completed:hover {
  border-color: #42b883;
  color: #42b883;
}
</style>