(function(){
  if(window.__TSG_CHAT_WIDGET_V18__) return;
  window.__TSG_CHAT_WIDGET_V18__ = true;

  const script = document.currentScript;
  const BASE = script && script.src ? new URL(script.src).origin : 'https://chat.tinyshinygifts.com';
  const visitorKey = 'tsg_chat_visitor_id';
  let visitorId = localStorage.getItem(visitorKey);
  if(!visitorId){
    visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem(visitorKey, visitorId);
  }

  let settings = {};
  const defaultWelcome = 'Hello! Welcome to Tiny Shiny Gifts. I can help with product details, order tracking, COD, delivery, returns, and WhatsApp support.';
  const defaultFallback = 'I need a little more detail to help you.';

  function injectCss(color){
    const pink = color || '#d63384';
    const css = `
      #tsgChatFab{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:116px;height:78px;border:0;background:transparent url('${BASE}/chat-button.png') center/contain no-repeat;cursor:pointer;filter:drop-shadow(0 10px 22px rgba(214,51,132,.32));}
      #tsgQuickMenu{position:fixed;right:18px;bottom:102px;z-index:2147483000;width:230px;background:#fff;border:1px solid #f3cfe3;border-radius:18px;box-shadow:0 18px 50px rgba(55,18,46,.18);padding:10px;display:none;font-family:Arial,sans-serif}
      #tsgQuickMenu button{width:100%;border:1px solid #f2c8df;background:#fff;color:${pink};border-radius:999px;padding:10px 12px;margin:4px 0;font-weight:900;cursor:pointer;text-align:left}
      #tsgQuickMenu button:hover{background:#fff3f9}
      #tsgChatBox{position:fixed;right:18px;bottom:102px;width:min(370px,calc(100vw - 24px));max-height:74vh;background:#fff;border:1px solid #f2cfe1;border-radius:22px;box-shadow:0 18px 60px rgba(58,22,50,.22);z-index:2147483001;display:none;overflow:hidden;font-family:Arial,sans-serif}
      #tsgChatHead{background:linear-gradient(135deg,${pink},#9b2a76);color:#fff;padding:12px 14px;font-weight:900;display:flex;justify-content:space-between;align-items:center}
      #tsgChatClose{background:rgba(255,255,255,.18);border:0;color:#fff;border-radius:50%;width:28px;height:28px;font-weight:900;cursor:pointer}
      #tsgChatMsgs{padding:12px;height:320px;max-height:48vh;overflow:auto;background:#fff7fb}
      .tsgMsg{margin:8px 0;padding:10px 12px;border-radius:16px;white-space:pre-wrap;line-height:1.35;font-size:14px}
      .tsgUser{margin-left:42px;background:${pink};color:#fff;border-bottom-right-radius:4px}
      .tsgBot{margin-right:28px;background:#fff;border:1px solid #f3d0e3;color:#2d1830;border-bottom-left-radius:4px}
      .tsgActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
      .tsgAction{border:0;background:${pink};color:#fff;border-radius:999px;padding:9px 12px;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex}
      #tsgChatForm{display:flex;gap:8px;padding:10px;border-top:1px solid #f2d2e4;background:#fff}
      #tsgChatInput{flex:1;border:1px solid #edd0e1;border-radius:999px;padding:10px 12px;outline:none}
      #tsgChatSend{border:0;background:${pink};color:#fff;border-radius:999px;padding:10px 14px;font-weight:900;cursor:pointer}
      @media(max-width:520px){#tsgChatFab{right:10px;bottom:10px;width:96px;height:66px}#tsgQuickMenu{right:10px;bottom:82px;width:min(230px,calc(100vw - 20px))}#tsgChatBox{right:8px;left:8px;bottom:84px;width:auto;max-height:78vh}#tsgChatMsgs{height:360px;max-height:58vh}}
    `;
    const st=document.createElement('style'); st.id='tsgChatStyle'; st.textContent=css; document.head.appendChild(st);
  }
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function currentProduct(){
    return {
      pageUrl: location.href,
      productTitle: document.querySelector('meta[property="og:title"]')?.content || document.title || '',
      productHandle: (location.pathname||'').split('/products/')[1] || '',
      productImage: document.querySelector('meta[property="og:image"]')?.content || '',
      productPrice: document.querySelector('[data-product-price], .price, .product__price')?.textContent || ''
    };
  }

  function buildUI(){
    const fab=document.createElement('button');
    fab.id='tsgChatFab';
    fab.type='button';
    fab.setAttribute('aria-label','Chat');

    const menu=document.createElement('div');
    menu.id='tsgQuickMenu';
    const items=[
      ['Track My Order','Track my order'],
      ['Product Information','Product information'],
      ['Return / Exchange','Return / Exchange'],
      ['WhatsApp Support','WhatsApp support'],
      ['COD Confirmation','COD Confirmation'],
      ['Talk to Support','Talk to Support']
    ];
    menu.innerHTML=items.map(([label,msg])=>`<button type="button" data-msg="${esc(msg)}">${esc(label)}</button>`).join('');

    const box=document.createElement('div');
    box.id='tsgChatBox';
    box.innerHTML=`<div id="tsgChatHead"><span>${esc(settings.botName || 'Tiny Shiny Assistant')}</span><button id="tsgChatClose" type="button">×</button></div>
      <div id="tsgChatMsgs"></div>
      <form id="tsgChatForm"><input id="tsgChatInput" placeholder="Type your message..." autocomplete="off"/><button id="tsgChatSend" type="submit">Send</button></form>`;

    document.body.appendChild(menu);
    document.body.appendChild(box);
    document.body.appendChild(fab);

    const msgs=box.querySelector('#tsgChatMsgs');
    const input=box.querySelector('#tsgChatInput');

    function addMsg(text, who='bot', actions=[]){
      if(!text && (!actions || !actions.length)) return;
      const d=document.createElement('div');
      d.className='tsgMsg '+(who==='user'?'tsgUser':'tsgBot');
      d.innerHTML=esc(text||'');
      if(actions && actions.length){
        const a=document.createElement('div'); a.className='tsgActions';
        actions.forEach(x=>{
          const el=document.createElement(x.url?'a':'button');
          el.className='tsgAction';
          el.textContent=x.label || 'Open';
          if(x.url){ el.href=x.url; el.target='_blank'; el.rel='noopener'; }
          else { el.type='button'; el.onclick=()=>send(x.message || x.label || ''); }
          a.appendChild(el);
        });
        d.appendChild(a);
      }
      msgs.appendChild(d); msgs.scrollTop=msgs.scrollHeight;
    }
    function openBox(){
      menu.style.display='none';
      box.style.display='block';
      if(!msgs.dataset.welcome){
        msgs.dataset.welcome='1';
        addMsg(settings.welcomeMessage || defaultWelcome, 'bot');
      }
    }
    async function send(message){
      const text=String(message||'').trim();
      if(!text) return;
      if(!/whatsapp support|support on whatsapp/i.test(text)) openBox();
      if(!/whatsapp support/i.test(text)) addMsg(text,'user');
      input.value='';
      try{
        const res=await fetch(BASE+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,visitorId,...currentProduct()})});
        const data=await res.json();
        const openUrl=data.openUrl || data.redirectUrl || data.supportUrl || '';
        if(openUrl){
          window.open(openUrl,'_blank','noopener');
          return;
        }
        const actions=[];
        if(Array.isArray(data.trackingLinks)){
          data.trackingLinks.forEach(x=>{ if(x && x.url) actions.push({label:x.label || 'Track Shipment', url:x.url}); });
        }
        addMsg(data.reply || data.message || '', 'bot', actions);
      }catch(e){
        addMsg(settings.fallbackMessage || defaultFallback,'bot');
      }
    }

    fab.onclick=()=>{
      if(box.style.display==='block'){ box.style.display='none'; return; }
      menu.style.display = menu.style.display==='block' ? 'none' : 'block';
    };
    menu.addEventListener('click', e=>{
      const btn=e.target.closest('button[data-msg]');
      if(!btn) return;
      const msg=btn.dataset.msg;
      if(/whatsapp support/i.test(msg)){ send(msg); return; }
      openBox();
      send(msg);
    });
    box.querySelector('#tsgChatClose').onclick=()=>box.style.display='none';
    box.querySelector('#tsgChatForm').onsubmit=e=>{e.preventDefault(); send(input.value);};
  }

  fetch(BASE+'/api/settings',{cache:'no-store'}).then(r=>r.json()).then(j=>{
    settings = j.settings || {};
    if(settings.chatbotEnabled === false) return;
    injectCss(settings.themeColor || settings.accentColor || '#d63384');
    buildUI();
  }).catch(()=>{
    injectCss('#d63384');
    buildUI();
  });
})();