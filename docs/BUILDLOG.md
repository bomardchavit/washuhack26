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

## How we built it

We used Claude (Anthropic) as an AI pair programmer throughout: the team chose the idea, directed the design and reviewed the output, and Claude wrote most of the code. This follows the event rules' guidance to disclose AI tools.

## Still to do (team)

- [ ] Push to GitHub and turn on GitHub Pages
- [ ] Photon: create a project with promo code HACKWITHPHOTON, fill in .env, run `npm run agent`, test in a real iMessage group
- [ ] Real Harvest Moon run with a family member abroad (see docs/DEMO.md), recorded for the video
- [ ] Add team names to README and Devpost
- [ ] Record a 2-minute demo video; submit on Devpost before Sunday 10:00 AM CT (rules page) and select the Photon track
