import React, { useState, useRef, useEffect } from "react";
import { getWeeksForYear } from "@/lib/dateUtils";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { IncomeWeekSelection } from "@/types/income";
import type { WeekStartDay } from "@/types/settings";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { format, getWeek, startOfWeek, addDays, isSameWeek } from "date-fns";
import { WeekPicker } from "./WeekPicker";

interface WeekNavigationProps {
	selectedWeek: IncomeWeekSelection;
	setSelectedWeek: { (week: IncomeWeekSelection): void };
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
	const isCurrentWeek = isSameWeek(selectedWeek.startDate, today, { weekStartsOn: incomeWeekStartDay as WeekStartDay });

	// Close week picker when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (weekPickerRef.current && !weekPickerRef.current.contains(event.target as Node)) {
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
		const weekToSelect = weeks.find((w) => w.number === selectedWeek.week) || weeks[0];

		setSelectedWeek({
			year,
			week: weekToSelect.number,
			startDate: weekToSelect.startDate,
			endDate: weekToSelect.endDate,
		});
	};

	const onWeekSelect = (weekStart: Date) => {
		const weekNumber = getWeek(weekStart, { weekStartsOn: incomeWeekStartDay as WeekStartDay });
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
			currentStart.getTime() + (direction === "prev" ? -7 : 7) * 24 * 60 * 60 * 1000
		);

		const newWeekNumber = getWeek(newStart, { weekStartsOn: incomeWeekStartDay as WeekStartDay });

		setSelectedWeek({
			year: newStart.getFullYear(),
			week: newWeekNumber,
			startDate: newStart,
			endDate: new Date(newStart.getTime() + 6 * 24 * 60 * 60 * 1000),
		});
	};

	const onGoToCurrentWeek = () => {
		const today = new Date();
		const firstOfWeek = startOfWeek(today, { weekStartsOn: incomeWeekStartDay as WeekStartDay });
		const weekNumber = getWeek(today, { weekStartsOn: incomeWeekStartDay as WeekStartDay });

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
		<div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 h-full">
			{/* Date Range Display */}
			<div className="mb-3">
				<span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
					Week {selectedWeek.week} • {selectedWeek.year}
				</span>
				<div className="text-lg font-bold text-gray-900 mt-1">
					{format(selectedWeek.startDate, "MMM d")} -{" "}
					{format(selectedWeek.endDate, "MMM d, yyyy")}
					{isCurrentWeek && (
						<span className="text-sm font-medium text-sky-600 ml-2">(Current)</span>
					)}
				</div>
			</div>

			{/* Selectors */}
			<div className="flex items-center gap-2 mb-3">
				<div className="relative flex-1" ref={weekPickerRef}>
					<button
						onClick={() => setShowWeekPicker(!showWeekPicker)}
						onKeyDown={handleWeekPickerKeyDown}
						className="w-full h-9 px-3 text-sm text-left bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
						aria-expanded={showWeekPicker}
						aria-haspopup="dialog"
						aria-label={`Select week, currently Week ${selectedWeek.week}`}
					>
						<div className="flex items-center gap-2">
							<svg
								className="w-4 h-4 text-gray-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
							<span>Week {selectedWeek.week}</span>
						</div>
						<svg
							className={`w-4 h-4 text-gray-400 transition-transform ${
								showWeekPicker ? "rotate-180" : ""
							}`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>
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
					onValueChange={(value) => onYearChange(parseInt(value))}
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

				<button
					onClick={onGoToCurrentWeek}
					disabled={isCurrentWeek}
					className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 shadow-sm ${
						isCurrentWeek
							? "bg-gray-100 text-gray-400 cursor-not-allowed"
							: "bg-sky-500 text-white hover:bg-sky-600/75 cursor-pointer shadow-gray-500/50"
					}`}
					title={isCurrentWeek ? "Already viewing current week" : "Go to Current Week"}
				>
					Today
				</button>
			</div>

			{/* Navigation Buttons */}
			<div className="flex justify-between gap-2">
				<button
					onClick={() => onNavigateWeek("prev")}
					className="flex-1 flex items-center justify-center gap-1.5 py-2 text-gray-600 font-medium bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-xs"
				>
					<svg
						className="w-3.5 h-3.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 19l-7-7 7-7"
						/>
					</svg>
					<span>Previous</span>
				</button>
				<button
					onClick={() => onNavigateWeek("next")}
					className="flex-1 flex items-center justify-center gap-1.5 py-2 text-gray-600 font-medium bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-xs"
				>
					<span>Next</span>
					<svg
						className="w-3.5 h-3.5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			</div>
		</div>
	);
};

export default WeekNavigation;
