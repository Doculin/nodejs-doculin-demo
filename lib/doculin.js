const { doculinDomain, doculinApiKey } = require('../config');

function authHeaders() {
    return { Authorization: `Bearer ${doculinApiKey}` };
}

async function generate({ html, callbackUrl }) {
    const response = await fetch(`${doculinDomain}/api/generate`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
            html,
            callback: callbackUrl,
            pdf_options: {
                format: 'A4',
                margins: { top: '0', right: '0', bottom: '0', left: '0' },
            },
        }),
    });
    return { status: response.status, data: await response.json() };
}

async function getStatus(jobId) {
    const response = await fetch(`${doculinDomain}/api/status/${jobId}`, {
        headers: authHeaders(),
    });
    return { status: response.status, data: await response.json() };
}

async function getPdf(jobId) {
    const response = await fetch(`${doculinDomain}/api/pdf/${jobId}`, {
        headers: authHeaders(),
    });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
}

module.exports = { generate, getStatus, getPdf };
