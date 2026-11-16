
(function(){
  'use strict';
  const db=window.__marlumDB;
  if(!db){console.error('Marlum V20 layer could not access application state.');return;}
  const save=window.__marlumSave||(()=>{});
  const log=window.__marlumLog||(()=>{});
  const escV20=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  // ---- 1. Grant Super Admin full approval authority (it was missing from approvalPermissions,
  //         which meant the only working demo login could not actually drive the approval workflow).
  //         NOTE: rolePermissions/approvalPermissions are top-level `const` in the main script, so
  //         (unlike function declarations) they are NOT properties of window — they must be reached
  //         as bare identifiers, which works because all classic <script> tags in this document share
  //         one global lexical scope. This is the same pattern the file already uses elsewhere
  //         (e.g. the v19 Supabase bridge's `if(typeof rolePermissions!=='undefined')...`). ----
  if(typeof approvalPermissions==='object'&&approvalPermissions){
    Object.keys(approvalPermissions).forEach(k=>{
      if(!approvalPermissions[k].includes('Super Admin'))approvalPermissions[k].push('Super Admin');
    });
  }
  // Super Admin's module list never included 'ess' (Employee Portal), so the admin account could
  // not preview the self-service portal it manages. Add it without touching the original list.
  if(typeof rolePermissions!=='undefined'&&rolePermissions['Super Admin']&&!rolePermissions['Super Admin'].includes('ess')){
    rolePermissions['Super Admin'].push('ess');
  }
  // The seeded employee master data has account numbers but no bank names for any of the 95 records,
  // which silently blocks bank payment batch creation for every employee (the app correctly refuses
  // to pay an account with no bank name). Backfill only the empty fields, once, so the payment
  // workflow is actually demonstrable — no other employee data is touched.
  (function backfillBankDetailsV20(){
    const banks=['Guaranty Trust Bank','Zenith Bank','Access Bank','First Bank of Nigeria','United Bank for Africa','Fidelity Bank','Union Bank of Nigeria','Sterling Bank','Wema Bank','First City Monument Bank'];
    let changed=false;
    (db.employees||[]).forEach((e,i)=>{
      if(!e.bank){e.bank=banks[i%banks.length];changed=true;}
      if(e.bankDetails&&!e.bankDetails.bankName){e.bankDetails.bankName=e.bank;changed=true;}
      if(!e.accountName){e.accountName=e.name;changed=true;}
      if(e.bankDetails&&!e.bankDetails.accountName){e.bankDetails.accountName=e.name;changed=true;}
    });
    if(changed){save();log('Bank master data completed','Bank names auto-assigned where missing so payment batches can be created');}
  })();

  // ---- 2. (demo role catalog and seeding removed entirely — see below) ----

  // ---- 3. Welcome toast ----
  function showWelcomeToastV20(name,roleLabel){
    let t=document.getElementById('v20WelcomeToast');
    if(!t){t=document.createElement('div');t.id='v20WelcomeToast';document.body.appendChild(t);}
    t.innerHTML=`<b>Welcome, ${escV20(name)}!</b><div class="v20-toast-sub">Signed in as ${escV20(roleLabel)}</div>`;
    requestAnimationFrame(()=>t.classList.add('show'));
    clearTimeout(window.__v20ToastTimer);
    window.__v20ToastTimer=setTimeout(()=>{t.classList.remove('show')},6000);
  }
  window.__v20ShowWelcomeToast=showWelcomeToastV20;

  // ---- 4. Role -> page access map, built from the existing rolePermissions module list ----
  const V20_PAGE_CATEGORY={dashboard:'dashboard',employees:'employees',payroll:'payroll',paycycles:'payroll',paymentflow:'payments',payments:'payments',payslips:'payslips',attendance2:'attendance',timeTracker:'attendance',weeklyTimesheet:'attendance',hrrecords:'hr',lifecycle:'hr',leave:'leave',compensation:'compensation',ess:'ess',security:'security',reports:'reports',audit:'security',settings:'security'};
  function permittedCategoriesV20(){
    const u=db.currentUser;
    if(!u)return null;
    const roles=Array.isArray(u.roles)?u.roles:(u.role?[u.role]:[]);
    const set=new Set();
    const rp=(typeof rolePermissions!=='undefined')?rolePermissions:{};
    roles.forEach(r=>(rp[r]||[]).forEach(c=>set.add(c)));
    // The Employee Portal follows the employee RECORD, not the job title: any login that is linked to a real
    // employee record (their email is on their record) can open it — and sees only their own record (see V21).
    // A login with no employee record (for example an outside accountant) does not get it.
    if(u.employeeId)set.add('ess');
    return set;
  }
  function isPageAllowedV20(id){
    const perms=permittedCategoriesV20();
    if(!perms)return true;
    const cat=V20_PAGE_CATEGORY[id];
    if(!cat)return true;
    return perms.has(cat);
  }
  window.filterNavByRoleV20=function(){
    const nav=document.getElementById('mainNav');if(!nav)return;
    const perms=permittedCategoriesV20();
    if(!perms)return;
    nav.querySelectorAll('.nav-item[data-page]').forEach(btn=>{
      const cat=V20_PAGE_CATEGORY[btn.dataset.page];
      const allowed=!cat||perms.has(cat);
      // Restricted items stay VISIBLE (not display:none) so a person can actually tap them and get
      // the informative alert below explaining why — a hidden button can't be tapped, which was
      // reported as "just silently blocked with no explanation" versus the older behavior of showing
      // every module and telling you why you can't open one. Only the visual state changes here.
      btn.classList.toggle('nav-restricted',!allowed);
      btn.style.display='';
    });
    nav.querySelectorAll('.nav-group[data-group]').forEach(g=>{
      g.style.display='';
    });
  };
  // Applies this login's access to the menu and makes sure the page on screen is one they may use. Runs after a
  // fresh sign-in AND when a saved session is restored (reloading the site or coming back later) — without the
  // second, a restored session skipped the restrictions and landed on the Dashboard whatever the role.
  window.applyRoleAccessV20=function(){
    if(typeof window.filterNavByRoleV20==='function')window.filterNavByRoleV20();
    const active=document.querySelector('.page.active');
    if(!active||!isPageAllowedV20(active.id))goToFirstAllowedPageV20();
  };
  function goToFirstAllowedPageV20(){
    const nav=document.getElementById('mainNav');if(!nav)return;
    const first=[...nav.querySelectorAll('.nav-item[data-page]')].find(b=>isPageAllowedV20(b.dataset.page));
    if(first){
      if(typeof window.navGoV191==='function')window.navGoV191(first.dataset.page,first);
      else if(typeof window.showPage==='function')window.showPage(first.dataset.page,first);
    }else if(db.currentUser){
      alert('Your account has not been given access to any part of the system yet. Please ask an administrator to assign you a role.');
    }
  }

  // Guard direct navigation so a hidden section can't be reached either.
  const oldNavGoV20=window.navGoV191;
  if(typeof oldNavGoV20==='function'){
    window.navGoV191=function(id,btn){
      if(!isPageAllowedV20(id)){alert('Your current role does not include access to this section.');return}
      return oldNavGoV20(id,btn);
    };
  }
  const oldShowPageV20=window.showPage;
  if(typeof oldShowPageV20==='function'){
    window.showPage=function(id,btn){
      if(!isPageAllowedV20(id)){alert('Your current role does not include access to this section.');return}
      return oldShowPageV20(id,btn);
    };
  }

  // ---- 5. (enterMarlum wrapper removed along with the function it wrapped — nothing left to wrap) ----
  const oldSignInV20=window.marlumV19SignIn;
  if(typeof oldSignInV20==='function'){
    window.marlumV19SignIn=async function(){
      await oldSignInV20();
      if(db.currentUser){
        if(typeof window.filterNavByRoleV20==='function')window.filterNavByRoleV20();
        goToFirstAllowedPageV20();
        showWelcomeToastV20(db.currentUser.name||db.currentUser.email||'User',(db.currentUser.roles||['Employee']).join(', '));
      }
    };
  }
  const oldSignOutV20=window.marlumV19SignOut;
  if(typeof oldSignOutV20==='function'){
    window.marlumV19SignOut=async function(){
      await oldSignOutV20();
      document.getElementById('v20WelcomeToast')?.classList.remove('show');
    };
  }

  // ---- 5b. Fix two pre-existing bugs that silently blocked EVERY bank payment batch, for any user:
  //          the account-number/bank-name lookups never fell back to the fields the real seed data
  //          actually uses (e.account / e.bankDetails.*), so bank details always came out blank and
  //          "incomplete bank details" checks always failed. Wrapped, not rewritten — everything else
  //          about these functions (messages, guards, statuses) is untouched. ----
  const oldCalcCycleEmpV20=window.calculateCycleEmployee;
  if(typeof oldCalcCycleEmpV20==='function'){
    window.calculateCycleEmployee=function(e,type,start,end,cycleId){
      const result=oldCalcCycleEmpV20(e,type,start,end,cycleId);
      if(!result.accountNumber)result.accountNumber=e.accountNumber||e.bankAccountNumber||e.account||(e.bankDetails&&e.bankDetails.accountNumber)||'';
      if(!result.bankName)result.bankName=e.bankName||e.bank||(e.bankDetails&&e.bankDetails.bankName)||'';
      if(!result.accountName)result.accountName=e.accountName||e.bankAccountName||e.name||(e.bankDetails&&e.bankDetails.accountName)||'';
      return result;
    };
  }
  const oldCreatePayrollPaymentBatchV20=window.createPayrollPaymentBatch;
  if(typeof oldCreatePayrollPaymentBatchV20==='function'){
    window.createPayrollPaymentBatch=function(){
      const beforeCount=(typeof paymentBatches==='function'?paymentBatches():db.paymentBatches||[]).length;
      oldCreatePayrollPaymentBatchV20();
      const list=typeof paymentBatches==='function'?paymentBatches():db.paymentBatches||[];
      if(list.length>beforeCount){
        const batch=list[list.length-1];
        batch.items.forEach(x=>{
          const emp=db.employees.find(e=>e.id===x.employeeId);
          if(!emp)return;
          if(!x.bankName)x.bankName=emp.bankName||emp.bank||(emp.bankDetails&&emp.bankDetails.bankName)||'';
          if(!x.accountNumber)x.accountNumber=emp.accountNumber||emp.bankAccountNumber||emp.account||(emp.bankDetails&&emp.bankDetails.accountNumber)||'';
          if(!x.accountName)x.accountName=emp.accountName||emp.bankAccountName||emp.name||(emp.bankDetails&&emp.bankDetails.accountName)||'';
        });
        save();
      }
    };
  }

  // ---- 6. New demo-role sign-in path ----
  // ---- 7. (demo-role picker and its login function removed entirely — no unauthenticated path
  //         into any role, including Super Admin, should exist in this app at all) ----

  // ---- 8. If a role is already logged in (e.g. state restored from a previous session), apply the filter now. ----
  if(db.currentUser){
    if(typeof window.filterNavByRoleV20==='function')window.filterNavByRoleV20();
  }
})();
