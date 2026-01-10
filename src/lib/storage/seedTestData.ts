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

// Sample notes with folders and subfolders - using `folder` instead of `folderId`
const createSampleNotes = (): Note[] => {
	return [
		// Inbox notes - more variety
		{
			id: generateId(),
			title: "Welcome to Second Brain",
			content:
				'{"1ca30168-adf8-47d0-ac5b-97b09152a311":{"id":"1ca30168-adf8-47d0-ac5b-97b09152a311","type":"Paragraph","value":[{"id":"603209ec-513e-41df-a2a6-85b9ccf27337","type":"paragraph","children":[{"text":"This ","highlight":{"color":"#CC772F"}},{"text":"is a test note in your "},{"text":"second brain app","highlight":{"color":"#B35588"}},{"text":". Use it to capture ideas, thoughts, and important information."}]}],"meta":{"order":0,"depth":0,"align":"left"}}}',
			tags: ["reference"],
			folder: "inbox",
			createdAt: daysAgo(7),
			updatedAt: daysAgo(7),
			archived: false,
		},
		{
			id: generateId(),
			title: "Quick thought about productivity",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"Need to organize my task management system better."}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["ideas"],
			folder: "inbox",
			createdAt: daysAgo(1),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Call back John about the project",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"Remember to call John before Friday to discuss the new requirements."}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["actions", "urgent"],
			folder: "inbox",
			createdAt: daysAgo(0),
			updatedAt: daysAgo(0),
			archived: false,
		},
		{
			id: generateId(),
			title: "Shopping list for weekend",
			content: '{"1":{"id":"1","type":"BulletedList","value":[{"id":"1","type":"bulleted-list","children":[{"text":"Groceries, cleaning supplies, birthday gift"}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["personal"],
			folder: "inbox",
			createdAt: daysAgo(2),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Meeting notes - unsorted",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"Need to file this in the right folder later."}]}],"meta":{"order":0,"depth":0}}}',
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
			content:
				'{"2f6a7c52-135e-43af-a061-b5da96d91fd4":{"id":"2f6a7c52-135e-43af-a061-b5da96d91fd4","type":"HeadingTwo","meta":{"order":0,"depth":0},"value":[{"id":"eb800f95-317f-4e11-9db6-b00d5a3bfb1b","type":"heading-two","props":{"nodeType":"block"},"children":[{"text":"Key milestones for Q1"}]}]}}',
			tags: ["reference", "goal"],
			folder: "work",
			createdAt: daysAgo(5),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "Performance Review Notes",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"Self-assessment for annual review."}]}],"meta":{"order":0,"depth":0}}}',
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
			content:
				'{"910a0709-5f63-46f8-af94-36b4cd3c0610":{"id":"910a0709-5f63-46f8-af94-36b4cd3c0610","type":"Paragraph","value":[{"id":"3ca41907-de40-47e4-9ee1-d54aa9fc4241","type":"paragraph","children":[{"text":"Discussed roadmap priorities. Action items: Review competitor analysis, prepare demo for stakeholders, schedule follow-up meeting."}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["meeting", "actions"],
			folder: "work_meetings",
			createdAt: daysAgo(3),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Client Meeting - Acme Corp",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"Discussed new contract terms and project timeline."}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["meeting"],
			folder: "work_meetings",
			createdAt: daysAgo(5),
			updatedAt: daysAgo(5),
			archived: false,
		},
		{
			id: generateId(),
			title: "Project Alpha - Requirements",
			content:
				'{"a7cf988f-4be4-443d-91cd-2ed6c45c0bc2":{"id":"a7cf988f-4be4-443d-91cd-2ed6c45c0bc2","type":"NumberedList","meta":{"order":1,"depth":0},"value":[{"id":"1527bed0-3417-4938-8e9d-86681d0a8f58","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"Complete feature design"}]}]}}',
			tags: ["reference", "code"],
			folder: "work_projects",
			createdAt: daysAgo(10),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Alpha Sprint Planning",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"Sprint goals and task breakdown for next two weeks."}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["actions", "goal"],
			folder: "work_projects_alpha",
			createdAt: daysAgo(4),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "Beta API Documentation",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"API endpoints and authentication flow documentation."}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["reference", "code"],
			folder: "work_projects_beta_docs",
			createdAt: daysAgo(8),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Weekly Tasks",
			content:
				'{"78b886e6-4cab-4799-a774-38a6fd152f74":{"id":"78b886e6-4cab-4799-a774-38a6fd152f74","type":"TodoList","meta":{"order":4,"depth":0},"value":[{"id":"f4dd7e72-7af7-4617-83cb-e84199447d7b","type":"todo-list","props":{"checked":false},"children":[{"text":"Code review"}]}]}}',
			tags: ["actions"],
			folder: "work_tasks",
			createdAt: daysAgo(2),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Deploy to production checklist",
			content: '{"1":{"id":"1","type":"TodoList","value":[{"id":"1","type":"todo-list","props":{"checked":false},"children":[{"text":"Run tests, update docs, notify team"}]}],"meta":{"order":0,"depth":0}}}',
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
			content:
				'{"7a2d54b2-8dd6-4953-a1a3-e47c6a610114":{"id":"7a2d54b2-8dd6-4953-a1a3-e47c6a610114","type":"Paragraph","value":[{"id":"db4f4d3d-446b-4290-83e5-1cf5557569d7","type":"paragraph","children":[{"text":"Books to read","underline":true}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["reference", "personal"],
			folder: "personal",
			createdAt: daysAgo(10),
			updatedAt: daysAgo(4),
			archived: false,
		},
		{
			id: generateId(),
			title: "Workout Plan",
			content:
				'{"ccad4c65-4642-4f5d-9244-9d48faddd1ae":{"id":"ccad4c65-4642-4f5d-9244-9d48faddd1ae","type":"BulletedList","meta":{"order":1,"depth":0},"value":[{"id":"2cd598bf-0c1f-40a4-a82e-ef2ccecd33c2","type":"bulleted-list","children":[{"text":"Monday: Cardio"}]}]}}',
			tags: ["goal", "personal"],
			folder: "personal_health",
			createdAt: daysAgo(15),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Strength Training Routine",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"Upper/lower split - 4 days per week"}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["goal"],
			folder: "personal_health_fitness",
			createdAt: daysAgo(7),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "Meal Prep Ideas",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"High protein meals for the week"}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["ideas", "personal"],
			folder: "personal_health_nutrition",
			createdAt: daysAgo(5),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Budget Tracker",
			content:
				'{"e76d495c-1492-4e5f-b803-69644e2a1739":{"id":"e76d495c-1492-4e5f-b803-69644e2a1739","type":"BulletedList","meta":{"order":2,"depth":0},"value":[{"id":"6a422bac-1aa0-4d34-b8cd-dede36eed8a9","type":"bulleted-list","children":[{"text":"Monthly expenses review"}]}]}}',
			tags: ["reference"],
			folder: "personal_finance",
			createdAt: daysAgo(8),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "Home Improvement Ideas",
			content:
				'{"31ef8ec7-25cf-449d-bb0c-430d30116a20":{"id":"31ef8ec7-25cf-449d-bb0c-430d30116a20","type":"HeadingThree","meta":{"order":0,"depth":0},"value":[{"id":"69e0feca-e45c-4c3f-88c0-bb3329c8a709","type":"heading-three","props":{"nodeType":"block"},"children":[{"text":"Kitchen renovation plans"}]}]}}',
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
			content:
				'{"99a9b1be-21a0-431b-934e-267dadb7de18":{"id":"99a9b1be-21a0-431b-934e-267dadb7de18","type":"NumberedList","meta":{"order":1,"depth":0},"value":[{"id":"9d07b27b-ed06-442c-b078-1b7f77f6a48f","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"Mind mapping features"}]}]}}',
			tags: ["ideas"],
			folder: "ideas",
			createdAt: daysAgo(14),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Feature Wishlist",
			content:
				'{"c5ac2094-93fa-46a1-b1ba-6887c0cb0117":{"id":"c5ac2094-93fa-46a1-b1ba-6887c0cb0117","type":"NumberedList","meta":{"order":2,"depth":0},"value":[{"id":"9e274bfc-8966-4c21-a537-fe5aca5adad5","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"Export to PDF"}]}]}}',
			tags: ["ideas", "code"],
			folder: "ideas_app",
			createdAt: daysAgo(12),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Startup Ideas",
			content:
				'{"5ce91dd9-bd85-4481-9d31-27e50633fa37":{"id":"5ce91dd9-bd85-4481-9d31-27e50633fa37","type":"NumberedList","meta":{"order":3,"depth":0},"value":[{"id":"86e7e3a8-16a9-4bfc-a916-bbacbfb5f89d","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"SaaS products"}]}]}}',
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
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"Notes from TypeScript deep dive course"}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["reference", "code"],
			folder: "learning_programming",
			createdAt: daysAgo(6),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "React Performance Optimization",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"Memoization, lazy loading, and code splitting"}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["reference", "code"],
			folder: "learning_programming",
			createdAt: daysAgo(9),
			updatedAt: daysAgo(4),
			archived: false,
		},
		{
			id: generateId(),
			title: "Spanish Vocabulary",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"Common phrases and words to memorize"}]}],"meta":{"order":0,"depth":0}}}',
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
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"This note has many tags to demonstrate the +N feature."}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["actions", "ideas", "reference", "urgent", "goal", "meeting"],
			folder: "work",
			createdAt: daysAgo(1),
			updatedAt: daysAgo(0),
			archived: false,
		},
		{
			id: generateId(),
			title: "Annual Review & Planning Session",
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"Another note with multiple tags for testing."}]}],"meta":{"order":0,"depth":0}}}',
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
			content: '{"1":{"id":"1","type":"Paragraph","value":[{"id":"1","type":"paragraph","children":[{"text":"A note without any tags."}]}],"meta":{"order":0,"depth":0}}}',
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
			content:
				'{"8561d8f6-9c01-4129-9927-36875a3c9a7a":{"id":"8561d8f6-9c01-4129-9927-36875a3c9a7a","type":"Paragraph","value":[{"id":"a188cf5a-d7f9-4bd9-93de-521b6cf3b5ab","type":"paragraph","children":[{"text":"These are archived notes from a completed project. Kept for reference."}]}],"meta":{"order":0,"depth":0}}}',
			tags: ["reference"],
			folder: "inbox",
			createdAt: daysAgo(60),
			updatedAt: daysAgo(30),
			archived: true,
		},
		{
			id: generateId(),
			title: "Completed Tasks - Q4 2023",
			content:
				'{"e1a53903-2fa1-4cfb-b7f0-4586df055130":{"id":"e1a53903-2fa1-4cfb-b7f0-4586df055130","type":"NumberedList","meta":{"order":4,"depth":0},"value":[{"id":"10a44e9c-de34-419c-90b8-c34117272b18","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"Archived completed tasks"}]}]}}',
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
		},
		...rentOccurrences,

		{
			id: electricityId,
			...electricityBase,
			dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
			isPaid: false,
		},
		...electricityOccurrences,

		{
			id: internetId,
			...internetBase,
			dueDate: new Date(now.getFullYear(), now.getMonth(), 20),
			isPaid: false,
		},
		...internetOccurrences,

		{
			id: phonePlanId,
			...phonePlanBase,
			dueDate: new Date(now.getFullYear(), now.getMonth(), 25),
			isPaid: false,
		},
		...phonePlanOccurrences,

		{
			id: streamingId,
			...streamingBase,
			dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
			isPaid: true,
			paymentDate: daysAgo(5),
		},
		...streamingOccurrences,

		{
			id: gymId,
			...gymBase,
			dueDate: new Date(now.getFullYear(), now.getMonth(), 5),
			isPaid: true,
			paymentDate: daysAgo(10),
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
