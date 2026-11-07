import { Router } from "express";
import { AppError } from "../ai/errors.js";
import { generateJson } from "../ai/gemini.js";
import { buildPlannerPrompt, PLANNER_SYSTEM } from "../ai/prompts/planner.js";
import { plannerOutput, planRequest } from "../ai/schemas.js";
import { abortOnDisconnect } from "../lib/abort.js";
import { readGeminiSettings } from "../middleware/gemini.js";

const MAX_STEPS = 12;

/** Drop unknown passage ids; a step left with none borrows the passage at its position in the document. */
function repairSteps(steps, chunks) {
	const known = new Set(chunks.map((c) => c.id));
	return steps.slice(0, MAX_STEPS).map((step, index, all) => {
		const valid = [...new Set(step.chunkIds.filter((id) => known.has(id)))].slice(0, 3);
		const fallback = chunks[Math.floor((index * chunks.length) / all.length)].id;
		return { ...step, id: `step-${index + 1}`, chunkIds: valid.length > 0 ? valid : [fallback] };
	});
}

export const planRouter = Router();

planRouter.post("/plan", readGeminiSettings, async (req, res) => {
	const { teacherPrompt, chunks } = planRequest.parse(req.body);
	const raw = await generateJson({
		...req.gemini,
		system: PLANNER_SYSTEM,
		prompt: buildPlannerPrompt({ teacherPrompt, chunks }),
		signal: abortOnDisconnect(res),
	});

	const parsed = plannerOutput.safeParse(raw);
	if (!parsed.success) {
		throw new AppError("BAD_MODEL_OUTPUT", "The lesson plan came back malformed. Please try again.", 502);
	}

	const { teachable, reason, title, spec, steps } = parsed.data;
	if (!teachable) {
		res.json({ plan: { teachable: false, reason: reason ?? "This file doesn't look teachable.", title, spec, steps: [] } });
		return;
	}
	if (steps.length === 0) {
		throw new AppError("BAD_MODEL_OUTPUT", "The lesson plan came back empty. Please try again.", 502);
	}
	res.json({ plan: { teachable: true, reason: null, title, spec, steps: repairSteps(steps, chunks) } });
});
