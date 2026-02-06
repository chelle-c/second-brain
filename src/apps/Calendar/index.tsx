/**
 * Calendar – top-level orchestrator.
 *
 * "Representative date" contract
 *   day   → the day itself (midnight)
 *   week  → Monday of that week (midnight)
 *   month → 1st of that month (midnight)
 *
 * A ref (`focusDay`) always tracks the concrete day the user is looking at.
 * When views switch, focusDay stays fixed and the new anchor is derived from
 * it.  This prevents the Day → Week → Day round-trip from drifting.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import type { CalendarEvent, CalendarFilters, CalendarViewType } from "@/types/calendar";
import { DEFAULT_CALENDAR_FILTERS } from "@/types/calendar";
import { useNotesStore } from "@/stores/useNotesStore";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { buildCalendarEvents } from "./calendarEvents";
import { NavigationBar } from "./components/NavigationBar";
import { FilterBar } from "./components/FilterBar";
import { DayView } from "./views/DayView";
import { WeekView } from "./views/WeekView";
import { MonthView } from "./views/MonthView";

// ── pure date helpers (no mutation) ─────────────────────────────────────────

/** Monday of the ISO week that contains `date`. */
function mondayOf(date: Date): Date {
	const d = new Date(date.getTime());
	const dow = d.getDay(); // 0=Sun … 6=Sat
	const off = dow === 0 ? 6 : dow - 1; // days since Monday
	d.setDate(d.getDate() - off);
	d.setHours(0, 0, 0, 0);
	return d;
}

/** 1st of the month that contains `date`. */
function firstOfMonth(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/** Midnight copy of `date`. */
function atMidnight(date: Date): Date {
	const d = new Date(date.getTime());
	d.setHours(0, 0, 0, 0);
	return d;
}

/** Derive the view-specific anchor from a concrete day. */
function anchorFor(view: CalendarViewType, day: Date): Date {
	switch (view) {
		case "day":
			return atMidnight(day);
		case "week":
			return mondayOf(day);
		case "month":
			return firstOfMonth(day);
	}
}

// ── toggle options ──────────────────────────────────────────────────────────

const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
	{ value: "day", label: "Day" },
	{ value: "week", label: "Week" },
	{ value: "month", label: "Month" },
];

// ── component ───────────────────────────────────────────────────────────────

export function Calendar() {
	const defaultView = useSettingsStore((s) => s.calendarDefaultView);
	const startHour = useSettingsStore((s) => s.calendarDayStartHour);

	// The concrete day the user is "looking at".  Survives view switches.
	const focusDay = useRef<Date>(atMidnight(new Date()));

	const [view, setView] = useState<CalendarViewType>(defaultView);

	// currentDate is the view-specific anchor derived from focusDay.
	const [currentDate, setCurrentDate] = useState<Date>(() =>
		anchorFor(defaultView, focusDay.current),
	);

	const [filters, setFilters] = useState<CalendarFilters>(DEFAULT_CALENDAR_FILTERS);

	// ── data ──────────────────────────────────────────────────────────────────
	const notes = useNotesStore((s) => s.notes);
	const expenses = useExpenseStore((s) => s.expenses);
	const categoryColors = useExpenseStore((s) => s.categoryColors);
	const incomeEntries = useIncomeStore((s) => s.incomeEntries);

	const events: CalendarEvent[] = useMemo(
		() => buildCalendarEvents({ notes, expenses, categoryColors, incomeEntries, filters }),
		[notes, expenses, categoryColors, incomeEntries, filters],
	);

	// ── view switch ───────────────────────────────────────────────────────────
	// When the user picks a new view we keep focusDay where it is and just
	// re-derive the anchor.  NavigationBar's prev/next update focusDay AND
	// currentDate together so they stay in sync.
	const handleViewChange = useCallback((newView: CalendarViewType) => {
		setView(newView);
		setCurrentDate(anchorFor(newView, focusDay.current));
	}, []);

	// ── date change from NavigationBar (prev / next / Today) ──────────────────
	// NavigationBar already returns the correct anchor for the current view
	// (addDays / addWeeks / addMonths on currentDate).  We also update
	// focusDay so that a subsequent view switch starts from the right place.
	const handleDateChange = useCallback((newAnchor: Date) => {
		setCurrentDate(newAnchor);
		// Derive the "focus day" from the new anchor.
		// For day  → the anchor IS the day.
		// For week → the anchor is Monday; keep Monday as focus (closest day).
		// For month→ the anchor is the 1st; keep the 1st as focus.
		// This is intentional: prev/next in Week moves by a full week so
		// focusDay should jump by a full week too.
		focusDay.current = atMidnight(newAnchor);
	}, []);

	// ── Month cell drill-down → Day ───────────────────────────────────────────
	const handleDayClick = useCallback((date: Date) => {
		focusDay.current = atMidnight(date);
		setView("day");
		setCurrentDate(atMidnight(date));
	}, []);

	// ── render ────────────────────────────────────────────────────────────────
	return (
		<div className="flex flex-col flex-1 min-h-0 h-full animate-slideUp">
			{/* Header */}
			<div className="p-4 pb-2 space-y-3 bg-card/80 backdrop-blur border-b border-border">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<AnimatedToggle<CalendarViewType>
						options={VIEW_OPTIONS}
						value={view}
						onChange={handleViewChange}
					/>
					<NavigationBar
						view={view}
						currentDate={currentDate}
						onDateChange={handleDateChange}
					/>
				</div>
				<FilterBar filters={filters} onFilterChange={setFilters} />
			</div>

			{/* Active view – fills remaining vertical space */}
			<div className="flex flex-col flex-1 min-h-0 overflow-hidden">
				{view === "day" && (
					<DayView date={currentDate} events={events} startHour={startHour} />
				)}
				{view === "week" && (
					<WeekView weekStart={currentDate} events={events} startHour={startHour} />
				)}
				{view === "month" && (
					<MonthView
						monthStart={currentDate}
						events={events}
						onDayClick={handleDayClick}
					/>
				)}
			</div>
		</div>
	);
}

export default Calendar;
