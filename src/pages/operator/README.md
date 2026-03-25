# Operator Flow Documentation

## Overview
The Operator portal provides a dedicated interface for shop floor operators to manage their assigned tasks, track time, and view their schedule.

## Features

### 1. Operator Dashboard (`/operator/dashboard`)
- **Calendar View**: Day/Week/Month views of assigned tasks
- **Workstation Filter**: Toggle between different workstations
- **Task Cards**: Display Account Name, Job Name, Workstation, FAB ID
- **Quick Stats**: Total tasks, active jobs, workstation count

### 2. Task Details Page (`/operator/task/:jobId`)
- **Large Timer Display**: Optimized for tablet/iPad visibility
- **Timer Controls**: Start, Pause, Resume, Stop buttons
- **Estimated Hours**: Visual progress bar showing time usage
- **Job Information**: Complete job details at a glance
- **Timer History**: Recent timer actions and durations

### 3. Timer Component
- **Real-time Updates**: Live timer tracking
- **Status Indicators**: Color-coded status (Running, Paused, Stopped)
- **Touch-Friendly**: Large buttons (64px height) for easy interaction
- **Time Visualization**: Progress bar with color coding based on estimated time usage

## API Integration

### Endpoints Used

#### Operator Workstations
```
GET /api/v1/operators/{operator_id}/workstations
```
Returns all workstations assigned to an operator.

#### Operator Tasks
```
GET /api/v1/operators/me/tasks?view=week&reference_date=2025-01-01
```
Returns tasks assigned to the current operator with calendar window filtering.

#### Timer Management
```
POST /api/v1/operators/me/jobs/{job_id}/timer/action
Body: { action: 'start' | 'pause' | 'resume' | 'stop', timestamp?: string, note?: string }
```
Start, pause, resume, or stop timer for a job.

#### Timer State
```
GET /api/v1/operators/me/jobs/{job_id}/timer
```
Get current timer state for a job.

#### Timer History
```
GET /api/v1/operators/me/jobs/{job_id}/timer/history
```
Get timer session and event history.

## File Structure

```
src/
├── pages/
│   └── operator/
│       ├── Dashboard.tsx              # Main calendar dashboard
│       ├── TaskDetails.tsx            # Task details with timer
│       ├── components/
│       │   ├── TimerComponent.tsx     # Reusable timer component
│       │   └── WorkstationToggle.tsx  # Workstation filter toggle
│       └── index.ts                   # Exports
├── store/
│   └── api/
│       └── operator.ts                # RTK Query API slice
├── routing/
│   └── app-routing-setup.tsx          # Routes added
└── config/
    └── menu.config.tsx                # Menu item added
```

## Usage

### Accessing the Operator Portal
1. Navigate to `/operator/dashboard`
2. View your assigned tasks in the calendar
3. Use workstation toggles to filter tasks
4. Click on any task card to view details and start timer

### Timer Operations
1. **Start Timer**: Click "Start" button when beginning work
2. **Pause Timer**: Click "Pause" when taking a break
3. **Resume Timer**: Click "Resume" to continue after pause
4. **Stop Timer**: Click "Stop" when work is complete

### Best Practices
- Always start timer before beginning work
- Pause timer when stepping away from task
- Stop timer when task is completed
- Review timer history to track time spent

## Technical Details

### State Management
- Uses RTK Query for data fetching and caching
- Optimistic updates for timer actions
- Automatic refetch on mutation invalidation

### Responsive Design
- Mobile-first approach
- Tablet/iPad optimized with large touch targets
- Minimum button height: 64px
- Clear visual feedback for all states

### Permissions
- Only accessible to users with operator role
- Protected routes via authentication context
- Workstation assignments determine visible tasks

## Future Enhancements
- Offline timer support
- Batch timer operations
- Export time reports
- Real-time notifications
- Multi-task timer support
