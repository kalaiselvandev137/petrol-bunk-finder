// constants/brands.js
export const PETROL_BRANDS = [
  {
    id: 'indian_oil',
    label: 'Indian Oil',
    keywords: ['indian oil', 'iocl', 'indianoil', 'indian oil corporation'],
    color: '#FF6B00',
  },
  {
    id: 'bharat',
    label: 'Bharat Petroleum',
    keywords: ['bharat petroleum', 'bpcl', 'bharat', 'bp '],
    color: '#1E3A8A',
  },
  {
    id: 'hp',
    label: 'Hindustan Petroleum',
    keywords: ['hindustan petroleum', 'hpcl', 'hp petrol', 'hp diesel', 'hp '],
    color: '#DC2626',
  },
  {
    id: 'nayara',
    label: 'Nayara',
    keywords: ['nayara', 'essar'],
    color: '#059669',
  },
  {
    id: 'jio_bp',
    label: 'Jio-bp',
    keywords: ['jio-bp', 'jio bp', 'reliance', 'jiobp'],
    color: '#7C3AED',
  },
  {
    id: 'shell',
    label: 'Shell',
    keywords: ['shell'],
    color: '#EAB308',
  },
];

export function matchesBrand(bunkName = '', selectedBrandIds = []) {
  if (!selectedBrandIds.length) return true;

  const name = bunkName.toLowerCase();

  return selectedBrandIds.some((id) => {
    const brand = PETROL_BRANDS.find((b) => b.id === id);
    if (!brand) return false;
    return brand.keywords.some((kw) => name.includes(kw));
  });
}