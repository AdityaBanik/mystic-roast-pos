export type MenuOption = { id: string; name: string; priceAdjustment: number };
export type MenuGroup = { id: string; name: string; minimum: number; maximum: number; options: MenuOption[] };
export type MenuItem = { id: string; name: string; price: number; category: string; groups: MenuGroup[]; fixedItems: string[] };
