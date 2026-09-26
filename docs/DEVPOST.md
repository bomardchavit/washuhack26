# Devpost draft (edit before submitting)

**Title:** Same Moon

**Tagline:** Different time zones. Same Moon. An iMessage agent that gets families far apart to look up at the same Moon at the same moment.

**Inspiration:** The kickoff fell on Mid-Autumn Festival, when families apart comfort themselves that they're looking at the same moon. We checked the physics: often they aren't. For St. Louis and Shanghai this weekend, the overlap was about two hours.

**What it does:**
- Lives in a family's iMessage group.
- Understands "I'm at WashU, Mom's in Shanghai and prefers Chinese."
- Finds when the Moon is up for everyone during waking hours.
- At that moment, tells each person where to look in their own language.
- Shares photos live, and writes a postcard afterwards.

**How we built it:**
- A dependency-free Sun/Moon engine, validated against published moonrise tables to within 3 minutes.
- A shared-window finder and multilingual templates.
- A platform-agnostic conversation brain.
- Photon Spectrum for iMessage.
- Claude for understanding free-form messages and answering questions from engine facts only.
- Open-Meteo for geocoding and cloud cover.
- A Canvas web demo with a live moonlit world map.

**Challenges:** Making times trustworthy (we never let the model produce numbers), getting the Moon's parallax and refraction right, and writing natural lines in seven languages.

**Accomplishments:** Our moonrise and moonset times match published tables to within about 3 minutes. We used it for real on the Harvest Moon weekend (add your real run here).

**What we learned:** (fill in honestly)

**What's next:**
- Pilot with WashU international students on October's Hunter's Moon.
- WhatsApp support.
- Voice calls for grandparents.
- A printed "year of shared Moons" book.

**Built with:** javascript, node.js, canvas, photon-spectrum, imessage, claude, anthropic-api, open-meteo

**Tracks:** Main track + Photon Bonus Track

**AI disclosure:** Built during the event with AI-assisted development (Claude); see docs/BUILDLOG.md in the repo.
