import { useState, useEffect } from "react";
import { X, DollarSign } from "lucide-react";
import useAppStore from "@/stores/useAppStore";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseTable } from "./ExpenseTable";
import { Expense } from "@/types/expense";
import { isSameMonth } from "date-fns";

interface DeleteModalProps {
	isOpen: boolean;
	expenseName: string;
	onConfirm: () => void;
	onCancel: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({ isOpen, expenseName, onConfirm, onCancel }) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn"
			style={{ margin: 0, padding: 0 }}
		>
			<div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-slideUp">
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-bold text-gray-800">Confirm Deletion</h3>
					<button
						onClick={onCancel}
						className="p-1 hover:bg-gray-100 rounded-lg transition-colors duration-200"
					>
						<X size={20} />
					</button>
				</div>

				<p className="text-gray-600 mb-6">
					Are you sure you want to delete <strong>"{expenseName}"</strong>? This action
					cannot be undone.
				</p>

				<div className="flex gap-3">
					<button
						onClick={onConfirm}
						className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg 
                     hover:bg-red-600 transition-colors duration-200 font-medium
                     hover:scale-105 active:scale-95 transform"
					>
						Delete
					</button>
					<button
						onClick={onCancel}
						className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg 
                     hover:bg-gray-300 transition-colors duration-200 font-medium
                     hover:scale-105 active:scale-95 transform"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};

export const ExpenseList: React.FC = () => {
	const { selectedMonth, getMonthlyExpenses, deleteExpense, toggleExpensePaid, expenses } =
		useAppStore();

	const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
	const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
		isOpen: false,
		id: "",
		name: "",
	});

	// Force re-calculation when expenses change
	const monthlyExpenses = getMonthlyExpenses(selectedMonth);
	const isCurrentMonth = isSameMonth(selectedMonth, new Date());

	// Close edit form when expenses update
	useEffect(() => {
		if (editingExpense) {
			// Check if the editing expense still exists
			const stillExists = expenses.find((e) => e.id === editingExpense.id);
			if (!stillExists) {
				setEditingExpense(null);
			}
		}
	}, [expenses, editingExpense]);

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

	if (monthlyExpenses.length === 0) {
		return (
			<div className="bg-white rounded-xl shadow-lg p-8 animate-slideUp">
				<h3 className="text-xl font-bold text-gray-800 mb-4">Monthly Expenses</h3>
				<div className="text-center py-12">
					<DollarSign className="mx-auto text-gray-300 mb-4" size={48} />
					<p className="text-gray-500">No expenses for this month.</p>
					<p className="text-gray-400 text-sm mt-2">
						Click the + button to add your first expense.
					</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="bg-white rounded-xl shadow-lg p-6 animate-slideUp">
				<div className="mb-6">
					<h3 className="text-xl font-bold text-gray-800">Monthly Expenses</h3>
				</div>

				<ExpenseTable
					key={`monthly-${selectedMonth.getTime()}-${expenses.length}`} // Force re-render
					expenses={monthlyExpenses}
					isCurrentMonth={isCurrentMonth}
					selectedMonth={selectedMonth}
					onEdit={handleEdit}
					onDelete={handleDeleteClick}
					onArchive={() => {}}
					onUnarchive={() => {}}
					onTogglePaid={toggleExpensePaid}
					showArchiveActions={false}
				/>
			</div>

			{editingExpense && (
				<ExpenseForm
					key={editingExpense.id} // Force form to re-mount with new data
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
