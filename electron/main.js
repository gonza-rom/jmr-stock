const { app, BrowserWindow, Menu } = require('electron');
const isDev = require('electron-is-dev');
const { startServer, stopServer } = require('./server');

let mainWindow;

async function createWindow() {
  if (!isDev) {
    await startServer();
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'JMR Stock - Sistema de Control de Inventario',
  });

  mainWindow.loadURL('http://localhost:3000');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopServer();
  app.quit();
});