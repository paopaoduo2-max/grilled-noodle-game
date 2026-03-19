import { GameManager } from '../../Manager/GameManager';

export class CurrencyPort {
    private get manager(): GameManager | null {
        return GameManager.Instance || null;
    }

    public getMoney(): number {
        return this.manager?.playerMoney ?? 0;
    }

    public addMoney(amount: number): void {
        const manager = this.manager;
        if (!manager) return;
        manager.addMoney(amount);
    }

    public completeOrder(money: number, score: number): void {
        const manager = this.manager;
        if (!manager) return;
        manager.completeOrder(money, score);
    }

    public orderTimeout(): void {
        const manager = this.manager;
        if (!manager) return;
        manager.orderTimeout();
    }

    public getManager(): GameManager | null {
        return this.manager;
    }
}
