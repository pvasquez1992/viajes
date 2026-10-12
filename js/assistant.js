import { legacyTrips } from './trip-library.js';
import { attachPermissions } from './permissions-panel.js';
const host=document.createElement('booktrip-chat');
const root=host.attachShadow({mode:'open'});
root.innerHTML=`<link rel="stylesheet" href="/css/chat-widget.css">
<button class="launcher" id="launcher" type="button" aria-label="Abrir chat de BookTrip" aria-expanded="false" aria-controls="chat-panel" hidden><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-2 2V11.5a8.5 8.5 0 0 1 17 0Z"/><path d="M7 10h8M7 14h5"/></svg></button>
<section class="panel" id="chat-panel" role="dialog" aria-label="Chat de BookTrip" hidden>
<header class="header"><span class="mark" aria-hidden="true">✦</span><div class="heading"><h2>BookTrip</h2><p id="connection">Conectando…</p></div><button class="icon-button" id="new-chat" type="button" aria-label="Nueva conversación" title="Nueva conversación">↻</button><button class="icon-button" id="close" type="button" aria-label="Ocultar chat" title="Ocultar chat">×</button></header>
<div class="messages" id="messages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></div>
<div class="suggestions" id="suggestions"><button type="button" data-prompt="¿Qué viajes tengo guardados?">Mis viajes</button><button type="button" data-prompt="Quiero una escapada en pareja.">Una escapada</button></div>
<p class="error" id="error" role="alert" hidden></p>
<form class="composer" id="chat-form"><textarea id="message" aria-label="Mensaje a BookTrip" rows="2" maxlength="4000" placeholder="¿A dónde nos vamos?" required></textarea><button class="send" id="send" type="submit" aria-label="Enviar mensaje" disabled>↑</button></form>
<p class="note">Solo puedes ajustar tus viajes o los que te asignen.<br>Los horarios son propuestas; no se realizan reservas.</p>
</section>`;
document.body.append(host);
const $=id=>root.getElementById(id);
let config=null,messages=[],conversationToken=null,busy=false,storageKey=null,trip=null,failedContent=null,removalRetry=null;
async function api(path,body) {
  const response=await fetch('/api/booktrip/'+path,{credentials:'same-origin',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)}:{})});
  if(!response.headers.get('Content-Type')?.includes('application/json')) throw Error('Inicia sesión para usar BookTrip.');
  const result=await response.json();
  if(!response.ok) {const error=Error(result.error?.message || 'No pudimos completar la solicitud.');error.status=response.status;throw error;}
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
  const ready=config?.canChat && config.aiReady && config.storageReady && config.sessionReady;
  $('send').disabled=busy || !ready;
  $('message').disabled=busy || !ready;
  $('new-chat').disabled=busy;
  root.querySelectorAll('[data-prompt]').forEach(button=>button.disabled=busy || !ready);
  root.querySelectorAll('.removal-actions button').forEach(button=>button.disabled=busy || !ready || button.closest('.removal-card').dataset.resolved==='true');
}
function validRemoval(value) {return value && /^[a-z0-9][a-z0-9-]{2,63}$/.test(value.id) && typeof value.title==='string' && typeof value.start==='string' && typeof value.end==='string' && typeof value.confirmationToken==='string';}
function validTrip(value) {return value && typeof value.title==='string' && (/^\/trips\/[a-z0-9][a-z0-9-]{2,63}\/$/.test(value.url) || legacyTrips.some(entry=>'/'+entry.href===value.url));}
function tripLink(value,list=false) {
  const link=document.createElement('a');link.className='trip-link';link.href=value.url;
  const label=document.createElement('span');label.textContent=(list?'':'Abrir ')+value.title+' ↗';link.append(label);
  if(list && typeof value.start==='string' && typeof value.end==='string') {const dates=document.createElement('small');dates.textContent=value.start+' → '+value.end;link.append(dates);}
  if(list && typeof value.editable==='boolean') {const permission=document.createElement('small');permission.textContent=value.editable?'Puedes ajustar este viaje':'Solo lectura';link.append(permission);}
  return link;
}
function appendMessage(role,content,extra={}) {
  const item=document.createElement('div');item.className='message '+role+(extra.pending?' pending':'');
  const author=document.createElement('span');author.className='author';author.textContent=role==='user'?'Tú':'BookTrip';
  item.append(author,document.createTextNode(content));
  if(validTrip(extra.trip)) item.append(tripLink(extra.trip));
  if(Array.isArray(extra.trips)) {const list=document.createElement('div');list.className='trip-list';for(const entry of extra.trips) if(validTrip(entry)) list.append(tripLink(entry,true));item.append(list);}
  if(validRemoval(extra.pendingRemoval)) {
    const card=document.createElement('div');card.className='removal-card';card.dataset.resolved=String(Boolean(extra.removalResolved));
    const title=document.createElement('strong');title.textContent=extra.pendingRemoval.title;
    const dates=document.createElement('small');dates.textContent=extra.pendingRemoval.start+' → '+extra.pendingRemoval.end;
    const actions=document.createElement('div');actions.className='removal-actions';
    const confirm=document.createElement('button');confirm.type='button';confirm.textContent='Eliminar viaje';confirm.className='remove-confirm';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancelar';
    confirm.addEventListener('click',()=>confirmRemoval(extra));
    cancel.addEventListener('click',()=>{if(busy || extra.removalResolved)return;extra.removalResolved=true;card.dataset.resolved='true';const answer={role:'assistant',content:removalRetry?'Dejé de reintentar la eliminación. Consulta la lista para comprobar el estado del viaje.':'Cancelé la solicitud de eliminación.'};removalRetry=null;messages.push(answer);appendMessage(answer.role,answer.content);persist();controls();});
    actions.append(confirm,cancel);card.append(title,dates,actions);item.append(card);
  }
  if(extra.warnings?.length) {const warning=document.createElement('small');warning.className='warning';warning.textContent=extra.warnings.slice(0,3).join(' ');item.append(warning);}
  $('messages').append(item);$('messages').scrollTop=$('messages').scrollHeight;return item;
}
function persist() {
  const history=busy && failedContent && messages.at(-1)?.role==='user'?messages.slice(0,-1):messages;
  if(storageKey) try {sessionStorage.setItem(storageKey,JSON.stringify({messages:history,conversationToken,trip,failedContent,removalRetry}));} catch {showError('No pudimos conservar esta conversación. Los viajes guardados siguen en tu libro.');}
}
function resolveRemovals() {
  for(const message of messages) if(message.pendingRemoval) message.removalResolved=true;
  root.querySelectorAll('.removal-card').forEach(card=>card.dataset.resolved='true');
}
async function confirmRemoval(message) {
  if(busy || message.removalResolved || !config?.canChat || !validRemoval(message.pendingRemoval)) return;
  const target=message.pendingRemoval;busy=true;removalRetry=target.id;showError();controls();persist();
  try {
    const result=await api('remove',{confirmationToken:target.confirmationToken});
    if(result.removed?.id!==target.id || typeof result.reply!=='string') throw Error('Respuesta de eliminación incompleta.');
    resolveRemovals();removalRetry=null;conversationToken=null;trip=null;
    // Keep the same history limit as regular chat turns.
    if(messages.length>18) messages=messages.slice(-18);
    const confirmation={role:'user',content:'Confirmo eliminar «'+target.title+'».'};messages.push(confirmation);appendMessage(confirmation.role,confirmation.content);
    const answer={role:'assistant',content:result.reply};messages.push(answer);appendMessage(answer.role,answer.content);persist();
    window.dispatchEvent(new CustomEvent('booktrip:removed',{detail:result.removed}));
  } catch(error) {
    if([400,409,410].includes(error.status)) {resolveRemovals();removalRetry=null;showError(error.message);}
    else showError(error.message+' Puedes reintentar con Eliminar viaje.');
    persist();
  }
  finally {busy=false;controls();}
}
async function sendMessage(content) {
  const text=content.trim();
  if(busy || !config?.canChat || !config.aiReady || !config.storageReady || !config.sessionReady || !text) return;
  if(removalRetry) {showError('Reintenta primero la eliminación pendiente con su botón para comprobar el resultado, o empieza una conversación nueva.');return;}
  if(failedContent && text!==failedContent) {showError('Reintenta primero el mismo mensaje para comprobar si se guardó, o empieza una conversación nueva.');return;}
  if(messages.length>=20) {showError('Empieza otra conversación para continuar. Tu viaje ya guardado sigue en el libro.');return;}
  busy=true;failedContent=text;showError();messages.push({role:'user',content:text});const userMessage=appendMessage('user',text);$('message').value='';$('suggestions').hidden=true;controls();persist();
  const pending=appendMessage('assistant','Estoy revisando tu petición…',{pending:true});
  try {
    const result=await api('chat',{messages:messages.map(({role,content})=>({role,content})),...(conversationToken?{conversationToken}:{})});
    if(typeof result?.reply!=='string' || !Array.isArray(result.warnings) || !result.warnings.every(item=>typeof item==='string') || (result.trip && !validTrip(result.trip)) || (result.saved!==false && result.trip && typeof result.conversationToken!=='string') || (result.trips && (!Array.isArray(result.trips) || !result.trips.every(validTrip)))) throw Error('No pudimos confirmar la respuesta. Reintenta el mismo mensaje.');
    if(result.pendingRemoval && !validRemoval(result.pendingRemoval)) throw Error('No pudimos identificar el viaje para eliminar.');
    resolveRemovals();pending.remove();const answer={role:'assistant',content:result.reply,...(result.trip?{trip:result.trip,warnings:result.warnings}:{}),...(result.trips?{trips:result.trips}:{}),...(result.pendingRemoval?{pendingRemoval:result.pendingRemoval}:{})};messages.push(answer);appendMessage(answer.role,answer.content,answer);
    conversationToken=result.conversationToken ?? null;trip=result.trip || (conversationToken?trip:null);failedContent=null;persist();
    if(result.trip && result.saved!==false) {config.canEdit=true;window.dispatchEvent(new CustomEvent('booktrip:saved',{detail:result.trip}));}
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
function greeting() {return 'Puedes consultar los viajes del libro.'+(config?.canEdit?' También puedes ajustar los viajes para los que tienes permiso.':' Actualmente no tienes viajes con permiso de edición.')+(config?.canCreate?' Puedes crear un viaje nuevo.':'');}
$('new-chat').addEventListener('click',()=>{messages=[];conversationToken=null;trip=null;failedContent=null;removalRetry=null;$('messages').replaceChildren();appendMessage('assistant',greeting());$('suggestions').hidden=false;$('message').value='';showError();persist();});
document.addEventListener('click',event=>{if(event.target.closest('[data-booktrip-open]') && config?.canChat) {event.preventDefault();setOpen(true);}});
function viewport() {const view=window.visualViewport;host.style.setProperty('--bt-viewport',(view?.height || innerHeight)+'px');host.style.setProperty('--bt-keyboard',Math.max(0,innerHeight-(view?.height || innerHeight)-(view?.offsetTop || 0))+'px');}
window.visualViewport?.addEventListener('resize',viewport);window.visualViewport?.addEventListener('scroll',viewport);window.addEventListener('resize',viewport);viewport();
try {
  config=await api('config');
  if(!config.canChat) {document.querySelectorAll('[data-booktrip-open]').forEach(element=>element.hidden=true);host.remove();}
  else {
    storageKey='booktrip-chat-v3:'+config.user.id;
    $('launcher').hidden=false;
    document.querySelectorAll('[data-booktrip-open]').forEach(element=>element.hidden=false);
    $('connection').textContent=config.demo?'Demostración local · sin IA':'Hola, '+config.user.name;
    $('connection').classList.toggle('demo',Boolean(config.demo));
    if(config.canAdmin) attachPermissions(root,api);
    if(config.canCreate) {const link=document.createElement('a');link.href='/eliminados/';link.textContent='Eliminados';link.className='permissions-button';$('chat-panel').querySelector('.note').append(document.createElement('br'),link);const library=document.querySelector('.library-panel');if(library){const shortcut=link.cloneNode(true);shortcut.className='filter-button';shortcut.style.cssText='display:inline-flex;margin-bottom:16px;text-decoration:none';library.before(shortcut);}}
    let saved;try{saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{}
    if(saved && Array.isArray(saved.messages) && saved.messages.length<=20 && saved.messages.every(m=>['user','assistant'].includes(m.role) && typeof m.content==='string')) {
      messages=saved.messages;conversationToken=typeof saved.conversationToken==='string'?saved.conversationToken:null;trip=validTrip(saved.trip)?saved.trip:null;failedContent=typeof saved.failedContent==='string'?saved.failedContent:null;
      removalRetry=typeof saved.removalRetry==='string'?saved.removalRetry:null;
      messages.forEach(m=>appendMessage(m.role,m.content,m));
    }
    if(!messages.length) appendMessage('assistant','Hola, '+config.user.name+'. '+greeting());
    $('suggestions').hidden=messages.length>0;controls();
    if(failedContent) {$('message').value=failedContent;showError('Reintenta este mensaje para comprobar si se guardó, o empieza una conversación nueva.');}
    if(removalRetry) showError('Reintenta la eliminación pendiente con Eliminar viaje para comprobar su resultado.');
    if(!config.aiReady || !config.storageReady || !config.sessionReady) showError('El chat necesita completar su conexión en Cloudflare.');
    if(new URL(location.href).searchParams.get('chat')==='open') setOpen(true);
  }
} catch(error) {
  // A failed identity check never exposes creation controls.
  host.remove();document.querySelectorAll('[data-booktrip-open]').forEach(element=>element.hidden=true);
  console.warn('BookTrip: '+error.message);
}
