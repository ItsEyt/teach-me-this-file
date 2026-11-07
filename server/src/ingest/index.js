import { randomUUID } from "node:crypto";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { AppError } from "../ai/errors.js";
import { config } from "../config.js";
import { chunkUnits, splitByHeadings } from "./chunker.js";
import { detectDirection } from "./direction.js";
import { assertReadable } from "./quality.js";
import { transcribeImage, transcribePdfPages } from "./transcribe.js";

const IMAGE_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // base64 inflates by a third; Gemini caps inline requests near 20 MB
const SCANNED_PAGE_CHARS = 40;

function extensionOf(name) {
	return name.split(".").pop()?.toLowerCase() ?? "";
}

/** Browsers send UTF-8 names that multer reads as latin1; undo that so Hebrew/Arabic names survive. */
function fixFileName(name) {
	if (!/[\u0080-ÿ]/.test(name)) return name;
	const decoded = Buffer.from(name, "latin1").toString("utf8");
	return decoded.includes("�") ? name : decoded;
}

async function readPdf({ buffer, gemini, signal }) {
	const warnings = [];
	const pdf = await getDocumentProxy(new Uint8Array(buffer));
	const { totalPages, text } = await extractText(pdf, { mergePages: false });

	const pages = text.slice(0, config.maxPdfPages);
	if (totalPages > config.maxPdfPages) {
		warnings.push(`Only the first ${config.maxPdfPages} of ${totalPages} pages were used.`);
	}

	const scanned = pages.flatMap((t, i) => (t.trim().length < SCANNED_PAGE_CHARS ? [i] : []));
	if (scanned.length > 0) {
		if (!gemini.key) {
			if (scanned.length >= pages.length / 2) {
				throw new AppError("MISSING_KEY", "This PDF looks scanned. Add your Gemini API key so it can be read.", 401);
			}
			warnings.push(`${scanned.length} page(s) look like scans and were skipped.`);
		} else {
			const toRead = scanned.slice(0, config.maxScannedPages);
			if (scanned.length > toRead.length) {
				warnings.push(`Only the first ${toRead.length} of ${scanned.length} scanned pages were read.`);
			}
			const transcribed = await transcribePdfPages({
				gemini,
				buffer,
				pageIndexes: toRead,
				batchSize: config.scanBatchPages,
				signal,
			});
			transcribed.forEach((content, index) => (pages[index] = content));
		}
	}

	return {
		units: pages.map((content, i) => ({ locator: `p. ${i + 1}`, text: content })),
		pageCount: totalPages,
		warnings,
	};
}

async function readByKind({ file, ext, gemini, signal }) {
	if (ext === "txt" || ext === "md" || ext === "markdown") {
		const text = file.buffer.toString("utf8").replace(/^﻿/, "");
		return { units: splitByHeadings(text), warnings: [] };
	}
	if (ext === "docx") {
		const { value } = await mammoth.extractRawText({ buffer: file.buffer });
		return { units: [{ locator: null, text: value }], warnings: [] };
	}
	if (ext === "pdf") {
		return readPdf({ buffer: file.buffer, gemini, signal });
	}
	if (IMAGE_TYPES[ext]) {
		if (file.size > MAX_IMAGE_BYTES) {
			throw new AppError("FILE_TOO_LARGE", "Images can be up to 10 MB.", 413);
		}
		const text = await transcribeImage({ gemini, buffer: file.buffer, mimeType: IMAGE_TYPES[ext], signal });
		return { units: [{ locator: "Image", text }], warnings: [] };
	}
	throw new AppError("UNSUPPORTED_TYPE", "Supported files: PDF, DOCX, TXT, MD, PNG, JPG, WEBP.", 415);
}

/** Keep whole units until the document reaches the size budget. */
function applySizeBudget(units, warnings) {
	const kept = [];
	let total = 0;
	for (const unit of units) {
		if (total + unit.text.length > config.maxDocChars && kept.length > 0) {
			warnings.push("This file is very long, so only the first part is used for the lesson.");
			break;
		}
		kept.push(unit);
		total += unit.text.length;
	}
	return kept;
}

/**
 * Read an uploaded file into a citable Document.
 * Text formats are parsed locally; scans and images are transcribed by Gemini.
 */
export async function ingestFile({ file, gemini, signal }) {
	const name = fixFileName(file.originalname);
	const ext = extensionOf(name);

	let read;
	try {
		read = await readByKind({ file, ext, gemini, signal });
	} catch (err) {
		if (err instanceof AppError || err?.status || err?.name === "AbortError") throw err;
		throw new AppError("UNREADABLE_FILE", "We couldn't open that file. It may be damaged or password-protected.", 422);
	}

	const warnings = [...read.warnings];
	const units = applySizeBudget(
		read.units.filter((u) => u.text.trim()),
		warnings,
	);
	const fullText = units.map((u) => u.text).join("\n\n");
	assertReadable(fullText);

	return {
		id: randomUUID(),
		name,
		pageCount: read.pageCount ?? null,
		direction: detectDirection(fullText),
		charCount: fullText.length,
		warnings,
		chunks: chunkUnits(units),
	};
}
