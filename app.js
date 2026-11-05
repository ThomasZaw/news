(function(){
'use strict';
var E=null,LIVE=null,ENSO=null,MK=null,key='all',view='home',TOPICS=[];
function el(t,c,x){var n=document.createElement(t);if(c)n.className=c;if(x!=null)n.textContent=x;return n}
function mm(t,x){var n=el(t||'span','mm',x);n.lang='my';return n}
function $(i){return document.getElementById(i)}
function store(k,v){try{if(v===undefined){return JSON.parse(localStorage.getItem(k))}localStorage.setItem(k,JSON.stringify(v))}catch(e){return null}}
function safe(u){return /^https?:\/\//.test(u||'')?u:'#'}
function srcs(a){var p=el('div','src');p.append('Source: ');a.forEach(function(s,i){if(i)p.append(', ');var l=el('a',null,s.name);l.href=safe(s.url);l.target='_blank';l.rel='noopener';p.append(l)});return p}
function dir(v){return v>0?'up':v<0?'down':'flat'}
function pct(v){if(!v)return 'unchanged';return (v>0?'▲ +':'▼ −')+Math.abs(v).toFixed(2).replace(/0$/,'')+'%'}
function ago(iso){var m=Math.max(0,Math.round((Date.now()-new Date(iso))/6e4));return m<1?'now':m<60?m+'m':m<1440?Math.round(m/60)+'h':Math.round(m/1440)+'d'}
function clear(n){while(n.firstChild)n.removeChild(n.firstChild)}
function ygn(){var y=new Date(Date.now()+6.5*36e5);return [y.getUTCFullYear(),y.getUTCMonth()+1,y.getUTCDate()]}
function iso(d){return d[0]+'-'+String(d[1]).padStart(2,'0')+'-'+String(d[2]).padStart(2,'0')}

/* Text size */
function size(n){n=Math.max(0,Math.min(2,n));document.documentElement.dataset.size=n;store('pd-size',n);return n}
var sz=size(store('pd-size')||0);
['size-up','size-up2'].forEach(function(i){$(i).onclick=function(){sz=size(sz+1);redraw()}});['size-down','size-down2'].forEach(function(i){$(i).onclick=function(){sz=size(sz-1);redraw()}});

/* Burmese calendar */
var M=ceMmDateTime,TR=new ceMmTranslate();
function tr(s){return TR.T(s,1)}
function md(d){return new M(M.w2j(d[0],d[1],d[2],12,0,0,0),6.5)}
var POST=[['Garuda','ဂဠုန်'],['Tiger','ကျား'],['Lion','ခြင်္သေ့'],['Tusked elephant','ဆင်'],['Rat','ကြွက်'],['Guinea pig','ပူး'],['Naga','နဂါး']];
function wd(d){return new Date(Date.UTC(d[0],d[1]-1,d[2])).getUTCDay()}
var WDN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
function mmLine(m){return tr(m.ToMString('&M &P &ff'))}
function mmNum(n){return tr(String(n))}
var TODAY=ygn(),calView=[TODAY[0],TODAY[1]],pick=TODAY.slice();

function renderDateline(){
  var dl=$('dateline'),w=wd(TODAY),m=md(TODAY);clear(dl);
  dl.append(mm('span',tr(WDN[w])+'နေ့'),el('span',null,WDN[w]+', '+TODAY[2]+' '+MON[TODAY[1]-1]+' '+TODAY[0]));
}
function renderDay(){
  var b=$('daybox'),m=md(TODAY),w=wd(TODAY),h=el('h2',null,'Burmese calendar');h.append(' ',mm('span','ပြက္ခဒိန်'));clear(b);
  var big=mm('div',mmLine(m));big.classList.add('big-date');
  var en=el('div','cal-en',m.ToMString('&M &P &ff')+' · '+WDN[w]+', '+TODAY[2]+' '+MON[TODAY[1]-1]);
  var f=el('dl','facts');
  function fact(a,x){var w=el('div');w.append(el('dt',null,a));var d=el('dd');d.append(x);w.append(d);f.append(w)}
  fact('Day',tr(WDN[w])+'နေ့');fact('Myanmar year',mmNum(m.my));fact('Sasana year',mmNum(m.sy));
  fact('Birthday corner',POST[w][1]+' · '+POST[w][0]);
  var marks=[];if(m.sabbath)marks.push(m.sabbath);if(m.yatyaza)marks.push(m.yatyaza);if(m.pyathada)marks.push(m.pyathada);
  if(marks.length)fact('Today is',marks.map(tr).join('၊ '));
  var nav=el('div','cal-nav'),p=el('button','btn','←'),n=el('button','btn','→'),t=el('strong');
  p.type=n.type='button';p.setAttribute('aria-label','Previous month');n.setAttribute('aria-label','Next month');
  var first=md([calView[0],calView[1],1]),dim=new Date(Date.UTC(calView[0],calView[1],0)).getUTCDate(),last=md([calView[0],calView[1],dim]);
  t.append(MON[calView[1]-1]+' '+calView[0],mm('span',first.ToMString('&M')===last.ToMString('&M')?tr(first.ToMString('&M')):tr(first.ToMString('&M'))+' – '+tr(last.ToMString('&M'))));
  p.onclick=function(){calView=calView[1]===1?[calView[0]-1,12]:[calView[0],calView[1]-1];renderDay()};
  n.onclick=function(){calView=calView[1]===12?[calView[0]+1,1]:[calView[0],calView[1]+1];renderDay()};
  nav.append(p,t,n);
  var g=el('div','cal'),notes=loadNotes();
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function(x){g.append(el('span',null,x))});
  for(var i=0,lead=wd([calView[0],calView[1],1]);i<lead;i++)g.append(el('span'));
  for(var d=1;d<=dim;d++)(function(d){
    var dt=[calView[0],calView[1],d],k=md(dt),c=el('button'),s=mmNum(k.mf);
    c.type='button';c.append(el('b',null,d),el('small',null,s));
    var hol=k.holidays.length>0;
    c.className=(hol?'hol ':'')+(k.mp===1?'full ':k.mp===3?'newm ':'')+(k.sabbath==='Sabbath'?'sab ':'')+(wd(dt)%6===0?'wkend ':'')+(iso(dt)===iso(TODAY)?'now ':'')+(notes.some(function(x){return x.date===iso(dt)})?'note':'');
    c.setAttribute('aria-pressed',iso(dt)===iso(pick)?'true':'false');
    c.setAttribute('aria-label',d+' '+MON[calView[1]-1]+', '+k.ToMString('&M &P &ff')+(hol?', '+k.holidays.join(', '):''));
    c.onclick=function(){pick=dt;renderDay();var f=$('note-date');if(f)f.value=iso(dt)};
    g.append(c);
  })(d);
  var pk=md(pick),det=el('p','cal-detail'),line=pick[2]+' '+MON[pick[1]-1]+': '+pk.ToMString('&M &P &ff');
  det.append(el('strong',null,line),mm('span',mmLine(pk)));
  var extra=pk.holidays.concat(pk.holidays2);if(pk.sabbath)extra.unshift(pk.sabbath);
  if(extra.length)det.append(el('span',null,extra.join(', ')));
  var leg=el('div','cal-leg');[['today','Today'],['full','Full moon'],['newm','New moon'],['sab','Sabbath'],['hol','Holiday']].forEach(function(r){var i=el('span');i.append(el('i',r[0]),r[1]);leg.append(i)});
  var lay=el('div','cal-lay'),c1=el('div','cal-main'),c2=el('div','cal-side');c1.append(nav,g,leg);c2.append(big,en,f,det);lay.append(c1,c2);b.append(h,lay);
}

/* Reminders */
function loadNotes(){return store('pd-notes')||[]}
function renderNotes(){
  var b=$('notes');clear(b);
  var h=el('h2',null,'My reminders');h.append(' ',mm('span','မှတ်စု'));
  var alertBox=el('div');alertBox.id='note-alert';
  var f=el('form','note-form');f.autocomplete='off';
  f.innerHTML='<label class="w" for="note-text">What should I remind you about?<input class="field" id="note-text" required maxlength="200"></label><label for="note-date">Date<input class="field" id="note-date" type="date" required></label><label for="note-time">Time<input class="field" id="note-time" type="time"></label><button class="btn main w" type="submit">Add reminder</button>';
  var list=el('ul','nlist');
  b.append(h,alertBox,f,list,el('p','small-note','Reminders stay on this device and show here when you open the page.'));
  $('note-date').value=iso(pick);
  f.addEventListener('submit',function(e){e.preventDefault();var t=$('note-text').value.trim();if(!t)return;var n=loadNotes();n.push({id:Date.now(),text:t,date:$('note-date').value,time:$('note-time').value});store('pd-notes',n);renderNotes();renderDay()});
  drawNotes();
}
function due(n){var now=ygn(),y=new Date(Date.now()+6.5*36e5),t=String(y.getUTCHours()).padStart(2,'0')+':'+String(y.getUTCMinutes()).padStart(2,'0');return n.date<iso(now)||(n.date===iso(now)&&(!n.time||n.time<=t))}
function drawNotes(){
  var list=document.querySelector('.nlist'),a=$('note-alert');if(!list)return;clear(list);clear(a);
  var n=loadNotes().sort(function(x,y){return (x.date+x.time).localeCompare(y.date+y.time)}),c=0;
  if(!n.length)list.append(el('li',null,'No reminders yet.'));
  n.forEach(function(r){var d=due(r);if(d)c++;var li=el('li',d?'due':null),w=el('div'),x=el('button','btn','Done');x.type='button';w.append(el('strong',null,r.text),el('small',null,r.date+(r.time?' at '+r.time:'')));
    x.setAttribute('aria-label','Mark done: '+r.text);x.onclick=function(){store('pd-notes',loadNotes().filter(function(q){return q.id!==r.id}));renderNotes();renderDay()};li.append(w,x);list.append(li)});
  if(c)a.append(el('p','note-alert',c===1?'1 reminder is due now':c+' reminders are due now'));
  renderHome();
}

/* Weather */
var CITIES=[['Yangon',16.87,96.2,'ရန်ကုန်'],['Mandalay',21.97,96.08,'မန္တလေး'],['Naypyitaw',19.75,96.12,'နေပြည်တော်'],['Hpa-An',16.89,97.63,'ဘားအံ'],['Mawlamyine',16.49,97.63,'မော်လမြိုင်'],['Pathein',16.78,94.73,'ပုသိမ်'],['Bago',17.34,96.48,'ပဲခူး'],['Taunggyi',20.79,97.04,'တောင်ကြီး'],['Sittwe',20.15,92.9,'စစ်တွေ'],['Myitkyina',25.38,97.4,'မြစ်ကြီးနား'],['Monywa',22.11,95.14,'မုံရွာ'],['Kawthaung',9.98,98.55,'ကော့သောင်း']];
var city=store('pd-city')||'Yangon',WX=null,wxSource='';
function code(c,day){
  if(c===0)return [day?'☀️':'🌙','Clear','ကြည်လင်'];
  if(c<=2)return [day?'⛅':'☁️','Partly cloudy','တိမ်အနည်းငယ်'];
  if(c===3)return ['☁️','Cloudy','တိမ်ထူ'];
  if(c===45||c===48)return ['🌫️','Fog','မြူဆိုင်း'];
  if(c>=51&&c<=57)return ['🌦️','Light rain','မိုးဖွဲ'];
  if(c===65||c===82)return ['🌧️','Heavy rain','မိုးသည်းထန်'];
  if((c>=61&&c<=67)||(c>=80&&c<=82))return ['🌧️','Rain','မိုးရွာ'];
  if(c>=95)return ['⛈️','Thunderstorm','မိုးကြိုးမုန်တိုင်း'];
  return ['🌥️','Unsettled','မတည်ငြိမ်'];
}
var FIRE=[[50,'Low','နည်း','#3FA66A','Normal care. Keep exits clear and check wiring.','ပုံမှန်ဂရုစိုက်ပါ။'],
[75,'Moderate','အသင့်အတင့်','#C79A1E','Fires can start more easily. Avoid open burning.','မီးရှို့ခြင်းကို ရှောင်ပါ။'],
[90,'High','မြင့်','#E07A1F','Fires can spread fast. Keep water and extinguishers ready.','ရေနှင့် မီးသတ်ဆေးဘူး အသင့်ထားပါ။'],
[97,'Very high','အလွန်မြင့်','#D8432B','Do not burn anything outdoors. Crews should stay ready.','အပြင်တွင် ဘာမျှ မမီးရှို့ပါနှင့်။'],
[1e9,'Extreme','အလွန်အန္တရာယ်ရှိ','#B3202A','Dangerous fire weather. Crews should be on full alert.','မီးသတ်အဖွဲ့များ အပြည့်အဝ အသင့်ရှိပါ။']];
function cbi(t,h){return Math.max(0,((110-1.373*h)-0.54*(10.2-t))*(124*Math.pow(10,-0.0142*h))/60)}
function fireLevel(H,i){var peak=0;for(var j=i;j<Math.min(i+24,H.time.length);j++)peak=Math.max(peak,cbi(H.temperature_2m[j],H.relative_humidity_2m[j]));return FIRE.findIndex(function(f){return peak<f[0]})}
function nowIdx(d){var t=d.current.time.slice(0,13);var i=d.hourly.time.findIndex(function(x){return x.slice(0,13)===t});return i<0?0:i}
function hhmm(s){return s.slice(11,16)}
function url(c){return 'https://api.open-meteo.com/v1/forecast?latitude='+c[1]+'&longitude='+c[2]+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,wind_gusts_10m_max,precipitation_sum,apparent_temperature_max&timezone=Asia%2FYangon&forecast_days=7'}
function loadWx(){
  var c=CITIES.find(function(x){return x[0]===city})||CITIES[0];
  return fetch(url(c)).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){WX=j;wxSource='Live from Open-Meteo';renderWx()}).catch(function(){
    return get('data/weather.json').then(function(a){if(!a.cities[city])throw 0;WX=a.cities[city];wxSource='Saved '+ago(a.updated)+' ago';renderWx()}).catch(function(){if(!WX)renderWx()})});
}
function wxAlerts(){
  if(!WX)return [];var H=WX.hourly,D=WX.daily,c=WX.current,i=nowIdx(WX);
  function lvl(x,w,a){return x>=a?2:x>=w?1:0}
  var thunder=H.weather_code.slice(i,i+24).some(function(x){return x>=95});
  var cyclone=LIVE?LIVE.items.filter(function(q){return q.source==='GDACS'&&/cyclone|storm/i.test(q.title)})[0]:null;
  var gust=Math.max(c.wind_gusts_10m||0,(D.wind_gusts_10m_max||[0])[0]||0),mm0=(D.precipitation_sum||[0])[0]||0,feel=Math.max(c.apparent_temperature||0,(D.apparent_temperature_max||[0])[0]||0);
  return [
   {i:'⛈',en:'Storm',mm:'မုန်တိုင်း',l:cyclone?2:thunder?1:0,msg:cyclone?cyclone.title:thunder?'Thunderstorms possible in the next 24 hours':'No storm in the forecast'},
   {i:'🌧',en:'Heavy rain',mm:'မိုးသည်းထန်',l:lvl(mm0,50,100),msg:Math.round(mm0)+' mm of rain forecast today'},
   {i:'💨',en:'Strong wind',mm:'လေပြင်း',l:lvl(gust,50,75),msg:'Gusts up to '+Math.round(gust)+' km/h today'},
   {i:'🌡',en:'Extreme heat',mm:'အပူလွန်ကဲ',l:lvl(feel,41,46),msg:'Feels like up to '+Math.round(feel)+'° today'}];
}
var LV=['Clear','Watch','Warning'],LVM=['ကင်းရှင်း','သတိထားရန်','သတိပေးချက်'];
function renderWx(){
  var b=$('wx');clear(b);
  var top=el('div','wx-top'),h=el('h2',null,'Weather');h.append(' ',mm('span','ရာသီဥတု'));
  var s=el('select','field');s.id='city';s.setAttribute('aria-label','Choose a city');
  CITIES.forEach(function(c){var o=el('option',null,c[0]+'  '+c[3]);o.value=c[0];o.selected=c[0]===city;s.append(o)});
  s.onchange=function(){city=s.value;store('pd-city',city);loadWx()};top.append(h,s);b.append(top);
  if(!WX){renderHome();b.append(el('p',null,'Weather is loading. If it does not appear, check your internet connection.'));return}
  var c=WX.current,k=code(c.weather_code,c.is_day),i=nowIdx(WX),H=WX.hourly,D=WX.daily;
  var now=el('div','wx-now'),main=el('div','wx-main'),cond=el('div','wx-cond'),tx=el('div');
  tx.append(el('div','wx-temp',Math.round(c.temperature_2m)+'°'));cond.append(k[1],mm('span',k[2]));tx.append(cond);main.append(el('div','wx-emoji',k[0]),tx);
  var st=el('div','stats');
  [['Feels like',Math.round(c.apparent_temperature)+'°'],['Chance of rain',(H.precipitation_probability[i]||0)+'%'],['Wind',Math.round(c.wind_speed_10m)+' km/h'],['Humidity',c.relative_humidity_2m+'%']].forEach(function(r){var d=el('div');d.append(el('b',null,r[0]),el('span',null,r[1]));st.append(d)});
  now.append(main,st);b.append(now);
  var ah=el('h3','sec',"Today's alerts ");ah.append(mm('span','သတိပေးချက်'));b.append(ah);
  var ag=el('div','alerts'),lv=fireLevel(H,i),F=FIRE[lv],fl=lv>=3?2:lv>=1?1:0;
  wxAlerts().concat([{i:'🔥',en:'Fire danger',mm:'မီးဘေး',l:fl,word:F[1],msg:F[4]}]).forEach(function(x){var d=el('div','al l'+x.l),t=el('div','al-t');t.append(el('span','al-i',x.i),el('b',null,x.en),el('em',null,x.word||LV[x.l]));d.append(t,mm('span',x.mm+' · '+LVM[x.l]),el('p',null,x.msg));ag.append(d)});b.append(ag);
  var hh=el('h3','sec','Next 24 hours'),hs=el('div','week-scroll'),hr=el('div','hours');b.append(hh);
  for(var q=0;q<=24&&i+q<H.time.length;q+=3){var ck=code(H.weather_code[i+q],(function(t){var n=+t.slice(11,13);return n>=6&&n<18})(H.time[i+q])),d=el('div');d.append(el('b',null,q?hhmm(H.time[i+q]):'Now'),el('em',null,ck[0]),el('span',null,Math.round(H.temperature_2m[i+q])+'°'),el('small',null,(H.precipitation_probability[i+q]||0)+'%'));hr.append(d)}
  hs.append(hr);b.append(hs);
  var w=el('div','week'),wr=el('div','week-scroll'),row=el('div','week-row');w.append(el('h3','sec','Next 7 days'));
  D.time.forEach(function(t,n){var p=t.split('-').map(Number),cd=code(D.weather_code[n],1),d=el('div');d.append(el('b',null,n===0?'Today':n===1?'Tomorrow':WDN[wd(p)].slice(0,3)),el('em',null,cd[0]),el('span',null,Math.round(D.temperature_2m_max[n])+'° / '+Math.round(D.temperature_2m_min[n])+'°'),el('small',null,'Rain '+D.precipitation_probability_max[n]+'%'));row.append(d)});
  wr.append(row);w.append(wr);b.append(w);
  var det=el('details','enso-more'),sm=el('summary',null,'View full details'),ch=el('div','chart');ch.id='chart';det.append(sm,ch);
  var ln=el('div','ext'),cc=CITIES.find(function(x){return x[0]===city})||CITIES[0];
  [['Live wind and storm map (Windy)','https://www.windy.com/?'+cc[1]+','+cc[2]+',7'],['Myanmar weather department','https://www.moezala.gov.mm/en'],['Global disaster alerts (GDACS)','https://www.gdacs.org/']].forEach(function(r){var a=el('a',null,r[0]+' ↗');a.href=r[1];a.target='_blank';a.rel='noopener';ln.append(a)});det.append(ln);
  det.append(el('p','small-note','Alerts are estimates from the forecast and storm feeds, not official warnings. Fire danger uses the Chandler Burning Index from temperature and humidity.'));
  det.addEventListener('toggle',function(){if(det.open)drawChart(ch,H,i)});b.append(det);
  var wn=el('div','wn');wn.id='wn';b.append(wn);renderWeatherNews();
  b.append(el('p','small-note',wxSource+' · Times are Myanmar time'));renderHome();
}
function drawChart(box,H,i){
  var w=Math.max(300,box.clientWidth||680),n=25,T=H.temperature_2m.slice(i,i+n),R=H.precipitation_probability.slice(i,i+n),TM=H.time.slice(i,i+n);
  var L=8,Rr=8,x=function(k){return L+k*(w-L-Rr)/(T.length-1)};
  var a=Math.floor(Math.min.apply(null,T))-1,z=Math.ceil(Math.max.apply(null,T))+1,h1=170,top=52,bot=h1-26,y=function(v){return bot-(v-a)*(bot-top)/(z-a)};
  var h2=74,y0=54,total=h1+h2+26,ry=function(p){return h1+y0-p*(y0-8)/100};
  var line=T.map(function(v,k){return (k?'L':'M')+x(k).toFixed(1)+' '+y(v).toFixed(1)}).join(' ');
  var hi=T.indexOf(Math.max.apply(null,T)),lo=T.indexOf(Math.min.apply(null,T)),bw=Math.max(4,(w-L-Rr)/T.length-3);
  function t(px,py,s,c,an){return '<text x="'+px.toFixed(1)+'" y="'+py+'" text-anchor="'+(an||'middle')+'"'+(c?' class="k"':'')+'>'+s+'</text>'}
  function an(k){return x(k)<30?'start':x(k)>w-30?'end':'middle'}
  var svg='<svg viewBox="0 0 '+w+' '+total+'" height="'+total+'" role="img" aria-label="Temperature and chance of rain for the next 24 hours">';
  svg+=t(L,14,'Temperature °C',0,'start')+'<path class="a" d="'+line+' L'+x(T.length-1)+' '+bot+' L'+x(0)+' '+bot+'Z"/><path class="l" d="'+line+'"/>';
  [hi,lo].forEach(function(k){svg+='<circle class="d" r="5" cx="'+x(k)+'" cy="'+y(T[k])+'"/>'+t(x(k),k===lo?Math.min(y(T[k])+20,bot+2):y(T[k])-10,Math.round(T[k])+'°',1,an(k))});
  svg+=t(L,h1+12,'Chance of rain %',0,'start')+'<line class="gl" x1="'+L+'" x2="'+(w-Rr)+'" y1="'+ry(0)+'" y2="'+ry(0)+'"/>';
  R.forEach(function(p,k){var v=p||0,hh=Math.max(v?2:0,ry(0)-ry(v));svg+='<rect class="b" x="'+(x(k)-bw/2).toFixed(1)+'" y="'+(ry(0)-hh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+hh.toFixed(1)+'" rx="2"/>'});
  for(var k=0;k<T.length;k+=6)svg+=t(x(k),total-4,k===0?'Now':hhmm(TM[k]),0,k===0?'start':k>=24?'end':'middle');
  svg+='<line class="x" id="cx" x1="0" x2="0" y1="20" y2="'+ry(0)+'" visibility="hidden"/></svg>';
  box.innerHTML='<h3>Next 24 hours</h3><div class="readout" id="ro"></div>'+svg;
  var s=box.querySelector('svg'),ro=box.querySelector('#ro'),cx=box.querySelector('#cx');
  function show(k){cx.setAttribute('x1',x(k));cx.setAttribute('x2',x(k));cx.setAttribute('visibility','visible');ro.textContent=(k?hhmm(TM[k]):'Now')+' · '+Math.round(T[k])+'° · rain '+(R[k]||0)+'%'}
  show(0);
  s.addEventListener('pointermove',function(e){var r=s.getBoundingClientRect();show(Math.max(0,Math.min(T.length-1,Math.round(((e.clientX-r.left)-L)/((w-L-Rr)/(T.length-1))))))});
}
function renderWeatherNews(){
  var b=$('wn');if(!b||!E)return;clear(b);
  var s=E.sections.find(function(x){return x.id==='weather'}),h=el('h3',null,'Weather and fire news ');h.append(mm('span','သတင်း'));b.append(h);
  var ul=el('ul','hl');if(s)s.items.slice(0,3).forEach(function(i){ul.append(hlRow(i.title,i.sources[0].url,i.sources[0].name))});
  if(LIVE)LIVE.items.filter(function(i){return i.topic==='weather'}).slice(0,5).forEach(function(i){ul.append(hlRow(i.title,i.url,ago(i.published)+' ago · '+i.source))});
  b.append(ul);
}
function hlRow(t,u,s){var li=el('li'),a=el('a',null,t);a.href=safe(u);a.target='_blank';a.rel='noopener';li.append(a,el('small',null,s));return li}
var RT;addEventListener('resize',function(){clearTimeout(RT);RT=setTimeout(function(){var c=$('chart');if(c&&c.offsetWidth&&WX)drawChart(c,WX.hourly,nowIdx(WX))},200)});

/* El Nino */
function ensoColor(v){return v>=2?'#B3202A':v>=1?'#D8532B':v>=.5?'#E8A04A':v<=-1?'#2B6CB0':v<=-.5?'#6FA8DC':'#8E8A82'}
function ensoPhase(v){return v>=2?['Very strong El Niño','အလွန်ပြင်းထန်သော အယ်လ်နီညို']:v>=1.5?['Strong El Niño','ပြင်းထန်သော အယ်လ်နီညို']:v>=.5?['El Niño','အယ်လ်နီညို']:v<=-.5?['La Niña','လာနီညာ']:['Neutral','ပုံမှန်']}
function renderEnso(d){
  var b=$('enso-box');clear(b);var h=el('div','enso-head'),t=el('h2',null,'El Niño tracker');h.append(t,mm('span','အယ်လ်နီညို'));b.append(h);
  if(!d||!d.weeks||!d.weeks.length){b.append(el('p',null,'El Niño data is loading. It updates every week from NOAA.'));return}
  var L=d.weeks[d.weeks.length-1],P=ensoPhase(L.n34),s=el('div','enso-state');
  var sign=function(v){return (v>0?'+':'')+v.toFixed(1)+'°C'};
  s.append(el('div','enso-big',sign(L.n34)),el('p','enso-phase',P[0]),mm('p',P[1]));b.append(s);
  var R=[['Central Pacific',L.n4,-175,0],['Central-east Pacific',L.n34,-145,0],['Eastern Pacific',L.n3,-120,0],['Near Peru and Ecuador',L.n12,-85,-5]];
  var x=function(lon){return ((lon+360)%360-80)*6},y=function(lat){return (45-lat)*6};
  var warm=L.n34>=.5,cold=L.n34<=-.5,spot=R.slice().sort(function(p,q){return warm?q[1]-p[1]:p[1]-q[1]})[0],sx=x(spot[2]),sy=y(spot[3]),dot=Math.min(62,30+Math.abs(spot[1])*6);
  var wide=(b.clientWidth||700)>=560,fs=wide?26:44,col=warm?'#E0252B':'#2B6CB0';
  function T(px,py,s,an,sz,c){return '<text x="'+px+'" y="'+py+'" text-anchor="'+an+'" style="font-size:'+(sz||fs)+'px"'+(c?' class="'+c+'"':'')+'>'+s+'</text>'}
  var svg='<svg class="map" viewBox="0 0 1260 480" role="img" aria-label="Satellite map of Asia and the Pacific Ocean'+((warm||cold)?', with a dot near '+spot[0]+', where the sea is '+sign(spot[1])+' compared with normal':'')+'"><image href="lib/pacific.jpg" width="1260" height="480"/>';
  if(wide)svg+=T(x(-160),y(22),'PACIFIC OCEAN','middle',24,'soft')+T(x(134),y(-24),'Australia','middle',24,'soft')+T(x(-100),y(41),'North America','middle',24,'soft');
  if(warm||cold)svg+='<circle class="ring" cx="'+sx+'" cy="'+sy+'" r="'+dot+'" fill="'+col+'"/><circle cx="'+sx+'" cy="'+sy+'" r="'+dot+'" fill="'+col+'" stroke="#fff" stroke-width="4"/>'+T(sx-dot-14,sy-6,'El Niño','end',0,'strong')+T(sx-dot-14,sy+fs+2,(warm?'Warmest ':'Coldest ')+sign(spot[1]),'end',0,'strong');
  svg+='<circle cx="'+x(96)+'" cy="'+y(21)+'" r="10" fill="#FFD24A" stroke="#fff" stroke-width="3"/>'+T(x(96)+18,y(21)+10,'Myanmar','start',0,'strong')+'</svg>';
  var w=el('div');w.innerHTML=svg;b.append(w);
  var ef=el('p','enso-note',(warm?'The warmest water is '+spot[0].replace('Near','near').replace('Eastern','in the eastern').replace('Central','in the central')+'. ':'')+'Myanmar reports warn that El Niño can bring more heat, drought and fire risk here.');ef.append(srcs([{name:'Global New Light of Myanmar',url:'https://www.gnlm.com.mm/super-el-nino-in-late-2026-why-myanmar-must-prepare-now/'}]));b.append(ef);
  var tr3=el('div','trend'),W=Math.max(320,b.clientWidth||680),H=170,V=d.weeks.map(function(q){return q.n34}),lo=Math.floor(Math.min.apply(null,V.concat(-.5))),hi=Math.ceil(Math.max.apply(null,V.concat(.5))),X2=function(i){return 8+i*(W-52)/(V.length-1)},Y2=function(v){return 12+(hi-v)*(H-40)/(hi-lo)};
  var path=V.map(function(v,i){return (i?'L':'M')+X2(i).toFixed(1)+' '+Y2(v).toFixed(1)}).join(' '),e=V.length-1;
  var g='<svg viewBox="0 0 '+W+' '+H+'" height="'+H+'" role="img" aria-label="Niño 3.4 temperature difference over the last six months"><line class="gl" x1="8" x2="'+(W-44)+'" y1="'+Y2(0)+'" y2="'+Y2(0)+'"/><line class="th" x1="8" x2="'+(W-44)+'" y1="'+Y2(.5)+'" y2="'+Y2(.5)+'"/><text x="10" y="'+(Y2(.5)-5)+'">El Niño line +0.5°</text><path class="l" d="'+path+'"/><circle class="d" r="5" cx="'+X2(e)+'" cy="'+Y2(V[e])+'"/><text class="k" x="'+(X2(e)+9)+'" y="'+(Y2(V[e])+5)+'">'+V[e].toFixed(1)+'°</text><text x="8" y="'+(H-4)+'">'+d.weeks[0].week+'</text><text x="'+(W-44)+'" y="'+(H-4)+'" text-anchor="end">'+L.week+'</text></svg>';
  tr3.innerHTML=g;
  var det=el('details','enso-more'),sm=el('summary',null,'More detail'),tb=el('dl','facts');det.append(sm);
  R.forEach(function(r){var q=el('div');q.append(el('dt',null,r[0]));q.append(el('dd',null,sign(r[1])));tb.append(q)});
  det.append(tr3,tb);if(d.status)det.append(el('p',null,'NOAA status: '+d.status+'. '+(d.synopsis||'')));
  det.append(el('p','small-note','Sea temperature compared with normal, week of '+L.week+'.'+(d.issued?' NOAA outlook issued '+d.issued+'.':'')+' Sea readings update weekly.'));
  det.addEventListener('toggle',function(){if(det.open&&!det.dataset.d){det.dataset.d=1}});
  b.append(det);
  var n=el('div');n.id='enso-news';b.append(n);renderEnsoNews();
  b.append(el('p','small-note','Data from NOAA Climate Prediction Center.'));
}
function renderEnsoNews(){var n=$('enso-news');if(!n||!LIVE)return;clear(n);var r=LIVE.items.filter(function(i){return i.topic==='enso'}).slice(0,5);if(r.length){var h=el('h3',null,'El Niño news');h.style.margin='0 0 4px';n.append(h,feedList(r))}}
function renderBreaking(){
  var b=$('breaking'),seen=store('pd-seen')||[],a=(LIVE&&LIVE.alerts||[]).filter(function(x){return seen.indexOf(x.title)<0})[0];clear(b);b.hidden=!a;if(!a)return;
  var row=el('div','breaking-row'),t=el('div'),l=el('a',null,a.title),c=el('button',null,'Dismiss');c.type='button';l.href=safe(a.url);l.target='_blank';l.rel='noopener';
  t.append(el('b',null,'🚨 Breaking'),l,el('small',null,a.source+' · '+ago(a.published)+' ago'));c.onclick=function(){seen.push(a.title);store('pd-seen',seen.slice(-40));renderBreaking()};row.append(t,c);b.append(row);
}

/* Earthquakes */
var QK=[],QK_T=0,QK_SRC='',GEO=store('pd-geo'),USGS='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/';
function km(a,b,c,d){var r=Math.PI/180,x=Math.sin((c-a)*r/2),y=Math.sin((d-b)*r/2),h=x*x+Math.cos(a*r)*Math.cos(c*r)*y*y;return Math.round(12742*Math.asin(Math.sqrt(h)))}
function place(){if(GEO)return {name:'your location',lat:GEO.lat,lon:GEO.lon};var c=CITIES.find(function(x){return x[0]===city})||CITIES[0];return {name:c[0],lat:c[1],lon:c[2]}}
function qRow(f){var c=f.geometry.coordinates,p=f.properties,o=place();return {id:f.id,mag:p.mag,where:p.place||'Unknown place',time:p.time,url:p.url,lon:c[0],lat:c[1],depth:c[2],dist:km(o.lat,o.lon,c[1],c[0])}}
function inRegion(q){return q.lat>=9&&q.lat<=29&&q.lon>=91&&q.lon<=102}
function qAgo(t){var m=Math.max(0,Math.round((Date.now()-t)/6e4));return m<60?m+' min ago':m<1440?plural(Math.round(m/60),'hour'):plural(Math.round(m/1440),'day')}
function plural(n,w){return n+' '+w+(n===1?'':'s')+' ago'}
function qSet(feats,src){var seen={};QK.forEach(function(q){seen[q.id]=q});feats.forEach(function(f){if(f.properties&&f.properties.mag!=null){var q=qRow(f);seen[q.id]=q}});
  var cut=Date.now()-7*864e5;QK=Object.keys(seen).map(function(k){return seen[k]}).filter(function(q){return q.time>=cut&&q.lat>=4&&q.lat<=32&&q.lon>=86&&q.lon<=108}).sort(function(a,b){return b.time-a.time});QK_T=Date.now();QK_SRC=src;
  QK.forEach(function(q){var o=place();q.dist=km(o.lat,o.lon,q.lat,q.lon)});qAlert();renderQuakes();renderHome()}
function pullQuakes(first){
  return fetch(USGS+'2.5_day.geojson').then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){qSet(j.features,'Live from USGS');if(first)return fetch(USGS+'4.5_week.geojson').then(function(r){return r.json()}).then(function(k){qSet(k.features,'Live from USGS')})})
  .catch(function(){return get('data/quakes.json').then(function(j){qSet(j.features,'Saved copy, may be up to 15 minutes old')}).catch(function(){renderQuakes()})});
}
function qAlert(){
  var seen=store('pd-qseen')||[],lim=Date.now()-6*36e5,o=place();
  var q=QK.filter(function(x){return x.time>=lim&&seen.indexOf(x.id)<0&&((x.dist<=300&&x.mag>=4)||(inRegion(x)&&x.mag>=4.5))})[0];
  var b=$('qalert');clear(b);b.hidden=!q;if(!q)return;
  var row=el('div','breaking-row'),t=el('div'),l=el('a',null,'Magnitude '+q.mag.toFixed(1)+': '+q.where),c=el('button',null,'Dismiss');c.type='button';l.href='#quakes';
  t.append(el('b',null,'⚠️ Earthquake reported'),l,el('small',null,q.dist+' km from '+o.name+' · '+qAgo(q.time)));
  c.onclick=function(){seen.push(q.id);store('pd-qseen',seen.slice(-60));qAlert()};row.append(t,c);b.append(row);
  if(window.__qLast!==q.id){window.__qLast=q.id;beep();try{if('Notification' in window&&Notification.permission==='granted')new Notification('Earthquake: magnitude '+q.mag.toFixed(1),{body:q.where+', '+q.dist+' km from '+o.name})}catch(e){}}
}
function beep(){if(!store('pd-qsound'))return;try{var A=window.AudioContext||window.webkitAudioContext,c=new A();[0,.35,.7].forEach(function(s){var n=c.createOscillator(),g=c.createGain();n.frequency.value=880;g.gain.value=.15;n.connect(g);g.connect(c.destination);n.start(c.currentTime+s);n.stop(c.currentTime+s+.22)})}catch(e){}}
var PUSH_API=location.hostname==='parabaikdaily.com'?'':'https://parabaik-alerts.thomaszaw2019.workers.dev',PUSH_KEY='BOUkTsuubE4ts37xqV5YzU9XZGjZHLdD13Lo9PotcyyD1jAWWbjAZvzhJmwOhESHkiYQTVAGeCwdsHqu84C1xXU';
function pushSub(){var raw=atob(PUSH_KEY.replace(/-/g,'+').replace(/_/g,'/')),u=new Uint8Array(raw.length);for(var i=0;i<raw.length;i++)u[i]=raw.charCodeAt(i);
  return navigator.serviceWorker.register('sw.js').then(function(){return navigator.serviceWorker.ready}).then(function(r){return r.pushManager.getSubscription().then(function(s){return s||r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u})})})}
function post(path,sub){return fetch(PUSH_API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sub)}).then(function(r){if(!r.ok)throw new Error('Try again later')})}
function enablePush(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return Promise.reject(new Error(/iPad|iPhone|Macintosh/.test(navigator.userAgent)&&!navigator.standalone?'Add to Home Screen first':'Not supported here'));
  return Notification.requestPermission().then(function(p){if(p!=='granted')throw new Error('Notifications blocked');return pushSub()}).then(function(s){return post('/subscribe',s)}).then(function(){store('pd-push',1)})}
function testPush(){return pushSub().then(function(s){return post('/test',s)})}
var QM=null,QL=null;
function qMap(box,top){
  if(!window.L)return;
  if(!QM){var e=el('div','qmap');e.id='qmap';box.append(e);
    QM=L.map(e,{attributionControl:true,minZoom:4,maxZoom:10,worldCopyJump:false,scrollWheelZoom:false}).setView([20,96.5],5);
    L.imageOverlay('lib/myanmar.jpg',[[4,86],[32,108]]).addTo(QM);
    var G='https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/';
    L.tileLayer(G+'BlueMarble_ShadedRelief_Bathymetry/default//GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg',{maxNativeZoom:8,maxZoom:10,attribution:'NASA GIBS · Leaflet · USGS'}).addTo(QM);
    L.tileLayer(G+'Reference_Labels_15m/default//GoogleMapsCompatible_Level13/{z}/{y}/{x}.png',{maxZoom:10,opacity:.9}).addTo(QM);
    L.geoJSON({type:'Feature',geometry:MM_GEO},{style:{color:'#FFD24A',weight:1.6,fill:false,opacity:.9},interactive:false}).addTo(QM);
    QL=L.layerGroup().addTo(QM);
  }else box.append(QM.getContainer());
  setTimeout(function(){QM.invalidateSize()},0);
  QL.clearLayers();
  QK.slice().reverse().forEach(function(q){var r=Math.max(6,(q.mag-3)*7),last=q===top;var c=L.circleMarker([q.lat,q.lon],{radius:r,color:'#fff',weight:last?2.5:1.5,fillColor:'#E0252B',fillOpacity:last?.95:.6}).addTo(QL);c.bindPopup('<b>M '+q.mag.toFixed(1)+'</b><br>'+q.where.replace(/</g,'&lt;')+'<br>'+qAgo(q.time)+' · depth '+Math.round(q.depth)+' km')});
  if(GEO&&GEO.lat>=4&&GEO.lat<=32&&GEO.lon>=86&&GEO.lon<=108)L.circleMarker([GEO.lat,GEO.lon],{radius:7,color:'#fff',weight:2,fillColor:'#FFD24A',fillOpacity:1}).addTo(QL).bindPopup('Your location');
}
function renderQuakes(){
  var b=$('quake-box');if(!b||view!=='quakes')return;clear(b);
  var h=el('h2',null,'Earthquakes ');h.className='q-title';h.append(mm('span','ငလျင်'));b.append(h);
  var reg=QK.filter(inRegion),top=reg[0],o=place(),s=el('div','enso-state');
  if(top){s.append(el('div','enso-big','M '+top.mag.toFixed(1)),el('p','enso-phase',top.where),el('p',null,qAgo(top.time)+' · '+top.dist+' km from '+o.name))}
  else s.append(el('p','enso-phase',QK_T?'No earthquakes reported in or near Myanmar in the last 7 days':'Checking USGS'));b.append(s);
  var pair=el('div','q-pair'),m=el('div');
  var side=el('div'),ul=el('ul','hl');side.append(el('h3',null,'Last 7 days'));
  if(!QK.length)ul.append(el('li',null,'No earthquakes on the list right now.'));
  QK.slice(0,12).forEach(function(q){var li=el('li','q-row'),g=el('b',q.mag>=5?'q-mag hi':'q-mag',q.mag.toFixed(1)),c=el('div'),a=el('a',null,q.where);a.href=safe(q.url);a.target='_blank';a.rel='noopener';c.append(a,el('small',null,qAgo(q.time)+' · '+q.dist+' km away'));li.append(g,c);ul.append(li)});
  side.append(ul);pair.append(m,side);b.append(pair);qMap(m,top);
  var act=el('div','q-act'),g1=el('button','btn',GEO?'Location saved':'Use my location'),g2=el('button','btn',store('pd-push')?'Notifications on':'Turn on notifications'),g3=el('button','btn',store('pd-qsound')?'Sound on':'Turn on sound');[g1,g2,g3].forEach(function(x){x.type='button'});
  g1.onclick=function(){if(!navigator.geolocation){g1.textContent='Location not available';return}navigator.geolocation.getCurrentPosition(function(p){GEO={lat:+p.coords.latitude.toFixed(2),lon:+p.coords.longitude.toFixed(2)};store('pd-geo',GEO);qSet([],QK_SRC)},function(){g1.textContent='Location was blocked'})};
  g2.onclick=function(){g2.textContent='Turning on…';enablePush().then(function(){g2.textContent='Notifications on';g4.hidden=false}).catch(function(e){g2.textContent=e.message||'Could not turn on'})};
  var g4=el('button','btn','Send a test');g4.type='button';g4.hidden=!store('pd-push');g4.onclick=function(){g4.textContent='Sending…';testPush().then(function(){g4.textContent='Test sent'}).catch(function(){g4.textContent='Test failed'})};
  g3.onclick=function(){var v=!store('pd-qsound');store('pd-qsound',v);if(v)beep();g3.textContent=v?'Sound on':'Turn on sound'};
  act.append(g1,g2,g3,g4);b.append(act);
  b.append(el('p','small-note','Alerts show for magnitude 4.5+ in or near Myanmar, or 4.0+ within 300 km of '+o.name+'. This reports earthquakes after they happen. It cannot warn before shaking starts. In an earthquake: drop, cover and hold on.'));
  b.append(el('p','small-note',QK_SRC+' · The page checks every minute while open.'));
}

/* Realistic sky card */
function seeded(n){return function(){n=(n*16807)%2147483647;return n/2147483647}}
function skyColors(c,h,day){
  var dawn=h>=5&&h<7,dusk=h>=17&&h<19;
  if(c>=95)return ['#1B2230','#39424F','#6A6F73'];
  if(c>=51)return day?['#465565','#74838F','#AEB6B7']:['#141B26','#27313F','#46505A'];
  if(c===3||c===45||c===48)return day?['#74899C','#AAB7C1','#DAD8CF']:['#171F2C','#2C3644','#4A515A'];
  if(!day)return ['#050B1C','#10203F','#2B3B62'];
  if(dawn)return ['#3A6EA8','#E9A77C','#FFD9A0'];
  if(dusk)return ['#29497F','#C9694F','#FFB765'];
  return ['#1F6FC4','#6FB4E8','#FBE7C3'];
}
function cloudCanvas(cover,seed,dark,day){
  var W=1400,H=360,c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d'),r=seeded(seed);
  var base=dark?[120,128,136]:day?[255,255,255]:[150,160,180],shade=dark?[62,70,80]:day?[176,190,205]:[70,80,100];
  function puff(px,py,rad,col,al){[px-W,px,px+W].forEach(function(q){var g=x.createRadialGradient(q,py,0,q,py,rad);g.addColorStop(0,'rgba('+col+','+al+')');g.addColorStop(.6,'rgba('+col+','+al*.45+')');g.addColorStop(1,'rgba('+col+',0)');x.fillStyle=g;x.fillRect(q-rad,py-rad,rad*2,rad*2)})}
  for(var n=0;n<cover;n++){var cx=r()*W,cy=40+r()*170,w=120+r()*230,h=28+r()*42;
    for(var i=0;i<46;i++){var a=r()*6.28,d=Math.sqrt(r()),px=cx+Math.cos(a)*d*w,py=cy+Math.sin(a)*d*h,s=22+r()*42*(1-d*.5);puff(px,py+s*.34,s*1.05,shade,.16);puff(px,py,s,base,.2)}}
  return c;
}
function stupa(x,b,s){var w=46*s,h=118*s;return 'M'+(x-w*1.5)+' '+b+'V'+(b-10*s)+'H'+(x-w*1.25)+'V'+(b-20*s)+'H'+(x-w)+'V'+(b-30*s)+'H'+(x-w*.78)+'C'+(x-w*.62)+' '+(b-58*s)+' '+(x-w*.22)+' '+(b-74*s)+' '+(x-w*.12)+' '+(b-h*.82)+'L'+(x-1.5*s)+' '+(b-h*1.32)+'H'+(x+1.5*s)+'L'+(x+w*.12)+' '+(b-h*.82)+'C'+(x+w*.22)+' '+(b-74*s)+' '+(x+w*.62)+' '+(b-58*s)+' '+(x+w*.78)+' '+(b-30*s)+'H'+(x+w)+'V'+(b-20*s)+'H'+(x+w*1.25)+'V'+(b-10*s)+'H'+(x+w*1.5)+'V'+b+'Z'}
function palm(x,b,s){var p='M'+x+' '+b+'Q'+(x+5*s)+' '+(b-40*s)+' '+(x+2*s)+' '+(b-78*s)+'L'+(x+6*s)+' '+(b-78*s)+'Q'+(x+10*s)+' '+(b-40*s)+' '+(x+6*s)+' '+b+'Z';[-34,-22,-10,12,24,36].forEach(function(o){var e=x+4*s+o*s,y=b-78*s+Math.abs(o)*.55*s;p+='M'+(x+4*s)+' '+(b-80*s)+'Q'+(x+4*s+o*.55*s)+' '+(b-92*s)+' '+e+' '+y+'Q'+(x+4*s+o*.45*s)+' '+(b-84*s)+' '+(x+4*s)+' '+(b-77*s)+'Z'});return p}
function horizon(far,near){var f='',n='';[[150,.62],[290,.8],[470,.55],[710,.72],[880,.58],[1090,.78]].forEach(function(p){f+=stupa(p[0],160,p[1])});[[60,.7],[1010,.62]].forEach(function(p){n+=palm(p[0],170,p[1])});n+=stupa(610,170,1.08)+stupa(835,170,.66)+stupa(300,170,.74)+palm(450,170,.82)+palm(1140,170,.9)+palm(205,170,.56);
  return '<svg class="hz" viewBox="0 0 1200 170" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path fill="'+far+'" d="'+f+'M0 170V150Q300 138 600 148T1200 144V170Z"/><path fill="'+near+'" d="'+n+'M0 170V160Q300 152 620 160T1200 156V170Z"/></svg>'}
function drawSky(b){
  clear(b);
  if(!WX){b.classList.remove('live-sky');b.append(el('p','line','Weather is loading.'));return}
  b.classList.add('live-sky');
  var w=WX.current,hr=parseInt(w.time.slice(11,13),10),day=!!w.is_day,c=w.weather_code,k=code(c,w.is_day),i=nowIdx(WX),F=FIRE[fireLevel(WX.hourly,i)],C=skyColors(c,hr,day);
  var s=el('div','sky-bg');s.style.background='linear-gradient(180deg,'+C[0]+' 0%,'+C[1]+' 62%,'+C[2]+' 100%)';
  var clearSky=c===0,part=c>=1&&c<=2,wet=c>=51;
  if(day&&(clearSky||part)){var sun=el('i','sun');sun.style.left=Math.max(8,Math.min(92,(hr-6)/12*100))+'%';sun.style.top=(22+Math.abs(hr-12)*5)+'%';s.append(sun)}
  if(!day&&(clearSky||part)){var r=seeded(7),st=el('div','stars');for(var q=0;q<70;q++){var t=el('i');t.style.cssText='left:'+r()*100+'%;top:'+r()*62+'%;opacity:'+(.3+r()*.7);st.append(t)}s.append(st);var m=el('i','moon');s.append(m)}
  var cover=clearSky?1:part?6:c===3?20:wet?24:14,dark=wet||c>=95;
  [[cover,11,'c1'],[Math.ceil(cover*.7),29,'c2']].forEach(function(l){var tr=el('div','clouds '+l[2]);tr.append(cloudCanvas(l[0],l[1],dark,day));var cv2=document.createElement('canvas');cv2.width=1400;cv2.height=360;cv2.getContext('2d').drawImage(tr.firstChild,0,0);tr.append(cv2);s.append(tr)});
  if(wet)s.append(el('div','rain'));
  var far=day?'rgba(46,60,72,.5)':'rgba(10,16,30,.7)',near=day?'#141B1F':'#05080F',h=el('div');h.className='hz-wrap';h.innerHTML=horizon(far,near);s.append(h);b.append(s);
  var top=el('div','card-t');top.append(city+' now');top.append(mm('span','ရာသီဥတု'));
  var main=el('div','sky-main'),tx=el('div','c');tx.append(k[1],mm('span',k[2]));main.append(el('span','t',Math.round(w.temperature_2m)+'°'),tx);
  var fire=el('div','glass');fire.style.setProperty('--fire',F[3]);fire.append('🔥 Fire danger: '+F[1],mm('span',F[2]));
  var info=el('p','sky-info','Feels like '+Math.round(w.apparent_temperature)+'°  ·  Rain '+(WX.hourly.precipitation_probability[i]||0)+'%  ·  Wind '+Math.round(w.wind_speed_10m)+' km/h');
  var fg=el('div','sky-fg');fg.append(top,main,info,fire);wxAlerts().filter(function(x){return x.l>0}).forEach(function(x){var q=el('div','glass warnline');q.style.setProperty('--fire',x.l>1?'#E0252B':'#E0A01F');q.append(x.i+' '+x.en+': '+LV[x.l]);fg.append(q)});b.append(fg);
}

/* Daily edition */
function feedList(rows){var ul=el('ul','feed');rows.forEach(function(i){var li=el('li',Date.now()-new Date(i.published)<36e5?'fresh':null),t=el('time',null,ago(i.published)),c=el('div'),a=el('a',null,i.title);t.dateTime=i.published;a.href=safe(i.url);a.target='_blank';a.rel='noopener';c.append(a,el('span',null,i.source));li.append(t,c);ul.append(li)});return ul}
var N=$('news'),liveBox=el('section','live');liveBox.id='live';
function renderEdition(){
  var y=ygn(),p=E.date.split('-').map(Number),age=Math.floor((Date.UTC(y[0],y[1]-1,y[2])-Date.UTC(p[0],p[1]-1,p[2]))/864e5),dl=$('dateline');
  if(age>=2)dl.append(el('span','stale','News edition is '+age+' days old'));
  var L=$('lead');clear(L);var ls=srcs(E.lead.sources);ls.style.marginTop='8px';
  L.append(el('span','flag',E.lead.flag),el('h2',null,E.lead.title),el('p',null,E.lead.body),ls);
  TOPICS=E.sections.filter(function(s){return s.id!=='weather'});
  var R=$('rail');clear(R);
  function head(en,m){var h=el('h2',null,en);h.append(' ',mm('span',m));return h}
  var wb=el('section');wb.append(head('Three words','စကားလုံး'));
  E.words.forEach(function(v){var n=el('div','word'),t=el('div');t.append(el('span','term',v.term),el('span','pos',v.pos));n.append(t,mm('span',v.mm),el('p',null,v.meaning),el('p','ex',v.example));wb.append(n)});
  var qb=el('section');qb.append(head('Quote','အဆိုအမိန့်'));var q=el('blockquote','quote');q.append(el('p',null,E.quote.text),el('footer',null,E.quote.source));qb.append(q);
  var side=el('div','learn-side');side.append(qb);R.append(wb,side);
  if(E.history){var hb=el('section');hb.append(head('History','သမိုင်း'));var c=el('div','hist');c.append(el('span','src',E.history.label),el('h3',null,E.history.title),el('p',null,E.history.body),srcs([E.history.source]));hb.append(c);side.append(hb)}
  side.append(ageTool());
  $('foot').textContent='The live weather comes from Open-Meteo. News, alerts and stock prices check public sources about every 15 minutes. Stories, words, the quote and history refresh every morning before 7:00 AM Myanmar time. Always follow official warnings from Myanmar\'s weather department and Fire Services. Burmese calendar by Yan Naing Aye (MIT licence).';
}
function ageTool(){
  var b=el('section','span'),h=el('h2',null,'Burmese birthday ');h.append(mm('span','မွေးနေ့'));
  var l=el('label',null,'Your date of birth'),i=el('input','field'),o=el('div','age-out');i.type='date';i.id='birth';i.max=iso(TODAY);l.htmlFor='birth';l.append(i);
  function run(){clear(o);if(!i.value)return;store('pd-birth',i.value);var d=i.value.split('-').map(Number),m=md(d),w=wd(d),age=TODAY[0]-d[0]-((TODAY[1]<d[1]||(TODAY[1]===d[1]&&TODAY[2]<d[2]))?1:0);
    o.append(el('strong',null,'Age '+age),mm('span','မွေးနေ့ '+tr(WDN[w])+'နေ့၊ '+POST[w][1]+'ဒေါင့်'),el('span',null,'Born on '+WDN[w]+', '+POST[w][0]+' corner'),mm('span',mmNum(m.my)+' ခုနှစ်၊ '+mmLine(m)),el('span',null,'Myanmar Era '+m.ToMString('&yyyy &M &P &ff')))}
  i.onchange=run;i.value=store('pd-birth')||'';run();b.append(h,l,o);return b;
}
function mergeMarkets(){var m=(MK&&MK.items)||{};return E.markets.map(function(r){var x=m[r.name];return x?{name:r.name,value:x.value,change:x.change,when:x.when}:r})}
function renderNews(){
  clear(N);var C=$('chips');clear(C);
  [['all','All']].concat(TOPICS.map(function(t){return [t.id,t.en]})).forEach(function(t){var a=el('a',null,t[1]);a.href='#'+t[0];if(t[0]===key)a.setAttribute('aria-current','true');C.append(a)});
  $('lead').hidden=key!=='all';
  if(key==='all'){N.append(liveBox);renderLive();
    TOPICS.forEach(function(s){var sec=el('section'),h=el('div','sec-head'),l=el('a',null,s.en);l.href='#'+s.id;var t=el('h2');t.append(l);h.append(t,mm('span',s.mm));var ul=el('ul','hl');s.items.slice(0,3).forEach(function(i){ul.append(hlRow(i.title,i.sources[0].url,i.sources[0].name))});sec.append(h,ul);N.append(sec)});return}
  var s=E.sections.find(function(x){return x.id===key});if(!s)return;
  var sec=el('section'),h=el('div','sec-head');h.append(el('h2',null,s.en),mm('span',s.mm));sec.append(h);
  if(s.table){var wr=el('div','mkt-wrap');wr.tabIndex=0;var tb=el('table','mkt');tb.innerHTML='<thead><tr><th scope="col">Market</th><th scope="col">Level</th><th scope="col">Change</th><th scope="col">As of</th></tr></thead>';var b=el('tbody');mergeMarkets().forEach(function(r){var q=el('tr');q.append(el('td',null,r.name),el('td',null,r.value),el('td',dir(r.change),pct(r.change)),el('td','w',r.when));b.append(q)});tb.append(b);wr.append(tb);sec.append(wr,el('p','note',E.marketNote))}
  var ul=el('ul','items');s.items.forEach(function(i){var li=el('li','item');li.append(el('h3',null,i.title),el('p',null,i.body),srcs(i.sources));ul.append(li)});sec.append(ul);N.append(sec,liveBox);renderLive();
}
function renderLive(){
  clear(liveBox);var h=el('div','live-head'),a0=LIVE?ago(LIVE.updated):'';
  h.append(el('i','dot'),el('h2',null,'Live feed'),mm('span','တိုက်ရိုက်'),el('span','live-state',!LIVE?'Loading':a0==='now'?'Updated just now':'Updated '+a0+' ago'));liveBox.append(h);
  if(!LIVE){liveBox.append(el('p','empty','Live headlines appear here once the feed loads.'));return}
  var rows=LIVE.items.filter(function(i){return i.topic!=='weather'&&i.topic!=='enso'&&(key==='all'||i.topic===key)}).slice(0,key==='all'?6:20);
  if(!rows.length){liveBox.append(el('p','empty','No headlines from the last two days in this topic.'));return}
  liveBox.append(feedList(rows));
}
var NAV=[['home','Home','ပင်မ'],['weather','Weather','ရာသီဥတု'],['enso','El Niño','အယ်လ်နီညို'],['quakes','Earthquakes','ငလျင်'],['calendar','Calendar','ပြက္ခဒိန်'],['reminders','Reminders','မှတ်စု'],['all','News','သတင်း'],['learn','Learn','လေ့လာရန်']];
(function(){var n=$('nav');NAV.forEach(function(x){var a=el('a');a.href='#'+x[0];a.dataset.key=x[0];a.append(x[1],mm('span',x[2]));n.append(a)})})();
var VIEWS=['home','weather','enso','quakes','calendar','reminders','learn'],NEWS=['all','myanmar','world','politics','business','stocks','tech'];
function route(jump){
  var k=location.hash.slice(1);if(VIEWS.indexOf(k)<0&&NEWS.indexOf(k)<0)k='home';
  var v=NEWS.indexOf(k)>=0?'news':k;view=v;if(v==='news')key=k;
  VIEWS.concat('news').forEach(function(x){$('v-'+x).hidden=x!==v});$('band').hidden=v!=='home';
  Array.prototype.forEach.call($('nav').querySelectorAll('a'),function(a){var on=a.dataset.key===(v==='news'?'all':k);if(on){a.setAttribute('aria-current','page');var nv=$('nav');if(nv.scrollWidth>nv.clientWidth)nv.scrollLeft=a.offsetLeft-40}else a.removeAttribute('aria-current')});
  if(E&&v==='news')renderNews();
  if(v==='home')renderHome();
  redraw();
  if(jump===true)scrollTo(0,0);
}
function redraw(){if(view==='quakes')renderQuakes();if(view==='weather'&&WX)renderWx();if(view==='enso')renderEnso(ENSO)}
function card(cls,href,title,m){var c=el(href?'a':'section','card '+cls);if(href)c.href=href;var t=el('div','card-t');t.append(title);if(m)t.append(mm('span',m));if(href)t.append(el('i',null,'→'));c.append(t);return c}
function renderHome(){
  var g=$('hgrid');if(!g||view!=='home')return;
  var slot=$('home-sky');if(!slot){slot=el('a','sky card w6');slot.id='home-sky';slot.href='#weather';g.prepend(slot)}
  while(g.children.length>1)g.removeChild(g.lastChild);
  var skey=WX?city+WX.current.time+WX.current.weather_code+Math.round(WX.current.temperature_2m):'wait';
  if(slot.dataset.key!==skey){slot.dataset.key=skey;drawSky(slot)}
  var en=card('','#enso','El Niño','အယ်လ်နီညို');
  if(ENSO&&ENSO.weeks&&ENSO.weeks.length){var L=ENSO.weeks[ENSO.weeks.length-1],P=ensoPhase(L.n34);en.append(el('div','big',(L.n34>0?'+':'')+L.n34.toFixed(1)+'°C'),el('p','line',P[0]))}else en.append(el('p','line muted','Loading.'));
  g.append(en);
  var qc=card('','#quakes','Earthquakes','ငလျင်'),qr=QK.filter(inRegion)[0];qc.append(el('div','big',qr?'M '+qr.mag.toFixed(1):'None'),el('p','line muted',qr?qAgo(qr.time)+' · '+qr.where:QK_T?'None near Myanmar in 7 days':'Checking'));g.append(qc);
  var m=md(TODAY),d=card('','#calendar','Burmese date','ပြက္ခဒိန်');d.append(mm('div',mmLine(m)),el('p','line muted','ME '+m.my+' · '+m.ToMString('&M &P &ff')));g.append(d);
  var ns=loadNotes().sort(function(x,y){return (x.date+x.time).localeCompare(y.date+y.time)}),dc=ns.filter(due).length,rc=card('','#reminders','Reminders','မှတ်စု');
  rc.append(el('div','big',dc?dc+' due':ns.length?String(ns.length):'None'),el('p','line muted',ns.length?ns[0].text:'Tap to add one'));g.append(rc);
  if(E){var nc=card('w6 wide',null,'Top news','သတင်း'),ul=el('ul','hl'),L0=E.lead.sources[0];ul.append(hlRow(E.lead.title,L0.url,L0.name));
    ['myanmar','world','tech'].forEach(function(id){var s=E.sections.find(function(x){return x.id===id}),i0=s&&s.items[0];if(i0)ul.append(hlRow(i0.title,i0.sources[0].url,s.en+' · '+i0.sources[0].name))});
    var more=el('a','more','All news');more.href='#all';nc.append(ul,more);g.append(nc)}
}
function checkVersion(){get('data/version.json').then(function(j){var cur=document.documentElement.dataset.v;if(j.v&&cur!=='__V__'&&j.v!==cur&&store('pd-tried')!==j.v){store('pd-tried',j.v);location.reload()}}).catch(function(){})}
function pullMarkets(){return get('data/markets.json').then(function(j){MK=j;if(view==='news'&&key==='stocks')renderNews()}).catch(function(){})}
function get(p){return fetch(p+'?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()})}
function pullLive(){return get('data/live.json').then(function(j){LIVE=j;renderHome();renderLive();renderWeatherNews();renderEnsoNews();renderBreaking()}).catch(function(){if(!LIVE){clear(liveBox);liveBox.append(el('p','empty','The live feed could not load. It will try again in a few minutes.'))}})}

pullQuakes(true);setInterval(pullQuakes,6e4);
get('data/enso.json').then(function(d){ENSO=d;renderHome();if(view==='enso')renderEnso(d)}).catch(function(){});
renderDateline();renderDay();renderNotes();route();loadWx();
setInterval(loadWx,9e5);setInterval(drawNotes,3e4);
get('data/edition.json').then(function(j){E=j;renderEdition();route();pullLive();pullMarkets();checkVersion();addEventListener('hashchange',function(){route(true)});setInterval(pullLive,3e5);setInterval(pullMarkets,3e5);setInterval(checkVersion,3e5);document.addEventListener('visibilitychange',function(){if(!document.hidden){checkVersion();pullMarkets();pullLive();loadWx()}})}).catch(function(){N.append(el('p','empty','Today\'s edition could not load. Check your connection and reload.'))});
addEventListener('load',function(){scrollTo(0,0)});
})();
