
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
    // Styling partner: Bloom (bloomball.sg). 'palette' and 'gallery' add a colour row and recent setups to the store page.
    'Bloom': {title:'Bloom', area:'Balloon garlands & backdrops · Singapore', tags:['Fabric backdrops','Balloon garlands','Custom foamboard'], pill:'Styling partner', from:'Backdrops from $199',
      thumb:'img/bloom/logo.png', hero:'img/bloom/setup-daisy.jpg',
      note:'We book Bloom for your date and coordinate set-up with them. Your colours and wording are confirmed in your quote.',
      palette:[['Pink','#f4a7c0'],['Terracotta','#d2683f'],['White','#ffffff'],['Cream','#efe4cc'],['Sage','#b7c29f'],['Black','#141414'],['Baby blue','#a8d2ee'],['Lilac','#c4a4de'],['Grey','#c6c6ce'],['Brown','#8a6a3d']],
      gallery:[['img/bloom/setup-daisy.jpg','Daisy first birthday'],['img/bloom/setup-navy.jpg','Navy & gold 55th'],['img/bloom/setup-blush.jpg','Blush 18th tea party']]},
    'Tom & Stefanie': {title:'Tom & Stefanie', area:'Party favours from our own stores', tags:['Since 1994'], pill:'Our own', icon:'i-gift'},
    'PartyPainters.sg': {title:'PartyPainters.sg', area:'Face painting & party entertainers · Singapore', tags:['Face painting','Glitter tattoos','Balloon sculpting','Magic','Caricatures','Photography'], pill:'Activities partner', from:'From $120', icon:'i-smile',
      note:'Any face-painting design: bring a reference photo. We book PartyPainters.sg for your date and confirm timings with them.'}
  };
  var EXP = { jelly:{name:'Jelly',short:'Jelly',pax:1600,per:1}, crunchy:{name:'Crunchy',short:'Crunchy',pax:1800,per:1}, both:{name:'Duo: Jelly + Crunchy',short:'Duo',pax:2600,per:2} };
  var CATS = [
    {id:'styling', title:'Styling', tab:'Styling', icon:'i-balloon', blurb:'Balloon backdrops, dessert tables and party favours in your colour theme.'},
    {id:'entertainment', title:'Other activities', tab:'Other activities', icon:'i-smile', blurb:'Face painting, glitter tattoos, balloon sculpting, magic, caricatures or a photographer, by PartyPainters.sg.'},
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
    // Bloom menu (bloomball.sg). Grouped items (g) are one menu tile with a size choice.
    // PartyPainters.sg (Instagram @partypainters.sg). Prices from their listing; tagged Demo until the partner rate is agreed.
    // Their listing asks people not to reuse their photos, so the store shows no photos.
    {id:'pp-face-1', g:'pp-face', gname:'Face painting', size:'1 hour', sec:'Face painting', cat:'entertainment', name:'Face painting, 1 hour', vendor:'PartyPainters.sg', status:'demo', basis:'booking', price:12000, rec:0, along:'Face painting', cap:'1 artist · paints about 8–15 children an hour, depending on the designs', inc:['Any design: bring a reference photo','Hypoallergenic face paints from TAG and Fusion Body Art (PartyPainters’ own information)'], cond:['Surcharge may apply for Sentosa and chalets']},
    {id:'pp-face-2', g:'pp-face', gname:'Face painting', size:'2 hours', sec:'Face painting', cat:'entertainment', name:'Face painting, 2 hours', vendor:'PartyPainters.sg', status:'demo', basis:'booking', price:23000, rec:3, along:'Face painting', cap:'1 artist · paints about 8–15 children an hour, depending on the designs', inc:['Any design: bring a reference photo','Hypoallergenic face paints from TAG and Fusion Body Art (PartyPainters’ own information)'], cond:['Surcharge may apply for Sentosa and chalets']},
    {id:'pp-glitter-1', g:'pp-glitter', gname:'Face painting + glitter tattoos', size:'1 hour', sec:'Face painting', cat:'entertainment', name:'Face painting + glitter tattoos, 1 hour', vendor:'PartyPainters.sg', status:'demo', basis:'booking', price:14000, rec:0, along:'Face painting & glitter tattoos', cap:'1 artist', inc:['Face painting and glitter tattoos','Any design: bring a reference photo','Hypoallergenic face paints from TAG and Fusion Body Art (PartyPainters’ own information)'], cond:['Surcharge may apply for Sentosa and chalets']},
    {id:'pp-glitter-2', g:'pp-glitter', gname:'Face painting + glitter tattoos', size:'2 hours', sec:'Face painting', cat:'entertainment', name:'Face painting + glitter tattoos, 2 hours', vendor:'PartyPainters.sg', status:'demo', basis:'booking', price:25000, rec:0, along:'Face painting & glitter tattoos', cap:'1 artist', inc:['Face painting and glitter tattoos','Any design: bring a reference photo','Hypoallergenic face paints from TAG and Fusion Body Art (PartyPainters’ own information)'], cond:['Surcharge may apply for Sentosa and chalets']},
    {id:'pp-balloon-1', g:'pp-balloon', gname:'Balloon sculpting + face painting', size:'1 hour', sec:'Combos', cat:'entertainment', name:'Balloon sculpting + face painting, 1 hour', vendor:'PartyPainters.sg', status:'demo', basis:'booking', price:23000, rec:0, along:'Balloon sculpting & face painting', cap:'1 face painter and 1 balloon sculptor', inc:['Balloon creations and face painting','Any design: bring a reference photo','Hypoallergenic face paints from TAG and Fusion Body Art (PartyPainters’ own information)'], cond:['Surcharge may apply for Sentosa and chalets']},
    {id:'pp-balloon-2', g:'pp-balloon', gname:'Balloon sculpting + face painting', size:'2 hours', sec:'Combos', cat:'entertainment', name:'Balloon sculpting + face painting, 2 hours', vendor:'PartyPainters.sg', status:'demo', basis:'booking', price:45000, rec:0, along:'Balloon sculpting & face painting', cap:'1 face painter and 1 balloon sculptor', inc:['Balloon creations and face painting','Any design: bring a reference photo','Hypoallergenic face paints from TAG and Fusion Body Art (PartyPainters’ own information)'], cond:['Surcharge may apply for Sentosa and chalets']},
    {id:'pp-photo-1', g:'pp-photo', gname:'Photography + face painting', size:'1 hour', sec:'Combos', cat:'entertainment', name:'Photography + face painting, 1 hour', vendor:'PartyPainters.sg', status:'demo', basis:'booking', price:23000, rec:4, along:'Photographer & face painting', cap:'1 face painter and 1 photographer', inc:['30 edited photos per hour','Any design: bring a reference photo','Hypoallergenic face paints from TAG and Fusion Body Art (PartyPainters’ own information)'], cond:['Surcharge may apply for Sentosa and chalets']},
    {id:'pp-photo-2', g:'pp-photo', gname:'Photography + face painting', size:'2 hours', sec:'Combos', cat:'entertainment', name:'Photography + face painting, 2 hours', vendor:'PartyPainters.sg', status:'demo', basis:'booking', price:45000, rec:0, along:'Photographer & face painting', cap:'1 face painter and 1 photographer', inc:['30 edited photos per hour','Any design: bring a reference photo','Hypoallergenic face paints from TAG and Fusion Body Art (PartyPainters’ own information)'], cond:['Surcharge may apply for Sentosa and chalets']},
    {id:'pp-carica-1', g:'pp-carica', gname:'Caricature + face painting', size:'1 hour', sec:'Combos', cat:'entertainment', name:'Caricature + face painting, 1 hour', vendor:'PartyPainters.sg', status:'demo', basis:'booking', price:23000, rec:0, along:'Caricatures & face painting', cap:'2 artists: a caricaturist and a face painter', inc:['Caricature drawings and face painting','Any design: bring a reference photo','Hypoallergenic face paints from TAG and Fusion Body Art (PartyPainters’ own information)'], cond:['Surcharge may apply for Sentosa and chalets']},
    {id:'pp-carica-2', g:'pp-carica', gname:'Caricature + face painting', size:'2 hours', sec:'Combos', cat:'entertainment', name:'Caricature + face painting, 2 hours', vendor:'PartyPainters.sg', status:'demo', basis:'booking', price:35000, rec:0, along:'Caricatures & face painting', cap:'2 artists: a caricaturist and a face painter', inc:['Caricature drawings and face painting','Any design: bring a reference photo','Hypoallergenic face paints from TAG and Fusion Body Art (PartyPainters’ own information)'], cond:['Surcharge may apply for Sentosa and chalets']},
    {id:'pp-magic', sec:'Magic show', cat:'entertainment', name:'Magic show, 30 minutes', vendor:'PartyPainters.sg', status:'demo', basis:'booking', price:35000, rec:0, slot:{min:30,title:'Magic show',copy:'A 30-minute magic show with music and a sound system.'}, cap:'1 magician, with sound system and music', inc:['Magic show with sound system and music'], cond:['Surcharge may apply for Sentosa and chalets']},
    {id:'bl-fabric-std', custom:{colours:true,text:true,notes:true,images:true}, sec:'Fabric backdrop packages', cat:'styling', name:'Fabric backdrop · Standard', vendor:'Bloom', status:'approved', basis:'booking', price:19900, rec:5, img:'img/bloom/fabric-standard.jpg', cap:'1 fabric backdrop, your text and a full balloon garland', inc:['1 fabric backdrop (1.2 m × 2.2 m)','1 custom vinyl text, e.g. the birthday child’s name','1 full-length balloon garland in your colours'], cond:['10 backdrop colours to choose from','Colours and wording confirmed in your quote']},
    {id:'bl-fabric-dlx', custom:{colours:true,text:true,notes:true,images:true}, sec:'Fabric backdrop packages', cat:'styling', name:'Fabric backdrop · Deluxe', vendor:'Bloom', status:'approved', basis:'booking', price:29900, rec:0, img:'img/bloom/fabric-deluxe.jpg', cap:'2 backdrops, your text, a balloon garland and a 3D standee', inc:['2 fabric backdrops (1.2 m × 2.2 m and 1 m × 2 m)','1 custom vinyl text','1 full-length balloon garland','1 3D standee (0.8 m tall)'], cond:['10 backdrop colours to choose from','Colours, wording and standee design confirmed in your quote']},
    {id:'bl-foam-std', custom:{colours:true,text:true,notes:true,images:true}, sec:'Custom foamboard backdrops', cat:'styling', name:'Custom foamboard · Standard', vendor:'Bloom', status:'approved', basis:'booking', price:39900, rec:0, img:'img/bloom/foam-standard.jpg', cap:'A fully printed backdrop designed for your theme', inc:['1 custom-printed backdrop (1.2 m × 2.2 m)','1 full-length balloon garland','Design and customisation included'], cond:['Design approved with you before printing']},
    {id:'bl-foam-dlx', custom:{colours:true,text:true,notes:true,images:true}, sec:'Custom foamboard backdrops', cat:'styling', name:'Custom foamboard · Deluxe', vendor:'Bloom', status:'approved', basis:'booking', price:49900, rec:0, img:'img/bloom/foam-deluxe.jpg', cap:'2 printed backdrops, a garland and a standee', inc:['2 custom-printed backdrops (2.2 m × 1.2 m and 2 m × 0.8 m)','1 full-length balloon garland','1 3D standee (0.8 m) or a number standee (1 m / 1.2 m)','Design and customisation included'], cond:['Design approved with you before printing']},
    {id:'bl-arch', sec:'Balloon arches & towers', cat:'styling', name:'Classic balloon arch', vendor:'Bloom', status:'approved', basis:'booking', price:22900, rec:0, img:'img/bloom/arch.jpg', cap:'A full balloon arch for an entrance or stage', inc:['1 classic balloon arch in your colours'], cond:['Great for entrances, schools and company events']},
    {id:'bl-twin-15', custom:{colours:true,text:true}, g:'bl-twin', gname:'Twin balloon towers', size:'1.5 m tall', sec:'Balloon arches & towers', cat:'styling', name:'Twin balloon towers, 1.5 m', vendor:'Bloom', status:'approved', basis:'booking', price:15000, rec:0, img:'img/bloom/twin-tower.jpg', cap:'A pair of balloon columns with your text on top', inc:['2 balloon columns','2 clear balloons with custom vinyl text'], cond:['Price is for the pair']},
    {id:'bl-twin-18', custom:{colours:true,text:true}, g:'bl-twin', gname:'Twin balloon towers', size:'1.8 m tall', sec:'Balloon arches & towers', cat:'styling', name:'Twin balloon towers, 1.8 m', vendor:'Bloom', status:'approved', basis:'booking', price:18000, rec:0, img:'img/bloom/twin-tower.jpg', cap:'A pair of balloon columns with your text on top', inc:['2 balloon columns','2 clear balloons with custom vinyl text'], cond:['Price is for the pair']},
    {id:'bl-number', sec:'Add-ons', cat:'styling', name:'Number standee', vendor:'Bloom', status:'approved', basis:'booking', price:3500, rec:0, img:'img/bloom/number-standee.jpg', cap:'A foil number on a balloon base, 1 m or 1.2 m', inc:['1 number standee (1 m or 1.2 m)'], cond:['Price is per number']},
    {id:'bl-col-12', custom:{colours:true,text:true}, g:'bl-col', gname:'Balloon column', size:'1.2 m tall', sec:'Add-ons', cat:'styling', name:'Balloon column, 1.2 m', vendor:'Bloom', status:'approved', basis:'booking', price:6000, rec:0, img:'img/bloom/balloon-column.jpg', cap:'A balloon column topped with a clear balloon and your text', inc:['1 balloon column with a clear text balloon'], cond:['Price is per column']},
    {id:'bl-col-15', custom:{colours:true,text:true}, g:'bl-col', gname:'Balloon column', size:'1.5 m tall', sec:'Add-ons', cat:'styling', name:'Balloon column, 1.5 m', vendor:'Bloom', status:'approved', basis:'booking', price:9000, rec:0, img:'img/bloom/balloon-column.jpg', cap:'A balloon column topped with a clear balloon and your text', inc:['1 balloon column with a clear text balloon'], cond:['Price is per column']},
    {id:'bl-half', sec:'Add-ons', cat:'styling', name:'Half balloon garland', vendor:'Bloom', status:'approved', basis:'booking', price:6500, rec:0, img:'img/bloom/half-garland.jpg', cap:'A shorter garland, 1 m or 1.2 m', inc:['1 half balloon garland (1 m or 1.2 m)'], cond:['Price is per garland']},
    {id:'bl-led', sec:'Add-ons', cat:'styling', name:'“Happy Birthday” LED light', vendor:'Bloom', status:'approved', basis:'booking', price:1500, rec:0, img:'img/bloom/led-light.jpg', cap:'Neon-style sign in white or warm white', inc:['1 LED sign (white or warm white)'], cond:[]},
    {id:'bl-themed', sec:'Add-ons', cat:'styling', name:'Themed foil balloons', vendor:'Bloom', status:'approved', basis:'booking', price:null, rec:0, img:'img/bloom/themed-balloons.jpg', cap:'From $5 to $15 each, priced in your quote', inc:['Foil balloons to match your theme'], cond:['Exact designs and price confirmed in your quote']},
    {id:'bl-stand-08', g:'bl-stand', gname:'Cake stand pedestal', size:'0.8 m tall', sec:'Add-ons', cat:'styling', name:'Cake stand pedestal, 0.8 m', vendor:'Bloom', status:'approved', basis:'booking', price:2500, rec:0, img:'img/bloom/cake-stand.jpg', cap:'A fluted white pedestal to show off the cake', inc:['1 cake stand pedestal'], cond:[]},
    {id:'bl-stand-10', g:'bl-stand', gname:'Cake stand pedestal', size:'1 m tall', sec:'Add-ons', cat:'styling', name:'Cake stand pedestal, 1 m', vendor:'Bloom', status:'approved', basis:'booking', price:3000, rec:0, img:'img/bloom/cake-stand.jpg', cap:'A fluted white pedestal to show off the cake', inc:['1 cake stand pedestal'], cond:[]},
    {id:'bl-3d-08', g:'bl-3d', gname:'3D standee with stand', size:'0.8 m tall', sec:'Add-ons', cat:'styling', name:'3D standee, 0.8 m', vendor:'Bloom', status:'approved', basis:'booking', price:5500, rec:0, img:'img/bloom/3d-standee.jpg', cap:'A cut-out character or theme figure on a stand', inc:['1 custom 3D standee with stand'], cond:['A 0.9 m size is also available: ask in your notes']},
    {id:'bl-3d-10', g:'bl-3d', gname:'3D standee with stand', size:'1 m tall', sec:'Add-ons', cat:'styling', name:'3D standee, 1 m', vendor:'Bloom', status:'approved', basis:'booking', price:7500, rec:0, img:'img/bloom/3d-standee.jpg', cap:'A cut-out character or theme figure on a stand', inc:['1 custom 3D standee with stand'], cond:['A 0.9 m size is also available: ask in your notes']},
    {id:'bl-poster', sec:'Add-ons', cat:'styling', name:'Foamboard poster with easel', vendor:'Bloom', status:'approved', basis:'booking', price:5000, rec:0, img:'img/bloom/foam-poster.jpg', cap:'An A3 or A4 welcome sign on an easel', inc:['1 foamboard poster (A3 or A4)','1 easel stand'], cond:[]},
    {id:'s-favours', cat:'styling', name:'Party favour bags', vendor:'Tom & Stefanie', status:'demo', basis:'child', price:600, rec:0, cap:'One per child', inc:['Themed bag','Sticker sheet','Thank-you tag'], cond:['Confirmed with your quotation']},
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
  function basisLabel(p){ return {booking:'per order', cake:'per cake', box:'per box', child:'per person', pax:'per person'}[p.basis]; }
  function qtyFor(p, s){ if (p.basis === 'child' || p.basis === 'pax') return Math.max(s.participants, p.min || 0); return 1; }
  function costFor(p, s){ return p.price == null ? null : p.price * qtyFor(p, s); }
  function clock(start, mins){ if (!start) return null; var hm = start.split(':'), t = (+hm[0]) * 60 + (+hm[1]) + mins, h = Math.floor(t / 60) % 24, m = t % 60; return (h % 12 || 12) + ':' + String(m).padStart(2,'0') + (h < 12 ? ' am' : ' pm'); }
  function range(start, a, b){ var x = clock(start, a), y = clock(start, b); if (!x) return null; var sx = x.slice(-2), sy = y.slice(-2); return (sx === sy ? x.slice(0, -3) : x) + '–' + y; }
  function lengthLabel(m){ var h = Math.floor(m / 60), r = m % 60; return (h ? h + (h === 1 ? ' hour' : ' hours') : '') + (h && r ? ' ' : '') + (r ? r + ' min' : ''); }
  function mins(t){ if (!t) return null; var a = t.split(':'); return (+a[0]) * 60 + (+a[1]); }

  /* ================= STATE ================= */
  var S = { participants:15, started:false, date:'', time:'14:00', length:120, end:'16:00', postal:'', timeOk:true, venue:'', theme:'cobalt', tpl:'disco', rsvp:'', captionEdited:false, done:{}, requested:false, experience:'both', wax:false, selected:[], customised:false, childName:'', childAge:'' };

  function foundation(s){
    var n = billable(s.participants), e = EXP[s.experience], items = [];
    items.push({label:'Squishy DIY: ' + e.name + ', ' + n + ' × ' + short(e.pax), sub:e.short + ' for ' + n + ' participants, ' + n + ' × ' + short(e.pax), cents:e.pax * n, ic:'i-sparkles'});
    items.push({label:'Squishy capsules + rhinestone stickers, ' + n + ' × ' + short(CONTAINER), sub:'Squishy capsules + rhinestone stickers, ' + n + ' × ' + short(CONTAINER), cents:CONTAINER * n, ic:'i-jar'});
    if (s.wax) items.push({label:s.experience === 'both' ? 'Wax Cracking duo deal, ' + (n * 2) + ' squishies × $2.50' : 'Wax Cracking, ' + (n * e.per) + ' squishies × ' + short(WAX), cents:waxCents(s.experience, n), sub:s.experience === 'both' ? 'Wax Cracking duo deal, ' + (n * 2) + ' × $2.50' : 'Wax Cracking, ' + (n * e.per) + ' × ' + short(WAX), ic:'i-crack'});
    items.push({label:'One-time travel & set-up (up to ' + TEAM_HOURS + ' hours)', sub:'One-time travel & set-up (up to ' + TEAM_HOURS + ' hours)', cents:LOGISTICS, ic:'i-users'});
    return items;
  }
  // Our suggested add-ons: everything with a rec rank, on-quote items (cakes) first, then by rank.
  // The party running order, shared by the Schedule tab and the invitation's schedule for parents.
  function partyBlocks(s){
    var exp = EXP[s.experience];
    var blocks = [
      {m:10, t:'Welcome & arrivals', c:'Guests arrive while our squishy station is ready to go.'},
      {m:PLAY_MIN, t:s.experience === 'both' ? 'Squishy DIY: both textures' : 'Squishy DIY: ' + exp.name, c:'Guided making, then decorating their squishy capsule with rhinestone stickers' + (s.wax ? ', finished with Wax Cracking.' : '.'), cls:'sq', kid:'Make their own squishies' + (s.wax ? ' + Wax Cracking' : '')}
    ];
    var slotted = {}; s.selected.forEach(function(id){ var p = BYID[id]; if (p.slot && !slotted[p.slot.title]) { slotted[p.slot.title] = 1; blocks.push({m:p.slot.min, t:p.slot.title, c:p.slot.copy, cls:'food'}); } else if (p.slot && slotted[p.slot.title]) { blocks.filter(function(b){ return b.t === p.slot.title; })[0].c += ' Plus ' + p.name.toLowerCase() + '.'; } });
    var hasCake = s.selected.some(function(id){ return BYID[id].cat === 'cake'; });
    var finale = {m:20, t:'Birthday finale', c:hasCake ? 'Cake, candles, birthday song and group photo.' : 'Birthday spotlight, song and group photo.', kid:hasCake ? 'Cake, song & group photo' : 'Birthday song & group photo'};
    var used = blocks.reduce(function(a, b){ return a + b.m; }, 0) + finale.m, free = s.length - used;
    if (free >= 10) blocks.push({m:free, t:'Free play & photos', c:'Time to squish, mingle and take photos.', cls:'free'});
    blocks.push(finale);
    return {blocks:blocks, used:used};
  }
  // Short lines for other parents: what the children do, when, and when to pick up.
  function scheduleRows(s){
    var rows = [], at = 0, B = partyBlocks(s).blocks;
    B.forEach(function(b){ rows.push({time: s.time ? clock(s.time, at) : at + ' min', what: b.kid || b.t}); at += b.m; });
    rows.push({time: s.time ? clock(s.time, Math.max(at, s.length)) : 'End', what:'Party ends · pick-up time'});
    return rows;
  }
  function recommend(s){
    var picks = P.filter(function(p){ return p.rec > 0 && p.price != null; }).sort(function(a, b){ return a.rec - b.rec; }).map(function(p){ return p.id; });
    P.filter(function(p){ return p.rec > 0 && p.price == null; }).forEach(function(p){ picks.unshift(p.id); });
    return {picks:picks};
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
        var rec = el('span','vrec','Suggested'); rec.hidden = true; top.appendChild(rec); c.appendChild(top);
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
    [['jelly','Jelly',''],['crunchy','Crunchy',''],['both','Duo','Best value']].forEach(function(o){
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
    if (inv) inv.innerHTML = invSVG('disco', { name:'Mia', age:6, ageLine:'6th Birthday', dateLine:'Saturday, 21 November', dayLine:'Saturday', dayDate:'Nov 21', timeLine:'2:00 pm – 4:00 pm', startLine:'at 2:00 pm', venue:'Clubhouse II, 1 Example Road', rsvp:'' }, 'tl');
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
    if (storeOf(vendor).from) return storeOf(vendor).from; // a store can lead with its headline price
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
        '<div class="ss-extra" id="ss-extra"></div>' +
        '<h4 class="ss-h">Menu</h4><div class="ss-grid" id="ss-grid"></div>' +
        '<div class="ss-foot"><p id="ss-foot-txt" aria-live="polite"></p><button type="button" class="btn btn-primary" data-close>Done</button></div>' +
      '</div>' +
      '<div class="ss-opt" id="ss-opt" hidden><div class="ss-opt-in" role="group" aria-labelledby="ss-opt-h"><button type="button" class="ss-opt-x" id="ss-opt-x" aria-label="Close"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>' +
        '<div class="ss-opt-ph" id="ss-opt-ph"></div><h4 id="ss-opt-h"></h4><p class="ss-opt-price" id="ss-opt-price"></p><p class="ss-opt-cap" id="ss-opt-cap"></p>' +
        '<div id="ss-opt-sizes"><p class="ss-opt-sub">Choose a size</p><div class="ss-opt-list" id="ss-opt-list" role="radiogroup" aria-labelledby="ss-opt-h"></div></div>' +
        '<div class="ss-opt-info" id="ss-opt-info"></div>' +
        '<div class="ss-custom" id="ss-custom" hidden></div>' +
        '<div class="ss-opt-actions"><button type="button" class="btn btn-ghost" id="ss-opt-remove">Remove</button><button type="button" class="btn btn-primary" id="ss-opt-add">Add to plan</button></div></div></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', function(e){ var t = e.target.closest('[data-close]'); if (t) { e.preventDefault(); closeStore(); } });
    sheet.addEventListener('keydown', function(e){
      if (e.key === 'Escape') { e.preventDefault(); if (!$('ss-opt').hidden) closeOpt(); else closeStore(); return; }
      if (e.key === 'Tab') { var f = [].slice.call(sheet.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type=file]), textarea')).filter(function(x){ return x.offsetParent !== null && !x.closest('[hidden]'); }); if (!$('ss-opt').hidden) f = f.filter(function(x){ return x.closest('#ss-opt'); }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
    });
    $('ss-opt').addEventListener('click', function(e){ if (e.target.id === 'ss-opt') closeOpt(); });
    $('ss-opt-x').addEventListener('click', function(){ closeOpt(); });
    $('ss-opt-add').addEventListener('click', function(){
      var r = sheet.querySelector('input[name="ss-size"]:checked'), id = r ? r.value : optGroup.items[0].id;
      if (!customReady(optGroup, BYID[id])) return; // colours and vinyl text are needed first
      setGroup(optGroup, id); render(false); closeOpt();
    });
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
    // Optional store extras: a strip of recent setups and the backdrop colours on offer.
    var ex = $('ss-extra'); ex.textContent = '';
    if (st.gallery && st.gallery.length) {
      ex.appendChild(el('h4','ss-h','Recent setups'));
      var strip = el('div','ss-gallery'); strip.setAttribute('role','list');
      st.gallery.forEach(function(gp){ var f = el('figure','ss-gal'); f.setAttribute('role','listitem'); f.appendChild(photoEl(gp[0], gp[1], 'ss-gal-img', ic)); f.appendChild(el('figcaption', null, gp[1])); strip.appendChild(f); });
      ex.appendChild(strip);
    }
    if (st.palette && st.palette.length) {
      var pal = el('div','ss-palette'); pal.appendChild(el('span','ss-pal-h','Backdrop colours'));
      var dots = el('span','ss-pal-dots'); st.palette.forEach(function(c){ var d0 = el('span','ss-pal-dot'); d0.style.background = c[1]; d0.title = c[0]; d0.setAttribute('aria-label', c[0]); d0.setAttribute('role','img'); dots.appendChild(d0); });
      pal.appendChild(dots); ex.appendChild(pal);
    }
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
      // Items with sizes or personalisation always open their sheet, so details are chosen before they're added.
      plus.addEventListener('click', function(e){ e.stopPropagation(); if (multi || p0.custom) openOpt(g); else toggle(p0.id); });
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
    buildCustom(g, p0, !!pick);
    $('ss-opt-remove').hidden = !pick; put('ss-opt-add', pick ? (multi || p0.custom ? 'Save changes' : 'Added ✓') : 'Add to plan');
    $('ss-opt-add').disabled = !!pick && !multi && !p0.custom;
    $('ss-opt').hidden = false; $('ss-opt').querySelector('.ss-opt-in').scrollTop = 0;
    requestAnimationFrame(function(){ $('ss-opt').classList.add('open'); var c = list.querySelector('input:checked'); (multi && c ? c : $('ss-opt-x')).focus(); });
  }
  /* Personalise (Bloom backdrops etc.): colours, custom vinyl text, inspiration notes and up to 3 moodboard images.
     Kept per menu item in S.custom and sent with the request for the items in the plan. */
  function customFor(key){ S.custom = S.custom || {}; return S.custom[key] || (S.custom[key] = {colours:[], text:'', notes:'', images:[]}); }
  function customSummary(key){
    var c = S.custom && S.custom[key]; if (!c) return '';
    return [c.colours.join(', '), c.text ? '“' + c.text + '”' : '', c.images.length ? c.images.length + ' moodboard image' + (c.images.length > 1 ? 's' : '') : ''].filter(Boolean).join(' · ');
  }
  function shrinkImage(file, cb){ // phone photos are large: resize to about 900 px and re-encode as JPEG before sending
    var rd = new FileReader();
    rd.onload = function(){ var im = new Image(); im.onload = function(){
      var out = null;
      [[900, .72], [900, .55], [700, .55]].some(function(t){ var k = Math.min(1, t[0] / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); out = c.toDataURL('image/jpeg', t[1]); return out.length < 440000; });
      cb(out && out.length < 440000 ? out : null);
    }; im.onerror = function(){ cb(null); }; im.src = rd.result; };
    rd.onerror = function(){ cb(null); }; rd.readAsDataURL(file);
  }
  var customTimer = null;
  function buildCustom(g, p0, inPlan){
    var box = $('ss-custom'), opt = p0.custom; box.textContent = ''; box.hidden = !opt; if (!opt) return;
    var c = customFor(g.key), st = storeOf(p0.vendor);
    function changed(){ if (!S.personalTracked) { S.personalTracked = true; track('addon_personalised', {id:p0.id}); } clearTimeout(customTimer); customTimer = setTimeout(function(){ render(false); }, 250); syncSheet(); }
    box.appendChild(el('p','ss-info-h','Personalise'));
    if (opt.colours && st.palette) {
      var head = el('div','ss-c-head'); head.appendChild(el('span','ss-c-label','Colours')); head.appendChild(el('span','ss-c-hint','Required · tap one or more'));
      var chips = el('div','ss-chips'); chips.setAttribute('role','group'); chips.setAttribute('aria-label','Colours');
      var chosen = el('p','ss-c-chosen'); chosen.setAttribute('aria-live','polite');
      var upd = function(){ chosen.textContent = c.colours.length ? 'Chosen: ' + c.colours.join(', ') : 'No colours chosen yet'; };
      st.palette.forEach(function(cl){
        var b = el('button','ss-chip'), dot = el('span','ss-chip-dot'); b.type = 'button'; dot.style.background = cl[1];
        b.appendChild(dot); b.appendChild(el('span','ss-chip-name', cl[0])); b.setAttribute('aria-label', cl[0]); b.setAttribute('aria-pressed', String(c.colours.indexOf(cl[0]) >= 0));
        b.addEventListener('click', function(){ var i = c.colours.indexOf(cl[0]); if (i >= 0) c.colours.splice(i, 1); else c.colours.push(cl[0]); b.setAttribute('aria-pressed', String(i < 0)); upd(); changed(); hideErr(); });
        chips.appendChild(b);
      });
      upd(); box.appendChild(head); box.appendChild(chips); box.appendChild(chosen);
    }
    if (opt.text) {
      var lt = el('label','field ss-c-field'), ti = document.createElement('input'), ls = el('span'); ls.appendChild(document.createTextNode('Custom vinyl text ')); ls.appendChild(el('span','opt-tag','(required)')); lt.appendChild(ls);
      ti.maxLength = 60; ti.value = c.text; ti.placeholder = 'e.g. Happy 7th Birthday, Mia!'; ti.id = 'ss-c-text'; ti.required = true;
      ti.addEventListener('input', function(){ c.text = ti.value; if (ti.value.trim()) ti.removeAttribute('aria-invalid'); changed(); hideErr(); }); lt.appendChild(ti); box.appendChild(lt);
    }
    if (opt.notes) {
      var ln = el('label','field ss-c-field'), ta = document.createElement('textarea'); ln.appendChild(document.createTextNode('Inspiration & colour notes'));
      ta.rows = 3; ta.maxLength = 600; ta.value = c.notes; ta.placeholder = 'e.g. pastel rainbow, sage and cream, a Frozen theme…'; ta.id = 'ss-c-notes';
      ta.addEventListener('input', function(){ c.notes = ta.value; changed(); }); ln.appendChild(ta); box.appendChild(ln);
    }
    if (opt.images) {
      var mh = el('div','ss-c-head'); mh.appendChild(el('span','ss-c-label','Moodboard images')); mh.appendChild(el('span','ss-c-hint','Optional, up to 3'));
      var thumbs = el('div','ss-mood'), fi = document.createElement('input'), add = el('button','ss-mood-add');
      fi.type = 'file'; fi.accept = 'image/*'; fi.multiple = true; fi.hidden = true; fi.id = 'ss-mood-file';
      add.type = 'button'; add.appendChild(icon('i-plus')); add.appendChild(el('span', null, 'Add image'));
      var draw = function(){
        thumbs.textContent = '';
        c.images.forEach(function(u, i){ var t = el('div','ss-mood-th'), im = document.createElement('img'), x = el('button','ss-mood-x'); im.src = u; im.alt = 'Moodboard image ' + (i + 1); x.type = 'button'; x.setAttribute('aria-label', 'Remove moodboard image ' + (i + 1)); x.appendChild(icon('i-x')); x.addEventListener('click', function(){ c.images.splice(i, 1); draw(); changed(); }); t.appendChild(im); t.appendChild(x); thumbs.appendChild(t); });
        if (c.images.length < 3) thumbs.appendChild(add);
      };
      add.addEventListener('click', function(){ fi.click(); });
      fi.addEventListener('change', function(){
        var files = [].slice.call(fi.files || []).slice(0, 3 - c.images.length); fi.value = '';
        (function next(){ var f = files.shift(); if (!f) { draw(); changed(); return; } shrinkImage(f, function(u){ if (u) c.images.push(u); next(); }); })();
      });
      draw(); box.appendChild(mh); box.appendChild(thumbs); box.appendChild(fi);
    }
    var err = el('p','ss-c-err'); err.id = 'ss-c-err'; err.setAttribute('role','alert'); err.hidden = true; box.appendChild(err);
    box.appendChild(el('p','fine ss-c-note', inPlan ? 'Change anything here, then tap Save changes.' : 'Choose your colours and add your vinyl text, then tap Add to plan.'));
  }
  function hideErr(){ var e = $('ss-c-err'); if (e && !e.hidden) { e.hidden = true; } }
  // Before a personalisable item goes into the plan: at least one colour and the vinyl text (notes and images stay optional).
  function customReady(g, p){
    if (!p || !p.custom) return true;
    var c = customFor(g.key), err = $('ss-c-err'), miss = [];
    if (p.custom.colours && !c.colours.length) miss.push('choose at least one colour');
    if (p.custom.text && !c.text.trim()) miss.push('add the vinyl text');
    var ti = $('ss-c-text'); if (ti) { if (p.custom.text && !c.text.trim()) ti.setAttribute('aria-invalid','true'); else ti.removeAttribute('aria-invalid'); }
    if (!miss.length) { if (err) err.hidden = true; return true; }
    if (err) { err.hidden = false; err.textContent = 'Before adding, please ' + miss.join(' and ') + '.'; }
    var first = p.custom.colours && !c.colours.length ? sheet.querySelector('.ss-chip') : ti; if (first) { first.focus(); first.scrollIntoView({block:'center', behavior:'smooth'}); }
    track('addon_details_missing', {id:p.id}); return false;
  }
  function customPayload(){ // personalisation for the items in the plan only
    var out = {};
    S.selected.forEach(function(id){ var p = BYID[id], c = S.custom && S.custom[p.g || p.id]; if (p.custom && c && (c.colours.length || c.text.trim() || c.notes.trim() || c.images.length)) out[id] = {colours:c.colours.slice(), text:c.text.trim(), notes:c.notes.trim(), images:c.images.slice()}; });
    return out;
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
      var opens = x.multi || !!p0.custom;
      x.plus.setAttribute('aria-label', x.multi ? (on ? 'Change size of ' : 'Choose a size of ') + x.g.name : p0.custom ? (on ? 'Edit details of ' : 'Choose colours and text for ') + x.g.name : (on ? 'Remove ' : 'Add ') + x.g.name + (on ? ' from' : ' to') + ' your plan');
      if (!opens) x.plus.setAttribute('aria-pressed', String(on)); else x.plus.removeAttribute('aria-pressed');
      x.sug.hidden = on || !x.g.items.some(function(p){ return lastR.picks.indexOf(p.id) >= 0; });
      x.price.textContent = priceTxt(shown);
      var demo = shown.status === 'demo' ? 'Demo price' : '';
      var extra = cost != null && q > 1 ? money(cost) + ' for ' + q : '';
      x.sub.textContent = on ? [x.multi ? 'Added: ' + pick.size : 'Added to your plan', customSummary(x.g.key), extra, demo].filter(Boolean).join(' · ') : x.multi ? x.g.items.length + ' sizes' : [extra, demo].filter(Boolean).join(' · ') || shown.cap;
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
  // Optional add-on, shown after the finished squishy and before decorating the capsule.
  var WAX_STEP = {img:'img/how/wax.jpg', title:'Viral Wax Cracking experience!', caption:'Add-on: dip the finished squishy in colourful melted wax, let it set, then crack the shell to reveal it.'};
  var HOW_STEPS = {
    jelly: [
      {img:'img/how/jelly-1.jpg', title:'Explore the setup', caption:'Your squishy station is set up and ready when the children arrive.'},
      {img:'img/how/jelly-2.jpg', title:'Choose a slime base', caption:'Each child picks from three base colours of clear or glittery slime.'},
      {img:'img/how/jelly-3.jpg', title:'Fill the beauty capsule', caption:'Take a 4-piece beauty capsule and fill 3 pieces with charms.'},
      {img:'img/how/jelly-4.jpg', title:'Mix and play', caption:'Mix and play on yellow trays, with fun tools provided.'},
      {img:'img/how/jelly-5.jpg', title:'The finished Jelly squishy', caption:'Their very own Jelly squishy, filled, tied and ready to squish.'},
      WAX_STEP,
      {img:'img/how/jelly-6.jpg', title:'Decorate your take-home capsule', caption:'Rhinestone stickers, DIY, then their squishy goes home in it.'}
    ],
    crunchy: [
      {img:'img/how/crunchy-1.jpg', title:'Explore the setup', caption:'Your squishy station is set up and ready when the children arrive.'},
      {img:'img/how/crunchy-2.jpg', title:'Choose a slime base', caption:'Each child picks from three base colours of clear or glittery slime.'},
      {img:'img/how/crunchy-3.jpg', title:'Pick the crunch', caption:'Take 2 boxes and fill them with crunchy toppings.'},
      {img:'img/how/crunchy-4.jpg', title:'Mix and play', caption:'Mix and play on yellow trays, with fun tools provided.'},
      {img:'img/how/crunchy-5.jpg', title:'The finished Crunchy squishy', caption:'Their very own Crunchy squishy, filled, tied and ready to crunch.'},
      WAX_STEP,
      {img:'img/how/crunchy-6.jpg', title:'Decorate your take-home capsule', caption:'Rhinestone stickers, DIY, then their squishy goes home in it.'}
    ],
    both: [
      {img:'img/how/duo-1.jpg', title:'Explore the setup', caption:'Your squishy station is set up and ready when the children arrive.'},
      {img:'img/how/duo-2.jpg', title:'Choose a slime base', caption:'Each child picks from three base colours of clear or glittery slime.'},
      {img:'img/how/duo-3.jpg', title:'Boxes and capsule', caption:'2 boxes of crunchy toppings in one hand, a 4-piece beauty capsule of charms in the other.'},
      {img:'img/how/duo-4.jpg', title:'Mix and play', caption:'Mix and play on yellow trays, with fun tools provided.'},
      {img:'img/how/duo-5.jpg', title:'The finished Duo', caption:'A Jelly and a Crunchy squishy each, filled, tied and ready to squish.'},
      WAX_STEP,
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
    WAX_STEP,
    {img:'img/making/5.jpg', title:'Decorate your capsule box', caption:'Rhinestone stickers, DIY, then it’s theirs to take home.'}
  ];
  /* Reviews: real Google reviews, copied word for word (never edited or invented). Our parties run from the
     Tom & Stefanie outlets, so these are the outlets' Google reviews. url = the review's link on Google. */
  var REVIEWS = [
    {name:'Hazel Tan', stars:5, when:'Sep 2026', url:'', text:'I would like to give a special shout-out to the staff ( Kay Khine) who assisted me during my visit with my girls making squishy . She was incredibly friendly, helpful, and genuinely passionate about her job. Her warm attitude and willingness to assist made the whole shopping experience so pleasant and enjoyable.\nIt’s not often you come across someone who takes such pride in what they do. Her positive energy and excellent service really stood out, and she definitely deserves recognition for it. Thank you for making my visit such a wonderful experience!'},
    {name:'Mich Lim', stars:5, when:'Sep 2026', url:'', text:'Very approachable and helpful staff! My girl thoroughly enjoyed the slime/squishy making activity. 😊'}
  ];
  var GOOGLE_REVIEWS_URL = '';   // the outlet's Google reviews page, to show the "Read our Google reviews" button
  /* Swipeable reel of our Instagram posts. Each item: a video file (public/video/, .mp4, portrait 9:16, muted) with a
     poster image, or a photo; ig = the post's Instagram link. Only share what you're allowed to (children's faces need consent). */
  var REEL = [];                 // e.g. {video:'video/wax-crack.mp4', img:'img/events/wax-crack.jpg', alt:'Cracking the wax shell', ig:'https://www.instagram.com/p/...'}
  var INSTAGRAM_URL = '';        // your Instagram profile, for the "Follow us" link
  // Horizontal catalogue: swipe on phones, arrows on computers; shows "1–2 of 5" so people know there's more.
  function scroller(track, prev, next, pos){
    function card(){ var c = track.firstElementChild; return c ? c.getBoundingClientRect().width + 14 : 300; }
    function update(){
      prev.disabled = track.scrollLeft < 8; next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
      if (pos) { var n = track.children.length, w = card(), a = Math.min(n, Math.round(track.scrollLeft / w) + 1), b = Math.min(n, a + Math.max(1, Math.floor((track.clientWidth + 14) / w)) - 1); pos.textContent = n > 1 ? (a === b ? a : a + '–' + b) + ' of ' + n : ''; }
      var hideNav = track.scrollWidth <= track.clientWidth + 8; prev.hidden = next.hidden = hideNav;
    }
    prev.addEventListener('click', function(){ track.scrollBy({left:-card(), behavior:'smooth'}); });
    next.addEventListener('click', function(){ track.scrollBy({left:card(), behavior:'smooth'}); });
    track.addEventListener('keydown', function(e){ if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); } if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); } });
    track.addEventListener('scroll', update, {passive:true}); window.addEventListener('resize', update); setTimeout(update, 300);
  }
  function renderReviews(){
    var grid = $('rv-grid'); if (!grid) return;
    REVIEWS.forEach(function(r, idx){
      var li = el('li','rv-card'), n = Math.max(0, Math.min(5, r.stars || 0));
      li.setAttribute('aria-label', 'Review ' + (idx + 1) + ' of ' + REVIEWS.length + ', by ' + r.name);
      var top = el('div','rv-top'), av = el('span','rv-av', r.name.charAt(0)); av.setAttribute('aria-hidden','true');
      var who = el('div','rv-who'), nm = r.url ? el('a','rv-name', r.name) : el('b','rv-name', r.name);
      if (r.url) { nm.href = r.url; nm.target = '_blank'; nm.rel = 'noopener'; nm.setAttribute('aria-label', r.name + '’s review on Google (opens in a new tab)'); }
      who.appendChild(nm); who.appendChild(el('span','rv-meta', (r.when ? r.when + ' · ' : '') + 'Tom & Stefanie outlet'));
      var g = el('span','rv-g','G'); g.setAttribute('title','Google review'); g.setAttribute('aria-label','Google review');
      top.appendChild(av); top.appendChild(who); top.appendChild(g); li.appendChild(top);
      if (n) { var st = el('p','rv-stars', '★★★★★'.slice(0, n)); st.setAttribute('aria-label', n + ' out of 5 stars'); li.appendChild(st); }
      var q = el('blockquote','rv-text'); r.text.split('\n').forEach(function(t){ q.appendChild(el('p', null, t)); }); li.appendChild(q);
      grid.appendChild(li);
      // Long reviews show 5 lines with "Read more"
      requestAnimationFrame(function(){
        if (q.scrollHeight <= q.clientHeight + 2) return;
        var more = el('button','rv-more','Read more'); more.type = 'button'; more.setAttribute('aria-expanded','false');
        more.addEventListener('click', function(){ var open = q.classList.toggle('open'); more.textContent = open ? 'Show less' : 'Read more'; more.setAttribute('aria-expanded', String(open)); });
        li.appendChild(more);
      });
    });
    grid.hidden = !REVIEWS.length; $('rv-empty').hidden = !!REVIEWS.length;
    scroller(grid, $('rv-prev'), $('rv-next'), $('rv-pos'));
    if (GOOGLE_REVIEWS_URL) { $('google-reviews').href = GOOGLE_REVIEWS_URL; $('google-reviews').hidden = false; }
    if (INSTAGRAM_URL) { $('ig-follow').href = INSTAGRAM_URL; $('ig-follow').hidden = false; }
    // Videos play (muted) only while mostly on screen
    var track = $('reel'), seen = 'IntersectionObserver' in window ? new IntersectionObserver(function(es){
      es.forEach(function(e){ var v = e.target; if (e.isIntersecting && e.intersectionRatio > .6) { var p = v.play(); if (p && p.catch) p.catch(function(){}); } else v.pause(); });
    }, {threshold:[0,.6,1]}) : null;
    REEL.forEach(function(it, idx){
      var li = el('li','reel-item'), m;
      li.setAttribute('aria-label', (idx + 1) + ' of ' + REEL.length);
      if (it.video) {
        m = document.createElement('video'); m.src = it.video; if (it.img) m.poster = it.img;
        m.muted = true; m.loop = true; m.playsInline = true; m.setAttribute('playsinline',''); m.preload = 'none'; m.controls = true;
        m.setAttribute('aria-label', it.alt); if (seen) seen.observe(m);
      } else { m = document.createElement('img'); m.src = it.img; m.alt = it.alt; m.loading = 'lazy'; m.decoding = 'async'; }
      m.addEventListener('error', function(){ li.remove(); });
      li.appendChild(m);
      if (it.ig) { var a = el('a','reel-ig','View on Instagram'); a.href = it.ig; a.target = '_blank'; a.rel = 'noopener'; li.appendChild(a); }
      track.appendChild(li);
    });
    // Until the videos are added, small empty tiles hold their place
    if (!REEL.length) for (var k = 0; k < 4; k++) { var ph = el('li','reel-item reel-soon'); ph.appendChild(icon('i-camera')); ph.appendChild(el('span', null, 'Video coming soon')); track.appendChild(ph); }
    scroller(track, $('reel-prev'), $('reel-next'), null);
  }
  renderReviews();
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
  // GIF frames: while INV_PHASE is 0–1 the art animates (sparkles twinkle, confetti spins, glitter shimmers); null = still image.
  var INV_PHASE = null;
  function hr(n){ var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function tw(x, y){ return INV_PHASE == null ? 1 : .45 + .55 * (.5 + .5 * Math.sin(2 * Math.PI * (INV_PHASE + hr(x * .37 + y * 1.13)))); }
  function star4(x, y, r, fill){ r = r * tw(x, y); return '<path d="M' + x + ' ' + (y - r) + 'Q' + (x + r * .18) + ' ' + (y - r * .18) + ' ' + (x + r) + ' ' + y + 'Q' + (x + r * .18) + ' ' + (y + r * .18) + ' ' + x + ' ' + (y + r) + 'Q' + (x - r * .18) + ' ' + (y + r * .18) + ' ' + (x - r) + ' ' + y + 'Q' + (x - r * .18) + ' ' + (y - r * .18) + ' ' + x + ' ' + (y - r) + 'Z" fill="' + fill + '"/>'; }
  function dots(list){ return list.map(function(d){ return '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + (d[2] * tw(d[0], d[1])).toFixed(1) + '" fill="' + d[3] + '"/>'; }).join(''); }

  var TEMPLATES = [
    {id:'disco', name:'Disco Bow'},
    {id:'confetti', name:'Confetti Letters'},
    {id:'glitter', name:'Glitter Glam'}
  ];
  // Every line of wording on a card, in the order it appears. Parents can change or clear any of them.
  var WORD_FIELDS = {
    disco:[['turning','Line under the name'],['invite','Invitation line'],['when','Date and time'],['venue','Venue'],['foot','Bottom line']],
    confetti:[['top','Top line'],['big1','Big letters, line 1'],['big2','Big letters, line 2'],['pre','Line above the name'],['turning','Line under the name'],['date','Date'],['time','Time'],['venue','Venue'],['foot','Bottom line']],
    glitter:[['top','Top line'],['big1','Title, line 1'],['big2','Title, line 2'],['pre','Line above the name'],['turning','Line under the name'],['date','Date'],['time','Time'],['venue','Venue']]
  };
  function wordDefaults(tpl, d){
    return {
      turning: d.age ? 'IS TURNING ' + d.age + '!' : 'IS HAVING A PARTY!', invite:'join us for a squishy party',
      when: d.dateLine + ' · ' + d.startLine, date: d.dateLine, time: d.timeLine, venue: d.venue,
      top:'JOIN US FOR A', big1: tpl === 'glitter' ? 'BIRTHDAY' : 'SQUISHY', big2: tpl === 'glitter' ? 'SQUISHY PARTY' : 'PARTY',
      pre: tpl === 'glitter' ? 'CELEBRATING' : 'HONORING', foot: tpl === 'disco' ? 'MAKE · SQUISH · TAKE HOME' : 'squishies, stickers and smiles provided'
    };
  }
  function invSVG(tpl, d, u, words){
    var W = 840, H = 1188, o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '">';
    var ph = INV_PHASE || 0, moving = INV_PHASE != null;
    var WD = wordDefaults(tpl, d), own = (words && words[tpl]) || {};
    var w = function(k){ return Object.prototype.hasOwnProperty.call(own, k) ? own[k] : WD[k]; };
    var turning = w('turning');
    if (tpl === 'disco') {
      // Blush paper, a pink mirror-tile disco ball with a bow, and pink glitter lettering.
      var mix = function(a, b, t){ var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), r = function(sh){ return Math.round(((A >> sh) & 255) + (((B >> sh) & 255) - ((A >> sh) & 255)) * t); }; return 'rgb(' + r(16) + ',' + r(8) + ',' + r(0) + ')'; };
      o += '<defs><pattern id="' + u + 'pg" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="translate(' + (ph * 8).toFixed(1) + ' 0)"><rect width="8" height="8" fill="#e2468e"/><circle cx="2" cy="2" r="1.2" fill="#ff9fcd"/><circle cx="6" cy="5.5" r="1" fill="#ffd0e6"/><circle cx="5" cy="1" r=".8" fill="#b81f68"/></pattern>' +
        '<clipPath id="' + u + 'ball"><circle cx="420" cy="340" r="176"/></clipPath><radialGradient id="' + u + 'hl" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>' +
        '<rect width="840" height="1188" fill="#f7ddd4"/>';
      for (var sp = 0; sp < 60; sp++) o += '<circle cx="' + Math.round(hr(sp) * 840) + '" cy="' + Math.round(hr(sp + 99) * 1188) + '" r="' + (1 + hr(sp + 7) * 2).toFixed(1) + '" fill="#eecabd" opacity=".7"/>';
      o += '<line x1="420" y1="0" x2="420" y2="166" stroke="#d98fae" stroke-width="3"/><g clip-path="url(#' + u + 'ball)"><circle cx="420" cy="340" r="176" fill="#9c3d70"/>';
      var ti = 0;
      for (var ty = 164; ty < 520; ty += 22) for (var tx = 244; tx < 600; tx += 22) {
        var nx = (tx + 11 - 420) / 176, ny = (ty + 11 - 340) / 176; ti++;
        if (nx * nx + ny * ny > 1.08) continue;
        var lt = .5 - nx * .32 - ny * .38 + (hr(ti) - .5) * .35 + (moving ? .28 * Math.sin(2 * Math.PI * (ph + hr(ti * 3))) : 0);
        o += '<rect x="' + tx + '" y="' + ty + '" width="20" height="20" rx="2" fill="' + mix('#8a2f62', '#ffe3f0', Math.max(0, Math.min(1, lt))) + '"/>';
      }
      o += '<circle cx="420" cy="340" r="176" fill="url(#' + u + 'hl)"/></g><circle cx="420" cy="340" r="176" fill="none" stroke="#c4527f" stroke-width="3"/>' +
        star4(352, 262, 26, '#ffffff') + star4(478, 408, 16, '#ffffff') + star4(395, 450, 12, '#ffffff') +
        // bow
        '<path d="M418 178 C350 104 272 116 286 180 C298 228 372 214 418 186 Z" fill="#f48cb6" stroke="#d2508a" stroke-width="4"/><path d="M422 178 C490 104 568 116 554 180 C542 228 468 214 422 186 Z" fill="#f48cb6" stroke="#d2508a" stroke-width="4"/>' +
        '<path d="M408 190 C384 250 352 312 328 380 L366 368 C390 306 410 250 426 200 Z" fill="#f7a3c6" stroke="#d2508a" stroke-width="4"/><path d="M432 190 C456 250 488 312 512 380 L474 368 C450 306 430 250 414 200 Z" fill="#f7a3c6" stroke="#d2508a" stroke-width="4"/>' +
        '<ellipse cx="420" cy="186" rx="28" ry="24" fill="#e86aa0" stroke="#d2508a" stroke-width="4"/>' +
        [[150,210,22,'#e2468e'],[690,240,26,'#e2468e'],[118,470,14,'#ffffff'],[724,520,18,'#e2468e'],[180,610,12,'#ffffff'],[660,640,14,'#e2468e'],[96,880,16,'#e2468e'],[744,900,20,'#ffffff'],[620,92,14,'#ffffff'],[230,70,12,'#e2468e']].map(function(s0){ return star4(s0[0], s0[1], s0[2], s0[3]); }).join('') +
        T(420, 652, d.name || 'Our birthday star', {size:112, font:F_DISPLAY, italic:true, weight:700, fill:'url(#' + u + 'pg)', fit:700, k:.5}) +
        T(420, 762, turning, {size:84, font:F_DISPLAY, weight:800, fill:'url(#' + u + 'pg)', fit:740, k:.66, ls:2}) +
        T(420, 842, w('invite'), {size:42, font:F_DISPLAY, italic:true, weight:600, fill:'#d8508c', fit:700}) +
        T(420, 918, w('when').toUpperCase(), {size:30, weight:800, fill:'#d8508c', ls:2, fit:720}) +
        T(420, 964, w('venue').toUpperCase(), {size:26, weight:800, fill:'#d8508c', ls:2, fit:720}) +
        T(420, 1138, w('foot'), {size:20, fill:'#e08ab0', ls:5, fit:720});
    } else if (tpl === 'confetti') {
      // Cream card, confetti and chunky letters, each in its own pattern.
      var C6 = ['#f2607b','#ffc23d','#2bb3c0','#7b61ff','#3ab26b','#ff8a3d','#f49ac1'];
      o += '<defs>' +
        '<pattern id="' + u + 'p0" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#f49ac1"/><circle cx="6" cy="6" r="3" fill="#fff"/><circle cx="17" cy="16" r="3" fill="#fff"/></pattern>' +
        '<pattern id="' + u + 'p1" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="18" height="18" fill="#ffc23d"/><rect width="6" height="18" fill="#f2607b"/></pattern>' +
        '<pattern id="' + u + 'p2" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#2bb3c0"/><rect y="8" width="20" height="4" fill="#bdf0f3"/></pattern>' +
        '<pattern id="' + u + 'p3" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="#3ab26b"/><circle cx="12" cy="12" r="4" fill="#f49ac1"/></pattern>' +
        '<pattern id="' + u + 'p4" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#7b61ff"/><circle cx="5" cy="5" r="2.5" fill="#ffe36b"/><circle cx="16" cy="15" r="2.5" fill="#ffe36b"/></pattern>' +
        '<pattern id="' + u + 'p5" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="18" height="18" fill="#ff8a3d"/><rect width="18" height="5" fill="#ffe0c2"/></pattern>' +
        '</defs><rect width="840" height="1188" fill="#fbf7ef"/>';
      for (var cf = 0; cf < 70 && o.length < 40000; cf++) {
        var cx0 = Math.round(20 + hr(cf) * 800), cy0 = Math.round(20 + hr(cf + 50) * 1148);
        if (cx0 > 140 && cx0 < 700 && cy0 > 90 && cy0 < 1100) continue;
        var col = C6[cf % 7], ang = Math.round(hr(cf + 9) * 360 + (moving ? ph * 360 * (cf % 2 ? 1 : -1) : 0)), kind = cf % 4;
        var g0 = '<g transform="translate(' + cx0 + ' ' + cy0 + ') rotate(' + ang + ')">';
        if (kind === 0) o += g0 + '<path d="M0 -14 L13 10 L-13 10 Z" fill="' + col + '"/></g>';
        else if (kind === 1) o += g0 + '<path d="M-14 0 q4 -9 8 0 t8 0 t8 0" stroke="' + col + '" stroke-width="5" fill="none" stroke-linecap="round"/></g>';
        else if (kind === 2) o += '<circle cx="' + cx0 + '" cy="' + cy0 + '" r="' + (7 * tw(cx0, cy0)).toFixed(1) + '" fill="' + col + '"/>';
        else o += g0 + '<rect x="-10" y="-5" width="20" height="10" rx="3" fill="' + col + '"/></g>';
      }
      // Letters are spaced by their own width, so a narrow I doesn't leave gaps.
      var LW = {I:.36, J:.55, L:.6, T:.66, Y:.7, M:.9, W:.95, Q:.82, O:.8, ' ':.35};
      // Shrinks to fit when parents type a longer word.
      var word = function(txt, y, size){ txt = String(txt).toUpperCase(); var ws = txt.split('').map(function(ch){ return LW[ch] || .72; }), tot = ws.reduce(function(a, v){ return a + v; }, 0); size = Math.min(size, tot ? 760 / tot : size);
        var x = 420 - tot * size / 2, s = '';
        for (var i = 0; i < txt.length; i++) { if (txt[i] !== ' ') s += T(Math.round(x + ws[i] * size / 2), y, txt[i], {size:Math.round(size), weight:900, fill:'url(#' + u + 'p' + ((i + (y > 400 ? 3 : 0)) % 6) + ')', stroke:'#2a2140', sw:3}); x += ws[i] * size; } return s; };
      o += T(420, 150, w('top'), {size:30, weight:800, fill:'#e8553f', ls:5, fit:700}) +
        word(w('big1'), 300, 132) + word(w('big2'), 450, 132) +
        T(420, 560, w('pre'), {size:28, weight:800, fill:'#e8553f', ls:5, fit:700}) +
        T(420, 664, d.name || 'Our birthday star', {size:100, font:F_DISPLAY, italic:true, weight:700, fill:'#e8553f', fit:700, k:.5}) +
        T(420, 742, turning, {size:40, weight:800, fill:'#e8553f', ls:3, fit:700}) +
        T(420, 840, w('date').toUpperCase(), {size:28, weight:800, fill:'#e8553f', ls:2, fit:680}) +
        T(420, 884, w('time').toUpperCase(), {size:28, weight:800, fill:'#e8553f', ls:2, fit:680}) +
        T(420, 928, w('venue').toUpperCase(), {size:26, weight:800, fill:'#e8553f', ls:2, fit:680}) +
        T(420, 990, w('foot'), {size:26, weight:700, fill:'#e8553f', fit:680});
    } else if (tpl === 'glitter') {
      // Plum glitter fading into dusty pink, with an elegant serif and script name.
      // Fine, low-contrast flecks on a large tile, so the glitter reads as texture rather than a polka-dot repeat.
      var GC = ['#8f3a80','#a24c92','#6a2560','#b765a6','#7f3373','#c27ab3','#5e2056','#e7b9dc'];
      o += '<defs><pattern id="' + u + 'gl" width="96" height="96" patternUnits="userSpaceOnUse" patternTransform="translate(' + (ph * 96).toFixed(1) + ' ' + (ph * 48).toFixed(1) + ')"><rect width="96" height="96" fill="#74296a"/>';
      for (var gd = 0; gd < 150; gd++) { var gx0 = (hr(gd) * 96).toFixed(1), gy0 = (hr(gd + 400) * 96).toFixed(1), shine = gd % 8 === 7, gop = shine && moving ? (.2 + .8 * (.5 + .5 * Math.sin(2 * Math.PI * (ph * 2 + hr(gd + 3))))).toFixed(2) : (shine ? '.7' : '1'); o += '<circle cx="' + gx0 + '" cy="' + gy0 + '" r="' + (shine ? 1.2 + hr(gd + 80) : 1.4 + hr(gd + 80) * 2.2).toFixed(1) + '" fill="' + GC[gd % 8] + '" opacity="' + gop + '"/>'; }
      o += '</pattern><linearGradient id="' + u + 'gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".38" stop-color="#fff"/><stop offset=".58" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="' + u + 'gm"><rect width="840" height="1188" fill="url(#' + u + 'gf)"/></mask></defs>' +
        '<rect width="840" height="1188" fill="#e2a7b7"/><rect width="840" height="1188" fill="url(#' + u + 'gl)" mask="url(#' + u + 'gm)"/>' +
        T(420, 170, w('top'), {size:30, weight:600, fill:'#ffffff', ls:8, fit:700}) +
        T(420, 320, w('big1'), {size:128, font:F_DISPLAY, weight:400, fill:'#ffffff', ls:4, fit:760, k:.72, stroke:'#5c1f55', sw:4}) +
        T(420, 452, w('big2'), {size:100, font:F_DISPLAY, weight:400, fill:'#ffffff', ls:2, fit:760, k:.68, stroke:'#5c1f55', sw:4}) +
        T(420, 620, w('pre'), {size:28, weight:600, fill:'#5a2347', ls:7, fit:700}) +
        T(420, 730, d.name || 'Our birthday star', {size:104, font:F_DISPLAY, italic:true, weight:400, fill:'#5a2347', fit:700, k:.5}) +
        T(420, 814, turning, {size:34, weight:600, fill:'#5a2347', ls:5, fit:700}) +
        T(420, 906, w('date').toUpperCase(), {size:26, weight:600, fill:'#5a2347', ls:4, fit:700}) +
        T(420, 950, w('time').toUpperCase(), {size:26, weight:600, fill:'#5a2347', ls:4, fit:700}) +
        T(420, 994, w('venue').toUpperCase(), {size:26, weight:600, fill:'#5a2347', ls:4, fit:700});
    }
    return o + '</svg>';
  }
  // "What the kids will be doing": a schedule panel added under the card, in the design's colours.
  var PANEL = {
    disco:{bg:'#f7ddd4', card:'#fff7f3', head:'#c23f7d', time:'#d8508c', text:'#5b2a3f', line:'#f1c3d3'},
    confetti:{bg:'#fbf7ef', card:'#ffffff', head:'#e8553f', time:'#e8553f', text:'#2a2140', line:'#f3dccf'},
    glitter:{bg:'#e2a7b7', card:'#fbeef2', head:'#5a2347', time:'#7a2e6e', text:'#5a2347', line:'#e8c4d0'}
  };
  function schedPanel(tpl, rows, y0){
    var p = PANEL[tpl] || PANEL.disco, top = y0 + 136, gap = 58, h = 176 + rows.length * gap;
    var s = '<rect y="' + y0 + '" width="840" height="' + h + '" fill="' + p.bg + '"/><rect x="60" y="' + (y0 + 16) + '" width="720" height="' + (h - 52) + '" rx="32" fill="' + p.card + '"/>' +
      T(420, y0 + 80, 'WHAT THE KIDS WILL BE DOING', {size:26, weight:800, fill:p.head, ls:4, fit:640});
    if (rows.length > 1) s += '<line x1="282" y1="' + (top - 9) + '" x2="282" y2="' + (top - 9 + (rows.length - 1) * gap) + '" stroke="' + p.line + '" stroke-width="4"/>';
    rows.forEach(function(r, i){
      var y = top + i * gap;
      s += T(256, y, r.time, {size:27, weight:800, fill:p.time, anchor:'end', fit:180, k:.55}) + '<circle cx="282" cy="' + (y - 9) + '" r="8" fill="' + p.time + '"/>' +
        T(306, y, r.what, {size:27, weight:600, fill:p.text, anchor:'start', fit:440, k:.52});
    });
    return {svg:s, h:h};
  }
  // With the schedule shown, the card is trimmed just below its last line of details, so the schedule follows straight on.
  var CARD_END = {disco:1000, confetti:1022, glitter:1028};
  function invFull(tpl, d, u, rows){
    var base = invSVG(tpl, d, u, S.words);
    if (!rows || !rows.length) return {svg:base, h:1188};
    var cut = CARD_END[tpl] || 1188, P = schedPanel(tpl, rows, cut), H = cut + P.h;
    return {svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 840 ' + H + '" width="840" height="' + H + '">' + base.slice(base.indexOf('>') + 1, base.lastIndexOf('</svg>')) + P.svg + '</svg>', h:H};
  }
  function schedRows(){ return S.schedEdited ? S.sched : scheduleRows(S); }
  function inviteRows(){ return S.schedOn === false ? [] : schedRows().filter(function(r){ return (r.time + r.what).trim(); }); }
  function ordinal(n){ n = +n; var s = (n % 100 >= 11 && n % 100 <= 13) ? 'th' : ({1:'st',2:'nd',3:'rd'}[n % 10] || 'th'); return n + s; }
  function invData(s){
    var dt = s.date ? new Date(s.date + 'T00:00') : null;
    return {
      name: s.childName, age: s.childAge, ageLine: s.childAge ? ordinal(s.childAge) + ' Birthday' : 'Birthday',
      dateLine: dt ? dt.toLocaleDateString('en-SG', {weekday:'long', day:'numeric', month:'long'}) : 'Date to be confirmed',
      dayLine: dt ? dt.toLocaleDateString('en-SG', {weekday:'long'}) : 'Date', dayDate: dt ? dt.toLocaleDateString('en-SG', {month:'short', day:'numeric'}) : 'TBC',
      timeLine: s.time ? clock(s.time, 0) + ' – ' + clock(s.time, s.length) : 'Time to be confirmed', startLine: s.time ? 'at ' + clock(s.time, 0) : 'time TBC',
      venue: s.venue || 'Venue to be confirmed', rsvp: '' // no RSVP line on the cards
    };
  }
  function makeCaption(s){
    var e = EXP[s.experience], d = invData(s), sel = s.selected.map(function(id){ return BYID[id]; });
    var who = s.childName ? s.childName + '’s ' : 'a ';
    var lines = ['🎉 You’re invited to ' + who + (s.childAge ? ordinal(s.childAge) + ' birthday ' : 'birthday ') + 'squishy party! 🎉', ''];
    lines.push('📅 ' + d.dateLine); lines.push('⏰ ' + d.timeLine); lines.push('📍 ' + d.venue); lines.push('');
    var make = s.experience === 'both' ? 'their very own Jelly and Crunchy squishies' : 'their very own ' + e.name + ' squishy';
    lines.push('Every little guest gets to make ' + make + ' and decorate a take-home squishy capsule with rhinestone stickers ✨' + (s.wax ? ' Then we’ll crack open colourful wax shells to reveal them!' : ''));
    var extras = [];
    sel.forEach(function(p){
      if (p.cat === 'entertainment') extras.push(p.name.replace(/,.*$/, '').toLowerCase());
      if (p.cat === 'food' && extras.indexOf('party food') < 0) extras.push('party food');
      if (p.vendor === 'Bloom' && /backdrop|arch/i.test(p.name) && extras.indexOf('a balloon backdrop by Bloom') < 0) extras.push('a balloon backdrop by Bloom');
      if (p.cat === 'styling' && p.id === 's-favours') extras.push('party favour bags');
      if (p.cat === 'cake') extras.push('a birthday ' + (/cupcake/i.test(p.name) ? 'cupcake treat' : 'cake') + ' from ' + p.vendor);
    });
    if (extras.length) lines.push('There’ll also be ' + (extras.length > 1 ? extras.slice(0, -1).join(', ') + ' and ' + extras[extras.length - 1] : extras[0]) + ' 🎂');
    lines.push('');
    var rows = inviteRows();
    if (rows.length) { lines.push('🗓 What the kids will be doing:'); rows.forEach(function(r){ lines.push('• ' + [r.time, r.what].filter(Boolean).join(' – ')); }); lines.push(''); }
    lines.push('See you there! 💖');
    return lines.join('\n');
  }

  var invTimer = null, lastCanvas = null;
  function drawInvite(){
    clearTimeout(invTimer);
    invTimer = setTimeout(function(){
      var d = invData(S);
      // thumbnails
      $('tpl-grid').querySelectorAll('[data-tpl]').forEach(function(b){ var id = b.dataset.tpl; b.querySelector('.tpl-art').innerHTML = invSVG(id, d, 'th' + id, S.words); b.setAttribute('aria-checked', String(S.tpl === id)); b.tabIndex = S.tpl === id ? 0 : -1; });
      if (!S.schedEdited) buildSchedEditor();
      syncWordsEditor(d);
      var F = invFull(S.tpl, d, 'big', inviteRows()), svg = F.svg, img = new Image(), out = $('inv-img');
      out.height = F.h;
      if (!S.captionEdited) $('inv-caption').value = makeCaption(S);
      $('wa-link').href = 'https://wa.me/?text=' + encodeURIComponent($('inv-caption').value);
      if (gifURL && gifKey === svg) return; // keep showing the moving GIF until the design changes
      gifURL = null;
      img.onload = function(){
        var c = document.createElement('canvas'); c.width = 1240; c.height = Math.round(1240 * F.h / 840);
        var x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
        try { out.src = c.toDataURL('image/png'); lastCanvas = c; } catch (err) { out.src = img.src; lastCanvas = null; }
      };
      img.onerror = function(){ out.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); lastCanvas = null; };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }, 90);
  }
  function invFileName(){ return (S.childName ? S.childName.replace(/[^\w-]+/g, '-') + '-' : '') + 'squishy-party-invitation.png'; }
  function invStatus(msg){ put('copy-status', msg); }
  function withBlob(cb){ if (!lastCanvas || !lastCanvas.toBlob) { invStatus('Long-press or right-click the invitation to save or copy it.'); return; } lastCanvas.toBlob(function(b){ b ? cb(b) : invStatus('Long-press or right-click the invitation to save or copy it.'); }, 'image/png'); }
  /* Change any wording: one box per line of the chosen design, pre-filled. Edits are kept per design; a cleared box removes the line. */
  var wordsFor = null;
  function syncWordsEditor(d){
    var box = $('words-edit'); if (!box) return;
    S.words = S.words || {}; var own = S.words[S.tpl] || {}, defs = wordDefaults(S.tpl, d);
    if (wordsFor !== S.tpl) {
      wordsFor = S.tpl; box.textContent = '';
      WORD_FIELDS[S.tpl].forEach(function(f){
        var lab = el('label','field'), inp = document.createElement('input');
        lab.appendChild(document.createTextNode(f[1])); inp.maxLength = 60; inp.dataset.word = f[0]; inp.autocomplete = 'off';
        inp.addEventListener('input', function(){ (S.words[S.tpl] = S.words[S.tpl] || {})[f[0]] = inp.value; $('words-reset').hidden = false; drawInvite(); });
        lab.appendChild(inp); box.appendChild(lab);
      });
    }
    box.querySelectorAll('input[data-word]').forEach(function(inp){ var k = inp.dataset.word, has = Object.prototype.hasOwnProperty.call(own, k); if (document.activeElement !== inp) inp.value = has ? own[k] : defs[k]; });
    $('words-reset').hidden = !Object.keys(own).length;
  }

  /* Schedule for parents: filled in from the plan until a parent edits it, then kept as they wrote it. */
  function buildSchedEditor(){
    var box = $('sched-edit'); if (!box) return; box.textContent = '';
    schedRows().forEach(function(r, i){
      var row = el('div','sched-row'), t = document.createElement('input'), w = document.createElement('input'), x = el('button','sched-x');
      t.value = r.time; t.maxLength = 12; t.setAttribute('aria-label', 'Time, line ' + (i + 1)); t.className = 'sched-time';
      w.value = r.what; w.maxLength = 44; w.setAttribute('aria-label', 'What happens, line ' + (i + 1)); w.className = 'sched-what';
      x.type = 'button'; x.setAttribute('aria-label', 'Remove line ' + (i + 1)); x.appendChild(icon('i-x'));
      t.addEventListener('input', captureSched); w.addEventListener('input', captureSched);
      x.addEventListener('click', function(){ var rows = readSched(); rows.splice(i, 1); S.sched = rows; S.schedEdited = true; buildSchedEditor(); drawInvite(); });
      row.appendChild(t); row.appendChild(w); row.appendChild(x); box.appendChild(row);
    });
    $('sched-reset').hidden = !S.schedEdited;
  }
  function readSched(){ return [].map.call($('sched-edit').querySelectorAll('.sched-row'), function(r){ return {time:r.querySelector('.sched-time').value.trim(), what:r.querySelector('.sched-what').value.trim()}; }); }
  function captureSched(){ S.sched = readSched(); if (!S.schedEdited) track('schedule_edited', {}); S.schedEdited = true; $('sched-reset').hidden = false; drawInvite(); }

  /* Moving GIF: the same design drawn at 12 points of an animation loop, encoded right here in the browser. */
  function gifEncode(w, h, frames, delayCs){
    var samp = [], step = Math.max(1, Math.floor(frames.length * w * h / 30000)), f, p, o, i, c;
    for (f = 0; f < frames.length; f++) for (p = (f * 7) % step; p < w * h; p += step) { o = p * 4; samp.push([frames[f][o], frames[f][o + 1], frames[f][o + 2]]); }
    var boxes = [samp];
    while (boxes.length < 256) { // median cut into a 256-colour palette shared by every frame
      var bi = -1, best = 0, bc = 0;
      for (i = 0; i < boxes.length; i++) { var b = boxes[i]; if (b.length < 2) continue; var mn = [255,255,255], mx = [0,0,0];
        for (var j = 0; j < b.length; j++) for (c = 0; c < 3; c++) { var v = b[j][c]; if (v < mn[c]) mn[c] = v; if (v > mx[c]) mx[c] = v; }
        for (c = 0; c < 3; c++) if (mx[c] - mn[c] > best) { best = mx[c] - mn[c]; bi = i; bc = c; } }
      if (bi < 0) break;
      var B = boxes[bi]; B.sort(function(a, z){ return a[bc] - z[bc]; }); boxes.splice(bi, 1, B.slice(0, B.length >> 1), B.slice(B.length >> 1));
    }
    var pal = new Uint8Array(768), np = boxes.length;
    boxes.forEach(function(b, k){ var s = [0,0,0]; b.forEach(function(q){ s[0] += q[0]; s[1] += q[1]; s[2] += q[2]; }); for (var cc = 0; cc < 3; cc++) pal[k * 3 + cc] = Math.round(s[cc] / b.length); });
    var cache = new Int16Array(32768).fill(-1);
    function idx(r, g, b2){ var k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b2 >> 3), hit = cache[k]; if (hit >= 0) return hit;
      var bd = 1e9, bx = 0; for (var n = 0; n < np; n++) { var dr = pal[n * 3] - r, dg = pal[n * 3 + 1] - g, db = pal[n * 3 + 2] - b2, dd = dr * dr + dg * dg + db * db; if (dd < bd) { bd = dd; bx = n; } } cache[k] = bx; return bx; }
    var buf = new Uint8Array(1 << 20), len = 0;
    function put(x){ if (len >= buf.length) { var nb = new Uint8Array(buf.length * 2); nb.set(buf); buf = nb; } buf[len++] = x; }
    function put16(x){ put(x & 255); put((x >> 8) & 255); }
    function str(s){ for (var n = 0; n < s.length; n++) put(s.charCodeAt(n)); }
    function lzw(ind){ // GIF LZW, 8-bit codes, written in 255-byte sub-blocks
      put(8); var block = new Uint8Array(255), bl = 0, cur = 0, nbits = 0, size = 9, dict = new Map(), next = 258;
      function outByte(x){ block[bl++] = x; if (bl === 255) { put(255); for (var n = 0; n < 255; n++) put(block[n]); bl = 0; } }
      function emit(code){ cur |= code << nbits; nbits += size; while (nbits >= 8) { outByte(cur & 255); cur >>>= 8; nbits -= 8; } }
      emit(256); var prefix = ind[0];
      for (var n = 1; n < ind.length; n++) { var k = ind[n], key = (prefix << 8) | k, hit = dict.get(key);
        if (hit !== undefined) { prefix = hit; continue; }
        emit(prefix);
        if (next === 4096) { emit(256); dict.clear(); next = 258; size = 9; } else { if (next >= (1 << size)) size++; dict.set(key, next++); }
        prefix = k; }
      emit(prefix); emit(257); if (nbits > 0) outByte(cur & 255);
      if (bl) { put(bl); for (n = 0; n < bl; n++) put(block[n]); } put(0);
    }
    str('GIF89a'); put16(w); put16(h); put(0xF7); put(0); put(0); for (i = 0; i < 768; i++) put(pal[i]);
    put(0x21); put(0xFF); put(11); str('NETSCAPE2.0'); put(3); put(1); put16(0); put(0); // loop forever
    frames.forEach(function(px){
      put(0x21); put(0xF9); put(4); put(4); put16(delayCs); put(0); put(0);
      put(0x2C); put16(0); put16(0); put16(w); put16(h); put(0);
      var ind = new Uint8Array(w * h); for (var q = 0; q < w * h; q++) ind[q] = idx(px[q * 4], px[q * 4 + 1], px[q * 4 + 2]);
      lzw(ind);
    });
    put(0x3B); return buf.slice(0, len);
  }
  var gifURL = null, gifKey = '', gifBusy = false;
  function makeGif(){
    if (gifBusy) return; gifBusy = true;
    var btn = $('inv-gif'), N = 12, W = 480, d = invData(S), rows = inviteRows(), frames = [], H = Math.round(W * invFull(S.tpl, d, 'g', rows).h / 840);
    btn.disabled = true; btn.setAttribute('aria-busy','true'); invStatus('Making your moving GIF. This takes a few seconds…');
    var c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
    function done(msg){ gifBusy = false; btn.disabled = false; btn.removeAttribute('aria-busy'); invStatus(msg); }
    (function frame(i){
      if (i === N) {
        setTimeout(function(){
          try {
            var blob = new Blob([gifEncode(W, H, frames, 10)], {type:'image/gif'}); gifURL = URL.createObjectURL(blob); gifKey = invFull(S.tpl, d, 'big', rows).svg;
            $('inv-img').src = gifURL;
            var a = document.createElement('a'); a.href = gifURL; a.download = invFileName().replace(/\.png$/, '.gif'); document.body.appendChild(a); a.click(); a.remove();
            track('invitation_gif_saved', {design:S.tpl}); S.done.invite = true; render(false);
            done('Moving GIF saved. The preview now moves too: on a phone, long-press it and choose “Save to Photos”.');
          } catch (e) { done('Couldn’t make the GIF in this browser. Save the still image instead.'); }
        }, 20);
        return;
      }
      INV_PHASE = i / N; var svg = invFull(S.tpl, d, 'g', rows).svg; INV_PHASE = null;
      var im = new Image();
      im.onload = function(){ try { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); x.drawImage(im, 0, 0, W, H); frames.push(x.getImageData(0, 0, W, H).data); frame(i + 1); } catch (e) { done('Couldn’t make the GIF in this browser. Save the still image instead.'); } };
      im.onerror = function(){ done('Couldn’t make the GIF in this browser. Save the still image instead.'); };
      im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    })(0);
  }

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
    $('sched-on').addEventListener('change', function(e){ S.schedOn = e.target.checked; $('sched-box').classList.toggle('off', !S.schedOn); drawInvite(); });
    $('sched-add').addEventListener('click', function(){ S.sched = schedRows().concat([{time:'', what:''}]); S.schedEdited = true; buildSchedEditor(); var ts = $('sched-edit').querySelectorAll('.sched-time'); if (ts.length) ts[ts.length - 1].focus(); drawInvite(); });
    $('sched-reset').addEventListener('click', function(){ S.schedEdited = false; S.sched = null; buildSchedEditor(); drawInvite(); });
    $('inv-gif').addEventListener('click', makeGif);
    $('words-reset').addEventListener('click', function(){ if (S.words) delete S.words[S.tpl]; wordsFor = null; drawInvite(); });
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
      withBlob(function(b){ try { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = invFileName(); document.body.appendChild(a); a.click(); a.remove(); S.done.invite = true; render(false); invStatus('Invitation saved as an image, and “Send invitations” is ticked. Send it on WhatsApp with the caption below.'); } catch (e) { invStatus('Long-press or right-click the invitation to save it.'); } });
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
      {id:'invite', t:'Send invitations', sub:'Pick a design and share it on WhatsApp with the ready-made caption', act:['Make invitation', 'ready', 'tab-p-inv']},
      {id:'request', auto:true, done:!!S.requested, t:'Request availability', sub:'We confirm every partner and send you one quotation', act:['Go to request', 4]},
      {id:'tables', t:'Arrange tables and chairs', sub:'Your coordinator confirms how many for ' + s.participants + ' participants'},
      {id:'headcount', t:'Confirm the final headcount', sub:'About ' + s.participants + ' participants so far'},
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
    var team = ['Squishy DIY hosts and all materials: ' + EXP[s.experience].name + ' for ' + s.participants + ' participants', 'A squishy capsule and rhinestone stickers for everyone', 'For a birthday girl: a Birthday Girl sash and tiara to wear during the party (we take them back after)', 'One-time travel and 15-minute set-up, then pack-down'];
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
    var s = S, n = billable(s.participants), R = recommend(s);
    var shown = s.started;
    var T = totals(s), exp = EXP[s.experience];

    var exp0 = EXP[s.experience];
    // step 2
    ['both','jelly','crunchy'].forEach(function(e){ put('price-' + e, short(EXP[e].pax)); });
    var dup = s.experience === 'both', COPY = { both:'Make both textures: a smooth Jelly and a satisfying Crunchy. Both go home in a squishy capsule they decorate with our rhinestone stickers.', jelly:'Smooth, clear and endlessly squishable. It goes home in a squishy capsule they decorate with our rhinestone stickers.', crunchy:'Extra texture and that satisfying crunch. It goes home in a squishy capsule they decorate with our rhinestone stickers.' };
    put('exp-chosen', exp0.name); put('exp-title', exp0.name); put('exp-pp', short(exp0.pax));
    put('exp-eyebrow', dup ? 'Best value · two squishies each' : 'One squishy each');
    put('exp-copy', COPY[s.experience]); put('exp-n', s.participants);
    var fl = $('exp-feats'); fl.textContent = '';
    [dup ? 'Two squishies each' : 'One ' + exp0.name + ' squishy each', 'Take-home squishy capsule', 'DIY rhinestone stickers', '45 minutes of guided play', 'Birthday Girl sash & tiara to wear on the day'].forEach(function(t){ var li = el('li'); li.appendChild(icon('i-check')); li.appendChild(document.createTextNode(t)); fl.appendChild(li); });
    var expSum = exp0.pax * n + CONTAINER * n + (s.wax ? waxCents(s.experience, n) : 0) + LOGISTICS;
    put('pl-n', n); put('pl-diy', money((exp0.pax + CONTAINER) * n));
    put('pl-sub', short(exp0.pax) + ' ' + (dup ? 'Duo' : exp0.name) + ' + $2 squishy capsule, per person' + (s.participants < MIN_PAX ? ' (minimum 10)' : ''));
    put('wax-title', dup ? 'Wax Cracking duo deal!' : 'Wax Cracking');
    $('exp-panel').classList.toggle('is-duo', dup);
    renderHow(s.experience);
    if (put('exp-total', money(expSum))) { var et = $('exp-total'); et.classList.remove('bump'); void et.offsetWidth; et.classList.add('bump'); }
    put('wax-quantity', dup ? (n * 2) + ' squishies, two per person, at $2.50 each' : (n * exp0.per) + ' squishies to crack, one per person');
    put('wax-price', '+' + money(waxCents(s.experience, n)).replace('.00',''));
    var up = $('wax-up'); up.hidden = !dup; if (dup) put('wax-up', 'U.P. ' + money(300 * n * 2).replace('.00',''));
    put('tier-note', s.participants < MIN_PAX ? 'Minimum 10 participants: for ' + s.participants + ' we charge for 10, and spare materials are yours to keep.' : 'Minimum 10 participants.');

    // step 3: suggested add-ons are marked on the vendor cards (see syncStores)

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
    put('summary-exp', exp.short); put('summary-participants', s.participants); put('summary-length', lengthLabel(s.length));
    put('squishy-count', s.participants * exp.per); put('partner-count', s.selected.length);
    var bd = $('breakdown'); bd.textContent = '';
    function row(dt, dd, cls, ddcls){ var d = el('div', cls); d.appendChild(el('dt', null, dt)); d.appendChild(el('dd', ddcls, dd)); bd.appendChild(d); }
    bd.appendChild(el('div','grp','Main activity'));
    row('Squishy DIY total', money(T.found.reduce(function(a, f){ return a + f.cents; }, 0)));
    T.found.forEach(function(f){ row(f.sub, money(f.cents), 'bd-sub'); });
    if (T.partners.length) { bd.appendChild(el('div','grp','Partner services')); T.partners.forEach(function(x){ row((x.p.cat === 'cake' ? x.p.vendor + ': ' + x.p.name : x.p.name) + (x.p.basis === 'child' || x.p.basis === 'pax' ? ', ' + x.qty : '') + (x.p.status === 'demo' ? ' (demo price)' : ''), x.cents == null ? 'On quote' : money(x.cents), null, x.cents == null ? 'pend' : null); }); }
    $('pending-note').hidden = !T.pending.length || !shown;
    if (T.pending.length) put('pending-note', 'Not yet in your total: ' + T.pending.map(function(p){ return p.vendor + ' ' + p.name; }).join(', ') + '. Cake prices depend on size and flavour, so we add it to your quotation.');
    var totalTxt = shown ? money(T.total) + (T.pending.length ? '+' : '') : '—';
    put('total-price', totalTxt);
    put('per-child', shown ? money(Math.round(T.total / s.participants)) : '—');
    $('sum-acc').hidden = !shown; $('summary-hint').hidden = shown;

    // included
    put('child-squishy-title', s.experience === 'both' ? 'Two take-home squishies' : 'A take-home ' + exp.name + ' squishy');
    put('child-squishy-copy', s.experience === 'both' ? 'One Jelly and one Crunchy creation each, made in a 45-minute guided session.' : 'One ' + exp.name + ' creation each, made in a 45-minute guided session.');

    // schedule
    var PB = partyBlocks(s), blocks = PB.blocks, used = PB.used;
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

    // request step: fields prefilled from the plan (kept in sync both ways)
    [['req-date', s.date], ['req-time', s.time], ['req-end', s.end], ['req-address', s.venue], ['req-spot', s.spot], ['req-postal', s.postal]].forEach(function(p){ var e = $(p[0]); if (e && document.activeElement !== e && e.value !== (p[1] || '')) e.value = p[1] || ''; if (e) e.classList.toggle('prefilled', !!e.value); });

    // plan review (request step) + mobile
    put('recap-total', money(T.total) + (T.pending.length ? '+' : ''));
    CATS.forEach(function(c){ var k = s.selected.filter(function(id){ return BYID[id].cat === c.id; }).length, e = $('count-' + c.id); if (e) { e.textContent = k; e.dataset.n = k; } });
    put('theme-meta', {cobalt:'Cobalt', pink:'Pink', lemon:'Lemon'}[s.theme]);
    var rv = $('review-list'); rv.textContent = '';
    function rrow(a, b2, cls){ var d = el('div', cls); d.appendChild(el('dt', null, a)); if (b2 != null) d.appendChild(el('dd', null, b2)); rv.appendChild(d); }
    rrow('Main activity', null, 'grp');
    rrow('Squishy DIY total: ' + EXP[s.experience].name + ', ' + s.participants + ' participants', money(T.found.reduce(function(a, f){ return a + f.cents; }, 0)), 'rv-main');
    T.found.forEach(function(f){ rrow(f.sub, money(f.cents), 'rv-sub'); });
    if (T.partners.length) { rrow('Add-ons', null, 'grp'); T.partners.forEach(function(x){ var cs = x.p.custom ? customSummary(x.p.g || x.p.id) : ''; rrow((x.p.cat === 'cake' ? x.p.vendor + ': ' + x.p.name : x.p.name) + (x.p.status === 'demo' ? ' (demo price)' : '') + (cs ? ' · ' + cs : ''), x.cents == null ? 'On quote' : money(x.cents)); }); }
    put('review-total', money(T.total) + (T.pending.length ? '+' : ''));
    put('review-note', T.pending.length ? 'Cake prices are added to your quotation.' : '');
    put('mobile-caption', shown ? s.participants + ' participants · ' + exp.short + ' · ' + s.selected.length + ' add-on' + (s.selected.length === 1 ? '' : 's') : 'Your estimate starts at step 2');
    put('mobile-price', shown ? money(T.total) + (T.pending.length ? '+' : '') : s.participants + ' participants');
    $('mobile-price').classList.toggle('muted-price', !shown);
    if (announce) put('live', (msg ? msg + ' ' : '') + 'Estimated total ' + money(T.total) + (T.pending.length ? ' plus items pending price' : '') + '.');
  }

  /* ================= EVENTS ================= */
  var form = $('party-form');
  form.addEventListener('submit', function(e){ e.preventDefault(); }); // the planner form never submits; pressing Enter in a field must not reload the page
  function readForm(){
    var d = new FormData(form);
    S.participants = clamp(d.get('participants'), 1, 60);
    $('participants-warn').hidden = !(Number(d.get('participants')) > 60);
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
    if (e.target.name === 'participants') e.target.value = S.participants;
    readForm(); render(true);
    if (e.target.name === 'experience') track('experience_selected', {experience:S.experience});
    if (e.target.name === 'wax') track('wax_toggled', {on:S.wax, experience:S.experience});
  });
  form.querySelectorAll('[data-step]').forEach(function(b){ b.addEventListener('click', function(){ var i = $(b.dataset.step); i.value = clamp(Number(i.value) + Number(b.dataset.d), Number(i.min), Number(i.max)); readForm(); render(true); }); });

  // The yellow 'offline preview' notice only applies to the offline file, not the live site.
  if (isWeb()) { var pn = $('preview-notice'); if (pn) pn.hidden = true; }

  /* ---------- Referrals and where people came from ----------
     ?ref=MIA-K7Q2 is a friend's referral link (the friend's family gets nothing; the new customer gets $10 off).
     ?src=capsule says where the link was (capsule QR sticker, Instagram...). Both are remembered for 60 days on this
     device and sent with the request. Analytics only learns that a code or source was present, never the code. */
  var REF = (function(){
    var KEY = 'sp-ref', saved = {}, q = {};
    try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
    if (saved.at && Date.now() - saved.at > 60 * 864e5) saved = {};
    try { new URLSearchParams(location.search).forEach(function(v, k){ q[k] = v; }); } catch (e) {}
    var code = String(q.ref || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 16);
    var src = String(q.src || q.utm_source || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24);
    if (code) { saved.code = code; saved.at = Date.now(); track('referral_link_opened', {}); }
    if (src) { saved.source = src; saved.at = saved.at || Date.now(); track('arrived_from', {source:src}); }
    try { if (code || src) localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {}
    return saved;
  })();
  if (REF.code) { $('ref-banner').hidden = false; $('ref-code').value = REF.code; }
  // Capsule QR sticker: one printed QR for every lid, so the offer comes from the source, not a personal code
  if (REF.source === 'capsule') {
    $('offer').hidden = false; $('sticker-field').hidden = false;
    if (!REF.code) { $('ref-banner').hidden = false; $('ref-banner').querySelector('span').innerHTML = 'Scanned a squishy capsule? <b>$10 off your first hosted party</b> is added to your request.'; }
  }
  function refHint(){
    var v = $('ref-code').value.trim(), ok = !v || /^[A-Za-z]{2,8}-[A-Za-z2-9]{4}$/.test(v), h = $('ref-hint');
    h.textContent = !v ? 'From a friend? New customers get $10 off their first hosted party.' : ok ? 'Thanks! We’ll take $10 off your quotation once we’ve checked the code.' : 'Codes look like MIA-K7Q2. Please check it, or leave it empty.';
    h.classList.toggle('err', !ok); $('ref-code').toggleAttribute('aria-invalid', !ok);
  }
  $('ref-code').addEventListener('input', refHint); refHint();

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
  // Four planner steps, then a "Get ready" view (to-do list, schedule, invitation) that sits outside the stepper.
  // View 5 is that page; its route is #plan-ready. Section ids: step 4 (Request) is #wstep-5, Get ready is #wstep-4.
  var STEPS = ['The basics','Squishy DIY','Add-ons','Request','Get ready'], SECTION = [null, 'wstep-1', 'wstep-2', 'wstep-3', 'wstep-5', 'wstep-4'], LAST = 4, READY = 5, cur = 1, reached = 1;
  function route(k){ return k === READY ? '#plan-ready' : '#plan-' + k; }
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
    // Get ready opens once the planner has reached Request (or a request was sent); otherwise steps unlock one at a time.
    k = k === READY && (reached >= LAST || S.requested) ? READY : Math.max(1, Math.min(LAST, k, reached + 1)); reached = Math.max(reached, Math.min(k, LAST));
    if (planV.hidden && !S.openedOnce) { S.openedOnce = true; track('planner_opened'); }
    if (k !== cur || planV.hidden) track('step_viewed', {step:k, step_name:STEPS[k - 1]});
    cur = k;
    if (k >= 2 && !S.started) { S.started = true; render(false); }
    homeV.hidden = true; planV.hidden = false; document.body.classList.add('planning'); document.body.classList.toggle('ready-view', k === READY);
    for (var i = 1; i <= READY; i++) $(SECTION[i]).hidden = i !== k;
    $('stepper').querySelectorAll('li').forEach(function(li, i){
      if (i + 1 === READY) li.className = 'ready-step ' + (k === READY ? 'current' : reached >= LAST || S.requested ? 'open' : 'locked');
      else li.className = i + 1 < k ? 'done' : i + 1 === k ? 'current' : (i + 1 <= reached ? 'done' : 'locked');
      var a = li.querySelector('a'); if (i + 1 === k) a.setAttribute('aria-current','step'); else a.removeAttribute('aria-current'); });
    put('wiz-count', k === READY ? 'Next steps' : 'Step ' + k + ' of ' + LAST); put('wiz-name', STEPS[k - 1]);
    $('wiz-back').lastChild.textContent = k === 1 ? 'Home' : k === READY ? 'Back to request' : 'Back';
    var nx = $('wiz-next'), nm = $('wiz-next-m');
    nx.hidden = k >= LAST; nx.firstChild.textContent = k < LAST ? 'Next: ' + STEPS[k] + ' ' : '';
    nm.textContent = k < LAST ? 'Next' : 'Send request'; nm.hidden = k === READY || (k === LAST && !!S.requested);
    window.scrollTo(0, 0);
    var h = $(k === READY ? 'ws4-h' : k === LAST ? 'ws5-h' : 'ws' + k + '-h'); if (h && focus) h.focus({preventScroll:true});
  }
  function go(target, push){
    var m = /^#?plan-([1-4]|ready)$/.exec(target || '');
    if (m) showStep(m[1] === 'ready' ? READY : +m[1], true); else showHome((target || '').replace('#',''));
    if (push !== false && canHistory()) { try { history.pushState({t:target}, '', m ? route(cur) : '#' + ((target || '').replace('#','') || 'top')); } catch (e) {} }
  }
  function goReady(tabId){ go('#plan-ready'); var t = tabId && $(tabId); if (t) selectTab(t, false); }
  // Every in-page link goes through go(), with the default jump prevented.
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
    var href = a.getAttribute('href'); if (href === '#') return;
    e.preventDefault();
    if (a.hasAttribute('data-tab-link')) { var t = $(a.dataset.tabLink); if (t) selectTab(t, false); }
    go(href);
  });
  window.addEventListener('popstate', function(){ var h = ''; try { h = location.hash; } catch (e) {} go(h || '#top', false); });
  $('wiz-next').addEventListener('click', function(){ if (cur < LAST) go(route(cur + 1)); });
  $('wiz-next-m').addEventListener('click', function(){ if (cur < LAST) go(route(cur + 1)); else if (cur === LAST) $('booking-submit').click(); });
  $('wiz-back').addEventListener('click', function(){ go(cur === READY ? route(LAST) : cur > 1 ? route(cur - 1) : '#top'); });
  (function(){ var h = ''; try { h = location.hash; } catch (e) {} if (/^#plan-([1-4]|ready)$/.test(h)) go(h, false); })();
  // #care (sent on WhatsApp after the party) opens the squishy care answer in the FAQ
  (function(){ var h = ''; try { h = location.hash; } catch (e) {} if (h !== '#care') return; $('tab-faq').click(); var d = $('care'); d.open = true; setTimeout(function(){ d.scrollIntoView({block:'center'}); }, 50); })();

  /* ================= REQUEST: validated, never sent offline ================= */
  var bf = $('booking-form'), err = $('booking-error');
  bf.addEventListener('input', function(e){ if (e.target.getAttribute('aria-invalid') === 'true' && e.target.checkValidity()) { e.target.removeAttribute('aria-invalid'); var m = e.target.parentElement.querySelector('.err-msg'); if (m) m.remove(); } });
  // Sandboxed previews block real form submission, so the button runs validation directly.
  bf.addEventListener('submit', function(e){ e.preventDefault(); sendRequest(); });
  $('booking-submit').addEventListener('click', function(e){ e.preventDefault(); sendRequest(); });
  // Request fields in step 4 write back to the plan, so the plan stays the single source of truth.
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
    $('note-family').hidden = co; $('note-company').hidden = !co;
  }
  bf.querySelectorAll('input[name="bookingFor"]').forEach(function(r){ r.addEventListener('change', function(){ syncBookingFor(); track('booking_for_selected', {booking_for:r.value}); }); });
  syncBookingFor();

  /* ---------- after sending: what happens next ---------- */
  function showSent(b){
    var co = b.bookingFor === 'company'; $('sent-company').hidden = !co; $('sent-family').hidden = co;
    if (co) put('sent-bill', ($('billing-email').value || $('req-email').value).trim());
    var nm = $('wiz-next-m'); if (nm) nm.hidden = true;
    var rs = document.querySelector('#stepper .ready-step'); if (rs) rs.className = 'ready-step open';
  }
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
      plan: { participants:S.participants, experience:S.experience, wax:S.wax, addons:S.selected.slice(), date:S.date, start:S.time, end:S.end, custom:customPayload() },
      contact: { parentName:d.get('parentName'), phone:phoneDigits(d.get('phone')), email:d.get('email'), venueName:(d.get('reqSpot') || '').trim(), companyName:isCompany() ? (d.get('companyName') || '').trim() : '', companyUen:isCompany() ? (d.get('companyUen') || '').trim() : '', billingEmail:isCompany() ? (d.get('billingEmail') || '').trim() : '', address:d.get('address'), postalCode:d.get('postalCode'), notes:d.get('notes') || '' },
      consent: !!bf.consent.checked, website: d.get('website') || '',
      bookingFor: isCompany() ? 'company' : 'family',
      referral: { code:($('ref-code').value || '').trim(), source:REF.source || '', returning:$('ref-returning').checked, sticker:REF.source === 'capsule' ? ($('sticker-name').value || '').trim() : '' },
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
          track('request_sent', {experience:S.experience, participants:S.participants, wax:S.wax, addons:S.selected.length, total_sgd:Math.round((res.body.totalCents || 0) / 100)});
          put('sent-ref', res.body.ref); put('sent-phone', '+65 ' + payload.contact.phone.replace(/(\d{4})(\d{4})/, '$1 $2'));
          put('sent-date', new Date(S.date + 'T00:00').toLocaleDateString('en-SG', {weekday:'long', day:'numeric', month:'long'}));
          put('sent-email', payload.contact.email); $('sent-mail').hidden = res.body.emailed === false;
          showSent(res.body);
          $('request-panel').hidden = true; $('sent-card').hidden = false; $('sent-card').focus();
          render(true, 'Request received. Reference ' + res.body.ref + (res.body.bookingFor === 'company' ? '. We’ll send a quotation and invoice once we confirm.' : '. We’ll send a quotation once we confirm.'));
          return;
        }
        if (res.body && res.body.field === 'email') { OTP.verified = ''; otpUI(); }
        fail(res.status === 429 ? 'You’ve sent a few requests just now. Please wait a minute and try again.' : (res.status === 400 || res.status === 503) && res.body.error ? res.body.error : 'We couldn’t send your request just now. Please try again in a minute.');
      })
      .catch(function(){ clearTimeout(timer); fail('We couldn’t reach our server. Please check your connection and try again.'); });
    function fail(msg){ track('request_failed', {reason:msg.slice(0, 60)}); btn.removeAttribute('aria-busy'); btn.disabled = false; btn.textContent = 'Send my request'; err.hidden = false; err.textContent = msg + ' Your request has not been sent.'; err.focus(); }
  }
  document.querySelectorAll('[data-ready]').forEach(function(b){ b.addEventListener('click', function(){ goReady(b.dataset.ready); }); });



  /* ================= FOR COMPANIES: rate card + quick quote ================= */
  // The rate card reads the same price list as the planner, so the two never disagree.
  (function(){
    var rl = $('rate-list'), rx = $('rate-extras'); if (!rl) return;
    function rateRow(ul, name, sub, price, tag){ var li = el('li'), d = el('div'), b = el('b', null, name); if (tag) b.appendChild(el('span','rate-tag', tag)); d.appendChild(b); if (sub) d.appendChild(el('small', null, sub)); li.appendChild(d); li.appendChild(el('strong', null, price)); ul.appendChild(li); }
    rateRow(rl, 'Jelly', 'One smooth, clear squishy each', short(EXP.jelly.pax));
    rateRow(rl, 'Crunchy', 'One squishy packed with crunchy toppings', short(EXP.crunchy.pax));
    rateRow(rl, 'Duo', 'One Jelly and one Crunchy each', short(EXP.both.pax), 'Best value');
    rateRow(rl, 'Take-home squishy capsule', 'Decorated with rhinestone stickers', '+' + short(CONTAINER));
    rateRow(rx, 'Wax Cracking', 'Crack a wax shell to reveal each squishy', '+' + short(WAX) + ' / squishy');
    rateRow(rx, 'Your logo on the capsule stickers', null, 'In your quote');
    rateRow(rx, 'Extra hosts for bigger groups', null, 'In your quote');
    rateRow(rx, 'Travel & set-up', 'Once per event, up to 2 hours on site', short(LOGISTICS));
    var n = 30; put('rate-example', 'Example: Duo for ' + n + ' people = ' + short((EXP.both.pax + CONTAINER) * n + LOGISTICS) + ' in total. Minimum ' + MIN_PAX + ' participants; up to 60 per session, ask us about bigger groups.');
  })();
  // "Plan your company event" opens the same planner with "A company" already chosen in the Request step,
  // so companies get the same email code and confirmation email as everyone else.
  document.querySelectorAll('[data-company]').forEach(function(a){
    a.addEventListener('click', function(){
      var r = bf.querySelector('input[name="bookingFor"][value="company"]'); if (r) { r.checked = true; syncBookingFor(); }
      track('company_planner_opened', {});
    });
  });

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
