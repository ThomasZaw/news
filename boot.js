// Runs before the page paints: picks light or dark, moves old addresses to the main domain,
// and opens the right section when the page is one of the separate section pages.
(function(){
var d=document.documentElement,t=null,m;
function read(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}
t=read('pd-theme');
d.dataset.theme=t==='dark'||t==='light'?t:(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
if(read('pd-lite'))d.dataset.lite='1';
if(location.hostname==='thomaszaw.github.io'){location.replace('https://parabaikdaily.com/'+location.hash);return}
m=document.querySelector('meta[name="pd-view"]');
if(m){
  if(!location.hash)history.replaceState(null,'','#'+m.content);
  document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#"]');if(a){e.preventDefault();location.hash=a.getAttribute('href')}});
}
})();
