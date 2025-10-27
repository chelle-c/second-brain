import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useAppStore from "@/stores/useAppStore";

export const Capture = ({ setCaptureNewNote }: any) => {
	const { addNote } = useAppStore();

	const [newNote, setNewNote] = useState({ title: "", content: "", category: "" });

	const handleAddNote = (e: { preventDefault: () => void }) => {
		e.preventDefault();
		if (newNote.title.trim()) {
			addNote({
				...newNote,
				folder: "inbox",
				category: "uncategorized",
			});
			setNewNote({ title: "", content: "", category: "" });
			setCaptureNewNote(false);
		}
	};

	return (
		<div className="mb-6">
			<Card>
				<CardContent>
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
								className="flex-1 px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								autoFocus
							/>
							<Textarea
								value={newNote.content}
								onChange={(e) =>
									setNewNote({ ...newNote, content: e.target.value })
								}
								rows={3}
								placeholder="Note content..."
								className="flex-1 px-4 py-2 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								onClick={handleAddNote}
								className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
							>
								Capture
							</Button>
							<Button
								type="button"
								onClick={() => setCaptureNewNote(false)}
								className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
							>
								Cancel
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
