/* Niguri Honda — Frame F4 · "How the Model Thinks"
   Pigment AI Frame. Static content (16 nodes, 28 edges, hand-written hover copy).
   No bindings, no network calls, self-contained styling. 16:9, scales to fit.
   Interactions: hover = light the causal chain; click a gold node = pulse to outputs. */
(function () {
  var W = 1600, H = 900;

  var NODES = [
    // GOLD — assumptions (col 0)
    { id:'G1', tone:'gold', cx:250, cy:160, title:'Production Plan', sub:'Production Plan Units',
      l1:'How many of each model Honda commits to build, week by week — the firm order.',
      l2:'Feeds: the Allocation Engine and every journey downstream.',
      l3:'One number per model per production week; history is locked, the future is yours to type over.' },
    { id:'G2', tone:'gold', cx:250, cy:286, title:'Journey Lead Times', sub:'Prod-to-Ship · Transit · Inbound Lag',
      l1:'How long each leg takes — factory to port, port to market, port to showroom-ready stock.',
      l2:'Feeds: Journey Phasing (every slice’s diary is built from these three numbers).',
      l3:'Weeks per leg: ship offset by model, transit and inbound by market — Portugal at 12+2, Germany at 5+1. Edit one cell, the geometry moves.' },
    { id:'G3', tone:'gold', cx:250, cy:412, title:'Demand Signal', sub:'Demand Rate',
      l1:'What each market actually sells in a week.',
      l2:'Feeds: Cover Snapshot, Unit Gap, and the drive-hand rule.',
      l3:'Weekly retail rate per model per market — and where it’s zero, allocation is impossible: that’s how a UK Civic can never satisfy German demand.' },
    { id:'G4', tone:'gold', cx:250, cy:538, title:'Allocation Policy', sub:'Target Cover · Priority · Min Allocation %',
      l1:'The allocation rules — the cover level to aim for, per-market priorities, and guaranteed minimums.',
      l2:'Feeds: Unit Gap and the Allocation Engine’s floors.',
      l3:'Three dials: a 3-week cover target, per-market priority weights, and guaranteed minimums (Poland 3%, Portugal 2%) satisfied before anything else.' },
    { id:'G5', tone:'gold', cx:250, cy:664, title:'Sell-Through Profile', sub:'Sell-Through Weight · Registration Lag',
      l1:'How fast stock becomes a sold car, and how long a sold car takes to become a registered one.',
      l2:'Feeds: Journey Phasing’s sale spread; Sales & Registrations.',
      l3:'Sales spread over three weeks after stocking (40/40/20 north, 30/40/30 south); registration follows wholesale by 2–4 weeks depending on market.' },
    { id:'G6', tone:'gold', cx:250, cy:790, title:'Sealed History 🔒', sub:'Allocation · Registrations · Floating actuals',
      l1:'What has actually happened — past allocations, real registrations, and shipments currently in transit.',
      l2:'Feeds: the Sealed Pipeline. Nothing overwrites it.',
      l3:'854 sealed allocations, 56k registered units, 63k shipped — the model plans forward from the truth, never over it.' },

    // VIOLET — engine (col 1)
    { id:'V1', tone:'violet', cx:800, cy:223, title:'Sealed Pipeline', sub:'Sealed Allocated · Shipped · Sold',
      l1:'Everything already committed and in motion — the future plan has to fit around it.',
      l2:'Fed by: Sealed History + Production Plan (≤ today). Feeds: Cover Snapshot.',
      l3:'Past cohorts take their actual allocations where they exist; their journeys are projected so the engine knows exactly what’s arriving where.' },
    { id:'V2', tone:'violet', cx:800, cy:349, title:'Cover Snapshot', sub:'Cover Snapshot',
      l1:'How many weeks of demand each market can cover from what it holds plus what’s already on its way.',
      l2:'Fed by: Sealed Pipeline ÷ Demand Signal. Feeds: Unit Gap, Network Health.',
      l3:'Taken once, one week after today — (everything shipped − everything sold) ÷ weekly demand, counting cars on the water as supply.' },
    { id:'V3', tone:'violet', cx:800, cy:475, title:'Unit Gap', sub:'Unit Gap',
      l1:'Who is short, and by how many cars — adjusted for distance, so far-away markets aren’t punished for the ocean.',
      l2:'Fed by: Cover Snapshot vs Allocation Policy + Journey Lead Times. Feeds: the Allocation Engine.',
      l3:'MAX(0, (target + transit + inbound) − snapshot cover) × demand × priority — a flat target would quietly starve your furthest markets; this one doesn’t.' },
    { id:'V4', tone:'violet', cx:800, cy:601, title:'Allocation Engine', sub:'Floor · Forward Gap Share · Allocated',
      l1:'Splits each week’s production across markets — guaranteed minimums first, the rest to the biggest shortfalls.',
      l2:'Fed by: Production Plan, Unit Gap, Allocation Policy, Sealed Pipeline (for past weeks). Feeds: Journey Phasing, Conservation Proof.',
      l3:'Guaranteed minimums off the top, remainder pro-rata to weighted gaps; if no market has a gap, it falls back to demand share — and past weeks are sealed to what actually happened.' },
    { id:'V5', tone:'violet', cx:800, cy:727, title:'Journey Phasing', sub:'Slice dates ×4 · Week Refs ×5',
      l1:'Works out the dates for every allocated slice: the week it ships, arrives, reaches stock, sells and registers.',
      l2:'Fed by: Allocation Engine + Journey Lead Times + Sell-Through Profile. Feeds: every flow on the right.',
      l3:'Pure date arithmetic — production week plus offsets, no loops, no recursion: change an assumption and only the touched slices re-date.' },

    // COPPER — outputs (col 2)
    { id:'C1', tone:'copper', cx:1350, cy:160, title:'Pipeline Flows', sub:'Shipped · Floating · Arrived · Into Stock',
      l1:'Where every unit is, every week — on the quay, on the water, landed, or showroom-ready.',
      l2:'Fed by: Journey Phasing. Feeds: the boards; Stock & Cover.',
      l3:'Statuses aren’t calculated — they’re just the slices counted wherever their diary says they are.' },
    { id:'C2', tone:'copper', cx:1350, cy:286, title:'Sales & Registrations', sub:'Units Sold · Units Registered',
      l1:'Wholesale first, retail after — the same cars counted at two points: sold to the dealer, then registered to a customer.',
      l2:'Fed by: Journey Phasing + Sell-Through Profile. Feeds: Stock & Cover; the boards.',
      l3:'Sold spreads over the sell-through weeks; registered is the same volume arriving 2–4 weeks later — the space between them is dealer-floor pipeline.' },
    { id:'C3', tone:'copper', cx:1350, cy:412, title:'Stock & Cover', sub:'Stock On Hand · Cover Weeks',
      l1:'What’s sitting in each market, and how many weeks it would last at current demand.',
      l2:'Fed by: Pipeline Flows − Sales. Feeds: the boards.',
      l3:'Cumulative in minus cumulative out — the classic stock roll-forward, built without a single circular reference.' },
    { id:'C4', tone:'copper', cx:1350, cy:538, title:'Network Health', sub:'Landed Cover + bands',
      l1:'Which markets are running tight, balanced, or overstocked — measured on stock that has actually landed.',
      l2:'Fed by: Cover Snapshot − Journey Lead Times. Feeds: B2’s gauges, B3’s pressure map.',
      l3:'Landed cover = snapshot minus transit and inbound; constrained under 2 weeks, balanced 2–4, aging above 5.' },
    { id:'C5', tone:'copper', cx:1350, cy:664, title:'Conservation Proof ✓', sub:'Allocation Conservation Check  ·  = 0',
      l1:'A continuous check that every car built is allocated exactly once — no more, no less.',
      l2:'Fed by: Production Plan vs Allocation Engine.',
      l3:'Plan minus the sum of allocations — permanently zero, and it’s on screen so you never have to take our word for it.' },
    { id:'C6', tone:'copper', cx:1350, cy:790, title:'The Boards', sub:'B0 · B1 · B2 · B3',
      l1:'The four boards: the network overview, one cohort traced, the allocation decision, the full model-by-market view.',
      l2:'Fed by: everything to its left.',
      l3:'Four boards, one model, zero hidden logic — what you just watched us drive.' }
  ];

  var EDGES = [
    ['G1','V4'],['G1','V1'],['G2','V5'],['G2','V3'],['G2','C4'],['G3','V2'],['G3','V3'],
    ['G4','V3'],['G4','V4'],['G5','V5'],['G5','C2'],['G6','V1'],
    ['V1','V2'],['V2','V3'],['V2','C4'],['V3','V4'],['V4','V5'],['V4','C5'],['G1','C5'],
    ['V5','C1'],['V5','C2'],
    ['C1','C3'],['C2','C3'],['C1','C6'],['C2','C6'],['C3','C6'],['C4','C6'],['C5','C6']
  ];

  var COLOF = { gold:0, violet:1, copper:2 };
  var NW = 400, NH = 84;
  var byId = {}; NODES.forEach(function(n){ n.col = COLOF[n.tone]; byId[n.id] = n; });

  // adjacency
  var fwd = {}, rev = {};
  NODES.forEach(function(n){ fwd[n.id] = []; rev[n.id] = []; });
  EDGES.forEach(function(e){ fwd[e[0]].push(e[1]); rev[e[1]].push(e[0]); });
  function reach(start, adj){ var seen={}, st=[start]; while(st.length){ var x=st.pop(); (adj[x]||[]).forEach(function(y){ if(!seen[y]){ seen[y]=true; st.push(y);} }); } return seen; }

  // ---- DOM scaffolding ----
  var doc = document, head = doc.head || doc.getElementsByTagName('head')[0];
  var style = doc.createElement('style');
  style.textContent = [
    'html,body{margin:0;height:100%;background:#0E1116;overflow:hidden;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}',
    '*{box-sizing:border-box;}',
    '#f4wrap{position:absolute;inset:0;background:radial-gradient(1200px 700px at 50% 12%,#161C26 0%,#0E1116 70%);}',
    '#f4stage{position:absolute;top:0;left:0;width:1600px;height:900px;transform-origin:top left;}',
    '#f4svg{position:absolute;top:0;left:0;width:1600px;height:900px;overflow:visible;}',
    '#f4svg path{fill:none;stroke:#39414E;stroke-width:2;transition:stroke .18s,stroke-width .18s,opacity .18s;}',
    '#f4svg path.dim{opacity:.10;}',
    '#f4svg path.lit{stroke-width:3.5;}',
    '#f4svg path.pulse{stroke-width:4;opacity:.95;pointer-events:none;}',
    '.cap{position:absolute;transform:translateX(-50%);text-align:center;font-size:17px;font-weight:600;',
    'letter-spacing:.04em;white-space:nowrap;}',
    '.node{position:absolute;border-radius:13px;border:1.5px solid;padding:12px 16px;',
    'transition:opacity .18s,box-shadow .18s,transform .12s;background-clip:padding-box;}',
    '.node .t{font-size:21px;font-weight:700;line-height:1.08;}',
    '.node .s{font-size:12.5px;margin-top:5px;line-height:1.18;opacity:.72;}',
    '.node.dim{opacity:.2;}',
    '.node.lit{box-shadow:0 0 0 1.5px currentColor, 0 8px 26px rgba(0,0,0,.45);transform:translateY(-1px);}',
    '.gold{background:#241C0C;border-color:#C8A24C;color:#C8A24C;}',
    '.gold .t{color:#F3DE9A;} .gold .s{color:#E7CE86;}',
    '.gold.clickable{cursor:pointer;}',
    '.violet{background:#1E1734;border-color:#8B6FD4;color:#8B6FD4;}',
    '.violet .t{color:#D6C8F7;} .violet .s{color:#B7A3EC;}',
    '.copper{background:#281809;border-color:#C77B45;color:#C77B45;}',
    '.copper .t{color:#F3C79C;} .copper .s{color:#E3A778;}',
    '#f4card{position:absolute;max-width:380px;background:#151A21;border:1px solid #2B333F;',
    'border-radius:11px;padding:14px 16px;box-shadow:0 14px 40px rgba(0,0,0,.55);opacity:0;',
    'transition:opacity .12s;pointer-events:none;z-index:60;}',
    '#f4card .c1{font-size:15px;color:#E7ECF3;line-height:1.35;}',
    '#f4card .c2{font-size:13px;margin-top:9px;line-height:1.3;font-weight:600;}',
    '#f4card .c3{font-size:13px;margin-top:9px;color:#9AA4B2;font-style:italic;line-height:1.35;}',
    '#f4hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);font-size:12.5px;',
    'color:#69727F;letter-spacing:.02em;white-space:nowrap;}'
  ].join('');
  head.appendChild(style);

  doc.body.innerHTML = '';
  var wrap = doc.createElement('div'); wrap.id = 'f4wrap';
  var stage = doc.createElement('div'); stage.id = 'f4stage';
  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = doc.createElementNS(svgNS, 'svg'); svg.id = 'f4svg'; svg.setAttribute('viewBox','0 0 '+W+' '+H);
  stage.appendChild(svg);

  // captions
  var caps = [
    { x:250, t:'ASSUMPTIONS — inputs you set', c:'#E7CE86' },
    { x:800, t:'CALCULATIONS — what the model does with them', c:'#B7A3EC' },
    { x:1350, t:'OUTPUTS — what you see and use', c:'#E3A778' }
  ];
  caps.forEach(function(c){ var d=doc.createElement('div'); d.className='cap'; d.textContent=c.t;
    d.style.left=c.x+'px'; d.style.top='40px'; d.style.color=c.c; stage.appendChild(d); });

  // edges
  function anchors(s, t){
    var sL=s.cx-NW/2, sR=s.cx+NW/2, tL=t.cx-NW/2;
    if (t.col > s.col){ // rightward
      var ax=sR, ay=s.cy, bx=tL, by=t.cy, mx=ax+(bx-ax)*0.5;
      return 'M'+ax+','+ay+' C'+mx+','+ay+' '+mx+','+by+' '+bx+','+by;
    }
    // same column, downward — bulge left
    var lx=sL, bulge=78, cy1=s.cy+(t.cy-s.cy)*0.25, cy2=s.cy+(t.cy-s.cy)*0.75;
    return 'M'+lx+','+s.cy+' C'+(lx-bulge)+','+cy1+' '+(tL-bulge)+','+cy2+' '+tL+','+t.cy;
  }
  var edgeEls = EDGES.map(function(e){
    var p = doc.createElementNS(svgNS,'path');
    p.setAttribute('d', anchors(byId[e[0]], byId[e[1]]));
    p.setAttribute('data-a', e[0]); p.setAttribute('data-b', e[1]);
    svg.appendChild(p); return { a:e[0], b:e[1], el:p };
  });

  // nodes
  var nodeEls = {};
  NODES.forEach(function(n){
    var d = doc.createElement('div');
    d.className = 'node ' + n.tone + (n.tone==='gold' ? ' clickable':'');
    d.style.left=(n.cx-NW/2)+'px'; d.style.top=(n.cy-NH/2)+'px';
    d.style.width=NW+'px'; d.style.height=NH+'px';
    d.innerHTML = '<div class="t">'+n.title+'</div><div class="s">'+n.sub+'</div>';
    stage.appendChild(d); nodeEls[n.id] = d;
    d.addEventListener('mouseenter', function(){ highlight(n); });
    d.addEventListener('mouseleave', reset);
    if (n.tone==='gold') d.addEventListener('click', function(ev){ ev.stopPropagation(); pulse(n); });
  });

  var card = doc.createElement('div'); card.id='f4card';
  var hint = doc.createElement('div'); hint.id='f4hint';
  hint.textContent = 'Hover a node to see how it works  ·  click a gold input to trace its effect';
  wrap.appendChild(stage); wrap.appendChild(card); wrap.appendChild(hint);
  doc.body.appendChild(wrap);

  // ---- layout scaling ----
  var S=1, OX=0, OY=0;
  function layout(){
    var cw=wrap.clientWidth, ch=wrap.clientHeight;
    S=Math.min(cw/W, ch/H); if(!isFinite(S)||S<=0) S=1;
    OX=(cw-W*S)/2; OY=(ch-H*S)/2;
    stage.style.transform='translate('+OX+'px,'+OY+'px) scale('+S+')';
  }
  layout();
  window.addEventListener('resize', layout);

  // ---- interactions ----
  function setChain(n){
    var anc=reach(n.id, rev), desc=reach(n.id, fwd);
    var up={}, down={}; up[n.id]=true; down[n.id]=true;
    Object.keys(anc).forEach(function(k){ up[k]=true; });
    Object.keys(desc).forEach(function(k){ down[k]=true; });
    var inChain={}; Object.keys(up).forEach(function(k){inChain[k]=true;}); Object.keys(down).forEach(function(k){inChain[k]=true;});
    NODES.forEach(function(m){
      var el=nodeEls[m.id];
      if(inChain[m.id]){ el.classList.remove('dim'); el.classList.add('lit'); }
      else { el.classList.add('dim'); el.classList.remove('lit'); }
    });
    edgeEls.forEach(function(ed){
      var lit=(up[ed.a]&&up[ed.b])||(down[ed.a]&&down[ed.b]);
      ed.el.classList.toggle('lit', lit);
      ed.el.classList.toggle('dim', !lit);
    });
  }
  function showCard(n){
    card.innerHTML='<div class="c1">'+n.l1+'</div><div class="c2" style="color:'+
      (n.tone==='gold'?'#E7CE86':n.tone==='violet'?'#B7A3EC':'#E3A778')+'">'+n.l2+'</div>'+
      '<div class="c3">'+n.l3+'</div>';
    card.style.opacity='1';
    var cw=wrap.clientWidth, ch=wrap.clientHeight;
    var nodeRightScreen=OX+(n.cx+NW/2)*S, nodeLeftScreen=OX+(n.cx-NW/2)*S, nodeMidY=OY+n.cy*S;
    var cardW=card.offsetWidth, cardH=card.offsetHeight, x, y;
    if(n.col<2){ x=nodeRightScreen+14; if(x+cardW>cw-8) x=nodeLeftScreen-14-cardW; }
    else { x=nodeLeftScreen-14-cardW; if(x<8) x=nodeRightScreen+14; }
    y=nodeMidY-cardH/2; if(y<8)y=8; if(y+cardH>ch-8)y=ch-8-cardH;
    card.style.left=x+'px'; card.style.top=y+'px';
  }
  function highlight(n){ setChain(n); showCard(n); }
  function reset(){
    card.style.opacity='0';
    NODES.forEach(function(m){ nodeEls[m.id].classList.remove('dim','lit'); });
    edgeEls.forEach(function(ed){ ed.el.classList.remove('dim','lit'); });
    clearPulse();
  }

  // ---- gold pulse ----
  var pulsePaths=[];
  function clearPulse(){ pulsePaths.forEach(function(p){ if(p.parentNode) p.parentNode.removeChild(p); }); pulsePaths=[]; }
  function pulse(n){
    setChain(n);
    clearPulse();
    // BFS depth over downstream edges
    var depth={}; depth[n.id]=0; var q=[n.id];
    var ordered=[];
    while(q.length){ var x=q.shift(); fwd[x].forEach(function(y){
      ordered.push({a:x,b:y,d:depth[x]});
      if(depth[y]===undefined){ depth[y]=depth[x]+1; q.push(y); }
    }); }
    ordered.forEach(function(o){
      var src=edgeEls.filter(function(e){return e.a===o.a&&e.b===o.b;})[0]; if(!src) return;
      var pp=src.el.cloneNode(true);
      pp.classList.remove('dim','lit'); pp.classList.add('pulse');
      pp.style.stroke='#F0CE6A';
      var len=src.el.getTotalLength();
      pp.style.strokeDasharray=len; pp.style.strokeDashoffset=len;
      pp.style.transition='none';
      svg.appendChild(pp); pulsePaths.push(pp);
      // stagger by depth
      (function(el,delay){ requestAnimationFrame(function(){ requestAnimationFrame(function(){
        el.style.transition='stroke-dashoffset .62s cubic-bezier(.4,0,.2,1)';
        el.style.transitionDelay=delay+'s';
        el.style.strokeDashoffset='0';
      }); }); })(pp, o.d*0.26);
    });
    // fade the pulse out after the ripple completes
    setTimeout(function(){ pulsePaths.forEach(function(p){ p.style.transition='opacity .5s'; p.style.opacity='0'; }); }, 2100);
  }

  wrap.addEventListener('click', function(){ reset(); });
})();
