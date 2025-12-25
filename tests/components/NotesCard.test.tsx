import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Lightbulb, Target } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotesCard } from "@/apps/Notes/components/NotesCard";
import { useNotesStore } from "@/stores/useNotesStore";
import type { Note, NotesFolders, Tag } from "@/types/notes";

vi.mock("@/stores/useNotesStore");

// Mock the dropdown menu component
vi.mock("@/apps/Notes/components/NotesDropdownMenu", () => ({
	NotesDropdownMenu: () => <div data-testid="dropdown-menu">Dropdown</div>,
}));

// Mock TagFilter
vi.mock("@/apps/Notes/components/TagFilter", () => ({
	TagFilter: ({ activeTags }: any) => (
		<div data-testid="tag-filter">Tag Filter: {activeTags.length} active</div>
	),
}));

describe("NotesCard", () => {
	const mockFolders: NotesFolders = {
		inbox: { id: "inbox", name: "Inbox", children: [] },
		personal: { id: "personal", name: "Personal", children: [] },
		work: { id: "work", name: "Work", children: [] },
	};

	const mockTags: Record<string, Tag> = {
		ideas: {
			id: "ideas",
			name: "Ideas",
			color: "#3b82f6",
			icon: Lightbulb,
		},
		actions: {
			id: "actions",
			name: "Actions",
			color: "#10b981",
			icon: Target,
		},
	};

	const mockNotes: Note[] = [
		{
			id: "note-1",
			title: "First Note",
			content: "",
			tags: ["ideas"],
			folder: "inbox",
			createdAt: new Date("2024-01-01"),
			updatedAt: new Date("2024-01-01"),
			archived: false,
		},
		{
			id: "note-2",
			title: "Second Note",
			content: "",
			tags: ["actions"],
			folder: "inbox",
			createdAt: new Date("2024-01-02"),
			updatedAt: new Date("2024-01-02"),
			archived: false,
		},
		{
			id: "note-3",
			title: "Archived Note",
			content: "",
			tags: [],
			folder: "inbox",
			createdAt: new Date("2024-01-03"),
			updatedAt: new Date("2024-01-03"),
			archived: true,
		},
	];

	const mockSetActiveFolder = vi.fn();
	const mockSetActiveTags = vi.fn();
	const mockOnSelectNote = vi.fn();
	const mockSetViewMode = vi.fn();
	const mockOnUndo = vi.fn();
	const mockOnRedo = vi.fn();
	const mockGetCurrentFolder = vi.fn(
		(id: string) => mockFolders[id] || mockFolders.inbox,
	);
	const mockGetNoteCount = vi.fn(() => 2);

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useNotesStore).mockReturnValue({
			notes: mockNotes,
		} as any);
	});

	it("should display folder name", () => {
		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={[]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="active"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		expect(screen.getByText("Inbox")).toBeInTheDocument();
	});

	it("should display note count", () => {
		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={[]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="active"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		// Should show (2) for 2 active notes in inbox
		expect(screen.getByText("(2)")).toBeInTheDocument();
	});

	it("should render search input", () => {
		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={[]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="active"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		expect(screen.getByPlaceholderText("Search notes...")).toBeInTheDocument();
	});

	it("should display active notes when viewMode is active", () => {
		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={[]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="active"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		expect(screen.getByText("First Note")).toBeInTheDocument();
		expect(screen.getByText("Second Note")).toBeInTheDocument();
		expect(screen.queryByText("Archived Note")).not.toBeInTheDocument();
	});

	it("should display archived notes when viewMode is archived", () => {
		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={[]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="archived"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		expect(screen.getByText("Archived Note")).toBeInTheDocument();
		expect(screen.queryByText("First Note")).not.toBeInTheDocument();
		expect(screen.queryByText("Second Note")).not.toBeInTheDocument();
	});

	it("should call onSelectNote when note is clicked", async () => {
		const user = userEvent.setup();
		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={[]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="active"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		// Click on the button overlay using its aria-label (the button covers the entire card)
		await user.click(
			screen.getByRole("button", { name: "Open note: First Note" }),
		);
		expect(mockOnSelectNote).toHaveBeenCalledWith("note-1");
	});

	it("should filter notes by search term", async () => {
		const user = userEvent.setup();
		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={[]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="active"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		const searchInput = screen.getByPlaceholderText("Search notes...");
		await user.type(searchInput, "First");

		expect(screen.getByText("First Note")).toBeInTheDocument();
		expect(screen.queryByText("Second Note")).not.toBeInTheDocument();
	});

	it("should display empty state when no notes match", async () => {
		const user = userEvent.setup();
		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={[]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="active"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		const searchInput = screen.getByPlaceholderText("Search notes...");
		await user.type(searchInput, "NonexistentNote");

		expect(
			screen.getByText(/try a different search term/i),
		).toBeInTheDocument();
	});

	it("should display note tags", () => {
		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={[]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="active"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		expect(screen.getByText("Ideas")).toBeInTheDocument();
		expect(screen.getByText("Actions")).toBeInTheDocument();
	});

	it("should show TagFilter component", () => {
		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={[]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="active"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		expect(screen.getByTestId("tag-filter")).toBeInTheDocument();
	});

	it("should filter notes by active tags", () => {
		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={["ideas"]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="active"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		expect(screen.getByText("First Note")).toBeInTheDocument();
		expect(screen.queryByText("Second Note")).not.toBeInTheDocument();
	});

	it('should show "Untitled" for notes without title', () => {
		const notesWithUntitled = [
			{
				id: "note-4",
				title: "",
				content: "",
				tags: [],
				folder: "inbox",
				createdAt: new Date(),
				updatedAt: new Date(),
				archived: false,
			},
		];

		vi.mocked(useNotesStore).mockReturnValue({
			notes: notesWithUntitled,
		} as any);

		render(
			<NotesCard
				allFolders={mockFolders}
				activeFolder={mockFolders.inbox}
				setActiveFolder={mockSetActiveFolder}
				getCurrentFolder={mockGetCurrentFolder}
				tags={mockTags}
				activeTags={[]}
				getNoteCount={mockGetNoteCount}
				setActiveTags={mockSetActiveTags}
				onSelectNote={mockOnSelectNote}
				viewMode="active"
				setViewMode={mockSetViewMode}
				canUndo={false}
				canRedo={false}
				onUndo={mockOnUndo}
				onRedo={mockOnRedo}
			/>,
		);

		expect(screen.getByText("Untitled")).toBeInTheDocument();
	});
});
