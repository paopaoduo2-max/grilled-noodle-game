import { _decorator, Component, find } from 'cc';
import { CustomerData, CustomerType, OrderData, OrderStatus, RecipeData, GameConfig } from '../Data/GameConfig';
import { TutorialManager } from '../Tutorial/TutorialManager';
import { CustomerCharacterManager } from './CustomerCharacter';
import { CustomerMood } from './CookingControllerV2';
const { ccclass, property } = _decorator;

/**
 * 客户管理器
 * 负责生成客户、管理订单队列等
 */
@ccclass('CustomerManager')
export class CustomerManager extends Component {
    private _activeOrders: OrderData[] = [];        // 当前活跃订单
    private _customerIdCounter: number = 0;         // 客户ID计数器
    private _orderIdCounter: number = 0;            // 订单ID计数器
    
    private _spawnInterval: number = 5;             // 生成客户间隔（秒）
    private _currentTime: number = 0;               // 当前时间
    private _lastSpawnTime: number = 0;             // 上次生成时间

    private _recipes: RecipeData[] = [];            // 可用菜谱
    private _maxOrders: number = 5;                 // 最大同时订单数
    private _tutorialManager: TutorialManager = null; // 教程管理器引用

    /**
     * 初始化客户管理器
     */
    public init(recipes: RecipeData[], spawnInterval: number = 5, maxOrders: number = 5) {
        this._recipes = recipes;
        this._spawnInterval = spawnInterval;
        this._maxOrders = maxOrders;
        this._activeOrders = [];
        this._currentTime = 0;
        this._lastSpawnTime = 0;
        console.log('[CustomerManager] 初始化完成');
    }

    start() {
        // 查找教程管理器
        this.findTutorialManager();
    }
    
    private findTutorialManager() {
        let tutorialPanel = find('Canvas/TutorialPanel');
        if (!tutorialPanel) {
            tutorialPanel = find('CookingScene/Canvas/TutorialPanel');
        }
        if (tutorialPanel) {
            this._tutorialManager = tutorialPanel.getComponent(TutorialManager);
        }
    }
    
    /**
     * 更新（每帧调用）
     * 🔥 只禁用顾客生成，保留订单更新功能
     */
    update(deltaTime: number) {
        // 教程模式下不生成顾客
        if (this._tutorialManager && this._tutorialManager.isInTutorial()) {
            return;
        }
        
        this._currentTime += deltaTime;

        // 更新订单剩余时间（保留此功能）
        this.updateOrders(deltaTime);

        // 🔥 禁用顾客生成，使用 CookingControllerV2 的顾客系统
        // if (this._currentTime - this._lastSpawnTime >= this._spawnInterval) {
        //     if (this._activeOrders.length < this._maxOrders) {
        //         this.spawnCustomer();
        //         this._lastSpawnTime = this._currentTime;
        //     }
        // }
    }

    /**
     * 更新订单
     */
    private updateOrders(deltaTime: number) {
        for (let i = this._activeOrders.length - 1; i >= 0; i--) {
            const order = this._activeOrders[i];
            
            if (order.status === OrderStatus.WAITING || order.status === OrderStatus.COOKING) {
                order.remainTime -= deltaTime;

                // 订单超时
                if (order.remainTime <= 0) {
                    order.status = OrderStatus.TIMEOUT;
                    this.onOrderTimeout(order);
                    this._activeOrders.splice(i, 1);
                }
            }
        }
    }

    /**
     * 生成客户
     */
    private spawnCustomer() {
        const customer = this.generateCustomer();
        const recipe = this.getRandomRecipe();
        
        if (!recipe) {
            console.error('[CustomerManager] 没有可用的菜谱');
            return;
        }

        const order: OrderData = {
            orderId: `order_${this._orderIdCounter++}`,
            customer: customer,
            recipe: recipe,
            status: OrderStatus.WAITING,
            remainTime: customer.patience,
            startTime: this._currentTime
        };

        this._activeOrders.push(order);
        console.log(`[CustomerManager] 新客户: ${customer.name}, 订单: ${recipe.name}, 耐心: ${customer.patience}秒`);
        
        // 触发UI更新事件
        this.node.emit('customer-arrived', order);
    }

    /**
     * 生成客户数据
     */
    private generateCustomer(): CustomerData {
        // 使用角色管理器获取随机角色类型
        const characterManager = CustomerCharacterManager.getInstance();
        const characterType = characterManager.getRandomAvailableCharacter();
        
        if (!characterType) {
            console.warn('[CustomerManager] 没有可用的角色类型');
            // 返回默认客户
            return {
                id: `customer_${this._customerIdCounter++}`,
                name: '默认顾客',
                type: CustomerType.NORMAL,
                patience: 60,
                orderRecipe: '',
                tip: 0,
                avatar: '',
                color: '#ffffff'
            };
        }
        
        // 激活角色类型
        characterManager.activateCharacterType(characterType);
        
        // 获取角色配置
        const characterConfig = characterManager.getCharacterConfig(characterType);
        
        // 随机名字
        const name = GameConfig.CUSTOMER_NAMES[
            Math.floor(Math.random() * GameConfig.CUSTOMER_NAMES.length)
        ];

        const customer: CustomerData = {
            id: `customer_${this._customerIdCounter++}`,
            name: name || characterConfig?.name || '顾客',
            type: CustomerType.NORMAL, // 保持原有类型系统
            patience: 60, // 默认耐心值
            orderRecipe: '',
            tip: 0,
            avatar: '',
            color: '#ffffff',
            // 添加角色系统相关字段
            characterType: characterType,
            mood: CustomerMood.WAITING
        };

        return customer;
    }

    /**
     * 权重随机
     */
    private weightedRandom<T>(items: T[], weights: number[]): T {
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < items.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return items[i];
            }
        }
        
        return items[0];
    }

    /**
     * 获取随机菜谱
     */
    private getRandomRecipe(): RecipeData | null {
        if (this._recipes.length === 0) return null;
        return this._recipes[Math.floor(Math.random() * this._recipes.length)];
    }

    /**
     * 开始制作订单
     */
    public startCooking(orderId: string): boolean {
        const order = this._activeOrders.find(o => o.orderId === orderId);
        if (!order) {
            console.error('[CustomerManager] 订单不存在:', orderId);
            return false;
        }

        if (order.status !== OrderStatus.WAITING) {
            console.warn('[CustomerManager] 订单状态不正确:', order.status);
            return false;
        }

        order.status = OrderStatus.COOKING;
        console.log(`[CustomerManager] 开始制作订单: ${orderId}`);
        return true;
    }

    /**
     * 完成订单
     */
    public completeOrder(orderId: string): { success: boolean, money: number, score: number } {
        const orderIndex = this._activeOrders.findIndex(o => o.orderId === orderId);
        if (orderIndex === -1) {
            console.error('[CustomerManager] 订单不存在:', orderId);
            return { success: false, money: 0, score: 0 };
        }

        const order = this._activeOrders[orderIndex];
        order.status = OrderStatus.COMPLETED;

        // 计算收益和评分
        const basePrice = order.recipe.price;
        const tipRate = GameConfig.CUSTOMER_TYPES[order.customer.type].tipRate;
        
        // 根据剩余时间计算小费倍率
        const timeRate = Math.max(0.5, order.remainTime / order.customer.patience);
        const totalMoney = Math.floor(basePrice * tipRate * timeRate);
        
        const score = Math.floor(order.recipe.score * timeRate);

        console.log(`[CustomerManager] 订单完成: ${orderId}, 收益: ${totalMoney}, 评分: ${score}`);
        
        // 从订单列表移除
        this._activeOrders.splice(orderIndex, 1);
        
        // 触发UI更新事件
        this.node.emit('order-completed', { order, money: totalMoney, score });

        return { success: true, money: totalMoney, score };
    }

    /**
     * 订单超时
     */
    private onOrderTimeout(order: OrderData) {
        console.log(`[CustomerManager] 订单超时: ${order.orderId}, 客户: ${order.customer.name}`);
        // 触发UI更新事件
        this.node.emit('order-timeout', order);
    }

    /**
     * 获取活跃订单列表
     */
    public getActiveOrders(): OrderData[] {
        return [...this._activeOrders];
    }

    /**
     * 清空所有订单
     */
    public clearAllOrders() {
        this._activeOrders = [];
        this._currentTime = 0;
        this._lastSpawnTime = 0;
    }
}

