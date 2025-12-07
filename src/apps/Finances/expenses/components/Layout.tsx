import { AnimatedToggle } from "@/components/AnimatedToggle";

interface LayoutProps {
	children: React.ReactNode;
	currentView: "monthly" | "all" | "upcoming";
	setCurrentView: (view: "monthly" | "all" | "upcoming") => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setCurrentView }) => {
	const viewModeOptions = [
		{
			label: "Upcoming",
			value: "upcoming" as const,
			ariaLabel: "Upcoming expenses view",
		},
		{
			label: "Monthly",
			value: "monthly" as const,
			ariaLabel: "Monthly expenses view",
		},
		{
			label: "All",
			value: "all" as const,
			ariaLabel: "All expenses",
		},
	];

	return (
		<div className="flex-1 overflow-y-auto max-h-[98vh] rounded-lg p-2">
			<header className="animate-fadeIn mb-4">
				<h1 className="sr-only">Expense Tracker</h1>
				<div className="w-min mb-4">
					<AnimatedToggle
						options={viewModeOptions}
						value={currentView}
						onChange={(value) => setCurrentView(value)}
					/>
				</div>
			</header>
			<main>{children}</main>
		</div>
	);
};
