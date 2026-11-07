import clsx from "clsx";

const SEGMENT_STYLE = {
	mastered: "bg-indigo-600",
	revisit: "bg-amber-400",
	active: "bg-indigo-300",
	pending: "bg-slate-200",
};

/** "Step 3 of 7" with one segment per step. Tapping it opens the step list. */
export function ProgressBar({ plan, progress, finished, onOpen }) {
	const total = plan.steps.length;
	const label = finished ? "Lesson complete" : `Step ${progress.currentStepIndex + 1} of ${total}`;

	return (
		<button
			type="button"
			onClick={onOpen}
			aria-label={`${label}. Show all steps`}
			className="group block w-full rounded-lg text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
			<span className="flex items-baseline justify-between gap-3">
				<span className="text-sm font-semibold text-slate-900">{label}</span>
				{!finished && (
					<span className="truncate text-xs text-slate-500 group-hover:text-indigo-700" dir="auto">
						{plan.steps[progress.currentStepIndex].title}
					</span>
				)}
			</span>
			<span className="mt-1.5 flex gap-1" aria-hidden="true">
				{plan.steps.map((step) => (
					<span
						key={step.id}
						className={clsx("h-1.5 flex-1 rounded-full transition-colors", SEGMENT_STYLE[progress.stepStatus[step.id]])}
					/>
				))}
			</span>
		</button>
	);
}
