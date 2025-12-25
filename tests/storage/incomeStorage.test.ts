import Database from "@tauri-apps/plugin-sql";
import { beforeEach, describe, expect, it } from "vitest";
import { IncomeStorage } from "@/lib/storage/incomeStorage";
import type { AppData } from "@/types";

describe("IncomeStorage", () => {
	let db: any;
	let incomeStorage: IncomeStorage;

	beforeEach(async () => {
		// Create a fresh mock database instance
		db = await Database.load("sqlite:test.db");

		// Initialize database tables
		await db.execute(`
      CREATE TABLE IF NOT EXISTS income_entries (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        hours INTEGER,
        minutes INTEGER
      )
    `);

		await db.execute(`
      CREATE TABLE IF NOT EXISTS income_weekly_targets (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL
      )
    `);

		await db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

		const context = {
			db,
			queueOperation: async <T>(op: () => Promise<T>) => op(),
			cache: {},
		};

		incomeStorage = new IncomeStorage(context);
	});

	describe("saveIncome and loadIncome", () => {
		it("should save and load income entries correctly", async () => {
			const testIncome: AppData["income"] = {
				entries: [
					{
						id: "income-1",
						date: "2024-01-01",
						amount: 500,
						hours: 8,
						minutes: 30,
					},
					{
						id: "income-2",
						date: "2024-01-02",
						amount: 300,
						hours: 5,
						minutes: 0,
					},
				],
				weeklyTargets: [
					{
						id: "target-1",
						amount: 1000,
					},
				],
				viewType: "weekly",
			};

			await incomeStorage.saveIncome(testIncome);
			const loadedIncome = await incomeStorage.loadIncome();

			expect(loadedIncome.entries).toHaveLength(2);
			expect(loadedIncome.entries[0].id).toBe("income-1");
			expect(loadedIncome.entries[0].amount).toBe(500);
			expect(loadedIncome.entries[0].hours).toBe(8);
			expect(loadedIncome.entries[0].minutes).toBe(30);
			expect(loadedIncome.entries[1].amount).toBe(300);
		});

		it("should save and load weekly targets", async () => {
			const testIncome: AppData["income"] = {
				entries: [],
				weeklyTargets: [
					{
						id: "target-weekly-1",
						amount: 1500,
					},
					{
						id: "target-weekly-2",
						amount: 2000,
					},
				],
				viewType: "weekly",
			};

			await incomeStorage.saveIncome(testIncome);
			const loadedIncome = await incomeStorage.loadIncome();

			expect(loadedIncome.weeklyTargets).toHaveLength(2);
			expect(loadedIncome.weeklyTargets[0].amount).toBe(1500);
			expect(loadedIncome.weeklyTargets[1].amount).toBe(2000);
			expect(loadedIncome.viewType).toBe("weekly");
		});

		it("should load default values when no income data exists", async () => {
			const loadedIncome = await incomeStorage.loadIncome();

			expect(loadedIncome.entries).toEqual([]);
			expect(loadedIncome.weeklyTargets).toEqual([]);
			expect(loadedIncome.viewType).toBe("weekly");
		});
	});

	describe("income entries without hours and minutes", () => {
		it("should handle income entries without hours and minutes", async () => {
			const testIncome: AppData["income"] = {
				entries: [
					{
						id: "income-no-time",
						date: "2024-01-03",
						amount: 250,
					},
				],
				weeklyTargets: [],
				viewType: "weekly",
			};

			await incomeStorage.saveIncome(testIncome);
			const loadedIncome = await incomeStorage.loadIncome();

			expect(loadedIncome.entries).toHaveLength(1);
			expect(loadedIncome.entries[0].amount).toBe(250);
			expect(loadedIncome.entries[0].hours).toBeUndefined();
			expect(loadedIncome.entries[0].minutes).toBeUndefined();
		});
	});

	describe("change detection", () => {
		it("should detect changes in income data", async () => {
			const initialIncome: AppData["income"] = {
				entries: [
					{
						id: "income-1",
						date: "2024-01-01",
						amount: 100,
					},
				],
				weeklyTargets: [],
				viewType: "weekly",
			};

			await incomeStorage.saveIncome(initialIncome);

			// Modify the income
			const modifiedIncome = {
				...initialIncome,
				entries: [
					{
						...initialIncome.entries[0],
						amount: 200,
					},
				],
			};

			const hasChanged = incomeStorage.hasIncomeChanged(modifiedIncome);
			expect(hasChanged).toBe(true);
		});

		it("should detect view type changes", async () => {
			const initialIncome: AppData["income"] = {
				entries: [],
				weeklyTargets: [],
				viewType: "weekly",
			};

			await incomeStorage.saveIncome(initialIncome);

			const modifiedIncome = {
				...initialIncome,
				viewType: "monthly" as const,
			};

			const hasChanged = incomeStorage.hasIncomeChanged(modifiedIncome);
			expect(hasChanged).toBe(true);
		});
	});
});
