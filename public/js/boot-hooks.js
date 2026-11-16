
window.addEventListener('error', function(e){
  var box=document.getElementById('appError'), text=document.getElementById('appErrorText');
  if(box&&text){text.textContent=e.message||'Unknown JavaScript error';box.style.display='block';}
});
