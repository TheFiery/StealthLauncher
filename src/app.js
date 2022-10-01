const { app, ipcMain } = require('electron');
const { Microsoft } = require('minecraft-java-core');
const { autoUpdater } = require('electron-updater')

const path = require('path');
const fs = require('fs');

const UpdateWindow = require("./assets/js/windows/updateWindow.js");
const MainWindow = require("./assets/js/windows/mainWindow.js");

const clientId = '1005825047052697640';
const DiscordRPC = require('discord-rpc');
const RPC = new DiscordRPC.Client({ transport: 'ipc' });

let dev = process.env.NODE_ENV === 'dev';

if (dev) {
    let appPath = path.resolve('./AppData/Launcher').replace(/\\/g, '/');
    if(!fs.existsSync(appPath)) fs.mkdirSync(appPath, { recursive: true });
    app.setPath('userData', appPath);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.whenReady().then(() => {
        UpdateWindow.createWindow();
    });
}

ipcMain.on('update-window-close', () => UpdateWindow.destroyWindow())
ipcMain.on('update-window-dev-tools', () => UpdateWindow.getWindow().webContents.openDevTools())
ipcMain.on('main-window-open', () => MainWindow.createWindow())
ipcMain.on('main-window-dev-tools', () => MainWindow.getWindow().webContents.openDevTools())
ipcMain.on('main-window-close', () => MainWindow.destroyWindow())
ipcMain.on('main-window-progress', (event, options) => MainWindow.getWindow().setProgressBar(options.DL / options.totDL))
ipcMain.on('main-window-progress-reset', (event, options) => MainWindow.getWindow().setProgressBar(options.DL / options.totDL))
ipcMain.on('main-window-minimize', () => MainWindow.getWindow().minimize())

ipcMain.on('main-window-maximize', () => {
    if (MainWindow.getWindow().isMaximized()) {
        MainWindow.getWindow().unmaximize();
    } else {
        MainWindow.getWindow().maximize();
    }
})

ipcMain.on('main-window-hide', () => MainWindow.getWindow().hide())
ipcMain.on('main-window-show', () => MainWindow.getWindow().show())

ipcMain.handle('Microsoft-window', async(event, client_id) => {
    return await new Microsoft(client_id).getAuth();
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('update-app', () => {
    autoUpdater.checkForUpdates();
})

autoUpdater.on('update-available', () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('updateAvailable');
});

autoUpdater.on('update-not-available', () => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('update-not-available');
});

autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall();
});

autoUpdater.on('download-progress', (progress) => {
    const updateWindow = UpdateWindow.getWindow();
    if (updateWindow) updateWindow.webContents.send('download-progress', progress);
})

DiscordRPC.register(clientId);

async function setActivity() {
    if (!RPC) return;
    RPC.setActivity({
        details: `Viens avec nous !`,
        state: `Joue à Minecraft moddé`,
        startTimestamp: Date.now(),
        largeImageKey: `large_image`,
        largeImageText: `Minecraft Moddé`,
        smallImageKey: `small_image`,
        smallImageText: `+ 50 Mods`,
        instance: false,
        buttons: [
            {
                label: `Rejoindre le serveur discord!`,
                url: `https://discord.gg/vDb42mqssH`,
            },
            {
                label: `Télécharger le launcher`,
                url: `https://github.com/TheFiery/StealthLauncher/releases/tag/1.1.1`,
            }
        ]
    });
};

RPC.on('ready', async () =>  {
    setActivity();

    setInterval(() => {
        setActivity();
    }, 3000 * 1000);
});

RPC.login({ clientId}).catch(err =>  console.error(err));