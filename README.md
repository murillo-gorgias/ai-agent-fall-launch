# AI Agent fall launch page

A design concept for the Gorgias AI Agent fall 2026 launch page. It announces AI Agent on WhatsApp, Instagram and Facebook, with a free 30-day trial, then covers Tone of Voice, Gaia, Helpdesk Performance analytics, Actions in Skills and the "More like this" button.

The page comes in four versions, with a switcher bar at the top of each:

- **Version 4 (the root, the default):** Version 3's look, with a short free-trial callout at the end of the Socials section, Gaia Hub first in the Gaia section, two more Gaia features (Shared chats and AI coverage), and a new Analytics section.
- **Version 3 (`v3/`):** an animated hero where messages from Instagram, Facebook and WhatsApp pile up, then shrink into a phone that AI Agent clears. The emoji are flat and drawn in the shape of the Gorgias chat icon, in the brand pastels. The AI Agent flower appears as glass in every tinted card.
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
- **Anywhere on the page:** click empty space to send a burst of reactions.
- **Tone of Voice:** drag the slider, and the same reply retypes itself from formal to playful.
- **Gaia Hub:** approve or dismiss an opportunity, and the next one slides in.
- **Shared chats:** copy the link to a Gaia chat.
- **AI coverage:** link a skill to an intent, and switch an intent between AI Agent and your team.
- **Actions in Skills:** drag an action into a step, or click one. Fill both steps to watch AI Agent run the skill.
- **More like this:** switch between Before and After, and press the button to show the look-alikes.
- **Floating emoji:** drag any floating emoji and let go. It springs back to its place.

Visitors who turn on reduced motion in their system settings get a still version of the page.

## Files

- `index.html`, `styles.css`, `app.js`: version 4. The colour, type and easing values mirror the tokens in `gorgias/gorgias-website-components` (`src/tokens/brand.css`). The physics uses [Matter.js](https://brm.io/matter-js/), loaded from cdnjs.
- `v3/`, `v2/` and `v1/`: the earlier versions, each with its own three files.
- `versions.css`: the version switcher bar, shared by all four.
- `assets/v3/`: version 3's bubble emoji (SVG) and channel icons.
- `assets/v4/`: version 4's trial and Gaia Hub photos, the AI coverage product screen (exported from Figma at 2x), the customer logos (`logos/`, 2x PNG) and the Shopify mark.
- `assets/`: the earlier versions' 3D emoji, objects, channel icons and avatars, the product photos, plus the Gorgias logos and fonts.

## Placeholders

These are invented for the concept and must be replaced before real use:

- The customer quote from Jordan Ellis at Northbound Outdoor
- The customer logo strip before the close: logos from the Gorgias customer logo library, final set pending PMM
- Every shopper, store and product name
- Every figure in the Gaia Hub, AI coverage and Analytics mocks and the onboarding checklist
- The phone number (415) 555-0130 in versions 1 to 3

The Gorgias brand fonts in `assets/fonts/` are licensed. Check the licence before reusing them outside gorgias.com.
