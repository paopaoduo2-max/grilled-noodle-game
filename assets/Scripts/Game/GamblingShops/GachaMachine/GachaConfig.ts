import { Color } from 'cc';

export enum GachaRarity {
    N = 'N',      // Common: 60%
    R = 'R',      // Rare: 25%
    SR = 'SR',    // Super Rare: 10%
    SSR = 'SSR',  // Ultra Rare: 4%
    UR = 'UR'     // Ultimate: 1%
}

export interface GachaMachineTier {
    id: string;
    name: string;
    price: number;
    rewardMultiplier?: number;
    color: string; // Hex code for UI
    icon: string;
    description: string;
    dropRates: {
        N: number;
        R: number;
        SR: number;
        SSR: number;
        UR: number;
    };
}

export interface GachaResult {
    rarity: GachaRarity;
    rewardAmount: number; // Coins awarded
    itemName?: string;    // Optional item reward
    isPity: boolean;      // Was this a pity pull?
    timestamp: number;
}

export interface CollectionItem {
    id: string;
    name: string;
    rarity: GachaRarity;
    obtained: boolean;
    firstObtainedAt: number;
}

export const GACHA_CONFIG = {
    // Shop Text
    shopName: '幸运扭蛋机',
    shopDescription: '试试手气，收集稀有道具！',

    // Machine Tiers
    machines: {
        normal: {
            id: 'normal',
            name: '普通机',
            price: 20,
            rewardMultiplier: 1.0,
            color: '#00CED1', // Cyan
            icon: '⚪',
            description: '新手推荐，价格实惠',
            dropRates: { N: 62, R: 25, SR: 10, SSR: 2, UR: 1 }
        },
        premium: {
            id: 'premium',
            name: '高级机',
            price: 50,
            rewardMultiplier: 3.0,
            color: '#FF69B4', // Hot Pink
            icon: '🟣',
            description: '更高概率获得稀有物品',
            dropRates: { N: 52, R: 30, SR: 15, SSR: 2, UR: 1 }
        },
        luxury: {
            id: 'luxury',
            name: '豪华机',
            price: 100,
            rewardMultiplier: 5.0,
            color: '#FFD700', // Gold
            icon: '👑',
            description: '豪华大奖等你来拿',
            dropRates: { N: 43, R: 35, SR: 20, SSR: 1, UR: 1 }
        }
    },

    // Pull options
    pullsPerClick: [1],
    batchDiscount: {
        1: 1,
        5: 1,
        10: 0.95   // 10 连 9.5 折
    },
    chaseCostMultiplier: 0.5, // 追击半价
    rewardCap: 500, // 单次奖励上限，防止超出下一关解锁需求

    // Pity System
    pitySystem: {
        hardPity: 10,           // Pulls without SR+ to guarantee SR
        softPityStart: 8,       // Pull count where rates start increasing
        softPityIncrement: 2,   // % increase per pull after soft start
        hardPityWeights: { SR: 70, SSR: 25, UR: 5 }, // 硬保底分布

        // NEW: Unlucky Streak System (inspired by Lottery Station)
        unluckyStreakThreshold: 3,        // Consecutive non-SR+ pulls to trigger guarantee
        unluckyStreakGuaranteedRarity: GachaRarity.SR,  // What rarity is guaranteed

        // NEW: Lucky Streak System (for future rewards/UI)
        luckyStreakThreshold: 3,          // Consecutive SR+ pulls to trigger lucky streak state
        luckyStreakBonusMultiplier: 1.2   // Future: coin bonus on next pull
    },

    // Rewards by Rarity
    rewards: {
        N: { coinsMin: 4, coinsMax: 10 },
        R: { coinsMin: 10, coinsMax: 22 },
        SR: { coinsMin: 24, coinsMax: 48 },
        SSR: { coinsMin: 55, coinsMax: 80 },
        UR: { coinsMin: 90, coinsMax: 100 }
    },

    // Visual Settings (Cel-Shading)
    ui: {
        panelWidth: 860,
        panelHeight: 820,
        colors: {
            background: new Color(24, 36, 44, 255), // Deep teal #18242C
            bgGradientStart: '#1B2B34',
            bgGradientEnd: '#2F3E46',
            panel: new Color(255, 255, 255, 255),
            border: new Color(0, 0, 0, 255),
            innerBorder: '#F9D65C', // Warm gold
            highlight: new Color(255, 255, 255, 96),
            star: '#F9D65C',        // Warm gold

            // Rarity Colors
            rarityN: new Color(200, 200, 200, 255),  // Gray
            rarityR: new Color(65, 105, 225, 255),   // Royal Blue
            raritySR: new Color(138, 43, 226, 255),  // Purple
            raritySSR: new Color(255, 215, 0, 255),  // Gold
            rarityUR: new Color(229, 57, 53, 255)    // Red
        },
        borderWidth: 6,
        cornerRadius: 30,

        // Machine Visuals
        machine: {
            glassAlpha: 40,
            baseWidth: 160,
            baseHeight: 120,
            globeRadius: 100,
            leverLength: 60,
            leverColor: '#C0C0C0',
            leverBallColor: '#FF0000'
        },

        // Animation Timings (Seconds)
        animation: {
            coinFly: 0.6,
            leverPull: 0.4,
            shake: 0.5,
            capsuleDrop: 0.6,
            revealDelay: 0.8
        },

        // Capsule Assets (Emojis/Colors)
        capsule: {
            colors: ['#FF5E5E', '#5E7BFF', '#5EFF5E', '#FFFF5E', '#FF5EFF'],
            emojis: ['(•‿•)', '(o_o)', '(^ω^)', '(>_<)', '(OwO)']
        }
    }
};



