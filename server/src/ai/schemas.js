import { z } from "zod";

const chunk = z.object({
	id: z.string().min(1).max(20),
	locator: z.string().max(120),
	text: z.string().max(6000),
});

export const spec = z.object({
	language: z.string().max(60),
	audience: z.string().max(120),
	method: z.string().max(200),
	timeBudgetMin: z.number().nullable(),
});

const stepBrief = z.object({
	title: z.string().max(200),
	objective: z.string().max(600),
	opening: z.string().max(600),
	checkQuestion: z.string().max(600),
});

/** Request body of POST /api/plan. */
export const planRequest = z.object({
	teacherPrompt: z.string().trim().min(1).max(2000),
	direction: z.enum(["ltr", "rtl"]).default("ltr"),
	chunks: z.array(chunk).min(1).max(1500),
});

/** What the planner model must return. Validated, then repaired by the route. */
export const plannerOutput = z.object({
	teachable: z.boolean(),
	reason: z.string().nullish(),
	title: z.string().default("Lesson"),
	spec: z.object({
		language: z.string().default("English"),
		audience: z.string().default("general learners"),
		method: z.string().default("guided and interactive"),
		timeBudgetMin: z.number().nullable().catch(null),
	}),
	steps: z
		.array(
			z.object({
				title: z.string(),
				objective: z.string(),
				chunkIds: z.array(z.string()).default([]),
				opening: z.string(),
				checkQuestion: z.string(),
				successCriteria: z.string(),
			}),
		)
		.default([]),
});

/** Request body of POST /api/lesson/turn. Everything the server needs; it keeps no state. */
export const turnRequest = z.object({
	kind: z.enum(["start", "reply"]),
	teacherPrompt: z.string().trim().min(1).max(2000),
	lessonTitle: z.string().max(200),
	spec,
	step: stepBrief.extend({
		index: z.number().int().min(0),
		total: z.number().int().min(1),
		successCriteria: z.string().max(600),
	}),
	nextStep: stepBrief.nullable(),
	chunks: z.array(chunk).max(12),
	nextChunks: z.array(chunk).max(12),
	progress: z.object({
		hintLevel: z.number().int().min(0).max(5),
		finalAttempt: z.boolean(),
		notes: z.array(z.string().max(300)).max(8),
	}),
	messages: z.array(z.object({ role: z.enum(["student", "tutor"]), text: z.string().min(1).max(4000) })).max(12),
});

/** The hidden assessment the tutor appends after its message. */
export const trailer = z.object({
	verdict: z.enum(["correct", "partial", "wrong", "none"]).catch("none"),
	citations: z.array(z.object({ chunkId: z.string(), quote: z.string().nullish() })).catch([]),
	note: z.string().nullish().catch(null),
});
