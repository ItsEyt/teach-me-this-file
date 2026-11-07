import { AppError } from "../ai/errors.js";

const MIN_CHARS = 80;
const MIN_LETTER_RATIO = 0.25;

/** Reject files with nothing teachable in them, before any AI call is spent on planning. */
export function assertReadable(text) {
	const compact = text.replace(/\s+/g, "");
	if (compact.length < MIN_CHARS) {
		throw new AppError(
			"EMPTY_FILE",
			"We couldn't find enough readable text in this file. If it's a scan, make sure the pages are clear and try again.",
			422,
		);
	}
	const letters = compact.match(/\p{L}/gu)?.length ?? 0;
	if (letters / compact.length < MIN_LETTER_RATIO) {
		throw new AppError("UNREADABLE_FILE", "This file doesn't look like readable lesson material.", 422);
	}
}
