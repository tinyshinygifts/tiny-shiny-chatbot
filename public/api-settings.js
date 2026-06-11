const keys = ['WEBSITE_URL','WHATSAPP_NUMBER','OWNER_WHATSAPP_NUMBER','ADMIN_USERNAME','ADMIN_PASSWORD','ADMIN_DOB','SECURITY_SESSION_SECRET','ADMIN_SESSION_HOURS','SHOPIFY_STORE_DOMAIN','SHOPIFY_ADMIN_ACCESS_TOKEN','SHOPIFY_API_VERSION','CREATE_SHOPIFY_DRAFT_ORDER','SHOPIFY_CLIENT_ID','SHOPIFY_CLIENT_SECRET','SHOPIFY_APP_URL','SHOPIFY_OAUTH_SCOPES','SHOPIFY_OAUTH_REDIRECT_URI','WHATSAPP_CLOUD_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_TEST_TEMPLATE_NAME','WHATSAPP_TEST_TEMPLATE_LANG','CUSTOMER_WHATSAPP_MESSAGES_ENABLED','CUSTOMER_WHATSAPP_TEMPLATE_NAME','CUSTOMER_WHATSAPP_TEMPLATE_LANG','GOOGLE_SHEETS_ENABLED','GOOGLE_SHEETS_WEBHOOK_URL','GOOGLE_SHEET_URL','GOOGLE_SHEETS_SECRET','SHIPROCKET_TOKEN','SHIPROCKET_EMAIL','SHIPROCKET_PASSWORD','ORDER_CONFIRMATION_WHATSAPP_ENABLED','ORDER_CONFIRMATION_TEMPLATE_NAME','ORDER_CONFIRMATION_TEMPLATE_LANG','META_ACCESS_TOKEN','META_AD_ACCOUNT_ID','META_FACEBOOK_PAGE_ID','META_INSTAGRAM_ACCOUNT_ID','META_DEFAULT_COST_PER_ORDER','DEFAULT_SHIPPING_COST'];
let whatsappTemplates = [];
let whatsappTemplateMappings = {};
let selectedTemplateId = '';
let faqs = [];
let lastApiConnectionRows = [];
let lastApiErrorLogKey = '';
function $(id){ return document.getElementById(id); }
function show(el, data){ el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2); }
const templateTargetLabels = {selected:'Selected / Use', customer_followup:'Customer Follow-up', order_confirmation:'Order Confirmation', cod_order:'COD Order', ndr:'NDR', broadcast:'Broadcast', abandoned_cart:'Abandoned Cart', review_request:'Review Request', test_whatsapp:'Test WhatsApp / Owner', custom:'Custom'};
function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
function templateUsedTargets(t){ const serverTargets = Array.isArray(t.usedTargets) ? t.usedTargets.slice() : []; if(t && t.selectedForUse && !serverTargets.includes('selected')) serverTargets.unshift('selected'); if(serverTargets.length) return serverTargets; return Object.entries(whatsappTemplateMappings||{}).filter(([,m])=>m && m.name && m.name===t.name).map(([k])=>k); }
function templateValue(t){ return [t.name,t.category,t.language,t.useCase,t.body,(t.variables||[]).join(' ')].join(' ').toLowerCase(); }
function parseTemplateButtons(text){ return String(text||'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{ const parts=line.split('|').map(x=>x.trim()); return { type: parts[0] || 'Quick Reply', text: parts[1] || '', url: parts[2] || '' }; }).filter(b=>b.text); }
function buttonsToText(buttons){ return (buttons||[]).map(b=>[b.type||'Quick Reply', b.text||'', b.url||''].filter(Boolean).join(' | ')).join('\n'); }
function templateUsedLabel(t){ const targets = templateUsedTargets(t); return targets.length ? targets.map(x=>templateTargetLabels[x]||x).join(', ') : ''; }
function uniqueTemplates(){
  const seen=new Set();
  return (whatsappTemplates||[]).filter(t=>{ const key=t.name||t.id; if(!key||seen.has(key)) return false; seen.add(key); return true; });
}
function templateOptionsHtml(currentName=''){
  const opts = uniqueTemplates().filter(t=>t.enabled!==false).map(t=>`<option value="${esc(t.id)}" ${t.name===currentName?'selected':''}>${esc(t.name)} (${esc(t.language||'en')})</option>`).join('');
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
  } else if(target==='cod_order'){
    if($('COD_ORDER_CONFIRMATION_TEMPLATE_NAME')) COD_ORDER_CONFIRMATION_TEMPLATE_NAME.value=tpl.name||'';
    if($('COD_ORDER_CONFIRMATION_TEMPLATE_LANG')) COD_ORDER_CONFIRMATION_TEMPLATE_LANG.value=tpl.language||'en';
  } else if(target==='test_whatsapp'){
    if($('WHATSAPP_TEST_TEMPLATE_NAME')) WHATSAPP_TEST_TEMPLATE_NAME.value=tpl.name||'';
    if($('WHATSAPP_TEST_TEMPLATE_LANG')) WHATSAPP_TEST_TEMPLATE_LANG.value=tpl.language||'en_US';
  }
  renderApiTemplates();
  renderTemplates();
  renderUnlimitedWhatsappFormats();
}
function templateBySelectValue(value){ return whatsappTemplates.find(t=>String(t.id)===String(value) || t.name===value); }
function selectedMapTarget(){ return $('templateMapTarget')?.value || 'customer_followup'; }
function normalizeFontSize(size){
  const map={xs:'xsmall',extraSmall:'xsmall','extra-small':'xsmall',large:'big',xlarge:'big'};
  const raw=String(size||'medium');
  const val=map[raw]||raw;
  return ['xsmall','small','medium','big'].includes(val) ? val : 'medium';
}
function applyApiFontSize(size){
  const val = normalizeFontSize(size);
  document.body.classList.remove('api-font-xsmall','api-font-small','api-font-medium','api-font-big','api-font-large','api-font-xlarge');
  document.body.classList.add('api-font-' + val);
  localStorage.setItem('tsgApiFontSize', val);
  if($('apiFontSize')) $('apiFontSize').value = val;
}
async function saveApiFontSize(size){
  const val=normalizeFontSize(size);
  applyApiFontSize(val);
  try{ await fetch('/api/settings',{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiFontSize:val})}); }catch(e){}
}


function clearTemplateForm(){
  if($('templateId')) templateId.value='';
  if($('templateName')) templateName.value='';
  if($('templateLanguage')) templateLanguage.value='en';
  if($('templateCategory')) templateCategory.value='Utility';
  if($('templateHeaderType')) templateHeaderType.value='None';
  if($('templateUseCase')) templateUseCase.value='';
  if($('templateBody')) templateBody.value='';
  if($('templateVariables')) templateVariables.value='';
  if($('templateButtons')) templateButtons.value='';
  if($('templateEnabled')) templateEnabled.checked=true;
  if($('templateEditorTitle')) templateEditorTitle.textContent='Add / Modify Template';
  selectedTemplateId='';
  renderTemplates();
}
function editTemplate(id){
  const t=whatsappTemplates.find(x=>String(x.id)===String(id) || x.name===id); if(!t) return;
  selectedTemplateId=t.id;
  if($('templateId')) templateId.value=t.id||'';
  if($('templateName')) templateName.value=t.name||'';
  if($('templateLanguage')) templateLanguage.value=t.language||'en';
  if($('templateCategory')) templateCategory.value=t.category||'Utility';
  if($('templateHeaderType')) templateHeaderType.value=t.headerType||'None';
  if($('templateUseCase')) templateUseCase.value=t.useCase||'';
  if($('templateBody')) templateBody.value=t.body||'';
  if($('templateVariables')) templateVariables.value=(t.variables||[]).join('\n');
  if($('templateButtons')) templateButtons.value=buttonsToText(t.buttons||[]);
  if($('templateEnabled')) templateEnabled.checked=t.enabled!==false;
  if($('templateEditorTitle')) templateEditorTitle.textContent='Modify Template: '+(t.name||'');
  renderTemplates();
}
function renderTemplates(){
  const list=$('templateList'); if(!list) return;
  const q=($('templateSearch')?.value||'').toLowerCase().trim();
  const cat=$('templateCategoryFilter')?.value||'';
  const filtered=uniqueTemplates().filter(t=>(!q||templateValue(t).includes(q))&&(!cat||t.category===cat));
  list.innerHTML=filtered.map(t=>{
    const usedTargets=templateUsedTargets(t); const usedLabel=templateUsedLabel(t); const isUsed=usedTargets.length>0;
    const selected=!!t.selectedForUse || usedTargets.includes('selected');
    const actionText = selected ? 'Selected' : 'Use';
    const actionClass = selected ? 'used-btn' : '';
    const bodyPreview = String(t.body||'').split(/\r?\n/).filter(Boolean).slice(0,4).join('\n');
    return `<div class="template-card compact-template-card ${String(selectedTemplateId)===String(t.id)?'selected':''} ${isUsed?'template-used':''}">
      <div class="template-card-head"><b>${esc(t.name)}</b><span>${esc(t.category||'')} • ${esc(t.language||'en')}</span></div>
      ${isUsed?`<div class="used-badge">${selected?'SELECTED':'USED'}${usedLabel && usedLabel!=='Selected / Use'?': '+esc(usedLabel):''}</div>`:`<div class="available-badge">Available</div>`}
      <p>${esc(t.useCase||'')}</p>
      <small>Header: ${esc(t.headerType||'None')} • Variables: ${esc((t.variables||[]).length)}</small>
      <pre>${esc(bodyPreview || (t.body||'').slice(0,180))}</pre>
      <div class="template-actions compact-template-actions">
        <button class="ghost-btn" data-edit-template="${esc(t.id)}">Modify</button>
        <button class="ghost-btn ${actionClass}" data-toggle-template="${esc(t.id)}">${actionText}</button>
        <button class="ghost-btn danger-outline" data-delete-template="${esc(t.id)}">Remove</button>
      </div>
    </div>`;
  }).join('') || '<p>No templates found. Click Add Template or Restore Default 12.</p>';
  renderBulkTemplateSelect();
}
function applyMappingsToFields(mappings){
  if(!mappings) return;
  if(mappings.customer_followup){ if($('CUSTOMER_WHATSAPP_TEMPLATE_NAME')) CUSTOMER_WHATSAPP_TEMPLATE_NAME.value=mappings.customer_followup.name||''; if($('CUSTOMER_WHATSAPP_TEMPLATE_LANG')) CUSTOMER_WHATSAPP_TEMPLATE_LANG.value=mappings.customer_followup.language||'en'; if($('CUSTOMER_WHATSAPP_MESSAGES_ENABLED')) CUSTOMER_WHATSAPP_MESSAGES_ENABLED.value=String(mappings.customer_followup.enabled ?? CUSTOMER_WHATSAPP_MESSAGES_ENABLED.value ?? 'false'); }
  if(mappings.order_confirmation){ if($('ORDER_CONFIRMATION_TEMPLATE_NAME')) ORDER_CONFIRMATION_TEMPLATE_NAME.value=mappings.order_confirmation.name||''; if($('ORDER_CONFIRMATION_TEMPLATE_LANG')) ORDER_CONFIRMATION_TEMPLATE_LANG.value=mappings.order_confirmation.language||'en'; if($('ORDER_CONFIRMATION_WHATSAPP_ENABLED')) ORDER_CONFIRMATION_WHATSAPP_ENABLED.value=String(mappings.order_confirmation.enabled ?? ORDER_CONFIRMATION_WHATSAPP_ENABLED.value ?? 'false'); }
  if(mappings.cod_order){ if($('COD_ORDER_CONFIRMATION_TEMPLATE_NAME')) COD_ORDER_CONFIRMATION_TEMPLATE_NAME.value=mappings.cod_order.name||''; if($('COD_ORDER_CONFIRMATION_TEMPLATE_LANG')) COD_ORDER_CONFIRMATION_TEMPLATE_LANG.value=mappings.cod_order.language||'en'; if($('COD_CONFIRMATION_WHATSAPP_ENABLED')) COD_CONFIRMATION_WHATSAPP_ENABLED.value=String(mappings.cod_order.enabled ?? COD_CONFIRMATION_WHATSAPP_ENABLED.value ?? 'true'); }
  if(mappings.test_whatsapp){ if($('WHATSAPP_TEST_TEMPLATE_NAME')) WHATSAPP_TEST_TEMPLATE_NAME.value=mappings.test_whatsapp.name||''; if($('WHATSAPP_TEST_TEMPLATE_LANG')) WHATSAPP_TEST_TEMPLATE_LANG.value=mappings.test_whatsapp.language||'en_US'; }
}
async function saveTemplate(){
  const body={
    id:$('templateId')?.value||undefined,
    name:$('templateName')?.value.trim()||'',
    language:$('templateLanguage')?.value.trim()||'en',
    category:$('templateCategory')?.value||'Utility',
    headerType:$('templateHeaderType')?.value||'None',
    useCase:$('templateUseCase')?.value.trim()||'',
    body:$('templateBody')?.value.trim()||'',
    variables:($('templateVariables')?.value||'').split(/\r?\n|,/).map(x=>x.trim()).filter(Boolean),
    buttons:parseTemplateButtons($('templateButtons')?.value||''),
    enabled:$('templateEnabled') ? templateEnabled.checked : true,
    selectedForUse: !!(whatsappTemplates.find(x=>String(x.id)===String($('templateId')?.value||''))?.selectedForUse)
  };
  if(!body.name) return alert('Template Name required.');
  if(!body.body) return alert('Body Text required.');
  const res=await fetch('/api/whatsapp-templates',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('templateResult')) templateResult.textContent=JSON.stringify(res,null,2);
  if(res.ok){ whatsappTemplates=res.templates||[]; whatsappTemplateMappings=res.mappings||whatsappTemplateMappings||{}; selectedTemplateId=(res.template&&res.template.id)||body.id||body.name; await loadApiTemplates(); alert('Template saved.'); }
}
async function deleteTemplate(id){
  if(!confirm('Remove this template from tool library? Meta WhatsApp Manager template delete nahi hoga.')) return;
  const res=await fetch('/api/whatsapp-templates/'+encodeURIComponent(id),{method:'DELETE',credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('templateResult')) templateResult.textContent=JSON.stringify(res,null,2);
  if(res.ok){ whatsappTemplates=res.templates||[]; whatsappTemplateMappings=res.mappings||whatsappTemplateMappings||{}; if(selectedTemplateId===id) selectedTemplateId=''; await loadApiTemplates(); }
}
async function restoreDefaultTemplates(){
  if(!confirm('Default 12 Tiny Shiny templates restore karne hain? Existing custom templates replace ho sakte hain.')) return;
  const res=await fetch('/api/whatsapp-templates/reset-defaults',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('templateResult')) templateResult.textContent=JSON.stringify(res,null,2);
  if(res.ok){ whatsappTemplates=res.templates||[]; whatsappTemplateMappings=res.mappings||{}; selectedTemplateId=whatsappTemplates[0]?.id||''; await loadApiTemplates(); }
}
async function mapTemplate(id, target){
  target = target || selectedMapTarget();
  const res=await fetch('/api/whatsapp-templates/use',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,target})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('templateResult')) templateResult.textContent=JSON.stringify(res,null,2);
  if(res.ok){ whatsappTemplates=res.templates||whatsappTemplates; whatsappTemplateMappings=res.mappings||whatsappTemplateMappings; applyMappingsToFields(whatsappTemplateMappings); await loadApiTemplates(); }
  else alert(res.error || 'Template map failed.');
}
async function unmapTemplate(id, target){
  target = target || selectedMapTarget();
  const res=await fetch('/api/whatsapp-templates/unuse',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,target})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('templateResult')) templateResult.textContent=JSON.stringify(res,null,2);
  if(res.ok){ whatsappTemplates=res.templates||whatsappTemplates; whatsappTemplateMappings=res.mappings||whatsappTemplateMappings; applyMappingsToFields(whatsappTemplateMappings); await loadApiTemplates(); }
  else alert(res.error || 'Template unuse failed.');
}
async function toggleTemplateUse(id, target){
  const tpl = whatsappTemplates.find(t=>String(t.id)===String(id) || t.name===id);
  const used = tpl ? templateUsedTargets(tpl).includes(target || selectedMapTarget()) : false;
  return used ? unmapTemplate(id, target) : mapTemplate(id, target);
}

function renderApiTemplates(){
  const box=$('apiTemplateList'); if(!box) return;
  const current={
    customer_followup: $('CUSTOMER_WHATSAPP_TEMPLATE_NAME')?.value.trim()||'',
    order_confirmation: $('ORDER_CONFIRMATION_TEMPLATE_NAME')?.value.trim()||'',
    cod_order: $('COD_ORDER_CONFIRMATION_TEMPLATE_NAME')?.value.trim()||'',
    ndr: $('NDR_TEMPLATE_NAME')?.value?.trim?.()||'',
    broadcast: $('BROADCAST_TEMPLATE_NAME')?.value?.trim?.()||'',
    test_whatsapp: $('WHATSAPP_TEST_TEMPLATE_NAME')?.value.trim()||''
  };
  box.innerHTML = uniqueTemplates().filter(t=>t.selectedForUse || templateUsedTargets(t).length).map(t=>{
    const targets = Object.entries(current).filter(([,name])=>name && name===t.name).map(([k])=>templateTargetLabels[k]||k);
    const selected = !!t.selectedForUse || templateUsedTargets(t).includes('selected');
    const used = targets.length>0 || selected;
    const label = targets.length ? 'USED: '+targets.join(', ') : 'SELECTED';
    return `<div class="template-status-row ${used?'template-used':''}"><div><b>${esc(t.name)}</b><small>${esc(t.category||'')} • ${esc(t.language||'en')} • Header: ${esc(t.headerType||'None')} • Params: ${esc((t.variables||[]).length)}</small></div><span class="${used?'used-badge':'available-badge'}">${used?esc(label):'Available'}</span></div>`;
  }).join('') || '<p>No selected templates yet. Saved Templates me Use click karo.</p>';
}
async function loadApiTemplates(){
  const d=await fetch('/api/whatsapp-templates',{credentials:'include',cache:'no-store'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message,templates:[],mappings:{}}));
  whatsappTemplates=Array.isArray(d.templates)?d.templates:[]; whatsappTemplates=uniqueTemplates();
  whatsappTemplateMappings=d.mappings||{};
  if(!selectedTemplateId && whatsappTemplates[0]) selectedTemplateId=whatsappTemplates[0].id;
  const currentCustomer=$('CUSTOMER_WHATSAPP_TEMPLATE_NAME')?.value.trim()||'';
  const currentOrder=$('ORDER_CONFIRMATION_TEMPLATE_NAME')?.value.trim()||'';
  const currentTest=$('WHATSAPP_TEST_TEMPLATE_NAME')?.value.trim()||'';
  ['API_CUSTOMER_TEMPLATE_SELECT','API_CUSTOMER_TEMPLATE_SELECT_2'].forEach(id=>setSelectOptions(id,currentCustomer));
  ['API_ORDER_TEMPLATE_SELECT','API_ORDER_TEMPLATE_SELECT_2'].forEach(id=>setSelectOptions(id,currentOrder));
  ['API_TEST_TEMPLATE_SELECT','API_TEST_TEMPLATE_SELECT_2'].forEach(id=>setSelectOptions(id,currentTest));
  renderApiTemplates();
  renderTemplates();
  renderBulkTemplateSelect();
  updateBulkModeUi();
}
const colorOptions = ['#d63384','#9b35ff','#0ea5e9','#16a34a','#f97316','#111827'];
const colorNames = {'#d63384':'Tiny Shiny Pink','#9b35ff':'Premium Purple','#0ea5e9':'Sky Blue','#16a34a':'Fresh Green','#f97316':'Festive Orange','#111827':'Luxury Black'};
function normalizeColor(value){ const v=String(value||'').trim().toLowerCase(); return /^#[0-9a-f]{6}$/.test(v)?v:'#d63384'; }
function tint(hex, amount){ hex=normalizeColor(hex).slice(1); const n=parseInt(hex,16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; if(amount>=0){r+=(255-r)*amount;g+=(255-g)*amount;b+=(255-b)*amount}else{r*=(1+amount);g*=(1+amount);b*=(1+amount)} return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join(''); }
function applyThemeColor(value){ const color=normalizeColor(value); document.documentElement.style.setProperty('--pink', color); document.documentElement.style.setProperty('--pink2', tint(color,.28)); document.documentElement.style.setProperty('--purple', tint(color,-.12)); document.documentElement.style.setProperty('--line', tint(color,.76)); localStorage.setItem('tsgAdminThemeColor', color); }
function setThemeColor(value){ const color=normalizeColor(value); applyThemeColor(color); if($('themeColor')) $('themeColor').value=color; if($('themeHex')) $('themeHex').value=color.toUpperCase(); if($('themeColorPreview')) $('themeColorPreview').textContent=colorNames[color] || color.toUpperCase(); if($('themeColorPreset')) $('themeColorPreset').value=colorOptions.includes(color)?color:'custom'; }
async function loadTheme(){ try{ const data=await fetch('/api/settings',{credentials:'include',cache:'no-store'}).then(r=>r.json()); const settings=data.settings||{}; const color=settings.themeColor || localStorage.getItem('tsgAdminThemeColor') || '#d63384'; setThemeColor(color); if($('botName')) $('botName').value=settings.botName || 'Tiny Shiny Assistant'; applyApiFontSize(settings.apiFontSize || localStorage.getItem('tsgApiFontSize') || 'medium'); if($('chatbotEnabled')) { $('chatbotEnabled').checked = settings.chatbotEnabled !== false; if($('chatbotStatusText')) $('chatbotStatusText').textContent = $('chatbotEnabled').checked ? 'ON' : 'OFF'; } }catch{ setThemeColor(localStorage.getItem('tsgAdminThemeColor') || '#d63384'); } }
async function logout(){ try{ await fetch('/api/admin/logout',{method:'POST',credentials:'include',cache:'no-store'}); }catch(e){} window.location.replace('/login.html?logout=1&t='+Date.now()); }

async function loadConnectionStatus(){
  const grid=$('connectionStatusGrid'); if(!grid) return;
  grid.innerHTML='<div class="connection-loading">Checking API status...</div>';
  const d=await fetch('/api/connection-status',{credentials:'include',cache:'no-store'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message,rows:[]}));
  if(!d.ok){ grid.innerHTML=`<div class="connection-item not"><b>Status load failed</b><span>${esc(d.error||'Error')}</span></div>`; return; }
  lastApiConnectionRows = d.rows || [];
  const summary=d.summary||{};
  const summaryHtml=`<div class="api-status-summary compact"><b>Total APIs: ${summary.total||0}</b><span class="ok-dot">Connected: ${summary.connected||0}</span><span class="warn-dot">Error: ${summary.error||0}</span><span class="bad-dot">Not Connected: ${summary.notConnected||0}</span></div>`;
  grid.innerHTML=summaryHtml+`<div class="connection-card-grid">`+lastApiConnectionRows.map(x=>{
    const status=x.status || (x.connected?'connected':'not_connected');
    const label=status==='connected'?'Connected':(status==='error'?'Connected but Error':'Not Connected');
    const cls=status==='connected'?'ok':(status==='error'?'warn':'not');
    const logs=(x.logs||[]).slice(0,2).map(l=>`<li>${esc(l)}</li>`).join('');
    const clickable=status==='error' || (x.logs||[]).length;
    return `<button type="button" class="connection-item ${cls} ${clickable?'clickable':''}" data-api-log-key="${esc(x.key)}">
      <div class="connection-top"><b><span class="status-light ${cls}"></span>${esc(x.name)}</b><em>${label}</em></div>
      <p>${esc(x.details||'')}</p>
      ${logs?`<ul class="api-log-list">${logs}</ul>`:''}
      ${clickable?'<small>Click for full log</small>':''}
    </button>`;
  }).join('')+`</div>`;
  if($('connectionStatusTime')) connectionStatusTime.textContent='Last checked: '+(d.checkedAt||new Date().toISOString());
}


function apiStatusHindi(row){
  const status=row?.status || (row?.connected?'connected':'not_connected');
  if(status==='connected') return 'API working hai. Live test successful.';
  if(status==='error') {
    if(String(row?.key)==='meta') return 'Token saved hai, lekin Ad Account ka ads_read / ads_management access nahi mila ya token valid user/ad account se linked nahi hai.';
    return 'API details saved hain, lekin live test fail ho raha hai.';
  }
  return 'Required API settings missing hain.';
}
function openApiErrorLog(key){
  const row=(lastApiConnectionRows||[]).find(x=>String(x.key)===String(key));
  if(!row) return;
  lastApiErrorLogKey=key;
  const modal=$('apiErrorLogModal'), title=$('apiErrorLogTitle'), body=$('apiErrorLogBody');
  if(!modal||!body) return;
  if(title) title.textContent=(row.name||'API')+' Log';
  const logs=(row.logs||[]).map(l=>`<li>${esc(l)}</li>`).join('') || '<li>No log available.</li>';
  const status=row.status || (row.connected?'connected':'not_connected');
  const cls=status==='connected'?'ok':(status==='error'?'warn':'not');
  body.innerHTML=`<div class="api-log-summary ${cls}">
    <p><b>Status:</b> ${esc(status==='connected'?'Connected':(status==='error'?'Connected but Error':'Not Connected'))}</p>
    <p><b>Reason:</b> ${esc(apiStatusHindi(row))}</p>
    <p><b>Details:</b> ${esc(row.details||'-')}</p>
  </div>
  <h3>Full Logs</h3>
  <ul class="api-full-log-list">${logs}</ul>
  ${String(row.key)==='meta'?`<div class="api-fix-box"><b>Meta Ads Suggested Fix</b><ol>
    <li>Ad Account ID format <b>act_XXXXXXXX</b> rakho.</li>
    <li>Token me <b>ads_read</b> permission add karo.</li>
    <li>Business Settings me same user/system user ko Ad Account access do.</li>
    <li>Permission update ke baad <b>Test Again</b> click karo.</li>
  </ol></div>`:''}`;
  modal.classList.remove('hidden');
}
function closeApiErrorLog(){ const m=$('apiErrorLogModal'); if(m) m.classList.add('hidden'); }
function copyApiErrorLog(){
  const row=(lastApiConnectionRows||[]).find(x=>String(x.key)===String(lastApiErrorLogKey));
  const text=row ? `${row.name}\nStatus: ${row.status}\nDetails: ${row.details||''}\nLogs:\n${(row.logs||[]).join('\n')}` : '';
  navigator.clipboard?.writeText(text).then(()=>alert('Error log copied')).catch(()=>alert(text));
}

async function loadConfig(){
  await loadTheme(); await loadConnectionStatus();
  const data = await fetch('/api/config',{credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if(!data.ok) return alert('Could not load API settings');
  const cfg = data.config || {};
  keys.forEach(k => { if($(k)) $(k).value = cfg[k] || ''; });
  if($('basicOwnerNumberMirror')) basicOwnerNumberMirror.value = cfg.OWNER_WHATSAPP_NUMBER || '';
  await loadBasicSettingsAndFaqs();
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

async function loadBasicSettingsAndFaqs(){
  const [settingsRes, faqRes] = await Promise.all([
    fetch('/api/settings',{credentials:'include',cache:'no-store'}).then(r=>r.json()).catch(()=>({settings:{}})),
    fetch('/api/faqs',{credentials:'include',cache:'no-store'}).then(r=>r.json()).catch(()=>({faqs:[]}))
  ]);
  const settings=settingsRes.settings||{};
  ['welcomeMessage','fallbackMessage','leadOfferMessage','cartOfferMessage','leadPopupDelaySeconds'].forEach(id=>{ if($(id)) $(id).value=settings[id]||''; });
  if($('basicOwnerNumberMirror')) basicOwnerNumberMirror.value = $('OWNER_WHATSAPP_NUMBER')?.value || '';
  faqs=faqRes.faqs||[];
  renderFaqs();
}
function renderFaqs(){
  const box=$('faqList'); if(!box) return;
  box.innerHTML=(faqs||[]).map((faq,index)=>`<div class="faq-row faq-settings-row"><label>Keywords <input data-faq-index="${index}" data-faq-field="keywords" value="${esc((faq.keywords||[]).join(', '))}" placeholder="track, order, shipping"/></label><label>Answer <textarea data-faq-index="${index}" data-faq-field="answer" placeholder="Reply answer">${esc(faq.answer||'')}</textarea></label><button type="button" data-remove-faq="${index}" class="ghost-btn danger-outline">Remove</button></div>`).join('') || '<p class="hint">No FAQ rules. + Add FAQ click karo.</p>';
}
async function saveBasicSettings(){
  const body={
    welcomeMessage:$('welcomeMessage')?.value||'',
    fallbackMessage:$('fallbackMessage')?.value||'',
    leadOfferMessage:$('leadOfferMessage')?.value||'',
    cartOfferMessage:$('cartOfferMessage')?.value||'',
    leadPopupDelaySeconds:Number($('leadPopupDelaySeconds')?.value||12)
  };
  const res=await fetch('/api/settings',{method:'POST',credentials:'include',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('basicSettingsResult')) show($('basicSettingsResult'), res.ok ? {ok:true,message:'Basic settings saved.'} : res);
  return res;
}
async function saveFaqRules(){
  const res=await fetch('/api/faqs',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({faqs})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('faqResult')) show($('faqResult'), res.ok ? {ok:true,message:'FAQ rules saved.', total:(faqs||[]).length} : res);
  return res;
}

function downloadConfigBackup(){
  const a = document.createElement('a');
  a.href = '/api/config/download?t=' + Date.now();
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
async function uploadConfigBackup(fileInput){
  const file = fileInput?.files?.[0];
  if(!file) return;
  if(!confirm('This will update your current API settings from backup file. Continue?')) { fileInput.value=''; return; }
  const text = await file.text();
  const res = await fetch('/api/config/upload',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('saveStatus')) $('saveStatus').textContent = res.message || (res.ok ? 'Backup uploaded. API settings and templates restored.' : 'Upload failed');
  if($('templateResult')) templateResult.textContent = JSON.stringify(res, null, 2);
  fileInput.value='';
  if(res.ok) await loadConfig();
  else alert(res.error || 'Backup upload failed.');
}



// ---------- Templates Library: Single/Bulk Image + Text Sender ----------
function renderBulkTemplateSelect(){
  const sel=$('bulkLibraryTemplate'); if(!sel) return;
  const current=sel.value;
  sel.innerHTML='<option value="">Manual / Select template</option>'+uniqueTemplates().map(t=>`<option value="${esc(t.id)}">${esc(t.name)} (${esc.headerType||'None'})</option>`).join('');
  if(current && [...sel.options].some(o=>o.value===current)) sel.value=current;
}
function selectedBulkTemplate(){ return templateBySelectValue($('bulkLibraryTemplate')?.value||''); }
function applyBulkTemplate(){
  const tpl=selectedBulkTemplate(); if(!tpl) return;
  if($('bulkLibraryMessage')) bulkLibraryMessage.value=tpl.body||'';
  if($('bulkLibraryImageUrl') && (tpl.headerType||'').toLowerCase()==='image' && tpl.imageUrl) bulkLibraryImageUrl.value=tpl.imageUrl;
}
function parseBulkPhones(text=''){
  return String(text||'').split(/[\n,;\t ]+/).map(x=>x.replace(/\D/g,'')).filter(x=>x.length>=10).map(x=>x.length>10?x.slice(-10):x).map(x=>'91'+x).filter((x,i,a)=>a.indexOf(x)===i);
}
async function sendLibraryBulkMessage(){
  const mode=$('bulkLibraryMode')?.value||'single';
  const single=$('bulkLibrarySinglePhone')?.value||'';
  const bulk=$('bulkLibraryPhones')?.value||'';
  const phones=mode==='single'?parseBulkPhones(single):parseBulkPhones(bulk);
  const tpl=selectedBulkTemplate();
  const body={
    phones,
    templateName:tpl?.name||'',
    templateLang:tpl?.language||'en',
    message:$('bulkLibraryMessage')?.value||'',
    imageUrl:$('bulkLibraryImageUrl')?.value||''
  };
  if(!phones.length) return alert(mode==='single'?'Single WhatsApp number required.':'Bulk phone numbers required.');
  if(!body.message.trim() && !body.imageUrl.trim()) return alert('Text message ya image URL required.');
  const res=await fetch('/api/whatsapp-bulk/send',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('bulkLibraryResult')) bulkLibraryResult.textContent=JSON.stringify(res,null,2);
}
function updateBulkModeUi(){
  const mode=$('bulkLibraryMode')?.value||'single';
  if($('bulkSingleBox')) bulkSingleBox.style.display=mode==='single'?'block':'none';
  if($('bulkPhonesBox')) bulkPhonesBox.style.display=mode==='bulk'?'block':'none';
}

async function saveConfig(){
  const body = {};
  keys.forEach(k => { if($(k)) body[k] = $(k).value.trim(); });
  const data = await fetch('/api/config',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
  if($('saveStatus')) $('saveStatus').textContent = data.message || (data.ok ? 'Saved' : 'Save failed');
  if(data.ok) await loadApiTemplates();
  return data;
}
document.addEventListener('input', e=>{
  if(e.target.id === 'themeColor') setThemeColor(e.target.value);
  if(e.target.id === 'themeHex') setThemeColor(e.target.value);
  if(['CUSTOMER_WHATSAPP_TEMPLATE_NAME','ORDER_CONFIRMATION_TEMPLATE_NAME','WHATSAPP_TEST_TEMPLATE_NAME'].includes(e.target.id)) renderApiTemplates();
  if(e.target.id==='templateSearch') renderTemplates();
  if(e.target.id === 'chatbotEnabled' && $('chatbotStatusText')) $('chatbotStatusText').textContent = e.target.checked ? 'ON' : 'OFF';
  const fi=e.target.dataset.faqIndex, ff=e.target.dataset.faqField;
  if(fi!==undefined && ff){
    const idx=Number(fi);
    if(!faqs[idx]) return;
    if(ff==='keywords') faqs[idx].keywords=e.target.value.split(',').map(x=>x.trim()).filter(Boolean);
    if(ff==='answer') faqs[idx].answer=e.target.value;
  }
});
document.addEventListener('change', e=>{
  if(e.target.id === 'themeColorPreset' && e.target.value !== 'custom') setThemeColor(e.target.value);
  if(e.target.id==='templateCategoryFilter' || e.target.id==='templateMapTarget') renderTemplates();
  if(e.target.id==='bulkLibraryTemplate') applyBulkTemplate();
  if(e.target.id==='bulkLibraryMode') updateBulkModeUi();
  if(e.target.id==='apiFontSize') saveApiFontSize(e.target.value);
  if(e.target.id==='uploadConfigFile' || e.target.id==='uploadConfigFile2') uploadConfigBackup(e.target);
  const selectMap={API_CUSTOMER_TEMPLATE_SELECT:'customer_followup',API_CUSTOMER_TEMPLATE_SELECT_2:'customer_followup',API_ORDER_TEMPLATE_SELECT:'order_confirmation',API_ORDER_TEMPLATE_SELECT_2:'order_confirmation',API_TEST_TEMPLATE_SELECT:'test_whatsapp',API_TEST_TEMPLATE_SELECT_2:'test_whatsapp'};
  if(selectMap[e.target.id]) applyApiTemplateToTarget(templateBySelectValue(e.target.value), selectMap[e.target.id]);
});
document.addEventListener('click', async (e)=>{
  if(e.target.id === 'saveAppearance') return saveAppearance();
  if(e.target.id === 'saveSettings') return saveBasicSettings();
  if(e.target.id === 'addFaq') { faqs.push({keywords:['new keyword'],answer:'New answer'}); renderFaqs(); return; }
  if(e.target.id === 'saveFaqs') return saveFaqRules();
  if(e.target.dataset.removeFaq!==undefined){ faqs.splice(Number(e.target.dataset.removeFaq),1); renderFaqs(); return; }
  if(e.target.closest('#logoutBtn')) { e.preventDefault(); return logout(); }
  if(e.target.id === 'saveConfig') saveConfig();
  if(e.target.id === 'refreshApiTemplates') loadApiTemplates();
  if(e.target.id === 'newTemplateBtn') { clearTemplateForm(); if($('templateName')) templateName.focus(); }
  if(e.target.id === 'clearTemplateForm') clearTemplateForm();
  if(e.target.id === 'saveTemplate') saveTemplate();
  if(e.target.id === 'restoreDefaultTemplates') restoreDefaultTemplates();
  if(e.target.id === 'mapTemplateToAutomation') { const id=$('templateId')?.value || selectedTemplateId; if(!id) return alert('Please select or save a template first.'); mapTemplate(id, 'selected'); }
  if(e.target.dataset.editTemplate) editTemplate(e.target.dataset.editTemplate);
  if(e.target.dataset.deleteTemplate) deleteTemplate(e.target.dataset.deleteTemplate);
  if(e.target.dataset.mapTemplate) mapTemplate(e.target.dataset.mapTemplate, e.target.dataset.mapTarget || undefined);
  if(e.target.dataset.toggleTemplate) toggleTemplateUse(e.target.dataset.toggleTemplate, 'selected');
  if(e.target.id === 'downloadConfig' || e.target.id === 'downloadConfig2') downloadConfigBackup();
  if(e.target.id === 'sendBulkLibraryMessage') sendLibraryBulkMessage();
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


// ---------- NDR API Settings ----------
async function loadNdrApiSettings(){
  const d=await fetch('/api/ndr',{credentials:'include',cache:'no-store'}).then(r=>r.json()).catch(()=>({settings:{}}));
  const st=d.settings||{};
  if($('apiNdrBeforeDeliveryEnabled')) apiNdrBeforeDeliveryEnabled.checked=!!st.beforeDeliveryEnabled;
  if($('apiNdrFailedDeliveryEnabled')) apiNdrFailedDeliveryEnabled.checked=!!st.failedDeliveryEnabled;
  if($('apiNdrReminderHours')) apiNdrReminderHours.value=st.reminderHours||24;
  if($('apiNdrAdminNumber')) apiNdrAdminNumber.value=st.adminNumber||'';
  if($('apiNdrBeforeTemplate')) apiNdrBeforeTemplate.value=st.beforeTemplate||'order_out_for_delivery';
  if($('apiNdrFailedTemplate')) apiNdrFailedTemplate.value=st.failedTemplate||'ndr_failed_delivery';
  if($('apiNdrBeforeMessage')) apiNdrBeforeMessage.value=st.beforeMessage||'';
  if($('apiNdrFailedMessage')) apiNdrFailedMessage.value=st.failedMessage||'';
}
async function saveNdrApiSettings(){
  const body={beforeDeliveryEnabled:!!$('apiNdrBeforeDeliveryEnabled')?.checked, failedDeliveryEnabled:!!$('apiNdrFailedDeliveryEnabled')?.checked, reminderHours:Number($('apiNdrReminderHours')?.value||24), adminNumber:$('apiNdrAdminNumber')?.value||'', beforeTemplate:$('apiNdrBeforeTemplate')?.value||'', failedTemplate:$('apiNdrFailedTemplate')?.value||'', beforeMessage:$('apiNdrBeforeMessage')?.value||'', failedMessage:$('apiNdrFailedMessage')?.value||''};
  const d=await fetch('/api/ndr/settings',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if($('apiNdrResult')) show($('apiNdrResult'), d);
}
document.addEventListener('click', e=>{ if(e.target.id==='saveNdrApiSettings') saveNdrApiSettings(); });
setTimeout(()=>loadNdrApiSettings().catch(()=>{}),0);

document.addEventListener('click', e=>{ if(e.target && e.target.id==='refreshConnectionStatus') loadConnectionStatus(); });

document.addEventListener('click', e=>{
  const apiLogBtn=e.target.closest('[data-api-log-key]');
  if(apiLogBtn){ openApiErrorLog(apiLogBtn.dataset.apiLogKey); return; }
  if(e.target && e.target.id==='closeApiErrorLog') closeApiErrorLog();
  if(e.target && e.target.id==='copyApiErrorLog') copyApiErrorLog();
  if(e.target && e.target.id==='testApiAgain') loadConnectionStatus();
});


function renderUnlimitedWhatsappFormats(){
  const box=$('unlimitedWhatsappFormats'); if(!box) return;
  box.innerHTML=(whatsappTemplates||[]).map((t,i)=>`<div class="unlimited-format-row">
    <b>${esc(i+1)}. ${esc(t.name)}</b>
    <span>${esc(t.language||'en')} • ${esc(t.category||'Utility')} • Header: ${esc(t.headerType||'None')}</span>
    <small>${esc(t.useCase||'')}</small>
    <button type="button" class="ghost-btn compact-btn" data-edit-template="${esc(t.id)}">Edit</button>
  </div>`).join('') || '<p class="hint">Abhi koi format nahi hai. + Add Format click karo.</p>';
}
function addQuickWhatsappFormat(){
  clearTemplateForm();
  const n=(whatsappTemplates||[]).length+1;
  if($('templateName')) templateName.value='custom_template_'+n;
  if($('templateLanguage')) templateLanguage.value='en';
  if($('templateCategory')) templateCategory.value='Utility';
  if($('templateHeaderType')) templateHeaderType.value='None';
  if($('templateUseCase')) templateUseCase.value='Custom / Manual / Broadcast';
  if($('templateBody')) templateBody.value='Hi {{1}}, thank you for connecting with Tiny Shiny Gifts.';
  if($('templateVariables')) templateVariables.value='Customer Name';
  if($('templateEditorTitle')) templateEditorTitle.textContent='Add New WhatsApp Format';
  document.getElementById('templateName')?.scrollIntoView({behavior:'smooth',block:'center'});
}
document.addEventListener('click', e=>{
  if(e.target.id==='addUnlimitedWhatsappFormat') addQuickWhatsappFormat();
  if(e.target.id==='refreshCodDebugLogs') loadCodDebugLogs();
});
async function loadCodDebugLogs(){
  const box=$('codDebugLogs'); if(!box) return;
  const d=await fetch('/api/cod/debug-logs',{credentials:'include',cache:'no-store'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  box.textContent=JSON.stringify(d,null,2);
}
setInterval(renderUnlimitedWhatsappFormats, 2500);

document.addEventListener('click', e=>{
  if(e.target && e.target.id==='openTemplatesLibraryTop'){ window.location.href='/templates-library.html'; }
});
