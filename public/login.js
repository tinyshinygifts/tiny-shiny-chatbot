function $(id){ return document.getElementById(id); }
function setStatus(msg, danger=true){ const el=$('loginStatus'); el.textContent=msg||''; el.className = danger ? 'hint danger' : 'hint success'; }
async function doLogin(){
  const username = $('username').value.trim();
  const password = $('password').value;
  setStatus('Checking...', false);
  const res = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password }) });
  const data = await res.json().catch(() => ({ ok:false, error:'Login failed' }));
  if(data.ok){ window.location.href = '/admin.html'; return; }
  setStatus(data.error || 'Wrong login details');
}
async function doForgotLogin(){
  const username = $('forgotUsername').value.trim();
  const dob = $('dob').value.trim();
  setStatus('Verifying DOB...', false);
  const res = await fetch('/api/admin/forgot-login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, dob }) });
  const data = await res.json().catch(() => ({ ok:false, error:'DOB login failed' }));
  if(data.ok){ window.location.href = '/admin.html'; return; }
  setStatus(data.error || 'DOB did not match');
}
$('loginBtn').addEventListener('click', doLogin);
$('forgotLoginBtn').addEventListener('click', doForgotLogin);
$('showForgot').addEventListener('click', () => { $('loginBox').classList.add('hidden'); $('forgotBox').classList.remove('hidden'); $('forgotUsername').value = $('username').value || ''; $('dob').value = ''; setStatus(''); });
$('backLogin').addEventListener('click', () => { $('forgotBox').classList.add('hidden'); $('loginBox').classList.remove('hidden'); setStatus(''); });
['username','password'].forEach(id => $(id).addEventListener('keydown', e => { if(e.key === 'Enter') doLogin(); }));
['forgotUsername','dob'].forEach(id => $(id).addEventListener('keydown', e => { if(e.key === 'Enter') doForgotLogin(); }));
