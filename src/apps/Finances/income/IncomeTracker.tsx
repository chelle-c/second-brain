import React, { useState } from "react";
import { isSameDay, parseISO, startOfDay, endOfDay, getWeek, startOfWeek, addDays } from "date-fns";
import type {
	IncomeEntry,
	IncomeWeekSelection,
	IncomeDayData,
} from "@/types/income";
import {
	getWeeksForYear,
	getAvailableDates,
	parsePasteText,
	DAYS,
	years,
	getMonthlyData,
	getYearlyData,
	getTotalHoursWorked,
	getTotalAmount,
} from "@/lib/dateUtils";
import useAppStore from "@/stores/useAppStore";
import WeekNavigation from "@/apps/Finances/income/components/WeekNavigation";
import IncomeEntriesList from "@/apps/Finances/income/components/IncomeEntriesList";
import WeeklySummary from "@/apps/Finances/income/components/WeeklySummary"; // Updated import
import IncomeChart from "@/apps/Finances/income/components/IncomeChart";
import ViewTabs from "@/apps/Finances/income/components/ViewTabs";
import MonthlyView from "@/apps/Finances/income/components/MonthlyView";
import YearlyView from "@/apps/Finances/income/components/YearlyView";

export const IncomeTracker: React.FC = () => {
	const [weeklyTarget, setWeeklyTarget] = useState({ amount: 575 }); // Global target
	const [entryMethod, setEntryMethod] = useState<"manual" | "paste">("paste");
	const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
	const [editEntryForm, setEditEntryForm] = useState<IncomeEntry | null>(null);
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

	const {
		incomeEntries,
		incomeWeeklyTargets,
		incomeViewType,
		addIncomeWeeklyTarget,
		updateIncomeWeeklyTarget,
		addIncomeEntry,
		updateIncomeEntry,
		deleteIncomeEntry,
	} = useAppStore();

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

	// Form states
	const [newEntry, setNewEntry] = useState<Omit<IncomeEntry, "id">>({
		date: new Date().toISOString().split("T")[0],
		amount: 0,
		hours: 0,
		minutes: 0,
	});

	const [pasteText, setPasteText] = useState("");
	const [parsedEntries, setParsedEntries] = useState<any[]>([]);
	const [parseError, setParseError] = useState("");

	// Derived data
	const currentYearWeeks = getWeeksForYear(selectedWeek.year);
	const availableDates = getAvailableDates(selectedWeek.startDate);
	const monthlyData = getMonthlyData(incomeEntries, selectedYear);
	const yearlyData = getYearlyData(incomeEntries);
	const totalHours = getTotalHoursWorked(incomeEntries);
	const totalAmount = getTotalAmount(incomeEntries);

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

	// Week navigation handlers
	const handleYearChange = (year: number) => {
		const weeks = getWeeksForYear(year);
		const weekToSelect = weeks.find((w) => w.number === selectedWeek.week) || weeks[0];

		setSelectedWeek({
			year,
			week: weekToSelect.number,
			startDate: weekToSelect.startDate,
			endDate: weekToSelect.endDate,
		});
	};

	const handleWeekChange = (weekNumber: number) => {
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

	const navigateWeek = (direction: "prev" | "next") => {
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

	const goToCurrentWeek = () => {
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

	// Entry editing handlers
	const startEditingEntry = (entry: IncomeEntry) => {
		setEditingEntryId(entry.id);
		setEditEntryForm({ ...entry });
	};

	const cancelEditingEntry = () => {
		setEditingEntryId(null);
		setEditEntryForm(null);
	};

	const handleEditEntryChange = (field: keyof IncomeEntry, value: string | number) => {
		if (editEntryForm) {
			setEditEntryForm((prev) => (prev ? { ...prev, [field]: value } : null));
		}
	};

	const saveEditedEntry = () => {
		if (editEntryForm) {
			const updatedEntry = {
				...editEntryForm,
				amount: parseFloat(editEntryForm.amount.toFixed(2)),
			};

			updateIncomeEntry(updatedEntry);

			setEditingEntryId(null);
			setEditEntryForm(null);
		}
	};

	// Paste text handling
	const handlePasteTextChange = (text: string) => {
		setPasteText(text);
		setParseError("");

		if (text.trim()) {
			try {
				const parsed = parsePasteText(text, selectedWeek.year);
				setParsedEntries(parsed);
			} catch (error) {
				setParseError("Error parsing text. Please check the format.");
			}
		} else {
			setParsedEntries([]);
		}
	};

	const handleAddParsedEntries = () => {
		const newEntries: IncomeEntry[] = parsedEntries.map((parsed) => ({
			id: Date.now().toString() + Math.random(),
			date: parsed.date,
			amount: parsed.amount,
			hours: parsed.hours,
			minutes: parsed.minutes,
		}));

		newEntries.forEach((entry) => addIncomeEntry(entry));

		setPasteText("");
		setParsedEntries([]);
		setParseError("");
	};

	// Manual entry handlers
	const handleAddEntry = (e: React.FormEvent) => {
		e.preventDefault();
		if (newEntry.amount <= 0) return;

		const entry: IncomeEntry = {
			...newEntry,
			id: Date.now().toString(),
			amount: parseFloat(newEntry.amount.toFixed(2)),
		};

		addIncomeEntry(entry);

		setNewEntry({
			date: new Date().toISOString().split("T")[0],
			amount: 0,
			hours: 0,
			minutes: 0,
		});
	};

	const handleDeleteEntry = (id: string) => {
		deleteIncomeEntry(id);
	};

	// Target handler
	const handleUpdateTarget = (amount: number) => {
		const existingTarget = incomeWeeklyTargets
			? incomeWeeklyTargets.find((target) => target.id === selectedWeek.week.toString())
			: undefined;
		existingTarget === undefined
			? addIncomeWeeklyTarget(selectedWeek.week.toString(), amount)
			: updateIncomeWeeklyTarget({ id: selectedWeek.week.toString(), amount });
		setWeeklyTarget({
			amount: incomeWeeklyTargets.filter(
				(target) => target.id === selectedWeek.week.toString()
			)[0].amount,
		});
	};

	const resetEntryForm = () => {
		setNewEntry({
			date: new Date().toISOString().split("T")[0],
			amount: 0,
			hours: 0,
			minutes: 0,
		});
		setPasteText("");
		setParsedEntries([]);
		setParseError("");
	};

	const handleNewEntryChange = (field: keyof IncomeEntry, value: string | number) => {
		setNewEntry((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<div className="max-w-screen min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-100 flex items-start pb-4">
			<div className="w-full max-w-full lg:max-w-6xl mx-auto px-4">
				<div className="flex flex-col lg:flex-row gap-4 mb-8 justify-between items-center">
					<div className="text-left">
						<h1 className="text-3xl font-bold text-gray-900">Income Tracker</h1>
						<p className="text-gray-600">Manage your income</p>
					</div>

					<ViewTabs totalAmount={totalAmount} totalHours={totalHours} />
				</div>

				{incomeViewType === "weekly" && (
					<div>
						<div className="flex flex-col gap-8">
							<div className="flex flex-row gap-4">
								<WeekNavigation
									selectedWeek={selectedWeek}
									years={years}
									currentYearWeeks={currentYearWeeks}
									onYearChange={handleYearChange}
									onWeekChange={handleWeekChange}
									onNavigateWeek={navigateWeek}
									onGoToCurrentWeek={goToCurrentWeek}
								/>

								<WeeklySummary
									weeklyTotal={weeklyTotal}
									weeklyTarget={weeklyTarget}
									onUpdateTarget={handleUpdateTarget}
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
								editingEntryId={editingEntryId}
								editEntryForm={editEntryForm}
								availableDates={availableDates}
								onStartEditing={startEditingEntry}
								onCancelEditing={cancelEditingEntry}
								onEditEntryChange={handleEditEntryChange}
								onSaveEditedEntry={saveEditedEntry}
								onDeleteEntry={handleDeleteEntry}
								onAddEntry={handleAddEntry}
								onPasteTextChange={handlePasteTextChange}
								onAddParsedEntries={handleAddParsedEntries}
								newEntry={newEntry}
								onNewEntryChange={handleNewEntryChange}
								pasteText={pasteText}
								parsedEntries={parsedEntries}
								parseError={parseError}
								entryMethod={entryMethod}
								onEntryMethodChange={setEntryMethod}
								onResetForm={resetEntryForm}
								currentWeekEntries={currentWeekEntries}
							/>
						</div>
					</div>
				)}

				{incomeViewType === "monthly" && (
					<div className="mt-6">
						<MonthlyView
							monthlyData={monthlyData}
							selectedYear={selectedYear}
							onYearChange={setSelectedYear}
							years={years}
						/>
					</div>
				)}

				{incomeViewType === "yearly" && (
					<div className="mt-6">
						<YearlyView yearlyData={yearlyData} />
					</div>
				)}
			</div>
		</div>
	);
};
