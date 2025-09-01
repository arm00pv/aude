const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
const port = <%= PORT %>;

const config = {
  github_url: '<%= GITHUB_URL %>',
  path: '<%= PATH %>',
  user: '<%= USER %>'
};

async function deploy() {
  console.log(`Deploying as user: ${config.user}`);
  const git = simpleGit();
  try {
    if (fs.existsSync(config.path)) {
      console.log(`Pulling latest changes for ${config.github_url} into ${config.path}`);
      await git.cwd(config.path).pull();
    } else {
      console.log(`Cloning ${config.github_url} into ${config.path}`);
      await git.clone(config.github_url, config.path);
    }
    console.log('Deployment successful.');
  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  console.log('Webhook received!');
  if (req.body.ref === 'refs/heads/main' || req.body.ref === 'refs/heads/master') {
    console.log('Push event to main/master branch detected. Starting deployment.');
    deploy();
    res.status(200).send('Webhook received and deployment started.');
  } else {
    console.log('Webhook received, but not a push to the main/master branch.');
    res.status(200).send('Webhook received, but no action taken.');
  }
});

app.listen(port, () => {
  console.log(`Deployment script for ${config.github_url} listening at http://localhost:${port}`);
});
