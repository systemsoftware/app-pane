const { contextBridge, ipcRenderer, app } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    apps: async () => {
        return await ipcRenderer.invoke('request-apps');
    },
    openApp: (appPath) => {
        ipcRenderer.send('open-app', appPath);
    },
    reIndex: async () => {
        return await ipcRenderer.invoke('reindex');
    },
    quit: () => {
        ipcRenderer.send('quit');
    },
    showInFinder: (appPath) => {
        ipcRenderer.send('open-in-finder', appPath);
    },
    updateApps: async () => {
        return await ipcRenderer.invoke('update');
    },
    iconPath: async () => {
        const iconPath = ipcRenderer.invoke('get-icon-path');
        return iconPath;
    },
    deleteCache: async () => {
        return await ipcRenderer.invoke('delete-cache');
    },
    prompt:async (title, message) => {
        return await ipcRenderer.invoke('prompt', title, message);
    },
    updateOrder: async (order) => {
        return await ipcRenderer.invoke('update-order', order);
    },
    pinApp: async (appId) => {
        return await ipcRenderer.invoke('pin', appId);
    },
    unpinApp: async (appId) => {
        return await ipcRenderer.invoke('unpin', appId);
    },
    onNewAppPinned: (callback) => {
        ipcRenderer.on('new-app-pinned', (event, appId) => {
            callback(appId);
        });
    },
    onNewAppHidden: (callback) => {
        ipcRenderer.on('new-app-hidden', (event, appId) => {
            callback(appId);
        });
    },
    reorder: async (order) => {
        return await ipcRenderer.invoke('reorder', order);
    },
    rightClick: (appId) => {
        ipcRenderer.send('right-click', appId);
    },
});