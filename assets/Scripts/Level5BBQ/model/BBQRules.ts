import { IngredientType } from '../../Data/GameConfig';
import { BBQ_CONFIG } from './BBQConfig';
import { BBQCookState, BBQOrderState, BBQPlateItem } from './BBQTypes';

export interface BBQServeResult {
    success: boolean;
    score: number;
    money: number;
    reason: string;
}

export function getCookProgress(elapsed: number, duration: number): number {
    if (duration <= 0) return 1;
    return Math.max(0, Math.min(1, elapsed / duration));
}

export function getCookState(elapsed: number, cookDuration: number, burnDuration: number): BBQCookState {
    if (elapsed <= 0) return 'raw';
    if (elapsed < cookDuration * 0.35) return 'raw';
    if (elapsed < cookDuration) return 'cooking';
    if (elapsed < burnDuration) return 'cooked';
    return 'burnt';
}

export function formatHeatLabel(heat: string): string {
    switch (heat) {
        case 'hot':
            return '高温';
        case 'warm':
            return '保温';
        default:
            return '中温';
    }
}

export function evaluateOrder(plate: BBQPlateItem[], order: BBQOrderState): BBQServeResult {
    if (plate.length === 0) {
        return { success: false, score: 0, money: 0, reason: '盘子里没有食物' };
    }

    const relevant = plate.filter((item) => !item.orderId || item.orderId === order.id);
    if (relevant.length === 0) {
        return { success: false, score: 0, money: 0, reason: '盘子里没有该订单食物' };
    }

    if (relevant.some((item) => item.cookState === 'burnt')) {
        return { success: false, score: 0, money: 0, reason: '有烤焦的食材' };
    }

    const counts = new Map<IngredientType, number>();
    let sauceCount = 0;
    let spiceCount = 0;
    let heatMatchCount = 0;

    for (const item of relevant) {
        if (item.cookState !== 'cooked') continue;
        counts.set(item.ingredient, (counts.get(item.ingredient) || 0) + 1);
        if (item.hasSauce) sauceCount += 1;
        if (item.hasSpice) spiceCount += 1;
        if (order.requiredHeat && item.heatLevel === order.requiredHeat) {
            heatMatchCount += 1;
        }
    }

    for (const requirement of order.requirements) {
        if (requirement.ingredient === IngredientType.BBQ_SAUCE) {
            if (sauceCount < requirement.count) {
                return { success: false, score: 0, money: 0, reason: '还没刷够烧烤酱' };
            }
            continue;
        }
        if (requirement.ingredient === IngredientType.CUMIN || requirement.ingredient === IngredientType.CHILI_POWDER) {
            if (spiceCount < requirement.count) {
                return { success: false, score: 0, money: 0, reason: '还没撒够调料' };
            }
            continue;
        }
        const count = counts.get(requirement.ingredient) || 0;
        if (count < requirement.count) {
            return { success: false, score: 0, money: 0, reason: '食材数量不足' };
        }
    }

    if (order.requiredHeat && heatMatchCount === 0) {
        return { success: false, score: 0, money: 0, reason: `需要${formatHeatLabel(order.requiredHeat)}完成` };
    }

    const perfectCount = relevant.filter((item) => {
        return item.cookProgress >= BBQ_CONFIG.perfectRange.start &&
               item.cookProgress <= BBQ_CONFIG.perfectRange.end &&
               item.cookState === 'cooked';
    }).length;

    const score = perfectCount >= relevant.length ? 100 : 80;
    const bonus = score >= 100 ? 2 : 0;
    return {
        success: true,
        score,
        money: order.price + bonus,
        reason: score >= 100 ? '完美出餐' : '顺利出餐'
    };
}
