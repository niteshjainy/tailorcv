# 1. Install

You need three things: **Node.js**, **LibreOffice** (creates the PDF) and this project's Node packages. `npm run setup` checks all of them and can install what is missing.

## Step 1: Node.js
Install the LTS version (22.13 or newer) from https://nodejs.org. Check in a terminal:
```
node -v
npm -v
```
Windows: use PowerShell or Windows Terminal. Close and reopen the terminal after installing.

## Step 2: Get the project
```
git clone https://github.com/niteshjainy/tailorcv.git
cd tailorcv
```
No git? Download the ZIP from the repository page, extract it and open a terminal in the extracted folder.

## Step 3: Run the setup
```
npm run setup
```
It checks Node, the npm packages, LibreOffice, the Calibri/Carlito font and your base resume, and asks before installing anything:

| Missing | What setup does |
|---|---|
| npm packages | runs `npm install` |
| LibreOffice, Windows | `winget install --id TheDocumentFoundation.LibreOffice -e` (or `choco install libreoffice-fresh -y`) |
| LibreOffice, macOS | `brew install --cask libreoffice` (needs Homebrew) |
| LibreOffice, Linux | `sudo apt-get install -y libreoffice fonts-crosextra-carlito` (also dnf and pacman) |

Use `npm run setup -- --yes` to install without questions, and `npm run doctor` to only check.

If automatic install is not possible (no winget/brew, no admin rights), install LibreOffice manually from https://www.libreoffice.org/download, close and reopen the terminal, and run `npm run doctor`.

### Fonts
The layout uses Calibri. Windows has it. LibreOffice substitutes Carlito (same measurements) when Calibri is missing. On Linux install `fonts-crosextra-carlito`. If neither exists, the build stops with a "wrong fonts" error instead of producing a bad PDF.

### Optional: poppler
Installing poppler (`winget install poppler`, `brew install poppler`, `sudo apt-get install poppler-utils`) adds an extra check that the PDF text is readable. It is optional.

## Step 4: Test
```
npm run example
```
Expected output: `SAVED: .../output/Example/alex_morgan_resume.pdf` with `pages: 2`, fonts `Carlito` or `Calibri`, and `text OK`. Open the PDF and compare it with `samples/sample_resume.pdf`.

Next: [02 Configure your resume](02-CONFIGURE-YOUR-RESUME.md).
