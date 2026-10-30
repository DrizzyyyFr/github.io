import { assetUrl } from '../content/NoteContent';

// A YouTube video embedded or linked in a note, in any of the forms the notes use.
const YOUTUBE = /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/;

// What the preview card shows for an entry: its first video, else a YouTube video it embeds,
// else its first image, else nothing.
export function projectPreview(entry) {
  const embeds = [...entry.body.matchAll(/^\s*!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*$/gm)]
    .map(match => match[1].trim())
    .filter(name => assetUrl(name));
  const video = embeds.find(name => /\.(mp4|webm)$/i.test(name));
  if (video) return { kind: 'video', src: assetUrl(video) };
  const youtube = entry.body.match(YOUTUBE);
  if (youtube) return { kind: 'youtube', id: youtube[1], src: `youtube:${youtube[1]}` };
  const image = embeds.find(name => /\.(png|jpe?g|gif|webp|avif)$/i.test(name));
  if (image) return { kind: 'image', src: assetUrl(image), alt: image.replace(/\.[^.]+$/, '') };
  return null;
}

// The privacy-enhanced player the notes already use, set up as a silent, chromeless loop for
// the preview. Browsers only autoplay muted video, so it is muted; looping one video needs
// itself as the playlist.
export function youtubePreviewUrl(id, autoplay) {
  const options = new URLSearchParams({
    autoplay: autoplay ? '1' : '0', mute: '1', loop: '1', playlist: id, controls: '0',
    playsinline: '1', rel: '0', iv_load_policy: '3', disablekb: '1', modestbranding: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${options}`;
}
