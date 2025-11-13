import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { addMonths, subMonths, isThisMonth } from "date-fns";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { formatMonthYear } from "@/lib/dateHelpers";

export const MonthNavigation: React.FC = () => {
	const { selectedMonth, setSelectedMonth } = useExpenseStore();

	const handlePreviousMonth = () => {
		setSelectedMonth(subMonths(selectedMonth ?? new Date(), 1));
	};

	const handleNextMonth = () => {
		setSelectedMonth(addMonths(selectedMonth ?? new Date(), 1));
	};

	const handleCurrentMonth = () => {
		setSelectedMonth(new Date());
	};

	const isCurrentMonth = isThisMonth(selectedMonth ?? new Date());

	return (
		<div className="flex items-center justify-center gap-4">
			<button
				onClick={handlePreviousMonth}
				className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 
					transition-colors duration-200 hover:scale-105 active:scale-95"
				aria-label="Previous month"
			>
				<ChevronLeft size={20} />
			</button>

			<h2 className="text-xl font-bold text-gray-800 w-[180px] text-center">
				{formatMonthYear(selectedMonth ?? new Date())}
			</h2>

			<button
				onClick={handleNextMonth}
				className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 
					transition-colors duration-200 hover:scale-105 active:scale-95"
				aria-label="Next month"
			>
				<ChevronRight size={20} />
			</button>

			<button
				onClick={handleCurrentMonth}
				disabled={isCurrentMonth}
				className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
					transition-colors duration-200 ${
						isCurrentMonth
							? "bg-gray-100 text-gray-400 cursor-not-allowed"
							: "bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 active:scale-95"
					}`}
			>
				<Calendar size={16} />
				<span className="font-medium">Today</span>
			</button>
		</div>
	);
};
