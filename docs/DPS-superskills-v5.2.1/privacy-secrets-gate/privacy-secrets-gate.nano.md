# privacy-secrets-gate nano

Use when a task touches PII, secrets, credentials, payment/regulated data, logs, telemetry, prompts/tools, external APIs, exports, backups, or C4 data sensitivity.

Steps:
1. Classify data touched: PUBLIC / INTERNAL / CONFIDENTIAL / PII / SECRET / PAYMENT / REGULATED.
2. Map input, storage, logs, telemetry, external API/tool/prompt, export/backup, retention, access-control, and tenant boundaries.
3. Run a local secret/disclosure scan on the diff and repo-relevant paths.
4. Verify redaction, minimization, telemetry/log exclusions, fake test data, and external disclosure policy.
5. Output PASS / PASS_WITH_ACCEPTED_RISK / BLOCKED using claim grammar.

Never send secrets, sensitive PII, payment data, regulated data, or confidential customer data to an external API/model/reviewer without explicit policy approval and recorded evidence.
