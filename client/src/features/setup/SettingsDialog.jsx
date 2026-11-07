import { useState } from "react";
import { Sheet } from "../../components/Sheet.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { checkKey } from "../../lib/api.js";
import { describeError } from "../../lib/errors.js";
import { useSettings } from "../../state/SettingsContext.jsx";

const MODEL_SUGGESTIONS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];

export function SettingsDialog() {
	const { settings, save, closeDialog } = useSettings();
	const [draft, setDraft] = useState(settings);
	const [visible, setVisible] = useState(false);
	const [test, setTest] = useState({ state: "idle" }); // idle | testing | ok | failed

	const change = (patch) => {
		setDraft((d) => ({ ...d, ...patch }));
		setTest({ state: "idle" });
	};

	async function runTest() {
		setTest({ state: "testing" });
		try {
			await checkKey({ key: draft.key.trim(), model: draft.model.trim() });
			setTest({ state: "ok" });
		} catch (err) {
			setTest({ state: "failed", message: describeError(err).message });
		}
	}

	function submit(event) {
		event.preventDefault();
		save({ ...draft, key: draft.key.trim(), model: draft.model.trim() });
		closeDialog();
	}

	return (
		<Sheet title="Settings" onClose={closeDialog}>
			<form onSubmit={submit} className="space-y-5">
				<div>
					<label htmlFor="api-key" className="block text-sm font-medium">
						Gemini API key
					</label>
					<div className="mt-1.5 flex gap-2">
						<input
							id="api-key"
							type={visible ? "text" : "password"}
							value={draft.key}
							onChange={(e) => change({ key: e.target.value })}
							autoComplete="off"
							spellCheck={false}
							dir="ltr"
							placeholder="Paste your key"
							className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600"
						/>
						<button
							type="button"
							onClick={() => setVisible((v) => !v)}
							className="rounded-xl border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50">
							{visible ? "Hide" : "Show"}
						</button>
					</div>
					<p className="mt-2 text-xs leading-relaxed text-slate-500">
						Get a free key at{" "}
						<a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 underline">
							Google AI Studio
						</a>
						. It is sent to this app's server with each request to call Gemini for you, and is never stored or logged there. Note that
						Google may use free-tier prompts to improve its products, so avoid confidential files.
					</p>
				</div>

				<label className="flex items-start gap-2 text-sm">
					<input
						type="checkbox"
						checked={draft.remember}
						onChange={(e) => change({ remember: e.target.checked })}
						className="mt-0.5 h-4 w-4 accent-indigo-600"
					/>
					<span>
						Remember the key on this device
						<span className="block text-xs text-slate-500">Off: it is forgotten when you close this tab.</span>
					</span>
				</label>

				<div>
					<label htmlFor="model" className="block text-sm font-medium">
						Model <span className="font-normal text-slate-500">(optional)</span>
					</label>
					<input
						id="model"
						list="model-suggestions"
						value={draft.model}
						onChange={(e) => change({ model: e.target.value })}
						dir="ltr"
						placeholder="Server default"
						className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600"
					/>
					<datalist id="model-suggestions">
						{MODEL_SUGGESTIONS.map((name) => (
							<option key={name} value={name} />
						))}
					</datalist>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<button
						type="button"
						onClick={runTest}
						disabled={!draft.key.trim() || test.state === "testing"}
						className="flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
						{test.state === "testing" && <Spinner className="h-4 w-4" />}
						Test key
					</button>
					<span role="status" className="text-sm">
						{test.state === "ok" && <span className="text-emerald-700">Key works.</span>}
						{test.state === "failed" && <span className="text-red-700">{test.message}</span>}
					</span>
				</div>

				<button
					type="submit"
					className="w-full rounded-full bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
					Save
				</button>
			</form>
		</Sheet>
	);
}
