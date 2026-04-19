const { WebSocketServer } = require('ws');
const { subscribe, unsubscribe } = require('./pubsub');

function attach(server) {
    const wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url, 'http://localhost');
        const jobId = url.searchParams.get('jobId');
        if (!jobId) {
            ws.close(1008, 'jobId required');
            return;
        }
        subscribe(jobId, ws);
        ws.on('close', () => unsubscribe(jobId, ws));
    });

    return wss;
}

module.exports = { attach };
