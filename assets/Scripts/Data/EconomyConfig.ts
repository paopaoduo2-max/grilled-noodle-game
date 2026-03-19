export interface EconomyLevelConfig {
    levelId: number;
    fixedCost: number;
    packagingCost: number;
    badReviewPenalty: number;
}

export interface DailyExpenseBreakdown {
    fixedCost: number;
    packagingCost: number;
    badReviewPenalty: number;
    totalCost: number;
}

const DEFAULT_ECONOMY: EconomyLevelConfig = {
    levelId: 0,
    fixedCost: 80,
    packagingCost: 2,
    badReviewPenalty: 6
};

const LEVEL_ECONOMY: EconomyLevelConfig[] = [
    { levelId: 1, fixedCost: 80, packagingCost: 2, badReviewPenalty: 6 },
    { levelId: 2, fixedCost: 110, packagingCost: 2, badReviewPenalty: 7 },
    { levelId: 3, fixedCost: 140, packagingCost: 3, badReviewPenalty: 8 },
    { levelId: 4, fixedCost: 180, packagingCost: 3, badReviewPenalty: 8 },
    { levelId: 5, fixedCost: 220, packagingCost: 4, badReviewPenalty: 9 },
    { levelId: 6, fixedCost: 260, packagingCost: 4, badReviewPenalty: 10 }
];

export function getEconomyConfig(levelId: number): EconomyLevelConfig {
    return LEVEL_ECONOMY.find(cfg => cfg.levelId === levelId) || DEFAULT_ECONOMY;
}

export function calculateDailyExpense(levelId: number, orders: number, badReviews: number): DailyExpenseBreakdown {
    const cfg = getEconomyConfig(levelId);
    const fixedCost = cfg.fixedCost;
    const packagingCost = Math.max(0, orders) * cfg.packagingCost;
    const badReviewPenalty = Math.max(0, badReviews) * cfg.badReviewPenalty;
    const totalCost = fixedCost + packagingCost + badReviewPenalty;

    return {
        fixedCost,
        packagingCost,
        badReviewPenalty,
        totalCost
    };
}
