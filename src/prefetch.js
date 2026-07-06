/* ============================================================
   MIRA · Prefetch compartido del QUEST.
   El pizarrón (screens/mindmap.js) arranca la generación de los
   3 retos mientras el alumno explora los gráficos, para que al
   pulsar "Pasar a quest" aparezcan al instante (screens/teach.js).
   SIEMPRE sobre el tema de la clase (state.topic), no sobre lo
   que se explore en el chat.
   ============================================================ */

export const questPre = { board: null, diagram: null, games: null };

export function resetQuestPre() {
  questPre.board = questPre.diagram = questPre.games = null;
}
