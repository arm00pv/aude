const express = require('express');
const bodyParser = require('body-parser');
const simpleGit = require('simple-git');
const fs = require('fs');
const crypto = require('crypto');
const { execFile } = require('child_process');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');
const SAFE_BASE_PATH = path.resolve(__dirname, 'deployments');

// In-memory store for app configurations
let appsConfig = [];
const deploying = new Set();

// Helper function to read the database
const readDb = () => {
    if (fs.existsSync(DB_PATH)) {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        appsConfig = JSON.parse(data);
    } else {
        fs.writeFileSync(DB_PATH, '[]', 'utf8');
        appsConfig = [];
    }
};

// Helper function to write to the database
const writeDb = () => {
    fs.writeFileSync(DB_PATH, JSON.stringify(appsConfig, null, 2), 'utf8');
};

// Initial read of the database
readDb();

app.set('view engine', 'ejs');

app.use(bodyParser.json({
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// UI routes
app.get('/', (req, res) => {
    res.render('index', { apps: appsConfig });
});

app.post('/add-app', (req, res) => {
    const { github_url, path: appPath, user, secret, postDeployCommand } = req.body;
    const newApp = { id: Date.now().toString(), github_url, path: appPath, user, secret, postDeployCommand };
    appsConfig.push(newApp);
    writeDb();
    res.redirect('/');
});

app.post('/delete-app/:id', (req, res) => {
    appsConfig = appsConfig.filter(app => app.id !== req.params.id);
    writeDb();
    res.redirect('/');
});

// Webhook signature verification
const verifySignature = (req, res, next) => {
    const repoUrl = req.body.repository?.html_url;
    if (!repoUrl) {
        return res.status(400).send('Payload missing repository.html_url');
    }

    const appConfig = appsConfig.find(app => app.github_url === repoUrl);
    if (!appConfig) {
        return res.status(404).send(`No configuration found for repository: ${repoUrl}`);
    }

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

    next();
};

// Deployment logic
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

        const resolvedPath = path.resolve(SAFE_BASE_PATH, appConfig.path);
        if (!resolvedPath.startsWith(SAFE_BASE_PATH)) {
            throw new Error(`Invalid path: ${appConfig.path}. Path must be within ${SAFE_BASE_PATH}`);
        }
        if (!fs.existsSync(SAFE_BASE_PATH)) {
            fs.mkdirSync(SAFE_BASE_PATH, { recursive: true });
        }


        if (!fs.existsSync(resolvedPath)) {
            console.log(`Cloning ${repoUrl} into ${resolvedPath}`);
            await git.clone(repoUrl, resolvedPath);
        } else {
            console.log(`Pulling latest changes for ${repoUrl} into ${resolvedPath}`);
            await git.cwd(resolvedPath).pull();
        }
        console.log(`Deployment of ${repoUrl} successful.`);

        if (appConfig.postDeployCommand) {
            console.log(`Executing post-deployment command for ${repoUrl}: ${appConfig.postDeployCommand}`);
            const [command, ...args] = appConfig.postDeployCommand.split(' ');
            execFile(command, args, { cwd: resolvedPath }, (err, stdout, stderr) => {
                if (err) {
                    console.error(`Post-deployment command for ${repoUrl} failed:`, err);
                    return;
                }
                console.log(`Post-deployment command output for ${repoUrl}:\n${stdout}`);
            });
        }
    } catch (error) {
        console.error(`Deployment of ${repoUrl} failed:`, error);
    } finally {
        deploying.delete(repoUrl);
        console.log(`Finished deployment process for ${repoUrl}. Lock released.`);
    }
}

// Webhook listener
app.post('/webhook', verifySignature, (req, res) => {
    const { appConfig } = req;

    if (req.body.ref === 'refs/heads/main' || req.body.ref === 'refs/heads/master') {
        console.log(`Push event for ${appConfig.github_url} received. Queueing deployment.`);
        deploy(appConfig);
        res.status(202).send('Webhook received and deployment queued.');
    } else {
        res.status(200).send('Webhook received, but no action taken.');
    }
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});