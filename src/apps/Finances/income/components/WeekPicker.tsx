import {
	addMonths,
	addWeeks,
	eachDayOfInterval,
	endOfMonth,
	endOfWeek,
	format,
	getWeek,
	isSameWeek,
	startOfMonth,
	startOfWeek,
	subMonths,
	subWeeks,
} from "date-fns";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { WeekStartDay } from "@/types/settings";
import { WEEK_DAYS } from "@/types/settings";

interface WeekPickerProps {
	selectedDate: Date;
	onWeekSelect: (weekStart: Date) => void;
	onClose: () => void;
}

export const WeekPicker: React.FC<WeekPickerProps> = ({
	selectedDate,
	onWeekSelect,
	onClose,
}) => {
	const { incomeWeekStartDay } = useSettingsStore();
	const weekStartsOn = incomeWeekStartDay as WeekStartDay;

	const [currentMonth, setCurrentMonth] = useState(selectedDate);
	const [hoveredWeek, setHoveredWeek] = useState<Date | null>(null);
	const [focusedWeek, setFocusedWeek] = useState<Date>(
		startOfWeek(selectedDate, { weekStartsOn }),
	);
	const containerRef = useRef<HTMLDivElement>(null);
	const weekRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

	const monthStart = startOfMonth(currentMonth);
	const monthEnd = endOfMonth(currentMonth);
	const calendarStart = startOfWeek(monthStart, { weekStartsOn });
	const calendarEnd = endOfWeek(monthEnd, { weekStartsOn });

	const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

	const weeks: Date[][] = [];
	for (let i = 0; i < days.length; i += 7) {
		weeks.push(days.slice(i, i + 7));
	}

	const getWeekKey = (date: Date) =>
		format(startOfWeek(date, { weekStartsOn }), "yyyy-MM-dd");

	const handleWeekClick = (weekStart: Date) => {
		onWeekSelect(weekStart);
		onClose();
	};

	const isWeekSelected = (weekStart: Date) => {
		return isSameWeek(weekStart, selectedDate, { weekStartsOn });
	};

	const isWeekHovered = (weekStart: Date) => {
		return hoveredWeek && isSameWeek(weekStart, hoveredWeek, { weekStartsOn });
	};

	const isWeekFocused = (weekStart: Date) => {
		return isSameWeek(weekStart, focusedWeek, { weekStartsOn });
	};

	const isCurrentWeek = (weekStart: Date) => {
		return isSameWeek(weekStart, new Date(), { weekStartsOn });
	};

	// Focus management
	useEffect(() => {
		const weekKey = getWeekKey(focusedWeek);
		const weekElement = weekRefs.current.get(weekKey);
		if (weekElement) {
			weekElement.focus();
		}
	}, [focusedWeek]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			switch (e.key) {
				case "ArrowUp": {
					e.preventDefault();
					const prevWeek = subWeeks(focusedWeek, 1);
					setFocusedWeek(prevWeek);
					// Update month if needed
					if (prevWeek < calendarStart) {
						setCurrentMonth(subMonths(currentMonth, 1));
					}
					break;
				}
				case "ArrowDown": {
					e.preventDefault();
					const nextWeek = addWeeks(focusedWeek, 1);
					setFocusedWeek(nextWeek);
					// Update month if needed
					if (nextWeek > calendarEnd) {
						setCurrentMonth(addMonths(currentMonth, 1));
					}
					break;
				}
				case "ArrowLeft": {
					e.preventDefault();
					const prevMonth = subMonths(currentMonth, 1);
					setCurrentMonth(prevMonth);
					// Update focused week to first week of the new month view
					const newMonthStart = startOfMonth(prevMonth);
					const newCalendarStart = startOfWeek(newMonthStart, { weekStartsOn });
					setFocusedWeek(newCalendarStart);
					break;
				}
				case "ArrowRight": {
					e.preventDefault();
					const nextMonth = addMonths(currentMonth, 1);
					setCurrentMonth(nextMonth);
					// Update focused week to first week of the new month view
					const newMonthStart = startOfMonth(nextMonth);
					const newCalendarStart = startOfWeek(newMonthStart, { weekStartsOn });
					setFocusedWeek(newCalendarStart);
					break;
				}
				case "Enter":
				case " ":
					e.preventDefault();
					handleWeekClick(focusedWeek);
					break;
				case "Escape":
					e.preventDefault();
					onClose();
					break;
				case "Home":
					e.preventDefault();
					// Go to first week of current month view
					setFocusedWeek(weeks[0][0]);
					break;
				case "End":
					e.preventDefault();
					// Go to last week of current month view
					setFocusedWeek(weeks[weeks.length - 1][0]);
					break;
			}
		},
		[focusedWeek, currentMonth, calendarStart, calendarEnd, weeks, onClose],
	);

	const setWeekRef = useCallback(
		(weekStart: Date, element: HTMLTableRowElement | null) => {
			const key = getWeekKey(weekStart);
			if (element) {
				weekRefs.current.set(key, element);
			} else {
				weekRefs.current.delete(key);
			}
		},
		[],
	);

	return (
		<div
			ref={containerRef}
			className="absolute top-full left-0 mt-1 bg-popover rounded-lg shadow-lg border border-border p-3 z-50 w-80"
			onKeyDown={handleKeyDown}
			role="dialog"
			aria-modal="true"
			aria-label="Week picker"
		>
			{/* Month Navigation */}
			<div className="flex items-center justify-between mb-3">
				<button
					onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
					className="p-1.5 hover:bg-accent rounded transition-colors cursor-pointer"
					aria-label="Previous month"
					type="button"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<title>Previous</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>
				<span className="text-sm font-semibold text-foreground">
					{format(currentMonth, "MMMM yyyy")}
				</span>
				<button
					onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
					className="p-1.5 hover:bg-accent rounded transition-colors cursor-pointer"
					aria-label="Next month"
					type="button"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<title>Next</title>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			</div>

			{/* Calendar Table */}
			<table
				className="w-full border-collapse"
				aria-label="Week selection calendar"
			>
				<thead>
					<tr>
						{Array.from({ length: 7 }, (_, i) => {
							const dayIndex = (incomeWeekStartDay + i) % 7;
							const dayName = WEEK_DAYS[dayIndex].label.substring(0, 3);
							return (
								<th
									key={dayIndex}
									scope="col"
									className="text-center text-xs font-medium text-muted-foreground py-1"
								>
									{dayName}
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody className="space-y-1">
					{weeks.map((week) => {
						const weekStart = week[0];
						const weekNumber = getWeek(weekStart, { weekStartsOn });
						const isSelected = isWeekSelected(weekStart);
						const isHovered = isWeekHovered(weekStart);
						const isFocused = isWeekFocused(weekStart);
						const isCurrent = isCurrentWeek(weekStart);

						return (
							<tr
								key={format(weekStart, "yyyy-MM-dd")}
								ref={(el) => setWeekRef(weekStart, el)}
								className={`rounded-md transition-colors cursor-pointer outline-none ${
									isSelected
										? "bg-primary/20 ring-1 ring-primary"
										: isFocused
											? "bg-primary/10 ring-2 ring-primary/70"
											: isHovered
												? "bg-accent"
												: ""
								}`}
								onClick={() => handleWeekClick(weekStart)}
								onMouseEnter={() => setHoveredWeek(weekStart)}
								onMouseLeave={() => setHoveredWeek(null)}
								onFocus={() => setFocusedWeek(weekStart)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleWeekClick(weekStart);
									}
								}}
								tabIndex={isFocused ? 0 : -1}
								aria-selected={isSelected}
								aria-label={`Week ${weekNumber}: ${format(
									weekStart,
									"MMM d",
								)} - ${format(week[6], "MMM d, yyyy")}`}
							>
								{week.map((day) => {
									const isInMonth = day.getMonth() === currentMonth.getMonth();
									return (
										<td
											key={day.getDate()}
											className={`text-center text-xs py-2 ${
												isInMonth
													? "text-foreground"
													: "text-muted-foreground/50"
											} ${isCurrent && isInMonth ? "font-bold" : ""}`}
										>
											{format(day, "d")}
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>

			{/* Instructions */}
			<div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
				<div className="flex items-center justify-between">
					<span>↑↓ Navigate weeks • Enter to select</span>
					<span>←→ Change month</span>
				</div>
			</div>
		</div>
	);
};
