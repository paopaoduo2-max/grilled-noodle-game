import { BBQ_CONFIG, BBQ_ORDER_TEMPLATES } from '../model/BBQConfig';
import { formatHeatLabel } from '../model/BBQRules';
import { BBQOrderState, BBQState } from '../model/BBQTypes';
import { IngredientType } from '../../Data/GameConfig';

export class BBQOrderController {
    private orderSeed = 0;
    private tableCooldowns = new Map<number, number>();
    private maxActiveTables = BBQ_CONFIG.maxActiveOrders;

    public setMaxActiveTables(count: number): void {
        this.maxActiveTables = Math.max(1, Math.min(BBQ_CONFIG.maxActiveOrders, count));
    }

    public ensureOrders(state: BBQState): void {
        const usedTables = new Set(state.orders.map((order) => order.tableId));
        for (let tableId = 1; tableId <= this.maxActiveTables; tableId += 1) {
            if (usedTables.has(tableId)) continue;
            if (this.tableCooldowns.has(tableId)) continue;
            state.orders.push(this.createOrder(tableId));
        }
    }

    public tick(dt: number, state: BBQState): BBQOrderState[] {
        const heatDecay = BBQ_CONFIG.orderHeatDecay ?? 0;
        if (heatDecay > 0) {
            for (const order of state.orders) {
                order.heat = Math.max(0, order.heat - heatDecay * dt);
            }
        }
        for (const [tableId, timeLeft] of [...this.tableCooldowns.entries()]) {
            const next = timeLeft - dt;
            if (next <= 0) {
                this.tableCooldowns.delete(tableId);
            } else {
                this.tableCooldowns.set(tableId, next);
            }
        }
        this.ensureOrders(state);
        return [];
    }

    public queueNextOrder(tableId: number, score: number): void {
        const delay = score >= 100 ? 1.5 : score >= 80 ? 4 : 7;
        this.tableCooldowns.set(tableId, delay);
    }

    private createOrder(tableId: number): BBQOrderState {
        const template = BBQ_ORDER_TEMPLATES[Math.floor(Math.random() * BBQ_ORDER_TEMPLATES.length)];
        const heatText = template.requiredHeat ? `${formatHeatLabel(template.requiredHeat)}` : '';
        const name = heatText ? `${heatText}${template.name}` : template.name;
        const pendingItems = template.requirements
            .filter((item) => this.isGrillable(item.ingredient))
            .map((item) => ({ ...item }));
        const totalCount = pendingItems.reduce((sum, item) => sum + item.count, 0);
        return {
            id: `bbq_order_${tableId}_${++this.orderSeed}`,
            tableId,
            customerCount: this.getRandomCustomerCount(),
            name,
            requirements: template.requirements.map((item) => ({ ...item })),
            timeLeft: template.timeLimit,
            price: template.price,
            requiredHeat: template.requiredHeat,
            pendingItems,
            totalCount,
            completedCount: 0,
            callCount: 0,
            heat: 100
        };
    }

    private getRandomCustomerCount(): number {
        const range = BBQ_CONFIG.customerCountRange;
        const min = range?.min ?? 2;
        const max = range?.max ?? 4;
        const safeMin = Math.min(min, max);
        const safeMax = Math.max(min, max);
        return safeMin + Math.floor(Math.random() * (safeMax - safeMin + 1));
    }

    private isGrillable(ingredient: IngredientType): boolean {
        return ingredient === IngredientType.MEAT_SKEWER
            || ingredient === IngredientType.VEG_SKEWER
            || ingredient === IngredientType.SAUSAGE;
    }
}
