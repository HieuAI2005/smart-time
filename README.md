**How to install and run your project:**  
✍️  
Clone this repository:  
  ```bash
  git clone <repo-url>
  cd <project-folder>
  npm install 
  npm install localforage @types/localforage
  npm run dev
  ```
Web: http://localhost:5173

## 🔗 Deployed Web URL or APK file
✍️ [[Web Demo](https://smart-time-seven.vercel.app/login)]

## 🎥 Demo Video
**Demo video link (≤ 2 minutes):**  
📌 **Video Upload Guideline:** when uploading your demo video to YouTube, please set the visibility to **Unlisted**.  
- “Unlisted” videos can only be viewed by users who have the link.  
- The video will not appear in search results or on your channel.  
- Share the link in your README so mentors can access it.  

✍️ Video demo (demo.mp4)

## 💻 Project Introduction

### a. Overview

✍️ The To-Do App is a task management tool that helps users organize, schedule, and track their daily tasks. It supports task creation, editing, completion tracking, progress monitoring, and provides feedback with analytics and calendar views.

### b. Key Features & Function Manual

- Add Tasks: Create tasks with title, description, start/due dates, and daily target minutes.
-  Edit Tasks: Update task details anytime.
-  Delete Tasks: Remove tasks you no longer need.
-  Mark as Done: Mark tasks as completed manually or automatically after reaching daily goals.
-  Start/Pause Timer: Track real working time for each task.
-  Subtasks/Checklist: Break tasks into smaller steps.
-  Calendar View: See tasks on weekly/monthly calendars.
-  Analytics Dashboard: View completion percentage, streaks, deficits, and deadline pressure.
-  Notifications: Toast + sound alerts for completed tasks, overdue tasks, or missed quotas.

### c. Unique Features (What’s special about this app?) 

-  Audio + Visual Feedback: Theme colors change and sounds play depending on task outcomes (success, warning, missed).
-  Quota Alerts: If the daily goal is reached but the timer is still running, the app keeps warning until the user clicks Done.
-  Hit Calendar: Days that reach 100% completion are highlighted with a ⭐ in the calendar.
-  Deadline Pressure Metric: Shows how close you are to deadlines, helping to prioritize tasks better.

### d. Technology Stack and Implementation Methods

- Frontend: React + TypeScript
- State Management: Zustand (with persist in localStorage)
- Routing: React Router v6
- Styling: TailwindCSS + custom components
- Date Handling: date-fns
- Persistence: LocalStorage via Zustand persist
- Notifications: HTML5 Audio API for sound, CSS theme switching for UI feedback

### e. Service Architecture & Database structure (when used)

- Architecture: Pure frontend single-page application (SPA). Using IndexedDB through localforage  
- Task Schema (simplified):
'''
type Task = {
  id: string;
  title: string;
  description?: string;
  category: string;
  status: "todo" | "in_progress" | "done";
  dailyMinutes: number;
  startDate: string;
  dueDate: string;
  progress: Record<string, number>; // per day progress
  runningFrom?: string;
  completedAt?: string;
  checklist?: { id: string; text: string; done: boolean }[];
  createdAt: string;
  updatedAt: string;
};
'''

## 🧠 Reflection

### a. If you had more time, what would you expand?

- Add backend & database to sync tasks across devices.
- Support team collaboration (assign tasks, track progress in groups).
- Implement push/email reminders.
- Add dark mode and customizable themes.


### b. If you integrate AI APIs more for your app, what would you do?

- Use AI to suggest optimal daily schedules based on deadlines and user productivity history.
- AI-powered task prioritization.
- Natural language task creation (e.g., “Study math 2 hours every day until Friday”).
- AI productivity coach that gives personalized advice and reminders.

## ✅ Checklist
- [✅] Code runs without errors  
- [✅] All required features implemented (add/edit/delete/complete tasks)  
- [✅] All ✍️ sections are filled  
