import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dbRepo, verifyPassword } from '../server/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Running Teeto Labels CI verification checks...');

const db = dbRepo.readAll();

// 1. Validate store config & WhatsApp setup
assert.ok(db.config && db.config.brandName === 'Teeto Labels', 'Store brandName must be Teeto Labels');
assert.ok(db.config.whatsappNumber, 'WhatsApp number must be configured');

// 2. Validate dynamic categories & subcategories
assert.ok(Array.isArray(db.categories) && db.categories.length >= 2, 'At least 2 categories required');
for (const cat of db.categories) {
  assert.ok(cat.id && cat.name, `Category must have id and name`);
  assert.ok(Array.isArray(cat.subcategories) && cat.subcategories.length > 0, `Category ${cat.name} must have subcategories`);
}

// 3. Validate products, sizes, and media (images & videos)
assert.ok(Array.isArray(db.products) && db.products.length > 0, 'Store must have products');
for (const prod of db.products) {
  assert.ok(prod.id && prod.name, 'Product must have id and name');
  assert.ok(Array.isArray(prod.sizes) && prod.sizes.length > 0, `Product ${prod.name} must have selectable sizes`);
  assert.ok(Array.isArray(prod.media) && prod.media.length > 0, `Product ${prod.name} must have media items`);
}

// 4. Validate Admin & Superadmin roles
const superadmin = db.users.find((u) => u.role === 'superadmin');
const admin = db.users.find((u) => u.role === 'admin');
assert.ok(superadmin, 'Superadmin account must exist');
assert.ok(admin, 'Admin account must exist');
assert.ok(verifyPassword('superadmin123', superadmin.passwordHash), 'Superadmin password hash verification failed');
assert.ok(verifyPassword('admin123', admin.passwordHash), 'Admin password hash verification failed');

// 5. Validate built dist/ folder exists
const distIndex = path.join(__dirname, '..', 'dist', 'index.html');
const distStoreJson = path.join(__dirname, '..', 'dist', 'store-data.json');
assert.ok(fs.existsSync(distIndex), 'dist/index.html must exist after build');
assert.ok(fs.existsSync(distStoreJson), 'dist/store-data.json must exist after build');

console.log('✓ All Teeto Labels CI checks passed successfully!');
