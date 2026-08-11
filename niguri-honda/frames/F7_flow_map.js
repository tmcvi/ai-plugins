/* Niguri Honda — Frame F7 · "Where the cars are heading" (European flow map).
   Markets pinned at real geography, circle size = cars allocated, colour = in-market cover
   (red tight / grey balanced / charcoal long). Animated streams flow from the factory gateway
   (SW / Atlantic approach) out to each market. Live-bound, read-only.
   VF7 = view 'F6 Allocation flow (model x market)' — summed to market level in-frame. */
(function () {
  'use strict';
  var root = document.getElementById('app');
  if (root && root.__cleanup) root.__cleanup();
  if (!root) root = document.body;
  root.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;overflow:hidden;background:#FFFFFF;';
  var C = { white:'#FFFFFF', red:'#CC0000', charcoal:'#1A1A1A', grey80:'#6E6E73', grey60:'#C9C9CE', grey40:'#E3E3E7', grey20:'#F7F7F8', na:'#EDEDF0' };
  var SERIF = '"Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif';
  var SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  var NS = 'http://www.w3.org/2000/svg', XL='http://www.w3.org/1999/xlink';
  // approx geographic centres (lon, lat)
  var GEO = { 'UK':[-1.5,53.0],'Ireland':[-8.0,53.3],'Germany':[10.5,51.2],'France':[2.3,47.0],'Italy':[12.5,42.8],'Spain':[-3.7,40.4],'Netherlands':[5.3,52.2],'Belgium':[4.5,50.6],'Poland':[19.0,52.0],'Nordics':[15.0,60.0],'Portugal':[-8.0,39.5] };
  var ORIGIN=[-13.0,43.5];
  var LON0=-15, LON1=23, LAT0=34, LAT1=63;
  function el(t,a){ var e=document.createElementNS(NS,t); if(a)for(var k in a)e.setAttribute(k,a[k]); return e; }
  function h(t,css,txt){ var e=document.createElement(t); if(css)e.style.cssText=css; if(txt!=null)e.textContent=txt; return e; }
  function esc(s){ return String(s).replace(/[&<>]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;';}); }
  function strOf(x){ return (x&&typeof x==='object')?null:String(x); }
  function num(v){ return (typeof v==='number'&&!isNaN(v))?v:(v==null?null:(isNaN(+v)?null:+v)); }
  function lastLabel(lbl){ if(Array.isArray(lbl)){ var v=lbl[lbl.length-1]; return (v&&typeof v==='object')?'':String(v); } return (lbl&&typeof lbl==='object')?'':String(lbl); }
  function hasLoadingKind(arr){ if(!arr)return false; for(var i=0;i<arr.length;i++){ var it=arr[i]; if(Array.isArray(it)){ if(hasLoadingKind(it))return true; } else if(it&&typeof it==='object'&&it.kind==='loading')return true; } return false; }
  function isReady(d){ if(!d||!d.labels||!d.labels.columns)return false; return !hasLoadingKind(d.labels.rows)&&!hasLoadingKind(d.labels.columns)&&!hasLoadingKind(d.cells); }
  function bandColor(cov){ if(cov==null||isNaN(cov))return C.grey60; if(cov<2)return C.red; if(cov<=4)return C.grey60; return C.charcoal; }
  function bandName(cov){ if(cov==null||isNaN(cov))return 'no demand'; if(cov<2)return 'tight'; if(cov<=4)return 'balanced'; return 'long cover'; }
  function rgba(hex,a){ hex=hex.replace('#',''); return 'rgba('+parseInt(hex.slice(0,2),16)+','+parseInt(hex.slice(2,4),16)+','+parseInt(hex.slice(4,6),16)+','+a+')'; }

  // sum model x market -> per market {alloc, cov (allocation-weighted)}
  function reshape(data){ var mk={}; if(!data||!data.labels)return mk; var cols=data.labels.columns||[], rows=data.labels.rows||[], cells=data.cells||[]; var ai=0, ci=1; for(var c=0;c<cols.length;c++){ var lb=lastLabel(cols[c]).toLowerCase(); if(lb.indexOf('alloc')>=0)ai=c; else if(lb.indexOf('cover')>=0)ci=c; } for(var r=0;r<rows.length;r++){ var lv=rows[r]; if(!Array.isArray(lv))lv=[lv]; if(lv.length<2)continue; var market=strOf(lv[lv.length-1]); if(market==null)continue; var alloc=num(cells[ai]?cells[ai][r]:null); var cov=num(cells[ci]?cells[ci][r]:null); if(alloc==null||alloc<=0)continue; if(!mk[market])mk[market]={alloc:0,covW:0,covWsum:0}; mk[market].alloc+=alloc; if(cov!=null){ mk[market].covW+=cov*alloc; mk[market].covWsum+=alloc; } } var out={}; for(var m in mk){ out[m]={alloc:mk[m].alloc, cov:(mk[m].covWsum>0?mk[m].covW/mk[m].covWsum:null)}; } return out; }

  var state='loading', errMsg='', D=null;

  var wrap=h('div','position:absolute;inset:0;display:flex;flex-direction:column;background:'+C.white+';'); root.appendChild(wrap);
  var header=h('div','flex:0 0 auto;padding:20px 40px 6px 40px;'); wrap.appendChild(header);
  header.appendChild(h('div','font:600 11px/1.2 '+SANS+';letter-spacing:.16em;text-transform:uppercase;color:'+C.grey80+';','Niguri · Honda — the network, on the map'));
  header.appendChild(h('div','margin-top:6px;font:400 26px/1.15 '+SERIF+';color:'+C.charcoal+';','Where the cars are heading'));
  header.appendChild(h('div','margin-top:4px;font:400 13px/1.4 '+SANS+';color:'+C.grey80+';','A week of production leaving the line and dispersing across Europe. Circle size = cars allocated; colour = how cover looks once they land.'));
  var legend=h('div','display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:10px;font:500 12px/1 '+SANS+';color:'+C.charcoal+';'); header.appendChild(legend);
  function sw(color,label){ var d=h('div','display:flex;gap:7px;align-items:center;'); d.appendChild(h('span','width:14px;height:14px;border-radius:50%;display:inline-block;background:'+rgba(color,0.85)+';')); d.appendChild(h('span','',label)); return d; }
  legend.appendChild(h('span','font-weight:700;','Cover on landing:'));
  legend.appendChild(sw(C.red,'Tight'));
  legend.appendChild(sw(C.grey60,'Balanced'));
  legend.appendChild(sw(C.charcoal,'Long'));
  var hint=h('span','font:italic 500 12px/1 '+SANS+';color:'+C.grey80+';','Hover a market'); legend.appendChild(hint);
  var stage=h('div','position:relative;flex:1 1 auto;min-height:0;'); wrap.appendChild(stage);
  var footer=h('div','flex:0 0 auto;padding:5px 40px 10px 40px;font:italic 400 12px/1.3 '+SANS+';color:'+C.grey80+';','Illustrative demonstration model — not a solution design. Positions are approximate; flows show allocation, not a routing.'); wrap.appendChild(footer);
  var svg=el('svg',{width:'100%',height:'100%'}); svg.style.cssText='position:absolute;inset:0;display:block;'; stage.appendChild(svg);

  var tip=h('div','position:fixed;z-index:99;pointer-events:none;opacity:0;transition:opacity .1s;max-width:260px;background:'+C.charcoal+';color:'+C.white+';padding:10px 12px;border-radius:8px;font:500 12px/1.5 '+SANS+';box-shadow:0 8px 24px rgba(0,0,0,.28);'); document.body.appendChild(tip);
  function tipRow(k,v){ return '<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:'+C.grey60+';">'+esc(k)+'</span><span style="color:#fff;font-weight:600;">'+esc(v)+'</span></div>'; }
  function place(ev){ var pad=15,tw=tip.offsetWidth,th=tip.offsetHeight; var x=ev.clientX+pad,y=ev.clientY+pad; if(x+tw>window.innerWidth-8)x=ev.clientX-tw-pad; if(y+th>window.innerHeight-8)y=ev.clientY-th-pad; tip.style.left=x+'px'; tip.style.top=y+'px'; }
  function hideTip(){ tip.style.opacity='0'; }

  var M={ top:16, bottom:16, left:40, right:40 };
  function size(){ return { w: stage.clientWidth||window.innerWidth, h: stage.clientHeight||(window.innerHeight-220) }; }
  function clearSvg(){ while(svg.firstChild)svg.removeChild(svg.firstChild); }
  var uid=0;

  function render(){
    clearSvg(); var sz=size(), W=sz.w, H=sz.h;
    if(state==='error'){ var te=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); te.textContent='Could not load data — '+errMsg; svg.appendChild(te); return; }
    if(state!=='ready'||!D){ var t0=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); t0.textContent='Loading…'; svg.appendChild(t0); return; }
    // projection: keep aspect ratio of lon/lat window
    var pL=M.left, pR=W-M.right, pT=M.top, pB=H-M.bottom, pw=pR-pL, ph=pB-pT;
    var aspect=(LON1-LON0)/(LAT1-LAT0)*0.62; // lon degrees are narrower at these lats
    var dw=pw, dh=pw/aspect; if(dh>ph){ dh=ph; dw=ph*aspect; }
    var ox=pL+(pw-dw)/2, oy=pT+(ph-dh)/2;
    function X(lon){ return ox+(lon-LON0)/(LON1-LON0)*dw; }
    function Y(lat){ return oy+(LAT1-lat)/(LAT1-LAT0)*dh; }
    // faint graticule
    for(var g=LON0; g<=LON1; g+=10){ svg.appendChild(el('line',{x1:X(g),y1:oy,x2:X(g),y2:oy+dh,stroke:C.grey20,'stroke-width':1})); }
    for(var gl=35; gl<=60; gl+=5){ svg.appendChild(el('line',{x1:ox,y1:Y(gl),x2:ox+dw,y2:Y(gl),stroke:C.grey20,'stroke-width':1})); }
    var markets=Object.keys(D).filter(function(m){return GEO[m];});
    var maxA=1; for(var i=0;i<markets.length;i++){ if(D[markets[i]].alloc>maxA)maxA=D[markets[i]].alloc; }
    function rad(a){ return 5+26*Math.sqrt(a/maxA); }
    var oX=X(ORIGIN[0]), oY=Y(ORIGIN[1]);
    var defs=el('defs'); svg.appendChild(defs);
    var nodeEls={}, linkEls={};
    // links + flowing dots (drawn under nodes)
    for(var li=0;li<markets.length;li++){ var m=markets[li], gxy=GEO[m]; var tx=X(gxy[0]), ty=Y(gxy[1]); var cov=D[m].cov, col=bandColor(cov), a=D[m].alloc; var midx=(oX+tx)/2, midy=(oY+ty)/2 - Math.min(120,Math.abs(tx-oX)*0.35+30); var pid='f7p'+(uid++); var dd='M'+oX+' '+oY+' Q'+midx+' '+midy+' '+tx+' '+ty; var path=el('path',{id:pid,d:dd,fill:'none',stroke:rgba(col,0.28),'stroke-width':Math.max(1.5,2+8*(a/maxA)),'stroke-linecap':'round'}); svg.appendChild(path); linkEls[m]=path;
      var nd=Math.max(1,Math.min(6,Math.round(a/(maxA/6)))); var dur=(Math.hypot(tx-oX,ty-oY)/95); if(dur<0.8)dur=0.8;
      for(var di=0;di<nd;di++){ var dot=el('circle',{r:2.4,fill:rgba(col,0.95)}); var am=el('animateMotion',{dur:dur+'s',repeatCount:'indefinite',begin:(-(di/nd)*dur)+'s',rotate:'auto'}); var mp=el('mpath'); mp.setAttributeNS(XL,'href','#'+pid); mp.setAttribute('href','#'+pid); am.appendChild(mp); dot.appendChild(am); svg.appendChild(dot); } }
    // origin node
    svg.appendChild(el('rect',{x:oX-7,y:oY-7,width:14,height:14,rx:2,fill:C.charcoal,transform:'rotate(45 '+oX+' '+oY+')'}));
    var ol=el('text',{x:oX,y:oY+24,fill:C.charcoal,'font-family':SANS,'font-size':11,'font-weight':700,'text-anchor':'middle'}); ol.textContent='From the line'; svg.appendChild(ol);
    // market nodes
    for(var ni=0;ni<markets.length;ni++){ var mk=markets[ni], gc2=GEO[mk]; var x=X(gc2[0]), y=Y(gc2[1]); var cov2=D[mk].cov, col2=bandColor(cov2), r=rad(D[mk].alloc);
      var circ=el('circle',{cx:x,cy:y,r:r,fill:rgba(col2,0.82),stroke:C.white,'stroke-width':2}); circ.style.cursor='pointer'; svg.appendChild(circ); nodeEls[mk]=circ;
      var nlab=el('text',{x:x,y:y-r-5,fill:C.charcoal,'font-family':SANS,'font-size':12.5,'font-weight':700,'text-anchor':'middle'}); nlab.textContent=mk; svg.appendChild(nlab);
      var vlab=el('text',{x:x,y:y+r+14,fill:C.grey80,'font-family':SANS,'font-size':10.5,'text-anchor':'middle'}); vlab.textContent=Math.round(D[mk].alloc).toLocaleString()+' cars'; svg.appendChild(vlab);
      (function(name,cv,cx,cy,rr,cc,pathEl){ function emph(ev){ nodeEls[name].setAttribute('r',rr+3); nodeEls[name].setAttribute('fill',rgba(cc,0.95)); if(pathEl){ pathEl.setAttribute('stroke',rgba(cc,0.7)); } tip.innerHTML='<div style="font:700 13px/1.3 '+SANS+';margin-bottom:4px;">'+esc(name)+'</div>'+tipRow('Allocated',Math.round(D[name].alloc).toLocaleString()+' cars')+tipRow('In-market cover',(cv!=null?(Math.round(cv*10)/10)+' wks · '+bandName(cv):'no demand')); tip.style.opacity='1'; place(ev); } circ.addEventListener('mousemove',emph); circ.addEventListener('mouseenter',emph); circ.addEventListener('mouseleave',function(){ nodeEls[name].setAttribute('r',rr); nodeEls[name].setAttribute('fill',rgba(cc,0.82)); if(pathEl){ pathEl.setAttribute('stroke',rgba(cc,0.28)); } hideTip(); }); })(mk,cov2,x,y,r,col2,linkEls[mk]);
    }
  }

  var vSub=null;
  try { vSub=window.PigmentSDK.subscribeToVizualization('VF7',{ pageDefinitions:[], scroll:{offset:0,numberOfRows:1000}, onData:function(data){ if(!isReady(data))return; D=reshape(data); state='ready'; render(); }, onError:function(err){ state='error'; errMsg=(err&&err.message)||String(err); render(); } }); } catch(e){ state='error'; errMsg=e.message; render(); }
  render();
  var rT=null; function onResize(){ if(rT)clearTimeout(rT); rT=setTimeout(function(){ render(); },140); }
  window.addEventListener('resize',onResize);
  var ro=null; try{ ro=new ResizeObserver(onResize); ro.observe(document.documentElement); }catch(e){}
  root.__cleanup=function(){ try{ vSub&&vSub.unsubscribe&&vSub.unsubscribe(); }catch(e){} window.removeEventListener('resize',onResize); try{ if(ro)ro.disconnect(); }catch(e){} if(rT)clearTimeout(rT); if(tip&&tip.parentNode)tip.parentNode.removeChild(tip); };
})();
