import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import useAppStore from "@/stores/useAppStore";
import { useExpenseStore } from "@/stores/useExpenseStore";
import type { Expense } from "@/types/expense";
import { ExpenseFormPage } from "./ExpenseFormPage";

interface FormArgs {
	expense_id: string | null;
	is_global_edit: boolean;
}

export const ExpenseFormWindowRoot: React.FC = () => {
	const { loadFromFile } = useAppStore();
	const isAppLoading = useAppStore((s) => s.isLoading);
	const expenses = useExpenseStore((s) => s.expenses);

	const [formArgs, setFormArgs] = useState<FormArgs | null>(null);
	const [dataLoaded, setDataLoaded] = useState(false);
	const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Step 1: Load app data from the database (read-only for form context)
	useEffect(() => {
		let cancelled = false;
		loadFromFile()
			.then(() => {
				if (!cancelled) setDataLoaded(true);
			})
			.catch((err) => {
				if (!cancelled) {
					console.error("Failed to load data in form window:", err);
					setError(`Failed to load data: ${err}`);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// Step 2: Once data is loaded, fetch the form args from Rust managed state
	useEffect(() => {
		if (!dataLoaded || isAppLoading) return;

		invoke<FormArgs | null>("get_expense_form_args")
			.then((args) => {
				setFormArgs(args ?? { expense_id: null, is_global_edit: false });
			})
			.catch((err) => {
				console.error("Failed to get form args:", err);
				setError(`Failed to get form args: ${err}`);
				setFormArgs({ expense_id: null, is_global_edit: false });
			});
	}, [dataLoaded, isAppLoading]);

	// Step 3: Resolve the editing expense
	useEffect(() => {
		if (!formArgs || !dataLoaded || isAppLoading) return;

		if (formArgs.expense_id) {
			const found = expenses.find((e) => e.id === formArgs.expense_id);
			if (found) {
				setEditingExpense(found);
			} else {
				console.warn(`Expense "${formArgs.expense_id}" not found. Opening as new.`);
				setEditingExpense(null);
			}
		} else {
			setEditingExpense(null);
		}
	}, [formArgs, dataLoaded, isAppLoading, expenses]);

	if (error) {
		return (
			<div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-4">
				<p className="text-sm text-destructive">{error}</p>
				<button
					type="button"
					onClick={() => {
						invoke("close_expense_form_window").catch(() => {
							window.close();
						});
					}}
					className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm"
				>
					Close
				</button>
			</div>
		);
	}

	if (!dataLoaded || isAppLoading) {
		return (
			<div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
				<p className="text-sm text-muted-foreground">Loading data…</p>
			</div>
		);
	}

	if (!formArgs) {
		return (
			<div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
				<p className="text-sm text-muted-foreground">Initialising form…</p>
			</div>
		);
	}

	return (
		<ExpenseFormPage editingExpense={editingExpense} isGlobalEdit={formArgs.is_global_edit} />
	);
};
