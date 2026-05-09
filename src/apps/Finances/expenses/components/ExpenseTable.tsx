import {
	Archive,
	ArchiveRestore,
	Bell,
	BellOff,
	Calendar,
	Check,
	CheckCircle,
	ChevronDown,
	ChevronUp,
	Copy,
	Eye,
	EyeOff,
	RefreshCw,
	Search,
	SquarePen,
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
import { formatDate, getDueDateColor, getRelativeDateText } from "@/lib/date-utils/formatting";
import { DEFAULT_CATEGORY_COLORS, getCategoryDisplayColor } from "@/lib/expenseHelpers";
import { formatAmountDisplay, getAmountTooltip } from "@/lib/amountUtils";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import type { Expense, ImportanceLevel } from "@/types/expense";
import { RecurringExpenseRow } from "./RecurringExpenseRow";

interface ExpenseTableProps {
	expensesToDisplay: Expense[];
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

/** Helper: returns the pair of focus-within td classes for paid / unpaid rows */
const focusTd = (isPaid: boolean) =>
	isPaid ?
		"group-focus-within:bg-green-500/30 dark:group-focus-within:bg-green-500/35"
	:	"group-focus-within:bg-accent";

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
	expensesToDisplay,
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
	const {
		expenses,
		showPaidExpenses,
		setShowPaidExpenses,
		setEditingExpense,
		toggleExpenseNotify,
	} = useExpenseStore();
	const { expenseCurrency } = useSettingsStore();
	const { resolvedTheme } = useThemeStore();
	const isDarkMode = resolvedTheme === "dark";
	const [sortKey, setSortKey] = useState<SortKey>("dueDate");
	const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");

	const handleSort = (key: SortKey) => {
		if (sortKey === key) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		else {
			setSortKey(key);
			setSortDirection("asc");
		}
	};

	const SortIcon = ({ column }: { column: SortKey }) => {
		if (sortKey !== column) return <ChevronUp className="opacity-20" size={12} />;
		return sortDirection === "asc" ?
				<ChevronUp className="text-primary" size={12} />
			:	<ChevronDown className="text-primary" size={12} />;
	};

	const processedExpenses = useMemo(() => {
		if (!isAllExpensesView)
			return expensesToDisplay.map((e) => ({ type: "single" as const, expense: e }));
		const occurrencesByParent = new Map<string, Expense[]>();
		expensesToDisplay.forEach((expense) => {
			if (expense.isRecurring && !expense.parentExpenseId)
				occurrencesByParent.set(expense.id, []);
			else if (expense.parentExpenseId) {
				const o = occurrencesByParent.get(expense.parentExpenseId) || [];
				o.push(expense);
				occurrencesByParent.set(expense.parentExpenseId, o);
			}
		});
		const result: Array<{
			type: "single" | "recurring";
			expense: Expense;
			occurrences?: Expense[];
		}> = [];
		expensesToDisplay.forEach((expense) => {
			if (!expense.isRecurring && !expense.parentExpenseId)
				result.push({ type: "single", expense });
			else if (expense.isRecurring && !expense.parentExpenseId)
				result.push({
					type: "recurring",
					expense,
					occurrences: occurrencesByParent.get(expense.id) || [],
				});
		});
		return result;
	}, [expensesToDisplay, isAllExpensesView]);

	const filteredAndSortedExpenses = useMemo(() => {
		let filtered = [...processedExpenses];
		if (!showPaidExpenses)
			filtered = filtered.filter((item) =>
				item.type === "recurring" ?
					item.occurrences?.some((o) => !o.isPaid) || !item.expense.isPaid
				:	!item.expense.isPaid,
			);
		if (searchQuery)
			filtered = filtered.filter(
				(item) =>
					item.expense.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					item.expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
					(item.expense.paymentMethod || "")
						.toLowerCase()
						.includes(searchQuery.toLowerCase()),
			);
		if (categoryFilter !== "all")
			filtered = filtered.filter((item) => item.expense.category === categoryFilter);
		filtered.sort((a, b) => {
			const expA = a.expense,
				expB = b.expense;
			let c = 0;
			switch (sortKey) {
				case "name":
					c = expA.name.localeCompare(expB.name);
					break;
				case "paymentMethod":
					c = (expA.paymentMethod || "").localeCompare(expB.paymentMethod || "");
					break;
				case "importance": {
					const o: Record<string, number> = { critical: 3, high: 2, medium: 1, none: 0 };
					c = (o[expA.importance || "none"] || 0) - (o[expB.importance || "none"] || 0);
					break;
				}
				case "category":
					c = expA.category.localeCompare(expB.category);
					break;
				case "type":
					c = expA.type.localeCompare(expB.type);
					break;
				case "amount":
					c = expA.amount - expB.amount;
					break;
				case "dueDate":
					if (!expA.dueDate && !expB.dueDate) return 0;
					if (!expA.dueDate) return 1;
					if (!expB.dueDate) return -1;
					c = expA.dueDate.getTime() - expB.dueDate.getTime();
					break;
				case "paymentDate":
					if (!expA.paymentDate && !expB.paymentDate) return 0;
					if (!expA.paymentDate) return 1;
					if (!expB.paymentDate) return -1;
					c = expA.paymentDate.getTime() - expB.paymentDate.getTime();
					break;
				case "isPaid":
					c = (expA.isPaid ? 1 : 0) - (expB.isPaid ? 1 : 0);
					break;
			}
			return sortDirection === "asc" ? c : -c;
		});
		return filtered;
	}, [processedExpenses, sortKey, sortDirection, searchQuery, categoryFilter, showPaidExpenses]);

	const paidCount = expensesToDisplay.filter((e) => e.isPaid).length;
	const totalCount = expensesToDisplay.length;
	const hasPaidExpenses = paidCount > 0;
	const availableYears = useMemo(() => {
		const y = new Set<number>();
		y.add(new Date().getFullYear());
		expenses.forEach((e) => {
			if (e.dueDate) y.add(e.dueDate.getFullYear());
			y.add(e.createdAt.getFullYear());
		});
		return Array.from(y).sort((a, b) => b - a);
	}, [expenses]);

	return (
		<div>
			{/* Controls */}
			<div className="flex flex-col sm:flex-row gap-2 mb-3 items-center">
				<div className="relative flex-1">
					<Search className="absolute left-2.5 top-2 text-muted-foreground" size={14} />
					<input
						type="text"
						placeholder="Search expenses..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground"
						aria-label="Search expenses"
					/>
				</div>
				{isAllExpensesView && (
					<Select
						name="all-expenses-year-select"
						onValueChange={(v) =>
							onSelectedYearChange?.(v === "all" ? "all" : Number(v))
						}
					>
						<SelectTrigger className="w-full sm:w-[140px] h-8 text-xs">
							<SelectValue placeholder="Filter by year" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="all">All Years</SelectItem>
								{availableYears.map((y) => (
									<SelectItem key={y} value={y.toString()}>
										{y}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				)}
				<Select onValueChange={(v) => setCategoryFilter(v)}>
					<SelectTrigger size="default" className="w-[150px] h-8 text-xs">
						<SelectValue placeholder="Category" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>Categories</SelectLabel>
							<SelectItem value="all">All Categories</SelectItem>
							{Object.keys(categoryColors)
								.sort()
								.map((c) => (
									<SelectItem key={c} value={c}>
										{c}
									</SelectItem>
								))}
						</SelectGroup>
					</SelectContent>
				</Select>
				{hasPaidExpenses && (
					<button
						type="button"
						onClick={() => setShowPaidExpenses(!showPaidExpenses)}
						className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${showPaidExpenses ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-muted text-muted-foreground hover:bg-accent"}`}
						title={showPaidExpenses ? "Hide paid expenses" : "Show paid expenses"}
						aria-pressed={showPaidExpenses}
					>
						{showPaidExpenses ?
							<Eye size={14} />
						:	<EyeOff size={14} />}
						<span className="hidden sm:inline">
							{showPaidExpenses ? "Showing" : "Hiding"} Paid
						</span>
						<span className="text-[10px] bg-card px-1.5 py-0.5 rounded-full">
							{paidCount}/{totalCount}
						</span>
					</button>
				)}
			</div>

			{/* Table */}
			<div className="overflow-x-auto scrollbar-thin">
				<table className="expense-table w-full min-w-[1100px] table-fixed">
					<colgroup>
						<col style={{ width: 64 }} />
						<col style={{ width: 44 }} />
						<col />
						<col style={{ width: 128 }} />
						<col style={{ width: 88 }} />
						<col style={{ width: 100 }} />
						<col style={{ width: 52 }} />
						<col style={{ width: 120 }} />
						<col style={{ width: 100 }} />
						<col style={{ width: 112 }} />
						<col style={{ width: 132 }} />
					</colgroup>
					<thead className="sticky top-0 z-10 bg-card">
						<tr className="border-b border-border text-xs">
							<th className="text-center py-2.5 px-2 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("isPaid")}
									className="flex items-center gap-1 hover:text-primary mx-auto whitespace-nowrap"
								>
									Paid
									<SortIcon column="isPaid" />
								</button>
							</th>
							<th className="text-center py-2.5 px-2 font-medium text-muted-foreground">
								<span
									className="flex items-center gap-1 justify-center"
									title="Notification reminders"
								>
									<Bell size={14} />
								</span>
							</th>
							<th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("name")}
									className="flex items-center gap-1 hover:text-primary whitespace-nowrap"
								>
									Name
									<SortIcon column="name" />
								</button>
							</th>
							<th className="text-center py-2.5 px-2 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("paymentMethod")}
									className="flex items-center gap-1 hover:text-primary mx-auto whitespace-nowrap"
								>
									Payment Method
									<SortIcon column="paymentMethod" />
								</button>
							</th>
							<th className="text-center py-2.5 px-2 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("importance")}
									className="flex items-center gap-1 hover:text-primary mx-auto whitespace-nowrap"
								>
									Importance
									<SortIcon column="importance" />
								</button>
							</th>
							<th className="text-center py-2.5 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("category")}
									className="flex items-center gap-1 hover:text-primary mx-auto whitespace-nowrap"
								>
									Category
									<SortIcon column="category" />
								</button>
							</th>
							<th className="text-center py-2.5 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("type")}
									className="flex items-center gap-1 hover:text-primary mx-auto whitespace-nowrap"
								>
									Type
									<SortIcon column="type" />
								</button>
							</th>
							<th className="text-center py-2.5 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("amount")}
									className="flex items-center gap-1 hover:text-primary mx-auto whitespace-nowrap"
								>
									Amount
									<SortIcon column="amount" />
								</button>
							</th>
							<th className="text-left py-2.5 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("dueDate")}
									className="flex items-center gap-1 hover:text-primary whitespace-nowrap"
								>
									Due Date
									<SortIcon column="dueDate" />
								</button>
							</th>
							<th className="text-center py-2.5 px-3 font-medium text-muted-foreground">
								<button
									type="button"
									onClick={() => handleSort("paymentDate")}
									className="flex items-center gap-1 hover:text-primary mx-auto whitespace-nowrap"
								>
									Payment Date
									<SortIcon column="paymentDate" />
								</button>
							</th>
							<th className="text-center py-2.5 px-3 font-medium text-muted-foreground whitespace-nowrap">
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
										onEditOccurrence={(e) => setEditingExpense(e)}
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
							const displayColor = getCategoryDisplayColor(categoryColor, isDarkMode);
							const amountDisplay = formatAmountDisplay(
								expense.amountData,
								expense.amount,
								expenseCurrency,
							);
							const amountTooltip =
								expense.amountData ?
									getAmountTooltip(expense.amountData.type)
								:	"Exact total";
							const fw = focusTd(expense.isPaid);

							return (
								<tr
									key={expense.id}
									className={`group border-b border-border ${
										expense.isPaid ?
											"expense-paid bg-green-500/15 dark:bg-green-500/20 hover:bg-green-500/25 dark:hover:bg-green-500/30 focus-within:bg-green-500/30 dark:focus-within:bg-green-500/35"
										:	"hover:bg-accent focus-within:bg-accent"
									}`}
								>
									<td className={`text-center py-3 px-2 ${fw}`}>
										<button
											type="button"
											onClick={() => onTogglePaid(expense.id)}
											className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${expense.isPaid ? "text-green-500 bg-green-500/10 hover:bg-green-500/20" : "text-muted-foreground hover:bg-accent"}`}
											title={
												expense.isPaid ? "Mark as unpaid" : "Mark as paid"
											}
										>
											{expense.isPaid ?
												<CheckCircle size={18} />
											:	<Check size={18} />}
										</button>
									</td>
									<td className={`text-center py-3 px-2 ${fw}`}>
										{expense.dueDate ?
											<button
												type="button"
												onClick={() => toggleExpenseNotify(expense.id)}
												className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${expense.notify ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20" : "text-muted-foreground hover:bg-accent"}`}
												title={
													expense.notify ? "Disable notification" : (
														"Enable notification"
													)
												}
											>
												{expense.notify ?
													<Bell size={16} />
												:	<BellOff size={16} />}
											</button>
										:	<span className="text-muted-foreground/30">—</span>}
									</td>
									<td className="p-2 overflow-hidden">
										<div className="flex items-center gap-2 truncate">
											<span
												className={`font-medium text-foreground text-sm truncate ${expense.isPaid ? "line-through opacity-60" : ""}`}
											>
												{expense.name}
											</span>
											{expense.isPaid && (
												<span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-green-500/20 text-green-600 dark:text-green-400 rounded shrink-0">
													Paid
												</span>
											)}
											{expense.isRecurring && !isAllExpensesView && (
												<span
													className="text-primary shrink-0"
													title="Recurring"
												>
													<RefreshCw size={12} />
												</span>
											)}
										</div>
									</td>
									<td className="py-3 px-2 text-left overflow-hidden">
										<span className="text-xs text-muted-foreground truncate block whitespace-nowrap">
											{expense.paymentMethod || "None"}
										</span>
									</td>
									<td className="py-3 px-2 text-center">
										<ImportanceIcon level={expense.importance || "none"} />
									</td>
									<td className="py-3 px-2 text-center overflow-hidden">
										<span
											className="w-full block py-0.5 rounded-full text-xs font-semibold text-center truncate"
											style={{
												backgroundColor: `${categoryColor}20`,
												color: displayColor,
												border: `1px solid ${categoryColor}40`,
											}}
										>
											{expense.category}
										</span>
									</td>
									<td className="text-center p-2">
										<span
											className={`text-xs font-medium ${expense.type === "need" ? "text-purple-500" : "text-muted-foreground"}`}
										>
											{expense.type === "need" ? "Need" : "Want"}
										</span>
									</td>
									<td className="p-2 text-center overflow-hidden">
										<span
											className={`font-semibold text-primary text-sm cursor-help ${expense.isPaid ? "line-through opacity-60" : ""}`}
											title={amountTooltip}
										>
											{amountDisplay}
										</span>
									</td>
									<td className="p-2 overflow-hidden whitespace-nowrap">
										{!expense.dueDate ?
											<span className="text-muted-foreground text-sm">
												No due date
											</span>
										: expense.isPaid ?
											<span
												className="text-muted-foreground cursor-help flex items-center gap-1 text-sm"
												title={`Due date: ${formatDate(expense.dueDate)}`}
											>
												{showRelativeDates  && (
													<Calendar size={12} />
												)}
												{showRelativeDates ?
													getRelativeDateText(
														expense.dueDate,
														selectedMonth,
													)
												:	formatDate(expense.dueDate)}
											</span>
										:	<span
												className={`${!showRelativeDates ? "text-foreground" : getDueDateColor(expense.dueDate, selectedMonth)} flex items-center gap-1 text-sm`}
											>
												{showRelativeDates  && (
													<Calendar size={12} />
												)}
												{showRelativeDates ?
													getRelativeDateText(
														expense.dueDate,
														selectedMonth,
													)
												:	formatDate(expense.dueDate)}
											</span>
										}
									</td>
									<td className="text-center p-2 whitespace-nowrap">
										<span className="text-sm text-muted-foreground">
											{expense.isPaid && expense.paymentDate ?
												formatDate(expense.paymentDate)
											:	"-"}
										</span>
									</td>
									<td className="p-2">
										<div className="flex items-center justify-center gap-1">
											<button
												type="button"
												onClick={() => setEditingExpense(expense)}
												className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 hover:scale-110 cursor-pointer"
												title="Edit"
											>
												<SquarePen size={14} />
											</button>
											{onDuplicate && (
												<button
													type="button"
													onClick={() => onDuplicate(expense.id)}
													className="p-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-all duration-200 hover:scale-110 cursor-pointer"
													title="Duplicate"
												>
													<Copy size={14} />
												</button>
											)}
											{showArchiveActions &&
												(expense.isArchived ?
													<button
														type="button"
														onClick={() => onUnarchive(expense.id)}
														className="p-1.5 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-all duration-200 hover:scale-110 cursor-pointer"
														title="Unarchive"
													>
														<ArchiveRestore size={14} />
													</button>
												:	<button
														type="button"
														onClick={() => onArchive(expense.id)}
														className="p-1.5 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all duration-200 hover:scale-110 cursor-pointer"
														title="Archive"
													>
														<Archive size={14} />
													</button>)}
											<button
												type="button"
												onClick={() => onDelete(expense.id, expense.name)}
												className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200 hover:scale-110 cursor-pointer"
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
