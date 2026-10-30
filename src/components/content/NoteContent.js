import portfolio from '../../content/portfolio.json';
import './NoteContent.css';

export const assetUrl = name => portfolio.media[name] ? `${process.env.PUBLIC_URL}${portfolio.media[name]}` : null;
const safeLink = url => /^(https?:\/\/|#\/)/i.test(url) ? url : null;
const findNote = name => {
  const key = name.toLowerCase().replace(/\.md$/, '');
  for (const category of portfolio.categories) {
    for (const subcategory of category.subcategories) {
      const entry = subcategory.entries.find(item => item.title.toLowerCase() === key);
      if (entry) return `#/${category.id}/${subcategory.id}/${entry.id}`;
    }
  }
  return null;
};

function Inline({ text }) {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]]+\]\]|\[[^\]]+\]\([^)]+\))/g);
  return tokens.map((token, index) => {
    if (token.startsWith('**')) return <strong key={index}>{token.slice(2, -2)}</strong>;
    if (token.startsWith('`')) return <code key={index}>{token.slice(1, -1)}</code>;
    if (token.startsWith('[[')) {
      const [name, label] = token.slice(2, -2).split('|');
      const href = findNote(name);
      return href ? <a key={index} href={href}>{label || name}</a> : <span key={index}>{label || name}</span>;
    }
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = safeLink(link[2]);
      return href ? <a key={index} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{link[1]}</a> : <span key={index}>{link[1]}</span>;
    }
    return token;
  });
}

function Media({ name }) {
  const src = assetUrl(name);
  if (!src) return <p className="media-unavailable">Media unavailable: {name}</p>;
  if (/\.(mp4|webm)$/i.test(name)) return <video className="note-media" controls playsInline preload="none" aria-label={name}><source src={src} />Your browser cannot play this video.</video>;
  if (/\.(mp3|wav|ogg)$/i.test(name)) return <audio controls preload="none" src={src}>Your browser cannot play this audio.</audio>;
  return <img className="note-media" src={src} alt={name.replace(/\.[^.]+$/, '')} loading="lazy" />;
}

// A deliberately limited Markdown renderer. Source HTML is never injected.
export default function NoteContent({ body }) {
  const content = body.replace(/<iframe[\s\S]*?<\/iframe>/gi, html => {
    const match = html.match(/https:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    return match ? `\n\n::youtube:${match[1]}\n\n` : '';
  });
  const lines = content.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let list = [];
  let numbered = false;
  const flushParagraph = () => {
    if (paragraph.length) blocks.push(<p key={`p-${blocks.length}`}><Inline text={paragraph.join(' ')} /></p>);
    paragraph = [];
  };
  const flushList = () => {
    const List = numbered ? 'ol' : 'ul';
    if (list.length) blocks.push(<List key={`l-${blocks.length}`}>{list.map((item, i) => <li key={i}><Inline text={item} /></li>)}</List>);
    list = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    // `--` splits a slide vertically in an Obsidian slide deck; on the page it is no divider.
    if (line === '--') { flushParagraph(); flushList(); continue; }
    if (/^```/.test(line)) {
      flushParagraph(); flushList();
      const code = [];
      while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
      blocks.push(<pre key={`code-${i}`}><code>{code.join('\n')}</code></pre>);
      continue;
    }
    const media = line.match(/^!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/);
    const youtube = line.match(/^::youtube:([\w-]{11})$/);
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    const item = line.match(/^([-*]|\d+\.)\s+(.+)$/);
    // Shields linked download badges are represented by their real link and label.
    const badge = line.match(/^\[!\[([^\]]+)\]\([^)]+\)\]\(([^)]+)\)$/);
    if (media || youtube || heading || /^-{3,}$/.test(line) || badge || line.startsWith('>')) {
      flushParagraph(); flushList();
      const key = `block-${i}`;
      if (media) blocks.push(<Media key={key} name={media[1]} />);
      else if (youtube) blocks.push(<iframe key={key} className="note-video" src={`https://www.youtube-nocookie.com/embed/${youtube[1]}`} title="Project showcase" loading="lazy" allow="fullscreen; picture-in-picture" allowFullScreen />);
      else if (heading) {
        const Heading = `h${Math.min(heading[1].length + 1, 4)}`;
        blocks.push(<Heading key={key}><Inline text={heading[2]} /></Heading>);
      } else if (badge) blocks.push(<p key={key}><a href={safeLink(badge[2]) || undefined} target="_blank" rel="noreferrer">{badge[1]} &mdash; Download</a></p>);
      else if (line.startsWith('>')) blocks.push(<blockquote key={key}><Inline text={line.replace(/^>\s?/, '')} /></blockquote>);
      else blocks.push(<hr key={key} />);
    } else if (item) {
      flushParagraph();
      // Numbered and bulleted items make lists of their own.
      const isNumbered = /\d/.test(item[1]);
      if (list.length && isNumbered !== numbered) flushList();
      numbered = isNumbered;
      list.push(item[2]);
    } else {
      flushList(); paragraph.push(line.replace(/<[^>]*>/g, ''));
    }
  }
  flushParagraph(); flushList();
  return <div className="note-content">{blocks}</div>;
}
