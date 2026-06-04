(function () {
  const apiBase = window.TINY_SHINY_CHATBOT_URL || '';
  const visitorIdKey = 'tsg_chat_visitor_id';
  const visitorId = localStorage.getItem(visitorIdKey) || ((window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random());
  localStorage.setItem(visitorIdKey, visitorId);
  const phoneKey = 'tsg_chat_phone';
  const consentKey = 'tsg_chat_whatsapp_consent';

  function getText(sel){ return document.querySelector(sel)?.innerText?.trim() || document.querySelector(sel)?.content || ''; }
  function detectProduct() {
    const url = location.href;
    const isProduct = /\/products\//.test(location.pathname);
    const title = document.querySelector('meta[property="og:title"]')?.content || getText('h1') || document.title;
    const image = document.querySelector('meta[property="og:image"]')?.content || document.querySelector('[data-product-featured-image], .product__media img, .product-media img, img')?.src || '';
    const priceMeta = document.querySelector('meta[property="product:price:amount"]')?.content || '';
    const priceText = getText('[data-price]') || getText('.price') || getText('.product__price') || priceMeta;
    const compareText = getText('[data-compare-price]') || getText('.price__compare') || getText('s');
    let discountText = '';
    const nums = (priceText + ' ' + compareText).match(/[0-9,.]+/g) || [];
    if (nums.length >= 2) {
      const sale = parseFloat(nums[0].replace(/,/g,''));
      const mrp = parseFloat(nums[1].replace(/,/g,''));
      if (mrp > sale) discountText = `Save ${Math.round(((mrp-sale)/mrp)*100)}%`;
    }
    return { url, isProduct, title, image, price: priceText, discountText, handle: isProduct ? location.pathname.split('/products/')[1]?.split(/[/?#]/)[0] : '' };
  }

  let product = detectProduct();
  let settings = {
    botName: 'Tiny Shiny Assistant',
    welcomeMessage: 'Hello! Welcome to Tiny Shiny Gifts. How can I help you today?',
    quickReplies: ['Confirm my order', 'Track my order', 'COD available?', 'Shipping charges', 'Return policy', 'WhatsApp support'],
    themeColor: '#d63384',
    leadPopupDelaySeconds: 12
  };

  const css = document.createElement('style');
  css.textContent = `
    #tsg-chat-btn{position:fixed;right:22px;bottom:22px;width:62px;height:62px;border-radius:50%;border:0;background:var(--tsg-color,#d63384);color:#fff;font-size:26px;box-shadow:0 14px 32px rgba(0,0,0,.22);cursor:pointer;z-index:999999}
    #tsg-chat-box{position:fixed;right:22px;bottom:96px;width:380px;max-width:calc(100vw - 28px);height:590px;max-height:calc(100vh - 120px);background:#fff;border-radius:24px;box-shadow:0 22px 70px rgba(0,0,0,.22);display:none;overflow:hidden;z-index:999999;font-family:Arial,sans-serif;border:1px solid #eee}
    #tsg-chat-box.open{display:flex;flex-direction:column}.tsg-head{background:var(--tsg-color,#d63384);color:white;padding:18px}.tsg-head b{display:block;font-size:17px}.tsg-head span{font-size:12px;opacity:.92}
    .tsg-msgs{flex:1;padding:16px;overflow:auto;background:#faf7fb}.tsg-msg{max-width:86%;padding:11px 13px;margin:8px 0;border-radius:16px;font-size:14px;line-height:1.35;white-space:pre-wrap}.tsg-bot{background:#fff;border:1px solid #eee}.tsg-user{background:var(--tsg-color,#d63384);color:#fff;margin-left:auto}
    .tsg-product-card{background:#fff;border:1px solid #eadce6;border-radius:16px;padding:10px;margin:8px 0;font-size:13px}.tsg-product-card img{width:100%;max-height:150px;object-fit:contain;border-radius:12px;background:#f7f7f7}.tsg-product-card b{display:block;margin:7px 0 4px}.tsg-product-card a{color:var(--tsg-color,#d63384);word-break:break-all}.tsg-product-card button{margin-top:8px;border:0;background:var(--tsg-color,#d63384);color:#fff;border-radius:999px;padding:8px 12px;cursor:pointer}
    .tsg-lead-form{background:#fff;border:1px solid #eee;border-radius:16px;padding:10px;margin:8px 0}.tsg-lead-form input{box-sizing:border-box;width:100%;border:1px solid #ddd;border-radius:10px;padding:10px;margin:5px 0}.tsg-lead-form button{border:0;background:var(--tsg-color,#d63384);color:#fff;border-radius:999px;padding:9px 13px;cursor:pointer}
    .tsg-quick{display:flex;gap:7px;flex-wrap:wrap;padding:0 14px 10px;background:#faf7fb}.tsg-quick button{border:1px solid #e5d4df;background:#fff;border-radius:999px;padding:7px 10px;font-size:12px;cursor:pointer;color:#333}
    .tsg-input{display:flex;gap:8px;padding:13px;background:#fff;border-top:1px solid #eee}.tsg-input input{flex:1;border:1px solid #ddd;border-radius:999px;padding:12px 14px;outline:none}.tsg-input button{border:0;border-radius:999px;background:var(--tsg-color,#d63384);color:#fff;padding:0 16px;cursor:pointer}
    @media(max-width:480px){#tsg-chat-box{right:10px;bottom:84px;width:calc(100vw - 20px);height:74vh}#tsg-chat-btn{right:16px;bottom:16px}}
  `;
  document.head.appendChild(css);

  const btn = document.createElement('button'); btn.id = 'tsg-chat-btn'; btn.innerHTML = '💬'; document.body.appendChild(btn);
  const box = document.createElement('div'); box.id = 'tsg-chat-box'; box.innerHTML = `<div class="tsg-head"><b id="tsg-title"></b><span>Usually replies instantly</span></div><div class="tsg-msgs" id="tsg-msgs"></div><div class="tsg-quick" id="tsg-quick"></div><form class="tsg-input" id="tsg-form"><input id="tsg-text" placeholder="Type your message..." autocomplete="off"/><button>Send</button></form>`; document.body.appendChild(box);
  const msgs = box.querySelector('#tsg-msgs'), form = box.querySelector('#tsg-form'), input = box.querySelector('#tsg-text'), quick = box.querySelector('#tsg-quick');

  function addMsg(text, who) { const div = document.createElement('div'); div.className = `tsg-msg ${who === 'user' ? 'tsg-user' : 'tsg-bot'}`; div.textContent = text; msgs.appendChild(div); msgs.scrollTop = msgs.scrollHeight; }
  function openChat(){ box.classList.add('open'); }
  function addLeadForm(source) {
    const div = document.createElement('div'); div.className = 'tsg-lead-form';
    const savedPhone = localStorage.getItem(phoneKey) || '';
    div.innerHTML = `<b>Get this product details on WhatsApp</b><input placeholder="Your name" class="tsg-name"/><input placeholder="WhatsApp mobile number" class="tsg-phone" value="${savedPhone}"/><label style="display:flex;gap:7px;align-items:flex-start;font-size:12px;margin:6px 0"><input type="checkbox" class="tsg-consent" checked/> I agree to receive product/order follow-up on WhatsApp.</label><button type="button">Send to team</button>`;
    div.querySelector('button').onclick = async () => {
      const name = div.querySelector('.tsg-name').value.trim(); const phone = div.querySelector('.tsg-phone').value.trim(); const consent = div.querySelector('.tsg-consent').checked;
      if (!phone) { addMsg('Please enter your WhatsApp mobile number.', 'bot'); return; }
      localStorage.setItem(phoneKey, phone); localStorage.setItem(consentKey, consent ? 'yes' : 'no');
      await fetch(apiBase + '/api/customer-lead-message', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, phone, consent, source, type: source || 'product_lead', product, pageUrl: product.url || location.href, visitorId }) }).catch(()=>{});
      await fetch(apiBase + '/api/order-confirmation', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, phone, source, productTitle: product.title, productImage: product.image, productPrice: product.price, discountText: product.discountText, pageUrl: product.url, visitorId }) }).catch(()=>{});
      addMsg('Thank you. Your details have been sent to our team. We will contact you on WhatsApp shortly.', 'bot');
    };
    msgs.appendChild(div); msgs.scrollTop = msgs.scrollHeight;
  }
  async function showProductOffer(source){
    product = detectProduct();
    if (!product.isProduct) return;
    const resp = await fetch(apiBase + '/api/lead-message', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type: source || 'product', visitorId, product, pageUrl: location.href }) }).then(r=>r.json()).catch(()=>({message:''}));
    const div = document.createElement('div'); div.className = 'tsg-product-card';
    div.innerHTML = `${product.image ? `<img src="${product.image}" alt="">` : ''}<b>${product.title || 'Current product'}</b>${product.price ? `<div>${product.price}</div>` : ''}${product.discountText ? `<div>${product.discountText}</div>` : ''}<div>${resp.message || 'You were viewing this product. If you would like to buy it, click the link below.'}</div><a href="${product.url}" target="_blank">Open product</a><br/><button type="button">Confirm this order</button>`;
    div.querySelector('button').onclick = () => { send(`I want to confirm this order: ${product.title || product.url}`); addLeadForm(source || 'product_offer'); };
    msgs.appendChild(div); msgs.scrollTop = msgs.scrollHeight;
    if (source === 'product_explore') addLeadForm('product_explore');
  }
  function renderQuickReplies() { quick.innerHTML = ''; (settings.quickReplies || []).forEach(q => { const b = document.createElement('button'); b.textContent = q; b.onclick = () => send(q); quick.appendChild(b); }); }
  async function send(text) {
    if (!text) return; addMsg(text, 'user'); input.value = ''; product = detectProduct();
    try { const res = await fetch(apiBase + '/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message:text, pageUrl: location.href, productTitle: product.title, productHandle: product.handle, productImage: product.image, productPrice: product.price, discountText: product.discountText, visitorId }) }).then(r => r.json()); addMsg(res.reply || 'Sorry, I did not receive a reply.', 'bot'); }
    catch { addMsg('Chat server is not connected. Please check whether the local app is running.', 'bot'); }
  }
  function track(eventType, extra={}) { product = detectProduct(); fetch(apiBase + '/api/visitor-event', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ visitorId, eventType, pageUrl: location.href, productTitle: product.title, productHandle: product.handle, productImage: product.image, productPrice: product.price, discountText: product.discountText, isProduct: product.isProduct, referrer: document.referrer, ...extra }) }).catch(()=>{}); }
  async function cartLead(){
    let cart = {};
    try { cart = await fetch('/cart.js').then(r=>r.json()); } catch {}
    product = detectProduct();
    await fetch(apiBase + '/api/lead-message', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ type:'cart', visitorId, product, cart, pageUrl: location.href }) }).catch(()=>{});
    openChat(); addMsg('Great choice! This item has been added to your cart. Complete your order now, or share your phone number and our team will help you on WhatsApp.', 'bot');
    showProductOffer('cart');
    addLeadForm('add_to_cart');
    track('add_to_cart_detected', { cart });
  }

  btn.onclick = () => { box.classList.toggle('open'); if (box.classList.contains('open')) track('chat_open'); };
  form.onsubmit = (e) => { e.preventDefault(); send(input.value.trim()); };
  document.addEventListener('submit', e => { const form = e.target; if (form && String(form.action || '').includes('/cart/add')) setTimeout(cartLead, 900); }, true);
  document.addEventListener('click', e => { const el = e.target.closest('button, input[type="submit"], a'); if (!el) return; const txt = (el.innerText || el.value || '').toLowerCase(); const href = el.getAttribute('href') || ''; if (txt.includes('add to cart') || txt.includes('add') && href.includes('/cart/add') || href.includes('/cart/add')) setTimeout(cartLead, 900); }, true);
  window.addEventListener('beforeunload', () => {
    product = detectProduct();
    if (!product.isProduct || !navigator.sendBeacon) return;
    navigator.sendBeacon(apiBase + '/api/visitor-event', new Blob([JSON.stringify({ visitorId, eventType:'product_close_or_leave', pageUrl: location.href, productTitle: product.title, productImage: product.image, productPrice: product.price, discountText: product.discountText })], { type:'application/json' }));
    const phone = localStorage.getItem(phoneKey) || '';
    const consent = localStorage.getItem(consentKey) === 'yes';
    if (phone && consent) navigator.sendBeacon(apiBase + '/api/customer-lead-message', new Blob([JSON.stringify({ visitorId, type:'product_close', phone, consent, product, pageUrl: location.href })], { type:'application/json' }));
  });

  track(product.isProduct ? 'product_view' : 'page_view');
  setTimeout(() => { if (product.isProduct) { openChat(); showProductOffer('product_explore'); track('product_exploring_delay'); } }, Math.max(5, Number(settings.leadPopupDelaySeconds || 12)) * 1000);

  fetch(apiBase + '/api/settings').then(r => r.json()).then(data => { settings = { ...settings, ...(data.settings || {}) }; document.documentElement.style.setProperty('--tsg-color', settings.themeColor || '#d63384'); box.querySelector('#tsg-title').textContent = settings.botName || 'Tiny Shiny Assistant'; addMsg(settings.welcomeMessage || 'Hello!', 'bot'); renderQuickReplies(); }).catch(() => { box.querySelector('#tsg-title').textContent = settings.botName; addMsg(settings.welcomeMessage, 'bot'); renderQuickReplies(); });
})();
