import type { Expense } from "./expense";
import type { IncomeEntry } from "./income";
import type { Note } from "./notes";

// ── View modes ──────────────────────────────────────────────────────────────

export type CalendarViewType = "day" | "week" | "month";

// ── Unified calendar event ──────────────────────────────────────────────────
// Every item from any module is normalised into a CalendarEvent so that the
// views can render them uniformly while still exposing the original payload
// for module-specific detail rendering.

export type CalendarEventSource = "note" | "expense" | "income";

export interface CalendarEvent {
	/** Unique key for React rendering (source + original id + date). */
	id: string;
	/** Which module produced this event. */
	source: CalendarEventSource;
	/** Display title. */
	title: string;
	/** The date this event belongs to (date-only, midnight local). */
	date: Date;
	/**
	 * Optional specific time (for note reminders that have a dateTime).
	 * null for date-only items (expenses, income).
	 */
	time: Date | null;
	/** Accent colour for the event chip (hex or CSS colour). */
	color: string;

	// ── Original payloads (exactly one will be set) ────────────────────────
	note?: Note;
	expense?: Expense;
	income?: IncomeEntry;
}

// ── Filter / toggle state ───────────────────────────────────────────────────

export interface CalendarFilters {
	showNotes: boolean;
	showExpenses: boolean;
	showIncome: boolean;
	/** If true, archived / paid expenses are hidden. */
	hideCompleted: boolean;
}

export const DEFAULT_CALENDAR_FILTERS: CalendarFilters = {
	showNotes: true,
	showExpenses: true,
	showIncome: true,
	hideCompleted: true,
};

// ── Settings (persisted in AppSettings) ─────────────────────────────────────

export interface CalendarSettings {
	/** Hour (0-23) at which the Day / Week time grid starts scrolling. */
	dayStartHour: number;
	/** Default view when the Calendar module is opened. */
	defaultView: CalendarViewType;
}

export const DEFAULT_CALENDAR_SETTINGS: CalendarSettings = {
	dayStartHour: 6,
	defaultView: "month",
};
