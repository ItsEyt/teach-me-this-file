import { useEffect, useState } from "react";
import { wakeServer } from "../lib/api.js";

const SLOW_AFTER_MS = 3000;
const RETRY_EVERY_MS = 5000;
const MAX_ATTEMPTS = 12;

/**
 * Pings the server as soon as the app opens. Free hosts put idle servers to sleep,
 * so a slow first answer is reported as "waking" instead of looking like a failure.
 * @returns {{ status: "connecting" | "waking" | "ready" | "offline", info: object | null }}
 */
export function useServerStatus() {
	const [state, setState] = useState({ status: "connecting", info: null });

	useEffect(() => {
		const controller = new AbortController();
		const slowTimer = setTimeout(() => {
			setState((s) => (s.status === "connecting" ? { ...s, status: "waking" } : s));
		}, SLOW_AFTER_MS);

		(async () => {
			for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
				try {
					const info = await wakeServer(controller.signal);
					setState({ status: "ready", info });
					return;
				} catch (err) {
					if (err.name === "AbortError") return;
					await new Promise((resolve) => setTimeout(resolve, RETRY_EVERY_MS));
				}
			}
			setState({ status: "offline", info: null });
		})();

		return () => {
			clearTimeout(slowTimer);
			controller.abort();
		};
	}, []);

	return state;
}
