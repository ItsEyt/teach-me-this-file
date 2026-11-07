import { useRef, useState } from "react";
import clsx from "clsx";
import { ErrorNotice } from "../../components/ErrorNotice.jsx";
import { DocIcon, GearIcon, UploadIcon } from "../../components/icons.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { useLessonSetup } from "../../hooks/useLessonSetup.js";
import { clearSavedLesson, loadSavedLesson } from "../../state/persistence.js";
import { useLesson } from "../../state/LessonContext.jsx";
import { useSettings } from "../../state/SettingsContext.jsx";

// Mirrors the server's upload limit (server/src/config.js).
const MAX_FILE_MB = 15;
const ACCEPT = ".pdf,.docx,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp";

const EXAMPLE_PROMPTS = [
	"Teach this to 7th graders. Be Socratic. Keep it under 15 minutes.",
	"Teach this in French to beginners, with short simple sentences.",
	"Explain this to a curious adult using everyday examples. About 10 minutes.",
];

const STAGE_LABEL = {
	reading: "Reading your file…",
	planning: "Designing the lesson…",
};

function formatSize(bytes) {
	return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ResumeCard({ saved, onResume, onDiscard }) {
	const done = Object.values(saved.progress.stepStatus).filter((s) => s === "mastered" || s === "revisit").length;
	return (
		<div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
			<div className="min-w-0">
				<p className="text-sm font-semibold text-indigo-950">Pick up where you left off</p>
				<p className="truncate text-sm text-indigo-900/80">
					{saved.plan.title} · {done} of {saved.plan.steps.length} steps done
				</p>
			</div>
			<div className="flex gap-2">
				<button type="button" onClick={onDiscard} className="rounded-full px-4 py-1.5 text-sm text-indigo-900 hover:bg-indigo-100">
					Discard
				</button>
				<button
					type="button"
					onClick={onResume}
					className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">
					Continue
				</button>
			</div>
		</div>
	);
}

export function SetupScreen({ server }) {
	const { dispatch } = useLesson();
	const { settings, openDialog } = useSettings();
	const { stage, error, create, cancel } = useLessonSetup();
	const [file, setFile] = useState(null);
	const [fileError, setFileError] = useState(null);
	const [prompt, setPrompt] = useState("");
	const [dragging, setDragging] = useState(false);
	const [saved, setSaved] = useState(loadSavedLesson);
	const inputRef = useRef(null);

	const busy = stage !== "idle";
	const hasKey = Boolean(settings.key) || Boolean(server.info?.serverKeyConfigured);
	const ready = file && prompt.trim() && !busy;

	function pick(candidate) {
		if (!candidate) return;
		if (candidate.size > MAX_FILE_MB * 1024 * 1024) {
			setFile(null);
			setFileError(`That file is ${formatSize(candidate.size)}. The limit is ${MAX_FILE_MB} MB.`);
			return;
		}
		setFileError(null);
		setFile(candidate);
	}

	function onDrop(event) {
		event.preventDefault();
		setDragging(false);
		pick(event.dataTransfer.files[0]);
	}

	function submit(event) {
		event.preventDefault();
		if (ready) create({ file, teacherPrompt: prompt.trim() });
	}

	return (
		<main className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 sm:pt-14">
			<header className="mb-8 flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Teach Me This File</h1>
					<p className="mt-2 text-slate-600">
						Upload school material and tell the AI how to teach it. You get a chat that guides a student through it, one step at a time.
					</p>
				</div>
				<button
					type="button"
					onClick={openDialog}
					aria-label="Settings"
					className="shrink-0 rounded-full border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600">
					<GearIcon />
				</button>
			</header>

			{saved && (
				<ResumeCard
					saved={saved}
					onResume={() => dispatch({ type: "RESTORED", state: saved })}
					onDiscard={() => {
						clearSavedLesson();
						setSaved(null);
					}}
				/>
			)}

			<form onSubmit={submit} className="space-y-6">
				<div>
					<span className="block text-sm font-medium">1. Choose a file</span>
					<div
						onDragOver={(e) => {
							e.preventDefault();
							setDragging(true);
						}}
						onDragLeave={() => setDragging(false)}
						onDrop={onDrop}
						className={clsx(
							"mt-2 rounded-2xl border-2 border-dashed bg-white transition-colors",
							dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300",
						)}>
						<input
							ref={inputRef}
							type="file"
							accept={ACCEPT}
							className="sr-only"
							onChange={(e) => pick(e.target.files[0])}
							disabled={busy}
						/>
						{file ?
							<div className="flex items-center gap-3 p-4">
								<DocIcon className="h-8 w-8 shrink-0 text-indigo-600" />
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium" dir="auto">
										{file.name}
									</p>
									<p className="text-sm text-slate-500">{formatSize(file.size)}</p>
								</div>
								<button
									type="button"
									onClick={() => inputRef.current.click()}
									disabled={busy}
									className="rounded-full px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50 disabled:opacity-50">
									Change
								</button>
							</div>
						:	<button
								type="button"
								onClick={() => inputRef.current.click()}
								className="flex w-full flex-col items-center gap-2 px-4 py-9 text-center focus-visible:outline-2 focus-visible:outline-indigo-600">
								<UploadIcon className="h-7 w-7 text-slate-400" />
								<span className="font-medium">Drop a file here, or tap to browse</span>
								<span className="text-sm text-slate-500">PDF, Word, text, Markdown or an image · up to {MAX_FILE_MB} MB</span>
							</button>
						}
					</div>
					{fileError && (
						<p role="alert" className="mt-2 text-sm text-red-700">
							{fileError}
						</p>
					)}
				</div>

				<div>
					<label htmlFor="prompt" className="block text-sm font-medium">
						2. Tell the AI how to teach it
					</label>
					<textarea
						id="prompt"
						value={prompt}
						onChange={(e) => setPrompt(e.target.value)}
						disabled={busy}
						rows={3}
						maxLength={2000}
						dir="auto"
						placeholder="Who is the student? What language, style and length?"
						className="mt-2 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-60"
					/>
					<div className="mt-2 flex flex-wrap gap-2">
						{EXAMPLE_PROMPTS.map((example) => (
							<button
								key={example}
								type="button"
								onClick={() => setPrompt(example)}
								disabled={busy}
								className="rounded-full border border-slate-200 bg-white px-3 py-1 text-left text-xs text-slate-600 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50">
								{example}
							</button>
						))}
					</div>
				</div>

				{!hasKey && (
					<p className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
						You need a free Gemini API key to start.{" "}
						<button type="button" onClick={openDialog} className="font-medium text-indigo-700 underline">
							Add it in settings
						</button>
						.
					</p>
				)}

				{error && <ErrorNotice error={error} onRetry={ready ? () => create({ file, teacherPrompt: prompt.trim() }) : undefined} />}

				<div className="flex items-center gap-3">
					<button
						type="submit"
						disabled={!ready}
						className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-300">
						{busy ?
							<>
								<Spinner />
								<span role="status">{STAGE_LABEL[stage]}</span>
							</>
						:	"Start the lesson"}
					</button>
					{busy && (
						<button type="button" onClick={cancel} className="rounded-full px-4 py-3 text-sm text-slate-600 hover:bg-slate-100">
							Cancel
						</button>
					)}
				</div>
			</form>
		</main>
	);
}
