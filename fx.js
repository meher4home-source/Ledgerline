/* Ledgerline 3D layer: one persistent WebGL scene + 3D tilt, depth reveals, page swing. Design only. */
(function(){
var APP=!!document.getElementById('app'),rm=matchMedia('(prefers-reduced-motion:reduce)').matches,$=function(s){return document.querySelector(s)};
/* 3D tilt */
if(!rm){var cur=null,SEL=APP?'.tile,.dc,.tc,.plc':'.grid>.card,.plan';
 document.addEventListener('pointermove',function(e){var c=e.target.closest&&e.target.closest(SEL);if(cur&&cur!==c){cur.style.transform='';cur=null}if(!c)return;cur=c;var r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform='perspective(900px) rotateY('+(x*10)+'deg) rotateX('+(-y*10)+'deg) translateZ(6px)'});
 document.addEventListener('pointerout',function(e){if(cur&&!cur.contains(e.relatedTarget)){cur.style.transform='';cur=null}});
 if(APP){document.addEventListener('click',function(e){if(!e.target.closest('#tabs button,[data-go],[data-tl],.tile'))return;var p=$('#pane');if(!p)return;p.classList.remove('swing');void p.offsetWidth;p.classList.add('swing')})}
 else if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(en){if(en.isIntersecting){var t=en.target;t.classList.add('rvi');io.unobserve(t);setTimeout(function(){t.classList.remove('rv','rvi')},1000)}})},{threshold:.12});
  document.querySelectorAll('section h2,.grid>.card,.t,section .card,.note,footer .w').forEach(function(t){var r=t.getBoundingClientRect();if(r.top<innerHeight*.9)return;t.classList.add('rv');io.observe(t)})}}
/* WebGL scene */
var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';s.onload=scene;document.head.appendChild(s);
function scene(){
 if(!window.THREE)return;var cv=document.createElement('canvas');cv.id='fxc';cv.setAttribute('aria-hidden','true');document.body.insertBefore(cv,document.body.firstChild);
 var R;try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true})}catch(e){cv.remove();return}
 R.setPixelRatio(Math.min(devicePixelRatio,APP?1.25:2));
 var S=new THREE.Scene(),C=new THREE.PerspectiveCamera(38,1,.1,60);C.position.set(0,.4,10);
 S.add(new THREE.AmbientLight(0x8a7bff,.8));
 [[0x41e0ff,1.4,[6,4,6]],[0xffd28a,1.5,[-5,3,6]],[0x7c5cff,1.8,[0,-4,-4]]].forEach(function(a){var l=new THREE.PointLight(a[0],a[1],50);l.position.set(a[2][0],a[2][1],a[2][2]);S.add(l)});
 var G=new THREE.Group();S.add(G);
 var gold=new THREE.MeshStandardMaterial({color:0xffc861,metalness:.8,roughness:.42}),geo=new THREE.CylinderGeometry(1.15,1.15,.22,64);
 for(var i=0;i<7;i++){var m=new THREE.Mesh(geo,gold);m.position.set(Math.sin(i*1.7)*.1,-1.1+i*.3,Math.cos(i*1.3)*.1);m.rotation.y=i*.6;G.add(m)}
 var f=new THREE.Mesh(geo,gold);f.position.y=1.55;f.rotation.z=Math.PI/2;G.add(f);
 var gr=new THREE.GridHelper(18,36,0x41e0ff,0x7c5cff);gr.position.y=-1.3;gr.material.transparent=true;gr.material.opacity=.22;S.add(gr);
 function ring(r,c,rx,rz){var q=new THREE.Mesh(new THREE.TorusGeometry(r,.014,8,200),new THREE.MeshBasicMaterial({color:c}));q.rotation.set(rx,0,rz);G.add(q);return q}
 var r1=ring(2.5,0x41e0ff,1.2,.3),r2=ring(3.1,0x7c5cff,1.9,-.5);
 var N=350,pa=new Float32Array(N*3);for(var j=0;j<N;j++){var r=4+Math.random()*7,a=Math.random()*6.283,b=Math.acos(2*Math.random()-1);pa[j*3]=r*Math.sin(b)*Math.cos(a);pa[j*3+1]=r*Math.cos(b);pa[j*3+2]=r*Math.sin(b)*Math.sin(a)}
 var pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pa,3));
 var pts=new THREE.Points(pg,new THREE.PointsMaterial({size:.03,color:0xb9b0ff,transparent:true,opacity:.7}));S.add(pts);
 var tx=0,ty=0,mx=0,my=0,pw=0,ph=0,sp=0,tk=0,ck=new THREE.Clock();
 addEventListener('pointermove',function(e){tx=e.clientX/innerWidth-.5;ty=e.clientY/innerHeight-.5});
 function size(){var w=innerWidth,h=innerHeight;if(w===pw&&h===ph)return false;pw=w;ph=h;R.setSize(w,h,false);C.aspect=w/h;C.updateProjectionMatrix();return true}
 function frame(t){
  var h=document.documentElement,p=Math.min(1,Math.max(0,scrollY/Math.max(1,h.scrollHeight-innerHeight)));sp+=(p-sp)*.08;
  var wide=innerWidth>900;
  G.position.x=wide?(APP?3.9:3.1)*Math.cos(sp*Math.PI*2):0;G.position.y=(wide?0:-.3)+Math.sin(sp*Math.PI*3)*.5;G.scale.setScalar(wide?1:.75);
  mx+=(tx-mx)*.06;my+=(ty-my)*.06;G.rotation.y=t*.25+mx*1.2+sp*6.283;G.rotation.x=my*.35;f.rotation.x=t*1.6;
  r1.rotation.z+=rm?0:.003;r2.rotation.z-=rm?0:.002;pts.rotation.y=t*.03+sp*1.5;C.position.y=.4-sp*.8;R.render(S,C)}
 if(rm){size();frame(0);addEventListener('resize',function(){size();frame(0)});addEventListener('scroll',function(){frame(0)},{passive:true});return}
 (function loop(){requestAnimationFrame(loop);if(document.hidden)return;if(APP&&(tk++&1))return;size();frame(ck.getElapsedTime())})();
}
})();
