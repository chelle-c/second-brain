import { documentDir } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { CheckCircle, Download, Loader2, StickyNote, Upload, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	exportNotesToJson,
	parseImportedNotes,
	reconstructFoldersFromNotes,
	validateAndConvertFolders,
	validateAndConvertNotes,
} from "@/lib/notesExportImport";
import { useNotesStore } from "@/stores/useNotesStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

export const NotesSettings = () => {
	const { notesDefaultFolder, setNotesDefaultFolder } = useSettingsStore();
	const { folders, notes, setNotes, setFolders } = useNotesStore();

	const [isLoading, setIsLoading] = useState(false);
	const [showImportDialog, setShowImportDialog] = useState(false);
	const [importFilePath, setImportFilePath] = useState<string | null>(null);
	const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
	const [exportResult, setExportResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);
	const [importResult, setImportResult] = useState<{
		success: boolean;
		message: string;
	} | null>(null);

	const folderOptions = folders
		.filter((f) => !f.archived)
		.map((folder) => ({
			value: folder.id,
			label: folder.name,
		}));

	const handleExport = async () => {
		setIsLoading(true);
		try {
			const defaultPath = await documentDir();
			const timestamp = new Date().toISOString().slice(0, 10);

			const filePath = await save({
				defaultPath: `${defaultPath}/notes-export-${timestamp}.json`,
				filters: [
					{
						name: "JSON",
						extensions: ["json"],
					},
				],
				title: "Export Notes",
			});

			if (filePath) {
				const jsonContent = exportNotesToJson(notes, folders);
				await writeTextFile(filePath, jsonContent);
				setExportResult({
					success: true,
					message: `Successfully exported ${notes.length} notes and ${folders.length} folders`,
				});

				setTimeout(() => setExportResult(null), 5000);
			}
		} catch (error) {
			console.error("Export error:", error);
			setExportResult({ success: false, message: "Failed to export notes" });
			setTimeout(() => setExportResult(null), 5000);
		} finally {
			setIsLoading(false);
		}
	};

	const handleImportSelect = async () => {
		try {
			const filePath = await open({
				multiple: false,
				filters: [
					{
						name: "JSON",
						extensions: ["json"],
					},
				],
				title: "Import Notes",
			});

			if (filePath && typeof filePath === "string") {
				setImportFilePath(filePath);
				setShowImportDialog(true);
			}
		} catch (error) {
			console.error("File selection error:", error);
		}
	};

	const handleImportConfirm = async () => {
		if (!importFilePath) return;

		setIsLoading(true);
		try {
			const content = await readTextFile(importFilePath);
			const { data, error } = parseImportedNotes(content);

			if (error || !data) {
				setShowImportDialog(false);
				setImportFilePath(null);
				setImportResult({
					success: false,
					message: error || "Failed to parse import file",
				});
				setTimeout(() => setImportResult(null), 5000);
				return;
			}

			// For replace mode, use empty set to import all
			// For merge mode, skip existing IDs
			const existingIds =
				importMode === "replace" ? new Set<string>() : new Set(notes.map((n) => n.id));

			const { validNotes, errors, skipped } = validateAndConvertNotes(data, existingIds);

			if (validNotes.length === 0 && errors.length > 0) {
				setShowImportDialog(false);
				setImportFilePath(null);
				setImportResult({
					success: false,
					message: `Import failed: ${errors[0]}`,
				});
				setTimeout(() => setImportResult(null), 5000);
				return;
			}

			// Handle folder import
			const existingFolderIds = new Set(folders.map((f) => f.id));
			let newFolders: typeof folders = [];

			// First, try to import folders from the export data
			if (data.folders && data.folders.length > 0) {
				const { validFolders } = validateAndConvertFolders(
					data,
					importMode === "replace" ? new Set<string>() : existingFolderIds
				);
				newFolders = validFolders;
			}

			// If no explicit folders or some notes reference missing folders,
			// reconstruct them from note folder IDs
			const reconstructedFolders = reconstructFoldersFromNotes(
				validNotes,
				importMode === "replace" ? newFolders : [...folders, ...newFolders]
			);
			newFolders = [...newFolders, ...reconstructedFolders];

			if (importMode === "replace") {
				// Replace all notes and folders with imported data
				// Keep inbox folder if it exists
				const inbox = folders.find((f) => f.id === "inbox");
				const foldersToSet = inbox
					? [inbox, ...newFolders.filter((f) => f.id !== "inbox")]
					: newFolders;
				setFolders(foldersToSet);
				setNotes(validNotes);
			} else {
				// Merge: add new folders and notes to existing
				if (newFolders.length > 0) {
					setFolders([...folders, ...newFolders]);
				}
				setNotes([...notes, ...validNotes]);
			}

			setShowImportDialog(false);
			setImportFilePath(null);

			const message =
				importMode === "replace"
					? `Successfully imported ${validNotes.length} notes${
							newFolders.length > 0
								? ` and ${newFolders.length} folders`
								: ""
					  }`
					: `Imported ${validNotes.length} new notes${
							skipped > 0 ? `, skipped ${skipped} duplicates` : ""
					  }${
							newFolders.length > 0
								? ` (+ ${newFolders.length} folders)`
								: ""
					  }`;
			setImportResult({ success: true, message });

			if (errors.length > 0) {
				console.warn("Import errors:", errors);
			}

			setTimeout(() => setImportResult(null), 5000);
		} catch (error) {
			console.error("Import error:", error);
			setShowImportDialog(false);
			setImportFilePath(null);
			setImportResult({ success: false, message: "Failed to import notes" });
			setTimeout(() => setImportResult(null), 5000);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
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
						<Select value={notesDefaultFolder} onValueChange={setNotesDefaultFolder}>
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

					<Separator />

					<div className="space-y-4">
						<div className="space-y-0.5">
							<Label className="text-base font-medium">Import & Export</Label>
							<p className="text-sm text-muted-foreground">
								Export notes to JSON for backup or import from a previous export
							</p>
						</div>

						<div className="flex flex-wrap gap-3">
							<Button
								type="button"
								onClick={handleExport}
								variant="outline"
								className="gap-2"
								disabled={isLoading || notes.length === 0}
							>
								{isLoading ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Download className="w-4 h-4" />
								)}
								Export Notes
								<span className="text-xs text-muted-foreground">
									({notes.length})
								</span>
							</Button>

							<Button
								type="button"
								onClick={handleImportSelect}
								variant="outline"
								className="gap-2"
								disabled={isLoading}
							>
								{isLoading ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Upload className="w-4 h-4" />
								)}
								Import Notes
							</Button>
						</div>

						{/* Export Result */}
						{exportResult && (
							<div
								className={`flex items-center gap-2 p-3 rounded-lg ${
									exportResult.success
										? "bg-green-500/10 text-green-600 dark:text-green-400"
										: "bg-red-500/10 text-red-600 dark:text-red-400"
								}`}
							>
								{exportResult.success ? (
									<CheckCircle className="w-4 h-4" />
								) : (
									<XCircle className="w-4 h-4" />
								)}
								<span className="text-sm">{exportResult.message}</span>
							</div>
						)}

						{/* Import Result */}
						{importResult && (
							<div
								className={`flex items-center gap-2 p-3 rounded-lg ${
									importResult.success
										? "bg-green-500/10 text-green-600 dark:text-green-400"
										: "bg-red-500/10 text-red-600 dark:text-red-400"
								}`}
							>
								{importResult.success ? (
									<CheckCircle className="w-4 h-4" />
								) : (
									<XCircle className="w-4 h-4" />
								)}
								<span className="text-sm">{importResult.message}</span>
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Import Confirmation Dialog */}
			<Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Import Notes</DialogTitle>
						<DialogDescription>
							Choose how to handle the imported notes.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-3">
							<Label>Import Mode</Label>

							<div className="space-y-2">
								<label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
									<input
										type="radio"
										name="importMode"
										value="merge"
										checked={importMode === "merge"}
										onChange={() => setImportMode("merge")}
										className="mt-1"
									/>
									<div>
										<div className="font-medium">Merge</div>
										<div className="text-sm text-muted-foreground">
											Add new notes and skip duplicates (based on note ID).
										</div>
									</div>
								</label>

								<label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors">
									<input
										type="radio"
										name="importMode"
										value="replace"
										checked={importMode === "replace"}
										onChange={() => setImportMode("replace")}
										className="mt-1"
									/>
									<div>
										<div className="font-medium">Replace</div>
										<div className="text-sm text-muted-foreground">
											Replace all existing notes with imported notes.
										</div>
									</div>
								</label>
							</div>
						</div>

						{importMode === "replace" && (
							<div className="p-3 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-sm">
								Warning: This will delete all your existing notes and replace them
								with the imported notes. This action cannot be undone.
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setShowImportDialog(false);
								setImportFilePath(null);
							}}
						>
							Cancel
						</Button>
						<Button type="button" onClick={handleImportConfirm} disabled={isLoading}>
							{isLoading ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Importing...
								</>
							) : (
								<>
									<Upload className="w-4 h-4 mr-2" />
									Import
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
