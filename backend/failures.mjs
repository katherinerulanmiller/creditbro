// Fixed messages only. Never interpolate provider bodies, URLs, credentials or student data.
export const FAILURE_TEXT={
 ai:'I couldn’t finish that reply. Please send your question again.\nAnything already saved is still there.',
 planner:'I couldn’t finish a usable project plan. Your saved project is still there.\nAsk me to try the plan again, or we can work through it here.',
 timeout:'The project planner took too long, so I stopped waiting. Your saved project is still there.\nAsk me to try the plan again.',
 start_unknown:'I couldn’t confirm whether the planner started. I won’t start another run automatically.\nYour saved project is still there; ask me to try again when you’re ready.',
 stale:'Your connected demo data changed while I was planning, so I held back the old result.\nAsk me to update the project with the latest numbers.',
 interrupted:'That reply was interrupted when the coach restarted.\nPlease send the question again; anything already saved is still there.',
};
export function queueFailure(state,id,kind,job=null){
 if(state.mode!=='active'||(job&&(job.owner!==state.contactTag||job.epoch!==state.epoch)))return false;
 if(state.outbox.some(o=>o.id===id))return false;
 state.outbox.push({id,text:FAILURE_TEXT[kind]||FAILURE_TEXT.planner,status:'queued',...(job?{planningJobId:job.id}:{})});return true;
}
export function recoverInterruptedWork(state){
 for(const job of state.planning?.jobs||[])if(job.status==='starting'){
  job.status='start_outcome_unknown';job.failure='Interrupted start; not retried automatically.';
  queueFailure(state,'plan-error-'+job.id,'start_unknown',job);
 }
 for(const out of state.outbox||[])if(out.status==='sending')out.status='unknown';
 if(state.processing){const id=state.processing;state.queue=state.queue.filter(q=>q.id!==id);state.processing=null;queueFailure(state,'error-'+id,'interrupted');}
}

export function safeToolFailure(name,error){
 if(['get_connected_money_summary','send_connected_spending_visual'].includes(name)){
  if(error?.message==='Bank summary sharing not enabled')return 'No bank data was read or report queued. Ask the student to enable Nessie summary sharing in dashboard Connections if they want it. Do not claim a connection or permission was enabled.';
  if(/stale|not available|unavailable|connected|sync/i.test(error?.message||''))return 'The connected demo summary is unavailable or incomplete. Do not invent amounts or reuse stale data as current. Offer to use student-shared totals or try again after checking Connections.';
 }
 if(name==='request_financial_plan'&&error?.message==='Explicit planning request required')return 'The plan did not queue. Use the exact current message as evidence. A casual yes can confirm a single immediately preceding named project-plan or data-sharing offer; otherwise ask one plain-language question about whether the student wants that plan. Do not call this a configuration failure.';
 const allowed=['Evidence amount required','Explicit source required','Explicit permission to save is required','Explicit weekly request required','Explicit scope required','Explicit cancellation required','Source message required','Evidence must quote the current student message'];
 return 'Tool did not save or calculate anything. '+(allowed.includes(error?.message)?error.message:'Invalid input or unavailable host action')+'. Use actual student-message evidence or ask for missing information. Never claim success.';
}
