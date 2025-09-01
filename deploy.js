const simpleGit = require('simple-git');
const fs = require('fs');
const { exec } = require('child_process');

async function deploy(appConfig) {
  const { path, github_url } = appConfig;
  const git = simpleGit();

  try {
    if (fs.existsSync(path)) {
      console.log(`Pulling latest changes for ${github_url} into ${path}`);
      await git.cwd(path).pull();
    } else {
      console.log(`Cloning ${github_url} into ${path}`);
      await git.clone(github_url, path);
    }

    console.log('Deployment successful.');

    // Placeholder for running build commands
    console.log('Running build commands...');
    // For example:
    // exec('npm install && npm run build', { cwd: path }, (err, stdout, stderr) => {
    //   if (err) {
    //     console.error(`exec error: ${err}`);
    //     return;
    //   }
    //   console.log(`stdout: ${stdout}`);
    //   console.error(`stderr: ${stderr}`);
    // });

  } catch (error) {
    console.error('Deployment failed:', error);
  }
}

module.exports = deploy;
