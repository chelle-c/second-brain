import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ExpenseList } from "@/apps/Finances/expenses/components/ExpenseList";
import { useExpenseStore } from "@/stores/useExpenseStore";
import type { Expense } from "@/types/expense";

// Mock the expense store
vi.mock("@/stores/useExpenseStore");

// Mock child components to simplify testing
vi.mock("@/apps/Finances/expenses/components/ExpenseTable", () => ({
	ExpenseTable: ({ expensesToDisplay }: any) => (
		<div data-testid="expense-table">
			{expensesToDisplay.map((expense: Expense) => (
				<div key={expense.id} data-testid={`expense-${expense.id}`}>
					{expense.name}
				</div>
			))}
		</div>
	),
}));

vi.mock("@/apps/Finances/expenses/components/DeleteModal", () => ({
	DeleteModal: () => <div data-testid="delete-modal">Delete Modal</div>,
}));

describe("ExpenseList", () => {
	const mockExpenses: Expense[] = [
		{
			id: "1",
			name: "Rent",
			amount: 1200,
			category: "Housing",
			paymentMethod: "Bank Transfer",
			dueDate: new Date("2024-01-15"),
			isRecurring: true,
			isArchived: false,
			isPaid: false,
			type: "need",
			importance: "critical",
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-01-01"),
			monthlyOverrides: {},
		},
		{
			id: "2",
			name: "Coffee",
			amount: 5.5,
			category: "Food",
			paymentMethod: "Cash",
			dueDate: new Date("2024-01-10"),
			isRecurring: false,
			isArchived: false,
			isPaid: true,
			paymentDate: new Date("2024-01-10"),
			type: "want",
			importance: "none",
			createdAt: new Date("2024-01-05"),
			updatedAt: new Date("2024-01-05"),
			monthlyOverrides: {},
		},
		{
			id: "3",
			name: "Groceries",
			amount: 300,
			category: "Food",
			paymentMethod: "Credit Card",
			dueDate: new Date("2024-01-20"),
			isRecurring: false,
			isArchived: false,
			isPaid: false,
			type: "need",
			importance: "high",
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-01-01"),
			monthlyOverrides: {},
		},
	];

	const mockGetMonthlyExpenses = vi.fn();
	const mockDeleteExpense = vi.fn();
	const mockToggleExpensePaid = vi.fn();
	const mockSetEditingExpense = vi.fn();
	const mockSetDeleteModal = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		mockGetMonthlyExpenses.mockReturnValue(mockExpenses);

		vi.mocked(useExpenseStore).mockReturnValue({
			selectedMonth: new Date("2024-01-15"),
			getMonthlyExpenses: mockGetMonthlyExpenses,
			deleteExpense: mockDeleteExpense,
			toggleExpensePaid: mockToggleExpensePaid,
			expenses: mockExpenses,
			categoryColors: { Housing: "#3b82f6", Food: "#10b981" },
			overviewMode: "all",
			editingExpense: null,
			setEditingExpense: mockSetEditingExpense,
			deleteModal: { isOpen: false, id: "", name: "" },
			setDeleteModal: mockSetDeleteModal,
			showPaidExpenses: true,
		} as any);
	});

	it("should render the expense list title", () => {
		render(<ExpenseList />);
		expect(screen.getByText(/Monthly Expenses/i)).toBeInTheDocument();
	});

	it('should display all expenses when overviewMode is "all"', () => {
		render(<ExpenseList />);

		expect(screen.getByTestId("expense-table")).toBeInTheDocument();
		expect(screen.getByText("Rent")).toBeInTheDocument();
		expect(screen.getByText("Coffee")).toBeInTheDocument();
		expect(screen.getByText("Groceries")).toBeInTheDocument();
	});

	it('should filter to only unpaid expenses when overviewMode is "remaining"', () => {
		vi.mocked(useExpenseStore).mockReturnValue({
			selectedMonth: new Date("2024-01-15"),
			getMonthlyExpenses: mockGetMonthlyExpenses,
			deleteExpense: mockDeleteExpense,
			toggleExpensePaid: mockToggleExpensePaid,
			expenses: mockExpenses,
			categoryColors: { Housing: "#3b82f6", Food: "#10b981" },
			overviewMode: "remaining",
			editingExpense: null,
			setEditingExpense: mockSetEditingExpense,
			deleteModal: { isOpen: false, id: "", name: "" },
			setDeleteModal: mockSetDeleteModal,
			showPaidExpenses: true,
		} as any);

		render(<ExpenseList />);

		// Should show unpaid expenses
		expect(screen.getByText("Rent")).toBeInTheDocument();
		expect(screen.getByText("Groceries")).toBeInTheDocument();
		// Should not show paid expense
		expect(screen.queryByText("Coffee")).not.toBeInTheDocument();
	});

	it('should filter to only "need" type expenses when overviewMode is "required"', () => {
		vi.mocked(useExpenseStore).mockReturnValue({
			selectedMonth: new Date("2024-01-15"),
			getMonthlyExpenses: mockGetMonthlyExpenses,
			deleteExpense: mockDeleteExpense,
			toggleExpensePaid: mockToggleExpensePaid,
			expenses: mockExpenses,
			categoryColors: { Housing: "#3b82f6", Food: "#10b981" },
			overviewMode: "required",
			editingExpense: null,
			setEditingExpense: mockSetEditingExpense,
			deleteModal: { isOpen: false, id: "", name: "" },
			setDeleteModal: mockSetDeleteModal,
			showPaidExpenses: true,
		} as any);

		render(<ExpenseList />);

		// Should show "need" type expenses
		expect(screen.getByText("Rent")).toBeInTheDocument();
		expect(screen.getByText("Groceries")).toBeInTheDocument();
		// Should not show "want" type expense
		expect(screen.queryByText("Coffee")).not.toBeInTheDocument();
	});

	it("should show empty state when no expenses match the filter", () => {
		mockGetMonthlyExpenses.mockReturnValue([]);

		render(<ExpenseList />);

		expect(screen.getByText(/No expenses for this month/i)).toBeInTheDocument();
		expect(
			screen.getByText(/Click the \+ button to add your first expense/i),
		).toBeInTheDocument();
	});

	it('should show "All expenses are paid!" message in remaining mode when all are paid', () => {
		const allPaidExpenses = mockExpenses.map((e) => ({ ...e, isPaid: true }));
		mockGetMonthlyExpenses.mockReturnValue(allPaidExpenses);

		vi.mocked(useExpenseStore).mockReturnValue({
			selectedMonth: new Date("2024-01-15"),
			getMonthlyExpenses: mockGetMonthlyExpenses,
			deleteExpense: mockDeleteExpense,
			toggleExpensePaid: mockToggleExpensePaid,
			expenses: allPaidExpenses,
			categoryColors: { Housing: "#3b82f6", Food: "#10b981" },
			overviewMode: "remaining",
			editingExpense: null,
			setEditingExpense: mockSetEditingExpense,
			deleteModal: { isOpen: false, id: "", name: "" },
			setDeleteModal: mockSetDeleteModal,
			showPaidExpenses: true,
		} as any);

		render(<ExpenseList />);

		expect(screen.getByText("All expenses are paid!")).toBeInTheDocument();
	});

	it("should return null when selectedMonth is not set", () => {
		vi.mocked(useExpenseStore).mockReturnValue({
			selectedMonth: null,
			getMonthlyExpenses: mockGetMonthlyExpenses,
			deleteExpense: mockDeleteExpense,
			toggleExpensePaid: mockToggleExpensePaid,
			expenses: mockExpenses,
			categoryColors: {},
			overviewMode: "all",
			editingExpense: null,
			setEditingExpense: mockSetEditingExpense,
			deleteModal: { isOpen: false, id: "", name: "" },
			setDeleteModal: mockSetDeleteModal,
			showPaidExpenses: true,
		} as any);

		const { container } = render(<ExpenseList />);
		expect(container.firstChild).toBeNull();
	});
});
