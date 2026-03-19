import { IngredientType, GameConfig, MALATANG_VEG_TYPES, MALATANG_MEAT_TYPES } from './GameConfig';

/**
 * 商品数据 - 批发商品定义
 */
export interface ShopItemData {
    id: string;                    // 商品ID
    name: string;                  // 商品名称
    emoji: string;                 // 表情符号
    ingredientType: IngredientType; // 对应的食材类型
    quantity: number;              // 每份数量（购买时获得的原料数量）
    price: number;                 // 价格（元）
    unit: string;                  // 单位（袋、篮、包等）
    needsProcessing: boolean;      // 是否需要二次加工
    processingType?: 'chop' | 'none'; // 加工类型
    processingYield?: number;      // 🔥 加工产出倍数（1个原料产出多少份，默认1）
    description: string;           // 描述
}

/**
 * 批发商品列表
 * recommendedBuy: 一键购买时的推荐数量（保证完成一天制作）
 */
export const SHOP_ITEMS: ShopItemData[] = [
    {
        id: 'dough_bag',
        name: '面饼',
        emoji: '🍞',
        ingredientType: IngredientType.DOUGH,
        quantity: 25,
        price: 8,
        unit: '袋',
        needsProcessing: false,
        description: '新鲜面饼，25张/袋，¥0.32/张'
    },
    {
        id: 'egg_basket',
        name: '鸡蛋',
        emoji: '🥚',
        ingredientType: IngredientType.EGG,
        quantity: 10,
        price: 8,
        unit: '盒',
        needsProcessing: false,
        description: '农家土鸡蛋，10个/盒，¥0.8/个'
    },
    {
        id: 'sausage_pack',
        name: '香肠',
        emoji: '🌭',
        ingredientType: IngredientType.SAUSAGE,
        quantity: 10,
        price: 8,
        unit: '包',
        needsProcessing: false,
        description: '烤肠专用，10根/包，¥0.8/根'
    },
    {
        id: 'onion_bag',
        name: '洋葱',
        emoji: '🧅',
        ingredientType: IngredientType.ONION,
        quantity: 5,
        price: 4,
        unit: '袋',
        needsProcessing: true,
        processingType: 'chop',
        processingYield: 12,
        description: '新鲜洋葱5个/袋，每个可切12份'
    },
    {
        id: 'cilantro_bundle',
        name: '香菜',
        emoji: '🌿',
        ingredientType: IngredientType.CILANTRO,
        quantity: 3,
        price: 2,
        unit: '捆',
        needsProcessing: true,
        processingType: 'chop',
        processingYield: 12,
        description: '新鲜香菜3把/捆，每把可切12份'
    },
    // 🔥 酱料、调料、油、水为无限使用食材，不需要购买
    // sauce_bottle, seasoning_pack, oil_barrel 已移除
];

/**
 * 🛒 一键购买推荐配置
 * 根据每日目标客流量（约25-30份）计算的推荐购买数量
 * 每份烤冷面需要：1面饼 + 1鸡蛋 + 可选(洋葱/香菜/香肠)
 * 注：酱料、调料、油、水为无限使用，无需购买
 */
export const QUICK_BUY_CONFIG: { [itemId: string]: number } = {
    'dough_bag': 1,      // 25张面饼，够25份
    'egg_basket': 3,     // 30个鸡蛋，够30份
    'sausage_pack': 2,   // 20根香肠，约50%客人会加
    'onion_bag': 1,      // 5个洋葱×12=60份，约50%客人会加
    'cilantro_bundle': 1 // 3把香菜×12=36份，约40%客人会加
    // 酱料、调料、油、水为无限使用，不计入购买
};

/**
 * 计算一键购买总价
 */
export function getQuickBuyTotalPrice(): number {
    let total = 0;
    for (const item of SHOP_ITEMS) {
        const count = QUICK_BUY_CONFIG[item.id] || 0;
        total += item.price * count;
    }
    return total;
}

/**
 * 关卡目标数据
 */
export interface LevelTargetData {
    levelId: number;           // 关卡ID
    levelName: string;         // 关卡名称
    targetMoney: number;       // 目标金额
    initialMoney: number;      // 初始资金
    maxBadReviews: number;     // 最大差评数（超过则失败）
    timeLimit: number;         // 时间限制（游戏内小时数，如8表示8小时）
    unlockCondition?: string;  // 解锁条件描述
}

/**
 * 关卡列表
 * 🔥 初始资金统一使用全局钱包（¥1000），目标金额为当天需赚取的金额
 */
export const LEVEL_DATA: LevelTargetData[] = [
    {
        levelId: 1,
        levelName: '烤冷面',
        targetMoney: 150,
        initialMoney: 1000,
        maxBadReviews: 5,
        timeLimit: 8
    },
    {
        levelId: 2,
        levelName: '东北饭包',
        targetMoney: 150,
        initialMoney: 1000,
        maxBadReviews: 4,
        timeLimit: 8
    },
    {
        levelId: 3,
        levelName: '锅包肉',
        targetMoney: 150,
        initialMoney: 1000,
        maxBadReviews: 3,
        timeLimit: 8
    },
    {
        levelId: 4,
        levelName: '麻辣烫',
        targetMoney: 180,
        initialMoney: 1000,
        maxBadReviews: 3,
        timeLimit: 8
    },
    {
        levelId: 5,
        levelName: '烧烤',
        targetMoney: 200,
        initialMoney: 1000,
        maxBadReviews: 2,
        timeLimit: 8
    },
    {
        levelId: 6,
        levelName: '料理王比赛',
        targetMoney: 200,
        initialMoney: 1000,
        maxBadReviews: 2,
        timeLimit: 8
    }
];

/**
 * 获取商品数据
 */
export function getShopItemById(id: string): ShopItemData | undefined {
    return SHOP_ITEMS.find(item => item.id === id);
}

/**
 * 根据关卡配置获取需要加工的商品列表
 * @param levelId 关卡ID
 */
export function getProcessingItems(levelId: number = 1): ShopItemData[] {
    // 🆕 从关卡配置获取商品列表
    const levelConfig = GameConfig.LEVELS.find(l => l.levelId === levelId);

    if (!levelConfig) {
        // 回退到默认逻辑
        return SHOP_ITEMS.filter(item => item.needsProcessing);
    }

    // 🆕 优先使用关卡专属商品列表
    let shopItems = SHOP_ITEMS; // 默认

    if (levelConfig.shopItems) {
        // 如果是字符串标记，使用对应的商品列表
        if (typeof levelConfig.shopItems === 'string') {
            if (levelConfig.shopItems === 'RICE_BUNDLE_SHOP_ITEMS') {
                shopItems = RICE_BUNDLE_SHOP_ITEMS;
            } else if (levelConfig.shopItems === 'GUO_BAO_ROU_SHOP_ITEMS') {
                shopItems = GUO_BAO_ROU_SHOP_ITEMS;
            } else if (levelConfig.shopItems === 'MALATANG_SHOP_ITEMS') {
                shopItems = MALATANG_SHOP_ITEMS;
            }
        }
        // 如果是数组，直接使用
        else if (Array.isArray(levelConfig.shopItems)) {
            shopItems = levelConfig.shopItems;
        }
    }

    return shopItems.filter(item => item.needsProcessing);
}

/**
 * ==================== 第二关：东北饭包商品配置 ====================
 */
export const RICE_BUNDLE_SHOP_ITEMS: ShopItemData[] = [
    {
        id: 'rice_bag',
        name: '大米',
        emoji: '🍚',
        ingredientType: IngredientType.RICE,
        quantity: 20,
        price: 15,
        unit: '袋',
        needsProcessing: false,
        description: '东北大米，20份/袋，¥0.75/份'
    },
    {
        id: 'egg_carton',
        name: '鸡蛋',
        emoji: '🥚',
        ingredientType: IngredientType.EGG,
        quantity: 12,
        price: 10,
        unit: '盒',
        needsProcessing: false,
        description: '农家土鸡蛋，12个/盒，用于炒酱'
    },
    {
        id: 'green_onion_bundle',
        name: '大葱',
        emoji: '🧅',
        ingredientType: IngredientType.GREEN_ONION,
        quantity: 5,
        price: 3,
        unit: '捆',
        needsProcessing: true,
        processingType: 'chop',
        processingYield: 15,
        description: '东北大葱，5捆/份，切碎做调料'
    },
    {
        id: 'potato_bag',
        name: '土豆',
        emoji: '🥔',
        ingredientType: IngredientType.POTATO,
        quantity: 10,
        price: 10,
        unit: '袋',
        needsProcessing: true,
        processingType: 'chop',
        processingYield: 10,
        description: '新鲜土豆，10个/袋，可蒸制做泥'
    },
    {
        id: 'lettuce_head',
        name: '生菜',
        emoji: '🥬',
        ingredientType: IngredientType.LETTUCE,
        quantity: 20,
        price: 8,
        unit: '颗',
        needsProcessing: false,
        description: '新鲜生菜叶，20片/颗，用于包裹'
    },
    {
        id: 'cilantro_bundle',
        name: '香菜',
        emoji: '🌿',
        ingredientType: IngredientType.CILANTRO,
        quantity: 5,
        price: 2,
        unit: '捆',
        needsProcessing: true,   // 🔥 第二关需要加工
        processingType: 'chop',  // 切碎
        processingYield: 10,
        description: '新鲜香菜，5把/捆，每把可切10份'
    }
];

/**
 * ==================== 第三关：锅包肉商品配置 ====================
 */
export const GUO_BAO_ROU_SHOP_ITEMS: ShopItemData[] = [
    {
        id: 'pork_tenderloin',
        name: '里脊肉',
        emoji: '🥩',
        ingredientType: IngredientType.PORK,
        quantity: 10,
        price: 18,
        unit: '盒',
        needsProcessing: true,
        processingType: 'chop',
        processingYield: 8,
        description: '精选里脊肉，10份/盒，每份可切8片'
    },
    {
        id: 'radish_bag',
        name: '萝卜',
        emoji: '🥕',
        ingredientType: IngredientType.RADISH,
        quantity: 8,
        price: 6,
        unit: '袋',
        needsProcessing: true,
        processingType: 'chop',
        processingYield: 12,
        description: '新鲜萝卜8个/袋，每个可切12份'
    },
    {
        id: 'ginger_bag',
        name: '姜',
        emoji: '🫚',
        ingredientType: IngredientType.GINGER,
        quantity: 6,
        price: 5,
        unit: '袋',
        needsProcessing: true,
        processingType: 'chop',
        processingYield: 12,
        description: '老姜6块/袋，每块可切12份'
    },
    {
        id: 'green_onion_bundle',
        name: '大葱',
        emoji: '🧅',
        ingredientType: IngredientType.GREEN_ONION,
        quantity: 5,
        price: 3,
        unit: '捆',
        needsProcessing: true,
        processingType: 'chop',
        processingYield: 12,
        description: '东北大葱，5捆/份，切丝做配料'
    },
    {
        id: 'potato_starch_bag',
        name: '土豆淀粉',
        emoji: '🥔',
        ingredientType: IngredientType.POTATO_STARCH,
        quantity: 8,
        price: 6,
        unit: '袋',
        needsProcessing: false,
        description: '锅包肉专用淀粉，8份/袋'
    }
];

/**
 * ==================== 第四关：麻辣烫商品配置 ====================
 */
const MALATANG_VEG_SHOP_ITEMS: ShopItemData[] = MALATANG_VEG_TYPES.map((type, index) => ({
    id: `mala_veg_${index + 1}`,
    name: `菜${index + 1}`,
    emoji: '??',
    ingredientType: type,
    quantity: 1200,
    price: 18,
    unit: '箱',
    needsProcessing: false,
    description: `麻辣烫蔬菜${index + 1}，约1200g/箱`
}));

const MALATANG_MEAT_SHOP_ITEMS: ShopItemData[] = MALATANG_MEAT_TYPES.map((type, index) => ({
    id: `mala_meat_${index + 1}`,
    name: `肉${index + 1}`,
    emoji: '??',
    ingredientType: type,
    quantity: 900,
    price: 36,
    unit: '盒',
    needsProcessing: false,
    description: `麻辣烫肉类${index + 1}，约900g/盒`
}));

export const MALATANG_SHOP_ITEMS: ShopItemData[] = [
    ...MALATANG_VEG_SHOP_ITEMS,
    ...MALATANG_MEAT_SHOP_ITEMS
];

/**
 * 第二关一键购买推荐配置
 */
export const RICE_BUNDLE_QUICK_BUY_CONFIG: { [itemId: string]: number } = {
    'rice_bag': 2,          // 40份大米
    'egg_carton': 3,        // 36个鸡蛋
    'green_onion_bundle': 2, // 30份大葱
    'potato_bag': 2,        // 20份土豆
    'lettuce_head': 2,      // 40片生菜
    'cilantro_bundle': 2    // 10把香菜
};

/**
 * 第三关一键购买推荐配置
 */
export const GUO_BAO_ROU_QUICK_BUY_CONFIG: { [itemId: string]: number } = {
    'pork_tenderloin': 2,
    'radish_bag': 1,
    'ginger_bag': 1,
    'green_onion_bundle': 1,
    'potato_starch_bag': 1
};

/**
 * 计算第二关一键购买总价
 */
export function getRiceBundleQuickBuyTotalPrice(): number {
    let total = 0;
    for (const item of RICE_BUNDLE_SHOP_ITEMS) {
        const count = RICE_BUNDLE_QUICK_BUY_CONFIG[item.id] || 0;
        total += item.price * count;
    }
    return total;
}

/**
 * 第三关一键购买总价
 */
export function getGuoBaoRouQuickBuyTotalPrice(): number {
    let total = 0;
    for (const item of GUO_BAO_ROU_SHOP_ITEMS) {
        const count = GUO_BAO_ROU_QUICK_BUY_CONFIG[item.id] || 0;
        total += item.price * count;
    }
    return total;
}

/**
 * 获取关卡数据
 */
export function getLevelData(levelId: number): LevelTargetData | undefined {
    return LEVEL_DATA.find(level => level.levelId === levelId);
}
