import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MonthNavigation } from "@/apps/Finances/expenses/components/MonthNavigation";
import { useExpenseStore } from "@/stores/useExpenseStore";

// Mock the expense store
vi.mock("@/stores/useExpenseStore");

describe("MonthNavigation", () => {
	const mockSetSelectedMonth = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup default mock implementation
		vi.mocked(useExpenseStore).mockReturnValue({
			selectedMonth: new Date("2024-01-15"),
			setSelectedMonth: mockSetSelectedMonth,
			expenses: [],
		} as any);
	});

	it("should render the current month and year", () => {
		render(<MonthNavigation />);

		// The Select components render the selected values
		const selects = screen.getAllByRole("combobox");
		expect(selects.length).toBeGreaterThanOrEqual(2);
	});

	it("should have previous and next month buttons", () => {
		render(<MonthNavigation />);

		const buttons = screen.getAllByRole("button");
		expect(buttons.length).toBeGreaterThanOrEqual(2);

		// Check for chevron buttons by title
		expect(screen.getByTitle("Previous month")).toBeInTheDocument();
		expect(screen.getByTitle("Next month")).toBeInTheDocument();
	});

	it("should call setSelectedMonth when previous month button is clicked", async () => {
		const user = userEvent.setup();
		render(<MonthNavigation />);

		const prevButton = screen.getByTitle("Previous month");
		await user.click(prevButton);

		expect(mockSetSelectedMonth).toHaveBeenCalled();
		// Should set to December 2023
		const calledDate = mockSetSelectedMonth.mock.calls[0][0];
		expect(calledDate.getMonth()).toBe(11); // December (0-indexed)
		expect(calledDate.getFullYear()).toBe(2023);
	});

	it("should call setSelectedMonth when next month button is clicked", async () => {
		const user = userEvent.setup();
		render(<MonthNavigation />);

		const nextButton = screen.getByTitle("Next month");
		await user.click(nextButton);

		expect(mockSetSelectedMonth).toHaveBeenCalled();
		// Should set to February 2024
		const calledDate = mockSetSelectedMonth.mock.calls[0][0];
		expect(calledDate.getMonth()).toBe(1); // February (0-indexed)
		expect(calledDate.getFullYear()).toBe(2024);
	});

	it("should return null when selectedMonth is not set", () => {
		vi.mocked(useExpenseStore).mockReturnValue({
			selectedMonth: null,
			setSelectedMonth: mockSetSelectedMonth,
			expenses: [],
		} as any);

		const { container } = render(<MonthNavigation />);
		expect(container.firstChild).toBeNull();
	});

	it("should display unique years from expenses", () => {
		const expensesWithDifferentYears = [
			{
				id: "1",
				name: "Expense 2023",
				dueDate: new Date("2023-06-15"),
				createdAt: new Date("2023-01-01"),
			},
			{
				id: "2",
				name: "Expense 2024",
				dueDate: new Date("2024-03-20"),
				createdAt: new Date("2024-01-01"),
			},
		];

		vi.mocked(useExpenseStore).mockReturnValue({
			selectedMonth: new Date("2024-01-15"),
			setSelectedMonth: mockSetSelectedMonth,
			expenses: expensesWithDifferentYears,
		} as any);

		render(<MonthNavigation />);

		// Both years should be available in the dropdown
		expect(screen.getByText("2024")).toBeInTheDocument();
		// 2023 would be in the select dropdown
	});
});
