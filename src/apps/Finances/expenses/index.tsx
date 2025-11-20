import { useState } from "react";
import { Layout } from "@/apps/Finances/expenses/components/Layout";
import { CategoryManager } from "./components/CategoryManager";
import { ExpenseOverview } from "@/apps/Finances/expenses/components/ExpenseOverview";
import { ExpenseForm } from "@/apps/Finances/expenses/components/ExpenseForm";
import { ExpenseList } from "@/apps/Finances/expenses/components/ExpenseList";
import { AllExpenses } from "@/apps/Finances/expenses/components/AllExpenses";
import { UpcomingExpenses } from "@/apps/Finances/expenses/components/UpcomingExpenses";
import { useExpenseStore } from "@/stores/useExpenseStore";

export const ExpensesTracker = () => {
	const [showCategoryManager, setShowCategoryManager] = useState(false);
	const [currentView, setCurrentView] = useState<"monthly" | "all" | "upcoming">("upcoming");

	const { editingExpense, setEditingExpense } = useExpenseStore();

	const handleCloseEdit = () => {
		setEditingExpense(null);
	};

	return (
		<>
			<Layout
				currentView={currentView}
				setCurrentView={setCurrentView}
				onManageCategories={() => setShowCategoryManager(true)}
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

			<CategoryManager
				isOpen={showCategoryManager}
				onClose={() => setShowCategoryManager(false)}
			/>

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
