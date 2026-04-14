import type { Expense } from "@/types/expense";
import type { IncomeEntry } from "@/types/income";
import type {
	IncomeRequirements,
	MonthlyCashFlow,
	CoachingAdvice,
	IncomeFrequency,
	SubscriptionRow,
} from "@/types/overview";
import {
	endOfMonth,
	format,
	isSameMonth,
	parseISO,
	startOfMonth,
	subMonths,
	differenceInDays,
} from "date-fns";

// ============================================
// Internal Helpers
// ============================================

/**
 * Deduplicate income entries, keeping only the latest entry per calendar day.
 * Mirrors the logic used in income utilities to stay consistent with the
 * Income tracker's totals.
 */
const dedupeIncomeEntries = (entries: IncomeEntry[]): IncomeEntry[] => {
	return entries.reduce((acc: IncomeEntry[], entry) => {
		const entryDay = format(parseISO(entry.date), "yyyy-MM-dd");
		const existing = acc.find((e) => format(parseISO(e.date), "yyyy-MM-dd") === entryDay);

		if (!existing || new Date(entry.date) > new Date(existing.date)) {
			const filtered = acc.filter((e) => format(parseISO(e.date), "yyyy-MM-dd") !== entryDay);
			filtered.push(entry);
			return filtered;
		}

		return acc;
	}, []);
};

/**
 * Normalize any recurrence frequency to an approximate monthly cost.
 * Used to present recurring wants as a single "$X/mo" figure regardless
 * of whether they recur weekly, biweekly, etc.
 */
const getMonthlyEquivalent = (expense: Expense): number => {
	if (!expense.isRecurring || !expense.recurrence) return expense.amount;
	const { frequency, interval = 1 } = expense.recurrence;
	const safeInterval = Math.max(1, interval);

	switch (frequency) {
		case "daily":
			return expense.amount * 30;
		case "weekly":
			return expense.amount * (52 / 12);
		case "biweekly":
			return expense.amount * (26 / 12);
		case "monthly":
			return expense.amount;
		case "custom-days":
			return expense.amount * (30 / safeInterval);
		case "custom-months":
			return expense.amount / safeInterval;
		default:
			return expense.amount;
	}
};

// ============================================
// Income Aggregation
// ============================================

/**
 * Sum all income for a given calendar month.
 */
export const getIncomeForMonth = (entries: IncomeEntry[], date: Date): number => {
	const monthStart = startOfMonth(date);
	const monthEnd = endOfMonth(date);

	const monthEntries = entries.filter((entry) => {
		const entryDate = parseISO(entry.date);
		return entryDate >= monthStart && entryDate <= monthEnd;
	});

	const deduped = dedupeIncomeEntries(monthEntries);
	return deduped.reduce((sum, entry) => sum + entry.amount, 0);
};

// ============================================
// Expense Aggregation
// ============================================

/**
 * Filter expenses that belong to a specific month based on due date.
 * Excludes archived expenses and recurring parent templates (keeps occurrences).
 * Expenses without a due date are excluded from month-based analysis.
 */
export const getExpensesForMonth = (expenses: Expense[], date: Date): Expense[] => {
	return expenses.filter((expense) => {
		if (expense.isArchived) return false;
		// Skip parent recurring expenses — they're templates, not actual occurrences
		if (expense.isRecurring && !expense.parentExpenseId) return false;
		if (!expense.dueDate) return false;
		return isSameMonth(expense.dueDate, date);
	});
};

export interface MonthlyExpenseBreakdown {
	needs: number;
	wants: number;
	total: number;
}

/**
 * Split a month's expenses into need vs want totals.
 */
export const getExpenseBreakdownForMonth = (
	expenses: Expense[],
	date: Date,
): MonthlyExpenseBreakdown => {
	const monthExpenses = getExpensesForMonth(expenses, date);

	let needs = 0;
	let wants = 0;

	for (const expense of monthExpenses) {
		if (expense.type === "need") {
			needs += expense.amount;
		} else {
			wants += expense.amount;
		}
	}

	return { needs, wants, total: needs + wants };
};

// ============================================
// Cash Flow
// ============================================

/**
 * Build a full-year month-by-month comparison of income vs expenses.
 */
export const getYearlyCashFlow = (
	incomeEntries: IncomeEntry[],
	expenses: Expense[],
	year: number,
): MonthlyCashFlow[] => {
	const result: MonthlyCashFlow[] = [];

	for (let month = 0; month < 12; month++) {
		const monthDate = new Date(year, month, 1);
		const income = getIncomeForMonth(incomeEntries, monthDate);
		const breakdown = getExpenseBreakdownForMonth(expenses, monthDate);

		result.push({
			month: format(monthDate, "MMM"),
			monthDate,
			income,
			expenses: breakdown.total,
			needs: breakdown.needs,
			wants: breakdown.wants,
			net: income - breakdown.total,
		});
	}

	return result;
};

// ============================================
// Needs Analysis
// ============================================

/**
 * Analyze "Need" type expenses over a trailing window ending at (and including)
 * the reference month.
 */
// export const analyzeNeeds = (
// 	expenses: Expense[],
// 	monthsBack: TimeRange,
// 	referenceDate: Date = new Date(),
// ): NeedsAnalysis => {
// 	const monthlyValues: NeedsAnalysis["monthlyValues"] = [];
// 	const categoryTotals: Record<string, number> = {};
// 	let total = 0;
// 	let monthsWithData = 0;

// 	// Oldest → newest for intuitive chart ordering
// 	for (let i = monthsBack - 1; i >= 0; i--) {
// 		const monthDate = subMonths(startOfMonth(referenceDate), i);
// 		const monthNeeds = getExpensesForMonth(expenses, monthDate).filter(
// 			(e) => e.type === "need",
// 		);

// 		const monthTotal = monthNeeds.reduce((sum, e) => sum + e.amount, 0);
// 		total += monthTotal;
// 		if (monthTotal > 0) monthsWithData++;

// 		for (const expense of monthNeeds) {
// 			categoryTotals[expense.category] =
// 				(categoryTotals[expense.category] || 0) + expense.amount;
// 		}

// 		monthlyValues.push({
// 			month: format(monthDate, monthsBack > 6 ? "MMM" : "MMM yyyy"),
// 			monthDate,
// 			amount: monthTotal,
// 		});
// 	}

// 	const averageMonthly = monthsBack > 0 ? total / monthsBack : 0;

// 	// Category totals → averages per month
// 	const byCategory: Record<string, number> = {};
// 	for (const [cat, catTotal] of Object.entries(categoryTotals)) {
// 		byCategory[cat] = catTotal / monthsBack;
// 	}

// 	// Trend: compare older half vs newer half
// 	let trend = 0;
// 	if (monthsBack >= 2) {
// 		const mid = Math.floor(monthsBack / 2);
// 		const firstHalf = monthlyValues.slice(0, mid);
// 		const secondHalf = monthlyValues.slice(mid);

// 		const firstAvg = firstHalf.reduce((s, m) => s + m.amount, 0) / (firstHalf.length || 1);
// 		const secondAvg = secondHalf.reduce((s, m) => s + m.amount, 0) / (secondHalf.length || 1);

// 		if (firstAvg > 0) {
// 			trend = ((secondAvg - firstAvg) / firstAvg) * 100;
// 		} else if (secondAvg > 0) {
// 			trend = 100; // Came from zero → consider it a full increase
// 		}
// 	}

// 	return {
// 		averageMonthly,
// 		total,
// 		monthsAnalyzed: monthsBack,
// 		monthsWithData,
// 		byCategory,
// 		trend,
// 		monthlyValues,
// 	};
// };

// ============================================
// Income Requirements
// ============================================

/**
 * Calculate how much income is required to cover needs vs all expenses
 * for a given month, and how that compares to actual recorded income.
 */
export const calculateIncomeRequirements = (
	incomeEntries: IncomeEntry[],
	expenses: Expense[],
	date: Date,
): IncomeRequirements => {
	const breakdown = getExpenseBreakdownForMonth(expenses, date);
	const actualIncome = getIncomeForMonth(incomeEntries, date);

	const needsGap = actualIncome - breakdown.needs;
	const fullGap = actualIncome - breakdown.total;

	const needsCoverage = breakdown.needs > 0 ? (actualIncome / breakdown.needs) * 100 : 100;
	const fullCoverage = breakdown.total > 0 ? (actualIncome / breakdown.total) * 100 : 100;

	return {
		needsTotal: breakdown.needs,
		wantsTotal: breakdown.wants,
		allExpensesTotal: breakdown.total,
		actualIncome,
		needsGap,
		fullGap,
		needsCoverage,
		fullCoverage,
	};
};

// ============================================
// Savings Planning
// ============================================

/**
 * Average discretionary income (income minus needs) over a trailing window.
 * This is the realistic "saveable" amount per month.
 */
// export const getAverageSurplus = (
// 	incomeEntries: IncomeEntry[],
// 	expenses: Expense[],
// 	monthsBack: number,
// 	referenceDate: Date = new Date(),
// ): number => {
// 	if (monthsBack <= 0) return 0;

// 	let totalSurplus = 0;

// 	for (let i = monthsBack - 1; i >= 0; i--) {
// 		const monthDate = subMonths(startOfMonth(referenceDate), i);
// 		const income = getIncomeForMonth(incomeEntries, monthDate);
// 		const breakdown = getExpenseBreakdownForMonth(expenses, monthDate);
// 		totalSurplus += income - breakdown.needs;
// 	}

// 	return totalSurplus / monthsBack;
// };

/**
 * Analyze all "Want" expenses and compute what it takes to fund them.
 *
 * Design goals per user feedback:
 *   - Show ALL wants, not just when surplus is positive.
 *   - For each upcoming month, compute how much must be set aside.
 *   - Recurring wants appear ONCE (as a series), not as 12 duplicates.
 */
// export const analyzeSavingsNeeds = (
// 	expenses: Expense[],
// 	incomeEntries: IncomeEntry[],
// 	surplusWindowMonths: number,
// 	lookAheadMonths: number = 6,
// 	referenceDate: Date = new Date(),
// ): SavingsAnalysis => {
// 	// ─── Recurring series: one row per parent want ───────────────────────
// 	const recurringParents = expenses.filter(
// 		(e) => !e.isArchived && e.isRecurring && !e.parentExpenseId && e.type === "want",
// 	);

// 	const recurringSeries: RecurringWantSeries[] = recurringParents
// 		.map((p) => ({
// 			id: p.id,
// 			name: p.name,
// 			category: p.category,
// 			monthlyAmount: getMonthlyEquivalent(p),
// 			frequency: p.recurrence?.frequency ?? "monthly",
// 		}))
// 		.sort((a, b) => b.monthlyAmount - a.monthlyAmount);

// 	const totalRecurringPerMonth = recurringSeries.reduce((s, r) => s + r.monthlyAmount, 0);

// 	// ─── One-off wants: non-recurring, unpaid ────────────────────────────
// 	const oneOffWants = expenses
// 		.filter(
// 			(e) =>
// 				!e.isArchived &&
// 				!e.isRecurring &&
// 				!e.parentExpenseId &&
// 				e.type === "want" &&
// 				!e.isPaid,
// 		)
// 		.sort((a, b) => {
// 			if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
// 			if (a.dueDate) return -1;
// 			if (b.dueDate) return 1;
// 			return a.amount - b.amount;
// 		});

// 	const totalOneOff = oneOffWants.reduce((s, e) => s + e.amount, 0);

// 	// ─── Monthly timeline: actual want amounts per upcoming month ────────
// 	// Uses real occurrences (not the parent amount) so months with variable
// 	// recurring amounts or clustered one-offs show accurately.
// 	const monthlyObligations: MonthlyWantObligation[] = [];

// 	for (let i = 0; i < lookAheadMonths; i++) {
// 		const monthDate = addMonths(startOfMonth(referenceDate), i);
// 		const monthWants = getExpensesForMonth(expenses, monthDate).filter(
// 			(e) => e.type === "want",
// 		);

// 		const recurringOccurrences = monthWants.filter((e) => e.parentExpenseId);
// 		// For one-offs, only count unpaid ones — they're what you need to save for.
// 		const monthOneOffs = monthWants.filter((e) => !e.parentExpenseId && !e.isPaid);

// 		const recurringTotal = recurringOccurrences.reduce((s, e) => s + e.amount, 0);
// 		const oneOffTotal = monthOneOffs.reduce((s, e) => s + e.amount, 0);

// 		monthlyObligations.push({
// 			month: format(monthDate, "MMM yyyy"),
// 			monthDate,
// 			recurringTotal,
// 			oneOffTotal,
// 			total: recurringTotal + oneOffTotal,
// 			oneOffItems: monthOneOffs.map((e) => e.name),
// 		});
// 	}

// 	// ─── Surplus context (informational, doesn't gate what's shown) ──────
// 	const averageSurplus = getAverageSurplus(
// 		incomeEntries,
// 		expenses,
// 		surplusWindowMonths,
// 		referenceDate,
// 	);

// 	return {
// 		recurringSeries,
// 		oneOffWants,
// 		monthlyObligations,
// 		totalRecurringPerMonth,
// 		totalOneOff,
// 		averageSurplus,
// 		discretionaryAfterRecurring: averageSurplus - totalRecurringPerMonth,
// 	};
// };

/**
 * Build a trailing-window month-by-month comparison ending at (and including)
 * the reference month. Unlike `getYearlyCashFlow`, this returns exactly
 * `monthsBack` months regardless of year boundaries, ordered oldest → newest.
 */
export const getTrailingCashFlow = (
	incomeEntries: IncomeEntry[],
	expenses: Expense[],
	monthsBack: number,
	referenceDate: Date = new Date(),
): MonthlyCashFlow[] => {
	const result: MonthlyCashFlow[] = [];

	for (let i = monthsBack - 1; i >= 0; i--) {
		const monthDate = subMonths(startOfMonth(referenceDate), i);
		const income = getIncomeForMonth(incomeEntries, monthDate);
		const breakdown = getExpenseBreakdownForMonth(expenses, monthDate);

		result.push({
			// Include year when crossing year boundaries for clarity
			month: monthsBack > 12 ? format(monthDate, "MMM yy") : format(monthDate, "MMM"),
			monthDate,
			income,
			expenses: breakdown.total,
			needs: breakdown.needs,
			wants: breakdown.wants,
			net: income - breakdown.total,
		});
	}

	return result;
};

// ============================================
// Subscriptions
// ============================================

/**
 * Return all recurring expenses that belong to the "Subscriptions" category,
 * including archived ones (the view filters them into an Inactive section).
 * Only parent recurring expenses are returned (the occurrences are collapsed).
 */
export const getSubscriptions = (expenses: Expense[]): SubscriptionRow[] => {
	return expenses
		.filter((e) => e.isRecurring && !e.parentExpenseId && e.category === "Subscriptions")
		.map((e) => ({
			expense: e,
			monthlyCost: getMonthlyEquivalent(e),
			status: e.subscriptionStatus,
			isActive: !e.isArchived,
		}))
		.sort((a, b) => {
			// Active first, then by monthly cost desc
			if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
			return b.monthlyCost - a.monthlyCost;
		});
};

// ============================================
// Income cadence detection
// ============================================

/**
 * Look at the last ~8 income entries and estimate their cadence based on
 * the median gap between entries (in days).
 */
export const detectIncomeFrequency = (entries: IncomeEntry[]): IncomeFrequency => {
	const deduped = dedupeIncomeEntries(entries);
	if (deduped.length < 3) return "irregular";

	const sorted = [...deduped]
		.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
		.slice(-10);

	const gaps: number[] = [];
	for (let i = 1; i < sorted.length; i++) {
		gaps.push(differenceInDays(parseISO(sorted[i].date), parseISO(sorted[i - 1].date)));
	}
	gaps.sort((a, b) => a - b);
	const median = gaps[Math.floor(gaps.length / 2)];

	if (median <= 3) return "daily"; // logged most workdays
	if (median >= 5 && median <= 9) return "weekly";
	if (median >= 12 && median <= 17) return "biweekly";
	if (median >= 26 && median <= 34) return "monthly";
	return "irregular";
};

/** How many paychecks are likely to occur before the given date. */
const expectedPaychecksUntil = (frequency: IncomeFrequency, days: number): number => {
	if (days <= 0) return 0;
	switch (frequency) {
		// "daily" income is reframed as a weekly savings target — easier to act on
		case "daily":
		case "weekly":
			return Math.max(1, Math.ceil(days / 7));
		case "biweekly":
			return Math.max(1, Math.ceil(days / 14));
		case "monthly":
			return Math.max(1, Math.ceil(days / 30));
		default:
			return Math.max(1, Math.ceil(days / 7));
	}
};

// ============================================
// Coaching advice
// ============================================

/**
 * Produce positive, specific coaching text for the Coverage view.
 * This is deliberately static-rule-based (no AI) — it picks the biggest
 * upcoming need and frames it as a per-paycheck savings target.
 */
export const generateCoachingAdvice = (
	incomeEntries: IncomeEntry[],
	expenses: Expense[],
	month: Date,
	currencyFormatter: (n: number) => string,
): CoachingAdvice => {
	const frequency = detectIncomeFrequency(incomeEntries);
	const req = calculateIncomeRequirements(incomeEntries, expenses, month);
	const tips: string[] = [];

	// ── Headline ─────────────────────────────────────────────────────
	let headline: string;
	if (req.needsTotal === 0 && req.wantsTotal === 0) {
		headline = "No expenses logged for this month — you're in the clear!";
	} else if (req.needsCoverage >= 100 && req.fullCoverage >= 100) {
		headline = "Everything's covered — nice work! Any extra can go to savings.";
	} else if (req.needsCoverage >= 100) {
		const remaining = Math.max(0, req.allExpensesTotal - req.actualIncome);
		headline = `Essentials are handled. ${currencyFormatter(remaining)} to go for everything else.`;
	} else {
		headline = `You're ${Math.round(req.needsCoverage)}% of the way to covering ${format(month, "MMMM")}'s essentials.`;
	}

	// ── Tip 1: per-paycheck target for the biggest upcoming need ────
	const monthNeeds = getExpensesForMonth(expenses, month)
		.filter((e) => e.type === "need" && !e.isPaid)
		.sort((a, b) => b.amount - a.amount);

	if (monthNeeds.length > 0) {
		const biggest = monthNeeds[0];
		const today = new Date();
		const daysToDue =
			biggest.dueDate ? Math.max(1, differenceInDays(biggest.dueDate, today)) : 30;
		const paychecks = expectedPaychecksUntil(frequency, daysToDue);
		const perPaycheck = biggest.amount / paychecks;

		const cadenceLabel =
			frequency === "biweekly" ? "from each bi-weekly paycheck"
			: frequency === "monthly" ? "from each monthly paycheck"
			: "each week"; // daily / weekly / irregular all get a weekly framing

		tips.push(
			`Set aside ${currencyFormatter(perPaycheck)} ${cadenceLabel} to cover ${biggest.name} (${currencyFormatter(biggest.amount)}).`,
		);
	}

	// ── Tip 2: encouragement based on remaining gap ─────────────────
	if (req.needsGap < 0) {
		const remaining = Math.abs(req.needsGap);
		const today = new Date();
		const daysLeft = Math.max(
			1,
			differenceInDays(
				endOfMonth(month),
				today < startOfMonth(month) ? startOfMonth(month) : today,
			),
		);
		const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
		tips.push(
			`About ${currencyFormatter(remaining)} more will fully cover essentials — that's roughly ${currencyFormatter(remaining / weeksLeft)}/week for the rest of the month.`,
		);
	} else if (req.fullGap >= 0 && req.allExpensesTotal > 0) {
		tips.push(
			`You've got ${currencyFormatter(req.fullGap)} of breathing room — consider moving part of it to your wishlist savings.`,
		);
	} else if (req.needsGap >= 0 && req.fullGap < 0) {
		tips.push("Essentials are safe — anything extra you earn now goes straight toward wants.");
	}

	// ── Tip 3: cadence note (only when genuinely irregular AND we have data) ──
	if (frequency === "irregular" && incomeEntries.length >= 3) {
		tips.push(
			"Income arrives on a varied schedule — keeping a one-month essentials buffer can smooth things out.",
		);
	}

	return { headline, tips: tips.slice(0, 3) };
};
