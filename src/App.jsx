import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  MessageCircle,
  Shield,
  Film,
  Image as ImageIcon,
  SlidersHorizontal,
  Sparkles,
  Check,
  Eye,
  Truck,
  RefreshCw,
  Layers,
  ChevronRight
} from 'lucide-react';
import ProductModal from './components/ProductModal';
import CartDrawer from './components/CartDrawer';
import AdminPortal from './components/AdminPortal';
import { buildSingleProductWhatsAppUrl, sanitizePhone } from './utils/whatsapp';

export default function App() {
  const [storeData, setStoreData] = useState({
    config: {},
    categories: [],
    products: []
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('store'); // 'store' | 'admin'

  // Filtering & Search state
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [activeSubcategoryId, setActiveSubcategoryId] = useState('all');
  const [activeSizeFilter, setActiveSizeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  // Per-card interactive size & color selection state: { [productId]: { size, color } }
  const [cardSelections, setCardSelections] = useState({});

  // Product Quick-View / Media Modal
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Cart State (persisted in localStorage, no login needed)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('teeto_labels_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickAddedId, setQuickAddedId] = useState(null);

  const fetchStoreData = async () => {
    try {
      const isStaticHost = typeof window !== 'undefined' && window.location.hostname.includes('github.io');
      const apiUrl = import.meta.env.VITE_API_URL;

      // If running on GitHub Pages without a dedicated backend, load the exported static store data directly
      if (isStaticHost && !apiUrl) {
        const staticRes = await fetch('./store-data.json');
        if (!staticRes.ok) throw new Error('Failed to load static store-data.json');
        const staticData = await staticRes.json();
        setStoreData({
          config: staticData.config || {},
          categories: staticData.categories || [],
          products: staticData.products || []
        });
        return;
      }

      const endpoint = apiUrl ? `${apiUrl.replace(/\/$/, '')}/api/store` : '/api/store';
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('API unavailable, trying static store-data.json');
      const data = await res.json();
      setStoreData({
        config: data.config || {},
        categories: data.categories || [],
        products: data.products || []
      });
    } catch {
      try {
        const fallbackRes = await fetch('./store-data.json');
        const fallbackData = await fallbackRes.json();
        setStoreData({
          config: fallbackData.config || {},
          categories: fallbackData.categories || [],
          products: fallbackData.products || []
        });
      } catch (err) {
        console.error('Failed to load store data:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('teeto_labels_cart', JSON.stringify(cartItems));
    } catch {
      // ignore storage quota errors
    }
  }, [cartItems]);

  const getCardSelection = (product) => {
    const saved = cardSelections[product.id];
    const validSizes = product.sizes?.length ? product.sizes : ['S', 'M', 'L', 'XL'];
    const validColors = product.colors?.length ? product.colors : ['Default'];
    return {
      size: saved?.size && validSizes.includes(saved.size) ? saved.size : validSizes[0],
      color: saved?.color && validColors.includes(saved.color) ? saved.color : validColors[0]
    };
  };

  const handleCardSelectSize = (productId, size) => {
    setCardSelections((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), size }
    }));
  };

  const handleCardSelectColor = (productId, color) => {
    setCardSelections((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), color }
    }));
  };

  // All distinct sizes available across the store catalog
  const allAvailableSizes = useMemo(() => {
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '38', '40', '42', '44'];
    const set = new Set();
    (storeData.products || []).forEach((p) => {
      (p.sizes || []).forEach((sz) => set.add(sz));
    });
    return Array.from(set).sort((a, b) => {
      const idxA = sizeOrder.indexOf(a);
      const idxB = sizeOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [storeData.products]);

  const handleSelectCategory = (catId) => {
    setActiveCategoryId(catId);
    setActiveSubcategoryId('all');
  };

  const activeCategoryObj = useMemo(
    () => storeData.categories.find((c) => c.id === activeCategoryId) || null,
    [storeData.categories, activeCategoryId]
  );

  // Visible subcategories for the filter bar
  const visibleSubcategories = useMemo(() => {
    if (activeCategoryId === 'all') {
      // Combine all subcategories with their parent category label
      const allSubs = [];
      storeData.categories.forEach((cat) => {
        (cat.subcategories || []).forEach((sub) => {
          allSubs.push({
            ...sub,
            parentCategoryId: cat.id,
            parentCategoryName: cat.name
          });
        });
      });
      return allSubs;
    }
    return (activeCategoryObj?.subcategories || []).map((sub) => ({
      ...sub,
      parentCategoryId: activeCategoryObj.id,
      parentCategoryName: activeCategoryObj.name
    }));
  }, [storeData.categories, activeCategoryId, activeCategoryObj]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    let list = [...(storeData.products || [])];

    if (activeCategoryId !== 'all') {
      list = list.filter((p) => p.categoryId === activeCategoryId);
    }

    if (activeSubcategoryId !== 'all') {
      list = list.filter((p) => p.subcategoryId === activeSubcategoryId);
    }

    if (activeSizeFilter !== 'all') {
      list = list.filter((p) => (p.sizes || []).includes(activeSizeFilter));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const cat = storeData.categories.find((c) => c.id === p.categoryId);
        const sub = cat?.subcategories?.find((s) => s.id === p.subcategoryId);
        return (
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.fabric?.toLowerCase().includes(q) ||
          p.fit?.toLowerCase().includes(q) ||
          cat?.name?.toLowerCase().includes(q) ||
          sub?.name?.toLowerCase().includes(q)
        );
      });
    }

    if (sortBy === 'price-asc') {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else {
      list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }

    return list;
  }, [
    storeData.products,
    storeData.categories,
    activeCategoryId,
    activeSubcategoryId,
    activeSizeFilter,
    searchQuery,
    sortBy
  ]);

  // Cart Actions
  const handleAddToCart = ({
    product,
    selectedSize,
    selectedColor,
    quantity = 1,
    categoryName = '',
    subcategoryName = ''
  }) => {
    const size = selectedSize || product.sizes?.[0] || 'M';
    const color = selectedColor || product.colors?.[0] || 'Default';
    const cartKey = `${product.id}__${size}__${color}`;
    const thumbMedia =
      product.media?.find((m) => m.type !== 'video') || product.media?.[0];

    setCartItems((prev) => {
      const existing = prev.find((item) => item.cartKey === cartKey);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === cartKey
            ? {
                ...item,
                quantity: item.quantity + quantity,
                availableSizes: product.sizes || item.availableSizes || ['S', 'M', 'L', 'XL'],
                availableColors: product.colors || item.availableColors || ['Default']
              }
            : item
        );
      }
      return [
        ...prev,
        {
          cartKey,
          productId: product.id,
          sku: product.sku,
          name: product.name,
          price: Number(product.price),
          selectedSize: size,
          selectedColor: color,
          availableSizes: product.sizes || ['S', 'M', 'L', 'XL'],
          availableColors: product.colors || ['Default'],
          quantity,
          categoryName,
          subcategoryName,
          thumbnail:
            thumbMedia?.url ||
            'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=600&q=80'
        }
      ];
    });
  };

  const handleQuickAdd = (product) => {
    const cat = storeData.categories.find((c) => c.id === product.categoryId);
    const sub = cat?.subcategories?.find((s) => s.id === product.subcategoryId);
    const { size, color } = getCardSelection(product);
    handleAddToCart({
      product,
      selectedSize: size,
      selectedColor: color,
      quantity: 1,
      categoryName: cat?.name || '',
      subcategoryName: sub?.name || ''
    });
    setQuickAddedId(product.id);
    setTimeout(() => setQuickAddedId(null), 1400);
  };

  const handleUpdateCartQty = (cartKey, newQty) => {
    if (newQty <= 0) {
      setCartItems((prev) => prev.filter((item) => item.cartKey !== cartKey));
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.cartKey === cartKey ? { ...item, quantity: newQty } : item))
    );
  };

  const handleUpdateCartVariant = (oldCartKey, newSize, newColor) => {
    setCartItems((prev) => {
      const target = prev.find((item) => item.cartKey === oldCartKey);
      if (!target) return prev;
      const updatedSize = newSize || target.selectedSize;
      const updatedColor = newColor || target.selectedColor;
      const newCartKey = `${target.productId}__${updatedSize}__${updatedColor}`;
      if (newCartKey === oldCartKey) return prev;

      const existingSameVariant = prev.find((item) => item.cartKey === newCartKey);
      if (existingSameVariant) {
        return prev
          .filter((item) => item.cartKey !== oldCartKey)
          .map((item) =>
            item.cartKey === newCartKey
              ? { ...item, quantity: item.quantity + target.quantity }
              : item
          );
      }

      return prev.map((item) =>
        item.cartKey === oldCartKey
          ? {
              ...item,
              cartKey: newCartKey,
              selectedSize: updatedSize,
              selectedColor: updatedColor
            }
          : item
      );
    });
  };

  const handleRemoveCartItem = (cartKey) => {
    setCartItems((prev) => prev.filter((item) => item.cartKey !== cartKey));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const totalBagCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const currency = storeData.config?.currencySymbol || '₹';

  if (viewMode === 'admin') {
    return (
      <AdminPortal
        storeData={storeData}
        onRefreshStore={fetchStoreData}
        onExitAdmin={() => setViewMode('store')}
      />
    );
  }

  return (
    <div className="store-shell">
      {/* Top Announcement Bar */}
      <div className="announcement-bar">
        <span>
          {storeData.config?.announcementBanner ||
            'FREE SHIPPING ON ORDERS ABOVE ₹1,499 • NO LOGIN REQUIRED • INSTANT WHATSAPP CHECKOUT'}
        </span>
      </div>

      {/* Main Navigation Header */}
      <header className="store-navbar">
        <div className="navbar-inner">
          <div
            className="brand-logo-block"
            onClick={() => {
              setActiveCategoryId('all');
              setActiveSubcategoryId('all');
              setSearchQuery('');
            }}
          >
            <span className="brand-monogram">TL</span>
            <div>
              <span className="brand-title">
                {storeData.config?.brandName?.toUpperCase() || 'TEETO LABELS'}
              </span>
              <span className="brand-sub">Apparel & Streetwear Studio</span>
            </div>
          </div>

          {/* Dynamic Category Links */}
          <nav className="navbar-categories">
            <button
              type="button"
              className={`nav-cat-btn ${activeCategoryId === 'all' ? 'active' : ''}`}
              onClick={() => handleSelectCategory('all')}
            >
              All Drops
            </button>
            {storeData.categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`nav-cat-btn ${activeCategoryId === cat.id ? 'active' : ''}`}
                onClick={() => handleSelectCategory(cat.id)}
              >
                {cat.name}
                <span className="nav-sub-count">{cat.subcategories?.length || 0}</span>
              </button>
            ))}
          </nav>

          {/* Search, Admin & Shopping Bag */}
          <div className="navbar-actions">
            <div className="nav-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search Oversized, Round Neck, Linen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn-admin-portal"
              onClick={() => setViewMode('admin')}
              title="Open Admin & Superadmin Management Portal"
            >
              <Shield size={16} />
              <span>Admin</span>
            </button>

            <button
              type="button"
              className="btn-bag-trigger"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingBag size={18} />
              <span>Bag</span>
              <span className="bag-count-pill">{totalBagCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Editorial Hero Section */}
      <section className="hero-banner">
        <div className="hero-inner">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <Sparkles size={14} />
              <span>{storeData.config?.tagline || 'Official Teeto Labels Collection'}</span>
            </div>
            <h1>{storeData.config?.heroTitle || 'CRAFTED FOR EVERY SILHOUETTE'}</h1>
            <p>
              {storeData.config?.heroSubtitle ||
                'Heavyweight oversized tees, classic round necks, and structured shirts. Browse our dynamic catalog and order seamlessly via WhatsApp in seconds.'}
            </p>
            <div className="hero-cta-group">
              <a href="#catalog-section" className="btn-hero-primary">
                Shop Collection <ChevronRight size={17} />
              </a>
              <a
                href={`https://wa.me/${sanitizePhone(storeData.config?.whatsappNumber)}?text=${encodeURIComponent('Hi Teeto Labels! I want to check out your latest T-Shirts and Shirts.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hero-whatsapp"
              >
                <MessageCircle size={17} /> Chat on WhatsApp
              </a>
            </div>

            <div className="hero-perks">
              <span>
                <Truck size={15} /> Fast Dispatch
              </span>
              <span>
                <Film size={15} /> Multi-Photo & Video Previews
              </span>
              <span>
                <MessageCircle size={15} /> Zero-Login WhatsApp Checkout
              </span>
            </div>
          </div>

          {/* Dynamic Category Showcase Cards */}
          <div className="hero-category-cards">
            {storeData.categories.slice(0, 2).map((cat) => (
              <div
                key={cat.id}
                className={`hero-cat-tile ${activeCategoryId === cat.id ? 'selected' : ''}`}
                onClick={() => {
                  handleSelectCategory(cat.id);
                  document
                    .getElementById('catalog-section')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <img src={cat.coverImage} alt={cat.name} />
                <div className="hero-cat-overlay">
                  <span className="tile-kicker">Explore Category</span>
                  <h3>{cat.name}</h3>
                  <div className="tile-sub-pills">
                    {(cat.subcategories || []).slice(0, 4).map((s) => (
                      <span key={s.id}>{s.name}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Category & Subcategory Filter Section */}
      <main id="catalog-section" className="catalog-container">
        <div className="filter-panel">
          {/* Top-level Category Tabs */}
          <div className="category-tabs-row">
            <div className="category-tabs-scroll">
              <button
                type="button"
                className={`cat-tab-pill ${activeCategoryId === 'all' ? 'active' : ''}`}
                onClick={() => handleSelectCategory('all')}
              >
                <Layers size={15} />
                <span>All Apparel</span>
                <small>{storeData.products.length}</small>
              </button>

              {storeData.categories.map((cat) => {
                const count = storeData.products.filter((p) => p.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`cat-tab-pill ${activeCategoryId === cat.id ? 'active' : ''}`}
                    onClick={() => handleSelectCategory(cat.id)}
                  >
                    <span>{cat.name}</span>
                    <small>{count}</small>
                  </button>
                );
              })}
            </div>

            <div className="sort-control-box">
              <SlidersHorizontal size={15} />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="featured">Sort: Featured</option>
                <option value="newest">Sort: Newest Drops</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* Dynamic Subcategory Pills */}
          <div className="subcategory-pills-bar">
            <span className="subbar-label">
              {activeCategoryObj ? `${activeCategoryObj.name} Styles:` : 'Filter by Style:'}
            </span>
            <div className="subcategory-pills-list">
              <button
                type="button"
                className={`sub-filter-pill ${activeSubcategoryId === 'all' ? 'active' : ''}`}
                onClick={() => setActiveSubcategoryId('all')}
              >
                All Styles
              </button>
              {visibleSubcategories.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  className={`sub-filter-pill ${activeSubcategoryId === sub.id ? 'active' : ''}`}
                  onClick={() => {
                    if (activeCategoryId === 'all') {
                      setActiveCategoryId(sub.parentCategoryId);
                    }
                    setActiveSubcategoryId(sub.id);
                  }}
                >
                  {activeCategoryId === 'all' && (
                    <span className="sub-parent-hint">{sub.parentCategoryName}: </span>
                  )}
                  {sub.name}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Size Filter Pills */}
          <div className="size-filter-bar">
            <span className="subbar-label">Filter by Size:</span>
            <div className="subcategory-pills-list">
              <button
                type="button"
                className={`size-filter-chip ${activeSizeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveSizeFilter('all')}
              >
                All Sizes
              </button>
              {allAvailableSizes.map((sz) => (
                <button
                  key={sz}
                  type="button"
                  className={`size-filter-chip ${activeSizeFilter === sz ? 'active' : ''}`}
                  onClick={() => setActiveSizeFilter(activeSizeFilter === sz ? 'all' : sz)}
                >
                  Size {sz}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="loading-catalog">
            <RefreshCw size={28} className="spin" />
            <p>Loading Teeto Labels collection...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty-catalog-box">
            <h3>No matching apparel found</h3>
            <p>Try clearing your search or size filter, or selecting another category.</p>
            <button
              type="button"
              className="btn-primary-dark"
              onClick={() => {
                setActiveCategoryId('all');
                setActiveSubcategoryId('all');
                setActiveSizeFilter('all');
                setSearchQuery('');
              }}
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="products-grid">
            {filteredProducts.map((product) => {
              const cat = storeData.categories.find((c) => c.id === product.categoryId);
              const sub = cat?.subcategories?.find((s) => s.id === product.subcategoryId);
              const mediaList = product.media || [];
              const firstImage =
                mediaList.find((m) => m.type !== 'video') || mediaList[0];
              const imageCount = mediaList.filter((m) => m.type !== 'video').length;
              const videoCount = mediaList.filter((m) => m.type === 'video').length;
              const discountPct =
                product.originalPrice > product.price
                  ? Math.round(
                      ((product.originalPrice - product.price) / product.originalPrice) * 100
                    )
                  : 0;

              const { size: cardSelectedSize, color: cardSelectedColor } =
                getCardSelection(product);

              const directWaUrl = buildSingleProductWhatsAppUrl({
                config: storeData.config,
                product,
                categoryName: cat?.name,
                subcategoryName: sub?.name,
                selectedSize: cardSelectedSize,
                selectedColor: cardSelectedColor,
                quantity: 1
              });

              return (
                <article key={product.id} className="product-card">
                  <div
                    className="product-card-media"
                    onClick={() => setSelectedProduct(product)}
                  >
                    {firstImage?.type === 'video' ? (
                      <video src={firstImage.url} muted loop playsInline />
                    ) : (
                      <img
                        src={
                          firstImage?.url ||
                          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'
                        }
                        alt={product.name}
                        loading="lazy"
                      />
                    )}

                    {/* Top Left Badges */}
                    <div className="card-top-badges">
                      {product.badge && <span className="badge-dark">{product.badge}</span>}
                      {discountPct > 0 && (
                        <span className="badge-discount">-{discountPct}%</span>
                      )}
                    </div>

                    {/* Bottom Media Count Indicator (Multiple Photos + Videos) */}
                    <div className="card-media-indicators">
                      <span>
                        <ImageIcon size={12} /> {imageCount}
                      </span>
                      {videoCount > 0 && (
                        <span className="has-video-chip">
                          <Film size={12} /> {videoCount} Video{videoCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="card-quickview-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(product);
                      }}
                    >
                      <Eye size={15} /> View Gallery & Video
                    </button>
                  </div>

                  <div className="product-card-body">
                    <div className="card-category-line">
                      <span>{cat?.name || 'Apparel'}</span>
                      {sub && (
                        <>
                          <span>•</span>
                          <strong>{sub.name}</strong>
                        </>
                      )}
                    </div>

                    <h3
                      className="card-product-title"
                      onClick={() => setSelectedProduct(product)}
                    >
                      {product.name}
                    </h3>

                    <p className="card-fabric-meta">
                      {product.fabric} • {product.fit}
                    </p>

                    {/* Interactive Size Selector on Card */}
                    <div className="card-selector-group">
                      <div className="card-selector-label">
                        <span>Select Size:</span>
                        <strong>{cardSelectedSize}</strong>
                      </div>
                      <div className="card-sizes-interactive">
                        {(product.sizes || ['S', 'M', 'L', 'XL']).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            className={`card-size-btn ${
                              cardSelectedSize === sz ? 'selected' : ''
                            }`}
                            onClick={() => handleCardSelectSize(product.id, sz)}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interactive Color Selector on Card (if multiple colors) */}
                    {(product.colors || []).length > 1 && (
                      <div className="card-selector-group color-group">
                        <div className="card-selector-label">
                          <span>Color:</span>
                          <strong>{cardSelectedColor}</strong>
                        </div>
                        <div className="card-colors-interactive">
                          {product.colors.map((clr) => (
                            <button
                              key={clr}
                              type="button"
                              className={`card-color-btn ${
                                cardSelectedColor === clr ? 'selected' : ''
                              }`}
                              onClick={() => handleCardSelectColor(product.id, clr)}
                            >
                              {clr}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="card-price-action-row">
                      <div className="card-price-block">
                        <span className="price-now">
                          {currency}
                          {Number(product.price).toLocaleString()}
                        </span>
                        {discountPct > 0 && (
                          <span className="price-was">
                            {currency}
                            {Number(product.originalPrice).toLocaleString()}
                          </span>
                        )}
                      </div>

                      <div className="card-cta-buttons">
                        <a
                          href={directWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-card-wa"
                          title={`Order Size ${cardSelectedSize} (${cardSelectedColor}) directly on WhatsApp`}
                        >
                          <MessageCircle size={17} />
                        </a>
                        <button
                          type="button"
                          className={`btn-card-add ${
                            quickAddedId === product.id ? 'added' : ''
                          }`}
                          onClick={() => handleQuickAdd(product)}
                        >
                          {quickAddedId === product.id ? (
                            <>
                              <Check size={15} /> Added ({cardSelectedSize})
                            </>
                          ) : (
                            <>
                              <ShoppingBag size={15} /> Add ({cardSelectedSize})
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Store Footer */}
      <footer className="store-footer">
        <div className="footer-inner">
          <div className="footer-brand-col">
            <div className="brand-logo-block">
              <span className="brand-monogram">TL</span>
              <div>
                <span className="brand-title">TEETO LABELS</span>
                <span className="brand-sub">Crafted Apparel & Streetwear</span>
              </div>
            </div>
            <p>
              Premium T-Shirts & Shirts with dynamic categories, multi-angle photo & video
              galleries, and instant zero-login WhatsApp ordering.
            </p>
          </div>

          <div className="footer-links-col">
            <h4>Dynamic Collections</h4>
            <ul>
              {storeData.categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => {
                      handleSelectCategory(cat.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    {cat.name} ({cat.subcategories?.map((s) => s.name).join(', ')})
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-contact-col">
            <h4>Direct WhatsApp Desk</h4>
            <p>WhatsApp: +{storeData.config?.whatsappNumber || '919876543210'}</p>
            <p>{storeData.config?.storeAddress || 'Teeto Labels Studio'}</p>
            <button
              type="button"
              className="footer-admin-link"
              onClick={() => setViewMode('admin')}
            >
              <Shield size={14} /> Admin / Superadmin Login
            </button>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/${sanitizePhone(storeData.config?.whatsappNumber)}?text=${encodeURIComponent('Hello Teeto Labels! 👋 I need help choosing a T-Shirt / Shirt size.')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-whatsapp-fab"
        title="Chat with Teeto Labels on WhatsApp"
      >
        <MessageCircle size={22} />
        <span>Order on WhatsApp</span>
      </a>

      {/* Product Detail & Multi-Media Modal */}
      <ProductModal
        product={selectedProduct}
        initialSize={selectedProduct ? getCardSelection(selectedProduct).size : ''}
        initialColor={selectedProduct ? getCardSelection(selectedProduct).color : ''}
        onSelectSize={(sz) => selectedProduct && handleCardSelectSize(selectedProduct.id, sz)}
        onSelectColor={(clr) => selectedProduct && handleCardSelectColor(selectedProduct.id, clr)}
        categories={storeData.categories}
        config={storeData.config}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {/* Slide-over Shopping Bag Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        products={storeData.products}
        onUpdateQty={handleUpdateCartQty}
        onUpdateVariant={handleUpdateCartVariant}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        config={storeData.config}
      />
    </div>
  );
}
