const {JSDOM}=require('/tmp/t/node_modules/jsdom'),fs=require('fs');const D='/mnt/user-data/outputs/ledgerline-deploy/';
const sl=ms=>new Promise(r=>setTimeout(r,ms));let pass=0,fail=0;const ok=(c,m)=>{c?pass++:(fail++,console.log('FAIL:',m))};
(async()=>{
// landing calculator
let dom=new JSDOM(fs.readFileSync(D+'index.html','utf8'),{runScripts:'dangerously',url:'http://localhost/'});let d=dom.window.document,$=s=>d.querySelector(s);
ok($('#co').textContent.includes('₹20,000')&&$('#co').textContent.includes('₹4,999')&&$('#co').textContent.includes('4 times'),'calculator default: '+$('#co').textContent);
$('#cc').value=120;$('#cc').dispatchEvent(new dom.window.Event('input'));ok($('#co').textContent.includes('₹60,000')&&$('#co').textContent.includes('₹14,997'),'120 clients = 3 packs');
$('#cu').value='$';$('#cr').value=30;$('#cc').value=40;$('#cc').dispatchEvent(new dom.window.Event('input'));ok($('#co').textContent.includes('$1,200')&&$('#co').textContent.includes('$199')&&$('#co').textContent.includes('6 times'),'dollar calculator: '+$('#co').textContent);
ok(fs.readFileSync(D+'index.html','utf8').includes('manifest.webmanifest')&&fs.existsSync(D+'icon-192.png'),'installable icons');
// portal page
const data={business:'Acme CA',client:'Sharma Traders',brand:{name:'Acme Books',color:'#112233',logo:'https://x.test/l.png',note:'Thank you'},country:'in',cash:1156,invoices:[{number:'INV-2',client:'Beta',issue_date:'2026-10-01',subtotal:100,tax:5,total:105,status:'unpaid'}],entries:[{entry_date:new Date().toISOString().slice(0,10),type:'in',category:'Cash sales',amount:500,note:'Shop'},{entry_date:new Date().toISOString().slice(0,10),type:'out',category:'Rent',amount:200,note:'Rent'}]};
const calls=[];dom=new JSDOM(fs.readFileSync(D+'portal.html','utf8'),{runScripts:'dangerously',url:'http://localhost/portal?t='+'a'.repeat(64),beforeParse(w){w.LEDGERLINE={SB_URL:'https://x.supabase.co',SB_KEY:'sb_publishable_abc'};w.fetch=async(u,o)=>{calls.push([u,o]);return{json:async()=>u.includes('portal_sign')?true:data}}}});
await sl(300);d=dom.window.document;let t=d.body.textContent.replace(/\s+/g,' ');
ok(t.includes('Acme Books')&&t.includes('Sharma Traders')&&t.includes('₹1,156.00')&&t.includes('₹500.00')&&t.includes('₹300.00')&&t.includes('INV-2')&&t.includes('Thank you'),'portal shows books: '+t.slice(0,200));
ok(!calls[0][1].headers.Authorization&&calls[0][1].headers.apikey==='sb_publishable_abc','portal uses only the public key');
d.querySelector('#sn').value='Ravi Sharma';d.querySelector('#sb').click();await sl(150);ok(calls.length==2&&JSON.parse(calls[1][1].body).nm==='Ravi Sharma'&&d.querySelector('#sm').textContent.includes('recorded'),'sign-off sent');
dom=new JSDOM(fs.readFileSync(D+'portal.html','utf8'),{runScripts:'dangerously',url:'http://localhost/portal?t=bad',beforeParse(w){w.LEDGERLINE={}}});await sl(100);ok(dom.window.document.body.textContent.includes('not valid'),'bad link rejected');
dom=new JSDOM(fs.readFileSync(D+'portal.html','utf8'),{runScripts:'dangerously',url:'http://localhost/portal?t='+'b'.repeat(64),beforeParse(w){w.LEDGERLINE={SB_URL:'https://x.supabase.co',SB_KEY:'k'};w.fetch=async()=>({json:async()=>null})}});await sl(200);ok(dom.window.document.body.textContent.includes('expired'),'expired link message');
console.log(`web pass ${pass}, fail ${fail}`);process.exit(0)})();
