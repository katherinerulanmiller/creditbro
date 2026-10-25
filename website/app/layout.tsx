import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Creditbro | Your credit coach, by text.',description:'Step into college life with Creditbro. Explore credit, spending, reminders, and a first-apartment plan.'};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
