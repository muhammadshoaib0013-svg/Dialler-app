/**
 * whatsapp.js — HB Electronics WhatsApp Receipt Engine
 * Generates rich bilingual (English / Urdu) formatted messages
 * and opens them directly in WhatsApp Web.
 */

const STORE_NAME   = 'HB Electronics';
const SUPPORT_LINE = '+92-300-0000000';
const WEBSITE      = 'www.hbelectronics.pk';
const SERVER_BASE  = 'https://recordings.hbelectronics.pk/listen';

// ─── Message Builders ──────────────────────────────────────────────────────────

const buildSaleReceipt = (leadData, recordingId) => {
  const name      = leadData?.name || 'Valued Customer';
  const phone     = leadData?.phone || 'N/A';
  const timestamp = new Date().toLocaleString('en-PK', { dateStyle: 'long', timeStyle: 'short' });
  const recUrl    = recordingId ? `${SERVER_BASE}/${recordingId}` : null;

  const lines = [
    `🎉 *Order Confirmed — ${STORE_NAME}*`,
    ``,
    `Dear *${name}*,`,
    `Thank you for your purchase! Your order has been successfully confirmed and is now being processed.`,
    ``,
    `📋 *Order Details*`,
    `━━━━━━━━━━━━━━━━━━━`,
    `👤 Customer  : ${name}`,
    `📞 Contact   : ${phone}`,
    `🗓️  Date/Time : ${timestamp}`,
    `✅  Status    : CONFIRMED`,
    recUrl ? `🎙️  Recording : ${recUrl}` : null,
    `━━━━━━━━━━━━━━━━━━━`,
    ``,
    `🚚 *Delivery & Installation*`,
    `Free home delivery within 2–3 business days.`,
    `Certified technician installation within 24 hours of delivery.`,
    `2-Year manufacturer warranty — fully registered.`,
    ``,
    `────────────────────────`,
    `*آپ کی خریداری کا بہت بہت شکریہ!* 🙏`,
    `آپ کے آرڈر کی تصدیق ہو گئی ہے۔`,
    `ہماری ڈلیوری ٹیم جلد آپ سے رابطہ کرے گی۔`,
    `وارنٹی اور ڈلیوری بالکل مفت ہے۔`,
    ``,
    `📞 Support : ${SUPPORT_LINE}`,
    `🌐 Website : ${WEBSITE}`,
    `🏬 ${STORE_NAME} — Quality You Can Trust`,
  ].filter(l => l !== null).join('\n');

  return lines;
};

const buildCallbackReceipt = (leadData, recordingId) => {
  const name      = leadData?.name || 'Valued Customer';
  const timestamp = new Date().toLocaleString('en-PK', { dateStyle: 'long', timeStyle: 'short' });

  return [
    `📞 *Callback Scheduled — ${STORE_NAME}*`,
    ``,
    `Dear *${name}*,`,
    `As requested during our call, we have scheduled a callback for you.`,
    `Our representative will contact you shortly.`,
    ``,
    `📋 *Callback Details*`,
    `━━━━━━━━━━━━━━━━━━━`,
    `👤 Customer  : ${name}`,
    `📞 Contact   : ${leadData?.phone || 'N/A'}`,
    `🗓️  Scheduled : ${timestamp}`,
    `🔁 Status    : CALLBACK PENDING`,
    `━━━━━━━━━━━━━━━━━━━`,
    ``,
    `────────────────────────`,
    `*کال بیک کی یاددہانی* 🔔`,
    `جیسا کہ آپ نے درخواست کی تھی،`,
    `ہم جلد از جلد آپ سے دوبارہ رابطہ کریں گے۔`,
    ``,
    `📞 ${SUPPORT_LINE} | 🌐 ${WEBSITE}`,
    `🏬 ${STORE_NAME}`,
  ].join('\n');
};

const buildFollowUpMessage = (leadData) => {
  const name = leadData?.name || 'Valued Customer';
  return [
    `📱 *Follow-Up — ${STORE_NAME}*`,
    ``,
    `Dear *${name}*,`,
    `Thank you for speaking with our team today.`,
    `If you have any questions or need assistance, please don't hesitate to reach out.`,
    ``,
    `────────────────────────`,
    `*ہمارے ساتھ بات کرنے کا شکریہ!* 🙏`,
    `کسی بھی سوال یا مدد کے لیے ہم سے رابطہ کریں۔`,
    ``,
    `📞 ${SUPPORT_LINE} | 🌐 ${WEBSITE}`,
    `🏬 ${STORE_NAME} — Always at Your Service`,
  ].join('\n');
};

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Builds the appropriate receipt message for a given disposition code.
 * @param {object} leadData    - { name, phone, ... }
 * @param {string} code        - Disposition code: 'SALE' | 'CBHOLD' | ...
 * @param {string} recordingId - Optional recording reference
 * @returns {string} Formatted WhatsApp message
 */
export const buildReceiptMessage = (leadData, code, recordingId = '') => {
  if (code === 'SALE')   return buildSaleReceipt(leadData, recordingId);
  if (code === 'CBHOLD') return buildCallbackReceipt(leadData, recordingId);
  return buildFollowUpMessage(leadData);
};

/**
 * Primary export — opens WhatsApp Web with a formatted bilingual receipt.
 * @param {object} leadData    - { name, phone, ... }
 * @param {string} code        - Disposition code
 * @param {string} recordingId - Optional recording reference for SALE receipts
 */
export const sendWhatsAppReceipt = (leadData, code, recordingId = '') => {
  if (!leadData?.phone) {
    console.error('[WhatsApp] sendWhatsAppReceipt: no phone number on lead data.', leadData);
    return;
  }

  const cleanPhone = String(leadData.phone).replace(/\D/g, '');
  const message    = buildReceiptMessage(leadData, code, recordingId);
  const url        = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;

  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * @deprecated Use sendWhatsAppReceipt() instead.
 * Retained for backward compatibility.
 */
export const triggerWhatsAppMessage = (phone, leadName, code) =>
  sendWhatsAppReceipt({ name: leadName, phone }, code, '');
