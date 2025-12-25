import {
	DEFAULT_CATEGORY_COLORS,
	DEFAULT_EXPENSE_CATEGORIES,
} from "@/lib/expenseHelpers";
import type { Expense } from "@/types/expense";
import type { IncomeEntry, IncomeWeeklyTargets } from "@/types/income";
import type { Note, NotesFolders } from "@/types/notes";
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
	return [
		{
			id: generateId(),
			title: "Welcome to Second Brain",
			content:
				'{"1ca30168-adf8-47d0-ac5b-97b09152a311":{"id":"1ca30168-adf8-47d0-ac5b-97b09152a311","type":"Paragraph","value":[{"id":"603209ec-513e-41df-a2a6-85b9ccf27337","type":"paragraph","children":[{"text":"This ","highlight":{"color":"#CC772F"}},{"text":"is a test note in your "},{"text":"second brain app","highlight":{"color":"#B35588"}},{"text":". Use it to capture ideas, thoughts, and important information."}]}],"meta":{"order":0,"depth":0,"align":"left"}}}',
			tags: [],
			folder: "inbox",
			createdAt: daysAgo(7),
			updatedAt: daysAgo(7),
			archived: false,
		},
		{
			id: generateId(),
			title: "Project Planning",
			content:
				'{"a7cf988f-4be4-443d-91cd-2ed6c45c0bc2":{"id":"a7cf988f-4be4-443d-91cd-2ed6c45c0bc2","type":"NumberedList","meta":{"order":1,"depth":0},"value":[{"id":"1527bed0-3417-4938-8e9d-86681d0a8f58","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"Complete feature design"}]}]},"ba2db766-89f5-4ed3-9807-c80b909443dc":{"id":"ba2db766-89f5-4ed3-9807-c80b909443dc","type":"NumberedList","meta":{"order":2,"depth":0},"value":[{"id":"6ace2626-17c8-4370-8b4b-5ea48a616c81","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"Implement core functionality"}]}]},"6f218292-efc8-480c-b6a9-1613fbd36c91":{"id":"6f218292-efc8-480c-b6a9-1613fbd36c91","type":"NumberedList","meta":{"order":3,"depth":0},"value":[{"id":"2f008e6e-22f7-40b5-9945-826c92620a86","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"User testing phase"}]}]},"b03656b3-53b1-4206-ad71-aaa1f0ebb7cf":{"id":"b03656b3-53b1-4206-ad71-aaa1f0ebb7cf","type":"NumberedList","meta":{"order":4,"depth":0},"value":[{"id":"7582f6bf-626f-430a-b3a4-68e162ccc7ff","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"Launch preparation"}]}]},"2f6a7c52-135e-43af-a061-b5da96d91fd4":{"id":"2f6a7c52-135e-43af-a061-b5da96d91fd4","type":"HeadingTwo","meta":{"order":0,"depth":0},"value":[{"id":"eb800f95-317f-4e11-9db6-b00d5a3bfb1b","type":"heading-two","props":{"nodeType":"block"},"children":[{"text":"Key milestones for Q1"}]}]}}',
			tags: [],
			folder: "work",
			createdAt: daysAgo(5),
			updatedAt: daysAgo(2),
			archived: false,
		},
		{
			id: generateId(),
			title: "Meeting Notes - Team Sync",
			content:
				'{"910a0709-5f63-46f8-af94-36b4cd3c0610":{"id":"910a0709-5f63-46f8-af94-36b4cd3c0610","type":"Paragraph","value":[{"id":"3ca41907-de40-47e4-9ee1-d54aa9fc4241","type":"paragraph","children":[{"text":"Discussed roadmap priorities. Action items: Review competitor analysis, prepare demo for stakeholders, schedule follow-up meeting."}]}],"meta":{"order":0,"depth":0}}}',
			tags: [],
			folder: "work",
			createdAt: daysAgo(3),
			updatedAt: daysAgo(3),
			archived: false,
		},
		{
			id: generateId(),
			title: "Book Recommendations",
			content:
				'{"7a2d54b2-8dd6-4953-a1a3-e47c6a610114":{"id":"7a2d54b2-8dd6-4953-a1a3-e47c6a610114","type":"Paragraph","value":[{"id":"db4f4d3d-446b-4290-83e5-1cf5557569d7","type":"paragraph","children":[{"text":"Books to read","underline":true}]}],"meta":{"order":0,"depth":0}},"ccad4c65-4642-4f5d-9244-9d48faddd1ae":{"id":"ccad4c65-4642-4f5d-9244-9d48faddd1ae","type":"BulletedList","meta":{"order":1,"depth":0},"value":[{"id":"2cd598bf-0c1f-40a4-a82e-ef2ccecd33c2","type":"bulleted-list","children":[{"text":"Atomic Habits","italic":true},{"text":" by James Clear"}]}]},"e76d495c-1492-4e5f-b803-69644e2a1739":{"id":"e76d495c-1492-4e5f-b803-69644e2a1739","type":"BulletedList","meta":{"order":2,"depth":0},"value":[{"id":"6a422bac-1aa0-4d34-b8cd-dede36eed8a9","type":"bulleted-list","children":[{"text":"Deep Work","italic":true},{"text":" by Cal Newport"}]}]},"f7bae096-88fd-4de5-b574-7849c5136263":{"id":"f7bae096-88fd-4de5-b574-7849c5136263","type":"BulletedList","meta":{"order":3,"depth":0},"value":[{"id":"20d55f8e-d6fc-4787-bbe8-1f84d2db7f14","type":"bulleted-list","children":[{"text":"The Psychology of Money","italic":true},{"text":" by Morgan Housel"}]}]},"963289c6-835e-41ed-ae14-e99368bb7ca4":{"id":"963289c6-835e-41ed-ae14-e99368bb7ca4","type":"Paragraph","value":[{"id":"2cf668b5-6a76-42ed-8719-1bfab6e2b708","type":"paragraph","children":[{"text":""}]}],"meta":{"align":"left","depth":0,"order":4}}}',
			tags: [],
			folder: "personal",
			createdAt: daysAgo(10),
			updatedAt: daysAgo(4),
			archived: false,
		},
		{
			id: generateId(),
			title: "App Feature Ideas",
			content:
				'{"99a9b1be-21a0-431b-934e-267dadb7de18":{"id":"99a9b1be-21a0-431b-934e-267dadb7de18","type":"NumberedList","meta":{"order":1,"depth":0},"value":[{"id":"9d07b27b-ed06-442c-b078-1b7f77f6a48f","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"Additional themes"}]}]},"c5ac2094-93fa-46a1-b1ba-6887c0cb0117":{"id":"c5ac2094-93fa-46a1-b1ba-6887c0cb0117","type":"NumberedList","meta":{"order":2,"depth":0},"value":[{"id":"9e274bfc-8966-4c21-a537-fe5aca5adad5","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"Export to PDF"}]}]},"5ce91dd9-bd85-4481-9d31-27e50633fa37":{"id":"5ce91dd9-bd85-4481-9d31-27e50633fa37","type":"NumberedList","meta":{"order":3,"depth":0},"value":[{"id":"86e7e3a8-16a9-4bfc-a916-bbacbfb5f89d","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"Cloud sync"}]}]},"e1a53903-2fa1-4cfb-b7f0-4586df055130":{"id":"e1a53903-2fa1-4cfb-b7f0-4586df055130","type":"NumberedList","meta":{"order":4,"depth":0},"value":[{"id":"10a44e9c-de34-419c-90b8-c34117272b18","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"Mobile companion app"}]}]},"b75fc683-8fb6-4ef1-a90e-79ece7c4ae12":{"id":"b75fc683-8fb6-4ef1-a90e-79ece7c4ae12","type":"NumberedList","meta":{"order":5,"depth":0},"value":[{"id":"dfb5b244-96c6-4990-a0a7-ed5e835c4299","type":"numbered-list","props":{"nodeType":"block"},"children":[{"text":"AI-powered suggestions"}]}]},"80f82c3d-ceaa-4c7e-b35a-1a64d4deebe2":{"id":"80f82c3d-ceaa-4c7e-b35a-1a64d4deebe2","type":"HeadingThree","meta":{"order":0,"depth":0},"value":[{"id":"b96729c1-d792-48a6-b040-a159785f276f","type":"heading-three","props":{"nodeType":"block"},"children":[{"text":"Potential features to explore"}]}]}}',
			tags: [],
			folder: "ideas",
			createdAt: daysAgo(14),
			updatedAt: daysAgo(1),
			archived: false,
		},
		{
			id: generateId(),
			title: "Grocery List Template",
			content:
				'{"a69cf80f-930f-447f-b0c6-6f756855ecfc":{"id":"a69cf80f-930f-447f-b0c6-6f756855ecfc","type":"TodoList","meta":{"depth":0,"order":1},"value":[{"id":"f4dd7e72-7af7-4617-83cb-e84199447d7b","type":"todo-list","props":{"checked":false},"children":[{"text":"Fruits and vegetables"}]}]},"0b888d81-d386-48be-8f1d-5844320dbdac":{"id":"0b888d81-d386-48be-8f1d-5844320dbdac","type":"TodoList","meta":{"order":2,"depth":0},"value":[{"id":"f4dd7e72-7af7-4617-83cb-e84199447d7b","type":"todo-list","props":{"checked":false},"children":[{"text":"Dairy products"}]}]},"c5ca5045-a71c-4501-a634-152d32c2f949":{"id":"c5ca5045-a71c-4501-a634-152d32c2f949","type":"TodoList","meta":{"order":3,"depth":0},"value":[{"id":"f4dd7e72-7af7-4617-83cb-e84199447d7b","type":"todo-list","props":{"checked":false},"children":[{"text":"Bread"}]}]},"78b886e6-4cab-4799-a774-38a6fd152f74":{"id":"78b886e6-4cab-4799-a774-38a6fd152f74","type":"TodoList","meta":{"order":4,"depth":0},"value":[{"id":"f4dd7e72-7af7-4617-83cb-e84199447d7b","type":"todo-list","props":{"checked":false},"children":[{"text":"Proteins"}]}]},"b841a065-8590-45a2-997f-3da1076aca5d":{"id":"b841a065-8590-45a2-997f-3da1076aca5d","type":"TodoList","meta":{"order":5,"depth":0},"value":[{"id":"f4dd7e72-7af7-4617-83cb-e84199447d7b","type":"todo-list","props":{"checked":false},"children":[{"text":"Snacks"}]}]},"31ef8ec7-25cf-449d-bb0c-430d30116a20":{"id":"31ef8ec7-25cf-449d-bb0c-430d30116a20","type":"HeadingThree","meta":{"order":0,"depth":0},"value":[{"id":"69e0feca-e45c-4c3f-88c0-bb3329c8a709","type":"heading-three","props":{"nodeType":"block"},"children":[{"text":"Weekly essentials:"}]}]}}',
			tags: [],
			folder: "personal",
			createdAt: daysAgo(20),
			updatedAt: daysAgo(6),
			archived: false,
		},
		{
			id: generateId(),
			title: "Old Project Notes",
			content:
				'{"8561d8f6-9c01-4129-9927-36875a3c9a7a":{"id":"8561d8f6-9c01-4129-9927-36875a3c9a7a","type":"Paragraph","value":[{"id":"a188cf5a-d7f9-4bd9-93de-521b6cf3b5ab","type":"paragraph","children":[{"text":"These are archived notes from a completed project. Kept for reference."}]}],"meta":{"order":0,"depth":0}}}',
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
	baseExpense: Omit<
		Expense,
		| "id"
		| "dueDate"
		| "isPaid"
		| "paymentDate"
		| "parentExpenseId"
		| "initialState"
	>,
	dayOfMonth: number,
	months: number = 12,
	paidCount: number = 0,
): Expense[] => {
	const now = new Date();
	return Array.from({ length: months }, (_, i) => i).map((month) => {
		const dueDate = new Date(
			now.getFullYear(),
			now.getMonth() + month,
			dayOfMonth,
		);
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
	const rentOccurrences = generateRecurringOccurrences(
		rentId,
		rentBase,
		1,
		12,
		2,
	);
	const electricityOccurrences = generateRecurringOccurrences(
		electricityId,
		electricityBase,
		15,
		12,
		1,
	);
	const internetOccurrences = generateRecurringOccurrences(
		internetId,
		internetBase,
		20,
		12,
		2,
	);
	const phonePlanOccurrences = generateRecurringOccurrences(
		phonePlanId,
		phonePlanBase,
		25,
		12,
		1,
	);
	const streamingOccurrences = generateRecurringOccurrences(
		streamingId,
		streamingBase,
		10,
		12,
		2,
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
			const amount =
				Math.round((hours + minutes / 60) * hourlyRate * 100) / 100;

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
const createSampleWeeklyTargets = (): IncomeWeeklyTargets[] => [
	{ id: generateId(), amount: 800 },
];

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
