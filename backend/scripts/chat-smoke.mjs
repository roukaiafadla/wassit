// Live-chat smoke test. Plays a client, the test provider and a stranger against
// a RUNNING backend, and checks every chat event end to end.
//
//   cd backend
//   npm install --save-dev socket.io-client
//   node scripts/chat-smoke.mjs
//
// Optional env vars: API_URL (default http://localhost:5000),
// PROVIDER_EMAIL / PROVIDER_PASSWORD (a verified plumbing provider).
import { io } from "socket.io-client";

const BASE = process.env.API_URL || "http://localhost:5000";
const results = [];

function check(name, ok, extra = "") {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  (" + extra + ")" : ""}`);
}

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${data.error || ""}`);
  return data;
}

const connect = (token) =>
  new Promise((resolve, reject) => {
    const s = io(BASE, { auth: { token }, reconnection: false });
    s.on("connect", () => resolve(s));
    s.on("connect_error", (err) => reject(new Error(`socket connect failed: ${err.message}`)));
  });

const emitAck = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

// Resolves with the event payload, or null if nothing arrives in time.
// Always start waiting BEFORE triggering the action, or the event can be missed.
const waitFor = (socket, event, ms = 1500) =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const sockets = [];

async function main() {
  const n = Math.floor(Math.random() * 1e9);
  const signup = (name, prefix) =>
    api("/auth/signup", { method: "POST", body: { name, email: `${prefix}${n}@test.com`, password: "password123", role: "client" } });

  const client = await signup("Chat Client", "chatclient");
  const stranger = await signup("Chat Stranger", "chatstranger");
  const provider = await api("/auth/login", {
    method: "POST",
    body: { email: process.env.PROVIDER_EMAIL || "provider@test.com", password: process.env.PROVIDER_PASSWORD || "password123" },
  });

  const { job } = await api("/jobs", {
    method: "POST",
    token: client.token,
    body: { description: "Smoke test job for live chat", category: "plumbing", urgency: "low", latitude: 36.75, longitude: 3.06 },
  });
  const { offer } = await api("/offers", { method: "POST", token: provider.token, body: { jobId: job._id, price: 1500, etaMinutes: 20 } });
  const { conversation } = await api(`/offers/${offer._id}/accept`, { method: "PATCH", token: client.token });
  const convId = conversation._id;
  console.log(`setup ok: conversation ${convId}\n`);

  const cs = await connect(client.token);
  const ps = await connect(provider.token);
  const xs = await connect(stranger.token);
  sockets.push(cs, ps, xs);

  // --- joining ---
  const xJoin = await emitAck(xs, "chat:join", { conversationId: convId });
  check("stranger is refused on join", xJoin.ok === false, xJoin.error);
  const badJoin = await emitAck(cs, "chat:join", undefined);
  check("empty/bad payload is rejected without crashing", badJoin.ok === false, badJoin.error);
  const cJoin = await emitAck(cs, "chat:join", { conversationId: convId });
  const pJoin = await emitAck(ps, "chat:join", { conversationId: convId });
  check("client and provider can join", cJoin.ok && pJoin.ok);

  // --- sending ---
  const pMsg = waitFor(ps, "chat:message");
  const cEcho = waitFor(cs, "chat:message");
  const pNotify = waitFor(ps, "chat:notify");
  const cNotify = waitFor(cs, "chat:notify", 600);
  const sent = await emitAck(cs, "chat:send", { conversationId: convId, text: "  Hello, are you on your way?  " });
  check("send is acknowledged and text is trimmed", sent.ok && sent.message?.text === "Hello, are you on your way?");
  check("provider receives chat:message live", (await pMsg)?.message?.text === "Hello, are you on your way?");
  check("sender also receives chat:message (second tab stays in sync)", (await cEcho)?.message?._id === sent.message?._id);
  check("other person gets chat:notify for unread badges", (await pNotify)?.conversationId === convId);
  check("sender does NOT get chat:notify", (await cNotify) === null);

  // --- validation ---
  const empty = await emitAck(cs, "chat:send", { conversationId: convId, text: "   " });
  check("empty message rejected", empty.ok === false, empty.error);
  const long = await emitAck(cs, "chat:send", { conversationId: convId, text: "x".repeat(2001) });
  check("over-long message rejected", long.ok === false, long.error);
  const xSend = await emitAck(xs, "chat:send", { conversationId: convId, text: "let me in" });
  check("stranger cannot send", xSend.ok === false, xSend.error);

  // --- typing ---
  const typing = waitFor(cs, "chat:typing");
  ps.emit("chat:typing", { conversationId: convId, isTyping: true });
  const t = await typing;
  check("typing indicator reaches the other side", t?.isTyping === true && t?.userId === provider.user._id);
  const leak = waitFor(cs, "chat:typing", 600);
  xs.emit("chat:typing", { conversationId: convId, isTyping: true });
  check("stranger's typing events are ignored", (await leak) === null);

  // --- read receipts ---
  await emitAck(ps, "chat:send", { conversationId: convId, text: "Yes, 10 minutes away" });
  const receipt = waitFor(ps, "chat:read");
  const read = await emitAck(cs, "chat:read", { conversationId: convId });
  check("client marks the provider's message read", read.ok && read.count === 1, `count=${read.count}`);
  const r = await receipt;
  check("provider receives the read receipt", r?.readerId === client.user._id);
  const read2 = await emitAck(cs, "chat:read", { conversationId: convId });
  check("reading again marks nothing new", read2.ok && read2.count === 0);

  // --- persistence, via the REST endpoints from the previous commit ---
  const hist = await api(`/conversations/${convId}/messages`, { token: client.token });
  check(
    "history has both messages, oldest first",
    hist.messages.length === 2 && hist.messages[0].text.startsWith("Hello") && hist.messages[1].text.startsWith("Yes"),
    `${hist.messages.length} messages`
  );
  check("read state was saved", hist.messages[1].readAt != null && hist.messages[0].readAt == null);
  const list = await api("/conversations", { token: client.token });
  const mine = list.conversations.find((c) => c._id === convId);
  check("conversation updatedAt was bumped by new messages", mine && new Date(mine.updatedAt) > new Date(mine.createdAt));
}

try {
  await main();
} catch (err) {
  console.error("\nTEST ABORTED:", err.message);
  results.push(false);
} finally {
  sockets.forEach((s) => s.close());
}

const failed = results.filter((ok) => !ok).length;
console.log(failed === 0 ? `\nALL ${results.length} CHECKS PASSED` : `\n${failed} OF ${results.length} CHECKS FAILED`);
process.exit(failed === 0 ? 0 : 1);
