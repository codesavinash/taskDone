// Task Management App
class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentTaskId = null;
        this.draggedTask = null;
        this.filteredTasks = null;
        this.currentFilter = { priority: 'all', sort: 'date' };
        this.init();
    }

    init() {
        this.loadTasks();
        this.loadSettings();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.renderTasks();
        this.updateTaskCounts();
        this.updateStatistics();
        this.applyTheme();
        this.startTimerUpdates();
    }

    // Load tasks from local storage
    loadTasks() {
        const savedTasks = localStorage.getItem('tasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
            // Resume timers for tasks that were in progress
            this.tasks.forEach(task => {
                if (task.status === 'inprogress') {
                    if (task.startTime) {
                        // Verify the start time is still valid (not too old)
                        const startTime = new Date(task.startTime);
                        const now = new Date();
                        const hoursSinceStart = (now - startTime) / (1000 * 60 * 60);
                        
                        // If task has been in progress for more than 24 hours, reset timer
                        if (hoursSinceStart > 24) {
                            task.timeSpent = (task.timeSpent || 0) + Math.floor((now - startTime) / 1000);
                            task.startTime = new Date().toISOString();
                        }
                    } else {
                        // Task is in progress but has no start time - start it now
                        task.startTime = new Date().toISOString();
                        if (!task.timeSpent) {
                            task.timeSpent = 0;
                        }
                    }
                }
            });
        }
    }

    // Load settings from local storage
    loadSettings() {
        const settings = localStorage.getItem('settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            if (parsed.darkMode !== undefined) {
                document.documentElement.setAttribute('data-theme', parsed.darkMode ? 'dark' : 'light');
            }
            if (parsed.showStats !== undefined) {
                document.getElementById('statsDashboard').style.display = parsed.showStats ? 'grid' : 'none';
                document.getElementById('showStatsToggle').checked = parsed.showStats;
            }
            if (parsed.animations !== undefined) {
                document.getElementById('animationsToggle').checked = parsed.animations;
            }
            if (parsed.minimalistView !== undefined) {
                document.getElementById('minimalistToggle').checked = parsed.minimalistView;
                this.toggleMinimalistView(parsed.minimalistView);
            }
        }
    }

    // Save tasks to local storage
    saveTasks() {
        if (document.getElementById('autoSaveToggle')?.checked !== false) {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        }
    }

    // Save settings to local storage
    saveSettings() {
        const settings = {
            darkMode: document.documentElement.getAttribute('data-theme') === 'dark',
            showStats: document.getElementById('showStatsToggle')?.checked ?? true,
            animations: document.getElementById('animationsToggle')?.checked ?? true,
            minimalistView: document.getElementById('minimalistToggle')?.checked ?? false
        };
        localStorage.setItem('settings', JSON.stringify(settings));
    }

    // Toggle minimalist view
    toggleMinimalistView(enabled) {
        if (enabled) {
            document.body.classList.add('minimalist-view');
            this.showToast('Minimalist view enabled', 'info');
        } else {
            document.body.classList.remove('minimalist-view');
            this.showToast('Minimalist view disabled', 'info');
        }
        this.saveSettings();
    }

    // Setup event listeners
    setupEventListeners() {
        // Add task buttons
        document.querySelectorAll('.btn-add-task').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const status = e.currentTarget.getAttribute('data-status');
                this.openTaskModal(null, status);
            });
        });

        // Modal controls
        const taskModal = document.getElementById('taskModal');
        const settingsModal = document.getElementById('settingsModal');
        const statsModal = document.getElementById('statsModal');
        
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.closeTaskModal();
        });

        document.getElementById('closeSettingsBtn').addEventListener('click', () => {
            settingsModal.classList.remove('show');
        });

        document.getElementById('closeStatsBtn').addEventListener('click', () => {
            statsModal.classList.remove('show');
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeTaskModal();
        });

        document.getElementById('saveTaskBtn').addEventListener('click', () => {
            this.saveTask();
        });

        // Settings
        document.getElementById('settingsBtn').addEventListener('click', () => {
            settingsModal.classList.add('show');
        });

        document.getElementById('statsBtn').addEventListener('click', () => {
            this.updateStatisticsModal();
            statsModal.classList.add('show');
        });

        document.getElementById('darkModeBtn').addEventListener('click', () => {
            this.toggleDarkMode();
        });

        // Minimalist view toggle
        document.getElementById('minimalistToggle').addEventListener('change', (e) => {
            this.toggleMinimalistView(e.target.checked);
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all tasks?')) {
                this.clearAllTasks();
            }
        });

        // Export/Import
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportTasks();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importTasks(e);
        });

        // Search
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        
        searchInput.addEventListener('input', (e) => {
            this.filterTasks(e.target.value);
            clearSearchBtn.classList.toggle('show', e.target.value.length > 0);
        });

        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            this.filterTasks('');
            clearSearchBtn.classList.remove('show');
        });

        // Filters
        document.getElementById('filterPriority').addEventListener('change', (e) => {
            this.currentFilter.priority = e.target.value;
            this.applyFilters();
        });

        document.getElementById('sortTasks').addEventListener('change', (e) => {
            this.currentFilter.sort = e.target.value;
            this.applyFilters();
        });

        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
            this.clearFilters();
        });

        // Settings toggles
        document.getElementById('showStatsToggle')?.addEventListener('change', (e) => {
            document.getElementById('statsDashboard').style.display = e.target.checked ? 'grid' : 'none';
            this.saveSettings();
        });

        document.getElementById('animationsToggle')?.addEventListener('change', () => {
            this.saveSettings();
        });

        // Close modal on outside click
        [taskModal, settingsModal, statsModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('show');
                }
            });
        });

        // Tag input handling
        const tagInput = document.getElementById('taskTags');
        if (tagInput) {
            tagInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addTagToInput(e.target);
                }
            });
        }
    }

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') {
                    this.closeTaskModal();
                    document.getElementById('settingsModal').classList.remove('show');
                    document.getElementById('statsModal').classList.remove('show');
                }
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    if (document.getElementById('taskModal').classList.contains('show')) {
                        this.saveTask();
                    }
                }
                return;
            }

            // Global shortcuts
            if (e.key === 'n' || e.key === 'N') {
                e.preventDefault();
                this.openTaskModal(null, 'todo');
            }

            if (e.key === '/') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.toggleDarkMode();
            }
        });
    }

    // Toggle dark mode
    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        const icon = document.querySelector('#darkModeBtn i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        this.saveSettings();
        this.showToast('Dark mode ' + (newTheme === 'dark' ? 'enabled' : 'disabled'), 'info');
    }

    // Apply theme
    applyTheme() {
        const settings = localStorage.getItem('settings');
        if (settings) {
            const parsed = JSON.parse(settings);
            if (parsed.darkMode) {
                document.documentElement.setAttribute('data-theme', 'dark');
                const icon = document.querySelector('#darkModeBtn i');
                if (icon) icon.className = 'fas fa-sun';
            }
        }
    }

    // Show toast notification
    showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.success}"></i>
            <span>${this.escapeHtml(message)}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastSlideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Open task modal
    openTaskModal(taskId = null, status = 'todo') {
        const modal = document.getElementById('taskModal');
        const form = document.getElementById('taskForm');
        
        if (taskId) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                document.getElementById('modalTitle').textContent = 'Edit Task';
                document.getElementById('taskId').value = task.id;
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskDescription').value = task.description || '';
                document.getElementById('taskPriority').value = task.priority || 'medium';
                document.getElementById('taskDueDate').value = task.dueDate || '';
                document.getElementById('taskStatus').value = task.status;
                document.getElementById('taskTags').value = (task.tags || []).join(', ');
                this.currentTaskId = taskId;
                this.renderTagsInModal(task.tags || []);
            }
        } else {
            document.getElementById('modalTitle').textContent = 'Add New Task';
            form.reset();
            document.getElementById('taskStatus').value = status;
            document.getElementById('taskPriority').value = 'medium';
            this.currentTaskId = null;
            this.clearTagsInModal();
        }
        
        modal.classList.add('show');
        document.getElementById('taskTitle').focus();
    }

    // Close task modal
    closeTaskModal() {
        const modal = document.getElementById('taskModal');
        modal.classList.remove('show');
        document.getElementById('taskForm').reset();
        this.clearTagsInModal();
        this.currentTaskId = null;
    }

    // Tag management
    addTagToInput(input) {
        const value = input.value.trim();
        if (value) {
            const container = input.parentElement.querySelector('.tag-input-container') || 
                            this.createTagContainer(input);
            const tags = Array.from(container.querySelectorAll('.tag-item')).map(t => t.textContent.trim().replace('×', ''));
            
            if (!tags.includes(value)) {
                const tagItem = document.createElement('div');
                tagItem.className = 'tag-item';
                tagItem.innerHTML = `
                    ${this.escapeHtml(value)}
                    <span class="tag-remove" onclick="this.parentElement.remove()">×</span>
                `;
                container.appendChild(tagItem);
                input.value = '';
            }
        }
    }

    createTagContainer(input) {
        const container = document.createElement('div');
        container.className = 'tag-input-container';
        input.parentElement.insertBefore(container, input);
        return container;
    }

    renderTagsInModal(tags) {
        const input = document.getElementById('taskTags');
        let container = input.parentElement.querySelector('.tag-input-container');
        
        if (!container) {
            container = this.createTagContainer(input);
        }
        
        container.innerHTML = '';
        tags.forEach(tag => {
            const tagItem = document.createElement('div');
            tagItem.className = 'tag-item';
            tagItem.innerHTML = `
                ${this.escapeHtml(tag)}
                <span class="tag-remove" onclick="this.parentElement.remove()">×</span>
            `;
            container.appendChild(tagItem);
        });
    }

    clearTagsInModal() {
        const container = document.getElementById('taskTags')?.parentElement.querySelector('.tag-input-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    getTagsFromModal() {
        const container = document.getElementById('taskTags')?.parentElement.querySelector('.tag-input-container');
        if (container) {
            return Array.from(container.querySelectorAll('.tag-item')).map(t => 
                t.textContent.trim().replace('×', '')
            );
        }
        const input = document.getElementById('taskTags');
        return input.value ? input.value.split(',').map(t => t.trim()).filter(t => t) : [];
    }

    // Save task
    saveTask() {
        const title = document.getElementById('taskTitle').value.trim();
        if (!title) {
            this.showToast('Please enter a task title', 'error');
            return;
        }

        const taskData = {
            title: title,
            description: document.getElementById('taskDescription').value.trim(),
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            status: document.getElementById('taskStatus').value,
            tags: this.getTagsFromModal(),
            createdAt: new Date().toISOString()
        };

        if (this.currentTaskId) {
            // Update existing task
            const taskIndex = this.tasks.findIndex(t => t.id === this.currentTaskId);
            if (taskIndex !== -1) {
                const existingTask = this.tasks[taskIndex];
                const oldStatus = existingTask.status;
                const newStatus = taskData.status;
                
                // Handle timer logic when status changes via edit
                if (oldStatus === 'inprogress' && newStatus !== 'inprogress') {
                    this.stopTimer(this.currentTaskId);
                }
                
                if (newStatus === 'inprogress' && oldStatus !== 'inprogress') {
                    this.startTimer(this.currentTaskId);
                }
                
                this.tasks[taskIndex] = { ...existingTask, ...taskData };
                this.showToast('Task updated successfully', 'success');
            }
        } else {
            // Create new task
            const newTask = {
                id: Date.now().toString(),
                ...taskData
            };
            this.tasks.push(newTask);
            
            // Start timer if task is created in in-progress status
            if (taskData.status === 'inprogress') {
                this.startTimer(newTask.id);
            }
            
            this.showToast('Task created successfully', 'success');
        }

        this.saveTasks();
        this.applyFilters();
        this.updateTaskCounts();
        this.updateStatistics();
        this.closeTaskModal();
    }

    // Delete task
    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveTasks();
            this.applyFilters();
            this.updateTaskCounts();
            this.updateStatistics();
            this.showToast('Task deleted', 'info');
        }
    }

    // Clear all tasks
    clearAllTasks() {
        this.tasks = [];
        this.saveTasks();
        this.renderTasks();
        this.updateTaskCounts();
        this.updateStatistics();
        this.showToast('All tasks cleared', 'info');
    }

    // Apply filters and sorting
    applyFilters() {
        let filtered = [...this.tasks];

        // Priority filter
        if (this.currentFilter.priority !== 'all') {
            filtered = filtered.filter(t => t.priority === this.currentFilter.priority);
        }

        // Sort
        filtered.sort((a, b) => {
            switch (this.currentFilter.sort) {
                case 'priority':
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                case 'dueDate':
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'date':
                default:
                    return new Date(b.createdAt) - new Date(a.createdAt);
            }
        });

        this.filteredTasks = filtered;
        this.renderTasks(filtered);
        this.updateTaskCounts();
    }

    // Clear filters
    clearFilters() {
        document.getElementById('filterPriority').value = 'all';
        document.getElementById('sortTasks').value = 'date';
        document.getElementById('searchInput').value = '';
        document.getElementById('clearSearchBtn').classList.remove('show');
        this.currentFilter = { priority: 'all', sort: 'date' };
        this.filterTasks('');
    }

    // Filter tasks by search
    filterTasks(searchTerm) {
        if (!searchTerm.trim()) {
            this.filteredTasks = null;
            this.applyFilters();
            return;
        }

        const filtered = this.tasks.filter(task => {
            const searchLower = searchTerm.toLowerCase();
            const matchesTitle = task.title.toLowerCase().includes(searchLower);
            const matchesDescription = task.description && task.description.toLowerCase().includes(searchLower);
            const matchesPriority = task.priority.toLowerCase().includes(searchLower);
            const matchesTags = task.tags && task.tags.some(tag => tag.toLowerCase().includes(searchLower));
            return matchesTitle || matchesDescription || matchesPriority || matchesTags;
        });

        this.filteredTasks = filtered;
        this.applyFilters();
    }

    // Render tasks
    renderTasks(tasksToRender = null) {
        const tasks = tasksToRender || this.filteredTasks || this.tasks;
        const statuses = ['todo', 'inprogress', 'done'];
        
        statuses.forEach(status => {
            const list = document.getElementById(`${status}List`);
            list.innerHTML = '';
            
            const statusTasks = tasks.filter(t => t.status === status);
            
            if (statusTasks.length === 0) {
                list.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p>No tasks yet</p>
                    </div>
                `;
            } else {
                statusTasks.forEach((task, index) => {
                    const taskCard = this.createTaskCard(task);
                    if (index === 0) {
                        taskCard.classList.add('new-task');
                        setTimeout(() => taskCard.classList.remove('new-task'), 300);
                    }
                    list.appendChild(taskCard);
                });
            }
        });
    }

    // Create task card
    createTaskCard(task) {
        const card = document.createElement('div');
        card.className = `task-card priority-${task.priority}`;
        if (task.status === 'done') {
            card.classList.add('completed');
        }
        card.draggable = true;
        card.dataset.taskId = task.id;

        const dueDate = task.dueDate ? new Date(task.dueDate) : null;
        const isOverdue = dueDate && dueDate < new Date() && task.status !== 'done';
        const dueDateFormatted = dueDate ? dueDate.toLocaleDateString() : '';

        const tagsHtml = task.tags && task.tags.length > 0 ? `
            <div class="task-tags">
                ${task.tags.map(tag => `
                    <span class="task-tag">
                        <i class="fas fa-tag"></i>
                        ${this.escapeHtml(tag)}
                    </span>
                `).join('')}
            </div>
        ` : '';

        // Timer display for in-progress tasks
        let timerHtml = '';
        if (task.status === 'inprogress') {
            const elapsed = this.getElapsedTime(task);
            timerHtml = `
                <div class="task-timer-container">
                    <i class="fas fa-clock"></i>
                    <span class="task-timer">${this.formatTime(elapsed)}</span>
                </div>
            `;
        }

        // Total time display for completed tasks
        let totalTimeHtml = '';
        if (task.status === 'done' && task.totalTime) {
            totalTimeHtml = `
                <div class="task-total-time">
                    <i class="fas fa-check-circle"></i>
                    <span>Completed in: ${this.formatTime(task.totalTime)}</span>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="task-header">
                <div class="task-title">${this.escapeHtml(task.title)}</div>
                <div class="task-actions">
                    <button class="task-btn" onclick="taskManager.editTask('${task.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="task-btn" onclick="taskManager.deleteTask('${task.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
            ${tagsHtml}
            ${timerHtml}
            ${totalTimeHtml}
            <div class="task-footer">
                <span class="task-priority ${task.priority}">${task.priority}</span>
                ${dueDate ? `<span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                    <i class="fas fa-calendar"></i> ${dueDateFormatted}
                </span>` : ''}
            </div>
        `;

        // Drag event listeners
        card.addEventListener('dragstart', (e) => {
            this.handleDragStart(e, task.id);
        });

        card.addEventListener('dragend', (e) => {
            this.handleDragEnd(e);
        });

        return card;
    }

    // Edit task
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.openTaskModal(taskId, task.status);
        }
    }

    // Update task counts
    updateTaskCounts() {
        const tasks = this.filteredTasks || this.tasks;
        const counts = {
            todo: tasks.filter(t => t.status === 'todo').length,
            inprogress: tasks.filter(t => t.status === 'inprogress').length,
            done: tasks.filter(t => t.status === 'done').length
        };

        document.getElementById('todoCount').textContent = counts.todo;
        document.getElementById('inprogressCount').textContent = counts.inprogress;
        document.getElementById('doneCount').textContent = counts.done;
    }

    // Update statistics
    updateStatistics() {
        const tasks = this.tasks;
        const stats = {
            todo: tasks.filter(t => t.status === 'todo').length,
            inprogress: tasks.filter(t => t.status === 'inprogress').length,
            done: tasks.filter(t => t.status === 'done').length,
            total: tasks.length,
            overdue: tasks.filter(t => {
                if (!t.dueDate || t.status === 'done') return false;
                return new Date(t.dueDate) < new Date();
            }).length
        };

        document.getElementById('statsTodo').textContent = stats.todo;
        document.getElementById('statsInProgress').textContent = stats.inprogress;
        document.getElementById('statsDone').textContent = stats.done;
        document.getElementById('statsOverdue').textContent = stats.overdue;
        document.getElementById('statsTotal').textContent = stats.total;
    }

    // Update statistics modal
    updateStatisticsModal() {
        const tasks = this.tasks;
        const total = tasks.length;
        const done = tasks.filter(t => t.status === 'done').length;
        const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
        const highPriority = tasks.filter(t => t.priority === 'high').length;
        const overdue = tasks.filter(t => {
            if (!t.dueDate || t.status === 'done') return false;
            return new Date(t.dueDate) < new Date();
        }).length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueToday = tasks.filter(t => {
            if (!t.dueDate || t.status === 'done') return false;
            const due = new Date(t.dueDate);
            due.setHours(0, 0, 0, 0);
            return due.getTime() === today.getTime();
        }).length;

        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        const dueThisWeek = tasks.filter(t => {
            if (!t.dueDate || t.status === 'done') return false;
            const due = new Date(t.dueDate);
            return due >= today && due <= weekFromNow;
        }).length;

        document.getElementById('modalTotalTasks').textContent = total;
        document.getElementById('modalCompletionRate').textContent = completionRate + '%';
        document.getElementById('modalHighPriority').textContent = highPriority;
        document.getElementById('modalOverdue').textContent = overdue;
        document.getElementById('modalDueToday').textContent = dueToday;
        document.getElementById('modalDueThisWeek').textContent = dueThisWeek;

        // Priority breakdown
        const priorities = {
            high: tasks.filter(t => t.priority === 'high').length,
            medium: tasks.filter(t => t.priority === 'medium').length,
            low: tasks.filter(t => t.priority === 'low').length
        };

        const maxPriority = Math.max(priorities.high, priorities.medium, priorities.low, 1);
        
        document.getElementById('barHigh').style.width = (priorities.high / maxPriority * 100) + '%';
        document.getElementById('barMedium').style.width = (priorities.medium / maxPriority * 100) + '%';
        document.getElementById('barLow').style.width = (priorities.low / maxPriority * 100) + '%';
        
        document.getElementById('countHigh').textContent = priorities.high;
        document.getElementById('countMedium').textContent = priorities.medium;
        document.getElementById('countLow').textContent = priorities.low;
    }

    // Drag and Drop handlers
    handleDragStart(e, taskId) {
        this.draggedTask = taskId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        e.currentTarget.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.task-list').forEach(list => {
            list.classList.remove('drag-over');
        });
    }

    // Export tasks
    exportTasks() {
        const dataStr = JSON.stringify(this.tasks, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tasks-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        this.showToast('Tasks exported successfully', 'success');
    }

    // Import tasks
    importTasks(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedTasks = JSON.parse(event.target.result);
                if (Array.isArray(importedTasks)) {
                    if (confirm('This will replace all current tasks. Continue?')) {
                        this.tasks = importedTasks;
                        this.saveTasks();
                        this.applyFilters();
                        this.updateTaskCounts();
                        this.updateStatistics();
                        this.showToast('Tasks imported successfully', 'success');
                    }
                } else {
                    this.showToast('Invalid file format', 'error');
                }
            } catch (error) {
                this.showToast('Error importing tasks: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Timer Management
    startTimer(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.status === 'inprogress') {
            // If task already has a start time, don't reset it
            if (!task.startTime) {
                task.startTime = new Date().toISOString();
            }
            // Initialize timeSpent if it doesn't exist
            if (!task.timeSpent) {
                task.timeSpent = 0; // in seconds
            }
            this.saveTasks();
        }
    }

    stopTimer(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task && task.startTime) {
            const startTime = new Date(task.startTime);
            const endTime = new Date();
            const elapsed = Math.floor((endTime - startTime) / 1000); // in seconds
            
            // Add to existing timeSpent if task was paused/resumed
            task.timeSpent = (task.timeSpent || 0) + elapsed;
            task.totalTime = task.timeSpent; // Store total time
            task.startTime = null; // Clear start time
            this.saveTasks();
        }
    }

    // Calculate elapsed time for in-progress tasks
    getElapsedTime(task) {
        if (!task.startTime) {
            return task.timeSpent || 0;
        }
        const startTime = new Date(task.startTime);
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000); // in seconds
        return (task.timeSpent || 0) + elapsed;
    }

    // Format time in seconds to readable format (minutes and seconds)
    formatTime(seconds) {
        if (!seconds || seconds < 0) return '0m 0s';
        
        const totalMinutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        
        // Always show minutes and seconds
        return `${totalMinutes}m ${secs}s`;
    }

    // Update all active timers
    startTimerUpdates() {
        setInterval(() => {
            this.updateAllTimers();
        }, 1000); // Update every second
    }

    // Update timer displays for all in-progress tasks
    updateAllTimers() {
        const inProgressTasks = this.tasks.filter(t => t.status === 'inprogress');
        
        inProgressTasks.forEach(task => {
            // Start timer if it's in progress but doesn't have a start time
            if (!task.startTime) {
                task.startTime = new Date().toISOString();
                if (!task.timeSpent) {
                    task.timeSpent = 0;
                }
                this.saveTasks();
            }
            
            // Find the card using the data attribute
            const card = document.querySelector(`[data-task-id="${task.id}"]`);
            if (card) {
                const timerElement = card.querySelector('.task-timer');
                if (timerElement) {
                    const elapsed = this.getElapsedTime(task);
                    const formattedTime = this.formatTime(elapsed);
                    timerElement.textContent = formattedTime;
                }
            }
        });
    }
}

// Global drag and drop handlers
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const taskId = taskManager.draggedTask;
    if (!taskId) return;

    const newStatus = e.currentTarget.closest('.column').getAttribute('data-status');
    const task = taskManager.tasks.find(t => t.id === taskId);
    
    if (task && task.status !== newStatus) {
        const oldStatus = task.status;
        
        // Handle timer logic based on status changes
        if (oldStatus === 'inprogress' && newStatus !== 'inprogress') {
            // Stop timer if moving out of in-progress
            taskManager.stopTimer(taskId);
        }
        
        if (newStatus === 'inprogress' && oldStatus !== 'inprogress') {
            // Start timer if moving to in-progress
            taskManager.startTimer(taskId);
        }
        
        if (newStatus === 'done' && oldStatus !== 'done') {
            // Stop timer and calculate total time when completing
            if (oldStatus === 'inprogress') {
                taskManager.stopTimer(taskId);
            }
            const card = document.querySelector(`[data-task-id="${taskId}"]`);
            if (card) {
                card.classList.add('completing');
                setTimeout(() => card.classList.remove('completing'), 500);
            }
            const totalTime = task.totalTime || 0;
            taskManager.showToast(`Task completed! 🎉 (Time: ${taskManager.formatTime(totalTime)})`, 'success');
        }
        
        task.status = newStatus;
        taskManager.saveTasks();
        taskManager.applyFilters();
        taskManager.updateTaskCounts();
        taskManager.updateStatistics();
    }
    
    taskManager.draggedTask = null;
}

// Initialize the app
let taskManager;
document.addEventListener('DOMContentLoaded', () => {
    // Show welcome screen first
    const welcomeScreen = document.getElementById('welcomeScreen');
    
    // Hide welcome screen after 3 seconds and initialize app
    setTimeout(() => {
        welcomeScreen.classList.add('hidden');
        // Initialize task manager after welcome screen fades out
        taskManager = new TaskManager();
    }, 3000);
});
