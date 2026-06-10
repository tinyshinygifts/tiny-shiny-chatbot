from pathlib import Path
p=Path('/mnt/data/work_current')
server=p/'server.js'
adminjs=p/'public/admin.js'
adminhtml=p/'public/admin.html'
apihtml=p/'public/api-settings.html'
apijs=p/'public/api-settings.js'
css=p/'public/style.css'

s=server.read_text()
# Add media send functions after sendWhatsAppImage
if 'async function sendWhatsAppDocument' not in s:
    s=s.replace("async function sendWhatsAppImage({ to, imageUrl, caption = '' }) {\n  const receiver = normalizeWhatsAppPhone(to);\n  if (!receiver || !imageUrl) return { ok: false, skipped: true, reason: 'Receiver phone or image URL missing.' };\n  return postWhatsApp({ messaging_product: 'whatsapp', recipient_type: 'individual', to: receiver, type: 'image', image: { link: imageUrl, caption: caption || '' } });\n}\n", "async function sendWhatsAppImage({ to, imageUrl, caption = '' }) {\n  const receiver = normalizeWhatsAppPhone(to);\n  if (!receiver || !imageUrl) return { ok: false, skipped: true, reason: 'Receiver phone or image URL missing.' };\n  return postWhatsApp({ messaging_product: 'whatsapp', recipient_type: 'individual', to: receiver, type: 'image', image: { link: imageUrl, caption: caption || '' } });\n}\n\nasync function sendWhatsAppDocument({ to, documentUrl, filename = 'document.pdf', caption = '' }) {\n  const receiver = normalizeWhatsAppPhone(to);\n  if (!receiver || !documentUrl) return { ok: false, skipped: true, reason: 'Receiver phone or document URL missing.' };\n  return postWhatsApp({ messaging_product: 'whatsapp', recipient_type: 'individual', to: receiver, type: 'document', document: { link: documentUrl, filename: filename || 'document.pdf', caption: caption || '' } });\n}\n")
# Add save file function
if 'function saveMediaFromDataUrl' not in s:
    s=s.replace("function saveImageFromDataUrl({ dataUrl, filename }) {", "function saveMediaFromDataUrl({ dataUrl, filename }) {\n  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/i);\n  if (!match) throw new Error('Invalid file data.');\n  const mime = match[1].toLowerCase();\n  const allowed = ['image/png','image/jpeg','image/jpg','image/webp','image/gif','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];\n  if (!allowed.includes(mime)) throw new Error('Only image, PDF, TXT, DOC/DOCX, XLS/XLSX files are supported.');\n  const extMap = {'image/png':'png','image/jpeg':'jpg','image/jpg':'jpg','image/webp':'webp','image/gif':'gif','application/pdf':'pdf','text/plain':'txt','application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','application/vnd.ms-excel':'xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx'};\n  const ext = extMap[mime] || 'bin';\n  const safeName = String(filename || 'file').replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-').slice(0, 80);\n  const id = crypto.randomUUID();\n  const outDir = path.join(__dirname, 'public', 'uploads');\n  fs.mkdirSync(outDir, { recursive: true });\n  const base = safeName.replace(/\\.[a-z0-9]+$/i,'') || 'file';\n  const outName = `${Date.now()}-${id}-${base}.${ext}`;\n  const outPath = path.join(outDir, outName);\n  fs.writeFileSync(outPath, Buffer.from(match[2], 'base64'));\n  return { id, url: `/uploads/${outName}`, mime, filename: outName, originalName: filename || outName };\n}\n\nfunction saveImageFromDataUrl({ dataUrl, filename }) {")
# Add media upload endpoint before config upload maybe after saveImageFromDataUrl
if "/api/whatsapp-inbox/upload-media" not in s:
    insert_after = "function saveImageFromDataUrl({ dataUrl, filename }) {"
    # better after function body? Insert after its return block by marker "return { id, url"
    marker = "  return { id, url: `/uploads/${outName}`, mime: match[1], filename: outName };\n}\n"
    endpoint = "\napp.post('/api/whatsapp-inbox/upload-media', requireAdmin, (req, res) => {\n  try {\n    const file = saveMediaFromDataUrl({ dataUrl: req.body?.dataUrl, filename: req.body?.filename || 'file' });\n    res.json({ ok:true, file, url:absoluteUrl(req, file.url) });\n  } catch(e) { res.status(400).json({ ok:false, error:e.message }); }\n});\n"
    s=s.replace(marker, marker+endpoint,1)
# Extend whatsapp reply endpoint? find endpoint
if "documentUrl" not in s[s.find("app.post('/api/whatsapp-inbox/reply'"):s.find("app.post('/api/whatsapp-inbox/reply'")+1200]:
    start=s.find("app.post('/api/whatsapp-inbox/reply'")
    end=s.find("});", start)+3
    block=s[start:end]
    new_block = "app.post('/api/whatsapp-inbox/reply', requireAdmin, async (req, res) => {\n  try {\n    const { phone, message = '', imageIds = [], imageUrl = '', documentUrl = '', documentName = '' } = req.body || {};\n    const to = normalizeWhatsAppPhone(phone);\n    if (!to) return res.status(400).json({ ok:false, error:'Reply phone number required.' });\n    const results = [];\n    const text = String(message || '').trim();\n    if (documentUrl) {\n      results.push({ type:'document', result: await sendWhatsAppDocument({ to, documentUrl, filename: documentName || 'document', caption: text }).catch(e => ({ ok:false, error:e.message })) });\n    } else if (imageUrl) {\n      results.push({ type:'image', result: await sendWhatsAppImage({ to, imageUrl, caption: text }).catch(e => ({ ok:false, error:e.message })) });\n    } else if (Array.isArray(imageIds) && imageIds.length) {\n      const imgs = readJson(mediaImagesPath, []);\n      for (const id of imageIds) {\n        const img = imgs.find(x => String(x.id) === String(id));\n        if (!img) { results.push({ type:'image', imageId:id, result:{ok:false,error:'Image not found'} }); continue; }\n        const u = img.url && img.url.startsWith('/uploads/') ? absoluteUrl(req, img.url) : (img.url || '');\n        results.push({ type:'image', imageId:id, result: await sendWhatsAppImage({ to, imageUrl:u, caption: text || img.caption || '' }).catch(e => ({ ok:false, error:e.message })) });\n      }\n    } else {\n      if (!text) return res.status(400).json({ ok:false, error:'Message, image or document required.' });\n      results.push({ type:'text', result: await sendWhatsAppTextManual({ to, message:text }).catch(e => ({ ok:false, error:e.message })) });\n    }\n    const ok = results.some(r => r.result && r.result.ok);\n    appendJson(whatsappInboxPath, { id:crypto.randomUUID(), direction:'outbound', to, customerName:'Business', type: documentUrl?'document':(imageUrl||imageIds.length?'image':'text'), text, documentUrl, imageUrl, createdAt:nowIso(), status:ok?'sent':'failed', raw:{results} });\n    res.json({ ok, results });\n  } catch(e) { res.status(500).json({ ok:false, error:e.message }); }\n});"
    if start!=-1 and "app.post('/api/whatsapp-inbox/reply'" in block:
        s=s[:start]+new_block+s[end:]
# Add NDR helpers before NDR section
if 'async function fetchShiprocketLiveNdr' not in s:
    marker='// ---------- NDR: Shiprocket + WhatsApp automation ----------'
    helper=r'''
function cleanupNdrRows(rows){
  const seen=new Set();
  const cleaned=[];
  for(const r of (rows||[])){
    if(String(r.provider||'shiprocket').toLowerCase()==='icarry') continue;
    const order=String(r.orderNo||r.orderNumber||'').trim().toLowerCase();
    const awb=String(r.awb||'').trim().toLowerCase();
    const phone=normalizeWhatsAppPhone(r.phone||'');
    const key=awb || (order+'|'+phone);
    if(key && seen.has(key)) continue;
    if(key) seen.add(key);
    cleaned.push(Object.assign({provider:'shiprocket'}, r, {provider:'shiprocket'}));
  }
  return cleaned;
}
function findArrayDeep(obj){
  if(Array.isArray(obj)) return obj;
  if(!obj || typeof obj!=='object') return [];
  for(const k of ['data','ndr','orders','shipments','records','result','results','payload']){
    const v=obj[k];
    if(Array.isArray(v)) return v;
    if(v && typeof v==='object') { const a=findArrayDeep(v); if(a.length) return a; }
  }
  return [];
}
function mapShiprocketNdrItem(x){
  const orderNo = x.order_id || x.orderId || x.order_no || x.orderNo || x.channel_order_id || x.reference_order_id || x.order_number || x.orderNumber || x.name || '';
  const awb = x.awb || x.awb_code || x.awbCode || x.tracking_number || x.trackingNumber || x.airway_bill_number || '';
  const phone = normalizeWhatsAppPhone(x.phone || x.customer_phone || x.customerPhone || x.consignee_phone || x.billing_phone || x.shipping_phone || '');
  const customerName = x.customer_name || x.customerName || x.consignee_name || x.name || x.buyer_name || 'Customer';
  const reason = x.ndr_reason || x.reason || x.latest_ndr_reason || x.failure_reason || x.exception_reason || x.status || 'NDR / delivery attempt pending';
  const ndrAt = x.ndr_date || x.ndrDate || x.latest_ndr_date || x.created_at || x.updated_at || nowIso();
  const attempts = x.ndr_attempt || x.attempts || x.attempt_count || x.delivery_attempts || 1;
  const trackingLink = x.tracking_url || x.trackingLink || x.track_url || (awb ? `https://shiprocket.co/tracking/${encodeURIComponent(awb)}` : '');
  return {
    id: 'shiprocket_'+(awb || String(orderNo).replace(/[^a-z0-9]/gi,'') || safeId('ndr')),
    provider:'shiprocket', awb:String(awb||''), orderNo:String(orderNo||''), orderDate:x.order_date || x.orderDate || x.created_at || '',
    customerName, phone, courier:x.courier_name || x.courier || x.courier_company || '', reason,
    status:String(x.ndr_status || x.status || 'pending').toLowerCase(), attempts:Number(attempts||1), ndrAt,
    trackingLink, whatsappStatus:x.whatsappStatus||'not_sent', attemptInfo:x.attemptInfo || x.delivery_attempt_info || x.ndr_remark || x.remarks || reason,
    customerResponse:x.customer_response || x.latest_customer_response || '', raw:x,
    logs:[{at:nowIso(), text:'Live Shiprocket NDR data synced'}]
  };
}
async function fetchShiprocketLiveNdr(){
  const env=readEnvFile();
  const token=String(process.env.SHIPROCKET_TOKEN || env.SHIPROCKET_TOKEN || '').trim();
  if(!token || token==='********') return {ok:false,error:'Shiprocket token missing. Add SHIPROCKET_TOKEN in API Settings.', rows:[]};
  const endpoints=[
    'https://apiv2.shiprocket.in/v1/external/ndr/all',
    'https://apiv2.shiprocket.in/v1/external/ndr/list',
    'https://apiv2.shiprocket.in/v1/external/ndr',
    'https://apiv2.shiprocket.in/v1/external/orders/processing/ndr'
  ];
  const errors=[];
  for(const url of endpoints){
    try{
      const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});
      const j=await r.json().catch(()=>({}));
      if(!r.ok){ errors.push(`${url}: ${r.status} ${j.message||j.error||''}`); continue; }
      const arr=findArrayDeep(j);
      const rows=arr.map(mapShiprocketNdrItem).filter(x=>x.orderNo||x.awb||x.phone);
      return {ok:true, endpoint:url, count:rows.length, rows, rawShape:Object.keys(j||{}).slice(0,10)};
    }catch(e){ errors.push(`${url}: ${e.message}`); }
  }
  return {ok:false,error:'Shiprocket live NDR API failed or returned no readable NDR list.', details:errors, rows:[]};
}
'''
    s=s.replace(marker, helper+'\n'+marker)
# Replace NDR endpoints with live behavior
old="""app.get('/api/ndr', requireAdmin, (req,res)=>{\n  const rows=seedNdrFromLeads();\n  const settings=readNdrSettings();\n  const summary={total:rows.length,pending:rows.filter(x=>String(x.status).includes('pending')).length,reattempt:rows.filter(x=>String(x.status).includes('reattempt')).length,rto:rows.filter(x=>String(x.status).includes('rto')).length};\n  res.json({ok:true, ndr:rows, settings, summary, providers:{shiprocket:Boolean(process.env.SHIPROCKET_TOKEN||process.env.SHIPROCKET_EMAIL)}});\n});\napp.post('/api/ndr/settings', requireAdmin, (req,res)=>{ const next=Object.assign(readNdrSettings(), req.body||{}, {updatedAt:nowIso()}); writeJson(ndrSettingsPath,next); res.json({ok:true, settings:next}); });\napp.post('/api/ndr/sync', requireAdmin, async (req,res)=>{\n  const rows=seedNdrFromLeads();\n  const synced=rows.map(x=>Object.assign({},x,{lastSyncAt:nowIso()}));\n  writeJson(ndrPath,synced);\n  res.json({ok:true, message:'NDR sync completed from saved data. Shiprocket live API fields will populate when provider endpoint returns NDR data.', count:synced.length, ndr:synced});\n});"""
new="""app.get('/api/ndr', requireAdmin, (req,res)=>{\n  let rows=cleanupNdrRows(readJson(ndrPath,[]));\n  if(!rows.length) rows=cleanupNdrRows(seedNdrFromLeads());\n  writeJson(ndrPath, rows);\n  const settings=readNdrSettings();\n  const summary={total:rows.length,pending:rows.filter(x=>String(x.status).includes('pending')).length,reattempt:rows.filter(x=>String(x.status).includes('reattempt')).length,rto:rows.filter(x=>String(x.status).includes('rto')).length};\n  const env=readEnvFile();\n  res.json({ok:true, ndr:rows, settings, summary, providers:{shiprocket:Boolean(process.env.SHIPROCKET_TOKEN||env.SHIPROCKET_TOKEN)}, note: rows.some(x=>!x.awb)?'Some rows are saved/fallback rows. Click Sync Shiprocket for live AWB/tracking data.':''});\n});\napp.post('/api/ndr/settings', requireAdmin, (req,res)=>{ const next=Object.assign(readNdrSettings(), req.body||{}, {updatedAt:nowIso()}); writeJson(ndrSettingsPath,next); res.json({ok:true, settings:next}); });\napp.post('/api/ndr/clean', requireAdmin, (req,res)=>{ const rows=cleanupNdrRows(readJson(ndrPath,[])); writeJson(ndrPath, rows); res.json({ok:true, message:'Old iCarry/duplicate NDR records cleaned.', count:rows.length, ndr:rows}); });\napp.post('/api/ndr/sync', requireAdmin, async (req,res)=>{\n  const live=await fetchShiprocketLiveNdr();\n  if(live.ok && live.rows.length){\n    const rows=cleanupNdrRows(live.rows.map(x=>Object.assign({},x,{lastSyncAt:nowIso()})));\n    writeJson(ndrPath, rows);\n    return res.json({ok:true, live:true, message:'Shiprocket live NDR sync completed.', endpoint:live.endpoint, count:rows.length, ndr:rows});\n  }\n  const rows=cleanupNdrRows(readJson(ndrPath,[]));\n  writeJson(ndrPath, rows);\n  res.json({ok:false, live:false, message:'No live NDR data found from Shiprocket. Saved Shiprocket-only rows kept.', error:live.error, details:live.details||[], count:rows.length, ndr:rows});\n});"""
if old in s:
    s=s.replace(old,new)
else:
    print('old NDR block not found')
# Replace connection status endpoint
start=s.find("app.get('/api/connection-status'")
if start!=-1:
    end=s.find("app.get('/api/storage/status'", start)
    block=s[start:end]
    newconn=r'''app.get('/api/connection-status', requireAdmin, async (req, res) => {
  const cfg = readEnvFile();
  const settings = readJson(settingsPath, {});
  const has = (...keys) => keys.some(k => String(cfg[k] || process.env[k] || settings[k] || '').trim() && String(cfg[k] || process.env[k] || settings[k] || '').trim() !== '********');
  const rows = [
    { key:'shopify', name:'Shopify API', connected: has('SHOPIFY_STORE_DOMAIN') && has('SHOPIFY_ADMIN_ACCESS_TOKEN'), details: has('SHOPIFY_STORE_DOMAIN') ? 'Store/token saved' : 'Store/token missing', logs:[] },
    { key:'whatsapp', name:'WhatsApp Cloud API', connected: has('WHATSAPP_CLOUD_TOKEN') && has('WHATSAPP_PHONE_NUMBER_ID'), details: has('WHATSAPP_PHONE_NUMBER_ID') ? 'Phone ID/token saved' : 'Phone ID/token missing', logs:[] },
    { key:'meta', name:'Meta Ads / Campaign Reporting', connected: has('META_ACCESS_TOKEN') && has('META_AD_ACCOUNT_ID'), details: has('META_AD_ACCOUNT_ID') ? 'Ad account saved' : 'Ad account/token missing', logs:[] },
    { key:'instagram', name:'Instagram Inbox', connected: has('META_ACCESS_TOKEN') && has('META_INSTAGRAM_ACCOUNT_ID'), details: has('META_INSTAGRAM_ACCOUNT_ID') ? 'Instagram business ID saved' : 'Instagram account/token missing', logs:[] },
    { key:'messenger', name:'Facebook Messenger', connected: has('META_ACCESS_TOKEN') && has('META_FACEBOOK_PAGE_ID'), details: has('META_FACEBOOK_PAGE_ID') ? 'Facebook Page ID saved' : 'Page ID/token missing', logs:[] },
    { key:'shiprocket', name:'Shiprocket', connected: has('SHIPROCKET_TOKEN') || (has('SHIPROCKET_EMAIL') && has('SHIPROCKET_PASSWORD')), details: has('SHIPROCKET_TOKEN') ? 'Token saved' : (has('SHIPROCKET_EMAIL') ? 'Login saved' : 'Credentials missing'), logs:[] },
    { key:'google', name:'Google Sheet', connected: has('GOOGLE_SHEETS_WEBHOOK_URL') || has('GOOGLE_SHEET_URL'), details: has('GOOGLE_SHEET_URL') ? 'Sheet link saved' : 'Sheet not configured', logs:[] },
    { key:'mongodb', name:'MongoDB Storage', connected: !!mongoReady, details: mongoReady ? `${mongoDbName}/${mongoCollectionName}` : (mongoUri ? 'Configured but not connected' : 'Not configured'), logs:[] }
  ];
  const live = String(req.query.live || '1') !== '0';
  async function mark(key, status, log){ const row=rows.find(x=>x.key===key); if(row){ row.status=status; row.connected=status==='connected'; row.logs.push(log); } }
  for(const row of rows){ row.status = row.connected ? 'connected' : 'not_connected'; if(!row.connected) row.logs.push(row.details || 'Required settings missing.'); }
  if(live){
    try{ const r=await shopifyFetch('shop.json'); await mark('shopify', r.ok?'connected':'error', r.ok?'Shopify shop API working.':`Shopify error ${r.status||''}: ${r.message||r.json?.errors||JSON.stringify(r.json||{}).slice(0,120)}`); }catch(e){ await mark('shopify','error','Shopify test failed: '+e.message); }
    try{ const env=readEnvFile(); const token=String(env.WHATSAPP_CLOUD_TOKEN||process.env.WHATSAPP_CLOUD_TOKEN||'').trim(); const pid=String(env.WHATSAPP_PHONE_NUMBER_ID||process.env.WHATSAPP_PHONE_NUMBER_ID||'').replace(/\D/g,''); if(token&&pid){ const r=await fetch(`https://graph.facebook.com/v20.0/${pid}?fields=display_phone_number,verified_name`,{headers:{Authorization:`Bearer ${token}`}}); const j=await r.json().catch(()=>({})); await mark('whatsapp', r.ok?'connected':'error', r.ok?'WhatsApp phone number API working.':`WhatsApp error ${r.status}: ${j.error?.message||JSON.stringify(j).slice(0,120)}`); } }catch(e){ await mark('whatsapp','error','WhatsApp test failed: '+e.message); }
    try{ const env=readEnvFile(); const token=String(env.META_ACCESS_TOKEN||process.env.META_ACCESS_TOKEN||'').trim(); const ad=String(env.META_AD_ACCOUNT_ID||process.env.META_AD_ACCOUNT_ID||'').trim(); if(token&&ad){ const acct=ad.startsWith('act_')?ad:'act_'+ad.replace(/^act_/,''); const r=await fetch(`https://graph.facebook.com/v20.0/${acct}?fields=name,account_status`,{headers:{Authorization:`Bearer ${token}`}}); const j=await r.json().catch(()=>({})); await mark('meta', r.ok?'connected':'error', r.ok?'Meta ad account API working.':`Meta Ads error ${r.status}: ${j.error?.message||JSON.stringify(j).slice(0,120)}`); } }catch(e){ await mark('meta','error','Meta Ads test failed: '+e.message); }
    try{ const liveNdr=await fetchShiprocketLiveNdr(); await mark('shiprocket', liveNdr.ok?'connected':'error', liveNdr.ok?`Shiprocket API working. Live NDR rows: ${liveNdr.count}`:`Shiprocket error: ${liveNdr.error}`); }catch(e){ await mark('shiprocket','error','Shiprocket test failed: '+e.message); }
  }
  const summary = rows.reduce((a,r)=>{ a.total++; a[r.status==='connected'?'connected':(r.status==='error'?'error':'notConnected')]++; return a; }, {total:0,connected:0,error:0,notConnected:0});
  res.json({ ok:true, checkedAt: nowIso(), summary, rows });
});

'''
    s=s[:start]+newconn+s[end:]
server.write_text(s)

# Patch api settings UI status
aj=apijs.read_text()
if 'api-status-summary' not in aj:
    old="""  grid.innerHTML=(d.rows||[]).map(x=>`<div class="connection-item ${x.connected?'ok':'not'}"><div><b>${esc(x.name)}</b><span>${esc(x.details||'')}</span></div><em>${x.connected?'Connected':'Not Connected'}</em></div>`).join('');\n  if($('connectionStatusTime')) connectionStatusTime.textContent='Last checked: '+(d.checkedAt||new Date().toISOString());"""
    new="""  const summary=d.summary||{};\n  const summaryHtml=`<div class="api-status-summary"><b>Total APIs: ${summary.total||0}</b><span class="ok-dot">Connected: ${summary.connected||0}</span><span class="warn-dot">Error: ${summary.error||0}</span><span class="bad-dot">Not Connected: ${summary.notConnected||0}</span></div>`;\n  grid.innerHTML=summaryHtml+(d.rows||[]).map(x=>{\n    const status=x.status || (x.connected?'connected':'not_connected');\n    const label=status==='connected'?'Connected':(status==='error'?'Connected but Error':'Not Connected');\n    const cls=status==='connected'?'ok':(status==='error'?'warn':'not');\n    const logs=(x.logs||[]).map(l=>`<li>${esc(l)}</li>`).join('');\n    return `<div class="connection-item ${cls}"><div><b><span class="status-light ${cls}"></span>${esc(x.name)}</b><span>${esc(x.details||'')}</span>${logs?`<ul class="api-log-list">${logs}</ul>`:''}</div><em>${label}</em></div>`;\n  }).join('');\n  if($('connectionStatusTime')) connectionStatusTime.textContent='Last checked: '+(d.checkedAt||new Date().toISOString());"""
    aj=aj.replace(old,new)
apijs.write_text(aj)

# Patch admin HTML for attachment buttons
h=adminhtml.read_text()
if 'whatsappMediaUpload' not in h:
    h=h.replace('<select id="whatsappReplyImage" title="Attach Image Optional"><option value="">No image / Text only</option></select>', '<select id="whatsappReplyImage" title="Saved Image Optional"><option value="">No image / Text only</option></select>')
    h=h.replace('<button id="enableDesktopNotifications2" type="button" class="ghost-btn compact-btn"><span id="notificationStatusDot" class="notify-dot unknown" title="Notification status"></span> Enable Notifications</button>', '<button id="pickWhatsappEmoji" type="button" class="ghost-btn compact-btn" title="Add emoji">😊 Emoji</button>\n              <button id="pickWhatsappImage" type="button" class="ghost-btn compact-btn" title="Add image">🖼 Image</button>\n              <button id="pickWhatsappDocument" type="button" class="ghost-btn compact-btn" title="Add document">📎 Document</button>\n              <input id="whatsappImageFile" type="file" accept="image/*" hidden/>\n              <input id="whatsappDocumentFile" type="file" accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,application/pdf,text/plain" hidden/>\n              <span id="whatsappAttachmentLabel" class="attachment-label"></span>\n              <button id="enableDesktopNotifications2" type="button" class="ghost-btn compact-btn"><span id="notificationStatusDot" class="notify-dot unknown" title="Notification status"></span> Enable Notifications</button>')
    # ndr clean button in ndr controls
    h=h.replace('<button id="syncNdr" class="primary-btn" type="button">Sync Shiprocket</button><button id="exportNdrCsv"', '<button id="syncNdr" class="primary-btn" type="button">Sync Shiprocket Live NDR</button><button id="cleanNdr" class="ghost-btn" type="button">Clean Old NDR</button><button id="exportNdrCsv"')
adminhtml.write_text(h)

# Patch admin JS for attachments and clean NDR
j=adminjs.read_text()
if 'selectedWhatsappAttachment' not in j:
    j=j.replace("let messengerMessages = [];", "let messengerMessages = [];\nlet selectedWhatsappAttachment = null;\nconst quickEmojis = ['😊','🙏','👍','🎁','✨','✅','🚚','📦','💖','🙂'];")
    inject=r'''
function fileToDataUrl(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(r.error||new Error('File read failed')); r.readAsDataURL(file); }); }
function setAttachmentLabel(){ const el=$('whatsappAttachmentLabel'); if(el) el.textContent=selectedWhatsappAttachment ? ('Attached: '+(selectedWhatsappAttachment.originalName||selectedWhatsappAttachment.filename||selectedWhatsappAttachment.type)) : ''; }
async function uploadWhatsappMediaFile(file, type){
  if(!file) return;
  const dataUrl=await fileToDataUrl(file);
  const d=await fetch('/api/whatsapp-inbox/upload-media',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataUrl,filename:file.name,type})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if(!d.ok){ alert(d.error||'Upload failed'); return; }
  selectedWhatsappAttachment=Object.assign({},d.file,{absoluteUrl:d.url,type});
  setAttachmentLabel();
}
function addEmojiToReply(){
  const txt=$('whatsappReplyText'); if(!txt) return;
  const emoji=quickEmojis[(Number(localStorage.getItem('tsgEmojiIdx')||0))%quickEmojis.length];
  localStorage.setItem('tsgEmojiIdx', String((Number(localStorage.getItem('tsgEmojiIdx')||0)+1)%quickEmojis.length));
  const start=txt.selectionStart||txt.value.length, end=txt.selectionEnd||txt.value.length;
  txt.value=txt.value.slice(0,start)+emoji+txt.value.slice(end);
  txt.focus(); txt.selectionStart=txt.selectionEnd=start+emoji.length;
}
'''
    j=j.replace("function renderChannelTabs(){", inject+"\nfunction renderChannelTabs(){")
# Replace sendWhatsappInboxReply second override block
old_start=j.rfind("async function sendWhatsappInboxReply(){")
old_end=j.find("document.addEventListener('click', e=>{\n  const ct=e.target.closest('.channel-tab');", old_start)
if old_start!=-1 and old_end!=-1:
    new_send=r'''async function sendWhatsappInboxReply(){
  const selected=String(selectedWhatsappInboxId||'');
  const rawPhone=($('whatsappReplyPhone')?.value||'').trim();
  const message=($('whatsappReplyText')?.value||'').trim();
  const imageId=$('whatsappReplyImage')?.value||'';
  if(!selected && !rawPhone) return alert('Please select a chat or enter reply ID.');
  if(!message && !imageId && !selectedWhatsappAttachment) return alert('Write message or select image/document.');
  let endpoint='/api/whatsapp-inbox/reply', body={phone:rawPhone||selected,message,imageIds:imageId?[imageId]:[]};
  if(selectedWhatsappAttachment){
    if(String(selectedWhatsappAttachment.mime||'').startsWith('image/')) body.imageUrl=selectedWhatsappAttachment.absoluteUrl || selectedWhatsappAttachment.url;
    else { body.documentUrl=selectedWhatsappAttachment.absoluteUrl || selectedWhatsappAttachment.url; body.documentName=selectedWhatsappAttachment.originalName || selectedWhatsappAttachment.filename || 'document'; }
  }
  if(selected.startsWith('instagram:')){ endpoint='/api/instagram/reply'; body={to:selected.replace('instagram:',''),message}; }
  if(selected.startsWith('messenger:')){ endpoint='/api/messenger/reply'; body={to:selected.replace('messenger:',''),message}; }
  const d=await fetch(endpoint,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('whatsappInboxResult')) whatsappInboxResult.textContent=JSON.stringify(d,null,2);
  if(d.ok){ if($('whatsappReplyText')) whatsappReplyText.value=''; selectedWhatsappAttachment=null; setAttachmentLabel(); }
  await loadWhatsappInbox();
}
'''
    j=j[:old_start]+new_send+j[old_end:]
# Add event listeners in existing document click
if "pickWhatsappImage" not in j[j.find("document.addEventListener('click', e=>{\n  const ct=e.target.closest('.channel-tab');"):j.find("document.addEventListener('click', e=>{\n  const ct=e.target.closest('.channel-tab');")+600]:
    j=j.replace("  if(e.target.id==='enableDesktopNotifications2' || e.target.id==='enableDesktopNotifications') requestDesktopNotifications();\n});", "  if(e.target.id==='enableDesktopNotifications2' || e.target.id==='enableDesktopNotifications') requestDesktopNotifications();\n  if(e.target.id==='pickWhatsappEmoji') addEmojiToReply();\n  if(e.target.id==='pickWhatsappImage') $('whatsappImageFile')?.click();\n  if(e.target.id==='pickWhatsappDocument') $('whatsappDocumentFile')?.click();\n});")
if "whatsappImageFile" not in j[j.find("document.addEventListener('change', e=>{"):j.find("document.addEventListener('change', e=>{")+1200]:
    # append a separate change listener
    j += "\ndocument.addEventListener('change', e=>{ if(e.target.id==='whatsappImageFile' && e.target.files?.[0]) uploadWhatsappMediaFile(e.target.files[0],'image'); if(e.target.id==='whatsappDocumentFile' && e.target.files?.[0]) uploadWhatsappMediaFile(e.target.files[0],'document'); });\n"
# NDR clean function + event
if 'async function cleanNdr' not in j:
    j=j.replace("async function syncNdr(){", "async function cleanNdr(){ const d=await fetch('/api/ndr/clean',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message})); if($('ndrResult')) ndrResult.textContent=JSON.stringify(d,null,2); await loadNdr(); }\nasync function syncNdr(){")
    j=j.replace("if(e.target.id==='syncNdr') syncNdr();", "if(e.target.id==='syncNdr') syncNdr(); if(e.target.id==='cleanNdr') cleanNdr();")
adminjs.write_text(j)

# CSS final overrides
c=css.read_text()
append=r'''

/* ---------- Final patch: API live status logs, balanced Chat Inbox height, attachments ---------- */
.api-status-summary{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:10px;align-items:center;border:1px solid #f0cddd;border-radius:16px;background:#fff7fb;padding:12px 14px;font-weight:900}.api-status-summary span{border-radius:999px;padding:5px 9px;font-size:12px}.ok-dot{background:#dcfce7;color:#166534}.warn-dot{background:#fef3c7;color:#92400e}.bad-dot{background:#fee2e2;color:#991b1b}.connection-item.warn{border-color:#fcd34d}.connection-item.warn em{background:#fef3c7;color:#92400e}.status-light{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;vertical-align:middle}.status-light.ok{background:#16a34a;box-shadow:0 0 0 4px #dcfce7}.status-light.not{background:#ef4444;box-shadow:0 0 0 4px #fee2e2}.status-light.warn{background:#f59e0b;box-shadow:0 0 0 4px #fef3c7}.api-log-list{margin:8px 0 0 18px;padding:0;color:#6b5261;font-size:11px;line-height:1.35}.api-log-list li{margin:2px 0}.team-inbox-shell{height:calc(100vh - 120px)!important;min-height:820px!important;overflow:visible!important}.wati-center{grid-template-rows:minmax(0,1fr) auto!important;min-height:0!important}.wati-chat-window{height:100%!important;min-height:0!important;overflow:hidden!important}.wati-message-area{min-height:260px!important;max-height:calc(100vh - 430px)!important;height:auto!important;overflow-y:auto!important;padding-bottom:18px!important}.wati-reply-dock{min-height:150px!important;max-height:none!important;overflow:visible!important;padding:10px 14px 16px!important}.reply-compose-row textarea,#whatsappReplyText{height:76px!important;min-height:76px!important;max-height:120px!important}.reply-bottom-actions{flex-wrap:wrap!important;align-items:center!important;overflow:visible!important;padding-bottom:2px!important}.attachment-label{font-size:11px;font-weight:800;color:#8a6078;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.reply-bottom-actions .ghost-btn.compact-btn{height:30px!important;padding:6px 9px!important}.wa-contact-panel{padding-bottom:24px!important}.wati-right{overflow-y:auto!important}.ndr-table .link-btn{border:0;background:transparent;color:#d63384;font-weight:900;text-decoration:underline;cursor:pointer}.empty-ndr-state{text-align:center;padding:28px;color:#6f5263}.modal-overlay{position:fixed;inset:0;background:rgba(20,10,20,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px}.modal-overlay.hidden{display:none}.ndr-tracking-modal{max-width:720px;width:min(94vw,720px);max-height:86vh;overflow:auto}.tracking-grid{display:grid;grid-template-columns:150px 1fr;gap:8px 12px;margin:12px 0}.tracking-grid span{color:#7c6475}.tracking-grid b{font-weight:900}
@media(max-width:1280px){.team-inbox-shell{height:auto!important;min-height:820px!important}.wati-message-area{max-height:420px!important}}
'''
if 'API live status logs' not in c:
    c += append
css.write_text(c)
