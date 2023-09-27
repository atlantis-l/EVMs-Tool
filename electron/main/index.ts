import { app, BrowserWindow, Menu, MenuItem } from "electron";
import { release } from "node:os";
import { join } from "node:path";
import contextMenu from "electron-context-menu";

let win: BrowserWindow | null = null;

const isMac = process.platform === "darwin";

const menu = new Menu();

menu.append(
  new MenuItem({
    label: "应用",
    submenu: [
      {
        label: "退出",
        role: "quit",
        accelerator: isMac ? "Cmd+Q" : "Ctrl+Q",
      },
    ],
  })
);

menu.append(
  new MenuItem({
    label: "编辑",
    submenu: [
      {
        label: "撤销",
        role: "undo",
      },
      {
        label: "恢复",
        role: "redo",
      },
      {
        type: "separator",
      },
      {
        label: "剪切",
        role: "cut",
      },
      {
        label: "复制",
        role: "copy",
      },
      {
        label: "粘贴",
        role: "paste",
      },
      {
        label: "全选",
        role: "selectAll",
      },
    ],
  })
);

menu.append(
  new MenuItem({
    label: "视图",
    submenu: [
      {
        label: "刷新",
        role: "reload",
      },
      {
        label: "强制刷新",
        role: "forceReload",
      },
      {
        type: "separator",
      },
      {
        label: "开发者工具",
        role: "toggleDevTools",
      },
    ],
  })
);

Menu.setApplicationMenu(menu);

contextMenu({
  labels: {
    copy: "复制",
    paste: "粘贴",
    cut: "剪切",
    copyLink: "复制链接",
    selectAll: "全选",
  },
  showInspectElement: false,
  showSearchWithGoogle: false,
  showLookUpSelection: false,
  showCopyImage: false,
  showLearnSpelling: false,
  showSelectAll: true,
  prepend: (defaultActions, parameters, browserWindow) => [
    {
      label: "刷新",
      role: "reload",
    },
    {
      label: "强制刷新",
      role: "forceReload",
    },
  ],
  append: (defaultActions, parameters, browserWindow) => [
    {
      label: "开发者工具",
      role: "toggleDevTools",
    },
    {
      label: "退出",
      role: "quit",
    },
  ],
});

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer

process.env.DIST_ELECTRON = join(__dirname, "..");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
process.env.PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, "../public")
  : process.env.DIST;

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";

// Here, you can also use other preload
const preload = join(__dirname, "../preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");

async function createWindow() {
  win = new BrowserWindow({
    icon: join(process.env.PUBLIC, "electron.png"),
    width: 1100,
    height: 700,
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
      nodeIntegrationInWorker: true,
      spellcheck: false,
    },
  });

  win.setResizable(false);
  win.center();

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(url);
  } else {
    win.loadFile(indexHtml);
  }
}

app.whenReady().then(async () => {
  createWindow();
});

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
});

app.on("second-instance", () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

process.env["provider"] = "https://rpc.ankr.com/eth";
process.env["mainnet"] = "ETH";
process.env["tokenType"] = "原生代币";
process.env["currentPath"] = "start-to-use";
//@ts-ignore
process.env["selectedKeys"] = ["start-to-use"];
process.env["menuFoldState"] = "unfold";
//@ts-ignore
process.env["txHash.oneToOne"] = [];
process.env["needNftApprove"] = "0";
