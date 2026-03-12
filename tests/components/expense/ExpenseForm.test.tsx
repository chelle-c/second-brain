import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { ExpenseForm } from "@/apps/Finances/expenses/components/ExpenseForm";
import type { Expense } from "@/types/expense";

describe("ExpenseForm (window launcher)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the floating + button when no editingExpense", () => {
		render(<ExpenseForm />);
		expect(screen.getByText("Add Expense")).toBeInTheDocument();
	});

	it("invokes open_expense_form_window with null id when + is clicked", async () => {
		const user = userEvent.setup();
		render(<ExpenseForm />);

		await user.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(invoke).toHaveBeenCalledWith("open_expense_form_window", {
				args: { expense_id: null, is_global_edit: false },
			});
		});
	});

	it("invokes open_expense_form_window automatically when editingExpense is set", async () => {
		const expense = { id: "abc-123", parentExpenseId: undefined } as Expense;
		render(<ExpenseForm editingExpense={expense} isGlobalEdit />);

		await waitFor(() => {
			expect(invoke).toHaveBeenCalledWith("open_expense_form_window", {
				args: { expense_id: "abc-123", is_global_edit: true },
			});
		});
	});

	it("renders nothing visible when editingExpense is set (window is external)", () => {
		const expense = { id: "abc-123" } as Expense;
		const { container } = render(<ExpenseForm editingExpense={expense} />);
		expect(container).toBeEmptyDOMElement();
	});

	it("does not re-invoke for the same expense id", async () => {
		const expense = { id: "abc-123" } as Expense;
		const { rerender } = render(<ExpenseForm editingExpense={expense} />);

		await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1));

		rerender(<ExpenseForm editingExpense={{ ...expense }} />);
		// Give effects a tick
		await new Promise((r) => setTimeout(r, 10));

		expect(invoke).toHaveBeenCalledTimes(1);
	});
});
