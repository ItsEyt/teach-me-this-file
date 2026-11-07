import { Router } from "express";
import { config } from "../config.js";
import { checkKey } from "../ai/gemini.js";
import { readGeminiSettings } from "../middleware/gemini.js";

export const healthRouter = Router();

/** Wake-up ping: the client calls this on load so a sleeping free host starts early. */
healthRouter.get("/health", (_req, res) => {
	res.json({
		ok: true,
		model: config.defaultModel,
		serverKeyConfigured: Boolean(config.envKey),
		limits: { maxUploadMb: config.maxUploadBytes / 1024 / 1024, maxPdfPages: config.maxPdfPages },
	});
});

healthRouter.post("/key/check", readGeminiSettings, async (req, res) => {
	await checkKey(req.gemini);
	res.json({ ok: true, model: req.gemini.model });
});
