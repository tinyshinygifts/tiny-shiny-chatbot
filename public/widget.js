(function(){
  if(window.__TSG_CHAT_WIDGET_V20__) return;
  window.__TSG_CHAT_WIDGET_V20__ = true;

  const script = document.currentScript;
  const BASE = script && script.src ? new URL(script.src).origin : 'https://chat.tinyshinygifts.com';
  const visitorKey = 'tsg_chat_visitor_id';
  let visitorId = localStorage.getItem(visitorKey);
  if(!visitorId){
    visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem(visitorKey, visitorId);
  }

  let settings = {};
  const headerTitle = 'Tiny Shiny Assistant';
  const headerSubtitle = 'Usually replies instantly';
  const defaultWelcome = 'Hello! Welcome to Tiny Shiny Gifts. I can help with product details, order confirmation, order tracking, COD, delivery, returns, and WhatsApp support.';
  const defaultFallback = 'I need a little more detail to help you.';

  function injectCss(color){
    const pink = color || '#d63384';
    const css = `
      #tsgChatFab{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:116px;height:78px;border:0;background:transparent url('${BASE}/chat-button.png') center/contain no-repeat;cursor:pointer;filter:drop-shadow(0 10px 22px rgba(214,51,132,.32));}
      #tsgChatBox{position:fixed;right:18px;bottom:102px;width:min(360px,calc(100vw - 24px));max-height:78vh;background:#fff;border:1px solid #f3d3e5;border-radius:24px;box-shadow:0 20px 60px rgba(58,22,50,.22);z-index:2147483001;display:none;overflow:hidden;font-family:Arial,sans-serif}
      #tsgChatHead{background:linear-gradient(135deg,${pink},#c92f7e);color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:flex-start}
      #tsgChatHeadLeft{display:flex;gap:10px;align-items:flex-start;min-width:0}
      #tsgChatLogo{width:42px;height:42px;border-radius:14px;background:#fff;color:${pink};font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;line-height:1.05;text-align:center;flex:none;box-shadow:0 4px 12px rgba(0,0,0,.08)}
      #tsgChatHeadTitle{font-weight:900;font-size:16px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #tsgChatHeadSub{margin-top:5px;font-size:12px;line-height:1.2;opacity:.95;font-weight:700}
      #tsgChatClose{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.45);color:#fff;border-radius:999px;width:32px;height:32px;font-weight:900;cursor:pointer;font-size:20px;line-height:28px;flex:none}
      #tsgChatBody{background:#f8f5f8;display:flex;flex-direction:column;min-height:0;max-height:calc(78vh - 70px);overflow:hidden}
      #tsgChatMsgs{padding:14px;height:360px;max-height:56vh;overflow-y:auto;overflow-x:hidden;flex:1;min-height:210px}
      .tsgMsg{margin:10px 0;padding:12px 14px;border-radius:16px;white-space:pre-wrap;line-height:1.4;font-size:14px;word-break:break-word}
      .tsgBot{margin-right:28px;background:#fff;border:1px solid #ece1e8;color:#494349;border-bottom-left-radius:8px;box-shadow:0 3px 10px rgba(0,0,0,.03)}
      .tsgUser{margin-left:42px;background:${pink};color:#fff;border-bottom-right-radius:8px;box-shadow:0 4px 10px rgba(214,51,132,.18)}
      .tsgHeroAction{display:none!important}
      .tsgChipWrap{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;padding:10px 14px;background:#f8f5f8;border-top:1px solid #eee1e8;flex:none;width:90%;margin:0 auto;box-sizing:border-box}
      .tsgChip{border:1px solid #e5cad8;background:#fff;color:#4a4049;border-radius:999px;padding:8px 5px;font-size:11px;font-weight:800;cursor:pointer;text-align:center;white-space:normal;line-height:1.15;min-width:0;overflow-wrap:anywhere}
      .tsgChip:hover{background:#fff4f8;border-color:#d9a8c3}
      .tsgActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
      .tsgAction{border:0;background:${pink};color:#fff;border-radius:999px;padding:9px 12px;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex}
      #tsgChatForm{display:flex;gap:10px;align-items:center;padding:12px 14px;border-top:1px solid #eee1e8;background:#fff;flex:none}
      #tsgChatInput{flex:1;border:1px solid #e5d9e0;border-radius:999px;padding:12px 14px;outline:none;font-size:14px;min-width:0}
      #tsgChatSend{border:0;background:${pink};color:#fff;border-radius:999px;padding:12px 18px;font-weight:900;cursor:pointer;box-shadow:0 8px 18px rgba(214,51,132,.22)}
      @media(max-width:520px){
        #tsgChatFab{right:10px;bottom:10px;width:96px;height:66px}
        #tsgChatBox{right:8px;left:8px;bottom:84px;width:auto;max-height:82vh;border-radius:22px}
        #tsgChatMsgs{height:410px;max-height:62vh}.tsgChipWrap{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;width:90%;padding:9px 10px}.tsgChip{font-size:10.5px;padding:7px 4px}
      }
    `;
    const old=document.getElementById('tsgChatStyle');
    if(old) old.remove();
    const st=document.createElement('style');
    st.id='tsgChatStyle';
    st.textContent=css;
    document.head.appendChild(st);
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

    const box=document.createElement('div');
    box.id='tsgChatBox';
    box.innerHTML=`<div id="tsgChatHead">
      <div id="tsgChatHeadLeft">
        <div id="tsgChatLogo">TINY<br>SHINY</div>
        <div>
          <div id="tsgChatHeadTitle">${esc(headerTitle)}</div>
          <div id="tsgChatHeadSub">${esc(headerSubtitle)}</div>
        </div>
      </div>
      <button id="tsgChatClose" type="button">×</button>
    </div>
    <div id="tsgChatBody">
      <div id="tsgChatMsgs"></div>
      <div id="tsgFixedChips"></div>
      <form id="tsgChatForm"><input id="tsgChatInput" placeholder="Type your message..." autocomplete="off"/><button id="tsgChatSend" type="submit">Send</button></form>
    </div>`;

    document.body.appendChild(box);
    document.body.appendChild(fab);

    const msgs=box.querySelector('#tsgChatMsgs');
    const chipHost=box.querySelector('#tsgFixedChips');
    const input=box.querySelector('#tsgChatInput');

    function addMsg(text, who='bot', actions=[]){
      if(!text && (!actions || !actions.length)) return;
      const d=document.createElement('div');
      d.className='tsgMsg ' + (who==='user' ? 'tsgUser' : 'tsgBot');
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
      msgs.appendChild(d);
      msgs.scrollTop=msgs.scrollHeight;
      return d;
    }

    function renderStarterUI(){
      const welcomeBubble = addMsg(settings.welcomeMessage || defaultWelcome, 'bot');
      const chipWrap=document.createElement('div');
      chipWrap.className='tsgChipWrap';
      [
        ['Confirm my order','Confirm my order'],
        ['Track my order','Track my order'],
        ['COD available?','COD available?'],
        ['Shipping charges','Shipping charges'],
        ['Return policy','Return policy'],
        ['WhatsApp support','WhatsApp support']
      ].forEach(([label,msg])=>{
        const chip=document.createElement('button');
        chip.type='button';
        chip.className='tsgChip';
        chip.textContent=label;
        chip.onclick=()=>send(msg);
        chipWrap.appendChild(chip);
      });
      chipHost.innerHTML='';
      chipHost.appendChild(chipWrap);
      msgs.scrollTop=msgs.scrollHeight;
    }

    function openBox(){
      box.style.display='block';
      if(!msgs.dataset.init){
        msgs.dataset.init='1';
        renderStarterUI();
      }
    }

    async function send(message){
      const text=String(message||'').trim();
      if(!text) return;
      openBox();
      addMsg(text,'user');
      input.value='';
      try{
        const res=await fetch(BASE + '/api/chat', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({message:text, visitorId, ...currentProduct()})
        });
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
        addMsg(settings.fallbackMessage || defaultFallback, 'bot');
      }
    }

    fab.onclick=()=>{
      box.style.display = box.style.display==='block' ? 'none' : 'block';
      if(box.style.display==='block') openBox();
    };
    box.querySelector('#tsgChatClose').onclick=()=>box.style.display='none';
    box.querySelector('#tsgChatForm').onsubmit=(e)=>{ e.preventDefault(); send(input.value); };
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
