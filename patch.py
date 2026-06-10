from pathlib import Path
root=Path('/mnt/data/salespatch')
admin_html=root/'public/admin.html'
admin_js=root/'public/admin.js'
api_html=root/'public/api-settings.html'
api_js=root/'public/api-settings.js'
css=root/'public/style.css'
server=root/'server.js'

# 1 admin tab sales after Shopify Customers
s=admin_html.read_text()
if 'data-tab="shopifySalesPanel"' not in s:
    s=s.replace('<button class="tab-btn" data-tab="shopifyCustomersPanel">Shopify Customers</button>', '<button class="tab-btn" data-tab="shopifyCustomersPanel">Shopify Customers</button>\n      <button class="tab-btn" data-tab="shopifySalesPanel">Shopify Sales Analysis</button>')
# section insert after shopifyCustomersPanel end before bulkBroadcastPanel
if 'id="shopifySalesPanel"' not in s:
    marker='''    <section class="panel tab-panel" id="bulkBroadcastPanel">'''
    section='''    <section class="panel tab-panel sales-analysis-panel" id="shopifySalesPanel">
      <div class="section-head">
        <div><h2>Shopify Sales Analysis</h2><p>Shopify sales, Meta campaign report, per order cost and profit analysis with graphs.</p></div>
        <div class="inline-actions"><button id="refreshShopifySales" class="ghost-btn">Refresh Sales</button><button id="exportShopifySalesCsv" class="ghost-btn">Export CSV</button></div>
      </div>
      <div class="form-grid four sales-filters">
        <label>Date Range
          <select id="salesRange"><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 365 days</option></select>
        </label>
        <label>Campaign <input id="salesCampaignFilter" placeholder="Meta campaign name"/></label>
        <label>Payment <select id="salesPaymentFilter"><option value="">All</option><option value="cod">COD</option><option value="prepaid">Prepaid</option></select></label>
        <label>Order Status <select id="salesStatusFilter"><option value="">All</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option><option value="fulfilled">Fulfilled</option></select></label>
      </div>
      <div id="salesSummary" class="sales-summary-grid"></div>
      <div class="sales-grid">
        <div class="sales-card"><h3>Daily Sales Graph</h3><div id="salesDailyChart" class="mini-chart"></div></div>
        <div class="sales-card"><h3>COD vs Prepaid</h3><div id="salesPaymentChart" class="donut-wrap"></div></div>
        <div class="sales-card"><h3>Campaign Report</h3><div id="salesCampaignTable" class="table-wrap"></div></div>
        <div class="sales-card"><h3>Per Order Cost / Profit</h3><div id="salesOrderCostTable" class="table-wrap"></div></div>
        <div class="sales-card"><h3>Product Wise Sales</h3><div id="salesProductTable" class="table-wrap"></div></div>
        <div class="sales-card"><h3>City / State Sales</h3><div id="salesCityTable" class="table-wrap"></div></div>
      </div>
      <pre id="shopifySalesResult"></pre>
    </section>

'''
    s=s.replace(marker, section+marker)
admin_html.write_text(s)

# 2 API settings add Meta Ads section and keys
s=api_html.read_text()
if 'META_AD_ACCOUNT_ID' not in s:
    insert_after='''    <section class="panel">
      <h2>Shopify API</h2>'''
    meta='''    <section class="panel meta-ads-settings-panel">
      <h2>Meta Ads / Campaign Reporting</h2>
      <p>Shopify Sales Analysis me Meta spend, campaign report, cost per order aur ROAS ke liye.</p>
      <div class="form-grid two">
        <label>Meta Access Token <input id="META_ACCESS_TOKEN" type="password" placeholder="EAAG..."/></label>
        <label>Meta Ad Account ID <input id="META_AD_ACCOUNT_ID" placeholder="act_1234567890"/></label>
        <label>Facebook Page ID <input id="META_FACEBOOK_PAGE_ID" placeholder="Facebook Page ID"/></label>
        <label>Instagram Account ID <input id="META_INSTAGRAM_ACCOUNT_ID" placeholder="Instagram Business Account ID"/></label>
        <label>Default Meta Cost Per Order ₹ <input id="META_DEFAULT_COST_PER_ORDER" type="number" min="0" step="0.01" placeholder="0"/></label>
        <label>Default Shipping Cost ₹ <input id="DEFAULT_SHIPPING_COST" type="number" min="0" step="0.01" placeholder="0"/></label>
      </div>
      <p class="hint">Note: live Meta spend pull karne ke liye token + ad account ID required hoga. Agar token nahi hai to dashboard campaign/cost estimate aur saved broadcast data se report banayega.</p>
      <pre id="metaAdsResult"></pre>
    </section>

'''
    s=s.replace(insert_after, meta+insert_after)
api_html.write_text(s)

s=api_js.read_text()
if 'META_ACCESS_TOKEN' not in s.split('\n',1)[0]:
    old="'ORDER_CONFIRMATION_WHATSAPP_ENABLED','ORDER_CONFIRMATION_TEMPLATE_NAME','ORDER_CONFIRMATION_TEMPLATE_LANG'"
    new=old+",'META_ACCESS_TOKEN','META_AD_ACCOUNT_ID','META_FACEBOOK_PAGE_ID','META_INSTAGRAM_ACCOUNT_ID','META_DEFAULT_COST_PER_ORDER','DEFAULT_SHIPPING_COST'"
    s=s.replace(old,new)
api_js.write_text(s)

# 3 Admin JS append sales functions + improve notification and load hook
s=admin_js.read_text()
if 'let shopifySalesAnalysis' not in s:
    s=s.replace('let googleSheetUrl = \'\';', "let googleSheetUrl = '';\nlet shopifySalesAnalysis = null;")
# Insert load hook after phase2 maybe in refresh admin and load promise
s=s.replace("if(active === 'shopifyCustomersPanel') await loadShopifyCustomers().catch(()=>{});", "if(active === 'shopifyCustomersPanel') await loadShopifyCustomers().catch(()=>{});\n    if(active === 'shopifySalesPanel') await loadShopifySalesAnalysis().catch(()=>{});")
s=s.replace("loadShopifyCustomers().catch(()=>{}), loadWhatsappInbox()", "loadShopifyCustomers().catch(()=>{}), loadShopifySalesAnalysis().catch(()=>{}), loadWhatsappInbox()")
s=s.replace("if(active === 'phase2Panel') await loadPhase2Analytics().catch(()=>{});", "if(active === 'phase2Panel') await loadPhase2Analytics().catch(()=>{});\n    if(active === 'shopifySalesPanel') await loadShopifySalesAnalysis().catch(()=>{});")
# notify channels
s=s.replace("const n = new Notification('New WhatsApp Message',", "const n = new Notification('New Customer Message',")
s=s.replace("title:'New WhatsApp Message'", "title:'New Customer Message'")
if 'function renderSalesMoney' not in s:
    sales_js=r'''

// ---------- Shopify Sales Analysis / Meta campaign reports ----------
function renderSalesMoney(v){ return '₹' + Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0}); }
function salesPercent(v){ return Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:1}) + '%'; }
function tableHtml(headers, rows){ return `<table class="customer-table sales-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):'<tr><td colspan="'+headers.length+'">No data</td></tr>'}</tbody></table>`; }
function renderMiniBars(items, valueKey='sales', labelKey='date'){
  const max=Math.max(1,...items.map(x=>Number(x[valueKey]||0)));
  return `<div class="bar-chart">${items.map(x=>`<div class="bar-row"><span>${esc(x[labelKey]||'')}</span><div><i style="width:${Math.max(3,Number(x[valueKey]||0)/max*100)}%"></i></div><b>${renderSalesMoney(x[valueKey])}</b></div>`).join('')}</div>`;
}
function renderPaymentDonut(d){ const cod=Number(d.codOrders||0), prepaid=Number(d.prepaidOrders||0), total=Math.max(1,cod+prepaid); const codPct=Math.round(cod/total*100); return `<div class="donut" style="--p:${codPct}"><b>${codPct}%</b><span>COD</span></div><div class="donut-legend"><span><i></i> COD: ${cod}</span><span><i></i> Prepaid: ${prepaid}</span></div>`; }
function renderShopifySalesAnalysis(){
  const d=shopifySalesAnalysis||{}; const s=d.summary||{};
  if($('salesSummary')) salesSummary.innerHTML=[
    ['Total Sales',renderSalesMoney(s.totalSales)],['Orders',s.totalOrders||0],['Average Order Value',renderSalesMoney(s.averageOrderValue)],['Meta Spend',renderSalesMoney(s.metaSpend)],['Cost / Order',renderSalesMoney(s.costPerOrder)],['ROAS',Number(s.roas||0).toFixed(2)+'x'],['Estimated Profit',renderSalesMoney(s.estimatedProfit)],['Cancelled',s.cancelledOrders||0]
  ].map(x=>`<div class="sales-kpi"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('');
  if($('salesDailyChart')) salesDailyChart.innerHTML=renderMiniBars(d.daily||[],'sales','date');
  if($('salesPaymentChart')) salesPaymentChart.innerHTML=renderPaymentDonut(s);
  if($('salesCampaignTable')) salesCampaignTable.innerHTML=tableHtml(['Campaign','Spend','Orders','Revenue','Cost / Order','ROAS'], (d.campaigns||[]).map(c=>[esc(c.name||'Unknown'),renderSalesMoney(c.spend),esc(c.orders||0),renderSalesMoney(c.revenue),renderSalesMoney(c.costPerOrder),Number(c.roas||0).toFixed(2)+'x']));
  if($('salesOrderCostTable')) salesOrderCostTable.innerHTML=tableHtml(['Order','Date','Payment','Amount','Shipping','Meta Cost','Net Profit'], (d.orders||[]).slice(0,60).map(o=>[esc(o.name||o.id),esc(o.date||''),esc(o.payment||''),renderSalesMoney(o.amount),renderSalesMoney(o.shippingCost),renderSalesMoney(o.metaCost),renderSalesMoney(o.estimatedProfit)]));
  if($('salesProductTable')) salesProductTable.innerHTML=tableHtml(['Product','Qty','Revenue'], (d.products||[]).slice(0,50).map(p=>[esc(p.title),esc(p.qty),renderSalesMoney(p.revenue)]));
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
document.addEventListener('change', e=>{ if(['salesRange','salesPaymentFilter','salesStatusFilter'].includes(e.target.id)) loadShopifySalesAnalysis(); });
document.addEventListener('input', e=>{ if(e.target.id==='salesCampaignFilter') clearTimeout(window.__salesFilterTimer), window.__salesFilterTimer=setTimeout(loadShopifySalesAnalysis,350); });
document.addEventListener('click', e=>{ if(e.target.id==='refreshShopifySales') loadShopifySalesAnalysis(); if(e.target.id==='exportShopifySalesCsv') exportShopifySalesCsv(); });
'''
    # before load call
    s=s.replace("load().catch(err=>{console.error(err); if(String(err).includes('401')) location.href='/login.html';});", sales_js+"\nload().catch(err=>{console.error(err); if(String(err).includes('401')) location.href='/login.html';});")
admin_js.write_text(s)

# 4 server endpoint
s=server.read_text()
if "/api/shopify/sales-analysis" not in s:
    endpoint=r'''

function sumByMap(rows, keyFn, amountFn){
  const map=new Map();
  for(const row of rows){ const k=keyFn(row)||'Unknown'; const cur=map.get(k)||{name:k,orders:0,qty:0,revenue:0,sales:0}; cur.orders+=1; cur.revenue+=Number(amountFn(row)||0); cur.sales=cur.revenue; map.set(k,cur); }
  return Array.from(map.values()).sort((a,b)=>Number(b.revenue||0)-Number(a.revenue||0));
}
app.get('/api/shopify/sales-analysis', requireAdmin, async (req,res)=>{
  try{
    const config=getPublicConfig();
    const settings=readJson(settingsPath,{});
    const days=Math.max(1, Math.min(Number(req.query.range || req.query.Range || 30)||30, 365));
    const since=new Date(Date.now()-days*24*60*60*1000).toISOString();
    const defaultShip=Number(config.DEFAULT_SHIPPING_COST || settings.defaultShippingCost || 0)||0;
    const defaultMetaCost=Number(config.META_DEFAULT_COST_PER_ORDER || settings.metaDefaultCostPerOrder || 0)||0;
    const query=`created_at_min=${encodeURIComponent(since)}&status=any&limit=250&fields=id,name,order_number,created_at,email,phone,customer,billing_address,shipping_address,financial_status,fulfillment_status,total_price,currency,cancelled_at,cancel_reason,tags,source_name,discount_codes,line_items`;
    const r=await shopifyFetch('orders.json?'+query).catch(e=>({ok:false,error:e.message,orders:[]}));
    let rawOrders=r.orders||[];
    const paymentFilter=String(req.query.payment||'').toLowerCase();
    const statusFilter=String(req.query.status||'').toLowerCase();
    const campaignFilter=String(req.query.campaign||'').toLowerCase();
    const campaigns=readJson(broadcastCampaignsPath,[]);
    const clicks=readJson(linkClicksPath,[]);
    let orders=rawOrders.map(o=>{
      const amount=Number(o.total_price||0)||0;
      const tagStr=String(o.tags||'').toLowerCase();
      const isCod=tagStr.includes('cod') || String(o.financial_status||'').toLowerCase().includes('pending');
      const metaCost=defaultMetaCost;
      const shippingCost=defaultShip;
      const estimatedProfit=amount-shippingCost-metaCost;
      const city=(o.shipping_address&&o.shipping_address.city)||(o.billing_address&&o.billing_address.city)||'';
      const province=(o.shipping_address&&o.shipping_address.province)||(o.billing_address&&o.billing_address.province)||'';
      return { id:o.id, name:o.name||('#'+(o.order_number||'')), date:String(o.created_at||'').slice(0,10), createdAt:o.created_at, payment:isCod?'COD':'Prepaid', amount, shippingCost, metaCost, estimatedProfit, status:o.cancelled_at?'cancelled':(o.fulfillment_status||o.financial_status||'open'), city:[city,province].filter(Boolean).join(', ')||'Unknown', line_items:o.line_items||[], tags:o.tags||'' };
    });
    if(paymentFilter) orders=orders.filter(o=>paymentFilter==='cod'?o.payment==='COD':o.payment==='Prepaid');
    if(statusFilter) orders=orders.filter(o=>String(o.status||'').toLowerCase().includes(statusFilter));
    if(campaignFilter) orders=orders.filter(o=>String(o.tags||'').toLowerCase().includes(campaignFilter));
    const totalSales=orders.reduce((s,o)=>s+o.amount,0), totalOrders=orders.length;
    const metaSpend=orders.reduce((s,o)=>s+o.metaCost,0);
    const dailyMap=new Map();
    for(const o of orders){ const cur=dailyMap.get(o.date)||{date:o.date,sales:0,orders:0}; cur.sales+=o.amount; cur.orders+=1; dailyMap.set(o.date,cur); }
    const daily=Array.from(dailyMap.values()).sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const productMap=new Map();
    for(const o of orders){ for(const li of (o.line_items||[])){ const title=li.title||li.name||'Product'; const cur=productMap.get(title)||{title,qty:0,revenue:0}; cur.qty+=Number(li.quantity||0); cur.revenue+=Number(li.price||0)*Number(li.quantity||1); productMap.set(title,cur); } }
    const products=Array.from(productMap.values()).sort((a,b)=>b.revenue-a.revenue);
    const cities=sumByMap(orders,o=>o.city,o=>o.amount);
    const campaignStats=campaigns.map(c=>{
      const spend=Number(c.spend||c.metaSpend||0)||0;
      const revenue=Number(c.revenue||0)||0;
      const corders=Number(c.orders||c.orderCount||0)||0;
      return { name:c.name||c.templateName||'WhatsApp Campaign', spend, orders:corders, revenue, costPerOrder:corders?spend/corders:0, roas:spend?revenue/spend:0, clicks:clicks.filter(x=>x.campaignId===c.id).length };
    }).slice(0,100);
    const summary={ totalSales, totalOrders, averageOrderValue:totalOrders?totalSales/totalOrders:0, codOrders:orders.filter(o=>o.payment==='COD').length, prepaidOrders:orders.filter(o=>o.payment==='Prepaid').length, cancelledOrders:orders.filter(o=>String(o.status).toLowerCase().includes('cancel')).length, metaSpend, costPerOrder:totalOrders?metaSpend/totalOrders:0, roas:metaSpend?totalSales/metaSpend:0, estimatedProfit:orders.reduce((s,o)=>s+o.estimatedProfit,0) };
    res.json({ok:true, days, summary, daily, orders, products, cities, campaigns:campaignStats, meta:{connected:Boolean(config.META_ACCESS_TOKEN&&config.META_AD_ACCOUNT_ID), adAccountId:config.META_AD_ACCOUNT_ID||''}, source:r.ok===false?'cache/error':'shopify', error:r.ok===false?r.error:''});
  }catch(e){ res.status(500).json({ok:false,error:e.message}); }
});
'''
    s=s.replace("app.get('/api/storage/status'", endpoint+"\napp.get('/api/storage/status'")
server.write_text(s)

# 5 CSS final overrides
s=css.read_text()
if '/* Final sales and inbox overflow fixes */' not in s:
    s += r'''

/* Final sales and inbox overflow fixes */
.admin-wrap.admin-fixed-layout,.admin-fixed-layout,.admin-wrap{width:90vw!important;max-width:1800px!important;}
.admin-wrap .topbar .brand-logo.small{width:64px!important;height:64px!important;min-width:64px!important;padding:6px!important;object-fit:contain!important;}
.api-top-actions + *, .api-settings-page{}
body:has(.api-top-actions) .brand-logo.small{width:76px!important;height:76px!important;min-width:76px!important;padding:7px!important;}
.team-inbox-shell{height:calc(100vh - 150px)!important;min-height:760px!important;grid-template-columns:330px minmax(650px,1fr) 310px!important;overflow:hidden!important;}
.wati-center{min-height:0!important;overflow:hidden!important;grid-template-rows:minmax(0,1fr) auto!important;}
.wati-chat-window{min-height:0!important;overflow:hidden!important;}
.wati-message-area{min-height:420px!important;height:auto!important;overflow-y:auto!important;overflow-x:hidden!important;padding:22px 28px 24px!important;scroll-padding-bottom:40px!important;}
.wati-reply-dock{min-height:150px!important;overflow:visible!important;padding:12px 14px 16px!important;}
.reply-compose-row textarea{height:72px!important;min-height:72px!important;max-height:130px!important;}
.reply-compose-row .primary-btn{height:48px!important;align-self:end!important;margin-bottom:0!important;}
.wa-bubble{max-width:72%!important;width:fit-content!important;min-width:92px!important;overflow:visible!important;white-space:normal!important;}
.wa-message-text{white-space:pre-wrap!important;overflow-wrap:anywhere!important;word-break:break-word!important;}
.wa-status-line,.wa-date-sep{max-width:90%!important;white-space:normal!important;text-align:center!important;overflow:visible!important;}
.wa-chat-item.wati-conversation{min-height:72px!important;}
.wati-right{overflow:auto!important;min-height:0!important;}
#whatsappInboxResult:empty,#faqResult:empty,#basicSettingsResult:empty,#shopifySalesResult:empty,#metaAdsResult:empty{display:none!important;}
.sales-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0;}
.sales-kpi{background:#fff;border:1px solid rgba(214,51,132,.16);border-radius:20px;padding:16px;box-shadow:0 12px 28px rgba(214,51,132,.08);}
.sales-kpi span{display:block;color:#6b5a67;font-size:12px;font-weight:800}.sales-kpi b{display:block;font-size:24px;margin-top:6px;color:#241326}
.sales-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.sales-card{background:#fff;border:1px solid rgba(214,51,132,.14);border-radius:22px;padding:16px;box-shadow:0 12px 32px rgba(214,51,132,.06);min-width:0}.sales-card h3{margin-top:0}.table-wrap{overflow:auto;max-height:380px}.sales-table th,.sales-table td{white-space:nowrap}.bar-chart{display:grid;gap:9px}.bar-row{display:grid;grid-template-columns:90px 1fr 90px;gap:10px;align-items:center;font-size:12px}.bar-row div{height:12px;background:#ffeaf4;border-radius:999px;overflow:hidden}.bar-row i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--pink),var(--purple))}.bar-row b{text-align:right}.donut-wrap{display:flex;align-items:center;gap:20px;min-height:180px}.donut{width:150px;height:150px;border-radius:50%;background:conic-gradient(var(--pink) calc(var(--p)*1%),#22c55e 0);display:grid;place-items:center;position:relative}.donut:before{content:'';position:absolute;width:94px;height:94px;border-radius:50%;background:#fff}.donut b,.donut span{position:relative;z-index:1}.donut b{font-size:26px}.donut span{font-size:12px;margin-top:38px;position:absolute}.donut-legend{display:grid;gap:8px;font-weight:800}.donut-legend i{display:inline-block;width:11px;height:11px;border-radius:50%;background:var(--pink);margin-right:8px}.donut-legend span:last-child i{background:#22c55e}
@media(max-width:1250px){.team-inbox-shell{grid-template-columns:300px minmax(460px,1fr)!important;height:auto!important;min-height:760px!important}.wati-right{grid-column:1/-1!important}.sales-grid{grid-template-columns:1fr!important}}
'''
css.write_text(s)
