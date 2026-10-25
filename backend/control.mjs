// Operator pause is independent of a student's STOP and cannot be bypassed by --enable.
export function startPolicy(control,args){
 if(!args.includes('--enable'))return {start:false,resume:false};
 if(control?.paused&&!args.includes('--resume'))throw Error('Operator paused this bridge. Explicit --resume is required after user authorization.');
 return {start:true,resume:!!control?.paused};
}
export function resumeSession(state,at){
 // Do not process messages sent while another teammate was testing during our pause.
 state.cutoff=at;state.processing=null;state.queue=[];state.epoch++;
 for(const o of state.outbox)if(o.status==='queued')o.status='cancelled-operator-pause';
 return state;
}
