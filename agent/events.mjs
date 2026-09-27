// Same Moon: turn Spectrum messages (spectrum-ts 12.x shapes) into events for the brain.
import { createHash } from 'node:crypto';

/** A stable anonymous id per person: phone numbers and emails never reach the store. */
export function personId(user) {
  return user && user.id ? createHash('sha256').update(String(user.id)).digest('hex').slice(0, 16) : 'unknown';
}

const IMAGE = /^image\//i, IMAGE_NAME = /\.(heic|heif|jpe?g|png|webp|gif)$/i;

/**
 * message.content is {type:'text', text} | {type:'attachment', name, mimeType, read()} |
 * {type:'poll_option', option:{title}, selected} | reactions, typing, ...
 * Returns a brain event, or null for things the brain doesn't need.
 */
export function toEvent(spaceId, message, at = new Date()) {
  const c = message.content || {};
  const evt = { spaceId, senderId: personId(message.sender), at };
  if (c.type === 'text') evt.text = c.text;
  else if (c.type === 'attachment' && (IMAGE.test(c.mimeType || '') || IMAGE_NAME.test(c.name || ''))) {
    evt.attachment = { name: c.name, mimeType: c.mimeType, read: () => c.read() };
  } else if (c.type === 'poll_option' && c.selected) {
    const pick = /^(\d)\)/.exec((c.option && c.option.title) || ''); // our poll options start "1)", "2)", ...
    if (!pick) return null;
    evt.text = pick[1];
  } else return null; // reactions, typing, stickers, un-votes, ...
  return evt;
}
