// src/components/DebugConsole.tsx

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface LogEntry {
	id: string; // Changed to string for unique IDs
	type: "log" | "error" | "warn" | "info";
	message: string;
	timestamp: Date;
}

export function DebugConsole() {
	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const logCounter = useRef(0);
	const isAddingLog = useRef(false);

	useEffect(() => {
		// Store original console methods
		const originalLog = console.log;
		const originalError = console.error;
		const originalWarn = console.warn;
		const originalInfo = console.info;

		const addLog = (type: LogEntry["type"], args: unknown[]) => {
			// Prevent infinite loop
			if (isAddingLog.current) return;

			isAddingLog.current = true;

			const message = args
				.map((arg) => {
					if (typeof arg === "object") {
						try {
							return JSON.stringify(arg, null, 2);
						} catch {
							return String(arg);
						}
					}
					return String(arg);
				})
				.join(" ");

			const newLog: LogEntry = {
				id: `${Date.now()}-${logCounter.current++}-${Math.random()
					.toString(36)
					.substr(2, 9)}`,
				type,
				message,
				timestamp: new Date(),
			};

			setLogs((prev) => {
				const newLogs = [...prev, newLog];
				// Keep only last 100 logs
				if (newLogs.length > 100) {
					return newLogs.slice(-100);
				}
				return newLogs;
			});

			isAddingLog.current = false;
		};

		// Override console methods
		console.log = (...args) => {
			originalLog.apply(console, args);
			addLog("log", args);
		};

		console.error = (...args) => {
			originalError.apply(console, args);
			addLog("error", args);
		};

		console.warn = (...args) => {
			originalWarn.apply(console, args);
			addLog("warn", args);
		};

		console.info = (...args) => {
			originalInfo.apply(console, args);
			addLog("info", args);
		};

		// Cleanup: restore original console methods
		return () => {
			console.log = originalLog;
			console.error = originalError;
			console.warn = originalWarn;
			console.info = originalInfo;
		};
	}, []);

	const clearLogs = () => setLogs([]);

	const getLogColor = (type: LogEntry["type"]) => {
		switch (type) {
			case "error":
				return "text-red-600 bg-red-50";
			case "warn":
				return "text-yellow-600 bg-yellow-50";
			case "info":
				return "text-blue-600 bg-blue-50";
			default:
				return "text-gray-700";
		}
	};

	return (
		<div className="fixed bottom-0 right-0 w-96 bg-white border-l border-t shadow-lg z-50">
			{/* Header */}
			<div className="flex justify-between items-center p-2 bg-gray-800 text-white">
				<button
					type="button"
					onClick={() => setIsOpen(!isOpen)}
					className="flex-1 text-left text-sm font-semibold cursor-pointer select-none"
					aria-expanded={isOpen}
					aria-controls="debug-console-content"
				>
					Debug Console ({logs.length})
				</button>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={clearLogs}
						className="p-1 hover:bg-gray-700 rounded"
						title="Clear logs"
					>
						<Trash2 size={16} />
					</button>
					<button
						type="button"
						onClick={() => setIsOpen(!isOpen)}
						className="p-1 hover:bg-gray-700 rounded"
						aria-label={isOpen ? "Collapse console" : "Expand console"}
					>
						{isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
					</button>
				</div>
			</div>

			{/* Console Content */}
			{isOpen && (
				<div
					id="debug-console-content"
					className="h-64 overflow-y-auto bg-gray-50 font-mono text-xs"
				>
					{logs.length === 0 ? (
						<div className="p-2 text-gray-500">No logs yet...</div>
					) : (
						<div>
							{logs.map((log) => (
								<div
									key={log.id}
									className={`p-2 border-b border-gray-200 ${getLogColor(
										log.type,
									)} wrap-break-word`}
								>
									<div className="flex gap-2">
										<span className="text-gray-500 whitespace-nowrap">
											{log.timestamp.toLocaleTimeString()}
										</span>
										<span className="font-semibold">
											[{log.type.toUpperCase()}]
										</span>
									</div>
									<div className="mt-1 pl-4 whitespace-pre-wrap">
										{log.message}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
