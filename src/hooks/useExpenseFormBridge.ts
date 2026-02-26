import { emit, listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { useExpenseStore } from "@/stores/useExpenseStore";
import type { ExpenseFormData } from "@/types/expense";

export const EXPENSE_FORM_SUBMIT_EVENT = "expense-form-submit";
export const EXPENSE_FORM_CANCEL_EVENT = "expense-form-cancel";
export const EXPENSE_FORM_CLOSED_EVENT = "expense-form-closed";

export interface ExpenseFormSubmitPayload {
	formData: ExpenseFormData;
	expenseId?: string;
	isGlobalEdit: boolean;
	isInstanceEdit: boolean;
}

/**
 * Call this once in the main window (ExpensesTracker) to receive
 * form submissions from the expense-form window.
 */
export function useExpenseFormListener() {
	const addExpense = useExpenseStore((s) => s.addExpense);
	const updateExpense = useExpenseStore((s) => s.updateExpense);
	const setEditingExpense = useExpenseStore((s) => s.setEditingExpense);

	const lastProcessedTimestamp = useRef(0);

	useEffect(() => {
		let unlistenSubmit: (() => void) | undefined;
		let unlistenCancel: (() => void) | undefined;
		let unlistenClosed: (() => void) | undefined;
		let mounted = true;

		const setup = async () => {
			unlistenSubmit = await listen<ExpenseFormSubmitPayload>(
				EXPENSE_FORM_SUBMIT_EVENT,
				(event) => {
					if (!mounted) return;

					const now = Date.now();
					if (now - lastProcessedTimestamp.current < 500) return;
					lastProcessedTimestamp.current = now;

					const { formData, expenseId, isGlobalEdit, isInstanceEdit } = event.payload;

					// Rehydrate Date objects from JSON strings
					const rehydrated: ExpenseFormData = {
						...formData,
						dueDate:
							formData.dueDate ?
								new Date(formData.dueDate as unknown as string)
							:	null,
						paymentDate:
							formData.paymentDate ?
								new Date(formData.paymentDate as unknown as string)
							:	null,
						recurrence:
							formData.recurrence ?
								{
									...formData.recurrence,
									endDate:
										formData.recurrence.endDate ?
											new Date(
												formData.recurrence.endDate as unknown as string,
											)
										:	undefined,
								}
							:	undefined,
					};

					if (expenseId) {
						if (isInstanceEdit) {
							updateExpense(expenseId, rehydrated, false);
						} else {
							updateExpense(expenseId, rehydrated, isGlobalEdit);
						}
					} else {
						addExpense(rehydrated);
					}

					setEditingExpense(null);
				},
			);

			// Cancel button was clicked in the form window
			unlistenCancel = await listen(EXPENSE_FORM_CANCEL_EVENT, () => {
				if (!mounted) return;
				setEditingExpense(null);
			});

			// OS X button closed the form window — emitted by Rust on_window_event
			unlistenClosed = await listen(EXPENSE_FORM_CLOSED_EVENT, () => {
				if (!mounted) return;
				setEditingExpense(null);
			});
		};

		setup();

		return () => {
			mounted = false;
			unlistenSubmit?.();
			unlistenCancel?.();
			unlistenClosed?.();
		};
	}, [addExpense, updateExpense, setEditingExpense]);
}

export async function submitExpenseForm(payload: ExpenseFormSubmitPayload): Promise<void> {
	await emit(EXPENSE_FORM_SUBMIT_EVENT, payload);
}

export async function cancelExpenseForm(): Promise<void> {
	await emit(EXPENSE_FORM_CANCEL_EVENT, {});
}
