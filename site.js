(function(){var L=window.LLSITE||{},C=window.LEDGERLINE||{},O=L.operator||{},F=L.offers||{},$=function(s){return document.querySelector(s)},E=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var email=O.email||C.SUPPORT_EMAIL||'',inr=function(n){return '₹'+Number(n).toLocaleString('en-IN')},money=function(n,c){return c+Number(n).toLocaleString(c==='₹'?'en-IN':'en-US')};
var b=$('#biz');if(b){var p=['Ledgerline is an independently operated software product.'];
 if(O.legalName)p.push(E(O.legalName)+(O.businessType?' ('+E(O.businessType)+')':''));if(O.location)p.push(E(O.location));if(O.address)p.push(E(O.address));if(email)p.push('<a href="mailto:'+E(email)+'">'+E(email)+'</a>');if(O.phone)p.push(E(O.phone));
 (L.registrations||[]).forEach(function(r){p.push(E(r.label)+': '+E(r.value))});b.innerHTML=p.join(' &middot; ')}
/* contact buttons: only shown when the detail is filled in */
var q=$('#quick');if(q){var h='';if(O.whatsapp){var w=String(O.whatsapp).replace(/\D/g,'');if(w)h+='<a class="btn" href="https://wa.me/'+w+'?text='+encodeURIComponent('Hello, I would like to know more about Ledgerline.')+'" rel="noopener">WhatsApp us</a>'}
 if(email)h+='<a class="btn o" href="mailto:'+E(email)+'?subject='+encodeURIComponent('Ledgerline enquiry')+'">Email us</a>';q.innerHTML=h}
/* introductory invoice offers, read from site-config.js */
var pl=F.pilot||{},pk=F.pack||{},on=(L.plans&&L.plans.in)?L.plans.in.p[2]:null,V={'pilot.price':pl.price&&inr(pl.price),'pilot.days':pl.days,'pilot.workspaces':pl.workspaces,'pack.price':pk.price&&inr(pk.price),'pack.workspaces':pk.workspaces,'pack.perMonth':pk.price&&inr(Math.round(pk.price/12)),'online.monthly':on&&inr(on),'online.yearly':on&&inr(on*12)};
document.querySelectorAll('[data-offer]').forEach(function(el){var v=V[el.dataset.offer];if(v!=null&&v!=='')el.textContent=v});
document.querySelectorAll('[data-offers]').forEach(function(el){if(F.showIntro===false)el.hidden=true});
document.querySelectorAll('[data-if]').forEach(function(el){var k=el.dataset.if.split('.'),v=F[k[0]]&&F[k[0]][k[1]];if(!v)(el.closest('li')||el).hidden=true});
var pr=$('#plans');if(pr&&L.plans){var rows=Object.keys(L.plans).map(function(k){var x=L.plans[k];return'<tr><td>'+E(x.name)+'</td>'+x.p.map(function(v){return'<td>'+money(v,x.cur)+'/month</td>'}).join('')+'</tr>'}).join('');
 pr.innerHTML='<table><tr><th>Country</th><th>Personal</th><th>Business</th><th>Accountant, per 50 clients</th></tr>'+rows+'</table>'}
document.querySelectorAll('[data-tier]').forEach(function(el){var t=(L.bulk||[]).filter(function(x){return String(x.businesses)===el.dataset.tier})[0];
 el.textContent=(L.showBulkPrices&&t&&t.price)?'Indicative '+t.period+' price: '+money(t.price,'₹')+' plus tax. Confirmed in a written quotation.':'Priced by written quotation.'});
/* enquiry form */
var f=$('#enq');if(f){var t0=Date.now(),qs=new URLSearchParams(location.search),qt=qs.get('type'),qp=qs.get('plan');if(qt&&f.kind.querySelector('option[value="'+qt+'"]'))f.kind.value=qt;if(qp&&f.plan.querySelector('option[value="'+qp+'"]'))f.plan.value=qp;
 var say=function(c,h){var m=$('#emsg');m.className='msg '+c;m.innerHTML=h};
 f.onsubmit=async function(e){e.preventDefault();$('#emsg').className='';$('#emsg').textContent='';if(f.website.value)return;
  var d={kind:f.kind.value,name:f.nm.value.trim(),email:f.em.value.trim(),phone:f.ph.value.trim()||null,organisation:f.org.value.trim()||null,businesses:f.biz.value?parseInt(f.biz.value,10):null,current_software:f.sw.value.trim()||null,plan_interest:f.plan.value||null,message:f.msg.value.trim()||null},er=[];
  if(d.name.length<2)er.push('Enter your name.');if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email))er.push('Enter a valid email address.');if(d.phone&&!/^[+0-9 ()-]{7,20}$/.test(d.phone))er.push('Enter a valid phone number, or leave it empty.');
  if(d.businesses!==null&&!(d.businesses>=1&&d.businesses<=1000000))er.push('Number of clients must be between 1 and 1,000,000.');if(d.message&&d.message.length>3000)er.push('Message is too long.');if(!f.cons.checked)er.push('Please tick the box so we may contact you.');
  if(er.length){say('er',er.join('<br>'));return}
  if(Date.now()-t0<3000){say('er','Please check the form and press Send again.');return}
  var last=+localStorage.getItem('ll_enq')||0;if(Date.now()-last<60000){say('er','Please wait a minute before sending another enquiry.');return}
  var ok=false;try{if(C.SB_URL&&C.SB_KEY){var r=await fetch(C.SB_URL+'/rest/v1/enquiries',{method:'POST',headers:{apikey:C.SB_KEY,Authorization:'Bearer '+C.SB_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(d)});ok=r.status===201}}catch(x){}
  if(ok){localStorage.setItem('ll_enq',Date.now());f.reset();t0=Date.now();say('ok','Thank you. Your enquiry has been received. We will reply by email.')}
  else{var s='Ledgerline enquiry: '+d.kind,body=[d.name,d.organisation,d.email,d.phone,d.businesses?d.businesses+' clients':'',d.current_software,d.message].filter(Boolean).join('\n');
   say('er','We could not send the form from here, so nothing has been received yet. '+(email?'Please email us at <a href="mailto:'+E(email)+'?subject='+encodeURIComponent(s)+'&body='+encodeURIComponent(body)+'">'+E(email)+'</a>.':'Please try again later.'))}}}
})();
