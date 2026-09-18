import type { MenuItem } from '../domain/menu';

// Fixture catalogue only. Never submit these IDs to a live API.
export const previewMenu: MenuItem[] = [
  { id: 'preview-bbq', name: 'BBQ Chicken Pizza', price: 249, category: 'PIZZA', groups: [], fixedItems: [] },
  { id: 'preview-farmhouse', name: 'Veg Farmhouse Pizza', price: 239, category: 'PIZZA', groups: [], fixedItems: [] },
  { id: 'preview-margherita', name: 'Margherita', price: 179, category: 'PIZZA', groups: [], fixedItems: [] },
  { id: 'preview-momo', name: 'Momo Combo', price: 159, category: 'MOMOS', fixedItems: ['Six momos'], groups: [
    { id: 'preview-sauce', name: 'Choose sauce', minimum: 1, maximum: 1, options: [
      { id: 'preview-sauce-bbq', name: 'BBQ sauce', priceAdjustment: 0 },
      { id: 'preview-sauce-cheese', name: 'Cheese garlic sauce', priceAdjustment: 10 },
    ] },
  ] },
  { id: 'preview-mocha', name: 'Iced Mocha', price: 159, category: 'DRINKS', groups: [], fixedItems: [] },
  { id: 'preview-lagoon', name: 'Blue Lagoon', price: 79, category: 'DRINKS', groups: [], fixedItems: [] },
  { id: 'preview-mojito', name: 'Virgin Classic Mojito', price: 79, category: 'DRINKS', groups: [], fixedItems: [] },
];
