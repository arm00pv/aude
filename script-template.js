const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const port = 3001; // A default port for the main listener

const appsConfig = <%= APPS_CONFIG %>;

async function deploy(appConfig) {
  console.log(`Deploying ${appConfig.github_url} as user: ${appConfig.user}`);
  const git = simpleGit();
  try {
    if (fs.existsSync(appConfig.path)) {
      console.log(`Pulling latest changes for ${appConfig.github_url} into ${appConfig.path}`);
      await git.cwd(appConfig.path).pull();
    } else {
      console.log(`Cloning ${appConfig.github_url} into ${appConfig.path}`);
      await git.clone(appConfig.github_url, appConfig.path);
    }
    console.log(`Deployment of ${appConfig.github_url} successful.`);
  } catch (error) {
    console.error(`Deployment of ${appConfig.github_url} failed:`, error);
  }
}

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  console.log('Webhook received!');
  const repoUrl = req.body.repository.html_url;

  if (!repoUrl) {
    return res.status(400).send('Repository URL not found in webhook payload.');
  }

  const appConfig = appsConfig.find(app => app.github_url === repoUrl);

  if (appConfig) {
    if (req.body.ref === 'refs/heads/main' || req.body.ref === 'refs/heads/master') {
      console.log(`Push event to main/master branch for ${repoUrl}. Starting deployment.`);
      deploy(appConfig);
      res.status(200).send('Webhook received and deployment started.');
    } else {
      console.log(`Webhook for ${repoUrl} received, but not a push to the main/master branch.`);
      res.status(200).send('Webhook received, but no action taken.');
    }
  } else {
    console.log(`No matching app configuration found for ${repoUrl}.`);
    res.status(404).send('No configuration found for this repository.');
  }
});

app.listen(port, () => {
  console.log(`Multi-app deployment script listening at http://localhost:${port}`);
});
