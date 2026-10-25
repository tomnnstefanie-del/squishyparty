
(function(){
  'use strict';
  document.documentElement.classList.add('js');
  var hi = document.querySelector('.hero-photo img'), si = document.getElementById('summary-img'); if (hi && si) si.src = hi.src; if (hi) document.documentElement.style.setProperty('--photo', 'url("' + hi.src + '")');

  /* ================= CONFIG =================
     Squishy DIY: the original offer, integer cents.
     Partners: status 'demo' = placeholder partner + demo price; 'prospective' = price pending (priceCents:null, never counted);
     'approved' = agreed rates. Replace demo entries with agreed partner data before going live. */
  var MIN_PAX = 10, CONTAINER = 200, WAX = 200, WAX_DUO = 250, WAX_DUO_UP = 300, LOGISTICS = 15000, TEAM_HOURS = 2, SETUP_MIN = 15, PLAY_MIN = 45;
  // Bakery logos load from each brand's site; if a logo can't load, the brand name shows instead.
  var LOGOS = { 'Butter Studio':'https://thebutterstudio.com/wp-content/uploads/2024/11/Butterstudio-Logo.png' };
  var BAKERIES = ['Butter Studio'];
  // Cake stores, shown as one card each. 'thumb' replaces the logo on the card; 'hero' is the store banner.
  var STORES = {
    'Butter Studio': {area:'Handcrafted cakes · Tai Seng', tags:['Halal','Cakes & bakes'], hero:'img/cakes/bs-nutella.jpg'},
    'Styling partner, to be selected': {title:'Party styling partner', area:'Partner being confirmed', tags:['Balloon backdrops','Dessert tables','Props'], pill:'Sample listing'},
    'Tom & Stefanie': {title:'Tom & Stefanie', area:'Party favours from our own stores', tags:['Since 1994'], pill:'Our own', icon:'i-gift'},
    'Entertainment partner, to be selected': {title:'Party entertainers', area:'Partner being confirmed', tags:['Face painting','Balloon sculpting','Magic'], pill:'Sample listing'},
    'Photography partner, to be selected': {title:'Party photographer', area:'Partner being confirmed', tags:['Candid & group photos'], pill:'Sample listing', icon:'i-camera'}
  };
  var EXP = { jelly:{name:'Jelly',short:'Jelly',pax:1600,per:1}, crunchy:{name:'Crunchy',short:'Crunchy',pax:1800,per:1}, both:{name:'Duo: Jelly + Crunchy',short:'Duo',pax:2600,per:2} };
  var CATS = [
    {id:'styling', title:'Styling', tab:'Styling', icon:'i-balloon', blurb:'Balloon backdrops, dessert tables and party favours in your colour theme.'},
    {id:'entertainment', title:'Other activities', tab:'Other activities', icon:'i-smile', blurb:'Face painting, balloon sculpting, a magic show or a photographer, alongside the making.'},
    {id:'cake', title:'Cakes', tab:'Cakes', icon:'i-cake', blurb:'From our partner bakery, Butter Studio. Delivered to your venue before the finale.'}
  ];
  var P = [
    // Butter Studio menu (names and prices from their foodpanda listing; prices tagged Demo until the partner rate is agreed).
    // Variants of one item share a 'g' key; each size is its own id so the server can price it. 'sec' is the menu section.
    {id:'bs-custom', g:'bs-custom', gname:'Custom cake', size:'6″', sec:'Custom cake', cat:'cake', name:'Custom cake, 6″', vendor:'Butter Studio', status:'partner', basis:'cake', price:null, rec:1, cap:'Designed around your party theme, 6″ to 12″', inc:['Designed around your party theme and colours','Birthday message or cake topper','Delivered to your venue'], cond:['Fully customised cakes: order at least 14 working days ahead','Tiered or fragile cakes: $20–$30 delivery','Price confirmed in your quote once the design is agreed']},
    {id:'bs-custom-8', g:'bs-custom', gname:'Custom cake', size:'8″', sec:'Custom cake', cat:'cake', name:'Custom cake, 8″', vendor:'Butter Studio', status:'partner', basis:'cake', price:null, rec:0, cap:'Designed around your party theme, 6″ to 12″', inc:['Designed around your party theme and colours','Birthday message or cake topper','Delivered to your venue'], cond:['Fully customised cakes: order at least 14 working days ahead','Tiered or fragile cakes: $20–$30 delivery','Price confirmed in your quote once the design is agreed']},
    {id:'bs-custom-10', g:'bs-custom', gname:'Custom cake', size:'10″', sec:'Custom cake', cat:'cake', name:'Custom cake, 10″', vendor:'Butter Studio', status:'partner', basis:'cake', price:null, rec:0, cap:'Designed around your party theme, 6″ to 12″', inc:['Designed around your party theme and colours','Birthday message or cake topper','Delivered to your venue'], cond:['Fully customised cakes: order at least 14 working days ahead','Tiered or fragile cakes: $20–$30 delivery','Price confirmed in your quote once the design is agreed']},
    {id:'bs-custom-12', g:'bs-custom', gname:'Custom cake', size:'12″', sec:'Custom cake', cat:'cake', name:'Custom cake, 12″', vendor:'Butter Studio', status:'partner', basis:'cake', price:null, rec:0, cap:'Designed around your party theme, 6″ to 12″', inc:['Designed around your party theme and colours','Birthday message or cake topper','Delivered to your venue'], cond:['Fully customised cakes: order at least 14 working days ahead','Tiered or fragile cakes: $20–$30 delivery','Price confirmed in your quote once the design is agreed']},
    {id:'bs-dubai-cake', sec:'Handcrafted whole cakes', cat:'cake', name:'Dubai Chocolate Pistachio Cake', vendor:'Butter Studio', status:'demo', basis:'cake', price:7590, rec:0, cap:'6-inch whole cake', inc:['Dubai chocolate pistachio cake, 6 inches'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-red-velvet', sec:'Handcrafted whole cakes', cat:'cake', name:'Salted Caramel Red Velvet', vendor:'Butter Studio', status:'demo', basis:'cake', price:5990, rec:0, cap:'Red velvet layers, cream frosting and housemade sea salt caramel', inc:['Red velvet layers with cream frosting','Housemade sea salt caramel','No inscriptions; a birthday tag can be requested'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-fancy-nutella', sec:'Handcrafted whole cakes', cat:'cake', name:'Fancy Nutella', vendor:'Butter Studio', status:'demo', basis:'cake', price:6290, rec:0, img:'img/cakes/bs-nutella.jpg', cap:'Chocolate sponge, Nutella buttercream, chocolate drip and Ferrero Rocher', inc:['Chocolate sponge with Nutella buttercream','Chocolate drip, Ferrero Rocher pieces and sprinkles','No inscriptions; a birthday tag can be requested'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-mini-dubai', sec:'Mini cakelets', cat:'cake', name:'[NEW] Dubai Chocolate Pistachio Mini Cakelet', vendor:'Butter Studio', status:'demo', basis:'cake', price:3390, rec:0, img:'img/cakes/bs-mini-dubai.jpg', cap:'About 4 inches', inc:['Dubai chocolate pistachio cakelet, about 4 inches'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-mini-mermaid', sec:'Mini cakelets', cat:'cake', name:'Mermaid Dreams Cakelet', vendor:'Butter Studio', status:'demo', basis:'cake', price:2990, rec:0, cap:'About 4 inches, serves 1–3', inc:['Chocolate ganache, nut-free','About 4 inches, serves 1–3','No inscription'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-mini-unicorn', sec:'Mini cakelets', cat:'cake', name:'Magical Unicorn Cakelet', vendor:'Butter Studio', status:'demo', basis:'cake', price:2990, rec:0, cap:'About 4 inches, serves 1–3', inc:['Red velvet, nut-free','About 4 inches, serves 1–3','No inscription'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-choc-cakelet', sec:'Mini cakelets', cat:'cake', name:'[POPULAR] Chocolate Indulgence Cakelet', vendor:'Butter Studio', status:'demo', basis:'cake', price:2990, rec:0, img:'img/cakes/bs-choc-cakelet.jpg', cap:'About 4 inches', inc:['Chocolate Indulgence cakelet, about 4 inches'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-set-unicorn', sec:'Party celebration bundles', cat:'cake', name:'[BUNDLE] Magical Unicorn Birthday Set', vendor:'Butter Studio', status:'demo', basis:'box', price:5590, rec:0, cap:'Unicorn cakelet + 6 cupcakes, nut-free', inc:['Red velvet unicorn cakelet','2 Magical Unicorn, 2 Magical Mermaid and 2 Over The Rainbow cupcakes','Nut-free; no inscriptions'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-set-mermaid', sec:'Party celebration bundles', cat:'cake', name:'[BUNDLE] Mermaid Dreams Birthday Set', vendor:'Butter Studio', status:'demo', basis:'box', price:5590, rec:0, cap:'Mermaid cakelet + 6 cupcakes', inc:['Chocolate ganache mermaid cakelet, nut-free','2 Magical Unicorn, 2 Over The Rainbow and 2 Mermaid Dreams cupcakes','No inscriptions'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-set-choc', sec:'Party celebration bundles', cat:'cake', name:'[BUNDLE] Chocolate Indulgence Birthday Set', vendor:'Butter Studio', status:'demo', basis:'box', price:5590, rec:0, cap:'Chocolate Nutella cake + 6 cupcakes', inc:['Chocolate Nutella cake (not nut-free)','2 Fancy Oreo, 2 Ondeh Ondeh and 2 Red Velvet Toffee cupcakes','No inscriptions'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-cup-magical', sec:'Standard cupcakes', cat:'cake', name:'6pcs Magical Mix', vendor:'Butter Studio', status:'demo', basis:'box', price:2990, rec:0, img:'img/cakes/bs-magical-mix.jpg', cap:'2 each: Over The Rainbow, Magical Unicorn, Mermaid Fantasy', inc:['2 Over The Rainbow, 2 Magical Unicorn and 2 Mermaid Fantasy cupcakes'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-cup-signature', sec:'Standard cupcakes', cat:'cake', name:'6 Pcs Signature Cupcakes', vendor:'Butter Studio', status:'demo', basis:'box', price:2990, rec:0, cap:'2 each: Sea Salt Rocher, Red Velvet Toffee, Fancy Oreo', inc:['2 Sea Salt Rocher cupcakes','2 Red Velvet Toffee and 2 Fancy Oreo cupcakes (nut-free)'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'bs-tart', sec:'Gourmet treats', cat:'cake', name:'Seasalt Nutella Tart', vendor:'Butter Studio', status:'demo', basis:'cake', price:990, rec:0, cap:'Nutella tart finished with sea salt', inc:['Nutella tart finished with sea salt'], cond:['Delivery fee confirmed in your quote','Order at least 3 days ahead']},
    {id:'e-face', cat:'entertainment', name:'Face painting, 2 hours', vendor:'Entertainment partner, to be selected', status:'demo', basis:'booking', price:32000, rec:3, along:'Face painting', cap:'One artist, about 20 children in 2 hours, once verified', inc:['Skin-safe paints','Theme-matched designs'], cond:['Book at least 14 days ahead','Space for a small table and two chairs']},
    {id:'e-photo', cat:'entertainment', name:'Party photographer, 2 hours', vendor:'Photography partner, to be selected', status:'demo', basis:'booking', price:45000, rec:4, along:'Photographer', cap:'One photographer', inc:['Candid and group photos','Edited gallery within 7 days'], cond:['Book at least 14 days ahead']},
    {id:'e-balloon', cat:'entertainment', name:'Balloon sculpting, 90 minutes', vendor:'Entertainment partner, to be selected', status:'demo', basis:'booking', price:28000, rec:0, along:'Balloon sculpting', cap:'One sculptor', inc:['One balloon creation per child'], cond:['Book at least 14 days ahead']},
    {id:'e-magic', cat:'entertainment', name:'Magic show, 30 minutes', vendor:'Entertainment partner, to be selected', status:'demo', basis:'booking', price:35000, rec:0, slot:{min:30,title:'Magic show',copy:'A 30-minute show with the birthday child as assistant.'}, cap:'For up to 40 guests', inc:['Interactive show','Birthday-child volunteer moment'], cond:['Book at least 14 days ahead','Needs a 2 m clear performance space']},
    {id:'s-backdrop', cat:'styling', name:'Balloon garland & name backdrop', vendor:'Styling partner, to be selected', status:'demo', basis:'booking', price:28000, rec:5, cap:'One 2 m backdrop', inc:['Balloon garland in your theme colours','Child’s name sign','Setup and removal'], cond:['Book at least 7 days ahead','Indoor venues, helium-free']},
    {id:'s-dessert', cat:'styling', name:'Dessert table styling', vendor:'Styling partner, to be selected', status:'demo', basis:'booking', price:22000, rec:0, cap:'One table', inc:['Themed tablecloth and stands','Cake toppers and signage'], cond:['Needs a 1.8 m table at the venue']},
    {id:'s-favours', cat:'styling', name:'Party favour bags', vendor:'Tom & Stefanie', status:'demo', basis:'child', price:600, rec:0, cap:'One per child', inc:['Themed bag','Sticker sheet','Thank-you tag'], cond:['Confirmed with your quotation']},
    {id:'s-props', cat:'styling', name:'Photo props & party hats', vendor:'Styling partner, to be selected', status:'demo', basis:'booking', price:9500, rec:0, cap:'Props and hats for up to 30', inc:['Theme-coloured party hats','Handheld photo props'], cond:['Order at least 5 days ahead']},
  ];
  var BYID = {}; P.forEach(function(p){ BYID[p.id] = p; });
  var STATUS = { demo:['st-demo','Sample listing'], prospective:['st-prospective','Prospective'], approved:['st-approved','Approved'], partner:['st-approved','Cake partner'], confirmed:['st-confirmed','Confirmed'] };

  /* ================= HELPERS ================= */
  var fmt = new Intl.NumberFormat('en-SG',{style:'currency',currency:'SGD',currencyDisplay:'narrowSymbol'});
  function money(c){ return fmt.format(c/100); }
  function short(c){ return money(c).replace('.00',''); }
  var $ = function(id){ return document.getElementById(id); };
  function put(id, t){ var el = $(id); if (el && el.textContent !== String(t)) { el.textContent = t; return true; } return false; }
  function el(tag, cls, text){ var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function icon(name){ var ns='http://www.w3.org/2000/svg', s=document.createElementNS(ns,'svg'), u=document.createElementNS(ns,'use'); s.setAttribute('class','icon'); s.setAttribute('aria-hidden','true'); u.setAttribute('href','#'+name); s.appendChild(u); return s; }
  function billable(n){ return Math.max(n, MIN_PAX); }
  function waxCents(exp, n){ return exp === 'both' ? WAX_DUO * n * 2 : WAX * n * EXP[exp].per; }
  function clamp(n, lo, hi){ n = Math.round(Number(n)); return isNaN(n) ? lo : Math.min(hi, Math.max(lo, n)); }
  function squishyCents(exp, n){ return EXP[exp].pax * billable(n); }
  function logoEl(vendor){ vendor = vendor || 'Butter Studio'; var w = el('span','bs-logo'), im = document.createElement('img'), done = false; function fallback(){ if (done) return; done = true; if (im.parentNode) im.replaceWith(el('span','bs-word', vendor)); } if (!LOGOS[vendor]) { w.appendChild(el('span','bs-word', vendor)); return w; } im.alt = vendor; im.decoding = 'async'; im.addEventListener('error', fallback); im.addEventListener('load', function(){ if (im.naturalWidth) done = true; else fallback(); }); im.src = LOGOS[vendor]; setTimeout(function(){ if (!im.complete || !im.naturalWidth) fallback(); }, 6000); w.appendChild(im); return w; }
  function basisLabel(p){ return {booking:'per order', cake:'per cake', box:'per box', child:'per child', pax:'per guest'}[p.basis]; }
  function qtyFor(p, s){ if (p.basis === 'child') return Math.max(s.children, p.min || 0); if (p.basis === 'pax') return Math.max(s.children + s.adults, p.min || 0); return 1; }
  function costFor(p, s){ return p.price == null ? null : p.price * qtyFor(p, s); }
  function clock(start, mins){ if (!start) return null; var hm = start.split(':'), t = (+hm[0]) * 60 + (+hm[1]) + mins, h = Math.floor(t / 60) % 24, m = t % 60; return (h % 12 || 12) + ':' + String(m).padStart(2,'0') + (h < 12 ? ' am' : ' pm'); }
  function range(start, a, b){ var x = clock(start, a), y = clock(start, b); if (!x) return null; var sx = x.slice(-2), sy = y.slice(-2); return (sx === sy ? x.slice(0, -3) : x) + '–' + y; }
  function lengthLabel(m){ var h = Math.floor(m / 60), r = m % 60; return (h ? h + (h === 1 ? ' hour' : ' hours') : '') + (h && r ? ' ' : '') + (r ? r + ' min' : ''); }
  function mins(t){ if (!t) return null; var a = t.split(':'); return (+a[0]) * 60 + (+a[1]); }

  /* ================= STATE ================= */
  var S = { children:15, adults:10, budgetMode:'total', budgetCents:null, started:false, date:'', time:'14:00', length:120, end:'16:00', postal:'', timeOk:true, venue:'', theme:'cobalt', tpl:'splash', rsvp:'', captionEdited:false, done:{}, requested:false, experience:'both', wax:false, selected:[], customised:false, childName:'', childAge:'' };

  function foundation(s){
    var n = billable(s.children), e = EXP[s.experience], items = [];
    items.push({label:'Squishy DIY: ' + e.name + ', ' + n + ' × ' + short(e.pax), sub:e.short + ' for ' + n + ' children, ' + n + ' × ' + short(e.pax), cents:e.pax * n, ic:'i-sparkles'});
    items.push({label:'Squishy capsules + rhinestone stickers, ' + n + ' × ' + short(CONTAINER), sub:'Squishy capsules + rhinestone stickers, ' + n + ' × ' + short(CONTAINER), cents:CONTAINER * n, ic:'i-jar'});
    if (s.wax) items.push({label:s.experience === 'both' ? 'Wax Cracking duo deal, ' + (n * 2) + ' squishies × $2.50' : 'Wax Cracking, ' + (n * e.per) + ' squishies × ' + short(WAX), cents:waxCents(s.experience, n), sub:s.experience === 'both' ? 'Wax Cracking duo deal, ' + (n * 2) + ' × $2.50' : 'Wax Cracking, ' + (n * e.per) + ' × ' + short(WAX), ic:'i-crack'});
    items.push({label:'One-time travel & set-up (up to ' + TEAM_HOURS + ' hours)', sub:'One-time travel & set-up (up to ' + TEAM_HOURS + ' hours)', cents:LOGISTICS, ic:'i-users'});
    return items;
  }
  function recommend(s){
    var base = foundation(s).reduce(function(a, i){ return a + i.cents; }, 0), picks = [], missed = [];
    if (s.budgetCents == null) return {base:base, picks:picks, missed:missed, left:null};
    var left = s.budgetCents - base;
    P.filter(function(p){ return p.rec > 0 && p.price != null; }).sort(function(a, b){ return a.rec - b.rec; }).forEach(function(p){
      var c = costFor(p, s); if (c <= left) { picks.push(p.id); left -= c; } else missed.push({p:p, short:c - left});
    });
    P.filter(function(p){ return p.rec > 0 && p.price == null; }).forEach(function(p){ picks.unshift(p.id); });
    return {base:base, picks:picks, missed:missed, left:left};
  }
  function totals(s){
    var f = foundation(s), sum = f.reduce(function(a, i){ return a + i.cents; }, 0), pending = [], partners = [];
    s.selected.forEach(function(id){ var p = BYID[id], c = costFor(p, s); partners.push({p:p, cents:c, qty:qtyFor(p, s)}); if (c == null) pending.push(p); else sum += c; });
    return {found:f, partners:partners, pending:pending, total:sum};
  }

  /* ================= PARTNER CARDS (built once) ================= */
  var cardEls = {};
  function buildCards(){
    var host = $('addon-tabs'), list = el('div','tablist'); list.setAttribute('role','tablist'); list.setAttribute('aria-label','Add-on categories'); host.appendChild(list);
    CATS.forEach(function(cat, ci){
      var tab = el('button'); tab.type = 'button'; tab.setAttribute('role','tab'); tab.id = 'tab-a-' + cat.id; tab.setAttribute('aria-controls','panel-a-' + cat.id); tab.setAttribute('aria-selected', String(ci === 0)); if (ci) tab.tabIndex = -1;
      tab.appendChild(icon(cat.icon)); tab.appendChild(document.createTextNode(cat.tab)); 
      var cnt = el('span','tcount','0'); cnt.id = 'count-' + cat.id; cnt.dataset.n = '0'; tab.appendChild(cnt); list.appendChild(tab);
      var panel = el('div','tabpanel'); panel.setAttribute('role','tabpanel'); panel.id = 'panel-a-' + cat.id; panel.setAttribute('aria-labelledby', tab.id); panel.tabIndex = 0; panel.hidden = ci !== 0;
      var grid = el('div','addon-grid'); panel.appendChild(grid); host.appendChild(panel);
      buildStores(grid, cat.id); return;
      P.filter(function(p){ return p.cat === cat.id; }).forEach(function(p){
        var c = el('article','vcard');
        var top = el('div','vtop ' + cat.id), vi = el('span','vi'); vi.appendChild(icon(cat.icon)); top.appendChild(p.cat === 'cake' ? logoEl(p.vendor) : vi);
        var st = el('span','st ' + STATUS[p.status][0], STATUS[p.status][1]); top.appendChild(st);
        var rec = el('span','vrec','Suggested for your budget'); rec.hidden = true; top.appendChild(rec); c.appendChild(top);
        var b = el('div','vbody'), nm = el('div'); nm.appendChild(el('p','vname', p.name)); nm.appendChild(el('p','vvendor', p.vendor)); b.appendChild(nm);
        var pr = el('div','vprice'), ps = el('strong', p.price == null ? 'quote' : null, p.price == null ? 'Priced in your quote' : short(p.price)), pb = el('span', null, '');
        pr.appendChild(ps); pr.appendChild(pb); b.appendChild(pr);
        var l1 = el('p','vline'); l1.appendChild(icon('i-users')); l1.appendChild(el('span', null, p.cap)); b.appendChild(l1);
        var d = el('details'), sm = el('summary', null, 'Details & conditions'), dl = el('dl');
        [['Price basis', null], ['Inclusions', p.inc], ['Conditions', p.cond], ['Vendor status', null]].forEach(function(r){
          var w = el('div'); w.appendChild(el('dt', null, r[0])); var dd = el('dd');
          if (r[1]) { var ul = el('ul'); r[1].forEach(function(t){ ul.appendChild(el('li', null, t)); }); dd.appendChild(ul); }
          else if (r[0] === 'Price basis') dd.textContent = p.price == null ? p.vendor + '’s price for your size and flavour is added to your quotation. It isn’t counted in the estimate here.' : short(p.price) + ' ' + basisLabel(p) + (p.min ? ', minimum ' + p.min : '') + (p.status === 'demo' ? '. Demo price.' : '.');
          else dd.textContent = p.status === 'demo' ? 'Sample listing. Partner and rate to be agreed before launch.' : p.status === 'partner' ? 'Our cake partner' + (p.legal ? ' (' + p.legal + ')' : '') + '. We order and coordinate delivery for you.' : 'Approved partner with agreed rates.';
          w.appendChild(dd); dl.appendChild(w);
        });
        d.appendChild(sm); d.appendChild(dl); b.appendChild(d);
        var add = el('button','btn btn-ghost vadd'); add.type = 'button'; add.setAttribute('aria-pressed','false');
        add.addEventListener('click', function(){ toggle(p.id); });
        b.appendChild(add); c.appendChild(b); grid.appendChild(c);
        cardEls[p.id] = {card:c, add:add, basis:pb, rec:rec};
      });
    });
  }


  /* ================= HOME: "How it works" 3-step timeline ================= */
  function buildTimeline(){
    var tl = $('how-tl'); if (!tl) return;
    // Step 1: the three Squishy DIY options, reusing the photos from the planner
    var ex = $('tl-exp');
    [['both','Duo','Best value'],['jelly','Jelly',''],['crunchy','Crunchy','']].forEach(function(o){
      var src = document.querySelector('.exp-tile input[value="' + o[0] + '"]'), img = src && src.parentNode.querySelector('img');
      var c = el('div','tl-exp-card' + (o[0] === 'both' ? ' best' : ''));
      if (img) { var im = document.createElement('img'); im.src = img.src; im.alt = ''; im.decoding = 'async'; c.appendChild(im); }
      c.appendChild(el('b', null, o[1])); c.appendChild(el('span', null, short(EXP[o[0]].pax) + ' per child'));
      if (o[2]) c.appendChild(el('i', null, o[2]));
      ex.appendChild(c);
    });
    // Step 2: one swipeable card per partner
    var vs = $('tl-vendors');
    var order = []; ['cake','styling','entertainment'].forEach(function(c){ vendorsFor(c).forEach(function(v){ order.push([v, c]); }); });
    order.forEach(function(x){
      var v = x[0], cat = x[1], st = storeOf(v), card = el('div','tl-vcard'); card.setAttribute('role','listitem');
      var pic = st.hero || (P.filter(function(p){ return p.vendor === v && p.img; })[0] || {}).img;
      card.appendChild(photoEl(pic, '', 'tl-vpic tone-' + cat, st.icon || CAT_ICON[cat]));
      var b = el('div','tl-vbody');
      b.appendChild(el('span','tl-vcat', (CATS.filter(function(c){ return c.id === cat; })[0] || {}).tab));
      b.appendChild(el('b', null, st.title || v));
      b.appendChild(el('span','tl-vfrom', fromTxt(v)));
      card.appendChild(b); vs.appendChild(card);
    });
    // Step 3: a sample invitation
    var inv = $('tl-invite');
    if (inv) inv.innerHTML = invSVG('splash', { name:'Mia', age:6, ageLine:'6th Birthday', dateLine:'Saturday, 21 November', dayLine:'Saturday', dayDate:'Nov 21', timeLine:'2:00 pm – 4:00 pm', startLine:'at 2:00 pm', venue:'Clubhouse II, 1 Example Road', rsvp:'' }, 'tl');
    // Scroll: the line fills and each step lights up and fades in as it reaches the middle of the screen.
    var steps = [].slice.call(tl.querySelectorAll('.tl-step'));
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!('IntersectionObserver' in window)) { steps.forEach(function(x){ x.classList.add('in', 'on'); }); return; }
    tl.classList.add('tl-anim'); if (reduce) tl.classList.add('tl-still');
    var io = new IntersectionObserver(function(es){ es.forEach(function(e){ if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin:'0px 0px -12% 0px', threshold:0.12 });
    steps.forEach(function(x){ io.observe(x); });
    var ticking = false;
    function fill(){
      ticking = false;
      if (tl.offsetParent === null) return;
      var r = tl.getBoundingClientRect(), mid = window.innerHeight * 0.55;
      var pct = Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, r.height)));
      tl.style.setProperty('--tl-p', pct.toFixed(3));
      steps.forEach(function(x){ var d = x.querySelector('.tl-dot').getBoundingClientRect(); x.classList.toggle('on', d.top + d.height / 2 <= mid); });
    }
    window.addEventListener('scroll', function(){ if (!ticking) { ticking = true; requestAnimationFrame(fill); } }, {passive:true});
    window.addEventListener('resize', fill); fill();
    tl.__fill = fill;
  }

  /* ================= PARTNER STORES: one card per vendor; tapping opens its menu, like a delivery app ================= */
  var storeEls = {}, itemEls = {}, sheet = null, sheetVendor = null, sheetReturn = null, optGroup = null, lastR = {picks:[]};
  var CAT_ICON = {}; CATS.forEach(function(c){ CAT_ICON[c.id] = c.icon; });
  function storeOf(v){ return STORES[v] || {title:v, area:'', tags:[]}; }
  function photoEl(src, alt, cls, ic){
    var w = el('div', cls);
    function none(){ w.classList.add('noimg'); w.textContent = ''; w.appendChild(icon(ic || 'i-cake')); }
    if (!src) { none(); return w; }
    var im = document.createElement('img'); im.alt = alt || ''; im.decoding = 'async'; im.draggable = false;
    im.addEventListener('error', none); im.src = src; w.appendChild(im); return w;
  }
  function vendorsFor(cat){ var vs = []; P.forEach(function(p){ if (p.cat === cat && vs.indexOf(p.vendor) < 0) vs.push(p.vendor); }); return vs; }
  function storeGroups(vendor){
    var gs = [], by = {};
    P.forEach(function(p){ if (p.vendor !== vendor) return; var k = p.g || p.id; if (!by[k]) { by[k] = {key:k, name:p.gname || p.name, items:[]}; gs.push(by[k]); } by[k].items.push(p); });
    return gs;
  }
  function groupPick(g){ for (var i = 0; i < g.items.length; i++) if (S.selected.indexOf(g.items[i].id) >= 0) return g.items[i]; return null; }
  function per(p){ return p.basis === 'child' ? ' / child' : p.basis === 'pax' ? ' / guest' : ''; }
  function priceTxt(p){ return p.price == null ? 'Price in your quote' : money(p.price) + per(p); }
  function fromTxt(vendor){
    var c = P.filter(function(p){ return p.vendor === vendor && p.price != null; }).sort(function(a, b){ return a.price - b.price; })[0];
    return c ? 'From ' + money(c.price) + per(c) : 'Priced in your quote';
  }
  function buildStores(grid, cat){
    grid.className = 'store-list';
    vendorsFor(cat).forEach(function(v){
      var st = storeOf(v), b = el('button','store'); b.type = 'button'; b.setAttribute('aria-haspopup','dialog');
      var th = el('span','store-thumb'); if (st.thumb) th.appendChild(photoEl(st.thumb, '', 'store-photo', CAT_ICON[cat])); else if (LOGOS[v] || cat === 'cake') th.appendChild(logoEl(v)); else { th.classList.add('store-ic', 'tone-' + cat); th.appendChild(icon(st.icon || CAT_ICON[cat])); } b.appendChild(th);
      var info = el('span','store-info');
      info.appendChild(el('span','store-name', st.title || v));
      if (st.area) info.appendChild(el('span','store-area', st.area));
      if (st.tags.length) info.appendChild(el('span','store-tags', st.tags.join(' · ')));
      info.appendChild(el('span','store-from', fromTxt(v)));
      var pills = el('span','store-pills'); pills.appendChild(el('span','store-pill' + (st.pill === 'Sample listing' ? ' sample' : ''), st.pill || 'Cake partner'));
      var sug = el('span','store-sug','Suggested'); sug.hidden = true; pills.appendChild(sug);
      var cnt = el('span','store-count'); cnt.hidden = true; pills.appendChild(cnt); info.appendChild(pills);
      b.appendChild(info); var go = icon('i-arrow'); go.classList.add('store-go'); b.appendChild(go);
      b.addEventListener('click', function(){ openStore(v, b); });
      grid.appendChild(b); storeEls[v] = {btn:b, count:cnt, sug:sug};
    });
  }
  function buildSheet(){
    sheet = el('div','store-sheet'); sheet.hidden = true; sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-modal','true'); sheet.setAttribute('aria-labelledby','ss-name');
    sheet.innerHTML = '<div class="ss-backdrop" data-close></div>' +
      '<div class="ss-panel" tabindex="-1">' +
        '<div class="ss-hero"><div class="ss-hero-img" id="ss-hero"></div><button type="button" class="ss-back" data-close aria-label="Back to all vendors"><svg class="icon flip" aria-hidden="true"><use href="#i-arrow"/></svg></button></div>' +
        '<div class="ss-card"><div class="ss-logo" id="ss-logo"></div><div class="ss-meta"><span class="store-pill" id="ss-pill"></span><h3 id="ss-name"></h3><p class="ss-area" id="ss-area"></p><p class="ss-tags" id="ss-tags"></p></div></div>' +
        '<p class="ss-deliv"><svg class="icon" aria-hidden="true"><use href="#i-pin"/></svg><span id="ss-deliv"></span></p>' +
        '<h4 class="ss-h">Menu</h4><div class="ss-grid" id="ss-grid"></div>' +
        '<div class="ss-foot"><p id="ss-foot-txt" aria-live="polite"></p><button type="button" class="btn btn-primary" data-close>Done</button></div>' +
      '</div>' +
      '<div class="ss-opt" id="ss-opt" hidden><div class="ss-opt-in" role="group" aria-labelledby="ss-opt-h"><button type="button" class="ss-opt-x" id="ss-opt-x" aria-label="Close"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>' +
        '<div class="ss-opt-ph" id="ss-opt-ph"></div><h4 id="ss-opt-h"></h4><p class="ss-opt-price" id="ss-opt-price"></p><p class="ss-opt-cap" id="ss-opt-cap"></p>' +
        '<div id="ss-opt-sizes"><p class="ss-opt-sub">Choose a size</p><div class="ss-opt-list" id="ss-opt-list" role="radiogroup" aria-labelledby="ss-opt-h"></div></div>' +
        '<div class="ss-opt-info" id="ss-opt-info"></div>' +
        '<div class="ss-opt-actions"><button type="button" class="btn btn-ghost" id="ss-opt-remove">Remove</button><button type="button" class="btn btn-primary" id="ss-opt-add">Add to plan</button></div></div></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', function(e){ var t = e.target.closest('[data-close]'); if (t) { e.preventDefault(); closeStore(); } });
    sheet.addEventListener('keydown', function(e){
      if (e.key === 'Escape') { e.preventDefault(); if (!$('ss-opt').hidden) closeOpt(); else closeStore(); return; }
      if (e.key === 'Tab') { var f = [].slice.call(sheet.querySelectorAll('button:not([disabled]), input:not([disabled])')).filter(function(x){ return x.offsetParent !== null && !x.closest('[hidden]'); }); if (!$('ss-opt').hidden) f = f.filter(function(x){ return x.closest('#ss-opt'); }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    $('ss-opt').addEventListener('click', function(e){ if (e.target.id === 'ss-opt') closeOpt(); });
    $('ss-opt-x').addEventListener('click', function(){ closeOpt(); });
    $('ss-opt-add').addEventListener('click', function(){ var r = sheet.querySelector('input[name="ss-size"]:checked'); setGroup(optGroup, r ? r.value : optGroup.items[0].id); closeOpt(); });
    $('ss-opt-remove').addEventListener('click', function(){ setGroup(optGroup, null); closeOpt(); });
  }
  function openStore(v, from){
    if (!sheet) buildSheet();
    sheetVendor = v; sheetReturn = from || document.activeElement; var st = storeOf(v), cat = BYID[storeGroups(v)[0].items[0].id].cat, ic = st.icon || CAT_ICON[cat];
    sheet.dataset.cat = cat;
    var hero = $('ss-hero'); hero.textContent = ''; hero.appendChild(photoEl(st.hero, '', 'ss-hero-ph tone-' + cat, ic));
    var lg = $('ss-logo'); lg.textContent = ''; lg.className = 'ss-logo'; if (st.thumb) lg.appendChild(photoEl(st.thumb, '', 'store-photo', ic)); else if (LOGOS[v] || cat === 'cake') lg.appendChild(logoEl(v)); else { lg.classList.add('store-ic', 'tone-' + cat); lg.appendChild(icon(ic)); }
    put('ss-pill', st.pill || 'Cake partner'); $('ss-pill').classList.toggle('sample', st.pill === 'Sample listing');
    put('ss-name', st.title || v); put('ss-area', st.area || ''); put('ss-tags', st.tags.join(' · ')); $('ss-tags').hidden = !st.tags.length;
    put('ss-deliv', st.note || (cat === 'cake' ? 'We order and deliver to your venue. Delivery fee is confirmed in your quote.' : 'We book and coordinate this partner for your date, all in one quote.'));
    var grid = $('ss-grid'); grid.textContent = ''; itemEls = {}; var lastSec = null;
    storeGroups(v).forEach(function(g){
      var p0 = g.items[0], multi = g.items.length > 1, t = el('article','ss-item');
      if (p0.sec && p0.sec !== lastSec) { lastSec = p0.sec; grid.appendChild(el('h5','ss-sec', p0.sec)); }
      if (p0.g === 'bs-custom') t.classList.add('wide');
      var ph = el('div','ss-ph'); ph.setAttribute('role','button'); ph.tabIndex = -1; ph.appendChild(photoEl(p0.img, '', 'ss-img tone-' + cat, ic));
      var sug = el('span','ss-sug','Suggested'); sug.hidden = true; ph.appendChild(sug);
      var plus = el('button','ss-plus'); plus.type = 'button'; ph.appendChild(plus); t.appendChild(ph);
      var nm = el('button','ss-name', g.name); nm.type = 'button'; t.appendChild(nm);
      var price = el('p','ss-price'); t.appendChild(price);
      var sub = el('p','ss-sub'); t.appendChild(sub);
      plus.addEventListener('click', function(e){ e.stopPropagation(); if (multi) openOpt(g); else toggle(p0.id); });
      ph.addEventListener('click', function(){ openOpt(g); }); nm.addEventListener('click', function(){ openOpt(g); });
      grid.appendChild(t); itemEls[g.key] = {g:g, tile:t, plus:plus, price:price, sub:sub, sug:sug, multi:multi};
    });
    syncSheet();
    sheet.hidden = false; document.documentElement.classList.add('ss-lock');
    requestAnimationFrame(function(){ sheet.classList.add('open'); sheet.querySelector('.ss-panel').scrollTop = 0; sheet.querySelector('.ss-back').focus(); });
    track('store_opened', {vendor:v, category:cat});
  }
  function closeStore(){
    if (!sheet || sheet.hidden) return; closeOpt(true);
    sheet.classList.remove('open'); document.documentElement.classList.remove('ss-lock');
    var done = function(){ sheet.hidden = true; }; if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) done(); else setTimeout(done, 220);
    if (sheetReturn && sheetReturn.focus) sheetReturn.focus(); sheetVendor = null;
  }
  // Item sheet: description, inclusions, conditions, and a size choice when the item has sizes.
  function openOpt(g){
    optGroup = g; var pick = groupPick(g), p0 = pick || g.items[0], multi = g.items.length > 1, list = $('ss-opt-list'); list.textContent = '';
    var ph = $('ss-opt-ph'); ph.textContent = ''; ph.hidden = !p0.img; if (p0.img) ph.appendChild(photoEl(p0.img, '', 'ss-img', CAT_ICON[p0.cat]));
    put('ss-opt-h', g.name);
    var q = qtyFor(p0, S), cost = costFor(p0, S);
    put('ss-opt-price', multi ? '' : priceTxt(p0) + (cost != null && q > 1 ? ' · ' + money(cost) + ' for ' + q : '') + (p0.status === 'demo' ? ' · Demo price' : ''));
    $('ss-opt-price').hidden = multi;
    put('ss-opt-cap', p0.cap || ''); 
    $('ss-opt-sizes').hidden = !multi;
    if (multi) g.items.forEach(function(p, i){
      var lab = el('label','ss-radio'), r = document.createElement('input'); r.type = 'radio'; r.name = 'ss-size'; r.value = p.id; r.checked = pick ? pick.id === p.id : i === 0;
      lab.appendChild(r); lab.appendChild(el('span','ss-r-name', p.size || p.name)); lab.appendChild(el('span','ss-r-price', priceTxt(p))); list.appendChild(lab);
    });
    var info = $('ss-opt-info'); info.textContent = '';
    [['Included', p0.inc], ['Good to know', p0.cond]].forEach(function(r){ if (!r[1] || !r[1].length) return; info.appendChild(el('p','ss-info-h', r[0])); var ul = el('ul'); r[1].forEach(function(t){ ul.appendChild(el('li', null, t)); }); info.appendChild(ul); });
    if (p0.status === 'demo') info.appendChild(el('p','ss-info-note','Sample listing: the partner and rate are confirmed before launch.'));
    $('ss-opt-remove').hidden = !pick; put('ss-opt-add', pick ? (multi ? 'Update plan' : 'Added ✓') : 'Add to plan');
    $('ss-opt-add').disabled = !!pick && !multi;
    $('ss-opt').hidden = false; $('ss-opt').querySelector('.ss-opt-in').scrollTop = 0;
    requestAnimationFrame(function(){ $('ss-opt').classList.add('open'); var c = list.querySelector('input:checked'); (multi && c ? c : $('ss-opt-x')).focus(); });
  }
  function closeOpt(silent){
    var o = $('ss-opt'); if (!o || o.hidden) return; o.classList.remove('open'); o.hidden = true;
    if (!silent && optGroup && itemEls[optGroup.key]) itemEls[optGroup.key].plus.focus(); optGroup = null;
  }
  function setGroup(g, id){
    var before = groupPick(g);
    if ((before && before.id) === id) return;
    g.items.forEach(function(p){ var i = S.selected.indexOf(p.id); if (i >= 0) S.selected.splice(i, 1); });
    if (id) S.selected.push(id);
    S.customised = true;
    var p = id ? BYID[id] : before;
    track(id ? 'addon_added' : 'addon_removed', {id:p.id, category:p.cat, vendor:p.vendor});
    render(true, (id ? 'Added ' : 'Removed ') + p.name + '.');
  }
  function syncStores(R){
    if (R) lastR = R;
    Object.keys(storeEls).forEach(function(v){
      var k = S.selected.filter(function(id){ return BYID[id].vendor === v; }).length, c = storeEls[v].count;
      c.hidden = !k; c.textContent = k + ' in your plan'; storeEls[v].btn.classList.toggle('on', !!k);
      storeEls[v].sug.hidden = !!k || !lastR.picks.some(function(id){ return BYID[id].vendor === v && S.selected.indexOf(id) < 0; });
    });
    syncSheet();
  }
  function syncSheet(){
    if (!sheetVendor) return; var n = 0;
    Object.keys(itemEls).forEach(function(k){
      var x = itemEls[k], pick = groupPick(x.g), p0 = x.g.items[0], on = !!pick; if (on) n++;
      var shown = pick || p0, q = qtyFor(shown, S), cost = costFor(shown, S);
      x.tile.classList.toggle('on', on);
      x.plus.textContent = ''; x.plus.appendChild(icon(on ? 'i-check' : 'i-plus'));
      x.plus.setAttribute('aria-label', x.multi ? (on ? 'Change size of ' : 'Choose a size of ') + x.g.name : (on ? 'Remove ' : 'Add ') + x.g.name + (on ? ' from' : ' to') + ' your plan');
      if (!x.multi) x.plus.setAttribute('aria-pressed', String(on)); else x.plus.removeAttribute('aria-pressed');
      x.sug.hidden = on || !x.g.items.some(function(p){ return lastR.picks.indexOf(p.id) >= 0; });
      x.price.textContent = priceTxt(shown);
      var demo = shown.status === 'demo' ? 'Demo price' : '';
      var extra = cost != null && q > 1 ? money(cost) + ' for ' + q : '';
      x.sub.textContent = on ? [x.multi ? 'Added: ' + pick.size : 'Added to your plan', extra, demo].filter(Boolean).join(' · ') : x.multi ? x.g.items.length + ' sizes' : [extra, demo].filter(Boolean).join(' · ') || shown.cap;
      x.sub.classList.toggle('demo', !on && !!demo);
    });
    put('ss-foot-txt', n ? n + ' item' + (n === 1 ? '' : 's') + ' from ' + (storeOf(sheetVendor).title || sheetVendor) + ' in your plan' : 'Tap + to add to your plan');
  }
  function toggle(id){
    var i = S.selected.indexOf(id);
    if (i >= 0) S.selected.splice(i, 1); else S.selected.push(id);
    S.customised = true;
    track(i >= 0 ? 'addon_removed' : 'addon_added', {id:id, category:BYID[id].cat, vendor:BYID[id].vendor});
    render(true, (i >= 0 ? 'Removed ' : 'Added ') + BYID[id].name + '.');
  }

  /* ================= HOW IT WORKS: card-stack carousel =================
     Edit captions and image paths here. Each image path is tried on the live site; until the file exists,
     a clearly labelled placeholder card is shown. Put photos in public/img/how/. */
  var HOW_STEPS = {
    jelly: [
      {img:'img/how/jelly-1.jpg', title:'Explore the setup', caption:'Your squishy station is set up and ready when the children arrive.'},
      {img:'img/how/jelly-2.jpg', title:'Choose a slime base', caption:'Each child picks from three base colours of clear or glittery slime.'},
      {img:'img/how/jelly-3.jpg', title:'Fill the beauty capsule', caption:'Take a 4-piece beauty capsule and fill 3 pieces with charms.'},
      {img:'img/how/jelly-4.jpg', title:'Mix and play', caption:'Mix and play on yellow trays, with fun tools provided.'},
      {img:'img/how/jelly-5.jpg', title:'The finished Jelly squishy', caption:'Their very own Jelly squishy, filled, tied and ready to squish.'},
      {img:'img/how/jelly-6.jpg', title:'Decorate your take-home capsule', caption:'Rhinestone stickers, DIY, then their squishy goes home in it.'}
    ],
    crunchy: [
      {img:'img/how/crunchy-1.jpg', title:'Explore the setup', caption:'Your squishy station is set up and ready when the children arrive.'},
      {img:'img/how/crunchy-2.jpg', title:'Choose a slime base', caption:'Each child picks from three base colours of clear or glittery slime.'},
      {img:'img/how/crunchy-3.jpg', title:'Pick the crunch', caption:'Take 2 boxes and fill them with crunchy toppings.'},
      {img:'img/how/crunchy-4.jpg', title:'Mix and play', caption:'Mix and play on yellow trays, with fun tools provided.'},
      {img:'img/how/crunchy-5.jpg', title:'The finished Crunchy squishy', caption:'Their very own Crunchy squishy, filled, tied and ready to crunch.'},
      {img:'img/how/crunchy-6.jpg', title:'Decorate your take-home capsule', caption:'Rhinestone stickers, DIY, then their squishy goes home in it.'}
    ],
    both: [
      {img:'img/how/duo-1.jpg', title:'Explore the setup', caption:'Your squishy station is set up and ready when the children arrive.'},
      {img:'img/how/duo-2.jpg', title:'Choose a slime base', caption:'Each child picks from three base colours of clear or glittery slime.'},
      {img:'img/how/duo-3.jpg', title:'Boxes and capsule', caption:'2 boxes of crunchy toppings in one hand, a 4-piece beauty capsule of charms in the other.'},
      {img:'img/how/duo-4.jpg', title:'Mix and play', caption:'Mix and play on yellow trays, with fun tools provided.'},
      {img:'img/how/duo-5.jpg', title:'The finished Duo', caption:'A Jelly and a Crunchy squishy each, filled, tied and ready to squish.'},
      {img:'img/how/duo-6.jpg', title:'Decorate your take-home capsule', caption:'Rhinestone stickers, DIY, then both squishies go home in it.'}
    ]
  };
  var TAGLINES = { jelly:'A little colour. A lot of personality.', crunchy:'All the crunch. All the fun.', both:'Two textures. Twice the squish.' };
  function isWeb(){ try { return /^https?:$/.test(location.protocol); } catch (e) { return false; } }
  var photoOK = {};
  function tryPhoto(url, cb){
    if (!isWeb() && url.indexOf('data:') !== 0) return;
    if (url in photoOK) { if (photoOK[url]) cb(); return; }
    var im = new Image(); im.onload = function(){ photoOK[url] = true; cb(); }; im.onerror = function(){ photoOK[url] = false; }; im.src = url;
  }
  // Card positions relative to the active card (k = index - active). Upcoming cards peek up and to the right.
  // Centred stack: the current card sits in the middle, the next ones fan out behind it (right, top, left).
  // Swipe left for the next card (the current one slides out to the left); swipe right to bring it back.
  var HW_POS = {
    '-1': 'translate(-78%, 6%) rotate(-12deg) scale(0.9)',
    '0':  'none',
    '1':  'translate(20%, -5%) rotate(5deg) scale(0.88)',
    '2':  'translate(1%, -19%) rotate(-2deg) scale(0.8)',
    '3':  'translate(-20%, -7%) rotate(-6deg) scale(0.84)',
    '4':  'translate(0, -8%) scale(0.72)'
  };
  var HW_OPACITY = { '-1': 0, '0': 1, '1': 1, '2': 0.92, '3': 0.88, '4': 0 };
  /* One reusable card stack, used for "How it works" (planner) and "The making" (home page). */
  var MAKING_STEPS = [
    {img:'img/making/1.jpg', title:'Pick a colour', caption:'Choose from three base colours of clear or glittery slime.'},
    {img:'img/making/2.jpg', title:'Choose toppings', caption:'Favourites from our 20-topping menu of charms, sprinkles and crunchy mix-ins.'},
    {img:'img/making/3.jpg', title:'Make & customise', caption:'Our team guides the mixing and making, then helps tie each squishy.'},
    {img:'img/making/4.jpg', title:'Squish it!', caption:'The best part: squeeze, squash and squish their brand-new creation.'},
    {img:'img/making/5.jpg', title:'Decorate your capsule box', caption:'Rhinestone stickers, DIY, then it’s theirs to take home.'}
  ];
  function makeStack(root, onStep){
    var q = function(s){ return root.querySelector(s); };
    var st = { root:root, stage:q('.hw-stage'), cap:q('.hw-caption'), dots:q('.hw-dots'), prev:q('.hw-prev'), next:q('.hw-next'), steps:[], cards:[], i:0, key:null };
    function layout(){
      st.cards.forEach(function(c, idx){
        var k = Math.max(-1, Math.min(4, idx - st.i));
        c.style.transform = HW_POS[k]; c.style.opacity = HW_OPACITY[k]; c.style.zIndex = 10 - Math.abs(idx - st.i) - (idx < st.i ? 5 : 0);
        c.setAttribute('aria-hidden', String(idx !== st.i));
      });
      var s = st.steps[st.i]; st.cap.classList.add('swap');
      setTimeout(function(){ q('.hw-no').textContent = 'Step ' + (st.i + 1) + ' of ' + st.cards.length; q('.hw-cap-title').textContent = s.title; q('.hw-cap-text').textContent = s.caption; st.cap.classList.remove('swap'); }, 120);
      st.prev.disabled = st.i === 0; st.next.disabled = st.i === st.cards.length - 1;
      st.dots.querySelectorAll('.hw-dot').forEach(function(d, idx){ if (idx === st.i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
    }
    st.go = function(i){ i = Math.max(0, Math.min(st.cards.length - 1, i)); if (i === st.i) return; st.i = i; layout(); if (onStep) onStep(st.key, i + 1); };
    st.set = function(key, steps){
      if (st.key === key) return false; st.key = key; st.steps = steps; st.i = 0; st.cards = [];
      st.stage.textContent = ''; st.dots.textContent = '';
      steps.forEach(function(s, idx){
        var c = el('div','hw-card'); c.dataset.tone = idx % 4; c.setAttribute('role','group'); c.setAttribute('aria-roledescription','slide'); c.setAttribute('aria-label', 'Step ' + (idx + 1) + ' of ' + steps.length + ': ' + s.title);
        c.appendChild(el('span','hw-badge', String(idx + 1)));
        var ph = el('div','hw-ph'); ph.appendChild(el('span','hw-ph-chip','Placeholder image')); ph.appendChild(icon('i-camera')); ph.appendChild(el('b', null, 'Step ' + (idx + 1) + ': ' + s.title)); ph.appendChild(el('code', null, s.img));
        c.appendChild(ph); st.stage.appendChild(c); st.cards.push(c);
        tryPhoto(s.img, function(){ var im = document.createElement('img'); im.src = s.img; im.alt = s.title; im.draggable = false; c.replaceChild(im, ph); });
        var d = el('button','hw-dot'); d.type = 'button'; d.setAttribute('aria-label', 'Step ' + (idx + 1) + ': ' + s.title); d.appendChild(el('i')); d.addEventListener('click', function(){ st.go(idx); }); st.dots.appendChild(d);
      });
      layout(); return true;
    };
    st.prev.addEventListener('click', function(){ st.go(st.i - 1); });
    st.next.addEventListener('click', function(){ st.go(st.i + 1); });
    root.addEventListener('keydown', function(e){
      if (e.target.closest('.hw-controls') && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); st.go(st.i + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); st.go(st.i - 1); }
      else if (e.key === 'Home') { e.preventDefault(); st.go(0); } else if (e.key === 'End') { e.preventDefault(); st.go(st.cards.length - 1); }
    });
    // Swipe: the front card follows the finger, then settles on release.
    var drag = null, stage = st.stage;
    stage.addEventListener('pointerdown', function(e){ if (e.button !== 0) return; var c = st.cards[st.i]; if (c) drag = { x:e.clientX, y:e.clientY, dx:0, card:c, id:e.pointerId, moved:false }; });
    stage.addEventListener('pointermove', function(e){
      if (!drag || e.pointerId !== drag.id) return;
      drag.dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(drag.dx) > 6 && Math.abs(drag.dx) > Math.abs(e.clientY - drag.y)) { drag.moved = true; try { stage.setPointerCapture(e.pointerId); } catch (err) {} drag.card.classList.add('dragging'); }
      if (drag.moved) { var w = stage.clientWidth, dx = drag.dx; if ((st.i === 0 && dx > 0) || (st.i === st.cards.length - 1 && dx < 0)) dx *= 0.25; drag.card.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / w * 8) + 'deg)'; }
    });
    function end(e){ if (!drag || (e && e.pointerId !== drag.id)) return; var d = drag; drag = null; d.card.classList.remove('dragging'); if (d.moved && Math.abs(d.dx) > Math.min(60, stage.clientWidth * 0.15)) st.go(st.i + (d.dx < 0 ? 1 : -1)); layout(); }
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    return st;
  }
  var hwStack = null, mkStack = null;
  function renderHow(exp){
    if (!hwStack) return;
    var firstRender = hwStack.key === null;
    if (!hwStack.set(exp, HOW_STEPS[exp])) return;
    put('hw-name', EXP[exp].short === 'Duo' ? 'Duo' : EXP[exp].name);
    put('exp-tag', TAGLINES[exp]);
    if (!firstRender) {
      var tag = $('exp-tag'); tag.classList.remove('in'); void tag.offsetWidth; tag.classList.add('in');
      var tile = document.querySelector('.exp-tile input[value="' + exp + '"]');
      if (tile) { var t = tile.parentNode; t.classList.remove('squish'); void t.offsetWidth; t.classList.add('squish'); }
      var pi = $('exp-panel-img'); pi.classList.remove('pop'); void pi.offsetWidth; pi.classList.add('pop');
    }
    var big = document.querySelector('.exp-tile input[value="' + exp + '"]');
    if (big) { var src = big.parentNode.querySelector('img').src; if ($('exp-panel-img').src !== src) $('exp-panel-img').src = src; }
  }
  function initHow(){
    hwStack = makeStack($('hw'), function(key, step){ track('how_step_viewed', {experience:key, step:step}); });
    mkStack = makeStack($('mk'), function(key, step){ track('making_step_viewed', {step:step}); });
    mkStack.set('making', MAKING_STEPS);
  }


  /* ================= ANALYTICS =================
     Vercel Web Analytics + Speed Insights load automatically on the live site (enable them in the Vercel dashboard).
     PostHog funnels are optional: set window.SQUISHY_CONFIG.posthogKey at the top of the page.
     Events never include names, phone numbers, emails or addresses. */
  var CFG = window.SQUISHY_CONFIG || {};
  var AN = (function(){
    var web = isWeb(), on = { vercel:false, posthog:false };
    function addScript(src){ var s = document.createElement('script'); s.defer = true; s.src = src; document.head.appendChild(s); return s; }
    if (web && CFG.vercelAnalytics !== false) {
      window.va = window.va || function(){ (window.vaq = window.vaq || []).push(arguments); };
      window.si = window.si || function(){ (window.siq = window.siq || []).push(arguments); };
      addScript('/_vercel/insights/script.js'); addScript('/_vercel/speed-insights/script.js');
      on.vercel = true;
    }
    if (web && CFG.posthogKey) {
      // Official PostHog loader (stub queues calls until the library arrives).
      !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify reset opt_in_capturing opt_out_capturing has_opted_out_capturing get_distinct_id set_config".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
      window.posthog.init(CFG.posthogKey, {
        api_host: CFG.posthogHost || 'https://us.i.posthog.com',
        persistence: 'memory',            // no cookies: funnels per visit, no consent banner needed
        autocapture: false, capture_pageview: true, capture_pageleave: true,
        disable_session_recording: true,  // parents type personal details; keep replays off
        mask_all_text: true, mask_all_element_attributes: true
      });
      on.posthog = true;
    }
    var log = [];
    function track(name, props){
      props = props || {};
      log.push([name, props]); if (log.length > 200) log.shift();
      try { if (on.posthog && window.posthog) window.posthog.capture(name, props); } catch (e) {}
      try { if (on.vercel && CFG.vercelCustomEvents && window.va) window.va('event', {name:name, data:props}); } catch (e) {}
    }
    return { track:track, log:log, on:on };
  })();
  window.__squishyAnalytics = AN; // handy for checking events in the browser console
  var track = AN.track;

  /* ================= INVITATIONS (A4, shareable as an image) ================= */
  // Fonts are system fonts so the exported image looks the same as the preview.
  var F_DISPLAY = "Georgia, 'Times New Roman', serif", F_ROUND = "'Trebuchet MS', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
  function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function fit(text, maxW, size, k){ var w = String(text).length * (k || .56) * size; return w > maxW ? Math.max(18, Math.floor(maxW / (String(text).length * (k || .56)))) : size; }
  function T(x, y, txt, o){ o = o || {}; var size = o.fit ? fit(txt, o.fit, o.size, o.k) : o.size;
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.anchor || 'middle') + '" font-family="' + esc(o.font || F_ROUND) + '" font-size="' + size + '" font-weight="' + (o.weight || 700) + '"' + (o.italic ? ' font-style="italic"' : '') + ' fill="' + (o.fill || '#10173a') + '"' + (o.ls ? ' letter-spacing="' + o.ls + '"' : '') + (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + o.sw + '" paint-order="stroke"' : '') + '>' + esc(txt) + '</text>'; }
  function star4(x, y, r, fill){ return '<path d="M' + x + ' ' + (y - r) + 'Q' + (x + r * .18) + ' ' + (y - r * .18) + ' ' + (x + r) + ' ' + y + 'Q' + (x + r * .18) + ' ' + (y + r * .18) + ' ' + x + ' ' + (y + r) + 'Q' + (x - r * .18) + ' ' + (y + r * .18) + ' ' + (x - r) + ' ' + y + 'Q' + (x - r * .18) + ' ' + (y - r * .18) + ' ' + x + ' ' + (y - r) + 'Z" fill="' + fill + '"/>'; }
  function dots(list){ return list.map(function(d){ return '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '" fill="' + d[3] + '"/>'; }).join(''); }

  // The hero illustration: a hand squishing a jelly squishy.
  function handArt(cx, cy, s, u, pal){
    pal = pal || {};
    var j1 = pal.j1 || '#ff9fd0', j2 = pal.j2 || '#9f8cff', edge = pal.edge || '#7a5be0', skin = '#f5c9a9', skinE = '#d99a78', cuff = pal.cuff || '#2234b8';
    var g = '<defs><radialGradient id="' + u + 'jg" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".25" stop-color="' + j1 + '"/><stop offset="1" stop-color="' + j2 + '"/></radialGradient></defs>';
    var squ = '<ellipse cx="0" cy="-46" rx="156" ry="104" fill="url(#' + u + 'jg)" stroke="' + edge + '" stroke-width="5"/>' +
      '<ellipse cx="-66" cy="-100" rx="48" ry="17" fill="#fff" opacity=".75" transform="rotate(-18 -66 -100)"/>' +
      star4(60, -100, 17, '#fff6a8') + star4(-10, -122, 11, '#ffffff') + star4(110, -60, 10, '#ffffff') + dots([[100,-40,7,'#ffe27a'],[-110,-50,6,'#7fe3d2'],[24,-128,5,'#ffffff'],[-46,-70,6,'#ff6fae'],[-120,-80,5,'#ffffff']]) +
      '<path d="M-52 -18 q16 -26 32 0 M-6 -20 q16 -26 32 0 M40 -18 q16 -26 32 0" fill="' + j1 + '" stroke="' + edge + '" stroke-width="3" opacity=".9"/>';
    var hand = '<rect x="-150" y="-18" width="44" height="104" rx="22" fill="' + skin + '" stroke="' + skinE + '" stroke-width="4" transform="rotate(-32 -128 34)"/>' +
      '<ellipse cx="6" cy="80" rx="128" ry="62" fill="' + skin + '" stroke="' + skinE + '" stroke-width="4"/>' +
      [-78, -32, 14, 60].map(function(x, i){ return '<rect x="' + x + '" y="' + (-20 + (i === 0 || i === 3 ? 8 : 0)) + '" width="42" height="' + (92 - (i === 3 ? 10 : 0)) + '" rx="21" fill="' + skin + '" stroke="' + skinE + '" stroke-width="4"/><rect x="' + (x + 10) + '" y="' + (-12 + (i === 0 || i === 3 ? 8 : 0)) + '" width="22" height="16" rx="8" fill="#ffe4d4"/>'; }).join('') +
      '<path d="M-60 132 Q6 156 72 132 L82 196 L-70 196 Z" fill="' + cuff + '"/><rect x="-74" y="126" width="160" height="22" rx="11" fill="' + cuff + '" opacity=".85"/>';
    var fx = '<path d="M-176 -70 q-18 22 0 44 M-198 -84 q-26 36 0 72 M176 -70 q18 22 0 44 M198 -84 q26 36 0 72" stroke="' + (pal.lines || '#ffffff') + '" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<text x="138" y="-162" text-anchor="middle" font-family="' + esc(F_ROUND) + '" font-weight="800" font-size="40" fill="' + (pal.word || '#fff6a8') + '" stroke="' + (pal.wordStroke || '#10173a') + '" stroke-width="6" paint-order="stroke" transform="rotate(12 138 -162)">squish!</text>';
    return g + '<g transform="translate(' + cx + ' ' + cy + ') scale(' + s + ')">' + squ + hand + fx + '</g>';
  }

  var TEMPLATES = [
    {id:'splash', name:'Squishy Splash'},
    {id:'balloons', name:'Pastel Balloons'},
    {id:'sparkle', name:'Sparkle Pop'},
    {id:'retro', name:'Sweet Retro'}
  ];
  function invSVG(tpl, d, u){
    var W = 840, H = 1188, o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">';
    var name = d.name ? d.name + '’s' : 'You’re invited!', who = d.name ? d.name + '’s' : '';
    if (tpl === 'splash') {
      o += '<rect width="840" height="1188" fill="#2234b8"/><circle cx="720" cy="120" r="260" fill="#3248d4"/><circle cx="90" cy="1040" r="300" fill="#1b2b9e"/>' +
        dots([[90,120,10,'#f6e98c'],[160,210,6,'#ffd6e6'],[760,420,9,'#ffd6e6'],[700,560,6,'#f6e98c'],[120,560,7,'#7fe3d2'],[770,860,8,'#f6e98c'],[70,800,6,'#ffd6e6']]) + star4(150, 360, 22, '#f6e98c') + star4(700, 300, 16, '#ffffff') +
        T(420, 130, 'YOU’RE INVITED TO', {size:30, fill:'#f6e98c', ls:6}) +
        T(420, 238, d.name ? who : 'A Birthday', {size:96, font:F_DISPLAY, italic:true, weight:600, fill:'#ffffff', fit:720, k:.5}) +
        T(420, 312, d.age ? d.ageLine : 'Birthday', {size:52, font:F_DISPLAY, weight:500, fill:'#ffffff'}) +
        T(420, 420, 'SQUISHY PARTY', {size:96, weight:900, fill:'#f6e98c', stroke:'#e2477f', sw:14, ls:2, fit:760, k:.66}) +
        '<circle cx="420" cy="650" r="200" fill="#eef0ff"/><circle cx="420" cy="650" r="200" fill="none" stroke="#f6e98c" stroke-width="10" stroke-dasharray="4 18" stroke-linecap="round"/>' +
        handArt(420, 680, 1.02, u, {word:'#f6e98c', lines:'#2234b8'}) +
        '<rect x="80" y="886" width="680" height="232" rx="40" fill="#ffffff"/>' +
        T(420, 950, d.dateLine, {size:38, fill:'#10173a', fit:620}) + T(420, 1000, d.timeLine, {size:32, fill:'#2234b8', weight:700}) +
        T(420, 1046, d.venue, {size:26, weight:600, fill:'#5a6282', fit:620}) + (d.rsvp ? T(420, 1090, 'RSVP ' + d.rsvp, {size:24, weight:700, fill:'#e2477f', fit:620}) : '') +
        T(420, 1160, 'MAKE · SQUISH · TAKE HOME', {size:22, fill:'#f6e98c', ls:5});
    } else if (tpl === 'balloons') {
      var flags = function(x0, y0, dir){ var s = ''; for (var i = 0; i < 6; i++) { var x = x0 + dir * i * 62, y = y0 + i * i * 2 + i * 8, c = ['#f2607b','#ffc861','#7fdccb','#f2607b','#ffc861','#7fdccb'][i]; s += '<path d="M' + x + ' ' + y + ' L' + (x + dir * 54) + ' ' + (y + 6) + ' L' + (x + dir * 24) + ' ' + (y + 70) + ' Z" fill="' + c + '"/>'; } return '<path d="M' + x0 + ' ' + y0 + ' Q' + (x0 + dir * 180) + ' ' + (y0 + 80) + ' ' + (x0 + dir * 372) + ' ' + (y0 + 130) + '" stroke="#2f5d62" stroke-width="3" fill="none"/>' + s; };
      var balloon = function(x, y, rx, c){ return '<path d="M' + x + ' ' + (y + rx * 1.2) + ' q-30 60 10 120 q40 60 -10 130" stroke="#2f5d62" stroke-width="3" fill="none"/><ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + (rx * 1.2) + '" fill="' + c + '"/><ellipse cx="' + (x - rx * .35) + '" cy="' + (y - rx * .45) + '" rx="' + (rx * .22) + '" ry="' + (rx * .35) + '" fill="#fff" opacity=".5"/><path d="M' + (x - 10) + ' ' + (y + rx * 1.2 + 14) + ' l10 -16 l10 16 z" fill="' + c + '"/>'; };
      o += '<rect width="840" height="1188" fill="#fdf3e7"/>' + flags(-20, 40, 1) + flags(860, 40, -1) +
        balloon(80, 560, 70, '#ffc861') + balloon(770, 520, 64, '#7fdccb') + balloon(760, 860, 70, '#f2607b') + balloon(70, 930, 60, '#7fdccb') +
        dots([[260,90,9,'#ffc861'],[580,130,7,'#f2607b'],[200,330,8,'#7fdccb'],[650,350,9,'#f2607b'],[200,1160,8,'#f2607b'],[650,1165,8,'#ffc861']]) +
        T(420, 260, 'YOU’RE INVITED TO', {size:30, fill:'#2f5d62', ls:4}) +
        T(420, 360, d.name ? who : 'A very squishy', {size:92, font:F_DISPLAY, italic:true, weight:600, fill:'#e0476e', fit:600, k:.5}) +
        T(420, 440, (d.age ? d.ageLine + ' ' : '') + 'Squishy Party', {size:58, font:F_DISPLAY, italic:true, weight:600, fill:'#e0476e', fit:620, k:.48}) +
        handArt(420, 680, .92, u, {j1:'#ffb3cf', j2:'#8fd9ff', edge:'#e0476e', cuff:'#7fdccb', lines:'#2f5d62', word:'#ffc861', wordStroke:'#2f5d62'}) +
        '<line x1="250" y1="890" x2="590" y2="890" stroke="#2f5d62" stroke-width="2"/>' + T(420, 942, d.dateLine.toUpperCase(), {size:34, fill:'#2f5d62', fit:560}) + '<line x1="250" y1="972" x2="590" y2="972" stroke="#2f5d62" stroke-width="2"/>' +
        T(420, 1024, d.venue.toUpperCase(), {size:26, fill:'#2f5d62', fit:560}) + T(420, 1094, d.timeLine.toUpperCase(), {size:58, weight:900, fill:'#2f5d62', fit:560, k:.62}) +
        (d.rsvp ? T(420, 1140, 'RSVP ' + d.rsvp, {size:22, fill:'#e0476e', fit:520}) : '');
    } else if (tpl === 'sparkle') {
      o += '<defs><linearGradient id="' + u + 'bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bba7ff"/><stop offset=".55" stop-color="#e6c6ff"/><stop offset="1" stop-color="#ffc4e1"/></linearGradient><radialGradient id="' + u + 'disco" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#d8ccff"/><stop offset="1" stop-color="#9c8ae6"/></radialGradient></defs>' +
        '<rect width="840" height="1188" fill="url(#' + u + 'bg)"/>' +
        '<line x1="420" y1="0" x2="420" y2="60" stroke="#ffffff" stroke-width="3"/><circle cx="420" cy="150" r="90" fill="url(#' + u + 'disco)"/>';
      for (var gx = -2; gx <= 2; gx++) o += '<ellipse cx="420" cy="150" rx="' + Math.abs(gx * 22 + .1) + '" ry="90" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="2"/>';
      for (var gy = -3; gy <= 3; gy++) { var yy = 150 + gy * 24, hw = Math.sqrt(Math.max(0, 8100 - (gy * 24) * (gy * 24))); o += '<line x1="' + (420 - hw) + '" y1="' + yy + '" x2="' + (420 + hw) + '" y2="' + yy + '" stroke="#ffffff" stroke-opacity=".55" stroke-width="2"/>'; }
      o += [[110,120,26],[720,170,32],[160,420,18],[700,450,22],[90,760,20],[760,720,26],[640,1130,18],[180,1120,22]].map(function(s0){ return star4(s0[0], s0[1], s0[2], '#ffffff'); }).join('') +
        T(420, 290, 'JOIN US TO CELEBRATE!', {size:32, fill:'#5b3fa8', ls:3}) +
        handArt(420, 540, .98, u, {j1:'#ffb3dd', j2:'#a08bff', edge:'#5b3fa8', cuff:'#f06aa8', lines:'#ffffff', word:'#ffffff', wordStroke:'#5b3fa8'}) +
        '<path d="M70 700 L150 700 L130 740 L150 780 L70 780 Z" fill="#d94d8f"/><path d="M770 700 L690 700 L710 740 L690 780 L770 780 Z" fill="#d94d8f"/><rect x="120" y="684" width="600" height="112" rx="14" fill="#f06aa8"/>' +
        T(420, 762, (d.name ? who : 'YOU’RE INVITED').toUpperCase(), {size:72, font:F_DISPLAY, weight:700, fill:'#ffffff', fit:540, k:.62}) +
        T(420, 866, (d.age ? d.ageLine + ' ' : '') .toUpperCase() + 'SQUISHY PARTY', {size:46, font:F_DISPLAY, weight:600, fill:'#5b3fa8', fit:700, k:.6}) +
        '<line x1="300" y1="912" x2="300" y2="1000" stroke="#5b3fa8" stroke-width="2"/><line x1="540" y1="912" x2="540" y2="1000" stroke="#5b3fa8" stroke-width="2"/>' +
        T(190, 968, d.dayLine.toUpperCase(), {size:28, fill:'#d94d8f', fit:200}) + T(420, 972, d.dayDate.toUpperCase(), {size:46, font:F_DISPLAY, weight:700, fill:'#5b3fa8', fit:220, k:.6}) + T(650, 968, d.startLine.toUpperCase(), {size:28, fill:'#d94d8f', fit:200}) +
        T(420, 1062, d.venue.toUpperCase(), {size:26, fill:'#4a3590', fit:680}) + (d.rsvp ? T(420, 1104, 'RSVP: ' + d.rsvp, {size:24, weight:600, fill:'#4a3590', fit:680}) : '');
    } else {
      var rays = function(cx, cy){ var s = ''; for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; s += '<path d="M' + cx + ' ' + cy + ' L' + (cx + Math.cos(a) * 170) + ' ' + (cy + Math.sin(a) * 170) + ' L' + (cx + Math.cos(a + .14) * 170) + ' ' + (cy + Math.sin(a + .14) * 170) + ' Z" fill="#fff4ea" opacity=".85"/>'; } return s; };
      o += '<rect width="840" height="1188" fill="#f7c6cc"/>' + rays(0, 0) + rays(840, 0) +
        '<path d="M330 0 L510 0 L470 70 L420 30 L370 70 Z" fill="#f9e7b5"/><path d="M0 860 Q220 780 440 850 T840 820 L840 1188 L0 1188 Z" fill="#8fcfcf"/>' +
        T(420, 168, 'BIRTHDAY SQUISHY PARTY', {size:30, fill:'#fff4ea', ls:6, fit:720}) +
        T(420, 290, d.name || 'Someone', {size:128, font:F_DISPLAY, weight:800, italic:true, fill:'#4a2a1f', fit:700, k:.52}) +
        T(420, 360, d.age ? 'IS TURNING' : 'IS HAVING A PARTY', {size:38, fill:'#4a2a1f', ls:6}) +
        '<path d="M290 620 q-20 60 20 110 q30 50 -10 110" stroke="#4a2a1f" stroke-width="3" fill="none"/><ellipse cx="290" cy="520" rx="112" ry="128" fill="#fbe48a"/><path d="M280 646 l10 -14 l10 14 z" fill="#fbe48a"/><ellipse cx="250" cy="470" rx="22" ry="36" fill="#fff" opacity=".45"/>' +
        T(290, 572, d.age || '★', {size:150, font:F_DISPLAY, weight:800, fill:'#4a2a1f'}) +
        handArt(580, 600, .78, u, {j1:'#ffc2d6', j2:'#8fcfcf', edge:'#4a2a1f', cuff:'#f2a65a', lines:'#4a2a1f', word:'#fbe48a', wordStroke:'#4a2a1f'}) +
        T(420, 958, d.dateLine.toUpperCase(), {size:40, fill:'#ffffff', fit:720}) + T(420, 1012, 'START ' + d.startLine.toUpperCase(), {size:36, fill:'#ffffff', ls:2}) +
        T(420, 1066, d.venue.toUpperCase(), {size:24, fill:'#ffffff', fit:700}) + (d.rsvp ? T(420, 1104, 'RSVP ' + d.rsvp.toUpperCase(), {size:24, fill:'#ffffff', fit:700}) : '');
    }
    return o + '</svg>';
  }
  function ordinal(n){ n = +n; var s = (n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({1:'st',2:'nd',3:'rd'}[n % 10] || 'th'); return n + s; }
  function invData(s){
    var dt = s.date ? new Date(s.date + 'T00:00') : null;
    return {
      name: s.childName, age: s.childAge, ageLine: s.childAge ? ordinal(s.childAge) + ' Birthday' : 'Birthday',
      dateLine: dt ? dt.toLocaleDateString('en-SG', {weekday:'long', day:'numeric', month:'long'}) : 'Date to be confirmed',
      dayLine: dt ? dt.toLocaleDateString('en-SG', {weekday:'long'}) : 'Date', dayDate: dt ? dt.toLocaleDateString('en-SG', {month:'short', day:'numeric'}) : 'TBC',
      timeLine: s.time ? clock(s.time, 0) + ' – ' + clock(s.time, s.length) : 'Time to be confirmed', startLine: s.time ? 'at ' + clock(s.time, 0) : 'time TBC',
      venue: s.venue || 'Venue to be confirmed', rsvp: s.rsvp
    };
  }
  function makeCaption(s){
    var e = EXP[s.experience], d = invData(s), sel = s.selected.map(function(id){ return BYID[id]; });
    var who = s.childName ? s.childName + '’s ' : 'a ';
    var lines = ['🎉 You’re invited to ' + who + (s.childAge ? ordinal(s.childAge) + ' birthday ' : 'birthday ') + 'Squishy Party! 🎉', ''];
    lines.push('📅 ' + d.dateLine); lines.push('⏰ ' + d.timeLine); lines.push('📍 ' + d.venue); lines.push('');
    var make = s.experience === 'both' ? 'their very own Jelly and Crunchy squishies' : 'their very own ' + e.name + ' squishy';
    lines.push('Every little guest gets to make ' + make + ' and decorate a take-home squishy capsule with rhinestone stickers ✨' + (s.wax ? ' Then we’ll crack open colourful wax shells to reveal them!' : ''));
    var extras = [];
    sel.forEach(function(p){
      if (p.cat === 'entertainment') extras.push(p.name.replace(/,.*$/, '').toLowerCase());
      if (p.cat === 'food' && extras.indexOf('party food') < 0) extras.push('party food');
      if (p.cat === 'styling' && p.id === 's-backdrop') extras.push('a balloon photo backdrop');
      if (p.cat === 'styling' && p.id === 's-favours') extras.push('party favour bags');
      if (p.cat === 'cake') extras.push('a birthday ' + (/cupcake/i.test(p.name) ? 'cupcake treat' : 'cake') + ' from ' + p.vendor);
    });
    if (extras.length) lines.push('There’ll also be ' + (extras.length > 1 ? extras.slice(0, -1).join(', ') + ' and ' + extras[extras.length - 1] : extras[0]) + ' 🎂');
    lines.push('');
    if (s.rsvp) { var by = ''; if (s.date) { var r = new Date(s.date + 'T00:00'); r.setDate(r.getDate() - 7); by = ' by ' + r.toLocaleDateString('en-SG', {day:'numeric', month:'short'}); } lines.push('Please RSVP to ' + s.rsvp + by + '.'); }
    lines.push('See you there! 💖');
    return lines.join('\n');
  }

  var invTimer = null, lastCanvas = null;
  function drawInvite(){
    clearTimeout(invTimer);
    invTimer = setTimeout(function(){
      var d = invData(S);
      // thumbnails
      $('tpl-grid').querySelectorAll('[data-tpl]').forEach(function(b){ var id = b.dataset.tpl; b.querySelector('.tpl-art').innerHTML = invSVG(id, d, 'th' + id); b.setAttribute('aria-checked', String(S.tpl === id)); b.tabIndex = S.tpl === id ? 0 : -1; });
      var svg = invSVG(S.tpl, d, 'big'), img = new Image(), out = $('inv-img');
      img.onload = function(){
        var c = document.createElement('canvas'); c.width = 1240; c.height = 1754;
        var x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
        try { out.src = c.toDataURL('image/png'); lastCanvas = c; } catch (err) { out.src = img.src; lastCanvas = null; }
      };
      img.onerror = function(){ out.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); lastCanvas = null; };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      if (!S.captionEdited) $('inv-caption').value = makeCaption(S);
      $('wa-link').href = 'https://wa.me/?text=' + encodeURIComponent($('inv-caption').value);
    }, 90);
  }
  function invFileName(){ return (S.childName ? S.childName.replace(/[^\w-]+/g, '-') + '-' : '') + 'squishy-party-invitation.png'; }
  function invStatus(msg){ put('copy-status', msg); }
  function withBlob(cb){ if (!lastCanvas || !lastCanvas.toBlob) { invStatus('Long-press or right-click the invitation to save or copy it.'); return; } lastCanvas.toBlob(function(b){ b ? cb(b) : invStatus('Long-press or right-click the invitation to save or copy it.'); }, 'image/png'); }
  function buildInvite(){
    var grid = $('tpl-grid');
    TEMPLATES.forEach(function(t){
      var b = el('button','tpl'); b.type = 'button'; b.setAttribute('role','radio'); b.dataset.tpl = t.id;
      b.appendChild(el('span','tpl-art')); b.appendChild(el('span','tpl-name', t.name));
      b.addEventListener('click', function(){ S.tpl = t.id; track('invite_design_selected', {design:t.id}); drawInvite(); });
      b.addEventListener('keydown', function(e){ var i = TEMPLATES.findIndex(function(x){ return x.id === S.tpl; }), n = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!n) return; e.preventDefault(); S.tpl = TEMPLATES[(i + n + TEMPLATES.length) % TEMPLATES.length].id; drawInvite(); setTimeout(function(){ grid.querySelector('[data-tpl="' + S.tpl + '"]').focus(); }, 120); });
      grid.appendChild(b);
    });
    $('child-name').addEventListener('input', function(e){ S.childName = e.target.value.trim(); render(false); drawInvite(); });
    $('child-age').addEventListener('input', function(e){ var n = parseInt(e.target.value, 10); S.childAge = n >= 1 && n <= 18 ? String(n) : ''; render(false); drawInvite(); });
    $('inv-rsvp').addEventListener('input', function(e){ S.rsvp = e.target.value.trim(); drawInvite(); });
    $('inv-caption').addEventListener('input', function(){ S.captionEdited = true; $('cap-reset').hidden = false; $('wa-link').href = 'https://wa.me/?text=' + encodeURIComponent($('inv-caption').value); });
    $('cap-reset').addEventListener('click', function(){ S.captionEdited = false; $('cap-reset').hidden = true; drawInvite(); });
    $('copy-caption').addEventListener('click', function(){
      track('caption_copied', {design:S.tpl});
      var t = $('inv-caption').value, done = function(ok){ invStatus(ok ? 'Caption copied. Paste it into WhatsApp with the invitation image.' : 'Couldn’t copy here. Select the caption text to copy it.'); };
      try { navigator.clipboard.writeText(t).then(function(){ done(true); }, function(){ $('inv-caption').select(); done(false); }); } catch (e) { $('inv-caption').select(); done(false); }
    });
    $('wa-link').addEventListener('click', function(){ track('whatsapp_opened', {design:S.tpl}); });
    $('inv-download').addEventListener('click', function(){
      track('invitation_saved', {design:S.tpl});
      withBlob(function(b){ try { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = invFileName(); document.body.appendChild(a); a.click(); a.remove(); S.done.invite = true; render(false); invStatus('Invitation saved as an A4 image, and “Send invitations” is ticked. Send it on WhatsApp with the caption below.'); } catch (e) { invStatus('Long-press or right-click the invitation to save it.'); } });
    });
    $('inv-share').addEventListener('click', function(){
      withBlob(function(b){
        var f; try { f = new File([b], invFileName(), {type:'image/png'}); } catch (e) {}
        if (f && navigator.canShare && navigator.canShare({files:[f]})) navigator.share({files:[f], text:$('inv-caption').value}).then(function(){ track('invitation_shared', {design:S.tpl}); S.done.invite = true; render(false); invStatus('Shared. We’ve ticked “Send invitations” on your to-do list.'); }, function(){});
        else invStatus('Sharing isn’t available in this browser. Save the image, then send it on WhatsApp with the caption.');
      });
    });
    $('inv-copyimg').addEventListener('click', function(){
      withBlob(function(b){ try { navigator.clipboard.write([new ClipboardItem({'image/png': b})]).then(function(){ invStatus('Image copied. Paste it straight into a WhatsApp chat.'); }, function(){ invStatus('Couldn’t copy the image here. Save it instead, or long-press it.'); }); } catch (e) { invStatus('Couldn’t copy the image here. Save it instead, or long-press it.'); } });
    });
    drawInvite();
  }

  /* ================= TO-DO LIST ================= */
  function renderTodo(s, T){
    var cake = s.selected.map(function(id){ return BYID[id]; }).filter(function(p){ return p.cat === 'cake'; })[0];
    var food = s.selected.map(function(id){ return BYID[id]; }).filter(function(p){ return p.cat === 'food'; })[0];
    var dt = s.date ? new Date(s.date + 'T00:00').toLocaleDateString('en-SG', {weekday:'short', day:'numeric', month:'short'}) : '';
    var items = [
      {id:'date', auto:true, done:!!s.date && s.timeOk, t:s.date ? 'Date set: ' + dt : 'Pick a date and time', sub:s.date ? (s.time ? range(s.time, 0, s.length) : '') : 'We need it to check our team’s availability', act:s.date ? null : ['Add a date', 1]},
      {id:'venue', t:'Book your venue', sub:s.venue ? s.venue + '. Tick when it’s confirmed.' : 'Add the venue in step 1, then tick when it’s booked', act:s.venue ? null : ['Add venue', 1]},
      {id:'cake', auto:!!cake, done:!!cake || !!S.done.cake, t:cake ? 'Cake chosen: ' + cake.vendor : 'Choose a cake', sub:cake ? cake.name + '. Size and flavour confirmed in your quote.' : 'Add one from our partner bakeries, or tick if you’re bringing your own', act:cake ? null : ['Browse cakes', 3, 'tab-a-cake']},
      {id:'food', auto:!!food, done:!!food || !!S.done.food, t:food ? 'Food chosen' : 'Sort out party food', sub:food ? food.name : 'Add catering from our partners, or tick if you’re arranging it', act:food ? null : ['Browse food', 3, 'tab-a-food']},
      {id:'invite', t:'Send invitations', sub:'Pick a design and share it on WhatsApp with the ready-made caption', act:['Make invitation', 4, 'tab-p-inv']},
      {id:'request', auto:true, done:!!S.requested, t:'Request availability', sub:'We confirm every partner and send you one quotation', act:['Go to request', 5]},
      {id:'tables', t:'Arrange tables and chairs', sub:'Your coordinator confirms how many for ' + s.children + ' children'},
      {id:'headcount', t:'Confirm the final headcount', sub:'About ' + s.children + ' children and ' + s.adults + ' adults so far'},
      {id:'diet', t:'Share dietary needs', sub:'Tell your coordinator once you’ve requested availability'}
    ];
    items.forEach(function(x){ if (!x.auto) x.done = !!S.done[x.id]; });
    var done = items.filter(function(x){ return x.done; }).length, todo = items.filter(function(x){ return !x.done; }), ordered = todo.concat(items.filter(function(x){ return x.done; }));
    put('todo-count', done + '/' + items.length);
    $('todo-fill').style.width = Math.round(done / items.length * 100) + '%';
    var tb = $('todo-badge'); if (tb) { tb.textContent = todo.length; tb.dataset.n = todo.length; }
    put('todo-sub', todo.length ? 'Next up: ' + todo[0].t : 'All done. Time to party!');
    var ol = $('todo-list'); ol.textContent = '';
    ordered.forEach(function(x, i){
      var li = el('li','todo-item' + (x.done ? ' done' : '') + (!x.done && x === todo[0] ? ' next' : ''));
      if (x.auto) { var st = el('span','todo-auto'); st.appendChild(icon(x.done ? 'i-check' : 'i-hourglass')); st.appendChild(el('span','vh', x.done ? 'Done' : 'Not done yet')); li.appendChild(st); }
      else { var lab = el('label','todo-check'), cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = x.done; cb.dataset.todo = x.id; cb.setAttribute('aria-label', 'Mark “' + x.t + '” as done'); lab.appendChild(cb); var bx = el('span','todo-box'); bx.appendChild(icon('i-check')); lab.appendChild(bx); li.appendChild(lab); }
      var body = el('div','todo-body'), h = el('b', null, x.t);
      if (!x.done && x === todo[0]) h.appendChild(el('span','todo-next','Next up'));
      if (x.auto && x.done) h.appendChild(el('span','todo-autotag','Done in your plan'));
      body.appendChild(h); if (x.sub) body.appendChild(el('small', null, x.sub)); li.appendChild(body);
      if (x.act && !x.done) { var a = el('button','todo-act'); a.type = 'button'; a.dataset.go = x.act[1]; if (x.act[2]) a.dataset.tab = x.act[2]; a.appendChild(document.createTextNode(x.act[0] + ' ')); a.appendChild(icon('i-arrow')); li.appendChild(a); }
      ol.appendChild(li);
    });
    // our team + waiting (collapsed)
    var team = ['Squishy DIY hosts and all materials: ' + EXP[s.experience].name + ' for ' + s.children + ' children', 'A squishy capsule and rhinestone stickers for every child', 'For a birthday girl: a Birthday Girl sash and tiara to wear during the party (we take them back after)', 'One-time travel and 15-minute set-up, then pack-down'];
    if (s.selected.length) team.push('Booking and coordinating ' + s.selected.length + ' partner service' + (s.selected.length > 1 ? 's' : ''));
    team.push('One consolidated quotation', 'A coordinator on the day');
    var wait = ['Our team’s availability' + (dt ? ' on ' + dt : '')];
    s.selected.forEach(function(id){ var p = BYID[id]; wait.push(p.vendor + ': ' + p.name); });
    function fillMini(id, arr){ var ul = $(id); ul.textContent = ''; arr.forEach(function(t){ ul.appendChild(el('li', null, t)); }); }
    fillMini('list-team', team); fillMini('list-wait', wait);
    put('team-count', team.length + ' items'); put('wait-count', wait.length + (wait.length === 1 ? ' item' : ' items'));
  }

  /* ================= RENDER ================= */
  function render(announce, msg){
    var s = S, n = billable(s.children), R = recommend(s);
    var hasB = s.budgetCents != null, shown = s.started;
    var T = totals(s), exp = EXP[s.experience];

    var exp0 = EXP[s.experience];
    // step 1
    var perChild = Math.round((s.budgetCents || 0) / s.children);
    var perGuest = Math.round((s.budgetCents || 0) / (s.children + s.adults));
    if (!hasB) { put('budget-alt-label','Add a budget'); put('budget-alt', '—'); put('budget-alt-sub','to see it per child and per guest'); put('budget-label', s.budgetMode === 'total' ? 'Your budget for the whole party' : 'Your budget per child, for the whole party'); }
    else if (s.budgetMode === 'total') { put('budget-alt-label','About'); put('budget-alt', money(perChild)); put('budget-alt-sub','per child · ' + money(perGuest) + ' per guest incl. ' + s.adults + ' adults'); put('budget-label','Your budget for the whole party'); }
    else { put('budget-alt-label','Whole-party budget'); put('budget-alt', money(s.budgetCents)); put('budget-alt-sub','for ' + s.children + ' children and ' + s.adults + ' adults'); put('budget-label','Your budget per child, for the whole party'); }
    // step 2
    ['both','jelly','crunchy'].forEach(function(e){ put('price-' + e, short(EXP[e].pax)); });
    var dup = s.experience === 'both', COPY = { both:'Make both textures: a smooth Jelly and a satisfying Crunchy. Both go home in a squishy capsule they decorate with our rhinestone stickers.', jelly:'Smooth, clear and endlessly squishable. It goes home in a squishy capsule they decorate with our rhinestone stickers.', crunchy:'Extra texture and that satisfying crunch. It goes home in a squishy capsule they decorate with our rhinestone stickers.' };
    put('exp-chosen', exp0.name); put('exp-title', exp0.name); put('exp-pp', short(exp0.pax));
    put('exp-eyebrow', dup ? 'Best value · two squishies each' : 'One squishy each');
    put('exp-copy', COPY[s.experience]); put('exp-n', s.children);
    var fl = $('exp-feats'); fl.textContent = '';
    [dup ? 'Two squishies each' : 'One ' + exp0.name + ' squishy each', 'Take-home squishy capsule', 'DIY rhinestone stickers', '45 minutes of guided play', 'Birthday Girl sash & tiara to wear on the day'].forEach(function(t){ var li = el('li'); li.appendChild(icon('i-check')); li.appendChild(document.createTextNode(t)); fl.appendChild(li); });
    var expSum = exp0.pax * n + CONTAINER * n + (s.wax ? waxCents(s.experience, n) : 0) + LOGISTICS;
    put('pl-n', n); put('pl-diy', money((exp0.pax + CONTAINER) * n));
    put('pl-sub', short(exp0.pax) + ' ' + (dup ? 'Duo' : exp0.name) + ' + $2 squishy capsule, per child' + (s.children < MIN_PAX ? ' (minimum 10)' : ''));
    put('wax-title', dup ? 'Wax Cracking duo deal!' : 'Wax Cracking');
    $('exp-panel').classList.toggle('is-duo', dup);
    renderHow(s.experience);
    if (put('exp-total', money(expSum))) { var et = $('exp-total'); et.classList.remove('bump'); void et.offsetWidth; et.classList.add('bump'); }
    put('wax-quantity', dup ? (n * 2) + ' squishies, two per child, at $2.50 each' : (n * exp0.per) + ' squishies to crack, one per child');
    put('wax-price', '+' + money(waxCents(s.experience, n)).replace('.00',''));
    var up = $('wax-up'); up.hidden = !dup; if (dup) put('wax-up', 'U.P. ' + money(300 * n * 2).replace('.00',''));
    put('tier-note', s.children < MIN_PAX ? 'Minimum 10 children: for ' + s.children + ' we charge for 10, and spare materials are yours to keep.' : 'Minimum 10 children.');

    // step 3: recommendation
    var rl = $('rec-list'); rl.textContent = '';
    function recRow(ic, title, sub, amt, cls, demo){ var r = el('div','rec-row' + (cls ? ' ' + cls : '')), i = el('span','ri'); i.appendChild(icon(ic)); r.appendChild(i); var t = el('div'), b = el('b', null, title); if (demo) b.appendChild(el('span','tagmini','Demo price')); t.appendChild(b); if (sub) t.appendChild(el('small', null, sub)); r.appendChild(t); r.appendChild(el('span','amt', amt)); rl.appendChild(r); }
    var foundSum = T.found.reduce(function(a, f){ return a + f.cents; }, 0);
    put('ma-title', 'Squishy DIY total'); put('ma-sub', EXP[s.experience].name + ' · ' + s.children + ' children' + (s.wax ? ' · with Wax Cracking' : '')); put('ma-total', money(foundSum));
    var mb = $('ma-break'); mb.textContent = ''; T.found.forEach(function(f){ var li = el('li'); li.appendChild(el('span', null, f.sub)); li.appendChild(el('span', null, money(f.cents))); mb.appendChild(li); });
    R.picks.forEach(function(id){ var p = BYID[id], c = CATS.filter(function(x){ return x.id === p.cat; })[0], cc = costFor(p, s); recRow(c.icon, p.name + (p.cat === 'cake' ? ' by ' + p.vendor : ''), cc == null ? 'Suggested · ' + (R.left > 0 ? money(R.left) + ' of your budget left for it' : 'priced in your quotation') : p.vendor + ' · suggested', cc == null ? 'On quote' : money(cc), '', p.status === 'demo'); });
    R.missed.slice(0, 2).forEach(function(m){ var c = CATS.filter(function(x){ return x.id === m.p.cat; })[0]; recRow(c.icon, m.p.name, 'Add ' + money(m.short) + ' to your budget to include this', 'Not in budget', 'miss'); });
    if (!hasB) recRow('i-wallet', 'Add your budget in step 1', 'We’ll suggest styling, activities and cake that fit what’s left after Squishy DIY.', '', 'miss');
    var over = hasB && s.budgetCents < R.base;
    $('budget-warn').hidden = !over;
    if (over) put('budget-warn-text', 'Your budget is ' + money(R.base - s.budgetCents) + ' below the required Squishy DIY foundation of ' + money(R.base) + '. Try Jelly, skip Wax Cracking or raise the budget.');
    var missing = R.picks.filter(function(id){ return s.selected.indexOf(id) < 0; });
    put('rec-state', 'Squishy DIY ' + money(foundSum) + (!hasB ? ' · add a budget for suggestions' : ' · ' + R.picks.length + ' suggestion' + (R.picks.length === 1 ? '' : 's')));
    $('use-rec').hidden = !missing.length;
    put('use-rec', missing.length === R.picks.length ? 'Add all ' + missing.length + ' suggestions' : 'Add the other ' + missing.length + ' suggestion' + (missing.length === 1 ? '' : 's'));

    // cards
    P.forEach(function(p){
      var c = cardEls[p.id]; if (!c) return;
      var on = s.selected.indexOf(p.id) >= 0, cost = costFor(p, s), q = qtyFor(p, s);
      c.card.classList.toggle('on', on);
      c.add.setAttribute('aria-pressed', String(on));
      c.add.textContent = on ? 'Added ✓' : '+ Add';
      c.add.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + p.name + (on ? ' from' : ' to') + ' celebration');
      c.basis.textContent = p.price == null ? basisLabel(p) + ' · not in the estimate' : (p.basis === 'child' || p.basis === 'pax' ? basisLabel(p) + ' · ' + money(cost) + ' for ' + q : basisLabel(p)) + (p.status === 'demo' ? ' · Demo price' : '');
      c.rec.hidden = R.picks.indexOf(p.id) < 0;
    });
    syncStores(R);

    // summary
    put('summary-exp', exp.short); put('summary-children', s.children); put('summary-adults', s.adults); put('summary-length', lengthLabel(s.length));
    put('squishy-count', s.children * exp.per); put('partner-count', s.selected.length);
    var bd = $('breakdown'); bd.textContent = '';
    function row(dt, dd, cls, ddcls){ var d = el('div', cls); d.appendChild(el('dt', null, dt)); d.appendChild(el('dd', ddcls, dd)); bd.appendChild(d); }
    bd.appendChild(el('div','grp','Main activity'));
    row('Squishy DIY total', money(T.found.reduce(function(a, f){ return a + f.cents; }, 0)));
    T.found.forEach(function(f){ row(f.sub, money(f.cents), 'bd-sub'); });
    if (T.partners.length) { bd.appendChild(el('div','grp','Partner services')); T.partners.forEach(function(x){ row((x.p.cat === 'cake' ? x.p.vendor + ': ' + x.p.name : x.p.name) + (x.p.basis === 'child' || x.p.basis === 'pax' ? ', ' + x.qty : '') + (x.p.status === 'demo' ? ' (demo price)' : ''), x.cents == null ? 'On quote' : money(x.cents), null, x.cents == null ? 'pend' : null); }); }
    $('pending-note').hidden = !T.pending.length || !shown;
    if (T.pending.length) put('pending-note', 'Not yet in your total: ' + T.pending.map(function(p){ return p.vendor + ' ' + p.name; }).join(', ') + '. Cake prices depend on size and flavour, so we add it to your quotation' + (hasB && s.budgetCents > T.total ? ', with ' + money(s.budgetCents - T.total) + ' of your budget still free for it.' : '.'));
    var totalTxt = shown ? money(T.total) + (T.pending.length ? '+' : '') : '—';
    put('total-price', totalTxt);
    put('per-child', shown ? money(Math.round(T.total / s.children)) : '—');
    $('meter-wrap').hidden = !(shown && hasB); $('sum-acc').hidden = !shown; $('summary-hint').hidden = shown;
    var pct = !hasB ? 0 : s.budgetCents > 0 ? Math.min(100, T.total / s.budgetCents * 100) : 100, isOver = T.total > s.budgetCents;
    $('meter-fill').style.width = pct + '%'; $('meter').classList.toggle('over', isOver);
    if (hasB) put('meter-label', short(T.total) + ' of ' + short(s.budgetCents));
    if (hasB) put('meter-note', isOver ? money(T.total - s.budgetCents) + ' over your budget' : money(s.budgetCents - T.total) + ' of your budget left');

    // included
    put('child-squishy-title', s.experience === 'both' ? 'Two take-home squishies' : 'A take-home ' + exp.name + ' squishy');
    put('child-squishy-copy', s.experience === 'both' ? 'One Jelly and one Crunchy creation each, made in a 45-minute guided session.' : 'One ' + exp.name + ' creation each, made in a 45-minute guided session.');

    // schedule
    var blocks = [
      {m:10, t:'Welcome & arrivals', c:'Guests arrive while our squishy station is ready to go.'},
      {m:PLAY_MIN, t:s.experience === 'both' ? 'Squishy DIY: both textures' : 'Squishy DIY: ' + exp.name, c:'Guided making, then decorating their squishy capsule with rhinestone stickers' + (s.wax ? ', finished with Wax Cracking.' : '.'), cls:'sq'}
    ];
    var slotted = {}; s.selected.forEach(function(id){ var p = BYID[id]; if (p.slot && !slotted[p.slot.title]) { slotted[p.slot.title] = 1; blocks.push({m:p.slot.min, t:p.slot.title, c:p.slot.copy, cls:'food'}); } else if (p.slot && slotted[p.slot.title]) { blocks.filter(function(b){ return b.t === p.slot.title; })[0].c += ' Plus ' + p.name.toLowerCase() + '.'; } });
    var hasCake = s.selected.some(function(id){ return BYID[id].cat === 'cake'; });
    var finale = {m:20, t:'Birthday finale', c:hasCake ? 'Cake, candles, birthday song and group photo.' : 'Birthday spotlight, song and group photo.'};
    var used = blocks.reduce(function(a, b){ return a + b.m; }, 0) + finale.m, free = s.length - used;
    if (free >= 10) blocks.push({m:free, t:'Free play & photos', c:'Time to squish, mingle and take photos.', cls:'free'});
    blocks.push(finale);
    var tl = $('timeline'); tl.textContent = ''; tl.style.setProperty('--n', blocks.length + 1 <= 6 ? blocks.length + 1 : 4); var at = 0;
    var pre = el('li','free'), ps0 = clock(s.time, -SETUP_MIN); pre.appendChild(el('span','time', ps0 ? range(s.time, -SETUP_MIN, 0) : 'Before guests')); pre.appendChild(el('h3', null, 'Our team sets up')); pre.appendChild(el('p', null, '15 minutes to set up the squishy station before guests arrive.')); tl.appendChild(pre);
    blocks.forEach(function(b){ var li = el('li', b.cls), a = clock(s.time, at), z = clock(s.time, at + b.m); li.appendChild(el('span','time', a ? range(s.time, at, at + b.m) : at + '–' + (at + b.m) + ' min')); li.appendChild(el('h3', null, b.t)); li.appendChild(el('p', null, b.c)); tl.appendChild(li); at += b.m; });
    put('programme-description', (s.time ? range(s.time, 0, s.length) + ', ' : '') + lengthLabel(s.length) + ' at ' + (s.venue || 'your venue') + ', with ' + exp.name + (s.wax ? ', Wax Cracking' : '') + (s.selected.length ? ' and ' + s.selected.length + ' partner service' + (s.selected.length > 1 ? 's' : '') : '') + '. Our team is on site for up to 2 hours: 15 minutes of setup, 45 minutes of squishy play, then pack-down.');
    var al = $('alongside'); al.textContent = ''; var alongs = s.selected.map(function(id){ return BYID[id]; }).filter(function(p){ return p.along; });
    al.hidden = !alongs.length;
    if (alongs.length) { al.appendChild(el('span', null, 'Running alongside:')); alongs.forEach(function(p){ al.appendChild(el('span','tag', p.along)); }); }
    $('prog-warn').hidden = used <= s.length;
    if (used > s.length) put('prog-warn', 'Your choices need about ' + used + ' minutes. Choose a longer party, or remove a timed item such as the magic show.');
    if (s.length > 120 && used <= s.length) { $('prog-warn').hidden = false; put('prog-warn', 'The $150 logistics fee covers our team for up to 2 hours. For a longer party, our team leaves after pack-down and your other partners carry on.'); }

    // to-do list + invitation
    renderTodo(s, T);
    if ($('tpl-grid').childNodes.length) drawInvite();

    // request step: deposit + fields prefilled from the plan (kept in sync both ways)
    var squishyTotal = T.found.reduce(function(a, f){ return a + f.cents; }, 0), dep = Math.round(squishyTotal / 2);
    var hold = Math.round(squishyTotal / 10); S.holdCents = hold;
    put('hold-amount', money(hold)); put('hold-note', money(hold)); put('dep-sub', '10% of your Squishy DIY total of ' + money(squishyTotal) + '. Refunded in full if we’re unable to attend; deducted from your full amount if you go ahead.');
    [['req-date', s.date], ['req-time', s.time], ['req-end', s.end], ['req-address', s.venue], ['req-spot', s.spot], ['req-postal', s.postal]].forEach(function(p){ var e = $(p[0]); if (e && document.activeElement !== e && e.value !== (p[1] || '')) e.value = p[1] || ''; if (e) e.classList.toggle('prefilled', !!e.value); });
    S.depositCents = dep;

    // recap + mobile
    var rc = $('recap-list'); rc.textContent = '';
    [['Children · adults', s.children + ' · ' + s.adults], ['Date', s.date ? new Date(s.date + 'T00:00').toLocaleDateString('en-SG', {day:'numeric', month:'short', year:'numeric'}) : 'Not set'], ['Time', s.time ? clock(s.time, 0) + ', ' + lengthLabel(s.length) : 'Not set'], ['Squishy DIY', exp.name + (s.wax ? ' + Wax' : '')], ['Partner services', s.selected.length ? String(s.selected.length) : 'None'], ['Budget', hasB ? money(s.budgetCents) : 'Not set']].forEach(function(r){ var d = el('div'); d.appendChild(el('dt', null, r[0])); d.appendChild(el('dd', null, r[1])); rc.appendChild(d); });
    put('recap-total', money(T.total) + (T.pending.length ? '+' : ''));
    CATS.forEach(function(c){ var k = s.selected.filter(function(id){ return BYID[id].cat === c.id; }).length, e = $('count-' + c.id); if (e) { e.textContent = k; e.dataset.n = k; } });
    put('theme-meta', {cobalt:'Cobalt', pink:'Pink', lemon:'Lemon'}[s.theme]);
    var rv = $('review-list'); rv.textContent = '';
    function rrow(a, b2, cls){ var d = el('div', cls); d.appendChild(el('dt', null, a)); if (b2 != null) d.appendChild(el('dd', null, b2)); rv.appendChild(d); }
    rrow('Main activity', null, 'grp');
    rrow('Squishy DIY total: ' + EXP[s.experience].name + ', ' + s.children + ' children', money(T.found.reduce(function(a, f){ return a + f.cents; }, 0)), 'rv-main');
    T.found.forEach(function(f){ rrow(f.sub, money(f.cents), 'rv-sub'); });
    if (T.partners.length) { rrow('Add-ons', null, 'grp'); T.partners.forEach(function(x){ rrow((x.p.cat === 'cake' ? x.p.vendor + ': ' + x.p.name : x.p.name) + (x.p.status === 'demo' ? ' (demo price)' : ''), x.cents == null ? 'On quote' : money(x.cents)); }); }
    put('review-total', money(T.total) + (T.pending.length ? '+' : ''));
    put('review-note', (T.pending.length ? 'Cake prices are added to your quotation. ' : '') + (!hasB ? '' : T.total > s.budgetCents ? money(T.total - s.budgetCents) + ' over your budget.' : money(s.budgetCents - T.total) + ' of your budget left.'));
    put('mobile-caption', shown ? s.children + ' children · ' + exp.short + ' · ' + s.selected.length + ' add-on' + (s.selected.length === 1 ? '' : 's') : 'Your estimate starts at step 2');
    put('mobile-price', shown ? money(T.total) + (T.pending.length ? '+' : '') : s.children + ' children · ' + s.adults + ' adults');
    $('mobile-price').classList.toggle('muted-price', !shown);
    if (announce) put('live', (msg ? msg + ' ' : '') + 'Estimated total ' + money(T.total) + (T.pending.length ? ' plus items pending price' : '') + '.');
  }

  /* ================= EVENTS ================= */
  var form = $('party-form');
  form.addEventListener('submit', function(e){ e.preventDefault(); }); // the planner form never submits; pressing Enter in a field must not reload the page
  function readForm(){
    var d = new FormData(form);
    S.children = clamp(d.get('children'), 1, 60);
    $('children-warn').hidden = !(Number(d.get('children')) > 60);
    S.adults = clamp(d.get('adults'), 0, 80);
    var mode = d.get('budgetMode'), raw = String(d.get('budget') || '').trim(), v = raw === '' ? null : Math.max(0, Number(raw) || 0);
    if (mode !== S.budgetMode) { S.budgetMode = mode; if (S.budgetCents != null) $('budget').value = mode === 'child' ? Math.round(S.budgetCents / S.children / 100) : Math.round(S.budgetCents / 100); }
    else S.budgetCents = v == null ? null : Math.round(mode === 'child' ? v * 100 * S.children : v * 100);
    if (mode === 'child' && S.budgetCents != null) S.budgetCents = Math.round((Number($('budget').value) || 0) * 100 * S.children);
    S.date = d.get('date') || ''; S.time = d.get('time') || ''; S.end = d.get('end') || '';
    var a = mins(S.time), b = mins(S.end), ok = a != null && b != null && b > a;
    S.length = ok ? b - a : 120; S.timeOk = ok || a == null || b == null;
    $('time-warn').hidden = S.timeOk; var ei = $('end'); if (S.timeOk) ei.removeAttribute('aria-invalid'); else ei.setAttribute('aria-invalid','true');
    put('time-hint', ok ? lengthLabel(S.length) + ' · Singapore time' : 'Singapore time');
    put('when-meta', S.date || S.venue || ok ? [S.date ? new Date(S.date + 'T00:00').toLocaleDateString('en-SG', {day:'numeric', month:'short'}) : '', ok ? clock(S.time, 0) + '–' + clock(S.time, S.length) : ''].filter(Boolean).join(' · ') || 'Optional for now' : 'Optional for now'); S.venue = (d.get('venue') || '').trim(); S.spot = (d.get('spot') || '').trim(); S.postal = String(d.get('postal') || '').replace(/\D/g, '').slice(0, 6);
    S.theme = d.get('theme'); S.experience = d.get('experience'); S.wax = d.has('wax');
  }
  form.addEventListener('input', function(e){ if (e.target.dataset && e.target.dataset.todo) return; readForm(); render(false); });
  form.addEventListener('change', function(e){
    if (e.target.dataset && e.target.dataset.todo) return; // to-do ticks are handled separately
    if (e.target.name === 'children') e.target.value = S.children;
    if (e.target.name === 'adults') e.target.value = S.adults;
    readForm(); render(true);
    if (e.target.name === 'experience') track('experience_selected', {experience:S.experience});
    if (e.target.name === 'wax') track('wax_toggled', {on:S.wax, experience:S.experience});
    if (e.target.name === 'budget' && S.budgetCents != null && !S.budgetTracked) { S.budgetTracked = true; track('budget_set', {mode:S.budgetMode}); }
  });
  form.querySelectorAll('[data-step]').forEach(function(b){ b.addEventListener('click', function(){ var i = $(b.dataset.step); i.value = clamp(Number(i.value) + Number(b.dataset.d), Number(i.min), Number(i.max)); readForm(); render(true); }); });
  $('use-rec').addEventListener('click', function(){ var pk = recommend(S).picks; track('suggestions_added', {count:pk.length}); pk.forEach(function(id){ if (S.selected.indexOf(id) < 0) S.selected.push(id); }); render(true, 'Suggestions added.'); });

  // The yellow 'offline preview' notice only applies to the offline file, not the live site.
  if (isWeb()) { var pn = $('preview-notice'); if (pn) pn.hidden = true; }
  initHow();
  buildCards();
  buildInvite();
  buildTimeline();
  document.addEventListener('change', function(e){ var id = e.target.dataset && e.target.dataset.todo; if (id) { S.done[id] = e.target.checked; render(false); } });
  document.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('.todo-act'); if (!b) return; go('#plan-' + b.dataset.go); if (b.dataset.tab) { var t = $(b.dataset.tab); if (t) selectTab(t, false); } });
  readForm();
  render(false);

  /* ================= TABS (ARIA, arrow keys) ================= */
  function selectTab(tab, focus){
    var list = tab.closest('[role=tablist]'), tabs = list.querySelectorAll('[role=tab]');
    tabs.forEach(function(t){ var on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; var pnl = $(t.getAttribute('aria-controls')); if (pnl) pnl.hidden = !on; });
    if (focus) tab.focus();
    if (tab.closest('#explore') && tab.getAttribute('aria-selected') === 'true') track('home_tab_viewed', {tab:tab.textContent.trim()});
  }
  document.addEventListener('click', function(e){ var t = e.target.closest('[role=tab]'); if (t) selectTab(t, false); });
  document.addEventListener('keydown', function(e){
    var t = e.target.closest && e.target.closest('[role=tab]'); if (!t) return;
    var tabs = Array.prototype.slice.call(t.closest('[role=tablist]').querySelectorAll('[role=tab]')), i = tabs.indexOf(t), n = null;
    if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length]; else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length]; else if (e.key === 'Home') n = tabs[0]; else if (e.key === 'End') n = tabs[tabs.length - 1];
    if (n) { e.preventDefault(); selectTab(n, true); }
  });
  document.querySelectorAll('[data-bakery-logos]').forEach(function(h){ BAKERIES.forEach(function(v){ h.appendChild(logoEl(v)); }); });

  /* ================= VIEWS + WIZARD (hash routing keeps Back working) ================= */
  var STEPS = ['The basics','Squishy DIY','Add-ons','Your plan','Request'], cur = 1, reached = 1;
  var homeV = $('view-home'), planV = $('view-plan');
  /* Navigation is driven by JS state, not the URL, so it also works inside sandboxed
     previews (srcdoc iframes) where hash links are blocked. History is used when allowed. */
  function canHistory(){ try { return !!(window.history && history.pushState) && location.protocol !== 'about:'; } catch (e) { return false; } }
  function showHome(scrollTarget){
    if (!planV.hidden) track('planner_exited', {at_step:cur, step_name:STEPS[cur - 1]});
    planV.hidden = true; homeV.hidden = false; document.body.classList.remove('planning');
    var t = scrollTarget && document.getElementById(scrollTarget);
    if (t && t.id !== 'top') t.scrollIntoView({behavior:'smooth', block:'start'}); else window.scrollTo(0, 0);
  }
  function showStep(k, focus){
    k = Math.max(1, Math.min(5, k, reached + 1)); reached = Math.max(reached, k);
    if (planV.hidden && !S.openedOnce) { S.openedOnce = true; track('planner_opened'); }
    if (k !== cur || planV.hidden) track('step_viewed', {step:k, step_name:STEPS[k - 1]});
    cur = k;
    if (k >= 2 && !S.started) { S.started = true; render(false); }
    homeV.hidden = true; planV.hidden = false; document.body.classList.add('planning');
    for (var i = 1; i <= 5; i++) $('wstep-' + i).hidden = i !== k;
    $('stepper').querySelectorAll('li').forEach(function(li, i){ li.className = i + 1 < k ? 'done' : i + 1 === k ? 'current' : (i + 1 <= reached ? 'done' : 'locked'); var a = li.querySelector('a'); if (i + 1 === k) a.setAttribute('aria-current','step'); else a.removeAttribute('aria-current'); });
    put('wiz-count', 'Step ' + k + ' of 5'); put('wiz-name', STEPS[k - 1]);
    $('wiz-back').lastChild.textContent = k === 1 ? 'Home' : 'Back';
    var nx = $('wiz-next'), nm = $('wiz-next-m');
    nx.hidden = k === 5; nx.firstChild.textContent = k < 5 ? 'Next: ' + STEPS[k] + ' ' : '';
    nm.textContent = k < 5 ? 'Next' : 'Send request'; nm.hidden = k === 5 && !!S.requested;
    window.scrollTo(0, 0);
    var h = $('ws' + k + '-h'); if (h && focus) h.focus({preventScroll:true});
  }
  function go(target, push){
    var m = /^#?plan-([1-5])$/.exec(target || '');
    if (m) showStep(+m[1], true); else showHome((target || '').replace('#',''));
    if (push !== false && canHistory()) { try { history.pushState({t:target}, '', m ? '#plan-' + cur : '#' + ((target || '').replace('#','') || 'top')); } catch (e) {} }
  }
  // Every in-page link goes through go(), with the default jump prevented.
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var href = a.getAttribute('href'); if (href === '#') return;
    e.preventDefault();
    if (a.hasAttribute('data-tab-link')) { var t = $(a.dataset.tabLink); if (t) selectTab(t, false); }
    go(href);
  });
  window.addEventListener('popstate', function(){ var h = ''; try { h = location.hash; } catch (e) {} go(h || '#top', false); });
  $('wiz-next').addEventListener('click', function(){ if (cur < 5) go('#plan-' + (cur + 1)); });
  $('wiz-next-m').addEventListener('click', function(){ if (cur < 5) go('#plan-' + (cur + 1)); else $('booking-submit').click(); });
  $('wiz-back').addEventListener('click', function(){ go(cur > 1 ? '#plan-' + (cur - 1) : '#top'); });
  (function(){ var h = ''; try { h = location.hash; } catch (e) {} if (/^#plan-[1-5]$/.test(h)) go(h, false); })();

  /* ================= REQUEST: validated, never sent offline ================= */
  var bf = $('booking-form'), err = $('booking-error');
  bf.addEventListener('input', function(e){ if (e.target.getAttribute('aria-invalid') === 'true' && e.target.checkValidity()) { e.target.removeAttribute('aria-invalid'); var m = e.target.parentElement.querySelector('.err-msg'); if (m) m.remove(); } });
  // Sandboxed previews block real form submission, so the button runs validation directly.
  bf.addEventListener('submit', function(e){ e.preventDefault(); sendRequest(); });
  $('booking-submit').addEventListener('click', function(e){ e.preventDefault(); sendRequest(); });
  // Request fields in step 5 write back to the plan, so the plan stays the single source of truth.
  [['req-date','date'], ['req-time','time'], ['req-end','end'], ['req-address','venue'], ['req-spot','spot'], ['req-postal','postal']].forEach(function(p){
    $(p[0]).addEventListener('input', function(e){ $(p[1]).value = e.target.value; if (p[1] === 'time') autoEnd(); readForm(); render(false); });
  });
  // A new start time always moves the end time to 2 hours later; the end time can then be changed freely.
  function autoEnd(){
    var a = mins($('time').value); if (a == null) return;
    var b = Math.min(a + 120, 23 * 60 + 59), v = String(Math.floor(b / 60)).padStart(2, '0') + ':' + String(b % 60).padStart(2, '0');
    $('end').value = v; var re = $('req-end'); if (re && document.activeElement !== re) re.value = v;
  }
  $('time').addEventListener('input', function(){ autoEnd(); readForm(); render(false); });
  /* ---------- Email verification (6-digit code by email) ---------- */
  var OTP = { email:'', token:'', verified:'', cooldown:0, timer:null };
  function normEmail(v){ return String(v || '').trim().toLowerCase(); }
  function isWebProto(){ try { return /^https?:$/.test(location.protocol); } catch (e) { return false; } }
  function otpStatus(msg, kind){ var st = $('otp-status'); st.textContent = msg; st.className = 'hint otp-status' + (kind ? ' ' + kind : ''); }
  function otpUI(){
    var em = $('req-email'), ok = !!OTP.verified && OTP.email === normEmail(em.value);
    $('otp-field').classList.toggle('verified', ok);
    $('otp-send').hidden = ok; $('otp-code-row').hidden = ok || !OTP.token || OTP.email !== normEmail(em.value);
    var send = $('otp-send'); send.disabled = OTP.cooldown > 0; send.textContent = OTP.cooldown > 0 ? 'Resend in ' + OTP.cooldown + 's' : OTP.token && OTP.email === normEmail(em.value) ? 'Resend' : 'Send code';
    if (ok) { otpStatus('Email verified.', 'ok'); em.removeAttribute('aria-invalid'); }
  }
  function otpCall(body){
    return fetch('/api/otp', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return {status:r.status, body:j}; }); });
  }
  $('req-email').addEventListener('input', function(){ if (OTP.email !== normEmail(this.value)) { OTP.verified = ''; } otpUI(); if (!OTP.verified) otpStatus('We’ll email you a 6-digit code to confirm it’s you.'); });
  $('otp-send').addEventListener('click', function(){
    var em = $('req-email'), v = normEmail(em.value);
    if (!em.checkValidity() || !v) { em.setAttribute('aria-invalid','true'); otpStatus('Please enter a valid email address first.', 'err'); em.focus(); return; }
    if (!isWebProto()) { otpStatus('This is an offline preview. Email codes are sent from the live website.', 'err'); return; }
    var btn = this; btn.disabled = true; btn.textContent = 'Sending…';
    otpCall({ action:'send', email:v }).then(function(res){
      if (res.status === 200 && res.body.ok) {
        OTP.email = v; OTP.token = res.body.token; OTP.verified = ''; OTP.cooldown = 30;
        clearInterval(OTP.timer); OTP.timer = setInterval(function(){ OTP.cooldown--; if (OTP.cooldown <= 0) clearInterval(OTP.timer); otpUI(); }, 1000);
        otpUI(); otpStatus('We’ve emailed a 6-digit code to ' + v + '. Check your spam folder if it’s not there in a minute.', 'ok'); $('otp-code').value = ''; $('otp-code').focus();
        track('otp_sent', {});
      } else { otpUI(); otpStatus(res.body.error || 'We couldn’t send the code just now. Please try again.', 'err'); }
    }).catch(function(){ otpUI(); otpStatus('We couldn’t reach our server. Please check your connection and try again.', 'err'); });
  });
  function verifyCode(){
    var code = $('otp-code').value.replace(/\D/g, '');
    if (code.length !== 6) { otpStatus('Enter the 6-digit code from your email.', 'err'); $('otp-code').focus(); return; }
    var btn = $('otp-verify'); btn.disabled = true; btn.textContent = 'Checking…';
    otpCall({ action:'verify', email:OTP.email, code:code, token:OTP.token }).then(function(res){
      btn.disabled = false; btn.textContent = 'Verify';
      if (res.status === 200 && res.body.ok) { OTP.verified = res.body.verified; otpUI(); track('otp_verified', {}); }
      else { otpStatus(res.body.error || 'That code didn’t work. Please try again.', 'err'); $('otp-code').value = ''; $('otp-code').focus(); }
    }).catch(function(){ btn.disabled = false; btn.textContent = 'Verify'; otpStatus('We couldn’t reach our server. Please try again.', 'err'); });
  }
  $('otp-verify').addEventListener('click', verifyCode);
  $('otp-code').addEventListener('input', function(){ var c = this.value.replace(/\D/g, '').slice(0, 6); if (c !== this.value) this.value = c; if (c.length === 6) verifyCode(); });
  $('otp-code').addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); verifyCode(); } });

  /* ---------- Who the booking is for (family or company) ---------- */
  function isCompany(){ var r = bf.querySelector('input[name="bookingFor"]:checked'); return !!r && r.value === 'company'; }
  function syncBookingFor(){
    var co = isCompany();
    $('company-fields').hidden = !co; $('company-name').required = co;
    $('dep-family').hidden = co; $('dep-company').hidden = !co;
    $('note-family').hidden = co; $('fine-family').hidden = co; $('note-company').hidden = !co;
  }
  bf.querySelectorAll('input[name="bookingFor"]').forEach(function(r){ r.addEventListener('change', function(){ syncBookingFor(); track('booking_for_selected', {booking_for:r.value}); }); });
  syncBookingFor();

  /* ---------- PayNow holding deposit ---------- */
  var PAY = null;
  function showPay(b){
    var co = b.bookingFor === 'company'; $('sent-company').hidden = !co; $('pay-card').hidden = co;
    if (co) { put('sent-bill', ($('billing-email').value || $('req-email').value).trim()); var nm0 = $('wiz-next-m'); if (nm0) nm0.hidden = true; return; }
    var nm = $('wiz-next-m'); if (nm) nm.hidden = true;
    PAY = { ref:b.ref, cents:b.holdCents, sig:b.paynow ? b.paynow.sig : '' };
    put('pay-amount', money(b.holdCents)); put('pay-amount-2', money(b.holdCents)); put('pay-ref', b.ref);
    var has = !!b.paynow; $('pay-qr-wrap').hidden = !has; $('pay-none').hidden = has; $('pay-done').hidden = !has;
    if (has) { $('pay-qr').innerHTML = b.paynow.svg; put('pay-payee', b.paynow.payee); put('pay-label', b.paynow.label); }
  }
  $('pay-done').addEventListener('click', function(){
    if (!PAY || !PAY.sig) return;
    var btn = this, st = $('pay-status'); btn.disabled = true; btn.textContent = 'Letting us know…';
    fetch('/api/paid', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ref:PAY.ref, cents:PAY.cents, sig:PAY.sig }) })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return {status:r.status, body:j}; }); })
      .then(function(res){
        st.hidden = false;
        if (res.status === 200 && res.body.ok) { btn.hidden = true; st.className = 'pay-status ok'; st.textContent = 'Thank you! We’ll check the payment and WhatsApp you to confirm.'; track('deposit_marked_paid', {}); }
        else { btn.disabled = false; btn.textContent = 'I’ve paid the deposit'; st.className = 'pay-status err'; st.textContent = res.body.error || 'We couldn’t send that just now. Please try again in a minute.'; }
      })
      .catch(function(){ btn.disabled = false; btn.textContent = 'I’ve paid the deposit'; st.hidden = false; st.className = 'pay-status err'; st.textContent = 'We couldn’t reach our server. Please try again.'; });
  });
  function phoneDigits(v){ var d = String(v || '').replace(/[^0-9]/g, ''); if (d.length === 10 && d.indexOf('65') === 0) d = d.slice(2); return d; }
  function sendRequest(){
    bf.querySelectorAll('.err-msg').forEach(function(m){ m.remove(); });
    var bad = [];
    function flag(i, msg){ bad.push(i); if (i.type === 'checkbox') return; i.setAttribute('aria-invalid','true'); var m = el('span','err-msg', msg); m.id = i.name + '-err'; i.setAttribute('aria-describedby', m.id); i.insertAdjacentElement('afterend', m); }
    bf.querySelectorAll('input[required]').forEach(function(i){
      if (!i.checkValidity()) flag(i, i.validity.valueMissing ? 'Please fill this in.' : i.name === 'postalCode' ? 'Enter a 6-digit Singapore postal code.' : i.name === 'phone' ? 'Enter a Singapore mobile number, e.g. 8123 4567.' : 'Please check this.');
    });
    if (!S.timeOk && bad.indexOf($('req-end')) < 0) flag($('req-end'), 'The end time needs to be after the start time.');
    var em = $('req-email'); if (isWebProto() && bad.indexOf(em) < 0 && !(OTP.verified && OTP.email === normEmail(em.value))) { bad.push(em); em.setAttribute('aria-invalid','true'); otpStatus('Please verify your email: tap “Send code”, then enter the code we email you.', 'err'); }
    err.hidden = false;
    track(bad.length ? 'request_invalid' : 'request_submitted', bad.length ? {fields:bad.map(function(i){ return i.name; }).join(',')} : {});
    if (bad.length) { err.textContent = 'Please check the highlighted details' + (bf.consent.checked ? '.' : ', and tick the contact consent box.'); bad[0].focus(); return; }
    var proto = ''; try { proto = location.protocol; } catch (e) {}
    if (proto !== 'http:' && proto !== 'https:') { err.textContent = 'This is an offline preview, so no request has been sent. Requests are sent from the live website.'; err.focus(); return; }
    var d = new FormData(bf), T = totals(S);
    var payload = {
      v: 1,
      plan: { children:S.children, adults:S.adults, experience:S.experience, wax:S.wax, addons:S.selected.slice(), date:S.date, start:S.time, end:S.end, budgetCents:S.budgetCents },
      contact: { parentName:d.get('parentName'), phone:phoneDigits(d.get('phone')), email:d.get('email'), venueName:(d.get('reqSpot') || '').trim(), companyName:isCompany() ? (d.get('companyName') || '').trim() : '', companyUen:isCompany() ? (d.get('companyUen') || '').trim() : '', billingEmail:isCompany() ? (d.get('billingEmail') || '').trim() : '', address:d.get('address'), postalCode:d.get('postalCode'), notes:d.get('notes') || '' },
      consent: !!bf.consent.checked, website: d.get('website') || '',
      bookingFor: isCompany() ? 'company' : 'family',
      client: { totalCents:T.total }, emailToken: OTP.verified && OTP.email === normEmail(d.get('email')) ? OTP.verified : ''
    };
    var btn = $('booking-submit'); btn.setAttribute('aria-busy','true'); btn.disabled = true; btn.textContent = 'Sending…';
    err.hidden = true;
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = setTimeout(function(){ if (ctrl) ctrl.abort(); }, 15000);
    fetch('/api/request', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload), signal: ctrl ? ctrl.signal : undefined })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ return {status:r.status, body:j}; }); })
      .then(function(res){
        clearTimeout(timer);
        if (res.status === 200 && res.body.ok) {
          S.requested = true;
          track('request_sent', {experience:S.experience, children:S.children, wax:S.wax, addons:S.selected.length, total_sgd:Math.round((res.body.totalCents || 0) / 100)});
          put('sent-ref', res.body.ref); put('sent-phone', '+65 ' + payload.contact.phone.replace(/(\d{4})(\d{4})/, '$1 $2'));
          put('sent-date', new Date(S.date + 'T00:00').toLocaleDateString('en-SG', {weekday:'long', day:'numeric', month:'long'}));
          put('sent-email', payload.contact.email); $('sent-mail').hidden = res.body.emailed === false;
          showPay(res.body);
          $('request-panel').hidden = true; $('sent-card').hidden = false; $('sent-card').focus();
          render(true, 'Request received. Reference ' + res.body.ref + (res.body.bookingFor === 'company' ? '. We’ll send a quotation and invoice once we confirm.' : '. Pay the holding deposit by PayNow to lock it in.'));
          return;
        }
        if (res.body && res.body.field === 'email') { OTP.verified = ''; otpUI(); }
        fail(res.status === 429 ? 'You’ve sent a few requests just now. Please wait a minute and try again.' : (res.status === 400 || res.status === 503) && res.body.error ? res.body.error : 'We couldn’t send your request just now. Please try again in a minute.');
      })
      .catch(function(){ clearTimeout(timer); fail('We couldn’t reach our server. Please check your connection and try again.'); });
    function fail(msg){ track('request_failed', {reason:msg.slice(0, 60)}); btn.removeAttribute('aria-busy'); btn.disabled = false; btn.textContent = 'Send my request'; err.hidden = false; err.textContent = msg + ' Your request has not been sent.'; err.focus(); }
  }
  $('sent-todo').addEventListener('click', function(){ go('#plan-4'); selectTab($('tab-p-check'), false); });



  /* ================= HEADER + REVEAL ================= */
  var header = $('site-header');
  var onScroll = function(){ header.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();
  window.addEventListener('load', function(){ document.body.classList.add('loaded'); });
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(entries){ entries.forEach(function(en){ if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, {rootMargin:'0px 0px -8% 0px', threshold:.06});
    els.forEach(function(x){ io.observe(x); });
  } else { els.forEach(function(x){ x.classList.add('in'); }); }
})();
