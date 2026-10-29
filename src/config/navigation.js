import portfolio from '../content/portfolio.json';

export const navigation = [
  { id: 'work', label: 'Work', href: '#work' },
];

export function resolvePage(hash) {
  const [categoryId, subcategoryId, entryId] = hash.replace(/^#\/?/, '').split('/');
  const category = portfolio.categories.find(item => item.id === categoryId);
  const subcategory = category?.subcategories.find(item => item.id === subcategoryId) || category?.subcategories[0];
  const entry = subcategory?.entries.find(item => item.id === entryId);
  return {
    id: category || categoryId === 'work' ? 'work' : 'home',
    categoryId: category?.id || 'technical-animation',
    subcategoryId: subcategory?.id,
    explicitSubcategoryId: category?.subcategories.some(item => item.id === subcategoryId) ? subcategoryId : undefined,
    category, subcategory, entry,
  };
}
