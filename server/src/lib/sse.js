/** Open a Server-Sent Events response. Buffering is disabled so tokens reach the browser at once. */
export function startSse(res) {
	res.status(200);
	res.set({
		"Content-Type": "text/event-stream; charset=utf-8",
		"Cache-Control": "no-cache, no-transform",
		Connection: "keep-alive",
		"X-Accel-Buffering": "no",
	});
	res.flushHeaders();
}

export function sendEvent(res, event, data) {
	res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
