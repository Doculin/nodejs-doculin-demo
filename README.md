# Doculin Node Demo — Express + WebSocket

A Node.js demo of the [Doculin PDF API](https://doculin.com). Click "View as PDF", the page
HTML is sent to Doculin, the browser receives a real-time callback over a WebSocket, then opens
the rendered PDF in a new tab.

> **See also:** [Symfony version](https://github.com/Doculin/symfony-doculin-async-pdf) — same
> flow, implemented with Mercure + SSE instead of WebSockets. The architectural difference
> between the two is intentional and explained below.

## Stack

- Express 4
- `ws` for WebSockets
- EJS views
- Stimulus 3 via `esm.sh` importmap (no bundler)

## How the real-time flow works

```
Browser          Express             Doculin
   |                |                   |
   |-- POST /generate→|                 |
   |                |-- POST /api/gen → |
   |                |←── { job_id } ─── |
   |←── { job_id } ─|                  |
   |── open WebSocket (?jobId=<id>) ──→ |
   |                | map[jobId]=socket |
   |                |   ←─ callback ─── |
   |                |── push to socket  |
   |←── WS message  |                  |
   |── open PDF      |                  |
```

1. The browser POSTs the page HTML to `/pdf/generate`.
2. The server forwards it to Doculin with a `callback` URL pointing to `/pdf/callback`, then returns `{ job_id }` immediately.
3. The browser opens a WebSocket connection tagged with that `job_id`. The server registers it in an in-memory map: `jobId → [socket, ...]`.
4. Doculin finishes rendering and POSTs to `/pdf/callback`. The server looks up all sockets registered for that `job_id` and pushes `{ status: "completed", pdf_url }` to each.
5. The browser receives the message, closes the socket, and opens the PDF in a new tab.

No polling. No external pub/sub hub.

## Why WebSockets instead of Mercure or SSE

Node.js's event loop handles thousands of concurrent open connections cheaply — a WebSocket
connection held open while waiting for a callback costs almost nothing. This means the entire
pub/sub layer can live in-process as a plain `Map`, with no external infrastructure required.

This is a runtime characteristic of Node.js that doesn't translate to PHP. The
[Symfony version](https://github.com/Doculin/symfony-doculin-async-pdf) of this demo uses
Mercure for exactly this reason — PHP-FPM workers must be released promptly and cannot hold
connections open on behalf of the browser.

## Security model

> **This is a demo.** The WebSocket endpoint does not authenticate subscribers.

In this demo, any client that knows a `job_id` can subscribe to its completion event. For a
production implementation you should verify on the WebSocket upgrade request that the connecting
user is the one who originally requested the job — for example by checking a signed token passed
as a query parameter or cookie.

## Single-instance limitation

The `jobId → sockets` map lives in process memory. This means:

- **The server must be single-instance.** If you deploy behind a load balancer with multiple
  Node processes, the WebSocket connection and the Doculin callback will likely hit different
  instances, and the push will never reach the browser.
- For a multi-instance production deployment, replace the in-memory map with a shared pub/sub
  layer such as Redis Pub/Sub, and broadcast from the callback handler to all instances.

This is a deliberate trade-off for demo simplicity. It is not a limitation of the
Doculin API — it is a consequence of in-process state.

## Production considerations

| Concern                 | This demo                 | Production recommendation                          |
| ----------------------- | ------------------------- | -------------------------------------------------- |
| Multi-instance          | ❌ Broken — in-memory map | Replace map with Redis Pub/Sub                     |
| WebSocket auth          | ❌ None                   | Verify signed token on upgrade request             |
| Callback authentication | None                      | Verify Doculin's HMAC signature on `/pdf/callback` |
| Reverse proxy           | Extra config needed       | Ensure `/ws` upgrades are forwarded (see Notes)    |

## Setup

```bash
npm install
cp .env.example .env
# Add your DOCULIN_API_KEY to .env
npm start
```

Open http://localhost:3001.

## Routes

| Method | Path                   | Purpose                                                       |
| ------ | ---------------------- | ------------------------------------------------------------- |
| GET    | `/`                    | Demo page                                                     |
| POST   | `/pdf/generate`        | Forwards HTML to Doculin, returns `{ job_id }`                |
| POST   | `/pdf/callback`        | Doculin → server. Pushes completion to WebSocket subscribers. |
| GET    | `/pdf/status/:jobId`   | Proxies Doculin status; adds `pdf_url` when completed         |
| GET    | `/pdf/download/:jobId` | Streams the rendered PDF to the browser                       |
| WS     | `/ws?jobId=<id>`       | Subscribe to completion events for a single job               |

## Notes

- Requires Node 18+ (uses the built-in `fetch`).
- Behind a reverse proxy (nginx, Caddy), ensure `/ws` connections are upgraded to WebSocket protocol — e.g. for nginx: `proxy_http_version 1.1; proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`
