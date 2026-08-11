/* Niguri Honda — Frame F6 · "Where the plan flows" (allocation Sankey).
   Left nodes = models, right nodes = markets; each ribbon = units allocated from a model to a market,
   coloured by that market's in-market cover (red = still tight, grey = balanced, charcoal = long).
   Whole-network view. Live-bound, read-only. VF6 = view 'F6 Allocation flow (model x market)'. */
(function () {
  'use strict';
  var root = document.getElementById('app');
  if (root && root.__cleanup) root.__cleanup();
  if (!root) root = document.body;
  root.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;overflow:hidden;background:#FFFFFF;';
  var C = { white:'#FFFFFF', red:'#CC0000', charcoal:'#1A1A1A', grey80:'#6E6E73', grey60:'#C9C9CE', grey40:'#E3E3E7', grey20:'#F7F7F8', na:'#EDEDF0' };
  var SERIF = '"Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif';
  var SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  var NS = 'http://www.w3.org/2000/svg';
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

  function reshape(data){ var links=[], mdlT={}, mktT={}, mktCov={}; if(!data||!data.labels)return {links:links}; var cols=data.labels.columns||[], rows=data.labels.rows||[], cells=data.cells||[]; var ai=0, ci=1; for(var c=0;c<cols.length;c++){ var lb=lastLabel(cols[c]).toLowerCase(); if(lb.indexOf('alloc')>=0)ai=c; else if(lb.indexOf('cover')>=0)ci=c; } for(var r=0;r<rows.length;r++){ var lv=rows[r]; if(!Array.isArray(lv))lv=[lv]; if(lv.length<2)continue; var mdl=strOf(lv[0]), mkt=strOf(lv[lv.length-1]); if(mdl==null||mkt==null)continue; var alloc=num(cells[ai]?cells[ai][r]:null); var cov=num(cells[ci]?cells[ci][r]:null); if(alloc==null||alloc<=0)continue; links.push({mdl:mdl,mkt:mkt,units:alloc,cov:cov}); mdlT[mdl]=(mdlT[mdl]||0)+alloc; mktT[mkt]=(mktT[mkt]||0)+alloc; if(cov!=null)mktCov[mkt]=cov; } return {links:links, mdlT:mdlT, mktT:mktT, mktCov:mktCov}; }

  var state='loading', errMsg='', D=null, hoverKey=null, hoverNode=null;

  var wrap=h('div','position:absolute;inset:0;display:flex;flex-direction:column;background:'+C.white+';'); root.appendChild(wrap);
  var header=h('div','flex:0 0 auto;padding:20px 40px 6px 40px;'); wrap.appendChild(header);
  header.appendChild(h('div','font:600 11px/1.2 '+SANS+';letter-spacing:.16em;text-transform:uppercase;color:'+C.grey80+';','Niguri · Honda — the whole book at a glance'));
  header.appendChild(h('div','margin-top:6px;font:400 26px/1.15 '+SERIF+';color:'+C.charcoal+';','Where the plan flows'));
  var sub=h('div','margin-top:4px;font:400 13px/1.4 '+SANS+';color:'+C.grey80+';','Every model on the left, every market on the right. Ribbon width = cars allocated; colour = how that market’s cover looks once they land.'); header.appendChild(sub);
  var legend=h('div','display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:10px;font:500 12px/1 '+SANS+';color:'+C.charcoal+';'); header.appendChild(legend);
  function sw(color,label){ var d=h('div','display:flex;gap:7px;align-items:center;'); d.appendChild(h('span','width:22px;height:10px;border-radius:2px;display:inline-block;background:'+rgba(color,0.55)+';')); d.appendChild(h('span','',label)); return d; }
  legend.appendChild(h('span','font-weight:700;','Lands as:'));
  legend.appendChild(sw(C.red,'Tight — under 2 wks cover'));
  legend.appendChild(sw(C.grey60,'Balanced — 2–4 wks'));
  legend.appendChild(sw(C.charcoal,'Long — over 4 wks'));
  var hint=h('span','font:italic 500 12px/1 '+SANS+';color:'+C.grey80+';','Hover a ribbon or a node'); legend.appendChild(hint);

  var stage=h('div','position:relative;flex:1 1 auto;min-height:0;'); wrap.appendChild(stage);
  var footer=h('div','flex:0 0 auto;padding:5px 40px 10px 40px;font:italic 400 12px/1.3 '+SANS+';color:'+C.grey80+';','Illustrative demonstration model — not a solution design. Allocation summed across the whole horizon; cover is the latest in-market reading.'); wrap.appendChild(footer);
  var svg=el('svg',{width:'100%',height:'100%'}); svg.style.cssText='position:absolute;inset:0;display:block;'; stage.appendChild(svg);

  var tip=h('div','position:fixed;z-index:99;pointer-events:none;opacity:0;transition:opacity .1s;max-width:260px;background:'+C.charcoal+';color:'+C.white+';padding:10px 12px;border-radius:8px;font:500 12px/1.5 '+SANS+';box-shadow:0 8px 24px rgba(0,0,0,.28);'); document.body.appendChild(tip);
  function tipRow(k,v){ return '<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:'+C.grey60+';">'+esc(k)+'</span><span style="color:#fff;font-weight:600;">'+esc(v)+'</span></div>'; }
  function place(ev){ var pad=15,tw=tip.offsetWidth,th=tip.offsetHeight; var x=ev.clientX+pad,y=ev.clientY+pad; if(x+tw>window.innerWidth-8)x=ev.clientX-tw-pad; if(y+th>window.innerHeight-8)y=ev.clientY-th-pad; tip.style.left=x+'px'; tip.style.top=y+'px'; }
  function hideTip(){ tip.style.opacity='0'; }

  var M={ top:18, bottom:18, left:150, right:170 }, NODEW=13, GAP=7;
  function size(){ return { w: stage.clientWidth||window.innerWidth, h: stage.clientHeight||(window.innerHeight-230) }; }
  function clearSvg(){ while(svg.firstChild)svg.removeChild(svg.firstChild); }

  function render(){
    clearSvg(); var sz=size(), W=sz.w, H=sz.h;
    if(state==='error'){ var te=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); te.textContent='Could not load data — '+errMsg; svg.appendChild(te); return; }
    if(state!=='ready'||!D){ for(var i=0;i<8;i++){ var yy=M.top+(H-M.top-M.bottom)/8*(i+0.3); var sk=el('rect',{x:M.left,y:yy,width:(W-M.left-M.right),height:12,rx:3,fill:C.grey20}); var an=el('animate',{attributeName:'opacity',values:'0.5;1;0.5',dur:'1.3s',repeatCount:'indefinite'}); sk.appendChild(an); svg.appendChild(sk); } return; }
    var models=Object.keys(D.mdlT).sort(function(a,b){return D.mdlT[b]-D.mdlT[a];});
    var markets=Object.keys(D.mktT).sort(function(a,b){return D.mktT[b]-D.mktT[a];});
    var grand=0; for(var i=0;i<models.length;i++)grand+=D.mdlT[models[i]];
    if(!models.length||!markets.length||grand<=0){ var t0=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); t0.textContent='Nothing allocated to show.'; svg.appendChild(t0); return; }
    var plotTop=M.top, plotH=H-M.top-M.bottom;
    var maxN=Math.max(models.length,markets.length);
    var u=(plotH-(maxN-1)*GAP)/grand; if(u<=0)u=0.0001;
    var xM=M.left, xK=W-M.right-NODEW, xm=(xM+NODEW+xK)/2;
    // node vertical positions
    function stack(keys,tot){ var sumH=0; for(var i=0;i<keys.length;i++)sumH+=tot[keys[i]]*u; var top=plotTop+(plotH-(sumH+(keys.length-1)*GAP))/2; var pos={}; for(var j=0;j<keys.length;j++){ var hh=tot[keys[j]]*u; pos[keys[j]]={y:top,h:hh}; top+=hh+GAP; } return pos; }
    var mp=stack(models,D.mdlT), kp=stack(markets,D.mktT);
    // node rects
    for(var mi=0;mi<models.length;mi++){ var mk=models[mi],p=mp[mk]; var dim=(hoverNode&&hoverNode!==mk&&!(hoverKey))?0.4:1; var rc=el('rect',{x:xM,y:p.y,width:NODEW,height:Math.max(1,p.h),rx:2,fill:C.charcoal,opacity:(hoverNode===mk?1:0.85*dim)}); rc.style.cursor='pointer'; (function(name){ rc.addEventListener('mouseenter',function(){hoverNode=name;hoverKey=null;render();}); rc.addEventListener('mouseleave',function(){hoverNode=null;render();hideTip();}); rc.addEventListener('mousemove',function(ev){ tip.innerHTML='<div style="font:700 13px/1.3 '+SANS+';margin-bottom:4px;">'+esc(name)+'</div>'+tipRow('Allocated',Math.round(D.mdlT[name]).toLocaleString()+' cars'); tip.style.opacity='1'; place(ev); }); })(mk); svg.appendChild(rc); var lab=el('text',{x:xM-8,y:p.y+p.h/2+4,fill:C.charcoal,'font-family':SANS,'font-size':12.5,'font-weight':600,'text-anchor':'end'}); lab.textContent=mk; svg.appendChild(lab); }
    for(var ki=0;ki<markets.length;ki++){ var kk=markets[ki],q=kp[kk]; var cov=D.mktCov[kk]; var col=bandColor(cov); var dimk=(hoverNode&&hoverNode!==kk&&!(hoverKey))?0.4:1; var rk=el('rect',{x:xK,y:q.y,width:NODEW,height:Math.max(1,q.h),rx:2,fill:col,opacity:(hoverNode===kk?1:0.9*dimk)}); rk.style.cursor='pointer'; (function(name,cv){ rk.addEventListener('mouseenter',function(){hoverNode=name;hoverKey=null;render();}); rk.addEventListener('mouseleave',function(){hoverNode=null;render();hideTip();}); rk.addEventListener('mousemove',function(ev){ tip.innerHTML='<div style="font:700 13px/1.3 '+SANS+';margin-bottom:4px;">'+esc(name)+'</div>'+tipRow('Allocated',Math.round(D.mktT[name]).toLocaleString()+' cars')+tipRow('In-market cover',(cv!=null?(Math.round(cv*10)/10)+' wks · '+bandName(cv):'no demand')); tip.style.opacity='1'; place(ev); }); })(kk,cov); svg.appendChild(rk); var labk=el('text',{x:xK+NODEW+8,y:q.y+q.h/2+4,fill:C.charcoal,'font-family':SANS,'font-size':12.5,'font-weight':600}); labk.textContent=kk; svg.appendChild(labk); }
    // ribbons (model outer, market inner) — build then draw so hovered sits on top
    var mOff={}, kOff={}; for(var a=0;a<models.length;a++)mOff[models[a]]=mp[models[a]].y; for(var b=0;b<markets.length;b++)kOff[markets[b]]=kp[markets[b]].y;
    var ribs=[]; var linksByModel={}; for(var li=0;li<D.links.length;li++){ var L=D.links[li]; (linksByModel[L.mdl]=linksByModel[L.mdl]||[]).push(L); }
    for(var mo=0;mo<models.length;mo++){ var mm=models[mo]; var ml=(linksByModel[mm]||[]).slice(); ml.sort(function(a,b){return markets.indexOf(a.mkt)-markets.indexOf(b.mkt);}); for(var j=0;j<ml.length;j++){ var Lk=ml[j]; var w=Lk.units*u; var aTop=mOff[mm], bTop=kOff[Lk.mkt]; mOff[mm]+=w; kOff[Lk.mkt]+=w; ribs.push({L:Lk,x0:xM+NODEW,x1:xK,aTop:aTop,bTop:bTop,w:w,key:mm+'→'+Lk.mkt}); } }
    function ribPath(x0,x1,aTop,bTop,w){ var c=(x0+x1)/2; return 'M'+x0+' '+aTop+' C'+c+' '+aTop+' '+c+' '+bTop+' '+x1+' '+bTop+' L'+x1+' '+(bTop+w)+' C'+c+' '+(bTop+w)+' '+c+' '+(aTop+w)+' '+x0+' '+(aTop+w)+' Z'; }
    function drawRib(rb,on){ var isH=(hoverKey===rb.key); if(on!==isH)return; var col=bandColor(rb.L.cov); var base=(hoverKey||hoverNode)?(isH||hoverNode===rb.L.mdl||hoverNode===rb.L.mkt?0.7:0.08):0.42; var p=el('path',{d:ribPath(rb.x0,rb.x1,rb.aTop,rb.bTop,Math.max(0.6,rb.w)),fill:rgba(col,base),stroke:'none'}); p.style.cursor='pointer'; (function(L,key){ p.addEventListener('mouseenter',function(){hoverKey=key;hoverNode=null;render();}); p.addEventListener('mouseleave',function(){hoverKey=null;render();hideTip();}); p.addEventListener('mousemove',function(ev){ tip.innerHTML='<div style="font:700 13px/1.3 '+SANS+';margin-bottom:4px;">'+esc(L.mdl)+' → '+esc(L.mkt)+'</div>'+tipRow('Allocated',Math.round(L.units).toLocaleString()+' cars')+tipRow('Lands as',(L.cov!=null?(Math.round(L.cov*10)/10)+' wks · '+bandName(L.cov):'no demand')); tip.style.opacity='1'; place(ev); }); })(rb.L,rb.key); svg.appendChild(p); }
    for(var d1=0;d1<ribs.length;d1++)drawRib(ribs[d1],false);
    for(var d2=0;d2<ribs.length;d2++)drawRib(ribs[d2],true);
  }

  var vSub=null;
  try { vSub=window.PigmentSDK.subscribeToVizualization('VF6',{ pageDefinitions:[], scroll:{offset:0,numberOfRows:1000}, onData:function(data){ if(!isReady(data))return; D=reshape(data); state='ready'; render(); }, onError:function(err){ state='error'; errMsg=(err&&err.message)||String(err); render(); } }); } catch(e){ state='error'; errMsg=e.message; render(); }
  render();
  var rT=null; function onResize(){ if(rT)clearTimeout(rT); rT=setTimeout(function(){ render(); },120); }
  window.addEventListener('resize',onResize);
  var ro=null; try{ ro=new ResizeObserver(onResize); ro.observe(document.documentElement); }catch(e){}
  root.__cleanup=function(){ try{ vSub&&vSub.unsubscribe&&vSub.unsubscribe(); }catch(e){} window.removeEventListener('resize',onResize); try{ if(ro)ro.disconnect(); }catch(e){} if(rT)clearTimeout(rT); if(tip&&tip.parentNode)tip.parentNode.removeChild(tip); };
})();
