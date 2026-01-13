# Drafting Work Percentage Feature

## Overview
This feature adds a percentage of work done dropdown to the drafting submission modal, allowing drafters to indicate how much of the work has been completed when submitting their work.

## Features Implemented

### 1. Percentage Dropdown
- **Range**: 0%, 10%, 20%, 30%, 40%, 50%, 60%, 70%, 80%, 90%, 100%
- **Default**: Placeholder "Select percentage completed"
- **Label**: "Work Completed (%)"

### 2. Backend Integration
- **Field**: `work_percentage_done` (number | null)
- **Storage**: Added to Drafting interface and update operations
- **API**: Included in updateDrafting mutation payload

### 3. Validation
- **Optional Field**: Not required for submission
- **Type Safety**: Proper TypeScript typing with null handling
- **Zod Validation**: Included in submission schema

## Implementation Details

### UI Component: Percentage Dropdown
Located in: `src/pages/jobs/roles/drafters/components/SubmissionModal.tsx`

```tsx
<FormField
  control={form.control}
  name="workPercentage"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Work Completed (%)</FormLabel>
      <Select onValueChange={field.onChange} value={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select percentage completed" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((percent) => (
            <SelectItem key={percent} value={percent.toString()}>
              {percent}%
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Data Model Updates
Located in: `src/store/api/job.ts`

**Drafting Interface:**
```typescript
export interface Drafting {
  // ... existing fields ...
  work_percentage_done?: number | null; // Percentage of work completed
}
```

**DraftingUpdate Interface:**
```typescript
export interface DraftingUpdate {
  // ... existing fields ...
  work_percentage_done?: number | null; // Add percentage of work completed
}
```

### Submission Logic
```typescript
work_percentage_done: values.workPercentage 
  ? parseInt(values.workPercentage as string) || null 
  : null, // Add percentage to payload
```

## User Experience

### Dropdown Behavior
- **Selection**: User can select from predefined percentage values
- **Placeholder**: Shows "Select percentage completed" when no value selected
- **Display**: Shows selected percentage (e.g., "50%") in dropdown
- **Validation**: No validation errors if left empty (optional field)

### Workflow Integration
1. Drafter completes their work
2. Opens submission modal
3. Optionally selects work completion percentage
4. Submits the draft
5. Backend receives and stores the percentage value

## Technical Considerations

### Type Safety
- Proper TypeScript typing with optional field handling
- Null safety with fallback values
- Zod schema validation

### Backend Compatibility
- Field is optional (can be null)
- Uses integer values (0-100)
- Compatible with existing Drafting interface

### Performance
- Minimal impact (single additional field)
- No additional API calls
- Simple dropdown component

## Backend Integration

### API Payload
```json
{
  "drafter_start_date": "2026-01-08T09:00:00Z",
  "drafter_end_date": "2026-01-08T11:00:00Z",
  "total_sqft_drafted": "100",
  "no_of_piece_drafted": "5",
  "total_hours_drafted": 2.5,
  "draft_note": "Draft completed with minor revisions",
  "mentions": "123",
  "work_percentage_done": 100,  // New field
  "is_completed": true,
  "status_id": 1
}
```

### Database Considerations
- Field should accept integer values 0-100 or null
- Can be used for reporting and progress tracking
- Supports partial work submissions

## Use Cases

### Complete Work Submission
- User selects 100% when fully completed
- Indicates job is finished and ready for next stage

### Partial Work Submission
- User selects percentage based on completion (e.g., 50%)
- Allows for work handoff or checkpoint tracking
- Enables progress monitoring

### No Work Done
- User selects 0% if no work was completed
- Or leaves field empty for undefined status

## Testing Scenarios

### Manual Testing
1. Open submission modal
2. Verify percentage dropdown is present
3. Select different percentage values
4. Submit with and without selecting percentage
5. Verify data is sent to backend correctly

### Edge Cases
- Empty selection (should send null)
- Invalid values (should be prevented by dropdown)
- Form validation (should not require selection)
- Backend handling of null values

## Future Enhancements

### Potential Improvements
- Auto-calculate percentage based on work time vs. scheduled time
- Percentage history tracking
- Visual progress indicators
- Integration with project management features

### Analytics
- Track average completion percentages
- Monitor submission patterns
- Analyze work distribution efficiency
- Generate progress reports

This feature provides valuable progress tracking capabilities while maintaining a simple, intuitive user interface.