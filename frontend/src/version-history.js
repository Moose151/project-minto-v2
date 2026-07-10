export const APP_VERSION = '0.2.0';

export const VERSION_HISTORY = [
  {
    version: '0.2.0',
    date: '2026-07-10',
    title: 'Weekly workflow beta',
    commit: 'current push',
    notes: [
      'Added the Round Rhythm strip across the core season-flow pages.',
      'Training, team-list submission, tactics, match day, recovery, and inbox now link together as a clearer weekly loop.',
      'Added priority inbox action cards so important club messages are easier to handle.',
      'Added in-game version history in Options.'
    ]
  },
  {
    version: '0.1.0',
    date: '2026-07-10',
    title: 'Desktop beta foundation',
    commit: '8188b6a',
    notes: [
      'Tauri desktop shell, Vite frontend, save/load support, and the core management sim loop are in beta.',
      'Includes the current squad, recruitment, contracts, training, tactics, match-day, progression, finals, and offseason systems.',
      'Recent feature work includes media pressure, career-threatening injuries, rival poaching, coach development, and sin-bin/send-off events.'
    ]
  }
];

if(typeof window !== 'undefined'){
  window.APP_VERSION = APP_VERSION;
  window.VERSION_HISTORY = VERSION_HISTORY;
}
