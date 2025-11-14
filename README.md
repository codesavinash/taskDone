# Task Management Web App

A modern, dynamic, and feature-rich task management application built with HTML, CSS, and JavaScript. Organize your tasks efficiently with drag-and-drop functionality, local storage persistence, and a beautiful, responsive interface.


live demo https://taskdone28.vercel.app/

## ✨ Features

### Core Functionality
- ✅ **Task CRUD Operations**: Create, read, update, and delete tasks
- 📋 **Task Categories**: Organize tasks into three columns (To Do, In Progress, Done)
- 🎯 **Priority Levels**: Assign low, medium, or high priority to tasks
- 📅 **Due Dates**: Set and track due dates with overdue indicators
- 📝 **Task Descriptions**: Add detailed descriptions to your tasks
- 🏷️ **Task Tags**: Add custom tags to categorize and organize tasks

### Interactive Features
- 🖱️ **Drag-and-Drop**: Move tasks between columns by dragging and dropping
- 🔍 **Advanced Search**: Search tasks by title, description, priority, or tags
- 🔽 **Filtering & Sorting**: Filter by priority and sort by date, priority, due date, or title
- 💾 **Local Storage**: All tasks and settings are automatically saved
- 📤 **Export/Import**: Export your tasks as JSON or import from a JSON file
- 📊 **Statistics Dashboard**: Real-time statistics and insights about your tasks

### User Experience
- 📱 **Fully Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- 🌙 **Dark Mode**: Toggle between light and dark themes
- 🎨 **Color-Coded Categories**: Visual distinction between task statuses
- 🎭 **Priority Indicators**: Color-coded borders and badges for task priorities
- ✨ **Smooth Animations**: Engaging animations for drag-and-drop, task completion, and interactions
- 🔔 **Toast Notifications**: Beautiful toast notifications for user feedback
- ⌨️ **Keyboard Shortcuts**: Power user shortcuts for faster task management
- 📈 **Task Statistics**: Comprehensive statistics modal with priority breakdown

## 🚀 Getting Started

1. **Open the Application**
   - Simply open `index.html` in your web browser
   - No installation or build process required!

2. **Create Your First Task**
   - Click the "+" button in any column (To Do, In Progress, or Done)
   - Or press `N` on your keyboard
   - Fill in the task details:
     - Title (required)
     - Description (optional)
     - Priority (Low, Medium, or High)
     - Tags (comma-separated, press Enter after each)
     - Due Date (optional)
   - Click "Save Task" or press `Ctrl+S`

3. **Manage Tasks**
   - **Edit**: Click the edit icon (✏️) on any task card
   - **Delete**: Click the delete icon (🗑️) on any task card
   - **Move**: Drag and drop tasks between columns to change their status
   - **Complete**: Drag a task to "Done" column for a celebration animation!

4. **Search & Filter**
   - Use the search bar at the top to filter tasks by title, description, priority, or tags
   - Use the priority filter dropdown to show only specific priorities
   - Use the sort dropdown to organize tasks by date, priority, due date, or title
   - Click "Clear Filters" to reset all filters

5. **View Statistics**
   - Click the statistics icon (📊) in the navigation bar
   - View comprehensive statistics including:
     - Total tasks and completion rate
     - High priority and overdue tasks
     - Tasks due today and this week
     - Priority breakdown with visual bars

6. **Customize Settings**
   - Click the settings icon (⚙️) in the navigation bar
   - Toggle auto-save, statistics dashboard, and animations
   - Export/Import your tasks
   - View keyboard shortcuts

7. **Dark Mode**
   - Click the moon/sun icon in the navigation bar
   - Or press `Ctrl+D` (or `Cmd+D` on Mac)
   - Your preference is automatically saved

## 📁 File Structure

```
Task_management/
├── index.html          # Main HTML structure
├── css/
│   └── styles.css     # Styling, responsive design, and dark mode
├── js/
│   └── script.js      # Application logic and all functionality
└── README.md          # This file
```

## ⌨️ Keyboard Shortcuts

- `N` - Create a new task
- `/` - Focus on search bar
- `Esc` - Close any open modal
- `Ctrl+S` (or `Cmd+S`) - Save task (when modal is open)
- `Ctrl+D` (or `Cmd+D`) - Toggle dark mode

## 🎨 Features in Detail

### Statistics Dashboard
- Real-time task counts for each status
- Overdue task tracking
- Total task count
- Click any stat card to view detailed statistics

### Task Tags
- Add multiple tags to tasks
- Tags are searchable
- Visual tag display on task cards
- Press Enter after typing a tag to add it

### Filtering & Sorting
- **Filter by Priority**: Show only high, medium, or low priority tasks
- **Sort Options**:
  - Date Created (newest first)
  - Priority (high to low)
  - Due Date (earliest first)
  - Title (alphabetical)

### Toast Notifications
- Success notifications (green) for completed actions
- Error notifications (red) for errors
- Info notifications (blue) for information
- Warning notifications (orange) for warnings
- Auto-dismiss after 3 seconds

### Dark Mode
- Smooth theme transition
- Preference saved automatically
- All UI elements adapt to dark theme
- Toggle via button or keyboard shortcut

### Animations
- Task slide-in animation when created
- Drag-and-drop visual feedback
- Task completion celebration animation
- Smooth modal transitions
- Hover effects on interactive elements

## 🌐 Browser Compatibility

This app works in all modern browsers that support:
- HTML5
- CSS3 (Flexbox, Grid, Custom Properties)
- ES6+ JavaScript (Classes, Arrow Functions, Template Literals)
- Local Storage API
- Drag and Drop API

## 💾 Data Storage

All data is stored locally in your browser using the Local Storage API:
- ✅ **Tasks**: All your tasks are saved automatically
- ✅ **Settings**: Dark mode, statistics visibility, and animation preferences
- ✅ **Privacy**: Your data stays on your device
- ✅ **No Internet Required**: Works completely offline
- ✅ **Persistence**: Data persists between browser sessions
- ⚠️ **Backup**: Use Export feature to backup your tasks (clearing browser data will remove them)

## 🎨 Customization

You can customize the app by modifying CSS variables in `css/styles.css`:

```css
:root {
    --primary-color: #6366f1;
    --todo-color: #3b82f6;
    --inprogress-color: #f59e0b;
    --done-color: #10b981;
    --priority-low: #10b981;
    --priority-medium: #f59e0b;
    --priority-high: #ef4444;
    /* ... and more */
}
```

## 💡 Tips & Tricks

- **Quick Task Creation**: Press `N` anywhere to quickly create a task
- **Fast Search**: Press `/` to immediately focus on the search bar
- **Bulk Operations**: Use the "Clear All Tasks" button to remove all tasks at once
- **Priority Colors**: 
  - 🟢 Green = Low Priority
  - 🟡 Yellow = Medium Priority
  - 🔴 Red = High Priority
- **Overdue Tasks**: Tasks past their due date show in red with a pulsing animation
- **Task Completion**: Dragging a task to "Done" triggers a celebration animation
- **Tag Management**: Add tags by typing and pressing Enter, remove by clicking the ×
- **Statistics**: Click the stats icon to see detailed analytics about your tasks

## 🔮 Future Enhancements

Potential features you could add:
- Task comments and notes
- Task attachments
- Task templates
- Recurring tasks
- Task sharing (with backend integration)
- Calendar view
- Task reminders/notifications
- Subtasks/checklists
- Task time tracking
- Collaboration features

## 📝 License

This project is open source and available for personal and commercial use.

---

**Enjoy organizing your tasks! 🚀**

Built with ❤️ using HTML, CSS, and JavaScript
