import { useState } from "react";
import {
	ChevronDown,
	ChevronRight,
	Edit2,
	Trash2,
	Archive,
	ArchiveRestore,
	RefreshCw,
	Check,
	CheckCircle,
	RotateCcw,
	Copy,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/dateUtils";
import { DEFAULT_CATEGORY_COLORS, getCategoryDisplayColor } from "@/lib/expenseHelpers";
import { Expense, ImportanceLevel } from "@/types/expense";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useThemeStore } from "@/stores/useThemeStore";

interface RecurringExpenseRowProps {
	parentExpense: Expense;
	occurrences: Expense[];
	onEditOccurrence: (expense: Expense) => void;
	onDelete: (id: string, name: string) => void;
	onArchive: (id: string) => void;
	onUnarchive: (id: string) => void;
	onDuplicate?: (id: string) => void;
	categoryColors: Record<string, string>;
	showPaid?: boolean;
}

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

const getFrequencyText = (expense: Expense): string => {
	if (!expense.recurrence) return "";
	const { frequency, interval } = expense.recurrence;

	switch (frequency) {
		case "daily":
			return "Daily";
		case "weekly":
			return "Weekly";
		case "biweekly":
			return "Biweekly";
		case "monthly":
			return "Monthly";
		case "custom-days":
			return `Every ${interval} days`;
		case "custom-months":
			return `Every ${interval} months`;
		default:
			return "";
	}
};

export const RecurringExpenseRow: React.FC<RecurringExpenseRowProps> = ({
	parentExpense,
	occurrences,
	onEditOccurrence,
	onDelete,
	onArchive,
	onUnarchive,
	onDuplicate,
	categoryColors,
	showPaid = true,
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const { toggleExpensePaid, resetOccurrence, setEditingExpense } = useExpenseStore();
	const { expenseCurrency } = useSettingsStore();
	const { resolvedTheme } = useThemeStore();
	const isDarkMode = resolvedTheme === "dark";

	const categoryColor =
		categoryColors[parentExpense.category] ||
		DEFAULT_CATEGORY_COLORS[parentExpense.category] ||
		"#6b7280";
	const displayColor = getCategoryDisplayColor(categoryColor, isDarkMode);

	const sortedOccurrences = [...occurrences]
		.filter((occ) => showPaid || !occ.isPaid)
		.sort((a, b) => {
			if (!a.dueDate || !b.dueDate) return 0;
			return a.dueDate.getTime() - b.dueDate.getTime();
		});

	const paidCount = sortedOccurrences.filter((e) => e.isPaid).length;
	const totalCount = sortedOccurrences.length;

	return (
		<>
			{/* Parent Row */}
			<tr className={`border-b border-border cursor-pointer hover:bg-accent`}>
				{/* Column 1: Paid checkbox (with expand button) */}
				<td className="py-3 px-2">
					<div className="flex items-center gap-1">
						<button
							onClick={(e) => {
								e.stopPropagation();
								toggleExpensePaid(parentExpense.id);
							}}
							className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110
								${
									paidCount === totalCount && paidCount > 0
										? "text-green-500 bg-green-500/10 hover:bg-green-500/20"
										: paidCount > 0
										? "text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20"
										: "text-muted-foreground bg-muted hover:bg-accent"
								}`}
							title={
								paidCount === totalCount ? "Mark all as unpaid" : "Mark all as paid"
							}
						>
							{paidCount === totalCount && paidCount > 0 ? (
								<CheckCircle size={16} />
							) : paidCount > 0 ? (
								<CheckCircle size={16} className="opacity-50" />
							) : (
								<Check size={16} />
							)}
						</button>
						<button
							onClick={(e) => {
								e.stopPropagation();
								setIsExpanded(!isExpanded);
							}}
							className="p-1 hover:bg-accent rounded transition-all duration-200 text-muted-foreground hover:text-foreground"
							title={isExpanded ? "Collapse" : "Expand"}
						>
							{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
						</button>
					</div>
				</td>

				{/* Column 2: Name */}
				<td className="py-3 px-3" onClick={() => setIsExpanded(!isExpanded)}>
					<div className="flex items-center gap-2">
						<span className="font-medium text-foreground text-sm">
							{parentExpense.name}
						</span>
						<span className="text-primary" title="Recurring">
							<RefreshCw size={12} />
						</span>
						<span className="text-xs text-muted-foreground">
							({paidCount}/{totalCount})
						</span>
					</div>
					<div className="text-xs text-muted-foreground mt-0.5">
						{getFrequencyText(parentExpense)} • {totalCount} occurrences
					</div>
				</td>

				{/* Column 3: Payment Method */}
				<td className="py-3 px-2">
					<span className="text-xs text-muted-foreground">
						{parentExpense.paymentMethod || "None"}
					</span>
				</td>

				{/* Column 4: Importance */}
				<td className="py-3 px-2 text-center">
					<ImportanceIcon level={parentExpense.importance || "none"} />
				</td>

				{/* Column 5: Category */}
				<td className="w-min py-3 px-2 text-center">
					<span
						className="px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center"
						style={{
							backgroundColor: `${categoryColor}20`,
							color: displayColor,
							border: `1px solid ${categoryColor}40`,
						}}
					>
						{parentExpense.category}
					</span>
				</td>

				{/* Column 6: Type */}
				<td className="py-3 px-3">
					<span
						className={`text-xs font-medium ${
							parentExpense.type === "need"
								? "text-purple-500"
								: "text-muted-foreground"
						}`}
					>
						{parentExpense.type === "need" ? "Need" : "Want"}
					</span>
				</td>

				{/* Column 7: Amount */}
				<td className="py-3 px-3">
					<span className="font-semibold text-primary text-sm">
						{formatCurrency(parentExpense.amount, expenseCurrency)}
					</span>
					<div className="text-xs text-muted-foreground">base amount</div>
				</td>

				{/* Column 8: Due Date */}
				<td className="py-3 px-3">
					<div className="text-sm text-foreground">
						{sortedOccurrences.length > 0 && sortedOccurrences[0].dueDate
							? formatDate(sortedOccurrences[0].dueDate)
							: parentExpense.dueDate
							? formatDate(parentExpense.dueDate)
							: "No date"}
					</div>
					<div className="text-xs text-muted-foreground">first occurrence</div>
				</td>

				{/* Column 9: Payment Date */}
				<td className="py-3 px-3">
					<span className="text-sm text-muted-foreground">—</span>
				</td>

				{/* Column 10: Actions */}
				<td className="py-3 px-3">
					<div className="flex items-center justify-center gap-1">
						<button
							onClick={(e) => {
								e.stopPropagation();
								setEditingExpense(parentExpense);
							}}
							className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10
								rounded-lg transition-all duration-200 hover:scale-110"
							title="Edit All Occurrences"
						>
							<Edit2 size={14} />
						</button>
						{onDuplicate && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onDuplicate(parentExpense.id);
								}}
								className="p-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10
									rounded-lg transition-all duration-200 hover:scale-110"
								title="Duplicate All Occurrences"
							>
								<Copy size={14} />
							</button>
						)}
						{parentExpense.isArchived ? (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onUnarchive(parentExpense.id);
								}}
								className="p-1.5 text-muted-foreground hover:text-green-500 hover:bg-green-500/10
									rounded-lg transition-all duration-200 hover:scale-110"
								title="Unarchive All"
							>
								<ArchiveRestore size={14} />
							</button>
						) : (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onArchive(parentExpense.id);
								}}
								className="p-1.5 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10
									rounded-lg transition-all duration-200 hover:scale-110"
								title="Archive All"
							>
								<Archive size={14} />
							</button>
						)}
						<button
							onClick={(e) => {
								e.stopPropagation();
								onDelete(parentExpense.id, parentExpense.name);
							}}
							className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10
								rounded-lg transition-all duration-200 hover:scale-110"
							title="Delete All Occurrences"
						>
							<Trash2 size={14} />
						</button>
					</div>
				</td>
			</tr>

			{/* Occurrence Rows */}
			{isExpanded &&
				sortedOccurrences.map((occurrence, index) => (
					<tr
						key={occurrence.id}
						className={`border-b border-border/50 animate-fadeIn ${
							occurrence.isPaid
								? "expense-paid bg-green-500/15 dark:bg-green-500/20 hover:bg-green-500/25 dark:hover:bg-green-500/30"
								: "hover:bg-accent"
						}`}
					>
						{/* Column 1: Paid checkbox */}
						<td className="py-2 px-2">
							<button
								onClick={() => toggleExpensePaid(occurrence.id)}
								className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ml-6
								${
									occurrence.isPaid
										? "text-green-500 bg-green-500/10 hover:bg-green-500/20"
										: "text-muted-foreground bg-muted hover:bg-accent"
								}`}
								title={occurrence.isPaid ? "Mark as unpaid" : "Mark as paid"}
							>
								{occurrence.isPaid ? (
									<CheckCircle size={16} />
								) : (
									<Check size={16} />
								)}
							</button>
						</td>

						{/* Column 2: Instance info */}
						<td className="py-2 px-3 pl-8">
							<div className="flex items-center gap-2">
								<span
									className={`text-xs text-muted-foreground ${
										occurrence.isPaid ? "line-through opacity-60" : ""
									}`}
								>
									Occurrence #{index + 1}
									{occurrence.isModified && (
										<span
											className="ml-1 text-primary"
											title="This occurrence has been modified"
										>
											(edited)
										</span>
									)}
								</span>
								{occurrence.isPaid && (
									<span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-green-500/20 text-green-600 dark:text-green-400 rounded">
										Paid
									</span>
								)}
							</div>
						</td>

						{/* Column 3: Payment Method */}
						<td className="py-2 px-2">
							<span
								className={`text-xs ${
									occurrence.paymentMethod !== parentExpense.paymentMethod
										? "text-orange-500"
										: "text-muted-foreground"
								}`}
							>
								{occurrence.paymentMethod || "None"}
							</span>
						</td>

						{/* Column 4: Importance (inherited) */}
						<td className="py-2 px-2 text-center">
							<span className="text-muted-foreground text-xs">—</span>
						</td>

						{/* Column 5: Category (empty) */}
						<td className="py-2 px-3">
							<span className="text-muted-foreground text-xs">—</span>
						</td>

						{/* Column 6: Type (empty) */}
						<td className="py-2 px-3">
							<span className="text-muted-foreground text-xs">—</span>
						</td>

						{/* Column 7: Amount */}
						<td className="py-2 px-3">
							<span
								className={`font-medium text-sm ${
									occurrence.isPaid
										? "line-through text-muted-foreground opacity-60"
										: occurrence.amount !== parentExpense.amount
										? "text-orange-500"
										: "text-primary"
								}`}
							>
								{formatCurrency(occurrence.amount, expenseCurrency)}
							</span>
						</td>

						{/* Column 8: Due Date */}
						<td className="py-2 px-3">
							<span className="text-sm text-muted-foreground">
								{occurrence.dueDate ? formatDate(occurrence.dueDate) : "No date"}
							</span>
						</td>

						{/* Column 9: Payment Date */}
						<td className="py-2 px-3">
							{occurrence.isPaid && occurrence.paymentDate ? (
								<span className="text-xs text-muted-foreground">
									{formatDate(occurrence.paymentDate)}
								</span>
							) : (
								<span className="text-xs text-muted-foreground/70">Not paid</span>
							)}
						</td>

						{/* Column 10: Actions */}
						<td className="py-2 px-3">
							<div className="flex items-center justify-center gap-1">
								<button
									onClick={() => onEditOccurrence(occurrence)}
									className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10
										rounded-lg transition-all duration-200 hover:scale-110"
									title="Edit this occurrence only"
								>
									<Edit2 size={14} />
								</button>
								{onDuplicate && (
									<button
										onClick={() => onDuplicate(occurrence.id)}
										className="p-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10
											rounded-lg transition-all duration-200 hover:scale-110"
										title="Duplicate this occurrence"
									>
										<Copy size={14} />
									</button>
								)}
								{occurrence.isModified && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											resetOccurrence(occurrence.id);
										}}
										className="p-1.5 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10
											rounded-lg transition-all duration-200 hover:scale-110"
										title="Reset to original values"
									>
										<RotateCcw size={14} />
									</button>
								)}
							</div>
						</td>
					</tr>
				))}
		</>
	);
};
