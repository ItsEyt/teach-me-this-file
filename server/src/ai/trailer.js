import { trailer as trailerSchema } from "./schemas.js";

const OPEN = "<state>";
const CLOSE = "</state>";

/** Length of the longest suffix of `text` that could be the start of the opening tag. */
function partialMarkerLength(text) {
	for (let length = Math.min(OPEN.length - 1, text.length); length > 0; length--) {
		if (OPEN.startsWith(text.slice(-length))) return length;
	}
	return 0;
}

/**
 * Splits a streamed tutor reply into the part the student reads and the hidden
 * `<state>` assessment that follows it. Text that might be the start of the tag is
 * held back until the next chunk shows whether it is.
 */
export class TrailerSplitter {
	#held = "";
	#trailer = "";
	#inTrailer = false;

	/** Feed a streamed chunk; returns the visible text that is safe to send now. */
	push(text) {
		if (this.#inTrailer) {
			this.#trailer += text;
			return "";
		}
		const buffer = this.#held + text;
		const at = buffer.indexOf(OPEN);
		if (at !== -1) {
			this.#inTrailer = true;
			this.#trailer = buffer.slice(at + OPEN.length);
			this.#held = "";
			return buffer.slice(0, at).trimEnd();
		}
		// Hold back a possible partial tag and the whitespace before it, so the blank
		// line the model writes ahead of the tag never reaches the student.
		const safeEnd = buffer.length - partialMarkerLength(buffer);
		const visibleEnd = buffer.slice(0, safeEnd).trimEnd().length;
		this.#held = buffer.slice(visibleEnd);
		return buffer.slice(0, visibleEnd);
	}

	/** Call once the stream ends. Returns any held text and the raw trailer, if one was written. */
	end() {
		const visible = this.#inTrailer ? "" : this.#held.trimEnd();
		this.#held = "";
		return { visible, rawTrailer: this.#inTrailer ? this.#trailer : null };
	}
}

/** Parse the raw trailer text. A missing or broken trailer means "no assessment". */
export function parseTrailer(rawTrailer) {
	const empty = { verdict: "none", citations: [], note: null };
	if (rawTrailer === null) return empty;

	const closed = rawTrailer.split(CLOSE)[0];
	const json = closed
		.trim()
		.replace(/^```(?:json)?\s*/i, "")
		.replace(/\s*```$/, "");
	try {
		const parsed = trailerSchema.safeParse(JSON.parse(json));
		return parsed.success ? { ...empty, ...parsed.data } : empty;
	} catch {
		return empty;
	}
}
