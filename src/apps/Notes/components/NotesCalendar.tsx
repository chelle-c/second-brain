import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, PanelLeftClose, Plus } from "lucide-react";
import { MONTHS } from "@/lib/date-utils/constants";
import type { Note } from "@/types/notes";

type CalendarViewMode = "date" | "month";

interface NotesCalendarProps {
	notes: Note[];
	selectedDate: Date;
	onSelectDate: (date: Date) => void;
	calendarViewMode: CalendarViewMode;
	onCalendarViewModeChange: (mode: CalendarViewMode) => void;
	onCreateNote: () => void;
	onToggleCollapse: (collapsed: boolean) => void;
}

interface CalendarDay {
	date: Date;
	isCurrentMonth: boolean;
	isToday: boolean;
	hasNotes: boolean;
	dateKey: string;
}

const DAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getDateKey(date: Date): string {
	const d = new Date(date);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

export function NotesCalendar({
	notes,
	selectedDate,
	onSelectDate,
	calendarViewMode,
	onCalendarViewModeChange,
	onCreateNote,
	onToggleCollapse,
}: NotesCalendarProps) {
	const [currentMonth, setCurrentMonth] = useState(
		() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
	);
	const [focusedDate, setFocusedDate] = useState<Date | null>(null);
	const [showMonthPicker, setShowMonthPicker] = useState(false);
	const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

	const gridRef = useRef<HTMLDivElement>(null);
	const monthPickerRef = useRef<HTMLDivElement>(null);

	const today = useMemo(() => {
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		return now;
	}, []);

	const isDateMode = calendarViewMode === "date";

	// Keep picker year in sync with displayed month
	useEffect(() => {
		setPickerYear(currentMonth.getFullYear());
	}, [currentMonth]);

	// Close month picker on outside click or Escape
	useEffect(() => {
		if (!showMonthPicker) return;

		const handleClickOutside = (e: MouseEvent) => {
			if (monthPickerRef.current && !monthPickerRef.current.contains(e.target as Node)) {
				setShowMonthPicker(false);
			}
		};

		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				setShowMonthPicker(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscape);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [showMonthPicker]);

	// Build set of date keys that have non-archived notes (by updatedAt)
	const noteDateKeys = useMemo(() => {
		const keys = new Set<string>();
		for (const note of notes) {
			if (!note.archived) {
				keys.add(getDateKey(new Date(note.updatedAt)));
			}
		}
		return keys;
	}, [notes]);

	// Build calendar days for current month view (6 rows × 7 columns = 42 cells)
	const calendarDays = useMemo((): CalendarDay[] => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();

		const firstDayOfMonth = new Date(year, month, 1);
		let startDayOfWeek = firstDayOfMonth.getDay() - 1;
		if (startDayOfWeek < 0) startDayOfWeek = 6;

		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const daysInPrevMonth = new Date(year, month, 0).getDate();

		const days: CalendarDay[] = [];

		for (let i = startDayOfWeek - 1; i >= 0; i--) {
			const date = new Date(year, month - 1, daysInPrevMonth - i);
			const dateKey = getDateKey(date);
			days.push({
				date,
				isCurrentMonth: false,
				isToday: isSameDay(date, today),
				hasNotes: noteDateKeys.has(dateKey),
				dateKey,
			});
		}

		for (let i = 1; i <= daysInMonth; i++) {
			const date = new Date(year, month, i);
			const dateKey = getDateKey(date);
			days.push({
				date,
				isCurrentMonth: true,
				isToday: isSameDay(date, today),
				hasNotes: noteDateKeys.has(dateKey),
				dateKey,
			});
		}

		const remaining = 42 - days.length;
		for (let i = 1; i <= remaining; i++) {
			const date = new Date(year, month + 1, i);
			const dateKey = getDateKey(date);
			days.push({
				date,
				isCurrentMonth: false,
				isToday: isSameDay(date, today),
				hasNotes: noteDateKeys.has(dateKey),
				dateKey,
			});
		}

		return days;
	}, [currentMonth, today, noteDateKeys]);

	// ── Navigation helpers ───────────────────────────────────────────────────

	const navigateToMonth = useCallback(
		(newMonth: Date) => {
			setCurrentMonth(newMonth);
			setShowMonthPicker(false);
			if (!isDateMode) {
				onSelectDate(newMonth);
			}
		},
		[isDateMode, onSelectDate],
	);

	const goToPrevMonth = useCallback(() => {
		navigateToMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
	}, [currentMonth, navigateToMonth]);

	const goToNextMonth = useCallback(() => {
		navigateToMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
	}, [currentMonth, navigateToMonth]);

	const goToToday = useCallback(() => {
		const now = new Date();
		const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		setCurrentMonth(firstOfMonth);
		setShowMonthPicker(false);

		if (isDateMode) {
			onSelectDate(now);
			setFocusedDate(now);
		} else {
			onSelectDate(firstOfMonth);
		}
	}, [isDateMode, onSelectDate]);

	// ── Month picker ─────────────────────────────────────────────────────────

	const toggleMonthPicker = useCallback(() => {
		if (!showMonthPicker) {
			setPickerYear(currentMonth.getFullYear());
		}
		setShowMonthPicker((p) => !p);
	}, [showMonthPicker, currentMonth]);

	const handleMonthPickerSelect = useCallback(
		(monthIndex: number) => {
			navigateToMonth(new Date(pickerYear, monthIndex, 1));
		},
		[pickerYear, navigateToMonth],
	);

	// ── Day interaction ──────────────────────────────────────────────────────

	const handleDayClick = useCallback(
		(date: Date) => {
			setFocusedDate(null); // Clear keyboard focus on mouse click

			// Navigate to the day's month if it differs from displayed month
			if (
				date.getMonth() !== currentMonth.getMonth() ||
				date.getFullYear() !== currentMonth.getFullYear()
			) {
				setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
			}

			// In month mode, clicking a day switches to date mode
			if (!isDateMode) {
				onCalendarViewModeChange("date");
			}

			onSelectDate(date);
		},
		[currentMonth, isDateMode, onCalendarViewModeChange, onSelectDate],
	);

	const handleDayKeyDown = useCallback(
		(e: React.KeyboardEvent, currentDate: Date) => {
			let newDate: Date | null = null;

			switch (e.key) {
				case "ArrowLeft":
					e.preventDefault();
					newDate = new Date(
						currentDate.getFullYear(),
						currentDate.getMonth(),
						currentDate.getDate() - 1,
					);
					break;
				case "ArrowRight":
					e.preventDefault();
					newDate = new Date(
						currentDate.getFullYear(),
						currentDate.getMonth(),
						currentDate.getDate() + 1,
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					newDate = new Date(
						currentDate.getFullYear(),
						currentDate.getMonth(),
						currentDate.getDate() - 7,
					);
					break;
				case "ArrowDown":
					e.preventDefault();
					newDate = new Date(
						currentDate.getFullYear(),
						currentDate.getMonth(),
						currentDate.getDate() + 7,
					);
					break;
				case "Home":
					e.preventDefault();
					newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
					break;
				case "End":
					e.preventDefault();
					newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
					break;
				case "Enter":
				case " ":
					e.preventDefault();
					if (
						currentDate.getMonth() !== currentMonth.getMonth() ||
						currentDate.getFullYear() !== currentMonth.getFullYear()
					) {
						setCurrentMonth(
							new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
						);
					}
					if (!isDateMode) {
						onCalendarViewModeChange("date");
					}
					onSelectDate(currentDate);
					return;
				default:
					return;
			}

			if (newDate) {
				setFocusedDate(newDate);
				if (
					newDate.getMonth() !== currentMonth.getMonth() ||
					newDate.getFullYear() !== currentMonth.getFullYear()
				) {
					setCurrentMonth(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
				}
			}
		},
		[currentMonth, isDateMode, onCalendarViewModeChange, onSelectDate],
	);

	// Focus the button for focusedDate after state update
	useEffect(() => {
		if (focusedDate && gridRef.current) {
			const dateKey = getDateKey(focusedDate);
			const button = gridRef.current.querySelector(
				`[data-date="${dateKey}"]`,
			) as HTMLButtonElement;
			button?.focus();
		}
	}, [focusedDate]);

	// Roving tabindex: the "active" cell gets tabIndex 0
	const activeDateKey = getDateKey(focusedDate || selectedDate || today);

	// ── Day cell classes ─────────────────────────────────────────────────────

	const getDayCellClasses = (
		day: CalendarDay,
		isSelected: boolean,
		isFocused: boolean,
	): string => {
		const base =
			"relative flex items-center justify-center text-xs rounded-full aspect-square cursor-pointer select-none outline-none";

		// Only show selected highlight in date mode
		if (isSelected && isDateMode) {
			return `${base} bg-primary text-primary-foreground font-bold`;
		}

		let style = base;

		if (!day.isCurrentMonth) {
			style += " text-muted-foreground/40 hover:bg-accent/50";
		} else if (day.isToday && day.hasNotes) {
			style += " bg-primary/40 text-primary font-bold ring-2 ring-primary/60";
		} else if (day.isToday) {
			style += " bg-primary/30 text-primary font-bold ring-2 ring-primary/50";
		} else if (day.hasNotes) {
			style += " bg-primary/15 text-primary font-medium hover:bg-primary/25";
		} else {
			style += " text-foreground hover:bg-accent";
		}

		if (isFocused && !(isSelected && isDateMode)) {
			style += " ring-2 ring-ring";
		}

		return style;
	};

	// ── Month picker: month highlight logic ──────────────────────────────────

	const todayMonth = today.getMonth();
	const todayYear = today.getFullYear();
	const displayedMonth = currentMonth.getMonth();
	const displayedYear = currentMonth.getFullYear();

	const getMonthCellClasses = (monthIndex: number): string => {
		const isDisplayed = pickerYear === displayedYear && monthIndex === displayedMonth;
		const isCurrent = pickerYear === todayYear && monthIndex === todayMonth;

		if (isDisplayed) {
			return "bg-primary text-primary-foreground font-bold";
		}
		if (isCurrent) {
			return "bg-primary/25 text-primary font-bold";
		}
		return "text-foreground hover:bg-accent";
	};

	return (
		<nav className="h-full flex flex-col bg-muted" aria-label="Calendar navigation">
			{/* Toolbar */}
			<div className="p-3 border-b border-border space-y-2">
				<div className="flex items-center justify-between">
					<h2 className="font-semibold text-sm">Calendar</h2>
					<button
						type="button"
						onClick={() => onToggleCollapse(true)}
						className="p-1.5 hover:bg-accent rounded transition-colors cursor-pointer"
						title="Collapse Sidebar"
						aria-label="Collapse sidebar"
					>
						<PanelLeftClose size={16} />
					</button>
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onCreateNote}
						className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
						title="New Note (sent to Inbox)"
						aria-label="Create new note in Inbox"
					>
						<Plus size={14} />
						New Note
					</button>
					<button
						type="button"
						onClick={goToToday}
						className="py-2 px-3 text-sm font-medium bg-card border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
						title="Go to today"
						aria-label="Go to today"
					>
						Today
					</button>
				</div>

				{/* Date / Month toggle */}
				<div className="flex rounded-lg border border-border overflow-hidden">
					<button
						type="button"
						onClick={() => onCalendarViewModeChange("date")}
						className={`flex-1 py-1.5 px-3 text-xs font-medium transition-colors cursor-pointer ${
							isDateMode ?
								"bg-primary text-primary-foreground"
							:	"bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
						}`}
						aria-pressed={isDateMode}
					>
						By Date
					</button>
					<button
						type="button"
						onClick={() => onCalendarViewModeChange("month")}
						className={`flex-1 py-1.5 px-3 text-xs font-medium transition-colors cursor-pointer ${
							!isDateMode ?
								"bg-primary text-primary-foreground"
							:	"bg-card text-muted-foreground hover:text-foreground hover:bg-accent"
						}`}
						aria-pressed={!isDateMode}
					>
						By Month
					</button>
				</div>
			</div>

			{/* Month navigation + picker */}
			<div className="px-3 pt-3 pb-1">
				<div ref={monthPickerRef} className="relative">
					<div className="flex items-center justify-between mb-2">
						<button
							type="button"
							onClick={goToPrevMonth}
							className="p-1.5 hover:bg-accent rounded-lg transition-colors cursor-pointer"
							aria-label="Previous month"
						>
							<ChevronLeft size={16} />
						</button>
						<button
							type="button"
							onClick={toggleMonthPicker}
							className="text-sm font-semibold hover:text-primary transition-colors cursor-pointer flex items-center gap-1"
							aria-expanded={showMonthPicker}
							aria-haspopup="listbox"
						>
							{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
							<ChevronDown
								size={14}
								className={`transition-transform duration-200 ${showMonthPicker ? "rotate-180" : ""}`}
							/>
						</button>
						<button
							type="button"
							onClick={goToNextMonth}
							className="p-1.5 hover:bg-accent rounded-lg transition-colors cursor-pointer"
							aria-label="Next month"
						>
							<ChevronRight size={16} />
						</button>
					</div>

					{/* Month/Year picker dropdown */}
					{showMonthPicker && (
						<div className="absolute top-full left-0 right-0 z-20 mt-1 bg-popover border border-border rounded-lg shadow-lg p-2 animate-fadeIn">
							{/* Year navigation */}
							<div className="flex items-center justify-between mb-2 px-1">
								<button
									type="button"
									onClick={() => setPickerYear((y) => y - 1)}
									className="p-1 hover:bg-accent rounded transition-colors cursor-pointer"
									aria-label="Previous year"
								>
									<ChevronLeft size={14} />
								</button>
								<span className="text-sm font-semibold">{pickerYear}</span>
								<button
									type="button"
									onClick={() => setPickerYear((y) => y + 1)}
									className="p-1 hover:bg-accent rounded transition-colors cursor-pointer"
									aria-label="Next year"
								>
									<ChevronRight size={14} />
								</button>
							</div>

							{/* Month grid */}
							<div
								className="grid grid-cols-4 gap-1"
								role="listbox"
								aria-label="Select month"
							>
								{MONTHS.map((monthName, index) => (
									<button
										key={monthName}
										type="button"
										role="option"
										aria-selected={
											pickerYear === displayedYear && index === displayedMonth
										}
										onClick={() => handleMonthPickerSelect(index)}
										className={`py-1.5 px-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${getMonthCellClasses(index)}`}
									>
										{monthName.slice(0, 3)}
									</button>
								))}
							</div>
						</div>
					)}
				</div>

				{/* Day headers */}
				<div className="grid grid-cols-7 gap-1 mb-1" role="row" aria-hidden="true">
					{DAY_HEADERS.map((day) => (
						<div
							key={day}
							className="text-center text-[10px] font-medium text-muted-foreground py-0.5"
						>
							{day}
						</div>
					))}
				</div>

				{/* Calendar grid */}
				<div
					ref={gridRef}
					className="grid grid-cols-7 gap-1"
					role="grid"
					aria-label={`${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`}
				>
					{calendarDays.map((day) => {
						const isSelected = isSameDay(day.date, selectedDate);
						const isFocused = focusedDate ? isSameDay(day.date, focusedDate) : false;

						return (
							<button
								key={day.dateKey}
								type="button"
								role="gridcell"
								data-date={day.dateKey}
								tabIndex={day.dateKey === activeDateKey ? 0 : -1}
								onClick={() => handleDayClick(day.date)}
								onKeyDown={(e) => handleDayKeyDown(e, day.date)}
								aria-label={`${day.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${day.hasNotes ? ", has notes" : ""}${day.isToday ? ", today" : ""}`}
								aria-selected={isSelected && isDateMode}
								aria-current={day.isToday ? "date" : undefined}
								className={getDayCellClasses(day, isSelected, isFocused)}
							>
								{day.date.getDate()}
							</button>
						);
					})}
				</div>
			</div>

			{/* Legend */}
			<div className="px-3 pt-2 pb-3 space-y-1">
				<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
					<span className="w-2.5 h-2.5 rounded-full bg-primary/15 border border-primary/25 shrink-0" />
					<span>Has notes</span>
				</div>
				<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
					<span className="w-2.5 h-2.5 rounded-full bg-primary/30 ring-2 ring-primary/50 shrink-0" />
					<span>Today (no notes)</span>
				</div>
				<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
					<span className="w-2.5 h-2.5 rounded-full bg-primary/40 ring-2 ring-primary/60 shrink-0" />
					<span>Today (has notes)</span>
				</div>
				<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
					<span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
					<span>Selected</span>
				</div>
			</div>

			{/* Spacer to push toggle to bottom in parent */}
			<div className="flex-1" />
		</nav>
	);
}
