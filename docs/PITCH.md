# Five-minute finalist pitch

**0:00 Hook (40 s).** If a teammate has family abroad, they open with their own story. Then:
"Friday was Mid-Autumn Festival. For a thousand years, people apart have told themselves: at least we're looking at the same moon. Su Shi wrote it in 1076: 但愿人长久，千里共婵娟. We checked the physics. For me in St. Louis and my mom in Shanghai, it's true for about two hours, when it's setting here at dawn and rising over dinner there."
(Show the timeline with the gold window.)

**0:40 Problem (20 s).** "Two-thirds of international students report loneliness, especially in their first months. And a photo sent later isn't the same as looking up together. Research on shared attention says moments shared at the same time feel stronger, but only when the other person feels close."

**1:00 Demo (2 min).**
1. On the projector (iPhone mirrored with QuickTime, or the web demo), type: "I'm at WashU, Mom's in Shanghai and prefers Chinese, Jia's in Toronto."
2. Show the options, reply "1", then "sim": each person's line appears in their language.
3. Play the real Harvest Moon footage recorded Sunday dawn: Mom's photo arriving, the "same Moon setting in your west" line, the postcard.
4. On the web demo, press "Play the next 72 hours": the moonlit half of Earth slides west and the family pins light up.

**3:00 How it works (60 s).**
- "Physics does the facts, AI does the talking. Our engine matches published moonrise tables to within three minutes; the model never produces a time or a direction."
- "It lives in iMessage through Photon, so Grandma installs nothing."
- "City names only, and it messages a few times a month."
- Say what you don't claim.

**4:00 Competition and what's next (60 s).**
- "The calculation exists; there's a calculator online called TogetherMoon. Nobody opens a calculator to feel close to their mom."
- "Next: WashU's international student community, piloting on the Hunter's Moon in late October; WhatsApp through the same Photon agent for families without iPhones; voice calls for grandparents who don't text."
- Close: "Different time zones. Same Moon."

# Two-minute table demo (preliminary judging)

1. Run `npm run demo` or type in the web demo.
2. Show the gold window on the timeline, explain the rising/setting line, show the Chinese line.
3. Show the postcard.
4. Offer: "Tell me where someone you love lives." Change a city in the web demo live.

# Likely judge questions

- **"How accurate is it?"** Within about 3 minutes of published moonrise tables; `npm test` checks it. The remaining error mostly comes from horizons and buildings, which we mention.
- **"Why not just text a photo?"** Timing. Being told "look now, she's looking too" turns a photo into a shared moment. We designed for presence: live photo relay, each person's own language.
- **"Would people use it more than once?"** The Moon has a built-in rhythm: full Moons monthly, plus Mid-Autumn, Chuseok, Tsukimi, Diwali and more. It's a ritual, not an engagement loop.
- **"Where's the AI?"** It reads messy multilingual messages, answers questions grounded in engine facts, and is designed to never state numbers the engine didn't compute.
