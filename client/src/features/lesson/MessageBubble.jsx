import clsx from "clsx";
import { ErrorNotice } from "../../components/ErrorNotice.jsx";
import { DocIcon } from "../../components/icons.jsx";
import { Markdown } from "../../components/Markdown.jsx";

function TypingDots() {
	return (
		<span role="status" aria-label="The tutor is writing" className="flex gap-1 py-1.5">
			{[0, 1, 2].map((i) => (
				<span key={i} className="typing-dot h-2 w-2 rounded-full bg-slate-400" style={{ animationDelay: `${i * 0.15}s` }} />
			))}
		</span>
	);
}

export function MessageBubble({ message, chunksById, onOpenSource, onRetry }) {
	if (message.role === "student") {
		return (
			<div className="max-w-[85%] self-end rounded-3xl rounded-ee-md bg-indigo-600 px-4 py-2.5 text-white shadow-sm">
				<p dir="auto" className="whitespace-pre-wrap wrap-break-word">
					{message.text}
				</p>
			</div>
		);
	}

	const streaming = message.status === "streaming";
	const failed = message.status === "error";
	const stopped = message.status === "stopped";
	const sources = message.citations.filter((c) => chunksById.has(c.chunkId));

	return (
		<div className="flex max-w-[92%] flex-col items-start gap-2 self-start">
			{(message.text || streaming) && (
				<div
					dir="auto"
					className={clsx("rounded-3xl rounded-es-md border border-slate-200 bg-white px-4 py-3 shadow-sm", stopped && "opacity-80")}>
					{message.text ?
						<Markdown>{message.text}</Markdown>
					:	<TypingDots />}
				</div>
			)}

			{sources.length > 0 && (
				<div className="flex flex-wrap gap-1.5">
					{sources.map(({ chunkId, quote }) => (
						<button
							key={chunkId}
							type="button"
							onClick={() => onOpenSource(chunksById.get(chunkId), quote)}
							className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600">
							<DocIcon className="h-3.5 w-3.5" />
							<span dir="auto">{chunksById.get(chunkId).locator}</span>
						</button>
					))}
				</div>
			)}

			{stopped && (
				<p className="flex items-center gap-2 text-xs text-slate-500">
					Stopped.
					<button type="button" onClick={onRetry} className="font-medium text-indigo-700 underline">
						Write it again
					</button>
				</p>
			)}
			{failed && <ErrorNotice error={message.error} onRetry={onRetry} autoRetry={!message.error.repeat} />}
		</div>
	);
}
