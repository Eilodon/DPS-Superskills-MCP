# BLUEPRINT.md — Behavior Specification
> **DPS VERSION:** `5.0-template`
> **DPS PROFILE:** `DPS-Standard` *(chọn: `DPS-Lite` / `DPS-Standard` / `DPS-Critical`)*
### {{TÊN_DỰ_ÁN}} · v{{VERSION}} · compatible with: [CONTRACTS v{{X}}, ADR v{{Z}}]

> **Mục đích file này:** Mô tả hệ thống *hoạt động như thế nào* — không phải *trông như thế nào*.
> Schemas đã có trong CONTRACTS.md — file này chỉ **reference**, không redefine.
>
> Agent đọc file này: hiểu đủ để implement mà không cần hỏi thêm bất kỳ câu nào.


> **DPS STATUS:** `DRAFT` *(chọn: `DRAFT` / `PROOF-READY` / `APPROVED-SSOT` / `IMPLEMENTATION-ACTIVE` / `LIVING-SPEC` / `SUPERSEDED`)*
> **PROMOTED BY:** {{WHO}} · **PROMOTED AT:** {{YYYY-MM-DD}}
> **PROMOTION BASIS:** {{review / stress-test / spike / audit / validation evidence}}
> **CURRENT AUTHORITY:** `DPS` *(default template value)* — nếu không phải `DPS`, ghi rõ lý do và phạm vi.
>
> **Rule:** `DRAFT` chưa được dùng làm source để agent implement. Chỉ `APPROVED-SSOT`, `IMPLEMENTATION-ACTIVE`, hoặc `LIVING-SPEC` mới là implementation authority.
---

## Mục lục

1. [System Overview](#1-system-overview)
   - [Trace Index](#trace-index)
   - [Proof Handoff Snapshot](#proof-handoff-snapshot)
   - [Scope Boundary Log](#scope-boundary-log)
2. [Component Registry](#2-component-registry)
3. [Data Flow](#3-data-flow)
4. [State Machine](#4-state-machine)
5. [Component Specifications](#5-component-specifications)
   - [Implementation Trace Anchors](#implementation-trace-anchors)
6. [Integration Points](#6-integration-points)
7. [Non-Functional Requirements](#7-non-functional-requirements)
   - [Dependency Fitness Registry](#dependency-fitness-registry)
8. [Scaffolding & Build Order](#8-scaffolding--build-order)
9. [Observability](#9-observability)

---

## 1. SYSTEM OVERVIEW

### SYSTEM INTENT

📝 **FILL-IN:** Điền trước khi viết bất kỳ technical spec nào.
Đây là anchor layer — mọi architectural decision phải trace về đây được.

```
PROBLEM      : {{Bài toán cụ thể — viết từ góc độ người dùng, không phải kỹ thuật}}
               // Đúng: "Merchant không có cách tra cứu transaction history realtime mà không cần gọi support"
               // Sai:  "Cần một reporting module cho transaction data"

FOR          : {{Ai — user/customer segment cụ thể, không phải "everyone"}}
               // Đúng: "SME merchant có < 500 transactions/ngày, không có dedicated IT team"
               // Sai:  "users of the platform"

ASSUMING     : {{Assumption về thế giới — điều gì phải đúng thì system này mới có giá trị}}
               // Vd: "Merchant muốn self-serve reporting thay vì gọi support"
               //     "Volume < X transactions/ngày trong 12 tháng đầu"
               //     "Regulatory requirement R không thay đổi trong scope này"

WILL_DRIFT_IF: {{Khi nào những assumption trên có thể sai — business context trigger}}
               // Vd: "Product pivot sang enterprise segment (FOR thay đổi)"
               //     "Volume vượt X → architecture assumption sai"
               //     "Regulation R thay đổi → ASSUMING sai"

NON-GOALS   : {{Những gì hệ thống không cố giải quyết trong version này}}
               // Vd: "Không optimize cho enterprise bulk export ở phase này"
               //     "Không thay thế data warehouse / BI stack"

ANTI-REQUIREMENTS:
               {{Những behavior hoặc shape hệ thống không được trở thành, dù có vẻ tiện}}
               // Vd: "Không introduce hidden async reconciliation nếu user expect realtime"
               //     "Không persist derived fields nếu CONTRACTS đánh dấu computed"
```

> **Tại sao block này quan trọng:**
> Khi developer đọc spec 6 tháng sau và thấy design "trông kỳ lạ",
> họ có hai context layers: ADR (tại sao quyết định kỹ thuật đó),
> và SYSTEM INTENT (tại sao system này tồn tại với assumption đó).
> Nếu `WILL_DRIFT_IF` đã xảy ra → signal để re-evaluate toàn bộ spec, không chỉ một ADR cụ thể.
> Trigger xử lý: **Trigger 0** trong DPS Maintenance Cadence (xem README.md).

---

📝 **FILL-IN:** ASCII diagram mô tả kiến trúc tổng thể.
Mục tiêu: agent đọc xong biết ngay đây là hệ thống kiểu gì, các thành phần lớn là gì.

```
┌─────────────────────────────────────────────────────┐
│                   {{TÊN_HỆ_THỐNG}}                  │
│                                                     │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐    │
│  │{{COMP_A}}│────▶│{{COMP_B}}│────▶│{{COMP_C}}│    │
│  └──────────┘     └──────────┘     └──────────┘    │
│                        │                            │
│                        ▼                            │
│                   ┌──────────┐                      │
│                   │{{COMP_D}}│                      │
│                   └──────────┘                      │
└─────────────────────────────────────────────────────┘
       ▲ {{EXTERNAL_INPUT}}         {{OUTPUT}} ▶
```

**Luồng chính một câu:** {{MÔ_TẢ_LUỒNG_E2E_NGẮN_GỌN}}

**Những gì hệ thống này KHÔNG làm:** {{OUT_OF_SCOPE}} — xem ADR-{{N}} để biết lý do.

**SUCCESS CRITERIA** *(implementation compass — distill từ PRD, tối đa 3 signals đo được)*

📝 **FILL-IN**

```
✅ {{SIGNAL_1}} : {{MÔ_TẢ_ĐO_ĐƯỢC}}   // vd: "payment flow pass 100% contract tests"
✅ {{SIGNAL_2}} : {{MÔ_TẢ_ĐO_ĐƯỢC}}   // vd: "P99 latency ≤ 200ms dưới load test 100 req/s"
✅ {{SIGNAL_3}} : {{MÔ_TẢ_ĐO_ĐƯỢC}}   // vd: "retry storm không xảy ra khi external service down"
```

> Agent dùng block này để xác định "done đúng trông như thế nào" — không phải business KPIs hay dashboard.
> Nếu implement xong mà một signal chưa pass → chưa done. Tất cả pass → phase gate có thể proceed.
> Giữ ≤ 3 signals: đây là compass, không phải spec đầy đủ (đó là việc của Section 5 và Section 7).


### TRACE INDEX

> One-page map từ intent/success signals đến decisions, contracts, components, phases, và evidence.
> Đây là index để reviewer/agent stress-test coverage nhanh; detail vẫn nằm ở sections gốc.

📝 **FILL-IN**

| Intent / Success Signal | ADR Origin | Contract / Schema | Component | Phase | Metric / Test / Evidence |
|---|---|---|---|---|---|
| `{{SIGNAL_1}}` | ADR-{{N}} | `Ref<{{SCHEMA}}>` | `{{COMP_A}}` | Phase {{N}} | `{{TEST_OR_METRIC}}` |
| `{{SIGNAL_2}}` | ADR-{{N}} | `Ref<{{SCHEMA}}>` | `{{COMP_B}}` | Phase {{N}} | `{{TEST_OR_METRIC}}` |
| `{{SIGNAL_3}}` | ADR-{{N}} | `Ref<{{SCHEMA}}>` | `{{COMP_C}}` | Phase {{N}} | `{{TEST_OR_METRIC}}` |

> Smell: success signal không map tới component/phase/test nào → target portrait chưa implementable hoặc success signal sai level.

---

### PROOF HANDOFF SNAPSHOT

> Snapshot ngắn để promote `PROOF-READY` → `APPROVED-SSOT`.
> Full guide ở README.md Proof Handoff Interface. Section này chỉ ghi trạng thái hiện tại của blueprint.

| Proof Target | Status | Evidence / Link | Blocker? |
|---|---|---|---|
| Intent coherence | `{{PASS/PENDING/FAIL}}` | {{REF}} | {{CÓ/KHÔNG}} |
| Contract consistency | `{{PASS/PENDING/FAIL}}` | {{REF}} | {{CÓ/KHÔNG}} |
| Behavior determinism | `{{PASS/PENDING/FAIL}}` | {{REF}} | {{CÓ/KHÔNG}} |
| Build feasibility | `{{PASS/PENDING/FAIL}}` | {{REF}} | {{CÓ/KHÔNG}} |
| Dependency fitness | `{{PASS/PENDING/FAIL}}` | {{REF}} | {{CÓ/KHÔNG}} |

---

### SCOPE BOUNDARY LOG

> Append-only. Ghi lại mọi thay đổi về scope của hệ thống.
> Scope boundary changes ảnh hưởng nhiều ADR đồng thời — phải track Review Status của TẤT CẢ impacted ADRs.
> Đây là enforcement mechanism, không phải changelog.

| Version | Date | Change | Rationale | Impact ADRs | Review Status |
|---|---|---|---|---|---|
| v1.0 | {{YYYY-MM-DD}} | Initial scope definition | — | — | — |
| 📝 | | | | | |

> **Template một entry:**
> `| v{{X.Y}} | {{YYYY-MM-DD}} | {{ĐIỀU_GÌ_ĐÃ_THAY_ĐỔI}} | {{TẠI_SAO}} | ADR-{{N}}, ADR-{{M}} | {{STATUS}} |`
>
> **Review Status values:**
> - `✅ All reviewed` — tất cả impacted ADRs đã được review sau scope change này
> - `🔄 Pending: ADR-{{N}}` — ADR-N chưa được review
> - `⚠️ OVERRIDE: {{LÝ_DO}}` — scope change accepted mà không đủ review, ghi rõ lý do và accept risk
>
> ⚠️ Khi scope thay đổi → không chỉ ghi lại change mà phải update Review Status của TẤT CẢ ADRs trong Impact ADRs.
> Phase gate không advance nếu Review Status còn `🔄 Pending`.

---

## 2. COMPONENT REGISTRY

> Mỗi component có một nhiệm vụ duy nhất. Không overlap.
> Trigger 4 extension point: teams may add a `Test file` column to this registry or the Section 5 component specs when mapping STRICT/CRITICAL proof obligations to concrete tests.

📝 **FILL-IN**

| Component | File/Module | Nhiệm vụ | Input | Output | Stateful? | Break Pattern | Business Impact | Proof Standard | ADR Origin |
|---|---|---|---|---|---|---|---|---|---|
| **{{COMP_A}}** | `{{path}}` | {{MỘT_CÂU}} | `Ref<{{SCHEMA}}>` | `Ref<{{SCHEMA}}>` | {{CÓ/KHÔNG}} | {{TẠI_SAO_CÓ_THỂ_VỠ}} | {{GIÁ_NẾU_VỠ}} | `{{STANDARD\|STRICT\|CRITICAL}}` | ADR-{{N}} |
| **{{COMP_B}}** | `{{path}}` | {{MỘT_CÂU}} | `Ref<{{SCHEMA}}>` | `Ref<{{SCHEMA}}>` | {{CÓ/KHÔNG}} | {{TẠI_SAO_CÓ_THỂ_VỠ}} | {{GIÁ_NẾU_VỠ}} | `{{STANDARD\|STRICT\|CRITICAL}}` | ADR-{{N}} |
| **{{COMP_C}}** | `{{path}}` | {{MỘT_CÂU}} | `Ref<{{SCHEMA}}>` | `Ref<{{SCHEMA}}>` | {{CÓ/KHÔNG}} | {{TẠI_SAO_CÓ_THỂ_VỠ}} | {{GIÁ_NẾU_VỠ}} | `{{STANDARD\|STRICT\|CRITICAL}}` | ADR-{{N}}, ADR-{{M}} |

> **Cột ADR Origin:** ADR nào quyết định component này tồn tại hoặc được thiết kế theo cách này.
> Khi một component là consequence của nhiều ADRs: `ADR-N, ADR-M` — comma-separated.
> Agent đọc cột này trước khi suggest thay đổi component — phải hiểu rationale gốc trước khi refactor.

> **"Stateful"** = component giữ state giữa các invocations.
> Stateful components cần strategy rõ ràng trong Section 4 (State Machine).

> **FAILURE PROFILE — hai trục độc lập:**
> - **Break Pattern** — *tại sao* component này có thể vỡ: vd `async race condition`, `dependency timeout`, `schema mismatch`, `resource exhaustion`
> - **Business Impact** — *cái giá phải trả* khi vỡ: vd `UX degraded`, `revenue blocked`, `data loss`, `cascade outage`
>
> **Proof Standard** được derive từ tổ hợp Break Pattern × Business Impact — không tự gán tùy ý:
> - `STANDARD`  — unit tests đủ; failure isolated, recoverable, không có hậu quả kinh doanh trực tiếp
> - `STRICT`    — integration tests + failure-condition tests bắt buộc; gián đoạn recoverable nhưng user-visible
> - `CRITICAL`  — contract tests + failure-condition tests + manual sign-off; failure = data loss / revenue / outage
>
> ⚠️ Component `STRICT` hoặc `CRITICAL` → **Section 5 phải có failure-condition test cases tương ứng**.
> Operation-level override được phép khi chỉ một số function có risk cao hơn default component standard. Override phải ghi ngay dưới function heading.

---

## 3. DATA FLOW

> Dữ liệu đi qua hệ thống như thế nào — từ input đến output.
> Mỗi bước: ai làm, dùng operation gì, input/output là schema nào.

📝 **FILL-IN**

### Happy Path — {{TÊN_LUỒNG_CHÍNH}}

```
[1] {{ACTOR/TRIGGER}}
      │ produces: Ref<{{SCHEMA}}>
      ▼
[2] {{COMP_A}}: {{OPERATION}}
      │ input:  Ref<{{INPUT_SCHEMA}}>
      │ output: Ref<{{OUTPUT_SCHEMA}}>
      │ side effect: {{NẾU_CÓ}}
      ▼
[3] {{COMP_B}}: {{OPERATION}}
      │ input:  Ref<{{INPUT_SCHEMA}}>
      │ output: Ref<{{OUTPUT_SCHEMA}}>
      ▼
[N] {{FINAL_STATE}}
      └─ result: Ref<{{RESULT_SCHEMA}}>
```

### Error Path — {{TÊN_ERROR_SCENARIO}}

```
[2] {{COMP_A}}: {{OPERATION}} → FAIL
      │ error: Ref<{{ERROR_CODE}}>   // khi {{ĐIỀU_KIỆN}}
      ▼
[2a] {{XỬ_LÝ_LỖI}}
      └─ {{RECOVERY_HOẶC_PROPAGATION}}
```

### Edge Case — {{TÊN_EDGE_CASE}}

📝 **FILL-IN:** Mỗi edge case quan trọng cần một flow diagram riêng.

```
[{{STEP}}] {{ĐIỀU_KIỆN_ĐẶC_BIỆT}}
      ▼
{{XỬ_LÝ_ĐẶC_BIỆT}}
```

---

## 4. STATE MACHINE

> Chỉ điền section này nếu hệ thống có stateful components (xem Component Registry).
> Đây là source of truth cho mọi state transition — không implement transition nào
> không có trong diagram này.

📝 **FILL-IN** *(bỏ qua nếu toàn stateless)*

```
STATES:
  {{STATE_INIT}}      — {{Ý_NGHĨA}}
  {{STATE_A}}         — {{Ý_NGHĨA}}
  {{STATE_B}}         — {{Ý_NGHĨA}}
  {{STATE_TERMINAL}}  — {{Ý_NGHĨA}}
  {{STATE_ERROR}}     — {{Ý_NGHĨA}}

TRANSITIONS:
  {{STATE_INIT}}  ──[{{EVENT}}]──▶  {{STATE_A}}
                     guard: {{ĐIỀU_KIỆN}}
                     action: {{GÌ_XẢY_RA}}

  {{STATE_A}}     ──[{{EVENT}}]──▶  {{STATE_B}}
                     guard: {{ĐIỀU_KIỆN}}
                     action: {{GÌ_XẢY_RA}}

  {{STATE_A}}     ──[{{EVENT}}]──▶  {{STATE_ERROR}}
                     guard: {{ĐIỀU_KIỆN_LỖI}}
                     action: {{GÌ_XẢY_RA}}

  {{STATE_B}}     ──[{{EVENT}}]──▶  {{STATE_TERMINAL}}
                     guard: none
                     action: {{GÌ_XẢY_RA}}

INVARIANTS:
  - Không thể transition từ {{STATE_TERMINAL}} sang bất kỳ state nào
  - {{STATE_ERROR}} chỉ có thể đến từ {{LIST_STATES}}
  - {{INVARIANT_KHÁC}}
```

### Concurrency Model

> Điền khi có stateful components và khả năng concurrent access.
> Nếu toàn stateless → bỏ qua subsection này.

📝 **FILL-IN** *(bỏ qua nếu không có concurrent mutation)*

```
CONCURRENCY STRATEGY: {{OPTIMISTIC_LOCK / PESSIMISTIC_LOCK / ACTOR_MODEL / IMMUTABLE_EVENTS}}

IDEMPOTENCY KEY: {{FIELD}} — dùng để detect và reject duplicate requests

CONFLICT SCENARIO: 2 actors cùng mutate {{STATE}} của cùng một {{ENTITY}}
  Strategy  : {{LAST_WRITE_WINS / FIRST_WRITE_WINS / MERGE / REJECT_SECOND}}
  Detect    : so sánh {{VERSION_FIELD / ETAG / TIMESTAMP}}
  On conflict → {{XỬ_LÝ_CỤ_THỂ — return error / retry / merge}}

STATE PERSISTENCE: {{IN_MEMORY / DATABASE / CACHE}}
  - Nếu process crash → state recover từ {{NGUỒN}}
  - Initialization: {{LOAD_FROM_DB / START_FRESH / REPLAY_EVENTS}}

RACE CONDITION RISKS:
  - {{RISK_1}}: xảy ra khi {{ĐIỀU_KIỆN}} → mitigate bằng {{CÁCH}}
  - {{RISK_2}}: xảy ra khi {{ĐIỀU_KIỆN}} → mitigate bằng {{CÁCH}}
```

---

## 5. COMPONENT SPECIFICATIONS

> Với mỗi component: pseudocode đủ chi tiết để implement mà không cần clarification.
> Level of detail: nếu agent đọc xong mà vẫn cần hỏi → chưa đủ detail.

📝 **FILL-IN:** Một section cho mỗi component trong Component Registry.

### Implementation Trace Anchors

> Trace anchor là comment/metadata nhẹ đặt ở module boundary, public API boundary, migration script, external adapter, hoặc invariant enforcement point.
> Mục tiêu: code có thể trace ngược về target portrait mà không biến source code thành documentation dump.

**Canonical format:**

```
DPS: BLUEPRINT §5 {{COMPONENT}}.{{operation}} | ADR-{{N}} | CONTRACTS Ref<{{SCHEMA_OR_ERROR}}>
```

**Rules:**

```
- Không cần trace anchor cho mọi line/function nhỏ.
- Bắt buộc với component boundary, critical operation, external integration, migration, và invariant enforcement point.
- Nếu code đổi behavior mà trace anchor vẫn trỏ về spec cũ → classify theo Change Classification Protocol trước khi sửa.
```

---

### {{COMP_A}}

**File:** `{{path/to/file}}`
**Dependencies:** `{{COMP_B}}` (gọi), `{{EXTERNAL_SERVICE}}` (gọi)
**Được gọi bởi:** `{{COMP_C}}`, `{{ORCHESTRATOR}}`
**Enforces:** `{{INVARIANT_NAME}}` *(từ CONTRACTS Section 3.X — omit nếu không applicable)*
**Last synced:** {{YYYY-MM-DD}}   — xem Trigger 3 trong README.md (nếu file impl đổi nhiều lần mà field này không đổi → potential spec drift)

#### Hàm: `{{function_name}}()`

**Implementation Trace Anchor:** `DPS: BLUEPRINT §5 {{COMP_A}}.{{function_name}} | ADR-{{N}} | CONTRACTS Ref<{{SCHEMA}}>`
**Proof Standard override:** `{{INHERIT|STANDARD|STRICT|CRITICAL}}` — mặc định `INHERIT` từ Component Registry; override chỉ khi function risk khác component default.

```
SIGNATURE:
  {{function_name}}(
    param_1: Ref<{{SCHEMA}}>,
    param_2: {{Type}}
  ) → Ref<{{OUTPUT_SCHEMA}}> | Ref<{{ERROR_CODE}}>

PSEUDOCODE:
  1. Validate param_1:
       nếu param_1.{{field}} là null → return Ref<{{ERR_VALIDATION}}>
       nếu param_1.{{field}} < 0     → return Ref<{{ERR_RANGE}}>

  2. Lấy {{RESOURCE}} từ {{SOURCE}}:
       result = {{COMP_B}}.{{operation}}(param_1.{{field}})
       nếu result là error → propagate Ref<{{ERR_NOT_FOUND}}>

  3. Transform:
       output = Ref<{{OUTPUT_SCHEMA}}> {
         {{out_field_1}}: result.{{in_field}},
         {{out_field_2}}: compute_{{x}}(param_1, result),
         {{out_field_3}}: {{CONST_1}}
       }

  4. Side effect: {{MÔ_TẢ_NẾU_CÓ}}

  5. return output

COMPLEXITY: {{O(n) / O(1) / ...}} — {{LÝ_DO_NẾU_KHÔNG_HIỂN_NHIÊN}}
```

> **Khi logic phức tạp với N conditions × M outcomes, dùng decision table thay pseudocode:**
> ```
> DECISION TABLE: {{FUNCTION_NAME}}
>   | Condition 1 | Condition 2 | ... | → Output / Action  |
>   |-------------|-------------|-----|---------------------|
>   | TRUE        | TRUE        | ... | → {{ACTION_A}}     |
>   | TRUE        | FALSE       | ... | → {{ACTION_B}}     |
>   | FALSE       | *           | ... | → {{ACTION_C}}     |
>
> // * = "don't care" — condition không relevant cho case này
> // Mọi row phải có exactly một outcome. Không có "implicit" case.
> // Decision table tự-documents completeness: combination chưa có row → missing case.
> ```

**DETERMINISM CHECK** *(tự-verify trước khi submit — mandatory)*
```
✅ Mọi error code trong SIGNATURE đều có path trigger nó trong pseudocode
✅ Mọi conditional (nếu X → ...) đều có else path được specify (không implicit)
✅ Mọi external call ({{COMP_B}}.operation()) đều có failure path
✅ Mọi stateful mutation đều list cụ thể fields bị thay đổi
✅ Happy path chạy từ đầu đến cuối không cần assumption ngầm về state
```

**Test cases cần cover:**
```
✅ Happy path: {{MÔ_TẢ}}
✅ Edge case:  {{MÔ_TẢ}}
✅ Error:      param_1.{{field}} null → Ref<{{ERR_VALIDATION}}>
✅ Error:      {{COMP_B}} unavailable → Ref<{{ERR_DEPENDENCY}}>
```

> **Proof Standard của component này:** `{{STANDARD|STRICT|CRITICAL}}` — xem Component Registry Section 2.
>
> Nếu Proof Standard là `STRICT` hoặc `CRITICAL`, bổ sung bắt buộc:
> ```
> ✅ Failure: {{BREAK_PATTERN}} xảy ra → {{EXPECTED_DEGRADED_BEHAVIOR_HOẶC_FALLBACK}}
> ✅ Failure: {{DEPENDENCY}} timeout / unavailable → {{EXPECTED_BEHAVIOR}} (không được silent fail)
> ✅ Failure: concurrent mutation trên cùng {{ENTITY}} → {{CONFLICT_RESOLUTION}}
> ```
> Failure-condition tests này verify *system behavior khi vỡ* — khác với Error tests verify *happy-path validation*.

---

#### Hàm: `{{function_2_name}}()`

**Implementation Trace Anchor:** `DPS: BLUEPRINT §5 {{COMP_A}}.{{function_2_name}} | ADR-{{N}} | CONTRACTS {{Type}}`
**Proof Standard override:** `{{INHERIT|STANDARD|STRICT|CRITICAL}}`

📝 Thêm theo cùng format.

```
SIGNATURE:
  {{function_2_name}}(
    param_1: {{Type}}
  ) → {{ReturnType}}

PSEUDOCODE:
  1. {{BƯỚC_1}}
  2. {{BƯỚC_2}}
  3. return {{GIÁ_TRỊ}}

DETERMINISM CHECK:
✅ Mọi error code trong SIGNATURE đều có path trigger nó trong pseudocode
✅ Mọi conditional đều có else path được specify
✅ Mọi external call đều có failure path
✅ Mọi stateful mutation đều list cụ thể fields bị thay đổi
✅ Happy path chạy từ đầu đến cuối không cần assumption ngầm về state
```

---

### {{COMP_B}}

**File:** `{{path/to/file}}`
**Dependencies:** `{{LIST}}`
**Được gọi bởi:** `{{LIST}}`
**Enforces:** *(omit nếu không có System Invariant nào assign cho component này)*
**Last synced:** {{YYYY-MM-DD}}   — xem Trigger 3 trong README.md

#### Hàm: `{{function_name}}()`

**Implementation Trace Anchor:** `DPS: BLUEPRINT §5 {{COMP_B}}.{{function_name}} | ADR-{{N}} | CONTRACTS Ref<{{SCHEMA}}>`
**Proof Standard override:** `{{INHERIT|STANDARD|STRICT|CRITICAL}}` — mặc định `INHERIT` từ Component Registry; override chỉ khi function risk khác component default.

```
SIGNATURE:
  {{function_name}}(
    param_1: {{Type}}
  ) → {{ReturnType}} | Ref<{{ERROR_CODE}}>

PSEUDOCODE:
  1. {{BƯỚC_1}}
  2. {{BƯỚC_2}}
  3. return {{GIÁ_TRỊ}}

DETERMINISM CHECK:
✅ Mọi error code trong SIGNATURE đều có path trigger nó trong pseudocode
✅ Mọi conditional đều có else path được specify
✅ Mọi external call đều có failure path
✅ Mọi stateful mutation đều list cụ thể fields bị thay đổi
✅ Happy path chạy từ đầu đến cuối không cần assumption ngầm về state
```

📝 Thêm components theo cùng pattern.

---

## 6. INTEGRATION POINTS

> Cách hệ thống này tích hợp với thế giới bên ngoài.
> Đây là implementation guide cho external contracts đã define trong CONTRACTS.md Section 6.

📝 **FILL-IN**

### {{EXTERNAL_SERVICE_1}}

**Dùng ở component:** `{{COMP}}`
**Protocol:** {{REST/gRPC/WebSocket/Queue/...}}
**Auth:** {{API_KEY/OAuth2/mTLS/...}}

```
// Retry strategy
MAX_RETRIES = {{N}}
BACKOFF     = exponential, base {{N}}ms, cap {{N}}ms
TIMEOUT     = {{N}}ms per attempt

// Circuit breaker (nếu áp dụng)
OPEN khi:    {{N}} failures trong {{WINDOW}}s
HALF-OPEN:   thử lại sau {{N}}s
CLOSE khi:   {{N}} successes liên tiếp
```

**Token refresh (nếu dùng OAuth2/JWT):**
```
TOKEN_TTL   = {{N}}s
REFRESH_AT  = TTL - {{BUFFER}}s         // refresh chủ động trước khi hết hạn
REFRESH_BY  : {{COMP_CHỊU_TRÁCH_NHIỆM}} // component DUY NHẤT được gọi refresh

// Khi nhận 401 Unauthorized:
  1. {{COMP}} gọi {{TOKEN_REFRESH_ENDPOINT}}
  2. Nếu refresh thành công → retry request gốc MỘT lần duy nhất
  3. Nếu refresh fail       → propagate Ref<{{ERR_AUTH_EXPIRED}}>, KHÔNG retry
  4. Nếu có concurrent requests đang pending → đợi refresh xong, KHÔNG tạo nhiều refresh đồng thời
```

**Fallback khi unavailable:** {{MÔ_TẢ_FALLBACK_HOẶC_"KHÔNG_CÓ_FALLBACK_—_FAIL_FAST"}}

---

## 7. NON-FUNCTIONAL REQUIREMENTS

> Những ràng buộc không phải về behavior mà về quality attributes.
> Đây là constraints cho implementation — agent phải respect khi generate code.

📝 **FILL-IN**

### Performance

| Operation | P50 | P99 | Throughput / Limit | Source |
|---|---|---|---|---|
| `{{OPERATION_1}}` | ≤ {{N}}ms | ≤ {{N}}ms | ≥ {{N}} req/s | ADR-{{N}} |
| `{{OPERATION_2}}` | ≤ {{N}}ms | ≤ {{N}}ms | — | PRD §{{N}} |
| `{{OPERATION_3}}` | ≤ {{N}}s max | — | ≤ {{N}}MB memory | ASSUMED |

```
// Source values — bắt buộc điền, không để trống:
//   ADR-N    — target từ architectural decision; có rationale và assumption document
//   PRD §N   — hard requirement từ PRD; ai owns nó phải rõ
//   MEASURED — từ benchmark/load test thực tế; ghi kèm date + conditions đo
//   ASSUMED  — estimate chưa có evidence → phải có VALIDATION TARGET trong ADR liên quan
//              ⚠️ ASSUMED không phải placeholder — là explicit flag "số này cần validation"
```

### Reliability

```
Availability target : {{99.x%}}
Recovery time (RTO) : ≤ {{N}} phút
Recovery point (RPO): ≤ {{N}} phút
```

### Security

```
Authentication : {{MÔ_TẢ}}
Authorization  : {{MÔ_TẢ}}
Data at rest   : {{ENCRYPT/PLAIN/N/A}}
Data in transit: {{TLS_VERSION/N/A}}
Sensitive fields KHÔNG được log: {{LIST_FIELDS}}
```

### Scalability

```
Current target : {{N}} users / {{N}} req/day
Design ceiling : {{N}}x current (không cần re-architect)
Scaling trigger: {{METRIC}} > {{THRESHOLD}} → {{ACTION}}
```

### Testing Strategy

> Ranh giới test rõ ràng ngăn agent generate thiếu test hoặc test sai layer.

📝 **FILL-IN**

| Layer | Scope | What to mock | Gate (xem Section 8) |
|---|---|---|---|
| **Unit** | Pure functions trong từng component | Tất cả I/O và dependencies | Phase {{N}} |
| **Integration** | {{COMP_A}} ↔ {{COMP_B}} boundary | External services | Phase {{N}} |
| **Contract** | Tất cả I/O contracts trong CONTRACTS.md Section 4 | — | Phase {{N}} |
| **E2E** | Happy path + {{N}} critical error paths end-to-end | — | Phase {{N}} |

```
// Test data strategy
Happy path data  : {{SOURCE — fixtures / factory / seed script}}
Edge case data   : {{SOURCE}}
Error simulation : {{CÁCH inject failure — mock / chaos / feature flag}}

// Coverage targets
Unit coverage    : ≥ {{N}}% line coverage trên business logic
Contract tests   : 100% operations trong CONTRACTS.md Section 4
```


### Dependency Fitness Registry

> Architecture-relevant dependencies là decisions trá hình. Agent không được thêm library/framework/package mới chỉ vì tiện nếu nó ảnh hưởng behavior, security, runtime, deployment, data model, hoặc external contracts.

📝 **FILL-IN**

| Dependency | Purpose | Version / Constraint | ADR Origin | Fit Assumption | Last verified | Reconsider if |
|---|---|---|---|---|---|---|
| `{{LIB_OR_FRAMEWORK}}` | {{Dùng để làm gì}} | `{{VERSION_RANGE}}` | ADR-{{N}} | {{Vì sao dependency này fit intent/design}} | {{YYYY-MM-DD}} | {{Trigger đổi hoặc re-evaluate}} |
| `{{SERVICE_OR_DB}}` | {{Dùng để làm gì}} | {{VERSION/SLA}} | ADR-{{N}} | {{Assumption về capability/limits}} | {{YYYY-MM-DD}} | {{Trigger}} |

**Rules:**
```
- Dependency chỉ dùng trong code nếu có entry ở registry này hoặc rõ ràng là dev-only tooling.
- Dependency thay đổi behavior/runtime/security/data model → tạo hoặc update ADR.
- Last verified > 3 tháng với dependency WATCHFUL/VOLATILE → Arc 2 smell.
- Dependency external API/service phải cross-ref CONTRACTS Section 6 External Contracts.
```

---

### Configuration Management

> Tất cả giá trị có thể thay đổi theo môi trường phải đi qua config — không hard-code.

📝 **FILL-IN**

| Config key | Type | Default | Override by | Dùng ở component | Sensitive? |
|---|---|---|---|---|---|
| `{{ENV_VAR_1}}` | string | `{{DEFAULT}}` | env var | `{{COMP}}` | KHÔNG |
| `{{ENV_VAR_2}}` | int | `{{DEFAULT}}` | env var / config file | `{{COMP}}` | CÓ — mask trong logs |
| `{{FEATURE_FLAG}}` | bool | `false` | feature flag system | `{{COMP}}` | KHÔNG |

```
// Config validation tại startup (fail fast — không chạy với config thiếu/sai)
Nếu {{REQUIRED_VAR}} không được set        → exit với error message rõ ràng
Nếu {{VAR}} nằm ngoài range [{{MIN}}, {{MAX}}] → exit với error message rõ ràng
KHÔNG dùng default ngầm cho required config
```

---

## 8. SCAFFOLDING & BUILD ORDER

> Thứ tự tạo files và implement features.
> Dependencies kỹ thuật giữa các bước là THỰC TẾ — không đảo thứ tự.

📝 **FILL-IN**

```
PHASE 0 — Foundation (implement trước mọi thứ)
  [0.1] {{FILE/MODULE}}     — vì: {{LÝ_DO_ĐI_TRƯỚC}}
  [0.2] {{FILE/MODULE}}     — vì: {{LÝ_DO_ĐI_TRƯỚC}}

  📌 SPEC NOTES — mid-phase observations (không blocking, resolve tại gate)
  | Date       | Author   | Ref              | Type          | Observation            | Gate Action                          |
  |------------|----------|------------------|---------------|------------------------|--------------------------------------|
  | {{YY-MM-DD}} | {{WHO}} | ADR-N / Section X | `OBSERVATION` | {{Gì phát hiện}}     | Update spec / New ADR / Investigate  |
  // Types: OBSERVATION = "spec có thể cần update nhưng chưa confirm"
  //        TENSION     = "impl kéo về hướng khác nhưng chưa conflict"
  //        QUESTION    = "spec chưa clear về case Y, cần clarify trước gate"
  // SPEC NOTE không block gate. Nhưng Learning Loop Q1 phải address mọi SPEC NOTE chưa resolved.
  // Gate KHÔNG pass nếu có SPEC NOTE tồn tại quá 1 phase không được respond.

  Gate: {{ĐIỀU_KIỆN_PASS_PHASE_0}}
        + LEARNING LOOP — trả lời và produce artifacts trước khi advance:
          Q1: Implementation phase này reveal gì mà spec không anticipate?
              → Artifact: update CONTRACTS/BLUEPRINT hoặc tạo ADR mới (hoặc ghi "không có")
          Q2: Decision nào có CONFIDENCE = LOW đã được validate hay falsified?
              → Artifact: update Confidence tag + VALIDATION TARGET trong ADR liên quan
          Q3: [Chỉ nếu phase này có production exposure] Failure patterns quan sát được
              có match Proof Standard hiện tại không?
              → Artifact: update Component Registry + Section 5 test cases nếu cần

PHASE 1 — Core Logic
  [1.1] {{FILE/MODULE}}     — depends on: [0.1]
  [1.2] {{FILE/MODULE}}     — depends on: [0.1], [0.2]
  [1.3] {{FILE/MODULE}}     — depends on: [1.1]

  📌 SPEC NOTES — mid-phase observations (không blocking, resolve tại gate)
  | Date       | Author   | Ref              | Type          | Observation            | Gate Action                          |
  |------------|----------|------------------|---------------|------------------------|--------------------------------------|
  | {{YY-MM-DD}} | {{WHO}} | ADR-N / Section X | `OBSERVATION` | {{Gì phát hiện}}     | Update spec / New ADR / Investigate  |

  Gate: {{ĐIỀU_KIỆN_PASS_PHASE_1}}
        + Component STRICT/CRITICAL trong phase này: failure-condition tests pass (Section 5)
        + LEARNING LOOP — trả lời và produce artifacts trước khi advance:
          Q1: Implementation phase này reveal gì mà spec không anticipate?
              → Artifact: update CONTRACTS/BLUEPRINT hoặc tạo ADR mới (hoặc ghi "không có")
          Q2: Decision nào có CONFIDENCE = LOW đã được validate hay falsified?
              → Artifact: update Confidence tag + VALIDATION TARGET trong ADR liên quan
          Q3: [Chỉ nếu phase này có production exposure] Failure patterns quan sát được
              có match Proof Standard hiện tại không?
              → Artifact: update Component Registry + Section 5 test cases nếu cần

PHASE 2 — Integration
  [2.1] {{FILE/MODULE}}     — depends on: [1.x]
  [2.2] {{FILE/MODULE}}     — depends on: [1.x], [2.1]

  📌 SPEC NOTES — mid-phase observations (không blocking, resolve tại gate)
  | Date       | Author   | Ref              | Type          | Observation            | Gate Action                          |
  |------------|----------|------------------|---------------|------------------------|--------------------------------------|
  | {{YY-MM-DD}} | {{WHO}} | ADR-N / Section X | `OBSERVATION` | {{Gì phát hiện}}     | Update spec / New ADR / Investigate  |

  Gate: {{ĐIỀU_KIỆN_PASS_PHASE_2}}
        + SUCCESS CRITERIA signals từ Section 1: tất cả pass
        + LEARNING LOOP — trả lời và produce artifacts trước khi advance:
          Q1: Implementation phase này reveal gì mà spec không anticipate?
              → Artifact: update CONTRACTS/BLUEPRINT hoặc tạo ADR mới (hoặc ghi "không có")
          Q2: Decision nào có CONFIDENCE = LOW đã được validate hay falsified?
              → Artifact: update Confidence tag + VALIDATION TARGET trong ADR liên quan
          Q3: [Chỉ nếu phase này có production exposure] Failure patterns quan sát được
              có match Proof Standard hiện tại không?
              → Artifact: update Component Registry + Section 5 test cases nếu cần

PHASE N — {{TÊN_PHASE}}
  [N.x] {{FILE/MODULE}}

  📌 SPEC NOTES — mid-phase observations (không blocking, resolve tại gate)
  | Date       | Author   | Ref              | Type          | Observation            | Gate Action                          |
  |------------|----------|------------------|---------------|------------------------|--------------------------------------|
  | {{YY-MM-DD}} | {{WHO}} | ADR-N / Section X | `OBSERVATION` | {{Gì phát hiện}}     | Update spec / New ADR / Investigate  |

  Gate: {{ĐIỀU_KIỆN_PASS}}
        + LEARNING LOOP — trả lời và produce artifacts trước khi advance (xem format trên)
```

> ⚠️ Phase gate KHÔNG pass nếu:
> - Component `STRICT`/`CRITICAL` chưa có failure-condition tests (xem Section 2 + Section 5)
> - SUCCESS CRITERIA signals (Section 1) chưa được verify ở phase cuối
> - Spec không reflect reality (Spec-is-Primary Rule — xem README.md)
> - Learning Loop chưa được respond — 3 câu hỏi chưa có artifacts tương ứng
> - SPEC NOTE tồn tại quá 1 phase mà Learning Loop chưa respond (xem SPEC NOTE table trong phase trên)
> - Scope Boundary Log có Review Status còn `🔄 Pending` (xem Section 1)

**File scaffold đầy đủ:**

```
{{PROJECT_ROOT}}/
│
├── {{FILE_1}}               ← created in phase [{{X.Y}}] · DPS anchor: BLUEPRINT §5 {{COMP}} / ADR-{{N}}
├── {{FILE_2}}               ← created in phase [{{X.Y}}] · DPS anchor: CONTRACTS Ref<{{SCHEMA}}>
│
├── {{MODULE_1}}/
│   ├── {{FILE_3}}           ← created in phase [{{X.Y}}] · DPS anchor: BLUEPRINT §5 {{COMP}}.{{function}}
│   └── {{FILE_4}}           ← created in phase [{{X.Y}}] · DPS anchor: CONTRACTS Section {{N}}
│
└── {{MODULE_2}}/
    └── {{FILE_5}}           ← created in phase [{{X.Y}}]
```

---

## 9. OBSERVABILITY

> Spec logging, metrics, và tracing để agent generate code với instrumentation đúng ngay từ đầu.
> Tên event/metric là contract với monitoring platform — thay đổi tên là breaking change.

📝 **FILL-IN**

### Log Events

> Mỗi event quan trọng cần được log với đúng level và đúng fields.
> Fields trong cột "Không log" là sensitive — agent tuyệt đối không đưa vào log.

| Event | Level | Emitted by | Required fields | Không log |
|---|---|---|---|---|
| `{{EVENT_1}}` | INFO | `{{COMP}}` | `{{field_a}}`, `{{field_b}}` | `{{SENSITIVE_FIELD}}` |
| `{{EVENT_2}}` | WARN | `{{COMP}}` | `{{field_a}}`, `error.code` | — |
| `{{EVENT_3}}` | ERROR | `{{COMP}}` | `{{field_a}}`, `error.code`, `error.trace` | `{{SENSITIVE_FIELD}}` |

> **Log format chuẩn (JSON structured logging):**
> ```
> {
>   "timestamp"  : "{{ISO_8601}}",
>   "level"      : "{{INFO/WARN/ERROR}}",
>   "event"      : "{{EVENT_NAME}}",       // từ bảng trên, stable — không tự ý đổi tên
>   "component"  : "{{COMP}}",
>   "trace_id"   : "{{ID}}",              // để correlate với distributed traces
>   "span_id"    : "{{ID}}",
>   ...fields                              // từ cột "Required fields"
> }
> ```

### Metrics

> Metrics để monitor SLAs đã define trong Section 7 (Performance).
> Tên metric phải stable — thay đổi tên là breaking change với dashboard và alert rules.

| Metric name | Type | Unit | Emitted by | Labels | Alert threshold | ADR Ref |
|---|---|---|---|---|---|---|
| `{{METRIC_1}}` | counter | — | `{{COMP}}` | `{{label_1}}`, `{{label_2}}` | — | — |
| `{{METRIC_2}}` | histogram | ms | `{{COMP}}` | `{{label}}` | P99 > {{N}}ms → WARN | ADR-{{N}} |
| `{{METRIC_3}}` | gauge | — | `{{COMP}}` | — | < {{N}} → FATAL | ADR-{{N}} |

> **Metric types:**
> - `counter`   — chỉ tăng (số requests, số errors, số retries)
> - `histogram` — phân phối latency, kích thước payload
> - `gauge`     — giá trị tại thời điểm đo (queue depth, active connections, cache size)
>
> **ADR Ref:** ADR nào chứa assumption liên quan đến metric này.
> Khi metric alert liên tục, người đọc biết ngay đi xem ADR nào để re-evaluate Confidence tag.
> Điền `—` nếu metric không gắn với assumption cụ thể nào trong ADR.
> Đây là cầu nối Arc 1 (Observability) → Arc 2 (Health): alert breach = evidence assumption đang sai.

### Distributed Traces

> Tạo span tại mọi I/O boundary để trace end-to-end latency.

📝 **FILL-IN** *(bỏ qua nếu không dùng distributed tracing)*

```
SPAN tạo tại:
  - Mỗi inbound request vào hệ thống         → ROOT SPAN
  - Mỗi lần gọi external service             → CHILD SPAN
  - Mỗi lần gọi database / cache             → CHILD SPAN
  - {{BOUNDARY_KHÁC}}                        → CHILD SPAN

SPAN attributes bắt buộc:
  - {{ATTR_1}} : {{GIÁ_TRỊ_VÀ_NGUỒN}}
  - {{ATTR_2}} : {{GIÁ_TRỊ_VÀ_NGUỒN}}
  - error      : true + error.message nếu operation fail

KHÔNG tạo span cho: {{PURE_COMPUTATION / IN_MEMORY_OPS}} — overhead không đáng
```
