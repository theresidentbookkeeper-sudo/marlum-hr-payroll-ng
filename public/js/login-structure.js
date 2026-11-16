
(function(){
  'use strict';
  // ---- Fixes a real bug: the previous placement logic walked card.querySelector('.login-mark')
  //      .nextSibling repeatedly checking nodeName==='H1'||'P', but the template literal HTML has
  //      whitespace TEXT nodes between tags, so it hit a "#text" node first and stopped immediately —
  //      landing the Full Access block ABOVE the brand title instead of below it (visible in the
  //      screenshot: button appears before "Marlum HR & Payroll"). nextElementSibling skips text
  //      nodes entirely and is the correct, robust way to walk actual elements.
  //
  //      This function is written to be safe to call repeatedly (each part is either idempotent or
  //      individually guarded), because v20/v22's own elements can appear on their own timing and
  //      this needs to keep re-checking rather than finalize too early and miss a late arrival. ----
  function organizeLoginCardV25(){
    const card=document.querySelector('#marlumLogin .login-card');
    if(!card)return false;

    if(!card.dataset.v25IntroTagged){
      const h1=card.querySelector('h1');
      const intro=h1&&h1.nextElementSibling&&h1.nextElementSibling.tagName==='P'?h1.nextElementSibling:null;
      if(intro){intro.classList.add('login-intro');card.dataset.v25IntroTagged='1';}
    }

    // One-time-only: group the plain sign-in/sign-up controls (present only in files that still have
    // this section — e.g. index.html, not the two-option fulladmin build) into one visually distinct
    // primary section. Guarded because moving nodes into a freshly created wrapper is not naturally
    // idempotent — re-running it would create extra empty wrappers. Matches the button by id first
    // (current real-auth build), falling back to the old onclick text (older builds of this file),
    // and sweeps every field this section can contain — not just a fixed set of four — so adding a
    // field here later doesn't silently leave it stranded outside the styled box again.
    if(!card.dataset.v25PrimaryWrapped&&!document.getElementById('marlum-v23-two-options-only')){
      const userField=document.getElementById('loginUser');
      const passField=document.getElementById('loginPass');
      const plainBtn=document.getElementById('authPrimaryBtn')||[...card.querySelectorAll('button.login-btn')].find(b=>b.getAttribute('onclick')==='enterMarlum()');
      if(userField&&passField&&plainBtn){
        const userLabel=userField.closest('label');
        const passLabel=passField.closest('label');
        if(userLabel&&passLabel){
          const section=document.createElement('div');
          section.className='login-section primary';
          userLabel.parentElement.insertBefore(section,userLabel);
          const nameLabel=document.getElementById('authFullName')?.closest('label');
          const confirmLabel=document.getElementById('authConfirmPass')?.closest('label');
          const statusEl=document.getElementById('marlumAuthStatus');
          const linksEl=document.getElementById('authForgotLink')?.closest('.auth-links');
          const noteEl=document.getElementById('authNote')||(plainBtn.nextElementSibling&&plainBtn.nextElementSibling.classList.contains('login-note')?plainBtn.nextElementSibling:null);
          [nameLabel,userLabel,passLabel,confirmLabel,linksEl,statusEl,plainBtn,noteEl].forEach(el=>{if(el)section.appendChild(el)});
          card.dataset.v25PrimaryWrapped='1';
        }
      }
    }

    // (the v22 "Full Access" block and the v20 demo-role block this used to reposition/tag never
    // existed in this file's actual HTML, or were removed entirely along with the demo-role login —
    // both lookups always found nothing and safely did nothing; removed rather than left as dead
    // lookups for something that can never exist)

    return true;
  }
  let v25Tries=0;
  const v25Timer=setInterval(()=>{
    v25Tries++;
    organizeLoginCardV25();
    if(v25Tries>60)clearInterval(v25Timer);
  },150);
})();
