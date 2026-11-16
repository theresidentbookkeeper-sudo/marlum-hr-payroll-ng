
(function(){
  'use strict';
  // ------------------------------------------------------------------------------------------------
  // Payroll cycle pages. Every stage of a payroll cycle is its own page (no pop-ups):
  //   Setup > Prepare > Review > Approve > Lock > Bank payment > Confirm & reconcile
  // The business rules (who may do what, segregation of duties, status changes, loan balances) still
  // live in the original functions (submitPayrollCycle, reviewPayrollCycle, ...). These pages only
  // show the right information for each stage and call those same functions, so nothing about the
  // rules themselves changed.
  // ------------------------------------------------------------------------------------------------
  const db=window.__marlumDB;
  if(!db)return;
  const STAGES=[
    {key:'setup',label:'Setup'},{key:'prepare',label:'Prepare'},{key:'review',label:'Review'},
    {key:'approve',label:'Approve'},{key:'lock',label:'Lock'},{key:'bank',label:'Bank payment'},
    {key:'confirm',label:'Confirm & reconcile'}
  ];
  const ws={id:null,stage:null,sig:'',pushed:''};
  window.__cycleWs=ws;

  const $=id=>document.getElementById(id);
  const idx=k=>STAGES.findIndex(s=>s.key===k);
  const label=k=>(STAGES[idx(k)]||{}).label||k;
  const cycleById=id=>payrollCycles().find(c=>c.id===id);
  const batchOf=c=>c&&c.paymentBatchId?(paymentBatches().find(b=>b.id===c.paymentBatchId)||null):null;
  const isSuper=()=>normalizeRoles(activeSystemUser()).includes('Super Admin');
  const fmtTs=t=>t?String(t).slice(0,16).replace('T',' '):'';
  const who=action=>((typeof approvalPermissions!=='undefined'?approvalPermissions[action]:null)||[]).filter(r=>r!=='Super Admin').join(' or ')||'an authorised user';
  const names=list=>{const n=list.map(x=>x.name);return n.slice(0,6).join(', ')+(n.length>6?` and ${n.length-6} more`:'')};
  const qAttr=x=>esc((String(x.name||'')+' '+String(x.id||'')).toLowerCase());

  // ---- where a cycle is in its life ------------------------------------------------------------
  function curKey(c){
    switch(c.status){
      case 'Draft':return 'prepare';
      case 'Awaiting Review':return 'review';
      case 'Awaiting MD Approval':return 'approve';
      case 'Approved':return 'lock';
      case 'Locked':return 'bank';
      case 'Payment Batch Created':{const b=batchOf(c);return b&&['Submitted to Bank','Paid','Reconciled'].includes(b.status)?'confirm':'bank'}
    }
    return 'prepare';
  }
  window.cycleCurrentStageKey=curKey;
  const sigOf=c=>{const b=batchOf(c);return c.status+'|'+(b?b.status:'')};
  const complete=c=>{const b=batchOf(c);return !!b&&b.status==='Reconciled'};
  function stateOf(c,key){const ci=idx(curKey(c)),i=idx(key);if(i<ci)return 'done';if(i>ci)return 'todo';return complete(c)?'done':'current'}
  function statusText(c){
    const b=batchOf(c);
    if(c.status==='Payment Batch Created'&&b)return 'Bank payment: '+b.status;
    return c.status;
  }
  function statusClass(c){
    const b=batchOf(c);
    if(b&&b.status==='Reconciled')return 'ok';
    if(['Approved','Locked','Payment Batch Created'].includes(c.status))return 'info';
    if(c.status==='Draft')return '';
    return 'warn';
  }

  // ---- opening and leaving the pages -----------------------------------------------------------
  function canOpen(){return userPermissions(normalizeRoles(activeSystemUser())).includes('payroll')}
  function activatePage(){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    $('cycleWorkspace').classList.add('active');
    document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
    const nb=document.querySelector('#mainNav .nav-item[data-page="paycycles"]');if(nb)nb.classList.add('active');
  }
  window.showCycleWorkspace=function(id,stage,opts){
    opts=opts||{};
    if(!canOpen()){alert('Your current role does not include access to this section.');return}
    if(id===null||id===undefined){ws.id=null;ws.stage='create';ws.sig=''}
    else{
      const c=cycleById(id);if(!c){alert('That payroll cycle no longer exists.');return}
      ws.id=id;ws.stage=stage&&idx(stage)>=0?stage:curKey(c);ws.sig=sigOf(c);
      // never show a stage the cycle has not reached yet
      if(idx(ws.stage)>idx(curKey(c)))ws.stage=curKey(c);
    }
    activatePage();renderWorkspace();
    pushState(opts.silent);
    try{window.scrollTo(0,0)}catch(e){}
  };
  function pushState(silent){
    const key=(ws.id||'new')+'|'+ws.stage;
    if(silent||ws.pushed===key)return;
    ws.pushed=key;
    try{history.pushState({cycleWs:{id:ws.id,stage:ws.stage,create:!ws.id}},'')}catch(e){}
  }
  window.cycleWsGo=function(key){
    const c=cycleById(ws.id);if(!c)return;
    if(idx(key)>idx(curKey(c)))return;
    ws.stage=key;renderWorkspace();pushState();try{window.scrollTo(0,0)}catch(e){}
  };
  window.cycleWsBack=function(silent){
    ws.id=null;ws.stage=null;ws.sig='';
    const btn=document.querySelector('#mainNav .nav-item[data-page="paycycles"]');
    const go=window.navGoV191||window.showPage;
    if(typeof go==='function')go('paycycles',btn);
  };
  window.addEventListener('popstate',e=>{
    const st=e.state&&e.state.cycleWs;
    if(st&&st.create)window.showCycleWorkspace(null,'create',{silent:true});
    else if(st&&st.id&&cycleById(st.id))window.showCycleWorkspace(st.id,st.stage,{silent:true});
    else if($('cycleWorkspace')&&$('cycleWorkspace').classList.contains('active'))window.cycleWsBack(true);
  });

  // ---- small building blocks -------------------------------------------------------------------
  function totals(c){
    const g=c.employees.reduce((n,x)=>n+Number(x.gross||0),0),nt=c.employees.reduce((n,x)=>n+Number(x.netPay||0),0);
    return {gross:g,net:nt,ded:g-nt};
  }
  function summaryCards(c){
    const t=totals(c);
    return `<div class="grid">
      <div class="metric-card"><div class="label">Employees</div><div class="metric">${c.employees.length}</div></div>
      <div class="metric-card"><div class="label">Total gross</div><div class="metric">${money(t.gross)}</div></div>
      <div class="metric-card"><div class="label">Total deductions</div><div class="metric">${money(t.ded)}</div></div>
      <div class="metric-card"><div class="label">Total net pay</div><div class="metric">${money(t.net)}</div></div></div>`;
  }
  function deleteBtn(c){
    return (!c.paymentBatchId&&isSuper())?`<button class="btn danger" onclick="deletePayrollCycle('${esc(c.id)}')">Delete cycle</button>`:'';
  }
  const waiting=action=>`<p class="cyc-note">This step is done by the ${esc(who(action))}. The action button will appear here when it is your turn and you have that role.</p>`;
  const ownWork=c=>c.createdBy===activeSystemUser().username&&!isSuper();

  function checks(c){
    const emps=c.employees,weekly=c.type==='weekly_casual',out=[];
    const noAcct=emps.filter(x=>isBlankOrPlaceholder(x.accountNumber)||isBlankOrPlaceholder(x.accountName)||isBlankOrPlaceholder(x.bankName));
    const noCode=emps.filter(x=>!isBlankOrPlaceholder(x.bankName)&&!resolveBankCode(x.bankName));
    out.push({lvl:noAcct.length?'bad':'ok',title:'Bank account details complete',
      text:noAcct.length?`${noAcct.length} employee(s) have a missing account number, account name or bank name: ${names(noAcct)}.`:`All ${emps.length} employees have an account number, account name and bank name.`});
    out.push({lvl:noCode.length?'bad':'ok',title:'Bank names recognised',
      text:noCode.length?`${noCode.length} bank name(s) could not be matched to a bank code: ${names(noCode)}. Correct the bank name in Employee Management.`:'Every bank name matched a bank code automatically.'});
    if(weekly){
      const z=emps.filter(x=>Number(x.payableDays||0)<=0&&Number(x.overtimePay||0)<=0);
      out.push({lvl:z.length?'bad':'ok',title:'Everyone has payable days',
        text:z.length?`${z.length} casual employee(s) have no payable days: ${names(z)}. The cycle cannot be submitted until attendance is fixed.`:'Every casual employee has at least one payable day.'});
    }
    const zero=emps.filter(x=>Number(x.netPay||0)<=0);
    out.push({lvl:zero.length?'warn':'ok',title:'No zero net pay',
      text:zero.length?`${zero.length} employee(s) would receive ₦0: ${names(zero)}. Check whether that is expected (for example a loan repayment taking the whole pay).`:'Nobody has zero net pay.'});
    const loans=emps.filter(x=>Number(x.loanRepayment||0)>0);
    out.push({lvl:'info',title:'Loan repayments',
      text:loans.length?`${loans.length} loan repayment(s) totalling ${money(loans.reduce((n,x)=>n+Number(x.loanRepayment||0),0))} are included. Loan balances are reduced when the cycle is locked.`:'No loan repayments in this cycle.'});
    return out;
  }
  function checksCard(c){
    const list=checks(c),blocking=list.some(x=>x.lvl==='bad');
    const icon={ok:'✓',bad:'✕',warn:'!',info:'i'};
    return `<div class="card"><h3>Checks</h3>
      ${list.map(x=>`<div class="cyc-check ${x.lvl==='info'?'ok':x.lvl}"><span class="ic">${icon[x.lvl]}</span><div><b>${esc(x.title)}</b><div class="label">${esc(x.text)}</div></div></div>`).join('')}
      ${blocking?`<p class="cyc-note">A cycle is a snapshot taken when it was created. To fix an employee's details, correct them in Employee Management, then delete this cycle and create a fresh one so it picks up the correction.</p>`:''}</div>`;
  }
  function linesTable(c){
    const weekly=c.type==='weekly_casual';
    const head=weekly?['Employee','Daily rate','Payable days','OT hrs','OT pay','Bonus','Deductions','Gross','Net','Bank','Account']
                     :['Employee','Monthly salary','OT hrs','OT pay','Bonus','Deductions','Gross','Net','Bank','Account'];
    const t=totals(c);
    const rows=c.employees.map(x=>{
      const bad=hasIncompleteBankDetails(x),ded=Number(x.deduction||0)+Number(x.loanRepayment||0);
      const rate=weekly?money(x.dailyRate):money(Number(x.basic||0)+Number(x.housing||0)+Number(x.transport||0)+Number(x.other||0));
      return `<tr data-q="${qAttr(x)}"${bad?' class="cyc-warnrow"':''}><td><b>${esc(x.name)}</b><div class="cyc-id">${esc(x.id)}${x.workSite?' · '+esc(x.workSite):''}</div></td><td>${rate}</td>${weekly?`<td>${Number(x.payableDays||0)}</td>`:''}<td>${Number(x.overtimeHours||0).toFixed(2)}</td><td>${money(x.overtimePay||0)}</td><td>${money(x.bonus||0)}</td><td>${money(ded)}</td><td>${money(x.gross)}</td><td><b>${money(x.netPay)}</b></td><td>${esc(x.bankName||'—')}${bad?' <span class="cyc-badge bad" title="Missing or unrecognised bank details">check</span>':''}</td><td>${esc(x.accountNumber||'—')}</td></tr>`;
    }).join('');
    const span=head.length-4;
    return `<div class="cyc-tools"><input id="cycSearch" class="cyc-search" placeholder="Search by name or ID…" oninput="cycleWsFilter('cycRows','cycCount',this.value)"><span id="cycCount" class="label">${c.employees.length} employees</span></div>
      <div class="cyc-scroll"><table class="cyc-table"><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody id="cycRows">${rows}</tbody>
      <tfoot><tr><th colspan="${span-1}">Totals</th><th>${money(t.gross)}</th><th>${money(t.net)}</th><th colspan="2"></th></tr></tfoot></table></div>`;
  }
  window.cycleWsFilter=function(tbodyId,countId,q){
    q=String(q||'').trim().toLowerCase();
    const rows=[...document.querySelectorAll('#'+tbodyId+' tr')];let shown=0;
    rows.forEach(r=>{const ok=!q||(r.getAttribute('data-q')||'').includes(q);r.style.display=ok?'':'none';if(ok)shown++});
    const el=$(countId);if(el)el.textContent=q?`Showing ${shown} of ${rows.length}`:`${rows.length} employees`;
  };
  function trail(c){
    const b=batchOf(c);
    const rows=[['Prepared',c.createdBy,c.createdAt],['Submitted for review','',c.submittedAt],['Reviewed',c.reviewedBy,c.reviewedAt],['Approved',c.approvedBy,c.approvedAt],['Locked',c.lockedBy,c.lockedAt]];
    if(b)rows.push(['Bank batch created',c.lockedBy&&'',b.createdAt],['Payment file generated',b.processedBy,b.processedAt],['Submitted to bank','',b.submittedAt],['Marked paid','',b.paidAt],['Reconciled','',b.status==='Reconciled'?(b.reconciledDate||'done'):'']);
    return `<ul class="cyc-trail">${rows.map(([l,by,at])=>`<li class="${at?'on':''}"><span>${l}</span><small>${at?esc([by,fmtTs(at)].filter(Boolean).join(' · ')):'—'}</small></li>`).join('')}</ul>`;
  }
  function asideHtml(c){
    const t=totals(c);
    return `<div class="card"><h3>This cycle</h3><table>
      <tr><th>Type</th><td>${esc(cycleTypeLabel(c.type))}</td></tr><tr><th>Period</th><td>${esc(c.start)} to ${esc(c.end)}</td></tr>
      <tr><th>Payment date</th><td>${esc(c.paymentDate)}</td></tr><tr><th>Employees</th><td>${c.employees.length}</td></tr>
      <tr><th>Total net</th><td>${money(t.net)}</td></tr></table></div>
      <div class="card"><h3>Sign-off trail</h3>${trail(c)}</div>`;
  }

  // ---- the stage pages -------------------------------------------------------------------------
  function createPage(){
    return `<div class="cyc-top"><button type="button" class="btn secondary" onclick="cycleWsBack()">← All payroll cycles</button></div>
      <h2>New payroll cycle</h2>${stepper(null,'setup')}
      <div class="card"><h3>Setup</h3>
        <div class="grid">
          <label>Payroll Type<select id="cycleType"><option value="weekly_casual">Weekly — Casual Staff</option><option value="monthly_fixed">Monthly — Fixed Salaries</option></select></label>
          <label>Period Start<input id="cycleStart" type="date" value="${todayISO()}"></label>
          <label>Period End<input id="cycleEnd" type="date" value="${todayISO()}"></label>
          <label>Payment Date<input id="cyclePayDate" type="date" value="${todayISO()}"></label>
        </div>
        <p class="label">Weekly Casual payroll uses each casual employee's daily rate multiplied by payable days, and only includes casual staff who have attendance recorded for the period. Monthly Fixed payroll uses the approved monthly Basic + Housing + Transport + Other salary structure.</p>
        <div class="toolbar"><button class="btn primary big" onclick="createPayrollCycle()">Create cycle and continue →</button><button class="btn secondary" onclick="cycleWsBack()">Cancel</button></div></div>`;
  }
  function stageSetup(c){
    const cur=curKey(c);
    return `${summaryCards(c)}<div class="card"><h3>Cycle setup</h3>
      <p>This is a <b>${esc(cycleTypeLabel(c.type))}</b> payroll for <b>${esc(c.start)}</b> to <b>${esc(c.end)}</b>, to be paid on <b>${esc(c.paymentDate)}</b>.</p>
      <p class="label">A cycle is a snapshot taken when it was created. Editing an employee record afterwards does not change it. If there is a data problem, correct the employee record first, then delete this cycle and create a fresh one.</p>
      <div class="cyc-actions"><button class="btn primary big" onclick="cycleWsGo('${cur}')">Continue to ${esc(label(cur))} →</button>${deleteBtn(c)}</div></div>`;
  }
  function adjustmentsCard(c,canEdit){
    const list=(db.cycleAdjustments||[]).filter(a=>a.cycleId===c.id&&a.status!=='Cancelled');
    const table=`<table><tr><th>Employee</th><th>Type</th><th>Amount</th><th>Description</th>${canEdit?'<th></th>':''}</tr>
      ${list.map(a=>`<tr><td>${esc(a.name)}</td><td>${esc(a.type)}</td><td>${money(a.amount)}</td><td>${esc(a.description||'')}</td>${canEdit?`<td><button class="btn danger" onclick="cancelCycleAdjustment('${esc(a.id)}','${esc(c.id)}')">Remove</button></td>`:''}</tr>`).join('')||`<tr><td colspan="${canEdit?5:4}">No adjustments.</td></tr>`}</table>`;
    if(!canEdit)return `<div class="card"><h3>One-off bonuses and deductions</h3>${table}</div>`;
    return `<div class="card"><h3>One-off bonuses and deductions</h3>
      <p class="label">Loan repayments and overtime are calculated automatically. Use this only for a one-off bonus or deduction that applies to this pay period.</p>
      <div class="grid">
        <label>Find employee<input id="cycAdjFind" placeholder="Type part of a name…" oninput="cycleWsAdjFind()"></label>
        <label>Employee<select id="cycAdjEmp">${c.employees.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label>
        <label>Type<select id="cycAdjType"><option>Bonus</option><option>Deduction</option></select></label>
        <label>Amount<input id="cycAdjAmount" type="number" min="0" step="0.01"></label>
        <label>Description<input id="cycAdjDesc" placeholder="e.g. Performance bonus, uniform cost"></label>
      </div>
      <div class="toolbar"><button class="btn primary" onclick="addCycleAdjustment('${esc(c.id)}')">Add adjustment</button></div>${table}</div>`;
  }
  window.cycleWsAdjFind=function(){
    const c=cycleById(ws.id),sel=$('cycAdjEmp');if(!c||!sel)return;
    const q=String($('cycAdjFind').value||'').trim().toLowerCase(),keep=sel.value;
    const list=c.employees.filter(x=>!q||String(x.name).toLowerCase().includes(q)||String(x.id).toLowerCase().includes(q)).slice(0,300);
    sel.innerHTML=list.map(x=>`<option value="${esc(x.id)}"${x.id===keep?' selected':''}>${esc(x.name)}</option>`).join('')||'<option value="">No match</option>';
  };
  function stagePrepare(c){
    const draft=c.status==='Draft',canPrep=userHasRoleFor('Payroll Preparation');
    let action;
    if(draft&&canPrep)action=`<div class="card cyc-action"><h3>Ready to send for review?</h3><p class="label">Submitting sends this cycle to the ${esc(who('Payroll Review'))} to check. You will not be able to change the figures afterwards.</p><div class="cyc-actions"><button class="btn primary big" onclick="submitPayrollCycle('${esc(c.id)}')">Submit for Review →</button>${deleteBtn(c)}</div></div>`;
    else if(draft)action=`<div class="card">${waiting('Payroll Preparation')}<div class="cyc-actions">${deleteBtn(c)}</div></div>`;
    else action=`<div class="card"><p class="cyc-note">✓ This cycle was submitted${c.submittedAt?' on '+esc(fmtTs(c.submittedAt)):''}, so the figures can no longer be changed.</p></div>`;
    return `${summaryCards(c)}${checksCard(c)}${adjustmentsCard(c,draft&&canPrep)}<div class="card"><h3>Employee pay lines</h3>${linesTable(c)}</div>${action}`;
  }
  function signoffStage(c,key,cfg){
    const at=curKey(c)===key&&c.status===cfg.status;
    let action='';
    if(at){
      if(!userHasRoleFor(cfg.role))action=`<div class="card">${waiting(cfg.role)}</div>`;
      else if(ownWork(c))action=`<div class="card"><p class="cyc-note"><b>Segregation of duties:</b> you prepared this payroll, so you cannot ${cfg.verb} it yourself. A different ${esc(who(cfg.role))} must do this step.</p><button class="btn primary big" disabled>${esc(cfg.button)}</button></div>`;
      else action=`<div class="card cyc-action"><h3>${esc(cfg.title)}</h3><p class="label">${cfg.help}</p><div class="cyc-actions"><button class="btn primary big" onclick="${cfg.fn}('${esc(c.id)}')">${esc(cfg.button)}</button></div></div>`;
    }else action=`<div class="card"><p class="cyc-note">✓ ${esc(cfg.done(c))}</p></div>`;
    return `${summaryCards(c)}${checksCard(c)}<div class="card"><h3>Employee pay lines</h3>${linesTable(c)}</div>${action}`;
  }
  const stageReview=c=>signoffStage(c,'review',{status:'Awaiting Review',role:'Payroll Review',verb:'review',fn:'reviewPayrollCycle',button:'Review & Forward →',title:'Review this payroll',help:'Check the figures and the checks above. Forwarding sends the cycle to the MD / Approver for approval.',done:c=>`Reviewed by ${c.reviewedBy||'—'}${c.reviewedAt?' on '+fmtTs(c.reviewedAt):''}.`});
  const stageApprove=c=>signoffStage(c,'approve',{status:'Awaiting MD Approval',role:'Payroll Approval',verb:'approve',fn:'approvePayrollCycle',button:'Approve Payroll →',title:'Approve this payroll',help:'Approving confirms these figures are correct and authorises payment.',done:c=>`Approved by ${c.approvedBy||'—'}${c.approvedAt?' on '+fmtTs(c.approvedAt):''}.`});
  function stageLock(c){
    const at=c.status==='Approved';
    const loans=c.employees.filter(x=>Number(x.loanRepayment||0)>0);
    const loanTable=loans.length?`<table><tr><th>Employee</th><th>Repayment this cycle</th><th>Loan balance now</th></tr>${loans.map(x=>{const l=(db.loans||[]).find(z=>z.emp===x.id&&z.status==='Active');return `<tr><td>${esc(x.name)}</td><td>${money(x.loanRepayment)}</td><td>${l?money(l.outstanding):'—'}</td></tr>`}).join('')}</table>`:'<p class="label">No loan repayments are included in this cycle.</p>';
    let action;
    if(at&&userHasRoleFor('Payment Processing'))action=`<div class="card cyc-action"><h3>Lock this payroll</h3><p class="label">Locking finalises the figures and applies the loan repayments above to each loan balance. It cannot be undone. After locking, the bank payment batch can be created.</p><div class="cyc-actions"><button class="btn primary big" onclick="lockPayrollCycle('${esc(c.id)}')">Lock Payroll →</button></div></div>`;
    else if(at)action=`<div class="card">${waiting('Payment Processing')}</div>`;
    else action=`<div class="card"><p class="cyc-note">✓ Locked by ${esc(c.lockedBy||'—')}${c.lockedAt?' on '+esc(fmtTs(c.lockedAt)):''}. Loan balances were updated at that moment.</p></div>`;
    return `${summaryCards(c)}<div class="card"><h3>Loan repayments</h3>${loanTable}</div>${action}`;
  }
  function fileCard(b){
    const cb=(db.settings&&db.settings.companyBank)||{},id=esc(b.id);
    const paying=cb.accountNumber?`<p class="label">Paying from: ${esc(cb.bankName||'')} — ${esc(cb.accountName||'')} — ${esc(cb.accountNumber||'')}</p>`:'<p class="label">No company payment account set — add one in Settings so it shows here for reference.</p>';
    const rows=b.items.map(x=>{const code=resolveBankCode(x.bankName);return `<tr data-q="${qAttr(x)}"><td>${esc(x.name)}</td><td>${esc(x.accountName)}</td><td>${esc(x.bankName)}</td><td${code?'':' style="color:#b00"'}>${code?esc(code):'Not recognized'}</td><td>${esc(x.accountNumber)}</td><td>${money(x.netPay)}</td></tr>`}).join('');
    return `<div class="card"><h3>Bank payment file</h3>${paying}
      <div class="toolbar"><button class="btn secondary" onclick="downloadBankUploadFile('${id}')">Download for Bank Upload</button><button class="btn secondary" onclick="downloadBankUploadPreviewText('${id}')">Preview as Text (safe to open)</button><button class="btn secondary" onclick="downloadBankUploadPreviewExcel('${id}')">Preview in Excel (safe to open)</button></div>
      <p class="label">This file matches Fidelity Bank's approved bulk-upload format: Beneficiary Bank Code, Beneficiary Account Number, Beneficiary Name, Amount, Narration. The bank code is looked up automatically from each employee's saved bank name — nothing to enter manually. If your bank changes their approved template, this format will need updating to match.</p>
      <p class="label"><strong>Before you upload:</strong> don't open the "Download for Bank Upload" file in Excel to check it — Excel silently strips leading zeros from bank codes and account numbers the moment it opens a CSV, even before you touch anything, and that damage can't be undone by reformatting the cell afterward. Use "Preview as Text" or "Preview in Excel" instead to check it safely — never upload either preview file to the bank itself, only the plain "Download for Bank Upload" file.</p>
      <div class="cyc-tools"><input class="cyc-search" placeholder="Search by name…" oninput="cycleWsFilter('cycFileRows','cycFileCount',this.value)"><span id="cycFileCount" class="label">${b.items.length} employees</span></div>
      <div class="cyc-scroll"><table class="cyc-table"><thead><tr><th>Employee</th><th>Account Name</th><th>Bank</th><th>Bank Code</th><th>Account Number</th><th>Amount</th></tr></thead><tbody id="cycFileRows">${rows}</tbody></table></div></div>`;
  }
  function batchCards(b){
    return `<div class="grid"><div class="metric-card"><div class="label">Batch</div><div class="metric" style="font-size:13px">${esc(b.id)}</div></div><div class="metric-card"><div class="label">Batch status</div><div class="metric" style="font-size:16px">${esc(b.status)}</div></div><div class="metric-card"><div class="label">Employees</div><div class="metric">${b.employeeCount}</div></div><div class="metric-card"><div class="label">Total to pay</div><div class="metric">${money(b.totalNet)}</div></div></div>`;
  }
  function stageBank(c){
    const b=batchOf(c),canPay=userHasRoleFor('Payment Processing');
    if(!b){
      const bad=c.employees.filter(hasIncompleteBankDetails);
      let action;
      if(!canPay)action=`<div class="card">${waiting('Payment Processing')}</div>`;
      else if(bad.length)action=`<div class="card"><p class="cyc-note"><b>The bank payment batch cannot be created yet.</b> ${bad.length} employee(s) have incomplete or unrecognised bank details: ${esc(names(bad))}. Correct them in Employee Management, then delete this cycle and create a fresh one.</p><button class="btn primary big" disabled>Create Bank Payment Batch</button></div>`;
      else action=`<div class="card cyc-action"><h3>Create the bank payment batch</h3><p class="label">This turns the locked payroll into a batch of ${c.employees.length} bank payments totalling ${money(totals(c).net)}, ready for the payment file.</p><div class="cyc-actions"><button class="btn primary big" onclick="createCyclePaymentBatch('${esc(c.id)}')">Create Bank Payment Batch →</button></div></div>`;
      return `${summaryCards(c)}${action}`;
    }
    let action='';
    if(b.status==='Approved'){
      action=canPay?`<div class="card cyc-action"><h3>Generate the bank payment file</h3><p class="label">Checks every employee's bank details and prepares the file you upload to the bank.</p><div class="cyc-actions"><button class="btn primary big" onclick="generateBankPaymentFile('${esc(b.id)}')">Generate Bank Payment →</button></div></div>`:`<div class="card">${waiting('Payment Processing')}</div>`;
      return `${batchCards(b)}${action}`;
    }
    if(b.status==='Processing'){
      action=canPay?`<div class="card cyc-action"><h3>After you have uploaded the file to the bank</h3><p class="label">Only mark it submitted once the file has actually been uploaded to the bank.</p><div class="cyc-actions"><button class="btn primary big" onclick="markPaymentSubmitted('${esc(b.id)}')">Mark Submitted to Bank →</button></div></div>`:`<div class="card">${waiting('Payment Processing')}</div>`;
    }else action=`<div class="card"><p class="cyc-note">✓ The file was submitted to the bank${b.submittedAt?' on '+esc(fmtTs(b.submittedAt)):''}. Continue on the "Confirm &amp; reconcile" step.</p><button class="btn primary" onclick="cycleWsGo('confirm')">Go to Confirm &amp; reconcile →</button></div>`;
    return `${batchCards(b)}${b.status==='Processing'?action+fileCard(b):fileCard(b)+action}`;
  }
  function failedCard(b,canPay){
    const failed=b.items.filter(x=>x.status==='Failed'),n=failed.length;
    const head=`<h3 id="cycFailedHead">Report Failed / Returned Payments ${n?`<span class="cyc-badge bad">${n} failed/returned</span>`:''}</h3>`;
    if(!(canPay&&b.status==='Paid')){
      const list=n?`<table><tr><th>Employee</th><th>Bank</th><th>Account</th><th>Amount</th><th>Reason</th></tr>${failed.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.bankName)}</td><td>${esc(x.accountNumber)}</td><td>${money(x.netPay)}</td><td>${esc(x.failedReason||'')}</td></tr>`).join('')}</table><div class="toolbar"><button class="btn secondary" onclick="downloadFailedPaymentsSchedule('${esc(b.id)}')">Download Failed Payments Schedule</button></div>`:'<p class="label">No failed or returned payments were reported for this batch.</p>';
      return `<div class="card" id="cycFailedSection">${head}${list}</div>`;
    }
    const rows=b.items.map((x,i)=>`<tr data-q="${qAttr(x)}"><td><input type="checkbox" id="fp_${i}" ${x.status==='Failed'?'checked':''}></td><td>${esc(x.name)}</td><td>${esc(x.bankName)}</td><td>${esc(x.accountNumber)}</td><td>${money(x.netPay)}</td><td><span class="cyc-badge ${x.status==='Paid'?'ok':x.status==='Failed'?'bad':'warn'}">${esc(x.status)}</span></td></tr>`).join('');
    return `<div class="card" id="cycFailedSection">${head}
      <p class="label">If the bank returned or rejected any payments, tick those people and save. This does not change anyone else's status — only the people you tick here. You get a corrected schedule to pay them again.</p>
      <div class="cyc-tools"><input class="cyc-search" placeholder="Search by name…" oninput="cycleWsFilter('cycFpRows','cycFpCount',this.value)"><span id="cycFpCount" class="label">${b.items.length} employees</span></div>
      <div class="cyc-scroll"><table class="cyc-table"><thead><tr><th></th><th>Employee</th><th>Bank</th><th>Account</th><th>Net Pay</th><th>Current Status</th></tr></thead><tbody id="cycFpRows">${rows}</tbody></table></div>
      <label>Reason (applied to everyone ticked above)<input id="fpReason" placeholder="e.g. Returned to company account — invalid account number"></label>
      <div class="toolbar"><button class="btn primary" onclick="saveFailedPayments('${esc(b.id)}')">Save &amp; Download Corrected Schedule</button>${n?`<button class="btn secondary" onclick="downloadFailedPaymentsSchedule('${esc(b.id)}')">Download Failed Payments Schedule</button>`:''}</div></div>`;
  }
  function stageConfirm(c){
    const b=batchOf(c);if(!b)return '<div class="card"><p class="cyc-note">The bank batch has not been created yet.</p></div>';
    const canPay=userHasRoleFor('Payment Processing');
    let bankBox;
    if(b.status==='Submitted to Bank')bankBox=canPay?`<div class="card cyc-action"><h3>Has the bank confirmed the payments?</h3><p class="label">When the bank confirms the transfers went through, mark the batch paid. You can then report any payments the bank returned and reconcile against the bank statement.</p><div class="cyc-actions"><button class="btn primary big" onclick="markPaymentPaid('${esc(b.id)}')">Mark Paid →</button></div></div>`:`<div class="card">${waiting('Payment Processing')}</div>`;
    else bankBox=`<div class="card"><p class="cyc-note">✓ Marked paid${b.paidAt?' on '+esc(fmtTs(b.paidAt)):''}.</p></div>`;
    let recon='';
    if(b.status==='Paid'){
      recon=canPay?`<div class="card cyc-action"><h3>Reconcile with the bank statement</h3><div class="grid">
        <label>Bank Reference<input id="reconRef" value="${esc(b.bankReference||'')}"></label>
        <label>Bank Amount<input id="reconAmount" type="number" value="${esc(b.bankAmount||b.totalNet)}"></label>
        <label>Bank Date<input id="reconDate" type="date" value="${esc(b.reconciledDate||todayISO())}"></label>
        <label>Bank Status<select id="reconStatus"><option ${b.bankStatus==='Matched'?'selected':''}>Matched</option><option ${b.bankStatus==='Partially Matched'?'selected':''}>Partially Matched</option><option ${b.bankStatus==='Exception'?'selected':''}>Exception</option></select></label></div>
        <p class="label">Choose <b>Matched</b> when the statement agrees with the batch total. That completes this payroll.</p>
        <div class="cyc-actions"><button class="btn primary big" onclick="saveReconciliation('${esc(b.id)}')">Save Reconciliation</button></div></div>`:`<div class="card">${waiting('Payment Processing')}</div>`;
    }else if(b.status==='Reconciled'){
      recon=`<div class="card"><h3>Reconciliation</h3><table><tr><th>Bank reference</th><td>${esc(b.bankReference||'—')}</td></tr><tr><th>Bank amount</th><td>${money(b.bankAmount)}</td></tr><tr><th>Bank date</th><td>${esc(b.reconciledDate||'—')}</td></tr><tr><th>Result</th><td>${esc(b.bankStatus||'—')}</td></tr></table><p class="cyc-note">✓ This payroll is complete.</p></div>`;
    }
    return `${batchCards(b)}${bankBox}${['Paid','Reconciled'].includes(b.status)?failedCard(b,canPay):''}${recon}`;
  }
  function stageHtml(c,key){
    switch(key){
      case 'setup':return stageSetup(c);case 'prepare':return stagePrepare(c);case 'review':return stageReview(c);
      case 'approve':return stageApprove(c);case 'lock':return stageLock(c);case 'bank':return stageBank(c);case 'confirm':return stageConfirm(c);
    }
    return '';
  }

  // ---- the frame: heading, step bar, page, side panel ------------------------------------------
  function stepper(c,active){
    return `<ol class="cyc-steps">${STAGES.map((s,i)=>{
      const st=c?stateOf(c,s.key):(s.key==='setup'?'current':'todo');
      const reach=!!c&&st!=='todo';
      return `<li class="cyc-step ${st}${s.key===active?' viewing':''}"><button type="button" ${reach?`onclick="cycleWsGo('${s.key}')"`:'disabled title="Not reached yet"'}><span class="cyc-dot">${st==='done'?'✓':(i+1)}</span><span class="cyc-label">${s.label}</span></button></li>`;
    }).join('')}</ol>`;
  }
  function renderWorkspace(){
    const root=$('cycleWorkspace');if(!root)return;
    if(ws.stage==='create'||!ws.id){root.innerHTML=createPage();return}
    const c=cycleById(ws.id);
    if(!c){window.cycleWsBack(true);return}
    const sig=sigOf(c);
    if(sig!==ws.sig){ws.sig=sig;ws.stage=curKey(c);pushState()}   // an action moved the cycle on: follow it to its new stage
    root.innerHTML=`<div class="cyc-top"><button type="button" class="btn secondary" onclick="cycleWsBack()">← All payroll cycles</button></div>
      <h2>${esc(cycleTypeLabel(c.type))} payroll · ${esc(c.id)}</h2>
      <p class="cyc-sub">Period <b>${esc(c.start)}</b> to <b>${esc(c.end)}</b> · Payment date <b>${esc(c.paymentDate)}</b> · <span class="cyc-badge ${statusClass(c)}">${esc(statusText(c))}</span></p>
      ${stepper(c,ws.stage)}
      <h3 class="cyc-stage-title">${esc(label(ws.stage))}</h3>
      <div class="cyc-layout"><div class="cyc-main">${stageHtml(c,ws.stage)}</div><aside class="cyc-aside">${asideHtml(c)}</aside></div>`;
  }

  // ---- failed / returned payments (restored) ---------------------------------------------------
  window.openReportFailedPayments=function(id){
    const b=paymentBatches().find(x=>x.id===id);if(!b)return;
    if(!userHasRoleFor('Payment Processing')){alert('Only an authorized payment processor can report failed payments.');return}
    const c=payrollCycles().find(x=>x.id===b.cycleId);
    if(!c){alert('The payroll cycle for this payment batch could not be found.');return}
    window.showCycleWorkspace(c.id,'confirm');
    setTimeout(()=>{const s=$('cycFailedSection');if(s&&s.scrollIntoView)s.scrollIntoView({behavior:'smooth',block:'start'})},60);
  };
  window.saveFailedPayments=function(id){
    const b=paymentBatches().find(x=>x.id===id);if(!b)return;
    if(!userHasRoleFor('Payment Processing')){alert('Only an authorized payment processor can report failed payments.');return}
    const reason=(($('fpReason')||{}).value||'').trim();
    let changed=0;
    b.items.forEach((x,i)=>{
      const box=$('fp_'+i),checked=!!(box&&box.checked);
      if(checked&&x.status!=='Failed'){x.status='Failed';x.failedReason=reason||'Returned/failed at bank';x.failedReportedAt=new Date().toISOString();changed++}
      else if(!checked&&x.status==='Failed'){x.status='Paid';x.failedReason=''}
    });
    log('Failed/returned payments reported',`${b.id} — ${changed} flagged as failed${reason?': '+reason:''}`);
    save();
    if(b.items.some(x=>x.status==='Failed'))window.downloadFailedPaymentsSchedule(id);
    render();
  };
  window.downloadFailedPaymentsSchedule=function(id){
    const b=paymentBatches().find(x=>x.id===id);if(!b)return;
    const failed=b.items.filter(x=>x.status==='Failed');
    if(!failed.length){alert('No employees are currently flagged as failed in this batch.');return}
    const rows=[['Employee Name','Bank','Account Number','Amount','Reason','Original Batch','Original Period']];
    failed.forEach(x=>rows.push([x.name,x.bankName,x.accountNumber,x.netPay,x.failedReason||'',b.id,b.period]));
    const csv=rows.map(r=>r.map(csvCell).join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download=`failed-payments-${b.id}.csv`;a.click();
    log('Failed payments schedule downloaded',`${b.id} — ${failed.length} employee(s)`);
  };

  // ---- the Payroll Cycles page: bank payments table --------------------------------------------
  function renderBankRows(){
    const el=$('pcReconRows');if(!el)return;
    el.innerHTML=paymentBatches().slice().reverse().map(b=>{
      const failed=(b.items||[]).filter(x=>x.status==='Failed').length,c=payrollCycles().find(x=>x.id===b.cycleId);
      return `<tr><td>${esc(b.id)}</td><td>${esc(cycleTypeLabel(b.type||'monthly_fixed'))}</td><td>${esc(b.period)}</td><td>${money(b.totalNet)}</td><td>${esc(b.status)}</td><td>${failed?`<span class="cyc-badge bad">${failed} failed/returned</span>`:'—'}</td><td>${c?`<button class="btn secondary" onclick="openPaymentBatch('${esc(b.id)}')">Open</button>`:'—'}</td></tr>`;
    }).join('')||'<tr><td colspan="7">No bank payments yet.</td></tr>';
  }
  const prevRender=window.render;
  window.render=function(){
    if(typeof prevRender==='function')prevRender();
    renderBankRows();
    const root=$('cycleWorkspace');
    if(root&&root.classList.contains('active'))renderWorkspace();
  };
  renderBankRows();
})();

