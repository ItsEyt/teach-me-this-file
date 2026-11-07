const RTL_CHARS = /[֐-ࣿיִ-﷿ﹰ-﻿]/g;
const LETTERS = /\p{L}/gu;

/** Reading direction of the document, from the share of right-to-left letters. */
export function detectDirection(text) {
	const sample = text.slice(0, 20_000);
	const letters = sample.match(LETTERS)?.length ?? 0;
	if (letters === 0) return "ltr";
	const rtl = sample.match(RTL_CHARS)?.length ?? 0;
	return rtl / letters > 0.3 ? "rtl" : "ltr";
}
