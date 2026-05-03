const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

// Build output: angular.json → outputPath "dist/handy-tunisia-admin"
const distPath = path.join(__dirname, 'dist', 'handy-tunisia-admin');

app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`SNAY3I admin serving ${distPath} at http://${HOST}:${PORT}`);
});
