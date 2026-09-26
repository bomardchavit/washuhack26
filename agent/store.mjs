// Same Moon: tiny JSON file store so families and schedules survive restarts.
import fs from 'node:fs';
import path from 'node:path';

export function fileStore(file = path.join(path.dirname(new URL(import.meta.url).pathname), 'data', 'families.json')) {
  return {
    load() {
      try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
    },
    save(data) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file + '.tmp', JSON.stringify(data, null, 2));
      fs.renameSync(file + '.tmp', file);
    }
  };
}
