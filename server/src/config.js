/** Central place for every tunable. Env vars override the defaults. */
export const config = {
	port: Number(process.env.PORT) || 8787,
	defaultModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
	envKey: process.env.GEMINI_API_KEY || "",

	// Upload and document limits, sized for a small free-tier host (~512 MB RAM).
	maxUploadBytes: 15 * 1024 * 1024,
	maxPdfPages: 150,
	maxScannedPages: 30,
	scanBatchPages: 8,
	maxDocChars: 400_000,

	// Planner sends full text up to this size, then falls back to an outline of previews.
	planFullTextChars: 120_000,
	planPreviewChars: 450,

	// Tutor context window.
	chunkTargetChars: 2200,
};
