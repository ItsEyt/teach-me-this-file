import { Router } from "express";
import { verifyCitations } from "../ai/citations.js";
import { AppError } from "../ai/errors.js";
import { streamText } from "../ai/gemini.js";
import { buildTutorContents, buildTutorSystem } from "../ai/prompts/tutor.js";
import { turnRequest } from "../ai/schemas.js";
import { parseTrailer, TrailerSplitter } from "../ai/trailer.js";
import { abortOnDisconnect } from "../lib/abort.js";
import { sendEvent, startSse } from "../lib/sse.js";
import { readGeminiSettings } from "../middleware/gemini.js";

export const turnRouter = Router();

/**
 * One tutor turn, streamed as Server-Sent Events:
 *   delta {text}              visible text as it is written
 *   state {verdict, citations, note}   the hidden assessment, after the text
 *   done {}
 *   error {code, message, retryAfterSec?}
 * Failures before the first token are plain JSON errors with a status code, so the
 * client can tell "could not start" from "broke midway".
 */
turnRouter.post("/lesson/turn", readGeminiSettings, async (req, res) => {
	const body = turnRequest.parse(req.body);
	const signal = abortOnDisconnect(res);

	const stream = streamText({
		...req.gemini,
		system: buildTutorSystem(body),
		contents: buildTutorContents(body),
		signal,
	})[Symbol.asyncIterator]();

	let next = await stream.next(); // throws before any header is sent if Gemini rejects the call
	startSse(res);

	const splitter = new TrailerSplitter();
	let wroteText = false;
	const emit = (text) => {
		if (!text) return;
		wroteText = wroteText || text.trim().length > 0;
		sendEvent(res, "delta", { text });
	};

	try {
		while (!next.done) {
			emit(splitter.push(next.value));
			next = await stream.next();
		}
		const { visible, rawTrailer } = splitter.end();
		emit(visible);
		if (!wroteText) throw new AppError("BAD_MODEL_OUTPUT", "The tutor returned an empty answer. Try again.", 502);

		const assessment = parseTrailer(rawTrailer);
		const citations = verifyCitations(assessment.citations, [...body.chunks, ...body.nextChunks]);
		sendEvent(res, "state", { verdict: assessment.verdict, citations, note: assessment.note ?? null });
		sendEvent(res, "done", {});
	} catch (err) {
		if (!signal.aborted) {
			sendEvent(res, "error", {
				code: err.code ?? "INTERNAL",
				message: err.code ? err.message : "The tutor stopped unexpectedly.",
				...err.extra,
			});
		}
	}
	res.end();
});
