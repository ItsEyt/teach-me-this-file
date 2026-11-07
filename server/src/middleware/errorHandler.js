import { ZodError } from "zod";
import { AppError } from "../ai/errors.js";
import { logger } from "../lib/logger.js";

function normalize(err) {
	if (err instanceof AppError) return err;
	if (err instanceof ZodError) return new AppError("BAD_REQUEST", "The request was not in the expected shape.", 400);
	if (err?.code === "LIMIT_FILE_SIZE") {
		return new AppError("FILE_TOO_LARGE", "That file is too large (15 MB maximum).", 413);
	}
	if (err?.type === "entity.too.large") {
		return new AppError("BAD_REQUEST", "The request was too large.", 413);
	}
	if (err?.type === "entity.parse.failed") {
		return new AppError("BAD_REQUEST", "The request could not be parsed.", 400);
	}
	return null;
}

export function notFound(_req, res) {
	res.status(404).json({ error: { code: "NOT_FOUND", message: "Unknown endpoint." } });
}

// Express recognises error handlers by their four-argument signature.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
	const known = normalize(err);
	if (!known) logger.error({ message: err?.message, stack: err?.stack }, "unhandled error");
	const appError = known ?? new AppError("INTERNAL", "Something went wrong on the server.", 500);

	if (res.headersSent) return res.end();
	res.status(appError.status).json({
		error: { code: appError.code, message: appError.message, ...appError.extra },
	});
}
