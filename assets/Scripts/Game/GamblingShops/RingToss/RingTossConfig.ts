export type RingTossRewardType =
    | 'cash_small'
    | 'cash_mid'
    | 'cash_large'
    | 'veg_small'
    | 'meat_mid'
    | 'mix_mid'
    | 'mix_large'
    | 'jackpot';

export interface RingTossTargetConfig {
    id: string;
    label: string;
    position: { x: number; y: number };
    radius: number;
    value: number;
    rewardType: RingTossRewardType;
}

export const RING_TOSS_CONFIG = {
    singleCost: 30,
    packDiscounts: {
        3: 0.95,
        5: 0.9,
    },
    maxDragDistance: 220,
    chargeDuration: 1.15,
    minRange: 90,
    maxRange: 360,
    maxJitter: 28,
    minPower: 0.15,
    arcHeightMin: 80,
    arcHeightMax: 160,
    hitTieDistance: 4,
    playAreaMargin: 20,
    launchLocal: { x: 0, y: -140 },
    perspective: {
        groundNearY: -140,
        groundFarY: 180,
        screenNearY: -140,
        screenFarY: 120,
        nearScale: 1.25,
        farScale: 0.42,
        depthCurve: 1.35,
        groundBounds: {
            xMin: -340,
            xMax: 340,
            yMin: -150,
            yMax: 190,
        },
    },
    difficulty: {
        easyChance: 0.75,
        midChance: 0.5,
        hardChance: 0.22,
        jackpotChance: 0.06,
        edgePenalty: 0.55,
        depthPenalty: 0.28,
        missStreakBoost: 0.1,
        missStreakCap: 3,
        windMax: 7,
        jitterCurve: 0.6,
        sweetSpot: 0.55,
        rowDifficultyScale: {
            front: 0.75,
            middle: 0.95,
            back: 1.25,
        },
    },
    targets: [
        {
            id: 'cash_small_left',
            label: '小现金',
            position: { x: -310, y: -70 },
            radius: 62,
            value: 20,
            rewardType: 'cash_small',
        },
        {
            id: 'veg_small',
            label: '素菜包',
            position: { x: 10, y: -90 },
            radius: 62,
            value: 25,
            rewardType: 'veg_small',
        },
        {
            id: 'cash_small_right',
            label: '小现金',
            position: { x: 310, y: -60 },
            radius: 62,
            value: 20,
            rewardType: 'cash_small',
        },
        {
            id: 'cash_mid',
            label: '中现金',
            position: { x: -230, y: 10 },
            radius: 46,
            value: 80,
            rewardType: 'cash_mid',
        },
        {
            id: 'meat_mid',
            label: '肉类包',
            position: { x: 70, y: 0 },
            radius: 46,
            value: 90,
            rewardType: 'meat_mid',
        },
        {
            id: 'mix_mid',
            label: '混合包',
            position: { x: 260, y: 20 },
            radius: 46,
            value: 95,
            rewardType: 'mix_mid',
        },
        {
            id: 'cash_large',
            label: '大现金',
            position: { x: -170, y: 95 },
            radius: 36,
            value: 200,
            rewardType: 'cash_large',
        },
        {
            id: 'mix_large',
            label: '大混合',
            position: { x: 210, y: 115 },
            radius: 36,
            value: 220,
            rewardType: 'mix_large',
        },
        {
            id: 'jackpot',
            label: '终极大奖',
            position: { x: 80, y: 160 },
            radius: 24,
            value: 1000,
            rewardType: 'jackpot',
        },
    ],
};
