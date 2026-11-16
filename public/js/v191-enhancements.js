
(function(){
  const localDateISO=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
  window.todayISO=localDateISO;
  function refreshDeviceClock(){const d=new Date(),date=d.toLocaleDateString(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric'}),time=d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});const a=document.getElementById('today'),b=document.getElementById('deviceClock');if(a)a.textContent=date;if(b)b.innerHTML=`${esc(time)}<span class="clock-suffix"> · Device local time</span>`}
  setInterval(refreshDeviceClock,1000);refreshDeviceClock();

  const esc0=window.escV19||window.esc||((s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
  const money0=window.moneyV19||window.money||((n)=>'₦'+Number(n||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}));
  const active=()=> (db.employees||[]).filter(e=>e.status==='Active'&&e.employmentStatus!=='Terminated');

  // MD / Approver is the default approver for HR actions.
  window.approvalPermissions={...(window.approvalPermissions||{}),
    'Time Sheet Approval':['MD / Approver','Management'],
    'Leave Approval':['MD / Approver','Management'],
    'Loan Approval':['MD / Approver','Management'],
    'Transfer Approval':['MD / Approver','Management']
  };
  if(window.rolePermissions)window.rolePermissions['MD / Approver']=[...new Set([...(window.rolePermissions['MD / Approver']||[]),'attendance','leave','hr','compensation','ess'])];

  function readFile(input,cb){
    const f=input?.files?.[0];if(!f){cb(null);return}
    if(f.size>2*1024*1024){alert('Please keep uploaded files at or below 2 MB in this browser build.');return}
    const r=new FileReader();r.onload=()=>cb({name:f.name,type:f.type,size:f.size,data:r.result});r.readAsDataURL(f)
  }
  function attachmentCell(a){return a&&a.data?'<button class="btn secondary" data-name="'+esc0(a.name)+'" data-data="'+a.data+'" onclick="downloadAttachmentV191(this.dataset.name,this.dataset.data)">Download</button>':'—'}
  window.downloadAttachmentV191=function(name,data){const a=document.createElement('a');a.href=data;a.download=name||'attachment';a.click()};

  // Uniform, always-visible navigation. No hamburger/collapse control.
  window.buildNav=function(){
    const nav=document.getElementById('mainNav');if(!nav)return;
    const item=(id,label,icon)=>`<button class="nav-item" data-page="${id}" onclick="navGoV191('${id}',this)"><span class="nav-icon">${icon}</span><span class="nav-label">${label}</span></button>`;
    const group=(key,title,icon,items)=>`<div class="nav-group" data-group="${key}"><button class="nav-group-btn" onclick="toggleNavGroupV191('${key}')"><span class="nav-group-title"><span class="nav-icon">${icon}</span><span class="nav-label">${title}</span></span><span class="nav-chevron">▾</span></button><div class="nav-submenu">${items.map(x=>item(x[0],x[1],x[2])).join('')}</div></div>`;
    nav.innerHTML=
      item('dashboard','Dashboard','▦')+
      item('employees','Employee Management','👥')+
      group('payroll','Payroll & Payment Management','₦',[['paycycles','Payroll Cycle','↻'],['payslips','Payslips','▤']])+
      group('attendance','Attendance & Time Management','◷',[['attendance2','Attendance','✓'],['timeTracker','Time Sheet','◴'],['weeklyTimesheet','Weekly Timesheet','▦']])+
      group('hr','HR','▣',[['hrrecords','HR Records','▣'],['lifecycle','HR Actions','⚙'],['compensation','Compensation','◆']])+
      item('ess','Employee Portal','♙')+
      group('admin','Administration','◉',[['security','Users & Security','◉'],['reports','Reports','▤'],['audit','Audit Log','⌁'],['settings','Settings','⚙']]);
    document.querySelectorAll('.side-toggle,.mobile-menu,.nav-hamburger').forEach(x=>x.remove());
    if(!document.querySelector('.mobile-menu')){
      const btn=document.createElement('button');btn.className='mobile-menu';btn.type='button';btn.setAttribute('aria-label','Open navigation');btn.setAttribute('aria-expanded','false');btn.textContent='☰';
      btn.addEventListener('click',window.toggleMobileNavV191);
      document.querySelector('header')?.prepend(btn);
    }
    if(!document.querySelector('.mobile-nav-backdrop')){
      const backdrop=document.createElement('div');backdrop.className='mobile-nav-backdrop';backdrop.addEventListener('click',window.closeMobileNavV191);document.body.appendChild(backdrop);
    }
  };
  window.closeMobileNavV191=function(){
    const nav=document.getElementById('mainNav');
    if(nav)nav.classList.remove('open');
    document.body.classList.remove('mobile-nav-open');
    document.querySelectorAll('.mobile-menu').forEach(btn=>btn.setAttribute('aria-expanded','false'));
  };
  window.toggleMobileNavV191=function(){
    const nav=document.getElementById('mainNav');
    if(!nav)return;
    const open=!nav.classList.contains('open');
    if(open){
      nav.classList.add('open');
      document.body.classList.add('mobile-nav-open');
      document.querySelectorAll('.mobile-menu').forEach(btn=>btn.setAttribute('aria-expanded','true'));
    }else{
      window.closeMobileNavV191();
    }
  };
  window.navGoV191=function(id,btn){
    // A navigation destination selected from the mobile drawer must close the drawer
    // before the page renderer runs, so a re-render cannot leave it open.
    window.closeMobileNavV191();
    if(typeof window.showPage==='function')window.showPage(id,btn);
    document.querySelectorAll('#mainNav .nav-item').forEach(b=>b.classList.remove('active'));btn?.classList.add('active');
    document.querySelectorAll('#mainNav .nav-group').forEach(g=>{const c=g.querySelector(`[data-page="${id}"]`);if(c){g.classList.add('open','active-group');c.classList.add('active')}});
    if(id==='timeTracker'&&typeof window.showTimeTrackerV19==='function')window.showTimeTrackerV19()
    if(id==='weeklyTimesheet'&&typeof window.renderWeeklyTimesheet==='function')window.renderWeeklyTimesheet()
    if(id==='security'&&typeof window.loadRealUsers==='function')window.loadRealUsers()
  };
  window.toggleNavGroupV191=function(key){document.querySelector(`#mainNav .nav-group[data-group="${key}"]`)?.classList.toggle('open')};

  // Employee Portal
  window.showEmployeePortal=function(id){
    const e=db.employees.find(x=>x.id===id);if(!e){alert('Employee not found.');return}
    db.essUsers=db.essUsers||{};const u=db.essUsers[id]||(db.essUsers[id]={enabled:true,lastAccess:''});u.lastAccess=new Date().toISOString();save();closeModal();
    const req=(db.employeeRequests||[]).filter(x=>x.emp===id),pays=db.payroll?.items?.filter(x=>x.id===id)||[],loanList=(db.loans||[]).filter(x=>x.emp===id);
    const outstanding=loanList.reduce((s,l)=>s+Number(l.outstanding||0),0),monthlyDed=loanList.filter(l=>l.status==='Active').reduce((s,l)=>s+Number(l.monthlyDeduction||0),0);
    const thisMonth=todayISO().slice(0,7),thisYear=todayISO().slice(0,4);
    const daysThisMonth=monthlyPresentDays(id,thisMonth),daysThisYear=yearlyPresentDays(id,thisYear),workingDaysThisMonth=workingDaysSoFarInMonth(thisMonth);
    openModal(`<div class="portal">
      <div style="border-bottom:2px solid #9db5a8;padding-bottom:10px;margin-bottom:15px"><h2 style="margin:0">${esc0(e.name)}</h2><div>${esc0(e.id)} · ${esc0(e.dept||'—')} · ${esc0(e.position||'—')}</div></div>
      <div class="grid">
        <div class="card"><div class="label">Current Monthly Gross</div><div class="metric">${money0((Number(e.basic)||0)+(Number(e.housing)||0)+(Number(e.transport)||0)+(Number(e.other)||0))}</div></div>
        <div class="card"><div class="label">Pending Requests</div><div class="metric">${req.filter(x=>x.status==='Pending').length}</div></div>
        <div class="card"><div class="label">Loan Outstanding</div><div class="metric">${money0(outstanding)}</div></div>
        <div class="card"><div class="label">Monthly Loan Deduction</div><div class="metric">${money0(monthlyDed)}</div></div>
      </div>
      <div class="grid">
        <div class="card"><div class="label">Days Present This Month</div><div class="metric">${daysThisMonth} / ${workingDaysThisMonth}</div></div>
        <div class="card"><div class="label">Days Present This Year</div><div class="metric">${daysThisYear}</div></div>
      </div>
      <h3>My Payslips</h3><table><tr><th>Period</th><th>Gross</th><th>Net</th><th>Action</th></tr>
      ${pays.map(x=>`<tr><td>${esc0(db.payroll.displayMonth||db.payroll.month)}</td><td>${money0(x.gross)}</td><td>${money0(x.netPay)}</td><td><button class="btn secondary" onclick="showPayslip('${esc0(id)}')">View / Print</button></td></tr>`).join('')||'<tr><td colspan="4">No payslips currently available.</td></tr>'}</table>
      <h3>My Requests</h3><table><tr><th>Type</th><th>Period / Amount</th><th>Status</th><th>Attachment</th></tr>
      ${req.map(x=>`<tr><td>${esc0(x.subType||x.type)}</td><td>${x.type==='Loan'?money0(x.amount):x.type==='Leave'?esc0(x.start+' to '+x.end):esc0(x.requestedDepartment||'Transfer request')}</td><td><span class="v191-pill ${x.status==='Pending'?'pending':x.status==='Rejected'?'rejected':''}">${esc0(x.status)}</span></td><td>${attachmentCell(x.attachment)}</td></tr>`).join('')||'<tr><td colspan="4">No requests.</td></tr>'}</table>
      <h3>My Loan Details</h3><table><tr><th>Loan</th><th>Approved</th><th>Monthly Deduction</th><th>Outstanding</th><th>Status</th></tr>
      ${loanList.map(l=>`<tr><td>${esc0(l.id)}</td><td>${money0(l.approvedAmount)}</td><td>${money0(l.monthlyDeduction)}</td><td>${money0(l.outstanding)}</td><td>${esc0(l.status)}</td></tr>`).join('')||'<tr><td colspan="5">No active or historical loans.</td></tr>'}</table>
      <div class="toolbar"><button class="btn primary" onclick="openEmployeeLoanRequestV191('${esc0(id)}')">Request Loan</button><button class="btn secondary" onclick="openEmployeeTransferRequestV191('${esc0(id)}')">Request Transfer</button>
      ${loanList.length?`<button class="btn secondary" onclick="downloadLoanStatementV191('${esc0(id)}')">Download Loan Details</button><button class="btn success" onclick="printLoanStatementV191('${esc0(id)}')">Print Loan Details</button>`:''}
      <button class="btn secondary" onclick="closeModal()">Close Portal</button></div>
    </div>`);
  };

  window.openEmployeeLoanRequestV191=function(id){
    const e=db.employees.find(x=>x.id===id);
    openModal(`<h3>Loan Request — ${esc0(e.name)}</h3><div class="grid"><label>Loan Amount (₦)<input id="v191LoanAmount" type="number" min="1" step="1000"></label><label>Requested Repayment Term (Months)<input id="v191LoanTerm" type="number" min="1" max="60" value="12"></label><label>Reason<input id="v191LoanReason"></label></div>
    <div class="v191-upload"><label>Upload Loan Request Letter <input id="v191LoanFile" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"></label></div>
    <div class="toolbar"><button class="btn primary" onclick="submitLoanV191('${esc0(id)}')">Submit Loan Request</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`)
  };
  window.submitLoanV191=function(id){
    const amount=Number(document.getElementById('v191LoanAmount').value||0),term=Number(document.getElementById('v191LoanTerm').value||0);if(amount<=0||term<=0){alert('Enter a valid loan amount and repayment term.');return}
    readFile(document.getElementById('v191LoanFile'),a=>{const emp=db.employees.find(x=>x.id===id);db.employeeRequests=db.employeeRequests||[];
      db.employeeRequests.push({id:'REQ-LOAN-'+Date.now(),type:'Loan',subType:'Loan Request',emp:id,name:emp.name,amount,requestedTerm:term,reason:document.getElementById('v191LoanReason').value,status:'Pending',attachment:a,createdAt:new Date().toISOString(),requestedBy:emp.name});
      log('Employee loan request submitted',`${emp.name} — ${money0(amount)}`);save();closeModal();render()})
  };
  window.openEmployeeTransferRequestV191=function(id){
    const e=db.employees.find(x=>x.id===id);
    openModal(`<h3>Transfer Request — ${esc0(e.name)}</h3><div class="grid"><label>Requested Department<input id="v191TransferDept"></label><label>Reason<input id="v191TransferReason"></label></div><div class="toolbar"><button class="btn primary" onclick="submitTransferV191('${esc0(id)}')">Submit for MD Approval</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`)
  };
  window.submitTransferV191=function(id){
    const emp=db.employees.find(x=>x.id===id),department=document.getElementById('v191TransferDept').value.trim();if(!department){alert('Requested department is required.');return}
    db.employeeRequests=db.employeeRequests||[];db.employeeRequests.push({id:'REQ-TR-'+Date.now(),type:'Transfer',subType:'Transfer Request',emp:id,name:emp.name,requestedDepartment:department,reason:document.getElementById('v191TransferReason').value,status:'Pending',createdAt:new Date().toISOString(),requestedBy:emp.name});
    log('Employee transfer request submitted',`${emp.name} — ${department}`);save();closeModal();render()
  };

  function approveRequest(id,kind){
    const r=(db.employeeRequests||[]).find(x=>x.id===id);if(!r)return;const u=activeSystemUser();
    const action=kind==='Leave'?'Leave Approval':kind==='Loan'?'Loan Approval':'Transfer Approval';
    if(!normalizeRoles(u).some(r=>['MD / Approver','Management','Super Admin'].includes(r))){alert('Only the MD/Approver, Management or Super Admin role can approve this request.');return}
    if((r.requestedBy===u.username||r.requestedBy===u.name)&&!normalizeRoles(u).includes('Super Admin')){alert('Segregation of duties: the requester cannot approve their own request.');return}
    r.status='Approved';r.approvedBy=u.username||u.name;r.approvedAt=new Date().toISOString();
    if(kind==='Loan'){
      const approvedAmount=Number(r.amount||0),term=Math.max(1,Number(r.requestedTerm||12)),monthly=Math.ceil(approvedAmount/term);
      db.loans=db.loans||[];const loan={id:'LN-'+Date.now(),requestId:r.id,emp:r.emp,name:r.name,approvedAmount,monthlyDeduction:monthly,outstanding:approvedAmount,status:'Active',approvedBy:r.approvedBy,approvedAt:r.approvedAt,termMonths:term,startMonth:localDateISO().slice(0,7)};
      db.loans.push(loan);db.deductions=db.deductions||[];db.deductions.push({id:'DED-LOAN-'+Date.now(),emp:r.emp,type:'Loan',amount:monthly,startDate:localDateISO(),status:'Active',loanId:loan.id,description:'Employee loan repayment'})
    }
    if(kind==='Transfer'){const e=db.employees.find(x=>x.id===r.emp);if(e)e.dept=r.requestedDepartment}
    log(`${kind} request approved`,`${r.name} — ${r.id}`);save();render()
  }
  function rejectRequest(id,kind){
    const r=(db.employeeRequests||[]).find(x=>x.id===id);if(!r)return;const u=activeSystemUser();
    const action=kind==='Leave'?'Leave Approval':kind==='Loan'?'Loan Approval':'Transfer Approval';
    if(!normalizeRoles(u).some(r=>['MD / Approver','Management','Super Admin'].includes(r))){alert('Only the MD/Approver, Management or Super Admin role can reject this request.');return}
    r.status='Rejected';r.rejectedBy=u.username||u.name;r.rejectedAt=new Date().toISOString();log(`${kind} request rejected`,`${r.name} — ${r.id}`);save();render()
  }
  window.approveRequestV191=approveRequest;window.rejectRequestV191=rejectRequest;
  window.deleteRequestV191=function(id,kind){
    const r=(db.employeeRequests||[]).find(x=>x.id===id);if(!r)return;
    if(!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Only Super Admin can delete a request.');return}
    const linkedLoan=kind==='Loan'?(db.loans||[]).find(l=>l.requestId===id):null;
    const warning=linkedLoan?`This request already approved a loan of ${money0(linkedLoan.approvedAmount)} for ${r.name} that is currently active and deducting from payroll (${money0(linkedLoan.outstanding)} still outstanding). Deleting this will remove BOTH the request and that active loan, and stop any further deduction.`:`Delete this ${kind.toLowerCase()} request for ${r.name}?`;
    if(!confirm(warning+' This cannot be undone.'))return;
    if(linkedLoan){
      db.loans=(db.loans||[]).filter(l=>l.id!==linkedLoan.id);
      db.deductions=(db.deductions||[]).filter(d=>d.loanId!==linkedLoan.id);
    }
    db.employeeRequests=(db.employeeRequests||[]).filter(x=>x.id!==id);
    log(`${kind} request deleted`,`${r.name} — ${r.id}${linkedLoan?' (also removed linked active loan '+linkedLoan.id+')':''}`);
    save();render();
  };

  window.downloadLoanStatementV191=function(id){
    const e=db.employees.find(x=>x.id===id),ls=(db.loans||[]).filter(l=>l.emp===id);
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Loan Details</title><style>body{font-family:Arial;padding:30px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}</style></head><body><h2>${esc0(db.settings.companyName||'Marlum Nigeria Ltd.')}</h2><h3>Employee Loan Statement</h3><p><b>Employee:</b> ${esc0(e.name)} &nbsp; <b>ID:</b> ${esc0(e.id)}</p><table><tr><th>Loan ID</th><th>Approved</th><th>Monthly Deduction</th><th>Outstanding</th><th>Status</th></tr>${ls.map(l=>`<tr><td>${esc0(l.id)}</td><td>${money0(l.approvedAmount)}</td><td>${money0(l.monthlyDeduction)}</td><td>${money0(l.outstanding)}</td><td>${esc0(l.status)}</td></tr>`).join('')}</table></body></html>`;
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html'}));a.download=`loan-details-${e.id}.html`;a.click()
  };
  window.printLoanStatementV191=function(id){
    const e=db.employees.find(x=>x.id===id),ls=(db.loans||[]).filter(l=>l.emp===id),w=window.open('','_blank');if(!w){alert('Please allow pop-ups to print the loan statement.');return}
    w.document.write(`<html><head><title>Loan Details</title><style>body{font-family:Arial;padding:30px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px}</style></head><body><h2>${esc0(db.settings.companyName||'Marlum Nigeria Ltd.')}</h2><h3>Employee Loan Statement</h3><p>${esc0(e.name)} (${esc0(e.id)})</p><table><tr><th>Loan ID</th><th>Approved</th><th>Monthly Deduction</th><th>Outstanding</th><th>Status</th></tr>${ls.map(l=>`<tr><td>${esc0(l.id)}</td><td>${money0(l.approvedAmount)}</td><td>${money0(l.monthlyDeduction)}</td><td>${money0(l.outstanding)}</td><td>${esc0(l.status)}</td></tr>`).join('')}</table></body></html>`);w.document.close();w.print()
  };

  function renderRequestInbox(){
    const sec=document.getElementById('lifecycle');if(!sec)return;let old=document.getElementById('v191RequestInbox');
    if(!old){old=document.createElement('div');old.id='v191RequestInbox';old.className='v191-inbox';sec.appendChild(old)}
    const req=db.employeeRequests||[],pending=req.filter(x=>x.status==='Pending'),ts=(db.timeSheetApprovals||[]).filter(x=>x.status==='Pending');
    old.innerHTML=`<div class="card"><h3>Employee Portal Requests — HR Action Inbox</h3><p class="label">The MD / Approver controls approval of Loan, Transfer and Time Sheet requests. HR can monitor the queue and supporting documents.</p>
    <div class="grid"><div class="card"><div class="label">Pending Loans</div><div class="metric">${pending.filter(x=>x.type==='Loan').length}</div></div><div class="card"><div class="label">Pending Transfers</div><div class="metric">${pending.filter(x=>x.type==='Transfer').length}</div></div><div class="card"><div class="label">Pending Time Sheets</div><div class="metric">${ts.length}</div></div></div>
    ${req.slice().reverse().map(r=>`<div class="v191-request-card"><div class="v191-request-head"><div><b>${esc0(r.name)}</b> · ${esc0(r.subType||r.type)}<div class="v191-muted">${r.type==='Loan'?money0(r.amount):r.type==='Leave'?esc0(r.start+' to '+r.end):esc0(r.requestedDepartment||'')}</div></div><span class="v191-pill ${r.status==='Pending'?'pending':r.status==='Rejected'?'rejected':''}">${esc0(r.status)}</span></div><div class="v191-muted">Submitted ${r.createdAt?new Date(r.createdAt).toLocaleString():''}${r.attachment?' · Supporting document attached':''}</div><div class="v191-actions">${r.attachment?attachmentCell(r.attachment):''}${r.status==='Pending'?`<button class="btn success" onclick="approveRequestV191('${esc0(r.id)}','${esc0(r.type)}')">Approve</button><button class="btn danger" onclick="rejectRequestV191('${esc0(r.id)}','${esc0(r.type)}')">Reject</button>`:`<button class="btn danger" onclick="deleteRequestV191('${esc0(r.id)}','${esc0(r.type)}')">Delete</button>`}</div></div>`).join('')||'<p class="label">No employee portal requests.</p>'}
    ${ts.map(x=>`<div class="v191-request-card"><div class="v191-request-head"><div><b>${esc0(x.name)}</b> · Time Sheet<div class="v191-muted">${esc0(x.date)} · ${Number(x.hours||0).toFixed(2)} hours · OT ${Number(x.overtimeHours||0).toFixed(2)}h</div></div><span class="v191-pill pending">Pending</span></div><div class="v191-actions"><button class="btn success" onclick="approveTimeSheetV191('${esc0(x.id)}')">Approve</button><button class="btn danger" onclick="rejectTimeSheetV191('${esc0(x.id)}')">Reject</button></div></div>`).join('')}</div>`
  }

  function renderLoanReport(){
    const sec=document.getElementById('reports');if(!sec)return;let old=document.getElementById('v191LoanReport');
    if(!old){old=document.createElement('div');old.id='v191LoanReport';old.className='card v191-section';sec.appendChild(old)}
    const ls=db.loans||[];
    const canManage=normalizeRoles(activeSystemUser()).includes('Super Admin');
    old.innerHTML=`<h3>Employee Loan Report</h3><div class="toolbar"><button class="btn secondary" onclick="printAllLoanReportV191()">Print Loan Report</button><button class="btn primary" onclick="downloadAllLoanReportV191()">Download Loan Report</button></div><table><tr><th>Employee</th><th>Loan ID</th><th>Approved</th><th>Monthly Deduction</th><th>Outstanding</th><th>Status</th>${canManage?'<th>Action</th>':''}</tr>${ls.map(l=>`<tr><td>${esc0(l.name)}</td><td>${esc0(l.id)}</td><td>${money0(l.approvedAmount)}</td><td>${money0(l.monthlyDeduction)}</td><td>${money0(l.outstanding)}</td><td>${esc0(l.status)}</td>${canManage?`<td><button class="btn secondary" onclick="openEditLoan('${esc0(l.id)}')">Edit</button> <button class="btn danger" onclick="deleteLoanRecord('${esc0(l.id)}')">Delete</button></td>`:''}</tr>`).join('')||`<tr><td colspan="${canManage?7:6}">No employee loans recorded.</td></tr>`}</table>`
  }
  function loanReportHTML(){const ls=db.loans||[];return `<!doctype html><html><head><meta charset="utf-8"><title>Marlum Employee Loan Report</title><style>body{font-family:Arial;padding:25px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:7px;text-align:left}</style></head><body><h2>${esc0(db.settings.companyName||'Marlum Nigeria Ltd.')}</h2><h3>Employee Loan Report</h3><table><tr><th>Employee</th><th>Loan ID</th><th>Approved</th><th>Monthly Deduction</th><th>Outstanding</th><th>Status</th></tr>${ls.map(l=>`<tr><td>${esc0(l.name)}</td><td>${esc0(l.id)}</td><td>${money0(l.approvedAmount)}</td><td>${money0(l.monthlyDeduction)}</td><td>${money0(l.outstanding)}</td><td>${esc0(l.status)}</td></tr>`).join('')}</table></body></html>`}
  window.openEditLoan=function(loanId){
    if(!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Only a Super Admin can edit or delete a loan record.');return}
    const l=(db.loans||[]).find(x=>x.id===loanId);if(!l)return;
    openModal(`<h3>Edit Loan — ${esc0(l.name)}</h3>
    <div class="grid">
      <label>Approved Amount<input id="elAmount" type="number" min="0" step="0.01" value="${l.approvedAmount}"></label>
      <label>Monthly Deduction<input id="elMonthly" type="number" min="0" step="0.01" value="${l.monthlyDeduction}"></label>
      <label>Outstanding Balance<input id="elOutstanding" type="number" min="0" step="0.01" value="${l.outstanding}"></label>
      <label>Status<select id="elStatus"><option ${l.status==='Active'?'selected':''}>Active</option><option ${l.status==='Paid Off'?'selected':''}>Paid Off</option><option ${l.status==='Cancelled'?'selected':''}>Cancelled</option></select></label>
    </div>
    <p class="label">Changes here update the loan record, the linked payroll deduction (so future payroll cycles deduct the correct amount), and this employee's own Employee Self-Service portal — all three stay in sync.</p>
    <div class="toolbar"><button class="btn primary" onclick="saveEditLoan('${esc0(loanId)}')">Save Changes</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
  };
  window.saveEditLoan=function(loanId){
    if(!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Only a Super Admin can edit or delete a loan record.');return}
    const l=(db.loans||[]).find(x=>x.id===loanId);if(!l)return;
    const amount=Number(document.getElementById('elAmount').value||0),monthly=Number(document.getElementById('elMonthly').value||0),outstanding=Number(document.getElementById('elOutstanding').value||0),status=document.getElementById('elStatus').value;
    if(amount<0||monthly<0||outstanding<0){alert('Enter valid, non-negative amounts.');return}
    l.approvedAmount=amount;l.monthlyDeduction=monthly;l.outstanding=outstanding;l.status=status;
    // Keep the linked payroll deduction in sync — this is what payroll cycle calculation actually
    // reads (deductionsFor()), not the loan record directly, so an edit here that stopped at the
    // loan object alone would silently leave the old, wrong amount still being deducted.
    const ded=(db.deductions||[]).find(d=>d.loanId===loanId);
    if(ded){ded.amount=monthly;ded.status=status==='Active'?'Active':'Cancelled'}
    log('Loan record edited',`${l.name} — ${l.id} — ${money(monthly)}/month, ${money(outstanding)} outstanding, ${status}`);
    save();closeModal();render();
  };
  window.deleteLoanRecord=function(loanId){
    if(!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Only a Super Admin can edit or delete a loan record.');return}
    const l=(db.loans||[]).find(x=>x.id===loanId);if(!l)return;
    if(!confirm(`Permanently delete this loan record for ${l.name} (${money(l.outstanding)} outstanding)? This also stops any further payroll deduction for it. This cannot be undone.`))return;
    db.loans=(db.loans||[]).filter(x=>x.id!==loanId);
    db.deductions=(db.deductions||[]).filter(d=>d.loanId!==loanId);
    log('Loan record deleted',`${l.name} — ${l.id} — ${money(l.outstanding)} outstanding at time of deletion`);
    save();render();
  };
  window.printAllLoanReportV191=function(){const w=window.open('','_blank');if(!w){alert('Please allow pop-ups to print.');return}w.document.write(loanReportHTML());w.document.close();w.print()};
  window.downloadAllLoanReportV191=function(){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([loanReportHTML()],{type:'text/html'}));a.download='marlum-employee-loan-report.html';a.click()};

  // (The two overrides that used to sit here — wrapping window.createPayroll to also apply loan
  // repayment, and window.lockPayroll to reduce a loan's outstanding balance on lock — are removed
  // along with the functions they wrapped. Both were already fully inert regardless, since db.payroll
  // is always undefined; nothing here is a live feature. The equivalent, correct loan-repayment logic
  // for the real, current system lives in lockPayrollCycle, already verified working.)

  // Time Sheet approval is an explicit MD/Approver-controlled workflow.
  function buildTimeSheetApprovals(){
    db.timeSheetApprovals=db.timeSheetApprovals||[];const d=localDateISO();
    for(const e of active()){
      const r=(db.timeTrackerRecords||[]).find(x=>x.emp===e.id&&x.date===d);
      if(r&&!db.timeSheetApprovals.some(x=>x.emp===e.id&&x.date===d))db.timeSheetApprovals.push({id:'TS-'+Date.now()+'-'+e.id,emp:e.id,name:e.name,date:d,hours:Number(r.hours||0),overtimeHours:Number(r.overtimeHours||0),status:'Pending',createdAt:new Date().toISOString()})
    }
  }
  window.approveTimeSheetV191=function(id){
    const a=(db.timeSheetApprovals||[]).find(x=>x.id===id);if(!a)return;const u=activeSystemUser();
    if(!normalizeRoles(u).some(r=>['MD / Approver','Management','Super Admin'].includes(r))){alert('Only the MD/Approver, Management or Super Admin role can approve time sheets.');return}
    a.status='Approved';a.approvedBy=u.username||u.name;a.approvedAt=new Date().toISOString();const t=(db.timeTrackerRecords||[]).find(x=>x.emp===a.emp&&x.date===a.date);if(t)t.approvalStatus='Approved';log('Time Sheet approved',`${a.name} — ${a.date}`);save();render()
  };
  window.rejectTimeSheetV191=function(id){
    const a=(db.timeSheetApprovals||[]).find(x=>x.id===id);if(!a)return;const u=activeSystemUser();
    if(!normalizeRoles(u).some(r=>['MD / Approver','Management','Super Admin'].includes(r))){alert('Only the MD/Approver, Management or Super Admin role can reject time sheets.');return}
    a.status='Rejected';a.approvedBy=u.username||u.name;a.approvedAt=new Date().toISOString();log('Time Sheet rejected',`${a.name} — ${a.date}`);save();render()
  };

  const oldRender=window.render;
  window.render=function(){if(typeof oldRender==='function')oldRender();buildTimeSheetApprovals();renderRequestInbox();renderLoanReport()};
  const t=document.querySelector('#timeTracker h2');if(t)t.textContent='Time Sheet';
  const d=document.querySelector('#timeTracker .v19-section-head .label');if(d)d.textContent='Record, review and approve employee time sheets and overtime.';
  const life=document.querySelector('#lifecycle h2');if(life)life.textContent='HR Actions & Approvals';
  const payrollNotice=document.querySelector('#payroll .notice');if(payrollNotice)payrollNotice.innerHTML='<b>Payroll frequency:</b> Casual staff are calculated daily and paid weekly; Fixed Salary staff are paid monthly. Approved attendance and Time Sheet overtime are read automatically into payroll. Approved employee loans are deducted until fully repaid.';
  buildNav();
  setTimeout(()=>{document.querySelectorAll('.side-toggle,.mobile-menu,.nav-hamburger').forEach(x=>x.remove());
    if(!document.querySelector('.mobile-menu')){
      const btn=document.createElement('button');btn.className='mobile-menu';btn.type='button';btn.setAttribute('aria-label','Open navigation');btn.setAttribute('aria-expanded','false');btn.textContent='☰';
      btn.addEventListener('click',window.toggleMobileNavV191);
      document.querySelector('header')?.prepend(btn);
    }
    if(!document.querySelector('.mobile-nav-backdrop')){
      const backdrop=document.createElement('div');backdrop.className='mobile-nav-backdrop';backdrop.addEventListener('click',window.closeMobileNavV191);document.body.appendChild(backdrop);
    }try{window.render()}catch(e){console.error(e)}},30);
})();
