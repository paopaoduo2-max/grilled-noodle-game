import { _decorator, Component, Node } from 'cc';
import { ReviewRecord, DailyStats } from './SharedTypes';
import { ReviewTexts } from '../../Data/ReviewTexts';

const { ccclass, property } = _decorator;

/**
 * 🌟 评价系统
 * 管理顾客评价、热度计算、评价历史
 * 可被所有关卡的烹饪控制器使用
 */
@ccclass('ReviewSystem')
export class ReviewSystem {
    
    private static _instance: ReviewSystem | null = null;
    
    // 评价数据
    private _superGoodReviews: number = 0;
    private _goodReviews: number = 0;
    private _badReviews: number = 0;
    private _reviewHistory: ReviewRecord[] = [];
    
    // 店铺热度 (0-100)
    private _shopHeat: number = 50;
    
    // 今日统计
    private _todayStats: DailyStats = {
        totalMoney: 0,
        customerCount: 0,
        superGoodReviews: 0,
        goodReviews: 0,
        badReviews: 0,
        ordersCompleted: 0,
        ordersFailed: 0
    };
    
    public static get instance(): ReviewSystem {
        if (!ReviewSystem._instance) {
            ReviewSystem._instance = new ReviewSystem();
        }
        return ReviewSystem._instance;
    }
    
    // ==================== Getters ====================
    
    public get superGoodReviews(): number { return this._superGoodReviews; }
    public get goodReviews(): number { return this._goodReviews; }
    public get badReviews(): number { return this._badReviews; }
    public get shopHeat(): number { return this._shopHeat; }
    public get reviewHistory(): ReviewRecord[] { return this._reviewHistory; }
    public get todayStats(): DailyStats { return this._todayStats; }
    
    /**
     * 获取总评价数
     */
    public get totalReviews(): number {
        return this._superGoodReviews + this._goodReviews + this._badReviews;
    }
    
    /**
     * 获取好评率 (0-1)
     */
    public get positiveRate(): number {
        const total = this.totalReviews;
        if (total === 0) return 1;
        return (this._superGoodReviews + this._goodReviews) / total;
    }
    
    // ==================== 评价操作 ====================
    
    /**
     * 添加评价
     * @param type 评价类型
     * @param customerName 顾客名称（可选）
     * @param score 评分（可选）
     * @returns 生成的评价内容
     */
    public addReview(type: 'super_good' | 'good' | 'bad', customerName?: string, score?: number): string {
        // 更新计数
        switch (type) {
            case 'super_good':
                this._superGoodReviews++;
                this._todayStats.superGoodReviews++;
                this._shopHeat = Math.min(100, this._shopHeat + 5);
                break;
            case 'good':
                this._goodReviews++;
                this._todayStats.goodReviews++;
                this._shopHeat = Math.min(100, this._shopHeat + 2);
                break;
            case 'bad':
                this._badReviews++;
                this._todayStats.badReviews++;
                this._shopHeat = Math.max(0, this._shopHeat - 5);
                break;
        }
        
        // 生成评价内容
        const content = this.generateReviewContent(type);
        
        // 记录历史
        const record: ReviewRecord = {
            type,
            content,
            timestamp: Date.now(),
            customerName,
            score
        };
        this._reviewHistory.push(record);
        
        // 限制历史记录数量
        if (this._reviewHistory.length > 100) {
            this._reviewHistory.shift();
        }
        
        console.log(`[ReviewSystem] 📝 新评价: ${type} - ${content}`);
        return content;
    }
    
    /**
     * 生成评价内容
     */
    private generateReviewContent(type: 'super_good' | 'good' | 'bad'): string {
        let templates: string[] = [];
        
        switch (type) {
            case 'super_good':
                templates = ReviewTexts.SUPER_GOOD_REVIEWS || [
                    '太好吃了！五星好评！⭐⭐⭐⭐⭐',
                    '老板手艺绝了！还会再来！',
                    '这是我吃过最好吃的！'
                ];
                break;
            case 'good':
                templates = ReviewTexts.GOOD_REVIEWS || [
                    '味道不错，下次还来！',
                    '挺好吃的，推荐！',
                    '性价比很高，满意！'
                ];
                break;
            case 'bad':
                templates = ReviewTexts.BAD_REVIEWS || [
                    '做得不太对，有点失望...',
                    '等太久了，不太满意',
                    '味道一般般吧...'
                ];
                break;
        }
        
        return templates[Math.floor(Math.random() * templates.length)];
    }
    
    // ==================== 热度系统 ====================
    
    /**
     * 根据热度计算最大顾客数
     */
    public getMaxCustomersByHeat(): number {
        if (this._shopHeat >= 80) return 5;
        if (this._shopHeat >= 60) return 4;
        if (this._shopHeat >= 40) return 3;
        if (this._shopHeat >= 20) return 2;
        return 1;
    }
    
    /**
     * 调整热度
     */
    public adjustHeat(delta: number): void {
        this._shopHeat = Math.max(0, Math.min(100, this._shopHeat + delta));
        console.log(`[ReviewSystem] 🔥 热度变化: ${delta > 0 ? '+' : ''}${delta} → ${this._shopHeat}`);
    }
    
    /**
     * 设置热度
     */
    public setHeat(value: number): void {
        this._shopHeat = Math.max(0, Math.min(100, value));
    }
    
    // ==================== 统计操作 ====================
    
    /**
     * 记录完成订单
     */
    public recordOrderCompleted(money: number): void {
        this._todayStats.ordersCompleted++;
        this._todayStats.totalMoney += money;
    }
    
    /**
     * 记录失败订单
     */
    public recordOrderFailed(): void {
        this._todayStats.ordersFailed++;
    }
    
    /**
     * 记录顾客
     */
    public recordCustomer(): void {
        this._todayStats.customerCount++;
    }
    
    /**
     * 重置今日统计
     */
    public resetDailyStats(): void {
        this._todayStats = {
            totalMoney: 0,
            customerCount: 0,
            superGoodReviews: 0,
            goodReviews: 0,
            badReviews: 0,
            ordersCompleted: 0,
            ordersFailed: 0
        };
        console.log('[ReviewSystem] 📊 今日统计已重置');
    }
    
    /**
     * 完全重置（新游戏）
     */
    public reset(): void {
        this._superGoodReviews = 0;
        this._goodReviews = 0;
        this._badReviews = 0;
        this._reviewHistory = [];
        this._shopHeat = 50;
        this.resetDailyStats();
        console.log('[ReviewSystem] 🔄 评价系统已完全重置');
    }
    
    // ==================== 评价查询 ====================
    
    /**
     * 获取最近的评价
     */
    public getRecentReviews(count: number = 10): ReviewRecord[] {
        return this._reviewHistory.slice(-count);
    }
    
    /**
     * 获取评价统计文本
     */
    public getStatsText(): string {
        return `🌟: ${this._superGoodReviews} | 😊: ${this._goodReviews} | 😢: ${this._badReviews}`;
    }
    
    /**
     * 获取热度等级描述
     */
    public getHeatLevelText(): string {
        if (this._shopHeat >= 80) return '🔥 爆满';
        if (this._shopHeat >= 60) return '😊 火热';
        if (this._shopHeat >= 40) return '😐 一般';
        if (this._shopHeat >= 20) return '😟 冷清';
        return '❄️ 无人';
    }
}
