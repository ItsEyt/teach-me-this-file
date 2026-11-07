import { useCallback, useEffect, useRef } from "react";
import { streamTurn } from "../lib/api.js";
import { lessonReducer } from "../state/lessonReducer.js";
import { useLesson } from "../state/LessonContext.jsx";
import { useSettings } from "../state/SettingsContext.jsx";
import { buildTurnRequest } from "../state/selectors.js";

/**
 * Runs tutor turns against the server and feeds the events into the lesson reducer.
 * Each action first computes the next state with the pure reducer, so the request is
 * built from exactly what the reducer will hold, with no stale closures.
 */
export function useLessonStream() {
	const { state, dispatch } = useLesson();
	const { settings } = useSettings();
	const stateRef = useRef(state);
	const abortRef = useRef(null);
	const failuresInARow = useRef(0);

	useEffect(() => {
		stateRef.current = state;
	}, [state]);

	const run = useCallback(
		async (snapshot, kind) => {
			if (abortRef.current) return; // one turn at a time
			const controller = new AbortController();
			abortRef.current = controller;
			const id = crypto.randomUUID();
			dispatch({ type: "TUTOR_STARTED", id });

			try {
				await streamTurn(buildTurnRequest(snapshot, kind), settings, controller.signal, (event, data) => {
					if (event === "delta") dispatch({ type: "TUTOR_DELTA", id, text: data.text });
					if (event === "state") dispatch({ type: "TUTOR_STATE", id, ...data });
					if (event === "done") dispatch({ type: "TUTOR_DONE", id });
				});
				failuresInARow.current = 0;
			} catch (err) {
				if (err.name === "AbortError") {
					dispatch({ type: "TUTOR_STOPPED", id });
				} else {
					failuresInARow.current += 1;
					const error = {
						code: err.code ?? "INTERNAL",
						message: err.message,
						retryAfterSec: err.retryAfterSec,
						repeat: failuresInARow.current > 1, // the notice only auto-retries a first failure
					};
					dispatch({ type: "TUTOR_FAILED", id, error });
				}
			} finally {
				abortRef.current = null;
			}
		},
		[dispatch, settings],
	);

	const start = useCallback(() => run(stateRef.current, "start"), [run]);

	const send = useCallback(
		(text) => {
			const action = { type: "STUDENT_SENT", id: crypto.randomUUID(), text };
			const snapshot = lessonReducer(stateRef.current, action);
			dispatch(action);
			return run(snapshot, "reply");
		},
		[dispatch, run],
	);

	const retry = useCallback(() => {
		const action = { type: "RETRY_PREPARED" };
		const snapshot = lessonReducer(stateRef.current, action);
		dispatch(action);
		return run(snapshot, snapshot.messages.length === 0 ? "start" : "reply");
	}, [dispatch, run]);

	const stop = useCallback(() => abortRef.current?.abort(), []);

	return { start, send, retry, stop };
}
