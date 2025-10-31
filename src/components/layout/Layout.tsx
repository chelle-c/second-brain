import { useState } from "react";
import { Outlet } from "react-router";
import { LayoutSidebar } from "./Sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function Layout() {
	const [open, setOpen] = useState(true);

	return (
		<div className="flex h-screen bg-gray-50">
			<SidebarProvider open={open} onOpenChange={setOpen}>
				<LayoutSidebar />
				<main className="flex-1 overflow-x-hidden min-h-screen bg-gray-50 px-4 py-8">
					<SidebarTrigger className="absolute top-0 left-0 md:left-65 z-10 lg:hidden" />
					<Outlet />
				</main>
			</SidebarProvider>
		</div>
	);
}
