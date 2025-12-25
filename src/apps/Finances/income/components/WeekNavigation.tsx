import { addDays, format, getWeek, isSameWeek, startOfWeek } from "date-fns";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getWeeksForYear } from "@/lib/dateUtils";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { IncomeWeekSelection } from "@/types/income";
import type { WeekStartDay } from "@/types/settings";
import { WeekPicker } from "./WeekPicker";

interface WeekNavigationProps {
	selectedWeek: IncomeWeekSelection;
	setSelectedWeek: (week: IncomeWeekSelection) => void;
	years: number[];
}

const WeekNavigation: React.FC<WeekNavigationProps> = ({
	selectedWeek,
	setSelectedWeek,
	years,
}) => {
	const [showWeekPicker, setShowWeekPicker] = useState(false);
	const weekPickerRef = useRef<HTMLDivElement>(null);
	const { incomeWeekStartDay } = useSettingsStore();
	const today = new Date();
	const isCurrentWeek = isSameWeek(selectedWeek.startDate, today, {
		weekStartsOn: incomeWeekStartDay as WeekStartDay,
	});

	// Close week picker when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				weekPickerRef.current &&
				!weekPickerRef.current.contains(event.target as Node)
			) {
				setShowWeekPicker(false);
			}
		};

		if (showWeekPicker) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [showWeekPicker]);

	const onYearChange = (year: number) => {
		const weeks = getWeeksForYear(year, incomeWeekStartDay as WeekStartDay);
		const weekToSelect =
			weeks.find((w) => w.number === selectedWeek.week) || weeks[0];

		setSelectedWeek({
			year,
			week: weekToSelect.number,
			startDate: weekToSelect.startDate,
			endDate: weekToSelect.endDate,
		});
	};

	const onWeekSelect = (weekStart: Date) => {
		const weekNumber = getWeek(weekStart, {
			weekStartsOn: incomeWeekStartDay as WeekStartDay,
		});
		const weekEnd = addDays(weekStart, 6);

		setSelectedWeek({
			year: weekStart.getFullYear(),
			week: weekNumber,
			startDate: weekStart,
			endDate: weekEnd,
		});
	};

	const onNavigateWeek = (direction: "prev" | "next") => {
		const currentStart = selectedWeek.startDate;
		const newStart = new Date(
			currentStart.getTime() +
				(direction === "prev" ? -7 : 7) * 24 * 60 * 60 * 1000,
		);

		const newWeekNumber = getWeek(newStart, {
			weekStartsOn: incomeWeekStartDay as WeekStartDay,
		});

		setSelectedWeek({
			year: newStart.getFullYear(),
			week: newWeekNumber,
			startDate: newStart,
			endDate: new Date(newStart.getTime() + 6 * 24 * 60 * 60 * 1000),
		});
	};

	const onGoToCurrentWeek = () => {
		const today = new Date();
		const firstOfWeek = startOfWeek(today, {
			weekStartsOn: incomeWeekStartDay as WeekStartDay,
		});
		const weekNumber = getWeek(today, {
			weekStartsOn: incomeWeekStartDay as WeekStartDay,
		});

		setSelectedWeek({
			year: today.getFullYear(),
			week: weekNumber,
			startDate: firstOfWeek,
			endDate: addDays(firstOfWeek, 6),
		});
	};

	const handleWeekPickerKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			setShowWeekPicker(!showWeekPicker);
		} else if (e.key === "Escape" && showWeekPicker) {
			e.preventDefault();
			setShowWeekPicker(false);
		}
	};

	return (
		<div className="bg-card rounded-xl shadow-lg p-4 h-full">
			<div className="pb-3">
				{/* Date Range Display */}
				<div>
					<span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
						Week {selectedWeek.week} • {selectedWeek.year}
					</span>
					<div className="text-lg font-bold text-card-foreground mt-1">
						{format(selectedWeek.startDate, "MMM d")} -{" "}
						{format(selectedWeek.endDate, "MMM d, yyyy")}
						{isCurrentWeek && (
							<span className="text-sm font-medium text-primary ml-2">
								(Current)
							</span>
						)}
					</div>
				</div>
			</div>
			<div className="space-y-3">
				{/* Selectors */}
				<div className="flex items-center gap-2">
					<div className="relative flex-1" ref={weekPickerRef}>
						<Button
							variant="outline"
							onClick={() => setShowWeekPicker(!showWeekPicker)}
							onKeyDown={handleWeekPickerKeyDown}
							className="w-full h-9 px-3 text-sm justify-between"
							aria-expanded={showWeekPicker}
							aria-haspopup="dialog"
							aria-label={`Select week, currently Week ${selectedWeek.week}`}
						>
							<div className="flex items-center gap-2">
								<Calendar className="w-4 h-4 text-muted-foreground" />
								<span>Week {selectedWeek.week}</span>
							</div>
							<ChevronDown
								className={`w-4 h-4 text-muted-foreground transition-transform ${
									showWeekPicker ? "rotate-180" : ""
								}`}
							/>
						</Button>
						{showWeekPicker && (
							<WeekPicker
								selectedDate={selectedWeek.startDate}
								onWeekSelect={onWeekSelect}
								onClose={() => setShowWeekPicker(false)}
							/>
						)}
					</div>

					<Select
						value={selectedWeek.year.toString()}
						onValueChange={(value) => onYearChange(parseInt(value, 10))}
					>
						<SelectTrigger className="w-24 h-9 text-sm">
							<SelectValue placeholder="Year" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Year</SelectLabel>
								{years.map((year) => (
									<SelectItem key={year} value={year.toString()}>
										{year}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>

					<Button
						onClick={onGoToCurrentWeek}
						disabled={isCurrentWeek}
						size="sm"
						className="px-3 bg-primary hover:bg-primary/90"
						title={
							isCurrentWeek
								? "Already viewing current week"
								: "Go to Current Week"
						}
					>
						Today
					</Button>
				</div>

				{/* Navigation Buttons */}
				<div className="flex justify-between gap-2">
					<Button
						variant="secondary"
						onClick={() => onNavigateWeek("prev")}
						className="flex-1 text-xs"
					>
						<ChevronLeft className="w-3.5 h-3.5 mr-1.5" />
						Previous
					</Button>
					<Button
						variant="secondary"
						onClick={() => onNavigateWeek("next")}
						className="flex-1 text-xs"
					>
						Next
						<ChevronRight className="w-3.5 h-3.5 ml-1.5" />
					</Button>
				</div>
			</div>
		</div>
	);
};

export default WeekNavigation;
