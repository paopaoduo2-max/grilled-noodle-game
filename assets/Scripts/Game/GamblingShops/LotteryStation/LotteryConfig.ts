/**
 * LotteryConfig.ts
 * 彩票站配置文件
 */

/**
 * 彩票档位配置
 */
export interface LotteryTier {
    name: string;           // 档位名称
    price: number;          // 价格
    rewards: number[];      // 奖励金额数组 [无奖, 小奖, 中奖, 大奖]
    winRate: number;        // 中奖概率
    color: string;          // 档位颜色
    icon: string;           // 档位图标
}

/**
 * 刮刮卡图案配置
 */
export interface ScratchSymbol {
    symbol: string;         // 图案
    weight: number;         // 权重（出现概率）
    rewardTier: number;     // 对应奖励等级 0-3
}

/**
 * 彩票站总配置
 */
export const LOTTERY_CONFIG = {
    // 店铺信息
    shopName: '🎫 幸运彩票站',
    shopDescription: '试试手气，说不定就发财了！',
    
    // 档位配置
    tiers: {
        bronze: {
            name: '铜卡',
            price: 10,
            rewards: [0, 10, 20, 30],      // 无奖/小奖/中奖/大奖
            winRate: 0.4,                  // 40%获奖
            color: '#CD7F32',              // 铜色
            icon: '🥉'
        } as LotteryTier,
        silver: {
            name: '银卡',
            price: 20,
            rewards: [0, 25, 50, 80],
            winRate: 0.35,                 // 35%获奖
            color: '#C0C0C0',              // 银色
            icon: '🥈'
        } as LotteryTier,
        gold: {
            name: '金卡',
            price: 50,
            rewards: [0, 60, 120, 200],
            winRate: 0.3,                  // 30%获奖
            color: '#FFD700',              // 金色
            icon: '🥇'
        } as LotteryTier
    },
    
    // 刮刮卡图案（6种）
    symbols: [
        { symbol: '🍒', weight: 25, rewardTier: 0 },   // 樱桃 - 无奖
        { symbol: '🍋', weight: 25, rewardTier: 0 },   // 柠檬 - 无奖
        { symbol: '🍊', weight: 20, rewardTier: 1 },   // 橙子 - 小奖
        { symbol: '🍇', weight: 15, rewardTier: 2 },   // 葡萄 - 中奖
        { symbol: '⭐', weight: 10, rewardTier: 3 },   // 星星 - 大奖
        { symbol: '💎', weight: 5, rewardTier: 3 }     // 钻石 - 大奖
    ] as ScratchSymbol[],
    
    // 刮刮卡布局
    cardLayout: {
        rows: 4,
        cols: 5,
        cellSize: 78,
        gap: 8,
        padding: 24,
        winningAreaHeight: 88
    },

    // 号码与刮开规则
    scratchRules: {
        numberMin: 10,
        numberMax: 99,
        numberRevealThreshold: 0.6,
        amountRevealThreshold: 0.75,
        winningRevealThreshold: 0.6,
        winningRevealMinNumbers: 4,
        completeNumberProgress: 0.88,
        completeAmountProgress: 0.9,
        completeWinningProgress: 0.8
    },

    // 刮刮卡涂层网格
    scratchMaskGrid: {
        numberColsPerCell: 5,
        numberRowsPerCell: 5,
        amountColsPerCell: 5,
        amountRowsPerCell: 5,
        winningCols: 8,
        winningRows: 4
    },

    // 特殊机制
    specialMechanics: {
        // 幸运连刮：连续N次不中奖，下次必中小奖
        luckyStreak: {
            enabled: true,
            threshold: 3,           // 连续3次不中奖
            guaranteedTier: 1       // 保底小奖
        },
        
        // 彩虹卡：低概率出现，奖励翻倍
        rainbowCard: {
            enabled: true,
            rate: 0.02,             // 2%概率
            multiplier: 2           // 奖励翻倍
        }
    },
    
    // UI配置
    ui: {
        panelWidth: 780,
        panelHeight: 720,
        backgroundColor: { r: 24, g: 34, b: 42, a: 210 },
        titleColor: { r: 255, g: 228, b: 150, a: 255 },
        
        // 刮卡遮罩颜色
        scratchMaskColor: { r: 180, g: 180, b: 180, a: 255 },
        
        // 动画时长
        scratchRevealDuration: 0.3,
        rewardShowDuration: 1.5
    },
    
    // 音效配置（预留）
    sounds: {
        scratch: 'scratch',
        smallWin: 'coin_small',
        bigWin: 'coin_big',
        noWin: 'fail',
        rainbowCard: 'special'
    }
};

/**
 * 获取档位配置
 */
export function getTierConfig(tierKey: string): LotteryTier | null {
    return LOTTERY_CONFIG.tiers[tierKey] || null;
}

/**
 * 获取所有档位键名
 */
export function getAllTierKeys(): string[] {
    return Object.keys(LOTTERY_CONFIG.tiers);
}
