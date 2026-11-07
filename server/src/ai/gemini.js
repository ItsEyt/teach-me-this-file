import { GoogleGenAI } from "@google/genai";
import { AppError, fromGeminiError } from "./errors.js";

/** Only 2.5 Flash models accept a thinking budget; other models keep their defaults. */
function thinkingConfig(model, budget) {
	return /^gemini-2\.5-flash/.test(model) ? { thinkingConfig: { thinkingBudget: budget } } : {};
}

function client(key) {
	if (!key) throw new AppError("MISSING_KEY", "Add your Gemini API key in settings.", 401);
	return new GoogleGenAI({ apiKey: key });
}

function assertNotBlocked(response) {
	if (response?.promptFeedback?.blockReason) {
		throw new AppError("BLOCKED", "Gemini declined to process this content.", 422);
	}
	const finish = response?.candidates?.[0]?.finishReason;
	if (finish === "SAFETY" || finish === "PROHIBITED_CONTENT" || finish === "BLOCKLIST") {
		throw new AppError("BLOCKED", "Gemini declined to continue on this content.", 422);
	}
}

/** Cheap validity check: reading model metadata costs no generation quota. */
export async function checkKey({ key, model }) {
	try {
		await client(key).models.get({ model });
	} catch (err) {
		throw fromGeminiError(err);
	}
}

/** One-shot text generation. `parts` can mix text and inline file data. */
export async function generateText({ key, model, system, parts, signal, temperature = 0.2, thinkingBudget = 0 }) {
	try {
		const response = await client(key).models.generateContent({
			model,
			contents: [{ role: "user", parts }],
			config: { systemInstruction: system, temperature, abortSignal: signal, ...thinkingConfig(model, thinkingBudget) },
		});
		assertNotBlocked(response);
		return response.text ?? "";
	} catch (err) {
		throw fromGeminiError(err);
	}
}

function parseJson(text) {
	const cleaned = text
		.trim()
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/, "");
	try {
		return JSON.parse(cleaned);
	} catch {
		throw new AppError("BAD_MODEL_OUTPUT", "The model returned an unreadable answer. Try again.", 502);
	}
}

/** Generation in JSON mode. The caller validates the shape with zod. */
export async function generateJson({ key, model, system, prompt, signal }) {
	try {
		const response = await client(key).models.generateContent({
			model,
			contents: [{ role: "user", parts: [{ text: prompt }] }],
			config: {
				systemInstruction: system,
				responseMimeType: "application/json",
				temperature: 0.4,
				abortSignal: signal,
				...thinkingConfig(model, 1024),
			},
		});
		assertNotBlocked(response);
		return parseJson(response.text ?? "");
	} catch (err) {
		throw fromGeminiError(err);
	}
}

/** Streams text deltas. Aborting `signal` cancels the upstream request. */
export async function* streamText({ key, model, system, contents, signal }) {
	try {
		const stream = await client(key).models.generateContentStream({
			model,
			contents,
			config: { systemInstruction: system, temperature: 0.6, abortSignal: signal, ...thinkingConfig(model, 0) },
		});
		for await (const chunk of stream) {
			assertNotBlocked(chunk);
			if (chunk.text) yield chunk.text;
		}
	} catch (err) {
		throw fromGeminiError(err);
	}
}
