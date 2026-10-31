# XaOps — Xaxero Shipboard Operations Suite

XaOps is a professional, fixed-screen web launcher for shipboard business systems. It provides six configurable operational modules and up to four special-task shortcuts, with permanent server-backed configuration.

## Features

- Hotel & Gangway Operations
- Guest Wi-Fi Control
- Staff Network Monitoring
- Digital Signage Management
- Internal and External CCTV
- Server status and three spare special-task slots
- Password-protected Setup mode
- Server-side JSON configuration shared by every client
- Responsive desktop, tablet, and mobile layouts without main-page scrolling
- Local static assets with no CDN, font service, database, or PHP package dependencies
- Links open safely in new tabs

## Requirements

- Apache or another web server with PHP support
- PHP 7.4 or later; PHP 8.x recommended
- Write access to `storage/` for the web-server user

## Installation

Deploy the repository to the web root, for example:

```bash
cd /var/www/html
git init
git remote add origin https://github.com/xaxjon/XaLauncher.git
git fetch origin
git checkout -f -t origin/main
```

For Apache on Ubuntu, allow the web server to write the configuration:

```bash
sudo chgrp -R www-data storage
sudo chmod 775 storage
sudo chmod 664 storage/config.json
```

Adapt the group name if your PHP service uses a different account.

For a local PHP development server:

```bash
php -S 127.0.0.1:8080
```

Then open `http://127.0.0.1:8080`.

## Using XaOps

Select any module or special task to open its configured web page in a new tab.

To configure the launcher:

1. Select **Setup** at the top right.
2. Enter the administrator password.
3. Select a module or special task.
4. Edit its title, description where applicable, URL, and icon.
5. Select **Save changes**.

Select **Page text** in Setup to edit the brand title and subtitle, eyebrow and main headings, introductory comment, status label, special-task heading, and footer tagline. The legal Xaxero copyright remains fixed.

Use **Add task** to fill any of the three spare special-task slots. **Restore defaults** resets all modules, tasks, and page text on the server. Select **Done** or press **Escape** to leave Setup mode.

The default password is:

```text
admin123
```

The password is checked by `api/config.php`, not only by the browser. Change `ADMIN_PASSWORD` in that file before deploying beyond a trusted network. This hard-coded password provides lightweight access control; use HTTPS and appropriate network restrictions for production administration.

## Permanent configuration

Configuration is stored in:

```text
storage/config.json
```

It is not stored in browser `localStorage`. Once the web server can write this file, changes persist across browser sessions, client devices, and server restarts.

Back up `storage/config.json` before updating or redeploying the application. A forced Git checkout can replace the file with the repository defaults. Restore the backup afterward and ensure the web-server write permissions remain correct.

## Configuration API

`api/config.php` provides:

- `GET /api/config.php` — return the current configuration.
- `POST /api/config.php` with `action: "authenticate"` — validate the administrator password.
- `POST /api/config.php` with `action: "save"` — validate and atomically save a configuration.

Writes require the administrator password. The API accepts six business functions and up to four special tasks, validates field lengths and icons, and permits only HTTP/HTTPS URLs.

## Project structure

```text
index.html             Launcher interface and local SVG icons
styles.css             Responsive Xaxero visual design
app.js                 Rendering, editing, and API client
api/config.php         Authentication, validation, and persistent writes
storage/config.json    Live server configuration
assets/                Local Xaxero branding
LICENSE                Project license
```

---

Copyright Xaxero Marine Software Engineering.
