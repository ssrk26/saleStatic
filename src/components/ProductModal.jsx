import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  MessageCircle,
  Play,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Layers,
  ShieldCheck,
  Film,
  Image as ImageIcon,
  Ruler
} from 'lucide-react';
import { buildSingleProductWhatsAppUrl } from '../utils/whatsapp';

const SIZE_MEASUREMENTS = {
  XS: { chest: '38"', length: '26.5"', shoulder: '17.5"' },
  S: { chest: '40"', length: '27.5"', shoulder: '18.5"' },
  M: { chest: '42"', length: '28.5"', shoulder: '19.5"' },
  L: { chest: '44"', length: '29.5"', shoulder: '20.5"' },
  XL: { chest: '46"', length: '30.5"', shoulder: '21.5"' },
  XXL: { chest: '48"', length: '31.5"', shoulder: '22.5"' },
  '3XL': { chest: '50"', length: '32.0"', shoulder: '23.5"' }
};

export default function ProductModal({
  product,
  initialSize,
  initialColor,
  onSelectSize,
  onSelectColor,
  categories,
  config,
  onClose,
  onAddToCart
}) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  useEffect(() => {
    if (product) {
      setActiveMediaIndex(0);
      setSelectedSize(initialSize || product.sizes?.[0] || 'M');
      setSelectedColor(initialColor || product.colors?.[0] || 'Default');
      setQuantity(1);
      setShowSizeGuide(false);
    }
  }, [product, initialSize, initialColor]);

  if (!product) return null;

  const mediaList =
    Array.isArray(product.media) && product.media.length > 0
      ? product.media
      : [
          {
            id: 'fallback',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
            caption: product.name
          }
        ];

  const currentMedia = mediaList[activeMediaIndex] || mediaList[0];
  const category = categories.find((c) => c.id === product.categoryId);
  const subcategory = category?.subcategories?.find((s) => s.id === product.subcategoryId);

  const currency = config?.currencySymbol || '₹';
  const discountPct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const imageCount = mediaList.filter((m) => m.type !== 'video').length;
  const videoCount = mediaList.filter((m) => m.type === 'video').length;

  const handleChooseSize = (sz) => {
    setSelectedSize(sz);
    if (onSelectSize) onSelectSize(sz);
  };

  const handleChooseColor = (clr) => {
    setSelectedColor(clr);
    if (onSelectColor) onSelectColor(clr);
  };

  const handleAdd = () => {
    onAddToCart({
      product,
      selectedSize,
      selectedColor,
      quantity,
      categoryName: category?.name || '',
      subcategoryName: subcategory?.name || ''
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  const directWhatsAppUrl = buildSingleProductWhatsAppUrl({
    config,
    product,
    categoryName: category?.name,
    subcategoryName: subcategory?.name,
    selectedSize,
    selectedColor,
    quantity
  });

  const prevMedia = () => {
    setActiveMediaIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1));
  };

  const nextMedia = () => {
    setActiveMediaIndex((prev) => (prev === mediaList.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="product-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        <div className="product-modal-grid">
          {/* Left: Multi-Image & Video Gallery */}
          <div className="product-gallery-section">
            <div className="gallery-main-stage">
              {currentMedia.type === 'video' ? (
                <video
                  key={currentMedia.url}
                  src={currentMedia.url}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="gallery-main-video"
                />
              ) : (
                <img
                  src={currentMedia.url}
                  alt={currentMedia.caption || product.name}
                  className="gallery-main-image"
                />
              )}

              {mediaList.length > 1 && (
                <>
                  <button className="gallery-nav-btn prev" onClick={prevMedia} title="Previous media">
                    <ChevronLeft size={20} />
                  </button>
                  <button className="gallery-nav-btn next" onClick={nextMedia} title="Next media">
                    <ChevronRight size={20} />
                  </button>
                </>
              )}

              <div className="gallery-media-counts">
                {imageCount > 0 && (
                  <span className="media-pill">
                    <ImageIcon size={13} /> {imageCount} {imageCount === 1 ? 'Photo' : 'Photos'}
                  </span>
                )}
                {videoCount > 0 && (
                  <span className="media-pill video-pill">
                    <Film size={13} /> {videoCount} {videoCount === 1 ? 'Video' : 'Videos'}
                  </span>
                )}
              </div>

              {currentMedia.caption && (
                <div className="gallery-caption-bar">{currentMedia.caption}</div>
              )}
            </div>

            {/* Thumbnail Strip (Photos + Videos) */}
            <div className="gallery-thumbnails">
              {mediaList.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setActiveMediaIndex(idx)}
                  className={`gallery-thumb-btn ${idx === activeMediaIndex ? 'active' : ''}`}
                >
                  {item.type === 'video' ? (
                    <div className="video-thumb-preview">
                      <video src={item.url} muted preload="metadata" />
                      <span className="video-play-badge">
                        <Play size={14} fill="currentColor" />
                      </span>
                    </div>
                  ) : (
                    <img src={item.url} alt={item.caption || `View ${idx + 1}`} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Product Details & WhatsApp / Cart Actions */}
          <div className="product-details-section">
            <div className="product-breadcrumb-row">
              <span className="crumb-tag">{category?.name || 'Apparel'}</span>
              {subcategory && (
                <>
                  <span className="crumb-sep">/</span>
                  <span className="crumb-sub">{subcategory.name}</span>
                </>
              )}
              <span className="sku-tag">SKU: {product.sku}</span>
            </div>

            <h2 className="modal-product-title">{product.name}</h2>

            <div className="modal-price-row">
              <span className="modal-current-price">
                {currency}
                {Number(product.price).toLocaleString()}
              </span>
              {discountPct > 0 && (
                <>
                  <span className="modal-original-price">
                    {currency}
                    {Number(product.originalPrice).toLocaleString()}
                  </span>
                  <span className="modal-discount-badge">{discountPct}% OFF</span>
                </>
              )}
              {product.badge && <span className="modal-highlight-badge">{product.badge}</span>}
            </div>

            <p className="modal-description">{product.description}</p>

            {/* Fabric & Fit Specs */}
            <div className="specs-grid">
              <div className="spec-box">
                <Sparkles size={16} />
                <div>
                  <span className="spec-label">Fabric & GSM</span>
                  <strong>{product.fabric || '100% Premium Cotton'}</strong>
                </div>
              </div>
              <div className="spec-box">
                <Layers size={16} />
                <div>
                  <span className="spec-label">Silhouette / Fit</span>
                  <strong>{product.fit || 'Signature Fit'}</strong>
                </div>
              </div>
            </div>

            {/* Size Selection */}
            <div className="selector-block">
              <div className="selector-header">
                <span>
                  Select Size: <strong className="selected-val">{selectedSize}</strong>
                </span>
                <button
                  type="button"
                  className="btn-size-guide-toggle"
                  onClick={() => setShowSizeGuide((s) => !s)}
                >
                  <Ruler size={14} /> {showSizeGuide ? 'Hide Size Chart' : 'Size Chart & Fit Guide'}
                </button>
              </div>
              <div className="size-pills">
                {(product.sizes || ['S', 'M', 'L', 'XL']).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => handleChooseSize(sz)}
                    className={`size-pill-btn ${selectedSize === sz ? 'selected' : ''}`}
                  >
                    <span>{sz}</span>
                    {SIZE_MEASUREMENTS[sz] && (
                      <small>{SIZE_MEASUREMENTS[sz].chest}</small>
                    )}
                  </button>
                ))}
              </div>

              {showSizeGuide && (
                <div className="size-guide-box">
                  <table className="size-guide-table">
                    <thead>
                      <tr>
                        <th>Size</th>
                        <th>Chest (in)</th>
                        <th>Length (in)</th>
                        <th>Shoulder (in)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(product.sizes || ['S', 'M', 'L', 'XL', 'XXL']).map((sz) => {
                        const m = SIZE_MEASUREMENTS[sz] || {
                          chest: 'Standard',
                          length: 'Standard',
                          shoulder: 'Standard'
                        };
                        return (
                          <tr
                            key={sz}
                            className={selectedSize === sz ? 'highlighted-row' : ''}
                            onClick={() => handleChooseSize(sz)}
                          >
                            <td>
                              <strong>{sz}</strong>
                            </td>
                            <td>{m.chest}</td>
                            <td>{m.length}</td>
                            <td>{m.shoulder}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Color Selection */}
            <div className="selector-block">
              <div className="selector-header">
                <span>Select Colorway</span>
                <span className="selected-val">{selectedColor}</span>
              </div>
              <div className="color-pills">
                {(product.colors || ['Default']).map((clr) => (
                  <button
                    key={clr}
                    type="button"
                    onClick={() => handleChooseColor(clr)}
                    className={`color-pill-btn ${selectedColor === clr ? 'selected' : ''}`}
                  >
                    {clr}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity & Action Buttons */}
            <div className="modal-actions-wrapper">
              <div className="qty-control">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  −
                </button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => q + 1)}>
                  +
                </button>
              </div>

              <button
                type="button"
                className={`btn-add-to-cart ${addedFeedback ? 'added' : ''}`}
                disabled={!product.inStock}
                onClick={handleAdd}
              >
                {addedFeedback ? (
                  <>
                    <Check size={18} /> Added Size {selectedSize} to Bag
                  </>
                ) : (
                  <>
                    <ShoppingBag size={18} /> Add Size {selectedSize} • {currency}
                    {(Number(product.price) * quantity).toLocaleString()}
                  </>
                )}
              </button>
            </div>

            <a
              href={directWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp-direct"
            >
              <MessageCircle size={19} />
              Order Size {selectedSize} on WhatsApp (No Login Needed)
            </a>

            <div className="trust-note">
              <ShieldCheck size={15} />
              <span>
                Direct checkout via official <strong>Teeto Labels</strong> WhatsApp (+
                {config?.whatsappNumber || '919876543210'})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
