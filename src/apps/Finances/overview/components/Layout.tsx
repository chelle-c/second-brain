import type React from "react";
import { AnimatedToggle } from "@/components/AnimatedToggle";
import type { OverviewViewType } from "@/types/overview";

interface LayoutProps {
	children: React.ReactNode;
	currentView: OverviewViewType;
	setCurrentView: (view: OverviewViewType) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setCurrentView }) => {
	const viewModeOptions = [
		{
			label: "Cash Flow",
			value: "cashflow" as const,
			ariaLabel: "Monthly income vs expenses",
		},
		{
			label: "Burn Rate",
			value: "burnrate" as const,
			ariaLabel: "Essential spending over time",
		},
		{
			label: "Coverage",
			value: "coverage" as const,
			ariaLabel: "How well income covers expenses",
		},
		{
			label: "Savings",
			value: "savings" as const,
			ariaLabel: "Plan for discretionary purchases",
		},
	];

	return (
		<div className="flex-1 overflow-y-auto max-h-[98vh] rounded-lg p-2">
			<header className="animate-fadeIn mb-4">
				<h1 className="sr-only">Financial Overview</h1>
				<div className="flex items-center justify-between mb-4">
					<div className="w-min">
						<AnimatedToggle
							options={viewModeOptions}
							value={currentView}
							onChange={(value) => setCurrentView(value)}
						/>
					</div>
				</div>
			</header>
			<main className="w-full max-w-7xl mx-auto">{children}</main>
		</div>
	);
};
