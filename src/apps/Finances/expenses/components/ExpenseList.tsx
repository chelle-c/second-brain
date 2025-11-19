import { useEffect, useMemo } from "react";
import { DeleteModal } from "./DeleteModal";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseTable } from "./ExpenseTable";
import { Expense } from "@/types/expense";
import { isSameMonth } from "date-fns";
import { DollarSign } from "lucide-react";

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
					return !expense.isPaid;
				case "required":
					// Show only "Need" type expenses (paid or unpaid)
					return expense.type === "need";
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

	const handleEdit = (expense: Expense) => {
		setEditingExpense(expense);
	};

	const handleCloseEdit = () => {
		setEditingExpense(null);
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
				<h3 className="text-xl font-bold text-gray-800 mb-4">
					Monthly Expenses{getFilterLabel()}
				</h3>
				{(overviewMode !== "all" || !showPaidExpenses) && monthlyExpenses.length > 0 && (
					<p className="text-sm text-gray-500 mb-4">
						Showing 0 of {monthlyExpenses.length} expenses
					</p>
				)}
				<div className="text-center py-12">
					<DollarSign className="mx-auto text-gray-300 mb-4" size={48} />
					<p className="text-gray-500">
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
						<p className="text-gray-400 text-sm mt-2">
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
						expenses={filteredExpenses}
						isCurrentMonth={isCurrentMonth}
						selectedMonth={selectedMonth}
						categoryColors={categoryColors}
						onEdit={handleEdit}
						onDelete={handleDeleteClick}
						onArchive={() => {}}
						onUnarchive={() => {}}
						onTogglePaid={toggleExpensePaid}
						showArchiveActions={false}
					/>
				)}

				{editingExpense && (
					<ExpenseForm
						key={editingExpense.id}
						editingExpense={editingExpense}
						onClose={handleCloseEdit}
						isGlobalEdit={false}
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
				<h3 className="text-xl font-bold text-gray-800">
					Monthly Expenses{getFilterLabel()}
				</h3>
				{(overviewMode !== "all" || !showPaidExpenses) && (
					<p className="text-sm text-gray-500 mt-1">
						Showing {visibleCount} of {monthlyExpenses.length} expenses
					</p>
				)}
			</div>

			<ExpenseTable
				key={`monthly-${selectedMonth.getTime()}-${expenses.length}-${overviewMode}`}
				expenses={filteredExpenses}
				isCurrentMonth={isCurrentMonth}
				selectedMonth={selectedMonth}
				categoryColors={categoryColors}
				onEdit={handleEdit}
				onDelete={handleDeleteClick}
				onArchive={() => {}}
				onUnarchive={() => {}}
				onTogglePaid={toggleExpensePaid}
				showArchiveActions={false}
			/>

			{editingExpense && (
				<ExpenseForm
					key={editingExpense.id}
					editingExpense={editingExpense}
					onClose={handleCloseEdit}
					isGlobalEdit={false}
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
};
