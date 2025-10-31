import React from "react";
import { format } from "date-fns";
import { Button } from "../../../components/ui/button";
import type { IncomeWeekSelection, IncomeWeekInfo } from "../../../types/finance";

interface WeekNavigationProps {
	selectedWeek: IncomeWeekSelection;
	years: number[];
	currentYearWeeks: IncomeWeekInfo[];
	onYearChange: (year: number) => void;
	onWeekChange: (weekNumber: number) => void;
	onNavigateWeek: (direction: "prev" | "next") => void;
	onGoToCurrentWeek: () => void;
}

const WeekNavigation: React.FC<WeekNavigationProps> = ({
	selectedWeek,
	years,
	currentYearWeeks,
	onYearChange,
	onWeekChange,
	onNavigateWeek,
	onGoToCurrentWeek,
}) => {
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
				<div className="text-left">
					<label
						htmlFor="year_select"
						className="block text-md font-medium text-gray-700 mb-1"
					>
						Year
					</label>
					<select
						id="year_select"
						value={selectedWeek.year}
						onChange={(e) => onYearChange(parseInt(e.target.value))}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
					>
						{years.map((year) => (
							<option key={year} value={year}>
								{year}
							</option>
						))}
					</select>
				</div>

				<div className="text-left">
					<label
						htmlFor="week_select"
						className="block text-md font-medium text-gray-700 mb-1"
					>
						Week
					</label>
					<select
						id="week_select"
						value={selectedWeek.week}
						onChange={(e) => onWeekChange(parseInt(e.target.value))}
						className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
					>
						{currentYearWeeks.map((week) => (
							<option key={week.number + "-" + week.label} value={week.number}>
								{week.label}
							</option>
						))}
					</select>
				</div>
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
