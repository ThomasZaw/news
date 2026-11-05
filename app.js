(function(){
'use strict';
var E=null,LIVE=null,key='all',TOPICS=[];
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
$('size-up').onclick=function(){sz=size(sz+1)};$('size-down').onclick=function(){sz=size(sz-1)};

/* Burmese calendar */
var M=ceMmDateTime,TR=new ceMmTranslate();
function tr(s){return TR.T(s,1)}
function md(d){return new M(M.w2j(d[0],d[1],d[2],12,0,0,0),6.5)}
var POST=[['Garuda','ဂဠုန်'],['Tiger','ကျား'],['Lion','ခြင်္သေ့'],['Tusked elephant','ဆင်'],['Rat','ကြွက်'],['Guinea pig','ပူး'],['Naga','နဂါး']];
function wd(d){return new Date(Date.UTC(d[0],d[1]-1,d[2])).getUTCDay()}
var WDN=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
function mmLine(m){return tr(m.ToMString('&M &P &ff'))}
function mmNum(n){return tr(String(n))}
var TODAY=ygn(),view=[TODAY[0],TODAY[1]],pick=TODAY.slice();

function renderDateline(){
  var dl=$('dateline'),w=wd(TODAY),m=md(TODAY);clear(dl);
  dl.append(mm('span',tr(WDN[w])+'နေ့'),el('span',null,WDN[w]+', '+TODAY[2]+' '+MON[TODAY[1]-1]+' '+TODAY[0]));
}
function renderDay(){
  var b=$('daybox'),m=md(TODAY),w=wd(TODAY),h=el('h2',null,'Burmese calendar');h.append(' ',mm('span','ပြက္ခဒိန်'));clear(b);
  var big=mm('div','မြန်မာသက္ကရာဇ် '+mmNum(m.my)+' ခုနှစ်၊ '+mmLine(m));big.classList.add('big-date');
  var en=el('div',null,'Myanmar Era '+m.my+', '+m.ToMString('&M &P &ff'));
  var f=el('dl','facts');
  function fact(a,x){var w=el('div');w.append(el('dt',null,a));var d=el('dd');d.append(x);w.append(d);f.append(w)}
  fact('Day',tr(WDN[w])+'နေ့');fact('Myanmar year',mmNum(m.my));fact('Sasana year',mmNum(m.sy));
  fact('Birthday corner',POST[w][1]+' · '+POST[w][0]);
  var marks=[];if(m.sabbath)marks.push(m.sabbath);if(m.yatyaza)marks.push(m.yatyaza);if(m.pyathada)marks.push(m.pyathada);
  if(marks.length)fact('Today is',marks.map(tr).join('၊ '));
  var nav=el('div','cal-nav'),p=el('button','btn','←'),n=el('button','btn','→'),t=el('strong');
  p.type=n.type='button';p.setAttribute('aria-label','Previous month');n.setAttribute('aria-label','Next month');
  var first=md([view[0],view[1],1]),dim=new Date(Date.UTC(view[0],view[1],0)).getUTCDate(),last=md([view[0],view[1],dim]);
  t.append(MON[view[1]-1]+' '+view[0],mm('span',first.ToMString('&M')===last.ToMString('&M')?tr(first.ToMString('&M')):tr(first.ToMString('&M'))+' – '+tr(last.ToMString('&M'))));
  p.onclick=function(){view=view[1]===1?[view[0]-1,12]:[view[0],view[1]-1];renderDay()};
  n.onclick=function(){view=view[1]===12?[view[0]+1,1]:[view[0],view[1]+1];renderDay()};
  nav.append(p,t,n);
  var g=el('div','cal'),notes=loadNotes();
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(function(x){g.append(el('span',null,x))});
  for(var i=0,lead=wd([view[0],view[1],1]);i<lead;i++)g.append(el('span'));
  for(var d=1;d<=dim;d++)(function(d){
    var dt=[view[0],view[1],d],k=md(dt),c=el('button'),s=k.mp===1?'🌕':k.mp===3?'🌑':mmNum(k.mf);
    c.type='button';c.append(el('b',null,d),el('small',null,s));
    var hol=k.holidays.length>0;
    c.className=(hol?'hol ':'')+(iso(dt)===iso(TODAY)?'now ':'')+(notes.some(function(x){return x.date===iso(dt)})?'note':'');
    c.setAttribute('aria-pressed',iso(dt)===iso(pick)?'true':'false');
    c.setAttribute('aria-label',d+' '+MON[view[1]-1]+', '+k.ToMString('&M &P &ff')+(hol?', '+k.holidays.join(', '):''));
    c.onclick=function(){pick=dt;renderDay();var f=$('note-date');if(f)f.value=iso(dt)};
    g.append(c);
  })(d);
  var pk=md(pick),det=el('p','cal-detail'),line=pick[2]+' '+MON[pick[1]-1]+': '+pk.ToMString('&M &P &ff');
  det.append(el('strong',null,line),mm('span',mmLine(pk)));
  var extra=pk.holidays.concat(pk.holidays2);if(pk.sabbath)extra.unshift(pk.sabbath);
  if(extra.length)det.append(el('span',null,extra.join(', ')));
  b.append(h,big,en,f,nav,g,det);
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
function nowIdx(d){var t=d.current.time.slice(0,13);var i=d.hourly.time.findIndex(function(x){return x.slice(0,13)===t});return i<0?0:i}
function hhmm(s){return s.slice(11,16)}
function url(c){return 'https://api.open-meteo.com/v1/forecast?latitude='+c[1]+'&longitude='+c[2]+'&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,wind_gusts_10m_max&timezone=Asia%2FYangon&forecast_days=7'}
function loadWx(){
  var c=CITIES.find(function(x){return x[0]===city})||CITIES[0];
  return fetch(url(c)).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(j){WX=j;wxSource='Live from Open-Meteo';renderWx()}).catch(function(){
    return get('data/weather.json').then(function(a){if(!a.cities[city])throw 0;WX=a.cities[city];wxSource='Saved '+ago(a.updated)+' ago';renderWx()}).catch(function(){if(!WX)renderWx()})});
}
function renderWx(){
  var b=$('wx');clear(b);
  var top=el('div','wx-top'),h=el('h2',null,'Weather');h.append(' ',mm('span','ရာသီဥတု'));
  var s=el('select','field');s.id='city';s.setAttribute('aria-label','Choose a city');
  CITIES.forEach(function(c){var o=el('option',null,c[0]+'  '+c[3]);o.value=c[0];o.selected=c[0]===city;s.append(o)});
  s.onchange=function(){city=s.value;store('pd-city',city);loadWx()};top.append(h,s);b.append(top);
  if(!WX){b.append(el('p',null,'Weather is loading. If it does not appear, check your internet connection.'));return}
  var c=WX.current,k=code(c.weather_code,c.is_day),i=nowIdx(WX),H=WX.hourly,D=WX.daily;
  var now=el('div','wx-now'),main=el('div','wx-main'),cond=el('div','wx-cond');
  var tx=el('div');tx.append(el('div','wx-temp',Math.round(c.temperature_2m)+'°'));cond.append(k[1],mm('span',k[2]));tx.append(cond);
  main.append(el('div','wx-emoji',k[0]),tx);
  var st=el('div','stats');
  [['Feels like',Math.round(c.apparent_temperature)+'°','ခံစားရ'],['Chance of rain',(H.precipitation_probability[i]||0)+'%','မိုးရွာနိုင်ခြေ'],['Wind',Math.round(c.wind_speed_10m)+' km/h','လေ'],['Humidity',c.relative_humidity_2m+'%','စိုထိုင်းဆ']].forEach(function(r){var d=el('div'),t=el('b',null,r[0]),v=el('span',null,r[1]);t.append(mm('span',r[2]));d.append(t,v);st.append(d)});
  now.append(main,st);b.append(now);
  /* fire danger: highest in next 24 hours */
  var peak=0;for(var j=i;j<Math.min(i+24,H.time.length);j++)peak=Math.max(peak,cbi(H.temperature_2m[j],H.relative_humidity_2m[j]));
  var lv=FIRE.findIndex(function(f){return peak<f[0]}),F=FIRE[lv],fb=el('div','fire');fb.style.setProperty('--fire',F[3]);
  var ft=el('div','fire-title',F[0]===0?'':'🔥 Fire danger today: '+F[1]);ft.append(mm('span','မီးဘေးအန္တရာယ် '+F[2]));
  var me=el('div','meter');me.setAttribute('aria-hidden','true');for(var q=0;q<5;q++)me.append(el('i',q<=lv?'on':null));
  fb.append(ft,me,el('p',null,F[4]));var bp=mm('p',F[5]);fb.append(bp,el('small',null,'Estimate from temperature and humidity using the Chandler Burning Index. It is not an official warning.'));b.append(fb);
  var gust=Math.max.apply(null,[c.wind_gusts_10m].concat(D.wind_gusts_10m_max.slice(0,1)));
  var storm=H.weather_code.slice(i,i+24).some(function(x){return x>=95});
  if(storm)b.append(el('p','warn','⚡ Thunderstorms are possible in the next 24 hours.'));
  if(gust>=50)b.append(el('p','warn','💨 Gusts up to '+Math.round(gust)+' km/h today. Fires can spread quickly.'));
  var ch=el('div','chart');ch.id='chart';b.append(ch);drawChart(ch,H,i);
  var w=el('div','week'),wr=el('div','week-scroll'),row=el('div','week-row');w.append(el('h3',null,'Next 7 days'));
  D.time.forEach(function(t,n){var p=t.split('-').map(Number),cd=code(D.weather_code[n],1),d=el('div');d.append(el('b',null,n===0?'Today':n===1?'Tomorrow':WDN[wd(p)].slice(0,3)),el('em',null,cd[0]),el('span',null,Math.round(D.temperature_2m_max[n])+'° / '+Math.round(D.temperature_2m_min[n])+'°'),el('small',null,'Rain '+D.precipitation_probability_max[n]+'%'));row.append(d)});
  wr.append(row);w.append(wr);b.append(w);
  var wn=el('div','wn');wn.id='wn';b.append(wn);renderWeatherNews();
  b.append(el('p','small-note',wxSource+' · Times are Myanmar time'));
}
function drawChart(box,H,i){
  var w=Math.max(300,box.clientWidth||680),n=25,T=H.temperature_2m.slice(i,i+n),R=H.precipitation_probability.slice(i,i+n),TM=H.time.slice(i,i+n);
  var L=8,Rr=8,x=function(k){return L+k*(w-L-Rr)/(T.length-1)};
  var a=Math.floor(Math.min.apply(null,T))-1,z=Math.ceil(Math.max.apply(null,T))+1,h1=150,top=38,bot=h1-22,y=function(v){return bot-(v-a)*(bot-top)/(z-a)};
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
  var s=E.sections.find(function(x){return x.id==='weather'});
  var h=el('h3',null,'Weather and fire news ');h.append(mm('span','သတင်း'));b.append(h);
  if(s){var u=el('ul','items');s.items.slice(0,3).forEach(function(i){var li=el('li','item');li.append(el('h3',null,i.title),el('p',null,i.body),srcs(i.sources));u.append(li)});b.append(u)}
  var rows=LIVE?LIVE.items.filter(function(i){return i.topic==='weather'}).slice(0,8):[];
  if(rows.length){var f=feedList(rows);b.append(el('h3',null,'Live updates'),f)}
}
var RT;addEventListener('resize',function(){clearTimeout(RT);RT=setTimeout(function(){var c=$('chart');if(c&&WX)drawChart(c,WX.hourly,nowIdx(WX))},200)});

/* Daily edition */
function feedList(rows){var ul=el('ul','feed');rows.forEach(function(i){var li=el('li',Date.now()-new Date(i.published)<36e5?'fresh':null),t=el('time',null,ago(i.published)),c=el('div'),a=el('a',null,i.title);t.dateTime=i.published;a.href=safe(i.url);a.target='_blank';a.rel='noopener';c.append(a,el('span',null,i.source));li.append(t,c);ul.append(li)});return ul}
var N=$('news'),TB=$('tabs'),liveBox=el('section','live');liveBox.id='live';
function renderEdition(){
  var y=ygn(),p=E.date.split('-').map(Number),age=Math.floor((Date.UTC(y[0],y[1]-1,y[2])-Date.UTC(p[0],p[1]-1,p[2]))/864e5),dl=$('dateline');
  dl.append(el('span',age>=2?'stale':null,age>=2?'News edition is '+age+' days old':'News updated '+E.updated));
  var L=$('lead');clear(L);var ls=srcs(E.lead.sources);ls.style.marginTop='8px';
  L.append(el('span','flag',E.lead.flag),el('h2',null,E.lead.title),el('p',null,E.lead.body),ls);
  var T=$('tape');clear(T);E.tape.forEach(function(t){var n=el('div','tick');n.append(el('b',null,t.label),el('span',null,t.value),el('i',dir(t.change),pct(t.change)));T.append(n)});
  TOPICS=[{id:'all',en:'All'}].concat(E.sections.filter(function(s){return s.id!=='weather'}));clear(TB);
  TOPICS.forEach(function(t){var a=el('a',null,t.en);a.href='#'+t.id;a.dataset.key=t.id;TB.append(a)});
  var R=$('rail');clear(R);
  function head(en,m){var h=el('h2',null,en);h.append(' ',mm('span',m));return h}
  var wb=el('section');wb.append(head('Three words','စကားလုံး'));
  E.words.forEach(function(v){var n=el('div','word'),t=el('div');t.append(el('span','term',v.term),el('span','pos',v.pos));n.append(t,mm('span',v.mm),el('p',null,v.meaning),el('p','ex',v.example));wb.append(n)});
  var qb=el('section');qb.append(head('Quote','အဆိုအမိန့်'));var q=el('blockquote','quote');q.append(el('p',null,E.quote.text),el('footer',null,E.quote.source));qb.append(q);
  R.append(wb,qb);
  if(E.history){var hb=el('section');hb.append(head('History','သမိုင်း'));var c=el('div','hist');c.append(el('span','src',E.history.label),el('h3',null,E.history.title),el('p',null,E.history.body),srcs([E.history.source]));hb.append(c);R.append(hb)}
  R.append(ageTool());
  $('foot').textContent='The live weather comes from Open-Meteo. News and weather alerts check public feeds about every 30 minutes. Stories, words, the quote and history refresh every morning before 7:00 AM Myanmar time. Always follow official warnings from Myanmar\'s weather department and Fire Services. Burmese calendar by Yan Naing Aye (MIT licence).';
}
function ageTool(){
  var b=el('section','span'),h=el('h2',null,'Burmese birthday ');h.append(mm('span','မွေးနေ့'));
  var l=el('label',null,'Your date of birth'),i=el('input','field'),o=el('div','age-out');i.type='date';i.id='birth';i.max=iso(TODAY);l.htmlFor='birth';l.append(i);
  function run(){clear(o);if(!i.value)return;store('pd-birth',i.value);var d=i.value.split('-').map(Number),m=md(d),w=wd(d),age=TODAY[0]-d[0]-((TODAY[1]<d[1]||(TODAY[1]===d[1]&&TODAY[2]<d[2]))?1:0);
    o.append(el('strong',null,'Age '+age),mm('span','မွေးနေ့ '+tr(WDN[w])+'နေ့၊ '+POST[w][1]+'ဒေါင့်'),el('span',null,'Born on '+WDN[w]+', '+POST[w][0]+' corner'),mm('span',mmNum(m.my)+' ခုနှစ်၊ '+mmLine(m)),el('span',null,'Myanmar Era '+m.ToMString('&yyyy &M &P &ff')))}
  i.onchange=run;i.value=store('pd-birth')||'';run();b.append(h,l,o);return b;
}
function renderNews(){
  clear(N);
  E.sections.forEach(function(s){
    if(s.id==='weather'||(key!=='all'&&key!==s.id))return;
    var sec=el('section'),h=el('div','sec-head');h.append(el('h2',null,s.en),mm('span',s.mm));sec.append(h);
    if(s.table&&key==='stocks'){var wr=el('div','mkt-wrap');wr.tabIndex=0;var tb=el('table','mkt');tb.innerHTML='<thead><tr><th scope="col">Market</th><th scope="col">Level</th><th scope="col">Change</th><th scope="col">As of</th></tr></thead>';var b=el('tbody');E.markets.forEach(function(r){var tr2=el('tr');tr2.append(el('td',null,r.name),el('td',null,r.value),el('td',dir(r.change),pct(r.change)),el('td','w',r.when));b.append(tr2)});tb.append(b);wr.append(tb);sec.append(wr,el('p','note',E.marketNote))}
    var ul=el('ul','items');(key==='all'?s.items.slice(0,3):s.items).forEach(function(i){var li=el('li','item');li.append(el('h3',null,i.title),el('p',null,i.body),srcs(i.sources));ul.append(li)});sec.append(ul);
    if(key==='all'){var a=el('a','more','All '+s.en+' news');a.href='#'+s.id;sec.append(a)}
    N.append(sec);
  });
  if(key==='all')N.prepend(liveBox);else N.append(liveBox);renderLive();
}
function renderLive(){
  clear(liveBox);var h=el('div','live-head'),a0=LIVE?ago(LIVE.updated):'';
  h.append(el('i','dot'),el('h2',null,'Live feed'),mm('span','တိုက်ရိုက်'),el('span','live-state',!LIVE?'Loading':a0==='now'?'Updated just now':'Updated '+a0+' ago'));liveBox.append(h);
  if(!LIVE){liveBox.append(el('p','empty','Live headlines appear here once the feed loads.'));return}
  var rows=LIVE.items.filter(function(i){return i.topic!=='weather'&&(key==='all'||i.topic===key)}).slice(0,key==='all'?12:30);
  if(!rows.length){liveBox.append(el('p','empty','No headlines from the last two days in this topic.'));return}
  liveBox.append(feedList(rows));
}
function route(jump){
  var k=location.hash.slice(1);key=TOPICS.some(function(t){return t.id===k})?k:'all';
  Array.prototype.forEach.call(TB.children,function(a){var on=a.dataset.key===key;a.setAttribute('aria-current',on?'true':'false');if(on&&location.hash)a.scrollIntoView({block:'nearest',inline:'center'})});
  renderNews();if(jump===true)document.querySelector('.tabs-box').scrollIntoView();
}
function get(p){return fetch(p+'?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()})}
function pullLive(){return get('data/live.json').then(function(j){LIVE=j;renderLive();renderWeatherNews()}).catch(function(){if(!LIVE){clear(liveBox);liveBox.append(el('p','empty','The live feed could not load. It will try again in a few minutes.'))}})}

renderDateline();renderDay();renderNotes();renderWx();loadWx();
setInterval(loadWx,9e5);setInterval(drawNotes,3e4);
get('data/edition.json').then(function(j){E=j;renderEdition();route();renderWeatherNews();pullLive();addEventListener('hashchange',function(){route(true)});setInterval(pullLive,3e5);document.addEventListener('visibilitychange',function(){if(!document.hidden){pullLive();loadWx()}})}).catch(function(){N.append(el('p','empty','Today\'s edition could not load. Check your connection and reload.'))});
})();
