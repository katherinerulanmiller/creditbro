// Provider receipts are evidence of delivery; request acceptance alone is not.
export function reconcileReceipt(state,message,now=Date.now()){
 if(message?.isFromMe!==true||typeof message.guid!=='string')return false;
 const item=state.outbox.find(o=>o.guid===message.guid&&['accepted','delivered'].includes(o.status));if(!item)return false;
 if(Number.isFinite(message.error)&&message.error!==0){item.status='failed';item.receiptCheckedAt=now;return true;}
 if(Number(message.dateDelivered)>0){item.status='delivered';item.deliveredAt=Number(message.dateDelivered);item.receiptCheckedAt=now;return true;}
 return false;
}
export function deliverySummary(state){
 const counts={};for(const o of state.outbox)counts[o.status]=(counts[o.status]||0)+1;
 return {consent:state.mode,outgoing:counts,scheduled_reminders:(state.schedule?.jobs||[]).filter(j=>j.status==='scheduled').length,bank_connected:false,email_connected:false};
}
export function statusText(state){const s=deliverySummary(state);return `Creditbro demo is running. ${s.scheduled_reminders} scheduled reminder/report(s).\nOutgoing messages: ${s.outgoing.delivered||0} reported delivered; ${s.outgoing.accepted||0} accepted, delivery not yet verified; ${s.outgoing.unknown||0} with unknown outcomes; ${s.outgoing.failed||0} reported failed. These counts cover this test session.\nFinancial accounts and email are not connected. This Mac must remain awake for reminders. DEMO REPORT shows a fictional graph; REMINDERS reviews your schedule.`;}
