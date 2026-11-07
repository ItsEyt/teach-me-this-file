import { config } from "../config.js";

const SENTENCE_BREAK = /(?<=[.!?。؟…])\s+/;

/** Split text that has markdown headings into units, one per section. */
export function splitByHeadings(text) {
	const units = [];
	let current = { locator: null, lines: [] };
	const flush = () => {
		const body = current.lines.join("\n").trim();
		if (body) units.push({ locator: current.locator, text: body });
	};
	for (const line of text.split("\n")) {
		const heading = line.match(/^#{1,6}\s+(.+?)\s*#*$/);
		if (heading) {
			flush();
			current = { locator: `§ ${heading[1].slice(0, 60)}`, lines: [line] };
		} else {
			current.lines.push(line);
		}
	}
	flush();
	return units;
}

/** Break one oversized paragraph into sentence groups, hard-slicing as a last resort. */
function splitLongParagraph(paragraph, target) {
	const pieces = [];
	let buffer = "";
	for (const sentence of paragraph.split(SENTENCE_BREAK)) {
		if ((buffer + " " + sentence).length > target && buffer) {
			pieces.push(buffer);
			buffer = sentence;
		} else {
			buffer = buffer ? `${buffer} ${sentence}` : sentence;
		}
	}
	if (buffer) pieces.push(buffer);
	return pieces.flatMap((piece) => {
		const slices = [];
		for (let i = 0; i < piece.length; i += target) slices.push(piece.slice(i, i + target));
		return slices;
	});
}

function packParagraphs(text, target) {
	const paragraphs = text
		.replace(/\r\n/g, "\n")
		.split(/\n{2,}/)
		.map((p) => p.trim())
		.filter(Boolean)
		.flatMap((p) => (p.length > target ? splitLongParagraph(p, target) : [p]));

	const pieces = [];
	let buffer = "";
	for (const paragraph of paragraphs) {
		if (buffer && buffer.length + paragraph.length + 2 > target) {
			pieces.push(buffer);
			buffer = paragraph;
		} else {
			buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
		}
	}
	if (buffer) pieces.push(buffer);
	return pieces;
}

/**
 * Turn units (pages or sections) into citable chunks of roughly `target` characters.
 * A chunk never spans two units, so a page or section locator stays accurate.
 * @param {{ locator: string | null, text: string }[]} units
 * @returns {{ id: string, locator: string, text: string }[]}
 */
export function chunkUnits(units, target = config.chunkTargetChars) {
	const chunks = [];
	let untitled = 0;
	for (const unit of units) {
		const pieces = packParagraphs(unit.text, target);
		pieces.forEach((text, index) => {
			let locator = unit.locator ?? `Part ${++untitled}`;
			if (pieces.length > 1 && unit.locator) locator += ` (${index + 1}/${pieces.length})`;
			chunks.push({ id: `S${chunks.length + 1}`, locator, text });
		});
	}
	return chunks;
}
