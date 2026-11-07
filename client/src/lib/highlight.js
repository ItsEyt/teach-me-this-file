const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Split a passage into segments so the quoted phrase can be highlighted.
 * The match tolerates different whitespace and markdown marks between words,
 * because the server verified the quote after normalizing both sides.
 * @returns {{ text: string, match: boolean }[]}
 */
export function highlightSegments(text, quote) {
	const words = quote?.trim().split(/\s+/).filter(Boolean) ?? [];
	if (words.length === 0) return [{ text, match: false }];

	const pattern = new RegExp(words.map(escapeRegExp).join("[\\s*_`#>]+"), "i");
	const found = pattern.exec(text);
	if (!found) return [{ text, match: false }];

	const end = found.index + found[0].length;
	return [
		{ text: text.slice(0, found.index), match: false },
		{ text: found[0], match: true },
		{ text: text.slice(end), match: false },
	].filter((segment) => segment.text);
}
