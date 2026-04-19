const http = require('http');
const path = require('path');
const express = require('express');

const { port } = require('./config');
const websocket = require('./lib/websocket');
const homeRoutes = require('./routes/home');
const pdfRoutes = require('./routes/pdf');

const app = express();
const server = http.createServer(app);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/', homeRoutes);
app.use('/pdf', pdfRoutes);

websocket.attach(server);

server.listen(port, () => {
    console.log(`doculin-node-demo listening on http://localhost:${port}`);
});
