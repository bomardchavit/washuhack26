// Same Moon: optional AI layer (Claude via the Anthropic Messages API).
// Rule: the model never produces times, directions, or altitudes. The engine computes those;
// the model only understands messy human input and answers questions from facts we hand it.
const API = 'https://api.anthropic.com/v1/messages';

export function createLLM({
  apiKey = process.env.ANTHROPIC_API_KEY,
  model = process.env.SAME_MOON_MODEL || 'claude-haiku-4-5-20251001'
} = {}) {
  if (!apiKey) return null;

  async function call(system, user, maxTokens = 500) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] })
    });
    if (!res.ok) throw new Error('LLM ' + res.status + ': ' + (await res.text()).slice(0, 200));
    const data = await res.json();
    return data.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  }

  /** "my nana's back home near Oaxaca, she only reads Spanish" -> [{name, self, place, language}] */
  async function parsePeople(text) {
    const system = 'You extract who is where from a family group-chat message. Respond with ONLY JSON, no prose, no code fences: ' +
      '{"people":[{"name":string|null,"self":boolean,"place":string,"language":"en"|"zh"|"es"|"ko"|"vi"|"ja"|"fr"|null}]}. ' +
      '"self" is true for the person writing. "place" is a town or city name suitable for a geocoder. Only include people with a place.';
    const raw = await call(system, text, 400);
    const json = JSON.parse(raw.replace(/```json|```/g, '').trim());
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
