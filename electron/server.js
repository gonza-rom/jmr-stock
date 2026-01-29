const { spawn } = require('child_process');
const path = require('path');
const isDev = require('electron-is-dev');

let serverProcess = null;

async function startServer() {
  if (isDev) {
    // En desarrollo asume que npm run dev está corriendo
    return;
  }

  return new Promise((resolve) => {
    const serverPath = path.join(
      process.resourcesPath,
      '.next/standalone/server.js'
    );

    serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, PORT: '3000' }
    });

    setTimeout(resolve, 3000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
  }
}

module.exports = { startServer, stopServer };