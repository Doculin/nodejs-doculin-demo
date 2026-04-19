const subscribers = new Map();

function subscribe(jobId, ws) {
    if (!subscribers.has(jobId)) subscribers.set(jobId, new Set());
    subscribers.get(jobId).add(ws);
}

function unsubscribe(jobId, ws) {
    const set = subscribers.get(jobId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) subscribers.delete(jobId);
}

function publish(jobId, payload) {
    const set = subscribers.get(jobId);
    if (!set) return;
    const message = JSON.stringify(payload);
    for (const ws of set) {
        if (ws.readyState === ws.OPEN) ws.send(message);
    }
}

module.exports = { subscribe, unsubscribe, publish };
