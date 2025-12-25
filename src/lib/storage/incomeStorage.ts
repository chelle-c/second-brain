import type { AppData } from "@/types/";
import type { DatabaseContext } from "../../types/storage";
import { deepEqual } from "../utils";

export class IncomeStorage {
	private context: DatabaseContext;

	constructor(context: DatabaseContext) {
		this.context = context;
	}

	private normalizeIncome(income: AppData["income"]): any {
		return {
			entries: [...income.entries].sort((a, b) => a.id.localeCompare(b.id)),
			weeklyTargets: [...income.weeklyTargets].sort((a, b) =>
				a.id.localeCompare(b.id),
			),
			viewType: income.viewType,
		};
	}

	hasIncomeChanged(newIncome: AppData["income"]): boolean {
		if (!this.context.cache.income) return true;

		const normalized1 = this.normalizeIncome(this.context.cache.income);
		const normalized2 = this.normalizeIncome(newIncome);

		return !deepEqual(normalized1, normalized2);
	}

	async loadIncome(): Promise<AppData["income"]> {
		return this.context.queueOperation(async () => {
			const entries = await this.context.db.select<
				Array<{
					id: string;
					date: string;
					amount: number;
					hours: number | null;
					minutes: number | null;
				}>
			>("SELECT * FROM income_entries");

			const targets = await this.context.db.select<
				Array<{ id: string; amount: number }>
			>("SELECT * FROM income_weekly_targets");

			const viewTypeResult = await this.context.db.select<
				Array<{ value: string }>
			>("SELECT value FROM settings WHERE key = 'income_viewType'");

			const incomeData = {
				entries: entries.map((row) => ({
					id: row.id,
					date: row.date,
					amount: row.amount,
					hours: row.hours || undefined,
					minutes: row.minutes || undefined,
				})),
				weeklyTargets: targets,
				viewType:
					viewTypeResult.length > 0
						? (viewTypeResult[0].value as any)
						: "weekly",
			};

			this.context.cache.income = incomeData;
			return incomeData;
		});
	}

	async saveIncome(income: AppData["income"]): Promise<void> {
		if (!this.hasIncomeChanged(income)) {
			return;
		}

		return this.context.queueOperation(async () => {
			const oldIncome = this.context.cache.income;
			const oldEntryIds = new Set(oldIncome?.entries.map((e) => e.id) || []);
			const newEntryIds = new Set(income.entries.map((e) => e.id));
			const oldTargetIds = new Set(
				oldIncome?.weeklyTargets.map((t) => t.id) || [],
			);
			const newTargetIds = new Set(income.weeklyTargets.map((t) => t.id));

			// Determine what changed
			const addedEntries = income.entries.filter((e) => !oldEntryIds.has(e.id));
			const deletedEntries =
				oldIncome?.entries.filter((e) => !newEntryIds.has(e.id)) || [];
			const modifiedEntries = income.entries.filter((e) => {
				if (!oldEntryIds.has(e.id)) return false;
				const old = oldIncome?.entries.find((o) => o.id === e.id);
				return old && !deepEqual(old, e);
			});

			const addedTargets = income.weeklyTargets.filter(
				(t) => !oldTargetIds.has(t.id),
			);
			const deletedTargets =
				oldIncome?.weeklyTargets.filter((t) => !newTargetIds.has(t.id)) || [];
			const modifiedTargets = income.weeklyTargets.filter((t) => {
				if (!oldTargetIds.has(t.id)) return false;
				const old = oldIncome?.weeklyTargets.find((o) => o.id === t.id);
				return old && !deepEqual(old, t);
			});

			const viewTypeChanged =
				oldIncome && oldIncome.viewType !== income.viewType;

			await this.context.db.execute("DELETE FROM income_entries");
			await this.context.db.execute("DELETE FROM income_weekly_targets");

			const seenEntryIds = new Set<string>();
			const seenTargetIds = new Set<string>();

			for (const entry of income.entries) {
				if (seenEntryIds.has(entry.id)) {
					continue;
				}
				seenEntryIds.add(entry.id);

				await this.context.db.execute(
					`INSERT INTO income_entries (id, date, amount, hours, minutes)
					VALUES (?, ?, ?, ?, ?)`,
					[
						entry.id,
						entry.date,
						entry.amount,
						entry.hours || null,
						entry.minutes || null,
					],
				);
			}

			for (const target of income.weeklyTargets) {
				if (seenTargetIds.has(target.id)) {
					continue;
				}
				seenTargetIds.add(target.id);

				await this.context.db.execute(
					`INSERT INTO income_weekly_targets (id, amount)
					VALUES (?, ?)`,
					[target.id, target.amount],
				);
			}

			await this.context.db.execute(
				`INSERT OR REPLACE INTO settings (key, value) VALUES ('income_viewType', ?)`,
				[income.viewType],
			);

			this.context.cache.income = income;

			// Log specific changes
			if (addedEntries.length === 1) {
				console.log(`Income entry created: ${addedEntries[0].date}`);
			} else if (addedEntries.length > 1) {
				console.log(`${addedEntries.length} income entries created`);
			}
			if (deletedEntries.length === 1) {
				console.log(`Income entry deleted: ${deletedEntries[0].date}`);
			} else if (deletedEntries.length > 1) {
				console.log(`${deletedEntries.length} income entries deleted`);
			}
			if (modifiedEntries.length === 1) {
				console.log(`Income entry updated: ${modifiedEntries[0].date}`);
			} else if (modifiedEntries.length > 1) {
				console.log(`${modifiedEntries.length} income entries updated`);
			}
			if (
				addedTargets.length > 0 ||
				deletedTargets.length > 0 ||
				modifiedTargets.length > 0
			) {
				console.log("Weekly targets updated");
			}
			if (viewTypeChanged) {
				console.log(`Income view changed to: ${income.viewType}`);
			}
		});
	}
}
