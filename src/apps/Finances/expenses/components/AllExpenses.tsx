import { useState, useMemo } from "react";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { DeleteModal } from "./DeleteModal";
import { ExpenseTable } from "./ExpenseTable";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { DollarSign } from "lucide-react";

export const AllExpenses: React.FC = () => {
	const {
		expenses,
		deleteExpense,
		archiveExpense,
		unarchiveExpense,
		toggleExpensePaid,
		duplicateExpense,
		categoryColors,
	} = useExpenseStore();

	const [showArchived, setShowArchived] = useState(false);
	const [selectedYear, setSelectedYear] = useState<number | "all">("all");
	const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({
		isOpen: false,
		id: "",
		name: "",
	});

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

	const handleTogglePaid = (id: string) => {
		toggleExpensePaid(id);
	};

	const handleDuplicate = (id: string) => {
		duplicateExpense(id);
	};

	const handleSelectedYearChange = (year: number | "all") => {
		setSelectedYear(year);
	};

	const archiveToggleOptions = [
		{
			value: "active" as const,
			label: `Active (${activeCount})`,
			ariaLabel: "Show active expenses",
		},
		{
			value: "archived" as const,
			label: `Archived (${archivedCount})`,
			ariaLabel: "Show archived expenses",
		},
	];

	const totalExpenseCount = activeCount + archivedCount;

	if (totalExpenseCount === 0) {
		return (
			<div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-slideUp">
				<h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">All Expenses</h3>
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
			<div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 animate-slideUp">
				<div className="pb-4">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<h3 className="text-lg sm:text-xl font-bold text-gray-800">All Expenses</h3>

						{/* Archive Toggle */}
						<AnimatedToggle
							options={archiveToggleOptions}
							value={showArchived ? "archived" : "active"}
							onChange={(value) => setShowArchived(value === "archived")}
						/>
					</div>
				</div>

				<div>
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
							expensesToDisplay={filteredExpenses}
							isCurrentMonth={false}
							selectedMonth={new Date()}
							onDelete={handleDeleteClick}
							onArchive={archiveExpense}
							onUnarchive={unarchiveExpense}
							onTogglePaid={handleTogglePaid}
							onDuplicate={handleDuplicate}
							showArchiveActions={true}
							isAllExpensesView={true}
							showRelativeDates={false}
							onSelectedYearChange={handleSelectedYearChange}
							categoryColors={categoryColors}
						/>
					)}
				</div>
			</div>

			<DeleteModal
				isOpen={deleteModal.isOpen}
				expenseName={deleteModal.name}
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>
		</>
	);
};
