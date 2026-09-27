// Same Moon: load .env from the repo root (Node 20.12+). Real environment variables win over the file.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const file = fileURLToPath(new URL('../.env', import.meta.url));
if (typeof process.loadEnvFile === 'function' && fs.existsSync(file)) process.loadEnvFile(file);
