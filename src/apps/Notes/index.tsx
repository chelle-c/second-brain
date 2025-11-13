import { useState, useEffect } from "react";
import { Capture } from "./components/Capture";
import { FolderNav } from "./components/FolderNav";
import { NotesCard } from "./components/NotesCard";
import { useNotesStore } from "@/stores/useNotesStore";
import { Category, NotesFolder, NotesFolders, Subfolder } from "@/types/notes";
import { Button } from "@/components/ui/button";
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

	return (
		<div className="w-full">
			{/* Header */}
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-3xl font-bold text-gray-800 mb-2">Notes App</h1>
					<p className="text-gray-600">Capture now, organize later</p>
				</div>
				{!captureNewNote && (
					<Button
						type="button"
						onClick={() => setCaptureNewNote(true)}
						className="flex px-6 py-2 bg-blue-500 text-white rounded-lg shadow-sm shadow-blue-600 hover:bg-blue-600 transition-colors cursor-pointer"
					>
						New Note
					</Button>
				)}
			</div>

			{/* Quick Capture - Always Visible */}
			{captureNewNote && (
				<Capture categories={categories} setCaptureNewNote={setCaptureNewNote} />
			)}

			<div className="flex flex-col lg:flex-row gap-4">
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
				<div className="w-full flex flex-col gap-4">
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
					/>
				</div>
			</div>
		</div>
	);
}
