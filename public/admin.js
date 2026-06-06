let faqs = [];
let mediaImages = [];
let selectedMediaId = '';
let selectedMediaIds = [];
let crmCustomers = [];
let shopifyCustomers = [];
let shopifyProducts = [];
let selectedPromoProductId = '';
let googleSheetUrl = '';
const colorOptions = ['#d63384','#9b35ff','#0ea5e9','#16a34a','#f97316','#111827'];
const colorNames = {'#d63384':'Tiny Shiny Pink','#9b35ff':'Premium Purple','#0ea5e9':'Sky Blue','#16a34a':'Fresh Green','#f97316':'Festive Orange','#111827':'Luxury Black'};
function $(id){ return document.getElementById(id); }
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function normalizeColor(value){ const v=String(value||'').trim().toLowerCase(); return /^#[0-9a-f]{6}$/.test(v)?v:'#d63384'; }
function tint(hex, amount){ hex=normalizeColor(hex).slice(1); const n=parseInt(hex,16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; if(amount>=0){r+=(255-r)*amount;g+=(255-g)*amount;b+=(255-b)*amount}else{r*=(1+amount);g*=(1+amount);b*=(1+amount)} return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join(''); }
function applyThemeColor(value){ const color=normalizeColor(value); document.documentElement.style.setProperty('--pink', color); document.documentElement.style.setProperty('--pink2', tint(color,.28)); document.documentElement.style.setProperty('--purple', tint(color,-.12)); document.documentElement.style.setProperty('--line', tint(color,.76)); localStorage.setItem('tsgAdminThemeColor', color); }
function setThemeColor(value){ applyThemeColor(value); }
async function logout(){ try{ await fetch('/api/admin/logout',{method:'POST',credentials:'include',cache:'no-store'}); }catch(e){} window.location.replace('/login.html?logout=1&t='+Date.now()); }
function showTab(id){
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active', p.id===id));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  localStorage.setItem('tsgAdminActiveTab', id);
}
async function load(){
  setThemeColor(localStorage.getItem('tsgAdminThemeColor') || '#d63384');
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
  await Promise.all([loadCrm(), loadMedia(), loadLeads(), loadEvents(), loadMessages()]);
  const active = localStorage.getItem('tsgAdminActiveTab') || 'basicPanel';
  showTab($(active) ? active : 'basicPanel');
}
function updateGoogleSheetTab(){
  const link = $('googleSheetOpenLink'); const help=$('googleSheetHelp');
  if(!link) return;
  if(googleSheetUrl){ link.href=googleSheetUrl; link.style.display='inline-flex'; if(help) help.textContent='Click the button below to open your connected Google Sheet.'; }
  else { link.href='#'; link.style.display='none'; if(help) help.textContent='Google Sheet link not configured. Please add it in API Settings.'; }
}
function renderFaqs(){ if(!$('faqList')) return; faqList.innerHTML=''; faqs.forEach((faq,index)=>{ const row=document.createElement('div'); row.className='faq-row'; row.innerHTML=`<label>Keywords <input data-i="${index}" data-field="keywords" value="${esc((faq.keywords||[]).join(', '))}"/></label><label>Answer <textarea data-i="${index}" data-field="answer">${esc(faq.answer||'')}</textarea></label><button data-remove="${index}" class="ghost-btn danger-outline">Remove</button>`; faqList.appendChild(row); }); }
async function loadLeads(){ const d=await fetch('/api/leads',{credentials:'include'}).then(r=>r.json()).catch(()=>({leads:[]})); if($('leadCount')) leadCount.textContent=(d.leads||[]).length; if($('leadList')) leadList.innerHTML=(d.leads||[]).slice(0,100).map(l=>`<div class="log-row"><b>${esc(l.type)}</b> <small>${esc(l.createdAt)}</small><br/>Phone: ${esc(l.phone)} | Order: ${esc(l.orderId||l.orderName)}<br/>Product: ${esc(l.productTitle||l.product||l?.product?.title)}<br/>Image: ${esc(l.productImage||l.image||l?.product?.image)}<br/>Page: ${esc(l.pageUrl||l?.product?.url)}<br/>Message: ${esc(l.message||l.note)}</div>`).join('') || 'No leads yet.'; }
async function loadEvents(){ const d=await fetch('/api/visitor-events',{credentials:'include'}).then(r=>r.json()).catch(()=>({events:[]})); if($('eventCount')) eventCount.textContent=(d.events||[]).length; if($('eventList')) eventList.innerHTML=(d.events||[]).slice(0,120).map(e=>`<div class="log-row"><b>${esc(e.eventType)}</b> <small>${esc(e.createdAt)}</small><br/>Product: ${esc(e.productTitle)}<br/>Price: ${esc(e.productPrice)} | Discount: ${esc(e.discountText)}<br/>Image: ${esc(e.productImage)}<br/>Page: ${esc(e.pageUrl)}</div>`).join('') || 'No activity yet.'; }
async function loadMessages(){ const d=await fetch('/api/lead-messages',{credentials:'include'}).then(r=>r.json()).catch(()=>({messages:[]})); if($('messageCount')) messageCount.textContent=(d.messages||[]).length; if($('messageList')) messageList.innerHTML=(d.messages||[]).slice(0,80).map(m=>`<div class="log-row"><b>${esc(m.type)}</b> <small>${esc(m.createdAt)}</small><br/><pre>${esc(m.message)}</pre></div>`).join('') || 'No messages yet.'; }
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
  renderSelectedMedia();
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

document.addEventListener('input',e=>{ if(e.target.id==='crmSearch'||e.target.id==='crmStatusFilter') renderCrm(); if(e.target.id==='shopifyCustomerSearch') renderShopifyCustomers(); if(e.target.id==='mediaCustomerSearch') renderMediaCustomers(); if(e.target.id==='newProductSearch') renderNewProducts(); if(e.target.id==='newProductCustomerSearch') renderNewProductCustomers(); const i=e.target.dataset.i,field=e.target.dataset.field; if(i===undefined||!field)return; if(field==='keywords') faqs[i].keywords=e.target.value.split(',').map(x=>x.trim()).filter(Boolean); if(field==='answer') faqs[i].answer=e.target.value; });
document.addEventListener('change',e=>{ if(e.target.id==='selectAllShopifyCustomers'||e.target.id==='selectAllCustomersTop'){ document.querySelectorAll('.cust-check').forEach(cb=>cb.checked=e.target.checked); if($('selectAllShopifyCustomers')) selectAllShopifyCustomers.checked=e.target.checked; } if(e.target.id==='selectAllMediaCustomers'){ document.querySelectorAll('.media-cust-check').forEach(cb=>cb.checked=e.target.checked); } if(e.target.id==='selectAllProductPromoCustomers'){ document.querySelectorAll('.promo-cust-check').forEach(cb=>cb.checked=e.target.checked); } if(e.target.dataset.promoProduct){ selectedPromoProductId=e.target.dataset.promoProduct; renderNewProducts(); } });
document.addEventListener('click',async e=>{
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
  if(e.target.id==='clearSelectedMedia'){ selectedMediaIds=[]; selectedMediaId=''; renderSelectedMedia(); loadMedia(); }
  if(e.target.dataset.selectMedia){ const id=e.target.dataset.selectMedia; if(selectedMediaIds.includes(id)) selectedMediaIds=selectedMediaIds.filter(x=>x!==id); else selectedMediaIds.push(id); selectedMediaId=selectedMediaIds[0]||''; loadMedia(); }
  if(e.target.dataset.removeSelectedMedia){ const id=e.target.dataset.removeSelectedMedia; selectedMediaIds=selectedMediaIds.filter(x=>x!==id); selectedMediaId=selectedMediaIds[0]||''; loadMedia(); }
  if(e.target.dataset.fillMediaPhone){ const c=shopifyCustomers.find(x=>String(x.id)===String(e.target.dataset.fillMediaPhone)); if(c && $('mediaPhone')){ mediaPhone.value=c.phone||''; if($('mediaSendTo')) mediaSendTo.value='custom'; } }
  if(e.target.dataset.deleteMedia){ if(confirm('Delete this image from library?')){ await fetch('/api/media-images/'+encodeURIComponent(e.target.dataset.deleteMedia),{method:'DELETE',credentials:'include'}); selectedMediaIds=selectedMediaIds.filter(x=>x!==e.target.dataset.deleteMedia); if(selectedMediaId===e.target.dataset.deleteMedia) selectedMediaId=selectedMediaIds[0]||''; loadMedia(); } }
  if(e.target.id==='refreshLeads') loadLeads(); if(e.target.id==='refreshEvents') loadEvents(); if(e.target.id==='refreshMsgs') loadMessages();
});
load().catch(err=>{console.error(err); if(String(err).includes('401')) location.href='/login.html';});
