const express = require('express');
const { doculinDomain } = require('../config');

const router = express.Router();

router.get('/', (req, res) => {
    const base = `${req.protocol}://${req.get('host')}`;
    const wsBase = base.replace(/^http/, 'ws');
    res.render('home', {
        wsUrl: `${wsBase}/ws`,
        baseUrl: base,
        doculinDomain,
    });
});

module.exports = router;
