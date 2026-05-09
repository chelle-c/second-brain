import { TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { PieChart, type PieChartData } from "@/components/charts";
import { getCurrencySymbol } from "@/lib/currencyUtils";
import { formatCurrency } from "@/lib/date-utils/formatting";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/expenseHelpers";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { MonthNavigation } from "./MonthNavigation";

export const ExpenseOverview: React.FC = () => {
	const {
		selectedMonth,
		getMonthlyExpenses,
		getTotalByCategoryFiltered,
		getMonthlyTotalFiltered,
		overviewMode,
		setOverviewMode,
		categoryColors,
		showPaidExpenses,
	} = useExpenseStore();
	const { expenseCurrency } = useSettingsStore();
	const currencySymbol = getCurrencySymbol(expenseCurrency);

	if (!selectedMonth) return null;

	const categoryTotals = getTotalByCategoryFiltered(
		selectedMonth,
		overviewMode,
		showPaidExpenses,
	);
	const monthlyTotal = getMonthlyTotalFiltered(selectedMonth, overviewMode, showPaidExpenses);

	const monthlyExpenses = getMonthlyExpenses(selectedMonth);
	const hasNonExactByCategory = useMemo(() => {
		const result: Record<string, boolean> = {};
		for (const expense of monthlyExpenses) {
			if (expense.amountData && expense.amountData.type !== "exact") {
				result[expense.category] = true;
			}
		}
		return result;
	}, [monthlyExpenses]);

	const data: PieChartData[] = Object.entries(categoryTotals).map(([category, amount]) => ({
		name: category,
		value: amount,
	}));

	const placeholderData: PieChartData[] = [
		{ name: "Housing", value: 1200 },
		{ name: "Food", value: 400 },
		{ name: "Transportation", value: 300 },
		{ name: "Utilities", value: 150 },
		{ name: "Entertainment", value: 200 },
	];

	const viewModeOptions = [
		{
			value: "remaining" as const,
			label: "Remaining",
			ariaLabel: "Show remaining unpaid expenses",
		},
		{
			value: "required" as const,
			label: "Required",
			ariaLabel: "Show all required expenses",
		},
		{ value: "all" as const, label: "All", ariaLabel: "Show all expenses" },
	];

	const chartData = data.length > 0 ? data : placeholderData;
	const isPlaceholder = data.length === 0;

	const allColors = { ...DEFAULT_CATEGORY_COLORS, ...categoryColors };

	const renderTooltip = (datum: PieChartData, total: number) => (
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
			{!isPlaceholder && total > 0 && (
				<p className="text-xs text-muted-foreground">
					{((datum.value / total) * 100).toFixed(1)}% of total
				</p>
			)}
		</>
	);

	return (
		<>
			<div className="mb-3 flex flex-col gap-3">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
					<h3 className="text-base sm:text-lg font-bold text-card-foreground flex items-center gap-2 whitespace-nowrap">
						<TrendingUp className="text-primary" size={18} />
						Expense Overview
					</h3>
					<div className="w-full sm:w-auto">
						<MonthNavigation />
					</div>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-4">
				{/* Left side */}
				<div className="lg:w-72 flex flex-col gap-3">
					<div>
						<p className="text-xs text-muted-foreground mb-1.5">Filter by:</p>
						<AnimatedToggle
							options={viewModeOptions}
							value={overviewMode}
							onChange={setOverviewMode}
							className="w-full sm:w-auto"
						/>
					</div>

					<div className="bg-linear-to-br from-secondary to-accent rounded-lg p-3 sm:p-4 flex-1 flex flex-col justify-center">
						<div className="text-center">
							<p className="text-xs text-muted-foreground mb-1">
								{overviewMode === "remaining" && "Remaining Unpaid"}
								{overviewMode === "required" &&
									showPaidExpenses &&
									"Total Required Expenses"}
								{overviewMode === "required" &&
									!showPaidExpenses &&
									"Unpaid Required Expenses"}
								{overviewMode === "all" &&
									showPaidExpenses &&
									"All Monthly Expenses"}
								{overviewMode === "all" &&
									!showPaidExpenses &&
									"All Unpaid Expenses"}
							</p>
							<div className="flex items-center justify-center gap-1">
								<span className="text-primary text-lg font-bold">
									{currencySymbol}
								</span>
								<p className="text-xl sm:text-2xl font-bold text-primary">
									{formatCurrency(monthlyTotal, expenseCurrency).replace(
										/^[^0-9]+/,
										"",
									)}
								</p>
							</div>
						</div>
					</div>

					{data.length > 0 && (
						<div className="bg-muted rounded-lg p-3">
							<p className="text-xs font-bold text-foreground mb-1.5">
								Top Categories:
							</p>
							{data
								.sort((a, b) => b.value - a.value)
								.slice(0, 3)
								.map((category) => (
									<div
										key={category.name}
										className="flex items-center justify-between text-xs mb-1"
									>
										<span className="text-muted-foreground truncate mr-2">
											{hasNonExactByCategory[category.name] ? "~ " : ""}
											{category.name}
										</span>
										<span className="font-medium text-foreground shrink-0">
											{((category.value / monthlyTotal) * 100).toFixed(0)}%
										</span>
									</div>
								))}
						</div>
					)}
				</div>

				{/* Right side */}
				<div className="flex-1 min-w-0">
					{isPlaceholder && (
						<p className="text-center text-muted-foreground text-xs mb-2">
							Example distribution — add expenses to see your data
						</p>
					)}

					<div className={`flex flex-col space-y-3 ${isPlaceholder ? "opacity-60" : ""}`}>
						<div className="h-36 sm:h-48">
							<PieChart
								data={chartData}
								colors={allColors}
								opacity={isPlaceholder ? 0.5 : 1}
								renderTooltip={renderTooltip}
							/>
						</div>

						<div className="flex gap-x-4 gap-y-1.5 justify-center flex-wrap">
							{chartData.map((entry) => (
								<div
									key={`legend-${entry.name}`}
									className="flex items-center gap-1.5 min-w-0"
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
									<span className="text-xs font-medium text-muted-foreground truncate">
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
		</>
	);
};
