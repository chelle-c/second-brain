import {
	addDays,
	addMonths,
	addWeeks,
	addYears,
	isBefore,
	isWithinInterval,
	startOfDay,
} from "date-fns";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { PieChart, type PieChartData } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { getCurrencySymbol } from "@/lib/currencyUtils";
import { formatCurrency } from "@/lib/date-utils/formatting";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/expenseHelpers";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ExpenseTable } from "./ExpenseTable";

export const UpcomingExpenses = () => {
	const {
		expenses,
		categoryColors,
		deleteExpense,
		archiveExpense,
		unarchiveExpense,
		toggleExpensePaid,
		deleteModal,
		setDeleteModal,
		upcomingTimeAmount,
		upcomingTimeUnit,
		setUpcomingTimeAmount,
		setUpcomingTimeUnit,
		showUpcomingRelativeDates,
		setShowUpcomingRelativeDates,
	} = useExpenseStore();
	const { expenseCurrency } = useSettingsStore();
	const currencySymbol = getCurrencySymbol(expenseCurrency);

	const today = useMemo(() => startOfDay(new Date()), []);

	// End of the user-selected lookahead window
	const endDate = useMemo(() => {
		switch (upcomingTimeUnit) {
			case "days":
				return addDays(today, upcomingTimeAmount);
			case "weeks":
				return addWeeks(today, upcomingTimeAmount);
			case "months":
				return addMonths(today, upcomingTimeAmount);
			case "years":
				return addYears(today, upcomingTimeAmount);
		}
	}, [upcomingTimeAmount, upcomingTimeUnit, today]);

	/**
	 * Combined list: overdue unpaid + upcoming (due within the window).
	 * Parent recurring expenses are excluded; only their occurrences appear.
	 * Overdue entries that are already paid are excluded.
	 * Duplicates are prevented via a Set.
	 */
	const tableExpenses = useMemo(() => {
		const seen = new Set<string>();
		const result: typeof expenses = [];

		for (const expense of expenses) {
			if (expense.isArchived) continue;
			if (expense.isRecurring && !expense.parentExpenseId) continue;
			if (!expense.dueDate) continue;

			const dueDate = startOfDay(expense.dueDate);
			const isOverdue = isBefore(dueDate, today) && !expense.isPaid;
			const isUpcoming = isWithinInterval(dueDate, {
				start: today,
				end: endDate,
			});

			if ((isOverdue || isUpcoming) && !seen.has(expense.id)) {
				seen.add(expense.id);
				result.push(expense);
			}
		}

		return result;
	}, [expenses, today, endDate]);

	// Chart / totals use only unpaid expenses from the combined list
	const categoryTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		tableExpenses.forEach((expense) => {
			if (!expense.isPaid) {
				totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
			}
		});
		return totals;
	}, [tableExpenses]);

	const total = useMemo(
		() => Object.values(categoryTotals).reduce((sum, val) => sum + val, 0),
		[categoryTotals],
	);

	const overdueCount = useMemo(
		() =>
			tableExpenses.filter((e) => {
				if (e.isPaid || !e.dueDate) return false;
				return isBefore(startOfDay(e.dueDate), today);
			}).length,
		[tableExpenses, today],
	);

	const chartData: PieChartData[] = Object.entries(categoryTotals).map(([category, amount]) => ({
		name: category,
		value: amount,
	}));

	const placeholderData: PieChartData[] = [
		{ name: "Housing", value: 1200 },
		{ name: "Food", value: 400 },
		{ name: "Transportation", value: 300 },
	];

	const isPlaceholder = chartData.length === 0;
	const displayData = isPlaceholder ? placeholderData : chartData;
	const allColors = { ...DEFAULT_CATEGORY_COLORS, ...categoryColors };

	const timeUnitOptions = [
		{
			value: "days" as const,
			label: "Days",
			ariaLabel: "Show expenses due in days",
		},
		{
			value: "weeks" as const,
			label: "Weeks",
			ariaLabel: "Show expenses due in weeks",
		},
		{
			value: "months" as const,
			label: "Months",
			ariaLabel: "Show expenses due in months",
		},
		{
			value: "years" as const,
			label: "Years",
			ariaLabel: "Show expenses due in years",
		},
	];

	const renderTooltip = (datum: PieChartData, tooltipTotal: number) => (
		<>
			<p className="font-medium text-popover-foreground">{datum.name}</p>
			<p className="text-primary font-bold">
				{isPlaceholder ? "Example: " : ""}
				{formatCurrency(datum.value, expenseCurrency)}
			</p>
			{!isPlaceholder && tooltipTotal > 0 && (
				<p className="text-xs text-muted-foreground">
					{((datum.value / tooltipTotal) * 100).toFixed(1)}% of total
				</p>
			)}
		</>
	);

	const handleDeleteClick = (id: string, name: string) => {
		setDeleteModal({ isOpen: true, id, name });
	};

	const handleDeleteConfirm = () => {
		deleteExpense(deleteModal.id);
		setDeleteModal({ isOpen: false, id: "", name: "" });
	};

	const handleDeleteCancel = () => {
		setDeleteModal({ isOpen: false, id: "", name: "" });
	};

	const getTimeRangeText = () => {
		const unitText =
			upcomingTimeAmount === 1 ? upcomingTimeUnit.slice(0, -1) : upcomingTimeUnit;
		return `${upcomingTimeAmount} ${unitText}`;
	};

	return (
		<>
			<div className="bg-card rounded-xl shadow-lg p-4 sm:p-6 animate-slideUp">
				{/* Header */}
				<div className="pb-4">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
						<h3 className="text-lg sm:text-xl font-bold text-card-foreground flex items-center gap-2">
							<Clock className="text-primary" size={24} />
							Upcoming Expenses
						</h3>

						{/* Time Range Selector */}
						<div className="bg-muted rounded-lg p-4 w-full sm:w-auto">
							<label
								htmlFor="time-amount"
								className="block text-sm font-medium text-foreground mb-3"
							>
								Show expenses due within:
							</label>
							<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
								<div className="w-full sm:w-24">
									<label htmlFor="time-amount" className="sr-only">
										Time amount
									</label>
									<input
										id="time-amount"
										type="number"
										min="1"
										max="999"
										value={upcomingTimeAmount}
										onChange={(e) => {
											const val = parseInt(e.target.value, 10);
											if (val > 0 && val <= 999) {
												setUpcomingTimeAmount(val);
											}
										}}
										className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
										aria-label="Number of time units"
									/>
								</div>
								<AnimatedToggle
									options={timeUnitOptions}
									value={upcomingTimeUnit}
									onChange={(value) =>
										setUpcomingTimeUnit(value as typeof upcomingTimeUnit)
									}
								/>
							</div>
						</div>
					</div>
				</div>

				<div>
					{/* Overview */}
					<div className="flex flex-col lg:flex-row gap-6 mb-8">
						{/* Left — totals */}
						<div className="lg:w-80 flex flex-col gap-4">
							<div className="bg-linear-to-br from-secondary to-accent rounded-lg p-6 flex-1 flex flex-col justify-center">
								<div className="text-center">
									<p className="text-sm text-muted-foreground mb-2">
										Total Unpaid
									</p>
									<div className="flex items-center justify-center gap-2">
										<span className="text-primary text-2xl font-bold">
											{currencySymbol}
										</span>
										<p className="text-2xl sm:text-4xl font-bold text-primary">
											{formatCurrency(total, expenseCurrency).replace(
												/^[^0-9]+/,
												"",
											)}
										</p>
									</div>
									<p className="text-xs text-muted-foreground mt-2">
										{tableExpenses.filter((e) => !e.isPaid).length} unpaid
										expenses
										{overdueCount > 0 && (
											<span className="text-red-500 ml-1">
												({overdueCount} overdue)
											</span>
										)}
									</p>
								</div>
							</div>

							{chartData.length > 0 && (
								<div className="bg-muted rounded-lg p-4">
									<p className="text-xs font-bold text-foreground mb-2">
										Top Categories:
									</p>
									{chartData
										.sort((a, b) => b.value - a.value)
										.slice(0, 3)
										.map((category) => (
											<div
												key={category.name}
												className="flex items-center justify-between text-xs mb-1"
											>
												<span className="text-muted-foreground">
													{category.name}
												</span>
												<span className="font-medium text-foreground">
													{((category.value / total) * 100).toFixed(0)}%
												</span>
											</div>
										))}
								</div>
							)}
						</div>

						{/* Right — chart */}
						<div className="flex-1 min-w-0">
							{isPlaceholder && (
								<p className="text-center text-muted-foreground text-sm mb-4">
									Example distribution - Add expenses to see your data
								</p>
							)}

							<div
								className={`flex flex-col space-y-4 ${
									isPlaceholder ? "opacity-60" : ""
								}`}
							>
								<div className="h-48 sm:h-64">
									<PieChart
										data={displayData}
										colors={allColors}
										opacity={isPlaceholder ? 0.5 : 1}
										renderTooltip={renderTooltip}
									/>
								</div>

								<div className="flex gap-x-6 gap-y-2 justify-center mt-4 flex-wrap">
									{displayData.map((entry) => (
										<div
											key={`legend-${entry.name}`}
											className="flex items-center gap-2"
										>
											<span
												className="w-3 h-3 rounded-full shrink-0"
												style={{
													backgroundColor:
														categoryColors[entry.name] ||
														DEFAULT_CATEGORY_COLORS[entry.name] ||
														"var(--chart-1)",
												}}
											/>
											<span className="text-sm font-medium text-muted-foreground">
												{entry.name}
											</span>
											<span className="text-sm font-bold text-foreground whitespace-nowrap">
												{isPlaceholder && "ex: "}
												{formatCurrency(entry.value, expenseCurrency)}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>
					</div>

					{/* Expense Table — overdue + upcoming combined */}
					<div className="mt-8 pt-6 border-t border-border">
						<div className="flex items-center justify-between mx-2 mb-4">
							<div className="flex flex-col items-baseline gap-2">
								<h4 className="text-lg font-semibold text-card-foreground mb-2 flex items-center gap-2">
									<TrendingUp size={20} className="text-primary" />
									Expense Details
								</h4>
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Calendar size={16} />
									<span className="font-medium">
										Overdue + next {getTimeRangeText()}
									</span>
								</div>
							</div>
							<Button
								variant="secondary"
								size="sm"
								onClick={() =>
									setShowUpcomingRelativeDates(!showUpcomingRelativeDates)
								}
								title={
									showUpcomingRelativeDates ? "Show actual dates" : (
										"Show relative dates"
									)
								}
							>
								{showUpcomingRelativeDates ?
									<>
										<Calendar size={14} className="mr-2" />
										<span>Show Dates</span>
									</>
								:	<>
										<Clock size={14} className="mr-2" />
										<span>Show Relative</span>
									</>
								}
							</Button>
						</div>
						<ExpenseTable
							expensesToDisplay={tableExpenses}
							isCurrentMonth={false}
							selectedMonth={new Date()}
							onDelete={handleDeleteClick}
							onArchive={archiveExpense}
							onUnarchive={unarchiveExpense}
							onTogglePaid={toggleExpensePaid}
							showArchiveActions={false}
							isAllExpensesView={false}
							showRelativeDates={showUpcomingRelativeDates}
							categoryColors={categoryColors}
						/>
					</div>
				</div>
			</div>

			<ConfirmationModal
				isOpen={deleteModal.isOpen}
				title="Confirm Deletion"
				message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>
		</>
	);
};
