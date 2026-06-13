const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('secure', {
  requestScreenCapture: async () => {
    return await ipcRenderer.invoke('request-screen-capture');
  }
});
