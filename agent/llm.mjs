// Same Moon: optional AI layer (Claude, through the official Anthropic SDK).
// Rule: the model never produces times, directions, or altitudes. The engine computes those;
// the model only understands messy human input and answers questions from facts we hand it,
// and the brain checks every clock time, angle and percentage in an answer against those facts.

export function createLLM({
  apiKey = process.env.ANTHROPIC_API_KEY,
  model = process.env.SAME_MOON_MODEL || 'claude-haiku-4-5-20251001',
  fetch // optional: tests pass a mock so they never need a key or the network
} = {}) {
  if (!apiKey) return null;

  let client; // loaded on first use, so the offline demo runs without npm install
  async function anthropic() {
    if (!client) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      // A family chat can't wait long: 15 s per attempt and one retry, then the rules-only reply takes over.
      client = new Anthropic({ apiKey, timeout: 15_000, maxRetries: 1, ...(fetch ? { fetch } : {}) });
    }
    return client;
  }

  async function call(system, user, maxTokens) {
    const res = await (await anthropic()).messages.create({
      model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }]
    });
    if (res.stop_reason !== 'end_turn' && res.stop_reason !== 'stop_sequence') throw new Error('LLM stopped: ' + res.stop_reason);
    return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  }

  /** "my nana's back home near Oaxaca, she only reads Spanish" -> [{name, self, place, language}] */
  async function parsePeople(text) {
    const system = 'You extract who is where from a family group-chat message. Respond with ONLY JSON, no prose, no code fences: ' +
      '{"people":[{"name":string|null,"self":boolean,"place":string,"language":"en"|"zh"|"es"|"ko"|"vi"|"ja"|"fr"|null}]}. ' +
      '"self" is true for the person writing. "place" is a town or city name suitable for a geocoder. Only include people with a place.';
    const raw = await call(system, text, 400);
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
    return Array.isArray(json.people) ? json.people : [];
  }

  /** Answer a free-form question using only engine-computed facts. */
  async function answer(question, facts) {
    const system = 'You are Same Moon, a warm assistant in a family group chat that helps people far apart look at the Moon together. ' +
      'Answer in at most 3 short sentences, in the language of the question. Use ONLY the facts provided for any time, direction, ' +
      'altitude or date. If the facts do not answer it, say so and suggest saying "when". Never invent numbers.';
    return call(system, 'FACTS:\n' + JSON.stringify(facts, null, 1) + '\n\nQUESTION: ' + question, 300);
  }

  return { parsePeople, answer, model };
}
