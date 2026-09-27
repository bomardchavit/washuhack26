# Demo runbook

## Real shared Moons this weekend (computed by our engine)

St. Louis moonrise: Sat Sep 26 6:41 PM, Sun Sep 27 7:07 PM. Moonset: Sun 7:54 AM.

| St. Louis with | When it's shared (St. Louis time / their time) |
| --- | --- |
| Shanghai | Sun 5:20–7:25 AM / Sun 6:20–8:25 PM (setting here, rising there) |
| Seoul | Sun 4:55–7:25 AM / Sun 6:55–9:25 PM |
| Mumbai | Sat 7:15–7:55 PM / Sun 5:45–6:25 AM (rising here, setting there) |
| London | Sat 7:15 PM–1:15 AM / Sun 1:15–7:15 AM |
| Mexico City | most of Saturday night |

These are geometry only (Moon at least 5° up for both). Rerun `npm run sim` with your real cities.

## Tonight and tomorrow morning

1. Tonight: go outside at moonrise (6:41 PM) and screen-record the web demo with the real family's cities.
2. Sunday dawn, if anyone has family in East Asia: do the real run. Record everything: the message, the photos, the postcard. That footage is your demo video.
   - The agent has to be running when the moment arrives. It checks every 20 seconds, and a moment scheduled before a restart still goes out. Keep the laptop plugged in and awake with `caffeinate -i npm run agent`, or macOS will sleep through dawn.

## Stage setup

- Laptop: web demo open (https://bomardchavit.github.io/washuhack26/ or `npm run web`), with the family preset in the URL (the app saves it in the link).
- The world map ships with the repo, so the map works on bad Wi-Fi. Without internet, the page falls back to system fonts.
- Phone mirrored with QuickTime (File, then New Movie Recording, then pick the iPhone as camera) if the Photon agent is live.
- To replay a moment live: `SAME_MOON_CLOCK=2026-09-27T10:59:00Z npm run agent` starts the agent's clock just before Sunday's dawn window, and every moment it sends is labeled `[Simulation]`.
- Fallbacks: `SAME_MOON_TERMINAL=1 npm run agent` (the real agent in Photon's terminal chat), or `npm run demo` in a big terminal font. Never fake a live moment; label simulations.
