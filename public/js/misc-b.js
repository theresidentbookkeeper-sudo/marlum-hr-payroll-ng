
// Generic click target for page-level "widget" metric cards that summarize data already shown in
// a table on the same page — scrolls to that table and briefly highlights it, rather than each card
// needing its own dedicated modal.
function scrollToCardTable(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  const table=el.tagName==='TABLE'?el:(el.closest('table')||el);
  const orig=table.style.boxShadow;
  table.style.transition='box-shadow .15s ease';
  table.style.boxShadow='0 0 0 3px #17382b55';
  setTimeout(()=>{table.style.boxShadow=orig},900);
}
