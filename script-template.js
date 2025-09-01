const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');
const fs = require('fs');
const crypto = require('crypto');
const { exec } = require('child_process');

const app = express();
const port = 3001;

const appsConfig = <%= APPS_CONFIG %>;
const deploying = new Set();

const verifySignature = (req, res, next) => {
    const repoUrl = req.body.repository?.html_url;
    if (!repoUrl) {
        return res.status(400).send('Payload missing repository.html_url');
    }

    const appConfig = appsConfig.find(app => app.github_url === repoUrl);
    if (!appConfig) {
        return res.status(404).send(`No configuration found for repository: ${repoUrl}`);
    }

    // Attach appConfig to the request for the next middleware
    req.appConfig = appConfig;

    if (!appConfig.secret) {
        console.log(`No secret configured for ${repoUrl}. Skipping signature verification.`);
        return next();
    }

    const signatureHeader = req.get('X-Hub-Signature-256') || '';
    const hmac = crypto.createHmac('sha256', appConfig.secret);
    const digest = Buffer.from('sha256=' + hmac.update(req.rawBody).digest('hex'), 'utf8');
    const checksum = Buffer.from(signatureHeader, 'utf8');

    if (checksum.length !== digest.length || !crypto.timingSafeEqual(digest, checksum)) {
        return res.status(401).send('Request body digest did not match X-Hub-Signature-256');
    }

    return next();
};

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

app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));

app.post('/webhook', verifySignature, (req, res) => {
  const { appConfig } = req;

  if (req.body.ref === 'refs/heads/main' || req.body.ref === 'refs/heads/master') {
    console.log(`Push event for ${appConfig.github_url} received and signature verified. Queueing deployment.`);
    deploy(appConfig);
    res.status(202).send('Webhook received and deployment queued.');
  } else {
    console.log(`Webhook for ${appConfig.github_url} received, but not a push to the main/master branch.`);
    res.status(200).send('Webhook received, but no action taken.');
  }
});

app.listen(port, () => {
  console.log(`Multi-app deployment script listening at http://localhost:${port}`);
});
