import { useState } from "react";
import { Outlet } from "react-router";
import { AppSidebar } from "./AppSidebar";
import { Button } from "../ui/button";
import { SidebarProvider, SidebarInset, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type CustomTriggerProps = React.ComponentProps<typeof Button> & {
	open?: boolean;
};

const CustomTrigger = ({ className, onClick, open, ...props }: CustomTriggerProps) => {
	const { toggleSidebar } = useSidebar();

	return (
		<Button
			data-sidebar="trigger"
			data-slot="sidebar-trigger"
			variant="ghost"
			size="icon"
			className={cn("absolute top-0 left-0 z-10 size-7", className)}
			onClick={(event) => {
				onClick?.(event);
				toggleSidebar();
			}}
			{...props}
		>
			<ChevronRight
				strokeWidth={3}
				size={24}
				className={`transition duration-400 ${open ? "rotate-180" : ""}`}
			/>
			<span className="sr-only">Toggle Sidebar</span>
		</Button>
	);
};

export function AppLayout() {
	const [open, setOpen] = useState(true);

	return (
		<div className="flex h-screen bg-gray-50">
			<SidebarProvider open={open} onOpenChange={setOpen}>
				<AppSidebar />
				<SidebarInset>
					<div className="flex-1 overflow-hidden min-h-[98vh] bg-linear-to-br rounded-xl from-blue-50 via-white to-blue-100 p-1">
						<CustomTrigger
							open={open}
							className="-left-4 top-[50vh] lg:hidden bg-sidebar rounded-full text-white hover:bg-sidebar hover:text-white"
						/>
						<Outlet />
					</div>
				</SidebarInset>
			</SidebarProvider>
		</div>
	);
}
