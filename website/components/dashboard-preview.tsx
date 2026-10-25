'use client';
import {useState} from 'react';
const choices=[{id:'chat',name:'Chat'},{id:'week',name:'Week'},{id:'month',name:'Month'},{id:'credit',name:'Credit'},{id:'reminders',name:'Reminders'},{id:'project',name:'Plan'},{id:'you',name:'You'}];
export default function DashboardPreview({spendingOnly=false,initialView='week'}:{spendingOnly?:boolean,initialView?:string}){
 const [selected,setSelected]=useState(initialView);const options=spendingOnly?choices.filter(x=>['week','month'].includes(x.id)):[];
 const url='/dashboard/?embed=1&focus=1&view='+(['week','month'].includes(selected)?'home':selected)+(selected==='month'?'&period=month':'');
 return <div className="final-preview live-dashboard-preview"><div className="preview-controls" role="group" aria-label="Choose a demo screen">{options.map(s=><button key={s.id} aria-pressed={selected===s.id} onClick={()=>setSelected(s.id)}>{s.name}</button>)}</div><div className="export-phone dashboard-frame"><iframe key={url} src={url} title={'Interactive Creditbro demo: '+selected} loading="lazy" sandbox="allow-scripts allow-same-origin allow-modals allow-top-navigation-by-user-activation"/></div><div className="preview-caption"><a href={'/dashboard/?view='+(['week','month'].includes(selected)?'home':selected)+(selected==='month'?'&period=month':'')} target="_blank" rel="noreferrer">Open full dashboard ↗</a><a href="https://www.figma.com/proto/SSbeTrYNnD5PR5s5Noafmh?node-id=175-631&starting-point-node-id=175%3A631" target="_blank" rel="noreferrer">View Figma prototype ↗</a></div></div>
}
