import { IngredientType, RecipeData, StepType, RecipeStep } from './GameConfig';

/**
 * 东北饭包专用配置
 * 独立配置文件，不影响现有系统
 */
export class RiceBundleConfig {
    /**
     * 东北饭包菜谱
     */
    static readonly RECIPE_DONGBEI_RICE_BUNDLE: RecipeData = {
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

    /**
     * 东北饭包食材配置
     */
    static readonly INGREDIENTS_CONFIG = {
        [IngredientType.GREEN_ONION]: { 
            type: IngredientType.GREEN_ONION, 
            name: '大葱', 
            count: 0, 
            price: 1, 
            icon: '🧅', 
            color: '#90EE90' 
        },
        [IngredientType.POTATO_MASH]: { 
            type: IngredientType.POTATO_MASH, 
            name: '土豆泥', 
            count: 0, 
            price: 3, 
            icon: '🥔', 
            color: '#DEB887' 
        },
        [IngredientType.CABBAGE_LEAF]: { 
            type: IngredientType.CABBAGE_LEAF, 
            name: '白菜叶', 
            count: 0, 
            price: 2, 
            icon: '🥬', 
            color: '#98FB98' 
        },
        [IngredientType.PEANUT_SAUCE]: { 
            type: IngredientType.PEANUT_SAUCE, 
            name: '花生酱', 
            count: 0, 
            price: 4, 
            icon: '🥜', 
            color: '#D2691E' 
        },
        [IngredientType.SESAME_SAUCE]: { 
            type: IngredientType.SESAME_SAUCE, 
            name: '芝麻酱', 
            count: 0, 
            price: 3, 
            icon: '🧂', 
            color: '#F4A460' 
        },
        [IngredientType.COOKED_RICE]: { 
            type: IngredientType.COOKED_RICE, 
            name: '熟米饭', 
            count: 0, 
            price: 2, 
            icon: '🍚', 
            color: '#FFFFFF' 
        },
        [IngredientType.EGG_SAUCE]: { 
            type: IngredientType.EGG_SAUCE, 
            name: '鸡蛋酱', 
            count: 0, 
            price: 3, 
            icon: '🥚', 
            color: '#FFD700' 
        }
    };

    /**
     * 准备阶段任务配置
     */
    static readonly PREPARE_TASKS = [
        {
            taskId: 'cut_potato',
            name: '切土豆',
            type: StepType.SEQUENCE,
            targetValue: 5,
            instruction: '连续点击5次切土豆块',
            duration: 3,
            icon: '🥔',
            color: '#DEB887'
        },
        {
            taskId: 'cut_green_onion',
            name: '切大葱',
            type: StepType.SEQUENCE,
            targetValue: 3,
            instruction: '连续点击3次切葱花',
            duration: 2,
            icon: '🧅',
            color: '#90EE90'
        },
        {
            taskId: 'cook_egg_sauce',
            name: '炒鸡蛋酱',
            type: StepType.HOLD,
            duration: 2,
            instruction: '长按2秒炒制鸡蛋酱',
            icon: '🥚',
            color: '#FFD700'
        }
    ];

    /**
     * 关卡配置
     */
    static readonly LEVEL_CONFIG = {
        levelId: 2,
        levelName: '东北饭包',
        description: '制作传统东北饭包，体验东北美食文化！',
        recipes: [RiceBundleConfig.RECIPE_DONGBEI_RICE_BUNDLE],
        targetMoney: 360,
        targetCustomers: 20,
        targetReviewRate: 60,
        maxNegativeReviews: 8,
        prepareTime: 90,
        cookingTime: 200,
        initialMoney: 1000,
        difficulty: 2,
        unlockThreshold: 2000
    };
}
