import { useState } from "react";
import { Layout } from "@/apps/Finances/expenses/components/Layout";
import { ExpenseOverview } from "@/apps/Finances/expenses/components/ExpenseOverview";
import { ExpenseForm } from "@/apps/Finances/expenses/components/ExpenseForm";
import { ExpenseList } from "@/apps/Finances/expenses/components/ExpenseList";
import { AllExpenses } from "@/apps/Finances/expenses/components/AllExpenses";

export const ExpensesTracker = () => {
	const [currentView, setCurrentView] = useState<"monthly" | "all">("monthly");

	return (
		<Layout currentView={currentView} setCurrentView={setCurrentView}>
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
	);
};
