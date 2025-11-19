import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { MonthNavigation } from "./MonthNavigation";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { formatCurrency } from "@/lib/dateHelpers";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/expenseHelpers";
import { TrendingUp, DollarSign } from "lucide-react";
import { AnimatedToggle } from "@/components/AnimatedToggle";

export const ExpenseOverview: React.FC = () => {
	const {
		selectedMonth,
		getTotalByCategoryFiltered,
		getMonthlyTotalFiltered,
		overviewMode,
		setOverviewMode,
		categoryColors,
		showPaidExpenses,
	} = useExpenseStore();

	if (!selectedMonth) return null;

	const categoryTotals = getTotalByCategoryFiltered(
		selectedMonth,
		overviewMode,
		showPaidExpenses
	);
	const monthlyTotal = getMonthlyTotalFiltered(selectedMonth, overviewMode, showPaidExpenses);

	const data = Object.entries(categoryTotals).map(([category, amount]) => ({
		name: category,
		value: amount,
	}));

	const placeholderData = [
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

	const CustomTooltip = ({ active, payload }: any) => {
		if (active && payload && payload[0]) {
			const isPlaceholder = data.length === 0;
			return (
				<div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
					<p className="font-medium text-gray-800">{payload[0].name}</p>
					<p className="text-sky-600 font-bold">
						{isPlaceholder ? "Example: " : ""}
						{formatCurrency(payload[0].value)}
					</p>
					{!isPlaceholder && monthlyTotal > 0 && (
						<p className="text-xs text-gray-500">
							{((payload[0].value / monthlyTotal) * 100).toFixed(1)}% of total
						</p>
					)}
				</div>
			);
		}
		return null;
	};

	const chartData = data.length > 0 ? data : placeholderData;
	const isPlaceholder = data.length === 0;

	return (
		<>
			<div className="mb-4 flex flex-col gap-4">
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
					<h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2 whitespace-nowrap">
						<TrendingUp className="text-sky-500" size={20} />
						Expense Overview
					</h3>
					<div className="w-full sm:w-auto">
						<MonthNavigation />
					</div>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row gap-6">
				{/* Left side - Total and View Modes */}
				<div className="lg:w-80 flex flex-col gap-4">
					{/* View Mode Selector */}
					<div>
						<p className="text-sm text-gray-600 mb-2">Filter by:</p>
						<AnimatedToggle
							options={viewModeOptions}
							value={overviewMode}
							onChange={setOverviewMode}
							className="w-full sm:w-auto"
						/>
					</div>

					{/* Total Display */}
					<div className="bg-linear-to-br from-sky-50 to-sky-200 rounded-lg p-6 flex-1 flex flex-col justify-center">
						<div className="text-center">
							<p className="text-xs sm:text-sm text-gray-600 mb-2">
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
							<div className="flex items-center justify-center gap-2">
								<DollarSign className="text-sky-600" size={24} />
								<p className="text-2xl sm:text-4xl font-bold text-sky-600">
									{formatCurrency(monthlyTotal).replace("$", "")}
								</p>
							</div>
						</div>
					</div>

					{/* Category breakdown stats */}
					{data.length > 0 && (
						<div className="bg-gray-50 rounded-lg p-4">
							<p className="text-xs font-bold text-gray-700 mb-2">Top Categories:</p>
							{data
								.sort((a, b) => b.value - a.value)
								.slice(0, 3)
								.map((category) => (
									<div
										key={category.name}
										className="flex items-center justify-between text-xs mb-1"
									>
										<span className="text-gray-700 truncate mr-2">
											{category.name}
										</span>
										<span className="font-medium text-gray-800 shrink-0">
											{((category.value / monthlyTotal) * 100).toFixed(0)}%
										</span>
									</div>
								))}
						</div>
					)}
				</div>

				{/* Right side - Chart and Legend */}
				<div className="flex-1 min-w-0">
					{isPlaceholder && (
						<p className="text-center text-gray-500 text-sm mb-4">
							Example distribution - Add expenses to see your data
						</p>
					)}

					<div className={`flex flex-col space-y-4 ${isPlaceholder ? "opacity-60" : ""}`}>
						<div className="h-48 sm:h-64">
							<ResponsiveContainer
								width="100%"
								height="100%"
								initialDimension={{ width: 320, height: 320 }}
							>
								<PieChart>
									<Pie
										data={chartData}
										cx="50%"
										cy="50%"
										labelLine={false}
										outerRadius="80%"
										fill="#8884d8"
										dataKey="value"
										animationBegin={0}
										animationDuration={800}
									>
										{chartData.map((entry, index) => (
											<Cell
												key={`cell-${index}`}
												fill={
													categoryColors[entry.name] ||
													DEFAULT_CATEGORY_COLORS[entry.name] ||
													"#93C5FD"
												}
												opacity={isPlaceholder ? 0.5 : 1}
											/>
										))}
									</Pie>
									<Tooltip content={<CustomTooltip />} />
								</PieChart>
							</ResponsiveContainer>
						</div>

						{/* Custom Legend */}
						<div className="flex gap-x-4 gap-y-2 justify-center flex-wrap">
							{chartData.map((entry, index) => (
								<div
									key={`legend-${index}`}
									className="flex items-center gap-2 min-w-0"
								>
									<span
										className="w-3 h-3 rounded-full shrink-0"
										style={{
											backgroundColor:
												categoryColors[entry.name] ||
												DEFAULT_CATEGORY_COLORS[entry.name] ||
												"#93C5FD",
										}}
									/>
									<span className="text-xs sm:text-sm font-medium text-gray-700 truncate">
										{entry.name}
									</span>
									<span className="text-xs sm:text-sm font-bold text-gray-800 whitespace-nowrap">
										{isPlaceholder && "ex: "}
										{formatCurrency(entry.value)}
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
