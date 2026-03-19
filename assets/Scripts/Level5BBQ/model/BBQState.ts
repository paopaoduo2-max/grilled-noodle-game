import { BBQ_CONFIG } from './BBQConfig';
import { BBQHeatLevel, BBQState } from './BBQTypes';

export function createBBQState(startMoney: number, timeLeft: number = BBQ_CONFIG.levelDuration): BBQState {
    const slots = Array.from({ length: BBQ_CONFIG.slotCount }, (_, index) => ({
        index,
        ingredient: null,
        orderId: null,
        heatLevel: 'mid' as BBQHeatLevel,
        cookElapsed: 0,
        cookDuration: BBQ_CONFIG.cookDuration,
        cookState: 'empty' as const,
        hasSauce: false,
        hasSpice: false
    }));

    return {
        slots,
        plate: [],
        orders: [],
        hand: { kind: 'none' },
        handItems: [],
        handCooked: null,
        handGrill: null,
        handCookedBatch: [],
        heatLevel: 'mid',
        combo: 0,
        smoke: 0,
        money: startMoney,
        timeLeft,
        totalServed: 0,
        goodCount: 0,
        badCount: 0,
        superGoodCount: 0
    };
}
