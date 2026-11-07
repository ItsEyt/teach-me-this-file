import { Sheet } from "../../components/Sheet.jsx";
import { highlightSegments } from "../../lib/highlight.js";

/** The passage of the file behind a tutor message, with the exact quoted phrase highlighted. */
export function SourceSheet({ chunk, quote, fileName, direction, onClose }) {
	return (
		<Sheet title="From your file" onClose={onClose}>
			<p className="mb-3 text-xs text-slate-500">
				<span dir="auto">{fileName}</span> · {chunk.locator}
			</p>
			<blockquote dir={direction} className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800">
				{highlightSegments(chunk.text, quote).map((segment, index) =>
					segment.match ?
						<mark key={index} className="rounded bg-yellow-200 px-0.5 text-slate-900">
							{segment.text}
						</mark>
					:	<span key={index}>{segment.text}</span>,
				)}
			</blockquote>
		</Sheet>
	);
}
