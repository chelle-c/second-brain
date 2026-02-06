/**
 * WeekView – single-grid 7-column time layout.
 *
 * Key details this revision addresses
 *   1. Event chips are z-3, now-line is z-2  →  chips always on top.
 *   2. Sticky header / all-day cells get a solid background only while
 *      "stuck" (scrolled away from their natural position).  An
 *      IntersectionObserver on a zero-height sentinel at the top of the
 *      scroll container drives a single `isStuck` flag.
 *   3. The now-line vertical offset is measured from the DOM (a ref on the
 *      first hour-row time label) so it stays correct regardless of the
 *      all-day row's actual rendered height.
 */

import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { addDays, format, isToday } from "date-fns";
import type { CalendarEvent } from "@/types/calendar";
import { eventsOnDate, splitEventsByTime } from "@/apps/Calendar/calendarEvents";
import { useCurrentTimeIndicator } from "@/apps/Calendar/useCurrentTimeIndicator";
import { EventChip } from "@/apps/Calendar/components/EventChip";

// ── layout constants ────────────────────────────────────────────────────────
const TIME_COL_PX = 96;
const HOUR_PX = 64;
const QTR_PX = HOUR_PX / 4;
const HEADER_H = 52; // day-name row height (fixed)

function fmtHour(h: number): string {
	const d = new Date(2000, 0, 1, h, 0, 0, 0);
	return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

/** Pixel offset within the hour-rows area for a given time. */
function pxAt(time: Date, anchorHour: number): number {
	const mins = (time.getHours() - anchorHour) * 60 + time.getMinutes();
	return (mins / 15) * QTR_PX;
}

// ── component ───────────────────────────────────────────────────────────────

interface WeekViewProps {
	weekStart: Date;
	events: CalendarEvent[];
	startHour: number;
}

export function WeekView({ weekStart, events, startHour }: WeekViewProps) {
	const { quarterTime } = useCurrentTimeIndicator();
	const scrollRef = useRef<HTMLDivElement>(null); // scroll container
	const sentinelRef = useRef<HTMLDivElement>(null); // intersection sentinel
	const gridRef = useRef<HTMLDivElement>(null); // the grid wrapper
	const firstHourRef = useRef<HTMLDivElement>(null); // first hour-row time-label cell

	// ── stuck detection ───────────────────────────────────────────────────
	const [isStuck, setIsStuck] = useState(false);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setIsStuck(!entry.isIntersecting);
			},
			{
				root: scrollRef.current,
				// threshold 1 means the callback fires the instant even one pixel
				// of the sentinel leaves the scroll viewport
				threshold: 1,
			},
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, []);

	// ── measured header height for the now-line offset ────────────────────
	// We read the distance from the grid's top edge to the top of the first
	// hour-row cell.  This accounts for the header row AND the all-day row
	// (which has auto height) without hard-coding either.
	const [headerHeightPx, setHeaderHeightPx] = useState(HEADER_H);

	useLayoutEffect(() => {
		const grid = gridRef.current;
		const firstHour = firstHourRef.current;
		if (!grid || !firstHour) return;

		const gridTop = grid.getBoundingClientRect().top;
		const hourTop = firstHour.getBoundingClientRect().top;
		setHeaderHeightPx(hourTop - gridTop);
	});
	// No dependency array: re-measure after every render so that changes to
	// the all-day row height (e.g. new events added) are picked up.

	// ── data ──────────────────────────────────────────────────────────────
	const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
	const hours = Array.from({ length: 24 - startHour }, (_, i) => startHour + i);
	const dayData = days.map((day) => splitEventsByTime(eventsOnDate(events, day)));
	const hasAllDay = dayData.some((d) => d.allDay.length > 0);
	const showNow = days.some((d) => isToday(d));
	const nowPx = pxAt(quarterTime, startHour);

	// Scroll to now on mount
	useEffect(() => {
		if (!scrollRef.current || !showNow) return;
		scrollRef.current.scrollTop = headerHeightPx + nowPx - 140;
	}, [weekStart, showNow]); // eslint-disable-line react-hooks/exhaustive-deps

	// ── grid template ─────────────────────────────────────────────────────
	const gridStyle: React.CSSProperties = {
		display: "grid",
		gridTemplateColumns: `${TIME_COL_PX}px repeat(7, 1fr)`,
		gridTemplateRows: [
			`${HEADER_H}px`, // day names
			...(hasAllDay ? ["minmax(28px, auto)"] : []), // all-day (optional)
			...hours.map(() => `${HOUR_PX}px`), // hour rows
		].join(" "),
		width: "100%",
	};

	// Background classes for sticky cells: solid when stuck, transparent when not.
	// card colour is the app's surface colour; using the CSS variable directly
	// gives us both light and dark mode for free.
	const stickyBg = isStuck ? { background: "var(--card)" } : {};

	// ── render ──────────────────────────────────────────────────────────────
	return (
		<div className="flex flex-col flex-1 min-h-0">
			<div ref={scrollRef} className="flex-1 overflow-y-auto">
				<div ref={gridRef} className="relative" style={gridStyle}>

					{/* ══════════════════════════════════════════════════════════════
              ROW 0 – Day names (sticky)                                   */}
					{/* Time-column spacer */}
					<div
						className="border-r border-border sticky z-10"
						style={{ top: 0, height: HEADER_H, ...stickyBg }}
					>
						{/* Transparent base layer when not stuck */}
						{!isStuck && <div className="w-full h-full bg-muted" />}
					</div>

					{days.map((day, i) => {
						const today = isToday(day);
						// When not stuck use the original semi-transparent tint;
						// when stuck use the solid card bg (already in stickyBg).
						const cellBg =
							isStuck ? stickyBg : { background: today ? undefined : undefined }; // let Tailwind classes handle it

						return (
							<div
								key={`hdr-${i}`}
								className={[
									"border-l border-border border-b sticky z-10",
									"text-center flex flex-col items-center justify-center",
									!isStuck ?
										today ? "bg-secondary"
										:	"bg-muted"
									:	"",
								].join(" ")}
								style={{ top: 0, height: HEADER_H, ...cellBg }}
							>
								<span
									className={`text-[11px] font-semibold uppercase ${today ? "text-primary" : "text-muted-foreground"}`}
								>
									{format(day, "EEE")}
								</span>
								<span
									className={[
										"inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-semibold mt-0.5",
										today ?
											"bg-primary text-primary-foreground"
										:	"text-foreground",
									].join(" ")}
								>
									{format(day, "d")}
								</span>
							</div>
						);
					})}

					{/* ══════════════════════════════════════════════════════════════
              ROW 1 – All-day (sticky, conditional)                        */}
					{hasAllDay && (
						<>
							<div
								className="border-r border-border border-b sticky z-10 flex items-center justify-end"
								style={{ top: HEADER_H, paddingRight: 8, ...stickyBg }}
							>
								{!isStuck && <div className="absolute inset-0 bg-muted -z-10" />}
								<span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap relative z-0">
									All day
								</span>
							</div>

							{dayData.map((d, i) => (
								<div
									key={`ad-${i}`}
									className={[
										"border-l border-border border-b sticky z-10 p-0.5 flex flex-col gap-0.5",
										!isStuck ? "bg-muted" : "",
									].join(" ")}
									style={{ top: HEADER_H, ...stickyBg }}
								>
									{d.allDay.map((ev) => (
										<EventChip key={ev.id} event={ev} compact />
									))}
								</div>
							))}
						</>
					)}

					{/* ══════════════════════════════════════════════════════════════
              ROWS 2…N – Hour rows                                         */}
					{hours.map((hour, hIdx) => (
						<>
							{/* Time label */}
							<div
								key={`t-${hour}`}
								ref={hIdx === 0 ? firstHourRef : undefined}
								className="border-r border-border border-b bg-muted/20 flex items-start justify-end"
								style={{ paddingLeft: 12, paddingRight: 10, paddingTop: 4 }}
							>
								<span className="text-sm font-semibold text-foreground whitespace-nowrap">
									{fmtHour(hour)}
								</span>
							</div>

							{/* 7 day cells */}
							{days.map((day, dIdx) => {
								const today = isToday(day);
								const { timed } = dayData[dIdx];
								const inThisHour = timed.filter(
									(ev) => ev.time && ev.time.getHours() === hour,
								);

								return (
									<div
										key={`${hIdx}-${dIdx}`}
										className={[
											"border-l border-border border-b relative",
											today ? "bg-primary/5" : "",
										].join(" ")}
									>
										{/* Quarter-hour lines */}
										<div className="flex flex-col">
											{[0, 1, 2, 3].map((q) => (
												<div
													key={q}
													className={
														q < 3 ? "border-b border-border/20" : ""
													}
													style={{ height: QTR_PX }}
												/>
											))}
										</div>

										{/* Timed event chips – z-3 so they sit ABOVE the now line */}
										{inThisHour.map((ev) => {
											if (!ev.time) return null;
											const topInCell = (ev.time.getMinutes() / 60) * HOUR_PX;
											return (
												<div
													key={ev.id}
													className="absolute left-0.5 right-0.5 z-3"
													style={{ top: topInCell, minHeight: QTR_PX }}
												>
													<EventChip event={ev} />
												</div>
											);
										})}
									</div>
								);
							})}
						</>
					))}

					{/* ══════════════════════════════════════════════════════════════
						NOW LINE – z-2 (below event chips which are z-3).
						top = measured header height + nowPx
						left = TIME_COL_PX, right = 0  →  spans all 7 day columns.   */}
					{showNow && (
						<div
							className="absolute z-2 pointer-events-none"
							style={{ top: headerHeightPx + nowPx, left: TIME_COL_PX, right: 0 }}
						>
							<div className="absolute left-0 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500" />
							<div className="w-full h-0.5 bg-red-500" />
						</div>
					)}
				</div>
				{/* /grid */}
			</div>
			{/* /scroll */}
		</div>
	);
}
