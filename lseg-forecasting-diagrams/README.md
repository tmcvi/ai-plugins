# LSEG Sales Forecasting — Conceptual Diagram Suite (Mermaid)

**Version:** v0.1 · **Status:** conceptual, for validation · **Author:** Viridian Solutions
**These are conceptual diagrams, not wireframes**, and the content is **Viridian-proposed, not LSEG-ratified**. British English throughout.

Each `.mmd` file imports into Miro (**Miro → Diagram / Mermaid → paste**) and renders in [mermaid.live](https://mermaid.live). Every file uses `flowchart`; if a Miro build rejects it, swap the first line for the `graph …` fallback noted in the file header. Colours, `<br/>` breaks and dashed borders for OPEN items are carried in `classDef`; if a build strips styling, the structure and text remain intact for restyling in-canvas.

## Files

| File | View | Status |
|------|------|--------|
| `LSEG_Forecast_Layers.mmd` | Build-up stack: deal-based foundation → overlays → single submitted number; certainty/time axis and cross-cutting lenses as side notes | Refined from supplied draft |
| `LSEG_Deal_Decision_Tree.mmd` | Per-deal flow: materiality gate → in/out call → three-lever risk triage → roll-up to most-likely / best / worst | Refined from supplied draft |
| `LSEG_Layer_Migration.mmd` | Vertical bridge: overlays resolving *downward* into deal-based reality over cycles, with promised→materialised calibration rates | Built from brief §3.4 (draft not supplied) |
| `LSEG_Planning_Principles.mmd` | North star + 3 pillars × 3 principles (the swing/risk/range philosophy) | Built from brief §3.2 (draft not supplied) |
| `LSEG_Process_Flow.mmd` | **New** — end-to-end monthly cycle across role lanes (Salesforce → AM → AD → Market Head → Regional Head → sign-off → snapshot/write-back), with send-back loops, break-glass and read-only overlay org | New |
| `LSEG_Architecture.mmd` | **New** — conceptual solution / data-flow: Salesforce → Snowflake → Pigment → write-back → downstream; logic lives in Pigment, not the data layer | New |
| `LSEG_Variance_Questions.mmd` | Companion to the variance waterfall — the six questions the approach answers, as an editable flowchart | New companion (see below) |

## Variance view — decision (brief §7)

The horizontal variance bridge is a **waterfall**, which Mermaid cannot draw. Per the recommended default **(a)**, `LSEG_Variance_Storytelling_v0.1.svg` remains the source of truth for the bars. `LSEG_Variance_Questions.mmd` is the optional companion **(b)**: it captures the "questions this approach answers" plus the takes/puts framing as an editable Mermaid flowchart (a flowchart rather than a mindmap, for clean Miro import).

## OPEN items flagged on the diagrams (not silently resolved)

1. **Renewal layer** — shown dashed; position (above New Deals, below Target) is a Viridian default and overrideable; marked data-dependent / confirm-with-business.
2. **Deal-backed pooling** of material-uncommittable deals — dashed on the Deal Decision Tree; **OPEN, needs James/Ken sign-off**.
3. **Migration-tagging build requirement** — surfaced as a requirement on the Layer Migration bridge: each deal must be stamped with the overlay + period that anticipated it, **designed in from the start** (cannot be reconstructed later).
4. **Swing / range definition** — what qualifies as a swing, and monthly vs quarterly management (EMEA runs on quarters), is not yet agreed — noted where swing appears.

## Notes on what was received

The brief referenced five SVG mockups and four Mermaid drafts. Only two drafts were provided to this build (Forecast Layers, Deal Decision Tree); those were refined. **Layer Migration** and **Planning Principles** were rebuilt from the locked model in the brief (§3.4 and §3.2). If the original drafts or SVGs differ, treat these as faithful reconstructions to reconcile against the source of truth.
