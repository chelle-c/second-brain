import { describe, it, expect, beforeEach } from 'vitest';
import { ExpensesStorage } from '../src/lib/storage/expensesStorage';
import Database from '@tauri-apps/plugin-sql';
import type { Expense } from '../src/types/expense';
import type { AppData } from '../src/types/';

describe('ExpensesStorage', () => {
  let db: any;
  let expensesStorage: ExpensesStorage;

  beforeEach(async () => {
    // Create a fresh mock database instance
    db = await Database.load('sqlite:test.db');

    // Initialize database tables
    await db.execute(`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        dueDate TEXT,
        isRecurring INTEGER NOT NULL,
        recurrence TEXT,
        isArchived INTEGER NOT NULL,
        isPaid INTEGER NOT NULL,
        paymentDate TEXT,
        type TEXT NOT NULL,
        importance TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        parentExpenseId TEXT,
        monthlyOverrides TEXT,
        isModified INTEGER,
        initialState TEXT
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
      queueOperation: async <T,>(op: () => Promise<T>) => op(),
      cache: {},
    };

    expensesStorage = new ExpensesStorage(context);
  });

  describe('saveExpenses and loadExpenses', () => {
    it('should save and load expenses correctly', async () => {
      const testExpenses: AppData['expenses'] = {
        expenses: [
          {
            id: 'expense-1',
            name: 'Rent',
            amount: 1200,
            category: 'Housing',
            dueDate: new Date('2024-01-01'),
            isRecurring: true,
            recurrence: {
              frequency: 'monthly',
            },
            isArchived: false,
            isPaid: false,
            type: 'need',
            importance: 'critical',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            monthlyOverrides: {},
          },
          {
            id: 'expense-2',
            name: 'Coffee',
            amount: 5.5,
            category: 'Food',
            dueDate: new Date('2024-01-15'),
            isRecurring: false,
            isArchived: false,
            isPaid: true,
            paymentDate: new Date('2024-01-15'),
            type: 'want',
            importance: 'none',
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15'),
            monthlyOverrides: {},
          },
        ],
        selectedMonth: new Date('2024-01-01'),
        overviewMode: 'remaining',
        categories: ['Housing', 'Food', 'Transport'],
        categoryColors: {
          Housing: '#3b82f6',
          Food: '#10b981',
          Transport: '#f59e0b',
        },
      };

      await expensesStorage.saveExpenses(testExpenses);
      const loadedExpenses = await expensesStorage.loadExpenses();

      expect(loadedExpenses.expenses).toHaveLength(2);
      expect(loadedExpenses.expenses[0].name).toBe('Rent');
      expect(loadedExpenses.expenses[0].amount).toBe(1200);
      expect(loadedExpenses.expenses[0].isRecurring).toBe(true);
      expect(loadedExpenses.expenses[1].name).toBe('Coffee');
      expect(loadedExpenses.expenses[1].isPaid).toBe(true);
    });

    it('should handle recurring expenses with different frequencies', async () => {
      const recurringExpense: AppData['expenses'] = {
        expenses: [
          {
            id: 'weekly-expense',
            name: 'Weekly Grocery',
            amount: 100,
            category: 'Food',
            dueDate: new Date('2024-01-01'),
            isRecurring: true,
            recurrence: {
              frequency: 'weekly',
              interval: 1,
            },
            isArchived: false,
            isPaid: false,
            type: 'need',
            importance: 'high',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            monthlyOverrides: {},
          },
        ],
        selectedMonth: new Date('2024-01-01'),
        overviewMode: 'all',
        categories: ['Food'],
        categoryColors: { Food: '#10b981' },
      };

      await expensesStorage.saveExpenses(recurringExpense);
      const loadedExpenses = await expensesStorage.loadExpenses();

      expect(loadedExpenses.expenses[0].recurrence?.frequency).toBe('weekly');
      expect(loadedExpenses.expenses[0].recurrence?.interval).toBe(1);
    });

    it('should load default values when no expenses exist', async () => {
      const loadedExpenses = await expensesStorage.loadExpenses();

      expect(loadedExpenses.expenses).toEqual([]);
      expect(loadedExpenses.overviewMode).toBe('remaining');
      expect(loadedExpenses.categories).toBeDefined();
      expect(loadedExpenses.categoryColors).toBeDefined();
    });
  });

  describe('change detection', () => {
    it('should detect changes in expenses', async () => {
      const initialExpenses: AppData['expenses'] = {
        expenses: [
          {
            id: 'expense-1',
            name: 'Initial',
            amount: 100,
            category: 'Test',
            dueDate: null,
            isRecurring: false,
            isArchived: false,
            isPaid: false,
            type: 'need',
            importance: 'medium',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01'),
            monthlyOverrides: {},
          },
        ],
        selectedMonth: new Date('2024-01-01'),
        overviewMode: 'remaining',
        categories: ['Test'],
        categoryColors: { Test: '#000000' },
      };

      await expensesStorage.saveExpenses(initialExpenses);

      // Modify the expense
      const modifiedExpenses = {
        ...initialExpenses,
        expenses: [
          {
            ...initialExpenses.expenses[0],
            name: 'Modified',
            amount: 200,
          },
        ],
      };

      const hasChanged = expensesStorage.hasExpensesChanged(modifiedExpenses);
      expect(hasChanged).toBe(true);
    });
  });
});
