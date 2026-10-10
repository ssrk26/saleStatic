import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dbRepo, DB_FILE, hashPassword, verifyPassword } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'teeto-labels-secret-key-2026';

// Ensure uploads directory exists for storing product images & videos
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Configure Multer for multiple image and video uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 40);
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeBase}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max per video/image
});

// Lightweight signed token helpers (0 external auth dependencies)
function createToken(user) {
  const payload = Buffer.from(
    JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    })
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expectedSig = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payload)
    .digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (decoded.exp < Date.now()) return null;
    return decoded;
  } catch {
    return null;
  }
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Middleware: Require Admin or Superadmin
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized. Please log in as Admin or Superadmin.' });
  }
  const db = dbRepo.readAll();
  const liveUser = db.users.find((u) => u.id === decoded.id && u.active);
  if (!liveUser || !['admin', 'superadmin'].includes(liveUser.role)) {
    return res.status(401).json({ error: 'Account inactive or invalid role.' });
  }
  req.user = {
    id: liveUser.id,
    username: liveUser.username,
    name: liveUser.name,
    role: liveUser.role
  };
  next();
}

// Middleware: Require Superadmin ONLY (for adding/managing Admin logins)
function requireSuperadmin(req, res, next) {
  requireAdmin(req, res, () => {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({
        error: 'Access Denied: Only Superadmins are permitted to create or manage Admin login accounts.'
      });
    }
    next();
  });
}

// ============================================================================
// PUBLIC STOREFRONT ENDPOINTS (No Customer Login Needed)
// ============================================================================

app.get('/api/store', (_req, res) => {
  const data = dbRepo.getPublicStoreData();
  res.json(data);
});

app.post('/api/orders/whatsapp-log', (req, res) => {
  const { customerName, customerPhone, customerAddress, notes, items, subtotal, shipping, total, whatsappUrl } = req.body;
  const db = dbRepo.readAll();
  const orderRecord = {
    id: `TL-${Math.floor(100000 + Math.random() * 900000)}`,
    customerName: customerName || 'Guest Shopper',
    customerPhone: customerPhone || '',
    customerAddress: customerAddress || '',
    notes: notes || '',
    items: Array.isArray(items) ? items : [],
    subtotal: Number(subtotal) || 0,
    shipping: Number(shipping) || 0,
    total: Number(total) || 0,
    whatsappUrl: whatsappUrl || '',
    status: 'Initiated on WhatsApp',
    createdAt: new Date().toISOString()
  };
  db.whatsappOrders = [orderRecord, ...(db.whatsappOrders || [])].slice(0, 200);
  dbRepo.writeAtomic(db);
  res.status(201).json({ order: orderRecord });
});

// ============================================================================
// AUTHENTICATION ENDPOINTS (Admin & Superadmin Only)
// ============================================================================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  const db = dbRepo.readAll();
  const user = db.users.find(
    (u) => u.username.toLowerCase() === String(username).trim().toLowerCase()
  );
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  if (!user.active) {
    return res.status(403).json({ error: 'This admin account has been deactivated by a Superadmin.' });
  }
  const token = createToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    }
  });
});

app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({ user: req.user });
});

// ============================================================================
// ADMIN ENDPOINTS: STORE & WHATSAPP CONFIGURATION
// ============================================================================

app.put('/api/admin/config', requireAdmin, (req, res) => {
  const db = dbRepo.readAll();
  const allowedFields = [
    'brandName',
    'tagline',
    'whatsappNumber',
    'whatsappGreeting',
    'currencySymbol',
    'freeShippingThreshold',
    'shippingFee',
    'announcementBanner',
    'heroTitle',
    'heroSubtitle',
    'instagramHandle',
    'supportEmail',
    'storeAddress'
  ];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      db.config[field] = req.body[field];
    }
  }
  // Sanitize WhatsApp phone number to digits only for wa.me compatibility
  if (db.config.whatsappNumber) {
    db.config.whatsappNumber = String(db.config.whatsappNumber).replace(/[^0-9]/g, '');
  }
  db.config.freeShippingThreshold = Number(db.config.freeShippingThreshold) || 0;
  db.config.shippingFee = Number(db.config.shippingFee) || 0;

  dbRepo.writeAtomic(db);
  res.json({ config: db.config });
});

// ============================================================================
// ADMIN ENDPOINTS: DYNAMIC CATEGORIES & SUBCATEGORIES
// ============================================================================

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { name, description, coverImage, subcategories } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }
  const db = dbRepo.readAll();
  const slug = slugify(name);
  const newCategory = {
    id: `cat-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    name: String(name).trim(),
    slug,
    description: description || '',
    coverImage:
      coverImage ||
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80',
    subcategories: Array.isArray(subcategories)
      ? subcategories.map((sub, idx) => ({
          id: `sub-${Date.now()}-${idx}`,
          name: String(sub.name || sub).trim(),
          slug: slugify(sub.name || sub),
          description: sub.description || ''
        }))
      : []
  };
  db.categories.push(newCategory);
  dbRepo.writeAtomic(db);
  res.status(201).json({ category: newCategory, categories: db.categories });
});

app.put('/api/admin/categories/:categoryId', requireAdmin, (req, res) => {
  const { categoryId } = req.params;
  const { name, description, coverImage } = req.body;
  const db = dbRepo.readAll();
  const cat = db.categories.find((c) => c.id === categoryId);
  if (!cat) {
    return res.status(404).json({ error: 'Category not found.' });
  }
  if (name !== undefined && String(name).trim()) {
    cat.name = String(name).trim();
    cat.slug = slugify(name);
  }
  if (description !== undefined) cat.description = description;
  if (coverImage !== undefined) cat.coverImage = coverImage;

  dbRepo.writeAtomic(db);
  res.json({ category: cat, categories: db.categories });
});

app.delete('/api/admin/categories/:categoryId', requireAdmin, (req, res) => {
  const { categoryId } = req.params;
  const db = dbRepo.readAll();
  const index = db.categories.findIndex((c) => c.id === categoryId);
  if (index === -1) {
    return res.status(404).json({ error: 'Category not found.' });
  }
  db.categories.splice(index, 1);
  // Also remove products belonging to deleted category or keep them clean
  db.products = db.products.filter((p) => p.categoryId !== categoryId);
  dbRepo.writeAtomic(db);
  res.json({ categories: db.categories, products: db.products });
});

// Add a Subcategory to a Category dynamically
app.post('/api/admin/categories/:categoryId/subcategories', requireAdmin, (req, res) => {
  const { categoryId } = req.params;
  const { name, description } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: 'Subcategory name is required.' });
  }
  const db = dbRepo.readAll();
  const cat = db.categories.find((c) => c.id === categoryId);
  if (!cat) {
    return res.status(404).json({ error: 'Category not found.' });
  }
  const newSub = {
    id: `sub-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    name: String(name).trim(),
    slug: slugify(name),
    description: description || ''
  };
  cat.subcategories.push(newSub);
  dbRepo.writeAtomic(db);
  res.status(201).json({ subcategory: newSub, category: cat, categories: db.categories });
});

// Update a Subcategory
app.put('/api/admin/categories/:categoryId/subcategories/:subId', requireAdmin, (req, res) => {
  const { categoryId, subId } = req.params;
  const { name, description } = req.body;
  const db = dbRepo.readAll();
  const cat = db.categories.find((c) => c.id === categoryId);
  if (!cat) return res.status(404).json({ error: 'Category not found.' });

  const sub = cat.subcategories.find((s) => s.id === subId);
  if (!sub) return res.status(404).json({ error: 'Subcategory not found.' });

  if (name !== undefined && String(name).trim()) {
    sub.name = String(name).trim();
    sub.slug = slugify(name);
  }
  if (description !== undefined) sub.description = description;

  dbRepo.writeAtomic(db);
  res.json({ subcategory: sub, categories: db.categories });
});

// Delete a Subcategory dynamically
app.delete('/api/admin/categories/:categoryId/subcategories/:subId', requireAdmin, (req, res) => {
  const { categoryId, subId } = req.params;
  const db = dbRepo.readAll();
  const cat = db.categories.find((c) => c.id === categoryId);
  if (!cat) return res.status(404).json({ error: 'Category not found.' });

  cat.subcategories = cat.subcategories.filter((s) => s.id !== subId);
  dbRepo.writeAtomic(db);
  res.json({ category: cat, categories: db.categories });
});

// ============================================================================
// ADMIN ENDPOINTS: MULTI-IMAGE & VIDEO UPLOAD + PRODUCT MANAGEMENT
// ============================================================================

app.post('/api/admin/upload', requireAdmin, upload.array('files', 20), (req, res) => {
  const files = req.files || [];
  const uploadedMedia = files.map((file) => {
    const isVideo =
      file.mimetype.startsWith('video/') ||
      ['.mp4', '.webm', '.mov', '.ogg'].includes(path.extname(file.originalname).toLowerCase());
    return {
      id: `media-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      type: isVideo ? 'video' : 'image',
      url: `/uploads/${file.filename}`,
      caption: path.basename(file.originalname, path.extname(file.originalname))
    };
  });
  res.json({ media: uploadedMedia });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const {
    name,
    sku,
    categoryId,
    subcategoryId,
    price,
    originalPrice,
    badge,
    featured,
    inStock,
    fabric,
    fit,
    description,
    sizes,
    colors,
    media
  } = req.body;

  if (!name || !categoryId) {
    return res.status(400).json({ error: 'Product name and category are required.' });
  }

  const db = dbRepo.readAll();
  const newProduct = {
    id: `prod-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    sku: sku || `TL-${Math.floor(1000 + Math.random() * 9000)}`,
    name: String(name).trim(),
    categoryId,
    subcategoryId: subcategoryId || '',
    price: Number(price) || 0,
    originalPrice: Number(originalPrice) || Number(price) || 0,
    badge: badge || '',
    featured: Boolean(featured),
    inStock: inStock !== undefined ? Boolean(inStock) : true,
    fabric: fabric || '100% Premium Cotton',
    fit: fit || 'Regular Fit',
    description: description || '',
    sizes: Array.isArray(sizes) && sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'],
    colors: Array.isArray(colors) && colors.length > 0 ? colors : ['Classic Black'],
    media:
      Array.isArray(media) && media.length > 0
        ? media
        : [
            {
              id: `m-default-${Date.now()}`,
              type: 'image',
              url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
              caption: String(name).trim()
            }
          ],
    createdAt: new Date().toISOString()
  };

  db.products.unshift(newProduct);
  dbRepo.writeAtomic(db);
  res.status(201).json({ product: newProduct, products: db.products });
});

app.put('/api/admin/products/:productId', requireAdmin, (req, res) => {
  const { productId } = req.params;
  const db = dbRepo.readAll();
  const prod = db.products.find((p) => p.id === productId);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  const fields = [
    'name',
    'sku',
    'categoryId',
    'subcategoryId',
    'price',
    'originalPrice',
    'badge',
    'featured',
    'inStock',
    'fabric',
    'fit',
    'description',
    'sizes',
    'colors',
    'media'
  ];

  for (const field of fields) {
    if (req.body[field] !== undefined) {
      prod[field] = req.body[field];
    }
  }
  prod.price = Number(prod.price) || 0;
  prod.originalPrice = Number(prod.originalPrice) || prod.price;

  dbRepo.writeAtomic(db);
  res.json({ product: prod, products: db.products });
});

app.delete('/api/admin/products/:productId', requireAdmin, (req, res) => {
  const { productId } = req.params;
  const db = dbRepo.readAll();
  db.products = db.products.filter((p) => p.id !== productId);
  dbRepo.writeAtomic(db);
  res.json({ products: db.products });
});

// ============================================================================
// ADMIN ENDPOINTS: WHATSAPP ORDERS & ZERO-COST STORAGE BACKUP/INSPECTION
// ============================================================================

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const db = dbRepo.readAll();
  res.json({ orders: db.whatsappOrders || [] });
});

app.put('/api/admin/orders/:orderId', requireAdmin, (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  const db = dbRepo.readAll();
  const order = (db.whatsappOrders || []).find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'Order inquiry not found.' });
  if (status) order.status = status;
  dbRepo.writeAtomic(db);
  res.json({ order, orders: db.whatsappOrders });
});

app.get('/api/admin/storage/info', requireAdmin, (_req, res) => {
  const db = dbRepo.readAll();
  const stats = fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE) : { size: 0, mtime: new Date() };
  res.json({
    storageEngine: 'Local Atomic JSON Document Store (NoSQL-ready Schema)',
    filePath: DB_FILE,
    fileSizeBytes: stats.size,
    lastModified: stats.mtime,
    counts: {
      categories: db.categories.length,
      subcategories: db.categories.reduce((acc, c) => acc + c.subcategories.length, 0),
      products: db.products.length,
      totalMediaItems: db.products.reduce((acc, p) => acc + (p.media ? p.media.length : 0), 0),
      admins: db.users.length,
      whatsappOrders: (db.whatsappOrders || []).length
    },
    exportData: {
      config: db.config,
      categories: db.categories,
      products: db.products,
      whatsappOrders: db.whatsappOrders || []
    }
  });
});

app.post('/api/admin/storage/import', requireAdmin, (req, res) => {
  const { config, categories, products } = req.body;
  if (!Array.isArray(categories) || !Array.isArray(products)) {
    return res.status(400).json({ error: 'Invalid backup JSON: must include categories and products arrays.' });
  }
  const db = dbRepo.readAll();
  if (config) db.config = { ...db.config, ...config };
  db.categories = categories;
  db.products = products;
  dbRepo.writeAtomic(db);
  res.json({
    message: 'Store catalog and configuration imported successfully.',
    config: db.config,
    categories: db.categories,
    products: db.products
  });
});

// ============================================================================
// SUPERADMIN-ONLY ENDPOINTS: MANAGE ADMIN LOGINS
// ============================================================================

app.get('/api/superadmin/users', requireSuperadmin, (_req, res) => {
  const db = dbRepo.readAll();
  const safeUsers = db.users.map(({ passwordHash, ...rest }) => rest);
  res.json({ users: safeUsers });
});

app.post('/api/superadmin/users', requireSuperadmin, (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name) {
    return res.status(400).json({ error: 'Name, username, and password are required.' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const normalizedUsername = String(username).trim().toLowerCase();
  const db = dbRepo.readAll();
  if (db.users.some((u) => u.username.toLowerCase() === normalizedUsername)) {
    return res.status(409).json({ error: `Username "${normalizedUsername}" already exists.` });
  }

  const assignedRole = role === 'superadmin' ? 'superadmin' : 'admin';
  const newUser = {
    id: `usr-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
    username: normalizedUsername,
    name: String(name).trim(),
    role: assignedRole,
    passwordHash: hashPassword(password),
    active: true,
    createdBy: req.user.username,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  dbRepo.writeAtomic(db);

  const safeUsers = db.users.map(({ passwordHash, ...rest }) => rest);
  res.status(201).json({ user: { id: newUser.id, username: newUser.username, name: newUser.name, role: newUser.role }, users: safeUsers });
});

app.put('/api/superadmin/users/:userId', requireSuperadmin, (req, res) => {
  const { userId } = req.params;
  const { active, newPassword, name, role } = req.body;
  const db = dbRepo.readAll();
  const target = db.users.find((u) => u.id === userId);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  // Prevent deactivating or demoting the last active superadmin
  if (target.role === 'superadmin' && (active === false || (role && role !== 'superadmin'))) {
    const activeSuperadmins = db.users.filter((u) => u.role === 'superadmin' && u.active);
    if (activeSuperadmins.length <= 1) {
      return res.status(400).json({ error: 'Cannot deactivate or demote the last active Superadmin account.' });
    }
  }

  if (active !== undefined) target.active = Boolean(active);
  if (name !== undefined && String(name).trim()) target.name = String(name).trim();
  if (role && ['admin', 'superadmin'].includes(role)) target.role = role;
  if (newPassword && String(newPassword).length >= 6) {
    target.passwordHash = hashPassword(newPassword);
  }

  dbRepo.writeAtomic(db);
  const safeUsers = db.users.map(({ passwordHash, ...rest }) => rest);
  res.json({ users: safeUsers });
});

app.delete('/api/superadmin/users/:userId', requireSuperadmin, (req, res) => {
  const { userId } = req.params;
  const db = dbRepo.readAll();
  const target = db.users.find((u) => u.id === userId);
  if (!target) return res.status(404).json({ error: 'User not found.' });

  if (target.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own currently logged-in Superadmin account.' });
  }

  if (target.role === 'superadmin') {
    const superadminCount = db.users.filter((u) => u.role === 'superadmin').length;
    if (superadminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last Superadmin account.' });
    }
  }

  db.users = db.users.filter((u) => u.id !== userId);
  dbRepo.writeAtomic(db);
  const safeUsers = db.users.map(({ passwordHash, ...rest }) => rest);
  res.json({ users: safeUsers });
});

// Serve production frontend if dist exists
const DIST_DIR = path.join(__dirname, '..', 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Teeto Labels API server running on http://localhost:${PORT}`);
});
