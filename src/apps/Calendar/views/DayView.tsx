/**
 * DayView – single-day time grid.
 *
 * z-layer contract (shared with WeekView)
 *   z-3  event chips   ← always on top
 *   z-2  now line      ← visible but never covers chips
 *
 * pxAt() math is identical to WeekView so that a reminder at e.g. 8:41 PM
 * lands at the same pixel offset in both views.
 */

import { useRef, useEffect } from "react";
import { isToday } from "date-fns";
import type { CalendarEvent } from "@/types/calendar";
import { eventsOnDate, splitEventsByTime } from "@/apps/Calendar/calendarEvents";
import { useCurrentTimeIndicator } from "@/apps/Calendar/useCurrentTimeIndicator";
import { EventChip } from "@/apps/Calendar/components/EventChip";

// ── layout constants (kept in sync with WeekView) ──────────────────────────
const TIME_COL_PX = 72;
const HOUR_PX = 64;
const QTR_PX = HOUR_PX / 4; // 16 px

function fmtHour(h: number): string {
	const d = new Date(2000, 0, 1, h, 0, 0, 0);
	return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

/**
 * Pixel offset from the top of the hour-rows area for a given time.
 * Identical formula to WeekView.pxAt.
 */
function pxAt(time: Date, anchorHour: number): number {
	const mins = (time.getHours() - anchorHour) * 60 + time.getMinutes();
	return (mins / 15) * QTR_PX;
}

interface DayViewProps {
	date: Date;
	events: CalendarEvent[];
	startHour: number;
}

export function DayView({ date, events, startHour }: DayViewProps) {
	const { quarterTime } = useCurrentTimeIndicator();
	const scrollRef = useRef<HTMLDivElement>(null);
	const showNowLine = isToday(date);

	const dayEvents = eventsOnDate(events, date);
	const { allDay, timed } = splitEventsByTime(dayEvents);
	const hours = Array.from({ length: 24 - startHour }, (_, i) => startHour + i);
	const nowPx = showNowLine ? pxAt(quarterTime, startHour) : 0;

	// Scroll so the now-line is roughly 140 px from the top of the viewport
	useEffect(() => {
		if (!showNowLine || !scrollRef.current) return;
		scrollRef.current.scrollTop = nowPx - 140;
	}, [showNowLine, startHour, nowPx]);

	return (
		<div className="flex flex-col flex-1 min-h-0">
			{/* ── all-day strip ───────────────────────────────────────────────── */}
			{allDay.length > 0 && (
				<div
					className="border-b border-border bg-muted/30 flex flex-wrap gap-1.5 sticky top-0 z-10"
					style={{ padding: "6px 8px 6px 0" }}
				>
					<span
						className="text-xs font-semibold text-muted-foreground shrink-0 flex items-start justify-end whitespace-nowrap"
						style={{ width: TIME_COL_PX, paddingRight: 8 }}
					>
						All day
					</span>
					<div className="flex flex-wrap gap-1.5 flex-1">
						{allDay.map((ev) => (
							<EventChip key={ev.id} event={ev} />
						))}
					</div>
				</div>
			)}

			{/* ── scrollable time grid ────────────────────────────────────────── */}
			<div ref={scrollRef} className="flex-1 overflow-y-auto relative">
				{/*
          The grid wrapper is position:relative.
          Now line and timed-event overlay are both absolute children of this
          wrapper, so their `top` values are both relative to the same origin
          (the top of the first hour row).
        */}
				<div className="relative" style={{ height: hours.length * HOUR_PX }}>
					{/* ── hour rows (grid lines) ──────────────────────────────── */}
					{hours.map((hour) => (
						<div
							key={hour}
							className="flex border-b border-border"
							style={{ height: HOUR_PX }}
						>
							{/* Time label */}
							<div
								className="shrink-0 border-r border-border bg-muted/20 flex items-start justify-end"
								style={{
									width: TIME_COL_PX,
									paddingLeft: 12,
									paddingRight: 10,
									paddingTop: 4,
								}}
							>
								<span className="text-sm font-semibold text-foreground whitespace-nowrap">
									{fmtHour(hour)}
								</span>
							</div>

							{/* Quarter-hour subdivisions */}
							<div className="flex-1 relative flex flex-col">
								{[0, 1, 2, 3].map((q) => (
									<div
										key={q}
										className={q < 3 ? "border-b border-border/30" : ""}
										style={{ height: QTR_PX }}
									/>
								))}
							</div>
						</div>
					))}

					{/* ── now line (z-2 – BELOW event chips) ──────────────────── */}
					{showNowLine && (
						<div
							className="absolute z-2 pointer-events-none"
							style={{ top: nowPx, left: 0, right: 0 }}
							aria-label="Current time indicator"
						>
							{/* Dot on the time-column / grid boundary */}
							<div
								className="absolute -translate-y-1/2 w-3 h-3 rounded-full bg-red-500"
								style={{ left: TIME_COL_PX - 6 }}
							/>
							{/* Line spans the event area */}
							<div className="h-0.5 bg-red-500" style={{ marginLeft: TIME_COL_PX }} />
							{/* Small time label tucked into the time column */}
							<span
								className="absolute -translate-y-full text-[10px] font-bold text-red-500 bg-card rounded whitespace-nowrap"
								style={{ left: 4, paddingLeft: 2, paddingRight: 4 }}
							>
								{quarterTime.toLocaleTimeString(undefined, {
									hour: "numeric",
									minute: "2-digit",
									hour12: true,
								})}
							</span>
						</div>
					)}

					{/* ── timed event chips (z-3 – ABOVE the now line) ────────── */}
					{/*
            This overlay div covers the same area as the hour-row grid.
            Each chip is absolutely positioned using the same pxAt() that
            the now line uses, guaranteeing consistent alignment.
          */}
					<div
						className="absolute inset-0 pointer-events-none"
						style={{ left: TIME_COL_PX }}
					>
						{timed.map((ev) => {
							if (!ev.time) return null;
							return (
								<div
									key={ev.id}
									className="absolute left-1 right-1 pointer-events-auto z-3"
									style={{ top: pxAt(ev.time, startHour), minHeight: QTR_PX }}
								>
									<EventChip event={ev} />
								</div>
							);
						})}
					</div>
				</div>
				{/* /grid wrapper */}
			</div>
			{/* /scroll */}
		</div>
	);
}
