import { DEFAULT_CATEGORY_COLORS, DEFAULT_EXPENSE_CATEGORIES } from "@/lib/expenseHelpers";
import type { Expense } from "@/types/expense";
import type { IncomeEntry, IncomeWeeklyTargets } from "@/types/income";
import type { Folder, Note, NoteReminder, Tag } from "@/types/notes";
import { DEFAULT_SETTINGS } from "@/types/settings";
import type { LucideIcon } from "lucide-react";
import {
	BookOpen,
	Calendar,
	CheckCircle,
	Code,
	Diamond,
	Flag,
	Heart,
	Lightbulb,
	Sparkles,
	Star,
	Target,
	User,
} from "lucide-react";
import { DEFAULT_PAYMENT_METHODS } from "@/types/storage";
import { sqlStorage } from "./database";

// ============================================================================
// Utilities
// ============================================================================

const generateId = (): string => crypto.randomUUID();

const daysAgo = (days: number): Date => {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return date;
};

const daysFromNow = (days: number): Date => {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date;
};

/** First day of the month N months before the current month (N=0 → this month). */
const monthStart = (monthsAgo: number): Date => {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
};

/** Specific day of a month N months ago (clamped to last day of month). */
const dayInMonth = (monthsAgo: number, day: number): Date => {
	const now = new Date();
	const y = now.getFullYear();
	const m = now.getMonth() - monthsAgo;
	const daysInTarget = new Date(y, m + 1, 0).getDate();
	return new Date(y, m, Math.min(day, daysInTarget));
};

/**
 * Deterministic variation around a base value. Same (seed, salt) always
 * returns the same result so re-seeding produces identical test data.
 */
const vary = (base: number, pct: number, seed: number, salt: number): number => {
	const hash = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
	const factor = (hash - Math.floor(hash)) * 2 - 1; // -1..1
	return Math.round(base * (1 + factor * pct) * 100) / 100;
};

const createReminder = (
	daysFromNowVal: number,
	hour: number = 10,
	minute: number = 0,
	notifications: { unit: "minutes" | "hours" | "days"; value: number }[] = [
		{ unit: "minutes", value: 15 },
	],
): NoteReminder => {
	const dt = daysFromNow(daysFromNowVal);
	dt.setHours(hour, minute, 0, 0);
	return { dateTime: dt.toISOString(), notifications };
};

// ============================================================================
// Folders / Tags / Notes — unchanged from previous seed
// ============================================================================

const createSampleFolders = (): Folder[] => {
	const now = new Date();
	return [
		{
			id: "inbox",
			name: "Inbox",
			parentId: null,
			archived: false,
			order: 0,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "work",
			name: "Work",
			parentId: null,
			icon: Diamond as LucideIcon,
			archived: false,
			order: 1,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "work_meetings",
			name: "Meetings",
			parentId: "work",
			archived: false,
			order: 2,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "work_projects",
			name: "Projects",
			parentId: "work",
			icon: Star as LucideIcon,
			archived: false,
			order: 3,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "work_projects_alpha",
			name: "Project Alpha",
			parentId: "work_projects",
			archived: false,
			order: 4,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "work_projects_beta",
			name: "Project Beta",
			parentId: "work_projects",
			archived: false,
			order: 5,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "work_projects_beta_docs",
			name: "Documentation",
			parentId: "work_projects_beta",
			archived: false,
			order: 6,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "work_tasks",
			name: "Tasks",
			parentId: "work",
			archived: false,
			order: 7,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "personal",
			name: "Personal",
			parentId: null,
			icon: Heart as LucideIcon,
			archived: false,
			order: 8,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "personal_health",
			name: "Health",
			parentId: "personal",
			archived: false,
			order: 9,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "personal_health_fitness",
			name: "Fitness",
			parentId: "personal_health",
			archived: false,
			order: 10,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "personal_health_nutrition",
			name: "Nutrition",
			parentId: "personal_health",
			archived: false,
			order: 11,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "personal_finance",
			name: "Finance",
			parentId: "personal",
			archived: false,
			order: 12,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "personal_home",
			name: "Home",
			parentId: "personal",
			archived: false,
			order: 13,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "ideas",
			name: "Ideas",
			parentId: null,
			icon: Sparkles as LucideIcon,
			archived: false,
			order: 14,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "ideas_app",
			name: "App Features",
			parentId: "ideas",
			archived: false,
			order: 15,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "ideas_business",
			name: "Business",
			parentId: "ideas",
			archived: false,
			order: 16,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "learning",
			name: "Learning",
			parentId: null,
			archived: false,
			order: 17,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "learning_programming",
			name: "Programming",
			parentId: "learning",
			archived: false,
			order: 18,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "learning_languages",
			name: "Languages",
			parentId: "learning",
			archived: false,
			order: 19,
			createdAt: now,
			updatedAt: now,
		},
	];
};

const createSampleTags = (): Record<string, Tag> => ({
	actions: { id: "actions", name: "Actions", icon: CheckCircle as LucideIcon, color: "#3b82f6" },
	ideas: { id: "ideas", name: "Ideas", icon: Lightbulb as LucideIcon, color: "#eab308" },
	reference: {
		id: "reference",
		name: "Reference",
		icon: BookOpen as LucideIcon,
		color: "#10b981",
	},
	urgent: { id: "urgent", name: "Urgent", icon: Flag as LucideIcon, color: "#ef4444" },
	goal: { id: "goal", name: "Goal", icon: Target as LucideIcon, color: "#8b5cf6" },
	code: { id: "code", name: "Code", icon: Code as LucideIcon, color: "#64748b" },
	meeting: { id: "meeting", name: "Meeting", icon: Calendar as LucideIcon, color: "#0ea5e9" },
	personal: { id: "personal", name: "Personal", icon: User as LucideIcon, color: "#f97316" },
});

const tiptapDoc = (content: object[]) => JSON.stringify({ type: "doc", content });
const tiptapParagraph = (text: string, marks?: { type: string; attrs?: object }[]) => ({
	type: "paragraph",
	content: text ? [{ type: "text", text, ...(marks && { marks }) }] : undefined,
});
const tiptapHeading = (level: number, text: string) => ({
	type: "heading",
	attrs: { level },
	content: text ? [{ type: "text", text }] : undefined,
});
const tiptapBulletList = (items: string[]) => ({
	type: "bulletList",
	content: items.map((text) => ({ type: "listItem", content: [tiptapParagraph(text)] })),
});
const tiptapOrderedList = (items: string[]) => ({
	type: "orderedList",
	content: items.map((text) => ({ type: "listItem", content: [tiptapParagraph(text)] })),
});
const tiptapTaskList = (items: { text: string; checked: boolean }[]) => ({
	type: "taskList",
	content: items.map(({ text, checked }) => ({
		type: "taskItem",
		attrs: { checked },
		content: [tiptapParagraph(text)],
	})),
});

const createSampleNotes = (): Note[] => {
	return [
		{
			id: generateId(),
			title: "Welcome to Second Brain",
			content: tiptapDoc([
				tiptapParagraph(
					"This is a test note in your second brain app. Use it to capture ideas, thoughts, and important information.",
				),
			]),
			tags: ["reference"],
			folder: "inbox",
			createdAt: daysAgo(7),
			updatedAt: daysAgo(7),
			archived: false,
		},
		{
			id: generateId(),
			title: "Quick thought about productivity",
			content: tiptapDoc([
				tiptapParagraph("Need to organize my task management system better."),
			]),
			tags: ["ideas"],
			folder: "inbox",
			createdAt: daysAgo(1),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Call back John about the project",
			content: tiptapDoc([
				tiptapParagraph(
					"Remember to call John before Friday to discuss the new requirements.",
				),
			]),
			tags: ["actions", "urgent"],
			folder: "inbox",
			createdAt: daysAgo(0),
			updatedAt: daysAgo(0),
			archived: false,
			reminder: createReminder(1, 9, 0, [
				{ unit: "hours", value: 1 },
				{ unit: "minutes", value: 15 },
			]),
		},
		{
			id: generateId(),
			title: "Shopping list for weekend",
			content: tiptapDoc([
				tiptapBulletList(["Groceries", "Cleaning supplies", "Birthday gift"]),
			]),
			tags: ["personal"],
			folder: "inbox",
			createdAt: daysAgo(2),
			updatedAt: daysAgo(1),
			archived: false,
			reminder: createReminder(3, 10, 0, [{ unit: "days", value: 1 }]),
		},
		{
			id: generateId(),
			title: "Meeting notes - unsorted",
			content: tiptapDoc([tiptapParagraph("Need to file this in the right folder later.")]),
			tags: ["meeting"],
			folder: "inbox",
			createdAt: daysAgo(3),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Q1 Planning Overview",
			content: tiptapDoc([
				tiptapHeading(2, "Key milestones for Q1"),
				tiptapOrderedList(["Complete feature design", "Launch beta", "User testing"]),
			]),
			tags: ["reference", "goal"],
			folder: "work",
			createdAt: daysAgo(5),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "Performance Review Notes",
			content: tiptapDoc([tiptapParagraph("Self-assessment for annual review.")]),
			tags: ["personal", "reference"],
			folder: "work",
			createdAt: daysAgo(14),
			updatedAt: daysAgo(7),
			archived: false,
			reminder: createReminder(7, 14, 0, [
				{ unit: "days", value: 1 },
				{ unit: "hours", value: 2 },
			]),
		},
		{
			id: generateId(),
			title: "Team Sync - Weekly Standup",
			content: tiptapDoc([
				tiptapParagraph("Discussed roadmap priorities."),
				tiptapHeading(3, "Action items"),
				tiptapBulletList([
					"Review competitor analysis",
					"Prepare demo for stakeholders",
					"Schedule follow-up meeting",
				]),
			]),
			tags: ["meeting", "actions"],
			folder: "work_meetings",
			createdAt: daysAgo(3),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Client Meeting - Acme Corp",
			content: tiptapDoc([
				tiptapParagraph("Discussed new contract terms and project timeline."),
			]),
			tags: ["meeting"],
			folder: "work_meetings",
			createdAt: daysAgo(5),
			updatedAt: daysAgo(5),
			archived: false,
			reminder: createReminder(2, 11, 0, [{ unit: "minutes", value: 30 }]),
		},
		{
			id: generateId(),
			title: "Project Alpha - Requirements",
			content: tiptapDoc([
				tiptapHeading(2, "Requirements"),
				tiptapOrderedList([
					"Complete feature design",
					"API integration",
					"Frontend implementation",
				]),
			]),
			tags: ["reference", "code"],
			folder: "work_projects",
			createdAt: daysAgo(10),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Alpha Sprint Planning",
			content: tiptapDoc([
				tiptapParagraph("Sprint goals and task breakdown for next two weeks."),
			]),
			tags: ["actions", "goal"],
			folder: "work_projects_alpha",
			createdAt: daysAgo(4),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "Beta API Documentation",
			content: tiptapDoc([
				tiptapHeading(2, "API Documentation"),
				tiptapParagraph("API endpoints and authentication flow documentation."),
				{
					type: "codeBlock",
					attrs: { language: "javascript" },
					content: [{ type: "text", text: "// Example API call\nfetch('/api/users');" }],
				},
			]),
			tags: ["reference", "code"],
			folder: "work_projects_beta_docs",
			createdAt: daysAgo(8),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Weekly Tasks",
			content: tiptapDoc([
				tiptapTaskList([
					{ text: "Code review", checked: false },
					{ text: "Update documentation", checked: true },
					{ text: "Team meeting", checked: false },
				]),
			]),
			tags: ["actions"],
			folder: "work_tasks",
			createdAt: daysAgo(2),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Deploy to production checklist",
			content: tiptapDoc([
				tiptapTaskList([
					{ text: "Run tests", checked: false },
					{ text: "Update docs", checked: false },
					{ text: "Notify team", checked: false },
				]),
			]),
			tags: ["actions", "urgent", "code"],
			folder: "work_tasks",
			createdAt: daysAgo(1),
			updatedAt: daysAgo(0),
			archived: false,
			reminder: (() => {
				const target = new Date();
				target.setMinutes(target.getMinutes() + 6, 0, 0);
				return {
					dateTime: target.toISOString(),
					notifications: [{ unit: "minutes" as const, value: 5 }],
				};
			})(),
		},
		{
			id: generateId(),
			title: "Book Recommendations",
			content: tiptapDoc([
				tiptapParagraph("Books to read"),
				tiptapBulletList(["Atomic Habits", "Deep Work", "The Psychology of Money"]),
			]),
			tags: ["reference", "personal"],
			folder: "personal",
			createdAt: daysAgo(10),
			updatedAt: daysAgo(4),
			archived: false,
		},
		{
			id: generateId(),
			title: "Workout Plan",
			content: tiptapDoc([
				tiptapBulletList([
					"Monday: Cardio",
					"Tuesday: Upper body",
					"Wednesday: Rest",
					"Thursday: Lower body",
					"Friday: Full body",
				]),
			]),
			tags: ["goal", "personal"],
			folder: "personal_health",
			createdAt: daysAgo(15),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Strength Training Routine",
			content: tiptapDoc([tiptapParagraph("Upper/lower split - 4 days per week")]),
			tags: ["goal"],
			folder: "personal_health_fitness",
			createdAt: daysAgo(7),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "Meal Prep Ideas",
			content: tiptapDoc([tiptapParagraph("High protein meals for the week")]),
			tags: ["ideas", "personal"],
			folder: "personal_health_nutrition",
			createdAt: daysAgo(5),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Budget Tracker",
			content: tiptapDoc([
				tiptapBulletList([
					"Monthly expenses review",
					"Savings goals",
					"Investment tracking",
				]),
			]),
			tags: ["reference"],
			folder: "personal_finance",
			createdAt: daysAgo(8),
			updatedAt: daysAgo(2),
			archived: false,
			reminder: createReminder(14, 18, 0, [{ unit: "days", value: 2 }]),
		},
		{
			id: generateId(),
			title: "Home Improvement Ideas",
			content: tiptapDoc([
				tiptapHeading(3, "Kitchen renovation plans"),
				tiptapBulletList(["New countertops", "Cabinet refresh", "Lighting upgrade"]),
			]),
			tags: ["ideas", "personal", "goal"],
			folder: "personal_home",
			createdAt: daysAgo(20),
			updatedAt: daysAgo(6),
			archived: false,
		},
		{
			id: generateId(),
			title: "Brainstorming Session",
			content: tiptapDoc([
				tiptapOrderedList([
					"Mind mapping features",
					"Collaboration tools",
					"AI integration",
				]),
			]),
			tags: ["ideas"],
			folder: "ideas",
			createdAt: daysAgo(14),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Feature Wishlist",
			content: tiptapDoc([
				tiptapOrderedList(["Export to PDF", "Dark mode", "Mobile app", "Cloud sync"]),
			]),
			tags: ["ideas", "code"],
			folder: "ideas_app",
			createdAt: daysAgo(12),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Startup Ideas",
			content: tiptapDoc([
				tiptapOrderedList(["SaaS products", "Developer tools", "Productivity apps"]),
			]),
			tags: ["ideas", "goal"],
			folder: "ideas_business",
			createdAt: daysAgo(18),
			updatedAt: daysAgo(5),
			archived: false,
		},
		{
			id: generateId(),
			title: "TypeScript Best Practices",
			content: tiptapDoc([tiptapParagraph("Notes from TypeScript deep dive course")]),
			tags: ["reference", "code"],
			folder: "learning_programming",
			createdAt: daysAgo(6),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "React Performance Optimization",
			content: tiptapDoc([tiptapParagraph("Memoization, lazy loading, and code splitting")]),
			tags: ["reference", "code"],
			folder: "learning_programming",
			createdAt: daysAgo(9),
			updatedAt: daysAgo(4),
			archived: false,
		},
		{
			id: generateId(),
			title: "Spanish Vocabulary",
			content: tiptapDoc([tiptapParagraph("Common phrases and words to memorize")]),
			tags: ["personal", "goal"],
			folder: "learning_languages",
			createdAt: daysAgo(11),
			updatedAt: daysAgo(3),
			archived: false,
			reminder: createReminder(1, 8, 0, [{ unit: "minutes", value: 15 }]),
		},
		{
			id: generateId(),
			title: "Major Project Kickoff - All Hands",
			content: tiptapDoc([
				tiptapParagraph("This note has many tags to demonstrate the +N feature."),
			]),
			tags: ["actions", "ideas", "reference", "urgent", "goal", "meeting"],
			folder: "work",
			createdAt: daysAgo(1),
			updatedAt: daysAgo(0),
			archived: false,
		},
		{
			id: generateId(),
			title: "Annual Review & Planning Session",
			content: tiptapDoc([tiptapParagraph("Another note with multiple tags for testing.")]),
			tags: ["meeting", "goal", "personal", "reference", "actions"],
			folder: "personal",
			createdAt: daysAgo(4),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "Random thought",
			content: tiptapDoc([tiptapParagraph("A note without any tags.")]),
			tags: [],
			folder: "inbox",
			createdAt: daysAgo(6),
			updatedAt: daysAgo(6),
			archived: false,
		},
		{
			id: generateId(),
			title: "Old Project Notes",
			content: tiptapDoc([
				tiptapParagraph(
					"These are archived notes from a completed project. Kept for reference.",
				),
			]),
			tags: ["reference"],
			folder: "inbox",
			createdAt: daysAgo(60),
			updatedAt: daysAgo(30),
			archived: true,
		},
		{
			id: generateId(),
			title: "Completed Tasks - Q4 2023",
			content: tiptapDoc([
				tiptapOrderedList([
					"Archived completed tasks",
					"Project documentation",
					"Final review",
				]),
			]),
			tags: ["actions"],
			folder: "work_tasks",
			createdAt: daysAgo(90),
			updatedAt: daysAgo(90),
			archived: true,
		},
	];
};

// ============================================================================
// Expenses — 6 months of history + 6 months of future occurrences
// ============================================================================

/** Months of historical data to generate (including current month). */
const HISTORY_MONTHS = 6;
/** Months of future occurrences for recurring expenses (planning horizon). */
const FUTURE_MONTHS = 6;

interface RecurringSpec {
	name: string;
	baseAmount: number;
	variancePct: number; // ± fraction, e.g. 0.25 → ±25%
	category: string;
	dayOfMonth: number;
	type: "need" | "want";
	importance: "critical" | "high" | "medium" | "none";
	salt: number; // Deterministic variance seed (unique per expense)
}

/**
 * Creates a recurring-parent expense plus one occurrence per month from
 * (HISTORY_MONTHS - 1) months ago through FUTURE_MONTHS months ahead.
 * Historical occurrences are marked paid; current/future are unpaid.
 * Each occurrence's amount is deterministically varied to simulate
 * real-world fluctuation (utilities, groceries, etc.).
 */
const createRecurringSeries = (spec: RecurringSpec): Expense[] => {
	const parentId = generateId();
	const now = new Date();
	const createdAt = monthStart(HISTORY_MONTHS - 1);

	const parent: Expense = {
		id: parentId,
		name: spec.name,
		amount: spec.baseAmount,
		category: spec.category,
		paymentMethod: "Default",
		dueDate: dayInMonth(0, spec.dayOfMonth),
		isRecurring: true,
		recurrence: { frequency: "monthly", interval: 1 },
		isArchived: false,
		isPaid: false,
		paymentDate: null,
		type: spec.type,
		importance: spec.importance,
		notify: false,
		createdAt,
		updatedAt: now,
		monthlyOverrides: {},
	};

	const occurrences: Expense[] = [];

	// Historical + current + future: from (HISTORY_MONTHS - 1) ago to -FUTURE_MONTHS
	for (let offset = HISTORY_MONTHS - 1; offset >= -FUTURE_MONTHS; offset--) {
		const dueDate = dayInMonth(offset, spec.dayOfMonth);
		const amount = vary(spec.baseAmount, spec.variancePct, offset, spec.salt);
		const isPast = offset > 0;

		occurrences.push({
			id: generateId(),
			name: spec.name,
			amount,
			category: spec.category,
			paymentMethod: "Default",
			dueDate,
			isRecurring: true,
			recurrence: { frequency: "monthly", interval: 1 },
			isArchived: false,
			isPaid: isPast,
			paymentDate: isPast ? dueDate : null,
			type: spec.type,
			importance: spec.importance,
			notify: false,
			createdAt,
			updatedAt: isPast ? dueDate : now,
			parentExpenseId: parentId,
			monthlyOverrides: {},
			isModified: false,
			initialState: {
				amount: spec.baseAmount,
				dueDate,
				paymentMethod: "Default",
			},
		});
	}

	return [parent, ...occurrences];
};

/**
 * Financial profile shaped so the Overview module has interesting data:
 *
 *   Needs/month  ≈ $2,555  (rent + utilities + phone + internet + groceries + transport)
 *   Wants/month  ≈ $350    (streaming + gym + dining)
 *   Total/month  ≈ $2,905
 *   Income/month ≈ $3,100  (5 weekdays × ~4 weeks × ~$155/day)
 *
 * Result:
 *   - Needs coverage ≈ 121%  (comfortably covered)
 *   - Full coverage  ≈ 107%  (thin margin over wants)
 *   - Surplus        ≈ $200/mo → Savings view has a realistic timeline
 *
 * Month 3-ago includes a large one-off car repair to create one deficit
 * month for visual contrast in the Cash Flow chart.
 */
const createSampleExpenses = (): Expense[] => {
	const recurring: RecurringSpec[] = [
		// ─── Needs ───────────────────────────────────────────────────────
		{
			name: "Rent",
			baseAmount: 1500,
			variancePct: 0,
			category: "Housing",
			dayOfMonth: 1,
			type: "need",
			importance: "critical",
			salt: 1,
		},
		{
			name: "Electricity",
			baseAmount: 120,
			variancePct: 0.25,
			category: "Utilities",
			dayOfMonth: 15,
			type: "need",
			importance: "critical",
			salt: 2,
		},
		{
			name: "Internet",
			baseAmount: 79.99,
			variancePct: 0,
			category: "Utilities",
			dayOfMonth: 20,
			type: "need",
			importance: "high",
			salt: 3,
		},
		{
			name: "Phone Plan",
			baseAmount: 55,
			variancePct: 0,
			category: "Utilities",
			dayOfMonth: 25,
			type: "need",
			importance: "high",
			salt: 4,
		},
		{
			name: "Groceries",
			baseAmount: 550,
			variancePct: 0.15,
			category: "Food",
			dayOfMonth: 8,
			type: "need",
			importance: "high",
			salt: 5,
		},
		{
			name: "Transportation",
			baseAmount: 250,
			variancePct: 0.2,
			category: "Transportation",
			dayOfMonth: 12,
			type: "need",
			importance: "high",
			salt: 6,
		},

		// ─── Wants — Subscriptions category ──────────────────────────────
		{
			name: "Netflix",
			baseAmount: 15.49,
			variancePct: 0,
			category: "Subscriptions",
			dayOfMonth: 3,
			type: "want",
			importance: "none",
			salt: 11,
		},
		{
			name: "Spotify",
			baseAmount: 10.99,
			variancePct: 0,
			category: "Subscriptions",
			dayOfMonth: 7,
			type: "want",
			importance: "medium",
			salt: 12,
		},
		{
			name: "Cloud Storage",
			baseAmount: 9.99,
			variancePct: 0,
			category: "Subscriptions",
			dayOfMonth: 14,
			type: "want",
			importance: "high",
			salt: 13,
		},
		{
			name: "News Site",
			baseAmount: 4.99,
			variancePct: 0,
			category: "Subscriptions",
			dayOfMonth: 21,
			type: "want",
			importance: "none",
			salt: 14,
		},
		{
			name: "Adobe Creative Cloud",
			baseAmount: 54.99,
			variancePct: 0,
			category: "Subscriptions",
			dayOfMonth: 28,
			type: "want",
			importance: "medium",
			salt: 15,
		},

		// ─── Wants — non-subscription ────────────────────────────────────
		{
			name: "Gym Membership",
			baseAmount: 49.99,
			variancePct: 0,
			category: "Healthcare",
			dayOfMonth: 5,
			type: "want",
			importance: "medium",
			salt: 8,
		},
		{
			name: "Dining Out",
			baseAmount: 180,
			variancePct: 0.4,
			category: "Food",
			dayOfMonth: 18,
			type: "want",
			importance: "none",
			salt: 9,
		},
		{
			name: "Coffee & Snacks",
			baseAmount: 75,
			variancePct: 0.3,
			category: "Food",
			dayOfMonth: 22,
			type: "want",
			importance: "none",
			salt: 10,
		},
	];

	const expenses: Expense[] = [];
	for (const spec of recurring) {
		expenses.push(...createRecurringSeries(spec));
	}

	// Tag a couple of subscriptions with statuses so the Subscriptions view
	// has something to render in each bucket.
	const tagStatus = (name: string, status: Expense["subscriptionStatus"]) => {
		for (const e of expenses) {
			if (e.name === name) e.subscriptionStatus = status;
		}
	};
	tagStatus("Cloud Storage", "important");
	tagStatus("News Site", "cancel");
	// Everything else falls back to "wanted" in the UI.

	// ─── Inactive subscription (archived) — exercises the Inactive section ──
	const cancelledId = generateId();
	expenses.push({
		id: cancelledId,
		name: "Meal Kit Delivery",
		amount: 71.92,
		category: "Subscriptions",
		paymentMethod: "Default",
		dueDate: dayInMonth(2, 11),
		isRecurring: true,
		recurrence: { frequency: "monthly", interval: 1 },
		isArchived: true,
		isPaid: false,
		paymentDate: null,
		type: "want",
		importance: "none",
		notify: false,
		subscriptionStatus: "cancel",
		createdAt: monthStart(HISTORY_MONTHS - 1),
		updatedAt: dayInMonth(2, 11),
		monthlyOverrides: {},
	});

	// One-off historical expense — creates a visible dip in net cash flow 3 months back
	expenses.push({
		id: generateId(),
		name: "Car Repair",
		amount: 680,
		category: "Transportation",
		paymentMethod: "Default",
		dueDate: dayInMonth(3, 14),
		isRecurring: false,
		isArchived: false,
		isPaid: true,
		paymentDate: dayInMonth(3, 14),
		type: "need",
		importance: "critical",
		notify: false,
		createdAt: dayInMonth(3, 10),
		updatedAt: dayInMonth(3, 14),
		monthlyOverrides: {},
	});

	// Unpaid "Want" items → populate the Savings planner with a realistic wishlist
	const wishlistBase = {
		paymentMethod: "None" as const,
		isRecurring: false as const,
		isArchived: false as const,
		isPaid: false as const,
		paymentDate: null,
		type: "want" as const,
		notify: false as const,
		monthlyOverrides: {} as Record<string, never>,
	};

	expenses.push(
		{
			id: generateId(),
			name: "Noise-Cancelling Headphones",
			amount: 299.99,
			category: "Shopping",
			dueDate: daysFromNow(30),
			importance: "none",
			createdAt: daysAgo(5),
			updatedAt: daysAgo(5),
			...wishlistBase,
		},
		{
			id: generateId(),
			name: "Standing Desk",
			amount: 450,
			category: "Shopping",
			dueDate: daysFromNow(60),
			importance: "medium",
			createdAt: daysAgo(10),
			updatedAt: daysAgo(10),
			...wishlistBase,
		},
		{
			id: generateId(),
			name: "Weekend Trip",
			amount: 800,
			category: "Entertainment",
			dueDate: daysFromNow(90),
			importance: "none",
			createdAt: daysAgo(15),
			updatedAt: daysAgo(15),
			...wishlistBase,
		},
		{
			id: generateId(),
			name: "New Monitor",
			amount: 550,
			category: "Shopping",
			dueDate: null, // No fixed due date → sorted last in savings plan
			importance: "none",
			createdAt: daysAgo(8),
			updatedAt: daysAgo(8),
			...wishlistBase,
		},
	);

	// Upcoming one-off need (tests notification + upcoming-expenses view)
	expenses.push({
		id: generateId(),
		name: "Car Insurance Renewal",
		amount: 450,
		category: "Transportation",
		paymentMethod: "None",
		dueDate: daysFromNow(10),
		isRecurring: false,
		isArchived: false,
		isPaid: false,
		type: "need",
		importance: "critical",
		notify: true,
		createdAt: daysAgo(20),
		updatedAt: daysAgo(20),
		monthlyOverrides: {},
	});

	return expenses;
};;;

// ============================================================================
// Income — 6 months of history matching the expense timeline
// ============================================================================

/**
 * Generates deterministic income entries across the same HISTORY_MONTHS window
 * as the expenses above, targeting ~$3,100/month. Uses a Mon–Fri pattern with
 * small daily variance so weekly/monthly/yearly income views all render properly.
 *
 * Current month only gets entries up through today's date.
 */
const createSampleIncomeEntries = (): IncomeEntry[] => {
	const entries: IncomeEntry[] = [];
	const now = new Date();
	const today = now.getDate();

	const DAILY_TARGET = 155; // ≈ $3,100/month across ~20 workdays
	const HOURLY_RATE = 22;

	for (let m = HISTORY_MONTHS - 1; m >= 0; m--) {
		const isCurrentMonth = m === 0;
		const targetMonth = monthStart(m);
		const year = targetMonth.getFullYear();
		const month = targetMonth.getMonth();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const lastDay = isCurrentMonth ? Math.min(today, daysInMonth) : daysInMonth;

		for (let d = 1; d <= lastDay; d++) {
			const date = new Date(year, month, d);
			const weekday = date.getDay();

			// Weekdays only
			if (weekday === 0 || weekday === 6) continue;

			// ±20% deterministic variance per day
			const amount = vary(DAILY_TARGET, 0.2, m * 100 + d, 42);
			const totalMinutes = Math.round((amount / HOURLY_RATE) * 60);
			const hours = Math.floor(totalMinutes / 60);
			const minutes = totalMinutes % 60;

			entries.push({
				id: generateId(),
				date: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
				amount,
				hours,
				minutes,
			});
		}
	}

	return entries;
};

const createSampleWeeklyTargets = (): IncomeWeeklyTargets[] => [
	{ id: generateId(), amount: 775 }, // ≈ $3,100 / 4 weeks
];

// ============================================================================
// Main seed entry point
// ============================================================================

export const seedTestDatabase = async (): Promise<void> => {
	console.log("Seeding test database with sample data...");

	try {
		await sqlStorage.clearAllData();

		const folders = createSampleFolders();
		await sqlStorage.saveFolders(folders);
		console.log(`✓ ${folders.length} folders created`);

		const tags = createSampleTags();
		await sqlStorage.saveTags(tags);
		console.log(`✓ ${Object.keys(tags).length} tags created`);

		const notes = createSampleNotes();
		await sqlStorage.saveNotes(notes);
		const notesWithReminders = notes.filter((n) => n.reminder).length;
		console.log(`✓ ${notes.length} notes created (${notesWithReminders} with reminders)`);

		const expenses = createSampleExpenses();
		await sqlStorage.saveExpenses({
			expenses,
			selectedMonth: new Date(),
			overviewMode: "remaining",
			categories: DEFAULT_EXPENSE_CATEGORIES,
			categoryColors: DEFAULT_CATEGORY_COLORS,
			paymentMethods: DEFAULT_PAYMENT_METHODS,
		});
		const recurringParents = expenses.filter((e) => e.isRecurring && !e.parentExpenseId).length;
		const occurrences = expenses.filter((e) => e.parentExpenseId).length;
		console.log(
			`✓ ${expenses.length} expenses created (${recurringParents} recurring series × ${HISTORY_MONTHS + FUTURE_MONTHS}mo = ${occurrences} occurrences)`,
		);

		const incomeEntries = createSampleIncomeEntries();
		const weeklyTargets = createSampleWeeklyTargets();
		await sqlStorage.saveIncome({
			entries: incomeEntries,
			weeklyTargets,
			viewType: "weekly",
		});
		console.log(
			`✓ ${incomeEntries.length} income entries created (${HISTORY_MONTHS} months of history)`,
		);

		await sqlStorage.saveMetadata({ lastSaved: new Date(), version: "0.0.5" });

		await sqlStorage.saveSettings({
			...DEFAULT_SETTINGS,
			expenseNotificationLeadDays: 3,
		});
		console.log("✓ Settings configured (notification lead time: 3 days)");

		console.log("Test database seeded successfully!");
		console.log("");
		console.log("  Financial profile:");
		console.log("    Needs/mo  ≈ $2,555  |  Income/mo ≈ $3,100");
		console.log("    Wants/mo  ≈ $350    |  Surplus    ≈ $200-550/mo");
		console.log("    Wishlist  = $2,100 across 4 items");
		console.log("    Month -3 has a $680 car repair (deficit month)");
	} catch (error) {
		console.error("Failed to seed test database:", error);
		throw error;
	}
};

export default seedTestDatabase;
