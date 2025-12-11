import { useState } from "react";
import { DollarSign, Tag } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useExpenseStore } from "@/stores/useExpenseStore";
import { CURRENCY_OPTIONS, ExpenseViewType } from "@/types/settings";
import { CategoryManager } from "@/apps/Finances/expenses/components/CategoryManager";

const expenseViewOptions: { value: ExpenseViewType; label: string }[] = [
	{ value: "upcoming", label: "Upcoming Expenses" },
	{ value: "monthly", label: "Monthly Overview" },
	{ value: "all", label: "All Expenses" },
];

export const ExpenseSettings = () => {
	const { expenseDefaultView, expenseCurrency, setExpenseDefaultView, setExpenseCurrency } = useSettingsStore();
	const { categories, categoryColors } = useExpenseStore();
	const [showCategoryManager, setShowCategoryManager] = useState(false);

	return (
		<>
			<Card id="expenses" className="scroll-mt-6">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<DollarSign className="w-5 h-5" />
						Expense Tracker
					</CardTitle>
					<CardDescription>
						Configure expense tracker behavior
					</CardDescription>
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
							onValueChange={(value) => setExpenseDefaultView(value as ExpenseViewType)}
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
						<Select
							value={expenseCurrency}
							onValueChange={setExpenseCurrency}
						>
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
				</CardContent>
			</Card>

			<CategoryManager
				isOpen={showCategoryManager}
				onClose={() => setShowCategoryManager(false)}
			/>
		</>
	);
};
