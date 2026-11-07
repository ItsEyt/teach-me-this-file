import { useServerStatus } from "../hooks/useServerStatus.js";
import { SettingsDialog } from "../features/setup/SettingsDialog.jsx";
import { SetupScreen } from "../features/setup/SetupScreen.jsx";
import { LessonScreen } from "../features/lesson/LessonScreen.jsx";
import { LessonProvider, useLesson } from "../state/LessonContext.jsx";
import { SettingsProvider, useSettings } from "../state/SettingsContext.jsx";
import { Spinner } from "../components/Spinner.jsx";

function ServerBanner({ status }) {
	if (status === "waking") {
		return (
			<div role="status" className="flex items-center justify-center gap-2 bg-indigo-600 px-4 py-2 text-sm text-white">
				<Spinner className="h-4 w-4" />
				Waking up the server… this can take up to a minute on free hosting.
			</div>
		);
	}``
	if (status === "offline") {
		return (
			<div role="alert" className="bg-red-600 px-4 py-2 text-center text-sm text-white">
				Can't reach the server. Refresh the page to try again.
			</div>
		);
	}
	return null;
}

function Screens() {
	const { state } = useLesson();
	const { dialogOpen } = useSettings();
	const server = useServerStatus();
	const inLesson = state.phase !== "setup";

	return (
		<>
			<ServerBanner status={server.status} />
			{inLesson ?
				<LessonScreen />
			:	<SetupScreen server={server} />}
			{dialogOpen && <SettingsDialog />}
		</>
	);
}

export function App() {
	return (
		<SettingsProvider>
			<LessonProvider>
				<Screens />
			</LessonProvider>
		</SettingsProvider>
	);
}
