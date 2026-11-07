/**
 * The lesson state machine. It is the single source of truth for the plan and the
 * student's progress; the chat history only records what was said.
 * The model reports a verdict on each student answer, and this reducer decides what that means.
 *
 * @typedef {"pending"|"active"|"mastered"|"revisit"} StepStatus
 * @typedef {{ chunkId: string, quote: string | null }} Citation
 * @typedef {{ id: string, role: "student"|"tutor", text: string,
 *   status: "done"|"streaming"|"stopped"|"error", citations: Citation[],
 *   error: { code: string, message: string, retryAfterSec?: number } | null }} Message
 */

/** Wrong or partial answers allowed on one step before the tutor explains and moves on. */
export const MAX_ATTEMPTS = 3;
const MAX_HINT_LEVEL = 3;
const MAX_NOTES = 5;

export const initialState = {
	phase: "setup", // "setup" | "teaching" | "finished"
	document: null,
	plan: null,
	teacherPrompt: "",
	progress: null,
	messages: [],
};

function freshProgress(plan) {
	return {
		currentStepIndex: 0,
		stepStatus: Object.fromEntries(plan.steps.map((step, i) => [step.id, i === 0 ? "active" : "pending"])),
		attempts: {},
		hintLevel: 0,
		notes: [],
	};
}

function advanceStep(state, status) {
	const { plan, progress } = state;
	const current = plan.steps[progress.currentStepIndex];
	const nextIndex = progress.currentStepIndex + 1;
	const stepStatus = { ...progress.stepStatus, [current.id]: status };
	const finished = nextIndex >= plan.steps.length;
	if (!finished) stepStatus[plan.steps[nextIndex].id] = "active";
	return {
		...state,
		phase: finished ? "finished" : "teaching",
		progress: { ...progress, stepStatus, currentStepIndex: nextIndex, hintLevel: 0 },
	};
}

function applyVerdict(state, verdict, note) {
	if (state.phase !== "teaching") return state;
	const { plan, progress } = state;
	const notes = note ? [...progress.notes, note].slice(-MAX_NOTES) : progress.notes;
	const withNotes = { ...state, progress: { ...progress, notes } };

	if (verdict === "none") return withNotes;
	if (verdict === "correct") return advanceStep(withNotes, "mastered");

	const stepId = plan.steps[progress.currentStepIndex].id;
	const attempts = (progress.attempts[stepId] ?? 0) + 1;
	const counted = {
		...withNotes,
		progress: { ...withNotes.progress, attempts: { ...progress.attempts, [stepId]: attempts } },
	};
	if (attempts >= MAX_ATTEMPTS) return advanceStep(counted, "revisit");
	return { ...counted, progress: { ...counted.progress, hintLevel: Math.min(progress.hintLevel + 1, MAX_HINT_LEVEL) } };
}

function updateMessage(state, id, change) {
	return { ...state, messages: state.messages.map((m) => (m.id === id ? { ...m, ...change(m) } : m)) };
}

export function lessonReducer(state, action) {
	switch (action.type) {
		case "LESSON_CREATED":
			return {
				phase: "teaching",
				document: action.document,
				plan: action.plan,
				teacherPrompt: action.teacherPrompt,
				progress: freshProgress(action.plan),
				messages: [],
			};

		case "RESTORED":
			return action.state;

		case "RESET":
			return initialState;

		case "STUDENT_SENT":
			return {
				...state,
				messages: [...state.messages, { id: action.id, role: "student", text: action.text, status: "done", citations: [], error: null }],
			};

		case "TUTOR_STARTED":
			return {
				...state,
				messages: [...state.messages, { id: action.id, role: "tutor", text: "", status: "streaming", citations: [], error: null }],
			};

		case "TUTOR_DELTA":
			return updateMessage(state, action.id, (m) => ({ text: m.text + action.text }));

		case "TUTOR_STATE": {
			const withCitations = updateMessage(state, action.id, () => ({ citations: action.citations }));
			return applyVerdict(withCitations, action.verdict, action.note);
		}

		case "TUTOR_DONE":
			return updateMessage(state, action.id, () => ({ status: "done" }));

		case "TUTOR_STOPPED":
			return updateMessage(state, action.id, () => ({ status: "stopped" }));

		case "TUTOR_FAILED":
			return updateMessage(state, action.id, () => ({ status: "error", error: action.error }));

		case "RETRY_PREPARED": {
			const last = state.messages.at(-1);
			const failed = last?.role === "tutor" && (last.status === "error" || last.status === "stopped");
			return failed ? { ...state, messages: state.messages.slice(0, -1) } : state;
		}

		default:
			return state;
	}
}
