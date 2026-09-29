# AI Agent fall launch page

A design concept for the Gorgias AI Agent fall 2026 launch page. It announces AI Agent on WhatsApp, Instagram and Facebook, with a "Text us for a free 30 days" promotion, then covers Tone of Voice, Gaia, Actions in Skills and the "More like this" button.

The page comes in three versions, with a switcher bar at the top of each:

- **Version 3 (the root, the default):** an animated hero where messages from Instagram, Facebook and WhatsApp pile up, then shrink into a phone that AI Agent clears. The emoji are flat and drawn in the shape of the Gorgias chat icon, in the brand pastels. The AI Agent flower appears as glass in every tinted card.
- **Version 2 (`v2/`):** soft 3D emoji and a mesh-gradient hero.
- **Version 1 (`v1/`):** the first build, with soft 3D emoji on warm paper.

None of the emoji are platform emoji.

This is a design artifact, not a production page.

## Run it

Serve the folder and open it in a browser:

```bash
python3 -m http.server 8765
# then open http://localhost:8765
```

Opening `index.html` straight from disk also works, but copying the phone number to the clipboard needs a served page.

## What you can do on the page

- **Hero:** watch the inbox fill up and AI Agent clear it. The Replay button runs it again.
- **Closing section:** grab, throw and stack the emoji, which run on real physics. Tap one to make it hop.
- **Anywhere on the page:** click empty space to send a burst of reactions. A counter by the pinned promo keeps score.
- **WhatsApp card:** hover a message to pick a reaction.
- **Instagram card:** double-click a message for a heart.
- **Facebook card:** press the reaction bar to send reactions floating up.
- **Tone of Voice:** drag the slider, and the same reply retypes itself from formal to playful.
- **Gaia Hub:** switch between Opportunities and Routines, press "Fix with Gaia", and flip the routine switches.
- **Actions in Skills:** drag an action into a step, or click one. Fill both steps to watch AI Agent run the skill.
- **More like this:** switch between Before and After, and press the button to show the look-alikes.
- **Floating emoji:** drag any floating emoji and let go. It springs back to its place.

Visitors who turn on reduced motion in their system settings get a still version of the page.

## Files

- `index.html`, `styles.css`, `app.js`: version 3. The colour, type and easing values mirror the tokens in `gorgias/gorgias-website-components` (`src/tokens/brand.css`). The physics uses [Matter.js](https://brm.io/matter-js/), loaded from cdnjs.
- `v2/` and `v1/`: the earlier versions, each with its own three files.
- `versions.css`: the version switcher bar, shared by all three.
- `assets/v3/`: version 3's bubble emoji (SVG) and channel icons.
- `assets/`: the earlier versions' 3D emoji, objects, channel icons and avatars, the product photos, plus the Gorgias logos and fonts.

## Placeholders

These are invented for the concept and must be replaced before real use:

- The phone number (415) 555-0130
- The customer quote from Jordan Ellis at Northbound Outdoor
- Every shopper, store and product name
- Every figure in the Gaia Hub mock and the onboarding checklist

The Gorgias brand fonts in `assets/fonts/` are licensed. Check the licence before reusing them outside gorgias.com.
