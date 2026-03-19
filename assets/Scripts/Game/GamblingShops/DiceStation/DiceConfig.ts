export interface DiceShopItem {
    name: string;
    price: number;
    type: string;
    desc: string;
}

export const DICE_SUM_ODDS: Record<number, number> = {
    3: 150,
    4: 50,
    5: 18,
    6: 14,
    7: 12,
    8: 8,
    9: 6,
    10: 6,
    11: 6,
    12: 6,
    13: 8,
    14: 12,
    15: 14,
    16: 18,
    17: 50,
    18: 150
};

export const DICE_SUM_RANGE_OPTIONS: Array<{ low: number; high: number }> = [
    { low: 3, high: 6 },
    { low: 7, high: 12 },
    { low: 8, high: 13 },
    { low: 9, high: 14 },
    { low: 10, high: 15 },
    { low: 16, high: 18 }
];

export const DICE_SHOP_ITEMS: DiceShopItem[] = [
    { name: '稀有食材包', price: 300, type: 'ingredient', desc: '兑换稀有食材（收集向）' },
    { name: '传奇主料', price: 700, type: 'ingredient', desc: '高阶料理素材' },
    { name: '情报折扣券', price: 220, type: 'tool', desc: '下次情报价格 -20%' },
    { name: '透骰优先券', price: 320, type: 'tool', desc: '下一局情报必出透骰票' }
];
