import { IngredientType } from './GameConfig';

/**
 * 蒸锅槽位状态枚举
 */
export enum SteamerSlotState {
    EMPTY = 'empty',           // 空槽位
    OCCUPIED = 'occupied',     // 已占用（放入但未开始蒸制）
    STEAMING = 'steaming',     // 蒸制中
    COMPLETED = 'completed'    // 蒸制完成
}

/**
 * 蒸锅槽位数据结构
 */
export interface SteamerSlot {
    index: number;                    // 槽位索引 0-5
    state: SteamerSlotState;          // 槽位状态
    ingredientType: IngredientType | null;  // RICE 或 POTATO
    count: number;                    // 食材数量
    progress: number;                 // 蒸制进度 0-1
    slotNode: Node | null;            // UI节点（槽位框）
    ingredientNode: Node | null;      // 食材显示节点
}

/**
 * 槽位点击回调函数类型
 */
export type SlotClickCallback = (slot: SteamerSlot) => void;

/**
 * 蒸制完成回调函数类型
 */
export type SteamingCompleteCallback = (slots: SteamerSlot[]) => void;

/**
 * 手持食材数据结构
 */
export interface HandItem {
    type: IngredientType;        // 食材类型
    count: number;               // 数量
    sourceSlot?: number;         // 来源槽位（可选）
}

/**
 * 蒸锅序列化数据
 */
export interface SteamerSaveData {
    slots: {
        index: number;
        state: SteamerSlotState;
        ingredientType: IngredientType | null;
        count: number;
        progress: number;
    }[];
    isSteaming: boolean;
    steamProgress: number;
}
