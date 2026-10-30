import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { musicTracks } from '../../config/music';
import './MusicPlayer.css';

const timeLabel = value => {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

function PlayerIcon({ name }) {
  const paths = {
    play: <path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none" />,
    pause: <><path d="M8 5v14M16 5v14" strokeWidth="4" /></>,
    previous: <><path d="M6 5v14" /><path d="m19 5-10 7 10 7Z" fill="currentColor" stroke="none" /></>,
    next: <><path d="M18 5v14" /><path d="m5 5 10 7-10 7Z" fill="currentColor" stroke="none" /></>,
    volume: <><path d="M4 9h4l5-4v14l-5-4H4Z" /><path d="M17 8a6 6 0 0 1 0 8" /></>,
    mute: <><path d="M4 9h4l5-4v14l-5-4H4Z" /><path d="m17 9 5 6m0-6-5 6" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function usePlayerLayer() {
  const [host] = useState(() => {
    const element = document.createElement('div');
    element.className = 'music-player-layer';
    return element;
  });
  useLayoutEffect(() => {
    const topLayer = typeof host.showPopover === 'function';
    if (topLayer) host.setAttribute('popover', 'manual');
    const place = () => {
      const dialogs = document.querySelectorAll('dialog[open]');
      const parent = dialogs[dialogs.length - 1] || document.body;
      if (host.parentNode !== parent) {
        if (topLayer) {
          try { host.hidePopover(); } catch { /* It may not be open yet. */ }
        }
        parent.appendChild(host);
        if (topLayer) host.showPopover();
      }
    };
    place();
    const observer = new MutationObserver(place);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => {
      observer.disconnect();
      if (topLayer) {
        try { host.hidePopover(); } catch { /* The closing dialog may have hidden it. */ }
      }
      host.remove();
    };
  }, [host]);
  return host;
}

export default function MusicPlayer({ tracks = musicTracks }) {
  const audio = useRef(null);
  const request = useRef(0);
  const playingIntent = useRef(false);
  const rememberedVolume = useRef(5);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(5);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const host = usePlayerLayer();
  const track = tracks[index] || tracks[0];

  useLayoutEffect(() => { audio.current.volume = volume / 100; }, [volume]);

  const start = () => {
    const attempt = ++request.current;
    playingIntent.current = true;
    setError('');
    const promise = audio.current.play();
    promise?.catch(() => {
      if (attempt !== request.current) return;
      playingIntent.current = false;
      setPlaying(false);
      setError('Playback unavailable. Try again.');
    });
  };

  useEffect(() => {
    request.current += 1;
    setPosition(0);
    setDuration(0);
    setError('');
    if (playingIntent.current && track) start();
    // The audio source changes with the selected track, not with playback events.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.src]);

  const selectTrack = next => {
    if (!tracks.length) return;
    const normalized = (next + tracks.length) % tracks.length;
    if (normalized === index) {
      audio.current.currentTime = 0;
      setPosition(0);
      if (playingIntent.current) start();
    } else setIndex(normalized);
  };

  const togglePlayback = () => {
    if (playing || playingIntent.current) {
      request.current += 1;
      playingIntent.current = false;
      audio.current.pause();
      setPlaying(false);
    } else start();
  };

  const changeVolume = next => {
    setVolume(next);
    if (next > 0) rememberedVolume.current = next;
  };

  return <>
    <audio ref={audio} src={track?.src} preload="none" data-testid="soundtrack-audio"
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
      onDurationChange={event => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onEnded={() => selectTrack(index + 1)}
      onError={() => { playingIntent.current = false; setPlaying(false); setError('This track could not be loaded.'); }} />
    {createPortal(<section className="music-player" aria-label="Music player" data-playing={playing}>
      <div className="music-player-main">
        <button className="glass-button is-round music-play" type="button" onClick={togglePlayback} disabled={!track} aria-label={playing ? 'Pause music' : 'Play music'}>
          <PlayerIcon name={playing ? 'pause' : 'play'} />
        </button>
        <div className="music-track">
          <select aria-label="Music track" value={index} disabled={!tracks.length} onChange={event => selectTrack(Number(event.target.value))} title={track?.title || 'Music'}>
            {tracks.length ? tracks.map((song, songIndex) => <option key={song.src} value={songIndex}>{song.title}</option>) : <option value={0}>Soundtrack</option>}
          </select>
          <span className="music-status" role="status">{error || `${playing ? 'Playing' : 'Paused'}${tracks.length ? ` · ${index + 1} / ${tracks.length}` : ''}`}</span>
        </div>
        <div className="music-skip">
          <button type="button" onClick={() => selectTrack(index - 1)} disabled={tracks.length < 2} aria-label="Previous track"><PlayerIcon name="previous" /></button>
          <button type="button" onClick={() => selectTrack(index + 1)} disabled={tracks.length < 2} aria-label="Next track"><PlayerIcon name="next" /></button>
        </div>
      </div>
      <div className="music-player-adjustments">
        <span className="music-time" aria-hidden="true">{timeLabel(position)}</span>
        <input className="music-seek" type="range" aria-label="Track position" aria-valuetext={`${timeLabel(position)} of ${timeLabel(duration)}`}
          min="0" max={duration || 1} step="0.1" value={Math.min(position, duration || 1)} disabled={!duration}
          onChange={event => { const next = Number(event.target.value); audio.current.currentTime = next; setPosition(next); }} />
        <button className="music-mute" type="button" aria-label={volume ? 'Mute music' : 'Unmute music'} onClick={() => changeVolume(volume ? 0 : rememberedVolume.current)}>
          <PlayerIcon name={volume ? 'volume' : 'mute'} />
        </button>
        <input className="music-volume" type="range" aria-label="Music volume" aria-valuetext={`${volume}%`} min="0" max="100" step="1" value={volume}
          onChange={event => changeVolume(Number(event.target.value))} />
        <span className="music-volume-label" aria-hidden="true">{volume}%</span>
      </div>
    </section>, host)}
  </>;
}
