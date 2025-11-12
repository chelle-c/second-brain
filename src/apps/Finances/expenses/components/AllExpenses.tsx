import { useState, useMemo } from "react";
import { X, DollarSign } from "lucide-react";
import useAppStore from "@/stores/useAppStore";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseTable } from "./ExpenseTable";
import { Expense } from "@/types/expense";

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

export const AllExpenses: React.FC = () => {
	const {
		expenses,
		deleteExpense,
		archiveExpense,
		unarchiveExpense,
		toggleExpensePaid,
		categoryColors,
	} = useAppStore();

	const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
	const [showArchived, setShowArchived] = useState(false);
	const [selectedYear, setSelectedYear] = useState<number | "all">("all");
	const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
		isOpen: false,
		id: "",
		name: "",
	});

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

	// Filter expenses by year and archived status
	const filteredExpenses = useMemo(() => {
		let filtered = expenses;

		// Filter by archived status
		filtered = filtered.filter((expense) =>
			showArchived ? expense.isArchived : !expense.isArchived
		);

		// Filter by year
		if (selectedYear !== "all") {
			filtered = filtered.filter((expense) => {
				const expenseYear = expense.dueDate
					? expense.dueDate.getFullYear()
					: expense.createdAt.getFullYear();
				return expenseYear === selectedYear;
			});
		}

		return filtered;
	}, [expenses, showArchived, selectedYear]);

	// Count archived and active expenses
	const archivedCount = useMemo(() => {
		return expenses.filter((e) => !e.parentExpenseId && e.isArchived).length;
	}, [expenses]);

	const activeCount = useMemo(() => {
		return expenses.filter((e) => !e.parentExpenseId && !e.isArchived).length;
	}, [expenses]);

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

	const handleTogglePaid = (id: string) => {
		toggleExpensePaid(id);
	};

	const totalExpenseCount = activeCount + archivedCount;

	if (totalExpenseCount === 0) {
		return (
			<div className="bg-white rounded-xl shadow-lg p-8 animate-slideUp">
				<h3 className="text-xl font-bold text-gray-800 mb-4">All Expenses</h3>
				<div className="text-center py-12">
					<DollarSign className="mx-auto text-gray-300 mb-4" size={48} />
					<p className="text-gray-500">No expenses found.</p>
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
				<div className="flex flex-col gap-4 mb-6">
					<h3 className="text-xl font-bold text-gray-800">All Expenses</h3>

					{/* Archive Toggle */}
					<div className="flex gap-2 bg-gray-100 rounded-lg p-1">
						<button
							onClick={() => setShowArchived(false)}
							className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 text-sm ${
								!showArchived
									? "bg-white text-blue-600 shadow-sm"
									: "text-gray-600 hover:text-gray-800"
							}`}
						>
							Active ({activeCount})
						</button>
						<button
							onClick={() => setShowArchived(true)}
							className={`flex-1 px-4 py-2 rounded-md font-medium transition-all duration-200 text-sm ${
								showArchived
									? "bg-white text-blue-600 shadow-sm"
									: "text-gray-600 hover:text-gray-800"
							}`}
						>
							Archived ({archivedCount})
						</button>
					</div>

					{/* Year Filter */}
					<div className="flex items-center gap-3">
						<label className="text-sm font-medium text-gray-700">Filter by year:</label>
						<select
							value={selectedYear}
							onChange={(e) =>
								setSelectedYear(
									e.target.value === "all" ? "all" : parseInt(e.target.value)
								)
							}
							className="px-4 py-2 border border-gray-300 rounded-lg 
									 focus:ring-2 focus:ring-blue-400 focus:border-transparent
									 text-sm font-medium"
						>
							<option value="all">All Years</option>
							{availableYears.map((year) => (
								<option key={year} value={year}>
									{year}
								</option>
							))}
						</select>
					</div>
				</div>

				{filteredExpenses.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						{showArchived
							? `No archived expenses found${
									selectedYear !== "all" ? ` for ${selectedYear}` : ""
							  }.`
							: `No active expenses found${
									selectedYear !== "all" ? ` for ${selectedYear}` : ""
							  }.`}
					</div>
				) : (
					<ExpenseTable
						key={`all-${expenses.length}-${selectedYear}-${showArchived}`}
						expenses={filteredExpenses}
						isCurrentMonth={false}
						selectedMonth={new Date()}
						onEdit={handleEdit}
						onDelete={handleDeleteClick}
						onArchive={archiveExpense}
						onUnarchive={unarchiveExpense}
						onTogglePaid={handleTogglePaid}
						showArchiveActions={true}
						isAllExpensesView={true}
						categoryColors={categoryColors}
					/>
				)}
			</div>

			{editingExpense && (
				<ExpenseForm
					key={editingExpense.id}
					editingExpense={editingExpense}
					onClose={handleCloseEdit}
					isGlobalEdit={!editingExpense.parentExpenseId}
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