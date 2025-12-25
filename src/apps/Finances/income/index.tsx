import { endOfDay, format, isSameDay, parseISO, startOfDay } from "date-fns";
import { Redo2, Undo2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { years } from "@/lib/dateUtils";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { IncomeDayData, IncomeWeekSelection } from "@/types/income";
import IncomeChart from "./components/IncomeChart";
import IncomeEntriesList from "./components/IncomeEntriesList";
import MonthlyView from "./components/MonthlyView";
import WeeklySummary from "./components/WeeklySummary";
import WeekNavigation from "./components/WeekNavigation";
import YearlyView from "./components/YearlyView";

export const IncomeTracker: React.FC = () => {
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

	const {
		incomeEntries,
		incomeViewType,
		setIncomeViewType,
		updateIncomeViewType,
		undo,
		redo,
	} = useIncomeStore();
	const { canUndo, canRedo } = useHistoryStore();
	const { incomeDefaultView, incomeWeekStartDay } = useSettingsStore();

	// Set default view from settings on mount
	useEffect(() => {
		setIncomeViewType(incomeDefaultView);
	}, []);

	// Keyboard shortcuts for undo/redo
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
			const modKey = isMac ? e.metaKey : e.ctrlKey;

			// Ctrl/Cmd + Z to undo
			if (modKey && e.key === "z" && !e.shiftKey && canUndo) {
				e.preventDefault();
				undo();
			}

			// Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y to redo
			if (
				(modKey && e.shiftKey && e.key === "z") ||
				(modKey && e.key === "y")
			) {
				if (canRedo) {
					e.preventDefault();
					redo();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [canUndo, canRedo, undo, redo]);

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
					(7 * 24 * 60 * 60 * 1000),
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
					(7 * 24 * 60 * 60 * 1000),
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
			const dayDate = new Date(
				weekStart.getTime() + index * 24 * 60 * 60 * 1000,
			);
			const dayName = format(dayDate, "EEEE"); // Get actual day name from date
			const dayEntries = incomeEntries.filter((entry) =>
				isSameDay(parseISO(entry.date), dayDate),
			);

			const latestEntry = dayEntries.sort(
				(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
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

	const viewModeOptions = [
		{
			value: "weekly" as const,
			label: "Weekly",
			ariaLabel: "Show weekly summary",
		},
		{
			value: "monthly" as const,
			label: "Monthly",
			ariaLabel: "Show monthly summary",
		},
		{
			value: "yearly" as const,
			label: "Yearly",
			ariaLabel: "Show yearly summary",
		},
	];

	return (
		<div className="flex-1 overflow-y-auto max-h-[98vh] p-2 w-full min-h-screen">
			<div className="w-full max-w-7xl mx-auto animate-slideUp">
				{/* Header */}
				<div className="flex items-center justify-between mb-4">
					<div className="w-min">
						<AnimatedToggle
							options={viewModeOptions}
							value={incomeViewType}
							onChange={updateIncomeViewType}
						/>
					</div>
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={undo}
							disabled={!canUndo}
							className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
							title="Undo (Ctrl+Z)"
						>
							<Undo2 size={18} />
						</button>
						<button
							type="button"
							onClick={redo}
							disabled={!canRedo}
							className="p-1.5 hover:bg-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
							title="Redo (Ctrl+Y)"
						>
							<Redo2 size={18} />
						</button>
					</div>
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
