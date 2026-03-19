import { BBQ_CONFIG } from '../model/BBQConfig';
import { evaluateOrder, getCookProgress } from '../model/BBQRules';
import { BBQSlotSnapshot, BBQOrderState, BBQPlateItem, BBQState } from '../model/BBQTypes';

export class BBQServeController {
    public takeFromSlot(state: BBQState, slotIndex: number): { success: boolean; reason: string; item?: BBQPlateItem; snapshot?: BBQSlotSnapshot } {
        const slot = state.slots[slotIndex];
        if (!slot || !slot.ingredient) {
            return { success: false, reason: '这里没有食材' };
        }
        if (slot.cookState !== 'cooked') {
            return { success: false, reason: '火候未到，不能取下' };
        }

        const item: BBQPlateItem = {
            ingredient: slot.ingredient,
            orderId: slot.orderId ?? undefined,
            cookState: slot.cookState,
            cookProgress: getCookProgress(slot.cookElapsed, slot.cookDuration),
            heatLevel: slot.heatLevel,
            hasSauce: slot.hasSauce,
            hasSpice: slot.hasSpice
        };

        const snapshot: BBQSlotSnapshot = {
            ingredient: slot.ingredient,
            orderId: slot.orderId,
            cookElapsed: slot.cookElapsed,
            cookDuration: slot.cookDuration,
            cookState: slot.cookState,
            heatLevel: slot.heatLevel,
            hasSauce: slot.hasSauce,
            hasSpice: slot.hasSpice
        };

        return { success: true, reason: '', item, snapshot };
    }

    public addItemToPlate(state: BBQState, item: BBQPlateItem): { success: boolean; reason: string } {
        if (state.plate.length >= BBQ_CONFIG.plateCapacity) {
            return { success: false, reason: '盘子已满' };
        }
        state.plate.push({ ...item });
        if (item.orderId) {
            const order = state.orders.find((entry) => entry.id === item.orderId);
            if (order) {
                order.completedCount = Math.min(order.totalCount, order.completedCount + 1);
            }
        }
        return { success: true, reason: '' };
    }

    public removeFromPlate(state: BBQState, plateIndex: number): { success: boolean; reason: string; item?: BBQPlateItem } {
        const item = state.plate[plateIndex];
        if (!item) {
            return { success: false, reason: '盘子里没有这个食材' };
        }
        state.plate.splice(plateIndex, 1);
        if (item.orderId) {
            const order = state.orders.find((entry) => entry.id === item.orderId);
            if (order) {
                order.completedCount = Math.max(0, order.completedCount - 1);
            }
        }
        return { success: true, reason: '', item };
    }

    public tryServe(state: BBQState, orderId?: string): { order?: BBQOrderState; result?: ReturnType<typeof evaluateOrder> } {
        if (state.orders.length === 0) return {};
        if (orderId) {
            const order = state.orders.find((item) => item.id === orderId);
            if (!order) return {};
            const result = evaluateOrder(state.plate, order);
            if (result.success) {
                const index = state.orders.findIndex((item) => item.id === order.id);
                if (index >= 0) state.orders.splice(index, 1);
                state.plate = state.plate.filter((item) => item.orderId !== order.id);
            }
            return { order, result };
        }

        for (const order of state.orders) {
            const result = evaluateOrder(state.plate, order);
            if (result.success) {
                const index = state.orders.findIndex((item) => item.id === order.id);
                if (index >= 0) state.orders.splice(index, 1);
                state.plate = state.plate.filter((item) => item.orderId !== order.id);
                return { order, result };
            }
        }

        const fallback = state.orders[0];
        return { order: fallback, result: evaluateOrder(state.plate, fallback) };
    }
}
