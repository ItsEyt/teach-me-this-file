import { config } from "../config.js";

const MODEL_PATTERN = /^[a-zA-Z0-9._-]{3,80}$/;

/**
 * Reads the caller's key and model into `req.gemini`. The key comes from the
 * `X-Gemini-Key` header on every request and is never stored or logged;
 * the host's GEMINI_API_KEY is only a fallback.
 */
export function readGeminiSettings(req, _res, next) {
	const key = (req.get("x-gemini-key") || config.envKey || "").trim();
	const requested = (req.get("x-gemini-model") || "").trim();
	const model = MODEL_PATTERN.test(requested) ? requested : config.defaultModel;
	req.gemini = { key, model };
	next();
}
