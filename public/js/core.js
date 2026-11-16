
const DEFAULT_EMPLOYEE_SEED=[];
const KEY='marlum_hr_payroll_v7';let storageOK=true;let db;/* no local copy of the database is ever kept or read; wipe any left by older versions */try{localStorage.removeItem(KEY)}catch(e){}db=null;db=db||{employees:DEFAULT_EMPLOYEE_SEED.map(e=>({...e})),leave:[],payroll:null,payments:[],audit:[],settings:{companyName:'Marlum Nigeria Ltd.'},salaryHistory:[],documents:[],payrollAdjustments:[],payrollHistory:[],attendance:[],leaveRequests:[],leaveBalances:{},attendanceSettings:{workDays:5}};
const money=n=>'₦'+Number(n||0).toLocaleString('en-NG',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
function save(){if(!storageOK)return;try{if(typeof window.__marlumOnSave==='function')window.__marlumOnSave()}catch(e){storageOK=false;let box=document.getElementById('appError'),text=document.getElementById('appErrorText');if(box&&text){text.textContent='Local storage is unavailable in this preview, so changes will not be saved after you reload.';box.style.display='block'}}}function log(action,details){
  const u=(typeof activeSystemUser==='function')?activeSystemUser():null;
  const who=(u&&(u.name||u.username))||'System';
  const id='AUD-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
  db.audit=db.audit||[];
  db.audit.unshift({id,date:new Date().toLocaleString(),user:who,action,details});
  if(db.audit.length>1000)db.audit.length=1000; // keeps the audit trail from growing without bound
  save();
}
document.getElementById('today').textContent=new Date().toLocaleDateString('en-NG',{dateStyle:'medium'});
function showPage(id,btn){document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById(id).classList.add('active');document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));btn.classList.add('active');render()}
function openModal(html){document.getElementById('modalContent').innerHTML=html;document.getElementById('modal').classList.add('show')}function closeModal(){document.getElementById('modal').classList.remove('show')}
function openEmployee(id=null){let e=db.employees.find(x=>x.id===id)||{id:'',name:'',dept:'',position:'',gender:'',dob:'',marital:'',phone:'',email:'',address:'',state:'',dateEmployed:'',grade:'',supervisor:'',basic:0,housing:0,transport:0,other:0,bank:'',account:'',bvn:'',nextOfKin:'',emergency:'',status:'Active'};
openModal(`<h3>${id?'Edit':'Add'} Employee</h3><div class="form">
<label>Employee ID<input id="e_id" value="${esc(e.id)}" ${id?'readonly':''}></label><label>Full Name<input id="e_name" value="${esc(e.name)}"></label>
<label>Department<input id="e_dept" value="${esc(e.dept)}"></label><label>Position / Job Title<input id="e_pos" value="${esc(e.position)}"></label>
<label>Gender<select id="e_gender"><option value="">Select</option><option ${e.gender==='Male'?'selected':''}>Male</option><option ${e.gender==='Female'?'selected':''}>Female</option></select></label>
<label>Date of Birth<input id="e_dob" type="date" value="${esc(e.dob||'')}"></label>
<label>Marital Status<select id="e_marital"><option value="">Select</option><option ${e.marital==='Single'?'selected':''}>Single</option><option ${e.marital==='Married'?'selected':''}>Married</option><option ${e.marital==='Divorced'?'selected':''}>Divorced</option><option ${e.marital==='Widowed'?'selected':''}>Widowed</option></select></label>
<label>Phone Number<input id="e_phone" value="${esc(e.phone||'')}"></label>
<label>Email<input id="e_email" type="email" value="${esc(e.email||'')}"></label>
<label>Residential Address<input id="e_address" value="${esc(e.address||'')}"></label>
<label>State of Origin<input id="e_state" value="${esc(e.state||'')}"></label>
<label>Date Employed<input id="e_dateEmployed" type="date" value="${esc(e.dateEmployed||'')}"></label>
<label>Grade Level<input id="e_grade" value="${esc(e.grade||'')}"></label>
<label>Supervisor<input id="e_supervisor" value="${esc(e.supervisor||'')}"></label>
<label>Basic Salary<input id="e_basic" type="number" value="${e.basic||0}"></label><label>Housing Allowance<input id="e_housing" type="number" value="${e.housing||0}"></label>
<label>Transport Allowance<input id="e_transport" type="number" value="${e.transport||0}"></label><label>Other Allowance<input id="e_other" type="number" value="${e.other||0}"></label>
<label>Bank<input id="e_bank" value="${esc(e.bank)}"></label>
<label>Account Number<input id="e_account" value="${esc(e.account)}" maxlength="10"></label>
<label>BVN<input id="e_bvn" value="${esc(e.bvn||'')}" maxlength="11"></label>
<label>Next of Kin<input id="e_nextOfKin" value="${esc(e.nextOfKin||'')}"></label>
<label>Emergency Contact<input id="e_emergency" value="${esc(e.emergency||'')}"></label><label>Status<select id="e_status"><option ${e.status==='Active'?'selected':''}>Active</option><option ${e.status==='Inactive'?'selected':''}>Inactive</option></select></label>
</div><div class="toolbar"><button class="btn primary" onclick="saveEmployee('${esc(id||'')}')">Save</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`)} 
function saveEmployee(oldId){let id=document.getElementById('e_id').value.trim(),name=document.getElementById('e_name').value.trim();if(!id||!name){alert('Employee ID and name are required.');return}
let obj={
id,name,dept:document.getElementById('e_dept').value,position:document.getElementById('e_pos').value,
gender:document.getElementById('e_gender').value,dob:document.getElementById('e_dob').value,marital:document.getElementById('e_marital').value,
phone:document.getElementById('e_phone').value,email:document.getElementById('e_email').value,address:document.getElementById('e_address').value,
state:document.getElementById('e_state').value,dateEmployed:document.getElementById('e_dateEmployed').value,grade:document.getElementById('e_grade').value,
supervisor:document.getElementById('e_supervisor').value,basic:+document.getElementById('e_basic').value||0,housing:+document.getElementById('e_housing').value||0,
transport:+document.getElementById('e_transport').value||0,other:+document.getElementById('e_other').value||0,
bank:document.getElementById('e_bank').value,account:document.getElementById('e_account').value,bvn:document.getElementById('e_bvn').value,
accountName:document.getElementById('e_accountName')?.value||'',bankCode:document.getElementById('e_bankCode')?.value||'',sortCode:document.getElementById('e_sortCode')?.value||'',
nextOfKin:document.getElementById('e_nextOfKin').value,emergency:document.getElementById('e_emergency').value,status:document.getElementById('e_status').value
};
obj.gross=obj.basic+obj.housing+obj.transport+obj.other;if(oldId){
let i=db.employees.findIndex(x=>x.id===oldId), old=db.employees[i];
let changed=['basic','housing','transport','other'].some(k=>Number(old[k]||0)!==Number(obj[k]||0));
db.employees[i]={...old,...obj};
if(changed){db.salaryHistory=db.salaryHistory||[];db.salaryHistory.push({emp:id,effective:new Date().toISOString().slice(0,10),basic:obj.basic,housing:obj.housing,transport:obj.transport,other:obj.other});}
log('Employee updated',`${id} — ${name}`)}else{if(db.employees.some(x=>x.id===id)){alert('Employee ID already exists.');return}db.employees.push(obj);log('Employee added',`${id} — ${name}`)}
save();closeModal();render()}
function viewEmployee(id){
let e=db.employees.find(x=>x.id===id); if(!e)return;
let gross=(e.basic||0)+(e.housing||0)+(e.transport||0)+(e.other||0);
let history=(db.salaryHistory||[]).filter(x=>x.emp===id).sort((a,b)=>b.effective.localeCompare(a.effective));
let docs=(db.documents||[]).filter(x=>x.emp===id);
openModal(`<h3>${esc(e.name)} — Employee Profile</h3>
<div class="grid" style="grid-template-columns:repeat(3,1fr)">
<div class="card"><div class="label">Staff ID</div><b>${esc(e.id)}</b></div>
<div class="card"><div class="label">Department</div><b>${esc(e.dept||'—')}</b></div>
<div class="card"><div class="label">Job Title</div><b>${esc(e.position||'—')}</b></div>
<div class="card"><div class="label">Phone</div><b>${esc(e.phone||'—')}</b></div>
<div class="card"><div class="label">Email</div><b>${esc(e.email||'—')}</b></div>
<div class="card"><div class="label">Date Employed</div><b>${esc(e.dateEmployed||'—')}</b></div>
</div>
<h4>Monthly Salary</h4>
<table><tr><th>Basic</th><th>Housing</th><th>Transport</th><th>Other</th><th>Monthly Gross</th></tr>
<tr><td>${money(e.basic)}</td><td>${money(e.housing)}</td><td>${money(e.transport)}</td><td>${money(e.other)}</td><td><b>${money(gross)}</b></td></tr></table>
<h4>Personal & Emergency Information</h4>
<p>Gender: <b>${esc(e.gender||'—')}</b> · Marital Status: <b>${esc(e.marital||'—')}</b> · State: <b>${esc(e.state||'—')}</b></p>
<p>Address: <b>${esc(e.address||'—')}</b></p><p>Next of Kin: <b>${esc(e.nextOfKin||'—')}</b> · Emergency: <b>${esc(e.emergency||'—')}</b></p>
<h4>Salary History</h4>
<table><tr><th>Effective Date</th><th>Basic</th><th>Housing</th><th>Transport</th><th>Other</th><th>Gross</th></tr>
${history.map(x=>`<tr><td>${x.effective}</td><td>${money(x.basic)}</td><td>${money(x.housing)}</td><td>${money(x.transport)}</td><td>${money(x.other)}</td><td>${money(x.basic+x.housing+x.transport+x.other)}</td></tr>`).join('')||'<tr><td colspan="6">No salary revisions recorded.</td></tr>'}</table>
<h4>Documents</h4><p>${docs.length?docs.map(d=>`<span class="badge active-b">${esc(d.name)}</span>`).join(' '):'No documents recorded yet.'}</p>
<div class="toolbar"><button class="btn primary" onclick="openEmployee('${esc(e.id)}')">Edit Employee</button><button class="btn secondary" onclick="closeModal()">Close</button></div>`);
}

function deleteEmployee(id){
  if(!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Only a Super Admin can permanently delete an employee record. If this employee has left the company, use the Inactive/Terminated status in HR instead — deletion is only for correcting a genuine data-entry mistake.');return}
  if(!confirm('This permanently removes the employee record from the database — there is no undo. Only use this to correct a genuine mistake (e.g. the wrong person was entered). If the employee has actually left the company, cancel this and set their status to Inactive/Terminated in HR instead.'))return;
  db.employees=db.employees.filter(x=>x.id!==id);log('Employee deleted',id);save();render()
}
// createPayroll, approvePayroll, and lockPayroll (the single-draft "Payroll" system built on
// db.payroll) removed entirely from this point in the file — none of the three had any reachable
// button anywhere in the app (confirmed directly), and this was itself the very first of three
// separate versions of createPayroll this file accumulated over its history; the other two, along
// with their own overrides, are removed alongside this one.
function openPayrollHistory(){
let h=(db.payrollHistory||[]).slice().reverse();
openModal(`<h3>Payroll History</h3><table><tr><th>Period</th><th>Employees</th><th>Gross</th><th>Net Pay</th><th>Status</th><th>Locked</th></tr>
${h.map(x=>`<tr><td>${esc(x.displayMonth||x.month)}</td><td>${x.items.length}</td><td>${money(x.items.reduce((a,i)=>a+i.gross,0))}</td><td>${money(x.items.reduce((a,i)=>a+i.netPay,0))}</td><td>${esc(x.status)}</td><td>${x.lockedAt?new Date(x.lockedAt).toLocaleString():'—'}</td></tr>`).join('')||'<tr><td colspan="6">No locked payroll periods yet.</td></tr>'}</table><button class="btn secondary" onclick="closeModal()">Close</button>`);
}
function openPayrollAdjustments(){
let active=db.employees.filter(e=>e.status==='Active');
let month=new Date().toISOString().slice(0,7);
openModal(`<h3>Payroll Adjustments — ${new Date(month+'-01T00:00:00').toLocaleString('en-NG',{month:'long',year:'numeric'})}</h3>
<div class="grid">
<label>Employee<input id="adjEmpSearch" placeholder="Type a name…" autocomplete="off" oninput="filterAdjEmpOptions(this.value)"><select id="adjEmp" size="6">${active.map(e=>`<option value="${e.id}">${esc(e.name)} (${esc(e.id)})</option>`).join('')}</select></label>
<label>Type<select id="adjType"><option>Bonus</option><option>Deduction</option><option>Loan/Advance Repayment</option></select></label>
<label>Amount<input id="adjAmount" type="number" min="0" step="0.01"></label>
<label>Description<input id="adjDesc" placeholder="e.g. Performance bonus"></label>
</div>
<div class="toolbar"><button class="btn primary" onclick="addPayrollAdjustment()">Add Adjustment</button><button class="btn secondary" onclick="closeModal()">Close</button></div>
<h4>Current Month Adjustments</h4>
<table><tr><th>Employee</th><th>Type</th><th>Amount</th><th>Description</th><th>Status</th><th>Action</th></tr>
${(db.payrollAdjustments||[]).filter(a=>a.month===month).map(a=>`<tr><td>${esc(a.name)}</td><td>${esc(a.type)}</td><td>${money(a.amount)}</td><td>${esc(a.description||'')}</td><td>${a.status}</td><td>${a.status!=='Cancelled'?`<button class="btn danger" onclick="cancelPayrollAdjustment('${a.id}')">Cancel</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="6">No adjustments recorded.</td></tr>'}</table>`);
}
window.filterAdjEmpOptions=function(q){
  const sel=document.getElementById('adjEmp');if(!sel)return;
  q=(q||'').trim().toLowerCase();
  const active=db.employees.filter(e=>e.status==='Active'&&(!q||e.name.toLowerCase().includes(q)||String(e.id).includes(q)));
  sel.innerHTML=active.slice(0,50).map(e=>`<option value="${esc(e.id)}">${esc(e.name)} (${esc(e.id)})</option>`).join('')||'<option disabled>No match</option>';
};
function addPayrollAdjustment(){
let emp=document.getElementById('adjEmp').value,type=document.getElementById('adjType').value,amount=Number(document.getElementById('adjAmount').value||0),description=document.getElementById('adjDesc').value;
if(!amount||amount<0){alert('Enter a valid amount.');return}
let e=db.employees.find(x=>x.id===emp),month=new Date().toISOString().slice(0,7);
db.payrollAdjustments=db.payrollAdjustments||[];
db.payrollAdjustments.push({id:'ADJ-'+Date.now(),month,emp,name:e.name,type,amount,description,status:'Approved',createdAt:new Date().toISOString()});
log('Payroll adjustment added',`${e.name} — ${type} — ${money(amount)}`);
db.payroll=null;save();closeModal();render();
}
function cancelPayrollAdjustment(id){
let a=(db.payrollAdjustments||[]).find(x=>x.id===id);if(!a)return;
a.status='Cancelled';log('Payroll adjustment cancelled',`${a.name} — ${a.type} — ${money(a.amount)}`);
db.payroll=null;save();closeModal();openPayrollAdjustments();
}

function todayISO(){return new Date().toISOString().slice(0,10)}
function daysBetween(a,b){
  let s=new Date(a+'T00:00:00'),e=new Date(b+'T00:00:00');
  if(e<s)return 0;
  return Math.floor((e-s)/86400000)+1;
}
// (openAttendanceEntry, saveAttendance, and markAllPresent — the original, base versions — removed
// entirely. All three worked on db.attendance, the same old, dead field found in the payroll cleanup
// pass; openAttendanceEntry was shadowed by a later, active redeclaration further down this file
// (confirmed via JS's own last-declaration-wins rule) — its "Mark All Present" button and this
// saveAttendance function were never reachable, since the active version of the modal has neither.
function openAttendanceHistory(){
  let rows=(db.timeTrackerRecords||[]).slice().sort((a,b)=>(b.date+b.name).localeCompare(a.date+a.name));
  openModal(`<h3>Attendance / Time Sheet History</h3>
  <p class="label">All recorded days across every date, newest first. To edit a past day's times, use the date picker on the Time Sheet page instead.</p>
  <table><tr><th>Date</th><th>Employee</th><th>Time In</th><th>Time Out</th><th>Hours</th><th>OT Hours</th><th>Source</th></tr>
  ${rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.name)}</td><td>${r.timeIn||'—'}</td><td>${r.timeOut||'—'}</td><td>${Number(r.hours||0).toFixed(2)}</td><td>${Number(r.overtimeHours||0).toFixed(2)}</td><td>${esc(r.source||'Time Tracker')}</td></tr>`).join('')||'<tr><td colspan="7">No time sheet records yet.</td></tr>'}</table>
  <button class="btn secondary" onclick="closeModal()">Close</button>`);
}

function currentPayrollItems(){
  return db.payroll?.items||[];
}
function openPayslipSearch(){
  let p=currentPayrollItems();
  if(!p.length){alert('Calculate payroll first.');return}
  openModal(`<h3>Find Employee Payslip</h3>
  <label>Employee<select id="psEmp">${p.map(x=>`<option value="${x.id}">${esc(x.name)} (${esc(x.id)})</option>`).join('')}</select></label>
  <div class="toolbar"><button class="btn primary" onclick="showPayslip(document.getElementById('psEmp').value)">View Payslip</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
}
function generateAllPayslips(){
  if(!db.payroll){alert('Calculate payroll first.');return}
  document.getElementById('payslipSummary').innerHTML=`<p>Payslips are generated from the <b>${esc(db.payroll.displayMonth||db.payroll.month)}</b> payroll. They do not change payroll values.</p>`;
  renderPayslips();
}
function renderPayslips(){
  let p=db.payroll,items=p?.items||[];
  document.getElementById('payslipRows').innerHTML=items.map(x=>`<tr>
    <td>${esc(x.name)}</td><td>${esc(p.displayMonth||p.month)}</td><td>${money(x.gross)}</td>
    <td>${money((x.bonus||0)-(x.deduction||0)-(x.loanRepayment||0))}</td><td><b>${money(x.netPay)}</b></td>
    <td><button class="btn secondary" onclick="showPayslip('${esc(x.id)}')">View / Print</button></td>
  </tr>`).join('')||'<tr><td colspan="6">No payroll calculated.</td></tr>';
}
function showPayslip(id){
  let p=db.payroll,x=p?.items?.find(i=>i.id===id),e=db.employees.find(a=>a.id===id);
  if(!x||!e){alert('Employee payroll record not found.');return}
  closeModal();
  let htmlSlip=`<div class="payslip" id="printPayslip">
    <div style="text-align:center;border-bottom:2px solid #9db5a8;padding-bottom:10px;margin-bottom:15px">
      <h2 style="margin:0">${esc(db.settings.companyName||'Marlum Nigeria Ltd.')}</h2>
      <div>Employee Payslip — ${esc(p.displayMonth||p.month)}</div>
    </div>
    <table><tr><th>Employee ID</th><td>${esc(e.id)}</td><th>Department</th><td>${esc(e.dept||'—')}</td></tr>
    <tr><th>Employee</th><td>${esc(e.name)}</td><th>Position</th><td>${esc(e.position||'—')}</td></tr>
    <tr><th>Bank</th><td>${esc(e.bank||'—')}</td><th>Account</th><td>${e.account?'****'+esc(e.account.slice(-4)):'—'}</td></tr></table>
    <h4>Earnings</h4><table>
    <tr><td>Basic</td><td>${money(x.basic)}</td></tr><tr><td>Housing</td><td>${money(x.housing)}</td></tr>
    <tr><td>Transport</td><td>${money(x.transport)}</td></tr><tr><td>Other</td><td>${money(x.other)}</td></tr>
    <tr><td>Bonus</td><td>${money(x.bonus||0)}</td></tr><tr><th>Gross Pay</th><th>${money(x.gross)}</th></tr></table>
    <h4>Adjustments</h4><table>
    <tr><td>Other Deductions</td><td>${money(x.deduction||0)}</td></tr>
    <tr><td>Loan / Advance Repayment</td><td>${money(x.loanRepayment||0)}</td></tr>
    <tr><th>Net Pay</th><th>${money(x.netPay)}</th></tr></table>
    <p class="label">PAYE, Pension and NSITF are excluded from this payroll version.</p>
  </div>
  <div class="toolbar"><button class="btn primary" onclick="printPayslip()">Print Payslip</button><button class="btn secondary" onclick="closeModal()">Close</button></div>`;
  openModal(htmlSlip);
}
function printPayslip(){
  let content=document.getElementById('printPayslip')?.innerHTML;
  if(!content)return;
  let w=window.open('','_blank','width=900,height=800');
  if(!w){alert('Please allow pop-ups to print the payslip.');return}
  w.document.write(`<html><head><title>Marlum Payslip</title><style>body{font-family:Arial;padding:30px;color:#24302a}table{width:100%;border-collapse:collapse;margin-bottom:15px}th,td{padding:8px;border:1px solid #ddd;text-align:left}@media print{button{display:none}}</style></head><body>${content}<script>window.onload=function(){window.print()}<\/script>


</body></html>`);
  w.document.close();
}
function exportPayrollCSV(){
  let p=db.payroll;if(!p){alert('Calculate payroll first.');return}
  let rows=[['Employee ID','Employee','Basic','Housing','Transport','Other','Bonus','Deductions','Loan/Advance Repayment','Gross','Net Pay']];
  p.items.forEach(x=>rows.push([x.id,x.name,x.basic,x.housing,x.transport,x.other,x.bonus||0,x.deduction||0,x.loanRepayment||0,x.gross,x.netPay]));
  let csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`marlum-payroll-${p.month}.csv`;a.click();
}
function openDepartmentReport(){
  let items=currentPayrollItems(),groups={};
  items.forEach(x=>{let e=db.employees.find(a=>a.id===x.id),d=e?.dept||'Unassigned';groups[d]??={employees:0,gross:0,net:0,bonus:0,deductions:0};groups[d].employees++;groups[d].gross+=x.gross;groups[d].net+=x.netPay;groups[d].bonus+=x.bonus||0;groups[d].deductions+=(x.deduction||0)+(x.loanRepayment||0)});
  openModal(`<h3>Department Payroll Summary</h3><table><tr><th>Department</th><th>Employees</th><th>Gross</th><th>Bonuses</th><th>Deductions / Loans</th><th>Net</th></tr>
  ${Object.entries(groups).map(([d,g])=>`<tr><td>${esc(d)}</td><td>${g.employees}</td><td>${money(g.gross)}</td><td>${money(g.bonus)}</td><td>${money(g.deductions)}</td><td>${money(g.net)}</td></tr>`).join('')||'<tr><td colspan="6">No payroll data.</td></tr>'}</table><button class="btn secondary" onclick="closeModal()">Close</button>`);
}
function openEmployeePayrollHistory(){
  let active=db.employees.filter(e=>e.status==='Active');
  openModal(`<h3>Employee Payroll History</h3><label>Employee<select id="histEmp">${active.map(e=>`<option value="${e.id}">${esc(e.name)} (${esc(e.id)})</option>`).join('')}</select></label>
  <div class="toolbar"><button class="btn primary" onclick="showEmployeePayrollHistory(document.getElementById('histEmp').value)">View History</button><button class="btn secondary" onclick="closeModal()">Close</button></div>`);
}
function showEmployeePayrollHistory(id){
  let rows=[];
  if(db.payroll?.items) {let x=db.payroll.items.find(i=>i.id===id);if(x)rows.push({month:db.payroll.month,...x,status:db.payroll.status})}
  (db.payrollHistory||[]).forEach(p=>{let x=p.items.find(i=>i.id===id);if(x)rows.push({month:p.month,...x,status:p.status})});
  openModal(`<h3>Payroll History</h3><table><tr><th>Period</th><th>Gross</th><th>Bonus</th><th>Deductions</th><th>Loan Repayment</th><th>Net</th><th>Status</th></tr>
  ${rows.sort((a,b)=>b.month.localeCompare(a.month)).map(x=>`<tr><td>${x.month}</td><td>${money(x.gross)}</td><td>${money(x.bonus||0)}</td><td>${money(x.deduction||0)}</td><td>${money(x.loanRepayment||0)}</td><td>${money(x.netPay)}</td><td>${x.status}</td></tr>`).join('')||'<tr><td colspan="7">No payroll history for this employee.</td></tr>'}</table><button class="btn secondary" onclick="closeModal()">Close</button>`);
}

function hrProfileFor(id){
  db.hrProfiles=db.hrProfiles||{};
  return db.hrProfiles[id]||(db.hrProfiles[id]={nextOfKin:'',nextOfKinPhone:'',address:'',emergencyContact:'',emergencyPhone:'',employmentType:'Permanent',notes:''});
}
function hrDocsFor(id){
  return (db.hrDocuments||[]).filter(d=>d.emp===id);
}
function openHRProfile(){
  let active=db.employees.filter(e=>e.status==='Active');
  openModal(`<h3>Employee HR Profile</h3>
  <label>Employee<select id="hrEmp">${active.map(e=>`<option value="${e.id}">${esc(e.name)} (${esc(e.id)})</option>`).join('')}</select></label>
  <div class="toolbar"><button class="btn primary" onclick="editHRProfile(document.getElementById('hrEmp').value)">Open Profile</button><button class="btn secondary" onclick="closeModal()">Close</button></div>`);
}
function editHRProfile(id){
  let e=db.employees.find(x=>x.id===id),h=hrProfileFor(id);
  closeModal();
  openModal(`<h3>HR Profile — ${esc(e.name)}</h3>
  <div class="grid">
    <label>Employee ID<input value="${esc(e.id)}" disabled></label>
    <label>Employment Date<input value="${esc(e.joinDate||'')}" disabled></label>
    <label>Department<input value="${esc(e.dept||'')}" disabled></label>
    <label>Position<input value="${esc(e.position||'')}" disabled></label>
    <label>Employment Type<select id="hrType">${['Permanent','Contract','Temporary','Probation'].map(x=>`<option ${h.employmentType===x?'selected':''}>${x}</option>`).join('')}</select></label>
    <label>Next of Kin<input id="hrNok" value="${esc(h.nextOfKin)}"></label>
    <label>Next of Kin Phone<input id="hrNokPhone" value="${esc(h.nextOfKinPhone)}"></label>
    <label>Emergency Contact<input id="hrEmergency" value="${esc(h.emergencyContact)}"></label>
    <label>Emergency Phone<input id="hrEmergencyPhone" value="${esc(h.emergencyPhone)}"></label>
    <label>Address<input id="hrAddress" value="${esc(h.address)}"></label>
    <label>HR Notes<input id="hrNotes" value="${esc(h.notes)}"></label>
  </div>
  <div class="toolbar"><button class="btn primary" onclick="saveHRProfile('${esc(id)}')">Save HR Profile</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
}
function saveHRProfile(id){
  let h=hrProfileFor(id);
  h.employmentType=document.getElementById('hrType').value;
  h.nextOfKin=document.getElementById('hrNok').value;
  h.nextOfKinPhone=document.getElementById('hrNokPhone').value;
  h.emergencyContact=document.getElementById('hrEmergency').value;
  h.emergencyPhone=document.getElementById('hrEmergencyPhone').value;
  h.address=document.getElementById('hrAddress').value;
  h.notes=document.getElementById('hrNotes').value;
  log('HR profile updated',id);save();closeModal();render();
}
function openHRDocument(prefillId=''){
  let active=db.employees.filter(e=>e.status==='Active');
  openModal(`<h3>Add HR Document Record</h3>
  <div class="grid">
    <label>Employee<select id="docEmp">${active.map(e=>`<option value="${e.id}" ${e.id===prefillId?'selected':''}>${esc(e.name)} (${esc(e.id)})</option>`).join('')}</select></label>
    <label>Document Type<select id="docType">${['Employment Contract','Appointment Letter','ID / Passport','Certificate','Qualification','Medical / Fitness Record','Disciplinary Record','Next-of-Kin Record','Other'].map(x=>`<option>${x}</option>`).join('')}</select></label>
    <label>Document Reference<input id="docRef" placeholder="Reference / file name"></label>
    <label>Issue Date<input id="docIssue" type="date"></label>
    <label>Expiry / Review Date<input id="docExpiry" type="date"></label>
    <label>Status<select id="docStatus"><option>Current</option><option>Pending</option><option>Expired</option><option>For Review</option></select></label>
    <label>Notes<input id="docNotes"></label>
  </div>
  <p class="label">This version records document metadata. Actual file attachment/storage can be connected in a later secure document-storage phase.</p>
  <div class="toolbar"><button class="btn primary" onclick="saveHRDocument()">Save Document Record</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
}
function saveHRDocument(){
  let id=document.getElementById('docEmp').value,e=db.employees.find(x=>x.id===id);
  db.hrDocuments=db.hrDocuments||[];
  db.hrDocuments.push({
    id:'DOC-'+Date.now(),emp:id,name:e.name,type:document.getElementById('docType').value,
    ref:document.getElementById('docRef').value,issue:document.getElementById('docIssue').value,
    expiry:document.getElementById('docExpiry').value,status:document.getElementById('docStatus').value,
    notes:document.getElementById('docNotes').value,createdAt:new Date().toISOString()
  });
  log('HR document record added',`${e.name} — ${document.getElementById('docType').value}`);
  save();closeModal();render();
}
function openHRDocumentRegister(){
  let docs=db.hrDocuments||[];
  openModal(`<h3>HR Document Register</h3><table><tr><th>Employee</th><th>Type</th><th>Reference</th><th>Issue</th><th>Expiry / Review</th><th>Status</th></tr>
  ${docs.slice().reverse().map(d=>`<tr><td>${esc(d.name)}</td><td>${esc(d.type)}</td><td>${esc(d.ref||'—')}</td><td>${d.issue||'—'}</td><td>${d.expiry||'—'}</td><td>${esc(d.status)}</td></tr>`).join('')||'<tr><td colspan="6">No document records.</td></tr>'}</table>
  <div class="toolbar"><button class="btn primary" onclick="openHRDocument()">+ Add Document</button><button class="btn secondary" onclick="closeModal()">Close</button></div>`);
}
function refreshHRDocumentStatuses(){
  db.hrDocuments=db.hrDocuments||[];
  let today=new Date(),soon=new Date();soon.setDate(soon.getDate()+30);
  db.hrDocuments.forEach(d=>{
    if(!d.expiry)return;
    let x=new Date(d.expiry+'T00:00:00');
    if(x<today)d.status='Expired';
    else if(x<=soon)d.status='For Review';
    else if(d.status==='Expired'||d.status==='For Review')d.status='Current';
  });
}

function hrActions(){db.hrActions=db.hrActions||[];return db.hrActions}
function actionTypes(){return ['Onboarding','Probation Start','Probation Review','Confirmation','Promotion','Transfer','Department Change','Suspension','Disciplinary Action','Resignation','Termination','Exit']}
function openHRAction(){
  let active=db.employees.filter(e=>e.status==='Active'), all=db.employees;
  openModal(`<h3>New HR Action</h3><div class="grid">
  <label>Employee<select id="actEmp">${all.map(e=>`<option value="${e.id}">${esc(e.name)} (${esc(e.id)})${e.status!=='Active'?' — '+esc(e.status):''}</option>`).join('')}</select></label>
  <label>Action Type<select id="actType">${actionTypes().map(x=>`<option>${x}</option>`).join('')}</select></label>
  <label>Effective Date<input id="actDate" type="date" value="${todayISO()}"></label>
  <label>New Department<input id="actDept" placeholder="Only for transfer/department change"></label>
  <label>Reason / Notes<input id="actNotes"></label>
  </div>
  <p class="label">HR actions are recorded first and require approval before taking effect. For a salary change, use Compensation → "+ Salary Change" instead — that keeps one authoritative, effective-dated salary history rather than two separate records of the same raise.</p>
  <div class="toolbar"><button class="btn primary" onclick="saveHRAction()">Submit for Approval</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
}
function saveHRAction(){
  let emp=document.getElementById('actEmp').value,e=db.employees.find(x=>x.id===emp),type=document.getElementById('actType').value;
  let a={id:'ACT-'+Date.now(),emp,name:e.name,type,effectiveDate:document.getElementById('actDate').value,
    department:document.getElementById('actDept').value,
    notes:document.getElementById('actNotes').value,status:'Pending',createdBy:activeSystemUser().username,createdAt:new Date().toISOString()};
  hrActions().push(a);log('HR action submitted',`${e.name} — ${type}`);save();closeModal();render();
}
function openRecordLoan(){
  let active=db.employees.filter(e=>e.status==='Active');
  openModal(`<h3>Record Loan</h3>
  <p class="label">Use this to enter a loan that management has already approved outside the app — it goes straight into the employee's active loan record and starts deducting from payroll, with no further approval step needed.</p>
  <div class="grid">
    <label>Employee<select id="rlEmp">${active.map(e=>`<option value="${esc(e.id)}">${esc(e.name)} (${esc(e.id)})</option>`).join('')}</select></label>
    <label>Original Amount Borrowed (₦)<input id="rlAmount" type="number" min="0" step="1"></label>
    <label>Current Outstanding Balance (₦) — leave blank if this is a brand-new loan (defaults to the full original amount)<input id="rlOutstanding" type="number" min="0" step="1"></label>
    <label>Term (months)<input id="rlTerm" type="number" min="1" step="1" value="12"></label>
    <label>Deduction Per Payroll Cycle (₦) — the weekly amount for casual staff, or monthly for fixed staff. Leave blank to auto-calculate<input id="rlMonthly" type="number" min="0" step="1"></label>
    <label>Start Month — leave as-is if unknown<input id="rlStartMonth" type="month" value="${todayISO().slice(0,7)}"></label>
    <label>Approved By (management)<input id="rlApprovedBy" placeholder="Name of approving manager"></label>
  </div>
  <label>Notes<input id="rlNotes" placeholder="Reference, reason, or approval context"></label>
  <div class="toolbar"><button class="btn primary" onclick="saveRecordLoan()">Record Loan</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
}
function saveRecordLoan(){
  let empId=document.getElementById('rlEmp').value,e=db.employees.find(x=>x.id===empId);
  let approvedAmount=Number(document.getElementById('rlAmount').value||0),term=Math.max(1,Number(document.getElementById('rlTerm').value||12));
  if(!approvedAmount||approvedAmount<=0){alert('Enter a valid approved amount.');return}
  let outstandingInput=document.getElementById('rlOutstanding').value,outstanding=outstandingInput!==''?Math.min(approvedAmount,Number(outstandingInput)):approvedAmount;
  let monthlyInput=Number(document.getElementById('rlMonthly').value||0),monthly=monthlyInput>0?monthlyInput:Math.ceil(approvedAmount/term);
  let startMonth=document.getElementById('rlStartMonth').value||todayISO().slice(0,7);
  let approvedByMgmt=document.getElementById('rlApprovedBy').value.trim(),notes=document.getElementById('rlNotes').value.trim();
  let u=activeSystemUser();
  db.loans=db.loans||[];
  let loan={id:'LN-'+Date.now(),requestId:'',emp:empId,name:e.name,approvedAmount,monthlyDeduction:monthly,outstanding,status:outstanding<=0?'Paid Off':'Active',approvedBy:approvedByMgmt||u.username,approvedAt:new Date().toISOString(),termMonths:term,startMonth,source:'HR Action — Management Approved',notes,recordedBy:u.username};
  db.loans.push(loan);
  db.deductions=db.deductions||[];
  db.deductions.push({id:'DED-LOAN-'+Date.now(),emp:empId,type:'Loan',amount:monthly,startDate:startMonth+'-01',status:loan.status,loanId:loan.id,description:'Employee loan repayment (management approved)'});
  log('Loan recorded (management approved)',`${e.name} — ${money(approvedAmount)} (balance ${money(outstanding)}) over ${term} months`);
  save();closeModal();render();
  alert(`Loan recorded for ${e.name}: ${money(approvedAmount)} original, ${money(outstanding)} current balance, ${money(monthly)}/cycle.`);
}
function downloadLoanImportTemplate(){
  let rows=[['Employee ID (optional)','Employee Name','Original Amount','Current Balance','Deduction Per Cycle','Notes']];
  rows.push(['','(one row per employee with an ongoing loan)','e.g. 150000','e.g. 55000','e.g. 15000 — weekly amount for casual staff, monthly for fixed staff','optional']);
  let csv=rows.map(r=>r.map(csvCell).join(',')).join('\n');
  let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='marlum-loan-import-template.csv';a.click();
}
let loanImportRows=[];
function openBulkLoanImport(){
  loanImportRows=[];
  openModal(`<h3>Bulk Import Loans</h3>
  <p class="label">Use this to enter a list of employees with ongoing loans — for example, loans that existed before this system was in use, where you only know the original amount and current balance, not a start date. Each loan starts Active immediately with no further approval step.</p>
  <div class="toolbar"><button class="btn secondary" onclick="downloadLoanImportTemplate()">Download CSV Template</button></div>
  <label>CSV File<input id="loanImportFile" type="file" accept=".csv" onchange="handleLoanFileSelect(this)"></label>
  <div id="loanImportPreview" style="margin-top:12px"></div>
  <div class="toolbar"><button class="btn primary" id="loanImportCommitBtn" onclick="commitLoanImport()" disabled>Import Loans</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>
  <p class="label">Columns: Employee ID (preferred) or Employee Name, Original Amount, Current Balance (defaults to Original Amount if left blank), Deduction Per Cycle. No start date is required — the loan's history from here on is tracked automatically as payroll cycles are locked.</p>`);
}
function handleLoanFileSelect(input){
  let file=input.files&&input.files[0];if(!file)return;
  let reader=new FileReader();
  reader.onload=function(e){
    let rows=parseSimpleCSV(String(e.target.result));
    if(!rows.length){alert('The file appears to be empty.');return}
    let header=rows[0].map(h=>h.toLowerCase());
    let idIdx=header.findIndex(h=>h.includes('employee id')||h==='id');
    let nameIdx=header.findIndex(h=>h.includes('name'));
    let origIdx=header.findIndex(h=>h.includes('original'));
    let balIdx=header.findIndex(h=>h.includes('current')||h.includes('balance'));
    let dedIdx=header.findIndex(h=>h.includes('deduction'));
    let notesIdx=header.findIndex(h=>h.includes('note'));
    if(origIdx===-1||(idIdx===-1&&nameIdx===-1)){alert('Could not find the required columns. Make sure the file has at least an Employee ID or Employee Name column, and an Original Amount column.');return}
    loanImportRows=rows.slice(1).filter(r=>r.some(c=>c)).map(r=>{
      let idVal=idIdx>-1?r[idIdx]:'',nameVal=nameIdx>-1?r[nameIdx]:'';
      let emp=null;
      if(idVal)emp=db.employees.find(x=>x.id===idVal);
      if(!emp&&nameVal)emp=db.employees.find(x=>x.name.trim().toLowerCase()===nameVal.trim().toLowerCase());
      let original=Number(r[origIdx]||0);
      let balanceRaw=balIdx>-1?r[balIdx]:'',balance=balanceRaw!==''&&balanceRaw!==undefined?Number(balanceRaw):original;
      let deduction=dedIdx>-1?Number(r[dedIdx]||0):0;
      return{idVal,nameVal,original,balance,deduction,notes:notesIdx>-1?r[notesIdx]:'',matched:emp||null};
    });
    renderLoanImportPreview();
  };
  reader.readAsText(file);
}
function renderLoanImportPreview(){
  let valid=loanImportRows.filter(r=>r.matched&&r.original>0);
  let unmatched=loanImportRows.filter(r=>!r.matched).length;
  let badAmount=loanImportRows.filter(r=>r.matched&&!(r.original>0)).length;
  document.getElementById('loanImportPreview').innerHTML=`<p><b>${loanImportRows.length}</b> rows read — <b style="color:#1e6b3c">${valid.length} ready to import</b>${unmatched?`, <b style="color:#a33c34">${unmatched} not matched</b>`:''}${badAmount?`, <b style="color:#a33c34">${badAmount} missing an original amount</b>`:''}.</p>
  <table><tr><th>Row</th><th>Employee</th><th>Original</th><th>Current Balance</th><th>Deduction/Cycle</th><th>Match</th></tr>
  ${loanImportRows.slice(0,100).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.nameVal||r.idVal)}</td><td>${r.original>0?money(r.original):'<span style="color:#a33c34">missing</span>'}</td><td>${money(r.balance)}</td><td>${r.deduction>0?money(r.deduction):'<span class="label">auto</span>'}</td><td>${r.matched?'✓ '+esc(r.matched.name):'✗ Not found'}</td></tr>`).join('')}
  </table>${loanImportRows.length>100?`<p class="label">Showing first 100 of ${loanImportRows.length} rows.</p>`:''}
  <p class="label">Check names and amounts carefully before importing — this creates active loans that immediately start deducting from payroll. Fix and re-upload the file rather than proceeding if anything looks wrong.</p>`;
  document.getElementById('loanImportCommitBtn').disabled=valid.length===0;
}
function commitLoanImport(){
  let u=activeSystemUser(),created=0;
  loanImportRows.filter(r=>r.matched&&r.original>0).forEach(r=>{
    let e=r.matched;
    let balance=Math.min(r.original,r.balance>=0?r.balance:r.original);
    let deduction=r.deduction>0?r.deduction:Math.ceil(r.original/12);
    db.loans=db.loans||[];
    let loan={id:'LN-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),requestId:'',emp:e.id,name:e.name,approvedAmount:r.original,monthlyDeduction:deduction,outstanding:balance,status:balance<=0?'Paid Off':'Active',approvedBy:u.username,approvedAt:new Date().toISOString(),termMonths:null,startMonth:'',source:'Bulk Import — pre-existing loan, no start date on record',notes:r.notes||'',recordedBy:u.username};
    db.loans.push(loan);
    db.deductions=db.deductions||[];
    db.deductions.push({id:'DED-LOAN-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),emp:e.id,type:'Loan',amount:deduction,startDate:todayISO(),status:loan.status,loanId:loan.id,description:'Employee loan repayment (bulk imported)'});
    created++;
  });
  log('Bulk loan import',`${created} loans recorded`);
  save();closeModal();render();
  alert(`Import complete: ${created} loan(s) recorded and active. They'll start deducting from the next payroll cycle you run for each employee.`);
}
function loanRepayments(){db.loanRepayments=db.loanRepayments||[];return db.loanRepayments}
function loanScheduleMonthOptions(){
  // A dropdown spanning 6 years back to 6 years forward from today (12 years total) so any
  // historical or future month can be picked directly, rather than typing a date.
  const today=new Date(),months=[];
  for(let offset=-72;offset<=72;offset++){
    const d=new Date(today.getFullYear(),today.getMonth()+offset,1);
    months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  }
  return months;
}
function monthLabel(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Date(y,m-1,1).toLocaleString('en-NG',{month:'long',year:'numeric'});
}
function openLoanSchedule(){
  const thisMonth=todayISO().slice(0,7),months=loanScheduleMonthOptions();
  openModal(`<h3>Loan Schedule & Report</h3>
  <p class="label">A record of what was actually deducted each month, taken from locked payroll cycles — not a projection. Cumulative totals build up from the first recorded deduction through the month you select.</p>
  <div class="grid">
    <label>Select Month<select id="lsMonth" onchange="renderLoanSchedule()">${months.map(m=>`<option value="${m}" ${m===thisMonth?'selected':''}>${monthLabel(m)}</option>`).join('')}</select></label>
  </div>
  <div id="lsContent"></div>
  <div class="toolbar"><button class="btn primary" onclick="downloadLoanSchedule()">Download Schedule (CSV)</button><button class="btn secondary" onclick="closeModal()">Close</button></div>`);
  renderLoanSchedule();
}
function loanScheduleRowsForMonth(ym){
  // One row per loan that has EVER had a recorded deduction up to and including this month, showing
  // this month's actual deduction (0 if none was deducted that specific month) and the cumulative
  // total from the first recorded deduction through this month.
  const allUpToMonth=loanRepayments().filter(r=>r.period<=ym);
  const loanIds=[...new Set(allUpToMonth.map(r=>r.loanId))];
  return loanIds.map(loanId=>{
    const entries=allUpToMonth.filter(r=>r.loanId===loanId).sort((a,b)=>a.period.localeCompare(b.period));
    const loan=(db.loans||[]).find(l=>l.id===loanId)||{name:entries[0]?.name||'',approvedAmount:0};
    const thisMonthEntry=entries.find(r=>r.period===ym);
    const cumulative=entries.reduce((s,r)=>s+r.amountDeducted,0);
    const latest=entries[entries.length-1];
    return{loan,loanId,name:loan.name||entries[0]?.name,thisMonthDeduction:thisMonthEntry?thisMonthEntry.amountDeducted:0,cumulativeDeducted:cumulative,currentBalance:latest?latest.balanceAfter:loan.approvedAmount,status:loan.status||'Active'};
  }).sort((a,b)=>String(a.name).localeCompare(String(b.name)));
}
function renderLoanSchedule(){
  const ym=document.getElementById('lsMonth').value;
  const rows=loanScheduleRowsForMonth(ym);
  const monthTotal=rows.reduce((s,r)=>s+r.thisMonthDeduction,0),cumulativeTotal=rows.reduce((s,r)=>s+r.cumulativeDeducted,0);
  document.getElementById('lsContent').innerHTML=`<h4>${monthLabel(ym)}</h4><table><tr><th>Employee</th><th>Loan ID</th><th>Deducted This Month</th><th>Cumulative Deducted</th><th>Current Balance</th><th>Status</th></tr>
  ${rows.map(r=>`<tr><td>${esc(r.name)}</td><td>${esc(r.loanId)}</td><td>${r.thisMonthDeduction>0?money(r.thisMonthDeduction):'—'}</td><td>${money(r.cumulativeDeducted)}</td><td>${money(r.currentBalance)}</td><td>${esc(r.status)}</td></tr>`).join('')||'<tr><td colspan="6">No loan deductions recorded up to this month. Deductions are recorded automatically when a payroll cycle carrying a loan repayment is locked.</td></tr>'}
  <tr><th colspan="2">Total</th><th>${money(monthTotal)}</th><th>${money(cumulativeTotal)}</th><th></th><th></th></tr></table>`;
}
function downloadLoanSchedule(){
  const ym=document.getElementById('lsMonth').value,rows=loanScheduleRowsForMonth(ym);
  const monthTotal=rows.reduce((s,r)=>s+r.thisMonthDeduction,0),cumulativeTotal=rows.reduce((s,r)=>s+r.cumulativeDeducted,0);
  let csvRows=[
    ['Loan Schedule',monthLabel(ym)],
    [],
    ['Employee','Loan ID','Deducted This Month','Cumulative Deducted','Current Balance','Status']
  ];
  rows.forEach(r=>csvRows.push([r.name,r.loanId,r.thisMonthDeduction.toFixed(2),r.cumulativeDeducted.toFixed(2),r.currentBalance.toFixed(2),r.status]));
  csvRows.push(['','Total',monthTotal.toFixed(2),cumulativeTotal.toFixed(2),'','']);
  let csv=csvRows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=`marlum-loan-schedule-${ym}.csv`;
  a.click();
  log('Loan schedule downloaded',ym);
}
function approveHRAction(id){
  let a=hrActions().find(x=>x.id===id);if(!a)return;
  let e=db.employees.find(x=>x.id===a.emp);if(!e)return;
  const u=activeSystemUser(),roles=normalizeRoles(u);
  if(!roles.some(r=>['HR Manager','MD / Approver','Management','Super Admin'].includes(r))){alert('Only HR Manager or the MD/Approver can approve HR actions.');return}
  if(a.createdBy&&a.createdBy===u.username&&!roles.includes('Super Admin')){alert('Segregation of duties: you cannot approve an HR action you submitted yourself.');return}
  a.status='Approved';a.approvedBy=u.username;a.approvedAt=new Date().toISOString();
  // Apply non-sensitive administrative changes immediately; salary changes become effective-dated records.
  if((a.type==='Transfer'||a.type==='Department Change')&&a.department)e.dept=a.department;
  if(['Resignation','Termination'].includes(a.type)){
    // Must set employmentStatus (not just status) — migrateEmployee runs on every render and treats
    // employmentStatus as the source of truth, syncing status FROM it. Setting only status here was
    // getting silently overwritten back to 'Active' the moment render() ran at the end of this very
    // function, meaning an approved termination never actually took effect: the employee kept
    // showing as Active and kept being included in payroll cycles.
    e.employmentStatus=a.type==='Termination'?'Terminated':'Resigned';
    e.status=e.employmentStatus;
    e.exitDate=a.effectiveDate;
  }
  if(a.type==='Confirmation')e.employmentConfirmedDate=a.effectiveDate;
  if(a.type==='Promotion'&&a.notes)e.position=a.notes;
  save();log('HR action approved',`${e.name} — ${a.type}`);render();
}
function rejectHRAction(id){
  let a=hrActions().find(x=>x.id===id);if(!a)return;
  const u=activeSystemUser(),roles=normalizeRoles(u);
  if(!roles.some(r=>['HR Manager','MD / Approver','Management','Super Admin'].includes(r))){alert('Only HR Manager or the MD/Approver can reject HR actions.');return}
  if(a.createdBy&&a.createdBy===u.username&&!roles.includes('Super Admin')){alert('Segregation of duties: you cannot reject an HR action you submitted yourself.');return}
  a.status='Rejected';a.rejectedBy=u.username;a.rejectedAt=new Date().toISOString();save();log('HR action rejected',`${a.name} — ${a.type}`);render();
}
function openHRActionRegister(){
  // The Employee Lifecycle & HR Actions page already shows every HR action with Approve/Reject
  // right on the page (lifeRows) — this used to pop up a second, separate, read-only copy of the
  // exact same list. It now just takes you to that page instead of duplicating it in a pop-up.
  closeModal();
  navToPage('lifecycle');
}
function openEmployeeTimeline(){
  let all=db.employees;
  openModal(`<h3>Employee Timeline</h3><label>Employee<select id="timelineEmp">${all.map(e=>`<option value="${e.id}">${esc(e.name)} (${esc(e.id)})</option>`).join('')}</select></label>
  <div class="toolbar"><button class="btn primary" onclick="showEmployeeTimeline(document.getElementById('timelineEmp').value)">View Timeline</button><button class="btn secondary" onclick="closeModal()">Close</button></div>`);
}
function showEmployeeTimeline(id){
  let e=db.employees.find(x=>x.id===id), actions=hrActions().filter(a=>a.emp===id).sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate));
  let docs=hrDocsFor(id).map(d=>({date:d.issue||d.createdAt?.slice(0,10)||'',title:'Document: '+d.type,status:d.status}));
  let loans=(db.loans||[]).filter(l=>l.emp===id).map(l=>({date:l.approvedAt?l.approvedAt.slice(0,10):(l.startMonth?l.startMonth+'-01':''),title:'Loan: '+money(l.approvedAmount),status:l.status,details:`${money(l.monthlyDeduction)}/month · Outstanding ${money(l.outstanding)} · Approved by ${l.approvedBy||'—'}${l.source?' · '+l.source:''}`}));
  let events=actions.map(a=>({date:a.effectiveDate,title:a.type,status:a.status,details:a.notes})).concat(docs).concat(loans).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const thisMonth=todayISO().slice(0,7),thisYear=todayISO().slice(0,4);
  const daysThisMonth=monthlyPresentDays(id,thisMonth),daysThisYear=yearlyPresentDays(id,thisYear),workingDaysThisMonth=workingDaysSoFarInMonth(thisMonth);
  openModal(`<h3>${esc(e.name)} — HR Timeline</h3>
  <div class="grid"><div class="card"><div class="label">Days Present This Month</div><div class="metric">${daysThisMonth} / ${workingDaysThisMonth}</div></div><div class="card"><div class="label">Days Present This Year</div><div class="metric">${daysThisYear}</div></div></div>
  <p class="label">Attendance is tracked monthly and aggregated yearly as part of this employee's performance record.</p>
  <table><tr><th>Date</th><th>Event</th><th>Status</th><th>Details</th></tr>
  ${events.map(x=>`<tr><td>${x.date}</td><td>${esc(x.title)}</td><td>${esc(x.status)}</td><td>${esc(x.details||'—')}</td></tr>`).join('')||'<tr><td colspan="4">No HR events recorded.</td></tr>'}</table><button class="btn secondary" onclick="closeModal()">Close</button>`);
}

function salaryChanges(){db.salaryChanges=db.salaryChanges||[];return db.salaryChanges}
function employeeSalary(e){return {basic:Number(e.basic||0),housing:Number(e.housing||0),transport:Number(e.transport||0),other:Number(e.other||0)}}
function salaryGross(s){return Number(s.basic||0)+Number(s.housing||0)+Number(s.transport||0)+Number(s.other||0)}
function openCompensationChange(){
  let active=db.employees.filter(e=>e.status==='Active');
  openModal(`<h3>New Salary Change</h3><div class="grid">
  <label>Employee<select id="salEmp">${active.map(e=>`<option value="${e.id}">${esc(e.name)} (${esc(e.id)})</option>`).join('')}</select></label>
  <label>Effective Date<input id="salDate" type="date" value="${todayISO()}"></label>
  <label>Basic Salary<input id="salBasic" type="number" min="0"></label>
  <label>Housing<input id="salHousing" type="number" min="0"></label>
  <label>Transport<input id="salTransport" type="number" min="0"></label>
  <label>Other<input id="salOther" type="number" min="0"></label>
  <label>Reason<select id="salReason"><option>Annual Salary Review</option><option>Promotion</option><option>Merit Increase</option><option>Adjustment</option><option>Role Change</option><option>Management Decision</option></select></label>
  <label>Notes<input id="salNotes"></label></div>
  <p class="label">Salary changes require approval. The approved salary becomes effective only from the selected effective date and does not rewrite prior payroll periods.</p>
  <div class="toolbar"><button class="btn primary" onclick="saveSalaryChange()">Submit for Approval</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
  let e=active[0]; if(e){let s=employeeSalary(e);document.getElementById('salBasic').value=s.basic;document.getElementById('salHousing').value=s.housing;document.getElementById('salTransport').value=s.transport;document.getElementById('salOther').value=s.other}
  document.getElementById('salEmp').onchange=function(){let e=db.employees.find(x=>x.id===this.value),s=employeeSalary(e);document.getElementById('salBasic').value=s.basic;document.getElementById('salHousing').value=s.housing;document.getElementById('salTransport').value=s.transport;document.getElementById('salOther').value=s.other}
}
function saveSalaryChange(){
  let e=db.employees.find(x=>x.id===document.getElementById('salEmp').value);
  let a={id:'SAL-'+Date.now(),emp:e.id,name:e.name,effectiveDate:document.getElementById('salDate').value,
    basic:Number(document.getElementById('salBasic').value||0),housing:Number(document.getElementById('salHousing').value||0),
    transport:Number(document.getElementById('salTransport').value||0),other:Number(document.getElementById('salOther').value||0),
    reason:document.getElementById('salReason').value,notes:document.getElementById('salNotes').value,status:'Pending',createdBy:activeSystemUser().username,createdAt:new Date().toISOString()};
  salaryChanges().push(a);log('Salary change submitted',`${e.name} — effective ${a.effectiveDate}`);save();closeModal();render();
}
function approveSalaryChange(id){
  let a=salaryChanges().find(x=>x.id===id);if(!a)return;
  const u=activeSystemUser(),roles=normalizeRoles(u);
  if(!roles.some(r=>['MD / Approver','Management','Super Admin'].includes(r))){alert('Only the MD / authorized Approver can approve a salary change.');return}
  if(a.createdBy&&a.createdBy===u.username&&!roles.includes('Super Admin')){alert('Segregation of duties: you cannot approve a salary change you submitted yourself.');return}
  a.status='Approved';a.approvedBy=u.username;a.approvedAt=new Date().toISOString();save();log('Salary change approved',`${a.name} — effective ${a.effectiveDate}`);render()
}
function rejectSalaryChange(id){
  let a=salaryChanges().find(x=>x.id===id);if(!a)return;
  const u=activeSystemUser(),roles=normalizeRoles(u);
  if(!roles.some(r=>['MD / Approver','Management','Super Admin'].includes(r))){alert('Only the MD / authorized Approver can reject a salary change.');return}
  if(a.createdBy&&a.createdBy===u.username&&!roles.includes('Super Admin')){alert('Segregation of duties: you cannot reject a salary change you submitted yourself.');return}
  a.status='Rejected';a.rejectedBy=u.username;a.rejectedAt=new Date().toISOString();save();log('Salary change rejected',a.name);render()
}
function salaryForEmployeeAt(empId,period){
  let e=db.employees.find(x=>x.id===empId),base=employeeSalary(e),changes=salaryChanges().filter(x=>x.emp===empId&&x.status==='Approved'&&x.effectiveDate<=period).sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate));
  if(changes.length){let x=changes[changes.length-1];return {basic:x.basic,housing:x.housing,transport:x.transport,other:x.other,source:x.id,effectiveDate:x.effectiveDate}}
  return {...base,source:'Employee Master',effectiveDate:e?.joinDate||''};
}
function openSalaryRegister(){
  let active=db.employees.filter(e=>e.status==='Active'),period=new Date().toISOString().slice(0,7);
  openModal(`<h3>Monthly Salary Register — ${period}</h3><table><tr><th>Employee</th><th>Basic</th><th>Housing</th><th>Transport</th><th>Other</th><th>Gross</th><th>Source</th></tr>
  ${active.map(e=>{let s=salaryForEmployeeAt(e.id,period+'-31');return `<tr><td>${esc(e.name)}</td><td>${money(s.basic)}</td><td>${money(s.housing)}</td><td>${money(s.transport)}</td><td>${money(s.other)}</td><td>${money(salaryGross(s))}</td><td>${esc(s.source)}</td></tr>`}).join('')}</table><button class="btn secondary" onclick="closeModal()">Close</button>`);
}
function openSalaryHistory(){
  openModal(`<h3>Employee Salary History</h3><label>Employee<select id="salaryHistEmp">${db.employees.map(e=>`<option value="${e.id}">${esc(e.name)} (${esc(e.id)})</option>`).join('')}</select></label>
  <div class="toolbar"><button class="btn primary" onclick="showSalaryHistory(document.getElementById('salaryHistEmp').value)">View History</button><button class="btn secondary" onclick="closeModal()">Close</button></div>`);
}
function showSalaryHistory(id){
  let e=db.employees.find(x=>x.id===id),rows=salaryChanges().filter(x=>x.emp===id).sort((a,b)=>b.effectiveDate.localeCompare(a.effectiveDate)),base=employeeSalary(e);
  openModal(`<h3>${esc(e.name)} — Salary History</h3><table><tr><th>Effective</th><th>Basic</th><th>Housing</th><th>Transport</th><th>Other</th><th>Gross</th><th>Reason</th><th>Status</th></tr>
  <tr><td>${esc(e.joinDate||'Original')}</td><td>${money(base.basic)}</td><td>${money(base.housing)}</td><td>${money(base.transport)}</td><td>${money(base.other)}</td><td>${money(salaryGross(base))}</td><td>Original Salary</td><td>Current</td></tr>
  ${rows.map(x=>`<tr><td>${x.effectiveDate}</td><td>${money(x.basic)}</td><td>${money(x.housing)}</td><td>${money(x.transport)}</td><td>${money(x.other)}</td><td>${money(salaryGross(x))}</td><td>${esc(x.reason)}</td><td>${esc(x.status)}</td></tr>`).join('')}</table><button class="btn secondary" onclick="closeModal()">Close</button>`);
}

function essUsers(){db.essUsers=db.essUsers||{};return db.essUsers}
function essUserFor(id){
  let users=essUsers();
  if(!users[id]) users[id]={enabled:true,lastAccess:''};
  return users[id];
}
function openEmployeePortal(){
  let active=db.employees.filter(e=>e.status==='Active');
  openModal(`<h3>Employee Portal Preview</h3>
  <label>Select Employee<select id="portalEmp">${active.map(e=>`<option value="${e.id}">${esc(e.name)} (${esc(e.id)})</option>`).join('')}</select></label>
  <div class="toolbar"><button class="btn primary" onclick="showEmployeePortal(document.getElementById('portalEmp').value)">Open Portal</button><button class="btn secondary" onclick="closeModal()">Close</button></div>`);
}
// showEmployeePortal (base version) removed entirely: it was fully dead — overridden twice more further
// down the file (the V191 rich portal view, itself then patched by a V27 layer for correct payslips),
// so this original definition could never actually run. Its own logic also read dead fields (db.attendance,
// db.payroll) left over from the pre-Payroll-Cycles system; harmless only because nothing ever called it,
// but confusing to leave in place — the REAL, active showEmployeePortal (further down, V191 + V27) already
// correctly sources attendance from attendanceRecords()/monthlyPresentDays()/yearlyPresentDays() and
// payslips from allEmployeeCycleLines(), which is what every employee's own portal actually shows.
// openESSUserManager and toggleESSUser removed: they toggled an "enabled" flag that nothing in the
// real access path (isPageAllowedV20, permittedCategoriesV20, the server's get_my_portal_state) ever
// checked, so it could not actually turn anyone's portal access on or off — only Users & Security, or
// removing the email from Employee Management, does that for real. essUserFor() itself stays, since
// showEmployeePortal still uses it to record when an admin last previewed someone's portal.

const rolePermissions={
  'Super Admin':['dashboard','employees','hr','compensation','payroll','attendance','leave','payslips','payments','reports','security','ess'],
  // Employee Portal ('ess'): Super Admin, HR Manager and MD / Approver administer it (whole-company register);
  // the Employee role opens it for a plain staff login; and ANY login linked to a real employee record gets it too
  // (added in permittedCategoriesV20) but sees only their own record.
  'HR Manager':['dashboard','employees','hr','attendance','leave','payslips','reports','ess'],
  // Accountant: attendance management and payroll management ONLY. Deliberately no Dashboard, Employee
  // Management, Compensation, Reports or Employee Portal — those are HR-side information.
  'Accountant':['payroll','payslips','attendance'],
  'Financial Controller':['dashboard','compensation','payroll','payslips','payments','reports'],
  'MD / Approver':['dashboard','payroll','compensation','hr','payments','reports','ess'],
  'Employee':['ess'],
  'Management':['dashboard','reports']
};
const approvalPermissions={
  'Payroll Preparation':['Accountant','Super Admin'],
  'Payroll Review':['Financial Controller','Super Admin'],
  'Payroll Approval':['MD / Approver','Management','Super Admin'],
  'Payment Processing':['Financial Controller','Super Admin'],
  'Payment Approval':['MD / Approver','Management','Super Admin']
};
function normalizeRoles(u){return Array.isArray(u.roles)?u.roles:(u.role?[u.role]:[])}
// REAL user management, replacing the removed client-side "prototype" (which stored a fake,
// weakly-scrambled password in the app's own JSONB data and never touched actual Supabase Auth —
// anyone "created" there could never have actually signed in). This calls the admin-users Edge
// Function, which does the privileged work server-side with the service role key and independently
// re-checks the caller is a Super Admin before doing anything — the button below being hidden from
// non-admins is a UI convenience, not the real security boundary.
const REAL_ROLES=[
  {code:'super_admin',name:'Super Admin'},
  {code:'md_approver',name:'MD / Approver'},
  {code:'financial_controller',name:'Financial Controller'},
  {code:'accountant',name:'Accountant'},
  {code:'hr',name:'HR Manager'},
  {code:'employee',name:'Employee'},
];
let realUsersCache=null,realUsersLoading=false,realUsersError=null;
async function loadRealUsers(){
  if(!window.marlumSupabase){realUsersError='Not connected yet — try again in a moment.';render();return}
  realUsersLoading=true;realUsersError=null;render();
  try{
    const {data,error}=await window.marlumSupabase.functions.invoke('admin-users',{body:{action:'list'}});
    if(error)throw error;
    if(data&&data.error)throw new Error(data.error);
    realUsersCache=data.users||[];
  }catch(e){
    realUsersError=e.message||String(e);
    if(realUsersCache===null)realUsersCache=[];
  }finally{
    realUsersLoading=false;render();
  }
}
function openCreateRealUser(){
  openModal(`<h3>Create User</h3><div class="grid">
  <label>Email Address<input id="ruEmail" type="email" placeholder="name@marlum.com"></label>
  <label>Temporary Password<input id="ruPassword" type="password" placeholder="At least 8 characters"></label>
  <label>Roles (select one or more)<div class="checkbox-list">${REAL_ROLES.map(r=>`<label><input type="checkbox" class="ruRole" value="${r.code}"> ${r.name}</label>`).join('')}</div></label>
  </div>
  <p class="label">This creates a real account the person can actually sign in with immediately — their email is pre-confirmed, no separate verification step needed. Share the temporary password with them directly; ask them to change it after first sign-in.</p>
  <div class="toolbar"><button class="btn primary" id="ruCreateBtn" onclick="saveCreateRealUser()">Create User</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>
  <p class="label" id="ruCreateStatus"></p>`);
}
async function saveCreateRealUser(){
  const email=document.getElementById('ruEmail').value.trim();
  const password=document.getElementById('ruPassword').value;
  const roleCodes=[...document.querySelectorAll('.ruRole:checked')].map(x=>x.value);
  const statusEl=document.getElementById('ruCreateStatus'),btn=document.getElementById('ruCreateBtn');
  if(!email||!email.includes('@')){statusEl.textContent='Enter a valid email address.';statusEl.style.color='#a33c34';return}
  if(password.length<8){statusEl.textContent='Password must be at least 8 characters.';statusEl.style.color='#a33c34';return}
  if(!roleCodes.length){statusEl.textContent='Select at least one role.';statusEl.style.color='#a33c34';return}
  btn.disabled=true;statusEl.style.color='#496057';statusEl.textContent='Creating…';
  try{
    const {data,error}=await window.marlumSupabase.functions.invoke('admin-users',{body:{action:'create',email,password,roleCodes}});
    if(error)throw error;
    if(data&&data.error)throw new Error(data.error);
    log('User created',`${email} — ${roleCodes.join(', ')}`);save();
    closeModal();
    await loadRealUsers();
  }catch(e){
    btn.disabled=false;statusEl.style.color='#a33c34';statusEl.textContent=e.message||String(e);
  }
}
function openChangeRealUserRoles(userId,email,currentRoleNames){
  const currentCodes=REAL_ROLES.filter(r=>currentRoleNames.includes(r.name)).map(r=>r.code);
  openModal(`<h3>Change Roles — ${esc(email)}</h3>
  <div class="checkbox-list">${REAL_ROLES.map(r=>`<label><input type="checkbox" class="ruEditRole" value="${r.code}" ${currentCodes.includes(r.code)?'checked':''}> ${r.name}</label>`).join('')}</div>
  <div class="toolbar"><button class="btn primary" id="ruSaveRolesBtn" onclick="saveRealUserRoles('${esc(userId)}')">Save Roles</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>
  <p class="label" id="ruRolesStatus"></p>`);
}
async function saveRealUserRoles(userId){
  const roleCodes=[...document.querySelectorAll('.ruEditRole:checked')].map(x=>x.value);
  const statusEl=document.getElementById('ruRolesStatus'),btn=document.getElementById('ruSaveRolesBtn');
  if(!roleCodes.length){statusEl.textContent='Select at least one role.';statusEl.style.color='#a33c34';return}
  btn.disabled=true;statusEl.style.color='#496057';statusEl.textContent='Saving…';
  try{
    const {data,error}=await window.marlumSupabase.functions.invoke('admin-users',{body:{action:'setRoles',userId,roleCodes}});
    if(error)throw error;
    if(data&&data.error)throw new Error(data.error);
    log('User roles changed',`${userId} — ${roleCodes.join(', ')}`);save();
    closeModal();
    await loadRealUsers();
  }catch(e){
    btn.disabled=false;statusEl.style.color='#a33c34';statusEl.textContent=e.message||String(e);
  }
}
async function toggleRealUserStatus(userId,disable){
  if(!confirm(disable?'Disable this user? They will not be able to sign in, and their access to company data stops straight away. A screen they already have open may stay visible until they refresh, but it can no longer load or save anything. You can re-enable them at any time.':'Re-enable this user? They will be able to sign in again.'))return;
  try{
    const {data,error}=await window.marlumSupabase.functions.invoke('admin-users',{body:{action:'toggleStatus',userId,disable}});
    if(error)throw error;
    if(data&&data.error)throw new Error(data.error);
    log('User status changed',`${userId} — ${disable?'Disabled':'Enabled'}`);save();
    await loadRealUsers();
  }catch(e){
    alert(e.message||String(e));
  }
}
async function makeInviteLink(userId,email){
  if(!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Only a Super Admin can create an invite link.');return}
  try{
    const {data,error}=await window.marlumSupabase.functions.invoke('admin-users',{body:{action:'inviteLink',userId,redirectTo:location.origin+location.pathname}});
    if(error)throw error;
    if(data&&data.error)throw new Error(data.error);
    if(!data||!data.link)throw new Error('No link came back from the server.');
    log('Invite link created',email);save();
    openModal(`<h3>Invite link for ${esc(email)}</h3>
      <p class="label">Send this link to <b>${esc(email)}</b> yourself — WhatsApp is fine. When they open it they tap <b>Continue</b> and then choose their own password. The link works once and stays valid for about an hour, so send it straight away. If it expires or is used, just create a new one here.</p>
      <p class="label" style="color:#a33c34">Anyone who opens this link and taps Continue can activate this account, so send it only to the right person and do not post it anywhere public.</p>
      <textarea id="inviteLinkBox" readonly style="width:100%;height:120px;font-size:12px">${esc(data.link)}</textarea>
      <div class="toolbar"><button class="btn primary" onclick="copyInviteLink()">Copy link</button><button class="btn secondary" onclick="closeModal()">Close</button></div>
      <p id="inviteCopyMsg" class="label"></p>`);
  }catch(e){alert(e.message||String(e))}
}
function copyInviteLink(){
  const box=document.getElementById('inviteLinkBox'),msg=document.getElementById('inviteCopyMsg');if(!box)return;
  box.select();
  const done=()=>{if(msg)msg.textContent='Copied. Paste it into your message to them.'};
  try{navigator.clipboard.writeText(box.value).then(done,()=>{document.execCommand('copy');done()})}catch(e){try{document.execCommand('copy');done()}catch(e2){if(msg)msg.textContent='Press Ctrl+C (or hold and copy) to copy the selected link.'}}
}
async function approveRealUser(userId,email){
  if(!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Only a Super Admin can approve an account.');return}
  if(!confirm('Approve '+email+'?\n\nThis account registered itself before self-signup was closed. Only approve it if you are certain this email address really belongs to the person you expect — approving lets it see the employee record that carries this email address.'))return;
  try{
    const {data,error}=await window.marlumSupabase.functions.invoke('admin-users',{body:{action:'approve',userId}});
    if(error)throw error;
    if(data&&data.error)throw new Error(data.error);
    log('User approved',email);save();
    await loadRealUsers();
  }catch(e){alert(e.message||String(e))}
}
function renderSecurityUsers(){
  const secUsersEl=document.getElementById('secUsers');
  if(!secUsersEl)return; // security page isn't in the DOM right now
  if(realUsersCache===null){
    document.getElementById('secRows').innerHTML='<tr><td colspan="6">Loading…</td></tr>';
    return;
  }
  const su=realUsersCache;
  document.getElementById('secUsers').textContent=su.length;
  document.getElementById('secAdmins').textContent=su.filter(x=>x.roles.includes('Super Admin')).length;
  document.getElementById('secDisabled').textContent=su.filter(x=>x.disabled).length;
  document.getElementById('secNeverSignedIn').textContent=su.filter(x=>!x.lastSignInAt).length;
  const rows=su.map(u=>`<tr><td>${esc(u.email)}</td><td>—</td><td>${esc(u.roles.join(', ')||'—')}</td><td>${u.disabled?'Disabled':'Active'}${u.provisioned?'':' <span style="color:#a33c34;font-weight:600">· Not approved</span>'}</td><td>${u.lastSignInAt?esc(u.lastSignInAt.slice(0,16).replace('T',' ')):'<span style="color:#9a6b32;font-weight:600">Not yet signed in</span>'}</td><td>${u.provisioned?'':`<button class="btn primary" onclick="approveRealUser('${esc(u.id)}','${esc(u.email)}')">Approve</button> `}<button class="btn secondary" onclick="makeInviteLink('${esc(u.id)}','${esc(u.email)}')">Invite link</button> <button class="btn secondary" onclick="openChangeRealUserRoles('${esc(u.id)}','${esc(u.email)}',${JSON.stringify(u.roles).replace(/"/g,'&quot;')})">Roles</button> <button class="btn secondary" onclick="toggleRealUserStatus('${esc(u.id)}',${u.disabled?'false':'true'})">${u.disabled?'Enable':'Disable'}</button></td></tr>`).join('')||'<tr><td colspan="6">No users yet.</td></tr>';
  document.getElementById('secRows').innerHTML=realUsersLoading?'<tr><td colspan="6">Refreshing…</td></tr>':(realUsersError?`<tr><td colspan="6" style="color:#a33c34">Could not load users: ${esc(realUsersError)} — <a href="#" onclick="loadRealUsers();return false">retry</a></td></tr>`:rows);
}
function currentUser(){return db.currentUser||null}
function userPermissions(roles){
  roles=Array.isArray(roles)?roles:[roles];
  return [...new Set(roles.flatMap(r=>rolePermissions[r]||[]))];
}
function canPerformApproval(u,action){
  let roles=normalizeRoles(u);
  return (approvalPermissions[action]||[]).some(r=>roles.includes(r));
}
function approvalConflict(u,action,createdBy){
  let roles=normalizeRoles(u);
  return createdBy && createdBy===u.username && ['Payroll Approval','Payment Approval'].includes(action);
}

function openRoleMatrix(){
  openModal(`<h3>Roles, Permissions & Approval Matrix</h3>
  <h4>Module Permissions</h4><table><tr><th>Role</th><th>Permitted Modules</th></tr>
  ${Object.entries(rolePermissions).map(([r,p])=>`<tr><td>${esc(r)}</td><td>${p.map(esc).join(', ')}</td></tr>`).join('')}</table>
  <h4>Payroll & Payment Approval Flow</h4><table><tr><th>Action</th><th>Authorized Role(s)</th></tr>
  ${Object.entries(approvalPermissions).map(([a,r])=>`<tr><td>${esc(a)}</td><td>${r.map(esc).join(', ')}</td></tr>`).join('')}</table>
  <p class="label"><strong>Segregation of duties:</strong> payroll/payment preparation and approval are treated as separate responsibilities. A user should not approve their own transaction.</p>
  <button class="btn secondary" onclick="closeModal()">Close</button>`);
}
function openAuditLog(){
  closeModal();
  navToPage('audit');
}

function paymentBatches(){db.paymentBatches=db.paymentBatches||[];return db.paymentBatches}
function activeSystemUser(){
  let u=currentUser();
  return u||{username:'local-admin',roles:['Super Admin'],name:'System Administrator'};
}
function batchRoles(action){return approvalPermissions[action]||[]}
function userHasRoleFor(action,u){
  u=u||activeSystemUser();let roles=normalizeRoles(u);
  // Creating / preparing a payroll run: a Super Admin, or an Accountant who is ALSO on the staff list (their
  // login is linked to a real employee record). An Accountant who is not staff can update timesheets and
  // attendance and can view payroll runs, but cannot create or prepare one.
  if(action==='Payroll Preparation')return roles.includes('Super Admin')||(roles.includes('Accountant')&&!!u.employeeId);
  return batchRoles(action).some(r=>roles.includes(r));
}
const CYCLE_VIEW_ONLY_MSG='You have view-only access to payroll runs. Only an Accountant who is also on the staff list, or a Super Admin, can create or prepare a payroll run.';
const RECON_VIEW_ONLY_MSG='Bank reconciliation can only be recorded by an Accountant who is also on the staff list, the Financial Controller or a Super Admin. You can view it but not change it.';
function canAdvanceBatch(batch,action){
  let u=activeSystemUser();
  if(!userHasRoleFor(action,u)){alert(`Your current role does not permit: ${action}.`);return false}
  if(['Payroll Approval','Payment Approval'].includes(action)&&batch.createdBy===u.username&&!normalizeRoles(u).includes('Super Admin')){
    alert('Segregation of duties: a user cannot approve their own transaction.');return false
  }
  return true;
}
function payrollNetTotal(){
  let items=db.payroll?.items||[];
  return items.reduce((n,x)=>n+Number(x.netPay||0),0);
}
function createPayrollPaymentBatch(){
  let p=db.payroll;
  if(!p||!p.items||!p.items.length){alert('There is no calculated payroll available to create a payment batch.');return}
  if(!userHasRoleFor('Payroll Preparation')){alert('Only an authorized payroll preparer can create a payment batch.');return}
  let period=p.displayMonth||p.month||new Date().toISOString().slice(0,7);
  if(paymentBatches().some(b=>b.period===period&&['Draft','Awaiting Review','Awaiting MD Approval','Approved','Processing','Paid'].includes(b.status))){
    alert(`A payment batch already exists for ${period}. Review the existing batch instead of creating a duplicate.`);return
  }
  let batch={id:'PB-'+Date.now(),period,employeeCount:p.items.length,totalNet:payrollNetTotal(),status:'Awaiting Review',
    createdBy:activeSystemUser().username,createdAt:new Date().toISOString(),reviewedBy:'',approvedBy:'',processedBy:'',
    paymentDate:'',bankFileStatus:'Not Generated',items:p.items.map(x=>({employeeId:x.id,name:x.name,netPay:Number(x.netPay||0),accountName:x.accountName||x.bankAccountName||x.name||'',accountNumber:x.accountNumber||x.bankAccountNumber||'',bankName:x.bankName||x.bank||'',status:'Pending'}))};
  paymentBatches().push(batch);log('Payroll payment batch created',`${batch.id} — ${batch.period}`);save();render();
}
function reviewPaymentBatch(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  if(!canAdvanceBatch(b,'Payroll Review'))return;
  b.status='Awaiting MD Approval';b.reviewedBy=activeSystemUser().username;b.reviewedAt=new Date().toISOString();
  log('Payroll payment batch reviewed',`${b.id} — ${b.period}`);save();render();
}
function approvePaymentBatch(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  if(!canAdvanceBatch(b,'Payroll Approval'))return;
  b.status='Approved';b.approvedBy=activeSystemUser().username;b.approvedAt=new Date().toISOString();
  log('Payroll payment batch approved',`${b.id} — ${b.period}`);save();render();
}
function generateBankPaymentFile(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  if(!userHasRoleFor('Payment Processing')){alert('Only the Financial Controller / authorized payment processor can generate a payment file.');return}
  if(b.status!=='Approved'){alert('Only an approved payment batch can be sent for processing.');return}
  let missing=b.items.filter(hasIncompleteBankDetails);
  if(missing.length){alert(`Cannot generate payment file. ${missing.length} employee(s) have incomplete bank details.`);return}
  b.status='Processing';b.bankFileStatus='Generated';b.processedBy=activeSystemUser().username;b.processedAt=new Date().toISOString();
  log('Bank payment file generated',`${b.id} — ${b.items.length} employees`);save();render();
}
function openPaymentFile(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  const cb=(db.settings&&db.settings.companyBank)||{};
  openModal(`<h3>Bank Payment Batch — ${esc(b.id)}</h3>
  <p><strong>Payroll:</strong> ${esc(b.period)} &nbsp; <strong>Total:</strong> ${money(b.totalNet)}</p>
  ${cb.accountNumber?`<p class="label">Paying from: ${esc(cb.bankName||'')} — ${esc(cb.accountName||'')} — ${esc(cb.accountNumber||'')}</p>`:'<p class="label">No company payment account set — add one in Settings so it shows here for reference.</p>'}
  <table><tr><th>Employee</th><th>Account Name</th><th>Bank</th><th>Bank Code</th><th>Account Number</th><th>Amount</th></tr>
  ${b.items.map(x=>{const code=resolveBankCode(x.bankName);return `<tr><td>${esc(x.name)}</td><td>${esc(x.accountName)}</td><td>${esc(x.bankName)}</td><td${code?'':' style="color:#b00"'}>${code?esc(code):'Not recognized'}</td><td>${esc(x.accountNumber)}</td><td>${money(x.netPay)}</td></tr>`}).join('')}</table>
  <div class="toolbar"><button class="btn secondary" onclick="downloadBankUploadFile('${esc(id)}')">Download for Bank Upload</button><button class="btn secondary" onclick="downloadBankUploadPreviewText('${esc(id)}')">Preview as Text (safe to open)</button><button class="btn secondary" onclick="downloadBankUploadPreviewExcel('${esc(id)}')">Preview in Excel (safe to open)</button><button class="btn primary" onclick="markPaymentSubmitted('${esc(id)}')">Mark Submitted to Bank</button><button class="btn secondary" onclick="closeModal()">Close</button></div>
  <p class="label">This file matches Fidelity Bank's approved bulk-upload format: Beneficiary Bank Code, Beneficiary Account Number, Beneficiary Name, Amount, Narration. The bank code is looked up automatically from each employee's saved bank name — nothing to enter manually. If your bank changes their approved template, this format will need updating to match.</p>
  <p class="label"><strong>Before you upload:</strong> don't open the "Download for Bank Upload" file in Excel to check it — Excel silently strips leading zeros from bank codes and account numbers the moment it opens a CSV, even before you touch anything, and that damage can't be undone by reformatting the cell afterward. Use "Preview as Text" or "Preview in Excel" instead to check it safely — never upload either preview file to the bank itself, only the plain "Download for Bank Upload" file.</p>`);
}
// Fidelity Bank's approved bulk-upload template identifies each destination bank by a 6-digit
// CBN/NIBSS beneficiary bank code rather than a bank name, so every payout row must carry the
// correct code for the employee's own bank. BANK_CODE_MAP resolves any of the various bank-name
// spellings already stored on employee records (e.g. "GTB", "GTBank", "ECO BANK", "Ecobank") to
// that code. Keys are normalized (uppercase, letters/digits only) so spacing/punctuation/case
// differences in how a bank name was typed don't matter.
const BANK_CODE_MAP={
  STERLINGBANK:'000001',STERLING:'000001',
  KEYSTONEBANK:'000002',KEYSTONE:'000002',
  FCMB:'000003',
  UBA:'000004',UNITEDBANKFORAFRICA:'000004',
  DIAMONDBANK:'000005',DIAMOND:'000005',
  JAIZBANK:'000006',JAIZ:'000006',
  FIDELITYBANK:'000007',FIDELITY:'000007',
  POLARISBANK:'000008',POLARIS:'000008',
  CITIBANK:'000009',CITI:'000009',
  ECOBANK:'000010',
  UNITYBANK:'000011',UNITY:'000011',
  STANBICIBTC:'000012',STANBIC:'000012',STANBICIBTCBANK:'000012',
  GTBANK:'000013',GTB:'000013',GUARANTYTRUST:'000013',GUARANTYTRUSTBANK:'000013',
  ACCESSBANK:'000014',ACCESS:'000014',
  ZENITHBANK:'000015',ZENITH:'000015',
  FIRSTBANK:'000016',FIRSTBANKOFNIGERIA:'000016',FBN:'000016',
  WEMABANK:'000017',WEMA:'000017',
  UNIONBANK:'000018',UNION:'000018',
  ENTERPRISEBANK:'000019',
  HERITAGEBANK:'000020',HERITAGE:'000020',
  STANDARDCHARTERED:'000021',STANDARDCHARTEREDBANK:'000021',
  SUNTRUSTBANK:'000022',SUNTRUST:'000022',
  PROVIDUSBANK:'000023',PROVIDUS:'000023',
  RANDMERCHANTBANK:'000024',
  TITANTRUSTBANK:'000025',
  TAJBANK:'000026',TAJ:'000026',
  GLOBUSBANK:'000027',GLOBUS:'000027',
  CENTRALBANKOFNIGERIA:'000028',CBN:'000028',
  LOTUSBANK:'000029',LOTUS:'000029',
  PREMIUMTRUSTBANK:'000031',
  SIGNATUREBANK:'000034',
  OPTIMUSBANK:'000036',
};
function resolveBankCode(bankName){
  const key=String(bankName||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  return BANK_CODE_MAP[key]||'';
}
// Auto-fills the Bank Code field in the Employee Management form the moment a bank name is
// recognized, using this exact same function the real payment file is built from — so the code
// shown here is guaranteed to always match what payroll will actually use, never a separate,
// manually-typed value that could drift out of sync with it. Called on every keystroke (so it
// feels responsive) and again on blur — the blur pass is what raises the warning, so someone
// isn't told their entry is invalid before they've finished typing it.
window.autoFillBankCode=function(showWarningIfUnresolved){
  const bankInput=document.getElementById('e_bank'),codeInput=document.getElementById('e_bankCode'),warnEl=document.getElementById('e_bankCodeWarning');
  if(!bankInput||!codeInput)return;
  const name=bankInput.value.trim();
  const code=resolveBankCode(name);
  codeInput.value=code;
  if(!warnEl)return;
  if(!name){warnEl.innerHTML='';return}
  if(code){warnEl.innerHTML=`<p class="form-help" style="color:#1e6b3c">✓ Recognized — code ${esc(code)}. This is exactly what the bank payment file will use.</p>`}
  else if(showWarningIfUnresolved){warnEl.innerHTML=`<p class="form-help" style="color:#a33c34">⚠ "${esc(name)}" is not a recognized bank name — no code could be found for it. This employee will be blocked from the bank payment file until the bank name is corrected to a name the system recognizes (e.g. "First Bank", "GTBank", "Access Bank", "Zenith Bank", "UBA").</p>`}
  else{warnEl.innerHTML=''}
};
function buildBankUploadRows(b){
  // Matches Fidelity Bank's approved bulk-upload template exactly: no metadata preamble, header
  // row first, then one row per beneficiary. Column order/wording (including the header's trailing
  // spaces and the narration length note) mirrors the bank-provided template so it can be uploaded
  // as-is without reformatting.
  let rows=[
    ['Beneficiary Bank Code','Beneficiary Account Number ','Beneficiary Name','Amount','Narration(Must be between 5 to 47 Characters) ']
  ];
  b.items.forEach(x=>{
    rows.push([resolveBankCode(x.bankName),x.accountNumber,x.accountName,Number(x.netPay),`Salary Payment - ${b.period}`]);
  });
  return rows;
}
function downloadBankUploadPreviewText(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  let missing=b.items.filter(hasIncompleteBankDetails);
  if(missing.length){alert(`${missing.length} employee(s) have incomplete bank details. Fix these in Employee Management before previewing.`);return}
  let rows=buildBankUploadRows(b);
  // Plain-text, aligned columns — not CSV formatting — specifically so this is safe to open by simply
  // double-clicking it (Windows opens .txt in Notepad by default, and Notepad never reinterprets digits
  // as numbers). This is for YOUR review only — the actual bank upload should use the .csv file, since
  // some bank portals expect that exact file type.
  let widths=[20,26,32,14];
  let lines=rows.map(r=>r.map((v,i)=>String(v??'').padEnd(widths[i]||0)).join(' ').trimEnd());
  let txt=lines.join('\r\n');
  let a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'}));
  a.download=`marlum-bank-upload-PREVIEW-${b.id}.txt`;
  a.click();
  log('Bank upload preview (text) downloaded',`${b.id} — ${b.items.length} beneficiaries`);
}
function downloadBankUploadPreviewExcel(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  let missing=b.items.filter(hasIncompleteBankDetails);
  if(missing.length){alert(`${missing.length} employee(s) have incomplete bank details. Fix these in Employee Management before previewing.`);return}
  let rows=buildBankUploadRows(b);
  // Excel-only trick: a leading apostrophe on a CSV field tells Excel "treat this as text, not a
  // number" the moment the file is opened by double-click — it is NOT displayed in the cell, it just
  // stops Excel from reinterpreting "0012345678" as the number 12345678 and dropping the zeros.
  // This affects BOTH the bank code column (e.g. "000016") and the account number column, since
  // Excel would strip leading zeros from either one, and ONLY in this preview file. The apostrophe
  // must never appear in the actual bank-upload file — a bank's own parser would not understand it
  // as a formatting hint and could see it as a literal character in the code/account number,
  // breaking a real payment. Do not upload this file anywhere; it exists purely so you can review
  // it safely in Excel.
  let excelRows=rows.map((r,i)=>{
    if(i<1)return r; // header row is left exactly as-is
    return [`'${r[0]}`,`'${r[1]}`,r[2],r[3],r[4]];
  });
  let csv=excelRows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  let a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=`marlum-bank-upload-PREVIEW-EXCEL-${b.id}.csv`;
  a.click();
  log('Bank upload preview (Excel-safe) downloaded',`${b.id} — ${b.items.length} beneficiaries`);
}
function downloadBankUploadFile(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  let missing=b.items.filter(hasIncompleteBankDetails);
  if(missing.length){alert(`${missing.length} employee(s) have incomplete bank details. Fix these in Employee Management before downloading the upload file.`);return}
  let rows=buildBankUploadRows(b);
  let csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
  let a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download=`marlum-bank-upload-${b.id}.csv`;
  a.click();
  log('Bank upload file downloaded',`${b.id} — ${b.items.length} beneficiaries`);save();
}
function markPaymentSubmitted(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  if(!userHasRoleFor('Payment Processing')){alert('Only an authorized payment processor can submit the batch.');return}
  b.status='Submitted to Bank';b.submittedAt=new Date().toISOString();b.bankFileStatus='Submitted';
  log('Bank payment batch submitted',`${b.id} — ${b.period}`);save();render();openPaymentBatch(id);
}
function markPaymentPaid(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  if(!userHasRoleFor('Payment Processing')){alert('Only an authorized payment processor can update payment status.');return}
  b.status='Paid';b.paymentDate=todayISO();b.paidAt=new Date().toISOString();
  b.items.forEach(x=>x.status='Paid');
  log('Payroll payment batch marked paid',`${b.id} — ${b.period}`);save();render();openPaymentBatch(id);
}
function openPaymentBatches(){
  openModal(`<h3>Payment Batches</h3><table><tr><th>Batch</th><th>Period</th><th>Total</th><th>Status</th><th>Created By</th><th>Action</th></tr>
  ${paymentBatches().slice().reverse().map(b=>`<tr><td>${esc(b.id)}</td><td>${esc(b.period)}</td><td>${money(b.totalNet)}</td><td>${esc(b.status)}</td><td>${esc(b.createdBy)}</td><td><button class="btn secondary" onclick="openPaymentBatch('${esc(b.id)}')">View</button></td></tr>`).join('')||'<tr><td colspan="6">No payment batches.</td></tr>'}</table><button class="btn secondary" onclick="closeModal()">Close</button>`);
}
function openPaymentBatch(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  closeModal();
  const c=payrollCycles().find(x=>x.id===b.cycleId);
  if(c&&typeof window.showCycleWorkspace==='function'){window.showCycleWorkspace(c.id);return}
  // Fallback if the workspace module has not loaded, or this batch is not tied to a cycle — the original pop-up still works.
  let next='';
  if(b.status==='Awaiting Review') next=`<button class="btn primary" onclick="reviewPaymentBatch('${esc(id)}')">Review Payroll</button>`;
  else if(b.status==='Awaiting MD Approval') next=`<button class="btn primary" onclick="approvePaymentBatch('${esc(id)}')">Approve Payroll</button>`;
  else if(b.status==='Approved') next=`<button class="btn primary" onclick="generateBankPaymentFile('${esc(id)}')">Generate Bank Payment</button>`;
  else if(b.status==='Processing') next=`<button class="btn primary" onclick="openPaymentFile('${esc(id)}')">View Payment File</button>`;
  else if(b.status==='Submitted to Bank') next=`<button class="btn primary" onclick="markPaymentPaid('${esc(id)}')">Mark Paid</button>`;
  else if(b.status==='Paid') next=`<button class="btn primary" onclick="openReconciliation()">Go to Bank Reconciliation</button>`;
  openModal(`<h3>${esc(b.id)} — ${esc(b.period)}</h3>
  <p><strong>Status:</strong> ${esc(b.status)} | <strong>Employees:</strong> ${b.employeeCount} | <strong>Total:</strong> ${money(b.totalNet)}</p>
  <table><tr><th>Employee</th><th>Bank</th><th>Account</th><th>Net Pay</th><th>Status</th></tr>
  ${b.items.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.bankName)}</td><td>${esc(x.accountNumber)}</td><td>${money(x.netPay)}</td><td>${esc(x.status)}</td></tr>`).join('')}</table>
  <p class="label">Prepared by: ${esc(b.createdBy)} · Reviewed by: ${esc(b.reviewedBy||'—')} · Approved by: ${esc(b.approvedBy||'—')} · Processed by: ${esc(b.processedBy||'—')}</p>
  <div class="toolbar">${next}<button class="btn secondary" onclick="closeModal()">Close</button></div>`);
}
function openApprovalQueue(){
  let list=paymentBatches().filter(b=>['Awaiting Review','Awaiting MD Approval','Approved','Submitted to Bank'].includes(b.status));
  openModal(`<h3>Payroll & Payment Approval Queue</h3><table><tr><th>Batch</th><th>Period</th><th>Status</th><th>Amount</th><th>Action</th></tr>
  ${list.map(b=>`<tr><td>${esc(b.id)}</td><td>${esc(b.period)}</td><td>${esc(b.status)}</td><td>${money(b.totalNet)}</td><td><button class="btn secondary" onclick="openPaymentBatch('${esc(b.id)}')">Open</button></td></tr>`).join('')||'<tr><td colspan="5">No pending batches.</td></tr>'}</table><button class="btn secondary" onclick="closeModal()">Close</button>`);
}

function payrollCycles(){db.payrollCycles=db.payrollCycles||[];return db.payrollCycles}
function cycleTypeLabel(t){return t==='weekly_casual'?'Weekly Casual':'Monthly Fixed'}
function isCasualEmployee(e){return String(e.employmentType||e.staffType||e.salaryType||'').toLowerCase().includes('casual') || e.payFrequency==='Weekly'}
function employeePayFrequency(e){return isCasualEmployee(e)?'Weekly':'Monthly'}
// A fixed-salary person who is also paid weekly from the company wages workbook (one ID, both pay
// types) carries alsoWeekly:true. They stay in the monthly run as fixed staff and are also eligible
// for the weekly casual run and the Weekly Timesheet.
function isWeeklyEligible(e){return isCasualEmployee(e)||e.alsoWeekly===true}
// What one weekly-timesheet entry pays: Plus1 is a full day at the daily rate, hours are paid at the
// straight hourly rate (daily / standard hours - the wages workbook pays no overtime premium) and
// amount is a flat naira figure taken from the workbook.
function weeklyExtraPay(x,daily,hourly){
  const plus1=x.plus1===true||x.type==='plus1';
  const hours=(x.type==='hours'||x.type==='combo')?Number(x.hours||0):0;
  return {plus1,hours,amount:Number(x.amount||0),pay:(plus1?Number(daily||0):0)+hours*Number(hourly||0)+Number(x.amount||0)};
}
function weeklyExtraLabel(x){
  const bits=[];
  if(x.plus1===true||x.type==='plus1')bits.push('Plus1');
  if((x.type==='hours'||x.type==='combo')&&Number(x.hours||0))bits.push(String(Number(x.hours)));
  if(Number(x.amount||0))bits.push('N'+Number(x.amount));
  return bits.join('+');
}
function weeklyBookingFor(empId,start,end){return (db.weeklyBookings||[]).find(b=>b.employeeId===empId&&b.weekStart>=start&&b.weekStart<=end)}
function openNewPayrollCycle(){
  if(!userHasRoleFor('Payroll Preparation')){alert(CYCLE_VIEW_ONLY_MSG);return}
  closeModal();
  if(typeof window.showCycleWorkspace==='function'){window.showCycleWorkspace(null);return}
  // Fallback if the workspace module has not loaded for some reason — the original pop-up still works.
  let active=db.employees.filter(e=>e.status==='Active');
  openModal(`<h3>Create Payroll Cycle</h3>
  <div class="grid">
    <label>Payroll Type<select id="cycleType"><option value="weekly_casual">Weekly — Casual Staff</option><option value="monthly_fixed">Monthly — Fixed Salaries</option></select></label>
    <label>Period Start<input id="cycleStart" type="date" value="${todayISO()}"></label>
    <label>Period End<input id="cycleEnd" type="date" value="${todayISO()}"></label>
    <label>Payment Date<input id="cyclePayDate" type="date" value="${todayISO()}"></label>
  </div>
  <p class="label">Weekly Casual payroll uses each casual employee's daily rate multiplied by payable days. Monthly Fixed payroll uses the approved monthly Basic + Housing + Transport + Other salary structure.</p>
  <div class="toolbar"><button class="btn primary" onclick="createPayrollCycle()">Create Cycle</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
}
function createPayrollCycle(){
  if(!userHasRoleFor('Payroll Preparation')){alert(CYCLE_VIEW_ONLY_MSG);return}
  let type=document.getElementById('cycleType').value,start=document.getElementById('cycleStart').value,end=document.getElementById('cycleEnd').value,payDate=document.getElementById('cyclePayDate').value;
  if(!start||!end||end<start||!payDate){alert('Please enter a valid payroll period and payment date.');return}
  if(type==='weekly_casual'){
    let d=Math.floor((new Date(end)-new Date(start))/86400000)+1;
    if(d<1||d>7){alert('A weekly casual payroll period must contain 1–7 days.');return}
  }
  if(payrollCycles().some(c=>c.type===type&&c.start===start&&c.end===end)){alert('This payroll cycle already exists.');return}
  let employees=db.employees.filter(e=>e.status==='Active'&&(type==='weekly_casual'?isWeeklyEligible(e):!isCasualEmployee(e)));
  if(type==='weekly_casual'){
    // Only include casual staff who actually have an attendance record (Present or Half Day) for
    // this specific period — this is a weekly cycle built from whatever timesheet was uploaded for
    // that week, not a roster of every casual employee the company has ever had regardless of
    // whether they worked. Someone with zero attendance for the period has no place in this run;
    // including them at ₦0 just makes the register harder to read and easier to mistake for the
    // timesheet not having been applied.
    employees=employees.filter(e=>(db.attendanceRecords||[]).some(a=>a.employeeId===e.id&&a.date>=start&&a.date<=end&&(a.status==='Present'||a.status==='Half Day'))||(db.weeklyExtras||[]).some(x=>x.employeeId===e.id&&x.weekStart>=start&&x.weekStart<=end));
  }
  if(!employees.length){alert(`No ${type==='weekly_casual'?'casual':'fixed-salary'} active employees found for this cycle${type==='weekly_casual'?' with attendance recorded for this period':''}.`);return}
  let cycleId='PC-'+Date.now();
  let cycle={id:cycleId,type,start,end,paymentDate:payDate,status:'Draft',createdBy:activeSystemUser().username,createdAt:new Date().toISOString(),employees:employees.map(e=>calculateCycleEmployee(e,type,start,end,cycleId))};
  cycle.employeeCount=cycle.employees.length;cycle.totalGross=cycle.employees.reduce((n,x)=>n+x.gross,0);cycle.totalNet=cycle.employees.reduce((n,x)=>n+x.netPay,0);
  payrollCycles().push(cycle);log('Payroll cycle created',`${cycle.id} — ${cycleTypeLabel(type)} — ${start} to ${end}`);save();closeModal();render();
  if(typeof window.showCycleWorkspace==='function')window.showCycleWorkspace(cycleId,'prepare');
}
// A bank field can be technically non-empty while still being useless for an actual transfer —
// "(not stated)", "N/A", "TBD" and similar placeholder text have shown up in imported employee
// data. A simple emptiness check misses these, so this treats recognizable placeholder text the
// same as a blank field wherever bank-detail completeness is checked before a payment.
function isBlankOrPlaceholder(v){
  const s=String(v||'').trim();
  if(!s)return true;
  return /^(\(?not stated\)?|n\/?a|tbd|unknown|pending|none|-{1,2})$/i.test(s);
}
function hasIncompleteBankDetails(x){
  return isBlankOrPlaceholder(x.accountNumber)||isBlankOrPlaceholder(x.bankName)||isBlankOrPlaceholder(x.accountName)||!resolveBankCode(x.bankName);
}
function cycleOvertimePay(empId,start,end,hourlyRate,dailyRate,weekly){
  // Overtime is drawn from Time Sheet clock-in/out records. Explicitly rejected time sheets are
  // excluded; anything not yet reviewed is still included (Time Sheet approval is currently only
  // generated for the current day, so requiring approval for a whole pay period would silently
  // exclude nearly all overtime — this at least stops the previous bug where even rejected overtime
  // was still being paid).
  const hours=(db.timeTrackerRecords||[]).filter(r=>r.emp===empId&&r.date>=start&&r.date<=end&&r.approvalStatus!=='Rejected').reduce((s,r)=>s+Number(r.overtimeHours||0),0);
  const otMult=Number(db.timeTrackerSettings?.overtimeMultiplier||1.5);
  let pay=hours*Number(hourlyRate||0)*otMult;
  // Weekly Timesheet "Extra Hr/day" column (weekly casual runs only, so a person who is also paid
  // weekly is never paid the same extras again in the monthly run): "Plus1" is a full extra day at
  // the straight daily rate, a number is extra hours at the straight hourly rate, and N<amount> is a
  // flat naira figure from the wages workbook. They can be combined, e.g. Plus1+3+N500.
  let extraHours=0,extraPay=0,extraNotes=[];
  if(weekly)(db.weeklyExtras||[]).filter(x=>x.employeeId===empId&&x.weekStart>=start&&x.weekStart<=end).forEach(x=>{
    const w=weeklyExtraPay(x,dailyRate,hourlyRate);
    extraHours+=w.hours;extraPay+=w.pay;
    if(w.plus1)extraNotes.push('+1 day');
    if(w.hours)extraNotes.push(`+${w.hours}h`);
    if(w.amount)extraNotes.push(`+₦${w.amount}`);
  });
  return {hours:hours+extraHours,pay:pay+extraPay,extraPay,extraNote:extraNotes.join(', ')};
}
function calculateCycleEmployee(e,type,start,end,cycleId){
  const std=Number(db.timeTrackerSettings?.standardHours||8);
  const adj=cycleId?(db.cycleAdjustments||[]).filter(a=>a.cycleId===cycleId&&a.emp===e.id&&a.status!=='Cancelled'):[];
  const bonus=adj.filter(a=>a.type==='Bonus').reduce((s,a)=>s+Number(a.amount||0),0);
  const otherDeduction=adj.filter(a=>a.type==='Deduction').reduce((s,a)=>s+Number(a.amount||0),0);
  const loan=(db.loans||[]).find(l=>l.emp===e.id&&l.status==='Active');
  // A fixed-salary person's loan instalment is a monthly figure, so it is only taken in the monthly run,
  // not in the weekly run they are also paid in.
  const loanIsMonthly=type==='weekly_casual'&&e.alsoWeekly===true&&!isCasualEmployee(e);
  const scheduledLoanRepayment=(loan&&!loanIsMonthly)?Math.min(Number(loan.monthlyDeduction||0),Number(loan.outstanding||0)):0;
  if(type==='weekly_casual'){
    let days=Math.floor((new Date(end)-new Date(start))/86400000)+1;
    // The rate and site the wages workbook gave for this specific week win over the employee's
    // current record, so each payroll run follows its own week's workbook.
    const booking=weeklyBookingFor(e.id,start,end);
    let daily=Number(booking&&Number(booking.rate)>0?booking.rate:(e.dailyRate||e.ratePerDay||e.basicDaily||e.basic||0));
    let payableDays=approvedPayableDays(e.id,start,end);
    let base=daily*payableDays;
    const hourly=std?daily/std:0;
    const ot=cycleOvertimePay(e.id,start,end,hourly,daily,true);
    const gross=base+ot.pay+bonus;
    // A loan repayment can never take more than the person actually earned this period. Capping
    // only the resulting NET pay at zero (further down) isn't enough on its own — without this,
    // the loan's outstanding balance would still drop by the full scheduled amount even when a
    // thin paycheck (few days worked, or a small period) couldn't actually cover it, effectively
    // writing off debt the employee never paid. The available amount is gross minus any other
    // deduction that also comes out of the same pay.
    const loanRepayment=Math.min(scheduledLoanRepayment,Math.max(0,gross-otherDeduction));
    const deductions=otherDeduction+loanRepayment;
    const netPay=Math.max(0,gross-deductions);
    return {id:e.id,name:e.name,workSite:(booking&&booking.site)||e.dept||'',dailyRate:daily,payableDays,overtimeHours:ot.hours,overtimePay:ot.pay,bonus,deduction:otherDeduction,loanRepayment,gross,netPay,bankName:e.bankName||e.bank||'',accountName:e.accountName||e.bankAccountName||e.name||'',accountNumber:e.accountNumber||e.bankAccountNumber||'',status:'Pending'};
  }
  let s=salaryForEmployeeAt(e.id,end),base=salaryGross(s);
  const monthlyWorkingDays=Number(db.payrollSettings?.monthlyWorkingDays||26);
  const hourly=(std&&monthlyWorkingDays)?(base/monthlyWorkingDays)/std:0;
  const ot=cycleOvertimePay(e.id,start,end,hourly,0,false);
  const gross=base+ot.pay+bonus;
  const loanRepayment=Math.min(scheduledLoanRepayment,Math.max(0,gross-otherDeduction));
  const deductions=otherDeduction+loanRepayment;
  const netPay=Math.max(0,gross-deductions);
  return {id:e.id,name:e.name,basic:s.basic,housing:s.housing,transport:s.transport,other:s.other,overtimeHours:ot.hours,overtimePay:ot.pay,bonus,deduction:otherDeduction,loanRepayment,gross,netPay,bankName:e.bankName||e.bank||'',accountName:e.accountName||e.bankAccountName||e.name||'',accountNumber:e.accountNumber||e.bankAccountNumber||'',status:'Pending'};
}
function recalculateCycleEmployeeLine(cycle,empId){
  let e=db.employees.find(x=>x.id===empId);if(!e)return;
  let idx=cycle.employees.findIndex(x=>x.id===empId);if(idx===-1)return;
  cycle.employees[idx]=calculateCycleEmployee(e,cycle.type,cycle.start,cycle.end,cycle.id);
  cycle.totalGross=cycle.employees.reduce((n,x)=>n+x.gross,0);
  cycle.totalNet=cycle.employees.reduce((n,x)=>n+x.netPay,0);
}
function openCycleAdjustments(cycleId){
  let c=payrollCycles().find(x=>x.id===cycleId);if(!c)return;
  if(c.status!=='Draft'){alert('Adjustments can only be added while the cycle is still in Draft status, before it is submitted for review.');return}
  if(!userHasRoleFor('Payroll Preparation')){alert('Only an authorized payroll preparer can add adjustments.');return}
  db.cycleAdjustments=db.cycleAdjustments||[];
  let existing=db.cycleAdjustments.filter(a=>a.cycleId===cycleId&&a.status!=='Cancelled');
  openModal(`<h3>Cycle Adjustments — ${esc(c.id)}</h3>
  <div class="grid">
  <label>Employee<select id="cycAdjEmp">${c.employees.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></label>
  <label>Type<select id="cycAdjType"><option>Bonus</option><option>Deduction</option></select></label>
  <label>Amount<input id="cycAdjAmount" type="number" min="0" step="0.01"></label>
  <label>Description<input id="cycAdjDesc" placeholder="e.g. Performance bonus, uniform cost"></label>
  </div>
  <div class="toolbar"><button class="btn primary" onclick="addCycleAdjustment('${esc(cycleId)}')">Add Adjustment</button><button class="btn secondary" onclick="openPayrollCycle('${esc(cycleId)}')">Back to Cycle</button></div>
  <p class="label">Loan repayments and overtime are calculated automatically and do not need to be added here — this is only for one-off bonuses or deductions specific to this pay period.</p>
  <table><tr><th>Employee</th><th>Type</th><th>Amount</th><th>Description</th><th>Action</th></tr>
  ${existing.map(a=>`<tr><td>${esc(a.name)}</td><td>${esc(a.type)}</td><td>${money(a.amount)}</td><td>${esc(a.description||'')}</td><td><button class="btn danger" onclick="cancelCycleAdjustment('${esc(a.id)}','${esc(cycleId)}')">Remove</button></td></tr>`).join('')||'<tr><td colspan="5">No adjustments yet.</td></tr>'}</table>`);
}
function addCycleAdjustment(cycleId){
  let c=payrollCycles().find(x=>x.id===cycleId);if(!c)return;
  let empId=document.getElementById('cycAdjEmp').value,type=document.getElementById('cycAdjType').value,amount=Number(document.getElementById('cycAdjAmount').value||0),description=document.getElementById('cycAdjDesc').value;
  if(!amount||amount<0){alert('Enter a valid amount.');return}
  let e=db.employees.find(x=>x.id===empId);
  db.cycleAdjustments=db.cycleAdjustments||[];
  db.cycleAdjustments.push({id:'CADJ-'+Date.now(),cycleId,emp:empId,name:e?.name||empId,type,amount,description,status:'Active',createdBy:activeSystemUser().username,createdAt:new Date().toISOString()});
  log('Payroll cycle adjustment added',`${c.id} — ${e?.name} — ${type} — ${money(amount)}`);
  recalculateCycleEmployeeLine(c,empId);
  save();if(typeof window.render==='function')window.render();openCycleAdjustments(cycleId);
}
function cancelCycleAdjustment(adjId,cycleId){
  let a=(db.cycleAdjustments||[]).find(x=>x.id===adjId);if(!a)return;
  a.status='Cancelled';
  let c=payrollCycles().find(x=>x.id===cycleId);
  if(c)recalculateCycleEmployeeLine(c,a.emp);
  log('Payroll cycle adjustment removed',`${cycleId} — ${a.name}`);save();if(typeof window.render==='function')window.render();openCycleAdjustments(cycleId);
}
function cycleRowDeleteBtn(c){
  if(c.paymentBatchId)return '<span class="label" title="This cycle already has a bank payment batch, so it cannot be deleted">Has payment batch</span>';
  if(!normalizeRoles(activeSystemUser()).includes('Super Admin'))return '';
  return `<button class="btn danger" onclick="deletePayrollCycle('${esc(c.id)}')">Delete</button>`;
}
function openPayrollCycles(){
  let cs=payrollCycles().slice().reverse();
  openModal(`<h3>Payroll Cycle Register</h3><table><tr><th>Cycle</th><th>Type</th><th>Period</th><th>Employees</th><th>Gross</th><th>Net</th><th>Status</th><th>Action</th></tr>
  ${cs.map(c=>`<tr><td>${esc(c.id)}</td><td>${esc(cycleTypeLabel(c.type))}</td><td>${esc(c.start)} to ${esc(c.end)}</td><td>${c.employeeCount}</td><td>${money(c.totalGross)}</td><td>${money(c.totalNet)}</td><td>${esc(c.status)}</td><td><button class="btn secondary" onclick="openPayrollCycle('${esc(c.id)}')">Open</button> ${cycleRowDeleteBtn(c)}</td></tr>`).join('')||'<tr><td colspan="8">No payroll cycles.</td></tr>'}</table><button class="btn secondary" onclick="closeModal()">Close</button>`);
}
function openPayrollCycle(id){
  let c=payrollCycles().find(x=>x.id===id);if(!c)return;
  closeModal();
  if(typeof window.showCycleWorkspace==='function'){window.showCycleWorkspace(id);return}
  // Fallback if the workspace module has not loaded for some reason — the original pop-up still works.
  let action='';
  if(c.status==='Draft'&&userHasRoleFor('Payroll Preparation')) action=`<button class="btn secondary" onclick="openCycleAdjustments('${esc(id)}')">Cycle Adjustments</button> <button class="btn primary" onclick="submitPayrollCycle('${esc(id)}')">Submit for Review</button>`;
  else if(c.status==='Awaiting Review'&&userHasRoleFor('Payroll Review')) action=`<button class="btn primary" onclick="reviewPayrollCycle('${esc(id)}')">Review & Forward</button>`;
  else if(c.status==='Awaiting MD Approval'&&userHasRoleFor('Payroll Approval')) action=`<button class="btn primary" onclick="approvePayrollCycle('${esc(id)}')">Approve Payroll</button>`;
  else if(c.status==='Approved'&&userHasRoleFor('Payment Processing')) action=`<button class="btn primary" onclick="lockPayrollCycle('${esc(id)}')">Lock Payroll</button>`;
  else if(c.status==='Locked'&&userHasRoleFor('Payment Processing')) action=`<button class="btn primary" onclick="createCyclePaymentBatch('${esc(id)}')">Create Bank Payment Batch</button>`;
  else if(c.status==='Payment Batch Created'&&c.paymentBatchId) action=`<button class="btn primary" onclick="openPaymentBatch('${esc(c.paymentBatchId)}')">View Payment Batch</button>`;
  let deleteBtn=(!c.paymentBatchId&&normalizeRoles(activeSystemUser()).includes('Super Admin'))?`<button class="btn danger" onclick="deletePayrollCycle('${esc(id)}')">Delete Cycle</button>`:'';
  openModal(`<h3>${esc(cycleTypeLabel(c.type))} — ${esc(c.id)}</h3>
  <p><strong>Period:</strong> ${esc(c.start)} to ${esc(c.end)} | <strong>Payment:</strong> ${esc(c.paymentDate)} | <strong>Status:</strong> ${esc(c.status)}</p>
  <table><tr><th>Employee</th><th>Rate / Salary</th><th>Payable Days</th><th>OT Hrs</th><th>OT Pay</th><th>Bonus</th><th>Deductions</th><th>Gross</th><th>Net</th><th>Bank</th><th>Account</th></tr>
  ${c.employees.map(x=>`<tr><td>${esc(x.name)}</td><td>${c.type==='weekly_casual'?money(x.dailyRate):money((x.basic||0)+(x.housing||0)+(x.transport||0)+(x.other||0))}</td><td>${c.type==='weekly_casual'?x.payableDays:'—'}</td><td>${Number(x.overtimeHours||0)}</td><td>${money(x.overtimePay||0)}</td><td>${money(x.bonus||0)}</td><td>${money((x.deduction||0)+(x.loanRepayment||0))}</td><td>${money(x.gross)}</td><td>${money(x.netPay)}</td><td>${esc(x.bankName)}</td><td>${esc(x.accountNumber)}</td></tr>`).join('')}</table>
  <p class="label">Prepared by: ${esc(c.createdBy)} · Reviewed by: ${esc(c.reviewedBy||'—')} · Approved by: ${esc(c.approvedBy||'—')} · Locked by: ${esc(c.lockedBy||'—')}</p>
  <p class="label">A cycle is a snapshot taken when it was created — editing employee records afterward does not change it. If this cycle has a data problem (like an employee's missing bank details), fix the employee record first, then delete this cycle and create a fresh one.</p>
  <div class="toolbar">${action}${deleteBtn}<button class="btn secondary" onclick="closeModal()">Close</button></div>`);
}
function deletePayrollCycle(id){
  let c=payrollCycles().find(x=>x.id===id);if(!c)return;
  if(!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Only Super Admin can delete a payroll cycle.');return}
  if(c.paymentBatchId){alert('This cycle already has a bank payment batch and cannot be deleted. Contact support if this needs to be reversed.');return}
  if(!confirm(`Delete ONLY this payroll cycle?\n\n${c.id} (${cycleTypeLabel(c.type)}, ${c.start||'?'} to ${c.end||'?'}) — status ${c.status}, ${c.employeeCount||(c.employees||[]).length} employees\n\nAll other payroll cycles are kept. This cannot be undone. Any cycle adjustments tied to it will also be removed.${['Locked','Payment Batch Created'].includes(c.status)?'\n\nNote: loan balances already reduced by this cycle are NOT restored.':''}`))return;
  db.payrollCycles=payrollCycles().filter(x=>x.id!==id);
  db.cycleAdjustments=(db.cycleAdjustments||[]).filter(a=>a.cycleId!==id);
  log('Payroll cycle deleted',c.id);save();closeModal();render();
}
function clearAllPayrollCycles(){
  if(!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Only Super Admin can clear all payroll cycles.');return}
  const cycleCount=payrollCycles().length,batchCount=(db.paymentBatches||[]).length;
  if(!cycleCount&&!batchCount){alert('There is nothing to clear — no payroll cycles or payment batches exist yet.');return}
  const typed=prompt(`This will permanently delete ALL ${cycleCount} payroll cycle(s) and ${batchCount} payment batch(es) — including ones already marked Locked or Paid. This is meant for clearing out test data before going live, and cannot be undone.\n\nType DELETE to confirm:`);
  if(typed!=='DELETE'){alert('Cancelled — nothing was deleted.');return}
  db.payrollCycles=[];db.paymentBatches=[];db.cycleAdjustments=[];
  log('All payroll cycles cleared',`${cycleCount} cycle(s), ${batchCount} batch(es) removed`);
  save();closeModal();render();
  alert('All payroll cycles and payment batches have been cleared.');
}
function submitPayrollCycle(id){
  let c=payrollCycles().find(x=>x.id===id);if(!c)return;
  if(!userHasRoleFor('Payroll Preparation')){alert('Only an authorized payroll preparer (Accountant) can submit this cycle for review.');return}
  refreshWeeklyCycleFromAttendance(c);
  if(c.type==='weekly_casual' && c.employees.some(x=>Number(x.payableDays||0)<=0&&Number(x.overtimePay||0)<=0)){alert('At least one casual employee has zero approved payable days. Review attendance before submitting payroll.');return}
  c.status='Awaiting Review';c.submittedAt=new Date().toISOString();save();log('Payroll cycle submitted for review',c.id);render();
}
function reviewPayrollCycle(id){
  let c=payrollCycles().find(x=>x.id===id);if(!c)return;
  if(!userHasRoleFor('Payroll Review')){alert('Only an authorized reviewer (Financial Controller) can review this payroll cycle.');return}
  if(c.createdBy===activeSystemUser().username&&!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Segregation of duties: the preparer cannot independently review their own payroll.');return}
  c.status='Awaiting MD Approval';c.reviewedBy=activeSystemUser().username;c.reviewedAt=new Date().toISOString();save();log('Payroll cycle reviewed',c.id);render();
}
function approvePayrollCycle(id){
  let c=payrollCycles().find(x=>x.id===id);if(!c)return;
  if(!userHasRoleFor('Payroll Approval')){alert('Only the MD / authorized Approver can approve this payroll cycle.');return}
  if(c.createdBy===activeSystemUser().username&&!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Segregation of duties: the preparer cannot approve their own payroll.');return}
  c.status='Approved';c.approvedBy=activeSystemUser().username;c.approvedAt=new Date().toISOString();save();log('Payroll cycle approved',c.id);render();
}
function lockPayrollCycle(id){
  let c=payrollCycles().find(x=>x.id===id);if(!c)return;
  if(!userHasRoleFor('Payment Processing')){alert('Only the Financial Controller / authorized payment processor can lock this payroll cycle.');return}
  if(c.status!=='Approved'){alert('Only an approved payroll cycle can be locked.');return}
  c.status='Locked';c.lockedBy=activeSystemUser().username;c.lockedAt=new Date().toISOString();
  db.loanRepayments=db.loanRepayments||[];
  (c.employees||[]).forEach(x=>{
    if(!x.loanRepayment)return;
    const l=(db.loans||[]).find(z=>z.emp===x.id&&z.status==='Active');
    if(l){
      const balanceBefore=Number(l.outstanding||0);
      const amountDeducted=Math.min(balanceBefore,Number(x.loanRepayment||0));
      l.outstanding=Math.max(0,balanceBefore-amountDeducted);
      if(l.outstanding<=0){l.outstanding=0;l.status='Paid Off';l.paidOffAt=new Date().toISOString();}
      // The real deduction ledger — one entry per loan per locked cycle. This is what the Loan
      // Schedule report reads from: an actual record of what was deducted and when, not a projection.
      db.loanRepayments.push({id:'LREP-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),loanId:l.id,emp:x.id,name:l.name,cycleId:c.id,period:c.start.slice(0,7),cycleStart:c.start,cycleEnd:c.end,amountDeducted,balanceBefore,balanceAfter:l.outstanding,deductedAt:new Date().toISOString()});
    }
  });
  log('Payroll cycle locked',c.id);save();render();
}
function createCyclePaymentBatch(id){
  let c=payrollCycles().find(x=>x.id===id);if(!c)return;
  if(!userHasRoleFor('Payment Processing')){alert('Only an authorized payment processor can create the bank batch.');return}
  if(c.status!=='Locked'){alert('Only a locked payroll cycle can create a payment batch.');return}
  if(c.paymentBatchId){alert('A payment batch already exists for this payroll cycle.');return}
  let missing=c.employees.filter(hasIncompleteBankDetails);
  if(missing.length){alert(`${missing.length} employee(s) have incomplete bank details. Update employee bank records before payment.`);return}
  let b={id:'PB-'+Date.now(),cycleId:c.id,period:`${c.start} to ${c.end}`,type:c.type,employeeCount:c.employeeCount,totalNet:c.totalNet,status:'Approved',createdBy:c.createdBy,reviewedBy:c.reviewedBy,approvedBy:c.approvedBy,processedBy:'',createdAt:new Date().toISOString(),items:c.employees.map(x=>({...x,status:'Pending'})),bankFileStatus:'Not Generated'};
  paymentBatches().push(b);c.paymentBatchId=b.id;c.status='Payment Batch Created';save();log('Bank payment batch created from payroll cycle',`${c.id} → ${b.id}`);
  // Continue the guided flow instead of leaving the FC at a dead end: go straight to the batch
  // detail view, which already shows the correct next action ("Generate Bank Payment") for its
  // current status.
  render();openPaymentBatch(b.id);
}
function openReconciliation(){
  let bs=paymentBatches().filter(b=>['Submitted to Bank','Paid'].includes(b.status));
  openModal(`<h3>Bank Reconciliation</h3><table><tr><th>Batch</th><th>Payroll Type</th><th>Period</th><th>Amount</th><th>Status</th><th>Reference</th><th>Action</th></tr>
  ${bs.map(b=>`<tr><td>${esc(b.id)}</td><td>${esc(cycleTypeLabel(b.type||'monthly_fixed'))}</td><td>${esc(b.period)}</td><td>${money(b.totalNet)}</td><td>${esc(b.status)}</td><td>${esc(b.bankReference||'—')}</td><td><button class="btn secondary" onclick="reconcilePayment('${esc(b.id)}')">Reconcile</button></td></tr>`).join('')||'<tr><td colspan="7">No bank payments awaiting reconciliation.</td></tr>'}</table><button class="btn secondary" onclick="closeModal()">Close</button>`);
}
function reconcilePayment(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  if(!(userHasRoleFor('Payroll Preparation')||userHasRoleFor('Payment Processing'))){alert(RECON_VIEW_ONLY_MSG);return}
  openModal(`<h3>Reconcile ${esc(b.id)}</h3><div class="grid">
  <label>Bank Reference<input id="reconRef" value="${esc(b.bankReference||'')}"></label>
  <label>Bank Amount<input id="reconAmount" type="number" value="${b.bankAmount||b.totalNet}"></label>
  <label>Bank Date<input id="reconDate" type="date" value="${b.reconciledDate||todayISO()}"></label>
  <label>Bank Status<select id="reconStatus"><option ${b.bankStatus==='Matched'?'selected':''}>Matched</option><option ${b.bankStatus==='Partially Matched'?'selected':''}>Partially Matched</option><option ${b.bankStatus==='Exception'?'selected':''}>Exception</option></select></label></div>
  <div class="toolbar"><button class="btn primary" onclick="saveReconciliation('${esc(id)}')">Save Reconciliation</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>`);
}
function saveReconciliation(id){
  let b=paymentBatches().find(x=>x.id===id);if(!b)return;
  if(!(userHasRoleFor('Payroll Preparation')||userHasRoleFor('Payment Processing'))){alert(RECON_VIEW_ONLY_MSG);return}
  b.bankReference=document.getElementById('reconRef').value.trim();b.bankAmount=Number(document.getElementById('reconAmount').value||0);b.reconciledDate=document.getElementById('reconDate').value;b.bankStatus=document.getElementById('reconStatus').value;
  if(b.bankStatus==='Matched')b.status='Reconciled';
  log('Bank payment reconciled',`${b.id} — ${b.bankStatus} — ${b.bankReference}`);save();render();
}

function attendanceRecords(){db.attendanceRecords=db.attendanceRecords||[];return db.attendanceRecords}
function attendanceStatusOptions(selected){return ['Present','Absent','Half Day','Leave','Public Holiday'].map(s=>`<option ${s===selected?'selected':''}>${s}</option>`).join('')}

function attendancePayable(status){return status==='Present'?1:status==='Half Day'?0.5:0}
function monthlyPresentDays(employeeId,yearMonth){
  // yearMonth like '2026-09'. Counts approved attendance only, consistent with what actually drives payroll.
  return attendanceRecords().filter(a=>a.employeeId===employeeId&&a.date.startsWith(yearMonth)&&a.approvalStatus==='Approved').reduce((n,a)=>n+Number(a.payableDay||0),0);
}
function yearlyPresentDays(employeeId,year){
  return attendanceRecords().filter(a=>a.employeeId===employeeId&&a.date.startsWith(String(year))&&a.approvalStatus==='Approved').reduce((n,a)=>n+Number(a.payableDay||0),0);
}
function workingDaysSoFarInMonth(yearMonth){
  // Mon-Sat counted as working days (matches typical Nigerian construction-site 6-day week); used only
  // as a denominator for display, not for any payroll calculation.
  const [y,m]=yearMonth.split('-').map(Number),today=new Date();
  const isCurrentMonth=(today.getFullYear()===y&&today.getMonth()+1===m);
  const lastDay=isCurrentMonth?today.getDate():new Date(y,m,0).getDate();
  let count=0;
  for(let d=1;d<=lastDay;d++){const dow=new Date(y,m-1,d).getDay();if(dow!==0)count++;}
  return count;
}



function csvCell(v){return `"${String(v??'').replaceAll('"','""')}"`}
function downloadAttendanceTemplate(){
  // Pre-filled with EVERY active casual employee marked Present at standard hours, so the workflow
  // is "edit the exceptions" (change a date, mark someone Absent, adjust a time) rather than building
  // a sheet from scratch each week — this is a template for a specific day/period, ready to re-upload
  // after adjustment, not a one-time sample.
  let std=db.timeTrackerSettings||{},startTime='08:00',endTime='17:00';
  let rows=[['Employee ID','Employee Name','Date','Status','Time In','Time Out']];
  db.employees.filter(e=>e.status==='Active'&&isCasualEmployee(e)).forEach(e=>{
    rows.push([e.id,e.name,todayISO(),'Present',startTime,endTime]);
  });
  let csv=rows.map(r=>r.map(csvCell).join(',')).join('\n');
  let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='marlum-attendance-import-template.csv';a.click();
}
function parseSimpleCSV(text){
  let lines=text.split(/\r\n|\n/).filter(l=>l.trim().length);
  return lines.map(line=>{
    let cells=[],cur='',inQ=false;
    for(let i=0;i<line.length;i++){
      let ch=line[i];
      if(inQ){
        if(ch==='"'&&line[i+1]==='"'){cur+='"';i++}
        else if(ch==='"')inQ=false;
        else cur+=ch;
      }else{
        if(ch==='"')inQ=true;
        else if(ch===','){cells.push(cur);cur=''}
        else cur+=ch;
      }
    }
    cells.push(cur);
    return cells.map(c=>c.trim());
  });
}
let attendanceImportRows=[];
let wtsUploadRows=[];
function normalizeImportDate(raw){
  // Excel silently reformats a date column the moment it opens a CSV (the same class of problem as
  // account numbers losing leading zeros) — an ISO date like 2026-09-10 can come back as 09/10/2026
  // after being edited and re-saved in Excel. Without normalizing this, the record gets stored under
  // a date string that never matches the app's internal ISO dates, so it silently never shows up
  // anywhere the date is looked up by — not a data loss, just an invisible one.
  if(!raw)return{iso:'',ok:false};
  raw=String(raw).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return{iso:raw,ok:true};
  let m=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m){
    let a=Number(m[1]),b=Number(m[2]),yyyy=Number(m[3]);
    // Excel's default reformat on this build's locale is MM/DD/YYYY — prefer that reading when valid.
    if(a>=1&&a<=12&&b>=1&&b<=31)return{iso:`${yyyy}-${String(a).padStart(2,'0')}-${String(b).padStart(2,'0')}`,ok:true};
    if(b>=1&&b<=12&&a>=1&&a<=31)return{iso:`${yyyy}-${String(b).padStart(2,'0')}-${String(a).padStart(2,'0')}`,ok:true};
  }
  let d=new Date(raw);
  if(!isNaN(d.getTime()))return{iso:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,ok:true};
  return{iso:raw,ok:false};
}
function openBulkAttendanceImport(){
  attendanceImportRows=[];
  openModal(`<h3>Bulk Import Attendance</h3>
  <p class="label">Use this to enter a whole week's timesheet at once instead of one employee at a time — the same format works whether the source is a site storekeeper's collated sheet today, or a biometric device's exported log later.</p>
  <div class="toolbar"><button class="btn secondary" onclick="downloadAttendanceTemplate()">Download CSV Template</button></div>
  <label>CSV File<input id="attImportFile" type="file" accept=".csv" onchange="handleAttendanceFileSelect(this)"></label>
  <label style="display:flex;align-items:center;gap:8px;margin-top:12px"><input id="attImportAutoApprove" type="checkbox" checked style="width:auto"> Auto-approve these records for payroll (uncheck to review them individually first)</label>
  <div id="attImportPreview" style="margin-top:12px"></div>
  <div class="toolbar"><button class="btn primary" id="attImportCommitBtn" onclick="commitAttendanceImport()" disabled>Import Records</button><button class="btn secondary" onclick="closeModal()">Cancel</button></div>
  <p class="label">Columns: Employee ID (preferred) or Employee Name, Date (YYYY-MM-DD), Status (Present/Absent/Half Day). Time In and Time Out are optional — when present, they also feed overtime calculation for payroll.</p>`);
}
function handleAttendanceFileSelect(input){
  let file=input.files&&input.files[0];if(!file)return;
  let reader=new FileReader();
  reader.onload=function(e){
    let rows=parseSimpleCSV(String(e.target.result));
    if(!rows.length){alert('The file appears to be empty.');return}
    let header=rows[0].map(h=>h.toLowerCase());
    let idIdx=header.findIndex(h=>h.includes('employee id')||h==='id');
    let nameIdx=header.findIndex(h=>h.includes('name'));
    let dateIdx=header.findIndex(h=>h.includes('date'));
    let statusIdx=header.findIndex(h=>h.includes('status'));
    let inIdx=header.findIndex(h=>h.includes('time in')||h.includes('clock in'));
    let outIdx=header.findIndex(h=>h.includes('time out')||h.includes('clock out'));
    if(dateIdx===-1||(idIdx===-1&&nameIdx===-1)){alert('Could not find the required columns. Make sure the file has at least an Employee ID or Employee Name column, and a Date column.');return}
    attendanceImportRows=rows.slice(1).filter(r=>r.some(c=>c)).map(r=>{
      let idVal=idIdx>-1?r[idIdx]:'',nameVal=nameIdx>-1?r[nameIdx]:'';
      let emp=null;
      if(idVal)emp=db.employees.find(x=>x.id===idVal);
      if(!emp&&nameVal)emp=db.employees.find(x=>x.name.trim().toLowerCase()===nameVal.trim().toLowerCase());
      let rawDate=dateIdx>-1?r[dateIdx]:'',parsedDate=normalizeImportDate(rawDate);
      return {
        idVal,nameVal,rawDate,date:parsedDate.iso,dateOk:parsedDate.ok,
        status:statusIdx>-1&&r[statusIdx]?r[statusIdx]:'Present',
        timeIn:inIdx>-1?r[inIdx]:'',timeOut:outIdx>-1?r[outIdx]:'',
        matched:emp||null
      };
    });
    renderAttendanceImportPreview();
  };
  reader.readAsText(file);
}
function renderAttendanceImportPreview(){
  let matched=attendanceImportRows.filter(r=>r.matched).length,unmatched=attendanceImportRows.length-matched;
  let badDates=attendanceImportRows.filter(r=>!r.dateOk).length;
  document.getElementById('attImportPreview').innerHTML=`<p><b>${attendanceImportRows.length}</b> rows read — <b style="color:#1e6b3c">${matched} matched</b>${unmatched?`, <b style="color:#a33c34">${unmatched} not matched</b>`:''}${badDates?`, <b style="color:#a33c34">${badDates} with an unreadable date</b>`:''}.</p>
  <table><tr><th>Row</th><th>Employee</th><th>Date (as read)</th><th>Status</th><th>Time In</th><th>Time Out</th><th>Match</th></tr>
  ${attendanceImportRows.slice(0,50).map((r,i)=>`<tr><td>${i+1}</td><td>${esc(r.nameVal||r.idVal)}</td><td>${r.dateOk?esc(r.date)+(r.rawDate!==r.date?` <span class="label">(read from "${esc(r.rawDate)}")</span>`:''):`<span style="color:#a33c34">✗ "${esc(r.rawDate)}" — could not be read, this row will be skipped</span>`}</td><td>${esc(r.status)}</td><td>${esc(r.timeIn)}</td><td>${esc(r.timeOut)}</td><td>${r.matched?'✓ '+esc(r.matched.name):'✗ Not found'}</td></tr>`).join('')}
  </table>${attendanceImportRows.length>50?`<p class="label">Showing first 50 of ${attendanceImportRows.length} rows.</p>`:''}
  <p class="label">Check the Date column above carefully — if a date looks wrong, it likely means the file was opened and re-saved in Excel, which can silently reformat dates. Fix the file and re-upload rather than proceeding with an incorrect date.</p>`;
  document.getElementById('attImportCommitBtn').disabled=attendanceImportRows.filter(r=>r.matched&&r.dateOk).length===0;
}
function commitAttendanceImport(){
  let autoApprove=document.getElementById('attImportAutoApprove').checked;
  let u=activeSystemUser(),created=0,updated=0,trackerWritten=0,skippedBadDate=0;
  attendanceImportRows.filter(r=>r.matched&&r.date).forEach(r=>{
    if(!r.dateOk){skippedBadDate++;return}
    let e=r.matched,status=['Present','Absent','Half Day','Leave','Public Holiday'].includes(r.status)?r.status:'Present';
    let existing=attendanceRecords().find(a=>a.date===r.date&&a.employeeId===e.id);
    if(existing){
      existing.status=status;existing.payableDay=attendancePayable(status);existing.notes='Updated via bulk import';
      if(autoApprove){existing.approvalStatus='Approved';existing.approvedBy=u.username;existing.approvedAt=new Date().toISOString()}
      updated++;
    }else{
      attendanceRecords().push({id:'ATT-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),date:r.date,employeeId:e.id,name:e.name,status,payableDay:attendancePayable(status),notes:'Bulk import',enteredBy:u.username,createdAt:new Date().toISOString(),approvalStatus:autoApprove?'Approved':'Pending',approvedBy:autoApprove?u.username:''});
      created++;
    }
    if(r.timeIn&&r.timeOut){
      db.timeTrackerRecords=db.timeTrackerRecords||[];
      let tr=db.timeTrackerRecords.find(x=>x.emp===e.id&&x.date===r.date);
      let std=Number(db.timeTrackerSettings?.standardHours||8);
      let [inH,inM]=r.timeIn.split(':').map(Number),[outH,outM]=r.timeOut.split(':').map(Number);
      let hours=(isNaN(inH)||isNaN(outH))?0:Math.max(0,((outH*60+outM)-(inH*60+inM))/60);
      let overtimeHours=Number(Math.max(0,hours-std).toFixed(2));
      if(tr){tr.timeIn=r.timeIn;tr.timeOut=r.timeOut;tr.hours=Number(hours.toFixed(2));tr.overtimeHours=overtimeHours;tr.approvalStatus=autoApprove?'Approved':tr.approvalStatus||'';}
      else{db.timeTrackerRecords.push({id:'TT-IMPORT-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),emp:e.id,name:e.name,employmentType:e.employmentType||'Unassigned',date:r.date,timeIn:r.timeIn,timeOut:r.timeOut,hours:Number(hours.toFixed(2)),overtimeHours,source:'Bulk Import',approvalStatus:autoApprove?'Approved':''});}
      trackerWritten++;
    }
  });
  log('Bulk attendance import',`${created} created, ${updated} updated, ${trackerWritten} time records${skippedBadDate?`, ${skippedBadDate} skipped (unreadable date)`:''}${autoApprove?' (auto-approved)':''}`);
  save();closeModal();render();
  alert(`Import complete: ${created} new attendance records, ${updated} updated${trackerWritten?`, ${trackerWritten} time-in/out records for overtime`:''}${skippedBadDate?`. ${skippedBadDate} row(s) skipped because their date could not be read.`:''}.`);
}


function approvedPayableDays(employeeId,start,end){
  return attendanceRecords().filter(a=>a.employeeId===employeeId&&a.date>=start&&a.date<=end&&a.approvalStatus==='Approved').reduce((n,a)=>n+Number(a.payableDay||0),0);
}
function refreshWeeklyCycleFromAttendance(cycle){
  if(cycle.type!=='weekly_casual')return;
  // Re-run the full calculation (not a raw payableDays*rate overwrite) so any bonus, deduction,
  // loan repayment or overtime already on this cycle is preserved instead of silently wiped out.
  cycle.employees.forEach(x=>recalculateCycleEmployeeLine(cycle,x.id));
}

function render(){
let active=db.employees.filter(e=>e.status==='Active'),p=db.payroll;
let gross=p?p.items.reduce((a,x)=>a+x.gross,0):0, net=p?p.items.reduce((a,x)=>a+x.netPay,0):0;
document.getElementById('mEmployees').textContent=active.length;
document.getElementById('mGross').textContent=money(gross);
document.getElementById('mNet').textContent=money(net);
if(document.getElementById('mPaid'))document.getElementById('mPaid').textContent=db.payments.filter(x=>x.status==='Successful').length;
renderEmployees();


refreshHRDocumentStatuses();

let ar=attendanceRecords();
let casualCount=db.employees.filter(e=>e.status==='Active'&&isCasualEmployee(e)).length;
document.getElementById('attCasual').textContent=casualCount;
document.getElementById('attWeekly').textContent=new Set(ar.map(a=>a.date.slice(0,7))).size;
document.getElementById('attPending').textContent=ar.filter(a=>a.approvalStatus==='Pending').length;
document.getElementById('attApprovedDays').textContent=ar.filter(a=>a.approvalStatus==='Approved').reduce((n,a)=>n+Number(a.payableDay||0),0);


let pcs=payrollCycles();
document.getElementById('pcWeekly').textContent=pcs.filter(x=>x.type==='weekly_casual').length;
document.getElementById('pcMonthly').textContent=pcs.filter(x=>x.type==='monthly_fixed').length;
document.getElementById('pcRecon').textContent=paymentBatches().filter(x=>['Submitted to Bank','Paid'].includes(x.status)&&x.bankStatus!=='Matched').length;
document.getElementById('pcPaid').textContent=paymentBatches().filter(x=>['Paid','Reconciled'].includes(x.status)).length;
document.getElementById('pcRows').innerHTML=pcs.slice().reverse().map(c=>`<tr><td>${esc(c.id)}</td><td>${esc(cycleTypeLabel(c.type))}</td><td>${esc(c.start)} to ${esc(c.end)}</td><td>${c.employeeCount}</td><td>${money(c.totalNet)}</td><td>${esc(c.status)}</td><td><button class="btn secondary" onclick="openPayrollCycle('${esc(c.id)}')">Open</button> ${cycleRowDeleteBtn(c)}</td></tr>`).join('')||'<tr><td colspan="7">No payroll cycles created.</td></tr>';


let pbs=paymentBatches();
document.getElementById('pfDrafts').textContent=pbs.filter(x=>x.status==='Draft').length;
document.getElementById('pfReview').textContent=pbs.filter(x=>x.status==='Awaiting Review').length;
document.getElementById('pfApproval').textContent=pbs.filter(x=>x.status==='Awaiting MD Approval').length;
document.getElementById('pfReady').textContent=pbs.filter(x=>x.status==='Approved').length;
document.getElementById('pfRows').innerHTML=pbs.slice().reverse().map(b=>{
 let next=b.status==='Awaiting Review'?'Financial Controller Review':b.status==='Awaiting MD Approval'?'MD / Approver Approval':b.status==='Approved'?'Financial Controller Payment':b.status==='Submitted to Bank'?'Bank Confirmation':b.status==='Paid'?'Completed':'—';
 return `<tr><td>${esc(b.id)}</td><td>${esc(b.period)}</td><td>${b.employeeCount}</td><td>${money(b.totalNet)}</td><td>${esc(b.status)}</td><td>${esc(next)} <button class="btn secondary" onclick="openPaymentBatch('${esc(b.id)}')">Open</button></td></tr>`
}).join('')||'<tr><td colspan="6">No payroll payment batches created.</td></tr>';


document.getElementById('secAudit').textContent=(db.audit||[]).length;
renderSecurityUsers();


let eu=essUsers(),activeESS=db.employees.filter(e=>e.status==='Active');
let pendingESS=(db.leaves||[]).filter(x=>x.source==='Employee Portal'&&x.status==='Pending').length;
document.getElementById('essUsers').textContent=activeESS.filter(e=>String(e.email||'').trim()).length;
document.getElementById('essPayslips').textContent=(typeof window.currentPayrollItems==='function'?window.currentPayrollItems().length:0);
document.getElementById('essPending').textContent=pendingESS;
document.getElementById('essRows').innerHTML=activeESS.map(e=>{let u=essUserFor(e.id),linked=!!String(e.email||'').trim();return `<tr><td>${esc(e.name)}</td><td>${esc(e.id)}</td><td>${linked?'Linked ('+esc(e.email)+')':'No email on record'}</td><td>${u.lastAccess?'Previewed '+u.lastAccess.slice(0,16).replace('T',' '):'Not previewed yet'}</td><td><button class="btn secondary" onclick="showEmployeePortal('${esc(e.id)}')">View Portal</button></td></tr>`}).join('');


let sc=salaryChanges(),currentPeriod=new Date().toISOString().slice(0,7);
document.getElementById('compCurrent').textContent=db.employees.filter(e=>e.status==='Active').length;
document.getElementById('compPending').textContent=sc.filter(x=>x.status==='Pending').length;
document.getElementById('compApproved').textContent=sc.filter(x=>x.status==='Approved').length;
document.getElementById('compEffective').textContent=sc.filter(x=>x.status==='Approved'&&x.effectiveDate.slice(0,7)===currentPeriod).length;
document.getElementById('compRows').innerHTML=db.employees.filter(e=>e.status==='Active').map(e=>{
  let current=salaryForEmployeeAt(e.id,currentPeriod+'-31'),pending=sc.filter(x=>x.emp===e.id&&x.status==='Pending').sort((a,b)=>a.effectiveDate.localeCompare(b.effectiveDate))[0];
  return `<tr><td>${esc(e.name)}</td><td>${money(salaryGross(current))}</td><td>${pending?money(salaryGross(pending)):'—'}</td><td>${pending?.effectiveDate||'—'}</td><td>${pending?.status||'No pending change'}</td><td>${pending?`<button class="btn success" onclick="approveSalaryChange('${pending.id}')">Approve</button> <button class="btn danger" onclick="rejectSalaryChange('${pending.id}')">Reject</button>`:'—'}</td></tr>`;
}).join('');


let actions=hrActions();
let pendingActions=actions.filter(a=>a.status==='Pending').length;
let probationDue=actions.filter(a=>(a.type==='Probation Review'||a.type==='Probation Start')&&a.status!=='Rejected').length;
let salaryChangeCount=(db.salaryChanges||[]).length;
let exits=actions.filter(a=>['Resignation','Termination','Exit'].includes(a.type)&&a.status==='Approved').length;
document.getElementById('lifePending').textContent=pendingActions;
document.getElementById('lifeProbation').textContent=probationDue;
document.getElementById('lifeSalaryChanges').textContent=salaryChangeCount;
document.getElementById('lifeExits').textContent=exits;
document.getElementById('lifeRows').innerHTML=actions.slice().reverse().map(a=>`<tr><td>${esc(a.name)}</td><td>${esc(a.type)}</td><td>${a.effectiveDate}</td><td>${esc(a.notes||a.department||'—')}</td><td>${esc(a.status)}</td><td>${a.status==='Pending'?`<button class="btn success" onclick="approveHRAction('${a.id}')">Approve</button> <button class="btn danger" onclick="rejectHRAction('${a.id}')">Reject</button>`:'—'}</td></tr>`).join('')||'<tr><td colspan="6">No HR actions recorded.</td></tr>';

let hrActive=db.employees.filter(e=>e.status==='Active'),hrDocs=db.hrDocuments||[];
let now=new Date(),soon=new Date();soon.setDate(soon.getDate()+30);
let hrExp=hrDocs.filter(d=>d.expiry&&new Date(d.expiry+'T00:00:00')<=soon).length;
document.getElementById('hrActive').textContent=hrActive.length;
document.getElementById('hrProfiles').textContent=Object.keys(db.hrProfiles||{}).length;
document.getElementById('hrDocs').textContent=hrDocs.length;
document.getElementById('hrExpiring').textContent=hrExp;
document.getElementById('hrEmployeeRows').innerHTML=hrActive.map(e=>{
  let count=hrDocsFor(e.id).length;
  return `<tr><td>${esc(e.name)}</td><td>${esc(e.id)}</td><td>${esc(e.dept||'—')}</td><td>${esc(e.joinDate||'—')}</td><td>${count}</td><td><button class="btn secondary" onclick="editHRProfile('${esc(e.id)}')">Profile</button> <button class="btn secondary" onclick="openHRDocument('${esc(e.id)}')">Add Document</button></td></tr>`;
}).join('');

// The legacy Attendance/Leave/Payroll/Bank-Payments pages (attEmployees, leavePending,
// payrollTitle, paymentSummary, etc.) were removed from navigation and their HTML sections
// deleted along with them — this block used to render into those elements from db.payroll,
// which no longer has any way to be set by the app. Removed entirely rather than left dangling,
// matching how the equivalent block was already retired elsewhere in this file: leaving it in
// place with getElementById returning null on every one of these calls would throw on every
// single render() cycle.
// present/pay were previously computed by the legacy Attendance/Bank-Payments block removed
// above. The "Attendance today" and "Bank payment batch" lines below are cosmetic status text on
// the Reports/Dashboard page and get overwritten with accurate current-system figures by a later
// render override anyway (see the cs.innerHTML replace further down) — these are just safe,
// non-crashing fallback values for this base render pass.
let present=(db.attendanceRecords||[]).filter(x=>x.date===todayISO()&&(x.status==='Present'||x.status==='Half Day')).length;
let pay=(typeof paymentBatches==='function'?paymentBatches():db.paymentBatches||[]);
document.getElementById('rGross').textContent=money(gross);
document.getElementById('rNet').textContent=money(net);
document.getElementById('rBonus').textContent=money(p?p.items.reduce((a,x)=>a+(x.bonus||0),0):0);
document.getElementById('rDeductions').textContent=money(p?p.items.reduce((a,x)=>a+(x.deduction||0)+(x.loanRepayment||0),0):0);
if(document.getElementById('rOther'))document.getElementById('rOther').textContent='4';
if(document.getElementById('payslipRows')) renderPayslips();
document.getElementById('reportSummary').innerHTML=`<p><b>Employees:</b> ${active.length}</p><p><b>Payroll basis:</b> Monthly salary</p><p><b>Salary components:</b> Basic + Housing + Transport + Other</p><p><b>Adjustments:</b> Bonuses, one-off deductions and loan/advance repayments</p><p><b>Statutory deductions:</b> Not included in this version</p><p><b>Monthly net payroll:</b> ${money(net)}</p><p><b>Payroll reporting:</b> Payslips, CSV export, department summary and employee payroll history available.</p>`;
document.getElementById('controlStatus').innerHTML=`<p>Employee master data: <b>${active.length} employees loaded</b></p><p>Payroll basis: <b>Monthly</b></p><p>Salary structure: <b>Basic + Housing + Transport + Other</b></p><p>Payroll: <b>${p?p.status:'Not prepared'}</b></p><p>Attendance today: <b>${present}/${active.length} present</b></p><p>Bank payment batch: <b>${pay.length?(pay.every(x=>x.status==='Successful')?'Paid':'Requires attention'):'Not prepared'}</b></p><p>Audit logging: <b>Enabled</b></p>`;
document.getElementById('auditRows').innerHTML=db.audit.map(a=>`<tr><td>${esc(a.date)}</td><td>${esc(a.user)}</td><td>${esc(a.action)}</td><td>${esc(a.details)}</td></tr>`).join('')||'<tr><td colspan="4">No audit events.</td></tr>';
document.getElementById('companyName').value=db.settings.companyName;
if(document.getElementById('employeeMasterCount')){
  const inBuild=typeof DEFAULT_EMPLOYEE_SEED!=='undefined'?DEFAULT_EMPLOYEE_SEED.length:null;
  document.getElementById('employeeMasterCount').innerHTML=`Currently loaded: <b>${db.employees.length} employees</b>.${inBuild!==null?` This version of the app was built with <b>${inBuild} employees</b>.${inBuild>db.employees.length?' Some are new and not in your live database yet — the button below adds them without touching anything else.':inBuild<db.employees.length?' Your live database has more than this build (normal — employees have been added directly since this version was built). Nothing needs doing.':' These match.'}`:''}`;
}
if(document.getElementById('companyBankName')){
  db.settings.companyBank=db.settings.companyBank||{bankName:'',accountNumber:'',accountName:''};
  document.getElementById('companyBankName').value=db.settings.companyBank.bankName||'';
  document.getElementById('companyBankAccount').value=db.settings.companyBank.accountNumber||'';
  document.getElementById('companyBankAccountName').value=db.settings.companyBank.accountName||'';
}
if(document.getElementById('directPayApiUrl')){
  // SECURITY FIX: clientId and clientSecret must never live in db.settings — that object is synced
  // to Supabase and loaded into every logged-in user's browser regardless of role, the same way
  // employee salary data is. A bank API secret saved there would be readable by any employee who
  // opens their browser's developer console, directly contradicting this field's own label ("kept
  // only in this browser"). This was a real, if currently dormant, vulnerability: nothing has
  // exploited it only because no real secret has been entered yet, since the integration itself
  // isn't live. Only the non-sensitive API URL stays in the synced settings; the credentials are
  // now stored in this browser's own localStorage only, under a key never touched by save()/sync.
  db.settings.directPayment=db.settings.directPayment||{apiUrl:'',connected:false};
  delete db.settings.directPayment.clientId;delete db.settings.directPayment.clientSecret; // migrate away from any previously-synced copy
  let localCreds={};try{localCreds=JSON.parse(localStorage.getItem('marlum_direct_pay_creds')||'{}')}catch(e){}
  document.getElementById('directPayApiUrl').value=db.settings.directPayment.apiUrl||'';
  document.getElementById('directPayClientId').value=localCreds.clientId||'';
  document.getElementById('directPayClientSecret').value=localCreds.clientSecret||'';
  const badge=document.getElementById('directPaymentStatusBadge');
  if(badge){badge.textContent=db.settings.directPayment.connected?'Connected':'Not Connected';badge.style.background=db.settings.directPayment.connected?'#dff3e6':'#fdeceb';badge.style.color=db.settings.directPayment.connected?'#1e6b3c':'#a33c34';}
}
}
function saveCompanyBankAccount(){
  db.settings.companyBank={bankName:document.getElementById('companyBankName').value.trim(),accountNumber:document.getElementById('companyBankAccount').value.trim(),accountName:document.getElementById('companyBankAccountName').value.trim()};
  log('Settings updated','Company bank account saved');save();alert('Company bank account saved.');
}
function testDirectPaymentConnection(){
  const url=document.getElementById('directPayApiUrl').value.trim();
  if(!url){alert('Enter the API Base URL provided by your bank first.');return}
  alert('Direct payment integration is not active yet — there is no live banking API connected. This button will actually test the connection once the bank API details are entered and a secure backend is in place to call them. See the note on the Payroll Cycle page for what is needed.');
}
function saveDirectPaymentConfig(){
  db.settings.directPayment={apiUrl:document.getElementById('directPayApiUrl').value.trim(),connected:false};
  localStorage.setItem('marlum_direct_pay_creds',JSON.stringify({clientId:document.getElementById('directPayClientId').value.trim(),clientSecret:document.getElementById('directPayClientSecret').value.trim()}));
  log('Settings updated','Direct payment configuration saved (not yet active) — API URL only; credentials are kept in this browser only, not synced');save();render();alert('Saved. The API URL is saved to your account; the Client ID and Secret are kept only on this device/browser and will need to be re-entered on any other device — that is intentional, since these will eventually be genuine bank credentials. No live connection exists yet.');
}
function renderEmployees(){
let q=(document.getElementById('employeeSearch')?.value||'').toLowerCase().trim();
let rows=db.employees.filter(e=>!q||[e.id,e.name,e.dept,e.position,e.phone,e.email].join(' ').toLowerCase().includes(q));
document.getElementById('employeeRows').innerHTML=rows.map(e=>{
let g=(e.basic||0)+(e.housing||0)+(e.transport||0)+(e.other||0);
return `<tr><td>${esc(e.id)}</td><td>${esc(e.name)}</td><td>${esc(e.dept||'—')}</td><td>${esc(e.position||'—')}</td><td>${money(g)}</td><td>${esc(e.bank||'—')} / ${e.account?'****'+esc(e.account.slice(-4)):'—'}</td><td><span class="badge ${e.status==='Active'?'active-b':'failed'}">${esc(e.status)}</span></td><td><button class="btn secondary" onclick="viewEmployee('${esc(e.id)}')">View</button> <button class="btn secondary" onclick="openEmployee('${esc(e.id)}')">Edit</button> <button class="btn danger" onclick="deleteEmployee('${esc(e.id)}')">Delete</button></td></tr>`}).join('')||'<tr><td colspan="8">No matching employees.</td></tr>';
}
function saveSettings(){db.settings.companyName=document.getElementById('companyName').value;log('Settings updated','Company settings changed');save();render();alert('Settings saved.')}
function reloadEmployeeMasterData(){
  // SAFE BY DESIGN: this only ADDS employees whose ID doesn't exist yet in the live database — it
  // never overwrites an existing employee's fields. Manual corrections (bank names, account
  // numbers, departments, anything edited in Employee Management) are never touched, no matter
  // how many times this runs or what's baked into whichever build of the file is deployed.
  const existingIds=new Set(db.employees.map(e=>e.id));
  const newOnes=DEFAULT_EMPLOYEE_SEED.filter(e=>!existingIds.has(e.id));
  if(!newOnes.length){alert('No new employees to add — every employee built into this version of the app is already in your live database. Nothing was changed.');return}
  if(!confirm(`This will ADD ${newOnes.length} new employee(s) that exist in this build but not yet in your live database: ${newOnes.map(e=>e.name).join(', ')}. No existing employee record will be changed or overwritten. Continue?`))return;
  db.employees=db.employees.concat(newOnes.map(e=>({...e})));
  log('Employee master data reloaded',`Added ${newOnes.length} new employee(s) from current build: ${newOnes.map(e=>e.name).join(', ')}`);
  save();render();
  alert(`Done. Added ${newOnes.length} new employee(s). No existing records were changed.`);
}
function renameSiteDepartment(){
  if(!normalizeRoles(activeSystemUser()).includes('Super Admin')){alert('Only Super Admin can rename or merge a site.');return}
  const from=document.getElementById('siteRenameFrom').value.trim();
  const to=document.getElementById('siteRenameTo').value.trim();
  if(!from||!to){alert('Enter both the current name and the new name.');return}
  if(from===to){alert('The current name and the new name are the same — nothing to do.');return}
  const affected=db.employees.filter(e=>(e.dept||'')===from);
  if(!affected.length){alert(`No employee currently has the department set to exactly "${from}". Check Employee Management for the exact spelling — this only matches an exact name, not a partial one.`);return}
  const destinationCount=db.employees.filter(e=>(e.dept||'')===to).length;
  const mergeNote=destinationCount?` "${to}" already has ${destinationCount} employee(s) — they will now be grouped together with the ${affected.length} being moved.`:'';
  if(!confirm(`Move ${affected.length} employee(s) from "${from}" to "${to}"?${mergeNote} This cannot be undone automatically.`))return;
  affected.forEach(e=>{e.dept=to;e.departmentId=to;});
  log('Site renamed/merged',`"${from}" → "${to}" — ${affected.length} employee(s) moved`);
  save();render();
  document.getElementById('siteRenameFrom').value='';document.getElementById('siteRenameTo').value='';
  alert(`Done. ${affected.length} employee(s) moved from "${from}" to "${to}".`);
}
function exportEmployees(){
let rows=[['ID','Name','Department','Position','Monthly Basic','Monthly Housing','Monthly Transport','Monthly Other','Monthly Gross','Bank','Account','Status'],
...db.employees.map(e=>[e.id,e.name,e.dept,e.position,e.basic,e.housing,e.transport,e.other,e.basic+e.housing+e.transport+e.other,e.bank,e.account,e.status])];
let csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');
let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='marlum-monthly-employees.csv';a.click();
}
document.addEventListener('DOMContentLoaded', render);