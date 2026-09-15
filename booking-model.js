// UI demo state only. No messages leave the browser and no money is charged.
import {mentors} from './data.js';
export const stages=['접수','조율','확정','완료'];
export const rates={jun:90000,sora:70000,min:50000,hajin:80000,doyun:100000,yuna:80000};
export const money=n=>new Intl.NumberFormat('ko-KR').format(n)+'원';
export function koreaDate(d=new Date()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
 return ['year','month','day'].map(t=>parts.find(p=>p.type===t).value).join('-');
}
export function availability(id){
 const n=Math.max(0,mentors.findIndex(m=>m.id===id));const today=koreaDate();
 return [1,3,5].map((days,i)=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return {date:d.toISOString().slice(0,10),time:['19:00','14:00','10:00'][(n+i)%3]};});
}
export function dateLabel(date,time=''){
 if(!date)return '일정 조율 중';
 const label=new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short',timeZone:'Asia/Seoul'}).format(new Date(date+'T12:00:00+09:00'));
 return label+(time?' '+time:'');
}
export function scheduleValid(date,time,duration,now=Date.now()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('날짜와 시간을 입력해주세요.');
 const at=new Date(date+'T'+time+':00+09:00');
 if(!Number.isFinite(+at)||koreaDate(at)!==date||+at<=now)throw new Error('현재 시각 이후의 일정을 선택해주세요.');
 if(![30,60,90,120,180].includes(Number(duration)))throw new Error('수업 시간을 선택해주세요.');
 const mins=Number(time.slice(0,2))*60+Number(time.slice(3));
 if(mins+Number(duration)>1440)throw new Error('자정 이전에 끝나는 일정으로 선택해주세요.');
 return {date,time,duration:Number(duration)};
}
export function createBookingStore(){
 const requests=[];let serial=0;
 const id=p=>p+'-'+(++serial);
 function get(requestId){const r=requests.find(r=>r.id===requestId);if(!r)throw new Error('신청 내역을 찾을 수 없어요.');return r;}
 function role(actual,expected){if(actual!==expected)throw new Error(expected==='mentor'?'강사 화면에서 사용할 수 있어요.':'사용자 화면에서 확인해주세요.');}
 function active(r){if(r.status===3)throw new Error('이미 완료된 신청입니다.');}
 function message(r,type,text='',extra={}){const msg={id:id('msg'),type,text,at:new Date().toISOString(),...extra};r.messages.push(msg);return msg;}
 function restore(rows){requests.length=0;let max=0;
  const scan=v=>{const n=Number(String(v).split('-').pop());if(Number.isFinite(n)&&n>max)max=n;};
  for(const r of rows||[]){requests.push(r);scan(r.id);(r.messages||[]).forEach(m=>scan(m.id));(r.quotes||[]).forEach(q=>scan(q.id));}
  serial=Math.max(serial,max);}
 return {
  restore,
  list:()=>requests,
  get,
  create({mentorId,diagnosis,date,time,duration,note,consent}){
   if(!mentors.some(m=>m.id===mentorId))throw new Error('강사를 선택해주세요.');
   if(!diagnosis?.goal||!diagnosis?.level||!diagnosis?.blocker||!diagnosis?.id)throw new Error('진단서의 목표와 막히는 부분을 적어주세요.');
   if(consent!==true)throw new Error('진단서 전달 동의를 확인해주세요.');
   const slot=(date&&time)?scheduleValid(date,time,duration):null;
   const existing=requests.find(r=>r.mentorId===mentorId&&r.diagnosis.id===diagnosis.id&&r.status<3);
   if(existing)return existing;
   const snapshot=JSON.parse(JSON.stringify(diagnosis));
   const r={id:id('request'),mentorId,diagnosis:snapshot,preferred:slot,note:String(note||'').slice(0,1200),status:0,messages:[],quotes:[],quote:null,reservation:null,payment:null,createdAt:new Date().toISOString()};
   requests.push(r);message(r,'system','매칭 신청이 접수되었습니다. 진단서가 이 채팅방에 첨부되었어요.');message(r,'diagnosis','',{diagnosis:snapshot});
   message(r,'text',`안녕하세요! ${snapshot.category} 1:1 상담을 신청합니다.\n희망 일정: ${dateLabel(date,time)} · ${duration}분 (한국시간)`+(r.note?'\n'+r.note:''),{role:'learner'});
   return r;
  },
  acknowledge(requestId,actor){role(actor,'mentor');const r=get(requestId);active(r);if(r.status===0){r.status=1;message(r,'system','강사가 진단서를 확인했어요. 일정과 수업 범위를 조율해주세요.');}return r;},
  send(requestId,actor,text){if(!['learner','mentor'].includes(actor))throw new Error('화면 역할을 선택해주세요.');text=String(text||'').trim();if(!text||text.length>1600)throw new Error('메시지는 1~1600자로 입력해주세요.');const r=get(requestId);if(actor==='mentor'&&r.status===0){r.status=1;message(r,'system','상담이 시작되었어요. 일정과 수업 범위를 조율해주세요.');}message(r,'text',text,{role:actor});return r;},
  requestQuote(requestId,actor){role(actor,'learner');const r=get(requestId);active(r);if(r.reservation)throw new Error('이미 예약이 확정되었습니다.');message(r,'text','진단서를 바탕으로 수업 범위와 가능한 일정, 견적을 보내주실 수 있을까요?',{role:'learner'});return r;},
  proposeSchedule(requestId,actor,input){const r=get(requestId);active(r);if(r.reservation)throw new Error('확정된 예약의 일정은 변경할 수 없어요.');if(!['learner','mentor'].includes(actor))throw new Error('화면 역할을 선택해주세요.');const slot=scheduleValid(input.date,input.time,input.duration);message(r,'schedule','이 일정으로 진행할 수 있을까요?',{role:actor,slot});r.preferred=slot;if(actor==='mentor'&&r.status===0)r.status=1;return r;},
  sendQuote(requestId,actor,input){role(actor,'mentor');const r=get(requestId);active(r);if(r.reservation)throw new Error('예약이 확정되어 견적을 변경할 수 없어요.');const slot=scheduleValid(input.date,input.time,input.duration);const amount=Number(input.amount);if(!Number.isSafeInteger(amount)||amount<1000||amount>10000000)throw new Error('견적 금액은 1,000원부터 10,000,000원까지 입력해주세요.');const scope=String(input.scope||'').trim();if(!scope||scope.length>1200)throw new Error('수업 범위를 1~1200자로 입력해주세요.');if(!['온라인 화상','오프라인'].includes(input.mode))throw new Error('진행 방식을 선택해주세요.');if(input.mode==='오프라인'&&!String(input.place||'').trim())throw new Error('만날 장소를 입력해주세요.');if(r.quote)r.quote.state='superseded';const q={id:id('quote'),...slot,amount,scope,mode:input.mode,place:String(input.place||'').slice(0,200),state:'pending',revision:r.quotes.length+1};r.quotes.push(q);r.quote=q;r.status=1;message(r,'quote','',{role:'mentor',quoteId:q.id});return r;},
  accept(requestId,actor,quoteId){role(actor,'learner');const r=get(requestId);active(r);const q=r.quote;if(!q||q.id!==quoteId||q.state!=='pending'||r.reservation)throw new Error('최신 견적을 확인해주세요.');scheduleValid(q.date,q.time,q.duration);q.state='accepted';r.reservation={...q,id:id('booking'),confirmedAt:new Date().toISOString()};r.status=2;message(r,'reservation','일정과 견적을 확인하여 예약을 확정했어요.',{quoteId:q.id});return r;},
  reject(requestId,actor,quoteId){role(actor,'learner');const r=get(requestId);active(r);if(!r.quote||r.quote.id!==quoteId||r.quote.state!=='pending'||r.reservation)throw new Error('조율 가능한 최신 견적이 없어요.');r.quote.state='rejected';message(r,'text','보내주신 견적을 확인했어요. 일정이나 수업 범위를 다시 조율하고 싶어요.',{role:'learner'});return r;},
  pay(requestId,actor,quoteId,method){role(actor,'learner');const r=get(requestId);active(r);if(!r.reservation||r.quote?.id!==quoteId||r.quote.state!=='accepted')throw new Error('견적과 예약을 먼저 확정해주세요.');if(!['카드','간편결제'].includes(method))throw new Error('결제 수단을 선택해주세요.');scheduleValid(r.reservation.date,r.reservation.time,r.reservation.duration);if(r.payment)return r;r.payment={id:id('demo-payment'),amount:r.reservation.amount,quoteId,method,paidAt:new Date().toISOString(),demo:true};message(r,'payment','테스트 결제가 완료되었어요. 실제 금액은 청구되지 않았습니다.');return r;},
  complete(requestId,actor,{simulate=false}={}){role(actor,'mentor');const r=get(requestId);active(r);if(!r.reservation||!r.payment)throw new Error('예약 확정과 테스트 결제 후 완료할 수 있어요.');const end=+new Date(r.reservation.date+'T'+r.reservation.time+':00+09:00')+r.reservation.duration*60000;if(!simulate&&end>Date.now())throw new Error('수업 종료 이후 완료할 수 있어요.');r.status=3;r.completedAt=new Date().toISOString();message(r,'system',simulate?'수업이 끝난 상황을 가정하여 완료 처리했어요. 체험이 완료되었습니다.':'수업이 완료되었습니다.');return r;}
 };
}
