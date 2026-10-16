var $=function(id){return document.getElementById(id)};
var ACTS=["Garba / dandiya partner","Event plus-one","Coffee or dinner","Movie buddy","Wedding guest","Festival walk"];
var KEYS=["garba","plus_one","coffee_dinner","movie","wedding","festival_walk"];
var CITY={Pune:[18.5204,73.8567],Mumbai:[19.076,72.8777],Ahmedabad:[23.0225,72.5714],Vadodara:[22.3072,73.1812],Surat:[21.1702,72.8311]};
var PHS=["linear-gradient(135deg,#ec1d6b,#ff5a2e)","linear-gradient(135deg,#7c3aed,#ec1d6b)","linear-gradient(135deg,#ff5a2e,#ffb347)"];
var configured=SUPABASE_URL.indexOf("YOUR-PROJECT")<0&&SUPABASE_ANON_KEY.indexOf("YOUR-ANON")<0;
var sb=configured?supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{flowType:"pkce"}}):null;
var isRev=false,user=null,mine=null,DATA=[],active=-1,loc=null,myLoc=null,photo=null,prefs={},nextHash="",token=0,presT=null,saveT=null,vs={},HIDDEN=[],NAMES={},PAGE=24,shown=24,stateLoaded=false,authId,rs={};
var PAID=false; /* prices and payments stay hidden until this is true */
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function inr(n){return "₹"+Number(n).toLocaleString("en-IN")}
function pubUrl(p){return sb.storage.from("profile-photos").getPublicUrl(p).data.publicUrl}
function toast(t){var x=$("toast");x.textContent=t;x.style.display="block";clearTimeout(x._t);x._t=setTimeout(function(){x.style.display="none"},4000)}
function getLoc(cb){if(!navigator.geolocation){toast("This browser can't share location. Pick your city instead.");return}
 navigator.geolocation.getCurrentPosition(function(p){cb(p.coords.latitude,p.coords.longitude)},function(){toast("Location is blocked. Allow it in your browser, or pick your city.")},{timeout:9000})}
function bmp(f){return createImageBitmap(f,{imageOrientation:"from-image"}).catch(function(){return createImageBitmap(f)})}
function blobOf(file,maxW){return bmp(file).then(function(b){var w=Math.min(maxW,b.width),h=Math.round(b.height*w/b.width),c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(b,0,0,w,h);if(b.close)b.close();return new Promise(function(res,rej){c.toBlob(function(x){if(x&&x.type=="image/webp")return res(x);c.toBlob(function(y){y?res(y):rej(new Error("Couldn't process that image"))},"image/jpeg",0.85)},"image/webp",0.82)})})}
function extOf(b){return b.type=="image/webp"?"webp":"jpg"}
function loadImg(f,cb){var fr=new FileReader();fr.onload=function(){var im=new Image();im.onload=function(){cb(im)};im.onerror=function(){cb(null)};im.src=fr.result};fr.readAsDataURL(f)}
async function nameFor(ids){var need=ids.filter(function(i,ix,a){return i&&!NAMES[i]&&a.indexOf(i)==ix});if(!need.length||!sb)return;var r=await sb.from("public_companions").select("id,name").in("id",need);(r.data||[]).forEach(function(x){NAMES[x.id]=x.name})}
async function loadHidden(){HIDDEN=[];if(!user||!sb)return;var r=await sb.rpc("hidden_companions");HIDDEN=r.error?[]:(r.data||[])}

/* ---------- data ---------- */
function norm(r){return{id:r.id,n:r.name,a:r.age,g:r.gender,c:r.city,acts:(r.activities||[]).map(function(k){return KEYS.indexOf(k)}).filter(function(i){return i>-1}),hr:r.rate_hour||0,day:r.rate_day||0,rt:Number(r.rating)||0,b:r.bio||"",photo:r.photo_path?sb.storage.from("profile-photos").getPublicUrl(r.photo_path).data.publicUrl:"",online:!!r.online,out:r.available_out!==false,d:r.distance_km,extra:[]}}
async function load(){
 if(!sb){renderOnline();renderGrid();return}
 if(loc&&!user){loc=null;ui()}
 var my=++token,g=$("gender").value||null,a=active>-1?KEYS[active]:null,res;
 try{
  if(loc){var r=await sb.rpc("nearby_companions",{p_lat:loc.lat,p_lng:loc.lng,p_radius_km:+$("rad").value,p_gender:g,p_activity:a}).limit(200);if(r.error)throw r.error;res=r.data}
  else{var q=sb.from("public_companions").select("*").eq("city",$("city").value);if(g)q=q.eq("gender",g);if(a)q=q.contains("activities",[a]);var r2=await q.limit(200);if(r2.error)throw r2.error;res=r2.data}
 }catch(e){if(my==token)toast("Couldn't load companions. "+(e.message||""));return}
 if(my!=token)return;
 var s=$("sort").value,pr=function(p){return p.day||p.hr*8};
 DATA=res.filter(function(r){return HIDDEN.indexOf(r.id)<0}).map(norm);shown=PAGE;DATA.forEach(function(p){NAMES[p.id]=p.n});DATA.sort(function(a,b){return s=="n"&&loc?a.d-b.d:s=="p"?pr(a)-pr(b):b.rt-a.rt});
 renderOnline();renderGrid();loadExtras();
}
function ph(p,cls){var nm=esc(p.n);return p.photo?'<img class="'+cls+'" src="'+esc(p.photo)+'" alt="'+(cls=="ph"?'Photo of '+nm:'')+'">':'<div class="'+cls+'" style="background:'+PHS[String(p.id).charCodeAt(0)%3]+'">'+esc(p.n[0].toUpperCase())+'</div>'}
function where(p){return loc&&p.d!=null?(p.d<2?'Within 2 km':'Within '+Math.ceil(p.d/5)*5+' km'):esc(p.c)}
function renderOnline(){
 var l=DATA.filter(function(p){return p.online});$("oc").textContent=l.length+" online";
 $("orow").innerHTML=l.length?l.map(function(p){return '<button class="oc" type="button" data-id="'+esc(p.id)+'"><span class="avw">'+ph(p,"oav")+'<i class="dotg"></i></span><b>'+esc(p.n)+'</b><span class="meta">'+where(p)+'</span></button>'}).join(""):'<div class="empty" style="width:100%">Nobody is online in this view right now.</div>';
}
function renderGrid(){
 var all=DATA.filter(function(p){return p.out}),l=all.slice(0,shown),el=$("grid");$("gc").textContent=all.length+" available";$("more").hidden=all.length<=shown;$("more").textContent="Show more ("+Math.max(0,all.length-shown)+" more)";
 if(!l.length){el.innerHTML='<div class="empty" style="grid-column:1/-1">'+(configured?(loc?'No one nearby yet. Widen the distance, or list yourself.':'No companions in this city yet. Try another city or activity, or list yourself.'):'Add your Supabase URL and anon key to see companions.')+'</div>';return}
 el.innerHTML=l.map(function(p){
  var price=!PAID?'':(p.day?'<b>'+inr(p.day)+'</b> /day':'')+(p.day&&p.hr?'<br>':'')+(p.hr?(p.day?'<span class="meta">':'<b>')+inr(p.hr)+(p.day?'</span>':'</b>')+' /hr':'');
  return '<article class="card">'+media(p)+'<div class="bd"><div><h3>'+esc(p.n)+', '+esc(p.a)+'</h3><div class="meta">'+where(p)+(p.rt?' · ★ '+p.rt.toFixed(1):' · New')+'</div></div>'
  +'<div class="ver">ID verified</div>'+(p.online?'<div class="onl">● Online now</div>':'')
  +'<div class="acts">'+p.acts.map(function(i){return '<span>'+esc(ACTS[i])+'</span>'}).join("")+'</div>'
  +'<div class="meta">'+esc(p.b)+'</div>'+(p.extra&&p.extra.length?'<button class="more" type="button" data-ph="'+esc(p.id)+'">See all photos ('+(p.extra.length+(p.photo?1:0))+')</button>':'')
  +'<div class="price"><span>'+price+'</span><div class="pbtns"><button class="btn alt" data-msg="'+esc(p.id)+'">Message</button><button class="btn" data-id="'+esc(p.id)+'">Meet</button></div></div></div></article>'}).join("");
}
$("more").onclick=function(){shown+=PAGE;renderGrid()};
$("grid").onclick=$("orow").onclick=function(e){var g=e.target.closest("button[data-ph]");if(g){showPhotos(g.dataset.ph);return}var mg=e.target.closest("button[data-msg]");if(mg){openMsg(mg.dataset.msg);return}var b=e.target.closest("button[data-id]");if(b)openBook(b.dataset.id)};

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
$("loc").onclick=function(){if(loc){loc=null;ui();load();return}if(!user){needLogin("Log in to search near you. You can still browse by city without logging in.");return}getLoc(function(a,b){loc={lat:a,lng:b};ui();load()})};
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
 if(!user||!sb||!stateLoaded)return;
 prefs.city=$("city").value;prefs.gender=$("gender").value;prefs.rad=$("rad").value;prefs.sort=$("sort").value;prefs.active=active;
 if(location.hash!="#/login")prefs.hash=location.hash;
 clearTimeout(saveT);saveT=setTimeout(function(){var d=prefs.draft||{},p=Object.assign({},prefs);delete p.draft;
  sb.from("user_state").upsert({user_id:user.id,prefs:p,draft:d,updated_at:new Date().toISOString()})},800);
}
function applyPrefs(){["city","gender","rad","sort"].forEach(function(k){if(prefs[k]!=null)$(k).value=prefs[k]});
 active=typeof prefs.active=="number"?prefs.active:-1;if($("sort").value=="n"&&!loc)$("sort").value="r";setSeg();renderChips()}
async function loadMine(){var r=await sb.from("companions").select("*").eq("user_id",user.id).maybeSingle();if(r.error)throw r.error;mine=r.data||null;renderStatus();updateNav();refreshBadge()}
function ping(){if(user&&document.visibilityState=="visible"){if(isRev)adminBadge();if(mine&&mine.status!="verified")loadMine().catch(function(){});if(prefs.showOnline!==false)sb.rpc("touch_presence");refreshBadge()}}
async function setUser(u){
 user=u;isRev=false;stateLoaded=false;HIDDEN=[];renderAcct();clearInterval(presT);mine=null;prefs={};updateNav();notifStop();
 if(u){try{
  try{var nx=sessionStorage.getItem("saathi_next");if(nx){nextHash=nx;sessionStorage.removeItem("saathi_next")}}catch(e){}
  await loadMine();await checkReviewer();
  var st=await sb.from("user_state").select("prefs,draft").eq("user_id",u.id).maybeSingle();
  if(st.error)throw st.error;await loadHidden();if(!user||user.id!=u.id)return;prefs=(st.data&&st.data.prefs)||{};stateLoaded=true;prefs.draft=(st.data&&st.data.draft&&Object.keys(st.data.draft).length)?st.data.draft:null;
  applyPrefs();presT=setInterval(ping,120000);ping();notifStart();
  var fromLogin=location.hash=="#/login";
  if(nextHash){var go=nextHash;nextHash="";location.hash=go}
  else if(fromLogin||!location.hash){location.hash=prefs.hash&&prefs.hash!="#/login"?prefs.hash:"#/"}
  if(fromLogin)toast("Welcome back. Picking up where you left off.");
 }catch(e){console.error("Saathiyaa: sign-in setup failed",e);toast("Signed in, but couldn't load your saved data. Check the browser console.")}}
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
 var m={pending:"Not verified yet. Verify your ID to go live.",review:"Your ID is under review. You'll go live once approved.",verified:"Verified and live on Saathiyaa.",rejected:"Your verification was rejected. Update your details and verify again.",suspended:"This listing is suspended. Contact support."};
 el.innerHTML='<div class="note" style="margin:0 0 24px"><b>Your listing: '+esc(mine.status)+'</b><br>'+m[mine.status]+(mine.status=="pending"||mine.status=="rejected"?' <a href="#/verify" style="color:var(--accent2);font-weight:700">Verify ID</a>':'')+'<span id="rnote"></span></div>';
 if(mine.status=="rejected")rejectNote();
}
async function rejectNote(){var u=user&&user.id;var r=await sb.from("kyc_submissions").select("review_note").eq("user_id",u).eq("status","rejected").order("created_at",{ascending:false}).limit(1);var n=r.data&&r.data[0]&&r.data[0].review_note,el=$("rnote");if(n&&el&&user&&user.id==u)el.innerHTML='<br>Reviewer note: '+esc(n)}
function formFromListing(){if(!mine)return;fillForm({n:mine.name,a:mine.age,g:mine.gender,c:mine.city,rd:mine.rate_day||"",r:mine.rate_hour||"",b:mine.bio||"",out:mine.available_out,acts:(mine.activities||[]).map(function(k){return KEYS.indexOf(k)})})}
$("pf").onchange=async function(){var f=this.files[0];if(!f)return;try{photo=await blobOf(f,800);$("pv").src=URL.createObjectURL(photo);$("pv").hidden=false}catch(e){toast("That file isn't a readable image. Use a JPG or PNG.")}};
$("myloc").onclick=function(){getLoc(function(a,b){myLoc={lat:Math.round(a*100)/100,lng:Math.round(b*100)/100};$("mylocmsg").textContent="Location set to your area. Customers only see distance."})};
$("ratebox").hidden=!PAID;
$("form").onsubmit=async function(e){
 e.preventDefault();if(!sb||!user)return;
 var age=+$("a").value,hr=+$("r").value||null,day=+$("rd").value||null;
 if(age<18){toast("You must be 18 or older to list yourself.");return}
 if(!photo&&!(mine&&mine.photo_path)){toast("Add a clear photo of yourself.");return}
 if(PAID&&!hr&&!day){toast("Set a day rate, an hourly rate, or both.");return}
 var sel=[].slice.call(ac.querySelectorAll("input:checked")).map(function(x){return KEYS[+x.value]});
 if(!sel.length){toast("Pick at least one activity you offer.");return}
 var btn=e.submitter;if(btn)btn.disabled=true;
 try{
  var path=mine&&mine.photo_path,oldPath=path;
  if(photo){path=user.id+"/"+crypto.randomUUID()+"."+extOf(photo);var up=await sb.storage.from("profile-photos").upload(path,photo,{contentType:photo.type});if(up.error)throw up.error}
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

$("showon").onchange=function(){prefs.showOnline=this.checked;persist();if(typeof presStop=="function"){presStop();presInit();P.t=setInterval(presInit,180000)}if(!mine)return;if(this.checked)ping();else sb.from("companions").update({last_seen:null}).eq("id",mine.id).then(function(){load()})};

/* ---------- booking ---------- */
function openBook(id){
 if(!user){needLogin("Log in to send a meet request.");return}
 var p=DATA.filter(function(x){return String(x.id)==id})[0];if(!p)return;
 if(mine&&mine.id==p.id){toast("That's your own listing.");return}
 if(!p.acts.length){toast(p.n+" hasn't chosen any activities yet.");return}
 var d=$("dlg"),f=$("bk"),m=[];
 m.push('<option value="hour">A few hours</option>');m.push('<option value="day">Full day (up to 10 hours)</option>');
 f.innerHTML='<h2 style="font-size:24px">Request to meet '+esc(p.n)+'</h2>'
 +'<label for="ba">Activity</label><select id="ba">'+p.acts.map(function(i){return '<option>'+esc(ACTS[i])+'</option>'}).join("")+'</select>'
 +'<label for="bm">How long</label><select id="bm">'+m.join("")+'</select>'
 +'<label for="bd">Start date and time</label><input id="bd" type="datetime-local" required>'
 +'<div id="hw"><label for="bh">Hours</label><select id="bh"><option>1</option><option>2</option><option selected>3</option><option>4</option><option>5</option><option>6</option></select></div>'
 +'<label for="bv">Public venue</label><input id="bv" required minlength="3" placeholder="e.g. Koregaon Park garba ground" maxlength="80">'
 +'<label class="chk"><input type="checkbox" id="bpub" required> This is a public place, not a home, hotel or private room</label>'
 +'<p class="meta" id="bt"></p><p class="note">'+esc(p.n)+' can accept or decline. No payment is involved, and nobody should ask you for money. Meet only in a public place.</p>'
 +'<div style="display:flex;gap:10px;margin-top:14px"><button class="btn" type="submit" value="ok">Send request</button><button class="btn alt" value="x" formnovalidate>Cancel</button></div>';
 var mn=new Date(Date.now()+36e5);$("bd").min=new Date(mn-mn.getTimezoneOffset()*6e4).toISOString().slice(0,16);
 var upd=function(){var day=$("bm").value=="day";$("hw").style.display=day?"none":"block";$("bt").textContent=""};
 $("bm").onchange=upd;$("bh").onchange=upd;upd();
 f.onsubmit=async function(e){
  e.preventDefault();if(!e.submitter||e.submitter.value!="ok"){d.close();return}
  var t=new Date($("bd").value);if(isNaN(t)||t.getTime()<Date.now()+30*60000){toast("Pick a start time at least 30 minutes from now.");return}
  var mode=$("bm").value,sbn=e.submitter;sbn.disabled=true;
  try{
   var r=await sb.from("bookings").insert({companion_id:p.id,activity:KEYS[ACTS.indexOf($("ba").value)],mode:mode,starts_at:t.toISOString(),hours:mode=="hour"?+$("bh").value:null,venue:$("bv").value.trim()});
   if(r.error){toast("Couldn't send the request. "+r.error.message);return}
   d.close();toast("Meet request sent to "+p.n+". You'll see their answer under My meets.");
  }catch(err){toast("Couldn't send the request. "+(err.message||"Try again."))}
  finally{sbn.disabled=false}
 };
 d.showModal();
}
async function loadBookings(){
 var el=$("bklist");el.innerHTML='<p class="meta">Loading...</p>';
 var r=await sb.from("bookings").select("*").eq("customer_id",user.id).order("created_at",{ascending:false});
 if(r.error){el.innerHTML='<p class="meta">Couldn\'t load bookings.</p>';return}
 await nameFor(r.data.map(function(b){return b.companion_id}));
 var note=mine?'<p class="meta" style="max-width:56ch">Requests that people send you are in your <a href="#/dashboard" style="color:var(--accent2);font-weight:700">Dashboard</a>.</p>':'';
 el.innerHTML=note+(r.data.length?r.data.map(function(b){
  var act=ACTS[KEYS.indexOf(b.activity)]||b.activity,nm=NAMES[b.companion_id]||'a companion',when=new Date(b.starts_at).toLocaleString();
  var btns=(b.status=="requested"||b.status=="accepted")?'<button class="btn alt" data-b="'+esc(b.id)+'" data-s="cancelled">Cancel request</button>':'';
  var share="I'm meeting "+nm+" for "+act+" at "+b.venue+" on "+when+". Arranged on Saathiyaa.";
  return '<div class="bk"><h3>Your request to meet '+esc(nm)+'</h3><p class="meta">'+esc(act)+' \u00b7 '+when+' \u00b7 '+esc(b.venue)+'<br>'+(b.mode=="day"?'Full day':b.hours+' hour(s)')+(PAID?' \u00b7 '+inr(b.amount_paise/100)+' + '+inr(b.fee_paise/100)+' fee':'')+'</p><p><b>Status: '+esc(b.status)+'</b>'+'</p>'+btns+(b.status=="accepted"?'<button class="btn" data-chat="'+esc(b.id)+'" data-t="'+esc(act)+'">Chat</button>':'')+(b.status=="requested"||b.status=="accepted"?srow(b,share,b.status=="accepted"):'')+'</div>'}).join(""):'<div class="empty">No meet requests yet.</div>');
}
$("bklist").onclick=async function(e){
 if(safety(e))return;
 var ch=e.target.closest("button[data-chat]");if(ch){gotoBookingChat(ch.dataset.chat);return}
 var b=e.target.closest("button[data-b]");if(!b)return;
 if(!confirm("Cancel this request?"))return;b.disabled=true;
 var r=await sb.from("bookings").update({status:b.dataset.s}).eq("id",b.dataset.b).eq("customer_id",user.id).select("id");
 if(r.error)toast("Couldn't update. "+r.error.message);
 loadBookings()};

/* ---------- safety tools: share, emergency, report/block ---------- */
function srow(b,txt,accepted){return '<div class="srow">'+(accepted?'<button class="btn alt" type="button" data-sh="'+esc(txt)+'">Share with a friend</button><a class="btn alt" href="tel:112">Emergency: call 112</a>':'')+'<button class="more" type="button" data-report="'+esc(b.id)+'">Report or block</button></div>'}
function safety(e){
 var s=e.target.closest("button[data-sh]");
 if(s){var t=s.dataset.sh;
  if(navigator.share)navigator.share({text:t}).catch(function(){});
  else if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){toast("Copied. Paste it to a friend you trust.")},function(){toast("Couldn't copy the details.")});
  else toast("Sharing isn't supported on this browser.");
  return true}
 var r=e.target.closest("button[data-report]");if(r){openReport(r.dataset.report);return true}
 return false}
function openReport(id,conv){rs={id:id,conv:!!conv};$("rwhy").value="";$("rblock").checked=true;$("rerr").textContent="";$("rdlg").showModal()}
$("rform").onsubmit=async function(e){
 e.preventDefault();var sub=e.submitter;if(!sub||sub.value!="ok"){$("rdlg").close();return}
 sub.disabled=true;var blk=$("rblock").checked;
 var r=rs.conv?await sb.rpc("report_conversation",{p_conv:rs.id,p_reason:$("rwhy").value,p_block:blk}):await sb.rpc("report_booking",{p_booking:rs.id,p_reason:$("rwhy").value,p_block:blk});
 sub.disabled=false;
 if(r.error){$("rerr").textContent=r.error.message;return}
 $("rdlg").close();if($("cdlg").open)$("cdlg").close();
 toast("Thanks. Our team will review your report."+(blk?" This person can no longer contact you.":""));
 await loadHidden();var v=document.body.dataset.view;if(v=="dashboard")loadDash();else if(v=="bookings")loadBookings();else if(v=="chats"){location.hash="#/chats";chatsRefresh(true)}else load()};
$("rdlg").addEventListener("click",function(e){if(e.target==this)this.close()});

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
 say("Hi "+mine.name+". I'll collect your age, ID and a selfie, which takes about three minutes. A human reviewer checks everything before you go live. By continuing you agree that Saathiyaa may use your ID and selfie only to verify you, as described in the Privacy Policy.");
 choices(["I agree and start"],s1)
}
function s1(){say("First, your date of birth. You must be 18 or older.");
 ask('<input type="date" required aria-label="Date of birth">',function(v){var a=age(v.value);if(isNaN(a))return;say(v.value,"me");$("reply").innerHTML="";
  if(a<18){say("Saathiyaa is for people 18 and over, so I can't continue.");done();return}
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
  loadImg(f,function(im){if(!im||im.width<600||im.height<400){say("That photo is too small, or isn't an image. Retake it closer, in good light, as a JPG or PNG.");s4();return}
   vs.idFile=f;say("Got it. A reviewer will check it. Next, a selfie.");s5()})})}
function s5(){say("Last step. Take a selfie facing the camera in good light, without sunglasses or filters.");
 ask('<input type="file" accept="image/*" capture="user" required aria-label="Selfie">',function(v){var f=v.files[0];if(!f)return;$("reply").innerHTML="";say("Selfie selected.","me");
  loadImg(f,function(im){if(!im||im.width<300){say("That photo is too small, or isn't an image. Try again in better light.");s5();return}vs.selfieFile=f;finish()})})}
async function finish(){
 say("Uploading your documents securely...");
 try{
  var ib=await blobOf(vs.idFile,1600),sb2=await blobOf(vs.selfieFile,1600),ip=user.id+"/id-"+crypto.randomUUID()+"."+extOf(ib),sp=user.id+"/selfie-"+crypto.randomUUID()+"."+extOf(sb2);
  var u1=await sb.storage.from("kyc-private").upload(ip,ib,{contentType:ib.type});if(u1.error)throw u1.error;
  var u2=await sb.storage.from("kyc-private").upload(sp,sb2,{contentType:sb2.type});if(u2.error)throw u2.error;
  var k=await sb.from("kyc_submissions").insert({user_id:user.id,id_type:vs.id,dob:vs.dob,id_image_path:ip,selfie_path:sp});if(k.error)throw k.error;
  vs={};await loadMine();
  say("You're submitted. A human reviewer checks every application, usually within 24 hours, and your listing goes live once approved.");done();
 }catch(e){say("Something went wrong: "+(e.message||"upload failed")+".");choices(["Try again"],function(){finish()})}
}

/* ---------- nav, photos, dashboard ---------- */
function updateNav(){$("adminlink").hidden=!isRev;var has=!!(user&&mine);$("verlink").hidden=!(has&&mine.status!="verified");$("dashlink").hidden=!has;$("listlink").textContent=has?"My profile":"Become a companion";if(!has)$("dashlink").textContent="Dashboard"}
async function refreshBadge(){if(!sb||!mine)return;var r=await sb.from("bookings").select("id",{count:"exact",head:true}).eq("companion_id",mine.id).eq("status","requested");if(r.error)return;var n=r.count||0;$("dashlink").innerHTML="Dashboard"+(n?' <span class="dn">'+n+'</span>':'')}
async function loadExtras(){
 if(!sb||!DATA.length)return;var my=token;
 var r=await sb.from("companion_photos").select("companion_id,path").in("companion_id",DATA.map(function(p){return p.id})).order("created_at");
 if(r.error||my!=token)return;
 var sig=function(){return DATA.map(function(p){return (p.extra||[]).join("|")}).join(",")},before=sig(),m={};
 r.data.forEach(function(x){(m[x.companion_id]=m[x.companion_id]||[]).push(pubUrl(x.path))});
 DATA.forEach(function(p){p.extra=m[p.id]||[]});
 if(sig()!=before)renderGrid();
}
function showPhotos(id){var p=DATA.filter(function(x){return String(x.id)==id})[0];if(!p)return;
 var l=(p.photo?[p.photo]:[]).concat(p.extra||[]);
 $("pbody").innerHTML='<h2 style="font-size:24px;margin-bottom:12px">'+esc(p.n)+'</h2>'+(car(l,p.n,"gi")||(l[0]?'<img class="gi" src="'+esc(l[0])+'" alt="Photo of '+esc(p.n)+'">':'<p class="meta">No photos yet.</p>'));
 $("pdlg").showModal()}
$("pclose").onclick=function(){$("pdlg").close()};

/* edit profile + extra photos */
var gal=[];
function listMode(){
 var ed=!!mine;$("ltitle").textContent=ed?"Edit your profile":"List yourself as a companion";$("lsave").textContent=ed?"Save changes":"Create my listing";$("galbox").hidden=!ed;var lk=ed&&mine.status=="verified";["pf","n","g"].forEach(function(k){$(k).disabled=lk});$("lockmsg").hidden=!lk;$("showwrap").hidden=!ed;$("showon").checked=prefs.showOnline!==false;
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
   var b=await blobOf(files[i],1000),p=user.id+"/"+crypto.randomUUID()+"."+extOf(b);
   var up=await sb.storage.from("profile-photos").upload(p,b,{contentType:b.type});if(up.error)throw up.error;
   var ins=await sb.from("companion_photos").insert({companion_id:mine.id,path:p});
   if(ins.error){await sb.storage.from("profile-photos").remove([p]);throw ins.error}
  }catch(e){fail++;console.error("Saathiyaa: photo upload failed",e)}
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
 var act=ACTS[KEYS.indexOf(b.activity)]||b.activity,id=esc(b.id),c=0,when=new Date(b.starts_at).toLocaleString();
 var h='<div class="bk"><h3>'+esc(act)+'</h3><p class="meta">'+when+' \u00b7 '+esc(b.venue)+'<br>'+(b.mode=="day"?'Full day':b.hours+' hour(s)')+(PAID?' \u00b7 '+inr(b.amount_paise/100):'')+'</p>';
 if(kind=="req"||kind=="up")h+='<p class="meta" data-cust="'+id+'">Checking who requested...</p>';
 if(kind=="req"){
  var o=live.filter(function(x){return x.id!=b.id&&dayKey(x.starts_at)==dayKey(b.starts_at)});
  var acc=o.filter(function(x){return x.status=="accepted"}),pen=o.filter(function(x){return x.status=="requested"});
  if(acc.length){c=1;h+='<div class="warn"><b>Same day:</b> you already accepted another meet this day, at '+tm(acc[0].starts_at)+'. You can reject this one.</div>'}
  else if(pen.length){c=1;h+='<div class="warn"><b>Same day:</b> you have '+pen.length+' other request(s) for this day. Accept the one you want and reject the rest.</div>'}
  h+='<p class="meta">Only accept if you are comfortable. Meet only in a public place.</p><button class="btn" data-b="'+id+'" data-s="accepted" data-f="requested" data-c="'+c+'">Accept</button><button class="btn alt" data-b="'+id+'" data-s="declined" data-f="requested">Reject</button>'+srow(b,"",false);
 }else if(kind=="up"){
  h+='<p><span class="pill">Accepted</span></p><button class="btn" data-chat="'+id+'" data-t="'+esc(act)+'">Chat</button><button class="btn alt" data-b="'+id+'" data-s="cancelled" data-f="accepted">Cancel meet</button>'+srow(b,"I'm meeting a Saathiyaa customer for "+act+" at "+b.venue+" on "+when+". Arranged on Saathiyaa.",true);
 }else{
  h+='<p><span class="pill">'+esc(b.status=="requested"?"expired":b.status)+'</span></p>';
 }
 return h+'</div>';
}
function fillCust(list){list.forEach(function(b){sb.rpc("booking_customer",{p_booking:b.id}).then(function(r){
 var el=document.querySelector('[data-cust="'+b.id+'"]');if(!el)return;var x=r.data&&r.data[0];
 el.textContent=x?"Requested by "+x.first_name+" \u00b7 member since "+new Date(x.member_since).toLocaleDateString([],{month:"short",year:"numeric"})+" \u00b7 signed in with Google, ID not verified":"Customer details unavailable."})})}
async function loadDash(){
 var el=$("dash");
 if(!mine){el.innerHTML='<div class="empty">Create your listing to start receiving requests. <a href="#/list" style="color:var(--accent2);font-weight:700">Create a listing</a></div>';return}
 el.innerHTML='<p class="meta">Loading...</p>';
 var r=await sb.from("bookings").select("*").eq("companion_id",mine.id).order("starts_at",{ascending:true});
 if(r.error){el.innerHTML='<p class="meta">Couldn\'t load your meet requests.</p>';return}
 var now=Date.now(),all=r.data;
 var live=all.filter(function(b){return(b.status=="requested"||b.status=="accepted")&&new Date(b.starts_at)>now-43200000});
 var req=all.filter(function(b){return b.status=="requested"&&new Date(b.starts_at)>now});
 var up=all.filter(function(b){return b.status=="accepted"&&new Date(b.starts_at)>now-43200000});
 var past=all.filter(function(b){return req.indexOf(b)<0&&up.indexOf(b)<0}).reverse();
 function sec(t,l,k,e){return '<div class="dsec"><h3>'+t+' ('+l.length+')</h3>'+(l.length?l.map(function(b){return dcard(b,k,live)}).join(""):'<p class="meta">'+e+'</p>')+'</div>'}
 el.innerHTML=sec("New requests",req,"req","No pending requests.")+sec("Upcoming",up,"up","Nothing accepted yet.")+sec("Past and closed",past,"past","Nothing here yet.");
 fillCust(req.concat(up));refreshBadge();
}
$("dref").onclick=function(){loadDash()};
$("dash").onclick=async function(e){
 if(safety(e))return;
 var ch=e.target.closest("button[data-chat]");if(ch){gotoBookingChat(ch.dataset.chat);return}
 var b=e.target.closest("button[data-b]");if(!b||!mine)return;var s=b.dataset.s;
 if(s=="declined"&&!confirm("Reject this request?"))return;
 if(s=="cancelled"&&!confirm("Cancel this accepted meet? Only do this if you truly can't make it."))return;
 if(s=="accepted"&&b.dataset.c=="1"&&!confirm("You already have another meet on this day. Accept this one too?"))return;
 b.disabled=true;
 var r=await sb.from("bookings").update({status:s}).eq("id",b.dataset.b).eq("companion_id",mine.id).eq("status",b.dataset.f).select("id");
 if(r.error)toast("Couldn't update. "+r.error.message);
 else if(!r.data||!r.data.length)toast("This request changed in the meantime. Refreshed your list.");
 else toast(s=="accepted"?"Meet accepted.":s=="declined"?"Request rejected.":"Meet cancelled.");
 loadDash();
};

/* ---------- 24-hour booking chat ---------- */
var cs={},DAY=86400000;
function chatStop(){if(cs.ch)sb.removeChannel(cs.ch);clearInterval(cs.poll);cs={}}
var SIGN={};
function msgBody(m){
 if(!m.image_path)return esc(m.body);
 var u=SIGN[m.image_path];
 return '<img class="cimg" data-p="'+esc(m.image_path)+'"'+(u&&u.exp>Date.now()?' src="'+esc(u.url)+'"':'')+' alt="Photo">';
}
async function signImgs(box){
 var im=[].slice.call(box.querySelectorAll("img.cimg:not([src])"));if(!im.length)return;
 var paths=im.map(function(i){return i.dataset.p}).filter(function(p,ix,arr){return arr.indexOf(p)==ix});
 var r=await sb.storage.from("chat-images").createSignedUrls(paths,3600);
 if(r.error||!r.data)return;
 r.data.forEach(function(x){if(x.signedUrl)SIGN[x.path]={url:x.signedUrl,exp:Date.now()+3300000}});
 im.forEach(function(i){var s=SIGN[i.dataset.p];if(s&&box.contains(i)){i.onload=function(){if(cs.stick)box.scrollTop=box.scrollHeight};i.src=s.url}});
}
function chatDraw(){
 var box=$(cs.pg?"pcbox":"cbox"),near=box.scrollHeight-box.scrollTop-box.clientHeight<80;
 var l=Object.keys(cs.seen).map(function(k){return cs.seen[k]}).filter(function(m){return Date.now()-new Date(m.created_at)<DAY}).sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at)});
 box.innerHTML=l.length?l.map(function(m){return '<div class="msg'+(m.sender_id==user.id?' me':'')+'">'+msgBody(m)+'<small>'+tm(m.created_at)+'</small></div>'}).join(""):'<p class="meta">No messages yet. Say hi and agree on where to meet.</p>';
 cs.stick=near||cs.fresh;if(cs.stick)box.scrollTop=box.scrollHeight;
 signImgs(box);
}
async function chatFetch(){
 if(!cs.id)return;var id=cs.id;
 var r=await sb.from("messages").select("id,sender_id,body,image_path,created_at").eq("conversation_id",id).gt("created_at",new Date(Date.now()-DAY).toISOString()).order("created_at");
 if(cs.id!=id)return;
 var ce=$(cs.pg?"pcerr":"cerr");if(r.error){ce.textContent="Couldn't load messages. "+r.error.message;return}
 ce.textContent="";r.data.forEach(function(m){cs.seen[m.id]=m});chatDraw();
}
async function openChat(id,title,pg){
 if(!user||!sb)return;chatStop();cs={id:id,seen:{},fresh:true,pg:!!pg};nRead("chat:"+id);
 $(pg?"pcbox":"cbox").innerHTML='<p class="meta">Loading...</p>';$(pg?"pcerr":"cerr").textContent="";$(pg?"pcin":"cin").value="";
 if(!pg){$("ctitle").textContent=title?"Chat: "+title:"Chat";$("cdlg").showModal()}
 cs.ch=sb.channel("chat-"+id).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"conversation_id=eq."+id},function(p){if(cs.id==id&&p.new){cs.seen[p.new.id]=p.new;chatDraw()}}).subscribe();
 cs.poll=setInterval(chatFetch,8000);
 await chatFetch();if(cs.id==id)cs.fresh=false;
}
$("cclose").onclick=function(){$("cdlg").close()};
$("creport").onclick=function(){if(cs.id)openReport(cs.id)};
$("cdlg").addEventListener("close",chatStop);
$("cf").onsubmit=async function(e){
 e.preventDefault();var t=$("cin").value.trim();if(!t||!cs.id)return;
 var btn=e.submitter;if(btn)btn.disabled=true;
 var r=await sb.from("messages").insert({conversation_id:cs.id,body:t}).select("id,sender_id,body,created_at").single();
 if(btn)btn.disabled=false;
 if(r.error){$("cerr").textContent="Couldn't send. "+r.error.message;return}
 $("cerr").textContent="";$("cin").value="";cs.seen[r.data.id]=r.data;cs.fresh=true;chatDraw();cs.fresh=false;$("cin").focus();
};

/* ---------- photo carousel (swipe sideways) ---------- */
function car(urls,alt,cls){
 if(urls.length<2)return null;
 return '<div class="car"><div class="trk" tabindex="0" role="group" aria-label="'+esc(alt)+' photos, swipe or scroll sideways">'+urls.map(function(u,i){return '<img class="'+cls+'" src="'+esc(u)+'" alt="'+esc(alt)+' photo '+(i+1)+'"'+(i?' loading="lazy"':'')+' draggable="false">'}).join("")+'</div><span class="dots" aria-hidden="true">'+urls.map(function(_,i){return '<i'+(i?'':' class="on"')+'></i>'}).join("")+'</span><button class="cb prev" type="button" data-d="-1" aria-label="Previous photo">&#8249;</button><button class="cb next" type="button" data-d="1" aria-label="Next photo">&#8250;</button></div>';
}
function media(p){var l=(p.photo?[p.photo]:[]).concat(p.extra||[]);return car(l,p.n,"ph")||ph(p,"ph")}
document.addEventListener("scroll",function(e){var t=e.target;if(!t||!t.classList||!t.classList.contains("trk"))return;
 var d=t.parentNode.querySelectorAll(".dots i"),i=Math.round(t.scrollLeft/(t.clientWidth||1));
 for(var k=0;k<d.length;k++)d[k].classList.toggle("on",k==i)},true);
document.addEventListener("click",function(e){var b=e.target.closest(".cb");if(!b)return;
 var t=b.parentNode.querySelector(".trk");t.scrollBy({left:(+b.dataset.d)*t.clientWidth,behavior:"smooth"})});

/* ---------- notifications: bell, sound, animation ---------- */
var TITLE0=document.title,N={items:[],keys:{},ch:null,poll:null,tick:0,loud:false,sound:true,last:0,ctx:null},ICON={msg:"\u2709",ok:"\u2713",no:"\u2715",req:"+"};
function nKey(){return "saathi_n_"+(user?user.id:"")}
function nSave(){if(!user)return;try{localStorage.setItem(nKey(),JSON.stringify({items:N.items.slice(0,30),keys:Object.keys(N.keys).slice(-300)}))}catch(e){}}
function ago(t){var s=Math.round((Date.now()-t)/1000);return s<60?"just now":s<3600?Math.floor(s/60)+" min ago":s<86400?Math.floor(s/3600)+" h ago":new Date(t).toLocaleDateString()}
function actx(){var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;if(!N.ctx)N.ctx=new C();if(N.ctx.state=="suspended")N.ctx.resume();return N.ctx}
["pointerdown","keydown"].forEach(function(ev){document.addEventListener(ev,function(){actx()},{passive:true})});
function tone(f,t0,dur,vol){var c=N.ctx,o=c.createOscillator(),g=c.createGain();o.type="sine";o.frequency.value=f;
 g.gain.setValueAtTime(0.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
 o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+dur+0.05)}
function chime(kind){
 if(!N.sound||Date.now()-N.last<1200)return;var c=N.ctx;if(!c||c.state!="running")return;N.last=Date.now();
 var t=c.currentTime+0.02;
 if(kind=="ok"){[523.25,659.25,783.99,1046.5].forEach(function(f,i){tone(f,t+i*0.09,0.45,0.12)})}
 else{tone(880,t,0.25,0.14);tone(1174.66,t+0.12,0.35,0.12)}
}
function ring(){
 var b=$("bell"),n=$("bn");b.classList.remove("ring");n.classList.remove("pop");void b.offsetWidth;b.classList.add("ring");n.classList.add("pop");
 if(navigator.vibrate){try{navigator.vibrate([60,40,60])}catch(e){}}
}
function banner(it){var b=$("nbanner");b.innerHTML='<b>'+esc(it.title)+'</b><span>'+esc(it.text)+'</span>';b.dataset.go=it.id;b.className="nbanner show "+it.kind;clearTimeout(b._t);b._t=setTimeout(function(){b.className="nbanner"},5000)}
function nRender(){
 chatBadge();
 var un=N.items.filter(function(i){return !i.read}).length,bn=$("bn");
 bn.textContent=un>9?"9+":un;bn.hidden=!un;
 $("bell").setAttribute("aria-label",un?"Notifications, "+un+" unread":"Notifications");
 document.title=(un?"("+un+") ":"")+TITLE0;
 $("nsound").textContent="Sound: "+(N.sound?"on":"off");
 $("nlist").innerHTML=N.items.length?N.items.map(function(i,ix){return '<button type="button" class="ni'+(i.read?'':' un')+'" data-ix="'+ix+'"><span class="nic '+esc(i.kind)+'">'+ICON[i.kind]+'</span><span class="nt"><b>'+esc(i.title)+'</b><span>'+esc(i.text)+'</span><small>'+ago(i.ts)+'</small></span></button>'}).join(""):'<p class="meta" style="padding:18px;text-align:center">No notifications yet.</p>';
}
function npush(it){
 if(N.keys[it.id])return;N.keys[it.id]=1;
 if(!N.loud){nSave();return}
 it.ts=Date.now();it.read=false;N.items.unshift(it);N.items=N.items.slice(0,30);nSave();nRender();
 chime(it.kind=="ok"?"ok":"msg");ring();banner(it);
}
function nRead(go){N.items.forEach(function(i){if(i.go==go)i.read=true});nSave();nRender()}
function nGo(it){
 if(!it)return;it.read=true;nSave();nRender();closePanel();
 if(it.go.indexOf("chat:")==0){location.hash="#/chats/"+it.go.slice(5);return}
 if(location.hash==it.go)route();else location.hash=it.go;
}
var CSTAT={};
function nMsg(m){
 if(!user||m.sender_id==user.id)return;var k="m:"+m.id;if(N.keys[k])return;
 if(document.body.dataset.view=="chats")chatsRefresh();
 if(cs.id==m.conversation_id&&($("cdlg").open||(cs.pg&&document.body.dataset.view=="chats"))){N.keys[k]=1;if(N.loud)chime("msg");return}
 var st=CSTAT[m.conversation_id],rq=(st===undefined||st=="requested"),t=m.image_path?"Sent you a photo":String(m.body||"");
 npush({id:k,kind:rq?"req":"msg",title:rq?"New chat request":"New message",text:t.length>60?t.slice(0,60)+"\u2026":t,go:"chat:"+m.conversation_id});
}
function nConv(c){
 if(!user||!c||!c.id)return;CSTAT[c.id]=c.status;
 var tgt=!!(mine&&c.companion_id==mine.id),k="c:"+c.id+":"+c.status;if(N.keys[k])return;
 if(!tgt&&c.status=="open"){nameFor([c.companion_id]).then(function(){npush({id:k,kind:"ok",title:"Chat is open",text:(NAMES[c.companion_id]||"They")+" accepted. You can message now.",go:"chat:"+c.id})})}
 else if(!tgt&&c.status=="declined"){nameFor([c.companion_id]).then(function(){npush({id:k,kind:"no",title:"Request declined",text:(NAMES[c.companion_id]||"They")+" didn't accept your chat request.",go:"#/chats"})})}
 else N.keys[k]=1;
 if(N.loud&&document.body.dataset.view=="chats")chatsRefresh();
}
function nBook(b){
 if(!user)return;var k="b:"+b.id+":"+b.status;if(N.keys[k])return;
 var inc=mine&&b.companion_id==mine.id,act=ACTS[KEYS.indexOf(b.activity)]||"your meet",
  when=new Date(b.starts_at).toLocaleString([],{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}),
  who=NAMES[b.companion_id]||"The companion";
 if(inc&&b.status=="requested")npush({id:k,kind:"req",title:"New meet request",text:act+" \u00b7 "+when,go:"#/dashboard"});
 else if(!inc&&b.status=="accepted")npush({id:k,kind:"ok",title:"Meet request accepted!",text:who+" accepted your request \u00b7 "+when,go:"#/bookings"});
 else if(!inc&&b.status=="declined")npush({id:k,kind:"no",title:"Request declined",text:who+" couldn't make "+when,go:"#/bookings"});
 else N.keys[k]=1;
 if(N.loud){var v=document.body.dataset.view;if(v=="dashboard")loadDash();else if(v=="bookings")loadBookings();refreshBadge()}
}
async function nPoll(){
 if(!user||!sb)return;
 try{
  var b=await sb.from("bookings").select("id,companion_id,status,activity,starts_at").order("created_at",{ascending:false}).limit(60);
  if(!b.error){await nameFor(b.data.map(function(x){return x.companion_id}));b.data.slice().reverse().forEach(nBook)}
  var cv=await sb.from("conversations").select("id,customer_id,companion_id,status").order("created_at",{ascending:false}).limit(60);
  if(!cv.error){await nameFor(cv.data.filter(function(c){return !(mine&&c.companion_id==mine.id)}).map(function(c){return c.companion_id}));cv.data.slice().reverse().forEach(nConv)}
  var m=await sb.from("messages").select("id,conversation_id,sender_id,body,image_path,created_at").gt("created_at",new Date(Date.now()-DAY).toISOString()).order("created_at",{ascending:false}).limit(60);
  if(!m.error)m.data.slice().reverse().forEach(nMsg);
 }catch(e){console.warn("Saathiyaa: notification poll failed",e)}
 N.tick++;if(N.tick%3==0&&document.body.dataset.view=="home")loadExtras();
}
async function notifStart(){
 notifStop();if(!sb||!user)return;var me=user.id;
 $("bellw").hidden=false;
 $("chatw").hidden=false;
 var st=null;try{st=JSON.parse(localStorage.getItem(nKey()))}catch(e){}
 N.items=(st&&st.items)||[];N.keys={};((st&&st.keys)||[]).forEach(function(k){N.keys[k]=1});
 try{N.sound=localStorage.getItem("saathi_sound")!="0"}catch(e){}
 N.loud=!!st; /* first time on this device: learn existing items silently */
 nRender();
 await nPoll();if(!user||user.id!=me)return;
 N.loud=true;nSave();
 N.ch=sb.channel("notif-"+me)
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},function(p){if(p.new)nMsg(p.new)})
  .on("postgres_changes",{event:"*",schema:"public",table:"conversations"},function(p){if(p.new&&p.new.id)nConv(p.new)})
  .on("postgres_changes",{event:"*",schema:"public",table:"bookings"},function(p){if(p.new&&p.new.id)nameFor([p.new.companion_id]).then(function(){nBook(p.new)})})
  .on("postgres_changes",{event:"INSERT",schema:"public",table:"companion_photos"},function(){loadExtras()})
  .subscribe();
 N.poll=setInterval(nPoll,45000);
 presInit();P.t=setInterval(presInit,180000);
}
function notifStop(){
 if(N.ch&&sb)sb.removeChannel(N.ch);clearInterval(N.poll);N.ch=null;N.items=[];N.keys={};N.loud=false;
 $("bellw").hidden=true;$("chatw").hidden=true;closePanel();presStop();nRender();
}
function closePanel(){$("npanel").hidden=true;$("bell").setAttribute("aria-expanded","false")}
$("bell").onclick=function(e){
 e.stopPropagation();var p=$("npanel");if(!p.hidden){closePanel();return}
 var r=this.getBoundingClientRect(),w=Math.min(360,innerWidth-24);
 p.style.width=w+"px";p.style.top=Math.round(r.bottom+8)+"px";p.style.left=Math.max(12,Math.min(innerWidth-w-12,r.right-w))+"px";
 p.hidden=false;this.setAttribute("aria-expanded","true");
};
$("npanel").onclick=function(e){
 e.stopPropagation();var b=e.target.closest(".ni");if(b)nGo(N.items[+b.dataset.ix])};
$("nall").onclick=function(){N.items.forEach(function(i){i.read=true});nSave();nRender()};
$("nsound").onclick=function(){N.sound=!N.sound;try{localStorage.setItem("saathi_sound",N.sound?"1":"0")}catch(e){}nRender();if(N.sound){N.last=0;chime("ok")}};
$("nbanner").onclick=function(){var id=this.dataset.go;this.className="nbanner";nGo(N.items.filter(function(i){return i.id==id})[0])};
document.addEventListener("click",function(e){if(!e.target.closest("#bellw"))closePanel()});
document.addEventListener("keydown",function(e){if(e.key=="Escape")closePanel()});
window.addEventListener("scroll",closePanel,{passive:true});window.addEventListener("resize",closePanel);
document.addEventListener("visibilitychange",function(){if(document.visibilityState=="visible"&&user)nPoll()});

/* ---------- online presence (per booking, only the two people in it) ---------- */
var P={ch:{},t:null},ONL={};
function presStop(){clearInterval(P.t);Object.keys(P.ch).forEach(function(k){try{sb.removeChannel(P.ch[k])}catch(e){}});P.ch={};ONL={}}
async function presInit(){
 if(!user||!sb)return;var me=user.id;
 var r=await sb.from("conversations").select("id").eq("status","open").order("created_at",{ascending:false}).limit(40);
 if(r.error||!user||user.id!=me)return;
 r.data.forEach(function(b){
  if(P.ch[b.id])return;
  var ch=sb.channel("pres-"+b.id,{config:{presence:{key:me}}});
  ch.on("presence",{event:"sync"},function(){ONL[b.id]=Object.keys(ch.presenceState()).some(function(k){return k!=me});presPaint()})
    .subscribe(function(s){if(s==="SUBSCRIBED"&&prefs.showOnline!==false)ch.track({at:Date.now()})});
  P.ch[b.id]=ch;
 });
}
function presPaint(){if(document.body.dataset.view=="chats"){paintList();paintHead()}}

/* ---------- chats page ---------- */
var CR=[],CNAME={},CUR="",CT=null;
function chatBadge(){var n=N.items.filter(function(i){return !i.read&&i.go&&i.go.indexOf("chat:")==0}).length,b=$("cbn");b.textContent=n>9?"9+":n;b.hidden=!n;$("chatb").setAttribute("aria-label",n?"Chats, "+n+" unread":"Chats")}
$("chatb").onclick=function(){location.hash="#/chats"};
function iAmTarget(c){return !!(mine&&c.companion_id==mine.id)}
function chatRowName(c){return iAmTarget(c)?(CNAME[c.id]||"Someone"):(NAMES[c.companion_id]||"A companion")}
async function loadChatRows(){
 var r=await sb.from("conversations").select("id,customer_id,companion_id,status,created_at").in("status",["requested","open"]).order("created_at",{ascending:false}).limit(60);
 if(r.error){$("clistp").innerHTML='<p class="meta" style="padding:18px;text-align:center">Couldn\'t load chats.</p>';return false}
 var rows=r.data;
 await nameFor(rows.filter(function(c){return !iAmTarget(c)}).map(function(c){return c.companion_id}));
 await Promise.all(rows.filter(function(c){return iAmTarget(c)&&!CNAME[c.id]}).map(function(c){return sb.rpc("conversation_person",{p_conv:c.id}).then(function(x){var d=x.data&&x.data[0];CNAME[c.id]=d&&d.first_name||"Someone"})}));
 var last={};
 if(rows.length){var m=await sb.from("messages").select("conversation_id,sender_id,body,image_path,created_at").in("conversation_id",rows.map(function(c){return c.id})).gt("created_at",new Date(Date.now()-DAY).toISOString()).order("created_at",{ascending:false}).limit(300);
  (m.data||[]).forEach(function(x){if(!last[x.conversation_id])last[x.conversation_id]=x})}
 rows.forEach(function(c){c.last=last[c.id]||null;CSTAT[c.id]=c.status});
 var pin=function(c){return c.status=="requested"&&iAmTarget(c)?1:0},tm2=function(c){return c.last?+new Date(c.last.created_at):+new Date(c.created_at)};
 rows.sort(function(a,b){return pin(b)-pin(a)||tm2(b)-tm2(a)});
 CR=rows;return true;
}
function paintList(){
 var el=$("clistp");if(!CR.length){el.innerHTML='<p class="meta" style="padding:18px;text-align:center">No chats yet. Tap Message on a profile to say hello.</p>';return}
 var unread={};N.items.forEach(function(i){if(!i.read&&i.go&&i.go.indexOf("chat:")==0)unread[i.go.slice(5)]=1});
 el.innerHTML=CR.map(function(c){
  var nm=chatRowName(c),l=c.last,tgt=iAmTarget(c),req=c.status=="requested",on=!req&&!!ONL[c.id];
  var txt=l?(l.sender_id==user.id?"You: ":"")+(l.image_path?"\ud83d\udcf7 Photo":String(l.body)):(req?(tgt?"Wants to say hello":"Request sent"):"No messages yet");
  if(txt.length>50)txt=txt.slice(0,50)+"\u2026";
  var sm=req?(tgt?'<small class="rq">New request</small>':'<small>Waiting for a reply</small>'):(on?'<small class="on">Online</small>':'<small>'+(l?ago(+new Date(l.created_at)):'')+'</small>');
  return '<button type="button" role="listitem" class="ni'+(unread[c.id]||(req&&tgt)?' un':'')+(c.id==CUR?' act':'')+'" data-id="'+esc(c.id)+'"><span class="avw2"><span class="nic av">'+esc(nm[0].toUpperCase())+'</span>'+(on?'<i class="pdot"></i>':'')+'</span><span class="nt"><b>'+esc(nm)+'</b><span>'+esc(txt)+'</span>'+sm+'</span></button>'}).join("");
}
function paintHead(){
 var c=CR.filter(function(x){return x.id==CUR})[0];if(!c)return;
 var open=c.status=="open",on=open&&!!ONL[c.id],s=$("cpstat");
 $("cpdot").hidden=!on;s.textContent=open?(on?"Online":"Offline"):(iAmTarget(c)?"Wants to say hello":"Waiting for a reply");s.className=on?"on":"";
 var q=$("creq"),key=c.id+":"+c.status;$("pcf").hidden=!open;
 if(q.dataset.k!==key){q.dataset.k=key;
  if(c.status=="requested"){q.hidden=false;q.innerHTML=iAmTarget(c)?'<p><b>'+esc(chatRowName(c))+'</b> sent you a chat request. Accept to start chatting, or decline. You can also report or block.</p><div class="arow"><button class="btn" type="button" data-r="1">Accept</button><button class="btn alt" type="button" data-r="0">Decline</button></div>':'<p>Your request is sent. You can chat once '+esc(chatRowName(c))+' accepts.</p>'}
  else{q.hidden=true;q.innerHTML=""}}
}
function chatsHome(){CUR="";$("cpg").dataset.open="";$("cpane").hidden=true;$("cempty").hidden=false;paintList()}
async function selectChat(id){
 var c=CR.filter(function(x){return x.id==id})[0];
 if(!c){toast("That chat isn't available.");location.hash="#/chats";return}
 CUR=id;var nm=chatRowName(c);
 $("cpg").dataset.open="1";$("cempty").hidden=true;$("cpane").hidden=false;
 $("cpname").textContent=nm;$("cpav").textContent=nm[0].toUpperCase();$("creq").dataset.k="";paintHead();paintList();
 await openChat(id,nm,true);if(c.status=="open")$("pcin").focus({preventScroll:true});
}
async function chatsPage(id){
 if(!user||!sb)return;
 if(!CR.length||(id&&!CR.some(function(x){return x.id==id}))){if(!(await loadChatRows()))return}
 presInit();
 if(id)selectChat(id);else{chatStop();chatsHome()}
}
function chatsRefresh(now){clearTimeout(CT);CT=setTimeout(async function(){if(document.body.dataset.view!="chats"||!user)return;if(await loadChatRows()){paintList();if(CUR)paintHead()}},now?0:800)}
$("clistp").onclick=function(e){var b=e.target.closest(".ni");if(b)location.hash="#/chats/"+b.dataset.id};
$("cback").onclick=function(){location.hash="#/chats"};
$("creq").onclick=async function(e){
 var b=e.target.closest("button[data-r]");if(!b||!CUR)return;var acc=b.dataset.r=="1";
 if(!acc&&!confirm("Decline this request?"))return;
 var bs=this.querySelectorAll("button");bs.forEach(function(x){x.disabled=true});
 var r=await sb.rpc("respond_conversation",{p_conv:CUR,p_accept:acc});
 if(r.error){toast(r.error.message);bs.forEach(function(x){x.disabled=false});return}
 if(acc){var c=CR.filter(function(x){return x.id==CUR})[0];if(c)c.status="open";CSTAT[CUR]="open";paintList();paintHead();presInit();$("pcin").focus({preventScroll:true});toast("Accepted. You can chat now.")}
 else{CR=CR.filter(function(x){return x.id!=CUR});toast("Request declined.");location.hash="#/chats"}
};
/* start a chat from a profile */
var MT=null;
function openMsg(id){
 if(!user){needLogin("Log in to message "+(NAMES[id]||"this person")+".");return}
 if(mine&&mine.id==id){toast("That's your own listing.");return}
 MT=id;$("mtitle").textContent="Say hello to "+(NAMES[id]||"them");$("mtxt").value="";$("merr").textContent="";$("mdlg").showModal();
}
$("mform").onsubmit=async function(e){
 if(e.submitter&&e.submitter.value=="x")return;
 e.preventDefault();var t=$("mtxt").value.trim(),er=$("merr"),btn=e.submitter;
 if(t.length<2){er.textContent="Write a short hello first.";return}
 if(btn)btn.disabled=true;er.textContent="";
 var cid=null,st=null;
 var r=await sb.from("conversations").insert({customer_id:user.id,companion_id:MT}).select("id,status").single();
 if(!r.error){cid=r.data.id;st=r.data.status}
 else if(r.error.code=="23505"){var x=await sb.from("conversations").select("id,status").eq("customer_id",user.id).eq("companion_id",MT).single();if(!x.error){cid=x.data.id;st=x.data.status}}
 if(!cid){er.textContent=r.error&&r.error.message||"Couldn't start the chat.";if(btn)btn.disabled=false;return}
 if(st=="declined"){er.textContent=(NAMES[MT]||"They")+" didn't accept an earlier request.";if(btn)btn.disabled=false;return}
 if(st=="blocked"){er.textContent="You can't message this person.";if(btn)btn.disabled=false;return}
 if(st=="open"){$("mdlg").close();toast("You're already chatting. Opening it.");CR=[];location.hash="#/chats/"+cid;if(btn)btn.disabled=false;return}
 var m=await sb.from("messages").insert({conversation_id:cid,body:t});
 if(btn)btn.disabled=false;
 if(m.error&&!/Wait for them/.test(m.error.message)){er.textContent="Couldn't send. "+m.error.message;return}
 $("mdlg").close();toast(m.error?"You already sent a request. Waiting for a reply.":"Request sent. You can chat once they accept.");
 CR=[];location.hash="#/chats/"+cid;
};
async function gotoBookingChat(bid){
 var r=await sb.from("bookings").select("customer_id,companion_id").eq("id",bid).single();
 if(r.error){toast("Couldn't open the chat.");return}
 var c=await sb.from("conversations").select("id").eq("customer_id",r.data.customer_id).eq("companion_id",r.data.companion_id).maybeSingle();
 if(c.data){CR=[];location.hash="#/chats/"+c.data.id}else toast("The chat isn't ready yet. Try again in a moment.");
}
function shrinkPhoto(file){return new Promise(function(res,rej){
 var url=URL.createObjectURL(file),im=new Image();
 im.onload=function(){URL.revokeObjectURL(url);var s=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(im.naturalWidth*s));c.height=Math.max(1,Math.round(im.naturalHeight*s));c.getContext("2d").drawImage(im,0,0,c.width,c.height);c.toBlob(function(b){b?res(b):rej(new Error("encode"))},"image/jpeg",.85)};
 im.onerror=function(){URL.revokeObjectURL(url);rej(new Error("decode"))};im.src=url})}
async function sendPhoto(file){
 var ce=$("pcerr"),id=cs.id;if(!file||!id)return;
 var bad=function(t){ce.style.color="#d33";ce.textContent=t};
 if(!/^image\//.test(file.type)){bad("Please choose a photo.");return}
 if(file.size>10*1024*1024){bad("That photo is over 10 MB. Choose a smaller one.");return}
 var bt=[$("pcam"),$("ppic")];bt.forEach(function(b){b.disabled=true});ce.style.color="var(--mute)";ce.textContent="Sending photo...";
 var path=null;
 try{
  var blob=await shrinkPhoto(file);
  path=id+"/"+(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(16).slice(2))+".jpg";
  var up=await sb.storage.from("chat-images").upload(path,blob,{contentType:"image/jpeg"});
  if(up.error)throw up.error;
  var r=await sb.from("messages").insert({conversation_id:id,body:"Photo",image_path:path}).select("id,sender_id,body,image_path,created_at").single();
  if(r.error){sb.storage.from("chat-images").remove([path]);throw r.error}
  ce.textContent="";if(cs.id==id){cs.seen[r.data.id]=r.data;cs.fresh=true;chatDraw();cs.fresh=false}chatsRefresh();
 }catch(e){bad(e&&e.message=="decode"?"Couldn't read that photo. Try a JPEG or PNG.":"Couldn't send the photo. "+(e&&e.message||""))}
 bt.forEach(function(b){b.disabled=false});
}
$("pcam").onclick=function(){$("pfcam").click()};
$("ppic").onclick=function(){$("pffile").click()};
[$("pfcam"),$("pffile")].forEach(function(inp){inp.onchange=function(){var f=this.files&&this.files[0];this.value="";sendPhoto(f)}});
document.addEventListener("click",function(e){var im=e.target.closest&&e.target.closest("img.cimg,img.zoom");if(im&&im.src){$("pbody").innerHTML='<img class="gi" alt="Photo" src="'+esc(im.src)+'">';$("pdlg").showModal()}});
$("pcreport").onclick=function(){if(cs.id)openReport(cs.id,true)};
$("pcf").onsubmit=async function(e){
 e.preventDefault();var t=$("pcin").value.trim();if(!t||!cs.id)return;
 var btn=e.submitter;if(btn)btn.disabled=true;
 var r=await sb.from("messages").insert({conversation_id:cs.id,body:t}).select("id,sender_id,body,created_at").single();
 if(btn)btn.disabled=false;
 if(r.error){$("pcerr").textContent="Couldn't send. "+r.error.message;return}
 $("pcerr").textContent="";$("pcin").value="";cs.seen[r.data.id]=r.data;cs.fresh=true;chatDraw();cs.fresh=false;$("pcin").focus();chatsRefresh();
};

/* ---------- admin: verification queue ---------- */
var AQ={t:null};
async function checkReviewer(){
 var me=user&&user.id;if(!sb||!me)return;
 var r=await sb.rpc("is_reviewer");
 if(user&&user.id==me){isRev=r.data===true;updateNav();if(isRev)adminBadge()}
}
async function adminBadge(){
 if(!isRev||!sb)return;
 var r=await sb.from("kyc_submissions").select("id",{count:"exact",head:true}).eq("status","submitted");
 if(r.error)return;var n=r.count||0;$("adminlink").innerHTML="Admin"+(n?' <span class="dn">'+n+'</span>':'');
}
function ageFrom(d){var b=new Date(d),n=new Date(),y=n.getFullYear()-b.getFullYear(),m=n.getMonth()-b.getMonth();if(m<0||(m==0&&n.getDate()<b.getDate()))y--;return y}
function adminCard(k,c,U){
 var ag=ageFrom(k.dob),ct=[];
 ct.push([ag>=18,ag>=18?"Date of birth shows "+ag+" years old":"Under 18 by date of birth ("+ag+"). Reject."]);
 ct.push([c.age==null||Math.abs(c.age-ag)<=1,c.age==null||Math.abs(c.age-ag)<=1?"Listed age ("+c.age+") matches the date of birth":"Listed age ("+c.age+") does not match the date of birth ("+ag+")"]);
 ct.push([!!(U[k.id_image_path]&&U[k.selfie_path]),U[k.id_image_path]&&U[k.selfie_path]?"ID photo and selfie both uploaded":"An ID photo or selfie is missing or can't be opened"]);
 ct.push([!!c.photo_path,c.photo_path?"Profile photo uploaded":"No profile photo"]);
 var fig=function(src,cap,cls){return '<figure>'+(src?'<img class="zoom '+cls+'" src="'+esc(src)+'" alt="'+esc(cap)+'">':'<div class="empty" style="padding:30px 6px">Missing</div>')+'<figcaption>'+esc(cap)+'</figcaption></figure>'};
 var nm=c.name||"Unknown";
 return '<div class="ac" data-n="'+esc(nm)+'"><h3>'+esc(nm)+'</h3><p class="meta">'+esc((c.gender=="F"?"Woman":c.gender=="M"?"Man":"")+(c.city?" \u00b7 "+c.city:"")+" \u00b7 DOB "+k.dob+" \u00b7 "+String(k.id_type).replace("_"," ")+" \u00b7 submitted "+ago(+new Date(k.created_at)))+'</p>'
  +'<div class="aimgs">'+fig(c.photo_path?pubUrl(c.photo_path):"","Profile photo","")+fig(U[k.id_image_path],"ID","id")+fig(U[k.selfie_path],"Selfie","")+'</div>'
  +'<ul class="achk">'+ct.map(function(x){return '<li class="'+(x[0]?'ok':'wn')+'">'+(x[0]?'\u2713 ':'\u26a0 ')+esc(x[1])+'</li>'}).join("")+'</ul>'
  +'<div class="arow"><input class="rs" maxlength="300" placeholder="Reason (required to reject, shown to the person)" aria-label="Reason"><button class="btn" type="button" data-a="approve" data-id="'+esc(k.id)+'">Approve</button><button class="btn alt" type="button" data-a="reject" data-id="'+esc(k.id)+'">Reject</button></div></div>';
}
async function loadAdmin(){
 var el=$("aq");if(!isRev||!sb)return;
 if(!el.querySelector(".ac"))el.innerHTML='<p class="meta" style="margin-top:16px">Loading...</p>';
 var r=await sb.from("kyc_submissions").select("id,user_id,id_type,dob,id_image_path,selfie_path,created_at").eq("status","submitted").order("created_at");
 if(r.error){el.innerHTML='<p class="meta" style="margin-top:16px">Couldn\'t load the queue. '+esc(r.error.message)+'</p>';return}
 adminBadge();
 if(!r.data.length){el.innerHTML='<div class="empty" style="margin-top:16px">No one is waiting. New applications show up here.</div>';return}
 var cp=await sb.from("companions").select("user_id,name,age,gender,city,photo_path").in("user_id",r.data.map(function(x){return x.user_id})),C={};
 (cp.data||[]).forEach(function(x){C[x.user_id]=x});
 var paths=[];r.data.forEach(function(k){if(k.id_image_path)paths.push(k.id_image_path);if(k.selfie_path)paths.push(k.selfie_path)});
 var U={};if(paths.length){var sg=await sb.storage.from("kyc-private").createSignedUrls(paths,1800);(sg.data||[]).forEach(function(x){if(x.signedUrl)U[x.path]=x.signedUrl})}
 el.innerHTML=r.data.map(function(k){return adminCard(k,C[k.user_id]||{},U)}).join("");
}
function autoAdmin(){var el=$("aq");if(document.visibilityState!="visible")return;var busy=[].some.call(el.querySelectorAll(".rs"),function(i){return i.value||document.activeElement==i})||el.querySelector("button:disabled");if(!busy)loadAdmin()}
$("aref").onclick=loadAdmin;
$("aq").onclick=async function(e){
 var b=e.target.closest("button[data-a]");if(!b)return;
 var card=b.closest(".ac"),rs=card.querySelector(".rs"),note=rs.value.trim(),dec=b.dataset.a=="approve"?"approved":"rejected";
 if(dec=="rejected"&&!note){toast("Add a reason so the person knows what to fix.");rs.focus();return}
 if(dec=="approved"&&!confirm("Approve "+card.dataset.n+"? Their listing goes live."))return;
 var bs=card.querySelectorAll("button");bs.forEach(function(x){x.disabled=true});
 var r=await sb.rpc("admin_review_kyc",{p_id:b.dataset.id,p_decision:dec,p_note:note||null});
 if(r.error){toast(r.error.message);bs.forEach(function(x){x.disabled=false});return}
 card.remove();toast(dec=="approved"?"Approved. They are live.":"Rejected. They can fix it and apply again.");
 adminBadge();if(!$("aq").querySelector(".ac"))loadAdmin();
};

/* ---------- routing + init ---------- */
var ANCH={"#browse":1,"#why":1,"#safety":1};
function route(){
 var h=location.hash,v=h=="#/list"?"list":h=="#/verify"?"verify":h=="#/login"?"login":h=="#/bookings"?"bookings":h.indexOf("#/chats")==0?"chats":h=="#/dashboard"?"dashboard":h=="#/admin"?"admin":"home";
 if((v=="list"||v=="verify"||v=="bookings"||v=="dashboard"||v=="chats"||v=="admin")&&!user){nextHash=h;$("lgmsg").textContent="Log in to continue where you left off.";location.hash="#/login";return}
 var pv=document.body.dataset.view;document.body.dataset.view=v;
 if(pv!==v)window.scrollTo(0,0);
 if(v=="home"&&ANCH[h]){var t=document.getElementById(h.slice(1));if(t)t.scrollIntoView()}
 if(user)persist();
 if(v=="verify"&&mine&&mine.status=="verified"){location.hash="#/";return}
 if(v=="verify"&&pv!="verify")startVerify();
 clearInterval(AQ.t);
 if(v=="admin"&&!isRev){location.hash="#/";return}
 if(v=="admin"){loadAdmin();AQ.t=setInterval(autoAdmin,60000)}
 if(pv=="chats"&&v!="chats")chatStop();
 if(v=="chats")chatsPage(h.split("/")[2]||"");
 if(v=="bookings")loadBookings();
 if(v=="dashboard")loadDash();
 if(v=="list"){renderStatus();if(prefs.draft)fillForm(prefs.draft);else formFromListing();listMode()}
}
window.addEventListener("hashchange",route);
ui();renderChips();
if(!configured){$("cfg").hidden=false;route();renderOnline();renderGrid()}
else{
 var onSession=function(u){var id=u?u.id:null;if(id===authId)return;authId=id;setTimeout(function(){setUser(u)},0)};
 sb.auth.onAuthStateChange(function(ev,session){onSession(session&&session.user||null)});
 sb.auth.getSession().then(function(r){onSession(r.data.session&&r.data.session.user||null)}).catch(function(e){console.error("Saathiyaa: session check failed",e);route();load()});
 setTimeout(function(){if(authId===undefined){console.warn("Saathiyaa: sign-in is slow, showing the page anyway");route();load()}},5000);
}