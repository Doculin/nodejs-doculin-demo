const express = require('express');
const doculin = require('../lib/doculin');
const { publish } = require('../lib/pubsub');

const router = express.Router();

router.post('/generate', async (req, res) => {
    const html = req.body.html;
    if (!html) return res.status(400).json({ error: 'html is required' });

    try {
        const callbackUrl = `${req.protocol}://${req.get('host')}/pdf/callback`;
        const { status, data } = await doculin.generate({ html, callbackUrl });
        res.status(status).json(data);
    } catch (err) {
        console.error('generate failed:', err);
        res.status(502).json({ error: 'Failed to reach Doculin' });
    }
});

router.post('/callback', (req, res) => {
    const { job_id: jobId, status } = req.body || {};
    if (status === 'completed' && jobId) {
        publish(jobId, {
            status: 'completed',
            pdf_url: `/pdf/download/${jobId}`,
        });
    }
    res.send('OK');
});

router.get('/status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    try {
        const { status, data } = await doculin.getStatus(jobId);
        if (data && data.status === 'completed') {
            data.pdf_url = `/pdf/download/${jobId}`;
        }
        res.status(status).json(data);
    } catch (err) {
        console.error('status failed:', err);
        res.status(502).json({ error: 'Failed to reach Doculin' });
    }
});

router.get('/download/:jobId', async (req, res) => {
    try {
        const pdf = await doculin.getPdf(req.params.jobId);
        if (!pdf) return res.status(404).send('PDF not found');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
        res.send(pdf);
    } catch (err) {
        console.error('download failed:', err);
        res.status(502).send('Failed to reach Doculin');
    }
});

module.exports = router;
