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
