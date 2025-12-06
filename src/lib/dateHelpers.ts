import {
	format,
	startOfMonth,
	endOfMonth,
	differenceInDays,
	isToday,
	isTomorrow,
	isYesterday,
	isSameMonth,
	startOfWeek,
	differenceInWeeks,
} from "date-fns";

export const formatCurrency = (amount: number, currency: string = "USD"): string => {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency,
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
		if (daysDiff <= 6) return `In ${daysDiff} days`;

		// Calculate weeks from Sunday to Sunday
		const todayStartOfWeek = startOfWeek(today, { weekStartsOn: 0 }); // 0 = Sunday
		const dueStartOfWeek = startOfWeek(due, { weekStartsOn: 0 });
		const weeksDiff = differenceInWeeks(dueStartOfWeek, todayStartOfWeek);

		if (weeksDiff === 1) return "In 1 week";
		if (weeksDiff === 2) return "In 2 weeks";
		if (weeksDiff === 3) return "In 3 weeks";
		if (weeksDiff >= 4) return `In ${weeksDiff} weeks`;

		// Fallback to days if weeks calculation doesn't fit
		return `In ${daysDiff} days`;
	} else {
		const absDiff = Math.abs(daysDiff);
		if (absDiff === 2) return "2 days ago";
		if (absDiff <= 6) return `${absDiff} days ago`;

		// Calculate weeks from Sunday to Sunday for past dates
		const todayStartOfWeek = startOfWeek(today, { weekStartsOn: 0 });
		const dueStartOfWeek = startOfWeek(due, { weekStartsOn: 0 });
		const weeksDiff = differenceInWeeks(todayStartOfWeek, dueStartOfWeek);

		if (weeksDiff === 1) return "1 week ago";
		if (weeksDiff === 2) return "2 weeks ago";
		if (weeksDiff === 3) return "3 weeks ago";
		if (weeksDiff >= 4) return `${weeksDiff} weeks ago`;

		// Fallback to days if weeks calculation doesn't fit
		return `${absDiff} days ago`;
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
