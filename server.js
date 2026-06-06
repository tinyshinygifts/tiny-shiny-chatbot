const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
let MongoClient = null;
try { ({ MongoClient } = require('mongodb')); } catch (err) { console.warn('MongoDB package not installed; JSON file storage fallback active.'); }

const app = express();
const PORT = process.env.PORT || 5057;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '20mb' }));

const COOKIE_NAME = 'tsg_chatbot_admin';
const SESSION_HOURS = Number(process.env.ADMIN_SESSION_HOURS || 12);
function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(header.split(';').map(v => v.trim()).filter(Boolean).map(v => {
    const idx = v.indexOf('=');
    return [decodeURIComponent(v.slice(0, idx)), decodeURIComponent(v.slice(idx + 1))];
  }));
}
function authSecret() {
  return process.env.SECURITY_SESSION_SECRET || process.env.ADMIN_PASSWORD || 'change-this-local-secret';
}
function sign(payload) { return crypto.createHmac('sha256', authSecret()).update(payload).digest('hex'); }
function makeToken() {
  const payload = JSON.stringify({ role: 'admin', exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000 });
  const body = Buffer.from(payload).toString('base64url');
  return body + '.' + sign(body);
}
function verifyToken(token) {
  if (!token || !token.includes('.')) return false;
  const [body, sig] = token.split('.');
  if (sign(body) !== sig) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return payload.role === 'admin' && Number(payload.exp) > Date.now();
  } catch { return false; }
}
function isSecureReq(req) { return req.secure || req.headers['x-forwarded-proto'] === 'https'; }
function setAdminCookie(req, res) {
  const parts = [`${COOKIE_NAME}=${encodeURIComponent(makeToken())}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${SESSION_HOURS * 60 * 60}`];
  if (isSecureReq(req)) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
function clearAdminCookie(req, res) {
  const base = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  const cookies = [base];
  if (isSecureReq(req)) cookies.push(base + '; Secure');
  res.setHeader('Set-Cookie', cookies);
}
function isAuthed(req) { return verifyToken(parseCookies(req)[COOKIE_NAME]); }
function requireAdmin(req, res, next) {
  if (isAuthed(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ ok: false, error: 'Admin login required' });
  return res.redirect('/login.html');
}

// Protect admin pages and admin JavaScript files. Public chatbot widget remains open.
app.use((req, res, next) => {
  const protectedFiles = ['/admin.html', '/api-settings.html', '/admin.js', '/api-settings.js'];
  if (protectedFiles.includes(req.path)) return requireAdmin(req, res, next);
  return next();
});

const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const faqPath = path.join(dataDir, 'faq.json');
const settingsPath = path.join(dataDir, 'settings.json');
const leadsPath = path.join(dataDir, 'leads.json');
const eventsPath = path.join(dataDir, 'visitor-events.json');
const leadMessagesPath = path.join(dataDir, 'lead-messages.json');
const mediaImagesPath = path.join(dataDir, 'media-images.json');
const crmPath = path.join(dataDir, 'crm.json');
const whatsappTemplatesPath = path.join(dataDir, 'whatsapp-templates.json');
const whatsappInboxPath = path.join(dataDir, 'whatsapp-inbox.json');
const shopifyOAuthStatePath = path.join(dataDir, 'shopify-oauth-state.json');

// MongoDB persistent storage (Render-safe). When MONGODB_URI is set, JSON data and API settings are loaded from MongoDB and kept synced.
const mongoUri = process.env.MONGODB_URI || '';
const mongoDbName = process.env.MONGODB_DB_NAME || 'tiny_shiny_chatbot';
const mongoCollectionName = process.env.MONGODB_COLLECTION || 'chatbot_store';
let mongoClient = null;
let mongoCollection = null;
let mongoReady = false;
let mongoEnvCache = null;
const mongoJsonCache = new Map();
function deepClone(value) { return value === undefined ? value : JSON.parse(JSON.stringify(value)); }
function mongoKeyFromPath(filePath) { return 'json:' + path.basename(String(filePath || 'unknown.json')); }
function readLocalJson(filePath, fallback) { try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { return fallback; } }
function mongoKnownPaths() { return [faqPath, settingsPath, leadsPath, eventsPath, leadMessagesPath, mediaImagesPath, crmPath, whatsappTemplatesPath, whatsappInboxPath, shopifyOAuthStatePath]; }
async function mongoSave(key, value) {
  if (!mongoReady || !mongoCollection) return;
  try { await mongoCollection.updateOne({ key }, { $set: { key, value, updatedAt: new Date() } }, { upsert: true }); }
  catch (err) { console.error('Mongo save failed for', key, err.message); }
}
function mongoSaveSoon(key, value) { mongoSave(key, deepClone(value)).catch(() => {}); }

const envPath = path.join(__dirname, '.env');
const apiKeys = [
  'PORT','BUSINESS_NAME','WEBSITE_URL','WHATSAPP_NUMBER','OWNER_WHATSAPP_NUMBER',
  'ADMIN_USERNAME','ADMIN_PASSWORD','ADMIN_DOB','SECURITY_SESSION_SECRET','ADMIN_SESSION_HOURS',
  'SHOPIFY_STORE_DOMAIN','SHOPIFY_ADMIN_ACCESS_TOKEN','SHOPIFY_API_VERSION','CREATE_SHOPIFY_DRAFT_ORDER',
  'SHOPIFY_CLIENT_ID','SHOPIFY_CLIENT_SECRET','SHOPIFY_APP_URL','SHOPIFY_OAUTH_SCOPES','SHOPIFY_OAUTH_REDIRECT_URI',
  'WHATSAPP_CLOUD_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_TEST_TEMPLATE_NAME','WHATSAPP_TEST_TEMPLATE_LANG','WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'CUSTOMER_WHATSAPP_MESSAGES_ENABLED','CUSTOMER_WHATSAPP_TEMPLATE_NAME','CUSTOMER_WHATSAPP_TEMPLATE_LANG',
  'SHOPIFY_WEBHOOK_SECRET',
  'GOOGLE_SHEETS_ENABLED','GOOGLE_SHEETS_WEBHOOK_URL','GOOGLE_SHEET_URL','GOOGLE_SHEETS_SECRET',
  'SHIPROCKET_TOKEN','SHIPROCKET_EMAIL','SHIPROCKET_PASSWORD',
  'ICARRY_ENABLED','ICARRY_API_TOKEN','ICARRY_API_KEY','ICARRY_CLIENT_ID','ICARRY_CLIENT_SECRET','ICARRY_USERNAME','ICARRY_PASSWORD','ICARRY_TRACKING_URL',
  'ORDER_CONFIRMATION_WHATSAPP_ENABLED','ORDER_CONFIRMATION_TEMPLATE_NAME','ORDER_CONFIRMATION_TEMPLATE_LANG'
];
const secretKeys = new Set(['SHOPIFY_ADMIN_ACCESS_TOKEN','SHOPIFY_CLIENT_SECRET','WHATSAPP_CLOUD_TOKEN','SHOPIFY_WEBHOOK_SECRET','GOOGLE_SHEETS_WEBHOOK_URL','GOOGLE_SHEETS_SECRET','SHIPROCKET_TOKEN','SHIPROCKET_PASSWORD','ADMIN_PASSWORD','ADMIN_DOB','SECURITY_SESSION_SECRET','ICARRY_API_TOKEN','ICARRY_API_KEY','ICARRY_CLIENT_SECRET','ICARRY_PASSWORD']);
function readEnvFileWithoutMongo() {
  const out = {};
  const text = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  for (const key of apiKeys) if (process.env[key] && !out[key]) out[key] = process.env[key];
  return out;
}
function readEnvFile() {
  const out = readEnvFileWithoutMongo();
  if (mongoEnvCache && typeof mongoEnvCache === 'object') {
    for (const key of apiKeys) {
      if (Object.prototype.hasOwnProperty.call(mongoEnvCache, key)) out[key] = String(mongoEnvCache[key] ?? '');
    }
  }
  return out;
}
function writeEnvFile(next) {
  const current = readEnvFile();
  const merged = { ...current };
  for (const key of apiKeys) {
    if (Object.prototype.hasOwnProperty.call(next, key)) merged[key] = String(next[key] ?? '').trim();
  }
  const lines = [
    'PORT=' + (merged.PORT || '5057'),
    'BUSINESS_NAME=' + (merged.BUSINESS_NAME || 'Tiny Shiny Gifts'),
    'WEBSITE_URL=' + (merged.WEBSITE_URL || 'https://tinyshinygifts.com'),
    'WHATSAPP_NUMBER=' + (merged.WHATSAPP_NUMBER || ''),
    'OWNER_WHATSAPP_NUMBER=' + (merged.OWNER_WHATSAPP_NUMBER || ''),
    '',
    '# Admin login security',
    'ADMIN_USERNAME=' + (merged.ADMIN_USERNAME || process.env.ADMIN_USERNAME || 'admin'),
    'ADMIN_PASSWORD=' + (merged.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin'),
    '# Forgot password DOB format: DD/MM/YYYY',
    'ADMIN_DOB=' + (merged.ADMIN_DOB || process.env.ADMIN_DOB || '26/04/1986'),
    'SECURITY_SESSION_SECRET=' + (merged.SECURITY_SESSION_SECRET || process.env.SECURITY_SESSION_SECRET || crypto.randomBytes(24).toString('hex')),
    'ADMIN_SESSION_HOURS=' + (merged.ADMIN_SESSION_HOURS || process.env.ADMIN_SESSION_HOURS || '12'),
    '',
    '# Shopify Admin API - required for live order tracking and optional draft order creation',
    'SHOPIFY_STORE_DOMAIN=' + (merged.SHOPIFY_STORE_DOMAIN || ''),
    'SHOPIFY_ADMIN_ACCESS_TOKEN=' + (merged.SHOPIFY_ADMIN_ACCESS_TOKEN || ''),
    'SHOPIFY_API_VERSION=' + (merged.SHOPIFY_API_VERSION || '2025-10'),
    'CREATE_SHOPIFY_DRAFT_ORDER=' + (merged.CREATE_SHOPIFY_DRAFT_ORDER || 'false'),
    '',
    '# Shopify OAuth app credentials - use Client ID/Secret from Shopify Dev Dashboard',
    'SHOPIFY_CLIENT_ID=' + (merged.SHOPIFY_CLIENT_ID || ''),
    'SHOPIFY_CLIENT_SECRET=' + (merged.SHOPIFY_CLIENT_SECRET || ''),
    'SHOPIFY_APP_URL=' + (merged.SHOPIFY_APP_URL || merged.WEBSITE_URL || 'https://chat.tinyshinygifts.com'),
    'SHOPIFY_OAUTH_SCOPES=' + (merged.SHOPIFY_OAUTH_SCOPES || 'read_orders,read_products,read_customers,read_draft_orders,write_draft_orders'),
    'SHOPIFY_OAUTH_REDIRECT_URI=' + (merged.SHOPIFY_OAUTH_REDIRECT_URI || ''),
    '',
    '# WhatsApp Cloud API - required for owner/team notification from chatbot',
    'WHATSAPP_CLOUD_TOKEN=' + (merged.WHATSAPP_CLOUD_TOKEN || ''),
    'WHATSAPP_PHONE_NUMBER_ID=' + (merged.WHATSAPP_PHONE_NUMBER_ID || ''),
    '# For test/business-initiated messages from your own number, use an approved template, not hello_world.',
    'WHATSAPP_TEST_TEMPLATE_NAME=' + (merged.WHATSAPP_TEST_TEMPLATE_NAME || ''),
    'WHATSAPP_TEST_TEMPLATE_LANG=' + (merged.WHATSAPP_TEST_TEMPLATE_LANG || 'en_US'),
    'WHATSAPP_WEBHOOK_VERIFY_TOKEN=' + (merged.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'tinyshiny_verify_token'),
    '',
    '# Customer WhatsApp follow-up. Keep false until you have customer opt-in and approved WhatsApp template/session rules.',
    'CUSTOMER_WHATSAPP_MESSAGES_ENABLED=' + (merged.CUSTOMER_WHATSAPP_MESSAGES_ENABLED || 'false'),
    'CUSTOMER_WHATSAPP_TEMPLATE_NAME=' + (merged.CUSTOMER_WHATSAPP_TEMPLATE_NAME || ''),
    'CUSTOMER_WHATSAPP_TEMPLATE_LANG=' + (merged.CUSTOMER_WHATSAPP_TEMPLATE_LANG || 'en'),
    '',
    '# Google Sheets CRM auto-save. Use Google Apps Script Web App URL.',
    'GOOGLE_SHEETS_ENABLED=' + (merged.GOOGLE_SHEETS_ENABLED || 'false'),
    'GOOGLE_SHEETS_WEBHOOK_URL=' + (merged.GOOGLE_SHEETS_WEBHOOK_URL || ''),
    'GOOGLE_SHEET_URL=' + (merged.GOOGLE_SHEET_URL || ''),
    'GOOGLE_SHEETS_SECRET=' + (merged.GOOGLE_SHEETS_SECRET || ''),
    '',
    '# Shiprocket API - optional for tracking link/status.',
    'SHIPROCKET_TOKEN=' + (merged.SHIPROCKET_TOKEN || ''),
    'SHIPROCKET_EMAIL=' + (merged.SHIPROCKET_EMAIL || ''),
    'SHIPROCKET_PASSWORD=' + (merged.SHIPROCKET_PASSWORD || ''),
    '',
    '# iCarry API - optional for tracking link/status.',
    'ICARRY_ENABLED=' + (merged.ICARRY_ENABLED || 'false'),
    'ICARRY_API_TOKEN=' + (merged.ICARRY_API_TOKEN || ''),
    'ICARRY_API_KEY=' + (merged.ICARRY_API_KEY || ''),
    'ICARRY_CLIENT_ID=' + (merged.ICARRY_CLIENT_ID || ''),
    'ICARRY_CLIENT_SECRET=' + (merged.ICARRY_CLIENT_SECRET || ''),
    'ICARRY_USERNAME=' + (merged.ICARRY_USERNAME || ''),
    'ICARRY_PASSWORD=' + (merged.ICARRY_PASSWORD || ''),
    'ICARRY_TRACKING_URL=' + (merged.ICARRY_TRACKING_URL || 'https://www.icarry.in/'),
    '',
    '# Security for Shopify webhook. Add later when hosting.',
    'SHOPIFY_WEBHOOK_SECRET=' + (merged.SHOPIFY_WEBHOOK_SECRET || ''),
    '',
    '# Order confirmation automation',
    'ORDER_CONFIRMATION_WHATSAPP_ENABLED=' + (merged.ORDER_CONFIRMATION_WHATSAPP_ENABLED || 'false'),
    'ORDER_CONFIRMATION_TEMPLATE_NAME=' + (merged.ORDER_CONFIRMATION_TEMPLATE_NAME || ''),
    'ORDER_CONFIRMATION_TEMPLATE_LANG=' + (merged.ORDER_CONFIRMATION_TEMPLATE_LANG || 'en')
  ];
  fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf8');
  for (const key of apiKeys) process.env[key] = merged[key] || '';
  mongoEnvCache = { ...merged };
  mongoSaveSoon('env', mongoEnvCache);
  return merged;
}
function publicConfig(env) {
  const out = {};
  for (const key of apiKeys) {
    const value = env[key] || '';
    out[key] = secretKeys.has(key) && value ? '********' : value;
    out[key + '_SET'] = Boolean(value);
  }
  return out;
}

function envLine(key, env) {
  return `${key}=${env[key] || ''}`;
}
function configBackupText(env) {
  const templates = readJson(whatsappTemplatesPath, []);
  const whatsappInbox = readJson(whatsappInboxPath, []);
  const settings = readJson(settingsPath, {});
  const sections = [
    ['Business', ['BUSINESS_NAME','WEBSITE_URL','WHATSAPP_NUMBER','OWNER_WHATSAPP_NUMBER']],
    ['Admin Login Security', ['ADMIN_USERNAME','ADMIN_PASSWORD','ADMIN_DOB','SECURITY_SESSION_SECRET','ADMIN_SESSION_HOURS']],
    ['Shopify API', ['SHOPIFY_STORE_DOMAIN','SHOPIFY_ADMIN_ACCESS_TOKEN','SHOPIFY_API_VERSION','CREATE_SHOPIFY_DRAFT_ORDER','SHOPIFY_CLIENT_ID','SHOPIFY_CLIENT_SECRET','SHOPIFY_APP_URL','SHOPIFY_OAUTH_SCOPES','SHOPIFY_OAUTH_REDIRECT_URI','SHOPIFY_WEBHOOK_SECRET']],
    ['WhatsApp Cloud API', ['WHATSAPP_CLOUD_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_TEST_TEMPLATE_NAME','WHATSAPP_TEST_TEMPLATE_LANG']],
    ['Customer WhatsApp Follow-up', ['CUSTOMER_WHATSAPP_MESSAGES_ENABLED','CUSTOMER_WHATSAPP_TEMPLATE_NAME','CUSTOMER_WHATSAPP_TEMPLATE_LANG','ORDER_CONFIRMATION_WHATSAPP_ENABLED','ORDER_CONFIRMATION_TEMPLATE_NAME','ORDER_CONFIRMATION_TEMPLATE_LANG']],
    ['Google Sheets', ['GOOGLE_SHEETS_ENABLED','GOOGLE_SHEETS_WEBHOOK_URL','GOOGLE_SHEET_URL','GOOGLE_SHEETS_SECRET']],
    ['Shiprocket API', ['SHIPROCKET_TOKEN','SHIPROCKET_EMAIL','SHIPROCKET_PASSWORD']],
    ['iCarry API', ['ICARRY_ENABLED','ICARRY_TRACKING_URL','ICARRY_API_TOKEN','ICARRY_API_KEY','ICARRY_CLIENT_ID','ICARRY_CLIENT_SECRET','ICARRY_USERNAME','ICARRY_PASSWORD']]
  ];
  const lines = [];
  lines.push('Tiny Shiny Chatbot - API Settings Backup');
  lines.push('Downloaded: ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST');
  lines.push('');
  lines.push('NOTE: Is file ko safe rakhein. Isme secret keys/passwords full value me hain. Isi file ko Upload API Backup se restore bhi kar sakte hain.');
  lines.push('');
  for (const [title, keys] of sections) {
    lines.push('==============================');
    lines.push(title);
    lines.push('==============================');
    for (const key of keys) lines.push(envLine(key, env));
    lines.push('');
  }
  lines.push('==============================');
  lines.push('WhatsApp Template Library JSON');
  lines.push('==============================');
  lines.push(JSON.stringify(templates, null, 2));
  lines.push('');
  lines.push('==============================');
  lines.push('Chatbot UI Settings JSON');
  lines.push('==============================');
  lines.push(JSON.stringify(settings, null, 2));
  lines.push('');
  lines.push('__TSG_BACKUP_JSON_START__');
  lines.push(JSON.stringify({ version: 3, downloadedAt: nowIso(), env, whatsappTemplates: templates, whatsappInbox, settings }, null, 2));
  lines.push('__TSG_BACKUP_JSON_END__');
  return lines.join('\n');
}

function parseBackupText(text = '') {
  const raw = String(text || '');
  const start = raw.indexOf('__TSG_BACKUP_JSON_START__');
  const end = raw.indexOf('__TSG_BACKUP_JSON_END__');
  if (start >= 0 && end > start) {
    const jsonText = raw.slice(start + '__TSG_BACKUP_JSON_START__'.length, end).trim();
    const parsed = JSON.parse(jsonText);
    return {
      env: parsed.env || {},
      whatsappTemplates: Array.isArray(parsed.whatsappTemplates) ? parsed.whatsappTemplates : null,
      whatsappInbox: Array.isArray(parsed.whatsappInbox) ? parsed.whatsappInbox : null,
      settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : null
    };
  }
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('=') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (apiKeys.includes(key)) env[key] = value;
  }
  return { env, whatsappTemplates: null, whatsappInbox: null, settings: null };
}


async function initMongoStorage() {
  if (!mongoUri || !MongoClient) {
    console.log('MongoDB storage disabled. Using local JSON files. Set MONGODB_URI to enable permanent storage.');
    return;
  }
  try {
    mongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });
    await mongoClient.connect();
    const db = mongoClient.db(mongoDbName);
    mongoCollection = db.collection(mongoCollectionName);
    await mongoCollection.createIndex({ key: 1 }, { unique: true });
    const docs = await mongoCollection.find({}).toArray();
    for (const doc of docs) {
      if (doc.key === 'env') mongoEnvCache = doc.value || {};
      else if (String(doc.key || '').startsWith('json:')) mongoJsonCache.set(doc.key, doc.value);
    }
    mongoReady = true;
    for (const filePath of mongoKnownPaths()) {
      const key = mongoKeyFromPath(filePath);
      if (!mongoJsonCache.has(key)) {
        const localValue = readLocalJson(filePath, []);
        mongoJsonCache.set(key, localValue);
        await mongoSave(key, localValue);
      }
    }
    if (!mongoEnvCache) {
      mongoEnvCache = readEnvFileWithoutMongo();
      await mongoSave('env', mongoEnvCache);
    }
    for (const [key, value] of Object.entries(mongoEnvCache || {})) {
      if (apiKeys.includes(key)) process.env[key] = String(value || '');
    }
    console.log('MongoDB persistent storage connected:', mongoDbName + '.' + mongoCollectionName);
  } catch (err) {
    console.error('MongoDB connection failed. Local JSON fallback active:', err.message);
    mongoReady = false;
  }
}

function safeMergeConfigUpload(current, incoming) {
  const next = {};
  for (const key of apiKeys) {
    if (!Object.prototype.hasOwnProperty.call(incoming || {}, key)) continue;
    const val = String(incoming[key] ?? '').trim();
    const looksMasked = val === '' || val === '********' || /\*{2,}/.test(val) || /\.\.\.$/.test(val);
    if (secretKeys.has(key) && looksMasked && current[key]) next[key] = current[key];
    else if (val !== '' || !current[key]) next[key] = val;
  }
  return next;
}


function readJson(filePath, fallback) {
  const key = mongoKeyFromPath(filePath);
  if (mongoJsonCache.has(key)) return deepClone(mongoJsonCache.get(key));
  return readLocalJson(filePath, fallback);
}
function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  const key = mongoKeyFromPath(filePath);
  mongoJsonCache.set(key, deepClone(data));
  mongoSaveSoon(key, data);
}
function appendJson(filePath, item) {
  const arr = readJson(filePath, []);
  arr.unshift(item);
  writeJson(filePath, arr.slice(0, 2000));
  try { afterDataAppend(filePath, item); } catch (err) { console.error('afterDataAppend error:', err.message); }
  return item;
}
function nowIso() { return new Date().toISOString(); }
function cleanPhone(phone) { return String(phone || '').replace(/[^0-9]/g, ''); }
function money(v){ return v === undefined || v === null || v === '' ? '' : String(v); }

function cleanText(v){ return String(v || '').trim(); }
function flattenForSheet(obj, prefix = '', out = {}) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== 'object') { out[prefix || 'value'] = String(obj); return out; }
  if (Array.isArray(obj)) { out[prefix || 'items'] = obj.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' | '); return out; }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flattenForSheet(v, key, out);
    else out[key] = Array.isArray(v) ? v.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' | ') : String(v ?? '');
  }
  return out;
}
function crmKey(record = {}) {
  const phone = cleanPhone(record.phone || record.customerPhone || record.mobile || record.customer?.phone || record.raw?.phone || record.raw?.customer?.phone);
  const email = cleanText(record.email || record.customerEmail || record.customer?.email || record.raw?.email || record.raw?.customer?.email).toLowerCase();
  const visitor = cleanText(record.visitorId);
  return phone ? `phone:${phone}` : email ? `email:${email}` : visitor ? `visitor:${visitor}` : `lead:${record.id || crypto.randomUUID()}`;
}
function upsertCrm(record = {}, source = 'lead') {
  const key = crmKey(record);
  const all = readJson(crmPath, []);
  const idx = all.findIndex(x => x.crmKey === key);
  const phone = cleanPhone(record.phone || record.customerPhone || record.mobile || record.customer?.phone || record.raw?.phone || record.raw?.customer?.phone);
  const name = cleanText(record.name || record.customerName || record.raw?.customer?.first_name || record.raw?.customer?.last_name || record.customer?.name);
  const email = cleanText(record.email || record.customerEmail || record.customer?.email || record.raw?.email || record.raw?.customer?.email);
  const productTitle = cleanText(record.productTitle || record.product || record.product?.title || record.raw?.line_items?.[0]?.title);
  const pageUrl = cleanText(record.pageUrl || record.productUrl || record.product?.url);
  const eventType = cleanText(record.type || record.eventType || source);
  const now = nowIso();
  const base = idx >= 0 ? all[idx] : { id: crypto.randomUUID(), crmKey: key, createdAt: now, status: 'New', notes: '', tags: [] };
  const next = {
    ...base,
    updatedAt: now,
    lastSource: source,
    lastEventType: eventType || base.lastEventType || '',
    name: name || base.name || '',
    phone: phone || base.phone || '',
    email: email || base.email || '',
    productTitle: productTitle || base.productTitle || '',
    pageUrl: pageUrl || base.pageUrl || '',
    productImage: cleanText(record.productImage || record.image || record.product?.image) || base.productImage || '',
    productPrice: cleanText(record.productPrice || record.price || record.product?.price) || base.productPrice || '',
    discountText: cleanText(record.discountText || record.product?.discountText) || base.discountText || '',
    orderName: cleanText(record.orderName || record.orderId || record.raw?.name) || base.orderName || '',
    total: cleanText(record.total || record.raw?.total_price) || base.total || '',
    lastMessage: cleanText(record.message || record.note || record.caption) || base.lastMessage || '',
    leadCount: (base.leadCount || 0) + (source === 'lead' ? 1 : 0),
    activityCount: (base.activityCount || 0) + (source === 'activity' ? 1 : 0),
    messageCount: (base.messageCount || 0) + (source === 'message' ? 1 : 0)
  };
  if (idx >= 0) all[idx] = next; else all.unshift(next);
  writeJson(crmPath, all.slice(0, 5000));
  return next;
}
function googleSheetsEnabled() {
  return String(process.env.GOOGLE_SHEETS_ENABLED || '').toLowerCase() === 'true' && String(process.env.GOOGLE_SHEETS_WEBHOOK_URL || '').trim();
}
async function sendToGoogleSheets(type, record) {
  const url = String(process.env.GOOGLE_SHEETS_WEBHOOK_URL || '').trim();
  if (!googleSheetsEnabled()) return { ok: false, skipped: true, reason: 'Google Sheets auto-save disabled or webhook URL missing.' };
  const payload = { type, secret: process.env.GOOGLE_SHEETS_SECRET || '', createdAt: nowIso(), record, flat: flattenForSheet(record) };
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const text = await response.text().catch(() => '');
  return { ok: response.ok, status: response.status, text: text.slice(0, 500) };
}
function afterDataAppend(filePath, item) {
  if (filePath === leadsPath) {
    const crm = upsertCrm(item, 'lead');
    sendToGoogleSheets('Lead', { ...item, crmId: crm.id }).catch(err => console.error('Google Sheets lead error:', err.message));
    return;
  }
  if (filePath === eventsPath) {
    upsertCrm(item, 'activity');
    sendToGoogleSheets('Visitor Activity', item).catch(err => console.error('Google Sheets activity error:', err.message));
    return;
  }
  if (filePath === leadMessagesPath) {
    upsertCrm(item, 'message');
    sendToGoogleSheets('Buy Message', item).catch(err => console.error('Google Sheets message error:', err.message));
    return;
  }
  if (filePath === mediaImagesPath) {
    sendToGoogleSheets('Media Image', item).catch(err => console.error('Google Sheets media error:', err.message));
  }
}

function findFaqAnswer(message) {
  const text = String(message || '').toLowerCase();
  const faqs = readJson(faqPath, []);
  let best = null, bestScore = 0;
  for (const faq of faqs) {
    const score = (faq.keywords || []).reduce((total, keyword) => total + (text.includes(String(keyword).toLowerCase()) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = faq; }
  }
  return best ? best.answer : null;
}
function extractPhone(text) { const m = String(text || '').match(/(?:\+?91[-\s]?)?[6-9]\d{9}/); return m ? cleanPhone(m[0]) : ''; }
function extractOrderId(text) {
  const m = String(text || '').match(/(?:order\s*#?|order\s*id|id)[:\s-]*([A-Za-z0-9-]{4,})/i) || String(text || '').match(/\b(?:TSG|TS)?[0-9]{4,}\b/i);
  return m ? String(m[1] || m[0]).replace('#','').trim() : '';
}
function productSummary(p = {}) {
  return [p.title || p.productTitle || 'Product', p.price ? `Price: ${p.price}` : '', p.discountText ? `Discount: ${p.discountText}` : '', p.url || p.pageUrl || ''].filter(Boolean).join('\n');
}
function buildLeadMessage({ type, product = {}, cart = {}, customer = {}, pageUrl = '' }) {
  const settings = readJson(settingsPath, {});
  const title = product.title || product.productTitle || (cart.items && cart.items[0]?.title) || 'this product';
  const link = product.url || product.pageUrl || pageUrl || process.env.WEBSITE_URL || 'https://tinyshinygifts.com';
  const image = product.image || product.imageUrl || (cart.items && cart.items[0]?.image) || '';
  const discount = product.discountText || cart.discountText || 'Any active discount shown on the website will apply at checkout.';
  const intro = type === 'cart' ? (settings.cartOfferMessage || '') : (settings.leadOfferMessage || '');
  return `${intro}\n\nProduct: ${title}\n${product.price ? `Price: ${product.price}\n` : ''}Discount: ${discount}\nBuy here: ${link}${image ? `\nImage: ${image}` : ''}`;
}


const defaultWhatsAppTemplates = [
  { id:'order_confirmation', name:'order_confirmation', category:'Utility', language:'en', useCase:'Shopify order create par customer ko order confirmation bhejna', enabled:true, headerType:'None', body:'Hi {{1}}, thank you for your order with Tiny Shiny Gifts.\n\nYour order {{2}} has been received successfully.\n\nOrder Total: ₹{{3}}\n\nWe will notify you once your order is shipped.\n\nTeam Tiny Shiny Gifts', variables:['Customer Name','Order Number','Order Amount'], buttons:[{type:'URL', text:'Visit Website', url:'https://www.tinyshinygifts.com'}] },
  { id:'product_followup', name:'product_followup', category:'Marketing', language:'en', useCase:'Product/cart interest ke baad customer follow-up', enabled:true, headerType:'None', body:'Hi {{1}}, you recently showed interest in {{2}} on Tiny Shiny Gifts.\n\nComplete your purchase today and explore our beautiful gifts, home decor and festive collections.\n\nProduct link: {{3}}\n\nTeam Tiny Shiny Gifts', variables:['Customer Name','Product Name','Product Link'], buttons:[{type:'Quick Reply', text:'Interested'}, {type:'Quick Reply', text:'Need Help'}, {type:'Quick Reply', text:'Not Now'}] },
  { id:'abandoned_cart_reminder', name:'abandoned_cart_reminder', category:'Marketing', language:'en', useCase:'Cart abandon reminder', enabled:true, headerType:'None', body:'Hi {{1}}, you left some beautiful items in your cart at Tiny Shiny Gifts.\n\nYour cart is waiting for you. Complete your order before the items go out of stock.\n\nCart link: {{2}}\n\nTeam Tiny Shiny Gifts', variables:['Customer Name','Cart Link'], buttons:[{type:'URL', text:'Complete Order', url:'{{2}}'}] },
  { id:'order_shipped', name:'order_shipped', category:'Utility', language:'en', useCase:'Order shipped/tracking update', enabled:true, headerType:'None', body:'Hi {{1}}, your Tiny Shiny Gifts order {{2}} has been shipped.\n\nCourier Partner: {{3}}\nTracking ID: {{4}}\n\nTrack your order here: {{5}}\n\nThank you for shopping with us.', variables:['Customer Name','Order Number','Courier Name','AWB / Tracking ID','Tracking Link'], buttons:[{type:'URL', text:'Track Order', url:'{{5}}'}] },
  { id:'order_delivered', name:'order_delivered', category:'Utility', language:'en', useCase:'Delivery ke baad feedback/shop again', enabled:true, headerType:'None', body:'Hi {{1}}, your Tiny Shiny Gifts order {{2}} has been delivered.\n\nWe hope you loved your product.\n\nPlease share your feedback with us and visit again for more gifts and home decor collections.\n\nTeam Tiny Shiny Gifts', variables:['Customer Name','Order Number'], buttons:[{type:'Quick Reply', text:'Loved It'}, {type:'Quick Reply', text:'Need Support'}, {type:'Quick Reply', text:'Shop Again'}] },
  { id:'cod_order_confirmation', name:'cod_order_confirmation', category:'Utility', language:'en', useCase:'COD order confirmation', enabled:true, headerType:'None', body:'Hi {{1}}, your COD order {{2}} of ₹{{3}} has been placed successfully with Tiny Shiny Gifts.\n\nPlease keep the cash amount ready at the time of delivery.\n\nThank you for choosing Tiny Shiny Gifts.', variables:['Customer Name','Order Number','COD Amount'], buttons:[{type:'Quick Reply', text:'Confirm Order'}, {type:'Quick Reply', text:'Cancel Order'}, {type:'Quick Reply', text:'Need Help'}] },
  { id:'payment_pending', name:'payment_pending', category:'Utility', language:'en', useCase:'Payment pending reminder', enabled:true, headerType:'None', body:'Hi {{1}}, your order {{2}} at Tiny Shiny Gifts is pending because payment is not completed.\n\nPlease complete your payment to confirm the order.\n\nPayment link: {{3}}', variables:['Customer Name','Order Number','Payment Link'], buttons:[{type:'URL', text:'Complete Payment', url:'{{3}}'}] },
  { id:'customer_support_reply', name:'customer_support_reply', category:'Utility', language:'en', useCase:'Support query acknowledgement', enabled:true, headerType:'None', body:'Hi {{1}}, thank you for contacting Tiny Shiny Gifts.\n\nOur support team has received your query regarding {{2}}.\n\nWe will get back to you shortly.\n\nTeam Tiny Shiny Gifts', variables:['Customer Name','Query / Order Number'], buttons:[] },
  { id:'new_product_broadcast', name:'new_product_broadcast', category:'Marketing', language:'en', useCase:'New product broadcast', enabled:true, headerType:'None', body:'Hi {{1}}, new arrivals are now live at Tiny Shiny Gifts.\n\nExplore beautiful gifts, home decor, pooja items and festive collections for your loved ones.\n\nShop now: {{2}}', variables:['Customer Name','Collection / Product Link'], buttons:[{type:'URL', text:'Shop Now', url:'{{2}}'}] },
  { id:'festival_offer', name:'festival_offer', category:'Marketing', language:'en', useCase:'Festival/offer promotion', enabled:true, headerType:'None', body:'Hi {{1}}, festival gifting is now more special with Tiny Shiny Gifts.\n\nGet beautiful home decor, candles, idols and gift collections for your loved ones.\n\nOffer: {{2}}\n\nShop here: {{3}}', variables:['Customer Name','Offer Text','Website / Collection Link'], buttons:[{type:'URL', text:'Shop Offer', url:'{{3}}'}] },
  { id:'thank_you_image', name:'thank_you_image', category:'Utility', language:'en', useCase:'Image header thank you template', enabled:true, headerType:'Image', body:'Hi {{1}}, thank you for connecting with Tiny Shiny Gifts.\n\nWe are happy to help you with gifting, home decor, pooja items and festive products.\n\nVisit us: {{2}}', variables:['Customer Name','Website Link'], buttons:[] },
  { id:'admin_new_order_alert', name:'admin_new_order_alert', category:'Utility', language:'en', useCase:'Admin/team ko new order alert', enabled:true, headerType:'None', body:'New order received on Tiny Shiny Gifts.\n\nOrder: {{1}}\nCustomer: {{2}}\nPhone: {{3}}\nAmount: ₹{{4}}\nPayment: {{5}}\n\nPlease process the order.', variables:['Order Number','Customer Name','Customer Phone','Order Amount','Payment Method'], buttons:[] }
];
function normalizeTemplate(t = {}) {
  const name = String(t.name || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return {
    id: String(t.id || name || crypto.randomUUID()),
    name,
    category: String(t.category || 'Utility').trim(),
    language: String(t.language || 'en').trim(),
    useCase: String(t.useCase || '').trim(),
    enabled: t.enabled !== false,
    headerType: String(t.headerType || 'None').trim(),
    body: String(t.body || '').trim(),
    variables: Array.isArray(t.variables) ? t.variables.map(x => String(x).trim()).filter(Boolean) : String(t.variables || '').split(/\r?\n|,/).map(x => x.trim()).filter(Boolean),
    buttons: Array.isArray(t.buttons) ? t.buttons.map(b => ({ type: String(b.type || 'Quick Reply').trim(), text: String(b.text || '').trim(), url: String(b.url || '').trim() })).filter(b => b.text) : [],
    updatedAt: t.updatedAt || nowIso()
  };
}
function readWhatsAppTemplates() {
  const saved = readJson(whatsappTemplatesPath, null);
  if (!Array.isArray(saved) || !saved.length) {
    const defaults = defaultWhatsAppTemplates.map(normalizeTemplate);
    writeJson(whatsappTemplatesPath, defaults);
    return defaults;
  }
  return saved.map(normalizeTemplate);
}
function writeWhatsAppTemplates(list) { writeJson(whatsappTemplatesPath, list.map(normalizeTemplate)); return readWhatsAppTemplates(); }
function getWhatsAppTemplateMappings(env = readEnvFile()) {
  return {
    customer_followup: {
      key: 'CUSTOMER_WHATSAPP_TEMPLATE_NAME',
      langKey: 'CUSTOMER_WHATSAPP_TEMPLATE_LANG',
      name: env.CUSTOMER_WHATSAPP_TEMPLATE_NAME || '',
      language: env.CUSTOMER_WHATSAPP_TEMPLATE_LANG || 'en',
      enabled: String(env.CUSTOMER_WHATSAPP_MESSAGES_ENABLED || 'false').toLowerCase() === 'true'
    },
    order_confirmation: {
      key: 'ORDER_CONFIRMATION_TEMPLATE_NAME',
      langKey: 'ORDER_CONFIRMATION_TEMPLATE_LANG',
      name: env.ORDER_CONFIRMATION_TEMPLATE_NAME || '',
      language: env.ORDER_CONFIRMATION_TEMPLATE_LANG || 'en',
      enabled: String(env.ORDER_CONFIRMATION_WHATSAPP_ENABLED || 'false').toLowerCase() === 'true'
    },
    test_whatsapp: {
      key: 'WHATSAPP_TEST_TEMPLATE_NAME',
      langKey: 'WHATSAPP_TEST_TEMPLATE_LANG',
      name: env.WHATSAPP_TEST_TEMPLATE_NAME || '',
      language: env.WHATSAPP_TEST_TEMPLATE_LANG || 'en_US',
      enabled: true
    }
  };
}
function mappedTargetsForTemplate(tpl, env = readEnvFile()) {
  const maps = getWhatsAppTemplateMappings(env);
  return Object.entries(maps)
    .filter(([,m]) => m.name && tpl && tpl.name === m.name)
    .map(([key]) => key);
}

function whatsappEndpoint() {
  const phoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').replace(/\D/g, '');
  return { phoneNumberId, url: `https://graph.facebook.com/v20.0/${phoneNumberId}/messages` };
}
function whatsappTemplateBody(to, templateName, lang) {
  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: cleanPhone(to),
    type: 'template',
    template: { name: templateName, language: { code: lang || 'en_US' } }
  };
}
async function postWhatsApp(body) {
  const env = readEnvFile();
  const token = String(process.env.WHATSAPP_CLOUD_TOKEN || env.WHATSAPP_CLOUD_TOKEN || '').trim();
  const savedPhoneNumberId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || env.WHATSAPP_PHONE_NUMBER_ID || '').replace(/\D/g, '');
  const url = `https://graph.facebook.com/v20.0/${savedPhoneNumberId}/messages`;
  if (!token || token.includes('...') || token.includes('*') || !savedPhoneNumberId) {
    return { ok: false, skipped: true, reason: 'WhatsApp Cloud token or Phone Number ID missing. Paste full token once, click Save Settings, then test again.' };
  }
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json, request: { to: body.to, type: body.type, template: body.template?.name || '' } };
}
async function sendOwnerWhatsApp(message, options = {}) {
  const env = readEnvFile();
  const owner = cleanPhone(process.env.OWNER_WHATSAPP_NUMBER || env.OWNER_WHATSAPP_NUMBER || process.env.WHATSAPP_NUMBER || env.WHATSAPP_NUMBER);
  if (!owner) return { ok: false, skipped: true, reason: 'Owner WhatsApp number missing.' };
  const template = options.template || process.env.WHATSAPP_TEST_TEMPLATE_NAME || env.WHATSAPP_TEST_TEMPLATE_NAME || '';
  if (options.forceTemplate || template) {
    if (!template) return { ok:false, skipped:true, reason:'Approved WhatsApp template name missing. Add WHATSAPP_TEST_TEMPLATE_NAME in API Settings.' };
    return postWhatsApp(whatsappTemplateBody(owner, template, process.env.WHATSAPP_TEST_TEMPLATE_LANG || env.WHATSAPP_TEST_TEMPLATE_LANG || 'en_US'));
  }
  return postWhatsApp({ messaging_product: 'whatsapp', recipient_type: 'individual', to: owner, type: 'text', text: { preview_url: true, body: message } });
}

async function sendCustomerWhatsApp(phone, message) {
  const enabled = String(process.env.CUSTOMER_WHATSAPP_MESSAGES_ENABLED || 'false').toLowerCase() === 'true';
  if (!enabled) return { ok: false, skipped: true, reason: 'Customer WhatsApp follow-up is disabled in API Settings.' };
  const to = cleanPhone(phone);
  if (!to) return { ok: false, skipped: true, reason: 'Customer phone missing.' };
  const template = process.env.CUSTOMER_WHATSAPP_TEMPLATE_NAME || '';
  if (template) return postWhatsApp(whatsappTemplateBody(to, template, process.env.CUSTOMER_WHATSAPP_TEMPLATE_LANG || 'en'));
  return postWhatsApp({ messaging_product: 'whatsapp', recipient_type: 'individual', to, type: 'text', text: { preview_url: true, body: message } });
}

async function sendWhatsAppImage({ to, imageUrl, caption = '' }) {
  const receiver = cleanPhone(to);
  if (!receiver || !imageUrl) return { ok: false, skipped: true, reason: 'Receiver phone or image URL missing.' };
  return postWhatsApp({ messaging_product: 'whatsapp', recipient_type: 'individual', to: receiver, type: 'image', image: { link: imageUrl, caption: caption || '' } });
}

async function sendWhatsAppTextManual({ to, message = '' }) {
  const receiver = cleanPhone(to);
  const body = String(message || '').trim();
  if (!receiver || !body) return { ok: false, skipped: true, reason: 'Receiver phone or message missing.' };
  return postWhatsApp({ messaging_product: 'whatsapp', recipient_type: 'individual', to: receiver, type: 'text', text: { preview_url: true, body } });
}
function absoluteUrl(req, urlPath) {
  if (/^https?:\/\//i.test(String(urlPath || ''))) return urlPath;
  const site = String(process.env.WEBSITE_URL || '').replace(/\/$/, '');
  if (site && !site.includes('localhost')) return site + urlPath;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${proto}://${req.get('host')}${urlPath}`;
}
function saveImageFromDataUrl({ dataUrl, filename }) {
  const match = String(dataUrl || '').match(/^data:(image\/(png|jpe?g|webp|gif));base64,(.+)$/i);
  if (!match) throw new Error('Only PNG, JPG, WEBP or GIF image data is supported.');
  const ext = match[2].toLowerCase().replace('jpeg','jpg');
  const safeName = String(filename || 'image').replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-').slice(0, 60);
  const id = crypto.randomUUID();
  const outDir = path.join(__dirname, 'public', 'uploads');
  fs.mkdirSync(outDir, { recursive: true });
  const outName = `${Date.now()}-${id}-${safeName.replace(/\.(png|jpg|jpeg|webp|gif)$/i,'')}.${ext}`;
  const outPath = path.join(outDir, outName);
  fs.writeFileSync(outPath, Buffer.from(match[3], 'base64'));
  return { id, url: `/uploads/${outName}`, mime: match[1], filename: outName };
}

function normalizeShopDomain(shop) {
  let value = String(shop || '').trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!value) return '';
  if (!value.endsWith('.myshopify.com')) value = value.replace(/\.myshopify\.com$/, '') + '.myshopify.com';
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value) ? value : '';
}
function getAppBaseUrl(req) {
  const env = readEnvFile();
  const url = String(process.env.SHOPIFY_APP_URL || env.SHOPIFY_APP_URL || process.env.WEBSITE_URL || env.WEBSITE_URL || '').replace(/\/$/, '');
  if (url && /^https:\/\//i.test(url)) return url;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  return `${proto}://${req.get('host')}`;
}
function getShopifyRedirectUri(req) {
  const env = readEnvFile();
  const custom = String(process.env.SHOPIFY_OAUTH_REDIRECT_URI || env.SHOPIFY_OAUTH_REDIRECT_URI || '').trim();
  return custom || `${getAppBaseUrl(req)}/shopify/callback`;
}
function verifyShopifyHmac(query, secret) {
  const hmac = String(query.hmac || '');
  if (!hmac || !secret) return false;
  const pairs = Object.keys(query)
    .filter(k => k !== 'hmac' && k !== 'signature')
    .sort()
    .map(k => `${k}=${Array.isArray(query[k]) ? query[k].join(',') : query[k]}`)
    .join('&');
  const digest = crypto.createHmac('sha256', secret).update(pairs).digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(hmac, 'hex')); } catch { return false; }
}
function saveOAuthState(state, shop) {
  const states = readJson(shopifyOAuthStatePath, {});
  states[state] = { shop, exp: Date.now() + 10 * 60 * 1000 };
  for (const [k, v] of Object.entries(states)) if (!v || Number(v.exp) < Date.now()) delete states[k];
  writeJson(shopifyOAuthStatePath, states);
}
function consumeOAuthState(state, shop) {
  const states = readJson(shopifyOAuthStatePath, {});
  const item = states[state];
  delete states[state];
  writeJson(shopifyOAuthStatePath, states);
  return !!item && item.shop === shop && Number(item.exp) > Date.now();
}

function phoneVariants(phone) {
  const digits = cleanPhone(phone);
  if (!digits) return [];
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return Array.from(new Set([digits, last10, '91' + last10, '+91' + last10])).filter(Boolean);
}
function orderPhoneValues(order = {}) {
  const vals = [
    order.phone, order.contact_email, order.email,
    order.customer?.phone, order.customer?.default_address?.phone,
    order.billing_address?.phone, order.shipping_address?.phone,
    order.customer?.email
  ].filter(Boolean).map(String);
  return vals;
}
function orderMatchesInput(order, { orderId, phone }) {
  const oid = String(orderId || '').replace(/^#/, '').trim().toLowerCase();
  if (oid) {
    const names = [order.name, order.order_number, order.id].map(v => String(v || '').replace(/^#/, '').toLowerCase());
    if (names.some(v => v === oid || v.includes(oid))) return true;
  }
  const variants = phoneVariants(phone).map(cleanPhone);
  if (variants.length) {
    const values = orderPhoneValues(order).map(cleanPhone);
    if (values.some(v => variants.some(p => v.endsWith(p) || p.endsWith(v)))) return true;
  }
  return false;
}
async function shopifyFetch(pathAndQuery, options = {}) {
  const envNow = readEnvFile();
  const store = normalizeShopDomain(envNow.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN);
  const token = String(envNow.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '').trim();
  const version = envNow.SHOPIFY_API_VERSION || process.env.SHOPIFY_API_VERSION || '2025-10';
  if (!store || !token || token === '********') return { ok: false, skipped: true, message: 'Shopify API is not connected yet. Add Shopify Store Domain and Admin Access Token in API Settings.' };
  const response = await fetch(`https://${store}/admin/api/${version}/${pathAndQuery}`, {
    method: options.method || 'GET',
    headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}
function simplifyOrder(order = {}) {
  const fulfillments = order.fulfillments || [];
  const tracking = fulfillments.flatMap(f => (f.tracking_numbers || []).map((n, i) => ({
    number: n,
    url: (f.tracking_urls || [])[i] || '',
    company: f.tracking_company || '',
    status: f.shipment_status || f.status || ''
  })));
  return {
    id: order.id,
    name: order.name,
    order_number: order.order_number,
    created_at: order.created_at,
    customer_name: [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ') || order.billing_address?.name || order.shipping_address?.name || '',
    phone: cleanPhone(order.phone || order.customer?.phone || order.billing_address?.phone || order.shipping_address?.phone || order.customer?.default_address?.phone),
    email: order.email || order.customer?.email || '',
    financial_status: order.financial_status || '',
    fulfillment_status: order.fulfillment_status || 'not fulfilled yet',
    cancelled_at: order.cancelled_at || '',
    cancel_reason: order.cancel_reason || '',
    total_price: order.total_price,
    currency: order.currency || 'INR',
    tracking,
    line_items: (order.line_items || []).map(i => ({ title: i.title, quantity: i.quantity, sku: i.sku }))
  };
}
async function getShiprocketTracking(order) {
  const token = process.env.SHIPROCKET_TOKEN;
  if (!token || !order) return { ok: false, skipped: true, reason: 'Shiprocket token not configured.' };
  const orderId = String(order.name || order.order_number || order.id || '').replace('#','');
  try {
    const urls = [
      `https://apiv2.shiprocket.in/v1/external/orders/show/${encodeURIComponent(orderId)}`,
      `https://apiv2.shiprocket.in/v1/external/courier/track?order_id=${encodeURIComponent(orderId)}`
    ];
    for (const u of urls) {
      const r = await fetch(u, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
      const j = await r.json().catch(() => ({}));
      if (r.ok) return { ok: true, status: r.status, data: j };
    }
  } catch (e) { return { ok: false, error: e.message }; }
  return { ok: false, reason: 'No Shiprocket tracking data found.' };
}

async function getICarryTracking(order) {
  const enabled = String(process.env.ICARRY_ENABLED || 'false').toLowerCase() === 'true';
  const trackingUrl = String(process.env.ICARRY_TRACKING_URL || '').trim();
  if (!enabled || !trackingUrl || !order) return { ok: false, skipped: true, reason: 'iCarry tracking is disabled or URL missing.' };
  const ids = [];
  (order.tracking || []).forEach(t => { if (t.number) ids.push(t.number); });
  ids.push(String(order.name || order.order_number || order.id || '').replace('#',''));
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.ICARRY_API_TOKEN) headers.Authorization = `Bearer ${process.env.ICARRY_API_TOKEN}`;
  if (process.env.ICARRY_API_KEY) headers['X-API-Key'] = process.env.ICARRY_API_KEY;
  if (process.env.ICARRY_CLIENT_ID) headers['X-Client-ID'] = process.env.ICARRY_CLIENT_ID;
  if (process.env.ICARRY_CLIENT_SECRET) headers['X-Client-Secret'] = process.env.ICARRY_CLIENT_SECRET;
  for (const id of ids.filter(Boolean)) {
    const sep = trackingUrl.includes('?') ? '&' : '?';
    const url = `${trackingUrl}${sep}awb=${encodeURIComponent(id)}&order_id=${encodeURIComponent(id)}`;
    try {
      const r = await fetch(url, { headers });
      const text = await r.text().catch(() => '');
      let data; try { data = JSON.parse(text); } catch { data = text.slice(0, 1000); }
      if (r.ok) return { ok: true, status: r.status, data, query: id };
    } catch (e) { /* try next id */ }
  }
  return { ok: false, reason: 'No iCarry tracking data found.' };
}

function buildOrderReply(simple, shiprocket, icarry) {
  const items = (simple.line_items || []).map(i => `${i.title} x ${i.quantity}`).join(', ');
  const tracking = (simple.tracking || []).length
    ? simple.tracking.map(t => `${t.company ? t.company + ' ' : ''}${t.number || ''}${t.status ? ' ('+t.status+')' : ''}${t.url ? ' - ' + t.url : ''}`).join('\n')
    : 'Tracking details are not added in Shopify yet.';
  let shipLine = '';
  if (shiprocket?.ok) shipLine = `\nShiprocket: ${JSON.stringify(shiprocket.data).slice(0, 700)}`;
  if (icarry?.ok) shipLine += `\niCarry: ${JSON.stringify(icarry.data).slice(0, 700)}`;
  return `Order ${simple.name || simple.order_number}\nCustomer: ${simple.customer_name || '-'}\nPayment status: ${simple.financial_status || '-'}\nOrder/Fulfillment status: ${simple.cancelled_at ? 'cancelled' : simple.fulfillment_status}\nTotal: ${simple.currency} ${simple.total_price || '-'}\nItems: ${items || '-'}\nTracking: ${tracking}${shipLine}`;
}
async function getShopifyOrderStatus({ orderId, phone }) {
  if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) return { ok: false, skipped: true, message: 'Shopify API is not connected yet.' };
  const queries = [];
  if (orderId) {
    const clean = String(orderId).replace(/^#/, '').trim();
    queries.push(`name:#${clean}`);
    queries.push(`#${clean}`);
  }
  if (phone) {
    for (const p of phoneVariants(phone)) queries.push(`phone:${p}`);
  }
  queries.push('');
  let orders = [];
  for (const q of queries) {
    const query = q ? `&query=${encodeURIComponent(q)}` : '';
    const r = await shopifyFetch(`orders.json?status=any&limit=50&fields=id,name,order_number,created_at,email,phone,customer,billing_address,shipping_address,financial_status,fulfillment_status,total_price,currency,fulfillments,line_items,cancelled_at,cancel_reason${query}`);
    if (!r.ok) return { ok: false, message: 'Shopify order lookup failed.', detail: r.json || r };
    orders = (r.json.orders || []);
    const matched = orders.find(o => orderMatchesInput(o, { orderId, phone })) || orders[0];
    if (matched) {
      const simple = simplifyOrder(matched);
      const shiprocket = await getShiprocketTracking(simple).catch(e => ({ ok: false, error: e.message }));
      const icarry = await getICarryTracking(simple).catch(e => ({ ok: false, error: e.message }));
      const trackingLinks = (simple.tracking || []).filter(t => t.url).map(t => ({ label: t.number ? `Track ${t.number}` : 'Track Shipment', url: t.url }));
      return { ok: true, order: simple, shiprocket, icarry, trackingLinks, reply: buildOrderReply(simple, shiprocket, icarry) };
    }
  }
  return { ok: false, message: 'No matching order found for this mobile/order number.' };
}

async function createShopifyDraftOrder(lead) {
  const store = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || '2025-10';
  if (!store || !token || process.env.CREATE_SHOPIFY_DRAFT_ORDER !== 'true') return { ok: false, skipped: true };
  const url = `https://${store}/admin/api/${version}/draft_orders.json`;
  const title = lead.productTitle || lead.product || 'Chatbot product request';
  const body = { draft_order: { note: `Chatbot order confirmation request\nProduct/link: ${lead.pageUrl || lead.productUrl || ''}\nMessage: ${lead.message || lead.note || ''}`, customer: lead.phone ? { phone: '+' + cleanPhone(lead.phone), first_name: lead.name || 'Chatbot Customer' } : undefined, line_items: [{ title, price: money(lead.price) || '0.00', quantity: Number(lead.quantity || 1) }], tags: 'chatbot,order-confirmation-request' } };
  const response = await fetch(url, { method: 'POST', headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}


function normalizeDob(value) { return String(value || '').replace(/[^0-9]/g, ''); }
function getAdminCreds() {
  const env = readEnvFile();
  return {
    username: String(process.env.ADMIN_USERNAME || env.ADMIN_USERNAME || 'admin').trim(),
    password: String(process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD || 'admin'),
    dob: String(process.env.ADMIN_DOB || env.ADMIN_DOB || '26/04/1986').trim()
  };
}
app.post('/api/admin/login', (req, res) => {
  const username = String((req.body || {}).username || '').trim();
  const password = String((req.body || {}).password || '');
  const expected = getAdminCreds();
  if (!username || username !== expected.username) return res.status(401).json({ ok: false, error: 'Wrong user ID' });
  if (!password || password !== expected.password) return res.status(401).json({ ok: false, error: 'Wrong password' });
  setAdminCookie(req, res);
  res.json({ ok: true, message: 'Login successful' });
});
app.post('/api/admin/forgot-login', (req, res) => {
  const username = String((req.body || {}).username || '').trim();
  const dob = String((req.body || {}).dob || '').trim();
  const expected = getAdminCreds();
  if (username && username !== expected.username) return res.status(401).json({ ok: false, error: 'Wrong user ID' });
  if (!dob || normalizeDob(dob) !== normalizeDob(expected.dob)) return res.status(401).json({ ok: false, error: 'Date of birth does not match' });
  setAdminCookie(req, res);
  res.json({ ok: true, message: 'DOB verified. Login successful.' });
});
app.post('/api/admin/logout', (req, res) => { clearAdminCookie(req, res); res.json({ ok: true, message: 'Logged out' }); });
app.get('/api/admin/logout', (req, res) => { clearAdminCookie(req, res); res.redirect('/login.html'); });
app.get('/api/admin/me', (req, res) => res.json({ ok: true, loggedIn: isAuthed(req), sessionHours: SESSION_HOURS, username: getAdminCreds().username }));


// Always serve latest widget so ON/OFF status is respected on Shopify storefront.
app.get('/widget.js', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(path.join(__dirname, 'public', 'widget.js'));
});


function normalizeWhatsAppWebhookMessage(change = {}, value = {}, message = {}) {
  const contacts = Array.isArray(value.contacts) ? value.contacts : [];
  const contact = contacts.find(c => c.wa_id === message.from) || contacts[0] || {};
  const profileName = contact.profile?.name || '';
  let text = '';
  let media = null;
  const type = message.type || '';
  if (type === 'text') text = message.text?.body || '';
  else if (type === 'button') text = message.button?.text || message.button?.payload || '';
  else if (type === 'interactive') text = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || JSON.stringify(message.interactive || {});
  else if (type === 'image') { text = message.image?.caption || '[Image received]'; media = { type:'image', id:message.image?.id || '', mimeType:message.image?.mime_type || '', sha256:message.image?.sha256 || '' }; }
  else if (type === 'document') { text = message.document?.caption || message.document?.filename || '[Document received]'; media = { type:'document', id:message.document?.id || '', filename:message.document?.filename || '', mimeType:message.document?.mime_type || '' }; }
  else if (type === 'audio') { text = '[Audio received]'; media = { type:'audio', id:message.audio?.id || '', mimeType:message.audio?.mime_type || '' }; }
  else if (type === 'video') { text = message.video?.caption || '[Video received]'; media = { type:'video', id:message.video?.id || '', mimeType:message.video?.mime_type || '' }; }
  else text = type ? '[' + type + ' received]' : '[Message received]';
  return {
    id: message.id || crypto.randomUUID(),
    direction: 'inbound',
    from: cleanPhone(message.from || ''),
    customerName: profileName,
    phoneNumberId: value.metadata?.phone_number_id || '',
    displayPhoneNumber: value.metadata?.display_phone_number || '',
    type,
    text,
    media,
    status: 'unread',
    createdAt: message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : nowIso(),
    raw: { changeField: change.field, message }
  };
}

app.get('/webhooks/whatsapp', (req, res) => {
  const env = readEnvFile();
  const verifyToken = String(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'tinyshiny_verify_token').trim();
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === verifyToken) return res.status(200).send(challenge || '');
  return res.status(403).send('Verification failed');
});

app.post('/webhooks/whatsapp', (req, res) => {
  try {
    const body = req.body || {};
    const saved = [];
    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        const value = change.value || {};
        for (const msg of (value.messages || [])) {
          const item = normalizeWhatsAppWebhookMessage(change, value, msg);
          appendJson(whatsappInboxPath, item);
          upsertCrm({ name: item.customerName, phone: item.from, message: item.text, note: 'WhatsApp reply: ' + item.text }, 'whatsapp_reply');
          sendToGoogleSheets('WhatsApp Reply', item).catch(()=>{});
          saved.push(item);
        }
        for (const st of (value.statuses || [])) {
          appendJson(whatsappInboxPath, { id: st.id || crypto.randomUUID(), direction: 'status', statusType: st.status || '', to: cleanPhone(st.recipient_id || ''), createdAt: st.timestamp ? new Date(Number(st.timestamp)*1000).toISOString() : nowIso(), raw: st });
        }
      }
    }
    res.json({ ok: true, saved: saved.length });
  } catch (e) {
    console.error('WhatsApp webhook error:', e);
    res.status(200).json({ ok: false, error: e.message });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ ok: true, service: 'Tiny Shiny Chatbot', time: nowIso() }));
app.get('/api/settings', (req, res) => { res.set('Cache-Control','no-store'); res.json({ ok: true, settings: readJson(settingsPath, {}), business: { name: process.env.BUSINESS_NAME || 'Tiny Shiny Gifts', website: process.env.WEBSITE_URL || 'https://tinyshinygifts.com', whatsapp: process.env.WHATSAPP_NUMBER || '' } }); });


// From here, admin/API settings routes are protected by login.
app.use(['/api/config','/api/test-whatsapp','/api/test-shopify','/api/leads','/api/visitor-events','/api/lead-messages','/api/media-images','/api/send-image-message','/api/faqs','/api/crm','/api/test-google-sheets','/api/sync-google-sheets','/api/shopify/customers','/api/shopify/products'], requireAdmin);
app.use('/api/whatsapp-templates', requireAdmin);
app.use('/api/whatsapp-inbox', requireAdmin);
app.post('/api/settings', requireAdmin);

app.get('/api/config', (req, res) => {
  res.json({ ok: true, config: publicConfig(readEnvFile()) });
});
app.post('/api/config', (req, res) => {
  const body = req.body || {};
  const current = readEnvFile();
  const next = {};
  for (const key of apiKeys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      const val = String(body[key] ?? '').trim();
      // Secret fields: blank, ********, or masked preview like EAAG... means keep old value.
      const looksMasked = val === '' || val === '********' || /\*{2,}/.test(val) || /\.\.\.$/.test(val);
      if (secretKeys.has(key) && looksMasked && current[key]) {
        next[key] = current[key];
      } else {
        next[key] = val;
      }
    }
  }
  const saved = writeEnvFile(next);
  res.json({ ok: true, config: publicConfig(saved), message: 'API settings saved. Blank secret fields kept old values.' });
});

app.get('/api/config/download', (req, res) => {
  const env = readEnvFile();
  const text = configBackupText(env);
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="tiny-shiny-api-settings-${stamp}.txt"`);
  res.send(text);
});

app.post('/api/config/upload', (req, res) => {
  try {
    const parsed = parseBackupText((req.body || {}).text || '');
    const current = readEnvFile();
    const envUpdate = safeMergeConfigUpload(current, parsed.env || {});
    const savedEnv = writeEnvFile(envUpdate);
    let templatesUpdated = false;
    let settingsUpdated = false;
    if (Array.isArray(parsed.whatsappTemplates)) {
      writeWhatsAppTemplates(parsed.whatsappTemplates);
      templatesUpdated = true;
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      const currentSettings = readJson(settingsPath, {});
      writeJson(settingsPath, { ...currentSettings, ...parsed.settings });
      settingsUpdated = true;
    }
    const templates = readWhatsAppTemplates().map(t => ({ ...t, usedTargets: mappedTargetsForTemplate(t, savedEnv) }));
    res.json({ ok: true, message: 'API backup uploaded and settings updated.', updatedKeys: Object.keys(envUpdate), templatesUpdated, settingsUpdated, config: publicConfig(savedEnv), templates, mappings: getWhatsAppTemplateMappings(savedEnv) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message || 'Invalid backup file' });
  }
});

app.get('/api/whatsapp-templates', (req, res) => {
  const env = readEnvFile();
  const templates = readWhatsAppTemplates().map(t => ({ ...t, usedTargets: mappedTargetsForTemplate(t, env) }));
  res.json({ ok: true, templates, mappings: getWhatsAppTemplateMappings(env) });
});
app.post('/api/whatsapp-templates', (req, res) => {
  const body = req.body || {};
  const list = readWhatsAppTemplates();
  const tpl = normalizeTemplate({ ...body, id: body.id || body.name || crypto.randomUUID(), updatedAt: nowIso() });
  if (!tpl.name) return res.status(400).json({ ok:false, error:'Template name required' });
  if (!tpl.body) return res.status(400).json({ ok:false, error:'Template body required' });
  const idx = list.findIndex(x => String(x.id) === String(tpl.id) || x.name === tpl.name);
  if (idx >= 0) list[idx] = { ...list[idx], ...tpl, id: list[idx].id || tpl.id, updatedAt: nowIso() };
  else list.unshift(tpl);
  {
    const env = readEnvFile();
    const templates = writeWhatsAppTemplates(list).map(t => ({ ...t, usedTargets: mappedTargetsForTemplate(t, env) }));
    res.json({ ok:true, templates, mappings: getWhatsAppTemplateMappings(env), template: tpl, message:'Template saved in Template Library.' });
  }
});
app.delete('/api/whatsapp-templates/:id', (req, res) => {
  const id = String(req.params.id || '');
  const next = readWhatsAppTemplates().filter(t => String(t.id) !== id && t.name !== id);
  {
    const env = readEnvFile();
    const templates = writeWhatsAppTemplates(next).map(t => ({ ...t, usedTargets: mappedTargetsForTemplate(t, env) }));
    res.json({ ok:true, templates, mappings: getWhatsAppTemplateMappings(env), message:'Template removed.' });
  }
});
app.post('/api/whatsapp-templates/reset-defaults', (req, res) => {
  {
    const env = readEnvFile();
    const templates = writeWhatsAppTemplates(defaultWhatsAppTemplates).map(t => ({ ...t, usedTargets: mappedTargetsForTemplate(t, env) }));
    res.json({ ok:true, templates, mappings: getWhatsAppTemplateMappings(env), message:'Default Tiny Shiny templates restored.' });
  }
});
app.post('/api/whatsapp-templates/use', (req, res) => {
  const { id, target } = req.body || {};
  const tpl = readWhatsAppTemplates().find(t => String(t.id) === String(id) || t.name === id);
  if (!tpl) return res.status(404).json({ ok:false, error:'Template not found' });
  const env = readEnvFile();
  const update = {};
  if (target === 'customer_followup') {
    update.CUSTOMER_WHATSAPP_MESSAGES_ENABLED = 'true';
    update.CUSTOMER_WHATSAPP_TEMPLATE_NAME = tpl.name;
    update.CUSTOMER_WHATSAPP_TEMPLATE_LANG = tpl.language || 'en';
  } else if (target === 'order_confirmation') {
    update.ORDER_CONFIRMATION_WHATSAPP_ENABLED = 'true';
    update.ORDER_CONFIRMATION_TEMPLATE_NAME = tpl.name;
    update.ORDER_CONFIRMATION_TEMPLATE_LANG = tpl.language || 'en';
  } else if (target === 'test_whatsapp') {
    update.WHATSAPP_TEST_TEMPLATE_NAME = tpl.name;
    update.WHATSAPP_TEST_TEMPLATE_LANG = tpl.language || 'en';
  } else {
    return res.status(400).json({ ok:false, error:'Target required: customer_followup, order_confirmation, or test_whatsapp' });
  }
  writeEnvFile({ ...env, ...update });
  {
    const savedEnv = readEnvFile();
    const templates = readWhatsAppTemplates().map(t => ({ ...t, usedTargets: mappedTargetsForTemplate(t, savedEnv) }));
    res.json({ ok:true, template:tpl, target, templates, mappings: getWhatsAppTemplateMappings(savedEnv), message:`${tpl.name} mapped to ${target}. API Settings updated.` });
  }
});


app.post('/api/whatsapp-templates/unuse', (req, res) => {
  const { id, target } = req.body || {};
  const tpl = readWhatsAppTemplates().find(t => String(t.id) === String(id) || t.name === id);
  if (!tpl) return res.status(404).json({ ok:false, error:'Template not found' });
  const env = readEnvFile();
  const update = {};
  if (target === 'customer_followup') {
    if ((env.CUSTOMER_WHATSAPP_TEMPLATE_NAME || '') === tpl.name) {
      update.CUSTOMER_WHATSAPP_MESSAGES_ENABLED = 'false';
      update.CUSTOMER_WHATSAPP_TEMPLATE_NAME = '';
      update.CUSTOMER_WHATSAPP_TEMPLATE_LANG = env.CUSTOMER_WHATSAPP_TEMPLATE_LANG || 'en';
    }
  } else if (target === 'order_confirmation') {
    if ((env.ORDER_CONFIRMATION_TEMPLATE_NAME || '') === tpl.name) {
      update.ORDER_CONFIRMATION_WHATSAPP_ENABLED = 'false';
      update.ORDER_CONFIRMATION_TEMPLATE_NAME = '';
      update.ORDER_CONFIRMATION_TEMPLATE_LANG = env.ORDER_CONFIRMATION_TEMPLATE_LANG || 'en';
    }
  } else if (target === 'test_whatsapp') {
    if ((env.WHATSAPP_TEST_TEMPLATE_NAME || '') === tpl.name) {
      update.WHATSAPP_TEST_TEMPLATE_NAME = '';
      update.WHATSAPP_TEST_TEMPLATE_LANG = env.WHATSAPP_TEST_TEMPLATE_LANG || 'en_US';
    }
  } else {
    return res.status(400).json({ ok:false, error:'Target required: customer_followup, order_confirmation, or test_whatsapp' });
  }
  writeEnvFile({ ...env, ...update });
  const savedEnv = readEnvFile();
  const templates = readWhatsAppTemplates().map(t => ({ ...t, usedTargets: mappedTargetsForTemplate(t, savedEnv) }));
  res.json({ ok:true, template:tpl, target, templates, mappings: getWhatsAppTemplateMappings(savedEnv), message:`${tpl.name} removed from ${target}.` });
});


app.get('/api/whatsapp-inbox', (req, res) => {
  const messages = readJson(whatsappInboxPath, []);
  res.json({ ok: true, messages });
});

app.post('/api/whatsapp-inbox/:id/read', (req, res) => {
  const messages = readJson(whatsappInboxPath, []);
  const idx = messages.findIndex(m => String(m.id) === String(req.params.id));
  if (idx >= 0) messages[idx].status = 'read';
  writeJson(whatsappInboxPath, messages);
  res.json({ ok: true, message: idx >= 0 ? messages[idx] : null });
});

app.post('/api/whatsapp-inbox/reply', async (req, res) => {
  try {
    const { phone = '', message = '', imageIds = [] } = req.body || {};
    const to = cleanPhone(phone);
    if (!to) return res.status(400).json({ ok: false, error: 'Customer phone required' });
    const text = String(message || '').trim();
    const images = readJson(mediaImagesPath, []);
    const selectedImages = (Array.isArray(imageIds) ? imageIds : []).map(id => images.find(x => String(x.id) === String(id))).filter(Boolean);
    const results = [];
    if (text && !selectedImages.length) {
      results.push({ type: 'text', result: await sendWhatsAppTextManual({ to, message: text }).catch(e => ({ ok:false, error:e.message })) });
    }
    for (const img of selectedImages.slice(0, 20)) {
      const imageUrl = img.url && img.url.startsWith('/uploads/') ? img.url : (img.url || '');
      results.push({ type:'image', imageId: img.id, result: await sendWhatsAppImage({ to, imageUrl: imageUrl.startsWith('http') ? imageUrl : (String(process.env.WEBSITE_URL || '').replace(/\/$/, '') + imageUrl), caption: text || img.caption || '' }).catch(e => ({ ok:false, error:e.message })) });
    }
    const ok = results.some(r => r.result && r.result.ok);
    const out = appendJson(whatsappInboxPath, { id: crypto.randomUUID(), direction: 'outbound', to, type: selectedImages.length ? 'image' : 'text', text, imageIds: selectedImages.map(x=>x.id), createdAt: nowIso(), status: ok ? 'sent' : 'failed', results });
    res.json({ ok, message: out, results });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/test-whatsapp', async (req, res) => {
  try {
    const result = await sendOwnerWhatsApp('Tiny Shiny Chatbot test message. WhatsApp API is connected successfully.', { forceTemplate: true });
    res.json({ ok: !!result.ok, result });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.post('/api/test-shopify', async (req, res) => {
  try {
    const envNow = readEnvFile();
    const store = normalizeShopDomain(envNow.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN);
    const token = String(envNow.SHOPIFY_ADMIN_ACCESS_TOKEN || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || '').trim();
    const version = envNow.SHOPIFY_API_VERSION || process.env.SHOPIFY_API_VERSION || '2025-10';
    if (!store || !token || token === '********') return res.json({ ok: false, message: 'Shopify store domain/token is missing.' });
    const response = await fetch(`https://${store}/admin/api/${version}/shop.json`, { headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' } });
    const json = await response.json().catch(() => ({}));
    res.json({ ok: response.ok, status: response.status, shop: json.shop ? { name: json.shop.name, domain: json.shop.domain, email: json.shop.email } : undefined, detail: response.ok ? undefined : json });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get('/shopify/install', requireAdmin, (req, res) => {
  const env = readEnvFile();
  const shop = normalizeShopDomain(req.query.shop || env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN);
  const clientId = String(process.env.SHOPIFY_CLIENT_ID || env.SHOPIFY_CLIENT_ID || '').trim();
  const scopes = String(process.env.SHOPIFY_OAUTH_SCOPES || env.SHOPIFY_OAUTH_SCOPES || 'read_orders,read_products,read_customers,read_draft_orders,write_draft_orders').replace(/\s+/g, '');
  if (!shop) return res.status(400).send('Shopify store domain missing. Use tinyshinygifts.myshopify.com.');
  if (!clientId) return res.status(400).send('SHOPIFY_CLIENT_ID missing. Add Client ID in API Settings or Render Environment.');
  const redirectUri = getShopifyRedirectUri(req);
  const state = crypto.randomBytes(16).toString('hex');
  saveOAuthState(state, shop);
  const url = `https://${shop}/admin/oauth/authorize?client_id=${encodeURIComponent(clientId)}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  res.redirect(url);
});

app.get('/shopify/callback', async (req, res) => {
  try {
    const env = readEnvFile();
    const shop = normalizeShopDomain(req.query.shop);
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    const clientId = String(process.env.SHOPIFY_CLIENT_ID || env.SHOPIFY_CLIENT_ID || '').trim();
    const clientSecret = String(process.env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_CLIENT_SECRET || '').trim();
    if (!shop || !code) return res.status(400).send('Missing Shopify callback data.');
    if (!verifyShopifyHmac(req.query, clientSecret)) return res.status(400).send('Shopify HMAC verification failed. Check Client Secret.');
    // Shopify can sometimes return after Render restarts or after a short delay. In that case
    // the local OAuth state file may be missing on free hosting. HMAC verification above is
    // still required, so we allow the callback to continue if state is missing/expired.
    if (state && !consumeOAuthState(state, shop)) {
      console.warn('Shopify OAuth state was missing/expired; continuing because HMAC is valid.', { shop });
    }
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code })
    });
    const tokenJson = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenJson.access_token) {
      return res.status(400).send(`<h2>Shopify token failed</h2><pre>${JSON.stringify(tokenJson, null, 2)}</pre>`);
    }
    const saved = writeEnvFile({
      ...env,
      SHOPIFY_STORE_DOMAIN: shop,
      SHOPIFY_ADMIN_ACCESS_TOKEN: tokenJson.access_token,
      SHOPIFY_API_VERSION: env.SHOPIFY_API_VERSION || process.env.SHOPIFY_API_VERSION || '2025-10'
    });
    process.env.SHOPIFY_STORE_DOMAIN = shop;
    process.env.SHOPIFY_ADMIN_ACCESS_TOKEN = tokenJson.access_token;
    res.send(`<!doctype html><html><head><meta charset="utf-8"><title>Shopify Connected</title><link rel="stylesheet" href="/style.css"></head><body><main class="admin-wrap"><section class="panel"><h1>Shopify Connected ✅</h1><p>Store connected: <b>${shop}</b></p><p>The Admin API token has been saved in this chatbot runtime. For permanent hosting, also add this token in Render → Environment as <b>SHOPIFY_ADMIN_ACCESS_TOKEN</b>.</p><p><a class="primary-btn" href="/api-settings.html?shopify=connected">Back to API Settings</a></p></section></main></body></html>`);
  } catch (e) {
    res.status(500).send('Shopify callback error: ' + e.message);
  }
});


app.post('/api/chat', async (req, res) => {
  const { message, pageUrl, productTitle, productHandle, productImage, productPrice, discountText, visitorId } = req.body || {};
  const settings = readJson(settingsPath, {});
  const raw = String(message || '').trim();
  const text = raw.toLowerCase();
  if (!raw) return res.json({ ok: true, reply: settings.welcomeMessage || 'Hello! How can I help you?' });
  const phone = extractPhone(raw);
  const wantsConfirm = /confirm|confirmation|place order|book order|buy this|order now|i want this/i.test(raw);
  const orderIdFromText = extractOrderId(raw);
  const looksLikeTrackingInput = Boolean(phone || orderIdFromText) && !wantsConfirm;
  const wantsTrack = /track|tracking|order status|where is my order|dispatch|shipped|shipment/i.test(raw) || looksLikeTrackingInput;
  const product = { title: productTitle, handle: productHandle, image: productImage, price: productPrice, discountText, url: pageUrl };
  if (wantsConfirm) {
    const lead = appendJson(leadsPath, { id: crypto.randomUUID(), type: 'order_confirmation', createdAt: nowIso(), phone, pageUrl, productTitle, productHandle, productImage, productPrice, discountText, message: raw, visitorId });
    const waMsg = `New chatbot order confirmation request\nWebsite: Tiny Shiny Gifts\nPhone: ${phone || 'Not shared'}\n${productSummary(product)}\nCustomer message: ${raw}`;
    sendOwnerWhatsApp(waMsg).catch(err => console.error('WhatsApp notify error:', err.message));
    createShopifyDraftOrder({ phone, productTitle, pageUrl, price: productPrice, message: raw }).catch(err => console.error('Shopify draft error:', err.message));
    return res.json({ ok: true, action: 'order_confirmation_saved', reply: phone ? 'Thank you. Your order confirmation request has been sent to our team. We will confirm it on WhatsApp shortly.' : 'Sure. Please share your mobile number, product name/link and quantity so our team can confirm your order on WhatsApp.' });
  }
  if (wantsTrack) {
    const orderId = orderIdFromText || extractOrderId(raw);
    if (!orderId && !phone) return res.json({ ok: true, action: 'ask_order_number', reply: 'Please share your order number or registered mobile number to check your order tracking.' });
    const status = await getShopifyOrderStatus({ orderId, phone });
    if (status.ok) {
      return res.json({ ok: true, action: 'order_status', order: status.order, shiprocket: status.shiprocket, reply: status.reply || 'Order details found.' });
    }
    appendJson(leadsPath, { id: crypto.randomUUID(), type: 'tracking_request', createdAt: nowIso(), phone, orderId, pageUrl, message: raw, visitorId });
    sendOwnerWhatsApp(`New chatbot tracking request\nOrder/Mobile: ${orderId || phone}\nPage: ${pageUrl || ''}\nMessage: ${raw}`).catch(() => {});
    return res.json({ ok: true, action: 'tracking_forwarded', reply: `${status.message || 'I could not check the tracking automatically yet.'} I have forwarded your tracking request to our team.` });
  }
  if (text.includes('whatsapp') || text.includes('support') || text.includes('agent')) {
    const wa = cleanPhone(process.env.WHATSAPP_NUMBER || '');
    return res.json({ ok: true, reply: wa ? `You can talk to our support team on WhatsApp: https://wa.me/${wa}` : 'WhatsApp number is not added yet. Please add WHATSAPP_NUMBER in the .env file.' });
  }
  const faqAnswer = findFaqAnswer(raw);
  if (faqAnswer) return res.json({ ok: true, reply: faqAnswer });
  return res.json({ ok: true, reply: settings.fallbackMessage || 'I need a little more detail to help you.' });
});

app.post('/api/order-confirmation', async (req, res) => {
  const lead = appendJson(leadsPath, { id: crypto.randomUUID(), type: 'order_confirmation_form', createdAt: nowIso(), ...(req.body || {}) });
  const msg = `New order confirmation form\nName: ${lead.name || ''}\nPhone: ${lead.phone || ''}\nProduct: ${lead.product || lead.productTitle || ''}\nQuantity: ${lead.quantity || '1'}\nPage: ${lead.pageUrl || ''}\nImage: ${lead.productImage || lead.image || ''}\nAddress: ${lead.address || ''}\nNote: ${lead.note || ''}`;
  const wa = await sendOwnerWhatsApp(msg).catch(err => ({ ok: false, error: err.message }));
  const draft = await createShopifyDraftOrder(lead).catch(err => ({ ok: false, error: err.message }));
  res.json({ ok: true, lead, whatsapp: wa, shopifyDraft: draft });
});

app.post('/api/customer-lead-message', async (req, res) => {
  const body = req.body || {};
  const phone = cleanPhone(body.phone || body.customer?.phone);
  const consent = body.consent === true || body.optIn === true || body.customer?.consent === true;
  const type = body.type || 'product_close';
  const message = buildLeadMessage({ type, product: body.product || body, cart: body.cart || {}, customer: body.customer || {}, pageUrl: body.pageUrl });
  const saved = appendJson(leadsPath, { id: crypto.randomUUID(), type: 'customer_whatsapp_followup', createdAt: nowIso(), phone, consent, message, ...body });
  sendOwnerWhatsApp(`Customer follow-up lead captured\nPhone: ${phone || 'Not shared'}\nConsent: ${consent ? 'Yes' : 'No'}\n${message}`).catch(() => {});
  let customerWhatsApp = { ok: false, skipped: true, reason: 'Phone or consent missing.' };
  if (phone && consent) {
    customerWhatsApp = await sendCustomerWhatsApp(phone, message).catch(err => ({ ok: false, error: err.message }));
  }
  res.json({ ok: true, lead: saved, customerWhatsApp, message });
});

app.post('/api/lead-message', async (req, res) => {
  const body = req.body || {};
  const type = body.type || 'product';
  const message = buildLeadMessage({ type, product: body.product || body, cart: body.cart || {}, customer: body.customer || {}, pageUrl: body.pageUrl });
  const saved = appendJson(leadMessagesPath, { id: crypto.randomUUID(), type, createdAt: nowIso(), message, ...body });
  appendJson(leadsPath, { id: crypto.randomUUID(), type: type === 'cart' ? 'cart_lead' : 'product_view_lead', createdAt: nowIso(), message, ...body });
  if (body.customer?.phone || body.phone) {
    // Customer outbound WhatsApp template support is not auto-enabled here. Owner is notified so team can follow up manually.
  }
  sendOwnerWhatsApp(`New ${type} buy lead\n${message}\nVisitor: ${body.visitorId || ''}`).catch(() => {});
  res.json({ ok: true, lead: saved, message });
});

app.post('/api/visitor-event', (req, res) => {
  const event = appendJson(eventsPath, { id: crypto.randomUUID(), createdAt: nowIso(), ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress, ...(req.body || {}) });
  res.json({ ok: true, event });
});

app.get('/api/media-images', (req, res) => {
  res.json({ ok: true, images: readJson(mediaImagesPath, []) });
});
app.post('/api/media-images', (req, res) => {
  try {
    const body = req.body || {};
    const savedFile = saveImageFromDataUrl({ dataUrl: body.dataUrl, filename: body.filename });
    const item = {
      id: savedFile.id,
      createdAt: nowIso(),
      title: String(body.title || '').trim() || 'Untitled Image',
      category: String(body.category || 'offer').trim(),
      caption: String(body.caption || '').trim(),
      url: savedFile.url,
      absoluteUrl: absoluteUrl(req, savedFile.url),
      mime: savedFile.mime,
      filename: savedFile.filename
    };
    const images = readJson(mediaImagesPath, []);
    images.unshift(item);
    writeJson(mediaImagesPath, images.slice(0, 300));
    res.json({ ok: true, image: item });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});
app.delete('/api/media-images/:id', (req, res) => {
  const images = readJson(mediaImagesPath, []);
  const found = images.find(x => x.id === req.params.id);
  const next = images.filter(x => x.id !== req.params.id);
  writeJson(mediaImagesPath, next);
  if (found && found.url && found.url.startsWith('/uploads/')) {
    try { fs.unlinkSync(path.join(__dirname, 'public', found.url)); } catch {}
  }
  res.json({ ok: true });
});
app.post('/api/send-image-message', async (req, res) => {
  const body = req.body || {};
  const images = readJson(mediaImagesPath, []);
  const rawIds = Array.isArray(body.imageIds) ? body.imageIds : (body.imageId ? [body.imageId] : []);
  const selectedImages = rawIds
    .map(id => images.find(x => x.id === id))
    .filter(Boolean);
  if (!selectedImages.length && body.imageUrl) selectedImages.push({ id: 'custom-url', url: body.imageUrl, caption: body.caption || '' });
  const caption = String(body.caption || '').trim();
  const to = body.to === 'owner' ? (process.env.OWNER_WHATSAPP_NUMBER || process.env.WHATSAPP_NUMBER) : body.phone;
  const message = String(body.message || caption || '').trim();
  const results = [];
  if (selectedImages.length) {
    for (const img of selectedImages.slice(0, 20)) {
      const imageUrl = absoluteUrl(req, img.url || '');
      const result = await sendWhatsAppImage({ to, imageUrl, caption: caption || img.caption || '' }).catch(e => ({ ok: false, error: e.message }));
      results.push({ imageId: img.id, imageUrl, result });
    }
  } else {
    const result = await sendWhatsAppTextManual({ to, message }).catch(e => ({ ok: false, error: e.message }));
    results.push({ type: 'text', result });
  }
  const ok = results.some(r => r.result && r.result.ok);
  appendJson(leadMessagesPath, { id: crypto.randomUUID(), type: selectedImages.length ? 'image_message' : 'text_message', createdAt: nowIso(), to: body.to || 'custom', phone: cleanPhone(to), imageIds: selectedImages.map(x=>x.id), caption: message, results });
  res.json({ ok, count: results.length, results, imageIds: selectedImages.map(x=>x.id), caption: message });
});


app.get('/api/crm', (req, res) => {
  const customers = readJson(crmPath, []);
  const summary = customers.reduce((acc, c) => { acc.total++; acc[c.status || 'New'] = (acc[c.status || 'New'] || 0) + 1; return acc; }, { total: 0 });
  res.json({ ok: true, customers, summary });
});
app.patch('/api/crm/:id', (req, res) => {
  const all = readJson(crmPath, []);
  const idx = all.findIndex(x => x.id === req.params.id);
  if (idx < 0) return res.status(404).json({ ok: false, error: 'CRM record not found' });
  const allowed = ['status','notes','name','phone','email','tags'];
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) all[idx][key] = req.body[key];
  all[idx].updatedAt = nowIso();
  writeJson(crmPath, all);
  sendToGoogleSheets('CRM Update', all[idx]).catch(() => {});
  res.json({ ok: true, customer: all[idx] });
});
app.post('/api/test-google-sheets', async (req, res) => {
  const result = await sendToGoogleSheets('Test', { message: 'Tiny Shiny Chatbot Google Sheet test', createdAt: nowIso() }).catch(e => ({ ok: false, error: e.message }));
  res.json(result);
});
app.post('/api/sync-google-sheets', async (req, res) => {
  const crm = readJson(crmPath, []);
  const leads = readJson(leadsPath, []);
  const events = readJson(eventsPath, []);
  const messages = readJson(leadMessagesPath, []);
  const result = await sendToGoogleSheets('Full CRM Sync', { crm, leads, events, messages, syncedAt: nowIso() }).catch(e => ({ ok: false, error: e.message }));
  res.json({ ok: !!result.ok, result, counts: { crm: crm.length, leads: leads.length, events: events.length, messages: messages.length } });
});

app.get('/api/leads', (req, res) => res.json({ ok: true, leads: readJson(leadsPath, []) }));
app.get('/api/visitor-events', (req, res) => res.json({ ok: true, events: readJson(eventsPath, []) }));
app.get('/api/lead-messages', (req, res) => res.json({ ok: true, messages: readJson(leadMessagesPath, []) }));
app.get('/api/storage/status', (req, res) => res.json({ ok: true, storage: mongoReady ? 'mongodb' : 'json-file', mongodb: { configured: Boolean(mongoUri), connected: mongoReady, database: mongoReady ? mongoDbName : '', collection: mongoReady ? mongoCollectionName : '' } }));
app.get('/api/faqs', (req, res) => res.json({ ok: true, faqs: readJson(faqPath, []) }));

function simplifyShopifyCustomer(c = {}) {
  const addr = c.default_address || (c.addresses || [])[0] || {};
  return {
    id: c.id,
    name: [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || c.phone || 'Customer',
    email: c.email || '',
    phone: cleanPhone(c.phone || addr.phone),
    city: addr.city || '',
    ordersCount: c.orders_count || 0,
    totalSpent: c.total_spent ? `₹${c.total_spent}` : '₹0',
    lastOrderId: c.last_order_id || '',
    lastOrderName: c.last_order_name || '',
    lastOrderDate: c.updated_at ? String(c.updated_at).slice(0,10) : '',
    orderStatus: c.state || '-',
    raw: c
  };
}

function simplifyShopifyProduct(p = {}) {
  const variant = (p.variants || [])[0] || {};
  const image = p.image?.src || (p.images || [])[0]?.src || '';
  return {
    id: p.id,
    title: p.title || 'Product',
    handle: p.handle || '',
    status: p.status || '',
    productType: p.product_type || '',
    vendor: p.vendor || '',
    createdAt: p.created_at ? String(p.created_at).slice(0,10) : '',
    updatedAt: p.updated_at ? String(p.updated_at).slice(0,10) : '',
    price: variant.price ? `₹${variant.price}` : '',
    compareAtPrice: variant.compare_at_price ? `₹${variant.compare_at_price}` : '',
    image,
    url: `${String(process.env.WEBSITE_URL || 'https://tinyshinygifts.com').replace(/\/$/,'')}/products/${p.handle || ''}`,
    raw: p
  };
}
app.get('/api/shopify/products', async (req, res) => {
  try {
    const r = await shopifyFetch('products.json?limit=250&fields=id,title,handle,status,product_type,vendor,created_at,updated_at,image,images,variants');
    if (!r.ok) return res.status(400).json({ ok:false, error:r.message || 'Shopify products fetch failed', detail:r.json || r });
    const products = (r.json.products || []).map(simplifyShopifyProduct).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json({ ok:true, products });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});
app.post('/api/shopify/products/bulk-promo', async (req, res) => {
  try {
    const { product = {}, customers = [], message = '', saveOnly = false } = req.body || {};
    if (!product || !product.title) return res.status(400).json({ ok:false, error:'Product required' });
    if (!Array.isArray(customers) || !customers.length) return res.status(400).json({ ok:false, error:'Select customers first' });
    const promo = (message || `New product launched at Tiny Shiny Gifts!\n${product.title}\nPrice: ${product.price || ''}\nBuy here: ${product.url || ''}`).trim();
    const results = [];
    for (const c of customers.slice(0,500)) {
      const crm = upsertCrm({ name:c.name, phone:c.phone, email:c.email, productTitle:product.title, pageUrl:product.url, productImage:product.image, message:promo }, 'message');
      let wa = { ok:false, skipped:true, reason:'Saved as CRM follow-up only.' };
      if (!saveOnly && c.phone) wa = await sendCustomerWhatsApp(c.phone, promo).catch(err => ({ ok:false, error:err.message }));
      results.push({ customer:c.name || c.phone || c.email, phone:c.phone || '', crmId:crm.id, whatsapp:wa });
    }
    sendToGoogleSheets('New Product Promotion', { product, count:results.length, message:promo, results }).catch(()=>{});
    res.json({ ok:true, count:results.length, results });
  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }
});

app.get('/api/shopify/customers', async (req, res) => {
  try {
    const r = await shopifyFetch('customers.json?limit=250&fields=id,first_name,last_name,email,phone,default_address,addresses,orders_count,total_spent,last_order_id,last_order_name,updated_at,state');
    if (!r.ok) return res.status(400).json({ ok: false, error: r.message || 'Shopify customers fetch failed', detail: r.json || r });

    const customers = (r.json.customers || []).map(simplifyShopifyCustomer);

    // Enrich customer list with actual latest Shopify order status.
    // Do not use customer.state because it can be "disabled" and is not an order status.
    const orderResp = await shopifyFetch('orders.json?status=any&limit=250&fields=id,name,order_number,created_at,customer,financial_status,fulfillment_status,total_price,currency,cancelled_at,fulfillments');
    if (orderResp.ok) {
      const latestByCustomer = new Map();
      for (const o of (orderResp.json.orders || [])) {
        const cid = o.customer && o.customer.id ? String(o.customer.id) : '';
        if (!cid) continue;
        const prev = latestByCustomer.get(cid);
        if (!prev || new Date(o.created_at || 0) > new Date(prev.created_at || 0)) latestByCustomer.set(cid, o);
      }
      for (const c of customers) {
        const o = latestByCustomer.get(String(c.id));
        if (!o) continue;
        const payment = o.financial_status ? String(o.financial_status).replace(/_/g, ' ') : '-';
        const fulfill = o.cancelled_at ? 'cancelled' : (o.fulfillment_status ? String(o.fulfillment_status).replace(/_/g, ' ') : 'unfulfilled');
        c.lastOrderName = o.name || c.lastOrderName;
        c.lastOrderDate = o.created_at ? String(o.created_at).slice(0,10) : c.lastOrderDate;
        c.orderStatus = `${payment} / ${fulfill}`;
        c.lastOrderAmount = `${o.currency || 'INR'} ${o.total_price || ''}`.trim();
        const tracking = (o.fulfillments || []).flatMap(f => (f.tracking_numbers || []).map((n, i) => ({ number: n, url: (f.tracking_urls || [])[i] || '', company: f.tracking_company || '', status: f.shipment_status || f.status || '' })));
        if (tracking.length) {
          c.trackingNumber = tracking[0].number || '';
          c.trackingUrl = tracking[0].url || '';
          c.orderStatus += ` / ${tracking[0].status || 'tracking added'}`;
        }
      }
    }

    res.json({ ok: true, customers });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.post('/api/shopify/customers/bulk-message', async (req, res) => {
  try {
    const { customers = [], message = '', saveOnly = false, sendVia = 'whatsapp' } = req.body || {};
    if (!Array.isArray(customers) || !customers.length) return res.status(400).json({ ok: false, error: 'customers array required' });
    if (!message.trim()) return res.status(400).json({ ok: false, error: 'message required' });
    const results = [];
    for (const c of customers.slice(0, 500)) {
      const crm = upsertCrm({ name: c.name, phone: c.phone, email: c.email, note: message, message, customer: c }, 'message');
      let wa = { ok: false, skipped: true, reason: 'Saved as CRM follow-up only.' };
      if (!saveOnly && sendVia === 'whatsapp' && c.phone) wa = await sendCustomerWhatsApp(c.phone, message).catch(err => ({ ok:false, error:err.message }));
      results.push({ customer: c.name || c.phone || c.email, phone: c.phone || '', crmId: crm.id, whatsapp: wa });
    }
    sendToGoogleSheets('Bulk Customer Message', { count: results.length, message, results }).catch(()=>{});
    res.json({ ok: true, count: results.length, results });
  } catch (e) { res.status(500).json({ ok:false, error:e.message }); }
});

app.post('/api/faqs', (req, res) => { const { faqs } = req.body || {}; if (!Array.isArray(faqs)) return res.status(400).json({ ok: false, error: 'faqs array required' }); writeJson(faqPath, faqs); res.json({ ok: true, faqs }); });
app.post('/api/settings', (req, res) => { const current = readJson(settingsPath, {}); const next = { ...current, ...(req.body || {}) }; writeJson(settingsPath, next); res.json({ ok: true, settings: next }); });


function orderCustomerPhone(order = {}) {
  return cleanPhone(order.phone || order.customer?.phone || order.billing_address?.phone || order.shipping_address?.phone || order.customer?.default_address?.phone);
}
function orderConfirmMessage(order = {}) {
  const items = (order.line_items || []).slice(0, 6).map(i => `${i.title} x ${i.quantity}`).join(', ');
  const confirmUrl = `${String(process.env.WEBSITE_URL || 'https://tinyshinygifts.com').replace(/\/$/, '')}?order_confirm=${encodeURIComponent(order.name || order.order_number || order.id || '')}`;
  return `Thank you for your order with Tiny Shiny Gifts.\nOrder: ${order.name || ''}\nAmount: ${order.currency || 'INR'} ${order.total_price || ''}\nItems: ${items || '-'}\nPlease reply CONFIRM ${order.name || ''} to confirm your order.\n${confirmUrl}`;
}
async function sendOrderConfirmationToCustomer(order = {}) {
  const enabled = String(process.env.ORDER_CONFIRMATION_WHATSAPP_ENABLED || process.env.CUSTOMER_WHATSAPP_MESSAGES_ENABLED || 'false').toLowerCase() === 'true';
  const phone = orderCustomerPhone(order);
  if (!enabled || !phone) return { ok:false, skipped:true, reason: enabled ? 'Customer phone missing.' : 'Order confirmation WhatsApp disabled.' };
  return sendCustomerWhatsApp(phone, orderConfirmMessage(order));
}

app.post('/webhooks/shopify/orders/create', async (req, res) => {
  const order = req.body || {};
  const phone = orderCustomerPhone(order);
  const lead = appendJson(leadsPath, { id: crypto.randomUUID(), type: 'shopify_order_webhook', createdAt: nowIso(), orderName: order.name, phone, total: order.total_price, raw: order, status: 'Order Confirmation Pending' });
  const customerWa = await sendOrderConfirmationToCustomer(order).catch(err => ({ ok:false, error:err.message }));
  await sendOwnerWhatsApp(`New Shopify order received\nOrder: ${order.name || ''}\nCustomer: ${order.customer?.first_name || ''} ${order.customer?.last_name || ''}\nPhone: ${phone || ''}\nTotal: ${order.currency || 'INR'} ${order.total_price || ''}\nCustomer confirmation WhatsApp: ${customerWa.ok ? 'sent' : (customerWa.reason || customerWa.error || 'not sent')}`).catch(() => {});
  res.json({ ok: true, lead, customerWhatsApp: customerWa });
});

app.post('/api/order-confirmed-by-customer', async (req, res) => {
  const body = req.body || {};
  const orderName = String(body.orderName || body.order || body.orderId || '').trim();
  const phone = cleanPhone(body.phone || '');
  const lead = appendJson(leadsPath, { id: crypto.randomUUID(), type: 'customer_order_confirmed', createdAt: nowIso(), orderName, phone, message: body.message || 'Customer confirmed order', raw: body });
  const wa = await sendOwnerWhatsApp(`Customer confirmed order\nOrder: ${orderName || '-'}\nPhone: ${phone || '-'}\nMessage: ${body.message || ''}`).catch(err => ({ ok:false, error:err.message }));
  res.json({ ok:true, lead, ownerWhatsApp: wa });
});

initMongoStorage().finally(() => {
  app.listen(PORT, () => console.log(`Tiny Shiny Chatbot running on http://localhost:${PORT}`));
});
