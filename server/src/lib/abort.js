/**
 * Returns an AbortSignal that fires when the client goes away before the response
 * finished (closed tab, Stop button). `res` is used rather than `req` because Node
 * emits `req` "close" as soon as the request body has been read.
 */
export function abortOnDisconnect(res) {
	const controller = new AbortController();
	res.on("close", () => {
		if (!res.writableFinished) controller.abort();
	});
	return controller.signal;
}
