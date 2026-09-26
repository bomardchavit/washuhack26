# Same Moon 🌕

**Different time zones. Same Moon.**

Same Moon is an AI agent that lives in your family's iMessage group. It finds the moments when everyone, however far apart, can see the same Moon at the same time. At that moment it tells each person exactly where to look, in their own language, then turns everyone's photos into one shared memory.

Built for the HackWashU Fall AI Build Challenge (September 25–27, 2026), prompt: *Fly Me to the Moon*.

## Why

For a thousand years, people separated at Mid-Autumn have comforted themselves with one thought: at least we are looking at the same moon. Su Shi's Mid-Autumn poem (1076) ends on it: 但愿人长久，千里共婵娟.

Physics says that's only sometimes true. Everyone on Earth sees the same phase at the same moment, but whether the Moon is above *your* horizon depends on where you stand. This weekend, a student in St. Louis and a parent in Shanghai can both see the Harvest Moon for about two hours: from 5:20 to 7:25 AM Sunday in St. Louis, when it's setting there while it rises over dinner in Shanghai.

International students feel this most. In interviews with 200 international students, two-thirds reported loneliness or isolation, especially in their first months, including "cultural loneliness" from losing their familiar culture and language (Sawir et al., 2008). Research on shared attention finds that experiences shared *at the same time* feel more intense, but only when the other person feels close (Boothby, Clark & Bargh, 2014; Boothby et al., 2016). So Same Moon's job isn't just the calculation. It's making the other person feel present.

## What it does

1. Someone adds Same Moon to the family group chat and types how they'd naturally say it: *"I'm at WashU, Mom's in Shanghai and prefers Chinese, Jia's in Toronto."*
2. It finds the next times the Moon is up for everyone during waking hours (skipping cloudy ones when online), and posts the options.
3. At the chosen moment it posts one message with a line for each person in their language: which direction to face, how high to look ("about one fist above the horizon"), and whether the Moon is rising or setting for them.
4. As photos arrive it shares them live: *"📷 Mom's Moon, rising over Shanghai at 7:02 PM. Ethan, that's the same Moon setting in your west right now."*
5. It writes a postcard caption ("11,600 km apart. One Moon."), and the web app composes the image.
6. Then it goes quiet until the next shared Moon.

## Try it in 30 seconds

| What | Command |
| --- | --- |
| Web demo (open `web/index.html`, or serve the repo) | `npm run web`, then open http://localhost:5173/web/ |
| Scripted group-chat story, no accounts needed | `npm run demo` |
| Interactive chat simulator | `npm run sim` |
| Tests (checks against published moonrise tables) | `npm test` |
| Real iMessage agent through Photon | `cp .env.example .env`, fill it in, `npm install`, then `npm run agent` |

To publish the web demo on GitHub Pages: open Settings, then Pages, then "Deploy from branch", pick `main` and `/ (root)`. The root `index.html` redirects to `web/`.

## How it works

**Physics does the facts; AI does the talking.**

- `engine/astro.js`: Sun and Moon positions from orbital elements with the main lunar perturbation terms, topocentric parallax, and refraction. No dependencies; runs in the browser and in Node. Checked against published St. Louis tables for September 2026 in `test/engine.test.js`:
  - moonrise and moonset within 3 minutes (most exact to the minute)
  - full-moon time within 2 minutes
  - transit altitude within 0.2°
- `engine/windows.js`: samples every person's sky every 5 minutes and finds the stretches when the Moon is at least 5° up for everyone during waking hours. "Night owls" are exempt from the waking-hours rule.
- `engine/messages.js`: direction, height and rising/setting in 7 languages (English, 中文, Español, 한국어, Tiếng Việt, 日本語, Français). Every number comes from the engine.
- `engine/parse.js`: understands "Mom's in 上海" and "I'm at WashU" without a model. Includes 95 cities, native-script names, and aliases.
- `agent/brain.mjs`: the conversation. Platform-agnostic: chat events go in, actions come out.
- `agent/llm.mjs` (optional): Claude handles messages the rules can't parse, and answers free-form questions ("why can't Grandma see it now?") using only facts the engine hands it.
- `agent/photon.mjs`: delivers the brain over iMessage with Photon Spectrum. It sends real group messages, reacts to photos, and a scheduler fires each moment on time.
- `engine/online.js`: free Open-Meteo lookups for any town on Earth and hourly cloud cover. Everything still works offline.

## Privacy and restraint

- City names only: no GPS, no contacts, no message history.
- It messages a few times a month, around shared Moons, and "stop" silences it.
- It asks which language someone prefers instead of guessing from names.

## What we don't claim

We don't claim it cures loneliness. We're testing whether a shared, simultaneous moment feels different from a photo sent later. Visibility also depends on buildings, trees and weather that no model can see from a city name.

## Built with

Node.js, plain JavaScript and Canvas (no framework), Photon Spectrum (`spectrum-ts`) for iMessage, Claude (Anthropic API) for language understanding, Open-Meteo for geocoding and cloud forecasts, world-atlas / Natural Earth for the map outline.

**AI disclosure:** this project was built during the event with AI-assisted development (Claude). See `docs/BUILDLOG.md`.

## Team

_Add your names here._
