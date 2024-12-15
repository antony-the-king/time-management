// DOM Elements
const sidebar = document.querySelector('.sidebar');
const rightPanel = document.querySelector('.right-panel');
const taskColumns = document.querySelectorAll('.task-column');
const taskModal = document.querySelector('.task-modal');
const taskForm = document.querySelector('.task-form');
const closeModalBtn = document.querySelector('.close-modal');
const cancelTaskBtn = document.querySelector('#cancel-task');
const newTaskBtn = document.querySelector('.new-task-btn');
const searchInput = document.querySelector('.search-bar input');
const timerDisplay = document.querySelector('.timer-display');
const timerControls = document.querySelector('.timer-controls');
const completionFill = document.querySelector('.completion-fill');
const taskCounts = document.querySelectorAll('.task-count');

// State Management
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentTimer = null;
let timerRunning = false;
let workDuration = 25 * 60; // 25 minutes in seconds

// Task Management
function addTask(taskData) {
    const task = {
        id: Date.now(),
        status: 'todo',
        progress: 0,
        createdAt: new Date().toISOString(),
        ...taskData
    };
    
    tasks.push(task);
    saveTasks();
    renderTasks();
    updateTaskCounts();
    updateCompletionRate();
}

function updateTask(taskId, updates) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
        saveTasks();
        renderTasks();
        updateTaskCounts();
        updateCompletionRate();
    }
}

function deleteTask(taskId) {
    tasks = tasks.filter(t => t.id !== taskId);
    saveTasks();
    renderTasks();
    updateTaskCounts();
    updateCompletionRate();
}

function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// UI Rendering
function renderTasks() {
    taskColumns.forEach(column => {
        const status = column.querySelector('.column-header h3').textContent.toLowerCase().replace(' ', '-');
        const content = column.querySelector('.column-content');
        content.innerHTML = '';
        
        const columnTasks = tasks.filter(t => t.status === status);
        columnTasks.forEach(task => {
            const taskCard = createTaskCard(task);
            content.appendChild(taskCard);
        });
    });
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.id = task.id;
    
    card.innerHTML = `
        <div class="task-priority ${task.priority}">
            <i class="fas fa-bookmark"></i>
            <span>${task.priority}</span>
        </div>
        <h4>${task.title}</h4>
        ${task.description ? `<p>${task.description}</p>` : ''}
        <div class="task-progress">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${task.progress}%"></div>
            </div>
            <span>${task.progress}%</span>
        </div>
        <div class="task-meta">
            ${task.deadline ? `
                <span class="deadline">
                    <i class="fas fa-calendar"></i>
                    ${formatDate(task.deadline)}
                </span>
            ` : ''}
            ${task.estimatedTimeFormatted ? `
                <span class="duration">
                    <i class="fas fa-clock"></i>
                    ${task.estimatedTimeFormatted}
                </span>
            ` : ''}
        </div>
    `;
    
    // Add click handler to show task details in right panel
    card.addEventListener('click', () => showTaskDetails(task));
    
    // Make card draggable
    card.setAttribute('draggable', true);
    card.addEventListener('dragstart', () => {
        card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
    });
    
    return card;
}

function showTaskDetails(task) {
    rightPanel.classList.add('show');
    const content = rightPanel.querySelector('.panel-content');
    content.innerHTML = `
        <div class="task-details">
            <h2>${task.title}</h2>
            <div class="detail-section">
                <label>Status</label>
                <select class="status-select" data-task-id="${task.id}">
                    <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
                    <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </div>
            ${task.description ? `
                <div class="detail-section">
                    <label>Description</label>
                    <p>${task.description}</p>
                </div>
            ` : ''}
            <div class="detail-section">
                <label>Progress</label>
                <input type="range" value="${task.progress}" min="0" max="100" 
                    class="progress-slider" data-task-id="${task.id}">
                <span>${task.progress}%</span>
            </div>
            <div class="detail-actions">
                <button class="edit-task" data-task-id="${task.id}">
                    <i class="fas fa-pencil-alt"></i> Edit
                </button>
                <button class="delete-task" data-task-id="${task.id}">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        </div>
    `;
    
    // Add event listeners for task actions
    setupTaskDetailListeners(content);
}

function setupTaskDetailListeners(detailsElement) {
    const statusSelect = detailsElement.querySelector('.status-select');
    const progressSlider = detailsElement.querySelector('.progress-slider');
    const editBtn = detailsElement.querySelector('.edit-task');
    const deleteBtn = detailsElement.querySelector('.delete-task');
    
    statusSelect?.addEventListener('change', (e) => {
        const taskId = parseInt(e.target.dataset.taskId);
        updateTask(taskId, { status: e.target.value });
    });
    
    progressSlider?.addEventListener('input', (e) => {
        const taskId = parseInt(e.target.dataset.taskId);
        const progress = parseInt(e.target.value);
        e.target.nextElementSibling.textContent = `${progress}%`;
        updateTask(taskId, { progress });
    });
    
    editBtn?.addEventListener('click', (e) => {
        const taskId = parseInt(e.target.dataset.taskId);
        const task = tasks.find(t => t.id === taskId);
        if (task) showEditModal(task);
    });
    
    deleteBtn?.addEventListener('click', (e) => {
        const taskId = parseInt(e.target.dataset.taskId);
        if (confirm('Are you sure you want to delete this task?')) {
            deleteTask(taskId);
            rightPanel.classList.remove('show');
        }
    });
}

// Current Time Display
function updateCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    timerDisplay.textContent = `${hours}:${minutes}`;
}

// Update time every minute
setInterval(updateCurrentTime, 60000);
updateCurrentTime(); // Initial update

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function updateTaskCounts() {
    taskColumns.forEach(column => {
        const status = column.querySelector('.column-header h3').textContent.toLowerCase().replace(' ', '-');
        const count = tasks.filter(t => t.status === status).length;
        column.querySelector('.task-count').textContent = count;
    });
}

function updateCompletionRate() {
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    const rate = total > 0 ? (completed / total) * 100 : 0;
    completionFill.style.width = `${rate}%`;
    completionFill.parentElement.nextElementSibling.textContent = `${Math.round(rate)}%`;
}

// View Management
const views = {
    board: document.querySelector('#board'),
    calendar: document.querySelector('#calendar-view'),
    statistics: document.querySelector('#statistics-view')
};

// Initialize tasks from localStorage on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Loading saved tasks...');
    tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    console.log('Loaded tasks:', tasks);
    
    // Initialize views
    switchView('board');
    
    // Add navigation listeners
    document.querySelectorAll('.nav-links li').forEach(item => {
        item.addEventListener('click', () => {
            switchView(item.dataset.view);
        });
    });
    
    // Add filter listeners
    document.querySelectorAll('.filter-links li').forEach(item => {
        item.addEventListener('click', () => {
            filterTasks(item.dataset.filter);
        });
    });
    
    renderTasks();
    updateTaskCounts();
    updateCompletionRate();
});

function switchView(viewName) {
    // Hide all views
    Object.values(views).forEach(view => {
        if (view) view.classList.remove('active');
    });
    
    // Show selected view
    if (views[viewName]) {
        views[viewName].classList.add('active');
    }
    
    // Update navigation active state
    document.querySelectorAll('.nav-links li').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === viewName) {
            item.classList.add('active');
        }
    });
    
    // Initialize view-specific content
    switch(viewName) {
        case 'board':
            renderTasks();
            break;
        case 'calendar':
            renderCalendarView();
            break;
        case 'statistics':
            renderStatistics();
            break;
    }
}

// Filter Management
function filterTasks(filterType) {
    let filteredTasks = [...tasks];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    switch(filterType) {
        case 'today':
            filteredTasks = tasks.filter(task => {
                const taskDate = new Date(task.deadline);
                taskDate.setHours(0, 0, 0, 0);
                return taskDate.getTime() === today.getTime();
            });
            break;
        case 'upcoming':
            filteredTasks = tasks.filter(task => {
                const taskDate = new Date(task.deadline);
                return taskDate > today;
            });
            break;
        // 'all' returns all tasks by default
    }
    
    renderFilteredTasks(filteredTasks);
    
    // Update filter links active state
    document.querySelectorAll('.filter-links li').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.filter === filterType) {
            item.classList.add('active');
        }
    });
}

function renderFilteredTasks(filteredTasks) {
    taskColumns.forEach(column => {
        const status = column.querySelector('.column-header h3').textContent.toLowerCase().replace(' ', '-');
        const content = column.querySelector('.column-content');
        content.innerHTML = '';
        
        const columnTasks = filteredTasks.filter(t => t.status === status);
        columnTasks.forEach(task => {
            const taskCard = createTaskCard(task);
            content.appendChild(taskCard);
        });
    });
    
    updateTaskCounts();
    updateCompletionRate();
}


// Calendar View
function renderCalendarView() {
    const calendarView = views.calendar;
    if (!calendarView) return;
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Update calendar title
    const calendarTitle = document.getElementById('calendar-title');
    calendarTitle.textContent = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    // Generate calendar grid
    const calendarGrid = document.querySelector('.calendar-grid');
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        calendarGrid.appendChild(dayHeader);
    });
    
    // Add calendar days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startPadding = firstDay.getDay();
    
    // Add padding days
    for (let i = 0; i < startPadding; i++) {
        const paddingDay = document.createElement('div');
        paddingDay.className = 'calendar-day empty';
        calendarGrid.appendChild(paddingDay);
    }
    
    // Add actual days
    for (let date = 1; date <= lastDay.getDate(); date++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const currentDate = new Date(currentYear, currentMonth, date);
        const dayTasks = tasks.filter(task => {
            const taskDate = new Date(task.deadline);
            return taskDate.toDateString() === currentDate.toDateString();
        });
        
        if (dayTasks.length > 0) {
            dayElement.classList.add('has-tasks');
        }
        
        dayElement.innerHTML = `
            <span class="day-number">${date}</span>
            ${dayTasks.map(task => `
                <div class="calendar-task ${task.priority}">
                    ${task.title}
                </div>
            `).join('')}
            ${dayTasks.length > 2 ? `
                <div class="more-tasks">+${dayTasks.length - 2} more</div>
            ` : ''}
        `;
        
        calendarGrid.appendChild(dayElement);
    }
}

// Statistics View
function renderStatistics() {
    const statsView = views.statistics;
    if (!statsView) return;
    
    // Task completion rate
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    
    // Task priority distribution
    const priorities = {
        high: tasks.filter(t => t.priority === 'high').length,
        medium: tasks.filter(t => t.priority === 'medium').length,
        low: tasks.filter(t => t.priority === 'low').length
    };
    
    // Task category distribution
    const categories = {};
    tasks.forEach(task => {
        if (task.category) {
            categories[task.category] = (categories[task.category] || 0) + 1;
        }
    });
    
    // Update charts (using Chart.js)
    updateCompletionChart(completionRate);
    updatePriorityChart(priorities);
    updateCategoryChart(categories);
}

// Chart Functions
function updateCompletionChart(completionRate) {
    const ctx = document.getElementById('completion-chart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'Remaining'],
            datasets: [{
                data: [completionRate, 100 - completionRate],
                backgroundColor: [
                    'rgba(0, 200, 255, 0.8)',
                    'rgba(255, 255, 255, 0.1)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            cutout: '80%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a0a0a0'
                    }
                }
            }
        }
    });
}

function updatePriorityChart(priorities) {
    const ctx = document.getElementById('priority-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['High', 'Medium', 'Low'],
            datasets: [{
                label: 'Tasks by Priority',
                data: [priorities.high, priorities.medium, priorities.low],
                backgroundColor: [
                    'rgba(255, 61, 135, 0.8)',
                    'rgba(255, 207, 0, 0.8)',
                    'rgba(0, 255, 157, 0.8)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0a0a0'
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#a0a0a0'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function updateCategoryChart(categories) {
    const ctx = document.getElementById('category-chart').getContext('2d');
    const labels = Object.keys(categories);
    const data = Object.values(categories);
    const colors = [
        'rgba(0, 200, 255, 0.8)',
        'rgba(177, 74, 255, 0.8)',
        'rgba(255, 61, 135, 0.8)',
        'rgba(0, 255, 157, 0.8)',
        'rgba(255, 207, 0, 0.8)'
    ];

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#a0a0a0'
                    }
                }
            }
        }
    });
}

// Modal Functions
function openTaskModal() {
    taskModal.classList.add('show');
    // Reset form when opening
    taskForm.reset();
}

function closeTaskModal() {
    taskModal.classList.remove('show');
}

// Event Listeners for Modal
newTaskBtn.addEventListener('click', openTaskModal);
closeModalBtn.addEventListener('click', closeTaskModal);
cancelTaskBtn.addEventListener('click', closeTaskModal);

// Close modal when clicking outside
taskModal.addEventListener('click', (e) => {
    if (e.target === taskModal) {
        closeTaskModal();
    }
});

// Datepicker functionality
class Datepicker {
    constructor(input) {
        this.input = input;
        this.popup = document.getElementById('datepicker-popup');
        this.currentDate = new Date();
        this.selectedDate = null;
        this.isVisible = false;
        
        // Time inputs
        this.hourInput = this.popup.querySelector('.hour-input');
        this.minuteInput = this.popup.querySelector('.minute-input');
        this.amBtn = this.popup.querySelector('.period-btn.am');
        this.pmBtn = this.popup.querySelector('.period-btn.pm');
        
        this.setupEventListeners();
        this.render();
    }
    
    setupEventListeners() {
        // Toggle datepicker
        this.input.parentElement.querySelector('.datepicker-toggle-button')
            .addEventListener('click', () => this.toggle());
            
        // Month navigation
        this.popup.querySelector('.prev-month')
            .addEventListener('click', () => this.prevMonth());
        this.popup.querySelector('.next-month')
            .addEventListener('click', () => this.nextMonth());
            
        // Time inputs
        this.hourInput.addEventListener('input', () => this.validateHour());
        this.minuteInput.addEventListener('input', () => this.validateMinute());
        
        // AM/PM toggle
        this.amBtn.addEventListener('click', () => this.setPeriod('am'));
        this.pmBtn.addEventListener('click', () => this.setPeriod('pm'));
        
        // Buttons
        this.popup.querySelector('.clear-btn')
            .addEventListener('click', () => this.clear());
        this.popup.querySelector('.apply-btn')
            .addEventListener('click', () => this.apply());
            
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.popup.contains(e.target) && 
                !this.input.parentElement.contains(e.target)) {
                this.hide();
            }
        });
    }
    
    toggle() {
        this.isVisible ? this.hide() : this.show();
    }
    
    show() {
        this.popup.classList.add('show');
        this.isVisible = true;
        this.render();
    }
    
    hide() {
        this.popup.classList.remove('show');
        this.isVisible = false;
    }
    
    render() {
        // Update month display
        this.popup.querySelector('.current-month').textContent = 
            this.currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            });
        
        // Generate calendar days
        const daysGrid = this.popup.querySelector('.datepicker-days');
        daysGrid.innerHTML = '';
        
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const today = new Date();
        
        // Add padding days
        for (let i = 0; i < firstDay.getDay(); i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'datepicker-day disabled';
            daysGrid.appendChild(dayEl);
        }
        
        // Add month days
        for (let date = 1; date <= lastDay.getDate(); date++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'datepicker-day';
            dayEl.textContent = date;
            
            const currentDate = new Date(year, month, date);
            
            // Add special classes
            if (this.isSameDay(currentDate, today)) {
                dayEl.classList.add('today');
            }
            if (this.selectedDate && this.isSameDay(currentDate, this.selectedDate)) {
                dayEl.classList.add('selected');
            }
            
            dayEl.addEventListener('click', () => this.selectDate(currentDate));
            daysGrid.appendChild(dayEl);
        }
    }
    
    selectDate(date) {
        this.selectedDate = date;
        this.render();
    }
    
    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.render();
    }
    
    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.render();
    }
    
    validateHour() {
        let value = parseInt(this.hourInput.value);
        if (isNaN(value)) value = 0;
        value = Math.max(1, Math.min(12, value));
        this.hourInput.value = value.toString().padStart(2, '0');
    }
    
    validateMinute() {
        let value = parseInt(this.minuteInput.value);
        if (isNaN(value)) value = 0;
        value = Math.max(0, Math.min(59, value));
        this.minuteInput.value = value.toString().padStart(2, '0');
    }
    
    setPeriod(period) {
        if (period === 'am') {
            this.amBtn.classList.add('active');
            this.pmBtn.classList.remove('active');
        } else {
            this.amBtn.classList.remove('active');
            this.pmBtn.classList.add('active');
        }
    }
    
    isSameDay(d1, d2) {
        return d1.getDate() === d2.getDate() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getFullYear() === d2.getFullYear();
    }
    
    clear() {
        this.selectedDate = null;
        this.hourInput.value = '';
        this.minuteInput.value = '';
        this.setPeriod('am');
        this.input.value = '';
        this.hide();
    }
    
    apply() {
        if (!this.selectedDate) return;
        
        const hour = parseInt(this.hourInput.value) || 0;
        const minute = parseInt(this.minuteInput.value) || 0;
        const isPM = !this.amBtn.classList.contains('active');
        
        this.selectedDate.setHours(
            isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour),
            minute
        );
        
        this.input.value = this.selectedDate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        this.hide();
    }
}

// Initialize datepicker
const datepicker = new Datepicker(document.getElementById('task-deadline'));

// Duration conversion helpers
function convertDurationToMinutes(value, unit) {
    const conversions = {
        'minutes': 1,
        'hours': 60,
        'days': 1440,      // 24 * 60
        'weeks': 10080,    // 7 * 24 * 60
        'months': 43200,   // 30 * 24 * 60
        'years': 525600    // 365 * 24 * 60
    };
    return value * conversions[unit];
}

function formatDuration(minutes) {
    if (minutes < 60) return `${minutes} minutes`;
    if (minutes < 1440) return `${Math.round(minutes/60)} hours`;
    if (minutes < 10080) return `${Math.round(minutes/1440)} days`;
    if (minutes < 43200) return `${Math.round(minutes/10080)} weeks`;
    if (minutes < 525600) return `${Math.round(minutes/43200)} months`;
    return `${Math.round(minutes/525600)} years`;
}

// Handle form submission
taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    console.log('Form submitted');
    
    // Get form values
    const taskName = document.getElementById('task-name').value;
    const deadline = document.getElementById('task-deadline').value;
    const priority = document.getElementById('task-priority').value;
    const description = document.getElementById('task-description').value;
    const category = document.getElementById('task-category').value;
    const durationValue = document.getElementById('duration-value')?.value || 0;
    const durationUnit = document.getElementById('duration-unit')?.value || 'minutes';
    
    console.log('Form values:', {
        taskName,
        deadline,
        priority,
        description,
        category,
        durationValue,
        durationUnit
    });

    // Convert duration
    const estimatedMinutes = convertDurationToMinutes(Number(durationValue), durationUnit);
    
    // Create task data
    const taskData = {
        title: taskName,
        deadline: deadline,
        priority: priority,
        description: description,
        category: category,
        estimatedTime: estimatedMinutes,
        estimatedTimeFormatted: formatDuration(estimatedMinutes),
        status: 'Todo'.toLowerCase(),
        progress: 0
    };
    
    // Log task creation
    console.log('Creating task with status:', taskData.status);
    
    console.log('Task data:', taskData);
    
    // Add task and update UI
    addTask(taskData);
    console.log('Current tasks:', tasks);
    
    // Close modal
    closeTaskModal();
});


searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const taskCards = document.querySelectorAll('.task-card');
    
    taskCards.forEach(card => {
        const title = card.querySelector('h4').textContent.toLowerCase();
        const description = card.querySelector('p')?.textContent.toLowerCase() || '';
        const matches = title.includes(searchTerm) || description.includes(searchTerm);
        card.style.display = matches ? 'block' : 'none';
    });
});

// Drag and Drop
taskColumns.forEach(column => {
    column.addEventListener('dragover', e => {
        e.preventDefault();
        const dragging = document.querySelector('.dragging');
        if (dragging) {
            const cards = [...column.querySelectorAll('.task-card:not(.dragging)')];
            const afterElement = cards.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = e.clientY - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
            
            const content = column.querySelector('.column-content');
            if (afterElement) {
                content.insertBefore(dragging, afterElement);
            } else {
                content.appendChild(dragging);
            }

            // Update task status when dropped in a new column
            const taskId = parseInt(dragging.dataset.id);
            const newStatus = column.querySelector('.column-header h3').textContent.toLowerCase().replace(' ', '-');
            updateTask(taskId, { status: newStatus });
        }
    });
});
