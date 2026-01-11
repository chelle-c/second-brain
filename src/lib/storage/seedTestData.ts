import { DEFAULT_CATEGORY_COLORS, DEFAULT_EXPENSE_CATEGORIES } from "@/lib/expenseHelpers";
import type { Expense } from "@/types/expense";
import type { IncomeEntry, IncomeWeeklyTargets } from "@/types/income";
import type { Folder, Note, Tag } from "@/types/notes";
import type { LucideIcon } from "lucide-react";
import {
	Star,
	Heart,
	Sparkles,
	Diamond,
	CheckCircle,
	Lightbulb,
	BookOpen,
	Flag,
	Target,
	Code,
	Calendar,
	User,
} from "lucide-react";
import { DEFAULT_PAYMENT_METHODS } from "@/types/storage";
import { sqlStorage } from "./database";

// Generate a simple UUID
const generateId = (): string => {
	return crypto.randomUUID();
};

// Get dates relative to today
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

// Sample folders structure with new flat format
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

// Sample tags
const createSampleTags = (): Record<string, Tag> => {
	return {
		actions: {
			id: "actions",
			name: "Actions",
			icon: CheckCircle as LucideIcon,
			color: "#3b82f6",
		},
		ideas: {
			id: "ideas",
			name: "Ideas",
			icon: Lightbulb as LucideIcon,
			color: "#eab308",
		},
		reference: {
			id: "reference",
			name: "Reference",
			icon: BookOpen as LucideIcon,
			color: "#10b981",
		},
		urgent: {
			id: "urgent",
			name: "Urgent",
			icon: Flag as LucideIcon,
			color: "#ef4444",
		},
		goal: {
			id: "goal",
			name: "Goal",
			icon: Target as LucideIcon,
			color: "#8b5cf6",
		},
		code: {
			id: "code",
			name: "Code",
			icon: Code as LucideIcon,
			color: "#64748b",
		},
		meeting: {
			id: "meeting",
			name: "Meeting",
			icon: Calendar as LucideIcon,
			color: "#0ea5e9",
		},
		personal: {
			id: "personal",
			name: "Personal",
			icon: User as LucideIcon,
			color: "#f97316",
		},
	};
};

// Helper to create Tiptap document JSON
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
	content: items.map((text) => ({
		type: "listItem",
		content: [tiptapParagraph(text)],
	})),
});
const tiptapOrderedList = (items: string[]) => ({
	type: "orderedList",
	content: items.map((text) => ({
		type: "listItem",
		content: [tiptapParagraph(text)],
	})),
});
const tiptapTaskList = (items: { text: string; checked: boolean }[]) => ({
	type: "taskList",
	content: items.map(({ text, checked }) => ({
		type: "taskItem",
		attrs: { checked },
		content: [tiptapParagraph(text)],
	})),
});

// Sample notes with folders and subfolders - using `folder` instead of `folderId`
// Notes now use Tiptap JSON format
const createSampleNotes = (): Note[] => {
	return [
		// Inbox notes - more variety
		{
			id: generateId(),
			title: "Welcome to Second Brain",
			content: tiptapDoc([
				tiptapParagraph("This is a test note in your second brain app. Use it to capture ideas, thoughts, and important information."),
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
			content: tiptapDoc([tiptapParagraph("Need to organize my task management system better.")]),
			tags: ["ideas"],
			folder: "inbox",
			createdAt: daysAgo(1),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Call back John about the project",
			content: tiptapDoc([tiptapParagraph("Remember to call John before Friday to discuss the new requirements.")]),
			tags: ["actions", "urgent"],
			folder: "inbox",
			createdAt: daysAgo(0),
			updatedAt: daysAgo(0),
			archived: false,
		},
		{
			id: generateId(),
			title: "Shopping list for weekend",
			content: tiptapDoc([tiptapBulletList(["Groceries", "Cleaning supplies", "Birthday gift"])]),
			tags: ["personal"],
			folder: "inbox",
			createdAt: daysAgo(2),
			updatedAt: daysAgo(1),
			archived: false,
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

		// Work folder notes
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
		},

		// Work subfolder notes
		{
			id: generateId(),
			title: "Team Sync - Weekly Standup",
			content: tiptapDoc([
				tiptapParagraph("Discussed roadmap priorities."),
				tiptapHeading(3, "Action items"),
				tiptapBulletList(["Review competitor analysis", "Prepare demo for stakeholders", "Schedule follow-up meeting"]),
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
			content: tiptapDoc([tiptapParagraph("Discussed new contract terms and project timeline.")]),
			tags: ["meeting"],
			folder: "work_meetings",
			createdAt: daysAgo(5),
			updatedAt: daysAgo(5),
			archived: false,
		},
		{
			id: generateId(),
			title: "Project Alpha - Requirements",
			content: tiptapDoc([
				tiptapHeading(2, "Requirements"),
				tiptapOrderedList(["Complete feature design", "API integration", "Frontend implementation"]),
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
			content: tiptapDoc([tiptapParagraph("Sprint goals and task breakdown for next two weeks.")]),
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
		},

		// Personal folder and subfolder notes
		{
			id: generateId(),
			title: "Book Recommendations",
			content: tiptapDoc([
				tiptapParagraph("Books to read", [{ type: "underline" }]),
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
				tiptapBulletList(["Monday: Cardio", "Tuesday: Upper body", "Wednesday: Rest", "Thursday: Lower body", "Friday: Full body"]),
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
			content: tiptapDoc([tiptapBulletList(["Monthly expenses review", "Savings goals", "Investment tracking"])]),
			tags: ["reference"],
			folder: "personal_finance",
			createdAt: daysAgo(8),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "Home Improvement Ideas",
			content: tiptapDoc([tiptapHeading(3, "Kitchen renovation plans"), tiptapBulletList(["New countertops", "Cabinet refresh", "Lighting upgrade"])]),
			tags: ["ideas", "personal", "goal"],
			folder: "personal_home",
			createdAt: daysAgo(20),
			updatedAt: daysAgo(6),
			archived: false,
		},

		// Ideas folder and subfolder notes
		{
			id: generateId(),
			title: "Brainstorming Session",
			content: tiptapDoc([tiptapOrderedList(["Mind mapping features", "Collaboration tools", "AI integration"])]),
			tags: ["ideas"],
			folder: "ideas",
			createdAt: daysAgo(14),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Feature Wishlist",
			content: tiptapDoc([tiptapOrderedList(["Export to PDF", "Dark mode", "Mobile app", "Cloud sync"])]),
			tags: ["ideas", "code"],
			folder: "ideas_app",
			createdAt: daysAgo(12),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Startup Ideas",
			content: tiptapDoc([tiptapOrderedList(["SaaS products", "Developer tools", "Productivity apps"])]),
			tags: ["ideas", "goal"],
			folder: "ideas_business",
			createdAt: daysAgo(18),
			updatedAt: daysAgo(5),
			archived: false,
		},

		// Learning folder notes
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
		},

		// Note with many tags to show "+n" indicator
		{
			id: generateId(),
			title: "Major Project Kickoff - All Hands",
			content: tiptapDoc([tiptapParagraph("This note has many tags to demonstrate the +N feature.")]),
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

		// Note with no tags
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

		// Archived notes
		{
			id: generateId(),
			title: "Old Project Notes",
			content: tiptapDoc([tiptapParagraph("These are archived notes from a completed project. Kept for reference.")]),
			tags: ["reference"],
			folder: "inbox",
			createdAt: daysAgo(60),
			updatedAt: daysAgo(30),
			archived: true,
		},
		{
			id: generateId(),
			title: "Completed Tasks - Q4 2023",
			content: tiptapDoc([tiptapOrderedList(["Archived completed tasks", "Project documentation", "Final review"])]),
			tags: ["actions"],
			folder: "work_tasks",
			createdAt: daysAgo(90),
			updatedAt: daysAgo(90),
			archived: true,
		},
	];
};

// Helper to generate recurring expense occurrences
const generateRecurringOccurrences = (
	parentId: string,
	baseExpense: Omit<
		Expense,
		"id" | "dueDate" | "isPaid" | "paymentDate" | "parentExpenseId" | "initialState"
	>,
	dayOfMonth: number,
	months: number = 12,
	paidCount: number = 0
): Expense[] => {
	const now = new Date();
	return Array.from({ length: months }, (_, i) => i).map((month) => {
		const dueDate = new Date(now.getFullYear(), now.getMonth() + month, dayOfMonth);
		const isPaid = month < paidCount;
		return {
			...baseExpense,
			id: generateId(),
			dueDate,
			isPaid,
			paymentDate: isPaid ? dueDate : undefined,
			parentExpenseId: parentId,
			notify: baseExpense.notify || false,
			initialState: {
				amount: baseExpense.amount,
				dueDate,
				paymentMethod: baseExpense.paymentMethod || "None",
			},
		};
	}) satisfies Expense[];
};

// Sample expenses
const createSampleExpenses = (): Expense[] => {
	const now = new Date();

	// Parent expense IDs
	const rentId = generateId();
	const electricityId = generateId();
	const internetId = generateId();
	const phonePlanId = generateId();
	const streamingId = generateId();
	const gymId = generateId();

	// Base expense configurations
	const rentBase = {
		name: "Rent",
		amount: 1500,
		category: "Housing",
		paymentMethod: "Default",
		isRecurring: true,
		recurrence: { frequency: "monthly" as const },
		isArchived: false,
		type: "need" as const,
		importance: "critical" as const,
		createdAt: daysAgo(90),
		updatedAt: daysAgo(5),
		notify: false,
		monthlyOverrides: {},
	};

	const electricityBase = {
		name: "Electricity",
		amount: 120,
		category: "Utilities",
		paymentMethod: "Default",
		isRecurring: true,
		recurrence: { frequency: "monthly" as const },
		isArchived: false,
		type: "need" as const,
		importance: "critical" as const,
		createdAt: daysAgo(90),
		updatedAt: daysAgo(10),
		notify: false,
		monthlyOverrides: {},
	};

	const internetBase = {
		name: "Internet",
		amount: 79.99,
		category: "Utilities",
		paymentMethod: "Default",
		isRecurring: true,
		recurrence: { frequency: "monthly" as const },
		isArchived: false,
		type: "need" as const,
		importance: "high" as const,
		createdAt: daysAgo(60),
		updatedAt: daysAgo(15),
		notify: false,
		monthlyOverrides: {},
	};

	const phonePlanBase = {
		name: "Phone Plan",
		amount: 55,
		category: "Utilities",
		paymentMethod: "Default",
		isRecurring: true,
		recurrence: { frequency: "monthly" as const },
		isArchived: false,
		type: "need" as const,
		importance: "high" as const,
		createdAt: daysAgo(120),
		updatedAt: daysAgo(20),
		notify: false,
		monthlyOverrides: {},
	};

	const streamingBase = {
		name: "Streaming Services",
		amount: 45.97,
		category: "Entertainment",
		paymentMethod: "Default",
		isRecurring: true,
		recurrence: { frequency: "monthly" as const },
		isArchived: false,
		type: "want" as const,
		importance: "none" as const,
		createdAt: daysAgo(180),
		updatedAt: daysAgo(5),
		notify: false,
		monthlyOverrides: {},
	};

	const gymBase = {
		name: "Gym Membership",
		amount: 49.99,
		category: "Health",
		paymentMethod: "Default",
		isRecurring: true,
		recurrence: { frequency: "monthly" as const },
		isArchived: false,
		type: "want" as const,
		importance: "medium" as const,
		createdAt: daysAgo(200),
		updatedAt: daysAgo(10),
		notify: false,
		monthlyOverrides: {},
	};

	// Generate 12 months of occurrences for each recurring expense (with first 1-2 marked as paid)
	const rentOccurrences = generateRecurringOccurrences(rentId, rentBase, 1, 12, 2);
	const electricityOccurrences = generateRecurringOccurrences(
		electricityId,
		electricityBase,
		15,
		12,
		1
	);
	const internetOccurrences = generateRecurringOccurrences(internetId, internetBase, 20, 12, 2);
	const phonePlanOccurrences = generateRecurringOccurrences(
		phonePlanId,
		phonePlanBase,
		25,
		12,
		1
	);
	const streamingOccurrences = generateRecurringOccurrences(
		streamingId,
		streamingBase,
		10,
		12,
		2
	);
	const gymOccurrences = generateRecurringOccurrences(gymId, gymBase, 5, 12, 1);

	return [
		// Parent recurring expenses (current month)
		{
			id: rentId,
			...rentBase,
			dueDate: new Date(now.getFullYear(), now.getMonth(), 1),
			isPaid: true,
			paymentDate: new Date(now.getFullYear(), now.getMonth(), 1),
			notify: false,
		},
		...rentOccurrences,

		{
			id: electricityId,
			...electricityBase,
			dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
			isPaid: false,
			notify: false,
		},
		...electricityOccurrences,

		{
			id: internetId,
			...internetBase,
			dueDate: new Date(now.getFullYear(), now.getMonth(), 20),
			isPaid: false,
			notify: false,
		},
		...internetOccurrences,

		{
			id: phonePlanId,
			...phonePlanBase,
			dueDate: new Date(now.getFullYear(), now.getMonth(), 25),
			isPaid: false,
			notify: false,
		},
		...phonePlanOccurrences,

		{
			id: streamingId,
			...streamingBase,
			dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
			isPaid: true,
			paymentDate: daysAgo(5),
			notify: false,
		},
		...streamingOccurrences,

		{
			id: gymId,
			...gymBase,
			dueDate: new Date(now.getFullYear(), now.getMonth(), 5),
			isPaid: true,
			paymentDate: daysAgo(10),
			notify: false,
		},
		...gymOccurrences,

		// One-time expenses
		{
			id: generateId(),
			name: "New Headphones",
			amount: 199.99,
			category: "Shopping",
			paymentMethod: "None",
			dueDate: daysFromNow(7),
			isRecurring: false,
			isArchived: false,
			isPaid: false,
			type: "want",
			importance: "none",
			notify: false,
			createdAt: daysAgo(3),
			updatedAt: daysAgo(3),
			monthlyOverrides: {},
		},
		{
			id: generateId(),
			name: "Car Insurance",
			amount: 450,
			category: "Transportation",
			paymentMethod: "None",
			dueDate: daysFromNow(14),
			isRecurring: false,
			isArchived: false,
			isPaid: false,
			type: "need",
			importance: "critical",
			notify: false,
			createdAt: daysAgo(10),
			updatedAt: daysAgo(10),
			monthlyOverrides: {},
		},
		{
			id: generateId(),
			name: "Birthday Gift",
			amount: 75,
			category: "Shopping",
			paymentMethod: "None",
			dueDate: daysFromNow(5),
			isRecurring: false,
			isArchived: false,
			isPaid: false,
			type: "want",
			importance: "medium",
			notify: false,
			createdAt: daysAgo(2),
			updatedAt: daysAgo(2),
			monthlyOverrides: {},
		},
		{
			id: generateId(),
			name: "Groceries",
			amount: 150,
			category: "Food",
			paymentMethod: "None",
			dueDate: null,
			isRecurring: false,
			isArchived: false,
			isPaid: true,
			paymentDate: daysAgo(2),
			type: "need",
			importance: "high",
			notify: false,
			createdAt: daysAgo(2),
			updatedAt: daysAgo(2),
			monthlyOverrides: {},
		},
	];
};

// Sample income entries for the past few weeks
const createSampleIncomeEntries = (): IncomeEntry[] => {
	const entries: IncomeEntry[] = [];

	// Generate entries for the past 4 weeks
	for (let week = 0; week < 4; week++) {
		// Work days (Mon-Fri) with some variation
		for (let day = 1; day <= 5; day++) {
			const date = new Date();
			date.setDate(date.getDate() - week * 7 - (7 - day));

			// Skip some days randomly for realism
			if (Math.random() > 0.85) continue;

			const hours = 6 + Math.floor(Math.random() * 4); // 6-9 hours
			const minutes = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, or 45
			const hourlyRate = 25 + Math.random() * 10; // $25-35/hour
			const amount = Math.round((hours + minutes / 60) * hourlyRate * 100) / 100;

			entries.push({
				id: generateId(),
				date: date.toISOString().split("T")[0],
				amount,
				hours,
				minutes,
			});
		}
	}

	return entries;
};

// Sample weekly targets
const createSampleWeeklyTargets = (): IncomeWeeklyTargets[] => [{ id: generateId(), amount: 800 }];

// Main seed function
export const seedTestDatabase = async (): Promise<void> => {
	console.log("Seeding test database with sample data...");

	try {
		// Clear existing data first
		await sqlStorage.clearAllData();

		// Save folders
		const folders = createSampleFolders();
		await sqlStorage.saveFolders(folders);
		console.log(`✓ ${folders.length} folders created`);

		// Save tags
		const tags = createSampleTags();
		await sqlStorage.saveTags(tags);
		console.log(`✓ ${Object.keys(tags).length} tags created`);

		// Save notes
		const notes = createSampleNotes();
		await sqlStorage.saveNotes(notes);
		console.log(`✓ ${notes.length} notes created`);

		// Save expenses
		const expenses = createSampleExpenses();
		await sqlStorage.saveExpenses({
			expenses,
			selectedMonth: new Date(),
			overviewMode: "remaining",
			categories: DEFAULT_EXPENSE_CATEGORIES,
			categoryColors: DEFAULT_CATEGORY_COLORS,
			paymentMethods: DEFAULT_PAYMENT_METHODS,
		});
		console.log(`✓ ${expenses.length} expenses created`);

		// Save income entries
		const incomeEntries = createSampleIncomeEntries();
		const weeklyTargets = createSampleWeeklyTargets();
		await sqlStorage.saveIncome({
			entries: incomeEntries,
			weeklyTargets,
			viewType: "weekly",
		});
		console.log(`✓ ${incomeEntries.length} income entries created`);

		// Save metadata
		await sqlStorage.saveMetadata({
			lastSaved: new Date(),
			version: "0.0.5",
		});

		console.log("Test database seeded successfully!");
	} catch (error) {
		console.error("Failed to seed test database:", error);
		throw error;
	}
};

// Export for use in dev tools or console
export default seedTestDatabase;
