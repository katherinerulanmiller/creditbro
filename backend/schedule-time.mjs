// Local calendar arithmetic: earlier occurrence on a repeated clock time; shift
// forward across a nonexistent time, retaining the original clock for later runs.
export function localParts(at,tz){return Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(at).map(p=>[p.type,p.value]));}
const wall=p=>Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);
export function localTimestamp(year,month,day,hour,minute,tz){
 const desired=Date.UTC(year,month-1,day,hour,minute),offsets=new Set();
 for(const hours of [-48,-24,-12,0,12,24,48]){const at=desired+hours*3600000;offsets.add(wall(localParts(at,tz))-at);}
 const candidates=[...offsets].map(offset=>({at:desired-offset,delta:wall(localParts(desired-offset,tz))-desired}));
 const exact=candidates.filter(c=>c.delta===0).sort((a,b)=>a.at-b.at);if(exact.length)return exact[0].at;
 const later=candidates.filter(c=>c.delta>0).sort((a,b)=>a.delta-b.delta||a.at-b.at);if(later.length)return later[0].at;
 throw Error('Local recurrence time unavailable');
}
export function nextWeek(at,tz,now,clock=null){const p=localParts(at,tz),hour=clock?.hour??+p.hour,minute=clock?.minute??+p.minute;
 for(let n=1;n<=6000;n++){const d=new Date(Date.UTC(+p.year,+p.month-1,+p.day+7*n));const next=localTimestamp(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),hour,minute,tz);if(next>now)return next;}throw Error('Weekly recurrence out of range');
}
export function nextMonth(at,tz,now,anchor=Number(localParts(at,tz).day),clock=null){const p=localParts(at,tz),hour=clock?.hour??+p.hour,minute=clock?.minute??+p.minute;let month=+p.month,year=+p.year;
 for(let n=0;n<600;n++){month++;if(month>12){year++;month=1;}const day=Math.min(anchor,new Date(Date.UTC(year,month,0)).getUTCDate());const next=localTimestamp(year,month,day,hour,minute,tz);if(next>now)return next;}throw Error('Monthly recurrence out of range');
}
