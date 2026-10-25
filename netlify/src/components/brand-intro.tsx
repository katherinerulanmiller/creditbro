'use client';
import {useEffect,useRef} from 'react';
export default function BrandIntro({onDone}:{onDone:()=>void}){
 const skip=useRef<HTMLButtonElement>(null);
 useEffect(()=>{if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){onDone();return}skip.current?.focus({preventScroll:true});const timer=window.setTimeout(onDone,2000);return()=>window.clearTimeout(timer)},[onDone]);
 return <div className="brand-intro" role="dialog" aria-modal="true" aria-label="Welcome to Creditbro" onKeyDown={e=>{if(e.key==='Escape')onDone()}}><div className="intro-lockup"><div className="intro-files" aria-hidden="true"><span/><span/><span/><span/></div><div className="intro-logo"><img src="/assets/logo.svg" width="62" height="62" alt=""/><span>creditbro</span></div><p>Your credit coach, by text</p></div><button ref={skip} className="intro-skip" onClick={onDone}>Skip intro ↗</button></div>
}
