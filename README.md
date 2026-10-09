# Mercor JD Copier Extension

This is a small Chrome extension that injects a circular floating button on Mercor job pages.

## What it does
- Adds a fixed circular **JD** button on pages under `https://work.mercor.com/jobs/*`
- One click copies the job description text from the job title through the About section, including its content.
- Shows a small toast confirming copy success/failure.

## Install (unpacked)
1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the downloaded or cloned extension folder containing `manifest.json`.
5. Open any Mercor job page like:
   - `https://work.mercor.com/jobs/list_.../...`
6. Click the floating green circular button on the right side.

## Notes
- If copying is blocked, your browser may require interaction with the page to grant clipboard permissions.
- The extractor is built for Mercor job-detail pages and includes the About section, stopping at the next same-level or higher-level heading or a recognized referral heading.
- After updating the extension, click **Reload** on its card in `chrome://extensions` or `edge://extensions`, then refresh the job page.
