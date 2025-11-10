import { useState } from "react";
import { Outlet } from "react-router";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export function AppLayout() {
	const [open, setOpen] = useState(true);

	return (
		<div className="flex h-screen bg-gray-50">
			<SidebarProvider open={open} onOpenChange={setOpen}>
				<AppSidebar />
				<main className="flex-1 overflow-x-hidden min-h-screen bg-linear-to-br from-blue-50 via-white to-blue-100 px-4 py-8">
					<SidebarTrigger className="absolute top-0 left-0 md:left-65 z-10 lg:hidden" />
					<Outlet />
				</main>
			</SidebarProvider>
		</div>
	);
}
