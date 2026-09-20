# [POC] Clinical Trials Pricing Application — Architecture Extract

**Purpose:** reference brief for a UI redesign using Pigment Frames.
**Source:** read-only extraction via the Pigment MCP tools on 2026-09-20. No objects were created, edited or deleted.
**Convention:** every object is given as `Name` (`id`) so Frame bindings are unambiguous.

---

## 1. Application overview

| Field | Value |
|---|---|
| Application id | `7aa30303-07af-4861-a8e7-7bc1e0ea7d13` |
| Application name | `[POC] Clinical Trials Pricing Application` |
| Description | *(empty)* |
| Branding | Ergomed (logo image widgets reference `ergomedgroup.com`); several metrics named after Ergomed (e.g. `Sites for Qualification by Ergomed`) |
| Scenarios | Default scenario only — no metric has multiple formulas (`hasMultipleFormulas: false` on all 185) |
| Cycles | None (`list_cycles` → empty) |
| Frames | **None** (`search_frames` → empty) — this is a greenfield Frames build |

### 1.1 Block count by type

| Type | Count | Note |
|---|---|---|
| Lists (all dimension lists) | **59** | 58 private to this app + 1 shared (`User`, from `Admin App`). **Zero transaction lists.** |
| Metrics | **185** | **89** pure `Formula` (incl. the one `AccessRight` metric), **35** `FormulaWithManualInput` (formula seeds a value, users can override), **61** `ManualInput`. No metric has multiple formulas. |
| Tables | **23** | |
| Boards | **22** | 15 live, 7 parked in a `Not in Use` folder |
| Views | **~275–375** | **75** are bound to board widgets; the remainder (3 pages of up to 100 in `search_views usedInBoards:false`) are orphaned draft/config views |
| Frames | **0** | |

### 1.2 Folder structure

**Block folders** (`content_type: Block`)

| Path | Folder id |
|---|---|
| `/1. Admin and Change Log` | `79815a74-3306-42e6-91f3-0199b4096612` |
| `/2. Base Assumptions` | `cc77ab86-3583-4452-8101-15cee8af576b` |
| `/3. Project Assumptions` | `c9c41fc6-5622-4876-a013-de83c2136ff8` |
| `/3. Project Assumptions/1. Financial` | `7280522a-53f7-48fb-b402-18af30d496f3` |
| `/3. Project Assumptions/2. General` | `30013da7-100a-4325-9643-9586d439e2b2` |
| `/3. Project Assumptions/3. Services Active` | `235f8c9c-5e1c-4435-aaee-0c76d9a794a9` |
| `/3. Project Assumptions/4. Countries / Sites` | `eee568e5-97db-4012-abc1-75f733c6d895` |
| `/3. Project Assumptions/5. Patients` | `acb924a3-348c-4720-8211-4f8b3939fc3d` |
| `/3. Project Assumptions/6. Timeline` | `56d0a7a1-afa3-4803-8c64-a1fa33d1109d` |
| `/3. Project Assumptions/7. Staffing` | `4ad96924-c99b-4891-a1fa-a223b608bff2` |
| `/3. Project Assumptions/8. Outputs for Task Planning` | `ad8e4104-10cb-42e1-b88e-91e5ed8dc4e9` |
| `/4. Global Rates` | `9e6ed1e1-2546-4864-8aaa-8ac63f1b85c2` |
| `/5. Global Tasks` | `8a9a904f-6fdb-483f-a998-92e9170ce3aa` |
| `/5. Global Tasks/1. Tasks` | `1633b747-f64d-42f0-aa1c-daae69087319` |
| `/5. Global Tasks/2. Drivers & Bands` | `388bac08-f05b-40b2-b521-d5002975dbf7` |
| `/5. Global Tasks/3. Task Defaults` | `254c220b-eabe-46d6-a43b-088def4ce12b` |
| `/5. Global Tasks/4. Complexity` | `512ea7d1-3711-4d4e-a104-7da735d8ab2b` |
| `/6. Project Tasks` | `50a4f933-317e-4609-93c1-8ca3e2afcb00` |
| `/6. Project Tasks/Hrs` | `d67d90cb-4eff-4399-98bf-30d5fe20a971` |
| `/6. Project Tasks/Units` | `5c2c4a7b-e89e-48ec-8e8f-35a8540c4752` |
| `/7. Tasks` | `986b310c-761c-4162-97ff-b78527a6bf31` |
| `/7. Tasks/Filters etc` | `4e2d2d52-cb20-49f8-b103-e61d531b846c` |
| `/7. Tasks/Task Complexity` | `388671ae-e24e-4aec-bc10-be016a83f99f` |
| `/7. Tasks/Project Task Management` | `cb07109b-f394-446c-97cf-34587cfb206e` |
| `/7. Tasks/Project Task Management/Table Input` | `d6994312-dbbf-4d3e-97b5-c52be6689104` |
| `/7. Tasks/Project Task Management/Driver Calculations` | `f3f51255-30ca-4ced-9af5-8fb6e89c0197` |
| `/7. Tasks/Project Task Management/Outputs` | `2006f0aa-1167-4cc0-89fd-b104a22a77cf` |
| `/8. Rate Cards` | `5d02cd52-5f96-413f-96ab-2c6a2cb5d589` |
| `/8. Rate Cards/Global Rate Card` | `63a08da7-8875-4dcb-b1d9-b48fceb760fc` |
| `/8. Rate Cards/Project Version Rate Planning` | `0ac3d210-1a4f-430b-9d41-e1a9934a8ac6` |
| `/9. Executive Summary` | `9431f19b-5b9e-4df0-b0b3-22d68ee91413` |
| `/10. Approvers` | `02685119-8ed9-41d1-b136-ff7effdb4d35` |
| `/11. Client Facing Summary` | `9ff77324-1087-4d86-a142-a47c4328eae3` |
| `/11. Client Facing Summary/Summary (Remove Resource)` | `d4a2b3be-2774-4bfb-8770-9a820a8c5561` |
| `/12. Executive Summary` | `a40385e6-3694-4c59-83cf-f598c5044d75` |
| `/13. Resourcing` | `df3f0254-64e0-41cd-bf79-1394d51fa050` |
| `/14. Cashflow` | `2ccbbaf8-f46a-4dde-8d9b-9c4d5fff60d3` |
| `/Calendar` | `1a13f5c2-8799-4a12-919a-49a77de71e11` |
| `/Dimensions` | `b11cff0c-ae39-4027-bd8a-a4646a8b0adf` |
| `/Security` | `846cbddd-743c-4edf-b446-41a1c7db9248` (security folders are excluded from `search_folders`; id recovered from block metadata) |
| *(root)* | `Project Status`, `User`, `L1/Service_FromL2` sit at `/` |

**Board folders** (`content_type: Board`)

| Path | Folder id | Boards |
|---|---|---|
| `/Demo` | `817bdc0c-44f9-4ece-ae47-f855c0405b8b` | 0. INTRO, 0. Summary Overview |
| `/Demo/00 Administration` | `9b8dd691-514f-4efd-a86e-d95c8a654db0` | 1. Master Task Definition, 2. Project & Budget Creation, 3. Central Rates Management, Team Assignment |
| `/Demo/01 Budget Setup` | `3397d657-7f76-4327-93c9-701a7a86a998` | 4. Assumptions, 5. Countries & Sites |
| `/Demo/02 Budget Detail` | `39de5953-f59a-4f31-9db8-06ef93a51dba` | 6. Project Task Estimate, 7. Benchmark Project Budget, 8. Cashflow Profile |
| `/Demo/03 Budget Outputs` | `3fd451a1-604b-4564-a559-64f027c3d3cf` | 00. Executive Summary, 9. Department Review, 10. Client Pricing Summary |
| `/Demo/04 Resourcing` | `51c1ccfd-fa43-42ca-afcb-1318eb89d7a8` | 11. Resource Summary |
| `/Not in Use` | `951c318c-0407-4e66-9a63-fb0feaa785b9` | 2.2 Staffing, 2.3. Global Task Defaults, 2.4. Rates, 3. Budget, 4. Executive Summary, **5. Timeline Planning**, Task Setup |

> ⚠️ `5. Timeline Planning` — one of the eight boards of primary interest — lives in the **`Not in Use`** folder even though `0. INTRO` links to it and it hosts the only editable view of `Milestone - Months`. See §9.

---

## 2. Boards

Navigation order is taken from the card grid on `0. INTRO` (`59b5b677-c2de-4251-9fa4-de6a4e41184a`), which is the application's entry point. `0. Summary Overview` (`7251dc86-ee0b-488b-bb9e-a08dc46c5607`) is a near-duplicate of it.

### Navigation map (from `0. INTRO`)

| Section | Card title | Target board | Target id |
|---|---|---|---|
| Initial Project Assumptions | 1. Project & Budget Creation | 2. Project & Budget Creation | `6f77a0dd-d20c-4cfc-9236-29d7a24ce64b` |
| Initial Project Assumptions | 2. High Level Project Assumptions | 4. Assumptions | `f42e443e-b8dc-4816-b1b6-16a7f65ece29` |
| Initial Project Assumptions | Project Planning Countries, Sites & Patients | 5. Countries & Sites | `4bb0c9f7-c74b-4fd8-9efe-3a21e57214f6` |
| Initial Project Assumptions | Project Timeline & Milestones | 5. Timeline Planning | `fec768c2-910a-4c3a-8a1e-5aada97a1ea1` |
| Resource & Project Budget | Project Task Estimation | 6. Project Task Estimate | `a6a3db2c-94ad-4954-90d3-f8a2e8fc9f2a` |
| Resource & Project Budget | Rate Pricing | 6. Project Task Estimate *(same board)* | `a6a3db2c-…` |
| Resource & Project Budget | Benchmark Estimate against Similar or Example Projects | 7. Benchmark Project Budget | `142a098e-78a5-433a-8324-9f1dfbbbd4f5` |
| Resource & Project Budget | Consider Cashflow & Payment Profiles | 8. Cashflow Profile | `27628853-1ae0-4067-bafb-e383ea305589` |
| Approval & Outputs | Request and Receive Departmental Budget Approvals | 9. Department Review | `671ec7b9-8ee1-4101-92bb-c0ff69d6043d` |
| Approval & Outputs | Executive Summary | 00. Executive Summary | `f9577b65-fce0-4147-8e79-1997187fe9c9` |
| Approval & Outputs | Client Proposal Budget | 10. Client Pricing Summary | `772daa5b-c295-44d8-95e6-3561b3f51b7d` |
| Approval & Outputs | Review Resourcing Needs | 11. Resource Summary | `fa847219-eb3a-45e2-bbed-ebd84808bee7` |
| Administrative Management | Project Budget Setup & Change Log | 2. Project & Budget Creation | `6f77a0dd-…` |
| Administrative Management | Master Task Management by Service | 1. Master Task Definition - Internal Pricing | `551fd117-0ec9-4da5-a23d-93b04e81d478` |
| Administrative Management | Manage Global Rate Card & Cost Rates | 3. Central Rates Management | `0900a49b-de36-4ac0-bc57-dca6b0c5eb2a` |
| Administrative Management | Workflow Management and Assignment of Approvals | Team Assignment | `91b9b3e3-c520-479a-b67b-daf56a137cf0` |

---

### 2.1 `2. Project & Budget Creation` — `6f77a0dd-d20c-4cfc-9236-29d7a24ce64b`

Folder `/Demo/00 Administration`. Description: *"View and create new projects, manage versions and update change log"*. 14 widgets. Page dimensions: **Project** (`7d4aa709-…`, shown), **Project Version** (`5a4f5a85-…`, shown), **Client** (`18b70077-…`, shown), **Version** (`8ed37a6d-…`, hidden). None are single-modality.

| # | Widget id | Type | View id / action | View name | Reads block | Rows / Columns / Pages | Filters |
|---|---|---|---|---|---|---|---|
| 1 | `f2be969b-7ba9-402a-9ce7-c8bb408c1e3e` | Image | — | Ergomed logo (`ergomedgroup.com/.../Ergomed-PLC.svg`) | — | — | — |
| 2 | `0d36ced6-…`, `fbee26d5-…`, `6699b6bf-…` | Text (3, empty) | — | spacers | — | — | — |
| 3 | `7d614878-8050-4b4d-8f76-769334895312` | Text | — | "C R E A T E  N E W  P R O J E C T S" (Purple box) | — | — | — |
| 4 | `1114175d-1008-44f3-829c-03bc5fbd4a73` | **Button** | **Add List Item** | label *Create New Project* → list `Project` (`7d4aa709-b7b1-4cc0-b9cb-2f9cf4de226c`) via view `33ecbff6-…`; `shouldSetPageWithNewItem: true` | — | — | — |
| 5 | `bd4aea63-af9e-4adc-969c-a5ad06520433` | Table (List) | `33ecbff6-b8ea-4a04-a6b2-6f80dcaeaad3` | "Projects" | List `Project` (`7d4aa709-…`) | Rows: Project · Cols: — · Pages: Project, Client | none |
| 6 | `3481c511-3e3d-4fa1-808f-9933a7fa82d4` | Text | — | "C R E A T E  N E W  V E R S I O N S  O F  P R O J E C T  B U D G E T S" | — | — | — |
| 7 | `57f8ceb8-e5e4-4e85-9e5c-43fd5723fb76` | **Button** | **Add List Item** | label *Create New Version* → list `Project Version` (`5a4f5a85-bb30-41b0-8d9b-2f77f1ec87e1`) via view `62ac283d-…`; `shouldSetPageWithNewItem: true` | — | — | — |
| 8 | `aa10fe17-b93b-45d8-879c-1eb77fa02721` | Table (List) | `62ac283d-2312-4540-bd58-e3ab05da3f82` | "Project Version" | List `Project Version` (`5a4f5a85-…`) | Rows: Project Version · Cols: — · Pages: Project, Version, Project Version | none |
| 9 | `2a92d51b-39b2-4a54-bbae-7a0ae58b4683` | Text | — | "M A N A G E  C H A N G E L O G  O F  V E R S I O N S" | — | — | — |
| 10 | `27799873-8dc3-486e-a18a-30c1d9070e6b` | **Button** | **Add List Item** | label *Add to Change Log* → list `Change Log` (`297f4a64-e321-498e-81dc-28c7e7b46adc`) via view `fa9fd6c4-…`; `shouldSetPageWithNewItem: true` | — | — | — |
| 11 | `d9e13f20-ae2a-4384-8d61-d2ab12faba57` | Table (List) | `fa9fd6c4-fb0f-4677-92e3-db727531be3b` | "Version Changelog" | List `Change Log` (`297f4a64-…`) | Rows: Change Log · Cols: — · Pages: Change Log→Project, Change Log→Version | none |
| 12 | `5f8d71ed-486e-414d-9f74-e7426c778ef1` | **Button** | **Navigate To Board** | label *Go to Initial Project Assumptions* → board `4. Assumptions` (`f42e443e-b8dc-4816-b1b6-16a7f65ece29`) in this app | — | — | — |

**View column detail**

- `33ecbff6-…` (Projects): Name, Client, Project Status, Owner, Win Likelyhood shown; `Additional Fixed Attributes` hidden.
- `62ac283d-…` (Project Version): Project - Version, Project, Version, Version Type, Date Initiated, Date Released.
- `fa9fd6c4-…` (Version Changelog): Project Version, Project, Version, Change ID, Date Identified, Change Needed shown; Location, Requested, Approved, Actioned, Date Updated, Additional Notes **hidden**.

---

### 2.2 `4. Assumptions` — `f42e443e-b8dc-4816-b1b6-16a7f65ece29`

Folder `/Demo/01 Budget Setup`. 12 widgets. Page dimensions: **Project** (single-modality, shown), **Project Version** (single-modality, shown), **Region** (`a0199db2-…`, hidden, `adaptivePageDisplayMode: Full`).

| # | Widget id | Type | View id | Title on board | Reads block | Rows / Columns / Pages | Filters |
|---|---|---|---|---|---|---|---|
| 1 | `7edd38c9-…` | Image | — | Ergomed logo | — | — | — |
| 2 | `25a0b635-…`, `82cc3fb6-…`, `2840b413-…` | Text (3, empty) | — | spacers | — | — | — |
| 3 | `f8260d8f-34b4-43a0-9679-3ed400d1f084` | Table | `d1dc841f-775b-4706-8d05-9706ffa6fa19` | "Financial" | Table `.Assumptions - Financial` (`e01ac02e-5cb4-432e-bacb-596da9c32893`) | Rows: — · Cols: — · Pages: PV→Project, Project Version. Metrics in Rows: `Project Complexity`, `Budget Currency`; `Start Date` hidden | none |
| 4 | `6bb9ca0d-a77d-4b23-a6af-637f3b098326` | Table | `d9fcf1a9-2902-4f59-8e55-4d9c4b8c2bc6` | "General" | Table `.Assumptions - General` (`cf9fb249-39b8-4b24-81b0-e5a16a78a69c`) | Rows: — · Cols: — · Pages: PV→Project, Project Version. Metrics in Rows: Sponsor, Sponsor Location, Study Protocol, Protocol Version/Date, Study Drug, Program Phase, Therapeutic Business Unit, Indication, Blinded Study, Unblinded team required?, RFP Version #, RFP Received Date, RFP Type, Start Date | none |
| 5 | `5358e2cd-060a-4069-9a35-c70127c5370b` | Table | `639d713d-df59-4d9b-8918-aa2e6268adec` | "Services & Complexity" | Table `.Assumptions - Service Active` (`900e8347-9b06-4cea-8854-e0ca131ce459`) | Rows: **Service** (`f9870ff9-…`) · Cols: metrics · Pages: PV→Project, Project Version. Metrics: `Service Active`, `Lead Region`, `Service Complexity` | none |
| 6 | `62b387c4-c86a-4034-be7f-b11f5da6471b` | Table | `7bc70ddd-7bf6-4dd3-b716-8593b4f4f5e5` | "Patients" | Table `.Assumptions - Patients` (`f909a229-5944-42e3-85c2-7eab8cad522c`) | Rows: metrics · Cols: **Region** · Pages: PV→Project, Project Version, Region. Metrics: No. Patients Screened, No. Patients Randomized, Screen Failure Rate (%), No. Screen Failures (all Sum) | none |
| 7 | `1e6850eb-e926-48c6-b79d-f58e2d005bd8` | Table | `6dcc055b-45a8-4b6e-8606-161bf9d799d8` | "Countries / Sites" | Table `.Assumptions - Countries / Sites` (`1f700c9b-9e91-4226-aa49-ef1d2eae4fa2`) | Rows: metrics · Cols: **Country→Region** grouping · Pages: PV→Project, Project Version, Country→Region. Metrics: No. of Countries, No. of Back-up Countries, Feasibility Site Outreach, Feasibility Assessment, Sites for Qualification by Ergomed, No. of Active Sites, No. of Back-up Sites, No. Countries for Site Management Support, No. Sites for Site Management Support | none |
| 8 | `516e4b70-c4a9-448f-8345-726cfa9b4bcc` | Table | `73b10847-b5b0-4d4d-91c5-cd2d8a3b3044` | "Timeline" | Table `.Assumptions - Timeline` (`0a23a60b-b9a3-4e54-8a7c-91ea55777ad4`) | Rows: **Task Stage→Milestone Group 1**, **Task Stage→Milestone Group 2**, **Task Stage** · Cols: metrics · Pages: PV→Project, Project Version. Metrics: `Milestone - Months` (as "Months", Sum), `Milestone - From` (as "From", **Min**), `Milestone - To` (as "To", **Max**) | none |
| 9 | `7ebac91e-5a4e-4b26-9ba8-2917daf8f5e2` | Table | `7583519c-e93a-49dc-9e60-5833f006a1ee` | "Timeline Summary" | Metric `Milestone_Period` (`d80aa426-396b-48d3-a2b9-f33609b98ca4`) | Rows: **Task Stage** · Cols: **Month** (`b3c1a1ef-…`) · Pages: PV→Project, Project Version. Value renamed "Project Phases". Sparse: empty rows/cols hidden | none |
| 10 | `81a561af-db7b-4291-8036-914f2de46585` | **Button** | — | **Navigate To Board** — *Country & Site Assumptions* → `5. Countries & Sites` (`4bb0c9f7-c74b-4fd8-9efe-3a21e57214f6`) | — | — | — |

---

### 2.3 `5. Timeline Planning` — `fec768c2-910a-4c3a-8a1e-5aada97a1ea1`

Folder **`/Not in Use`**. 5 widgets. Page dimensions: **Project** (shown), **Project Version** (shown, default fixed to `7598e4ae-144f-4284-ba19-73915d4aeced` = *Project 1 (v1)*).

| # | Widget id | Type | View id | Title on board | Reads block | Rows / Columns / Pages | Filters |
|---|---|---|---|---|---|---|---|
| 1 | `7edd38c9-…` | Image | — | Ergomed logo | — | — | — |
| 2 | `516e4b70-c4a9-448f-8345-726cfa9b4bcc` | Table | `73b10847-b5b0-4d4d-91c5-cd2d8a3b3044` | "Timeline" | Table `.Assumptions - Timeline` (`0a23a60b-…`) | as §2.2 #8 — **this is the input grid for `Milestone - Months`** | none |
| 3 | `590c7f6e-37c4-4b23-bddf-c40b8f54f233` | Text | — | Instructions. Contains a **hyperlink to a different application** — `pigment.app/w/viridian/application/d5972b94-df7a-4417-b43a-9865cc1dee45/boards/8cd1ea81-…` (`[OLD] Clinical Trial Commercial Finance`) labelled "4. Assumptions" | — | — | — |
| 4 | `7ebac91e-5a4e-4b26-9ba8-2917daf8f5e2` | Table | `7583519c-e93a-49dc-9e60-5833f006a1ee` | "Milestone Period" | Metric `Milestone_Period` (`d80aa426-…`) | Rows: Task Stage · Cols: Month · Pages: PV→Project, Project Version | none |
| 5 | `00bcfe33-9e1a-4a4e-903c-69349f6e6437` | Table | `fc9086f8-bb44-4b9b-8d30-3f5f92c1bd6d` | "Periods between Key Milestones (For Resourcing)" | Metric `Milestone_Period_Multi_Stages` (`a154b2a2-07d8-4660-8d86-bc9d519e1eb3`) | Rows: **Dual Timeline Stages** (`eae6291c-…`) · Cols: **Month** · Pages: PV→Project, Project Version | none |

---

### 2.4 `5. Countries & Sites` — `4bb0c9f7-c74b-4fd8-9efe-3a21e57214f6`

Folder `/Demo/01 Budget Setup`. 9 widgets. Page dimensions: **Project**, **Project Version**, **Region** (all shown, none single-modality), **Version** (hidden).

| # | Widget id | Type | View id | Title on board | Reads block | Rows / Columns / Pages | Filters |
|---|---|---|---|---|---|---|---|
| 1 | `a1b30fb0-…` | Image | — | Ergomed logo | — | — | — |
| 2 | `3e52ee4d-…` | Text (empty) | — | spacer | — | — | — |
| 3 | `fba37f27-8128-47f8-b0df-723720e73de0` | **Button** | — | **Navigate To Board** — *Back to Assumptions* → `4. Assumptions` (`f42e443e-…`) | — | — | — |
| 4 | `a6ab5bb8-5296-49e0-9636-ea7eb42a07d3` | Table | `7bc70ddd-7bf6-4dd3-b716-8593b4f4f5e5` | "PROJECT INPUT: Patients" | Table `.Assumptions - Patients` (`f909a229-…`) | Rows: metrics · Cols: Region · Pages: Project, Project Version, Region | none |
| 5 | `d3274d28-4e37-4e10-86f9-5a3baa3a248e` | **Chart** (stacked vertical bar) | `0220b100-55f1-4bb4-a2ab-c3dc057eda89` | "Patients" | Table `.Assumptions - Patients` (`f909a229-…`) | Rows: metrics · Cols: Region · Pages: PV→Version, PV→Project, Project Version, Region. Shown series: `No. Patients Randomized`, `No. Screen Failures` (grey); Screened & Failure-rate hidden | none |
| 6 | `f551b857-34d0-4286-b0dc-2bdf7dfcb0f8` | Table | `635dc0b4-85be-4c65-bb5c-7114b40e27f7` | "PROJECT INPUT: Countries / Sites" | Table `.Assumptions - Countries / Sites` (`1f700c9b-…`) | Rows: **Country→Region**, **Country→Sub Region**, **Country** · Cols: metrics · Pages: PV→Version, PV→Project, Project Version, Country→Region. Metrics: No. of Active Sites, Monitors, No. of Back-up Sites, Patient Split | **1 filter**: Country `IsNotIn` modality `6d6382fb-70a5-4b5a-b6b9-b76c4231b0de` (a single excluded country) |
| 7 | `e9788c08-12e1-4d9b-b070-a4431c031ad4` | Table | `6dcc055b-45a8-4b6e-8606-161bf9d799d8` | "Calculation: Countries / Sites Summary" | Table `.Assumptions - Countries / Sites` | as §2.2 #7 | none |
| 8 | `5511393f-20c4-4bd7-8922-c7dda3d99502` | **Chart** (donut pie) | `4656dfc0-bb96-4660-8a2d-97e50b1d925b` | "Countries" | Table `.Assumptions - Countries / Sites` | Rows: Country→Region · Cols: Project Version · Pages: PV→Version, PV→Project, Project Version, Country→Region. Only `No. of Countries` shown | none |
| 9 | `881ed553-e0aa-4b56-a188-19711a4d213f` | **Chart** (donut pie) | `f263639e-61d0-4c92-b35b-5f700f2cd292` | "Active Sites" | Table `.Assumptions - Countries / Sites` | same layout; only `No. of Active Sites` shown | none |

---

### 2.5 `6. Project Task Estimate` — `a6a3db2c-94ad-4954-90d3-f8a2e8fc9f2a`

Folder `/Demo/02 Budget Detail`. **Full-width board.** 10 widgets. Page dimensions: **Project Version** (single-modality, `adaptivePageDisplayMode: Full`), **Service**, **L2**, **L1**, **Responsible Role** (shown); **Region**, **Task Defintion**, **Option Price** (hidden).

| # | Widget id | Type | View id / action | Title on board | Reads block | Rows / Columns / Pages | Filters |
|---|---|---|---|---|---|---|---|
| 1 | `0d13ee56-1863-40f1-830d-f14875d36fa3` | **Button** | **Add List Item** | *Add Non-Standard Task* → list `Task Defintion` (`7c1475b1-17c2-434b-8059-6ee0dc197503`) via view `860812cb-…`; sets page to new item | — | — | — |
| 2 | `042726e7-cab5-4f2d-9b4f-a3ced4b859b4` | **Button** | **Add List Item** | *Add New Option Price* → list `Option Price` (`7f76b001-5b50-4d71-b1e3-bf37e2697095`) via view `42e4af8d-…`; sets page to new item | — | — | — |
| 3 | `9c9fafb2-c3b2-414c-a2b8-2f43c4318364` | Table | `c4142647-9e9c-4772-879b-a19eae0eb139` | "Project Task Definition" — **the main estimating grid** | Table `Project Task Manaement` (`2445768a-fa0d-4760-9661-7c9bdacee629`) | Rows: **Task Defintion→L1 Task**, **→L2 Task**, **Task Defintion**, **Responsible Role** · Cols: **Region** + metrics · Pages: Project Version, TD→Associated Service, TD→L2 Task, TD→L1 Task, Responsible Role. Metrics shown: Adjust Responsible Role, Task Phase, Task Lead/All_Region ("Location"), In Country Resource ("Manage Resource by Country?"), Task Driver, Custom Driver, Task Workload Frequency, Unit of Measure, Unit→Hours Input, Task Complexity v2 ("Complexity"), Task Unit Input ("Hours Per / No Units"), Display Measurement, Country Driver Data Aggregated_Hours_Adjustment ("Total Units"), Workload Duration Period, Total Hours Estimate before role allocation, Task - Option Price ("Add to Option"), Comments. Hidden: Workload Relevant Region, Units Input Needed, Custom Driver Input | none (sparse: empty rows hidden) |
| 4 | `276194cd-…` | Text | — | "R E V I E W  T O T A L  B U D G E T" | — | — | — |
| 5 | `da6beea2-62f7-4b41-a7db-c99ab156fbb1` | Table | `e56f52e8-41a4-42da-8225-6d36edca115e` | "Budget Summary Hours & Price" (Internal Summary) | Table `Rate Card Planning - Project Version` (`add833fb-77c5-4001-bb01-ab939df8c479`) | Rows: **Option Price**, TD→Associated Service, TD→L1 Task, TD→L2 Task, **Task Defintion** · Cols: metrics · Pages: Project Version, Region, TD→L2, TD→L1. Metrics: Hours Estimate (`5c4f4232`), Price (`61bc84a1`), Avg Rate Per Task (`b835e2b3`, **Avg**); Project Rate Card hidden | none |
| 6 | `1f973076-dd15-4665-a4ad-4bc5beba3528` | **Chart** (grouped vertical bar) | `fb4b9e13-e1a4-4365-9979-2abad5836dba` | "Total Budget Price by Department" | Metric `Price (with Tasks)` (`61bc84a1-…`) | Rows: **Task Defintion→L1 Task** · Cols: — · Pages: Project Version, Task Defintion, Region, Responsible Role, Option Price | none |
| 7 | `af0e2a6a-…` | Text | — | "M A N A G E  R A T E S" | — | — | — |
| 8 | `06e117c3-1307-40d8-b6ce-faa8587d0f1a` | Table | `7bc08875-666f-4f53-b5a4-5fb011018567` | "Budget Summary Hours & Price" | Table `Rate Card Planning - Project Version` (`add833fb-…`) | Rows: **Option Price**, **Responsible Role→Service**, **Responsible Role** · Cols: **Region** + metrics · Pages: Project Version. Metrics: Hours Estimate, Project Rate Card (`2fdc13ff`, **editable**), Price | none |
| 9 | `5070f8dd-c73b-424e-b81d-2735395b2f72` | Table | `894b280a-ddcf-449a-a54c-2d86f499fc0e` | "Rate Adjustment by Service" | Metric `Change_By_Service` (`622be1c6-0fd3-44be-937d-d54c56b292c1`) | Rows: **Service** · Cols: — · Pages: Project Version. Value renamed "Rate Change" | none |
| 10 | `ded131c0-0029-478b-ac39-e28f114dc5a8` | **Button** | — | **Navigate To Board** — *Go to Benchmark Project Budget* → `7. Benchmark Project Budget` (`142a098e-…`) | — | — | — |

---

### 2.6 `7. Benchmark Project Budget` — `142a098e-78a5-433a-8324-9f1dfbbbd4f5`

Folder `/Demo/02 Budget Detail`. 6 widgets. Page dimensions: **Responsible Role**, **Region**, **L2**, **L1**, **Project Version** shown; **Task Defintion**, **Option Price**, **Country**, **Version**, **Project**, **Task Stage**, **Month** hidden.

> **The benchmark comparison is driven entirely by the board's `Project Version` page**, which is *not* single-modality and carries two fixed default modalities:
> `35c14df9-f384-4652-8df4-015721651eb4` = **Example X-Region 500 Patient Study (v1)** and
> `43799143-4b0c-48f9-9f09-4240ee2260ca` = **Project 4 (v1)**.
> Every widget on the board puts `Project Version` on the Columns axis, so the two selected versions appear side by side. There is no "benchmark" metric, filter or flag — selection is a page setting.

| # | Widget id | Type | View id | Title on board | Reads block | Rows / Columns / Pages | Filters |
|---|---|---|---|---|---|---|---|
| 1 | `16efe834-190c-474e-a470-ca9975ba19ed` | **Chart** (Waterfall, "Variation") | `965a842b-01c9-4877-ac1c-ba9377328c85` | "Total Hours Estimate Region for Pricing Mapped to Options" | Metric `Total Hours Estimate Region for Pricing Mapped to Options` (`5c4f4232-a9b8-4e53-ab71-835b6305c478`) | Rows: **TD→L1 Task** · Cols: **Project Version** · Pages: Responsible Role, Region, TD→L2, TD→L1, Task Defintion, Option Price, Project Version | none |
| 2 | `5c215f54-dcfd-4c07-b094-81db20ec98e2` | **KPI** | `e7c19ddb-0426-4126-bd98-308ddaad6138` | "No. of Active Sites" | Metric `No. of Active Sites` (`4aa8bcad-…`) | Cols: Project Version · Pages: Country, Project Version. KPI: SingleLine / Vertical / Scroll | none |
| 3 | `9a91caca-ef01-45ae-8eb3-6b67cb95a94a` | **KPI** | `ccacb4aa-7e23-4a34-a544-d63a67967163` | "Timeline Duration" | Metric `Milestone_Period` (`d80aa426-…`), renamed "Phases" | Cols: Project Version · Pages: PV→Version, PV→Project, Task Stage, Month, Project Version | none |
| 4 | `daa12691-1a05-4661-8f80-a09125fcf7d1` | **KPI** | `2a5022bc-9b04-4d8c-b02e-7e8b462f984b` | "No. Patients Randomized" | Metric `No. Patients Randomized` (`03aefd75-…`) | Cols: Project Version · Pages: Project Version, Region | none |
| 5 | `c5247039-a5ed-4e69-9261-7b096c05d3df` | **Chart** (Step line, area) | `196ecf33-b6c3-43fe-bec7-1aa7315a396f` | "Total FTEs Estimate Study Phases" | Metric `Total FTEs Estimate Study Phases` (`bd3db3bc-92d6-4f37-8432-23f75a8d0e9c`) | Rows: **Project Version** · Cols: **Month** · Pages: Responsible Role, Country, Task Stage, TD→L2, TD→L1, Task Defintion, Project Version | none |
| 6 | `88c4c0f6-e98d-476a-ba2c-7a7c1c897061` | **Button** | — | **Navigate To Board** — *Review Cashflow Profile* → `8. Cashflow Profile` (`27628853-…`) | — | — | — |

---

### 2.7 `8. Cashflow Profile` — `27628853-1ae0-4067-bafb-e383ea305589`

Folder `/Demo/02 Budget Detail`. 6 widgets. **Only one page dimension: `Project Version`, and it is NOT single-modality** — so the user can select several versions, or "All", and every figure on the board sums across them.

| # | Widget id | Type | View id | Title on board | Reads block | Rows / Columns / Pages | Filters |
|---|---|---|---|---|---|---|---|
| 1 | `ce34d23c-c7df-4d00-ae6f-fb8a02b05556` | Table | `d8d8dfd9-825e-47c4-972b-c319538ff736` | "Cashflow Assumptions" | Table `[TBL] Cashflow Assumptions` (`2514bffa-6ec6-4f96-8081-be0343505455`) | Rows: metrics · Cols: — · Pages: Project Version. Metrics: `Project_Billing_Type` ("Billing Type"), `Payment Terms` ("Payment Terms (Days)") — both editable | none |
| 2 | `300eaac1-fe63-4721-b98d-7cbe379c6980` | Table | `fd51bda3-aaca-44d4-b364-407ae6ff80d0` | "Milestone Schedule" | Table `[TBL] Milestone Schedule` (`a66b7684-c0ab-43ba-8c69-7393d184f800`) | Rows: **Task Stage** (Sum aggregation on both numeric values) · Cols: metrics · Pages: Project Version. Metrics: `Milestone Payments` (`7813a1b0`, editable), `Milestone Amount` (`361a6727`), `Milestone_Acheivement` ("Milestone Achievement", `d274cd5b`) | none |
| 3 | `75edfa12-4481-4cf6-87fa-ce0870dd673b` | **KPI** | `6e4fd484-c7e5-438d-a827-c7c245497721` | "Peak Cash Drawdown" | Metric `Peak_Cash_Position` (`99d5f206-15f9-4864-b1bf-5fd56663cb87`) | Pages: Project Version | none |
| 4 | `053f8bcd-d1c7-4df4-9fd8-2065405a75e7` | **Chart** (Combined bar + dotted line) | `55be5e8a-1ebb-4a86-8558-4c9b75ff0364` | "Cumulative Cashflow & Earnt Revenue Summary" | Table `[TBL] Cashflow Summary` (`ec2e3300-8e25-454c-9cb4-3e5cfff890c6`) | Rows: metrics · Cols: **Month** · Pages: Project Version. Series (all **Cumulative** over Month): `Cash Receipts`; `Cash Receipts` renamed **"Cash Position"** shown as *Difference from another metric* vs `Phased Cost`; `Phased Cost` renamed **"Cash Payments"**; `Phased Earnt Revenue`. `Month_Filter_Cashflow` hidden | **1 filter**: `Month_Filter_Cashflow` (`0ab55441-…`) = true on the Month axis |
| 5 | `dd1dc784-1b41-47b1-bffd-2f680ea50090` | Text | — | "R E Q U E S T  D E P A R T M E N T A L  A P P R O V A L S" | — | — | — |
| 6 | `89951158-8b3b-4493-a960-f6410506447d` | Table | `ed66d343-0482-490c-b361-b738fdf20774` | "Request Budget Approvals?" | Metric `Request_Approvals` (`4ffc43a6-803a-4636-8ad3-db42e732d5cc`), renamed "Request Approvals?" | Pages: Project Version. Boolean input | none |

---

### 2.8 `00. Executive Summary` — `f9577b65-fce0-4147-8e79-1997187fe9c9`

Folder `/Demo/03 Budget Outputs`. 16 widgets. Page dimensions: **Project Version** (single-modality, shown); Region, Responsible Role, L1, Task Defintion, Option Price, Project, Country, Version all hidden.

| # | Widget id | Type | View id | Title on board | Reads block | Rows / Columns / Pages | Filters |
|---|---|---|---|---|---|---|---|
| 1 | `05775266-…` | Text | — | "K E Y  S T U D Y  I N F O R M A T I O N" | — | — | — |
| 2 | `ae992c8b-3070-489d-907f-89dcecb5ecdd` | **KPI** | `4894d346-699c-4b00-ab65-b89c06b6adf6` | Sponsor (title hidden) | Metric `Sponsor` (`a2c78072-…`) | Pages: Project Version | none |
| 3 | `cd0c6a72-9ba2-4994-8373-bf392d582a25` | **KPI** | `f7be3679-4027-4d4f-b959-100506e03b2e` | Indication | Metric `Indication` (`50eebb30-…`) | Pages: Project Version | none |
| 4 | `6139697b-fa18-4c06-ab17-f64a8d2d90f0` | **KPI** | `34dcb839-3b07-47e5-8479-dbdbfa38a907` | Program Phase text | Metric `Program Phase text` (`165945f9-…`) | Pages: Project Version | none |
| 5 | `a81663be-cec8-4311-9a36-87cb4b321bf0` | **KPI** | `5b84c6d4-9d2e-47d4-bfaf-11c341dda10e` | No. Patients Randomized | Metric `No. Patients Randomized` (`03aefd75-…`) | Pages: Project Version, Region | none |
| 6 | `7fd9b9d1-ea15-4b1e-a7ee-06800b351cae` | **KPI** | `592c49b4-7ae5-46dd-a93e-8795a425ae76` | No. of Active Sites | Metric `No. of Active Sites` (`4aa8bcad-…`) | Pages: Country, Project Version | none |
| 7 | `4eeb7f76-d14e-4055-b81e-8f38b7b8daac` | Table | `dc0e43b3-8eb2-4f0d-b792-53235e169864` | "Services Summary" | Table `Exec Summary` (`3b98a145-dc61-4ca3-a156-c01a463467f9`) | Rows: metrics · Cols: **Project Version** · Pages: PV→Version, PV→Project, Project Version. Metrics: `Services Included`, `Services Excluded` | none |
| 8 | `429d36f6-5424-4588-9f49-f68873fbb399` | **KPI** | `77db93b7-2a2d-464a-ba3f-d5a4dce18b44` | "Current Project Status" | Metric `Current Project Status` (`d9d4643b-…`) | Pages: Project Version | none |
| 9 | `774523fd-…` | Text | — | "T I M E L I N E  S U M M A R Y" | — | — | — |
| 10 | `b11301e0-fc91-4390-90b7-915cb5786218` | Table | `7583519c-e93a-49dc-9e60-5833f006a1ee` | "Project Timeline" | Metric `Milestone_Period` (`d80aa426-…`) | Rows: Task Stage · Cols: Month · Pages: PV→Project, Project Version. 12 conditional-format rules paint the Gantt | none |
| 11 | `84494109-0313-492f-a891-696c214364c8` | **KPI** (MultiLine / Horizontal) | `9cbf665f-6ab4-45c0-b17c-81fdaa4e5148` | "Budget Preparer Submission Notes" | Metric `Preparer Submission Notes` (`a5afdf43-…`) | Pages: Project Version. **Free-text input rendered as a KPI** | none |
| 12 | `2ff4a6a1-…` | Text | — | "S U M M A R Y  B U D G E T" | — | — | — |
| 13 | `f04dacf3-0487-4044-8b16-e5a9991011dc` | Table | `20a39aff-4a61-42d3-a622-ebdd1fa19b20` | **"Summary Budget"** | Table `[TBL] Executive Summary` (`450bebed-6e91-48cf-8104-27c7ebc0d99f`) | Rows: **Task Defintion→L1 Task** · Cols: metrics · Pages: Region, Responsible Role, TD→L1 Task, Task Defintion, Project Version, **Option Price**. Metrics: `Price (with Tasks)` as **"Budget"**, `Cost (with Tasks)` as "Cost", `Net Margin`, `Net Margin` again as **"Net Margin %"** (shown-value-as % of Budget), `% of Budget` | none |
| 14 | `cd0f95ca-…` | Text | — | "A P P R O V A L  S U M M A R Y" | — | — | — |
| 15 | `7c493ee9-a6f6-4907-803e-d82c30670529` | Table | `834ba283-895b-4e68-be7a-74ac5a2eadf2` | "Approval Summary" | Table `[TBL] Approval Summary` (`a071e66b-c9f6-411a-813c-f49ef349cc16`) | Rows: **L1** · Cols: metrics · Pages: Project Version. Metrics: `Status_Approvals`, `Approver`, `Date Approved_Display` ("Date Approved"), `Approval Comments No User` ("Approval Comments") | none (sparse: empty rows hidden) |
| 16 | `d1e3af84-…` | Text | — | "C A S H F L O W & E A R N T  R E V E N U E  S U M M A R Y" | — | — | — |
| 17 | `2b815b4a-1115-4490-bcb1-6cd7556e738d` | **Chart** (Combined) | `55be5e8a-1ebb-4a86-8558-4c9b75ff0364` | "Cashflow & Earnt Revenue Summary" | Table `[TBL] Cashflow Summary` (`ec2e3300-…`) | Identical view to the Cashflow Profile chart (§2.7 #4) — **same view id, so the two boards share formatting and any edit to one changes the other** | `Month_Filter_Cashflow` = true |

> Note: this board has **no navigation or action buttons** — it is a terminal read-only page.

---

### 2.9 Other boards (name + widget count)

| Board | Id | Folder | Widgets | One-line purpose |
|---|---|---|---|---|
| `0. INTRO` | `59b5b677-c2de-4251-9fa4-de6a4e41184a` | /Demo | 20 (16 nav cards + 4 text) | Landing page / navigation |
| `0. Summary Overview` | `7251dc86-ee0b-488b-bb9e-a08dc46c5607` | /Demo | 21 (16 nav cards, 2 images, 4 text — one card mis-targets `3. Central Rates Management` for "Workflow Management") | Alternate landing page (duplicate of INTRO) |
| `1. Master Task Definition - Internal Pricing` | `551fd117-0ec9-4da5-a23d-93b04e81d478` | /Demo/00 Administration | 3 | Global task library (`Task Defintion` list view `860812cb-…` + `Task Complexity - Standard` grid `1d949074-…`) + **Add List Item** button → `Task Defintion` |
| `3. Central Rates Management` | `0900a49b-de36-4ac0-bc57-dca6b0c5eb2a` | /Demo/00 Administration | 2 | Global sell/cost rate card (`d27a3dde-…`) and the all-currency derivation (`e7fe6b93-…`) |
| `Team Assignment` | `91b9b3e3-c520-479a-b67b-daf56a137cf0` | /Demo/00 Administration | 2 | `Team` list (`81874e03-…`) — maps approver name → email → L1 department |
| `9. Department Review` | `671ec7b9-8ee1-4101-92bb-c0ff69d6043d` | /Demo/03 Budget Outputs | 15 | Approver's working board — reuses the Exec Summary KPIs and Summary Budget, adds resourcing charts and the `[TBL] Approvals` input grid (`50cf53c2-…`). L1 page defaults to `9ec02723` = *2 MEDICAL WRITING*; Project Version page defaults to `43799143` = *Project 4 (v1)* |
| `10. Client Pricing Summary` | `772daa5b-c295-44d8-95e6-3561b3f51b7d` | /Demo/03 Budget Outputs | 1 | Client-facing price list (`499a2ca2-…` over `[TBL] Client Summary`) |
| `11. Resource Summary` | `fa847219-eb3a-45e2-bbed-ebd84808bee7` | /Demo/04 Resourcing | 7 | Four FTE curve charts (total / regional / in-country / role-based) + 3 headers |
| `2.2 Staffing` | `fb2071fb-95df-4982-b79a-bd7e09c4246c` | /Not in Use | 7 | Role↔service↔region matrices and staffing driver values |
| `2.3. Global Task Defaults` | `a9585517-71dd-4fd0-8468-959aef1f0ebd` | /Not in Use | 8 | Legacy `Task`-based defaults, driver bands, task-stage spans |
| `2.4. Rates` | `d4fa0b46-09e4-4c21-8cad-06798aa02fc0` | /Not in Use | 1 | Legacy `Global Base Rates (EUR)` grid |
| `3. Budget` | `347dc825-e6fa-4f93-ae91-35fecb1d8b07` | /Not in Use | 4 | Legacy `Task`/`Unit`-based budget engine (superseded by `Task Defintion`) |
| `4. Executive Summary` | `f724d5be-477f-4c50-bcfc-55284f9cff2d` | /Not in Use | 6 | Earlier exec summary |
| `Task Setup` | `8efa68d3-472d-486f-92af-678964477824` | /Not in Use | 2 | Legacy `Task` list + responsible-person matrix |

---

## 3. Lists

**All 59 lists are dimension lists. There are no transaction lists in this application.** Only three lists have user-facing "add item" buttons: `Project`, `Project Version`, `Change Log` (all on board `2. Project & Budget Creation`), plus `Task Defintion` and `Option Price` (on `6. Project Task Estimate`) and `Task Defintion` again (on `1. Master Task Definition`). Everything else is maintained by a modeller/admin directly in the block.

### 3.1 List inventory

| List | Id | Folder | Type | Items | Users add? |
|---|---|---|---|---|---|
| `Project` | `7d4aa709-b7b1-4cc0-b9cb-2f9cf4de226c` | /1. Admin and Change Log | Dimension | 8 | ✅ button on board `6f77a0dd` |
| `Project Version` | `5a4f5a85-bb30-41b0-8d9b-2f77f1ec87e1` | /1. Admin and Change Log | Dimension | 8 | ✅ button on board `6f77a0dd` |
| `Version` | `8ed37a6d-7a3b-4095-bc72-31efe2c5df9e` | /1. Admin and Change Log | Dimension | 13 | ❌ |
| `Version Type` | `390c55f2-db28-444a-b604-f976ebf2ec98` | /1. Admin and Change Log | Dimension | 2 | ❌ |
| `Change Log` | `297f4a64-e321-498e-81dc-28c7e7b46adc` | /1. Admin and Change Log | Dimension | 5 | ✅ button on board `6f77a0dd` |
| `Client` | `18b70077-5067-4709-9202-89a4128dbbb9` | /Dimensions | Dimension | 7 | ❌ |
| `Project Status` | `6f129e98-54cb-419d-a6e7-6cc7dcd2d3e0` | / (root) | Dimension | 4 | ❌ |
| `Team` | `afd180be-9311-4b4b-bff4-24b1a2709830` | /10. Approvers | Dimension | 9 | ❌ (edited in place on `Team Assignment`) |
| `User` | `5840daf8-09ce-4821-a51f-e5059f123e4e` | / (root) | Dimension — **shared from `Admin App` (`c7b7a99b-541e-460a-a9ad-b6aa20908180`)** | 31 | ❌ (system-managed) |
| `Role` | `7596b18b-5a40-4eac-94ec-a65f6169cedc` | /Security | Dimension | 5 | ❌ |
| `Approval_Status` | `8f5deda6-c772-4a9a-b8f3-b9ce4ce320a8` | /Dimensions | Dimension | 3 | ❌ |
| `Service` | `f9870ff9-ae89-4c5d-83b6-51a7ff477cfe` | /3. Project Assumptions/7. Staffing | Dimension | 26 | ❌ |
| `Service Group` | `05e17177-ad00-4b64-bb44-fc13a28d02a7` | /3. Project Assumptions/7. Staffing | Dimension | 1 | ❌ |
| `Responsible Role` | `fb686b30-8f48-4ef5-b9fe-817dc470939c` | /3. Project Assumptions/7. Staffing | Dimension | 27 | ❌ |
| `Staffing Driver` | `2e0c2b33-1967-473b-b1a0-3f33dafb02f5` | /3. Project Assumptions/7. Staffing | Dimension | 8 | ❌ |
| `Region Link` | `825fe8f7-818f-4af0-aaf4-6e509aca98eb` | /3. Project Assumptions/7. Staffing | Dimension | 2 | ❌ |
| `Region` | `a0199db2-dcc4-43b6-9b2c-61fe88191e1a` | /3. …/4. Countries / Sites | Dimension | 3 | ❌ |
| `Sub Region` | `7b2fc5a3-3961-4a2d-9d76-2fcb6a1add6a` | /3. …/4. Countries / Sites | Dimension | 6 | ❌ |
| `Country` | `85c42032-dcde-4349-b681-e0926937d8d1` | /3. …/4. Countries / Sites | Dimension | 46 | ❌ |
| `Region Top Level Group` | `71bc870f-ae4e-40dc-9ecd-679e3960cfc9` | /3. …/4. Countries / Sites | Dimension | 1 | ❌ |
| `Task Stage` | `26c7a9f4-45e5-428f-9e01-2e8d758c36b5` | /3. …/6. Timeline | Dimension | 8 | ❌ |
| `Task Stage Span` | `6db8054c-95bf-476b-a2b8-6f668caeadfe` | /3. …/6. Timeline | Dimension | 14 | ❌ |
| `Dual Timeline Stages` | `eae6291c-cb6b-42b7-987c-d44cdee3a07d` | /3. …/6. Timeline | Dimension | 10 | ❌ |
| `Milestone Group 1` | `c179deec-82d8-48a2-bde8-d6149fee97da` | /3. …/6. Timeline | Dimension | 1 (`Total Study Duration`) | ❌ |
| `Milestone Group 2` | `a085545f-fa24-4c7f-83ba-726015664f5c` | /3. …/6. Timeline | Dimension | 1 (`Study Finalisation`) | ❌ |
| `Currency` | `3d713145-0367-481b-854f-d29275f1ebfb` | /3. …/1. Financial | Dimension | 3 | ❌ |
| `Complexity Type` | `5afd2ac4-1670-4efa-b100-f72e4fdd9200` | /3. …/1. Financial | Dimension | 4 | ❌ |
| `Complexity Level` | `449d4e3a-11b5-4a35-b5d1-a712500af4e7` | /3. …/3. Services Active | Dimension | 3 | ❌ |
| `RFP` | `7829f5d6-bf71-48e0-a7a5-f0863b1589ea` | /3. …/2. General | Dimension | 3 | ❌ |
| `Study Phase` | `ad016aed-8fc0-4eec-b88d-7b80c4f22777` | /3. …/2. General | Dimension | 10 | ❌ |
| `Therapeutic Business Unit` | `92099e9e-8602-4f4b-b499-228ca0e90b37` | /3. …/2. General | Dimension | 3 | ❌ |
| `L1` | `05fba1a3-317a-4da5-b93f-950a8ae16c83` | /5. Global Tasks/1. Tasks | Dimension | 11 | ❌ |
| `L2` | `902379cd-08d8-4a97-8e7f-2330c7c89487` | /5. Global Tasks/1. Tasks | Dimension | 33 | ❌ |
| `Task` | `a7a22332-5595-41d1-8775-34f5cdbfa987` | /5. Global Tasks/1. Tasks | Dimension | 15 | ❌ (legacy) |
| `Task Defintion` *(sic — misspelt)* | `7c1475b1-17c2-434b-8059-6ee0dc197503` | /7. Tasks | Dimension | 34 | ✅ buttons on boards `551fd117` and `a6a3db2c` |
| `Task Hrs Driver` | `70e884f9-509e-43f5-8e25-c7a5003f2981` | /5. Global Tasks/2. Drivers & Bands | Dimension | 26 | ❌ |
| `Task Driver Banding` | `7288d014-3a9b-44b6-be7c-4c27f87f5bcc` | /5. Global Tasks/2. Drivers & Bands | Dimension | 2 | ❌ |
| `Band` | `0c61627f-573b-4b49-ba27-d54fd48136a5` | /5. Global Tasks/2. Drivers & Bands | Dimension | 3 | ❌ |
| `Driver Type` | `bd2689d2-45bb-4c2a-832a-4e2cfc03c6a8` | /Dimensions | Dimension | 3 | ❌ |
| `Core Driver` | `68c2af3d-06a2-44b5-8976-d830b2d838f7` | /Dimensions | Dimension | 11 | ❌ |
| `Workload Frequency` | `afe059f6-d8e1-487b-b839-1749aa5bb056` | /Dimensions | Dimension | 6 | ❌ |
| `Hours/Unit` | `8f2d406d-6d8a-4aae-b977-24eb3ea2b201` | /Dimensions | Dimension | 2 | ❌ |
| `Unit` | `52578503-e8b7-4838-8dca-411a7064563c` | /6. Project Tasks/Units | Dimension | 16 | ❌ |
| `Region Workload` | `555eea47-3ce6-4787-b361-689feb311ea6` | /Dimensions | Dimension | 2 | ❌ |
| `Task/Phase Options` | `91cca3c4-ac60-487f-8d0d-1c736f24c8c5` | /Dimensions | Dimension | 19 | ❌ |
| `Option Price` | `7f76b001-5b50-4d71-b1e3-bf37e2697095` | /Dimensions | Dimension | 2 | ✅ button on board `a6a3db2c` |
| `Y/N` | `ca892786-26d3-4c85-a3d2-88b7f603ba81` | /Dimensions | Dimension | 2 | ❌ |
| `Before/After` | `82fe1a56-3a54-4885-8e7f-cb8d9667a585` | /Dimensions | Dimension | 2 | ❌ (unused) |
| `Template` | `958e7126-c8e5-4422-8302-47c3958d9919` | /Dimensions | Dimension | 1 | ❌ (unused) |
| `Billing_Type` | `f1456043-74c5-42d8-a14a-86714c5c3b45` | /14. Cashflow | Dimension | 2 | ❌ |
| `Client Facing Unit Type` | `0ab4adc0-5890-4016-8014-09a0b6c8c561` | /11. Client Facing Summary | Dimension | 5 | ❌ |
| `L1 - Client Facing` | `e07e4534-3600-4f19-9214-3266bb0f3105` | /11. Client Facing Summary | Dimension | 3 | ❌ |
| `L2 - Client Facing` | `4b65bfa2-3080-4824-8647-8308f6ff8e52` | /11. Client Facing Summary | Dimension | 21 | ❌ |
| `Client Facing Task Definition` | `784ff596-e063-43e5-aeb6-6a4948b4f803` | /11. Client Facing Summary | Dimension | 96 | ❌ (not bound to any board) |
| `Year` | `45526965-0603-41b2-81b0-09b7fd69e5ed` | /Calendar | **Time dimension** | 17 | ❌ |
| `Quarter` | `6c99a292-fbfa-4045-a7ad-dc60aeb3c4c7` | /Calendar | **Time dimension** | 68 | ❌ |
| `Month` | `b3c1a1ef-3cd6-4c9c-a036-9231a79f339d` | /Calendar | **Time dimension** | 204 (17 yrs × 12) | ❌ |
| `Month of Year` | `91eadcb5-69b2-44ea-adad-ed6f8ba819cd` | /Calendar | Dimension | 12 | ❌ |
| `Quarter of Year` | `aebf39ad-9ebd-41e0-8c7d-7e16004119fa` | /Calendar | Dimension | 4 | ❌ |

> **Time granularity:** the calendar is `Year → Quarter → Month`. **Every time-phased metric in this model is dimensioned by `Month`** — there are no week or day metrics. 204 monthly periods gives roughly a 17-year horizon.

### 3.2 Specifically confirmed structures

#### `Project` — `7d4aa709-b7b1-4cc0-b9cb-2f9cf4de226c` (8 items)

| Property | Data type | Points at | Input / formula | Key? |
|---|---|---|---|---|
| `Name` | Text | — | Input | display property |
| `Client` | Dimension | `Client` (`18b70077-…`) | Input | no |
| `Owner` | Dimension | **`Team` (`afd180be-…`)** — *not* the `User` list | Input | no |
| `Project Status` | Dimension | `Project Status` (`6f129e98-…`) | Input | no |
| `Additional Fixed Attributes` | Text | — | Input (hidden in the default view) | no |
| `Win Likelyhood` *(sic)* | Decimal | — | **Formula**: `'Win Likelyhood' [BY: Project.'Project Status']` — looks the probability up from the status-level metric | no |

Items: `Project 1` (`e9f95a8c-…`, Client A, Owner Marijana Prodan, Won, 100%), `Project 2` (`55e70e69-…`, Client B, Rachael Selman, RFP, 50%), `Project 3` (`dd18600d-…`, Client C, Rachael Selman, Probable, 90%), `Project 4` (`25f3fdb4-…`, Client D, Maria Menard-Zouhair, RFP, 50%), **`Example X-Region 500 Patient Study`** (`6fc65543-…`, Client `Example`, Rachael Selman, **Template**, 0%), `Project 5` (`2731e9eb-…`, Client E, Sharon Fletcher, RFP, 50%), `Project 6` (`0a6ebd53-…`, Client C, Maria Menard-Zouhair, RFP, 50%), `Project 7` (`3af3c594-…`, Client F, Sharon Fletcher, RFP, 50%).

#### `Project Version` — `5a4f5a85-bb30-41b0-8d9b-2f77f1ec87e1` (8 items) — **the spine of the model**

| Property | Data type | Points at | Input / formula | Key? |
|---|---|---|---|---|
| `Project - Version` | Text | — | **Formula**: `'Project Version'.Project.Name & " (" & 'Project Version'.Version.Name & ")"` — this is the display property | display |
| `Project` | Dimension | `Project` | Input | part of the logical key |
| `Version` | Dimension | `Version` | Input | part of the logical key |
| `Version Type` | Dimension | `Version Type` (`390c55f2-…`) | Input | no |
| `Date Initiated` | Date | — | Input | no |
| `Date Released` | Date | — | Input | no |

> There is **no uniqueness constraint** on (Project, Version) — nothing stops two rows with the same pair.

| Item | Modality id | Project | Version | Version Type | Date Initiated | Date Released |
|---|---|---|---|---|---|---|
| Project 1 (v1) | `7598e4ae-144f-4284-ba19-73915d4aeced` | Project 1 | v1 | **Superseded** | — | — |
| Project 2 (v1) | `f7dde838-4a35-4fad-847d-b0d9b0d54041` | Project 2 | v1 | Current | 2024-10-15 | — |
| Project 1 (v2) | `c0dc6935-a860-4485-ac12-6073ecf486ce` | Project 1 | v2 | Current | — | — |
| Project 4 (v1) | `43799143-4b0c-48f9-9f09-4240ee2260ca` | Project 4 | v1 | Current | 2024-11-14 | — |
| **Example X-Region 500 Patient Study (v1)** | `35c14df9-f384-4652-8df4-015721651eb4` | Example X-Region 500 Patient Study | v1 | Current | — | — |
| Project 5 (v1) | `61719a77-5f14-43fb-9288-000267eb407f` | Project 5 | v1 | Current | 2024-11-14 | — |
| Project 6 (v1) | `4afd5e55-5b11-4af6-8050-7fee3ce9ceaa` | Project 6 | v1 | Current | 2024-11-15 | — |
| Project 7 (v1) | `72e76f75-05a2-4907-8381-7ad622897dd5` | Project 7 | v1 | Current | 2024-11-15 | — |

`Version Type` items: `Current` (`038a2f48-6e2b-40f5-8c80-6dbef3bc8b31`), `Superseded` (`e9d482a4-4373-472a-9b9c-194d94ce44ae`). Only `Project 1 (v1)` is Superseded. `Date Released` is empty everywhere.

#### `Version` — `8ed37a6d-7a3b-4095-bc72-31efe2c5df9e` (13 items)

| Property | Data type | Input / formula |
|---|---|---|
| `No` | Text | Input |
| `Name` | Text | **Formula**: `"v" & Version.No` — display property |

Items: v1 `c6bfbb5d-…`, v2 `727d9f5f-…`, v3 `2bdf8188-…`, v4 `39afcdae-…`, v5 `7869963d-…`, v6 `f3e8b621-…`, v7 `4d0bf188-…`, v8 `73d9a881-…`, v9 `e18130ae-…`, v10 `54dfc642-…`, v11 `d0f8544c-…`, v12 `ee27d171-…`, **v1.1** `54523960-…`.

#### `Change Log` (Version Changelog) — `297f4a64-e321-498e-81dc-28c7e7b46adc` (5 items)

| Property | Data type | Points at | Input / formula |
|---|---|---|---|
| `Change ID` | Integer | — | Input |
| `Project Version` | Dimension | `Project Version` | Input — **the only link to the rest of the model** |
| `Project` | Dimension | `Project` | **Formula**: `'Change Log'.'Project Version'.Project` |
| `Version` | Dimension | `Version` | **Formula**: `'Change Log'.'Project Version'.Version` |
| `Change Needed` | Text | — | Input |
| `Location` | Text | — | Input (hidden in the view) |
| `Date Identified` | Date | — | Input |
| `Date Updated` | Date | — | Input (hidden) |
| `Requested` | Dimension | `User` | Input (hidden) |
| `Approved` | Dimension | `User` | Input (hidden) |
| `Actioned` | Dimension | `User` | Input (hidden) |
| `Additional Notes` | Text | — | Input (hidden) |

Items (display property is unset, so rows show the raw Project GUID — a UI defect):

| Change ID | Project Version | Change Needed | Date Identified |
|---|---|---|---|
| 1 | Project 1 (v1) | *(blank)* | — |
| 2 | Project 2 (v1) | "Comment here..." | 2024-10-15 |
| 3 | Project 4 (v1) | "Initial project estimate" | 2024-11-14 |
| 4 | Project 5 (v1) | "Initial Budget creation" | 2024-11-14 |
| 5 | Project 7 (v1) | "Initial Budget" | 2024-11-15 |

#### `Client` — `18b70077-5067-4709-9202-89a4128dbbb9` (7 items)

Single `Name` (Text) property. Items: Client A `8fc367ef-…`, Client B `b7fcc380-…`, Client C `b9913c0a-…`, Client D `2d8fb6b7-…`, **Example** `75abdd32-…`, Client E `c9ef37e4-…`, Client F `69f11f7d-…`.

#### `Owner` / `Approver` — **the `Team` list, not the `User` list**

`Project.Owner` and the `Approver` metric both point at **`Team` (`afd180be-9311-4b4b-bff4-24b1a2709830`)**, a plain application-local dimension. The Pigment `User` list (`5840daf8-09ce-4821-a51f-e5059f123e4e`, **shared from `Admin App`**) is a *separate* dimension used only for the raw approval inputs (`Approve`, `Date Approved`, `Approval Comments`, `Approved Notification`) and for access rights.

`Team` properties: `Name` (Text, display), `email` (Text), `L1 Approval` (Dimension → `L1`).

| Team member | Id | email | L1 department they approve |
|---|---|---|---|
| Rachael Selman | `6e239200-073f-4d2d-9e67-855353b15178` | RACHAEL.SELMAN@GOPIGMENT.COM | 6 CLINICAL RESEARCH MONITORING |
| Maria Menard-Zouhair | `1b0be2e5-5ea3-48fc-aa1c-8023759702e8` | mz@ergomed.com | 2 MEDICAL WRITING |
| Paula Orandash | `ebdbd0df-73fb-454a-a43b-47d259173edb` | po@ergomed.com | 3 PATIENT ADVOCACY ORGANIZATION ENGAGEMENT SERVICES |
| Marija Flego | `79f3bda4-1e4c-44ff-a56c-8b13f16316a8` | mf@ergomed.com | 4 REGULATORY AFFAIRS & QUALITY MANAGEMENT & COMPLIANCE |
| Marijana Prodan | `038d2f69-04fb-4b88-bda6-b360d4f207cf` | mp@ergomed.com | 5 PROJECT MANAGEMENT |
| Sharon Fletcher | `7c0d060b-5858-4bc4-bc85-8d7f945d790c` | sf@ergomed.com | 1 STUDY START-UP |
| Anthony Gibson | `899b99d1-5a76-479f-9a84-c7a82b30d5ea` | ag@ergomed.com | 7 DATA MANAGEMENT & BIOSTATISTICS |
| Dusan Markovic | `1fca0b63-68e0-40b1-a736-ad68f8963573` | dm@ergomed.com | 8 MEDICAL AFFAIRS |
| Iwona Kmicikiewicz | `a22e31fb-d5b3-41f7-8cba-24a04e8f9869` | ik@ergomed.com | 9 SAFETY MANAGEMENT |

> L1 departments 10 (`SITE SUPPORT SERVICES: SITE MANAGEMENT`) and 11 (`SITE SUPPORT SERVICES: STUDY PHYSICIANS`) have **no approver**.

#### `Project Status` — `6f129e98-54cb-419d-a6e7-6cc7dcd2d3e0` (4 items)

`Name` (Text) only. `Probable` (`0f0050cc-…`), `RFP` (`ccb49335-…`), `Won` (`9c65f9ad-…`), `Template` (`acefc6e6-…`). Drives the `Win Likelyhood` metric.

#### `Version Type` — `390c55f2-db28-444a-b604-f976ebf2ec98` (2 items)

`Name` (Text), `Color` (Integer). `Current` (`038a2f48-…`), `Superseded` (`e9d482a4-…`). **No metric or view filters on it** — see §4.4 and §9.

#### `Approval_Status` — `8f5deda6-c772-4a9a-b8f3-b9ce4ce320a8` (3 items)

`Name` (Text), `Color` (Integer). `Approved` (`602e044a-…`), `Awaiting Approval` (`4eb6bfba-…`), `Awaiting Request Approvals` (`671c3491-…`). Populated only by the `Status_Approvals` formula.

#### `L1 Task` (`L1`) — `05fba1a3-317a-4da5-b93f-950a8ae16c83` (11 items)

| Property | Data type | Input / formula |
|---|---|---|
| `Name` | Text | Input |
| `Rank` | Integer | Input |
| `Display` | Text | **Formula**: `TEXT(L1.Rank) & " " & L1.Name` — display property |

| Rank | Display | Id |
|---|---|---|
| 1 | 1 STUDY START-UP | `4db02d18-b3f8-4d37-9908-f5a79a0dc2af` |
| 2 | 2 MEDICAL WRITING | `9ec02723-d167-4e73-bcaa-2d99e470e306` |
| 3 | 3 PATIENT ADVOCACY ORGANIZATION ENGAGEMENT SERVICES | `2465522b-6110-4f38-b367-c8a009fc5ab0` |
| 4 | 4 REGULATORY AFFAIRS & QUALITY MANAGEMENT & COMPLIANCE | `08fcf4da-f8e2-47e6-8091-ab6315226f8e` |
| 5 | 5 PROJECT MANAGEMENT | `5426efe2-d6fe-4e1c-a490-d2f0067b740f` |
| 6 | 6 CLINICAL RESEARCH MONITORING | `72f9ec01-3c62-44ee-be17-f3a1739da689` |
| 7 | 7 DATA MANAGEMENT & BIOSTATISTICS | `28090552-463b-4a9c-9390-8af479f7362d` |
| 8 | 8 MEDICAL AFFAIRS | `2e3654d5-fc19-49c6-a8c6-47a84506886a` |
| 9 | 9 SAFETY MANAGEMENT | `d6d463e3-a002-4406-a8c9-3256afbce65e` |
| 10 | 10 SITE SUPPORT SERVICES: SITE MANAGEMENT | `a15cd425-eb91-494a-84ee-1502b9729c3f` |
| 11 | 11 SITE SUPPORT SERVICES: STUDY PHYSICIANS | `eaa7b930-0021-453f-848d-68bd5d6f8fd9` |

#### `L2 Task` (`L2`) — `902379cd-08d8-4a97-8e7f-2330c7c89487` (33 items)

`Name` (Text) only — **no link to L1**; the L1↔L2 relationship lives on `Task Defintion` and is materialised by the helper metric `L1/Service_FromL2` (`3b5d3daa-…`).

Items: Set-up and Oversight `207ff754`, Feasibility Assessment `4990da1f`, Meetings & Teleconferences `09fb1e15`, Study Protocol `d9bf87b8`, Other Documents `cb12708b`, Patient Advocacy Organization Engagement `ac41952c`, Administrative Support `77d2fb1a`, CDISC `f0d02c45`, Clinical Team Management `aa4ce808`, Development of Clinical Study Report `f503375d`, DSMB Management `bdc0e063`, General Maintenance Phase `5992b1dd`, IND Compilation and Submission `68758e5c`, IND Maintenance `fd0add5e`, Medical Affairs `c75579f3`, Oversight and Teleconferences `f88d1555`, Pre-IND Activities `4499b0cf`, Project Director Oversight `bd92e98c`, Project Management `9a07aff2`, Quality Management & Compliance `c0b9ab10`, Regulatory & Start-Up `81b9686a`, Safety Database License Fees `54f771bf`, Safety Project Management Set-up `d76b7f1d`, Scientific Advice Support `dc2e1620`, Set-Up Activities `93f36d14`, Site Agreements `6f219c20`, Site Management `269d6244`, Site Management Oversight `73ae73f0`, Statistical Consulting - Conduct & Analysis Periods `dafff58c`, Study Conduct `8e1360e4`, Study Conduct and Close-Out `3e686afe`, Study Physician Support `efb2d881`, Study Set-Up `f6d02cd3`.

#### `Task Defintion` — `7c1475b1-17c2-434b-8059-6ee0dc197503` (34 items) — **the task library that actually drives pricing**

| Property | Data type | Points at | Input / formula | Notes |
|---|---|---|---|---|
| `Name` | Text | — | Input | display |
| `L1 Task` | Dimension | `L1` | Input | department |
| `L2 Task` | Dimension | `L2` | Input | activity group |
| `Associated Service` | Dimension | `Service` | Input | **the on/off switch** — a task is live only if its service is active |
| `Study Specific` | Dimension | `Project` | Input | blank ⇒ global task; set ⇒ custom task for one project |
| `All Projects` | Boolean | — | **Formula**: `IF(ISBLANK('Task Defintion'.'Study Specific'), TRUE)` | |
| `Active L2/L1/Service` | Boolean | — | **Formula**: `TRUE` (constant — exists only to be pivoted by `L1/Service_FromL2`) | |
| `Core Driver` | Dimension | `Core Driver` | Input | what the task scales with |
| `Custom Driver` | Text | — | Input | free-text driver label when `Core Driver` = "Custom" |
| `Workload Frequency` | Dimension | `Workload Frequency` | Input | Total / Per Month / Total per Site / Per Site-Month / Total per Patient / Per Patient-Month |
| `Hours/Unit` | Dimension | `Hours/Unit` | Input | "Hours" or "Units" — decides which of the two standard rates below is used |
| `Standard Hours/(Units)` | Decimal | — | Input | hours per driver unit **or** number of units |
| `Standard Hours Per Units (If Unit Type)` | Decimal | — | Input | hours per unit, used only when `Hours/Unit` = "Units" |
| `Per Region` | Dimension | `Region Workload` | Input | "Lead Region Only" or "All Regions" |
| `Phase` | Dimension | `Task/Phase Options` | Input | which study phase / span the effort falls in |
| `Role One` … `Role Five` | Dimension ×5 | `Responsible Role` | Input | up to five roles can share the task |
| `Client Unit Type` | Dimension | `Client Facing Unit Type` | Input | how the task is priced to the client |

#### `Responsible Role` — `fb686b30-8f48-4ef5-b9fe-817dc470939c` (27 items)

Properties: `Name` (Text, display), `Alt Name` (Text), `In Country Resource` (Boolean), `Region Link` (Dim → `Region Link`), `Service` (Dim → `Service`), `Staffing Assumptions Driver` (Dim → `Staffing Driver`), `Task Hrs Driver` (Dim → `Task Hrs Driver`). All input.

| Role | Id | Service | Region Link | In-country | Staffing driver |
|---|---|---|---|---|---|
| Regulatory Expert | `fe1ffdbb-…` | Regulatory Affairs | Lead Region Only | — | 1 |
| Regulatory Affairs Lead | `dc5819a6-…` | Regulatory Affairs | Lead Region Only | — | 1 |
| Site Contract Lead | `8ec69e58-…` | Study Start-up | Lead Region Only | — | 1 |
| SSU Lead | `f2192ec0-…` | Study Start-up | Lead Region Only | — | 1 |
| SSU | `3cb1295f-…` | Study Start-up | All Regions | — | Countries |
| Feasibility Lead | `de99474e-…` | Feasibility | Lead Region Only | — | 1 |
| Feasibility Specialist | `5a184a33-…` | Feasibility | *(blank)* | — | *(blank)* |
| Patient Engagement Officer | `d37d8fcb-…` | Patient Engagement Services | Lead Region Only | — | 1 |
| Project Director | `c2cdcebb-…` | Project Management | Lead Region Only | — | 1 |
| Project Manager | `26e06135-…` | Project Management | Lead Region Only | — | 1 |
| Clinical Team Manager | `25a4a78d-…` | Project Management | All Regions | — | Sites (above/below 20) |
| **Monitor** | `91ca769f-…` | Monitoring | All Regions | ✅ | Monitors |
| Central Monitor | `9cbb530d-…` | Centralized Monitoring | Lead Region Only | — | 1 |
| Clinical Trial Assistant | `1dce1704-…` | eTMF | Lead Region Only | — | Sites (above/below 10) |
| Senior TMF Specialist | `ba5a64d1-…` | eTMF | Lead Region Only | — | 1 |
| TMF Specialist | `7536d684-…` | eTMF | Lead Region Only | — | 1 |
| Lead Site Managers | `7d681b04-…` | Site Management | Lead Region Only | ✗ (explicit False) | All Countries for Site Mgmt Support >2 |
| **Site Managers** | `9db56cc3-…` | **Pre-IND/IND** ⚠️ | All Regions | ✅ | Countries for Site Management Support |
| Medical Writers | `58a26120-…` | Protocol Development | Lead Region Only | — | 1 |
| Study Physicians | `45470c23-…` | Study Physicians | All Regions | — | Sites (>0) |
| **Medical Monitor** | `4085f28c-…` | Medical Affairs | All Regions | ✅ | Sites (>0) |
| PV Manager | `3999b531-…` | Safety | Lead Region Only | — | 1 |
| Data Manager | `fa2bfb54-…` | Data Management | Lead Region Only | — | 1 |
| Biostatistician | `e89211f0-…` | Statistics | Lead Region Only | — | 1 |
| Legal Consultant | `b91ca5fc-…` | Regulatory Affairs | *(blank)* | — | *(blank)* |
| Statistical Programmer | `387cc2ba-…` | Data Management | *(blank)* | — | *(blank)* |
| **Junior Monitor** | `16b8266d-…` | Monitoring | All Regions | ✅ | 1 |

#### `Region` — `a0199db2-dcc4-43b6-9b2c-61fe88191e1a` (3 items)

`Name`, `Color` (Integer), `Rate Currency` (Dim → `Currency`), `Region Group` (Dim → `Region Top Level Group`).

| Region | Id | Rate currency | Region group |
|---|---|---|---|
| NA | `102c320c-23ba-4d75-acb3-657511e8c5f2` | USD | (single group `e2b8ad79-…`) |
| EUROPE | `a14cbe7f-8148-4316-95b3-7b3323252ecf` | EUR | same |
| OTHER | `7876dd5e-8b47-48cc-8597-76651d93e0fa` | EUR | same |

`Sub Region` (6): NA→NA, WEUR→EUROPE, CEE/EE→EUROPE, MENA→OTHER, Asia→OTHER, Latin America→OTHER.
`Country` (46 items) carries `Name`, `Region`, `Sub Region` — all input.

#### `Service` — `f9870ff9-ae89-4c5d-83b6-51a7ff477cfe` (26 items)

`Name` (Text), `Service Group` (Dim → `Service Group`, all 26 map to the single group `46899e8b-…`).

Protocol Development `c3dc5545`, Protocol Amendment `a63beb90`, Master ICF Development `181de54c`, IMPD `074c9567`, CSR `9e91350b`, Investigator Brochure (IB) `bb3a971c`, Study Start-up `d989e399`, Regulatory Affairs `d53ce50e`, Pre-IND/IND `8fd713a6`, Orphan Drug Designation (ODD) Application `b4a4719b`, Scientific Advice `ceb0cff0`, Feasibility `fea79fc4`, Patient Engagement Services `5f46c4d1`, QMC `ec6ab563`, Project Management `7f335a43`, eTMF `877efbd4`, Monitoring `03db826a`, Centralized Monitoring `b2dcacee`, Medical Affairs `198c80c2`, Safety `beea13ef`, Site Management `1354e94a`, Study Physicians `187ceb28`, Data Management `c5083569`, Statistics `5e60f338`, SDTM/ADaM `1f6dbb00`, DSMB `4d1f22f2`.

#### `Project Phase` / `Milestone` lists

**`Task Stage` — `26c7a9f4-45e5-428f-9e01-2e8d758c36b5` (8 items).** This is the milestone/phase list used by the timeline, cashflow and resourcing engines.
Properties: `Name`, `Abbrev`, `Short Name`, `ID` (Integer), `Start Milestone` (Text), `End Milestone` (Text), `Milestone Group 1` (Dim), `Milestone Group 2` (Dim).

| ID | Name | Abbrev | Short | Start ms | End ms | Modality id |
|---|---|---|---|---|---|---|
| 1 | Study Documents Development Period | SDD | DD | SSD | SSU | `97bea0a6-ac06-44fb-bb12-89c86401c418` |
| 2 | Set-Up Period | SSU | SU | SSU | FPE | `b272bf5b-5aa4-48a3-987d-efbccaa5602c` |
| 3 | Screening / Enrolment Period | PS | ENR | FPE | LPE | `cd77d596-5d01-4880-a3ba-accdfdd10d88` |
| 4 | Treatment/Follow-Up Period | TP I | TX-FU | FPT | — | `c710f31c-6c89-4c2b-8096-d772e73c9937` |
| 5 | Treatment/Follow-Up Period II | TP II | TX-FU2 | — | — | `518fd7c5-d40e-4a85-baf4-d37c554d64e7` |
| 6 | Extended Follow-Up Period | ETP | EX-FU | — | LPT | `2728640d-b9ef-4bcd-8ffc-45c15311f2b0` |
| 7 | Database lock/Close-Out Period | DBL | CO | — | DBL | `49d21b66-adb8-4c86-8de9-b7715fb05ca6` |
| 8 | CSR Writing & Archiving/Transfer of Study Documents | COP | *(blank)* | — | COP | `48ac92a0-60c7-40e7-8fdd-027ac2136e3c` |

`Milestone Group 1` = 1 item `Total Study Duration` (`3145346e-34a2-46d8-855c-5f0e659d566d`); `Milestone Group 2` = 1 item `Study Finalisation` (`2d711c2f-d00a-4bb5-9c19-203393ed355d`). Stage 8 has no Group 2 value.

**`Task/Phase Options` — `91cca3c4-ac60-487f-8d0d-1c736f24c8c5` (19 items).** The phase a *task* is assigned to. The first 8 mirror `Task Stage` by name, then `Total Study Duration`, then 10 cross-milestone spans: SSD→FPE `eadc7df4`, SSD→LPE `cc1e52c2`, SSD→LPT `89194c09`, SSD→DBL `ab915e2f`, SSU→LPE `18374d27`, SSU→LPT `6e8c7f26`, SSU→DBL `b43f4c52`, SSU→COP `ac681c57`, FPE→LPT `1f48cacb`, FPE→DBL `dec5fc33`.

**`Dual Timeline Stages` — `eae6291c-cb6b-42b7-987c-d44cdee3a07d` (10 items).** Exactly the 10 cross-milestone spans above, as their own dimension (SSD→FPE `8562000a`, SSD→LPE `c9a5a117`, SSD→LPT `46247cf8`, SSD→DBL `80202ea5`, SSU→LPE `693c5f5c`, SSU→LPT `7a6fce5f`, SSU→DBL `23266bc2`, SSU→COP `c56f00fd`, FPE→LPT `b107bab6`, FPE→DBL `6ecbf0a3`).

**`Task Stage Span` — `6db8054c-95bf-476b-a2b8-6f668caeadfe` (14 items)**, legacy: DD, DD→CO, SU, SU→ENR, SU→CO, ENR, ENR→TX, ENR→FU, ENR→CO, TX-FU, TX-FU2, TX→CO, EX-FU, CO.

#### Other small lists in full

| List | Items |
|---|---|
| `Currency` (3) | EUR `357d55d3`, USD `c192fb74`, GBP `e1c08836` |
| `Complexity Level` (3) | LOW (ID 1) `35d4b0c7`, MED (2) `9aca996b`, HIGH (3) `de12d1fb` |
| `Complexity Type` (4) | Int. Ph I-III → HIGH `ebe9e39f`; Int. Ph IV → MED `a2b18f28`; NIS Ph IV → LOW `3619e04a`; Retro. Ph IV → LOW `63149691` |
| `Y/N` (2) | Yes `302d4737`, No `836fa9d1` |
| `Billing_Type` (2) | Monthly Billing `2dc151f6`, Milestones `5bf02148` |
| `Hours/Unit` (2) | Hours `e5df9f08`, Units `eab4d836` |
| `Region Workload` (2) | Lead Region Only `b6a6fdaa`, All Regions `1f854aea` |
| `Region Link` (2) | All Regions `0f0c93b4`, Lead Region Only `6fcd4f2f` |
| `Driver Type` (3) | None `f9085494`, Country/Site `a1a2110c`, Role `0c24ab3f` |
| `Band` (3) | Band 1 `575de81f`, Band 2 `9781bdbc`, Band 3 `96e507c3` |
| `Task Driver Banding` (2) | "No. Active Sites (0-40-45+)" `d0897fe1`, "No. Active Sites (0-10-50+)" `841bd5c4` — both driven by `Task Hrs Driver` `57045653`. Display is a formula `Driver.Name & " (" & Desc & ")"` |
| `Core Driver` (11) | Sites `c978acfa`, Phase Period `41e052a2`, Patients (Screened) `28290419`, Patients (Failures) `7049743a`, Patients (Randomized) `ad5f86f0`, Countries `e85f106c`, Countries (Inc. Backup) `505b2c63`, Feasibility Site Outreach `50eb2b86`, Feasability Assessments `987dec10`, Sites (Inc. Backup) `849714d0`, **Custom** `62d1e397`. Extra property `Not Custom` (Boolean, formula `IF(ISDEFINED('Core Driver' [Exclude: 'Core Driver'."Custom"]), True)`) |
| `Workload Frequency` (6) | Total `a8d1e343`, Per Month `a911ced5`, Total Per Site `8264f597`, Per Site/Month `eb846103`, Total Per Patient `69393539`, Per Patient/Month `3d5d0b2a` |
| `Client Facing Unit Type` (5) | Custom `d1c090b9`, Hour `f91df712`, Site `f7585a28`, Month `71608866`, Site / Month `ad7ede06` |
| `L1 - Client Facing` (3) | Project Set-up `63871060`, General Maintenance Phase `b852806c`, Safety Database License Fees `a35c3159` |
| `Staffing Driver` (8) | 1 (value 1) `d3017bfe`, Sites (>0) `0bcf2aed`, Monitors `2eca2efd`, Countries `5c4aced4`, Sites (above/below 20) `316125ca`, Sites (above/below 10) `12ec228d`, Countries for Site Management Support `9aec97e6`, All Countries for Site Management Support >2 `7219b6c0` |
| `Study Phase` (10) | Ph I `db6434b2`, Ph I/II `84f877d5`, Ph II `11a69cb7`, Ph II/III `6eac5103`, Ph III `a6ee75a2`, Ph IV `82611168`, Registry `7dbc2337`, Observational `a33dae3f`, Non-interventional `b03c03f7`, Other `aaedfab5` |
| `RFP` (3) | Key `cc2dcd43`, Standard `9912088b`, Ballpark `214c3f9a` |
| `Role` (5, /Security) | Reader `9cc5d9f2`, Contributor `b1124495`, Designer `34b263b7`, Modeler `50f660bd`, Admin `70c79254`. Properties: `Name`, `Access Rights` (AccessRight), `Permissions` (Permission) |
| `Unit` (16, legacy) | Protocol `8e038149`, Protocol Amend. `6601b22b`, Plan `246c44f8`, Month (SU) `7c55b06a`, Month (TX) `9b139d92`, Site `6c2cd69f`, Country `6ab120e3`, FQ `db18b378`, Site Contracts `9fe0f87d`, CDA `1c4ab23c`, Hour `576b4440`, Teleconference `b73963ce`, Report `ac3e0379`, Review `2b4e7378`, Visit/Summary `101a4093`, Site/Month `2f17152b` |
| `Option Price` (2) | **Main Scope** `51bedaab-2de9-43dd-a4fd-b523dae7e45c` (`Name` = **2**, no Project Version); **Option - Statistical Consulting** `420fe204-031d-4276-a40a-70ba5b96e7a7` (`Name` = 1, Project Version = *Project 1 (v1)*). Properties: `Name` (**Integer**), `Title` (Text), `Description` (Text), `Project Version` (Dim), `Display Name` (Text formula `IF(Title="Main Scope","Main Scope","Option - " & Title)`) |
| `Milestone Group 1` (1) | Total Study Duration `3145346e` |
| `Milestone Group 2` (1) | Study Finalisation `2d711c2f` |
| `Region Top Level Group` (1) | `e2b8ad79` |
| `Service Group` (1) | `46899e8b` |
| `Before/After` (2), `Template` (1) | present but unreferenced by any metric or view |

#### `Task` (legacy) — `a7a22332-5595-41d1-8775-34f5cdbfa987` (15 items)

Properties: `Name`, `L1` (Dim), `L2` (Dim), `Task Rank` (Integer), `L2 Rank` (Text, formula `RANK(Task.'Task Rank', Task.L2)`), `Unit` (Dim → `Unit`). All 15 items sit under L1 = *1 STUDY START-UP*. Used only by the parked boards `3. Budget`, `Task Setup`, `2.3. Global Task Defaults`.

---

## 4. Metrics

185 metrics. Dimension abbreviations used below: **PV** = `Project Version` (`5a4f5a85-…`), **TD** = `Task Defintion` (`7c1475b1-…`), **RR** = `Responsible Role` (`fb686b30-…`), **OP** = `Option Price` (`7f76b001-…`), **TS** = `Task Stage` (`26c7a9f4-…`), **TPO** = `Task/Phase Options` (`91cca3c4-…`). The only time list used anywhere is **`Month`** (`b3c1a1ef-…`), monthly granularity.

Input column: `I` = ManualInput, `F` = Formula, `F+I` = FormulaWithManualInput (formula provides a default, the cell is editable and override is enabled).

### 4.1 `/` (root) and `/1. Admin and Change Log`

| Metric | Id | Type | Dimensionality | In | Summary |
|---|---|---|---|---|---|
| `L1/Service_FromL2` | `3b5d3daa-dfcc-42aa-af26-f1d808bd73c1` | Boolean | L1 × L2 × Service | F | `'Task Defintion'.'Active L2/L1/Service' [BY LASTNONBLANK: TD.'L1 Task', TD.'L2 Task', TD.'Associated Service']` — materialises the L1↔L2↔Service graph implied by the task library |
| `Win Likelyhood` | `67fcc6fb-d79d-4e60-81d1-2822209d2f3f` | Decimal | Project Status | I | Win probability per status (Won 100%, Probable 90%, RFP 50%, Template 0%) |
| `Current Project Status` | `d9d4643b-04a1-4b66-acbc-bb2cf062305e` | Text | PV | F | `Project.'Project Status'.Name [BY: PV.Project]` |

### 4.2 `/2. Base Assumptions`, `/4. Global Rates`, `/5. Global Tasks`, `/6. Project Tasks` (legacy engine)

| Metric | Id | Folder | Type | Dimensionality | In | Summary |
|---|---|---|---|---|---|---|
| `Complexity Multiplier` | `b1e10a0d-77e5-4fe4-87cc-074dfdc3e208` | /2. Base Assumptions | Decimal | Complexity Type × Task | I | Legacy multiplier grid |
| `Rates` | `16be9884-0fe5-4724-abfa-db92d777ab99` | /4. Global Rates | Decimal | Currency × Region × RR | I | Legacy rate table (superseded by `Global Base Rates`) |
| `Global Base Rates (EUR)` | `e23dd592-ae28-467c-ae10-4449f013d164` | /4. Global Rates | Decimal | Region × RR | I | Legacy EUR rate card, shown on parked board `2.4. Rates` |
| `Band Lower Threshold` | `18295d8c-54f1-41e4-ba37-7a9e9ddb34a4` | /5. …/2. Drivers & Bands | Decimal | Band × Task Driver Banding | I | Lower bound of a driver band |
| `Band Upper Threshold` | `e563ed66-8f82-4a23-9d10-6e657918bc12` | /5. …/2. Drivers & Bands | Decimal | Band × Task Driver Banding | I | Upper bound |
| `Band Value` | `8ada09aa-db70-49ec-add1-76ef8c743367` | /5. …/2. Drivers & Bands | Decimal | Band × Task Driver Banding | I | Value returned inside the band |
| `Default Unit` | `ecfe8c88-d68f-43bd-b103-47e38bf8d3ba` | /5. …/3. Task Defaults | Dim → `Unit` | Task × RR | I | Legacy default unit |
| `Default Hrs/Unit` | `2689ff0a-a20e-4919-aaf1-447cd0d21311` | /5. …/3. Task Defaults | Decimal | Task × RR | I | Legacy default hours per unit |
| `Default Hrs Driver` | `b85e7e85-0372-4044-b29d-bd21281b12e1` | /5. …/3. Task Defaults | Dim → `Task Hrs Driver` | Task × RR | I | Legacy driver assignment |
| `Default Hrs Banding` | `96ffc1c5-43de-4854-b8e2-7bfea0b9d994` | /5. …/3. Task Defaults | Dim → `Task Driver Banding` | Task × RR | I | Legacy band assignment |
| `Default Responsible Person` | `a27d73c8-490d-489f-bce0-e2295cd1fc40` | /5. …/3. Task Defaults | Boolean | Task × RR | I | Legacy role↔task flag |
| `Default Task Stage` | `d2e827c2-5482-40fb-97a3-cc81cbeb6ca2` | /5. …/3. Task Defaults | Dim → `Task Stage Span` | Task × RR | I | Legacy phase assignment |
| `Default Complexity Multipliers` | `4bad2548-072d-481b-bfec-ef47debd0bbd` | /5. …/4. Complexity | Decimal | Complexity Type × Task | I | Legacy |
| `No. Units` | `911b481c-1806-448e-979e-907aeedba5d7` | /6. Project Tasks | Decimal | PV × Region × Task × RR | I | Legacy unit input |
| `Hrs/Unit Driver Value` | `b4ae27d6-c350-48e8-805c-cf1d65beed7e` | /6. Project Tasks/Hrs | Decimal | PV × Task Hrs Driver × Region | F | `SWITCH` on the driver type — None→1, Role→`Headcount Assumption`, Country/Site→sites |
| `Project Hrs/Unit Driver Value` | `005755f9-389e-4ec9-9014-5d8f37903b8e` | /6. Project Tasks/Hrs | Decimal | PV × Region × Task × RR | F | `'Hrs/Unit Driver Value'[ADD: Task, RR][BY LAST:-> 'Default Hrs Driver'][REMOVE: 'Task Hrs Driver']` |
| `Project Hrs/Unit` | `c4f0db4c-dfc8-40dd-9a8f-0230e3b6f3c1` | /6. Project Tasks/Hrs | Decimal | PV × Region × Task × RR | F | `'Default Hrs/Unit'[ADD: PV] * 'Project Hrs/Unit Driver Value'` |
| `Unit Driver Value` | `3113ac74-cadf-4f52-b8e4-44240c129de1` | /6. Project Tasks/Units | Decimal | Unit × PV × Region | F | `SWITCH(Unit, …)` mapping each legacy unit to a project driver (Protocol→1, Month (SU)→`Milestone - Months` for SU, Site→active+backup sites, FQ→Feasibility Lead headcount, Site Contracts→`Feasibility Site Outreach`, CDA→`Feasibility Assessment`) |

### 4.3 Project assumptions (`/3. Project Assumptions/…`) — every one is dimensioned by **Project Version**

#### `/1. Financial`

| Metric | Id | Type | Dimensionality | In | Summary |
|---|---|---|---|---|---|
| `Project Complexity` | `7ba04118-c813-4fe9-bf38-1797c238e6bf` | Dim → `Complexity Type` | PV | I | Study type driving complexity (Int. Ph I-III / Int. Ph IV / NIS Ph IV / Retro. Ph IV) |
| `Budget Currency` | `8d208a37-352e-4b44-b4f1-2dec42a46d98` | Dim → `Currency` | PV | I | Currency the budget is priced in |
| `FX Rate (EUR to)` | `a297e899-5bdd-4981-8879-b3c1592dd40d` | Decimal | Currency | I | Global EUR→x rate |
| `FX Rate (USD to)` | `a91e3915-968e-4529-83c9-ee5bb65dafb5` | Decimal | Currency | I | Global USD→x rate (unused downstream) |
| `Budget FX Rate (EUR to)` | `9bde0129-a9d3-4918-b661-3a2951b5421b` | Decimal | Currency × PV | F+I | `'FX Rate (EUR to)'[ADD: PV]` — per-version FX override |

#### `/2. General` (all dimensioned by PV only — the study header)

| Metric | Id | Type | In | Summary |
|---|---|---|---|---|
| `Sponsor` | `a2c78072-7e25-425f-a818-4df3b7655f75` | Text | I | Sponsor name (KPI on Exec Summary & Dept Review) |
| `Sponsor Location` | `e8bebade-9278-4ee0-8593-a602657cbbd4` | Dim → `Region` | I | Seeds `Lead Region` for every service |
| `Study Protocol` | `5ee5a2f8-3d21-45f4-80f6-6e073c543f52` | Text | I | |
| `Protocol Version/Date` | `2f890f5a-b0fa-4e67-8183-7103b3f7f640` | Text | I | |
| `Study Drug` | `0b536b9c-986d-4d77-84fd-c2ddd3de9485` | Text | I | |
| `Program Phase` | `4d0fcc9b-e0ad-4263-b84a-b62794e96c53` | Dim → `Study Phase` | I | |
| `Program Phase text` | `165945f9-34e8-4197-bdee-a75bda4f315f` | Text | F | `'Program Phase'.Name` (exists only so a KPI can show it) |
| `Theraputic Business Unit` *(sic)* | `075f22b0-7040-4573-b0af-f1dbe4406902` | Dim → `Therapeutic Business Unit` | I | Displayed as "Therapeutic Business Unit". Drives the Rare Disease branch of `Feasibility Site Outreach` |
| `Indication` | `50eebb30-8add-469b-bb85-68d3783ba416` | Text | I | |
| `Blinded Study` | `f303c845-75a1-48d7-9632-b77125596abb` | Dim → `Y/N` | I | |
| `Unblinded team required?` | `a15586b3-6340-4d22-ac26-d12555548dc1` | Dim → `Y/N` | I | |
| `RFP Version #` | `ec2a03eb-de40-4750-83f7-50340d057088` | Decimal | I | |
| `RFP Received Date` | `d3018791-5b37-46d7-a447-8b30688333c8` | Date | I | |
| `RFP Type` | `368294bc-bfe8-443e-9efa-731715c384cf` | Dim → `RFP` | I | Key / Standard / Ballpark |

#### `/3. Services Active`

| Metric | Id | Type | Dimensionality | In | Summary |
|---|---|---|---|---|---|
| `Service Active` | `c64cd728-c93b-4ecc-adce-2a0e7a8f13d6` | Dim → `Y/N` | PV × Service | I | **The master on/off switch for scope** |
| `Service Active Boolean` | `201a7ca6-0249-41fa-be55-c8c6ab7e7344` | Boolean | PV × Service | F | `IF('Service Active'='Y/N'."Yes", TRUE)` |
| `Service Active Display` | `097463a8-7d26-4597-98f3-0139c8024794` | Text | PV × Service | F | `IF('Service Active'='Y/N'."Yes", Service.Name)` |
| `Lead Region` | `3cc9c73a-befc-42a1-966f-eddaf041308e` | Dim → `Region` | PV × Service | F+I | `if('Service Active'='Y/N'."No", BLANK, 'Sponsor Location'[ADD: Service])` — defaults every active service's lead region to the sponsor's region, overridable |
| `Lead Region Boolean` | `91acdf78-47e8-496b-9378-665f39708e67` | Boolean | PV × Region × Service | F | `IFDEFINED('Lead Region' [BY: -> 'Lead Region'], TRUE)` |
| `Service Complexity` | `a266b421-fc60-4263-ba29-4ab6263fdb12` | Dim → `Complexity Level` | PV × Service | F+I | `if('Service Active'='Y/N'."No", BLANK, 'Project Complexity'.Complexity[ADD: Service])` |

#### `/4. Countries / Sites`

| Metric | Id | Type | Dimensionality | In | Summary / formula |
|---|---|---|---|---|---|
| `No. of Active Sites` | `4aa8bcad-ad36-4bac-9e1f-48b07e4b8317` | Integer | PV × Country | I | **The primary volume driver** |
| `No. of Back-up Sites` | `d07fa66a-1cb4-4528-a2dc-3bf26b5d1d1e` | Integer | PV × Country | I | |
| `Sites for Qualification by Ergomed` | `339c76eb-a681-40b6-8f74-c1611c9770fd` | Integer | PV × Country | I | Reported only |
| `No. of Countries` | `ed04a9f1-9fe8-4902-8ddc-8769b050dafe` | Integer | PV × Country | F | `IFDEFINED('No. of Active Sites',1)` — a country counts as 1 if it has any active site |
| `No. of Back-up Countries` | `87adbde5-3ecd-4d60-b5be-499f2239f739` | Integer | PV × Country | F | `IF(ISDEFINED('No. of Back-up Sites') AND (ISBLANK('No. of Active Sites') OR 'No. of Active Sites'=0), 1)` |
| `Feasibility Assessment` | `f6cee366-3d35-4104-8230-e92e0e0a3be2` | Integer | PV × Country | F | `('No. of Active Sites'+'No. of Back-up Sites')*1.5` |
| `Feasibility Site Outreach` | `3a8a84bd-90cf-4e81-9844-bd8d4bff8d98` | Integer | PV × Country | F | `if(TBU="Rare Disease", ROUND(2.5*(active+backup),0), ROUND(3*(active+backup),0))` |
| `Monitors` | `3671640d-fc40-4b92-b11f-058c32526489` | Decimal | PV × Country | F | `ROUNDUP('No. of Active Sites'/5,0)` — 1 monitor per 5 sites |
| `No. Countries for Site Management Support` | `7252986d-8bc1-4d04-946d-11d5097bf388` | Decimal | PV × Country | F+I | `'No. of Countries'` |
| `No. Sites for Site Management Support` | `a111d15a-8930-41f9-a5ff-e37a430c2ada` | Decimal | PV × Country | F+I | `'No. of Active Sites'` |
| `Patient Split` | `ae29f34c-385d-452e-85fc-b9fb07db6693` | Decimal | PV × Country | F | `('No. Patients Randomized'[BY:->Country.Region] * ('No. of Active Sites' / 'No. of Active Sites'[BY: Country.Region]))[remove: Region]` — allocates regional patients to countries pro-rata on active sites |
| `Patient Screened Split` | `12dff877-a984-4178-a9d6-65080eee56b4` | Decimal | PV × Country | F | same shape for screened patients |
| `Patient Screen Failures Split` | `be0c580d-9ea6-4f9e-9d54-5b2c18d4b257` | Decimal | PV × Country | F | same shape for screen failures |
| `Active Sites by Region Boolean` | `8428bb52-c810-4998-bf55-020f7ba701c1` | Boolean | PV × Region | F | `IFDEFINED('No. of Active Sites' [BY: Country.Region], TRUE)` |

#### `/5. Patients`

| Metric | Id | Type | Dimensionality | In | Summary |
|---|---|---|---|---|---|
| `No. Patients Screened` | `de1a4b04-4199-44f4-a8aa-d43ce93febf7` | Decimal | PV × Region | I | |
| `No. Patients Randomized` | `03aefd75-c0c0-49f5-a5f2-a65b458923f1` | Decimal | PV × Region | I | |
| `No. Screen Failures` | `2f51df7d-ca27-4b5f-9297-d33653277c2d` | Decimal | PV × Region | F | Screened − Randomized |
| `Screen Failure Rate (%)` | `3c8914ab-3623-4fc5-8135-d680ff275446` | Decimal | PV × Region | F | Failures ÷ Screened |

#### `/6. Timeline`

| Metric | Id | Type | Dimensionality | In | **Full formula** |
|---|---|---|---|---|---|
| `Start Date` | `4fb85253-fc27-4bde-9605-efd2d0d7a25d` | Date | PV | I | Study start (= first day of Set-Up Period) |
| `Milestone - Months` | `2399554e-2eb4-474e-bd1f-6e60c5c7f08c` | Decimal | TS × PV | **I** | **The only timeline input** — number of months in each of the 8 phases. Displayed as "Months" |
| `Milestone - From` | `5950c727-3d80-4d1d-a4d1-f6fa8425aed4` | Date | TS × PV | F | `IF('Task Stage'."Set-Up Period", 'Start Date', IF('Task Stage'."Study Documents Development Period", ('Start Date'-1)-('Milestone - Months'*30.4), EDATE(PREVIOUS('Task Stage'), 'Milestone - Months'[SELECT: 'Task Stage'-1])))` |
| `Milestone - To` | `5c6f947b-4740-49e3-8f73-7e3bcbb8968f` | Date | TS × PV | F | `EDATE('Milestone - From','Milestone - Months')-1` |
| `Default Task Phase Span` | `0c2616bc-46c0-40fd-9f18-588435f2c880` | Boolean | TS × Task Stage Span | I | Legacy mapping grid (parked board `2.3`) |

#### `/7. Staffing`

| Metric | Id | Type | Dimensionality | In | Summary / formula |
|---|---|---|---|---|---|
| `Role <> Service` | `52d199a5-26b3-4ce4-9341-6f6b2e85919e` | Boolean | Service × RR | I | Which roles a service needs (global matrix) |
| `Region <> Service` | `8a24d983-2d48-4e9d-b522-617a814269ee` | Boolean | PV × Region × Service | F | `if(('Service Active'[ADD CONSTANT: Region]='Y/N'."Yes") AND Region='Lead Region', TRUE)` |
| `Role <> Service (Project)` | `b32ebeb7-2f70-4b68-9871-86b774838514` | Boolean | PV × Region × RR | F | `ifdefined(IFDEFINED('Role <> Service',1) * ifdefined('Region <> Service',1), TRUE)[REMOVE ANY: Service]` |
| `Staffing Driver Values` | `f7b0c636-d0be-46f2-aff0-d1136ff9059c` | Decimal | Staffing Driver × PV × Region | F | 8-branch `SWITCH` turning each staffing driver into a regional count (1, Sites>0, Monitors, Countries, Sites ≷20, Sites ≷10, Countries for site-mgmt support, All countries >2) |
| `Headcount Assumption` | `f70f5548-2204-4e5f-a42b-9569d443c1a8` | Decimal | PV × Region × RR | F+I | `if(RR.'Region Link' = 'Region Link'."All Regions", 'Staffing Driver Values'[BY: RR.'Staffing Assumptions Driver'], if('Role <> Service (Project)', 'Staffing Driver Values'[BY: RR.'Staffing Assumptions Driver']))` |

#### `/8. Outputs for Task Planning` — **the timeline → month bridge**

| Metric | Id | Type | Dimensionality | In | **Full formula** |
|---|---|---|---|---|---|
| `Drivers Data` | `105611eb-9c18-4bb2-af05-bbba02a45a6e` | Decimal | PV × **Core Driver** × Country | F | Nested `IF` mapping each Core Driver to its country-level number: Patients (Screened)→`Patient Screened Split`; Patients (Randomized)→`Patient Split`; Patients (Failures)→`Patient Screen Failures Split`; Countries→`No. of Countries`; Countries (Inc. Backup)→backup+countries; Feasibility Site Outreach; Feasability Assessments; Sites→`No. of Active Sites`; Sites (Inc. Backup)→active+backup. *(`Phase Period` and `Custom` deliberately fall through as blank and are handled in the Driver Calculations layer.)* |
| `Patient Split %` | `eb37c8cb-e45e-4004-a368-ea91203f79d0` | Decimal | PV × Country | F | `'Patient Split' / 'Patient Split' [REMOVE SUM: Country]` |
| `Milestone_Period` | `d80aa426-396b-48d3-a2b9-f33609b98ca4` | Decimal | **TS × PV × Month** | F | `PRORATA(Month, 'Milestone - From', 'Milestone - To'+1)` — **the monthly phase flag grid** (fractional at phase boundaries) |
| `Milestone_Period_Multi_Stages` | `a154b2a2-07d8-4660-8d86-bc9d519e1eb3` | Decimal | PV × Month × **Dual Timeline Stages** | F | `PRORATA(Month, (IF(LEFT('Dual Timeline Stages'.Name,3)='Task Stage'.'Start Milestone','Milestone - From'[BY CONSTANT: 'Dual Timeline Stages']))[remove lastnonblank:'Task Stage'], (IF(RIGHT(name,3)='Task Stage'.'End Milestone','Milestone - From'[BY CONSTANT:'Dual Timeline Stages']))[remove lastnonblank:'Task Stage'])` — builds the 10 cross-milestone spans from the milestone abbreviations |
| `Resource_Selector_Milestone_Periods` | `a04abc3b-0ec5-44bc-8647-49745d9933b2` | Decimal | PV × **TPO** × Month | F | `Milestone_Period [BY: MATCH('Task/Phase Options'.Name,'Task Stage'.Name)] + Milestone_Period [BY: 'Task Stage'.'Milestone Group 1'][BY: MATCH('Task/Phase Options'.Name,'Milestone Group 1'.Name)] + Milestone_Period_Multi_Stages [BY: MATCH('Task/Phase Options'.Name,'Dual Timeline Stages'.Name)]` — **the single lookup every task uses to spread effort over months**, joining by *name string matching* |

### 4.4 `/7. Tasks` — the estimating engine

#### `/7. Tasks/Filters etc`

| Metric | Id | Type | Dimensionality | In | Summary |
|---|---|---|---|---|---|
| `Active Task Input` | `14e2be89-1cfb-48b4-9686-052ffa0a7111` | Boolean | PV × TD × Region × RR | I | Manual include/exclude flag (not referenced by any live formula) |
| `Valid Task Unit Input` | `2edc353c-cc2c-450e-a9f5-f8e69a786795` | Boolean | PV × TD × Region × RR | F+I | `IF('Task Role Defined - General Tasks' AND 'Active Sites by Region Boolean', TRUE)` |
| `Valid Task Unit Input User` | `63dd4adc-1b9f-4b83-941d-172ef23f744c` | Boolean | **User** × PV × TD × Region × RR | F | `'Workload Relevant Region' [add: User]` — the per-user version consumed by the access-rights metric |
| `Workload Relevant Region` | `3ad52b47-9fbd-4a45-b98d-3f9ceb7b4b99` | Boolean | PV × TD × Region × RR | F+I | TRUE when the task's role is defined **and** (All Regions + the region has active sites, or Lead Region Only + this is the service's lead region) |
| `Lead Region Boolean by Task Definition` | `48916f7c-df11-4a69-a66f-2a77aac3c30a` | Boolean | PV × TD × Region × RR | F+I | TRUE only for the lead region of lead-region-only tasks |

#### `/7. Tasks/Task Complexity`

| Metric | Id | Type | Dimensionality | In | Summary |
|---|---|---|---|---|---|
| `Task Complexity - Standard` | `b0a4de05-049c-454f-9e23-82c10d88c1b4` | Decimal | **Complexity Type × Task Defintion** | F+I | `1 [ADD: 'Task Defintion','Complexity Type']` — a 4-column multiplier grid per task, defaulting to 1, maintained on board `1. Master Task Definition` |

#### `/7. Tasks/Project Task Management/Table Input` — all PV × TD × RR unless stated

Every one of these is the **default-from-library / override-per-project** pattern: the formula reads the corresponding `Task Defintion` property with `[BY lastnonblank: …][ADD: 'Project Version'][filter: 'Service Active Boolean'][remove lastnonblank: Service]`, gated by `Task Role Defined - General Tasks OR … Specific Tasks`.

| Metric | Id | Type | Dims | In | Summary |
|---|---|---|---|---|---|
| `Task Role Defined - General Tasks` | `026f1b0f-68a0-42e8-b49d-9bf56e31f8d3` | Boolean | PV × TD × RR | F | 5-deep `IFDEFINED` over `Role One…Role Five` on the task library, filtered by `Service Active Boolean` and `[Filter: TD.'All Projects']`. **Defines the sparsity of the whole task grid for global tasks.** |
| `Task Role Defined - Specific Tasks` | `671d7eaa-4114-4d04-b8ee-b0a50bb4eaa8` | Boolean | PV × TD × RR | F | Same 5-deep test but keyed on `TD.'Study Specific'` `[BY: PV.Project]` — project-specific custom tasks |
| `Adjust Responsible Role` | `ce745b81-ab48-4cc9-b60e-2db483203540` | Dim → RR | PV × TD × RR | F+I | `IF(roleDefined, 'Responsible Role')` — lets a user **re-point a task's hours at a different role**; consumed by `[BY SUM: -> 'Adjust Responsible Role']` in the hours metrics |
| `Task Phase` | `15c055dd-4f23-4b0a-8bfa-8f1f97ae548f` | Dim → TPO | PV × TD × RR | F+I | Default from `TD.Phase` |
| `Task Phase Adjusted Roles` | `3e448570-2d16-446e-9635-35eb9b453597` | Dim → TPO | PV × TD × RR | F+I | `'Task Phase' [BY Constant: -> 'Adjust Responsible Role']` |
| `Task Lead/All_Region` ("Location") | `2cdd2bf4-1510-4cbe-ab88-3fe5e9d0ec48` | Dim → `Region Workload` | PV × TD × RR | F+I | Default from `TD.'Per Region'` |
| `In Country Resource` ("Manage Resource by Country?") | `017f9bdf-7c41-4395-878c-97c84f5ca8ef` | Boolean | PV × TD × RR | F+I | `IF('Task Role Defined - General Tasks', RR.'In Country Resource' [BY lastnonblank: RR])` |
| `Task Driver` | `f3e55f02-2700-4586-a8b1-714d784d8791` | Dim → `Core Driver` | PV × TD × RR | F+I | Default from `TD.'Core Driver'` |
| `Custom Driver` | `07dfee69-011e-4ac0-bd68-c53b8afad4d8` | Text | PV × TD × RR | F+I | Default from `TD.'Custom Driver'` |
| `Custom Driver Input` | `a959648b-891c-44cf-99ba-93e7f7bf2545` | Boolean | PV × TD × RR | F+I | `IF('Task Driver' = 'Core Driver'."Custom", TRUE)` — UI gate |
| `Task Workload Frequency` | `c5b834e7-eb6e-4043-bf66-893fcd2223b8` | Dim → `Workload Frequency` | PV × TD × RR | F+I | Default from `TD.'Workload Frequency'` |
| `Unit of Measure` | `18234919-0496-4dc6-969c-769813521a8f` | Dim → `Hours/Unit` | PV × TD × RR | F+I | Default from `TD.'Hours/Unit'` — "Hours" vs "Units" |
| `Units Input Needed` | `a80e6acb-3d90-4ef7-9c1d-5a61cf833a9c` | Boolean | PV × TD × RR | F+I | `IF('Unit of Measure' = 'Hours/Unit'."Units", TRUE)` — UI gate |
| `Unit -> Hours Input` | `96053042-813a-4ccf-8fe2-37836a84a147` | Decimal | PV × TD × RR | F+I | `TD.'Standard Hours Per Units (If Unit Type)' [BY lastnonblank…] * 'Task Complexity v2'` |
| `Task Complexity v2` ("Complexity") | `48123745-bf6f-47e0-8dbb-87b98bb90397` | Decimal | PV × TD × RR | F+I | `'Task Complexity - Standard' [add: PV][Filter: 'Complexity Type' = 'Project Complexity'][remove: 'Complexity Type']` — picks the column matching the project's complexity type |
| `Task Complexity` (v1, superseded) | `e3457ebf-3b3b-441d-b8a8-90d7b7054267` | Decimal | PV × TD × **Region** × RR | F+I | `IF(roleDefined, 'Task Complexity - Standard')` — not referenced downstream |
| `Task Unit Input` ("Hours Per / No Units") | `a5b2afec-1ab2-4f6e-8540-503ea1390f5e` | Decimal | PV × TD × **Region** × RR | F+I | `IF('Workload Relevant Region', IF('Unit of Measure'="Hours", TD.'Standard Hours/(Units)'[…] * 'Task Complexity v2', TD.'Standard Hours/(Units)'[…]))` — **the core editable number: hours per driver unit, or number of units** |
| `Display Measurement` | `26235ede-4e5b-4f80-94d6-30ebfcdf1c86` | Text | PV × TD × RR | F | Builds the human label, e.g. "Hours Per Site Per Month" or "Sites Total" |
| `Workload Duration Period` | `00830c47-065e-44ee-bf9f-babee5f77b87` | Decimal | PV × TD × **Month** × RR | F+I | `Resource_Selector_Milestone_Periods [BY: -> 'Task Phase'][remove Lastnonblank: 'Task/Phase Options']` — how many months the task runs |
| `Task - Option Price` ("Add to Option") | `808da1ec-2754-42a6-a4cb-031d0c0c12f6` | Dim → OP | PV × TD × RR | **I** | Moves a task into a priced option; blank ⇒ Main Scope |
| `Comments` | `fa820f8b-7f29-4a13-87c3-d8e819762493` | Text | PV × TD × RR | I | Free text on the estimating grid |

#### `/7. Tasks/Project Task Management/Driver Calculations` — all PV × TD × Country × RR, all `F`

Six alternative "how much driver volume does this task see" calculations, one per `Workload Frequency`, plus an aggregator and an hours adjuster.

| Metric | Id | Summary |
|---|---|---|
| `Country Driver Data Total` | `ba15f25c-7905-4b7a-b2c6-7cfa79ed8c0d` | Custom driver → `Task Unit Input × Patient Split %`; Phase Period → `Patient Split %`; otherwise `Drivers Data [BY: -> 'Task Driver']` |
| `Country Driver Data Per Month` | `51bf3e1d-a0e7-4938-8ee9-08315f38a899` | As above × `Resource_Selector_Milestone_Periods [BY: -> 'Task Phase'][remove sum: Month]` (number of months in the task's phase) |
| `Country Driver Data Total Per Site` | `e8d520ea-c1a2-4126-bbdf-24aba4758f86` | × `No. of Active Sites` |
| `Country Driver Data Per Month Per Site` | `0b6463d8-a683-4512-b306-4d7ea4cfbad7` | × `No. of Active Sites` × phase months |
| `Country Driver Data Total Per Patient` | `585fa45c-ea76-4e70-8bf5-3f4f781927ec` | × `Patient Split` |
| `Country Driver Data Per Month Per Patient` | `9b405aa5-2843-47b6-bdb9-edbe54b89196` | × `Patient Split` × phase months |
| `Country Driver Data Aggregated` | `836a3d94-0682-454e-86f6-8e103eda34ba` | 6-way `IF` on `Task Workload Frequency` selecting one of the six above |
| `Country Driver Data Aggregated_Hours_Adjustment` ("Total Units") | `05fe06f4-0ba9-498e-b650-a7a96e69f3bb` | `IF(UoM="Hours" AND driver="Custom", Aggregated ÷ Task Unit Input, Aggregated)` — strips the unit input back out for custom hour-based tasks so it is not double counted |

#### `/7. Tasks/Project Task Management/Outputs` — all `F`

| Metric | Id | Dimensionality | **Full formula / summary** |
|---|---|---|---|
| `Total Hours Estimate before role allocation` | `2d436cb8-c253-4386-84ea-8a3a6031d205` | PV × TD × Country × RR | `IF(Location="Lead Region Only", IF(UoM="Hours", TaskUnitInput[filter: LeadRegionBooleanByTD][remove:Region][BY constant:Country] × HoursAdj, … × HoursAdj × Unit→HoursInput), IF(Location="All Regions", IF(UoM="Hours", TaskUnitInput[BY:Country.Region] × HoursAdj, … × HoursAdj × Unit→HoursInput)))` |
| `Total Hours Estimate` | `2730b643-4c41-4ecf-bf30-bf27e0e99f57` | PV × TD × Country × RR | Same expression **plus `[BY SUM: -> 'Adjust Responsible Role']`** — re-attributes hours to the adjusted role |
| `Total Hours Estimate Region for Pricing` | `64c02e59-4667-406f-bbf9-676a297fafcf` | PV × TD × **Region** × RR | Same logic at Region grain (`'Country Driver Data Aggregated_Hours_Adjustment' [remove sum: Country]` / `[BY: Country.Region]`), then `[BY SUM: -> 'Adjust Responsible Role']` |
| `Total Hours Estimate Region for Pricing Mapped to Options` ("Hours Estimate") | `5c4f4232-a9b8-4e53-ab71-835b6305c478` | PV × TD × **OP** × Region × RR | `IFDEFINED('Task - Option Price', 'Total Hours Estimate Region for Pricing' [BY: -> 'Task - Option Price'], 'Total Hours Estimate Region for Pricing' [BY: 'Option Price'."2"])` — tasks with no option assignment default to Option Price **Name = 2 = Main Scope** |
| `Total Hours Estimate phased` | `391902e0-d75c-4d1f-a879-6d49befe4994` | PV × TD × Country × **TPO** × **Month** × RR | `'Total Hours Estimate' [BY: -> 'Task Phase'] * (Resource_Selector_Milestone_Periods / Resource_Selector_Milestone_Periods [remove sum: Month])` — spreads total hours over the months of the task's phase |
| `Total Days Estimate phased` | `acd6a173-e790-48bc-a0ae-bc2b855319ba` | same | `'Total Hours Estimate phased' / 8` |
| `Total Hours Estimate Study Phases` | `21d0c1e4-0f7e-4013-8811-2657bde4c03a` | **TS** × PV × TD × Country × Month × RR | `'Total Hours Estimate phased' [remove sum: 'Task/Phase Options'] * IFDEFINED(Milestone_Period, 1)` — **re-introduces `Task Stage` by flagging every stage live in that month** (see §9) |
| `Rate Per Task` ("Avg Rate Per Task") | `b835e2b3-399d-4565-b1b2-6d94e451cb42` | PV × TD × OP × Region × RR | `'Price (with Tasks)' / 'Total Hours Estimate Region for Pricing Mapped to Options'` |

### 4.5 `/8. Rate Cards`

#### `/Global Rate Card`

| Metric | Id | Type | Dimensionality | In | Summary |
|---|---|---|---|---|---|
| `Global Base Rates` ("Global Sell Rates") | `6279902b-f591-4bd4-9692-966300e3925e` | Decimal | **Currency × Region × RR** | I | Sell rate card |
| `Global Cost Rates` | `0cbc26c0-c3f7-49ec-b0ae-c89b950145d9` | Decimal | Currency × Region × RR | I | Cost rate card |
| `ExchangeRate_Euro` | `298da9eb-29d5-44f6-a2d8-d1a43320e339` | Decimal | Currency | I | Global EUR cross rates |
| `Global Base Rates (All Currencies)` | `a6b99ad1-e915-4926-865b-13d30c62d8ad` | Decimal | Currency × Region × RR | F | `((('Global Base Rates' * (1/ExchangeRate_Euro))[remove: Currency]) / (1/ExchangeRate_Euro))` — converts whatever currency a rate was entered in into every currency |
| `Global Cost Rates (All Currencies)` | `dffff9a1-fa89-43c3-b2e3-e71b18da3a47` | Decimal | Currency × Region × RR | F | Same pattern on cost |
| `Global Base Rates - Euro Only` | `3fe00b62-8269-498c-8133-3a3555cc095d` | Decimal | Currency × Region × RR | F | `'Global Base Rates (All Currencies)' [filter: Currency."EUR"]` |
| `Currency/Region` | `0b496bcf-8449-46a0-86c0-d7c3d3c6b80a` | Boolean | Currency × Region | F | `IFDEFINED(Region.'Rate Currency' [BY LASTNONBLANK: Region, Region.'Rate Currency'], TRUE)` — highlights the "native" cell for each region |

#### `/Project Version Rate Planning` — the pricing outputs

| Metric | Id | Type | Dimensionality | In | **Full formula** |
|---|---|---|---|---|---|
| `Change_By_Service` ("Rate Change") | `622be1c6-0fd3-44be-937d-d54c56b292c1` | Decimal | PV × Service | F+I | `0` — an editable % uplift/discount by service |
| `Project Version Rate Card` ("Project Rate Card") | `2fdc13ff-45e3-494e-94d6-2a1d06a052a5` | Decimal | PV × OP × Region × RR | F+I | `IFDEFINED('Total Hours Estimate Region for Pricing Mapped to Options'[remove sum: TD], 'Global Base Rates (All Currencies)'[add: PV][Filter: Currency='Budget Currency'][remove: Currency] * (1 + Change_By_Service [BY: -> RR.Service][remove: Service]))` — only populates rows that actually have hours |
| `Project Version Cost Rates` | `5659c99b-78b9-4120-8b5a-8aa5a1d6e3d2` | Decimal | PV × OP × Region × RR | F+I | Same with `Global Cost Rates (All Currencies)`, **no** `Change_By_Service` uplift |
| `Price (with Tasks)` | `61bc84a1-d0eb-43c6-a83f-b1acf573a83d` | Decimal | **PV × TD × OP × Region × RR** | F | `'Total Hours Estimate Region for Pricing Mapped to Options' * 'Project Version Rate Card'` |
| `Cost (with Tasks)` | `c7b674e8-bb27-4bfc-b76f-7d5079116661` | Decimal | PV × TD × OP × Region × RR | F | `'Total Hours Estimate Region for Pricing Mapped to Options' * 'Project Version Cost Rates'` |
| `Net Margin` | `e9206eef-f05d-4cd5-8c26-d675bb48168f` | Decimal | PV × TD × OP × Region × RR | F | `'Price (with Tasks)' - 'Cost (with Tasks)'` (shown on the board both as a value and as % of Budget) |
| `% of Budget` | `41108a2b-7bdc-45db-881d-7db8d5587e04` | Decimal | PV × TD × OP × Region × RR | F | `'Price (with Tasks)' / 'Price (with Tasks)' [remove sum: RR, OP, TD, Region]` |

### 4.6 `/9.`–`/13.` Summary, approvals, client output, resourcing

| Metric | Id | Folder | Type | Dimensionality | In | Summary |
|---|---|---|---|---|---|---|
| `Preparer Submission Notes` | `a5afdf43-4546-4094-aaea-ae043496e49e` | /9. Executive Summary | Text | PV | I | Narrative shown as a KPI on `00. Executive Summary` |
| `Request_Approvals` | `4ffc43a6-803a-4636-8ad3-db42e732d5cc` | /10. Approvers | Boolean | PV | I | The preparer's "submit for approval" switch, on `8. Cashflow Profile` |
| `Request_Approvals_ByL1` | `0dc4d666-c429-4108-b2ae-28122fe394a3` | /10. Approvers | Boolean | L1 × PV | F | `IF(L1."CLINICAL RESEARCH MONITORING" AND Request_Approvals, TRUE)` — **hard-coded to one department; not referenced downstream** |
| `Approver` | `fbe91a08-370c-42d1-a4de-c77d3f6d9a0a` | /10. Approvers | Dim → `Team` | L1 × PV | F | `Team [BY lastnonblank: Team.'L1 Approval'][add: 'Project Version']` |
| `Valid Approver` | `a29ba9d3-9b34-4d7f-87fb-1e068b6910f3` | /10. Approvers | Boolean | L1 × **User** × PV | F | `IFDEFINED(Team.'L1 Approval' [BY lastnonblank: Team.'L1 Approval', Team][BY: MATCH(User.Email, Team.email)][ADD: PV], TRUE)` — matches the signed-in user's email to a Team row |
| `Approve` ("Approve?") | `b39e569e-1b15-4861-9add-d0e53936a8d0` | /10. Approvers | Boolean | L1 × **User** × PV | **I** | The approval tick |
| `Date Approved` | `3a6f0cbf-b6c2-46ba-95ab-bca445ea31ae` | /10. Approvers | Date | L1 × **User** × PV | **I** | Manually typed date |
| `Approval Comments` ("Department Comments") | `8dab68e8-2efb-478e-a371-abf1952109bf` | /10. Approvers | Text | L1 × **User** × PV | **I** | |
| `Approved Notification` | `3f6ab917-57c0-47cb-afc1-a13cf4e4379d` | /10. Approvers | Boolean | L1 × **User** × PV | I | Unused by any view or automation |
| `Status_Approvals` | `6b72cdd8-2e43-4c1d-974e-093e4e35e040` | /10. Approvers | Dim → `Approval_Status` | L1 × PV | F | `IFDEFINED(Approver, IF(Approve [REMOVE lastnonblank: User], "Approved", IF(Request_Approvals [ADD: L1], "Awaiting Approval", "Awaiting Request Approvals")))` |
| `Date Approved_Display` | `6cbe2b68-d4d0-470e-87e4-6f1345857077` | /10. Approvers | Date | L1 × PV | F | `'Date Approved' [remove lastnonblank: User]` |
| `Approval Comments No User` | `3823ab4a-ffac-4515-8dfd-777e8cd736ad` | /10. Approvers | Text | L1 × PV | F | `'Approval Comments' [remove lastnonblank: User]` |
| `User Email` | `f557e56c-7ce7-46d6-92f0-52f93003eac9` | /10. Approvers | Text | User | F | `User.Email` |
| `Client_Summary_Unit_Type` | `86f0943b-3d57-4b91-b4e5-fa49db06b926` | /11. Client Facing Summary | Dim → `Client Facing Unit Type` | PV × TD | F+I | `TD.'Client Unit Type' [add: PV]` |
| `Client_Summary_Comments` ("Comments") | `d6671c92-eb28-4ba5-8222-d0f0a9eb3286` | /11. Client Facing Summary | Text | PV × TD | I | Client-facing note per task |
| `Reference Units_Client_Summary` | `d0bc0620-5e5b-44e8-824e-7f5fdb92518a` | /11. …/Summary (Remove Resource) | Decimal | PV × TD | F | 5-branch `IF` on the client unit type → Custom: `Task Unit Input [remove avg: Region, RR]`; Hour: `Total Hours Estimate [remove sum: RR, Country]`; Month: `Workload Duration Period [remove avg: RR][remove sum: Month]`; Site: `No. of Active Sites[remove sum: Country]`; Site/Month: sites × `Milestone - Months` |
| `Reference Units_Client_Summary_Add_Option` ("No. Units") | `07bf1dd0-5625-4377-ba70-8c811134b283` | same | Decimal | PV × TD × OP | F | `IF(ISDEFINED(Price_Client_Summary), 'Reference Units_Client_Summary'[ADD: OP])` |
| `Price_Client_Summary` | `4a77259b-cfbe-4da0-9254-96ae979fdc61` | same | Decimal | PV × TD × OP | F | `'Price (with Tasks)' [remove sum: RR, Region]` |
| `Unit_Price_Client_Summary` ("Unit Price") | `14950e80-bdd1-4bc6-818f-c95d9c05c1b4` | same | Decimal | PV × TD × OP | F | `Price_Client_Summary / 'Reference Units_Client_Summary_Add_Option'` |
| `Hours_Client_Summary` | `a005fef2-5520-455e-ad8f-18da9191b098` | same | Decimal | PV × TD × OP | F | `'…Mapped to Options' [remove sum: RR, Region]` |
| `Unit Type_Display` | `02465171-0a4e-40b6-96da-eeafd9972a4a` | same | Text | PV × TD | F | Custom→the custom driver text, else the unit-type name |
| `Unit Type_Display_Option_Price` ("Unit Type") | `4fd928e3-404a-44fc-8850-a577c1cd1c8f` | same | Text | PV × TD × OP | F | `IF(ISDEFINED(Price_Client_Summary), 'Unit Type_Display'[add: OP])` |
| `Services Included` | `4d73cc83-4161-4187-a69a-f1eede90600d` | /12. Executive Summary | Text | PV | F | `Service.Name[ADD: PV][BY: -> 'Service Active'][SELECT LASTNONBLANK: 'Y/N'."Yes"][REMOVE TEXTLIST: Service]` |
| `Services Excluded` | `c455a81e-576a-49b5-a7ee-cf397c57f22b` | /12. Executive Summary | Text | PV | F | Same with `"No"` |
| `Working Days Per Year` | `299637ad-b3dc-47e6-841a-a6d926885a86` | /13. Resourcing | Decimal | **(no dimensions)** | I | Global FTE denominator |
| `Target_Utilisation_Rates` ("Target Utilisation %") | `58e7c846-536b-4c1f-97c8-e33e14066eac` | /13. Resourcing | Decimal | Service | I | Utilisation assumption per service |
| `Total FTEs Estimate Study Phases` | `bd3db3bc-92d6-4f37-8432-23f75a8d0e9c` | /13. Resourcing | Decimal | TS × PV × TD × Country × Month × RR | F | `('Total Hours Estimate Study Phases' / ('Working Days Per Year'/12)) / Target_Utilisation_Rates [BY: RR.Service]` ⚠️ divides monthly hours by *days* per month, see §9 |
| `Country FTEs Estimate Study Phases` | `c8830e1f-c8bf-4ae2-87f5-8f0533cbe260` | /13. Resourcing | Decimal | same | F | `'Total FTEs Estimate Study Phases' [Filter: 'In Country Resource']` |
| `Region FTEs Estimate Study Phases` | `b232f740-0537-488d-91cf-f240078c72bf` | /13. Resourcing | Decimal | TS × PV × TD × **Region** × Month × RR | F | `'Total FTEs Estimate Study Phases' [BY: Country.Region][exclude: 'In Country Resource']` |
| `Total Resource FTEs Study Phases` | `3475da24-6d12-4bba-a8b1-052e9e7c3a02` | /13. Resourcing | Decimal | TS × PV × TD × Country × Region × Month × RR | F | `Country FTEs [BY: -> Country.Region] + Region FTEs [BY: Country."Undefined"]` |
| `FTE Opportunity Projects` | `51f04894-2320-4aa3-9d0c-e234179da8f4` | /13. Resourcing | Decimal | PV × Region × Month × RR | F | `'Total Resource FTEs Study Phases' [remove sum: Country, TD, TS]` |
| `FTE Current Project Workload` | `8a131861-0282-4d9d-b516-ff417594d223` | /13. Resourcing | Decimal | Region × Month × RR | **I** | Existing committed workload (hand-entered) |
| `FTE Total Capacity` | `3f4257ac-740a-4997-9a63-7212d6b96168` | /13. Resourcing | Decimal | Region × Month × RR | F+I | `Previous(Month)` — carries last month's capacity forward; seeded by manual entry |

### 4.7 `/14. Cashflow`

| Metric | Id | Type | Dimensionality | In | **Full formula** |
|---|---|---|---|---|---|
| `Project_Billing_Type` ("Billing Type") | `18b73eea-7c9a-44e4-8d03-a7d1bf6212ed` | Dim → `Billing_Type` | PV | F+I | `Billing_Type."Monthly Billing"` (default; can be switched to *Milestones*) |
| `Payment Terms` ("Payment Terms (Days)") | `4554ec77-3ad8-48c9-aa21-52476fca3bbf` | Decimal | PV | F+I | `45` |
| `Payment_Months` | `d66a09f5-0622-4490-a5cd-6a79538f9d1c` | Integer | PV | F | `'Payment Terms'/30` |
| `Standard Milestone Payments` | `f2478498-05ec-482f-8966-f877e2415aa1` | Decimal | **`Task Stage` only — no Project Version** | **I** | The global milestone-payment % per phase |
| `Milestone Payments` | `7813a1b0-a213-46b2-9d9f-b6262ca118d6` | Decimal | TS × PV | F+I | `'Standard Milestone Payments' [by constant: 'Project Version']` — replicates the global % onto every version, overridable |
| `Milestone_Acheivement` ("Milestone Achievement") | `d274cd5b-8ede-4885-a0cc-c1e6d671cab2` | Dim → **`Month`** | TS × PV | F | `TIMEDIM('Milestone - To', Month)` — the month each milestone completes |
| `Milestone Amount` | `361a6727-69c9-431d-8ccc-fac2f4c383b2` | Decimal | TS × PV | F | `'Phased Earnt Revenue' [remove sum: OP, Region, RR, TD, Month, 'Task Stage'] * 'Milestone Payments'` ⚠️ see §9 |
| `Milestone Billed Amounts` | `15db7f05-0df8-4bf3-b9ae-32187bcdc1a6` | Decimal | TS × PV × Month | F | `'Milestone Amount' [BY: -> Milestone_Acheivement]` — posts the amount into its achievement month |
| `Phased Earnt Revenue` | `a517cd23-9a7c-4c40-9565-02887b0a691e` | Decimal | **TS × PV × TD × OP × Region × Month × RR** | F | `('Price (with Tasks)' [BY: -> 'Task Phase'] * (Resource_Selector_Milestone_Periods / Resource_Selector_Milestone_Periods [remove sum: Month])) [remove sum: 'Task/Phase Options'] * IFDEFINED(Milestone_Period, 1)` |
| `Phased Cost` ("Cash Payments") | `78ea54a9-6001-4d52-9262-2fcc0a0a02f5` | Decimal | same | F | Same expression on `Cost (with Tasks)` |
| `Cash Receipts` ("Cash Position") | `8535c37a-42ea-495c-ac97-2d7ec1e243ed` | Decimal | PV × Month | F | `IF(Project_Billing_Type="Monthly Billing", 'Phased Earnt Revenue'[remove sum: TS, RR, OP, TD, Region][BY CONSTANT: Shift(Month,-Payment_Months)], 'Milestone Billed Amounts'[remove sum: TS][BY CONSTANT: Shift(Month,-Payment_Months)])` |
| `Peak_Cash_Position` | `99d5f206-15f9-4864-b1bf-5fd56663cb87` | Decimal | PV | F | `(CUMULATE(('Cash Receipts' - 'Phased Cost'[remove sum: OP, Region, RR, TD, TS]), Month)) [remove Min: Month]` — the most negative point of the cumulative cash curve |
| `Month_Filter_Cashflow` | `0ab55441-cfbc-432c-9aab-7992a975fe4e` | Boolean | PV × Month | F | TRUE where any of Cash Receipts / Phased Earnt Revenue / Phased Cost is defined — used to clip the chart's x-axis |

### 4.8 `/Calendar` and `/Security`

| Metric | Id | Type | Dimensionality | In | Summary |
|---|---|---|---|---|---|
| `Today` | `2dd8ee1e-c23c-4f33-8378-a5bcb066a543` | Date | (none) | I | Manually maintained "today" — not a live function |
| `Users roles` | `69fc650e-1958-4de3-982b-73c4935793ca` | Dim → `Role` | User | I | Assigns each of the 31 users a role (Reader/Contributor/Designer/Modeler/Admin) |
| `Lock invalid inputs` | `9fbf6137-af5a-4787-98ca-f5a7d8c7f191` | **AccessRight** | User × PV × TD × Region × RR | F | `IF('Valid Task Unit Input User', ACCESSRIGHTS(TRUE,TRUE), ACCESSRIGHTS(TRUE,FALSE))` — read always, **write only where the user's region/role/task cell is valid** |

### 4.9 Metrics dimensioned by `Project Version`, and what "Project Version: All" does

**150 of the 185 metrics carry `Project Version`.** The 35 that do not are the global/reference blocks: `L1/Service_FromL2`, `Win Likelyhood`, `Complexity Multiplier`, `Rates`, `Global Base Rates (EUR)`, `Band Lower/Upper Threshold`, `Band Value`, `Default Unit/Hrs per Unit/Hrs Driver/Hrs Banding/Responsible Person/Task Stage`, `Default Complexity Multipliers`, `Default Task Phase Span`, `Role <> Service`, `Global Base Rates`, `Global Cost Rates`, `ExchangeRate_Euro`, `Global Base Rates (All Currencies)`, `Global Cost Rates (All Currencies)`, `Global Base Rates - Euro Only`, `Currency/Region`, `FX Rate (EUR to)`, `FX Rate (USD to)`, `Task Complexity - Standard`, `Standard Milestone Payments`, `Working Days Per Year`, `Target_Utilisation_Rates`, `Today`, `Users roles`, `FTE Current Project Workload`, `FTE Total Capacity`, `User Email`.

**How "Project Version: All" aggregates.**

- `Project Version` is a flat dimension list with **no hierarchy and no roll-up parent**. Selecting "All" on a board page therefore applies the view's aggregation across every one of the 8 items.
- The default aggregator everywhere in this model is **Sum**. Every aggregation configuration recorded on the primary boards' views uses `Simple / Sum` (the only exceptions are `Milestone - From` = **Min** and `Milestone - To` = **Max** on view `73b10847-…`, and `Rate Per Task` = **Avg** on view `e56f52e8-…`). So "All" on any money or hours metric is a **straight sum across all 8 project versions**.
- **Nothing anywhere filters on `Version Type`.** `Version Type` has no formula reading it, appears in no view filter, and no metric references it. Consequently "Project Version: All" sums **`Current` and `Superseded` versions together**, and includes the **`Example X-Region 500 Patient Study`** template (whose parent Project has status `Template` and win likelihood 0%).
- Concretely, "All" today = `Project 1 (v1)` *(Superseded)* + `Project 1 (v2)` *(Current)* + `Project 2 (v1)` + `Project 4 (v1)` + `Example X-Region 500 Patient Study (v1)` + `Project 5 (v1)` + `Project 6 (v1)` + `Project 7 (v1)` — so **Project 1 is counted twice** and the example/template study is counted as if it were a real pipeline project.
- `Win Likelyhood` exists on `Project` and is never applied to any value metric, so there is no probability-weighted roll-up either.

**Which boards expose "All":** page configuration `singleModality` is `true` (i.e. exactly one version at a time) on only five boards — `4. Assumptions`, `6. Project Task Estimate`, `9. Department Review`, `00. Executive Summary`, `11. Resource Summary`. It is `false` on `2. Project & Budget Creation`, `5. Countries & Sites`, `5. Timeline Planning`, `7. Benchmark Project Budget`, `8. Cashflow Profile`, `10. Client Pricing Summary` and the parked boards — so **`8. Cashflow Profile` in particular can be, and by default is likely to be, showing a multi-version total.**

---

## 5. Tables

23 tables. "Used on boards" lists the boards whose widgets read a view over the table.

| Table | Id | Folder | Metrics grouped | Used on boards |
|---|---|---|---|---|
| `.Assumptions - Base` | `198dce65-b3b3-420c-9f73-0e89b9dff377` | /2. Base Assumptions | `Complexity Multiplier` | — (none) |
| `.Assumptions - Financial` | `e01ac02e-5cb4-432e-bacb-596da9c32893` | /3. …/1. Financial | `Budget Currency`, `Project Complexity` (+ hidden `Start Date`) | 4. Assumptions (view `d1dc841f-…`) |
| `.Assumptions - General` | `cf9fb249-39b8-4b24-81b0-e5a16a78a69c` | /3. …/2. General | Blinded Study, Indication, No. Patients Randomized, Program Phase, Protocol Version/Date, RFP Received Date, RFP Type, RFP Version #, Sponsor, Sponsor Location, Start Date, Study Drug, Study Protocol, Theraputic Business Unit, Unblinded team required? | 4. Assumptions (`d9fcf1a9-…`); 4. Executive Summary *(parked)* (`fb462b44-…`) |
| `.Assumptions - Service Active` | `900e8347-9b06-4cea-8854-e0ca131ce459` | /3. …/3. Services Active | `Lead Region`, `Service Active`, `Service Complexity` | 4. Assumptions (`639d713d-…`); 2.2 Staffing *(parked)* |
| `.Assumptions - Countries / Sites` | `1f700c9b-9e91-4226-aa49-ef1d2eae4fa2` | /3. …/4. Countries / Sites | Feasibility Assessment, Feasibility Site Outreach, Monitors, No. Countries for Site Management Support, No. of Active Sites, No. of Back-up Countries, No. of Back-up Sites, No. of Countries, No. Sites for Site Management Support, Patient Split, Sites for Qualification by Ergomed | 4. Assumptions (`6dcc055b-…`); 5. Countries & Sites (`6dcc055b-…`, `635dc0b4-…`, `f263639e-…`, `4656dfc0-…`) |
| `.Assumptions - Patients` | `f909a229-5944-42e3-85c2-7eab8cad522c` | /3. …/5. Patients | No. Patients Randomized, No. Patients Screened, No. Screen Failures, Screen Failure Rate (%) | 4. Assumptions (`7bc70ddd-…`); 5. Countries & Sites (`7bc70ddd-…`, `0220b100-…`) |
| `.Assumptions - Timeline` | `0a23a60b-b9a3-4e54-8a7c-91ea55777ad4` | /3. …/6. Timeline | `Default Task Phase Span`, `Milestone - From`, `Milestone - Months`, `Milestone - To` | 4. Assumptions (`73b10847-…`); 5. Timeline Planning (`73b10847-…`); 4. Executive Summary *(parked)* (`28bda094-…`) |
| `.Assumptions - Staffing` | `a4400b81-5d3d-4a84-8a74-9e78e164ab86` | /3. …/7. Staffing | `Headcount Assumption`, `Region <> Service`, `Role <> Service`, `Role <> Service (Project)` | 2.2 Staffing *(parked)* (`492d6b1f-…`, `3b961575-…`, `33123bdc-…`, `32634cff-…`) |
| `Task Setup` | `84e9507d-8192-49b0-95cc-09d08032b875` | /5. Global Tasks | Default Hrs Banding, Default Hrs Driver, Default Hrs/Unit, Default Responsible Person, Default Task Stage, Default Unit | 2.3. Global Task Defaults *(parked)* (`eb5047fa-…`, `66799604-…`); Task Setup *(parked)* (`b3abd687-…`) |
| `Band` | `b65fb123-38e9-4198-8a0d-231c89ffdc88` | /5. …/2. Drivers & Bands | Band Lower Threshold, Band Upper Threshold, Band Value | 2.3. Global Task Defaults *(parked)* (`636cdec8-…`) |
| `Budget Tasks` | `99457fd5-8394-457c-85ee-8e7cf9252a6b` | /6. Project Tasks | Default Hrs Banding, Default Hrs Driver, Default Hrs/Unit, Default Unit, No. Units, Project Hrs/Unit, Project Hrs/Unit Driver Value | 3. Budget *(parked)* (`f137a753-…`) |
| **`Project Task Manaement`** *(sic)* | `2445768a-fa0d-4760-9661-7c9bdacee629` | /7. …/Table Input | Adjust Responsible Role, Comments, Country Driver Data Aggregated_Hours_Adjustment, Custom Driver, Display Measurement, In Country Resource, Task - Option Price, Task Complexity v2, Task Driver, Task Lead/All_Region, Task Phase, Task Unit Input, Task Workload Frequency, Total Hours Estimate before role allocation, Unit -> Hours Input, Unit of Measure, Workload Duration Period | **6. Project Task Estimate** (`c4142647-…`) — the main estimating grid |
| **`Rate Card Planning - Project Version`** | `add833fb-77c5-4001-bb01-ab939df8c479` | /8. …/Project Version Rate Planning | Price (with Tasks), Project Version Rate Card, Rate Per Task, Total Hours Estimate Region for Pricing Mapped to Options | **6. Project Task Estimate** (`7bc08875-…`, `e56f52e8-…`) |
| `Global Rate Card` | `152540e7-5aa8-4846-b878-e9e5b2178c7a` | /8. …/Global Rate Card | Global Base Rates, Global Cost Rates | 3. Central Rates Management (`d27a3dde-…`) |
| **`[TBL] Executive Summary`** | `450bebed-6e91-48cf-8104-27c7ebc0d99f` | /9. Executive Summary | % of Budget, Cost (with Tasks), Net Margin, Price (with Tasks) | **00. Executive Summary** and **9. Department Review** (both via view `20a39aff-…`) |
| `[TBL] Approvals` | `22e9d321-e0d5-4355-a892-da0c9a495207` | /10. Approvers | Approval Comments, Approve, Date Approved | 9. Department Review (`50cf53c2-…`) |
| `[TBL] Approval Summary` | `a071e66b-c9f6-411a-813c-f49ef349cc16` | /10. Approvers | Approval Comments No User, Approver, Date Approved_Display, Status_Approvals | **00. Executive Summary** (`834ba283-…`) |
| `[TBL] Client Summary` | `63037a42-b360-4929-b1e4-a824276b7d52` | /11. Client Facing Summary | Client_Summary_Comments, Price (with Tasks), Reference Units_Client_Summary_Add_Option, Unit Type_Display_Option_Price, Unit_Price_Client_Summary | 10. Client Pricing Summary (`499a2ca2-…`) |
| `Exec Summary` | `3b98a145-dc61-4ca3-a156-c01a463467f9` | /12. Executive Summary | Services Excluded, Services Included | **00. Executive Summary** (`dc0e43b3-…`); 4. Executive Summary *(parked)* |
| `[TBL] Resource Capacity Summary` | `a663811d-1fdd-4d9a-93c6-db78604236b5` | /13. Resourcing | FTE Current Project Workload, FTE Opportunity Projects, FTE Total Capacity | 9. Department Review (`c7df2e4c-…`) |
| **`[TBL] Cashflow Assumptions`** | `2514bffa-6ec6-4f96-8081-be0343505455` | /14. Cashflow | Payment Terms, Project_Billing_Type | **8. Cashflow Profile** (`d8d8dfd9-…`) |
| **`[TBL] Cashflow Summary`** | `ec2e3300-8e25-454c-9cb4-3e5cfff890c6` | /14. Cashflow | Cash Receipts, Phased Cost, Phased Earnt Revenue | **8. Cashflow Profile** and **00. Executive Summary** (both via the *same* view `55be5e8a-…`) |
| **`[TBL] Milestone Schedule`** | `a66b7684-c0ab-43ba-8c69-7393d184f800` | /14. Cashflow | Milestone Amount, Milestone Payments, Milestone_Acheivement | **8. Cashflow Profile** (`fd51bda3-…`) |

---

## 6. Key calculation chains

### (a) Timeline — phase months → dates → monthly flags → milestone grid

1. **Inputs.** Two, and only two: `Start Date` (`4fb85253-…`, PV) and `Milestone - Months` (`2399554e-…`, Task Stage × PV). Everything else in the timeline is derived.
2. **Phase from-dates.** `Milestone - From` (`5950c727-…`) anchors the chain on the **Set-Up Period**, which starts on `Start Date`. The **Study Documents Development Period** is computed *backwards* from it (`('Start Date'-1) - ('Milestone - Months'*30.4)`, i.e. the SDD phase ends the day before the study starts). Every later stage starts where the previous one ended: `EDATE(PREVIOUS('Task Stage'), 'Milestone - Months'[SELECT: 'Task Stage'-1])`, walking the `Task Stage` list in ID order.
3. **Phase to-dates.** `Milestone - To` (`5c6f947b-…`) = `EDATE(From, Months) - 1`.
4. **Monthly phase flags.** `Milestone_Period` (`d80aa426-…`) = `PRORATA(Month, From, To+1)` — an 8 × 204 grid of values between 0 and 1 giving, for each stage, the fraction of each calendar month it occupies. This is what the Gantt on `00. Executive Summary` and `5. Timeline Planning` paints.
5. **Cross-milestone spans.** Many tasks straddle several stages (e.g. "SSU → DBL"). `Milestone_Period_Multi_Stages` (`a154b2a2-…`) builds a second, 10 × 204 grid by matching the first three characters of each `Dual Timeline Stages` name against `Task Stage.'Start Milestone'` and the last three against `Task Stage.'End Milestone'`, then PRORATA-ing between the two from-dates.
6. **The single lookup.** `Resource_Selector_Milestone_Periods` (`a04abc3b-…`) merges the two grids plus the `Milestone Group 1` roll-up ("Total Study Duration") into one metric keyed on `Task/Phase Options` × `Month` — **joined by string name matching (`MATCH(name, name)`), not by id.** Every downstream time-phasing in the model reads this one metric.

> Fragility to flag for the redesign: step 5 and step 6 both join on *text*. Renaming a `Task Stage`, a `Task/Phase Options` item, a `Dual Timeline Stages` item or a milestone abbreviation silently breaks the phasing with no error.

### (b) Pricing — drivers → hours → rates → price / cost / margin

```
Task Defintion (library)      Project assumptions
  Core Driver ────────┐         No. of Active Sites, Patient Split,
  Workload Frequency  │         No. of Countries, Feasibility …
  Standard Hours/Units│              │
  Per Region          │              ▼
  Role One…Five       │        Drivers Data  (PV × Core Driver × Country)
  Phase               │              │
  Associated Service  │              ▼
        │             └──►  Country Driver Data {Total | Per Month | Per Site |
        │                    Per Site/Month | Per Patient | Per Patient/Month}
        │                              │  (chosen by Task Workload Frequency)
        ▼                              ▼
  Task Role Defined ──►  Country Driver Data Aggregated
  (General / Specific)             │
        │                          ▼
        ▼             Country Driver Data Aggregated_Hours_Adjustment
  Task Unit Input  ───────────────►│
  (hrs per unit, editable)         ▼
                        Total Hours Estimate (PV × TD × Country × RR)
                                   │  [BY SUM: -> Adjust Responsible Role]
                                   ▼
                        Total Hours Estimate Region for Pricing (… × Region × RR)
                                   │  [BY: -> Task - Option Price], default Main Scope
                                   ▼
             Total Hours Estimate Region for Pricing Mapped to Options
                          (PV × TD × Option Price × Region × RR)
                                   │
        Global Base Rates (Currency × Region × Role)                Global Cost Rates
                   │ ×(1/FX)[remove Currency]/(1/FX)                        │
                   ▼                                                        ▼
        Global Base Rates (All Currencies)                 Global Cost Rates (All Currencies)
                   │ [Filter: Currency = Budget Currency]                   │
                   │ × (1 + Change_By_Service [BY: → Role.Service])         │
                   ▼                                                        ▼
        Project Version Rate Card ───────┐            ┌──── Project Version Cost Rates
                                          ▼            ▼
                        Price (with Tasks)        Cost (with Tasks)
                                    └──── Net Margin = Price − Cost ────┘
                                          % of Budget = Price ÷ ΣPrice
```

**In words.** A task in the library declares what it scales with (`Core Driver`), how often (`Workload Frequency`), whether it is done once for the lead region or in every region (`Per Region`), which phase it falls in, and up to five roles that perform it. For a given project version, a task is "live" only if its `Associated Service` is switched on in `Service Active` and at least one of its five roles resolves — that is `Task Role Defined - General Tasks` (or `… Specific Tasks` for project-custom tasks), and it is what makes the estimating grid sparse rather than 34 tasks × 27 roles × 46 countries.

`Drivers Data` converts the nine standard core drivers into a country-level count from the assumptions (sites, back-up sites, countries, patients screened/randomized/failed, feasibility assessments and outreach). The six `Country Driver Data …` metrics then scale that count by the workload frequency — per site, per patient, per month, or a combination — using `Resource_Selector_Milestone_Periods` for the number of months. `Country Driver Data Aggregated` picks whichever of the six matches `Task Workload Frequency`, and `…_Hours_Adjustment` removes the unit input again for custom hour-based tasks so it is not squared.

`Task Unit Input` is the number the estimator actually edits: either *hours per driver unit* (when `Unit of Measure` = Hours, multiplied by `Task Complexity v2`, which is the task's complexity multiplier for the project's complexity type) or *a number of units* (when = Units, multiplied by `Unit -> Hours Input` to convert). Multiplying the two gives `Total Hours Estimate`, with `[BY SUM: -> 'Adjust Responsible Role']` letting the estimator move a task's hours onto a different role without touching the library.

The same arithmetic is then run at Region rather than Country grain (`Total Hours Estimate Region for Pricing`) for pricing, and mapped onto `Option Price` — a task with no `Task - Option Price` value falls into Main Scope (`Option Price` where `Name = 2`).

Rates come from a single global card entered by currency × region × role, normalised into every currency via `ExchangeRate_Euro`, filtered to the project's `Budget Currency`, and uplifted by an optional `Change_By_Service` percentage. `Price = Hours × Rate`, `Cost = Hours × Cost Rate`, `Net Margin = Price − Cost`.

**By L1 / L2 / task and by department.** There is no departmental metric — the breakdown is done entirely by pivoting on `Task Defintion → L1 Task` and `→ L2 Task` (list properties), which is exactly what views `20a39aff-…` (Summary Budget by L1), `e56f52e8-…` (Internal Summary by Option → Service → L1 → L2 → Task), `fb4b9e13-…` (price by L1 bar chart) and `965a842b-…` (hours waterfall by L1) do. "Department" in this model = **`L1`**, and each L1 has one approver via `Team.'L1 Approval'`.

### (c) Cashflow — milestone schedule → receipts → payments → cash position → earnt revenue → peak drawdown

1. **Milestone percentages.** `Standard Milestone Payments` (`f2478498-…`) is a global input by `Task Stage` **with no Project Version dimension**. `Milestone Payments` (`7813a1b0-…`) = `'Standard Milestone Payments' [by constant: 'Project Version']` copies it onto every version, where it can be overridden.
2. **Milestone amount.** `Milestone Amount` (`361a6727-…`) = `'Phased Earnt Revenue' [remove sum: OP, Region, RR, TD, Month, 'Task Stage'] × 'Milestone Payments'`. Note the `remove sum` **includes `Task Stage`** — so the left-hand factor is the *whole project's* revenue, not that stage's, and the percentage is applied to it.
3. **Achievement month.** `Milestone_Acheivement` (`d274cd5b-…`) = `TIMEDIM('Milestone - To', Month)` — the calendar month in which each phase ends. `Milestone Billed Amounts` (`15db7f05-…`) = `'Milestone Amount' [BY: -> Milestone_Acheivement]` posts each amount into that month.
4. **Earnt revenue.** `Phased Earnt Revenue` (`a517cd23-…`) takes `Price (with Tasks)`, moves it onto `Task/Phase Options` via each task's `Task Phase`, spreads it across months in proportion to `Resource_Selector_Milestone_Periods`, collapses `Task/Phase Options`, then multiplies by `IFDEFINED(Milestone_Period, 1)` — which *re-introduces* the `Task Stage` dimension by putting a 1 against every stage whose window touches that month.
5. **Cash receipts.** `Cash Receipts` (`8535c37a-…`) switches on `Project_Billing_Type`: *Monthly Billing* shifts `Phased Earnt Revenue` forward by `Payment_Months` (= `Payment Terms` ÷ 30, default 45 days → 1.5); *Milestones* shifts `Milestone Billed Amounts` instead.
6. **Cash payments.** `Phased Cost` (`78ea54a9-…`) is the same phasing applied to `Cost (with Tasks)`, and is labelled "Cash Payments" on the chart — i.e. **cost is assumed to be paid in the month it is incurred, with no supplier payment terms**.
7. **Cash position.** The chart view `55be5e8a-…` does the arithmetic in the *view*, not in a metric: it shows `Cash Receipts` cumulated over Month, `Phased Cost` cumulated, and a third series — `Cash Receipts` again, renamed **"Cash Position"**, displayed as *Difference from another metric* against the cumulated `Phased Cost`. There is no `Cash Position` metric to bind a Frame to.
8. **Peak drawdown.** `Peak_Cash_Position` (`99d5f206-…`) = `CUMULATE(Cash Receipts − Phased Cost, Month) [remove Min: Month]` — the minimum of the cumulative net cash curve.

### (d) Versioning — how a new Project Version gets its inputs

**A new `Project Version` starts empty.** Specifically:

- There is **no data-copy mechanism**: `get_metric_to_metric_copy_configs` returns nothing for the project inputs (checked on `Task Unit Input` and `No. of Active Sites`), there are no `Cycles`, no automations and no import configurations referencing these metrics.
- The **Create New Version** button (`57f8ceb8-…` on board `6f77a0dd`) is a plain `AddListItem` action on the `Project Version` list with `shouldSetPageWithNewItem: true`. It adds a row and navigates the page to it — nothing more. The user then types `Project`, `Version`, `Version Type` and dates by hand.
- What *does* populate automatically are the **35 `FormulaWithManualInput` metrics**, which recalculate for the new version from the global library the moment `Service Active` is switched on: `Lead Region` (from `Sponsor Location`), `Service Complexity` (from `Project Complexity`), the whole `Table Input` block (`Task Phase`, `Task Driver`, `Task Workload Frequency`, `Unit of Measure`, `Task Unit Input`, `Task Complexity v2`, `Unit -> Hours Input`, `Adjust Responsible Role`, `Task Lead/All_Region`, `In Country Resource`, `Custom Driver`) from `Task Defintion`, `Project Version Rate Card` / `Project Version Cost Rates` from the global rate card, `Milestone Payments` from `Standard Milestone Payments`, `Payment Terms` = 45, `Project_Billing_Type` = Monthly Billing, `Change_By_Service` = 0.
- What does **not** carry over and must be re-entered for every version: `Start Date`, `Milestone - Months` (all 8 phases), `No. of Active Sites` / `No. of Back-up Sites` / `Sites for Qualification` per country, `No. Patients Screened` / `No. Patients Randomized` per region, `Service Active` for all 26 services, `Project Complexity`, `Budget Currency`, the whole `/2. General` study header, `Task - Option Price` assignments, `Comments`, `Preparer Submission Notes`, and every manual override previously made on a `FormulaWithManualInput` metric.
- **Changelog link.** `Change Log` is an independent dimension list whose only structural tie is the `Project Version` property (input). `Change Log.Project` and `Change Log.Version` are formulas derived from it (`'Change Log'.'Project Version'.Project` / `.Version`). There is **no reverse link** — no metric or property on `Project Version` points back at the change log, so nothing enforces that a new version has a changelog entry, and nothing on a budget board surfaces the change reason. `Change ID` is a manually typed integer, not a sequence.

### (e) Approvals — how status, approver, date and comments are stored

**Storage.** Three raw inputs are held at `L1 × User × Project Version`:

| What | Metric | Id | Written where |
|---|---|---|---|
| The approval tick | `Approve` | `b39e569e-…` | Board `9. Department Review`, table `[TBL] Approvals` via view `50cf53c2-…` ("Approve?") |
| The date | `Date Approved` | `3a6f0cbf-…` | same view — **typed by hand, not stamped** |
| The comment | `Approval Comments` | `8dab68e8-…` | same view ("Department Comments") |

A fourth input, `Approved Notification` (`3f6ab917-…`), exists at the same grain but appears on no view and is read by nothing.

**Reading back.** Because the raw inputs carry `User`, three `L1 × Project Version` formulas collapse that dimension for display on `00. Executive Summary`:

- `Status_Approvals` (`6b72cdd8-…`): `IFDEFINED(Approver, IF(Approve [REMOVE lastnonblank: User], "Approved", IF(Request_Approvals [ADD: L1], "Awaiting Approval", "Awaiting Request Approvals")))` — an L1 with no approver shows blank rather than a status.
- `Date Approved_Display` (`6cbe2b68-…`): `'Date Approved' [remove lastnonblank: User]`.
- `Approval Comments No User` (`3823ab4a-…`): `'Approval Comments' [remove lastnonblank: User]`.

**Who may approve.** `Approver` (`fbe91a08-…`) = `Team [BY lastnonblank: Team.'L1 Approval'][add: 'Project Version']` — a pure lookup from the `Team` list's `L1 Approval` property, the same for every project version. `Valid Approver` (`a29ba9d3-…`) matches the signed-in user's email to a `Team` row (`[BY: MATCH(User.Email, Team.email)]`) and returns TRUE for the L1 they own. It is placed on the Approvals view as a **hidden** column (`displayed: false`) — it is *informational only*; no access-right metric consumes it, so nothing prevents a different user from ticking `Approve`.

**Trigger.** The preparer sets `Request_Approvals` (`4ffc43a6-…`, Boolean × PV) on `8. Cashflow Profile`; that flips every L1 from *Awaiting Request Approvals* to *Awaiting Approval*. There is no notification, automation or workflow step — the state machine is entirely these three strings.

### (f) Benchmark — how the comparison project is selected

There is **no benchmark metric, flag, filter or lookup anywhere in the model.** The entire mechanism is the board's page configuration:

- Board `7. Benchmark Project Budget` (`142a098e-…`) declares `Project Version` as a page dimension with `singleModality: false` and two `defaultModalityReferences`, both `type: "Fixed"`:
  - `35c14df9-f384-4652-8df4-015721651eb4` → **Example X-Region 500 Patient Study (v1)**
  - `43799143-4b0c-48f9-9f09-4240ee2260ca` → **Project 4 (v1)**
- Every widget on the board puts `Project Version` on its **Columns** axis (views `965a842b-…` waterfall, `e7c19ddb-…`, `ccacb4aa-…`, `2a5022bc-…` KPIs) or its **Rows** axis (`196ecf33-…` FTE line chart), so the two selected versions render side by side and the waterfall shows the variance between them by L1.
- The "benchmark" project is an ordinary `Project` (`6fc65543-…`) whose only distinguishing marks are `Client = "Example"`, `Project Status = "Template"` and `Win Likelyhood = 0`. Nothing in the model reads `Project Status = "Template"`.
- To benchmark against a different project the user changes the page selection; to change the *default* pair someone must edit the board's page configuration.

---

## 7. Existing Frames

`search_frames` on application `7aa30303-07af-4861-a8e7-7bc1e0ea7d13` (with `showDetails: true`) returns **`{"frames": []}`**.

| Id | Name | Published | Bindings |
|---|---|---|---|
| — | — | — | — |

**There are no Frames in this application.** The redesign starts from a blank slate, which means:

- No existing binding conventions or naming to inherit or respect.
- The natural binding surface is the set of **23 tables** (§5) rather than raw metrics — each is already a curated bundle of metrics on a coherent grain, and the board views over them (§2) show the pivot layouts users already recognise.
- The single most valuable bindings for a redesign, by board:
  - **Estimating:** table `Project Task Manaement` (`2445768a-…`) + dimensions `Task Defintion`, `Responsible Role`, `Region`, `Project Version`.
  - **Pricing/margin:** table `Rate Card Planning - Project Version` (`add833fb-…`) and `[TBL] Executive Summary` (`450bebed-…`) + `Option Price`, `Task Defintion → L1 Task`.
  - **Timeline:** metrics `Milestone_Period` (`d80aa426-…`), `Milestone_Period_Multi_Stages` (`a154b2a2-…`), `Milestone - From/To/Months` + dimensions `Task Stage`, `Dual Timeline Stages`, `Month`.
  - **Cashflow:** tables `[TBL] Cashflow Summary` (`ec2e3300-…`), `[TBL] Milestone Schedule` (`a66b7684-…`), `[TBL] Cashflow Assumptions` (`2514bffa-…`) + metric `Peak_Cash_Position` (`99d5f206-…`). Note that "Cash Position" is a *view-level* calculation, not a metric — a Frame must compute `cumulative(Cash Receipts) − cumulative(Phased Cost)` itself.
  - **Approvals:** tables `[TBL] Approval Summary` (`a071e66b-…`) and `[TBL] Approvals` (`22e9d321-…`) + `L1`, `User`, `Team`.
  - **Resourcing:** metrics `Total FTEs Estimate Study Phases` (`bd3db3bc-…`), `Region FTEs Estimate Study Phases` (`b232f740-…`), `Country FTEs Estimate Study Phases` (`c8830e1f-…`) + `Month`.

---

## 8. Access and roles

### 8.1 What exists

| Object | Id | Kind | Notes |
|---|---|---|---|
| `/Security` folder | `846cbddd-743c-4edf-b446-41a1c7db9248` | Security folder | Excluded from `search_folders` by design; contains the three objects below |
| `Role` | `7596b18b-5a40-4eac-94ec-a65f6169cedc` | Dimension (5 items) | `Reader`, `Contributor`, `Designer`, `Modeler`, `Admin` — the stock Pigment set. Carries an `Access Rights` property (type `AccessRight`) and a `Permissions` property (type `Permission`) |
| `Users roles` | `69fc650e-1958-4de3-982b-73c4935793ca` | Metric, `Dimension → Role`, by `User`, ManualInput | Maps each of the 31 users in the shared `User` list to one role. Description: *"Defines a role for each user in the application"* |
| `Lock invalid inputs` | `9fbf6137-af5a-4787-98ca-f5a7d8c7f191` | Metric, type **`AccessRight`**, by `User × Project Version × Task Defintion × Region × Responsible Role`, Formula | `IF('Valid Task Unit Input User', ACCESSRIGHTS(TRUE,TRUE), ACCESSRIGHTS(TRUE,FALSE))` |

### 8.2 The one piece of cell-level security

`Lock invalid inputs` is the **only** access-rights metric in the application. `get_metric_dependencies` confirms `hasAccessRightsSecuritySettingsDependencies: true` and reports it attached as an ARM (access-rights metric) on **three blocks** (`0f1c6f58-5ba9-4112-8c92-63e4a462b7d5`, `dcfb4190-fbbb-469c-b43f-ddf6f72eacad`, `f2176388-f8bf-42dc-9316-ab2ed9cc89e7`). Those ids do not resolve through `search_metrics_and_lists` — they are security-scoped records, so **which three blocks are protected could not be confirmed** (recorded in Gaps). From the formula's dimensionality (`User × PV × TD × Region × RR`) the targets can only be the estimating-grid inputs, almost certainly `Task Unit Input` (`a5b2afec-…`) and its siblings.

Its effect: a user gets **read everywhere, write only where `Workload Relevant Region` is TRUE for them** — i.e. only on task/role/region cells that are actually in scope for the project version (service switched on, role resolved, and either the region has active sites or it is the service's lead region). This stops estimators typing into cells that the sparsity rules say should not exist; it is *not* a departmental or regional partition of the model.

### 8.3 What is **not** secured

- **No list-based access rights on `Project`, `Project Version`, `Client`, `Region`, `L1` or `Service`.** No metric of type `AccessRight` is dimensioned by any of them, so every user who can open the application can see and open **every project and every version**, including other clients' pricing and margins.
- **Approvals are not locked to the approver.** `Valid Approver` (`a29ba9d3-…`) computes who *should* approve each L1, but it is a `Boolean`, not an `AccessRight`, and it is carried on the Approvals view as a hidden column only. Nothing stops any contributor ticking `Approve` for any department, on any project version.
- **The Global Rate Card is not protected.** `Global Base Rates` (`6279902b-…`) and `Global Cost Rates` (`0cbc26c0-…`) are plain ManualInput metrics on board `3. Central Rates Management` — editable by anyone with contributor rights on that board. Likewise `Task Defintion`, `Task Complexity - Standard`, `Standard Milestone Payments`, `Role <> Service` and the whole `/5. Global Tasks` library: changing any of them re-prices **every project, past and present** (the note widget `73e8c78b-…` on board `2.3. Global Task Defaults` says exactly this: *"Changing Global Task setting would impact future and past project costings. Need to include some versioning to allow for changes in future projects without impacting historic"*).
- **No board-level access rights** are recorded on any of the 22 boards (`get_board` returns no security configuration).

### 8.4 Blocks writable by a non-admin (Contributor) role

Any metric with `inputSettings` of `ManualInput` or `FormulaWithManualInput` is writable wherever it is placed on a board. Grouped by who does the writing:

| Persona | Board | Writable blocks |
|---|---|---|
| **Budget preparer** | `2. Project & Budget Creation` | Lists `Project`, `Project Version`, `Change Log` (all properties) |
| | `4. Assumptions` | `Project Complexity`, `Budget Currency`, the 14 `/2. General` header metrics, `Service Active`, `Lead Region`*, `Service Complexity`*, `No. Patients Screened`, `No. Patients Randomized`, `No. of Active Sites`, `No. of Back-up Sites`, `Sites for Qualification by Ergomed`, `No. Countries for Site Management Support`*, `No. Sites for Site Management Support`*, `Milestone - Months` |
| | `5. Countries & Sites` | `No. Patients Screened/Randomized`, `No. of Active Sites`, `No. of Back-up Sites` (country grid) |
| | `5. Timeline Planning` | `Milestone - Months` |
| | `6. Project Task Estimate` | The whole `Table Input` block — `Adjust Responsible Role`*, `Task Phase`*, `Task Lead/All_Region`*, `In Country Resource`*, `Task Driver`*, `Custom Driver`*, `Task Workload Frequency`*, `Unit of Measure`*, `Unit -> Hours Input`*, `Task Complexity v2`*, `Task Unit Input`* (**gated by `Lock invalid inputs`**), `Workload Duration Period`*, `Task - Option Price`, `Comments`; plus `Project Version Rate Card`*, `Change_By_Service`*; plus new rows on lists `Task Defintion` and `Option Price` |
| | `8. Cashflow Profile` | `Project_Billing_Type`*, `Payment Terms`*, `Milestone Payments`*, `Request_Approvals` |
| | `00. Executive Summary` | `Preparer Submission Notes` |
| **Departmental approver** | `9. Department Review` | `Approve`, `Date Approved`, `Approval Comments` (at `L1 × User × Project Version`) |
| **Administrator / modeller** | `1. Master Task Definition` | List `Task Defintion` (all properties), `Task Complexity - Standard`* |
| | `3. Central Rates Management` | `Global Base Rates`, `Global Cost Rates` |
| | `Team Assignment` | List `Team` (`Name`, `email`, `L1 Approval`) |
| | *(no board)* | `Standard Milestone Payments`, `Working Days Per Year`, `Target_Utilisation_Rates`, `FTE Current Project Workload`, `FTE Total Capacity`*, `Win Likelyhood`, `Users roles`, `Role <> Service`, `ExchangeRate_Euro`, `FX Rate (EUR to)`, `FX Rate (USD to)`, `Today`, `Approved Notification`, `Active Task Input`, `Client_Summary_Unit_Type`*, `Client_Summary_Comments`, `Budget FX Rate (EUR to)`* |

\* = `FormulaWithManualInput` — the cell shows a computed default until a user types over it, and the override then persists silently. There is **no "is overridden" indicator metric anywhere in the model**, so a redesigned UI should consider surfacing override state explicitly.

---

## 9. Anomalies

### 9.1 The Cashflow Profile figures — Milestone Payments = 800%, Milestone Amount = 10,582,413 vs a Summary Budget of 553,616

This is not one bug but **three compounding defects**. Taken together they fully account for a Milestone Amount an order of magnitude above the budget.

#### Defect 1 — the milestone percentages are not a schedule, they are eight 100%s

`Standard Milestone Payments` (`f2478498-05ec-482f-8966-f877e2415aa1`) is a `ManualInput` metric dimensioned by **`Task Stage` only**. There are 8 Task Stages. `Milestone Payments` (`7813a1b0-…`) is `'Standard Milestone Payments' [by constant: 'Project Version']`, which copies each stage's value unchanged onto every project version.

A column total of **800% across 8 stages is exactly 100% per stage**. The intended semantics — a payment schedule whose parts sum to 100% of the contract — are nowhere enforced: there is no normalisation in the formula, no validation metric, and no conditional format flagging a total ≠ 100%. Someone has entered `1` (100%) in each of the eight rows, probably reading the cell as "this milestone is 100% complete" rather than "this milestone releases 100% of the fee".

**Effect:** the milestone schedule bills the whole contract eight times over.

#### Defect 2 — `Milestone Amount` multiplies the *whole project's* revenue by a *per-stage* percentage

```
Milestone Amount =
  'Phased Earnt Revenue' [remove sum: 'Option Price', Region, 'Responsible Role',
                          'Task Defintion', Month, 'Task Stage']
  * 'Milestone Payments'
```

The `remove sum` list **includes `Task Stage`**. The left-hand factor is therefore a single scalar per project version: total earnt revenue across all phases and all months. It is then multiplied by each stage's percentage.

That is the correct construction *if and only if* the percentages sum to 100%. With Defect 1 in play, every one of the 8 rows equals the whole project's revenue, and the column totals **8 × total revenue**.

`10,582,413 ÷ 8 = 1,322,802` — so the underlying `Phased Earnt Revenue` grand total on that page is about **1.32 m**, against a Summary Budget of **553,616**, a further factor of ~2.4. Defects 3 and 4 explain that residual.

#### Defect 3 — the two figures are not measured over the same population

`Summary Budget` on `00. Executive Summary` (view `20a39aff-…`) and `Milestone Amount` on `8. Cashflow Profile` (view `fd51bda3-…`) are scoped differently by their **boards**, not by their formulas:

| | `00. Executive Summary` | `8. Cashflow Profile` |
|---|---|---|
| `Project Version` page | `singleModality: **true**` — exactly one version | `singleModality: **false**` — many versions or *All* |
| `Option Price` page | present (a page dimension the user can narrow) | **not a page dimension at all** — `Milestone Amount` removes it with `remove sum`, so *all* options are always included |
| `Region`, `Responsible Role`, `L1`, `Task Defintion` pages | present (hidden, but narrowable) | not present |

So 553,616 is one project version (and possibly one option) of `Price (with Tasks)`, whereas 10,582,413 can legitimately be **the sum across several — or all eight — project versions**, with every option included. As established in §4.9, nothing filters on `Version Type`, so "All" also double-counts Project 1 (v1 Superseded **and** v2 Current) and includes the `Example X-Region 500 Patient Study` template.

**This is the largest single contributor to the residual 2.4×** and the first thing to check: set the Cashflow board's `Project Version` page to the same single version as the Exec Summary and re-read both numbers.

#### Defect 4 — `Phased Earnt Revenue` itself exceeds `Price (with Tasks)` when summed over `Task Stage`

```
Phased Earnt Revenue =
  ('Price (with Tasks)' [BY: -> 'Task Phase']
   * (Resource_Selector_Milestone_Periods / Resource_Selector_Milestone_Periods [remove sum: Month]))
  [remove sum: 'Task/Phase Options']
  * IFDEFINED(Milestone_Period, 1)
```

Up to `[remove sum: 'Task/Phase Options']` this is a clean allocation: total price, spread over months, summing back to total price. The final term is the problem. `Milestone_Period` is `PRORATA(Month, From, To+1)` at `Task Stage × Month` grain, so in a month where one phase ends and the next begins **both stages have a non-blank (fractional) value**. `IFDEFINED(…, 1)` collapses any non-blank to **1**, so that month's revenue is written in full against *both* stages. With 8 phases there are 7 such boundary months, and any phase whose `Milestone - Months` produces an overlapping window adds more.

Consequently **any total that aggregates `Phased Earnt Revenue` over `Task Stage` is larger than `Price (with Tasks)`** — and `Milestone Amount`'s `[remove sum: … 'Task Stage']` does exactly that. `Phased Cost`, `Total Hours Estimate Study Phases` and therefore the whole `/13. Resourcing` FTE chain share the identical `IFDEFINED(Milestone_Period, 1)` construction and the identical inflation.

The intended construction is a *weight*, not a flag — `Milestone_Period` itself (the PRORATA fraction, which sums to 1 across stages within a month), not `IFDEFINED(…,1)`.

#### Recommended checks, in order

1. Pin both boards to the same single `Project Version` and re-read. If 10,582,413 collapses to roughly `8 × 553,616 = 4.43 m`, Defect 3 is the residual and Defects 1–2 are the 8×.
2. Sum `Milestone Payments` down the Task Stage column: it should be 100%, it is 800%. Fix `Standard Milestone Payments` (or normalise it in `Milestone Payments`).
3. Compare `Phased Earnt Revenue [remove sum: everything]` against `Price (with Tasks) [remove sum: everything]` for one version. Any gap is Defect 4.
4. Because `Cash Receipts` reads `Phased Earnt Revenue` (Monthly Billing) or `Milestone Billed Amounts` (Milestones), and `Peak_Cash_Position` reads both, **every figure on the Cashflow Profile board and the cashflow chart on the Executive Summary is affected by Defects 1, 2 and 4.** The cashflow section of the redesign should be treated as unvalidated.

### 9.2 Other anomalies

| # | Finding | Evidence |
|---|---|---|
| 1 | **`5. Timeline Planning` lives in the `Not in Use` board folder** yet is linked from `0. INTRO` and `0. Summary Overview` and hosts the only editable view of `Milestone - Months` outside `4. Assumptions`. Either the folder is wrong or the board is orphaned. | Board `fec768c2-…`, `folderId: 951c318c-…` (`/Not in Use`); nav cards `2968be4c-…` on both intro boards point at it |
| 2 | **A text widget links to a different application.** The instructions panel on `5. Timeline Planning` hyperlinks to `pigment.app/w/viridian/application/d5972b94-df7a-4417-b43a-9865cc1dee45/boards/8cd1ea81-…`, which is the retired `[OLD] Clinical Trial Commercial Finance` app, labelled "4. Assumptions". Users following it leave this application. | Widget `590c7f6e-37c4-4b23-bddf-c40b8f54f233` |
| 3 | **`0. Summary Overview` has a mis-targeted navigation card.** Its "Workflow Management and Assignment of Approvals" card (`3038288b-…`) points at `3. Central Rates Management` (`0900a49b-…`); the same card on `0. INTRO` correctly points at `Team Assignment` (`91b9b3e3-…`). Its "Manage Budget Approvals" card also points at `00. Executive Summary` rather than `9. Department Review`. | Board `7251dc86-…` |
| 4 | **Two near-identical landing boards.** `0. INTRO` and `0. Summary Overview` are both in `/Demo` and duplicate 16 nav cards. Only one should survive the redesign. | Boards `59b5b677-…`, `7251dc86-…` |
| 5 | **The Cashflow chart view is shared by two boards.** View `55be5e8a-…` is the widget source on both `8. Cashflow Profile` and `00. Executive Summary`. Any formatting or pivot change on one silently changes the other. | `search_views` → `referringVisibleBoardNames: ["8. Cashflow Profile","00. Executive Summary"]` |
| 6 | **Roughly 200–300 orphaned views.** `search_views` with `usedInBoards: false` returns 3 pages of up to 100 each, against only 75 board-bound views. Many are obvious duplicates (six near-identical "department resources by region" charts, five `Band`-by-`Task Driver Banding` grids, a dozen `Project Version`-by-`Task Defintion` config views). | `search_views` |
| 7 | **`Site Managers` is mapped to the wrong service.** The `Responsible Role` item `Site Managers` (`9db56cc3-…`) has `Service = Pre-IND/IND` (`8fd713a6-…`), while `Lead Site Managers` (`7d681b04-…`) correctly has `Service = Site Management`. Because `Role <> Service` and `Headcount Assumption` key off this property, Site Manager capacity is attached to the wrong service and to the wrong `Target_Utilisation_Rates`. | `Responsible Role` list items |
| 8 | **Four `Responsible Role` items are incomplete.** `Feasibility Specialist` (`5a184a33-…`), `Legal Consultant` (`b91ca5fc-…`) and `Statistical Programmer` (`387cc2ba-…`) have no `Region Link`, no `Staffing Assumptions Driver` and no `Task Hrs Driver`. `Headcount Assumption` returns blank for them, so they never appear in the resourcing curves. | ibid. |
| 9 | **`Junior Monitor` shares its `Task Hrs Driver` with `Monitor`** (`418b9292-…`), so any legacy driver-based calculation double counts monitoring hours. | ibid. |
| 10 | **L1 departments 10 and 11 have no approver.** `Team.'L1 Approval'` covers L1 ranks 1–9 only, so `Approver` is blank for `10 SITE SUPPORT SERVICES: SITE MANAGEMENT` and `11 SITE SUPPORT SERVICES: STUDY PHYSICIANS`, and `Status_Approvals` (which is wrapped in `IFDEFINED(Approver, …)`) returns blank rather than a status for them. Those departments can never be approved. | `Team` list; `Status_Approvals` formula |
| 11 | **`Request_Approvals_ByL1` is hard-coded to one department.** `IF(L1."CLINICAL RESEARCH MONITORING" AND Request_Approvals, TRUE)` — a literal L1 reference. The metric is read by nothing, so it is dead code, but it is a trap for anyone extending the approvals model. | `0dc4d666-…` |
| 12 | **`Date Approved` is typed by hand.** There is no `NOW()`/`TODAY()` stamping and no automation, so the approval date is unverifiable. The `Today` metric (`2dd8ee1e-…`) is itself a manual input, not a live date. | `3a6f0cbf-…`, `2dd8ee1e-…` |
| 13 | **`Approve` is not restricted to the valid approver.** `Valid Approver` is computed and then hidden on the view; no `AccessRight` metric consumes it. | View `50cf53c2-…`, metric `a29ba9d3-…` |
| 14 | **`Approved Notification` (`3f6ab917-…`) is an input on no view and read by no formula** — dead. Likewise `Active Task Input` (`14e2be89-…`), `Before/After` (`82fe1a56-…`), `Template` (`958e7126-…`), `FX Rate (USD to)` (`a91e3915-…`), `Client Facing Task Definition` (`784ff596-…`, 96 items, bound to nothing) and `Task Complexity` v1 (`e3457ebf-…`, superseded by `Task Complexity v2`). | `get_metric_dependencies`, `search_views` |
| 15 | **`FTE Total Capacity` is `Previous(Month)` with nothing seeding it.** `3f4257ac-…` is `FormulaWithManualInput` whose formula is just `Previous(Month)` — it carries forward whatever was typed into the first month. If no month is seeded the whole capacity line is blank, and the capacity chart on `9. Department Review` shows demand against nothing. | `3f4257ac-…` |
| 16 | **The FTE conversion divides monthly hours by working *days*.** `Total FTEs Estimate Study Phases` = `('Total Hours Estimate Study Phases' / ('Working Days Per Year'/12)) / Target_Utilisation_Rates`. `Working Days Per Year`/12 is working **days** per month (~21), but the numerator is **hours**. The result is "days-equivalent per month", not FTE, unless `Working Days Per Year` has secretly been populated with working *hours* per year. Worth confirming the entered value. | `bd3db3bc-…` |
| 17 | **Timeline joins are by text, not by id.** `Milestone_Period_Multi_Stages` matches `LEFT(name,3)` / `RIGHT(name,3)` against `Task Stage.'Start Milestone'` / `'End Milestone'`; `Resource_Selector_Milestone_Periods` uses `MATCH(name, name)` three times across `Task/Phase Options`, `Task Stage`, `Milestone Group 1` and `Dual Timeline Stages`. Renaming any item in four different lists silently zeroes the phasing. | `a154b2a2-…`, `a04abc3b-…` |
| 18 | **`Task Stage` stage 8 has no `Milestone Group 2`,** and stages 4 and 5 have no `End Milestone`, stage 5 has neither start nor end milestone. The `Dual Timeline Stages` matching therefore cannot resolve any span that should end at Treatment/Follow-Up. | `Task Stage` list items |
| 19 | **`Milestone Group 1` and `Milestone Group 2` each hold exactly one item** (`Total Study Duration`, `Study Finalisation`), so the two grouping levels on the Timeline view produce a single fixed header row each rather than a meaningful hierarchy. | Lists `c179deec-…`, `a085545f-…` |
| 20 | **`Option Price.Name` is an Integer and the model references it by literal.** `Total Hours Estimate Region for Pricing Mapped to Options` falls back to `'Option Price'."2"` — and `Main Scope` happens to have `Name = 2` while the one real option has `Name = 1`. Any new option created with the **Add New Option Price** button gets an arbitrary `Name`, and if one is ever given `Name = 2` the Main Scope fallback silently re-points. | `5c4f4232-…`; `Option Price` items |
| 21 | **The `Change Log` list has no display property set**, so every row renders as a raw Project GUID in the "Version Changelog" grid on `2. Project & Budget Creation`. | List `297f4a64-…`, items |
| 22 | **A new Project Version copies nothing.** No copy configuration, cycle or automation exists (§6d). Every project assumption, timeline input, site/patient count and option assignment must be re-keyed for v2 of a project. This is the single biggest usability gap in the current build. | `get_metric_to_metric_copy_configs` (empty), `list_cycles` (empty) |
| 23 | **Nothing filters on `Version Type`.** `Current` vs `Superseded` is captured but never used, so any multi-version aggregation double counts superseded budgets (§4.9). | No formula, filter or view references `390c55f2-…` |
| 24 | **The global libraries are unversioned.** Editing `Global Base Rates`, `Task Defintion`, `Task Complexity - Standard` or `Standard Milestone Payments` retrospectively re-prices every historic project version. The build team flagged this themselves in a note widget on `2.3. Global Task Defaults`. | Widget `73e8c78b-…`; `hasMultipleFormulas: false` on all metrics (no scenario dimension) |
| 25 | **`Phased Cost` is labelled "Cash Payments" but has no payment terms.** Receipts are shifted by `Payment_Months`; costs are not shifted at all. The cash position is therefore optimistic by roughly the supplier payment period. | `78ea54a9-…`, `8535c37a-…` |
| 26 | **Persistent misspellings baked into block names**, which Frame bindings must reproduce exactly: `Task Defintion` (list `7c1475b1-…`), `Project Task Manaement` (table `2445768a-…`), `Milestone_Acheivement` (metric `d274cd5b-…`), `Win Likelyhood` (metric `67fcc6fb-…` and the `Project` property), `Theraputic Business Unit` (metric `075f22b0-…`, displayed correctly as "Therapeutic Business Unit"), `Feasability Assessments` (`Core Driver` item `987dec10-…`). | Block names throughout |
| 27 | **Two `Service` items contain embedded newlines** — `Scientific\n  Advice` (`ceb0cff0-…`) and `Site\n  Management` (`1354e94a-…`), as do several `Responsible Role.Alt Name` values and most `Task` names. These originate from a spreadsheet paste and will render awkwardly in any Frame that prints them raw. | `Service`, `Responsible Role`, `Task` list items |
| 28 | **`Region Top Level Group` and `Service Group` each have exactly one item**, so both "grouping" dimensions are decorative. | Lists `71bc870f-…`, `05e17177-…` |
| 29 | **`Date Released` is empty on all 8 project versions** and `Date Initiated` is empty on 3 of them, so no version lifecycle can be derived from dates. | `Project Version` items |
| 30 | **Seven of the twenty-two boards are parked but still reachable.** The `/Not in Use` folder holds a complete parallel legacy engine (`Task`/`Unit`/`Default Hrs …`/`No. Units`/`Project Hrs/Unit`) that is still calculating — 19 metrics and 3 tables that feed nothing. Removing them would simplify the model materially. | Folder `951c318c-…` |

---

## 10. Gaps

Everything requested was retrievable except the following.

| # | Gap | Why | Impact |
|---|---|---|---|
| 1 | **No cell values could be read.** `query_data` failed with `NoAiVisibleMetric`, and `get_ai_metrics` confirms **zero** metrics are flagged AI-visible in this application. | The MCP data-read surface requires at least one AI-visible metric. | §9.1 is a derivation from formulas and dimensionality, not an arithmetic reconciliation against live cells. The three recommended checks at the end of §9.1 need to be run in the UI. Item counts and list-item property values *were* readable via `get_list_items` and are exact. |
| 2 | **The three blocks protected by `Lock invalid inputs` could not be identified.** `get_metric_dependencies` returns ARM ids `0f1c6f58-5ba9-4112-8c92-63e4a462b7d5`, `dcfb4190-fbbb-469c-b43f-ddf6f72eacad`, `f2176388-f8bf-42dc-9316-ab2ed9cc89e7`; none resolve through `search_metrics_and_lists` (they are security-scoped records). | Security blocks are not exposed by the search tools. | §8.2 infers the targets from the metric's dimensionality. Confirm in the Pigment UI under the block's Access Rights tab. |
| 3 | **The `/Security` folder's full contents are not enumerable.** `search_folders` excludes security folders by design; the folder id (`846cbddd-743c-4edf-b446-41a1c7db9248`) was recovered from block metadata and three objects were found by other means (`Role`, `Users roles`, `Lock invalid inputs`). | Documented tool behaviour. | There may be further security objects not listed in §8. |
| 4 | **`Role.Access Rights` and `Role.Permissions` values were not read.** `get_list_items` returns the display property and requested scalar properties; `AccessRight` and `Permission`-typed property values are not returned. | Tool limitation. | §8.1 records that the properties exist but not what each of the five roles actually grants. |
| 5 | **Orphaned views were not enumerated in full.** `search_views` with `usedInBoards: false` returns 3 pages; only page 1 (100 rows) was read. | Volume; they are bound to no board and therefore out of scope for the redesign. | The "~200–300 orphaned views" figure in §1.1 and §9.2 #6 is a range, not an exact count. |
| 6 | **`Country` (46 items) and `Client Facing Task Definition` (96 items) item lists were not extracted**, and `Task Defintion` (34), `Task Hrs Driver` (26) and `Country` property values were only sampled. | Over the 50-item threshold set for "small lists" in the brief, or not board-bound. | Structure and property definitions for all of them are complete in §3; only the item values are omitted. |
| 7 | **Widget pixel geometry is recorded only for the eight primary boards.** | Volume. | `widgetPosition` (`x`, `y`, `width`, `height` on a 12-column grid) is available from `get_board` for every board if the redesign needs to reproduce layouts. |

---

*Extract produced read-only. No `create_*`, `update_*`, `delete_*`, `publish_*`, `save_draft_views` or `set_*` tool was called against the application.*
