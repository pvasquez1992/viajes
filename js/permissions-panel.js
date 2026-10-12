// Administration is independent of the model. All decisions are enforced by the API.
export function attachPermissions(root,api) {
  const button=document.createElement('button');button.type='button';button.textContent='Permisos';button.className='permissions-button';
  root.getElementById('new-chat').before(button);
  const dialog=document.createElement('dialog');dialog.className='permissions-dialog';dialog.setAttribute('aria-label','Administrar permisos de BookTrip');
  dialog.innerHTML=`<header><h2>Permisos del libro</h2><button type="button" data-close aria-label="Cerrar permisos">×</button></header>
    <p>Todos los usuarios autorizados por Cloudflare pueden leer el libro. Aquí controlas quién puede crear y editar.</p>
    <p class="permissions-status" role="status" aria-live="polite"></p><div data-content></div>`;
  root.append(dialog);
  const content=dialog.querySelector('[data-content]'),status=dialog.querySelector('[role=status]');let data,selectedId='',busy=false;
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  const node=(tag,text)=>{const value=document.createElement(tag);if(text)value.textContent=text;return value;};
  function emailInput(label) {const wrapper=node('label',label),input=node('input');input.type='email';input.required=true;input.maxLength=254;input.autocomplete='email';wrapper.append(input);return {wrapper,input};}
  function roleSelect(value='creator') {
    const select=node('select');select.setAttribute('aria-label','Rol general');
    for(const [role,label] of [['viewer','Lector'],['creator','Creador'],['admin','Administrador']]) {const option=node('option',label);option.value=role;select.append(option);}
    select.value=value;return select;
  }
  function submit(form,label,action) {const save=node('button',label);save.type='submit';form.append(save);form.onsubmit=event=>{event.preventDefault();if(!busy)action();};}
  async function change(body) {
    busy=true;status.textContent='Guardando permiso…';dialog.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);
    try {data=await api('admin',body);render();status.textContent='Permiso guardado. Se aplica en la siguiente solicitud; si el chat estaba abierto, recarga la página.';}
    catch(error) {status.textContent=error.message;}
    finally {busy=false;dialog.querySelectorAll('button,input,select').forEach(el=>el.disabled=false);}
  }
  function renderTrip(section) {
    section.replaceChildren();const trip=data.trips.find(trip=>trip.id===selectedId);if(!trip)return;
    section.append(node('p','Creado por: '+trip.owner),node('p','El creador puede editar y eliminar sus viajes. Un editor invitado puede editar, pero no eliminarlos. Los administradores gestionan todos.'));
    for(const email of trip.editors) {
      const row=node('div');row.className='permissions-row';row.append(node('span',email));const revoke=node('button','Retirar edición');revoke.type='button';revoke.onclick=()=>change({action:'trip-access',tripId:trip.id,email,permission:'view'});row.append(revoke);section.append(row);
    }
    const form=node('form'),email=emailInput('Dar edición a este correo');form.append(email.wrapper);submit(form,'Conceder edición',()=>change({action:'trip-access',tripId:trip.id,email:email.input.value,permission:'edit'}));section.append(form);
  }
  function render() {
    content.replaceChildren();content.append(node('h3','Roles generales'),node('p','Lector: consulta. Creador: crea y gestiona sus viajes. Administrador: gestiona viajes y permisos. La edición de un viaje también puede concederse por separado.'));
    for(const member of data.members) {
      const form=node('form');form.className='permissions-row';form.append(node('span',member.email));
      if(member.email===data.bootstrapAdmin || member.email===data.self) form.append(node('strong','Administrador'));
      else {const select=roleSelect(member.role);form.append(select);submit(form,'Guardar',()=>change({action:'role',email:member.email,role:select.value}));}
      content.append(form);
    }
    const add=node('form'),email=emailInput('Agregar o cambiar un usuario'),select=roleSelect();add.append(email.wrapper,select);submit(add,'Guardar rol',()=>change({action:'role',email:email.input.value,role:select.value}));content.append(add,node('p','Asignar un rol aquí no permite saltarse Cloudflare Access: el correo también debe estar autorizado para entrar.'),node('h3','Permisos por viaje'));
    if(!data.trips.length) {content.append(node('p','No hay viajes activos. Puedes consultar la carpeta Eliminados.'));return;}
    if(!data.trips.some(trip=>trip.id===selectedId))selectedId=data.trips[0].id;
    const label=node('label','Viaje'),trips=node('select');trips.setAttribute('aria-label','Viaje para asignar permisos');
    for(const trip of data.trips) {const option=node('option',trip.title);option.value=trip.id;trips.append(option);}
    trips.value=selectedId;label.append(trips);const section=node('section');trips.onchange=()=>{selectedId=trips.value;renderTrip(section);};content.append(label,section);renderTrip(section);
  }
  button.onclick=async()=>{dialog.showModal();status.textContent='Cargando permisos…';try {data=await api('admin');render();status.textContent='';}catch(error){status.textContent=error.message;}};
}
