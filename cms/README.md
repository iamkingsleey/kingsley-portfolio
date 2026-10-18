# CMS

The editor for the site. It runs on your Mac only, and nothing in this folder changes how the live site looks.

## Open it

Double-click **Start CMS.command** in this folder. A Terminal window opens, and then the editor opens in your browser at http://localhost:4321.
Leave the window open while you edit. Close it when you're done.

## What you can edit

| Section | What it changes |
| --- | --- |
| Analytics | Visits, where people come from, countries, devices, and which designs get opened |
| Case studies | Everything on each product and brand case study: text, numbers, pictures, videos, colour blocks, and the page options |
| Designs | Every piece on the Designs dial: picture or video, description, year, credits, linked case study, order, show/hide |
| About / Engineering / Projects page | The chapters, the tools, and the page intros |
| Page text | Every other piece of text on every page: headings, labels, buttons, links |
| Pictures & videos | Every other picture or video on every page |
| Settings & publish | Analytics setup, and **Publish** |

1. Make your changes.
2. Press **Save & rebuild** (or ⌘S). This updates the pages on your Mac. **View site** shows them.
3. Press **Publish** (in Settings & publish). This sends your changes live. It commits with your own git name, with no co-author line.

Uploaded files go to `assets/uploads/`. Every save keeps a backup of the previous version in `cms/.history/`.

## Where things live

- `content/*.json`: your content (the CMS writes these files)
- `cms/build/`: the page templates and the build that turns content into pages
- `cms/server.py`: the small local server behind the editor
- `cms/.secrets.json`: your analytics token (stays on this Mac; it's in .gitignore)

You can also rebuild without the editor: `python3 cms/build/build.py`
