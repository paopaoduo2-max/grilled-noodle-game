import { _decorator, Component } from 'cc';
import { TimeManager } from '../../Manager/TimeManager';
import { DailyStats, ShopState } from './SharedTypes';

const { ccclass, property } = _decorator;

/**
 * 营业时段
 */
export enum BusinessPhase {
    CLOSED = 'closed',           // 休息中
    PREPARATION = 'preparation', // 准备阶段
    LUNCH = 'lunch',             // 午餐时段 11:00-14:00
    AFTERNOON = 'afternoon',     // 下午时段 14:00-17:00
    DINNER = 'dinner',           // 晚餐时段 17:00-21:00
    NIGHT = 'night',             // 夜宵时段 21:00-24:00
    SETTLEMENT = 'settlement'    // 结算阶段
}

/**
 * 时段配置
 */
export interface PhaseConfig {
    phase: BusinessPhase;
    startHour: number;
    endHour: number;
    customerMultiplier: number;  // 顾客倍率
    tipMultiplier: number;       // 小费倍率
}

/**
 * 🏪 营业状态管理器
 * 管理营业时间、时段切换、营业状态
 * 可被所有关卡的烹饪控制器使用
 */
@ccclass('BusinessStateManager')
export class BusinessStateManager {
    
    private static _instance: BusinessStateManager | null = null;
    
    // 营业状态
    private _isOpen: boolean = false;
    private _currentPhase: BusinessPhase = BusinessPhase.CLOSED;
    private _dayNumber: number = 1;
    
    // 时段配置
    private readonly PHASE_CONFIGS: PhaseConfig[] = [
        { phase: BusinessPhase.LUNCH, startHour: 11, endHour: 14, customerMultiplier: 1.2, tipMultiplier: 1.0 },
        { phase: BusinessPhase.AFTERNOON, startHour: 14, endHour: 17, customerMultiplier: 0.8, tipMultiplier: 1.0 },
        { phase: BusinessPhase.DINNER, startHour: 17, endHour: 21, customerMultiplier: 1.5, tipMultiplier: 1.2 },
        { phase: BusinessPhase.NIGHT, startHour: 21, endHour: 24, customerMultiplier: 1.0, tipMultiplier: 1.5 }
    ];
    
    // 事件回调
    private _onPhaseChange: ((oldPhase: BusinessPhase, newPhase: BusinessPhase) => void) | null = null;
    private _onBusinessOpen: (() => void) | null = null;
    private _onBusinessClose: (() => void) | null = null;
    
    public static get instance(): BusinessStateManager {
        if (!BusinessStateManager._instance) {
            BusinessStateManager._instance = new BusinessStateManager();
        }
        return BusinessStateManager._instance;
    }
    
    // ==================== Getters ====================
    
    public get isOpen(): boolean { return this._isOpen; }
    public get currentPhase(): BusinessPhase { return this._currentPhase; }
    public get dayNumber(): number { return this._dayNumber; }
    
    /**
     * 获取当前时段配置
     */
    public get currentPhaseConfig(): PhaseConfig | null {
        return this.PHASE_CONFIGS.find(c => c.phase === this._currentPhase) || null;
    }
    
    // ==================== 事件注册 ====================
    
    public onPhaseChange(callback: (oldPhase: BusinessPhase, newPhase: BusinessPhase) => void): void {
        this._onPhaseChange = callback;
    }
    
    public onBusinessOpen(callback: () => void): void {
        this._onBusinessOpen = callback;
    }
    
    public onBusinessClose(callback: () => void): void {
        this._onBusinessClose = callback;
    }
    
    // ==================== 营业控制 ====================
    
    /**
     * 开始营业
     */
    public openBusiness(): void {
        if (this._isOpen) return;
        
        this._isOpen = true;
        this._currentPhase = this.getPhaseByTime();
        
        console.log(`[BusinessStateManager] 🏪 开始营业 - 第${this._dayNumber}天 - ${this.getPhaseText()}`);
        
        if (this._onBusinessOpen) {
            this._onBusinessOpen();
        }
    }
    
    /**
     * 结束营业
     */
    public closeBusiness(): void {
        if (!this._isOpen) return;
        
        const oldPhase = this._currentPhase;
        this._isOpen = false;
        this._currentPhase = BusinessPhase.SETTLEMENT;
        
        console.log(`[BusinessStateManager] 🏪 结束营业 - 第${this._dayNumber}天`);
        
        if (this._onPhaseChange) {
            this._onPhaseChange(oldPhase, BusinessPhase.SETTLEMENT);
        }
        
        if (this._onBusinessClose) {
            this._onBusinessClose();
        }
    }
    
    /**
     * 进入下一天
     */
    public nextDay(): void {
        this._dayNumber++;
        this._currentPhase = BusinessPhase.PREPARATION;
        console.log(`[BusinessStateManager] 🌅 新的一天 - 第${this._dayNumber}天`);
    }
    
    // ==================== 时段管理 ====================
    
    /**
     * 更新时段（每帧调用或定时调用）
     */
    public updatePhase(): void {
        if (!this._isOpen) return;
        
        const newPhase = this.getPhaseByTime();
        
        if (newPhase !== this._currentPhase) {
            const oldPhase = this._currentPhase;
            this._currentPhase = newPhase;
            
            console.log(`[BusinessStateManager] ⏰ 时段切换: ${this.getPhaseText(oldPhase)} → ${this.getPhaseText(newPhase)}`);
            
            if (this._onPhaseChange) {
                this._onPhaseChange(oldPhase, newPhase);
            }
        }
    }
    
    /**
     * 根据当前时间获取时段
     */
    private getPhaseByTime(): BusinessPhase {
        const timeManager = TimeManager.instance;
        if (!timeManager) return BusinessPhase.LUNCH;
        
        const hour = timeManager.getCurrentHour();
        
        for (const config of this.PHASE_CONFIGS) {
            if (hour >= config.startHour && hour < config.endHour) {
                return config.phase;
            }
        }
        
        // 默认返回午餐时段
        return BusinessPhase.LUNCH;
    }
    
    /**
     * 获取时段文本
     */
    public getPhaseText(phase?: BusinessPhase): string {
        const p = phase || this._currentPhase;
        switch (p) {
            case BusinessPhase.CLOSED: return '休息中';
            case BusinessPhase.PREPARATION: return '准备阶段';
            case BusinessPhase.LUNCH: return '午餐时段';
            case BusinessPhase.AFTERNOON: return '下午时段';
            case BusinessPhase.DINNER: return '晚餐时段';
            case BusinessPhase.NIGHT: return '夜宵时段';
            case BusinessPhase.SETTLEMENT: return '结算中';
            default: return '未知';
        }
    }
    
    /**
     * 获取时段图标
     */
    public getPhaseEmoji(phase?: BusinessPhase): string {
        const p = phase || this._currentPhase;
        switch (p) {
            case BusinessPhase.CLOSED: return '🌙';
            case BusinessPhase.PREPARATION: return '🔧';
            case BusinessPhase.LUNCH: return '🍜';
            case BusinessPhase.AFTERNOON: return '☕';
            case BusinessPhase.DINNER: return '🍽️';
            case BusinessPhase.NIGHT: return '🌃';
            case BusinessPhase.SETTLEMENT: return '📊';
            default: return '❓';
        }
    }
    
    // ==================== 顾客计算 ====================
    
    /**
     * 获取当前时段的顾客倍率
     */
    public getCustomerMultiplier(): number {
        const config = this.currentPhaseConfig;
        return config ? config.customerMultiplier : 1.0;
    }
    
    /**
     * 获取当前时段的小费倍率
     */
    public getTipMultiplier(): number {
        const config = this.currentPhaseConfig;
        return config ? config.tipMultiplier : 1.0;
    }
    
    /**
     * 计算时段进度 (0-1)
     */
    public getPhaseProgress(): number {
        const config = this.currentPhaseConfig;
        if (!config) return 0;
        
        const timeManager = TimeManager.instance;
        if (!timeManager) return 0;
        
        const hour = timeManager.getCurrentHour();
        const minute = timeManager.getCurrentMinute();
        const currentMinutes = hour * 60 + minute;
        const startMinutes = config.startHour * 60;
        const endMinutes = config.endHour * 60;
        
        return Math.max(0, Math.min(1, (currentMinutes - startMinutes) / (endMinutes - startMinutes)));
    }
    
    // ==================== 重置 ====================
    
    /**
     * 重置状态
     */
    public reset(): void {
        this._isOpen = false;
        this._currentPhase = BusinessPhase.CLOSED;
        this._dayNumber = 1;
        console.log('[BusinessStateManager] 🔄 状态已重置');
    }
}
