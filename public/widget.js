(function(){
  if(window.__TSG_CHAT_WIDGET_LOADED__) return;
  window.__TSG_CHAT_WIDGET_LOADED__ = true;

  const API_BASE = (document.currentScript && document.currentScript.src)
    ? new URL(document.currentScript.src).origin
    : 'https://chat.tinyshinygifts.com';

  const visitorKey = 'tsg_chat_visitor_id';
  let visitorId = localStorage.getItem(visitorKey);
  if(!visitorId){
    visitorId = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem(visitorKey, visitorId);
  }

  const css = `
  #tsgChatFab{position:fixed;right:18px;bottom:18px;z-index:2147483000;border:0;border-radius:999px;background:#d63384;color:#fff;font-weight:900;padding:13px 18px;box-shadow:0 12px 35px rgba(214,51,132,.35);cursor:pointer}
  #tsgChatBox{position:fixed;right:18px;bottom:76px;width:min(360px,calc(100vw - 24px));max-height:72vh;background:#fff;border:1px solid #f2cfe1;border-radius:22px;box-shadow:0 18px 60px rgba(58,22,50,.22);z-index:2147483000;display:none;overflow:hidden;font-family:Arial,sans-serif}
  #tsgChatHead{background:linear-gradient(135deg,#d63384,#8e2a72);color:#fff;padding:12px 14px;font-weight:900;display:flex;justify-content:space-between;align-items:center}
  #tsgChatClose{background:rgba(255,255,255,.18);border:0;color:#fff;border-radius:50%;width:28px;height:28px;font-weight:900;cursor:pointer}
  #tsgChatMsgs{padding:12px;height:320px;max-height:48vh;overflow:auto;background:#fff7fb}
  .tsgMsg{margin:8px 0;padding:10px 12px;border-radius:16px;white-space:pre-wrap;line-height:1.35;font-size:14px}
  .tsgUser{margin-left:42px;background:#d63384;color:#fff;border-bottom-right-radius:4px}
  .tsgBot{margin-right:28px;background:#fff;border:1px solid #f3d0e3;color:#2d1830;border-bottom-left-radius:4px}
  .tsgActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
  .tsgAction{border:0;background:#d63384;color:#fff;border-radius:999px;padding:9px 12px;font-weight:900;cursor:pointer;text-decoration:none;display:inline-flex}
  #tsgChatForm{display:flex;gap:8px;padding:10px;border-top:1px solid #f2d2e4;background:#fff}
  #tsgChatInput{flex:1;border:1px solid #edd0e1;border-radius:999px;padding:10px 12px;outline:none}
  #tsgChatSend{border:0;background:#d63384;color:#fff;border-radius:999px;padding:10px 14px;font-weight:900;cursor:pointer}
  @media(max-width:520px){#tsgChatFab{right:12px;bottom:12px;padding:11px 14px}#tsgChatBox{right:8px;left:8px;bottom:62px;width:auto;max-height:78vh}#tsgChatMsgs{height:360px;max-height:58vh}}
  `;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  const fab=document.createElement('button');
  fab.id='tsgChatFab';
  fab.type='button';
  fab.textContent='Chat';
  const box=document.createElement('div');
  box.id='tsgChatBox';
  box.innerHTML=`<div id="tsgChatHead"><span>Tiny Shiny Gifts</span><button id="tsgChatClose" type="button">×</button></div>
  <div id="tsgChatMsgs"></div>
  <form id="tsgChatForm"><input id="tsgChatInput" placeholder="Type your message..." autocomplete="off"/><button id="tsgChatSend" type="submit">Send</button></form>`;
  document.body.appendChild(fab); document.body.appendChild(box);

  const msgs=box.querySelector('#tsgChatMsgs');
  const input=box.querySelector('#tsgChatInput');

  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function currentProduct(){
    return {
      pageUrl: location.href,
      productTitle: document.querySelector('meta[property="og:title"]')?.content || document.title || '',
      productImage: document.querySelector('meta[property="og:image"]')?.content || '',
      productPrice: document.querySelector('[data-product-price]')?.textContent || ''
    };
  }
  function addMsg(text, who='bot', actions=[]){
    const d=document.createElement('div');
    d.className='tsgMsg '+(who==='user'?'tsgUser':'tsgBot');
    d.innerHTML=esc(text);
    if(actions && actions.length){
      const a=document.createElement('div'); a.className='tsgActions';
      actions.forEach(x=>{
        const btn=document.createElement(x.url?'a':'button');
        btn.className='tsgAction';
        btn.textContent=x.label || 'Open';
        if(x.url){ btn.href=x.url; btn.target='_blank'; btn.rel='noopener'; }
        else { btn.type='button'; btn.onclick=()=>send(x.message || x.label || ''); }
        a.appendChild(btn);
      });
      d.appendChild(a);
    }
    msgs.appendChild(d); msgs.scrollTop=msgs.scrollHeight;
  }
  async function send(message){
    const text=String(message||'').trim();
    if(!text) return;
    addMsg(text,'user');
    input.value='';
    try{
      const res=await fetch(API_BASE+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,visitorId,...currentProduct()})});
      const data=await res.json();
      if(data.openUrl || data.redirectUrl){
        const url=data.openUrl || data.redirectUrl;
        addMsg(data.reply || 'Opening WhatsApp support...', 'bot', [{label:data.buttonLabel || 'Open WhatsApp Support', url}]);
        window.open(url, '_blank', 'noopener');
        return;
      }
      const actions=[];
      if(Array.isArray(data.trackingLinks)){
        data.trackingLinks.forEach(x=>actions.push({label:x.label || 'Track Shipment', url:x.url}));
      }
      addMsg(data.reply || 'Thank you. Our team will help you shortly.', 'bot', actions);
    }catch(e){
      addMsg('Sorry, chat is not available right now. Please try again shortly.','bot');
    }
  }

  fab.onclick=()=>{ box.style.display = box.style.display==='block'?'none':'block'; if(!msgs.dataset.welcome){ msgs.dataset.welcome='1'; addMsg('Hello! Welcome to Tiny Shiny Gifts. I can help with product details, order tracking, COD, delivery, returns, and WhatsApp support.','bot',[{label:'Track my order',message:'Track my order'},{label:'WhatsApp Support',message:'WhatsApp support'}]); }};
  box.querySelector('#tsgChatClose').onclick=()=>box.style.display='none';
  box.querySelector('#tsgChatForm').onsubmit=(e)=>{e.preventDefault(); send(input.value);};
})();