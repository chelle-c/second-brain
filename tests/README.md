# Second Brain Tests

This directory contains unit and component tests for the Second Brain application, focusing on database storage, retrieval operations, and UI components.

## Test Setup

Tests are configured using **Vitest** with the following setup:

- **Test Framework**: Vitest
- **Environment**: happy-dom
- **Component Testing**: @testing-library/react
- **Mocks**: Custom Tauri database mocks (`src/test/setup.ts`)

## Running Tests

```bash
# Run tests in watch mode
pnpm test

# Run tests once
pnpm test:run

# Run tests with UI
pnpm test:ui
```

## Test Files

### Storage Tests (Unit)

#### `notesStorage.test.ts`
Tests for the Notes storage module:
- ✅ Save and load notes with tags
- ✅ Handle archived notes
- ✅ Create and persist folder structure
- ✅ Save and load tags

#### `expensesStorage.test.ts`
Tests for the Expenses storage module:
- ✅ Save and load one-time and recurring expenses
- ✅ Handle different recurrence frequencies
- ✅ Detect changes in expenses data
- ✅ Load default values when no data exists

#### `incomeStorage.test.ts`
Tests for the Income storage module:
- ✅ Save and load income entries with hours/minutes
- ✅ Save and load weekly targets
- ✅ Handle entries without time data
- ✅ Detect changes in income data
- ✅ Track view type changes

### Component Tests

#### Expenses App

**`MonthNavigation.test.tsx`**
Tests for the month navigation component:
- ✅ Render month/year selectors
- ✅ Previous/next month navigation
- ✅ Handle month/year changes
- ✅ Display unique years from expenses
- ✅ Handle null states

**`ExpenseList.test.tsx`**
Tests for the expense list display:
- ✅ Render expense list
- ✅ Filter by overview mode (all/remaining/required)
- ✅ Show empty states
- ✅ Display paid/unpaid indicators
- ✅ Handle null states

**`ExpenseOverview.test.tsx`**
Tests for the expense overview dashboard:
- ✅ Display monthly totals
- ✅ Show category breakdowns
- ✅ Render pie chart
- ✅ Toggle between view modes
- ✅ Show placeholder data when empty
- ✅ Display top categories
- ✅ Adjust labels based on mode/filters

**`ExpenseForm.test.tsx`**
Tests for the expense form component:
- ✅ Create new expenses
- ✅ Edit existing expenses
- ✅ Edit recurring expense occurrences
- ✅ Form field population
- ✅ Toggle expense type (need/want)
- ✅ Form validation
- ✅ Category dropdown bug fix verification
- ✅ Frequency dropdown bug fix verification
- ✅ Hide fields when editing occurrences
- ✅ Handle callbacks (onClose)

#### Income App

**`ManualEntryForm.test.tsx`**
Tests for the manual entry form component:
- ✅ Render form fields (Day, Amount, Hours, Minutes)
- ✅ Display submit button
- ✅ Call onEntryChange for amount changes
- ✅ Call onEntryChange for hours changes
- ✅ Verify submit button type attribute
- ✅ Display helper text about optional fields
- ✅ Require amount field
- ✅ Accept decimal values for amount

**`WeeklySummary.test.tsx`**
Tests for the weekly summary component:
- ✅ Display weekly target label and amount
- ✅ Display amount earned
- ✅ Display progress percentage
- ✅ Display remaining amount when target not reached
- ✅ Show success message when target reached
- ✅ Show "no earnings yet" when total is 0
- ✅ Show edit button for target
- ✅ Allow editing target amount
- ✅ Show save and cancel buttons when editing
- ✅ Cap progress bar at 100%
- ✅ Use default target for new week

#### Notes App

**`TagFilter.test.tsx`**
Tests for the tag filter component:
- ✅ Render filter label
- ✅ Render all available tags
- ✅ Highlight active tags
- ✅ Not highlight inactive tags
- ✅ Call setActiveTags when tag is clicked
- ✅ Remove tag when active tag is clicked
- ✅ Show clear all button when tags are active
- ✅ Not show clear all button when no tags are active
- ✅ Clear all tags when clear all is clicked
- ✅ Handle multiple active tags
- ✅ Render with empty tags object

**`NotesCard.test.tsx`**
Tests for the notes card component:
- ✅ Display folder name
- ✅ Display note count
- ✅ Render search input
- ✅ Display active notes when viewMode is active
- ✅ Display archived notes when viewMode is archived
- ✅ Call onSelectNote when note is clicked
- ✅ Filter notes by search term
- ✅ Display empty state when no notes match
- ✅ Display note tags
- ✅ Show TagFilter component
- ✅ Filter notes by active tags
- ✅ Show "Untitled" for notes without title

## Test Coverage

Currently testing **98 test cases** covering:
- Database save/load operations (17 tests)
- Change detection mechanisms
- Data persistence
- Default value handling
- Component rendering and interactions (81 tests)
- User event handling
- Conditional rendering
- Filter and mode changes
- Form validation and submission
- Bug fix verification tests
- Tag filtering and management
- Search functionality
- Note archiving and display
- Weekly income tracking
- Progress calculations

## Mocking Strategy

The tests use a custom mock for `@tauri-apps/plugin-sql` that:
- Simulates SQLite database operations
- Handles INSERT, SELECT, DELETE operations
- Maintains in-memory data store per test
- Properly maps column names to object properties

## Bug Fixes Verified by Tests

### Category Dropdown Bug (ExpenseForm)
**Issue**: When editing an expense, the category dropdown didn't display the selected category.

**Root Cause**: The `Select` component for category was missing the `value` prop in src/apps/Finances/expenses/components/ExpenseForm.tsx:473

**Fix**: Added `value={formData.category}` to the Select component

**Also Fixed**: Same issue with the recurrence frequency Select (line 523)

**Test Coverage**: `ExpenseForm.test.tsx` includes specific tests to verify the bug is fixed

## Future Enhancements

Consider adding:
- Integration tests for cross-module operations
- E2E tests using Playwright or similar
- Performance tests for large datasets
- Migration tests for schema changes
- More comprehensive form submission tests
- Accessibility tests
