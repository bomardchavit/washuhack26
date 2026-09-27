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
| 2026-09-27 03:01 UTC | Sat 10:01 PM | Native polls: every list of shared Moons also goes out as a Spectrum `poll()`, and a vote (`poll_option`) counts as replying "1"–"3". Where a platform skips polls (the terminal does, with a warning), the agent stops trying in that chat and "reply 1–3" still works. The mapping is unit-tested, but it has **not been tried in real iMessage yet** (that needs Photon keys). 18 tests passing. |
| 2026-09-27 03:06 UTC | Sat 10:06 PM | Claude layer moved to the official Anthropic SDK. It loads lazily, so the offline demo still needs no install. It has a 15-second timeout and one retry, so a stalled API call can't freeze the chat. Same prompts and model (Claude Haiku 4.5). The brain now enforces "the model never invents numbers": every clock time, angle and percentage in an answer must appear in the engine's facts, or the answer isn't sent. A language code the model makes up now falls back to English instead of crashing the roster. 6 new tests use a mocked `fetch`, so `npm test` needs no key and costs nothing. **Not yet run against the real API** (no key available). 24 tests passing. |
| 2026-09-27 03:09 UTC | Sat 10:09 PM | Phone layout. Checked in headless Chrome at 360, 390 and 768 px. Long city names were widening the people list, window cards couldn't wrap, and the timeline's hour labels collided. The page now fits every width tested with no horizontal scroll. The timeline thins its labels to fit (6-hourly on desktop, 12-hourly or day names on phones). Desktop canvases are pixel-identical to before. |
| 2026-09-27 03:13 UTC | Sat 10:13 PM | README, Devpost draft and demo runbook updated to match what has actually been tested: live demo link, screenshots, and a "what's tested / not yet" section. We re-measured the accuracy claims: moonrise and moonset are within 1 minute of the six published times, and the full-moon time is 2.5 minutes off, so "within 2 minutes" became "within 3". The city count is 98, not 95. Correction to the 02:59 entry: iPhone HEIC photos pass through a temporary file for `sips` conversion, which is deleted right away, so photos aren't strictly "never written to disk". |

## How we built it

We used Claude (Anthropic) as an AI pair programmer throughout: the team chose the idea, directed the design and reviewed the output, and Claude wrote most of the code. This follows the event rules' guidance to disclose AI tools.

## Still to do (team)

- [x] Push to GitHub and turn on GitHub Pages
- [ ] Photon: create a project with promo code HACKWITHPHOTON, fill in .env, run `npm run agent`, test in a real iMessage group
- [ ] Real Harvest Moon run with a family member abroad (see docs/DEMO.md), recorded for the video
- [ ] Add team names to README and Devpost
- [ ] Record a 2-minute demo video; submit on Devpost before Sunday 10:00 AM CT (rules page) and select the Photon track
