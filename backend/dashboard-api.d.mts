/** Version 1 read contract. All money is integer USD cents; null means unknown. */
export type IsoDateTime = string;
export type Money = number | null;
export interface Plan {
  status: 'proposal'; summary: string | null; message: string | null;
  priorities: Array<{id:string;title:string|null;rationale:string|null;actual_deadline:string|null;suggested_deadline:string|null;steps:string[];assumptions:string[];source_refs:string[]}>;
  missing_information: string[]; changes: Array<{detail:string|null;impact?:string|null}>;
  external_actions_executed: false;
}
export interface DashboardData {
  schema_version: 1; generated_at: IsoDateTime; currency: 'USD';
  profile: Record<string,string|null>;
  coach: {name:'creditbro';mode:string;operator_paused:boolean};
  spending: {status:'available'|'partial'|'unavailable'|'not_connected';month:string;source:string|null;fictional:boolean;imported_at:IsoDateTime|null;income_cents:Money;spending_cents:Money;budget_cents:Money;budget_remaining_cents:Money;available_cash_cents:null;safe_to_spend_cents:null;categories:Array<{label:string|null;amount_cents:Money}>;compact_categories:Array<{label:string;amount_cents:number;color:string;icon:string;percent:number|null}>;daily_spending:Array<{date:string|null;amount_cents:Money}>;coverage:string};
  bills: {status:string;items:Array<{id:string;label:string|null;amount_cents:Money;planned_payment_date:string|null;issuer_due_date:null;current_status_verified:boolean;source:string|null;fictional:true}>};
  credit: {status:'not_selected'|'sandbox_available'|'unavailable';fictional:true;scores:Array<{bureau:string|null;model:string|null;value:number|null;retrieved_at:IsoDateTime|null}>;accounts:Array<{bureau:string|null;type:string|null;balance_cents:Money;limit_cents:Money;reported_date:string|null;utilization_percent:number|null}>;student_reported:{balance_cents:Money;limit_cents:Money};on_time_payment_count:null;score_change:null;identity_verified:false};
  reports: Array<{id:string;kind:'monthly'|'weekly';source:string;fictional:boolean;status:'available'|'partial';created_at:IsoDateTime|null;period_start:string;period_end_exclusive:string;total_cents:Money;categories:Array<{label:string|null;amount_cents:Money}>;coverage_label:string;coverage:{days_covered:number|null;days_expected:number|null};image_url:string}>;
  projects: Array<{id:string;title:string|null;status:string;created_at:IsoDateTime|null;actual_deadline:string|null;suggested_deadline:string|null;planning_status:string;plan:Plan|null;progress:{status:'not_tracked';completed_steps:null};actions:{update_via_text:true;edit_tasks:false}}>;
  main_plan: Plan | null;
  reminders: Array<{id:string;kind:string;title:string|null;status:string;scheduled_at:IsoDateTime|null;timezone:string|null;recurrence:'once'|'weekly'|'monthly';delivery_hold:'operator_paused'|'coach_paused'|'quiet_hours'|null;deliveries:Array<{kind:'image'|'text';status:string;scheduled_for:IsoDateTime|null}>}>;
  pending_reminder: {kind:string;title:string|null;scheduled_at:IsoDateTime|null;timezone:string|null;status:'awaiting_confirmation'} | null;
  timeline: Array<{id:string;type:string|null;title:string|null;at:IsoDateTime|null;project_id:string|null;report_id:string|null}>;
  connections: Array<{id:string;label:string;status:string;fictional?:boolean;summary_sharing?:boolean;last_synced_at?:IsoDateTime|null;sharing?:boolean;bank_summary_sharing?:boolean;controls_available:boolean}>;
  preferences: {timezone:string|null;quiet_hours:string|null;check_in_frequency:string|null;monthly_report_preference:string|null;weekly_report_preference:string|null;monthly_reports_scheduled:boolean;weekly_checkins_scheduled:boolean};
  capabilities: {read_only:true;bank_controls:true;texting_actions:false;project_task_editing:false;reminder_editing:false;account_oauth:false;public_hosting:false};
}
export function fetchDashboard(options?: {month?:string;signal?:AbortSignal;fetcher?:typeof fetch}): Promise<DashboardData>;
