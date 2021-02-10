import {app, ipcMain, ipcRenderer, Menu, Tray, nativeImage} from "electron";
import {createCapacitorElectronApp} from "@capacitor-community/electron";

const AutoLaunch = require('auto-launch');
const path = require('path');

let autoLaunch: any;
// The MainWindow object can be accessed via myCapacitorApp.getMainWindow()
const myCapacitorApp = createCapacitorElectronApp({mainWindow: {windowOptions: {frame: false}}});
let tray = null;
let startMinimised: boolean;
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some Electron APIs can only be used after this event occurs.
app.on("ready", () => {
    myCapacitorApp.init();

    autoLaunch = new AutoLaunch({
        name: 'Idle Miner',
        path: process.env.PORTABLE_EXECUTABLE_FILE
    });

    let mainWindow = myCapacitorApp.getMainWindow();
    if (mainWindow !== null) {
        mainWindow.on('restore', () => {
            mainWindow.setSkipTaskbar(false)
        })

        mainWindow.on('minimize', () => {
            mainWindow.setSkipTaskbar(true)
        })
    }
    buildTray();

    setTimeout(check, 500);
});

const check = () => {
    let mainWindow = myCapacitorApp.getMainWindow();
    if (mainWindow !== null) {
        mainWindow.setMenuBarVisibility(false);
        mainWindow.webContents.on("devtools-opened", () => {
            myCapacitorApp.getMainWindow().webContents.closeDevTools();
        });
    } else {
        setTimeout(check, 500);
    }
};

const buildTray = () => {
    const iconPath = path.join(__dirname, 'trayIcon.ico');
    tray = new Tray(nativeImage.createFromPath(iconPath));
    const trayMenu = Menu.buildFromTemplate([
        {
            label: "Show",
            click: () => {
                myCapacitorApp.getMainWindow().restore()
            }
        },
        {
            label: "Quit",
            role: 'quit'
        }
    ])
    tray.setContextMenu(trayMenu);
    tray.setIgnoreDoubleClickEvents(true);
    tray.on("click", function () {
        if (myCapacitorApp.getMainWindow().isMinimized()) {
            myCapacitorApp.getMainWindow().restore();
        }
    })

}

// Quit when all windows are closed.
app.on("window-all-closed", function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on('before-quit', () => {
    ipcRenderer.send("exit");
    myCapacitorApp.getMainWindow().removeAllListeners('close');
    myCapacitorApp.getMainWindow().close();
});

app.on("activate", function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (myCapacitorApp.getMainWindow().isDestroyed()) myCapacitorApp.init();
});

// Define any IPC or other custom functionality below here
ipcMain.on("autoLaunchOn", (event, args) => {
    autoLaunch.isEnabled().then((isEnabled) => {
        if (!isEnabled) {
            autoLaunch.enable();
        }
    });
});

ipcMain.on("autoLaunchOff", (event, args) => {
    autoLaunch.isEnabled().then((isEnabled) => {
        if (isEnabled) {
            autoLaunch.disable();
        }
    });
});

ipcMain.on("isAutoLaunch", (event, args) => {
    autoLaunch.isEnabled().then((isEnabled) => {
        if (isEnabled) {
            event.sender.send("autoLaunchEnabled");
        } else {
            event.sender.send("autoLaunchDisabled");
        }
    });
});
ipcMain.on("startMinimisedEnabled", (event, args) => {
    myCapacitorApp.getMainWindow().minimize()
});

ipcMain.on("closeApp", (event, args) => {
    app.quit();
});

ipcMain.on("minimiseApp", (event, args) => {
    myCapacitorApp.getMainWindow().minimize();
});
