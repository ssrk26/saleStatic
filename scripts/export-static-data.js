import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbRepo } from '../server/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'store-data.json');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

const publicStoreData = dbRepo.getPublicStoreData();
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(publicStoreData, null, 2), 'utf-8');
console.log(`Exported public store data to ${OUTPUT_FILE} (${publicStoreData.products.length} products, ${publicStoreData.categories.length} categories).`);
