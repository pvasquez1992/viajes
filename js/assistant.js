import { renderTrip } from './trip-view.js';
import { validateTrip } from './trip-contract.js';
const $=id=>document.getElementById(id);
let config=null,messages=[],draft=null,busy=false,storageKey=null,publication=null;
function showError(message='') {$('error').hidden=!message;$('error').textContent=message;}
async function api(path,body) {
  const response=await fetch(`/api/booktrip/${path}`,{credentials:'same-origin',cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)}:{})});
  if(!response.headers.get('Content-Type')?.includes('application/json')) throw Error('Inicia sesión para usar el asistente.');
  const result=await response.json();
  if(!response.ok) throw Error(result.error?.message || 'No pudimos completar la solicitud.');
  return result.data;
}
function appendMessage(role,content,pending=false) {
  const item=document.createElement('div'); item.className=`message ${role}${pending?' pending':''}`;
  const author=document.createElement('span');author.className='message-author';author.textContent=role==='user'?'Tú':'BookTrip';
  item.append(author,document.createTextNode(content));$('messages').append(item);$('messages').scrollTop=$('messages').scrollHeight;return item;
}
function persist() {if(storageKey) try {sessionStorage.setItem(storageKey,JSON.stringify({messages,draft,publication}));} catch {showError('No pudimos conservar el borrador en esta pestaña. Descárgalo antes de salir.');}}
function controls() {$('send').disabled=busy || !config?.aiReady || !config?.draftsReady;$('message').disabled=busy;$('publish').disabled=busy || !draft || !config?.publishingReady || Boolean(publication);$('new-chat').disabled=busy;$('download').disabled=busy;document.querySelectorAll('[data-prompt]').forEach(button=>button.disabled=busy);}
function showDraft() {
  $('draft-empty').hidden=Boolean(draft);$('draft').hidden=!draft;$('draft-actions').hidden=!draft;$('draft-badge').textContent=draft?'Por revisar':'Por empezar';
  if(draft) {renderTrip($('draft'),draft.trip,draft.warnings);$('draft-notice').textContent=config?.publishingReady?'Revísalo y prepara una propuesta para añadirlo al libro.':config?.demo?'Ejemplo ficticio para probar la interfaz. La publicación está desactivada.':'Tu borrador está listo. Falta conectar la publicación con el repositorio; puedes descargarlo mientras tanto.';}
  $('publication').hidden=!publication;
  if(publication) {const link=document.createElement('a');link.href=publication.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=`Abrir propuesta #${publication.number} ↗`;$('publication').replaceChildren(document.createTextNode(publication.state==='review'?'La propuesta está preparada. El viaje se añadirá al libro al integrarla y completar el despliegue. ':publication.state==='merged'?'La propuesta se integró; comprueba el despliegue para ver el viaje. ':'La propuesta está cerrada; prepara un nuevo borrador. '),link);}
  controls();
}
async function sendMessage(content) {
  if(busy || !config?.aiReady || !config?.draftsReady || !content.trim()) return;
  if(messages.length>=20) {showError('Esta conversación alcanzó su límite. Descarga el borrador y empieza otra para un nuevo viaje.');return;}
  busy=true;showError();messages.push({role:'user',content:content.trim()});const userMessage=appendMessage('user',content.trim());$('message').value='';$('suggestions').hidden=true;controls();
  const pending=appendMessage('assistant','Estoy preparando tu viaje…',true);
  try {
    const result=await api('chat',{messages,...(draft?{draftToken:draft.draftToken}:{})});
    if(typeof result?.reply!=='string' || !Array.isArray(result.warnings) || !result.warnings.every(item=>typeof item==='string')) throw Error('El asistente devolvió una respuesta incompleta. Tu borrador se conserva.');
    if(result.trip) {validateTrip(result.trip);if(typeof result.draftToken!=='string')throw Error('El asistente no confirmó el borrador.');}
    pending.remove();messages.push({role:'assistant',content:result.reply});appendMessage('assistant',result.reply);
    if(result.trip) {draft=result;publication=null;showDraft();}
    persist();
  } catch(error) {pending.remove();messages.pop();userMessage.remove();$('message').value=content;showError(error.message);}
  finally {busy=false;controls();$('message').focus();}
}
$('chat-form').addEventListener('submit',event=>{event.preventDefault();sendMessage($('message').value);});
$('message').addEventListener('keydown',event=>{if(event.key==='Enter' && !event.shiftKey && !event.isComposing && !matchMedia('(pointer: coarse)').matches){event.preventDefault();sendMessage($('message').value);}});
document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{$('message').value=button.dataset.prompt;$('message').focus();}));
$('new-chat').addEventListener('click',()=>{if(draft && !confirm('¿Empezar otra conversación? Descarga primero el borrador si quieres conservarlo.')) return;messages=[];draft=null;publication=null;$('messages').replaceChildren();appendMessage('assistant','¿A dónde te gustaría ir? Cuéntame el destino, las fechas y lo que te apetece hacer.');$('suggestions').hidden=false;$('message').value='';showError();showDraft();persist();});
$('download').addEventListener('click',()=>{if(!draft)return;const url=URL.createObjectURL(new Blob([JSON.stringify(draft.trip,null,2)+'\n'],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`${draft.trip.id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('publish').addEventListener('click',()=>{$('privacy-reviewed').checked=false;$('confirm-publish').disabled=true;$('publish-dialog').showModal();});
$('privacy-reviewed').addEventListener('change',()=>{$('confirm-publish').disabled=!$('privacy-reviewed').checked;});
$('publish-dialog').addEventListener('close',async()=>{
  if($('publish-dialog').returnValue!=='confirm' || !$('privacy-reviewed').checked || !draft || busy) return;
  busy=true;controls();showError();
  try {publication=await api('publish',{draftToken:draft.draftToken,approved:true,privacyReviewed:true});persist();showDraft();}
  catch(error){showError(error.message);}finally{busy=false;controls();}
});
try {
  config=await api('config');storageKey=`booktrip-assistant-v1:${config.user.id}`;
  $('connection').textContent=config.demo?'Demostración · sin IA':config.aiReady && config.draftsReady?`Hola, ${config.user.name} · asistente conectado`:'Asistente pendiente de configuración';
  $('connection').classList.toggle('ready',config.aiReady && config.draftsReady && !config.demo);$('demo-banner').hidden=!config.demo;
  let saved;try {saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');} catch { /* A corrupt draft must never prevent opening a new conversation. */ }
  if(saved && Array.isArray(saved.messages) && saved.messages.every(m=>['user','assistant'].includes(m.role) && typeof m.content==='string')) {
    messages=saved.messages.slice(0,20);
    try {if(saved.draft?.trip) {renderTrip($('draft'),saved.draft.trip,saved.draft.warnings);draft=saved.draft;} } catch {draft=null;}
    if(saved.publication && /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/pull\/\d+$/.test(saved.publication.url)) publication=saved.publication;
    messages.forEach(m=>appendMessage(m.role,m.content));
  }
  if(!messages.length) appendMessage('assistant',`Hola, ${config.user.name}. ¿A dónde te gustaría ir? Cuéntame las fechas y el tipo de viaje que tienes en mente.`);
  $('suggestions').hidden=messages.length>0;showDraft();
  if(!config.aiReady || !config.draftsReady) showError('El chat necesita completar su configuración en Cloudflare. No generaremos respuestas simuladas.');
} catch(error) {$('connection').textContent='Conexión pendiente';appendMessage('assistant','Aquí podrás crear tu próximo viaje conversando.');showError(error.message);controls();}
