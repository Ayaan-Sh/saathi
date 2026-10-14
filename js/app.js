var $=function(id){return document.getElementById(id)};
var ACTS=["Garba / dandiya partner","Event plus-one","Coffee or dinner","Movie buddy","Wedding guest","Festival walk"];
var KEYS=["garba","plus_one","coffee_dinner","movie","wedding","festival_walk"];
var CITY={Pune:[18.5204,73.8567],Mumbai:[19.076,72.8777],Ahmedabad:[23.0225,72.5714],Vadodara:[22.3072,73.1812],Surat:[21.1702,72.8311]};
var PHS=["linear-gradient(135deg,#ec1d6b,#ff5a2e)","linear-gradient(135deg,#7c3aed,#ec1d6b)","linear-gradient(135deg,#ff5a2e,#ffb347)"];
var configured=SUPABASE_URL.indexOf("YOUR-PROJECT")<0&&SUPABASE_ANON_KEY.indexOf("YOUR-ANON")<0;
var sb=configured?supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{flowType:"pkce"}}):null;
var user=null,mine=null,DATA=[],active=-1,loc=null,myLoc=null,photo=null,prefs={},nextHash="",token=0,presT=null,saveT=null,vs={};
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function inr(n){return "₹"+Number(n).toLocaleString("en-IN")}
function pubUrl(p){return sb.storage.from("profile-photos").getPublicUrl(p).data.publicUrl}
function toast(t){var x=$("toast");x.textContent=t;x.style.display="block";clearTimeout(x._t);x._t=setTimeout(function(){x.style.display="none"},4000)}
function getLoc(cb){if(!navigator.geolocation){toast("This browser can't share location. Pick your city instead.");return}
 navigator.geolocation.getCurrentPosition(function(p){cb(p.coords.latitude,p.coords.longitude)},function(){toast("Location is blocked. Allow it in your browser, or pick your city.")},{timeout:9000})}
function blobOf(file,maxW){return createImageBitmap(file,{imageOrientation:"from-image"}).then(function(b){var w=Math.min(maxW,b.width),h=Math.round(b.height*w/b.width),c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(b,0,0,w,h);return new Promise(function(res){c.toBlob(res,"image/webp",0.82)})})}
function loadImg(f,cb){var fr=new FileReader();fr.onload=function(){var im=new Image();im.onload=function(){cb(im)};im.onerror=function(){cb(null)};im.src=fr.result};fr.readAsDataURL(f)}

/* ---------- data ---------- */
function norm(r){return{id:r.id,n:r.name,a:r.age,g:r.gender,c:r.city,acts:(r.activities||[]).map(function(k){return KEYS.indexOf(k)}).filter(function(i){return i>-1}),hr:r.rate_hour||0,day:r.rate_day||0,rt:Number(r.rating)||0,b:r.bio||"",photo:r.photo_path?sb.storage.from("profile-photos").getPublicUrl(r.photo_path).data.publicUrl:"",online:!!r.online,out:r.available_out!==false,d:r.distance_km,extra:[]}}
async function load(){
 if(!sb){renderOnline();renderGrid();return}
 var my=++token,g=$("gender").value||null,a=active>-1?KEYS[active]:null,res;
 try{
  if(loc){var r=await sb.rpc("nearby_companions",{p_lat:loc.lat,p_lng:loc.lng,p_radius_km:+$("rad").value,p_gender:g,p_activity:a});if(r.error)throw r.error;res=r.data}
  else{var q=sb.from("public_companions").select("*").eq("city",$("city").value);if(g)q=q.eq("gender",g);if(a)q=q.contains("activities",[a]);var r2=await q;if(r2.error)throw r2.error;res=r2.data}
 }catch(e){if(my==token)toast("Couldn't load companions. "+(e.message||""));return}
 if(my!=token)return;
 var s=$("sort").value,pr=function(p){return p.day||p.hr*8};
 DATA=res.map(norm);DATA.sort(function(a,b){return s=="n"&&loc?a.d-b.d:s=="p"?pr(a)-pr(b):b.rt-a.rt});
 renderOnline();renderGrid();loadExtras();
}
function ph(p,cls){var nm=esc(p.n);return p.photo?'<img class="'+cls+'" src="'+esc(p.photo)+'" alt="'+(cls=="ph"?'Photo of '+nm:'')+'">':'<div class="'+cls+'" style="background:'+PHS[String(p.id).charCodeAt(0)%3]+'">'+esc(p.n[0].toUpperCase())+'</div>'}
function where(p){return loc&&p.d!=null?(p.d<1?'Under 1':Math.round(p.d))+' km away':esc(p.c)}
function renderOnline(){
 var l=DATA.filter(function(p){return p.online});$("oc").textContent=l.length+" online";
 $("orow").innerHTML=l.length?l.map(function(p){return '<button class="oc" type="button" data-id="'+esc(p.id)+'"><span class="avw">'+ph(p,"oav")+'<i class="dotg"></i></span><b>'+esc(p.n)+'</b><span class="meta">'+where(p)+'</span></button>'}).join(""):'<div class="empty" style="width:100%">Nobody is online in this view right now.</div>';
}
function renderGrid(){
 var l=DATA.filter(function(p){return p.out}),el=$("grid");$("gc").textContent=l.length+" available";
 if(!l.length){el.innerHTML='<div class="empty" style="grid-column:1/-1">'+(configured?(loc?'No one nearby yet. Widen the distance, or list yourself.':'No companions in this city yet. Try another city or activity, or list yourself.'):'Add your Supabase URL and anon key to see companions.')+'</div>';return}
 el.innerHTML=l.map(function(p){
  var price=(p.day?'<b>'+inr(p.day)+'</b> /day':'')+(p.day&&p.hr?'<br>':'')+(p.hr?(p.day?'<span class="meta">':'<b>')+inr(p.hr)+(p.day?'</span>':'</b>')+' /hr':'');
  return '<article class="card">'+ph(p,"ph")+'<div class="bd"><div><h3>'+esc(p.n)+', '+esc(p.a)+'</h3><div class="meta">'+where(p)+(p.rt?' · ★ '+p.rt.toFixed(1):' · New')+'</div></div>'
  +'<div class="ver">ID verified</div>'+(p.online?'<div class="onl">● Online now</div>':'')
  +'<div class="acts">'+p.acts.map(function(i){return '<span>'+esc(ACTS[i])+'</span>'}).join("")+'</div>'
  +'<div class="meta">'+esc(p.b)+'</div>'+(p.extra&&p.extra.length?'<button class="more" type="button" data-ph="'+esc(p.id)+'">See all photos ('+(p.extra.length+(p.photo?1:0))+')</button>':'')
  +'<div class="price"><span>'+price+'</span><button class="btn" data-id="'+esc(p.id)+'">Request</button></div></div></article>'}).join("");
}
$("grid").onclick=$("orow").onclick=function(e){var g=e.target.closest("button[data-ph]");if(g){showPhotos(g.dataset.ph);return}var b=e.target.closest("button[data-id]");if(b)openBook(b.dataset.id)};

/* ---------- filters ---------- */
function renderChips(){
 var h='<button class="chip" aria-pressed="'+(active==-1)+'" data-i="-1">All activities</button>';
 ACTS.forEach(function(a,i){h+='<button class="chip" aria-pressed="'+(active==i)+'" data-i="'+i+'">'+esc(a)+'</button>'});
 var el=$("chips");el.innerHTML=h;
 el.onclick=function(e){var b=e.target.closest(".chip");if(!b)return;active=+b.dataset.i;persist();renderChips();load()}
}
function setSeg(){[].forEach.call($("seg").children,function(b){b.setAttribute("aria-pressed",String(b.dataset.g==$("gender").value))})}
function ui(){
 $("city").hidden=!!loc;$("rad").hidden=!loc;$("loc").textContent=loc?"Clear my location":"Use my location";
 $("sort").querySelector('[value="n"]').disabled=!loc;
 if(loc&&$("sort").dataset.auto!="1"){$("sort").value="n";$("sort").dataset.auto="1"}
 if(!loc){if($("sort").value=="n")$("sort").value="r";$("sort").dataset.auto=""}
 $("locmsg").textContent=loc?"Showing companions near you. Your position is used only for this search and is never shown to anyone.":"Share your location to see who is available near you, or pick a city.";
}
$("loc").onclick=function(){if(loc){loc=null;ui();load();return}getLoc(function(a,b){loc={lat:a,lng:b};ui();load()})};
["city","gender","sort","rad"].forEach(function(id){$(id).onchange=function(){persist();load()}});
$("seg").onclick=function(e){var b=e.target.closest("button");if(!b)return;$("gender").value=b.dataset.g;setSeg();persist();load()};

/* ---------- auth + saved state ---------- */
function renderAcct(){var n=user?(user.user_metadata&&(user.user_metadata.full_name||user.user_metadata.name)||user.email||"there").split(" ")[0]:"";$("acct").innerHTML=user?'<span>Hi, '+esc(n)+'</span><button class="lo" id="lo" type="button">Log out</button>':'<a class="loginb" href="#/login">Log in</a>'}
$("acct").onclick=function(e){if(e.target.id=="lo"&&sb)sb.auth.signOut()};
$("gbtn").onclick=function(){if(!sb){toast("Add your Supabase URL and anon key first.");return}
 try{sessionStorage.setItem("saathi_next",nextHash||"")}catch(e){}
 sb.auth.signInWithOAuth({provider:"google",options:{redirectTo:location.origin+location.pathname}})};
function needLogin(m){nextHash=location.hash||"#/";$("lgmsg").textContent=m;location.hash="#/login"}
function persist(){
 if(!user||!sb)return;
 prefs.city=$("city").value;prefs.gender=$("gender").value;prefs.rad=$("rad").value;prefs.sort=$("sort").value;prefs.active=active;
 if(location.hash!="#/login")prefs.hash=location.hash;
 clearTimeout(saveT);saveT=setTimeout(function(){var d=prefs.draft||{},p=Object.assign({},prefs);delete p.draft;
  sb.from("user_state").upsert({user_id:user.id,prefs:p,draft:d,updated_at:new Date().toISOString()})},800);
}
function applyPrefs(){["city","gender","rad","sort"].forEach(function(k){if(prefs[k]!=null)$(k).value=prefs[k]});
 active=typeof prefs.active=="number"?prefs.active:-1;if($("sort").value=="n"&&!loc)$("sort").value="r";setSeg();renderChips()}
async function loadMine(){var r=await sb.from("companions").select("*").eq("user_id",user.id).maybeSingle();mine=r.data||null;renderStatus();updateNav();refreshBadge()}
function ping(){if(user&&document.visibilityState=="visible"){sb.rpc("touch_presence");refreshBadge()}}
async function setUser(u){
 user=u;renderAcct();clearInterval(presT);mine=null;prefs={};updateNav();
 if(u){try{
  try{var nx=sessionStorage.getItem("saathi_next");if(nx){nextHash=nx;sessionStorage.removeItem("saathi_next")}}catch(e){}
  await loadMine();
  var st=await sb.from("user_state").select("prefs,draft").eq("user_id",u.id).maybeSingle();
  prefs=(st.data&&st.data.prefs)||{};prefs.draft=(st.data&&st.data.draft&&Object.keys(st.data.draft).length)?st.data.draft:null;
  applyPrefs();presT=setInterval(ping,120000);ping();
  var fromLogin=location.hash=="#/login";
  if(nextHash){var go=nextHash;nextHash="";location.hash=go}
  else if(fromLogin||!location.hash){location.hash=prefs.hash&&prefs.hash!="#/login"?prefs.hash:"#/"}
  if(fromLogin)toast("Welcome back. Picking up where you left off.");
 }catch(e){console.error("Saathi: sign-in setup failed",e);toast("Signed in, but couldn't load your saved data. Check the browser console.")}}
 route();load();
}

/* ---------- listing ---------- */
var ac=$("acts");
ac.innerHTML=ACTS.map(function(a,i){return '<label><input type="checkbox" value="'+i+'"> '+esc(a)+'</label>'}).join("");
var FIELDS=["n","a","g","c","rd","r","b"];
function readDraft(){var d={acts:[].slice.call(ac.querySelectorAll("input:checked")).map(function(x){return +x.value}),out:$("goout").checked};FIELDS.forEach(function(k){d[k]=$(k).value});return d}
function fillForm(d){FIELDS.forEach(function(k){if(d[k]!=null)$(k).value=d[k]});$("goout").checked=d.out!==false;[].forEach.call(ac.querySelectorAll("input"),function(x){x.checked=(d.acts||[]).indexOf(+x.value)>-1})}
$("form").addEventListener("input",function(){prefs.draft=readDraft();persist()});
function renderStatus(){
 var el=$("lstatus");if(!mine){el.innerHTML="";return}
 var m={pending:"Not verified yet. Verify your ID to go live.",review:"Your ID is under review. You'll go live once approved.",verified:"Verified and live on Saathi.",rejected:"Your verification was rejected. Update your details and verify again.",suspended:"This listing is suspended. Contact support."};
 el.innerHTML='<div class="note" style="margin:0 0 24px"><b>Your listing: '+esc(mine.status)+'</b><br>'+m[mine.status]+(mine.status=="pending"||mine.status=="rejected"?' <a href="#/verify" style="color:var(--accent2);font-weight:700">Verify ID</a>':'')+'</div>';
}
function formFromListing(){if(!mine)return;fillForm({n:mine.name,a:mine.age,g:mine.gender,c:mine.city,rd:mine.rate_day||"",r:mine.rate_hour||"",b:mine.bio||"",out:mine.available_out,acts:(mine.activities||[]).map(function(k){return KEYS.indexOf(k)})})}
$("pf").onchange=async function(){var f=this.files[0];if(!f)return;try{photo=await blobOf(f,800);$("pv").src=URL.createObjectURL(photo);$("pv").hidden=false}catch(e){toast("That file isn't a readable image. Use a JPG or PNG.")}};
$("myloc").onclick=function(){getLoc(function(a,b){myLoc={lat:Math.round(a*100)/100,lng:Math.round(b*100)/100};$("mylocmsg").textContent="Location set to your area. Customers only see distance."})};
$("form").onsubmit=async function(e){
 e.preventDefault();if(!sb||!user)return;
 var age=+$("a").value,hr=+$("r").value||null,day=+$("rd").value||null;
 if(age<18){toast("You must be 18 or older to list yourself.");return}
 if(!photo&&!(mine&&mine.photo_path)){toast("Add a clear photo of yourself.");return}
 if(!hr&&!day){toast("Set a day rate, an hourly rate, or both.");return}
 var sel=[].slice.call(ac.querySelectorAll("input:checked")).map(function(x){return KEYS[+x.value]});
 if(!sel.length){toast("Pick at least one activity you offer.");return}
 var btn=e.submitter;if(btn)btn.disabled=true;
 try{
  var path=mine&&mine.photo_path,oldPath=path;
  if(photo){path=user.id+"/"+crypto.randomUUID()+".webp";var up=await sb.storage.from("profile-photos").upload(path,photo,{contentType:"image/webp"});if(up.error)throw up.error}
  var c=$("c").value,o=CITY[c],pt=myLoc||{lat:o[0],lng:o[1]};
  var row={name:$("n").value.trim(),age:age,gender:$("g").value,city:c,bio:$("b").value.trim()||null,activities:sel,rate_hour:hr,rate_day:day,available_out:$("goout").checked,photo_path:path,location:"SRID=4326;POINT("+pt.lng+" "+pt.lat+")"};
  var r=mine?await sb.from("companions").update(row).eq("id",mine.id).select().single():await sb.from("companions").insert(Object.assign({user_id:user.id},row)).select().single();
  if(r.error)throw r.error;
  var first=!mine||mine.status=="pending"||mine.status=="rejected";
  if(photo&&oldPath&&oldPath!=path)sb.storage.from("profile-photos").remove([oldPath]);
  mine=r.data;prefs.draft=null;persist();photo=null;updateNav();renderStatus();
  if(first){$("pv").hidden=true;toast("Listing saved. Next, verify your ID so it can go live.");location.hash="#/verify"}
  else{listMode();toast("Profile updated.")}
 }catch(err){toast("Couldn't save your listing. "+(err.message||""))}
 if(btn)btn.disabled=false;
};

/* ---------- booking ---------- */
function openBook(id){
 if(!user){needLogin("Log in to send a booking request.");return}
 var p=DATA.filter(function(x){return String(x.id)==id})[0];if(!p)return;
 if(mine&&mine.id==p.id){toast("That's your own listing.");return}
 var d=$("dlg"),f=$("bk"),m=[];
 if(p.day)m.push('<option value="day">Per day ('+inr(p.day)+')</option>');
 if(p.hr)m.push('<option value="hour">Per hour ('+inr(p.hr)+')</option>');
 f.innerHTML='<h2 style="font-size:24px">Request '+esc(p.n)+'</h2>'
 +'<label for="ba">Activity</label><select id="ba">'+p.acts.map(function(i){return '<option>'+esc(ACTS[i])+'</option>'}).join("")+'</select>'
 +'<label for="bm">Book</label><select id="bm">'+m.join("")+'</select>'
 +'<label for="bd">Start date and time</label><input id="bd" type="datetime-local" required>'
 +'<div id="hw"><label for="bh">Hours</label><select id="bh"><option>1</option><option>2</option><option selected>3</option><option>4</option><option>5</option><option>6</option></select></div>'
 +'<label for="bv">Public venue</label><input id="bv" required minlength="3" placeholder="e.g. Koregaon Park garba ground" maxlength="80">'
 +'<p class="meta" id="bt"></p><p class="note">'+esc(p.n)+' can accept or decline. A day booking covers up to 10 hours. Payments are not live yet, so nothing is charged.</p>'
 +'<div style="display:flex;gap:10px;margin-top:14px"><button class="btn" type="submit" value="ok">Send request</button><button class="btn alt" value="x" formnovalidate>Cancel</button></div>';
 var upd=function(){var day=$("bm").value=="day";$("hw").style.display=day?"none":"block";var t=day?p.day:p.hr*(+$("bh").value);$("bt").textContent=inr(t)+" + "+inr(Math.round(t*0.1))+" platform fee = "+inr(t+Math.round(t*0.1))};
 $("bm").onchange=upd;$("bh").onchange=upd;upd();
 f.onsubmit=async function(e){
  e.preventDefault();if(!e.submitter||e.submitter.value!="ok"){d.close();return}
  var mode=$("bm").value;e.submitter.disabled=true;
  var r=await sb.from("bookings").insert({companion_id:p.id,activity:KEYS[ACTS.indexOf($("ba").value)],mode:mode,starts_at:new Date($("bd").value).toISOString(),hours:mode=="hour"?+$("bh").value:null,venue:$("bv").value.trim()});
  if(r.error){toast("Couldn't send the request. "+r.error.message);e.submitter.disabled=false;return}
  d.close();toast("Request sent to "+p.n+". You'll see their answer under My bookings.");
 };
 d.showModal();
}
async function loadBookings(){
 var el=$("bklist");el.innerHTML='<p class="meta">Loading...</p>';
 var r=await sb.from("bookings").select("*").order("created_at",{ascending:false});
 if(r.error){el.innerHTML='<p class="meta">Couldn\'t load bookings.</p>';return}
 var ids=r.data.map(function(b){return b.companion_id}).filter(function(x,i,a){return a.indexOf(x)==i}),names={};
 if(ids.length){var n=await sb.from("public_companions").select("id,name").in("id",ids);(n.data||[]).forEach(function(x){names[x.id]=x.name})}
 el.innerHTML=r.data.length?r.data.map(function(b){
  var inc=mine&&b.companion_id==mine.id,act=ACTS[KEYS.indexOf(b.activity)]||b.activity;
  var btns=inc&&b.status=="requested"?'<button class="btn" data-b="'+esc(b.id)+'" data-s="accepted">Accept</button> <button class="btn alt" data-b="'+esc(b.id)+'" data-s="declined">Decline</button>':!inc&&(b.status=="requested"||b.status=="accepted")?'<button class="btn alt" data-b="'+esc(b.id)+'" data-s="cancelled">Cancel request</button>':'';
  return '<div class="bk"><h3>'+(inc?'Request from a customer':'Your request to '+esc(names[b.companion_id]||'a companion'))+'</h3><p class="meta">'+esc(act)+' · '+new Date(b.starts_at).toLocaleString()+' · '+esc(b.venue)+'<br>'+(b.mode=="day"?'Full day':b.hours+' hour(s)')+' · '+inr(b.amount_paise/100)+' + '+inr(b.fee_paise/100)+' fee</p><p><b>Status: '+esc(b.status)+'</b>'+(b.status=="accepted"?' (payment is not live yet)':'')+'</p>'+btns+'</div>'}).join(""):'<div class="empty">No bookings yet.</div>';
}
$("bklist").onclick=async function(e){var b=e.target.closest("button[data-b]");if(!b)return;b.disabled=true;
 var r=await sb.from("bookings").update({status:b.dataset.s}).eq("id",b.dataset.b);
 if(r.error)toast("Couldn't update. "+r.error.message);loadBookings()};

/* ---------- ID verification chat ---------- */
function say(t,w){var d=document.createElement("div");d.className="msg "+(w||"bot");d.textContent=t;$("chat").appendChild(d);d.scrollIntoView({block:"nearest"})}
function choices(a,cb){var r=$("reply");r.onclick=null;r.innerHTML=a.map(function(x,i){return '<button class="btn alt" data-i="'+i+'">'+esc(x)+'</button>'}).join("");r.onclick=function(e){var b=e.target.closest("button");if(!b)return;var t=a[+b.dataset.i];say(t,"me");r.innerHTML="";cb(t,+b.dataset.i)}}
function ask(inp,cb){var r=$("reply");r.onclick=null;r.innerHTML='<form class="vf">'+inp+'<button class="btn" type="submit">Send</button></form>';r.firstChild.onsubmit=function(e){e.preventDefault();cb(e.target.elements[0])}}
function age(d){var t=new Date(),b=new Date(d),a=t.getFullYear()-b.getFullYear(),m=t.getMonth()-b.getMonth();if(m<0||(m==0&&t.getDate()<b.getDate()))a--;return a}
function done(){$("reply").innerHTML='<a class="btn" href="#/" style="text-decoration:none;display:inline-block">Back to the marketplace</a>'}
function startVerify(){
 $("chat").innerHTML="";$("reply").innerHTML="";vs={};
 if(!mine){say("Create your listing first, then come back here to verify.");$("reply").innerHTML='<a class="btn" href="#/list" style="text-decoration:none;display:inline-block">Create a listing</a>';return}
 if(mine.status=="verified"){say("You're already verified and live.");done();return}
 if(mine.status=="review"){say("Your documents are already with a reviewer. We'll let you know once they're approved.");done();return}
 say("Hi "+mine.name+". I'll collect your age, ID and a selfie, which takes about three minutes. A human reviewer checks everything before you go live.");
 choices(["Start"],s1)
}
function s1(){say("First, your date of birth. You must be 18 or older.");
 ask('<input type="date" required aria-label="Date of birth">',function(v){var a=age(v.value);if(isNaN(a))return;say(v.value,"me");$("reply").innerHTML="";
  if(a<18){say("Saathi is for people 18 and over, so I can't continue.");done();return}
  vs.dob=v.value;
  if(a!=mine.age){say("Your listing says "+mine.age+", but your date of birth makes you "+a+". I've corrected your listing.");mine.age=a;sb.from("companions").update({age:a}).eq("id",mine.id)}
  s2()})}
var IDT=["digilocker","driving_licence","passport","aadhaar_masked"];
function s2(){say("Which ID will you use? We never need your full Aadhaar number. DigiLocker or a masked Aadhaar copy is best.");
 choices(["DigiLocker document","Driving licence","Passport","Masked Aadhaar"],function(t,i){vs.id=IDT[i];vs.idName=t;s3()})}
function s3(){say("Type your full name exactly as printed on the ID.");
 ask('<input required maxlength="60" placeholder="Full name on ID" aria-label="Full name on ID">',function(v){
  var n=v.value.trim().toLowerCase().split(/\s+/),f=mine.name.trim().toLowerCase().split(/\s+/)[0];
  say(v.value,"me");$("reply").innerHTML="";
  if(n.indexOf(f)<0){say("That doesn't match the name on your listing ("+mine.name+"). Type it again, or fix your listing name first.");s3();return}
  s4()})}
function s4(){say("Upload a clear photo of the front of your "+vs.idName+". All four corners visible, no glare.");
 ask('<input type="file" accept="image/*" required aria-label="ID photo">',function(v){var f=v.files[0];if(!f)return;$("reply").innerHTML="";say("ID photo selected.","me");
  loadImg(f,function(im){if(!im||im.width<600||im.height<400){say("I can't read that. Retake it closer, in good light, as a JPG or PNG.");s4();return}
   vs.idFile=f;say("That's readable. Next, a selfie.");s5()})})}
function s5(){say("Last step. Take a selfie facing the camera in good light, without sunglasses or filters.");
 ask('<input type="file" accept="image/*" capture="user" required aria-label="Selfie">',function(v){var f=v.files[0];if(!f)return;$("reply").innerHTML="";say("Selfie selected.","me");
  loadImg(f,function(im){if(!im||im.width<300){say("I can't see your face clearly. Try again in better light.");s5();return}vs.selfieFile=f;finish()})})}
async function finish(){
 say("Uploading your documents securely...");
 try{
  var ip=user.id+"/id-"+crypto.randomUUID()+".webp",sp=user.id+"/selfie-"+crypto.randomUUID()+".webp";
  var u1=await sb.storage.from("kyc-private").upload(ip,await blobOf(vs.idFile,1600),{contentType:"image/webp"});if(u1.error)throw u1.error;
  var u2=await sb.storage.from("kyc-private").upload(sp,await blobOf(vs.selfieFile,1600),{contentType:"image/webp"});if(u2.error)throw u2.error;
  var k=await sb.from("kyc_submissions").insert({user_id:user.id,id_type:vs.id,dob:vs.dob,id_image_path:ip,selfie_path:sp});if(k.error)throw k.error;
  vs={};await loadMine();
  say("You're submitted. A human reviewer checks every application, usually within 24 hours, and your listing goes live once approved.");done();
 }catch(e){say("Something went wrong: "+(e.message||"upload failed")+".");choices(["Try again"],function(){finish()})}
}

/* ---------- nav, photos, dashboard ---------- */
function updateNav(){var has=!!(user&&mine);$("dashlink").hidden=!has;$("listlink").textContent=has?"My profile":"Become a companion";if(!has)$("dashlink").textContent="Dashboard"}
async function refreshBadge(){if(!sb||!mine)return;var r=await sb.from("bookings").select("id",{count:"exact",head:true}).eq("companion_id",mine.id).eq("status","requested");if(r.error)return;var n=r.count||0;$("dashlink").innerHTML="Dashboard"+(n?' <span class="dn">'+n+'</span>':'')}
async function loadExtras(){
 if(!sb||!DATA.length)return;var my=token;
 var r=await sb.from("companion_photos").select("companion_id,path").in("companion_id",DATA.map(function(p){return p.id})).order("created_at");
 if(r.error||my!=token)return;
 var m={},any=false;r.data.forEach(function(x){(m[x.companion_id]=m[x.companion_id]||[]).push(pubUrl(x.path))});
 DATA.forEach(function(p){p.extra=m[p.id]||[];if(p.extra.length)any=true});
 if(any)renderGrid();
}
function showPhotos(id){var p=DATA.filter(function(x){return String(x.id)==id})[0];if(!p)return;
 var l=(p.photo?[p.photo]:[]).concat(p.extra||[]);
 $("pbody").innerHTML='<h2 style="font-size:24px;margin-bottom:12px">'+esc(p.n)+'</h2><div class="pg">'+l.map(function(u){return '<img src="'+esc(u)+'" alt="Photo of '+esc(p.n)+'">'}).join("")+'</div>';
 $("pdlg").showModal()}
$("pclose").onclick=function(){$("pdlg").close()};

/* edit profile + extra photos */
var gal=[];
function listMode(){
 var ed=!!mine;$("ltitle").textContent=ed?"Edit your profile":"List yourself as a companion";$("lsave").textContent=ed?"Save changes":"Create my listing";$("galbox").hidden=!ed;
 if(ed&&mine.photo_path&&!photo){$("pv").src=pubUrl(mine.photo_path);$("pv").hidden=false}
 if(ed)renderGal();
}
async function renderGal(){
 var el=$("gal");if(!mine)return;
 var r=await sb.from("companion_photos").select("id,path").eq("companion_id",mine.id).order("created_at");
 if(r.error){el.innerHTML='<p class="meta">Couldn\'t load your photos.</p>';return}
 gal=r.data;
 el.innerHTML=gal.length?gal.map(function(g){return '<div class="gt"><img src="'+esc(pubUrl(g.path))+'" alt="Your extra photo"><button type="button" data-g="'+esc(g.id)+'" aria-label="Remove photo">\u00d7</button></div>'}).join(""):'<p class="meta" style="grid-column:1/-1">No extra photos yet.</p>';
 $("gadd").disabled=gal.length>=6;
}
$("gadd").onclick=function(){$("gf").click()};
$("gf").onchange=async function(){
 var files=[].slice.call(this.files);this.value="";if(!files.length||!mine)return;
 var room=6-gal.length;if(room<=0){toast("You already have 6 extra photos. Remove one to add another.");return}
 if(files.length>room){toast("Only "+room+" more photo(s) fit. Adding the first "+room+".");files=files.slice(0,room)}
 $("gadd").disabled=true;var fail=0;
 for(var i=0;i<files.length;i++){
  try{
   var b=await blobOf(files[i],1000),p=user.id+"/"+crypto.randomUUID()+".webp";
   var up=await sb.storage.from("profile-photos").upload(p,b,{contentType:"image/webp"});if(up.error)throw up.error;
   var ins=await sb.from("companion_photos").insert({companion_id:mine.id,path:p});
   if(ins.error){await sb.storage.from("profile-photos").remove([p]);throw ins.error}
  }catch(e){fail++;console.error("Saathi: photo upload failed",e)}
 }
 if(fail)toast(fail+" photo(s) couldn't be uploaded. Use JPG or PNG files.");
 renderGal();
};
$("gal").onclick=async function(e){
 var b=e.target.closest("button[data-g]");if(!b||!confirm("Remove this photo?"))return;b.disabled=true;
 var g=gal.filter(function(x){return String(x.id)==b.dataset.g})[0];
 var r=await sb.from("companion_photos").delete().eq("id",b.dataset.g);
 if(r.error){toast("Couldn't remove the photo. "+r.error.message);b.disabled=false;return}
 if(g)sb.storage.from("profile-photos").remove([g.path]);
 renderGal();
};

/* booking dashboard for companions */
function dayKey(s){return new Date(s).toDateString()}
function tm(s){return new Date(s).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
function dcard(b,kind,live){
 var act=ACTS[KEYS.indexOf(b.activity)]||b.activity,id=esc(b.id),c=0;
 var h='<div class="bk"><h3>'+esc(act)+'</h3><p class="meta">'+new Date(b.starts_at).toLocaleString()+' \u00b7 '+esc(b.venue)+'<br>'+(b.mode=="day"?'Full day':b.hours+' hour(s)')+' \u00b7 '+inr(b.amount_paise/100)+'</p>';
 if(kind=="req"){
  var o=live.filter(function(x){return x.id!=b.id&&dayKey(x.starts_at)==dayKey(b.starts_at)});
  var acc=o.filter(function(x){return x.status=="accepted"}),pen=o.filter(function(x){return x.status=="requested"});
  if(acc.length){c=1;h+='<div class="warn"><b>Same day:</b> you already accepted another booking this day, at '+tm(acc[0].starts_at)+'. You can decline this one.</div>'}
  else if(pen.length){c=1;h+='<div class="warn"><b>Same day:</b> you have '+pen.length+' other request(s) for this day. Accept the one you want and decline the rest.</div>'}
  h+='<button class="btn" data-b="'+id+'" data-s="accepted" data-f="requested" data-c="'+c+'">Accept</button><button class="btn alt" data-b="'+id+'" data-s="declined" data-f="requested">Decline</button>';
 }else if(kind=="up"){
  h+='<p><span class="pill">Accepted</span> <span class="meta">Payment is not live yet.</span></p><button class="btn alt" data-b="'+id+'" data-s="cancelled" data-f="accepted">Cancel booking</button>';
 }else{
  h+='<p><span class="pill">'+esc(b.status=="requested"?"expired":b.status)+'</span></p>';
 }
 return h+'</div>';
}
async function loadDash(){
 var el=$("dash");
 if(!mine){el.innerHTML='<div class="empty">Create your listing to start receiving requests. <a href="#/list" style="color:var(--accent2);font-weight:700">Create a listing</a></div>';return}
 el.innerHTML='<p class="meta">Loading...</p>';
 var r=await sb.from("bookings").select("*").eq("companion_id",mine.id).order("starts_at",{ascending:true});
 if(r.error){el.innerHTML='<p class="meta">Couldn\'t load your bookings.</p>';return}
 var now=Date.now(),all=r.data;
 var live=all.filter(function(b){return(b.status=="requested"||b.status=="accepted")&&new Date(b.starts_at)>now-43200000});
 var req=all.filter(function(b){return b.status=="requested"&&new Date(b.starts_at)>now});
 var up=all.filter(function(b){return b.status=="accepted"&&new Date(b.starts_at)>now-43200000});
 var past=all.filter(function(b){return req.indexOf(b)<0&&up.indexOf(b)<0}).reverse();
 function sec(t,l,k,e){return '<div class="dsec"><h3>'+t+' ('+l.length+')</h3>'+(l.length?l.map(function(b){return dcard(b,k,live)}).join(""):'<p class="meta">'+e+'</p>')+'</div>'}
 el.innerHTML=sec("New requests",req,"req","No pending requests.")+sec("Upcoming",up,"up","Nothing accepted yet.")+sec("Past and closed",past,"past","Nothing here yet.");
 refreshBadge();
}
$("dref").onclick=function(){loadDash()};
$("dash").onclick=async function(e){
 var b=e.target.closest("button[data-b]");if(!b||!mine)return;var s=b.dataset.s;
 if(s=="declined"&&!confirm("Decline this request?"))return;
 if(s=="cancelled"&&!confirm("Cancel this accepted booking? Only do this if you truly can't make it."))return;
 if(s=="accepted"&&b.dataset.c=="1"&&!confirm("You already have another booking on this day. Accept this one too?"))return;
 b.disabled=true;
 var r=await sb.from("bookings").update({status:s}).eq("id",b.dataset.b).eq("companion_id",mine.id).eq("status",b.dataset.f).select("id");
 if(r.error)toast("Couldn't update. "+r.error.message);
 else if(!r.data||!r.data.length)toast("This booking changed in the meantime. Refreshed your list.");
 else toast(s=="accepted"?"Booking accepted.":s=="declined"?"Request declined.":"Booking cancelled.");
 loadDash();
};

/* ---------- routing + init ---------- */
function route(){
 var h=location.hash,v=h=="#/list"?"list":h=="#/verify"?"verify":h=="#/login"?"login":h=="#/bookings"?"bookings":h=="#/dashboard"?"dashboard":"home";
 if((v=="list"||v=="verify"||v=="bookings"||v=="dashboard")&&!user){nextHash=h;$("lgmsg").textContent="Log in to continue where you left off.";location.hash="#/login";return}
 var pv=document.body.dataset.view;document.body.dataset.view=v;window.scrollTo(0,0);
 if(user)persist();
 if(v=="verify"&&pv!="verify")startVerify();
 if(v=="bookings")loadBookings();
 if(v=="dashboard")loadDash();
 if(v=="list"){renderStatus();if(prefs.draft)fillForm(prefs.draft);else formFromListing();listMode()}
}
window.addEventListener("hashchange",route);
ui();renderChips();
if(!configured){$("cfg").hidden=false;route();renderOnline();renderGrid()}
else{
 sb.auth.onAuthStateChange(function(ev,session){var u=session&&session.user||null;if((u&&u.id)!=(user&&user.id))setTimeout(function(){setUser(u)},0)});
 sb.auth.getSession().then(function(r){var u=r.data.session&&r.data.session.user||null;if((u&&u.id)!=(user&&user.id))setUser(u);else{route();load()}}).catch(function(e){console.error("Saathi: session check failed",e);route();load()});
 setTimeout(function(){if(!document.body.dataset.view){console.warn("Saathi: sign-in is slow, showing the page anyway");route();load()}},5000);
}