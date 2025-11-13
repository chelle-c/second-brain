import React, { useState } from "react";
import { isSameDay, parseISO, startOfDay, endOfDay } from "date-fns";
import type { IncomeWeekSelection, IncomeDayData } from "@/types/income";
import { DAYS, years } from "@/lib/dateUtils";
import { useIncomeStore } from "@/stores/useIncomeStore";
import WeekNavigation from "@/apps/Finances/income/components/WeekNavigation";
import IncomeEntriesList from "@/apps/Finances/income/components/IncomeEntriesList";
import WeeklySummary from "@/apps/Finances/income/components/WeeklySummary";
import IncomeChart from "@/apps/Finances/income/components/IncomeChart";
import ViewTabs from "@/apps/Finances/income/components/ViewTabs";
import MonthlyView from "@/apps/Finances/income/components/MonthlyView";
import YearlyView from "@/apps/Finances/income/components/YearlyView";

export const IncomeTracker: React.FC = () => {
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

	const { incomeEntries, incomeViewType } = useIncomeStore();

	// Week navigation state
	const [selectedWeek, setSelectedWeek] = useState<IncomeWeekSelection>(() => {
		const today = new Date();
		const startOfWeek = new Date(today);
		startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
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

	// Derived data
	const currentWeekEntries = incomeEntries.filter((entry) => {
		const entryDate = startOfDay(parseISO(entry.date));
		const weekStart = startOfDay(selectedWeek.startDate);
		const weekEnd = endOfDay(selectedWeek.endDate);

		return entryDate >= weekStart && entryDate <= weekEnd;
	});

	const getWeeklyData = (): IncomeDayData[] => {
		const weekStart = selectedWeek.startDate;

		return DAYS.map((dayName, index) => {
			const dayDate = new Date(weekStart.getTime() + index * 24 * 60 * 60 * 1000);
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
		<div className="max-w-screen min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-100 flex items-start pb-4">
			<div className="w-full max-w-full lg:max-w-6xl mx-auto px-4">
				<div className="flex flex-col lg:flex-row gap-4 mb-8 justify-between items-center">
					<div className="text-left">
						<h1 className="text-3xl font-bold text-gray-900">Income Tracker</h1>
						<p className="text-gray-600">Manage your income</p>
					</div>

					<ViewTabs />
				</div>

				{incomeViewType === "weekly" ? (
					<>
						<div className="flex flex-col gap-8">
							<div className="flex flex-row gap-4">
								<WeekNavigation
									selectedWeek={selectedWeek}
									setSelectedWeek={setSelectedWeek}
									years={years}
								/>

								<WeeklySummary
									weeklyTotal={weeklyTotal}
									selectedWeek={selectedWeek.week}
								/>
							</div>

							{currentWeekEntries.length > 0 && (
								<IncomeChart weeklyData={weeklyData} />
							)}
						</div>
						<div className="mt-6">
							<IncomeEntriesList
								selectedWeek={selectedWeek}
								currentWeekEntries={currentWeekEntries}
							/>
						</div>
					</>
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
