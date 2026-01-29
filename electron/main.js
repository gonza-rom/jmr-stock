const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function startNextServer() {
  return new Promise((resolve, reject) => {
    const isDev = !app.isPackaged;
    
    if (isDev) {
      // En desarrollo, asume que npm run dev está corriendo
      setTimeout(resolve, 1000);
      return;
    }

    // En producción, inicia el servidor Next.js empaquetado
    const serverPath = path.join(process.resourcesPath, 'app', '.next', 'standalone', 'server.js');
    const appPath = path.join(process.resourcesPath, 'app');
    
    serverProcess = spawn('node', [serverPath], {
      cwd: appPath,
      env: {
        ...process.env,
        PORT: '3000',
        NODE_ENV: 'production'
      },
      stdio: 'inherit'
    });

    serverProcess.on('error', (err) => {
      console.error('Error al iniciar servidor:', err);
      reject(err);
    });

    // Dar tiempo al servidor para iniciar
    setTimeout(resolve, 3000);
  });
}

async function createWindow() {
  try {
    await startNextServer();
  } catch (err) {
    console.error('No se pudo iniciar el servidor:', err);
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'JMR Stock - Sistema de Control de Inventario',
    icon: path.join(__dirname, '../public/window.svg')
  });

  // Cargar la aplicación
  const isDev = !app.isPackaged;
  const url = isDev ? 'http://localhost:3000' : 'http://localhost:3000';
  
  mainWindow.loadURL(url);

  // Abrir DevTools solo en desarrollo
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});