# Doculin Node Demo

A Node.js demo of the Doculin PDF API. Click "View as PDF", the page HTML is sent to Doculin, the browser waits for a real-time callback, then opens the rendered PDF in a new tab.

Real-time updates are delivered over a native WebSocket — no external pub/sub hub required.

## Stack

- Express 4
- `ws` for WebSockets
- EJS views
- Stimulus 3 loaded from `esm.sh` via `<script type="importmap">` (no bundler)

## Setup

```bash
npm install
cp .env.example .env
# edit .env with your DOCULIN_API_KEY
npm start
```

Open http://localhost:3001.

## How the real-time flow works

1. Browser POSTs captured page HTML to `/pdf/generate`.
2. Server forwards to `${DOCULIN_DOMAIN}/api/generate` with a `callback` pointing to `/pdf/callback`.
3. Doculin returns `{ job_id }`. Browser opens `ws://host/ws?jobId=<id>`.
4. Server subscribes the socket under that `jobId`.
5. When Doculin finishes, it POSTs to `/pdf/callback`. Server publishes `{ status: "completed", pdf_url }` to every socket subscribed to that `jobId`.
6. Browser receives the message, closes the socket, opens the PDF.

## Routes

| Method | Path                  | Purpose                                                         |
| ------ | --------------------- | --------------------------------------------------------------- |
| GET    | `/`                   | Demo page                                                       |
| POST   | `/pdf/generate`       | Forwards HTML to Doculin, returns `{ job_id }`                  |
| POST   | `/pdf/callback`       | Doculin → us. Publishes completion to WebSocket subscribers.    |
| GET    | `/pdf/status/:jobId`  | Proxies Doculin status; adds `pdf_url` when completed           |
| GET    | `/pdf/download/:jobId`| Streams the rendered PDF back to the browser                    |
| WS     | `/ws?jobId=<id>`      | Subscribe to completion events for a single job                 |

## Notes

- Requires Node 18+ (uses the built-in `fetch`).
- If you put this behind a reverse proxy, make sure it upgrades `/ws` to WebSocket.
- No database. The app is stateless — the only in-memory state is the `jobId → sockets` map, which is fine for a single-instance demo.
