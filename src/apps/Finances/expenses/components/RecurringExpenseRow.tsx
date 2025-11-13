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
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/dateHelpers";
import { DEFAULT_CATEGORY_COLORS } from "@/lib/expenseHelpers";
import { Expense, ImportanceLevel } from "@/types/expense";
import { useExpenseStore } from "@/stores/useExpenseStore";

interface RecurringExpenseRowProps {
	parentExpense: Expense;
	occurrences: Expense[];
	onEdit: (expense: Expense) => void;
	onEditOccurrence: (expense: Expense) => void;
	onDelete: (id: string, name: string) => void;
	onArchive: (id: string) => void;
	onUnarchive: (id: string) => void;
	hoveredId: string | null;
	onHoverStart: (id: string) => void;
	onHoverEnd: () => void;
	categoryColors: Record<string, string>;
}

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
	onEdit,
	onEditOccurrence,
	onDelete,
	onArchive,
	onUnarchive,
	hoveredId,
	onHoverStart,
	onHoverEnd,
	categoryColors,
}) => {
	const [isExpanded, setIsExpanded] = useState(false);
	const { toggleExpensePaid, resetOccurrence } = useExpenseStore();

	const categoryColor =
		categoryColors[parentExpense.category] ||
		DEFAULT_CATEGORY_COLORS[parentExpense.category] ||
		"#6b7280";
	const darkCategoryColor = darkenColor(categoryColor);

	// Sort occurrences by due date (don't include parent)
	const sortedOccurrences = [...occurrences].sort((a, b) => {
		if (!a.dueDate || !b.dueDate) return 0;
		return a.dueDate.getTime() - b.dueDate.getTime();
	});

	// Calculate summary stats
	const paidCount = sortedOccurrences.filter((e) => e.isPaid).length;
	const totalCount = sortedOccurrences.length;

	return (
		<>
			{/* Parent Row - Must match table column structure */}
			<tr
				className={`border-b border-gray-100 transition-all duration-200 cursor-pointer
					${hoveredId === parentExpense.id ? "bg-blue-50" : "hover:bg-gray-50"}`}
				onMouseEnter={() => onHoverStart(parentExpense.id)}
				onMouseLeave={onHoverEnd}
			>
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
										? "text-green-600 bg-green-100 hover:bg-green-200"
										: paidCount > 0
										? "text-yellow-600 bg-yellow-100 hover:bg-yellow-200"
										: "text-gray-400 bg-gray-100 hover:bg-gray-200"
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
							className="p-1 hover:bg-gray-200 rounded transition-all duration-200"
							title={isExpanded ? "Collapse" : "Expand"}
						>
							{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
						</button>
					</div>
				</td>

				{/* Column 2: Name */}
				<td className="py-3 px-3" onClick={() => setIsExpanded(!isExpanded)}>
					<div className="flex items-center gap-2">
						<span className="font-medium text-gray-800 text-sm">
							{parentExpense.name}
						</span>
						<span className="text-blue-500" title="Recurring">
							<RefreshCw size={12} />
						</span>
						<span className="text-xs text-gray-500">
							({paidCount}/{totalCount})
						</span>
					</div>
					<div className="text-xs text-gray-500 mt-0.5">
						{getFrequencyText(parentExpense)} • {totalCount} occurrences
					</div>
				</td>

				{/* Column 3: Importance */}
				<td className="py-3 px-2 text-center">
					<ImportanceIcon level={parentExpense.importance || "none"} />
				</td>

				{/* Column 4: Category */}
				<td className="py-3 px-3">
					<span
						className="px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center"
						style={{
							backgroundColor: `${categoryColor}20`,
							color: darkCategoryColor,
							border: `1px solid ${categoryColor}40`,
						}}
					>
						{parentExpense.category}
					</span>
				</td>

				{/* Column 5: Type */}
				<td className="py-3 px-3">
					<span
						className={`text-xs font-medium ${
							parentExpense.type === "need" ? "text-purple-600" : "text-gray-500"
						}`}
					>
						{parentExpense.type === "need" ? "Need" : "Want"}
					</span>
				</td>

				{/* Column 6: Amount */}
				<td className="py-3 px-3">
					<span className="font-semibold text-blue-600 text-sm">
						{formatCurrency(parentExpense.amount)}
					</span>
					<div className="text-xs text-gray-500">base amount</div>
				</td>

				{/* Column 7: Due Date */}
				<td className="py-3 px-3">
					<div className="text-sm text-gray-800">
						{sortedOccurrences.length > 0 && sortedOccurrences[0].dueDate
							? formatDate(sortedOccurrences[0].dueDate)
							: parentExpense.dueDate
							? formatDate(parentExpense.dueDate)
							: "No date"}
					</div>
					<div className="text-xs text-gray-500">first occurrence</div>
				</td>

				{/* Column 8: Payment Date */}
				<td className="py-3 px-3">
					<span className="text-sm text-gray-500">—</span>
				</td>

				{/* Column 9: Actions */}
				<td className="py-3 px-3">
					<div className="flex items-center justify-center gap-1">
						<button
							onClick={(e) => {
								e.stopPropagation();
								onEdit(parentExpense);
							}}
							className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-100 
								rounded-lg transition-all duration-200 hover:scale-110"
							title="Edit All Occurrences"
						>
							<Edit2 size={14} />
						</button>
						{parentExpense.isArchived ? (
							<button
								onClick={(e) => {
									e.stopPropagation();
									onUnarchive(parentExpense.id);
								}}
								className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-100 
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
								className="p-1.5 text-gray-600 hover:text-yellow-600 hover:bg-yellow-100 
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
							className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-100 
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
						className={`border-b border-gray-50 transition-all duration-200
						${hoveredId === occurrence.id ? "bg-blue-50" : "hover:bg-gray-50"}
						${occurrence.isPaid ? "opacity-60" : ""}
						animate-fadeIn`}
						onMouseEnter={() => onHoverStart(occurrence.id)}
						onMouseLeave={onHoverEnd}
					>
						{/* Column 1: Paid checkbox */}
						<td className="py-2 px-2">
							<button
								onClick={() => toggleExpensePaid(occurrence.id)}
								className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ml-6
								${
									occurrence.isPaid
										? "text-green-600 bg-green-100 hover:bg-green-200"
										: "text-gray-400 bg-gray-100 hover:bg-gray-200"
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
							<span className="text-xs text-gray-500">
								Occurrence #{index + 1}
								{occurrence.isModified && (
									<span
										className="ml-1 text-blue-600"
										title="This occurrence has been modified"
									>
										(edited)
									</span>
								)}
							</span>
						</td>

						{/* Column 3: Importance (inherited) */}
						<td className="py-2 px-2 text-center">
							<span className="text-gray-400 text-xs">—</span>
						</td>

						{/* Column 4: Category (empty) */}
						<td className="py-2 px-3">
							<span className="text-gray-400 text-xs">—</span>
						</td>

						{/* Column 5: Type (empty) */}
						<td className="py-2 px-3">
							<span className="text-gray-400 text-xs">—</span>
						</td>

						{/* Column 6: Amount */}
						<td className="py-2 px-3">
							<span
								className={`font-medium text-sm ${
									occurrence.isPaid
										? "line-through text-gray-500"
										: occurrence.amount !== parentExpense.amount
										? "text-orange-600"
										: "text-blue-600"
								}`}
							>
								{formatCurrency(occurrence.amount)}
							</span>
						</td>

						{/* Column 7: Due Date */}
						<td className="py-2 px-3">
							<span className="text-sm text-gray-600">
								{occurrence.dueDate ? formatDate(occurrence.dueDate) : "No date"}
							</span>
						</td>

						{/* Column 8: Payment Date */}
						<td className="py-2 px-3">
							{occurrence.isPaid && occurrence.paymentDate ? (
								<span className="text-xs text-gray-600">
									{formatDate(occurrence.paymentDate)}
								</span>
							) : (
								<span className="text-xs text-gray-400">Not paid</span>
							)}
						</td>

						{/* Column 9: Actions */}
						<td className="py-2 px-3">
							<div className="flex items-center justify-center gap-1">
								<button
									onClick={() => onEditOccurrence(occurrence)}
									className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-100 
										rounded-lg transition-all duration-200 hover:scale-110"
									title="Edit this occurrence only"
								>
									<Edit2 size={14} />
								</button>
								{occurrence.isModified && (
									<button
										onClick={(e) => {
											e.stopPropagation();
											resetOccurrence(occurrence.id);
										}}
										className="p-1.5 text-gray-600 hover:text-orange-600 hover:bg-orange-100 
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
