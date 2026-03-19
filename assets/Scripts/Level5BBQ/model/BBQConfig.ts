import { IngredientType, GameConfig } from '../../Data/GameConfig';
import { IngredientConfig } from '../../Config/IngredientConfig';
import { BBQHeatLevel, BBQOrderTemplate } from './BBQTypes';

export interface BBQIngredientConfig {
    type: IngredientType;
    name: string;
    icon: string;
}

export const BBQ_INGREDIENTS: BBQIngredientConfig[] = [
    {
        type: IngredientType.MEAT_SKEWER,
        name: '肉串',
        icon: IngredientConfig.getDisplayContent(IngredientType.MEAT_SKEWER)
    },
    {
        type: IngredientType.VEG_SKEWER,
        name: '蔬菜串',
        icon: IngredientConfig.getDisplayContent(IngredientType.VEG_SKEWER)
    },
    {
        type: IngredientType.SAUSAGE,
        name: '香肠',
        icon: IngredientConfig.getDisplayContent(IngredientType.SAUSAGE)
    }
];

export const BBQ_ORDER_TEMPLATES: BBQOrderTemplate[] = [
    {
        id: 'bbq_basic',
        name: '经典烧烤串',
        requirements: [
            { ingredient: IngredientType.MEAT_SKEWER, count: 2 },
            { ingredient: IngredientType.VEG_SKEWER, count: 2 },
            { ingredient: IngredientType.BBQ_SAUCE, count: 1 },
            { ingredient: IngredientType.CUMIN, count: 1 },
            { ingredient: IngredientType.CHILI_POWDER, count: 1 }
        ],
        price: 22,
        timeLimit: 50
    },
    {
        id: 'bbq_hot_meat',
        name: '高温肉串',
        requirements: [
            { ingredient: IngredientType.MEAT_SKEWER, count: 3 },
            { ingredient: IngredientType.BBQ_SAUCE, count: 1 }
        ],
        price: 24,
        timeLimit: 45,
        requiredHeat: 'hot' as BBQHeatLevel
    },
    {
        id: 'bbq_warm_veg',
        name: '保温蔬串',
        requirements: [
            { ingredient: IngredientType.VEG_SKEWER, count: 3 },
            { ingredient: IngredientType.CUMIN, count: 1 }
        ],
        price: 20,
        timeLimit: 55,
        requiredHeat: 'warm' as BBQHeatLevel
    }
];

export const BBQ_CONFIG = {
    slotCount: 20,
    plateCapacity: 60,
    maxActiveOrders: 12,
    customerCountRange: { min: 2, max: 4 },
    orderInterval: 2,
    levelDuration: 120,
    cookDuration: 20,
    burnDuration: 36,
    perfectRange: { start: 0.45, end: 0.75 },
    orderHeatDecay: 0.12,
    heatSpeed: {
        hot: 1.25,
        mid: 1.0,
        warm: 0.8
    } as Record<BBQHeatLevel, number>
};

export function getLevelTargetMoney(): number {
    const level = GameConfig.LEVELS.find((item) => item.levelId === 5);
    return level?.targetMoney ?? 120;
}

export function getLevelInitialMoney(): number {
    const level = GameConfig.LEVELS.find((item) => item.levelId === 5);
    return level?.initialMoney ?? 0;
}
