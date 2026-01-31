# Sidenotes

A web app built to write, organise, and keep notes.

<p align="center">
  <img src="./public/assets/screenshot.png" alt="Content planner dashboard preview" width="800">
</p>

## Features

- Real-time character, word, and reading time counters.
- Colour-code note headers and reorder notes via drag-and-drop or index input.
- Keyboard shortcuts for quick actions (Ctrl+Alt+N for new note, Ctrl+Alt+M for new notepad, Ctrl+Alt+K for notepad viewer).
- Data Management:
  - Export individual notes.
  - Import and export entire notepads.
  - Upload, download, and manage files within your notes.
  - Backup and restore functionality for all stored notepads.
- Works offline via Service Workers.

## Tech Stack

- **Framework:** React 18+
- **Build Tool:** Vite
- **Storage:** IndexedDB (via a custom wrapper)
- **Styling:** CSS3

## Getting Started

To run this project locally, ensure you have **Node.js** installed.

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Start the development server:**

    ```bash
    npm run dev
    ```

3.  **Build for production:**
    ```bash
    npm run build
    ```

## Important: Data Storage

All data is stored locally in your browser's **IndexedDB**. Data is **NOT** sent to any remote server.

**Warning:** Any voluntary or involuntary action (such as clearing browser cache/data), system errors, or browser updates can cause the **irreversible** loss of all content. Regular backups should be manually made using the "Backup Notepads" feature and stored safely elsewhere.

## Disclaimer

Sidenotes is a personal project. It is **NOT** intended for critical production environments.

Sidenotes and any related content are provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.

## Copyright & Licence

**Sidenotes** Copyright (c) 2023-2026 Francesco Ugolini
Released under the **Mozilla Public License, v. 2.0**. Please read the [LICENSE](LICENSE) file before use.

**Sidenotes Logo** Copyright (c) 2023-2026 Francesco Ugolini - All rights reserved

### Third-Party Assets

- **Bootstrap Icons** This project includes icons created by the [Bootstrap team](https://github.com/twbs/icons) and licensed under the MIT License.
