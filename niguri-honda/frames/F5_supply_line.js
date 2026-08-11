/* Niguri Honda — Frame F5 · 'The Supply Line' (Option A · Marey diagram).
   One production week of a model, per market, descending seven journey stations
   (Production -> Shipment -> Floating -> Arrival -> Stock -> Wholesale -> Registration)
   across calendar time. Slope = speed through the network; flat = dwell; the
   Stock->Wholesale plateau is inventory waiting to sell. Live-bound, read-only.
   VL = view 'F5 Supply Line (per market)'; ModelList/ProdWeekList = coordinate lists.
   Frame id 6388f343-1030-4da2-abfb-a48fd5621a68. Frames are standalone pages and cannot
   read a board's page context, so Model + Production Week are in-frame pickers (defaulting
   to Civic LHD / WC 2026-09-21), scoping the bound view via updatePageDefinitions. */
(function(){
  'use strict';
  var root=document.getElementById('app');
  if(root&&root.__cleanup)root.__cleanup();
  if(!root)root=document.body;
  root.style.cssText='position:fixed;inset:0;width:100%;height:100%;overflow:hidden;background:#FFFFFF;';

  var MODEL_DEFAULT='Civic LHD', PW_DEFAULT='WC 2026-09-21';
  var DAY=86400000, WK=7*DAY;
  var C={white:'#FFFFFF',red:'#CC0000',charcoal:'#1A1A1A',grey80:'#6E6E73',grey60:'#C9C9CE',grey40:'#E3E3E7',grey20:'#F7F7F8',band:'#FAFAFB',na:'#EDEDF0'};
  var RED12='rgba(204,0,0,0.12)';
  var SERIF='"Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif';
  var SANS='-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
  var NS='http://www.w3.org/2000/svg';
  var STATIONS=['Production','Shipment','Floating','Arrival','Stock','Wholesale','Registration'];

  function el(t,a){ var e=document.createElementNS(NS,t); if(a)for(var k in a)e.setAttribute(k,a[k]); return e; }
  function h(t,css,txt){ var e=document.createElement(t); if(css)e.style.cssText=css; if(txt!=null)e.textContent=txt; return e; }
  function esc(s){ return String(s).replace(/[&<>]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':'&gt;';}); }
  function weekDate(v){ if(v==null)return null; var m=String(v).match(/(\d{4})-(\d{2})-(\d{2})/); if(!m)return null; return Date.UTC(+m[1],+m[2]-1,+m[3]); }
  var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtWeek(ms){ if(ms==null)return '—'; var d=new Date(ms); return d.getUTCDate()+' '+MO[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2); }
  function lastLabel(lbl){ if(Array.isArray(lbl)){ var v=lbl[lbl.length-1]; return (v&&typeof v==='object')?'':String(v); } return (lbl&&typeof lbl==='object')?'':String(lbl); }
  function num(v){ return (typeof v==='number'&&!isNaN(v))?v:(v==null?null:(isNaN(+v)?null:+v)); }
  function wks(a,b){ if(a==null||b==null)return null; return Math.round((b-a)/WK); }
  function hasLoadingKind(arr){ if(!arr)return false; for(var i=0;i<arr.length;i++){ var it=arr[i]; if(Array.isArray(it)){ if(hasLoadingKind(it))return true; } else if(it&&typeof it==='object'&&it.kind==='loading')return true; } return false; }
  function isReady(d){ if(!d||!d.labels||!d.labels.columns)return false; return !hasLoadingKind(d.labels.rows)&&!hasLoadingKind(d.labels.columns)&&!hasLoadingKind(d.cells); }

  function reshape(data){ var out={}; if(!data||!data.labels)return out; var cols=data.labels.columns||[],rows=data.labels.rows||[],cells=data.cells||[]; var idx={}; for(var c=0;c<cols.length;c++){ var lb=lastLabel(cols[c]).toLowerCase(); if(lb.indexOf('alloc')>=0)idx.alloc=c; else if(lb.indexOf('ship')>=0)idx.ship=c; else if(lb.indexOf('arriv')>=0)idx.arr=c; else if(lb.indexOf('stock')>=0)idx.stock=c; else if(lb.indexOf('sell')>=0||lb.indexOf('sale')>=0)idx.sale=c; else if(lb.indexOf('cover')>=0)idx.cover=c; else if(lb.indexOf('registration')>=0||lb.indexOf('reg')>=0)idx.reg=c; } function g(c,r){ return (c!=null&&cells[c])?cells[c][r]:null; } for(var r=0;r<rows.length;r++){ var mkt=lastLabel(rows[r]); if(!mkt)continue; var alloc=num(g(idx.alloc,r)); var rec={market:mkt,alloc:alloc,ship:weekDate(g(idx.ship,r)),arrival:weekDate(g(idx.arr,r)),stock:weekDate(g(idx.stock,r)),sale:weekDate(g(idx.sale,r)),cover:num(g(idx.cover,r)),regLag:num(g(idx.reg,r))}; rec.reg=(rec.sale!=null&&rec.regLag!=null)?rec.sale+rec.regLag*WK:rec.sale; out[mkt]=rec; } return out; }

  var state='loading', errMsg='', model=MODEL_DEFAULT, prodWeek=PW_DEFAULT;
  var baseModel='Civic', driveHand='LHD', models=[], pweeks=[];
  var dataMap={}, hoverMkt=null, pinned=[], laneHover=null, defaultLong=null;

  var wrap=h('div','position:absolute;inset:0;display:flex;flex-direction:column;background:'+C.white+';'); root.appendChild(wrap);
  var header=h('div','flex:0 0 auto;padding:18px 34px 8px 34px;'); wrap.appendChild(header);
  var toprow=h('div','display:flex;justify-content:space-between;align-items:flex-start;gap:24px;'); header.appendChild(toprow);
  var titleBox=h('div',''); toprow.appendChild(titleBox);
  titleBox.appendChild(h('div','font:600 11px/1.2 '+SANS+';letter-spacing:.16em;text-transform:uppercase;color:'+C.grey80+';','Niguri · Honda — one production week, traced'));
  titleBox.appendChild(h('div','margin-top:6px;font:400 26px/1.15 '+SERIF+';color:'+C.charcoal+';','The supply line'));
  var sub=h('div','margin-top:4px;font:400 13px/1.4 '+SANS+';color:'+C.grey80+';max-width:720px;'); titleBox.appendChild(sub);
  var pickBox=h('div','display:flex;gap:14px;align-items:flex-end;'); toprow.appendChild(pickBox);
  function mkSelect(label){ var box=h('div','display:flex;flex-direction:column;gap:6px;align-items:flex-start;'); box.appendChild(h('div','font:600 10px/1 '+SANS+';letter-spacing:.12em;text-transform:uppercase;color:'+C.grey80+';',label)); var s=document.createElement('select'); s.style.cssText='font:600 14px/1 '+SANS+';color:'+C.charcoal+';background:'+C.white+';border:1px solid '+C.grey60+';border-radius:8px;padding:8px 12px;cursor:pointer;'; box.appendChild(s); pickBox.appendChild(box); return s; }
  var baseSel=mkSelect('Base model'); baseSel.style.minWidth='120px';
  var handSel=mkSelect('Drive'); handSel.style.minWidth='80px';
  var pwSel=mkSelect('Production week'); pwSel.style.minWidth='150px';
  baseSel.addEventListener('change',function(){ baseModel=baseSel.value; var hs=handsByBase[baseModel]||[]; if(hs.indexOf(driveHand)<0)driveHand=hs[0]||''; resolveModel(); fillModelFilters(); reScope(); });
  handSel.addEventListener('change',function(){ driveHand=handSel.value; resolveModel(); reScope(); });
  pwSel.addEventListener('change',function(){ prodWeek=pwSel.value; reScope(); });

  var legend=h('div','display:flex;flex-wrap:wrap;gap:18px;align-items:center;margin-top:10px;font:500 12px/1 '+SANS+';color:'+C.charcoal+';'); header.appendChild(legend);
  function lgLine(color,label,dash,op){ var d=h('div','display:flex;gap:7px;align-items:center;'); var s=h('span','width:20px;height:0;display:inline-block;border-top:3px solid '+color+';'); if(dash)s.style.borderTopStyle='dashed'; if(op)s.style.opacity=op; d.appendChild(s); d.appendChild(h('span','',label)); return d; }
  legend.appendChild(h('span','font-weight:700;','Each line = one market’s cars'));
  legend.appendChild(lgLine(C.charcoal,'steeper = faster through the network'));
  legend.appendChild(lgLine(C.charcoal,'flat = waiting (the Stock plateau)'));
  legend.appendChild(lgLine(C.red,'highlighted market'));
  legend.appendChild(lgLine(C.charcoal,'retail tail (sold → registered)',false,'0.5'));
  var hint=h('span','font:italic 500 12px/1 '+SANS+';color:'+C.grey80+';','Hover a line or a station · click up to two markets to compare'); legend.appendChild(hint);

  var main=h('div','flex:1 1 auto;min-height:0;display:flex;'); wrap.appendChild(main);
  var stage=h('div','position:relative;flex:1 1 auto;min-width:0;'); main.appendChild(stage);
  var aside=h('div','flex:0 0 312px;border-left:1px solid '+C.grey40+';padding:16px 20px;display:flex;flex-direction:column;gap:12px;overflow:hidden;'); main.appendChild(aside);
  aside.appendChild(h('div','font:600 10px/1 '+SANS+';letter-spacing:.14em;text-transform:uppercase;color:'+C.grey80+';','What this shows'));
  var cardWrap=h('div','display:flex;flex-direction:column;gap:10px;'); aside.appendChild(cardWrap);
  function mkCard(){ var c=h('div','border:1px solid '+C.grey40+';border-left:3px solid '+C.red+';border-radius:8px;padding:11px 13px;background:'+C.white+';'); var t=h('div','font:700 12px/1.3 '+SANS+';color:'+C.charcoal+';margin-bottom:5px;'); var b=h('div','font:400 12.5px/1.45 '+SANS+';color:'+C.grey80+';'); c.appendChild(t); c.appendChild(b); cardWrap.appendChild(c); return {t:t,b:b,box:c}; }
  var cardA=mkCard(), cardB=mkCard(), cardC=mkCard();

  var footer=h('div','flex:0 0 auto;padding:5px 34px 10px 34px;font:italic 400 12px/1.3 '+SANS+';color:'+C.grey80+';','Illustrative demonstration model — not a solution design. One dot at top-left = the week’s production; each line is that week’s cars for one market, descending as they ship, cross the water, land, wait in stock, sell, and register.'); wrap.appendChild(footer);

  var svg=el('svg',{width:'100%',height:'100%'}); svg.style.cssText='position:absolute;inset:0;display:block;'; stage.appendChild(svg);
  var tip=h('div','position:fixed;z-index:99;pointer-events:none;opacity:0;transition:opacity .1s;max-width:280px;background:'+C.charcoal+';color:'+C.white+';padding:10px 12px;border-radius:8px;font:500 12px/1.5 '+SANS+';box-shadow:0 8px 24px rgba(0,0,0,.28);'); document.body.appendChild(tip);
  function tipRow(k,v){ return '<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:'+C.grey60+';">'+esc(k)+'</span><span style="color:#fff;font-weight:600;">'+esc(v)+'</span></div>'; }
  function place(ev){ var pad=15,tw=tip.offsetWidth,th=tip.offsetHeight; var x=ev.clientX+pad,y=ev.clientY+pad; if(x+tw>window.innerWidth-8)x=ev.clientX-tw-pad; if(y+th>window.innerHeight-8)y=ev.clientY-th-pad; tip.style.left=x+'px'; tip.style.top=y+'px'; }
  function showLineTip(ev,m){ var r=dataMap[m]; if(!r){hideTip();return;} var L=[]; L.push('<div style="font:700 13px/1.3 '+SANS+';margin-bottom:5px;">'+esc(m)+' · '+esc(Math.round(r.alloc).toLocaleString())+' cars</div>'); L.push(tipRow('Ships',fmtWeek(r.ship))); L.push(tipRow('Arrives',fmtWeek(r.arrival))); L.push(tipRow('In stock',fmtWeek(r.stock))); L.push(tipRow('Sells (peak)',fmtWeek(r.sale))); L.push(tipRow('Registered',fmtWeek(r.reg))); L.push(tipRow('In-market cover',(r.cover!=null?(Math.round(r.cover*10)/10)+' wks':'—'))); tip.innerHTML=L.join(''); tip.style.opacity='1'; place(ev); }
  function hideTip(){ tip.style.opacity='0'; }

  var M={top:48,bottom:104,left:150,right:52};
  function size(){ return { w: stage.clientWidth||window.innerWidth-312, h: stage.clientHeight||(window.innerHeight-260) }; }
  function eligible(){ var arr=[]; for(var k in dataMap){ var r=dataMap[k]; if(r.alloc!=null&&r.alloc>0&&r.ship!=null&&r.arrival!=null&&r.stock!=null&&r.sale!=null)arr.push(r); } arr.sort(function(a,b){ return (b.stock||0)-(a.stock||0); }); return arr; }
  function originDate(){ var o=weekDate(prodWeek); if(o!=null)return o; var arr=eligible(),mn=null; for(var i=0;i<arr.length;i++){ if(arr[i].ship!=null&&(mn==null||arr[i].ship<mn))mn=arr[i].ship; } return mn!=null?mn-2*WK:Date.UTC(2026,8,21); }
  function clearSvg(){ while(svg.firstChild)svg.removeChild(svg.firstChild); }

  function activeSet(){ if(pinned.length)return pinned.slice(); if(hoverMkt)return [hoverMkt]; return defaultLong?[defaultLong]:[]; }
  function engaged(){ return pinned.length>0||hoverMkt!=null; }

  function render(){
    clearSvg(); var sz=size(),W=sz.w,H=sz.h;
    if(state==='error'){ var te=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); te.textContent='Could not load data — '+errMsg; svg.appendChild(te); return; }
    if(state!=='ready'){ sub.textContent=model+' · '+prodWeek+' · loading…'; for(var i=0;i<7;i++){ var yy=M.top+(H-M.top-M.bottom)/7*(i+0.25); var sk=el('rect',{x:M.left,y:yy,width:(W-M.left-M.right),height:(H-M.top-M.bottom)/7*0.5,rx:3,fill:C.grey20}); var an=el('animate',{attributeName:'opacity',values:'0.5;1;0.5',dur:'1.3s',repeatCount:'indefinite'}); sk.appendChild(an); svg.appendChild(sk); } return; }
    var arr=eligible(); defaultLong=arr.length?arr[0].market:null;
    if(!arr.length){ sub.textContent=model+' · '+prodWeek+' · nothing allocated'; var t0=el('text',{x:W/2,y:H/2,fill:C.grey80,'font-family':SANS,'font-size':15,'text-anchor':'middle'}); t0.textContent='No cars allocated for '+model+' in '+prodWeek+'.'; svg.appendChild(t0); updateCards(arr); return; }
    var x0=originDate(); var x1=x0; for(var i2=0;i2<arr.length;i2++){ var rr=arr[i2]; var last=rr.reg!=null?rr.reg:rr.sale; if(last!=null&&last>x1)x1=last; } if(x1<=x0)x1=x0+WK; x1+=Math.max(WK,(x1-x0)*0.04);
    var plotL=M.left, plotR=W-M.right, laneT=M.top, laneB=H-M.bottom, laneH=(laneB-laneT)/7;
    function X(d){ return plotL+(d-x0)/(x1-x0)*(plotR-plotL); }
    function Y(i){ return laneT+(i+0.5)*laneH; }
    sub.textContent=model+' · production week '+prodWeek+' · '+arr.length+' markets, built in one week and followed to registration';
    // station bands + labels
    for(var s=0;s<7;s++){ var by=laneT+s*laneH; svg.appendChild(el('rect',{x:plotL,y:by,width:(plotR-plotL),height:laneH,fill:(s%2?C.band:C.white)})); var isLane=(laneHover===s); var lb=el('text',{x:16,y:Y(s)+4,fill:(isLane?C.red:C.grey80),'font-family':SANS,'font-size':13,'font-weight':(isLane?700:600)}); lb.textContent=STATIONS[s]; svg.appendChild(lb); }
    // month gridlines
    var seen={}; var oneMonth=28*DAY; var step=Math.max(1,Math.round((x1-x0)/oneMonth)); for(var t=x0; t<=x1; t+=7*DAY){ var d=new Date(t); var key=d.getUTCFullYear()+'-'+d.getUTCMonth(); if(seen[key])continue; seen[key]=1; var mx=X(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)); if(mx<plotL-2)mx=plotL; svg.appendChild(el('line',{x1:mx,y1:laneT,x2:mx,y2:laneB,stroke:C.grey40,'stroke-width':1})); var ml=el('text',{x:mx+4,y:laneT-8,fill:C.grey80,'font-family':SANS,'font-size':11}); ml.textContent=MO[d.getUTCMonth()]+' '+String(d.getUTCFullYear()).slice(2); svg.appendChild(ml); }
    // today rule
    var today=Date.UTC(2026,7,10); if(today>=x0&&today<=x1){ var tx=X(today); svg.appendChild(el('line',{x1:tx,y1:laneT,x2:tx,y2:laneB,stroke:C.red,'stroke-width':1,'stroke-dasharray':'3 3'})); var tl=el('text',{x:tx+4,y:laneB-6,fill:C.red,'font-family':SANS,'font-size':10,'font-weight':700}); tl.textContent='today'; svg.appendChild(tl); }
    // lane hit-rects (hover a station)
    for(var s2=0;s2<7;s2++){ (function(si){ var hr=el('rect',{x:plotL,y:laneT+si*laneH,width:(plotR-plotL),height:laneH,fill:'transparent'}); hr.style.cursor='crosshair'; hr.addEventListener('mouseenter',function(){ laneHover=si; render(); }); hr.addEventListener('mouseleave',function(){ if(laneHover===si){laneHover=null; render();} }); svg.appendChild(hr); })(s2); }
    var maxA=1; for(var a3=0;a3<arr.length;a3++){ if(arr[a3].alloc>maxA)maxA=arr[a3].alloc; }
    var act=activeSet(), actMap={}; for(var q=0;q<act.length;q++)actMap[act[q]]=1; var eng=engaged();
    function nodesFor(r){ var mid=(r.ship+r.arrival)/2; return [ [x0,0],[r.ship,1],[mid,2],[r.arrival,3],[r.stock,4],[r.sale,5],[(r.reg!=null?r.reg:r.sale),6] ]; }
    // draw non-active first, then active on top
    function drawLine(r,onTop){ var isAct=!!actMap[r.market]; if(onTop!==isAct)return; var col=isAct?C.red:C.charcoal; var op=isAct?1:(eng?0.16:0.55); var w=1.5+2.5*(r.alloc/maxA); var nds=nodesFor(r); var main=''; for(var i=0;i<6;i++){ var px=X(nds[i][0]),py=Y(nds[i][1]); main+=(i?' L':'M')+px.toFixed(1)+' '+py.toFixed(1); } var p1=el('path',{d:main,fill:'none',stroke:col,'stroke-width':w,'stroke-linejoin':'round','stroke-linecap':'round',opacity:op}); svg.appendChild(p1); var tx1=X(nds[5][0]),ty1=Y(5),tx2=X(nds[6][0]),ty2=Y(6); svg.appendChild(el('path',{d:'M'+tx1.toFixed(1)+' '+ty1.toFixed(1)+' L'+tx2.toFixed(1)+' '+ty2.toFixed(1),fill:'none',stroke:col,'stroke-width':w,'stroke-linecap':'round',opacity:op*0.5})); for(var n=0;n<7;n++){ var showTick=(laneHover===n); svg.appendChild(el('circle',{cx:X(nds[n][0]),cy:Y(n),r:(isAct?3.6:2.6),fill:col,opacity:op})); if(showTick&&(isAct||!eng)){ var dt=el('text',{x:X(nds[n][0]),y:Y(n)-7,fill:col,'font-family':SANS,'font-size':10,'font-weight':600,'text-anchor':'middle',opacity:Math.max(op,0.5)}); dt.textContent=fmtWeek(nds[n][0]); svg.appendChild(dt); } }
      // end label (vertical, hung in the bottom margin, aligned to the line end)
      var endX=X(nds[6][0]); var lop=isAct?1:(eng?0.3:0.72); svg.appendChild(el('line',{x1:endX,y1:Y(6),x2:endX,y2:laneB,stroke:col,'stroke-width':1,opacity:op*0.4})); var lyy=laneB+9; var elab=el('text',{x:endX,y:lyy,fill:col,'font-family':SANS,'font-size':11,'font-weight':(isAct?700:600),'text-anchor':'start','dominant-baseline':'central',opacity:lop}); elab.setAttribute('transform','rotate(90 '+endX.toFixed(1)+' '+lyy+')'); elab.textContent=r.market+' · '+Math.round(r.alloc).toLocaleString(); svg.appendChild(elab);
      // hit line (wide, transparent) for hover/click
      var hit=el('path',{d:main,fill:'none',stroke:'transparent','stroke-width':Math.max(12,w+10),'stroke-linejoin':'round'}); hit.style.cursor='pointer'; (function(mkt){ hit.addEventListener('mousemove',function(ev){ hoverMkt=mkt; showLineTip(ev,mkt); render(); }); hit.addEventListener('mouseleave',function(){ hoverMkt=null; hideTip(); render(); }); hit.addEventListener('click',function(ev){ ev.stopPropagation(); togglePin(mkt); }); })(r.market); svg.appendChild(hit); }
    for(var d1=0;d1<arr.length;d1++)drawLine(arr[d1],false);
    for(var d2=0;d2<arr.length;d2++)drawLine(arr[d2],true);
    // origin dot (shared) on top
    svg.appendChild(el('circle',{cx:X(x0),cy:Y(0),r:5,fill:C.charcoal})); var od=el('text',{x:X(x0),y:Y(0)-10,fill:C.charcoal,'font-family':SANS,'font-size':11,'font-weight':700,'text-anchor':'middle'}); od.textContent=fmtWeek(x0); svg.appendChild(od);
    // assumption chips for a single active market
    if(act.length===1){ var r=dataMap[act[0]]; if(r){ var nds2=nodesFor(r); function chip(i0,i1,label){ var mx=(X(nds2[i0][0])+X(nds2[i1][0]))/2, my=(Y(i0)+Y(i1))/2; var tw=label.length*6.2+10; var bg=el('rect',{x:mx-tw/2,y:my-9,width:tw,height:18,rx:9,fill:C.white,stroke:C.red,'stroke-width':1,opacity:0.95}); svg.appendChild(bg); var tt=el('text',{x:mx,y:my+4,fill:C.red,'font-family':SANS,'font-size':10.5,'font-weight':700,'text-anchor':'middle'}); tt.textContent=label; svg.appendChild(tt); } var tr=wks(r.ship,r.arrival), ib=wks(r.arrival,r.stock), dw=wks(r.stock,r.sale); if(tr!=null)chip(1,3,tr+' wks at sea'); if(ib!=null)chip(3,4,ib+' wks to showroom'); if(dw!=null)chip(4,5,dw+' wks on the lot'); } }
    updateCards(arr);
  }

  function togglePin(mkt){ var i=pinned.indexOf(mkt); if(i>=0){ pinned.splice(i,1); } else { pinned.push(mkt); if(pinned.length>2)pinned.shift(); } render(); }

  function updateCards(arr){ if(!arr||!arr.length){ cardA.t.textContent='—'; cardA.b.textContent='Nothing allocated for this model and production week.'; cardB.box.style.display='none'; cardC.box.style.display='none'; return; } cardB.box.style.display=''; cardC.box.style.display='';
    var x0=originDate(); var eS=null,lS=null,eM='',lM='',fastW=null,slowW=null,fastM='',slowM=''; for(var i=0;i<arr.length;i++){ var r=arr[i]; if(r.stock!=null){ if(eS==null||r.stock<eS){eS=r.stock;eM=r.market;} if(lS==null||r.stock>lS){lS=r.stock;lM=r.market;} var w=wks(x0,r.stock); if(w!=null){ if(fastW==null||w<fastW){fastW=w;fastM=r.market;} if(slowW==null||w>slowW){slowW=w;slowM=r.market;} } } }
    var spread=(eS!=null&&lS!=null)?Math.round((lS-eS)/WK):0;
    cardA.t.textContent='One week of production, '+arr.length+' destinations'; cardA.b.textContent='Cars built the week of '+fmtWeek(x0)+' reach showrooms between '+fmtWeek(eS)+' and '+fmtWeek(lS)+' — a '+spread+'-week spread across Europe.';
    cardB.t.textContent='Fastest vs slowest to market'; cardB.b.textContent=fastM+' is showroom-ready in '+fastW+' weeks; '+slowM+' takes '+slowW+' — '+(slowW-fastW)+' weeks longer, almost all of it on the water.';
    var act=activeSet(); var fm=act.length?dataMap[act[0]]:null; if(fm){ var extra=(pinned.length===2)?(' Compared with '+pinned[0]+' vs '+pinned[1]+'.'):''; cardC.t.textContent=fm.market+' — highlighted'; cardC.b.textContent=Math.round(fm.alloc).toLocaleString()+' cars · in-market cover '+(fm.cover!=null?(Math.round(fm.cover*10)/10)+' wks':'—')+'. Ships '+fmtWeek(fm.ship)+', sells '+fmtWeek(fm.sale)+', registered by '+fmtWeek(fm.reg)+'.'+extra; } else { cardC.t.textContent='Pick a market'; cardC.b.textContent='Hover a line to trace one market, or click up to two to compare.'; }
  }

  // ---- filters ----
  var bases=[], handsByBase={};
  function parseModel(name){ var m=String(name).match(/^(.*?)\s+(LHD|RHD)$/); if(m)return {base:m[1],hand:m[2]}; return {base:name,hand:''}; }
  function deriveFilters(){ bases=[]; handsByBase={}; for(var i=0;i<models.length;i++){ var p=parseModel(models[i]); if(bases.indexOf(p.base)<0)bases.push(p.base); if(!handsByBase[p.base])handsByBase[p.base]=[]; if(p.hand&&handsByBase[p.base].indexOf(p.hand)<0)handsByBase[p.base].push(p.hand); } if(bases.indexOf(baseModel)<0)baseModel=bases[0]||baseModel; var hs=handsByBase[baseModel]||[]; if(hs.length&&hs.indexOf(driveHand)<0)driveHand=hs[0]; resolveModel(); }
  function resolveModel(){ var cand=driveHand?(baseModel+' '+driveHand):baseModel; if(models.length&&models.indexOf(cand)<0){ var f=[]; for(var i=0;i<models.length;i++){ if(parseModel(models[i]).base===baseModel)f.push(models[i]); } cand=f[0]||cand; } model=cand; }
  function fillModelFilters(){ baseSel.innerHTML=''; for(var i=0;i<bases.length;i++){ var o=document.createElement('option'); o.value=bases[i]; o.textContent=bases[i]; if(bases[i]===baseModel)o.selected=true; baseSel.appendChild(o); } var hs=handsByBase[baseModel]||[]; handSel.innerHTML=''; for(var j=0;j<hs.length;j++){ var o2=document.createElement('option'); o2.value=hs[j]; o2.textContent=hs[j]; if(hs[j]===driveHand)o2.selected=true; handSel.appendChild(o2); } handSel.parentNode.style.display=hs.length>1?'':'none'; }
  function fillPwFilter(){ pwSel.innerHTML=''; for(var i=0;i<pweeks.length;i++){ var o=document.createElement('option'); o.value=pweeks[i]; o.textContent=pweeks[i]; if(pweeks[i]===prodWeek)o.selected=true; pwSel.appendChild(o); } }

  function reScope(){ pinned=[]; hoverMkt=null; state='loading'; render(); var pd=[{alias:'ModelList',selection:[model]},{alias:'ProdWeekList',selection:[prodWeek]}]; if(vlSub){ try{ vlSub.updatePageDefinitions(pd); }catch(e){} } }

  // ---- subscription ----
  var vlSub=null;
  try { vlSub=window.PigmentSDK.subscribeToVizualization('VL',{ pageDefinitions:[{alias:'ModelList',selection:[model]},{alias:'ProdWeekList',selection:[prodWeek]}], scroll:{offset:0,numberOfRows:100}, onData:function(data){ if(!isReady(data))return; dataMap=reshape(data); state='ready'; render(); }, onError:function(err){ state='error'; errMsg=(err&&err.message)||String(err); render(); } }); } catch(e){ state='error'; errMsg=e.message; render(); }

  var SEED=['Civic LHD','Civic RHD','CR-V LHD','CR-V RHD','HR-V LHD','HR-V RHD','Jazz LHD','Jazz RHD','e:Ny1 LHD','e:Ny1 RHD'];
  function itemName(it){ if(it==null)return null; if(typeof it==='string')return it; var nm=it.name||it.label||it.displayName||it.title||it.key||it.id; if(nm)return String(nm); if(it.values&&it.values.length){ var v0=it.values[0]; return String(v0&&typeof v0==='object'?(v0.value!=null?v0.value:''):v0); } return null; }
  models=SEED.slice(); deriveFilters(); fillModelFilters();
  pweeks=[PW_DEFAULT]; fillPwFilter();
  var mItems=null,pItems=null;
  try { mItems=window.PigmentSDK.subscribeToItems('ModelList',{ onData:function(d){ var it=(d&&d.items)||[]; var names=[]; for(var i=0;i<it.length;i++){ var nm=itemName(it[i]); if(nm)names.push(nm); } if(names.length){ models=names; deriveFilters(); fillModelFilters(); } }, onError:function(){} }); } catch(e){}
  try { pItems=window.PigmentSDK.subscribeToItems('ProdWeekList',{ onData:function(d){ var it=(d&&d.items)||[]; var names=[]; for(var i=0;i<it.length;i++){ var nm=itemName(it[i]); if(nm)names.push(nm); } names=names.filter(function(n){return /\d{4}-\d{2}-\d{2}/.test(n);}); names.sort(); if(names.length){ pweeks=names; if(pweeks.indexOf(prodWeek)<0)prodWeek=(pweeks.indexOf(PW_DEFAULT)>=0?PW_DEFAULT:pweeks[0]); fillPwFilter(); } }, onError:function(){} }); } catch(e){}

  svg.addEventListener('click',function(){ if(pinned.length){ pinned=[]; render(); } });
  render();

  var rT=null; function onResize(){ if(rT)clearTimeout(rT); rT=setTimeout(function(){ render(); },120); }
  window.addEventListener('resize',onResize);
  var ro=null; try{ ro=new ResizeObserver(onResize); ro.observe(document.documentElement); }catch(e){}

  root.__cleanup=function(){ try{ vlSub&&vlSub.unsubscribe&&vlSub.unsubscribe(); }catch(e){} try{ mItems&&mItems.unsubscribe&&mItems.unsubscribe(); }catch(e){} try{ pItems&&pItems.unsubscribe&&pItems.unsubscribe(); }catch(e){} window.removeEventListener('resize',onResize); try{ if(ro)ro.disconnect(); }catch(e){} if(rT)clearTimeout(rT); if(tip&&tip.parentNode)tip.parentNode.removeChild(tip); };
})();
