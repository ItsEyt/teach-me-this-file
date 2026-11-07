import clsx from "clsx";
import { CheckIcon } from "../../components/icons.jsx";
import { Sheet } from "../../components/Sheet.jsx";

const STATUS_LABEL = {
	mastered: "Done",
	revisit: "Worth revisiting",
	active: "In progress",
	pending: "Up next",
};

const BADGE_STYLE = {
	mastered: "bg-indigo-600 text-white",
	revisit: "bg-amber-400 text-amber-950",
	active: "bg-indigo-100 text-indigo-700 ring-2 ring-indigo-600",
	pending: "bg-slate-100 text-slate-500",
};

export function StepSheet({ plan, progress, onClose }) {
	return (
		<Sheet title="Lesson plan" onClose={onClose}>
			<p className="mb-4 text-sm text-slate-600" dir="auto">
				{plan.title}
			</p>
			<ol className="space-y-3">
				{plan.steps.map((step, index) => {
					const status = progress.stepStatus[step.id];
					return (
						<li key={step.id} className="flex gap-3">
							<span
								className={clsx(
									"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
									BADGE_STYLE[status],
								)}>
								{status === "mastered" ?
									<CheckIcon className="h-4 w-4" />
								:	index + 1}
							</span>
							<div className="min-w-0">
								<p className="font-medium leading-snug" dir="auto">
									{step.title}
								</p>
								<p className="text-xs text-slate-500">{STATUS_LABEL[status]}</p>
							</div>
						</li>
					);
				})}
			</ol>
		</Sheet>
	);
}
