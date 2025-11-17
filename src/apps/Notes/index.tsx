import { useState, useEffect } from "react";
import { Capture } from "./components/Capture";
import { FolderNav } from "./components/FolderNav";
import { NotesCard } from "./components/NotesCard";
import { useNotesStore } from "@/stores/useNotesStore";
import { Category, NotesFolder, NotesFolders, Subfolder } from "@/types/notes";
import { CheckCircle, Lightbulb, BookOpen, Archive, Hash, FileWarning } from "lucide-react";

// TODO: Add ability to add, edit and delete top-level folders

export function NotesApp() {
	const { notes, notesFolders } = useNotesStore();
	const [captureNewNote, setCaptureNewNote] = useState<boolean>(false);
	const [activeFolder, setActiveFolder] = useState<NotesFolder | Subfolder | null>(null);
	const [activeCategory, setActiveCategory] = useState<string>("all");

	const categories: Record<string, Category> = {
		all: { name: "All", icon: Hash },
		actions: { name: "Actions", icon: CheckCircle },
		ideas: { name: "Ideas", icon: Lightbulb },
		reference: { name: "Reference", icon: BookOpen },
		archive: { name: "Archive", icon: Archive },
		uncategorized: { name: "Uncategorized", icon: FileWarning },
	};

	const allFolders: NotesFolders = { ...notesFolders };

	useEffect(() => {
		setActiveFolder(allFolders["inbox"]);
	}, []);

	const getNoteCount = (folderId: string, categoryId?: string) => {
		if (categoryId) {
			return notes.filter((n) => n.folder.includes(folderId) && n.category === categoryId)
				.length;
		}
		return notes.filter((n) => n.folder.includes(folderId)).length;
	};

	const getCurrentFolder = (id: string): NotesFolder | Subfolder => {
		const currentFolder = Object.values(allFolders).find((f) => f.id === id);
		if (currentFolder === undefined) {
			const currentSubfolder = Object.values(allFolders).find(
				(f) => f.children && f.children.find((c) => c.id === id)
			);
			return currentSubfolder?.children?.find((c) => c.id === id) as Subfolder;
		}
		return currentFolder ? currentFolder : { id: "inbox", name: "Inbox" };
	};	

	const handleOpenNoteModal = () => {
		setCaptureNewNote(true);
	};

	return (
		<div className="w-full animate-fadeIn">
			{/* Quick Capture Modal */}
			{captureNewNote && (
				<Capture categories={categories} setCaptureNewNote={setCaptureNewNote} />
			)}

			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				{/* Sidebar */}
				<div className="lg:col-span-1 space-y-4">
					{/* Folder Navigation */}
					<FolderNav
						allFolders={allFolders}
						activeFolder={activeFolder}
						setActiveFolder={setActiveFolder}
						getCurrentFolder={getCurrentFolder}
						setActiveCategory={setActiveCategory}
						getNoteCount={getNoteCount}
					/>
				</div>

				{/* Main Content */}
				<div className="lg:col-span-3 w-full flex flex-col gap-4">
					{/* Category Filter - Only show if not in Inbox */}
					<NotesCard
						allFolders={allFolders}
						activeFolder={activeFolder}
						setActiveFolder={setActiveFolder}
						getCurrentFolder={getCurrentFolder}
						categories={categories}
						activeCategory={activeCategory}
						getNoteCount={getNoteCount}
						setActiveCategory={setActiveCategory}
						setCaptureNewNote={handleOpenNoteModal}
					/>
				</div>
			</div>
		</div>
	);
}
