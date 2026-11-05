// Local recording aid: follows actual pointer events and highlights real clicks.
// This file is not included in the deployed app.
const pointer=document.createElement('div');
pointer.setAttribute('aria-hidden','true');
pointer.style.cssText='position:fixed;left:60px;top:60px;width:25px;height:32px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 2px 3px #0005);transition:left .16s ease-out,top .16s ease-out';
pointer.innerHTML='<svg viewBox="0 0 25 32" width="25" height="32"><path d="M2 2 L2 25 L8 19 L13 30 L18 28 L13 17 L23 17 Z" fill="#182d24" stroke="white" stroke-width="2"/></svg>';
const style=document.createElement('style');style.textContent='*{cursor:none!important}';document.head.append(style);document.body.append(pointer);
function move(e){pointer.style.left=e.clientX+'px';pointer.style.top=e.clientY+'px';}
document.addEventListener('pointermove',move,true);
document.addEventListener('pointerdown',e=>{move(e);const ring=document.createElement('div');ring.style.cssText=`position:fixed;left:${e.clientX-20}px;top:${e.clientY-20}px;width:40px;height:40px;border:3px solid #366d4d;border-radius:50%;background:#c5e8b688;pointer-events:none;z-index:2147483646`;document.body.append(ring);ring.animate([{transform:'scale(.4)',opacity:1},{transform:'scale(1.6)',opacity:0}],{duration:650}).finished.then(()=>ring.remove());},true);
