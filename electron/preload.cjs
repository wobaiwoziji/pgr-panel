const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pgr", {
  getConfig: () => ipcRenderer.invoke("pgr:config"),
  launch: (id) => ipcRenderer.invoke("pgr:launch", id),
  nowPlaying: () => ipcRenderer.invoke("pgr:nowplaying"),
  setInteractive: (on) => ipcRenderer.send("pgr:interactive", on),
  quit: () => ipcRenderer.send("pgr:quit"),
});
