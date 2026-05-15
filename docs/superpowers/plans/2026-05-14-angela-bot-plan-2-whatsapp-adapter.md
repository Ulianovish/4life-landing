# Angela Bot — Plan 2: WhatsApp Adapter (Baileys)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the conversation engine from Plan 1 to WhatsApp via Baileys. Mildred can now talk to Angela from a real WhatsApp number. Handoff notifications go to her Saved Messages chat. Admin commands let her resume bot control after handling a customer manually.

**Architecture:** A new `src/whatsapp/` module wraps Baileys. The Baileys event loop calls `processMessage()` from Plan 1 for every inbound text. Outbound messages get human-like typing delays (anti-ban mitigation). The notifier console stub from Plan 1 is replaced with a real implementation that sends to Mildred's own number ("Saved Messages"). An admin command parser intercepts messages from Mildred herself (`/resume <phone>`, `/status`) before they reach the customer-facing orchestrator.

**Tech Stack:** `@whiskeysockets/baileys`, `qrcode-terminal` (for first-time QR pairing), `pino` (Baileys requires a logger). Hosting requires an always-on process — covered in Plan 3.

**Companion spec:** `docs/superpowers/specs/2026-05-14-whatsapp-sales-bot-design.md`
**Depends on:** Plan 1 (must be complete and passing all tests)

---

## File structure added by this plan

```
angela-bot/
├── src/
│   ├── whatsapp/
│   │   ├── auth-store.ts          # persistent Baileys auth state (file-based)
│   │   ├── client.ts              # Baileys socket factory
│   │   ├── send.ts                # outbound send with typing delays
│   │   ├── inbound.ts             # event handler → processMessage
│   │   ├── notifier-whatsapp.ts   # real Notifier impl (Saved Messages)
│   │   ├── admin-commands.ts      # /resume, /status from Mildred
│   │   └── reconnect.ts           # auto-reconnect on connection drop
│   └── main.ts                    # production entrypoint
└── tests/
    └── whatsapp/
        ├── admin-commands.test.ts
        ├── notifier-whatsapp.test.ts
        └── send.test.ts
```

The `tests/whatsapp/` suite avoids real Baileys calls (those need an actual WhatsApp pairing) — it tests the pure logic (admin parsing, message formatting, delay computation) and uses a fake socket.

---

### Task 1: Install Baileys dependencies

**Files:**
- Modify: `angela-bot/package.json`

- [ ] **Step 1: Install**

```bash
cd angela-bot
bun add @whiskeysockets/baileys qrcode-terminal pino
bun add -d @types/qrcode-terminal
```

- [ ] **Step 2: Add main script to package.json**

Open `package.json`. Inside `"scripts"`, add:

```json
"start": "bun run src/main.ts"
```

So the full `scripts` block reads:

```json
"scripts": {
  "migrate": "bun run src/db/migrate.ts",
  "repl": "bun run src/cli/repl.ts",
  "start": "bun run src/main.ts",
  "test": "bun test",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "feat(angela): add Baileys + pino + qrcode-terminal deps"
```

---

### Task 2: Persistent auth state store

**Files:**
- Create: `angela-bot/src/whatsapp/auth-store.ts`

Baileys needs to persist credentials so the bot doesn't have to re-scan the QR on every restart. We use the built-in `useMultiFileAuthState` and put the files in `./auth_state/` (gitignored per Plan 1).

- [ ] **Step 1: Implement `src/whatsapp/auth-store.ts`**

```typescript
import { useMultiFileAuthState } from "@whiskeysockets/baileys";
import { mkdirSync } from "node:fs";

const AUTH_DIR = "./auth_state";

export async function loadAuthState() {
  mkdirSync(AUTH_DIR, { recursive: true });
  return useMultiFileAuthState(AUTH_DIR);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/whatsapp/auth-store.ts
git commit -m "feat(angela): persistent Baileys auth state"
```

---

### Task 3: Baileys socket factory + QR display

**Files:**
- Create: `angela-bot/src/whatsapp/client.ts`

- [ ] **Step 1: Implement `src/whatsapp/client.ts`**

```typescript
import {
  makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import { Boom } from "@hapi/boom";
import { loadAuthState } from "./auth-store";

const logger = pino({ level: "warn" });

export type ClientHandlers = {
  onMessage: (sock: WASocket, msg: any) => Promise<void>;
  onReady: (sock: WASocket) => void;
  onDisconnect: (shouldReconnect: boolean) => void;
};

export async function startSocket(handlers: ClientHandlers): Promise<WASocket> {
  const { state, saveCreds } = await loadAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false, // we'll print it ourselves
    markOnlineOnConnect: false, // avoid changing online presence
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log("\n[whatsapp] scan this QR with your WhatsApp account:\n");
      qrcode.generate(qr, { small: true });
    }
    if (connection === "open") {
      console.log("[whatsapp] connected");
      handlers.onReady(sock);
    }
    if (connection === "close") {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.warn("[whatsapp] disconnected", { code, shouldReconnect });
      handlers.onDisconnect(shouldReconnect);
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      try {
        await handlers.onMessage(sock, msg);
      } catch (e) {
        console.error("[whatsapp] message handler error", e);
      }
    }
  });

  return sock;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/whatsapp/client.ts
git commit -m "feat(angela): Baileys socket factory with QR display + reconnect signal"
```

---

### Task 4: Outbound send with human-like typing delays

**Files:**
- Create: `angela-bot/src/whatsapp/send.ts`
- Test: `angela-bot/tests/whatsapp/send.test.ts`

Anti-ban rule per spec § 6: never send instantly, mimic human typing. The delay scales with message length, capped at 5s; minimum 1.5s. We also send the `composing` presence so the user sees "escribiendo…".

- [ ] **Step 1: Write the failing test**

`tests/whatsapp/send.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { computeTypingDelayMs } from "../../src/whatsapp/send";

test("delay scales with message length", () => {
  const short = computeTypingDelayMs("hola");
  const long = computeTypingDelayMs("a".repeat(200));
  expect(long).toBeGreaterThan(short);
});

test("delay never below 1500ms", () => {
  expect(computeTypingDelayMs("a")).toBeGreaterThanOrEqual(1500);
});

test("delay never above 5000ms", () => {
  expect(computeTypingDelayMs("a".repeat(5000))).toBeLessThanOrEqual(5000);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/whatsapp/send.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/whatsapp/send.ts`**

```typescript
import type { WASocket } from "@whiskeysockets/baileys";

export function computeTypingDelayMs(text: string): number {
  const perChar = 30; // 30ms per character ≈ 2000 chars/min, realistic for a coach
  const raw = 1500 + text.length * perChar;
  return Math.min(5000, Math.max(1500, raw));
}

export async function sendWithTyping(
  sock: WASocket,
  jid: string,
  text: string,
): Promise<void> {
  await sock.sendPresenceUpdate("composing", jid);
  await new Promise((r) => setTimeout(r, computeTypingDelayMs(text)));
  await sock.sendPresenceUpdate("paused", jid);
  await sock.sendMessage(jid, { text });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/whatsapp/send.test.ts
```

Expected: 3 pass.

- [ ] **Step 5: Commit**

```bash
git add src/whatsapp/send.ts tests/whatsapp/send.test.ts
git commit -m "feat(angela): outbound send with human-like typing delays"
```

---

### Task 5: WhatsApp notifier — sends to Mildred's Saved Messages

**Files:**
- Create: `angela-bot/src/whatsapp/notifier-whatsapp.ts`
- Test: `angela-bot/tests/whatsapp/notifier-whatsapp.test.ts`

Per spec § 5, the bot sends order and handoff notifications to Mildred's own number (the same number Baileys is logged in on). WhatsApp's "Saved Messages" is simply messaging your own JID.

- [ ] **Step 1: Write the failing test**

`tests/whatsapp/notifier-whatsapp.test.ts`:

```typescript
import { test, expect } from "bun:test";
import { formatOrderNotification, formatHandoffNotification } from "../../src/whatsapp/notifier-whatsapp";

test("formatOrderNotification includes all required fields", () => {
  const out = formatOrderNotification({
    telefono: "+573001112222",
    nombre: "María Pérez",
    pais: "Colombia",
    ciudad: "Medellín",
    direccion: "Cra 45 #12-30",
    producto: "RioVida",
    cantidad: 1,
    guias: ["Guía Maestra de Consumo 4life", "Guía de Desintoxicación"],
    summary: "[user] hola\n[assistant] hola Maria",
  });
  expect(out).toContain("NUEVO PEDIDO");
  expect(out).toContain("María Pérez");
  expect(out).toContain("+573001112222");
  expect(out).toContain("Medellín");
  expect(out).toContain("RioVida");
  expect(out).toContain("Guía Maestra de Consumo 4life");
});

test("formatHandoffNotification includes motivo and last message", () => {
  const out = formatHandoffNotification({
    telefono: "+573001112222",
    motivo: "HANDOFF_MEDICAL",
    lastUserMessage: "tengo lupus",
    summary: "[user] tengo lupus",
  });
  expect(out).toContain("HANDOFF");
  expect(out).toContain("HANDOFF_MEDICAL");
  expect(out).toContain("tengo lupus");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/whatsapp/notifier-whatsapp.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/whatsapp/notifier-whatsapp.ts`**

```typescript
import type { WASocket } from "@whiskeysockets/baileys";
import type {
  Notifier,
  OrderNotification,
  HandoffNotification,
} from "../notifier/notifier";

export function formatOrderNotification(p: OrderNotification): string {
  return [
    `🔔 NUEVO PEDIDO – ${new Date().toISOString().replace("T", " ").slice(0, 16)}`,
    ``,
    `Cliente: ${p.nombre} (${p.telefono})`,
    `País/Ciudad: ${p.pais}, ${p.ciudad}`,
    p.direccion ? `Dirección: ${p.direccion}` : `Dirección: (no aplica)`,
    `Producto: ${p.producto} x${p.cantidad}`,
    `Guías: ${p.guias.join(" + ")}`,
    ``,
    `Resumen conversación:`,
    p.summary,
  ].join("\n");
}

export function formatHandoffNotification(p: HandoffNotification): string {
  return [
    `🚨 HANDOFF – ${p.motivo}`,
    ``,
    `Cliente: ${p.telefono}`,
    `Último mensaje: "${p.lastUserMessage}"`,
    ``,
    `Resumen conversación:`,
    p.summary,
  ].join("\n");
}

export function makeWhatsappNotifier(
  sock: WASocket,
  mildredPhoneE164: string,
): Notifier {
  const mildredJid = `${mildredPhoneE164.replace("+", "")}@s.whatsapp.net`;
  return {
    async notifyOrder(p) {
      await sock.sendMessage(mildredJid, { text: formatOrderNotification(p) });
    },
    async notifyHandoff(p) {
      await sock.sendMessage(mildredJid, { text: formatHandoffNotification(p) });
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/whatsapp/notifier-whatsapp.test.ts
```

Expected: 2 pass.

- [ ] **Step 5: Commit**

```bash
git add src/whatsapp/notifier-whatsapp.ts tests/whatsapp/notifier-whatsapp.test.ts
git commit -m "feat(angela): WhatsApp notifier sends to Mildred Saved Messages"
```

---

### Task 6: Admin commands (`/resume`, `/status`)

**Files:**
- Create: `angela-bot/src/whatsapp/admin-commands.ts`
- Test: `angela-bot/tests/whatsapp/admin-commands.test.ts`

When Mildred messages her own number with `/resume +573001112222`, the bot clears `handoff_active` for that conversation so Angela can respond again. With `/status`, the bot returns counts of pending orders and active handoffs.

- [ ] **Step 1: Write the failing test**

`tests/whatsapp/admin-commands.test.ts`:

```typescript
import { test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { runMigrations } from "../../src/db/migrate";
import { getDb, closeDb } from "../../src/db/client";
import { getOrCreate, setHandoff } from "../../src/db/repositories/conversations";
import { parseAdminCommand, executeAdminCommand } from "../../src/whatsapp/admin-commands";

const DB = "./data/test-admin.db";

beforeEach(() => {
  if (existsSync(DB)) unlinkSync(DB);
  runMigrations(DB);
});

afterEach(() => {
  closeDb();
  if (existsSync(DB)) unlinkSync(DB);
});

test("parseAdminCommand parses /resume", () => {
  expect(parseAdminCommand("/resume +573001112222")).toEqual({
    cmd: "resume",
    phone: "+573001112222",
  });
});

test("parseAdminCommand parses /status", () => {
  expect(parseAdminCommand("/status")).toEqual({ cmd: "status" });
});

test("parseAdminCommand returns null on non-command", () => {
  expect(parseAdminCommand("hola Mildred")).toBeNull();
});

test("executeAdminCommand resume clears handoff", async () => {
  getOrCreate(getDb(DB), "+573001112222", null);
  setHandoff(getDb(DB), "+573001112222", "HANDOFF_HUMAN");

  const reply = await executeAdminCommand(getDb(DB), { cmd: "resume", phone: "+573001112222" });
  expect(reply).toContain("reanudada");

  const conv = getOrCreate(getDb(DB), "+573001112222", null);
  expect(conv.handoff_active).toBe(0);
});

test("executeAdminCommand status returns counts", async () => {
  const reply = await executeAdminCommand(getDb(DB), { cmd: "status" });
  expect(reply).toContain("pedidos pendientes");
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun test tests/whatsapp/admin-commands.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/whatsapp/admin-commands.ts`**

```typescript
import type { Database } from "bun:sqlite";
import { clearHandoff } from "../db/repositories/conversations";
import { listPending } from "../db/repositories/orders";
import { record as recordEvent } from "../db/repositories/events";

export type AdminCommand =
  | { cmd: "resume"; phone: string }
  | { cmd: "status" };

const RESUME_RE = /^\/resume\s+(\+\d{8,15})\s*$/;
const STATUS_RE = /^\/status\s*$/;

export function parseAdminCommand(text: string): AdminCommand | null {
  const r = RESUME_RE.exec(text);
  if (r) return { cmd: "resume", phone: r[1] };
  if (STATUS_RE.test(text)) return { cmd: "status" };
  return null;
}

export async function executeAdminCommand(
  db: Database,
  command: AdminCommand,
): Promise<string> {
  if (command.cmd === "resume") {
    clearHandoff(db, command.phone);
    recordEvent(db, command.phone, "bot_resumed", null);
    return `✅ Bot reanudada para ${command.phone}.`;
  }
  if (command.cmd === "status") {
    const pending = listPending(db);
    return `📊 Status\n• ${pending.length} pedidos pendientes`;
  }
  return "comando desconocido";
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bun test tests/whatsapp/admin-commands.test.ts
```

Expected: 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/whatsapp/admin-commands.ts tests/whatsapp/admin-commands.test.ts
git commit -m "feat(angela): admin commands /resume and /status"
```

---

### Task 7: Inbound message handler — wires Baileys to the orchestrator

**Files:**
- Create: `angela-bot/src/whatsapp/inbound.ts`

This module's `handleInbound` function is what Plan 1's `startSocket(handlers)` calls per inbound message. It:

1. Filters out non-text and self-sent messages (unless the sender is Mildred and the text is an admin command — in which case it runs that command and replies)
2. Extracts the JID, phone, and text
3. Looks for a stored `product_context` for this phone (none in v1 — left as null)
4. Calls `processMessage()` from Plan 1
5. If a reply was produced, sends it back via `sendWithTyping()`

- [ ] **Step 1: Implement `src/whatsapp/inbound.ts`**

```typescript
import type { WASocket, proto } from "@whiskeysockets/baileys";
import type { Database } from "bun:sqlite";
import type { Catalog } from "../catalog/types";
import type { Notifier } from "../notifier/notifier";
import type { Config } from "../config";
import { processMessage } from "../orchestrator/process-message";
import { invoke } from "../llm/invoke";
import { extractOrderFromHistory } from "../orchestrator/extract-order";
import { sendWithTyping } from "./send";
import { parseAdminCommand, executeAdminCommand } from "./admin-commands";

export type InboundDeps = {
  db: Database;
  catalog: Catalog;
  notifier: Notifier;
  cfg: Config;
};

function jidToPhoneE164(jid: string): string | null {
  const m = /^(\d+)@s\.whatsapp\.net$/.exec(jid);
  return m ? `+${m[1]}` : null;
}

function extractText(msg: proto.IWebMessageInfo): string | null {
  const m = msg.message;
  if (!m) return null;
  return m.conversation ?? m.extendedTextMessage?.text ?? null;
}

export async function handleInbound(
  deps: InboundDeps,
  sock: WASocket,
  msg: proto.IWebMessageInfo,
): Promise<void> {
  if (!msg.key.remoteJid) return;
  const senderJid = msg.key.remoteJid;
  const senderPhone = jidToPhoneE164(senderJid);
  const text = extractText(msg);
  if (!text || !senderPhone) return;

  // Admin commands: only honored when message is from Mildred AND was sent from
  // her own device (fromMe=true means it was sent from this WhatsApp account).
  if (msg.key.fromMe && senderPhone === deps.cfg.mildredPhoneE164) {
    const cmd = parseAdminCommand(text);
    if (cmd) {
      const reply = await executeAdminCommand(deps.db, cmd);
      await sock.sendMessage(senderJid, { text: reply });
      return;
    }
    // Not an admin command — Mildred is just messaging herself; ignore.
    return;
  }

  // Ignore other fromMe messages (echoes from Mildred replying to customers).
  if (msg.key.fromMe) return;

  // Customer message → orchestrator
  const result = await processMessage({
    db: deps.db,
    catalog: deps.catalog,
    notifier: deps.notifier,
    telefono: senderPhone,
    userMessage: text,
    productContext: null, // v1: no per-conversation context from inbound
    llmInvoke: (a) => invoke(a),
    llmExtractOrder: (h) => extractOrderFromHistory(h),
  });

  if (result.skipReply) return;
  if (result.botReply) await sendWithTyping(sock, senderJid, result.botReply);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/whatsapp/inbound.ts
git commit -m "feat(angela): inbound handler bridges Baileys to orchestrator + admin commands"
```

---

### Task 8: Reconnection logic

**Files:**
- Create: `angela-bot/src/whatsapp/reconnect.ts`

Baileys disconnects happen routinely. When `onDisconnect(shouldReconnect=true)` fires, we re-open the socket with exponential backoff capped at 60s.

- [ ] **Step 1: Implement `src/whatsapp/reconnect.ts`**

```typescript
export function backoffDelayMs(attempt: number): number {
  // 2s, 4s, 8s, 16s, 32s, capped at 60s
  return Math.min(60000, 2000 * Math.pow(2, attempt));
}

export async function withReconnect(
  start: () => Promise<void>,
): Promise<void> {
  let attempt = 0;
  while (true) {
    try {
      await start();
      return;
    } catch (e) {
      const delay = backoffDelayMs(attempt++);
      console.error(`[whatsapp] start failed, retrying in ${delay}ms`, e);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/whatsapp/reconnect.ts
git commit -m "feat(angela): exponential-backoff reconnection helper"
```

---

### Task 9: Main entrypoint

**Files:**
- Create: `angela-bot/src/main.ts`

The production entrypoint: load config, run migrations, load catalog, start Baileys, wire everything together. Also installs a healthcheck file (touched every 60s) so external monitoring can detect a hung process.

- [ ] **Step 1: Implement `src/main.ts`**

```typescript
import { writeFileSync } from "node:fs";
import type { WASocket } from "@whiskeysockets/baileys";
import { loadConfig } from "./config";
import { runMigrations } from "./db/migrate";
import { getDb } from "./db/client";
import { loadCatalog } from "./catalog/loader";
import { startSocket } from "./whatsapp/client";
import { handleInbound } from "./whatsapp/inbound";
import { makeWhatsappNotifier } from "./whatsapp/notifier-whatsapp";
import { withReconnect } from "./whatsapp/reconnect";

const HEALTHCHECK_FILE = "./data/healthcheck.txt";

async function main() {
  const cfg = loadConfig();
  runMigrations(cfg.dbPath);
  const db = getDb(cfg.dbPath);
  const catalog = loadCatalog("./data/catalog-seed.json");

  let connectedSock: WASocket | null = null;

  await withReconnect(async () => {
    await new Promise<void>(async (resolve, reject) => {
      try {
        await startSocket({
          onReady: (sock) => {
            connectedSock = sock;
            const notifier = makeWhatsappNotifier(sock, cfg.mildredPhoneE164);
            sock.ev.removeAllListeners("messages.upsert"); // re-bind with deps
            sock.ev.on("messages.upsert", async ({ messages }) => {
              for (const msg of messages) {
                try {
                  await handleInbound({ db, catalog, notifier, cfg }, sock, msg);
                } catch (e) {
                  console.error("[main] handler error", e);
                }
              }
            });
            console.log("[main] Angela is live");
          },
          onMessage: async () => {
            /* superseded once onReady rebinds */
          },
          onDisconnect: (shouldReconnect) => {
            connectedSock = null;
            if (shouldReconnect) reject(new Error("reconnect"));
            else {
              console.error("[main] logged out — manual QR re-scan required");
              process.exit(1);
            }
          },
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

setInterval(() => {
  try {
    writeFileSync(HEALTHCHECK_FILE, new Date().toISOString());
  } catch {
    /* noop */
  }
}, 60_000);

main().catch((e) => {
  console.error("[main] fatal", e);
  process.exit(1);
});
```

- [ ] **Step 2: Smoke test locally**

```bash
bun run start
```

Expected: QR code appears in terminal. Scan with the Transfer Vital WhatsApp. After pairing succeeds, `[whatsapp] connected` and `[main] Angela is live` are logged.

Then from a different phone, message the Transfer Vital number `hola`. Verify Angela replies (with typing delay).

Then from the Transfer Vital phone itself, send `/status` to your own number — verify the bot replies with the pedidos pendientes count.

Send `/resume +573009998877` (use a real test customer phone). Verify it acknowledges.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(angela): production entrypoint wiring Baileys + orchestrator + notifier"
```

---

### Task 10: Verify the full suite passes and document

**Files:**
- Modify: `angela-bot/README.md`

- [ ] **Step 1: Run all tests**

```bash
bun test
```

Expected: all tests from Plans 1 and 2 pass.

- [ ] **Step 2: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Update `README.md` with the production startup flow**

Append to `angela-bot/README.md`:

```markdown
## Run in production (Plan 2 complete)

    bun run migrate
    bun run start

First start prints a QR — scan it with WhatsApp Linked Devices on the
Transfer Vital phone. Auth state persists in `./auth_state/` for next runs.

### Admin commands (from Mildred's own WhatsApp)

- `/resume +573001112222` — re-enable Angela for a specific customer after manual handling
- `/status` — show pedidos pendientes count

### Notifications

Order captures and handoffs are sent to Mildred's own number (Saved Messages).

### Anti-ban precautions

- Typing delays scale with message length (1.5–5s)
- Composing/paused presence updates around each message
- `markOnlineOnConnect: false` so the bot doesn't change Mildred's online status
- Never sends the same message twice in a row (orchestrator never repeats)
- Never replies unless the customer wrote first
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs(angela): document production startup and admin commands"
```

---

## Self-review checklist for this plan

1. **Spec coverage:** § 5 notification format ✓ (Task 5), § 5 admin `/resume` ✓ (Task 6), § 5 handoff message text ✓ (Plan 1 Task 18), § 6 anti-ban mitigations ✓ (Task 4 + main.ts settings). § 6 GA4 + reports and § 7 hosting are Plan 3.
2. **All tests pass:** including Plan 1 suite.
3. **Real WhatsApp pairing succeeds** and Angela replies with delay.
4. **Admin commands work** from Mildred's own number.
5. **No placeholders** in code. Mildred's phone is required via `MILDRED_PHONE_E164` env var.

## What Plan 3 will cover

- GA4 Measurement Protocol hook for `order_captured` (closes the funnel from transfervital.com)
- Weekly KPI report CLI (KPIs from spec § 6)
- Dockerfile + Fly.io config + deployment runbook
- SQLite backup automation (encrypted snapshots)
- Production smoke tests
