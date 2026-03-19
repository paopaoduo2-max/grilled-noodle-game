import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 游戏阶段枚举
 */
export enum GamePhase {
    PREPARE = 'prepare',      // 准备阶段
    COOKING = 'cooking',      // 制作阶段
    RESULT = 'result'         // 结算阶段
}

/**
 * 食材类型
 * 🔥 统一定义所有关卡的食材类型（唯一来源）
 */
export enum IngredientType {
    // ==================== 烤冷面食材 ====================
    DOUGH = 'dough',             // 面饼（烤冷面专用）
    NOODLE = 'noodle',           // 面饼（别名，兼容旧代码）
    EGG = 'egg',                 // 鸡蛋
    SAUSAGE = 'sausage',         // 香肠
    CILANTRO = 'cilantro',       // 香菜
    CORIANDER = 'coriander',     // 香菜（别名）
    ONION = 'onion',             // 洋葱
    GRILLED_NOODLE_SAUCE = 'grilled_noodle_sauce',  // 烤冷面酱
    SAUCE = 'sauce',             // 酱料（别名）
    VINEGAR = 'vinegar',         // 醋
    CHILI = 'chili',             // 辣椒
    SUGAR = 'sugar',             // 白糖
    SALT = 'salt',               // 盐
    OIL = 'oil',                 // 食用油
    WATER = 'water',             // 水（喷水用）
    SEASONING_PACK = 'seasoning_pack',  // 调料包
    SPATULA = 'spatula',         // 铲子
    
    // 煎饼果子食材
    BATTER = 'batter',           // 面糊
    CRISPY = 'crispy',           // 薄脆
    LETTUCE = 'lettuce',         // 生菜
    SWEET_SAUCE = 'sweet_sauce', // 甜面酱
    SCALLION = 'scallion',       // 香葱
    
    // 麻辣烫食材
    MEATBALL = 'meatball',       // 肉丸
    VEGETABLE_MIX = 'vegetable_mix', // 蔬菜包
    TOFU = 'tofu',               // 豆制品
    NOODLES = 'noodles',         // 粉丝
    SPICY_SOUP = 'spicy_soup',   // 麻辣汤底
    MALATANG_VEG_1 = 'mala_veg_1',
    MALATANG_VEG_2 = 'mala_veg_2',
    MALATANG_VEG_3 = 'mala_veg_3',
    MALATANG_VEG_4 = 'mala_veg_4',
    MALATANG_VEG_5 = 'mala_veg_5',
    MALATANG_VEG_6 = 'mala_veg_6',
    MALATANG_VEG_7 = 'mala_veg_7',
    MALATANG_VEG_8 = 'mala_veg_8',
    MALATANG_VEG_9 = 'mala_veg_9',
    MALATANG_VEG_10 = 'mala_veg_10',
    MALATANG_VEG_11 = 'mala_veg_11',
    MALATANG_VEG_12 = 'mala_veg_12',
    MALATANG_VEG_13 = 'mala_veg_13',
    MALATANG_VEG_14 = 'mala_veg_14',
    MALATANG_VEG_15 = 'mala_veg_15',
    MALATANG_MEAT_1 = 'mala_meat_1',
    MALATANG_MEAT_2 = 'mala_meat_2',
    MALATANG_MEAT_3 = 'mala_meat_3',
    MALATANG_MEAT_4 = 'mala_meat_4',
    MALATANG_MEAT_5 = 'mala_meat_5',
    MALATANG_MEAT_6 = 'mala_meat_6',
    MALATANG_MEAT_7 = 'mala_meat_7',
    MALATANG_MEAT_8 = 'mala_meat_8',
    MALATANG_MEAT_9 = 'mala_meat_9',
    MALATANG_MEAT_10 = 'mala_meat_10',
    MALATANG_MEAT_11 = 'mala_meat_11',
    MALATANG_MEAT_12 = 'mala_meat_12',
    MALATANG_MEAT_13 = 'mala_meat_13',
    MALATANG_MEAT_14 = 'mala_meat_14',
    MALATANG_MEAT_15 = 'mala_meat_15',
    
    // 铁板烧食材
    SQUID = 'squid',             // 鱿鱼须
    PORK = 'pork',               // 里脊肉
    CUMIN = 'cumin',             // 孜然粉
    CHILI_POWDER = 'chili_powder', // 辣椒粉
    BBQ_SAUCE = 'bbq_sauce',     // 烧烤酱
    SOY_SAUCE = 'soy_sauce',     // 酱油
    PEPPER_POWDER = 'pepper_powder', // 花椒面
    
    // 炸串食材
    MEAT_SKEWER = 'meat_skewer', // 肉串
    VEG_SKEWER = 'veg_skewer',   // 蔬菜串
    CHICKEN = 'chicken',         // 鸡柳
    BREADCRUMB = 'breadcrumb',   // 面包糠
    KETCHUP = 'ketchup',         // 番茄酱
    
    // 烤肉拌饭食材
    PORK_BELLY = 'pork_belly',   // 五花肉
    BEEF = 'beef',               // 牛肉片
    RICE = 'rice',               // 米饭
    KIMCHI = 'kimchi',           // 泡菜
    BEAN_SPROUT = 'bean_sprout', // 豆芽
    STONE_POT = 'stone_pot',     // 石锅
    
    // 东北乱炖食材
    POTATO = 'potato',           // 土豆
    EGGPLANT = 'eggplant',       // 茄子
    GREEN_BEAN = 'green_bean',   // 豆角
    CORN = 'corn',               // 玉米
    VERMICELLI = 'vermicelli',   // 粉条
    BROTH = 'broth',             // 高汤
    SPICE_MIX = 'spice_mix',     // 秘制调料包
    
    // 东北饭包食材
    GREEN_ONION = 'green_onion', // 大葱
    POTATO_MASH = 'potato_mash', // 土豆泥
    CABBAGE_LEAF = 'cabbage_leaf', // 白菜叶
    PEANUT_SAUCE = 'peanut_sauce', // 花生酱
    SESAME_SAUCE = 'sesame_sauce', // 芝麻酱
    COOKED_RICE = 'cooked_rice',   // 熟米饭
    EGG_SAUCE = 'egg_sauce',       // 鸡蛋酱
    MIXING_BOWL = 'mixing_bowl',   // 拌料盆
    // 锅包肉食材
    RADISH = 'radish',             // 萝卜
    GINGER = 'ginger',             // 姜
    POTATO_STARCH = 'potato_starch' // 土豆淀粉
}

/**
 * 客户类型
 */
export enum CustomerType {
    NORMAL = 'normal',           // 普通客户
    VIP = 'vip',                 // VIP客户
    URGENT = 'urgent'            // 着急的客户
}

/**
 * 订单状态
 */
export enum OrderStatus {
    WAITING = 'waiting',         // 等待中
    COOKING = 'cooking',         // 制作中
    COMPLETED = 'completed',     // 已完成
    TIMEOUT = 'timeout'          // 超时
}

/**
 * 步骤操作类型
 */
export enum StepType {
    CLICK = 'click',            // 点击
    HOLD = 'hold',              // 长按
    SWIPE = 'swipe',            // 滑动
    TIMING = 'timing',          // 时机判定
    DRAG = 'drag',              // 拖拽
    SEQUENCE = 'sequence'       // 连续点击
}

/**
 * 差评原因
 */
export enum ReviewCause {
    TIMEOUT = 'timeout',                // 超时
    LOW_QUALITY = 'low_quality',        // 品质差
    BURNT = 'burnt',                    // 烤糊
    UNDERCOOKED = 'undercooked',        // 没熟
    WRONG_ORDER = 'wrong_order',        // 错误订单
    SLOW_SERVICE = 'slow_service'       // 服务慢
}

/**
 * 道具类型
 */
export enum ItemType {
    SHOPPING_CART = 'shopping_cart',        // 购物车
    SPEED_GLOVES = 'speed_gloves',          // 加速手套
    QUALITY_BOOST = 'quality_boost',        // 品质提升
    EXTRA_SLOT = 'extra_slot',              // 额外烹饪位
    REVIEW_INSURANCE = 'review_insurance',  // 差评保险
    VIP_CARD = 'vip_card',                  // VIP会员卡
    AUTO_TIMER = 'auto_timer'               // 自动计时器
}

/**
 * 食材数据
 */
export interface IngredientData {
    type: IngredientType;        // 食材类型
    name: string;                // 食材名称
    count: number;               // 数量
    price: number;               // 价格
    icon: string;                // 图标（临时用颜色代替）
    color: string;               // 临时颜色
}

export const MALATANG_VEG_TYPES: IngredientType[] = [
    IngredientType.MALATANG_VEG_1,
    IngredientType.MALATANG_VEG_2,
    IngredientType.MALATANG_VEG_3,
    IngredientType.MALATANG_VEG_4,
    IngredientType.MALATANG_VEG_5,
    IngredientType.MALATANG_VEG_6,
    IngredientType.MALATANG_VEG_7,
    IngredientType.MALATANG_VEG_8,
    IngredientType.MALATANG_VEG_9,
    IngredientType.MALATANG_VEG_10,
    IngredientType.MALATANG_VEG_11,
    IngredientType.MALATANG_VEG_12,
    IngredientType.MALATANG_VEG_13,
    IngredientType.MALATANG_VEG_14,
    IngredientType.MALATANG_VEG_15
];

export const MALATANG_MEAT_TYPES: IngredientType[] = [
    IngredientType.MALATANG_MEAT_1,
    IngredientType.MALATANG_MEAT_2,
    IngredientType.MALATANG_MEAT_3,
    IngredientType.MALATANG_MEAT_4,
    IngredientType.MALATANG_MEAT_5,
    IngredientType.MALATANG_MEAT_6,
    IngredientType.MALATANG_MEAT_7,
    IngredientType.MALATANG_MEAT_8,
    IngredientType.MALATANG_MEAT_9,
    IngredientType.MALATANG_MEAT_10,
    IngredientType.MALATANG_MEAT_11,
    IngredientType.MALATANG_MEAT_12,
    IngredientType.MALATANG_MEAT_13,
    IngredientType.MALATANG_MEAT_14,
    IngredientType.MALATANG_MEAT_15
];

const MALATANG_PLACEHOLDER_CONFIG: { [key: string]: IngredientData } = {};
MALATANG_VEG_TYPES.forEach((type, index) => {
    MALATANG_PLACEHOLDER_CONFIG[type] = {
        type,
        name: `菜${index + 1}`,
        count: 0,
        price: 3,
        icon: '??',
        color: '#7FBF7F'
    };
});
MALATANG_MEAT_TYPES.forEach((type, index) => {
    MALATANG_PLACEHOLDER_CONFIG[type] = {
        type,
        name: `肉${index + 1}`,
        count: 0,
        price: 5,
        icon: '??',
        color: '#D17979'
    };
});

/**
 * 制作步骤数据
 */
export interface RecipeStep {
    stepId: number;              // 步骤ID
    name: string;                // 步骤名称
    type: StepType;              // 操作类型
    duration?: number;           // 持续时间（秒）
    direction?: string;          // 方向（上下左右）
    perfectWindow?: {            // 完美窗口
        start: number;           // 0-1
        end: number;
    };
    instruction: string;         // 操作提示
    targetValue?: number;        // 目标值（如连续点击次数）
}

/**
 * 差评数据
 */
export interface ReviewData {
    reviewId: string;            // 差评ID
    type: 'positive' | 'negative'; // 类型
    content: string;             // 内容
    customerId: string;          // 客户ID
    timestamp: number;           // 时间戳
    cause?: ReviewCause;         // 差评原因
}

/**
 * 道具数据
 */
export interface ItemData {
    itemId: string;              // 道具ID
    name: string;                // 道具名称
    description: string;         // 描述
    price: number;               // 价格
    type: ItemType;              // 道具类型
    effect: {                    // 效果
        type: string;
        value: any;
    };
    unlockLevel: number;         // 解锁关卡
    icon?: string;               // 图标
    color: string;               // 临时颜色
}

/**
 * 菜谱配方
 */
export interface RecipeData {
    id: string;                  // 配方ID
    name: string;                // 菜品名称
    ingredients: {               // 所需食材
        type: IngredientType;
        count: number;
    }[];
    cookTime: number;            // 制作时间（秒）
    price: number;               // 售价
    score: number;               // 基础评分
    steps: RecipeStep[];         // 制作步骤
    emoji?: string;              // 表情符号
}

/**
 * 客户数据
 */
export interface CustomerData {
    id: string;                  // 客户ID
    name: string;                // 客户名称
    type: CustomerType;          // 客户类型
    patience: number;            // 耐心值（秒）
    orderRecipe: string;         // 订单菜品ID
    tip: number;                 // 小费
    avatar: string;              // 头像（临时用颜色）
    color: string;               // 临时颜色
    // 角色系统扩展字段
    characterType?: string;       // 顾客角色类型（用于角色系统）
    mood?: string;                // 顾客情绪状态
}

/**
 * 订单数据
 */
export interface OrderData {
    orderId: string;             // 订单ID
    customer: CustomerData;      // 客户信息
    recipe: RecipeData;          // 菜品配方
    status: OrderStatus;         // 订单状态
    remainTime: number;          // 剩余时间
    startTime: number;           // 开始时间
}

/**
 * 食材加工配置项
 */
export interface ProcessingItemConfig {
    ingredientType: IngredientType;       // 食材类型
    processingType: 'chop' | 'steam' | 'mix';  // 加工类型
    processingYield: number;              // 加工产出倍数
    requiredStates?: number;              // 需要的加工状态数（默认4）
}

/**
 * 食材加工配置
 */
export interface ProcessingConfig {
    enabled: boolean;                     // 是否启用加工阶段
    processingItems: ProcessingItemConfig[];  // 需要加工的食材列表
}

/**
 * 关卡数据
 */
export interface LevelData {
    levelId: number;             // 关卡ID
    levelName: string;           // 关卡名称
    description: string;         // 关卡描述
    unlocked: boolean;           // 是否解锁
    recipes: RecipeData[];       // 可制作的菜品
    targetMoney: number;         // 目标金额
    targetCustomers: number;     // 目标客户数
    targetReviewRate?: number;   // 目标好评率（百分比）
    maxNegativeReviews?: number; // 最大差评数
    prepareTime: number;         // 准备时间（秒）
    cookingTime: number;         // 营业时间（秒）
    initialMoney: number;        // 初始金币
    difficulty: number;          // 难度星级（1-6）
    isTutorial?: boolean;        // 是否为教程关卡
    unlockThreshold?: number;    // 解锁所需金额（全局钱包余额）

    // ============ 新增字段：独立场景配置 ============
    sceneName: string;           // 烹饪场景名称（必填）
    shopItems?: any;             // 关卡专属商品标记（可选，优先级高于默认配置）
    processingConfig?: ProcessingConfig;  // 食材加工配置（可选）
    controllerName?: string;     // 烹饪控制器类名（默认'CookingController'）
    requiresProcessing?: boolean; // 是否需要加工阶段（默认false）
}

/**
 * 游戏配置
 */
export class GameConfig {
    // ==================== Demo 配置 ====================
    static DEMO_ONLY_LEVEL1: boolean = true;   // Demo 仅开放第一关
    static DEMO_LEVEL_CAP: number = 1;         // Demo 允许的最高关卡
    static DEMO_TARGET_HINT: string = '🎉 达成今日目标！Demo仅开放第一关，正式版将解锁第2关。';

    // ==================== 菜谱配置 ====================
    
    // 关卡0：教程关卡 - 简易烤冷面（3步骤）
    static RECIPE_TUTORIAL: RecipeData = {
        id: 'tutorial_noodle',
        name: '简易烤冷面',
        emoji: '🥞',
        ingredients: [
            { type: IngredientType.NOODLE, count: 1 },
            { type: IngredientType.EGG, count: 1 },
            { type: IngredientType.SAUCE, count: 1 },
        ],
        cookTime: 15,
        price: 10,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '放置面饼',
                type: StepType.CLICK,
                instruction: '点击工作台放置面饼'
            },
            {
                stepId: 2,
                name: '打鸡蛋',
                type: StepType.CLICK,
                instruction: '点击鸡蛋打入面饼上'
            },
            {
                stepId: 3,
                name: '刷酱完成',
                type: StepType.HOLD,
                duration: 2,
                instruction: '长按刷酱，等待进度条完成'
            }
        ]
    };
    
    // 关卡1：烤冷面（5步骤）
    static RECIPE_GRILLED_COLD_NOODLE: RecipeData = {
        id: 'grilled_cold_noodle',
        name: '烤冷面',
        emoji: '🍜',
        ingredients: [
            { type: IngredientType.NOODLE, count: 1 },
            { type: IngredientType.EGG, count: 1 },
            { type: IngredientType.SAUSAGE, count: 1 },
            { type: IngredientType.CORIANDER, count: 1 },
            { type: IngredientType.SAUCE, count: 1 },
        ],
        cookTime: 25,
        price: 15,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '放置面饼',
                type: StepType.CLICK,
                instruction: '点击工作台放置面饼'
            },
            {
                stepId: 2,
                name: '刷酱料',
                type: StepType.HOLD,
                duration: 2,
                instruction: '长按刷酱，等待进度条完成'
            },
            {
                stepId: 3,
                name: '打鸡蛋',
                type: StepType.CLICK,
                instruction: '点击鸡蛋打入'
            },
            {
                stepId: 4,
                name: '翻面',
                type: StepType.TIMING,
                perfectWindow: { start: 0.45, end: 0.55 },
                instruction: '观察面饼颜色，金黄时点击翻面'
            },
            {
                stepId: 5,
                name: '切块装盘',
                type: StepType.SWIPE,
                direction: 'horizontal',
                instruction: '横向滑动切成3块'
            }
        ]
    };
    
    // 关卡2：东北饭包（6步骤）
    static RECIPE_DONGBEI_RICE_BUNDLE: RecipeData = {
        id: 'dongbei_rice_bundle',
        name: '东北饭包',
        emoji: '🥬',
        ingredients: [
            { type: IngredientType.RICE, count: 1 },
            { type: IngredientType.EGG, count: 1 },
            { type: IngredientType.GREEN_ONION, count: 1 },
            { type: IngredientType.POTATO, count: 1 },
            { type: IngredientType.LETTUCE, count: 1 },
            { type: IngredientType.CILANTRO, count: 1 },
        ],
        cookTime: 35,
        price: 18,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '蒸土豆',
                type: StepType.TIMING,
                perfectWindow: { start: 0.45, end: 0.55 },
                instruction: '观察土豆状态，熟透时点击完成'
            },
            {
                stepId: 2,
                name: '蒸大米',
                type: StepType.TIMING,
                perfectWindow: { start: 0.50, end: 0.60 },
                instruction: '观察米饭状态，颗粒饱满时点击完成'
            },
            {
                stepId: 3,
                name: '加料搅拌',
                type: StepType.DRAG,
                instruction: '拖拽所有食材到搅拌盆中'
            },
            {
                stepId: 4,
                name: '铺到菜叶上',
                type: StepType.CLICK,
                instruction: '点击将拌好的馅料铺在白菜叶上'
            },
            {
                stepId: 5,
                name: '卷起来打包',
                type: StepType.SEQUENCE,
                targetValue: 5,
                instruction: '连续点击5次完成包裹'
            },
            {
                stepId: 6,
                name: '出售给客户',
                type: StepType.CLICK,
                instruction: '点击完成订单，出售给客户'
            }
        ]
    };

    // 关卡3：锅包肉（7步骤）
    static RECIPE_GUO_BAO_ROU: RecipeData = {
        id: 'guo_bao_rou',
        name: '锅包肉·糖醋',
        emoji: '??',
        ingredients: [
            { type: IngredientType.PORK, count: 1 },
            { type: IngredientType.RADISH, count: 1 },
            { type: IngredientType.GINGER, count: 1 },
            { type: IngredientType.GREEN_ONION, count: 1 },
            { type: IngredientType.POTATO_STARCH, count: 1 },
        ],
        cookTime: 40,
        price: 18,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '腌制上浆',
                type: StepType.TIMING,
                perfectWindow: { start: 0.5, end: 0.7 },
                instruction: '加入盐、酱油、花椒面、水和淀粉搅拌'
            },
            {
                stepId: 2,
                name: '下锅油炸',
                type: StepType.SEQUENCE,
                targetValue: 30,
                instruction: '用筷子逐片下锅（最多30片）'
            },
            {
                stepId: 3,
                name: '调汁',
                type: StepType.CLICK,
                instruction: '点击糖/醋/水放入糖醋小碗'
            },
            {
                stepId: 4,
                name: '捞出入锅',
                type: StepType.DRAG,
                instruction: '用漏网捞出炸好的肉片'
            },
            {
                stepId: 5,
                name: '翻炒',
                type: StepType.SEQUENCE,
                targetValue: 6,
                instruction: '连续点击翻炒至入味'
            },
            {
                stepId: 6,
                name: '加入配料',
                type: StepType.CLICK,
                instruction: '加入葱丝、姜丝、萝卜丝'
            },
            {
                stepId: 7,
                name: '夹入打包盒',
                type: StepType.SEQUENCE,
                targetValue: 8,
                instruction: '用筷子夹入打包盒完成订单'
            }
        ]
    };

    // 关卡3：锅包肉（番茄口味）
    static RECIPE_GUO_BAO_ROU_KETCHUP: RecipeData = {
        id: 'guo_bao_rou_ketchup',
        name: '锅包肉·番茄',
        emoji: '??',
        ingredients: [
            { type: IngredientType.PORK, count: 1 },
            { type: IngredientType.RADISH, count: 1 },
            { type: IngredientType.GINGER, count: 1 },
            { type: IngredientType.GREEN_ONION, count: 1 },
            { type: IngredientType.POTATO_STARCH, count: 1 },
            { type: IngredientType.KETCHUP, count: 1 },
        ],
        cookTime: 40,
        price: 18,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '腌制上浆',
                type: StepType.TIMING,
                perfectWindow: { start: 0.5, end: 0.7 },
                instruction: '加入盐、酱油、花椒面、水和淀粉搅拌'
            },
            {
                stepId: 2,
                name: '下锅油炸',
                type: StepType.SEQUENCE,
                targetValue: 30,
                instruction: '用筷子逐片下锅（最多30片）'
            },
            {
                stepId: 3,
                name: '调汁',
                type: StepType.CLICK,
                instruction: '点击番茄酱/糖/醋/水放入番茄小碗'
            },
            {
                stepId: 4,
                name: '捞出入锅',
                type: StepType.DRAG,
                instruction: '用漏网捞出炸好的肉片'
            },
            {
                stepId: 5,
                name: '翻炒',
                type: StepType.SEQUENCE,
                targetValue: 6,
                instruction: '连续点击翻炒至入味'
            },
            {
                stepId: 6,
                name: '加入配料',
                type: StepType.CLICK,
                instruction: '加入葱丝、姜丝、萝卜丝'
            },
            {
                stepId: 7,
                name: '夹入打包盒',
                type: StepType.SEQUENCE,
                targetValue: 8,
                instruction: '用筷子夹入打包盒完成订单'
            }
        ]
    };

    // 关卡3：煎饼果子（6步骤）
    static RECIPE_JIANBING: RecipeData = {
        id: 'jianbing',
        name: '煎饼果子',
        emoji: '🥙',
        ingredients: [
            { type: IngredientType.BATTER, count: 1 },
            { type: IngredientType.EGG, count: 1 },
            { type: IngredientType.CRISPY, count: 1 },
            { type: IngredientType.LETTUCE, count: 1 },
            { type: IngredientType.SWEET_SAUCE, count: 1 },
            { type: IngredientType.SCALLION, count: 1 },
        ],
        cookTime: 30,
        price: 18,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '倒面糊',
                type: StepType.SWIPE,
                direction: 'circle',
                instruction: '画圈摊开面糊'
            },
            {
                stepId: 2,
                name: '打鸡蛋',
                type: StepType.CLICK,
                instruction: '点击鸡蛋打在面饼上'
            },
            {
                stepId: 3,
                name: '撒香葱',
                type: StepType.CLICK,
                instruction: '点击撒上香葱'
            },
            {
                stepId: 4,
                name: '翻面',
                type: StepType.TIMING,
                perfectWindow: { start: 0.4, end: 0.6 },
                instruction: '时机合适时点击翻面'
            },
            {
                stepId: 5,
                name: '刷酱加料',
                type: StepType.SEQUENCE,
                targetValue: 4,
                instruction: '依次点击：刷酱、生菜、薄脆'
            },
            {
                stepId: 6,
                name: '卷起装盘',
                type: StepType.HOLD,
                duration: 2,
                instruction: '长按折叠煎饼'
            }
        ]
    };
    
    // 关卡3：麻辣烫（5步骤）
    static RECIPE_MALATANG: RecipeData = {
        id: 'malatang',
        name: '麻辣烫',
        emoji: '🍲',
        ingredients: [
            { type: IngredientType.MEATBALL, count: 1 },
            { type: IngredientType.VEGETABLE_MIX, count: 1 },
            { type: IngredientType.TOFU, count: 1 },
            { type: IngredientType.NOODLES, count: 1 },
            { type: IngredientType.SPICY_SOUP, count: 1 },
        ],
        cookTime: 28,
        price: 20,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '选择食材',
                type: StepType.CLICK,
                instruction: '点击选择客户要的食材（3-5样）'
            },
            {
                stepId: 2,
                name: '放入锅中',
                type: StepType.DRAG,
                instruction: '拖拽食材到锅中'
            },
            {
                stepId: 3,
                name: '煮制',
                type: StepType.TIMING,
                perfectWindow: { start: 0.5, end: 0.7 },
                instruction: '等待煮熟，注意不要煮过头'
            },
            {
                stepId: 4,
                name: '捞起沥水',
                type: StepType.SWIPE,
                direction: 'up',
                instruction: '向上滑动捞起食材'
            },
            {
                stepId: 5,
                name: '浇汤装碗',
                type: StepType.CLICK,
                instruction: '点击浇上麻辣汤底'
            }
        ]
    };

    // 关卡4：麻辣烫（自选称重）
    static RECIPE_MALATANG: RecipeData = {
        id: 'malatang',
        name: '麻辣烫',
        emoji: '??',
        ingredients: [
            { type: IngredientType.MEATBALL, count: 1 },
            { type: IngredientType.VEGETABLE_MIX, count: 1 },
            { type: IngredientType.TOFU, count: 1 },
            { type: IngredientType.NOODLES, count: 1 },
        ],
        cookTime: 30,
        price: 18,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '自选称重',
                type: StepType.CLICK,
                instruction: '顾客自选菜品并称重计价'
            },
            {
                stepId: 2,
                name: '下锅煮制',
                type: StepType.TIMING,
                perfectWindow: { start: 0.45, end: 0.65 },
                instruction: '控制火候，避免欠熟或过火'
            },
            {
                stepId: 3,
                name: '出锅叫号',
                type: StepType.CLICK,
                instruction: '出锅后叫号交付'
            }
        ]
    };
    
    // 关卡4：铁板烧（7步骤）
    static RECIPE_TEPPANYAKI: RecipeData = {
        id: 'teppanyaki',
        name: '铁板鱿鱼',
        emoji: '🦑',
        ingredients: [
            { type: IngredientType.SQUID, count: 1 },
            { type: IngredientType.ONION, count: 1 },
            { type: IngredientType.CHILI_POWDER, count: 1 },
            { type: IngredientType.CUMIN, count: 1 },
            { type: IngredientType.BBQ_SAUCE, count: 1 },
        ],
        cookTime: 35,
        price: 22,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '放铁板加热',
                type: StepType.CLICK,
                instruction: '点击开始加热铁板'
            },
            {
                stepId: 2,
                name: '放食材',
                type: StepType.DRAG,
                instruction: '拖拽鱿鱼和洋葱到铁板'
            },
            {
                stepId: 3,
                name: '翻炒',
                type: StepType.SEQUENCE,
                targetValue: 5,
                instruction: '连续点击5次翻炒（配合节奏）'
            },
            {
                stepId: 4,
                name: '撒孜然',
                type: StepType.CLICK,
                instruction: '点击撒孜然粉'
            },
            {
                stepId: 5,
                name: '撒辣椒',
                type: StepType.CLICK,
                instruction: '点击撒辣椒粉'
            },
            {
                stepId: 6,
                name: '铲断切块',
                type: StepType.SWIPE,
                direction: 'vertical',
                instruction: '竖向滑动切割'
            },
            {
                stepId: 7,
                name: '装盘',
                type: StepType.DRAG,
                instruction: '拖拽到盘子完成'
            }
        ]
    };
    
    // 关卡5：炸串（6步骤）
    static RECIPE_FRIED_SKEWER: RecipeData = {
        id: 'fried_skewer',
        name: '东北炸串',
        emoji: '🍢',
        ingredients: [
            { type: IngredientType.MEAT_SKEWER, count: 2 },
            { type: IngredientType.VEG_SKEWER, count: 2 },
            { type: IngredientType.CHICKEN, count: 1 },
            { type: IngredientType.BREADCRUMB, count: 1 },
            { type: IngredientType.CHILI_POWDER, count: 1 },
        ],
        cookTime: 32,
        price: 25,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '选择串类',
                type: StepType.CLICK,
                instruction: '点击选择客户要的串（3-6串）'
            },
            {
                stepId: 2,
                name: '裹面包糠',
                type: StepType.SEQUENCE,
                targetValue: 3,
                instruction: '点击每串裹上面包糠'
            },
            {
                stepId: 3,
                name: '放入油锅',
                type: StepType.DRAG,
                instruction: '拖拽串到油锅中'
            },
            {
                stepId: 4,
                name: '炸制',
                type: StepType.TIMING,
                perfectWindow: { start: 0.55, end: 0.75 },
                instruction: '观察颜色，金黄时捞出'
            },
            {
                stepId: 5,
                name: '控油',
                type: StepType.SEQUENCE,
                targetValue: 3,
                instruction: '快速点击3次抖掉油'
            },
            {
                stepId: 6,
                name: '撒调料',
                type: StepType.CLICK,
                instruction: '点击撒辣椒面'
            }
        ]
    };

    // 关卡5：烧烤（最小可跑通版本）
    static RECIPE_BBQ_SKEWER: RecipeData = {
        id: 'bbq_skewer',
        name: '烧烤串',
        emoji: '??',
        ingredients: [
            { type: IngredientType.MEAT_SKEWER, count: 2 },
            { type: IngredientType.VEG_SKEWER, count: 2 },
            { type: IngredientType.BBQ_SAUCE, count: 1 },
            { type: IngredientType.CUMIN, count: 1 },
            { type: IngredientType.CHILI_POWDER, count: 1 },
        ],
        cookTime: 30,
        price: 22,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '摆串',
                type: StepType.DRAG,
                instruction: '拖拽串放上烤架'
            },
            {
                stepId: 2,
                name: '烤制',
                type: StepType.TIMING,
                perfectWindow: { start: 0.45, end: 0.75 },
                instruction: '观察颜色，金黄取下'
            },
            {
                stepId: 3,
                name: '刷酱',
                type: StepType.CLICK,
                instruction: '点击刷上烧烤酱'
            },
            {
                stepId: 4,
                name: '撒料',
                type: StepType.CLICK,
                instruction: '点击撒孜然和辣椒粉'
            },
            {
                stepId: 5,
                name: '装盘',
                type: StepType.DRAG,
                instruction: '拖拽到盘子完成'
            }
        ]
    };
    
    // 关卡6：烤肉拌饭（8步骤）
    static RECIPE_BIBIMBAP: RecipeData = {
        id: 'bibimbap',
        name: '烤肉拌饭',
        emoji: '🍱',
        ingredients: [
            { type: IngredientType.PORK_BELLY, count: 1 },
            { type: IngredientType.RICE, count: 1 },
            { type: IngredientType.KIMCHI, count: 1 },
            { type: IngredientType.LETTUCE, count: 1 },
            { type: IngredientType.BEAN_SPROUT, count: 1 },
            { type: IngredientType.EGG, count: 1 },
        ],
        cookTime: 40,
        price: 30,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '腌制肉片',
                type: StepType.HOLD,
                duration: 3,
                instruction: '长按腌制肉片'
            },
            {
                stepId: 2,
                name: '烤肉',
                type: StepType.TIMING,
                perfectWindow: { start: 0.45, end: 0.55 },
                instruction: '第一面烤至金黄'
            },
            {
                stepId: 3,
                name: '翻面继续烤',
                type: StepType.TIMING,
                perfectWindow: { start: 0.45, end: 0.55 },
                instruction: '翻面烤另一面'
            },
            {
                stepId: 4,
                name: '装饭入石锅',
                type: StepType.CLICK,
                instruction: '点击装入米饭'
            },
            {
                stepId: 5,
                name: '摆放烤肉',
                type: StepType.DRAG,
                instruction: '拖拽烤肉整齐排列'
            },
            {
                stepId: 6,
                name: '加配菜',
                type: StepType.SEQUENCE,
                targetValue: 3,
                instruction: '依次添加：泡菜、生菜、豆芽'
            },
            {
                stepId: 7,
                name: '煎鸡蛋',
                type: StepType.TIMING,
                perfectWindow: { start: 0.5, end: 0.6 },
                instruction: '煎一个溏心蛋'
            },
            {
                stepId: 8,
                name: '浇酱汁',
                type: StepType.SWIPE,
                direction: 'circle',
                instruction: '画圈浇上酱汁'
            }
        ]
    };
    
    // 关卡7：东北乱炖（10步骤）
    static RECIPE_DONGBEI_STEW: RecipeData = {
        id: 'dongbei_stew',
        name: '东北乱炖',
        emoji: '🍲',
        ingredients: [
            { type: IngredientType.PORK, count: 1 },
            { type: IngredientType.POTATO, count: 1 },
            { type: IngredientType.EGGPLANT, count: 1 },
            { type: IngredientType.GREEN_BEAN, count: 1 },
            { type: IngredientType.CORN, count: 1 },
            { type: IngredientType.VERMICELLI, count: 1 },
            { type: IngredientType.BROTH, count: 1 },
            { type: IngredientType.SPICE_MIX, count: 1 },
        ],
        cookTime: 50,
        price: 35,
        score: 100,
        steps: [
            {
                stepId: 1,
                name: '切肉块',
                type: StepType.SEQUENCE,
                targetValue: 5,
                instruction: '连续点击5次切肉'
            },
            {
                stepId: 2,
                name: '切蔬菜',
                type: StepType.SEQUENCE,
                targetValue: 4,
                instruction: '依次切：土豆、茄子、豆角'
            },
            {
                stepId: 3,
                name: '爆香肉块',
                type: StepType.SEQUENCE,
                targetValue: 3,
                instruction: '快速翻炒3次'
            },
            {
                stepId: 4,
                name: '下土豆',
                type: StepType.DRAG,
                instruction: '拖拽土豆到锅中'
            },
            {
                stepId: 5,
                name: '下其他蔬菜',
                type: StepType.DRAG,
                instruction: '拖拽茄子和豆角'
            },
            {
                stepId: 6,
                name: '加高汤',
                type: StepType.HOLD,
                duration: 2,
                instruction: '长按倒入高汤'
            },
            {
                stepId: 7,
                name: '调味',
                type: StepType.CLICK,
                instruction: '点击加入秘制调料'
            },
            {
                stepId: 8,
                name: '炖煮',
                type: StepType.TIMING,
                perfectWindow: { start: 0.6, end: 0.8 },
                instruction: '等待炖煮（可调火力）'
            },
            {
                stepId: 9,
                name: '加粉条',
                type: StepType.TIMING,
                perfectWindow: { start: 0.7, end: 0.85 },
                instruction: '时机合适时加粉条'
            },
            {
                stepId: 10,
                name: '收汁盛盘',
                type: StepType.SEQUENCE,
                targetValue: 5,
                instruction: '连续点击5次收汁'
            }
        ]
    };

    // ==================== 食材配置 ====================
    static INGREDIENTS_CONFIG: { [key: string]: IngredientData } = {
        // 烤冷面食材
        [IngredientType.NOODLE]: { type: IngredientType.NOODLE, name: '面饼', count: 0, price: 2, icon: '🥞', color: '#F5DEB3' },
        [IngredientType.EGG]: { type: IngredientType.EGG, name: '鸡蛋', count: 0, price: 1, icon: '🥚', color: '#FFD700' },
        [IngredientType.SAUSAGE]: { type: IngredientType.SAUSAGE, name: '香肠', count: 0, price: 3, icon: '🌭', color: '#D2691E' },
        [IngredientType.CORIANDER]: { type: IngredientType.CORIANDER, name: '香菜', count: 0, price: 1, icon: '🌿', color: '#90EE90' },
        [IngredientType.ONION]: { type: IngredientType.ONION, name: '洋葱', count: 0, price: 1, icon: '🧅', color: '#DDA0DD' },
        [IngredientType.SAUCE]: { type: IngredientType.SAUCE, name: '酱料', count: 0, price: 2, icon: '🥫', color: '#8B4513' },
        [IngredientType.VINEGAR]: { type: IngredientType.VINEGAR, name: '醋', count: 0, price: 1, icon: '🧪', color: '#CD853F' },
        [IngredientType.CHILI]: { type: IngredientType.CHILI, name: '辣椒', count: 0, price: 1, icon: '🌶️', color: '#FF4500' },
        
        // 煎饼果子食材
        [IngredientType.BATTER]: { type: IngredientType.BATTER, name: '面糊', count: 0, price: 3, icon: '🥣', color: '#FAF0E6' },
        [IngredientType.CRISPY]: { type: IngredientType.CRISPY, name: '薄脆', count: 0, price: 2, icon: '🍘', color: '#FFE4B5' },
        [IngredientType.LETTUCE]: { type: IngredientType.LETTUCE, name: '生菜', count: 0, price: 1, icon: '🥬', color: '#7FFF00' },
        [IngredientType.SWEET_SAUCE]: { type: IngredientType.SWEET_SAUCE, name: '甜面酱', count: 0, price: 2, icon: '🥫', color: '#A0522D' },
        [IngredientType.SCALLION]: { type: IngredientType.SCALLION, name: '香葱', count: 0, price: 1, icon: '🌱', color: '#00FF00' },
        
        // 麻辣烫食材
        [IngredientType.MEATBALL]: { type: IngredientType.MEATBALL, name: '肉丸', count: 0, price: 4, icon: '🍡', color: '#CD5C5C' },
        [IngredientType.VEGETABLE_MIX]: { type: IngredientType.VEGETABLE_MIX, name: '蔬菜包', count: 0, price: 3, icon: '🥗', color: '#32CD32' },
        [IngredientType.TOFU]: { type: IngredientType.TOFU, name: '豆制品', count: 0, price: 2, icon: '🧈', color: '#FFFACD' },
        [IngredientType.NOODLES]: { type: IngredientType.NOODLES, name: '粉丝', count: 0, price: 2, icon: '🍜', color: '#F5F5DC' },
        [IngredientType.SPICY_SOUP]: { type: IngredientType.SPICY_SOUP, name: '麻辣汤底', count: 0, price: 5, icon: '🍲', color: '#DC143C' },
        
        // 铁板烧食材
        [IngredientType.SQUID]: { type: IngredientType.SQUID, name: '鱿鱼须', count: 0, price: 6, icon: '🦑', color: '#FFB6C1' },
        [IngredientType.PORK]: { type: IngredientType.PORK, name: '里脊肉', count: 0, price: 5, icon: '🥓', color: '#FFA07A' },
        [IngredientType.CUMIN]: { type: IngredientType.CUMIN, name: '孜然粉', count: 0, price: 2, icon: '🧂', color: '#D2691E' },
        [IngredientType.CHILI_POWDER]: { type: IngredientType.CHILI_POWDER, name: '辣椒粉', count: 0, price: 2, icon: '🌶️', color: '#FF0000' },
        [IngredientType.BBQ_SAUCE]: { type: IngredientType.BBQ_SAUCE, name: '烧烤酱', count: 0, price: 3, icon: '🥫', color: '#8B0000' },
        
        // 炸串食材
        [IngredientType.MEAT_SKEWER]: { type: IngredientType.MEAT_SKEWER, name: '肉串', count: 0, price: 4, icon: '🍢', color: '#B22222' },
        [IngredientType.VEG_SKEWER]: { type: IngredientType.VEG_SKEWER, name: '蔬菜串', count: 0, price: 2, icon: '🍢', color: '#228B22' },
        [IngredientType.CHICKEN]: { type: IngredientType.CHICKEN, name: '鸡柳', count: 0, price: 4, icon: '🍗', color: '#FFE4C4' },
        [IngredientType.BREADCRUMB]: { type: IngredientType.BREADCRUMB, name: '面包糠', count: 0, price: 3, icon: '🍞', color: '#DEB887' },
        [IngredientType.KETCHUP]: { type: IngredientType.KETCHUP, name: '番茄酱', count: 0, price: 2, icon: '🍅', color: '#FF6347' },
        
        // 烤肉拌饭食材
        [IngredientType.PORK_BELLY]: { type: IngredientType.PORK_BELLY, name: '五花肉', count: 0, price: 8, icon: '🥩', color: '#FA8072' },
        [IngredientType.BEEF]: { type: IngredientType.BEEF, name: '牛肉片', count: 0, price: 10, icon: '🥩', color: '#8B0000' },
        [IngredientType.RICE]: { type: IngredientType.RICE, name: '米饭', count: 0, price: 2, icon: '🍚', color: '#FFFFFF' },
        [IngredientType.KIMCHI]: { type: IngredientType.KIMCHI, name: '泡菜', count: 0, price: 3, icon: '🥬', color: '#FF4500' },
        [IngredientType.BEAN_SPROUT]: { type: IngredientType.BEAN_SPROUT, name: '豆芽', count: 0, price: 1, icon: '🌱', color: '#F0E68C' },
        [IngredientType.STONE_POT]: { type: IngredientType.STONE_POT, name: '石锅', count: 0, price: 15, icon: '🍲', color: '#696969' },

        // 东北饭包食材
        [IngredientType.GREEN_ONION]: { type: IngredientType.GREEN_ONION, name: '大葱', count: 0, price: 1, icon: '🧅', color: '#90EE90' },
        [IngredientType.CILANTRO]: { type: IngredientType.CILANTRO, name: '香菜', count: 0, price: 1, icon: '🌿', color: '#98FB98' },
        
        // 东北乱炖食材
        [IngredientType.POTATO]: { type: IngredientType.POTATO, name: '土豆', count: 0, price: 2, icon: '🥔', color: '#DEB887' },
        [IngredientType.EGGPLANT]: { type: IngredientType.EGGPLANT, name: '茄子', count: 0, price: 3, icon: '🍆', color: '#9370DB' },
        [IngredientType.GREEN_BEAN]: { type: IngredientType.GREEN_BEAN, name: '豆角', count: 0, price: 2, icon: '🫘', color: '#6B8E23' },
        [IngredientType.CORN]: { type: IngredientType.CORN, name: '玉米', count: 0, price: 2, icon: '🌽', color: '#FFD700' },
        [IngredientType.VERMICELLI]: { type: IngredientType.VERMICELLI, name: '粉条', count: 0, price: 2, icon: '🍜', color: '#F5F5DC' },
        [IngredientType.BROTH]: { type: IngredientType.BROTH, name: '高汤', count: 0, price: 6, icon: '🍲', color: '#F4A460' },
        [IngredientType.SPICE_MIX]: { type: IngredientType.SPICE_MIX, name: '秘制调料包', count: 0, price: 10, icon: '🧂', color: '#CD853F' },
        ...MALATANG_PLACEHOLDER_CONFIG,
    };

    // ==================== 关卡配置 ====================
    static LEVELS: LevelData[] = [
        // 教程关卡
        {
            levelId: 0,
            levelName: '🎓 新手教程',
            description: '学习基础操作，掌握烹饪技巧！',
            unlocked: true,
            recipes: [GameConfig.RECIPE_TUTORIAL],
            targetMoney: 50,
            targetCustomers: 5,
            targetReviewRate: 0,
            maxNegativeReviews: 999,
            prepareTime: 30,
            cookingTime: 90,
            initialMoney: 1000,
            difficulty: 1,
            isTutorial: true,
            unlockThreshold: 0,        // 教程关免费解锁
            sceneName: 'Level1CookingScene'  // 教程关和第一关共用场景
        },
        // 第一关：烤冷面
        {
            levelId: 1,
            levelName: '烤冷面',
            description: '制作经典东北烤冷面，开启你的料理之路！',
            unlocked: true,
            recipes: [GameConfig.RECIPE_GRILLED_COLD_NOODLE],
            targetMoney: 200,
            targetCustomers: 15,
            targetReviewRate: 0,
            maxNegativeReviews: 999,
            prepareTime: 60,
            cookingTime: 180,
            initialMoney: 1000,
            difficulty: 1,
            unlockThreshold: 0,        // 第一关免费解锁

            // ============ 新增配置 ============
            sceneName: 'Level1CookingScene',
            // 使用默认 SHOP_ITEMS（shopItems 未定义时使用默认值）
            processingConfig: {
                enabled: true,
                processingItems: [
                    {
                        ingredientType: IngredientType.ONION,
                        processingType: 'chop',
                        processingYield: 12,
                        requiredStates: 4
                    },
                    {
                        ingredientType: IngredientType.CILANTRO,
                        processingType: 'chop',
                        processingYield: 12,
                        requiredStates: 4
                    }
                ]
            },
            controllerName: 'CookingController',
            requiresProcessing: true
        },
        // 第二关：东北饭包
        {
            levelId: 2,
            levelName: '东北饭包',
            description: '制作传统东北饭包，体验东北美食文化！',
            unlocked: false,
            recipes: [GameConfig.RECIPE_DONGBEI_RICE_BUNDLE],
            targetMoney: 360,
            targetCustomers: 20,
            targetReviewRate: 60,
            maxNegativeReviews: 8,
            prepareTime: 90,
            cookingTime: 200,
            initialMoney: 1000,
            difficulty: 2,
            unlockThreshold: 2000,     // 钱包达到2000解锁

            // ============ 新增配置 ============
            sceneName: 'Level2CookingScene',
            shopItems: 'RICE_BUNDLE_SHOP_ITEMS' as any,    // 使用专属商品列表标记
            processingConfig: {
                enabled: true,
                processingItems: [
                    {
                        ingredientType: IngredientType.GREEN_ONION,
                        processingType: 'chop',
                        processingYield: 15,
                        requiredStates: 4
                    },
                    {
                        ingredientType: IngredientType.POTATO,
                        processingType: 'chop',
                        processingYield: 10,
                        requiredStates: 4
                    },
                    {
                        ingredientType: IngredientType.CILANTRO,
                        processingType: 'chop',
                        processingYield: 10,
                        requiredStates: 4
                    }
                ]
            },
            controllerName: 'RiceBundleController',
            requiresProcessing: true
        },
        // 第三关：锅包肉
        {
            levelId: 3,
            levelName: '锅包肉',
            description: '快速完成批量订单，考验并行操作！',
            unlocked: false,
            recipes: [GameConfig.RECIPE_GUO_BAO_ROU, GameConfig.RECIPE_GUO_BAO_ROU_KETCHUP],
            targetMoney: 600,
            targetCustomers: 30,
            targetReviewRate: 65,
            maxNegativeReviews: 5,
            prepareTime: 80,
            cookingTime: 240,
            initialMoney: 1000,
            difficulty: 3,
            unlockThreshold: 4000,     // 钱包达到4000解锁

            // ============ 新增配置 ============
            sceneName: 'Level3CookingScene',
            shopItems: 'GUO_BAO_ROU_SHOP_ITEMS' as any,
            processingConfig: {
                enabled: true,
                processingItems: [
                    {
                        ingredientType: IngredientType.PORK,
                        processingType: 'chop',
                        processingYield: 8,
                        requiredStates: 4
                    },
                    {
                        ingredientType: IngredientType.RADISH,
                        processingType: 'chop',
                        processingYield: 12,
                        requiredStates: 4
                    },
                    {
                        ingredientType: IngredientType.GINGER,
                        processingType: 'chop',
                        processingYield: 12,
                        requiredStates: 4
                    },
                    {
                        ingredientType: IngredientType.GREEN_ONION,
                        processingType: 'chop',
                        processingYield: 12,
                        requiredStates: 4
                    }
                ]
            },
            controllerName: 'GuoBaoRouController',
            requiresProcessing: true
        },
        // 第四关：麻辣烫
        {
            levelId: 4,
            levelName: '麻辣烫',
            description: '自选称重，同锅并发，控品质与节奏！',
            unlocked: false,
            recipes: [GameConfig.RECIPE_MALATANG],
            targetMoney: 800,
            targetCustomers: 35,
            targetReviewRate: 70,
            maxNegativeReviews: 5,
            prepareTime: 90,
            cookingTime: 250,
            initialMoney: 1000,
            difficulty: 4,
            unlockThreshold: 8000,     // 钱包达到8000解锁
            sceneName: 'Level4CookingScene',
            shopItems: 'MALATANG_SHOP_ITEMS' as any,
            controllerName: 'MalaTangController',
            requiresProcessing: false
        },
        // 第五关：烧烤
        {
            levelId: 5,
            levelName: '烧烤',
            description: '格子烤架，温区控火，稳住连击！',
            unlocked: false,
            recipes: [GameConfig.RECIPE_BBQ_SKEWER],
            targetMoney: 1000,
            targetCustomers: 40,
            targetReviewRate: 75,
            maxNegativeReviews: 3,
            prepareTime: 90,
            cookingTime: 270,
            initialMoney: 1000,
            difficulty: 4,
            unlockThreshold: 14000,     // 钱包达到14000解锁
            sceneName: 'Level5CookingScene',
            controllerName: 'BBQController',
            requiresProcessing: false
        },
        // 第六关：烤肉拌饭
        {
            levelId: 6,
            levelName: '料理王比赛',
            description: '复杂流程，完美摆盘，考验极致操作！',
            unlocked: false,
            recipes: [GameConfig.RECIPE_BIBIMBAP],
            targetMoney: 20000,
            targetCustomers: 45,
            targetReviewRate: 80,
            maxNegativeReviews: 3,
            prepareTime: 100,
            cookingTime: 300,
            initialMoney: 1000,
            difficulty: 5,
            unlockThreshold: 20000,     // 钱包达到20000解锁
            sceneName: 'Level6CookingScene'
        },
    ];

    // 客户类型配置
    static CUSTOMER_TYPES = {
        [CustomerType.NORMAL]: {
            patience: 30,
            tipRate: 1.0,
            color: '#87CEEB'  // 天蓝色
        },
        [CustomerType.VIP]: {
            patience: 45,
            tipRate: 2.0,
            color: '#FFD700'  // 金色
        },
        [CustomerType.URGENT]: {
            patience: 15,
            tipRate: 1.5,
            color: '#FF6347'  // 番茄红
        }
    };

    // 客户名字库
    static CUSTOMER_NAMES = [
        '张大爷', '李阿姨', '王师傅', '赵小姐', '刘先生',
        '陈大哥', '孙妹妹', '周老板', '吴大娘', '郑小伙',
        '冯姐', '褚叔', '卫哥', '蒋姨', '沈妹'
    ];
    
    // ==================== 道具配置 ====================
    static ITEMS: ItemData[] = [
        {
            itemId: 'shopping_cart',
            name: '🛒 购物车',
            description: '准备阶段可以多次购买食材',
            price: 20,
            type: ItemType.SHOPPING_CART,
            effect: { type: 'multi_buy', value: true },
            unlockLevel: 1,
            color: '#4169E1'
        },
        {
            itemId: 'speed_gloves',
            name: '⚡ 加速手套',
            description: '制作速度提升20%',
            price: 40,
            type: ItemType.SPEED_GLOVES,
            effect: { type: 'speed_boost', value: 1.2 },
            unlockLevel: 1,
            color: '#FFD700'
        },
        {
            itemId: 'quality_boost',
            name: '🎯 品质保障',
            description: '所有操作品质+10%',
            price: 50,
            type: ItemType.QUALITY_BOOST,
            effect: { type: 'quality_bonus', value: 10 },
            unlockLevel: 2,
            color: '#32CD32'
        },
        {
            itemId: 'extra_slot',
            name: '🔥 高级灶具',
            description: '同时制作数量+1',
            price: 60,
            type: ItemType.EXTRA_SLOT,
            effect: { type: 'extra_cooking_slot', value: 1 },
            unlockLevel: 3,
            color: '#FF6347'
        },
        {
            itemId: 'review_insurance',
            name: '🛡️ 差评保险',
            description: '自动消除1个差评',
            price: 30,
            type: ItemType.REVIEW_INSURANCE,
            effect: { type: 'remove_negative_review', value: 1 },
            unlockLevel: 2,
            color: '#9370DB'
        },
        {
            itemId: 'vip_card',
            name: '💎 VIP会员卡',
            description: 'VIP客户概率+20%',
            price: 50,
            type: ItemType.VIP_CARD,
            effect: { type: 'vip_rate_boost', value: 0.2 },
            unlockLevel: 3,
            color: '#FFD700'
        },
        {
            itemId: 'auto_timer',
            name: '🤖 自动计时器',
            description: '显示最佳操作时机',
            price: 40,
            type: ItemType.AUTO_TIMER,
            effect: { type: 'show_perfect_timing', value: true },
            unlockLevel: 3,
            color: '#00CED1'
        }
    ];
    
    // ==================== 差评模板 ====================
    static NEGATIVE_REVIEW_TEMPLATES = {
        [ReviewCause.TIMEOUT]: [
            "等了半天都没吃上！⭐",
            "服务太慢了，差评！⭐",
            "我的时间很宝贵，别浪费 ⭐",
            "排队等了一个小时，还没做好 ⭐",
            "这效率太低了吧 ⭐"
        ],
        [ReviewCause.LOW_QUALITY]: [
            "味道一般般，不推荐 ⭐⭐",
            "这做的什么玩意儿 ⭐",
            "性价比太低了 ⭐⭐",
            "还不如我自己在家做 ⭐",
            "真的很失望 ⭐⭐"
        ],
        [ReviewCause.BURNT]: [
            "烤糊了，满嘴焦味 ⭐",
            "都黑了还给我吃？⭐",
            "老板不会做菜吗 ⭐",
            "糊成这样还好意思端上来 ⭐",
            "全是焦味，没法吃 ⭐"
        ],
        [ReviewCause.UNDERCOOKED]: [
            "没熟啊，生的！⭐",
            "有血丝，不卫生 ⭐",
            "这能吃吗？⭐",
            "里面还是生的 ⭐",
            "太不专业了 ⭐"
        ],
        [ReviewCause.WRONG_ORDER]: [
            "这不是我点的！⭐",
            "搞错订单了 ⭐",
            "能不能认真点 ⭐⭐",
            "我点的不是这个 ⭐"
        ],
        [ReviewCause.SLOW_SERVICE]: [
            "上菜太慢了 ⭐⭐",
            "等太久了 ⭐",
            "这速度不行啊 ⭐⭐"
        ]
    };
    
    // ==================== 好评模板 ====================
    static POSITIVE_REVIEW_TEMPLATES = {
        perfect: [
            "太完美了！这是我吃过最好吃的！⭐⭐⭐⭐⭐",
            "绝了！老板手艺太棒了！⭐⭐⭐⭐⭐",
            "完美！一点毛病都没有！⭐⭐⭐⭐⭐",
            "这才是正宗的味道！⭐⭐⭐⭐⭐",
            "强烈推荐给所有人！⭐⭐⭐⭐⭐"
        ],
        good: [
            "很好吃，老板手艺不错！⭐⭐⭐⭐",
            "味道很正，下次还来！⭐⭐⭐⭐",
            "好吃，性价比高！⭐⭐⭐⭐",
            "满意，值得推荐！⭐⭐⭐⭐"
        ],
        fast: [
            "上菜快，味道好，五星好评！⭐⭐⭐⭐⭐",
            "效率高，味道正！⭐⭐⭐⭐",
            "服务速度很快！⭐⭐⭐⭐⭐"
        ],
        vip: [
            "不愧是名店，值得推荐！⭐⭐⭐⭐⭐",
            "专业！下次带朋友来！⭐⭐⭐⭐⭐",
            "物有所值，很满意！⭐⭐⭐⭐⭐"
        ]
    };
}






