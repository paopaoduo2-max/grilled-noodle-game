import { sys } from 'cc';
import { GameProgressManager } from '../../Manager/GameProgressManager';
import { VoucherType } from './SpecialEventTypes';

interface VoucherEntry {
    id: string;
    type: VoucherType;
    tier: string;
    count: number;
    issuedDay: number;
    expireDay: number;
}

const STORAGE_KEY = 'special_event_vouchers';
const EXPIRE_DAYS = 3;

export const STONE_DISCOUNT_RATE: Record<string, number> = {
    '8': 0.8,
    '5': 0.5,
    '1': 0.1
};

export class SpecialEventVoucherManager {
    private static _instance: SpecialEventVoucherManager | null = null;
    private entries: VoucherEntry[] = [];

    public static get instance(): SpecialEventVoucherManager {
        if (!this._instance) {
            this._instance = new SpecialEventVoucherManager();
        }
        return this._instance;
    }

    private constructor() {
        this.load();
    }

    private getCurrentDay(): number {
        return GameProgressManager.instance?.progress?.currentDay ?? 1;
    }

    private load() {
        const raw = sys.localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            this.entries = [];
            return;
        }
        try {
            const parsed = JSON.parse(raw) as VoucherEntry[];
            this.entries = Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.warn('[SpecialEventVoucher] 加载失败，已重置', err);
            this.entries = [];
        }
    }

    private save() {
        sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries));
    }

    public cleanupExpired(currentDay: number = this.getCurrentDay()) {
        const before = this.entries.length;
        this.entries = this.entries.filter(entry => currentDay <= entry.expireDay && entry.count > 0);
        if (this.entries.length !== before) {
            this.save();
        }
    }

    public grantVoucher(type: VoucherType, tier: string, count: number = 1, issuedDay?: number) {
        if (count <= 0) return;
        const day = issuedDay && issuedDay > 0 ? issuedDay : this.getCurrentDay();
        const expireDay = day + EXPIRE_DAYS - 1;
        const existing = this.entries.find(entry => entry.type === type && entry.tier === tier && entry.expireDay === expireDay);
        if (existing) {
            existing.count += count;
        } else {
            this.entries.push({
                id: `${type}_${tier}_${Date.now()}`,
                type,
                tier,
                count,
                issuedDay: day,
                expireDay
            });
        }
        this.save();
    }

    public getValidCount(type: VoucherType, tier: string, currentDay: number = this.getCurrentDay()): number {
        this.cleanupExpired(currentDay);
        return this.entries
            .filter(entry => entry.type === type && entry.tier === tier)
            .reduce((sum, entry) => sum + entry.count, 0);
    }

    public consumeVoucher(type: VoucherType, tier: string, currentDay: number = this.getCurrentDay()): boolean {
        this.cleanupExpired(currentDay);
        const candidates = this.entries
            .filter(entry => entry.type === type && entry.tier === tier && entry.count > 0)
            .sort((a, b) => a.expireDay - b.expireDay);
        if (!candidates.length) return false;
        const target = candidates[0];
        target.count -= 1;
        if (target.count <= 0) {
            this.entries = this.entries.filter(entry => entry !== target);
        }
        this.save();
        return true;
    }

    public getBestStoneDiscount(currentDay: number = this.getCurrentDay()): { tier: string; rate: number } | null {
        this.cleanupExpired(currentDay);
        const candidates = this.entries
            .filter(entry => entry.type === 'stone' && entry.count > 0)
            .map(entry => ({
                tier: entry.tier,
                rate: STONE_DISCOUNT_RATE[entry.tier] ?? 1,
                expireDay: entry.expireDay
            }))
            .filter(entry => entry.rate < 1);
        if (!candidates.length) return null;
        candidates.sort((a, b) => a.rate - b.rate || a.expireDay - b.expireDay);
        return { tier: candidates[0].tier, rate: candidates[0].rate };
    }
}
