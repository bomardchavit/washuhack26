# Build log

All work happened during the HackWashU Fall AI Build Challenge build window. Git commit timestamps are real and were not edited.

| Time (UTC) | St. Louis | What |
| --- | --- | --- |
| 2026-09-26 17:43 | Sat 12:43 PM | Project started. Picked the Same Moon idea (theme: Fly Me to the Moon). |
| 2026-09-26 ~18:00 | Sat 1:00 PM | Moon engine written and validated against published St. Louis moonrise tables (within ~2 min). |
| 2026-09-26 ~18:30 | Sat 1:30 PM | Shared-window finder, 7-language messages, family sentence parser. |
| 2026-09-26 ~23:00 | Sat 6:00 PM | Group-chat brain, offline simulator, Photon iMessage adapter, optional Claude layer. |
| 2026-09-26 23:26 UTC | Sat evening | Web demo, tests (9 passing), README, pitch, Devpost draft. First commits. |
| 2026-09-27 02:31 UTC | Sat 9:31 PM | Second session (Claude Code, now with network). Re-ran tests (9 passing) and `npm run demo`. Committed the world map (`web/land-110m.json`) so the map no longer depends on a CDN. |
| 2026-09-27 02:36 UTC | Sat 9:36 PM | Turned on GitHub Pages (main, root): https://bomardchavit.github.io/washuhack26/. Checked it in headless Chrome: the map loads from the site itself, all fonts load, and the only console error was a missing favicon, so we added one. |
| 2026-09-27 02:48 UTC | Sat 9:48 PM | Photon adapter checked against the installed spectrum-ts 12.10 type definitions and fixed. iMessage senders have no display name, so the brain now asks "what should I call you?". `.env` is now actually loaded. Reactions go to the photo that triggered them. Scheduled moments survive a restart (`space.get`). Sender handles are hashed before storage. Tested through the real terminal provider: plain mode, the interactive tuichat UI in a pseudo-terminal, and a new end-to-end test (`test/photon.test.mjs`) with a scripted stand-in for tuichat, so two family members can send photos. 10 tests passing. |
| 2026-09-27 02:59 UTC | Sat 9:59 PM | Real postcard image. The web demo's drawing code moved to `web/draw.js`, and headless Chrome confirmed every web canvas is pixel-identical before and after the move. The agent now uses the same code with @napi-rs/canvas and the same fonts (bundled under OFL) to compose both photos side by side, then sends the result with Spectrum's `attachment()`. The text caption still follows. HEIC is converted with macOS `sips`, EXIF rotation is respected, a photo that can't be read becomes that person's painted sky, and names in Chinese, Korean and Vietnamese render. Photos stay in memory and are never written to disk. 16 tests passing. |

## How we built it

We used Claude (Anthropic) as an AI pair programmer throughout: the team chose the idea, directed the design and reviewed the output, and Claude wrote most of the code. This follows the event rules' guidance to disclose AI tools.

## Still to do (team)

- [ ] Push to GitHub and turn on GitHub Pages
- [ ] Photon: create a project with promo code HACKWITHPHOTON, fill in .env, run `npm run agent`, test in a real iMessage group
- [ ] Real Harvest Moon run with a family member abroad (see docs/DEMO.md), recorded for the video
- [ ] Add team names to README and Devpost
- [ ] Record a 2-minute demo video; submit on Devpost before Sunday 10:00 AM CT (rules page) and select the Photon track
