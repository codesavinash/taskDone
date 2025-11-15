// Task Management App
class TaskManager {
    constructor() {
        this.tasks = [];
        this.currentTaskId = null;
        this.draggedTask = null;
        this.filteredTasks = null;
        this.currentFilter = { priority: 'all', sort: 'date' };
        this.currentMemberId = null; // Track which member's routines are being viewed
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
        // Skip member mode if we're explicitly switching to regular
        if (this._switchingToRegular) {
            // Load regular tasks directly
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
                            const diffMinutes = (now - startTime) / (1000 * 60);
                            
                            // If timer is less than 24 hours old, resume it
                            if (diffMinutes < 24 * 60) {
                                // Timer is still valid, it will continue on next update
                            } else {
                                // Timer is too old, reset status
                                task.status = 'todo';
                                task.startTime = null;
                            }
                        }
                    }
                });
            } else {
                this.tasks = [];
            }
            // Ensure indicator is hidden
            routineManager?.hideCurrentMemberIndicator();
            this.currentMemberId = null;
            return;
        }
        
        // Check URL parameter first (for new tab scenario)
        const urlParams = new URLSearchParams(window.location.search);
        const memberIdFromUrl = urlParams.get('member');
        
        // Check if we're in routine mode (from localStorage or URL)
        let currentMemberId = memberIdFromUrl || localStorage.getItem('currentMemberId');
        
        // Don't load member tasks if currentMemberId is explicitly null or we're switching
        if (currentMemberId && currentMemberId !== 'null' && this.currentMemberId !== null && !this._switchingToRegular) {
            this.currentMemberId = currentMemberId;
            // Save to localStorage if from URL
            if (memberIdFromUrl) {
                localStorage.setItem('currentMemberId', memberIdFromUrl);
            }
            
            // Load tasks from routine manager
            const routines = localStorage.getItem('routines');
            if (routines) {
                const routinesData = JSON.parse(routines);
                const member = routinesData.members.find(m => m.id === currentMemberId);
                if (member) {
                    this.tasks = member.tasks || [];
                    // Show member indicator and apply theme only if still in member mode
                    const savedMemberId = currentMemberId; // Capture value for setTimeout
                    setTimeout(() => {
                        // Double-check we're still in member mode (might have switched during timeout)
                        if (routineManager && this.currentMemberId && this.currentMemberId === savedMemberId && !this._switchingToRegular) {
                            routineManager.showCurrentMemberIndicator(member.name);
                            routineManager.applyMemberTheme(savedMemberId);
                        }
                    }, 100);
                    return;
                }
            }
        } else {
            // Not in member mode - ensure indicator is hidden
            routineManager?.hideCurrentMemberIndicator();
            this.currentMemberId = null;
        }
        
        // Load regular tasks
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
            // If in routine mode, save to member's tasks
            if (this.currentMemberId) {
                const routines = localStorage.getItem('routines');
                if (routines) {
                    const routinesData = JSON.parse(routines);
                    const member = routinesData.members.find(m => m.id === this.currentMemberId);
                    if (member) {
                        member.tasks = this.tasks;
                        localStorage.setItem('routines', JSON.stringify(routinesData));
                        return;
                    }
                }
            }
            // Save regular tasks
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        }
    }
    
    // Switch to member's routine view
    switchToMember(memberId) {
        this.currentMemberId = memberId;
        localStorage.setItem('currentMemberId', memberId);
        
        // Apply member's color theme
        routineManager?.applyMemberTheme(memberId);
        
        this.loadTasks();
        this.renderTasks();
        this.updateTaskCounts();
        this.updateStatistics();
    }
    
    // Switch back to regular tasks
    switchToRegular() {
        this.currentMemberId = null;
        localStorage.removeItem('currentMemberId');
        
        // Clear URL parameter if present
        if (window.location.search.includes('member=')) {
            const url = new URL(window.location.href);
            url.searchParams.delete('member');
            window.history.replaceState({}, '', url);
        }
        
        // Hide member indicator FIRST before removing theme
        routineManager?.hideCurrentMemberIndicator();
        
        // Remove member theme
        routineManager?.removeMemberTheme();
        
        // Set a flag to prevent loadTasks from showing member view
        this._switchingToRegular = true;
        
        this.loadTasks();
        this.renderTasks();
        this.updateTaskCounts();
        this.updateStatistics();
        
        // Clear the flag after a short delay
        setTimeout(() => {
            this._switchingToRegular = false;
        }, 200);
        
        console.log('Switched to regular tasks - currentMemberId:', this.currentMemberId);
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
            this.initMobileMinimalistTabs();
            this.showToast('Minimalist view enabled', 'info');
        } else {
            document.body.classList.remove('minimalist-view');
            this.removeMobileMinimalistTabs();
            this.showToast('Minimalist view disabled', 'info');
        }
        this.saveSettings();
    }

    // Initialize mobile minimalist tabs
    initMobileMinimalistTabs() {
        // Only create tabs on mobile screens
        if (window.innerWidth > 768) return;
        
        const boardContainer = document.querySelector('.board-container');
        if (!boardContainer) return;

        // Remove existing tabs if any
        this.removeMobileMinimalistTabs();

        // Create tabs container
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'mobile-minimalist-tabs';
        tabsContainer.id = 'mobileMinimalistTabs';

        const tabs = [
            { status: 'todo', icon: 'fa-list-ul', label: 'Todo' },
            { status: 'inprogress', icon: 'fa-spinner', label: 'In Progress' },
            { status: 'done', icon: 'fa-check-circle', label: 'Done' }
        ];

        tabs.forEach((tab, index) => {
            const tabBtn = document.createElement('button');
            tabBtn.className = 'mobile-minimalist-tab';
            tabBtn.dataset.status = tab.status;
            if (index === 0) tabBtn.classList.add('active');

            const count = this.getTaskCount(tab.status);
            
            tabBtn.innerHTML = `
                <i class="fas ${tab.icon}"></i>
                <span>${tab.label}</span>
                ${count > 0 ? `<span class="mobile-minimalist-tab-badge">${count}</span>` : ''}
            `;

            tabBtn.addEventListener('click', () => this.switchMobileTab(tab.status));
            tabsContainer.appendChild(tabBtn);
        });

        // Insert tabs before board container
        boardContainer.parentElement.insertBefore(tabsContainer, boardContainer);

        // Set initial active column
        this.switchMobileTab('todo');
    }

    // Remove mobile minimalist tabs
    removeMobileMinimalistTabs() {
        const tabsContainer = document.getElementById('mobileMinimalistTabs');
        if (tabsContainer) {
            tabsContainer.remove();
        }
        // Remove active class from all columns and ensure they're visible
        document.querySelectorAll('.column').forEach(col => {
            col.classList.remove('active');
            col.style.display = ''; // Reset display to default
        });
    }

    // Switch mobile tab
    switchMobileTab(status) {
        // Update tab buttons
        document.querySelectorAll('.mobile-minimalist-tab').forEach(tab => {
            if (tab.dataset.status === status) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Update column visibility
        document.querySelectorAll('.column').forEach(column => {
            if (column.dataset.status === status) {
                column.classList.add('active');
            } else {
                column.classList.remove('active');
            }
        });
    }

    // Get task count for a status
    getTaskCount(status) {
        const tasks = this.filteredTasks || this.tasks;
        return tasks.filter(t => t.status === status).length;
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

        // Handle window resize for mobile minimalist tabs
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (document.body.classList.contains('minimalist-view')) {
                    // Remove tabs if switching to desktop
                    if (window.innerWidth > 768) {
                        this.removeMobileMinimalistTabs();
                        // Show all columns on desktop
                        document.querySelectorAll('.column').forEach(col => {
                            col.classList.remove('active');
                            col.style.display = '';
                        });
                    } else {
                        // Reinitialize tabs if switching to mobile
                        if (!document.getElementById('mobileMinimalistTabs')) {
                            this.initMobileMinimalistTabs();
                        }
                    }
                }
            }, 250);
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

        // Search removed - no longer needed

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

            // Search shortcut removed

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
        this.currentFilter = { priority: 'all', sort: 'date' };
        this.applyFilters();
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

        // Update mobile minimalist tab badges if they exist
        if (document.body.classList.contains('minimalist-view') && window.innerWidth <= 768) {
            this.updateMobileTabBadges(counts);
        }
    }

    // Update mobile tab badges
    updateMobileTabBadges(counts) {
        const tabs = document.querySelectorAll('.mobile-minimalist-tab');
        tabs.forEach(tab => {
            const status = tab.dataset.status;
            const count = counts[status] || 0;
            
            // Remove existing badge
            const existingBadge = tab.querySelector('.mobile-minimalist-tab-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Add badge if count > 0
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'mobile-minimalist-tab-badge';
                badge.textContent = count;
                tab.appendChild(badge);
            }
        });
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

// Pomodoro Timer Class
class PomodoroTimer {
    constructor() {
        this.presets = {
            short: { work: 25 * 60, break: 5 * 60 },
            long: { work: 45 * 60, break: 10 * 60 }
        };
        
        this.currentPreset = null;
        this.currentMode = 'work'; // 'work' or 'break'
        this.timeRemaining = 0;
        this.totalTime = 0;
        this.intervalId = null;
        this.isRunning = false;
        this.isPaused = false;
        
        // DOM elements
        this.modal = document.getElementById('pomodoroModal');
        this.presetsContainer = document.getElementById('pomodoroPresets');
        this.timerContainer = document.getElementById('pomodoroTimerContainer');
        this.timeDisplay = document.getElementById('pomodoroTime');
        this.modeBadge = document.getElementById('pomodoroModeBadge');
        this.modeText = document.getElementById('pomodoroModeText');
        this.progressCircle = document.getElementById('pomodoroProgressCircle');
        this.startPauseBtn = document.getElementById('pomodoroStartPauseBtn');
        this.resetBtn = document.getElementById('pomodoroResetBtn');
        
        // Minimized timer elements
        this.minimizedTimer = document.getElementById('pomodoroMinimized');
        this.minimizedTime = document.getElementById('pomodoroMinimizedTime');
        this.minimizedMode = document.getElementById('pomodoroMinimizedMode');
        this.minimizedProgress = document.getElementById('pomodoroMinimizedProgress');
        this.minimizedControl = document.getElementById('pomodoroMinimizedControl');
        this.minimizedStop = document.getElementById('pomodoroMinimizedStop');
        this.minimizedExpand = document.getElementById('pomodoroMinimizedExpand');
        
        // Stop button in modal
        this.stopBtn = document.getElementById('pomodoroStopBtn');
        
        // Calculate circumference for progress ring (2 * PI * r, where r = 140)
        this.circumference = 2 * Math.PI * 140;
        
        this.init();
    }
    
    init() {
        this.loadState();
        this.setupEventListeners();
        this.updateDisplay();
    }
    
    setupEventListeners() {
        // Preset buttons
        document.querySelectorAll('.pomodoro-preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const preset = e.currentTarget.getAttribute('data-preset');
                this.selectPreset(preset);
            });
        });
        
        // Start/Pause button
        this.startPauseBtn.addEventListener('click', () => {
            if (this.isRunning) {
                this.pause();
            } else {
                this.start();
            }
        });
        
        // Reset button
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.reset();
            });
        }
        
        // Close modal button
        document.getElementById('closePomodoroBtn').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Close modal on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });
        
        // Minimized timer controls
        this.minimizedControl.addEventListener('click', () => {
            if (this.isRunning) {
                this.pause();
            } else {
                this.start();
            }
        });
        
        this.minimizedStop.addEventListener('click', () => {
            this.stop();
        });
        
        this.minimizedExpand.addEventListener('click', () => {
            this.openModal();
        });
        
        // Stop button in modal
        this.stopBtn.addEventListener('click', () => {
            this.stop();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.modal.classList.contains('show') && !this.isRunning) return;
            
            if (e.key === ' ' || e.key === 'Space') {
                e.preventDefault();
                if (this.isRunning) {
                    this.pause();
                } else {
                    this.start();
                }
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                this.reset();
            }
        });
    }
    
    selectPreset(presetName) {
        this.currentPreset = presetName;
        this.currentMode = 'work';
        this.totalTime = this.presets[presetName].work;
        this.timeRemaining = this.totalTime;
        this.isRunning = false;
        this.isPaused = false;
        
        // Update UI
        document.querySelectorAll('.pomodoro-preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-preset="${presetName}"]`).classList.add('active');
        
        // Update mode and display
        this.updateMode();
        this.updateDisplay();
        
        // Start timer immediately and close modal
        this.start();
        this.closeModal();
    }
    
    start() {
        if (!this.currentPreset) {
            taskManager?.showToast('Please select a preset first', 'warning');
            return;
        }
        
        if (this.timeRemaining <= 0) {
            this.switchMode();
            return;
        }
        
        this.isRunning = true;
        this.isPaused = false;
        if (this.timerContainer) {
            this.timerContainer.classList.add('running');
        }
        if (this.startPauseBtn) {
            this.startPauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
        }
        
        // Show minimized timer
        this.showMinimizedTimer();
        
        const startTime = Date.now();
        const initialTimeRemaining = this.timeRemaining;
        
        this.intervalId = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            this.timeRemaining = Math.max(0, initialTimeRemaining - elapsed);
            
            this.updateDisplay();
            this.updateMinimizedDisplay();
            
            if (this.timeRemaining <= 0) {
                this.complete();
            }
        }, 100); // Update every 100ms for smooth animations
        
        this.saveState();
    }
    
    pause() {
        this.isRunning = false;
        this.isPaused = true;
        this.timerContainer.classList.remove('running');
        this.startPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
        this.minimizedControl.innerHTML = '<i class="fas fa-play"></i>';
        this.minimizedControl.title = 'Start';
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.saveState();
    }
    
    reset() {
        // Clear any running intervals
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // Reset timer state
        this.isRunning = false;
        this.isPaused = false;
        
        // Remove running/complete classes
        if (this.timerContainer) {
            this.timerContainer.classList.remove('running');
            this.timerContainer.classList.remove('complete');
        }
        
        // Reset time if preset is selected
        if (this.currentPreset) {
            if (this.currentMode === 'work') {
                this.totalTime = this.presets[this.currentPreset].work;
            } else {
                this.totalTime = this.presets[this.currentPreset].break;
            }
            this.timeRemaining = this.totalTime;
        } else {
            // If no preset, reset to default
            this.timeRemaining = 0;
            this.totalTime = 0;
        }
        
        // Update UI buttons
        if (this.startPauseBtn) {
            this.startPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
        }
        if (this.minimizedControl) {
            this.minimizedControl.innerHTML = '<i class="fas fa-pause"></i>';
            this.minimizedControl.title = 'Pause';
        }
        
        // Update displays
        this.updateDisplay();
        this.updateMinimizedDisplay();
        
        // Save state
        this.saveState();
        
        // Show toast notification
        if (taskManager) {
            taskManager.showToast('Timer reset', 'info');
        }
    }
    
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.isRunning = false;
        this.isPaused = false;
        this.timerContainer.classList.remove('running');
        this.timerContainer.classList.remove('complete');
        
        // Reset to initial state
        if (this.currentPreset) {
            this.currentMode = 'work';
            this.totalTime = this.presets[this.currentPreset].work;
            this.timeRemaining = this.totalTime;
        }
        
        // Update UI
        this.startPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
        this.minimizedControl.innerHTML = '<i class="fas fa-pause"></i>';
        this.minimizedControl.title = 'Pause';
        this.updateMode();
        this.updateDisplay();
        this.updateMinimizedDisplay();
        
        // Hide minimized timer and close modal
        this.hideMinimizedTimer();
        this.closeModal();
        
        // Reset state - show presets again
        this.resetState();
        this.currentPreset = null;
        this.saveState();
        
        taskManager?.showToast('Timer stopped', 'info');
    }
    
    switchMode() {
        if (!this.currentPreset) return;
        
        this.timerContainer.classList.add('mode-transitioning');
        
        setTimeout(() => {
            if (this.currentMode === 'work') {
                this.currentMode = 'break';
                this.totalTime = this.presets[this.currentPreset].break;
                taskManager?.showToast('Break time! Take a rest 🎉', 'success');
            } else {
                this.currentMode = 'work';
                this.totalTime = this.presets[this.currentPreset].work;
                taskManager?.showToast('Back to work! Let\'s focus 💪', 'info');
            }
            
            this.timeRemaining = this.totalTime;
            this.isRunning = false;
            this.isPaused = false;
            
            this.updateMode();
            this.updateDisplay();
            this.timerContainer.classList.remove('mode-transitioning');
            this.timerContainer.classList.remove('complete');
            this.timerContainer.classList.remove('running');
            this.startPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Start</span>';
            
            this.saveState();
            
            // Request browser notification if available
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(
                    this.currentMode === 'break' ? 'Break Time!' : 'Work Time!',
                    {
                        body: this.currentMode === 'break' 
                            ? 'Take a well-deserved break!'
                            : 'Time to focus and get things done!',
                        icon: '/favicon.ico'
                    }
                );
            }
        }, 500);
    }
    
    complete() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.isRunning = false;
        this.timerContainer.classList.remove('running');
        this.timerContainer.classList.add('complete');
        this.minimizedControl.innerHTML = '<i class="fas fa-play"></i>';
        this.minimizedControl.title = 'Start';
        
        const modeText = this.currentMode === 'work' ? 'Work session' : 'Break';
        taskManager?.showToast(`${modeText} completed! 🎉`, 'success');
        
        // Request browser notification if available
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(
                `${modeText} Completed!`,
                {
                    body: this.currentMode === 'work' 
                        ? 'Great work! Time for a break.'
                        : 'Break over! Ready to get back to work?',
                    icon: '/favicon.ico'
                }
            );
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
        
        setTimeout(() => {
            this.switchMode();
            if (this.isRunning) {
                this.showMinimizedTimer();
            }
        }, 2000);
        
        this.saveState();
    }
    
    updateMode() {
        this.timerContainer.classList.remove('mode-work', 'mode-break');
        this.timerContainer.classList.add(`mode-${this.currentMode}`);
        this.modeBadge.textContent = this.currentMode === 'work' ? 'Work' : 'Break';
        this.modeText.textContent = this.currentMode === 'work' ? 'Work Time' : 'Break Time';
        
        // Update minimized timer mode
        if (this.minimizedTimer) {
            this.minimizedTimer.classList.remove('mode-work', 'mode-break');
            this.minimizedTimer.classList.add(`mode-${this.currentMode}`);
            this.minimizedMode.textContent = this.currentMode === 'work' ? 'Work' : 'Break';
        }
    }
    
    updateDisplay() {
        // Update time display
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        this.timeDisplay.textContent = timeString;
        
        // Update circular progress
        if (this.totalTime > 0) {
            const progress = (this.totalTime - this.timeRemaining) / this.totalTime;
            const offset = this.circumference - (progress * this.circumference);
            this.progressCircle.style.strokeDashoffset = offset;
        }
    }
    
    updateMinimizedDisplay() {
        if (!this.minimizedTimer || this.minimizedTimer.style.display === 'none') return;
        
        // Update time
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = this.timeRemaining % 60;
        this.minimizedTime.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Update progress bar
        if (this.totalTime > 0) {
            const progress = ((this.totalTime - this.timeRemaining) / this.totalTime) * 100;
            this.minimizedProgress.style.width = `${progress}%`;
        }
    }
    
    showMinimizedTimer() {
        if (!this.minimizedTimer) return;
        
        this.minimizedTimer.style.display = 'block';
        this.minimizedTimer.classList.remove('hiding');
        this.minimizedTimer.classList.remove('mode-work', 'mode-break');
        this.minimizedTimer.classList.add(`mode-${this.currentMode}`);
        this.minimizedControl.innerHTML = '<i class="fas fa-pause"></i>';
        this.minimizedControl.title = 'Pause';
        this.updateMinimizedDisplay();
    }
    
    hideMinimizedTimer() {
        if (!this.minimizedTimer) return;
        
        this.minimizedTimer.classList.add('hiding');
        setTimeout(() => {
            this.minimizedTimer.style.display = 'none';
            this.minimizedTimer.classList.remove('hiding');
        }, 400);
    }
    
    openModal() {
        this.modal.classList.add('show');
        this.loadState();
        // Don't hide minimized timer when opening modal - user can see both
    }
    
    closeModal() {
        this.modal.classList.remove('show');
    }
    
    saveState() {
        const state = {
            preset: this.currentPreset,
            mode: this.currentMode,
            timeRemaining: this.timeRemaining,
            totalTime: this.totalTime,
            isRunning: this.isRunning,
            isPaused: this.isPaused,
            timestamp: Date.now()
        };
        localStorage.setItem('pomodoroTimer', JSON.stringify(state));
    }
    
    loadState() {
        const saved = localStorage.getItem('pomodoroTimer');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                
                // Only restore if it was saved recently (within last 24 hours)
                const hoursSinceSave = (Date.now() - state.timestamp) / (1000 * 60 * 60);
                if (hoursSinceSave > 24) {
                    this.resetState();
                    return;
                }
                
                // Restore if timer was running and less than a minute has passed
                if (state.isRunning && hoursSinceSave < (1 / 60)) {
                    this.currentPreset = state.preset;
                    this.currentMode = state.mode;
                    this.totalTime = state.totalTime;
                    
                    // Adjust time remaining based on elapsed time
                    const elapsed = Math.floor((Date.now() - state.timestamp) / 1000);
                    this.timeRemaining = Math.max(0, state.timeRemaining - elapsed);
                    
                    if (this.timeRemaining <= 0) {
                        this.switchMode();
                    } else {
                        this.updateMode();
                        this.updateDisplay();
                        this.timerContainer.style.display = 'flex';
                        this.presetsContainer.style.display = 'none';
                        document.querySelector(`[data-preset="${state.preset}"]`)?.classList.add('active');
                        
                        // Auto-resume if it was running
                        if (state.isRunning && this.timeRemaining > 0) {
                            this.showMinimizedTimer();
                            // Don't call start() here as it will close modal - just show minimized
                            // Start will be called when user interacts or auto-starts
                            this.isRunning = true;
                            this.isPaused = false;
                            this.timerContainer.classList.add('running');
                            this.startPauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
                            this.minimizedControl.innerHTML = '<i class="fas fa-pause"></i>';
                            this.minimizedControl.title = 'Pause';
                            const startTime = Date.now();
                            const initialTimeRemaining = this.timeRemaining;
                            
                            this.intervalId = setInterval(() => {
                                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                                this.timeRemaining = Math.max(0, initialTimeRemaining - elapsed);
                                
                                this.updateDisplay();
                                this.updateMinimizedDisplay();
                                
                                if (this.timeRemaining <= 0) {
                                    this.complete();
                                }
                            }, 100);
                        }
                    }
                } else if (state.preset) {
                    // Restore preset but don't auto-start
                    this.currentPreset = state.preset;
                    this.currentMode = state.mode;
                    this.totalTime = state.mode === 'work' 
                        ? this.presets[state.preset].work 
                        : this.presets[state.preset].break;
                    this.timeRemaining = state.timeRemaining || this.totalTime;
                    this.updateMode();
                    this.updateDisplay();
                    this.timerContainer.style.display = 'flex';
                    this.presetsContainer.style.display = 'none';
                    document.querySelector(`[data-preset="${state.preset}"]`)?.classList.add('active');
                }
            } catch (e) {
                console.error('Error loading pomodoro state:', e);
                this.resetState();
            }
        } else {
            this.resetState();
        }
    }
    
    resetState() {
        this.timerContainer.style.display = 'none';
        this.presetsContainer.style.display = 'grid';
        document.querySelectorAll('.pomodoro-preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }
}

// Routine Manager Class
class RoutineManager {
    constructor() {
        this.members = [];
        this.currentEditingMemberId = null;
        this.currentRoutines = [];
        
        // DOM elements
        this.routineModal = document.getElementById('routineModal');
        this.addMemberModal = document.getElementById('addMemberModal');
        this.membersList = document.getElementById('membersList');
        this.memberForm = document.getElementById('memberForm');
        this.routinesList = document.getElementById('routinesList');
        this.routineInput = document.getElementById('routineInput');
        
        this.init();
    }
    
    init() {
        this.loadMembers();
        this.setupEventListeners();
        this.renderMembers();
    }
    
    setupEventListeners() {
        // Routine modal
        document.getElementById('routineBtn').addEventListener('click', () => {
            this.openRoutineModal();
        });
        
        document.getElementById('closeRoutineBtn').addEventListener('click', () => {
            this.closeRoutineModal();
        });
        
        // Add member button
        document.getElementById('addMemberBtn').addEventListener('click', () => {
            this.openAddMemberModal();
        });
        
        // Add member modal
        document.getElementById('closeAddMemberBtn').addEventListener('click', () => {
            this.closeAddMemberModal();
        });
        
        document.getElementById('cancelMemberBtn').addEventListener('click', () => {
            this.closeAddMemberModal();
        });
        
        document.getElementById('saveMemberBtn').addEventListener('click', () => {
            this.saveMember();
        });
        
        // Add routine button
        document.getElementById('addRoutineBtn').addEventListener('click', () => {
            this.addRoutine();
        });
        
        // Enter key on routine input
        this.routineInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.addRoutine();
            }
        });
        
        // Close modals on outside click
        this.routineModal.addEventListener('click', (e) => {
            if (e.target === this.routineModal) {
                this.closeRoutineModal();
            }
        });
        
        this.addMemberModal.addEventListener('click', (e) => {
            if (e.target === this.addMemberModal) {
                this.closeAddMemberModal();
            }
        });
    }
    
    loadMembers() {
        const saved = localStorage.getItem('routines');
        if (saved) {
            const data = JSON.parse(saved);
            this.members = data.members || [];
            
            // Ensure each member has a color theme - regenerate all with green theme
            let needsSave = false;
            this.members.forEach((member, index) => {
                // Regenerate all colors to ensure green theme (or just missing ones)
                // If you want to force regenerate all, change the condition to always regenerate
                if (!member.colorTheme) {
                    member.colorTheme = this.generateMemberColor(member.id);
                    needsSave = true;
                    console.log(`Generated green theme for ${member.name}:`, member.colorTheme);
                }
            });
            
            if (needsSave) {
                this.saveMembers();
                console.log('Saved members with green color themes');
            }
        }
    }
    
    saveMembers() {
        localStorage.setItem('routines', JSON.stringify({ members: this.members }));
    }
    
    // Generate a unique color theme for each member based on their ID
    // All members use green-themed gradients for consistency
    generateMemberColor(memberId) {
        // Use hash of member ID + name to generate consistent colors
        const member = this.members.find(m => m.id === memberId);
        const hashString = memberId + (member ? member.name : '');
        
        let hash = 0;
        for (let i = 0; i < hashString.length; i++) {
            hash = ((hash << 5) - hash) + hashString.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Green-themed color palettes for member routines
        const colorPalettes = [
            { start: '#11998e', end: '#38ef7d' }, // Teal to Green
            { start: '#43e97b', end: '#38f9d7' }, // Green-Cyan
            { start: '#84fab0', end: '#8fd3f4' }, // Light Green-Blue
            { start: '#56ab2f', end: '#a8e063' }, // Dark Green to Light Green
            { start: '#00b894', end: '#00cec9' }, // Teal to Cyan
            { start: '#134e5e', end: '#71b280' }, // Dark Teal to Green
            { start: '#a8edea', end: '#fed6e3' }, // Light Cyan-Pink (softer)
            { start: '#c3ec52', end: '#0ba360' }, // Lime to Green
            { start: '#0fd850', end: '#f9f047' }, // Green to Yellow
            { start: '#2ecc71', end: '#27ae60' }, // Emerald Green
            { start: '#55efc4', end: '#81ecec' }, // Mint to Cyan
            { start: '#1e3c72', end: '#2a5298' }, // Dark Blue (subtle accent)
            { start: '#00b894', end: '#00cec9' }, // Teal to Cyan
            { start: '#16a085', end: '#1abc9c' }, // Sea Green
            { start: '#52c234', end: '#61b15a' }, // Fresh Green
            { start: '#06beb6', end: '#48b1bf' }, // Turquoise
        ];
        
        // Use member index for additional variety
        const memberIndex = this.members.findIndex(m => m.id === memberId);
        const index = (Math.abs(hash) + (memberIndex * 7)) % colorPalettes.length;
        return colorPalettes[index];
    }
    
    // Apply member's color theme
    applyMemberTheme(memberId) {
        // Ensure members are loaded
        if (this.members.length === 0) {
            this.loadMembers();
        }
        
        const member = this.members.find(m => m.id === memberId);
        if (!member) {
            console.error('Member not found:', memberId);
            return;
        }
        
        // Ensure member has a color theme
        if (!member.colorTheme) {
            member.colorTheme = this.generateMemberColor(memberId);
            this.saveMembers();
            console.log('Generated color theme for member:', member.name, member.colorTheme);
        }
        
        const theme = member.colorTheme;
        console.log('Applying theme for member:', member.name, theme);
        
        // Set the theme immediately
        const gradient = `linear-gradient(135deg, ${theme.start} 0%, ${theme.end} 100%)`;
        
        // Remove existing member theme class first to reset
        document.body.classList.remove('member-routine-mode');
        
        // Use requestAnimationFrame to ensure DOM update
        requestAnimationFrame(() => {
            // Add class
            document.body.classList.add('member-routine-mode');
            
            // Set CSS custom properties
            document.body.style.setProperty('--member-gradient-start', theme.start);
            document.body.style.setProperty('--member-gradient-end', theme.end);
            document.body.style.setProperty('--member-background', gradient);
            
            // Force background update - directly set style properties
            document.body.style.background = gradient;
            document.body.style.backgroundImage = gradient;
            document.body.style.backgroundColor = 'transparent';
            
            // Also update via setAttribute to ensure it sticks
            document.body.setAttribute('data-member-theme', memberId);
            document.body.setAttribute('data-theme-colors', `${theme.start}-${theme.end}`);
            
            console.log('Theme applied for', member.name, ':', theme);
            console.log('Background style:', document.body.style.background);
        });
    }
    
    // Remove member theme and restore default
    removeMemberTheme() {
        document.body.classList.remove('member-routine-mode');
        document.body.style.background = '';
        document.body.style.backgroundImage = '';
        document.body.style.removeProperty('--member-gradient-start');
        document.body.style.removeProperty('--member-gradient-end');
        document.body.style.removeProperty('--member-background');
        document.body.removeAttribute('data-member-theme');
    }
    
    renderMembers() {
        if (this.members.length === 0) {
            this.membersList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No members yet. Click "Add Member" to get started!</p>
                </div>
            `;
            return;
        }
        
        const currentMemberId = localStorage.getItem('currentMemberId');
        const html = this.members.map(member => {
            const taskCounts = {
                todo: (member.tasks || []).filter(t => t.status === 'todo').length,
                inprogress: (member.tasks || []).filter(t => t.status === 'inprogress').length,
                done: (member.tasks || []).filter(t => t.status === 'done').length
            };
            const totalTasks = (member.tasks || []).length;
            const isActive = currentMemberId === member.id;
            
            return `
                <div class="member-card ${isActive ? 'active' : ''}" data-member-id="${member.id}" onclick="routineManager.openMemberDashboard('${member.id}')">
                    <div class="member-card-icon">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="member-card-name">${this.escapeHtml(member.name)}</div>
                    <div class="member-card-routines">${totalTasks} ${totalTasks === 1 ? 'routine' : 'routines'}</div>
                    <div class="member-card-actions" onclick="event.stopPropagation();">
                        <button class="member-card-btn" onclick="routineManager.editMember('${member.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="member-card-btn delete" onclick="routineManager.deleteMember('${member.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        this.membersList.innerHTML = html;
    }
    
    openRoutineModal() {
        this.loadMembers();
        this.renderMembers();
        this.routineModal.classList.add('show');
    }
    
    closeRoutineModal() {
        this.routineModal.classList.remove('show');
    }
    
    openAddMemberModal(memberId = null) {
        this.currentEditingMemberId = memberId;
        this.currentRoutines = [];
        
        if (memberId) {
            // Editing existing member
            const member = this.members.find(m => m.id === memberId);
            if (member) {
                document.getElementById('addMemberModalTitle').textContent = 'Edit Member';
                document.getElementById('memberName').value = member.name;
                document.getElementById('memberId').value = memberId;
                this.currentRoutines = member.routines || [];
            }
        } else {
            // Adding new member
            document.getElementById('addMemberModalTitle').textContent = 'Add New Member';
            document.getElementById('memberForm').reset();
            document.getElementById('memberId').value = '';
            this.currentRoutines = [];
        }
        
        this.renderRoutines();
        this.addMemberModal.classList.add('show');
        document.getElementById('memberName').focus();
    }
    
    closeAddMemberModal() {
        this.addMemberModal.classList.remove('show');
        this.currentEditingMemberId = null;
        this.currentRoutines = [];
        document.getElementById('memberForm').reset();
    }
    
    addRoutine() {
        const routineName = this.routineInput.value.trim();
        if (routineName) {
            this.currentRoutines.push(routineName);
            this.routineInput.value = '';
            this.renderRoutines();
        }
    }
    
    removeRoutine(index) {
        this.currentRoutines.splice(index, 1);
        this.renderRoutines();
    }
    
    renderRoutines() {
        if (this.currentRoutines.length === 0) {
            this.routinesList.innerHTML = '<div class="empty-state" style="padding: 1rem; text-align: center; color: var(--text-secondary);">No routines added yet</div>';
            return;
        }
        
        this.routinesList.innerHTML = this.currentRoutines.map((routine, index) => `
            <div class="routine-item">
                <span class="routine-item-name">${this.escapeHtml(routine)}</span>
                <button class="routine-item-remove" onclick="routineManager.removeRoutine(${index})" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
    
    saveMember() {
        const memberName = document.getElementById('memberName').value.trim();
        if (!memberName) {
            taskManager?.showToast('Please enter a member name', 'error');
            return;
        }
        
        const memberId = document.getElementById('memberId').value;
        
        if (memberId) {
            // Update existing member
            const member = this.members.find(m => m.id === memberId);
            if (member) {
                member.name = memberName;
                member.routines = this.currentRoutines;
                
                // Create initial tasks from routines if member has no tasks yet
                if (!member.tasks || member.tasks.length === 0) {
                    member.tasks = this.currentRoutines.map((routine, index) => ({
                        id: Date.now().toString() + index,
                        title: routine,
                        description: '',
                        priority: 'medium',
                        status: 'todo',
                        tags: [],
                        createdAt: new Date().toISOString()
                    }));
                }
                
                taskManager?.showToast('Member updated successfully', 'success');
            }
        } else {
            // Add new member
            const memberId = Date.now().toString();
            const newMember = {
                id: memberId,
                name: memberName,
                routines: this.currentRoutines,
                colorTheme: this.generateMemberColor(memberId), // Assign color theme immediately
                tasks: this.currentRoutines.map((routine, index) => ({
                    id: Date.now().toString() + index,
                    title: routine,
                    description: '',
                    priority: 'medium',
                    status: 'todo',
                    tags: [],
                    createdAt: new Date().toISOString()
                }))
            };
            
            this.members.push(newMember);
            taskManager?.showToast('Member added successfully', 'success');
        }
        
        this.saveMembers();
        this.renderMembers();
        this.closeAddMemberModal();
    }
    
    selectMember(memberId) {
        if (taskManager) {
            taskManager.switchToMember(memberId);
            this.closeRoutineModal();
            
            // Show indicator in navbar
            const member = this.members.find(m => m.id === memberId);
            if (member) {
                this.showCurrentMemberIndicator(member.name);
            }
            
            taskManager.showToast(`Viewing ${member.name}'s routines`, 'info');
        }
    }
    
    openMemberDashboard(memberId) {
        // Open member dashboard in new tab
        const url = window.location.href.split('?')[0] + `?member=${memberId}`;
        window.open(url, '_blank');
    }
    
    editMember(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (member) {
            this.openAddMemberModal(memberId);
        }
    }
    
    deleteMember(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) return;
        
        if (confirm(`Are you sure you want to delete ${member.name} and all their routines?`)) {
            // If this member is currently active, switch back to regular view
            const currentMemberId = localStorage.getItem('currentMemberId');
            if (currentMemberId === memberId) {
                if (taskManager) {
                    taskManager.switchToRegular();
                }
                this.hideCurrentMemberIndicator();
                this.removeMemberTheme();
            }
            
            this.members = this.members.filter(m => m.id !== memberId);
            this.saveMembers();
            this.renderMembers();
            
            taskManager?.showToast('Member deleted', 'info');
        }
    }
    
    showCurrentMemberIndicator(memberName) {
        // Prevent showing if we're hiding/switching
        if (this._hidingIndicator) {
            return;
        }
        
        // Remove existing indicator if present to avoid duplicate listeners
        const existingIndicator = document.getElementById('currentMemberIndicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create new indicator element
        const indicator = document.createElement('div');
        indicator.id = 'currentMemberIndicator';
        indicator.className = 'current-member-indicator';
        indicator.style.cursor = 'pointer';
        indicator.title = 'Click to switch back to regular tasks';
        indicator.style.display = 'inline-flex';
        
        // Set the HTML content
        indicator.innerHTML = `<i class="fas fa-user"></i> <span class="member-indicator-name">${this.escapeHtml(memberName)}</span> <i class="fas fa-times close-indicator" style="margin-left: 0.5rem; font-size: 0.75rem; cursor: pointer;" title="Close"></i>`;
        
        // Add click handler to the entire indicator with debounce
        let clicking = false;
        indicator.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (clicking) return; // Prevent multiple clicks
            clicking = true;
            
            console.log('Member indicator clicked - switching to regular');
            this._hidingIndicator = true; // Set flag to prevent re-showing
            
            if (taskManager) {
                taskManager.switchToRegular();
                this.hideCurrentMemberIndicator();
                taskManager.showToast('Switched to regular tasks', 'info');
            }
            
            // Reset flag after delay
            setTimeout(() => {
                clicking = false;
                this._hidingIndicator = false;
            }, 500);
        });
        
        // Add click handler specifically to the close icon
        const closeIcon = indicator.querySelector('.close-indicator');
        if (closeIcon) {
            let closing = false;
            closeIcon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (closing) return; // Prevent multiple clicks
                closing = true;
                
                console.log('Close icon clicked - switching to regular');
                this._hidingIndicator = true;
                
                if (taskManager) {
                    taskManager.switchToRegular();
                    this.hideCurrentMemberIndicator();
                    taskManager.showToast('Switched to regular tasks', 'info');
                }
                
                setTimeout(() => {
                    closing = false;
                    this._hidingIndicator = false;
                }, 500);
            });
        }
        
        // Append to navbar
        const navTitle = document.querySelector('.nav-title');
        if (navTitle) {
            navTitle.appendChild(indicator);
        }
    }
    
    hideCurrentMemberIndicator() {
        const indicator = document.getElementById('currentMemberIndicator');
        if (indicator) {
            // Completely remove the indicator from DOM
            indicator.remove();
            console.log('Member indicator removed from DOM');
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
let taskManager;
let pomodoroTimer;
let routineManager;

document.addEventListener('DOMContentLoaded', () => {
    // Show welcome screen first
    const welcomeScreen = document.getElementById('welcomeScreen');
    
    // Hide welcome screen after 3 seconds and initialize app
    setTimeout(() => {
        welcomeScreen.classList.add('hidden');
        // Initialize task manager after welcome screen fades out
        taskManager = new TaskManager();
        pomodoroTimer = new PomodoroTimer();
        routineManager = new RoutineManager();
        
        // Connect Pomodoro button
        document.getElementById('pomodoroBtn').addEventListener('click', () => {
            pomodoroTimer.openModal();
        });
        
        // Show current member indicator if viewing a member's routines
        const urlParams = new URLSearchParams(window.location.search);
        const memberIdFromUrl = urlParams.get('member');
        const currentMemberId = memberIdFromUrl || localStorage.getItem('currentMemberId');
        
        if (currentMemberId && currentMemberId !== 'null' && currentMemberId !== null) {
            // If from URL, save to localStorage
            if (memberIdFromUrl) {
                localStorage.setItem('currentMemberId', memberIdFromUrl);
            }
            
            routineManager.loadMembers();
            const member = routineManager.members.find(m => m.id === currentMemberId);
            if (member) {
                // Delay to ensure taskManager is initialized
                setTimeout(() => {
                    if (taskManager && localStorage.getItem('currentMemberId') === currentMemberId) {
                        taskManager.switchToMember(currentMemberId);
                        routineManager.showCurrentMemberIndicator(member.name);
                        routineManager.applyMemberTheme(currentMemberId);
                    }
                }, 100);
            }
        } else {
            // Ensure indicator is hidden if not viewing a member
            routineManager?.hideCurrentMemberIndicator();
        }
        
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, 3000);
});
