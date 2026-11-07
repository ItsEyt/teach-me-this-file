/** An error with a stable machine-readable code the client maps to friendly copy. */
export class AppError extends Error {
	constructor(code, message, status = 400, extra = {}) {
		super(message);
		this.code = code;
		this.status = status;
		this.extra = extra;
	}
}

function parseRetryAfterSec(message) {
	const text = String(message ?? "");
	const fromInfo = text.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
	const fromProse = text.match(/retry in (\d+(?:\.\d+)?)s/i);
	const raw = fromInfo?.[1] ?? fromProse?.[1];
	return raw ? Math.ceil(Number(raw)) : undefined;
}

/** Translate a Gemini SDK failure into an AppError. Never includes the API key. */
export function fromGeminiError(err) {
	if (err instanceof AppError) return err;
	if (err?.name === "AbortError") return new AppError("ABORTED", "Request cancelled.", 499);

	const status = Number(err?.status) || 0;
	const message = String(err?.message ?? "");

	if (/API key not valid|API_KEY_INVALID|API key expired/i.test(message) || status === 401) {
		return new AppError("INVALID_KEY", "The Gemini API key was rejected.", 401);
	}
	if (status === 403) {
		return new AppError("INVALID_KEY", "This key is not allowed to use that model.", 403);
	}
	if (status === 404) {
		return new AppError("MODEL_NOT_FOUND", "That Gemini model was not found.", 404);
	}
	if (status === 429) {
		return new AppError("RATE_LIMITED", "Gemini rate limit reached.", 429, {
			retryAfterSec: parseRetryAfterSec(message) ?? 20,
		});
	}
	if (status === 500 || status === 502 || status === 503 || status === 504) {
		return new AppError("UPSTREAM_BUSY", "Gemini is busy right now.", 503);
	}
	if (status === 400) {
		return new AppError("BAD_REQUEST_UPSTREAM", "Gemini could not process that request.", 400);
	}
	return new AppError("INTERNAL", "Something went wrong talking to Gemini.", 500);
}
