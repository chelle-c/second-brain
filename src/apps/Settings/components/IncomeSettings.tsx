import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { CURRENCY_OPTIONS, WEEK_DAYS, WeekStartDay } from "@/types/settings";
import { IncomeViewType } from "@/types/income";

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
		setIncomeDefaultView,
		setIncomeWeekStartDay,
		setIncomeCurrency,
	} = useSettingsStore();

	return (
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
						onValueChange={(value) => setIncomeDefaultView(value as IncomeViewType)}
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
						onValueChange={(value) => setIncomeWeekStartDay(parseInt(value) as WeekStartDay)}
					>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="Select day" />
						</SelectTrigger>
						<SelectContent>
							{WEEK_DAYS.map((option) => (
								<SelectItem key={option.value} value={option.value.toString()}>
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
					<Select
						value={incomeCurrency}
						onValueChange={setIncomeCurrency}
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
			</CardContent>
		</Card>
	);
};
