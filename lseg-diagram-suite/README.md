# LSEG SAM Forecasting — Conceptual Diagram Suite (v0.1)

**Status:** v0.1 · conceptual · for validation · **Viridian-proposed, not LSEG-ratified**
**Prepared by:** Viridian Solutions · British English throughout.

These are the **conceptual** layer diagrams (agreed *before* wireframes) that lock the core
forecasting principles so stakeholders share one mental model. **They are NOT wireframes** and
must not be read as UI. Content is faithful to the locked forecast model in the project brief.

## Files

| File | View | Notes |
|------|------|-------|
| `LSEG_Forecast_Layers.mmd` | Build-up stack: deal-based foundation → overlays → single output | `flowchart BT`; certainty/time axis + cross-cutting lenses as notes |
| `LSEG_Deal_Decision_Tree.mmd` | Per-deal flow: materiality gate → in/out call → three-lever risk triage → roll-up | `flowchart TD` |
| `LSEG_Layer_Migration.mmd` | Vertical bridge: overlays materialising down into deal-based over cycles | `flowchart LR`, two subgraphs |
| `LSEG_Planning_Principles.mmd` | North star + 3 pillars × 3 principles | `flowchart TD` |
| `LSEG_Process_Flow.mmd` | **New** — end-to-end monthly cycle across role lanes (swimlaned) | `flowchart TB`, lanes as subgraphs |
| `LSEG_Architecture.mmd` | **New** — solution / data-flow: Salesforce → Snowflake → Pigment → downstream | `flowchart LR`, conceptual (not physical schema) |
| `LSEG_Variance_Questions.mmd` | **New** — variance "questions this answers" (companion to the waterfall) | `flowchart TD` |

## Variance view decision (per brief §7)

The horizontal variance bridge is a **waterfall**, which Mermaid cannot render. Decision taken:
**(a)** keep `LSEG_Variance_Storytelling_v0.1.svg` as the SVG for the waterfall itself, **and**
**(b)** add `LSEG_Variance_Questions.mmd` as an editable companion capturing the six questions the
approach answers. Both are delivered.

## OPEN items flagged on the diagrams (do not silently resolve)

1. **Renewal layer** — position above New Deals / below Target is a Viridian default, overrideable;
   marked OPEN (dashed) and data-dependent (confirm with business).
2. **Deal-backed pooling** of material-uncommittable deals — OPEN, needs James/Ken sign-off; marked
   OPEN (dashed) on the Deal Decision Tree.
3. **Migration-tagging build requirement** — each deal must be stamped with the overlay + period that
   anticipated it; surfaced as a build requirement on the Layer Migration bridge (design in from the start).
4. **Swing / range definition** — what qualifies as a swing, and monthly vs quarterly management, is not
   yet agreed (EMEA operates on quarters).

## House style

House-style palette applied via `classDef` (navy foundation, green output/most-likely, blue overlay
ramp, teal calibration accent, bronze improvement accent, amber decisions/swing, red downside). Labels
are quoted, `<br/>` for line breaks, no bare `<` `>` `(` `)` outside quotes — imports cleanly to Miro
(Miro → Diagram/Mermaid → paste) and renders in mermaid.live. `graph TD` is a drop-in fallback for
`flowchart` if a Miro build rejects it.

Also rendered natively into a Miro board via the Miro MCP integration.
