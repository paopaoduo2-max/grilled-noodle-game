import { Label } from 'cc';
import { IngredientType } from '../../Data/GameConfig';
import { BBQOrderState } from '../model/BBQTypes';

export class BBQOrderItemView {
    public static update(label: Label | null, order: BBQOrderState): void {
        if (!label) return;
        const total = order.totalCount ?? this.getTotalGrillCount(order);
        const completed = Math.min(total, Math.max(0, order.completedCount ?? 0));
        label.string = `桌#${order.tableId} ${order.name}\n完成${completed}/${total}`;
    }

    private static getTotalGrillCount(order: BBQOrderState): number {
        return order.requirements
            .filter((item) => this.isGrillable(item.ingredient))
            .reduce((sum, item) => sum + item.count, 0);
    }

    private static isGrillable(ingredient: IngredientType): boolean {
        return ingredient === IngredientType.MEAT_SKEWER
            || ingredient === IngredientType.VEG_SKEWER
            || ingredient === IngredientType.SAUSAGE;
    }
}
