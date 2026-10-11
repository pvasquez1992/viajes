export const sampleTrip = {
  schemaVersion:1,id:'escapada-demo-2026',title:'Un fin de semana sin prisa',destination:'Harpers Ferry',startDate:'2026-10-31',endDate:'2026-11-01',timezone:'America/New_York',description:'Ejemplo ficticio de un viaje en pareja: calles históricas, paseos cortos y tiempo para descansar.',theme:'forest',reservations:[],
  days:[
    {date:'2026-10-31',title:'Llegar y descubrir el pueblo',activities:[
      {id:'llegada',time:'10:00',durationMinutes:60,period:'morning',title:'Llegada y café',description:'Parada de ejemplo. Lugar y disponibilidad pendientes de comprobar.',location:'Lower Town',kind:'food',sourceUrls:[]},
      {id:'paseo',time:'11:15',durationMinutes:60,period:'morning',title:'Paseo por las calles históricas',description:'Recorrido tranquilo de ejemplo, con pausas para fotografías.',location:'Harpers Ferry Historic District',kind:'walk',sourceUrls:[]},
      {id:'almuerzo',time:'13:00',durationMinutes:60,period:'afternoon',title:'Almuerzo sin prisa',description:'Elegir un restaurante al revisar el plan. No hay reserva.',location:'Lower Town',kind:'food',sourceUrls:[]},
      {id:'descanso',time:'15:00',durationMinutes:90,period:'afternoon',title:'Descanso y tiempo libre',description:'Alojamiento pendiente. Esta actividad no confirma un hotel.',location:null,kind:'rest',sourceUrls:[]},
      {id:'noche',time:'18:00',durationMinutes:60,period:'evening',title:'Paseo al atardecer',description:'Propuesta de ejemplo. Comprobar condiciones y horario del lugar.',location:'Bolivar',kind:'walk',sourceUrls:[]},
    ]},
    {date:'2026-11-01',title:'Una mañana tranquila y regreso',activities:[
      {id:'desayuno',time:'09:00',durationMinutes:60,period:'morning',title:'Desayuno y última vuelta',description:'Ejemplo ficticio para comprobar el segundo día.',location:'Lower Town',kind:'food',sourceUrls:[]},
      {id:'regreso',time:'12:00',durationMinutes:120,period:'afternoon',title:'Regreso a casa',description:'Duración estimada de ejemplo. Ajustar al origen real.',location:null,kind:'transport',sourceUrls:[]},
    ]},
  ],
};
