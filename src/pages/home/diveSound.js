// The greeting heard once a visit, the first time the view goes under the water.
//
// Browsers refuse sound until the visitor has clicked, tapped or pressed a key, and scrolling
// does not count. A greeting refused that way waits for the visitor's first such interaction,
// and plays then if the view is still under the water; otherwise it tries again on the next dive.
const SOURCE = `${process.env.PUBLIC_URL || '.'}/audio/under-the-water.mp3`;
const VOLUME = .7;
const GESTURES = ['pointerdown', 'keydown', 'touchend'];

export function createDiveSound() {
  const audio = new Audio(SOURCE);
  audio.preload = 'auto';
  audio.volume = VOLUME;
  let played = false;
  let under = false;
  const stopWaiting = () => GESTURES.forEach(name => window.removeEventListener(name, retry, true));
  const wait = () => GESTURES.forEach(name => window.addEventListener(name, retry, true));
  const play = () => {
    if (played || !under) return;
    played = true;
    stopWaiting();
    audio.play()?.catch(() => { played = false; wait(); });
  };
  function retry() { if (under) play(); }
  return {
    // Called as the view crosses the surface, down (true) or back up (false).
    crossed(isUnder) {
      under = isUnder;
      if (under) play();
    },
    destroy() {
      stopWaiting();
      audio.pause();
    },
  };
}
