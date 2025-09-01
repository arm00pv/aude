# Multi-App Auto Deployer Script Generator

This application generates a single, all-in-one Node.js script for auto-deployment of multiple applications from GitHub.

## How to use

### 1. Start the Generator Application

First, you need to start the main application that will generate the deployment script.

```bash
# Install dependencies
npm install

# Start the application
npm start
```

The application will be running at `http://localhost:3000`.

### 2. Generate the All-in-One Deployment Script

1.  Open your web browser and go to `http://localhost:3000`.
2.  You will see a form to configure your first application.
3.  Click the "Add App" button to add more application configurations.
4.  For each application, fill in the details:
    *   **GitHub Repository URL:** The URL of the repository you want to deploy.
    *   **Server Path:** The absolute path on your server where the repository should be cloned/pulled.
    *   **User:** The user that will be used to run the deployment commands (for logging purposes).
    *   **Webhook Secret:** A secret string that will be used to secure your webhook. This should match the secret you configure in the GitHub UI.
5.  When you have configured all your applications, click "Generate All-in-One Script".
6.  Your browser will download the generated script (`deploy-all-apps.js`).

### 3. Run the Deployment Script on Your Server

1.  Copy the generated `deploy-all-apps.js` script to your deployment server.
2.  Make sure you have Node.js and the necessary dependencies (`express`, `body-parser`, `simple-git`) installed on your server. You can install them by creating a `package.json` and running `npm install`.
3.  Run the script:
    ```bash
    node deploy-all-apps.js
    ```
4.  The deployment script will start a single web server on port 3001, listening for webhooks for all your configured applications.

### Reliability Features

The generated script includes a locking mechanism to prevent issues with rapid, concurrent webhook events. If a deployment for a specific application is already in progress, any new webhooks for that same application will be safely ignored until the current deployment is complete. This ensures stability and prevents git repository corruption.

### 4. Set up the GitHub Webhooks

For **each** of your configured repositories, you need to set up a webhook.

1.  Go to the GitHub repository's settings page.
2.  Go to "Webhooks" and click "Add webhook".
3.  For "Payload URL", enter the URL of your deployment server and the webhook endpoint of your script (e.g., `http://<your-server-ip>:3001/webhook`).
4.  For "Content type", select "application/json".
5.  For "Secret", enter the same secret string you used when generating the script. This is highly recommended for security.
6.  For "Which events would you like to trigger this webhook?", select "Just the push event.".
7.  Click "Add webhook".

Now, whenever you push to the `main` or `master` branch of any of your configured repositories, GitHub will send a webhook to your single deployment script, and the script will automatically find the correct configuration and deploy the application.
