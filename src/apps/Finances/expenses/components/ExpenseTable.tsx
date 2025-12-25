import {
	Archive,
	ArchiveRestore,
	Calendar,
	Check,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Copy,
	CreditCard,
	Edit2,
	Eye,
	EyeOff,
	RefreshCw,
	Search,
	Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
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
	formatCurrency,
	formatDate,
	getDueDateColor,
	getRelativeDateText,
} from "@/lib/dateUtils";
import {
	DEFAULT_CATEGORY_COLORS,
	getCategoryDisplayColor,
} from "@/lib/expenseHelpers";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import type { Expense, ImportanceLevel } from "@/types/expense";
import { RecurringExpenseRow } from "./RecurringExpenseRow";

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
	| "paymentMethod"
	| "importance"
	| "category"
	| "type"
	| "amount"
	| "dueDate"
	| "paymentDate"
	| "isPaid";
type SortDirection = "asc" | "desc";

const ImportanceIcon: React.FC<{ level: ImportanceLevel }> = ({ level }) => {
	switch (level) {
		case "critical":
			return <span className="text-red-500 font-bold">!!!</span>;
		case "high":
			return <span className="text-orange-500 font-bold">!!</span>;
		case "medium":
			return <span className="text-yellow-500 font-bold">!</span>;
		default:
			return <span className="text-muted-foreground text-xs">—</span>;
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
	const { expenses, showPaidExpenses, setShowPaidExpenses, setEditingExpense } =
		useExpenseStore();
	const { expenseCurrency } = useSettingsStore();
	const { resolvedTheme } = useThemeStore();
	const isDarkMode = resolvedTheme === "dark";
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
			<ChevronUp className="text-primary" size={12} />
		) : (
			<ChevronDown className="text-primary" size={12} />
		);
	};

	// Group recurring expenses in All Expenses view
	const processedExpenses = useMemo(() => {
		if (!isAllExpensesView) {
			return expensesToDisplay.map(
				(e) => ({ type: "single", expense: e }) as const,
			);
		}

		const parentExpenses = new Map<string, Expense>();
		const occurrencesByParent = new Map<string, Expense[]>();

		expensesToDisplay.forEach((expense) => {
			if (expense.isRecurring && !expense.parentExpenseId) {
				parentExpenses.set(expense.id, expense);
				occurrencesByParent.set(expense.id, []);
			} else if (expense.parentExpenseId) {
				const occurrences =
					occurrencesByParent.get(expense.parentExpenseId) || [];
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
				result.push({ type: "single", expense });
			} else if (expense.isRecurring && !expense.parentExpenseId) {
				result.push({
					type: "recurring",
					expense,
					occurrences: occurrencesByParent.get(expense.id) || [],
				});
			}
		});

		return result;
	}, [expensesToDisplay, isAllExpensesView]);

	const filteredAndSortedExpenses = useMemo(() => {
		let filtered = [...processedExpenses];

		if (!showPaidExpenses) {
			filtered = filtered.filter((item) => {
				if (item.type === "recurring") {
					const hasUnpaid = item.occurrences?.some((occ) => !occ.isPaid);
					return hasUnpaid || !item.expense.isPaid;
				}
				return !item.expense.isPaid;
			});
		}

		if (searchQuery) {
			filtered = filtered.filter(
				(item) =>
					item.expense.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					item.expense.category
						.toLowerCase()
						.includes(searchQuery.toLowerCase()) ||
					(item.expense.paymentMethod || "")
						.toLowerCase()
						.includes(searchQuery.toLowerCase()),
			);
		}

		if (categoryFilter !== "all") {
			filtered = filtered.filter(
				(item) => item.expense.category === categoryFilter,
			);
		}

		filtered.sort((a, b) => {
			const expA = a.expense;
			const expB = b.expense;
			let compareValue = 0;

			switch (sortKey) {
				case "name":
					compareValue = expA.name.localeCompare(expB.name);
					break;
				case "paymentMethod":
					compareValue = (expA.paymentMethod || "").localeCompare(
						expB.paymentMethod || "",
					);
					break;
				case "importance": {
					const importanceOrder = { critical: 3, high: 2, medium: 1, none: 0 };
					compareValue =
						(importanceOrder[expA.importance || "none"] || 0) -
						(importanceOrder[expB.importance || "none"] || 0);
					break;
				}
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
					compareValue =
						expA.paymentDate.getTime() - expB.paymentDate.getTime();
					break;
				case "isPaid":
					compareValue = (expA.isPaid ? 1 : 0) - (expB.isPaid ? 1 : 0);
					break;
			}

			return sortDirection === "asc" ? compareValue : -compareValue;
		});

		return filtered;
	}, [
		processedExpenses,
		sortKey,
		sortDirection,
		searchQuery,
		categoryFilter,
		showPaidExpenses,
	]);

	const handleEditOccurrence = (expense: Expense) => {
		setEditingExpense(expense);
	};

	const paidCount = expensesToDisplay.filter((e) => e.isPaid).length;
	const totalCount = expensesToDisplay.length;
	const hasPaidExpenses = paidCount > 0;

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
					<Search
						className="absolute left-3 top-3 text-muted-foreground"
						size={18}
					/>
					<input
						type="text"
						placeholder="Search expenses..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
						aria-label="Search expenses"
					/>
				</div>
				{isAllExpensesView && (
					<Select
						name="all-expenses-year-select"
						onValueChange={(value) => {
							if (onSelectedYearChange)
								onSelectedYearChange(value === "all" ? "all" : Number(value));
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
						type="button"
						onClick={() => setShowPaidExpenses(!showPaidExpenses)}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
							showPaidExpenses
								? "bg-primary/10 text-primary hover:bg-primary/20"
								: "bg-muted text-muted-foreground hover:bg-accent"
						}`}
						title={
							showPaidExpenses ? "Hide paid expenses" : "Show paid expenses"
						}
						aria-pressed={showPaidExpenses}
						aria-label={
							showPaidExpenses ? "Hide paid expenses" : "Show paid expenses"
						}
					>
						{showPaidExpenses ? <Eye size={18} /> : <EyeOff size={18} />}
						<span className="hidden sm:inline">
							{showPaidExpenses ? "Showing" : "Hiding"} Paid
						</span>
						<span className="text-xs bg-card px-2 py-0.5 rounded-full">
							{paidCount}/{totalCount}
						</span>
					</button>
				)}
			</div>

			{/* Table */}
			<div className="overflow-x-auto scrollbar-thin">
				<table className="expense-table w-full min-w-[1000px]">
					<thead>
						<tr className="border-b border-border text-xs">
							<th className="text-center py-3 px-2 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("isPaid")}
									className="flex items-center gap-1 hover:text-primary mx-auto"
								>
									Paid
									<SortIcon column="isPaid" />
								</button>
							</th>
							<th className="text-left py-3 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("name")}
									className="flex items-center gap-1 hover:text-primary"
								>
									Name
									<SortIcon column="name" />
								</button>
							</th>
							<th className="text-left py-3 px-2 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("paymentMethod")}
									className="flex items-center gap-1 hover:text-primary"
								>
									<CreditCard size={12} className="mr-1" />
									<span className="hidden sm:inline">Payment</span>
									<SortIcon column="paymentMethod" />
								</button>
							</th>
							<th className="text-center py-3 px-2 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("importance")}
									className="flex items-center gap-1 hover:text-primary mx-auto"
								>
									<span className="hidden sm:inline">Importance</span>
									<span className="sm:hidden">!</span>
									<SortIcon column="importance" />
								</button>
							</th>
							<th className="text-center py-3 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("category")}
									className="flex items-center gap-1 hover:text-primary mx-auto"
								>
									Category
									<SortIcon column="category" />
								</button>
							</th>
							<th className="text-left py-3 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("type")}
									className="flex items-center gap-1 hover:text-primary"
								>
									Type
									<SortIcon column="type" />
								</button>
							</th>
							<th className="text-left py-3 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("amount")}
									className="flex items-center gap-1 hover:text-primary"
								>
									Amount
									<SortIcon column="amount" />
								</button>
							</th>
							<th className="text-left py-3 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("dueDate")}
									className="flex items-center gap-1 hover:text-primary"
								>
									Due Date
									<SortIcon column="dueDate" />
								</button>
							</th>
							<th className="text-left py-3 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("paymentDate")}
									className="flex items-center gap-1 hover:text-primary"
								>
									Payment Date
									<SortIcon column="paymentDate" />
								</button>
							</th>
							<th className="text-center py-3 px-3 font-medium text-muted-foreground">
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
							const displayColor = getCategoryDisplayColor(
								categoryColor,
								isDarkMode,
							);

							return (
								<tr
									key={expense.id}
									className={`border-b border-border ${
										expense.isPaid
											? "expense-paid bg-green-500/15 dark:bg-green-500/20 hover:bg-green-500/25 dark:hover:bg-green-500/30"
											: "hover:bg-accent"
									}`}
								>
									<td className="py-3 px-2">
										<button
											type="button"
											onClick={() => onTogglePaid(expense.id)}
											className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110
											${
												expense.isPaid
													? "text-green-500 bg-green-500/10 hover:bg-green-500/20"
													: "text-muted-foreground bg-muted hover:bg-accent"
											}`}
											title={expense.isPaid ? "Mark as unpaid" : "Mark as paid"}
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
												className={`font-medium text-foreground text-sm ${
													expense.isPaid ? "line-through opacity-60" : ""
												}`}
											>
												{expense.name}
											</span>
											{expense.isPaid && (
												<span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-green-500/20 text-green-600 dark:text-green-400 rounded">
													Paid
												</span>
											)}
											{expense.isRecurring && !isAllExpensesView && (
												<span className="text-primary" title="Recurring">
													<RefreshCw size={12} />
												</span>
											)}
										</div>
									</td>
									<td className="py-3 px-2">
										<span className="text-xs text-muted-foreground">
											{expense.paymentMethod || "None"}
										</span>
									</td>
									<td className="py-3 px-2 text-center">
										<ImportanceIcon level={expense.importance || "none"} />
									</td>
									<td className="w-min py-3 px-2 text-center">
										<span
											className="px-3 py-0.5 rounded-full text-xs font-semibold text-center"
											style={{
												backgroundColor: `${categoryColor}20`,
												color: displayColor,
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
													? "text-purple-500"
													: "text-muted-foreground"
											}`}
										>
											{expense.type === "need" ? "Need" : "Want"}
										</span>
									</td>
									<td className="py-3 px-3">
										<span
											className={`font-semibold text-primary text-sm ${
												expense.isPaid ? "line-through opacity-60" : ""
											}`}
										>
											{formatCurrency(expense.amount, expenseCurrency)}
										</span>
									</td>
									<td className="py-3 px-3">
										{!expense.dueDate ? (
											<span className="text-muted-foreground text-sm">
												No due date
											</span>
										) : expense.isPaid ? (
											<span
												className="text-muted-foreground cursor-help flex items-center gap-1 text-sm"
												title={`Due date: ${formatDate(expense.dueDate)}`}
											>
												{showRelativeDates && !isCurrentMonth && (
													<Calendar size={12} />
												)}
												{showRelativeDates
													? getRelativeDateText(expense.dueDate, selectedMonth)
													: formatDate(expense.dueDate)}
											</span>
										) : (
											<span
												className={`${
													!showRelativeDates
														? "text-foreground"
														: getDueDateColor(expense.dueDate, selectedMonth)
												} flex items-center gap-1 text-sm`}
											>
												{showRelativeDates && !isCurrentMonth && (
													<Calendar size={12} />
												)}
												{showRelativeDates
													? getRelativeDateText(expense.dueDate, selectedMonth)
													: formatDate(expense.dueDate)}
											</span>
										)}
									</td>
									<td className="py-3 px-3">
										<span className="text-sm text-muted-foreground">
											{expense.isPaid && expense.paymentDate
												? formatDate(expense.paymentDate)
												: "Not paid"}
										</span>
									</td>
									<td className="py-3 px-3">
										<div className="flex items-center justify-center gap-1">
											<button
												type="button"
												onClick={() => setEditingExpense(expense)}
												className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10
												 rounded-lg transition-all duration-200 hover:scale-110"
												title="Edit"
											>
												<Edit2 size={14} />
											</button>
											{onDuplicate && (
												<button
													type="button"
													onClick={() => onDuplicate(expense.id)}
													className="p-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10
													 rounded-lg transition-all duration-200 hover:scale-110"
													title="Duplicate"
												>
													<Copy size={14} />
												</button>
											)}
											{showArchiveActions &&
												(expense.isArchived ? (
													<button
														type="button"
														onClick={() => onUnarchive(expense.id)}
														className="p-1.5 text-muted-foreground hover:text-green-500 hover:bg-green-500/10
														 rounded-lg transition-all duration-200 hover:scale-110"
														title="Unarchive"
													>
														<ArchiveRestore size={14} />
													</button>
												) : (
													<button
														type="button"
														onClick={() => onArchive(expense.id)}
														className="p-1.5 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10
														 rounded-lg transition-all duration-200 hover:scale-110"
														title="Archive"
													>
														<Archive size={14} />
													</button>
												))}
											<button
												type="button"
												onClick={() => onDelete(expense.id, expense.name)}
												className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10
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
