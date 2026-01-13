# Drafting Tab Closing Warning System

## Overview
This feature prevents drafters from accidentally losing their work by implementing browser-level warnings when they attempt to close or navigate away from an active drafting session.

## Features Implemented

### 1. Browser-Level Warnings
- **Beforeunload Event**: Triggers when user tries to close tab, refresh page, or navigate away
- **Custom Warning Message**: Clear, informative message explaining the risk
- **Visual Warning**: Prominent warning icon and formatting

### 2. Automatic Session Management
- **Auto-Pause on Close**: Automatically pauses the drafting session when tab is closed
- **Backend Notification**: Sends pause notification with context to backend
- **Session Recovery**: Allows other drafters to resume the session later

### 3. Smart Activation
- **Active Only When Needed**: Warning only shows when drafting is active and not paused
- **State-Based Logic**: `isActive = isDrafting && !isPaused && !hasEnded`
- **No False Positives**: Won't trigger when session is already paused or completed

## Implementation Details

### Hook: `useTabClosingWarning`
Located in: `src/hooks/use-tab-closing-warning.ts`

```typescript
interface UseTabClosingWarningProps {
  isActive: boolean;           // Enable/disable the warning
  warningMessage?: string;     // Custom warning message
  onBeforeUnload?: Function;   // Callback for additional logic
}
```

### Integration in DrafterDetailsPage
```typescript
useTabClosingWarning({
  isActive: isDrafting && !isPaused && !hasEnded,
  warningMessage: '⚠️ ACTIVE DRAFTING SESSION ⚠️\n\nYou have an active drafting session in progress...',
  onBeforeUnload: async (event) => {
    // Auto-pause the session
    await manageDraftingSession({
      fab_id: fabId,
      data: {
        action: 'auto_pause',
        drafter_id: currentEmployeeId,
        timestamp: new Date().toISOString(),
        note: 'Auto-paused due to tab closing/browser navigation'
      }
    });
  }
});
```

## User Experience

### Warning Message Display
When user attempts to close tab while actively drafting:
```
⚠️ ACTIVE DRAFTING SESSION ⚠️

You have an active drafting session in progress. Closing this tab will 
pause your session and may result in lost work.

Please pause your session properly before leaving.
```

### Browser Behavior
- **Modern Browsers**: Show custom message in dialog
- **Older Browsers**: Show generic "Leave site?" message
- **Mobile Browsers**: Handle appropriately with native dialogs

### Session State Transitions
```
Normal Operation:
Start Drafting → [Warning Active] → Pause Drafting → [Warning Inactive]

Auto-Recovery Scenario:
Start Drafting → [User closes tab] → Auto-Pause → Other drafter resumes
```

## Technical Considerations

### Event Handling
- **beforeunload**: Primary event for tab closing detection
- **visibilitychange**: Secondary event for tab minimization/backgrounding
- **Cleanup**: Proper removal of event listeners to prevent memory leaks

### Error Handling
- Graceful degradation if auto-pause API call fails
- Console logging for debugging purposes
- No user-facing errors for failed auto-pause attempts

### Performance Impact
- Minimal overhead (single useEffect hook)
- No continuous polling or background processes
- Only active when drafting session is running

## Backend Integration

### Auto-Pause API Call
```json
POST /api/v1/drafting/{fab_id}/session
{
  "action": "auto_pause",
  "drafter_id": 123,
  "timestamp": "2026-01-08T10:30:00Z",
  "note": "Auto-paused due to tab closing/browser navigation"
}
```

### Expected Backend Response
- Log the auto-pause event
- Update session status to "paused"
- Store the auto-pause reason for audit trail
- Allow session resumption by other authorized drafters

## Security & Permissions

### Access Control
- Only authenticated users can trigger auto-pause
- Session ownership validation on backend
- Proper authorization checks for session management

### Data Integrity
- Atomic session state updates
- Prevent race conditions during auto-pause
- Maintain complete audit trail of all session actions

## Testing Scenarios

### Manual Testing
1. Start drafting session
2. Attempt to close browser tab
3. Verify warning message appears
4. Confirm session auto-pauses when closing
5. Test with paused/ended sessions (should not warn)

### Edge Cases
- Browser refresh vs tab close
- Multiple tabs with same session
- Network failures during auto-pause
- Mobile browser behavior
- Browser extensions that block beforeunload

## Future Enhancements

### Potential Improvements
- Local storage backup of unsaved work
- Reconnection detection for accidental refreshes
- Progressive web app offline support
- Enhanced session recovery workflows
- Integration with browser notifications

### Analytics
- Track frequency of auto-pause events
- Monitor session abandonment rates
- Analyze user behavior patterns
- Optimize warning timing and messaging

This system ensures drafters never lose work due to accidental navigation while maintaining a smooth user experience.