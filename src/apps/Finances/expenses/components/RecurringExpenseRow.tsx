import {
	Archive,
	ArchiveRestore,
	Bell,
	BellOff,
	Check,
	CheckCircle,
	ChevronDown,
	ChevronRight,
	Copy,
	RefreshCw,
	RotateCcw,
	SquarePen,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { formatDate } from "@/lib/date-utils/formatting";
import { DEFAULT_CATEGORY_COLORS, getCategoryDisplayColor } from "@/lib/expenseHelpers";
import { formatAmountDisplay, getAmountTooltip } from "@/lib/amountUtils";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import type { Expense, ImportanceLevel } from "@/types/expense";

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

const focusTd = (isPaid: boolean) =>
	isPaid ?
		"group-focus-within:bg-green-500/30 dark:group-focus-within:bg-green-500/35"
	:	"group-focus-within:bg-accent";

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
	const { toggleExpensePaid, toggleExpenseNotify, resetOccurrence, setEditingExpense } =
		useExpenseStore();
	const { expenseCurrency } = useSettingsStore();
	const { resolvedTheme } = useThemeStore();
	const isDarkMode = resolvedTheme === "dark";

	const categoryColor =
		categoryColors[parentExpense.category] ||
		DEFAULT_CATEGORY_COLORS[parentExpense.category] ||
		"#6b7280";
	const displayColor = getCategoryDisplayColor(categoryColor, isDarkMode);
	const sortedOccurrences = [...occurrences]
		.filter((o) => showPaid || !o.isPaid)
		.sort((a, b) => (!a.dueDate || !b.dueDate ? 0 : a.dueDate.getTime() - b.dueDate.getTime()));
	const paidCount = sortedOccurrences.filter((e) => e.isPaid).length;
	const totalCount = sortedOccurrences.length;
	const parentAmountDisplay = formatAmountDisplay(
		parentExpense.amountData,
		parentExpense.amount,
		expenseCurrency,
	);
	const parentAmountTooltip =
		parentExpense.amountData ? getAmountTooltip(parentExpense.amountData.type) : "Exact total";

	return (
		<>
			{/* Parent Row */}
			<tr className="group border-b border-border cursor-pointer hover:bg-accent focus-within:bg-accent">
				<td className="py-3 px-2 group-focus-within:bg-accent">
					<div className="flex items-center gap-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								toggleExpensePaid(parentExpense.id);
							}}
							className={`p-1 rounded-lg transition-all duration-200 hover:scale-110 ${
								paidCount === totalCount && paidCount > 0 ?
									"text-green-500 bg-green-500/10 hover:bg-green-500/20"
								: paidCount > 0 ?
									"text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20"
								:	"text-muted-foreground hover:bg-accent"
							}`}
							title={
								paidCount === totalCount ? "Mark all as unpaid" : "Mark all as paid"
							}
						>
							{paidCount === totalCount && paidCount > 0 ?
								<CheckCircle size={16} />
							: paidCount > 0 ?
								<CheckCircle size={16} className="opacity-50" />
							:	<Check size={16} />}
						</button>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setIsExpanded(!isExpanded);
							}}
							className="p-1 hover:bg-accent rounded transition-all duration-200 text-muted-foreground hover:text-foreground"
							title={isExpanded ? "Collapse" : "Expand"}
						>
							{isExpanded ?
								<ChevronDown size={16} />
							:	<ChevronRight size={16} />}
						</button>
					</div>
				</td>
				<td className="py-3 px-2 group-focus-within:bg-accent">
					{parentExpense.dueDate ?
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								toggleExpenseNotify(parentExpense.id);
							}}
							className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${parentExpense.notify ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20" : "text-muted-foreground hover:bg-accent"}`}
							title={
								parentExpense.notify ? "Disable notification" : (
									"Enable notification"
								)
							}
						>
							{parentExpense.notify ?
								<Bell size={16} />
							:	<BellOff size={16} />}
						</button>
					:	<span className="text-muted-foreground/30">—</span>}
				</td>
				<td
					className="p-2 overflow-hidden"
					tabIndex={0}
					role="button"
					onClick={() => setIsExpanded(!isExpanded)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							setIsExpanded(!isExpanded);
						}
					}}
				>
					<div className="flex items-center gap-2 truncate">
						<span className="font-medium text-foreground text-sm truncate">
							{parentExpense.name}
						</span>
						<span className="text-primary shrink-0" title="Recurring">
							<RefreshCw size={12} />
						</span>
						<span className="text-xs text-muted-foreground shrink-0">
							({paidCount}/{totalCount})
						</span>
					</div>
					<div className="text-xs text-muted-foreground mt-0.5 truncate">
						{getFrequencyText(parentExpense)} • {totalCount} occurrences
					</div>
				</td>
				<td className="py-3 px-2 text-center overflow-hidden">
					<span className="text-xs text-muted-foreground truncate block whitespace-nowrap">
						{parentExpense.paymentMethod || "None"}
					</span>
				</td>
				<td className="py-3 px-2 text-center">
					<ImportanceIcon level={parentExpense.importance || "none"} />
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
						{parentExpense.category}
					</span>
				</td>
				<td className="p-2">
					<span
						className={`text-xs font-medium ${parentExpense.type === "need" ? "text-purple-500" : "text-muted-foreground"}`}
					>
						{parentExpense.type === "need" ? "Need" : "Want"}
					</span>
				</td>
				<td className="p-2 text-right overflow-hidden">
					<span
						className="font-semibold text-primary text-sm cursor-help"
						title={parentAmountTooltip}
					>
						{parentAmountDisplay}
					</span>
					<div className="text-xs text-muted-foreground truncate">base amount</div>
				</td>
				<td className="p-2 overflow-hidden whitespace-nowrap">
					<div className="text-sm text-foreground">
						{sortedOccurrences.length > 0 && sortedOccurrences[0].dueDate ?
							formatDate(sortedOccurrences[0].dueDate)
						: parentExpense.dueDate ?
							formatDate(parentExpense.dueDate)
						:	"No date"}
					</div>
					<div className="text-xs text-muted-foreground truncate">first occurrence</div>
				</td>
				<td className="p-2 text-center">
					<span className="text-sm text-muted-foreground">—</span>
				</td>
				<td className="p-2">
					<div className="flex items-center justify-center gap-1">
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setEditingExpense(parentExpense);
							}}
							className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 hover:scale-110"
							title="Edit All Occurrences"
						>
							<SquarePen size={14} />
						</button>
						{onDuplicate && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onDuplicate(parentExpense.id);
								}}
								className="p-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-all duration-200 hover:scale-110"
								title="Duplicate"
							>
								<Copy size={14} />
							</button>
						)}
						{parentExpense.isArchived ?
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onUnarchive(parentExpense.id);
								}}
								className="p-1.5 text-muted-foreground hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-all duration-200 hover:scale-110"
								title="Unarchive All"
							>
								<ArchiveRestore size={14} />
							</button>
						:	<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onArchive(parentExpense.id);
								}}
								className="p-1.5 text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-all duration-200 hover:scale-110"
								title="Archive All"
							>
								<Archive size={14} />
							</button>
						}
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(parentExpense.id, parentExpense.name);
							}}
							className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all duration-200 hover:scale-110"
							title="Delete All"
						>
							<Trash2 size={14} />
						</button>
					</div>
				</td>
			</tr>

			{/* Occurrence Rows */}
			{isExpanded &&
				sortedOccurrences.map((occurrence, index) => {
					const occAmountDisplay = formatAmountDisplay(
						occurrence.amountData,
						occurrence.amount,
						expenseCurrency,
					);
					const occAmountTooltip =
						occurrence.amountData ?
							getAmountTooltip(occurrence.amountData.type)
						:	"Exact total";
					const isAmountDifferent =
						occurrence.amount !== parentExpense.amount ||
						JSON.stringify(occurrence.amountData) !==
							JSON.stringify(parentExpense.amountData);
					const fw = focusTd(occurrence.isPaid);

					return (
						<tr
							key={occurrence.id}
							className={`group border-b border-border/50 animate-fadeIn ${
								occurrence.isPaid ?
									"expense-paid bg-green-500/15 dark:bg-green-500/20 hover:bg-green-500/25 dark:hover:bg-green-500/30 focus-within:bg-green-500/30 dark:focus-within:bg-green-500/35"
								:	"hover:bg-accent focus-within:bg-accent"
							}`}
						>
							<td className={`py-2 pl-6 px-2 ${fw}`}>
								<button
									type="button"
									onClick={() => toggleExpensePaid(occurrence.id)}
									className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${occurrence.isPaid ? "text-green-500 bg-green-500/10 hover:bg-green-500/20" : "text-muted-foreground hover:bg-accent"}`}
									title={occurrence.isPaid ? "Mark as unpaid" : "Mark as paid"}
								>
									{occurrence.isPaid ?
										<CheckCircle size={16} />
									:	<Check size={16} />}
								</button>
							</td>
							<td className={`py-2 px-2 ${fw}`}>
								<span className="text-muted-foreground/30">—</span>
							</td>
							<td className="py-2 px-3 overflow-hidden">
								<div className="flex items-center gap-2 truncate">
									<span
										className={`text-xs text-muted-foreground truncate ${occurrence.isPaid ? "line-through opacity-60" : ""}`}
									>
										Occurrence #{index + 1}
										{occurrence.isModified && (
											<span className="ml-1 text-primary" title="Modified">
												(edited)
											</span>
										)}
									</span>
									{occurrence.isPaid && (
										<span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-green-500/20 text-green-600 dark:text-green-400 rounded shrink-0">
											Paid
										</span>
									)}
								</div>
							</td>
							<td className="py-2 px-2 text-center overflow-hidden">
								<span
									className={`text-xs truncate block whitespace-nowrap ${occurrence.paymentMethod !== parentExpense.paymentMethod ? "text-orange-500" : "text-muted-foreground"}`}
								>
									{occurrence.paymentMethod || "None"}
								</span>
							</td>
							<td className="py-2 px-2 text-center">
								<span className="text-muted-foreground text-xs">—</span>
							</td>
							<td className="py-2 px-3">
								<span className="text-muted-foreground text-xs">—</span>
							</td>
							<td className="py-2 px-3">
								<span className="text-muted-foreground text-xs">—</span>
							</td>
							<td className="py-2 px-3 text-right overflow-hidden">
								<span
									className={`font-medium text-sm cursor-help ${
										occurrence.isPaid ?
											"line-through text-muted-foreground opacity-60"
										: isAmountDifferent ? "text-orange-500"
										: "text-primary"
									}`}
									title={occAmountTooltip}
								>
									{occAmountDisplay}
								</span>
							</td>
							<td className="py-2 px-3 overflow-hidden whitespace-nowrap">
								<span className="text-sm text-muted-foreground">
									{occurrence.dueDate ?
										formatDate(occurrence.dueDate)
									:	"No date"}
								</span>
							</td>
							<td className="py-2 px-3 text-center whitespace-nowrap">
								{occurrence.isPaid && occurrence.paymentDate ?
									<span className="text-xs text-muted-foreground">
										{formatDate(occurrence.paymentDate)}
									</span>
								:	<span className="text-xs text-muted-foreground/70">Not paid</span>}
							</td>
							<td className="py-2 px-3">
								<div className="flex items-center justify-center gap-1">
									<button
										type="button"
										onClick={() => onEditOccurrence(occurrence)}
										className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all duration-200 hover:scale-110"
										title="Edit this occurrence"
									>
										<SquarePen size={14} />
									</button>
									{onDuplicate && (
										<button
											type="button"
											onClick={() => onDuplicate(occurrence.id)}
											className="p-1.5 text-muted-foreground hover:text-purple-500 hover:bg-purple-500/10 rounded-lg transition-all duration-200 hover:scale-110"
											title="Duplicate"
										>
											<Copy size={14} />
										</button>
									)}
									{occurrence.isModified && (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												resetOccurrence(occurrence.id);
											}}
											className="p-1.5 text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 rounded-lg transition-all duration-200 hover:scale-110"
											title="Reset to original values"
										>
											<RotateCcw size={14} />
										</button>
									)}
								</div>
							</td>
						</tr>
					);
				})}
		</>
	);
};
