import { useMemo } from "react";
import { DeleteModal } from "./DeleteModal";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { ExpenseTable } from "./ExpenseTable";
import { formatCurrency } from "@/lib/dateHelpers";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/expenseHelpers";
import { TrendingUp, DollarSign, Calendar, Clock } from "lucide-react";
import { addDays, addWeeks, addMonths, addYears, isWithinInterval, startOfDay } from "date-fns";
import { AnimatedToggle } from "@/components/AnimatedToggle";

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
	} = useExpenseStore();

	// Calculate the end date based on time selection
	const endDate = useMemo(() => {
		const now = startOfDay(new Date());
		switch (upcomingTimeUnit) {
			case "days":
				return addDays(now, upcomingTimeAmount);
			case "weeks":
				return addWeeks(now, upcomingTimeAmount);
			case "months":
				return addMonths(now, upcomingTimeAmount);
			case "years":
				return addYears(now, upcomingTimeAmount);
		}
	}, [upcomingTimeAmount, upcomingTimeUnit]);

	// Filter expenses that are due within the selected timeframe
	// Show individual occurrences, not parent recurring expenses
	const upcomingExpenses = useMemo(() => {
		const now = startOfDay(new Date());
		return expenses.filter((expense) => {
			// Skip archived expenses
			if (expense.isArchived) return false;

			// Skip parent recurring expenses (show only occurrences)
			if (expense.isRecurring && !expense.parentExpenseId) return false;

			// Must have a due date
			if (!expense.dueDate) return false;

			const dueDate = startOfDay(expense.dueDate);
			return isWithinInterval(dueDate, { start: now, end: endDate });
		});
	}, [expenses, endDate]);

	// Calculate totals by category
	const categoryTotals = useMemo(() => {
		const totals: Record<string, number> = {};
		upcomingExpenses.forEach((expense) => {
			if (!expense.isPaid) {
				totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
			}
		});
		return totals;
	}, [upcomingExpenses]);

	const total = useMemo(
		() => Object.values(categoryTotals).reduce((sum, val) => sum + val, 0),
		[categoryTotals]
	);

	const chartData = Object.entries(categoryTotals).map(([category, amount]) => ({
		name: category,
		value: amount,
	}));

	const placeholderData = [
		{ name: "Housing", value: 1200 },
		{ name: "Food", value: 400 },
		{ name: "Transportation", value: 300 },
	];

	const isPlaceholder = chartData.length === 0;
	const displayData = isPlaceholder ? placeholderData : chartData;

	const timeUnitOptions = [
		{ value: "days" as const, label: "Days" },
		{ value: "weeks" as const, label: "Weeks" },
		{ value: "months" as const, label: "Months" },
		{ value: "years" as const, label: "Years" },
	];

	const CustomTooltip = ({ active, payload }: any) => {
		if (active && payload && payload[0]) {
			return (
				<div className="bg-white p-3 rounded-lg shadow-lg border border-gray-100">
					<p className="font-medium text-gray-800">{payload[0].name}</p>
					<p className="text-sky-600 font-bold">
						{isPlaceholder ? "Example: " : ""}
						{formatCurrency(payload[0].value)}
					</p>
					{!isPlaceholder && total > 0 && (
						<p className="text-xs text-gray-500">
							{((payload[0].value / total) * 100).toFixed(1)}% of total
						</p>
					)}
				</div>
			);
		}
		return null;
	};

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
			<div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-slideUp">
				{/* Header */}
				<div className="flex justify-between items-centermb-6">
					<div className="flex items-center gap-2 mb-4">
						<Clock className="text-sky-500" size={24} />
						<h3 className="text-xl font-bold text-gray-800">Upcoming Expenses</h3>
					</div>

					{/* Time Range Selector */}
					<div className="bg-gray-50 rounded-lg p-4">
						<label className="block text-sm font-medium text-gray-700 mb-3">
							Show expenses due within:
						</label>
						<div className="flex flex-col gap-3">
							<div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
								{/* Number Input */}
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
											const val = parseInt(e.target.value);
											if (val > 0 && val <= 999) {
												setUpcomingTimeAmount(val);
											}
										}}
										className="w-full px-4 py-2 font-normal bg-white border border-gray-300 rounded-lg 
											focus:ring-2 focus:ring-sky-400 focus:border-transparent"
										aria-label="Number of time units"
									/>
								</div>

								{/* Unit Selector */}
								<AnimatedToggle
									options={timeUnitOptions}
									value={upcomingTimeUnit}
									onChange={setUpcomingTimeUnit}
									className="w-full sm:w-auto"
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Overview Section */}
				<div className="flex flex-col lg:flex-row gap-6 mb-8">
					{/* Left side - Total and Stats */}
					<div className="lg:w-80 flex flex-col gap-4">
						{/* Total Display */}
						<div className="bg-linear-to-br from-sky-50 to-sky-200 rounded-lg p-6 flex-1 flex flex-col justify-center">
							<div className="text-center">
								<p className="text-sm text-gray-600 mb-2">Total Unpaid</p>
								<div className="flex items-center justify-center gap-2">
									<DollarSign className="text-sky-600" size={24} />
									<p className="text-2xl sm:text-4xl font-bold text-sky-600">
										{formatCurrency(total).replace("$", "")}
									</p>
								</div>
								<p className="text-xs text-gray-600 mt-2">
									{upcomingExpenses.filter((e) => !e.isPaid).length} unpaid
									expenses
								</p>
							</div>
						</div>

						{/* Category breakdown stats */}
						{chartData.length > 0 && (
							<div className="bg-gray-50 rounded-lg p-4">
								<p className="text-xs font-bold text-gray-700 mb-2">
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
											<span className="text-gray-700">{category.name}</span>
											<span className="font-medium text-gray-800">
												{((category.value / total) * 100).toFixed(0)}%
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

						<div
							className={`flex flex-col space-y-4 ${
								isPlaceholder ? "opacity-60" : ""
							}`}
						>
							<div className="h-48 sm:h-64">
								<ResponsiveContainer
									width="100%"
									height="100%"
									initialDimension={{ width: 320, height: 320 }}
								>
									<PieChart>
										<Pie
											data={displayData}
											cx="50%"
											cy="50%"
											labelLine={false}
											outerRadius="80%"
											fill="#8884d8"
											dataKey="value"
											animationBegin={0}
											animationDuration={800}
										>
											{displayData.map((entry, index) => (
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
							<div className="flex gap-x-6 gap-y-2 justify-center mt-4 flex-wrap">
								{displayData.map((entry, index) => (
									<div
										key={`legend-${index}`}
										className="flex items-center gap-2"
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
										<span className="text-sm font-medium text-gray-700">
											{entry.name}
										</span>
										<span className="text-sm font-bold text-gray-800 whitespace-nowrap">
											{isPlaceholder && "ex: "}
											{formatCurrency(entry.value)}
										</span>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>

				{/* Expense Table */}
				<div className="mt-8 pt-6 border-t border-gray-200">
					<div className="flex flex-col items-baseline gap-2 mx-2 mb-4">
						<h4 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
							<TrendingUp size={20} className="text-sky-500" />
							Expense Details
						</h4>
						{/* Summary Text */}
						<div className="flex items-center gap-2 text-sm text-gray-600">
							<Calendar size={16} />
							<span className="font-medium">Next {getTimeRangeText()}</span>
						</div>
					</div>
					<ExpenseTable
						expenses={upcomingExpenses}
						isCurrentMonth={false}
						selectedMonth={new Date()}
						onDelete={handleDeleteClick}
						onArchive={archiveExpense}
						onUnarchive={unarchiveExpense}
						onTogglePaid={toggleExpensePaid}
						showArchiveActions={false}
						isAllExpensesView={false}
						categoryColors={categoryColors}
					/>
				</div>
			</div>

			{/* {editingExpense && (
				<ExpenseForm
					key={editingExpense.id}
					editingExpense={editingExpense}
					onClose={handleCloseEdit}
					isGlobalEdit={false}
				/>
			)} */}

			<DeleteModal
				isOpen={deleteModal.isOpen}
				expenseName={deleteModal.name}
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>
		</>
	);
};
