const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("pgr", {
  getConfig: () => ipcRenderer.invoke("pgr:config"),
  launch: (id) => ipcRenderer.invoke("pgr:launch", id),
  nowPlaying: () => ipcRenderer.invoke("pgr:nowplaying"),
  cover: (q) => ipcRenderer.invoke("pgr:cover", q),
  zoom: (z) => ipcRenderer.invoke("pgr:zoom", z),
  dragStart: () => ipcRenderer.send("pgr:drag-start"),
  dragEnd: () => ipcRenderer.send("pgr:drag-end"),
  modal: (on) => ipcRenderer.send("pgr:modal", on),
  update: (payload) => ipcRenderer.invoke("pgr:update", payload),
  pickFile: () => ipcRenderer.invoke("pgr:pickFile"),
  pickImage: () => ipcRenderer.invoke("pgr:pickImage"),
  suppressMenu: () => ipcRenderer.send("pgr:suppress-menu"),
  setInteractive: (on) => ipcRenderer.send("pgr:interactive", on),
  quit: () => ipcRenderer.send("pgr:quit"),
});
