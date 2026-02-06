import {
	CalendarDays,
	Database,
	DollarSign,
	type LucideIcon,
	Palette,
	Settings as SettingsIcon,
	StickyNote,
	TrendingUp,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

interface Section {
	id: string;
	label: string;
	icon: LucideIcon;
}

const sections: Section[] = [
	{ id: "general", label: "General", icon: SettingsIcon },
	{ id: "appearance", label: "Appearance", icon: Palette },
	{ id: "notes", label: "Notes", icon: StickyNote },
	{ id: "expenses", label: "Expense Tracker", icon: DollarSign },
	{ id: "income", label: "Income Tracker", icon: TrendingUp },
	{ id: "calendar", label: "Calendar", icon: CalendarDays },
	{ id: "backup", label: "Backup", icon: Database },
];

interface LayoutProps {
	children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
	const [activeSection, setActiveSection] = useState("general");
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const handleScroll = () => {
			const scrollTop = container.scrollTop;

			for (let i = sections.length - 1; i >= 0; i--) {
				const section = document.getElementById(sections[i].id);
				if (section) {
					const sectionTop = section.offsetTop - container.offsetTop;
					if (scrollTop >= sectionTop - 150) {
						setActiveSection(sections[i].id);
						break;
					}
				}
			}
		};

		container.addEventListener("scroll", handleScroll);
		return () => container.removeEventListener("scroll", handleScroll);
	}, []);

	const scrollToSection = (id: string) => {
		const element = document.getElementById(id);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	};

	return (
		<div
			ref={scrollContainerRef}
			className="flex-1 overflow-y-auto max-h-[98vh] p-4 w-full min-h-screen"
		>
			<div className="w-full max-w-5xl mx-auto my-6 animate-slideUp">
				<h1 className="sr-only">Settings</h1>

				<div className="flex gap-6">
					<aside className="hidden md:block w-48 shrink-0">
						<nav className="sticky top-6 space-y-1">
							<h2 className="text-sm font-semibold text-foreground mb-3 px-3">
								Settings
							</h2>
							{sections.map((section) => {
								const Icon = section.icon;
								return (
									<button
										type="button"
										key={section.id}
										onClick={() => scrollToSection(section.id)}
										className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
											activeSection === section.id ?
												"bg-primary text-primary-foreground"
											:	"text-muted-foreground hover:text-foreground hover:bg-accent"
										}`}
									>
										<Icon className="w-4 h-4 shrink-0" />
										{section.label}
									</button>
								);
							})}
						</nav>
					</aside>

					<div className="flex-1 space-y-6 min-w-0">{children}</div>
				</div>
			</div>
		</div>
	);
};
