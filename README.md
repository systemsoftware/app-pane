# App Pane

**App Pane** is a macOS Electron application that acts as a visual app launcher and manager. It scans installed applications, allows for quick launching, pinning, hiding, and organizing apps, and includes cache management, icon indexing, and a customizable global shortcut.



## 🚀 Features

* 🔍 Automatically scans and indexes installed macOS applications.
* 📌 Pin or unpin apps for quick access.
* 🙈 Hide apps from view (but keep them searchable).
* 🖼️ Caches and displays app icons.
* 🗂️ Reorder apps manually or alphabetically (A–Z / Z–A).
* 🔁 Automatic cache reloading every 5 minutes.
* 🛠️ Reindex apps or delete the cache via the UI.
* 🧭 Open apps or reveal them in Finder.
* 🎛️ Dock icon visibility toggle.
* ⌨️ Global shortcut support to quickly toggle the app's visibility.



## 🧱 Built With

* [Electron](https://www.electronjs.org/)
* [Node.js](https://nodejs.org/)
* [electron-prompt](https://www.npmjs.com/package/electron-prompt)



## 📁 Folder Structure

```
AppPane/
├── index.html              # Main UI
├── preload.js              # Preload script for IPC
├── main.js                 # Main Electron process (provided above)
├── update                  # Updater executable (copied to temp folder)
├── prompt.css              # Custom styling for prompts
```



## 🖥️ Requirements

* macOS (due to `open` and `Finder`-specific features)
* Node.js & npm installed
* Electron (via `npm install`)



## 🛠️ Installation

```bash
git clone https://github.com/systemsoftware/app-pane.git
cd app-pane
npm install
```



## 🏁 Run the App

```bash
npm start
```



## 🔧 Customization

* To **hide the dock icon**, a file named `hide-dock` is placed in `userData` path (`~/Library/Application Support/App Pane/`).
* To **set a global shortcut**, a `shortcut` file is created in the same directory.
* Use the right-click menu inside the app to modify these settings.



## 💾 App Cache & Icon Storage

* App metadata:
  `~/Library/Application Support/App Pane/apps.json`
* Cached app icons:
  `~/Library/Application Support/App Pane/app-icons/`



## ⚠️ Safety Notes

* On reindexing or deleting cache, the app will relaunch or exit automatically.
* Cached icon folders and metadata files will be removed.



## 🧪 Development Notes

* The updater is a separate executable copied to a temp directory and invoked as needed.
* IPC handlers manage app data, UI actions, and user input securely and asynchronously.
* Reloading happens every 5 minutes to reflect app changes.



## 📚 Global Shortcut Help

To define a shortcut (e.g., `Cmd+Shift+A`), refer to [Electron Accelerator Docs](https://www.electronjs.org/docs/latest/api/accelerator#available-modifiers)

## 📄 License

MIT License
