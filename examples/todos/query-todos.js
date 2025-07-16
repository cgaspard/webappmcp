const puppeteer = require('puppeteer');

async function queryTodosWithPuppeteer() {
  console.log('Starting browser to query todos...');
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Navigate to the todos app
    await page.goto('http://localhost:4834', { waitUntil: 'networkidle2' });
    
    // Wait for the page to load
    await page.waitForSelector('#todo-list', { timeout: 5000 });
    
    // Get all todo items
    const todoItems = await page.evaluate(() => {
      const items = document.querySelectorAll('.todo-item');
      return Array.from(items).map(item => {
        const checkbox = item.querySelector('.todo-checkbox');
        const text = item.querySelector('.todo-text');
        return {
          id: item.dataset.id,
          text: text ? text.textContent : '',
          completed: checkbox ? checkbox.checked : false
        };
      });
    });
    
    console.log('Todo items found:', todoItems);
    
    // Get stats
    const stats = await page.evaluate(() => {
      return {
        total: document.getElementById('total-todos')?.textContent || '0',
        active: document.getElementById('active-todos')?.textContent || '0',
        completed: document.getElementById('completed-todos')?.textContent || '0'
      };
    });
    
    console.log('Stats:', stats);
    
    // Check if MCP client is connected
    const mcpStatus = await page.evaluate(() => {
      const statusElement = document.getElementById('connection-status');
      return statusElement ? statusElement.textContent : 'Status unknown';
    });
    
    console.log('MCP Status:', mcpStatus);
    
    await browser.close();
    
  } catch (error) {
    console.error('Error querying todos:', error);
  }
}

queryTodosWithPuppeteer();