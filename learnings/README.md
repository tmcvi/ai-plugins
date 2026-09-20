# Build Learnings → Skills

Working area for turning accumulated Pigment build experience into skills under `../skills/`.

## Why this exists

Claude Code sessions are isolated — no session can read another's history. The knowledge from
past builds only survives if it is deliberately extracted and written down. This folder is the
pipeline for doing that.

## Process

1. **Identify the builds.** See `inventory.local.md` (gitignored — it carries client names).
   Reconstructed from Pigment app metadata, Circleback meeting notes and Drive artefacts.
2. **Extract.** Paste `EXTRACTION-PROMPT.md` into each past build chat verbatim.
3. **Collect.** Save each reply to `raw/<slug>.md`.
4. **Aggregate.** Cluster across builds. A lesson appearing in one build is an anecdote; the same
   lesson in three is a skill.
5. **Write.** Promote clusters into `../skills/`, extending existing skills before adding new ones.

## Aggregation rule

Frequency decides the destination:

| Appearances | Destination |
|---|---|
| 3+ builds | Its own skill, or a major section of an existing one |
| 2 builds | A rule inside an existing skill |
| 1 build, high cost | A gotcha in the relevant skill's "known traps" |
| 1 build, low cost | Drop it — not yet evidence of a pattern |

## Confidentiality

`raw/` is committed, so the extraction prompt strips client identifiers at source. Before any
file lands in `raw/`, check it carries no client name, person name or real data value. The
inventory itself stays local and uncommitted.
