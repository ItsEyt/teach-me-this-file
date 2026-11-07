import { createContext, useContext, useEffect, useReducer, useRef } from "react";
import { lessonReducer, initialState } from "./lessonReducer.js";
import { saveLesson } from "./persistence.js";
import { isStreaming } from "./selectors.js";

const LessonContext = createContext(null);

export function LessonProvider({ children }) {
	const [state, dispatch] = useReducer(lessonReducer, initialState);
	const latest = useRef(state);

	// Persist while a lesson is running so a refresh does not lose it. While a reply is
	// streaming the state changes many times a second, so it is saved once the reply settles.
	useEffect(() => {
		latest.current = state;
		if (state.phase !== "setup" && !isStreaming(state)) saveLesson(state);
	}, [state]);

	// Leaving mid-reply still saves; the half-written message comes back as "stopped" with a retry.
	useEffect(() => {
		const flush = () => latest.current.phase !== "setup" && saveLesson(latest.current);
		window.addEventListener("pagehide", flush);
		return () => window.removeEventListener("pagehide", flush);
	}, []);

	return <LessonContext.Provider value={{ state, dispatch }}>{children}</LessonContext.Provider>;
}

export function useLesson() {
	const value = useContext(LessonContext);
	if (!value) throw new Error("useLesson must be used inside <LessonProvider>");
	return value;
}
