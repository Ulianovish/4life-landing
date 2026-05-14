# Angela Bot — Plan 3: Observability & Deployment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Angela production-ready. Add GA4 funnel tracking (so transfervital.com sees `order_captured` events alongside its other GA4 events), a weekly KPI report CLI, deployment on Fly.io with persistent SQLite volume, automated encrypted backups, and a smoke-test runbook.

**Architecture:** A new `src/analytics/` module posts to GA4 Measurement Protocol whenever `order_captured` is recorded. A new `src/reports/` module reads the events table and prints a weekly KPI digest. Deployment goes to Fly.io because: (1) always-on for Baileys WebSocket, (2) persistent volume support for `data/` and `auth_state/`, (3) low cost (~USD 5–8/mo at this scale), (4) easy region selection (São Paulo for LATAM latency).

**Tech Stack:** GA4 Measurement Protocol (HTTP), Fly.io (`fly.toml` + Dockerfile), `litestream` (optional — SQLite replication to S3 for hot backups). Plan 3 uses a simpler `tar + gpg` backup to a destination of Mildred's choice for v1.

**Companion spec:** `docs/superpowers/specs/2026-05-14-whatsapp-sales-bot-design.md`
**Depends on:** Plans 1 and 2 complete.

---

## File structure added by this plan

```
angela-bot/
├── Dockerfile
├── fly.toml
├── .dockerignore
├── scripts/
│   ├── backup.sh           # tar + gpg of data/ and auth_state/
│   └── deploy-smoke.sh     # post-deploy verification
├── src/
│   ├── analytics/
│   │   └── ga4.ts          # GA4 Measurement Protocol client
│   └── reports/
│       └── weekly.ts       # KPI digest CLI
└── tests/
    ├── analytics/
    │   └── ga4.test.ts
    └── reports/
        └── weekly.test.ts
```

---

### Task 1: Extend config with GA4 + report knobs

**Files:**
- Modify: `angela-bot/src/config.ts`
- Modify: `angela-bot/.env.example`
- Modify: `angela-bot/tests/config.test.ts`

- [ ] **Step 1: Update `.env.example`**

Append:

```
# GA4 Measurement Protocol (G-5XXDTRSGVH from Mildred's tracking stack)
GA4_MEASUREMENT_ID=G-5XXDTRSGVH
GA4_API_SECRET=                 # generate in GA4 Admin → Data Streams → Measurement Protocol API secrets
GA4_ENABLED=true                # set to false in dev/test to skip
```

- [ ] **Step 2: Update `src/config.ts` schema**

Add to the `schema` zod object:

```typescript
GA4_MEASUREMENT_ID: z.string().regex(/^G-[A-Z0-9]+$/).optional(),
GA4_API_SECRET: z.string().optional(),
GA4_ENABLED: z.enum(["true", "false"]).default("false"),
```

Add to the returned object:

```typescript
ga4MeasurementId: parsed.GA4_MEASUREMENT_ID,
ga4ApiSecret: parsed.GA4_API_SECRET,
ga4Enabled: parsed.GA4_ENABLED === "true",
```

- [ ] **Step 3: Update `tests/config.test.ts`**

Add a test:

```typescript
test("ga4Enabled defaults to false and parses to boolean", () => {
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  process.env.MILDRED_PHONE_E164 = "+573001234567";
  delete process.env.GA4_ENABLED;
  expect(loadConfig().ga4Enabled).toBe(false);

  process.env.GA4_ENABLED = "true";
  expect(loadConfig().ga4Enabled).toBe(true);
});
```

- [ ] **Step 4: Run test**

```bash
bun test tests/config.test.ts
```

Expected: all tests in config pass.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts .env.example
git commit -m "feat(angela): config knobs for GA4 Measurement Protocol"
```

---

### Task 2: GA4 Measurement Protocol client

**Files:**
- Create: `angela-bot/src/analytics/ga4.ts`
- Test: `angela-bot/tests/analytics/ga4.test.ts`

The MP endpoint is `POST https://www.google-analytics.com/mp/collect?measurement_id=<ID>&api_secret=<SECRET>` with a JSON body containing `client_id` + `events`. We send `whatsapp_order_captured`.

- [ ] **Step 1: Write the failing test**

`tests/analytics/ga4.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { buildPayload } from "../../src/analytics/ga4";

test("buildPayload structures a GA4 event correctly", () => {
  const payload = buildPayload({
    clientId: "+573001112222",
    eventName: "whatsapp_order_captured",
    params: { producto: "riovida", pais: "Colombia", cantidad: 1 },
  });
  expect(payload.client_id).toBe("+573001112222");
  expect(payload.events.length).toBe(1);
  expect(payload.events[0].name).toBe("whatsapp_order_captured");
  expect(payload.events[0].params.producto).toBe("riovida");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/analytics/ga4.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/analytics/ga4.ts`**

```typescript
import { loadConfig } from "../config";

export type Ga4Event = {
  clientId: string;
  eventName: string;
  params: Record<string, string | number | boolean>;
};

export type Ga4Payload = {
  client_id: string;
  events: { name: string; params: Record<string, unknown> }[];
};

export function buildPayload(e: Ga4Event): Ga4Payload {
  return {
    client_id: e.clientId,
    events: [{ name: e.eventName, params: e.params }],
  };
}

export async function sendEvent(e: Ga4Event): Promise<void> {
  const cfg = loadConfig();
  if (!cfg.ga4Enabled || !cfg.ga4MeasurementId || !cfg.ga4ApiSecret) return;

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${cfg.ga4MeasurementId}&api_secret=${cfg.ga4ApiSecret}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildPayload(e)),
    });
    if (!res.ok) {
      console.warn("[ga4] non-2xx", res.status, await res.text());
    }
  } catch (err) {
    console.warn("[ga4] send failed", err);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/analytics/ga4.test.ts
```

Expected: 1 pass.

- [ ] **Step 5: Commit**

```bash
git add src/analytics/ga4.ts tests/analytics/ga4.test.ts
git commit -m "feat(angela): GA4 Measurement Protocol client"
```

---

### Task 3: Hook GA4 into the orchestrator at order_captured

**Files:**
- Modify: `angela-bot/src/orchestrator/process-message.ts`
- Modify: `angela-bot/tests/orchestrator/process-message.test.ts`

Inside the existing `tryExtractAndCreateOrder` function, after `recordEvent(... "order_captured" ...)`, call GA4. Failure must not break the flow (already guarded by `sendEvent`'s try/catch).

- [ ] **Step 1: Modify `src/orchestrator/process-message.ts`**

Add to imports:

```typescript
import { sendEvent as sendGa4 } from "../analytics/ga4";
```

Inside `tryExtractAndCreateOrder`, immediately after the existing `recordEvent(input.db, input.telefono, "order_captured", { orderId: id });` line, add:

```typescript
    await sendGa4({
      clientId: input.telefono,
      eventName: "whatsapp_order_captured",
      params: {
        producto_id: order.producto_id,
        pais: order.pais,
        cantidad: order.cantidad,
      },
    });
```

- [ ] **Step 2: Verify Plan 1 tests still pass**

```bash
bun test tests/orchestrator/process-message.test.ts tests/e2e/happy-path.test.ts
```

Expected: all pass (GA4 disabled by default in test env via `GA4_ENABLED=false` or missing).

- [ ] **Step 3: Commit**

```bash
git add src/orchestrator/process-message.ts
git commit -m "feat(angela): emit GA4 whatsapp_order_captured on order capture"
```

---

### Task 4: Weekly KPI report CLI

**Files:**
- Create: `angela-bot/src/reports/weekly.ts`
- Test: `angela-bot/tests/reports/weekly.test.ts`
- Modify: `angela-bot/package.json` (add `report` script)

KPIs from spec § 6:
- Conversaciones iniciadas / semana
- % que llega a RECOMMEND (interés real)
- % que llega a DATA_CAPTURE (intención de compra)
- % que llega a CONFIRMATION (pedido capturado) — KPI principal
- Top objeciones por frecuencia
- Tasa de handoff por motivo

- [ ] **Step 1: Write the failing test**

`tests/reports/weekly.test.ts`:

```typescript
import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { runMigrations } from "../../src/db/migrate";
import { getDb, closeDb } from "../../src/db/client";
import { record as recordEvent } from "../../src/db/repositories/events";
import { computeKpis } from "../../src/reports/weekly";

const DB = "./data/test-weekly.db";

beforeEach(() => {
  if (existsSync(DB)) unlinkSync(DB);
  runMigrations(DB);
});

afterEach(() => {
  closeDb();
  if (existsSync(DB)) unlinkSync(DB);
});

test("computeKpis returns counts and funnel %", () => {
  const db = getDb(DB);
  recordEvent(db, "+57111", "conversation_started", null);
  recordEvent(db, "+57111", "phase_changed", { to: "DISCOVERY" });
  recordEvent(db, "+57111", "phase_changed", { to: "RECOMMEND" });
  recordEvent(db, "+57111", "phase_changed", { to: "DATA_CAPTURE" });
  recordEvent(db, "+57111", "order_captured", null);

  recordEvent(db, "+57222", "conversation_started", null);
  recordEvent(db, "+57222", "phase_changed", { to: "DISCOVERY" });

  recordEvent(db, "+57333", "handoff_triggered", { motivo: "HANDOFF_HUMAN" });

  const k = computeKpis(db, 7);
  expect(k.conversationsStarted).toBe(2);
  expect(k.reachedRecommend).toBe(1);
  expect(k.reachedDataCapture).toBe(1);
  expect(k.ordersCaptured).toBe(1);
  expect(k.handoffsByMotivo["HANDOFF_HUMAN"]).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/reports/weekly.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/reports/weekly.ts`**

```typescript
import type { Database } from "bun:sqlite";

export type Kpis = {
  windowDays: number;
  conversationsStarted: number;
  reachedRecommend: number;
  reachedDataCapture: number;
  ordersCaptured: number;
  handoffsByMotivo: Record<string, number>;
  funnel: {
    interestRate: number;
    intentRate: number;
    captureRate: number;
  };
};

export function computeKpis(db: Database, windowDays: number): Kpis {
  const cutoff = `datetime('now', '-${windowDays} days')`;

  const conv = (db
    .query(
      `SELECT COUNT(*) AS c FROM events WHERE tipo = 'conversation_started' AND created_at >= ${cutoff}`,
    )
    .get() as { c: number }).c;

  const reachedRecommend = (db
    .query(
      `SELECT COUNT(DISTINCT telefono) AS c FROM events
       WHERE tipo = 'phase_changed' AND metadata LIKE '%"to":"RECOMMEND"%'
         AND created_at >= ${cutoff}`,
    )
    .get() as { c: number }).c;

  const reachedDataCapture = (db
    .query(
      `SELECT COUNT(DISTINCT telefono) AS c FROM events
       WHERE tipo = 'phase_changed' AND metadata LIKE '%"to":"DATA_CAPTURE"%'
         AND created_at >= ${cutoff}`,
    )
    .get() as { c: number }).c;

  const ordersCaptured = (db
    .query(
      `SELECT COUNT(*) AS c FROM events
       WHERE tipo = 'order_captured' AND created_at >= ${cutoff}`,
    )
    .get() as { c: number }).c;

  const handoffRows = db
    .query(
      `SELECT metadata FROM events
       WHERE tipo = 'handoff_triggered' AND created_at >= ${cutoff}`,
    )
    .all() as { metadata: string }[];
  const handoffsByMotivo: Record<string, number> = {};
  for (const row of handoffRows) {
    try {
      const meta = JSON.parse(row.metadata);
      const motivo = meta.motivo ?? "UNKNOWN";
      handoffsByMotivo[motivo] = (handoffsByMotivo[motivo] ?? 0) + 1;
    } catch {
      /* ignore */
    }
  }

  return {
    windowDays,
    conversationsStarted: conv,
    reachedRecommend,
    reachedDataCapture,
    ordersCaptured,
    handoffsByMotivo,
    funnel: {
      interestRate: conv === 0 ? 0 : reachedRecommend / conv,
      intentRate: conv === 0 ? 0 : reachedDataCapture / conv,
      captureRate: conv === 0 ? 0 : ordersCaptured / conv,
    },
  };
}

export function formatKpis(k: Kpis): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const lines = [
    `📊 Angela KPIs — ventana ${k.windowDays} días`,
    ``,
    `Conversaciones iniciadas:  ${k.conversationsStarted}`,
    `→ Llegaron a RECOMMEND:    ${k.reachedRecommend} (${pct(k.funnel.interestRate)})`,
    `→ Llegaron a DATA_CAPTURE: ${k.reachedDataCapture} (${pct(k.funnel.intentRate)})`,
    `→ Pedidos capturados:      ${k.ordersCaptured} (${pct(k.funnel.captureRate)})`,
    ``,
    `Handoffs por motivo:`,
  ];
  for (const [m, n] of Object.entries(k.handoffsByMotivo)) {
    lines.push(`  • ${m}: ${n}`);
  }
  if (Object.keys(k.handoffsByMotivo).length === 0) lines.push(`  (sin handoffs en el período)`);
  return lines.join("\n");
}

if (import.meta.main) {
  const { loadConfig } = await import("../config");
  const { getDb } = await import("../db/client");
  const cfg = loadConfig();
  const db = getDb(cfg.dbPath);
  const days = Number(process.argv[2] ?? "7");
  console.log(formatKpis(computeKpis(db, days)));
}
```

- [ ] **Step 4: Add `report` script to `package.json`**

```json
"report": "bun run src/reports/weekly.ts"
```

- [ ] **Step 5: Run test**

```bash
bun test tests/reports/weekly.test.ts
```

Expected: 1 pass.

- [ ] **Step 6: Smoke test the CLI**

```bash
bun run report 30
```

Expected: KPI digest printed (numbers will be zero in a fresh dev DB).

- [ ] **Step 7: Commit**

```bash
git add src/reports/ tests/reports/ package.json
git commit -m "feat(angela): weekly KPI report CLI"
```

---

### Task 5: Dockerfile

**Files:**
- Create: `angela-bot/Dockerfile`
- Create: `angela-bot/.dockerignore`

- [ ] **Step 1: Write `Dockerfile`**

```dockerfile
FROM oven/bun:1.1 AS base
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json bunfig.toml ./
COPY src ./src
COPY data ./data

RUN mkdir -p /app/data /app/auth_state

ENV NODE_ENV=production
CMD ["bun", "run", "src/main.ts"]
```

- [ ] **Step 2: Write `.dockerignore`**

```
node_modules
auth_state
data/*.db
data/*.db-journal
*.log
.env
.env.local
tests
docs
```

- [ ] **Step 3: Build locally to verify**

```bash
docker build -t angela-bot:dev .
```

Expected: image builds without errors.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat(angela): production Dockerfile"
```

---

### Task 6: Fly.io configuration

**Files:**
- Create: `angela-bot/fly.toml`

- [ ] **Step 1: Install `flyctl` (if not present)**

Per https://fly.io/docs/hands-on/install-flyctl/ — Mildred or the dev:

```bash
brew install flyctl     # macOS
fly auth signup         # or: fly auth login
```

- [ ] **Step 2: Initialize the app and volume**

Run inside `angela-bot/`:

```bash
fly launch --no-deploy --region gru --name transfervital-angela
fly volumes create angela_data --region gru --size 1
```

(`gru` = São Paulo, closest Fly region to Colombia. `1` GB is plenty for v1.)

- [ ] **Step 3: Overwrite `fly.toml`**

```toml
app = "transfervital-angela"
primary_region = "gru"

[build]

[env]
  GA4_ENABLED = "true"
  DB_PATH = "/data/angela.db"

[[mounts]]
  source = "angela_data"
  destination = "/data"

[processes]
  app = "bun run src/main.ts"

[[services]]
  # No HTTP service for the bot itself — Baileys uses outbound WebSocket only.
  # We keep this section empty so Fly does not assign a public port.

[checks]
  [checks.healthcheck]
    type = "exec"
    command = "test -f /data/healthcheck.txt"
    interval = "120s"
    timeout = "10s"
```

Note: `DB_PATH` and the healthcheck file location are inside the mounted volume so they survive restarts.

- [ ] **Step 4: Set secrets in Fly**

```bash
fly secrets set \
  ANTHROPIC_API_KEY="sk-ant-..." \
  ANTHROPIC_MODEL="claude-sonnet-4-6" \
  MILDRED_PHONE_E164="+57XXXXXXXXXX" \
  GA4_MEASUREMENT_ID="G-5XXDTRSGVH" \
  GA4_API_SECRET="..." \
  HISTORY_TURNS="20" \
  MAX_TURNS_PER_CONVERSATION="50"
```

- [ ] **Step 5: Adjust `src/main.ts` healthcheck path to honor the volume**

In `src/main.ts`, change:

```typescript
const HEALTHCHECK_FILE = "./data/healthcheck.txt";
```

to read from a directory derived from `DB_PATH`:

```typescript
import { dirname } from "node:path";
import { loadConfig } from "./config";
const HEALTHCHECK_FILE = `${dirname(loadConfig().dbPath)}/healthcheck.txt`;
```

(If this conflicts with the existing top-level usage, hoist the variable into `main()` after `loadConfig()`.)

- [ ] **Step 6: Commit**

```bash
git add fly.toml src/main.ts
git commit -m "feat(angela): Fly.io config with persistent volume + healthcheck"
```

---

### Task 7: First deployment + QR pairing

**Files:** none — operational.

Pairing the WhatsApp account requires interactive QR scanning. Strategy: deploy once with `fly deploy`, then watch logs (`fly logs`) to capture the QR, scan it from the Transfer Vital phone within 60s.

- [ ] **Step 1: Deploy**

```bash
fly deploy
```

Expected: build + deploy succeeds. Machine starts.

- [ ] **Step 2: Stream logs and scan QR**

```bash
fly logs
```

Wait for the ASCII QR block. Open WhatsApp on the Transfer Vital phone → Settings → Linked Devices → Link Device → scan.

- [ ] **Step 3: Verify "Angela is live" appears**

If pairing succeeds, logs show:

```
[whatsapp] connected
[main] Angela is live
```

- [ ] **Step 4: Smoke test from a different phone**

Message the Transfer Vital number `hola` from another phone. Verify Angela replies.

- [ ] **Step 5: Verify GA4 event**

In GA4 Realtime view (G-5XXDTRSGVH), capture an order via the bot and confirm `whatsapp_order_captured` appears in Realtime events. If not, double-check `GA4_API_SECRET` and `GA4_ENABLED=true` are set.

---

### Task 8: Backup script

**Files:**
- Create: `angela-bot/scripts/backup.sh`

A simple snapshot-style backup. Mildred sets `BACKUP_PASSPHRASE` and `BACKUP_DEST_DIR` via env. The script tars the SQLite DB + auth_state, encrypts with gpg symmetric, and drops it in the destination directory. Schedulable via Fly machine cron or external trigger.

- [ ] **Step 1: Write `scripts/backup.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${BACKUP_PASSPHRASE:?must be set}"
: "${BACKUP_DEST_DIR:?must be set (e.g. /backups)}"
: "${DB_PATH:?must be set}"

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DB_DIR=$(dirname "$DB_PATH")
OUT="$BACKUP_DEST_DIR/angela-${STAMP}.tar.gz.gpg"

mkdir -p "$BACKUP_DEST_DIR"
tar -czf - -C "$DB_DIR" . | \
  gpg --batch --yes --symmetric --cipher-algo AES256 \
      --passphrase "$BACKUP_PASSPHRASE" -o "$OUT"

echo "Backup written: $OUT"

# Retain only the last 14 backups
ls -1t "$BACKUP_DEST_DIR"/angela-*.tar.gz.gpg | tail -n +15 | xargs -r rm --
```

- [ ] **Step 2: Make it executable + document**

```bash
chmod +x scripts/backup.sh
```

Append to `README.md`:

```markdown
## Backups

Manual run:

    BACKUP_PASSPHRASE=... BACKUP_DEST_DIR=/path/to/backups DB_PATH=./data/angela.db ./scripts/backup.sh

Restore:

    gpg --decrypt angela-<stamp>.tar.gz.gpg | tar -xz -C /path/to/restore
```

- [ ] **Step 3: Commit**

```bash
git add scripts/backup.sh README.md
git commit -m "feat(angela): encrypted backup script with retention"
```

---

### Task 9: Production smoke-test script

**Files:**
- Create: `angela-bot/scripts/deploy-smoke.sh`

Run after every deploy. Tails Fly logs for the "Angela is live" line and exits non-zero if it does not appear within 60s.

- [ ] **Step 1: Write `scripts/deploy-smoke.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

APP="${FLY_APP:-transfervital-angela}"
TIMEOUT=60

echo "Tailing logs for $APP, waiting up to ${TIMEOUT}s for 'Angela is live'..."

if timeout "$TIMEOUT" fly logs -a "$APP" 2>&1 | grep -m 1 -q "Angela is live"; then
  echo "✅ Angela is live"
  exit 0
else
  echo "❌ Did not see 'Angela is live' within ${TIMEOUT}s"
  echo "Check: fly logs -a $APP"
  exit 1
fi
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x scripts/deploy-smoke.sh
```

- [ ] **Step 3: Run it after a deploy**

```bash
fly deploy && ./scripts/deploy-smoke.sh
```

Expected: deploy completes, smoke test prints ✅.

- [ ] **Step 4: Commit**

```bash
git add scripts/deploy-smoke.sh
git commit -m "feat(angela): post-deploy smoke test"
```

---

### Task 10: Deployment runbook

**Files:**
- Modify: `angela-bot/README.md`

- [ ] **Step 1: Append a "Production" section to `README.md`**

```markdown
## Production runbook

### Stack

- Fly.io app: `transfervital-angela` in `gru` (São Paulo)
- Volume: `angela_data` (1 GB) mounted at `/data`
- Secrets: managed via `fly secrets`
- Healthcheck: file `/data/healthcheck.txt` touched every 60s

### Deploy

    fly deploy && ./scripts/deploy-smoke.sh

### Re-pair WhatsApp (if logged out)

1. `fly machine restart -a transfervital-angela` (or `fly deploy` to rebuild)
2. `fly logs` and capture the QR
3. Scan from Transfer Vital phone within 60s

### Rotate Anthropic key

    fly secrets set ANTHROPIC_API_KEY=sk-ant-new-key

Machine restarts automatically.

### Update catalog or prompt

Catalog edits → modify `data/catalog-seed.json` → `fly deploy`.
Prompt edits → modify `src/prompt/*.ts` → `fly deploy`.

Prompt caching invalidates on any `cachedSystem` change — next message
will pay the full cache-miss cost once, then resume cache hits.

### Backup schedule

External cron (or a separate small Fly app) runs `scripts/backup.sh`
nightly with secrets sourced from your password manager. Backups land
in your chosen destination (S3, Google Drive sync, etc.).

### Metrics review

Weekly:

    fly ssh console -a transfervital-angela
    bun run report 7
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs(angela): production runbook"
```

---

## Self-review checklist for this plan

1. **Spec coverage:** § 6 GA4 ✓ (Task 3), § 6 weekly KPIs ✓ (Task 4), § 7 hosting ✓ (Task 5–7), § 6 backups ✓ (Task 8), § 7 production runbook ✓ (Task 10).
2. **All tests pass:** `bun test` is green including new GA4 + reports tests.
3. **Deploy succeeds** on Fly with persistent volume; QR pairing works; bot survives restarts without re-pairing.
4. **GA4 event** visible in Realtime view after a captured order.
5. **No placeholders** — every command is runnable; every secret is documented in `.env.example` and the runbook.

## Plan-of-plans summary

| Plan | Deliverable | Approx tasks |
|------|-------------|----|
| 1    | Conversation engine + REPL test harness | 21 |
| 2    | Live WhatsApp bot via Baileys + admin commands | 10 |
| 3    | GA4 + KPI reports + Fly.io deployment + backups | 10 |

After Plan 3 ships, Angela is operational. Future iterations (v2+ per spec § 7) build on top of this foundation without altering the core architecture.
