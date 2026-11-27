// DEMO DATA — every record here is fake and marked isDemo.
// It exists so Phase 1 runs with no accounts or keys. Remove before launch.
import type {
  AskRequest, Category, Course, Member, Notice, Progress, SiteSettings, Video, WaitlistEntry,
} from '../types';

const now = Date.now();
export const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const daysAhead = (d: number) => new Date(now + d * 86400000).toISOString();

export const seedCategories: Category[] = [
  { id: 'passing', name: { en: 'Guard Passing', es: 'Pasaje de guardia' } },
  { id: 'retention', name: { en: 'Guard Retention', es: 'Retención de guardia' } },
  { id: 'open-guard', name: { en: 'Open Guard', es: 'Guardia abierta' } },
  { id: 'half-guard', name: { en: 'Half Guard', es: 'Media guardia' } },
  { id: 'takedowns', name: { en: 'Takedowns and Wrestling', es: 'Derribos y lucha' } },
  { id: 'submissions', name: { en: 'Submissions', es: 'Sumisiones' } },
  { id: 'leg-locks', name: { en: 'Leg Locks', es: 'Llaves de pierna' } },
  { id: 'back', name: { en: 'Back Control', es: 'Control de espalda' } },
  { id: 'escapes', name: { en: 'Escapes and Defence', es: 'Escapes y defensa' } },
  { id: 'control', name: { en: 'Positional Control', es: 'Control posicional' } },
  { id: 'strategy', name: { en: 'Competition Strategy', es: 'Estrategia de competición' } },
  { id: 'sparring', name: { en: 'Sparring Breakdowns', es: 'Análisis de sparring' } },
  { id: 'concepts', name: { en: 'Training Concepts', es: 'Conceptos de entrenamiento' } },
];

type V = [id: string, cat: string, level: Video['level'], type: Video['type'], hue: number, age: number,
  en: [string, string, number] | null, es: [string, string, number] | null, extra?: Partial<Video>];

const rows: V[] = [
  ['v-bodylock-1', 'passing', 'beginner', 'lesson', 42, 3,
    ['Body Lock Pass: The Grip', 'Where the hands go, and why the grip wins the pass before you move.', 214],
    ['Pase de body lock: el agarre', 'Dónde van las manos y por qué el agarre gana el pase antes de moverte.', 221]],
  ['v-bodylock-2', 'passing', 'beginner', 'lesson', 38, 3,
    ['Body Lock Pass: Hip Pressure', 'Pinning the hips so the guard cannot square up again.', 188],
    ['Pase de body lock: presión de cadera', 'Fijar la cadera para que la guardia no pueda volver a encuadrarse.', 195]],
  ['v-bodylock-3', 'passing', 'intermediate', 'lesson', 46, 3,
    ['Body Lock Pass: Stepping Over', 'Clearing the legs and arriving in side control with weight on.', 241],
    ['Pase de body lock: pasar la pierna', 'Limpiar las piernas y llegar a control lateral con peso.', 236]],
  ['v-bodylock-4', 'passing', 'intermediate', 'lesson', 50, 2,
    ['Body Lock Pass: When They Turn Away', 'Following the turtle and taking the back.', 202],
    ['Pase de body lock: cuando te da la espalda', 'Seguir la tortuga y tomar la espalda.', 209]],
  ['v-heel-1', 'leg-locks', 'beginner', 'lesson', 0, 9,
    ['Leg Lock Safety and Tapping', 'How to train leg locks without injuries, for you and your partners.', 176],
    ['Seguridad en llaves de pierna', 'Cómo entrenar llaves de pierna sin lesiones, para ti y tus compañeros.', 183]],
  ['v-heel-2', 'leg-locks', 'intermediate', 'lesson', 6, 9,
    ['Inside Heel Hook: Controlling the Knee', 'Knee line control first. The finish comes after.', 263],
    ['Heel hook interior: controlar la rodilla', 'Primero la línea de la rodilla. La finalización viene después.', 270]],
  ['v-heel-3', 'leg-locks', 'advanced', 'lesson', 10, 8,
    ['Inside Heel Hook: Finishing Mechanics', 'Hand position, elbow path and the turn of the body.', 287],
    ['Heel hook interior: mecánica de finalización', 'Posición de las manos, recorrido del codo y giro del cuerpo.', 279]],
  ['v-heel-4', 'leg-locks', 'intermediate', 'lesson', 14, 8,
    ['Shin-to-Shin Entry', 'Entering the legs from a seated guard against a standing opponent.', 195],
    ['Entrada shin-to-shin', 'Entrar a las piernas desde guardia sentada contra un rival de pie.', 201]],
  ['v-esc-1', 'escapes', 'beginner', 'lesson', 200, 20,
    ['Side Control Escape: Frames', 'Building frames that hold, then making space with the hips.', 232],
    ['Escape de control lateral: marcos', 'Construir marcos que aguanten y crear espacio con la cadera.', 228]],
  ['v-esc-2', 'escapes', 'beginner', 'lesson', 210, 20,
    ['Mount Escape: Elbow-Knee', 'The escape that works at every level, step by step.', 219],
    ['Escape de montada: codo-rodilla', 'El escape que funciona en todos los niveles, paso a paso.', 224]],
  ['v-esc-3', 'escapes', 'beginner', 'lesson', 220, 19,
    ['Back Escape: Hand Fighting', 'Clearing the choke hand before anything else.', 205],
    ['Escape de espalda: pelea de manos', 'Quitar la mano del estrangulamiento antes que nada.', 212]],
  ['v-esc-4', 'escapes', 'beginner', 'lesson', 230, 19,
    ['Turtle Recovery to Guard', 'Rolling back to guard when the pass is almost done.', 181],
    ['De tortuga a guardia', 'Volver a la guardia cuando el pase casi está hecho.', 186]],
  ['v-snap', 'takedowns', 'intermediate', 'technique', 25, 1,
    ['Front Headlock: Snap Down to Go-Behind', 'From the snap down to the back in two steps.', 168],
    ['Front headlock: snap down y go-behind', 'Del snap down a la espalda en dos pasos.', 172], { featured: true }],
  ['v-single', 'takedowns', 'beginner', 'technique', 30, 5,
    ['Single Leg on the Edge of the Mat', 'Finishing the single leg when you have no space.', 244],
    ['Single leg en el borde del tatami', 'Terminar el single leg cuando no hay espacio.', 238]],
  ['v-rnc', 'back', 'beginner', 'technique', 55, 12,
    ['Rear Naked Choke: The Details That Finish', 'Chin, hand and elbow: the three details that make it tap.', 207],
    ['Mataleón: los detalles que finalizan', 'Barbilla, mano y codo: los tres detalles que hacen que golpeen.', 214], { featured: true }],
  ['v-kneeshield', 'half-guard', 'intermediate', 'technique', 180, 15,
    ['Knee Shield to Dogfight', 'Coming up from half guard before the pass starts.', 226],
    ['De knee shield a dogfight', 'Levantarse desde media guardia antes de que empiece el pase.', 219]],
  ['v-retention', 'retention', 'intermediate', 'technique', 170, 6,
    ['Re-Guard Against the Knee Cut', 'Inverting the knee line when the pass is halfway there.', 198],
    null], // English only: hidden in the Spanish library
  ['v-butterfly', 'open-guard', 'beginner', 'technique', 160, 4,
    null,
    ['Guardia mariposa: barrida básica', 'La barrida de mariposa con el gancho y el agarre correctos.', 205]], // Spanish only
  ['v-analysis', 'strategy', 'advanced', 'analysis', 280, 2,
    ['Match Study: Winning on Points with Pressure', 'How a pressure plan wins a close no-gi match.', 296],
    ['Estudio de combate: ganar por puntos con presión', 'Cómo un plan de presión gana un combate de no-gi ajustado.', 299], { featured: true }],
  ['v-sparring', 'sparring', 'intermediate', 'sparring', 300, 7,
    ['Sparring Breakdown: Passing Rounds', 'Five minutes of passing rounds, paused and explained.', 290],
    ['Análisis de sparring: rondas de pase', 'Cinco minutos de rondas de pase, pausados y explicados.', 288]],
  ['v-concept', 'concepts', 'beginner', 'technique', 330, 11,
    ['How to Structure a Training Week', 'Drilling, positional sparring and rest, balanced.', 175],
    ['Cómo estructurar una semana de entrenamiento', 'Repetición, sparring posicional y descanso, en equilibrio.', 182]],
  ['v-qa', 'concepts', 'beginner', 'qa', 340, 1,
    ['Q&A: Fixing a Slow Guard Pass', 'Answer video to a member question.', 141],
    ['Preguntas: arreglar un pase lento', 'Vídeo de respuesta a la pregunta de un miembro.', 149]],
  ['v-draft', 'submissions', 'intermediate', 'technique', 15, 0,
    ['Arm Triangle from Half Guard (draft)', 'Not published yet.', 199],
    ['Arm triangle desde media guardia (borrador)', 'Aún no publicado.', 204], { status: 'draft' }],
];

export const seedVideos: Video[] = rows.map(([id, categoryId, level, type, thumbHue, age, en, es, extra]) => ({
  id, categoryId, level, type, thumbHue,
  status: 'published', featured: false,
  createdAt: daysAgo(age),
  isDemo: true,
  versions: {
    ...(en ? { en: { title: en[0], description: en[1], durationSec: en[2], assetId: null } } : {}),
    ...(es ? { es: { title: es[0], description: es[1], durationSec: es[2], assetId: null } } : {}),
  },
  ...extra,
}));

export const seedCourses: Course[] = [
  {
    id: 'c-bodylock', level: 'beginner', status: 'published', coverHue: 42, isDemo: true,
    versions: {
      en: { title: 'The Body Lock Passing System', description: 'A complete pressure pass, from the first grip to the back take.', lessonIds: ['v-bodylock-1', 'v-bodylock-2', 'v-bodylock-3', 'v-bodylock-4'] },
      es: { title: 'Sistema de pase con body lock', description: 'Un pase de presión completo, desde el primer agarre hasta tomar la espalda.', lessonIds: ['v-bodylock-1', 'v-bodylock-2', 'v-bodylock-3', 'v-bodylock-4'] },
    },
  },
  {
    id: 'c-legs', level: 'intermediate', status: 'published', coverHue: 6, isDemo: true,
    versions: {
      en: { title: 'Leg Lock Foundations', description: 'Safe entries, knee line control and the inside heel hook.', lessonIds: ['v-heel-1', 'v-heel-4', 'v-heel-2', 'v-heel-3'] },
      es: { title: 'Fundamentos de llaves de pierna', description: 'Entradas seguras, control de la rodilla y el heel hook interior.', lessonIds: ['v-heel-1', 'v-heel-4', 'v-heel-2', 'v-heel-3'] },
    },
  },
  {
    id: 'c-escapes', level: 'beginner', status: 'published', coverHue: 210, isDemo: true,
    versions: {
      en: { title: 'Escapes for Your First Year', description: 'The four escapes every new grappler needs.', lessonIds: ['v-esc-1', 'v-esc-2', 'v-esc-3', 'v-esc-4'] },
      es: { title: 'Escapes para tu primer año', description: 'Los cuatro escapes que todo principiante necesita.', lessonIds: ['v-esc-1', 'v-esc-2', 'v-esc-3', 'v-esc-4'] },
    },
  },
];

const sub = (tier: Member['subscription']['tier'], status: Member['subscription']['status'] = 'active') => ({
  tier, status, periodEnd: tier ? daysAhead(18) : null, cancelAtPeriodEnd: false, pendingTier: null,
});

/** The four accounts in the demo switcher, then extra members for /admin. */
export const seedMembers: Member[] = [
  { id: 'm-academy', email: 'ana.demo@example.com', firstName: 'Ana', lang: 'es', belt: 'blue', interests: ['competition', 'guard'], role: 'member', joinedAt: daysAgo(40), emailVerified: true, subscription: sub('academy'), isDemo: true },
  { id: 'm-review', email: 'marco.demo@example.com', firstName: 'Marco', lang: 'en', belt: 'purple', interests: ['legLocks', 'competition'], role: 'member', joinedAt: daysAgo(25), emailVerified: true, subscription: sub('review'), isDemo: true },
  { id: 'm-coaching', email: 'lucia.demo@example.com', firstName: 'Lucía', lang: 'es', belt: 'brown', interests: ['competition', 'wrestling'], role: 'member', joinedAt: daysAgo(60), emailVerified: true, subscription: sub('coaching'), isDemo: true },
  { id: 'm-admin', email: 'jean.demo@example.com', firstName: 'Jean', lang: 'es', belt: 'black', interests: [], role: 'admin', joinedAt: daysAgo(90), emailVerified: true, subscription: sub(null, 'none'), isDemo: true },
  ...Array.from({ length: 14 }, (_, i): Member => {
    const tier = i < 6 ? 'coaching' : i < 10 ? 'review' : 'academy';
    return {
      id: `m-x${i}`, email: `member${String(i + 1).padStart(2, '0')}.demo@example.com`, firstName: `Demo ${i + 1}`,
      lang: i % 3 === 0 ? 'en' : 'es', belt: (['white', 'blue', 'purple', 'brown'] as const)[i % 4], interests: [],
      role: 'member', joinedAt: daysAgo(3 + i * 4), emailVerified: true,
      subscription: sub(tier, i === 12 ? 'past_due' : 'active'), isDemo: true,
    };
  }),
];

export const seedRequests: AskRequest[] = [
  { id: 'r1', memberId: 'm-review', type: 'question', lang: 'en', privacy: 'public', publicApproved: true, status: 'answered', isDemo: true,
    subject: 'Body lock: they keep hip escaping', body: 'When I lock my hands they shrimp away before I can step over. What am I missing?', videoId: 'v-bodylock-2', createdAt: daysAgo(6),
    replies: [{ id: 'rp1', kind: 'lesson', body: 'Your head is too high. Put your ear on their chest before you step, then watch this lesson again from 1:20.', lessonId: 'v-bodylock-2', createdAt: daysAgo(5) }] },
  { id: 'r2', memberId: 'm-review', type: 'review', lang: 'en', privacy: 'private', publicApproved: false, status: 'in_progress', isDemo: true,
    subject: 'Regional final, 6 minutes', body: 'I lost on an advantage. I think I stalled on top.', link: 'https://youtu.be/demo-unlisted', createdAt: daysAgo(1), replies: [] },
  { id: 'r3', memberId: 'm-coaching', type: 'call', lang: 'es', privacy: 'private', publicApproved: false, status: 'new', isDemo: true,
    subject: 'Llamada semanal', body: 'Quiero preparar el europeo. Prefiero por la tarde.', preferredTime: 'Martes 18:00', createdAt: daysAgo(0), replies: [] },
  { id: 'r4', memberId: 'm-coaching', type: 'question', lang: 'es', privacy: 'public', publicApproved: true, status: 'answered', isDemo: true,
    subject: 'Heel hook: ¿qué mano va arriba?', body: 'Siempre me confundo con la posición de las manos al finalizar.', videoId: 'v-heel-3', createdAt: daysAgo(9),
    replies: [{ id: 'rp2', kind: 'text', body: 'La mano del lado del talón va por debajo y la otra la agarra por encima. Gira con el cuerpo, no con los brazos.', createdAt: daysAgo(8) }] },
  { id: 'r5', memberId: 'm-academy', type: 'private', lang: 'es', privacy: 'private', publicApproved: false, status: 'new', isDemo: true,
    subject: 'Seminario en Valencia', body: 'Somos una academia de 40 alumnos. ¿Harías un seminario en primavera?', createdAt: daysAgo(2), replies: [] },
  { id: 'r6', memberId: 'm-x3', type: 'question', lang: 'en', privacy: 'public', publicApproved: false, status: 'new', isDemo: true,
    subject: 'Front headlock from the knees', body: 'Does the snap down work if we both start on the knees?', videoId: 'v-snap', createdAt: daysAgo(0), replies: [] },
];

export const seedProgress: Record<string, Record<string, Progress>> = {
  'm-review': {
    'v-bodylock-1': { positionSec: 214, completed: true, updatedAt: daysAgo(4) },
    'v-bodylock-2': { positionSec: 96, completed: false, updatedAt: daysAgo(1) },
    'v-heel-2': { positionSec: 40, completed: false, updatedAt: daysAgo(2) },
  },
  'm-academy': {
    'v-esc-1': { positionSec: 232, completed: true, updatedAt: daysAgo(3) },
    'v-esc-2': { positionSec: 70, completed: false, updatedAt: daysAgo(1) },
  },
  'm-coaching': {
    'v-heel-3': { positionSec: 120, completed: false, updatedAt: daysAgo(1) },
  },
};

export const seedBookmarks: Record<string, string[]> = {
  'm-review': ['v-snap', 'v-analysis'],
  'm-academy': ['v-rnc'],
  'm-coaching': ['v-heel-3', 'v-sparring'],
};

export const seedNotices: Notice[] = [
  { id: 'n1', memberId: 'm-review', kind: 'reply', requestId: 'r1', createdAt: daysAgo(5), read: false },
];

export const seedWaitlist: WaitlistEntry[] = [];

export const seedSettings: SiteSettings = {
  prices: { academy: 1299, review: 3699, coaching: 7399, oneOffQuestion: 1899 },
  limits: {
    academy: { questionsPerMonth: 0, reviewsPerMonth: 0, callsPerWeek: 0 },
    review: { questionsPerMonth: 2, reviewsPerMonth: 2, callsPerWeek: 0 },
    coaching: { questionsPerMonth: 5, reviewsPerMonth: 5, callsPerWeek: 1 },
  },
  coachingPlaces: 10,
  travelMode: false,
  // From HANDOFF.md section 3. Never add, invent or embellish.
  achievements: [
    { en: '2026 European No-Gi Champion', es: 'Campeón Europeo No-Gi 2026' },
    { en: '2025 European No-Gi Silver Medallist', es: 'Medalla de plata, Europeo No-Gi 2025' },
    { en: '2024 European No-Gi Silver Medallist', es: 'Medalla de plata, Europeo No-Gi 2024' },
    { en: '2024 ADCC Trials Medallist', es: 'Medallista ADCC Trials 2024' },
    { en: 'Polaris Champion and Polaris veteran', es: 'Campeón de Polaris y veterano de Polaris' },
    { en: 'Multiple-time National Champion', es: 'Campeón nacional en varias ocasiones' },
  ],
  bio: { en: '', es: '' }, // [OPEN] owner to supply
  philosophy: { en: '', es: '' }, // [OPEN] owner to supply
  instagram: 'https://www.instagram.com/jeanlucajj/',
  ibjjf: 'https://ibjjf.com/athletes/jean-maltese',
  heroHeadline: { en: 'Train with purpose. Master your Jiu Jitsu.', es: 'Entrena con propósito. Domina tu Jiu Jitsu.' },
  announcement: null,
  // Draft FAQ built only from facts in HANDOFF.md. Owner to review.
  faq: [
    { id: 'f1', q: { en: 'Is it gi or no-gi?', es: '¿Es con gi o sin gi?' },
      a: { en: 'No-gi only, for now.', es: 'Solo no-gi, por ahora.' } },
    { id: 'f2', q: { en: 'Which languages are the videos in?', es: '¿En qué idiomas están los vídeos?' },
      a: { en: 'Every lesson is recorded twice: once in English and once in Spanish. You can switch language at any time without a new subscription.', es: 'Cada lección se graba dos veces: una en inglés y otra en español. Puedes cambiar de idioma cuando quieras sin una nueva suscripción.' } },
    { id: 'f3', q: { en: 'Can I cancel any time?', es: '¿Puedo cancelar cuando quiera?' },
      a: { en: 'Yes. You keep access until the end of the month you paid for.', es: 'Sí. Mantienes el acceso hasta el final del mes que pagaste.' } },
    { id: 'f4', q: { en: 'How does a footage review work?', es: '¿Cómo funciona un análisis de vídeo?' },
      a: { en: 'Paste a link to your match (YouTube unlisted, Google Drive, Instagram). Each review covers one match or up to 10 minutes of footage, answered within 72 hours.', es: 'Pega un enlace a tu combate (YouTube oculto, Google Drive, Instagram). Cada análisis cubre un combate o hasta 10 minutos de vídeo, con respuesta en 72 horas.' } },
    { id: 'f5', q: { en: 'Are there free videos?', es: '¿Hay vídeos gratis?' },
      a: { en: 'Free clips are posted on Instagram. Everything on this site is for members.', es: 'Los clips gratis se publican en Instagram. Todo lo de esta web es para miembros.' } },
    { id: 'f6', q: { en: 'Can I change plan?', es: '¿Puedo cambiar de plan?' },
      a: { en: 'Yes. Upgrades apply immediately and you only pay the difference for the rest of the month. Downgrades apply at your next renewal.', es: 'Sí. Las mejoras se aplican al momento y solo pagas la diferencia del resto del mes. Las bajadas de plan se aplican en la siguiente renovación.' } },
  ],
  logoName: null,
  heroImageName: null,
  portraitName: null,
};
