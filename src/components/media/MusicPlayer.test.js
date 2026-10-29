import { act, fireEvent, render, screen } from '@testing-library/react';
import MusicPlayer from './MusicPlayer';

const tracks = [
  { title: 'Underwater Vowels', src: './audio/underwater-vowels.mp3' },
  { title: 'Respiration Douce', src: './audio/respiration-douce.mp3' },
  { title: 'Whispered Blooms', src: './audio/whispered-blooms.mp3' },
];

beforeEach(() => {
  jest.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function () {
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function () {
    this.dispatchEvent(new Event('pause'));
  });
  HTMLElement.prototype.showPopover = jest.fn();
  HTMLElement.prototype.hidePopover = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
  delete HTMLElement.prototype.showPopover;
  delete HTMLElement.prototype.hidePopover;
});

test('each new player starts at five percent and plays automatically', () => {
  const view = render(<MusicPlayer tracks={tracks} />);
  const audio = screen.getByTestId('soundtrack-audio');
  expect(audio.volume).toBe(.05);
  expect(screen.getByRole('slider', { name: 'Music volume' })).toHaveValue('5');
  expect(audio.play).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Pause music' })).toBeInTheDocument();
  fireEvent.change(screen.getByRole('slider', { name: 'Music volume' }), { target: { value: '38' } });
  expect(audio.volume).toBe(.38);
  view.unmount();
  render(<MusicPlayer tracks={tracks} autoplay={false} />);
  expect(screen.getByTestId('soundtrack-audio').volume).toBe(.05);
});

test('a refused autoplay starts on the first interaction outside the player', async () => {
  HTMLMediaElement.prototype.play.mockRejectedValueOnce(new Error('NotAllowedError'));
  await act(async () => { render(<MusicPlayer tracks={tracks} />); });
  const audio = screen.getByTestId('soundtrack-audio');
  expect(screen.getByRole('button', { name: 'Play music' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Paused');
  fireEvent.pointerDown(screen.getByRole('region', { name: 'Music player' }));
  expect(audio.play).toHaveBeenCalledTimes(1);
  fireEvent.pointerDown(document.body);
  expect(audio.play).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: 'Pause music' })).toBeInTheDocument();
  fireEvent.keyDown(document.body);
  expect(audio.play).toHaveBeenCalledTimes(2);
});

test('pressing play or pause cancels the autoplay retry', async () => {
  HTMLMediaElement.prototype.play.mockRejectedValueOnce(new Error('NotAllowedError'));
  await act(async () => { render(<MusicPlayer tracks={tracks} />); });
  const audio = screen.getByTestId('soundtrack-audio');
  fireEvent.click(screen.getByRole('button', { name: 'Play music' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pause music' }));
  fireEvent.pointerDown(document.body);
  expect(audio.play).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: 'Play music' })).toBeInTheDocument();
});

test('playback, track selection, seeking, and volume share the same audio element', () => {
  render(<MusicPlayer tracks={tracks} autoplay={false} />);
  const audio = screen.getByTestId('soundtrack-audio');
  fireEvent.click(screen.getByRole('button', { name: 'Play music' }));
  expect(screen.getByRole('button', { name: 'Pause music' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next track' }));
  expect(audio).toHaveAttribute('src', tracks[1].src);
  expect(audio.volume).toBe(.05);
  expect(audio.play).toHaveBeenCalledTimes(2);
  Object.defineProperty(audio, 'duration', { configurable: true, value: 120 });
  fireEvent.durationChange(audio);
  fireEvent.change(screen.getByRole('slider', { name: 'Track position' }), { target: { value: '45' } });
  expect(audio.currentTime).toBe(45);
  fireEvent.click(screen.getByRole('button', { name: 'Mute music' }));
  expect(audio.volume).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Unmute music' }));
  expect(audio.volume).toBe(.05);
  fireEvent.click(screen.getByRole('button', { name: 'Pause music' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Music track' }), { target: { value: '2' } });
  expect(audio).toHaveAttribute('src', tracks[2].src);
  expect(audio.play).toHaveBeenCalledTimes(2);
});

test('the controls move above an open native dialog without replacing or pausing audio', async () => {
  render(<MusicPlayer tracks={tracks} autoplay={false} />);
  const audio = screen.getByTestId('soundtrack-audio');
  const player = screen.getByRole('region', { name: 'Music player' });
  const host = player.parentNode;
  fireEvent.click(screen.getByRole('button', { name: 'Play music' }));
  const dialog = document.createElement('dialog');
  await act(async () => {
    dialog.setAttribute('open', '');
    document.body.appendChild(dialog);
  });
  expect(host.parentNode).toBe(dialog);
  expect(host).toHaveAttribute('popover', 'manual');
  expect(host.showPopover).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId('soundtrack-audio')).toBe(audio);
  expect(audio.pause).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Pause music' })).toBeInTheDocument();
  await act(async () => { dialog.remove(); });
  expect(host.parentNode).toBe(document.body);
  expect(player.parentNode).toBe(host);
  expect(audio.play).toHaveBeenCalledTimes(1);
});

test('playlist continues on ended and reports a playback failure without pretending to play', async () => {
  render(<MusicPlayer tracks={tracks} autoplay={false} />);
  const audio = screen.getByTestId('soundtrack-audio');
  fireEvent.click(screen.getByRole('button', { name: 'Play music' }));
  fireEvent.ended(audio);
  expect(audio).toHaveAttribute('src', tracks[1].src);
  fireEvent.click(screen.getByRole('button', { name: 'Pause music' }));
  audio.play.mockRejectedValueOnce(new Error('blocked'));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Play music' })); });
  expect(screen.getByRole('button', { name: 'Play music' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Playback unavailable. Try again.');
});
