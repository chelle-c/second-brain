import { sqlStorage } from "./database";
import { Note, NotesFolders } from "@/types/notes";
import { Expense } from "@/types/expense";
import { IncomeEntry, IncomeWeeklyTargets } from "@/types/income";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_CATEGORY_COLORS } from "@/lib/expenseHelpers";

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

// Sample folders structure
const createSampleFolders = (): NotesFolders => ({
	inbox: {
		id: "inbox",
		name: "Inbox",
	},
	work: {
		id: "work",
		name: "Work",
	},
	personal: {
		id: "personal",
		name: "Personal",
	},
	ideas: {
		id: "ideas",
		name: "Ideas",
	},
	archive: {
		id: "archive",
		name: "Archive",
	},
});

// Sample notes with Yoopta editor content structure
const createSampleNotes = (): Note[] => {
	const createYooptaContent = (text: string) => {
		const blockId = generateId();
		return JSON.stringify({
			[blockId]: {
				id: blockId,
				type: "Paragraph",
				value: [{ id: generateId(), type: "paragraph", children: [{ text }] }],
				meta: { order: 0, depth: 0 },
			},
		});
	};

	return [
		{
			id: generateId(),
			title: "Welcome to Second Brain",
			content: createYooptaContent(
				"This is a test note in your second brain app. Use it to capture ideas, thoughts, and important information."
			),
			tags: [],
			folder: "inbox",
			createdAt: daysAgo(7),
			updatedAt: daysAgo(7),
			archived: false,
		},
		{
			id: generateId(),
			title: "Project Planning",
			content: createYooptaContent(
				"Key milestones for Q1:\n- Complete feature design\n- Implement core functionality\n- User testing phase\n- Launch preparation"
			),
			tags: [],
			folder: "work",
			createdAt: daysAgo(5),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "Meeting Notes - Team Sync",
			content: createYooptaContent(
				"Discussed roadmap priorities. Action items: Review competitor analysis, prepare demo for stakeholders, schedule follow-up meeting."
			),
			tags: [],
			folder: "work",
			createdAt: daysAgo(3),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Book Recommendations",
			content: createYooptaContent(
				"Books to read:\n- Atomic Habits by James Clear\n- Deep Work by Cal Newport\n- The Psychology of Money by Morgan Housel"
			),
			tags: [],
			folder: "personal",
			createdAt: daysAgo(10),
			updatedAt: daysAgo(4),
			archived: false,
		},
		{
			id: generateId(),
			title: "App Feature Ideas",
			content: createYooptaContent(
				"Potential features to explore:\n- Dark mode themes\n- Export to PDF\n- Cloud sync\n- Mobile companion app\n- AI-powered suggestions"
			),
			tags: [],
			folder: "ideas",
			createdAt: daysAgo(14),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Grocery List Template",
			content: createYooptaContent(
				"Weekly essentials:\n- Fruits and vegetables\n- Dairy products\n- Bread\n- Proteins\n- Snacks"
			),
			tags: [],
			folder: "personal",
			createdAt: daysAgo(20),
			updatedAt: daysAgo(6),
			archived: false,
		},
		{
			id: generateId(),
			title: "Old Project Notes",
			content: createYooptaContent(
				"These are archived notes from a completed project. Kept for reference."
			),
			tags: [],
			folder: "archive",
			createdAt: daysAgo(60),
			updatedAt: daysAgo(30),
			archived: true,
		},
	];
};

// Helper to generate recurring expense occurrences
const generateRecurringOccurrences = (
	parentId: string,
	baseExpense: Omit<Expense, "id" | "dueDate" | "isPaid" | "paymentDate" | "parentExpenseId">,
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
	const electricityOccurrences = generateRecurringOccurrences(electricityId, electricityBase, 15, 12, 1);
	const internetOccurrences = generateRecurringOccurrences(internetId, internetBase, 20, 12, 2);
	const phonePlanOccurrences = generateRecurringOccurrences(phonePlanId, phonePlanBase, 25, 12, 1);
	const streamingOccurrences = generateRecurringOccurrences(streamingId, streamingBase, 10, 12, 2);
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
		console.log("✓ Folders created");

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
			version: "0.0.4",
		});

		console.log("Test database seeded successfully!");
	} catch (error) {
		console.error("Failed to seed test database:", error);
		throw error;
	}
};

// Export for use in dev tools or console
export default seedTestDatabase;
