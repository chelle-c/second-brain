import { useState, useMemo } from "react";
import {
	formatCurrency,
	formatDate,
	getRelativeDateText,
	getDueDateColor,
} from "@/lib/dateHelpers";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/expenseHelpers";
import { Expense, ImportanceLevel } from "@/types/expense";
import { RecurringExpenseRow } from "./RecurringExpenseRow";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Edit2,
	Trash2,
	Archive,
	ArchiveRestore,
	RefreshCw,
	Calendar,
	Check,
	CheckCircle,
	ChevronUp,
	ChevronDown,
	Search,
	Eye,
	EyeOff,
	Copy,
} from "lucide-react";

interface ExpenseTableProps {
	expensesToDisplay: Expense[];
	isCurrentMonth: boolean;
	selectedMonth: Date;
	onDelete: (id: string, name: string) => void;
	onArchive: (id: string) => void;
	onUnarchive: (id: string) => void;
	onTogglePaid: (id: string) => void;
	onDuplicate?: (id: string) => void;
	showArchiveActions?: boolean;
	isAllExpensesView?: boolean;
	showRelativeDates?: boolean;
	onSelectedYearChange?: (year: number | "all") => void;
	categoryColors?: Record<string, string>;
}

type SortKey =
	| "name"
	| "importance"
	| "category"
	| "type"
	| "amount"
	| "dueDate"
	| "paymentDate"
	| "isPaid";
type SortDirection = "asc" | "desc";

const darkenColor = (hex: string, amount: number = 0.4): string => {
	const num = parseInt(hex.replace("#", ""), 16);
	const r = Math.max(0, ((num >> 16) & 255) * (1 - amount));
	const g = Math.max(0, ((num >> 8) & 255) * (1 - amount));
	const b = Math.max(0, (num & 255) * (1 - amount));
	return (
		"#" +
		((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b))
			.toString(16)
			.slice(1)
	);
};

const ImportanceIcon: React.FC<{ level: ImportanceLevel }> = ({ level }) => {
	switch (level) {
		case "critical":
			return <span className="text-red-600 font-bold">!!!</span>;
		case "high":
			return <span className="text-orange-600 font-bold">!!</span>;
		case "medium":
			return <span className="text-yellow-600 font-bold">!</span>;
		default:
			return <span className="text-gray-400 text-xs">—</span>;
	}
};

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
	expensesToDisplay,
	isCurrentMonth,
	selectedMonth,
	onDelete,
	onArchive,
	onUnarchive,
	onTogglePaid,
	onDuplicate,
	showArchiveActions = false,
	isAllExpensesView = false,
	showRelativeDates = true,
	onSelectedYearChange,
	categoryColors = {},
}) => {
	const { expenses, showPaidExpenses, setShowPaidExpenses, setEditingExpense } = useExpenseStore();
	const { expenseCurrency } = useSettingsStore();
	const [sortKey, setSortKey] = useState<SortKey>("dueDate");
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortKey(key);
			setSortDirection("asc");
		}
	};

	const SortIcon = ({ column }: { column: SortKey }) => {
		if (sortKey !== column) {
			return <ChevronUp className="opacity-20" size={12} />;
		}
		return sortDirection === "asc" ? (
			<ChevronUp className="text-sky-600" size={12} />
		) : (
			<ChevronDown className="text-sky-600" size={12} />
		);
	};

	// Group recurring expenses in All Expenses view
	const processedExpenses = useMemo(() => {
		if (!isAllExpensesView) {
			return expensesToDisplay.map((e) => ({ type: "single", expense: e } as const));
		}

		const parentExpenses = new Map<string, Expense>();
		const occurrencesByParent = new Map<string, Expense[]>();

		expensesToDisplay.forEach((expense) => {
			if (expense.isRecurring && !expense.parentExpenseId) {
				// This is a parent
				parentExpenses.set(expense.id, expense);
				occurrencesByParent.set(expense.id, []);
			} else if (expense.parentExpenseId) {
				// This is an occurrence
				const occurrences = occurrencesByParent.get(expense.parentExpenseId) || [];
				occurrences.push(expense);
				occurrencesByParent.set(expense.parentExpenseId, occurrences);
			}
		});

		const result: Array<{
			type: "single" | "recurring";
			expense: Expense;
			occurrences?: Expense[];
		}> = [];

		expensesToDisplay.forEach((expense) => {
			if (!expense.isRecurring && !expense.parentExpenseId) {
				// Non-recurring expense
				result.push({ type: "single", expense });
			} else if (expense.isRecurring && !expense.parentExpenseId) {
				// Parent recurring expense
				result.push({
					type: "recurring",
					expense,
					occurrences: occurrencesByParent.get(expense.id) || [],
				});
			}
			// Skip occurrences as they're handled with their parent
		});

		return result;
	}, [expensesToDisplay, isAllExpensesView]);

	const filteredAndSortedExpenses = useMemo(() => {
		let filtered = [...processedExpenses];

		// Apply paid/unpaid filter
		if (!showPaidExpenses) {
			filtered = filtered.filter((item) => {
				if (item.type === "recurring") {
					// For recurring expenses, show if any occurrence is unpaid
					const hasUnpaid = item.occurrences?.some((occ) => !occ.isPaid);
					return hasUnpaid || !item.expense.isPaid;
				}
				return !item.expense.isPaid;
			});
		}

		// Apply search filter
		if (searchQuery) {
			filtered = filtered.filter(
				(item) =>
					item.expense.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					item.expense.category.toLowerCase().includes(searchQuery.toLowerCase())
			);
		}

		// Apply category filter
		if (categoryFilter !== "all") {
			filtered = filtered.filter((item) => item.expense.category === categoryFilter);
		}

		// Sort expenses
		filtered.sort((a, b) => {
			const expA = a.expense;
			const expB = b.expense;
			let compareValue = 0;

			switch (sortKey) {
				case "name":
					compareValue = expA.name.localeCompare(expB.name);
					break;
				case "importance":
					const importanceOrder = { critical: 3, high: 2, medium: 1, none: 0 };
					compareValue =
						(importanceOrder[expA.importance || "none"] || 0) -
						(importanceOrder[expB.importance || "none"] || 0);
					break;
				case "category":
					compareValue = expA.category.localeCompare(expB.category);
					break;
				case "type":
					compareValue = expA.type.localeCompare(expB.type);
					break;
				case "amount":
					compareValue = expA.amount - expB.amount;
					break;
				case "dueDate":
					if (!expA.dueDate && !expB.dueDate) return 0;
					if (!expA.dueDate) return 1;
					if (!expB.dueDate) return -1;
					compareValue = expA.dueDate.getTime() - expB.dueDate.getTime();
					break;
				case "paymentDate":
					if (!expA.paymentDate && !expB.paymentDate) return 0;
					if (!expA.paymentDate) return 1;
					if (!expB.paymentDate) return -1;
					compareValue = expA.paymentDate.getTime() - expB.paymentDate.getTime();
					break;
				case "isPaid":
					compareValue = (expA.isPaid ? 1 : 0) - (expB.isPaid ? 1 : 0);
					break;
			}

			return sortDirection === "asc" ? compareValue : -compareValue;
		});

		return filtered;
	}, [processedExpenses, sortKey, sortDirection, searchQuery, categoryFilter, showPaidExpenses]);

	const handleEditOccurrence = (expense: Expense) => {
		// Pass the specific occurrence for editing
		setEditingExpense(expense);
	};

	// Count paid and total expenses for the toggle button
	const paidCount = expensesToDisplay.filter((e) => e.isPaid).length;
	const totalCount = expensesToDisplay.length;
	const hasPaidExpenses = paidCount > 0;

	// Get all unique years from expenses
	const availableYears = useMemo(() => {
		const years = new Set<number>();
		const currentYear = new Date().getFullYear();
		years.add(currentYear);

		expenses.forEach((expense) => {
			if (expense.dueDate) {
				years.add(expense.dueDate.getFullYear());
			}
			years.add(expense.createdAt.getFullYear());
		});

		return Array.from(years).sort((a, b) => b - a);
	}, [expenses]);

	return (
		<div>
			{/* Search and Filter Controls */}
			<div className="flex flex-col sm:flex-row gap-4 mb-4 items-center">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-3 text-gray-400" size={18} />
					<input
						type="text"
						placeholder="Search expenses..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-400 focus:border-transparent placeholder:text-gray-500"
						aria-label="Search expenses"
					/>
				</div>
				{isAllExpensesView && (
					<Select
						name="all-expenses-year-select"
						onValueChange={(value) => {
							if (onSelectedYearChange) onSelectedYearChange(value === "all" ? "all" : Number(value));
						}}
					>
						<SelectTrigger className="w-full sm:w-[180px]">
							<SelectValue placeholder="Filter by year" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="all">All Years</SelectItem>
								{availableYears.map((year) => (
									<SelectItem
										key={year}
										value={year.toString()}
										className="capitalize"
									>
										{year}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				)}
				<Select onValueChange={(value) => setCategoryFilter(value)}>
					<SelectTrigger size="default" className="w-[180px] py-2">
						<SelectValue placeholder="Filter by category" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>Categories</SelectLabel>
							<SelectItem value="all">All Categories</SelectItem>
							{Object.keys(categoryColors)
								.sort()
								.map((category) => (
									<SelectItem key={category} value={category}>
										{category}
									</SelectItem>
								))}
						</SelectGroup>
					</SelectContent>
				</Select>
				{hasPaidExpenses && (
					<button
						onClick={() => setShowPaidExpenses(!showPaidExpenses)}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
							showPaidExpenses
								? "bg-sky-100 text-sky-700 hover:bg-sky-200"
								: "bg-gray-100 text-gray-700 hover:bg-gray-200"
						}`}
						title={showPaidExpenses ? "Hide paid expenses" : "Show paid expenses"}
						aria-pressed={showPaidExpenses}
						aria-label={showPaidExpenses ? "Hide paid expenses" : "Show paid expenses"}
					>
						{showPaidExpenses ? <Eye size={18} /> : <EyeOff size={18} />}
						<span className="hidden sm:inline">
							{showPaidExpenses ? "Showing" : "Hiding"} Paid
						</span>
						<span className="text-xs bg-white px-2 py-0.5 rounded-full">
							{paidCount}/{totalCount}
						</span>
					</button>
				)}
			</div>

			{/* Table */}
			<div className="overflow-x-auto scrollbar-thin">
				<table className="w-full min-w-[900px]">
					<thead>
						<tr className="border-b border-gray-200 text-xs">
							<th className="text-center py-3 px-2 font-medium text-gray-600">
								<button
									onClick={() => handleSort("isPaid")}
									className="flex items-center gap-1 hover:text-sky-600 mx-auto"
								>
									Paid
									<SortIcon column="isPaid" />
								</button>
							</th>
							<th className="text-left py-3 px-3 font-medium text-gray-600">
								<button
									onClick={() => handleSort("name")}
									className="flex items-center gap-1 hover:text-sky-600"
								>
									Name
									<SortIcon column="name" />
								</button>
							</th>
							<th className="text-center py-3 px-2 font-medium text-gray-600">
								<button
									onClick={() => handleSort("importance")}
									className="flex items-center gap-1 hover:text-sky-600 mx-auto"
								>
									<span className="hidden sm:inline">Importance</span>
									<span className="sm:hidden">!</span>
									<SortIcon column="importance" />
								</button>
							</th>
							<th className="text-left py-3 px-3 font-medium text-gray-600">
								<button
									onClick={() => handleSort("category")}
									className="flex items-center gap-1 hover:text-sky-600"
								>
									Category
									<SortIcon column="category" />
								</button>
							</th>
							<th className="text-left py-3 px-3 font-medium text-gray-600">
								<button
									onClick={() => handleSort("type")}
									className="flex items-center gap-1 hover:text-sky-600"
								>
									Type
									<SortIcon column="type" />
								</button>
							</th>
							<th className="text-left py-3 px-3 font-medium text-gray-600">
								<button
									onClick={() => handleSort("amount")}
									className="flex items-center gap-1 hover:text-sky-600"
								>
									Amount
									<SortIcon column="amount" />
								</button>
							</th>
							<th className="text-left py-3 px-3 font-medium text-gray-600">
								<button
									onClick={() => handleSort("dueDate")}
									className="flex items-center gap-1 hover:text-sky-600"
								>
									Due Date
									<SortIcon column="dueDate" />
								</button>
							</th>
							<th className="text-left py-3 px-3 font-medium text-gray-600">
								<button
									onClick={() => handleSort("paymentDate")}
									className="flex items-center gap-1 hover:text-sky-600"
								>
									Payment Date
									<SortIcon column="paymentDate" />
								</button>
							</th>
							<th className="text-center py-3 px-3 font-medium text-gray-600">
								Actions
							</th>
						</tr>
					</thead>
					<tbody>
						{filteredAndSortedExpenses.map((item) => {
							if (item.type === "recurring" && isAllExpensesView) {
								return (
									<RecurringExpenseRow
										key={item.expense.id}
										parentExpense={item.expense}
										occurrences={item.occurrences || []}
										onEditOccurrence={handleEditOccurrence}
										onDelete={onDelete}
										onArchive={onArchive}
										onUnarchive={onUnarchive}
										onDuplicate={onDuplicate}
										categoryColors={categoryColors}
										showPaid={showPaidExpenses}
									/>
								);
							}

							const expense = item.expense;
							const categoryColor =
								categoryColors[expense.category] ||
								DEFAULT_CATEGORY_COLORS[expense.category] ||
								"#6b7280";
							const darkCategoryColor = darkenColor(categoryColor);

							return (
								<tr
									key={expense.id}
									className={`border-b border-gray-100 hover:bg-sky-50  ${
										expense.isPaid ? "opacity-60" : ""
									}`}
								>
									<td className="py-3 px-2">
										<button
											onClick={() => onTogglePaid(expense.id)}
											className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110
											${
												expense.isPaid
													? "text-green-600 bg-green-100 hover:bg-green-200"
													: "text-gray-400 bg-gray-100 hover:bg-gray-200"
											}`}
											title={
												expense.isPaid ? "Mark as unpaid" : "Mark as paid"
											}
										>
											{expense.isPaid ? (
												<CheckCircle size={18} />
											) : (
												<Check size={18} />
											)}
										</button>
									</td>
									<td className="py-3 px-3">
										<div className="flex items-center gap-2">
											<span
												className={`font-medium text-gray-800 text-sm ${
													expense.isPaid ? "line-through" : ""
												}`}
											>
												{expense.name}
											</span>
											{expense.isRecurring && !isAllExpensesView && (
												<span className="text-sky-500" title="Recurring">
													<RefreshCw size={12} />
												</span>
											)}
										</div>
									</td>
									<td className="py-3 px-2 text-center">
										<ImportanceIcon level={expense.importance || "none"} />
									</td>
									<td className="w-min flex items-center justify-center stretch py-3 px-3">
										<span
											className="w-max px-3 py-0.5 rounded-full text-xs font-semibold inline-flex items-center text-center"
											style={{
												backgroundColor: `${categoryColor}20`,
												color: darkCategoryColor,
												border: `1px solid ${categoryColor}40`,
											}}
										>
											{expense.category}
										</span>
									</td>
									<td className="py-3 px-3">
										<span
											className={`text-xs font-medium ${
												expense.type === "need"
													? "text-purple-600"
													: "text-gray-500"
											}`}
										>
											{expense.type === "need" ? "Need" : "Want"}
										</span>
									</td>
									<td className="py-3 px-3">
										<span
											className={`font-semibold text-sky-600 text-sm ${
												expense.isPaid ? "line-through" : ""
											}`}
										>
											{formatCurrency(expense.amount, expenseCurrency)}
										</span>
									</td>
									<td className="py-3 px-3">
										{!expense.dueDate ? (
											<span className="text-gray-400 text-sm">
												No due date
											</span>
										) : expense.isPaid ? (
											<span
												className="text-gray-600 cursor-help flex items-center gap-1 text-sm"
												title={`Due date: ${formatDate(expense.dueDate)}`}
											>
												{showRelativeDates && !isCurrentMonth && (
													<Calendar size={12} />
												)}
												{showRelativeDates
													? getRelativeDateText(
															expense.dueDate,
															selectedMonth
													  )
													: formatDate(expense.dueDate)}
											</span>
										) : (
											<span
												className={`${
													!showRelativeDates
														? "text-gray-800"
														: getDueDateColor(
																expense.dueDate,
																selectedMonth
														  )
												} flex items-center gap-1 text-sm`}
											>
												{showRelativeDates && !isCurrentMonth && (
													<Calendar size={12} />
												)}
												{showRelativeDates
													? getRelativeDateText(
															expense.dueDate,
															selectedMonth
													  )
													: formatDate(expense.dueDate)}
											</span>
										)}
									</td>
									<td className="py-3 px-3">
										<span className="text-sm text-gray-600">
											{expense.isPaid && expense.paymentDate
												? formatDate(expense.paymentDate)
												: "Not paid"}
										</span>
									</td>
									<td className="py-3 px-3">
										<div className="flex items-center justify-center gap-1">
											<button
												onClick={() => setEditingExpense(expense)}
												className="p-1.5 text-gray-600 hover:text-sky-600 hover:bg-sky-100 
												 rounded-lg transition-all duration-200 hover:scale-110"
												title="Edit"
											>
												<Edit2 size={14} />
											</button>
											{onDuplicate && (
												<button
													onClick={() => onDuplicate(expense.id)}
													className="p-1.5 text-gray-600 hover:text-purple-600 hover:bg-purple-100 
													 rounded-lg transition-all duration-200 hover:scale-110"
													title="Duplicate"
												>
													<Copy size={14} />
												</button>
											)}
											{showArchiveActions &&
												(expense.isArchived ? (
													<button
														onClick={() => onUnarchive(expense.id)}
														className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-100 
														 rounded-lg transition-all duration-200 hover:scale-110"
														title="Unarchive"
													>
														<ArchiveRestore size={14} />
													</button>
												) : (
													<button
														onClick={() => onArchive(expense.id)}
														className="p-1.5 text-gray-600 hover:text-yellow-600 hover:bg-yellow-100 
														 rounded-lg transition-all duration-200 hover:scale-110"
														title="Archive"
													>
														<Archive size={14} />
													</button>
												))}
											<button
												onClick={() => onDelete(expense.id, expense.name)}
												className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-100 
												 rounded-lg transition-all duration-200 hover:scale-110"
												title="Delete"
											>
												<Trash2 size={14} />
											</button>
										</div>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
};
