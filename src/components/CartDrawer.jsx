import React, { useState } from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  MessageCircle,
  Copy,
  Check,
  Truck,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { buildCartWhatsAppMessage, buildWhatsAppUrl } from '../utils/whatsapp';

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  products = [],
  onUpdateQty,
  onUpdateVariant,
  onRemoveItem,
  onClearCart,
  config
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const currency = config?.currencySymbol || '₹';
  const freeThreshold = Number(config?.freeShippingThreshold) || 1499;
  const baseShipping = Number(config?.shippingFee) || 99;

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );
  const shipping = subtotal === 0 || subtotal >= freeThreshold ? 0 : baseShipping;
  const total = subtotal + shipping;
  const amountToFreeShipping = Math.max(0, freeThreshold - subtotal);

  const previewMessage = buildCartWhatsAppMessage({
    config,
    cartItems,
    subtotal,
    shipping,
    total,
    customerName,
    customerPhone,
    customerAddress,
    notes,
    orderRef: 'TL-PREVIEW'
  });

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(previewMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handlePlaceWhatsAppOrder = async () => {
    if (cartItems.length === 0) return;
    setSubmitting(true);
    const orderRef = `TL-${Math.floor(100000 + Math.random() * 900000)}`;
    const messageText = buildCartWhatsAppMessage({
      config,
      cartItems,
      subtotal,
      shipping,
      total,
      customerName,
      customerPhone,
      customerAddress,
      notes,
      orderRef
    });
    const whatsappUrl = buildWhatsAppUrl(config?.whatsappNumber, messageText);

    try {
      await fetch('/api/orders/whatsapp-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerAddress,
          notes,
          items: cartItems,
          subtotal,
          shipping,
          total,
          whatsappUrl
        })
      });
    } catch {
      // Proceed to open WhatsApp even if offline log fails
    } finally {
      setSubmitting(false);
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cart-drawer-header">
          <div className="cart-title-group">
            <ShoppingBag size={20} />
            <h3>Your Shopping Bag</h3>
            <span className="cart-count-badge">
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          </div>
          <button className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Free Shipping Progress Banner */}
        {cartItems.length > 0 && (
          <div className="shipping-progress-banner">
            <div className="shipping-progress-text">
              <Truck size={15} />
              {amountToFreeShipping > 0 ? (
                <span>
                  Add{' '}
                  <strong>
                    {currency}
                    {amountToFreeShipping.toLocaleString()}
                  </strong>{' '}
                  more for <strong>FREE Express Shipping!</strong>
                </span>
              ) : (
                <span>
                  <Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} />
                  You unlocked <strong>FREE Express Shipping!</strong>
                </span>
              )}
            </div>
            <div className="shipping-bar-track">
              <div
                className="shipping-bar-fill"
                style={{
                  width: `${Math.min(100, Math.round((subtotal / freeThreshold) * 100))}%`
                }}
              />
            </div>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="empty-cart-state">
            <div className="empty-cart-icon">
              <ShoppingBag size={42} />
            </div>
            <h4>Your Teeto Labels bag is empty</h4>
            <p>
              Explore our Round Neck Tees, Oversized Streetwear, and Cuban Collar Shirts. No login
              needed — checkout directly via WhatsApp!
            </p>
            <button className="btn-primary-dark" onClick={onClose}>
              Explore Collection
            </button>
          </div>
        ) : (
          <>
            <div className="cart-drawer-body">
              <div className="cart-items-list">
                {cartItems.map((item) => {
                  const liveProd = products.find((p) => p.id === item.productId);
                  const sizeOptions =
                    liveProd?.sizes || item.availableSizes || [item.selectedSize || 'M'];
                  const colorOptions =
                    liveProd?.colors || item.availableColors || [item.selectedColor || 'Default'];

                  return (
                    <div key={item.cartKey} className="cart-item-card">
                      <img
                        src={item.thumbnail}
                        alt={item.name}
                        className="cart-item-thumb"
                      />
                      <div className="cart-item-info">
                        <div className="cart-item-top">
                          <div>
                            <span className="cart-item-cat">
                              {item.categoryName}
                              {item.subcategoryName ? ` • ${item.subcategoryName}` : ''}
                            </span>
                            <h5>{item.name}</h5>
                          </div>
                          <button
                            className="cart-remove-btn"
                            onClick={() => onRemoveItem(item.cartKey)}
                            title="Remove item"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="cart-item-variants">
                          <label className="cart-variant-select-wrap">
                            <span>Size:</span>
                            <select
                              value={item.selectedSize}
                              onChange={(e) =>
                                onUpdateVariant &&
                                onUpdateVariant(item.cartKey, e.target.value, item.selectedColor)
                              }
                            >
                              {sizeOptions.map((sz) => (
                                <option key={sz} value={sz}>
                                  {sz}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="cart-variant-select-wrap">
                            <span>Color:</span>
                            <select
                              value={item.selectedColor}
                              onChange={(e) =>
                                onUpdateVariant &&
                                onUpdateVariant(item.cartKey, item.selectedSize, e.target.value)
                              }
                            >
                              {colorOptions.map((clr) => (
                                <option key={clr} value={clr}>
                                  {clr}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <div className="cart-item-bottom">
                          <div className="cart-qty-stepper">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.cartKey, item.quantity - 1)}
                            >
                              −
                            </button>
                            <span>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateQty(item.cartKey, item.quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                          <strong className="cart-item-price">
                            {currency}
                            {(Number(item.price) * Number(item.quantity)).toLocaleString()}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Optional Customer Details for WhatsApp Message */}
              <div className="whatsapp-delivery-box">
                <div className="delivery-box-header">
                  <h4>Quick Delivery Details (Included in WhatsApp Message)</h4>
                  <span className="no-login-pill">No Account Required</span>
                </div>
                <div className="delivery-form-grid">
                  <input
                    type="text"
                    placeholder="Your Name (optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                  <input
                    type="tel"
                    placeholder="Your Phone Number (optional)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                  <textarea
                    rows={2}
                    placeholder="Delivery Address / City & Pincode (optional)"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Special notes (e.g. Gift wrap, urgent delivery)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="preview-toggle-row">
                  <button
                    type="button"
                    className="btn-link-subtle"
                    onClick={() => setShowPreview((p) => !p)}
                  >
                    {showPreview ? 'Hide WhatsApp Message Preview' : 'Preview Formatted WhatsApp Order Message'}
                  </button>
                  <button
                    type="button"
                    className="btn-copy-msg"
                    onClick={handleCopyMessage}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied!' : 'Copy Order Text'}
                  </button>
                </div>

                {showPreview && (
                  <pre className="whatsapp-message-preview">{previewMessage}</pre>
                )}
              </div>
            </div>

            <div className="cart-drawer-footer">
              <div className="cart-summary-lines">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>
                    {currency}
                    {subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>
                    {shipping === 0 ? (
                      <strong className="free-tag">FREE</strong>
                    ) : (
                      `${currency}${shipping.toLocaleString()}`
                    )}
                  </span>
                </div>
                <div className="summary-row total">
                  <span>Total Payable</span>
                  <span>
                    {currency}
                    {total.toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="btn-whatsapp-checkout"
                disabled={submitting}
                onClick={handlePlaceWhatsAppOrder}
              >
                <MessageCircle size={20} />
                <span>
                  Place Order on WhatsApp (+{config?.whatsappNumber || '919876543210'})
                </span>
                <ExternalLink size={15} />
              </button>

              <div className="cart-footer-subactions">
                <button type="button" className="btn-clear-bag" onClick={onClearCart}>
                  Clear Bag
                </button>
                <span className="whatsapp-direct-hint">
                  Opens WhatsApp with your pre-filled itemized order
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
