/* Niguri Honda — Frame F1 · Cover Map (two-panel + filters, incl. "All models"). Live-bound via PigmentSDK. Read-only.
   TOP: genuine IN-COUNTRY weeks of cover per market. Red = tight (<2) · near-white = balanced (2–4) · charcoal = long (>4).
   BOTTOM: units AT SEA (Units Floating) stacked by destination market.
   FILTERS: Base model (+ All) and Drive hand (LHD/RHD/All) → resolve one or many Models, re-scoping every subscription.
   Read views: VC in-country cover · VS stock · VA arrived · VF at-sea. Coordinate list: ModelList (Model).
   (Scenario / what-if write-back removed — was unreliable.) */
(function () {
  'use strict';
  var root = document.getElementById('app');
  if (root && root.__cleanup) root.__cleanup();
  if (!root) { root = document.body; }
  root.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;overflow:hidden;background:#FFFFFF;';
  var MODEL_DEFAULT = 'Civic LHD';
  var W0 = Date.UTC(2026, 7, 10);
  var WIN_START = Date.UTC(2026, 7, 3);
  var WIN_END = Date.UTC(2027, 1, 22);
  var C = { white:'#FFFFFF', red:'#CC0000', charcoal:'#1A1A1A', grey80:'#6E6E73', grey60:'#C9C9CE', grey40:'#E3E3E7', grey20:'#F7F7F8', na:'#EDEDF0' };
  var SERIF = '"Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif';
  var SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  var NS = 'http://www.w3.org/2000/svg';
  function hx(s){ s=s.replace('#',''); return [parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16)]; }
  function mix(a,b,t){ a=hx(a); b=hx(b); return 'rgb('+Math.round(a[0]+(b[0]-a[0])*t)+','+Math.round(a[1]+(b[1]-a[1])*t)+','+Math.round(a[2]+(b[2]-a[2])*t)+')'; }
  function clamp(x,lo,hi){ return x<lo?lo:(x>hi?hi:x); }
  function coverColor(cov){ if(cov==null||isNaN(cov))return C.na; if(cov<2)return mix('#CC0000','#F3D9D9',clamp(cov/2,0,1)); if(cov<=4)return '#FBFBFC'; return mix('#E3E3E7','#1A1A1A',clamp((cov-4)/6,0,1)); }
  function coverBand(cov){ if(cov==null||isNaN(cov))return 'no demand'; if(cov<2)return 'Tight'; if(cov<=4)return 'Balanced'; return 'Long cover'; }
  function greyRamp(i,n){ if(n<=1)return C.grey80; return mix('#D8D8DC','#33333A', i/(n-1)); }
  function el(t,a){ var e=document.createElementNS(NS,t); if(a)for(var k in a)e.setAttribute(k,a[k]); return e; }
  function h(t,css,txt){ var e=document.createElement(t); if(css)e.style.cssText=css; if(txt!=null)e.textContent=txt; return e; }
  function esc(s){ return String(s).replace(/[&<>]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;';}); }
  function weekDate(label){ var m=String(label).match(/(\d{4})-(\d{2})-(\d{2})/); if(!m)return null; return Date.UTC(+m[1],+m[2]-1,+m[3]); }
  function fmtWeek(ms){ if(ms==null)return '—'; var d=new Date(ms); var mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return d.getUTCDate()+' '+mo[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2); }
  function lastLabel(lbl){ if(Array.isArray(lbl)){ var v=lbl[lbl.length-1]; return (v&&typeof v==='object')?'':String(v); } return (lbl&&typeof lbl==='object')?'':String(lbl); }
  function num(v){ return (typeof v==='number'&&!isNaN(v))?v:(v==null?null:(isNaN(+v)?null:+v)); }
  function hasLoadingKind(arr){ if(!arr)return false; for(var i=0;i<arr.length;i++){ var it=arr[i]; if(Array.isArray(it)){ if(hasLoadingKind(it))return true; } else if(it&&typeof it==='object'&&it.kind==='loading')return true; } return false; }
  function isReady(d){ if(!d||!d.labels||!d.labels.columns)return false; return !hasLoadingKind(d.labels.rows)&&!hasLoadingKind(d.labels.columns)&&!hasLoadingKind(d.cells); }
  function grid(data){ var out={byMarket:{},weeks:[]}; if(!data||!data.labels)return out; var cols=data.labels.columns||[],rows=data.labels.rows||[],cells=data.cells||[]; var wk=[]; for(var c=0;c<cols.length;c++){ wk.push(weekDate(lastLabel(cols[c]))); } out.weeks=wk; for(var r=0;r<rows.length;r++){ var mkt=lastLabel(rows[r]); var row={}; for(var c2=0;c2<cols.length;c2++){ var w=wk[c2]; if(w==null)continue; row[w]=num(cells[c2]?cells[c2][r]:null); } out.byMarket[mkt]=row; } return out; }
  var state='loading', errMsg='', model=MODEL_DEFAULT;
  var baseModel='Civic', driveHand='LHD';
  var gc=null, gs=null, ga=null, gf=null, models=[];
  var hoverMkt=null, renderMarkets=[], renderN=0;
  var wrap=h('div','position:absolute;inset:0;display:flex;flex-direction:column;background:'+C.white+';'); root.appendChild(wrap);
  var header=h('div','flex:0 0 auto;padding:20px 40px 8px 40px;'); wrap.appendChild(header);
  var toprow=h('div','display:flex;justify-content:space-between;align-items:flex-start;gap:24px;'); header.appendChild(toprow);
  var titleBox=h('div',''); toprow.appendChild(titleBox);
  titleBox.appendChild(h('div','font:600 11px/1.2 '+SANS+';letter-spacing:.16em;text-transform:uppercase;color:'+C.grey80+';','Niguri · Honda — cover map'));
  titleBox.appendChild(h('div','margin-top:6px;font:400 26px/1.15 '+SERIF+';color:'+C.charcoal+';','Where cover runs tight — and where it piles up'));
  var sub=h('div','margin-top:4px;font:400 13px/1.4 '+SANS+';color:'+C.grey80+';'); titleBox.appendChild(sub);
  var pickBox=h('div','display:flex;gap:14px;align-items:flex-end;');
  function mkSelect(label){ var box=h('div','display:flex;flex-direction:column;gap:6px;align-items:flex-start;'); box.appendChild(h('div','font:600 10px/1 '+SANS+';letter-spacing:.12em;text-transform:uppercase;color:'+C.grey80+';',label)); var s=document.createElement('select'); s.style.cssText='font:600 14px/1 '+SANS+';color:'+C.charcoal+';background:'+C.white+';border:1px solid '+C.grey60+';border-radius:8px;padding:8px 12px;cursor:pointer;'; box.appendChild(s); pickBox.appendChild(box); return s; }
  var baseSel=mkSelect('Base model'); baseSel.style.minWidth='120px';
  var handSel=mkSelect('Drive'); handSel.style.minWidth='90px';
  toprow.appendChild(pickBox);
  baseSel.addEventListener('change', function(){ baseModel=baseSel.value; if(baseModel!=='All'){ var hs=handsByBase[baseModel]||[]; if(driveHand!=='All'&&hs.indexOf(driveHand)<0)driveHand=hs[0]||''; } resolveModel(); fillFilters(); setLoading(); scopeAll(); });
  handSel.addEventListener('change', function(){ driveHand=handSel.value; resolveModel(); setLoading(); scopeAll(); });
  var legend=h('div','display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:9px;font:500 12px/1 '+SANS+';color:'+C.charcoal+';');
  function sw(color,label,border){ var d=h('div','display:flex;gap:7px;align-items:center;'); var s=h('span','width:14px;height:14px;border-radius:3px;display:inline-block;background:'+color+';'); if(border)s.style.border='1px solid '+C.grey60; d.appendChild(s); d.appendChild(h('span','',label)); return d; }
  legend.appendChild(h('span','font-weight:700;color:'+C.charcoal+';','In-country cover:'));
  legend.appendChild(sw(C.red,'Tight — under 2 weeks'));
  legend.appendChild(sw('#FBFBFC','Balanced — around target',true));
  legend.appendChild(sw(C.charcoal,'Long — sitting on stock'));
  var lg1=h('div','display:flex;gap:7px;align-items:center;'); lg1.appendChild(h('span','width:16px;height:0;border-top:2px solid '+C.charcoal+';box-shadow:0 0 0 1px #fff;display:inline-block;')); lg1.appendChild(h('span','','stock on hand')); legend.appendChild(lg1);
  var lg2=h('div','display:flex;gap:6px;align-items:center;'); lg2.appendChild(h('span','color:'+C.red+';font-size:13px;','▲')); lg2.appendChild(h('span','','shipment lands')); legend.appendChild(lg2);
  header.appendChild(legend);
  var stage=h('div','position:relative;flex:1 1 auto;min-height:0;'); wrap.appendChild(stage);
  var footer=h('div','flex:0 0 auto;padding:5px 40px 10px 40px;font:italic 400 12px/1.3 '+SANS+';color:'+C.grey80+';','Illustrative demonstration model — not a solution design. Top: cars actually in each market. Bottom: cars still on the water. Choose a base model and drive hand, or "All" to see the whole book.'); wrap.appendChild(footer);
  var svg=el('svg',{width:'100%',height:'100%'}); svg.style.cssText='position:absolute;inset:0;display:block;'; stage.appendChild(svg);
  var tip=h('div','position:fixed;z-index:99;pointer-events:none;opacity:0;transition:opacity .1s;max-width:260px;background:'+C.charcoal+';color:'+C.white+';padding:10px 12px;border-radius:8px;font:500 12px/1.5 '+SANS+';box-shadow:0 8px 24px rgba(0,0,0,.28);'); document.body.appendChild(tip);
  function tipRow(k,v){ return '<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:'+C.grey60+';">'+esc(k)+'</span><span style="color:#fff;font-weight:600;">'+esc(v)+'</span></div>'; }
  function place(ev){ var pad=15,tw=tip.offsetWidth,th=tip.offsetHeight; var x=ev.clientX+pad,y=ev.clientY+pad; if(x+tw>window.innerWidth-8)x=ev.clientX-tw-pad; if(y+th>window.innerHeight-8)y=ev.clientY-th-pad; tip.style.left=x+'px'; tip.style.top=y+'px'; }
  function showCover(ev,mkt,wms){ var cov=gc&&gc.byMarket[mkt]?gc.byMarket[mkt][wms]:null; var st=gs&&gs.byMarket[mkt]?gs.byMarket[mkt][wms]:null; var ar=ga&&ga.byMarket[mkt]?ga.byMarket[mkt][wms]:null; var fl=gf&&gf.byMarket[mkt]?gf.byMarket[mkt][wms]:null; var L=[]; L.push('<div style="font:700 13px/1.3 '+SANS+';margin-bottom:4px;">'+esc(mkt)+' · '+esc(fmtWeek(wms))+'</div>'); L.push(tipRow('In-country cover',(cov!=null?(Math.round(cov*10)/10)+' wks · '+coverBand(cov):'no demand'))); L.push(tipRow('In country',(st!=null?Math.round(st).toLocaleString()+' cars':'—'))); if(fl!=null&&fl>0.5)L.push(tipRow('At sea (to here)',Math.round(fl).toLocaleString()+' cars')); if(ar!=null&&ar>0.5)L.push(tipRow('Arriving this week','+'+Math.round(ar).toLocaleString()+' cars')); tip.innerHTML=L.join(''); tip.style.opacity='1'; place(ev); }
  function showSea(ev,mkt,wms){ var fl=gf&&gf.byMarket[mkt]?gf.byMarket[mkt][wms]:null; var L=[]; L.push('<div style="font:700 13px/1.3 '+SANS+';margin-bottom:4px;">'+esc(mkt)+' · at sea · '+esc(fmtWeek(wms))+'</div>'); L.push(tipRow('In transit to here',(fl!=null?Math.round(fl).toLocaleString()+' cars':'—'))); tip.innerHTML=L.join(''); tip.style.opacity='1'; place(ev); }
  function hideTip(){ tip.style.opacity='0'; }
  var M={ top:10, bottom:32, left:150, right:120 };
  function size(){ return { w: stage.clientWidth||window.innerWidth, h: stage.clientHeight||(window.innerHeight-260) }; }
  function windowWeeks(){ var src=gc||gs||gf||ga; var set={}; if(src){ for(var i=0;i<src.weeks.length;i++){ var w=src.weeks[i]; if(w!=null&&w>=WIN_START&&w<=WIN_END)set[w]=1; } } return Object.keys(set).map(Number).sort(function(a,b){return a-b;}); }
  function marketList(){ var g=gc||gs; if(!g)return []; var names=Object.keys(g.byMarket); function tight(m){ var row=gc?gc.byMarket[m]:null; if(!row)return 0; var n=0; for(var k in row){ if(row[k]!=null&&row[k]<2)n++; } return n; } function hasData(m){ var r=(gc&&gc.byMarket[m])||(gs&&gs.byMarket[m])||{}; for(var k in r){ if(r[k]!=null)return true; } return false; } names=names.filter(hasData); names.sort(function(a,b){ var d=tight(b)-tight(a); return d!==0?d:(a<b?-1:1); }); return names; }
  function clearSvg(){ while(svg.firstChild)svg.removeChild(svg.firstChild); }
  function render(){
    clearSvg();
    var sz=size(), W=sz.w, H=sz.h;
    if(state==='error'){ var te=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); te.textContent='Could not load data — '+errMsg; svg.appendChild(te); return; }
    if(state!=='ready'||!gc){ sub.textContent=model+' · loading…'; for(var i=0;i<8;i++){ var y=M.top+(H-M.top-M.bottom)/8*(i+0.4); var sk=el('rect',{x:M.left,y:y,width:(W-M.left-M.right),height:(H-M.top-M.bottom)/8*0.7,rx:3,fill:C.grey20}); var an=el('animate',{attributeName:'opacity',values:'0.5;1;0.5',dur:'1.3s',repeatCount:'indefinite'}); sk.appendChild(an); svg.appendChild(sk); } return; }
    var weeks=windowWeeks(), markets=marketList(); renderMarkets=markets; renderN=markets.length;
    var nW=weeks.length, nM=markets.length;
    sub.textContent=model+' · in-country cover by market · '+fmtWeek(weeks[0])+' – '+fmtWeek(weeks[nW-1]);
    if(!nW||!nM){ var t0=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); t0.textContent='Nothing to show for '+model+' in this window.'; svg.appendChild(t0); return; }
    var plotW=W-M.left-M.right; var areaTop=M.top, areaBot=H-M.bottom, midGap=30;
    var topH=(areaBot-areaTop-midGap)*0.62, botH=(areaBot-areaTop-midGap)*0.38;
    var topTop=areaTop, topBot=areaTop+topH; var botTop=topBot+midGap, botBot=botTop+botH;
    var cellW=plotW/nW, rowH=topH/nM; function cx(i){ return M.left+i*cellW; }
    var mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; var seen={};
    for(var wi=0;wi<nW;wi++){ var d=new Date(weeks[wi]); var key=d.getUTCFullYear()+'-'+d.getUTCMonth(); if(!seen[key]){ seen[key]=1; var mx=cx(wi); svg.appendChild(el('line',{x1:mx,y1:topTop,x2:mx,y2:botBot,stroke:C.grey40,'stroke-width':1})); var ml=el('text',{x:mx+4,y:botBot+20,fill:C.grey80,'font-family':SANS,'font-size':11}); ml.textContent=mo[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2); svg.appendChild(ml); } }
    for(var mi=0;mi<nM;mi++){
      var mkt=markets[mi], y0=topTop+mi*rowH;
      var covRow=gc.byMarket[mkt]||{}, stRow=(gs&&gs.byMarket[mkt])||{}, arRow=(ga&&ga.byMarket[mkt])||{};
      var maxSt=1; for(var k in stRow){ if(stRow[k]!=null&&stRow[k]>maxSt)maxSt=stRow[k]; }
      for(var ci=0;ci<nW;ci++){ var w=weeks[ci]; var cov=covRow[w]; var rect=el('rect',{x:cx(ci),y:y0+1,width:Math.ceil(cellW)+0.5,height:rowH-2,fill:coverColor(cov)}); (function(mm,ww){ rect.addEventListener('mousemove',function(ev){showCover(ev,mm,ww);}); rect.addEventListener('mouseleave',hideTip); })(mkt,w); rect.style.cursor='pointer'; svg.appendChild(rect); }
      var pts=[]; for(var si=0;si<nW;si++){ var ws=weeks[si]; var sv=stRow[ws]; if(sv==null){ pts.push(null); continue; } var yy=y0+rowH-4-(sv/maxSt)*(rowH-8); pts.push((cx(si)+cellW/2)+','+yy); }
      var segp=''; for(var pi=0;pi<pts.length;pi++){ if(pts[pi]==null)continue; segp+=(segp&&pts[pi-1]!=null?' L':' M')+pts[pi]; }
      if(segp){ svg.appendChild(el('path',{d:segp.trim(),fill:'none',stroke:C.white,'stroke-width':3.5,'stroke-linejoin':'round','stroke-linecap':'round',opacity:0.9})); svg.appendChild(el('path',{d:segp.trim(),fill:'none',stroke:C.charcoal,'stroke-width':1.6,'stroke-linejoin':'round','stroke-linecap':'round'})); }
      for(var ai=0;ai<nW;ai++){ var wa=weeks[ai]; var av=arRow[wa]; if(av!=null&&av>0.5){ var axx=cx(ai)+cellW/2; var s=Math.min(7,3+Math.sqrt(av)/3); svg.appendChild(el('polygon',{points:(axx)+','+(y0+2)+' '+(axx-s)+','+(y0+2+s*1.3)+' '+(axx+s)+','+(y0+2+s*1.3),fill:C.red})); } }
      var lab=el('text',{x:22,y:y0+rowH/2+4,fill:C.charcoal,'font-family':SANS,'font-size':13,'font-weight':600}); lab.textContent=mkt; svg.appendChild(lab);
      svg.appendChild(el('line',{x1:M.left,y1:y0,x2:M.left+plotW,y2:y0,stroke:C.white,'stroke-width':1}));
    }
    var shd=el('text',{x:22,y:botTop-10,fill:C.charcoal,'font-family':SANS,'font-size':12,'font-weight':700}); shd.textContent='At sea — units in transit, by destination'; svg.appendChild(shd);
    var maxTot=1; for(var wj=0;wj<nW;wj++){ var tot=0; for(var mj=0;mj<nM;mj++){ var fv=(gf&&gf.byMarket[markets[mj]])?gf.byMarket[markets[mj]][weeks[wj]]:null; if(fv!=null&&fv>0)tot+=fv; } if(tot>maxTot)maxTot=tot; }
    function yTot(v){ return botBot-(v/maxTot)*(botH-6); }
    svg.appendChild(el('line',{x1:M.left,y1:botBot,x2:M.left+plotW,y2:botBot,stroke:C.grey60,'stroke-width':1}));
    var tMax=el('text',{x:M.left-8,y:yTot(maxTot)+4,fill:C.grey80,'font-family':SANS,'font-size':10,'text-anchor':'end'}); tMax.textContent=Math.round(maxTot).toLocaleString(); svg.appendChild(tMax);
    var tZero=el('text',{x:M.left-8,y:botBot+2,fill:C.grey80,'font-family':SANS,'font-size':10,'text-anchor':'end'}); tZero.textContent='0'; svg.appendChild(tZero);
    var lastMid={};
    for(var wk2=0;wk2<nW;wk2++){ var baseV=0; for(var mm2=0;mm2<nM;mm2++){ var mk=markets[mm2]; var fv2=(gf&&gf.byMarket[mk])?gf.byMarket[mk][weeks[wk2]]:null; if(fv2==null||fv2<=0)continue; var yA=yTot(baseV+fv2), yB=yTot(baseV); var rc=el('rect',{x:cx(wk2),y:yA,width:Math.ceil(cellW)+0.5,height:Math.max(0,yB-yA),fill:(hoverMkt===mk?C.red:greyRamp(mm2,nM))}); rc.__mkt=mk; (function(mkn,wwn){ rc.addEventListener('mousemove',function(ev){showSea(ev,mkn,wwn);}); rc.addEventListener('mouseleave',hideTip); rc.addEventListener('mouseenter',function(){ hoverMkt=mkn; recolourSea(); }); })(mk,weeks[wk2]); rc.style.cursor='pointer'; svg.appendChild(rc); if(wk2===nW-1)lastMid[mk]=(yA+yB)/2; baseV+=fv2; } }
    for(var mm3=0;mm3<nM;mm3++){ var mk3=markets[mm3]; if(lastMid[mk3]!=null){ var lastV=(gf&&gf.byMarket[mk3])?gf.byMarket[mk3][weeks[nW-1]]:0; if(lastV!=null&&(lastV/maxTot)*(botH-6)>=12){ var tl2=el('text',{x:M.left+plotW+6,y:lastMid[mk3]+3,fill:C.grey80,'font-family':SANS,'font-size':10}); tl2.textContent=mk3; svg.appendChild(tl2); } } }
    if(W0>=weeks[0]&&W0<=weeks[nW-1]+7*86400000){ var ti=0; while(ti<nW-1&&weeks[ti+1]<=W0)ti++; var tx=cx(ti)+cellW/2; svg.appendChild(el('line',{x1:tx,y1:topTop-2,x2:tx,y2:botBot,stroke:C.red,'stroke-width':1.5,'stroke-dasharray':'3 3'})); var tl=el('text',{x:tx+4,y:topTop+10,fill:C.red,'font-family':SANS,'font-size':10,'font-weight':700}); tl.textContent='today'; svg.appendChild(tl); }
  }
  function recolourSea(){ var kids=svg.childNodes; for(var i=0;i<kids.length;i++){ var n=kids[i]; if(n.__mkt!==undefined){ var idx=renderMarkets.indexOf(n.__mkt); n.setAttribute('fill', hoverMkt===n.__mkt?C.red:greyRamp(idx<0?0:idx, renderN)); } } }
  function setLoading(){ state='loading'; render(); }
  var bases=[], handsByBase={};
  function parseModel(name){ var m=String(name).match(/^(.*?)\s+(LHD|RHD)$/); if(m)return {base:m[1],hand:m[2]}; return {base:name,hand:''}; }
  function deriveFilters(){ bases=[]; handsByBase={}; for(var i=0;i<models.length;i++){ var p=parseModel(models[i]); if(bases.indexOf(p.base)<0)bases.push(p.base); if(!handsByBase[p.base])handsByBase[p.base]=[]; if(p.hand&&handsByBase[p.base].indexOf(p.hand)<0)handsByBase[p.base].push(p.hand); } if(baseModel!=='All'&&bases.indexOf(baseModel)<0)baseModel=bases[0]||baseModel; if(baseModel!=='All'){ var hs=handsByBase[baseModel]||[]; if(driveHand!=='All'&&hs.length&&hs.indexOf(driveHand)<0)driveHand=hs[0]; } resolveModel(); }
  // resolve the *selection* (one or many model names) and a display label
  function modelSel(){ if(baseModel==='All')return models.slice(); if(driveHand==='All'){ var f=[]; for(var i=0;i<models.length;i++){ if(parseModel(models[i]).base===baseModel)f.push(models[i]); } return f.length?f:models.slice(); } var cand=driveHand?(baseModel+' '+driveHand):baseModel; if(models.length&&models.indexOf(cand)<0){ var g=[]; for(var j=0;j<models.length;j++){ if(parseModel(models[j]).base===baseModel)g.push(models[j]); } return g.length?[g[0]]:[cand]; } return [cand]; }
  function resolveModel(){ if(baseModel==='All'){ model='All models'; return; } if(driveHand==='All'){ model=baseModel+' · all drive'; return; } model=(driveHand?(baseModel+' '+driveHand):baseModel); }
  function fillFilters(){ baseSel.innerHTML=''; var bopts=['All'].concat(bases); for(var i=0;i<bopts.length;i++){ var o=document.createElement('option'); o.value=bopts[i]; o.textContent=bopts[i]; if(bopts[i]===baseModel)o.selected=true; baseSel.appendChild(o); } if(baseModel==='All'){ handSel.parentNode.style.display='none'; return; } var hs=handsByBase[baseModel]||[]; var hopts=(hs.length>1?['All'].concat(hs):hs.slice()); handSel.innerHTML=''; for(var j=0;j<hopts.length;j++){ var o2=document.createElement('option'); o2.value=hopts[j]; o2.textContent=hopts[j]; if(hopts[j]===driveHand)o2.selected=true; handSel.appendChild(o2); } handSel.parentNode.style.display=hopts.length>1?'':'none'; }
  var subs=[];
  function scopeAll(){ var pd=[{alias:'ModelList',selection:modelSel()}]; for(var i=0;i<subs.length;i++){ try{ subs[i].updatePageDefinitions(pd); }catch(e){} } }
  function bindViz(alias, assign){ try { return window.PigmentSDK.subscribeToVizualization(alias, { pageDefinitions:[{alias:'ModelList',selection:modelSel()}], scroll:{offset:0,numberOfRows:200}, onData:function(data){ if(!isReady(data))return; assign(data); if(gc){ state='ready'; render(); } }, onError:function(err){ state='error'; errMsg=(err&&err.message)||String(err); render(); } }); } catch(e){ state='error'; errMsg=e.message; render(); return null; } }
  var sc=bindViz('VC', function(d){ gc=grid(d); }); if(sc)subs.push(sc);
  var ss=bindViz('VS', function(d){ gs=grid(d); }); if(ss)subs.push(ss);
  var sa=bindViz('VA', function(d){ ga=grid(d); }); if(sa)subs.push(sa);
  var sfl=bindViz('VF', function(d){ gf=grid(d); }); if(sfl)subs.push(sfl);
  var SEED_MODELS=['Civic LHD','Civic RHD','CR-V LHD','CR-V RHD','HR-V LHD','HR-V RHD','Jazz LHD','Jazz RHD','e:Ny1 LHD','e:Ny1 RHD'];
  function itemName(it){ if(it==null)return null; if(typeof it==='string')return it; var nm=it.name||it.label||it.displayName||it.title||it.key||it.id; if(nm)return String(nm); if(it.values&&it.values.length){ var v0=it.values[0]; return String(v0&&typeof v0==='object'?(v0.value!=null?v0.value:''):v0); } return null; }
  models=SEED_MODELS.slice(); deriveFilters(); fillFilters();
  var itemsSub=null;
  try { itemsSub=window.PigmentSDK.subscribeToItems('ModelList', { onData:function(d){ var it=(d&&d.items)||[]; var names=[]; for(var i=0;i<it.length;i++){ var nm=itemName(it[i]); if(nm)names.push(nm); } if(names.length){ models=names; deriveFilters(); fillFilters(); } }, onError:function(){} }); } catch(e){}
  render();
  var rT=null;
  function onResize(){ if(rT)clearTimeout(rT); rT=setTimeout(function(){ render(); },120); }
  window.addEventListener('resize',onResize);
  var ro=null; try{ ro=new ResizeObserver(onResize); ro.observe(document.documentElement); }catch(e){}
  root.__cleanup=function(){ for(var i=0;i<subs.length;i++){ try{ subs[i].unsubscribe&&subs[i].unsubscribe(); }catch(e){} } try{ itemsSub&&itemsSub.unsubscribe&&itemsSub.unsubscribe(); }catch(e){} window.removeEventListener('resize',onResize); try{ if(ro)ro.disconnect(); }catch(e){} if(rT)clearTimeout(rT); if(tip&&tip.parentNode)tip.parentNode.removeChild(tip); };
})();
