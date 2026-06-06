const keys = ['WEBSITE_URL','WHATSAPP_NUMBER','OWNER_WHATSAPP_NUMBER','ADMIN_USERNAME','ADMIN_PASSWORD','ADMIN_DOB','SECURITY_SESSION_SECRET','ADMIN_SESSION_HOURS','SHOPIFY_STORE_DOMAIN','SHOPIFY_ADMIN_ACCESS_TOKEN','SHOPIFY_API_VERSION','CREATE_SHOPIFY_DRAFT_ORDER','SHOPIFY_CLIENT_ID','SHOPIFY_CLIENT_SECRET','SHOPIFY_APP_URL','SHOPIFY_OAUTH_SCOPES','SHOPIFY_OAUTH_REDIRECT_URI','WHATSAPP_CLOUD_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_TEST_TEMPLATE_NAME','WHATSAPP_TEST_TEMPLATE_LANG','CUSTOMER_WHATSAPP_MESSAGES_ENABLED','CUSTOMER_WHATSAPP_TEMPLATE_NAME','CUSTOMER_WHATSAPP_TEMPLATE_LANG','GOOGLE_SHEETS_ENABLED','GOOGLE_SHEETS_WEBHOOK_URL','GOOGLE_SHEET_URL','GOOGLE_SHEETS_SECRET','SHIPROCKET_TOKEN','SHIPROCKET_EMAIL','SHIPROCKET_PASSWORD','ICARRY_ENABLED','ICARRY_API_TOKEN','ICARRY_API_KEY','ICARRY_CLIENT_ID','ICARRY_CLIENT_SECRET','ICARRY_USERNAME','ICARRY_PASSWORD','ICARRY_TRACKING_URL','ORDER_CONFIRMATION_WHATSAPP_ENABLED','ORDER_CONFIRMATION_TEMPLATE_NAME','ORDER_CONFIRMATION_TEMPLATE_LANG'];
let whatsappTemplates = [];
let whatsappTemplateMappings = {};
function $(id){ return document.getElementById(id); }
function show(el, data){ el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2); }
const templateTargetLabels = {customer_followup:'Customer Follow-up', order_confirmation:'Order Confirmation', test_whatsapp:'Test WhatsApp / Owner'};
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function templateUsedTargets(t){ return Object.entries(whatsappTemplateMappings||{}).filter(([,m])=>m && m.name && m.name===t.name).map(([k])=>k); }
function templateOptionsHtml(currentName=''){
  const opts = whatsappTemplates.filter(t=>t.enabled!==false).map(t=>`<option value="${esc(t.id)}" ${t.name===currentName?'selected':''}>${esc(t.name)} (${esc(t.language||'en')})</option>`).join('');
  return '<option value="">Manual / Select template</option>' + opts;
}
function setSelectOptions(id, currentName){ if($(id)) $(id).innerHTML = templateOptionsHtml(currentName||''); }
function applyApiTemplateToTarget(tpl, target){
  if(!tpl) return;
  if(target==='customer_followup'){
    if($('CUSTOMER_WHATSAPP_TEMPLATE_NAME')) CUSTOMER_WHATSAPP_TEMPLATE_NAME.value=tpl.name||'';
    if($('CUSTOMER_WHATSAPP_TEMPLATE_LANG')) CUSTOMER_WHATSAPP_TEMPLATE_LANG.value=tpl.language||'en';
  } else if(target==='order_confirmation'){
    if($('ORDER_CONFIRMATION_TEMPLATE_NAME')) ORDER_CONFIRMATION_TEMPLATE_NAME.value=tpl.name||'';
    if($('ORDER_CONFIRMATION_TEMPLATE_LANG')) ORDER_CONFIRMATION_TEMPLATE_LANG.value=tpl.language||'en';
  } else if(target==='test_whatsapp'){
    if($('WHATSAPP_TEST_TEMPLATE_NAME')) WHATSAPP_TEST_TEMPLATE_NAME.value=tpl.name||'';
    if($('WHATSAPP_TEST_TEMPLATE_LANG')) WHATSAPP_TEST_TEMPLATE_LANG.value=tpl.language||'en_US';
  }
  renderApiTemplates();
}
function templateBySelectValue(value){ return whatsappTemplates.find(t=>String(t.id)===String(value) || t.name===value); }
function renderApiTemplates(){
  const box=$('apiTemplateList'); if(!box) return;
  const current={
    customer_followup: $('CUSTOMER_WHATSAPP_TEMPLATE_NAME')?.value.trim()||'',
    order_confirmation: $('ORDER_CONFIRMATION_TEMPLATE_NAME')?.value.trim()||'',
    test_whatsapp: $('WHATSAPP_TEST_TEMPLATE_NAME')?.value.trim()||''
  };
  box.innerHTML = whatsappTemplates.map(t=>{
    const targets = Object.entries(current).filter(([,name])=>name && name===t.name).map(([k])=>templateTargetLabels[k]||k);
    const used = targets.length>0;
    return `<div class="template-status-row ${used?'template-used':''}"><div><b>${esc(t.name)}</b><small>${esc(t.category||'')} • ${esc(t.language||'en')} • Header: ${esc(t.headerType||'None')}</small></div><span class="${used?'used-badge':'available-badge'}">${used?'USED: '+esc(targets.join(', ')):'Available'}</span></div>`;
  }).join('') || '<p>No templates found. Admin → WhatsApp Templates me Add Template karo.</p>';
}
async function loadApiTemplates(){
  const d=await fetch('/api/whatsapp-templates',{credentials:'include',cache:'no-store'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message,templates:[],mappings:{}}));
  whatsappTemplates=d.templates||[];
  whatsappTemplateMappings=d.mappings||{};
  const currentCustomer=$('CUSTOMER_WHATSAPP_TEMPLATE_NAME')?.value.trim()||'';
  const currentOrder=$('ORDER_CONFIRMATION_TEMPLATE_NAME')?.value.trim()||'';
  const currentTest=$('WHATSAPP_TEST_TEMPLATE_NAME')?.value.trim()||'';
  ['API_CUSTOMER_TEMPLATE_SELECT','API_CUSTOMER_TEMPLATE_SELECT_2'].forEach(id=>setSelectOptions(id,currentCustomer));
  ['API_ORDER_TEMPLATE_SELECT','API_ORDER_TEMPLATE_SELECT_2'].forEach(id=>setSelectOptions(id,currentOrder));
  ['API_TEST_TEMPLATE_SELECT','API_TEST_TEMPLATE_SELECT_2'].forEach(id=>setSelectOptions(id,currentTest));
  renderApiTemplates();
}
const colorOptions = ['#d63384','#9b35ff','#0ea5e9','#16a34a','#f97316','#111827'];
const colorNames = {'#d63384':'Tiny Shiny Pink','#9b35ff':'Premium Purple','#0ea5e9':'Sky Blue','#16a34a':'Fresh Green','#f97316':'Festive Orange','#111827':'Luxury Black'};
function normalizeColor(value){ const v=String(value||'').trim().toLowerCase(); return /^#[0-9a-f]{6}$/.test(v)?v:'#d63384'; }
function tint(hex, amount){ hex=normalizeColor(hex).slice(1); const n=parseInt(hex,16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; if(amount>=0){r+=(255-r)*amount;g+=(255-g)*amount;b+=(255-b)*amount}else{r*=(1+amount);g*=(1+amount);b*=(1+amount)} return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join(''); }
function applyThemeColor(value){ const color=normalizeColor(value); document.documentElement.style.setProperty('--pink', color); document.documentElement.style.setProperty('--pink2', tint(color,.28)); document.documentElement.style.setProperty('--purple', tint(color,-.12)); document.documentElement.style.setProperty('--line', tint(color,.76)); localStorage.setItem('tsgAdminThemeColor', color); }
function setThemeColor(value){ const color=normalizeColor(value); applyThemeColor(color); if($('themeColor')) $('themeColor').value=color; if($('themeHex')) $('themeHex').value=color.toUpperCase(); if($('themeColorPreview')) $('themeColorPreview').textContent=colorNames[color] || color.toUpperCase(); if($('themeColorPreset')) $('themeColorPreset').value=colorOptions.includes(color)?color:'custom'; }
async function loadTheme(){ try{ const data=await fetch('/api/settings',{credentials:'include',cache:'no-store'}).then(r=>r.json()); const settings=data.settings||{}; const color=settings.themeColor || localStorage.getItem('tsgAdminThemeColor') || '#d63384'; setThemeColor(color); if($('botName')) $('botName').value=settings.botName || 'Tiny Shiny Assistant'; if($('chatbotEnabled')) { $('chatbotEnabled').checked = settings.chatbotEnabled !== false; if($('chatbotStatusText')) $('chatbotStatusText').textContent = $('chatbotEnabled').checked ? 'ON' : 'OFF'; } }catch{ setThemeColor(localStorage.getItem('tsgAdminThemeColor') || '#d63384'); } }
async function logout(){ try{ await fetch('/api/admin/logout',{method:'POST',credentials:'include',cache:'no-store'}); }catch(e){} window.location.replace('/login.html?logout=1&t='+Date.now()); }
async function loadConfig(){
  await loadTheme();
  const data = await fetch('/api/config',{credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if(!data.ok) return alert('Could not load API settings');
  const cfg = data.config || {};
  keys.forEach(k => { if($(k)) $(k).value = cfg[k] || ''; });
  await loadApiTemplates();
}
async function saveAppearance(){
  const body = {
    chatbotEnabled: $('chatbotEnabled') ? $('chatbotEnabled').checked : true,
    botName: $('botName') ? $('botName').value.trim() : 'Tiny Shiny Assistant',
    themeColor: $('themeColor') ? $('themeColor').value : '#d63384'
  };
  const data = await fetch('/api/settings',{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(err=>({ok:false,error:err.message}));
  if(data.ok) { setThemeColor(body.themeColor); if($('chatbotStatusText')) $('chatbotStatusText').textContent = body.chatbotEnabled ? 'ON' : 'OFF'; }
  if($('appearanceResult')) show($('appearanceResult'), data.ok ? {ok:true,message:'Chatbot appearance saved. Refresh website. If old widget remains, use widget.js?v=19 in Shopify.'} : data);
  return data;
}

function downloadConfigBackup(){
  const a = document.createElement('a');
  a.href = '/api/config/download?t=' + Date.now();
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function saveConfig(){
  const body = {};
  keys.forEach(k => { if($(k)) body[k] = $(k).value.trim(); });
  const data = await fetch('/api/config',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
  $('saveStatus').textContent = data.message || (data.ok ? 'Saved' : 'Save failed');
  if(data.ok) await loadApiTemplates();
  return data;
}
document.addEventListener('input', e=>{
  if(e.target.id === 'themeColor') setThemeColor(e.target.value);
  if(e.target.id === 'themeHex') setThemeColor(e.target.value);
  if(['CUSTOMER_WHATSAPP_TEMPLATE_NAME','ORDER_CONFIRMATION_TEMPLATE_NAME','WHATSAPP_TEST_TEMPLATE_NAME'].includes(e.target.id)) renderApiTemplates();
  if(e.target.id === 'chatbotEnabled' && $('chatbotStatusText')) $('chatbotStatusText').textContent = e.target.checked ? 'ON' : 'OFF';
});
document.addEventListener('change', e=>{
  if(e.target.id === 'themeColorPreset' && e.target.value !== 'custom') setThemeColor(e.target.value);
  const selectMap={API_CUSTOMER_TEMPLATE_SELECT:'customer_followup',API_CUSTOMER_TEMPLATE_SELECT_2:'customer_followup',API_ORDER_TEMPLATE_SELECT:'order_confirmation',API_ORDER_TEMPLATE_SELECT_2:'order_confirmation',API_TEST_TEMPLATE_SELECT:'test_whatsapp',API_TEST_TEMPLATE_SELECT_2:'test_whatsapp'};
  if(selectMap[e.target.id]) applyApiTemplateToTarget(templateBySelectValue(e.target.value), selectMap[e.target.id]);
});
document.addEventListener('click', async (e)=>{
  if(e.target.id === 'saveAppearance') return saveAppearance();
  if(e.target.closest('#logoutBtn')) { e.preventDefault(); return logout(); }
  if(e.target.id === 'saveConfig') saveConfig();
  if(e.target.id === 'refreshApiTemplates') loadApiTemplates();
  if(e.target.id === 'downloadConfig' || e.target.id === 'downloadConfig2') downloadConfigBackup();
  if(e.target.id === 'connectShopify') {
    const saved = await saveConfig();
    if(!saved.ok) return show($('shopifyResult'), saved);
    const shop = $('SHOPIFY_STORE_DOMAIN')?.value.trim() || 'tinyshinygifts.myshopify.com';
    window.location.href = '/shopify/install?shop=' + encodeURIComponent(shop);
    return;
  }
  if(e.target.id === 'testShopify') {
    await saveConfig();
    const data = await fetch('/api/test-shopify',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(err=>({ok:false,error:err.message}));
    show($('shopifyResult'), data);
  }
  if(e.target.id === 'testGoogleSheets') {
    await saveConfig();
    const data = await fetch('/api/test-google-sheets',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(err=>({ok:false,error:err.message}));
    show($('googleSheetsResult'), data);
  }
  if(e.target.id === 'testWhatsApp') {
    await saveConfig();
    const data = await fetch('/api/test-whatsapp',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(err=>({ok:false,error:err.message}));
    show($('whatsappResult'), data);
  }
});
loadConfig();
