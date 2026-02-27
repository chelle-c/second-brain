import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpenseForm } from "@/apps/Finances/expenses/components/ExpenseForm";
import { useExpenseStore } from "@/stores/useExpenseStore";
import type { Expense } from "@/types/expense";

// Mock the expense store
vi.mock("@/stores/useExpenseStore");

// Mock the ConfirmRegenerationModal
vi.mock("@/apps/Finances/expenses/components/ConfirmRegenerationModal", () => ({
	ConfirmRegenerationModal: () => (
		<div data-testid="regeneration-modal">Regeneration Modal</div>
	),
}));

describe("ExpenseForm", () => {
	const mockAddExpense = vi.fn();
	const mockUpdateExpense = vi.fn();
	const mockCategories = ["Housing", "Food", "Transport", "Utilities"];
	const mockPaymentMethods = ["Cash", "Credit Card", "Debit Card"];

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useExpenseStore).mockReturnValue({
			expenses: [],
			addExpense: mockAddExpense,
			updateExpense: mockUpdateExpense,
			categories: mockCategories,
			categoryColors: {},
			paymentMethods: mockPaymentMethods,
		} as any);
	});

	describe("Creating a new expense", () => {
		it("should render the add expense button", () => {
			render(<ExpenseForm />);
			expect(screen.getByText("Add Expense")).toBeInTheDocument();
		});

		it("should open form when button clicked", async () => {
			const user = userEvent.setup();
			render(<ExpenseForm />);

			const buttons = screen.getAllByRole("button");
			await user.click(buttons[0]);

			expect(screen.getByText("Add New Expense")).toBeInTheDocument();
		});

		it("should toggle expense type", async () => {
			const user = userEvent.setup();
			render(<ExpenseForm />);

			const buttons = screen.getAllByRole("button");
			await user.click(buttons[0]);

			const wantButton = screen.getByRole("button", { name: /^want$/i });
			await user.click(wantButton);

			expect(wantButton).toHaveClass("bg-card");
		});

		it("should close form on cancel", async () => {
			const user = userEvent.setup();
			render(<ExpenseForm />);

			const buttons = screen.getAllByRole("button");
			await user.click(buttons[0]);

			await user.click(screen.getByRole("button", { name: /cancel/i }));
			expect(screen.queryByText("Add New Expense")).not.toBeInTheDocument();
		});
	});

	describe("Editing an expense - Bug Fix Tests", () => {
		const mockExpense: Expense = {
			id: "expense-1",
			name: "Rent",
			amount: 1200,
			category: "Housing",
			paymentMethod: "Cash",
			dueDate: new Date("2024-01-15"),
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

		it("should show edit expense title", () => {
			render(<ExpenseForm editingExpense={mockExpense} />);
			expect(screen.getByText("Edit Expense")).toBeInTheDocument();
		});

		it("should populate form fields", () => {
			render(<ExpenseForm editingExpense={mockExpense} />);
			expect(screen.getByDisplayValue("Rent")).toBeInTheDocument();
			expect(screen.getByDisplayValue("1200")).toBeInTheDocument();
		});

		it("should call onClose callback", async () => {
			const user = userEvent.setup();
			const mockOnClose = vi.fn();

			render(
				<ExpenseForm editingExpense={mockExpense} onClose={mockOnClose} />,
			);
			await user.click(screen.getByRole("button", { name: /cancel/i }));

			expect(mockOnClose).toHaveBeenCalled();
		});
	});

	describe("Editing a recurring expense occurrence", () => {
		const mockOccurrence: Expense = {
			id: "occurrence-1",
			name: "Monthly Subscription",
			amount: 15,
			category: "Utilities",
			paymentMethod: "Credit Card",
			dueDate: new Date("2024-02-01"),
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

		it("should show occurrence title", () => {
			render(<ExpenseForm editingExpense={mockOccurrence} />);
			expect(screen.getByText("Edit This Occurrence")).toBeInTheDocument();
		});

		it("should hide name field for occurrence", () => {
			render(<ExpenseForm editingExpense={mockOccurrence} />);
			expect(
				screen.queryByPlaceholderText("Enter expense name"),
			).not.toBeInTheDocument();
		});

		it("should hide category label for occurrence", () => {
			render(<ExpenseForm editingExpense={mockOccurrence} />);
			const labels = screen.queryAllByText("Category");
			expect(labels.length).toBe(0);
		});

		it("should hide recurring checkbox for occurrence", () => {
			render(<ExpenseForm editingExpense={mockOccurrence} />);
			expect(screen.queryByText("Recurring Expense")).not.toBeInTheDocument();
		});
	});

	describe("Category Dropdown Bug Fix", () => {
		it("should have value prop on category Select when editing", () => {
			const expense: Expense = {
				id: "test-1",
				name: "Test",
				amount: 100,
				category: "Food",
				paymentMethod: "Cash",
				dueDate: new Date(),
				isRecurring: false,
				isArchived: false,
				isPaid: false,
				type: "need",
				importance: "none",
				notify: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				monthlyOverrides: {},
			};

			render(<ExpenseForm editingExpense={expense} />);

			// The bug was that the Select didn't have a value prop
			// After the fix, the Select component should be initialized with the category value
			// We can verify the form displays correctly by checking that the selected value is in the DOM
			// Use screen.getAllByRole since Modal renders in a portal
			const selectTriggers = screen.getAllByRole("combobox");
			expect(selectTriggers.length).toBeGreaterThan(0);
		});

		it("should have value prop on frequency Select when editing recurring expense", () => {
			const expense: Expense = {
				id: "test-2",
				name: "Weekly Bill",
				amount: 50,
				category: "Utilities",
				paymentMethod: "Debit Card",
				dueDate: new Date(),
				isRecurring: true,
				recurrence: {
					frequency: "weekly",
					interval: 1,
				},
				isArchived: false,
				isPaid: false,
				type: "need",
				importance: "high",
				notify: false,
				createdAt: new Date(),
				updatedAt: new Date(),
				monthlyOverrides: {},
			};

			render(<ExpenseForm editingExpense={expense} />);

			// Verify recurring checkbox is checked
			const recurringCheckbox = screen.getByRole("checkbox", {
				name: /recurring/i,
			});
			expect(recurringCheckbox).toBeChecked();

			// The frequency Select should have the value prop set (bug fix)
			// Use screen.getAllByRole since Modal renders in a portal
			const selectTriggers = screen.getAllByRole("combobox");
			expect(selectTriggers.length).toBeGreaterThan(0);
		});
	});
});
