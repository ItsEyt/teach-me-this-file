import { useEffect, useMemo, useRef } from "react";
import { MessageBubble } from "./MessageBubble.jsx";

const NEAR_BOTTOM_PX = 120;

export function MessageList({ messages, chunks, onOpenSource, onRetry }) {
	const scroller = useRef(null);
	const stickToBottom = useRef(true);
	const chunksById = useMemo(() => new Map(chunks.map((c) => [c.id, c])), [chunks]);
	const last = messages.at(-1);

	// Follow the stream, unless the student scrolled up to re-read something.
	useEffect(() => {
		const el = scroller.current;
		if (el && stickToBottom.current) el.scrollTo({ top: el.scrollHeight });
	}, [messages.length, last?.text, last?.status]);

	function onScroll() {
		const el = scroller.current;
		stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
	}

	return (
		<div ref={scroller} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain">
			<div role="log" aria-live="polite" className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-5">
				{messages.map((message) => (
					<MessageBubble key={message.id} message={message} chunksById={chunksById} onOpenSource={onOpenSource} onRetry={onRetry} />
				))}
			</div>
		</div>
	);
}
