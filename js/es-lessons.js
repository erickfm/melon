/**
 * Spanish mode content: short everyday dialogues for a beginner living at
 * home in Ojai with a native-speaker partner. Mornings, coffee, meals,
 * cooking, the garden, walks, errands, plans, feelings, his family.
 * Latin American (Mexican-leaning) Spanish. The learner's lines use feminine
 * forms (cansada, lista) because she'll need them.
 *
 * One dialogue per finished run, in order: simplest and most useful first.
 * Each has one key phrase she can say tomorrow; together they form her
 * phrasebook. Every word form needs an entry in GLOSS (checked by a test).
 */

export const ME = 'Tú';
export const HIM = 'Erick';
const TIA = 'Tía';

// [icon, scene (es), scene (en)], lines: [speaker, es, en], phrase: [es, en]
const d = (icon, es, en, lines, phrase) => ({ icon, scene: [es, en], lines, phrase });

export const DIALOGUES = [
  d('☕', 'en la mañana', 'in the morning', [
    [HIM, '¡Buenos días! ¿Cómo dormiste?', 'Good morning! How did you sleep?'],
    [ME, 'Muy bien, gracias. ¿Y tú?', 'Very well, thanks. And you?'],
    [HIM, 'Bien también.', 'Good too.'],
  ], ['¿Cómo dormiste?', 'How did you sleep?']),
  d('☕', 'el café', 'coffee', [
    [ME, '¿Quieres café?', 'Do you want coffee?'],
    [HIM, 'Sí, por favor.', 'Yes, please.'],
    [ME, '¿Con leche?', 'With milk?'],
    [HIM, 'Sí, con poquita leche.', 'Yes, with a little milk.'],
  ], ['¿Quieres café?', 'Do you want coffee?']),
  d('🍳', 'el desayuno', 'breakfast', [
    [HIM, '¿Qué quieres desayunar?', 'What do you want for breakfast?'],
    [ME, 'Huevos con tortillas, por favor.', 'Eggs with tortillas, please.'],
    [HIM, 'Ahorita los hago.', "I'll make them right now."],
  ], ['¿Qué quieres desayunar?', 'What do you want for breakfast?']),
  d('😋', 'en la mesa', 'at the table', [
    [HIM, '¿Qué tal está?', 'How is it?'],
    [ME, '¡Está riquísimo!', "It's delicious!"],
    [HIM, 'Me da gusto.', "I'm glad."],
  ], ['¡Está riquísimo!', "It's delicious!"]),
  d('🧂', 'en la mesa', 'at the table', [
    [ME, '¿Me pasas la sal, por favor?', 'Can you pass me the salt, please?'],
    [HIM, 'Claro, aquí está.', 'Sure, here it is.'],
    [ME, 'Gracias.', 'Thanks.'],
  ], ['¿Me pasas la sal?', 'Can you pass me the salt?']),
  d('🙏', 'después de comer', 'after eating', [
    [ME, 'Gracias por la comida.', 'Thanks for the food.'],
    [HIM, 'De nada, mi amor.', "You're welcome, my love."],
  ], ['Gracias por la comida.', 'Thanks for the food.']),
  d('🍽️', 'antes de comer', 'before eating', [
    [ME, 'Tengo hambre.', "I'm hungry."],
    [HIM, 'Yo también. ¿Hacemos algo de comer?', 'Me too. Should we make something to eat?'],
    [ME, 'Sí, ¡buena idea!', 'Yes, good idea!'],
  ], ['Tengo hambre.', "I'm hungry."]),
  d('❤️', 'en la cocina', 'in the kitchen', [
    [ME, 'Te quiero.', 'I love you.'],
    [HIM, 'Yo también te quiero.', 'I love you too.'],
  ], ['Te quiero.', 'I love you.']),
  d('🚶', 'la caminata', 'the walk', [
    [HIM, '¿Vamos a caminar?', 'Shall we go for a walk?'],
    [ME, 'Sí, ¡vamos! Déjame ponerme los zapatos.', 'Yes, let’s go! Let me put on my shoes.'],
  ], ['¿Vamos a caminar?', 'Shall we go for a walk?']),
  d('☀️', 'el calor', 'the heat', [
    [ME, 'Hace mucho calor hoy.', "It's really hot today."],
    [HIM, 'Sí. Mejor caminamos en la tarde.', "Yeah. Let's walk in the afternoon instead."],
    [ME, 'Está bien.', 'Okay.'],
  ], ['Hace mucho calor.', "It's really hot."]),
  d('🧥', 'el frío', 'the cold', [
    [ME, 'Tengo frío.', "I'm cold."],
    [HIM, '¿Quieres mi sudadera?', 'Do you want my sweatshirt?'],
    [ME, 'Sí, gracias.', 'Yes, thanks.'],
  ], ['Tengo frío.', "I'm cold."]),
  d('😴', 'en el sillón', 'on the couch', [
    [HIM, '¿Estás bien?', 'Are you okay?'],
    [ME, 'Sí, nada más estoy cansada.', "Yes, I'm just tired."],
    [HIM, 'Descansa un rato.', 'Rest for a while.'],
  ], ['Estoy cansada.', "I'm tired."]),
  d('🌱', 'el jardín', 'the garden', [
    [HIM, '¿Ya regaste las plantas?', 'Did you water the plants yet?'],
    [ME, 'Todavía no. Ahorita voy.', "Not yet. I'm going in a sec."],
  ], ['Todavía no.', 'Not yet.']),
  d('🍅', 'el jardín', 'the garden', [
    [ME, '¡Mira! Ya salieron los tomates.', 'Look! The tomatoes came out.'],
    [HIM, '¡Qué bonitos! ¿Cortamos unos para la ensalada?', 'So pretty! Should we pick some for the salad?'],
    [ME, 'Sí, vamos.', "Yes, let's go."],
  ], ['¡Mira!', 'Look!']),
  d('🥄', 'en la cocina', 'in the kitchen', [
    [ME, '¿Cómo se dice “spoon” en español?', 'How do you say "spoon" in Spanish?'],
    [HIM, 'Cuchara.', 'Cuchara.'],
    [ME, 'Cu-cha-ra. ¡Gracias!', 'Cu-cha-ra. Thanks!'],
  ], ['¿Cómo se dice…?', 'How do you say…?']),
  d('🐢', 'más despacio', 'slower', [
    [HIM, '¿Quieres ir al mercado el domingo con mis papás?', 'Do you want to go to the market on Sunday with my parents?'],
    [ME, 'Perdón, no entendí. Más despacio, por favor.', "Sorry, I didn't understand. Slower, please."],
    [HIM, '¿Quieres ir… al mercado… el domingo… con mis papás?', 'Do you want to go… to the market… on Sunday… with my parents?'],
    [ME, '¡Ah! Sí, claro.', 'Oh! Yes, of course.'],
  ], ['Más despacio, por favor.', 'Slower, please.']),
  d('⏰', 'la hora', 'the time', [
    [ME, '¿Qué hora es?', 'What time is it?'],
    [HIM, 'Son las seis.', "It's six o'clock."],
    [ME, '¡Ya es tarde!', "It's late already!"],
  ], ['¿Qué hora es?', 'What time is it?']),
  d('👟', 'antes de salir', 'before going out', [
    [HIM, '¿Ya estás lista?', 'Are you ready yet?'],
    [ME, 'Casi. Dame cinco minutos.', 'Almost. Give me five minutes.'],
  ], ['Dame cinco minutos.', 'Give me five minutes.']),
  d('🚗', 'en la puerta', 'at the door', [
    [HIM, '¿Nos vamos?', 'Shall we go?'],
    [ME, 'Sí, vámonos. ¿Manejas tú?', "Yes, let's go. Are you driving?"],
    [HIM, 'Sí, yo manejo.', "Yes, I'll drive."],
  ], ['¿Nos vamos?', 'Shall we go?']),
  d('🛒', 'la tienda', 'the store', [
    [HIM, 'Voy a la tienda. ¿Necesitas algo?', "I'm going to the store. Do you need anything?"],
    [ME, 'Sí, leche y pan, por favor.', 'Yes, milk and bread, please.'],
  ], ['¿Necesitas algo?', 'Do you need anything?']),
  d('🔑', 'las llaves', 'the keys', [
    [ME, '¿Dónde están las llaves?', 'Where are the keys?'],
    [HIM, 'Creo que están en la mesa.', 'I think they’re on the table.'],
    [ME, '¡Ah, sí! Aquí están.', 'Oh, yes! Here they are.'],
  ], ['¿Dónde están…?', 'Where are…?']),
  d('👋', 'con la familia', 'with the family', [
    [ME, '¡Hola! Mucho gusto.', 'Hi! Nice to meet you.'],
    [TIA, '¡Igualmente, mija! Pásale, pásale.', 'Likewise, dear! Come in, come in.'],
    [ME, 'Gracias.', 'Thank you.'],
  ], ['Mucho gusto.', 'Nice to meet you.']),
  d('📞', 'por teléfono', 'on the phone', [
    [HIM, 'Mi mamá te manda saludos.', 'My mom says hi.'],
    [ME, '¡Ay, qué linda! Salúdala de mi parte.', "Aw, how sweet! Say hi to her for me."],
  ], ['Salúdala de mi parte.', 'Say hi to her for me.']),
  d('🌤️', 'el plan', 'the plan', [
    [HIM, '¿Comemos afuera hoy?', 'Should we eat outside today?'],
    [ME, 'Me parece bien.', 'Sounds good to me.'],
  ], ['Me parece bien.', 'Sounds good to me.']),
  d('🔪', 'en la cocina', 'in the kitchen', [
    [HIM, '¿Me ayudas a picar la cebolla?', 'Can you help me chop the onion?'],
    [ME, 'Claro. ¿Dónde está el cuchillo?', 'Sure. Where is the knife?'],
    [HIM, 'En el cajón.', 'In the drawer.'],
  ], ['¿Me ayudas?', 'Can you help me?']),
  d('🌮', 'la cena', 'dinner', [
    [ME, '¿Qué hacemos de cenar?', 'What should we make for dinner?'],
    [HIM, 'No sé. ¿Qué se te antoja?', "I don't know. What are you in the mood for?"],
    [ME, 'Se me antojan unos tacos.', "I'm craving some tacos."],
  ], ['Se me antoja…', "I'm in the mood for…"]),
  d('⏳', 'la cena', 'dinner', [
    [ME, '¿Ya está la comida?', 'Is the food ready?'],
    [HIM, 'Ya casi. Diez minutos.', 'Almost. Ten minutes.'],
  ], ['Ya casi.', 'Almost.']),
  d('🧽', 'después de cenar', 'after dinner', [
    [HIM, 'Yo lavo los trastes.', "I'll wash the dishes."],
    [ME, 'Gracias. Yo los seco.', "Thanks. I'll dry them."],
  ], ['Yo lavo los trastes.', "I'll wash the dishes."]),
  d('🌅', 'el atardecer', 'the sunset', [
    [ME, '¡Mira el atardecer!', 'Look at the sunset!'],
    [HIM, '¡Qué bonito! Las montañas están rosas.', 'So beautiful! The mountains are pink.'],
  ], ['¡Qué bonito!', 'So beautiful!']),
  d('🌿', 'el jardín', 'the garden', [
    [HIM, 'Hay que quitar la hierba mala.', 'We have to pull the weeds.'],
    [ME, '¿Otra vez? Bueno, yo te ayudo.', "Again? Okay, I'll help you."],
  ], ['Hay que…', 'We have to…']),
  d('🍋', 'el jardín', 'the garden', [
    [ME, '¿Cortamos unos limones para el agua?', 'Should we pick some lemons for the water?'],
    [HIM, 'Sí, los de atrás ya están listos.', 'Yes, the ones in the back are ready.'],
  ], ['¿Cortamos unos…?', 'Should we pick some…?']),
  d('🍓', 'el mercado', 'the market', [
    [HIM, 'Mañana es el mercado. ¿Vamos?', "Tomorrow is the market. Shall we go?"],
    [ME, '¡Sí! Quiero comprar fresas y aguacates.', 'Yes! I want to buy strawberries and avocados.'],
  ], ['Quiero comprar…', 'I want to buy…']),
  d('🎬', 'en la noche', 'at night', [
    [HIM, '¿Vemos una película?', 'Should we watch a movie?'],
    [ME, 'Sí, pero tú escoges.', 'Yes, but you choose.'],
  ], ['Tú escoges.', 'You choose.']),
  d('🌙', 'a dormir', 'bedtime', [
    [ME, 'Ya me voy a dormir.', "I'm going to bed now."],
    [HIM, 'Buenas noches. Que descanses.', 'Good night. Rest well.'],
    [ME, 'Igualmente.', 'You too.'],
  ], ['Que descanses.', 'Rest well.']),
  d('🤒', 'en casa', 'at home', [
    [ME, 'No me siento bien. Me duele la cabeza.', "I don't feel well. I have a headache."],
    [HIM, '¿Quieres un té?', 'Do you want some tea?'],
    [ME, 'Sí, por favor.', 'Yes, please.'],
  ], ['Me duele la cabeza.', 'I have a headache.']),
  d('😅', 'en casa', 'at home', [
    [HIM, '¿Me escuchaste?', 'Did you hear me?'],
    [ME, 'Perdón, no te escuché. ¿Qué dijiste?', "Sorry, I didn't hear you. What did you say?"],
  ], ['¿Qué dijiste?', 'What did you say?']),
  d('📦', 'en casa', 'at home', [
    [ME, '¿Dónde pongo esto?', 'Where do I put this?'],
    [HIM, 'Ahí, en la mesa.', 'There, on the table.'],
  ], ['¿Dónde pongo esto?', 'Where do I put this?']),
  d('📝', 'la lista', 'the list', [
    [HIM, '¿Qué nos falta de la tienda?', 'What do we need from the store?'],
    [ME, 'Nos faltan huevos y café.', "We're out of eggs and coffee."],
  ], ['Nos falta…', "We're out of…"]),
  d('🌸', 'el jardín', 'the garden', [
    [HIM, 'Mira, planté unas flores. ¿Te gustan?', 'Look, I planted some flowers. Do you like them?'],
    [ME, '¡Me encantan!', 'I love them!'],
  ], ['¡Me encanta!', 'I love it!']),
  d('😂', 'en el carro', 'in the car', [
    [HIM, 'Se me olvidó el café en la casa.', 'I forgot the coffee at home.'],
    [ME, '¡No manches! ¿Otra vez?', 'No way! Again?'],
  ], ['¡No manches!', 'No way! (casual)']),
];

// Word form → meaning as used in these dialogues (lowercase, accents kept).
export const GLOSS = {
  // people
  tú: 'you', yo: 'I, me', mi: 'my', mis: 'my (plural)', te: 'you, to you',
  me: 'me, to me, myself', se: '(it)self; se me…: it … to me', nos: 'us, to us; ourselves', los: 'the; them',
  la: 'the; her, it', el: 'the', las: 'the (plural); them', mija: 'dear, sweetie (lit. my daughter)',
  amor: 'love', mamá: 'mom', papás: 'parents', familia: 'family',
  // little words
  y: 'and', pero: 'but', con: 'with', de: 'of, from', en: 'in, on, at', a: 'to, at',
  al: 'to the', para: 'for', por: 'for, by; por favor: please', que: 'that; que descanses: rest well',
  qué: 'what; how (¡qué…!)', cómo: 'how', dónde: 'where', un: 'a', una: 'a, one', unos: 'some', unas: 'some',
  algo: 'something, anything', esto: 'this', ahí: 'there', aquí: 'here', atrás: 'in the back, behind',
  afuera: 'outside', sí: 'yes', no: 'no, not', también: 'too, also', muy: 'very', mucho: 'very, a lot',
  más: 'more; más despacio: slower', nada: 'nothing; nada más: just, only', casi: 'almost', ya: 'already, now, yet',
  todavía: 'still; todavía no: not yet', otra: 'another; otra vez: again', vez: 'time (otra vez: again)',
  mejor: 'better; mejor…: …instead', bien: 'well, good, fine', poquita: 'a little', rato: 'a while',
  hoy: 'today', mañana: 'tomorrow; morning', tarde: 'afternoon; late', noches: 'nights (buenas noches: good night)',
  ahorita: 'right now, in a sec (Mexico)', claro: 'of course, sure', bueno: 'okay, well; good',
  igualmente: 'likewise, you too', perdón: 'sorry, excuse me', gracias: 'thank you', favor: 'favor (por favor: please)',
  ah: 'oh', ay: 'aw, oh', casa: 'house, home (en la casa: at home)',
  // greetings
  hola: 'hi', buenos: 'good (buenos días: good morning)', buenas: 'good (buenas noches: good night)',
  días: 'days (buenos días: good morning)', gusto: 'pleasure (mucho gusto: nice to meet you; me da gusto: I’m glad)',
  saludos: 'greetings, regards (te manda saludos: says hi)', salúdala: 'say hi to her',
  parte: 'part (de mi parte: from me)',
  // verbs
  es: 'is', son: 'are (son las seis: it’s six)', está: 'is (state, location); está bien: okay',
  están: 'are (state, location)', estás: 'you are (state)', estoy: 'I am (state)', quieres: 'you want',
  quiero: 'I want; te quiero: I love you', tengo: 'I have (tengo hambre: I’m hungry)', hay: 'there is; hay que: we have to',
  dormiste: 'you slept', dormir: 'to sleep (me voy a dormir: I’m going to bed)', desayunar: 'to have breakfast',
  hago: 'I make, I do', hacemos: 'we make, we do (¿qué hacemos de cenar?: what should we make for dinner?)',
  da: 'gives (me da gusto: I’m glad)', pasas: 'you pass (¿me pasas…?: can you pass me…?)',
  vamos: 'let’s go; we go', vámonos: 'let’s go', voy: 'I go, I’m going', caminar: 'to walk',
  caminamos: 'we walk', déjame: 'let me', ponerme: 'to put on (myself)', hace: 'it makes (hace calor: it’s hot)',
  descansa: 'rest', descanses: 'you rest (que descanses: rest well)', regaste: 'you watered',
  salieron: 'came out, sprouted', cortamos: 'we pick, we cut (¿cortamos…?: should we pick…?)', mira: 'look',
  dice: 'says (¿cómo se dice…?: how do you say…?)', ir: 'to go', entendí: 'I understood (no entendí: I didn’t understand)',
  dame: 'give me', manejas: 'you drive', manejo: 'I drive', necesitas: 'you need',
  creo: 'I think', pásale: 'come in (Mexico)', manda: 'sends', comemos: 'we eat', parece: 'seems (me parece bien: sounds good to me)',
  ayudas: 'you help (¿me ayudas?: can you help me?)', ayudo: 'I help', picar: 'to chop', sé: 'I know (no sé: I don’t know)',
  antoja: 'craves (¿qué se te antoja?: what are you in the mood for?)', antojan: 'crave (se me antojan: I’m craving)',
  lavo: 'I wash', seco: 'I dry', quitar: 'to remove, to pull', comprar: 'to buy', vemos: 'we watch, we see',
  escoges: 'you choose', siento: 'I feel (no me siento bien: I don’t feel well)', duele: 'hurts (me duele: it hurts me)',
  escuchaste: 'you heard', escuché: 'I heard', dijiste: 'you said', pongo: 'I put', falta: 'is missing (nos falta: we’re out of)',
  faltan: 'are missing (nos faltan: we’re out of)', planté: 'I planted', gustan: 'please (¿te gustan?: do you like them?)',
  encantan: 'delight (me encantan: I love them)', olvidó: 'forgot (se me olvidó: I forgot)',
  manches: 'no manches: no way! (casual, Mexico)',
  // food and home
  café: 'coffee', leche: 'milk', huevos: 'eggs', tortillas: 'tortillas', sal: 'salt', comida: 'food; meal',
  comer: 'to eat (de comer: to eat)', hambre: 'hunger (tengo hambre: I’m hungry)', cenar: 'to have dinner',
  tacos: 'tacos', ensalada: 'salad', pan: 'bread', té: 'tea', fresas: 'strawberries', aguacates: 'avocados',
  limones: 'limes / lemons (in Mexico limón usually means lime)', agua: 'water', cebolla: 'onion', cuchillo: 'knife',
  cuchara: 'spoon', cu: '(cuchara, said slowly)', cha: '(cuchara, said slowly)', ra: '(cuchara, said slowly)',
  cajón: 'drawer', trastes: 'dishes (Mexico)', mesa: 'table', tienda: 'store', mercado: 'market', llaves: 'keys',
  zapatos: 'shoes', sudadera: 'sweatshirt, hoodie', película: 'movie', teléfono: 'phone', carro: 'car',
  puerta: 'door', sillón: 'couch', cocina: 'kitchen', lista: 'list; ready (estás lista: you’re ready)',
  listos: 'ready', idea: 'idea', cabeza: 'head', plan: 'plan',
  // garden and outside
  jardín: 'garden', plantas: 'plants', flores: 'flowers', tomates: 'tomatoes', hierba: 'grass, herb (hierba mala: weeds)',
  mala: 'bad', montañas: 'mountains', rosas: 'pink; roses', atardecer: 'sunset', calor: 'heat (hace calor: it’s hot)',
  frío: 'cold (tengo frío: I’m cold)', caminata: 'walk, hike',
  // describing and time
  riquísimo: 'delicious', bonito: 'beautiful, pretty', bonitos: 'beautiful, pretty', linda: 'sweet, lovely',
  cansada: 'tired (said by a woman)', buena: 'good', hora: 'hour, time (¿qué hora es?: what time is it?)',
  seis: 'six', cinco: 'five', diez: 'ten', minutos: 'minutes', domingo: 'Sunday', noche: 'night',
  español: 'Spanish', despacio: 'slowly', tal: '¿qué tal?: how is it? how’s it going?',
  spoon: '(English: spoon)', después: 'after', antes: 'before', salir: 'to go out',
  desayuno: 'breakfast', cena: 'dinner', encanta: 'delights (me encanta: I love it)',
};
