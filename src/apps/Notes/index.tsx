import { useState, useEffect } from "react";
import { Capture } from "./components/Capture";
import { FolderNav } from "./components/FolderNav";
import { CategoryCard } from "./components/CategoryCard";
import { NotesCard } from "./components/NotesCard";
import useAppStore from "../../stores/useAppStore";
import { Category, NotesFolder, NotesFolders, Subfolder } from "../../types";
import { Button } from "@/components/ui/button";
import { CheckCircle, Lightbulb, BookOpen, Archive, Hash } from "lucide-react";

// Separate sections into components
// TODO: Fix notes "Move to" submenu to include subfolders
// TODO: Add ability to add, edit and delete top-level folders

export function NotesApp() {
	const { notes, notesFolders } = useAppStore();
	const [captureNewNote, setCaptureNewNote] = useState(false);
	const [activeFolder, setActiveFolder] = useState<NotesFolder | Subfolder | null>(null);
	const [activeCategory, setActiveCategory] = useState("all");

	const categories: Record<string, Category> = {
		all: { name: "All", icon: Hash },
		actions: { name: "Actions", icon: CheckCircle },
		ideas: { name: "Ideas", icon: Lightbulb },
		reference: { name: "Reference", icon: BookOpen },
		archive: { name: "Archive", icon: Archive },
	};

	const getAllFolders = () => {
		// notesFolders already contains the hierarchical structure
		// Just ensure children arrays are initialized
		const folders = { ...notesFolders };
		Object.values(folders).forEach((folder) => {
			if (!folder.children) {
				folder.children = [];
			}
		});
		return folders;
	};

	const allFolders: NotesFolders = getAllFolders();

	useEffect(() => {
		setActiveFolder(allFolders["inbox"]);
	}, []);

	const getNoteCount = (folderId: string, categoryId?: string) => {
		if (categoryId) {
			return notes.filter((n) => n.folder === folderId && n.category === categoryId).length;
		}
		return notes.filter((n) => n.folder === folderId).length;
	};

	const getCurrentFolder = (id: string): NotesFolder | Subfolder => {
		// Drill down into folder children to find subfolder first
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
		<div className="min-h-screen bg-gray-50 p-4">
			<div className="max-w-6xl mx-auto">
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
				{captureNewNote && <Capture setCaptureNewNote={setCaptureNewNote} />}

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
					<div className="flex flex-col lg:col-span-3 gap-4">
						{/* Category Filter - Only show if not in Inbox */}
						{activeFolder && activeFolder.id !== "inbox" && (
							<CategoryCard
								categories={categories}
								getNoteCount={getNoteCount}
								activeFolder={activeFolder}
								activeCategory={activeCategory}
								setActiveCategory={setActiveCategory}
							/>
						)}

						<NotesCard
							allFolders={allFolders}
							activeFolder={activeFolder}
							setActiveFolder={setActiveFolder}
							getCurrentFolder={getCurrentFolder}
							categories={categories}
							activeCategory={activeCategory}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
