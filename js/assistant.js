const host=document.createElement('booktrip-chat');
const root=host.attachShadow({mode:'open'});
root.innerHTML=`<link rel="stylesheet" href="/css/chat-widget.css">
<button class="launcher" id="launcher" type="button" aria-label="Abrir chat de BookTrip" aria-expanded="false" aria-controls="chat-panel" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a8.5 8.5 0 0 1 17 0Z"/><path d="M7 10h8M7 14h5"/></svg></button>
<section class="panel" id="chat-panel" role="dialog" aria-label="Chat de BookTrip" hidden>
<header class="header"><span class="mark" aria-hidden="true">✦</span><div class="heading"><h2>BookTrip</h2><p id="connection">Conectando…</p></div><button class="icon-button" id="new-chat" type="button" aria-label="Nueva conversación" title="Nueva conversación">↻</button><button class="icon-button" id="close" type="button" aria-label="Ocultar chat" title="Ocultar chat">×</button></header>
<div class="messages" id="messages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></div>
<div class="suggestions" id="suggestions"><button type="button" data-prompt="Quiero una escapada en pareja.">Una escapada</button><button type="button" data-prompt="Quiero organizar un roadtrip sin prisa.">Un roadtrip</button></div>
<p class="error" id="error" role="alert" hidden></p>
<form class="composer" id="chat-form"><textarea id="message" aria-label="Mensaje a BookTrip" rows="2" maxlength="4000" placeholder="¿A dónde nos vamos?" required></textarea><button class="send" id="send" type="submit" aria-label="Enviar mensaje" disabled>↑</button></form>
<p class="note">Tu viaje se guarda en el libro. Puedes ajustarlo aquí.<br>Los horarios son propuestas; no se realizan reservas.</p>
</section>`;
document.body.append(host);
const $=id=>root.getElementById(id);
let config=null,messages=[],conversationToken=null,busy=false,storageKey=null,trip=null,failedContent=null;
async function api(path,body) {
  const response=await fetch('/api/booktrip/'+path,{credentials:'same-origin',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)}:{})});
  if(!response.headers.get('Content-Type')?.includes('application/json')) throw Error('Inicia sesión para usar BookTrip.');
  const result=await response.json();
  if(!response.ok) throw Error(result.error?.message || 'No pudimos completar la solicitud.');
  return result.data;
}
function setOpen(open) {
  $('chat-panel').hidden=!open;
  $('launcher').setAttribute('aria-expanded',String(open));
  $('launcher').setAttribute('aria-label',open?'Ocultar chat de BookTrip':'Abrir chat de BookTrip');
  if(open) {$('launcher').removeAttribute('data-unread');$('messages').scrollTop=$('messages').scrollHeight;}
  if(!open) $('launcher').focus();
}
function showError(message='') {$('error').hidden=!message;$('error').textContent=message;}
function controls() {
  const ready=config?.canCreate && config.aiReady && config.storageReady && config.sessionReady;
  $('send').disabled=busy || !ready;
  $('message').disabled=busy || !ready;
  $('new-chat').disabled=busy;
  root.querySelectorAll('[data-prompt]').forEach(button=>button.disabled=busy || !ready);
}
function validTrip(value) {return value && typeof value.title==='string' && /^\/trips\/[a-z0-9][a-z0-9-]{2,63}\/$/.test(value.url);}
function appendMessage(role,content,extra={}) {
  const item=document.createElement('div');item.className='message '+role+(extra.pending?' pending':'');
  const author=document.createElement('span');author.className='author';author.textContent=role==='user'?'Tú':'BookTrip';
  item.append(author,document.createTextNode(content));
  if(validTrip(extra.trip)) {const link=document.createElement('a');link.className='trip-link';link.href=extra.trip.url;link.append(document.createTextNode('Abrir '+extra.trip.title+' ↗'));item.append(link);}
  if(extra.warnings?.length) {const warning=document.createElement('small');warning.className='warning';warning.textContent=extra.warnings.slice(0,3).join(' ');item.append(warning);}
  $('messages').append(item);$('messages').scrollTop=$('messages').scrollHeight;return item;
}
function persist() {
  const history=busy && failedContent && messages.at(-1)?.role==='user'?messages.slice(0,-1):messages;
  if(storageKey) try {sessionStorage.setItem(storageKey,JSON.stringify({messages:history,conversationToken,trip,failedContent}));} catch {showError('No pudimos conservar esta conversación. Los viajes guardados siguen en tu libro.');}
}
async function sendMessage(content) {
  const text=content.trim();
  if(busy || !config?.canCreate || !config.aiReady || !config.storageReady || !config.sessionReady || !text) return;
  if(failedContent && text!==failedContent) {showError('Reintenta primero el mismo mensaje para comprobar si se guardó, o empieza una conversación nueva.');return;}
  if(messages.length>=20) {showError('Empieza otra conversación para continuar. Tu viaje ya guardado sigue en el libro.');return;}
  busy=true;failedContent=text;showError();messages.push({role:'user',content:text});const userMessage=appendMessage('user',text);$('message').value='';$('suggestions').hidden=true;controls();persist();
  const pending=appendMessage('assistant','Estoy preparando tu viaje…',{pending:true});
  try {
    const result=await api('chat',{messages:messages.map(({role,content})=>({role,content})),...(conversationToken?{conversationToken}:{})});
    if(typeof result?.reply!=='string' || !Array.isArray(result.warnings) || !result.warnings.every(item=>typeof item==='string') || (result.trip && (!validTrip(result.trip) || typeof result.conversationToken!=='string'))) throw Error('No pudimos confirmar el viaje. Reintenta el mismo mensaje.');
    pending.remove();const answer={role:'assistant',content:result.reply,...(result.trip?{trip:result.trip,warnings:result.warnings}:{})};messages.push(answer);appendMessage(answer.role,answer.content,answer);
    conversationToken=result.conversationToken || conversationToken;trip=result.trip || trip;failedContent=null;persist();
    if(result.trip) window.dispatchEvent(new CustomEvent('booktrip:saved',{detail:result.trip}));
    if($('chat-panel').hidden) $('launcher').setAttribute('data-unread','');
  } catch(error) {pending.remove();messages.pop();userMessage.remove();failedContent=text;$('message').value=text;showError(error.message);persist();}
  finally {busy=false;controls();}
}
$('launcher').addEventListener('click',()=>setOpen($('chat-panel').hidden));
$('close').addEventListener('click',()=>setOpen(false));
root.addEventListener('keydown',event=>{if(event.key==='Escape' && !$('chat-panel').hidden){event.preventDefault();setOpen(false);}});
$('chat-form').addEventListener('submit',event=>{event.preventDefault();sendMessage($('message').value);});
$('message').addEventListener('keydown',event=>{if(event.key==='Enter' && !event.shiftKey && !event.isComposing && !matchMedia('(pointer: coarse)').matches){event.preventDefault();sendMessage($('message').value);}});
root.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{$('message').value=button.dataset.prompt;$('message').focus();}));
$('new-chat').addEventListener('click',()=>{messages=[];conversationToken=null;trip=null;failedContent=null;$('messages').replaceChildren();appendMessage('assistant','¿A dónde te gustaría ir? Dime el destino y las fechas.');$('suggestions').hidden=false;$('message').value='';showError();persist();});
document.addEventListener('click',event=>{if(event.target.closest('[data-booktrip-open]') && config?.canCreate) {event.preventDefault();setOpen(true);}});
function viewport() {const view=window.visualViewport;host.style.setProperty('--bt-viewport',(view?.height || innerHeight)+'px');host.style.setProperty('--bt-keyboard',Math.max(0,innerHeight-(view?.height || innerHeight)-(view?.offsetTop || 0))+'px');}
window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);window.addEventListener('resize',viewport);viewport();
try {
  config=await api('config');
  if(!config.canCreate) {document.querySelectorAll('[data-booktrip-open]').forEach(element=>element.hidden=true);host.remove();}
  else {
    storageKey='booktrip-chat-v2:'+config.user.id;
    $('launcher').hidden=false;
    document.querySelectorAll('[data-booktrip-open]').forEach(element=>element.hidden=false);
    $('connection').textContent=config.demo?'Demostración local · sin IA':'Hola, '+config.user.name;
    $('connection').classList.toggle('demo',Boolean(config.demo));
    let saved;try{saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{}
    if(saved && Array.isArray(saved.messages) && saved.messages.length<=20 && saved.messages.every(m=>['user','assistant'].includes(m.role) && typeof m.content==='string')) {
      messages=saved.messages;conversationToken=typeof saved.conversationToken==='string'?saved.conversationToken:null;trip=validTrip(saved.trip)?saved.trip:null;failedContent=typeof saved.failedContent==='string'?saved.failedContent:null;
      messages.forEach(m=>appendMessage(m.role,m.content,m));
    }
    if(!messages.length) appendMessage('assistant','Hola, '+config.user.name+'. ¿A dónde nos vamos? Dime el destino y las fechas y lo añado a tu libro.');
    $('suggestions').hidden=messages.length>0;controls();
    if(failedContent) {$('message').value=failedContent;showError('Reintenta este mensaje para comprobar si se guardó, o empieza una conversación nueva.');}
    if(!config.aiReady || !config.storageReady || !config.sessionReady) showError('El chat necesita completar su conexión en Cloudflare.');
    if(new URL(location.href).searchParams.get('chat')==='open') setOpen(true);
  }
} catch(error) {
  // A failed identity check never exposes creation controls.
  host.remove();document.querySelectorAll('[data-booktrip-open]').forEach(element=>element.hidden=true);
  console.warn('BookTrip: '+error.message);
}
