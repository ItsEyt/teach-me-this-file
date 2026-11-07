import { MAX_ATTEMPTS } from "./lessonReducer.js";

const HISTORY_WINDOW = 8;

export const currentStep = (state) => state.plan?.steps[state.progress.currentStepIndex] ?? null;

export const isStreaming = (state) => state.messages.some((m) => m.status === "streaming");

/** True when the last tutor message ended early and can be asked for again. */
export function canRetry(state) {
	const last = state.messages.at(-1);
	return last?.role === "tutor" && (last.status === "error" || last.status === "stopped");
}

const brief = ({ title, objective, opening, checkQuestion }) => ({ title, objective, opening, checkQuestion });

/**
 * The request body for one tutor turn. The server keeps no state, so everything the
 * tutor needs travels with each request: the current step, the step after it,
 * only their passages, and a short window of recent messages.
 */
export function buildTurnRequest(state, kind) {
	const { plan, document, progress, messages } = state;
	const step = plan.steps[progress.currentStepIndex];
	const next = plan.steps[progress.currentStepIndex + 1] ?? null;
	const chunksById = new Map(document.chunks.map((c) => [c.id, c]));
	const passagesOf = (s) => (s ? s.chunkIds.map((id) => chunksById.get(id)).filter(Boolean) : []);

	const history = messages
		.filter((m) => m.role === "student" || (m.status === "done" && m.text.trim()))
		.slice(-HISTORY_WINDOW)
		.map(({ role, text }) => ({ role, text }));

	return {
		kind,
		teacherPrompt: state.teacherPrompt,
		lessonTitle: plan.title,
		spec: plan.spec,
		step: { ...brief(step), successCriteria: step.successCriteria, index: progress.currentStepIndex, total: plan.steps.length },
		nextStep: next ? brief(next) : null,
		chunks: passagesOf(step),
		nextChunks: passagesOf(next),
		progress: {
			hintLevel: progress.hintLevel,
			finalAttempt: (progress.attempts[step.id] ?? 0) >= MAX_ATTEMPTS - 1,
			notes: progress.notes,
		},
		messages: kind === "start" ? [] : history,
	};
}
