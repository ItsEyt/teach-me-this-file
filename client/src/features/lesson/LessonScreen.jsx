import { useEffect, useState } from "react";
import { GearIcon, ListIcon } from "../../components/icons.jsx";
import { useLessonStream } from "../../hooks/useLessonStream.js";
import { clearSavedLesson } from "../../state/persistence.js";
import { useLesson } from "../../state/LessonContext.jsx";
import { useSettings } from "../../state/SettingsContext.jsx";
import { isStreaming } from "../../state/selectors.js";
import { Composer } from "./Composer.jsx";
import { MessageList } from "./MessageList.jsx";
import { ProgressBar } from "./ProgressBar.jsx";
import { SourceSheet } from "./SourceSheet.jsx";
import { StepSheet } from "./StepSheet.jsx";

const iconButton = "rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600";

export function LessonScreen() {
	const { state, dispatch } = useLesson();
	const { openDialog } = useSettings();
	const { start, send, retry, stop } = useLessonStream();
	const [sheet, setSheet] = useState(null); // { type: "steps" } | { type: "source", chunk, quote }
	const [warningsOpen, setWarningsOpen] = useState(true);

	const { plan, progress, document, messages } = state;
	const finished = state.phase === "finished";
	const streaming = isStreaming(state);

	// A fresh lesson opens by itself: the tutor speaks first.
	useEffect(() => {
		if (messages.length === 0) start();
	}, []); // once, on arrival

	function newLesson() {
		stop();
		if (finished) clearSavedLesson();
		dispatch({ type: "RESET" });
	}

	return (
		<div dir={document.direction} className="mx-auto flex h-dvh w-full max-w-3xl flex-col bg-slate-50 sm:border-x sm:border-slate-200">
			<header className="border-b border-slate-200 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
				<div className="mb-2 flex items-center justify-between gap-2">
					<button
						type="button"
						onClick={newLesson}
						className="rounded-full px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
						{finished ? "New lesson" : "Exit"}
					</button>
					<p className="min-w-0 flex-1 truncate text-center text-sm text-slate-500" dir="auto">
						{plan.title}
					</p>
					<div className="flex">
						<button type="button" aria-label="Lesson plan" onClick={() => setSheet({ type: "steps" })} className={iconButton}>
							<ListIcon />
						</button>
						<button type="button" aria-label="Settings" onClick={openDialog} className={iconButton}>
							<GearIcon />
						</button>
					</div>
				</div>
				<ProgressBar plan={plan} progress={progress} finished={finished} onOpen={() => setSheet({ type: "steps" })} />
			</header>

			{document.warnings.length > 0 && warningsOpen && (
				<div role="status" className="flex items-start justify-between gap-3 bg-amber-50 px-4 py-2 text-xs text-amber-900">
					<p>{document.warnings.join(" ")}</p>
					<button type="button" onClick={() => setWarningsOpen(false)} className="shrink-0 font-medium underline">
						Dismiss
					</button>
				</div>
			)}

			<MessageList
				messages={messages}
				chunks={document.chunks}
				onOpenSource={(chunk, quote) => setSheet({ type: "source", chunk, quote })}
				onRetry={retry}
			/>

			{finished ?
				<div className="border-t border-slate-200 bg-white px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center">
					<p className="text-sm text-slate-600">Lesson complete. Nice work!</p>
					<button
						type="button"
						onClick={newLesson}
						className="mt-2 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
						Start a new lesson
					</button>
				</div>
			:	<Composer streaming={streaming} onSend={send} onStop={stop} />}

			{sheet?.type === "steps" && <StepSheet plan={plan} progress={progress} onClose={() => setSheet(null)} />}
			{sheet?.type === "source" && (
				<SourceSheet
					chunk={sheet.chunk}
					quote={sheet.quote}
					fileName={document.name}
					direction={document.direction}
					onClose={() => setSheet(null)}
				/>
			)}
		</div>
	);
}
