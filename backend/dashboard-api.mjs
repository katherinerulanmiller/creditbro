// Same-origin frontend adapter. Importing it makes no requests or UI changes.
export async function fetchDashboard({month,signal,fetcher=fetch}={}){
 if(month!==undefined&&!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Choose a month in YYYY-MM format.');
 const response=await fetcher('/api/dashboard'+(month?'?month='+encodeURIComponent(month):''),{method:'GET',credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'},signal});
 if(!response.ok){const error=Error(response.status===401?'Sign in to view your dashboard.':response.status===403?'This session does not own the dashboard.':'Dashboard data is unavailable. Try again shortly.');error.status=response.status;throw error;}
 const data=await response.json();if(data?.schema_version!==1||data.currency!=='USD'||!data.spending||!Array.isArray(data.projects)||!Array.isArray(data.reports)||!Array.isArray(data.connections)||!Array.isArray(data.reminders))throw Error('Unsupported dashboard data.');return data;
}
