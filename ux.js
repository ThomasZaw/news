// Small interface helpers shared by the whole site: messages, pop-up sheets, sharing, saved stories,
// low-data mode, loading shimmer, simple charts and the first-visit opening.
window.PX=(function(){
'use strict';
var MM=window.PD_LANG==='mm',RM=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function el(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
function store(k,v){try{if(v===undefined){return JSON.parse(localStorage.getItem(k))}localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
function T(en,my){return MM&&my?my:en}
function svg(d,box){var s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox',box||'0 0 24 24');s.setAttribute('aria-hidden','true');s.innerHTML=d;return s}
var IC={
 share:'<path d="M12 15V4M8 8l4-4 4 4M5 12v7h14v-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
 save:'<path d="M7 4h10v16l-5-4-5 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
 saved:'<path d="M7 4h10v16l-5-4-5 4z" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
 more:'<circle cx="5" cy="12" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><circle cx="19" cy="12" r="1.8" fill="currentColor"/>',
 x:'<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
 copy:'<rect x="8" y="8" width="11" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 16V5h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
 open:'<path d="M14 5h5v5M19 5l-8 8M11 7H5v12h12v-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
};

/* Short messages that appear at the bottom and go away */
var toastBox=null,toastT=null;
function toast(msg){
  if(!toastBox){toastBox=el('div','toast');toastBox.setAttribute('role','status');toastBox.setAttribute('aria-live','polite');document.body.append(toastBox)}
  toastBox.textContent=msg;toastBox.classList.add('on');clearTimeout(toastT);toastT=setTimeout(function(){toastBox.classList.remove('on')},2800);
}

/* Pop-up sheet. Uses the browser's own dialog so the keyboard and the Escape key work. */
function sheet(title,my,build,cls){
  var d=el('dialog','sheet'+(cls?' '+cls:'')),head=el('div','sheet-h'),h=el('h2',null,T(title,my)),x=el('button','tool sheet-x'),body=el('div','sheet-b');
  x.type='button';x.setAttribute('aria-label',T('Close','ပိတ်ရန်'));x.append(svg(IC.x));head.append(h,x);d.append(head,body);document.body.append(d);
  function close(){if(d.open)d.close()}
  x.onclick=close;d.addEventListener('click',function(e){if(e.target===d)close()});d.addEventListener('close',function(){d.remove()});
  build(body,close);
  if(d.showModal)d.showModal();else d.setAttribute('open','');
  return {el:d,body:body,close:close};
}

/* Low-data mode: smaller photos, and maps only load when asked for */
function lite(v){
  if(v!==undefined){store('pd-lite',!!v);if(v)document.documentElement.dataset.lite='1';else delete document.documentElement.dataset.lite;return !!v}
  var s=store('pd-lite');if(s!=null)return !!s;
  var c=navigator.connection;return !!(c&&(c.saveData||/(^|-)2g$/.test(c.effectiveType||'')));
}
// Photos are fetched through a free image resizer so they arrive small, in a modern format, and do not break when an outlet blocks outside sites.
function img(src,w){
  if(!/^https:\/\//.test(src||''))return src;
  if(lite())w=Math.min(w,320);
  return 'https://wsrv.nl/?url='+encodeURIComponent(src)+'&w='+w+'&q='+(lite()?45:70)+'&output=webp&we';
}

/* Saved stories, kept on this device */
function savedList(){return store('pd-saved')||[]}
function isSaved(u){return savedList().some(function(i){return i.url===u})}
function toggleSave(i){
  var l=savedList(),had=l.some(function(x){return x.url===i.url});
  l=l.filter(function(x){return x.url!==i.url});
  if(!had)l.unshift({title:i.title,url:i.url,source:i.source,img:i.img||null,published:i.published,topic:i.topic||'',at:Date.now()});
  store('pd-saved',l.slice(0,100));toast(had?T('Removed from saved stories','သိမ်းထားသည့်စာရင်းမှ ဖယ်ပြီး'):T('Saved. Find it in Settings, Saved stories.','သိမ်းပြီးပါပြီ'));
  document.dispatchEvent(new Event('pd-saved'));return !had;
}

/* Sharing: Viber, Messenger and Telegram first, since that is how news travels in Myanmar */
function shareLinks(d){
  var u=encodeURIComponent(d.url),t=encodeURIComponent(d.title||''),both=encodeURIComponent((d.title?d.title+' ':'')+d.url),mob=/Android|iPhone|iPad/i.test(navigator.userAgent);
  return [['Viber','viber://forward?text='+both,'#7360F2'],
          ['Messenger',mob?'fb-messenger://share?link='+u:'https://www.facebook.com/sharer/sharer.php?u='+u,'#0A7CFF'],
          ['Telegram','https://t.me/share/url?url='+u+'&text='+t,'#2AABEE'],
          ['Facebook','https://www.facebook.com/sharer/sharer.php?u='+u,'#1877F2']];
}
function copy(text,done){(navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject()).then(function(){toast(done||T('Link copied','လင့်ခ်ကူးပြီး'))},function(){window.prompt(T('Copy this link','ဤလင့်ခ်ကို ကူးပါ'),text)})}
function shareRow(d,close){
  var g=el('div','share-grid');
  shareLinks(d).forEach(function(r){var a=el('a','share-b');a.href=r[1];a.target='_blank';a.rel='noopener';var i=el('i');i.style.background=r[2];i.textContent=r[0][0];a.append(i,el('span',null,r[0]));a.onclick=function(){setTimeout(close,50)};g.append(a)});
  var c=el('button','share-b');c.type='button';var ci=el('i','plain');ci.append(svg(IC.copy));c.append(ci,el('span',null,T('Copy link','လင့်ခ်ကူး')));c.onclick=function(){copy(d.url);close()};g.append(c);
  if(navigator.share){var m=el('button','share-b');m.type='button';var mi=el('i','plain');mi.append(svg(IC.more));m.append(mi,el('span',null,T('More','အခြား')));m.onclick=function(){navigator.share({title:d.title,text:d.title,url:d.url}).catch(function(){});close()};g.append(m)}
  return g;
}
function share(d){sheet('Share','မျှဝေရန်',function(b,close){b.append(el('p','sheet-sub',d.title||d.url),shareRow(d,close))},'narrow')}
// One menu for a news story: save it, share it, or open it.
function storyMenu(i){
  sheet('Story','သတင်း',function(b,close){
    b.append(el('p','sheet-sub',i.title),el('p','small-note',(i.source||'')));
    var row=el('div','sheet-acts'),s=el('button','btn'),o=el('a','btn btn-gold');
    function lab(){s.textContent='';s.append(svg(isSaved(i.url)?IC.saved:IC.save),T(isSaved(i.url)?'Saved':'Save for later',isSaved(i.url)?'သိမ်းပြီး':'နောက်မှဖတ်ရန် သိမ်း'))}
    s.type='button';lab();s.onclick=function(){toggleSave(i);lab()};
    o.href=i.url;o.target='_blank';o.rel='noopener';o.append(svg(IC.open),T('Open story','သတင်းဖွင့်ရန်'));o.onclick=function(){setTimeout(close,50)};
    row.append(s,o);b.append(row,el('h3','sec',T('Share','မျှဝေရန်')),shareRow({title:i.title,url:i.url},close));
  },'narrow');
}
function moreBtn(i,cls){var b=el('button','more-b'+(cls?' '+cls:''));b.type='button';b.setAttribute('aria-label',T('Save or share this story','ဤသတင်းကို သိမ်းရန် သို့မဟုတ် မျှဝေရန်'));b.append(svg(IC.more));b.onclick=function(e){e.preventDefault();e.stopPropagation();storyMenu(i)};return b}
function shareBtn(d,label){var b=el('button','btn share-btn');b.type='button';b.append(svg(IC.share),label||T('Share','မျှဝေရန်'));b.onclick=function(){share(d)};return b}

/* Cards lift into place as they scroll into view */
var io=null;
function rise(n){
  if(RM||!window.IntersectionObserver){return n}
  if(!io)io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -6% 0px'});
  n.classList.add('rise');io.observe(n);return n;
}
/* Numbers count up the first time they are shown */
var counted={};
function count(n,to,fmt,key){
  fmt=fmt||function(v){return String(Math.round(v))};
  if(RM||counted[key]||!isFinite(to)){n.textContent=fmt(to);return n}
  counted[key]=1;var t0=null,from=to*0.6;
  function step(t){if(t0==null)t0=t;var p=Math.min(1,(t-t0)/700),e=1-Math.pow(1-p,3);n.textContent=fmt(from+(to-from)*e);if(p<1)requestAnimationFrame(step)}
  n.textContent=fmt(from);requestAnimationFrame(step);return n;
}
/* Smooth change between sections, and a gold ripple when switching light and dark */
function vt(fn){if(RM||!document.startViewTransition){fn();return}try{document.startViewTransition(fn)}catch(e){fn()}}
function themeFlip(btn,fn){
  if(RM||!document.startViewTransition){fn();return}
  var r=btn.getBoundingClientRect(),h=document.documentElement;h.style.setProperty('--vx',(r.left+r.width/2)+'px');h.style.setProperty('--vy',(r.top+r.height/2)+'px');h.classList.add('theme-vt');
  try{document.startViewTransition(fn).finished.then(function(){h.classList.remove('theme-vt')},function(){h.classList.remove('theme-vt')})}catch(e){h.classList.remove('theme-vt');fn()}
}
/* Loading shimmer */
function sk(cls){var s=el('span','sk '+(cls||'t2'));s.setAttribute('aria-hidden','true');return s}
function skCard(){var d=el('div','sk-card');d.setAttribute('aria-busy','true');d.append(el('span','sr-only',T('Loading','ဖွင့်နေသည်')),sk('t1'),sk('t2'),sk('t3'));return d}
/* A small drawing and a helpful line when there is nothing to show */
var ART={
 calm:'<path d="M8 44c8-10 14 6 22-4s14 6 22-4 14 6 22-4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M30 26h30M36 18h18M45 8v10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>',
 offline:'<path d="M14 30a44 44 0 0 1 62 0M24 40a30 30 0 0 1 42 0M34 50a16 16 0 0 1 22 0" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".55"/><circle cx="45" cy="58" r="3" fill="currentColor"/><path d="M20 12l50 50" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
 saved:'<path d="M30 10h30v48L45 46 30 58z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><path d="M38 24h14M38 32h9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>',
 search:'<circle cx="40" cy="30" r="17" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M53 43l14 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M33 30h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".55"/>',
 news:'<rect x="16" y="12" width="48" height="46" rx="5" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M26 24h28M26 34h28M26 44h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".55"/><path d="M64 26h10v24a8 8 0 0 1-8 8" fill="none" stroke="currentColor" stroke-width="2.5"/>'
};
function empty(kind,en,my,sub){var d=el('div','empty-state'),a=el('div','empty-art');a.append(svg(ART[kind]||ART.news,'0 0 90 68'));d.append(a,el('p','empty-t',T(en,my)));if(sub)d.append(el('p','small-note',sub));return d}

/* Simple charts drawn as SVG. Values are plain numbers; colours follow the theme through CSS. */
function chartSvg(w,h,inner,label){return '<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+String(label).replace(/[<>&"]/g,'')+'" preserveAspectRatio="none">'+inner+'</svg>'}
function spark(vals,label){
  var v=vals.filter(function(x){return x!=null&&isFinite(x)}),d=el('div','spark');if(v.length<2)return d;
  var lo=Math.min.apply(null,v),hi=Math.max.apply(null,v),W=120,H=36,r=hi-lo||1;
  var pts=v.map(function(x,i){return [(i/(v.length-1))*(W-6)+3,H-4-((x-lo)/r)*(H-8)]}),p='M'+pts.map(function(q){return q[0].toFixed(1)+' '+q[1].toFixed(1)}).join('L'),last=pts[pts.length-1];
  d.innerHTML=chartSvg(W,H,'<path class="sp-a" d="'+p+'L'+(W-3)+' '+H+'L3 '+H+'Z"/><path class="sp-l" d="'+p+'"/><circle class="sp-d" cx="'+last[0].toFixed(1)+'" cy="'+last[1].toFixed(1)+'" r="2.6"/>',label);
  d.classList.add(v[v.length-1]>v[0]?'up':v[v.length-1]<v[0]?'down':'flat');return d;
}
// Bars with a label under each one. rows: [[label, value, note]]
function bars(rows,label,unit){
  var d=el('div','bars'),max=Math.max.apply(null,rows.map(function(r){return r[1]}).concat(1));d.setAttribute('role','img');
  d.setAttribute('aria-label',label+': '+rows.map(function(r){return r[0]+' '+r[1]+(unit||'')}).join(', '));
  rows.forEach(function(r){var c=el('div','bar'),b=el('i');b.style.height=Math.max(3,Math.round(r[1]/max*100))+'%';if(r[2])b.className=r[2];var t=el('div','bar-t');t.append(b);c.append(el('b',null,String(r[1])),t,el('span',null,r[0]));d.append(c)});
  return d;
}
// Seven days: a temperature line for the high, a softer one for the low, and rain bars underneath.
function week(days,hi,lo,rain,label){
  var W=700,H=220,L=36,R=14,Tp=22,B=46,n=days.length,d=el('div','wk-chart');if(n<2)return d;
  var mx=Math.max.apply(null,hi)+1,mn=Math.min.apply(null,lo)-1,rm=Math.max(10,Math.max.apply(null,rain)),ph=H-Tp-B,sx=(W-L-R)/(n-1);
  function X(i){return L+i*sx}function Y(v){return Tp+(mx-v)/(mx-mn)*ph}
  var s='',i;
  for(i=0;i<3;i++){var gv=mn+(mx-mn)*i/2;s+='<line class="gl" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(gv).toFixed(1)+'" y2="'+Y(gv).toFixed(1)+'"/><text x="'+(L-8)+'" y="'+(Y(gv)+4).toFixed(1)+'" text-anchor="end">'+Math.round(gv)+'°</text>'}
  for(i=0;i<n;i++){var bh=rain[i]/rm*(ph*0.45);s+='<rect class="rb" x="'+(X(i)-12).toFixed(1)+'" y="'+(Tp+ph-bh).toFixed(1)+'" width="24" height="'+bh.toFixed(1)+'" rx="4"/>';
    s+='<text class="k" x="'+X(i).toFixed(1)+'" y="'+(H-24)+'" text-anchor="middle">'+days[i]+'</text><text x="'+X(i).toFixed(1)+'" y="'+(H-7)+'" text-anchor="middle">'+(rain[i]>=0.5?Math.round(rain[i])+' mm':'–')+'</text>'}
  function path(a){return 'M'+a.map(function(v,j){return X(j).toFixed(1)+' '+Y(v).toFixed(1)}).join('L')}
  s+='<path class="lo" d="'+path(lo)+'"/><path class="hi" d="'+path(hi)+'"/>';
  for(i=0;i<n;i++)s+='<circle class="hd" cx="'+X(i).toFixed(1)+'" cy="'+Y(hi[i]).toFixed(1)+'" r="4"/><text class="k" x="'+X(i).toFixed(1)+'" y="'+(Y(hi[i])-9).toFixed(1)+'" text-anchor="middle">'+Math.round(hi[i])+'°</text>';
  d.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+String(label).replace(/[<>&"]/g,'')+'">'+s+'</svg>';
  var lg=el('div','chart-leg');[['hi',T('High','အမြင့်ဆုံး')],['lo',T('Low','အနိမ့်ဆုံး')],['rb',T('Rain','မိုး')]].forEach(function(x){var sp=el('span');sp.append(el('i',x[0]),x[1]);lg.append(sp)});d.append(lg);return d;
}

/* First visit: the folded parabaik opens once */
function intro(){
  if(RM||store('pd-intro'))return;store('pd-intro',1);
  var o=el('div','intro');o.setAttribute('aria-hidden','true');for(var i=0;i<6;i++){var f=el('i');f.style.setProperty('--i',i);o.append(f)}
  var m=el('div','intro-m');m.append(el('b',null,'Parabaik Daily'),el('span','mm','ပုရပိုက်'));o.append(m);document.body.append(o);
  requestAnimationFrame(function(){o.classList.add('go')});setTimeout(function(){o.remove()},1900);
}
/* Old phones that still use the Zawgyi font show Burmese wrongly when the site's own font cannot load. */
function zawgyiCheck(){
  try{var c=document.createElement('canvas').getContext('2d');c.font='20px sans-serif';var a=c.measureText('က').width,b=c.measureText('က္က').width;
    var webfont=document.fonts&&document.fonts.check('16px "Noto Serif Myanmar"','က');
    return a>0&&b>a*1.6&&!webfont}catch(e){return false}
}
return {el:el,store:store,T:T,svg:svg,IC:IC,toast:toast,sheet:sheet,lite:lite,img:img,savedList:savedList,isSaved:isSaved,toggleSave:toggleSave,share:share,shareBtn:shareBtn,storyMenu:storyMenu,moreBtn:moreBtn,copy:copy,rise:rise,count:count,vt:vt,themeFlip:themeFlip,sk:sk,skCard:skCard,empty:empty,spark:spark,bars:bars,week:week,intro:intro,zawgyiCheck:zawgyiCheck,RM:RM};
})();
