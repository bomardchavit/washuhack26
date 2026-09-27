# Devpost draft (edit before submitting)

**Title:** Same Moon

**Tagline:** Different time zones. Same Moon. An iMessage agent that gets families far apart to look up at the same Moon at the same moment.

**Links:** Live demo https://bomardchavit.github.io/washuhack26/ · Code https://github.com/bomardchavit/washuhack26

**Inspiration:** The kickoff fell on Mid-Autumn Festival, when families apart comfort themselves that they're looking at the same moon. We checked the physics: often they aren't. For St. Louis and Shanghai this weekend, the overlap was about two hours.

**What it does:**
- Lives in a family's iMessage group.
- Understands "I'm at WashU, Mom's in Shanghai and prefers Chinese."
- Finds when the Moon is up for everyone during waking hours, and offers the options as a reply-with-a-number list and a native poll.
- At that moment, tells each person where to look in their own language: which direction, how many fists above the horizon, rising or setting.
- Shares photos live ("that's the same Moon setting in your west right now"), then sends a postcard image made from both photos: names, cities, local times, "11,600 km apart. One Moon."

**How we built it:**
- **Moon engine.** A dependency-free Sun/Moon engine, validated against published St. Louis tables: moonrise and moonset within a minute, full-moon time within 3 minutes.
- **Windows and messages.** A shared-window finder, plus message templates in 7 languages. Every time, direction and height comes from the engine.
- **Brain.** A platform-agnostic conversation brain: chat events in, actions out.
- **Photon Spectrum (`spectrum-ts`) for iMessage.** We checked our adapter against the SDK's type definitions and tested the whole flow through Spectrum's terminal provider, with two family members sending photos.
- **Claude Haiku 4.5, through the Anthropic SDK.** It reads messages the rules can't parse and answers questions from engine facts. The brain refuses to send an answer containing a time, angle or percentage the engine didn't compute.
- **The postcard.** One drawing function shared by the web demo and the agent (`@napi-rs/canvas` on the server, with iPhone HEIC support).
- **Open-Meteo** for geocoding and cloud cover.
- **A Canvas web demo** with a live moonlit world map.
- **Tests.** 24 automated tests, runnable with no accounts or API keys.

**Challenges:**
- Making times trustworthy: the model never produces numbers, and we check what it says.
- Getting the Moon's parallax and refraction right.
- Writing natural lines in seven languages.
- iMessage doesn't give bots anyone's name, so the agent has to ask.

**Accomplishments:** Our moonrise and moonset times match published tables to within about a minute. (Add your real Harvest Moon run here, only if it happened.)

**What we learned:** (fill in honestly)

**What's next:**
- Pilot with WashU international students on October's Hunter's Moon.
- WhatsApp support.
- Voice calls for grandparents.
- A printed "year of shared Moons" book.

**Built with:** javascript, node.js, canvas, photon-spectrum, imessage, claude, anthropic-api, open-meteo

**Tracks:** Main track + Photon Bonus Track

**AI disclosure:** Built during the event with AI-assisted development (Claude); see docs/BUILDLOG.md in the repo.

**Before submitting, check:** the iMessage run through Photon (docs/DEMO.md). Until it has happened, say "tested through Photon's terminal provider" rather than "tested in iMessage".
