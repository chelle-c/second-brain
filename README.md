# Simple Second Brain App

Get thoughts out of your head and into a digital space. Keep notes and track necessities without worry.

### This app is still in progress!

## Features

### Notes App
- **Rich Text Editing**: Create and edit notes with a full-featured text editor
- **Folder Organization**: Organize notes into customizable folders (Inbox, Personal, Work, etc.)
- **Tag System**: Assign colored tags with icons to categorize notes (Ideas, Actions, Reference, etc.)
- **Archive System**: Archive completed or old notes to keep your workspace clean
- **Search Functionality**: Quickly find notes by searching through titles and content
- **Tag Filtering**: Filter notes by one or multiple active tags
- **Smart Display**: Shows note count per folder and "Untitled" for notes without titles
- **Active/Archived Views**: Toggle between viewing active notes and archived notes

### Income Tracker
- **Manual Entry Form**: Add income entries with date, amount, hours worked, and minutes
- **Bulk Text Entry**: Quickly add multiple income entries via text area
- **Weekly Targets**: Set and track weekly income goals with visual progress bars
- **Progress Tracking**: See real-time percentage of weekly target reached
- **Multiple Views**: View income data in Weekly, Monthly, and Yearly formats
- **Visual Analytics**: Bar charts and data visualizations for easy comprehension
- **Editable Targets**: Modify weekly targets as needed
- **Time Tracking**: Optional hours and minutes tracking for each income entry

### Expenses Tracker
- **Expense Types**: Track both one-time and recurring expenses
- **Categories**: Organize expenses into categories (Housing, Transportation, Food, Healthcare, Personal Care, Entertainment, Utilities, Savings, Debt, Miscellaneous)
- **Needs vs Wants**: Classify expenses as needs or wants for better budget awareness
- **Recurring Expenses**: Set up recurring expenses with flexible frequencies (weekly, biweekly, monthly, quarterly, semi-annually, annually)
- **Payment Tracking**: Mark expenses as paid/unpaid and track payment status
- **Monthly Navigation**: Navigate between months to view past and future expenses
- **Expense Overview**: Visual pie charts showing spending breakdown by category
- **View Modes**: Filter expenses by All, Remaining (unpaid), or Required (needs only)
- **Edit Occurrences**: Edit individual occurrences of recurring expenses
- **Monthly Summary**: See total expenses, paid amounts, and remaining balance at a glance

## Testing

This project includes a comprehensive test suite built with Vitest:
- **98 total tests** across 11 test files
- **Storage Tests**: Database save/load operations for Notes, Expenses, and Income (17 tests)
- **Component Tests**: UI component rendering, user interactions, and state management (81 tests)
- **Coverage**: Notes app, Income tracker, and Expenses tracker components

Run tests with:
```bash
pnpm test          # Watch mode
pnpm test:run      # Run once
pnpm test:ui       # UI mode
```

See `tests/README.md` for detailed test documentation.

## Planned Features

- Mind map
- Settings page