// ============================================================
// EAGLEVISION CLOUDBOARD — WEBSOCKET CLIENT
// ============================================================
// Thin wrapper around the browser's native WebSocket with:
//   • Automatic reconnect with exponential backoff + jitter
//   • Message routing by `type` field
//   • Connection state listeners (connecting | open | closed)
//   • Clean destroy() that stops reconnection
//
// Usage:
//   import { socketService } from './socket.js';
//
//   const unsub = socketService.on('status', (msg) => { ... });
//   socketService.onState((state) => { ... });   // 'connecting'|'open'|'closed'
//   socketService.connect();
//
//   // later, on page unmount:
//   socketService.destroy();
//
// Derived URL: API_BASE_URL with https→wss, http→ws, + /ws
// ============================================================

import { API_BASE_URL } from '../config/constants.js';


// ============================================================
// CONFIG
// ============================================================
const RECONNECT_BASE_MS   = 1000;       // 1s first retry
const RECONNECT_MAX_MS    = 30_000;     // cap at 30s
const RECONNECT_JITTER_MS = 1000;       // random 0–1s added to each delay
const WS_PATH             = '/ws';


// ============================================================
// URL DERIVATION
// ============================================================
function deriveWsUrl() {
  // https://api.example.com → wss://api.example.com/ws
  // http://localhost:5000   → ws://localhost:5000/ws
  const wsScheme = API_BASE_URL.startsWith('https://') ? 'wss://'
                 : API_BASE_URL.startsWith('http://')  ? 'ws://'
                 : 'wss://';
  const host = API_BASE_URL.replace(/^https?:\/\//, '');
  return `${wsScheme}${host}${WS_PATH}`;
}


// ============================================================
// SERVICE
// ============================================================
class SocketService {
  constructor() {
    this.ws            = null;
    this.url           = deriveWsUrl();
    this.state         = 'closed';       // 'connecting' | 'open' | 'closed'
    this.attempt       = 0;
    this.reconnectTimer = null;
    this.shouldRun     = false;

    // Listeners: type → Set<fn>
    this.listeners = new Map();          // 'snapshot' | 'status' | 'tick'
    // Connection state listeners: Set<fn>
    this.stateListeners = new Set();
  }


  // ---------- Lifecycle ----------

  /** Begin connecting (or no-op if already connected). */
  connect() {
    if (this.shouldRun) return;
    this.shouldRun = true;
    this._open();
  }

  /** Close the socket and stop reconnecting. */
  destroy() {
    this.shouldRun = false;
    this._clearReconnect();
    if (this.ws) {
      try { this.ws.close(1000, 'Client closing'); } catch (_) {}
      this.ws = null;
    }
    this._setState('closed');
  }


  // ---------- Subscribe ----------

  /**
   * Register a listener for a specific message type.
   * Returns an unsubscribe function.
   *
   * @example
   *   const off = socketService.on('status', msg => console.log(msg));
   *   off();  // later
   */
  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.listeners.get(type)?.delete(fn);
  }

  /**
   * Register a listener for connection state changes.
   * Called immediately with the current state, then on each transition.
   * Returns an unsubscribe function.
   */
  onState(fn) {
    this.stateListeners.add(fn);
    try { fn(this.state); } catch (_) {}
    return () => this.stateListeners.delete(fn);
  }

  /** Current connection state: 'connecting' | 'open' | 'closed' */
  getState() {
    return this.state;
  }


  // ---------- Internals ----------

  _setState(next) {
    if (this.state === next) return;
    this.state = next;
    for (const fn of this.stateListeners) {
      try { fn(next); } catch (err) {
        console.warn('[socket] state listener threw:', err.message);
      }
    }
  }

  _emit(type, payload) {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const fn of set) {
      try { fn(payload); } catch (err) {
        console.warn(`[socket] ${type} listener threw:`, err.message);
      }
    }
  }

  _open() {
    this._setState('connecting');

    let ws;
    try {
      ws = new WebSocket(this.url);
    } catch (err) {
      console.warn('[socket] constructor failed:', err.message);
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.attempt = 0;                 // reset backoff
      this._setState('open');
    });

    ws.addEventListener('message', (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (_) {
        return;                         // ignore malformed
      }
      if (!msg || typeof msg.type !== 'string') return;
      this._emit(msg.type, msg);

      // Convenience: 'snapshot' also fires 'status' for each target so
      // page code can share one status handler.
      if (msg.type === 'snapshot' && msg.targets) {
        for (const target of Object.values(msg.targets)) {
          this._emit('status', {
            type: 'status',
            target,
            before: null,
            after: target.status,
            ts: msg.ts,
          });
        }
      }
    });

    ws.addEventListener('close', (event) => {
      this.ws = null;
      this._setState('closed');
      if (this.shouldRun && event.code !== 1000) {
        this._scheduleReconnect();
      }
    });

    ws.addEventListener('error', () => {
      // The 'close' event will fire next; nothing to do here
      // except avoid an unhandled rejection.
    });
  }

  _scheduleReconnect() {
    this._clearReconnect();
    if (!this.shouldRun) return;

    this.attempt += 1;
    const base   = Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** (this.attempt - 1));
    const jitter = Math.random() * RECONNECT_JITTER_MS;
    const delay  = base + jitter;

    console.log(`[socket] reconnecting in ${Math.round(delay)}ms (attempt ${this.attempt})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldRun) this._open();
    }, delay);
  }

  _clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}


// ============================================================
// SINGLETON EXPORT
// ============================================================
// The app uses one socket for all pages. Pages call connect() on
// mount and destroy() on unmount — the service ref-counts internally
// via shouldRun, so rapid mount/unmount cycles don't thrash.
export const socketService = new SocketService();
