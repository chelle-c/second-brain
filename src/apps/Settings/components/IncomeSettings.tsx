import { documentDir } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import {
	CheckCircle,
	Download,
	Loader2,
	TrendingUp,
	Upload,
	XCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useIncomeStore } from "@/stores/useIncomeStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type {
	IncomeEntry,
	IncomeViewType,
	IncomeWeeklyTargets,
} from "@/types/income";
import {
	CURRENCY_OPTIONS,
	WEEK_DAYS,
	type WeekStartDay,
} from "@/types/settings";
import { APP_VERSION } from "@/types/storage";

interface IncomeExportData {
	version: string;
	exportedAt: string;
	data: {
		entries: IncomeEntry[];
		weeklyTargets: IncomeWeeklyTargets[];
	};
}

const incomeViewOptions: { value: IncomeViewType; label: string }[] = [
	{ value: "weekly", label: "Weekly View" },
	{ value: "monthly", label: "Monthly View" },
	{ value: "yearly", label: "Yearly View" },
];

export const IncomeSettings = () => {
	const {
		incomeDefaultView,
		incomeWeekStartDay,
		incomeCurrency,
		incomeDefaultWeeklyTarget,
		setIncomeDefaultView,
		setIncomeWeekStartDay,
		setIncomeCurrency,
		setIncomeDefaultWeeklyTarget,
	} = useSettingsStore();

	const {
		incomeEntries,
		incomeWeeklyTargets,
		setIncomeEntries,
		setIncomeWeeklyTargets,
	} = useIncomeStore();

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

	const handleExport = async () => {
		setIsLoading(true);
		try {
			const defaultPath = await documentDir();
			const timestamp = new Date().toISOString().slice(0, 10);

			const filePath = await save({
				defaultPath: `${defaultPath}/income-export-${timestamp}.json`,
				filters: [
					{
						name: "JSON",
						extensions: ["json"],
					},
				],
				title: "Export Income",
			});

			if (filePath) {
				const exportData: IncomeExportData = {
					version: APP_VERSION,
					exportedAt: new Date().toISOString(),
					data: {
						entries: incomeEntries,
						weeklyTargets: incomeWeeklyTargets,
					},
				};

				await writeTextFile(filePath, JSON.stringify(exportData, null, 2));
				setExportResult({
					success: true,
					message: `Successfully exported ${incomeEntries.length} income entries`,
				});

				setTimeout(() => setExportResult(null), 5000);
			}
		} catch (error) {
			console.error("Export error:", error);
			setExportResult({
				success: false,
				message: "Failed to export income data",
			});
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
				title: "Import Income",
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
			const importData: IncomeExportData = JSON.parse(content);

			// Validate import data structure
			if (!importData.data || !Array.isArray(importData.data.entries)) {
				setShowImportDialog(false);
				setImportFilePath(null);
				setImportResult({
					success: false,
					message: "Invalid income export file format",
				});
				setTimeout(() => setImportResult(null), 5000);
				return;
			}

			if (importMode === "replace") {
				// Replace all data
				setIncomeEntries(importData.data.entries);
				setIncomeWeeklyTargets(importData.data.weeklyTargets || []);

				setShowImportDialog(false);
				setImportFilePath(null);
				setImportResult({
					success: true,
					message: `Successfully imported ${importData.data.entries.length} income entries`,
				});
			} else {
				// Merge mode - add new entries, skip duplicates by ID
				const existingIds = new Set(incomeEntries.map((e) => e.id));
				const newEntries = importData.data.entries.filter(
					(e) => !existingIds.has(e.id),
				);

				// Merge weekly targets
				const existingTargetIds = new Set(incomeWeeklyTargets.map((t) => t.id));
				const newTargets = (importData.data.weeklyTargets || []).filter(
					(t) => !existingTargetIds.has(t.id),
				);

				setIncomeEntries([...incomeEntries, ...newEntries]);
				setIncomeWeeklyTargets([...incomeWeeklyTargets, ...newTargets]);

				const skipped = importData.data.entries.length - newEntries.length;
				setShowImportDialog(false);
				setImportFilePath(null);
				setImportResult({
					success: true,
					message: `Imported ${newEntries.length} new entries${skipped > 0 ? `, skipped ${skipped} duplicates` : ""}`,
				});
			}

			setTimeout(() => setImportResult(null), 5000);
		} catch (error) {
			console.error("Import error:", error);
			setShowImportDialog(false);
			setImportFilePath(null);
			setImportResult({
				success: false,
				message: "Failed to import income data",
			});
			setTimeout(() => setImportResult(null), 5000);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<>
			<Card id="income" className="scroll-mt-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<TrendingUp className="w-5 h-5" />
						Income Tracker
					</CardTitle>
					<CardDescription>Configure income tracker behavior</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="text-base font-medium">Default View</Label>
							<p className="text-sm text-muted-foreground">
								View shown when opening Income Tracker
							</p>
						</div>
						<Select
							value={incomeDefaultView}
							onValueChange={(value) =>
								setIncomeDefaultView(value as IncomeViewType)
							}
						>
							<SelectTrigger className="w-[200px]">
								<SelectValue placeholder="Select view" />
							</SelectTrigger>
							<SelectContent>
								{incomeViewOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<Separator />

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="text-base font-medium">Week Starts On</Label>
							<p className="text-sm text-muted-foreground">
								First day of the week for weekly view
							</p>
						</div>
						<Select
							value={incomeWeekStartDay.toString()}
							onValueChange={(value) =>
								setIncomeWeekStartDay(parseInt(value, 10) as WeekStartDay)
							}
						>
							<SelectTrigger className="w-[200px]">
								<SelectValue placeholder="Select day" />
							</SelectTrigger>
							<SelectContent>
								{WEEK_DAYS.map((option) => (
									<SelectItem
										key={option.value}
										value={option.value.toString()}
									>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<Separator />

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="text-base font-medium">Currency</Label>
							<p className="text-sm text-muted-foreground">
								Currency used for displaying income
							</p>
						</div>
						<Select value={incomeCurrency} onValueChange={setIncomeCurrency}>
							<SelectTrigger className="w-[200px]">
								<SelectValue placeholder="Select currency" />
							</SelectTrigger>
							<SelectContent>
								{CURRENCY_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<Separator />

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="text-base font-medium">
								Default Weekly Target
							</Label>
							<p className="text-sm text-muted-foreground">
								Default target for weeks that haven't been customized
							</p>
						</div>
						<Input
							type="number"
							min="0"
							step="1"
							value={incomeDefaultWeeklyTarget}
							onChange={(e) => {
								const value = parseFloat(e.target.value);
								if (!Number.isNaN(value) && value >= 0) {
									setIncomeDefaultWeeklyTarget(value);
								}
							}}
							className="w-[200px]"
						/>
					</div>

					<Separator />

					<div className="space-y-4">
						<div className="space-y-0.5">
							<Label className="text-base font-medium">Import & Export</Label>
							<p className="text-sm text-muted-foreground">
								Export income data to JSON for backup or import from a previous
								export
							</p>
						</div>

						<div className="flex flex-wrap gap-3">
							<Button
								onClick={handleExport}
								variant="outline"
								className="gap-2"
								disabled={isLoading || incomeEntries.length === 0}
							>
								{isLoading ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Download className="w-4 h-4" />
								)}
								Export Income
								<span className="text-xs text-muted-foreground">
									({incomeEntries.length})
								</span>
							</Button>

							<Button
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
								Import Income
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
						<DialogTitle>Import Income</DialogTitle>
						<DialogDescription>
							Choose how to handle the imported income data.
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
											Add new income entries and skip duplicates (based on entry
											ID).
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
											Replace all existing income data with imported data.
										</div>
									</div>
								</label>
							</div>
						</div>

						{importMode === "replace" && (
							<div className="p-3 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-sm">
								Warning: This will permanently delete all your current income
								data and replace it with the imported data.
							</div>
						)}
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setShowImportDialog(false);
								setImportFilePath(null);
							}}
						>
							Cancel
						</Button>
						<Button
							onClick={handleImportConfirm}
							disabled={isLoading}
							variant={importMode === "replace" ? "destructive" : "default"}
						>
							{isLoading ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Importing...
								</>
							) : (
								<>
									<Upload className="w-4 h-4 mr-2" />
									{importMode === "replace" ? "Replace All" : "Import"}
								</>
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};
