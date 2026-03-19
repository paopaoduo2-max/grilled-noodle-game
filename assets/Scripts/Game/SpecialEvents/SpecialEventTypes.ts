export type TimeSlot = 'lunch' | 'afternoon' | 'dinner' | 'night';

export type VoucherType = 'lottery' | 'gacha' | 'stone';

export interface VoucherReward {
    type: VoucherType;
    tier: string;
    count?: number;
}

export interface SpecialEventEffect {
    money?: number;
    heat?: number;
    mainIngredientDelta?: number;
    voucher?: VoucherReward;
}

export interface SpecialEventTask {
    type: 'delivery';
    targetCount: number;
    timeLimit?: number;
    description: string;
}

export interface SpecialEventOption {
    text: string;
    emoji: string;
    task?: SpecialEventTask;
    successEffect?: SpecialEventEffect;
    failEffect?: SpecialEventEffect;
    successRate?: number;
}

export interface SpecialEventSender {
    name: string;
    icon: string;
    role: string;
}

export interface SpecialEventTemplate {
    id: string;
    levelId: number;
    slot: TimeSlot;
    title: string;
    description: string;
    sender?: SpecialEventSender;
    optionA: SpecialEventOption;
    optionB: SpecialEventOption;
    weight?: number;
}
