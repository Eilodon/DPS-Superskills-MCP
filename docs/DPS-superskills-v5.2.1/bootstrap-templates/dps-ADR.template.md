# ADR.md — Architecture Decision Records
> **DPS VERSION:** `5.0-template`
> **DPS PROFILE:** `DPS-Standard` *(chọn: `DPS-Lite` / `DPS-Standard` / `DPS-Critical`)*
### {{TÊN_DỰ_ÁN}} · v{{VERSION}} · compatible with: [CONTRACTS v{{X}}, BLUEPRINT v{{Y}}]

> **Mục đích file này:** Ghi lại *tại sao* hệ thống được thiết kế như vậy.
> Không phải *cái gì* (CONTRACTS.md) hay *như thế nào* (BLUEPRINT.md) — mà là *tại sao*.
>
> File này là research layer — nơi iterate design, cân nhắc alternatives, ghi lại trade-offs.
> Khi đọc lại sau 6 tháng, file này giải thích mọi quyết định "trông có vẻ lạ" trong codebase.


> **DPS STATUS:** `DRAFT` *(chọn: `DRAFT` / `PROOF-READY` / `APPROVED-SSOT` / `IMPLEMENTATION-ACTIVE` / `LIVING-SPEC` / `SUPERSEDED`)*
> **PROMOTED BY:** {{WHO}} · **PROMOTED AT:** {{YYYY-MM-DD}}
> **PROMOTION BASIS:** {{review / stress-test / spike / audit / validation evidence}}
> **CURRENT AUTHORITY:** `DPS` *(default template value)* — nếu không phải `DPS`, ghi rõ lý do và phạm vi.
>
> **Rule:** `DRAFT` chưa được dùng làm source để agent implement. Chỉ `APPROVED-SSOT`, `IMPLEMENTATION-ACTIVE`, hoặc `LIVING-SPEC` mới là implementation authority.
---

## Mục lục

> Cập nhật bảng này mỗi khi tạo ADR mới.

| ADR | Title | Status | CONFIDENCE | DECISION TYPE | Tags |
|---|---|---|---|---|---|
| [ADR-001](#adr-001) | {{TÊN}} | ✅ ACCEPTED | `HIGH` | `COMPARATIVE` | `{{TAG}}` |
| [ADR-002](#adr-002) | {{TÊN}} | ✅ ACCEPTED | `MEDIUM` | `COMPARATIVE` | `{{TAG}}` |
| 📝 | Thêm khi tạo ADR mới | | | | |

> **Tại sao cần cột CONFIDENCE ở đây:**
> Khi triage "ADR nào cần review trước?", lọc các ADR có `LOW` confidence —
> những quyết định fragile nhất và cần attention nhất khi system evolve.
>
> **Tại sao cần cột DECISION TYPE ở đây:**
> Khi onboard người mới, giúp họ biết ADR nào có deliberative alternatives (COMPARATIVE)
> vs. ADR nào là experience-driven (EXPERIENCE-DRIVEN) để calibrate expectation khi đọc.

---

## Cách đọc file này

**Status của mỗi ADR:**

| Status | Ý nghĩa |
|---|---|
| 🟡 `PROPOSED` | Đang cân nhắc, chưa chốt |
| ✅ `ACCEPTED` | Đã chốt, đang implement |
| ❌ `REJECTED` | Đã cân nhắc, không chọn — nhưng giữ lại để tránh propose lại |
| 🔄 `SUPERSEDED by ADR-xxx` | Đã thay thế bởi ADR khác |
| ⏸️ `DEFERRED` | Quyết định hoãn lại đến phase sau |

**CONFIDENCE — mức độ chắc chắn của decision tại thời điểm viết:**

| Level | Ý nghĩa | Bắt buộc thêm |
|---|---|---|
| `HIGH` | Evidence đủ để tin tưởng decision này ổn định | — |
| `MEDIUM` | Có reasonable basis nhưng còn uncertainty | — |
| `LOW` | Assumption-heavy; cần được validate bởi observable signal | **VALIDATION TARGET bắt buộc** |

**VOLATILITY — khả năng decision thay đổi theo thời gian:**

| Level | Ý nghĩa | Bắt buộc thêm |
|---|---|---|
| `STABLE` | Ít có khả năng thay đổi; foundation decisions | — |
| `WATCHFUL` | Có thể thay đổi nếu environment thay đổi | **WATCH SIGNAL bắt buộc** |
| `VOLATILE` | Nhiều khả năng thay đổi khi có thêm data | **WATCH SIGNAL bắt buộc** |

> **Decision reliability matrix:** CONFIDENCE × VOLATILITY ảnh hưởng đến cách đọc IMPACT RADIUS.
> ADR có `CONFIDENCE = LOW` + `VOLATILITY = VOLATILE` mà IMPACT RADIUS sâu là **architectural smell** —
> nhiều decisions đang depend on một foundation không vững.
> Cân nhắc reduce dependencies hoặc build isolation layer trước khi proceed.
>
> LOW + VOLATILE = "high blast radius khi thay đổi" — **set `BLAST RADIUS: CRITICAL`** trong IMPACT RADIUS block
> và xem xét kỹ trước khi cho phase gate advance. Đây là tín hiệu cần isolate risk ngay,
> không phải chỉ document rồi để đó.

**Khi nào cần tạo ADR mới:**
- Thay đổi ảnh hưởng đến schema hoặc I/O contract (breaking change)
- Chọn giữa hai hoặc nhiều technical approaches
- Quyết định về security, privacy, hoặc compliance
- Bất kỳ thứ gì mà sau này sẽ tự hỏi "tại sao lại làm vậy?"

---

<a id="adr-001"></a>

## ADR-001 — {{Tên Quyết Định Đầu Tiên}}

**Status:** ✅ ACCEPTED
**Date:** {{NGÀY}}
**Deciders:** {{NGƯỜI/NHÓM}}
**Tags:** `{{TAG_1}}` `{{TAG_2}}`
**Change Classification:** `{{DESIGN CHANGE | EXTERNAL CONSTRAINT CHANGE | INTENT DRIFT | SPEC BUG}}` *(xem README Change Classification Protocol; `IMPLEMENTATION BUG` không tạo ADR entry vì chỉ fix code theo DPS hiện hành)*
**Review date:** {{NGÀY}} — re-evaluate khi {{ĐIỀU_KIỆN_TRIGGER}}
**Supersedes:** —                   ← điền nếu ADR này thay thế các ADR cũ; `—` nếu không
**Superseded by:** —                ← điền khi ADR này bị supersede bởi ADR-N; `—` cho đến khi xảy ra

**DECISION TYPE:** `COMPARATIVE`
  *(chọn: `COMPARATIVE` / `EXPERIENCE-DRIVEN` / `CONSTRAINT-FORCED` / `CONSENSUS`)*
  *(type này quyết định format của "Options Considered" — xem hướng dẫn cuối file)*

**CONFIDENCE :** `HIGH` *(hoặc MEDIUM / LOW)* — {{LÝ_DO_MỨC_ĐỘ_TIN_TƯỞNG}}
  → *(Bắt buộc nếu LOW)* **VALIDATION TARGET:** {{signal cụ thể, đo được — khi gặp signal này phải update Confidence}}
**LAST CONFIRMED:** {{YYYY-MM-DD}} — `INITIAL`
  *(upgrade lên: `IMPLEMENTATION` / `METRICS` / `REVIEW` khi confidence được validate — xem hướng dẫn cuối file)*

**VOLATILITY :** `STABLE` *(hoặc WATCHFUL / VOLATILE)* — {{LÝ_DO_ĐỘ_ỔN_ĐỊNH}}
  → *(Bắt buộc nếu WATCHFUL/VOLATILE)* **WATCH SIGNAL:** {{trigger condition — khi nào re-evaluate decision này}}

### Context

📝 **FILL-IN:** Mô tả vấn đề cần giải quyết và bối cảnh kỹ thuật.
Tập trung vào: constraints, forces, requirements dẫn đến quyết định này.

{{MÔ_TẢ_BỐI_CẢNH_VÀ_VẤN_ĐỀ}}

**Constraints:**
- {{CONSTRAINT_1}}
- {{CONSTRAINT_2}}

**Requirements:**
- {{REQUIREMENT_1}}
- {{REQUIREMENT_2}}

### Options Considered

📝 **FILL-IN:** Liệt kê tất cả options đã cân nhắc — kể cả options không chọn.
Với mỗi option: pros, cons, và lý do loại ra hoặc chọn.

#### Option A: {{TÊN_OPTION_A}} ← **CHOSEN**

```
Mô tả: {{MÔ_TẢ_KỸ_THUẬT}}
```

| Pros | Cons |
|---|---|
| {{PRO_1}} | {{CON_1}} |
| {{PRO_2}} | {{CON_2}} |

#### Option B: {{TÊN_OPTION_B}}

```
Mô tả: {{MÔ_TẢ_KỸ_THUẬT}}
```

| Pros | Cons |
|---|---|
| {{PRO_1}} | {{CON_1}} |
| {{PRO_2}} | {{CON_2}} |

**Loại vì:** {{LÝ_DO_LOẠI_NGẮN_GỌN}}

#### Option C: {{TÊN_OPTION_C}}

**Loại vì:** {{LÝ_DO_LOẠI}}

### Decision

> **Chọn Option A vì:** {{LÝ_DO_CHỌN — nối thẳng với constraints và requirements ở trên}}

### Impact

📝 **FILL-IN:** Điền sau khi decision được ACCEPTED.

**Schemas thay đổi:** `{{SCHEMA_1}}` (thêm field), `{{SCHEMA_2}}` (rename)
**Components thay đổi:** `{{COMP_A}}`, `{{COMP_B}}`
**Breaking change:** CÓ/KHÔNG — xem Schema Changelog v{{X.Y}}

**IMPACT RADIUS:**
```
BLAST RADIUS : {{CONTAINED / MODERATE / WIDE / CRITICAL}}
               // CRITICAL   — CONFIDENCE=LOW + VOLATILITY=VOLATILE + cascade chain ≥ 3 hops
               // WIDE       — nhiều components/schemas bị ảnh hưởng, cascade ≥ 2 hops
               // MODERATE   — một vài components, cascade 1 hop
               // CONTAINED  — impact giới hạn trong 1 component, không có schema breaking change

Cascades   : {{COMP_A}} → {{COMP_B}} → {{COMP_C_HOẶC_EXTERNAL}}
             // vd: PaymentProcessor → NotificationService → EmailGateway

Schema deps: `{{SCHEMA_1}}` — consumed by: {{COMP_A}}, {{COMP_B}}
             `{{SCHEMA_2}}` — consumed by: {{COMP_C}}

⚠️ Khi ADR này bị SUPERSEDED → trigger review bắt buộc:
   Components : {{COMP_A}}, {{COMP_B}}          // dùng tên — không phải section numbers
   Schemas    : `{{SCHEMA_1}}`, `{{SCHEMA_2}}`  // tên là contract; section numbers thay đổi khi template evolve
   Cascade Review: 🔄 Pending                   // update thành ✅ Done khi tất cả items đã reviewed
                                                 // hoặc ⚠️ OVERRIDE: {{lý_do}} nếu accept risk
```

### Consequences

**Tích cực:**
- {{HỆ_QUẢ_TỐT_1}}
- {{HỆ_QUẢ_TỐT_2}}

**Tiêu cực / Trade-offs chấp nhận được:**
- {{TRADE_OFF_1}} — chấp nhận vì {{LÝ_DO}}
- {{TRADE_OFF_2}} — sẽ revisit ở {{PHASE/VERSION}}

**Rủi ro:**
- {{RỦI_RO_1}} — mitigate bằng {{CÁCH}}
- {{RỦI_RO_2}} — trigger review nếu {{ĐIỀU_KIỆN}}

### Implementation Notes

📝 **FILL-IN:** Những điều đặc biệt cần lưu ý khi implement quyết định này.
Đây là cầu nối từ "tại sao" sang "như thế nào" — không trùng với BLUEPRINT.md
mà là context để hiểu đúng intent khi đọc BLUEPRINT.md.

- {{GHI_CHÚ_IMPL_1}}
- {{GHI_CHÚ_IMPL_2}}

**Xem thêm:** BLUEPRINT.md Section {{N}}, CONTRACTS.md `{{SCHEMA}}`

---

<a id="adr-002"></a>

## ADR-002 — {{Tên Quyết Định}}

**Status:** ✅ ACCEPTED
**Date:** {{NGÀY}}
**Deciders:** {{NGƯỜI/NHÓM}}
**Tags:** `{{TAG}}`
**Change Classification:** `{{DESIGN CHANGE | EXTERNAL CONSTRAINT CHANGE | INTENT DRIFT | SPEC BUG}}` *(xem README Change Classification Protocol; `IMPLEMENTATION BUG` không tạo ADR entry vì chỉ fix code theo DPS hiện hành)*
**Review date:** {{NGÀY}} — re-evaluate khi {{ĐIỀU_KIỆN_TRIGGER}}
**Supersedes:** —
**Superseded by:** —

**DECISION TYPE:** `COMPARATIVE`
  *(chọn: `COMPARATIVE` / `EXPERIENCE-DRIVEN` / `CONSTRAINT-FORCED` / `CONSENSUS`)*

**CONFIDENCE :** `HIGH` *(hoặc MEDIUM / LOW)* — {{LÝ_DO_MỨC_ĐỘ_TIN_TƯỞNG}}
  → *(Bắt buộc nếu LOW)* **VALIDATION TARGET:** {{signal cụ thể, đo được — khi gặp signal này phải update Confidence}}
**LAST CONFIRMED:** {{YYYY-MM-DD}} — `INITIAL`
  *(upgrade lên: `IMPLEMENTATION` / `METRICS` / `REVIEW` khi được validate)*

**VOLATILITY :** `STABLE` *(hoặc WATCHFUL / VOLATILE)* — {{LÝ_DO_ĐỘ_ỔN_ĐỊNH}}
  → *(Bắt buộc nếu WATCHFUL/VOLATILE)* **WATCH SIGNAL:** {{trigger condition — khi nào re-evaluate decision này}}

### Context

{{MÔ_TẢ}}

### Options Considered

#### Option A: {{TÊN}} ← **CHOSEN**

| Pros | Cons |
|---|---|
| {{PRO}} | {{CON}} |

#### Option B: {{TÊN}}

**Loại vì:** {{LÝ_DO}}

### Decision

> **Chọn Option A vì:** {{LÝ_DO}}

### Impact

**Schemas thay đổi:** `{{SCHEMA}}` ({{LOẠI_THAY_ĐỔI}})
**Components thay đổi:** `{{COMP}}`
**Breaking change:** CÓ/KHÔNG — xem Schema Changelog v{{X.Y}}

**IMPACT RADIUS:**
```
BLAST RADIUS : {{CONTAINED / MODERATE / WIDE / CRITICAL}}

Cascades   : {{COMP}} → {{DOWNSTREAM}}
Schema deps: `{{SCHEMA}}` — consumed by: {{COMP}}, {{OTHER_COMP}}

⚠️ Khi ADR này bị SUPERSEDED → trigger review bắt buộc:
   Components : {{COMP}}
   Schemas    : `{{SCHEMA}}`
   Cascade Review: 🔄 Pending   // update thành ✅ Done hoặc ⚠️ OVERRIDE: {{lý_do}}
```

### Consequences

**Tích cực:** {{HỆ_QUẢ}}
**Trade-offs:** {{TRADE_OFF}}

---

## ADR-{{N}} — Template (copy khi tạo ADR mới)

**Status:** 🟡 PROPOSED
**Date:** {{NGÀY}}
**Deciders:** {{NGƯỜI/NHÓM}}
**Tags:** `{{TAG}}`
**Change Classification:** `{{DESIGN CHANGE | EXTERNAL CONSTRAINT CHANGE | INTENT DRIFT | SPEC BUG}}` *(xem README Change Classification Protocol; `IMPLEMENTATION BUG` không tạo ADR entry vì chỉ fix code theo DPS hiện hành)*
**Review date:** {{NGÀY}} — re-evaluate khi {{ĐIỀU_KIỆN_TRIGGER}}
**Supersedes:** —                   ← điền nếu ADR này thay thế ADR cũ
**Superseded by:** —                ← điền khi bị supersede

**DECISION TYPE:** `COMPARATIVE`
  *(chọn: `COMPARATIVE` / `EXPERIENCE-DRIVEN` / `CONSTRAINT-FORCED` / `CONSENSUS`)*
  *(type này quyết định format section "Options Considered" phía dưới —
   xem "Decision Type Format Variants" cuối file để copy format phù hợp)*

**CONFIDENCE :** `HIGH` *(hoặc MEDIUM / LOW)*
  → *(Bắt buộc nếu LOW)* **VALIDATION TARGET:** *(điền signal cụ thể, đo được)*
**LAST CONFIRMED:** {{YYYY-MM-DD}} — `INITIAL`
  *(điền ngày viết ADR này; upgrade type khi confidence được validate)*

**VOLATILITY :** `STABLE` *(hoặc WATCHFUL / VOLATILE)*
  → *(Bắt buộc nếu WATCHFUL/VOLATILE)* **WATCH SIGNAL:** *(điền trigger condition)*

### Context

{{MÔ_TẢ}}

### Options Considered

> **Format section này thay đổi theo DECISION TYPE:**
> - `COMPARATIVE` → giữ format Option A/B/C bên dưới
> - `EXPERIENCE-DRIVEN` → xóa section này, thay bằng **Evidence Base** (xem cuối file)
> - `CONSTRAINT-FORCED` → xóa section này, thay bằng **Constraint Analysis** (xem cuối file)
> - `CONSENSUS` → xóa section này, thay bằng **Consensus Basis** (xem cuối file)
>
> *Dummy Alternative anti-pattern: nếu DECISION TYPE = COMPARATIVE, đảm bảo các alternatives
> thực sự được cân nhắc — không construct fake options để cho có hình thức (xem Smell Indicators trong README.md).*

#### Option A: {{TÊN}}

| Pros | Cons |
|---|---|
| | |

#### Option B: {{TÊN}}

| Pros | Cons |
|---|---|
| | |

### Decision

> **Chọn ... vì:**
> Nếu ADR này promote artifact sang SSOT hoặc supersede decision cũ, ghi rõ lifecycle impact.

### Impact

**Schemas thay đổi:** *(điền sau khi ACCEPTED)*
**Components thay đổi:** *(điền sau khi ACCEPTED)*
**Breaking change:** CÓ/KHÔNG — xem Schema Changelog v{{X.Y}}

**IMPACT RADIUS:**
```
BLAST RADIUS : {{CONTAINED / MODERATE / WIDE / CRITICAL}}
               // CRITICAL khi CONFIDENCE=LOW + VOLATILITY=VOLATILE + cascade chain sâu

Cascades   : *(điền sau khi ACCEPTED — trace dependency chain bị ảnh hưởng)*
Schema deps: *(schema nào bị thay đổi và ai consume chúng)*

⚠️ Khi ADR này bị SUPERSEDED → trigger review bắt buộc:
   Components : *(điền tên components — không phải section numbers)*
   Schemas    : *(điền tên schemas)*
   Cascade Review: 🔄 Pending   // update thành ✅ Done hoặc ⚠️ OVERRIDE: {{lý_do}}
```

### Consequences

**Tích cực:**
**Trade-offs:**
**Rủi ro:**

---

## Decision Type Format Variants

> Section này là reference — không phải content ADR.
> Khi tạo ADR mới với DECISION TYPE ≠ COMPARATIVE:
> 1. Copy section tương ứng bên dưới
> 2. Dùng nó thay thế "Options Considered" trong ADR
> 3. Xóa section này khỏi ADR cụ thể đó

---

### Variant: EXPERIENCE-DRIVEN — Evidence Base

> Dùng khi: chọn dựa trên direct experience, không có real alternatives được evaluate.
> **Không construct fake alternatives** — thay vào đó mô tả evidence basis.

```
### Evidence Base

**Direct experience:** {{Dự án / context nào cung cấp experience — có thể general nếu confidential}}
**Key insight:** {{Điều gì từ experience đó lead đến decision này}}
**Risk accepted:** {{Điều gì có thể đi sai khi không compare alternatives}}
**Would reconsider if:** {{Condition nào trigger re-evaluation với proper comparative analysis}}
```

---

### Variant: CONSTRAINT-FORCED — Constraint Analysis

> Dùng khi: chỉ có 1 viable option do constraint cứng (vendor lock-in, regulatory, legacy, etc.)

```
### Constraint Analysis

**Binding constraint:** {{Constraint nào loại bỏ tất cả alternatives}}
**Constraint source:** {{Vendor contract / Regulatory / Technical debt / Legacy system}}
**Alternatives ruled out by constraint:**
  - {{ALTERNATIVE_A}} — loại vì constraint này ngăn {{LÝ_DO_CỤ_THỂ}}
  - {{ALTERNATIVE_B}} — loại vì {{LÝ_DO_CỤ_THỂ}}
**Constraint review date:** {{Khi nào constraint này có thể thay đổi — để biết khi nào có thể reopen decision}}
```

---

### Variant: CONSENSUS — Consensus Basis

> Dùng khi: team consensus không qua discrete alternatives.

```
### Consensus Basis

**Agreement basis:** {{Lý do consensus — shared experience / domain knowledge / default best practice}}
**Dissenters acknowledged:** {{Ai đã có reservations — không cần detail, chỉ acknowledge để transparency}}
**Would formally evaluate if:** {{Khi nào team sẽ revisit với formal comparison}}
```

---

## LAST CONFIRMED — Hướng dẫn upgrade

> Cross-reference: README Arc 2 checklist explains how `LAST CONFIRMED` freshness is reviewed during living-spec maintenance.


> `LAST CONFIRMED` track khi nào và bằng cách nào một ADR được validate sau khi viết lần đầu.

| Giá trị | Ý nghĩa | Khi nào dùng |
|---|---|---|
| `INITIAL` | Mặc định khi viết ADR. Confidence là assessment, chưa có evidence. | Ngày viết ADR |
| `IMPLEMENTATION` | Confidence được confirm bởi implementation — design hoạt động như spec. | Sau khi implement xong phase liên quan |
| `METRICS` | Confirm bởi production metrics thực tế. | Sau khi có production data (ghi kèm metric reference) |
| `REVIEW` | Confirm bởi explicit team review sau một khoảng thời gian. | Sau team review (ghi kèm context review) |

> **Smell:** ADR có `LAST CONFIRMED: INITIAL` và date > 3 tháng trong khi `VOLATILITY = VOLATILE/WATCHFUL`
> → stale confidence, cần validate hoặc downgrade. Xem Arc 2 Smell Indicators trong README.md.
