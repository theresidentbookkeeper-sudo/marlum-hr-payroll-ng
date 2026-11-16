
(function(){
  'use strict';
  const db=window.__marlumDB;
  if(!db){console.error('Marlum V27 layer could not access application state.');return;}
  // A browser that had this app open before Payroll was retired may still have a stale db.payroll
  // sitting in localStorage from an older schema version — the exact cause of a real crash
  // ("Cannot read properties of undefined (reading 'start')") when that old shape didn't match what
  // later code expected. Runs synchronously at parse time, before the very first render() fires
  // (even the one already wrapped in try/catch elsewhere), so this class of bug can't recur.
  if(db.payroll){db.payroll=null;if(typeof window.__marlumSave==='function')window.__marlumSave();}
  const save=window.__marlumSave||(()=>{});
  const esc27=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money27=n=>'₦'+Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2});

  // ---- Legacy "Payroll" (db.payroll, single overwritable draft) has been removed from the nav
  //      and its Calculate/Adjustments/Approve/Lock/History workflow is no longer reachable. This
  //      layer rewires every feature that used to read db.payroll so they work from Payroll Cycles
  //      instead — the properly role-gated, per-staff-type system with its own Lock step. ----

  function currentInProgressCycles(){
    // "Current payroll" = the most recently created cycle of each type, whatever its status.
    const types=['monthly_fixed','weekly_casual'];
    return types.map(t=>{
      const cs=(typeof payrollCycles==='function'?payrollCycles():db.payrollCycles||[]).filter(c=>c.type===t).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
      return cs[0]||null;
    }).filter(Boolean);
  }
  function employeeCycleLine(cycle,empId){
    const line=cycle.employees.find(x=>x.id===empId);
    if(!line)return null;
    const periodLabel=cycle.type==='monthly_fixed'?new Date(cycle.end+'T00:00:00').toLocaleString('en-NG',{month:'long',year:'numeric'}):`${cycle.start} to ${cycle.end}`;
    return {...line,cycleId:cycle.id,type:cycle.type,status:cycle.status,periodLabel};
  }
  function allEmployeeCycleLines(empId){
    return (typeof payrollCycles==='function'?payrollCycles():db.payrollCycles||[])
      .filter(c=>['Locked','Payment Batch Created'].includes(c.status))
      .map(c=>employeeCycleLine(c,empId))
      .filter(Boolean)
      .sort((a,b)=>b.cycleId.localeCompare(a.cycleId));
  }
  window.__v27CurrentInProgressCycles=currentInProgressCycles;
  window.__v27AllEmployeeCycleLines=allEmployeeCycleLines;

  // ---- Dashboard: Gross/Net metrics now sum across the current cycle(s) instead of db.payroll. ----
  function updateDashboardV27(){
    const cycles=currentInProgressCycles();
    const gross=cycles.reduce((s,c)=>s+Number(c.totalGross||0),0);
    const net=cycles.reduce((s,c)=>s+Number(c.totalNet||0),0);
    const mGross=document.getElementById('mGross');if(mGross)mGross.textContent=money27(gross);
    const mNet=document.getElementById('mNet');if(mNet)mNet.textContent=money27(net);
    const mGrossSub=document.getElementById('mGrossSub');if(mGrossSub)mGrossSub.textContent=cycles.length?cycles.map(c=>cycleTypeLabel(c.type)+': '+c.status).join(' · '):'No payroll cycles yet';
    const mNetSub=document.getElementById('mNetSub');if(mNetSub)mNetSub.textContent=cycles.length?`Deductions ${money27(gross-net)}`:'—';
    const cs=document.getElementById('controlStatus');
    if(cs){
      const latestStatus=cycles.length?cycles.map(c=>`${cycleTypeLabel(c.type)}: ${c.status}`).join(' · '):'No cycle created yet';
      const pbs=(typeof paymentBatches==='function'?paymentBatches():db.paymentBatches||[]);
      const paidBatches=pbs.filter(b=>b.status==='Paid').length;
      cs.innerHTML=cs.innerHTML
        .replace(/<p>Payroll: <b>.*?<\/b><\/p>/,`<p>Payroll: <b>${esc27(latestStatus)}</b></p>`)
        .replace(/<p>Bank payment batch: <b>.*?<\/b><\/p>/,`<p>Bank payment batch: <b>${esc27(pbs.length?(paidBatches?paidBatches+' paid':'In progress'):'Not prepared')}</b></p>`);
    }
    // Reports page top metrics
    const rGross=document.getElementById('rGross');if(rGross)rGross.textContent=money27(gross);
    const rNet=document.getElementById('rNet');if(rNet)rNet.textContent=money27(net);
    const rBonus=document.getElementById('rBonus');if(rBonus){const b=cycles.reduce((s,c)=>s+c.employees.reduce((a,x)=>a+Number(x.bonus||0),0),0);rBonus.textContent=money27(b);}
    const rDeductions=document.getElementById('rDeductions');if(rDeductions){const d=cycles.reduce((s,c)=>s+c.employees.reduce((a,x)=>a+Number(x.deduction||0)+Number(x.loanRepayment||0),0),0);rDeductions.textContent=money27(d);}
  }

  // ---- Payslips page ----
  window.currentPayrollItems=function(){
    const cycles=currentInProgressCycles();
    const items=[];
    cycles.forEach(c=>c.employees.forEach(x=>{const line=employeeCycleLine(c,x.id);if(line)items.push(line);}));
    return items;
  };
  function renderPayslipsV27(){
    const rows=document.getElementById('payslipRows');if(!rows)return;
    const items=window.currentPayrollItems();
    rows.innerHTML=items.map(x=>`<tr>
      <td>${esc27(x.name)}</td><td>${esc27(x.periodLabel)}</td><td>${money27(x.gross)}</td>
      <td>${money27((x.bonus||0)+(x.overtimePay||0)-(x.deduction||0)-(x.loanRepayment||0))}</td><td><b>${money27(x.netPay)}</b></td>
      <td><button class="btn secondary" onclick="showPayslip('${esc27(x.id)}','${esc27(x.cycleId)}')">View / Print</button></td>
    </tr>`).join('')||'<tr><td colspan="6">No payroll cycle available yet.</td></tr>';
  }
  window.generateAllPayslips=function(){
    const cycles=currentInProgressCycles();
    if(!cycles.length){alert('No payroll cycle has been created yet. Create one from Payroll Cycle first.');return}
    const summary=document.getElementById('payslipSummary');
    if(summary)summary.innerHTML=`<p>Payslips are generated from the most recent payroll cycle of each type: ${cycles.map(c=>`<b>${esc27(cycleTypeLabel(c.type))}</b> (${esc27(c.status)})`).join(', ')}.</p>`;
    renderPayslipsV27();
  };

  // ---- showPayslip / download now take an optional cycleId, so a specific historical payslip
  //      can be viewed (not just "the current one") — falls back to the most recent if omitted. ----
  window.showPayslip=function(id,cycleId){
    let line=null;
    if(cycleId){
      const cycle=(typeof payrollCycles==='function'?payrollCycles():db.payrollCycles||[]).find(c=>c.id===cycleId);
      line=cycle?employeeCycleLine(cycle,id):null;
    }else{
      line=allEmployeeCycleLines(id)[0]||null;
    }
    const e=db.employees.find(a=>a.id===id);
    if(!line||!e){alert('No finalized payslip is available for this employee yet. A payroll cycle must be locked first.');return}
    const htmlSlip=`<div class="payslip" id="printPayslip"><div style="text-align:center;border-bottom:2px solid #9db5a8;padding-bottom:10px;margin-bottom:15px">
      <h2 style="margin:0">${esc27(db.settings.companyName||'Marlum Nigeria Ltd.')}</h2><div>Employee Payslip — ${esc27(line.periodLabel)}</div></div>
      <table><tr><th>Employee ID</th><td>${esc27(e.id)}</td><th>Department</th><td>${esc27(e.dept||'—')}</td></tr><tr><th>Employee</th><td>${esc27(e.name)}</td><th>Position</th><td>${esc27(e.position||'—')}</td></tr><tr><th>Employment Type</th><td>${esc27(e.employmentType||'—')}</td><th>Payroll Frequency</th><td>${esc27(cycleTypeLabel(line.type))}</td></tr></table>
      <h4>Earnings</h4><table>
      ${line.type==='weekly_casual'?`<tr><td>Attendance Pay (${line.payableDays} day(s) × ${money27(line.dailyRate)})</td><td>${money27(Number(line.dailyRate||0)*Number(line.payableDays||0))}</td></tr>`:`<tr><td>Basic</td><td>${money27(line.basic)}</td></tr><tr><td>Housing</td><td>${money27(line.housing)}</td></tr><tr><td>Transport</td><td>${money27(line.transport)}</td></tr><tr><td>Other</td><td>${money27(line.other)}</td></tr>`}
      <tr><td>Bonus</td><td>${money27(line.bonus||0)}</td></tr>
      <tr><td>Overtime Pay (${Number(line.overtimeHours||0).toFixed(2)}h)</td><td>${money27(line.overtimePay||0)}</td></tr>
      <tr><th>Gross Pay</th><th>${money27(line.gross)}</th></tr></table>
      <h4>Deductions</h4><table><tr><td>Other Deductions</td><td>${money27(line.deduction||0)}</td></tr><tr><td>Loan / Advance Repayment</td><td>${money27(line.loanRepayment||0)}</td></tr><tr><th>Net Pay</th><th>${money27(line.netPay)}</th></tr></table>
      <p class="label">PAYE, Pension and NSITF remain excluded from this browser build.</p></div>`;
    openModal(`${htmlSlip}<div class="toolbar"><button class="btn primary" onclick="downloadPayslipV19('${esc27(id)}','${esc27(line.cycleId)}')">Download Payslip</button><button class="btn success" onclick="printPayslip()">Print Payslip</button><button class="btn secondary" onclick="closeModal()">Close</button></div><p class="label">Choose <b>Download Payslip</b> to save a file or <b>Print Payslip</b> to send it to a printer/PDF printer.</p>`);
  };
  window.downloadPayslipV19=function(id,cycleId){
    const e=db.employees.find(a=>a.id===id);if(!e)return;
    const content=document.getElementById('printPayslip')?.outerHTML||'';
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${esc27(e.id)}</title><style>body{font-family:Arial;padding:30px;color:#24302a}table{width:100%;border-collapse:collapse;margin-bottom:15px}th,td{padding:8px;border:1px solid #ddd;text-align:left}</style></head><body>${content}</body></html>`;
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));a.download=`marlum-payslip-${e.id}-${cycleId||'latest'}.html`;a.click();
  };

  // ---- Reports page: CSV export and Employee Payroll History ----
  window.exportPayrollCSV=function(){
    const cycles=currentInProgressCycles();
    if(!cycles.length){alert('No payroll cycle has been created yet.');return}
    let rows=[['Cycle','Type','Employee ID','Employee','Rate/Salary Basis','Overtime Hours','Overtime Pay','Bonus','Deductions','Loan Repayment','Gross','Net Pay']];
    cycles.forEach(c=>c.employees.forEach(x=>{
      const basis=c.type==='weekly_casual'?`${x.dailyRate} x ${x.payableDays}d`:`${(x.basic||0)+(x.housing||0)+(x.transport||0)+(x.other||0)}`;
      rows.push([c.id,cycleTypeLabel(c.type),x.id,x.name,basis,x.overtimeHours||0,x.overtimePay||0,x.bonus||0,x.deduction||0,x.loanRepayment||0,x.gross,x.netPay]);
    }));
    let csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
    let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`marlum-payroll-${new Date().toISOString().slice(0,10)}.csv`;a.click();
  };
  window.showEmployeePayrollHistory=function(id){
    const rows=allEmployeeCycleLines(id);
    openModal(`<h3>Payroll History</h3><table><tr><th>Period</th><th>Type</th><th>Gross</th><th>Bonus</th><th>Overtime</th><th>Deductions</th><th>Loan Repayment</th><th>Net</th><th>Status</th></tr>
    ${rows.map(x=>`<tr><td>${esc27(x.periodLabel)}</td><td>${esc27(cycleTypeLabel(x.type))}</td><td>${money27(x.gross)}</td><td>${money27(x.bonus||0)}</td><td>${money27(x.overtimePay||0)}</td><td>${money27(x.deduction||0)}</td><td>${money27(x.loanRepayment||0)}</td><td>${money27(x.netPay)}</td><td>${esc27(x.status)}</td></tr>`).join('')||'<tr><td colspan="9">No finalized payroll history for this employee.</td></tr>'}</table><button class="btn secondary" onclick="closeModal()">Close</button>`);
  };

  // ---- Employee Portal: "My Payslips" section now shows real payslip history, not just "current". ----
  const oldShowEmployeePortalV27=window.showEmployeePortal;
  if(typeof oldShowEmployeePortalV27==='function'){
    window.showEmployeePortal=function(id){
      oldShowEmployeePortalV27(id);
      const modalContent=document.getElementById('modalContent');
      if(!modalContent)return;
      const table=[...modalContent.querySelectorAll('table')].find(t=>t.previousElementSibling&&t.previousElementSibling.textContent==='My Payslips');
      if(!table)return;
      const lines=allEmployeeCycleLines(id);
      table.innerHTML=`<tr><th>Period</th><th>Type</th><th>Gross</th><th>Net</th><th>Action</th></tr>
      ${lines.map(x=>`<tr><td>${esc27(x.periodLabel)}</td><td>${esc27(cycleTypeLabel(x.type))}</td><td>${money27(x.gross)}</td><td>${money27(x.netPay)}</td><td><button class="btn secondary" onclick="showPayslip('${esc27(id)}','${esc27(x.cycleId)}')">View / Print</button></td></tr>`).join('')||'<tr><td colspan="5">No payslips currently available.</td></tr>'}`;
    };
  }

  // Employee logins are read-only for now (the server gives them only their own records and they
  // cannot write to the shared data). Rather than let a request appear to submit and then quietly
  // disappear on reload, say so plainly until submitting requests is moved onto the secure server.
  ['openEmployeeLoanRequestV191','openEmployeeTransferRequestV191','submitLoanV191','submitTransferV191'].forEach(name=>{
    const original=window[name];
    if(typeof original!=='function')return;
    window[name]=function(){
      if(window.__marlumEmployeeScoped){alert('Submitting requests online is not switched on yet — it is being moved onto the secure server. Please give your request to HR directly for now.');return}
      return original.apply(this,arguments);
    };
  });

  const oldRenderV27=window.render;
  window.render=function(){
    if(typeof oldRenderV27==='function')oldRenderV27();
    updateDashboardV27();
    if(document.getElementById('payslipRows'))renderPayslipsV27();
  };
})();
