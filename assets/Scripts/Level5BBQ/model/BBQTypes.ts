import { IngredientType } from '../../Data/GameConfig';

export type BBQCookState = 'empty' | 'raw' | 'cooking' | 'cooked' | 'burnt';
export type BBQHeatLevel = 'hot' | 'mid' | 'warm';
export type BBQTool = 'none' | 'sauce' | 'spice' | 'fan';

export interface BBQSlotState {
    index: number;
    ingredient: IngredientType | null;
    orderId: string | null;
    heatLevel: BBQHeatLevel;
    cookElapsed: number;
    cookDuration: number;
    cookState: BBQCookState;
    hasSauce: boolean;
    hasSpice: boolean;
}

export interface BBQOrderRequirement {
    ingredient: IngredientType;
    count: number;
}

export interface BBQOrderState {
    id: string;
    tableId: number;
    customerCount: number;
    name: string;
    requirements: BBQOrderRequirement[];
    timeLeft: number;
    price: number;
    requiredHeat?: BBQHeatLevel;
    pendingItems: BBQOrderRequirement[];
    totalCount: number;
    completedCount: number;
    callCount: number;
    heat: number;
}

export interface BBQOrderTemplate {
    id: string;
    name: string;
    requirements: BBQOrderRequirement[];
    price: number;
    timeLimit: number;
    requiredHeat?: BBQHeatLevel;
}

export interface BBQPlateItem {
    ingredient: IngredientType;
    orderId?: string;
    cookState: BBQCookState;
    cookProgress: number;
    heatLevel: BBQHeatLevel;
    hasSauce: boolean;
    hasSpice: boolean;
}

export interface BBQHandItem {
    ingredient: IngredientType;
    orderId: string;
}

export interface BBQHandState {
    kind: 'none' | 'ingredient' | 'tool' | 'trash' | 'cooked' | 'grill';
    ingredient?: IngredientType;
    tool?: BBQTool;
}

export interface BBQSlotSnapshot {
    ingredient: IngredientType;
    orderId: string | null;
    cookElapsed: number;
    cookDuration: number;
    cookState: BBQCookState;
    heatLevel: BBQHeatLevel;
    hasSauce: boolean;
    hasSpice: boolean;
}

export interface BBQHandCooked {
    item: BBQPlateItem;
    from: 'grill' | 'plate';
    slotIndex?: number;
    plateIndex?: number;
    slotSnapshot?: BBQSlotSnapshot;
}

export interface BBQHandGrill {
    fromIndex: number;
    snapshot: BBQSlotSnapshot;
}

export interface BBQHandCookedBatchItem {
    item: BBQPlateItem;
    fromIndex: number;
    snapshot: BBQSlotSnapshot;
}

export interface BBQState {
    slots: BBQSlotState[];
    plate: BBQPlateItem[];
    orders: BBQOrderState[];
    hand: BBQHandState;
    handItems: BBQHandItem[];
    handCooked: BBQHandCooked | null;
    handGrill: BBQHandGrill | null;
    handCookedBatch: BBQHandCookedBatchItem[];
    heatLevel: BBQHeatLevel;
    combo: number;
    smoke: number;
    money: number;
    timeLeft: number;
    totalServed: number;
    goodCount: number;
    badCount: number;
    superGoodCount: number;
}
