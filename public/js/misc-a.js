
(function(){
  // Reports rebuild: the old buttons (Export Payroll CSV, Employee Payroll History) read from
  // db.payroll, a variable nothing in the current payroll-cycle system ever populates — they always
  // failed with "Calculate payroll first" even with real, completed payroll cycles on record.
  // Department Summary was the one exception, already correctly reading live cycle data. This
  // replaces all three with one flow: pick a report type and a date range, preview it as an actual
  // table, then download — built on payrollCycles()/attendanceRecords()/paymentBatches(), the same
  // real data sources verified elsewhere in this app, not the dead field.
  let lastReportRows=null,lastReportHeaders=null,lastReportMoneyCols=null,lastReportFilename='marlum-report';
  const REPORT_TYPES=[
    {code:'payroll_summary',name:'Payroll Summary (by cycle)'},
    {code:'department_summary',name:'Department Summary'},
    {code:'employee_history',name:'Employee Payroll History'},
    {code:'loan_report',name:'Loan Report'},
    {code:'bank_payments',name:'Bank Payment Summary'},
    {code:'attendance_summary',name:'Attendance Summary'},
  ];
  function cyclesInRange(start,end){return payrollCycles().filter(c=>!(c.end<start||c.start>end))}
  window.openGenerateReport=function(){
    const today=todayISO(),defaultStart=today.slice(0,8)+'01';
    openModal(`<h3>Generate Report</h3>
    <div class="grid">
      <label>Report Type<select id="rgType" onchange="toggleReportEmployeeField()">${REPORT_TYPES.map(t=>`<option value="${t.code}">${esc(t.name)}</option>`).join('')}</select></label>
      <label id="rgEmpWrap" style="display:none">Employee<input id="rgEmpSearch" placeholder="Type a name…" autocomplete="off" oninput="filterReportEmployeeOptions(this.value)"><select id="rgEmp" size="6"></select></label>
      <label>Start Date<input id="rgStart" type="date" value="${defaultStart}"></label>
      <label>End Date<input id="rgEnd" type="date" value="${today}"></label>
    </div>
    <div class="toolbar"><button class="btn primary" onclick="previewReport()">Preview</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>
    <div id="rgPreviewWrap"></div>`);
    window.toggleReportEmployeeField();
  };
  window.toggleReportEmployeeField=function(){
    const type=document.getElementById('rgType')?.value,wrap=document.getElementById('rgEmpWrap');
    if(!wrap)return;
    if(type==='employee_history'){wrap.style.display='';window.filterReportEmployeeOptions('')}
    else wrap.style.display='none';
  };
  window.filterReportEmployeeOptions=function(q){
    const sel=document.getElementById('rgEmp');if(!sel)return;
    q=(q||'').trim().toLowerCase();
    const active=db.employees.filter(e=>e.status==='Active'&&(!q||e.name.toLowerCase().includes(q)||String(e.id).includes(q)));
    sel.innerHTML=active.slice(0,50).map(e=>`<option value="${esc(e.id)}">${esc(e.name)} (${esc(e.id)})</option>`).join('')||'<option disabled>No match</option>';
  };
  window.previewReport=function(){
    const type=document.getElementById('rgType').value,start=document.getElementById('rgStart').value,end=document.getElementById('rgEnd').value;
    if(!start||!end||end<start){alert('Enter a valid date range.');return}
    let headers=[],rows=[],moneyCols=[],filename='marlum-report';
    if(type==='payroll_summary'){
      const cycles=cyclesInRange(start,end);
      headers=['Period','Type','Employees','Gross','Net','Status'];moneyCols=[3,4];
      rows=cycles.map(c=>[`${c.start} to ${c.end}`,cycleTypeLabel(c.type),c.employeeCount,Number(c.totalGross||0),Number(c.totalNet||0),c.status]);
      filename=`marlum-payroll-summary-${start}-to-${end}`;
    }else if(type==='department_summary'){
      const cycles=cyclesInRange(start,end),groups={};
      cycles.forEach(c=>c.employees.forEach(x=>{const e=db.employees.find(a=>a.id===x.id),d=x.workSite||e?.dept||'Unassigned';groups[d]=groups[d]||{employees:0,gross:0,net:0};groups[d].employees++;groups[d].gross+=Number(x.gross||0);groups[d].net+=Number(x.netPay||0)}));
      headers=['Department','Employee-Cycles','Gross','Net'];moneyCols=[2,3];
      rows=Object.entries(groups).map(([d,g])=>[d,g.employees,g.gross,g.net]);
      filename=`marlum-department-summary-${start}-to-${end}`;
    }else if(type==='employee_history'){
      const empId=document.getElementById('rgEmp').value;
      if(!empId){alert('Select an employee.');return}
      const cycles=cyclesInRange(start,end);
      headers=['Period','Type','Gross','Net','Status'];moneyCols=[2,3];
      rows=cycles.filter(c=>c.employees.some(x=>x.id===empId)).map(c=>{const x=c.employees.find(x=>x.id===empId);return [`${c.start} to ${c.end}`,cycleTypeLabel(c.type),Number(x.gross||0),Number(x.netPay||0),c.status]});
      filename=`marlum-payroll-history-${empId}-${start}-to-${end}`;
    }else if(type==='loan_report'){
      headers=['Employee','Loan ID','Approved','Monthly Deduction','Outstanding','Status'];moneyCols=[2,3,4];
      rows=(db.loans||[]).map(l=>[l.name,l.id,Number(l.approvedAmount||0),Number(l.monthlyDeduction||0),Number(l.outstanding||0),l.status]);
      filename=`marlum-loan-report-${start}-to-${end}`;
    }else if(type==='bank_payments'){
      const batches=paymentBatches().filter(b=>!(b.period&&(b.period.slice(-10)<start||b.period.slice(0,10)>end)));
      headers=['Batch ID','Period','Employees','Total Net','Status'];moneyCols=[3];
      rows=batches.map(b=>[b.id,b.period,b.employeeCount,Number(b.totalNet||0),b.status]);
      filename=`marlum-bank-payments-${start}-to-${end}`;
    }else if(type==='attendance_summary'){
      const recs=attendanceRecords().filter(r=>r.date>=start&&r.date<=end&&r.approvalStatus==='Approved'),groups={};
      recs.forEach(r=>{const e=db.employees.find(x=>x.id===r.employeeId),key=r.employeeId;groups[key]=groups[key]||{name:e?e.name:r.employeeId,present:0};if(r.status==='Present'||r.status==='Half Day')groups[key].present++});
      headers=['Employee','Days Present'];moneyCols=[];
      rows=Object.values(groups).map(g=>[g.name,g.present]);
      filename=`marlum-attendance-summary-${start}-to-${end}`;
    }
    lastReportRows=rows;lastReportHeaders=headers;lastReportMoneyCols=moneyCols;lastReportFilename=filename;
    const wrap=document.getElementById('rgPreviewWrap');
    wrap.innerHTML=`<h3>Preview (${rows.length} row${rows.length===1?'':'s'})</h3>
    <table><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr>
    ${rows.map(r=>`<tr>${r.map((c,i)=>`<td>${moneyCols.includes(i)?money(c):esc(String(c))}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${headers.length}">No data for this range.</td></tr>`}
    </table>
    <div class="toolbar"><button class="btn primary" onclick="downloadReportCSV()">Download CSV</button></div>`;
  };
  window.downloadReportCSV=function(){
    if(!lastReportRows){alert('Preview a report first.');return}
    const csvRows=[lastReportHeaders,...lastReportRows];
    const csv=csvRows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`${lastReportFilename}.csv`;a.click();
    log('Report downloaded',`${lastReportFilename} — ${lastReportRows.length} rows`);save();
  };
})();
