import React, { useState, useEffect } from "react";
import { years } from "@/lib/dateUtils";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import WeekNavigation from "./components/WeekNavigation";
import IncomeEntriesList from "./components/IncomeEntriesList";
import WeeklySummary from "./components/WeeklySummary";
import IncomeChart from "./components/IncomeChart";
import ViewTabs from "./components/ViewTabs";
import MonthlyView from "./components/MonthlyView";
import YearlyView from "./components/YearlyView";
import type { IncomeWeekSelection, IncomeDayData } from "@/types/income";
import { isSameDay, parseISO, startOfDay, endOfDay, format } from "date-fns";

export const IncomeTracker: React.FC = () => {
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

	const { incomeEntries, incomeViewType, setIncomeViewType } = useIncomeStore();
	const { incomeDefaultView, incomeWeekStartDay } = useSettingsStore();

	// Set default view from settings on mount
	useEffect(() => {
		setIncomeViewType(incomeDefaultView);
	}, []);

	const getWeekStartDate = (date: Date, weekStartDay: number): Date => {
		const dayOfWeek = date.getDay();
		const diff = (dayOfWeek - weekStartDay + 7) % 7;
		const start = new Date(date);
		start.setDate(date.getDate() - diff);
		return start;
	};

	const [selectedWeek, setSelectedWeek] = useState<IncomeWeekSelection>(() => {
		const today = new Date();
		const startOfWeek = getWeekStartDate(today, incomeWeekStartDay);
		return {
			year: today.getFullYear(),
			week: Math.ceil(
				(today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) /
					(7 * 24 * 60 * 60 * 1000)
			),
			startDate: startOfWeek,
			endDate: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000),
		};
	});

	// Update selected week when week start day setting changes
	useEffect(() => {
		const today = new Date();
		const startOfWeek = getWeekStartDate(today, incomeWeekStartDay);
		setSelectedWeek({
			year: today.getFullYear(),
			week: Math.ceil(
				(today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) /
					(7 * 24 * 60 * 60 * 1000)
			),
			startDate: startOfWeek,
			endDate: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000),
		});
	}, [incomeWeekStartDay]);

	const currentWeekEntries = incomeEntries.filter((entry) => {
		const entryDate = startOfDay(parseISO(entry.date));
		const weekStart = startOfDay(selectedWeek.startDate);
		const weekEnd = endOfDay(selectedWeek.endDate);

		return entryDate >= weekStart && entryDate <= weekEnd;
	});

	const getWeeklyData = (): IncomeDayData[] => {
		const weekStart = selectedWeek.startDate;

		return Array.from({ length: 7 }, (_, index) => {
			const dayDate = new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000);
			const dayName = format(dayDate, "EEEE"); // Get actual day name from date
			const dayEntries = incomeEntries.filter((entry) =>
				isSameDay(parseISO(entry.date), dayDate)
			);

			const latestEntry = dayEntries.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
			)[0];

			const totalAmount = latestEntry ? latestEntry.amount : 0;

			return {
				name: dayName.substring(0, 3),
				amount: totalAmount,
				date: dayDate,
				isCurrentDay: isSameDay(dayDate, new Date()),
			};
		});
	};

	const weeklyData = getWeeklyData();
	const weeklyTotal = weeklyData.reduce((sum, day) => sum + day.amount, 0);

	return (
		<div className="flex-1 overflow-y-auto max-h-[98vh] p-2 w-full min-h-screen">
			<div className="w-full max-w-7xl mx-auto animate-slideUp">
				{/* Header */}
				<div className="mb-4">
					<ViewTabs />
				</div>

				{incomeViewType === "weekly" ? (
					<div className="space-y-4">
						{/* Top Row: Summary (wider) + Navigation */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
							<div className="lg:col-span-1">
								<WeekNavigation
									selectedWeek={selectedWeek}
									setSelectedWeek={setSelectedWeek}
									years={years}
								/>
							</div>
							<div className="lg:col-span-2">
								<WeeklySummary
									weeklyTotal={weeklyTotal}
									selectedWeek={selectedWeek.week}
								/>
							</div>
						</div>

						{/* Chart + Entries Row */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
							{currentWeekEntries.length > 0 && (
								<div className="lg:col-span-2">
									<IncomeChart weeklyData={weeklyData} />
								</div>
							)}
							<div
								className={
									currentWeekEntries.length > 0
										? "lg:col-span-1"
										: "lg:col-span-3"
								}
							>
								<IncomeEntriesList
									selectedWeek={selectedWeek}
									currentWeekEntries={currentWeekEntries}
								/>
							</div>
						</div>
					</div>
				) : incomeViewType === "monthly" ? (
					<MonthlyView
						selectedYear={selectedYear}
						onYearChange={setSelectedYear}
						years={years}
					/>
				) : (
					<YearlyView />
				)}
			</div>
		</div>
	);
};
