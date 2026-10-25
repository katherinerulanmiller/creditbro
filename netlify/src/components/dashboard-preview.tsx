export default function DashboardPreview({initialView='week'}:{spendingOnly?:boolean,initialView?:string}){
 const screens:Record<string,[string,string]>={credit:['home-credit.svg','Credit overview with bureau scores and card usage'],week:['home-week.svg','Weekly spending overview'],reminders:['library.png','Library with upcoming reminders and saved reports'],project:['goal.svg','Apartment planning screen'],overview:['home-week.svg','Creditbro Home dashboard']};
 const screen=screens[initialView]||screens.week;
 return <figure className="static-figma-preview">{initialView==='chat'?<div className="static-chat-screen"><img src="/assets/final/text-raster-header.png" alt="Creditbro conversation header"/><img src="/assets/final/text-raster-messages.png" alt="Example conversation with Creditbro"/></div>:<img src={'/assets/final/'+screen[0]} alt={screen[1]}/>}</figure>
}
