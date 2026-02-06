/**
 * calendarEvents.ts
 *
 * Pure data layer: reads from the three module stores, normalises everything
 * into CalendarEvent[], and exposes selector helpers used by the views.
 *
 * No React hooks live here — every function takes explicit arguments so it can
 * be called from inside a useMemo or outside of React entirely.
 */

import { format, isSameDay, parseISO, startOfDay } from "date-fns";
import type { CalendarEvent, CalendarFilters } from "@/types/calendar";
import type { Expense } from "@/types/expense";
import type { IncomeEntry } from "@/types/income";
import type { Note } from "@/types/notes";

// ── Colour constants per source ─────────────────────────────────────────────
// These map to the app's chart palette variables but are concrete so we can
// use them on inline styles (Tailwind can't JIT dynamic hex values).

const NOTE_COLOR = "#0ea5e9"; // sky-500
const EXPENSE_COLOR = "#ef4444"; // red-500  — overridden per-category when available
const INCOME_COLOR = "#10b981"; // emerald-500

// ── Note → CalendarEvent[] ──────────────────────────────────────────────────

/**
 * A note produces a CalendarEvent only when it has a reminder with a valid
 * dateTime.  The event's `time` field is set to that dateTime so the Day /
 * Week views can position it on the time grid.
 */
function notesToEvents(notes: Note[]): CalendarEvent[] {
	const events: CalendarEvent[] = [];

	for (const note of notes) {
		if (note.archived) continue;
		if (!note.reminder?.dateTime) continue;

		const reminderDate = new Date(note.reminder.dateTime);
		if (Number.isNaN(reminderDate.getTime())) continue;

		events.push({
			id: `note-${note.id}-${format(reminderDate, "yyyy-MM-dd")}`,
			source: "note",
			title: note.title || "Untitled note",
			date: startOfDay(reminderDate),
			time: reminderDate,
			color: NOTE_COLOR,
			note,
		});
	}

	return events;
}

// ── Expense → CalendarEvent[] ───────────────────────────────────────────────

/**
 * An expense produces an event on its dueDate (if set).  Parent recurring
 * expenses without a parentExpenseId are skipped — their generated
 * occurrences carry the actual due dates.
 */
function expensesToEvents(
	expenses: Expense[],
	categoryColors: Record<string, string>,
	hideCompleted: boolean,
): CalendarEvent[] {
	const events: CalendarEvent[] = [];

	for (const expense of expenses) {
		if (expense.isArchived) continue;
		if (hideCompleted && expense.isPaid) continue;
		// Skip parent recurring stubs — occurrences have the real dates
		if (expense.isRecurring && !expense.parentExpenseId) continue;
		if (!expense.dueDate) continue;

		const date = startOfDay(expense.dueDate);

		events.push({
			id: `expense-${expense.id}-${format(date, "yyyy-MM-dd")}`,
			source: "expense",
			title: expense.name,
			date,
			time: null, // expenses are date-only
			color: categoryColors[expense.category] ?? EXPENSE_COLOR,
			expense,
		});
	}

	return events;
}

// ── Income → CalendarEvent[] ────────────────────────────────────────────────

function incomeToEvents(entries: IncomeEntry[]): CalendarEvent[] {
	return entries.map((entry) => {
		const date = startOfDay(parseISO(entry.date));
		return {
			id: `income-${entry.id}-${entry.date}`,
			source: "income",
			title: `Income: $${entry.amount.toFixed(2)}`,
			date,
			time: null,
			color: INCOME_COLOR,
			income: entry,
		};
	});
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Build the full CalendarEvent[] from raw store data.  Pass filters to
 * toggle sources on/off.
 */
export function buildCalendarEvents(params: {
	notes: Note[];
	expenses: Expense[];
	categoryColors: Record<string, string>;
	incomeEntries: IncomeEntry[];
	filters: CalendarFilters;
}): CalendarEvent[] {
	const { notes, expenses, categoryColors, incomeEntries, filters } = params;
	const events: CalendarEvent[] = [];

	if (filters.showNotes) events.push(...notesToEvents(notes));
	if (filters.showExpenses)
		events.push(...expensesToEvents(expenses, categoryColors, filters.hideCompleted));
	if (filters.showIncome) events.push(...incomeToEvents(incomeEntries));

	return events;
}

/**
 * Filter a pre-built event list to only events on a given date.
 */
export function eventsOnDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
	const target = startOfDay(date);
	return events.filter((e) => isSameDay(e.date, target));
}

/**
 * Separate events into "all-day" (time === null) and "timed" groups for a
 * single date.  Used by the Day / Week views to split the top bar from the
 * time grid.
 */
export function splitEventsByTime(events: CalendarEvent[]): {
	allDay: CalendarEvent[];
	timed: CalendarEvent[];
} {
	const allDay: CalendarEvent[] = [];
	const timed: CalendarEvent[] = [];

	for (const e of events) {
		if (e.time) {
			timed.push(e);
		} else {
			allDay.push(e);
		}
	}

	return { allDay, timed };
}
