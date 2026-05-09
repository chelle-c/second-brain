import { isSameMonth } from "date-fns";
import { Calendar, Clock, DollarSign } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ExpenseTable } from "./ExpenseTable";

const isOverdueRollover = (
	expense: { dueDate: Date | null; isPaid: boolean; parentExpenseId?: string },
	selectedMonth: Date,
): boolean => {
	if (!expense.dueDate || expense.isPaid || expense.parentExpenseId) return false;
	const now = new Date();
	if (!isSameMonth(selectedMonth, now)) return false;
	const dueMonth = expense.dueDate.getMonth();
	const dueYear = expense.dueDate.getFullYear();
	return (
		dueYear < now.getFullYear() || (dueYear === now.getFullYear() && dueMonth < now.getMonth())
	);
};

export const ExpenseList: React.FC = () => {
	const {
		selectedMonth,
		getMonthlyExpenses,
		deleteExpense,
		toggleExpensePaid,
		expenses,
		categoryColors,
		overviewMode,
		editingExpense,
		setEditingExpense,
		deleteModal,
		setDeleteModal,
		showPaidExpenses,
		showMonthlyRelativeDates,
		setShowMonthlyRelativeDates,
	} = useExpenseStore();

	if (!selectedMonth) return null;

	const monthlyExpenses = getMonthlyExpenses(selectedMonth);

	const filteredExpenses = useMemo(() => {
		return monthlyExpenses.filter((expense) => {
			switch (overviewMode) {
				case "remaining":
					if (expense.isPaid) return false;
					if (isSameMonth(expense.dueDate || new Date(), selectedMonth)) return true;
					if (isOverdueRollover(expense, selectedMonth)) return true;
					return false;
				case "required":
					if (expense.type !== "need") return false;
					if (isSameMonth(expense.dueDate || new Date(), selectedMonth)) return true;
					if (isOverdueRollover(expense, selectedMonth)) return true;
					return false;
				default:
					return true;
			}
		});
	}, [monthlyExpenses, overviewMode, selectedMonth]);

	const visibleCount = useMemo(() => {
		if (showPaidExpenses) return filteredExpenses.length;
		return filteredExpenses.filter((e) => !e.isPaid).length;
	}, [filteredExpenses, showPaidExpenses]);

	useEffect(() => {
		if (editingExpense) {
			const stillExists = expenses.find((e) => e.id === editingExpense.id);
			if (!stillExists) setEditingExpense(null);
		}
	}, [expenses, editingExpense, setEditingExpense]);

	const handleDeleteClick = (id: string, name: string) =>
		setDeleteModal({ isOpen: true, id, name });
	const handleDeleteConfirm = () => {
		deleteExpense(deleteModal.id);
		setDeleteModal({ isOpen: false, id: "", name: "" });
	};
	const handleDeleteCancel = () => setDeleteModal({ isOpen: false, id: "", name: "" });

	const getFilterLabel = () => {
		switch (overviewMode) {
			case "remaining":
				return " (Remaining Unpaid)";
			case "required":
				return showPaidExpenses ? " (Required - All)" : " (Required - Unpaid Only)";
			case "all":
				return showPaidExpenses ? "" : " (Unpaid Only)";
			default:
				return "";
		}
	};

	if (visibleCount === 0) {
		return (
			<>
				<h3 className="text-lg font-bold text-foreground mb-3">
					Monthly Expenses{getFilterLabel()}
				</h3>
				{(overviewMode !== "all" || !showPaidExpenses) && monthlyExpenses.length > 0 && (
					<p className="text-sm text-muted-foreground mb-3">
						Showing 0 of {monthlyExpenses.length} expenses
					</p>
				)}
				<div className="text-center py-8">
					<DollarSign className="mx-auto text-muted-foreground/30 mb-3" size={40} />
					<p className="text-muted-foreground text-sm">
						{overviewMode === "remaining" ?
							"All expenses are paid!"
						: overviewMode === "required" ?
							showPaidExpenses ?
								"No required expenses for this month."
							:	"All required expenses are paid!"
						: showPaidExpenses ?
							"No expenses for this month."
						:	"All expenses are paid!"}
					</p>
					{overviewMode === "all" && showPaidExpenses && (
						<p className="text-muted-foreground/70 text-xs mt-1">
							Click the + button to add your first expense.
						</p>
					)}
				</div>

				{filteredExpenses.length > 0 && (
					<ExpenseTable
						key={`monthly-${selectedMonth.getTime()}-${expenses.length}-${overviewMode}`}
						expensesToDisplay={filteredExpenses}
						selectedMonth={selectedMonth}
						categoryColors={categoryColors}
						onDelete={handleDeleteClick}
						onArchive={() => {}}
						onUnarchive={() => {}}
						onTogglePaid={toggleExpensePaid}
						showArchiveActions={false}
						showRelativeDates={showMonthlyRelativeDates}
					/>
				)}

				<ConfirmationModal
					isOpen={deleteModal.isOpen}
					title="Confirm Deletion"
					message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
					confirmLabel="Delete"
					cancelLabel="Cancel"
					variant="danger"
					onConfirm={handleDeleteConfirm}
					onCancel={handleDeleteCancel}
				/>
			</>
		);
	}

	return (
		<>
			<div className="mb-4">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-lg font-bold text-foreground">
							Monthly Expenses{getFilterLabel()}
						</h3>
						{(overviewMode !== "all" || !showPaidExpenses) && (
							<p className="text-xs text-muted-foreground mt-0.5">
								Showing {visibleCount} of {monthlyExpenses.length} expenses
							</p>
						)}
					</div>
					<Button
						variant="secondary"
						size="sm"
						className="h-7 text-xs px-2"
						onClick={() => setShowMonthlyRelativeDates(!showMonthlyRelativeDates)}
						title={
							showMonthlyRelativeDates ? "Show actual dates" : "Show relative dates"
						}
					>
						{showMonthlyRelativeDates ?
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
			</div>

			<ExpenseTable
				key={`monthly-${selectedMonth.getTime()}-${expenses.length}-${overviewMode}`}
				expensesToDisplay={filteredExpenses}
				selectedMonth={selectedMonth}
				categoryColors={categoryColors}
				onDelete={handleDeleteClick}
				onArchive={() => {}}
				onUnarchive={() => {}}
				onTogglePaid={toggleExpensePaid}
				showArchiveActions={false}
				showRelativeDates={showMonthlyRelativeDates}
			/>

			<ConfirmationModal
				isOpen={deleteModal.isOpen}
				title="Confirm Deletion"
				message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>
		</>
	);
};
