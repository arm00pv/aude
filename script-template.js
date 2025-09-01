const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const port = 3001; // A default port for the main listener

const appsConfig = <%= APPS_CONFIG %>;
const deploying = new Set();

async function deploy(appConfig) {
  const repoUrl = appConfig.github_url;
  if (deploying.has(repoUrl)) {
    console.log(`Deployment for ${repoUrl} is already in progress. Skipping.`);
    return;
  }

  deploying.add(repoUrl);
  try {
    console.log(`Deploying ${repoUrl} as user: ${appConfig.user}`);
    const git = simpleGit();
    if (fs.existsSync(appConfig.path)) {
      console.log(`Pulling latest changes for ${repoUrl} into ${appConfig.path}`);
      await git.cwd(appConfig.path).pull();
    } else {
      console.log(`Cloning ${repoUrl} into ${appConfig.path}`);
      await git.clone(repoUrl, appConfig.path);
    }
    console.log(`Deployment of ${repoUrl} successful.`);
  } catch (error) {
    console.error(`Deployment of ${repoUrl} failed:`, error);
  } finally {
    deploying.delete(repoUrl);
    console.log(`Finished deployment process for ${repoUrl}. Lock released.`);
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
      console.log(`Push event to main/master branch for ${repoUrl}. Queueing deployment.`);
      // Don't await deploy() here, so we can send a response to GitHub immediately.
      deploy(appConfig);
      res.status(202).send('Webhook received and deployment queued.'); // 202 Accepted is more appropriate here
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
