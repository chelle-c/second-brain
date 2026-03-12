import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { emit } from "@tauri-apps/api/event";
import * as tauriEvent from "@tauri-apps/api/event";
import {
	useExpenseFormListener,
	submitExpenseForm,
	cancelExpenseForm,
	EXPENSE_FORM_SUBMIT_EVENT,
	EXPENSE_FORM_CANCEL_EVENT,
	EXPENSE_FORM_CLOSED_EVENT,
} from "@/hooks/useExpenseFormBridge";
import { useExpenseStore } from "@/stores/useExpenseStore";

vi.mock("@/stores/useExpenseStore");

// The mock setup file added __fireEvent / __clearListeners to the event module
const { __fireEvent, __clearListeners } = tauriEvent as typeof tauriEvent & {
	__fireEvent: (event: string, payload: unknown) => void;
	__clearListeners: () => void;
};

describe("useExpenseFormBridge", () => {
	const mockAddExpense = vi.fn();
	const mockUpdateExpense = vi.fn();
	const mockSetEditingExpense = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		__clearListeners();

		vi.mocked(useExpenseStore).mockImplementation((selector: any) => {
			const state = {
				addExpense: mockAddExpense,
				updateExpense: mockUpdateExpense,
				setEditingExpense: mockSetEditingExpense,
			};
			return selector(state);
		});
	});

	describe("emitters", () => {
		it("submitExpenseForm emits the correct event + payload", async () => {
			const payload = {
				formData: { name: "Test" } as any,
				expenseId: "id-1",
				isGlobalEdit: false,
				isInstanceEdit: false,
			};
			await submitExpenseForm(payload);

			expect(emit).toHaveBeenCalledWith(EXPENSE_FORM_SUBMIT_EVENT, payload);
		});

		it("cancelExpenseForm emits cancel event", async () => {
			await cancelExpenseForm();
			expect(emit).toHaveBeenCalledWith(EXPENSE_FORM_CANCEL_EVENT, {});
		});
	});

	describe("listener", () => {
		it("calls addExpense when submit arrives with no expenseId", async () => {
			renderHook(() => useExpenseFormListener());

			// Wait for listener registration (listen is async)
			await waitFor(() => expect(tauriEvent.listen).toHaveBeenCalled());

			__fireEvent(EXPENSE_FORM_SUBMIT_EVENT, {
				formData: {
					name: "New Expense",
					dueDate: "2024-01-15T12:00:00.000Z",
					paymentDate: null,
				},
				expenseId: undefined,
				isGlobalEdit: false,
				isInstanceEdit: false,
			});

			expect(mockAddExpense).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "New Expense",
					dueDate: expect.any(Date), // rehydrated from string
				}),
			);
			expect(mockSetEditingExpense).toHaveBeenCalledWith(null);
		});

		it("calls updateExpense with global flag when isGlobalEdit is true", async () => {
			renderHook(() => useExpenseFormListener());
			await waitFor(() => expect(tauriEvent.listen).toHaveBeenCalled());

			__fireEvent(EXPENSE_FORM_SUBMIT_EVENT, {
				formData: { name: "Updated", dueDate: null, paymentDate: null },
				expenseId: "exp-1",
				isGlobalEdit: true,
				isInstanceEdit: false,
			});

			expect(mockUpdateExpense).toHaveBeenCalledWith(
				"exp-1",
				expect.any(Object),
				true, // ← global flag
			);
		});

		it("clears editingExpense when window closed event arrives", async () => {
			renderHook(() => useExpenseFormListener());
			await waitFor(() => expect(tauriEvent.listen).toHaveBeenCalled());

			__fireEvent(EXPENSE_FORM_CLOSED_EVENT, {});

			expect(mockSetEditingExpense).toHaveBeenCalledWith(null);
		});

		it("debounces rapid duplicate submits (< 500ms)", async () => {
			vi.useFakeTimers();
			renderHook(() => useExpenseFormListener());
			await vi.waitFor(() => expect(tauriEvent.listen).toHaveBeenCalled());

			const payload = {
				formData: { name: "X", dueDate: null, paymentDate: null },
				expenseId: undefined,
				isGlobalEdit: false,
				isInstanceEdit: false,
			};

			__fireEvent(EXPENSE_FORM_SUBMIT_EVENT, payload);
			__fireEvent(EXPENSE_FORM_SUBMIT_EVENT, payload); // within 500ms

			expect(mockAddExpense).toHaveBeenCalledTimes(1);
			vi.useRealTimers();
		});
	});
});
