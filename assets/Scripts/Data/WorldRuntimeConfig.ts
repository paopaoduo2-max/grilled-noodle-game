import { IngredientType } from './GameConfig';

export type WorldMapId = 'street' | 'gbd';
export type StoryLineType = 'main' | 'side';

export interface WorldProgress {
    totalMoney: number;
    currentMapId: WorldMapId;
    unlockedMaps: WorldMapId[];
    unlockedDevices: string[];
    unlockedIngredients: string[];
    storyFlags: Record<string, boolean>;
    dayIndex: number;
}

export interface StoryTaskTriggerWindow {
    mapId?: WorldMapId;
    dayFrom?: number;
    dayTo?: number;
}

export interface StoryTaskOrderRequirements {
    orderCount: number;
    requiredIngredients?: string[];
    flavorTags?: string[];
}

export interface StoryTaskRewards {
    money?: number;
    unlockDeviceIds?: string[];
    unlockIngredientIds?: string[];
    setStoryFlags?: string[];
}

export interface StoryTaskConfig {
    taskId: string;
    lineType: StoryLineType;
    triggerWindow: StoryTaskTriggerWindow;
    orderRequirements: StoryTaskOrderRequirements;
    rewards: StoryTaskRewards;
    nextTaskId?: string;
}

export interface DeviceConfig {
    deviceId: string;
    name: string;
    price: number;
    unlockCondition: {
        mapId?: WorldMapId;
        minMoney?: number;
    };
    effects: {
        productionMultiplier?: number;
        speedMultiplier?: number;
        errorToleranceBonus?: number;
    };
}

export interface IngredientFlavorConfig {
    ingredientId: string;
    ingredientType: IngredientType;
    name: string;
    price: number;
    unlockCondition: {
        mapId?: WorldMapId;
        minMoney?: number;
    };
    flavorTags: string[];
    recipeImpact: {
        priceBonus?: number;
        patienceBonus?: number;
    };
}

export interface MapShopEntry {
    shopId: string;
    title: string;
    entryType: 'device' | 'ingredient' | 'minigame';
    enabled: boolean;
}

export interface MapConfig {
    mapId: WorldMapId;
    mapName: string;
    description: string;
    unlockMoney: number;
    revenueMultiplier: number;
    visualProfile: {
        bgTint: { r: number; g: number; b: number };
        title: string;
    };
    specialCustomerPool: string[];
    eventWindowRules: {
        mainlinePerDay: number;
        sidelinePerDay: number;
    };
    shops: MapShopEntry[];
}

export interface MinigameEntryConfig {
    minigameId: string;
    sceneName: string;
    title: string;
    rewardMoney: number;
}

export const WORLD_MAP_CONFIGS: MapConfig[] = [
    {
        mapId: 'street',
        mapName: '起步街区',
        description: '基础客流，适合稳定起步。',
        unlockMoney: 0,
        revenueMultiplier: 1,
        visualProfile: {
            bgTint: { r: 246, g: 200, b: 123 },
            title: '起步街区营业中'
        },
        specialCustomerPool: ['street_uncle', 'street_student'],
        eventWindowRules: {
            mainlinePerDay: 1,
            sidelinePerDay: 1
        },
        shops: [
            { shopId: 'street_device', title: '设备摊位', entryType: 'device', enabled: true },
            { shopId: 'street_flavor', title: '风味摊位', entryType: 'ingredient', enabled: true },
            { shopId: 'street_minigame', title: '小游戏店', entryType: 'minigame', enabled: true }
        ]
    },
    {
        mapId: 'gbd',
        mapName: 'GBD商务区',
        description: '商务客流更多，客单价提升。',
        unlockMoney: 4500,
        revenueMultiplier: 1.2,
        visualProfile: {
            bgTint: { r: 118, g: 184, b: 240 },
            title: 'GBD商务区营业中'
        },
        specialCustomerPool: ['gbd_manager', 'gbd_secretary'],
        eventWindowRules: {
            mainlinePerDay: 1,
            sidelinePerDay: 1
        },
        shops: [
            { shopId: 'gbd_device', title: '设备摊位', entryType: 'device', enabled: true },
            { shopId: 'gbd_flavor', title: '风味摊位', entryType: 'ingredient', enabled: true },
            { shopId: 'gbd_minigame', title: '小游戏店', entryType: 'minigame', enabled: true }
        ]
    }
];

export const WORLD_DEVICE_CONFIGS: DeviceConfig[] = [
    {
        deviceId: 'double_griddle',
        name: '双联烤板',
        price: 1200,
        unlockCondition: { mapId: 'street', minMoney: 1000 },
        effects: { productionMultiplier: 1.2 }
    },
    {
        deviceId: 'auto_brush',
        name: '自动刷酱器',
        price: 1800,
        unlockCondition: { mapId: 'street', minMoney: 1500 },
        effects: { speedMultiplier: 1.12, errorToleranceBonus: 0.08 }
    },
    {
        deviceId: 'insulated_counter',
        name: '保温操作台',
        price: 2600,
        unlockCondition: { mapId: 'gbd', minMoney: 4500 },
        effects: { errorToleranceBonus: 0.15 }
    }
];

export const WORLD_INGREDIENT_CONFIGS: IngredientFlavorConfig[] = [
    {
        ingredientId: 'flavor_sausage',
        ingredientType: IngredientType.SAUSAGE,
        name: '香肠',
        price: 180,
        unlockCondition: { mapId: 'street', minMoney: 500 },
        flavorTags: ['meat'],
        recipeImpact: { priceBonus: 2 }
    },
    {
        ingredientId: 'flavor_onion',
        ingredientType: IngredientType.ONION,
        name: '洋葱',
        price: 140,
        unlockCondition: { mapId: 'street', minMoney: 500 },
        flavorTags: ['fresh'],
        recipeImpact: { priceBonus: 1 }
    },
    {
        ingredientId: 'flavor_cilantro',
        ingredientType: IngredientType.CILANTRO,
        name: '香菜',
        price: 160,
        unlockCondition: { mapId: 'street', minMoney: 800 },
        flavorTags: ['fresh', 'special'],
        recipeImpact: { priceBonus: 2 }
    },
    {
        ingredientId: 'flavor_bacon',
        ingredientType: IngredientType.PORK_BELLY,
        name: '五花肉风味',
        price: 450,
        unlockCondition: { mapId: 'gbd', minMoney: 5200 },
        flavorTags: ['premium', 'meat'],
        recipeImpact: { priceBonus: 4, patienceBonus: 1 }
    }
];

export const WORLD_STORY_TASKS: StoryTaskConfig[] = [
    {
        taskId: 'main_street_001',
        lineType: 'main',
        triggerWindow: { mapId: 'street', dayFrom: 1 },
        orderRequirements: { orderCount: 4, flavorTags: ['fresh'] },
        rewards: { money: 300, setStoryFlags: ['story.main.street.001'] },
        nextTaskId: 'main_street_002'
    },
    {
        taskId: 'main_street_002',
        lineType: 'main',
        triggerWindow: { mapId: 'street', dayFrom: 3 },
        orderRequirements: { orderCount: 5, flavorTags: ['meat'] },
        rewards: {
            money: 500,
            unlockDeviceIds: ['double_griddle'],
            setStoryFlags: ['story.main.street.002']
        },
        nextTaskId: 'main_gbd_001'
    },
    {
        taskId: 'main_gbd_001',
        lineType: 'main',
        triggerWindow: { mapId: 'gbd', dayFrom: 5 },
        orderRequirements: { orderCount: 6, flavorTags: ['premium'] },
        rewards: { money: 900, setStoryFlags: ['story.main.gbd.001'] }
    },
    {
        taskId: 'side_street_001',
        lineType: 'side',
        triggerWindow: { mapId: 'street', dayFrom: 1 },
        orderRequirements: { orderCount: 3 },
        rewards: { money: 220, unlockIngredientIds: ['flavor_onion'] },
        nextTaskId: 'side_street_002'
    },
    {
        taskId: 'side_street_002',
        lineType: 'side',
        triggerWindow: { mapId: 'street', dayFrom: 2 },
        orderRequirements: { orderCount: 4, flavorTags: ['special'] },
        rewards: { money: 260, unlockIngredientIds: ['flavor_cilantro'] }
    },
    {
        taskId: 'side_gbd_001',
        lineType: 'side',
        triggerWindow: { mapId: 'gbd', dayFrom: 5 },
        orderRequirements: { orderCount: 4, flavorTags: ['meat'] },
        rewards: { money: 420, unlockIngredientIds: ['flavor_bacon'] }
    }
];

export const WORLD_MINIGAME_SAMPLE: MinigameEntryConfig = {
    minigameId: 'factory_sample',
    sceneName: 'FactoryScene',
    title: '设备工坊小游戏',
    rewardMoney: 500
};

export function getWorldMapConfig(mapId: string): MapConfig | null {
    return WORLD_MAP_CONFIGS.find((config) => config.mapId === mapId) || null;
}

export function getWorldDeviceConfig(deviceId: string): DeviceConfig | null {
    return WORLD_DEVICE_CONFIGS.find((config) => config.deviceId === deviceId) || null;
}

export function getWorldIngredientConfig(ingredientId: string): IngredientFlavorConfig | null {
    return WORLD_INGREDIENT_CONFIGS.find((config) => config.ingredientId === ingredientId) || null;
}

export function getWorldStoryTask(taskId: string): StoryTaskConfig | null {
    return WORLD_STORY_TASKS.find((config) => config.taskId === taskId) || null;
}
