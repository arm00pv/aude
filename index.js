const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const deploy = require('./deploy');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  fs.readFile('config.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      // If the file doesn't exist, render the page with an empty array
      if (err.code === 'ENOENT') {
        return res.render('index', { config: [] });
      }
      return res.status(500).send('Error reading config file');
    }
    try {
      const config = JSON.parse(data);
      res.render('index', { config: config });
    } catch (parseErr) {
      console.error(parseErr);
      res.status(500).send('Error parsing config file');
    }
  });
});

app.post('/config', (req, res) => {
    const newApp = {
        github_url: req.body.github_url,
        path: req.body.path,
        user: req.body.user
    };

    fs.readFile('config.json', 'utf8', (err, data) => {
        let config = [];
        if (err && err.code !== 'ENOENT') {
            console.error(err);
            return res.status(500).send('Error reading config file');
        }
        if (data) {
            try {
                config = JSON.parse(data);
            } catch (parseErr) {
                console.error(parseErr);
                return res.status(500).send('Error parsing config file');
            }
        }

        config.push(newApp);

        fs.writeFile('config.json', JSON.stringify(config, null, 2), (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Error writing config file');
            }

            res.redirect('/');
        });
    });
});

app.post('/webhook', (req, res) => {
  console.log('Webhook received!');
  // Check for the push event and branch
  if (req.body.ref === 'refs/heads/main' || req.body.ref === 'refs/heads/master') {
    const repoUrl = req.body.repository.html_url;

    if (!repoUrl) {
        return res.status(400).send('Repository URL not found in webhook payload.');
    }

    console.log(`Push event to main/master branch for repository: ${repoUrl}`);

    fs.readFile('config.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading config file');
        }

        const config = JSON.parse(data);
        const appConfig = config.find(app => app.github_url === repoUrl);

        if (appConfig) {
            console.log(`Found matching app configuration for ${repoUrl}. Starting deployment.`);
            deploy(appConfig);
            res.status(200).send('Webhook received and deployment started.');
        } else {
            console.log(`No matching app configuration found for ${repoUrl}.`);
            res.status(404).send('No configuration found for this repository.');
        }
    });
  } else {
    console.log('Webhook received, but not a push to the main/master branch.');
    res.status(200).send('Webhook received, but no action taken.');
  }
});

app.get('/docs/:appName', (req, res) => {
    const appName = req.params.appName;
    fs.readFile('config.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error reading config file');
        }
        const config = JSON.parse(data);
        const appConfig = config.find(app => {
            const urlParts = app.github_url.split('/');
            const repoName = urlParts[urlParts.length - 1];
            return repoName === appName;
        });

        if (appConfig) {
            const markdown = `# Webhook Setup Instructions for ${appName}

1. Go to your GitHub repository settings: [${appConfig.github_url}/settings/hooks](${appConfig.github_url}/settings/hooks)
2. Click "Add webhook".
3. For "Payload URL", enter: \`http://<your-server-ip>:3000/webhook\`
4. For "Content type", select "application/json".
5. For "Secret", you can leave it blank for now. We will implement secret verification later.
6. For "Which events would you like to trigger this webhook?", select "Just the push event.".
7. Click "Add webhook".
`;
            res.setHeader('Content-Type', 'text/markdown');
            res.send(markdown);
        } else {
            res.status(404).send('App not found');
        }
    });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
