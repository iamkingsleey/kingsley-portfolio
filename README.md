# Kingsley M. — Portfolio

Personal portfolio built around an FM tuning dial. The dial is the navigation: tap a station or drag the needle to tune between Home, Feed, Projects, Engineering and Contact.

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Run it locally

Open `index.html` in a browser, or serve the folder so sounds and fonts behave exactly as they will online:

```bash
npx serve .
# or
python3 -m http.server 8000
```

## What's here

| Path | What it is |
| --- | --- |
| `index.html` | Current design (v3): Home with the dial, plus Engineering, Projects and About behind a side menu. Light and dark mode (button bottom-right) |
| `designs.html` | Designs page (v3): a horizontal row of work scrubbed by a ruler dial, an All grid, and a page per project |
| `iteration-3/` | Third iteration: dial on Home, side menu, Designs as a masonry grid |
| `iteration-2/` | Second iteration: the dial on every page |
| `iteration-1/` | First iteration: top dial, Feed masonry, image trail on Home |
| `popkit.js` | UI sounds made in code with Web Audio (pop on tap, detent while dragging). No audio files |
| `assets/` | Headshot and other images |

## Updating content

- **Feed tiles**: edit the `FEED` list in `index.html`. Each item takes a title `t`, a shape `r` (width ÷ height, e.g. `4 / 5` for portrait, `3 / 2` for landscape) and an optional image path `src`.
- **Projects, Engineering, Contact**: edit the lists inside each `<section class="panel">`.
- **Links**: the `email`, `github`, `resume` and social links are placeholders (`href="#"`).

A CMS for uploading content is planned as the next phase.

## Designs page (`designs.html`)

- **Pieces and files**: the `A` list near the top of the script in `designs.html` groups pieces by category (3D, Product, Brand, Motion). Each piece has a title `t`, an image `src` (or a `video` and its `poster`), its shape `r` (width ÷ height) and `dark` (true when the picture is dark, so titles over it turn white).
- **Project details**: fill in the `PROJECTS` table in the same file (keyed by title). Every field is optional and hidden when empty: `year`, `client`, `role`, `tools`, `summary`, `alt` (a second image shown on hover) and `loop` (a short video shown on hover).
- **Getting there**: tuning Home's dial (or the side menu) to Designs closes the page with a circle and opens `designs.html`. The `98.0 Home` button tunes back. Old `#designs` and `#feed` links forward to the new page.
- **Theme**: both pages share the light/dark choice (saved in the browser as `km-theme`; first visit follows the system setting).

## Behaviour notes

- Sounds play only on real taps and drags, never on their own. On the Designs page the only sound is a deep tick as each piece passes the needle.
- The loading counter shows once per visit; coming back to Home from Designs skips it.
- Respects reduced-motion settings: the dial and pages switch without animation.
- Layout adapts: left-edge dial on laptops and desktops, dial on top for tablets, a row of station labels on phones.

## Designs content (`content/designs.json`)

The Designs grid is built from `content/designs.json`. The upcoming CMS will edit this file; until then you can edit it by hand.

```json
{
  "projects": [
    {
      "title": "Kusnap",
      "role": "Head of Design · Marketplace",
      "description": "First paragraph.\n\nSecond paragraph.",
      "tags": ["Product", "Brand"],
      "images": [
        { "src": "assets/designs/kusnap/01.jpg", "caption": "Home feed" },
        { "src": "assets/designs/kusnap/02.jpg" }
      ]
    }
  ]
}
```

- **Required:** `title` and at least one image. `role`, `description`, `tags` and each image's `caption` are optional.
- **Grid:** shows each project's first image as its cover, with an image count when there's more than one. The other images and the text are stored for a future project page.
- **Image shape:** `ratio` (width ÷ height) sets the tile's shape; without it the tile is portrait (4:5).
- **Videos:** add `"video": "assets/designs/videos/name.mp4"` to an image, and use `src` for a still frame of it. The clip plays muted on a loop while it's on screen and shows the still until then. Keep clips short, export them around 720px wide as H.264 MP4 with no sound, and put the still in `assets/designs/` (plus a 240×300 copy in `assets/designs/thumbs/`).
- **No `src` yet:** a soft placeholder shows instead.
- Opening `index.html` straight from disk can't read the JSON file, so a built-in copy is used. Run `python3 -m http.server` to preview the real file.
