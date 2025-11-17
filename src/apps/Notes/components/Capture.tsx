import { useState } from "react";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNotesStore } from "@/stores/useNotesStore";

export const Capture = ({ setCaptureNewNote, categories }: any) => {
	const { addNote } = useNotesStore();

	const [newNote, setNewNote] = useState({ title: "", content: "", category: "uncategorized" });

	const handleAddNote = (e: { preventDefault: () => void }) => {
		e.preventDefault();
		if (newNote.title.trim()) {
			addNote({
				...newNote,
				folder: "inbox",
			});
			setNewNote({ title: "", content: "", category: "uncategorized" });
			setCaptureNewNote(false);
		}
	};

	return (
		<div className="bg-white mb-6 p-4 rounded-lg shadow-sm">
			<div className="flex flex-col gap-2">
				<div className="flex flex-col flex-1 gap-2">
					<Input
						type="text"
						value={newNote.title}
						onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleAddNote(e);
						}}
						placeholder="Quick capture: What's on your mind? (Press Enter to save)"
						className="flex-1 px-4 py-2 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						autoFocus
					/>
					<Textarea
						value={newNote.content}
						onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
						rows={3}
						placeholder="Note content..."
						className="flex-1 px-4 py-2 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
					/>
				</div>
				<div className="flex justify-between gap-2">
					<Select onValueChange={(value) => setNewNote({ ...newNote, category: value })}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Select a category" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectLabel>Categories</SelectLabel>
								{Object.entries(categories).map(
									([key, category]: any) =>
										category.name !== "All" && (
											<SelectItem
												key={key}
												value={key}
												className="capitalize"
											>
												{category.name}
											</SelectItem>
										)
								)}
							</SelectGroup>
						</SelectContent>
					</Select>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={handleAddNote}
							className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
						>
							Capture
						</button>
						<button
							type="button"
							onClick={() => setCaptureNewNote(false)}
							className="border border-gray-600 px-6 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
