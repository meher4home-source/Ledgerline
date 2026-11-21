(function(){var L=window.LLSITE||{},C=window.LEDGERLINE||{},O=L.operator||{},$=function(s){return document.querySelector(s)},E=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var email=O.email||C.SUPPORT_EMAIL||'';
var b=$('#biz');if(b){var p=['Ledgerline is an independently operated software product.'];
 if(O.legalName)p.push(E(O.legalName)+(O.businessType?' ('+E(O.businessType)+')':''));if(O.address)p.push(E(O.address));if(email)p.push('<a href="mailto:'+E(email)+'">'+E(email)+'</a>');if(O.phone)p.push(E(O.phone));
 (L.registrations||[]).forEach(function(r){p.push(E(r.label)+': '+E(r.value))});b.innerHTML=p.join(' &middot; ')}
var money=function(n,c){return c+Number(n).toLocaleString(c==='₹'?'en-IN':'en-US')};
var pr=$('#plans');if(pr&&L.plans){var rows=Object.keys(L.plans).map(function(k){var x=L.plans[k];return'<tr><td>'+E(x.name)+'</td>'+x.p.map(function(v){return'<td>'+money(v,x.cur)+'/month</td>'}).join('')+'</tr>'}).join('');
 pr.innerHTML='<table><tr><th>Country</th><th>Personal</th><th>Business</th><th>Accountant, per 50 clients</th></tr>'+rows+'</table>'}
document.querySelectorAll('[data-tier]').forEach(function(el){var t=(L.bulk||[]).filter(function(x){return String(x.businesses)===el.dataset.tier})[0];
 el.textContent=(L.showBulkPrices&&t&&t.price)?'Indicative '+t.period+' price: '+money(t.price,'₹')+' plus tax. Confirmed in a written quotation.':'Priced by written quotation.'});
var f=$('#enq');if(f){var q=new URLSearchParams(location.search).get('type');if(q&&f.kind.querySelector('option[value="'+q+'"]'))f.kind.value=q;
 f.onsubmit=async function(e){e.preventDefault();var m=$('#emsg');m.className='msg';m.textContent='';if(f.website.value)return;
  var last=+localStorage.getItem('ll_enq')||0;if(Date.now()-last<60000){m.className='msg er';m.textContent='Please wait a minute before sending another enquiry.';return}
  var d={kind:f.kind.value,name:f.nm.value.trim(),email:f.em.value.trim(),phone:f.ph.value.trim()||null,organisation:f.org.value.trim()||null,businesses:f.biz.value?parseInt(f.biz.value,10):null,message:f.msg.value.trim()||null},ok=false;
  try{if(C.SB_URL&&C.SB_KEY){var r=await fetch(C.SB_URL+'/rest/v1/enquiries',{method:'POST',headers:{apikey:C.SB_KEY,Authorization:'Bearer '+C.SB_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(d)});ok=r.status===201}}catch(x){}
  if(ok){localStorage.setItem('ll_enq',Date.now());f.reset();m.className='msg ok';m.textContent='Thank you. Your enquiry has been received. We will reply by email.'}
  else{var s='Ledgerline enquiry: '+d.kind,body=[d.name,d.organisation,d.email,d.phone,d.businesses?d.businesses+' businesses':'',d.message].filter(Boolean).join('\n');
   m.className='msg er';m.innerHTML='We could not send the form from here, so nothing has been received yet. '+(email?'Please email us at <a href="mailto:'+E(email)+'?subject='+encodeURIComponent(s)+'&body='+encodeURIComponent(body)+'">'+E(email)+'</a>.':'Please try again later.')}}}
})();
