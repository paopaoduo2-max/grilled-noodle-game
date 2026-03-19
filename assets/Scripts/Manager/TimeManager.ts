import { _decorator, Component, Node, Label, Color, director } from 'cc';
import { DayNightSystem } from '../Game/DayNightSystem';
const { ccclass, property } = _decorator;

/**
 * 游戏时间管理器
 * 营业时间：12:00 - 22:00（10小时）
 * 时间流速：现实1秒 = 游戏1分钟
 */
@ccclass('TimeManager')
export class TimeManager extends Component {
    @property(Label)
    timeLabel: Label = null;  // 时间显示标签

    // 营业时间设置
    private readonly OPEN_HOUR = 12;      // 开始营业：12:00（中午）
    private readonly CLOSE_HOUR = 22;     // 结束营业：22:00（晚上10点）
    private readonly GAME_MINUTE_DURATION = 1.0;  // 游戏1分钟 = 现实1秒

    // 当前游戏时间
    private currentHour: number = 12;     // 当前小时（12-20）
    private currentMinute: number = 0;    // 当前分钟（0-59）
    private timeElapsed: number = 0;      // 累计时间（秒）

    // 营业状态
    private isOpen: boolean = false;      // 是否营业中
    private isDayEnded: boolean = false;  // 一天是否结束
    private lastUpdateTime: number = 0;
    private fallbackIntervalId: number | null = null;
    private fallbackLastCheckTime: number = 0;
    private freezeTimer: number = 0;
    private lastFreezeHour: number = -1;
    private lastFreezeMinute: number = -1;

    // 事件回调
    private onDayStartCallback: (() => void) | null = null;
    private onDayEndCallback: (() => void) | null = null;
    private onTimeUpdateCallback: ((hour: number, minute: number) => void) | null = null;
    
    // 🌅 光影系统引用
    private dayNightSystem: DayNightSystem | null = null;

    // 单例
    private static _instance: TimeManager = null;
    public static get instance(): TimeManager {
        if (!TimeManager._instance) {
            const scene = director.getScene();
            if (scene) {
                const found = scene.getComponentInChildren(TimeManager);
                if (found) {
                    TimeManager._instance = found;
                }
            }
        }
        return TimeManager._instance;
    }
    onLoad() {
        const existing = TimeManager._instance;
        if (existing && existing !== this) {
            const existingScene = existing.node?.scene;
            const currentScene = this.node?.scene;
            if (existingScene && currentScene && existingScene !== currentScene) {
                console.warn('[TimeManager] 检测到跨场景实例，替换旧实例');
                if (existing.enabled) {
                    existing.enabled = false;
                }
                TimeManager._instance = this;
            } else {
                console.warn('[TimeManager] 已存在实例，销毁当前组件');
                this.destroy();
                return;
            }
        } else {
            TimeManager._instance = this;
        }
        console.log('[TimeManager] ✅ 时间管理器已初始化');
    }

    onEnable() {
        if (TimeManager._instance !== this) {
            TimeManager._instance = this;
        }
        this.ensureTimeLabel();
        this.updateTimeDisplay();
        this.lastUpdateTime = Date.now();
        this.fallbackLastCheckTime = this.lastUpdateTime;
        this.freezeTimer = 0;
        this.lastFreezeHour = this.currentHour;
        this.lastFreezeMinute = this.currentMinute;
        this.startFallbackTick();
    }

    onDisable() {
        this.stopFallbackTick();
    }

    start() {
        this.ensureTimeLabel();
        this.resetTime();
        this.updateTimeDisplay();
        
        // 🌅 查找并初始化光影系统
        this.findDayNightSystem();
        if (!this.isOpen && !this.isDayEnded) {
            this.forceRestart();
        }
        this.lastUpdateTime = Date.now();
        this.fallbackLastCheckTime = this.lastUpdateTime;
        this.freezeTimer = 0;
        this.lastFreezeHour = this.currentHour;
        this.lastFreezeMinute = this.currentMinute;
        this.startFallbackTick();
    }

    private ensureTimeLabel() {
        if (this.timeLabel && this.timeLabel.isValid && this.timeLabel instanceof Label) return;
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;
        let labelNode = canvas.getChildByName('TimeLabel');
        if (!labelNode) {
            labelNode = canvas.getChildByPath('TopInfoPanel/TimerLabel')
                || canvas.getChildByPath('BBQUI/TopInfo/TimerLabel')
                || canvas.getChildByPath('BBQUI/TopInfo/BBQTimeLabel');
        }
        if (!labelNode) return;
        const label = labelNode.getComponent(Label);
        if (!label) return;
        this.timeLabel = label;
    }
    
    /**
     * 🌅 查找光影系统
     */
    private findDayNightSystem() {
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (canvas) {
            // 在Canvas下查找DayNightSystem组件
            this.dayNightSystem = canvas.getComponentInChildren(DayNightSystem);
            if (this.dayNightSystem) {
                console.log('[TimeManager] 🌅 已找到光影系统');
                // 初始更新光影
                this.updateDayNightLighting();
            } else {
                console.log('[TimeManager] ⚠️ 未找到光影系统组件');
            }
        }
    }
    
    /**
     * 🌅 更新光影效果
     */
    private updateDayNightLighting() {
        if (this.dayNightSystem) {
            // 将时间转换为小时（支持小数）
            const hourWithMinutes = this.currentHour + this.currentMinute / 60;
            this.dayNightSystem.updateLighting(hourWithMinutes);
        }
    }

    update(deltaTime: number) {
        this.lastUpdateTime = Date.now();
        if (!this.isOpen || this.isDayEnded) {
            return;
        }

        // 累计时间
        this.timeElapsed += deltaTime;

        // 检查是否过了1游戏分钟（2秒）
        if (this.timeElapsed >= this.GAME_MINUTE_DURATION) {
            this.timeElapsed -= this.GAME_MINUTE_DURATION;
            this.advanceTime(1);  // 前进1分钟
        }
    }

    private startFallbackTick() {
        if (this.fallbackIntervalId !== null) return;
        this.fallbackIntervalId = setInterval(() => {
            const now = Date.now();
            const delta = this.fallbackLastCheckTime ? (now - this.fallbackLastCheckTime) / 1000 : 0;
            this.fallbackLastCheckTime = now;
            if (!this.isOpen || this.isDayEnded) {
                this.freezeTimer = 0;
                this.lastFreezeHour = this.currentHour;
                this.lastFreezeMinute = this.currentMinute;
                return;
            }
            if (this.currentHour === this.lastFreezeHour && this.currentMinute === this.lastFreezeMinute) {
                this.freezeTimer += delta;
                if (this.freezeTimer >= 1.2) {
                    this.freezeTimer = 0;
                    this.advanceTime(1);
                }
            } else {
                this.lastFreezeHour = this.currentHour;
                this.lastFreezeMinute = this.currentMinute;
                this.freezeTimer = 0;
            }
        }, 250) as unknown as number;
    }

    private stopFallbackTick() {
        if (this.fallbackIntervalId === null) return;
        clearInterval(this.fallbackIntervalId);
        this.fallbackIntervalId = null;
    }

    /**
     * 重置时间到开始营业时间
     */
    public resetTime() {
        this.currentHour = this.OPEN_HOUR;
        this.currentMinute = 0;
        this.timeElapsed = 0;
        this.isDayEnded = false;
        this.lastFreezeHour = this.currentHour;
        this.lastFreezeMinute = this.currentMinute;
        this.freezeTimer = 0;
        this.updateTimeDisplay();
        // 🌅 重置光影到白天状态
        this.updateDayNightLighting();
        console.log('[TimeManager] 🕐 时间已重置到 12:00');
    }

    /**
     * 开始营业
     */
    public startDay() {
        if (this.isOpen) {
            console.warn('[TimeManager] 已经在营业中');
            return;
        }

        this.resetTime();
        this.isOpen = true;
        this.isDayEnded = false;
        
        console.log('[TimeManager] 🏪 开始营业！时间：12:00 - 22:00');
        console.log(`[TimeManager] 回调函数存在: ${!!this.onDayStartCallback}`);
        
        if (this.onDayStartCallback) {
            console.log('[TimeManager] 🔔 触发营业开始回调');
            this.onDayStartCallback();
        } else {
            console.error('[TimeManager] ❌ 营业开始回调未注册！');
        }
    }

    /**
     * 结束营业（私有）
     */
    private endDay() {
        if (!this.isOpen || this.isDayEnded) {
            return;
        }

        this.isOpen = false;
        this.isDayEnded = true;

        console.log('[TimeManager] 🌙 营业结束！今天辛苦了');
        
        if (this.onDayEndCallback) {
            this.onDayEndCallback();
        }
    }

    /**
     * 手动结束营业（公开方法，用于提前结束）
     */
    public forceEndDay() {
        if (this.isDayEnded) {
            console.warn('[TimeManager] 已经结束营业了');
            return;
        }

        console.log('[TimeManager] 🌙 提前结束营业！');
        this.endDay();
    }

    /**
     * 前进时间
     * @param minutes 前进的分钟数
     */
    private advanceTime(minutes: number) {
        this.currentMinute += minutes;

        // 处理分钟进位
        while (this.currentMinute >= 60) {
            this.currentMinute -= 60;
            this.currentHour++;
        }

        // 检查是否到达营业结束时间
        if (this.currentHour >= this.CLOSE_HOUR) {
            this.currentHour = this.CLOSE_HOUR;
            this.currentMinute = 0;
            this.endDay();
        }

        this.updateTimeDisplay();
        
        // 🌅 更新光影效果
        this.updateDayNightLighting();

        // 触发时间更新回调
        if (this.onTimeUpdateCallback) {
            this.onTimeUpdateCallback(this.currentHour, this.currentMinute);
        }
    }

    /**
     * 更新时间显示
     */
    private updateTimeDisplay() {
        if (!this.timeLabel) {
            return;
        }

        const hourStr = this.padZero(this.currentHour, 2);
        const minuteStr = this.padZero(this.currentMinute, 2);
        this.timeLabel.string = `🕐 ${hourStr}:${minuteStr}`;

        // 根据时间段改变颜色
        if (this.currentHour >= 18) {
            // 18:00之后，橙色（快结束了）
            this.timeLabel.color = new Color(255, 165, 0, 255);
        } else if (this.currentHour >= 15) {
            // 15:00-18:00，黄色（下午）
            this.timeLabel.color = new Color(255, 255, 0, 255);
        } else {
            // 12:00-15:00，白色（正常）
            this.timeLabel.color = new Color(255, 255, 255, 255);
        }
    }

    /**
     * 补零辅助函数
     */
    private padZero(num: number, length: number): string {
        let str = num.toString();
        while (str.length < length) {
            str = '0' + str;
        }
        return str;
    }

    /**
     * 获取当前游戏时间（小时）
     */
    public getCurrentHour(): number {
        return this.currentHour;
    }

    /**
     * 获取当前游戏时间（分钟）
     */
    public getCurrentMinute(): number {
        return this.currentMinute;
    }

    /**
     * 获取当前时间字符串
     */
    public getTimeString(): string {
        const hourStr = this.padZero(this.currentHour, 2);
        const minuteStr = this.padZero(this.currentMinute, 2);
        return `${hourStr}:${minuteStr}`;
    }

    /**
     * 检查是否在营业中
     */
    public isBusinessOpen(): boolean {
        return this.isOpen && !this.isDayEnded;
    }

    /**
     * 检查一天是否结束
     */
    public isDayOver(): boolean {
        return this.isDayEnded;
    }

    /**
     * 获取剩余营业时间（分钟）
     */
    public getRemainingMinutes(): number {
        if (!this.isOpen || this.isDayEnded) {
            return 0;
        }
        
        const currentTotalMinutes = this.currentHour * 60 + this.currentMinute;
        const closeTotalMinutes = this.CLOSE_HOUR * 60;
        return closeTotalMinutes - currentTotalMinutes;
    }

    /**
     * 获取营业进度（0-1）
     */
    public getBusinessProgress(): number {
        const totalMinutes = (this.CLOSE_HOUR - this.OPEN_HOUR) * 60;  // 480分钟
        const elapsedMinutes = (this.currentHour - this.OPEN_HOUR) * 60 + this.currentMinute;
        return Math.min(1, elapsedMinutes / totalMinutes);
    }

    /**
     * 注册一天开始回调
     */
    public onDayStart(callback: () => void) {
        this.onDayStartCallback = callback;
    }

    /**
     * 注册一天结束回调
     */
    public onDayEnd(callback: () => void) {
        this.onDayEndCallback = callback;
    }

    /**
     * 注册时间更新回调
     */
    public onTimeUpdate(callback: (hour: number, minute: number) => void) {
        this.onTimeUpdateCallback = callback;
    }

    /**
     * 暂停时间
     */
    public pauseTime() {
        this.isOpen = false;
        console.log('[TimeManager] ⏸️ 时间已暂停');
    }

    /**
     * 恢复时间
     */
    public resumeTime() {
        if (!this.isDayEnded) {
            this.isOpen = true;
            console.log('[TimeManager] ▶️ 时间已恢复');
        } else {
            console.log('[TimeManager] ⚠️ 一天已结束，请使用forceRestart重启');
        }
    }
    
    /**
     * 🔥 强制重启营业（用于恢复操作）
     * 重置时间和状态，无论当前是什么状态
     */
    public forceRestart() {
        console.log('[TimeManager] 🔄 强制重启营业...');
        this.resetTime();
        this.isOpen = true;
        this.isDayEnded = false;
        this.updateTimeDisplay();
        console.log('[TimeManager] ✅ 营业已重启，时间重置为12:00');
        
        // 触发回调
        if (this.onDayStartCallback) {
            this.onDayStartCallback();
        }
    }

    /**
     * 🧪 调试用：直接设置时间（跳转到指定时间）
     * @param hour 目标小时 (12-20)
     * @param minute 目标分钟 (0-59)
     */
    public setTime(hour: number, minute: number) {
        // 确保时间在有效范围内
        hour = Math.max(this.OPEN_HOUR, Math.min(this.CLOSE_HOUR, hour));
        minute = Math.max(0, Math.min(59, minute));

        // 如果设置为关门时间，直接结束
        if (hour >= this.CLOSE_HOUR) {
            hour = this.CLOSE_HOUR;
            minute = 0;
        }

        this.currentHour = hour;
        this.currentMinute = minute;
        this.timeElapsed = 0;

        console.log(`[TimeManager] 🧪 调试：时间跳转到 ${this.padZero(hour, 2)}:${this.padZero(minute, 2)}`);
        
        this.updateTimeDisplay();
        
        // 🌅 更新光影效果
        this.updateDayNightLighting();

        // 触发时间更新回调
        if (this.onTimeUpdateCallback) {
            this.onTimeUpdateCallback(this.currentHour, this.currentMinute);
        }
    }

    onDestroy() {
        this.stopFallbackTick();
        if (TimeManager._instance === this) {
            TimeManager._instance = null;
        }
    }
}





