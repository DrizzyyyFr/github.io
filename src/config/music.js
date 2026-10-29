const audioUrl = file => `${process.env.PUBLIC_URL || '.'}/audio/${file}`;

export const musicTracks = [
  { title: 'Underwater Vowels', src: audioUrl('underwater-vowels.mp3') },
  { title: 'Respiration Douce', src: audioUrl('respiration-douce.mp3') },
  { title: 'Whispered Blooms', src: audioUrl('whispered-blooms.mp3') },
];
