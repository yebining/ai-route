import {mentors,categories,prompts,inferCategory,rankMentors} from './data.js';
import {createMatching} from './matching.js';
import {rates,stages} from './booking-model.js';
const app=document.querySelector('#app');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={arrow:'M5 12h14m-6-6 6 6-6 6',up:'M12 19V5m-6 6 6-6 6 6',left:'m14 6-6 6 6 6',right:'m10 6 6 6-6 6',spark:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z',workflow:'M5 3v6h6V3H5Zm8 12v6h6v-6h-6ZM8 9v8h5M16 3v5h5',code:'m8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18',image:'M4 3h16v18H4V3Zm0 13 5-5 6 6 3-3 2 2M14 7h2',check:'m5 12 4 4L19 6',chat:'M4 4h16v12H9l-5 4V4Z',grid:'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7Z',plus:'M12 5v14M5 12h14',route:'M6 19V8a4 4 0 0 1 8 0c0 4-5 4-5 8m9-9v12',clock:'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',book:'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3V4Zm9 2v15',flag:'M5 21V4h13l-3 4 3 4H5'};
const icon=(name,size=19)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.spark}"/></svg>`;
const brand=()=>`<a class="brand" href="#/" aria-label="AI ROUTE 홈"><span class="brand-mark">${icon('route',26)}</span><span><small>AI</small>ROUTE</span></a>`;
const header=(active='home')=>`<header class="site-header">${brand()}<nav class="nav" aria-label="메인 메뉴"><a class="${active==='home'?'active':''}" href="#/">홈</a><a class="${active==='mentors'?'active':''}" href="#/mentors">강사 둘러보기</a><a class="${active==='chat'?'active':''}" href="#/chat">AI 상담</a><a class="${active==='messages'?'active':''}" href="#/messages">채팅·예약</a></nav><div class="header-actions"><a class="teach-link ${active==='teach'?'active':''}" href="#/teach">강사로 등록</a><a class="teach-link admin-link ${active==='admin'?'active':''}" href="#/admin">운영 콘솔</a><span class="demo-tag">UI PREVIEW</span><a class="btn btn-dark" href="#/chat">나에게 맞는 강사 찾기 ${icon('arrow',15)}</a></div></header>`;
const footer=()=>`<footer class="site-footer"><b>AI ROUTE</b><span>서비스 UI 체험판 · 강사 사진과 이력은 가상 예시입니다. 상담·메시지·견적·결제는 시연용이며 실제 전달이나 청구는 발생하지 않습니다.</span></footer>`;
const tag=t=>`<span class="tag">${escape(t)}</span>`;

const HUE={'AI 기초':'#2f9c73','AI 업무 활용':'#c25a1d','AI 제작':'#4a5bc4','AI 콘텐츠':'#b83c68','AI 공부·심화':'#2b7f95','AI 창업':'#7b4bbd'};
function portrait(m,cls=''){
 if(m.photo)return `<div class="portrait portrait-photo ${cls}" style="background-image:url('${m.photo}')" role="img" aria-label="${escape(m.name)} 강사 프로필 사진"></div>`;
 return m.custom
 ?`<div class="portrait portrait-initial ${cls}" style="--pa:${HUE[m.category]||'#4a5bc4'}" data-ini="${escape(m.name).slice(0,1)}" role="img" aria-label="${escape(m.name)} 강사 프로필"></div>`
 :`<div class="portrait ${cls} p${m.portrait}" role="img" aria-label="${m.name} 가상 강사 프로필 이미지"></div>`;}
let pendingPhoto=null;
function shrinkImage(file,cb){
 const img=new Image(),url=URL.createObjectURL(file);
 img.onload=()=>{const W=440,H=560,r=Math.max(W/img.width,H/img.height);
  const w=Math.round(img.width*r),h=Math.round(img.height*r);
  const c=document.createElement('canvas');c.width=W;c.height=H;
  c.getContext('2d').drawImage(img,(W-w)/2,(H-h)/2,w,h);
  URL.revokeObjectURL(url);cb(c.toDataURL('image/jpeg',.82));};
 img.onerror=()=>{URL.revokeObjectURL(url);cb(null);};
 img.src=url;}
const mentorById=id=>mentors.find(m=>m.id===id)||submissions.find(s=>s.m.id===id)?.m||null;
let submissions=[];let mySubmission=null;
const LS='airoute-demo-v1';let editing=false;let saveTimer=null;
function saveState(){try{localStorage.setItem(LS,JSON.stringify({
 submissions,mine:mySubmission?mySubmission.m.id:null,
 requests:matching.store.list(),chat}));}catch(err){}}
function queueSave(){if(saveTimer==='off')return;clearTimeout(saveTimer);saveTimer=setTimeout(saveState,60);}
function loadState(){try{const raw=localStorage.getItem(LS);if(!raw)return;const d=JSON.parse(raw);
 if(Array.isArray(d.submissions)){submissions=d.submissions;
  for(const s of submissions)if(s.status==='approved'&&!mentors.some(m=>m.id===s.m.id)){mentors.push(s.m);rates[s.m.id]=s.m.price;}
  mySubmission=submissions.find(s=>s.m.id===d.mine)||null;}
 if(Array.isArray(d.requests)&&d.requests.length)matching.store.restore(d.requests);
 if(d.chat)chat=d.chat;
}catch(err){}}
function resetDemo(){clearTimeout(saveTimer);saveTimer='off';try{localStorage.removeItem(LS);}catch(err){}location.hash='#/';location.reload();}

const pendingCount=()=>submissions.filter(s=>s.status==='pending').length;
function submissionCard(s,actionable){const m=s.m;return `<article class="review-item"><div class="review-item-head">${portrait(m,'mini-portrait')}<div><b>${m.name} 강사</b><small>${m.role} · ${m.years}</small><small>${m.category} · 온라인 1시간 ${m.price.toLocaleString('ko-KR')}원</small></div><span class="review-state s-${s.status}">${s.status==='pending'?'검수 대기':s.status==='approved'?'승인됨':'반려됨'}</span></div><dl class="review-detail"><dt>지도 가능 수준</dt><dd>${m.level.join(' · ')}</dd><dt>소개</dt><dd>${m.about}</dd><dt>주요 이력</dt><dd>${m.career.map(([k,v])=>`${k} — ${v}`).join('<br>')}</dd><dt>함께 만들 결과물</dt><dd>${m.outcomes.join('<br>')}</dd></dl>${s.reason?`<p class="review-reason">반려 사유 · ${s.reason}</p>`:''}<div class="review-item-actions"><a class="btn btn-outline" href="#/mentor/${m.id}">프로필 보기</a>${actionable?`<input class="reject-reason" id="rr-${m.id}" maxlength="80" placeholder="반려 사유를 적으면 강사에게 전달돼요"><button class="btn btn-ghost" data-admin-reject="${m.id}">반려</button><button class="btn btn-dark" data-admin-approve="${m.id}">승인 ${icon('check',15)}</button>`:''}</div></article>`;}
function requestRow(r){const m=mentorById(r.mentorId);return `<article class="review-item"><div class="review-item-head">${m?portrait(m,'mini-portrait'):''}<div><b>${m?m.name+' 강사':'알 수 없는 강사'}</b><small>목표 · ${r.diagnosis.goal}</small><small>${r.diagnosis.level} · ${r.diagnosis.format||'수업 형식 미정'}</small></div><span class="review-state s-stage">${stages[r.status]}</span></div><ol class="admin-progress">${stages.map((st,i)=>`<li class="${i<r.status?'done':i===r.status?'current':''}"><span></span><b>${st}</b></li>`).join('')}</ol><div class="review-item-actions"><span class="admin-note">${r.preferred?'희망 일정 있음':'일정은 채팅에서 조율 예정'}</span><a class="btn btn-dark" href="#/messages?request=${r.id}">채팅방 열기 ${icon('right',15)}</a></div></article>`;}
function admin(tab){const reqs=matching.store.list();const done=submissions.filter(s=>s.status!=='pending');const pend=submissions.filter(s=>s.status==='pending');
 return `${header('admin')}<main id="main" class="admin-page"><div class="admin-head"><p class="section-kicker">OPERATIONS CONSOLE</p><h1>운영 콘솔</h1><p>강사 등록을 검수하고, 들어온 매칭 신청이 어디까지 갔는지 확인합니다.</p></div><div class="admin-tabs" role="tablist"><a href="#/admin?tab=mentors" class="${tab!=='requests'?'active':''}">강사 검수 <b>${pendingCount()}</b></a><a href="#/admin?tab=requests" class="${tab==='requests'?'active':''}">매칭 신청 <b>${reqs.length}</b></a></div>${tab==='requests'
 ?(reqs.length?`<div class="review-list">${reqs.map(requestRow).join('')}</div>`:`<div class="admin-empty">${icon('chat',26)}<p>아직 들어온 매칭 신청이 없어요.<br>강사 프로필에서 상담을 신청하면 여기에 쌓입니다.</p></div>`)
 :`${pend.length?`<div class="review-list">${pend.map(s=>submissionCard(s,true)).join('')}</div>`:`<div class="admin-empty">${icon('check',26)}<p>검수를 기다리는 강사가 없어요.<br>강사로 등록하면 여기로 들어옵니다.</p></div>`}<div class="admin-reset"><span>데모 데이터는 이 브라우저에 저장됩니다.</span><button class="text-button" data-admin-reset>전부 지우고 처음부터</button></div>${done.length?`<h2 class="admin-sub">처리한 등록 ${done.length}건</h2><div class="review-list">${done.map(s=>submissionCard(s,false)).join('')}</div>`:''}`}</main>${footer()}`;}

function buildMentor(f){
 const t=k=>escape(String(f.get(k)||'').trim());
 const cat=t('category'),name=t('name'),about=t('about');
 const levels=f.getAll('level').map(v=>escape(String(v)));
 const head=(about.split(/[.!?\n]/)[0]||name+' 강사').trim().slice(0,44);
 return {id:'new-'+Date.now().toString(36),custom:true,portrait:'new',english:'',intro:'',photo:pendingPhoto,
  name,role:t('role'),years:t('years'),category:cat,about,headline:head,
  tags:[cat,'1:1 맞춤 지도'],
  level:levels.length?levels:['처음 시작해요'],
  career:[['현재',t('career0')],['이전',t('career1')],['지도 분야',t('career2')]],
  outcomes:[t('outcome0'),t('outcome1'),t('outcome2')],
  sessions:['현재 상황과 목표를 함께 정리하기',cat+' 실습을 직접 해보기','다음 단계 계획을 세우고 마무리하기'],
  price:Math.round(Number(f.get('price'))||0)};
}
function teachField(label,name,ph,extra=''){return `<label>${label} <input name="${name}" required maxlength="60" placeholder="${ph}" ${extra}></label>`;}
function tf(label,name,ph,pre,extra=''){return `<label>${label} <input name="${name}" required maxlength="60" placeholder="${ph}" value="${pre||''}" ${extra}></label>`;}
function teachForm(pre=null){const p=k=>pre?(pre[k]||''):'';const car=i=>pre&&pre.career&&pre.career[i]?pre.career[i][1]:'';const out=i=>pre&&pre.outcomes?(pre.outcomes[i]||''):'';
 const ini=pre?String(pre.name).slice(0,1):'?';
 return `${header('teach')}<main id="main" class="teach-page"><div class="teach-head"><p class="section-kicker">TEACH ON AI ROUTE</p><h1>${pre?'프로필을<br>고쳐볼까요?':'가르치는 사람으로<br>등록해볼까요?'}</h1><p>${pre?'고친 내용은 저장하는 즉시 수강생에게 보이는 프로필에 반영됩니다.':'등록하면 운영자 검수를 거쳐 강사 목록에 올라갑니다. 수강생은 목표와 현재 수준이 정리된 진단서를 들고 찾아와요.'}</p></div><form id="teach-form" class="teach-form" novalidate>
<section class="teach-block"><h2>기본 정보</h2>${tf('이름','name','김예빈',p('name'),'maxlength="20"')}${tf('한 줄 직함','role','AI 업무 자동화 코치',p('role'),'maxlength="40"')}${tf('경력 연차','years','업무 개선 7년',p('years'),'maxlength="30"')}</section>
<section class="teach-block"><h2>프로필 사진 <span class="optional">선택</span></h2><p class="teach-sub">수강생이 강사 목록에서 가장 먼저 보는 이미지예요. 올리지 않으면 이름 첫 글자로 만들어드려요.</p><div class="photo-pick"><div class="portrait ${pre&&pre.photo?'portrait-photo':'portrait-initial'} photo-preview" id="photo-preview" style="--pa:${HUE[p('category')]||'#4a5bc4'};${pre&&pre.photo?`background-image:url('${pre.photo}')`:''}" data-ini="${ini}"></div><div class="photo-pick-side"><label class="photo-btn">${icon('image',16)} 사진 고르기<input type="file" name="photo" accept="image/*" id="photo-input"></label><button type="button" class="text-button photo-clear" id="photo-clear" ${pre&&pre.photo?'':'hidden'}>사진 빼기</button><p class="field-hint">JPG·PNG · 10MB 이하. 올리면 자동으로 작게 줄여서 저장해요.</p></div></div></section>
<section class="teach-block"><h2>무엇을 가르치나요</h2><label>분야 <select name="category">${categories.slice(1).map(c=>`<option ${p('category')===c?'selected':''}>${c}</option>`).join('')}</select></label><fieldset class="teach-fieldset"><legend>지도 가능한 수준 <span class="optional">복수 선택</span></legend><div class="teach-checks">${['처음 시작해요','도구를 써봤어요','직접 만들고 있어요'].map(v=>`<label class="check-label"><input type="checkbox" name="level" value="${v}" ${pre&&pre.level&&pre.level.includes(v)?'checked':''}><span>${v}</span></label>`).join('')}</div></fieldset></section>
<section class="teach-block"><h2>수업료</h2><label>온라인 1시간 기준 <span class="won-input"><input name="price" type="number" min="10000" max="1000000" step="1000" placeholder="80000" value="${pre&&pre.price?pre.price:''}"><b>원</b></span></label><p class="field-hint">수강생에게 이 금액이 먼저 보여요. 수업 시간과 범위는 채팅에서 조율할 수 있습니다.</p></section>
<section class="teach-block"><h2>소개</h2><label>어떤 사람인지 한 문단으로 <textarea name="about" rows="4" maxlength="400" placeholder="어떤 일을 해왔고, 어떤 사람을 잘 도울 수 있는지 적어주세요.">${p('about')}</textarea></label></section>
<section class="teach-block"><h2>주요 이력</h2>${tf('현재','career0','AI 업무 자동화 교육 및 1:1 멘토링',car(0))}${tf('이전','career1','마케팅팀 운영 및 데이터 분석',car(1))}${tf('지도 분야','career2','보고서 자동화, 문서 정리, 반복 업무 개선',car(2))}</section>
<section class="teach-block"><h2>함께 만들 결과물</h2><p class="teach-sub">수강생이 세션을 마치고 직접 들고 가는 것 3개를 적어주세요.</p>${tf('결과물 1','outcome0','바로 쓰는 주간 보고서 자동화',out(0))}${tf('결과물 2','outcome1','내 업무에 맞춘 프롬프트 모음',out(1))}${tf('결과물 3','outcome2','다음에도 혼자 할 수 있는 점검표',out(2))}</section>
<div class="form-error" role="alert"></div><button class="btn btn-dark btn-wide" type="submit">${pre?'수정 내용 저장':'등록 신청하기'} ${icon('arrow',16)}</button>${pre?`<a class="photo-clear" style="display:block;text-align:center;margin-top:12px" href="#/teach/done">수정하지 않고 돌아가기</a>`:'<small class="demo-boundary">체험용 등록입니다. 실제로 심사되지 않으며 새로고침하면 사라집니다.</small>'}</form></main>${footer()}`;}
function teachDone(){const s=mySubmission;if(!s)return teachForm();const m=s.m;
 const body=s.status==='approved'?`<div class="review-badge ok">${icon('check',20)} 승인 완료</div><h1>강사 목록에 올라갔어요</h1><p>이제 수강생이 진단서를 들고 찾아올 수 있어요. 신청이 들어오면 채팅방이 열립니다.</p>`
 :s.status==='rejected'?`<div class="review-badge no">${icon('left',20)} 반려됨</div><h1>조금만 보완해주세요</h1><p>${s.reason?escape(s.reason):'운영자가 확인 후 다시 안내드릴게요.'}</p>`
 :`<div class="review-badge">${icon('clock',20)} 검수 중</div><h1>등록 신청이 접수됐어요</h1><p>운영자가 이력과 결과물을 확인한 뒤 강사 목록에 올려드려요. 보통 1~2일 안에 연락드립니다.</p>`;
 const actions=s.status==='approved'?`<a class="btn btn-outline" href="#/teach/edit">프로필 수정</a><a class="btn btn-dark" href="#/mentor/${m.id}">내 프로필 보기 ${icon('right',15)}</a>`
 :s.status==='rejected'?`<a class="btn btn-dark" href="#/teach">다시 등록하기</a>`
 :`<a class="btn btn-outline" href="#/teach/edit">프로필 수정</a><a class="btn btn-dark" href="#/admin?tab=mentors">운영 콘솔에서 보기 ${icon('right',15)}</a>`;
 return `${header('teach')}<main id="main" class="teach-page teach-done"><div class="review-card">${body}<div class="review-summary">${portrait(m,'mini-portrait')}<div><b>${m.name} 강사</b><small>${m.role} · ${m.category}</small><small>온라인 1시간 기준 ${m.price.toLocaleString('ko-KR')}원</small></div></div><div class="review-actions">${actions}</div><small class="demo-boundary">체험용 등록입니다. 승인·반려는 운영 콘솔에서 처리합니다.</small></div></main>${footer()}`;}
function card(m){return `<a class="mentor-card" href="#/mentor/${m.id}" aria-label="${m.name} ${m.role} 상세 보기"><div class="card-image">${portrait(m)}<span class="card-badge">${m.category}</span><div class="card-caption">${m.headline}</div></div><div class="card-details"><div class="card-name">${m.name}<small>${m.years}</small></div><div class="role">${m.role}</div><div class="tags">${m.tags.map(tag).join('')}</div></div></a>`;}
function arrows(id){return `<button class="icon-btn" data-scroll="${id}" data-direction="-1" aria-label="이전 강사 보기">${icon('left',16)}</button><button class="icon-btn" data-scroll="${id}" data-direction="1" aria-label="다음 강사 보기">${icon('right',16)}</button>`;}
function composer(id,placeholder){return `<form class="composer" id="${id}" autocomplete="off"><label class="sr-only" for="${id}-text">상담 내용</label><textarea id="${id}-text" name="message" maxlength="1200" rows="2" required placeholder="${placeholder}"></textarea><div class="composer-bottom"><span>${icon('spark',14)} ${id==='home-form'?'무엇을 물어봐야 할지 몰라도 괜찮아요':'AI ROUTE · 맞춤 경로 찾기'}</span><button class="send-btn" type="submit" aria-label="상담 내용 보내기">${icon('up',20)}</button></div></form>`;}
const routes=[
 {cat:'AI 기초',      icon:'spark',    desc:'가입·설치부터 첫 한 걸음',    seed:'AI를 처음 써보는데 무엇부터 하면 좋을까요?'},
 {cat:'AI 업무 활용', icon:'workflow', desc:'보고서·자료 정리, 반복 업무',  seed:'매주 만드는 보고서를 AI로 자동화하고 싶어요.'},
 {cat:'AI 제작',      icon:'code',     desc:'아이디어를 웹·앱 서비스로',   seed:'개발은 모르지만 AI로 작은 웹 서비스를 만들고 싶어요.'},
 {cat:'AI 콘텐츠',    icon:'image',    desc:'영상·이미지·숏폼 만들기',     seed:'AI로 우리 브랜드에 맞는 이미지 콘텐츠를 만들고 싶어요.'},
 {cat:'AI 공부·심화', icon:'book',     desc:'원리를 알고 제대로 쓰기',     seed:'AI가 어떻게 동작하는지 원리부터 이해하고 싶어요.'},
 {cat:'AI 창업',      icon:'flag',     desc:'AI 서비스를 사업으로',        seed:'AI 서비스로 창업을 준비 중인데 무엇부터 검증해야 할까요?'}
];
function routeGrid(){return `<section class="section route-section"><div class="section-heading"><div><p class="section-kicker">WHERE TO START</p><h2>어디로 가볼까요?</h2><p>고르면 그 분야부터 상담이 시작돼요.</p></div></div><div class="route-grid">${routes.map((r,i)=>`<button class="route-tile" data-route="${i}"><span class="route-tile-icon">${icon(r.icon,22)}</span><strong>${r.cat}</strong><small>${r.desc}</small></button>`).join('')}</div></section>`;}
function home(){return `${header()}<main id="main"><section class="hero"><div class="eyebrow">${icon('spark',15)} YOUR PERSONAL AI NAVIGATOR</div><h1>AI, <em>어디서 막혔나요?</em></h1><p class="sub">한 줄만 적어주세요.<br>지금 수준에 맞는 경로와 전문가를 찾아드려요.</p><div class="chat-lead"><span class="chat-lead-who">${icon('route',16)} AI ROUTE</span><p>무엇을 해보고 싶으세요? 잘 모르겠으면 막힌 부분만 알려주셔도 돼요.</p></div>${composer('home-form','“AI로 뭔가 해보고 싶은데, 어디서부터 시작하죠?”')}<div class="hero-footnote">${icon('check',14)} 지금 수준에 맞게 &nbsp; ${icon('check',14)} 내 목표에 맞게 &nbsp; ${icon('check',14)} 전문가와 1:1로</div></section><div class="container">${routeGrid()}<section class="section"><div class="section-heading"><div><p class="section-kicker">FIND YOUR GUIDE</p><h2>나의 다음 단계를 함께할 전문가</h2><p>무엇부터 할지 모를 때도, 만들다가 막혔을 때도.</p></div><div class="section-actions"><a class="text-link" href="#/mentors">모두 보기 ${icon('right',14)}</a>${arrows('home-shelf')}</div></div><div class="shelf" id="home-shelf">${[mentors[2],mentors[1],mentors[0],mentors[3],mentors[4],mentors[5]].map(card).join('')}</div></section><section class="teach-cta"><div><h2>AI를 가르치고 계신가요?</h2><p>내가 가장 잘 도울 수 있는 사람을 만나보세요. 목표와 현재 수준이 정리된 상태로 연결해드려요.</p></div><a class="btn btn-dark" href="#/teach">강사로 등록하기 ${icon('arrow',15)}</a></section></div></main>${footer()}`;}
let filter='전체';
function shelf(title,subtitle,list,id){return `<section class="section"><div class="section-heading"><div><h2>${title}</h2><p>${subtitle}</p></div><div class="section-actions">${arrows(id)}</div></div><div class="shelf" id="${id}">${list.map(card).join('')}</div></section>`;}
function catalog(){const all=filter==='전체';const list=all?mentors:mentors.filter(m=>m.category===filter);return `<div class="dark">${header('mentors')}<main id="main"><div class="catalog-top"><div class="catalog-hero"><div><p class="section-kicker">THE NEXT CHAPTER STARTS HERE</p><h1>내가 만들고 싶은 것,<br>먼저 만들어본 사람과.</h1><p>나의 목표에 맞는 전문가를 만나보세요.</p></div><div class="catalog-note">어떤 강사를 만나야 할지 모르겠다면?<br><a class="text-link" href="#/chat" style="color:#deef92;margin-top:9px">상담하고 추천받기 ${icon('arrow',16)}</a></div></div><div class="filters" role="group" aria-label="전문 분야">${categories.map(c=>`<button class="filter ${filter===c?'active':''}" data-filter="${c}" aria-pressed="${filter===c}">${c}</button>`).join('')}</div></div><div class="container">${shelf(all?'지금, 나에게 필요한 전문가':filter+'를 함께할 전문가',all?'가입과 설치부터 업무 활용, 나만의 서비스까지.':'내 상황에 맞는 지도 분야와 결과물을 확인하세요.',list,'catalog-main')}${all?shelf('처음 시작하는 당신에게','기초부터 내 속도로, 작은 성공을 함께 만드는 강사',[mentors[2],mentors[1],mentors[3],mentors[0]],'catalog-beginner'):''}${all?shelf('아이디어를 실제 결과물로','도구를 써보는 다음 단계, 직접 만들고 적용해보세요.',[mentors[0],mentors[5],mentors[4],mentors[1]],'catalog-build'):''}</div></main>${footer()}</div>`;}
let chat=null;
let requestedGoal='';
let pendingFocus=false;
let seenCount=0;
function newChat(mentorId=null){seenCount=0;chat={mentorId,goal:'',category:mentors.find(m=>m.id===mentorId)?.category||null,level:'',format:'',blocker:'',stage:'goal',messages:[]};}
function bot(text,choices=null,result=false){chat.messages.push({role:'bot',text,choices,result});}
function user(text){chat.messages.push({role:'user',text});}
function goChat(goal='',mentorId=null){requestedGoal=goal;newChat(mentorId);const hash='#/chat'+(mentorId?'?mentor='+mentorId:'');if(location.hash===hash)render();else location.hash=hash;}
function advance(text){text=String(text).trim().slice(0,1200);if(!text)return;user(text);const m=mentors.find(m=>m.id===chat.mentorId);
 if(chat.stage==='goal'){
  chat.goal=text;chat.category=m?.category||inferCategory(text);
  if(!chat.category){chat.stage='category';bot('아직 목표가 선명하지 않아도 괜찮아요. 어떤 일을 해보고 싶은지 함께 좁혀볼게요.\n지금 가장 가까운 관심사를 골라주세요.',categories.slice(1));}
  else{chat.stage='level';bot(`${chat.category}부터 함께 살펴볼게요.\nAI 도구는 얼마나 써보셨어요?`,['처음 시작해요','도구를 써봤어요','직접 만들고 있어요']);}
 }else if(chat.stage==='category'){
  const c=categories.slice(1).includes(text)?text:inferCategory(text);
  if(!c){bot('AI 기초, AI 업무 활용, AI 제작 중 가장 가까운 분야를 선택해보세요.',categories.slice(1));}
  else{chat.category=c;chat.stage='level';bot('좋아요. 출발점을 알아야 나에게 맞는 경로를 찾을 수 있어요.\nAI 도구는 얼마나 써보셨어요?',['처음 시작해요','도구를 써봤어요','직접 만들고 있어요']);}
 }else if(chat.stage==='level'){
  const level=['처음 시작해요','도구를 써봤어요','직접 만들고 있어요'].includes(text)?text:/처음|초보|설치|가입|몰라|없어|없음/.test(text)?'처음 시작해요':/프로젝트|구현|개발|만들고|배포|심화/.test(text)?'직접 만들고 있어요':/써|써봤|사용|해봤|기본|경험/.test(text)?'도구를 써봤어요':null;
  if(!level){bot('경험 수준을 아래에서 선택해주시면 더 정확하게 경로를 맞출 수 있어요.',['처음 시작해요','도구를 써봤어요','직접 만들고 있어요']);}
  else{chat.level=level;chat.stage='format';bot('좋아요. 어떤 형식의 과외가 편하세요?\n장소와 시간대를 같이 골라주시면 일정 맞추기가 쉬워요.',['온라인으로 주말에','온라인으로 평일 저녁에','오프라인으로 만나서','아직 정하지 못했어요']);}
 }else if(chat.stage==='format'){
  chat.format=text;chat.stage='blocker';const level=chat.level;bot(level==='처음 시작해요'?'처음이라면 작은 작업을 하나 끝내보는 것부터 시작하면 좋아요.\n지금 가장 필요한 도움은 무엇인가요?':'도구 사용 경험을 원하는 결과물로 연결해볼게요.\n진행하면서 가장 막히는 부분은 무엇인가요?',level==='처음 시작해요'?['가입·설치를 같이 해주세요','무엇부터 할지 모르겠어요','작은 결과물을 만들어볼래요']:['내 상황에 적용하기 어려워요','실행 중 오류가 나요','원하는 결과가 나오지 않아요']);
 }else if(chat.stage==='blocker'){
  chat.blocker=text;chat.stage='result';bot(m?`${m.name} 강사와 상담할 내용을 정리했어요.\n함께 확인할 경로와 지도 분야를 살펴보세요.`:'지금의 출발점과 목표를 연결해봤어요.\n아래 경로와 강사를 확인하고, 나에게 맞는 도움을 골라보세요.',null,true);
 }else{
  chat.blocker=text;bot('추가로 알려주신 내용을 상담 메모에 반영했어요.\n목표나 분야를 바꾸고 싶다면 새 상담을 시작해주세요.',null,true);
 }
 renderChat(true);
 if(chat.stage==='result')matching.finishDiagnosis({...chat,steps:routeSteps()});
}
function routeSteps(){const m=mentors.find(x=>x.category===chat.category)||mentors[2];let steps=[...m.sessions];if(chat.level==='처음 시작해요')steps[0]='사용할 AI를 고르고 설치·기초 사용 익히기';if(/오류|에러/.test(chat.blocker))steps[1]='현재 작업과 오류를 전문가와 함께 점검하기';return steps;}
function result(){return `<div class="result-box"><div class="result-heading"><div class="eyebrow">${icon('check',15)} 이렇게 이해했어요</div><h2>맞는지 한 번만 확인해주세요</h2></div><dl class="result-check"><div><dt>하고 싶은 것</dt><dd>${escape(chat.goal)}</dd></div><div><dt>지금 수준</dt><dd>${escape(chat.level)}</dd></div><div><dt>원하는 형식</dt><dd>${escape(chat.format||'아직 정하지 못함')}</dd></div><div><dt>막히는 부분</dt><dd>${escape(chat.blocker)}</dd></div></dl><p class="result-memo">다르게 이해한 부분이 있으면 아래에 적어주세요. 바로 고쳐서 반영할게요.</p></div><div class="result-actions"><a class="btn btn-dark btn-wide" href="#/finding">나에게 꼭 맞는 튜터 찾으러 가기 ${icon('arrow',16)}</a></div>`;}
function welcome(){const m=mentors.find(m=>m.id===chat.mentorId);return `<div class="chat-welcome"><div class="chat-symbol">${icon('route',35)}</div><div class="eyebrow">A LITTLE CONVERSATION. YOUR NEXT STEP.</div><h1>${m?`${m.name} 강사와<br>무엇을 함께하고 싶나요?`:'어디서부터 시작할지,<br>같이 찾아볼까요?'}</h1><p>${m?`${m.role} · ${m.category}`:'“AI를 잘 쓰고 싶어요” 그 한마디면 충분해요.'}</p></div><div class="starter-grid">${(m?[{icon:'chat',label:'지금 막힌 부분을 해결하고 싶어요',text:`${m.category}에서 막힌 부분을 해결하고 싶어요.`},{icon:'route',label:'작은 결과물부터 만들어볼래요',text:`${m.category}로 작은 결과물을 만들어보고 싶어요.`}]:prompts).map((p,i)=>`<button class="starter" data-start="${escape(p.text)}">${icon(p.icon,21)}${p.label}<small>${m?'현재 상황부터 알려주세요':(['가입·설치부터 차근차근','보고서, 자료 정리, 반복 작업','아이디어에서 첫 웹 서비스까지','나만의 이미지와 브랜드 콘텐츠'][i])}</small></button>`).join('')}</div>`;}
function chatHTML(){const progress={goal:0,category:0,level:1,blocker:2,result:3}[chat.stage];return `<div class="chat-layout"><aside class="chat-sidebar">${brand()}<button class="btn chat-new" data-reset>${icon('plus',17)} 새 상담 시작하기</button><p class="side-label">나를 위한 AI 활용</p><a class="side-link active" href="#/chat">${icon('chat',17)} 나의 AI 네비게이션</a><a class="side-link" href="#/mentors">${icon('grid',17)} 강사 둘러보기</a><a class="side-link" href="#/recommendations">${icon('spark',17)} 나의 추천 결과</a><a class="side-link" href="#/messages">${icon('chat',17)} 채팅·예약</a><a class="side-link" href="#/">${icon('route',17)} 홈으로 돌아가기</a><div class="side-plan">${icon('spark',22)}<strong>정답보다, 나에게 맞는 다음 단계.</strong><p>현재 수준과 하고 싶은 일을 알려주세요. 나에게 필요한 도움을 함께 찾아볼게요.</p></div><p class="side-demo">시나리오 상담 체험 · 실제 AI 연결 전</p></aside><main class="chat-main" id="main"><header class="chat-header"><div><a href="#/" class="mobile-brand" aria-label="홈으로">${icon('route',24)}</a><strong>나의 AI 네비게이션</strong><span class="demo-tag">체험</span></div><div><span class="desktop-label">목표 → 출발점 → 추천</span><div class="progress-pills" aria-label="상담 ${progress}단계 완료">${[0,1,2].map(i=>`<i class="${i<progress?'on':''}"></i>`).join('')}</div><a href="#/mentors">강사 보기 ${icon('right',15)}</a></div></header><div class="chat-body" id="messages" aria-live="polite" aria-relevant="additions text">${chat.messages.length?chat.messages.map((m,i)=>m.role==='user'?`<div class="chat-msg user${i>=seenCount?' is-new':''}"><div class="user-bubble">${escape(m.text)}</div></div>`:`<div class="chat-msg${i>=seenCount?' is-new':''}"><div class="bot-name"><span class="mini-mark">${icon('route',18)}</span>AI ROUTE</div><div class="bot-bubble">${escape(m.text)}</div>${m.choices&&i===chat.messages.length-1?`<div class="answer-choices">${m.choices.map(c=>`<button class="choice" data-answer="${escape(c)}">${escape(c)}</button>`).join('')}</div>`:''}${m.result&&i===chat.messages.length-1?result():''}</div>`).join(''):welcome()}</div><div class="chat-input-wrap">${composer('chat-form',chat.stage==='result'?'상담에 추가할 내용을 남겨주세요.':'하고 싶은 일이나 지금 막힌 부분을 알려주세요.')}<p class="chat-input-note">시나리오 기반 상담 체험입니다. 개인정보나 업무 기밀은 입력하지 마세요.</p></div></main></div>`;}
function renderChat(scroll=false){app.innerHTML=chatHTML();seenCount=chat?chat.messages.length:0;bindForms();if(scroll)requestAnimationFrame(()=>{const results=document.querySelector('.result-box');if(results){results.scrollIntoView({block:'start',behavior:'smooth'});return;}const msgs=document.querySelectorAll('#messages .chat-msg');(msgs[msgs.length-1]||document.querySelector('#chat-form'))?.scrollIntoView({block:'end',behavior:'smooth'});});}
function profile(id){const m=mentorById(id);if(!m)return `${header('mentors')}<main class="not-found" id="main"><h1>강사 프로필을 찾을 수 없어요.</h1><a class="btn btn-dark" href="#/mentors">강사 목록으로</a></main>${footer()}`;return `${header('mentors')}<main id="main"><section class="profile-hero"><div class="profile-container"><a class="back-link" href="#/mentors">${icon('left',15)} 강사 둘러보기</a><div class="profile-intro"><div><div class="tags">${m.tags.map(tag).join('')}</div><h1>${m.headline}</h1><div class="profile-name">${m.name}<span>${m.english}</span></div><div class="profile-meta">${m.role} · ${m.years}</div></div><div class="profile-photo-wrap">${portrait(m,'profile-photo')}<span class="photo-label">${m.custom?'등록 프로필':'샘플 프로필'}</span></div></div></div></section><div class="profile-body"><div class="profile-main"><nav class="profile-tabs" aria-label="강사 상세 메뉴"><a href="#introduction" data-jump="introduction">강사 소개</a><a href="#career" data-jump="career">주요 이력</a><a href="#outcomes" data-jump="outcomes">함께 만들 결과물</a></nav><section class="profile-section" id="introduction"><h2>반가워요, ${m.name}입니다.</h2><p class="profile-quote">${m.about}</p><p>${m.intro}</p></section><section class="profile-section" id="career"><h2>이런 경험을 함께 나눠요</h2><div class="timeline">${m.career.map(([label,value])=>`<div class="timeline-item"><small>${label}</small><p>${value}</p></div>`).join('')}</div></section><section class="profile-section" id="outcomes"><h2>함께 만들 수 있는 결과물</h2>${m.outcomes.map(x=>`<div class="outcome">${icon('check',18)}${x}</div>`).join('')}</section><section class="profile-section"><h2>이렇게 함께 진행해요</h2>${m.sessions.map((x,i)=>`<div class="session-step"><span>0${i+1}</span>${x}</div>`).join('')}<p>실제 진행 범위와 완료 기준은 사전 상담에서 함께 정합니다.</p></section></div><aside class="consult-card"><span class="tag">${m.category}</span><h3>내 목표도 함께할 수 있을까?</h3><p>지금 하고 싶은 일과 막힌 부분부터 알려주세요.</p><div class="mini-meta"><span>진행 방식</span><b>1:1 맞춤 지도</b></div><div class="mini-meta"><span>지도 대상</span><b>${m.level.includes('처음 시작해요')?'입문자부터':'사용 경험이 있는 분'}</b></div>${matching.ratePanel(m)}${matching.applyButton(m)}${mySubmission&&mySubmission.m.id===m.id?`<a class="btn btn-outline" href="#/teach/edit">${icon('check',15)} 내 프로필 수정</a>`:''}<a class="btn btn-outline" href="#/mentors">다른 강사도 둘러보기</a><small>가상 강사의 시연용 프로필입니다.<br>매칭부터 채팅·견적·예약·결제 흐름을 체험할 수 있어요. 실제 예약이나 청구는 발생하지 않습니다.</small></aside></div></main>${footer()}`;}
function route(){const [path,query='']=(location.hash.slice(1)||'/').split('?');return {path,query:new URLSearchParams(query)};}
function render(){const {path,query}=route();if(matching.renderRoute(path,query)){registerWebTools();return;}if(path==='/chat'){const mentorId=query.get('mentor');if(mentorId&&!mentors.some(m=>m.id===mentorId)){app.innerHTML=profile('missing');return;}if(!chat||chat.mentorId!==mentorId)newChat(mentorId);if(requestedGoal){const goal=requestedGoal;requestedGoal='';advance(goal);}else renderChat();document.title='AI 상담 · AI ROUTE';}
 else if(path==='/admin'){app.innerHTML=admin(query.get('tab'));document.title='운영 콘솔 · AI ROUTE';window.scrollTo(0,0);}else if(path==='/teach'){editing=false;pendingPhoto=null;app.innerHTML=teachForm();document.title='강사로 등록 · AI ROUTE';window.scrollTo(0,0);bindTeach();}else if(path==='/teach/edit'){if(!mySubmission){location.hash='#/teach';return;}editing=true;pendingPhoto=mySubmission.m.photo||null;app.innerHTML=teachForm(mySubmission.m);document.title='프로필 수정 · AI ROUTE';window.scrollTo(0,0);bindTeach();}else if(path==='/teach/done'){app.innerHTML=teachDone();document.title='등록 신청 완료 · AI ROUTE';window.scrollTo(0,0);bindTeach();}else if(path==='/teach/preview'){app.innerHTML=mySubmission?profile(mySubmission.m.id):teachForm();document.title='프로필 미리보기 · AI ROUTE';window.scrollTo(0,0);}else{if(path==='/mentors'){filter=categories.includes(query.get('category'))?query.get('category'):'전체';app.innerHTML=catalog();document.title='나에게 맞는 강사 찾기 · AI ROUTE';}else if(path.startsWith('/mentor/')){const id=path.split('/')[2];app.innerHTML=profile(id);document.title=(mentorById(id)?.name||'강사 상세')+' · AI ROUTE';}else{app.innerHTML=home();document.title='AI ROUTE — 나에게 맞는 AI 활용의 시작';}window.scrollTo(0,0);bindForms();}registerWebTools();}
function bindTeach(){const form=document.getElementById('teach-form');if(!form)return;
 const pv=document.getElementById('photo-preview'),fileIn=document.getElementById('photo-input'),clr=document.getElementById('photo-clear');
 const err=form.querySelector('.form-error');
 const showPhoto=src=>{pendingPhoto=src;if(src){pv.style.backgroundImage=`url('${src}')`;pv.classList.add('portrait-photo');pv.classList.remove('portrait-initial');clr.hidden=false;}
  else{pv.style.backgroundImage='';pv.classList.remove('portrait-photo');pv.classList.add('portrait-initial');clr.hidden=true;}};
 form.querySelector('[name="name"]')?.addEventListener('input',ev=>{if(!pendingPhoto)pv.dataset.ini=ev.target.value.trim().slice(0,1)||'?';});
 form.querySelector('[name="category"]')?.addEventListener('change',ev=>{pv.style.setProperty('--pa',HUE[ev.target.value]||'#4a5bc4');});
 fileIn?.addEventListener('change',()=>{const f=fileIn.files&&fileIn.files[0];if(!f)return;
  if(!/^image\//.test(f.type)){err.textContent='이미지 파일만 올릴 수 있어요.';fileIn.value='';return;}
  if(f.size>10*1024*1024){err.textContent='사진은 10MB 이하로 올려주세요.';fileIn.value='';return;}
  err.textContent='';shrinkImage(f,src=>{if(!src){err.textContent='이 사진은 읽을 수 없어요. 다른 파일로 올려주세요.';return;}showPhoto(src);});});
 clr?.addEventListener('click',()=>{fileIn.value='';showPhoto(null);});
 form.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(form);const err=form.querySelector('.form-error');
  const missing=['name','role','years','about','career0','career1','career2','outcome0','outcome1','outcome2'].find(k=>!String(f.get(k)||'').trim());
  if(missing){err.textContent='빈 칸을 모두 채워주세요.';form.querySelector(`[name="${missing}"]`)?.focus();return;}
  const price=Number(f.get('price'));
  if(!(price>=10000&&price<=1000000)){err.textContent='수업료를 10,000원 이상 1,000,000원 이하로 적어주세요.';form.querySelector('[name="price"]').focus();return;}
  if(!f.getAll('level').length){err.textContent='지도 가능한 수준을 하나 이상 골라주세요.';return;}
  const built=buildMentor(f);if(editing&&mySubmission){const keep=mySubmission.m.id;Object.assign(mySubmission.m,built,{id:keep});rates[keep]=mySubmission.m.price;editing=false;}else{mySubmission={m:built,status:'pending',reason:'',at:Date.now()};submissions.unshift(mySubmission);}saveState();location.hash='#/teach/done';});}
function bindForms(){for(const id of ['home-form','chat-form']){const form=document.getElementById(id);if(!form)continue;form.addEventListener('submit',e=>{e.preventDefault();const value=new FormData(form).get('message');if(!String(value).trim())return;if(id==='home-form')goChat(value);else advance(value);});const textarea=form.querySelector('textarea');textarea.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit();}});}}
document.addEventListener('click',()=>queueSave());
document.addEventListener('submit',()=>queueSave());
document.addEventListener('click',e=>{const button=e.target.closest('button,a');if(!button)return;
 if(button.hasAttribute('data-prompt')){goChat(prompts[Number(button.dataset.prompt)].text);}
 else if(button.hasAttribute('data-route')){goChat(routes[Number(button.dataset.route)].seed);}
 else if(button.hasAttribute('data-admin-reset')){if(confirm('등록한 강사와 매칭 신청을 모두 지우고 처음 상태로 돌립니다. 진행할까요?'))resetDemo();}
 else if(button.hasAttribute('data-admin-approve')){const s=submissions.find(x=>x.m.id===button.dataset.adminApprove);if(!s||s.status!=='pending')return;
 mentors.push(s.m);rates[s.m.id]=s.m.price;s.status='approved';saveState();render();}
 else if(button.hasAttribute('data-admin-reject')){const s=submissions.find(x=>x.m.id===button.dataset.adminReject);if(!s||s.status!=='pending')return;
 const box=document.getElementById('rr-'+s.m.id);const why=String(box?.value||'').trim();
 if(!why){box?.focus();box?.classList.add('need');return;}
 s.status='rejected';s.reason=why;saveState();render();}
 else if(button.hasAttribute('data-start'))advance(button.dataset.start);
 else if(button.hasAttribute('data-answer'))advance(button.dataset.answer);
 else if(button.hasAttribute('data-reset')){newChat(chat?.mentorId||null);renderChat();window.scrollTo(0,0);}
 else if(button.hasAttribute('data-filter')){filter=button.dataset.filter;app.innerHTML=catalog();history.replaceState(null,'','#/mentors'+(filter==='전체'?'':'?category='+encodeURIComponent(filter)));}
 else if(button.hasAttribute('data-scroll')){const shelf=document.getElementById(button.dataset.scroll);shelf?.scrollBy({left:shelf.clientWidth*.75*Number(button.dataset.direction),behavior:'smooth'});}
 else if(button.hasAttribute('data-jump')){e.preventDefault();document.getElementById(button.dataset.jump)?.scrollIntoView({behavior:'smooth',block:'start'});}
});
let toolsRegistered=false;
function registerWebTools(){const context=document.modelContext;if(!context?.registerTool||toolsRegistered)return;toolsRegistered=true;const tools=[
 {name:'start_ai_consultation',title:'AI 활용 상담 시작',description:'입력한 목표로 시나리오 기반 상담을 시작하고 화면에 다음 질문을 표시합니다. 실제 AI 호출이나 예약은 하지 않습니다.',inputSchema:{type:'object',properties:{goal:{type:'string',minLength:1,maxLength:1200}},required:['goal'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(!input||typeof input.goal!=='string'||!input.goal.trim()||input.goal.length>1200)throw new Error('1~1200자 목표를 입력하세요.');newChat();history.replaceState(null,'','#/chat');advance(input.goal);return {stage:chat.stage,category:chat.category,lastMessage:chat.messages.at(-1).text};}},
 {name:'answer_consultation_question',title:'상담 질문에 답하기',description:'진행 중인 시나리오 상담에 답하고 경로와 가상 강사 추천을 표시합니다.',inputSchema:{type:'object',properties:{answer:{type:'string',minLength:1,maxLength:1200}},required:['answer'],additionalProperties:false},annotations:{readOnlyHint:false},execute(input){if(route().path!=='/chat'||!chat)throw new Error('먼저 상담을 시작하세요.');if(!input||typeof input.answer!=='string'||!input.answer.trim()||input.answer.length>1200)throw new Error('유효한 답변을 입력하세요.');advance(input.answer);return {stage:chat.stage,category:chat.category,lastMessage:chat.messages.at(-1).text};}}
 ];for(const tool of tools){try{Promise.resolve(context.registerTool(tool)).catch(()=>{});}catch{}}}
const matching=createMatching({app,icon,escape,header,footer,card,portrait,goChat,renderApp:render,getDiagnosis:()=>chat?.stage==='result'?{...chat,steps:routeSteps()}:null});
loadState();
window.addEventListener('hashchange',render);render();
