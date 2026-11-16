
(function(){
  'use strict';
  const SB_URL='https://jcitdknjhfvkgfuyvywt.supabase.co';
  const SB_KEY='sb_publishable_srJiZ3A91DCMq4RGNQOUGg_3_xQ30PY';
  const STATE_ID='main';
  // What this session last knew the server to hold: the server's own updated_at timestamp, and a copy of the
  // state as of that moment. Compared against on every save, so a save can tell whether anyone else has saved
  // in between — and if so, merge instead of blindly overwriting whatever they added.
  let lastKnownRemoteUpdatedAt=null,lastSyncedSnapshot=null;
  function noteRemoteBaseline(updatedAt){lastKnownRemoteUpdatedAt=updatedAt||null;lastSyncedSnapshot=JSON.parse(JSON.stringify(cleanState()))}
  // Combines two versions of one shared record list (for example payroll cycles, attendance records, weekly
  // timesheet entries) so that a record added by someone else, which this browser never had a chance to load,
  // is kept rather than silently erased by an older copy being saved over it. Records are matched by id; where
  // the same id exists in both and this session actually changed it (it differs from what this session last
  // knew the server to hold), this session's version wins — otherwise the freshest server version wins.
  function mergeRecordList(remoteList,localList,baselineList){
    if(!Array.isArray(remoteList)||!Array.isArray(localList))return Array.isArray(localList)?localList:remoteList;
    if(!localList.every(x=>x&&typeof x==='object'&&'id' in x)||!remoteList.every(x=>x&&typeof x==='object'&&'id' in x))return localList;
    const baseline={};(baselineList||[]).forEach(x=>{if(x&&x.id!=null)baseline[x.id]=x});
    const out=new Map();
    // A record this session knew about (it is in the baseline) and has since removed on purpose — for example a
    // payroll cycle deleted with its Delete button — must stay removed. Without this, every record still held by
    // the server was copied back in, so any deletion made after someone else (or a database edit) had saved in
    // between came straight back on the next save and after a refresh. A record is only dropped when the server's
    // copy is exactly what this session last saw; if someone else has changed it since, it is kept.
    const localIds=new Set();localList.forEach(x=>{if(x&&x.id!=null)localIds.add(x.id)});
    remoteList.forEach(x=>{
      if(!x||x.id==null)return;
      const wasKnown=baseline[x.id]!==undefined;
      if(wasKnown&&!localIds.has(x.id)&&JSON.stringify(x)===JSON.stringify(baseline[x.id]))return;
      out.set(x.id,x);
    });
    localList.forEach(x=>{
      if(x==null||x.id==null)return;
      const changedHere=JSON.stringify(x)!==JSON.stringify(baseline[x.id]||null);
      if(changedHere||!out.has(x.id))out.set(x.id,x);
    });
    return Array.from(out.values());
  }
  // Builds what to actually save when someone else has saved since this session last loaded: start from the
  // freshest server copy, then bring in only what THIS session actually changed, merging list-shaped fields
  // record-by-record rather than replacing the whole list.
  function mergeForSync(remoteState){
    const merged=JSON.parse(JSON.stringify(remoteState||{}));
    const local=cleanState(),baseline=lastSyncedSnapshot||{};
    Object.keys(local).forEach(key=>{
      const changed=JSON.stringify(local[key])!==JSON.stringify(baseline[key]!==undefined?baseline[key]:null);
      if(!changed)return; // this session never touched this part of the data — leave the fresher server copy alone
      if(Array.isArray(local[key])&&Array.isArray(merged[key]))merged[key]=mergeRecordList(merged[key],local[key],baseline[key]);
      else merged[key]=local[key];
    });
    return merged;
  }
  // Captured immediately, before the sign-in library removes it from the address: was this page opened
  // from an invite / password-reset link? (and did that link fail?)
  const ARRIVED_FROM_LINK=/[#&?]type=(recovery|invite|magiclink)\b/.test(location.hash+location.search);
  // Invitation links made by a Super Admin carry their one-time token after the # (never sent to any server).
  // It is only USED when the person taps Continue, so a chat app's link-preview robot cannot spend it.
  const INVITE_TOKEN=(()=>{const m=location.hash.match(/[#&]marlum_invite=([^&]+)/);return m?decodeURIComponent(m[1]):''})();
  if(INVITE_TOKEN){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}}
  const LINK_ERROR=(()=>{const m=(location.hash+'&'+location.search).match(/error_description=([^&]+)/);return m?decodeURIComponent(m[1].replace(/\+/g,' ')):''})();
  let sb=null, syncing=false, ready=false, saveTimer=null, remoteLoadConfirmed=false;
  const db=window.__marlumDB;
  const nativeSetItem=window.localStorage.setItem.bind(window.localStorage);
  const nativeRemoveItem=window.localStorage.removeItem.bind(window.localStorage);
  if(!db)return;

  function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function status(msg,error){
    const el=document.getElementById('marlumAuthStatus');
    if(el){el.textContent=msg;el.style.display='block';el.style.background=error?'#fff0f0':'#f4f8f5';el.style.color=error?'#8c2626':'#315244'}
  }
  function cleanState(){
    const x=JSON.parse(JSON.stringify(window.__marlumDB||db));
    delete x.currentUser;
    return x;
  }
  function scheduleSync(){
    // Never push local state to Supabase until a successful pull FROM Supabase has happened in
    // this session. Without this guard, any silent failure on the initial load (a network hiccup,
    // a session/RLS timing issue, anything that leaves loadState() with no remote row to apply)
    // would leave db at its local/seed value — and this scheduler would then dutifully overwrite
    // the real, live data in Supabase with that stale local snapshot a moment later. This is the
    // most plausible mechanism for "my changes get wiped" complaints that don't trace to a specific
    // button: a confirmed pull is required before any push is ever allowed.
    if(!ready||!remoteLoadConfirmed)return;
    pendingUnsaved=true;
    updateSyncStatusUI('pending');
    if(syncing)return; // a sync is already in flight; it will pick up this change or scheduleSync will be called again after it finishes
    clearTimeout(saveTimer);
    saveTimer=setTimeout(()=>syncState(0),700);
  }
  let pendingUnsaved=false, syncRetryTimer=null, lastSyncError=null;
  function updateSyncStatusUI(state){
    const el=document.getElementById('syncStatus');
    if(!el)return;
    el.style.display='inline-block';
    if(state==='pending'){el.textContent='Saving…';el.style.background='#fff3cd';el.style.color='#7a5b00';el.onclick=null;el.title='Your changes are being saved to the live database.'}
    else if(state==='saved'){el.textContent='All changes saved';el.style.background='#e6f4ea';el.style.color='#1a7a3c';el.onclick=null;el.title='Everything is up to date in the live database.';setTimeout(()=>{if(el.textContent==='All changes saved')el.style.display='none'},4000)}
    else if(state==='failed'){el.textContent='⚠ NOT SAVED — click to retry now';el.style.background='#fbe6e6';el.style.color='#a3231b';el.style.cursor='pointer';el.title=lastSyncError?`Last error: ${lastSyncError}. Your recent changes exist only in this browser tab until this is resolved — do not close this tab or switch devices yet.`:'Your recent changes exist only in this browser tab until this is resolved.';el.onclick=()=>{clearTimeout(syncRetryTimer);syncState(0)}}
  }
  // If this tab is about to be hidden or closed with unsaved changes, make one last synchronous-ish
  // attempt rather than silently losing whatever hasn't synced yet — the normal 700ms debounce may
  // never get the chance to fire if the tab closes first.
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&pendingUnsaved&&ready&&remoteLoadConfirmed)syncState(0)});
  window.addEventListener('beforeunload',(e)=>{if(pendingUnsaved){syncState(0);e.preventDefault();e.returnValue=''}});
  // Quietly checks whether someone else has saved since this screen last loaded, and if so — and nobody is
  // in the middle of typing or has unsaved changes of their own — pulls the update in automatically. This is
  // what lets one person's entry (for example a timesheet) show up on someone else's already-open screen
  // without them needing to know to refresh the page.
  async function pollForRemoteUpdates(){
    if(!sb||!ready||!remoteLoadConfirmed||pendingUnsaved||syncing||window.__marlumEmployeeScoped)return;
    const modalOpen=document.getElementById('modal')&&document.getElementById('modal').classList.contains('show');
    const typing=document.activeElement&&['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName);
    if(modalOpen||typing)return;
    try{
      const {data,error}=await sb.from('marlum_app_state').select('updated_at').eq('id',STATE_ID).maybeSingle();
      if(error||!data||!data.updated_at||data.updated_at===lastKnownRemoteUpdatedAt)return;
      await loadState();
      if(typeof window.render==='function')window.render();
    }catch(e){/* a transient failure here just means we try again on the next tick */}
  }
  setInterval(pollForRemoteUpdates,25000);
  // Exposed so code outside this closure (the sign-out tracking added later in the file) can force an
  // immediate save and actually wait for it to land, instead of guessing how long the normal 700ms
  // debounce might take — needed so a "Signed out" entry reliably reaches the server before the page
  // reloads and the chance to save anything is gone.
  window.__marlumFlushSync=function(){clearTimeout(saveTimer);return syncState(0)};
  async function syncState(retryCount){
    retryCount=retryCount||0;
    if(!sb||!ready||!remoteLoadConfirmed)return;
    if(syncing)return; // an attempt is already running; whatever triggered this will be covered once it finishes (pendingUnsaved stays true until a successful save)
    syncing=true;
    clearTimeout(syncRetryTimer);
    try{
      let {data:{user}}=await sb.auth.getUser();
      if(!user){
        // The cached session looks empty — this is exactly what happens after a token quietly
        // expires while the tab sat in the background (overnight, another tab in focus, laptop
        // asleep). Try an explicit refresh before giving up; supabase-js's automatic background
        // refresh can miss this if the tab's timers were throttled while inactive.
        try{
          const {data:refreshed}=await sb.auth.refreshSession();
          user=refreshed&&refreshed.user;
        }catch(refreshErr){/* fall through to the no-user handling below */}
      }
      if(!user){
        lastSyncError='Not signed in (session could not be refreshed)';
        throw new Error(lastSyncError);
      }
      // Check what the server actually holds right now, not just what this session loaded a while ago — someone
      // else may have saved in between (this is the fix for changes from one person silently disappearing when
      // another person saves afterwards from an older copy).
      const {data:cur,error:curErr}=await sb.from('marlum_app_state').select('state,updated_at').eq('id',STATE_ID).maybeSingle();
      if(curErr)throw curErr;
      const conflict=cur&&cur.updated_at&&cur.updated_at!==lastKnownRemoteUpdatedAt;
      const toSave=conflict?mergeForSync(cur.state):cleanState();
      const newUpdatedAt=new Date().toISOString();
      const {error}=await sb.from('marlum_app_state').upsert({id:STATE_ID,state:toSave,updated_by:user.id,updated_at:newUpdatedAt},{onConflict:'id'});
      if(error)throw error;
      if(conflict){
        // Adopt the merged result locally too, so this session's own screen matches what was actually saved
        // (including whatever the other person added) rather than silently drifting from it.
        const preservedCurrentUser=db.currentUser;
        Object.keys(db).forEach(k=>delete db[k]);
        Object.assign(db,toSave);
        db.currentUser=preservedCurrentUser;
        if(typeof window.render==='function')window.render();
      }
      noteRemoteBaseline(newUpdatedAt);
      pendingUnsaved=false;
      lastSyncError=null;
      updateSyncStatusUI('saved');
    }catch(e){
      lastSyncError=e.message||String(e);
      console.warn('Marlum Supabase state sync failed:',lastSyncError);
      updateSyncStatusUI('failed');
      // Keep retrying on a backoff as long as there's something unsaved, rather than giving up
      // after one attempt — a save failure here means real work sitting only in this browser tab.
      if(pendingUnsaved){
        const delay=Math.min(60000,5000*Math.pow(2,Math.min(retryCount,4)));
        syncRetryTimer=setTimeout(()=>syncState(retryCount+1),delay);
      }
    }finally{
      syncing=false;
    }
  }
  const PRIVILEGED_ROLE_CODES=['super_admin','md_approver','accountant','financial_controller','hr'];
  window.__marlumEmployeeScoped=false;
  // Employees never receive the shared company data. The database itself decides what they get:
  // get_my_portal_state() returns only the caller's own record, loans, requests, attendance and
  // their own payslip lines. remoteLoadConfirmed is deliberately left false so an employee session
  // can never write anything back to the shared data.
  async function loadEmployeeScopedState(){
    const {data,error}=await sb.rpc('get_my_portal_state');
    if(error)throw error;
    const cu=db.currentUser;
    const keys=['employees','loans','deductions','employeeRequests','attendanceRecords','timeTrackerRecords','payrollCycles'];
    keys.forEach(k=>{db[k]=[]});
    if(data&&data.linked){
      keys.forEach(k=>{if(Array.isArray(data[k]))db[k]=data[k]});
      if(data.settings&&data.settings.companyName){db.settings=db.settings||{};db.settings.companyName=data.settings.companyName}
      if(cu)cu.employeeId=data.employeeId;
    }else if(cu){delete cu.employeeId}
    db.currentUser=cu;
    window.__marlumEmployeeScoped=true;
  }
  async function loadState(){
    const roleIds=(db.currentUser&&db.currentUser.roleIds)||[];
    if(!roleIds.some(r=>PRIVILEGED_ROLE_CODES.includes(r)))return loadEmployeeScopedState();
    window.__marlumEmployeeScoped=false;
    const {data,error}=await sb.from('marlum_app_state').select('state,updated_at,updated_by').eq('id',STATE_ID).maybeSingle();
    if(error)throw error;
    if(data&&data.state&&typeof data.state==='object'){
      const remote=data.state;
      // currentUser is session-specific — set by identity() right before this runs — and is never
      // part of the shared, saved state (it should never be saved there, or one person's session
      // would leak into everyone else's). Wiping every key on db and replacing it with the remote
      // state was silently deleting it every single sign-in, moments after it was set: the app then
      // had no idea who was signed in, which is what caused the sign-out button to correctly (given
      // that broken state) hide itself, and — far more seriously — caused every role/permission
      // check that falls back to a permissive default when it can't identify the user to do exactly
      // that, for every single person who ever signed in.
      const preservedCurrentUser=db.currentUser;
      Object.keys(db).forEach(k=>delete db[k]);
      Object.assign(db,remote);
      db.currentUser=preservedCurrentUser;
      if(db.currentUser){const m=(db.employees||[]).find(e=>e.email&&String(e.email).trim().toLowerCase()===String(db.currentUser.email||'').toLowerCase());if(m)db.currentUser.employeeId=m.id}
      remoteLoadConfirmed=true;
      noteRemoteBaseline(data.updated_at);
    }else{
      // No row came back at all — this could mean a genuinely empty database, but it could just as
      // easily mean a transient read failure that didn't surface as an explicit error (a stale
      // session token, an RLS check that silently returned nothing). Since we can't tell which,
      // the safe choice is to NOT confirm the load: this blocks scheduleSync from ever pushing the
      // local/seed state over whatever is actually in Supabase, and surfaces it instead of
      // silently proceeding as if everything loaded normally. Uses the same persistent header
      // indicator as save failures — the old status() banner only shows on the login screen, so it
      // would never be seen once the person is already signed in and working.
      console.warn('Marlum Supabase state load: no remote state row was returned. Live data will not be overwritten by local state until this is resolved — reload the page, and if this persists, check your connection or contact support before making changes.');
      lastSyncError='Could not load your live data (no data came back from the database)';
      updateSyncStatusUI('failed');
    }
  }
  function buildLogin(){
    if(document.getElementById('marlumLogin'))return;
    const wrap=document.createElement('div');wrap.id='marlumLogin';wrap.className='marlum-login';
    wrap.innerHTML=`<div class="login-card"><div class="login-mark">M</div><h1>Marlum HR & Payroll</h1><p>Secure workforce, payroll and payment control centre</p><label>Email<input id="loginUser" type="email" placeholder="name@company.com" autocomplete="username"></label><label>Password<input id="loginPass" type="password" placeholder="Enter your password" autocomplete="current-password"></label><button class="login-btn" id="marlumSignInBtn" type="button">Sign in</button><p id="marlumAuthStatus" class="marlum-auth-status" style="display:none"></p><p class="login-note">Use your authorised company email and password.</p></div>`;
    document.body.prepend(wrap);
    const pass=wrap.querySelector('#loginPass');
    pass.addEventListener('keydown',e=>{if(e.key==='Enter')window.marlumV19SignIn()});
    wrap.querySelector('#marlumSignInBtn').onclick=window.marlumV19SignIn;
  }
  function hideLogin(){document.getElementById('marlumLogin')?.classList.add('hidden')}
  function showLogin(){buildLogin();document.getElementById('marlumLogin')?.classList.remove('hidden')}
  function setUser(user,roles){
    const names={super_admin:'Super Admin',md_approver:'MD / Approver',accountant:'Accountant',financial_controller:'Financial Controller',hr:'HR Manager',employee:'Employee'};
    db.currentUser={id:user.id,email:user.email,username:user.email,name:user.user_metadata?.full_name||user.email,roleIds:roles.map(r=>r.code),roles:roles.map(r=>names[r.code]||r.name),signedInAt:new Date().toISOString()};
    // Link this real account to its employee record by matching email addresses, so the Employee
    // Portal shows this person's own data instead of a "not linked" message. This only works once
    // HR has entered the employee's email address on their employee record (Employee Management).
    const matchedEmployee=(db.employees||[]).find(e=>e.email&&String(e.email).trim().toLowerCase()===String(user.email||'').toLowerCase());
    if(matchedEmployee)db.currentUser.employeeId=matchedEmployee.id;
  }
  async function identity(){
    const {data:{user},error}=await sb.auth.getUser();
    if(error||!user)return null;
    const {data:rows,error:roleErr}=await sb.from('user_roles').select('roles(code,name)').eq('user_id',user.id);
    if(roleErr)throw roleErr;
    const roles=(rows||[]).map(x=>x.roles).filter(Boolean);
    // NOTE: a login gets exactly the roles an administrator assigned in the database — nothing is added here.
    // This used to add 'Employee' to every login except Super Admin, which quietly opened the Employee Portal
    // (with its full company roster) to every accountant, controller and manager.
    setUser(user,roles);
    return user;
  }
  window.marlumV19SignIn=async function(){
    if(!sb){status('Authentication service is not ready yet. Please wait a moment and try again.',true);return}
    const email=document.getElementById('loginUser')?.value.trim();
    const password=document.getElementById('loginPass')?.value||'';
    if(!email||!password){status('Enter your email and password.',true);return}
    status('Signing in…');
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error){status(error.code==='email_not_confirmed'?'Please confirm your email address first — check your inbox for the confirmation link.':error.message,true);return}
    if(document.getElementById('authRemember')?.checked)nativeSetItem('marlum_last_email',email);else nativeRemoveItem('marlum_last_email'); // remembers the email address only, never the password
    try{
      await identity();
      await loadState();
      ready=true;
      hideLogin();
      if(typeof window.render==='function')window.render();
      status('Signed in successfully.');
    }catch(e){status('Signed in, but the secure data service could not be loaded: '+e.message,true);await sb.auth.signOut()}
  };
  // Self-signup has been removed entirely (login link, extra form fields, signUp call and the
  // mode toggle). Nobody can register themselves: accounts are created only by a Super Admin, from
  // Users & Security, through the admin-users server function. Unknown emails simply cannot sign in.
  window.marlumAuthSubmit=function(){return window.marlumV19SignIn();};
  window.marlumV19SignOut=async function(){
    ready=false;db.currentUser=null;
    try{await sb.auth.signOut()}catch(e){}
    showLogin();
    try{location.reload()}catch(e){} // nothing is stored on the device, so a reload leaves no data behind
  };
  window.marlumV19ResetPassword=async function(){
    if(!sb){status('Authentication service is not ready yet. Please wait a moment and try again.',true);return}
    const email=document.getElementById('loginUser')?.value.trim();if(!email){status('Enter your email first.',true);return}
    const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin});status(error?'Could not send reset email: '+error.message:'Password reset email sent. Check your inbox.',!!error)
  };
  const EYE_OFF_SVG='<svg viewBox="0 0 24 24"><path d="M3 3l18 18"/><path d="M10.6 5.2A9.6 9.6 0 0 1 12 5c5 0 8.5 4.2 9.5 7-.4 1-1.2 2.4-2.5 3.7M6.6 6.7C4.4 8.1 3 10.2 2.5 12c1 2.8 4.5 7 9.5 7 1.6 0 3-.4 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  function buildInviteScreen(){
    if(document.getElementById('marlumInvite'))return;
    const el=document.createElement('div');el.id='marlumInvite';el.className='marlum-login hidden';
    el.innerHTML=`<div class="marlum-login-formside" style="flex:1 1 100%"><div class="login-card">
      <div class="marlum-login-lockup"><div class="login-mark">M</div><span class="login-lockup-rule"></span><div class="login-lockup-text"><b>Marlum</b><span>HR &amp; Payroll</span></div></div>
      <h1>You're invited</h1><p class="login-intro">Welcome to Marlum HR &amp; Payroll. Tap Continue to set up your account and choose your own password.</p>
      <div class="login-section primary">
        <p id="invStatus" class="marlum-setpw-msg" style="display:none"></p>
        <button class="login-btn" id="invContinue" type="button" onclick="marlumAcceptInvite()">Continue</button>
        <div class="auth-links" style="justify-content:center"><a href="javascript:void(0)" onclick="marlumInviteToLogin()">Go to sign in instead</a></div>
      </div></div></div>`;
    document.body.appendChild(el);
  }
  function invMessage(text,isError){const m=document.getElementById('invStatus');if(!m)return;m.style.display=text?'block':'none';m.textContent=text||'';m.style.background=isError?'#fff0ef':'#e8f5ec';m.style.color=isError?'#a33c34':'#1e6b3c'}
  window.marlumInviteToLogin=function(){document.getElementById('marlumInvite')?.classList.add('hidden');showLogin()};
  window.marlumAcceptInvite=async function(){
    const btn=document.getElementById('invContinue');
    if(!sb||!INVITE_TOKEN){invMessage('The sign-in service is not ready yet. Please wait a moment and try again.',true);return}
    btn.disabled=true;invMessage('Setting things up…');
    try{await sb.auth.signOut({scope:'local'})}catch(e){}   // leave any earlier session on this device behind
    const {data,error}=await sb.auth.verifyOtp({token_hash:INVITE_TOKEN,type:'recovery'});
    if(error||!data||!data.session){
      btn.disabled=false;
      invMessage('This invitation link is no longer valid — it may have expired or already been used. Ask your administrator to send you a new one.',true);
      return;
    }
    try{
      await identity();await loadState();ready=true;hideLogin();
      document.getElementById('marlumInvite').classList.add('hidden');
      if(typeof window.render==='function')window.render();
      if(typeof window.applyRoleAccessV20==='function')window.applyRoleAccessV20();
      window.marlumShowSetPassword('link');
    }catch(e){btn.disabled=false;invMessage('Signed in, but the secure data service could not be loaded: '+e.message,true)}
  };
  function buildSetPassword(){
    if(document.getElementById('marlumSetPassword'))return;
    const el=document.createElement('div');el.id='marlumSetPassword';el.className='marlum-login hidden';
    el.innerHTML=`<div class="marlum-login-formside" style="flex:1 1 100%"><div class="login-card">
      <div class="marlum-login-lockup"><div class="login-mark">M</div><span class="login-lockup-rule"></span><div class="login-lockup-text"><b>Marlum</b><span>HR &amp; Payroll</span></div></div>
      <h1 id="spTitle">Choose your password</h1><p class="login-intro" id="spIntro"></p>
      <div class="login-section primary">
        <label><span class="sr-only">New password</span><div class="password-wrap"><input id="spPass" type="password" placeholder="New password (at least 8 characters)" autocomplete="new-password"><button type="button" class="password-toggle" onclick="togglePasswordVisibility('spPass',this)" aria-label="Show password">${EYE_OFF_SVG}</button></div></label>
        <label><span class="sr-only">Confirm new password</span><input id="spConfirm" type="password" placeholder="Confirm new password" autocomplete="new-password"></label>
        <p id="spStatus" class="marlum-setpw-msg" style="display:none"></p>
        <button class="login-btn" id="spSave" type="button" onclick="marlumSavePassword()">Save password</button>
        <div class="auth-links" id="spCancelRow" style="display:none;justify-content:center"><a href="javascript:void(0)" onclick="marlumCloseSetPassword()">Cancel</a></div>
      </div></div></div>`;
    document.body.appendChild(el);
    el.querySelector('#spConfirm').addEventListener('keydown',e=>{if(e.key==='Enter')window.marlumSavePassword()});
  }
  function spMessage(text,isError){const m=document.getElementById('spStatus');if(!m)return;m.style.display=text?'block':'none';m.textContent=text||'';m.style.background=isError?'#fff0ef':'#e8f5ec';m.style.color=isError?'#a33c34':'#1e6b3c'}
  // 'link' = arrived from an invite / reset link (must choose a password); 'change' = signed-in user changing theirs
  window.marlumShowSetPassword=function(mode){
    buildSetPassword();
    const forced=mode!=='change';
    document.getElementById('spTitle').textContent=forced?'Choose your password':'Change your password';
    document.getElementById('spIntro').textContent=forced?'You are signed in with a one-time link. Choose a password to use from now on.':'Choose a new password for your account.';
    document.getElementById('spCancelRow').style.display=forced?'none':'flex';
    document.getElementById('spPass').value='';document.getElementById('spConfirm').value='';spMessage('');
    document.getElementById('spSave').disabled=false;
    document.getElementById('marlumSetPassword').classList.remove('hidden');
    setTimeout(()=>document.getElementById('spPass')?.focus(),50);
  };
  window.marlumCloseSetPassword=function(){document.getElementById('marlumSetPassword')?.classList.add('hidden')};
  window.marlumSavePassword=async function(){
    const p=document.getElementById('spPass')?.value||'',c=document.getElementById('spConfirm')?.value||'';
    if(p.length<8){spMessage('Choose a password with at least 8 characters.',true);return}
    if(p!==c){spMessage('The two passwords do not match.',true);return}
    if(!sb){spMessage('The sign-in service is not ready yet. Please wait a moment and try again.',true);return}
    const btn=document.getElementById('spSave');btn.disabled=true;spMessage('Saving…');
    const {error}=await sb.auth.updateUser({password:p});
    if(error){btn.disabled=false;spMessage(error.message||'Could not save the password.',true);return}
    try{history.replaceState(null,'',location.pathname)}catch(e){}
    spMessage('Password saved. Use it the next time you sign in.');
    setTimeout(window.marlumCloseSetPassword,1200);
  };
  async function boot(){
    try{
      sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      window.marlumSupabase=sb;
      buildLogin();
      const last=localStorage.getItem('marlum_last_email');if(last){document.getElementById('loginUser').value=last;const rc=document.getElementById('authRemember');if(rc)rc.checked=true}
      let session=null;
      if(INVITE_TOKEN){buildInviteScreen();document.getElementById('marlumInvite').classList.remove('hidden')}   // do not restore or touch any session until the person taps Continue
      else{session=(await sb.auth.getSession()).data.session}
      if(INVITE_TOKEN){/* waiting for the person to tap Continue */}
      else if(session){
        await identity();await loadState();ready=true;hideLogin();if(typeof window.render==='function')window.render();
        if(typeof window.applyRoleAccessV20==='function')window.applyRoleAccessV20();
        if(ARRIVED_FROM_LINK)window.marlumShowSetPassword('link');
      }else{showLogin();if(LINK_ERROR){status('That link is no longer valid — it may have expired or already been used. Ask your administrator to send you a new one.',true);try{history.replaceState(null,'',location.pathname)}catch(e){}}}
      sb.auth.onAuthStateChange((event,session)=>{
        if(event==='SIGNED_OUT'){ready=false;db.currentUser=null;showLogin();}
      });
      window.__marlumOnSave=scheduleSync; // save() now only schedules a cloud sync; nothing is written to this device
      const oldRender=window.render;
      window.render=function(){if(typeof oldRender==='function')oldRender();/* #marlumAuthBox is now owned entirely by ensureAuthChipV24() and its watchdogs below — this used to also rebuild it via innerHTML on every render, which destroyed the static #marlumAuthRole/#marlumAuthName spans and replaced the sign-out button with one pointing at the older marlumV19SignOut instead of the more robust marlumSignOutV24. Removed rather than left to run redundantly alongside the newer fix. */};
      scheduleSync();
    }catch(e){console.error(e);showLogin();status('Authentication service could not be initialized: '+e.message,true)}
  }
  const style=document.createElement('style');style.textContent='.marlum-auth-status{font-size:12px!important;line-height:1.5;margin-top:12px!important;padding:10px;border-radius:8px}.auth-user{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#fff}.auth-role{background:#e6f0ea;color:#1e4636;border-radius:999px;padding:6px 9px}.auth-signout{border:1px solid #ffffff55;background:transparent;color:#fff;border-radius:8px;padding:7px 10px;cursor:pointer}';document.head.appendChild(style);
  if(window.supabase)boot();else{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=boot;s.onerror=()=>{buildLogin();status('Could not load the secure authentication library.',true)};document.head.appendChild(s)}
})();
