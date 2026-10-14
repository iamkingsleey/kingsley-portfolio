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
| `index.html` | Current design (iteration 2): left-edge dial, dial-born page reveal, Feed with a scroll ruler |
| `iteration-1/` | First iteration: top dial, Feed masonry, image trail on Home |
| `popkit.js` | UI sounds made in code with Web Audio (pop on tap, detent while dragging). No audio files |
| `assets/` | Headshot and other images |

## Updating content

- **Feed tiles**: edit the `FEED` list in `index.html`. Each item takes a title `t`, a shape `r` (width ÷ height, e.g. `4 / 5` for portrait, `3 / 2` for landscape) and an optional image path `src`.
- **Projects, Engineering, Contact**: edit the lists inside each `<section class="panel">`.
- **Links**: the `email`, `github`, `resume` and social links are placeholders (`href="#"`).

A CMS for uploading content is planned as the next phase.

## Behaviour notes

- Sounds play only on real taps and drags, never on their own.
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
- **No `src` yet:** a soft placeholder shows instead.
- Opening `index.html` straight from disk can't read the JSON file, so a built-in copy is used. Run `python3 -m http.server` to preview the real file.
