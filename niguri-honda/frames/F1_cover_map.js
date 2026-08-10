/* Niguri Honda — Frame F1 · "Cover Map"  (B1 centrepiece, holistic reframe)
   Live-bound Pigment AI Frame. Shows weeks-of-cover per market across the whole
   horizon: where supply runs tight (red), sits balanced (near-white), or piles up
   (charcoal). Stock-on-hand rides each row as a line; shipment arrivals show as ticks.
   A Model picker re-scopes every subscription live. Everything is read from onData;
   nothing is hardcoded except calendar anchors (W0) and the on-palette colour scale.

   Bindings:
     VC  View  Cover Weeks  by market x week   5bc5b43a-78fb-4c05-ab93-af0bb9251d44
     VS  View  Stock on hand by market x week  a9531ccb-9f95-49e4-abab-e1af69e0f083
     VA  View  Units arrived by market x week  86edc4a2-ea9a-4da6-8804-667222577cb4
     ModelList  List  Model dimension          6d076d70-...  (page scope + picker)

   Palette: white #FFFFFF · Honda red #CC0000 · charcoal #1A1A1A · greys.
*/
(function () {
  'use strict';
  var root = document.getElementById('app');
  if (root && root.__cleanup) root.__cleanup();
  if (!root) { root = document.body; }
  root.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;overflow:hidden;background:#FFFFFF;';

  var MODEL_DEFAULT = 'Civic LHD';
  var W0 = Date.UTC(2026, 7, 10);                 // model "today" (WC 2026-08-10)
  var WIN_START = Date.UTC(2026, 7, 3);           // horizon window
  var WIN_END = Date.UTC(2027, 1, 22);

  var C = { white:'#FFFFFF', red:'#CC0000', charcoal:'#1A1A1A', grey80:'#6E6E73', grey60:'#C9C9CE', grey40:'#E3E3E7', grey20:'#F7F7F8', na:'#EDEDF0' };
  var SERIF = '"Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif';
  var SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  var NS = 'http://www.w3.org/2000/svg';

  // ---- colour scale: red(tight) -> near-white(balanced) -> charcoal(long) ----
  function hx(h){ h=h.replace('#',''); return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]; }
  function mix(a,b,t){ a=hx(a); b=hx(b); var r=Math.round(a[0]+(b[0]-a[0])*t),g=Math.round(a[1]+(b[1]-a[1])*t),bl=Math.round(a[2]+(b[2]-a[2])*t); return 'rgb('+r+','+g+','+bl+')'; }
  function clamp(x,lo,hi){ return x<lo?lo:(x>hi?hi:x); }
  function coverColor(cov){
    if (cov == null || isNaN(cov)) return C.na;
    if (cov < 2) return mix('#CC0000', '#F3D9D9', clamp(cov/2,0,1));        // tight -> deep to pale red
    if (cov <= 4) return '#FBFBFC';                                         // balanced -> near white
    return mix('#E3E3E7', '#1A1A1A', clamp((cov-4)/6,0,1));                 // long -> grey to charcoal
  }
  function coverBand(cov){ if(cov==null||isNaN(cov))return 'no demand'; if(cov<2)return 'Tight'; if(cov<=4)return 'Balanced'; return 'Long cover'; }

  // ---- helpers ----
  function el(t,a){ var e=document.createElementNS(NS,t); if(a)for(var k in a)e.setAttribute(k,a[k]); return e; }
  function h(t,css,txt){ var e=document.createElement(t); if(css)e.style.cssText=css; if(txt!=null)e.textContent=txt; return e; }
  function esc(s){ return String(s).replace(/[&<>]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;';}); }
  function weekDate(label){ var m=String(label).match(/(\d{4})-(\d{2})-(\d{2})/); if(!m)return null; return Date.UTC(+m[1],+m[2]-1,+m[3]); }
  function fmtWeek(ms){ if(ms==null)return '—'; var d=new Date(ms); var mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return d.getUTCDate()+' '+mo[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2); }
  function lastLabel(lbl){ if(Array.isArray(lbl)){ var v=lbl[lbl.length-1]; return (v&&typeof v==='object')?'':String(v); } return (lbl&&typeof lbl==='object')?'':String(lbl); }
  function num(v){ return (typeof v==='number'&&!isNaN(v))?v:(v==null?null:(isNaN(+v)?null:+v)); }
  function hasLoadingKind(arr){ if(!arr)return false; for(var i=0;i<arr.length;i++){ var it=arr[i]; if(Array.isArray(it)){ if(hasLoadingKind(it))return true; } else if(it&&typeof it==='object'&&it.kind==='loading')return true; } return false; }
  function isReady(d){ if(!d||!d.labels||!d.labels.columns)return false; return !hasLoadingKind(d.labels.rows)&&!hasLoadingKind(d.labels.columns)&&!hasLoadingKind(d.cells); }

  // payload -> { market -> { weekMs -> value } }, plus ordered week list
  function grid(data){
    var out={ byMarket:{}, weeks:[] };
    if(!data||!data.labels)return out;
    var cols=data.labels.columns||[], rows=data.labels.rows||[], cells=data.cells||[];
    var wk=[]; for(var c=0;c<cols.length;c++){ wk.push(weekDate(lastLabel(cols[c]))); }
    out.weeks=wk;
    for(var r=0;r<rows.length;r++){ var mkt=lastLabel(rows[r]); var row={}; for(var c2=0;c2<cols.length;c2++){ var w=wk[c2]; if(w==null)continue; row[w]=num(cells[c2]?cells[c2][r]:null); } out.byMarket[mkt]=row; }
    return out;
  }

  // ---- state ----
  var state='loading', errMsg='', model=MODEL_DEFAULT;
  var gc=null, gs=null, ga=null;      // cover / stock / arrived grids
  var models=[];

  // ---- scaffold ----
  var wrap=h('div','position:absolute;inset:0;display:flex;flex-direction:column;background:'+C.white+';'); root.appendChild(wrap);
  var header=h('div','flex:0 0 auto;padding:24px 40px 12px 40px;'); wrap.appendChild(header);
  var toprow=h('div','display:flex;justify-content:space-between;align-items:flex-start;gap:24px;'); header.appendChild(toprow);
  var titleBox=h('div',''); toprow.appendChild(titleBox);
  titleBox.appendChild(h('div','font:600 11px/1.2 '+SANS+';letter-spacing:.16em;text-transform:uppercase;color:'+C.grey80+';','Niguri · Honda — cover map'));
  titleBox.appendChild(h('div','margin-top:6px;font:400 30px/1.15 '+SERIF+';color:'+C.charcoal+';','Where cover runs tight — and where it piles up'));
  var sub=h('div','margin-top:6px;font:400 14px/1.4 '+SANS+';color:'+C.grey80+';'); titleBox.appendChild(sub);

  // model picker
  var pickBox=h('div','display:flex;flex-direction:column;align-items:flex-end;gap:6px;');
  pickBox.appendChild(h('div','font:600 10px/1 '+SANS+';letter-spacing:.12em;text-transform:uppercase;color:'+C.grey80+';','Model'));
  var sel=document.createElement('select');
  sel.style.cssText='font:600 14px/1 '+SANS+';color:'+C.charcoal+';background:'+C.white+';border:1px solid '+C.grey60+';border-radius:8px;padding:8px 12px;cursor:pointer;min-width:150px;';
  pickBox.appendChild(sel); toprow.appendChild(pickBox);
  sel.addEventListener('change', function(){ model=sel.value; setLoading(); scopeAll(); });

  // legend
  var legend=h('div','display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:12px;font:500 12px/1 '+SANS+';color:'+C.charcoal+';');
  function sw(color,label,border){ var d=h('div','display:flex;gap:7px;align-items:center;'); var s=h('span','width:14px;height:14px;border-radius:3px;display:inline-block;background:'+color+';'); if(border)s.style.border='1px solid '+C.grey60; d.appendChild(s); d.appendChild(h('span','',label)); return d; }
  legend.appendChild(sw(C.red,'Tight — under 2 weeks'));
  legend.appendChild(sw('#FBFBFC','Balanced — around target',true));
  legend.appendChild(sw(C.charcoal,'Long — sitting on stock'));
  var lg1=h('div','display:flex;gap:7px;align-items:center;'); lg1.appendChild(h('span','width:16px;height:0;border-top:2px solid '+C.charcoal+';box-shadow:0 0 0 1px #fff;display:inline-block;')); lg1.appendChild(h('span','','stock on hand')); legend.appendChild(lg1);
  var lg2=h('div','display:flex;gap:6px;align-items:center;'); lg2.appendChild(h('span','color:'+C.red+';font-size:13px;','▲')); lg2.appendChild(h('span','','shipment lands')); legend.appendChild(lg2);
  header.appendChild(legend);

  var stage=h('div','position:relative;flex:1 1 auto;min-height:0;'); wrap.appendChild(stage);
  var footer=h('div','flex:0 0 auto;padding:8px 40px 14px 40px;font:italic 400 12px/1.3 '+SANS+';color:'+C.grey80+';','Illustrative demonstration model — not a solution design. Change a lead time, demand or the cover target and the map re-colours.'); wrap.appendChild(footer);

  var svg=el('svg',{width:'100%',height:'100%'}); svg.style.cssText='position:absolute;inset:0;display:block;'; stage.appendChild(svg);

  var tip=h('div','position:fixed;z-index:99;pointer-events:none;opacity:0;transition:opacity .1s;max-width:260px;background:'+C.charcoal+';color:'+C.white+';padding:10px 12px;border-radius:8px;font:500 12px/1.5 '+SANS+';box-shadow:0 8px 24px rgba(0,0,0,.28);'); document.body.appendChild(tip);
  function tipRow(k,v){ return '<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:'+C.grey60+';">'+esc(k)+'</span><span style="color:#fff;font-weight:600;">'+esc(v)+'</span></div>'; }
  function showTip(ev,mkt,wms){
    var cov=gc&&gc.byMarket[mkt]?gc.byMarket[mkt][wms]:null;
    var st=gs&&gs.byMarket[mkt]?gs.byMarket[mkt][wms]:null;
    var ar=ga&&ga.byMarket[mkt]?ga.byMarket[mkt][wms]:null;
    var L=[]; L.push('<div style="font:700 13px/1.3 '+SANS+';margin-bottom:4px;">'+esc(mkt)+' · '+esc(fmtWeek(wms))+'</div>');
    L.push(tipRow('Weeks of cover',(cov!=null?(Math.round(cov*10)/10)+' · '+coverBand(cov):'no demand')));
    L.push(tipRow('Stock on hand',(st!=null?Math.round(st).toLocaleString()+' cars':'—')));
    if(ar!=null&&ar>0.5)L.push(tipRow('Arriving this week','+'+Math.round(ar).toLocaleString()+' cars'));
    tip.innerHTML=L.join(''); tip.style.opacity='1';
    var pad=15,tw=tip.offsetWidth,th=tip.offsetHeight; var x=ev.clientX+pad,y=ev.clientY+pad;
    if(x+tw>window.innerWidth-8)x=ev.clientX-tw-pad; if(y+th>window.innerHeight-8)y=ev.clientY-th-pad;
    tip.style.left=x+'px'; tip.style.top=y+'px';
  }
  function hideTip(){ tip.style.opacity='0'; }

  var M={ top:16, bottom:34, left:150, right:120 };
  function size(){ return { w: stage.clientWidth||window.innerWidth, h: stage.clientHeight||(window.innerHeight-220) }; }

  function windowWeeks(){
    // union of week timestamps within horizon from whichever grid is present
    var src=gc||gs||ga; var set={};
    if(src){ for(var i=0;i<src.weeks.length;i++){ var w=src.weeks[i]; if(w!=null&&w>=WIN_START&&w<=WIN_END)set[w]=1; } }
    var arr=Object.keys(set).map(Number).sort(function(a,b){return a-b;});
    return arr;
  }
  function marketList(){
    var g=gc||gs; if(!g)return [];
    var names=Object.keys(g.byMarket);
    // sort: most weeks tight first (surface the problems), then name
    function tight(m){ var row=gc?gc.byMarket[m]:null; if(!row)return 0; var n=0; for(var k in row){ if(row[k]!=null&&row[k]<2)n++; } return n; }
    names.sort(function(a,b){ var d=tight(b)-tight(a); return d!==0?d:(a<b?-1:1); });
    return names;
  }

  function clearSvg(){ while(svg.firstChild)svg.removeChild(svg.firstChild); }

  function render(){
    clearSvg();
    var sz=size(), W=sz.w, H=sz.h;
    if(state==='error'){ var te=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); te.textContent='Could not load data — '+errMsg; svg.appendChild(te); return; }
    if(state!=='ready'||!gc){
      sub.textContent=model+' · loading…';
      for(var i=0;i<8;i++){ var y=M.top+(H-M.top-M.bottom)/8*(i+0.4); var sk=el('rect',{x:M.left,y:y,width:(W-M.left-M.right),height:(H-M.top-M.bottom)/8*0.7,rx:3,fill:C.grey20}); var an=el('animate',{attributeName:'opacity',values:'0.5;1;0.5',dur:'1.3s',repeatCount:'indefinite'}); sk.appendChild(an); svg.appendChild(sk); }
      return;
    }

    var weeks=windowWeeks(), markets=marketList();
    var nW=weeks.length, nM=markets.length;
    sub.textContent=model+' · weeks of cover by market · '+fmtWeek(weeks[0])+' – '+fmtWeek(weeks[nW-1]);
    if(!nW||!nM){ var t0=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); t0.textContent='No cover to show for '+model+' in this window.'; svg.appendChild(t0); return; }

    var plotW=W-M.left-M.right, plotH=H-M.top-M.bottom;
    var cellW=plotW/nW, rowH=plotH/nM;
    function xw(w){ var idx=weeks.indexOf(w); return M.left+idx*cellW; }

    // month gridlines (bottom axis)
    var mo=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var seenMonth={};
    for(var wi=0;wi<nW;wi++){ var d=new Date(weeks[wi]); var key=d.getUTCFullYear()+'-'+d.getUTCMonth(); if(!seenMonth[key]){ seenMonth[key]=1; var mx=M.left+wi*cellW; svg.appendChild(el('line',{x1:mx,y1:M.top,x2:mx,y2:M.top+plotH,stroke:C.grey40,'stroke-width':1})); var ml=el('text',{x:mx+4,y:M.top+plotH+20,fill:C.grey80,'font-family':SANS,'font-size':11}); ml.textContent=mo[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2); svg.appendChild(ml); } }

    // cells + overlays per market
    for(var mi=0;mi<nM;mi++){
      var mkt=markets[mi], y0=M.top+mi*rowH;
      var covRow=gc.byMarket[mkt]||{}, stRow=(gs&&gs.byMarket[mkt])||{}, arRow=(ga&&ga.byMarket[mkt])||{};
      // row max stock for normalisation
      var maxSt=1; for(var k in stRow){ if(stRow[k]!=null&&stRow[k]>maxSt)maxSt=stRow[k]; }
      // cells
      for(var ci=0;ci<nW;ci++){ var w=weeks[ci]; var cov=covRow[w]; var cx=M.left+ci*cellW;
        var rect=el('rect',{x:cx,y:y0+1,width:Math.ceil(cellW)+0.5,height:rowH-2,fill:coverColor(cov)});
        (function(mm,ww){ rect.addEventListener('mousemove',function(ev){showTip(ev,mm,ww);}); rect.addEventListener('mouseleave',hideTip); })(mkt,w);
        rect.style.cursor='pointer'; svg.appendChild(rect);
      }
      // stock line (charcoal with white halo so it reads on any cell)
      var pts=[]; for(var si=0;si<nW;si++){ var ws=weeks[si]; var sv=stRow[ws]; if(sv==null){ pts.push(null); continue; } var yy=y0+rowH-4-(sv/maxSt)*(rowH-8); pts.push((M.left+si*cellW+cellW/2)+','+yy); }
      var seg=''; for(var pi=0;pi<pts.length;pi++){ if(pts[pi]==null){ continue; } seg+=(seg&&pts[pi-1]!=null?' L':' M')+pts[pi]; }
      if(seg){ svg.appendChild(el('path',{d:seg.trim(),fill:'none',stroke:C.white,'stroke-width':3.5,'stroke-linejoin':'round','stroke-linecap':'round',opacity:0.9})); svg.appendChild(el('path',{d:seg.trim(),fill:'none',stroke:C.charcoal,'stroke-width':1.6,'stroke-linejoin':'round','stroke-linecap':'round'})); }
      // arrival pulses
      for(var ai=0;ai<nW;ai++){ var wa=weeks[ai]; var av=arRow[wa]; if(av!=null&&av>0.5){ var axx=M.left+ai*cellW+cellW/2; var s=Math.min(7,3+Math.sqrt(av)/3); svg.appendChild(el('polygon',{points:(axx)+','+(y0+2)+' '+(axx-s)+','+(y0+2+s*1.3)+' '+(axx+s)+','+(y0+2+s*1.3),fill:C.red})); } }
      // market label
      var lab=el('text',{x:22,y:y0+rowH/2+4,fill:C.charcoal,'font-family':SANS,'font-size':13,'font-weight':600}); lab.textContent=mkt; svg.appendChild(lab);
      // row separator
      svg.appendChild(el('line',{x1:M.left,y1:y0,x2:M.left+plotW,y2:y0,stroke:C.white,'stroke-width':1}));
    }

    // today marker
    if(W0>=weeks[0]&&W0<=weeks[nW-1]+7*86400000){ var ti=0; while(ti<nW-1&&weeks[ti+1]<=W0)ti++; var tx=M.left+ti*cellW+cellW/2; svg.appendChild(el('line',{x1:tx,y1:M.top-2,x2:tx,y2:M.top+plotH,stroke:C.red,'stroke-width':1.5,'stroke-dasharray':'3 3'})); var tl=el('text',{x:tx+4,y:M.top+10,fill:C.red,'font-family':SANS,'font-size':10,'font-weight':700}); tl.textContent='today'; svg.appendChild(tl); }
  }

  function setLoading(){ state='loading'; render(); }

  // ---- populate model picker ----
  function fillModels(){ sel.innerHTML=''; for(var i=0;i<models.length;i++){ var o=document.createElement('option'); o.value=models[i]; o.textContent=models[i]; if(models[i]===model)o.selected=true; sel.appendChild(o); } }

  // ---- subscriptions ----
  var subs=[];
  function scopeAll(){ var pd=[{alias:'ModelList',selection:[model]}]; for(var i=0;i<subs.length;i++){ try{ subs[i].updatePageDefinitions(pd); }catch(e){} } }

  function bindViz(alias, assign){
    try {
      return window.PigmentSDK.subscribeToVizualization(alias, {
        pageDefinitions:[{alias:'ModelList',selection:[model]}],
        scroll:{offset:0,numberOfRows:50},
        onData:function(data){ if(!isReady(data)){ return; } assign(grid(data)); if(gc){ state='ready'; render(); } },
        onError:function(err){ state='error'; errMsg=(err&&err.message)||String(err); render(); }
      });
    } catch(e){ state='error'; errMsg=e.message; render(); return null; }
  }

  var sc=bindViz('VC', function(g){ gc=g; }); if(sc)subs.push(sc);
  var ss=bindViz('VS', function(g){ gs=g; }); if(ss)subs.push(ss);
  var sa=bindViz('VA', function(g){ ga=g; }); if(sa)subs.push(sa);

  var itemsSub=null;
  try {
    itemsSub=window.PigmentSDK.subscribeToItems('ModelList', {
      onData:function(d){ var it=(d&&d.items)||[]; var names=[]; for(var i=0;i<it.length;i++){ var nm=it[i]&&(it[i].name||it[i].label||it[i].displayName); if(nm)names.push(String(nm)); } if(names.length){ models=names; if(models.indexOf(model)<0)model=models[0]; fillModels(); } },
      onError:function(){}
    });
  } catch(e){}

  render();

  // ---- resize ----
  var rT=null;
  function onResize(){ if(rT)clearTimeout(rT); rT=setTimeout(function(){ render(); },120); }
  window.addEventListener('resize',onResize);
  var ro=null; try{ ro=new ResizeObserver(onResize); ro.observe(document.documentElement); }catch(e){}

  root.__cleanup=function(){
    for(var i=0;i<subs.length;i++){ try{ subs[i].unsubscribe&&subs[i].unsubscribe(); }catch(e){} }
    try{ itemsSub&&itemsSub.unsubscribe&&itemsSub.unsubscribe(); }catch(e){}
    window.removeEventListener('resize',onResize);
    try{ if(ro)ro.disconnect(); }catch(e){}
    if(rT)clearTimeout(rT);
    if(tip&&tip.parentNode)tip.parentNode.removeChild(tip);
  };
})();
