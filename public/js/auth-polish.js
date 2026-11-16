
(function(){
  'use strict';
  const EYE_V29='<svg viewBox="0 0 24 24"><path d="M2.5 12C3.6 9 7 5 12 5s8.4 4 9.5 7c-1.1 3-4.5 7-9.5 7s-8.4-4-9.5-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF_V29='<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 5.2A9.6 9.6 0 0 1 12 5c5 0 8.5 4.2 9.5 7-.4 1-1.2 2.4-2.5 3.7M6.6 6.7C4.4 8.1 3 10.2 2.5 12c1 2.8 4.5 7 9.5 7 1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  window.togglePasswordVisibility=function(inputId,btn){
    const input=document.getElementById(inputId);
    if(!input||!btn)return;
    const showing=input.type==='text';
    input.type=showing?'password':'text';
    btn.innerHTML=showing?EYE_OFF_V29:EYE_V29;
    btn.setAttribute('aria-label',showing?'Show password':'Hide password');
  };

  // The demo-role login and its picker UI were removed entirely (not just hidden) — there is no
  // longer anything for a "remove the demo block" function to find or need to do.
})();
