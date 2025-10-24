// src/components/layout/Layout.tsx
import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";

export function Layout() {
	return (
		<div className="flex h-screen bg-gray-50">
			<Sidebar />
			<main className="flex-1 overflow-auto">
				<Outlet />
			</main>
		</div>
	);
}
