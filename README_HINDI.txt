Tiny Shiny Chatbot v8 - Theme + Logout Fix

Changes:
- Logout button fixed on Admin and API Settings pages.
- Theme Color UI fixed and improved.
- Theme color now changes buttons, links, badges, focus rings and panels live.
- Theme color is saved in Settings and shown consistently.
- Login fields remain blank.

Run:
1. Extract ZIP
2. Double click start_chatbot.bat
3. Open http://localhost:5057/admin.html

Default Login:
User ID: admin
Password: admin
DOB recovery: 26/04/1986

Tiny Shiny Chatbot v6 - Login User ID + Forgot DOB + Fixed Logout + Modern UI

RUN OFFLINE / LOCAL PC
1. ZIP extract karo.
2. Folder open karo.
3. start_chatbot.bat par double click karo.
4. Browser me login/admin page khulega:
   http://localhost:5057/admin.html

DEFAULT LOGIN
User ID: admin
Password: admin
Forgot password DOB: 26/04/1986

LOGIN SECURITY NEW
- Login page ab User ID + Password puchega.
- Default user ID admin aur password admin hai.
- Forgot password option add hai: DOB 26/04/1986 dalne par login ho jayega.
- API Settings → Login Security me jaakar ye sab change kar sakte ho:
  - Admin User ID
  - Admin Password
  - Forgot Password DOB
  - Session Secret
  - Session Hours
- Logout button fix kiya gaya hai. Logout ke baad login page par redirect hoga.

UI UPDATE
- Login page ka premium modern UI bana diya hai.
- Admin dashboard ka top header, buttons, cards aur stats modern kiye gaye hain.
- API Settings UI clean aur premium banaya gaya hai.

Agar page open nahi hota:
- Black command window band mat karo. Server isi window me chalta hai.
- Browser me manually open karo: http://localhost:5057/admin.html
- Node.js LTS install hona chahiye: https://nodejs.org/
- Agar port busy ho to .env me PORT=5058 kar sakte ho.

API SETTINGS
Admin panel me Open API Settings par click karo. Waha se ye set kar sakte ho:
- Website URL
- Customer WhatsApp number
- Owner/team WhatsApp number
- Login user ID/password/DOB
- Shopify store domain
- Shopify Admin Access Token
- Shopify API version
- WhatsApp Cloud Token
- WhatsApp Phone Number ID

Save ke baad local PC par command window close karke start_chatbot.bat dobara run karo.

SHOPIFY ME WIDGET TESTING
Shopify theme.liquid me </body> se pehle local testing ke liye add karo:
<script>
window.TINY_SHINY_CHATBOT_URL = "http://localhost:5057";
</script>
<script src="http://localhost:5057/widget.js"></script>

Note: Localhost script sirf aapke PC par test hoga. Live website par customers ke liye Render URL use karna hoga.

RENDER HOSTING
- GitHub par folder upload karo.
- Render New Web Service me repo connect karo.
- Build command: npm install
- Start command: npm start
- Environment me same API values add karo jo local API Settings me dali thi.
- Render Environment me ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_DOB aur SECURITY_SESSION_SECRET strong value ke saath add karo.
- Live script:
<script src="https://YOUR-RENDER-URL.onrender.com/widget.js"></script>

GODADDY SUBDOMAIN
Render custom domain me chat.tinyshinygifts.com add karo.
GoDaddy DNS me CNAME:
Name: chat
Value: Render ka CNAME target

FEATURES
- English chatbot replies
- FAQ editor
- Product view lead capture
- Add-to-cart lead capture
- Order confirmation form
- Shopify order tracking
- Owner WhatsApp notification via WhatsApp Cloud API
- Customer follow-up with opt-in
- API Settings UI
- Admin login with User ID + Password
- Forgot password via DOB
- Fixed logout button
- Modern premium UI


V9 IMAGE MESSAGE UPDATE
- Admin panel me Image Messages section add hai.
- Thanks letter, offer/discount image, wishes, product offer images upload kar sakte ho.
- Uploaded image preview/list me dikhegi.
- WhatsApp Cloud API connect hone ke baad selected image owner/team ya customer number par send kar sakte ho.
- WhatsApp par image send karne ke liye chatbot public URL par host hona chahiye, jaise Render URL ya chat.tinyshinygifts.com. Localhost image WhatsApp server fetch nahi kar sakta.


V11 Update: Shopify OAuth callback state fix for Render free hosting. Agar 'Invalid/expired Shopify OAuth state' aaye, v11 deploy karein aur Connect Shopify dobara run karein.


v12 CRM + Google Sheets Auto-save
---------------------------------
Admin Panel me naya CRM Dashboard add hai:
- Leads / order requests
- Visitor activity
- Product view leads
- Add-to-cart leads
- Status: New, Hot Lead, Follow Up, Converted, Not Interested
- Notes save
- CSV export
- Google Sheets sync

Google Sheets setup:
1. Google Sheet kholo.
2. Extensions -> Apps Script kholo.
3. GOOGLE_SHEETS_APPS_SCRIPT.txt ka code paste karo.
4. SHEET_SECRET change karo.
5. Deploy -> New Deployment -> Web App.
6. Execute as: Me, Access: Anyone.
7. Web app URL copy karo.
8. Chatbot API Settings -> Google Sheets CRM Auto-save me:
   GOOGLE_SHEETS_ENABLED=true
   GOOGLE_SHEETS_WEBHOOK_URL=<web app url>
   GOOGLE_SHEETS_SECRET=<same secret>
9. Save API Settings -> Render service restart.
10. Test Google Sheets dabao.


V13 Update - Chatbot ON/OFF Toggle
----------------------------------
Admin Panel > Basic Settings me Website Chatbot Status toggle add hai.
ON = Shopify website par chatbot bubble dikhega.
OFF = Shopify website par chatbot bilkul hide ho jayega. Admin panel aur API settings fir bhi access rahenge.
Toggle change karne ke baad Save Settings zaroor dabayein.


V14 Update:
- Website Chatbot Status OFF now hides the widget fully with no-cache widget loading.
- Bot Name and Theme Color moved to API Settings -> Chatbot Appearance.
- If Shopify browser cache still shows old widget, update script to /widget.js?v=14.

V15 UPDATE
- Admin header fixed/sticky: top header scroll me move nahi hoga.
- Admin tabs improved: Basic Settings, CRM Dashboard, Shopify Customers, Leads, Visitor Activity, Buy Messages, Image Messages, FAQ Rules, Google Sheet.
- Active tab me sirf usi section ka data show hoga.
- Basic Settings se Website ON/OFF switch remove; ON/OFF ab API Settings → Chatbot Appearance me rahega.
- CRM Dashboard alignment fixed: long Shopify product URLs wrap honge, horizontal scroll avoid hoga.
- Chatbot popup me top-right close X button add.
- Add-to-cart par chatbot auto-open nahi hoga; lead background me save hogi.
- Tracking logic improved: mobile number/order ID dalne par Shopify se matching order search hoga; tracking number/link/status show hoga. Shiprocket token configured ho to Shiprocket data bhi try hoga.
- Shopify Customers tab add: customers fetch, search, select all, selected customers ko bulk message/CRM follow-up.
- Google Sheet tab add: API Settings me GOOGLE_SHEET_URL set karne par tab se sheet open hogi.

Update steps:
1. ZIP extract karein.
2. GitHub repo me server.js, package.json, package-lock.json, README_HINDI.txt, public, data replace karein.
3. .env aur node_modules upload na karein.
4. GitHub Desktop → Commit to main → Push origin.
5. Render → Manual Deploy → Clear build cache & deploy.
6. Shopify theme me widget cache avoid karne ke liye script use karein: widget.js?v=15


V16 updates:
- Tracking link now appears as clickable Track Shipment button.
- Image Messages section can load Shopify customers and bulk send selected image.
- Shopify Customers order status uses latest actual Shopify order status instead of customer state.
- Mobile chatbot popup made more compact.


V17 UPDATE
----------
- API Settings ko future updates me reset hone se bachane ke liye server data folder auto-create karta hai aur GOOGLE_SHEET_URL/config keys fix ki gayi hain.
- Important update rule: GitHub me new ZIP se `data/settings.json`, `data/crm.json`, `data/leads.json`, `data/visitor-events.json`, `data/media-images.json` overwrite mat karein. Sirf `server.js`, `package.json`, `package-lock.json`, `README_HINDI.txt`, `public/` replace karein. Agar data folder replace karna zaroori ho to pehle backup lein.
- Admin me New Products tab add hai. Shopify se latest products fetch karein, selected customers ko new product launch / offer / upsell / cross-sell WhatsApp message bhej sakte hain.
- New Products tab me Select All Customers aur CRM-only save mode hai.
- Order confirmation automation endpoint added: `/webhooks/shopify/orders/create`. Shopify webhook is URL par point karein. Order aate hi owner/team WhatsApp notification jayega aur customer WhatsApp order confirmation message send karne ka option hai.
- API Settings -> Customer WhatsApp Follow-up me Order Confirmation Automation fields add hain.
- Order confirmation customer WhatsApp send tabhi hoga jab WhatsApp Cloud API connected ho aur `ORDER_CONFIRMATION_WHATSAPP_ENABLED=true` ho.


## v18 Fix - Admin tabs restore
- Leads, Visitor Activity, Buy Messages aur Image Messages blank hone ka issue fix kiya.
- New Products section ka missing closing tag fix kiya, jisse baaki tabs nested/hide ho rahe the.
- API Settings safe rakhne ke liye data/settings.json is package me replace karne ki zaroorat nahi hai.

Update karte time replace karo: server.js, package.json, package-lock.json, README_HINDI.txt, public/
Replace mat karo: .env, node_modules, data/settings.json, data/crm.json, data/leads.json, data/visitor-events.json, data/media-images.json


V19 UPDATE NOTES
- API settings safe: data/settings.json replace/upload mat karein. Render Environment values continue rahengi.
- WhatsApp test send: apne sender number ke liye approved template ka naam API Settings me WHATSAPP_TEST_TEMPLATE_NAME me daalein. hello_world public test number ke alawa kaam nahi karta.
- iCarry API fields API Settings me add kiye gaye hain. Fill only the credentials provided by iCarry.
- Google Sheet button fixed: Google Sheet tab click karne par saved Google Sheet Open Link new tab me khulega.
- Tiny Shiny logo added on landing, login, admin/API header and browser favicon.
