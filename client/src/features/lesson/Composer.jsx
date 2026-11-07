import { useRef, useState } from "react";
import { SendIcon, StopIcon } from "../../components/icons.jsx";

const MAX_CHARS = 1000;
const MAX_HEIGHT_PX = 140;

export function Composer({ streaming, onSend, onStop }) {
	const [text, setText] = useState("");
	const fieldRef = useRef(null);
	const canSend = text.trim().length > 0 && !streaming;

	function resize() {
		const el = fieldRef.current;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
	}

	function submit() {
		if (!canSend) return;
		onSend(text.trim());
		setText("");
		requestAnimationFrame(resize);
	}

	function onKeyDown(event) {
		// Do not send while an input method (Hebrew, Arabic, Japanese…) is composing a word.
		if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
			event.preventDefault();
			submit();
		}
	}

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				submit();
			}}
			className="border-t border-slate-200 bg-white px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
			<div className="mx-auto flex max-w-2xl items-end gap-2">
				<textarea
					ref={fieldRef}
					value={text}
					rows={1}
					maxLength={MAX_CHARS}
					dir="auto"
					enterKeyHint="send"
					aria-label="Your answer"
					placeholder="Type your answer…"
					onChange={(e) => {
						setText(e.target.value);
						resize();
					}}
					onKeyDown={onKeyDown}
					className="max-h-35 min-h-11 flex-1 resize-none rounded-3xl border border-slate-300 bg-slate-50 px-4 py-2.5 focus-visible:outline-2 focus-visible:outline-indigo-600"
				/>
				{streaming ?
					<button
						type="button"
						onClick={onStop}
						aria-label="Stop the answer"
						className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-white hover:bg-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800">
						<StopIcon />
					</button>
				:	<button
						type="submit"
						disabled={!canSend}
						aria-label="Send"
						className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-slate-300 rtl:-scale-x-100">
						<SendIcon />
					</button>
				}
			</div>
		</form>
	);
}
