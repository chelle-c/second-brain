/**
 * MonthView – 6-row month grid that fills the available viewport height.
 *
 * • Columns are Mon … Sun (ISO week, weekStartsOn: 1).
 * • Days outside the current month are dimmed.
 * • Each cell shows up to MAX_VISIBLE chips; overflow is a "+N more" button
 *   that calls onDayClick → the parent switches to Day view for that date.
 * • The 6 rows share vertical space equally via flex-1 so the grid always
 *   reaches the bottom edge of the window.
 */

import { format, startOfWeek, addDays, isToday } from "date-fns";
import type { CalendarEvent } from "@/types/calendar";
import { eventsOnDate } from "@/apps/Calendar/calendarEvents";
import { EventChip } from "@/apps/Calendar/components/EventChip";

const MAX_VISIBLE = 3;
const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthViewProps {
	monthStart: Date;
	events: CalendarEvent[];
	onDayClick?: (date: Date) => void;
}

export function MonthView({ monthStart, events, onDayClick }: MonthViewProps) {
	const anchor = startOfWeek(monthStart, { weekStartsOn: 1 });
	const weeks = Array.from({ length: 6 }, (_, w) =>
		Array.from({ length: 7 }, (_, d) => addDays(anchor, w * 7 + d)),
	);
	const currentMonth = monthStart.getMonth();

	return (
		// h-full so this component stretches into whatever space the parent gave it
		<div className="flex flex-col h-full">
			{/* Day-of-week header – sticky, never scrolls */}
			<div className="grid grid-cols-7 border-b border-border bg-muted/30 shrink-0">
				{DAY_HEADERS.map((label) => (
					<div
						key={label}
						className="text-center text-xs font-semibold text-muted-foreground py-2 border-r border-border last:border-r-0"
					>
						{label}
					</div>
				))}
			</div>

			{/* Week rows – flex column so each row gets an equal share of the
          remaining height.  overflow-y-auto is on this container so that on
          very small viewports the rows can still scroll rather than clipping. */}
			<div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
				{weeks.map((week, wIdx) => (
					// flex-1 gives every row an equal share of vertical space
					<div
						key={wIdx}
						className="grid grid-cols-7 border-b border-border last:border-b-0 flex-1"
						style={{ minHeight: 80 }} // absolute floor so chips aren't crushed
					>
						{week.map((day, dIdx) => {
							const inMonth = day.getMonth() === currentMonth;
							const today = isToday(day);
							const dayEvents = eventsOnDate(events, day);
							const visible = dayEvents.slice(0, MAX_VISIBLE);
							const overflow = dayEvents.length - MAX_VISIBLE;

							return (
								<div
									key={dIdx}
									className={[
										"border-r border-border last:border-r-0 p-0.5 flex flex-col",
										!inMonth ? "bg-muted/10" : "",
										today ? "bg-primary/5" : "",
									].join(" ")}
								>
									{/* Day number */}
									<div className="flex justify-end mb-0.5 pr-1">
										<span
											className={[
												"text-xs font-semibold inline-flex items-center justify-center w-5 h-5 rounded-full",
												today ? "bg-primary text-primary-foreground"
												: inMonth ? "text-foreground"
												: "text-muted-foreground",
											].join(" ")}
										>
											{format(day, "d")}
										</span>
									</div>

									{/* Event chips + overflow pill */}
									<div className="flex flex-col gap-0.5 flex-1">
										{visible.map((ev) => (
											<EventChip key={ev.id} event={ev} compact />
										))}
										{overflow > 0 && (
											<button
												type="button"
												className="text-[10px] text-primary hover:underline text-left px-1"
												onClick={() => onDayClick?.(day)}
												aria-label={`${overflow} more events on ${format(day, "MMM d")}`}
											>
												+{overflow} more
											</button>
										)}
									</div>
								</div>
							);
						})}
					</div>
				))}
			</div>
		</div>
	);
}
