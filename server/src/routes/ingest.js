import { Router } from "express";
import multer from "multer";
import { AppError } from "../ai/errors.js";
import { config } from "../config.js";
import { ingestFile } from "../ingest/index.js";
import { abortOnDisconnect } from "../lib/abort.js";
import { readGeminiSettings } from "../middleware/gemini.js";

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: config.maxUploadBytes, files: 1 },
});

export const ingestRouter = Router();

ingestRouter.post("/ingest", readGeminiSettings, upload.single("file"), async (req, res) => {
	if (!req.file) throw new AppError("NO_FILE", "Choose a file to upload.", 400);
	const document = await ingestFile({ file: req.file, gemini: req.gemini, signal: abortOnDisconnect(res) });
	res.json({ document });
});
