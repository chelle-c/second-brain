import { useEffect, useState } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useHistoryStore } from "@/stores/useHistoryStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useExpenseFormListener } from "@/hooks/useExpenseFormBridge";
import { AllExpenses } from "./components/AllExpenses";
import { ExpenseForm } from "./components/ExpenseForm";
import { ExpenseList } from "./components/ExpenseList";
import { ExpenseOverview } from "./components/ExpenseOverview";
import { Layout } from "./components/Layout";
import { UpcomingExpenses } from "./components/UpcomingExpenses";

export const ExpensesTracker = () => {
	const { expenseDefaultView } = useSettingsStore();
	const [currentView, setCurrentView] = useState<"monthly" | "all" | "upcoming">(
		expenseDefaultView,
	);

	const { editingExpense, setEditingExpense, undo, redo } = useExpenseStore();
	const { canUndo, canRedo } = useHistoryStore();

	useExpenseFormListener();

	const handleCloseEdit = () => {
		setEditingExpense(null);
	};

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
			const modKey = isMac ? e.metaKey : e.ctrlKey;

			if (modKey && e.key === "z" && !e.shiftKey && canUndo) {
				e.preventDefault();
				undo();
			}

			if ((modKey && e.shiftKey && e.key === "z") || (modKey && e.key === "y")) {
				if (canRedo) {
					e.preventDefault();
					redo();
				}
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [canUndo, canRedo, undo, redo]);

	return (
		<ErrorBoundary appName="Expenses">
			<Layout
				currentView={currentView}
				setCurrentView={setCurrentView}
				canUndo={canUndo}
				canRedo={canRedo}
				onUndo={undo}
				onRedo={redo}
			>
				<div className="space-y-3">
					{currentView === "monthly" ?
						<div className="bg-card rounded-xl shadow-lg p-4 sm:p-6 animate-fadeIn">
							<ExpenseOverview />
							<div className="mt-6 mb-4 border-t border-border"></div>
							<ExpenseList />
						</div>
					: currentView === "upcoming" ?
						<UpcomingExpenses />
					:	<AllExpenses />}
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
		</ErrorBoundary>
	);
};
