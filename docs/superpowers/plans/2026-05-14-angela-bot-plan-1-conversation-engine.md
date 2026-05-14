# Angela Bot — Plan 1: Conversation Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full conversation engine for Angela (DB, catalog, prompt assembly, state machine, LLM integration, orchestrator, and CLI test harness) so the bot can be conversed with end-to-end via terminal — without any WhatsApp integration. Plans 2 and 3 stack WhatsApp and observability on top.

**Architecture:** Single Bun service. SQLite for persistence. Anthropic SDK for Claude Sonnet 4.6 with prompt caching. Layered modules: `db/` → `catalog/` → `prompt/` → `state/` → `llm/` → `orchestrator/` → `cli/`. Each layer has narrow responsibility, tested in isolation. A REPL in `src/cli/repl.ts` lets the dev (and Mildred) talk to Angela from the terminal exactly as if she were on WhatsApp.

**Tech Stack:** Bun (runtime + bundler + test runner), TypeScript, `bun:sqlite`, `@anthropic-ai/sdk`, `zod` (validation), `dotenv` not needed (Bun loads `.env` natively).

**Companion spec:** `docs/superpowers/specs/2026-05-14-whatsapp-sales-bot-design.md`

---

## File structure produced by this plan

```
angela-bot/
├── package.json
├── tsconfig.json
├── bunfig.toml
├── .env.example
├── .gitignore
├── README.md
├── data/
│   └── catalog-seed.json          # placeholder; Mildred fills real data
├── src/
│   ├── config.ts                   # env vars typed + validated
│   ├── db/
│   │   ├── client.ts               # SQLite singleton
│   │   ├── schema.sql              # tables
│   │   ├── migrate.ts              # runs schema.sql idempotently
│   │   └── repositories/
│   │       ├── conversations.ts
│   │       ├── messages.ts
│   │       ├── orders.ts
│   │       └── events.ts
│   ├── catalog/
│   │   ├── types.ts                # Product, Guide types
│   │   ├── loader.ts               # load + validate seed JSON
│   │   └── lookup.ts               # findById, listAll, byUseCase
│   ├── prompt/
│   │   ├── identity.ts             # Angela identity block (Camino B)
│   │   ├── voice.ts                # tone rules + anti-patterns
│   │   ├── guardrails.ts           # compliance rules
│   │   ├── phase-instructions.ts   # per-state instructions
│   │   └── assemble.ts             # composes the full system prompt
│   ├── state/
│   │   ├── states.ts               # State enum
│   │   ├── triggers.ts             # handoff trigger detection
│   │   └── transitions.ts          # next-state logic
│   ├── llm/
│   │   ├── client.ts               # Anthropic SDK wrapper
│   │   ├── invoke.ts               # call w/ prompt caching
│   │   └── validator.ts            # post-response compliance check
│   ├── orchestrator/
│   │   ├── process-message.ts      # main entrypoint per inbound msg
│   │   └── extract-order.ts        # extract structured order from chat
│   ├── notifier/
│   │   └── notifier.ts             # interface only; impl in Plan 2
│   └── cli/
│       └── repl.ts                 # interactive test harness
└── tests/
    ├── db/
    │   ├── migrate.test.ts
    │   ├── conversations.test.ts
    │   ├── messages.test.ts
    │   ├── orders.test.ts
    │   └── events.test.ts
    ├── catalog/
    │   └── loader.test.ts
    ├── prompt/
    │   └── assemble.test.ts
    ├── state/
    │   ├── triggers.test.ts
    │   └── transitions.test.ts
    ├── llm/
    │   └── validator.test.ts
    ├── orchestrator/
    │   ├── process-message.test.ts
    │   └── extract-order.test.ts
    └── e2e/
        └── happy-path.test.ts
```

Each file has one responsibility. The orchestrator is the only "thick" module — everything else is a focused helper.

---

### Task 1: Scaffold project

**Files:**
- Create: `angela-bot/package.json`
- Create: `angela-bot/tsconfig.json`
- Create: `angela-bot/bunfig.toml`
- Create: `angela-bot/.gitignore`
- Create: `angela-bot/.env.example`
- Create: `angela-bot/README.md`

This task creates the project skeleton. **Run all commands from inside `angela-bot/`** unless stated otherwise.

- [ ] **Step 1: Create the project directory**

```bash
mkdir -p angela-bot && cd angela-bot
bun init -y
```

This generates a minimal `package.json` and `tsconfig.json`. We will overwrite them.

- [ ] **Step 2: Write `package.json`**

Overwrite the generated file:

```json
{
  "name": "angela-bot",
  "version": "0.1.0",
  "description": "Angela — WhatsApp sales bot for Transfer Vital (4life). Plan 1: conversation engine.",
  "type": "module",
  "scripts": {
    "migrate": "bun run src/db/migrate.ts",
    "repl": "bun run src/cli/repl.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.36.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "types": ["bun-types"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 4: Write `bunfig.toml`**

```toml
[test]
preload = []
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules/
.env
.env.local
*.db
*.db-journal
data/angela.db*
dist/
.DS_Store
auth_state/
```

- [ ] **Step 6: Write `.env.example`**

```
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

# Database
DB_PATH=./data/angela.db

# Mildred (used for the notification stub in Plan 1; real notifier comes in Plan 2)
MILDRED_PHONE_E164=+57XXXXXXXXXX

# Conversation
HISTORY_TURNS=20
MAX_TURNS_PER_CONVERSATION=50
```

- [ ] **Step 7: Write minimal `README.md`**

```markdown
# Angela Bot

WhatsApp sales bot for Transfer Vital. See companion spec at
`docs/superpowers/specs/2026-05-14-whatsapp-sales-bot-design.md`.

## Setup

    bun install
    cp .env.example .env   # fill ANTHROPIC_API_KEY
    bun run migrate
    bun run repl           # talk to Angela in your terminal

## Test

    bun test
```

- [ ] **Step 8: Install dependencies**

```bash
bun install
```

Expected: lockfile created, no errors.

- [ ] **Step 9: Verify typecheck passes (empty project)**

```bash
bun run typecheck
```

Expected: exits 0 with no output (no source files yet).

- [ ] **Step 10: Commit**

```bash
git init  # if not inside an existing repo
git add .
git commit -m "feat(angela): scaffold Bun project"
```

---

### Task 2: Typed config loader

**Files:**
- Create: `angela-bot/src/config.ts`
- Test: `angela-bot/tests/config.test.ts`

The config module reads from `process.env` (Bun auto-loads `.env`) and validates with zod. Every other module imports `config` from here — never reads `process.env` directly.

- [ ] **Step 1: Write the failing test**

`tests/config.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { loadConfig } from "../src/config";

test("loadConfig returns typed values from env", () => {
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  process.env.ANTHROPIC_MODEL = "claude-sonnet-4-6";
  process.env.DB_PATH = "./data/test.db";
  process.env.MILDRED_PHONE_E164 = "+573001234567";
  process.env.HISTORY_TURNS = "20";
  process.env.MAX_TURNS_PER_CONVERSATION = "50";

  const cfg = loadConfig();

  expect(cfg.anthropicApiKey).toBe("sk-ant-test");
  expect(cfg.anthropicModel).toBe("claude-sonnet-4-6");
  expect(cfg.dbPath).toBe("./data/test.db");
  expect(cfg.mildredPhoneE164).toBe("+573001234567");
  expect(cfg.historyTurns).toBe(20);
  expect(cfg.maxTurnsPerConversation).toBe(50);
});

test("loadConfig throws if ANTHROPIC_API_KEY missing", () => {
  delete process.env.ANTHROPIC_API_KEY;
  expect(() => loadConfig()).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/config.test.ts
```

Expected: FAIL — `Cannot find module '../src/config'`.

- [ ] **Step 3: Implement `src/config.ts`**

```typescript
import { z } from "zod";

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
  DB_PATH: z.string().default("./data/angela.db"),
  MILDRED_PHONE_E164: z.string().regex(/^\+\d{8,15}$/),
  HISTORY_TURNS: z.coerce.number().int().positive().default(20),
  MAX_TURNS_PER_CONVERSATION: z.coerce.number().int().positive().default(50),
});

export function loadConfig() {
  const parsed = schema.parse(process.env);
  return {
    anthropicApiKey: parsed.ANTHROPIC_API_KEY,
    anthropicModel: parsed.ANTHROPIC_MODEL,
    dbPath: parsed.DB_PATH,
    mildredPhoneE164: parsed.MILDRED_PHONE_E164,
    historyTurns: parsed.HISTORY_TURNS,
    maxTurnsPerConversation: parsed.MAX_TURNS_PER_CONVERSATION,
  };
}

export type Config = ReturnType<typeof loadConfig>;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/config.test.ts
```

Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat(angela): typed config loader with zod"
```

---

### Task 3: SQLite client + schema + migration runner

**Files:**
- Create: `angela-bot/src/db/client.ts`
- Create: `angela-bot/src/db/schema.sql`
- Create: `angela-bot/src/db/migrate.ts`
- Test: `angela-bot/tests/db/migrate.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/db/migrate.test.ts`:

```typescript
import { test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { runMigrations } from "../../src/db/migrate";
import { existsSync, unlinkSync } from "node:fs";

const TEST_DB = "./data/test-migrate.db";

beforeEach(() => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
});

afterEach(() => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
});

test("runMigrations creates all four tables idempotently", () => {
  runMigrations(TEST_DB);
  runMigrations(TEST_DB); // second run must not throw

  const db = new Database(TEST_DB);
  const tables = db
    .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    .all() as { name: string }[];

  const names = tables.map((t) => t.name);
  expect(names).toContain("conversations");
  expect(names).toContain("messages");
  expect(names).toContain("orders");
  expect(names).toContain("events");
  db.close();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/db/migrate.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/db/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS conversations (
  telefono            TEXT PRIMARY KEY,
  estado              TEXT NOT NULL DEFAULT 'GREETING',
  producto_contexto   TEXT,
  handoff_active      INTEGER NOT NULL DEFAULT 0,
  handoff_motivo      TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  last_activity_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  telefono      TEXT NOT NULL,
  rol           TEXT NOT NULL CHECK (rol IN ('user','assistant','system')),
  contenido     TEXT NOT NULL,
  turno_numero  INTEGER NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (telefono) REFERENCES conversations(telefono)
);
CREATE INDEX IF NOT EXISTS idx_messages_telefono ON messages(telefono, turno_numero);

CREATE TABLE IF NOT EXISTS orders (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  telefono            TEXT NOT NULL,
  nombre              TEXT NOT NULL,
  pais                TEXT NOT NULL,
  ciudad              TEXT NOT NULL,
  direccion           TEXT,
  producto_id         TEXT NOT NULL,
  cantidad            INTEGER NOT NULL CHECK (cantidad >= 1),
  guias_incluidas     TEXT NOT NULL,
  estado_pedido       TEXT NOT NULL DEFAULT 'pendiente'
                      CHECK (estado_pedido IN ('pendiente','confirmado','cancelado')),
  notificado_at       TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (telefono) REFERENCES conversations(telefono)
);
CREATE INDEX IF NOT EXISTS idx_orders_telefono ON orders(telefono);

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  telefono    TEXT NOT NULL,
  tipo        TEXT NOT NULL,
  metadata    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_tipo ON events(tipo, created_at);
```

- [ ] **Step 4: Implement `src/db/client.ts`**

```typescript
import { Database } from "bun:sqlite";

let instance: Database | null = null;

export function getDb(path: string): Database {
  if (instance) return instance;
  instance = new Database(path, { create: true });
  instance.exec("PRAGMA journal_mode = WAL;");
  instance.exec("PRAGMA foreign_keys = ON;");
  return instance;
}

export function closeDb(): void {
  if (instance) {
    instance.close();
    instance = null;
  }
}
```

- [ ] **Step 5: Implement `src/db/migrate.ts`**

```typescript
import { readFileSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { Database } from "bun:sqlite";

export function runMigrations(dbPath: string): void {
  mkdirSync(dirname(dbPath), { recursive: true });
  const schema = readFileSync(
    new URL("./schema.sql", import.meta.url),
    "utf-8",
  );
  const db = new Database(dbPath, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(schema);
  db.close();
}

if (import.meta.main) {
  const { loadConfig } = await import("../config");
  const cfg = loadConfig();
  runMigrations(cfg.dbPath);
  console.log(`Migrated ${cfg.dbPath}`);
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
bun test tests/db/migrate.test.ts
```

Expected: 1 pass.

- [ ] **Step 7: Commit**

```bash
git add src/db/ tests/db/migrate.test.ts
git commit -m "feat(angela): SQLite schema + idempotent migration runner"
```

---

### Task 4: `conversations` repository

**Files:**
- Create: `angela-bot/src/db/repositories/conversations.ts`
- Test: `angela-bot/tests/db/conversations.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/db/conversations.test.ts`:

```typescript
import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { runMigrations } from "../../src/db/migrate";
import { getDb, closeDb } from "../../src/db/client";
import {
  getOrCreate,
  updateState,
  setHandoff,
  clearHandoff,
} from "../../src/db/repositories/conversations";

const DB = "./data/test-conv.db";

beforeEach(() => {
  if (existsSync(DB)) unlinkSync(DB);
  runMigrations(DB);
});

afterEach(() => {
  closeDb();
  if (existsSync(DB)) unlinkSync(DB);
});

test("getOrCreate inserts on first call, returns same row on second", () => {
  const a = getOrCreate(getDb(DB), "+573001112222", "RioVida");
  const b = getOrCreate(getDb(DB), "+573001112222", "OtherProduct");
  expect(a.telefono).toBe("+573001112222");
  expect(a.estado).toBe("GREETING");
  expect(a.producto_contexto).toBe("RioVida");
  expect(b.producto_contexto).toBe("RioVida"); // not overwritten
});

test("updateState changes estado and last_activity_at", () => {
  getOrCreate(getDb(DB), "+573001112222", null);
  updateState(getDb(DB), "+573001112222", "DISCOVERY");
  const row = getOrCreate(getDb(DB), "+573001112222", null);
  expect(row.estado).toBe("DISCOVERY");
});

test("setHandoff and clearHandoff toggle handoff_active", () => {
  getOrCreate(getDb(DB), "+573001112222", null);
  setHandoff(getDb(DB), "+573001112222", "HANDOFF_HUMAN");
  let row = getOrCreate(getDb(DB), "+573001112222", null);
  expect(row.handoff_active).toBe(1);
  expect(row.handoff_motivo).toBe("HANDOFF_HUMAN");

  clearHandoff(getDb(DB), "+573001112222");
  row = getOrCreate(getDb(DB), "+573001112222", null);
  expect(row.handoff_active).toBe(0);
  expect(row.handoff_motivo).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/db/conversations.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/db/repositories/conversations.ts`**

```typescript
import type { Database } from "bun:sqlite";

export type Conversation = {
  telefono: string;
  estado: string;
  producto_contexto: string | null;
  handoff_active: number;
  handoff_motivo: string | null;
  created_at: string;
  last_activity_at: string;
};

export function getOrCreate(
  db: Database,
  telefono: string,
  productoContexto: string | null,
): Conversation {
  const existing = db
    .query("SELECT * FROM conversations WHERE telefono = ?")
    .get(telefono) as Conversation | undefined;
  if (existing) return existing;

  db.query(
    "INSERT INTO conversations (telefono, producto_contexto) VALUES (?, ?)",
  ).run(telefono, productoContexto);

  return db
    .query("SELECT * FROM conversations WHERE telefono = ?")
    .get(telefono) as Conversation;
}

export function updateState(
  db: Database,
  telefono: string,
  estado: string,
): void {
  db.query(
    "UPDATE conversations SET estado = ?, last_activity_at = datetime('now') WHERE telefono = ?",
  ).run(estado, telefono);
}

export function setHandoff(
  db: Database,
  telefono: string,
  motivo: string,
): void {
  db.query(
    "UPDATE conversations SET handoff_active = 1, handoff_motivo = ?, last_activity_at = datetime('now') WHERE telefono = ?",
  ).run(motivo, telefono);
}

export function clearHandoff(db: Database, telefono: string): void {
  db.query(
    "UPDATE conversations SET handoff_active = 0, handoff_motivo = NULL, last_activity_at = datetime('now') WHERE telefono = ?",
  ).run(telefono);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/db/conversations.test.ts
```

Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/conversations.ts tests/db/conversations.test.ts
git commit -m "feat(angela): conversations repository"
```

---

### Task 5: `messages` repository

**Files:**
- Create: `angela-bot/src/db/repositories/messages.ts`
- Test: `angela-bot/tests/db/messages.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/db/messages.test.ts`:

```typescript
import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { runMigrations } from "../../src/db/migrate";
import { getDb, closeDb } from "../../src/db/client";
import { getOrCreate } from "../../src/db/repositories/conversations";
import {
  append,
  lastTurns,
  countTurns,
} from "../../src/db/repositories/messages";

const DB = "./data/test-msg.db";

beforeEach(() => {
  if (existsSync(DB)) unlinkSync(DB);
  runMigrations(DB);
  getOrCreate(getDb(DB), "+573001112222", null);
});

afterEach(() => {
  closeDb();
  if (existsSync(DB)) unlinkSync(DB);
});

test("append assigns sequential turn numbers per telefono", () => {
  append(getDb(DB), "+573001112222", "user", "hola");
  append(getDb(DB), "+573001112222", "assistant", "hola, soy Angela");
  append(getDb(DB), "+573001112222", "user", "qué tal");

  const all = lastTurns(getDb(DB), "+573001112222", 10);
  expect(all.length).toBe(3);
  expect(all[0].turno_numero).toBe(1);
  expect(all[1].turno_numero).toBe(2);
  expect(all[2].turno_numero).toBe(3);
});

test("lastTurns returns most recent N in chronological order", () => {
  for (let i = 0; i < 5; i++) {
    append(getDb(DB), "+573001112222", "user", `msg-${i}`);
  }
  const last3 = lastTurns(getDb(DB), "+573001112222", 3);
  expect(last3.length).toBe(3);
  expect(last3.map((m) => m.contenido)).toEqual(["msg-2", "msg-3", "msg-4"]);
});

test("countTurns returns total messages for a telefono", () => {
  append(getDb(DB), "+573001112222", "user", "a");
  append(getDb(DB), "+573001112222", "assistant", "b");
  expect(countTurns(getDb(DB), "+573001112222")).toBe(2);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/db/messages.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/db/repositories/messages.ts`**

```typescript
import type { Database } from "bun:sqlite";

export type Message = {
  id: number;
  telefono: string;
  rol: "user" | "assistant" | "system";
  contenido: string;
  turno_numero: number;
  created_at: string;
};

export function append(
  db: Database,
  telefono: string,
  rol: Message["rol"],
  contenido: string,
): void {
  const last = db
    .query(
      "SELECT COALESCE(MAX(turno_numero), 0) AS n FROM messages WHERE telefono = ?",
    )
    .get(telefono) as { n: number };
  db.query(
    "INSERT INTO messages (telefono, rol, contenido, turno_numero) VALUES (?, ?, ?, ?)",
  ).run(telefono, rol, contenido, last.n + 1);
}

export function lastTurns(
  db: Database,
  telefono: string,
  n: number,
): Message[] {
  const rows = db
    .query(
      `SELECT * FROM messages
       WHERE telefono = ?
       ORDER BY turno_numero DESC
       LIMIT ?`,
    )
    .all(telefono, n) as Message[];
  return rows.reverse();
}

export function countTurns(db: Database, telefono: string): number {
  const row = db
    .query("SELECT COUNT(*) AS c FROM messages WHERE telefono = ?")
    .get(telefono) as { c: number };
  return row.c;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/db/messages.test.ts
```

Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/messages.ts tests/db/messages.test.ts
git commit -m "feat(angela): messages repository"
```

---

### Task 6: `orders` repository

**Files:**
- Create: `angela-bot/src/db/repositories/orders.ts`
- Test: `angela-bot/tests/db/orders.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/db/orders.test.ts`:

```typescript
import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { runMigrations } from "../../src/db/migrate";
import { getDb, closeDb } from "../../src/db/client";
import { getOrCreate } from "../../src/db/repositories/conversations";
import { create, markNotified, listPending } from "../../src/db/repositories/orders";

const DB = "./data/test-ord.db";

beforeEach(() => {
  if (existsSync(DB)) unlinkSync(DB);
  runMigrations(DB);
  getOrCreate(getDb(DB), "+573001112222", null);
});

afterEach(() => {
  closeDb();
  if (existsSync(DB)) unlinkSync(DB);
});

test("create persists an order with defaults", () => {
  const id = create(getDb(DB), {
    telefono: "+573001112222",
    nombre: "María Pérez",
    pais: "Colombia",
    ciudad: "Medellín",
    direccion: "Cra 45 #12-30",
    producto_id: "riovida",
    cantidad: 1,
    guias_incluidas: ["Guía Maestra", "Guía de Desintoxicación"],
  });
  expect(id).toBeGreaterThan(0);

  const list = listPending(getDb(DB));
  expect(list.length).toBe(1);
  expect(list[0].nombre).toBe("María Pérez");
  expect(list[0].estado_pedido).toBe("pendiente");
  expect(JSON.parse(list[0].guias_incluidas)).toEqual([
    "Guía Maestra",
    "Guía de Desintoxicación",
  ]);
});

test("markNotified sets notificado_at", () => {
  const id = create(getDb(DB), {
    telefono: "+573001112222",
    nombre: "X",
    pais: "Colombia",
    ciudad: "Y",
    direccion: "Z",
    producto_id: "riovida",
    cantidad: 1,
    guias_incluidas: [],
  });
  markNotified(getDb(DB), id);
  const list = listPending(getDb(DB));
  expect(list[0].notificado_at).not.toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/db/orders.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/db/repositories/orders.ts`**

```typescript
import type { Database } from "bun:sqlite";

export type Order = {
  id: number;
  telefono: string;
  nombre: string;
  pais: string;
  ciudad: string;
  direccion: string | null;
  producto_id: string;
  cantidad: number;
  guias_incluidas: string;
  estado_pedido: "pendiente" | "confirmado" | "cancelado";
  notificado_at: string | null;
  created_at: string;
};

export type NewOrder = {
  telefono: string;
  nombre: string;
  pais: string;
  ciudad: string;
  direccion: string | null;
  producto_id: string;
  cantidad: number;
  guias_incluidas: string[];
};

export function create(db: Database, o: NewOrder): number {
  const result = db
    .query(
      `INSERT INTO orders
         (telefono, nombre, pais, ciudad, direccion, producto_id, cantidad, guias_incluidas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      o.telefono,
      o.nombre,
      o.pais,
      o.ciudad,
      o.direccion,
      o.producto_id,
      o.cantidad,
      JSON.stringify(o.guias_incluidas),
    );
  return Number(result.lastInsertRowid);
}

export function markNotified(db: Database, id: number): void {
  db.query(
    "UPDATE orders SET notificado_at = datetime('now') WHERE id = ?",
  ).run(id);
}

export function listPending(db: Database): Order[] {
  return db
    .query(
      "SELECT * FROM orders WHERE estado_pedido = 'pendiente' ORDER BY created_at ASC",
    )
    .all() as Order[];
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/db/orders.test.ts
```

Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/orders.ts tests/db/orders.test.ts
git commit -m "feat(angela): orders repository"
```

---

### Task 7: `events` repository

**Files:**
- Create: `angela-bot/src/db/repositories/events.ts`
- Test: `angela-bot/tests/db/events.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/db/events.test.ts`:

```typescript
import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { runMigrations } from "../../src/db/migrate";
import { getDb, closeDb } from "../../src/db/client";
import { record, countByType } from "../../src/db/repositories/events";

const DB = "./data/test-evt.db";

beforeEach(() => {
  if (existsSync(DB)) unlinkSync(DB);
  runMigrations(DB);
});

afterEach(() => {
  closeDb();
  if (existsSync(DB)) unlinkSync(DB);
});

test("record persists an event with optional metadata", () => {
  record(getDb(DB), "+57111", "phase_changed", { from: "GREETING", to: "DISCOVERY" });
  record(getDb(DB), "+57111", "phase_changed", { from: "DISCOVERY", to: "RECOMMEND" });
  record(getDb(DB), "+57111", "order_captured", null);

  expect(countByType(getDb(DB), "phase_changed")).toBe(2);
  expect(countByType(getDb(DB), "order_captured")).toBe(1);
  expect(countByType(getDb(DB), "nonexistent")).toBe(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/db/events.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/db/repositories/events.ts`**

```typescript
import type { Database } from "bun:sqlite";

export type EventType =
  | "conversation_started"
  | "phase_changed"
  | "objection_raised"
  | "order_captured"
  | "handoff_triggered"
  | "bot_resumed";

export function record(
  db: Database,
  telefono: string,
  tipo: EventType | string,
  metadata: unknown | null,
): void {
  db.query(
    "INSERT INTO events (telefono, tipo, metadata) VALUES (?, ?, ?)",
  ).run(
    telefono,
    tipo,
    metadata === null || metadata === undefined ? null : JSON.stringify(metadata),
  );
}

export function countByType(db: Database, tipo: string): number {
  const row = db
    .query("SELECT COUNT(*) AS c FROM events WHERE tipo = ?")
    .get(tipo) as { c: number };
  return row.c;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/db/events.test.ts
```

Expected: 1 pass.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories/events.ts tests/db/events.test.ts
git commit -m "feat(angela): events repository"
```

---

### Task 8: Catalog types, seed JSON, loader and lookup

**Files:**
- Create: `angela-bot/src/catalog/types.ts`
- Create: `angela-bot/data/catalog-seed.json`
- Create: `angela-bot/src/catalog/loader.ts`
- Create: `angela-bot/src/catalog/lookup.ts`
- Test: `angela-bot/tests/catalog/loader.test.ts`

The seed file uses placeholder products. Mildred will replace these with the real 3-5 productos estrella per spec section "Pendientes de Mildred". The structure is fixed.

- [ ] **Step 1: Write `src/catalog/types.ts`**

```typescript
import { z } from "zod";

export const ProductSchema = z.object({
  id: z.string(),
  nombre_comercial: z.string(),
  precio_COP: z.number().int().nonnegative(),
  precio_USD: z.number().nonnegative(),
  beneficios_permitidos: z.array(z.string()).min(1),
  casos_uso_tipicos: z.array(z.string()).min(1),
  testimonios_aprobados: z.array(z.string()),
  link_tienda_4life: z.string().url(),
  guia_especifica: z.string(),
});
export type Product = z.infer<typeof ProductSchema>;

export const CatalogSchema = z.object({
  bonus_universal: z.object({
    nombre: z.string(),
    valor_percibido_COP: z.number().int().positive(),
  }),
  productos: z.array(ProductSchema).min(1),
});
export type Catalog = z.infer<typeof CatalogSchema>;
```

- [ ] **Step 2: Write `data/catalog-seed.json` (placeholder)**

```json
{
  "bonus_universal": {
    "nombre": "Guía Maestra de Consumo 4life",
    "valor_percibido_COP": 80000
  },
  "productos": [
    {
      "id": "riovida",
      "nombre_comercial": "RioVida",
      "precio_COP": 280000,
      "precio_USD": 75,
      "beneficios_permitidos": [
        "apoya el sistema inmune",
        "complementa la desintoxicación natural del cuerpo"
      ],
      "casos_uso_tipicos": ["gripas frecuentes", "energía baja", "desintoxicar"],
      "testimonios_aprobados": [
        "Mucha gente reporta sentirse con más energía a las pocas semanas."
      ],
      "link_tienda_4life": "https://co.4life.com/12750834/product/riovida",
      "guia_especifica": "Guía de Desintoxicación"
    },
    {
      "id": "fibra",
      "nombre_comercial": "Fibra 4life",
      "precio_COP": 150000,
      "precio_USD": 40,
      "beneficios_permitidos": [
        "apoya la salud digestiva",
        "complementa la desintoxicación"
      ],
      "casos_uso_tipicos": ["estreñimiento", "hinchazón", "desintoxicar"],
      "testimonios_aprobados": [
        "Muchas personas reportan sentirse más livianas en pocos días."
      ],
      "link_tienda_4life": "https://co.4life.com/12750834/product/fibra",
      "guia_especifica": "Guía de Desintoxicación"
    },
    {
      "id": "energy",
      "nombre_comercial": "Energy Go Stix",
      "precio_COP": 180000,
      "precio_USD": 50,
      "beneficios_permitidos": [
        "apoya niveles de energía saludables",
        "complementa un estilo de vida activo"
      ],
      "casos_uso_tipicos": ["energía baja", "cansancio mental"],
      "testimonios_aprobados": [
        "Reportes frecuentes de mayor enfoque sin el bajón de la cafeína."
      ],
      "link_tienda_4life": "https://co.4life.com/12750834/product/energy",
      "guia_especifica": "Guía para Elevar la Energía Naturalmente"
    }
  ]
}
```

**Note in the seed file:** prices and product IDs are placeholders. Mildred replaces with real values before launch (see spec § 8).

- [ ] **Step 3: Write the failing test**

`tests/catalog/loader.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { loadCatalog } from "../../src/catalog/loader";
import { findById, listAll, byUseCase } from "../../src/catalog/lookup";

test("loadCatalog parses the seed JSON", () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  expect(cat.bonus_universal.valor_percibido_COP).toBe(80000);
  expect(cat.productos.length).toBeGreaterThanOrEqual(3);
});

test("findById returns the product or undefined", () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  expect(findById(cat, "riovida")?.nombre_comercial).toBe("RioVida");
  expect(findById(cat, "no-existe")).toBeUndefined();
});

test("listAll returns all products", () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  expect(listAll(cat).length).toBe(cat.productos.length);
});

test("byUseCase returns products matching a case keyword", () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  const detox = byUseCase(cat, "desintoxicar");
  expect(detox.map((p) => p.id)).toContain("riovida");
  expect(detox.map((p) => p.id)).toContain("fibra");
});

test("loadCatalog throws on invalid JSON shape", () => {
  expect(() => loadCatalog("./tsconfig.json")).toThrow();
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
bun test tests/catalog/loader.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 5: Implement `src/catalog/loader.ts`**

```typescript
import { readFileSync } from "node:fs";
import { CatalogSchema, type Catalog } from "./types";

export function loadCatalog(path: string): Catalog {
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  return CatalogSchema.parse(raw);
}
```

- [ ] **Step 6: Implement `src/catalog/lookup.ts`**

```typescript
import type { Catalog, Product } from "./types";

export function findById(cat: Catalog, id: string): Product | undefined {
  return cat.productos.find((p) => p.id === id);
}

export function listAll(cat: Catalog): Product[] {
  return cat.productos;
}

export function byUseCase(cat: Catalog, keyword: string): Product[] {
  const k = keyword.toLowerCase();
  return cat.productos.filter((p) =>
    p.casos_uso_tipicos.some((c) => c.toLowerCase().includes(k)),
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
bun test tests/catalog/loader.test.ts
```

Expected: 5 pass.

- [ ] **Step 8: Commit**

```bash
git add src/catalog/ data/catalog-seed.json tests/catalog/
git commit -m "feat(angela): catalog types, seed JSON, loader and lookups"
```

---

### Task 9: Prompt — identity, voice, guardrails modules (static text)

**Files:**
- Create: `angela-bot/src/prompt/identity.ts`
- Create: `angela-bot/src/prompt/voice.ts`
- Create: `angela-bot/src/prompt/guardrails.ts`

These three modules export plain string constants drawn from the spec. They have no behavior to test on their own; the assembler test in Task 11 covers them.

- [ ] **Step 1: Write `src/prompt/identity.ts`** (from spec § 4 [1])

```typescript
export const IDENTITY = `
[1] IDENTIDAD (Angela como asistente, identidad propia y separada de Mildred)
    Eres Angela, asistente de Mildred Briyit Barrero, distribuidora 4life
    (código 12750834) en Medellín, Colombia. Eres una coach de bienestar con
    energía cálida, motivacional, enfocada en resultados reales.

    REGLAS DE IDENTIDAD:
    • Tu identidad es propia y separada de Mildred. Eres SU asistente, no
      hablas en plural con ella ni en su nombre.
    • Saludo típico: "¡Hola! Soy Angela, la asistente de Mildred. Encantada
      de atenderte ✨"
    • Si el cliente pregunta directo si eres bot/IA/humana, responde
      transparente: "Soy la asistente de Mildred — ella me capacitó para
      acompañarte 24/7 con la misma calidez con la que ella lo hace. Cuando
      necesites hablar directo con ella, te la paso al toque."
    • Cuando recomiendes producto, hazlo desde tu rol de asistente capacitada,
      no en plural con Mildred. Frases válidas: "para tu caso te recomiendo…",
      "lo más indicado para ti es…", "Mildred recomienda mucho X para estos
      casos" (atribución a Mildred si quieres reforzar autoridad).
    • PROHIBIDO: hacerte pasar por Mildred ("soy Mildred", firmar como
      Mildred), hablar en plural con Mildred ("Mildred y yo", "nosotras te
      recomendamos", "te acompañamos juntas"), o usar lenguaje colectivo
      tipo "el equipo de Mildred" como si fueras parte humana del equipo.
`.trim();
```

- [ ] **Step 2: Write `src/prompt/voice.ts`** (from spec § 4 [2])

```typescript
export const VOICE = `
[2] VOZ Y RITMO
    • Mensajes cortos. 1-3 frases máximo por turno (como WhatsApp real, no como email).
    • Emojis con moderación (1-2 por mensaje). Preferidos: 💪 ✨ 🌿 ❤️
    • Español neutro LATAM. Tono cálido y motivacional, pero PROFESIONAL.
    • NO usar marcadores paisa ni cariñosos: "mor", "parce", "pues", "mami",
      "reina", "amor", "corazón", ni diminutivos ("pedidito", "guiita").
    • Sí usar: "qué bueno que escribes", "te entiendo perfectamente",
      "cuéntame más", "vamos a buscar lo que más te sirve".
    • Tratamiento: "tú" (no "usted" salvo que el cliente lo use primero).
    • Refleja lo que el cliente dijo antes de proponer algo.

ANTI-PATRONES PROHIBIDOS:
    • Listas con viñetas dentro de WhatsApp (se ven robóticas).
    • Respuestas de más de 4 líneas.
    • "Como asistente virtual…" / "Soy una IA…" como apertura
      (sí responder transparente si el cliente pregunta directo).
    • Hacerse pasar por Mildred.
    • Hablar en plural con Mildred.
    • Usar lenguaje colectivo ("el equipo de Mildred") como si Angela fuera humana.
    • Pedir email (innecesario — pago va por tienda 4life).
    • Repetir el nombre del cliente más de 2 veces por conversación.
    • Mencionar el bonus de guías más de 1 vez (salvo en objeción de precio).
`.trim();
```

- [ ] **Step 3: Write `src/prompt/guardrails.ts`** (from spec § 4 [4])

```typescript
export const GUARDRAILS = `
[4] GUARDRAILS DE COMPLIANCE (4life + INVIMA)
    NUNCA digas: "cura", "trata", "diagnostica", "previene enfermedad",
    "reemplaza medicamento", "garantizado", "milagroso", "mejor que [marca]".
    SIEMPRE usa: "apoya", "complementa", "ayuda a", "muchas personas reportan",
    "es un complemento a tu estilo de vida saludable".
    Si el cliente menciona enfermedad seria (cáncer, lupus, autoinmune,
    embarazo, diabetes severa), responde con empatía y deja claro que prefieres
    pasarlo con Mildred para que lo atienda personalmente.
`.trim();

export const PROHIBITED_PHRASES = [
  "cura",
  "curar",
  "trata enfermedad",
  "tratar enfermedad",
  "diagnostica",
  "diagnóstico",
  "previene enfermedad",
  "reemplaza medicamento",
  "reemplazar medicamento",
  "garantizado",
  "milagroso",
];

export const MEDICAL_HANDOFF_KEYWORDS = [
  "cáncer",
  "cancer",
  "lupus",
  "autoinmune",
  "embarazada",
  "embarazo",
  "diabetes",
  "quimioterapia",
  "radioterapia",
  "vih",
  "hepatitis",
];
```

- [ ] **Step 4: No test yet for these — they're constants. Commit.**

```bash
git add src/prompt/identity.ts src/prompt/voice.ts src/prompt/guardrails.ts
git commit -m "feat(angela): identity, voice and guardrails prompt blocks"
```

---

### Task 10: Phase-instructions module

**Files:**
- Create: `angela-bot/src/prompt/phase-instructions.ts`
- Test: `angela-bot/tests/prompt/phase-instructions.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/prompt/phase-instructions.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { phaseInstructions } from "../../src/prompt/phase-instructions";

test("phaseInstructions returns a non-empty string per known state", () => {
  for (const s of [
    "GREETING",
    "DISCOVERY",
    "RECOMMEND",
    "OBJECTION",
    "INTENT_BUY",
    "DATA_CAPTURE",
    "CONFIRMATION",
  ]) {
    expect(phaseInstructions(s as any).length).toBeGreaterThan(20);
  }
});

test("phaseInstructions throws on unknown state", () => {
  expect(() => phaseInstructions("FOO" as any)).toThrow();
});

test("RECOMMEND instructions forbid mentioning a guide unrelated to the product", () => {
  expect(phaseInstructions("RECOMMEND")).toContain("nunca menciones una guía que no corresponda");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/prompt/phase-instructions.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/prompt/phase-instructions.ts`** (from spec § 4)

```typescript
import type { State } from "../state/states";

const INSTRUCTIONS: Record<State, string> = {
  GREETING: `Preséntate como Angela, la asistente de Mildred. Saluda cálido. Si hay
producto_contexto, refiérete a él ("Vi que viste RioVida en la página"). Si no,
abre amplio. Una sola pregunta. Ejemplo: "¡Hola! Soy Angela, la asistente de
Mildred ✨ Vi que viste el RioVida — ¿qué te llamó la atención?"`,

  DISCOVERY: `Identifica QUÉ trae al cliente. Haz 1-2 preguntas abiertas sobre su
objetivo de bienestar. NO recomiendes producto todavía.`,

  RECOMMEND: `Recomienda UN producto del catálogo que más le sirva, desde tu rol de
asistente capacitada ("para tu caso te recomiendo…" o "lo más indicado para ti
es…"). Si quieres reforzar autoridad, puedes atribuir a Mildred ("Mildred
recomienda mucho X en estos casos"). Explica POR QUÉ ese (1 razón concreta).
Menciona el bonus de guías UNA sola vez aquí: Guía Maestra (valor 80k) + la
guía específica que corresponde a ESE producto exacto (lookup guia_especifica).
Nunca menciones una guía que no corresponda al producto recomendado. Cierra
con una pregunta que invite a la decisión.`,

  OBJECTION: `Reconoce la objeción. Si es de precio, recuerda el valor de las guías
incluidas. Si es de confianza, comparte un testimonio aprobado. Si es "lo
pienso", pregunta qué duda específica tiene. Máximo 3 turnos en esta fase
antes de pasar a Mildred.`,

  INTENT_BUY: `Confirma la decisión y pasa a captura. "Perfecto, vamos a dejar tu
pedido listo. ¿Me confirmas tu nombre completo?"`,

  DATA_CAPTURE: `Pide UN dato por turno, en orden: nombre → ciudad y país →
dirección (si Colombia) → cantidad. Confirma cada dato recibido antes de
pedir el siguiente. Si país ≠ Colombia: salta la captura de dirección y va
directo a CONFIRMATION con el link de tienda 4life como acción principal.`,

  CONFIRMATION: `Mensaje de resumen estructurado: producto + cantidad + guía
general + guía específica + ciudad/país. Cierra diciendo que Mildred recibió
el pedido y confirma valor final y forma de pago en breve. Da el link de
tienda 4life. Para Colombia es backup; para otros países es la acción
principal.`,
};

export function phaseInstructions(state: State): string {
  const text = INSTRUCTIONS[state];
  if (!text) throw new Error(`Unknown state: ${state}`);
  return text;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/prompt/phase-instructions.test.ts
```

Expected: 3 pass (some will require Task 11's State enum — write the enum stub now).

Create `src/state/states.ts` first (it will be expanded in Task 12):

```typescript
export const STATES = [
  "GREETING",
  "DISCOVERY",
  "RECOMMEND",
  "OBJECTION",
  "INTENT_BUY",
  "DATA_CAPTURE",
  "CONFIRMATION",
] as const;
export type State = (typeof STATES)[number];
```

Re-run:

```bash
bun test tests/prompt/phase-instructions.test.ts
```

Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/prompt/phase-instructions.ts src/state/states.ts tests/prompt/phase-instructions.test.ts
git commit -m "feat(angela): per-state phase instructions"
```

---

### Task 11: Prompt assembler

**Files:**
- Create: `angela-bot/src/prompt/assemble.ts`
- Test: `angela-bot/tests/prompt/assemble.test.ts`

The assembler returns two strings: `cachedSystem` (identity + voice + catalog + guardrails — stable, eligible for prompt caching) and `dynamicSystem` (phase + product_context + turn_count — changes per call).

- [ ] **Step 1: Write the failing test**

`tests/prompt/assemble.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { loadCatalog } from "../../src/catalog/loader";
import { assembleSystemPrompt } from "../../src/prompt/assemble";

test("cachedSystem contains identity, voice, catalog and guardrails", () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  const { cachedSystem } = assembleSystemPrompt({
    catalog: cat,
    state: "GREETING",
    productContext: null,
    turnCount: 0,
  });
  expect(cachedSystem).toContain("Eres Angela");
  expect(cachedSystem).toContain("VOZ Y RITMO");
  expect(cachedSystem).toContain("CATÁLOGO");
  expect(cachedSystem).toContain("RioVida"); // product name from seed
  expect(cachedSystem).toContain("GUARDRAILS");
});

test("dynamicSystem reflects state, product context and turn count", () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  const { dynamicSystem } = assembleSystemPrompt({
    catalog: cat,
    state: "RECOMMEND",
    productContext: "riovida",
    turnCount: 3,
  });
  expect(dynamicSystem).toContain("FASE_ACTUAL: RECOMMEND");
  expect(dynamicSystem).toContain("producto_contexto: riovida");
  expect(dynamicSystem).toContain("Turnos en esta fase: 3");
  expect(dynamicSystem).toContain("Recomienda UN producto"); // from phase instructions
});

test("cachedSystem includes the bonus universal and the per-product guide", () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  const { cachedSystem } = assembleSystemPrompt({
    catalog: cat,
    state: "GREETING",
    productContext: null,
    turnCount: 0,
  });
  expect(cachedSystem).toContain("Guía Maestra de Consumo");
  expect(cachedSystem).toContain("Guía de Desintoxicación"); // tied to RioVida & Fibra
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/prompt/assemble.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/prompt/assemble.ts`**

```typescript
import type { Catalog } from "../catalog/types";
import type { State } from "../state/states";
import { IDENTITY } from "./identity";
import { VOICE } from "./voice";
import { GUARDRAILS } from "./guardrails";
import { phaseInstructions } from "./phase-instructions";

export type AssembleInput = {
  catalog: Catalog;
  state: State;
  productContext: string | null;
  turnCount: number;
};

export type AssembledPrompt = {
  cachedSystem: string;
  dynamicSystem: string;
};

function renderCatalog(cat: Catalog): string {
  const bonus = `BONUS UNIVERSAL incluido con TODA compra:
• "${cat.bonus_universal.nombre}" — valor percibido ${cat.bonus_universal.valor_percibido_COP.toLocaleString("es-CO")} COP`;

  const productos = cat.productos
    .map(
      (p) => `• ${p.id} → ${p.nombre_comercial}
    precio_COP: ${p.precio_COP.toLocaleString("es-CO")}
    precio_USD: ${p.precio_USD}
    beneficios_permitidos: ${p.beneficios_permitidos.join("; ")}
    casos_uso_tipicos: ${p.casos_uso_tipicos.join(", ")}
    testimonios_aprobados:
      - ${p.testimonios_aprobados.join("\n      - ")}
    link_tienda_4life: ${p.link_tienda_4life}
    guia_especifica: ${p.guia_especifica}`,
    )
    .join("\n\n");

  return `[3] CATÁLOGO (única fuente de verdad — NO inventes productos ni precios)
${bonus}

PRODUCTOS:
${productos}

REGLA: la guia_especifica SIEMPRE coincide con el producto recomendado.
Nunca menciones una guía que no corresponda al producto en juego.`;
}

export function assembleSystemPrompt(input: AssembleInput): AssembledPrompt {
  const cachedSystem = [IDENTITY, VOICE, renderCatalog(input.catalog), GUARDRAILS].join(
    "\n\n",
  );

  const dynamicSystem = `[5] FASE ACTUAL
FASE_ACTUAL: ${input.state}
producto_contexto: ${input.productContext ?? "(ninguno)"}
Turnos en esta fase: ${input.turnCount}

Instrucción específica de la fase:
${phaseInstructions(input.state)}`;

  return { cachedSystem, dynamicSystem };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/prompt/assemble.test.ts
```

Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/prompt/assemble.ts tests/prompt/assemble.test.ts
git commit -m "feat(angela): assemble cached + dynamic system prompt"
```

---

### Task 12: Handoff trigger detection

**Files:**
- Create: `angela-bot/src/state/triggers.ts`
- Test: `angela-bot/tests/state/triggers.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/state/triggers.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { detectHandoffTrigger } from "../../src/state/triggers";

test("detects HANDOFF_HUMAN on explicit request", () => {
  expect(detectHandoffTrigger({
    userMessage: "quiero hablar con una persona",
    state: "DISCOVERY",
    objectionTurns: 0,
    consecutiveConfusion: 0,
  })).toBe("HANDOFF_HUMAN");

  expect(detectHandoffTrigger({
    userMessage: "puedo hablar con un humano",
    state: "DISCOVERY",
    objectionTurns: 0,
    consecutiveConfusion: 0,
  })).toBe("HANDOFF_HUMAN");

  expect(detectHandoffTrigger({
    userMessage: "me pasas con Mildred?",
    state: "DISCOVERY",
    objectionTurns: 0,
    consecutiveConfusion: 0,
  })).toBe("HANDOFF_HUMAN");
});

test("detects HANDOFF_MEDICAL when medical keywords appear", () => {
  expect(detectHandoffTrigger({
    userMessage: "tengo lupus, me sirve esto?",
    state: "DISCOVERY",
    objectionTurns: 0,
    consecutiveConfusion: 0,
  })).toBe("HANDOFF_MEDICAL");

  expect(detectHandoffTrigger({
    userMessage: "estoy en quimioterapia",
    state: "DISCOVERY",
    objectionTurns: 0,
    consecutiveConfusion: 0,
  })).toBe("HANDOFF_MEDICAL");
});

test("detects HANDOFF_STUCK after 3+ objection turns", () => {
  expect(detectHandoffTrigger({
    userMessage: "sigue siendo caro",
    state: "OBJECTION",
    objectionTurns: 3,
    consecutiveConfusion: 0,
  })).toBe("HANDOFF_STUCK");

  expect(detectHandoffTrigger({
    userMessage: "sigue siendo caro",
    state: "OBJECTION",
    objectionTurns: 2,
    consecutiveConfusion: 0,
  })).toBeNull();
});

test("detects HANDOFF_CONFUSED after 2 consecutive bot confusions", () => {
  expect(detectHandoffTrigger({
    userMessage: "??",
    state: "DISCOVERY",
    objectionTurns: 0,
    consecutiveConfusion: 2,
  })).toBe("HANDOFF_CONFUSED");
});

test("returns null when no trigger applies", () => {
  expect(detectHandoffTrigger({
    userMessage: "qué bueno, cuéntame más",
    state: "DISCOVERY",
    objectionTurns: 0,
    consecutiveConfusion: 0,
  })).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/state/triggers.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/state/triggers.ts`**

```typescript
import type { State } from "./states";
import { MEDICAL_HANDOFF_KEYWORDS } from "../prompt/guardrails";

export type HandoffMotivo =
  | "HANDOFF_HUMAN"
  | "HANDOFF_MEDICAL"
  | "HANDOFF_STUCK"
  | "HANDOFF_CONFUSED";

const HUMAN_REQUEST_REGEX =
  /\b(humano|humana|persona|asesora?|alguien real|mildred|hablar contigo)\b/i;

export type TriggerInput = {
  userMessage: string;
  state: State;
  objectionTurns: number;       // turns spent in OBJECTION without resolution
  consecutiveConfusion: number; // times bot has signaled it didn't understand
};

export function detectHandoffTrigger(
  input: TriggerInput,
): HandoffMotivo | null {
  const lower = input.userMessage.toLowerCase();

  if (HUMAN_REQUEST_REGEX.test(input.userMessage)) {
    return "HANDOFF_HUMAN";
  }

  for (const kw of MEDICAL_HANDOFF_KEYWORDS) {
    if (lower.includes(kw)) return "HANDOFF_MEDICAL";
  }

  if (input.state === "OBJECTION" && input.objectionTurns >= 3) {
    return "HANDOFF_STUCK";
  }

  if (input.consecutiveConfusion >= 2) {
    return "HANDOFF_CONFUSED";
  }

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/state/triggers.test.ts
```

Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/triggers.ts tests/state/triggers.test.ts
git commit -m "feat(angela): handoff trigger detection (human/medical/stuck/confused)"
```

---

### Task 13: State transitions

**Files:**
- Create: `angela-bot/src/state/transitions.ts`
- Test: `angela-bot/tests/state/transitions.test.ts`

The transition module decides the next state given current state + signals derived from the latest user message. It's deliberately conservative: only moves forward when there's evidence; stays put otherwise.

- [ ] **Step 1: Write the failing test**

`tests/state/transitions.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { nextState } from "../../src/state/transitions";

test("GREETING → DISCOVERY after first user reply", () => {
  expect(nextState({
    current: "GREETING",
    userReplied: true,
    expressedInterest: false,
    objectionDetected: false,
    intentToBuy: false,
    dataReady: false,
  })).toBe("DISCOVERY");
});

test("DISCOVERY → RECOMMEND once interest/need is expressed", () => {
  expect(nextState({
    current: "DISCOVERY",
    userReplied: true,
    expressedInterest: true,
    objectionDetected: false,
    intentToBuy: false,
    dataReady: false,
  })).toBe("RECOMMEND");
});

test("RECOMMEND → OBJECTION when objection detected", () => {
  expect(nextState({
    current: "RECOMMEND",
    userReplied: true,
    expressedInterest: true,
    objectionDetected: true,
    intentToBuy: false,
    dataReady: false,
  })).toBe("OBJECTION");
});

test("RECOMMEND → INTENT_BUY on intent signal", () => {
  expect(nextState({
    current: "RECOMMEND",
    userReplied: true,
    expressedInterest: true,
    objectionDetected: false,
    intentToBuy: true,
    dataReady: false,
  })).toBe("INTENT_BUY");
});

test("OBJECTION → INTENT_BUY when objection resolved and intent appears", () => {
  expect(nextState({
    current: "OBJECTION",
    userReplied: true,
    expressedInterest: true,
    objectionDetected: false,
    intentToBuy: true,
    dataReady: false,
  })).toBe("INTENT_BUY");
});

test("INTENT_BUY → DATA_CAPTURE always", () => {
  expect(nextState({
    current: "INTENT_BUY",
    userReplied: true,
    expressedInterest: true,
    objectionDetected: false,
    intentToBuy: true,
    dataReady: false,
  })).toBe("DATA_CAPTURE");
});

test("DATA_CAPTURE → CONFIRMATION once all required fields present", () => {
  expect(nextState({
    current: "DATA_CAPTURE",
    userReplied: true,
    expressedInterest: true,
    objectionDetected: false,
    intentToBuy: true,
    dataReady: true,
  })).toBe("CONFIRMATION");
});

test("stays in current state when no advancement signal", () => {
  expect(nextState({
    current: "DISCOVERY",
    userReplied: true,
    expressedInterest: false,
    objectionDetected: false,
    intentToBuy: false,
    dataReady: false,
  })).toBe("DISCOVERY");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/state/transitions.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/state/transitions.ts`**

```typescript
import type { State } from "./states";

export type TransitionInput = {
  current: State;
  userReplied: boolean;
  expressedInterest: boolean;
  objectionDetected: boolean;
  intentToBuy: boolean;
  dataReady: boolean;
};

export function nextState(input: TransitionInput): State {
  const { current } = input;

  switch (current) {
    case "GREETING":
      return input.userReplied ? "DISCOVERY" : "GREETING";

    case "DISCOVERY":
      if (input.intentToBuy) return "INTENT_BUY";
      if (input.objectionDetected) return "OBJECTION";
      return input.expressedInterest ? "RECOMMEND" : "DISCOVERY";

    case "RECOMMEND":
      if (input.intentToBuy) return "INTENT_BUY";
      if (input.objectionDetected) return "OBJECTION";
      return "RECOMMEND";

    case "OBJECTION":
      if (input.intentToBuy) return "INTENT_BUY";
      return "OBJECTION";

    case "INTENT_BUY":
      return "DATA_CAPTURE";

    case "DATA_CAPTURE":
      return input.dataReady ? "CONFIRMATION" : "DATA_CAPTURE";

    case "CONFIRMATION":
      return "CONFIRMATION";
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/state/transitions.test.ts
```

Expected: 8 pass.

- [ ] **Step 5: Commit**

```bash
git add src/state/transitions.ts tests/state/transitions.test.ts
git commit -m "feat(angela): state machine transitions"
```

---

### Task 14: LLM client wrapper

**Files:**
- Create: `angela-bot/src/llm/client.ts`

This is a thin wrapper around `@anthropic-ai/sdk`. No tests — it's a passthrough constructor. The behavior is tested in Task 15 by mocking.

- [ ] **Step 1: Implement `src/llm/client.ts`**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { loadConfig } from "../config";

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (_client) return _client;
  const cfg = loadConfig();
  _client = new Anthropic({ apiKey: cfg.anthropicApiKey });
  return _client;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/llm/client.ts
git commit -m "feat(angela): Anthropic SDK wrapper"
```

---

### Task 15: LLM `invoke` with prompt caching + response validator

**Files:**
- Create: `angela-bot/src/llm/invoke.ts`
- Create: `angela-bot/src/llm/validator.ts`
- Test: `angela-bot/tests/llm/validator.test.ts`

`invoke()` calls Claude with two system blocks: `cachedSystem` (with `cache_control: { type: "ephemeral" }`) and `dynamicSystem` (no cache). It passes the conversation history as user/assistant turns. The validator scans the returned text for prohibited phrases.

- [ ] **Step 1: Write the failing test for the validator**

`tests/llm/validator.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { validateResponse } from "../../src/llm/validator";

test("flags prohibited phrases", () => {
  const r = validateResponse("Este producto cura el cáncer");
  expect(r.ok).toBe(false);
  expect(r.violations).toContain("cura");
});

test("returns ok for compliant text", () => {
  const r = validateResponse("Apoya tu sistema inmune y complementa tu rutina");
  expect(r.ok).toBe(true);
  expect(r.violations).toEqual([]);
});

test("is case-insensitive", () => {
  const r = validateResponse("GARANTIZADO que funciona");
  expect(r.ok).toBe(false);
  expect(r.violations).toContain("garantizado");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/llm/validator.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/llm/validator.ts`**

```typescript
import { PROHIBITED_PHRASES } from "../prompt/guardrails";

export type ValidationResult =
  | { ok: true; violations: [] }
  | { ok: false; violations: string[] };

export function validateResponse(text: string): ValidationResult {
  const lower = text.toLowerCase();
  const violations: string[] = [];
  for (const phrase of PROHIBITED_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) violations.push(phrase);
  }
  return violations.length === 0
    ? { ok: true, violations: [] }
    : { ok: false, violations };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/llm/validator.test.ts
```

Expected: 3 pass.

- [ ] **Step 5: Implement `src/llm/invoke.ts`**

```typescript
import type { Message } from "../db/repositories/messages";
import { getAnthropic } from "./client";
import { loadConfig } from "../config";

export type InvokeInput = {
  cachedSystem: string;
  dynamicSystem: string;
  history: Message[];
};

export async function invoke(input: InvokeInput): Promise<string> {
  const cfg = loadConfig();
  const client = getAnthropic();

  const messages = input.history
    .filter((m) => m.rol === "user" || m.rol === "assistant")
    .map((m) => ({
      role: m.rol as "user" | "assistant",
      content: m.contenido,
    }));

  const response = await client.messages.create({
    model: cfg.anthropicModel,
    max_tokens: 400,
    system: [
      { type: "text", text: input.cachedSystem, cache_control: { type: "ephemeral" } },
      { type: "text", text: input.dynamicSystem },
    ],
    messages,
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("LLM returned no text block");
  }
  return block.text;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/llm/invoke.ts src/llm/validator.ts tests/llm/validator.test.ts
git commit -m "feat(angela): LLM invocation with prompt caching + compliance validator"
```

---

### Task 16: Notifier interface (stub for Plan 1; impl in Plan 2)

**Files:**
- Create: `angela-bot/src/notifier/notifier.ts`

- [ ] **Step 1: Define the interface and a console-stub implementation**

```typescript
export type Notifier = {
  notifyOrder(payload: OrderNotification): Promise<void>;
  notifyHandoff(payload: HandoffNotification): Promise<void>;
};

export type OrderNotification = {
  telefono: string;
  nombre: string;
  pais: string;
  ciudad: string;
  direccion: string | null;
  producto: string;
  cantidad: number;
  guias: string[];
  summary: string;
};

export type HandoffNotification = {
  telefono: string;
  motivo: string;
  lastUserMessage: string;
  summary: string;
};

export const consoleNotifier: Notifier = {
  async notifyOrder(p) {
    console.log("[notify:order]", JSON.stringify(p, null, 2));
  },
  async notifyHandoff(p) {
    console.log("[notify:handoff]", JSON.stringify(p, null, 2));
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/notifier/notifier.ts
git commit -m "feat(angela): notifier interface with console stub"
```

---

### Task 17: Extract order from conversation history

**Files:**
- Create: `angela-bot/src/orchestrator/extract-order.ts`
- Test: `angela-bot/tests/orchestrator/extract-order.test.ts`

Once `state === DATA_CAPTURE` and the bot believes all fields are gathered, we ask Claude to extract a strict JSON object from the chat. Using a structured extraction call (separate from the conversational call) keeps the conversation natural while ensuring data integrity.

- [ ] **Step 1: Write the failing test**

`tests/orchestrator/extract-order.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { parseExtractedOrder } from "../../src/orchestrator/extract-order";

test("parseExtractedOrder accepts a well-formed payload", () => {
  const json = JSON.stringify({
    nombre: "María Pérez",
    pais: "Colombia",
    ciudad: "Medellín",
    direccion: "Cra 45 #12-30",
    producto_id: "riovida",
    cantidad: 2,
  });
  const parsed = parseExtractedOrder(json);
  expect(parsed.nombre).toBe("María Pérez");
  expect(parsed.cantidad).toBe(2);
});

test("parseExtractedOrder allows null direccion for non-Colombia", () => {
  const json = JSON.stringify({
    nombre: "Juan",
    pais: "México",
    ciudad: "CDMX",
    direccion: null,
    producto_id: "riovida",
    cantidad: 1,
  });
  const parsed = parseExtractedOrder(json);
  expect(parsed.direccion).toBeNull();
});

test("parseExtractedOrder throws on missing required field", () => {
  const json = JSON.stringify({ nombre: "x", pais: "Colombia", ciudad: "y" });
  expect(() => parseExtractedOrder(json)).toThrow();
});

test("parseExtractedOrder throws when direccion missing for Colombia", () => {
  const json = JSON.stringify({
    nombre: "x",
    pais: "Colombia",
    ciudad: "y",
    direccion: null,
    producto_id: "riovida",
    cantidad: 1,
  });
  expect(() => parseExtractedOrder(json)).toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/orchestrator/extract-order.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/orchestrator/extract-order.ts`**

```typescript
import { z } from "zod";
import type { Message } from "../db/repositories/messages";
import { getAnthropic } from "../llm/client";
import { loadConfig } from "../config";

const ExtractedSchema = z
  .object({
    nombre: z.string().min(2),
    pais: z.string().min(2),
    ciudad: z.string().min(1),
    direccion: z.string().min(3).nullable(),
    producto_id: z.string().min(1),
    cantidad: z.number().int().positive(),
  })
  .refine(
    (d) => !(d.pais.toLowerCase() === "colombia" && d.direccion === null),
    { message: "direccion required for Colombia" },
  );

export type ExtractedOrder = z.infer<typeof ExtractedSchema>;

export function parseExtractedOrder(jsonString: string): ExtractedOrder {
  const raw = JSON.parse(jsonString);
  return ExtractedSchema.parse(raw);
}

export async function extractOrderFromHistory(
  history: Message[],
): Promise<ExtractedOrder> {
  const cfg = loadConfig();
  const client = getAnthropic();

  const transcript = history
    .filter((m) => m.rol === "user" || m.rol === "assistant")
    .map((m) => `[${m.rol}] ${m.contenido}`)
    .join("\n");

  const response = await client.messages.create({
    model: cfg.anthropicModel,
    max_tokens: 300,
    system: `Eres un extractor estricto de datos de pedido. Devuelves SOLO JSON
válido, sin texto adicional. Si un campo no fue mencionado, omítelo o usa null
explícito para 'direccion'.

Schema:
{
  "nombre": string,
  "pais": string,
  "ciudad": string,
  "direccion": string | null,
  "producto_id": string,
  "cantidad": number
}

Mapping de producto_id: usar el id corto del catálogo (riovida, fibra, energy, etc).`,
    messages: [
      {
        role: "user",
        content: `Conversación:\n${transcript}\n\nExtrae el pedido en JSON.`,
      },
    ],
  });

  const block = response.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Extractor returned no text");
  }
  return parseExtractedOrder(block.text);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/orchestrator/extract-order.test.ts
```

Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/orchestrator/extract-order.ts tests/orchestrator/extract-order.test.ts
git commit -m "feat(angela): structured order extraction from history"
```

---

### Task 18: Orchestrator — `processMessage`

**Files:**
- Create: `angela-bot/src/orchestrator/process-message.ts`
- Test: `angela-bot/tests/orchestrator/process-message.test.ts`

This is the single entrypoint per inbound user message. Plan 2's WhatsApp adapter and Plan 1's CLI both call this function with `(telefono, userMessage, productContext?)`. The function:

1. Loads or creates conversation
2. If `handoff_active === 1`, returns `{ skipReply: true }` (bot is silent)
3. Appends the user message
4. Detects handoff triggers; if any → sets handoff, returns bot's handoff message and a notification
5. Otherwise, calls the LLM; validates the response
6. If validation fails, dispatches HANDOFF_MEDICAL (safest fallback)
7. Otherwise, appends the assistant message, decides next state, returns the bot's text

For testability the orchestrator accepts injected dependencies (db, catalog, notifier, llmInvoke, llmExtractOrder).

- [ ] **Step 1: Write the failing test**

`tests/orchestrator/process-message.test.ts`:

```typescript
import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { runMigrations } from "../../src/db/migrate";
import { getDb, closeDb } from "../../src/db/client";
import { loadCatalog } from "../../src/catalog/loader";
import { processMessage } from "../../src/orchestrator/process-message";
import { consoleNotifier } from "../../src/notifier/notifier";

const DB = "./data/test-orch.db";

beforeEach(() => {
  if (existsSync(DB)) unlinkSync(DB);
  runMigrations(DB);
});

afterEach(() => {
  closeDb();
  if (existsSync(DB)) unlinkSync(DB);
});

test("first inbound message produces a greeting reply", async () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  const result = await processMessage({
    db: getDb(DB),
    catalog: cat,
    notifier: consoleNotifier,
    telefono: "+573001112222",
    userMessage: "hola",
    productContext: "riovida",
    llmInvoke: async () => "¡Hola! Soy Angela, la asistente de Mildred ✨",
    llmExtractOrder: async () => ({
      nombre: "x", pais: "Colombia", ciudad: "y",
      direccion: "z", producto_id: "riovida", cantidad: 1,
    }),
  });
  expect(result.skipReply).toBe(false);
  expect(result.botReply).toContain("Angela");
});

test("handoff is triggered on 'quiero hablar con un humano'", async () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  const result = await processMessage({
    db: getDb(DB),
    catalog: cat,
    notifier: consoleNotifier,
    telefono: "+573001112222",
    userMessage: "quiero hablar con un humano por favor",
    productContext: null,
    llmInvoke: async () => "no debería llamarse",
    llmExtractOrder: async () => { throw new Error("nope"); },
  });
  expect(result.handoff?.motivo).toBe("HANDOFF_HUMAN");
  expect(result.botReply).toContain("Te paso con Mildred");
});

test("subsequent message during handoff is silent", async () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  await processMessage({
    db: getDb(DB),
    catalog: cat,
    notifier: consoleNotifier,
    telefono: "+573001112222",
    userMessage: "necesito hablar con una persona",
    productContext: null,
    llmInvoke: async () => "x",
    llmExtractOrder: async () => { throw new Error(); },
  });
  const second = await processMessage({
    db: getDb(DB),
    catalog: cat,
    notifier: consoleNotifier,
    telefono: "+573001112222",
    userMessage: "hola?",
    productContext: null,
    llmInvoke: async () => "x",
    llmExtractOrder: async () => { throw new Error(); },
  });
  expect(second.skipReply).toBe(true);
});

test("validator failure escalates to HANDOFF_MEDICAL", async () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  const result = await processMessage({
    db: getDb(DB),
    catalog: cat,
    notifier: consoleNotifier,
    telefono: "+573001112222",
    userMessage: "tengo problemas de salud",
    productContext: null,
    llmInvoke: async () => "Este producto cura todo, garantizado",
    llmExtractOrder: async () => { throw new Error(); },
  });
  expect(result.handoff?.motivo).toBe("HANDOFF_MEDICAL");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/orchestrator/process-message.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/orchestrator/process-message.ts`**

```typescript
import type { Database } from "bun:sqlite";
import type { Catalog } from "../catalog/types";
import type { Notifier } from "../notifier/notifier";
import type { Message } from "../db/repositories/messages";
import type { ExtractedOrder } from "./extract-order";
import {
  getOrCreate,
  updateState,
  setHandoff,
} from "../db/repositories/conversations";
import {
  append,
  lastTurns,
  countTurns,
} from "../db/repositories/messages";
import { create as createOrder } from "../db/repositories/orders";
import { record as recordEvent } from "../db/repositories/events";
import { detectHandoffTrigger, type HandoffMotivo } from "../state/triggers";
import { nextState } from "../state/transitions";
import { assembleSystemPrompt } from "../prompt/assemble";
import { validateResponse } from "../llm/validator";
import { loadConfig } from "../config";

export type ProcessInput = {
  db: Database;
  catalog: Catalog;
  notifier: Notifier;
  telefono: string;
  userMessage: string;
  productContext: string | null;
  llmInvoke: (args: {
    cachedSystem: string;
    dynamicSystem: string;
    history: Message[];
  }) => Promise<string>;
  llmExtractOrder: (history: Message[]) => Promise<ExtractedOrder>;
};

export type ProcessResult = {
  skipReply: boolean;
  botReply: string | null;
  handoff: { motivo: HandoffMotivo } | null;
};

const HANDOFF_MESSAGE =
  "Te paso con Mildred para que te atienda personalmente desde aquí. Ya le compartí todo el contexto de lo que hemos conversado.";

export async function processMessage(input: ProcessInput): Promise<ProcessResult> {
  const cfg = loadConfig();
  const { db, telefono, userMessage } = input;

  const conv = getOrCreate(db, telefono, input.productContext);

  if (conv.handoff_active === 1) {
    append(db, telefono, "user", userMessage);
    return { skipReply: true, botReply: null, handoff: null };
  }

  if (countTurns(db, telefono) === 0) {
    recordEvent(db, telefono, "conversation_started", { productContext: input.productContext });
  }

  append(db, telefono, "user", userMessage);

  const objectionTurns = countObjectionTurns(db, telefono);
  const consecutiveConfusion = countConsecutiveConfusion(db, telefono);

  const trigger = detectHandoffTrigger({
    userMessage,
    state: conv.estado as any,
    objectionTurns,
    consecutiveConfusion,
  });

  if (trigger) {
    setHandoff(db, telefono, trigger);
    recordEvent(db, telefono, "handoff_triggered", { motivo: trigger });
    await input.notifier.notifyHandoff({
      telefono,
      motivo: trigger,
      lastUserMessage: userMessage,
      summary: summarizeConversation(db, telefono),
    });
    append(db, telefono, "assistant", HANDOFF_MESSAGE);
    return { skipReply: false, botReply: HANDOFF_MESSAGE, handoff: { motivo: trigger } };
  }

  const history = lastTurns(db, telefono, cfg.historyTurns);
  const prompt = assembleSystemPrompt({
    catalog: input.catalog,
    state: conv.estado as any,
    productContext: conv.producto_contexto,
    turnCount: history.length,
  });

  const llmText = await input.llmInvoke({
    cachedSystem: prompt.cachedSystem,
    dynamicSystem: prompt.dynamicSystem,
    history,
  });

  const validation = validateResponse(llmText);
  if (!validation.ok) {
    setHandoff(db, telefono, "HANDOFF_MEDICAL");
    recordEvent(db, telefono, "handoff_triggered", {
      motivo: "HANDOFF_MEDICAL",
      reason: "validator_failure",
      violations: validation.violations,
    });
    await input.notifier.notifyHandoff({
      telefono,
      motivo: "HANDOFF_MEDICAL",
      lastUserMessage: userMessage,
      summary: `Bot generó respuesta no compliant: "${llmText}". Violaciones: ${validation.violations.join(", ")}`,
    });
    append(db, telefono, "assistant", HANDOFF_MESSAGE);
    return { skipReply: false, botReply: HANDOFF_MESSAGE, handoff: { motivo: "HANDOFF_MEDICAL" } };
  }

  append(db, telefono, "assistant", llmText);

  const signals = deriveSignals(userMessage, conv.estado as any);
  let dataReady = false;
  if (conv.estado === "DATA_CAPTURE") {
    dataReady = await tryExtractAndCreateOrder(input);
  }

  const next = nextState({
    current: conv.estado as any,
    userReplied: true,
    expressedInterest: signals.expressedInterest,
    objectionDetected: signals.objectionDetected,
    intentToBuy: signals.intentToBuy,
    dataReady,
  });

  if (next !== conv.estado) {
    updateState(db, telefono, next);
    recordEvent(db, telefono, "phase_changed", { from: conv.estado, to: next });
    if (next === "OBJECTION") recordEvent(db, telefono, "objection_raised", null);
  }

  return { skipReply: false, botReply: llmText, handoff: null };
}

const INTENT_REGEX =
  /\b(lo quiero|me lo llevo|sí lo quiero|listo|cómpr|c[oó]mpr|pedido|hagamos|d[aá]melo)\b/i;
const OBJECTION_REGEX =
  /\b(caro|costoso|pensar|despu[eé]s|no s[eé]|duda|funciona de verdad|garantiz|barato|m[aá]s barato)\b/i;
const INTEREST_REGEX =
  /\b(energ[ií]a|inmun|desintox|fibra|gripa|cansa|sue[ñn]o|enfoque|mejor|salud)\b/i;

function deriveSignals(userMessage: string, state: string) {
  return {
    expressedInterest: INTEREST_REGEX.test(userMessage),
    objectionDetected: OBJECTION_REGEX.test(userMessage),
    intentToBuy: INTENT_REGEX.test(userMessage),
  };
}

function countObjectionTurns(db: Database, telefono: string): number {
  const rows = db
    .query(
      `SELECT contenido FROM messages
       WHERE telefono = ? AND rol = 'user'
       ORDER BY turno_numero DESC
       LIMIT 6`,
    )
    .all(telefono) as { contenido: string }[];
  let count = 0;
  for (const r of rows) {
    if (OBJECTION_REGEX.test(r.contenido)) count++;
    else break;
  }
  return count;
}

function countConsecutiveConfusion(db: Database, telefono: string): number {
  const rows = db
    .query(
      `SELECT contenido FROM messages
       WHERE telefono = ? AND rol = 'assistant'
       ORDER BY turno_numero DESC
       LIMIT 4`,
    )
    .all(telefono) as { contenido: string }[];
  let count = 0;
  for (const r of rows) {
    if (/no entiendo|podrías repetir|no estoy segura/i.test(r.contenido)) count++;
    else break;
  }
  return count;
}

function summarizeConversation(db: Database, telefono: string): string {
  const turns = lastTurns(db, telefono, 20);
  return turns
    .map((t) => `[${t.rol}] ${t.contenido}`)
    .join("\n");
}

async function tryExtractAndCreateOrder(input: ProcessInput): Promise<boolean> {
  const history = lastTurns(input.db, input.telefono, 50);
  try {
    const order = await input.llmExtractOrder(history);
    const product = input.catalog.productos.find((p) => p.id === order.producto_id);
    if (!product) return false;
    const guias = [
      input.catalog.bonus_universal.nombre,
      product.guia_especifica,
    ];
    const id = createOrder(input.db, {
      telefono: input.telefono,
      nombre: order.nombre,
      pais: order.pais,
      ciudad: order.ciudad,
      direccion: order.direccion,
      producto_id: order.producto_id,
      cantidad: order.cantidad,
      guias_incluidas: guias,
    });
    recordEvent(input.db, input.telefono, "order_captured", { orderId: id });
    await input.notifier.notifyOrder({
      telefono: input.telefono,
      nombre: order.nombre,
      pais: order.pais,
      ciudad: order.ciudad,
      direccion: order.direccion,
      producto: product.nombre_comercial,
      cantidad: order.cantidad,
      guias,
      summary: summarizeConversation(input.db, input.telefono),
    });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/orchestrator/process-message.test.ts
```

Expected: 4 pass.

- [ ] **Step 5: Commit**

```bash
git add src/orchestrator/process-message.ts tests/orchestrator/process-message.test.ts
git commit -m "feat(angela): orchestrator processMessage with handoff + validator + order capture"
```

---

### Task 19: CLI REPL test harness

**Files:**
- Create: `angela-bot/src/cli/repl.ts`

This script lets Mildred (or the dev) chat with Angela in the terminal exactly as a real WhatsApp user would. Uses real Claude + real DB. Useful for prompt-tuning before Plan 2 stacks Baileys on top.

- [ ] **Step 1: Implement `src/cli/repl.ts`**

```typescript
import { loadConfig } from "../config";
import { runMigrations } from "../db/migrate";
import { getDb, closeDb } from "../db/client";
import { loadCatalog } from "../catalog/loader";
import { consoleNotifier } from "../notifier/notifier";
import { processMessage } from "../orchestrator/process-message";
import { invoke } from "../llm/invoke";
import { extractOrderFromHistory } from "../orchestrator/extract-order";

async function main() {
  const cfg = loadConfig();
  runMigrations(cfg.dbPath);
  const db = getDb(cfg.dbPath);
  const catalog = loadCatalog("./data/catalog-seed.json");

  const telefono = process.argv[2] ?? "+573000000000";
  const productContext = process.argv[3] ?? null;

  console.log(
    `\nAngela REPL — telefono=${telefono} producto_contexto=${productContext ?? "(ninguno)"}\n` +
      `Escribe tu mensaje y presiona enter. Ctrl+C para salir.\n`,
  );

  process.stdout.write("tú> ");
  for await (const line of console) {
    const text = line.trim();
    if (!text) {
      process.stdout.write("tú> ");
      continue;
    }
    try {
      const result = await processMessage({
        db,
        catalog,
        notifier: consoleNotifier,
        telefono,
        userMessage: text,
        productContext,
        llmInvoke: (a) => invoke(a),
        llmExtractOrder: (h) => extractOrderFromHistory(h),
      });
      if (result.skipReply) {
        console.log("(angela en silencio — handoff activo)");
      } else {
        console.log(`Angela> ${result.botReply}`);
        if (result.handoff) {
          console.log(`(handoff: ${result.handoff.motivo})`);
        }
      }
    } catch (e) {
      console.error("[error]", e);
    }
    process.stdout.write("tú> ");
  }

  closeDb();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke test manually**

```bash
bun run migrate
bun run repl +573009998877 riovida
```

Type `hola` and verify Angela greets you mentioning RioVida.

- [ ] **Step 3: Commit**

```bash
git add src/cli/repl.ts
git commit -m "feat(angela): interactive REPL test harness"
```

---

### Task 20: End-to-end happy-path test with mocked Claude

**Files:**
- Test: `angela-bot/tests/e2e/happy-path.test.ts`

This test wires the whole stack together with mocked LLM responses to verify the engine drives from GREETING → CONFIRMATION and captures an order. It does NOT call the real Anthropic API.

- [ ] **Step 1: Write the failing test**

`tests/e2e/happy-path.test.ts`:

```typescript
import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { runMigrations } from "../../src/db/migrate";
import { getDb, closeDb } from "../../src/db/client";
import { loadCatalog } from "../../src/catalog/loader";
import { processMessage } from "../../src/orchestrator/process-message";
import { consoleNotifier } from "../../src/notifier/notifier";
import { listPending } from "../../src/db/repositories/orders";
import { countByType } from "../../src/db/repositories/events";

const DB = "./data/test-e2e.db";

beforeEach(() => {
  if (existsSync(DB)) unlinkSync(DB);
  runMigrations(DB);
});

afterEach(() => {
  closeDb();
  if (existsSync(DB)) unlinkSync(DB);
});

test("happy path: GREETING → DISCOVERY → RECOMMEND → INTENT_BUY → DATA_CAPTURE → CONFIRMATION + order captured", async () => {
  const cat = loadCatalog("./data/catalog-seed.json");
  const tel = "+573009999999";

  const llmReplies = [
    "¡Hola! Soy Angela, la asistente de Mildred ✨ ¿qué te llamó la atención?",
    "Cuéntame qué buscas mejorar, ¿energía, inmunidad, desintoxicación?",
    "Para tu caso te recomiendo RioVida — apoya la energía y la desintoxicación. Y con tu compra te llevas la Guía Maestra (vale 80k) y la Guía de Desintoxicación específica del producto ✨ ¿lo dejamos listo?",
    "Perfecto, vamos a dejar tu pedido listo. ¿Me confirmas tu nombre completo?",
    "Listo, María. ¿En qué ciudad y país estás?",
    "Genial. ¿Cuál es la dirección de envío?",
    "Perfecto. ¿Cuántas unidades llevas?",
    "Tu pedido quedó listo. Mildred te confirma valor y pago en breve ✨",
  ];
  let i = 0;
  const llmInvoke = async () => llmReplies[i++] ?? "ok";
  const llmExtractOrder = async () => ({
    nombre: "María Pérez",
    pais: "Colombia",
    ciudad: "Medellín",
    direccion: "Cra 45 #12-30",
    producto_id: "riovida",
    cantidad: 1,
  });

  const inputs = [
    "hola",
    "energía baja todo el tiempo",
    "ya lo quiero",
    "María Pérez",
    "Medellín, Colombia",
    "Cra 45 #12-30",
    "1 unidad",
  ];

  for (const msg of inputs) {
    await processMessage({
      db: getDb(DB),
      catalog: cat,
      notifier: consoleNotifier,
      telefono: tel,
      userMessage: msg,
      productContext: "riovida",
      llmInvoke,
      llmExtractOrder,
    });
  }

  const orders = listPending(getDb(DB));
  expect(orders.length).toBe(1);
  expect(orders[0].nombre).toBe("María Pérez");
  expect(orders[0].producto_id).toBe("riovida");
  expect(JSON.parse(orders[0].guias_incluidas)).toEqual([
    "Guía Maestra de Consumo 4life",
    "Guía de Desintoxicación",
  ]);

  expect(countByType(getDb(DB), "conversation_started")).toBe(1);
  expect(countByType(getDb(DB), "order_captured")).toBe(1);
});
```

- [ ] **Step 2: Run test**

```bash
bun test tests/e2e/happy-path.test.ts
```

Expected: 1 pass (may need to tune `deriveSignals` regex in process-message based on inputs — adjust until passing without weakening real-world behavior).

- [ ] **Step 3: Run the full suite**

```bash
bun test
```

Expected: all tests pass, no flaky warnings.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/happy-path.test.ts
git commit -m "test(angela): e2e happy path through full state machine"
```

---

### Task 21: Manual smoke test against real Claude

**Files:** none — manual verification.

- [ ] **Step 1: Configure environment**

```bash
cp .env.example .env
# fill ANTHROPIC_API_KEY with a real key
# fill MILDRED_PHONE_E164 with Mildred's real WhatsApp number
```

- [ ] **Step 2: Run migrations and the REPL**

```bash
bun run migrate
bun run repl +573009998877 riovida
```

- [ ] **Step 3: Walk through the script with Mildred present**

Test prompts to run in order (note Angela's reply quality, tone, and that anti-patterns don't appear):

1. `hola` — expect greeting that mentions RioVida and asks one question
2. `tengo poca energía últimamente` — expect DISCOVERY follow-up, no recommendation yet
3. `qué me recomiendas para eso?` — expect RECOMMEND with one product, one reason, mention of Guía Maestra + specific guide
4. `está un poco caro` — expect objection handling referencing guías value
5. `bueno, lo quiero` — expect INTENT_BUY → DATA_CAPTURE asking for nombre
6. `María Pérez` — expect ciudad/país question
7. `Medellín, Colombia` — expect dirección question
8. `Cra 45 #12-30, Belén` — expect cantidad question
9. `1 unidad` — expect CONFIRMATION with full resumen, mentions of guías, and link
10. `tengo lupus` (start a new conversation with a different teléfono) — expect HANDOFF_MEDICAL

- [ ] **Step 4: Document findings**

If Angela behaves correctly, mark Plan 1 complete and move to Plan 2. If prompt tuning is needed, add a follow-up task to update `src/prompt/voice.ts` or `src/prompt/phase-instructions.ts` before declaring done.

- [ ] **Step 5: Commit any prompt tweaks**

```bash
git add src/prompt/
git commit -m "tune(angela): prompt adjustments from manual smoke test"
```

---

## Self-review checklist for this plan

After completing all tasks, verify:

1. **Spec coverage:** Every section of the spec § 1–6 has a corresponding task. Sections § 5 (notification format), § 6 (GA4, hosting, risks), and § 8 deployment are intentionally deferred to Plans 2 and 3.
2. **All tests pass:** `bun test` is green.
3. **Typecheck passes:** `bun run typecheck` is green.
4. **REPL works** end-to-end against real Claude.
5. **No placeholders** in the code (catalog JSON values are placeholders the user must fill — flagged in the README and the spec).

## What Plans 2 and 3 will cover

**Plan 2 — WhatsApp Adapter:**
- Baileys connection with auth state persistence
- Inbound message handler → `processMessage`
- Outbound send with human-like typing delays (anti-ban mitigation)
- Real notifier implementation (sends to Mildred's Saved Messages + optional email)
- Admin command parser (`/resume <phone>`)
- Reconnection logic + healthcheck

**Plan 3 — Observability & Deployment:**
- GA4 Measurement Protocol integration for `order_captured`
- Weekly metrics CLI report (KPIs from spec § 6)
- Dockerfile + Fly.io config
- Production deployment runbook
- Database backup automation
