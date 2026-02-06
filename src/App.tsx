import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loading, PageLoading } from "@/components/ui/loading";
import { Toaster } from "@/components/ui/sonner";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import useAppStore from "@/stores/useAppStore";

const NotesApp = lazy(() => import("@/apps/Notes").then((m) => ({ default: m.NotesApp })));
const ExpensesTracker = lazy(() =>
	import("@/apps/Finances/expenses").then((m) => ({
		default: m.ExpensesTracker,
	})),
);
const IncomeTracker = lazy(() =>
	import("@/apps/Finances/income").then((m) => ({ default: m.IncomeTracker })),
);
const MindMapApp = lazy(() => import("@/apps/MindMap").then((m) => ({ default: m.MindMapApp })));
const Calendar = lazy(() => import("@/apps/Calendar").then((m) => ({ default: m.Calendar })));
const Settings = lazy(() => import("@/apps/Settings").then((m) => ({ default: m.Settings })));

function App() {
	const isLoading = useAppStore((state) => state.isLoading);
	useAppLifecycle();

	return (
		<>
			{isLoading ?
				<Loading fullScreen size="lg" />
			:	<BrowserRouter>
					<Routes>
						<Route path="/" element={<AppLayout />}>
							<Route index element={<Navigate to="/brain" replace />} />
							<Route
								path="brain"
								element={
									<Suspense fallback={<PageLoading />}>
										<NotesApp />
									</Suspense>
								}
							/>
							<Route
								path="income"
								element={
									<Suspense fallback={<PageLoading />}>
										<IncomeTracker />
									</Suspense>
								}
							/>
							<Route
								path="expenses"
								element={
									<Suspense fallback={<PageLoading />}>
										<ExpensesTracker />
									</Suspense>
								}
							/>
							<Route
								path="calendar"
								element={
									<Suspense fallback={<PageLoading />}>
										<Calendar />
									</Suspense>
								}
							/>
							<Route
								path="mindmap"
								element={
									<Suspense fallback={<PageLoading />}>
										<MindMapApp />
									</Suspense>
								}
							/>
							<Route
								path="settings"
								element={
									<Suspense fallback={<PageLoading />}>
										<Settings />
									</Suspense>
								}
							/>
						</Route>
					</Routes>
				</BrowserRouter>
			}
			<Toaster position="bottom-right" closeButton />
		</>
	);
}

export default App;
