'use client';
import {useEffect,useState} from 'react';
export default function BrandIntro({onDone}:{onDone:()=>void}){
 const [letters,setLetters]=useState(0);
 useEffect(()=>{const typing=window.setInterval(()=>setLetters(n=>Math.min(9,n+1)),145);const timer=window.setTimeout(onDone,2700);const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onDone()};window.addEventListener('keydown',key);return()=>{window.clearInterval(typing);window.clearTimeout(timer);window.removeEventListener('keydown',key)}},[onDone]);
 return <div className="brand-intro brand-intro-minimal" role="status" aria-label="Creditbro"><div className="intro-logo" aria-hidden="true"><img src="/assets/logo.svg" width="62" height="62" alt=""/><span className="intro-typed">{'creditbro'.split('').map((letter,i)=><span key={i} style={{opacity:i<letters?1:0,animation:'none',transition:'opacity 120ms ease-out'}}>{letter}</span>)}</span></div></div>
}
