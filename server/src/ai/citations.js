const MAX_CITATIONS = 3;
const MAX_QUOTE_CHARS = 200;

function normalize(text) {
	return text
		.replace(/[*_`#>]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

/**
 * Keep only citations that point at a passage the tutor was actually given.
 * A quote survives only if it really appears in that passage, so the UI never
 * highlights text the model made up.
 * @returns {{ chunkId: string, quote: string | null }[]}
 */
export function verifyCitations(citations, chunks) {
	const byId = new Map(chunks.map((c) => [c.id, normalize(c.text)]));
	const seen = new Set();
	const verified = [];

	for (const { chunkId, quote } of citations) {
		if (!byId.has(chunkId) || seen.has(chunkId)) continue;
		seen.add(chunkId);
		const wanted = quote ? normalize(quote) : "";
		const found = wanted.length > 0 && wanted.length <= MAX_QUOTE_CHARS && byId.get(chunkId).includes(wanted);
		verified.push({ chunkId, quote: found ? quote.trim() : null });
		if (verified.length === MAX_CITATIONS) break;
	}
	return verified;
}
