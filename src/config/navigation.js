import portfolio from '../content/portfolio.json';

export const navigation = [
  { id: 'work', label: 'Work', href: '#work' },
];

const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// A project is a folder of notes within a topic, or a note on its own. Its pages keep the vault's
// order. A folder holding a single note is shown by that note's title rather than the folder's.
export function projectsOf(subcategory) {
  const groups = new Map();
  for (const entry of subcategory.entries) {
    const folder = (entry.folder || '').split('/')[0].trim();
    const key = folder ? `folder:${folder}` : `entry:${entry.id}`;
    if (!groups.has(key)) groups.set(key, { folder, pages: [] });
    groups.get(key).pages.push(entry);
  }
  return [...groups.values()].map(({ folder, pages }) => pages.length > 1
    ? { id: `${subcategory.id}--${slug(folder)}`, title: folder, pages }
    : { id: pages[0].id, title: pages[0].title, pages });
}

export function resolvePage(hash) {
  const [categoryId, subcategoryId, entryId] = hash.replace(/^#\/?/, '').split('/');
  const category = portfolio.categories.find(item => item.id === categoryId);
  const subcategory = category?.subcategories.find(item => item.id === subcategoryId) || category?.subcategories[0];
  const entry = subcategory?.entries.find(item => item.id === entryId);
  const project = entry ? projectsOf(subcategory).find(item => item.pages.includes(entry)) : undefined;
  return {
    id: category || categoryId === 'work' ? 'work' : 'home',
    categoryId: category?.id || 'technical-animation',
    subcategoryId: subcategory?.id,
    explicitSubcategoryId: category?.subcategories.some(item => item.id === subcategoryId) ? subcategoryId : undefined,
    category, subcategory, entry, project,
  };
}
