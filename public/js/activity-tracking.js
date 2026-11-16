
(function(){
  'use strict';
  // Login/logout events, who is currently online, and a running log of which pages get opened —
  // added on top of everything else in the file, so it sees the final, fully-wrapped versions of
  // sign-in, sign-out, page navigation and render.
  //
  // A known boundary: this only covers PRIVILEGED logins (Accountant, HR Manager, Financial
  // Controller, MD/Approver, Super Admin) — anyone who loads the shared company data and can save
  // to it. A login that is ONLY the plain Employee role never loads that shared data at all (it
  // calls a narrow, read-only server function instead, by design, so it can never write back) —
  // so it cannot appear here. Today that affects almost nobody, since the handful of staff with a
  // portal also hold a privileged role. Supabase's own sign-in records (outside this app) already
  // cover every account, privileged or not, if that is ever needed.

  const HEARTBEAT_MS=60000;          // how often an open, signed-in tab confirms it is still there
  const ONLINE_WITHIN_MS=170000;     // how stale "Last Seen" can be before a person drops off "Currently Online"
  const ACTIVITY_CAP=300;            // oldest page-view entries are trimmed past this

  window.marlumDetectDeviceType=function(){
    // Browsers do not expose any way to tell a desktop from a laptop — nothing asks the OS that
    // question — so both are simply "Computer". Phone and Tablet are the two categories a browser
    // actually can identify.
    const ua=(navigator.userAgent||'')+' '+(navigator.platform||'');
    if(/iPad|Android(?!.*Mobile)|Tablet|Nexus 7|Nexus 10|KFAPWI/i.test(ua))return 'Tablet';
    if(/Mobi|iPhone|iPod|Android.*Mobile|BlackBerry|Windows Phone/i.test(ua))return 'Phone';
    return 'Computer';
  };

  function trimCap(arr,cap){
    if(Array.isArray(arr)&&arr.length>cap)arr.length=cap; // entries are always unshifted in, so the tail is the oldest
  }

  let heartbeatTimer=null,currentSessionId=null;

  function startHeartbeat(sessionId){
    stopHeartbeat();
    currentSessionId=sessionId;
    heartbeatTimer=setInterval(()=>{
      const s=(db.sessions||[]).find(x=>x.id===currentSessionId);
      if(!s){stopHeartbeat();return}
      s.lastSeen=new Date().toISOString();
      save();
    },HEARTBEAT_MS);
  }
  function stopHeartbeat(){
    if(heartbeatTimer){clearInterval(heartbeatTimer);heartbeatTimer=null}
    currentSessionId=null;
  }

  // ---- Sign-in: record a session and a "Signed in" audit entry ----
  const oldSignInTrack=window.marlumV19SignIn;
  if(typeof oldSignInTrack==='function'){
    window.marlumV19SignIn=async function(){
      await oldSignInTrack();
      if(db.currentUser){
        db.sessions=db.sessions||[];
        const device=window.marlumDetectDeviceType();
        const sess={
          id:'SESS-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
          userId:db.currentUser.id||db.currentUser.username,
          username:db.currentUser.username||db.currentUser.email||'',
          name:db.currentUser.name||db.currentUser.username||'Unknown',
          roles:(db.currentUser.roles||[]).join(', '),
          deviceType:device,
          signedInAt:new Date().toISOString(),
          lastSeen:new Date().toISOString()
        };
        db.sessions.unshift(sess);
        log('Signed in',`${device}`);
        startHeartbeat(sess.id);
        if(typeof window.render==='function')window.render();
      }
    };
  }

  // ---- Sign-out: record it and make sure it actually reaches the server before the page reloads ----
  const oldSignOutTrack=window.marlumV19SignOut;
  if(typeof oldSignOutTrack==='function'){
    window.marlumV19SignOut=async function(){
      if(db.currentUser){
        const device=window.marlumDetectDeviceType();
        log('Signed out',`${device}`);
        if(currentSessionId){
          db.sessions=(db.sessions||[]).filter(x=>x.id!==currentSessionId);
          save();
        }
        stopHeartbeat();
        try{
          if(typeof window.__marlumFlushSync==='function')await window.__marlumFlushSync();
        }catch(e){/* proceeding with sign-out either way — losing this one log entry is not worth blocking it */}
      }
      await oldSignOutTrack();
    };
  }

  // ---- Page activity: every page actually opened, who by, and on what kind of device ----
  const oldShowPageTrack=window.showPage;
  if(typeof oldShowPageTrack==='function'){
    window.showPage=function(id,btn){
      const before=document.querySelector('.page.active')?.id;
      const result=oldShowPageTrack(id,btn);
      const after=document.querySelector('.page.active')?.id;
      if(db.currentUser&&after===id&&after!==before){
        db.activityLog=db.activityLog||[];
        const pageEl=document.getElementById(id);
        const label=(pageEl&&pageEl.querySelector('h2')&&pageEl.querySelector('h2').textContent.trim())||id;
        db.activityLog.unshift({
          id:'ACT-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
          time:new Date().toISOString(),
          user:db.currentUser.name||db.currentUser.username||'Unknown',
          deviceType:window.marlumDetectDeviceType(),
          page:label
        });
        trimCap(db.activityLog,ACTIVITY_CAP);
        save();
      }
      return result;
    };
  }

  // ---- "Currently Online" and "Page Activity" tables, refreshed on every render ----
  const oldRenderTrack=window.render;
  if(typeof oldRenderTrack==='function'){
    window.render=function(){
      oldRenderTrack();
      const onlineEl=document.getElementById('onlineRows');
      if(onlineEl){
        const cutoff=Date.now()-ONLINE_WITHIN_MS;
        const live=(db.sessions||[]).filter(s=>s.lastSeen&&new Date(s.lastSeen).getTime()>=cutoff);
        onlineEl.innerHTML=live.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.roles)}</td><td>${esc(s.deviceType)}</td><td>${esc((s.signedInAt||'').slice(0,16).replace('T',' '))}</td><td>${esc((s.lastSeen||'').slice(0,16).replace('T',' '))}</td></tr>`).join('')||'<tr><td colspan="5">Nobody is currently online.</td></tr>';
      }
      const activityEl=document.getElementById('activityRows');
      if(activityEl){
        activityEl.innerHTML=(db.activityLog||[]).map(a=>`<tr><td>${esc((a.time||'').slice(0,16).replace('T',' '))}</td><td>${esc(a.user)}</td><td>${esc(a.deviceType)}</td><td>${esc(a.page)}</td></tr>`).join('')||'<tr><td colspan="4">No page activity recorded yet.</td></tr>';
      }
    };
  }
})();
