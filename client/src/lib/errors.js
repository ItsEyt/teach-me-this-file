/**
 * Turn an ApiError into friendly copy and the one action that can fix it.
 * @returns {{ title: string, message: string, action: "settings" | "retry" | null }}
 */
export function describeError(error) {
	switch (error.code) {
		case "MISSING_KEY":
			return { title: "API key needed", message: error.message, action: "settings" };
		case "INVALID_KEY":
			return {
				title: "That key didn't work",
				message: "Check it in Google AI Studio, then paste it again.",
				action: "settings",
			};
		case "MODEL_NOT_FOUND":
			return { title: "Model not found", message: "Pick another model in settings.", action: "settings" };
		case "RATE_LIMITED":
			return {
				title: "Gemini's free tier needs a breather",
				message: "Too many requests in a short time.",
				action: "retry",
			};
		case "UPSTREAM_BUSY":
			return { title: "Gemini is busy", message: "It usually clears up in a moment.", action: "retry" };
		case "NETWORK":
			return {
				title: "Can't reach the server",
				message: "Check your connection. A sleeping server can take up to a minute to wake.",
				action: "retry",
			};
		case "STREAM_INTERRUPTED":
			return { title: "The connection dropped", message: "The answer was cut off.", action: "retry" };
		case "BLOCKED":
			return { title: "Gemini couldn't continue", message: error.message, action: null };
		case "EMPTY_FILE":
		case "UNREADABLE_FILE":
		case "UNSUPPORTED_TYPE":
		case "FILE_TOO_LARGE":
		case "NO_FILE":
		case "NOT_TEACHABLE":
			return { title: "There's a problem with this file", message: error.message, action: null };
		default:
			return { title: "Something went wrong", message: error.message || "Please try again.", action: "retry" };
	}
}
