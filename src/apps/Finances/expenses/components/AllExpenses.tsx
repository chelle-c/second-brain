import { DollarSign } from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { ExpenseTable } from "./ExpenseTable";

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

	const filteredExpenses = useMemo(() => {
		let filtered = expenses;
		filtered = filtered.filter((expense) =>
			showArchived ? expense.isArchived : !expense.isArchived,
		);
		if (selectedYear !== "all") {
			filtered = filtered.filter((expense) => {
				const expenseYear =
					expense.dueDate ?
						expense.dueDate.getFullYear()
					:	expense.createdAt.getFullYear();
				return expenseYear === selectedYear;
			});
		}
		return filtered;
	}, [expenses, showArchived, selectedYear]);

	const archivedCount = useMemo(
		() => expenses.filter((e) => !e.parentExpenseId && e.isArchived).length,
		[expenses],
	);
	const activeCount = useMemo(
		() => expenses.filter((e) => !e.parentExpenseId && !e.isArchived).length,
		[expenses],
	);
	const totalExpenseCount = activeCount + archivedCount;

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

	if (totalExpenseCount === 0) {
		return (
			<div className="bg-card rounded-xl shadow-lg p-4 sm:p-6 animate-fadeIn">
				<h3 className="text-lg font-bold text-card-foreground mb-4">All Expenses</h3>
				<div className="text-center py-8">
					<DollarSign className="mx-auto text-muted-foreground/30 mb-3" size={40} />
					<p className="text-muted-foreground text-sm">No expenses found.</p>
					<p className="text-muted-foreground/70 text-xs mt-1">
						Click the + button to add your first expense.
					</p>
				</div>
			</div>
		);
	}

	return (
		<>
			<div className="bg-card rounded-xl shadow-lg p-4 sm:p-6 animate-fadeIn">
				<div className="pb-3">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
						<h3 className="text-lg font-bold text-card-foreground">All Expenses</h3>
						<AnimatedToggle
							options={archiveToggleOptions}
							value={showArchived ? "archived" : "active"}
							onChange={(value) => setShowArchived(value === "archived")}
						/>
					</div>
				</div>

				<div>
					{filteredExpenses.length === 0 ?
						<div className="text-center py-6 text-muted-foreground text-sm">
							{showArchived ?
								`No archived expenses found${selectedYear !== "all" ? ` for ${selectedYear}` : ""}.`
							:	`No active expenses found${selectedYear !== "all" ? ` for ${selectedYear}` : ""}.`
							}
						</div>
					:	<ExpenseTable
							key={`all-${expenses.length}-${selectedYear}-${showArchived}`}
							expensesToDisplay={filteredExpenses}
							selectedMonth={new Date()}
							onDelete={(id, name) => setDeleteModal({ isOpen: true, id, name })}
							onArchive={archiveExpense}
							onUnarchive={unarchiveExpense}
							onTogglePaid={toggleExpensePaid}
							onDuplicate={duplicateExpense}
							showArchiveActions
							isAllExpensesView
							showRelativeDates={false}
							onSelectedYearChange={setSelectedYear}
							categoryColors={categoryColors}
						/>
					}
				</div>
			</div>

			<ConfirmationModal
				isOpen={deleteModal.isOpen}
				title="Confirm Deletion"
				message={`Are you sure you want to delete "${deleteModal.name}"? This action cannot be undone.`}
				confirmLabel="Delete"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={() => {
					deleteExpense(deleteModal.id);
					setDeleteModal({ isOpen: false, id: "", name: "" });
				}}
				onCancel={() => setDeleteModal({ isOpen: false, id: "", name: "" })}
			/>
		</>
	);
};
