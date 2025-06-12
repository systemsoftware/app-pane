const { app, BrowserWindow, screen, ipcMain, shell, dialog, globalShortcut, Tray, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const prompt = require('electron-prompt');
const os = require('os');

console.log(os.tmpdir())

const updaterPath = path.join(os.tmpdir(), 'launcher-update');

if(!fs.existsSync(updaterPath)) {
const updaterAsarPath = path.join(__dirname, 'update');
fs.copyFileSync(updaterAsarPath, updaterPath);
fs.chmodSync(updaterPath, 0o755);
}

const appCachePath = app.getPath('userData') + '/apps.json';
const appIconCachePath = app.getPath('userData') + '/app-icons';


app.setName('App Pane');
app.setAboutPanelOptions({
  applicationName: 'App Pane',
  applicationVersion: app.getVersion(),
})
app.setAppLogsPath(app.getPath('userData') + '/logs');

console.log('App Cache Path:', appCachePath);

const appInfo = async () => {
    if(!fs.existsSync(appCachePath)) fs.writeFileSync(appCachePath, JSON.stringify([]));
    return new Promise((resolve, reject) => {
        cp.exec(`${updaterPath} "${appCachePath}" "${appIconCachePath}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
                app.relaunch({
                   args: process.argv.slice(1).concat(['--relaunched']),
                })
            app.exit();
            resolve(JSON.parse(fs.readFileSync(appCachePath, 'utf8')));
        });
    });
}

const updateAppCache = async () => {
  if(!fs.existsSync(appCachePath)) fs.writeFileSync(appCachePath, JSON.stringify([]));
    return new Promise((resolve, reject) => {
        cp.exec(`${updaterPath} "${appCachePath}" "${appIconCachePath}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(JSON.parse(fs.readFileSync(appCachePath, 'utf8')))
        });
    });
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

const win = new BrowserWindow({
  width,
  height,
  x: 0,
  y: 0,
  frame: false,
  minWidth: 800,
  minHeight: 600,
  transparent: true,
  hasShadow: false,
  titleBarStyle: 'hidden',
  visualEffectState: 'active',
  vibrancy: 'fullscreen-ui', 
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
  }
});


  win.loadFile('index.html');

  return win;
}

app.whenReady().then(async () => {
  
  const win = createWindow();
  

  ipcMain.handle('request-apps', async () => {

    if(fs.existsSync(appCachePath)) {
      console.log('Updating app cache...');
      return await updateAppCache();
    }
   return await appInfo()
  });

  ipcMain.on('open-app', (event, appPath) => {
    console.log('Opening app:', appPath);
    if (fs.existsSync(appPath)) {
      require('child_process').exec(`open "${appPath}"`);
    } else {
      console.error('App not found:', appPath);
    }
  });

  ipcMain.handle('reindex', async () => {
    console.log('Re-indexing apps...');
    const response = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Cancel', 'Reindex'],
      title: 'Reindex Apps',
      detail:'This will clear the current cache and re-scan all applications. If you just want to quickly update the cache, use the "Update" button instead or wait for the next automatic update.',
      message: 'Are you sure you want to reindex apps?',
    });
    if (response.response === 0) {
      console.log('Re-indexing cancelled by user.');
      return false;
    }
    try {
    fs.rmSync(appCachePath, { force: true });
    fs.rmSync(appIconCachePath, { recursive: true, force: true });
      app.relaunch();
        app.exit();
    } catch (error) {
      console.error('Error re-indexing apps:', error);
      throw error;
    }
  });

    ipcMain.handle('update', async () => {
    win.reload();
  });


  ipcMain.on('context-menu', (event, appName, appPath) => {
    console.log(`Context menu requested for app: ${appName} at path: ${appPath}`);
    const menu = require('electron').Menu.buildFromTemplate([
      {
        label: `Open`,
        click: () => {
          console.log(`Opening app: ${appName}`);
          require('child_process').exec(`open "${appPath}"`);
        }
      },
      {
        label: `Open In Finder`,
        click: () => {
          console.log(`Opening Finder for app: ${appName}`);
          shell.showItemInFolder(appPath);
        }
      },
    ]);
    menu.popup({ window: BrowserWindow.getFocusedWindow() });
  }
  );

  ipcMain.on('open-in-finder', (event, appPath) => {
  const apps = JSON.parse(fs.readFileSync(appCachePath, 'utf8'))
  const app = apps.find(app => app.path === appPath);
  const menu = require('electron').Menu.buildFromTemplate([
    {
      label:app.name,
      enabled: false
    },
    {
      type: 'separator'
    },
    {
      label:`Open`,
      click: () => {
        console.log(`Opening app at path: ${appPath}`);
        require('child_process').exec(`open "${appPath}"`);
      }
    },
        { 
      label: `Open In Finder`,
      click: () => {
        console.log(`Opening Finder for app at path: ${appPath}`);
        shell.showItemInFolder(appPath);
      }
    },
    {
      type: 'separator'
    },
    {
      label:app.pinned ? `Unpin App` : `Pin App`,
      enabled: !app.hidden,
      click: () => {
        console.log(`${app.pinned  ? "Unp" : "P"}inning app at path: ${appPath}`);
        const appIndex = apps.findIndex(app => app.path === appPath);
        if (appIndex !== -1) {
          apps[appIndex].pinned = !apps[appIndex].pinned;
          fs.writeFileSync(appCachePath, JSON.stringify(apps));
          win.webContents.send('new-app-pinned', apps[appIndex]);
          console.log(`Done.`);
        } else {
          console.error(`App at path: ${appPath} not found.`);
        }
      }
    },
    {
      label:app.hidden ? `Unhide App` : `Hide App`,
      enabled: !app.pinned,
      click: () => {
        console.log(`${app.hidden ? "Unhiding" : "Hiding"} app at path: ${appPath}`);
        const appIndex = apps.findIndex(app => app.path === appPath);
        if (appIndex !== -1) {
          if (apps[appIndex].hidden) delete apps[appIndex].hidden;
          else apps[appIndex].hidden = true;
          fs.writeFileSync(appCachePath, JSON.stringify(apps));
          win.webContents.send('new-app-hidden', apps[appIndex].id);
          dialog.showMessageBox({
            type: 'info',
            title: 'App Visibility Changed',
            message: `${app.name} is now ${apps[appIndex].hidden ? 'hidden. You can still find it using the search bar.' : 'visible.'}`,
          });
          console.log(`Done.`);
        } else {
          console.error(`App at path: ${appPath} not found.`);
        }
      }
    }
  ]);
  menu.popup({ window: BrowserWindow.getFocusedWindow() });
  }
  );

  ipcMain.handle('get-icon-path', async () => {
    if (fs.existsSync(appIconCachePath)) {
      return appIconCachePath;
    }
    console.error('Icon path does not exist:', appIconCachePath);
  }
  );

  ipcMain.handle('delete-cache', async () => {
    console.log('Deleting app cache...');
    const response = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Cancel', 'Delete'],
      title: 'Delete App Cache',
      detail:'This will delete the current cache and all cached icons and quit the app. You will need to reindex apps to make the app functional again.',
      message: 'Are you sure you want to delete the app cache?',
    });
    if (response.response === 0) {
      console.log('Cache deletion cancelled by user.');
      return false;
    }
    try {
      fs.rmSync(appCachePath, { force: true });
      fs.rmSync(appIconCachePath, { recursive: true, force: true });
      console.log('App cache deleted successfully.');
      app.exit();
      return true;
    } catch (error) {
      console.error('Error deleting app cache:', error);
      throw error;
    }
  }
  );

  ipcMain.handle('prompt', async (event, title, message) => {
    const response = await prompt({
      title: title,
      label: message,
      type: 'input',
      customStylesheet: path.join(__dirname, 'prompt.css'),
      inputAttrs: {
        type: 'text',
      },
      alwaysOnTop: true,
      cancelLabel: 'Cancel',
      okLabel: 'OK',
    });
    return response;
  }
  );

ipcMain.handle('update-order', async (event, order) => {
  console.log('Updating app order:', order);
  try {
    const apps = JSON.parse(fs.readFileSync(appCachePath, 'utf8'));
    const appMap = new Map(apps.map(app => [app.id, app]));
    const updatedApps = order.map(id => appMap.get(id)).filter(app => app);
    fs.writeFileSync(appCachePath, JSON.stringify(updatedApps));
    console.log('App order updated successfully.');
  }catch (error) {
    console.error('Error updating app order:', error);
    throw error;
  }
});

ipcMain.handle('pin', (event, appId) => {
    console.log(`Pinning app with ID: ${appId}`);
    const apps = JSON.parse(fs.readFileSync(appCachePath, 'utf8'));
    const appIndex = apps.findIndex(app => app.id === appId);
    if (appIndex !== -1) {
        apps[appIndex].pinned = true;
        fs.writeFileSync(appCachePath, JSON.stringify(apps));
        console.log(`App with ID: ${appId} pinned successfully.`);
    } else {
        console.error(`App with ID: ${appId} not found.`);
    }
});

ipcMain.handle('unpin', (event, appId) => {
    console.log(`Unpinning app with ID: ${appId}`);
    const apps = JSON.parse(fs.readFileSync(appCachePath, 'utf8'));
    const appIndex = apps.findIndex(app => app.id === appId); 
    if (appIndex !== -1) {
        if(apps[appIndex].pinned) delete apps[appIndex].pinned;
        fs.writeFileSync(appCachePath, JSON.stringify(apps));
        console.log(`App with ID: ${appId} unpinned successfully.`);
    } else {
        console.error(`App with ID: ${appId} not found.`);
    }
}
);

ipcMain.handle('reorder', (event, order) => {
    console.log('Updating app order:', order);
    const apps = JSON.parse(fs.readFileSync(appCachePath, 'utf8'));
    if (order === 'az') {
        apps.sort((a, b) => a.name.localeCompare(b.name));
    } else if (order === 'za') {
        apps.sort((a, b) => b.name.localeCompare(a.name));
    }
    fs.writeFileSync(appCachePath, JSON.stringify(apps));
    win.reload();
}
);


    ipcMain.on('quit', () => {
        console.log('Quitting app...');
        app.quit();
    });


    setInterval(() => { win.reload() }, 5 * 60 * 1000);

    if(fs.existsSync(app.getPath('userData') + '/hide-dock')) {
        app.dock.hide();
        console.log('Hiding dock icon...');
    }

        if(fs.existsSync(app.getPath('userData') + '/shortcut')) {
        const shortcut = fs.readFileSync(app.getPath('userData') + '/shortcut', 'utf8').trim();
        console.log('Creating shortcut:', shortcut);
        globalShortcut.register(shortcut, () => {
            console.log('Global shortcut triggered:', shortcut);
            if(win.isVisible()) {
                win.hide();
            } else {
                win.show();
            }
        });
    }

    ipcMain.on('right-click', (event, appId) => {
       // menu with hide/show dock, set shortcut, and quit options
        const menu = Menu.buildFromTemplate([
            {
                label: 'Hide Dock Icon',
                type: 'checkbox',
                checked: fs.existsSync(app.getPath('userData') + '/hide-dock'),
                click: () => {
                    if (fs.existsSync(app.getPath('userData') + '/hide-dock')) {
                        fs.unlinkSync(app.getPath('userData') + '/hide-dock');
                        app.dock.show();
                        console.log('Dock icon shown.');
                    } else {
                        fs.writeFileSync(app.getPath('userData') + '/hide-dock', '');
                        app.dock.hide();
                        app.show();
                        console.log('Dock icon hidden.');
                    }
                }
            },
            {
              type: 'separator'
            },
            {
                label: 'Set Global Shortcut',
                click: async () => {
                    const shortcut = await prompt({
                        customStylesheet: path.join(__dirname, 'prompt.css'),
                        title: 'Set Global Shortcut',
                        label: 'Enter a global shortcut (e.g., Cmd+Shift+A):',
                        type: 'input',
                        inputAttrs: {
                            type: 'text',
                        },
                        value: fs.existsSync(app.getPath('userData') + '/shortcut') ? fs.readFileSync(app.getPath('userData') + '/shortcut', 'utf8').trim() : '',
                        alwaysOnTop: true,
                        cancelLabel: 'Cancel',
                        okLabel: 'Set Shortcut',
                    });
                    if (shortcut) {
                        fs.writeFileSync(app.getPath('userData') + '/shortcut', shortcut);
                        globalShortcut.register(shortcut, () => {
                            console.log('Global shortcut triggered:', shortcut);
                            if(win.isVisible()) {
                                win.hide();
                            } else {
                                win.show();
                            }
                        });
                        dialog.showMessageBox({
                            type: 'info',
                            title: 'Global Shortcut Set',
                            message: `Global shortcut set to: ${shortcut}`,
                        });
                        console.log(`Global shortcut set to: ${shortcut}`);
                    }
                }
            },
            {
              label: 'Remove Global Shortcut',
              click: () => {
                if (fs.existsSync(app.getPath('userData') + '/shortcut')) {
                    fs.unlinkSync(app.getPath('userData') + '/shortcut');
                    globalShortcut.unregisterAll();
                   dialog.showMessageBox({
                        type: 'info',
                        title: 'Global Shortcut Removed',
                        message: 'Global shortcut has been removed.',
                    });
                    console.log('Global shortcut removed.');
                } else {
                    console.log('No global shortcut set.');
                }
              }
            },
            {
              label:"Global Shortcut Help",
              click:() => {
                shell.openExternal('https://www.electronjs.org/docs/latest/api/accelerator#available-modifiers')
              }
            },
            {
              type: 'separator'
            },
            {
                label: 'Quit',
                click: () => {
                    console.log('Quitting app...');
                    app.quit();
                }
            }
        ]);
        menu.popup({ window: BrowserWindow.getFocusedWindow() });
    });

});