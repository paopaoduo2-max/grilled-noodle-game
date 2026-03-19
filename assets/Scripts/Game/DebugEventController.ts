import { _decorator, Component, Node, Button, find } from 'cc';
import { TimeManager } from '../Manager/TimeManager';
import { TimeSlot } from './RandomEventSystemV2';

const { ccclass, property } = _decorator;

/**
 * 🧪 调试用事件控制器
 * 用于快速跳转到事件触发时间点
 */
@ccclass('DebugEventController')
export class DebugEventController extends Component {
    @property(Node)
    lunchBtn: Node = null;

    @property(Node)
    afternoonBtn: Node = null;

    @property(Node)
    dinnerBtn: Node = null;

    @property(Node)
    nightBtn: Node = null;

    private cookingController: any = null;
    private controllerName: string = '';

    start() {
        // 绑定按钮事件
        this.bindButton(this.lunchBtn, 13, 30, 'lunch');
        this.bindButton(this.afternoonBtn, 15, 30, 'afternoon');
        this.bindButton(this.dinnerBtn, 18, 0, 'dinner');
        this.bindButton(this.nightBtn, 20, 30, 'night');
        
        // 查找CookingControllerV2
        this.findCookingController();
        
        console.log('[DebugEventController] 🧪 调试按钮已初始化');
    }

    private findCookingController() {
        // 尝试多种路径查找
        const paths = [
            'Canvas/GameArea',
            'CookingScene/Canvas/GameArea',
            'Canvas/CookingArea',
            'Canvas'
        ];
        const componentNames = ['CookingControllerV2', 'MalaTangController'];
        
        for (const path of paths) {
            const node = find(path);
            if (node) {
                for (const name of componentNames) {
                    const ctrl = node.getComponent(name);
                    if (ctrl) {
                        this.cookingController = ctrl;
                        this.controllerName = name;
                        console.log(`[DebugEventController] 🧪 找到${name}: ${path}`);
                        return;
                    }
                }
                // 检查子节点
                for (const child of node.children) {
                    for (const name of componentNames) {
                        const ctrl2 = child.getComponent(name);
                        if (ctrl2) {
                            this.cookingController = ctrl2;
                            this.controllerName = name;
                            console.log(`[DebugEventController] 🧪 找到${name}: ${path}/${child.name}`);
                            return;
                        }
                    }
                }
            }
        }
        this.cookingController = null;
        this.controllerName = '';
        console.log('[DebugEventController] 未找到烹饪控制器');
    }

    private bindButton(btnNode: Node, hour: number, minute: number, timeSlot: TimeSlot) {
        if (!btnNode) return;
        
        btnNode.on(Node.EventType.TOUCH_END, () => {
            this.jumpToTimeAndTrigger(hour, minute, timeSlot);
        });
    }

    private jumpToTimeAndTrigger(hour: number, minute: number, timeSlot: TimeSlot) {
        const timeManager = TimeManager.instance;
        if (!timeManager) {
            console.error('[DebugEventController] TimeManager 不存在');
            return;
        }

        // 确保在营业中
        if (!timeManager.isBusinessOpen()) {
            console.log('[DebugEventController] 未营业，先启动营业');
            timeManager.forceRestart();
        }

        // 跳转到事件时间前5分钟，让玩家有时间处理顾客
        const adjustedMinute = minute > 5 ? minute - 5 : minute;
        timeManager.setTime(hour, adjustedMinute);
        
        const timeStr = `${hour}:${adjustedMinute < 10 ? '0' + adjustedMinute : adjustedMinute}`;
        console.log(`[DebugEventController] 🧪 时间跳转到 ${timeStr}（事件将在${minute}分触发）`);
        
        if (this.cookingController) {
            if (this.controllerName !== 'CookingControllerV2') {
                console.log('[DebugEventController] ⚠️ 当前关卡不支持事件调试');
                return;
            }
            // 重置事件状态，允许重新触发
            this.cookingController.eventState.triggeredToday = [];
            this.cookingController.eventState.isEventPhase = false;
            this.cookingController.eventState.customerClearing = false;
            this.cookingController.eventState.pendingEvent = null;
            this.cookingController.eventState.currentEvent = null;
            
            // 重置V2系统状态
            const eventSystemV2 = this.cookingController.eventSystemV2;
            if (eventSystemV2) {
                const manager = eventSystemV2.getEventManager();
                if (manager) {
                    manager.getState().triggeredToday = [];
                    manager.getState().isEventPhase = false;
                    manager.getState().productionChallenge = null;
                }
            }
            
            // 生成顾客
            this.scheduleOnce(() => {
                this.generateCustomers();
                console.log('[DebugEventController] 🧪 顾客已生成，等待事件触发...');
            }, 0.3);
        } else {
            this.findCookingController();
            console.log('[DebugEventController] 烹饪控制器未找到');
        }
    }
    
    private generateCustomers() {
        if (!this.cookingController) return;
        
        // 获取customers数组
        const customers = this.cookingController.customers;
        if (!customers || customers.length === 0) {
            console.log('[DebugEventController] 没有顾客数组');
            return;
        }
        
        // 生成至少1个顾客
        const maxCustomers = Math.max(1, this.cookingController.getMaxCustomersByHeat ? 
            this.cookingController.getMaxCustomersByHeat() : 1);
        
        for (let i = 0; i < Math.min(maxCustomers, customers.length); i++) {
            const customer = customers[i];
            if (customer && customer.node && !customer.node.active) {
                if (this.cookingController.spawnCustomerAt) {
                    this.cookingController.spawnCustomerAt(i);
                } else {
                    // 手动激活顾客
                    customer.node.active = true;
                }
            }
        }
        console.log(`[DebugEventController] 🧪 生成了${maxCustomers}个顾客`);
    }
}



