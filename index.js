const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/generate-script', (req, res) => {
    const { github_url, path: server_path, user, port: app_port } = req.body;

    // Sanitize the path to prevent path traversal
    const sanitized_path = server_path.replace(/\.\.\//g, '');

    fs.readFile('script-template.js', 'utf8', (err, template) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading script template');
        }

        const script = template
            .replace(/<%= GITHUB_URL %>/g, github_url)
            .replace(/<%= PATH %>/g, sanitized_path)
            .replace(/<%= USER %>/g, user)
            .replace(/<%= PORT %>/g, app_port);

        const repoName = github_url.split('/').pop().replace('.git', '');
        const fileName = `deploy-${repoName}.js`;

        res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-type', 'application/javascript');

        res.send(script);
    });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
