import { useState } from "react";
import {
	Database,
	HardDrive,
	FolderOpen,
	Download,
	Upload,
	Trash2,
	Clock,
	RefreshCw,
	AlertTriangle,
	CheckCircle2,
	FlaskConical,
	Wand2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBackupStore } from "@/stores/useBackupStore";
import { BackupInfo } from "@/types/backup";
import { seedTestDatabase } from "@/lib/storage";
import useAppStore from "@/stores/useAppStore";

const AUTO_BACKUP_INTERVALS = [
	{ value: "0", label: "Disabled" },
	{ value: "1", label: "Every hour" },
	{ value: "6", label: "Every 6 hours" },
	{ value: "12", label: "Every 12 hours" },
	{ value: "24", label: "Daily" },
	{ value: "168", label: "Weekly" },
];

const MAX_BACKUPS_OPTIONS = [
	{ value: "3", label: "3 backups" },
	{ value: "5", label: "5 backups" },
	{ value: "7", label: "7 backups" },
	{ value: "14", label: "14 backups" },
	{ value: "30", label: "30 backups" },
];

export const BackupSettings = () => {
	const {
		settings,
		backups,
		isLoading,
		lastBackupResult,
		lastRestoreResult,
		createBackup,
		deleteBackup,
		restoreFromBackup,
		setAutoBackupEnabled,
		setAutoBackupInterval,
		setMaxAutoBackups,
		setCustomBackupPath,
		getCurrentEnvironment,
		openBackupFolder,
		getDefaultDocumentsPath,
		loadBackups,
		clearResults,
	} = useBackupStore();

	const { loadFromFile } = useAppStore();

	const [showBackupList, setShowBackupList] = useState(false);
	const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
	const [customPathInput, setCustomPathInput] = useState(settings.customBackupPath || "");
	const [backupDescription, setBackupDescription] = useState("");
	const [showCreateBackup, setShowCreateBackup] = useState(false);
	const [showSeedConfirm, setShowSeedConfirm] = useState(false);
	const [seedingData, setSeedingData] = useState(false);

	const currentEnvironment = getCurrentEnvironment();

	const handleCreateBackup = async () => {
		const result = await createBackup(backupDescription || "Manual backup");
		setBackupDescription("");
		setShowCreateBackup(false);
		if (result.success) {
			await loadBackups();
		}
	};

	const handleRestoreBackup = async () => {
		if (!selectedBackup) return;
		await restoreFromBackup(selectedBackup.filename);
		setShowRestoreConfirm(false);
		setSelectedBackup(null);
	};

	const handleDeleteBackup = async () => {
		if (!selectedBackup) return;
		await deleteBackup(selectedBackup.filename);
		setShowDeleteConfirm(false);
		setSelectedBackup(null);
	};

	const handleSetCustomPath = async () => {
		if (customPathInput.trim()) {
			await setCustomBackupPath(customPathInput.trim());
		}
	};

	const handleUseDocumentsFolder = async () => {
		const docsPath = await getDefaultDocumentsPath();
		setCustomPathInput(docsPath);
		await setCustomBackupPath(docsPath);
	};

	const handleUseDefaultLocation = async () => {
		setCustomPathInput("");
		await setCustomBackupPath(null);
	};

	const handleSeedTestData = async () => {
		setSeedingData(true);
		try {
			await seedTestDatabase();
			await loadFromFile();
			setShowSeedConfirm(false);
		} catch (error) {
			console.error("Failed to seed test data:", error);
		} finally {
			setSeedingData(false);
		}
	};

	const formatDate = (date: Date) => {
		return new Date(date).toLocaleString();
	};

	const formatFileSize = (bytes?: number) => {
		if (!bytes) return "Unknown";
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	if (currentEnvironment === "test") {
		return (
			<>
				{/* Database Environment Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Database className="w-5 h-5" />
							Database Environment
						</CardTitle>
						<CardDescription>
							Database is automatically selected based on app build mode
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Current Environment</Label>
								<p className="text-sm text-muted-foreground">
									Using test database (development mode)
								</p>
							</div>
							<div className="flex items-center gap-2 px-4 py-2 rounded-md bg-muted">
								<FlaskConical className="w-4 h-4" />
								<span className="font-medium capitalize">{currentEnvironment}</span>
							</div>
						</div>

						<div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
							<p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
								<AlertTriangle className="w-4 h-4" />
								You are running in development mode. Changes won't affect your
								production data.
							</p>
						</div>

						<Separator />

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Seed Test Data</Label>
								<p className="text-sm text-muted-foreground">
									Populate the test database with sample data for testing
								</p>
							</div>
							<Button
								onClick={() => setShowSeedConfirm(true)}
								variant="outline"
								className="gap-2"
								disabled={seedingData}
							>
								<Wand2 className="w-4 h-4" />
								{seedingData ? "Seeding..." : "Seed Data"}
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Backup & Restore Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<HardDrive className="w-5 h-5" />
							Backup & Restore
						</CardTitle>
						<CardDescription>
							Create backups and restore from previous versions
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Manual Backup */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Create Backup</Label>
								<p className="text-sm text-muted-foreground">
									Save a snapshot of your current data
								</p>
							</div>
							<Button
								onClick={() => setShowCreateBackup(true)}
								variant="outline"
								className="gap-2"
								disabled={isLoading}
							>
								<Download className="w-4 h-4" />
								Create Backup
							</Button>
						</div>

						<Separator />

						{/* View Backups */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Manage Backups</Label>
								<p className="text-sm text-muted-foreground">
									{backups.length} backup{backups.length !== 1 ? "s" : ""}{" "}
									available
								</p>
							</div>
							<Button
								onClick={() => {
									loadBackups();
									setShowBackupList(true);
								}}
								variant="outline"
								className="gap-2"
							>
								<RefreshCw className="w-4 h-4" />
								View Backups
							</Button>
						</div>

						<Separator />

						{/* Auto-backup Settings */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="auto-backup" className="text-base font-medium">
									Auto-backup
								</Label>
								<p className="text-sm text-muted-foreground">
									Automatically create backups on a schedule
								</p>
							</div>
							<Switch
								id="auto-backup"
								checked={settings.autoBackupEnabled}
								onCheckedChange={setAutoBackupEnabled}
							/>
						</div>

						{settings.autoBackupEnabled && (
							<>
								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label className="text-base font-medium">
											Backup Interval
										</Label>
										<p className="text-sm text-muted-foreground">
											How often to create automatic backups
										</p>
									</div>
									<Select
										value={settings.autoBackupIntervalHours.toString()}
										onValueChange={(value) =>
											setAutoBackupInterval(parseInt(value))
										}
									>
										<SelectTrigger className="w-[200px]">
											<div className="flex items-center gap-2">
												<Clock className="w-4 h-4" />
												<SelectValue />
											</div>
										</SelectTrigger>
										<SelectContent>
											{AUTO_BACKUP_INTERVALS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								<div className="flex items-center justify-between">
									<div className="space-y-0.5">
										<Label className="text-base font-medium">
											Maximum Backups
										</Label>
										<p className="text-sm text-muted-foreground">
											Older auto-backups will be removed
										</p>
									</div>
									<Select
										value={settings.maxAutoBackups.toString()}
										onValueChange={(value) =>
											setMaxAutoBackups(parseInt(value))
										}
									>
										<SelectTrigger className="w-[200px]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{MAX_BACKUPS_OPTIONS.map((option) => (
												<SelectItem key={option.value} value={option.value}>
													{option.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</>
						)}

						{/* Result notifications */}
						{lastBackupResult && (
							<div
								className={`p-3 rounded-lg flex items-center gap-2 ${
									lastBackupResult.success
										? "bg-green-500/10 border border-green-500/20"
										: "bg-red-500/10 border border-red-500/20"
								}`}
							>
								{lastBackupResult.success ? (
									<CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
								) : (
									<AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
								)}
								<span
									className={`text-sm ${
										lastBackupResult.success
											? "text-green-600 dark:text-green-400"
											: "text-red-600 dark:text-red-400"
									}`}
								>
									{lastBackupResult.success
										? "Backup created successfully"
										: `Backup failed: ${lastBackupResult.error}`}
								</span>
								<Button
									variant="ghost"
									size="sm"
									className="ml-auto"
									onClick={clearResults}
								>
									Dismiss
								</Button>
							</div>
						)}

						{lastRestoreResult && (
							<div
								className={`p-3 rounded-lg flex items-center gap-2 ${
									lastRestoreResult.success
										? "bg-green-500/10 border border-green-500/20"
										: "bg-red-500/10 border border-red-500/20"
								}`}
							>
								{lastRestoreResult.success ? (
									<CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
								) : (
									<AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
								)}
								<span
									className={`text-sm ${
										lastRestoreResult.success
											? "text-green-600 dark:text-green-400"
											: "text-red-600 dark:text-red-400"
									}`}
								>
									{lastRestoreResult.success
										? "Data restored successfully. Please restart the app."
										: `Restore failed: ${lastRestoreResult.error}`}
								</span>
								<Button
									variant="ghost"
									size="sm"
									className="ml-auto"
									onClick={clearResults}
								>
									Dismiss
								</Button>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Backup Location Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<FolderOpen className="w-5 h-5" />
							Backup Location
						</CardTitle>
						<CardDescription>Choose where to store your backup files</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Open Backup Folder</Label>
								<p className="text-sm text-muted-foreground">
									View your backup files in the file explorer
								</p>
							</div>
							<Button onClick={openBackupFolder} variant="outline" className="gap-2">
								<FolderOpen className="w-4 h-4" />
								Open Folder
							</Button>
						</div>

						<Separator />

						<div className="space-y-4">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Custom Backup Path</Label>
								<p className="text-sm text-muted-foreground">
									Set a custom location for storing backups (e.g., Documents
									folder)
								</p>
							</div>

							<div className="flex gap-2">
								<Input
									value={customPathInput}
									onChange={(e) => setCustomPathInput(e.target.value)}
									placeholder="Custom backup path..."
									className="flex-1"
								/>
								<Button
									onClick={handleSetCustomPath}
									variant="outline"
									disabled={!customPathInput.trim()}
								>
									Apply
								</Button>
							</div>

							<div className="flex gap-2">
								<Button
									onClick={handleUseDocumentsFolder}
									variant="secondary"
									size="sm"
								>
									Use Documents Folder
								</Button>
								<Button
									onClick={handleUseDefaultLocation}
									variant="ghost"
									size="sm"
								>
									Use Default Location
								</Button>
							</div>

							{settings.customBackupPath && (
								<p className="text-sm text-muted-foreground">
									Current: {settings.customBackupPath}
								</p>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Create Backup Dialog */}
				<Dialog open={showCreateBackup} onOpenChange={setShowCreateBackup}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Backup</DialogTitle>
							<DialogDescription>
								Create a new backup of your current data. You can add an optional
								description.
							</DialogDescription>
						</DialogHeader>
						<div className="py-4">
							<Label htmlFor="description">Description (optional)</Label>
							<Input
								id="description"
								value={backupDescription}
								onChange={(e) => setBackupDescription(e.target.value)}
								placeholder="e.g., Before major changes..."
								className="mt-2"
							/>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setShowCreateBackup(false)}>
								Cancel
							</Button>
							<Button onClick={handleCreateBackup} disabled={isLoading}>
								{isLoading ? "Creating..." : "Create Backup"}
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Backup List Dialog */}
				<Dialog open={showBackupList} onOpenChange={setShowBackupList}>
					<DialogContent className="max-w-2xl">
						<DialogHeader>
							<DialogTitle>Manage Backups</DialogTitle>
							<DialogDescription>
								View, restore, or delete your backups
							</DialogDescription>
						</DialogHeader>
						<ScrollArea className="max-h-[400px]">
							{backups.length === 0 ? (
								<div className="py-8 text-center text-muted-foreground">
									No backups found. Create your first backup to get started.
								</div>
							) : (
								<div className="space-y-2">
									{backups.map((backup) => (
										<div
											key={backup.filename}
											className="p-3 border rounded-lg flex items-center justify-between"
										>
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<span className="font-medium">
														{backup.metadata.description || "Backup"}
													</span>
													<span
														className={`text-xs px-2 py-0.5 rounded ${
															backup.metadata.environment ===
															"production"
																? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
																: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
														}`}
													>
														{backup.metadata.environment}
													</span>
												</div>
												<div className="text-sm text-muted-foreground">
													{formatDate(backup.metadata.createdAt)} • v
													{backup.metadata.version}
													{backup.metadata.fileSize &&
														` • ${formatFileSize(
															backup.metadata.fileSize
														)}`}
												</div>
											</div>
											<div className="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => {
														setSelectedBackup(backup);
														setShowRestoreConfirm(true);
													}}
												>
													<Upload className="w-4 h-4 mr-1" />
													Restore
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => {
														setSelectedBackup(backup);
														setShowDeleteConfirm(true);
													}}
												>
													<Trash2 className="w-4 h-4 text-red-500" />
												</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</ScrollArea>
						<DialogFooter>
							<Button variant="outline" onClick={() => setShowBackupList(false)}>
								Close
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>

				{/* Restore Confirmation */}
				<AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Restore from Backup</AlertDialogTitle>
							<AlertDialogDescription>
								This will replace your current data with the data from this backup.
								A backup of your current data will be created first.
								{selectedBackup &&
									selectedBackup.metadata.version !== "unknown" && (
										<span className="block mt-2">
											Backup version: {selectedBackup.metadata.version}
										</span>
									)}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction onClick={handleRestoreBackup} disabled={isLoading}>
								{isLoading ? "Restoring..." : "Restore"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{/* Delete Confirmation */}
				<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete Backup</AlertDialogTitle>
							<AlertDialogDescription>
								Are you sure you want to delete this backup? This action cannot be
								undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={handleDeleteBackup}
								className="bg-red-600 hover:bg-red-700"
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				{/* Seed Test Data Confirmation */}
				<AlertDialog open={showSeedConfirm} onOpenChange={setShowSeedConfirm}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Seed Test Database</AlertDialogTitle>
							<AlertDialogDescription>
								This will clear all existing data in the test database and replace
								it with sample data including:
								<ul className="list-disc list-inside mt-2 space-y-1">
									<li>7 sample notes across different folders</li>
									<li>10 sample expenses (recurring and one-time)</li>
									<li>Income entries for the past 4 weeks</li>
								</ul>
								<span className="block mt-2 font-medium">
									This action cannot be undone.
								</span>
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={seedingData}>Cancel</AlertDialogCancel>
							<AlertDialogAction onClick={handleSeedTestData} disabled={seedingData}>
								{seedingData ? "Seeding..." : "Seed Data"}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</>
		);
	}

	return;
};
