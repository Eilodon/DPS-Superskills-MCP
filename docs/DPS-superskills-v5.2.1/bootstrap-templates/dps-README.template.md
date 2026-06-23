# DPS — Design Proof Specification
> **DPS VERSION:** `5.0-template`
> **DPS PROFILE:** `DPS-Standard` *(chọn: `DPS-Lite` / `DPS-Standard` / `DPS-Critical`)*
### {{TÊN_DỰ_ÁN}} · v{{VERSION}} · compatible with: [CONTRACTS v{{X}}, BLUEPRINT v{{Y}}, ADR v{{Z}}]
> Specification đủ chính xác để tạo **proof-ready pre-code architecture artifact** —
> sau đó promote thành **implementation SSOT** và sống tiếp như **living spec** của dự án.


> **DPS STATUS:** `DRAFT` *(chọn: `DRAFT` / `PROOF-READY` / `APPROVED-SSOT` / `IMPLEMENTATION-ACTIVE` / `LIVING-SPEC` / `SUPERSEDED`)*
> **PROMOTED BY:** {{WHO}} · **PROMOTED AT:** {{YYYY-MM-DD}}
> **PROMOTION BASIS:** {{review / stress-test / spike / audit / validation evidence}}
> **CURRENT AUTHORITY:** `DPS` *(default template value)* — nếu không phải `DPS`, ghi rõ lý do và phạm vi.
>
> **Rule:** `DRAFT` chưa được dùng làm source để agent implement. Chỉ `APPROVED-SSOT`, `IMPLEMENTATION-ACTIVE`, hoặc `LIVING-SPEC` mới là implementation authority.
---

## Four canonical files, four responsibilities

| File | Trả lời câu hỏi | Dùng khi | Ownership |
|---|---|---|---|
| `README.md` | **Theo luật nào?** — Lifecycle, governance, promotion, sync policy | Promote DPS; audit process; route agents | Governance canonical |
| `CONTRACTS.md` | **Cái gì?** — Types, schemas, I/O contracts | Thiết kế data model; spot type bugs; generate types/interfaces | Contract canonical |
| `BLUEPRINT.md` | **Như thế nào?** — Behavior, pseudocode, state machine | Implement logic; verify correctness; generate code | Behavior canonical |
| `ADR.md` | **Tại sao?** — Decisions, alternatives, trade-offs | Iterate architecture; onboard người mới; review với team | Decision canonical |

> **Canonical ownership rule:** Chỉ 4 file trên được sửa tay. `DPS_INDEX.yml`, `.agent/*`, và `.dps/DPS_LOCK.yml` là generated sidecars. Nếu sidecar conflict với canonical, canonical thắng và phải chạy lại `./tools/dps.py sync`.

---

## Hai Arcs của DPS

**Arc 1 — Proof at t=0:** *"Design này có đúng không tại thời điểm viết?"*

Arc 1 chạy một lần. CONTRACTS.md, BLUEPRINT.md, ADR.md đều phục vụ Arc 1 — biến intent ban đầu thành artifact gần-code, đủ cụ thể để đem đi proof/stress-test trước khi build. DPS **không prescribe method prove**; nó tạo object đủ rõ để người/tool/AI kiểm chứng.

**Arc 2 — Living Proof (t > 0):** *"Design này còn đúng không sau khi implementation bắt đầu?"*

Arc 2 chạy liên tục. Bốn mechanisms giữ proof validity theo thời gian — và chúng có dependency order:

| Mechanism | File | Trả lời | Dependency |
|---|---|---|---|
| Confidence & Volatility | `ADR.md` | Phần nào của proof cần thêm evidence? | Phải tồn tại trước khi Learning Loop có gì để update |
| Learning Loop | `BLUEPRINT.md` Section 8 | Proof cần update gì khi implementation reveal new info? | Phải chạy trước khi Spec Health Signals có gì để check |
| Spec Health Signals | README.md (DPS Maintenance Cadence) | Proof có đang drift khỏi reality không? | Depends on Confidence tags từ ADR |
| Scope Boundary Log | `BLUEPRINT.md` Section 1 | Bài toán cần prove có tự thay đổi không? | Orthogonal — độc lập nhưng kết nối qua IMPACT RADIUS |

> **Test mọi Arc 2 mechanism:** *"Cơ chế này có giúp maintain proof validity theo thời gian không?"*
> Nếu không → không cần thiết, dù intellectually interesting đến đâu.

Arc 1 chạy một lần. Arc 2 chạy liên tục. Arc 1 tạo proof-ready target portrait tại t=0. Arc 2 maintain validity của portrait đó khi thời gian trôi và implementation làm lộ ra thực tế.

---

## DPS Lifecycle Status — từ intent đến living spec

DPS không phải một document tĩnh. Một DPS artifact đi qua các trạng thái sống sau:

| Status | Ý nghĩa | Ai được dùng? | Gate để chuyển tiếp |
|---|---|---|---|
| `DRAFT` | Đang cụ thể hóa intent; còn thiếu hoặc chưa được stress-test | Researcher / architect | Điền đủ intent, contracts, blueprint, ADR tối thiểu |
| `PROOF-READY` | Đủ cụ thể để đem đi proof/stress-test gần như code | Reviewer / auditor / AI critique tool | Proof Handoff targets được kiểm tra và blockers được resolve |
| `APPROVED-SSOT` | Đã pass review/stress-test; trở thành source of truth để implement | Dev / coding agent / reviewer | Promotion Basis được ghi rõ; known risks được accept hoặc resolve |
| `IMPLEMENTATION-ACTIVE` | Đang được implement theo Section 8 build phases | Dev / coding agent | Phase gates + Learning Loop chạy liên tục |
| `LIVING-SPEC` | Đã có reality feedback; spec phản ánh implementation, metrics, incidents, changes | Team / maintainer / agent | Arc 2 cadence vận hành; stale evidence được update |
| `SUPERSEDED` | Không còn là active truth | Chỉ dùng để tra lịch sử | Có pointer đến DPS/ADR thay thế |

### Promotion Gate

> **Promotion moment:** DPS chỉ được promote từ `PROOF-READY` sang `APPROVED-SSOT` khi các blockers trong Proof Handoff đã được xử lý hoặc explicitly accepted.
> Không feed DPS `DRAFT` cho coding agent như implementation authority.

---

## Nguyên tắc cốt lõi

**1. Single definition**
Mọi type/schema được define **một lần duy nhất** trong CONTRACTS.md.
BLUEPRINT.md chỉ `Ref<SchemaName>` — không redefine, không copy.
Đây là điều ngăn `CategoryScore`-class bugs.

**2. Explicit references**
Khi BLUEPRINT.md cần một schema, nó viết `Ref<SchemaName>`.
Khi hai nơi dùng cùng tên → đảm bảo chúng reference cùng một definition.

**3. Pseudocode là contract**
Pseudocode trong BLUEPRINT.md đủ chi tiết để agent implement mà không hỏi thêm.
Nếu agent vẫn cần hỏi → pseudocode chưa đủ detail.

**4. ADR là memory**
Mọi quyết định "trông có vẻ lạ" đều có ADR giải thích.
Khi muốn thay đổi design → đọc ADR trước để hiểu tại sao design hiện tại lại như vậy.

**5. Lifecycle authority**
DPS có authority khác nhau theo status. `DRAFT` dùng để think; `APPROVED-SSOT` dùng để build; `LIVING-SPEC` dùng để maintain.
Nếu status không đủ authority cho hành động hiện tại → không tiếp tục, phải promote hoặc reconcile trước.

---

## DPS Profiles

Không phải project nào cũng cần full DPS cùng mức ceremony. Chọn profile trước khi viết spec.

| Profile | Dùng khi | Bắt buộc tối thiểu |
|---|---|---|
| `DPS-Lite` | Prototype nghiêm túc / solo builder / spike có thể sống tiếp | SYSTEM INTENT, SUCCESS CRITERIA, schemas chính, 1-2 ADR, build phases |
| `DPS-Standard` | Product feature / internal system / multi-agent implementation | Full 4 canonical files, lifecycle status, smell checklist, Learning Loop, Trace Index |
| `DPS-Critical` | Payment, compliance, data loss, outage, revenue-blocking systems | Full Standard + System Invariants, Dependency Fitness, Proof Handoff sign-off, trace anchors |

> Profile thấp hơn không được dùng làm excuse để bỏ qua conflict rõ ràng. Profile chỉ giảm ceremony, không giảm correctness.

---

## Workflow

### Khi thiết kế (research mode)

```
1. ADR.md       — brainstorm options, cân nhắc trade-offs
2. CONTRACTS.md — define schemas từ decision đã chốt
3. BLUEPRINT.md — specify behavior dùng schemas đó
4. Loop: phát hiện issue ở BLUEPRINT → update CONTRACTS → update ADR nếu cần
```

### Khi generate code (build mode)

```
Agent đọc theo thứ tự:
1. CONTRACTS.md  → có full type system
2. BLUEPRINT.md  → có full behavior spec
3. BLUEPRINT.md Section 8 → có build order

Agent implement theo Phase order trong Section 8.
Không bắt đầu phase N+1 khi chưa pass gate của phase N.
```

### Khi iterate architecture

```
0. Trước khi bắt đầu: đọc lại SYSTEM INTENT block trong BLUEPRINT.md Section 1.
   Câu hỏi: "Quyết định tôi sắp document có align với PROBLEM và ASSUMING không?"
   Nếu không: change này có thể là response đến Intent Drift, không phải technical refinement
   → xem Trigger 0 trong DPS Maintenance Cadence bên dưới.

1. Tạo ADR mới với status PROPOSED
2. Liệt kê options, pros/cons
3. Chốt → update status ACCEPTED
4. Update CONTRACTS.md nếu schema thay đổi (ghi vào Schema Changelog)
5. Update BLUEPRINT.md nếu behavior thay đổi
6. Nếu scope của bài toán thay đổi → append entry vào Scope Boundary Log
   (BLUEPRINT.md Section 1) với Impact ADRs và Review Status
7. Breaking change → bump version ở cả 4 canonical files (xem Version Sync Rule bên dưới)
```

### Spec-is-Primary Rule

```
DPS là SSOT. Khi implementation conflict với spec — spec thắng.

Khi phát hiện conflict:
  1. Dừng implement
  2. Quyết định: spec đúng hay reality đúng?
     ├─ Spec đúng  → fix code
     └─ Reality đúng → update DPS trước (CONTRACTS / BLUEPRINT / ADR nếu cần)
  3. Tiếp tục implement theo spec đã được reconcile

KHÔNG implement workaround rồi "backfill spec sau" — backfill không xảy ra.
Phase gate trong Section 8 không pass nếu spec không phản ánh reality.
```


### Change Classification Protocol

Trước khi sửa DPS hoặc code khi gặp conflict, classify loại change. Không classify → không sửa.

| Loại | Khi nào dùng | Action bắt buộc |
|---|---|---|
| `IMPLEMENTATION BUG` | Code sai so với DPS đang là authority | Fix code; DPS không đổi |
| `SPEC BUG` | DPS thiếu/sai/mâu thuẫn nhưng decision gốc không đổi | Update CONTRACTS/BLUEPRINT; ghi SPEC NOTE hoặc changelog nếu cần |
| `DESIGN CHANGE` | Approach/architecture decision thay đổi | Tạo ADR mới hoặc supersede ADR cũ; cascade review Impact Radius |
| `INTENT DRIFT` | PROBLEM/FOR/ASSUMING/WILL_DRIFT_IF thay đổi | Update SYSTEM INTENT + Scope Boundary Log; review impacted ADRs |
| `EXTERNAL CONSTRAINT CHANGE` | Library/API/vendor/regulation/platform constraint thay đổi | Update External Contract / Dependency Fitness / ADR Confidence |

> Nếu không chắc thuộc loại nào: treat như `SPEC BUG` tạm thời, ghi SPEC NOTE, và không advance phase gate cho đến khi Learning Loop respond.

### Version Sync Rule

```
Breaking change ở bất kỳ file nào  →  bump MAJOR version cả 4 canonical files cùng lúc.
Non-breaking addition               →  bump minor version file đó + ghi vào Schema Changelog.

Header của mỗi file phải ghi:
  v{{VERSION}} · compatible with: [CONTRACTS v{{X}}, BLUEPRINT v{{Y}}, ADR v{{Z}}]

"Breaking change" bao gồm:
  - Xóa hoặc rename field/schema trong CONTRACTS.md
  - Thay đổi operation signature hoặc pre/post-conditions trong BLUEPRINT.md
  - ADR SUPERSEDED dẫn đến thay đổi behavior đang hoạt động
  - Scope Boundary Log entry làm impact nhiều ADRs và Review Status còn Pending
```

---

## Agent Context Pack

### Sync-Enforced Sidecars

Sidecars tồn tại để agent/tool đọc nhanh, nhưng không phải canonical truth.

**Generated outputs:**

```
DPS_INDEX.yml
.agent/AGENTS.md
.agent/CONTEXT.md
.agent/INVARIANTS.md
.agent/STACK.md
.agent/TASKS.md
.agent/REVIEW_CHECKS.md
.dps/DPS_LOCK.yml
```

**Rule:** không sửa tay các file generated. Mọi thay đổi phải đi theo pipeline:

```bash
# 1. Edit only canonical DPS files
$EDITOR README.md CONTRACTS.md BLUEPRINT.md ADR.md

# 2. Regenerate projections
./tools/dps.py sync

# 3. Verify generated sidecars and cross-canonical consistency
./tools/dps.py check
./tools/dps.py lint --strict
```

`./tools/dps.py check` phải fail nếu:

- canonical metadata lệch giữa 4 files;
- `Ref<X>` không resolve về schema trong `CONTRACTS.md`;
- ADR reference không tồn tại trong `ADR.md`;
- generated sidecar bị sửa tay hoặc chưa regenerate;
- `.dps/DPS_LOCK.yml` không khớp canonical/generated hashes.

**Template mode vs project mode:** blank template được phép còn `{{placeholder}}` và `DRAFT`. Khi instantiate thành DPS thật, dùng thêm:

```bash
./tools/dps.py lint --strict --project-mode
```

Project mode sẽ fail nếu còn placeholder hoặc DPS vẫn là `DRAFT`.

### Stable ID markers for deterministic extraction

Parser ưu tiên stable markers nếu có; nếu chưa có marker, tool fallback về heading/table heuristics. Khi instantiate project thật, nên thêm marker cho entity quan trọng để giảm ambiguity khi rename heading.

```md
<!-- dps:id=schema.UserProfile -->
<!-- dps:type=schema -->

<!-- dps:id=invariant.email_verified_before_checkout -->
<!-- dps:type=invariant -->

<!-- dps:id=component.CheckoutService -->
<!-- dps:type=component -->

<!-- dps:id=dependency.stripe_sdk -->
<!-- dps:type=dependency -->

<!-- dps:id=external.stripe_api -->
<!-- dps:type=external_contract -->

<!-- dps:id=ADR-003 -->
<!-- dps:type=adr -->
```

Stable ID là contract với tooling. Đổi title/heading được, nhưng đổi `dps:id` là breaking change và cần ADR nếu đã dùng trong implementation.


DPS là canonical source. `.agent/` chỉ là generated projection giúp coding agent load context đúng mode mà không phải đọc toàn bộ spec mọi lúc.

```
DPS/                       ← Hand-editable canonical truth
  README.md                 Governance, lifecycle, promotion, sync policy
  CONTRACTS.md              Schemas, I/O contracts, external contracts
  BLUEPRINT.md              Behavior, components, phases, dependencies
  ADR.md                    Decisions, alternatives, rationale

Generated sidecars          ← Never edit by hand
  DPS_INDEX.yml             Machine-readable index
  .agent/AGENTS.md          Agent behavior contract
  .agent/CONTEXT.md         Compressed active truth
  .agent/INVARIANTS.md      Extract từ CONTRACTS Section 3.X
  .agent/STACK.md           Extract từ Dependency Fitness Registry
  .agent/TASKS.md           Extract từ BLUEPRINT Section 8
  .agent/REVIEW_CHECKS.md   Extract từ README Smell Indicators
  .dps/DPS_LOCK.yml         Hash lock chống drift

Tooling
  tools/dps.py              sync / check / lint / doctor

> Tooling note: `./tools/dps.py check` already runs strict lint internally. Use `lint --strict` separately only when you want lint output without generated-file diff.
  .pre-commit-config.yaml   local gate
  .github/workflows/        CI gate
```

**Load profile theo mode:**

| Agent mode | Agent phải đọc trước khi sửa code |
|---|---|
| `design-review` | README lifecycle + Proof Handoff + ADR index + Trace Index |
| `implementation` | CONTRACTS → BLUEPRINT Section 5/8 → relevant ADRs |
| `refactor` | Component Registry → ADR Origin → System Invariants → Impact Radius |
| `bugfix` | Error Registry → Component Spec → Tests → relevant ADRs |
| `architecture-change` | SYSTEM INTENT → Scope Boundary Log → ADR template → Change Classification |
| `dependency-change` | Dependency Fitness Registry → External Contracts → relevant ADRs |

> Projection rule: nếu `.agent/` hoặc `DPS_INDEX.yml` conflict với canonical DPS, canonical thắng. Sau khi canonical đổi, chạy `./tools/dps.py sync && ./tools/dps.py check` trước khi agent tiếp tục implement.

---

## DPS Maintenance Cadence

DPS có hai loại triggers — event-based (embedded trong các files) và time-based (section này).
Time-based triggers là Arc 2 mechanism để phát hiện proof drift trước khi nó trở thành blindside.
Đây là governance content, không phải spec content — nên chúng sống ở README, không phải BLUEPRINT hay CONTRACTS.

### Trigger 0 — System Intent drift *(introduced in v4, retained in v5)*

Nếu bất kỳ condition nào trong `WILL_DRIFT_IF` của BLUEPRINT.md Section 1 (SYSTEM INTENT block)
đã xảy ra → toàn bộ DPS cần re-evaluation, không chỉ impacted ADRs.
Track qua Scope Boundary Log (BLUEPRINT.md Section 1) — nhưng note rõ đây là **INTENT DRIFT**,
không phải ordinary scope change. INTENT DRIFT = assumption về bài toán đã sai, không chỉ scope mở rộng.

### ⚠️ Arc 2 Realism Warning

Arc 2 có hai tiers với dependency khác nhau vào tooling:

- **Tier 1 — không cần tooling:** Trigger 0, Trigger 1, Trigger 2, Alert → Confidence cascade.
  Đây là **minimum viable Arc 2** — chỉ cần team discipline.
- **Tier 2 — cần tooling:** Trigger 3, Trigger 4.
  **Không có tooling → Tier 2 là aspirational, không phải operative.**
  Accept risk này explicitly, hoặc compensate bằng frequency cao hơn của Tier 1 checks.

> **Recommendation:** Với team mới dùng DPS, chỉ commit vào Tier 1 trước.
> Add Tier 2 khi tooling sẵn sàng. Đừng pretend Tier 2 active khi tooling chưa có.

### Tier 1: Triggers implementable ngay (không cần tooling)

**Trigger 1 — External Contract stale**
Nếu `Last verified` trong CONTRACTS.md Section 6 > 3 tháng → schedule re-verification với team sở hữu service đó.
Nếu behavior thay đổi → update Confidence tag trong ADR liên quan.

**Trigger 2 — ADR SUPERSEDED chưa trigger cascade review**
Khi ADR bị SUPERSEDED → toàn bộ IMPACT RADIUS của ADR đó phải được review.
Track qua field **Cascade Review** trong IMPACT RADIUS block của ADR đó (ADR.md).
Nếu `Cascade Review: 🔄 Pending` → phase gate không được advance.

> **Lưu ý:** Scope Boundary Log (BLUEPRINT.md Section 1) track scope *changes*, không phải ADR superseded events —
> đây là hai trigger khác nhau. Trigger 2 belongs to ADR.md, không phải BLUEPRINT.md.

### Tier 2: Triggers cần tooling — Aspirational (chỉ operative khi tooling sẵn sàng)

**Trigger 3 — Implementation drift from spec**
Signal: git history của implementation file thay đổi nhiều lần mà spec file không đổi → potential spec drift.
Format tracking: thêm `Last synced: {{YYYY-MM-DD}}` vào component spec header trong BLUEPRINT Section 5.

**Trigger 4 — Test file divergence**
Signal: test file cho component STRICT/CRITICAL không có test cases khớp failure-condition tests trong Section 5.
Format tracking: thêm "Test file" column vào Component Registry khi tooling sẵn sàng.

### Alert → Confidence cascade

Khi alert threshold trong BLUEPRINT.md Section 9 Metrics bị breach liên tục — đây là cầu nối giữa Arc 1 (Observability) và Arc 2 (Health). Breach pattern = operational evidence rằng một assumption trong ADR đang sai.

```
Alert breach liên tục
  │
  ▼
Tra Metrics table → cột ADR Ref → tìm ADR liên quan
  │
  ▼
Re-evaluate Confidence tag trong ADR đó:
  ├─ Assumption còn đúng → update WATCH SIGNAL / VALIDATION TARGET trong ADR
  └─ Assumption sai     → downgrade Confidence → tạo ADR mới nếu cần thay đổi decision
```

---


## Proof Handoff Interface

DPS không quy định phải prove/stress-test bằng cách nào. Section này chỉ xác định **các bề mặt cần bị kiểm chứng** trước khi promote `PROOF-READY` → `APPROVED-SSOT`.

| Target | Ref | Vì sao cần stress-test | Expected evidence | Blocking? |
|---|---|---|---|---|
| Intent coherence | BLUEPRINT Section 1 | Nếu intent sai, toàn bộ target portrait sai | Domain review / PRD check / stakeholder review | CÓ |
| Contract consistency | CONTRACTS Section 3-5 | Schema/I/O conflict sẽ cascade vào code | Manual audit / type model / linter / AI critique | CÓ |
| Component traceability | BLUEPRINT Section 2 + ADR.md | Component không có origin dễ thành scope creep | ADR Origin coverage review | CÓ |
| Behavior determinism | BLUEPRINT Section 5 | Agent implement thiếu branch nếu pseudocode mơ hồ | Determinism Check pass | CÓ |
| Invariant ownership | CONTRACTS Section 3.X + BLUEPRINT Section 5 | Invariant mất owner thì không ai enforce | ENFORCE BY ↔ Enforces trace check | CÓ |
| Dependency fitness | BLUEPRINT Section 7 | Library/framework có thể không fit assumptions | Docs check / spike / benchmark / version audit | TÙY RISK |
| Build feasibility | BLUEPRINT Section 8 | Phase dependency conflict làm implementation stall | Build-order review / dry-run plan | CÓ |
| Arc 2 readiness | README Maintenance + BLUEPRINT Section 8/9 | Living spec cần signal để update khi reality đổi | Learning Loop + metrics/alerts refs exist | CÓ nếu project > prototype |

**Promotion record:**
```
PROMOTED FROM : PROOF-READY
PROMOTED TO   : APPROVED-SSOT
DATE          : {{YYYY-MM-DD}}
PROMOTED BY   : {{WHO}}
EVIDENCE      : {{links / notes / audit refs}}
ACCEPTED RISK : {{Known unresolved non-blockers, hoặc "none"}}
```

---

## Spec Compaction Rule

Living spec càng sống lâu càng dễ phình. Khi DPS vượt context budget hoặc agent bắt đầu miss context:

1. Không xóa rationale active.
2. Superseded ADR giữ summary + link/history; move detail sang archive nếu cần.
3. SPEC NOTE đã resolved được compact thành Learning Loop outcome.
4. Deprecated schema detail giữ trong Deprecation Registry, không lặp trong BLUEPRINT.
5. `.agent/CONTEXT.md` chỉ chứa active truth, không chứa lịch sử dài.
6. DPS_INDEX.yml được refresh sau compaction để tooling/agent không trỏ vào section cũ.

---

## Checklist trước khi feed cho agent

**Lifecycle / Promotion**
```
[ ] DPS STATUS không còn là DRAFT nếu dùng để implement
[ ] PROMOTION BASIS đã ghi rõ bằng chứng review/stress-test/spike/audit
[ ] Profile đã được chọn (`DPS-Lite` / `DPS-Standard` / `DPS-Critical`)
[ ] Nếu status = APPROVED-SSOT hoặc cao hơn, `.agent/` projection đã được refresh từ DPS mới nhất
[ ] Nếu status = LIVING-SPEC, Arc 2 cadence đang active và stale evidence được track
```

**Arc 1 — Proof at t=0**

🔧 **Mechanical** *(verifiable trong < 1 phút — không cần đọc nội dung)*
```
[ ] Tất cả FILL-IN placeholders đã được điền
[ ] Không có schema nào được define ở nhiều hơn một nơi
[ ] Mọi Ref<X> trong BLUEPRINT.md đều có X trong CONTRACTS.md
[ ] Mọi error code trong BLUEPRINT.md đều có trong Error Registry
[ ] Build order trong Section 8 không có circular dependency
[ ] 4 canonical files có version/profile/status/current-authority header sync (sau breaking change)
[ ] Mọi ADR có IMPACT RADIUS điền đầy đủ (component names + schema names)
[ ] Mọi schema/field trong spec mới hoặc được edit không reference item trong Deprecation Registry
```

🧠 **Judgment** *(cần đọc và suy nghĩ — không thể checklist máy móc)*
```
[ ] ADR tồn tại cho mọi quyết định "trông có vẻ lạ"
[ ] Mọi operation có pre/post conditions phản ánh đúng behavior thực tế
[ ] Mọi stateful component có concurrency strategy trong BLUEPRINT Section 4
[ ] Mọi external call có failure mode được xử lý trong BLUEPRINT Section 6
[ ] SUCCESS CRITERIA trong BLUEPRINT Section 1 đã được điền (≤ 3 signals đo được)
[ ] Mọi component STRICT/CRITICAL → Section 5 có failure-condition tests
[ ] ADR SUPERSEDED → cascade review tất cả components/schemas trong IMPACT RADIUS
```

**Arc 2 — Living Proof (t > 0)**
```
[ ] Mọi ADR có CONFIDENCE và VOLATILITY được điền
[ ] ADR có CONFIDENCE = LOW → VALIDATION TARGET đã được điền (không bỏ trống)
[ ] ADR có VOLATILITY = WATCHFUL/VOLATILE → WATCH SIGNAL đã được điền
[ ] Mọi ADR có LAST CONFIRMED điền đầy đủ — không có INITIAL > 3 tháng với VOLATILE/WATCHFUL
[ ] SCOPE BOUNDARY LOG trong BLUEPRINT Section 1 đã được khởi tạo với initial entry
[ ] Mọi scope change entry có Review Status được update (không để Pending quá lâu)
[ ] Learning Loop đã được respond trước mỗi phase transition trong Section 8
[ ] Metrics table trong BLUEPRINT Section 9 có ADR Ref cho metrics gắn với assumptions
[ ] External Contracts trong CONTRACTS Section 6 có Last verified trong vòng 3 tháng
[ ] Dependency Fitness Registry trong BLUEPRINT Section 7 có Last verified cho dependency architecture-relevant
[ ] DPS_INDEX.yml và `.agent/` projection được refresh sau change lớn
```

---

## ⚠️ DPS Smell Indicators

Nếu thấy một trong những dấu hiệu này → cần fix **trước khi** feed agent:

**Lifecycle / Promotion Smells**
```
❌ DPS STATUS = DRAFT nhưng được feed cho coding agent
   như implementation authority            → agent đang build từ artifact chưa promote;
                                              promote hoặc mark rõ exploratory-only

❌ DPS STATUS = APPROVED-SSOT nhưng
   PROMOTION BASIS trống                  → không biết đã stress-test gì;
                                              SSOT authority không có evidence trail

❌ `.agent/` projection conflict với DPS
   canonical files                         → stale agent context;
                                              refresh projection trước khi implement tiếp

❌ Living spec phình quá lớn làm agent miss
   active constraints                      → cần Spec Compaction Rule;
                                              archive history, giữ active truth compact
```

**Arc 1 — Proof Validity Smells**
```
❌ Agent hỏi lại sau khi đọc BLUEPRINT     → pseudocode chưa đủ detail (Rule 3)
❌ Tìm thấy tên schema ở 2 nơi khác nhau  → vi phạm Single Definition (Rule 1)
❌ Có Ref<X> trong BLUEPRINT nhưng không
   tìm thấy X trong CONTRACTS              → broken reference
❌ Operation có side effect nhưng không
   có POST-CONDITIONS                      → contract incomplete
❌ State machine có transition không có
   guard/action                            → underspecified
❌ Phase N depend on Phase N+1             → circular dependency trong build order
❌ 4 canonical files có version/profile/status/current-authority header không sync
   sau breaking change                     → version drift (Version Sync Rule)
❌ Stateful component không có
   concurrency strategy                    → race condition risk (BLUEPRINT Section 4)
❌ Component STRICT/CRITICAL trong Section 2
   nhưng Section 5 không có failure-
   condition tests                         → Proof Standard không được enforce
❌ ADR bị SUPERSEDED nhưng IMPACT RADIUS
   chưa trigger review components/schemas  → cascade failure risk (blindside attack)

❌ Schema X trong CONTRACTS Section 3 nhưng
   không có Ref<X> trong BLUEPRINT và không có
   "External consumer" annotation          → orphaned schema — hoặc external-only schema
                                              chưa được annotate (fix: thêm External consumer)

❌ Error code E trong CONTRACTS Section 5
   nhưng không component nào trong BLUEPRINT
   Section 5 có path trigger E             → dead error code — E không được implement
                                              hoặc bị bỏ quên khi refactor

❌ Component trong Section 2 Registry không
   có corresponding "### {{COMP}}" section
   trong Section 5                         → component đăng ký nhưng chưa được spec;
                                              phase gate không được advance

❌ Component operation trong Section 3 Data
   Flow nhận Ref<SchemaA> nhưng Section 5
   spec cùng operation đó nhận Ref<SchemaB> → schema mismatch giữa flow diagram và component spec;
                                              agent không biết cái nào là SSOT — fix trước khi implement

❌ DECISION TYPE = COMPARATIVE nhưng "Option B"
   hoặc "Option C" mô tả solution clearly
   infeasible trong context này            → Dummy Alternative (fabricated option);
                                              đổi DECISION TYPE hoặc document alternative thực sự

❌ Schema field comment dùng domain term
   không có trong Glossary Section 10      → Ubiquitous Language drift đang hình thành;
                                              thêm term vào Glossary hoặc dùng term đúng từ đó

❌ Schema/field trong Deprecation Registry
   được reference trong BLUEPRINT Section 5
   pseudocode của component mới            → dùng deprecated artifact trong new code;
                                              migrate sang field/schema replacement trước khi proceed

❌ ENFORCE BY component trong CONTRACTS Section 3.X
   bị remove hoặc rename mà không update
   SYSTEM INVARIANTS                       → invariant mất owner;
                                              không component nào enforce nữa

❌ Dependency architecture-relevant được
   agent thêm vào code nhưng không có trong
   Dependency Fitness Registry             → implementation đang introduce architecture decision
                                              ngoài DPS

❌ Module/file chính không có DPS trace
   anchor ở boundary quan trọng            → code không map được về target portrait;
                                              khó audit implementation đúng spec không
```

**Arc 2 — Living Proof Smells**
```
❌ ADR có CONFIDENCE = LOW nhưng
   không có VALIDATION TARGET              → tag chỉ là marker, không có action path;
                                              LOW decisions tích lũy và không bao giờ được resolve
❌ ADR có VOLATILITY = WATCHFUL/VOLATILE
   nhưng không có WATCH SIGNAL             → khai báo vô nghĩa, không biết watch cái gì
❌ ADR có IMPACT RADIUS sâu nhưng
   CONFIDENCE = LOW + VOLATILITY = VOLATILE → architectural smell: nhiều decisions
                                              depend on foundation không vững
❌ Scope Boundary Log có "Pending"
   Review Status quá lâu                   → impacted ADRs chưa được reconcile vào proof;
                                              scope change chưa được propagate
❌ Metrics Alert bị breach nhưng không có
   ADR Ref trong Metrics table             → không biết assumption nào đang sai,
                                              không có action path để downgrade Confidence
❌ Phase gate advance mà không có Learning
   Loop response                           → implementation insight bị bỏ lỡ,
                                              proof drift tích lũy silently
❌ External Contract có Last verified
   > 3 tháng mà không có re-verify plan   → spec drift risk đang tích lũy
❌ Change được apply nhưng không classify
   theo Change Classification Protocol     → không biết fix code, update spec, tạo ADR,
                                              hay treat như intent drift

❌ ADR có LAST CONFIRMED: INITIAL và date
   > 3 tháng trong khi VOLATILITY =
   VOLATILE hoặc WATCHFUL                  → stale confidence; assumption này chưa được validate
                                              bởi implementation, metrics, hay review nào —
                                              downgrade Confidence hoặc schedule explicit validation
```
