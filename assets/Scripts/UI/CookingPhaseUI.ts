import { _decorator, Component, Node, Label, Button, Prefab, instantiate, Color, UITransform, Sprite, ProgressBar } from 'cc';
import { GameManager } from '../Manager/GameManager';
import { CustomerManager } from '../Game/CustomerManager';
import { CookingSystem } from '../Game/CookingSystem';
import { OrderData, OrderStatus } from '../Data/GameConfig';
import { TimeManager } from '../Manager/TimeManager';
const { ccclass, property } = _decorator;

/**
 * 制作阶段UI控制器
 */
@ccclass('CookingPhaseUI')
export class CookingPhaseUI extends Component {
    @property(Node)
    orderPanel: Node = null;       // 订单面板

    @property(Node)
    cookingPanel: Node = null;     // 烹饪面板

    @property(Label)
    moneyLabel: Label = null;      // 金币显示

    @property(Label)
    timerLabel: Label = null;      // 营业时间显示

    @property(Label)
    scoreLabel: Label = null;      // 评分显示

    @property(Label)
    customerCountLabel: Label = null;  // 客户数显示

    @property(Node)
    endDayBtn: Node = null;      // 结束营业按钮

    @property(Node)
    customerManager: Node = null;  // 客户管理器节点

    @property(Node)
    cookingSystem: Node = null;    // 烹饪系统节点

    private _remainTime: number = 0;  // 剩余营业时间
    private _orderItems: Map<string, Node> = new Map();
    private _cookingItems: Map<string, Node> = new Map();
    private _initialized: boolean = false;
    private _useTimeManagerClock: boolean = false;

    private _customerManagerComp: CustomerManager = null;
    private _cookingSystemComp: CookingSystem = null;

    onLoad() {
        // 自动查找节点（如果属性没有绑定）
        if (!this.orderPanel) {
            this.orderPanel = this.node.getChildByPath('OrderPanel');
        }
        
        if (!this.cookingPanel) {
            this.cookingPanel = this.node.getChildByPath('CookingPanel');
        }
        
        if (!this.moneyLabel) {
            const labelNode = this.node.getChildByPath('TopInfoPanel/MoneyLabel');
            if (labelNode) this.moneyLabel = labelNode.getComponent(Label);
        }
        
        if (!this.timerLabel) {
            const labelNode = this.node.getChildByPath('TopInfoPanel/TimerLabel');
            if (labelNode) this.timerLabel = labelNode.getComponent(Label);
        }
        
        if (!this.scoreLabel) {
            const labelNode = this.node.getChildByPath('TopInfoPanel/ScoreLabel');
            if (labelNode) this.scoreLabel = labelNode.getComponent(Label);
        }
        
        if (!this.customerCountLabel) {
            const labelNode = this.node.getChildByPath('TopInfoPanel/CustomerCountLabel');
            if (labelNode) this.customerCountLabel = labelNode.getComponent(Label);
        }
        
        if (!this.endDayBtn) {
            this.endDayBtn = this.node.getChildByPath('EndDayBtn');
        }
        
        this.initUI();
        this.setupButtons();
    }

    start() {
        this.tryInitialize();
    }

    update(deltaTime: number) {
        if (!this._initialized) {
            this.tryInitialize();
            return;
        }

        // 更新计时器
        if (!this._useTimeManagerClock && TimeManager.instance) {
            this._useTimeManagerClock = true;
        }

        if (this._useTimeManagerClock) {
            this.updateTimerFromTimeManager();
        } else if (this._remainTime > 0) {
            this._remainTime -= deltaTime;
            if (this._remainTime <= 0) {
                this._remainTime = 0;
                this.onTimeUp();
            }
            this.updateTimer();
        }

        // 更新显示
        this.updateAllDisplays();
        this.updateOrdersDisplay();
        this.updateCookingDisplay();
    }

    /**
     * 初始化UI
     */
    private initUI() {
        console.log('[CookingPhaseUI] 初始化UI');
    }

    private tryInitialize() {
        if (this._initialized) {
            return;
        }
        const gameManager = GameManager.Instance;
        if (!gameManager || !gameManager.currentLevel) {
            return;
        }

        this._useTimeManagerClock = !!TimeManager.instance;
        this._remainTime = this._useTimeManagerClock ? 0 : gameManager.currentLevel.cookingTime;

        // 初始化客户管理器
        this.initCustomerManager();

        // 初始化烹饪系统
        this.initCookingSystem();

        this.updateAllDisplays();
        this._initialized = true;
    }

    /**
     * 设置按钮事件
     */
    private setupButtons() {
        const endDayNode = this.endDayBtn || this.node.getChildByPath('EndDayBtn');
        if (!endDayNode) {
            return;
        }

        const endDayButton = endDayNode.getComponent(Button);
        if (endDayButton) {
            endDayButton.node.on(Button.EventType.CLICK, this.onEndDay, this);
            return;
        }

        endDayNode.on(Node.EventType.TOUCH_END, this.onEndDay, this);
    }

    /**
     * 初始化客户管理器
     */
    private initCustomerManager() {
        if (!this.customerManager) {
            this.customerManager = new Node('CustomerManager');
            this.node.addChild(this.customerManager);
        }

        this._customerManagerComp = this.customerManager.getComponent(CustomerManager);
        if (!this._customerManagerComp) {
            this._customerManagerComp = this.customerManager.addComponent(CustomerManager);
        }

        const gameManager = GameManager.Instance;
        if (!gameManager || !gameManager.currentLevel) {
            console.error('[CookingPhaseUI] GameManager不存在，无法初始化客户管理器');
            return;
        }
        this._customerManagerComp.init(gameManager.currentLevel.recipes, 8, 5);  // 8秒一个客户，最多5个订单

        // 监听事件
        this.customerManager.on('customer-arrived', this.onCustomerArrived, this);
        this.customerManager.on('order-completed', this.onOrderCompletedEvent, this);
        this.customerManager.on('order-timeout', this.onOrderTimeoutEvent, this);

        console.log('[CookingPhaseUI] 客户管理器初始化完成');
    }

    /**
     * 初始化烹饪系统
     */
    private initCookingSystem() {
        if (!this.cookingSystem) {
            this.cookingSystem = new Node('CookingSystem');
            this.node.addChild(this.cookingSystem);
        }

        this._cookingSystemComp = this.cookingSystem.getComponent(CookingSystem);
        if (!this._cookingSystemComp) {
            this._cookingSystemComp = this.cookingSystem.addComponent(CookingSystem);
        }

        this._cookingSystemComp.init(3);  // 最多同时制作3份

        // 监听事件
        this.cookingSystem.on('cooking-started', this.onCookingStarted, this);
        this.cookingSystem.on('cooking-done', this.onCookingDone, this);

        console.log('[CookingPhaseUI] 烹饪系统初始化完成');
    }

    /**
     * 客户到达事件
     */
    private onCustomerArrived(order: OrderData) {
        console.log(`[CookingPhaseUI] 客户到达: ${order.customer.name}`);
        this.createOrderItem(order);
    }

    /**
     * 订单完成事件
     */
    private onOrderCompletedEvent(data: { order: OrderData, money: number, score: number }) {
        console.log(`[CookingPhaseUI] 订单完成事件: +${data.money}金币, +${data.score}评分`);
        const gameManager = GameManager.Instance;
        if (gameManager) {
            gameManager.completeOrder(data.money, data.score);
        } else {
            console.warn('[CookingPhaseUI] GameManager不存在，跳过订单完成处理');
        }
        
        // 移除订单UI
        this.removeOrderItem(data.order.orderId);
    }

    /**
     * 订单超时事件
     */
    private onOrderTimeoutEvent(order: OrderData) {
        console.log(`[CookingPhaseUI] 订单超时: ${order.customer.name}`);
        const gameManager = GameManager.Instance;
        if (gameManager) {
            gameManager.orderTimeout();
        } else {
            console.warn('[CookingPhaseUI] GameManager不存在，跳过订单超时处理');
        }
        
        // 移除订单UI
        this.removeOrderItem(order.orderId);
    }

    /**
     * 烹饪开始事件
     */
    private onCookingStarted(task: any) {
        console.log(`[CookingPhaseUI] 开始烹饪: ${task.recipe.name}`);
    }

    /**
     * 烹饪完成事件
     */
    private onCookingDone(task: any) {
        console.log(`[CookingPhaseUI] 烹饪完成: ${task.recipe.name}`);
        // 自动完成订单
        this.completeOrder(task.orderId, task.taskId);
    }

    /**
     * 创建订单项
     */
    private createOrderItem(order: OrderData): Node {
        const itemNode = new Node(`Order_${order.orderId}`);
        const transform = itemNode.addComponent(UITransform);
        transform.setContentSize(180, 150);

        // 背景
        const bgSprite = itemNode.addComponent(Sprite);
        bgSprite.color = new Color().fromHEX(order.customer.color);

        // 客户头像（用纯色圆形代替）
        const avatarNode = new Node('Avatar');
        const avatarTransform = avatarNode.addComponent(UITransform);
        avatarTransform.setContentSize(50, 50);
        const avatarSprite = avatarNode.addComponent(Sprite);
        avatarSprite.color = Color.WHITE;
        avatarNode.setPosition(0, 40, 0);
        itemNode.addChild(avatarNode);

        // 客户名称
        const nameNode = new Node('Name');
        const nameTransform = nameNode.addComponent(UITransform);
        nameTransform.setContentSize(120, 26);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = order.customer.name;
        nameLabel.fontSize = 16;
        nameLabel.color = Color.BLACK;
        nameNode.setPosition(0, 0, 0);
        itemNode.addChild(nameNode);

        // 订单菜品
        const dishNode = new Node('Dish');
        const dishTransform = dishNode.addComponent(UITransform);
        dishTransform.setContentSize(140, 28);
        const dishLabel = dishNode.addComponent(Label);
        dishLabel.string = order.recipe.name;
        dishLabel.fontSize = 18;
        dishLabel.color = new Color(100, 50, 0, 255);
        dishNode.setPosition(0, -20, 0);
        itemNode.addChild(dishNode);

        // 耐心条
        const patienceBarNode = new Node('PatienceBar');
        const patienceTransform = patienceBarNode.addComponent(UITransform);
        patienceTransform.setContentSize(150, 20);
        patienceBarNode.setPosition(0, -45, 0);
        itemNode.addChild(patienceBarNode);

        // 进度条背景
        const barBgNode = new Node('BarBg');
        const barBgTransform = barBgNode.addComponent(UITransform);
        barBgTransform.setContentSize(150, 20);
        const barBgSprite = barBgNode.addComponent(Sprite);
        barBgSprite.color = new Color(100, 100, 100, 255);
        patienceBarNode.addChild(barBgNode);

        // 进度条前景
        const barFgNode = new Node('BarFg');
        const barFgTransform = barFgNode.addComponent(UITransform);
        barFgTransform.setContentSize(150, 20);
        barFgTransform.setAnchorPoint(0, 0.5);
        const barFgSprite = barFgNode.addComponent(Sprite);
        barFgSprite.color = new Color(0, 255, 0, 255);
        barFgNode.setPosition(-75, 0, 0);
        patienceBarNode.addChild(barFgNode);

        // 开始制作按钮
        const cookBtnNode = new Node('CookBtn');
        const cookBtnTransform = cookBtnNode.addComponent(UITransform);
        cookBtnTransform.setContentSize(140, 30);
        const cookBtnSprite = cookBtnNode.addComponent(Sprite);
        cookBtnSprite.color = new Color(255, 200, 0, 255);
        const cookBtn = cookBtnNode.addComponent(Button);
        cookBtnNode.setPosition(0, -70, 0);
        
        const cookBtnLabelNode = new Node('Label');
        const cookBtnLabelTransform = cookBtnLabelNode.addComponent(UITransform);
        cookBtnLabelTransform.setContentSize(120, 24);
        const cookBtnLabel = cookBtnLabelNode.addComponent(Label);
        cookBtnLabel.string = '开始制作';
        cookBtnLabel.fontSize = 16;
        cookBtnLabel.color = Color.BLACK;
        cookBtnNode.addChild(cookBtnLabelNode);
        
        cookBtn.node.on(Button.EventType.CLICK, () => {
            this.startCooking(order.orderId, order.recipe);
        }, this);

        itemNode.addChild(cookBtnNode);

        // 添加到订单面板
        if (this.orderPanel) {
            this.orderPanel.addChild(itemNode);
        }

        this._orderItems.set(order.orderId, itemNode);
        return itemNode;
    }

    /**
     * 移除订单项
     */
    private removeOrderItem(orderId: string) {
        const itemNode = this._orderItems.get(orderId);
        if (itemNode) {
            itemNode.destroy();
            this._orderItems.delete(orderId);
        }
    }

    /**
     * 更新订单显示
     */
    private updateOrdersDisplay() {
        if (!this._customerManagerComp) return;

        const orders = this._customerManagerComp.getActiveOrders();
        for (const order of orders) {
            const itemNode = this._orderItems.get(order.orderId);
            if (itemNode) {
                // 更新耐心条
                const patienceBar = itemNode.getChildByName('PatienceBar');
                if (patienceBar) {
                    const barFg = patienceBar.getChildByName('BarFg');
                    if (barFg) {
                        const transform = barFg.getComponent(UITransform);
                        const progress = order.remainTime / order.customer.patience;
                        transform.setContentSize(150 * progress, 20);

                        // 根据剩余时间改变颜色
                        const sprite = barFg.getComponent(Sprite);
                        if (progress > 0.5) {
                            sprite.color = new Color(0, 255, 0, 255);  // 绿色
                        } else if (progress > 0.25) {
                            sprite.color = new Color(255, 255, 0, 255);  // 黄色
                        } else {
                            sprite.color = new Color(255, 0, 0, 255);  // 红色
                        }
                    }
                }
            }
        }
    }

    /**
     * 更新烹饪显示
     */
    private updateCookingDisplay() {
        if (!this._cookingSystemComp) return;

        const tasks = this._cookingSystemComp.getActiveTasks();
        // TODO: 更新烹饪进度显示
    }

    /**
     * 开始制作
     */
    private startCooking(orderId: string, recipe: any) {
        console.log(`[CookingPhaseUI] 开始制作订单: ${orderId}`);
        
        // 通知客户管理器
        this._customerManagerComp.startCooking(orderId);
        
        // 开始烹饪
        const result = this._cookingSystemComp.startCooking(orderId, recipe);
        if (result.success) {
            console.log('[CookingPhaseUI] 烹饪已开始');
            
            // 禁用按钮
            const itemNode = this._orderItems.get(orderId);
            if (itemNode) {
                const cookBtn = itemNode.getChildByName('CookBtn');
                if (cookBtn) {
                    const button = cookBtn.getComponent(Button);
                    button.interactable = false;
                    const label = cookBtn.getChildByName('Label').getComponent(Label);
                    label.string = '制作中...';
                }
            }
        } else {
            console.warn('[CookingPhaseUI] 烹饪失败:', result.message);
            // TODO: 显示错误提示
        }
    }

    /**
     * 完成订单
     */
    private completeOrder(orderId: string, taskId: string) {
        console.log(`[CookingPhaseUI] 完成订单: ${orderId}`);
        
        // 完成烹饪任务
        this._cookingSystemComp.finishTask(taskId);
        
        // 完成客户订单
        const result = this._customerManagerComp.completeOrder(orderId);
        if (result.success) {
            console.log('[CookingPhaseUI] 订单交付成功');
        }
    }

    /**
     * 更新所有显示
     */
    private updateAllDisplays() {
        const gameManager = GameManager.Instance;

        if (!gameManager) {
            console.warn('[CookingPhaseUI] GameManager不存在');
            return;
        }

        if (this.moneyLabel) {
            this.moneyLabel.string = `金币: ${gameManager.playerMoney || 0}`;
        }

        if (this.scoreLabel) {
            this.scoreLabel.string = `评分: ${gameManager.totalScore || 0}`;
        }

        if (this.customerCountLabel) {
            const level = gameManager.currentLevel;
            this.customerCountLabel.string = `客户: ${gameManager.completedCustomers}/${level.targetCustomers}`;
        }
    }

    /**
     * 更新计时器
     */
    private updateTimer() {
        if (this.timerLabel) {
            const minutes = Math.floor(this._remainTime / 60);
            const seconds = Math.floor(this._remainTime % 60);
            const secondsStr = seconds < 10 ? '0' + seconds : seconds.toString();
            this.timerLabel.string = `营业时间: ${minutes}:${secondsStr}`;
        }
    }

    private updateTimerFromTimeManager() {
        if (!this.timerLabel) return;
        const timeManager = TimeManager.instance;
        if (!timeManager) return;

        const hour = timeManager.getCurrentHour();
        const minute = timeManager.getCurrentMinute();
        const hourStr = hour < 10 ? '0' + hour : hour.toString();
        const minuteStr = minute < 10 ? '0' + minute : minute.toString();
        this.timerLabel.string = `营业时间: ${hourStr}:${minuteStr}`;
    }

    /**
     * 时间到
     */
    private onTimeUp() {
        console.log('[CookingPhaseUI] 营业时间结束');
        this.endDay();
    }

    /**
     * 结束营业
     */
    private onEndDay() {
        console.log('[CookingPhaseUI] 点击结束营业');
        this.endDay();
    }

    /**
     * 结束当天
     */
    private endDay() {
        const gameManager = GameManager.Instance;
        if (gameManager) {
            gameManager.enterResultPhase();
        } else {
            console.error('[CookingPhaseUI] GameManager不存在，无法进入结算阶段');
        }
    }

    onDestroy() {
        // 清理事件监听
        if (this.customerManager && this.customerManager.isValid) {
            this.customerManager.off('customer-arrived', this.onCustomerArrived, this);
            this.customerManager.off('order-completed', this.onOrderCompletedEvent, this);
            this.customerManager.off('order-timeout', this.onOrderTimeoutEvent, this);
        }

        if (this.cookingSystem && this.cookingSystem.isValid) {
            this.cookingSystem.off('cooking-started', this.onCookingStarted, this);
            this.cookingSystem.off('cooking-done', this.onCookingDone, this);
        }
    }
}
