export function sanitizePhone(phone) {
  return String(phone || '919876543210').replace(/[^0-9]/g, '');
}

export function buildCartWhatsAppMessage({
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
}) {
  const currency = config?.currencySymbol || '₹';
  const greeting =
    config?.whatsappGreeting ||
    `Hello ${config?.brandName || 'Teeto Labels'}! 👋 I would like to place an order:`;

  const lines = [
    greeting,
    '',
    `🧾 *Order Ref:* #${orderRef || `TL-${Math.floor(100000 + Math.random() * 900000)}`}`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `🛍️ *ORDER ITEMS:*`
  ];

  cartItems.forEach((item, index) => {
    const lineTotal = (Number(item.price) * Number(item.quantity)).toLocaleString();
    lines.push(
      `${index + 1}. *${item.name}* (${item.sku || 'TL'})`,
      `   • Category: ${item.categoryName || 'Apparel'}${item.subcategoryName ? ` › ${item.subcategoryName}` : ''}`,
      `   • Size: *${item.selectedSize}* | Color: *${item.selectedColor}*`,
      `   • Qty: ${item.quantity} × ${currency}${Number(item.price).toLocaleString()} = *${currency}${lineTotal}*`
    );
  });

  lines.push(
    `━━━━━━━━━━━━━━━━━━━━`,
    `Subtotal: ${currency}${Number(subtotal).toLocaleString()}`,
    `Shipping: ${shipping === 0 ? 'FREE' : `${currency}${Number(shipping).toLocaleString()}`}`,
    `💰 *TOTAL PAYABLE: ${currency}${Number(total).toLocaleString()}*`
  );

  if (customerName || customerPhone || customerAddress || notes) {
    lines.push('', `📍 *DELIVERY DETAILS:*`);
    if (customerName) lines.push(`• Name: ${customerName}`);
    if (customerPhone) lines.push(`• Phone: ${customerPhone}`);
    if (customerAddress) lines.push(`• Address: ${customerAddress}`);
    if (notes) lines.push(`• Notes: ${notes}`);
  }

  lines.push('', `Please confirm availability and share payment details. Thank you!`);

  return lines.join('\n');
}

export function buildSingleProductWhatsAppUrl({
  config,
  product,
  categoryName,
  subcategoryName,
  selectedSize,
  selectedColor,
  quantity = 1
}) {
  const currency = config?.currencySymbol || '₹';
  const phone = sanitizePhone(config?.whatsappNumber);
  const total = Number(product.price) * Number(quantity);

  const message = [
    config?.whatsappGreeting || `Hello ${config?.brandName || 'Teeto Labels'}! 👋`,
    '',
    `I want to order this item directly:`,
    `👕 *${product.name}* (SKU: ${product.sku || 'N/A'})`,
    `• Category: ${categoryName || ''}${subcategoryName ? ` › ${subcategoryName}` : ''}`,
    `• Selected Size: *${selectedSize}*`,
    `• Selected Color: *${selectedColor}*`,
    `• Quantity: *${quantity}*`,
    `• Price: *${currency}${total.toLocaleString()}*`,
    '',
    `Please let me know how to proceed with this order!`
  ].join('\n');

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppUrl(phone, messageText) {
  const cleanPhone = sanitizePhone(phone);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
}
