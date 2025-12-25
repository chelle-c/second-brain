import { addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useExpenseStore } from "@/stores/useExpenseStore";

export const MonthNavigation: React.FC = () => {
	const { selectedMonth, setSelectedMonth, expenses } = useExpenseStore();

	if (!selectedMonth) return null;

	const handlePreviousMonth = () => {
		setSelectedMonth(subMonths(selectedMonth ?? new Date(), 1));
	};

	const handleNextMonth = () => {
		setSelectedMonth(addMonths(selectedMonth ?? new Date(), 1));
	};

	const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newDate = new Date(selectedMonth);
		newDate.setMonth(parseInt(e.target.value, 10));
		setSelectedMonth(newDate);
	};

	const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newDate = new Date(selectedMonth);
		newDate.setFullYear(parseInt(e.target.value, 10));
		setSelectedMonth(newDate);
	};

	// Get all months
	const months = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	// Get unique years from expenses + current year
	const currentYear = new Date().getFullYear();
	const expenseYears = new Set<number>();

	expenseYears.add(currentYear);

	// Add years from expenses
	expenses.forEach((expense) => {
		if (expense.dueDate) {
			expenseYears.add(expense.dueDate.getFullYear());
		}
		if (expense.createdAt) {
			expenseYears.add(expense.createdAt.getFullYear());
		}
		if (expense.paymentDate) {
			expenseYears.add(expense.paymentDate.getFullYear());
		}
	});

	// Sort years in descending order
	const availableYears = Array.from(expenseYears).sort((a, b) => b - a);

	return (
		<div className="flex items-center justify-center gap-2">
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={handlePreviousMonth}
				title="Previous month"
			>
				<ChevronLeft size={20} />
			</Button>

			<div className="flex items-center gap-2">
				{/* Month Dropdown */}
				<Select
					value={selectedMonth.getMonth().toString()}
					onValueChange={(value) =>
						handleMonthChange({
							target: { value },
						} as React.ChangeEvent<HTMLSelectElement>)
					}
				>
					<SelectTrigger className="w-[132px]">
						<SelectValue placeholder="Select month" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>Months</SelectLabel>
							{months.map((month, index) => (
								<SelectItem key={month.toLowerCase()} value={index.toString()}>
									{month}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>

				{/* Year Dropdown */}
				<Select
					value={selectedMonth.getFullYear().toString()}
					onValueChange={(value) =>
						handleYearChange({
							target: { value },
						} as React.ChangeEvent<HTMLSelectElement>)
					}
				>
					<SelectTrigger className="w-[92px]">
						<SelectValue placeholder="Select year" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>Years</SelectLabel>
							{availableYears.map((year) => (
								<SelectItem key={year} value={year.toString()}>
									{year}
								</SelectItem>
							))}
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>

			<Button
				variant="ghost"
				size="icon-sm"
				onClick={handleNextMonth}
				title="Next month"
			>
				<ChevronRight size={20} />
			</Button>
		</div>
	);
};
