import { useEffect, useMemo } from "react";
import { DeleteModal } from "./DeleteModal";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { ExpenseTable } from "./ExpenseTable";
import { isSameMonth } from "date-fns";
import { DollarSign, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

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

	// Force re-calculation when expenses change
	const monthlyExpenses = getMonthlyExpenses(selectedMonth);
	const isCurrentMonth = isSameMonth(selectedMonth, new Date());

	// Filter expenses based on overviewMode only
	// Note: showPaid filtering is handled by ExpenseTable internally
	const filteredExpenses = useMemo(() => {
		return monthlyExpenses.filter((expense) => {
			switch (overviewMode) {
				case "remaining":
					// Show unpaid expenses (both Need and Want types)
					return (
						!expense.isPaid && isSameMonth(expense.dueDate || new Date(), selectedMonth)
					);
				case "required":
					// Show only "Need" type expenses (paid or unpaid)
					return expense.type === "need" && isSameMonth(expense.dueDate || new Date(), selectedMonth);
				case "all":
				default:
					// Show all expenses
					return true;
			}
		});
	}, [monthlyExpenses, overviewMode]);

	// Calculate the visible count (respecting showPaid toggle for display purposes)
	const visibleCount = useMemo(() => {
		if (showPaidExpenses) return filteredExpenses.length;
		return filteredExpenses.filter((e) => !e.isPaid).length;
	}, [filteredExpenses, showPaidExpenses]);

	// Close edit form when expenses update
	useEffect(() => {
		if (editingExpense) {
			// Check if the editing expense still exists
			const stillExists = expenses.find((e) => e.id === editingExpense.id);
			if (!stillExists) {
				setEditingExpense(null);
			}
		}
	}, [expenses, editingExpense, setEditingExpense]);

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

	// Get filter label for display
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
				<h3 className="text-xl font-bold text-foreground mb-4">
					Monthly Expenses{getFilterLabel()}
				</h3>
				{(overviewMode !== "all" || !showPaidExpenses) && monthlyExpenses.length > 0 && (
					<p className="text-sm text-muted-foreground mb-4">
						Showing 0 of {monthlyExpenses.length} expenses
					</p>
				)}
				<div className="text-center py-12">
					<DollarSign className="mx-auto text-muted-foreground/30 mb-4" size={48} />
					<p className="text-muted-foreground">
						{overviewMode === "remaining"
							? "All expenses are paid!"
							: overviewMode === "required"
							? showPaidExpenses
								? "No required expenses for this month."
								: "All required expenses are paid!"
							: showPaidExpenses
							? "No expenses for this month."
							: "All expenses are paid!"}
					</p>
					{overviewMode === "all" && showPaidExpenses && (
						<p className="text-muted-foreground/70 text-sm mt-2">
							Click the + button to add your first expense.
						</p>
					)}
				</div>

				{/* Still show table controls when empty so user can toggle showPaid */}
				{filteredExpenses.length > 0 && (
					<ExpenseTable
						key={`monthly-${selectedMonth.getTime()}-${
							expenses.length
						}-${overviewMode}`}
						expensesToDisplay={filteredExpenses}
						isCurrentMonth={isCurrentMonth}
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

				<DeleteModal
					isOpen={deleteModal.isOpen}
					expenseName={deleteModal.name}
					onConfirm={handleDeleteConfirm}
					onCancel={handleDeleteCancel}
				/>
			</>
		);
	}

	return (
		<>
			<div className="mb-6">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-xl font-bold text-foreground">
							Monthly Expenses{getFilterLabel()}
						</h3>
						{(overviewMode !== "all" || !showPaidExpenses) && (
							<p className="text-sm text-muted-foreground mt-1">
								Showing {visibleCount} of {monthlyExpenses.length} expenses
							</p>
						)}
					</div>
					<Button
						variant="secondary"
						size="sm"
						onClick={() => setShowMonthlyRelativeDates(!showMonthlyRelativeDates)}
						title={showMonthlyRelativeDates ? "Show actual dates" : "Show relative dates"}
					>
						{showMonthlyRelativeDates ? (
							<>
								<Calendar size={14} className="mr-2" />
								<span>Show Dates</span>
							</>
						) : (
							<>
								<Clock size={14} className="mr-2" />
								<span>Show Relative</span>
							</>
						)}
					</Button>
				</div>
			</div>

			<ExpenseTable
				key={`monthly-${selectedMonth.getTime()}-${expenses.length}-${overviewMode}`}
				expensesToDisplay={filteredExpenses}
				isCurrentMonth={isCurrentMonth}
				selectedMonth={selectedMonth}
				categoryColors={categoryColors}
				onDelete={handleDeleteClick}
				onArchive={() => {}}
				onUnarchive={() => {}}
				onTogglePaid={toggleExpensePaid}
				showArchiveActions={false}
				showRelativeDates={showMonthlyRelativeDates}
			/>

			<DeleteModal
				isOpen={deleteModal.isOpen}
				expenseName={deleteModal.name}
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>
		</>
	);
};
