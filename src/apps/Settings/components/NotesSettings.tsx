import { StickyNote } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useNotesStore } from "@/stores/useNotesStore";

export const NotesSettings = () => {
	const { notesDefaultFolder, setNotesDefaultFolder } = useSettingsStore();
	const { notesFolders } = useNotesStore();

	const folderOptions = Object.values(notesFolders).map((folder) => ({
		value: folder.id,
		label: folder.name,
	}));

	return (
		<Card id="notes" className="scroll-mt-6">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<StickyNote className="w-5 h-5" />
					Notes
				</CardTitle>
				<CardDescription>Configure notes app behavior</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base font-medium">Default Folder</Label>
						<p className="text-sm text-muted-foreground">
							Folder shown when opening the Notes app
						</p>
					</div>
					<Select
						value={notesDefaultFolder}
						onValueChange={setNotesDefaultFolder}
					>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="Select folder" />
						</SelectTrigger>
						<SelectContent>
							{folderOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</CardContent>
		</Card>
	);
};
