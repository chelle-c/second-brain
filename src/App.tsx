import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Layout } from "./components/layout/Layout";
import { NotesApp } from "./apps/Notes";
import { FinancesApp } from "./apps/Finances";
import { MindMapApp } from "./apps/MindMap";
import { DebugConsole } from "./components/DebugConsole";
import useAppStore from "./stores/useAppStore";
import { fileStorage } from "./lib/fileStorage";

function App() {
	const loadFromFile = useAppStore((state: { loadFromFile: any }) => state.loadFromFile);
	const isLoading = useAppStore((state: { isLoading: any }) => state.isLoading);

	const initializeApp = async () => {
		try {
			await fileStorage.initialize();
			await loadFromFile();
		} catch (error) {
			console.error("Failed to initialize app:", error);
		}
	};

	useEffect(() => {
		initializeApp();
	}, [loadFromFile]);

	return (
		<>
			{isLoading ? (
				<div>Loading...</div>
			) : (
				<BrowserRouter>
					<Routes>
						<Route path="/" element={<Layout />}>
							<Route index element={<Navigate to="/brain" replace />} />
							<Route path="brain" element={<NotesApp />} />
							<Route path="finance" element={<FinancesApp />} />
							<Route path="mindmap" element={<MindMapApp />} />
						</Route>
					</Routes>
				</BrowserRouter>
			)}
			<DebugConsole />
		</>
	);
}

export default App;
