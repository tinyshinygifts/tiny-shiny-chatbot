(function(){
  if(window.__TSG_WHATSAPP_SUPPORT_OPEN_PATCH__) return;
  window.__TSG_WHATSAPP_SUPPORT_OPEN_PATCH__ = true;

  async function getSupportUrl(){
    try{
      var base = (document.currentScript && document.currentScript.src) ? new URL(document.currentScript.src).origin : 'https://chat.tinyshinygifts.com';
      var r = await fetch(base + '/api/chat', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message:'WhatsApp support', visitorId: localStorage.getItem('tsg_chat_visitor_id') || ('v_'+Date.now()) })
      });
      var j = await r.json();
      return j.openUrl || j.redirectUrl || j.supportUrl || (j.buttons && j.buttons[0] && j.buttons[0].url) || '';
    }catch(e){ return ''; }
  }

  document.addEventListener('click', async function(e){
    var el = e.target && e.target.closest ? e.target.closest('button,a,[role="button"]') : null;
    if(!el) return;
    var txt = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().toLowerCase();
    if(txt !== 'whatsapp support' && txt !== 'support on whatsapp' && txt !== 'open whatsapp support') return;
    e.preventDefault();
    e.stopPropagation();
    var url = await getSupportUrl();
    if(url) window.open(url, '_blank', 'noopener');
    else alert('WhatsApp support number is not configured yet. Please contact us from the website contact page.');
  }, true);
})();