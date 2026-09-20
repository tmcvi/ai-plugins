# Build Learnings Extraction Prompt

Paste the block below into **each** past Pigment build chat, unchanged. Save the reply as
`learnings/raw/<slug>.md` (e.g. `raw/warburtons-poc.md`) and it will aggregate cleanly.

Why it is worded this way:
- It forbids invention, so a thin chat returns a thin file instead of a plausible-sounding fiction.
- It weights **friction over outcome**. What went wrong and had to be corrected is what becomes a
  skill; what went right first time is usually already in the docs.
- It fixes the output shape, so aggregating twenty replies is mechanical rather than interpretive.
- It strips client identifiers at source, so no customer data reaches the repo.

---

```
Read back over everything we did in THIS conversation and extract the reusable engineering
learnings from it. I am aggregating these across many Pigment builds to write Claude Code
skills, so accuracy matters far more than completeness.

Rules:
- Report ONLY what actually happened in this conversation. If you did not do it here, omit it.
  An empty section is correct and useful. Do not generalise from your background knowledge of
  Pigment — I want what THIS build taught, not what you already knew.
- Quote real formulas, real error text and real tool names verbatim where you have them.
- Replace every client name, person name, entity name and real data value with a generic
  placeholder (<CLIENT>, <ENTITY>, <PERSON>, <VALUE>). Keep the structure, drop the identity.
- Where you are unsure whether something generalises or was specific to this build, say so
  explicitly rather than picking one.

Output in exactly this format:

## Build
- What was built (app type, scope, roughly how big)
- Approximate date(s)
- Tooling used: Pigment MCP write tools / Modeler Agent / Frames / manual UI / mixture
- Outcome: shipped, demoed, abandoned, unknown

## What worked
Practices worth repeating. For each: the practice, and the evidence from this chat that it
worked. Skip anything you cannot evidence.

## What went wrong
The important section. For each problem:
- Symptom (what I saw, or the literal error)
- Root cause (if it was established — say "never established" if it wasn't)
- Fix that actually resolved it
- How many attempts it took, if that was more than one

## Rules I had to be told
Anything I corrected you on, or any constraint you only discovered by hitting it. Include the
ones that feel obvious in hindsight — those are the highest-value skill content.

## Formula / modelling patterns
Verbatim formula snippets, dimension structures or metric patterns worth reusing. Note any that
were performance-sensitive and why.

## Tool notes
Pigment MCP tools specifically: which behaved unexpectedly, which arguments were non-obvious,
which sequences mattered (e.g. X must exist before Y), which failed silently.

## Would do differently
Concrete, specific. "Start with the calendar before the dimensions" beats "plan more".

## Confidence
Flag anything above that you are reconstructing rather than reading directly from the
conversation, and anything the conversation is too old or too compacted to speak to reliably.
```
