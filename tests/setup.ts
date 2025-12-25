import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Mock Tauri database plugin
vi.mock("@tauri-apps/plugin-sql", () => {
	return {
		default: class MockDatabase {
			private data: Map<string, any[]> = new Map();
			private schemas: Map<string, string[]> = new Map();

			static async load(_path: string) {
				return new MockDatabase();
			}

			async execute(sql: string, params?: any[]): Promise<any> {
				// Handle table creation
				if (sql.includes("CREATE TABLE")) {
					return { rowsAffected: 0 };
				}

				// Handle DELETE
				if (sql.startsWith("DELETE FROM")) {
					const tableName = sql.match(/DELETE FROM (\w+)/)?.[1];
					if (tableName) {
						this.data.set(tableName, []);
					}
					return { rowsAffected: 0 };
				}

				// Handle INSERT
				if (sql.startsWith("INSERT")) {
					const tableName = sql.match(/INSERT (?:OR REPLACE )?INTO (\w+)/)?.[1];
					if (tableName && params) {
						// Extract column names from INSERT statement
						const columnsMatch = sql.match(/\(([^)]+)\)/);
						if (columnsMatch) {
							const columns = columnsMatch[1].split(",").map((c) => c.trim());
							this.schemas.set(tableName, columns);

							// Convert params array to object
							const row: any = {};
							columns.forEach((col, idx) => {
								row[col] = params[idx];
							});

							const tableData = this.data.get(tableName) || [];

							// Handle INSERT OR REPLACE - replace if id exists
							if (sql.includes("INSERT OR REPLACE")) {
								const idIndex = columns.indexOf("id");
								const existingIndex = tableData.findIndex(
									(r: any) => r.id === params[idIndex],
								);
								if (existingIndex >= 0) {
									tableData[existingIndex] = row;
								} else {
									tableData.push(row);
								}
							} else {
								tableData.push(row);
							}

							this.data.set(tableName, tableData);
						}
					}
					return { rowsAffected: 1 };
				}

				// Handle PRAGMA
				if (sql.startsWith("PRAGMA")) {
					return { rowsAffected: 0 };
				}

				return { rowsAffected: 0 };
			}

			async select<T>(sql: string, params?: any[]): Promise<T> {
				// Handle SELECT queries
				const tableName = sql.match(/FROM (\w+)/)?.[1];

				if (!tableName) {
					return [] as T;
				}

				const tableData = this.data.get(tableName) || [];

				// Handle WHERE clauses for specific queries
				if (sql.includes("WHERE")) {
					if (sql.includes("WHERE id = 1")) {
						const found = tableData.find(
							(row: any) => row.id === 1 || row.id === "1",
						);
						return (found ? [found] : []) as T;
					}
					if (sql.includes("WHERE key =")) {
						// For settings table - match by key
						const keyMatch = sql.match(/WHERE key = '([^']+)'/);
						const key = keyMatch ? keyMatch[1] : params?.[0];
						const found = tableData.find((row: any) => row.key === key);
						return (found ? [found] : []) as T;
					}
				}

				// Return the data stored as objects
				return tableData as T;
			}

			// Utility method for tests to insert mock data
			_setMockData(tableName: string, data: any[]) {
				this.data.set(tableName, data);
			}

			// Utility method for tests to get mock data
			_getMockData(tableName: string) {
				return this.data.get(tableName) || [];
			}
		},
	};
});

// Mock Tauri path plugin
vi.mock("@tauri-apps/api/path", () => ({
	appDataDir: vi.fn(async () => "mock-app-data-dir"),
}));

// Mock Tauri opener plugin
vi.mock("@tauri-apps/plugin-opener", () => ({
	openPath: vi.fn(async () => {}),
}));
