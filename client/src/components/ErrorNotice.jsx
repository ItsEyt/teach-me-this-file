import { useEffect, useState } from "react";
import { describeError } from "../lib/errors.js";
import { useSettings } from "../state/SettingsContext.jsx";

const DEFAULT_WAIT_SEC = 20;

const buttonClass =
	"rounded-full bg-amber-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900";

/**
 * Friendly error with the one action that can fix it. With `autoRetry`, a rate-limit
 * error counts down and retries once by itself, so a student on the free tier is not
 * left staring at an error. The caller turns it off for repeat failures to avoid a loop.
 */
export function ErrorNotice({ error, onRetry, autoRetry = false }) {
	const { openDialog } = useSettings();
	const { title, message, action } = describeError(error);
	const waitSec = error.code === "RATE_LIMITED" ? (error.retryAfterSec ?? DEFAULT_WAIT_SEC) : 0;
	const counting = autoRetry && waitSec > 0 && Boolean(onRetry);
	const [remaining, setRemaining] = useState(waitSec);

	useEffect(() => {
		if (!counting) return undefined;
		const timer = setInterval(() => setRemaining((s) => s - 1), 1000);
		return () => clearInterval(timer);
	}, [counting]);

	useEffect(() => {
		if (counting && remaining === 0) onRetry(); // fires once, when the countdown reaches zero
	}, [counting, remaining, onRetry]);

	let detail = message;
	if (counting && remaining > 0) detail += ` Trying again in ${remaining}s.`;
	else if (waitSec > 0 && !counting) detail += ` Wait about ${waitSec}s, then try again.`;

	return (
		<div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
			<p className="font-semibold">{title}</p>
			<p className="mt-1">{detail}</p>
			<div className="mt-3 flex flex-wrap gap-2">
				{action === "settings" && (
					<button type="button" onClick={openDialog} className={buttonClass}>
						Open settings
					</button>
				)}
				{action === "retry" && onRetry && (
					<button type="button" onClick={onRetry} className={buttonClass}>
						{counting ? "Try now" : "Try again"}
					</button>
				)}
			</div>
		</div>
	);
}
