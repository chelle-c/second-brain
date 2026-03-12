import { vi } from "vitest";

/**
 * Global Tauri API mocks.
 * These are stubbed as no-ops by default so component tests don't blow up.
 * Individual tests can override with vi.mocked(invoke).mockImplementation(...)
 */

vi.mock("@tauri-apps/api/core", () => ({
	invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/event", () => {
	// Registry so tests can fire events into listeners if they want
	const listeners = new Map<string, Set<(event: { payload: unknown }) => void>>();

	return {
		emit: vi.fn().mockResolvedValue(undefined),
		listen: vi.fn().mockImplementation(
			async (event: string, handler: (e: { payload: unknown }) => void) => {
				if (!listeners.has(event)) listeners.set(event, new Set());
				listeners.get(event)!.add(handler);
				// return an unlisten fn
				return () => listeners.get(event)?.delete(handler);
			},
		),
		// Helper for tests to trigger a listener — not part of real API,
		// but we export it so integration-style tests can simulate Rust → JS events.
		__fireEvent: (event: string, payload: unknown) => {
			listeners.get(event)?.forEach((h) => h({ payload }));
		},
		__clearListeners: () => listeners.clear(),
	};
});