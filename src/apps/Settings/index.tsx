import { useState } from "react";
import {
	Settings as SettingsIcon,
	Save,
	FolderOpen,
	StickyNote,
	DollarSign,
	TrendingUp,
	RotateCcw,
	Tag,
	Palette,
	Monitor,
	Sun,
	Moon,
} from "lucide-react";
import { BackupSettings } from "./BackupSettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import useAppStore from "@/stores/useAppStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useNotesStore } from "@/stores/useNotesStore";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { sqlStorage } from "@/lib/storage";
import { AppToSave } from "@/types";
import {
	CURRENCY_OPTIONS,
	WEEK_DAYS,
	ExpenseViewType,
	WeekStartDay,
} from "@/types/settings";
import { IncomeViewType } from "@/types/income";
import { ThemeMode, THEME_MODE_OPTIONS } from "@/types/theme";
import { useThemeStore } from "@/stores/useThemeStore";
import { CategoryManager } from "@/apps/Finances/expenses/components/CategoryManager";

export const Settings = () => {
	const { lastSaved, saveToFile } = useAppStore();
	const { notesFolders } = useNotesStore();
	const { categories, categoryColors } = useExpenseStore();

	const {
		autoSaveEnabled,
		notesDefaultFolder,
		expenseDefaultView,
		expenseCurrency,
		incomeDefaultView,
		incomeWeekStartDay,
		incomeCurrency,
		setAutoSaveEnabled,
		setNotesDefaultFolder,
		setExpenseDefaultView,
		setExpenseCurrency,
		setIncomeDefaultView,
		setIncomeWeekStartDay,
		setIncomeCurrency,
		resetToDefaults,
	} = useSettingsStore();

	const { mode: themeMode, setMode: setThemeMode } = useThemeStore();

	const [showCategoryManager, setShowCategoryManager] = useState(false);

	const getThemeModeIcon = (mode: ThemeMode) => {
		switch (mode) {
			case "system":
				return <Monitor className="w-4 h-4" />;
			case "light":
				return <Sun className="w-4 h-4" />;
			case "dark":
				return <Moon className="w-4 h-4" />;
		}
	};

	const handleOpenDataFolder = async () => {
		try {
			await sqlStorage.openDataFolder();
		} catch (error) {
			console.error("Failed to open data folder:", error);
		}
	};

	// Get folder options for notes
	const folderOptions = [
		...Object.values(notesFolders).map((folder) => ({
			value: folder.id,
			label: folder.name,
		})),
	];

	const expenseViewOptions: { value: ExpenseViewType; label: string }[] = [
		{ value: "upcoming", label: "Upcoming Expenses" },
		{ value: "monthly", label: "Monthly Overview" },
		{ value: "all", label: "All Expenses" },
	];

	const incomeViewOptions: { value: IncomeViewType; label: string }[] = [
		{ value: "weekly", label: "Weekly View" },
		{ value: "monthly", label: "Monthly View" },
		{ value: "yearly", label: "Yearly View" },
	];

	return (
		<div className="flex-1 overflow-y-auto max-h-[98vh] p-4 w-full min-h-screen">
			<div className="w-full max-w-4xl mx-auto my-6 animate-slideUp space-y-6">
				{/* Title */}
				<h1 className="sr-only">
					Settings
				</h1>

				{/* General Settings */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<SettingsIcon className="w-5 h-5" />
							General
						</CardTitle>
						<CardDescription>App-wide settings and data management</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Auto-save */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label htmlFor="auto-save" className="text-base font-medium">
									Auto-save
								</Label>
								<p className="text-sm text-muted-foreground">
									Automatically save changes as you work
								</p>
							</div>
							<Switch
								id="auto-save"
								checked={autoSaveEnabled}
								onCheckedChange={setAutoSaveEnabled}
							/>
						</div>

						<Separator />

						{/* Last saved info */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Last Saved</Label>
								<p className="text-sm text-muted-foreground">
									{lastSaved
										? new Date(lastSaved).toLocaleString()
										: "Not saved yet"}
								</p>
							</div>
							<Button
								onClick={() => saveToFile(AppToSave.All)}
								variant="outline"
								className="gap-2"
							>
								<Save className="w-4 h-4" />
								Save Now
							</Button>
						</div>

						<Separator />

						{/* Data folder */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Data Location</Label>
								<p className="text-sm text-muted-foreground">
									Open the folder where your data is stored
								</p>
							</div>
							<Button
								onClick={handleOpenDataFolder}
								variant="outline"
								className="gap-2"
							>
								<FolderOpen className="w-4 h-4" />
								Open Folder
							</Button>
						</div>

						<Separator />

						{/* Reset to defaults */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Reset Settings</Label>
								<p className="text-sm text-muted-foreground">
									Restore all settings to their default values
								</p>
							</div>
							<Button onClick={resetToDefaults} variant="outline" className="gap-2">
								<RotateCcw className="w-4 h-4" />
								Reset
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* Appearance Settings */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Palette className="w-5 h-5" />
							Appearance
						</CardTitle>
						<CardDescription>Customize the look and feel of the app</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Theme Mode */}
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label className="text-base font-medium">Theme</Label>
								<p className="text-sm text-muted-foreground">
									Choose between light and dark mode
								</p>
							</div>
							<Select
								value={themeMode}
								onValueChange={(value) => setThemeMode(value as ThemeMode)}
							>
								<SelectTrigger className="w-[200px]">
									<div className="flex items-center gap-2">
										<SelectValue placeholder="Select theme" />
									</div>
								</SelectTrigger>
								<SelectContent>
									{THEME_MODE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											<div className="flex items-center gap-2">
												{getThemeModeIcon(option.value)}
												{option.label}
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</CardContent>
				</Card>

				{/* Notes Settings */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<StickyNote className="w-5 h-5" />
							Notes
						</CardTitle>
						<CardDescription>Configure notes app behavior</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Default folder */}
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

				{/* Expense Tracker Settings */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<DollarSign className="w-5 h-5" />
							Expense Tracker
						</CardTitle>
						<CardDescription>Configure expense tracker behavior</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Default view */}
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

						{/* Currency */}
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

						{/* Categories */}
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

						{/* Category preview */}
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
					</CardContent>
				</Card>

				{/* Income Tracker Settings */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<TrendingUp className="w-5 h-5" />
							Income Tracker
						</CardTitle>
						<CardDescription>Configure income tracker behavior</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Default view */}
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

						{/* Week start day */}
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
									setIncomeWeekStartDay(parseInt(value) as WeekStartDay)
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

						{/* Currency */}
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
					</CardContent>
				</Card>

				{/* Backup & Data Management */}
				<BackupSettings />
			</div>

			{/* Category Manager Modal */}
			<CategoryManager
				isOpen={showCategoryManager}
				onClose={() => setShowCategoryManager(false)}
			/>
		</div>
	);
};
