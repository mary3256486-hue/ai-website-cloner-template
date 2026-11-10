import { app, BrowserWindow, Menu, dialog, session, shell } from "electron";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(import.meta.dirname, "..", "out");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

function serveStatic() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      let file = path.normalize(path.join(OUT_DIR, urlPath));
      if (!file.startsWith(OUT_DIR + path.sep) && file !== OUT_DIR) {
        res.writeHead(403);
        res.end();
        return;
      }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      const status = fs.existsSync(file) ? 200 : 404;
      if (status === 404) file = path.join(OUT_DIR, "404.html");
      res.writeHead(status, {
        "Content-Type": MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

const WEB_PREFERENCES = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  spellcheck: false,
};

let mainWindow = null;
let appPort = 0;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: "#fdf6e7",
    icon: path.join(import.meta.dirname, "..", "build", "icon.png"),
    title: "Tiểu Phạm — Gia Phả",
    webPreferences: WEB_PREFERENCES,
  });
  mainWindow.loadURL(`http://127.0.0.1:${appPort}/`);
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url === "about:blank" || url.startsWith(`http://127.0.0.1:${appPort}/`)) {
      return { action: "allow", overrideBrowserWindowOptions: { webPreferences: WEB_PREFERENCES } };
    }
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function buildMenu() {
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "Tệp",
        submenu: [
          {
            label: "In…",
            accelerator: "CmdOrCtrl+P",
            click: () => mainWindow?.webContents.print(),
          },
          { type: "separator" },
          { label: "Thoát", role: "quit" },
        ],
      },
      {
        label: "Xem",
        submenu: [
          { label: "Tải lại", role: "reload" },
          { label: "Buộc tải lại", role: "forceReload" },
          { type: "separator" },
          { label: "Cỡ chữ chuẩn", role: "resetZoom" },
          { label: "Phóng to", role: "zoomIn" },
          { label: "Thu nhỏ", role: "zoomOut" },
        ],
      },
      {
        label: "Trợ giúp",
        submenu: [
          {
            label: "Về Tiểu Phạm — Gia Phả",
            click: () =>
              dialog.showMessageBox(mainWindow, {
                type: "info",
                title: "Tiểu Phạm — Gia Phả",
                message: "Khối Đình Tiểu Phạm — Gia Phả",
                detail: [
                  `Phiên bản ${app.getVersion()}`,
                  "Dữ liệu lưu trên máy này (localStorage + IndexedDB).",
                  "",
                  "Tác giả: Phạm Anh Tuấn",
                  "SĐT/Zalo: 0903708553",
                  "Góp ý xin gửi về: pat.vungtau@gmail.com",
                ].join("\n"),
              }),
          },
        ],
      },
    ]),
  );
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(async () => {
    const server = await serveStatic();
    appPort = server.address().port;
    session.defaultSession.on("will-download", (_event, item) => {
      item.setSaveDialogOptions({
        title: "Lưu tệp gia phả",
        defaultPath: path.join(app.getPath("downloads"), item.getFilename()),
      });
    });
    buildMenu();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("window-all-closed", () => app.quit());