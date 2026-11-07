import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { requestLogger } from "./lib/logger.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { ingestRouter } from "./routes/ingest.js";
import { planRouter } from "./routes/plan.js";
import { turnRouter } from "./routes/turn.js";

const clientDist = fileURLToPath(new URL("../../client/dist", import.meta.url));

export function createApp() {
	const app = express();
	app.set("trust proxy", 1); // hosts such as Render sit behind a proxy
	app.use(helmet());
	app.use(requestLogger);
	app.use(express.json({ limit: "2mb" }));

	const api = express.Router();
	api.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));
	api.use(healthRouter);
	api.use(ingestRouter);
	api.use(planRouter);
	api.use(turnRouter);
	api.use(notFound);
	app.use("/api", api);

	// In production the same service serves the built React app.
	if (existsSync(clientDist)) {
		app.use(express.static(clientDist));
		app.use((req, res, next) => {
			if (req.method !== "GET") return next();
			res.sendFile("index.html", { root: clientDist });
		});
	}

	app.use(errorHandler);
	return app;
}
