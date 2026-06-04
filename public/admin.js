let faqs = [];
let mediaImages = [];
let selectedMediaId = '';
const colorOptions = ['#d63384','#9b35ff','#0ea5e9','#16a34a','#f97316','#111827'];
const colorNames = {
  '#d63384':'Tiny Shiny Pink', '#9b35ff':'Premium Purple', '#0ea5e9':'Sky Blue',
  '#16a34a':'Fresh Green', '#f97316':'Festive Orange', '#111827':'Luxury Black'
};
function $(id){ return document.getElementById(id); }
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function normalizeColor(value){
  const v = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(v) ? v : '#d63384';
}
function tint(hex, amount){
  hex = normalizeColor(hex).slice(1);
  const n = parseInt(hex,16);
  let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
  if(amount>=0){ r += (255-r)*amount; g += (255-g)*amount; b += (255-b)*amount; }
  else { r *= (1+amount); g *= (1+amount); b *= (1+amount); }
  return '#' + [r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join('');
}
function applyThemeColor(value){
  const color = normalizeColor(value);
  document.documentElement.style.setProperty('--pink', color);
  document.documentElement.style.setProperty('--pink2', tint(color, .28));
  document.documentElement.style.setProperty('--purple', tint(color, -.12));
  document.documentElement.style.setProperty('--line', tint(color, .76));
  localStorage.setItem('tsgAdminThemeColor', color);
}
function setThemeColor(value){
  const color = normalizeColor(value);
  applyThemeColor(color);
  if($('themeColor')) $('themeColor').value = color;
  if($('themeHex')) $('themeHex').value = color.toUpperCase();
  if($('themeColorPreview')) $('themeColorPreview').textContent = colorNames[color] || color.toUpperCase();
  if($('themeColorPreset')) $('themeColorPreset').value = colorOptions.includes(color) ? color : 'custom';
}
async function logout(){
  try { await fetch('/api/admin/logout', { method:'POST', credentials:'include', cache:'no-store' }); }
  catch(e) {}
  window.location.replace('/login.html?logout=1&t=' + Date.now());
}
async function load() {
  setThemeColor(localStorage.getItem('tsgAdminThemeColor') || '#d63384');
  const s = await fetch('/api/settings', { credentials:'include' }).then(r=>r.json());
  const f = await fetch('/api/faqs', { credentials:'include' }).then(r=>r.json());
  const settings=s.settings||{};
  ['botName','welcomeMessage','fallbackMessage','leadOfferMessage','cartOfferMessage','leadPopupDelaySeconds'].forEach(id=>{ if(window[id]) window[id].value=settings[id]||''; });
  if(window.chatbotEnabled){ window.chatbotEnabled.checked = settings.chatbotEnabled !== false; if(window.chatbotStatusText) window.chatbotStatusText.textContent = window.chatbotEnabled.checked ? 'ON' : 'OFF'; }
  setThemeColor(settings.themeColor || '#d63384');
  faqs=f.faqs||[];
  renderFaqs(); loadCrm(); loadMedia(); loadLeads(); loadEvents(); loadMessages();
}
function renderFaqs(){ faqList.innerHTML=''; faqs.forEach((faq,index)=>{ const row=document.createElement('div'); row.className='faq-row'; row.innerHTML=`<label>Keywords <input data-i="${index}" data-field="keywords" value="${esc((faq.keywords||[]).join(', '))}"/></label><label>Answer <textarea data-i="${index}" data-field="answer">${esc(faq.answer||'')}</textarea></label><button data-remove="${index}" class="ghost-btn danger-outline">Remove</button>`; faqList.appendChild(row); }); }
async function loadLeads(){ const d=await fetch('/api/leads',{credentials:'include'}).then(r=>r.json()).catch(()=>({leads:[]})); if(window.leadCount) leadCount.textContent=(d.leads||[]).length; leadList.innerHTML=(d.leads||[]).slice(0,100).map(l=>`<div class="log-row"><b>${esc(l.type)}</b> <small>${esc(l.createdAt)}</small><br/>Phone: ${esc(l.phone)} | Order: ${esc(l.orderId||l.orderName)}<br/>Product: ${esc(l.productTitle||l.product||l?.product?.title)}<br/>Image: ${esc(l.productImage||l.image||l?.product?.image)}<br/>Page: ${esc(l.pageUrl||l?.product?.url)}<br/>Message: ${esc(l.message||l.note)}</div>`).join('') || 'No leads yet.'; }
async function loadEvents(){ const d=await fetch('/api/visitor-events',{credentials:'include'}).then(r=>r.json()).catch(()=>({events:[]})); if(window.eventCount) eventCount.textContent=(d.events||[]).length; eventList.innerHTML=(d.events||[]).slice(0,120).map(e=>`<div class="log-row"><b>${esc(e.eventType)}</b> <small>${esc(e.createdAt)}</small><br/>Product: ${esc(e.productTitle)}<br/>Price: ${esc(e.productPrice)} | Discount: ${esc(e.discountText)}<br/>Image: ${esc(e.productImage)}<br/>Page: ${esc(e.pageUrl)}</div>`).join('') || 'No activity yet.'; }
async function loadMessages(){ const d=await fetch('/api/lead-messages',{credentials:'include'}).then(r=>r.json()).catch(()=>({messages:[]})); if(window.messageCount) messageCount.textContent=(d.messages||[]).length; messageList.innerHTML=(d.messages||[]).slice(0,80).map(m=>`<div class="log-row"><b>${esc(m.type)}</b> <small>${esc(m.createdAt)}</small><br/><pre>${esc(m.message)}</pre></div>`).join('') || 'No messages yet.'; }

async function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{ const r=new FileReader(); r.onload=()=>resolve(r.result); r.onerror=reject; r.readAsDataURL(file); });
}
async function uploadMedia(){
  const file = $('mediaFile')?.files?.[0];
  if(!file) return alert('Please select an image first.');
  if(file.size > 6*1024*1024) return alert('Image size should be under 6 MB.');
  const dataUrl = await fileToDataUrl(file);
  const body = { filename:file.name, dataUrl, title:mediaTitle.value.trim(), category:mediaCategory.value, caption:mediaCaption.value.trim() };
  const res = await fetch('/api/media-images',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if(!res.ok) return alert(res.error || 'Image upload failed');
  selectedMediaId = res.image.id;
  mediaFile.value=''; mediaTitle.value=''; mediaCaption.value='';
  await loadMedia();
  alert('Image uploaded successfully');
}
async function loadMedia(){
  const d = await fetch('/api/media-images',{credentials:'include'}).then(r=>r.json()).catch(()=>({images:[]}));
  mediaImages = d.images || [];
  if(!selectedMediaId && mediaImages[0]) selectedMediaId = mediaImages[0].id;
  if(!window.mediaList) return;
  mediaList.innerHTML = mediaImages.map(img=>`<div class="media-card ${selectedMediaId===img.id?'selected':''}" data-media-card="${esc(img.id)}">
    <img src="${esc(img.url)}" alt="${esc(img.title)}"/>
    <div class="media-info"><b>${esc(img.title)}</b><span>${esc(img.category)} • ${esc(img.createdAt)}</span><p>${esc(img.caption)}</p><small>${esc(img.absoluteUrl || img.url)}</small></div>
    <div class="media-card-actions"><button class="ghost-btn" data-select-media="${esc(img.id)}">Select</button><button class="ghost-btn danger-outline" data-delete-media="${esc(img.id)}">Delete</button></div>
  </div>`).join('') || '<p>No images uploaded yet.</p>';
}
async function sendSelectedMedia(){
  if(!selectedMediaId) return alert('Please select an image first.');
  const image = mediaImages.find(x=>x.id===selectedMediaId);
  const to = mediaSendTo.value;
  const phone = mediaPhone.value.trim();
  if(to === 'custom' && !phone) return alert('Please enter customer WhatsApp number.');
  const res = await fetch('/api/send-image-message',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageId:selectedMediaId,to,phone,caption:image?.caption||''})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  mediaSendResult.textContent = JSON.stringify(res,null,2);
}


let crmCustomers = [];
function crmValue(c){ return [c.name,c.phone,c.email,c.productTitle,c.pageUrl,c.orderName,c.lastMessage,c.status].join(' ').toLowerCase(); }
function renderCrm(){
  const q = ($('crmSearch')?.value || '').toLowerCase().trim();
  const st = $('crmStatusFilter')?.value || '';
  const filtered = crmCustomers.filter(c => (!q || crmValue(c).includes(q)) && (!st || (c.status || 'New') === st));
  if($('crmCount')) crmCount.textContent = crmCustomers.length;
  if($('crmSummary')) {
    const counts = crmCustomers.reduce((a,c)=>{ const k=c.status||'New'; a[k]=(a[k]||0)+1; return a; },{});
    crmSummary.innerHTML = ['New','Hot Lead','Follow Up','Converted','Not Interested'].map(k=>`<span><b>${counts[k]||0}</b>${esc(k)}</span>`).join('');
  }
  if(!$('crmList')) return;
  crmList.innerHTML = filtered.map(c=>`<div class="crm-card" data-crm-id="${esc(c.id)}">
    <div class="crm-main"><b>${esc(c.name || 'Customer')}</b><span>${esc(c.phone || 'No phone')} ${c.email ? ' • ' + esc(c.email) : ''}</span></div>
    <div class="crm-meta"><span class="status-chip">${esc(c.status || 'New')}</span><span>${esc(c.updatedAt || c.createdAt)}</span><span>Leads: ${esc(c.leadCount||0)} • Activity: ${esc(c.activityCount||0)}</span></div>
    <div class="crm-product"><b>${esc(c.productTitle || 'No product yet')}</b><br/><a href="${esc(c.pageUrl || '#')}" target="_blank">${esc(c.pageUrl || '')}</a><br/>${c.productImage ? `<img src="${esc(c.productImage)}" alt=""/>` : ''}</div>
    <div class="crm-message">${esc(c.lastMessage || '')}</div>
    <div class="form-grid two"><label>Status <select data-crm-status="${esc(c.id)}"><option ${c.status==='New'?'selected':''}>New</option><option ${c.status==='Hot Lead'?'selected':''}>Hot Lead</option><option ${c.status==='Follow Up'?'selected':''}>Follow Up</option><option ${c.status==='Converted'?'selected':''}>Converted</option><option ${c.status==='Not Interested'?'selected':''}>Not Interested</option></select></label><label>Notes <input data-crm-notes="${esc(c.id)}" value="${esc(c.notes||'')}" placeholder="Follow-up note"/></label></div>
    <button class="ghost-btn" data-crm-save="${esc(c.id)}">Save CRM</button>
  </div>`).join('') || '<p>No CRM data yet. Leads will appear here when visitors use chatbot or product tracking runs.</p>';
}
async function loadCrm(){
  const d = await fetch('/api/crm',{credentials:'include'}).then(r=>r.json()).catch(()=>({customers:[]}));
  crmCustomers = d.customers || [];
  renderCrm();
}
function exportCrmCsv(){
  const headers = ['Status','Name','Phone','Email','Product','Product Link','Order','Total','Last Message','Notes','Updated At'];
  const rows = crmCustomers.map(c=>[c.status,c.name,c.phone,c.email,c.productTitle,c.pageUrl,c.orderName,c.total,c.lastMessage,c.notes,c.updatedAt]);
  const csv = [headers, ...rows].map(row=>row.map(v=>'"'+String(v||'').replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'tiny-shiny-crm.csv'; a.click(); URL.revokeObjectURL(a.href);
}
async function saveCrm(id){
  const status = document.querySelector(`[data-crm-status="${CSS.escape(id)}"]`)?.value || 'New';
  const notes = document.querySelector(`[data-crm-notes="${CSS.escape(id)}"]`)?.value || '';
  const data = await fetch('/api/crm/'+encodeURIComponent(id),{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status,notes})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if(!data.ok) return alert(data.error || 'CRM save failed');
  await loadCrm();
}

document.addEventListener('input',e=>{
  if(e.target.id === 'crmSearch' || e.target.id === 'crmStatusFilter') renderCrm();
  if(e.target.id === 'themeColor') setThemeColor(e.target.value);
  if(e.target.id === 'themeHex') setThemeColor(e.target.value);
  if(e.target.id === 'chatbotEnabled' && window.chatbotStatusText) window.chatbotStatusText.textContent = e.target.checked ? 'ON' : 'OFF';
  const i=e.target.dataset.i, field=e.target.dataset.field; if(i===undefined||!field)return; if(field==='keywords') faqs[i].keywords=e.target.value.split(',').map(x=>x.trim()).filter(Boolean); if(field==='answer') faqs[i].answer=e.target.value;
});
document.addEventListener('change',e=>{ if(e.target.id === 'themeColorPreset' && e.target.value !== 'custom') setThemeColor(e.target.value); });
document.addEventListener('click',async e=>{
  if(e.target.closest('#logoutBtn')){ e.preventDefault(); return logout(); }
  if(e.target.id==='addFaq'){faqs.push({keywords:['new keyword'],answer:'New answer'});renderFaqs();}
  if(e.target.dataset.remove!==undefined){faqs.splice(Number(e.target.dataset.remove),1);renderFaqs();}
  if(e.target.id==='saveFaqs'){await fetch('/api/faqs',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({faqs})});alert('FAQs saved');}
  if(e.target.id==='saveSettings'){
    const body={chatbotEnabled: chatbotEnabled ? chatbotEnabled.checked : true, botName:botName.value,welcomeMessage:welcomeMessage.value,fallbackMessage:fallbackMessage.value,leadOfferMessage:leadOfferMessage.value,cartOfferMessage:cartOfferMessage.value,leadPopupDelaySeconds:Number(leadPopupDelaySeconds.value||12),themeColor:themeColor.value};
    const res = await fetch('/api/settings',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
    if(res.ok){ setThemeColor(body.themeColor); alert('Settings saved'); } else alert(res.error || 'Settings save failed');
  }
  if(e.target.id==='refreshCrm') loadCrm();
  if(e.target.id==='exportCrmCsv') exportCrmCsv();
  if(e.target.id==='syncGoogleSheets'){ const data=await fetch('/api/sync-google-sheets',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message})); if(window.crmSyncResult) crmSyncResult.textContent=JSON.stringify(data,null,2); }
  if(e.target.dataset.crmSave) saveCrm(e.target.dataset.crmSave);
  if(e.target.id==='uploadMedia') uploadMedia();
  if(e.target.id==='refreshMedia') loadMedia();
  if(e.target.id==='sendSelectedMedia') sendSelectedMedia();
  if(e.target.dataset.selectMedia){ selectedMediaId=e.target.dataset.selectMedia; loadMedia(); }
  if(e.target.dataset.deleteMedia){ if(confirm('Delete this image?')){ await fetch('/api/media-images/'+encodeURIComponent(e.target.dataset.deleteMedia),{method:'DELETE',credentials:'include'}); if(selectedMediaId===e.target.dataset.deleteMedia) selectedMediaId=''; loadMedia(); } }
  if(e.target.id==='refreshLeads')loadLeads(); if(e.target.id==='refreshEvents')loadEvents(); if(e.target.id==='refreshMsgs')loadMessages();
});
load().catch(err => { console.error(err); if(String(err).includes('401')) location.href='/login.html'; });
