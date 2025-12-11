import {
	format,
	startOfWeek,
	addDays,
	parseISO,
	parse,
	isValid,
	getWeek,
	getYear,
	startOfYear,
	eachWeekOfInterval,
	endOfYear,
	startOfMonth,
	endOfMonth,
	differenceInDays,
	isToday,
	isTomorrow,
	isYesterday,
	isSameMonth,
	differenceInWeeks,
} from "date-fns";
import type { IncomeParsedEntry } from "@/types/income";

// ============================================
// Constants
// ============================================

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const MONTHS = [
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
export const CURRENT_YEAR = new Date().getFullYear();
export const CURRENT_WEEK = getWeek(new Date(), { weekStartsOn: 1 });

export const years = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 5 + i);

// ============================================
// Formatting Functions
// ============================================

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

// ============================================
// Date Range Functions
// ============================================

export const getMonthDateRange = (date: Date): { start: Date; end: Date } => {
	return {
		start: startOfMonth(date),
		end: endOfMonth(date),
	};
};

export const getCurrentWeekRange = () => {
	const today = new Date();
	const start = startOfWeek(today, { weekStartsOn: 1 });
	const end = addDays(start, 6);

	return {
		start,
		end,
		formatted: `Week of ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`,
	};
};

export const getWeeksForYear = (year: number, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1) => {
	const start = startOfYear(new Date(year, 0, 1));
	const end = endOfYear(new Date(year, 0, 1));
	const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn });

	return weeks.map((weekStart) => {
		const weekNumber = getWeek(weekStart, { weekStartsOn });
		return {
			number: weekNumber,
			startDate: weekStart,
			endDate: addDays(weekStart, 6),
			label: `Week ${weekNumber} (${format(weekStart, "MMM d")} - ${format(
				addDays(weekStart, 6),
				"MMM d"
			)})`,
		};
	});
};

export const getAvailableDates = (startDate: Date) => {
	return DAYS.map((dayName, index) => {
		const date = addDays(startDate, index);
		return {
			value: format(date, "yyyy-MM-dd"),
			label: `${dayName} (${format(date, "MMM d")})`,
		};
	});
};

// ============================================
// Relative Date Functions
// ============================================

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
	return "text-blue-500"; // Future weeks
};

// ============================================
// Income Data Functions
// ============================================

export const parsePasteText = (text: string, selectedYear: number) => {
	const lines = text.split("\n").filter((line) => line.trim() !== "");
	const entries: IncomeParsedEntry[] = [];
	let currentEntry: Partial<IncomeParsedEntry> = {};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();

		const monthPattern = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/;
		if (monthPattern.test(line)) {
			if (currentEntry.date && currentEntry.amount !== undefined) {
				entries.push({
					date: currentEntry.date,
					amount: currentEntry.amount,
					hours: currentEntry.hours,
					minutes: currentEntry.minutes,
					rawText: `${currentEntry.date} - $${currentEntry.amount}`,
				});
			}

			const dateStr = line.includes(",") ? line : `${line}, ${selectedYear}`;
			const parsedDate = parse(dateStr, "MMM d, yyyy", new Date());

			if (isValid(parsedDate)) {
				currentEntry = {
					date: format(parsedDate, "yyyy-MM-dd"),
				};
			} else {
				currentEntry = {};
				continue;
			}
		} else if (line.startsWith("$")) {
			const amountMatch = line.match(/\$?(\d+\.?\d*)/);
			if (amountMatch) {
				currentEntry.amount = parseFloat(amountMatch[1]);
			}
		} else if (line.includes("h") || line.includes("min")) {
			const timeMatch = line.match(/(\d+)h\s*(\d+)min/);
			if (timeMatch) {
				currentEntry.hours = parseInt(timeMatch[1]);
				currentEntry.minutes = parseInt(timeMatch[2]);
			} else {
				const hoursMatch = line.match(/(\d+)h/);
				if (hoursMatch) {
					currentEntry.hours = parseInt(hoursMatch[1]);
				}
			}
		}
	}

	if (currentEntry.date && currentEntry.amount !== undefined) {
		entries.push({
			date: currentEntry.date,
			amount: currentEntry.amount,
			hours: currentEntry.hours,
			minutes: currentEntry.minutes,
			rawText: `${currentEntry.date} - $${currentEntry.amount}`,
		});
	}

	return entries;
};

export const getMonthlyData = (incomeEntries: any[], year: number) => {
	const monthlyData = [];

	for (let month = 0; month < 12; month++) {
		const monthStart = startOfMonth(new Date(year, month, 1));
		const monthEnd = endOfMonth(new Date(year, month, 1));

		const monthEntries = incomeEntries.filter((entry) => {
			const entryDate = parseISO(entry.date);
			return entryDate >= monthStart && entryDate <= monthEnd;
		});

		// Get the latest entry for each day to avoid duplicates
		const uniqueEntries = monthEntries.reduce((acc, entry) => {
			const entryDate = format(parseISO(entry.date), "yyyy-MM-dd");
			const existingEntry = acc.find(
				(e: { date: string }) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate
			);

			if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
				acc = acc.filter(
					(e: { date: string }) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate
				);
				acc.push(entry);
			}

			return acc;
		}, []);

		const totalAmount = uniqueEntries.reduce(
			(sum: any, entry: { amount: any }) => sum + entry.amount,
			0
		);
		const totalHours = uniqueEntries.reduce(
			(sum: any, entry: { hours: number; minutes: number }) => {
				const hours = entry.hours || 0;
				const minutes = entry.minutes || 0;
				return sum + hours + minutes / 60;
			},
			0
		);

		monthlyData.push({
			month: MONTHS[month],
			monthNumber: month,
			amount: totalAmount,
			hours: totalHours,
			year: year,
		});
	}

	return monthlyData;
};

export const getYearlyData = (incomeEntries: any[]) => {
	const yearlyData = [];
	const uniqueYears = [
		...new Set(incomeEntries.map((entry) => getYear(parseISO(entry.date)))),
	].sort();

	for (const year of uniqueYears) {
		const yearEntries = incomeEntries.filter((entry) => getYear(parseISO(entry.date)) === year);

		// Get the latest entry for each day to avoid duplicates
		const uniqueEntries = yearEntries.reduce((acc, entry) => {
			const entryDate = format(parseISO(entry.date), "yyyy-MM-dd");
			const existingEntry = acc.find(
				(e: { date: string }) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate
			);

			if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
				acc = acc.filter(
					(e: { date: string }) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate
				);
				acc.push(entry);
			}

			return acc;
		}, []);

		const totalAmount = uniqueEntries.reduce(
			(sum: any, entry: { amount: any }) => sum + entry.amount,
			0
		);
		const totalHours = uniqueEntries.reduce(
			(sum: any, entry: { hours: number; minutes: number }) => {
				const hours = entry.hours || 0;
				const minutes = entry.minutes || 0;
				return sum + hours + minutes / 60;
			},
			0
		);

		yearlyData.push({
			year: year,
			amount: totalAmount,
			hours: totalHours,
		});
	}

	return yearlyData.sort((a, b) => b.year - a.year);
};

export const getTotalHoursWorked = (incomeEntries: any[]) => {
	const uniqueEntries = incomeEntries.reduce((acc, entry) => {
		const entryDate = format(parseISO(entry.date), "yyyy-MM-dd");
		const existingEntry = acc.find(
			(e: { date: string }) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate
		);

		if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
			acc = acc.filter(
				(e: { date: string }) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate
			);
			acc.push(entry);
		}

		return acc;
	}, []);

	return uniqueEntries.reduce((sum: any, entry: { hours: number; minutes: number }) => {
		const hours = entry.hours || 0;
		const minutes = entry.minutes || 0;
		return sum + hours + minutes / 60;
	}, 0);
};

export const getTotalAmount = (incomeEntries: any[]) => {
	const uniqueEntries = incomeEntries.reduce((acc, entry) => {
		const entryDate = format(parseISO(entry.date), "yyyy-MM-dd");
		const existingEntry = acc.find(
			(e: { date: string }) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate
		);

		if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
			acc = acc.filter(
				(e: { date: string }) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate
			);
			acc.push(entry);
		}

		return acc;
	}, []);

	return uniqueEntries.reduce((sum: any, entry: { amount: any }) => sum + entry.amount, 0);
};
