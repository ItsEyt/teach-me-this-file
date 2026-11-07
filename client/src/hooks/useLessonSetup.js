import { useCallback, useRef, useState } from "react";
import { ApiError, createPlan, ingestFile } from "../lib/api.js";
import { useLesson } from "../state/LessonContext.jsx";
import { useSettings } from "../state/SettingsContext.jsx";

/** Turns a file and a teacher prompt into a lesson: read the file, then plan the steps. */
export function useLessonSetup() {
	const { dispatch } = useLesson();
	const { settings } = useSettings();
	const [stage, setStage] = useState("idle"); // "idle" | "reading" | "planning"
	const [error, setError] = useState(null);
	const abortRef = useRef(null);

	const create = useCallback(
		async ({ file, teacherPrompt }) => {
			const controller = new AbortController();
			abortRef.current = controller;
			setError(null);
			try {
				setStage("reading");
				const document = await ingestFile(file, settings, controller.signal);
				setStage("planning");
				const plan = await createPlan({ teacherPrompt, document }, settings, controller.signal);
				if (!plan.teachable) throw new ApiError("NOT_TEACHABLE", plan.reason);
				dispatch({ type: "LESSON_CREATED", document, plan, teacherPrompt });
			} catch (err) {
				if (err.name !== "AbortError") setError(err);
			} finally {
				abortRef.current = null;
				setStage("idle");
			}
		},
		[dispatch, settings],
	);

	const cancel = useCallback(() => abortRef.current?.abort(), []);

	return { stage, error, create, cancel };
}
