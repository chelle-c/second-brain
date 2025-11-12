import { useState } from "react";
import { Layout } from "@/apps/Finances/expenses/components/Layout";
import { CategoryManager } from "./components/CategoryManager";
import { ExpenseOverview } from "@/apps/Finances/expenses/components/ExpenseOverview";
import { ExpenseForm } from "@/apps/Finances/expenses/components/ExpenseForm";
import { ExpenseList } from "@/apps/Finances/expenses/components/ExpenseList";
import { AllExpenses } from "@/apps/Finances/expenses/components/AllExpenses";

export const ExpensesTracker = () => {
	const [showCategoryManager, setShowCategoryManager] = useState(false);
	const [currentView, setCurrentView] = useState<"monthly" | "all">("monthly");

	return (
		<>
			<Layout
				currentView={currentView}
				setCurrentView={setCurrentView}
				onManageCategories={() => setShowCategoryManager(true)}
			>
				<div className="space-y-6">
					{currentView === "monthly" ? (
						<>
							<ExpenseOverview />
							<ExpenseList />
						</>
					) : (
						<AllExpenses />
					)}

					<ExpenseForm />
				</div>
			</Layout>

			<CategoryManager
				isOpen={showCategoryManager}
				onClose={() => setShowCategoryManager(false)}
			/>
		</>
	);
};
