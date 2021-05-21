"use strict";

const electron = require("electron");
const { BrowserWindow, BrowserView, Menu, shell } = electron;
const path = require("path");
const url = require("url");
const windowStateKeeper = require("electron-window-state");
const fileOpenHelpers = require("../file-open-helpers");

/**
 * Firebot's main window
 * Keeps a global reference of the window object, if you don't, the window will
 * be closed automatically when the JavaScript object is garbage collected.
 *@type {Electron.BrowserWindow}
 */
exports.mainWindow = null;

/**
 * The splashscreen window.
 *@type {Electron.BrowserWindow}
 */
let splashscreenWindow;


function createMainWindow() {
    let mainWindowState = windowStateKeeper({
        defaultWidth: 1280,
        defaultHeight: 720
    });

    // Create the browser window.
    const mainWindow = new BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        minWidth: 300,
        minHeight: 50,
        icon: path.join(__dirname, "../../../gui/images/logo_transparent_2.png"),
        show: false,
        titleBarStyle: "hiddenInset",
        backgroundColor: "#1E2023",
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            nativeWindowOpen: true
        }
    });

    mainWindow.webContents.on('new-window',
        (event, _url, frameName, _disposition, options) => {
            if (frameName === 'modal') {
                // open window as modal
                event.preventDefault();
                Object.assign(options, {
                    frame: true,
                    titleBarStyle: "default",
                    parent: mainWindow,
                    width: 250,
                    height: 400,
                    javascript: false,
                    webPreferences: {
                        webviewTag: true
                    }

                });
                event.newGuest = new BrowserWindow(options);
            } else if (frameName === 'stream-preview') {
                // open window as stream-preview
                event.preventDefault();

                const accountAccess = require("../../common/account-access");
                const streamer = accountAccess.getAccounts().streamer;
                if (!streamer.loggedIn) return;

                Object.assign(options, {
                    frame: false,
                    alwaysOnTop: true,
                    titleBarStyle: "hidden",
                    backgroundColor: "#1E2023",
                    //parent: mainWindow,
                    width: 640,
                    height: 480,
                    javascript: false,
                    webPreferences: {}

                });

                const newWindow = new BrowserWindow(options);

                const view = new BrowserView();
                newWindow.setBrowserView(view);
                view.setBounds({ x: 0, y: 0, width: 640, height: 480 });
                view.setAutoResize({
                    width: true,
                    height: true
                });
                view.webContents.on('new-window', (vEvent) => {
                    vEvent.preventDefault();
                });

                view.webContents.on("dom-ready", async () => {
                    console.log(await view.webContents.insertCSS(`
                        .top-bar {
                            -webkit-app-region: drag;
                        }
                        .player-controls {
                            -webkit-app-region: no-drag !important;
                        }
                    `, { cssOrigin: "user" }));
                    view.webContents.openDevTools();
                });


                view.webContents.loadURL(`https://player.twitch.tv/?channel=${streamer.username}&parent=firebot&muted=true`);

                event.newGuest = newWindow;
            }
        });

    //set a global reference, lots of backend files depend on this being available globally
    exports.mainWindow = mainWindow;
    global.renderWindow = mainWindow;

    const frontendCommunicator = require("../../common/frontend-communicator");
    const menuTemplate = [
        {
            label: 'Edit',
            submenu: [
                {
                    role: 'cut'
                },
                {
                    role: 'copy'
                },
                {
                    role: 'paste'
                },
                {
                    role: "undo"
                },
                {
                    role: "redo"
                },
                {
                    role: "selectAll"
                }
            ]
        },
        {
            label: 'Window',
            submenu: [
                {
                    role: 'minimize'
                },
                {
                    role: 'close'
                },
                {
                    role: 'quit'
                },
                {
                    type: 'separator'
                },
                {
                    role: 'toggledevtools'
                }
            ]
        },
        {
            role: 'Help',
            submenu: [
                {
                    label: 'About',
                    click: () => {
                        frontendCommunicator.send("open-about-modal");
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the maximized or full screen state
    mainWindowState.manage(mainWindow);

    // and load the index.html of the app.
    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "../../../gui/app/index.html"),
            protocol: "file:",
            slashes: true
        })
    );

    // wait for the main window's content to load, then show it
    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow.show();
        if (splashscreenWindow) {
            splashscreenWindow.destroy();
        }

        const startupScriptsManager = require("../../common/handlers/custom-scripts/startup-scripts-manager");
        startupScriptsManager.runStartupScripts();

        const eventManager = require("../../events/EventManager");
        eventManager.triggerEvent("firebot", "firebot-started", {
            username: "Firebot"
        });

        fileOpenHelpers.setWindowReady(true);
    });

    mainWindow.webContents.on('new-window', function(e, url) {
        e.preventDefault();
        shell.openExternal(url);
    });
}

/**
 * Creates the splash screen
 */
function createSplashScreen() {
    const isLinux = process.platform !== 'win32' && process.platform !== 'darwin';
    const splash = new BrowserWindow({
        width: 240,
        height: 325,
        icon: path.join(__dirname, "../../../gui/images/logo_transparent_2.png"),
        transparent: !isLinux,
        backgroundColor: isLinux ? "#34363C" : undefined,
        frame: false,
        closable: false,
        fullscreenable: false,
        movable: false,
        resizable: false,
        center: true,
        show: false,
        webPreferences: {
            nodeIntegration: true
        }
    });
    splashscreenWindow = splash;

    splash.on("ready-to-show", () => {
        splash.show();
    });

    return splash.loadURL(
        url.format({
            pathname: path.join(__dirname, "../../../gui/splashscreen/splash.html"),
            protocol: "file:",
            slashes: true
        }));
}

exports.createMainWindow = createMainWindow;
exports.createSplashScreen = createSplashScreen;