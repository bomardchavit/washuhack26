# Devpost draft — saved, not submitted

**Event:** https://hackwashu-fall-ai-2026.devpost.com/

**Edit draft:** https://devpost.com/submit-to/31137-hackwashu-fall-ai-build-challenge/manage/submissions/1200415-same-moon/project_details/edit

**Project name:** Same Moon

**Elevator pitch:** Different time zones. Same Moon. An iMessage agent that finds when a family far apart can see the same Moon, then tells each person where to look, in their own language.

**Try it out:** https://bomardchavit.github.io/washuhack26/ and https://github.com/bomardchavit/washuhack26

**Built with:** javascript, node.js, html5, css3, canvas, photon-spectrum, imessage, claude, anthropic-api, open-meteo, github-pages. Devpost normalized the github-pages tag to github when saving.

**Team:** Ardchavit Pattanapaisal (bomardchavit), solo. Verified against Devpost and confirmed by the creator.

**Thumbnail:** saved using docs/img/web-hero.jpg and verified in the project overview.

**Video:** https://youtu.be/C0xMxBDkJ1E — narrated demo (about 2:31, 1080p), uploaded as Unlisted with user approval. Saved in the Devpost draft and verified in the project preview; see docs/VIDEO.md. Final submission remains pending.

**Gallery:** uploaded all four existing screenshots, in this order: web-hero.jpg, web-postcard.jpg, web-timeline-map.jpg, web-phone.jpg. Captions identify the web demo and example postcard.

**Tracks intended:** Main track + Photon Bonus Track. No track selector appeared in the overview, details, or final review page. Photon-track enrollment is not confirmed; ask the organizer how to opt in. Do not infer enrollment from the photon-spectrum tag.

**Submission status:** 3/4 steps, Draft. Final terms checkbox left unchecked and Submit project was not pressed. Deadline is Sunday September 27, 10:00 AM Central, per the rules and final review reminder, despite the site's noon countdown.

---

## Inspiration
The kickoff fell on Mid-Autumn Festival, when families apart comfort themselves that they're looking at the same moon. Su Shi wrote it in 1076: 但愿人长久，千里共婵娟. We checked the physics: often they aren't. For a student in St. Louis and a parent in Shanghai this weekend, the overlap was about two hours: setting at dawn in St. Louis while it rises over dinner in Shanghai.

## What it does
- Lives in a family's iMessage group. Someone types it the way they'd say it: "I'm at WashU, Mom's in Shanghai and prefers Chinese, Jia's in Toronto."
- Finds the next times the Moon is up for everyone during waking hours (skipping cloudy ones when online), and offers them as a numbered list and a native poll.
- At that moment, tells each person where to look in their own language (7 languages): which direction, how many fists above the horizon, rising or setting.
- Shares photos live ("that's the same Moon setting in your west right now"), then sends a postcard image made from both photos: names, cities, local times, "11,600 km apart. One Moon."
- Then goes quiet until the next shared Moon. City names only; phone numbers are hashed before anything is stored.

## How we built it
- **Moon engine:** a dependency-free Sun/Moon engine. Moonrise and moonset match six published St. Louis times to within a minute; the full-moon time is within 3 minutes.
- **Windows and messages:** a shared-window finder plus message templates in 7 languages. Every time, direction and height comes from the engine, never from the model.
- **Photon Spectrum (spectrum-ts) for iMessage:** we checked our adapter against the SDK's type definitions and tested the whole flow through Spectrum's terminal provider, including two family members sending photos.
- **Claude Haiku 4.5 (Anthropic SDK):** understands messages our rules can't parse and answers questions from engine facts. A basic numeric consistency check rejects some mismatched clock times, angles and percentages; it does not guarantee that a free-form answer is correct. This layer has been tested with a mocked API, not yet with live Claude calls.
- **The postcard:** one drawing function shared by the web demo and the agent (@napi-rs/canvas on the server, with iPhone HEIC support).
- **Open-Meteo** for geocoding and cloud cover; a Canvas web demo with a live moonlit world map.
- 24 automated tests that run with no accounts or API keys.

## Challenges we ran into
- Making times trustworthy: viewing instructions come from deterministic engine templates. Free-form AI answers still need stronger validation.
- Getting the Moon's parallax and refraction right.
- Writing natural lines in seven languages.
- iMessage doesn't give bots anyone's name, so the agent has to ask.

## Accomplishments that we're proud of
- Moonrise and moonset match published tables to within about a minute.
- The full group-chat flow runs end to end through Photon's terminal provider, from the first message to the postcard image. Real iMessage delivery and a real family run remain untested.
- The web demo works on phones and desktops with zero console errors.

## What we learned
- "The same Moon" is rarer than the saying suggests: for St. Louis and Shanghai it's a two-hour window, at dawn for one person and dinner for the other.
- Keeping an AI honest about numbers takes checking, not just prompting.
- Chat platforms hide a lot, like names, so the conversation has to be designed around what the bot can actually know.

## What's next for Same Moon
- Pilot with WashU international students on October's Hunter's Moon.
- WhatsApp support.
- Voice calls for grandparents.
- A printed "year of shared Moons" book.

**AI disclosure:** built during the event with AI-assisted development (Claude), with Codex assisting final verification and submission preparation; see docs/BUILDLOG.md in the repo.
