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
} from "date-fns";
import type { IncomeParsedEntry } from "@/types/income";

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

export const getWeeksForYear = (year: number) => {
	const start = startOfYear(new Date(year, 0, 1));
	const end = endOfYear(new Date(year, 0, 1));
	const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });

	return weeks.map((weekStart) => {
		const weekNumber = getWeek(weekStart, { weekStartsOn: 1 });
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

// New utility functions for monthly and yearly data
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
				(e: { date: string; }) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate
			);

			if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
				acc = acc.filter((e: { date: string; }) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate);
				acc.push(entry);
			}

			return acc;
		}, []);

		const totalAmount = uniqueEntries.reduce((sum: any, entry: { amount: any; }) => sum + entry.amount, 0);
		const totalHours = uniqueEntries.reduce((sum: any, entry: { hours: number; minutes: number; }) => {
			const hours = entry.hours || 0;
			const minutes = entry.minutes || 0;
			return sum + hours + minutes / 60;
		}, 0);

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
				(e: { date: string; }) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate
			);

			if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
				acc = acc.filter((e: { date: string; }) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate);
				acc.push(entry);
			}

			return acc;
		}, []);

		const totalAmount = uniqueEntries.reduce((sum: any, entry: { amount: any; }) => sum + entry.amount, 0);
		const totalHours = uniqueEntries.reduce((sum: any, entry: { hours: number; minutes: number; }) => {
			const hours = entry.hours || 0;
			const minutes = entry.minutes || 0;
			return sum + hours + minutes / 60;
		}, 0);

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
		const existingEntry = acc.find((e: { date: string; }) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate);

		if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
			acc = acc.filter((e: { date: string; }) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate);
			acc.push(entry);
		}

		return acc;
	}, []);

	return uniqueEntries.reduce((sum: any, entry: { hours: number; minutes: number; }) => {
		const hours = entry.hours || 0;
		const minutes = entry.minutes || 0;
		return sum + hours + minutes / 60;
	}, 0);
};

export const getTotalAmount = (incomeEntries: any[]) => {
	const uniqueEntries = incomeEntries.reduce((acc, entry) => {
		const entryDate = format(parseISO(entry.date), "yyyy-MM-dd");
		const existingEntry = acc.find((e: { date: string; }) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate);

		if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
			acc = acc.filter((e: { date: string; }) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate);
			acc.push(entry);
		}

		return acc;
	}, []);

	return uniqueEntries.reduce((sum: any, entry: { amount: any; }) => sum + entry.amount, 0);
};
