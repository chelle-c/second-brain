import {
	CalendarDays,
	Brain,
	ChevronRight,
	DollarSign,
	Settings,
	StickyNote,
	TrendingUp,
} from "lucide-react";
import { NavLink } from "react-router";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import useAppStore from "@/stores/useAppStore";

export function AppSidebar() {
	const { lastSaved } = useAppStore();

	const items = [
		{
			title: "Notes",
			url: "notes",
			icon: StickyNote,
		},
		{
			title: "Finance",
			url: "finance",
			icon: DollarSign,
			subItems: [
				{
					title: "Expenses",
					url: "expenses",
					icon: DollarSign,
				},
				{
					title: "Income",
					url: "income",
					icon: TrendingUp,
				},
			],
		},
		{
			title: "Calendar",
			url: "calendar",
			icon: CalendarDays,
		},
		{
			title: "Settings",
			url: "settings",
			icon: Settings,
		},
	];

	return (
		<Sidebar variant="inset" collapsible="offcanvas">
			<SidebarHeader className="py-5 flex flex-row items-center gap-3 border-b border-sidebar-border">
				<div className="p-2 bg-sidebar-accent rounded-lg">
					<Brain size={28} className="text-sidebar-accent-foreground" />
				</div>
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Lunite</h1>
					<div className="text-xs font-medium text-sidebar-foreground/60">
						Your Second Brain
					</div>
				</div>
			</SidebarHeader>
			<SidebarContent className="py-4">
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu className="space-y-1">
							{items.map((item) =>
								item?.subItems ? (
									<Collapsible
										key={item.title}
										defaultOpen
										className="group/collapsible"
									>
										<SidebarMenuItem>
											<CollapsibleTrigger asChild>
												<SidebarMenuButton className="group/btn cursor-pointer h-8 px-3 hover:bg-sidebar-accent rounded-md transition-colors">
													<div className="w-full flex items-center gap-3">
														<item.icon
															size={18}
															className="text-sidebar-foreground/70 group-hover/btn:text-sidebar-accent-foreground transition-colors"
														/>
														<span className="flex-1 text-sm font-medium group-hover/btn:text-sidebar-accent-foreground transition-colors">
															{item.title}
														</span>
														<ChevronRight
															size={16}
															className="text-sidebar-foreground/50 group-hover/btn:text-sidebar-accent-foreground transition-transform group-data-[state=open]/collapsible:rotate-90"
														/>
													</div>
												</SidebarMenuButton>
											</CollapsibleTrigger>
											<CollapsibleContent>
												<SidebarMenuSub className="mt-1 ml-4 pl-3 border-l-2 border-sidebar-border">
													{item.subItems.map((subItem) => (
														<SidebarMenuSubItem key={subItem.title}>
															<NavLink to={`/${subItem.url}`} className="block">
																{({ isActive }) => (
																	<SidebarMenuButton
																		className={`group/btn cursor-pointer h-9 px-3 rounded-lg transition-colors ${
																			isActive
																				? "bg-sidebar-accent"
																				: "hover:bg-sidebar-accent"
																		}`}
																	>
																		<subItem.icon
																			size={16}
																			className={`transition-colors ${
																				isActive
																					? "text-sidebar-accent-foreground"
																					: "text-sidebar-foreground/70 group-hover/btn:text-sidebar-accent-foreground"
																			}`}
																		/>
																		<span
																			className={`text-sm font-medium transition-colors ${
																				isActive
																					? "text-sidebar-accent-foreground"
																					: "group-hover/btn:text-sidebar-accent-foreground"
																			}`}
																		>
																			{subItem.title}
																		</span>
																	</SidebarMenuButton>
																)}
															</NavLink>
														</SidebarMenuSubItem>
													))}
												</SidebarMenuSub>
											</CollapsibleContent>
										</SidebarMenuItem>
									</Collapsible>
								) : (
									<SidebarMenuItem key={item.title}>
										<NavLink to={`/${item.url}`} className="block">
											{({ isActive }) => (
												<SidebarMenuButton
													className={`group/btn cursor-pointer h-8 px-3 rounded-lg transition-colors ${
														isActive
															? "bg-sidebar-accent"
															: "hover:bg-sidebar-accent"
													}`}
												>
													<item.icon
														size={18}
														className={`transition-colors ${
															isActive
																? "text-sidebar-accent-foreground"
																: "text-sidebar-foreground/70 group-hover/btn:text-sidebar-accent-foreground"
														}`}
													/>
													<span
														className={`text-sm font-medium transition-colors ${
															isActive
																? "text-sidebar-accent-foreground"
																: "group-hover/btn:text-sidebar-accent-foreground"
														}`}
													>
														{item.title}
													</span>
												</SidebarMenuButton>
											)}
										</NavLink>
									</SidebarMenuItem>
								),
							)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="px-4 py-3 border-t border-sidebar-border">
				<div className="text-xs text-sidebar-foreground/50 text-center">
					{lastSaved
						? `Last saved: ${new Date(lastSaved).toLocaleTimeString()}`
						: "Not saved yet"}
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
