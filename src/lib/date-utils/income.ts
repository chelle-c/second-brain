import { MONTHS } from "./constants"
import type { IncomeEntry, IncomeParsedEntry } from "@/types/income";
import { endOfMonth, format, getYear, isValid, parse, parseISO, startOfMonth } from "date-fns";

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
			}
		} else if (line.startsWith("$")) {
			const amountMatch = line.match(/\$?(\d+\.?\d*)/);
			if (amountMatch) {
				currentEntry.amount = parseFloat(amountMatch[1]);
			}
		} else if (line.includes("h") || line.includes("min")) {
			const timeMatch = line.match(/(\d+)h\s*(\d+)min/);
			if (timeMatch) {
				currentEntry.hours = parseInt(timeMatch[1], 10);
				currentEntry.minutes = parseInt(timeMatch[2], 10);
			} else {
				const hoursMatch = line.match(/(\d+)h/);
				if (hoursMatch) {
					currentEntry.hours = parseInt(hoursMatch[1], 10);
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

export const getMonthlyData = (incomeEntries: IncomeEntry[], year: number) => {
	const monthlyData = [];

	for (let month = 0; month < 12; month++) {
		const monthStart = startOfMonth(new Date(year, month, 1));
		const monthEnd = endOfMonth(new Date(year, month, 1));

		const monthEntries = incomeEntries.filter((entry) => {
			const entryDate = parseISO(entry.date);
			return entryDate >= monthStart && entryDate <= monthEnd;
		});

		// Get the latest entry for each day to avoid duplicates
		const uniqueEntries = monthEntries.reduce((acc: IncomeEntry[], entry) => {
			const entryDate = format(parseISO(entry.date), "yyyy-MM-dd");
			const existingEntry = acc.find(
				(e) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate,
			);

			if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
				acc = acc.filter((e) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate);
				acc.push(entry);
			}

			return acc;
		}, []);

		const totalAmount = uniqueEntries.reduce(
			(sum: number, entry: IncomeEntry) => sum + entry.amount,
			0,
		);
		const totalHours = uniqueEntries.reduce((sum: number, entry: IncomeEntry) => {
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

export const getYearlyData = (incomeEntries: IncomeEntry[]) => {
	const yearlyData = [];
	const uniqueYears = [
		...new Set(incomeEntries.map((entry) => getYear(parseISO(entry.date)))),
	].sort();

	for (const year of uniqueYears) {
		const yearEntries = incomeEntries.filter((entry) => getYear(parseISO(entry.date)) === year);

		// Get the latest entry for each day to avoid duplicates
		const uniqueEntries = yearEntries.reduce((acc: IncomeEntry[], entry) => {
			const entryDate = format(parseISO(entry.date), "yyyy-MM-dd");
			const existingEntry = acc.find(
				(e) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate,
			);

			if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
				acc = acc.filter((e) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate);
				acc.push(entry);
			}

			return acc;
		}, []);

		const totalAmount = uniqueEntries.reduce(
			(sum: number, entry: IncomeEntry) => sum + entry.amount,
			0,
		);
		const totalHours = uniqueEntries.reduce((sum: number, entry: IncomeEntry) => {
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

export const getTotalHoursWorked = (incomeEntries: IncomeEntry[]) => {
	const uniqueEntries = incomeEntries.reduce((acc: IncomeEntry[], entry) => {
		const entryDate = format(parseISO(entry.date), "yyyy-MM-dd");
		const existingEntry = acc.find((e) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate);

		if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
			acc = acc.filter((e) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate);
			acc.push(entry);
		}

		return acc;
	}, []);

	return uniqueEntries.reduce((sum: number, entry: IncomeEntry) => {
		const hours = entry.hours || 0;
		const minutes = entry.minutes || 0;
		return sum + hours + minutes / 60;
	}, 0);
};

export const getTotalAmount = (incomeEntries: IncomeEntry[]) => {
	const uniqueEntries = incomeEntries.reduce((acc: IncomeEntry[], entry) => {
		const entryDate = format(parseISO(entry.date), "yyyy-MM-dd");
		const existingEntry = acc.find((e) => format(parseISO(e.date), "yyyy-MM-dd") === entryDate);

		if (!existingEntry || new Date(entry.date) > new Date(existingEntry.date)) {
			acc = acc.filter((e) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDate);
			acc.push(entry);
		}

		return acc;
	}, []);

	return uniqueEntries.reduce((sum: number, entry: IncomeEntry) => sum + entry.amount, 0);
};
