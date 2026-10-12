// ============================================================
// EAGLEVISION CLOUDBOARD — STATUS WEBSOCKET HUB
// ============================================================
// Attaches a WebSocket server to the existing HTTP server.
// One channel: /ws
//
// Protocol (server → client, JSON):
//   { type: 'snapshot', targets: {...}, ts }        — sent on connect
//   { type: 'status',   target, before, after, ts } — sent on change
//   { type: 'tick',     ts }                        — sent every 30s
//
// Protocol (client → server):
//   No messages expected. The socket is read-only.
//
// Origin policy:
//   Mirrors middleware/cors.js. Requests from unknown origins are
//   rejected during the HTTP upgrade handshake, before the socket
//   is established.
//
// Auth:
//   The cookie is sent automatically by the browser on the WS
//   handshake. We do NOT currently verify it — the /ws endpoint is
//   treated like /health: public. If you later want to gate it,
//   check req.headers.cookie for your session cookie here.
// ============================================================

const { WebSocketServer } = require('ws');
const { getPublicState } = require('../jobs/monitoringCron');


// ============================================================
// CONFIG
// ============================================================
const HEARTBEAT_INTERVAL_MS = 30_000;   // matches the cron cadence
const CLIENT_TIMEOUT_MS     = 10_000;   // terminate clients that miss pongs

// Read the same origin list your CORS middleware uses.
// Fallback matches the hardcoded list from middleware/cors.js.
const DEFAULT_ORIGINS = [
  'https://qoechtechnologies.co.ke',
  'https://www.qoechtechnologies.co.ke',
  'https://eaglevision-cloudboard.onrender.com',
];

function getAllowedOrigins() {
  const env = process.env.ALLOWED_ORIGINS;
  if (env && env.trim()) {
    return env.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return DEFAULT_ORIGINS;
}


// ============================================================
// STATE
// ============================================================
let wss = null;
let heartbeatTimer = null;

// Track liveness: each ws gets a `isAlive` flag toggled on pong.
// If we ping and the next tick arrives without a pong, we terminate.
const liveness = new WeakMap();


// ============================================================
// ORIGIN CHECK
// ============================================================
function isOriginAllowed(origin) {
  if (!origin) return false;  // no origin header = not a browser = reject

  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) return true;

  // Render preview URLs: *.onrender.com
  try {
    const host = new URL(origin).hostname;
    if (host.endsWith('.onrender.com')) return true;
  } catch (_) { /* invalid URL */ }

  return false;
}


// ============================================================
// BROADCAST
// ============================================================
function broadcast(message) {
  if (!wss) return;
  const payload = JSON.stringify(message);
  let sent = 0;
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      try {
        client.send(payload);
        sent++;
      } catch (err) {
        console.warn('[ws] send failed:', err.message);
      }
    }
  }
  return sent;
}


// ============================================================
// PUBLIC API — called from jobs/monitoringCron.js
// ============================================================

/**
 * Broadcast a state change for one target.
 * @param {object} target  — the public state shape for the target
 * @param {string} before  — previous status
 * @param {string} after   — new status
 */
function broadcastStatusChange(target, before, after) {
  return broadcast({
    type: 'status',
    target,
    before,
    after,
    ts: Date.now(),
  });
}

/**
 * Manual tick broadcast (optional — the heartbeat timer covers this).
 * Kept for symmetry with future manual triggers.
 */
function broadcastTick() {
  return broadcast({ type: 'tick', ts: Date.now() });
}


// ============================================================
// SERVER SETUP
// ============================================================
function attachStatusHub(server) {
  if (wss) return wss;

  wss = new WebSocketServer({
    server,
    path: '/ws',

    // Reject unknown origins during the HTTP upgrade, before
    // the socket is created. This mirrors the CORS middleware.
    verifyClient: ({ origin }, done) => {
      if (isOriginAllowed(origin)) return done(true);
      console.warn(`[ws] rejected connection from origin: ${origin || '(none)'}`);
      return done(false, 403, 'Forbidden');
    },
  });

  console.log('[ws] status hub attached at /ws');

  // ---------- Connection handler ----------
  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin || '(unknown)';
    console.log(`[ws] client connected (${origin}, total: ${wss.clients.size})`);

    liveness.set(ws, true);

    // 1. Send the current snapshot immediately — no waiting for
    //    the next tick or state change.
    try {
      ws.send(JSON.stringify({
        type: 'snapshot',
        targets: getPublicState(),
        ts: Date.now(),
      }));
    } catch (err) {
      console.warn('[ws] initial snapshot failed:', err.message);
    }

    // 2. Pong handling for the liveness probe
    ws.on('pong', () => liveness.set(ws, true));

    // 3. Close / error logging
    ws.on('close', () => {
      console.log(`[ws] client disconnected (total: ${wss.clients.size})`);
    });

    ws.on('error', (err) => {
      console.warn('[ws] client error:', err.message);
    });
  });


  // ---------- Heartbeat timer ----------
  // Every HEARTBEAT_INTERVAL_MS:
  //   • Broadcast a { type: 'tick' } so clients know the connection is alive
  //   • Ping every client; any client that didn't pong since the last tick
  //     is terminated (zombie cleanup)
  heartbeatTimer = setInterval(() => {
    broadcastTick();

    if (!wss) return;
    for (const ws of wss.clients) {
      if (liveness.get(ws) === false) {
        // Missed last pong — assume dead
        ws.terminate();
        continue;
      }
      liveness.set(ws, false);
      try { ws.ping(); } catch (_) { /* socket already dead */ }
    }
  }, HEARTBEAT_INTERVAL_MS);

  return wss;
}


// ============================================================
// SHUTDOWN
// ============================================================
function detachStatusHub() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  if (wss) {
    console.log('[ws] closing all client connections');
    for (const client of wss.clients) {
      try { client.close(1001, 'Server shutting down'); } catch (_) {}
    }
    wss.close(() => {
      console.log('[ws] status hub closed');
    });
    wss = null;
  }
}


// ============================================================
// EXPORT
// ============================================================
module.exports = {
  attachStatusHub,
  detachStatusHub,
  broadcastStatusChange,
  broadcastTick,
};
