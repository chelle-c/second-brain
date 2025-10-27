import { NavLink } from "react-router";
import useAppStore from "../../stores/useAppStore";
import { fileStorage } from "../../lib/fileStorage";
import { AppToSave } from "@/types";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
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
} from "@/components/ui/sidebar";
import { Inbox, DollarSign, Folder, Network, Save, Settings } from "lucide-react";

export function LayoutSidebar() {
	const { lastSaved, autoSaveEnabled, toggleAutoSave, saveToFile } = useAppStore();

	const items = [
		{
			title: "Notes",
			url: "brain",
			icon: Inbox,
		},
		{
			title: "Expenses",
			url: "budget",
			icon: DollarSign,
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
							{items.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild>
										<NavLink
											to={`/${item.url}`}
											className={({ isActive }) =>
												`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
													isActive ? "bg-blue-600" : "hover:bg-gray-800"
												}`
											}
										>
											<item.icon size={20} />
											<span>{item.title}</span>
										</NavLink>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
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
		// <div className="w-64 bg-gray-900 text-white h-screen flex flex-col">
		// 	<div className="p-4">
		// 		<h1 className="text-xl font-bold">My Desktop App</h1>
		// 	</div>

		// 	<nav className="flex-1 px-2">
		// 		<NavLink
		// 			to="/brain"
		// 			className={({ isActive }) =>
		// 				`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
		// 					isActive ? "bg-blue-600" : "hover:bg-gray-800"
		// 				}`
		// 			}
		// 		>
		// 			<BrainCircuit size={20} />
		// 			Notes
		// 		</NavLink>

		// 		<NavLink
		// 			to="/budget"
		// 			className={({ isActive }) =>
		// 				`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
		// 					isActive ? "bg-blue-600" : "hover:bg-gray-800"
		// 				}`
		// 			}
		// 		>
		// 			<DollarSign size={20} />
		// 			Budget
		// 		</NavLink>

		// 		<NavLink
		// 			to="/mindmap"
		// 			className={({ isActive }) =>
		// 				`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
		// 					isActive ? "bg-blue-600" : "hover:bg-gray-800"
		// 				}`
		// 			}
		// 		>
		// 			<Network size={20} />
		// 			Mind Map
		// 		</NavLink>
		// 	</nav>

		// 	<Separator />

		// 	<div className="p-4 flex flex-col gap-1">
		// 		<div className="text-xs text-gray-400 mb-3">
		// 			{lastSaved && `Last saved: ${new Date(lastSaved).toLocaleTimeString()}`}
		// 		</div>

		// 		<div className="mb-2 flex justify-between items-center gap-2">
		// 			<Label htmlFor="auto-save">Auto-save</Label>
		// 			<Switch
		// 				id="auto-save"
		// 				defaultChecked
		// 				checked={autoSaveEnabled}
		// 				onCheckedChange={() => toggleAutoSave()}
		// 				className="mr-2 shrink-0"
		// 			/>
		// 		</div>

		// 		<Button
		// 			onClick={() => saveToFile(AppToSave.All)}
		// 			className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 rounded hover:bg-green-700 mb-2"
		// 		>
		// 			<Save size={16} />
		// 			Save Now
		// 		</Button>

		// 		<button
		// 			onClick={async () => {
		// 				try {
		// 					await fileStorage.openDataFolder();
		// 				} catch (error) {
		// 					console.error("Failed to open data folder:", error);
		// 				}
		// 			}}
		// 			className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 mb-2 text-sm"
		// 		>
		// 			<Folder size={16} />
		// 			Open Data Folder
		// 		</button>
		// 	</div>
		// </div>
	);
}
