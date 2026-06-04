const keys = ['WEBSITE_URL','WHATSAPP_NUMBER','OWNER_WHATSAPP_NUMBER','ADMIN_USERNAME','ADMIN_PASSWORD','ADMIN_DOB','SECURITY_SESSION_SECRET','ADMIN_SESSION_HOURS','SHOPIFY_STORE_DOMAIN','SHOPIFY_ADMIN_ACCESS_TOKEN','SHOPIFY_API_VERSION','CREATE_SHOPIFY_DRAFT_ORDER','SHOPIFY_CLIENT_ID','SHOPIFY_CLIENT_SECRET','SHOPIFY_APP_URL','SHOPIFY_OAUTH_SCOPES','SHOPIFY_OAUTH_REDIRECT_URI','WHATSAPP_CLOUD_TOKEN','WHATSAPP_PHONE_NUMBER_ID','CUSTOMER_WHATSAPP_MESSAGES_ENABLED','CUSTOMER_WHATSAPP_TEMPLATE_NAME','CUSTOMER_WHATSAPP_TEMPLATE_LANG'];
function $(id){ return document.getElementById(id); }
function show(el, data){ el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2); }
function normalizeColor(value){ const v=String(value||'').trim().toLowerCase(); return /^#[0-9a-f]{6}$/.test(v)?v:'#d63384'; }
function tint(hex, amount){ hex=normalizeColor(hex).slice(1); const n=parseInt(hex,16); let r=(n>>16)&255,g=(n>>8)&255,b=n&255; if(amount>=0){r+=(255-r)*amount;g+=(255-g)*amount;b+=(255-b)*amount}else{r*=(1+amount);g*=(1+amount);b*=(1+amount)} return '#'+[r,g,b].map(x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join(''); }
function applyThemeColor(value){ const color=normalizeColor(value); document.documentElement.style.setProperty('--pink', color); document.documentElement.style.setProperty('--pink2', tint(color,.28)); document.documentElement.style.setProperty('--purple', tint(color,-.12)); document.documentElement.style.setProperty('--line', tint(color,.76)); }
async function loadTheme(){ try{ const data=await fetch('/api/settings',{credentials:'include'}).then(r=>r.json()); const color=(data.settings||{}).themeColor || localStorage.getItem('tsgAdminThemeColor') || '#d63384'; applyThemeColor(color); }catch{ applyThemeColor(localStorage.getItem('tsgAdminThemeColor') || '#d63384'); } }
async function logout(){ try{ await fetch('/api/admin/logout',{method:'POST',credentials:'include',cache:'no-store'}); }catch(e){} window.location.replace('/login.html?logout=1&t='+Date.now()); }
async function loadConfig(){
  await loadTheme();
  const data = await fetch('/api/config',{credentials:'include'}).then(r=>r.json()).catch(e=>({ok:false,error:e.message}));
  if(!data.ok) return alert('Could not load API settings');
  const cfg = data.config || {};
  keys.forEach(k => { if($(k)) $(k).value = cfg[k] || ''; });
}
async function saveConfig(){
  const body = {};
  keys.forEach(k => { if($(k)) body[k] = $(k).value.trim(); });
  const data = await fetch('/api/config',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(r=>r.json());
  $('saveStatus').textContent = data.message || (data.ok ? 'Saved' : 'Save failed');
  return data;
}
document.addEventListener('click', async (e)=>{
  if(e.target.closest('#logoutBtn')) { e.preventDefault(); return logout(); }
  if(e.target.id === 'saveConfig') saveConfig();
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
  if(e.target.id === 'testWhatsApp') {
    await saveConfig();
    const data = await fetch('/api/test-whatsapp',{method:'POST',credentials:'include'}).then(r=>r.json()).catch(err=>({ok:false,error:err.message}));
    show($('whatsappResult'), data);
  }
});
loadConfig();
