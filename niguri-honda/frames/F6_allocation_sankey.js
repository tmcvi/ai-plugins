/* Niguri Honda — Frame F6 · "Where the plan flows" (allocation Sankey). v2: year/month/week filter,
   hover highlight without re-render, unit counts on node labels.
   Left nodes = models, right nodes = markets; each ribbon = units allocated from a model to a market,
   coloured by that market's in-market cover (red tight / grey balanced / charcoal long).
   Live-bound, read-only. VF6 = view 'F6 Allocation flow (by production week)'; ProdWeekList = Production Week. */
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
  var MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
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
  function fmtN(n){ return Math.round(n).toLocaleString(); }

  function reshape(data){ var links=[], mdlT={}, mktT={}, mktCov={}; if(!data||!data.labels)return {links:links, mdlT:mdlT, mktT:mktT, mktCov:mktCov}; var cols=data.labels.columns||[], rows=data.labels.rows||[], cells=data.cells||[]; var ai=0, ci=1; for(var c=0;c<cols.length;c++){ var lb=lastLabel(cols[c]).toLowerCase(); if(lb.indexOf('alloc')>=0)ai=c; else if(lb.indexOf('cover')>=0)ci=c; } for(var r=0;r<rows.length;r++){ var lv=rows[r]; if(!Array.isArray(lv))lv=[lv]; if(lv.length<2)continue; var mdl=strOf(lv[0]), mkt=strOf(lv[lv.length-1]); if(mdl==null||mkt==null)continue; var alloc=num(cells[ai]?cells[ai][r]:null); var cov=num(cells[ci]?cells[ci][r]:null); if(alloc==null||alloc<=0)continue; links.push({mdl:mdl,mkt:mkt,units:alloc,cov:cov}); mdlT[mdl]=(mdlT[mdl]||0)+alloc; mktT[mkt]=(mktT[mkt]||0)+alloc; if(cov!=null)mktCov[mkt]=cov; } return {links:links, mdlT:mdlT, mktT:mktT, mktCov:mktCov}; }

  var state='loading', errMsg='', D=null;
  var pweeks=[], fYear='All', fMonth='All', fWeek='All';

  var wrap=h('div','position:absolute;inset:0;display:flex;flex-direction:column;background:'+C.white+';'); root.appendChild(wrap);
  var header=h('div','flex:0 0 auto;padding:20px 40px 6px 40px;'); wrap.appendChild(header);
  var toprow=h('div','display:flex;justify-content:space-between;align-items:flex-start;gap:24px;'); header.appendChild(toprow);
  var titleBox=h('div',''); toprow.appendChild(titleBox);
  titleBox.appendChild(h('div','font:600 11px/1.2 '+SANS+';letter-spacing:.16em;text-transform:uppercase;color:'+C.grey80+';','Niguri · Honda — the whole book at a glance'));
  titleBox.appendChild(h('div','margin-top:6px;font:400 26px/1.15 '+SERIF+';color:'+C.charcoal+';','Where the plan flows'));
  var sub=h('div','margin-top:4px;font:400 13px/1.4 '+SANS+';color:'+C.grey80+';max-width:640px;','Every model on the left, every market on the right. Ribbon width = cars allocated; colour = how that market’s cover looks once they land.'); titleBox.appendChild(sub);
  var pickBox=h('div','display:flex;gap:12px;align-items:flex-end;'); toprow.appendChild(pickBox);
  function mkSelect(label){ var box=h('div','display:flex;flex-direction:column;gap:6px;align-items:flex-start;'); box.appendChild(h('div','font:600 10px/1 '+SANS+';letter-spacing:.12em;text-transform:uppercase;color:'+C.grey80+';',label)); var s=document.createElement('select'); s.style.cssText='font:600 13px/1 '+SANS+';color:'+C.charcoal+';background:'+C.white+';border:1px solid '+C.grey60+';border-radius:8px;padding:7px 10px;cursor:pointer;'; box.appendChild(s); pickBox.appendChild(box); return s; }
  var yearSel=mkSelect('Year'); var monSel=mkSelect('Month'); var wkSel=mkSelect('Week');
  yearSel.addEventListener('change',function(){ fYear=yearSel.value; fMonth='All'; fWeek='All'; fillPeriod(); scope(); });
  monSel.addEventListener('change',function(){ fMonth=monSel.value; fWeek='All'; fillPeriod(); scope(); });
  wkSel.addEventListener('change',function(){ fWeek=wkSel.value; scope(); });

  var legend=h('div','display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin-top:10px;font:500 12px/1 '+SANS+';color:'+C.charcoal+';'); header.appendChild(legend);
  function sw(color,label){ var d=h('div','display:flex;gap:7px;align-items:center;'); d.appendChild(h('span','width:22px;height:10px;border-radius:2px;display:inline-block;background:'+rgba(color,0.55)+';')); d.appendChild(h('span','',label)); return d; }
  legend.appendChild(h('span','font-weight:700;','Lands as:'));
  legend.appendChild(sw(C.red,'Tight — under 2 wks cover'));
  legend.appendChild(sw(C.grey60,'Balanced — 2–4 wks'));
  legend.appendChild(sw(C.charcoal,'Long — over 4 wks'));
  var hint=h('span','font:italic 500 12px/1 '+SANS+';color:'+C.grey80+';','Hover a ribbon or a node for the exact units'); legend.appendChild(hint);

  var stage=h('div','position:relative;flex:1 1 auto;min-height:0;'); wrap.appendChild(stage);
  var footer=h('div','flex:0 0 auto;padding:5px 40px 10px 40px;font:italic 400 12px/1.3 '+SANS+';color:'+C.grey80+';','Illustrative demonstration model — not a solution design. Ribbons show units allocated in the chosen production period; cover is the latest in-market reading.'); wrap.appendChild(footer);
  var svg=el('svg',{width:'100%',height:'100%'}); svg.style.cssText='position:absolute;inset:0;display:block;'; stage.appendChild(svg);

  var tip=h('div','position:fixed;z-index:99;pointer-events:none;opacity:0;transition:opacity .1s;max-width:260px;background:'+C.charcoal+';color:'+C.white+';padding:10px 12px;border-radius:8px;font:500 12px/1.5 '+SANS+';box-shadow:0 8px 24px rgba(0,0,0,.28);'); document.body.appendChild(tip);
  function tipRow(k,v){ return '<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:'+C.grey60+';">'+esc(k)+'</span><span style="color:#fff;font-weight:600;">'+esc(v)+'</span></div>'; }
  function place(ev){ var pad=15,tw=tip.offsetWidth,th=tip.offsetHeight; var x=ev.clientX+pad,y=ev.clientY+pad; if(x+tw>window.innerWidth-8)x=ev.clientX-tw-pad; if(y+th>window.innerHeight-8)y=ev.clientY-th-pad; tip.style.left=x+'px'; tip.style.top=y+'px'; }
  function hideTip(){ tip.style.opacity='0'; }

  var M={ top:18, bottom:18, left:150, right:170 }, NODEW=13, GAP=7;
  function size(){ return { w: stage.clientWidth||window.innerWidth, h: stage.clientHeight||(window.innerHeight-240) }; }
  function clearSvg(){ while(svg.firstChild)svg.removeChild(svg.firstChild); }

  // element registries for hover-without-rerender
  var ribReg=[], mNodeReg={}, kNodeReg={};
  function setEmph(kind,a,b){ // kind: 'rib'|'mdl'|'mkt'
    for(var i=0;i<ribReg.length;i++){ var R=ribReg[i]; var on=(kind==='rib')?(R.key===a):(kind==='mdl')?(R.mdl===a):(R.mkt===a); R.el.setAttribute('fill', rgba(bandColor(R.cov), on?0.75:0.06)); }
    for(var m in mNodeReg){ var onm=(kind==='rib')?(m===a):(kind==='mdl')?(m===a):false; var relm=(kind==='mkt')? hasLink(m,a) : onm; mNodeReg[m].el.setAttribute('opacity', (kind==='mkt'? (relm?0.95:0.3) : (onm?1:0.3))); }
    for(var k in kNodeReg){ var onk=(kind==='rib')?(k===b):(kind==='mkt')?(k===a):false; var relk=(kind==='mdl')? hasLink(a,k) : onk; kNodeReg[k].el.setAttribute('opacity', (kind==='mdl'? (relk?0.98:0.3) : (onk?1:0.3))); }
  }
  function hasLink(mdl,mkt){ for(var i=0;i<D.links.length;i++){ if(D.links[i].mdl===mdl&&D.links[i].mkt===mkt)return true; } return false; }
  function clearEmph(){ for(var i=0;i<ribReg.length;i++){ ribReg[i].el.setAttribute('fill', rgba(bandColor(ribReg[i].cov),0.42)); } for(var m in mNodeReg)mNodeReg[m].el.setAttribute('opacity',0.85); for(var k in kNodeReg)kNodeReg[k].el.setAttribute('opacity',0.9); }

  function render(){
    clearSvg(); ribReg=[]; mNodeReg={}; kNodeReg={}; var sz=size(), W=sz.w, H=sz.h;
    if(state==='error'){ var te=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); te.textContent='Could not load data — '+errMsg; svg.appendChild(te); return; }
    if(state!=='ready'||!D){ for(var i=0;i<8;i++){ var yy=M.top+(H-M.top-M.bottom)/8*(i+0.3); var sk=el('rect',{x:M.left,y:yy,width:(W-M.left-M.right),height:12,rx:3,fill:C.grey20}); var an=el('animate',{attributeName:'opacity',values:'0.5;1;0.5',dur:'1.3s',repeatCount:'indefinite'}); sk.appendChild(an); svg.appendChild(sk); } return; }
    var models=Object.keys(D.mdlT).sort(function(a,b){return D.mdlT[b]-D.mdlT[a];});
    var markets=Object.keys(D.mktT).sort(function(a,b){return D.mktT[b]-D.mktT[a];});
    var grand=0; for(var gi=0;gi<models.length;gi++)grand+=D.mdlT[models[gi]];
    if(!models.length||!markets.length||grand<=0){ var t0=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); t0.textContent='Nothing allocated in this period.'; svg.appendChild(t0); return; }
    var plotTop=M.top, plotH=H-M.top-M.bottom;
    var maxN=Math.max(models.length,markets.length);
    var u=(plotH-(maxN-1)*GAP)/grand; if(u<=0)u=0.0001;
    var xM=M.left, xK=W-M.right-NODEW;
    function stack(keys,tot){ var sumH=0; for(var i=0;i<keys.length;i++)sumH+=tot[keys[i]]*u; var top=plotTop+(plotH-(sumH+(keys.length-1)*GAP))/2; var pos={}; for(var j=0;j<keys.length;j++){ var hh=tot[keys[j]]*u; pos[keys[j]]={y:top,h:hh}; top+=hh+GAP; } return pos; }
    var mp=stack(models,D.mdlT), kp=stack(markets,D.mktT);
    // ribbons first (under nodes)
    var mOff={}, kOff={}; for(var a=0;a<models.length;a++)mOff[models[a]]=mp[models[a]].y; for(var b=0;b<markets.length;b++)kOff[markets[b]]=kp[markets[b]].y;
    var linksByModel={}; for(var li=0;li<D.links.length;li++){ var L=D.links[li]; (linksByModel[L.mdl]=linksByModel[L.mdl]||[]).push(L); }
    function ribPath(x0,x1,aTop,bTop,w){ var c=(x0+x1)/2; return 'M'+x0+' '+aTop+' C'+c+' '+aTop+' '+c+' '+bTop+' '+x1+' '+bTop+' L'+x1+' '+(bTop+w)+' C'+c+' '+(bTop+w)+' '+c+' '+(aTop+w)+' '+x0+' '+(aTop+w)+' Z'; }
    for(var mo=0;mo<models.length;mo++){ var mm=models[mo]; var ml=(linksByModel[mm]||[]).slice(); ml.sort(function(a,b){return markets.indexOf(a.mkt)-markets.indexOf(b.mkt);}); for(var j=0;j<ml.length;j++){ var Lk=ml[j]; var w=Lk.units*u; var aTop=mOff[mm], bTop=kOff[Lk.mkt]; mOff[mm]+=w; kOff[Lk.mkt]+=w; var key=mm+'→'+Lk.mkt; var p=el('path',{d:ribPath(xM+NODEW,xK,aTop,bTop,Math.max(0.6,w)),fill:rgba(bandColor(Lk.cov),0.42),stroke:'none'}); p.style.cursor='pointer'; svg.appendChild(p); ribReg.push({el:p,key:key,mdl:mm,mkt:Lk.mkt,cov:Lk.cov}); (function(L,k){ function show(ev){ setEmph('rib',k,L.mkt); tip.innerHTML='<div style="font:700 13px/1.3 '+SANS+';margin-bottom:4px;">'+esc(L.mdl)+' → '+esc(L.mkt)+'</div>'+tipRow('Allocated',fmtN(L.units)+' cars')+tipRow('Lands as',(L.cov!=null?(Math.round(L.cov*10)/10)+' wks · '+bandName(L.cov):'no demand')); tip.style.opacity='1'; place(ev); } p.addEventListener('mouseenter',show); p.addEventListener('mousemove',show); p.addEventListener('mouseleave',function(){ clearEmph(); hideTip(); }); })(Lk,key); } }
    // nodes + labels (with unit counts)
    for(var mi=0;mi<models.length;mi++){ var mk=models[mi],pp=mp[mk]; var rc=el('rect',{x:xM,y:pp.y,width:NODEW,height:Math.max(1,pp.h),rx:2,fill:C.charcoal,opacity:0.85}); rc.style.cursor='pointer'; svg.appendChild(rc); mNodeReg[mk]={el:rc}; (function(name){ function show(ev){ setEmph('mdl',name,null); tip.innerHTML='<div style="font:700 13px/1.3 '+SANS+';margin-bottom:4px;">'+esc(name)+'</div>'+tipRow('Allocated',fmtN(D.mdlT[name])+' cars'); tip.style.opacity='1'; place(ev); } rc.addEventListener('mouseenter',show); rc.addEventListener('mousemove',show); rc.addEventListener('mouseleave',function(){ clearEmph(); hideTip(); }); })(mk); var lab=el('text',{x:xM-8,y:pp.y+pp.h/2,fill:C.charcoal,'font-family':SANS,'font-size':12.5,'font-weight':600,'text-anchor':'end'}); lab.textContent=mk; svg.appendChild(lab); var lab2=el('text',{x:xM-8,y:pp.y+pp.h/2+13,fill:C.grey80,'font-family':SANS,'font-size':10.5,'text-anchor':'end'}); lab2.textContent=fmtN(D.mdlT[mk])+' cars'; svg.appendChild(lab2); }
    for(var ki=0;ki<markets.length;ki++){ var kk=markets[ki],qq=kp[kk]; var cov=D.mktCov[kk]; var col=bandColor(cov); var rk=el('rect',{x:xK,y:qq.y,width:NODEW,height:Math.max(1,qq.h),rx:2,fill:col,opacity:0.9}); rk.style.cursor='pointer'; svg.appendChild(rk); kNodeReg[kk]={el:rk}; (function(name,cv){ function show(ev){ setEmph('mkt',name,null); tip.innerHTML='<div style="font:700 13px/1.3 '+SANS+';margin-bottom:4px;">'+esc(name)+'</div>'+tipRow('Allocated',fmtN(D.mktT[name])+' cars')+tipRow('In-market cover',(cv!=null?(Math.round(cv*10)/10)+' wks · '+bandName(cv):'no demand')); tip.style.opacity='1'; place(ev); } rk.addEventListener('mouseenter',show); rk.addEventListener('mousemove',show); rk.addEventListener('mouseleave',function(){ clearEmph(); hideTip(); }); })(kk,cov); var labk=el('text',{x:xK+NODEW+8,y:qq.y+qq.h/2,fill:C.charcoal,'font-family':SANS,'font-size':12.5,'font-weight':600}); labk.textContent=kk; svg.appendChild(labk); var labk2=el('text',{x:xK+NODEW+8,y:qq.y+qq.h/2+13,fill:C.grey80,'font-family':SANS,'font-size':10.5}); labk2.textContent=fmtN(D.mktT[kk])+' cars'; svg.appendChild(labk2); }
  }

  // ---- period filter ----
  function periodLabel(){ if(fYear==='All')return 'whole horizon'; if(fMonth==='All')return fYear; if(fWeek!=='All')return 'w/c '+fWeek.replace(/^WC\s*/,''); return MONTHS[+fMonth]+' '+fYear; }
  function parseWk(lbl){ var m=String(lbl).match(/(\d{4})-(\d{2})-(\d{2})/); if(!m)return null; return {lbl:lbl, y:m[1], mo:String(+m[2]-1), d:lbl}; }
  function pwSelection(){ if(fYear==='All')return null; var out=[]; for(var i=0;i<pweeks.length;i++){ var p=pweeks[i]; if(p.y!==fYear)continue; if(fMonth!=='All'&&p.mo!==fMonth)continue; if(fWeek!=='All'&&p.lbl!==fWeek)continue; out.push(p.lbl); } return out.length?out:null; }
  function fillPeriod(){ var years=[]; for(var i=0;i<pweeks.length;i++){ if(years.indexOf(pweeks[i].y)<0)years.push(pweeks[i].y); } years.sort(); yearSel.innerHTML=''; var yo=['All'].concat(years); for(var a=0;a<yo.length;a++){ var o=document.createElement('option'); o.value=yo[a]; o.textContent=(yo[a]==='All'?'All years':yo[a]); if(yo[a]===fYear)o.selected=true; yearSel.appendChild(o); }
    var mons=[]; for(var j=0;j<pweeks.length;j++){ if(fYear!=='All'&&pweeks[j].y===fYear&&mons.indexOf(pweeks[j].mo)<0)mons.push(pweeks[j].mo); } mons.sort(function(a,b){return +a-+b;}); monSel.innerHTML=''; var mo=['All'].concat(mons); for(var b=0;b<mo.length;b++){ var o2=document.createElement('option'); o2.value=mo[b]; o2.textContent=(mo[b]==='All'?'All months':MONTHS[+mo[b]]); if(mo[b]===fMonth)o2.selected=true; monSel.appendChild(o2); } monSel.parentNode.style.display=(fYear==='All')?'none':'';
    var wks=[]; for(var k=0;k<pweeks.length;k++){ if(fYear!=='All'&&pweeks[k].y===fYear&&(fMonth==='All'||pweeks[k].mo===fMonth))wks.push(pweeks[k].lbl); } wks.sort(); wkSel.innerHTML=''; var wo=['All'].concat(wks); for(var c=0;c<wo.length;c++){ var o3=document.createElement('option'); o3.value=wo[c]; o3.textContent=(wo[c]==='All'?'All weeks':wo[c].replace(/^WC\s*/,'w/c ')); if(wo[c]===fWeek)o3.selected=true; wkSel.appendChild(o3); } wkSel.parentNode.style.display=(fYear==='All'||fMonth==='All')?'none':''; }

  var vSub=null;
  function scope(){ sub.textContent='Production period: '+periodLabel()+' — ribbon width = cars allocated; colour = cover on landing.'; var sel=pwSelection(); var pd = sel? [{alias:'ProdWeekList',selection:sel}] : []; if(vSub){ try{ vSub.updatePageDefinitions(pd); }catch(e){} } }
  try { vSub=window.PigmentSDK.subscribeToVizualization('VF6',{ pageDefinitions:[], scroll:{offset:0,numberOfRows:1000}, onData:function(data){ if(!isReady(data))return; D=reshape(data); state='ready'; render(); }, onError:function(err){ state='error'; errMsg=(err&&err.message)||String(err); render(); } }); } catch(e){ state='error'; errMsg=e.message; render(); }

  var itemsSub=null;
  function itemName(it){ if(it==null)return null; if(typeof it==='string')return it; var nm=it.name||it.label||it.displayName||it.title||it.key||it.id; if(nm)return String(nm); if(it.values&&it.values.length){ var v0=it.values[0]; return String(v0&&typeof v0==='object'?(v0.value!=null?v0.value:''):v0); } return null; }
  fillPeriod();
  try { itemsSub=window.PigmentSDK.subscribeToItems('ProdWeekList',{ onData:function(d){ var it=(d&&d.items)||[]; var arr=[]; for(var i=0;i<it.length;i++){ var nm=itemName(it[i]); var p=nm?parseWk(nm):null; if(p)arr.push(p); } if(arr.length){ arr.sort(function(a,b){return a.lbl<b.lbl?-1:1;}); pweeks=arr; fillPeriod(); } }, onError:function(){} }); } catch(e){}

  render();
  var rT=null; function onResize(){ if(rT)clearTimeout(rT); rT=setTimeout(function(){ render(); },120); }
  window.addEventListener('resize',onResize);
  var ro=null; try{ ro=new ResizeObserver(onResize); ro.observe(document.documentElement); }catch(e){}
  root.__cleanup=function(){ try{ vSub&&vSub.unsubscribe&&vSub.unsubscribe(); }catch(e){} try{ itemsSub&&itemsSub.unsubscribe&&itemsSub.unsubscribe(); }catch(e){} window.removeEventListener('resize',onResize); try{ if(ro)ro.disconnect(); }catch(e){} if(rT)clearTimeout(rT); if(tip&&tip.parentNode)tip.parentNode.removeChild(tip); };
})();
