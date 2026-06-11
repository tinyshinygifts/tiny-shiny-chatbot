let faqs = [];
let mediaImages = [];
let selectedMediaId = '';
let selectedMediaIds = [];
let crmCustomers = [];
let leadItems = [];
let eventItems = [];
let crmContactFilter = 'with';
let leadContactFilter = 'with';
let activityContactFilter = 'with';
let deferredInstallPrompt = null;
let shopifyCustomers = [];
let shopifyProducts = [];
let broadcastContacts = [];
let broadcastCampaigns = [];
let broadcastTemplates = [];
let waBotSettings = {};
let chatbotFlows = [];
let activeFlowId = '';
let teamInboxMeta = {};
let shippingSettings = {};
let phase2Analytics = {};
let phase2Segments = [];
let dripCampaigns = [];
let quickReplySettings = {};
let instagramMessages = [];
let instagramSettings = {};
let whatsappInboxMessages = [];
let selectedWhatsappInboxId = "";
let selectedPromoProductId = '';
let googleSheetUrl = '';
let shopifySalesAnalysis = null;
let adminAutoRefreshTimer = null;
let adminAutoRefreshBusy = false;
let whatsappInboxInitialized = false;
let knownInboundUnreadIds = new Set();
let lastNotificationAt = 0;
const colorOptions = ['#d63384','#9b35ff','#0ea5e9','#16a34a','#f97316','#111827'];
const colorNames = {'#d63384':'Tiny Shiny Pink','#9b35ff':'Premium Purple','#0ea5e9':'Sky Blue','#16a34a':'Fresh Green','#f97316':'Festive Orange','#111827':'Luxury Black'};

let __tsgLoaderCount = 0;
function ensureGlobalLoader(){
  let el=document.getElementById('tsgGlobalLoader');
  if(el) return el;
  el=document.createElement('div');
  el.id='tsgGlobalLoader';
  el.className='tsg-global-loader hidden';
  el.innerHTML='<div class="tsg-loader-card"><img src="/tiny-shiny-logo.jpg" alt="Tiny Shiny"/><b>Loading data...</b></div>';
  document.body.appendChild(el);
  return el;
}
function showGlobalLoader(text='Loading data...'){
  const el=ensureGlobalLoader();
  const b=el.querySelector('b'); if(b) b.textContent=text;
  __tsgLoaderCount++;
  el.classList.remove('hidden');
}
function hideGlobalLoader(){
  __tsgLoaderCount=Math.max(0,__tsgLoaderCount-1);
  if(__tsgLoaderCount===0){ const el=document.getElementById('tsgGlobalLoader'); if(el) el.classList.add('hidden'); }
}
(function patchFetchLoader(){
  if(window.__tsgFetchLoaderPatched) return; window.__tsgFetchLoaderPatched=true;
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input, init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const shouldShow=/\/api\//.test(url) && !/app-version/.test(url);
    if(shouldShow) showGlobalLoader('Loading data...');
    try{ return await originalFetch(input, init); }
    finally{ if(shouldShow) hideGlobalLoader(); }
  };
})();

function $(id){ return document.getElementById(id); }
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function digitsOnly(v){ return String(v||'').replace(/[^0-9]/g,''); }
function last10(v){ const d=digitsOnly(v); return d.length>=10 ? d.slice(-10) : ''; }
function formatWaPhone(v){ const l=last10(v); return l ? '91'+l : ''; }
function normalizeColor(value){ const v=String(value||'').trim().toLowerCase(); return /^#[0-9a-f]{6}$/.test(v)?v:'#d63384'; }
function tint(hex, amount){ hex=normalizeColor(hex).slice(1); const n=parseInt(hex,16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; if(amount>=0){r+=(255-r)*amount;g+=(255-g)*amount;b+=(255-b)*amount}else{r*=(1+amount);g*=(1+amount);b*=(1+amount)} return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join(''); }
function applyThemeColor(value){ const color=normalizeColor(value); document.documentElement.style.setProperty('--pink', color); document.documentElement.style.setProperty('--pink2', tint(color,.28)); document.documentElement.style.setProperty('--purple', tint(color,-.12)); document.documentElement.style.setProperty('--line', tint(color,.76)); localStorage.setItem('tsgAdminThemeColor', color); }
function setThemeColor(value){ applyThemeColor(value); }
async function logout(){ try{ await fetch('/api/admin/logout',{method:'POST',credentials:'include',cache:'no-store'}); }catch(e){} window.location.replace('/login.html?logout=1&t='+Date.now()); }
function showTab(id){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active', p.id===id));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  localStorage.setItem('tsgAdminActiveTab', id);
  if(id === 'shopifySalesPanel' && typeof loadShopifySalesAnalysis === 'function') setTimeout(()=>loadShopifySalesAnalysis().catch(()=>{}),0);
  if(id === 'ndrPanel' && typeof loadNdr === 'function') setTimeout(()=>loadNdr().catch(()=>{}),0);
}

function activeTabId(){ return localStorage.getItem('tsgAdminActiveTab') || 'whatsappInboxPanel'; }
function initAutoRefreshControls(){
  const sel = $('autoRefreshInterval');
  if(!sel) return;
  const saved = localStorage.getItem('tsgAdminAutoRefreshSec') || '30';
  sel.value = ['0','10','20','30','60','120','600'].includes(saved) ? saved : '30';
  sel.onchange = () => { localStorage.setItem('tsgAdminAutoRefreshSec', sel.value); scheduleAdminAutoRefresh(); };
  scheduleAdminAutoRefresh();
}
function scheduleAdminAutoRefresh(){
  if(adminAutoRefreshTimer) clearInterval(adminAutoRefreshTimer);
  adminAutoRefreshTimer = null;
  const sec = Number($('autoRefreshInterval')?.value || localStorage.getItem('tsgAdminAutoRefreshSec') || 30);
  if(!sec) return;
  adminAutoRefreshTimer = setInterval(refreshAdminDataAuto, sec * 1000);
}
async function refreshAdminDataAuto(){
  if(adminAutoRefreshBusy) return;
  adminAutoRefreshBusy = true;
  try{
    const active = activeTabId();
    await loadWhatsappInbox(true);
    await loadLeads().catch(()=>{});
    await loadEvents().catch(()=>{});
    await loadMessages().catch(()=>{});
    if(active === 'crmPanel') await loadCrm().catch(()=>{});
    if(active === 'shopifyCustomersPanel') await loadShopifyCustomers().catch(()=>{});
    if(active === 'shopifySalesPanel') await loadShopifySalesAnalysis().catch(()=>{});
    if(active === 'phase2Panel') await loadPhase2Analytics().catch(()=>{});
    if(active === 'shopifySalesPanel') await loadShopifySalesAnalysis().catch(()=>{});
    if(active === 'instagramInboxPanel') await loadInstagram().catch(()=>{});
    if(active === 'imagePanel') await loadMediaCustomers().catch(()=>{});
  } finally { adminAutoRefreshBusy = false; }
}
function initDesktopNotificationButton(){
  const btn = $('enableDesktopNotifications');
  if(!btn) return;
  const update = () => {
    if(!('Notification' in window)) btn.textContent = 'Notifications Not Supported';
    else if(Notification.permission === 'granted') btn.textContent = 'Notifications ON';
    else btn.textContent = 'Enable Notifications';
  };
  btn.onclick = async () => {
    if(!('Notification' in window)) return alert('Desktop notifications are not supported in this browser.');
    const perm = await Notification.requestPermission();
    update();
    if(perm === 'granted') showAdminToast({ title:'Desktop notifications enabled', body:'New WhatsApp message par popup aayega.' });
  };
  update();
}
function showAdminToast({title='New WhatsApp Message', body='', phone='', onOpenPhone=''}){
  const t=$('adminNotificationToast');
  if(!t) return;
  t.className='admin-toast';
  t.innerHTML=`<div><b>${esc(title)}</b><span>${esc(body)}</span>${phone?`<small>${esc(phone)}</small>`:''}</div><div class="toast-actions"><button type="button" data-toast-open="${esc(onOpenPhone||phone)}">Open Chat</button><button type="button" data-toast-close="1">Close</button></div>`;
  setTimeout(()=>{ if(t) t.classList.add('hidden'); }, 12000);
}
function playNotifySound(){
  try{
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if(!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type='sine'; osc.frequency.value=880; gain.gain.value=0.06;
    osc.connect(gain); gain.connect(ctx.destination); osc.start();
    setTimeout(()=>{ osc.stop(); ctx.close(); }, 180);
  }catch(e){}
}
function notifyNewWhatsappMessage(m){
  const now=Date.now();
  if(now-lastNotificationAt<1000) return;
  lastNotificationAt=now;
  const phone=inboxPhone(m);
  const body=messageText(m) || 'New customer message';
  const name=m.customerName||m.profileName||phone||'Customer';
  showAdminToast({ title:'New Customer Message', body:`${name}: ${body}`, phone, onOpenPhone:phone });
  playNotifySound();
  if('Notification' in window && Notification.permission==='granted'){
    const n = new Notification('New Customer Message', { body:`${name} (${phone}): ${body}`.slice(0,220), icon:'/tiny-shiny-logo.jpg', tag:'wa-'+phone, renotify:true, requireInteraction:true });
    n.onclick = () => { window.focus(); selectedWhatsappInboxId=phone; showTab('whatsappInboxPanel'); renderWhatsappInbox(); n.close(); };
  }
}

function updateNotificationStatusDot(){
  const btn=$('enableDesktopNotifications') || $('enableNotificationsBtn') || $('enableDesktopNotifications2');
  const dot=$('notificationStatusDot');
  if(!('Notification' in window)){
    if(btn) btn.innerHTML='<span class="notify-dot blocked"></span> Notifications Not Supported';
    return;
  }
  const p=Notification.permission;
  const cls=p==='granted'?'enabled':(p==='denied'?'blocked':'unknown');
  const text=p==='granted'?'Notifications ON':(p==='denied'?'Notifications Blocked':'Enable Notifications');
  if(dot){ dot.classList.remove('enabled','blocked','unknown','pending'); dot.classList.add(cls); dot.title='Notifications: '+text; }
  if(btn){
    let d=btn.querySelector('.notify-dot') || dot;
    btn.innerHTML=`<span id="notificationStatusDot" class="notify-dot ${cls}" title="Notifications: ${text}"></span> ${text}`;
  }
}


async function enableDesktopNotifications(){
  if(!('Notification' in window)){ alert('Is browser me desktop notifications support nahi hai.'); return; }
  try{
    const permission = await Notification.requestPermission();
    updateNotificationStatusDot();
    if(permission==='granted'){
      const n = new Notification('Tiny Shiny notifications enabled', {body:'New WhatsApp message par desktop popup aayega.', icon:'/tiny-shiny-logo.jpg', tag:'tsg-test'});
      n.onclick=()=>{ window.focus(); n.close(); };
    } else if(permission==='denied'){
      alert('Notifications blocked hain. Browser address bar ke lock icon / Site settings me jaakar Notifications Allow karo.');
    }
  }catch(e){ alert('Notification permission error: '+e.message); }
}

function checkNewInboundNotifications(messages=[]){
  const inbound = messages.filter(m=>m.direction==='inbound' && (m.status==='unread' || !m.status));
  if(!whatsappInboxInitialized){
    knownInboundUnreadIds = new Set(inbound.map(m=>String(m.id || m.raw?.id || m.createdAt || inboxPhone(m)+messageText(m))));
    whatsappInboxInitialized = true;
    return;
  }
  for(const m of inbound){
    const id=String(m.id || m.raw?.id || m.createdAt || inboxPhone(m)+messageText(m));
    if(!knownInboundUnreadIds.has(id)){
      knownInboundUnreadIds.add(id);
      notifyNewWhatsappMessage(m);
    }
  }
}

async function load(){
  setThemeColor(localStorage.getItem('tsgAdminThemeColor') || '#d63384');
  initAutoRefreshControls();
  initDesktopNotificationButton(); updateNotificationStatusDot();
  const [s,f,cfg] = await Promise.all([
    fetch('/api/settings',{credentials:'include',cache:'no-store'}).then(r=>r.json()),
    fetch('/api/faqs',{credentials:'include'}).then(r=>r.json()),
    fetch('/api/config',{credentials:'include'}).then(r=>r.json()).catch(()=>({config:{}}))
  ]);
  const settings=s.settings||{}; applyThemeColor(settings.themeColor || localStorage.getItem('tsgAdminThemeColor') || '#d63384');
  ['welcomeMessage','fallbackMessage','leadOfferMessage','cartOfferMessage','leadPopupDelaySeconds'].forEach(id=>{ if($(id)) $(id).value=settings[id]||''; });
  googleSheetUrl = (cfg.config && (cfg.config.GOOGLE_SHEET_URL || cfg.config.GOOGLE_SHEET_URL_SET || '')) || settings.googleSheetUrl || '';
  if(googleSheetUrl === '********') googleSheetUrl = '';
  updateGoogleSheetTab();
  faqs=f.faqs||[]; renderFaqs();
  await Promise.all([loadCrm(), loadMedia(), loadLeads(), loadEvents(), loadMessages(), loadShopifyCustomers().catch(()=>{}), loadShopifySalesAnalysis().catch(()=>{}), loadWhatsappInbox(), loadBroadcasts().catch(()=>{}), loadWhatsappChatbotSettings().catch(()=>{}), loadChatbotFlows().catch(()=>{}), loadShippingSettings().catch(()=>{}), loadTeamInboxMeta().catch(()=>{}), loadPhase2Analytics().catch(()=>{}), loadDrips().catch(()=>{}), loadInstagram().catch(()=>{})]);
  const active = localStorage.getItem('tsgAdminActiveTab') || 'whatsappInboxPanel';
  showTab($(active) ? active : 'whatsappInboxPanel');
}
function updateGoogleSheetTab(){
  const link = $('googleSheetOpenLink'); const help=$('googleSheetHelp');
  if(!link) return;
  if(googleSheetUrl){ link.href=googleSheetUrl; link.style.display='inline-flex'; if(help) help.textContent='Click the button below to open your connected Google Sheet.'; }
  else { link.href='#'; link.style.display='none'; if(help) help.textContent='Google Sheet link not configured. Please add it in API Settings.'; }
}
function renderFaqs(){ if(!$('faqList')) return; faqList.innerHTML=''; faqs.forEach((faq,index)=>{ const row=document.createElement('div'); row.className='faq-row'; row.innerHTML=`<label>Keywords <input data-i="${index}" data-field="keywords" value="${esc((faq.keywords||[]).join(', '))}"/></label><label>Answer <textarea data-i="${index}" data-field="answer">${esc(faq.answer||'')}</textarea></label><button data-remove="${index}" class="ghost-btn danger-outline">Remove</button>`; faqList.appendChild(row); }); }
function hasContactNumber(obj){ return !!last10(obj?.phone || obj?.customerPhone || obj?.whatsapp || obj?.to || obj?.from || obj?.raw?.recipient_id || ''); }
function contactFiltered(list, mode){ return (list||[]).filter(item => mode === 'without' ? !hasContactNumber(item) : hasContactNumber(item)); }
function renderLeadTabs(){ document.querySelectorAll('[data-target="lead"]').forEach(b=>b.classList.toggle('active', b.dataset.contactFilter === leadContactFilter)); }
function renderActivityTabs(){ document.querySelectorAll('[data-target="activity"]').forEach(b=>b.classList.toggle('active', b.dataset.contactFilter === activityContactFilter)); }
function renderCrmTabs(){ document.querySelectorAll('[data-target="crm"]').forEach(b=>b.classList.toggle('active', b.dataset.contactFilter === crmContactFilter)); }
function renderLeads(){ renderLeadTabs(); const rows=contactFiltered(leadItems, leadContactFilter); if($('leadCount')) leadCount.textContent=(leadItems||[]).length; if($('leadList')) leadList.innerHTML=rows.slice(0,120).map(l=>`<div class="log-row contact-${hasContactNumber(l)?'with':'without'}"><b>${esc(l.type)}</b> <small>${esc(l.createdAt)}</small><br/>Phone: ${esc(l.phone||'No phone')} | Order: ${esc(l.orderId||l.orderName)}<br/>Product: ${esc(l.productTitle||l.product||l?.product?.title)}<br/>Image: ${esc(l.productImage||l.image||l?.product?.image)}<br/>Page: ${esc(l.pageUrl||l?.product?.url)}<br/>Message: ${esc(l.message||l.note)}</div>`).join('') || `<p>No ${leadContactFilter==='with'?'contact-number':'without-contact'} leads yet.</p>`; }
async function loadLeads(){ const d=await fetch('/api/leads',{credentials:'include'}).then(r=>r.json()).catch(()=>({leads:[]})); leadItems=d.leads||[]; renderLeads(); }
function renderEvents(){ renderActivityTabs(); const rows=contactFiltered(eventItems, activityContactFilter); if($('eventCount')) eventCount.textContent=(eventItems||[]).length; if($('eventList')) eventList.innerHTML=rows.slice(0,140).map(e=>`<div class="log-row contact-${hasContactNumber(e)?'with':'without'}"><b>${esc(e.eventType)}</b> <small>${esc(e.createdAt)}</small><br/>Phone: ${esc(e.phone||e.customerPhone||'No phone')}<br/>Product: ${esc(e.productTitle)}<br/>Price: ${esc(e.productPrice)} | Discount: ${esc(e.discountText)}<br/>Image: ${esc(e.productImage)}<br/>Page: ${esc(e.pageUrl)}</div>`).join('') || `<p>No ${activityContactFilter==='with'?'contact-number':'without-contact'} activity yet.</p>`; }
async function loadEvents(){ const d=await fetch('/api/visitor-events',{credentials:'include'}).then(r=>r.json()).catch(()=>({events:[]})); eventItems=d.events||[]; renderEvents(); }
async function loadMessages(){ const d=await fetch('/api/lead-messages',{credentials:'include'}).then(r=>r.json()).catch(()=>({messages:[]})); if($('messageCount')) messageCount.textContent=(d.messages||[]).length; if($('messageList')) messageList.innerHTML=(d.messages||[]).slice(0,80).map(m=>`<div class="log-row"><b>${esc(m.type)}</b> <small>${esc(m.createdAt)}</small><br/><pre>${esc(m.message)}</pre></div>`).join('') || 'No messages yet.'; }
function inboxValue(m){ return [m.customerName,m.from,m.to,m.text,m.type,m.status,m.statusType,m.createdAt].join(' ').toLowerCase(); }
function shopifyHasPhone(phone){ const l=last10(phone); return !!l && (shopifyCustomers||[]).some(c=>last10(c.phone)===l); }
function shopifyCustomerByPhone(phone){ const l=last10(phone); return l ? (shopifyCustomers||[]).find(c=>last10(c.phone)===l) : null; }
function shopifyCustomerToInboxGroup(c){
  const phone=formatWaPhone(c.phone||c.default_address?.phone||'');
  return {phone,customerName:c.name||[c.first_name,c.last_name].filter(Boolean).join(' ')||'Shopify Customer',lastAt:c.lastOrderDate||c.updated_at||'',unread:0,messages:[],shopifyOnly:true,shopifyCustomer:c};
}
function inboxPhone(m){ return formatWaPhone(m.from||m.to||m.phone||m.raw?.recipient_id||''); }
function groupInboxMessages(messages){
  const map=new Map();
  for(const m of messages||[]){
    const phone=inboxPhone(m); if(!phone) continue;
    if(!map.has(phone)) map.set(phone,{phone,customerName:'',lastAt:'',unread:0,messages:[]});
    const g=map.get(phone);
    if(m.customerName&&!g.customerName) g.customerName=m.customerName;
    if(m.direction==='inbound'&&m.status==='unread') g.unread++;
    g.messages.push(m);
    if(!g.lastAt||new Date(m.createdAt||0)>new Date(g.lastAt||0)) g.lastAt=m.createdAt||'';
  }
  return [...map.values()].map(g=>({...g,messages:g.messages.sort((a,b)=>new Date(a.createdAt||0)-new Date(b.createdAt||0))})).sort((a,b)=>new Date(b.lastAt||0)-new Date(a.lastAt||0));
}
function renderWhatsappReplyImages(){
  const sel=$('whatsappReplyImage'); if(!sel) return;
  const current=sel.value;
  sel.innerHTML='<option value="">No image / Text only</option>' + (mediaImages||[]).map(img=>`<option value="${esc(img.id)}">${esc(img.title||img.filename||img.category||'Image')}</option>`).join('');
  if(current && [...sel.options].some(o=>o.value===current)) sel.value=current;
}
function messageText(m={}){
  const rawMsg = m.raw?.message || m.raw?.messages?.[0] || m.message || {};
  const direct = m.text || m.caption || m.body || m.messageText || m.content || '';
  const nested = rawMsg.text?.body || rawMsg.button?.text || rawMsg.button?.payload || rawMsg.image?.caption || rawMsg.document?.caption || rawMsg.document?.filename || rawMsg.video?.caption || rawMsg.interactive?.button_reply?.title || rawMsg.interactive?.list_reply?.title || '';
  if(direct || nested) return direct || nested;
  if(m.media?.type) return '[' + String(m.media.type).toUpperCase() + ' received]';
  if(rawMsg.type) return '[' + String(rawMsg.type).toUpperCase() + ' received]';
  if(m.direction==='status') return '';
  return m.statusType || m.status || '';
}
function chatNameForGroup(g){
  const named=(g.messages||[]).map(m=>m.customerName||m.profileName||m.name||'').find(Boolean);
  return named || g.customerName || g.phone || 'WhatsApp Customer';
}
function statusLabel(m){
  const st=m.status || m.statusType || '';
  const dir=m.direction || '';
  if(dir==='status') return st ? `Status: ${st}` : 'Status';
  if(dir==='outbound') return st ? `You • ${st}` : 'You';
  return st ? `Customer • ${st}` : 'Customer';
}
function initials(name, phone){
  const n=String(name||'').trim();
  if(n && !/^91\d+/.test(n)) return n.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  return String(phone||'WA').slice(-2);
}
function timeShort(v){
  if(!v) return '';
  const d=new Date(v); if(isNaN(d)) return String(v).slice(0,16);
  return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
}
function dateLabel(v){
  if(!v) return '';
  const d=new Date(v); if(isNaN(d)) return String(v).slice(0,10);
  const today=new Date();
  const yday=new Date(); yday.setDate(today.getDate()-1);
  if(d.toDateString()===today.toDateString()) return 'Today';
  if(d.toDateString()===yday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}
function renderChatList(groups){
  const list=$('whatsappChatList') || $('whatsappInboxList');
  if(!list) return;
  list.innerHTML=groups.map(g=>{
    const selected=String(selectedWhatsappInboxId)===String(g.phone);
    const name=chatNameForGroup(g);
    const last=g.messages[g.messages.length-1]||{};
    const preview=g.shopifyOnly ? 'Shopify customer - no WhatsApp chat yet' : (messageText(last) || last.status || '');
    const known=shopifyHasPhone(g.phone) || !!g.shopifyOnly;
    return `<button type="button" class="wa-chat-item ${selected?'active':''} ${g.unread?'unread':''} ${g.shopifyOnly?'shopify-only':''}" data-inbox-phone="${esc(g.phone)}">
      <span class="wa-avatar">${esc(initials(name,g.phone))}</span>
      <span class="wa-chat-meta">
        <span class="wa-chat-title"><b>${esc(name)}</b>${g.unread?`<em>${g.unread}</em>`:''}</span>
        <span class="wa-chat-preview">${esc(preview || 'No message')}</span>
        <span class="wa-chat-sub">${esc(g.phone)} • ${known?'Shopify':'Not in Shopify'}</span>
      </span>
      <span class="wa-chat-time">${esc(g.shopifyOnly ? 'Shopify' : timeShort(last.createdAt||g.lastAt))}</span>
    </button>`;
  }).join('') || '<div class="wa-empty-list">No WhatsApp replies yet.</div>';
}
function renderActiveChat(group){
  const pane=$('whatsappActiveChat');
  if(!pane) return;
  if(!group){ pane.className='wa-active-chat empty-state'; pane.innerHTML='Select a customer chat from the left side.'; const action=$('whatsappShopifyAction'); if(action) action.innerHTML=''; return; }
  const linkedCustomer=shopifyCustomerByPhone(group.phone) || group.shopifyCustomer || null;
  const meta=teamInboxMeta[group.phone] || group.meta || {status:'open',agent:'',tags:[],note:''};
  const known=!!linkedCustomer || shopifyHasPhone(group.phone);
  const name=linkedCustomer?.name || chatNameForGroup(group);
  const messages=group.messages||[];
  let lastDate='';
  const bubbles=messages.map(m=>{
    const dlab=dateLabel(m.createdAt);
    const dateSep=dlab && dlab!==lastDate ? (lastDate=dlab, `<div class="wa-date-sep">${esc(dlab)}</div>`) : '';
    let dir=m.direction==='inbound'?'inbound':(m.direction==='outbound'?'outbound':'status');
    const txt=messageText(m);
    const extra=m.imageUrl||m.image||m.productImage||'';
    const hasCustomerText = !!String(txt||'').trim();
    const st = String(m.status||m.statusType||'').toLowerCase();
    // Some saved messages come with only status/direction mismatch. Treat rows with text as real chat bubbles.
    if(dir==='status' && hasCustomerText && !['sent','delivered','read','failed','queued'].includes(st)) dir='inbound';
    if(dir==='status'){
      const label = statusLabel(m).replace(/^Status:\s*/,'') || 'status';
      return `${dateSep}<div class="wa-status-line">${esc(label)} • ${esc(timeShort(m.createdAt))}</div>`;
    }
    return `${dateSep}<div class="wa-bubble ${dir}">
      ${extra?`<img src="${esc(extra)}" alt="" class="wa-bubble-img"/>`:''}
      <div class="wa-message-text">${esc(txt || '[Message]')}</div>
      <small>${esc(dir==='outbound' ? (m.status||'sent') : 'customer')} • ${esc(timeShort(m.createdAt))}</small>
    </div>`;
  }).join('');
  pane.className='wa-active-chat';
  pane.innerHTML=`<div class="wa-chat-header">
    <div class="wa-avatar big">${esc(initials(name,group.phone))}</div>
    <div class="wa-header-info"><b>${esc(name)}</b><span>${esc(group.phone)} <em class="wa-shopify-badge ${known?'ok':'missing'}">${known?'Shopify Customer':'Not in Shopify'}</em> <em class="wa-thread-badge">${esc(meta.status||'open')}</em>${meta.agent?` <em class="wa-agent-badge">${esc(meta.agent)}</em>`:''}</span></div>
    <div class="wa-header-actions">
      ${known?'':`<button class="primary-btn" type="button" data-add-shopify-phone="${esc(group.phone)}" data-add-shopify-name="${esc(name)}">Add to Shopify Customer</button>`}
      <button class="ghost-btn" type="button" data-mark-thread-read="${esc(group.phone)}">Mark Read</button>
    </div>
  </div>
  <div class="wa-message-area">${bubbles || `<div class="wa-date-sep">No WhatsApp messages yet</div>${linkedCustomer?`<div class="wa-customer-info-card"><b>Shopify Customer Data</b><span>${esc(linkedCustomer.email||'No email')}</span><span>Orders: ${esc(linkedCustomer.ordersCount||0)} • Last Order: ${esc(linkedCustomer.lastOrderDate||'-')}</span><span>Status: ${esc(linkedCustomer.orderStatus||'-')}</span></div>`:''}`}</div>`;
  const action=$('whatsappShopifyAction');
  if(action){
    action.innerHTML = known
      ? `<span class="wa-shopify-inline ok">Shopify Customer</span>`
      : `<span class="wa-shopify-inline missing">Not in Shopify</span><button class="primary-btn" type="button" data-add-shopify-phone="${esc(group.phone)}" data-add-shopify-name="${esc(name)}">Add to Shopify Customer</button>`;
  }
  if($('waThreadStatus')) waThreadStatus.value=meta.status||'open';
  if($('waThreadAgent')) waThreadAgent.value=meta.agent||'';
  if($('waThreadTags')) waThreadTags.value=(meta.tags||[]).join(', ');
  if($('waThreadNote')) waThreadNote.value=meta.note||'';
  setTimeout(()=>{ const area=pane.querySelector('.wa-message-area'); if(area) area.scrollTop=area.scrollHeight; },0);
}

function renderWhatsappCustomerDatalist(){
  const dl=$('whatsappShopifyCustomerList');
  if(!dl) return;
  const items=(shopifyCustomers||[]).filter(c=>formatWaPhone(c.phone||'')).slice(0,500);
  dl.innerHTML=items.map(c=>{
    const phone=formatWaPhone(c.phone||'');
    const label=[c.name||'Shopify Customer', phone, c.email||''].filter(Boolean).join(' • ');
    return `<option value="${esc(label)}" data-phone="${esc(phone)}"></option>`;
  }).join('');
}
function selectWhatsappSearchCustomer(){
  const input=$('whatsappInboxSearch'); if(!input) return false;
  const val=(input.value||'').trim(); if(!val) return false;
  const match=(shopifyCustomers||[]).find(c=>{
    const phone=formatWaPhone(c.phone||'');
    const label=[c.name||'Shopify Customer', phone, c.email||''].filter(Boolean).join(' • ');
    return val===label || val.includes(phone) || (phone && val.endsWith(phone));
  });
  if(!match) return false;
  const phone=formatWaPhone(match.phone||'');
  if(!phone) return false;
  selectedWhatsappInboxId=phone;
  if($('whatsappReplyPhone')) whatsappReplyPhone.value=phone;
  return true;
}
function renderWhatsappInbox(){
  renderWhatsappCustomerDatalist();
  selectWhatsappSearchCustomer();
  const q=($('whatsappInboxSearch')?.value||'').toLowerCase().trim();
  const all=(whatsappInboxMessages||[]).filter(m=>m.direction==='inbound' || m.direction==='outbound' || m.direction==='status');
  let groups=groupInboxMessages(all);
  const byPhone=new Map(groups.map(g=>[last10(g.phone),g]));
  if(q && Array.isArray(shopifyCustomers)){
    for(const c of shopifyCustomers){
      const value=customerValue(c);
      const phone=formatWaPhone(c.phone||'');
      const key=last10(phone);
      if(!phone || !value.includes(q) || byPhone.has(key)) continue;
      const g=shopifyCustomerToInboxGroup(c);
      groups.push(g); byPhone.set(key,g);
    }
  }
  groups=groups.filter(g=>!q || [g.customerName,g.phone,g.shopifyCustomer?.name,g.shopifyCustomer?.email,...(g.messages||[]).map(m=>messageText(m))].join(' ').toLowerCase().includes(q));
  groups=groups.sort((a,b)=>{
    if(a.shopifyOnly && !b.shopifyOnly) return 1;
    if(!a.shopifyOnly && b.shopifyOnly) return -1;
    return new Date(b.lastAt||0)-new Date(a.lastAt||0);
  });
  if(!selectedWhatsappInboxId && groups[0]) selectedWhatsappInboxId=groups[0].phone;
  if(selectedWhatsappInboxId && !groups.some(g=>String(g.phone)===String(selectedWhatsappInboxId)) && groups[0]) selectedWhatsappInboxId=groups[0].phone;
  if($('whatsappInboxCount')) whatsappInboxCount.textContent=groups.length;
  if($('whatsappInboxThreadCount')) whatsappInboxThreadCount.textContent=groups.length;
  renderChatList(groups);
  const group=groups.find(g=>String(g.phone)===String(selectedWhatsappInboxId));
  renderActiveChat(group);
  if(group && $('whatsappReplyPhone')) whatsappReplyPhone.value=group.phone;
}
async function loadWhatsappInbox(silent=false){
  const days=$('whatsappInboxDays')?.value||localStorage.getItem('tsgWhatsappInboxDays')||'7';
  const d=await fetch('/api/whatsapp-inbox?days='+encodeURIComponent(days),{credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message,messages:[]}));
  if($('whatsappInboxDays')) whatsappInboxDays.value=String(d.days||days);
  whatsappInboxMessages=d.messages||[];
  teamInboxMeta = (await fetch('/api/team-inbox/meta',{credentials:'include'}).then(r=>r.json()).catch(()=>({meta:{}}))).meta || teamInboxMeta || {};
  if(!shopifyCustomers.length) await loadShopifyCustomers().catch(()=>{});
  checkNewInboundNotifications(whatsappInboxMessages);
  if($('whatsappInboxResult') && !d.ok && !silent) whatsappInboxResult.textContent=JSON.stringify(d,null,2);
  renderWhatsappInbox();
}
async function markWhatsappInboxRead(id){
  if(!id) return;
  const d=await fetch('/api/whatsapp-inbox/'+encodeURIComponent(id)+'/read',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('whatsappInboxResult')) whatsappInboxResult.textContent=JSON.stringify(d,null,2);
  await loadWhatsappInbox();
}
async function markWhatsappThreadRead(phone){
  if(!phone) return;
  const d=await fetch('/api/whatsapp-inbox/thread/'+encodeURIComponent(phone)+'/read',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('whatsappInboxResult')) whatsappInboxResult.textContent=JSON.stringify(d,null,2);
  await loadWhatsappInbox();
}
async function clearWhatsappInbox(all=false){
  const days=$('whatsappInboxDays')?.value||'7';
  const msg=all?'Clear all WhatsApp inbox data?':`Clear WhatsApp inbox data from last ${days} day(s)?`;
  if(!confirm(msg)) return;
  const d=await fetch('/api/whatsapp-inbox/clear',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({days:Number(days),all})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('whatsappInboxResult')) whatsappInboxResult.textContent=JSON.stringify(d,null,2);
  await loadWhatsappInbox();
}
let pendingShopifyModal = { phone:'', name:'' };
function openShopifyCustomerModal(phone,name){
  pendingShopifyModal={phone:formatWaPhone(phone||''), name:name||'WhatsApp Customer'};
  const parts=String(pendingShopifyModal.name||'').split(/\s+/).filter(Boolean);
  const set=(id,val)=>{ if($(id)) $(id).value=val||''; };
  set('modalFirstName', parts[0]||''); set('modalLastName', parts.slice(1).join(' ')); set('modalPhone', pendingShopifyModal.phone); set('modalEmail',''); set('modalAddress',''); set('modalCity',''); set('modalState',''); set('modalPincode',''); set('modalCountry','India'); set('modalTags','WhatsApp Inbox, Added from Chat Inbox'); set('modalNotes',`Added from Chat Inbox. WhatsApp: ${pendingShopifyModal.phone}`);
  if($('modalMarketing')) modalMarketing.checked=true;
  if($('modalShopifyResult')) modalShopifyResult.textContent='';
  const modal=$('shopifyCustomerModal'); if(modal) modal.classList.remove('hidden');
}
function closeShopifyCustomerModal(){ const modal=$('shopifyCustomerModal'); if(modal) modal.classList.add('hidden'); }
async function addWhatsappCustomerToShopify(phone,name){ openShopifyCustomerModal(phone,name); }
async function saveModalShopifyCustomer(){
  const body={
    phone:$('modalPhone')?.value||pendingShopifyModal.phone,
    firstName:$('modalFirstName')?.value||'', lastName:$('modalLastName')?.value||'',
    name:[ $('modalFirstName')?.value||'', $('modalLastName')?.value||'' ].filter(Boolean).join(' ') || pendingShopifyModal.name,
    email:$('modalEmail')?.value||'', address:$('modalAddress')?.value||'', city:$('modalCity')?.value||'', state:$('modalState')?.value||'', pincode:$('modalPincode')?.value||'', country:$('modalCountry')?.value||'India', tags:$('modalTags')?.value||'', notes:$('modalNotes')?.value||'', marketing:!!$('modalMarketing')?.checked
  };
  const d=await fetch('/api/shopify/customers/create-from-whatsapp',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('modalShopifyResult')) modalShopifyResult.textContent=JSON.stringify(d,null,2);
  if($('whatsappInboxResult')) whatsappInboxResult.textContent=JSON.stringify(d,null,2);
  if(d.ok){ await loadShopifyCustomers().catch(()=>{}); renderWhatsappInbox(); setTimeout(closeShopifyCustomerModal,550); }
}

async function sendWhatsappInboxReply(){
  const phone=($('whatsappReplyPhone')?.value||'').trim();
  const message=($('whatsappReplyText')?.value||'').trim();
  const imageId=$('whatsappReplyImage')?.value||'';
  if(!phone) return alert('Reply phone number required.');
  if(!message && !imageId) return alert('Write message or select image.');
  const body={phone,message,imageIds:imageId?[imageId]:[]};
  const d=await fetch('/api/whatsapp-inbox/reply',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('whatsappInboxResult')) whatsappInboxResult.textContent=JSON.stringify(d,null,2);
  if(d.ok && $('whatsappReplyText')) whatsappReplyText.value='';
  await loadWhatsappInbox();
}


async function loadTeamInboxMeta(){
  const d=await fetch('/api/team-inbox/meta',{credentials:'include'}).then(r=>r.json()).catch(()=>({meta:{}}));
  teamInboxMeta=d.meta||{};
  return teamInboxMeta;
}
async function saveWaThreadMeta(){
  const phone=selectedWhatsappInboxId || $('whatsappReplyPhone')?.value || '';
  if(!phone) return alert('Please select a chat first.');
  const body={
    status:$('waThreadStatus')?.value||'open',
    agent:$('waThreadAgent')?.value||'',
    tags:($('waThreadTags')?.value||'').split(',').map(x=>x.trim()).filter(Boolean),
    note:$('waThreadNote')?.value||''
  };
  const d=await fetch('/api/team-inbox/thread/'+encodeURIComponent(phone),{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('whatsappInboxResult')) whatsappInboxResult.textContent=JSON.stringify(d,null,2);
  await loadTeamInboxMeta(); await loadWhatsappInbox(true);
}
function defaultFlowBlocks(){ return [
  {id:'start',type:'start',label:'Start',text:'Customer sends hi / menu'},
  {id:'welcome',type:'message',label:'Welcome Message',text:'Welcome to Tiny Shiny Gifts. Please choose an option:\n1. Track Order\n2. Catalog\n3. COD Help\n4. Talk to Support'},
  {id:'catalog',type:'catalog',label:'Catalog Link',text:'Send catalog links when customer asks for catalog'},
  {id:'support',type:'human',label:'Human Support',text:'Tag as Human Support Required'}
]; }
function activeFlow(){ return chatbotFlows.find(f=>String(f.id)===String(activeFlowId)) || chatbotFlows[0] || {id:'default_menu_flow',name:'Default WhatsApp Menu Flow',enabled:true,triggerKeywords:['hi','hello','namaste','menu','help'],blocks:defaultFlowBlocks(),edges:[]}; }
async function loadChatbotFlows(){
  const d=await fetch('/api/chatbot-flows',{credentials:'include'}).then(r=>r.json()).catch(()=>({flows:[]}));
  chatbotFlows=d.flows&&d.flows.length?d.flows:[activeFlow()];
  activeFlowId=activeFlowId || chatbotFlows[0]?.id || '';
  renderFlowBuilder();
}
function renderFlowBuilder(){
  const flow=activeFlow();
  if($('flowName')) flowName.value=flow.name||'';
  if($('flowTriggers')) flowTriggers.value=(flow.triggerKeywords||[]).join(', ');
  if($('flowEnabled')) flowEnabled.checked=flow.enabled!==false;
  const canvas=$('flowCanvas'); if(!canvas) return;
  const blocks=flow.blocks&&flow.blocks.length?flow.blocks:defaultFlowBlocks();
  canvas.innerHTML=blocks.map((b,i)=>`<div class="flow-block-card" draggable="true" data-flow-index="${i}">
    <div><b>${esc(b.label||b.type||'Block')}</b><span>${esc(b.type||'message')}</span></div>
    <input data-flow-edit="label" data-flow-index="${i}" value="${esc(b.label||'')}" placeholder="Block label"/>
    <textarea data-flow-edit="text" data-flow-index="${i}" placeholder="Message / rule text">${esc(b.text||'')}</textarea>
    <div class="inline-actions"><button class="ghost-btn" data-flow-move="up" data-flow-index="${i}">↑</button><button class="ghost-btn" data-flow-move="down" data-flow-index="${i}">↓</button><button class="ghost-btn danger-outline" data-flow-remove="${i}">Remove</button></div>
  </div>`).join('');
}
function addFlowBlock(type='message'){
  const flow=activeFlow();
  flow.blocks=flow.blocks&&flow.blocks.length?flow.blocks:defaultFlowBlocks();
  const labels={message:'Message',question:'Question',quick_reply:'Quick Reply Buttons',condition:'Condition / If-Else',catalog:'Catalog Link',order_tracking:'Order Tracking',cod:'COD Confirm / Cancel',human:'Human Support',delay:'Delay / Wait',tag:'Tag Customer'};
  flow.blocks.push({id:'b_'+Date.now(),type,label:labels[type]||type,text:type==='quick_reply'?'Button 1 | Button 2 | Button 3':''});
  renderFlowBuilder();
}
async function saveChatbotFlow(){
  const flow=activeFlow();
  flow.name=$('flowName')?.value||flow.name||'WhatsApp Flow';
  flow.enabled=!!$('flowEnabled')?.checked;
  flow.triggerKeywords=($('flowTriggers')?.value||'').split(',').map(x=>x.trim()).filter(Boolean);
  const d=await fetch('/api/chatbot-flows',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(flow)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('flowBuilderResult')) flowBuilderResult.textContent=JSON.stringify(d,null,2);
  chatbotFlows=d.flows||chatbotFlows; activeFlowId=d.flow?.id||activeFlowId; renderFlowBuilder();
}
async function loadShippingSettings(){
  const d=await fetch('/api/shipping-settings',{credentials:'include'}).then(r=>r.json()).catch(()=>({shipping:{}}));
  shippingSettings=d.shipping||{};
  if($('waShippingProvider')) waShippingProvider.value=shippingSettings.provider||'shiprocket';
}
async function saveShippingProvider(){
  const provider=$('waShippingProvider')?.value||'shiprocket';
  const d=await fetch('/api/shipping-settings',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  shippingSettings=d.shipping||shippingSettings;
}

function crmValue(c){ return [c.name,c.phone,c.email,c.productTitle,c.pageUrl,c.orderName,c.lastMessage,c.status].join(' ').toLowerCase(); }
function shortUrl(u){ const s=String(u||''); return s.length>95 ? s.slice(0,95)+'…' : s; }
function renderCrm(){ const q=($('crmSearch')?.value||'').toLowerCase().trim(); const st=$('crmStatusFilter')?.value||''; renderCrmTabs(); const base=contactFiltered(crmCustomers, crmContactFilter); const filtered=base.filter(c=>(!q||crmValue(c).includes(q))&&(!st||(c.status||'New')===st)); if($('crmCount')) crmCount.textContent=crmCustomers.length; if($('crmSummary')){ const counts=crmCustomers.reduce((a,c)=>{const k=c.status||'New';a[k]=(a[k]||0)+1;return a;},{}); const withCount=contactFiltered(crmCustomers,'with').length; const withoutCount=contactFiltered(crmCustomers,'without').length; crmSummary.innerHTML=[`<span><b>${withCount}</b>With Contact</span>`,`<span><b>${withoutCount}</b>Without Contact</span>`].join('') + ['New','Hot Lead','Follow Up','Converted','Not Interested'].map(k=>`<span><b>${counts[k]||0}</b>${esc(k)}</span>`).join(''); } if(!$('crmList')) return; crmList.innerHTML=filtered.map(c=>`<div class="crm-card clean-crm-card" data-crm-id="${esc(c.id)}"><div class="crm-main"><b>${esc(c.name||'Customer')}</b><span>${esc(c.phone||'No phone')}${c.email?' • '+esc(c.email):''}</span></div><div class="crm-meta"><span class="status-chip">${esc(c.status||'New')}</span><span class="${hasContactNumber(c)?'contact-ok':'contact-missing'}">${hasContactNumber(c)?'With Contact Number':'Without Contact Number'}</span><span>${esc(c.updatedAt||c.createdAt)}</span><span>Leads: ${esc(c.leadCount||0)} • Activity: ${esc(c.activityCount||0)}</span></div><div class="crm-product-row">${c.productImage?`<img src="${esc(c.productImage)}" alt=""/>`:''}<div><b>${esc(c.productTitle||'No product yet')}</b><br/><a href="${esc(c.pageUrl||'#')}" target="_blank" title="${esc(c.pageUrl||'')}">${esc(shortUrl(c.pageUrl||''))}</a><div class="crm-message">${esc(c.lastMessage||'')}</div></div></div><div class="form-grid two"><label>Status <select data-crm-status="${esc(c.id)}"><option ${c.status==='New'?'selected':''}>New</option><option ${c.status==='Hot Lead'?'selected':''}>Hot Lead</option><option ${c.status==='Follow Up'?'selected':''}>Follow Up</option><option ${c.status==='Converted'?'selected':''}>Converted</option><option ${c.status==='Not Interested'?'selected':''}>Not Interested</option></select></label><label>Notes <input data-crm-notes="${esc(c.id)}" value="${esc(c.notes||'')}" placeholder="Follow-up note"/></label></div><button class="ghost-btn" data-crm-save="${esc(c.id)}">Save CRM</button></div>`).join('')||`<p>No ${crmContactFilter==='with'?'contact-number':'without-contact'} CRM data yet.</p>`; }
async function loadCrm(){ const d=await fetch('/api/crm',{credentials:'include'}).then(r=>r.json()).catch(()=>({customers:[]})); crmCustomers=d.customers||[]; renderCrm(); }
function exportCrmCsv(){ const headers=['Status','Name','Phone','Email','Product','Product Link','Order','Total','Last Message','Notes','Updated At']; const rows=crmCustomers.map(c=>[c.status,c.name,c.phone,c.email,c.productTitle,c.pageUrl,c.orderName,c.total,c.lastMessage,c.notes,c.updatedAt]); const csv=[headers,...rows].map(row=>row.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='tiny-shiny-crm.csv'; a.click(); URL.revokeObjectURL(a.href); }
async function saveCrm(id){ const status=document.querySelector(`[data-crm-status="${CSS.escape(id)}"]`)?.value||'New'; const notes=document.querySelector(`[data-crm-notes="${CSS.escape(id)}"]`)?.value||''; const data=await fetch('/api/crm/'+encodeURIComponent(id),{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,notes})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message})); if(!data.ok) return alert(data.error||'CRM save failed'); await loadCrm(); }
function customerValue(c){return [c.name,c.phone,c.email,c.city,c.orderStatus].join(' ').toLowerCase();}
function renderShopifyCustomers(){ const q=($('shopifyCustomerSearch')?.value||'').toLowerCase().trim(); const filtered=shopifyCustomers.filter(c=>!q||customerValue(c).includes(q)); if(!$('shopifyCustomersList')) return; shopifyCustomersList.innerHTML=`<table class="customer-table"><thead><tr><th><input id="selectAllCustomersTop" type="checkbox"/></th><th>Customer / Party</th><th>City</th><th>Orders</th><th>Net Sales</th><th>Last Order</th><th>Order Status</th><th>Phone</th><th>Email</th></tr></thead><tbody>${filtered.map(c=>`<tr><td><input class="cust-check" type="checkbox" data-customer-id="${esc(c.id)}"/></td><td><button class="link-btn" data-open-customer="${esc(c.id)}">${esc(c.name||'Customer')}</button></td><td>${esc(c.city||'')}</td><td>${esc(c.ordersCount||0)}</td><td>${esc(c.totalSpent||'')}</td><td>${esc(c.lastOrderDate||'')}</td><td>${esc(c.orderStatus||'-')}</td><td>${esc(c.phone||'')}</td><td>${esc(c.email||'')}</td></tr>`).join('')}</tbody></table>`; }
async function loadShopifyCustomers(){ const d=await fetch('/api/shopify/customers',{credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message,customers:[]})); shopifyCustomers=d.customers||[]; if($('shopifyCustomersResult')) shopifyCustomersResult.textContent=d.ok?`Loaded ${shopifyCustomers.length} customers` : JSON.stringify(d,null,2); renderShopifyCustomers(); }
function selectedCustomers(){ return [...document.querySelectorAll('.cust-check:checked')].map(i=>shopifyCustomers.find(c=>String(c.id)===String(i.dataset.customerId))).filter(Boolean); }
function openCustomerTool(id){ const c=shopifyCustomers.find(x=>String(x.id)===String(id)); if(!c)return; showTab('crmPanel'); setTimeout(()=>{ if($('crmSearch')){ crmSearch.value=c.phone||c.email||c.name||''; renderCrm(); } },100); alert(`Customer selected: ${c.name}\nPhone: ${c.phone||'-'}\nEmail: ${c.email||'-'}\nUse CRM Dashboard to save follow-up / notes.`); }
async function bulkCustomerMessage(saveOnly=false){ const selected=selectedCustomers(); if(!selected.length) return alert('Please select customers first.'); const message=$('bulkCustomerMessage')?.value.trim()||''; if(!message) return alert('Please write message text.'); const res=await fetch('/api/shopify/customers/bulk-message',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({customers:selected,message,saveOnly,sendVia:$('bulkSendVia')?.value||'whatsapp'})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message})); if($('shopifyCustomersResult')) shopifyCustomersResult.textContent=JSON.stringify(res,null,2); }

async function fileToDataUrl(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); }); }
async function uploadMedia(){
  const files=[...($('mediaFile')?.files||[])];
  if(!files.length) return alert('Please select one or more images first.');
  const uploaded=[];
  for(const file of files){
    if(file.size>6*1024*1024){ uploaded.push({file:file.name, ok:false, error:'Image size should be under 6 MB'}); continue; }
    const dataUrl=await fileToDataUrl(file);
    const titleBase=($('mediaTitle')?.value||'').trim();
    const body={filename:file.name,dataUrl,title:titleBase || file.name,category:mediaCategory.value,caption:mediaCaption.value.trim()};
    const res=await fetch('/api/media-images',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
    if(res.ok && res.image){ uploaded.push({file:file.name, ok:true, id:res.image.id}); if(!selectedMediaIds.includes(res.image.id)) selectedMediaIds.push(res.image.id); }
    else uploaded.push({file:file.name, ok:false, error:res.error||'Image upload failed'});
  }
  selectedMediaId=selectedMediaIds[0]||'';
  if($('mediaFile')) mediaFile.value='';
  if($('mediaTitle')) mediaTitle.value='';
  await loadMedia();
  alert(`Uploaded ${uploaded.filter(x=>x.ok).length} image(s).`);
}
async function loadMedia(){
  const d=await fetch('/api/media-images',{credentials:'include'}).then(r=>r.json()).catch(()=>({images:[]}));
  mediaImages=d.images||[];
  selectedMediaIds = selectedMediaIds.filter(id=>mediaImages.some(img=>String(img.id)===String(id)));
  selectedMediaId = selectedMediaIds[0] || '';
  renderSelectedMedia(); renderWhatsappReplyImages();
  if(!$('mediaList')) return;
  mediaList.innerHTML=mediaImages.map(img=>{
    const selected=selectedMediaIds.includes(img.id);
    return `<div class="media-card ${selected?'selected':''}" data-media-card="${esc(img.id)}"><img src="${esc(img.url)}" alt="${esc(img.title)}"/><div class="media-info"><b>${esc(img.title)}</b><span>${esc(img.category)} • ${esc(img.createdAt)}</span><p>${esc(img.caption)}</p><small>${esc(img.absoluteUrl||img.url)}</small></div><div class="media-card-actions"><button class="ghost-btn" data-select-media="${esc(img.id)}">${selected?'Attached':'Attach'}</button><button class="ghost-btn danger-outline" data-remove-selected-media="${esc(img.id)}">Remove Attach</button><button class="ghost-btn danger-outline" data-delete-media="${esc(img.id)}">Delete</button></div></div>`;
  }).join('') || '<p>No images uploaded yet.</p>';
}
function renderSelectedMedia(){
  const box=$('selectedMediaList'); if(!box) return;
  const selected=selectedMediaIds.map(id=>mediaImages.find(x=>String(x.id)===String(id))).filter(Boolean);
  box.innerHTML = selected.length ? `<h4>Attached Images (${selected.length})</h4><div class="attached-images">${selected.map(img=>`<div class="attached-image"><img src="${esc(img.url)}" alt="${esc(img.title)}"/><span>${esc(img.title||img.filename||'Image')}</span><button class="ghost-btn danger-outline" data-remove-selected-media="${esc(img.id)}" type="button">Remove</button></div>`).join('')}</div>` : '<p class="hint">No image attached. Message will go as text only.</p>';
}
function renderMediaCustomers(){
  const q=($('mediaCustomerSearch')?.value||'').toLowerCase().trim();
  const filtered=shopifyCustomers.filter(c=>!q||customerValue(c).includes(q));
  if(!$('mediaCustomerList')) return;
  mediaCustomerList.innerHTML=filtered.map(c=>`<label class="mini-customer-row"><input class="media-cust-check" type="checkbox" data-customer-id="${esc(c.id)}"/> <span><b>${esc(c.name||'Customer')}</b><small>${esc(c.phone||'No phone')}${c.email?' • '+esc(c.email):''}</small></span><button class="ghost-btn" type="button" data-fill-media-phone="${esc(c.id)}">Use Phone</button></label>`).join('') || '<p>No Shopify customers loaded. Click Load Shopify Customers.</p>';
}
async function loadMediaCustomers(){ if(!shopifyCustomers.length) await loadShopifyCustomers(); renderMediaCustomers(); }
function selectedMediaCustomers(){ return [...document.querySelectorAll('.media-cust-check:checked')].map(i=>shopifyCustomers.find(c=>String(c.id)===String(i.dataset.customerId))).filter(Boolean); }
function mediaMessageText(){ return ($('mediaCaption')?.value || '').trim(); }
function mediaPayloadBase(){ return { imageIds:selectedMediaIds.slice(0,20), caption:mediaMessageText(), message:mediaMessageText() }; }
async function sendMediaToPhone(phone, customer){
  const payload={...mediaPayloadBase(),to:'custom',phone,customer};
  return fetch('/api/send-image-message',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
}
async function sendSelectedMedia(){
  const to=$('mediaSendTo')?.value || 'owner';
  const phone=($('mediaPhone')?.value || '').trim();
  const message=mediaMessageText();
  if(!selectedMediaIds.length && !message) return alert('Please write WhatsApp message or attach image first.');
  if(to==='custom'&&!phone) return alert('Please enter customer WhatsApp number.');
  let customers=[];
  if(to==='shopify_customers'){
    customers=selectedMediaCustomers();
    if(!customers.length) return alert('Please select Shopify customers first.');
  }
  if(to==='all_shopify_customers'){
    if(!shopifyCustomers.length) await loadShopifyCustomers();
    customers=shopifyCustomers.filter(c=>c.phone);
    if(!customers.length) return alert('No Shopify customers with phone numbers found.');
  }
  if(customers.length){
    const results=[];
    for(const c of customers.slice(0,500)){
      if(!c.phone){ results.push({customer:c.name, ok:false, error:'No phone'}); continue; }
      const res=await sendMediaToPhone(c.phone,c);
      results.push({customer:c.name, phone:c.phone, ...res});
    }
    if($('mediaSendResult')) mediaSendResult.textContent=JSON.stringify({ok:true,count:results.length,attachedImages:selectedMediaIds.length,results},null,2);
    return;
  }
  const payload={...mediaPayloadBase(),to,phone};
  const res=await fetch('/api/send-image-message',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('mediaSendResult')) mediaSendResult.textContent=JSON.stringify(res,null,2);
}
function productValue(p){ return [p.title,p.handle,p.productType,p.vendor,p.status,p.price].join(' ').toLowerCase(); }
function renderNewProducts(){
  const q=($('newProductSearch')?.value||'').toLowerCase().trim();
  const filtered=shopifyProducts.filter(p=>!q||productValue(p).includes(q));
  if($('newProductsList')) newProductsList.innerHTML=filtered.map(p=>`<div class="product-card ${String(selectedPromoProductId)===String(p.id)?'selected':''}"><label><input type="radio" name="promoProduct" data-promo-product="${esc(p.id)}" ${String(selectedPromoProductId)===String(p.id)?'checked':''}/> <b>${esc(p.title)}</b></label>${p.image?`<img src="${esc(p.image)}" alt="${esc(p.title)}"/>`:''}<div>${esc(p.price||'')} ${p.compareAtPrice?`<small>MRP ${esc(p.compareAtPrice)}</small>`:''}</div><a href="${esc(p.url||'#')}" target="_blank">Open product</a><small>${esc(p.createdAt||'')} • ${esc(p.productType||'')}</small></div>`).join('') || '<p>No products loaded. Click Refresh Products.</p>';
  renderNewProductCustomers();
}
function renderNewProductCustomers(){
  const q=($('newProductCustomerSearch')?.value||'').toLowerCase().trim();
  const filtered=shopifyCustomers.filter(c=>!q||customerValue(c).includes(q));
  if(!$('newProductCustomerList')) return;
  newProductCustomerList.innerHTML=filtered.map(c=>`<label class="mini-customer-row"><input class="promo-cust-check" type="checkbox" data-customer-id="${esc(c.id)}"/> <span><b>${esc(c.name||'Customer')}</b><small>${esc(c.phone||'No phone')}${c.email?' • '+esc(c.email):''}</small></span></label>`).join('') || '<p>No customers loaded. Refresh products/customers first.</p>';
}
async function loadNewProducts(){
  const [prod] = await Promise.all([
    fetch('/api/shopify/products',{credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message,products:[]})),
    shopifyCustomers.length ? Promise.resolve() : loadShopifyCustomers().catch(()=>{})
  ]);
  shopifyProducts = prod.products || [];
  if(!selectedPromoProductId && shopifyProducts[0]) selectedPromoProductId = shopifyProducts[0].id;
  if($('newProductsResult')) newProductsResult.textContent = prod.ok ? `Loaded ${shopifyProducts.length} products` : JSON.stringify(prod,null,2);
  renderNewProducts();
}
function selectedPromoCustomers(){ return [...document.querySelectorAll('.promo-cust-check:checked')].map(i=>shopifyCustomers.find(c=>String(c.id)===String(i.dataset.customerId))).filter(Boolean); }
async function sendNewProductPromo(){
  const product = shopifyProducts.find(p=>String(p.id)===String(selectedPromoProductId));
  if(!product) return alert('Please select a product first.');
  const customers = selectedPromoCustomers();
  if(!customers.length) return alert('Please select customers first.');
  const message = $('newProductMessage')?.value.trim() || '';
  const saveOnly = ($('newProductSendMode')?.value || 'whatsapp') === 'crm';
  const res = await fetch('/api/shopify/products/bulk-promo',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({product,customers,message,saveOnly})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('newProductsResult')) newProductsResult.textContent = JSON.stringify(res,null,2);
}


function parseContactText(text=''){
  const lines=String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const out=[];
  for(const line of lines){
    const parts=line.split(/,|\t/).map(x=>x.trim());
    if(!parts.length) continue;
    if(/phone|mobile|number/i.test(parts.join(' ')) && /name/i.test(parts.join(' '))) continue;
    const [name,phone,email,category]=parts.length>=4?parts:[parts[0]||'',parts[1]||parts[0]||'',parts[2]||'',parts[3]||''];
    const p=formatWaPhone(phone||line);
    if(!p) continue;
    out.push({id:p,name:name && !digitsOnly(name) ? name : 'Customer',phone:p,email:email||'',category:category||'',source:'sheet'});
  }
  return out;
}
function dedupeBroadcastContacts(list){ const seen=new Set(); const out=[]; for(const c of list){ const phone=formatWaPhone(c.phone); if(!phone||seen.has(phone)) continue; seen.add(phone); out.push({...c,phone,id:c.id||phone}); } return out; }
function renderBroadcastTemplates(){ const sel=$('broadcastTemplate'); if(!sel) return; const current=sel.value; sel.innerHTML='<option value="">Select template</option>'+broadcastTemplates.map(t=>`<option value="${esc(t.name)}" data-lang="${esc(t.language||'en')}">${esc(t.name)} (${esc(t.category||'')})</option>`).join(''); if(current) sel.value=current; }
function categoryMatch(c,cat){ if(!cat) return true; const hay=[c.category,c.name,c.email,c.city,c.orderStatus,c.raw?.tags].join(' ').toLowerCase(); const key=cat.toLowerCase().replace('é','e'); return hay.includes(key) || (cat==='Home Décor' && /home|decor|décor/.test(hay)); }
function renderBroadcastContacts(){
  const cat=$('broadcastCategory')?.value||'';
  const filtered=broadcastContacts.filter(c=>categoryMatch(c,cat));
  if($('broadcastSummary')) broadcastSummary.textContent=`${filtered.length} contacts available / ${document.querySelectorAll('.broadcast-check:checked').length} selected`;
  if(!$('broadcastContactsList')) return;
  broadcastContactsList.innerHTML=filtered.map(c=>`<label class="mini-customer-row broadcast-row"><input class="broadcast-check" type="checkbox" data-phone="${esc(c.phone)}" checked/> <span><b>${esc(c.name||'Customer')}</b><small>${esc(c.phone)}${c.email?' • '+esc(c.email):''}${c.category?' • '+esc(c.category):''}</small></span></label>`).join('') || '<p>No contacts imported.</p>';
}
async function loadBroadcasts(){
  const d=await fetch('/api/broadcast/campaigns',{credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message,campaigns:[],templates:[]}));
  broadcastCampaigns=d.campaigns||[]; broadcastTemplates=d.templates||[]; renderBroadcastTemplates(); renderBroadcastCampaigns();
}
function renderBroadcastCampaigns(){
  if(!$('broadcastCampaignsList')) return;
  broadcastCampaignsList.innerHTML=(broadcastCampaigns||[]).slice(0,50).map(c=>`<div class="log-row broadcast-campaign"><b>${esc(c.name)}</b> <small>${esc(c.createdAt)}</small><br/>Template: ${esc(c.templateName)} | Status: ${esc(c.status)}<br/>Sent: ${esc(c.sentCount||0)} | Failed: ${esc(c.failedCount||0)} | Skipped: ${esc(c.skippedCount||0)} | Contacts: ${esc((c.contacts||[]).length)}</div>`).join('') || 'No campaigns yet.';
}
async function importShopifyToBroadcast(){ if(!shopifyCustomers.length) await loadShopifyCustomers(); broadcastContacts=dedupeBroadcastContacts(broadcastContacts.concat(shopifyCustomers.map(c=>({id:c.id,name:c.name,phone:c.phone,email:c.email,category:c.raw?.tags||'',source:'shopify',raw:c.raw})))); renderBroadcastContacts(); }
async function importBroadcastPaste(){ const contacts=parseContactText($('broadcastPasteContacts')?.value||''); broadcastContacts=dedupeBroadcastContacts(broadcastContacts.concat(contacts)); renderBroadcastContacts(); }
async function readBroadcastCsvFile(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(String(r.result||'')); r.onerror=reject; r.readAsText(file); }); }
function selectedBroadcastContacts(){ const checked=[...document.querySelectorAll('.broadcast-check:checked')].map(x=>x.dataset.phone); return broadcastContacts.filter(c=>checked.includes(c.phone)); }
async function createBroadcast(){
  const contacts=selectedBroadcastContacts(); if(!contacts.length) return alert('Please import/select contacts first.');
  const templateName=$('broadcastTemplate')?.value||''; if(!templateName) return alert('Please select approved template.');
  const variables=String($('broadcastVariables')?.value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const body={ name:$('broadcastName')?.value||'WhatsApp Broadcast', category:$('broadcastCategory')?.value||'All', templateName, templateLang:$('broadcastTemplateLang')?.value||'en', imageUrl:$('broadcastImageUrl')?.value||'', productLink:$('broadcastProductLink')?.value||'', couponCode:$('broadcastCouponCode')?.value||'', dailyLimit:Number($('broadcastDailyLimit')?.value||500), scheduleAt:$('broadcastScheduleAt')?.value||'', variables, contacts };
  const res=await fetch('/api/broadcast/campaigns',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('broadcastResult')) broadcastResult.textContent=JSON.stringify(res,null,2);
  await loadBroadcasts();
}

function defaultCatalogCategoriesUi(){
  return [
    {id:'all', name:'Shop All', link:'https://www.tinyshinygifts.com/collections/all', active:true},
    {id:'new-arrivals', name:'New Arrivals', link:'https://www.tinyshinygifts.com/collections/new-arrivals', active:true},
    {id:'home-decor', name:'Home Decor', link:'https://www.tinyshinygifts.com/collections/home-decor', active:true},
    {id:'god-statue', name:'God Idols & Statues', link:'https://www.tinyshinygifts.com/collections/god-statue', active:true},
    {id:'candles-and-diyas', name:"Candle's And Diya's", link:'https://www.tinyshinygifts.com/collections/candles-and-diyas', active:true},
    {id:'rakhi', name:'Rakhi', link:'https://www.tinyshinygifts.com/collections/rakhi', active:true},
    {id:'krishna-poshak', name:'Krishna Poshak', link:'https://www.tinyshinygifts.com/collections/krishna-poshak', active:true},
    {id:'pooja-samagri', name:'Pooja Samagri', link:'https://www.tinyshinygifts.com/collections/pooja-samagri', active:true},
    {id:'gifts', name:'Gifts', link:'https://www.tinyshinygifts.com/collections/gifts', active:true},
    {id:'hangings', name:"Hanging's", link:'https://www.tinyshinygifts.com/collections/hangings', active:true},
    {id:'christmas', name:'Christmas', link:'https://www.tinyshinygifts.com/collections/christmas', active:false}
  ];
}
function renderCatalogCategories(){
  const box=$('catalogCategoriesTable'); if(!box) return;
  const cats=(waBotSettings.catalogCategories&&waBotSettings.catalogCategories.length?waBotSettings.catalogCategories:defaultCatalogCategoriesUi());
  waBotSettings.catalogCategories=cats;
  box.innerHTML=cats.map((c,i)=>`<div class="catalog-cat-row">
    <label class="checkline"><input type="checkbox" data-cat-active="${i}" ${c.active!==false?'checked':''}/> Active</label>
    <input data-cat-name="${i}" value="${esc(c.name||'')}" placeholder="Category name"/>
    <input data-cat-link="${i}" value="${esc(c.link||'')}" placeholder="Collection link"/>
    <button type="button" class="ghost-btn compact-btn" data-cat-remove="${i}">Remove</button>
  </div>`).join('');
}
function collectCatalogCategories(){
  const cats=waBotSettings.catalogCategories||defaultCatalogCategoriesUi();
  return cats.map((c,i)=>({id:(c.id||c.name||('cat'+i)), name:document.querySelector(`[data-cat-name="${i}"]`)?.value||c.name||'', link:document.querySelector(`[data-cat-link="${i}"]`)?.value||c.link||'', active:!!document.querySelector(`[data-cat-active="${i}"]`)?.checked}));
}

async function loadWhatsappChatbotSettings(){
  const d=await fetch('/api/whatsapp-chatbot/settings',{credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message,settings:{}}));
  waBotSettings=d.settings||{};
  if($('waBotEnabled')) waBotEnabled.checked=!!waBotSettings.enabled;
  if($('waBotMenuEnabled')) waBotMenuEnabled.checked=waBotSettings.menuEnabled!==false;
  if($('waBotCatalogEnabled')) waBotCatalogEnabled.checked=waBotSettings.catalogEnabled!==false;
  const map={waBotMenuText:'menuText',waBotAfterHours:'afterHoursMessage',waBotMainCatalog:'mainCatalogLink',waBotRakhiCatalog:'rakhiCatalogLink',waBotHomeCatalog:'homeDecorCatalogLink',waBotDivineCatalog:'divineCatalogLink',waBotCandlesCatalog:'candlesCatalogLink',waBotNewCatalog:'newArrivalsLink'};
  for(const [id,key] of Object.entries(map)) if($(id)) $(id).value=waBotSettings[key]||'';
}
async function saveWhatsappChatbotSettings(){
  const body={ enabled:!!$('waBotEnabled')?.checked, menuEnabled:!!$('waBotMenuEnabled')?.checked, catalogEnabled:!!$('waBotCatalogEnabled')?.checked, menuText:$('waBotMenuText')?.value||'', afterHoursMessage:$('waBotAfterHours')?.value||'', mainCatalogLink:$('waBotMainCatalog')?.value||'', rakhiCatalogLink:$('waBotRakhiCatalog')?.value||'', homeDecorCatalogLink:$('waBotHomeCatalog')?.value||'', divineCatalogLink:$('waBotDivineCatalog')?.value||'', candlesCatalogLink:$('waBotCandlesCatalog')?.value||'', newArrivalsLink:$('waBotNewCatalog')?.value||'', trackingKeywords:$('waTrackingKeywords')?.value||'', supportKeywords:$('waSupportKeywords')?.value||'' };
  await saveShippingProvider();
  const res=await fetch('/api/whatsapp-chatbot/settings',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('waBotResult')) waBotResult.textContent=JSON.stringify(res,null,2);
}



async function loadQuickReplySettings(){
  const d=await fetch('/api/quickreply/settings',{credentials:'include'}).then(r=>r.json()).catch(()=>({settings:{}}));
  quickReplySettings=d.settings||{};
  const map={qrPopupEnabled:'popupEnabled',qrAbandonedCartEnabled:'abandonedCartEnabled',qrProductAbandonEnabled:'productAbandonEnabled',qrCodPrepaidEnabled:'codToPrepaidEnabled',qrReviewEnabled:'reviewFlowEnabled',qrClickTrackingEnabled:'clickTrackingEnabled',qrRevenueEnabled:'revenueAttributionEnabled',qrInactiveExclude:'inactiveLeadExclusion'};
  for(const [id,key] of Object.entries(map)){ if($(id)) $(id).checked=!!quickReplySettings[key]; }
}
async function saveQuickReplySettings(){
  const body={popupEnabled:!!$('qrPopupEnabled')?.checked,abandonedCartEnabled:!!$('qrAbandonedCartEnabled')?.checked,productAbandonEnabled:!!$('qrProductAbandonEnabled')?.checked,codToPrepaidEnabled:!!$('qrCodPrepaidEnabled')?.checked,reviewFlowEnabled:!!$('qrReviewEnabled')?.checked,clickTrackingEnabled:!!$('qrClickTrackingEnabled')?.checked,revenueAttributionEnabled:!!$('qrRevenueEnabled')?.checked,inactiveLeadExclusion:!!$('qrInactiveExclude')?.checked};
  const d=await fetch('/api/quickreply/settings',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('phase2Result')) phase2Result.textContent=JSON.stringify(d,null,2);
  await loadQuickReplySettings();
}
function renderPhase2Analytics(){
  const s=phase2Analytics.summary||{};
  if($('phase2Summary')) phase2Summary.innerHTML=[['WhatsApp',s.whatsappTotal||0],['Inbound',s.whatsappInbound||0],['Failed',s.whatsappFailed||0],['Campaigns',s.campaigns||0],['Opt-outs',s.optouts||0],['Clicks',s.clicks||0]].map(x=>`<div><b>${esc(x[1])}</b><span>${esc(x[0])}</span></div>`).join('');
  const segs=phase2Segments||[];
  if($('phase2Segments')) phase2Segments.innerHTML=segs.map(seg=>`<div class="segment-card"><b>${esc(seg.name)}</b><span>${esc(seg.count||0)} contacts</span><small>${esc(seg.rule||'')}</small></div>`).join('')||'<p>No segments yet.</p>';
  const campaigns=s.campaignStats||[];
  if($('phase2CampaignStats')) phase2CampaignStats.innerHTML=`<table class="customer-table"><thead><tr><th>Campaign</th><th>Status</th><th>Audience</th><th>Sent</th><th>Delivered</th><th>Read</th><th>Failed</th><th>Clicks</th><th>Actions</th></tr></thead><tbody>${campaigns.map(c=>`<tr><td>${esc(c.name||c.id)}</td><td>${esc(c.status)}</td><td>${esc(c.audienceCount||0)}</td><td>${esc(c.sentCount||0)}</td><td>${esc(c.deliveredCount||0)}</td><td>${esc(c.readCount||0)}</td><td>${esc(c.failedCount||0)}</td><td>${esc(c.clickCount||0)}</td><td><button class="ghost-btn" data-campaign-action="pause" data-campaign-id="${esc(c.id)}">Pause</button><button class="ghost-btn" data-campaign-action="resume" data-campaign-id="${esc(c.id)}">Resume</button><button class="ghost-btn danger-outline" data-campaign-action="stop" data-campaign-id="${esc(c.id)}">Stop</button></td></tr>`).join('')}</tbody></table>`;
}
async function loadPhase2Analytics(){
  await loadQuickReplySettings().catch(()=>{});
  const [a,segs]=await Promise.all([fetch('/api/phase2/analytics',{credentials:'include'}).then(r=>r.json()).catch(()=>({summary:{}})),fetch('/api/phase2/segments',{credentials:'include'}).then(r=>r.json()).catch(()=>({autoSegments:[]}))]);
  phase2Analytics=a||{}; phase2Segments=(segs.autoSegments||[]).concat(segs.segments||[]); renderPhase2Analytics();
}
async function campaignAction(id,action){
  const d=await fetch(`/api/phase2/campaigns/${encodeURIComponent(id)}/${encodeURIComponent(action)}`,{method:'POST',credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('phase2Result')) phase2Result.textContent=JSON.stringify(d,null,2); await loadPhase2Analytics();
}
function renderDrips(){
  if(!$('dripList')) return;
  dripList.innerHTML=(dripCampaigns||[]).map(d=>`<div class="campaign-card"><b>${esc(d.name)}</b><span>${esc(d.trigger||'')}</span><small>${esc(d.enabled?'Enabled':'Disabled')} • ${esc(d.updatedAt||d.createdAt||'')}</small><pre>${esc((d.steps||[]).map(s=>`${s.day||''} | ${s.template||''} | ${s.message||''}`).join('\n'))}</pre></div>`).join('')||'<p>No drip campaigns yet.</p>';
}
async function loadDrips(){ const d=await fetch('/api/phase2/drips',{credentials:'include'}).then(r=>r.json()).catch(()=>({drips:[]})); dripCampaigns=d.drips||[]; renderDrips(); }
function parseDripSteps(text){ return String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{ const [day,template,message]=line.split('|').map(x=>String(x||'').trim()); return {day,template,message}; }); }
async function saveDrip(){
  const body={name:$('dripName')?.value||'WhatsApp Drip',trigger:$('dripTrigger')?.value||'new_lead',enabled:!!$('dripEnabled')?.checked,steps:parseDripSteps($('dripSteps')?.value||'')};
  const d=await fetch('/api/phase2/drips',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('dripResult')) dripResult.textContent=JSON.stringify(d,null,2); await loadDrips();
}
function renderInstagram(){
  if($('igEnabled')) igEnabled.checked=!!instagramSettings.enabled;
  if($('igAutoReply')) igAutoReply.checked=!!instagramSettings.autoReplyEnabled;
  if($('igCatalogReply')) igCatalogReply.checked=instagramSettings.catalogReplyEnabled!==false;
  [['igPageId','pageId'],['igBusinessId','instagramBusinessAccountId'],['igVerifyToken','verifyToken'],['igAccessToken','accessToken'],['igMainCatalog','mainCatalogLink'],['igSupportKeywords','humanSupportKeywords'],['igCatalogKeywords','catalogKeywords']].forEach(([id,key])=>{ if($(id)) $(id).value=instagramSettings[key]||''; });
  if($('instagramInboxList')) instagramInboxList.innerHTML=(instagramMessages||[]).map(m=>`<div class="ig-msg ${m.direction==='outbound'?'outbound':'inbound'}"><b>${esc(m.username||m.from||m.to)}</b><small>${esc(m.createdAt||'')}</small><p>${esc(m.text||'')}</p><button class="ghost-btn" data-ig-reply-to="${esc(m.username||m.from||m.to)}">Reply</button></div>`).join('')||'<p>No Instagram DM yet. Webhook se messages yaha aayenge.</p>';
}
async function loadInstagram(){
  const [set, inbox]=await Promise.all([fetch('/api/instagram/settings',{credentials:'include'}).then(r=>r.json()).catch(()=>({settings:{}})),fetch('/api/instagram/inbox',{credentials:'include'}).then(r=>r.json()).catch(()=>({messages:[]}))]);
  instagramSettings=set.settings||{}; instagramMessages=inbox.messages||[]; renderInstagram();
}
async function saveInstagramSettings(){
  const body={enabled:!!$('igEnabled')?.checked,autoReplyEnabled:!!$('igAutoReply')?.checked,catalogReplyEnabled:!!$('igCatalogReply')?.checked,pageId:$('igPageId')?.value||'',instagramBusinessAccountId:$('igBusinessId')?.value||'',verifyToken:$('igVerifyToken')?.value||'tinyshiny_instagram_verify',accessToken:$('igAccessToken')?.value||'',mainCatalogLink:$('igMainCatalog')?.value||'',humanSupportKeywords:$('igSupportKeywords')?.value||'',catalogKeywords:$('igCatalogKeywords')?.value||''};
  const d=await fetch('/api/instagram/settings',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('instagramResult')) instagramResult.textContent=JSON.stringify(d,null,2); await loadInstagram();
}
async function sendInstagramReply(){
  const body={to:$('igReplyTo')?.value||'',message:$('igReplyText')?.value||''};
  if(!body.to||!body.message) return alert('Instagram username/ID and message required.');
  const d=await fetch('/api/instagram/reply',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('instagramResult')) instagramResult.textContent=JSON.stringify(d,null,2); if(d.ok && $('igReplyText')) igReplyText.value=''; await loadInstagram();
}
async function mockInstagramMessage(){
  const text=prompt('Test Instagram message text','catalog'); if(text===null) return;
  const username=prompt('Instagram username/ID','instagram_customer')||'instagram_customer';
  const d=await fetch('/api/instagram/inbox/mock',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,text})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('instagramResult')) instagramResult.textContent=JSON.stringify(d,null,2); await loadInstagram();
}

function setupPwaInstall(){
  const buttons = () => [$('installPwaBtn'), $('installAppBtn')].filter(Boolean);
  function setInstallButton(state){
    buttons().forEach(btn=>{
      btn.style.display='inline-flex';
      btn.disabled = state !== 'ready';
      btn.classList.toggle('install-not-ready', state !== 'ready');
      btn.textContent = state === 'ready' ? 'Install WhatsApp App' : (state === 'installed' ? 'App Installed' : 'Install not ready');
      if(state === 'not-ready') btn.style.display='none';
    });
  }
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/service-worker.js?ts=' + Date.now()).catch(()=>{});
  }
  if(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches){
    setInstallButton('installed');
    return;
  }
  setInstallButton('not-ready');
  window.addEventListener('beforeinstallprompt', ev => {
    ev.preventDefault();
    deferredInstallPrompt = ev;
    setInstallButton('ready');
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    setInstallButton('installed');
  });
  document.addEventListener('click', async (e)=>{
    const btn = e.target.closest('#installPwaBtn,#installAppBtn');
    if(!btn) return;
    e.preventDefault();
    if(!deferredInstallPrompt){ setInstallButton('not-ready'); return; }
    try{
      await deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice.catch(()=>{});
    }catch(err){}
    deferredInstallPrompt=null;
    setInstallButton('not-ready');
  });
}
setupPwaInstall();

document.addEventListener('input',e=>{ if(e.target.id==='crmSearch'||e.target.id==='crmStatusFilter') renderCrm(); if(e.target.id==='shopifyCustomerSearch') renderShopifyCustomers(); if(e.target.id==='mediaCustomerSearch') renderMediaCustomers(); if(e.target.id==='newProductSearch') renderNewProducts(); if(e.target.id==='newProductCustomerSearch') renderNewProductCustomers(); if(e.target.id==='whatsappInboxSearch') renderWhatsappInbox(); if(e.target.id==='broadcastCategory') renderBroadcastContacts(); if(e.target.dataset.flowEdit){ const flow=activeFlow(); const i=Number(e.target.dataset.flowIndex); if(flow.blocks&&flow.blocks[i]){ flow.blocks[i][e.target.dataset.flowEdit]=e.target.value; } } const i=e.target.dataset.i,field=e.target.dataset.field; if(i===undefined||!field)return; if(field==='keywords') faqs[i].keywords=e.target.value.split(',').map(x=>x.trim()).filter(Boolean); if(field==='answer') faqs[i].answer=e.target.value; });
document.addEventListener('change',e=>{ if(e.target.id==='selectAllShopifyCustomers'||e.target.id==='selectAllCustomersTop'){ document.querySelectorAll('.cust-check').forEach(cb=>cb.checked=e.target.checked); if($('selectAllShopifyCustomers')) selectAllShopifyCustomers.checked=e.target.checked; } if(e.target.id==='selectAllMediaCustomers'){ document.querySelectorAll('.media-cust-check').forEach(cb=>cb.checked=e.target.checked); } if(e.target.id==='selectAllProductPromoCustomers'){ document.querySelectorAll('.promo-cust-check').forEach(cb=>cb.checked=e.target.checked); } if(e.target.dataset.promoProduct){ selectedPromoProductId=e.target.dataset.promoProduct; renderNewProducts(); } if(e.target.dataset.inboxSelect){ selectedWhatsappInboxId=e.target.dataset.inboxSelect; const m=whatsappInboxMessages.find(x=>String(x.id)===String(selectedWhatsappInboxId)); if(m && $('whatsappReplyPhone')) whatsappReplyPhone.value=inboxPhone(m); renderWhatsappInbox(); } if(e.target.dataset.inboxPhone){ selectedWhatsappInboxId=e.target.dataset.inboxPhone; if($('whatsappReplyPhone')) whatsappReplyPhone.value=e.target.dataset.inboxPhone; renderWhatsappInbox(); } if(e.target.id==='whatsappInboxSearch'){ selectWhatsappSearchCustomer(); renderWhatsappInbox(); } if(e.target.id==='whatsappInboxDays'){ localStorage.setItem('tsgWhatsappInboxDays', e.target.value); loadWhatsappInbox(); } if(e.target.id==='autoRefreshInterval'){ localStorage.setItem('tsgAdminAutoRefreshSec', e.target.value); scheduleAdminAutoRefresh(); } if(e.target.id==='broadcastTemplate'){ const opt=e.target.selectedOptions[0]; if(opt && opt.dataset.lang && $('broadcastTemplateLang')) broadcastTemplateLang.value=opt.dataset.lang; } if(e.target.id==='broadcastSelectAll'){ document.querySelectorAll('.broadcast-check').forEach(cb=>cb.checked=e.target.checked); renderBroadcastContacts(); } if(e.target.id==='broadcastCsvFile' && e.target.files && e.target.files[0]){ readBroadcastCsvFile(e.target.files[0]).then(txt=>{ broadcastContacts=dedupeBroadcastContacts(broadcastContacts.concat(parseContactText(txt))); renderBroadcastContacts(); }); } });
document.addEventListener('click',async e=>{

  if(e.target.classList && e.target.classList.contains('contact-tab')){ const target=e.target.dataset.target; const mode=e.target.dataset.contactFilter || 'with'; if(target==='crm'){ crmContactFilter=mode; renderCrm(); } if(target==='lead'){ leadContactFilter=mode; renderLeads(); } if(target==='activity'){ activityContactFilter=mode; renderEvents(); } return; }
  if(e.target.dataset.toastClose){ const t=$('adminNotificationToast'); if(t) t.classList.add('hidden'); }
  if(e.target.dataset.toastOpen){ selectedWhatsappInboxId=e.target.dataset.toastOpen; showTab('whatsappInboxPanel'); renderWhatsappInbox(); const t=$('adminNotificationToast'); if(t) t.classList.add('hidden'); }
  if(e.target.closest('#logoutBtn')){ e.preventDefault(); return logout(); }
  if(e.target.classList.contains('tab-btn')){ e.preventDefault(); if(e.target.id==='openGoogleSheetTab'){ if(googleSheetUrl){ window.open(googleSheetUrl,'_blank','noopener'); } else { alert('Google Sheet link not configured. Please add it in API Settings.'); } return showTab(e.target.dataset.tab); } return showTab(e.target.dataset.tab); }
  if(e.target.id==='addFaq'){faqs.push({keywords:['new keyword'],answer:'New answer'});renderFaqs();}
  if(e.target.dataset.remove!==undefined){faqs.splice(Number(e.target.dataset.remove),1);renderFaqs();}
  if(e.target.id==='saveFaqs'){await fetch('/api/faqs',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({faqs})});alert('FAQs saved');}
  if(e.target.id==='saveSettings'){ const body={welcomeMessage:welcomeMessage.value,fallbackMessage:fallbackMessage.value,leadOfferMessage:leadOfferMessage.value,cartOfferMessage:cartOfferMessage.value,leadPopupDelaySeconds:Number(leadPopupDelaySeconds.value||12)}; const res=await fetch('/api/settings',{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message})); if(res.ok) alert('Settings saved.'); else alert(res.error||'Settings save failed'); }
  if(e.target.id==='refreshCrm') loadCrm();
  if(e.target.id==='exportCrmCsv') exportCrmCsv();
  if(e.target.id==='syncGoogleSheets'){ const data=await fetch('/api/sync-google-sheets',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message})); if($('crmSyncResult')) crmSyncResult.textContent=JSON.stringify(data,null,2); }
  if(e.target.dataset.crmSave) saveCrm(e.target.dataset.crmSave);
  if(e.target.id==='refreshShopifyCustomers') loadShopifyCustomers();
  if(e.target.dataset.openCustomer) openCustomerTool(e.target.dataset.openCustomer);
  if(e.target.id==='sendBulkCustomerMessage') bulkCustomerMessage(false);
  if(e.target.id==='saveBulkCustomerFollowup') bulkCustomerMessage(true);
  if(e.target.id==='refreshNewProducts') loadNewProducts();
  if(e.target.id==='sendNewProductPromo') sendNewProductPromo();
  if(e.target.id==='uploadMedia') uploadMedia();
  if(e.target.id==='refreshMedia') loadMedia(); if(e.target.id==='refreshMediaCustomers') loadMediaCustomers();
  if(e.target.id==='sendSelectedMedia') sendSelectedMedia();
  if(e.target.id==='sendAllMediaCustomers'){ if($('mediaSendTo')) mediaSendTo.value='all_shopify_customers'; sendSelectedMedia(); }
  if(e.target.id==='clearSelectedMedia'){ selectedMediaIds=[]; selectedMediaId=''; renderSelectedMedia(); renderWhatsappReplyImages(); loadMedia(); }
  if(e.target.dataset.selectMedia){ const id=e.target.dataset.selectMedia; if(selectedMediaIds.includes(id)) selectedMediaIds=selectedMediaIds.filter(x=>x!==id); else selectedMediaIds.push(id); selectedMediaId=selectedMediaIds[0]||''; loadMedia(); }
  if(e.target.dataset.removeSelectedMedia){ const id=e.target.dataset.removeSelectedMedia; selectedMediaIds=selectedMediaIds.filter(x=>x!==id); selectedMediaId=selectedMediaIds[0]||''; loadMedia(); }
  if(e.target.dataset.fillMediaPhone){ const c=shopifyCustomers.find(x=>String(x.id)===String(e.target.dataset.fillMediaPhone)); if(c && $('mediaPhone')){ mediaPhone.value=c.phone||''; if($('mediaSendTo')) mediaSendTo.value='custom'; } }
  if(e.target.dataset.deleteMedia){ if(confirm('Delete this image from library?')){ await fetch('/api/media-images/'+encodeURIComponent(e.target.dataset.deleteMedia),{method:'DELETE',credentials:'include'}); selectedMediaIds=selectedMediaIds.filter(x=>x!==e.target.dataset.deleteMedia); if(selectedMediaId===e.target.dataset.deleteMedia) selectedMediaId=selectedMediaIds[0]||''; loadMedia(); } }
  if(e.target.dataset.inboxPhone){ selectedWhatsappInboxId=e.target.dataset.inboxPhone; if($('whatsappReplyPhone')) whatsappReplyPhone.value=e.target.dataset.inboxPhone; renderWhatsappInbox(); }
  if(e.target.id==='refreshWhatsappInbox') loadWhatsappInbox();
  if(e.target.id==='sendWhatsappInboxReply') sendWhatsappInboxReply();
  if(e.target.id==='markWhatsappInboxRead') selectedWhatsappInboxId && selectedWhatsappInboxId.length>20 ? markWhatsappInboxRead(selectedWhatsappInboxId) : markWhatsappThreadRead(selectedWhatsappInboxId);
  if(e.target.dataset.replyPhone){ if($('whatsappReplyPhone')) whatsappReplyPhone.value=e.target.dataset.replyPhone; showTab('whatsappInboxPanel'); }
  if(e.target.dataset.markInboxRead) markWhatsappInboxRead(e.target.dataset.markInboxRead);
  if(e.target.dataset.markThreadRead) markWhatsappThreadRead(e.target.dataset.markThreadRead);
  if(e.target.id==='clearWhatsappInboxRange') clearWhatsappInbox(false);
  if(e.target.id==='clearWhatsappInboxAll') clearWhatsappInbox(true);
  if(e.target.dataset.addShopifyPhone) addWhatsappCustomerToShopify(e.target.dataset.addShopifyPhone, e.target.dataset.addShopifyName || 'WhatsApp Customer');
  if(e.target.id==='loadBroadcastContacts') importShopifyToBroadcast();
  if(e.target.id==='importBroadcastPaste') importBroadcastPaste();
  if(e.target.id==='clearBroadcastContacts'){ broadcastContacts=[]; renderBroadcastContacts(); }
  if(e.target.id==='sendBroadcastNow') createBroadcast();
  if(e.target.id==='refreshBroadcasts') loadBroadcasts();
  if(e.target.id==='saveWhatsappChatbot') saveWhatsappChatbotSettings();
  if(e.target.id==='saveWaThreadMeta') saveWaThreadMeta();
  if(e.target.id==='saveChatbotFlow') saveChatbotFlow();
  if(e.target.id==='addFlowBlock') addFlowBlock('message');
  if(e.target.dataset.flowBlock) addFlowBlock(e.target.dataset.flowBlock);
  if(e.target.dataset.flowRemove!==undefined){ const flow=activeFlow(); flow.blocks.splice(Number(e.target.dataset.flowRemove),1); renderFlowBuilder(); }
  if(e.target.dataset.flowMove){ const flow=activeFlow(); const i=Number(e.target.dataset.flowIndex); const j=e.target.dataset.flowMove==='up'?i-1:i+1; if(flow.blocks && flow.blocks[i] && flow.blocks[j]){ [flow.blocks[i],flow.blocks[j]]=[flow.blocks[j],flow.blocks[i]]; renderFlowBuilder(); } }
  if(e.target.id==='refreshPhase2Analytics') loadPhase2Analytics();
  if(e.target.id==='saveQuickReplySettings') saveQuickReplySettings();
  if(e.target.dataset.campaignAction) campaignAction(e.target.dataset.campaignId, e.target.dataset.campaignAction);
  if(e.target.id==='refreshDrips') loadDrips();
  if(e.target.id==='saveDripCampaign') saveDrip();
  if(e.target.id==='refreshInstagramInbox') loadInstagram();
  if(e.target.id==='saveInstagramSettings') saveInstagramSettings();
  if(e.target.id==='sendInstagramReply') sendInstagramReply();
  if(e.target.id==='mockInstagramMessage') mockInstagramMessage();
  if(e.target.dataset.igReplyTo){ if($('igReplyTo')) igReplyTo.value=e.target.dataset.igReplyTo; showTab('instagramInboxPanel'); }

  if(e.target.id==='refreshLeads') loadLeads(); if(e.target.id==='refreshEvents') loadEvents(); if(e.target.id==='refreshMsgs') loadMessages();
});

// ---------- Final WATI style unified Team Inbox override ----------
let messengerMessages = [];
let selectedWhatsappAttachment = null;
const emojiCategories = {
  smileys:['😀','😃','😄','😁','😊','🙂','😍','🥰','😘','😎','🤩','😇','😔','😢'],
  love:['❤️','💕','💖','💝','💐','🌹','🥰','😍'],
  thanks:['🙏','🙌','👏','👍','👌','✅','🤝'],
  gifts:['🎁','🛍️','✨','⭐','🎉','🎊','🔥'],
  delivery:['🚚','📦','🛵','📍','⏰','✅','❌'],
  payment:['💰','💳','₹','🧾','💵'],
  review:['⭐','⭐⭐⭐⭐⭐','👍','📸','💬']
};
const quickEmojis = Object.values(emojiCategories).flat();
let teamInboxChannelFilter = 'all'; try{ localStorage.setItem('tsgTeamInboxChannel','all'); }catch(e){}
function channelOfGroup(g){ return g.channel || (String(g.phone||'').startsWith('instagram:')?'instagram':String(g.phone||'').startsWith('messenger:')?'messenger':'whatsapp'); }
function channelLabel(ch){ return ch==='instagram'?'Instagram':(ch==='messenger'?'Messenger':'WhatsApp'); }
function channelBadge(ch){ return `<span class="channel-badge ${esc(ch)}">${esc(channelLabel(ch))}</span>`; }
function socialMessageText(m){ return m.text || m.message || m.body || m.caption || ''; }
function buildSocialGroups(messages, channel){
  const map=new Map();
  (messages||[]).forEach(m=>{
    const key=String(m.username||m.from||m.to||m.sender||m.id||channel+'_user');
    const phone=channel+':'+key;
    if(!map.has(phone)) map.set(phone,{phone,channel,customerName:key,shopifyOnly:false,shopifyCustomer:null,messages:[],unread:0,lastAt:m.createdAt||m.updatedAt||new Date().toISOString()});
    const g=map.get(phone);
    const msg=Object.assign({},m,{channel, phone, body:socialMessageText(m), direction:m.direction||'inbound'});
    g.messages.push(msg);
    g.lastAt=msg.createdAt||g.lastAt;
    if(msg.direction!=='outbound' && String(msg.status||'').toLowerCase()!=='read') g.unread++;
  });
  return Array.from(map.values()).map(g=>{ g.messages.sort((a,b)=>new Date(a.createdAt||0)-new Date(b.createdAt||0)); return g; });
}

function fileToDataUrl(file){ return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=()=>reject(r.error||new Error('File read failed')); r.readAsDataURL(file); }); }
function setAttachmentLabel(){
  const el=$('whatsappAttachmentLabel'); if(!el) return;
  if(!selectedWhatsappAttachment){ el.innerHTML=''; return; }
  const name=selectedWhatsappAttachment.originalName||selectedWhatsappAttachment.filename||selectedWhatsappAttachment.type||'file';
  const url=selectedWhatsappAttachment.absoluteUrl||selectedWhatsappAttachment.url||'';
  const isImg=String(selectedWhatsappAttachment.mime||'').startsWith('image/') || selectedWhatsappAttachment.type==='image';
  el.innerHTML = `${isImg?'Image ready':'Document ready'}: ${esc(name)} ${isImg&&url?`<img src="${esc(url)}" class="attachment-thumb" alt="">`:''}`;
}
async function uploadWhatsappMediaFile(file, type){
  if(!file) return;
  const dataUrl=await fileToDataUrl(file);
  if($('whatsappInboxResult')) whatsappInboxResult.textContent='Uploading '+type+'...';
  if($('whatsappReplyResult')){ whatsappReplyResult.classList.remove('hidden'); whatsappReplyResult.textContent='Uploading '+type+'...'; }
  const d=await fetch('/api/whatsapp-inbox/upload-media',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataUrl,filename:file.name,type})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if(!d.ok){ if($('whatsappInboxResult')) whatsappInboxResult.textContent=JSON.stringify(d,null,2); alert(d.error||'Upload failed'); return; }
  selectedWhatsappAttachment=Object.assign({},d.file,{absoluteUrl:d.url,type, originalName:file.name});
  setAttachmentLabel();
  if($('whatsappInboxResult')) whatsappInboxResult.textContent=JSON.stringify({ok:true,message:type+' ready to send',file:d.file,url:d.url},null,2);
  if($('whatsappReplyResult')) whatsappReplyResult.textContent=type+' ready to send';
}
function insertEmojiToReply(emoji){
  const txt=$('whatsappReplyText'); if(!txt) return;
  const start=txt.selectionStart||txt.value.length, end=txt.selectionEnd||txt.value.length;
  txt.value=txt.value.slice(0,start)+emoji+txt.value.slice(end);
  txt.focus(); txt.selectionStart=txt.selectionEnd=start+emoji.length;
  const recent=JSON.parse(localStorage.getItem('tsgRecentEmojis')||'[]').filter(x=>x!==emoji);
  recent.unshift(emoji); localStorage.setItem('tsgRecentEmojis', JSON.stringify(recent.slice(0,18)));
}
function addEmojiToReply(){
  let picker=$('emojiPickerPanel');
  if(!picker){
    picker=document.createElement('div'); picker.id='emojiPickerPanel'; picker.className='emoji-picker-panel hidden';
    document.body.appendChild(picker);
  }
  const recent=JSON.parse(localStorage.getItem('tsgRecentEmojis')||'[]');
  const groups=[['Recent',recent],['Smileys',emojiCategories.smileys],['Love',emojiCategories.love],['Thanks',emojiCategories.thanks],['Gift/Offer',emojiCategories.gifts],['Delivery',emojiCategories.delivery],['Payment',emojiCategories.payment],['Review',emojiCategories.review]];
  picker.innerHTML=groups.filter(g=>g[1]&&g[1].length).map(([name,arr])=>`<div class="emoji-cat"><b>${esc(name)}</b><div>${arr.map(em=>`<button type="button" data-pick-emoji="${esc(em)}">${esc(em)}</button>`).join('')}</div></div>`).join('');
  const btn=document.querySelector('[data-wa-emoji], #waEmojiBtn');
  const r=btn?.getBoundingClientRect();
  picker.style.left=((r?.left||20))+'px'; picker.style.top=((r?.top||window.innerHeight-260)-230)+'px';
  picker.classList.toggle('hidden');
}

function renderChannelTabs(){
  document.querySelectorAll('.channel-tab').forEach(btn=>btn.classList.toggle('active', btn.dataset.channelFilter===teamInboxChannelFilter));
}
function renderChatList(groups){
  const list=$('whatsappChatList') || $('whatsappInboxList');
  if(!list) return;
  renderChannelTabs();
  list.innerHTML=groups.map(g=>{
    const selected=String(selectedWhatsappInboxId)===String(g.phone);
    const name=chatNameForGroup(g);
    const ch=channelOfGroup(g);
    const last=g.messages[g.messages.length-1]||{};
    const preview=g.shopifyOnly ? 'Shopify customer - no chat yet' : (messageText(last) || socialMessageText(last) || last.status || '');
    const known=ch==='whatsapp' && (shopifyHasPhone(g.phone) || !!g.shopifyOnly);
    return `<button type="button" class="wa-chat-item wati-conversation ${selected?'active':''} ${g.unread?'unread':''} ${g.shopifyOnly?'shopify-only':''}" data-inbox-phone="${esc(g.phone)}">
      <span class="wa-avatar ${esc(ch)}">${esc(initials(name,g.phone))}</span>
      <span class="wa-chat-meta">
        <span class="wa-chat-title"><b>${esc(name)}</b>${g.unread?`<em>${g.unread}</em>`:''}</span>
        <span class="wa-chat-preview">${esc(preview || 'No message')}</span>
        <span class="wa-chat-sub">${channelBadge(ch)} ${ch==='whatsapp'?esc(g.phone)+' • '+(known?'Shopify':'Not in Shopify'):esc(g.phone.replace(ch+':',''))}</span>
      </span>
      <span class="wa-chat-time">${esc(g.shopifyOnly ? 'Shopify' : timeShort(last.createdAt||g.lastAt))}</span>
    </button>`;
  }).join('') || '<div class="wa-empty-list">No conversations yet.</div>';
}
function contactPanelHtml(group, name, known, linkedCustomer, meta){
  const ch=channelOfGroup(group);
  const displayId=String(group.phone||'').replace(/^instagram:/,'').replace(/^messenger:/,'');
  const logs=[];
  const msgs=(group.messages||[]).slice(-8).reverse();
  msgs.forEach(m=>logs.push({at:m.createdAt||'', text:`${m.direction==='inbound'?'Customer':'Business'}: ${(messageText(m)||socialMessageText(m)||m.status||'message').slice(0,90)}`}));
  if(linkedCustomer) logs.unshift({at:linkedCustomer.lastOrderDate||'', text:`Shopify customer • Orders: ${linkedCustomer.ordersCount||0}`});
  if(!known && ch==='whatsapp') logs.unshift({at:'', text:'Not in Shopify - add customer from button above'});
  const logHtml=logs.map(l=>`<div class="activity-log-row"><b>${esc(l.text)}</b><small>${esc(l.at?timeShort(l.at):'')}</small></div>`).join('') || '<p class="hint">No activity log yet.</p>';
  return `<button type="button" class="mobile-info-close" data-close-mobile-info>×</button><div class="contact-head"><span class="wa-avatar ${esc(ch)}">${esc(initials(name,displayId))}</span><div><h3>${esc(name)}</h3>${channelBadge(ch)} <span class="status-pill ${esc(meta.status||'open')}">${esc(meta.status||'open')}</span></div></div>
  <div class="contact-info-list">
    <div><b>Channel</b><span>${esc(channelLabel(ch))}</span></div>
    <div><b>${ch==='whatsapp'?'Phone':'User ID'}</b><span>${esc(displayId)}</span></div>
    <div><b>Shopify</b><span>${ch==='whatsapp'?(known?'Customer':'Not added'):'CRM Lead only'}</span></div>
    ${linkedCustomer?`<div><b>Email</b><span>${esc(linkedCustomer.email||'-')}</span></div><div><b>Orders</b><span>${esc(linkedCustomer.ordersCount||0)}</span></div><div><b>Last Order</b><span>${esc(linkedCustomer.lastOrderDate||'-')}</span></div>`:''}
  </div>
  <div class="contact-log-box"><div class="section-head mini"><div><h3>Customer Activity Log</h3><p>Latest chat, Shopify and delivery activity.</p></div></div><div class="activity-log-list">${logHtml}</div></div>`;
}
function renderActiveChat(group){
  const pane=$('whatsappActiveChat');
  if(!pane) return;
  const action=$('whatsappShopifyAction');
  const right=$('waContactPanel');
  if(!group){ document.body.classList.remove('wa-mobile-chat-open'); pane.className='wa-active-chat empty-state wati-chat-window'; pane.innerHTML='Select a customer chat from the left side.'; if(action) action.innerHTML=''; if(right) right.innerHTML='<h3>Contact Info</h3><p class="hint">Select chat to view customer details.</p>'; return; }
  const ch=channelOfGroup(group);
  const linkedCustomer=ch==='whatsapp' ? (shopifyCustomerByPhone(group.phone) || group.shopifyCustomer || null) : null;
  const meta=teamInboxMeta[group.phone] || group.meta || {status:'open',agent:'',tags:[],note:''};
  const known=ch==='whatsapp' && (!!linkedCustomer || shopifyHasPhone(group.phone));
  const name=linkedCustomer?.name || chatNameForGroup(group);
  const messages=group.messages||[];
  let lastDate='';
  const bubbles=messages.map(m=>{
    const dlab=dateLabel(m.createdAt);
    const dateSep=dlab && dlab!==lastDate ? (lastDate=dlab, `<div class="wa-date-sep">${esc(dlab)}</div>`) : '';
    let dir=m.direction==='inbound'?'inbound':(m.direction==='outbound'?'outbound':'status');
    const txt=messageText(m) || socialMessageText(m);
    const extra=m.imageUrl||m.image||m.productImage||'';
    const st=String(m.status||m.statusType||'').toLowerCase();
    if(dir==='status' && txt && !['sent','delivered','read','failed','queued'].includes(st)) dir='inbound';
    if(dir==='status') return `${dateSep}<div class="wa-status-line">${esc((statusLabel(m).replace(/^Status:\s*/,''))||'status')} • ${esc(timeShort(m.createdAt))}</div>`;
    return `${dateSep}<div class="wa-bubble ${dir}">${extra?`<img src="${esc(extra)}" alt="" class="wa-bubble-img"/>`:''}<div class="wa-message-text">${esc(txt || '[message]')}</div><div class="wa-msg-time">${esc(timeShort(m.createdAt))}${dir==='outbound'?' ✓✓':''}</div></div>`;
  }).join('');
  pane.className='wa-active-chat wati-chat-window';
  pane.innerHTML=`<div class="wati-chat-header mobile-wa-topbar"><button type="button" class="mobile-back-btn" data-mobile-chat-back>←</button><span class="wa-avatar ${esc(ch)}">${esc(initials(name,group.phone))}</span><div class="mobile-chat-title"><h3>${esc(name)}</h3><span><i></i> Online • ${channelBadge(ch)} ${esc(String(group.phone).replace(/^instagram:/,'').replace(/^messenger:/,''))}</span></div><div class="inline-actions"><button class="ghost-btn compact-btn desktop-only-action" type="button" data-mark-thread-read="${esc(group.phone)}">Mark Read</button><button class="mobile-icon-btn" type="button" data-mobile-info>⌾</button><button class="mobile-icon-btn" type="button">⋮</button></div></div><div class="wa-message-area wati-message-area">${bubbles || '<div class="wa-date-sep">No messages yet</div>'}</div>`; document.body.classList.add('wa-mobile-chat-open');
  if(action){ action.innerHTML = ch==='whatsapp' ? (known ? `<span class="wa-shopify-inline ok">Shopify Customer</span>` : `<span class="wa-shopify-inline missing">Not in Shopify</span><button class="primary-btn compact-btn" type="button" data-add-shopify-phone="${esc(group.phone)}" data-add-shopify-name="${esc(name)}">Add to Shopify Customer</button>`) : `<span class="wa-shopify-inline ok">${esc(channelLabel(ch))} Lead</span>`; }
  if(right) right.innerHTML=contactPanelHtml(group,name,known,linkedCustomer,meta);
  if($('waThreadStatus')) waThreadStatus.value=meta.status||'open';
  if($('waThreadAgent')) waThreadAgent.value=meta.agent||'';
  if($('waThreadTags')) waThreadTags.value=(meta.tags||[]).join(', ');
  if($('waThreadNote')) waThreadNote.value=meta.note||'';
  if($('whatsappReplyPhone')) whatsappReplyPhone.value=String(group.phone).replace(/^whatsapp:/,'');
  setTimeout(()=>{ const area=pane.querySelector('.wa-message-area'); if(area) area.scrollTop=area.scrollHeight; },0);
}
function renderWhatsappInbox(){
  renderWhatsappCustomerDatalist();
  selectWhatsappSearchCustomer();
  const q=($('whatsappInboxSearch')?.value||'').toLowerCase().trim();
  const all=(whatsappInboxMessages||[]).filter(m=>m.direction==='inbound' || m.direction==='outbound' || m.direction==='status');
  let groups=groupInboxMessages(all).map(g=>Object.assign(g,{channel:'whatsapp'}));
  groups=groups.concat(buildSocialGroups(instagramMessages,'instagram'), buildSocialGroups(messengerMessages,'messenger'));
  const byPhone=new Map(groups.map(g=>[String(g.phone),g]));
  if(q && Array.isArray(shopifyCustomers)){
    for(const c of shopifyCustomers){
      const value=customerValue(c); const phone=formatWaPhone(c.phone||'');
      if(!phone || !value.includes(q) || byPhone.has(phone)) continue;
      const g=Object.assign(shopifyCustomerToInboxGroup(c),{channel:'whatsapp'}); groups.push(g); byPhone.set(phone,g);
    }
  }
  groups=groups.filter(g=>{
    if(teamInboxChannelFilter!=='all' && channelOfGroup(g)!==teamInboxChannelFilter) return false;
    if(!q) return true;
    return [g.customerName,g.phone,g.shopifyCustomer?.name,g.shopifyCustomer?.email,...(g.messages||[]).map(m=>messageText(m)||socialMessageText(m))].join(' ').toLowerCase().includes(q);
  });
  groups=groups.sort((a,b)=>new Date(b.lastAt||0)-new Date(a.lastAt||0));
  if(!selectedWhatsappInboxId && groups[0]) selectedWhatsappInboxId=groups[0].phone;
  if(selectedWhatsappInboxId && !groups.some(g=>String(g.phone)===String(selectedWhatsappInboxId)) && groups[0]) selectedWhatsappInboxId=groups[0].phone;
  if($('whatsappInboxCount')) whatsappInboxCount.textContent=groups.length;
  if($('whatsappInboxThreadCount')) whatsappInboxThreadCount.textContent=groups.length;
  renderChatList(groups);
  const group=groups.find(g=>String(g.phone)===String(selectedWhatsappInboxId));
  renderActiveChat(group);
}
async function loadWhatsappInbox(silent=false){
  const days=$('whatsappInboxDays')?.value||localStorage.getItem('tsgWhatsappInboxDays')||'7';
  const [d, metaRes, igRes, fbRes] = await Promise.all([
    fetch('/api/whatsapp-inbox?days='+encodeURIComponent(days),{credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message,messages:[]})),
    fetch('/api/team-inbox/meta',{credentials:'include'}).then(r=>r.json()).catch(()=>({meta:{}})),
    fetch('/api/instagram/inbox',{credentials:'include'}).then(r=>r.json()).catch(()=>({messages:[]})),
    fetch('/api/messenger/inbox',{credentials:'include'}).then(r=>r.json()).catch(()=>({messages:[]}))
  ]);
  if($('whatsappInboxDays')) whatsappInboxDays.value=String(d.days||days);
  whatsappInboxMessages=d.messages||[]; instagramMessages=igRes.messages||instagramMessages||[]; messengerMessages=fbRes.messages||[]; teamInboxMeta=metaRes.meta||teamInboxMeta||{};
  if(!shopifyCustomers.length) await loadShopifyCustomers().catch(()=>{});
  checkNewInboundNotifications(whatsappInboxMessages);
  if($('whatsappInboxResult') && !d.ok && !silent) whatsappInboxResult.textContent=JSON.stringify(d,null,2);
  renderWhatsappInbox();
}
async function sendWhatsappInboxReply(){
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
  if($('whatsappReplyResult')){ whatsappReplyResult.classList.remove('hidden'); whatsappReplyResult.textContent=d.ok?'Sent successfully':JSON.stringify(d,null,2); }
  if(d.ok){ if($('whatsappReplyText')) whatsappReplyText.value=''; selectedWhatsappAttachment=null; setAttachmentLabel(); if($('whatsappReplyResult')) setTimeout(()=>whatsappReplyResult.classList.add('hidden'),2500); }
  await loadWhatsappInbox();
}
document.addEventListener('click', e=>{
  const ct=e.target.closest('.channel-tab');
  if(ct){ teamInboxChannelFilter=ct.dataset.channelFilter||'all'; localStorage.setItem('tsgTeamInboxChannel',teamInboxChannelFilter); selectedWhatsappInboxId=''; renderWhatsappInbox(); }
  if(e.target.id==='enableDesktopNotifications2' || e.target.id==='enableDesktopNotifications') requestDesktopNotifications();
  if(e.target.id==='pickWhatsappEmoji') addEmojiToReply();
  if(e.target.id==='pickWhatsappImage') $('whatsappImageFile')?.click();
  if(e.target.id==='pickWhatsappDocument') $('whatsappDocumentFile')?.click();
});

async function loadMessengerSettings(){
  const d=await fetch('/api/messenger/settings',{credentials:'include'}).then(r=>r.json()).catch(()=>({settings:{}}));
  const s=d.settings||{};
  if($('msEnabled')) msEnabled.checked=!!s.enabled;
  if($('msAutoReply')) msAutoReply.checked=!!s.autoReplyEnabled;
  [['msPageId','pageId'],['msVerifyToken','verifyToken'],['msPageAccessToken','pageAccessToken'],['msMainCatalog','mainCatalogLink']].forEach(([id,key])=>{ if($(id)) $(id).value=s[key]||''; });
}
async function saveMessengerSettings(){
  const body={enabled:!!$('msEnabled')?.checked,autoReplyEnabled:!!$('msAutoReply')?.checked,pageId:$('msPageId')?.value||'',verifyToken:$('msVerifyToken')?.value||'tinyshiny_messenger_verify',pageAccessToken:$('msPageAccessToken')?.value||'',mainCatalogLink:$('msMainCatalog')?.value||''};
  const d=await fetch('/api/messenger/settings',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('messengerResult')) messengerResult.textContent=JSON.stringify(d,null,2);
}
async function mockMessengerMessage(){
  const text=prompt('Test Messenger message text','catalog'); if(text===null) return;
  const username=prompt('Facebook sender ID/name','facebook_customer')||'facebook_customer';
  const d=await fetch('/api/messenger/inbox/mock',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,text})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('messengerResult')) messengerResult.textContent=JSON.stringify(d,null,2);
  await loadWhatsappInbox(true);
}
setTimeout(()=>loadMessengerSettings().catch(()=>{}),0);
document.addEventListener('click', e=>{ if(e.target.id==='saveMessengerSettings') saveMessengerSettings(); if(e.target.id==='mockMessengerMessage') mockMessengerMessage(); });



// ---------- Patch: WATI panel stable click/open + header API button ----------
(function(){
  function pickConversationButton(el){ return el && el.closest ? el.closest('[data-inbox-phone]') : null; }
  document.addEventListener('click', function(e){
    const btn = pickConversationButton(e.target);
    if(btn){
      e.preventDefault();
      e.stopPropagation();
      selectedWhatsappInboxId = btn.dataset.inboxPhone || '';
      if($('whatsappReplyPhone')) whatsappReplyPhone.value = selectedWhatsappInboxId.replace(/^instagram:/,'').replace(/^messenger:/,'');
      renderWhatsappInbox();
      return false;
    }
  }, true);

  const oldRenderActiveChat = window.renderActiveChat || renderActiveChat;
  renderActiveChat = function(group){
    const pane=$('whatsappActiveChat');
    const action=$('whatsappShopifyAction');
    const right=$('waContactPanel');
    if(!pane) return oldRenderActiveChat(group);
    if(!group){
      pane.className='wa-active-chat empty-state wati-chat-window';
      pane.innerHTML='<div class="wati-empty-center">Select a customer chat from the left side.</div>';
      if(action) action.innerHTML='';
      if(right) right.innerHTML='<h3>Contact details</h3><p class="hint">Select chat to view customer details.</p>';
      return;
    }
    const ch = (typeof channelOfGroup==='function') ? channelOfGroup(group) : 'whatsapp';
    const linkedCustomer = ch==='whatsapp' ? (shopifyCustomerByPhone(group.phone) || group.shopifyCustomer || null) : null;
    const meta = teamInboxMeta[group.phone] || group.meta || {status:'open',agent:'',tags:[],note:''};
    const known = ch==='whatsapp' && (!!linkedCustomer || shopifyHasPhone(group.phone));
    const name = linkedCustomer?.name || chatNameForGroup(group);
    let lastDate='';
    const messages = (group.messages||[]).slice().sort((a,b)=>new Date(a.createdAt||0)-new Date(b.createdAt||0));
    const bubbles = messages.map(m=>{
      const dlab=dateLabel(m.createdAt);
      const dateSep=dlab && dlab!==lastDate ? (lastDate=dlab, `<div class="wa-date-sep">${esc(dlab)}</div>`) : '';
      let dir=m.direction==='inbound'?'inbound':(m.direction==='outbound'?'outbound':'status');
      const txt=(messageText(m) || (typeof socialMessageText==='function'?socialMessageText(m):'') || '').trim();
      const st=String(m.status||m.statusType||'').toLowerCase();
      const extra=m.imageUrl||m.image||m.productImage||'';
      if(dir==='status' && txt && !['sent','delivered','read','failed','queued'].includes(st)) dir='inbound';
      if(dir==='status'){
        const label=(statusLabel(m).replace(/^Status:\s*/,'')||'status');
        return `${dateSep}<div class="wa-status-line">${esc(label)} • ${esc(timeShort(m.createdAt))}</div>`;
      }
      return `${dateSep}<div class="wa-bubble ${dir}">${extra?`<img src="${esc(extra)}" alt="" class="wa-bubble-img"/>`:''}<div class="wa-message-text">${esc(txt || '[message]')}</div><div class="wa-msg-time">${esc(timeShort(m.createdAt))}${dir==='outbound'?' ✓✓':''}</div></div>`;
    }).join('');
    pane.className='wa-active-chat wati-chat-window';
    document.body.classList.add('wa-mobile-chat-open');
    pane.innerHTML=`
      <div class="wati-chat-header mobile-wa-topbar">
        <button type="button" class="mobile-back-btn" data-mobile-chat-back>← Back</button>
        <div class="contact-head"><span class="wa-avatar ${esc(ch)}">${esc(initials(name,group.phone))}</span><div><h3>${esc(name)}</h3><span>${(typeof channelBadge==='function'?channelBadge(ch):'')} ${esc(String(group.phone).replace(/^instagram:/,'').replace(/^messenger:/,''))}</span></div></div>
        <div class="wati-chat-tools">
          <select id="waThreadStatusTop" class="status-mini-select"><option value="open">Open</option><option value="pending">Pending</option><option value="resolved">Resolved</option></select>
          <button class="ghost-btn compact-btn" type="button" data-mark-thread-read="${esc(group.phone)}">Mark Read</button>
        </div>
      </div>
      <div class="wa-message-area wati-message-area">${bubbles || '<div class="wa-date-sep">No messages yet</div>'}</div>`;
    if($('waThreadStatusTop')) waThreadStatusTop.value=meta.status||'open';
    if(action){ action.innerHTML = ch==='whatsapp' ? (known ? `<span class="wa-shopify-inline ok">Shopify Customer</span>` : `<span class="wa-shopify-inline missing">Not in Shopify</span><button class="primary-btn compact-btn" type="button" data-add-shopify-phone="${esc(group.phone)}" data-add-shopify-name="${esc(name)}">Add to Shopify Customer</button>`) : `<span class="wa-shopify-inline ok">${esc(typeof channelLabel==='function'?channelLabel(ch):ch)} Lead</span>`; }
    if(right){
      if(typeof contactPanelHtml==='function') right.innerHTML=contactPanelHtml(group,name,known,linkedCustomer,meta);
      else right.innerHTML=`<h3>Contact details</h3><p>${esc(name)}</p>`;
    }
    if($('waThreadStatus')) waThreadStatus.value=meta.status||'open';
    if($('waThreadAgent')) waThreadAgent.value=meta.agent||'';
    if($('waThreadTags')) waThreadTags.value=(meta.tags||[]).join(', ');
    if($('waThreadNote')) waThreadNote.value=meta.note||'';
    if($('whatsappReplyPhone')) whatsappReplyPhone.value=String(group.phone).replace(/^instagram:/,'').replace(/^messenger:/,'');
    setTimeout(()=>{ const area=pane.querySelector('.wa-message-area'); if(area) area.scrollTop=area.scrollHeight; },0);
  };

  document.addEventListener('change', function(e){
    if(e.target && e.target.id==='waThreadStatusTop'){
      const s=$('waThreadStatus'); if(s) s.value=e.target.value;
      if(typeof saveWaThreadMeta==='function') saveWaThreadMeta();
    }
  });
})();




// ---------- Shopify Sales Analysis / Meta campaign reports ----------
function shortText(s,n=60){ s=String(s||''); return s.length>n ? s.slice(0,n-3)+'...' : s; }
function renderSalesMoney(v){ return '₹' + Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0}); }
function salesPercent(v){ return Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:1}) + '%'; }
function tableHtml(headers, rows){ return `<table class="customer-table sales-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):'<tr><td colspan="'+headers.length+'">No data</td></tr>'}</tbody></table>`; }
function renderMiniBars(items, valueKey='sales', labelKey='date'){
  const max=Math.max(1,...items.map(x=>Number(x[valueKey]||0)));
  return `<div class="bar-chart">${items.map(x=>`<div class="bar-row"><span>${esc(x[labelKey]||'')}</span><div><i style="width:${Math.max(3,Number(x[valueKey]||0)/max*100)}%"></i></div><b>${renderSalesMoney(x[valueKey])}</b></div>`).join('')}</div>`;
}

function renderCampaignGraphs(campaigns=[]){
  const top=(campaigns||[]).slice(0,8);
  if(!top.length) return '<div class="hint">No Meta campaign data available.</div>';
  return `<div class="campaign-mini-grid">
    <div><h4>Campaign Spend</h4>${renderMiniBars(top.map(c=>({date:shortText(c.name,24),sales:c.spend})),'sales','date')}</div>
    <div><h4>Campaign ROAS</h4>${renderMiniBars(top.map(c=>({date:shortText(c.name,24),sales:Number(c.roas||0)*100})),'sales','date')}</div>
    <div><h4>Cost / Net Order</h4>${renderMiniBars(top.map(c=>({date:shortText(c.name,24),sales:c.costPerNetOrder||0})),'sales','date')}</div>
  </div>`;
}

function renderPaymentDonut(d){ const cod=Number(d.codOrders||0), prepaid=Number(d.prepaidOrders||0), total=Math.max(1,cod+prepaid); const codPct=Math.round(cod/total*100); return `<div class="donut" style="--p:${codPct}"><b>${codPct}%</b><span>COD</span></div><div class="donut-legend"><span><i></i> COD: ${cod}</span><span><i></i> Prepaid: ${prepaid}</span></div>`; }
function renderShopifySalesAnalysis(){
  const d=shopifySalesAnalysis||{}; const s=d.summary||{};
  if($('salesSummary')) salesSummary.innerHTML=[
    ['Total Sales',renderSalesMoney(s.totalSales)],['Total Orders',s.totalOrders||0],['Return Orders',s.returnOrders||0],['Net Orders',s.netOrders||0],['Net Sales',renderSalesMoney(s.netSales||s.totalSales)],['Average Order Value',renderSalesMoney(s.averageOrderValue)],['Meta Spend',renderSalesMoney(s.metaSpend)],['Meta Cost / Total Order',renderSalesMoney(s.metaCostPerTotalOrder)],['Meta Cost / Net Order',renderSalesMoney(s.metaCostPerNetOrder||s.costPerOrder)],['Meta Cost / Revenue %',salesPercent(s.metaCostRevenuePct)],['ROAS',Number(s.roas||0).toFixed(2)+'x'],['Estimated Profit',renderSalesMoney(s.estimatedProfit)]
  ].map(x=>`<div class="sales-kpi"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('');
  if($('salesDailyChart')) salesDailyChart.innerHTML=renderMiniBars(d.daily||[],'sales','date');
  if($('salesPaymentChart')) salesPaymentChart.innerHTML=renderPaymentDonut(s);
  if($('salesCampaignTable')){ if(!$('salesCampaignGraphAuto')){ const g=document.createElement('div'); g.id='salesCampaignGraphAuto'; g.className='sales-campaign-graphs'; $('salesCampaignTable').parentNode.insertBefore(g, $('salesCampaignTable')); } salesCampaignGraphAuto.innerHTML=renderCampaignGraphs(d.campaigns||[]); }
  if($('salesCampaignTable')) salesCampaignTable.innerHTML=tableHtml(['Campaign','Spend','Impr.','Clicks','CTR','CPC','CPM','Orders','Net Orders','Revenue','Net Sales','Cost / Order','Cost / Net Order','ROAS','Profit'], (d.campaigns||[]).map(c=>[esc(shortText(c.name||'Unknown',42)),renderSalesMoney(c.spend),esc(c.impressions||0),esc(c.clicks||0),salesPercent(c.ctr),renderSalesMoney(c.cpc),renderSalesMoney(c.cpm),esc(c.orders||0),esc(c.netOrders||0),renderSalesMoney(c.revenue),renderSalesMoney(c.netSales||c.revenue),renderSalesMoney(c.costPerOrder),renderSalesMoney(c.costPerNetOrder),Number(c.roas||0).toFixed(2)+'x',renderSalesMoney(c.profitEstimate)]));
  if($('salesOrderCostTable')) salesOrderCostTable.innerHTML=tableHtml(['Order','Date','Payment','Amount','Shipping','Meta Cost','Net Profit'], (d.orders||[]).filter(o=>!String(o.status||'').toLowerCase().includes('cancel')).slice(0,60).map(o=>[esc(o.name||o.id),esc(o.date||''),esc(o.payment||''),renderSalesMoney(o.amount),renderSalesMoney(o.shippingCost),renderSalesMoney(o.metaCost),renderSalesMoney(o.estimatedProfit)]));
  if($('salesProductTable')) salesProductTable.innerHTML=tableHtml(['SKU','Product','Qty','Revenue'], (d.products||[]).slice(0,50).map(p=>[esc(p.sku||'-'),`<span title="${esc(p.title)}">${esc(shortText(p.title,58))}</span>`,esc(p.qty),renderSalesMoney(p.revenue)]));
  if($('salesCityTable')) salesCityTable.innerHTML=tableHtml(['City / State','Orders','Revenue'], (d.cities||[]).slice(0,50).map(c=>[esc(c.name),esc(c.orders),renderSalesMoney(c.revenue)]));
}
async function loadShopifySalesAnalysis(){
  const params=new URLSearchParams();
  ['salesRange','salesCampaignFilter','salesPaymentFilter','salesStatusFilter'].forEach(id=>{ if($(id) && $(id).value) params.set(id.replace('sales','').toLowerCase(), $(id).value); });
  const d=await fetch('/api/shopify/sales-analysis?'+params.toString(),{credentials:'include',cache:'no-store'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  shopifySalesAnalysis=d; renderShopifySalesAnalysis();
  if($('shopifySalesResult') && !d.ok) shopifySalesResult.textContent=JSON.stringify(d,null,2); else if($('shopifySalesResult')) shopifySalesResult.textContent='';
}
function exportShopifySalesCsv(){
  const d=shopifySalesAnalysis||{}; const rows=[['Order','Date','Payment','Amount','Shipping','Meta Cost','Estimated Profit']].concat((d.orders||[]).map(o=>[o.name||o.id,o.date||'',o.payment||'',o.amount||0,o.shippingCost||0,o.metaCost||0,o.estimatedProfit||0]));
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='shopify-sales-analysis.csv'; a.click(); URL.revokeObjectURL(a.href);
}
document.addEventListener('change', e=>{ if(['salesRange','salesPaymentFilter','salesStatusFilter','salesFromDate','salesToDate'].includes(e.target.id)) loadShopifySalesAnalysis(); });
document.addEventListener('input', e=>{ if(e.target.id==='salesCampaignFilter') clearTimeout(window.__salesFilterTimer), window.__salesFilterTimer=setTimeout(loadShopifySalesAnalysis,350); });
document.addEventListener('click', e=>{ if(e.target.id==='refreshShopifySales') loadShopifySalesAnalysis(); if(e.target.id==='exportShopifySalesCsv') exportShopifySalesCsv(); });



// ---------- NDR panel: Shiprocket + WhatsApp automation ----------
function renderNdrMoney(v){ return '₹' + Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0}); }
function ndrFilteredRows(){
  const provider=($('ndrProviderFilter')?.value||'all').toLowerCase();
  const status=($('ndrStatusFilter')?.value||'all').toLowerCase();
  const reason=($('ndrReasonFilter')?.value||'').toLowerCase().trim();
  const q=($('ndrSearch')?.value||'').toLowerCase().trim();
  return (ndrRows||[]).filter(r=>{
    if(provider!=='all' && String(r.provider||'').toLowerCase()!==provider) return false;
    if(status!=='all' && !String(r.status||'').toLowerCase().includes(status)) return false;
    if(reason && !String(r.reason||'').toLowerCase().includes(reason)) return false;
    if(q && ![r.awb,r.orderNo,r.orderNumber,r.customerName,r.phone,r.reason,r.courier,r.provider].join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
}
function fillNdrSettings(){
  const s=ndrSettings||{};
  if($('ndrBeforeDeliveryEnabled')) ndrBeforeDeliveryEnabled.checked=!!s.beforeDeliveryEnabled;
  if($('ndrFailedDeliveryEnabled')) ndrFailedDeliveryEnabled.checked=!!s.failedDeliveryEnabled;
  if($('ndrReminderHours')) ndrReminderHours.value=s.reminderHours||24;
  if($('ndrAdminNumber')) ndrAdminNumber.value=s.adminNumber||'';
  if($('ndrBeforeMessage')) ndrBeforeMessage.value=s.beforeMessage||'';
  if($('ndrFailedMessage')) ndrFailedMessage.value=s.failedMessage||'';
}
function setNdrTab(status){
  window.ndrActiveStatusTab=status||'pending';
  document.querySelectorAll('[data-ndr-status-tab]').forEach(b=>b.classList.toggle('active', b.dataset.ndrStatusTab===window.ndrActiveStatusTab));
  renderNdr();
}
function ndrTrackingHtml(r){
  const logs=(r.logs||[]).map(l=>`<div class="activity-log-row"><b>${esc(l.text||'')}</b><small>${esc(l.at||'')}</small></div>`).join('');
  return `<div class="tracking-popup-body"><h3>${esc(r.orderNo||r.orderNumber||'-')} Tracking Status</h3>
    <div class="tracking-grid"><span>Provider</span><b>${esc(r.provider||'shiprocket')}</b><span>AWB</span><b>${esc(r.awb||'-')}</b><span>Order Date</span><b>${esc((r.orderDate||r.createdAt||r.ndrAt||'').slice(0,10)||'-')}</b><span>NDR Date</span><b>${esc((r.ndrAt||r.updatedAt||'').slice(0,16)||'-')}</b><span>Attempts</span><b>${esc(r.attempts||r.ndrAttempt||1)}</b><span>Reason</span><b>${esc(r.reason||'-')}</b><span>Current Status</span><b>${esc(r.status||'pending')}</b></div>
    <h4>Delivery Attempt Information</h4><p>${esc(r.attemptInfo||r.deliveryAttemptInfo||r.reason||'Delivery attempt pending / customer unreachable')}</p>
    <h4>Activity / Tracking Log</h4><div class="activity-log-list">${logs || '<p class="hint">No tracking logs yet.</p>'}</div></div>`;
}
function openNdrTracking(id){
  const r=(ndrRows||[]).find(x=>String(x.id)===String(id)); if(!r) return;
  let m=$('ndrTrackingModal');
  if(!m){ m=document.createElement('div'); m.id='ndrTrackingModal'; m.className='modal-overlay hidden'; document.body.appendChild(m); }
  m.innerHTML=`<div class="modal-card ndr-tracking-modal"><div class="section-head mini"><div>${ndrTrackingHtml(r)}</div><button class="ghost-btn" type="button" data-close-ndr-modal="1">Close</button></div></div>`;
  m.classList.remove('hidden');
}
function renderNdr(){
  const rowsAll=ndrFilteredRows();
  const active=(window.ndrActiveStatusTab||'pending');
  document.querySelectorAll('[data-ndr-status-tab]').forEach(b=>b.classList.toggle('active', b.dataset.ndrStatusTab===active));
  const rows=rowsAll.filter(r=> active==='pending' ? String(r.status||'pending').toLowerCase().includes('pending') : String(r.status||'').toLowerCase().includes(active));
  const total=rowsAll.length;
  const reattempt=rowsAll.filter(x=>String(x.status||'').toLowerCase().includes('reattempt')).length;
  const delivered=rowsAll.filter(x=>String(x.status||'').toLowerCase().includes('resolved')||String(x.status||'').toLowerCase().includes('delivered')).length;
  const rto=rowsAll.filter(x=>String(x.status||'').toLowerCase().includes('rto')).length;
  const orderCount=Math.max(total, (shopifySalesOrders||[]).length || total);
  if($('ndrSummary')) ndrSummary.innerHTML=`
    <div class="ndr-kpi"><b>${total}</b><em>${orderCount?Math.round(total/orderCount*100):0}%</em><span>Total NDR Cases out of ${orderCount} orders</span></div>
    <div class="ndr-kpi"><b>${reattempt}</b><em>${total?Math.round(reattempt/total*100):0}%</em><span>Reattempt requested / action pending</span></div>
    <div class="ndr-kpi"><b>${delivered}</b><em>${total?Math.round(delivered/total*100):0}%</em><span>Orders delivered after reattempt</span></div>
    <div class="ndr-kpi"><b>${rto}</b><em>${total?Math.round(rto/total*100):0}%</em><span>Orders RTO after max reattempts</span></div>`;
  if($('ndrTable')) ndrTable.innerHTML=`<table class="customer-table ndr-table enhanced-ndr-table"><thead><tr><th>Latest NDR</th><th>Order</th><th>Order Date</th><th>Shipping</th><th>Payment & Customer</th><th>Non Delivery Info</th><th>Latest Customer Response</th><th>Shiprocket Attempted</th><th>Action</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc((r.ndrAt||r.updatedAt||'').slice(0,16)||'-')}</td><td><button class="link-btn" data-ndr-track="${esc(r.id)}">${esc(r.orderNo||r.orderNumber||'-')}</button><br/><small>AWB: ${esc(r.awb||'-')}</small></td><td>${esc((r.orderDate||r.createdAt||r.ndrAt||'').slice(0,10)||'-')}</td><td>${esc(r.provider||'shiprocket')}<br/><small>${esc(r.courier||'')}</small></td><td><b>${esc(r.customerName||'-')}</b><br/><small>${esc(r.phone||'-')}</small></td><td>${esc(r.reason||'-')}<br/><small>Attempt: ${esc(r.attempts||r.ndrAttempt||1)}</small></td><td>${esc(r.customerResponse||r.latestCustomerResponse||'-')}</td><td>${esc(r.attemptInfo||r.deliveryAttemptInfo||r.status||'pending')}</td><td><button class="ghost-btn compact-btn" data-ndr-wa="${esc(r.id)}" data-ndr-type="before">Before</button><button class="primary-btn compact-btn" data-ndr-wa="${esc(r.id)}" data-ndr-type="failed">NDR Msg</button><button class="ghost-btn compact-btn" data-ndr-reattempt="${esc(r.id)}">Reattempt</button></td></tr>`).join(''):'<tr><td colspan="9"><div class="empty-ndr-state"><b>No data available</b><br/>Sync Shiprocket ya filters change karein.</div></td></tr>'}</tbody></table>`;
  const logs=[]; rowsAll.forEach(r=>(r.logs||[]).slice(0,4).forEach(l=>logs.push({at:l.at||r.updatedAt||'', text:`${r.orderNo||r.awb||''}: ${l.text||''}`})));
  if($('ndrLogs')) ndrLogs.innerHTML=logs.slice(0,80).map(l=>`<div class="activity-log-row"><b>${esc(l.text)}</b><small>${esc(l.at)}</small></div>`).join('') || '<p class="hint">No NDR activity logs yet.</p>';
}
async function loadNdr(){
  const d=await fetch('/api/ndr',{credentials:'include',cache:'no-store'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message,ndr:[]}));
  ndrRows=d.ndr||[]; ndrSettings=d.settings||{}; fillNdrSettings(); renderNdr();
  if($('ndrResult') && !d.ok) ndrResult.textContent=JSON.stringify(d,null,2); else if($('ndrResult')) ndrResult.textContent='';
}
async function saveNdrSettings(){
  const body={beforeDeliveryEnabled:!!$('ndrBeforeDeliveryEnabled')?.checked, failedDeliveryEnabled:!!$('ndrFailedDeliveryEnabled')?.checked, reminderHours:Number($('ndrReminderHours')?.value||24), adminNumber:$('ndrAdminNumber')?.value||'', beforeMessage:$('ndrBeforeMessage')?.value||'', failedMessage:$('ndrFailedMessage')?.value||''};
  const d=await fetch('/api/ndr/settings',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('ndrResult')) ndrResult.textContent=JSON.stringify(d,null,2); ndrSettings=d.settings||body;
}
async function cleanNdr(){ const d=await fetch('/api/ndr/clean',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message})); if($('ndrResult')) ndrResult.textContent=JSON.stringify(d,null,2); await loadNdr(); }
async function syncNdr(){ const d=await fetch('/api/ndr/sync',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message})); if($('ndrResult')) ndrResult.textContent=JSON.stringify(d,null,2); await loadNdr(); }
async function sendNdrWhatsapp(id,type='failed'){ const d=await fetch('/api/ndr/'+encodeURIComponent(id)+'/whatsapp',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({type})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message})); if($('ndrResult')) ndrResult.textContent=JSON.stringify(d,null,2); await loadNdr(); }
async function sendNdrPendingWhatsapp(){ const d=await fetch('/api/ndr/whatsapp/pending',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message})); if($('ndrResult')) ndrResult.textContent=JSON.stringify(d,null,2); await loadNdr(); }
async function markNdrReattempt(id){ const d=await fetch('/api/ndr/'+encodeURIComponent(id)+'/status',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'reattempt requested',whatsappStatus:'customer requested reattempt'})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message})); if($('ndrResult')) ndrResult.textContent=JSON.stringify(d,null,2); await loadNdr(); }
function exportNdrCsv(){ const rows=ndrFilteredRows(); const csv=[['Provider','AWB','Order','Customer','Phone','Reason','Status','WhatsApp']].concat(rows.map(r=>[r.provider,r.awb,r.orderNo||r.orderNumber,r.customerName,r.phone,r.reason,r.status,r.whatsappStatus])).map(r=>r.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\n'); const blob=new Blob([csv],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='ndr-report.csv'; a.click(); URL.revokeObjectURL(a.href); }
document.addEventListener('change', e=>{ if(['ndrProviderFilter','ndrStatusFilter'].includes(e.target.id)) renderNdr(); });
document.addEventListener('input', e=>{ if(['ndrReasonFilter','ndrSearch'].includes(e.target.id)) renderNdr(); });
document.addEventListener('click', e=>{ if(e.target.id==='refreshNdr') loadNdr(); if(e.target.id==='syncNdr') syncNdr(); if(e.target.id==='cleanNdr') cleanNdr(); if(e.target.id==='saveNdrSettings') saveNdrSettings(); if(e.target.id==='sendNdrPendingWhatsapp') sendNdrPendingWhatsapp(); if(e.target.id==='exportNdrCsv') exportNdrCsv(); if(e.target.dataset.ndrWa) sendNdrWhatsapp(e.target.dataset.ndrWa,e.target.dataset.ndrType||'failed'); if(e.target.dataset.ndrReattempt) markNdrReattempt(e.target.dataset.ndrReattempt); if(e.target.id==='closeShopifyCustomerModal'||e.target.id==='cancelModalShopifyCustomer') closeShopifyCustomerModal(); if(e.target.id==='saveModalShopifyCustomer') saveModalShopifyCustomer(); });

load().catch(err=>{console.error(err); if(String(err).includes('401')) location.href='/login.html';});

// ---------- Final patch: 90% window + admin font size selector ----------
(function(){
  function normalizeAdminFontSize(size){
    const map={xs:'xsmall',extraSmall:'xsmall','extra-small':'xsmall',large:'big',xlarge:'big'};
    const raw=String(size||'medium');
    const val=map[raw]||raw;
    return ['xsmall','small','medium','big'].includes(val) ? val : 'medium';
  }
  window.applyAdminFontSize=function(size){
    const val=normalizeAdminFontSize(size);
    document.body.classList.remove('admin-font-xsmall','admin-font-small','admin-font-medium','admin-font-big');
    document.body.classList.add('admin-font-'+val);
    localStorage.setItem('tsgAdminFontSize', val);
    const sel=document.getElementById('adminFontSize');
    if(sel) sel.value=val;
  };
  document.addEventListener('change', function(e){
    if(e.target && e.target.id==='adminFontSize'){
      const val=normalizeAdminFontSize(e.target.value);
      applyAdminFontSize(val);
      fetch('/api/settings',{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({adminFontSize:val})}).catch(()=>{});
    }
  });
  setTimeout(function(){
    fetch('/api/settings',{credentials:'include',cache:'no-store'}).then(r=>r.json()).then(d=>applyAdminFontSize((d.settings||{}).adminFontSize || localStorage.getItem('tsgAdminFontSize') || 'medium')).catch(()=>applyAdminFontSize(localStorage.getItem('tsgAdminFontSize') || 'medium'));
  },0);
})();


// Final patch event helpers
window.addEventListener('focus', updateNotificationStatusDot);
document.addEventListener('click', e=>{
  const statusTab=e.target.closest('[data-ndr-status-tab]'); if(statusTab){ setNdrTab(statusTab.dataset.ndrStatusTab); }
  const track=e.target.closest('[data-ndr-track]'); if(track){ openNdrTracking(track.dataset.ndrTrack); }
  if(e.target.closest('[data-close-ndr-modal]')){ const m=$('ndrTrackingModal'); if(m) m.classList.add('hidden'); }
  if(e.target && e.target.id==='enableDesktopNotifications'){ setTimeout(updateNotificationStatusDot,500); }
});

document.addEventListener('change', e=>{ if(e.target.id==='whatsappImageFile' && e.target.files?.[0]) uploadWhatsappMediaFile(e.target.files[0],'image'); if(e.target.id==='whatsappDocumentFile' && e.target.files?.[0]) uploadWhatsappMediaFile(e.target.files[0],'document'); });

document.addEventListener('click', e=>{
  const em=e.target.closest('[data-pick-emoji]');
  if(em){ insertEmojiToReply(em.dataset.pickEmoji); const p=document.getElementById('emojiPickerPanel'); if(p) p.classList.add('hidden'); }
});

document.addEventListener('click', e=>{
  if(e.target && ['enableDesktopNotifications','enableDesktopNotifications2','enableNotificationsBtn'].includes(e.target.id)){
    enableDesktopNotifications();
  }
});
document.addEventListener('visibilitychange', updateNotificationStatusDot);
setTimeout(updateNotificationStatusDot, 500);

async function checkAppVersionAndReload(){
  try{
    const d=await fetch('/api/app-version?ts='+Date.now(),{cache:'no-store'}).then(r=>r.json());
    if(!d.ok || !d.version) return;
    const old=localStorage.getItem('tsgAppVersion');
    if(old && old!==d.version){
      if(confirm('New update available. Reload now?')) location.reload(true);
    }
    localStorage.setItem('tsgAppVersion', d.version);
  }catch(e){}
}
setInterval(checkAppVersionAndReload, 60000);
setTimeout(checkAppVersionAndReload, 1500);

document.addEventListener('change', e=>{
  if(e.target.id==='waImageFileInput' && e.target.files?.[0]) uploadWhatsappMediaFile(e.target.files[0],'image');
  if(e.target.id==='waDocumentFileInput' && e.target.files?.[0]) uploadWhatsappMediaFile(e.target.files[0],'document');
});
document.addEventListener('click', e=>{
  if(e.target && e.target.id==='sendWhatsappReply') sendWhatsappInboxReply();
  if(e.target.closest('[data-wa-emoji]')) addEmojiToReply();
});

document.addEventListener('click', e=>{
  if(e.target.closest('[data-mobile-chat-back]')){ document.body.classList.remove('wa-mobile-chat-open','wa-mobile-info-open'); selectedWhatsappInboxId=''; renderWhatsappInbox(); }
  if(e.target.closest('[data-mobile-info]')) document.body.classList.toggle('wa-mobile-info-open');
});

document.addEventListener('click', e=>{
  if(e.target.closest('[data-close-mobile-info]')) document.body.classList.remove('wa-mobile-info-open');
});

document.addEventListener('click', e=>{
  if(e.target.id==='addCatalogCategory'){ waBotSettings.catalogCategories=waBotSettings.catalogCategories||defaultCatalogCategoriesUi(); waBotSettings.catalogCategories.push({id:'custom-'+Date.now(),name:'New Category',link:'https://www.tinyshinygifts.com/collections/',active:true}); renderCatalogCategories(); }
  if(e.target.dataset.catRemove!==undefined){ waBotSettings.catalogCategories.splice(Number(e.target.dataset.catRemove),1); renderCatalogCategories(); }
});
document.addEventListener('input', e=>{ if(e.target.dataset.catName!==undefined || e.target.dataset.catLink!==undefined || e.target.dataset.catActive!==undefined){ waBotSettings.catalogCategories=collectCatalogCategories(); }});
document.addEventListener('change', e=>{ if(e.target.dataset.catActive!==undefined){ waBotSettings.catalogCategories=collectCatalogCategories(); }});

function renderBroadcastImageLibrary(){
  const box=$('broadcastImageLibrary'); if(!box) return;
  box.innerHTML=(mediaImages||[]).slice(0,20).map(img=>`<button type="button" class="broadcast-img-choice" data-use-broadcast-img="${esc(img.url||'')}"><img src="${esc(img.url||'')}" alt=""><span>${esc(img.title||img.filename||'Image')}</span></button>`).join('') || '<p class="hint">No saved images yet.</p>';
}
document.addEventListener('click', e=>{ const b=e.target.closest('[data-use-broadcast-img]'); if(b && $('broadcastImageUrl')) broadcastImageUrl.value=b.dataset.useBroadcastImg; });
setInterval(renderBroadcastImageLibrary, 3000);

(function tsgLoaderSafetyMobileFinal(){
  function killLoader(){
    document.querySelectorAll('.tsg-global-loader').forEach(x=>x.classList.add('hidden'));
  }
  if(window.matchMedia && window.matchMedia('(max-width: 900px)').matches){
    setInterval(killLoader, 2500);
    window.addEventListener('pageshow', ()=>setTimeout(killLoader, 800));
    document.addEventListener('touchstart', ()=>setTimeout(killLoader, 300), {passive:true});
  }
})();
