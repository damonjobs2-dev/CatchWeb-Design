// Continuous documents follow reading position; the URL remains a shareable anchor.
(() => {
 const side=document.querySelector('.sidebar')||document.querySelector('aside'),toggle=document.getElementById('directory-toggle');
 const nav=document.getElementById('nav');
 const marked=[...document.querySelectorAll('[data-study-section]')];
 const sections=marked.length?marked:[...document.querySelectorAll('main>section')];
 if(!nav||!sections.length)return;
 let current;
 function active(id){
  for(const a of nav.querySelectorAll('a')){
   if(a.hash==='#'+id)a.setAttribute('aria-current','location');
   else a.removeAttribute('aria-current');
  }
  if(current!==id){current=id;dispatchEvent(new CustomEvent('catchart:sectionchange',{detail:{id}}))}
 }
 function sync(){
  const last=sections.at(-1);
  if(scrollY>0&&Math.ceil(scrollY+innerHeight)>=document.documentElement.scrollHeight-2){active(last.id);return}
  const header=document.querySelector('.topbar,.docbar');
  const threshold=Math.max(150,(header?.getBoundingClientRect().bottom||0)+24);
  let id=sections[0].id;
  for(const section of sections){if(section.getBoundingClientRect().top<=threshold)id=section.id}
  active(id);
 }
 let pending=false;
 function schedule(){if(!pending){pending=true;requestAnimationFrame(()=>{sync();pending=false})}}
 toggle?.addEventListener('click',()=>{
  const open=toggle.getAttribute('aria-expanded')!=='true';
  toggle.setAttribute('aria-expanded',String(open));side.dataset.open=String(open);
 });
 nav.addEventListener('click',event=>{if(event.target.closest('a')){side.dataset.open='false';toggle?.setAttribute('aria-expanded','false');schedule()}});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&side.dataset.open==='true'){side.dataset.open='false';toggle?.setAttribute('aria-expanded','false');toggle?.focus()}});
 addEventListener('scroll',schedule,{passive:true});
 addEventListener('resize',schedule);
 addEventListener('hashchange',schedule);
 addEventListener('load',schedule);
 document.fonts?.ready.then(schedule);
 schedule();
})();
