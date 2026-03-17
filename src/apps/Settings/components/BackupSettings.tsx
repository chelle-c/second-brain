import {
	AlertTriangle,
	CheckCircle2,
	Clock,
	Database,
	Download,
	FlaskConical,
	FolderOpen,
	HardDrive,
	RefreshCw,
	RotateCcw,
	Trash2,
	Upload,
	Wand2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { seedTestDatabase, sqlStorage } from "@/lib/storage";
import useAppStore from "@/stores/useAppStore";
import { type RestoreMode, useBackupStore } from "@/stores/useBackupStore";
import type { BackupInfo } from "@/types/backup";

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
		selectedForDeletion,
		createBackup,
		deleteBackup,
		deleteSelectedBackups,
		toggleSelectForDeletion,
		selectAllForDeletion,
		selectByEnvironment,
		selectPreRestoreBackups,
		clearSelection,
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
		clearDatabase,
		clearLocalStorage,
	} = useBackupStore();

	const { loadFromFile } = useAppStore();

	const [showBackupList, setShowBackupList] = useState(false);
	const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
	const [showClearDatabaseConfirm, setShowClearDatabaseConfirm] = useState(false);
	const [showClearLocalStorageConfirm, setShowClearLocalStorageConfirm] = useState(false);
	const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
	const [createPreRestoreBackup, setCreatePreRestoreBackup] = useState(true);
	const [restoreMode, setRestoreMode] = useState<RestoreMode>("replace");
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
			toast.success("Backup created successfully");
			await loadBackups();
		} else {
			toast.error(`Backup failed: ${result.error}`);
		}
	};

	const handleRestoreClick = (backup: BackupInfo) => {
		setSelectedBackup(backup);
		setCreatePreRestoreBackup(true);
		setRestoreMode("replace");
		setShowRestoreConfirm(true);
	};

	const handleRestoreBackup = async () => {
		if (!selectedBackup) return;

		// Close the dialog immediately
		setShowRestoreConfirm(false);
		setShowBackupList(false);

		const result = await restoreFromBackup(selectedBackup.filename, {
			skipPreRestoreBackup: !createPreRestoreBackup,
			mode: restoreMode,
		});

		setSelectedBackup(null);

		if (result.success) {
			if (restoreMode === "merge") {
				const count = result.mergedCount ?? 0;
				toast.success(
					count > 0 ?
						`Merged ${count} item${count !== 1 ? "s" : ""} from backup`
					:	"Merge complete (no new items to add)",
				);
			} else {
				toast.success("Data restored successfully");
			}
		} else {
			toast.error(`Restore failed: ${result.error}`);
		}
	};

	const handleDeleteBackup = async () => {
		if (!selectedBackup) return;
		const success = await deleteBackup(selectedBackup.filename);
		setShowDeleteConfirm(false);
		setSelectedBackup(null);
		if (success) {
			toast.success("Backup deleted");
		} else {
			toast.error("Failed to delete backup");
		}
	};

	const handleBulkDelete = async () => {
		const count = selectedForDeletion.size;
		await deleteSelectedBackups();
		setShowBulkDeleteConfirm(false);
		toast.success(`Deleted ${count} backup${count !== 1 ? "s" : ""}`);
	};

	const handleClearDatabase = async () => {
		const dbExists = await sqlStorage.databaseExists();
		if (!dbExists) {
			setShowClearDatabaseConfirm(false);
			toast.info("No database file found — nothing to clear");
			return;
		}
		await clearDatabase();
		setShowClearDatabaseConfirm(false);
		toast.success("Database cleared");
	};

	const handleClearLocalStorage = () => {
		clearLocalStorage();
		setShowClearLocalStorageConfirm(false);
		toast.success("localStorage cache cleared");
	};

	const handleSetCustomPath = async () => {
		if (customPathInput.trim()) await setCustomBackupPath(customPathInput.trim());
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
			toast.success("Test data seeded successfully");
		} catch (error) {
			console.error("Failed to seed test data:", error);
			toast.error("Failed to seed test data");
		} finally {
			setSeedingData(false);
		}
	};

	const formatDate = (date: Date) => new Date(date).toLocaleString();
	const formatFileSize = (bytes?: number) => {
		if (!bytes) return "Unknown";
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const isPreRestore = (backup: BackupInfo) =>
		backup.metadata.description?.startsWith("Pre-restore");

	const allSelected = backups.length > 0 && selectedForDeletion.size === backups.length;
	const someSelected = selectedForDeletion.size > 0 && !allSelected;

	const prodBackupsCount = backups.filter((b) => b.metadata.environment === "production").length;
	const testBackupsCount = backups.filter((b) => b.metadata.environment === "test").length;
	const preRestoreCount = backups.filter((b) => isPreRestore(b)).length;

	return (
		<>
			{/* Database Environment Card */}
			{currentEnvironment === "test" && (
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
								{seedingData ? "Seeding…" : "Seed Data"}
							</Button>
						</div>

						<Separator />

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Clear Database</Label>
								<p className="text-sm text-muted-foreground">
									Remove all data from the test database
								</p>
							</div>
							<Button
								onClick={() => setShowClearDatabaseConfirm(true)}
								variant="outline"
								className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
								disabled={isLoading}
							>
								<Trash2 className="w-4 h-4" />
								Clear Database
							</Button>
						</div>

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Clear localStorage</Label>
								<p className="text-sm text-muted-foreground">
									Remove the cached data from localStorage
								</p>
							</div>
							<Button
								onClick={() => setShowClearLocalStorageConfirm(true)}
								variant="outline"
								className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
							>
								<Trash2 className="w-4 h-4" />
								Clear localStorage
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Backup & Restore Card */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HardDrive className="w-5 h-5" />
						Backup & Restore
					</CardTitle>
					<CardDescription>
						Create data backups and restore from previous versions
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
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

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="text-base font-medium">Manage Backups</Label>
							<p className="text-sm text-muted-foreground">
								{backups.length} backup{backups.length !== 1 ? "s" : ""} available
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
									<Label className="text-base font-medium">Backup Interval</Label>
									<p className="text-sm text-muted-foreground">
										How often to create automatic backups
									</p>
								</div>
								<Select
									value={settings.autoBackupIntervalHours.toString()}
									onValueChange={(v) => setAutoBackupInterval(parseInt(v, 10))}
								>
									<SelectTrigger className="w-[200px]">
										<div className="flex items-center gap-2">
											<Clock className="w-4 h-4" />
											<SelectValue />
										</div>
									</SelectTrigger>
									<SelectContent>
										{AUTO_BACKUP_INTERVALS.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label className="text-base font-medium">Maximum Backups</Label>
									<p className="text-sm text-muted-foreground">
										Older auto-backups will be removed
									</p>
								</div>
								<Select
									value={settings.maxAutoBackups.toString()}
									onValueChange={(v) => setMaxAutoBackups(parseInt(v, 10))}
								>
									<SelectTrigger className="w-[200px]">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{MAX_BACKUPS_OPTIONS.map((o) => (
											<SelectItem key={o.value} value={o.value}>
												{o.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</>
					)}

					{lastBackupResult && (
						<div
							className={`p-3 rounded-lg flex items-center gap-2 ${
								lastBackupResult.success ?
									"bg-green-500/10 border border-green-500/20"
								:	"bg-red-500/10 border border-red-500/20"
							}`}
						>
							{lastBackupResult.success ?
								<CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
							:	<AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />}
							<span
								className={`text-sm ${
									lastBackupResult.success ?
										"text-green-600 dark:text-green-400"
									:	"text-red-600 dark:text-red-400"
								}`}
							>
								{lastBackupResult.success ?
									"Backup created successfully"
								:	`Backup failed: ${lastBackupResult.error}`}
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
								lastRestoreResult.success ?
									"bg-green-500/10 border border-green-500/20"
								:	"bg-red-500/10 border border-red-500/20"
							}`}
						>
							{lastRestoreResult.success ?
								<CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
							:	<AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />}
							<span
								className={`text-sm ${
									lastRestoreResult.success ?
										"text-green-600 dark:text-green-400"
									:	"text-red-600 dark:text-red-400"
								}`}
							>
								{lastRestoreResult.success ?
									lastRestoreResult.mergedCount !== undefined ?
										`Merged ${lastRestoreResult.mergedCount} item${lastRestoreResult.mergedCount !== 1 ? "s" : ""} from backup`
									:	"Data restored successfully"
								:	`Restore failed: ${lastRestoreResult.error}`}
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
								Set a custom location for storing backups
							</p>
						</div>
						<div className="flex gap-2">
							<Input
								value={customPathInput}
								onChange={(e) => setCustomPathInput(e.target.value)}
								placeholder="Custom backup path…"
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
							<Button onClick={handleUseDefaultLocation} variant="ghost" size="sm">
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

			{/* ── Create Backup Dialog ────────────────────────────────────── */}
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
							placeholder="e.g., Before major changes…"
							className="mt-2"
						/>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowCreateBackup(false)}>
							Cancel
						</Button>
						<Button onClick={handleCreateBackup} disabled={isLoading}>
							{isLoading ? "Creating…" : "Create Backup"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ── Backup List Dialog ──────────────────────────────────────── */}
			<Dialog
				open={showBackupList}
				onOpenChange={(open) => {
					setShowBackupList(open);
					if (!open) clearSelection();
				}}
			>
				<DialogContent className="max-w-2xl h-[80vh] flex flex-col overflow-hidden">
					<DialogHeader className="shrink-0">
						<DialogTitle>Manage Backups</DialogTitle>
						<DialogDescription>
							View, restore, or delete your backups.
						</DialogDescription>
					</DialogHeader>

					{/* Multi-select toolbar */}
					{backups.length > 0 && (
						<div className="flex items-center gap-3 pb-2 border-b shrink-0">
							<Checkbox
								id="select-all"
								checked={allSelected}
								data-state={
									someSelected ? "indeterminate"
									: allSelected ?
										"checked"
									:	"unchecked"
								}
								onCheckedChange={(checked) => {
									if (checked) {
										selectAllForDeletion();
									} else {
										clearSelection();
									}
								}}
							/>
							<Label htmlFor="select-all" className="text-sm cursor-pointer">
								{selectedForDeletion.size === 0 ?
									"Select all"
								:	`${selectedForDeletion.size} selected`}
							</Label>

							{/* Batch selection dropdown */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="sm">
										Select…
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start">
									<DropdownMenuItem onClick={selectAllForDeletion}>
										All ({backups.length})
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									{prodBackupsCount > 0 && (
										<DropdownMenuItem
											onClick={() => selectByEnvironment("production")}
										>
											Production ({prodBackupsCount})
										</DropdownMenuItem>
									)}
									{testBackupsCount > 0 && (
										<DropdownMenuItem
											onClick={() => selectByEnvironment("test")}
										>
											Test ({testBackupsCount})
										</DropdownMenuItem>
									)}
									{preRestoreCount > 0 && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem onClick={selectPreRestoreBackups}>
												Pre-restore ({preRestoreCount})
											</DropdownMenuItem>
										</>
									)}
									<DropdownMenuSeparator />
									<DropdownMenuItem onClick={clearSelection}>
										Clear selection
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{selectedForDeletion.size > 0 && (
								<>
									<Button
										variant="destructive"
										size="sm"
										className="ml-auto gap-1"
										onClick={() => setShowBulkDeleteConfirm(true)}
										disabled={isLoading}
									>
										<Trash2 className="w-3.5 h-3.5" />
										Delete {selectedForDeletion.size}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={clearSelection}
										disabled={isLoading}
									>
										Cancel
									</Button>
								</>
							)}
						</div>
					)}

					<div className="flex-1 min-h-0 overflow-hidden">
						<ScrollArea className="h-full">
							{backups.length === 0 ?
								<div className="py-8 text-center text-muted-foreground">
									No backups found. Create your first backup to get started.
								</div>
							:	<div className="space-y-2 py-1 pr-4">
									{backups.map((backup) => (
										<div
											key={backup.filename}
											className={`p-3 border rounded-lg transition-colors ${
												selectedForDeletion.has(backup.filename) ?
													"bg-muted/60"
												:	""
											}`}
										>
											<div className="flex items-start gap-3">
												{/* Row checkbox */}
												<Checkbox
													checked={selectedForDeletion.has(
														backup.filename,
													)}
													onCheckedChange={() =>
														toggleSelectForDeletion(backup.filename)
													}
													className="mt-1 shrink-0"
												/>

												<div className="flex-1 min-w-0 overflow-hidden">
													<div className="flex items-center gap-2 flex-wrap">
														<span
															className="font-medium truncate max-w-[200px]"
															title={
																backup.metadata.description ||
																"Backup"
															}
														>
															{backup.metadata.description ||
																"Backup"}
														</span>
														{/* Environment tag */}
														<span
															className={`text-xs px-2 py-0.5 rounded shrink-0 ${
																(
																	backup.metadata.environment ===
																	"production"
																) ?
																	"bg-blue-500/10 text-blue-600 dark:text-blue-400"
																:	"bg-amber-500/10 text-amber-600 dark:text-amber-400"
															}`}
														>
															{backup.metadata.environment}
														</span>
														{/* Pre-restore tag */}
														{isPreRestore(backup) && (
															<span className="text-xs px-2 py-0.5 rounded shrink-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center gap-1">
																<RotateCcw className="w-3 h-3" />
																pre-restore
															</span>
														)}
													</div>
													<div className="text-sm text-muted-foreground mt-1">
														{formatDate(backup.metadata.createdAt)} · v
														{backup.metadata.version}
														{backup.metadata.fileSize &&
															` · ${formatFileSize(backup.metadata.fileSize)}`}
													</div>
												</div>

												<div className="flex gap-2 shrink-0">
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleRestoreClick(backup)}
														disabled={isLoading}
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
														disabled={isLoading}
													>
														<Trash2 className="w-4 h-4 text-red-500" />
													</Button>
												</div>
											</div>
										</div>
									))}
								</div>
							}
						</ScrollArea>
					</div>

					<DialogFooter className="shrink-0 mt-4">
						<Button
							variant="outline"
							onClick={() => {
								setShowBackupList(false);
								clearSelection();
							}}
						>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* ── Restore confirmation (with mode selection) ─────────────── */}
			<AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Restore from Backup</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-3">
								<p>
									Restoring from{" "}
									<span className="font-medium">
										{selectedBackup?.metadata.description || "this backup"}
									</span>
									.
								</p>
								{selectedBackup?.metadata.version !== "unknown" && (
									<p className="text-xs text-muted-foreground">
										Backup version: {selectedBackup?.metadata.version}
									</p>
								)}
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>

					<div className="space-y-4 py-2">
						{/* Restore mode selection */}
						<div className="space-y-3">
							<Label className="text-sm font-medium">Restore mode</Label>
							<RadioGroup
								value={restoreMode}
								onValueChange={(value) => setRestoreMode(value as RestoreMode)}
								className="space-y-2"
							>
								<label
									htmlFor="mode-replace"
									className="flex items-start space-x-3 cursor-pointer rounded-md p-2 -mx-2 hover:bg-muted/50 transition-colors"
								>
									<RadioGroupItem
										value="replace"
										id="mode-replace"
										className="mt-1"
									/>
									<div className="space-y-1">
										<span className="font-medium">Replace all data</span>
										<p className="text-sm text-muted-foreground">
											Completely replace your current data with the backup.
											This is the default behavior.
										</p>
									</div>
								</label>
								<label
									htmlFor="mode-merge"
									className="flex items-start space-x-3 cursor-pointer rounded-md p-2 -mx-2 hover:bg-muted/50 transition-colors"
								>
									<RadioGroupItem
										value="merge"
										id="mode-merge"
										className="mt-1"
									/>
									<div className="space-y-1">
										<span className="font-medium">
											Merge with existing data
										</span>
										<p className="text-sm text-muted-foreground">
											Add items from the backup that don't exist in your
											current data. Existing items will not be modified.
										</p>
									</div>
								</label>
							</RadioGroup>
						</div>

						<Separator />

						{/* Pre-restore backup option */}
						<div className="flex items-center gap-2">
							<Checkbox
								id="create-pre-restore"
								checked={createPreRestoreBackup}
								onCheckedChange={(checked) =>
									setCreatePreRestoreBackup(checked === true)
								}
							/>
							<Label htmlFor="create-pre-restore" className="text-sm cursor-pointer">
								Back up current data first (recommended)
							</Label>
						</div>
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleRestoreBackup} disabled={isLoading}>
							{isLoading ?
								"Restoring…"
							: restoreMode === "replace" ?
								"Replace Data"
							:	"Merge Data"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* ── Single-backup delete confirmation ──────────────────────── */}
			<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Backup</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete{" "}
							<span className="font-medium">
								{selectedBackup?.metadata.description || "this backup"}
							</span>
							? This action cannot be undone.
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

			{/* ── Bulk delete confirmation ────────────────────────────────── */}
			<AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Delete {selectedForDeletion.size} Backup
							{selectedForDeletion.size !== 1 ? "s" : ""}
						</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to permanently delete{" "}
							{selectedForDeletion.size === 1 ?
								"this backup"
							:	`these ${selectedForDeletion.size} backups`}
							? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleBulkDelete}
							className="bg-red-600 hover:bg-red-700"
							disabled={isLoading}
						>
							{isLoading ?
								"Deleting…"
							:	`Delete ${selectedForDeletion.size} backup${selectedForDeletion.size !== 1 ? "s" : ""}`
							}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* ── Clear Database Confirmation ─────────────────────────────── */}
			<AlertDialog open={showClearDatabaseConfirm} onOpenChange={setShowClearDatabaseConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Clear Database</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete all data from the test database. This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleClearDatabase}
							className="bg-red-600 hover:bg-red-700"
							disabled={isLoading}
						>
							{isLoading ? "Clearing…" : "Clear Database"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* ── Clear localStorage Confirmation ─────────────────────────── */}
			<AlertDialog
				open={showClearLocalStorageConfirm}
				onOpenChange={setShowClearLocalStorageConfirm}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Clear localStorage Cache</AlertDialogTitle>
						<AlertDialogDescription>
							This will clear the cached app data from localStorage. The data will be
							reloaded from the database on next app start.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleClearLocalStorage}
							className="bg-red-600 hover:bg-red-700"
						>
							Clear localStorage
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* ── Seed Test Data Confirmation ─────────────────────────────── */}
			<AlertDialog open={showSeedConfirm} onOpenChange={setShowSeedConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Seed Test Database</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div>
								This will clear all existing data in the test database and replace
								it with sample data including:
								<ul className="list-disc list-inside mt-2 space-y-1">
									<li>Sample notes across folders</li>
									<li>Sample expenses (recurring and one-time)</li>
									<li>Income entries for the past several weeks</li>
								</ul>
								<span className="block mt-2 font-medium">
									This action cannot be undone.
								</span>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={seedingData}>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleSeedTestData} disabled={seedingData}>
							{seedingData ? "Seeding…" : "Seed Data"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
