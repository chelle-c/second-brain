import { useState } from "react";
import { Layout } from "./components/Layout";
import { ExpenseOverview } from "./components/ExpenseOverview";
import { ExpenseForm } from "./components/ExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { AllExpenses } from "./components/AllExpenses";
import { UpcomingExpenses } from "./components/UpcomingExpenses";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export const ExpensesTracker = () => {
	const { expenseDefaultView } = useSettingsStore();
	const [currentView, setCurrentView] = useState<"monthly" | "all" | "upcoming">(expenseDefaultView);

	const { editingExpense, setEditingExpense } = useExpenseStore();

	const handleCloseEdit = () => {
		setEditingExpense(null);
	};

	return (
		<>
			<Layout
				currentView={currentView}
				setCurrentView={setCurrentView}
			>
				<div className="space-y-3 overflow-y-auto">
					{currentView === "monthly" ? (
						<div className="bg-white rounded-xl shadow-lg p-6 animate-slideUp">
							<ExpenseOverview />
							<div className="mt-8 mb-6 border-t border-gray-200"></div>
							<ExpenseList />
						</div>
					) : currentView === "upcoming" ? (
						<UpcomingExpenses />
					) : (
						<AllExpenses />
					)}

					{currentView && <ExpenseForm />}
				</div>
			</Layout>

			{editingExpense && (
				<ExpenseForm
					key={editingExpense.id}
					editingExpense={editingExpense}
					onClose={handleCloseEdit}
					isGlobalEdit={!editingExpense.parentExpenseId}
				/>
			)}
		</>
	);
};
