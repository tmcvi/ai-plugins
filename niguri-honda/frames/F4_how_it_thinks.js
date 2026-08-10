/* Niguri Honda — Frame F4 · "How It Thinks"  (v2: plain language, Honda-on-white)
   Pigment AI Frame. Static content. No bindings, no network, self-contained.
   Palette: white bg · Honda red assumptions · charcoal calculations · white/red-accent outputs.
   Line 2 of each hover card is generated from the edge list. Interactions unchanged:
   hover = light the causal chain; click a red (assumption) node = pulse to outputs. */
(function () {
  var W = 1600, H = 900;

  var NODES = [
    // ASSUMPTIONS (red)  — col 0
    { id:'A1', tone:'assume', cx:250, cy:160, title:'Production Plan',
      l1:'How many of each model Honda commits to build, week by week.',
      l3:'One number per model per week. Past weeks are locked; future weeks are yours to change.' },
    { id:'A2', tone:'assume', cx:250, cy:286, title:'Lead Times',
      l1:'How long each leg of the journey takes: factory to port, port to market, port to showroom-ready.',
      l3:'Weeks per leg — Portugal 12+2, Germany 5+1. Change one number and every affected date moves.' },
    { id:'A3', tone:'assume', cx:250, cy:412, title:'Weekly Demand',
      l1:'What each market actually sells in a week.',
      l3:'A weekly rate per model per market. Where it is zero, no allocation is possible — a right-hand-drive Civic can never go to Germany.' },
    { id:'A4', tone:'assume', cx:250, cy:538, title:'Allocation Rules',
      l1:'The rules for sharing production: the stock level to aim for, market priorities, and guaranteed minimums.',
      l3:'Three settings: a 3-week cover target, a priority weight per market, and minimum shares (Poland 3%, Portugal 2%) met before anything else.' },
    { id:'A5', tone:'assume', cx:250, cy:664, title:'Sales & Registration Timing',
      l1:'How quickly stock sells once it lands, and how long a sale takes to become a registration.',
      l3:'Sales spread over three weeks after stocking (40/40/20 in the north, 30/40/30 in the south); registration follows 2–4 weeks after the sale.' },
    { id:'A6', tone:'assume', cx:250, cy:790, title:'Actuals 🔒',
      l1:'What has already happened: past allocations, real registrations, shipments in transit right now.',
      l3:'854 past allocations, 56,000 registered units, 63,000 shipped. The model plans forward from these facts — it never overwrites them.' },

    // CALCULATIONS (charcoal) — col 1
    { id:'K1', tone:'calc', cx:800, cy:223, title:'Units Already In Motion',
      l1:'Everything committed and moving — the future plan has to fit around it.',
      l3:'Past weeks take their real allocations; their journeys are projected so the model knows what is arriving where, and when.' },
    { id:'K2', tone:'calc', cx:800, cy:349, title:'Weeks of Cover',
      l1:'How many weeks of demand each market can meet from what it holds plus what is already on its way.',
      l3:'Measured once, one week ahead of today: (everything shipped − everything sold) ÷ weekly demand, counting units at sea as supply.' },
    { id:'K3', tone:'calc', cx:800, cy:475, title:'Shortfall by Market',
      l1:'Which markets are short, and by how many units — adjusted for distance so far-away markets are not penalised for the ocean.',
      l3:'Shortfall = (target + journey time − weeks of cover) × demand × priority. Against a flat target, the furthest markets would always look overstocked and quietly starve.' },
    { id:'K4', tone:'calc', cx:800, cy:601, title:'Allocation',
      l1:'Splits each week’s production across markets: guaranteed minimums first, the rest in proportion to each market’s shortfall.',
      l3:'If no market is short, it falls back to sharing by demand. Past weeks are locked to what actually happened.' },
    { id:'K5', tone:'calc', cx:800, cy:727, title:'Journey Dates',
      l1:'Works out the dates for every shipment: the week it ships, arrives, reaches stock, sells and registers.',
      l3:'Pure date arithmetic — production week plus the lead times. No loops, no recursion: change an assumption and only the affected shipments re-date.' },

    // OUTPUTS (white, red accent) — col 2
    { id:'O1', tone:'output', cx:1350, cy:160, title:'Units by Stage',
      l1:'Where every unit is, every week: at the factory, at sea, landed, or showroom-ready.',
      l3:'The stages are not calculated — units are simply counted wherever their journey dates place them.' },
    { id:'O2', tone:'output', cx:1350, cy:286, title:'Sales & Registrations',
      l1:'The same units counted at two points: sold to the dealer, then registered to a customer.',
      l3:'Registrations follow sales by 2–4 weeks depending on market; the gap between the two lines is stock on dealer floors.' },
    { id:'O3', tone:'output', cx:1350, cy:412, title:'Stock on Hand & Cover',
      l1:'What is sitting in each market, and how many weeks it would last at current demand.',
      l3:'Everything in minus everything out — the standard stock roll-forward, built without a single circular reference.' },
    { id:'O4', tone:'output', cx:1350, cy:538, title:'Stock Position by Market',
      l1:'Which markets are running tight, balanced, or overstocked — measured on stock that has actually landed.',
      l3:'Cover with the journey stripped back out. Tight below 2 weeks, balanced 2–4, overstocked above 5.' },
    { id:'O5', tone:'output', cx:1350, cy:664, title:'Allocation Check ✓',
      l1:'A continuous check that every unit built is allocated exactly once — no more, no less.',
      l3:'Production minus the sum of allocations, permanently zero — and it is on screen so you never have to take our word for it.' },
    { id:'O6', tone:'output', cx:1350, cy:790, title:'Boards & Reports',
      l1:'The four boards: the network overview, one production week traced, the allocation decision, the full model-by-market view.',
      l3:'Four boards, one model, no hidden logic.' }
  ];

  var EDGES = [
    ['A1','K4'],['A1','K1'],['A2','K5'],['A2','K3'],['A2','O4'],['A3','K2'],['A3','K3'],
    ['A4','K3'],['A4','K4'],['A5','K5'],['A5','O2'],['A6','K1'],
    ['K1','K2'],['K2','K3'],['K2','O4'],['K3','K4'],['K4','K5'],['K4','O5'],['A1','O5'],
    ['K5','O1'],['K5','O2'],
    ['O1','O3'],['O2','O3'],['O1','O6'],['O2','O6'],['O3','O6'],['O4','O6'],['O5','O6']
  ];

  var COLOF = { A:0, K:1, O:2 };
  var NW = 400, NH = 88;
  var byId = {};
  NODES.forEach(function(n){ n.col = COLOF[n.id.charAt(0)]; n.clean = n.title.replace(/[🔒✓]/g,'').trim(); byId[n.id] = n; });

  // adjacency
  var fwd = {}, rev = {};
  NODES.forEach(function(n){ fwd[n.id] = []; rev[n.id] = []; });
  EDGES.forEach(function(e){ fwd[e[0]].push(e[1]); rev[e[1]].push(e[0]); });
  function reach(start, adj){ var seen={}, st=[start]; while(st.length){ var x=st.pop(); (adj[x]||[]).forEach(function(y){ if(!seen[y]){ seen[y]=true; st.push(y);} }); } return seen; }
  function names(ids){ return ids.map(function(i){ return byId[i].clean; }).join(', '); }
  // line 2 (feeds / fed by) generated from the edge list
  NODES.forEach(function(n){
    var parts = [];
    if (rev[n.id].length) parts.push('Fed by ' + names(rev[n.id]));
    if (fwd[n.id].length) parts.push('Feeds ' + names(fwd[n.id]));
    n.l2 = parts.join('   ·   ');
  });

  // ---- DOM ----
  var doc = document, head = doc.head || doc.getElementsByTagName('head')[0];
  var style = doc.createElement('style');
  style.textContent = [
    'html,body{margin:0;height:100%;background:#FFFFFF;overflow:hidden;',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}',
    '*{box-sizing:border-box;}',
    '#f4wrap{position:absolute;inset:0;background:#FFFFFF;}',
    '#f4stage{position:absolute;top:0;left:0;width:1600px;height:900px;transform-origin:top left;}',
    '#f4svg{position:absolute;top:0;left:0;width:1600px;height:900px;overflow:visible;}',
    '#f4svg path{fill:none;stroke:#C9C9CE;stroke-width:2;transition:stroke .18s,stroke-width .18s,opacity .18s;}',
    '#f4svg path.dim{opacity:.35;}',
    '#f4svg path.lit{stroke:#CC0000;stroke-width:3.5;}',
    '#f4svg path.pulse{stroke:#CC0000;stroke-width:4;opacity:.95;pointer-events:none;}',
    '.cap{position:absolute;transform:translateX(-50%);text-align:center;font-size:12px;font-weight:700;',
    'letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;color:#6E6E73;}',
    '.node{position:absolute;border-radius:12px;padding:10px 16px;display:flex;align-items:center;',
    'justify-content:center;text-align:center;font-size:20px;font-weight:600;line-height:1.14;',
    'letter-spacing:.005em;',
    'font-family:"Palatino Linotype",Palatino,"Book Antiqua",Georgia,"Times New Roman",serif;',
    'transition:opacity .18s,box-shadow .18s,transform .12s;}',
    '.node.dim{opacity:.2;}',
    '.node.lit{box-shadow:0 0 0 2px #CC0000, 0 8px 22px rgba(26,26,26,.18);transform:translateY(-1px);}',
    '.assume{background:#CC0000;color:#FFFFFF;}',
    '.assume.clickable{cursor:pointer;}',
    '.calc{background:#1A1A1A;color:#FFFFFF;}',
    '.output{background:#FFFFFF;color:#1A1A1A;border:1.5px solid #D6D6DB;border-left:4px solid #CC0000;}',
    '#f4card{position:absolute;max-width:380px;background:#FFFFFF;border:1px solid #D6D6DB;',
    'border-radius:10px;padding:14px 16px;box-shadow:0 2px 8px rgba(26,26,26,.10);opacity:0;',
    'transition:opacity .12s;pointer-events:none;z-index:60;}',
    '#f4card .c1{font-size:15px;color:#1A1A1A;line-height:1.4;font-weight:600;}',
    '#f4card .c2{font-size:12.5px;margin-top:9px;line-height:1.35;color:#CC0000;font-weight:600;}',
    '#f4card .c3{font-size:13px;margin-top:9px;color:#6E6E73;line-height:1.4;}',
    '#f4hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);font-size:12px;',
    'color:#6E6E73;letter-spacing:.02em;white-space:nowrap;}'
  ].join('');
  head.appendChild(style);

  doc.body.innerHTML = '';
  var wrap = doc.createElement('div'); wrap.id = 'f4wrap';
  var stage = doc.createElement('div'); stage.id = 'f4stage';
  var svgNS = 'http://www.w3.org/2000/svg';
  var svg = doc.createElementNS(svgNS, 'svg'); svg.id = 'f4svg'; svg.setAttribute('viewBox','0 0 '+W+' '+H);
  stage.appendChild(svg);

  var caps = [
    { x:250,  t:'ASSUMPTIONS — the numbers you set' },
    { x:800,  t:'CALCULATIONS — what the model does with them' },
    { x:1350, t:'OUTPUTS — what you see and use' }
  ];
  caps.forEach(function(c){ var d=doc.createElement('div'); d.className='cap'; d.textContent=c.t;
    d.style.left=c.x+'px'; d.style.top='44px'; stage.appendChild(d); });

  // orthogonal ("square") routing, elbows in the column gutters; i = edge index for lane jitter
  function anchors(s, t, i){
    var sL=s.cx-NW/2, sR=s.cx+NW/2, tL=t.cx-NW/2;
    if (t.col > s.col){
      var ax=sR, ay=s.cy, bx=tL, by=t.cy, mx=tL-75;
      return 'M'+ax+' '+ay+' L'+mx+' '+ay+' L'+mx+' '+by+' L'+bx+' '+by;
    }
    var b=42 + (i % 6) * 11, gx=sL-b;   // same column, elbow out to the left gutter
    return 'M'+sL+' '+s.cy+' L'+gx+' '+s.cy+' L'+gx+' '+t.cy+' L'+tL+' '+t.cy;
  }
  // arrowhead marker (auto-matches the path stroke colour via context-stroke)
  var defs = doc.createElementNS(svgNS,'defs');
  defs.innerHTML = '<marker id="f4arrow" markerWidth="12" markerHeight="12" refX="10.5" refY="5.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L11,5.5 L0,11 Z" fill="context-stroke"></path></marker>';
  svg.appendChild(defs);
  var edgeEls = EDGES.map(function(e, i){
    var p = doc.createElementNS(svgNS,'path');
    p.setAttribute('d', anchors(byId[e[0]], byId[e[1]], i));
    p.setAttribute('marker-end', 'url(#f4arrow)');
    svg.appendChild(p); return { a:e[0], b:e[1], el:p };
  });

  var nodeEls = {};
  NODES.forEach(function(n){
    var d = doc.createElement('div');
    d.className = 'node ' + n.tone + (n.tone==='assume' ? ' clickable':'');
    d.style.left=(n.cx-NW/2)+'px'; d.style.top=(n.cy-NH/2)+'px';
    d.style.width=NW+'px'; d.style.height=NH+'px';
    d.textContent = n.title;
    stage.appendChild(d); nodeEls[n.id] = d;
    d.addEventListener('mouseenter', function(){ highlight(n); });
    d.addEventListener('mouseleave', reset);
    if (n.tone==='assume') d.addEventListener('click', function(ev){ ev.stopPropagation(); pulse(n); });
  });

  var card = doc.createElement('div'); card.id='f4card';
  var hint = doc.createElement('div'); hint.id='f4hint';
  hint.textContent = 'Hover a node to see how it works  ·  click a red input to trace its effect';
  wrap.appendChild(stage); wrap.appendChild(card); wrap.appendChild(hint);
  doc.body.appendChild(wrap);

  var S=1, OX=0, OY=0;
  function layout(){
    var cw=wrap.clientWidth, ch=wrap.clientHeight;
    S=Math.min(cw/W, ch/H); if(!isFinite(S)||S<=0) S=1;
    OX=(cw-W*S)/2; OY=(ch-H*S)/2;
    stage.style.transform='translate('+OX+'px,'+OY+'px) scale('+S+')';
  }
  layout();
  window.addEventListener('resize', layout);

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
    var h='<div class="c1">'+n.l1+'</div>';
    if(n.l2) h+='<div class="c2">'+n.l2+'</div>';
    h+='<div class="c3">'+n.l3+'</div>';
    card.innerHTML=h; card.style.opacity='1';
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

  var pulsePaths=[];
  function clearPulse(){ pulsePaths.forEach(function(p){ if(p.parentNode) p.parentNode.removeChild(p); }); pulsePaths=[]; }
  function pulse(n){
    setChain(n);
    clearPulse();
    var depth={}; depth[n.id]=0; var q=[n.id]; var ordered=[];
    while(q.length){ var x=q.shift(); fwd[x].forEach(function(y){
      ordered.push({a:x,b:y,d:depth[x]});
      if(depth[y]===undefined){ depth[y]=depth[x]+1; q.push(y); }
    }); }
    ordered.forEach(function(o){
      var src=edgeEls.filter(function(e){return e.a===o.a&&e.b===o.b;})[0]; if(!src) return;
      var pp=src.el.cloneNode(true);
      pp.classList.remove('dim','lit'); pp.classList.add('pulse');
      var len=src.el.getTotalLength();
      pp.style.strokeDasharray=len; pp.style.strokeDashoffset=len; pp.style.transition='none';
      svg.appendChild(pp); pulsePaths.push(pp);
      (function(el,delay){ requestAnimationFrame(function(){ requestAnimationFrame(function(){
        el.style.transition='stroke-dashoffset .62s cubic-bezier(.4,0,.2,1)';
        el.style.transitionDelay=delay+'s';
        el.style.strokeDashoffset='0';
      }); }); })(pp, o.d*0.26);
    });
    setTimeout(function(){ pulsePaths.forEach(function(p){ p.style.transition='opacity .5s'; p.style.opacity='0'; }); }, 2100);
  }

  wrap.addEventListener('click', function(){ reset(); });
})();
