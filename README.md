# Auto Deployer Script Generator

This application generates standalone Node.js scripts for auto-deployment from GitHub.

## How to use

### 1. Start the Generator Application

First, you need to start the main application that will generate the deployment scripts.

```bash
# Install dependencies
npm install

# Start the application
npm start
```

The application will be running at `http://localhost:3000`.

### 2. Generate a Deployment Script

1.  Open your web browser and go to `http://localhost:3000`.
2.  You will see a form to generate a new deployment script.
3.  Fill in the form with your application's details:
    *   **GitHub Repository URL:** The URL of the repository you want to deploy.
    *   **Server Path:** The absolute path on your server where the repository should be cloned/pulled.
    *   **User:** The user that will be used to run the deployment commands.
4.  Click "Generate Script".
5.  Your browser will download the generated deployment script (e.g., `deploy-my-repo.js`).

### 3. Run the Deployment Script on Your Server

1.  Copy the generated script to your deployment server.
2.  Make sure you have Node.js and `simple-git` installed on your server. You can install `simple-git` globally or locally in the same directory as the script.
    ```bash
    npm install simple-git
    ```
3.  Run the script:
    ```bash
    node deploy-my-repo.js
    ```
4.  The deployment script will start a web server, usually on port 3001, listening for webhooks.

### 4. Set up the GitHub Webhook

1.  Go to your GitHub repository's settings page.
2.  Go to "Webhooks" and click "Add webhook".
3.  For "Payload URL", enter the URL of your deployment server and the webhook endpoint of your script (e.g., `http://<your-server-ip>:3001/webhook`).
4.  For "Content type", select "application/json".
5.  For "Which events would you like to trigger this webhook?", select "Just the push event.".
6.  Click "Add webhook".

Now, whenever you push to the `main` or `master` branch of your repository, GitHub will send a webhook to your deployment script, and the script will automatically pull the latest changes.
