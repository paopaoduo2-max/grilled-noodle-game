import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Vec3, tween, Button, ScrollView, find, UIOpacity } from 'cc';
import { EventManagerV2 } from './EventManagerV2';
import { ProductionChallengeUI } from './ProductionChallengeUI';
import { PhoneMessageUI } from './PhoneMessageUI';
import { StatusIconUI } from './StatusIconUI';
import { 
    RandomEventV2, TimeSlot, ProductionChallenge, ActiveEffect, EventMessage, EventEffect, EventOptionV2,
    getRandomEventV2 
} from './RandomEventSystemV2';
import { 
    EVENT_TRIGGER_TIMES, PRODUCTION_CONFIG, EVENT_POPUP_CONFIG, 
    getAdjustedProductionTime, getAdjustedMoneyEffect, getAdjustedHeatEffect,
    formatTime, UI_TEXTS
} from './EventConfig';

const { ccclass, property } = _decorator;

/**
 * 🎲 事件系统集成组件
 * 负责将新事件系统集成到游戏中
 */
@ccclass('EventSystemIntegration')
export class EventSystemIntegration extends Component {
    private static globalSuppressed: boolean = false;
    private static globalInstance: EventSystemIntegration | null = null;

    public static setGlobalSuppressed(suppressed: boolean) {
        EventSystemIntegration.globalSuppressed = suppressed;
        if (EventSystemIntegration.globalInstance) {
            EventSystemIntegration.globalInstance.applySuppressedState(suppressed);
        }
    }

    public static isGlobalSuppressed(): boolean {
        return EventSystemIntegration.globalSuppressed;
    }

    // 事件管理器
    private eventManager: EventManagerV2 = null;
    
    // UI组件
    private productionUI: ProductionChallengeUI = null;
    private messageUI: PhoneMessageUI = null;
    private statusIconUI: StatusIconUI = null;
    
    // 事件弹窗
    private eventPopupNode: Node = null;
    private popupTitleLabel: Label = null;
    private popupDescLabel: Label = null;
    private popupSenderLabel: Label = null;
    private optionABtn: Node = null;
    private optionBBtn: Node = null;
    private optionALabel: Label = null;
    private optionBLabel: Label = null;
    
    // 回调函数
    private onMoneyChange: (amount: number) => void = null;
    private onHeatChange: (amount: number) => void = null;
    private onCustomerRateChange: (rate: number, days: number) => void = null;
    private onEventStart: () => void = null;
    private onEventEnd: () => void = null;
    private onProductionComplete: (count: number) => void = null;
    private onMessageSend: (sender: string, icon: string, content: string, eventId: string) => void = null;
    private onProductionChallengeStart: (targetCount: number, senderName: string, senderIcon: string) => void = null;
    private onProductionChallengeEnd: () => void = null;
    
    // 状态
    private isInitialized: boolean = false;
    private currentCustomerRateMultiplier: number = 1;
    private customerRateDaysRemaining: number = 0;
    
    // 制作挑战计数
    private productionCompletedCount: number = 0;

    onLoad() {
        EventSystemIntegration.globalInstance = this;
    }

    onDestroy() {
        if (EventSystemIntegration.globalInstance === this) {
            EventSystemIntegration.globalInstance = null;
        }
    }

    /**
     * 初始化事件系统
     */
    public initialize(canvas: Node, callbacks: {
        onMoneyChange: (amount: number) => void;
        onHeatChange: (amount: number) => void;
        onCustomerRateChange?: (rate: number, days: number) => void;
        onEventStart?: () => void;
        onEventEnd?: () => void;
        onMessageSend?: (sender: string, icon: string, content: string, eventId: string) => void;
        onProductionChallengeStart?: (targetCount: number, senderName: string, senderIcon: string) => void;
        onProductionChallengeEnd?: () => void;
    }) {
        console.log(`[EventSystemIntegration] 🚀 initialize called, canvas: ${canvas?.name}, isInitialized: ${this.isInitialized}`);
        if (this.isInitialized) {
            console.log('[EventSystemIntegration] ⚠️ 已经初始化过，跳过');
            return;
        }

        // 保存回调
        this.onMoneyChange = callbacks.onMoneyChange;
        this.onHeatChange = callbacks.onHeatChange;
        this.onCustomerRateChange = callbacks.onCustomerRateChange;
        this.onEventStart = callbacks.onEventStart;
        this.onEventEnd = callbacks.onEventEnd;
        this.onMessageSend = callbacks.onMessageSend;
        this.onProductionChallengeStart = callbacks.onProductionChallengeStart;
        this.onProductionChallengeEnd = callbacks.onProductionChallengeEnd;

        // 创建事件管理器
        this.eventManager = new EventManagerV2();
        this.eventManager.registerCallbacks({
            onMoneyChange: (amount) => this.handleMoneyChange(amount),
            onHeatChange: (amount) => this.handleHeatChange(amount),
            onCustomerRateChange: (rate, days) => this.handleCustomerRateChange(rate, days),
            onProductionStart: (challenge) => this.handleProductionStart(challenge),
            onMessageAdd: (message) => this.handleMessageAdd(message),
            onEffectAdd: (effect) => this.handleEffectAdd(effect),
            onEffectRemove: (effectId) => this.handleEffectRemove(effectId)
        });

        // 创建UI组件
        this.createEventPopup(canvas);
        this.createProductionUI(canvas);
        this.createStatusIconUI(canvas);

        this.isInitialized = true;
        if (EventSystemIntegration.globalSuppressed) {
            this.applySuppressedState(true);
        }
        console.log('[EventSystemIntegration] ✅ 事件系统已初始化');
    }

    /**
     * 创建事件弹窗
     */
    private createEventPopup(canvas: Node) {
        const config = EVENT_POPUP_CONFIG;
        
        // 主弹窗节点
        this.eventPopupNode = new Node('EventPopupV2');
        canvas.addChild(this.eventPopupNode);
        
        // 确保在最顶层显示
        this.eventPopupNode.setSiblingIndex(9999);
        
        // 设置层级为UI_2D (Cocos Creator的默认UI层)
        this.eventPopupNode.layer = 1 << 25;  // UI_2D layer
        
        const transform = this.eventPopupNode.addComponent(UITransform);
        transform.setContentSize(config.WIDTH, config.HEIGHT);
        this.eventPopupNode.setPosition(0, 50, 0);  // 稍微向上移动
        
        console.log(`[EventSystemIntegration] 📦 事件弹窗已创建，父节点: ${canvas.name}, layer: ${this.eventPopupNode.layer}`);

        // 半透明遮罩
        const maskNode = new Node('Mask');
        this.eventPopupNode.addChild(maskNode);
        maskNode.setPosition(0, 0, 0);
        const maskTransform = maskNode.addComponent(UITransform);
        maskTransform.setContentSize(1200, 800);
        const maskGraphics = maskNode.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 150);
        maskGraphics.rect(-600, -400, 1200, 800);
        maskGraphics.fill();

        // 弹窗背景
        const bgNode = new Node('Background');
        this.eventPopupNode.addChild(bgNode);
        const bgGraphics = bgNode.addComponent(Graphics);
        bgGraphics.fillColor = new Color(config.BG_COLOR.r, config.BG_COLOR.g, config.BG_COLOR.b, config.BG_COLOR.a);
        bgGraphics.roundRect(-config.WIDTH/2, -config.HEIGHT/2, config.WIDTH, config.HEIGHT, 12);
        bgGraphics.fill();
        bgGraphics.strokeColor = new Color(config.BORDER_COLOR.r, config.BORDER_COLOR.g, config.BORDER_COLOR.b, config.BORDER_COLOR.a);
        bgGraphics.lineWidth = 3;
        bgGraphics.roundRect(-config.WIDTH/2, -config.HEIGHT/2, config.WIDTH, config.HEIGHT, 12);
        bgGraphics.stroke();

        // 发送人信息
        const senderNode = new Node('Sender');
        this.eventPopupNode.addChild(senderNode);
        senderNode.setPosition(0, 100, 0);
        this.popupSenderLabel = senderNode.addComponent(Label);
        this.popupSenderLabel.string = '📱 小红 (美食博主)';
        this.popupSenderLabel.fontSize = 14;
        this.popupSenderLabel.color = new Color(180, 180, 200, 255);

        // 标题
        const titleNode = new Node('Title');
        this.eventPopupNode.addChild(titleNode);
        titleNode.setPosition(0, 65, 0);
        this.popupTitleLabel = titleNode.addComponent(Label);
        this.popupTitleLabel.string = '🎲 事件标题';
        this.popupTitleLabel.fontSize = config.TITLE_FONT_SIZE;
        this.popupTitleLabel.color = new Color(255, 220, 100, 255);

        // 描述
        const descNode = new Node('Description');
        this.eventPopupNode.addChild(descNode);
        descNode.setPosition(0, 15, 0);
        const descTransform = descNode.addComponent(UITransform);
        descTransform.setContentSize(config.WIDTH - 40, 60);
        this.popupDescLabel = descNode.addComponent(Label);
        this.popupDescLabel.string = '事件描述文字';
        this.popupDescLabel.fontSize = config.DESCRIPTION_FONT_SIZE;
        this.popupDescLabel.color = new Color(220, 220, 230, 255);
        this.popupDescLabel.overflow = Label.Overflow.CLAMP;

        // 选项A按钮
        this.optionABtn = this.createOptionButton('OptionA', -90, -70, new Color(80, 160, 80, 255));
        this.eventPopupNode.addChild(this.optionABtn);
        this.optionALabel = this.optionABtn.getChildByName('Label').getComponent(Label);

        // 选项B按钮
        this.optionBBtn = this.createOptionButton('OptionB', 90, -70, new Color(160, 80, 80, 255));
        this.eventPopupNode.addChild(this.optionBBtn);
        this.optionBLabel = this.optionBBtn.getChildByName('Label').getComponent(Label);

        // 绑定点击事件
        this.optionABtn.on(Node.EventType.TOUCH_END, () => this.handleOptionChoice('A'));
        this.optionBBtn.on(Node.EventType.TOUCH_END, () => this.handleOptionChoice('B'));

        // 默认隐藏
        this.eventPopupNode.active = false;
    }

    /**
     * 创建选项按钮
     */
    private createOptionButton(name: string, x: number, y: number, color: Color): Node {
        const config = EVENT_POPUP_CONFIG;
        
        const btn = new Node(name);
        btn.setPosition(x, y, 0);
        
        const transform = btn.addComponent(UITransform);
        transform.setContentSize(config.BUTTON_WIDTH, config.BUTTON_HEIGHT);

        const graphics = btn.addComponent(Graphics);
        graphics.fillColor = color;
        graphics.roundRect(-config.BUTTON_WIDTH/2, -config.BUTTON_HEIGHT/2, config.BUTTON_WIDTH, config.BUTTON_HEIGHT, 8);
        graphics.fill();

        const labelNode = new Node('Label');
        btn.addChild(labelNode);
        const label = labelNode.addComponent(Label);
        label.string = '选项';
        label.fontSize = config.BUTTON_FONT_SIZE;
        label.color = new Color(255, 255, 255, 255);

        btn.addComponent(Button);

        return btn;
    }

    /**
     * 创建制作挑战UI
     */
    private createProductionUI(canvas: Node) {
        const uiNode = new Node('ProductionChallengeUI');
        canvas.addChild(uiNode);
        this.productionUI = uiNode.addComponent(ProductionChallengeUI);
        this.productionUI.createUI(canvas);
    }

    /**
     * 创建状态图标UI
     */
    private createStatusIconUI(canvas: Node) {
        const uiNode = new Node('StatusIconUI');
        canvas.addChild(uiNode);
        this.statusIconUI = uiNode.addComponent(StatusIconUI);
        
        // 获取Canvas尺寸用于定位
        const canvasTransform = canvas.getComponent(UITransform);
        const width = canvasTransform ? canvasTransform.width : 960;
        const height = canvasTransform ? canvasTransform.height : 640;
        
        this.statusIconUI.createUI(canvas, new Vec3(width/2 - 20, height/2 - 60, 0));
    }

    /**
     * 初始化手机讯息UI（需要在手机面板创建后调用）
     */
    public initializeMessageUI(messageScrollContent: Node) {
        if (!this.messageUI) {
            const uiNode = new Node('PhoneMessageUI');
            messageScrollContent.addChild(uiNode);
            this.messageUI = uiNode.addComponent(PhoneMessageUI);
        }
        this.messageUI.createMessageList(messageScrollContent);
        
        // 加载已有消息
        if (this.eventManager) {
            const messages = this.eventManager.getMessages();
            this.messageUI.setMessages(messages);
        }
        
        console.log('[EventSystemIntegration] 📱 手机讯息UI已初始化');
    }

    /**
     * 检查事件触发
     */
    public checkEventTrigger(hour: number, minute: number): boolean {
        if (EventSystemIntegration.globalSuppressed) return false;
        if (!this.eventManager) return false;
        
        // 已经在事件阶段
        if (this.eventManager.isInEventPhase() || this.eventManager.isInProductionChallenge()) {
            return false;
        }

        const currentTime = hour + minute / 60;
        const times = EVENT_TRIGGER_TIMES;

        // 检查各个时段
        const triggers = [
            { time: times.LUNCH.hour + times.LUNCH.minute / 60, slot: 'lunch' as TimeSlot },
            { time: times.AFTERNOON.hour + times.AFTERNOON.minute / 60, slot: 'afternoon' as TimeSlot },
            { time: times.DINNER.hour + times.DINNER.minute / 60, slot: 'dinner' as TimeSlot },
            { time: times.NIGHT.hour + times.NIGHT.minute / 60, slot: 'night' as TimeSlot }
        ];

        for (const trigger of triggers) {
            // 在触发时间的5分钟内
            if (currentTime >= trigger.time && currentTime < trigger.time + 0.1) {
                const triggerId = `time_${trigger.slot}`;
                const state = this.eventManager.getState();
                
                if (state.triggeredToday.indexOf(triggerId) === -1) {
                    state.triggeredToday.push(triggerId);
                    return this.triggerRandomEvent(trigger.slot);
                }
            }
        }

        return false;
    }

    // 待触发的事件（等待顾客清场）
    private pendingEvent: RandomEventV2 = null;
    private isWaitingForCustomerClear: boolean = false;
    private customerCheckCallback: () => boolean = null;  // 检查顾客是否清空的回调
    
    /**
     * 设置顾客检查回调
     */
    public setCustomerCheckCallback(callback: () => boolean) {
        this.customerCheckCallback = callback;
        console.log('[EventSystemIntegration] ✅ 顾客检查回调已设置');
    }
    
    /**
     * 触发随机事件
     */
    public triggerRandomEvent(timeSlot: TimeSlot): boolean {
        if (EventSystemIntegration.globalSuppressed) return false;
        console.log(`[EventSystemIntegration] 🎲 triggerRandomEvent called, timeSlot: ${timeSlot}`);
        
        if (!this.eventManager) {
            console.error('[EventSystemIntegration] ❌ eventManager不存在!');
            return false;
        }

        const event = this.eventManager.triggerRandomEvent(timeSlot);
        if (!event) {
            console.log('[EventSystemIntegration] ⚠️ 没有可用的事件');
            return false;
        }
        
        console.log(`[EventSystemIntegration] ✅ 获取到事件: ${event.name}`);

        // 保存待触发事件
        this.pendingEvent = event;
        this.isWaitingForCustomerClear = true;
        
        // 通知停止生成新顾客（但不隐藏现有顾客）
        if (this.onEventStart) {
            console.log('[EventSystemIntegration] 📢 停止生成新顾客，等待当前顾客处理完...');
            this.onEventStart();
        }

        // 开始检查顾客是否都处理完了
        this.startCustomerClearCheck();
        return true;
    }
    
    // 顾客检查定时器ID
    private customerCheckTimer: any = null;
    
    /**
     * 开始检查顾客清场
     */
    private startCustomerClearCheck() {
        // 停止之前的定时器
        if (this.customerCheckTimer) {
            clearInterval(this.customerCheckTimer);
            this.customerCheckTimer = null;
        }
        
        // 每0.5秒检查一次
        this.customerCheckTimer = setInterval(() => {
            this.checkCustomerCleared();
        }, 500);
        
        console.log('[EventSystemIntegration] ⏰ 开始检查顾客清场...');
    }
    
    /**
     * 停止顾客检查
     */
    private stopCustomerClearCheck() {
        if (this.customerCheckTimer) {
            clearInterval(this.customerCheckTimer);
            this.customerCheckTimer = null;
        }
    }
    
    /**
     * 检查顾客是否都已离开
     */
    private checkCustomerCleared() {
        if (EventSystemIntegration.globalSuppressed) {
            this.applySuppressedState(true);
            return;
        }
        if (!this.isWaitingForCustomerClear || !this.pendingEvent) {
            this.stopCustomerClearCheck();
            return;
        }
        
        // 使用回调检查顾客状态
        let allCleared = false;
        if (this.customerCheckCallback) {
            allCleared = this.customerCheckCallback();
        } else {
            // 如果没有回调，尝试查找CookingControllerV2
            const canvas = find('Canvas');
            if (canvas) {
                for (const child of canvas.children) {
                    const ctrl = child.getComponent('CookingControllerV2') as any;
                    if (ctrl && typeof ctrl.areAllCustomersCleared === 'function') {
                        allCleared = ctrl.areAllCustomersCleared();
                        // 设置回调以便下次使用
                        this.customerCheckCallback = () => ctrl.areAllCustomersCleared();
                        console.log('[EventSystemIntegration] ✅ 已找到并绑定顾客检查回调');
                        break;
                    }
                }
            }
            
            if (!this.customerCheckCallback) {
                console.warn('[EventSystemIntegration] ⚠️ 无法找到顾客检查方法，5秒后强制弹窗');
                // 5秒后强制弹窗
                this.scheduleOnce(() => {
                    if (this.pendingEvent) {
                        this.stopCustomerClearCheck();
                        this.isWaitingForCustomerClear = false;
                        this.showEventPopup(this.pendingEvent);
                        this.pendingEvent = null;
                    }
                }, 5);
                this.stopCustomerClearCheck();
                return;
            }
        }
        
        if (allCleared) {
            console.log('[EventSystemIntegration] ✅ 所有顾客已处理完毕，显示事件弹窗');
            this.stopCustomerClearCheck();
            this.isWaitingForCustomerClear = false;
            
            // 显示事件弹窗
            this.showEventPopup(this.pendingEvent);
            this.pendingEvent = null;
        }
    }
    
    /**
     * 强制显示事件（调试用）
     */
    public forceShowEvent() {
        if (EventSystemIntegration.globalSuppressed) return;
        if (this.pendingEvent) {
            this.stopCustomerClearCheck();
            this.isWaitingForCustomerClear = false;
            this.showEventPopup(this.pendingEvent);
            this.pendingEvent = null;
        }
    }

    /**
     * 显示事件弹窗 - 使用与旧系统相同的方法，每次重新创建
     */
    private showEventPopup(event: RandomEventV2) {
        if (EventSystemIntegration.globalSuppressed) {
            console.log('[EventSystemIntegration] 事件弹窗已被抑制，跳过显示');
            return;
        }
        console.log(`[EventSystemIntegration] 📢 显示事件弹窗: ${event.name}`);
        
        // 移除旧面板
        if (this.eventPopupNode && this.eventPopupNode.isValid) {
            this.eventPopupNode.destroy();
            this.eventPopupNode = null;
        }
        
        // 查找Canvas - 使用与旧系统相同的方法
        const canvas = find('Canvas') || find('CookingScene/Canvas');
        if (!canvas) {
            console.error('[EventSystemIntegration] ❌ 找不到Canvas!');
            return;
        }
        
        // 保存当前事件
        this.currentDisplayEvent = event;
        
        // 创建面板节点
        const panel = new Node('EventPopupV2');
        canvas.addChild(panel);
        panel.setSiblingIndex(9999);
        this.eventPopupNode = panel;
        
        // 半透明背景遮罩
        const mask = new Node('Mask');
        const maskTransform = mask.addComponent(UITransform);
        maskTransform.setContentSize(1920, 1080);
        const maskGraphics = mask.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 180);
        maskGraphics.rect(-960, -540, 1920, 1080);
        maskGraphics.fill();
        panel.addChild(mask);
        
        // 事件卡片背景
        const card = new Node('Card');
        const cardWidth = 500;
        const cardHeight = 420;
        const cardTransform = card.addComponent(UITransform);
        cardTransform.setContentSize(cardWidth, cardHeight);
        const cardGraphics = card.addComponent(Graphics);
        cardGraphics.fillColor = new Color(45, 55, 72, 255);
        cardGraphics.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 16);
        cardGraphics.fill();
        cardGraphics.strokeColor = new Color(100, 120, 150, 255);
        cardGraphics.lineWidth = 2;
        cardGraphics.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 16);
        cardGraphics.stroke();
        panel.addChild(card);
        
        // 发送人信息
        const senderNode = new Node('Sender');
        const senderLabel = senderNode.addComponent(Label);
        senderLabel.string = `${event.sender.icon} ${event.sender.name} (${event.sender.role})`;
        senderLabel.fontSize = 16;
        senderLabel.color = new Color(160, 180, 200, 255);
        senderNode.setPosition(0, 160, 0);
        card.addChild(senderNode);
        
        // 事件图标和标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = `${event.icon} ${event.name}`;
        titleLabel.fontSize = 26;
        titleLabel.color = new Color(255, 220, 100, 255);
        titleNode.setPosition(0, 115, 0);
        card.addChild(titleNode);
        
        // 事件描述
        const descNode = new Node('Description');
        const descTransform = descNode.addComponent(UITransform);
        descTransform.setContentSize(cardWidth - 60, 80);
        const descLabel = descNode.addComponent(Label);
        descLabel.string = event.description;
        descLabel.fontSize = 18;
        descLabel.color = new Color(220, 230, 240, 255);
        descLabel.overflow = Label.Overflow.CLAMP;
        descNode.setPosition(0, 50, 0);
        card.addChild(descNode);
        
        // 选项A按钮
        const btnA = this.createSimpleButton(
            `${event.optionA.emoji} ${event.optionA.text}${event.optionA.production ? ` 🍳${event.optionA.production.targetCount}份` : ''}`,
            -120, -80,
            new Color(72, 187, 120, 255),
            () => this.handleOptionChoice('A')
        );
        card.addChild(btnA);
        
        // 选项B按钮
        const btnB = this.createSimpleButton(
            `${event.optionB.emoji} ${event.optionB.text}`,
            120, -80,
            new Color(229, 62, 62, 255),
            () => this.handleOptionChoice('B')
        );
        card.addChild(btnB);
        
        // 入场动画
        panel.setScale(0.5, 0.5, 1);
        tween(panel)
            .to(0.25, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        
        console.log(`[EventSystemIntegration] ✅ 弹窗已创建并显示`);
    }
    
    /**
     * 创建简单按钮
     */
    private createSimpleButton(text: string, x: number, y: number, color: Color, onClick: () => void): Node {
        const btn = new Node('Button');
        btn.setPosition(x, y, 0);
        
        const btnWidth = 200;
        const btnHeight = 55;
        const btnTransform = btn.addComponent(UITransform);
        btnTransform.setContentSize(btnWidth, btnHeight);
        
        const btnGraphics = btn.addComponent(Graphics);
        btnGraphics.fillColor = color;
        btnGraphics.roundRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 10);
        btnGraphics.fill();
        
        const labelNode = new Node('Label');
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(btnWidth - 20, btnHeight);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 16;
        label.color = new Color(255, 255, 255, 255);
        label.overflow = Label.Overflow.SHRINK;
        btn.addChild(labelNode);
        
        btn.addComponent(Button);
        btn.on(Node.EventType.TOUCH_END, onClick);
        
        return btn;
    }
    
    // 当前显示的事件
    private currentDisplayEvent: RandomEventV2 = null;

    /**
     * 抑制事件弹窗并清理等待状态
     */
    private applySuppressedState(suppressed: boolean) {
        if (!suppressed) return;
        this.stopCustomerClearCheck();
        this.isWaitingForCustomerClear = false;
        this.pendingEvent = null;
        if (this.eventPopupNode) {
            this.eventPopupNode.active = false;
        }
    }

    /**
     * 隐藏事件弹窗
     */
    private hideEventPopup() {
        if (!this.eventPopupNode) return;

        tween(this.eventPopupNode)
            .to(EVENT_POPUP_CONFIG.ANIMATION_DURATION, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => {
                this.eventPopupNode.active = false;
                this.eventPopupNode.setScale(1, 1, 1);
            })
            .start();
    }

    /**
     * 处理选项选择
     */
    private handleOptionChoice(choice: 'A' | 'B') {
        if (!this.eventManager) return;

        // 获取当前事件信息（在handleChoice之前，因为之后会被清除）
        const currentEvent = this.eventManager.getState().currentEvent;
        const option = choice === 'A' ? currentEvent?.optionA : currentEvent?.optionB;

        const result = this.eventManager.handleChoice(choice);
        
        // 隐藏弹窗
        this.hideEventPopup();

        // 生成消息到消息中心
        if (currentEvent && option) {
            this.generateEventMessage(currentEvent, option, choice, result.success);
        }

        // 如果是制作挑战，不结束事件阶段
        if (result.production) {
            console.log(`[EventSystemIntegration] 🍳 开始制作挑战: ${result.production.targetCount}份`);
            return;
        }

        // 显示效果结果
        if (currentEvent && option) {
            this.showEffectResult(currentEvent, option.effect, result.success);
        }

        // 普通事件结束
        this.endEventPhase();
    }
    
    /**
     * 💬 生成事件消息到消息中心
     */
    private generateEventMessage(event: RandomEventV2, option: EventOptionV2, choice: 'A' | 'B', isSuccess: boolean) {
        // 构建消息内容（不使用换行符，确保显示正常）
        let messageContent = '';
        
        if (isSuccess) {
            // 成功消息
            messageContent = `感谢您${option.text}！`;
            if (option.effect.money && option.effect.money > 0) {
                messageContent += ` 已支付${option.effect.money}元答谢。`;
            } else if (option.effect.money && option.effect.money < 0) {
                messageContent += ` 抱歉带来一些损失。`;
            }
            if (option.effect.heat && option.effect.heat > 0) {
                messageContent += ` 店铺口碑提升了！`;
            }
            if (option.effect.customerRate && option.effect.customerRate > 1) {
                messageContent += ` 会推荐朋友来光顾！`;
            }
        } else {
            // 失败消息
            messageContent = `很遗憾这次没能成功...`;
            if (option.effect.failMoney) {
                messageContent += ` 造成了一些损失。`;
            }
        }
        
        console.log(`[EventSystemIntegration] 💬 准备发送消息, onMessageSend: ${this.onMessageSend ? '已设置' : '未设置'}`);
        
        // 发送消息到CookingControllerV2
        if (this.onMessageSend) {
            this.onMessageSend(
                event.sender.name,
                event.sender.icon,
                messageContent,
                event.id
            );
            console.log(`[EventSystemIntegration] 💬 消息已发送: ${event.sender.name} - ${messageContent}`);
        } else {
            console.warn(`[EventSystemIntegration] ⚠️ onMessageSend回调未设置，消息未发送`);
        }
    }
    
    /**
     * 显示效果结果（右上角状态图标 + 效果通知）
     */
    private showEffectResult(event: RandomEventV2, effect: EventEffect, isSuccess: boolean) {
        const effectList: string[] = [];
        
        if (isSuccess) {
            // 成功效果
            if (effect.money) {
                const emoji = effect.money > 0 ? '💰' : '💸';
                effectList.push(`${emoji} 金币 ${effect.money > 0 ? '+' : ''}${effect.money}`);
            }
            if (effect.heat) {
                const emoji = effect.heat > 0 ? '🔥' : '❄️';
                effectList.push(`${emoji} 热度 ${effect.heat > 0 ? '+' : ''}${effect.heat}`);
            }
            if (effect.customerRate) {
                const emoji = effect.customerRate > 1 ? '👥' : '👤';
                const percent = Math.round((effect.customerRate - 1) * 100);
                effectList.push(`${emoji} 客流 ${percent > 0 ? '+' : ''}${percent}% (${effect.customerRateDays || 1}天)`);
                
                // 添加到状态图标
                if (this.statusIconUI) {
                    this.statusIconUI.addEffect({
                        id: `${event.id}_customer_${Date.now()}`,
                        icon: event.icon,
                        name: `${event.name}`,
                        type: effect.customerRate > 1 ? 'buff' : 'debuff',
                        customerRate: effect.customerRate,
                        remainingDays: effect.customerRateDays || 1,
                        sourceEvent: event.name
                    });
                }
            }
        } else {
            // 失败效果
            if (effect.failMoney) {
                effectList.push(`💸 金币 ${effect.failMoney}`);
            }
            if (effect.failHeat) {
                effectList.push(`❄️ 热度 ${effect.failHeat}`);
            }
        }
        
        // 显示效果通知
        if (effectList.length > 0) {
            const resultText = isSuccess ? '✅ 成功！' : '❌ 失败...';
            this.showEffectNotification(resultText, effectList);
        }
        
        console.log(`[EventSystemIntegration] 📊 事件结果: ${isSuccess ? '成功' : '失败'}, 效果: ${effectList.join(', ')}`);
    }
    
    /**
     * 显示效果通知（右上角弹出）
     */
    private showEffectNotification(title: string, effects: string[]) {
        const canvas = find('Canvas');
        if (!canvas) return;
        
        // 创建通知节点
        const notifyNode = new Node('EffectNotification');
        canvas.addChild(notifyNode);
        notifyNode.setSiblingIndex(9999);
        notifyNode.layer = 1 << 25;
        
        // 获取Canvas尺寸
        const canvasTransform = canvas.getComponent(UITransform);
        const width = canvasTransform ? canvasTransform.width : 960;
        const height = canvasTransform ? canvasTransform.height : 640;
        
        // 计算通知框尺寸
        const boxWidth = 260;
        const boxHeight = 70 + effects.length * 28;
        
        // 定位到右上角（居中锚点）
        notifyNode.setPosition(width/2 - boxWidth/2 - 20, height/2 - boxHeight/2 - 20, 0);
        
        const transform = notifyNode.addComponent(UITransform);
        transform.setContentSize(boxWidth, boxHeight);
        transform.anchorX = 0.5;
        transform.anchorY = 0.5;
        
        // 背景
        const bg = notifyNode.addComponent(Graphics);
        bg.fillColor = new Color(20, 20, 35, 230);
        bg.roundRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, 12);
        bg.fill();
        bg.strokeColor = new Color(100, 180, 255, 200);
        bg.lineWidth = 2;
        bg.roundRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight, 12);
        bg.stroke();
        
        // 标题（居中）
        const titleNode = new Node('Title');
        notifyNode.addChild(titleNode);
        titleNode.setPosition(0, boxHeight/2 - 25, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 20;
        titleLabel.color = title.indexOf('成功') !== -1 ? new Color(100, 255, 150, 255) : new Color(255, 100, 100, 255);
        titleLabel.horizontalAlign = 1;  // 居中
        
        // 效果列表（居中对齐）
        effects.forEach((effectText, index) => {
            const effectNode = new Node(`Effect_${index}`);
            notifyNode.addChild(effectNode);
            effectNode.setPosition(0, boxHeight/2 - 55 - index * 28, 0);
            const effectLabel = effectNode.addComponent(Label);
            effectLabel.string = effectText;
            effectLabel.fontSize = 16;
            effectLabel.color = new Color(220, 220, 230, 255);
            effectLabel.horizontalAlign = 1;  // 居中
        });
        
        // 添加UIOpacity组件用于淡出
        const opacity = notifyNode.addComponent(UIOpacity);
        opacity.opacity = 255;
        
        // 动画：淡入 -> 停留 -> 淡出 -> 销毁
        notifyNode.setScale(0.8, 0.8, 1);
        tween(notifyNode)
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .delay(2.0)
            .call(() => {
                // 逐渐淡出
                tween(opacity)
                    .to(0.8, { opacity: 0 }, { easing: 'quadIn' })
                    .call(() => {
                        notifyNode.destroy();
                    })
                    .start();
            })
            .start();
    }

    /**
     * 结束事件阶段
     */
    private endEventPhase() {
        if (this.onEventEnd) {
            this.onEventEnd();
        }
        console.log('[EventSystemIntegration] ✅ 事件阶段结束');
    }

    /**
     * 处理金币变化
     */
    private handleMoneyChange(amount: number) {
        const adjusted = getAdjustedMoneyEffect(amount);
        if (this.onMoneyChange) {
            this.onMoneyChange(adjusted);
        }
    }

    /**
     * 处理热度变化
     */
    private handleHeatChange(amount: number) {
        const adjusted = getAdjustedHeatEffect(amount);
        if (this.onHeatChange) {
            this.onHeatChange(adjusted);
        }
    }

    /**
     * 处理客流倍率变化
     */
    private handleCustomerRateChange(rate: number, days: number) {
        this.currentCustomerRateMultiplier = rate;
        this.customerRateDaysRemaining = days;
        
        if (this.onCustomerRateChange) {
            this.onCustomerRateChange(rate, days);
        }
    }

    /**
     * 处理制作挑战开始
     */
    private handleProductionStart(challenge: ProductionChallenge) {
        if (!this.productionUI) return;

        // 应用时间倍率
        const adjustedChallenge = {
            ...challenge,
            timeLimit: getAdjustedProductionTime(challenge.timeLimit)
        };

        this.productionCompletedCount = 0;

        this.productionUI.startChallenge(
            adjustedChallenge,
            () => this.handleProductionTimeout(),
            () => this.handleProductionComplete()
        );
        
        // 🎯 通知显示制作挑战交付目标
        if (this.onProductionChallengeStart) {
            const currentEvent = this.eventManager?.getState().currentEvent;
            const senderName = currentEvent?.sender?.name || '订单';
            const senderIcon = currentEvent?.sender?.icon || '📦';
            this.onProductionChallengeStart(challenge.targetCount, senderName, senderIcon);
        }
    }

    /**
     * 处理制作完成（外部调用 - 每完成一份烤冷面）
     */
    public onFoodCompleted() {
        if (!this.eventManager || !this.eventManager.isInProductionChallenge()) {
            return;
        }

        this.productionCompletedCount++;
        
        // 更新UI
        if (this.productionUI) {
            this.productionUI.updateProgress(this.productionCompletedCount);
        }

        // 更新管理器
        const result = this.eventManager.updateProductionProgress(this.productionCompletedCount);
        
        if (result.isComplete) {
            console.log(`[EventSystemIntegration] 🎉 制作挑战完成!`);
        }
    }

    /**
     * 处理制作超时
     */
    private handleProductionTimeout() {
        if (!this.eventManager) return;

        const penalty = this.eventManager.productionTimeout();
        console.log('[EventSystemIntegration] ⏰ 制作挑战超时');
        
        // 🎯 隐藏制作挑战交付目标
        if (this.onProductionChallengeEnd) {
            this.onProductionChallengeEnd();
        }
        
        this.endEventPhase();
    }

    /**
     * 处理制作挑战完成
     */
    private handleProductionComplete() {
        console.log('[EventSystemIntegration] ✅ 制作挑战成功完成');
        
        // 🎯 隐藏制作挑战交付目标
        if (this.onProductionChallengeEnd) {
            this.onProductionChallengeEnd();
        }
        
        this.endEventPhase();
    }

    /**
     * 处理新消息
     */
    private handleMessageAdd(message: EventMessage) {
        if (this.messageUI) {
            this.messageUI.addMessage(message);
        }
    }

    /**
     * 处理效果添加
     */
    private handleEffectAdd(effect: ActiveEffect) {
        if (this.statusIconUI) {
            this.statusIconUI.addEffect(effect);
        }
    }

    /**
     * 处理效果移除
     */
    private handleEffectRemove(effectId: string) {
        if (this.statusIconUI) {
            this.statusIconUI.removeEffect(effectId);
        }
    }

    /**
     * 每日结算
     */
    public dailySettlement(): { money: number; heat: number; customerRate: number } {
        if (!this.eventManager) {
            return { money: 0, heat: 0, customerRate: 1 };
        }

        const result = this.eventManager.dailySettlement();
        
        let totalMoney = 0;
        let totalHeat = 0;

        // 处理触发的链式事件
        for (const chain of result.triggeredChains) {
            console.log(`[EventSystemIntegration] 🔗 链式事件触发: ${chain.event}`);
            console.log(`  消息: ${chain.message}`);
            
            if (chain.effect.money) totalMoney += chain.effect.money;
            if (chain.effect.heat) totalHeat += chain.effect.heat;
        }

        // 获取当前客流倍率
        const customerRate = this.eventManager.getCurrentCustomerRate();

        return { money: totalMoney, heat: totalHeat, customerRate };
    }

    /**
     * 重置每日状态
     */
    public resetDailyState() {
        if (this.eventManager) {
            this.eventManager.resetDailyState();
        }
        this.productionCompletedCount = 0;
    }

    /**
     * 是否在事件阶段
     */
    public isInEventPhase(): boolean {
        return this.eventManager ? this.eventManager.isInEventPhase() : false;
    }

    /**
     * 是否在制作挑战中
     */
    public isInProductionChallenge(): boolean {
        return this.eventManager ? this.eventManager.isInProductionChallenge() : false;
    }

    /**
     * 获取当前客流倍率
     */
    public getCurrentCustomerRate(): number {
        return this.eventManager ? this.eventManager.getCurrentCustomerRate() : 1;
    }

    /**
     * 获取消息数量（用于手机未读提示）
     */
    public getUnreadMessageCount(): number {
        if (!this.eventManager) return 0;
        const messages = this.eventManager.getMessages();
        return messages.filter(m => m.status === 'active' || m.status === 'pending').length;
    }

    /**
     * 手动触发事件（测试用）
     */
    public debugTriggerEvent(timeSlot: TimeSlot) {
        this.triggerRandomEvent(timeSlot);
    }

    /**
     * 获取事件管理器（高级用法）
     */
    public getEventManager(): EventManagerV2 {
        return this.eventManager;
    }
    
    /**
     * 🍜 检查是否有待交付任务
     */
    public hasPendingDelivery(): boolean {
        return this.eventManager ? this.eventManager.hasPendingDelivery() : false;
    }
    
    /**
     * 🍜 完成一次交付
     */
    public completeDelivery(): { isComplete: boolean; message: string } {
        if (!this.eventManager) {
            return { isComplete: false, message: '事件管理器未初始化' };
        }
        return this.eventManager.completeDelivery();
    }
    
    /**
     * 🍜 获取待交付任务信息
     */
    public getPendingDelivery() {
        return this.eventManager ? this.eventManager.getPendingDelivery() : null;
    }
}
