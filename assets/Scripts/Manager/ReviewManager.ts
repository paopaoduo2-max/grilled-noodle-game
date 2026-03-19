import { _decorator, Component, Node } from 'cc';
import { ReviewData, ReviewCause, GameConfig } from '../Data/GameConfig';
import { GameManager } from './GameManager';

const { ccclass, property } = _decorator;

/**
 * 评价管理器
 * 负责管理好评和差评系统
 */
@ccclass('ReviewManager')
export class ReviewManager extends Component {
    private reviews: ReviewData[] = [];
    private positiveCount: number = 0;
    private negativeCount: number = 0;
    private currentSpeedModifier: number = 1.0;

    onLoad() {
        console.log('[ReviewManager] 评价系统初始化');
    }

    /**
     * 重置评价数据
     */
    reset() {
        this.reviews = [];
        this.positiveCount = 0;
        this.negativeCount = 0;
        this.currentSpeedModifier = 1.0;
        console.log('[ReviewManager] 评价数据已重置');
    }

    /**
     * 添加差评
     * @param cause 差评原因
     * @param customerId 客户ID
     */
    addNegativeReview(cause: ReviewCause, customerId: string) {
        // 根据原因随机选择文案
        const templates = GameConfig.NEGATIVE_REVIEW_TEMPLATES[cause];
        if (!templates || templates.length === 0) {
            console.warn('[ReviewManager] 未找到差评模板:', cause);
            return;
        }

        const content = templates[Math.floor(Math.random() * templates.length)];

        const review: ReviewData = {
            reviewId: `review_neg_${Date.now()}_${Math.random()}`,
            type: 'negative',
            content,
            customerId,
            timestamp: Date.now(),
            cause
        };

        this.reviews.push(review);
        this.negativeCount++;

        // 触发事件，通知UI更新
        this.node.emit('review-added', review);

        // 更新客户流速
        this.updateCustomerSpawnRate();

        console.log(`[ReviewManager] ❌ 差评 ${this.negativeCount}: ${content}`);
    }

    /**
     * 添加好评
     * @param quality 品质分数 (0-100)
     * @param customerId 客户ID
     * @param isFast 是否快速服务
     * @param isVIP 是否VIP客户
     */
    addPositiveReview(quality: number, customerId: string, isFast: boolean = false, isVIP: boolean = false) {
        let content = "很好吃！⭐⭐⭐";
        let flowBonus = 10;
        let templates: string[] = [];

        // 根据情况选择模板
        if (quality >= 100) {
            templates = GameConfig.POSITIVE_REVIEW_TEMPLATES.perfect;
            flowBonus = 30;
        } else if (isFast) {
            templates = GameConfig.POSITIVE_REVIEW_TEMPLATES.fast;
            flowBonus = 20;
        } else if (isVIP) {
            templates = GameConfig.POSITIVE_REVIEW_TEMPLATES.vip;
            flowBonus = 25;
        } else if (quality >= 90) {
            templates = GameConfig.POSITIVE_REVIEW_TEMPLATES.good;
            flowBonus = 15;
        } else {
            // 品质不够高，不给好评
            return;
        }

        content = templates[Math.floor(Math.random() * templates.length)];

        const review: ReviewData = {
            reviewId: `review_pos_${Date.now()}_${Math.random()}`,
            type: 'positive',
            content,
            customerId,
            timestamp: Date.now(),
            cause: undefined
        };

        this.reviews.push(review);
        this.positiveCount++;

        this.node.emit('review-added', review);
        this.updateCustomerSpawnRate(flowBonus);

        console.log(`[ReviewManager] ✅ 好评 ${this.positiveCount}: ${content}`);
    }

    /**
     * 消除差评（花费金币）
     * @param reviewId 差评ID
     * @param cost 消除成本
     * @returns 是否成功
     */
    removeNegativeReview(reviewId: string, cost: number): boolean {
        const gameManager = GameManager.Instance;

        if (!gameManager) {
            console.warn('[ReviewManager] GameManager未找到');
            return false;
        }

        if (gameManager.playerMoney < cost) {
            console.log('[ReviewManager] 金币不足，无法消除差评');
            return false;
        }

        // 查找差评
        const index = this.reviews.findIndex(r => r.reviewId === reviewId && r.type === 'negative');
        if (index === -1) {
            console.warn('[ReviewManager] 差评未找到:', reviewId);
            return false;
        }

        // 扣除金币
        gameManager.addMoney(-cost);

        // 移除差评
        this.reviews.splice(index, 1);
        this.negativeCount--;

        this.node.emit('review-removed', reviewId);
        this.updateCustomerSpawnRate();

        console.log(`[ReviewManager] 💰 花费${cost}金币消除了1个差评`);
        return true;
    }

    /**
     * 更新客户生成速率
     * @param tempBonus 临时加成（好评带来的短期提升）
     */
    private updateCustomerSpawnRate(tempBonus: number = 0) {
        // 基础倍率
        let speedModifier = 1.0;

        // 差评降低速率
        if (this.negativeCount >= 10) {
            speedModifier = 0.4;  // -60%
        } else if (this.negativeCount >= 6) {
            speedModifier = 0.6;  // -40%
        } else if (this.negativeCount >= 3) {
            speedModifier = 0.75; // -25%
        } else if (this.negativeCount >= 1) {
            speedModifier = 0.9;  // -10%
        }

        // 好评提升速率（临时，3秒后恢复）
        const finalModifier = speedModifier + tempBonus / 100;

        // 保存当前倍率
        this.currentSpeedModifier = speedModifier;

        // 通知CustomerManager更新
        this.node.emit('spawn-rate-changed', finalModifier);

        // 如果有临时加成，3秒后恢复
        if (tempBonus > 0) {
            this.scheduleOnce(() => {
                this.node.emit('spawn-rate-changed', speedModifier);
            }, 3);
        }

        console.log(`[ReviewManager] 客户流速: ${(finalModifier * 100).toFixed(0)}% (差评: ${this.negativeCount})`);
    }

    /**
     * 获取好评率
     * @returns 好评率百分比 (0-100)
     */
    getPositiveRate(): number {
        const total = this.positiveCount + this.negativeCount;
        return total > 0 ? (this.positiveCount / total) * 100 : 0;
    }

    /**
     * 获取所有差评
     */
    getNegativeReviews(): ReviewData[] {
        return this.reviews.filter(r => r.type === 'negative');
    }

    /**
     * 获取所有好评
     */
    getPositiveReviews(): ReviewData[] {
        return this.reviews.filter(r => r.type === 'positive');
    }

    /**
     * 获取差评数量
     */
    get negativeReviewCount(): number {
        return this.negativeCount;
    }

    /**
     * 获取好评数量
     */
    get positiveReviewCount(): number {
        return this.positiveCount;
    }

    /**
     * 获取当前速率倍率
     */
    get speedModifier(): number {
        return this.currentSpeedModifier;
    }

    /**
     * 完美订单抵消差评
     * 连续3个完美订单自动消除1个差评
     */
    private perfectOrderCount: number = 0;
    
    onPerfectOrder() {
        this.perfectOrderCount++;
        
        if (this.perfectOrderCount >= 3 && this.negativeCount > 0) {
            // 找到最早的差评并移除
            const negativeReviews = this.getNegativeReviews();
            if (negativeReviews.length > 0) {
                const oldestReview = negativeReviews[0];
                const index = this.reviews.findIndex(r => r.reviewId === oldestReview.reviewId);
                if (index !== -1) {
                    this.reviews.splice(index, 1);
                    this.negativeCount--;
                    this.node.emit('review-removed', oldestReview.reviewId);
                    this.updateCustomerSpawnRate();
                    console.log('[ReviewManager] ✨ 连续3次完美订单，自动消除1个差评！');
                }
            }
            this.perfectOrderCount = 0;
        }
    }

    /**
     * 重置完美订单计数（失误时调用）
     */
    resetPerfectOrderCount() {
        this.perfectOrderCount = 0;
    }
}

