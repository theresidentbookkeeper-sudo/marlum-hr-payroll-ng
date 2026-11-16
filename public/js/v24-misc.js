
// A second, completely independent watchdog outside the module above, in case that specific
// closure itself fails to initialize for any reason — this one only depends on the database
// object and the static #marlumAuthBox element existing (both present from page load, not
// created by any script), not on any other function in this file succeeding.
setInterval(function(){
  try{
    const db=window.__marlumDB;
    const b=document.getElementById('marlumAuthBox');
    if(!b)return;
    if(!db||!db.currentUser){b.style.display='none';return}
    const roles=(db.currentUser.roles||[]).join(' · ')||'';
    const who=db.currentUser.name||db.currentUser.email||'Signed in';
    const roleEl=document.getElementById('marlumAuthRole'),nameEl=document.getElementById('marlumAuthName');
    if(roleEl)roleEl.textContent=roles;
    if(nameEl)nameEl.textContent=who;
    b.style.display='';
  }catch(e){}
},500);
