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

	const tableExpenses = useMemo(() => {
		const seen = new Set<string>();
		const result: typeof expenses = [];
		for (const expense of expenses) {
			if (
				expense.isArchived ||
				(expense.isRecurring && !expense.parentExpenseId) ||
				!expense.dueDate
			)
				continue;
			const dueDate = startOfDay(expense.dueDate);
			const isOverdue = isBefore(dueDate, today) && !expense.isPaid;
			const isUpcoming = isWithinInterval(dueDate, { start: today, end: endDate });
			if ((isOverdue || isUpcoming) && !seen.has(expense.id)) {
				seen.add(expense.id);
				result.push(expense);
			}
		}
		return result;
	}, [expenses, today, endDate]);

	const { categoryTotals, hasNonExactByCategory } = useMemo(() => {
		const totals: Record<string, number> = {};
		const nonExact: Record<string, boolean> = {};
		tableExpenses.forEach((expense) => {
			if (!expense.isPaid) {
				totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
				if (expense.amountData && expense.amountData.type !== "exact")
					nonExact[expense.category] = true;
			}
		});
		return { categoryTotals: totals, hasNonExactByCategory: nonExact };
	}, [tableExpenses]);

	const total = useMemo(
		() => Object.values(categoryTotals).reduce((s, v) => s + v, 0),
		[categoryTotals],
	);
	const overdueCount = useMemo(
		() =>
			tableExpenses.filter(
				(e) => !e.isPaid && e.dueDate && isBefore(startOfDay(e.dueDate), today),
			).length,
		[tableExpenses, today],
	);

	const chartData: PieChartData[] = Object.entries(categoryTotals).map(([c, a]) => ({
		name: c,
		value: a,
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
		{ value: "days" as const, label: "Days", ariaLabel: "Days" },
		{ value: "weeks" as const, label: "Weeks", ariaLabel: "Weeks" },
		{ value: "months" as const, label: "Months", ariaLabel: "Months" },
		{ value: "years" as const, label: "Years", ariaLabel: "Years" },
	];

	const renderTooltip = (datum: PieChartData, tt: number) => (
		<>
			<p className="font-medium text-popover-foreground">{datum.name}</p>
			<p className="text-primary font-bold">
				{isPlaceholder ? "Example: " : ""}
				{!isPlaceholder && hasNonExactByCategory[datum.name] ? "~ " : ""}
				{formatCurrency(datum.value, expenseCurrency)}
			</p>
			{!isPlaceholder && hasNonExactByCategory[datum.name] && (
				<p className="text-xs text-muted-foreground italic">
					Includes estimated/range amounts
				</p>
			)}
			{!isPlaceholder && tt > 0 && (
				<p className="text-xs text-muted-foreground">
					{((datum.value / tt) * 100).toFixed(1)}% of total
				</p>
			)}
		</>
	);

	const getTimeRangeText = () => {
		const u = upcomingTimeAmount === 1 ? upcomingTimeUnit.slice(0, -1) : upcomingTimeUnit;
		return `${upcomingTimeAmount} ${u}`;
	};

	return (
		<>
			<div className="bg-card rounded-xl shadow-lg p-4 sm:p-6 animate-fadeIn">
				{/* Header */}
				<div className="pb-3">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
						<h3 className="text-base sm:text-lg font-bold text-card-foreground flex items-center gap-2">
							<Clock className="text-primary" size={20} />
							Upcoming Expenses
						</h3>
						<div className="bg-muted rounded-lg p-3 w-full sm:w-auto">
							<label
								htmlFor="time-amount"
								className="block text-xs font-medium text-foreground mb-2"
							>
								Show expenses due within:
							</label>
							<div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
								<div className="w-full sm:w-20">
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
											const v = parseInt(e.target.value, 10);
											if (v > 0 && v <= 999) setUpcomingTimeAmount(v);
										}}
										className="w-full px-2 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary"
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

				{/* Overview */}
				<div className="flex flex-col lg:flex-row gap-4 mb-6">
					<div className="lg:w-72 flex flex-col gap-3">
						<div className="bg-linear-to-br from-secondary to-accent rounded-lg p-3 sm:p-4 flex-1 flex flex-col justify-center">
							<div className="text-center">
								<p className="text-xs text-muted-foreground mb-1">Total Unpaid</p>
								<div className="flex items-center justify-center gap-1">
									<span className="text-primary text-lg font-bold">
										{currencySymbol}
									</span>
									<p className="text-xl sm:text-2xl font-bold text-primary">
										{formatCurrency(total, expenseCurrency).replace(
											/^[^0-9]+/,
											"",
										)}
									</p>
								</div>
								<p className="text-xs text-muted-foreground mt-1">
									{tableExpenses.filter((e) => !e.isPaid).length} unpaid
									{overdueCount > 0 && (
										<span className="text-red-500 ml-1">
											({overdueCount} overdue)
										</span>
									)}
								</p>
							</div>
						</div>
						{chartData.length > 0 && (
							<div className="bg-muted rounded-lg p-3">
								<p className="text-xs font-bold text-foreground mb-1.5">
									Top Categories:
								</p>
								{chartData
									.sort((a, b) => b.value - a.value)
									.slice(0, 3)
									.map((c) => (
										<div
											key={c.name}
											className="flex items-center justify-between text-xs mb-1"
										>
											<span className="text-muted-foreground">
												{hasNonExactByCategory[c.name] ? "~ " : ""}
												{c.name}
											</span>
											<span className="font-medium text-foreground">
												{((c.value / total) * 100).toFixed(0)}%
											</span>
										</div>
									))}
							</div>
						)}
					</div>

					<div className="flex-1 min-w-0">
						{isPlaceholder && (
							<p className="text-center text-muted-foreground text-xs mb-2">
								Example distribution — add expenses to see your data
							</p>
						)}
						<div
							className={`flex flex-col space-y-3 ${isPlaceholder ? "opacity-60" : ""}`}
						>
							<div className="h-36 sm:h-48">
								<PieChart
									data={displayData}
									colors={allColors}
									opacity={isPlaceholder ? 0.5 : 1}
									renderTooltip={renderTooltip}
								/>
							</div>
							<div className="flex gap-x-4 gap-y-1.5 justify-center flex-wrap">
								{displayData.map((entry) => (
									<div
										key={`legend-${entry.name}`}
										className="flex items-center gap-1.5"
									>
										<span
											className="w-2.5 h-2.5 rounded-full shrink-0"
											style={{
												backgroundColor:
													categoryColors[entry.name] ||
													DEFAULT_CATEGORY_COLORS[entry.name] ||
													"var(--chart-1)",
											}}
										/>
										<span className="text-xs font-medium text-muted-foreground">
											{entry.name}
										</span>
										<span className="text-xs font-bold text-foreground whitespace-nowrap">
											{isPlaceholder && "ex: "}
											{!isPlaceholder && hasNonExactByCategory[entry.name] ?
												"~ "
											:	""}
											{formatCurrency(entry.value, expenseCurrency)}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Table */}
				<div className="pt-4 border-t border-border">
					<div className="flex items-center justify-between mx-1 mb-3">
						<div className="flex flex-col gap-1">
							<h4 className="text-sm font-semibold text-card-foreground flex items-center gap-1.5">
								<TrendingUp size={16} className="text-primary" />
								Expense Details
							</h4>
							<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
								<Calendar size={12} />
								<span className="font-medium">
									Overdue + next {getTimeRangeText()}
								</span>
							</div>
						</div>
						<Button
							variant="secondary"
							size="sm"
							className="h-7 text-xs px-2"
							onClick={() => setShowUpcomingRelativeDates(!showUpcomingRelativeDates)}
							title={
								showUpcomingRelativeDates ? "Show actual dates" : (
									"Show relative dates"
								)
							}
						>
							{showUpcomingRelativeDates ?
								<>
									<Calendar size={12} className="mr-1.5" />
									<span>Dates</span>
								</>
							:	<>
									<Clock size={12} className="mr-1.5" />
									<span>Relative</span>
								</>
							}
						</Button>
					</div>
					<ExpenseTable
						expensesToDisplay={tableExpenses}
						selectedMonth={new Date()}
						onDelete={(id, name) => setDeleteModal({ isOpen: true, id, name })}
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

			<ConfirmationModal
				isOpen={deleteModal.isOpen}
				title="Confirm Deletion"
				message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={() => {
					deleteExpense(deleteModal.id);
					setDeleteModal({ isOpen: false, id: "", name: "" });
				}}
				onCancel={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
			/>
		</>
	);
};
