import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Button, Vec3, tween, Sprite } from 'cc';
import { 
    RandomEventV2, EventStateV2, EventEffect, ProductionChallenge, ChainEvent,
    ActiveEffect, EventMessage, TimeSlot, DeliveryRequirement, PendingDelivery,
    getRandomEventV2, createInitialEventStateV2, getAllEventsV2
} from './RandomEventSystemV2';

const { ccclass, property } = _decorator;

/**
 * 🎲 事件管理器 V2
 * 支持制作类事件、链式事件、手机讯息系统
 */
@ccclass('EventManagerV2')
export class EventManagerV2 {
    private state: EventStateV2;
    private onMoneyChange: (amount: number) => void;
    private onHeatChange: (amount: number) => void;
    private onCustomerRateChange: (rate: number, days: number) => void;
    private onProductionStart: (challenge: ProductionChallenge) => void;
    private onMessageAdd: (message: EventMessage) => void;
    private onEffectAdd: (effect: ActiveEffect) => void;
    private onEffectRemove: (effectId: string) => void;

    constructor() {
        this.state = createInitialEventStateV2();
    }

    /**
     * 注册回调函数
     */
    public registerCallbacks(callbacks: {
        onMoneyChange?: (amount: number) => void;
        onHeatChange?: (amount: number) => void;
        onCustomerRateChange?: (rate: number, days: number) => void;
        onProductionStart?: (challenge: ProductionChallenge) => void;
        onMessageAdd?: (message: EventMessage) => void;
        onEffectAdd?: (effect: ActiveEffect) => void;
        onEffectRemove?: (effectId: string) => void;
    }) {
        if (callbacks.onMoneyChange) this.onMoneyChange = callbacks.onMoneyChange;
        if (callbacks.onHeatChange) this.onHeatChange = callbacks.onHeatChange;
        if (callbacks.onCustomerRateChange) this.onCustomerRateChange = callbacks.onCustomerRateChange;
        if (callbacks.onProductionStart) this.onProductionStart = callbacks.onProductionStart;
        if (callbacks.onMessageAdd) this.onMessageAdd = callbacks.onMessageAdd;
        if (callbacks.onEffectAdd) this.onEffectAdd = callbacks.onEffectAdd;
        if (callbacks.onEffectRemove) this.onEffectRemove = callbacks.onEffectRemove;
    }

    /**
     * 获取当前状态
     */
    public getState(): EventStateV2 {
        return this.state;
    }

    /**
     * 触发随机事件
     */
    public triggerRandomEvent(timeSlot: TimeSlot): RandomEventV2 | null {
        const event = getRandomEventV2(timeSlot, this.state.triggeredToday);
        if (!event) return null;

        this.state.currentEvent = event;
        this.state.isEventPhase = true;
        this.state.triggeredToday.push(event.id);

        // 添加初始消息
        this.addMessage(event, event.description, 'active');

        console.log(`[EventManagerV2] 🎲 触发事件: ${event.name}`);
        return event;
    }

    /**
     * 处理玩家选择
     */
    public handleChoice(choice: 'A' | 'B'): { 
        success: boolean; 
        production?: ProductionChallenge;
        delivery?: DeliveryRequirement;
        message: string;
    } {
        const event = this.state.currentEvent;
        if (!event) return { success: false, message: '没有当前事件' };

        const option = choice === 'A' ? event.optionA : event.optionB;
        const effect = option.effect;

        // 检查是否有成功率判定
        let isSuccess = true;
        if (effect.successRate !== undefined && effect.successRate < 100) {
            isSuccess = Math.random() * 100 < effect.successRate;
        }

        // 如果是制作类事件，启动制作挑战
        if (option.production) {
            this.state.productionChallenge = option.production;
            this.state.productionProgress = 0;
            if (this.onProductionStart) {
                this.onProductionStart(option.production);
            }
            
            // 更新消息状态
            this.updateMessageStatus(event.id, 'active', `制作挑战: 0/${option.production.targetCount}`);
            
            return { 
                success: true, 
                production: option.production,
                message: `开始制作挑战！目标: ${option.production.targetCount}份`
            };
        }

        // 🍜 如果是交付类事件，创建待交付任务（不立即应用金币效果）
        if (option.delivery) {
            this.state.pendingDelivery = {
                eventId: event.id,
                eventName: event.name,
                senderName: event.sender.name,
                senderIcon: event.sender.icon,
                requirement: option.delivery,
                deliveredCount: 0,
                effect: effect,
                chain: option.chain
            };
            
            // 更新消息状态
            this.updateMessageStatus(event.id, 'pending', `待交付: ${option.delivery.description}`);
            
            console.log(`[EventManagerV2] 🍜 创建交付任务: ${option.delivery.description}`);
            
            // 结束事件弹窗阶段，但保持待交付状态
            this.state.currentEvent = null;
            this.state.isEventPhase = false;
            
            return { 
                success: true, 
                delivery: option.delivery,
                message: `${option.delivery.description}，请制作食物交付！`
            };
        }

        // 应用效果
        this.applyEffect(effect, isSuccess, event);

        // 处理链式事件
        if (option.chain && isSuccess) {
            this.scheduleChainEvent(event, option.chain);
        }

        // 生成结果消息
        let resultMessage = isSuccess ? '选择成功！' : '很遗憾，失败了...';
        if (effect.money) resultMessage += ` 金币${effect.money > 0 ? '+' : ''}${effect.money}`;
        if (effect.heat) resultMessage += ` 热度${effect.heat > 0 ? '+' : ''}${effect.heat}`;

        // 更新消息状态
        this.updateMessageStatus(event.id, 'completed', resultMessage);

        // 结束事件
        this.state.currentEvent = null;
        this.state.isEventPhase = false;

        return { success: isSuccess, message: resultMessage };
    }
    
    /**
     * 🍜 检查是否有待交付任务
     */
    public hasPendingDelivery(): boolean {
        return this.state.pendingDelivery !== null;
    }
    
    /**
     * 🍜 获取待交付任务信息
     */
    public getPendingDelivery(): PendingDelivery | null {
        return this.state.pendingDelivery;
    }
    
    /**
     * 🍜 完成一次交付（制作食物后调用）
     */
    public completeDelivery(): {
        isComplete: boolean;
        message: string;
    } {
        if (!this.state.pendingDelivery) {
            return { isComplete: false, message: '没有待交付任务' };
        }
        
        const delivery = this.state.pendingDelivery;
        delivery.deliveredCount++;
        
        console.log(`[EventManagerV2] 🍜 交付进度: ${delivery.deliveredCount}/${delivery.requirement.count}`);
        
        // 检查是否完成所有交付
        if (delivery.deliveredCount >= delivery.requirement.count) {
            // 应用效果（不包括money，因为是免费送的）
            if (delivery.effect.heat && this.onHeatChange) {
                this.onHeatChange(delivery.effect.heat);
            }
            if (delivery.effect.customerRate && this.onCustomerRateChange) {
                this.onCustomerRateChange(delivery.effect.customerRate, delivery.effect.customerRateDays || 1);
            }
            
            // 处理链式事件
            if (delivery.chain) {
                this.scheduleChainEventFromDelivery(delivery);
            }
            
            // 更新消息状态
            this.updateMessageStatus(delivery.eventId, 'completed', `交付完成！感谢您的善心！`);
            
            const message = `🎉 交付完成！${delivery.senderName}很感激！`;
            
            // 清除待交付状态
            this.state.pendingDelivery = null;
            
            return { isComplete: true, message };
        }
        
        return { 
            isComplete: false, 
            message: `交付进度: ${delivery.deliveredCount}/${delivery.requirement.count}` 
        };
    }
    
    /**
     * 🍜 取消交付任务
     */
    public cancelDelivery(): void {
        if (this.state.pendingDelivery) {
            this.updateMessageStatus(this.state.pendingDelivery.eventId, 'completed', '交付已取消');
            this.state.pendingDelivery = null;
            console.log('[EventManagerV2] 🍜 交付任务已取消');
        }
    }
    
    /**
     * 🍜 从交付任务调度链式事件
     */
    private scheduleChainEventFromDelivery(delivery: PendingDelivery): void {
        if (!delivery.chain) return;
        
        const effect: ActiveEffect = {
            id: `${delivery.eventId}_chain`,
            icon: delivery.senderIcon,
            name: `${delivery.eventName} - 后续`,
            type: 'pending',
            remainingDays: delivery.chain.triggerDays,
            sourceEvent: delivery.eventName,
            pendingMoney: delivery.chain.effect.money,
            chainEvent: delivery.chain
        };
        
        this.addActiveEffect(effect);
        console.log(`[EventManagerV2] ⏰ 从交付任务调度链式事件: ${delivery.chain.triggerDays}天后触发`);
    }

    /**
     * 应用效果
     */
    private applyEffect(effect: EventEffect, isSuccess: boolean, event: RandomEventV2) {
        if (isSuccess) {
            // 成功效果
            if (effect.money && this.onMoneyChange) {
                this.onMoneyChange(effect.money);
            }
            if (effect.heat && this.onHeatChange) {
                this.onHeatChange(effect.heat);
            }
            if (effect.customerRate && this.onCustomerRateChange) {
                this.onCustomerRateChange(effect.customerRate, effect.customerRateDays || 1);
                // 添加活跃效果
                this.addActiveEffect({
                    id: `${event.id}_customer`,
                    icon: event.icon,
                    name: `${event.name} - 客流效果`,
                    type: effect.customerRate > 1 ? 'buff' : 'debuff',
                    customerRate: effect.customerRate,
                    remainingDays: effect.customerRateDays || 1,
                    sourceEvent: event.name
                });
            }
        } else {
            // 失败效果
            if (effect.failMoney && this.onMoneyChange) {
                this.onMoneyChange(effect.failMoney);
            }
            if (effect.failHeat && this.onHeatChange) {
                this.onHeatChange(effect.failHeat);
            }
        }
    }

    /**
     * 处理制作挑战进度
     */
    public updateProductionProgress(completedCount: number): {
        isComplete: boolean;
        isSuccess: boolean;
        reward?: EventEffect;
    } {
        if (!this.state.productionChallenge) {
            return { isComplete: false, isSuccess: false };
        }

        this.state.productionProgress = completedCount;
        const challenge = this.state.productionChallenge;

        // 检查是否完成
        if (completedCount >= challenge.targetCount) {
            // 成功完成
            this.applyProductionReward(challenge.successReward);
            this.state.productionChallenge = null;
            this.state.productionProgress = 0;

            if (this.state.currentEvent) {
                this.updateMessageStatus(this.state.currentEvent.id, 'completed', 
                    `制作完成！获得奖励！`);
                this.state.currentEvent = null;
                this.state.isEventPhase = false;
            }

            return { isComplete: true, isSuccess: true, reward: challenge.successReward };
        }

        return { isComplete: false, isSuccess: false };
    }

    /**
     * 制作挑战超时
     */
    public productionTimeout(): EventEffect | null {
        if (!this.state.productionChallenge) return null;

        const penalty = this.state.productionChallenge.failPenalty;
        this.applyProductionReward(penalty);
        
        if (this.state.currentEvent) {
            this.updateMessageStatus(this.state.currentEvent.id, 'completed', 
                `时间到！挑战失败...`);
            this.state.currentEvent = null;
            this.state.isEventPhase = false;
        }

        this.state.productionChallenge = null;
        this.state.productionProgress = 0;

        return penalty;
    }

    /**
     * 应用制作奖励/惩罚
     */
    private applyProductionReward(effect: EventEffect) {
        if (effect.money && this.onMoneyChange) {
            this.onMoneyChange(effect.money);
        }
        if (effect.heat && this.onHeatChange) {
            this.onHeatChange(effect.heat);
        }
        if (effect.customerRate && this.onCustomerRateChange) {
            this.onCustomerRateChange(effect.customerRate, effect.customerRateDays || 1);
        }
    }

    /**
     * 安排链式事件
     */
    private scheduleChainEvent(event: RandomEventV2, chain: ChainEvent) {
        const effectId = `${event.id}_chain_${Date.now()}`;
        
        const activeEffect: ActiveEffect = {
            id: effectId,
            icon: event.icon,
            name: `${event.name} - 待结算`,
            type: 'pending',
            remainingDays: chain.triggerDays,
            sourceEvent: event.name,
            pendingMoney: chain.effect.money,
            chainEvent: chain
        };

        this.addActiveEffect(activeEffect);

        // 添加待处理消息
        this.addMessage(event, `${chain.triggerDays}天后将有后续...`, 'pending', 
            `${chain.triggerDays}天后结算`);

        console.log(`[EventManagerV2] 🔗 链式事件已安排: ${event.name}, ${chain.triggerDays}天后触发`);
    }

    /**
     * 每日结算 - 处理持续效果和链式事件
     */
    public dailySettlement(): {
        expiredEffects: ActiveEffect[];
        triggeredChains: { event: string; effect: EventEffect; message: string }[];
    } {
        this.state.dayCount++;
        const expiredEffects: ActiveEffect[] = [];
        const triggeredChains: { event: string; effect: EventEffect; message: string }[] = [];

        // 处理所有活跃效果
        for (let i = this.state.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.state.activeEffects[i];
            effect.remainingDays--;

            if (effect.remainingDays <= 0) {
                // 检查是否是链式事件
                if (effect.chainEvent) {
                    const chain = effect.chainEvent;
                    // 触发链式事件效果
                    this.applyProductionReward(chain.effect);
                    triggeredChains.push({
                        event: effect.sourceEvent,
                        effect: chain.effect,
                        message: chain.message
                    });

                    // 添加完成消息
                    const messageEvent = getAllEventsV2().find(e => e.name === effect.sourceEvent);
                    if (messageEvent) {
                        this.addMessage(messageEvent, chain.message, 'completed');
                    }
                }

                // 移除效果
                expiredEffects.push(effect);
                this.state.activeEffects.splice(i, 1);
                if (this.onEffectRemove) {
                    this.onEffectRemove(effect.id);
                }
            }
        }

        // 重置每日触发记录
        this.state.triggeredToday = [];

        console.log(`[EventManagerV2] 📅 第${this.state.dayCount}天结算完成, ` +
            `过期效果: ${expiredEffects.length}, 触发链式: ${triggeredChains.length}`);

        return { expiredEffects, triggeredChains };
    }

    /**
     * 添加活跃效果
     */
    private addActiveEffect(effect: ActiveEffect) {
        this.state.activeEffects.push(effect);
        if (this.onEffectAdd) {
            this.onEffectAdd(effect);
        }
    }

    /**
     * 添加消息
     */
    private addMessage(event: RandomEventV2, content: string, status: 'active' | 'pending' | 'completed', effectSummary?: string) {
        const message: EventMessage = {
            eventId: event.id,
            sender: event.sender,
            day: this.state.dayCount,
            time: this.getCurrentTimeString(),
            content: content,
            status: status,
            effectSummary: effectSummary
        };

        this.state.messages.unshift(message); // 新消息在前面
        
        // 限制消息数量
        if (this.state.messages.length > 50) {
            this.state.messages = this.state.messages.slice(0, 50);
        }

        if (this.onMessageAdd) {
            this.onMessageAdd(message);
        }
    }

    /**
     * 更新消息状态
     */
    private updateMessageStatus(eventId: string, status: 'active' | 'pending' | 'completed', effectSummary?: string) {
        const message = this.state.messages.find(m => m.eventId === eventId && m.status === 'active');
        if (message) {
            message.status = status;
            if (effectSummary) {
                message.effectSummary = effectSummary;
            }
        }
    }

    /**
     * 获取当前时间字符串
     */
    private getCurrentTimeString(): string {
        const now = new Date();
        const minutes = now.getMinutes();
        const minuteStr = minutes < 10 ? '0' + minutes : '' + minutes;
        return `${now.getHours()}:${minuteStr}`;
    }

    /**
     * 获取所有消息
     */
    public getMessages(): EventMessage[] {
        return this.state.messages;
    }

    /**
     * 获取活跃效果
     */
    public getActiveEffects(): ActiveEffect[] {
        return this.state.activeEffects;
    }

    /**
     * 获取当前客流倍率
     */
    public getCurrentCustomerRate(): number {
        let rate = 1;
        for (const effect of this.state.activeEffects) {
            if (effect.customerRate) {
                rate *= effect.customerRate;
            }
        }
        return rate;
    }

    /**
     * 是否在事件阶段
     */
    public isInEventPhase(): boolean {
        return this.state.isEventPhase;
    }

    /**
     * 是否在制作挑战中
     */
    public isInProductionChallenge(): boolean {
        return this.state.productionChallenge !== null;
    }

    /**
     * 获取当前制作挑战
     */
    public getCurrentProductionChallenge(): ProductionChallenge | null {
        return this.state.productionChallenge;
    }

    /**
     * 获取制作进度
     */
    public getProductionProgress(): number {
        return this.state.productionProgress;
    }

    /**
     * 重置每日状态
     */
    public resetDailyState() {
        this.state.triggeredToday = [];
        this.state.currentEvent = null;
        this.state.pendingEvent = null;
        this.state.isEventPhase = false;
        this.state.customerClearing = false;
        this.state.productionChallenge = null;
        this.state.productionProgress = 0;
    }
}
