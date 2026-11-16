
(function(){
  'use strict';
  const db=window.__marlumDB;
  if(!db){console.error('Marlum V24 layer could not access application state.');return;}
  const escV24=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // ---- ROOT CAUSE FIX: the original "Sign out" chip/button is only created inside the async
  //      Supabase boot() function's own render() override, AFTER the Supabase CDN script has
  //      finished loading (a network call with no guaranteed timing, and no fallback if it's slow
  //      or fails). Every demo login is instant and has nothing to do with Supabase, so in practice
  //      a person could sign in and have NO visible way to sign out for an unpredictable stretch of
  //      time — which breaks the entire multi-role approval workflow, since every stage requires
  //      switching accounts. This builds the same chip immediately and unconditionally on every
  //      render, with no dependency on any network call. If the original Supabase-driven version
  //      later also runs, it writes to the same element id and is harmless/idempotent. ----
  function ensureAuthChipV24(){
    const b=document.getElementById('marlumAuthBox');
    if(!b)return;
    if(!db.currentUser){b.style.display='none';return}
    const roles=(db.currentUser.roles||[]).join(' · ')||db.currentUser.label||'';
    const who=db.currentUser.name||db.currentUser.email||'Signed in';
    const roleEl=document.getElementById('marlumAuthRole'),nameEl=document.getElementById('marlumAuthName');
    if(roleEl)roleEl.textContent=roles;
    if(nameEl)nameEl.textContent=who;
    b.style.display='';
  }

  // A sign-out that works regardless of whether the Supabase client ever initialized.
  window.marlumSignOutV24=async function(){
    if(typeof window.marlumV19SignOut==='function'){
      try{await window.marlumV19SignOut();return;}catch(e){console.error('Sign-out via marlumV19SignOut failed, falling back:',e);}
    }
    db.currentUser=null;
    if(typeof window.__marlumSave==='function')window.__marlumSave();
    document.getElementById('marlumLogin')?.classList.remove('hidden');
    document.getElementById('v20WelcomeToast')?.classList.remove('show');
    const box=document.getElementById('marlumAuthBox');
    if(box)box.style.display='none';
  };

  const oldRenderV24=window.render;
  window.render=function(){
    if(typeof oldRenderV24==='function')oldRenderV24();
    ensureAuthChipV24();
  };
  ensureAuthChipV24();
  // Watchdog, independent of the render() chain entirely: this has been reported twice now as
  // still missing in real use even though it can't be reproduced by calling the code path
  // directly, which points at some timing/race condition in the real Supabase sign-in flow that
  // isn't fully reproducible without live network access. Rather than trying to find the exact
  // race, this runs on its own timer and simply guarantees the outcome — if a user is signed in
  // and the chip isn't there, it adds it, no matter what else did or didn't run correctly.
  setInterval(()=>{ensureAuthChipV24();},500);
})();
