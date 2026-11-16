
(function(){
  const bar=document.getElementById('hBar'),track=bar.querySelector('.hbar-track'),thumb=bar.querySelector('.hbar-thumb');
  let target=null,drag=null;
  const inView=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth};
  function findTarget(){
    const modal=document.getElementById('modal'),inModal=modal&&modal.classList.contains('show');
    const root=inModal?document.getElementById('modalContent'):document.querySelector('main')||document.body;
    let best=null,bestOver=2;
    const consider=(el,over)=>{if(over>bestOver){best=el;bestOver=over}};
    root.querySelectorAll('*').forEach(el=>{
      const over=el.scrollWidth-el.clientWidth;
      if(over<=2||el.clientWidth<40)return;
      if(!/(auto|scroll)/.test(getComputedStyle(el).overflowX)||!inView(el))return;
      consider(el,over);
    });
    if(!inModal){const de=document.scrollingElement||document.documentElement;consider(de,de.scrollWidth-de.clientWidth)}
    return best;
  }
  function place(){
    if(!target)return;
    const view=target.clientWidth,full=target.scrollWidth,tw=track.clientWidth;
    const w=Math.max(48,tw*view/full),max=full-view;
    thumb.style.width=w+'px';
    thumb.style.left=(max>0?(tw-w)*target.scrollLeft/max:0)+'px';
  }
  function refresh(){
    if(document.hidden||drag)return;
    target=findTarget();
    const show=!!target&&innerWidth>900;
    bar.hidden=!show;
    document.body.classList.toggle('has-hbar',show);
    if(show)place();
  }
  thumb.addEventListener('pointerdown',e=>{e.preventDefault();thumb.setPointerCapture(e.pointerId);drag={x:e.clientX,left:target?target.scrollLeft:0};bar.classList.add('drag')});
  thumb.addEventListener('pointermove',e=>{
    if(!drag||!target)return;
    const tw=track.clientWidth,w=thumb.offsetWidth,max=target.scrollWidth-target.clientWidth;
    target.scrollLeft=drag.left+(e.clientX-drag.x)*max/Math.max(1,tw-w);
    place();
  });
  ['pointerup','pointercancel'].forEach(ev=>thumb.addEventListener(ev,()=>{drag=null;bar.classList.remove('drag');refresh()}));
  track.addEventListener('pointerdown',e=>{
    if(e.target===thumb||!target)return;
    const r=track.getBoundingClientRect(),w=thumb.offsetWidth,max=target.scrollWidth-target.clientWidth,tw=track.clientWidth;
    target.scrollLeft=(e.clientX-r.left-w/2)*max/Math.max(1,tw-w);
    place();
  });
  let queued=false;
  const soon=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})};
  window.addEventListener('scroll',soon,true);
  window.addEventListener('resize',soon);
  document.addEventListener('click',()=>setTimeout(soon,200),true);
  setInterval(refresh,1500);
  refresh();
})();
