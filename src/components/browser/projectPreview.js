import { assetUrl } from '../content/NoteContent';

// What the preview card shows for an entry: its first video, else its first image, else nothing.
export function projectPreview(entry) {
  const embeds = [...entry.body.matchAll(/^\s*!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*$/gm)]
    .map(match => match[1].trim())
    .filter(name => assetUrl(name));
  const video = embeds.find(name => /\.(mp4|webm)$/i.test(name));
  if (video) return { kind: 'video', src: assetUrl(video) };
  const image = embeds.find(name => /\.(png|jpe?g|gif|webp|avif)$/i.test(name));
  if (image) return { kind: 'image', src: assetUrl(image), alt: image.replace(/\.[^.]+$/, '') };
  return null;
}
