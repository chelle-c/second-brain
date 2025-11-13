import React from "react";
import { getWeeksForYear } from "@/lib/dateUtils";
import { format, getWeek, startOfWeek, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import type { IncomeWeekSelection } from "@/types/income";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

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
	const currentYearWeeks = getWeeksForYear(selectedWeek.year);
	// Week navigation handlers
	const onYearChange = (year: number) => {
		const weeks = getWeeksForYear(year);
		const weekToSelect = weeks.find((w) => w.number === selectedWeek.week) || weeks[0];

		setSelectedWeek({
			year,
			week: weekToSelect.number,
			startDate: weekToSelect.startDate,
			endDate: weekToSelect.endDate,
		});
	};

	const onWeekChange = (weekNumber: number) => {
		const week = currentYearWeeks.find((w) => w.number === weekNumber);
		if (week) {
			setSelectedWeek({
				year: selectedWeek.year,
				week: weekNumber,
				startDate: week.startDate,
				endDate: week.endDate,
			});
		}
	};

	const onNavigateWeek = (direction: "prev" | "next") => {
		const currentStart = selectedWeek.startDate;
		const newStart = new Date(
			currentStart.getTime() + (direction === "prev" ? -7 : 7) * 24 * 60 * 60 * 1000
		);

		// Use getWeek from date-fns for consistent week numbering
		const newWeekNumber = getWeek(newStart, { weekStartsOn: 1 });

		setSelectedWeek({
			year: newStart.getFullYear(),
			week: newWeekNumber, // Use getWeek for consistent numbering
			startDate: newStart,
			endDate: new Date(newStart.getTime() + 6 * 24 * 60 * 60 * 1000),
		});
	};

	const onGoToCurrentWeek = () => {
		const today = new Date();
		const firstOfWeek = startOfWeek(today, { weekStartsOn: 1 }); // Use date-fns function
		const weekNumber = getWeek(today, { weekStartsOn: 1 }); // Use date-fns function

		setSelectedWeek({
			year: today.getFullYear(),
			week: weekNumber,
			startDate: firstOfWeek,
			endDate: addDays(firstOfWeek, 6),
		});
	};

	return (
		<div className="w-full bg-white rounded-lg shadow p-6 flex flex-col items-stretch justify-between">
			<div className="flex items-center justify-between">
				<div className="text-lg font-semibold text-gray-900">
					{format(selectedWeek.startDate, "MMM d")} -{" "}
					{format(selectedWeek.endDate, "MMM d, yyyy")}
				</div>
				<div className="text-md text-gray-600 font-medium mt-1">
					Week {selectedWeek.week}
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
				<Select
					value={selectedWeek.year.toString()}
					onValueChange={(value) => onYearChange(parseInt(value))}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Select a year" />
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

				<Select
					value={selectedWeek.week.toString()}
					onValueChange={(value) => onWeekChange(parseInt(value))}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="Select a week" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>Week</SelectLabel>
							{currentYearWeeks.map((week) => (
								<SelectItem
									key={week.number + "-" + week.label}
									value={week.number.toString()}
								>
									{week.label}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col">
				<div className="flex justify-between items-center">
					<Button
						onClick={() => onNavigateWeek("prev")}
						className="flex items-center gap-1 py-2 text-gray-800 font-medium bg-gray-200 rounded-md hover:bg-gray-300 transition-colors cursor-pointer text-xs md:text-sm"
					>
						<svg
							className="w-4 h-4"
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
						Previous Week
					</Button>

					<Button
						onClick={onGoToCurrentWeek}
						className="px-2 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer text-xs md:text-sm"
					>
						Current Week
					</Button>

					<Button
						onClick={() => onNavigateWeek("next")}
						className="flex items-center gap-1 py-2 text-gray-800 font-medium bg-gray-200 rounded-md hover:bg-gray-300 transition-colors cursor-pointer text-xs md:text-sm"
					>
						Next Week
						<svg
							className="w-4 h-4"
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
					</Button>
				</div>
			</div>
		</div>
	);
};

export default WeekNavigation;
