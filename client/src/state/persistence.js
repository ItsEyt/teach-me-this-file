const KEY = "tmtf:lesson:v1";

/**
 * A streaming message cannot survive a reload, so it comes back as "stopped".
 * An old error comes back as a repeat, so it waits for a click instead of retrying by itself.
 */
function settle(state) {
	const settleMessage = (m) => {
		if (m.status === "streaming") return { ...m, status: "stopped" };
		if (m.status === "error") return { ...m, error: { ...m.error, repeat: true } };
		return m;
	};
	return { ...state, messages: state.messages.map(settleMessage) };
}

export function saveLesson(state) {
	try {
		localStorage.setItem(KEY, JSON.stringify(state));
	} catch {
		// Storage can be full or blocked (private mode). Resuming is a convenience, so ignore it.
	}
}

/** The saved lesson, only if it is still in progress. */
export function loadSavedLesson() {
	try {
		const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
		return saved?.phase === "teaching" ? settle(saved) : null;
	} catch {
		return null;
	}
}

export function clearSavedLesson() {
	try {
		localStorage.removeItem(KEY);
	} catch {
		// Nothing to clear if storage is unavailable.
	}
}
