import pino from "pino";

/**
 * Logger instance for the server. It logs to stdout and redacts sensitive information.
 */
export const logger = pino({
	level: process.env.LOG_LEVEL || "info",
	redact: ["req.headers", "headers", "key", "apiKey"],
});

export function requestLogger(req, res, next) {
	const started = Date.now();
	res.on("finish", () => {
		logger.info(
			{
				method: req.method,
				path: req.originalUrl.split("?")[0],
				status: res.statusCode,
				ms: Date.now() - started,
			},
			"request",
		);
	});
	next();
}
