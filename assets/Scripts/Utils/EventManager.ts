/**
 * 事件管理器
 * 实现观察者模式，用于游戏内事件的解耦通信
 */
export class EventManager {
    private static _instance: EventManager = null;
    
    // 事件监听器映射
    private _listeners: Map<string, Set<Function>> = new Map();

    public static get Instance(): EventManager {
        if (!this._instance) {
            this._instance = new EventManager();
        }
        return this._instance;
    }

    /**
     * 注册事件监听器
     * @param event 事件名称
     * @param callback 回调函数
     */
    public on(event: string, callback: Function): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
    }

    /**
     * 注册一次性事件监听器
     */
    public once(event: string, callback: Function): void {
        const wrapper = (...args: any[]) => {
            callback(...args);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    /**
     * 移除事件监听器
     */
    public off(event: string, callback: Function): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.delete(callback);
        }
    }

    /**
     * 触发事件
     */
    public emit(event: string, ...args: any[]): void {
        const listeners = this._listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(...args);
                } catch (err) {
                    console.error(`[EventManager] 事件处理出错: ${event}`, err);
                }
            });
        }
    }

    /**
     * 移除某事件的所有监听器
     */
    public offAll(event: string): void {
        this._listeners.delete(event);
    }

    /**
     * 清除所有事件监听器
     */
    public clear(): void {
        this._listeners.clear();
    }
}

// ==================== 事件名称常量 ====================
export const GameEvents = {
    // 游戏流程
    GAME_START: 'game:start',
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    GAME_OVER: 'game:over',
    
    // 阶段切换
    PHASE_PREPARE: 'phase:prepare',
    PHASE_COOKING: 'phase:cooking',
    PHASE_RESULT: 'phase:result',
    
    // 订单相关
    ORDER_NEW: 'order:new',
    ORDER_COMPLETE: 'order:complete',
    ORDER_TIMEOUT: 'order:timeout',
    ORDER_CANCEL: 'order:cancel',
    
    // 烹饪操作
    INGREDIENT_ADD: 'cooking:ingredient_add',
    INGREDIENT_REMOVE: 'cooking:ingredient_remove',
    STEP_COMPLETE: 'cooking:step_complete',
    DISH_COMPLETE: 'cooking:dish_complete',
    DISH_BURN: 'cooking:dish_burn',
    
    // 客户相关
    CUSTOMER_ARRIVE: 'customer:arrive',
    CUSTOMER_LEAVE: 'customer:leave',
    CUSTOMER_SATISFIED: 'customer:satisfied',
    CUSTOMER_ANGRY: 'customer:angry',
    
    // 资源变化
    MONEY_CHANGE: 'resource:money_change',
    INGREDIENT_CHANGE: 'resource:ingredient_change',
    SCORE_CHANGE: 'resource:score_change',
    
    // UI 事件
    UI_SHOW_MESSAGE: 'ui:show_message',
    UI_SHOW_POPUP: 'ui:show_popup',
    UI_HIDE_POPUP: 'ui:hide_popup',
    
    // 设置
    SETTINGS_CHANGE: 'settings:change',
    LANGUAGE_CHANGE: 'settings:language_change',
};
