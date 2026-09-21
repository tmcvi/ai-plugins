(function(){
'use strict';
var root=document.getElementById('app');
if(root.__cleanup)root.__cleanup();
root.style.cssText='position:fixed;inset:0;overflow:auto;padding:16px;background:#fff;font:12px/1.5 ui-monospace,Menlo,Consolas,monospace;color:#111827';
var pre=document.createElement('pre');
pre.style.whiteSpace='pre-wrap';
pre.style.margin='0';
root.appendChild(pre);
var subs=[];
function w(s){var d=document.createElement('div');d.textContent=(s==null?'':String(s));pre.appendChild(d);}
function brief(d,n){
if(!d||typeof d!=='object')return String(d);
var out='totalRowCount='+d.totalRowCount+' rowOffset='+d.rowOffset+' returned='+(d.rows?d.rows.length:0);
if(!d.rows)return out+' keys='+Object.keys(d).join(',');
var lim=Math.min(n,d.rows.length);
for(var i=0;i<lim;i++){
var r=d.rows[i];
out=out+'  |  ['+(r.labels?r.labels.join(' / '):'?')+'] = '+(r.values?r.values.join(', '):'?');
}
if(d.rows.length>lim)out=out+'  |  ...+'+(d.rows.length-lim)+' more rows';
return out;
}
function ds(label,name,filters,rows){
try{
subs.push(window.PigmentSDK.subscribeToDataSource(name,{dynamicFilters:filters,onData:function(d){
w('OK   '+label+' -> '+brief(d,rows||4));
},onError:function(e){w('ERR  '+label+' -> '+(e&&e.message?e.message:JSON.stringify(e).slice(0,300)));}}));
}catch(err){w('THROW '+label+' -> '+(err&&err.message?err.message:String(err)));}
}
w('probe v3 - label axes and the dynamicFilters shape');
w('');
w('--- A. label axes (no filter) ---');
ds('cash: labels[month] values[receipts]','cash',[],3);
ds('stageMonth: labels[stages,month] values[phase]','stageMonth',[],4);
w('');
w('--- B. dynamicFilters candidates on grid, target Project 7 (v1) ---');
w('unfiltered grid summed 139.6 across all versions, so a working filter changes the values');
var V='Project 7 (v1)';
ds('c1 {selector,values}','grid',[{selector:'versions',values:[V]}],3);
ds('c2 {binding,values}','grid',[{binding:'versions',values:[V]}],3);
ds('c3 {alias,selection}','grid',[{alias:'versions',selection:[V]}],3);
ds('c4 {name,values}','grid',[{name:'versions',values:[V]}],3);
ds('c5 {dimension,items}','grid',[{dimension:'versions',items:[V]}],3);
ds('c6 {selector,selection}','grid',[{selector:'versions',selection:[V]}],3);
ds('c7 {binding,modalities}','grid',[{binding:'versions',modalities:[V]}],3);
ds('c8 bare map','grid',[{versions:[V]}],3);
root.__cleanup=function(){for(var i=0;i<subs.length;i++){try{subs[i].unsubscribe();}catch(e){}}subs=[];root.innerHTML='';root.__cleanup=null;};
})();
