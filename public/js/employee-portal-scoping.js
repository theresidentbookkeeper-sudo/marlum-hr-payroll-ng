
(function(){
  'use strict';
  const db=window.__marlumDB;
  if(!db){console.error('Marlum V21 layer could not access application state.');return;}
  const save=window.__marlumSave||(()=>{});
  const escV21=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // Only the roles that ADMINISTER the Employee Portal see the whole-company roster (portal access register,
  // "View Portal" for anyone). Everybody else who has portal access — including a controller or accountant
  // who is also a member of staff — sees only their OWN record.
  const PORTAL_ADMIN_ROLES=['Super Admin','HR Manager','MD / Approver'];
  function isPureEmployeeRoleV21(u){
    if(!u)return false;
    const roles=Array.isArray(u.roles)?u.roles:(u.role?[u.role]:[]);
    // own-record view for everyone with portal access except the administrators: a plain Employee login, or any
    // login (accountant, controller, ...) that is linked to a real employee record
    return (roles.includes('Employee')||!!u.employeeId)&&!roles.some(r=>PORTAL_ADMIN_ROLES.includes(r));
  }

  // ---- Scope the #ess page to exactly one employee when the signed-in account is a pure Employee role.
  //      IMPORTANT: the original page content is RELOCATED (not destroyed) into a hidden container
  //      outside #ess, because (a) the base render() function keeps updating elements like
  //      #essPayslips/#essRows by id on every render call — destroying them would crash later renders,
  //      getElementById still finds them fine wherever they live in the document; and (b) moving them
  //      OUT of #ess entirely (rather than just display:none inside it) means #ess's own textContent
  //      genuinely contains no other employee's data during an Employee session, not just visually
  //      hidden data sitting in the DOM. Admin/HR rendering is restored byte-for-byte when applicable. ----
  function ensureEssSplitV21(){
    const sec=document.getElementById('ess');
    if(!sec)return null;
    let vault=document.getElementById('v21EssVault');
    if(!vault){
      vault=document.createElement('div');
      vault.id='v21EssVault';
      vault.style.display='none';
      document.body.appendChild(vault);
    }
    let origWrap=document.getElementById('v21EssOriginalWrap');
    if(!origWrap){
      origWrap=document.createElement('div');
      origWrap.id='v21EssOriginalWrap';
      while(sec.firstChild)origWrap.appendChild(sec.firstChild);
      sec.appendChild(origWrap);
    }
    let ownWrap=document.getElementById('v21OwnPortalContainer');
    if(!ownWrap){
      ownWrap=document.createElement('div');
      ownWrap.id='v21OwnPortalContainer';
      ownWrap.style.display='none';
      vault.appendChild(ownWrap);
    }
    return {sec,vault,origWrap,ownWrap};
  }
  function renderOwnPortalV21(){
    const refs=ensureEssSplitV21();
    if(!refs)return;
    const {sec,vault,origWrap,ownWrap}=refs;
    const u=db.currentUser;
    if(!isPureEmployeeRoleV21(u)){
      if(origWrap.parentNode!==sec)sec.appendChild(origWrap);
      origWrap.style.display='';
      if(ownWrap.parentNode!==vault)vault.appendChild(ownWrap);
      ownWrap.innerHTML='';
      return; // admin/HR view: original full roster, restored exactly, completely untouched
    }
    if(origWrap.parentNode!==vault)vault.appendChild(origWrap); // relocated OUT of #ess entirely
    if(ownWrap.parentNode!==sec)sec.appendChild(ownWrap);
    ownWrap.style.display='';
    if(!u.employeeId){
      ownWrap.innerHTML=u.demo
        ?'<h2>My Employee Portal</h2><div class="notice">This demo account is not yet linked to a specific employee record. Sign out and choose an employee when selecting the Employee demo role.</div>'
        :`<h2>My Employee Portal</h2><div class="notice">Your account (${esc(u.email||u.username||'')}) is not yet linked to an employee record. Ask an administrator to add this email address to your employee profile in Employee Management, then sign out and back in.</div>`;
      return;
    }
    const emp=db.employees.find(x=>x.id===u.employeeId);
    if(!emp){
      ownWrap.innerHTML='<h2>My Employee Portal</h2><div class="notice">Linked employee record was not found.</div>';
      return;
    }
    if(typeof window.showEmployeePortal!=='function')return;
    const realOpenModal=window.openModal;
    let captured='';
    window.openModal=function(html){captured=html;};
    try{window.showEmployeePortal(emp.id);}catch(e){console.error('V21 portal capture error:',e);}
    window.openModal=realOpenModal;
    if(!captured)return;
    captured=captured.replace(/<button[^>]*onclick="closeModal\(\)"[^>]*>\s*Close Portal\s*<\/button>/,'');
    ownWrap.innerHTML=`<h2>My Employee Portal</h2>
      <div class="notice v21-own-portal-notice">You are signed in as <b>${escV21(emp.name)}</b> (${escV21(emp.id)}). This view shows only your own records.</div>
      ${captured}`;
  }

  const oldRenderV21=window.render;
  window.render=function(){
    if(typeof oldRenderV21==='function')oldRenderV21();
    renderOwnPortalV21();
  };
  window.__v21RenderOwnPortal=renderOwnPortalV21;

  // ---- (employee picker for the demo-role login, and the override linking its choice onto
  //      db.currentUser, removed along with the demo-role login itself) ----

  if(db.currentUser)renderOwnPortalV21();
})();
