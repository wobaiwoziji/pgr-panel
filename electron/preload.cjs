const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pgr", {
  getConfig: () => ipcRenderer.invoke("pgr:config"),
  launch: (id) => ipcRenderer.invoke("pgr:launch", id),
  nowPlaying: () => ipcRenderer.invoke("pgr:nowplaying"),
  cover: (q) => ipcRenderer.invoke("pgr:cover", q),
  zoom: (z) => ipcRenderer.invoke("pgr:zoom", z),
  setInteractive: (on) => ipcRenderer.send("pgr:interactive", on),
  quit: () => ipcRenderer.send("pgr:quit"),
});
