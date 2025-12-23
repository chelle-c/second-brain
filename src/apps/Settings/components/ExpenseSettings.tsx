import { useState } from "react";
import {
	DollarSign,
	Tag,
	CreditCard,
	Download,
	Upload,
	Loader2,
	CheckCircle,
	XCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { useBackupStore } from "@/stores/useBackupStore";
import { CURRENCY_OPTIONS, ExpenseViewType } from "@/types/settings";
import { CategoryManager } from "@/apps/Finances/expenses/components/CategoryManager";
import { PaymentMethodManager } from "@/apps/Finances/expenses/components/PaymentMethodManager";
import { save, open } from "@tauri-apps/plugin-dialog";
import { documentDir } from "@tauri-apps/api/path";

const expenseViewOptions: { value: ExpenseViewType; label: string }[] = [
	{ value: "upcoming", label: "Upcoming Expenses" },
	{ value: "monthly", label: "Monthly Overview" },
	{ value: "all", label: "All Expenses" },
];

export const ExpenseSettings = () => {
	const { expenseDefaultView, expenseCurrency, setExpenseDefaultView, setExpenseCurrency } =
		useSettingsStore();
	const { categories, categoryColors, paymentMethods, expenses } = useExpenseStore();
	const { exportExpensesToFile, importExpensesFromFile, isLoading } = useBackupStore();

	const [showCategoryManager, setShowCategoryManager] = useState(false);
	const [showPaymentMethodManager, setShowPaymentMethodManager] = useState(false);
	const [showImportDialog, setShowImportDialog] = useState(false);
	const [importFilePath, setImportFilePath] = useState<string | null>(null);
	const [importMode, setImportMode] = useState<"replace" | "merge">("merge");
	const [exportResult, setExportResult] = useState<{ success: boolean; message: string } | null>(
		null
	);
	const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(
		null
	);

	const handleExport = async () => {
		try {
			const defaultPath = await documentDir();
			const timestamp = new Date().toISOString().slice(0, 10);

			const filePath = await save({
				defaultPath: `${defaultPath}/expenses-export-${timestamp}.json`,
				filters: [
					{
						name: "JSON",
						extensions: ["json"],
					},
				],
				title: "Export Expenses",
			});

			if (filePath) {
				const result = await exportExpensesToFile(filePath);
				if (result.success) {
					setExportResult({
						success: true,
						message: `Successfully exported ${expenses.length} expenses`,
					});
				} else {
					setExportResult({ success: false, message: result.error || "Export failed" });
				}

				// Clear result after 5 seconds
				setTimeout(() => setExportResult(null), 5000);
			}
		} catch (error) {
			console.error("Export error:", error);
			setExportResult({ success: false, message: "Failed to export expenses" });
			setTimeout(() => setExportResult(null), 5000);
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
				title: "Import Expenses",
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

		try {
			const result = await importExpensesFromFile(importFilePath, importMode);

			setShowImportDialog(false);
			setImportFilePath(null);

			if (result.success) {
				const message =
					importMode === "replace"
						? `Successfully imported ${result.importedCount} expenses`
						: `Imported ${result.importedCount} new expenses, skipped ${result.skippedCount} duplicates`;
				setImportResult({ success: true, message });
			} else {
				setImportResult({ success: false, message: result.error || "Import failed" });
			}

			setTimeout(() => setImportResult(null), 5000);
		} catch (error) {
			console.error("Import error:", error);
			setShowImportDialog(false);
			setImportFilePath(null);
			setImportResult({ success: false, message: "Failed to import expenses" });
			setTimeout(() => setImportResult(null), 5000);
		}
	};

	return (
		<>
			<Card id="expenses" className="scroll-mt-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<DollarSign className="w-5 h-5" />
						Expense Tracker
					</CardTitle>
					<CardDescription>Configure expense tracker behavior</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="text-base font-medium">Default View</Label>
							<p className="text-sm text-muted-foreground">
								View shown when opening Expense Tracker
							</p>
						</div>
						<Select
							value={expenseDefaultView}
							onValueChange={(value) =>
								setExpenseDefaultView(value as ExpenseViewType)
							}
						>
							<SelectTrigger className="w-[200px]">
								<SelectValue placeholder="Select view" />
							</SelectTrigger>
							<SelectContent>
								{expenseViewOptions.map((option) => (
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
							<Label className="text-base font-medium">Currency</Label>
							<p className="text-sm text-muted-foreground">
								Currency used for displaying expenses
							</p>
						</div>
						<Select value={expenseCurrency} onValueChange={setExpenseCurrency}>
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
							<Label className="text-base font-medium">Categories</Label>
							<p className="text-sm text-muted-foreground">
								{categories.length} categories configured
							</p>
						</div>
						<Button
							onClick={() => setShowCategoryManager(true)}
							variant="outline"
							className="gap-2"
						>
							<Tag className="w-4 h-4" />
							Manage Categories
						</Button>
					</div>

					<div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
						{categories.slice(0, 8).map((category) => (
							<span
								key={category}
								className="px-3 py-1 text-sm font-medium text-white rounded-full"
								style={{
									backgroundColor: categoryColors[category] || "#6b7280",
								}}
							>
								{category}
							</span>
						))}
						{categories.length > 8 && (
							<span className="px-3 py-1 text-sm font-medium text-muted-foreground">
								+{categories.length - 8} more
							</span>
						)}
					</div>

					<Separator />

					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label className="text-base font-medium">Payment Methods</Label>
							<p className="text-sm text-muted-foreground">
								{paymentMethods.length} payment methods configured
							</p>
						</div>
						<Button
							onClick={() => setShowPaymentMethodManager(true)}
							variant="outline"
							className="gap-2"
						>
							<CreditCard className="w-4 h-4" />
							Manage Payment Methods
						</Button>
					</div>

					<div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
						{paymentMethods.slice(0, 8).map((method) => (
							<span
								key={method}
								className="px-3 py-1 text-sm font-medium bg-secondary text-secondary-foreground rounded-full flex items-center gap-1"
							>
								<CreditCard className="w-3 h-3" />
								{method}
							</span>
						))}
						{paymentMethods.length > 8 && (
							<span className="px-3 py-1 text-sm font-medium text-muted-foreground">
								+{paymentMethods.length - 8} more
							</span>
						)}
					</div>

					<Separator />

					<div className="space-y-4">
						<div className="space-y-0.5">
							<Label className="text-base font-medium">Import & Export</Label>
							<p className="text-sm text-muted-foreground">
								Export expenses to JSON for backup or import from a previous export
							</p>
						</div>

						<div className="flex flex-wrap gap-3">
							<Button
								onClick={handleExport}
								variant="outline"
								className="gap-2"
								disabled={isLoading || expenses.length === 0}
							>
								{isLoading ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<Download className="w-4 h-4" />
								)}
								Export Expenses
								<span className="text-xs text-muted-foreground">
									({expenses.length})
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
								Import Expenses
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

			<CategoryManager
				isOpen={showCategoryManager}
				onClose={() => setShowCategoryManager(false)}
			/>

			<PaymentMethodManager
				isOpen={showPaymentMethodManager}
				onClose={() => setShowPaymentMethodManager(false)}
			/>

			{/* Import Confirmation Dialog */}
			<Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Import Expenses</DialogTitle>
						<DialogDescription>
							Choose how to handle the imported expenses.
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
											Add new expenses and skip duplicates. Categories and
											payment methods will be merged.
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
											Replace all existing expenses with imported data. This
											will delete your current expenses.
										</div>
									</div>
								</label>
							</div>
						</div>

						{importMode === "replace" && (
							<div className="p-3 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-sm">
								⚠️ Warning: This will permanently delete all your current expenses
								and replace them with the imported data.
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
