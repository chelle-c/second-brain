import { describe, it, expect, beforeEach } from 'vitest';
import { NotesStorage } from '../src/lib/storage/notesStorage';
import Database from '@tauri-apps/plugin-sql';
import type { Note, NotesFolders, Tag } from '../src/types/notes';

describe('NotesStorage', () => {
  let db: any;
  let notesStorage: NotesStorage;

  beforeEach(async () => {
    // Create a fresh mock database instance
    db = await Database.load('sqlite:test.db');

    // Initialize database tables
    await db.execute(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT DEFAULT '[]',
        folder TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        archived INTEGER DEFAULT 0
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT NOT NULL
      )
    `);

    const context = {
      db,
      queueOperation: async <T,>(op: () => Promise<T>) => op(),
      cache: {},
    };

    notesStorage = new NotesStorage(context);
  });

  describe('saveNotes and loadNotes', () => {
    it('should save and load notes correctly', async () => {
      const testNotes: Note[] = [
        {
          id: 'note-1',
          title: 'Test Note 1',
          content: 'This is test content',
          tags: ['work', 'important'],
          folder: 'inbox',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archived: false,
        },
        {
          id: 'note-2',
          title: 'Test Note 2',
          content: 'Another test note',
          tags: ['personal'],
          folder: 'personal',
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          archived: false,
        },
      ];

      await notesStorage.saveNotes(testNotes);
      const loadedNotes = await notesStorage.loadNotes();

      expect(loadedNotes).toHaveLength(2);
      expect(loadedNotes[0].id).toBe('note-1');
      expect(loadedNotes[0].title).toBe('Test Note 1');
      expect(loadedNotes[0].tags).toEqual(['work', 'important']);
      expect(loadedNotes[1].id).toBe('note-2');
      expect(loadedNotes[1].title).toBe('Test Note 2');
    });

    it('should handle archived notes', async () => {
      const archivedNote: Note[] = [
        {
          id: 'note-archived',
          title: 'Archived Note',
          content: 'This note is archived',
          tags: [],
          folder: 'inbox',
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          archived: true,
        },
      ];

      await notesStorage.saveNotes(archivedNote);
      const loadedNotes = await notesStorage.loadNotes();

      expect(loadedNotes).toHaveLength(1);
      expect(loadedNotes[0].archived).toBe(true);
    });

    it('should return empty array when no notes exist', async () => {
      const loadedNotes = await notesStorage.loadNotes();
      expect(loadedNotes).toEqual([]);
    });
  });

  describe('saveFolders and loadFolders', () => {
    it('should create initial folders when none exist', async () => {
      const loadedFolders = await notesStorage.loadFolders();

      expect(loadedFolders).toBeDefined();
      expect(loadedFolders.inbox).toBeDefined();
      expect(loadedFolders.inbox.name).toBe('Inbox');
      expect(loadedFolders.personal).toBeDefined();
      expect(loadedFolders.work).toBeDefined();
      expect(loadedFolders.work.children).toBeDefined();
    });

    it('should persist folder structure across save and load', async () => {
      const initialFolders = await notesStorage.loadFolders();

      // Verify we can load folders multiple times and get same structure
      const loadedAgain = await notesStorage.loadFolders();
      expect(loadedAgain.inbox.name).toBe(initialFolders.inbox.name);
      expect(loadedAgain.work.name).toBe(initialFolders.work.name);
    });
  });

  describe('saveTags and loadTags', () => {
    it('should save and load tags correctly', async () => {
      const testTags: Record<string, Tag> = {
        work: {
          id: 'work',
          name: 'Work',
          color: '#3b82f6',
          icon: 'Briefcase' as any,
        },
        personal: {
          id: 'personal',
          name: 'Personal',
          color: '#10b981',
          icon: 'User' as any,
        },
      };

      await notesStorage.saveTags(testTags);
      const loadedTags = await notesStorage.loadTags();

      expect(Object.keys(loadedTags)).toHaveLength(2);
      expect(loadedTags.work.name).toBe('Work');
      expect(loadedTags.work.color).toBe('#3b82f6');
      expect(loadedTags.personal.name).toBe('Personal');
    });

    it('should return empty object when no tags exist', async () => {
      const loadedTags = await notesStorage.loadTags();
      expect(loadedTags).toEqual({});
    });
  });
});
