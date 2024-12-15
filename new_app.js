// DOM Elements
const currentTime = document.getElementById('current-time');
const searchInput = document.getElementById('search-tasks');
const taskListContainer = document.getElementById('task-list');
const addTaskForm = document.getElementById('add-task-form');
const newTaskBtn = document.getElementById('new-task-btn');
const taskModal = document.getElementById('task-modal');
const closeModalBtns = document.querySelectorAll('.close-modal');
const themeSelect = document.getElementById('theme-select');
const sortSelect = document.getElementById('sort-tasks');

// Initialize app
function initializeApp() {
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    loadAndDisplayTasks();
    setupEventListeners();
    loadSavedTheme();
}

// Time display
function updateTimeDisplay() {
    const now = new Date();
    const options = { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true,
        timeZoneName: 'short'
    };
    currentTime.textContent = now.toLocaleTimeString(undefined, options);
}

// Theme Management
function setTheme(theme) {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark-mode';
    setTheme(savedTheme);
    if (themeSelect) {
        themeSelect.value = savedTheme;
    }
}

// Task Management
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('data-priority', task.priority.toLowerCase());

    const deadlineDate = new Date(task.deadline);
    const isOverdue = deadlineDate < new Date();

    card.innerHTML = `
        <div class="task-priority">
            <i class="fas fa-flag"></i>
            ${task.priority} Priority
        </div>
        <div class="task-content">
            <h3 class="task-name">${task.name}</h3>
            ${task.description ? `<p class="task-description">${task.description}</p>` : ''}
            <div class="task-meta">
                <div class="task-deadline ${isOverdue ? 'overdue' : ''}">
                    <i class="far fa-clock"></i>
                    ${formatDeadline(task.deadline)}
                </div>
            </div>
        </div>
        <div class="task-actions">
            <button class="task-btn complete-btn" title="Complete Task">
                <i class="fas fa-check"></i>
            </button>
            <button class="task-btn edit-btn" title="Edit Task">
                <i class="fas fa-edit"></i>
            </button>
            <button class="task-btn delete-btn" title="Delete Task">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;

    // Add event listeners
    card.querySelector('.complete-btn').addEventListener('click', () => completeTask(task));
    card.querySelector('.edit-btn').addEventListener('click', () => editTask(task));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteTask(task));

    return card;
}

function loadAndDisplayTasks() {
    const tasks = safelyGetTasks();
    const sortedTasks = sortTasks(filterTasks(tasks));
    
    taskListContainer.innerHTML = '';
    
    if (sortedTasks.length === 0) {
        taskListContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-tasks"></i>
                </div>
                <h3>No tasks found</h3>
                <p>Create your first task by clicking the "New Task" button</p>
            </div>
        `;
        return;
    }
    
    // Group tasks by month and year
    const groupedTasks = {};
    sortedTasks.forEach(task => {
        const date = new Date(task.deadline);
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!groupedTasks[monthYear]) {
            groupedTasks[monthYear] = [];
        }
        groupedTasks[monthYear].push(task);
    });

    Object.entries(groupedTasks).forEach(([monthYear, monthTasks]) => {
        const section = document.createElement('div');
        section.className = 'task-period';
        section.innerHTML = `<h2>${monthYear}</h2>`;
        
        const tasksContainer = document.createElement('div');
        tasksContainer.className = 'task-list';
        
        monthTasks.forEach(task => {
            tasksContainer.appendChild(createTaskCard(task));
        });
        
        section.appendChild(tasksContainer);
        taskListContainer.appendChild(section);
    });
}

function filterTasks(tasks) {
    const searchTerm = searchInput.value.toLowerCase();
    return tasks.filter(task => {
        const matchesSearch = task.name.toLowerCase().includes(searchTerm) ||
                            (task.description && task.description.toLowerCase().includes(searchTerm));
        return matchesSearch;
    });
}

function sortTasks(tasks) {
    const sortBy = sortSelect.value;
    return [...tasks].sort((a, b) => {
        switch (sortBy) {
            case 'deadline':
                return new Date(a.deadline) - new Date(b.deadline);
            case 'priority': {
                const priorityOrder = { high: 1, medium: 2, low: 3 };
                return priorityOrder[a.priority.toLowerCase()] - priorityOrder[b.priority.toLowerCase()];
            }
            case 'name':
                return a.name.localeCompare(b.name);
            default:
                return 0;
        }
    });
}

// Event Handlers
function handleNewTask(e) {
    e.preventDefault();
    
    const taskName = document.getElementById('task-name').value;
    const taskDescription = document.getElementById('task-description').value;
    const taskDeadline = document.getElementById('task-deadline').value;
    const taskPriority = document.getElementById('priority').value;

    if (!taskName || !taskDeadline || !taskPriority) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    const newTask = {
        id: Date.now().toString(),
        name: taskName,
        description: taskDescription,
        deadline: taskDeadline,
        priority: taskPriority,
        createdAt: new Date().toISOString()
    };
    
    const tasks = safelyGetTasks();
    tasks.push(newTask);
    safelySaveTasks(tasks);
    
    closeModal();
    loadAndDisplayTasks();
    showNotification('Task created successfully!');
}

// Modal Management
function openModal() {
    taskModal.classList.remove('hidden');
    // Set default deadline to current time + 1 hour
    const now = new Date();
    now.setHours(now.getHours() + 1);
    document.getElementById('task-deadline').value = now.toISOString().slice(0, 16);
}

function closeModal() {
    taskModal.classList.add('hidden');
    addTaskForm.reset();
}

// Event Listeners
function setupEventListeners() {
    // Search and Filter
    searchInput.addEventListener('input', loadAndDisplayTasks);
    sortSelect.addEventListener('change', loadAndDisplayTasks);
    
    // New Task
    newTaskBtn.addEventListener('click', openModal);
    closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
    addTaskForm.addEventListener('submit', handleNewTask);
    
    // Theme Toggle
    themeSelect.addEventListener('change', (e) => setTheme(e.target.value));
    
    // Modal Close on Outside Click
    taskModal.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            closeModal();
        }
    });
}

// Storage Functions
function safelyGetTasks() {
    try {
        return JSON.parse(localStorage.getItem('tasks') || '[]');
    } catch (error) {
        console.error('Error reading tasks:', error);
        return [];
    }
}

function safelySaveTasks(tasks) {
    try {
        localStorage.setItem('tasks', JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error('Error saving tasks:', error);
        showNotification('Error saving tasks. Please try again.', 'error');
        return false;
    }
}

// Notification System
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
        <button class="close-notification">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    const closeBtn = notification.querySelector('.close-notification');
    closeBtn.addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Helper function for formatting deadline
function formatDeadline(deadline) {
    const date = new Date(deadline);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Initialize the app
initializeApp();
