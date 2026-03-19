import { BBQ_CONFIG } from '../model/BBQConfig';
import { getCookState } from '../model/BBQRules';
import { BBQState, BBQTool, BBQSlotState } from '../model/BBQTypes';
import { IngredientType } from '../../Data/GameConfig';

export class BBQGrillController {
    public tick(dt: number, state: BBQState): void {
        for (const slot of state.slots) {
            if (!slot.ingredient) continue;
            if (slot.cookState === 'burnt') continue;

            const speed = BBQ_CONFIG.heatSpeed[slot.heatLevel] ?? 1;
            slot.cookElapsed += dt * speed;

            const nextState = getCookState(slot.cookElapsed, BBQ_CONFIG.cookDuration, BBQ_CONFIG.burnDuration);
            if (slot.cookState !== nextState) {
                slot.cookState = nextState;
                if (nextState === 'burnt') {
                    state.smoke = Math.min(100, state.smoke + 6);
                }
            }
        }
    }

    public placeIngredient(state: BBQState, slotIndex: number, ingredient: IngredientType, orderId: string | null = null): { success: boolean; reason: string } {
        const slot = state.slots[slotIndex];
        if (!slot) return { success: false, reason: '无效格位' };
        if (slot.ingredient) return { success: false, reason: '格位已被占用' };

        slot.ingredient = ingredient;
        slot.orderId = orderId;
        slot.cookElapsed = 0;
        slot.cookDuration = BBQ_CONFIG.cookDuration;
        slot.cookState = 'raw';
        slot.hasSauce = false;
        slot.hasSpice = false;
        slot.heatLevel = state.heatLevel;

        return { success: true, reason: '' };
    }

    public applyTool(state: BBQState, slotIndex: number, tool: BBQTool): { success: boolean; reason: string } {
        const slot = state.slots[slotIndex];
        if (!slot || !slot.ingredient) return { success: false, reason: '这里没有食材' };
        if (slot.cookState !== 'cooked') return { success: false, reason: '火候未到，先烤熟' };

        if (tool === 'sauce') {
            slot.hasSauce = true;
            return { success: true, reason: '' };
        }
        if (tool === 'spice') {
            slot.hasSpice = true;
            return { success: true, reason: '' };
        }

        return { success: false, reason: '工具无效' };
    }

    public clearSlot(slot: BBQSlotState): void {
        slot.ingredient = null;
        slot.orderId = null;
        slot.cookElapsed = 0;
        slot.cookDuration = BBQ_CONFIG.cookDuration;
        slot.cookState = 'empty';
        slot.hasSauce = false;
        slot.hasSpice = false;
        slot.heatLevel = 'mid';
    }
}
