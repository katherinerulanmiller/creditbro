'use client';
import {useEffect} from 'react';
export default function BrandIntro({onDone}:{onDone:()=>void}){
 useEffect(()=>{const timer=window.setTimeout(onDone,2000);const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onDone()};window.addEventListener('keydown',key);return()=>{window.clearTimeout(timer);window.removeEventListener('keydown',key)}},[onDone]);
 return <div className="brand-intro brand-intro-minimal" role="status" aria-label="Creditbro"><div className="intro-logo" aria-hidden="true"><img src="/assets/logo.svg" width="62" height="62" alt=""/><span className="intro-typed">{'creditbro'.split('').map((letter,i)=><span key={i} style={{animationDelay:`${220+i*95}ms`}}>{letter}</span>)}</span></div></div>
}
