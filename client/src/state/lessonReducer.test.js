import { describe, expect, it } from "vitest";
import { initialState, lessonReducer, MAX_ATTEMPTS } from "./lessonReducer.js";
import { buildTurnRequest, canRetry } from "./selectors.js";

const plan = {
  title: "Photosynthesis",
  teachable: true,
  spec: { language: "English", audience: "7th graders", method: "Socratic", timeBudgetMin: 10 },
  steps: [1, 2, 3].map((n) => ({
    id: `step-${n}`,
    title: `Step ${n}`,
    objective: `Objective ${n}`,
    chunkIds: [`S${n}`],
    opening: `Opening ${n}`,
    checkQuestion: `Question ${n}`,
    successCriteria: `Criteria ${n}`,
  })),
};
const document = {
  id: "d1",
  direction: "ltr",
  chunks: [1, 2, 3].map((n) => ({ id: `S${n}`, locator: `p. ${n}`, text: `Passage ${n}` })),
};

const begin = () => lessonReducer(initialState, { type: "LESSON_CREATED", document, plan, teacherPrompt: "Teach it" });
const verdict = (state, v, note = null) => lessonReducer(state, { type: "TUTOR_STATE", id: "m1", verdict: v, citations: [], note });
const withTutorMessage = (state) => lessonReducer(state, { type: "TUTOR_STARTED", id: "m1" });

describe("lesson progress", () => {
  it("starts on step 1 with the rest pending", () => {
    const state = begin();
    expect(state.phase).toBe("teaching");
    expect(state.progress.stepStatus).toEqual({ "step-1": "active", "step-2": "pending", "step-3": "pending" });
  });

  it("advances and marks the step mastered on a correct answer", () => {
    const state = verdict(withTutorMessage(begin()), "correct");
    expect(state.progress.currentStepIndex).toBe(1);
    expect(state.progress.stepStatus["step-1"]).toBe("mastered");
    expect(state.progress.stepStatus["step-2"]).toBe("active");
  });

  it("stays on the step and raises the hint level on a wrong answer", () => {
    const state = verdict(withTutorMessage(begin()), "wrong");
    expect(state.progress.currentStepIndex).toBe(0);
    expect(state.progress.hintLevel).toBe(1);
    expect(state.progress.attempts["step-1"]).toBe(1);
  });

  it("moves on and flags the step for revisit after too many failed attempts", () => {
    let state = withTutorMessage(begin());
    for (let i = 0; i < MAX_ATTEMPTS; i++) state = verdict(state, i % 2 ? "partial" : "wrong");
    expect(state.progress.currentStepIndex).toBe(1);
    expect(state.progress.stepStatus["step-1"]).toBe("revisit");
    expect(state.progress.hintLevel).toBe(0);
  });

  it("leaves progress alone when the tutor did not judge an answer", () => {
    const state = verdict(withTutorMessage(begin()), "none", "likes diagrams");
    expect(state.progress.currentStepIndex).toBe(0);
    expect(state.progress.attempts).toEqual({});
    expect(state.progress.notes).toEqual(["likes diagrams"]);
  });

  it("finishes the lesson after the last step", () => {
    let state = withTutorMessage(begin());
    for (let i = 0; i < plan.steps.length; i++) state = verdict(state, "correct");
    expect(state.phase).toBe("finished");
    expect(state.progress.currentStepIndex).toBe(plan.steps.length);
  });

  it("ignores verdicts once the lesson is finished", () => {
    let state = withTutorMessage(begin());
    for (let i = 0; i < plan.steps.length; i++) state = verdict(state, "correct");
    const after = verdict(state, "wrong");
    expect(after.phase).toBe("finished");
    expect(after.progress).toEqual(state.progress);
  });
});

describe("messages", () => {
  it("streams text into the tutor message and settles it", () => {
    let state = withTutorMessage(begin());
    state = lessonReducer(state, { type: "TUTOR_DELTA", id: "m1", text: "Hel" });
    state = lessonReducer(state, { type: "TUTOR_DELTA", id: "m1", text: "lo" });
    state = lessonReducer(state, { type: "TUTOR_DONE", id: "m1" });
    expect(state.messages[0]).toMatchObject({ text: "Hello", status: "done" });
  });

  it("keeps partial text when a turn is stopped, and retry removes it", () => {
    let state = withTutorMessage(begin());
    state = lessonReducer(state, { type: "TUTOR_DELTA", id: "m1", text: "Partial" });
    state = lessonReducer(state, { type: "TUTOR_STOPPED", id: "m1" });
    expect(state.messages[0]).toMatchObject({ text: "Partial", status: "stopped" });
    expect(canRetry(state)).toBe(true);
    expect(lessonReducer(state, { type: "RETRY_PREPARED" }).messages).toHaveLength(0);
  });

  it("does not drop a finished tutor message on retry", () => {
    let state = withTutorMessage(begin());
    state = lessonReducer(state, { type: "TUTOR_DONE", id: "m1" });
    expect(lessonReducer(state, { type: "RETRY_PREPARED" }).messages).toHaveLength(1);
  });
});

describe("buildTurnRequest", () => {
  it("sends only the current and next step's passages", () => {
    const request = buildTurnRequest(begin(), "start");
    expect(request.chunks.map((c) => c.id)).toEqual(["S1"]);
    expect(request.nextChunks.map((c) => c.id)).toEqual(["S2"]);
    expect(request.nextStep.title).toBe("Step 2");
    expect(request.messages).toEqual([]);
  });

  it("has no next step on the last step", () => {
    let state = withTutorMessage(begin());
    state = verdict(state, "correct");
    state = verdict(state, "correct");
    const request = buildTurnRequest(state, "reply");
    expect(request.nextStep).toBeNull();
    expect(request.nextChunks).toEqual([]);
  });

  it("flags the final attempt once earlier attempts are used up", () => {
    let state = withTutorMessage(begin());
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) state = verdict(state, "wrong");
    expect(buildTurnRequest(state, "reply").progress.finalAttempt).toBe(true);
  });

  it("excludes failed or stopped tutor messages from the history window", () => {
    let state = begin();
    state = lessonReducer(state, { type: "STUDENT_SENT", id: "s1", text: "Hi" });
    state = withTutorMessage(state);
    state = lessonReducer(state, { type: "TUTOR_STOPPED", id: "m1" });
    expect(buildTurnRequest(state, "reply").messages).toEqual([{ role: "student", text: "Hi" }]);
  });
});
