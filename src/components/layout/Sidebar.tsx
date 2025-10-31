import { NavLink } from "react-router";
import useAppStore from "@/stores/useAppStore";
import { fileStorage } from "@/lib/fileStorage";
import { AppToSave } from "@/types";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarFooter,
	SidebarHeader,
	SidebarMenuSub,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Inbox, DollarSign, Folder, Network, Save, Settings, Plus, Minus } from "lucide-react";

export function LayoutSidebar() {
	const { lastSaved, autoSaveEnabled, toggleAutoSave, saveToFile } = useAppStore();

	const items = [
		{
			title: "Notes",
			url: "brain",
			icon: Inbox,
		},
		{
			title: "Finance",
			url: "finance",
			icon: DollarSign,
			subItems: [
				{
					title: "Expenses",
					url: "expenses",
					icon: Folder,
				},
				{
					title: "Income",
					url: "income",
					icon: Folder,
				},
			],
		},
		{
			title: "Mind Map",
			url: "mindmap",
			icon: Network,
		},
		{
			title: "Settings",
			url: "#",
			icon: Settings,
		},
	];

	return (
		<Sidebar>
			<SidebarHeader>
				<h1 className="mx-2 text-xl font-bold">Second Brain App</h1>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Application</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{items.map((item) =>
								item?.subItems ? (
									<Collapsible
										key={item.title}
										defaultOpen
										className="group/collapsible"
									>
										<SidebarMenuItem>
											<CollapsibleTrigger asChild>
												<SidebarMenuButton className="cursor-pointer hover:bg-sidebar-background-hover rounded-md">
													<div className="w-full flex items-center justify-between">
														<item.icon size={16} />
														<span className="pl-2 text-md font-semibold">
															{item.title}
														</span>
														<Plus
															size={16}
															className="ml-auto group-data-[state=open]/collapsible:hidden"
														/>
														<Minus
															size={16}
															className="ml-auto group-data-[state=closed]/collapsible:hidden"
														/>
													</div>
												</SidebarMenuButton>
											</CollapsibleTrigger>
											<CollapsibleContent>
												<SidebarMenuSub>
													{item.subItems.map((subItem) => (
														<SidebarMenuSubItem key={subItem.title}>
															<NavLink to={`/${subItem.url}`}>
																<SidebarMenuButton className="cursor-pointer pl-4 text-md font-semibold hover:bg-sidebar-background-hover rounded-md">
																	<subItem.icon size={16} />
																	<span>{subItem.title}</span>
																</SidebarMenuButton>
															</NavLink>
														</SidebarMenuSubItem>
													))}
												</SidebarMenuSub>
											</CollapsibleContent>
										</SidebarMenuItem>
									</Collapsible>
								) : (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											asChild
											className="cursor-pointer hover:bg-sidebar-background-hover rounded-md"
										>
											<NavLink to={`/${item.url}`}>
												<item.icon size={20} />
												<span>{item.title}</span>
											</NavLink>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)
							)}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="mt-auto gap-0">
				<Separator className="my-2" />
				<div className="flex justify-between items-center">
					<Label htmlFor="auto-save">Auto-save</Label>
					<Switch
						id="auto-save"
						defaultChecked
						checked={autoSaveEnabled}
						onCheckedChange={() => toggleAutoSave()}
						className="mr-2 shrink-0"
					/>
				</div>
				<div className="text-xs text-gray-400 mb-3">
					{lastSaved && `Last saved: ${new Date(lastSaved).toLocaleTimeString()}`}
				</div>

				<Button
					onClick={() => saveToFile(AppToSave.All)}
					className="w-full flex items-center justify-center gap-2 px-3 py-0 bg-green-600 rounded hover:bg-green-700 mb-2"
				>
					<Save size={16} />
					Save Now
				</Button>

				<Button
					onClick={async () => {
						try {
							await fileStorage.openDataFolder();
						} catch (error) {
							console.error("Failed to open data folder:", error);
						}
					}}
					className="w-full flex items-center justify-center gap-2 px-3 py-0 bg-gray-700 rounded hover:bg-gray-600 mb-2 text-sm"
				>
					<Folder size={16} />
					Open Data Folder
				</Button>
			</SidebarFooter>
		</Sidebar>
	);
}
