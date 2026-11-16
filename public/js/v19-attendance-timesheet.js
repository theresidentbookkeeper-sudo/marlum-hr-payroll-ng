
(function(){
  'use strict';
  const db=window.__marlumDB;
  const save=window.__marlumSave;
  const log=window.__marlumLog;
  if(!db||!save){console.error('Marlum V19 enhancement layer could not access application state.');return;}

  db.timeTrackerSettings=db.timeTrackerSettings||{
    standardHours:8,
    overtimeMultiplier:Number(db.payrollSettings?.overtimeMultiplier||1.5)
  };
  db.timeTrackerRecords=db.timeTrackerRecords||[];
  db.hrDocuments=db.hrDocuments||[];
  db.schemaVersion='19.0';

  const escV19=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const moneyV19=n=>'₦'+Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2});
  const todayV19=()=>new Date().toISOString().slice(0,10);
  const timeNowV19=()=>new Date().toTimeString().slice(0,5);
  const isCasualV19=e=>String(e.employmentType||'').toLowerCase()==='casual';
  const isWeeklySheetV19=e=>isCasualV19(e)||e.alsoWeekly===true; // people on the Weekly Timesheet: casual staff plus fixed staff also paid weekly
  const isFixedV19=e=>String(e.employmentType||'').toLowerCase()==='fixed salary';
  const activeEmployees=()=>db.employees.filter(e=>(e.status||e.employmentStatus)==='Active');

  function dateRangeV19(){
    const end=new Date();
    const start=new Date(end.getTime()-6*86400000);
    return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
  }
  function getAttendance(empId,date){
    return (db.attendance||[]).find(a=>a.emp===empId&&a.date===date)||null;
  }
  function getTracker(empId,date){
    return db.timeTrackerRecords.find(x=>x.emp===empId&&x.date===date)||null;
  }
  function ensureTracker(empId,date){
    let r=getTracker(empId,date);
    if(!r){
      const e=db.employees.find(x=>x.id===empId);
      r={id:'TT-'+Date.now()+'-'+empId,emp:empId,name:e?.name||'',employmentType:e?.employmentType||'Unassigned',date,timeIn:'',timeOut:'',hours:0,overtimeHours:0,source:'Time Tracker'};
      db.timeTrackerRecords.push(r);
    }
    return r;
  }
  function hoursBetween(t1,t2){
    if(!t1||!t2)return 0;
    const [h1,m1]=t1.split(':').map(Number),[h2,m2]=t2.split(':').map(Number);
    let mins=(h2*60+m2)-(h1*60+m1);
    if(mins<0)mins+=1440;
    return Math.max(0,mins/60);
  }
  function syncAttendanceFromTracker(r){
    db.attendance=db.attendance||[];
    let a=getAttendance(r.emp,r.date);
    const e=db.employees.find(x=>x.id===r.emp);
    const status=r.timeIn?(r.timeOut?'Present':'Present'):'Not Recorded';
    if(!a){
      a={emp:r.emp,name:e?.name||r.name,date:r.date,status:status==='Not Recorded'?'Absent':status,timeIn:r.timeIn,timeOut:r.timeOut};
      db.attendance.push(a);
    }else{
      a.timeIn=r.timeIn;a.timeOut=r.timeOut;
      if(r.timeIn)a.status='Present';
    }
    a.overtimeHours=Number(r.overtimeHours||0);
    a.workHours=Number(r.hours||0);
    a.source='Time Tracker';
    // Also record into attendanceRecords — the canonical array behind real payroll calculation
    // (approvedPayableDays) and behind monthly/yearly present-day counts for performance tracking.
    // Without this, Time Sheet clock-ins would never be reflected in either.
    const canonicalStatus=r.timeIn?'Present':'Absent';
    let ar=attendanceRecords().find(x=>x.date===r.date&&x.employeeId===r.emp);
    const u=(typeof activeSystemUser==='function'?activeSystemUser():null)||{username:'Time Sheet'};
    if(ar){ar.status=canonicalStatus;ar.payableDay=attendancePayable(canonicalStatus);ar.notes='Time Sheet';}
    else{attendanceRecords().push({id:'ATT-TT-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),date:r.date,employeeId:r.emp,name:e?.name||r.name,status:canonicalStatus,payableDay:attendancePayable(canonicalStatus),notes:'Time Sheet',enteredBy:u.username,createdAt:new Date().toISOString(),approvalStatus:'Approved',approvedBy:u.username})}
  }

  function buildNav(){
    const nav=document.getElementById('mainNav');
    if(!nav)return;
    const item=(id,label,icon)=>`<button class="nav-item" data-page="${id}" onclick="navGoV19('${id}',this)"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span></button>`;
    const group=(key,title,icon,items)=>`<div class="nav-group" data-group="${key}">
      <button class="nav-group-btn" onclick="toggleNavGroupV19('${key}')"><span class="nav-group-title"><span class="nav-icon">${icon}</span><span class="nav-label">${title}</span></span><span class="nav-chevron">▾</span></button>
      <div class="nav-submenu">${items.map(x=>item(x[0],x[1],x[2])).join('')}</div>
    </div>`;
    nav.innerHTML=`
      <div class="nav-top"><button class="nav-hamburger" onclick="toggleSidebarV19()" title="Collapse navigation">☰</button><span class="nav-brand">MARLUM HR & PAYROLL</span></div>
      ${item('dashboard','Dashboard','▦')}
      ${item('employees','Employee Management','👥')}
      ${group('payroll','Payroll & Payment Management','₦',[
        ['paycycles','Payroll Cycle','↻'],['payslips','Payslips','▤']
      ])}
      ${group('attendance','Attendance & Time Management','◷',[
        ['attendance2','Attendance','✓'],['timeTracker','Time Tracker','◴'],['weeklyTimesheet','Weekly Timesheet','▦']
      ])}
      ${group('hr','HR','▣',[
        ['hrrecords','HR Records','▣'],['lifecycle','HR Action','⚙'],['compensation','Compensation','◆']
      ])}
      ${item('ess','Employee Portal','♙')}
      ${group('admin','Administration','◉',[
        ['security','Users & Security','◉'],['reports','Reports','▤'],['audit','Audit Log','⌁'],['settings','Settings','⚙']
      ])}`;
    document.getElementById('mainNav')?.classList.remove('collapsed');
  }

  window.navGoV19=function(id,btn){
    if(typeof window.showPage==='function')window.showPage(id,btn);
    document.querySelectorAll('#mainNav .nav-item').forEach(b=>b.classList.remove('active'));
    btn?.classList.add('active');
    document.querySelectorAll('#mainNav .nav-group').forEach(g=>{
      const contains=g.querySelector(`[data-page="${id}"]`);
      if(contains){g.classList.add('open','active-group');contains.classList.add('active');}
    });
    if(id==='timeTracker'&&typeof window.showTimeTrackerV19==='function')window.showTimeTrackerV19();if(id==='weeklyTimesheet'&&typeof window.renderWeeklyTimesheet==='function')window.renderWeeklyTimesheet();if(id==='security'&&typeof window.loadRealUsers==='function')window.loadRealUsers();document.getElementById('mainNav')?.classList.remove('open');document.body.classList.remove('mobile-nav-open');document.querySelector('.mobile-menu')?.setAttribute('aria-expanded','false');
    document.getElementById('mainNav')?.classList.remove('open');
  };
  window.toggleNavGroupV19=function(key){
    const g=document.querySelector(`#mainNav .nav-group[data-group="${key}"]`);
    if(g)g.classList.toggle('open');
  };
  window.toggleSidebarV19=function(){
    document.getElementById('mainNav')?.classList.toggle('collapsed');
  };

  // A dedicated Time Tracker page; attendance remains the same operational dataset.
  if(!document.getElementById('weeklyTimesheet')){
    const wsec=document.createElement('section');
    wsec.id='weeklyTimesheet';wsec.className='page';
    wsec.innerHTML=`<div class="v19-section-head"><div><h2>Weekly Timesheet</h2><div class="label">A simple weekly attendance sheet for casual staff, by site — this replaces the paper timesheet until biometric devices are introduced. No clock in/out, just marking each working day present. Marlum's week runs Tuesday through Monday, with Sunday never a regular column — Sunday work is recorded as "Plus1" in Extra Hr/day instead. Pick any date and the sheet snaps to that week's Tuesday.</div></div></div>
    <div class="card"><div class="toolbar">
      <label>Site<select id="wtsSite" onchange="renderWeeklyTimesheet()"></select></label>
      <label>Search Employee<input id="wtsEmpSearch" placeholder="Type a name…" autocomplete="off" oninput="renderWeeklyTimesheet()"></label>
      <label>Week Starting<input type="date" id="wtsWeekStart" onchange="if(this.value)this.value=weekTuesdayISO(this.value);renderWeeklyTimesheet()"></label>
      <button class="btn primary" onclick="openWtsBulkUpload()">Bulk Upload Timesheet</button>
      <button class="btn secondary" onclick="downloadWtsWeekSummary()">Download This Week's Summary</button>
      <button class="btn secondary" onclick="downloadBlankWeeklyTimesheet()">Print / Download This Week's Sheet</button>
      <button class="btn danger" onclick="clearWtsWeek()">Clear This Week's Attendance</button>
    </div>
    <div id="wtsWeekLabel" class="label" style="margin:6px 0 10px;font-weight:700"></div>
    <div id="wtsFlags"></div>
    <div id="wtsTableWrap"></div>
    </div>`;
    document.querySelector('main')?.appendChild(wsec);
  }

  // Marlum's pay week runs Tuesday through the following Monday. Whatever date is picked is snapped
  // to the Tuesday on or before it, so a Monday or Sunday pick lands in the week that contains it.
  // All date arithmetic is done in UTC on purpose: building a local-midnight Date and then calling
  // toISOString() shifts the date back a day for anyone east of UTC (Nigeria, UTC+1), which is what
  // made the columns appear to "rearrange" the calendar.
  function addDaysISO(iso,n){
    const d=new Date(iso+'T00:00:00Z');
    d.setUTCDate(d.getUTCDate()+n);
    return d.toISOString().slice(0,10);
  }
  function weekTuesdayISO(anyDateISO){
    const day=new Date(anyDateISO+'T00:00:00Z').getUTCDay();
    return addDaysISO(anyDateISO,-((day-2+7)%7));
  }
  window.weekTuesdayISO=weekTuesdayISO;
  // From the Tuesday: Tue, Wed, Thu, Fri, Sat (+0..+4) and the closing Monday (+6). Sunday (+5) is
  // deliberately not a checkbox column — it stays the separate "Plus1" extra-day entry.
  function weekDatesFromTuesday(startISO){
    return [0,1,2,3,4,6].map(n=>addDaysISO(startISO,n));
  }
  const WTS_DAY_NAMES=['Tuesday','Wednesday','Thursday','Friday','Saturday','Monday'];
  function wtsFmt(iso){
    return new Date(iso+'T00:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
  }
  let wtsDayDates=null;
  window.updateWtsDayDate=function(i,value){
    if(!wtsDayDates)return;
    wtsDayDates[i]=value;
    renderWtsTableBody();
    renderWtsFlags();
  };
  window.renderWeeklyTimesheet=function(){
    const siteSel=document.getElementById('wtsSite');
    const sites=[...new Set(activeEmployees().filter(isWeeklySheetV19).map(e=>e.dept||'Unassigned'))].sort();
    const sitesKey=sites.join('|');
    if(siteSel.dataset.sitesKey!==sitesKey){
      // Rebuilds whenever the actual set of sites in use has changed — a department edit, a newly
      // added employee at a site that didn't exist before, or a site with no one left in it
      // disappearing — rather than only ever building this once per page load. The previously
      // selected value is preserved if it still exists, so this doesn't reset the view to "All
      // Sites" on every normal re-render (checkbox clicks, etc.) the way rebuilding unconditionally
      // would.
      const previousValue=siteSel.value;
      siteSel.innerHTML=`<option value="__ALL__">All Sites</option>`+sites.map(s=>`<option value="${escV19(s)}">${escV19(s)}</option>`).join('');
      siteSel.dataset.sitesKey=sitesKey;
      if(previousValue&&(previousValue==='__ALL__'||sites.includes(previousValue)))siteSel.value=previousValue;
    }
    if(!document.getElementById('wtsWeekStart').value){
      document.getElementById('wtsWeekStart').value=weekTuesdayISO(todayV19());
    }
    // Standard week, every site: Tuesday through the following Monday. The picker snaps to a Tuesday
    // before ever reaching here; the six columns are then Tue-Sat plus the closing Monday, and Sunday
    // stays the "Plus1" extra-day entry.
    const picked=document.getElementById('wtsWeekStart').value;
    const start=weekTuesdayISO(picked);
    if(picked!==start)document.getElementById('wtsWeekStart').value=start;
    if(!wtsDayDates||wtsDayDates[0]!==start){
      wtsDayDates=weekDatesFromTuesday(start);
    }
    const lbl=document.getElementById('wtsWeekLabel');
    if(lbl)lbl.textContent=`Week: ${wtsFmt(wtsDayDates[0])} to ${wtsFmt(wtsDayDates[5])} — ${wtsFmt(addDaysISO(wtsDayDates[0],5))} is the Plus1 day`;
    renderWtsTableBody();
    renderWtsFlags();
  };
  function weeklyExtras(){db.weeklyExtras=db.weeklyExtras||[];return db.weeklyExtras}
  // Extra column grammar: Plus1 (a full extra day), a number (extra hours), N<amount> (a flat naira
  // amount from the wages workbook), or any of them joined with +, e.g. Plus1+3 or Plus1+3+N500.
  function parseWtsExtra(raw){
    const v=String(raw||'').trim();
    if(!v)return null;
    let plus1=false,hours=0,amount=0;
    for(const part of v.split('+').map(t=>t.trim())){
      let m;
      if(/^plus\s*1$/i.test(part)){if(plus1)return{type:'invalid'};plus1=true;}
      else if((m=part.match(/^(?:n|₦)\s*(\d+(?:\.\d+)?)$/i))&&Number(m[1])>0)amount+=Number(m[1]);
      else if(/^\d+(?:\.\d+)?$/.test(part)&&Number(part)>0)hours+=Number(part);
      else return{type:'invalid'};
    }
    const kinds=(plus1?1:0)+(hours?1:0)+(amount?1:0);
    const type=kinds>1?'combo':plus1?'plus1':hours?'hours':'amount';
    return{type,plus1,hours,amount};
  }
  function wtsExtraEntry(parsed,raw,e,weekStart,idPrefix){
    return{id:idPrefix+Date.now()+'-'+Math.random().toString(36).slice(2,6),employeeId:e.id,name:e.name,weekStart,type:parsed.type,plus1:parsed.plus1===true,hours:parsed.hours||0,amount:parsed.amount||0,rawValue:raw,enteredBy:activeSystemUser().username,createdAt:new Date().toISOString()};
  }
  function renderWtsTableBody(){
    const site=document.getElementById('wtsSite').value;
    const showAll=site==='__ALL__';
    const q=(document.getElementById('wtsEmpSearch')?.value||'').trim().toLowerCase();
    const staff=activeEmployees().filter(isWeeklySheetV19).filter(e=>showAll||(e.dept||'Unassigned')===site).filter(e=>!q||e.name.toLowerCase().includes(q)||String(e.id).includes(q)).sort((a,b)=>(a.dept||'').localeCompare(b.dept||'')||a.name.localeCompare(b.name));
    const dayNames=WTS_DAY_NAMES;
    const weekStart=wtsDayDates[0];
    document.getElementById('wtsTableWrap').innerHTML=`<table class="wts-table"><thead><tr><th>S/N</th><th>Employee ID</th><th>Employee Name</th>${showAll?'<th>Site</th>':''}${dayNames.map((d,i)=>`<th>${d}<br><input type="date" class="wts-date" value="${wtsDayDates[i]}" onchange="updateWtsDayDate(${i},this.value)"></th>`).join('')}<th>Extra Hr/day<br><span style="font-weight:400;font-size:10px">Sun ${wtsDayDates[0]?addDaysISO(wtsDayDates[0],5):''} = Plus1</span></th></tr></thead><tbody>
    ${staff.map((e,idx)=>{
      const cells=wtsDayDates.map(d=>{
        const rec=attendanceRecords().find(a=>a.employeeId===e.id&&a.date===d);
        const checked=rec&&(rec.status==='Present'||rec.status==='Half Day');
        return `<td class="wts-day"><input type="checkbox" data-emp="${escV19(e.id)}" data-date="${d}" ${checked?'checked':''} onchange="toggleWtsCell(this)"></td>`;
      }).join('');
      const existingExtra=weeklyExtras().find(x=>x.employeeId===e.id&&x.weekStart===weekStart);
      const extraVal=existingExtra?weeklyExtraLabel(existingExtra):'';
      return `<tr><td>${idx+1}</td><td>${escV19(e.id)}</td><td>${escV19(e.name)}</td>${showAll?`<td>${escV19(e.dept||'Unassigned')}</td>`:''}${cells}<td><input type="text" data-emp="${escV19(e.id)}" value="${escV19(extraVal)}" placeholder="Plus1 / hrs" onchange="updateWtsExtra(this)" class="wts-extra"></td></tr>`;
    }).join('')||`<tr><td colspan="${showAll?11:10}">No casual staff found${showAll?'':' for this site'}.</td></tr>`}
    </tbody></table>`;
  }
  window.updateWtsExtra=function(el){
    const empId=el.dataset.emp,e=db.employees.find(x=>x.id===empId);if(!e)return;
    const weekStart=wtsDayDates[0];
    const parsed=parseWtsExtra(el.value);
    db.weeklyExtras=db.weeklyExtras||[];
    const existingIdx=db.weeklyExtras.findIndex(x=>x.employeeId===empId&&x.weekStart===weekStart);
    if(!parsed){
      if(existingIdx>-1)db.weeklyExtras.splice(existingIdx,1);
      save();return;
    }
    if(parsed.type==='invalid'){
      alert('Enter "Plus1" for one extra full day, a number of extra hours (e.g. 3 or 2.5), N followed by a flat amount (e.g. N1500), or combine them with + (e.g. Plus1+3).');
      el.value=existingIdx>-1?weeklyExtraLabel(db.weeklyExtras[existingIdx]):'';
      return;
    }
    const entry=wtsExtraEntry(parsed,el.value,e,weekStart,'WEX-');
    if(existingIdx>-1)db.weeklyExtras[existingIdx]=entry;else db.weeklyExtras.push(entry);
    log('Weekly extra overtime recorded',`${e.name} — ${weekStart} — ${el.value}`);
    save();
  };
  window.toggleWtsCell=function(el){
    const empId=el.dataset.emp,date=el.dataset.date,e=db.employees.find(x=>x.id===empId);if(!e)return;
    let existing=attendanceRecords().find(a=>a.employeeId===empId&&a.date===date);
    if(el.checked){
      const u=activeSystemUser();
      if(existing){existing.status='Present';existing.payableDay=attendancePayable('Present');existing.approvalStatus='Approved';existing.approvedBy=u.username;existing.approvedAt=new Date().toISOString();}
      else{attendanceRecords().push({id:'ATT-WTS-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),date,employeeId:empId,name:e.name,status:'Present',payableDay:attendancePayable('Present'),notes:'Weekly Timesheet',enteredBy:u.username,createdAt:new Date().toISOString(),approvalStatus:'Approved',approvedBy:u.username});}
    }else{
      // Unchecking means "not marked" — it removes the record rather than recording an explicit
      // Absent, since a blank cell on the paper sheet means the person simply wasn't there.
      if(existing)db.attendanceRecords=attendanceRecords().filter(a=>a!==existing);
    }
    save();
    renderWtsFlags();
  };
  function computeWeeklyFlags(weekDates){
    // Sums PRESENT days across ALL sites for each employee over this same week — not just the
    // site currently being viewed — since the whole point is catching someone recorded present
    // at more than one site on overlapping days, which a single-site view could never reveal.
    const counts={};
    weekDates.forEach(d=>{
      attendanceRecords().filter(a=>a.date===d&&(a.status==='Present'||a.status==='Half Day')).forEach(a=>{
        counts[a.employeeId]=counts[a.employeeId]||{name:a.name,count:0};
        counts[a.employeeId].count+=attendancePayable(a.status);
      });
    });
    return Object.entries(counts).filter(([id,v])=>v.count>6).map(([id,v])=>({id,name:v.name,count:v.count}));
  }
  function renderWtsFlags(){
    if(!wtsDayDates)return;
    const flags=computeWeeklyFlags(wtsDayDates);
    const box=document.getElementById('wtsFlags');if(!box)return;
    if(!flags.length){box.innerHTML='';return}
    box.innerHTML=`<div class="card" style="border:2px solid #a33c34;background:#fdf2f1"><b style="color:#a33c34">⚠ ${flags.length} employee(s) exceed 6 days this week across all sites combined:</b><ul>${flags.map(f=>`<li>${escV19(f.name)} (${escV19(f.id)}) — ${f.count} days total this week</li>`).join('')}</ul><p class="label">This usually means the same person was marked present at more than one site on overlapping days, or a duplicate entry — worth checking their attendance across every site for this week before running payroll.</p></div>`;
  }

  // ---- Bulk upload for the Weekly Timesheet: reads a file laid out exactly like the sheet on
  // screen (S/N, Employee ID, Employee Name, Tuesday..Saturday, Monday, Extra Hr/day) rather than the older
  // one-row-per-date format, and applies it to whichever week is currently selected — matching the
  // workflow of picking a week, uploading that week's sheet, then reviewing it live in the grid.
  // The separate "Download Upload Template" button (both here and on the main toolbar) was removed
  // per Nancy's request — the upload workflow itself stays, just without that specific button; the
  // column format is still explained in the text at the bottom of this modal. ----
  window.openWtsBulkUpload=function(){
    renderWeeklyTimesheet(); // always resync with the current week/site selection, not just when nothing has been picked yet — otherwise switching weeks after the first download silently keeps using the OLD dates
    wtsUploadRows=[];
    openModal(`<h3>Bulk Upload Timesheet</h3>
    <p class="label">Uploads a full week's attendance in one go, using the same columns as the sheet on screen. This applies to the week currently selected: <b>${wtsDayDates[0]} to ${wtsDayDates[5]}</b> (change the week on the main page first if that's not right, then reopen this).</p>
    <label>CSV File<input id="wtsUploadFile" type="file" accept=".csv" onchange="handleWtsFileSelect(this)"></label>
    <div id="wtsUploadPreview" style="margin-top:12px"></div>
    <div class="toolbar"><button class="btn primary" id="wtsUploadCommitBtn" onclick="commitWtsUpload()" disabled>Upload &amp; Show on Screen</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>
    <p class="label">Columns: S/N (ignored), Employee ID (preferred) or Employee Name, Tuesday, Wednesday, Thursday, Friday, Saturday and Monday (the Monday that closes the week; any mark in a day's cell means present that day — leave blank for a day off), Extra Hr/day (Plus1 for a full extra day — this is also how Sunday work is recorded, since Sunday is never one of the six regular columns — a number of extra hours, N followed by a flat amount such as N1500, or a combination joined with + such as Plus1+3). Optional columns: Site (where the person worked this week; their home site is unchanged) and Daily Rate (the rate for this week, which also updates their current rate).</p>`);
  };
  window.handleWtsFileSelect=function(input){
    let file=input.files&&input.files[0];if(!file)return;
    let reader=new FileReader();
    reader.onerror=function(){alert('Could not read that file. Try re-saving it as a plain CSV and uploading again.');};
    reader.onload=function(e){
      try{
        let rows=parseSimpleCSV(String(e.target.result));
        if(!rows.length){alert('The file appears to be empty.');return}
        let header=rows[0].map(h=>h.toLowerCase().trim());
        let idIdx=header.findIndex(h=>h.includes('employee id')||h==='id');
        let nameIdx=header.findIndex(h=>h.includes('name'));
        let dayIdx=['tuesday','wednesday','thursday','friday','saturday','monday'].map(d=>header.findIndex(h=>h.startsWith(d)));
        let extraIdx=header.findIndex(h=>h.includes('extra'));
        let siteIdx=header.findIndex(h=>h==='site'||h.startsWith('site '));
        let rateIdx=header.findIndex(h=>h.includes('rate'));
        if(idIdx===-1&&nameIdx===-1){alert('Could not find an Employee ID or Employee Name column. Check the file matches the expected columns (see the note at the bottom of the upload screen).');return}
        if(dayIdx.includes(-1)){alert('Could not find all six day columns (Tuesday, Wednesday, Thursday, Friday, Saturday and Monday). Check the exact column headers against the expected format.');return}
        const dataRows=rows.slice(1).filter(r=>r.some(c=>c));
        if(!dataRows.length){alert('The file has a header row but no data rows underneath it.');return}
        wtsUploadRows=dataRows.map(r=>{
          let idVal=idIdx>-1?r[idIdx]:'',nameVal=nameIdx>-1?r[nameIdx]:'';
          let emp=null;
          if(idVal)emp=db.employees.find(x=>x.id===idVal);
          if(!emp&&nameVal)emp=db.employees.find(x=>x.name.trim().toLowerCase()===nameVal.trim().toLowerCase());
          const dayMarks=dayIdx.map(i=>String(r[i]||'').trim().length>0);
          const extraRaw=extraIdx>-1?r[extraIdx]:'';
          const extraParsed=parseWtsExtra(extraRaw);
          const siteVal=siteIdx>-1?String(r[siteIdx]||'').trim():'';
          const rateNum=rateIdx>-1?Number(String(r[rateIdx]||'').replace(/[^0-9.]/g,'')):0;
          return{idVal,nameVal,dayMarks,extraRaw,extraParsed,siteVal,rate:rateNum>0?rateNum:0,matched:emp||null};
        });
        renderWtsUploadPreview();
      }catch(err){
        alert('Something went wrong reading that file: '+err.message+'. Please check it matches the expected format and try again.');
      }
    };
    reader.readAsText(file);
  };
  function renderWtsUploadPreview(){
    let matched=wtsUploadRows.filter(r=>r.matched).length,unmatched=wtsUploadRows.length-matched;
    let totalMarks=wtsUploadRows.filter(r=>r.matched).reduce((s,r)=>s+r.dayMarks.filter(Boolean).length,0);
    let badExtra=wtsUploadRows.filter(r=>r.extraRaw&&r.extraParsed&&r.extraParsed.type==='invalid').length;
    const dayNames=['Tue','Wed','Thu','Fri','Sat','Mon'];
    // Duplicate detection: the same employee appearing more than once is normal at Marlum — staff
    // sometimes transfer between sites mid-week, so their days get split across two rows. Those
    // rows are now correctly unioned on commit rather than one overwriting the other. Only flag it
    // as a likely mistake when every occurrence has IDENTICAL marks (a straightforward duplicate,
    // not a transfer); different marks across occurrences is just noted, not warned about.
    const idGroups={};
    wtsUploadRows.forEach(r=>{if(r.matched){(idGroups[r.matched.id]=idGroups[r.matched.id]||[]).push(r);}});
    const dupeGroups=Object.entries(idGroups).filter(([id,rs])=>rs.length>1);
    const identicalDupes=dupeGroups.filter(([id,rs])=>{const m0=rs[0].dayMarks.join(',');return rs.every(r=>r.dayMarks.join(',')===m0);});
    const transferDupes=dupeGroups.filter(([id,rs])=>!identicalDupes.some(([id2])=>id2===id));
    // Coverage check: how many of the company's ACTIVE casual staff does this file actually cover?
    // This is the check that would have caught an incomplete upload before it was committed.
    const allCasualIds=new Set(activeEmployees().filter(isWeeklySheetV19).map(e=>e.id));
    const coveredIds=new Set(wtsUploadRows.filter(r=>r.matched&&allCasualIds.has(r.matched.id)).map(r=>r.matched.id));
    const missingCount=[...allCasualIds].filter(id=>!coveredIds.has(id)).length;
    let coverageHtml=`<p>This file covers <b>${coveredIds.size}</b> of the <b>${allCasualIds.size}</b> active casual staff in the system`;
    if(missingCount>0){
      const missingBySite={};
      activeEmployees().filter(isWeeklySheetV19).filter(e=>!coveredIds.has(e.id)).forEach(e=>{missingBySite[e.dept||'Unassigned']=(missingBySite[e.dept||'Unassigned']||0)+1;});
      coverageHtml+=` — <b style="color:#a33c34">${missingCount} not included</b>: ${Object.entries(missingBySite).map(([s,c])=>`${escV19(s)} (${c})`).join(', ')}.</p>`;
    }else{coverageHtml+=` — every active casual employee is covered.</p>`;}
    let dupeHtml='';
    if(identicalDupes.length)dupeHtml+=`<p style="color:#a33c34"><b>${identicalDupes.length} employee(s) appear more than once with identical marks</b> — likely an accidental duplicate, not a transfer: ${identicalDupes.slice(0,10).map(([id])=>escV19(db.employees.find(x=>x.id===id)?.name||id)).join(', ')}${identicalDupes.length>10?', ...':''}</p>`;
    if(transferDupes.length)dupeHtml+=`<p class="label"><b>${transferDupes.length} employee(s) appear more than once with different marks</b> — treated as a mid-week site transfer, their marked days will be combined: ${transferDupes.slice(0,10).map(([id])=>escV19(db.employees.find(x=>x.id===id)?.name||id)).join(', ')}${transferDupes.length>10?', ...':''}</p>`;
    document.getElementById('wtsUploadPreview').innerHTML=`<p><b>${wtsUploadRows.length}</b> rows read — <b style="color:#1e6b3c">${matched} matched</b>${unmatched?`, <b style="color:#a33c34">${unmatched} not matched</b>`:''} — <b>${totalMarks}</b> day-marks will be applied${badExtra?`, <b style="color:#a33c34">${badExtra} with an unreadable Extra Hr/day value</b>`:''}.</p>
    ${coverageHtml}${dupeHtml}
    <table><tr><th>Employee</th>${dayNames.map(d=>`<th>${d}</th>`).join('')}<th>Extra Hr/day</th><th>Match</th></tr>
    ${wtsUploadRows.slice(0,100).map(r=>`<tr><td>${esc(r.nameVal||r.idVal)}</td>${r.dayMarks.map(m=>`<td style="text-align:center">${m?'✓':''}</td>`).join('')}<td>${r.extraRaw?esc(r.extraRaw):''}</td><td>${r.matched?'✓ '+esc(r.matched.name):'✗ Not found'}</td></tr>`).join('')}
    </table>${wtsUploadRows.length>100?`<p class="label">Showing first 100 of ${wtsUploadRows.length} rows.</p>`:''}`;
    document.getElementById('wtsUploadCommitBtn').disabled=matched===0;
  }
  window.commitWtsUpload=function(){
    const u=activeSystemUser();let daysApplied=0,extrasApplied=0,bookingsApplied=0;
    // Group by employee FIRST and union their day-marks, rather than applying each row in
    // isolation. The same person can legitimately appear more than once in one upload — Marlum
    // staff sometimes transfer between sites mid-week — and a later row's blank cell for a day
    // the person WAS marked present on (by an earlier row, at a different site) must not erase
    // that mark. A day counts present if ANY of the person's rows in this upload marks it present.
    const byEmployee=new Map();
    wtsUploadRows.filter(r=>r.matched).forEach(r=>{
      const id=r.matched.id;
      if(!byEmployee.has(id))byEmployee.set(id,{emp:r.matched,dayMarks:[false,false,false,false,false,false],extraParsed:null,extraRaw:'',site:'',siteDays:-1,rate:0});
      const entry=byEmployee.get(id);
      r.dayMarks.forEach((present,i)=>{if(present)entry.dayMarks[i]=true;});
      // A person split across two sites is booked to the site where this upload shows them for most days.
      const rowDays=r.dayMarks.filter(Boolean).length;
      if(r.siteVal&&rowDays>entry.siteDays){entry.site=r.siteVal;entry.siteDays=rowDays;}
      if(r.rate)entry.rate=r.rate;
      if(r.extraParsed&&r.extraParsed.type!=='invalid'){entry.extraParsed=r.extraParsed;entry.extraRaw=r.extraRaw;}
    });
    byEmployee.forEach(({emp:e,dayMarks,extraParsed,extraRaw,site,rate})=>{
      dayMarks.forEach((present,i)=>{
        const date=wtsDayDates[i];
        let existing=attendanceRecords().find(a=>a.employeeId===e.id&&a.date===date);
        if(present){
          if(existing){existing.status='Present';existing.payableDay=attendancePayable('Present');existing.approvalStatus='Approved';existing.approvedBy=u.username;existing.approvedAt=new Date().toISOString();}
          else{attendanceRecords().push({id:'ATT-WTSU-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),date,employeeId:e.id,name:e.name,status:'Present',payableDay:attendancePayable('Present'),notes:'Weekly Timesheet bulk upload',enteredBy:u.username,createdAt:new Date().toISOString(),approvalStatus:'Approved',approvedBy:u.username});}
          daysApplied++;
        }else if(existing){
          db.attendanceRecords=attendanceRecords().filter(a=>a!==existing);
        }
      });
      if(site||rate){
        // Where the person worked and what rate the workbook paid for this week. The employee's own
        // department stays as their home site; the current rate follows the most recent week uploaded.
        const weekStart=wtsDayDates[0];
        db.weeklyBookings=db.weeklyBookings||[];
        const bIdx=db.weeklyBookings.findIndex(b=>b.employeeId===e.id&&b.weekStart===weekStart);
        const booking={id:'WBK-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),employeeId:e.id,name:e.name,weekStart,site,rate,enteredBy:u.username,createdAt:new Date().toISOString()};
        if(bIdx>-1)db.weeklyBookings[bIdx]=booking;else db.weeklyBookings.push(booking);
        bookingsApplied++;
        const newest=db.weeklyBookings.filter(b=>b.employeeId===e.id&&Number(b.rate)>0).reduce((m,b)=>b.weekStart>m.weekStart?b:m,{weekStart:''});
        if(rate&&newest.weekStart===weekStart&&Number(e.dailyRate||0)!==rate){log('Rate updated from timesheet',`${e.name} — ${e.dailyRate||0} to ${rate} (week of ${weekStart})`);e.dailyRate=rate;}
      }
      if(extraParsed){
        const weekStart=wtsDayDates[0];
        db.weeklyExtras=db.weeklyExtras||[];
        const idx=db.weeklyExtras.findIndex(x=>x.employeeId===e.id&&x.weekStart===weekStart);
        const entry=wtsExtraEntry(extraParsed,extraRaw,e,weekStart,'WEX-U-');
        if(idx>-1)db.weeklyExtras[idx]=entry;else db.weeklyExtras.push(entry);
        extrasApplied++;
      }
    });
    log('Weekly Timesheet bulk upload',`${wtsDayDates[0]} to ${wtsDayDates[5]} — ${daysApplied} day-marks, ${extrasApplied} extra entries, ${bookingsApplied} site/rate bookings`);
    save();closeModal();
    renderWtsTableBody();renderWtsFlags();
    alert(`Uploaded. ${daysApplied} day-marks, ${extrasApplied} extra entries and ${bookingsApplied} site/rate bookings applied for ${wtsDayDates[0]} to ${wtsDayDates[5]} — now showing on screen below for review. Switch site to check other sites' staff.`);
  };
  window.clearWtsWeek=function(){
    if(!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Only Super Admin can clear a week\'s attendance.');return}
    renderWeeklyTimesheet(); // always resync with the current week/site selection, not just when nothing has been picked yet — otherwise switching weeks after the first download silently keeps using the OLD dates
    const dates=wtsDayDates;
    const existingCount=(db.attendanceRecords||[]).filter(a=>dates.includes(a.date)).length;
    const extrasCount=(db.weeklyExtras||[]).filter(x=>x.weekStart===dates[0]).length;
    if(existingCount===0&&extrasCount===0){alert(`There is no existing attendance data for ${dates[0]} to ${dates[5]} to clear.`);return}
    if(!confirm(`This will permanently remove ${existingCount} attendance record(s) and ${extrasCount} Extra Hr/day entr${extrasCount===1?'y':'ies'} for ${dates[0]} to ${dates[5]}, across every site, so you can upload fresh. This cannot be undone. Continue?`))return;
    db.attendanceRecords=(db.attendanceRecords||[]).filter(a=>!dates.includes(a.date));
    db.weeklyExtras=(db.weeklyExtras||[]).filter(x=>x.weekStart!==dates[0]);
    db.weeklyBookings=(db.weeklyBookings||[]).filter(b=>b.weekStart!==dates[0]);
    log('Weekly Timesheet week cleared',`${dates[0]} to ${dates[5]} — removed ${existingCount} attendance records and ${extrasCount} extra-hour entries`);
    save();renderWtsTableBody();renderWtsFlags();
    alert(`Cleared. ${dates[0]} to ${dates[5]} is now empty and ready for a fresh upload.`);
  };
  window.downloadWtsWeekSummary=function(){
    renderWeeklyTimesheet(); // always resync with the current week/site selection, not just when nothing has been picked yet — otherwise switching weeks after the first download silently keeps using the OLD dates
    const std=Number(db.timeTrackerSettings?.standardHours||8);
    const site=document.getElementById('wtsSite').value;
    const showAll=site==='__ALL__';
    const staff=activeEmployees().filter(isWeeklySheetV19).filter(e=>showAll||(e.dept||'Unassigned')===site).sort((a,b)=>(a.dept||'').localeCompare(b.dept||'')||a.name.localeCompare(b.name));
    let rows=[['Weekly Timesheet Summary',showAll?'All Sites':site,`${wtsDayDates[0]} to ${wtsDayDates[5]}`],[],
      ['Site','Employee ID','Employee Name','Days Present','Daily Rate','Extra Pay','Estimated Gross']];
    let grandTotal=0;
    staff.forEach(e=>{
      const days=wtsDayDates.reduce((s,d)=>{const a=attendanceRecords().find(x=>x.employeeId===e.id&&x.date===d);return s+(a&&(a.status==='Present'||a.status==='Half Day')?attendancePayable(a.status):0)},0);
      if(days<=0&&!(db.weeklyExtras||[]).some(x=>x.employeeId===e.id&&x.weekStart===wtsDayDates[0]))return;
      const bk=(db.weeklyBookings||[]).find(b=>b.employeeId===e.id&&b.weekStart===wtsDayDates[0]);
      const daily=Number(bk&&Number(bk.rate)>0?bk.rate:(e.dailyRate||0));
      const extra=(db.weeklyExtras||[]).find(x=>x.employeeId===e.id&&x.weekStart===wtsDayDates[0]);
      const extraPay=extra?weeklyExtraPay(extra,daily,std?daily/std:0).pay:0;
      const gross=daily*days+extraPay;
      grandTotal+=gross;
      rows.push([(bk&&bk.site)||e.dept||'',e.id,e.name,days,daily.toFixed(2),extraPay.toFixed(2),gross.toFixed(2)]);
    });
    rows.push(['','','','','','Total:',grandTotal.toFixed(2)]);
    let csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
    let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`marlum-weekly-summary-${showAll?'all-sites':site.replace(/[^a-z0-9]+/gi,'-')}-${wtsDayDates[0]}.csv`;a.click();
    log('Weekly Timesheet summary downloaded',`${showAll?'All Sites':site} — ${wtsDayDates[0]} to ${wtsDayDates[5]}`);
  };

  window.downloadBlankWeeklyTimesheet=function(){
    const site=document.getElementById('wtsSite').value;
    const showAll=site==='__ALL__';
    const staff=activeEmployees().filter(isWeeklySheetV19).filter(e=>showAll||(e.dept||'Unassigned')===site).sort((a,b)=>(a.dept||'').localeCompare(b.dept||'')||a.name.localeCompare(b.name));
    const monday=wtsDayDates?wtsDayDates[0]:weekTuesdayISO(todayV19());
    const w=window.open('','_blank');
    w.document.write(`<!doctype html><html><head><title>Marlum Timesheet — ${escV19(showAll?'All Sites':site)}</title><style>
      @media print{tr{page-break-inside:avoid}}</style><style>
      body{font-family:Arial,sans-serif;padding:30px;color:#16281f}
      .head{background:#dcebe2;border-radius:14px;padding:20px 28px;display:flex;align-items:center;gap:16px;margin-bottom:18px}
      .head h1{margin:0;color:#16412e;font-size:26px}.head div.sub{color:#2c6b4a;letter-spacing:.08em;font-size:12px;font-weight:700}
      h2{text-align:center}table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #bcd6c6;padding:8px;text-align:center;font-size:12px}
      th{background:#e7f2ec;color:#16412e}
      td.name{text-align:left;font-weight:600}
    </style></head><body>
    <div class="head"><div><h1>Marlum Nigeria Ltd</h1><div class="sub">CONSTRUCTION WORKFORCE</div></div></div>
    <h2>TIMESHEET — ${escV19(showAll?'All Sites':site)} — Week ${monday} to ${wtsDayDates?wtsDayDates[5]:addDaysISO(monday,6)}</h2>
    <table><tr><th>S/N</th><th>Employee ID</th><th>Employee Name</th>${showAll?'<th>Site</th>':''}<th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Mon</th><th>Extra Hr/day</th></tr>
    ${staff.map((e,i)=>`<tr><td>${i+1}</td><td>${escV19(e.id)}</td><td class="name">${escV19(e.name)}</td>${showAll?`<td>${escV19(e.dept||'Unassigned')}</td>`:''}<td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('')}
    </table>
    <p style="font-size:11px;color:#2c6b4a;margin-top:14px">Extra Hr/day: write "Plus1" for a full extra day worked beyond the normal week (this is also how Sunday work is recorded — Marlum's week runs Tuesday through Monday with Sunday itself always paid as this extra day, never as one of the six regular columns), or a number of extra hours worked.</p>
    <script>window.print()<\/script>
    </body></html>`);
    w.document.close();
  };

  // A dedicated Time Tracker page; attendance remains the same operational dataset.
  if(!document.getElementById('timeTracker')){
    const sec=document.createElement('section');
    sec.id='timeTracker';sec.className='page';
    sec.innerHTML=`<div class="v19-section-head"><div><h2>Time Sheet</h2><div class="label">Clock in/out and overtime for Casual staff, whose pay depends on hours worked. Fixed Salary staff mark daily attendance on the Attendance page instead.</div></div><span class="v19-live">Live attendance source</span></div>
      <div class="grid">
        <div class="metric-card clickable-card" onclick="scrollToCardTable('ttRows')" title="Go to today's clock records"><div class="label">Casual Staff Present</div><div class="metric" id="ttCasualPresent">0</div></div>
        <div class="metric-card clickable-card" onclick="scrollToCardTable('ttRows')" title="Go to today's clock records"><div class="label">Not Yet Clocked In</div><div class="metric" id="ttNotClockedIn">0</div></div>
        <div class="metric-card clickable-card" onclick="scrollToCardTable('ttRows')" title="Go to today's clock records"><div class="label">Clocked In</div><div class="metric" id="ttClockedIn">0</div></div>
        <div class="metric-card clickable-card" onclick="scrollToCardTable('ttRows')" title="Go to today's clock records"><div class="label" id="ttOvertimeLabel">Overtime Hours Today</div><div class="metric" id="ttOvertimeToday">0.00</div></div>
      </div>
      <div class="card"><div class="toolbar">
        <label style="display:flex;align-items:center;gap:8px;margin-right:auto"><span class="label" style="margin:0">Viewing date:</span><input id="ttDatePicker" type="date" value="" onchange="changeTimeSheetDate(this.value)" style="padding:7px;border:1px solid #d0cbc7;border-radius:6px"><button class="btn secondary" onclick="changeTimeSheetDate(todayISO())" type="button">Today</button></label>
        <button class="btn primary" id="ttClockInAllBtn" onclick="clockInAllV19()">Clock In Missing Staff</button>
        <button class="btn primary" id="ttClockOutAllBtn" onclick="clockOutAllV19()">Clock Out All Staff</button>
        <button class="btn secondary" onclick="openBulkAttendanceImport()">Bulk Import Time Sheet</button>
        <button class="btn secondary" onclick="openOvertimeSettingsV19()">Overtime Settings</button>
        <button class="btn secondary" onclick="openAttendanceHistory()">Attendance History</button>
      </div><div class="v19-period" id="ttPeriod"></div><div id="ttRows"></div></div>`;
    document.querySelector('main')?.appendChild(sec);
  }
  let ttSelectedDate=null;
  window.changeTimeSheetDate=function(value){
    ttSelectedDate=value||todayV19();
    renderTimeTracker();
  };

  function renderTimeTracker(){
    if(!ttSelectedDate)ttSelectedDate=todayV19();
    const active=activeEmployees().filter(isCasualV19),d=ttSelectedDate,isToday=(d===todayV19()),std=Number(db.timeTrackerSettings.standardHours||8);
    const recs=active.map(e=>({e,r:getTracker(e.id,d)}));
    const casualPresent=recs.filter(x=>x.r?.timeIn).length;
    const notClockedIn=active.length-casualPresent;
    const clockedIn=recs.filter(x=>x.r?.timeIn&&!x.r?.timeOut).length;
    const ot=recs.reduce((s,x)=>s+Number(x.r?.overtimeHours||0),0);
    document.getElementById('ttCasualPresent').textContent=casualPresent;
    document.getElementById('ttNotClockedIn').textContent=notClockedIn;
    document.getElementById('ttClockedIn').textContent=clockedIn;
    document.getElementById('ttOvertimeToday').textContent=ot.toFixed(2);
    document.getElementById('ttOvertimeLabel').textContent=isToday?'Overtime Hours Today':'Overtime Hours (this date)';
    const picker=document.getElementById('ttDatePicker');if(picker&&picker.value!==d)picker.value=d;
    const clockInBtn=document.getElementById('ttClockInAllBtn'),clockOutBtn=document.getElementById('ttClockOutAllBtn');
    if(clockInBtn)clockInBtn.disabled=!isToday;
    if(clockOutBtn)clockOutBtn.disabled=!isToday;
    const range=dateRangeV19();
    document.getElementById('ttPeriod').innerHTML=`<b>${isToday?'Today':'Viewing'}:</b> ${d}${isToday?'':' <span style="color:#a33c34">(not today — Clock In/Out actions are for today only; use the fields below to correct this date\'s times)</span>'} · <b>Standard workday:</b> ${std} hours · <b>OT multiplier:</b> ${Number(db.timeTrackerSettings.overtimeMultiplier||1.5).toFixed(2)}×<br><span class="label">Weekly casual payroll reads approved attendance and overtime from ${range.start} to ${range.end}. Fixed staff payroll reads the current monthly period.</span>`;
    document.getElementById('ttRows').innerHTML=`<table><thead><tr><th>Employee</th><th>Type</th><th>Status</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>OT Hours</th><th>Action</th></tr></thead><tbody>
      ${recs.map(({e,r})=>{
        const status=r?.timeIn?(r.timeOut?'Clocked Out':'Clocked In'):'Not Clocked In';
        // Once both Time In and Time Out are set, further correction happens through the editable
        // fields themselves, not this action button — a live "Clock In" here would silently overwrite
        // a correct clock-in time if clicked again after someone has already been clocked out.
        const action=!isToday?'—':(r?.timeIn&&r?.timeOut?'—':(r?.timeIn?`<button class="btn success" onclick="clockOutV19('${escV19(e.id)}')">Clock Out</button>`:`<button class="btn primary" onclick="clockInV19('${escV19(e.id)}')">Clock In</button>`));
        return `<tr><td><b>${escV19(e.name)}</b><div class="v19-ot">${escV19(e.id)}</div></td><td>${escV19(e.employmentType||'Unassigned')}</td><td>${status}</td><td><input type="time" value="${r?.timeIn||''}" onchange="setTimeInV19('${escV19(e.id)}',this.value)" style="width:100px;padding:7px;border:1px solid #d0cbc7;border-radius:6px"></td><td><input type="time" value="${r?.timeOut||''}" onchange="setTimeOutV19('${escV19(e.id)}',this.value)" style="width:100px;padding:7px;border:1px solid #d0cbc7;border-radius:6px"></td><td>${Number(r?.hours||0).toFixed(2)}</td><td><input type="number" min="0" step="0.25" value="${Number(r?.overtimeHours||0)}" onchange="setOvertimeV19('${escV19(e.id)}',this.value)" style="width:85px;padding:7px;border:1px solid #d0cbc7;border-radius:6px"></td><td class="v19-action-row">${action}</td></tr>`;
      }).join('')||'<tr><td colspan="8">No active employees.</td></tr>'}</tbody></table>`;
  }

  window.showTimeTrackerV19=renderTimeTracker;
  window.clockInV19=function(id){
    const e=db.employees.find(x=>x.id===id);if(!e)return;
    const d=todayV19(),r=ensureTracker(id,d);
    if(r.timeIn){alert(`${e.name} is already clocked in.`);return}
    r.timeIn=timeNowV19();r.timeOut='';r.hours=0;r.overtimeHours=0;
    r.employmentType=e.employmentType;syncAttendanceFromTracker(r);
    log('Time Tracker — Clock In',`${e.name} — ${d} ${r.timeIn}`);
    save();renderTimeTracker();if(typeof window.render==='function')window.render();
  };
  window.clockOutV19=function(id){
    const e=db.employees.find(x=>x.id===id);if(!e)return;
    const d=todayV19(),r=ensureTracker(id,d);
    if(!r.timeIn){alert('Clock In must be recorded first.');return}
    if(r.timeOut){alert(`${e.name} is already clocked out.`);return}
    r.timeOut=timeNowV19();r.hours=hoursBetween(r.timeIn,r.timeOut);
    r.overtimeHours=Number(Math.max(0,r.hours-Number(db.timeTrackerSettings.standardHours||8)).toFixed(2));
    r.employmentType=e.employmentType;syncAttendanceFromTracker(r);
    log('Time Tracker — Clock Out',`${e.name} — ${d} ${r.timeIn} to ${r.timeOut} — ${r.hours.toFixed(2)}h — OT ${r.overtimeHours.toFixed(2)}h`);
    save();renderTimeTracker();if(typeof window.render==='function')window.render();
  };
  window.setOvertimeV19=function(id,value){
    const r=ensureTracker(id,ttSelectedDate||todayV19());r.overtimeHours=Math.max(0,Number(value||0));syncAttendanceFromTracker(r);
    save();
    // Deferred: this handler can fire on 'blur' (e.g. when the user clicks another button right after
    // editing this field). Rewriting the table's innerHTML synchronously inside that blur can crash with
    // "node to be removed is no longer a child of this node" — the browser is still mid-transition on the
    // very input that's about to be discarded. Deferring lets that transition finish first.
    setTimeout(()=>{renderTimeTracker();if(typeof window.render==='function')window.render();},0);
  };
  window.clockInAllV19=function(){
    const d=todayV19(),now=timeNowV19();let count=0;
    activeEmployees().filter(isCasualV19).forEach(e=>{
      const r=ensureTracker(e.id,d);
      if(!r.timeIn){r.timeIn=now;r.employmentType=e.employmentType;syncAttendanceFromTracker(r);count++}
    });
    log('Time Tracker — Bulk Clock In',`${count} staff clocked in at ${now}`);
    save();renderTimeTracker();if(typeof window.render==='function')window.render();
  };
  window.clockOutAllV19=function(){
    // Bulk end-of-day action: closes out everyone currently clocked in without a Time Out yet.
    // Useful until clock-in/out happens live (biometric devices or staff self-service) — lets one
    // person close the whole day in one click instead of clocking each employee out individually.
    const d=todayV19(),now=timeNowV19(),std=Number(db.timeTrackerSettings.standardHours||8);let count=0;
    activeEmployees().filter(isCasualV19).forEach(e=>{
      const r=ensureTracker(e.id,d);
      if(r.timeIn&&!r.timeOut){
        r.timeOut=now;r.hours=hoursBetween(r.timeIn,r.timeOut);
        r.overtimeHours=Number(Math.max(0,r.hours-std).toFixed(2));
        r.employmentType=e.employmentType;syncAttendanceFromTracker(r);count++;
      }
    });
    log('Time Tracker — Bulk Clock Out',`${count} staff clocked out at ${now}`);
    save();renderTimeTracker();if(typeof window.render==='function')window.render();
    alert(`${count} staff clocked out.`);
  };
  window.setTimeInV19=function(id,value){
    const e=db.employees.find(x=>x.id===id);if(!e)return;
    const r=ensureTracker(id,ttSelectedDate||todayV19()),std=Number(db.timeTrackerSettings.standardHours||8);
    r.timeIn=value||'';
    if(r.timeIn&&r.timeOut){r.hours=hoursBetween(r.timeIn,r.timeOut);r.overtimeHours=Number(Math.max(0,r.hours-std).toFixed(2));}
    else{r.hours=0;r.overtimeHours=0;}
    r.employmentType=e.employmentType;syncAttendanceFromTracker(r);
    log('Time Tracker — Time In adjusted',`${e.name} — ${r.date} — ${r.timeIn||'cleared'}`);
    save();
    setTimeout(()=>{renderTimeTracker();if(typeof window.render==='function')window.render();},0);
  };
  window.setTimeOutV19=function(id,value){
    const e=db.employees.find(x=>x.id===id);if(!e)return;
    const r=ensureTracker(id,ttSelectedDate||todayV19()),std=Number(db.timeTrackerSettings.standardHours||8);
    r.timeOut=value||'';
    if(r.timeIn&&r.timeOut){r.hours=hoursBetween(r.timeIn,r.timeOut);r.overtimeHours=Number(Math.max(0,r.hours-std).toFixed(2));}
    else{r.hours=0;r.overtimeHours=0;}
    r.employmentType=e.employmentType;syncAttendanceFromTracker(r);
    log('Time Tracker — Time Out adjusted',`${e.name} — ${r.date} — ${r.timeOut||'cleared'}`);
    save();
    setTimeout(()=>{renderTimeTracker();if(typeof window.render==='function')window.render();},0);
  };
  window.openOvertimeSettingsV19=function(){
    openModal(`<h3>Time Tracker Settings</h3><div class="form">
      <label>Standard Hours / Day<input id="ttStd" type="number" min="1" max="24" step="0.25" value="${Number(db.timeTrackerSettings.standardHours||8)}"></label>
      <label>Overtime Multiplier<input id="ttMult" type="number" min="0" step="0.05" value="${Number(db.timeTrackerSettings.overtimeMultiplier||1.5)}"></label>
    </div><p class="label">The multiplier is a configurable payroll assumption. No statutory overtime rate is hard-coded.</p>
    <div class="toolbar"><button class="btn primary" onclick="saveOvertimeSettingsV19()">Save Settings</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
  };
  window.saveOvertimeSettingsV19=function(){
    db.timeTrackerSettings.standardHours=Math.max(1,Number(document.getElementById('ttStd').value||8));
    db.timeTrackerSettings.overtimeMultiplier=Math.max(0,Number(document.getElementById('ttMult').value||1.5));
    db.payrollSettings=db.payrollSettings||{};db.payrollSettings.overtimeMultiplier=db.timeTrackerSettings.overtimeMultiplier;
    log('Time Tracker settings updated',`Standard hours ${db.timeTrackerSettings.standardHours}; OT multiplier ${db.timeTrackerSettings.overtimeMultiplier}x`);
    save();closeModal();renderTimeTracker();if(typeof window.render==='function')window.render();
  };

  // Make attendance2 the main Attendance screen and add the requested Fixed Staff widget.
  const att2=document.getElementById('attendance2');
  if(att2){
    att2.innerHTML=`<div class="v19-section-head"><div><h2>Attendance</h2><div class="label">Daily attendance for Fixed Salary staff. Casual staff attendance is tracked through the Time Sheet instead, since their pay depends on hours worked.</div></div><span class="v19-live">Live data</span></div>
      <div class="grid">
        <div class="metric-card clickable-card" onclick="scrollToCardTable('v19AttendanceTable')" title="Go to the fixed-staff attendance table below"><div class="label">Fixed Staff Present</div><div class="metric" id="v19FixedAttendance">0</div></div>
        <div class="metric-card clickable-card" onclick="scrollToCardTable('v19AttendanceTable')" title="Go to the fixed-staff attendance table below"><div class="label">Fixed Staff Not Marked</div><div class="metric" id="v19FixedNotMarked">0</div></div>
        <div class="metric-card clickable-card" onclick="showTimeTrackerV19();navGoV19('timeTracker',document.querySelector('#mainNav [data-page=&quot;timeTracker&quot;]'))" title="Go to Time Sheet (Casual Staff)"><div class="label">Casual Staff Present</div><div class="metric" id="v19CasualAttendance">0</div></div>
        <div class="metric-card clickable-card" onclick="scrollToCardTable('v19AttendanceTable')" title="Go to the fixed-staff attendance table below"><div class="label">Attendance Rate</div><div class="metric" id="v19AttendanceRate">0%</div></div>
      </div>
      <div style="display:none"><span id="attCasual"></span><span id="attWeekly"></span><span id="attPending"></span><span id="attApprovedDays"></span></div>
      <div class="card"><div class="toolbar">
        <label style="display:flex;align-items:center;gap:8px;margin-right:auto"><span class="label" style="margin:0">Viewing date:</span><input id="attDatePicker" type="date" value="" onchange="changeFixedAttendanceDate(this.value)" style="padding:7px;border:1px solid #d0cbc7;border-radius:6px"><button class="btn secondary" onclick="changeFixedAttendanceDate(todayISO())" type="button">Today</button></label>
        <button class="btn primary" onclick="markAllFixedPresentV19()">Mark All Present</button>
        <button class="btn secondary" onclick="showTimeTrackerV19();navGoV19('timeTracker',document.querySelector('#mainNav [data-page=&quot;timeTracker&quot;]'))">Open Time Sheet (Casual Staff)</button>
        <button class="btn secondary" onclick="openAttendanceHistory()">Attendance History</button>
      </div><div id="v19AttendanceTable"></div></div>`;
  }
  let attSelectedDate=null;
  window.changeFixedAttendanceDate=function(value){
    attSelectedDate=value||todayV19();
    updateV19Screens();
  };
  window.markAllFixedPresentV19=function(){
    if(!attSelectedDate)attSelectedDate=todayV19();
    const d=attSelectedDate,u=activeSystemUser();let count=0;
    activeEmployees().filter(isFixedV19).forEach(e=>{
      let a=attendanceRecords().find(x=>x.date===d&&x.employeeId===e.id);
      if(a){a.status='Present';a.payableDay=attendancePayable('Present');}
      else{attendanceRecords().push({id:'ATT-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),date:d,employeeId:e.id,name:e.name,status:'Present',payableDay:attendancePayable('Present'),notes:'Marked via Mark All Present',enteredBy:u.username,createdAt:new Date().toISOString(),approvalStatus:'Approved',approvedBy:u.username})}
      count++;
    });
    log('Fixed staff attendance — Mark All Present',`${count} staff — ${d}`);
    save();updateV19Screens();
    alert(`${count} fixed-salary staff marked Present for ${d}.`);
  };
  window.setFixedAttendanceStatusV19=function(empId,status){
    if(!attSelectedDate)attSelectedDate=todayV19();
    const d=attSelectedDate,u=activeSystemUser(),e=db.employees.find(x=>x.id===empId);if(!e)return;
    let a=attendanceRecords().find(x=>x.date===d&&x.employeeId===empId);
    if(a){a.status=status;a.payableDay=attendancePayable(status);}
    else{attendanceRecords().push({id:'ATT-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),date:d,employeeId:empId,name:e.name,status,payableDay:attendancePayable(status),notes:'',enteredBy:u.username,createdAt:new Date().toISOString(),approvalStatus:'Approved',approvedBy:u.username})}
    log('Fixed staff attendance adjusted',`${e.name} — ${d} — ${status}`);
    save();
    setTimeout(()=>{updateV19Screens();},0);
  };

  // HR Records: real file-picker upload from the user's device, with metadata retained locally.
  window.openHRDocument=function(prefillId=''){
    const active=activeEmployees();
    openModal(`<h3>Upload HR Record</h3><div class="grid">
      <label>Employee<select id="docEmp">${active.map(e=>`<option value="${escV19(e.id)}" ${e.id===prefillId?'selected':''}>${escV19(e.name)} (${escV19(e.id)})</option>`).join('')}</select></label>
      <label>Document Type<select id="docType">${['Employment Contract','Appointment Letter','ID / Passport','Certificate','Qualification','Medical / Fitness Record','Disciplinary Record','Next-of-Kin Record','Other'].map(x=>`<option>${x}</option>`).join('')}</select></label>
      <label>Upload File<input id="docFile" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"></label>
      <label>Document Reference<input id="docRef" placeholder="Reference / file number"></label>
      <label>Issue Date<input id="docIssue" type="date"></label><label>Expiry / Review Date<input id="docExpiry" type="date"></label>
      <label>Status<select id="docStatus"><option>Current</option><option>Pending</option><option>Expired</option><option>For Review</option></select></label>
      <label>Notes<input id="docNotes"></label>
    </div><p class="label">Choose a document from the local drive/files on the device. The demo stores document metadata and small files in browser storage; larger files should be connected to secure server storage in production.</p>
    <div id="docFileInfo" class="v19-file">No file selected.</div>
    <div class="toolbar"><button class="btn primary" onclick="saveHRDocumentV19()">Save HR Record</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
    document.getElementById('docFile')?.addEventListener('change',function(){
      const f=this.files?.[0];document.getElementById('docFileInfo').textContent=f?`${f.name} · ${(f.size/1024/1024).toFixed(2)} MB`:'No file selected.';
    });
  };
  function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
  window.saveHRDocumentV19=async function(){
    const id=document.getElementById('docEmp').value,e=db.employees.find(x=>x.id===id),file=document.getElementById('docFile')?.files?.[0];
    if(!e){alert('Select an employee.');return}
    if(file&&file.size>4*1024*1024){alert('For this browser-only build, please use a file of 4 MB or less. Larger files can be supported after secure server storage is connected.');return}
    let fileData='';
    try{if(file)fileData=await fileToDataURL(file)}catch(err){alert('The selected file could not be read.');return}
    db.hrDocuments.push({id:'DOC-'+Date.now(),emp:id,name:e.name,type:document.getElementById('docType').value,ref:document.getElementById('docRef').value,issue:document.getElementById('docIssue').value,expiry:document.getElementById('docExpiry').value,status:document.getElementById('docStatus').value,notes:document.getElementById('docNotes').value,fileName:file?.name||'',fileType:file?.type||'',fileSize:file?.size||0,fileData,createdAt:new Date().toISOString()});
    log('HR record uploaded',`${e.name} — ${file?.name||'metadata only'}`);
    save();closeModal();render();
  };
  window.openHRDocumentRegister=function(){
    const docs=db.hrDocuments||[];
    openModal(`<h3>HR Document Register</h3><table><tr><th>Employee</th><th>Type</th><th>File</th><th>Issue</th><th>Expiry / Review</th><th>Status</th><th>Action</th></tr>
      ${docs.slice().reverse().map(d=>`<tr><td>${escV19(d.name)}</td><td>${escV19(d.type)}</td><td>${escV19(d.fileName||d.ref||'—')}</td><td>${d.issue||'—'}</td><td>${d.expiry||'—'}</td><td>${escV19(d.status)}</td><td>${d.fileData?`<button class="btn secondary" onclick="downloadHRDocumentV19('${escV19(d.id)}')">Download</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="7">No HR records.</td></tr>'}</table><div class="toolbar"><button class="btn primary" onclick="openHRDocument()">+ Upload Record</button><button class="btn secondary" onclick="closeModal()">Close</button></div>`);
  };
  window.downloadHRDocumentV19=function(id){
    const d=(db.hrDocuments||[]).find(x=>x.id===id);if(!d?.fileData)return;
    const a=document.createElement('a');a.href=d.fileData;a.download=d.fileName||'marlum-hr-record';a.click();
  };

  // Payslips: explicitly ask whether to download or print.
  window.showPayslip=function(id){
    const p=db.payroll,x=p?.items?.find(i=>i.id===id),e=db.employees.find(a=>a.id===id);
    if(!x||!e){alert('Employee payroll record not found.');return}
    const period=p.displayMonth||p.month;
    const ot=Number(x.overtimePay||0);
    const htmlSlip=`<div class="payslip" id="printPayslip"><div style="text-align:center;border-bottom:2px solid #9db5a8;padding-bottom:10px;margin-bottom:15px">
      <h2 style="margin:0">${escV19(db.settings.companyName||'Marlum Nigeria Ltd.')}</h2><div>Employee Payslip — ${escV19(period)}</div></div>
      <table><tr><th>Employee ID</th><td>${escV19(e.id)}</td><th>Department</th><td>${escV19(e.dept||'—')}</td></tr><tr><th>Employee</th><td>${escV19(e.name)}</td><th>Position</th><td>${escV19(e.position||'—')}</td></tr><tr><th>Employment Type</th><td>${escV19(e.employmentType||'—')}</td><th>Payroll Frequency</th><td>${escV19(x.payrollFrequency||'—')}</td></tr></table>
      <h4>Earnings</h4><table>${Object.entries(x.earnings||{}).map(([k,v])=>`<tr><td>${escV19(k.replace(/([A-Z])/g,' $1'))}</td><td>${moneyV19(v)}</td></tr>`).join('')}<tr><td>Overtime Pay</td><td>${moneyV19(ot)}</td></tr><tr><th>Gross Pay</th><th>${moneyV19(x.gross)}</th></tr></table>
      <h4>Deductions</h4><table><tr><td>Other Deductions</td><td>${moneyV19(x.deduction||0)}</td></tr><tr><td>Loan / Advance Repayment</td><td>${moneyV19(x.loanRepayment||0)}</td></tr><tr><th>Net Pay</th><th>${moneyV19(x.netPay)}</th></tr></table>
      <p class="label">PAYE, Pension and NSITF remain excluded from this browser build.</p></div>`;
    openModal(`${htmlSlip}<div class="toolbar"><button class="btn primary" onclick="downloadPayslipV19('${escV19(id)}')">Download Payslip</button><button class="btn success" onclick="printPayslip()">Print Payslip</button><button class="btn secondary" onclick="closeModal()">Close</button></div><p class="label">Choose <b>Download Payslip</b> to save a file or <b>Print Payslip</b> to send it to a printer/PDF printer.</p>`);
  };
  window.downloadPayslipV19=function(id){
    const p=db.payroll,x=p?.items?.find(i=>i.id===id),e=db.employees.find(a=>a.id===id);if(!x||!e)return;
    const content=document.getElementById('printPayslip')?.outerHTML||'';
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${escV19(e.id)}</title><style>body{font-family:Arial;padding:30px;color:#24302a}table{width:100%;border-collapse:collapse;margin-bottom:15px}th,td{padding:8px;border:1px solid #ddd;text-align:left}</style></head><body>${content}</body></html>`;
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));a.download=`marlum-payslip-${e.id}-${p.month}.html`;a.click();
  };

  // Payroll now consumes time-tracker overtime for both staff types.
  // (window.createPayroll — the second of three versions this file accumulated — removed entirely.
  // It was never reachable from any button, and shared no dependencies with anything still in use.)

  // Module refresh: current actions immediately appear in their module.
  const oldRenderV19=window.render;
  function updateV19Screens(){
    if(!attSelectedDate)attSelectedDate=todayV19();
    const active=activeEmployees(),d=attSelectedDate,isToday=(d===todayV19());
    const fixedStaff=active.filter(isFixedV19),casualStaff=active.filter(isCasualV19);
    const attRecs=attendanceRecords().filter(x=>x.date===d);
    const fixedPresent=fixedStaff.filter(e=>{const a=attRecs.find(x=>x.employeeId===e.id);return a&&(a.status==='Present'||a.status==='Half Day')}).length;
    const fixedNotMarked=fixedStaff.length-fixedStaff.filter(e=>attRecs.some(x=>x.employeeId===e.id)).length;
    const casualToday=casualStaff.filter(e=>{const t=getTracker(e.id,d);return t&&t.timeIn}).length;
    const overallPresent=fixedPresent+casualToday;
    if(document.getElementById('v19FixedAttendance'))document.getElementById('v19FixedAttendance').textContent=fixedPresent;
    if(document.getElementById('v19FixedNotMarked'))document.getElementById('v19FixedNotMarked').textContent=fixedNotMarked;
    if(document.getElementById('v19CasualAttendance'))document.getElementById('v19CasualAttendance').textContent=casualToday;
    if(document.getElementById('v19AttendanceRate'))document.getElementById('v19AttendanceRate').textContent=(active.length?Math.round(overallPresent/active.length*100):0)+'%';
    const picker=document.getElementById('attDatePicker');if(picker&&picker.value!==d)picker.value=d;
    if(document.getElementById('v19AttendanceTable')){
      const statusOptions=['Present','Absent','Half Day','Leave'];
      document.getElementById('v19AttendanceTable').innerHTML=`<h4>${isToday?'Today':'Viewing'}: ${d}${fixedNotMarked>0?` — <span style="color:#a33c34">${fixedNotMarked} not yet marked</span>`:''}</h4>
      <table><tr><th>Employee</th><th>Department</th><th>Status</th><th>Marked By</th></tr>${fixedStaff.map(e=>{
        const a=attRecs.find(x=>x.employeeId===e.id),status=a?.status||'';
        return `<tr><td><b>${escV19(e.name)}</b><div class="v19-ot">${escV19(e.id)}</div></td><td>${escV19(e.dept||'—')}</td><td><select onchange="setFixedAttendanceStatusV19('${escV19(e.id)}',this.value)" style="padding:7px;border:1px solid #d0cbc7;border-radius:6px"><option value="" ${!status?'selected':''}>— Not marked —</option>${statusOptions.map(s=>`<option value="${s}" ${status===s?'selected':''}>${s}</option>`).join('')}</select></td><td>${escV19(a?.enteredBy||'—')}</td></tr>`;
      }).join('')||'<tr><td colspan="4">No active fixed-salary staff.</td></tr>'}</table>`;
    }
    // The legacy Payroll page (payrollTitle/payrollRows/payrollFoot) was removed from navigation —
    // this block used to render into it from db.payroll, which no longer has any way to be set by
    // the app. It's removed entirely rather than left dangling: it was also the exact source of a
    // real crash ("Cannot read properties of undefined (reading 'start')") whenever a browser had
    // stale db.payroll data left over from before this module was retired, since older cached shapes
    // don't have the weeklyRange/monthlyRange fields this code expected.
    renderTimeTracker();
  }
  window.render=function(){if(typeof oldRenderV19==='function')oldRenderV19();updateV19Screens();};

  // Update visible labels without changing the underlying legacy pages.
  const empTitle=document.querySelector('#employees h2');if(empTitle)empTitle.textContent='Employee Management';
  const hrTitle=document.querySelector('#hrrecords h2');if(hrTitle)hrTitle.textContent='HR Records';
  const lifeTitle=document.querySelector('#lifecycle h2');if(lifeTitle)lifeTitle.textContent='HR Action';
  const attTitle=document.querySelector('#attendance2 h2');if(attTitle)attTitle.textContent='Attendance';
  const payrollNotice=document.querySelector('#payroll .notice');if(payrollNotice)payrollNotice.innerHTML='<b>Payroll frequency:</b> Casual staff are calculated daily and paid weekly; Fixed Salary staff are paid monthly. Approved attendance and Time Tracker overtime are read automatically into payroll.';

  buildNav();
  setTimeout(()=>{try{window.render();}catch(e){console.error(e)}},20);
})();
