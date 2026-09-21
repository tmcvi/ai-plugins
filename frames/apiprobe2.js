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
function dump(v,cap){try{var s=JSON.stringify(v);if(s===undefined)return String(v);return s.length>cap?s.slice(0,cap)+'  ...TRUNCATED, total '+s.length+' chars':s;}catch(e){return 'unstringifiable '+(typeof v);}}
var sdk=window.PigmentSDK;
function ds(name){
w('');
w('=== subscribeToDataSource '+name+' ===');
try{
subs.push(sdk.subscribeToDataSource(name,{dynamicFilters:[],onData:function(d){
w(name+' KEYS: '+(d&&typeof d==='object'?Object.keys(d).join(', '):typeof d));
w(name+' PAYLOAD: '+dump(d,4000));
},onError:function(e){w(name+' ERROR: '+(e&&e.message?e.message:dump(e,400)));}}));
w(name+' subscribed, waiting');
}catch(err){w(name+' THREW: '+(err&&err.message?err.message:String(err)));}
}
function items(name){
w('');
w('=== subscribeToItems '+name+' ===');
try{
subs.push(sdk.subscribeToItems(name,{onData:function(d){
w(name+' KEYS: '+(d&&typeof d==='object'?Object.keys(d).join(', '):typeof d));
w(name+' PAYLOAD: '+dump(d,2500));
},onError:function(e){w(name+' ERROR: '+(e&&e.message?e.message:dump(e,400)));}}));
w(name+' subscribed, waiting');
}catch(err){w(name+' THREW: '+(err&&err.message?err.message:String(err)));}
}
w('probe v2 - dataSource and list payload shapes');
w('src  = labels[versions] values[peak Sum]');
w('grid = labels[stages] selectors[versions] values[phase Sum]');
ds('src');
ds('grid');
items('versions');
items('stages');
root.__cleanup=function(){for(var i=0;i<subs.length;i++){try{subs[i].unsubscribe();}catch(e){}}subs=[];root.innerHTML='';root.__cleanup=null;};
})();
