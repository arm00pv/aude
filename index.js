const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/generate-script', (req, res) => {
    const { apps } = req.body;

    if (!apps || !Array.isArray(apps)) {
        return res.status(400).send('Invalid input: "apps" must be an array.');
    }

    // Sanitize the paths and include the secret
    const sanitizedApps = apps.map(app => ({
        github_url: app.github_url,
        path: app.path.replace(/\.\.\//g, ''),
        user: app.user,
        secret: app.secret
    }));

    fs.readFile(path.join(__dirname, 'script-template.js'), 'utf8', (err, template) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading script template');
        }

        const script = template
            .replace('<%= APPS_CONFIG %>', JSON.stringify(sanitizedApps, null, 2));

        const fileName = 'deploy-all-apps.js';

        res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
        res.setHeader('Content-type', 'application/javascript');

        res.send(script);
    });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
