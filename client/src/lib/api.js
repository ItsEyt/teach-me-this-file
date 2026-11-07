import { readSse } from "./sseParser.js";

export class ApiError extends Error {
	constructor(code, message, retryAfterSec) {
		super(message);
		this.code = code;
		this.retryAfterSec = retryAfterSec;
	}
}

function geminiHeaders(settings) {
	const headers = {};
	if (settings.key) headers["X-Gemini-Key"] = settings.key;
	if (settings.model) headers["X-Gemini-Model"] = settings.model;
	return headers;
}

async function errorFromResponse(res) {
	const body = await res.json().catch(() => null);
	return new ApiError(body?.error?.code ?? `HTTP_${res.status}`, body?.error?.message ?? "The request failed.", body?.error?.retryAfterSec);
}

/** fetch with our error shape. Network failures become code NETWORK; aborts pass through. */
async function request(path, { method = "POST", json, form, settings = {}, signal }) {
	const headers = geminiHeaders(settings);
	if (json) headers["Content-Type"] = "application/json";
	try {
		const res = await fetch(`/api${path}`, {
			method,
			headers,
			body: form ?? (json ? JSON.stringify(json) : undefined),
			signal,
		});
		if (!res.ok) throw await errorFromResponse(res);
		return res;
	} catch (err) {
		if (err instanceof ApiError || err.name === "AbortError") throw err;
		throw new ApiError("NETWORK", "Can't reach the server.");
	}
}

export async function wakeServer(signal) {
	return (await request("/health", { method: "GET", signal })).json();
}

export async function checkKey(settings) {
	return (await request("/key/check", { settings })).json();
}

export async function ingestFile(file, settings, signal) {
	const form = new FormData();
	form.append("file", file);
	const res = await request("/ingest", { form, settings, signal });
	return (await res.json()).document;
}

export async function createPlan({ teacherPrompt, document }, settings, signal) {
	const json = { teacherPrompt, direction: document.direction, chunks: document.chunks };
	const res = await request("/plan", { json, settings, signal });
	return (await res.json()).plan;
}

/**
 * Stream one tutor turn. `onEvent(name, data)` receives delta and state events.
 * Rejects with an ApiError if the turn cannot start or breaks midway.
 */
export async function streamTurn(body, settings, signal, onEvent) {
	const res = await request("/lesson/turn", { json: body, settings, signal });
	let finished = false;
	try {
		await readSse(res.body, (event, data) => {
			if (event === "error") throw new ApiError(data.code, data.message, data.retryAfterSec);
			if (event === "done") finished = true;
			onEvent(event, data);
		});
	} catch (err) {
		if (err instanceof ApiError || err.name === "AbortError") throw err;
		throw new ApiError("STREAM_INTERRUPTED", "The connection dropped.");
	}
	if (!finished) throw new ApiError("STREAM_INTERRUPTED", "The connection dropped before the tutor finished.");
}
