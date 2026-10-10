import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'teeto-store-db.json');

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

const INITIAL_SEED_DATA = {
  config: {
    brandName: 'Teeto Labels',
    tagline: 'Crafted Streetwear & Elevated Everyday Silhouettes',
    whatsappNumber: '919876543210',
    whatsappGreeting: 'Hello Teeto Labels! 👋 I would like to place a new order:',
    currencySymbol: '₹',
    freeShippingThreshold: 1499,
    shippingFee: 99,
    announcementBanner: 'FREE SHIPPING ON ORDERS ABOVE ₹1,499 • NO LOGIN REQUIRED • INSTANT WHATSAPP CHECKOUT',
    heroTitle: 'CRAFTED FOR EVERY SILHOUETTE',
    heroSubtitle: 'Heavyweight oversized tees, classic round necks, and structured shirts. Browse our dynamic catalog and order seamlessly via WhatsApp in seconds.',
    instagramHandle: '@teetolabels',
    supportEmail: 'care@teetolabels.com',
    storeAddress: 'Teeto Labels Studio, Indiranagar, Bengaluru, India'
  },
  categories: [
    {
      id: 'cat-tshirts',
      name: 'T-Shirts',
      slug: 't-shirts',
      description: 'Premium combed cotton and heavyweight French terry tees across classic and streetwear fits.',
      coverImage: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
      subcategories: [
        { id: 'sub-round-neck', name: 'Round Neck', slug: 'round-neck', description: 'Essential everyday crew neck tees' },
        { id: 'sub-oversized-tee', name: 'Oversized', slug: 'oversized', description: 'Drop-shoulder relaxed streetwear fit' },
        { id: 'sub-polo-neck', name: 'Polo Neck', slug: 'polo-neck', description: 'Structured collar pique & knit polos' },
        { id: 'sub-acid-wash', name: 'Acid Wash', slug: 'acid-wash', description: 'Vintage mineral-washed heavy tees' },
        { id: 'sub-henley', name: 'Henley & Ribbed', slug: 'henley-ribbed', description: 'Button-placket and textured knit tees' }
      ]
    },
    {
      id: 'cat-shirts',
      name: 'Shirts',
      slug: 'shirts',
      description: 'From breezy Cuban collar resort shirts to crisp tailored cotton and boxy overshirts.',
      coverImage: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80',
      subcategories: [
        { id: 'sub-oversized-shirt', name: 'Oversized Shirts', slug: 'oversized-shirts', description: 'Boxy drop-shoulder silhouettes' },
        { id: 'sub-cuban-collar', name: 'Cuban Collar', slug: 'cuban-collar', description: 'Relaxed camp-collar resort shirts' },
        { id: 'sub-casual-shirt', name: 'Casual Cotton', slug: 'casual-cotton', description: 'Breathable everyday button-downs' },
        { id: 'sub-linen-shirt', name: 'Linen Blend', slug: 'linen-blend', description: 'Lightweight textured summer shirts' },
        { id: 'sub-flannel-checked', name: 'Checked & Flannel', slug: 'checked-flannel', description: 'Brushed plaid and layering shirts' },
        { id: 'sub-formal-shirt', name: 'Formal Tailored', slug: 'formal-tailored', description: 'Crisp structured office-to-evening shirts' }
      ]
    }
  ],
  products: [
    {
      id: 'prod-tl-101',
      sku: 'TL-TS-OV-01',
      name: 'Obsidian Heavyweight Oversized Tee',
      categoryId: 'cat-tshirts',
      subcategoryId: 'sub-oversized-tee',
      price: 999,
      originalPrice: 1499,
      badge: 'Best Seller',
      featured: true,
      inStock: true,
      fabric: '260 GSM 100% Combed Terry Cotton',
      fit: 'Drop-Shoulder Oversized Fit',
      description: 'Our signature 260 GSM heavyweight oversized T-shirt crafted from bio-washed combed cotton. Features a structured high-rib crew neckline that never sags, dropped shoulders, and a clean boxy drape.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Obsidian Black', 'Chalk White', 'Sage Olive'],
      media: [
        {
          id: 'm-101-1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80',
          caption: 'Front Look - Obsidian Black'
        },
        {
          id: 'm-101-2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1000&q=80',
          caption: 'Fabric & Collar Detail'
        },
        {
          id: 'm-101-3',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
          caption: 'Chalk White Variant'
        },
        {
          id: 'm-101-4',
          type: 'video',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          caption: '360° Fabric Drape & Fit Video'
        }
      ],
      createdAt: '2026-10-01T10:00:00.000Z'
    },
    {
      id: 'prod-tl-102',
      sku: 'TL-TS-RN-02',
      name: 'Essential Supima Round Neck Tee',
      categoryId: 'cat-tshirts',
      subcategoryId: 'sub-round-neck',
      price: 699,
      originalPrice: 999,
      badge: 'Everyday Essential',
      featured: true,
      inStock: true,
      fabric: '190 GSM Supima Cotton Blend',
      fit: 'Classic Regular Fit',
      description: 'Ultra-soft everyday round neck T-shirt engineered for breathability and longevity. Pre-shrunk with enzyme silicon wash for a buttery-smooth handfeel.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Classic White', 'Navy Ink', 'Heather Grey', 'Maroon'],
      media: [
        {
          id: 'm-102-1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
          caption: 'Classic White Round Neck'
        },
        {
          id: 'm-102-2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=1000&q=80',
          caption: 'Colorway Stack'
        },
        {
          id: 'm-102-3',
          type: 'video',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          caption: 'Studio Lookbook Video'
        }
      ],
      createdAt: '2026-10-02T10:00:00.000Z'
    },
    {
      id: 'prod-tl-103',
      sku: 'TL-TS-AW-03',
      name: 'Vintage Charcoal Acid Wash Oversized Tee',
      categoryId: 'cat-tshirts',
      subcategoryId: 'sub-acid-wash',
      price: 1149,
      originalPrice: 1599,
      badge: 'New Drop',
      featured: true,
      inStock: true,
      fabric: '250 GSM Mineral-Washed French Terry',
      fit: 'Boxy Street Fit',
      description: 'Individually garment-dyed and acid-washed for a one-of-a-kind vintage patina. Double-needle stitch detailing on shoulders and hem.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Washed Charcoal', 'Vintage Cobalt', 'Faded Espresso'],
      media: [
        {
          id: 'm-103-1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80',
          caption: 'Washed Charcoal Street Fit'
        },
        {
          id: 'm-103-2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80',
          caption: 'Back Silhouette'
        }
      ],
      createdAt: '2026-10-03T10:00:00.000Z'
    },
    {
      id: 'prod-tl-104',
      sku: 'TL-TS-PL-04',
      name: 'Milano Textured Knit Polo Tee',
      categoryId: 'cat-tshirts',
      subcategoryId: 'sub-polo-neck',
      price: 1299,
      originalPrice: 1799,
      badge: 'Trending',
      featured: false,
      inStock: true,
      fabric: '230 GSM Breathable Waffle Pique Knit',
      fit: 'Tailored Smart Fit',
      description: 'Elevated open-placket polo neck T-shirt with micro-waffle texture. Transitions effortlessly from daytime casual to evening dinners.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Emerald Green', 'Sand Beige', 'Jet Black'],
      media: [
        {
          id: 'm-104-1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?auto=format&fit=crop&w=1000&q=80',
          caption: 'Milano Polo Front View'
        },
        {
          id: 'm-104-2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1000&q=80',
          caption: 'Knit Texture Closeup'
        }
      ],
      createdAt: '2026-10-04T10:00:00.000Z'
    },
    {
      id: 'prod-tl-201',
      sku: 'TL-SH-CB-01',
      name: 'Amalfi Breeze Cuban Collar Resort Shirt',
      categoryId: 'cat-shirts',
      subcategoryId: 'sub-cuban-collar',
      price: 1499,
      originalPrice: 2199,
      badge: 'Best Seller',
      featured: true,
      inStock: true,
      fabric: '100% European Linen-Viscose Blend',
      fit: 'Relaxed Resort Fit',
      description: 'A breezy camp-collar shirt designed with fluid drape, mother-of-pearl style buttons, and side vents. Comes with multiple lookbook photos and motion video.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Ivory Sand', 'Terracotta Rust', 'Ocean Teal'],
      media: [
        {
          id: 'm-201-1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80',
          caption: 'Cuban Collar Front Look'
        },
        {
          id: 'm-201-2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80',
          caption: 'Collar & Button Craftsmanship'
        },
        {
          id: 'm-201-3',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1000&q=80',
          caption: 'Full Outfit Styling'
        },
        {
          id: 'm-201-4',
          type: 'video',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
          caption: 'Resort Shirt Motion & Fabric Flow Video'
        }
      ],
      createdAt: '2026-10-05T10:00:00.000Z'
    },
    {
      id: 'prod-tl-202',
      sku: 'TL-SH-OV-02',
      name: 'Kyoto Boxy Oversized Utility Shirt',
      categoryId: 'cat-shirts',
      subcategoryId: 'sub-oversized-shirt',
      price: 1649,
      originalPrice: 2299,
      badge: 'New Drop',
      featured: true,
      inStock: true,
      fabric: 'Heavyweight Brushed Cotton Twill',
      fit: 'Oversized Boxy Fit',
      description: 'Engineered to be worn buttoned up or layered open over a round-neck tee. Features dual utility chest pockets, wide sleeves, and architectural stitching.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Slate Olive', 'Stone Khaki', 'Matte Black'],
      media: [
        {
          id: 'm-202-1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80',
          caption: 'Kyoto Oversized Shirt - Front'
        },
        {
          id: 'm-202-2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1000&q=80',
          caption: 'Layered over White Round Neck Tee'
        },
        {
          id: 'm-202-3',
          type: 'video',
          url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoy.mp4',
          caption: 'Oversized Shirt Styling Video'
        }
      ],
      createdAt: '2026-10-06T10:00:00.000Z'
    },
    {
      id: 'prod-tl-203',
      sku: 'TL-SH-LN-03',
      name: 'Riviera Pure Linen Long-Sleeve Shirt',
      categoryId: 'cat-shirts',
      subcategoryId: 'sub-linen-shirt',
      price: 1799,
      originalPrice: 2499,
      badge: 'Limited Edition',
      featured: true,
      inStock: true,
      fabric: '60 Lea Pure Flax Linen',
      fit: 'Relaxed Tailored Fit',
      description: 'Naturally thermoregulating pure linen shirt that gets softer with every wash. Features gusseted hems and roll-tab sleeves.',
      sizes: ['M', 'L', 'XL', 'XXL'],
      colors: ['Oatmeal', 'Sky Blue', 'Pure White'],
      media: [
        {
          id: 'm-203-1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1000&q=80',
          caption: 'Riviera Linen Shirt'
        },
        {
          id: 'm-203-2',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80',
          caption: 'Linen Weave Detail'
        }
      ],
      createdAt: '2026-10-07T10:00:00.000Z'
    },
    {
      id: 'prod-tl-204',
      sku: 'TL-SH-FL-04',
      name: 'Nordic Brushed Plaid Flannel Shirt',
      categoryId: 'cat-shirts',
      subcategoryId: 'sub-flannel-checked',
      price: 1399,
      originalPrice: 1899,
      badge: 'Classic',
      featured: false,
      inStock: true,
      fabric: '100% Double-Brushed Cotton Flannel',
      fit: 'Regular Layering Fit',
      description: 'Soft yarn-dyed checked flannel shirt built for all-day comfort and effortless street layering.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colors: ['Crimson Tartan', 'Forest Check', 'Monochrome Plaid'],
      media: [
        {
          id: 'm-204-1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=1000&q=80',
          caption: 'Nordic Checked Flannel'
        }
      ],
      createdAt: '2026-10-08T10:00:00.000Z'
    }
  ],
  users: [
    {
      id: 'usr-superadmin-1',
      username: 'superadmin',
      name: 'Teeto Founder (Superadmin)',
      role: 'superadmin',
      passwordHash: hashPassword('superadmin123'),
      active: true,
      createdAt: '2026-10-01T00:00:00.000Z'
    },
    {
      id: 'usr-admin-1',
      username: 'admin',
      name: 'Store Catalog Manager (Admin)',
      role: 'admin',
      passwordHash: hashPassword('admin123'),
      active: true,
      createdBy: 'superadmin',
      createdAt: '2026-10-01T00:05:00.000Z'
    }
  ],
  whatsappOrders: []
};

class JsonFileRepository {
  constructor() {
    this.ensureInitialized();
  }

  ensureInitialized() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      this.writeAtomic(INITIAL_SEED_DATA);
    }
  }

  readAll() {
    this.ensureInitialized();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  }

  writeAtomic(data) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmpFile = `${DB_FILE}.tmp.${ process.pid }.${ Date.now() }`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, DB_FILE);
    return data;
  }

  getPublicStoreData() {
    const db = this.readAll();
    return {
      config: db.config,
      categories: db.categories,
      products: db.products
    };
  }

  resetToSeed() {
    return this.writeAtomic(JSON.parse(JSON.stringify(INITIAL_SEED_DATA)));
  }
}

export const dbRepo = new JsonFileRepository();
export { DB_FILE };
