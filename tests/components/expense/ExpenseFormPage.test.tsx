import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { ExpenseFormPage } from "@/apps/Finances/expenses/components/ExpenseFormPage";
import { useExpenseStore } from "@/stores/useExpenseStore";
import * as bridge from "@/hooks/useExpenseFormBridge";
import type { Expense } from "@/types/expense";

vi.mock("@/stores/useExpenseStore");
vi.mock("@/hooks/useExpenseFormBridge", async (importActual) => {
	const actual = await importActual<typeof bridge>();
	return {
		...actual,
		submitExpenseForm: vi.fn().mockResolvedValue(undefined),
		cancelExpenseForm: vi.fn().mockResolvedValue(undefined),
	};
});

vi.mock("@/components/ConfirmRegenerationModal", () => ({
	ConfirmRegenerationModal: ({ isOpen, onConfirm, onCancel }: any) =>
		isOpen ?
			<div data-testid="regeneration-modal">
				<button onClick={onConfirm}>Confirm</button>
				<button onClick={onCancel}>Cancel Regen</button>
			</div>
		:	null,
}));

// ── Store mock helper ────────────────────────────────────────────────────
// ExpenseFormPage uses selector-style: useExpenseStore((s) => s.categories)
// so a plain mockReturnValue won't work. We need to feed selectors a state object.

const mockStoreState = {
	expenses: [] as Expense[],
	categories: ["Housing", "Food", "Transport", "Utilities"],
	categoryColors: {
		Housing: "#3b82f6",
		Food: "#10b981",
		Transport: "#f59e0b",
		Utilities: "#8b5cf6",
	},
	paymentMethods: ["Cash", "Credit Card", "Debit Card"],
};

function mockStore(overrides: Partial<typeof mockStoreState> = {}) {
	const state = { ...mockStoreState, ...overrides };
	vi.mocked(useExpenseStore).mockImplementation((selector?: any) =>
		selector ? selector(state) : state,
	);
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe("ExpenseFormPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStore();
	});

	describe("Creating a new expense", () => {
		it("renders the 'Add New Expense' title", () => {
			render(<ExpenseFormPage />);
			expect(screen.getByText("Add New Expense")).toBeInTheDocument();
		});

		it("toggles expense type between need and want", async () => {
			const user = userEvent.setup();
			render(<ExpenseFormPage />);

			const wantButton = screen.getByRole("button", { name: /^want$/i });
			await user.click(wantButton);

			expect(wantButton).toHaveClass("bg-card");
		});

		it("switches amount type and carries the value over", async () => {
			const user = userEvent.setup();
			render(<ExpenseFormPage />);

			// Enter an exact amount
			const exactInput = screen.getByPlaceholderText("0.00");
			await user.clear(exactInput);
			await user.type(exactInput, "50");

			// Switch to range
			await user.click(screen.getByRole("button", { name: /^range$/i }));

			// Min should carry the 50, max should be 51
			expect(screen.getByPlaceholderText("Min")).toHaveValue(50);
			expect(screen.getByPlaceholderText("Max")).toHaveValue(51);
		});

		it("emits submit event with form data on save", async () => {
			const user = userEvent.setup();
			render(<ExpenseFormPage />);

			await user.type(screen.getByPlaceholderText("Enter expense name"), "Coffee");
			const amountInput = screen.getByPlaceholderText("0.00");
			await user.clear(amountInput);
			await user.type(amountInput, "4.50");

			await user.click(screen.getByRole("button", { name: /add expense/i }));

			await waitFor(() => {
				expect(bridge.submitExpenseForm).toHaveBeenCalledWith(
					expect.objectContaining({
						formData: expect.objectContaining({
							name: "Coffee",
							amount: 4.5,
						}),
						expenseId: undefined,
						isGlobalEdit: false,
						isInstanceEdit: false,
					}),
				);
			});
		});

		it("invokes close_expense_form_window on cancel", async () => {
			const user = userEvent.setup();
			render(<ExpenseFormPage />);

			await user.click(screen.getByRole("button", { name: /^cancel$/i }));

			await waitFor(() => {
				expect(bridge.cancelExpenseForm).toHaveBeenCalled();
				expect(invoke).toHaveBeenCalledWith("close_expense_form_window");
			});
		});
	});

	describe("Editing an existing expense", () => {
		const mockExpense: Expense = {
			id: "expense-1",
			name: "Rent",
			amount: 1200,
			amountData: { type: "exact", exact: 1200 },
			category: "Housing",
			paymentMethod: "Cash",
			dueDate: new Date("2024-01-15T12:00:00"),
			isRecurring: false,
			isArchived: false,
			isPaid: false,
			type: "need",
			importance: "critical",
			notify: false,
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-01-01"),
			monthlyOverrides: {},
		};

		it("shows the 'Edit Expense' title", () => {
			render(<ExpenseFormPage editingExpense={mockExpense} />);
			expect(screen.getByText("Edit Expense")).toBeInTheDocument();
		});

		it("populates name and amount fields", () => {
			render(<ExpenseFormPage editingExpense={mockExpense} />);
			expect(screen.getByDisplayValue("Rent")).toBeInTheDocument();
			expect(screen.getByDisplayValue("1200")).toBeInTheDocument();
		});

		it("submits with expenseId on update", async () => {
			const user = userEvent.setup();
			render(<ExpenseFormPage editingExpense={mockExpense} isGlobalEdit />);

			await user.click(screen.getByRole("button", { name: /update expense/i }));

			await waitFor(() => {
				expect(bridge.submitExpenseForm).toHaveBeenCalledWith(
					expect.objectContaining({
						expenseId: "expense-1",
						isGlobalEdit: true,
						isInstanceEdit: false,
					}),
				);
			});
		});
	});

	describe("Editing a recurring occurrence", () => {
		const mockOccurrence: Expense = {
			id: "occurrence-1",
			name: "Monthly Subscription",
			amount: 15,
			amountData: { type: "exact", exact: 15 },
			category: "Utilities",
			paymentMethod: "Credit Card",
			dueDate: new Date("2024-02-01T12:00:00"),
			isRecurring: true,
			isArchived: false,
			isPaid: false,
			type: "want",
			importance: "medium",
			notify: false,
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-02-01"),
			parentExpenseId: "parent-1",
			monthlyOverrides: {},
		};

		it("shows the occurrence-specific title", () => {
			render(<ExpenseFormPage editingExpense={mockOccurrence} />);
			expect(screen.getByText("Edit This Occurrence")).toBeInTheDocument();
		});

		it("hides the name, category, and recurrence fields", () => {
			render(<ExpenseFormPage editingExpense={mockOccurrence} />);

			expect(screen.queryByPlaceholderText("Enter expense name")).not.toBeInTheDocument();
			expect(screen.queryByLabelText("Category")).not.toBeInTheDocument();
			expect(screen.queryByText("Recurring Expense")).not.toBeInTheDocument();
		});

		it("sets isInstanceEdit flag on submit", async () => {
			const user = userEvent.setup();
			render(<ExpenseFormPage editingExpense={mockOccurrence} />);

			await user.click(screen.getByRole("button", { name: /update expense/i }));

			await waitFor(() => {
				expect(bridge.submitExpenseForm).toHaveBeenCalledWith(
					expect.objectContaining({ isInstanceEdit: true }),
				);
			});
		});
	});

	describe("Regeneration warning", () => {
		const recurringParent: Expense = {
			id: "parent-1",
			name: "Subscription",
			amount: 10,
			amountData: { type: "exact", exact: 10 },
			category: "Utilities",
			paymentMethod: "Credit Card",
			dueDate: new Date("2024-01-01T12:00:00"),
			isRecurring: true,
			recurrence: { frequency: "monthly", interval: 1, occurrences: 12 },
			isArchived: false,
			isPaid: false,
			type: "need",
			importance: "none",
			notify: false,
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-01-01"),
			monthlyOverrides: {},
		};

		it("shows regeneration modal when due date changes on parent", async () => {
			mockStore({
				expenses: [
					recurringParent,
					{
						...recurringParent,
						id: "child-1",
						parentExpenseId: "parent-1",
						isModified: true,
					},
				],
			});

			const user = userEvent.setup();
			render(<ExpenseFormPage editingExpense={recurringParent} isGlobalEdit />);

			// Change the due date
			const dateInput = screen.getByLabelText(/due date/i);
			await user.clear(dateInput);
			await user.type(dateInput, "2024-06-15");

			await user.click(screen.getByRole("button", { name: /update expense/i }));

			expect(screen.getByTestId("regeneration-modal")).toBeInTheDocument();

			// Confirm should proceed with submit
			await user.click(screen.getByRole("button", { name: /^confirm$/i }));
			await waitFor(() => {
				expect(bridge.submitExpenseForm).toHaveBeenCalled();
			});
		});
	});
});
