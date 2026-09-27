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


## Recording plan: 2 minutes 30 seconds

Use this version until a real iMessage test is verified. Label terminal footage **Photon terminal provider — simulation**. The sample family is a demo roster, not a claim about the creator's family.

| Time | Screen and narration |
| --- | --- |
| 0:00–0:20 | Web hero and St. Louis–Shanghai example. “Different time zones. Same Moon. Families apart can share a moment looking at the Moon, but first it has to be above the horizon for everyone.” |
| 0:20–0:45 | Show the gold overlap window and each city's local time. “Same Moon calculates the overlap and tells each person when and where to look.” |
| 0:45–1:05 | Press “Play the next 72 hours” in the web demo. Show the moving moonlit map and family pins. |
| 1:05–1:45 | Show the terminal agent: enter the sample family, “call me Ardchavit”, “when”, “1”, then “sim”. Show the English and Chinese viewing instructions. Explain that the terminal uses numbered replies; native iMessage polls are still unverified. |
| 1:45–2:05 | Show the example postcard in the web demo. “The agent also composes a postcard from two people's photos; that two-person flow is covered by the terminal-provider test.” Do not describe these illustrated demo skies as photos from a real family run. |
| 2:05–2:30 | “The astronomy engine computes the viewing instructions. Optional Claude handles free-form language; its live API and real iMessage delivery are not tested yet. All 24 automated tests pass. Different time zones. Same Moon.” |

Record the terminal segment with paid AI explicitly disabled:

```sh
ANTHROPIC_API_KEY='' SAME_MOON_TERMINAL=1 SAME_MOON_OFFLINE=1 SAME_MOON_CLOCK=2026-09-27T10:59:00Z npm run agent
```

Upload the recording to YouTube and paste its link into Devpost. Update the narration only for live tests that actually succeeded. Never show `.env`, API keys, private message history or third-party contact details in the recording.

## Before the user-only iMessage test

- Photon credentials and free promo activation are still pending. Keep secrets in `.env`, not chat or Git.
- The adapter currently responds to all incoming conversations and resumes stored schedules. It does not yet have a self-only allowlist. Restrict the test to a verified user DM before launching, use a fresh store, and keep the optional paid AI disabled.
- The SDK can automatically share the project's contact card when profile sync is enabled. Confirm the project is restricted appropriately before starting the live provider.
- One person sending one photo can verify receipt, tapback and first-photo response; it cannot verify the two-distinct-sender postcard flow. Do not message a second person without permission.
