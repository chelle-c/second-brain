import {
	format,
	startOfMonth,
	endOfMonth,
	differenceInDays,
	isToday,
	isTomorrow,
	isYesterday,
	isSameMonth,
} from "date-fns";

export const formatCurrency = (amount: number): string => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amount);
};

export const formatDate = (date: Date): string => {
	return format(date, "MMM dd, yyyy");
};

export const formatMonthYear = (date: Date): string => {
	return format(date, "MMMM yyyy");
};

export const getMonthDateRange = (date: Date): { start: Date; end: Date } => {
	return {
		start: startOfMonth(date),
		end: endOfMonth(date),
	};
};

export const getRelativeDateText = (dueDate: Date, currentMonth: Date): string => {
	// Only show relative dates for current month
	if (!isSameMonth(dueDate, currentMonth) || !isSameMonth(currentMonth, new Date())) {
		return formatDate(dueDate);
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const due = new Date(dueDate);
	due.setHours(0, 0, 0, 0);

	const daysDiff = differenceInDays(due, today);

	if (isToday(due)) return "Today";
	if (isTomorrow(due)) return "Tomorrow";
	if (isYesterday(due)) return "Yesterday";

	if (daysDiff > 0) {
		if (daysDiff === 2) return "In 2 days";
		if (daysDiff <= 7) return `In ${daysDiff} days`;
		if (daysDiff <= 14) return "In 1 week";
		if (daysDiff <= 21) return "In 2 weeks";
		if (daysDiff <= 28) return "In 3 weeks";
		return `In ${Math.ceil(daysDiff / 7)} weeks`;
	} else {
		const absDiff = Math.abs(daysDiff);
		if (absDiff === 2) return "2 days ago";
		if (absDiff <= 7) return `${absDiff} days ago`;
		if (absDiff <= 14) return "1 week ago";
		if (absDiff <= 21) return "2 weeks ago";
		if (absDiff <= 28) return "3 weeks ago";
		return `${Math.ceil(absDiff / 7)} weeks ago`;
	}
};

export const getDueDateColor = (dueDate: Date, currentMonth: Date): string => {
	if (!isSameMonth(dueDate, currentMonth) || !isSameMonth(currentMonth, new Date())) {
		return "text-gray-600";
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const due = new Date(dueDate);
	due.setHours(0, 0, 0, 0);

	const daysDiff = differenceInDays(due, today);

	if (daysDiff < 0) return "text-red-600 font-semibold"; // Past due
	if (daysDiff <= 7) return "text-yellow-600 font-medium"; // This week
	return "text-blue-600"; // Future weeks
};
