/** Parse one SSE block ("event: x\ndata: {...}") into { event, data }, or null for comments and empty blocks. */
export function parseBlock(raw) {
	let event = "message";
	const data = [];
	for (const line of raw.split("\n")) {
		if (line.startsWith(":")) continue;
		if (line.startsWith("event:")) event = line.slice(6).trim();
		else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
	}
	return data.length > 0 ? { event, data: JSON.parse(data.join("\n")) } : null;
}

/** Read a fetch response body as Server-Sent Events, calling onEvent(event, data) for each one. */
export async function readSse(body, onEvent) {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

		let end;
		while ((end = buffer.indexOf("\n\n")) !== -1) {
			const block = parseBlock(buffer.slice(0, end));
			buffer = buffer.slice(end + 2);
			if (block) onEvent(block.event, block.data);
		}
	}
}
