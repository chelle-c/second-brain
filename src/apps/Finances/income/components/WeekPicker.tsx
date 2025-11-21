import React, { useState, useCallback, useRef, useEffect } from "react";
import {
	format,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
	startOfWeek,
	endOfWeek,
	isSameWeek,
	addMonths,
	subMonths,
	getWeek,
	addWeeks,
	subWeeks,
} from "date-fns";

interface WeekPickerProps {
	selectedDate: Date;
	onWeekSelect: (weekStart: Date) => void;
	onClose: () => void;
}

export const WeekPicker: React.FC<WeekPickerProps> = ({ selectedDate, onWeekSelect, onClose }) => {
	const [currentMonth, setCurrentMonth] = useState(selectedDate);
	const [hoveredWeek, setHoveredWeek] = useState<Date | null>(null);
	const [focusedWeek, setFocusedWeek] = useState<Date>(
		startOfWeek(selectedDate, { weekStartsOn: 1 })
	);
	const containerRef = useRef<HTMLDivElement>(null);
	const weekRefs = useRef<Map<string, HTMLDivElement>>(new Map());

	const monthStart = startOfMonth(currentMonth);
	const monthEnd = endOfMonth(currentMonth);
	const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
	const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

	const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

	const weeks: Date[][] = [];
	for (let i = 0; i < days.length; i += 7) {
		weeks.push(days.slice(i, i + 7));
	}

	const getWeekKey = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");

	const handleWeekClick = (weekStart: Date) => {
		onWeekSelect(weekStart);
		onClose();
	};

	const isWeekSelected = (weekStart: Date) => {
		return isSameWeek(weekStart, selectedDate, { weekStartsOn: 1 });
	};

	const isWeekHovered = (weekStart: Date) => {
		return hoveredWeek && isSameWeek(weekStart, hoveredWeek, { weekStartsOn: 1 });
	};

	const isWeekFocused = (weekStart: Date) => {
		return isSameWeek(weekStart, focusedWeek, { weekStartsOn: 1 });
	};

	const isCurrentWeek = (weekStart: Date) => {
		return isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });
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
				case "ArrowUp":
					e.preventDefault();
					const prevWeek = subWeeks(focusedWeek, 1);
					setFocusedWeek(prevWeek);
					// Update month if needed
					if (prevWeek < calendarStart) {
						setCurrentMonth(subMonths(currentMonth, 1));
					}
					break;
				case "ArrowDown":
					e.preventDefault();
					const nextWeek = addWeeks(focusedWeek, 1);
					setFocusedWeek(nextWeek);
					// Update month if needed
					if (nextWeek > calendarEnd) {
						setCurrentMonth(addMonths(currentMonth, 1));
					}
					break;
				case "ArrowLeft":
					e.preventDefault();
					setCurrentMonth(subMonths(currentMonth, 1));
					break;
				case "ArrowRight":
					e.preventDefault();
					setCurrentMonth(addMonths(currentMonth, 1));
					break;
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
		[focusedWeek, currentMonth, calendarStart, calendarEnd, weeks, onClose]
	);

	const setWeekRef = useCallback((weekStart: Date, element: HTMLDivElement | null) => {
		const key = getWeekKey(weekStart);
		if (element) {
			weekRefs.current.set(key, element);
		} else {
			weekRefs.current.delete(key);
		}
	}, []);

	return (
		<div
			ref={containerRef}
			className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-50 w-80"
			onKeyDown={handleKeyDown}
			role="dialog"
			aria-modal="true"
			aria-label="Week picker"
		>
			{/* Month Navigation */}
			<div className="flex items-center justify-between mb-3">
				<button
					onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
					className="p-1.5 hover:bg-gray-100 rounded transition-colors cursor-pointer"
					aria-label="Previous month"
					type="button"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>
				<span className="text-sm font-semibold text-gray-700">
					{format(currentMonth, "MMMM yyyy")}
				</span>
				<button
					onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
					className="p-1.5 hover:bg-gray-100 rounded transition-colors cursor-pointer"
					aria-label="Next month"
					type="button"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			</div>

			{/* Weekday Headers */}
			<div className="grid grid-cols-7 gap-1 mb-2" role="row">
				{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
					<div
						key={day}
						className="text-center text-xs font-medium text-gray-500 py-1"
						role="columnheader"
					>
						{day}
					</div>
				))}
			</div>

			{/* Calendar Grid */}
			<div className="space-y-1" role="grid" aria-label="Week selection calendar">
				{weeks.map((week, weekIndex) => {
					const weekStart = week[0];
					const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });
					const isSelected = isWeekSelected(weekStart);
					const isHovered = isWeekHovered(weekStart);
					const isFocused = isWeekFocused(weekStart);
					const isCurrent = isCurrentWeek(weekStart);

					return (
						<div
							key={weekIndex}
							ref={(el) => setWeekRef(weekStart, el)}
							className={`grid grid-cols-7 gap-1 rounded-md transition-colors cursor-pointer outline-none ${
								isSelected
									? "bg-sky-100 ring-1 ring-sky-500"
									: isFocused
									? "bg-sky-50 ring-2 ring-sky-400"
									: isHovered
									? "bg-gray-100"
									: ""
							}`}
							onClick={() => handleWeekClick(weekStart)}
							onMouseEnter={() => setHoveredWeek(weekStart)}
							onMouseLeave={() => setHoveredWeek(null)}
							onFocus={() => setFocusedWeek(weekStart)}
							tabIndex={isFocused ? 0 : -1}
							role="row"
							aria-selected={isSelected}
							aria-label={`Week ${weekNumber}: ${format(
								weekStart,
								"MMM d"
							)} - ${format(week[6], "MMM d, yyyy")}`}
						>
							{week.map((day, dayIndex) => {
								const isInMonth = day.getMonth() === currentMonth.getMonth();
								return (
									<div
										key={dayIndex}
										className={`text-center text-xs py-2 ${
											isInMonth ? "text-gray-700" : "text-gray-300"
										} ${isCurrent && isInMonth ? "font-bold" : ""}`}
										role="gridcell"
									>
										{format(day, "d")}
									</div>
								);
							})}
						</div>
					);
				})}
			</div>

			{/* Instructions */}
			<div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
				<div className="flex items-center justify-between">
					<span>↑↓ Navigate weeks • Enter to select</span>
					<span>←→ Change month</span>
				</div>
			</div>
		</div>
	);
};
