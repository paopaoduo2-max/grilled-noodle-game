import { _decorator, CCFloat, Component, Node, Label, Button, Color, tween, Vec3, UITransform, Sprite, input, Input, EventTouch, EventMouse, EventKeyboard, KeyCode, Vec2, Canvas, ScrollView, SpriteFrame, Texture2D, resources, Graphics, find, director, ImageAsset, assetManager, view, game, screen, Layers, UIOpacity, sys, BlockInputEvents } from 'cc';
import { PREVIEW, EDITOR, DEV } from 'cc/env';
import { CustomerCharacterManager, CustomerType, CharacterConfig } from './CustomerCharacter';
import { ClickAreaPolygon } from '../UI/ClickAreaPolygon';
import { GameManager } from '../Manager/GameManager';
import { TimeManager } from '../Manager/TimeManager';
import { ReviewTexts } from '../Data/ReviewTexts';
import { TutorialManager } from '../Tutorial/TutorialManager';
import { InventoryManager } from '../Manager/InventoryManager';
import { BrushSauceController } from './BrushSauceController';
import { RandomEvent, TimeSlot, EventOption, getRandomEvent, getAllEvents } from './RandomEventSystem';
import { EventSystemIntegration } from './EventSystemIntegration';
import { TimeSlot as TimeSlotV2 } from './RandomEventSystemV2';
import { SpecialEventSystem } from './SpecialEvents/SpecialEventSystem';
import { GameProgressManager } from '../Manager/GameProgressManager';
import { SaveManager } from '../Manager/SaveManager';
import { SceneRouteService } from '../Manager/SceneRouteService';
import { WorldProgressManager } from '../Manager/WorldProgressManager';
import { WorldStoryTaskManager } from '../Manager/WorldStoryTaskManager';
import { FeatureGate } from '../Manager/FeatureGate';
import { getWorldStoryTask } from '../Data/WorldRuntimeConfig';
import { IngredientType, GameConfig, RecipeData } from '../Data/GameConfig';  // 🔥 从GameConfig统一导入
import { DoughState, FlavorType, CustomerMood, IngredientData, CustomerOrder, CustomerData, ReviewHistoryItem, EventMessage } from './Types/CookingTypes';  // 📦 类型定义
import { FoodItem } from './Types/FoodItem';  // 📦 面饼类
import { PHONE_CONFIG, TOOL_IMAGE_UUIDS, EGG_IMAGE_UUIDS, ONION_HOLD_UUIDS, CILANTRO_HOLD_UUIDS, STACKABLE_INGREDIENT_CONFIG, INGREDIENT_CONFIG, TRASH_IMAGE_UUIDS, CUT_IMAGE_UUIDS, SAUSAGE_IMAGE_UUID, INFINITE_INGREDIENTS } from './Config/CookingConfig';  // 📦 配置常量
import { MessageSystem } from './UI/MessageSystem';  // 📦 消息系统
// import { LaowangNPC } from './UI/LaowangNPC';  // 📦 老王NPC系统（保留原实现，耦合紧密）
// import { WorkAreaUI } from './UI/WorkAreaUI';  // 📦 工作区域UI（已回退）
import { RandomEventUI } from './UI/RandomEventUI';  // 📦 随机事件UI
import { PhoneUIComponents } from './UI/PhoneUIComponents';  // 📦 手机UI组件
import { PhoneUIItems } from './UI/PhoneUIItems';  // ?? 手机UI列表项
import { EventManager, GameEvents } from '../Utils/EventManager';
import { GuideEvents } from '../Tutorial/GuideEvents';
const { ccclass, property } = _decorator;

// 🔥 IngredientType 已移至 GameConfig.ts 统一定义
// 为了兼容性，重新导出
export { IngredientType } from '../Data/GameConfig';

// 📦 类型定义已移至 ./Types/CookingTypes.ts
// 重新导出以保持兼容性
export { DoughState, FlavorType, CustomerMood } from './Types/CookingTypes';
export type { CustomerData, CustomerOrder } from './Types/CookingTypes';

// 📦 FoodItem 类已移至 ./Types/FoodItem.ts
// 重新导出以保持兼容性
export { FoodItem } from './Types/FoodItem';

class WorldStoryTaskHud {
    private root: Node | null = null;
    private trackerLabel: Label | null = null;
    private popupQueue: Array<{ title: string; body: string; accent: Color }> = [];
    private popupNode: Node | null = null;
    private readonly popupDuration = 3.2;

    constructor(private readonly controller: CookingControllerV2) {}

    public setup(): void {
        WorldStoryTaskManager.bootstrapDailyTasks();
        this.ensureUi();
        this.refresh();
        this.presentDailySamples();
    }

    public refresh(completedTaskIds: string[] = []): void {
        this.ensureUi();
        this.updateTracker();
        completedTaskIds.forEach((taskId) => this.queueCompletedPopup(taskId));
        this.showNextPopup();
    }

    public dispose(): void {
        if (this.popupNode && this.popupNode.isValid) {
            this.popupNode.destroy();
        }
        if (this.root && this.root.isValid) {
            this.root.destroy();
        }
        this.popupNode = null;
        this.root = null;
        this.trackerLabel = null;
        this.popupQueue.length = 0;
    }

    private ensureUi(): void {
        const canvas = find('Canvas') || this.controller.node.scene?.getChildByName('Canvas') || this.controller.node.parent;
        if (!canvas) return;

        if (!this.root || !this.root.isValid) {
            this.root = canvas.getChildByName('WorldStoryTaskHUD');
        }
        if (!this.root || !this.root.isValid) {
            const root = new Node('WorldStoryTaskHUD');
            root.layer = canvas.layer;
            const transform = root.addComponent(UITransform);
            transform.setContentSize(360, 120);
            root.setPosition(470, 240, 0);
            canvas.addChild(root);
            root.setSiblingIndex(9996);

            const bg = root.addComponent(Graphics);
            bg.fillColor = new Color(18, 24, 30, 220);
            bg.roundRect(-180, -60, 360, 120, 14);
            bg.fill();
            bg.strokeColor = new Color(255, 208, 120, 220);
            bg.lineWidth = 2;
            bg.roundRect(-180, -60, 360, 120, 14);
            bg.stroke();

            const titleNode = new Node('Title');
            titleNode.layer = canvas.layer;
            titleNode.setPosition(0, 40, 0);
            const titleLabel = titleNode.addComponent(Label);
            titleLabel.string = '今日剧情任务';
            titleLabel.fontSize = 20;
            titleLabel.isBold = true;
            titleLabel.color = new Color(255, 230, 180, 255);
            root.addChild(titleNode);

            const trackerNode = new Node('Tracker');
            trackerNode.layer = canvas.layer;
            trackerNode.setPosition(-154, 12, 0);
            const trackerTransform = trackerNode.addComponent(UITransform);
            trackerTransform.setAnchorPoint(0, 0.5);
            trackerTransform.setContentSize(308, 80);
            const trackerLabel = trackerNode.addComponent(Label);
            trackerLabel.fontSize = 16;
            trackerLabel.lineHeight = 22;
            trackerLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
            trackerLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
            trackerLabel.verticalAlign = Label.VerticalAlign.TOP;
            trackerLabel.color = new Color(240, 240, 240, 255);
            root.addChild(trackerNode);

            this.root = root;
            this.trackerLabel = trackerLabel;
        }

        if (!this.trackerLabel && this.root) {
            this.trackerLabel = this.root.getChildByName('Tracker')?.getComponent(Label) ?? null;
        }
    }

    private updateTracker(): void {
        if (!this.trackerLabel) return;
        const mainTask = WorldStoryTaskManager.getTodayMainTask();
        const sideTask = WorldStoryTaskManager.getTodaySideTask();
        const lines = [
            this.buildTaskLine('主线', mainTask),
            this.buildTaskLine('支线', sideTask)
        ];
        this.trackerLabel.string = lines.join('\n');
    }

    private buildTaskLine(label: string, task: ReturnType<typeof WorldStoryTaskManager.getTodayMainTask>): string {
        if (!task) {
            return `${label}：今日暂无新单`;
        }

        const manager = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const progress = WorldStoryTaskManager.getTaskProgress(task.taskId);
        const target = task.orderRequirements.orderCount;
        const completed = manager.isStoryTaskCompleted(task.taskId);
        const status = completed ? '已完成' : `${progress}/${target}`;
        const flavor = task.orderRequirements.flavorTags?.length ? ` · ${task.orderRequirements.flavorTags.join('/')}` : '';
        return `${label}：${task.title || task.taskId}${flavor} (${status})`;
    }

    private presentDailySamples(): void {
        const manager = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const day = manager.progress.dayIndex;
        const sampleConfigs = [
            { task: WorldStoryTaskManager.getTodayMainTask(), label: '主线委托', accent: new Color(255, 188, 92, 255) },
            { task: WorldStoryTaskManager.getTodaySideTask(), label: '支线委托', accent: new Color(128, 220, 180, 255) }
        ];

        sampleConfigs.forEach(({ task, label, accent }) => {
            if (!task) return;
            const flag = `story.sample.presented.${day}.${task.taskId}`;
            if (manager.getStoryFlag(flag)) return;
            manager.setStoryFlag(flag, true);
            const rewardParts: string[] = [];
            if (task.rewards.money) rewardParts.push(`奖励${task.rewards.money}元`);
            if (task.rewards.unlockDeviceIds?.length) rewardParts.push(`解锁设备 ${task.rewards.unlockDeviceIds.join('、')}`);
            if (task.rewards.unlockIngredientIds?.length) rewardParts.push(`解锁食材 ${task.rewards.unlockIngredientIds.join('、')}`);
            const body = [
                task.briefing || `委托编号：${task.taskId}`,
                `条件：完成 ${task.orderRequirements.orderCount} 份订单`,
                task.orderRequirements.flavorTags?.length ? `口味：${task.orderRequirements.flavorTags.join(' / ')}` : '口味：不限',
                rewardParts.length > 0 ? rewardParts.join('；') : '奖励：推进剧情'
            ].join('\n');
            this.popupQueue.push({ title: `${label}已触发`, body, accent });
        });
    }

    private queueCompletedPopup(taskId: string): void {
        const resolvedTask = getWorldStoryTask(taskId);
        const manager = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const completedTask = resolvedTask || null;
        if (!completedTask) return;
        const lineLabel = completedTask.lineType === 'main' ? '主线完成' : '支线完成';
        const rewardText: string[] = [];
        if (completedTask.rewards.money) rewardText.push(`+${completedTask.rewards.money}元`);
        if (completedTask.rewards.unlockDeviceIds?.length) rewardText.push(`设备 ${completedTask.rewards.unlockDeviceIds.join('、')}`);
        if (completedTask.rewards.unlockIngredientIds?.length) rewardText.push(`食材 ${completedTask.rewards.unlockIngredientIds.join('、')}`);
        const completionFlag = `story.sample.completed.popup.${manager.progress.dayIndex}.${taskId}`;
        if (manager.getStoryFlag(completionFlag)) return;
        manager.setStoryFlag(completionFlag, true);
        this.popupQueue.push({
            title: `${lineLabel} · ${completedTask.title || completedTask.taskId}`,
            body: rewardText.length > 0 ? rewardText.join('\n') : '剧情状态已推进',
            accent: completedTask.lineType === 'main' ? new Color(255, 214, 120, 255) : new Color(156, 230, 192, 255)
        });
    }

    private showNextPopup(): void {
        if (this.popupNode || this.popupQueue.length === 0) return;
        const canvas = find('Canvas') || this.controller.node.scene?.getChildByName('Canvas') || this.controller.node.parent;
        if (!canvas) return;

        const popup = this.createPopupNode(canvas, this.popupQueue.shift()!);
        this.popupNode = popup;
        canvas.addChild(popup);
        popup.setSiblingIndex(9998);
        popup.setScale(0.92, 0.92, 1);
        popup.setPosition(0, 180, 0);
        tween(popup)
            .to(0.18, { scale: new Vec3(1, 1, 1), position: new Vec3(0, 210, 0) }, { easing: 'backOut' })
            .start();

        this.controller.scheduleOnce(() => {
            if (!this.popupNode || !this.popupNode.isValid) {
                this.popupNode = null;
                this.showNextPopup();
                return;
            }
            const currentPopup = this.popupNode;
            this.popupNode = null;
            tween(currentPopup)
                .to(0.18, { scale: new Vec3(0.92, 0.92, 1), position: new Vec3(0, 180, 0) })
                .call(() => currentPopup.destroy())
                .call(() => this.showNextPopup())
                .start();
        }, this.popupDuration);
    }

    private createPopupNode(canvas: Node, config: { title: string; body: string; accent: Color }): Node {
        const popup = new Node('WorldStoryTaskPopup');
        popup.layer = canvas.layer;
        const transform = popup.addComponent(UITransform);
        transform.setContentSize(420, 150);
        const bg = popup.addComponent(Graphics);
        bg.fillColor = new Color(16, 20, 28, 240);
        bg.roundRect(-210, -75, 420, 150, 16);
        bg.fill();
        bg.strokeColor = config.accent;
        bg.lineWidth = 3;
        bg.roundRect(-210, -75, 420, 150, 16);
        bg.stroke();

        const titleNode = new Node('Title');
        titleNode.layer = canvas.layer;
        titleNode.setPosition(0, 40, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = config.title;
        titleLabel.fontSize = 24;
        titleLabel.isBold = true;
        titleLabel.color = config.accent;
        popup.addChild(titleNode);

        const bodyNode = new Node('Body');
        bodyNode.layer = canvas.layer;
        bodyNode.setPosition(-180, 0, 0);
        const bodyTransform = bodyNode.addComponent(UITransform);
        bodyTransform.setAnchorPoint(0, 0.5);
        bodyTransform.setContentSize(360, 90);
        const bodyLabel = bodyNode.addComponent(Label);
        bodyLabel.string = config.body;
        bodyLabel.fontSize = 18;
        bodyLabel.lineHeight = 24;
        bodyLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
        bodyLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        bodyLabel.verticalAlign = Label.VerticalAlign.TOP;
        bodyLabel.color = new Color(242, 242, 242, 255);
        popup.addChild(bodyNode);

        return popup;
    }
}

/**
 * 烤冷面控制器 V2
 * 支持：多面饼、跟随鼠标、状态计时、顾客订单
 */
@ccclass('CookingControllerV2')
export class CookingControllerV2 extends Component {
    @property(Node)
    grillArea: Node = null;

    @property(Node)
    foodContainer: Node = null;

    @property(Node)
    mouseFollower: Node = null;  // 跟随鼠标的节点

    @property(SpriteFrame)
    bgSpriteFrame: SpriteFrame = null;  // 背景图片（在编辑器中绑定）

    @property({type: CCFloat, tooltip: '面饼尺寸（宽高相同）'})
    doughSize: number = 120;  // 面饼尺寸，可在编辑器中调整

    @property(Node)
    doughBtn: Node = null;

    @property(Node)
    eggBtn: Node = null;

    @property(Node)
    cilantroBtn: Node = null;

    @property(Node)
    onionBtn: Node = null;

    @property(Node)
    sausageBtn: Node = null;

    @property(Button)
    sauceBtn: Button = null;  // 烤冷面酱按钮

    @property(Button)
    chiliBtn: Button = null;  // 辣椒按钮

    @property(Button)
    sugarBtn: Button = null;  // 白糖按钮

    @property(Button)
    vinegarBtn: Button = null;  // 醋按钮

    @property(Button)
    oilBtn: Button = null;  // 油壶按钮

    @property(Button)
    waterBtn: Button = null;  // 水壶按钮

    @property(Button)
    spatulaBtn: Button = null;  // 铲子按钮

    @property(BrushSauceController)
    brushSauceController: BrushSauceController = null;  // 刷酱控制器

    // NPC 对话框（用于教程）
    @property(Node)
    npcDialogBox: Node = null;  // NPC 对话框节点
    
    @property(Label)
    npcDialogLabel: Label = null;  // NPC 对话文字

    @property(Node)
    trashBin: Node = null;  // 垃圾桶节点
    
    // 🗑️ 垃圾桶图片UUID - 已移至 CookingConfig.ts (TRASH_IMAGE_UUIDS)
    private _trashBinSprite: Sprite = null;          // 垃圾桶Sprite组件
    private _isTrashOpen: boolean = false;           // 垃圾桶是否打开

    @property(Node)
    customerArea: Node = null;  // 顾客区域（用于拖动交付）

    @property(Node)
    packingBox1: Node = null;  // 打包盒1（对应顾客1）

    @property(Node)
    packingBox2: Node = null;  // 打包盒2（对应顾客2）

    @property(Node)
    packingBox3: Node = null;  // 打包盒3（对应顾客3）

    // 🔥 打包盒初始位置（用于重置）
    private packingBoxInitialPositions: Vec3[] = [];

    // 🔥 打包盒口味标签位置配置
    @property({ tooltip: '打包盒口味标签X偏移' })
    flavorLabelOffsetX: number = 0;
    
    @property({ tooltip: '打包盒口味标签Y偏移' })
    flavorLabelOffsetY: number = 10;

    @property(Button)
    serveButton: Button = null;  // 出餐按钮

    // === 油渍/面饼位置配置 ===
    @property(Node)
    oilPosition1: Node = null;  // 油渍位置1（左）- 在场景中创建空节点调整位置

    @property(Node)
    oilPosition2: Node = null;  // 油渍位置2（中）

    @property(Node)
    oilPosition3: Node = null;  // 油渍位置3（右）

    // === 烤肠位置配置（在场景中拖动节点调整位置） ===
    @property({
        type: [Node],
        displayName: "烤肠位置列表",
        tooltip: "烤肠放置位置节点列表，每个节点代表一个烤肠位置，可在场景中拖动调整"
    })
    sausagePositions: Node[] = [];  // 烤肠位置节点列表

    @property({
        displayName: "烤肠大小",
        tooltip: "单个烤肠的显示大小",
        min: 1,
        max: 150
    })
    sausageSize: number = 60;  // 烤肠大小

    // === 库存显示 ===
    @property(Node)
    inventoryPanel: Node = null;  // 库存面板（显示食材剩余数量）
    
    // 库存标签映射
    private inventoryLabels: Map<IngredientType, Label> = new Map();
    
    // 🔥 食材按钮上的余量标签
    private ingredientCountLabels: Map<IngredientType, Label> = new Map();
    
    // 是否启用库存系统
    private useInventorySystem: boolean = false;

    // === 可调参数 ===
    @property({
        displayName: "烧焦总时间(秒)",
        tooltip: "面饼从放下到完全烤焦的总时间",
        min: 5,
        max: 60
    })
    public maxCookTime: number = 15;

    @property({
        displayName: "烤焦警告阈值",
        tooltip: "达到这个比例开始变深色(0.6=60%)",
        min: 0.3,
        max: 0.9,
        step: 0.1
    })
    public burnWarningThreshold: number = 0.6;

    @property({
        displayName: "快烤焦阈值",
        tooltip: "达到这个比例开始快烤焦(0.8=80%)",
        min: 0.5,
        max: 0.95,
        step: 0.05
    })
    public almostBurntThreshold: number = 0.8;

    @property({
        displayName: "🔧 暂停烤焦(调试)",
        tooltip: "调试用：暂停烤焦功能，方便调整绘制区域"
    })
    public debugPauseBurning: boolean = false;

    // 📦 食材配置已移至 ./Config/CookingConfig.ts (INGREDIENT_CONFIG)

    // 当前状态
    private currentHandItem: IngredientType | null = null;
    private handItemCount: number = 0;  // 手持物品数量（用于连续点击）
    private foodItems: FoodItem[] = [];  // 铁板上的多个面饼
    private _lastGrillTouchTime: number = 0;
    private maxFoodItems: number = 3;
    private selectedFood: FoodItem | null = null;

    // 拖动状态
    private draggingFood: FoodItem | null = null;
    private dragStartPos: Vec3 = new Vec3();  // 🔥 原始父节点下的起始位置（用于返回）
    private dragStartPosCanvas: Vec3 = new Vec3();  // 🔥 Canvas 下的起始位置（用于判断点击）
    private dragOffset: Vec3 = new Vec3();  // 触摸点相对于食物中心的偏移
    private isDragging: boolean = false;
    private _handlingFoodClick: boolean = false;  // 🔥 防止面饼点击事件重复处理
    private dragOriginalParent: Node | null = null;  // 🔥 拖动前的原始父节点

    // 打包状态（新系统：3个独立打包盒，对应3个顾客）
    private packedFoods: (FoodItem | null)[] = [null, null, null];  // 3个打包盒的食物
    private boxUsedCount: number = 0;  // 已使用的打包盒数量（用于判断是否3个都用完）
    private paidBoxes: Set<number> = new Set();  // 已支付的打包盒索引（等待贴订单）
    private waitingToPackFoods: FoodItem[] = [];  // 🔥 等待打包的食物列表

    // 油渍管理
    private oilMarks: (Node | null)[] = [null, null, null];  // 3个位置的油渍节点
    
    // 香肠烤制系统
    private readonly MAX_SAUSAGES = 6;           // 最大香肠数量
    private readonly SAUSAGE_COOK_TIME = 3;      // 香肠烤制时间（秒）
    private sausageContainer: Node = null;       // 香肠容器
    private sausages: { node: Node, cookProgress: number, isCooked: boolean }[] = [];  // 烤制中的香肠
    
    // 订单拖动状态
    private draggingOrder: {customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}, index: number} | null = null;
    private orderDragStartPos: Vec3 = new Vec3();

    // 顾客订单系统
    private customers: Array<{node: Node, order: CustomerOrder | null, orderLabel: Node | null}> = [];  // 顾客列表
    private orderIdCounter: number = 0;
    
    // 评价和金币系统
    private superGoodReviews: number = 0;  // 超级好评数量
    private goodReviews: number = 0;       // 好评数量
    private badReviews: number = 0;        // 差评数量
    private totalMoney: number = 0;        // 总金币
    private demoGoalNotified: boolean = false;  // Demo 目标提示是否已显示
    private outOfStockPrompt: Node | null = null;
    private demoCompletePanel: Node | null = null;
    private outOfStockPromptCooldown: number = 0;
    
    // 🔥 评分系统（超级好评5分，好评4.5分，差评0-4分）
    private allScores: number[] = [];      // 所有评分记录
    private totalScore: number = 0;        // 总分
    private averageScore: number = 5.0;    // 平均分（初始5分）
    
    // 🔥 店铺热度系统
    private shopHeat: number = 50;         // 店铺热度 (0-100)，初始50
    private baseCustomerInterval: number = 15;  // 基础顾客间隔（秒）
    private customerSpawnTimer: number = 0;     // 顾客生成计时器
    
    // ?? 时间兜底（防止TimeManager的update未被引擎调用）
    private manualTimeTick: boolean = false;
    private timeFreezeTimer: number = 0;
    private lastTimeHour: number = -1;
    private lastTimeMinute: number = -1;
    
    // 🔥 定价系统
    private readonly PRICING = {
        BASE_PRICE: 8,      // 基础烤冷面价格
        EGG_PRICE: 1,       // 每个蛋加价
        SAUSAGE_PRICE: 1    // 每个肠加价
    };
    
    // 评价历史记录（增加评分字段）
    private reviewHistory: Array<{type: 'super' | 'good' | 'bad', text: string, score: number, timestamp: number}> = [];
    
    // ========================================
    // 🎲 随机事件系统
    // ========================================
    private eventState = {
        currentEvent: null as RandomEvent | null,      // 当前正在处理的事件
        pendingEvent: null as RandomEvent | null,      // 待触发的事件（等待顾客清场）
        triggeredToday: [] as string[],                // 今天已触发的事件ID
        isEventPhase: false,                           // 是否处于事件阶段
        customerClearing: false,                       // 是否正在清场
        eventTriggerTimes: [13.5, 15.5, 18, 20.5] as number[]  // 事件触发时间点（小时）
    };
    private eventPanel: Node | null = null;            // 事件弹窗面板
    
    // ========================================
    // 🎲 新事件系统V2（支持制作挑战、链式事件、讯息系统）
    // ========================================
    private eventSystemV2: EventSystemIntegration = null;
    private useEventSystemV2: boolean = true;  // 是否使用新事件系统
    private specialEventSystem: SpecialEventSystem = null;
    private useSpecialEventSystem: boolean = true;
    
    // 🎯 制作挑战临时交付目标
    private productionDeliveryTarget: Node = null;
    
    // 📱 事件消息历史（手机消息中心用）
    private eventMessages: Array<{
        id: string;
        sender: string;      // 发送人
        senderIcon: string;  // 发送人图标
        content: string;     // 消息内容
        time: string;        // 时间
        eventId: string;     // 关联事件ID
        isRead: boolean;     // 是否已读
    }> = [];
    
    // 📦 PHONE_CONFIG 已移至 ./Config/CookingConfig.ts
    
    @property({ tooltip: '单份料理模式（仅制作，不启用营业/顾客/时间）' })
    public singleDishMode: boolean = false;

    // 营业状态（public以便GameStarter同步状态）
    public isBusinessOpen: boolean = false;  // 是否已开始营业
    
    // 教程管理器
    private tutorialManager: TutorialManager = null;
    private worldStoryTaskHud: WorldStoryTaskHud | null = null;
    
    // UI引用
    @property(Label)
    moneyLabel: Label = null;  // 金币显示
    
    @property(Label)
    reviewLabel: Label = null;  // 评价显示
    
    @property(Node)
    phoneButton: Node = null;  // 手机按钮
    
    @property(Node)
    phonePanel: Node = null;  // 手机面板

    @property(Node)
    errorPanel: Node = null;
    
    @property(Label)
    errorLabel: Label = null;
    
    
    // 📦 消息系统 (已移至 ./UI/MessageSystem.ts)
    private messageSystem: MessageSystem = null;

    onLoad() {
        // 初始化消息系统
        this.messageSystem = new MessageSystem(this.node);
        console.log('[CookingControllerV2] 初始化');

        if (this.singleDishMode) {
            console.log('[CookingControllerV2] 单份料理模式：跳过营业/顾客/时间系统初始化');
        }
        
        // 监听彩票站金币变化事件
        director.on('LOTTERY_MONEY_CHANGED', this.onLotteryMoneyChanged, this);
        input.on(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
        
        // 🎨 创建工作区域视觉界面
        this.setupWorkAreaUI();
        
        // 调试信息：打印节点结构
        console.log(`[Debug] 🏗️ 组件挂载节点: ${this.node.name}`);
        console.log(`[Debug] 🏗️ 父节点: ${this.node.parent?.name || 'null'}`);
        console.log(`[Debug] 🏗️ Canvas节点: ${this.node.parent?.parent?.name || 'null'}`);
        
        // 打印关键节点位置
        if (this.trashBin) {
            console.log(`[Debug] 🗑️ 垃圾桶位置: (${this.trashBin.position.x.toFixed(0)}, ${this.trashBin.position.y.toFixed(0)})`);
        }
        // 🔥 保存打包盒初始位置（用于重置时恢复）
        if (this.packingBox1) {
            this.packingBoxInitialPositions[0] = this.packingBox1.position.clone();
            console.log(`[Debug] 📦 打包盒1初始位置: (${this.packingBox1.position.x.toFixed(0)}, ${this.packingBox1.position.y.toFixed(0)})`);
        }
        if (this.packingBox2) {
            this.packingBoxInitialPositions[1] = this.packingBox2.position.clone();
            console.log(`[Debug] 📦 打包盒2初始位置: (${this.packingBox2.position.x.toFixed(0)}, ${this.packingBox2.position.y.toFixed(0)})`);
        }
        if (this.packingBox3) {
            this.packingBoxInitialPositions[2] = this.packingBox3.position.clone();
            console.log(`[Debug] 📦 打包盒3初始位置: (${this.packingBox3.position.x.toFixed(0)}, ${this.packingBox3.position.y.toFixed(0)})`);
        }
        
        const disableCookingInputs = this.shouldDisableCookingInputs();
        if (disableCookingInputs) {
            console.log('[CookingControllerV2] 检测到饭包场景，跳过食材按钮与鼠标跟随');
            this.currentHandItem = null;
            this.handItemCount = 0;
            this._isMouseFollowing = false;
            if (this.mouseFollower) {
                this.mouseFollower.active = false;
            }
            input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
            input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
            this.removeNativeMouseListener();
        } else {
            this.setupButtons();
            this.setupMouseFollower();
            this.setupTrashBin();
            this.createSausageContainer();
        }
        this.setupServeButton();
        if (!this.singleDishMode) {
            this.setupCustomers();
        } else if (this.customerArea) {
            this.customerArea.active = false;
        }
        
        // 初始化为未营业状态，禁用所有功能
        this.setBusinessState(false);
        
        // 注册时间管理器回调（在onLoad最后尝试，start中会再次确认）
        if (!this.singleDishMode) {
            this.setupTimeManager();
        }
        
        // 初始化UI显示
        this.updateMoneyDisplay();
        this.updateReviewDisplay();
        
        // 🔥 创建临时测试按钮
        this.createTestButton();
        this.bindDebugEventPanelButtons();
        
        // 📱 初始化手机面板UI系统
        if (this.phonePanel) {
            this.phonePanel.active = false;
            if (!this.phonePanel.getComponent(UITransform)) {
                this.phonePanel.addComponent(UITransform);
            }
        }
        
        if (!this.errorPanel) {
            this.errorPanel = new Node('ErrorPanel');
            const t = this.errorPanel.addComponent(UITransform);
            t.setContentSize(480, 80);
            this.errorLabel = this.errorPanel.addComponent(Label);
            this.errorLabel.fontSize = 24;
            this.errorLabel.color = new Color(255, 255, 255, 255);
            this.errorPanel.active = false;
            this.node.addChild(this.errorPanel);
            this.errorPanel.setPosition(0, 260, 0);
            this.errorPanel.setSiblingIndex(9999);
        }
        
        // 设置手机按钮点击事件（优先使用 Button 点击事件，避免重复触发）
        if (this.phoneButton) {
            const phoneBtnComp = this.phoneButton.getComponent(Button);
            if (phoneBtnComp) {
                // 如果场景里没有配置 clickEvents，则用代码兜底绑定
                if (!phoneBtnComp.clickEvents || phoneBtnComp.clickEvents.length === 0) {
                    this.phoneButton.off(Button.EventType.CLICK, this.onPhoneButtonClick, this);
                    this.phoneButton.on(Button.EventType.CLICK, this.onPhoneButtonClick, this);
                }
            } else {
                this.phoneButton.off(Node.EventType.TOUCH_END, this.onPhoneButtonClick, this);
                this.phoneButton.on(Node.EventType.TOUCH_END, this.onPhoneButtonClick, this);
            }
        }
        
        // 手机面板已改为显示评价历史，无需绑定删除按钮
        
        // 旧教程面板已移除，仍保留教程代理以接入新教程系统
        this.findTutorialManager();
        this.setupWorldStoryTaskHud();
        
        // 🎲 初始化新事件系统V2
        if (!this.singleDishMode) {
            this.initializeSpecialEventSystem();
            this.initializeEventSystemV2();
        }
    }

    private shouldDisableCookingInputs(): boolean {
        if (this.node?.getChildByName('RiceBundleRoot')) return true;
        if (this.node?.getChildByName('GuoBaoRouRoot')) return true;
        const scene = director.getScene();
        const canvas = scene?.getChildByName('Canvas');
        if (canvas?.getChildByName('RiceBundleRoot')) return true;
        if (canvas?.getChildByName('GuoBaoRouRoot')) return true;
        const riceBundleRoot = find('Canvas/RiceBundleRoot') || find('RiceBundleRoot');
        const guoBaoRouRoot = find('Canvas/GuoBaoRouRoot') || find('GuoBaoRouRoot');
        return !!riceBundleRoot || !!guoBaoRouRoot;
    }

    /**
     * 🎲 初始化新事件系统V2
     */
    private initializeSpecialEventSystem() {
        if (!this.useSpecialEventSystem) return;
        if (this.specialEventSystem) return;
        this.useEventSystemV2 = false;

        const canvas = find('Canvas') || this.node.parent?.parent || this.node.parent || this.node;
        if (!canvas) {
            console.error('[CookingControllerV2] ❌ 无法找到Canvas，事件系统初始化失败');
            return;
        }

        let systemNode = canvas.getChildByName('SpecialEventSystem');
        if (!systemNode) {
            systemNode = new Node('SpecialEventSystem');
            canvas.addChild(systemNode);
        }

        let system = systemNode.getComponent(SpecialEventSystem);
        if (!system) {
            system = systemNode.addComponent(SpecialEventSystem);
        }
        this.specialEventSystem = system;

        system.initialize({
            getLevelId: () => this.getCurrentLevelId(),
            areAllCustomersCleared: () => this.areCustomersCleared(),
            setCustomerClearing: (clearing) => {
                this.eventState.customerClearing = clearing;
                if (clearing) {
                    this.stopCustomerSpawn();
                }
            },
            setEventPhase: (active) => {
                this.eventState.isEventPhase = active;
                if (!active) {
                    this.eventState.customerClearing = false;
                }
            },
            markLegacyTrigger: (hour, minute) => {
                const timeKey = `time_${hour + minute / 60}`;
                if (this.eventState.triggeredToday.indexOf(timeKey) === -1) {
                    this.eventState.triggeredToday.push(timeKey);
                }
            },
            showMessage: (message) => this.showMessage(message),
            addEventMessage: (sender, icon, content, eventId) => this.addEventMessage(sender, icon, content, eventId),
            getMoney: () => this.getCurrentWallet(),
            getMainIngredientCount: () => this.getMainIngredientAvailableCount(),
            applyMoneyDelta: (delta) => this.applySpecialEventMoneyDelta(delta),
            applyHeatDelta: (delta) => this.updateShopHeat(delta),
            applyMainIngredientDelta: (delta) => this.applySpecialEventMainIngredientDelta(delta),
            isBusinessOpen: () => this.isBusinessOpen
        });
    }

    private initializeEventSystemV2() {
        if (this.useSpecialEventSystem) return;
        if (!this.useEventSystemV2) return;
        
        // 获取Canvas节点 - 查找正确的Canvas
        let canvas = find('Canvas') || find('CookingScene/Canvas');
        if (!canvas) {
            canvas = this.node.parent?.parent || this.node.parent || this.node;
        }
        
        console.log(`[CookingControllerV2] 🎲 初始化事件系统V2，Canvas: ${canvas?.name}`);
        
        // 创建事件系统集成组件
        const eventNode = new Node('EventSystemV2');
        canvas.addChild(eventNode);
        eventNode.setSiblingIndex(9999);  // 确保在最顶层
        this.eventSystemV2 = eventNode.addComponent(EventSystemIntegration);
        
        // 初始化事件系统
        this.eventSystemV2.initialize(canvas, {
            onMoneyChange: (amount: number) => {
                this.totalMoney += amount;
                this.updateMoneyDisplay();
                if (amount > 0) {
                    this.showMessage(`💰 +${amount}`);
                } else if (amount < 0) {
                    this.showMessage(`💸 ${amount}`);
                }
            },
            onHeatChange: (amount: number) => {
                this.shopHeat = Math.max(0, Math.min(100, this.shopHeat + amount));
                if (amount > 0) {
                    this.showMessage(`🔥 热度+${amount}`);
                } else if (amount < 0) {
                    this.showMessage(`❄️ 热度${amount}`);
                }
            },
            onEventStart: () => {
                // 停止生成新顾客（但保留现有顾客让玩家处理）
                this.eventState.customerClearing = true;
                this.eventState.isEventPhase = true;
                
                // 标记最近的事件时间点已触发（防止isAtEventTriggerTime继续返回true）
                const timeManager = TimeManager.instance;
                if (timeManager) {
                    const hour = timeManager.getCurrentHour();
                    const minute = timeManager.getCurrentMinute();
                    const currentTime = hour + minute / 60;
                    
                    // 找到最近的事件时间点并标记
                    const eventTimes = [
                        { hour: 13, minute: 30 },
                        { hour: 15, minute: 30 },
                        { hour: 18, minute: 0 },
                        { hour: 20, minute: 30 }
                    ];
                    
                    for (const et of eventTimes) {
                        const eventTime = et.hour + et.minute / 60;
                        if (Math.abs(currentTime - eventTime) < 0.1) {  // 约6分钟内
                            const triggerId = `time_${et.hour}_${et.minute}`;
                            if (this.eventState.triggeredToday.indexOf(triggerId) === -1) {
                                this.eventState.triggeredToday.push(triggerId);
                                console.log(`[CookingControllerV2] ✅ 标记事件时间点已触发: ${triggerId}`);
                            }
                            break;
                        }
                    }
                }
                
                console.log('[CookingControllerV2] 🛑 停止生成新顾客，等待当前顾客处理完...');
            },
            onEventEnd: () => {
                this.eventState.isEventPhase = false;
                this.eventState.customerClearing = false;
                
                // 🎲 恢复顾客生成
                this.showMessage('📢 继续营业！');
                
                // 延迟一下再生成顾客，避免冲突
                this.scheduleOnce(() => {
                    // 根据热度生成顾客
                    const maxCustomers = this.getMaxCustomersByHeat();
                    for (let i = 0; i < Math.min(maxCustomers, this.customers.length); i++) {
                        const customer = this.customers[i];
                        if (customer.node && !customer.node.active) {
                            this.spawnCustomerAt(i);
                        }
                    }
                    console.log('[CookingControllerV2] ✅ 事件结束，顾客已恢复');
                }, 0.5);
            },
            onMessageSend: (sender: string, icon: string, content: string, eventId: string) => {
                // 💬 添加事件消息到消息中心
                this.addEventMessage(sender, icon, content, eventId);
            },
            onProductionChallengeStart: (targetCount: number, senderName: string, senderIcon: string) => {
                // 🎯 显示制作挑战交付目标
                this.showProductionDeliveryTarget(targetCount, senderName, senderIcon);
            },
            onProductionChallengeEnd: () => {
                // 🎯 隐藏制作挑战交付目标
                this.hideProductionDeliveryTarget();
            }
        });
        
        // 设置顾客检查回调（用于判断是否所有顾客都已处理完）
        this.eventSystemV2.setCustomerCheckCallback(() => {
            return this.areAllCustomersCleared();
        });
        
        console.log('[CookingControllerV2] ✅ 事件系统V2已初始化');
    }
    
    /**
     * 检查是否到达事件触发时间（用于提前阻止顾客生成）
     */
    private isAtEventTriggerTime(): boolean {
        const timeManager = TimeManager.instance;
        if (!timeManager) return false;
        
        const hour = timeManager.getCurrentHour();
        const minute = timeManager.getCurrentMinute();
        const currentTime = hour + minute / 60;
        
        // 事件触发时间点
        const eventTimes = [
            { hour: 13, minute: 30 },  // 午餐
            { hour: 15, minute: 30 },  // 下午
            { hour: 18, minute: 0 },   // 晚餐
            { hour: 20, minute: 30 }   // 夜市
        ];
        
        for (const et of eventTimes) {
            const eventTime = et.hour + et.minute / 60;
            // 如果当前时间在事件时间的前后1分钟内，且该事件还未触发
            if (Math.abs(currentTime - eventTime) < 0.02) {  // 约1分钟
                const triggerId = `time_${et.hour}_${et.minute}`;
                if (this.eventState.triggeredToday.indexOf(triggerId) === -1) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * 检查是否所有顾客都已处理完（没有活跃顾客）
     * 只有当所有顾客都不可见时才返回true
     */
    public areAllCustomersCleared(): boolean {
        // 如果顾客数组为空，说明还没初始化，不能算清空
        if (this.customers.length === 0) {
            console.log('[CookingControllerV2] ⚠️ 顾客数组为空，等待初始化');
            return false;
        }
        
        // 遍历所有顾客位置，检查是否有可见的顾客
        for (let i = 0; i < this.customers.length; i++) {
            const customer = this.customers[i];
            // 如果顾客节点存在且可见，说明还在场
            if (customer.node && customer.node.active) {
                return false;
            }
        }
        
        // 所有顾客都不可见，可以弹出事件
        console.log('[CookingControllerV2] ✅ 所有顾客已离开');
        return true;
    }

    start() {
        // 🖌️ 初始化时显示刷子在酱料按钮上方
        this.showBrushOnSauceButton();
        
        // 🍴 初始化铲子图片（保存当前图片作为"有铲子"的状态）
        this.initSpatulaSpriteFrames();
        
        // 🔥 添加键盘监听：按 T 键跳过教程
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);

        EventManager.Instance.emit(GuideEvents.COOKING_ENTER);

        if (this.singleDishMode) {
            // 单份料理模式：不启用营业/顾客/时间/教程
            const tutorialPanel = find('Canvas/TutorialPanel');
            if (tutorialPanel) {
                tutorialPanel.active = false;
            }
            if (this.customerArea) {
                this.customerArea.active = false;
            }
            return;
        }

        // 确保TimeManager回调已注册（有时onLoad时TimeManager还未初始化）
        this.ensureTimeManagerCallbacks();
        
        // 🔥 初始化库存系统
        this.initInventorySystem();

        // 新教程从 Shop 接入：教学中不强制营业，避免时间流逝
        const inGuideTutorial = this.tutorialManager?.isInTutorial() ?? false;
        this.scheduleOnce(() => {
            const timeManager = TimeManager.instance;
            if (!inGuideTutorial && timeManager) {
                timeManager.forceRestart();
            }
            if (!inGuideTutorial) {
                this.setBusinessState(true);
                this.showMessage('🏪 欢迎光临！开始营业！12:00');
            } else {
                this.setBusinessState(false);
                if (this.customerArea) {
                    this.customerArea.active = false;
                }
                this.customers.forEach(customer => {
                    if (customer.node) customer.node.active = false;
                });
                if (this.serveButton) {
                    this.serveButton.interactable = true;
                }
                this.showMessage('📚 教程中：按提示完成一份烤冷面');
            }
        }, 0.5);
    }
    
    /**
     * 键盘事件处理
     */
    private onKeyDown(event: EventKeyboard) {
        // 按 T 键跳过教程
        if (event.keyCode === KeyCode.KEY_T) {
            if (this.tutorialManager && this.tutorialManager.isInTutorial()) {
                console.log('[CookingControllerV2] ⏭️ 按下 T 键，跳过教程！');
                this.tutorialManager.skipTutorialForTest();
            }
        }
        
        // 🧪 按 D 键显示/隐藏事件调试面板
        if (event.keyCode === KeyCode.KEY_D) {
            if (this._debugEventPanel) {
                this._debugEventPanel.active = !this._debugEventPanel.active;
                console.log(`[Debug] 调试面板 ${this._debugEventPanel.active ? '显示' : '隐藏'}`);
            } else {
                this.createDebugEventButtons();
            }
        }
        
        // E 键功能已移除，只能通过"重新开始"按钮来重玩关卡
        // if (event.keyCode === KeyCode.KEY_E) { ... }
    }
    
    /** 查找教程管理器 */
    private findTutorialManager() {
        let tutorialPanel = find('Canvas/TutorialPanel');
        if (!tutorialPanel) {
            tutorialPanel = find('CookingScene/Canvas/TutorialPanel');
        }
        
        if (tutorialPanel) {
            this.tutorialManager = tutorialPanel.getComponent(TutorialManager);
            if (this.tutorialManager) {
                // 设置 CookingController 引用，用于 NPC 对话
                this.tutorialManager.setCookingController(this);
            }
            return;
        }

        // 旧教程面板已移除，回退到全局 TutorialManager / 临时代理
        if (!this.tutorialManager) {
            if (TutorialManager.instance) {
                this.tutorialManager = TutorialManager.instance;
            } else {
                const canvas = find('Canvas') || this.node.parent || this.node;
                const proxyNode = new Node('TutorialProxy');
                canvas.addChild(proxyNode);
                this.tutorialManager = proxyNode.addComponent(TutorialManager);
            }
        }
    }

    private setupWorldStoryTaskHud(): void {
        if (this.singleDishMode) return;
        if (!FeatureGate.ENABLE_WORLD_SINGLE_FLOW || !FeatureGate.ENABLE_DAILY_STORY_TASKS) return;
        if (!this.worldStoryTaskHud) {
            this.worldStoryTaskHud = new WorldStoryTaskHud(this);
        }
        this.worldStoryTaskHud.setup();
    }
    
    /** 触发教程动作 */
    private triggerTutorialAction(action: string, foodData?: any) {
        if (this.tutorialManager) {
            this.tutorialManager.triggerAction(action, foodData);
            console.log(`[CookingControllerV2] 📚 触发教程动作: ${action}`);
        }
        EventManager.Instance.emit(GuideEvents.COOKING_ACTION, action, foodData);
    }
    
    /**
     * 🎨 创建工作区域视觉界面
     * 清晰划分各个功能区域
     */
    private setupWorkAreaUI() {
        const canvas = this.node.parent;
        if (!canvas) return;
        
        // 创建工作区域容器（放在最底层）
        const workAreasNode = new Node('WorkAreas');
        canvas.addChild(workAreasNode);
        workAreasNode.setSiblingIndex(0);
        
        // ==================== 背景 ====================
        console.log('[CookingControllerV2] 🎨 开始创建背景...');
        const bgNode = new Node('CookingBg');
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        bgSprite.type = Sprite.Type.SIMPLE;
        const bgTransform = bgNode.getComponent(UITransform);
        if (bgTransform) bgTransform.setContentSize(1920, 1080);
        workAreasNode.addChild(bgNode);
        
        if (this.bgSpriteFrame) {
            bgSprite.spriteFrame = this.bgSpriteFrame;
            bgSprite.color = Color.WHITE;
            console.log('[CookingControllerV2] ✅ 背景图片已绑定!');
        } else {
            bgSprite.color = new Color(50, 45, 40, 255);
            console.warn('[CookingControllerV2] ⚠️ 背景图片未绑定，请在编辑器中设置 bgSpriteFrame');
        }
        
        // ==================== 烤盘区域（中央） ====================
        this.createWorkArea(workAreasNode, {
            name: '🔥 烤盘区',
            x: 0, y: 45,
            width: 1170, height: 630,
            bgColor: new Color(70, 50, 40, 240),
            borderColor: new Color(255, 120, 50, 255),
            titleColor: new Color(255, 180, 100, 255)
        });
        
        // 火焰装饰
        const flameNode = new Node('Flames');
        const flameLabel = flameNode.addComponent(Label);
        flameLabel.string = '🔥  🔥  🔥  🔥  🔥';
        flameLabel.fontSize = 42;
        flameNode.setPosition(0, -150, 0);
        workAreasNode.addChild(flameNode);
        
        // 火焰动画
        this.scheduleFlameAnimation(flameNode);
        
        // ==================== 食材区域（左侧） ====================
        this.createWorkArea(workAreasNode, {
            name: '🥗 食材',
            x: -570, y: -75,
            width: 300, height: 570,
            bgColor: new Color(50, 70, 50, 240),
            borderColor: new Color(100, 200, 100, 255),
            titleColor: new Color(180, 255, 180, 255)
        });
        
        // ==================== 调料区域（右上） ====================
        this.createWorkArea(workAreasNode, {
            name: '🧂 调料',
            x: 570, y: 150,
            width: 300, height: 330,
            bgColor: new Color(60, 50, 70, 240),
            borderColor: new Color(180, 120, 200, 255),
            titleColor: new Color(220, 180, 255, 255)
        });
        
        // ==================== 打包区域（右下） ====================
        this.createWorkArea(workAreasNode, {
            name: '📦 打包',
            x: 570, y: -180,
            width: 300, height: 270,
            bgColor: new Color(60, 55, 45, 240),
            borderColor: new Color(200, 180, 100, 255),
            titleColor: new Color(255, 230, 150, 255)
        });
        
        // ==================== 出餐/顾客区域（底部） ====================
        this.createWorkArea(workAreasNode, {
            name: '🍽️ 顾客等待区',
            x: 0, y: -420,
            width: 900, height: 180,
            bgColor: new Color(50, 50, 60, 240),
            borderColor: new Color(120, 150, 200, 255),
            titleColor: new Color(180, 200, 255, 255)
        });
        
        // ==================== 订单区域（顶部） ====================
        this.createWorkArea(workAreasNode, {
            name: '📋 当前订单',
            x: 0, y: 435,
            width: 975, height: 150,
            bgColor: new Color(55, 45, 40, 240),
            borderColor: new Color(255, 200, 100, 255),
            titleColor: new Color(255, 220, 150, 255)
        });
        
        console.log('[CookingControllerV2] ✅ 工作区域UI初始化完成');
    }
    
    /**
     * 创建单个工作区域
     */
    private createWorkArea(parent: Node, config: {
        name: string, x: number, y: number, 
        width: number, height: number,
        bgColor: Color, borderColor: Color, titleColor: Color
    }) {
        const areaNode = new Node(`Area_${config.name}`);
        areaNode.setPosition(config.x, config.y, 0);
        parent.addChild(areaNode);
        
        // 背景
        const bg = new Node('Bg');
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.color = config.bgColor;
        const bgTransform = bg.getComponent(UITransform);
        if (bgTransform) bgTransform.setContentSize(config.width, config.height);
        areaNode.addChild(bg);
        
        // 边框
        this.createAreaBorder(areaNode, config.width, config.height, config.borderColor);
        
        // 标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = config.name;
        titleLabel.fontSize = 14;
        titleLabel.color = config.titleColor;
        titleLabel.isBold = true;
        titleNode.setPosition(0, config.height / 2 - 14, 0);
        areaNode.addChild(titleNode);
    }
    
    /**
     * 创建区域边框
     */
    private createAreaBorder(parent: Node, width: number, height: number, color: Color) {
        const borderWidth = 2;
        
        // 四条边
        const positions = [
            { x: 0, y: height / 2, w: width, h: borderWidth },
            { x: 0, y: -height / 2, w: width, h: borderWidth },
            { x: -width / 2, y: 0, w: borderWidth, h: height },
            { x: width / 2, y: 0, w: borderWidth, h: height },
        ];
        
        positions.forEach((pos, i) => {
            const border = new Node(`Border_${i}`);
            const sprite = border.addComponent(Sprite);
            sprite.color = color;
            const transform = border.getComponent(UITransform);
            if (transform) transform.setContentSize(pos.w, pos.h);
            border.setPosition(pos.x, pos.y, 0);
            parent.addChild(border);
        });
        
        // 角落装饰
        const cornerSize = 10;
        const corners = [
            { x: -width / 2, y: height / 2 },
            { x: width / 2, y: height / 2 },
            { x: -width / 2, y: -height / 2 },
            { x: width / 2, y: -height / 2 },
        ];
        
        corners.forEach((pos, i) => {
            const corner = new Node(`Corner_${i}`);
            const sprite = corner.addComponent(Sprite);
            sprite.color = color;
            const transform = corner.getComponent(UITransform);
            if (transform) transform.setContentSize(cornerSize, cornerSize);
            corner.setPosition(pos.x, pos.y, 0);
            parent.addChild(corner);
        });
    }
    
    /**
     * 火焰动画
     */
    private scheduleFlameAnimation(flameNode: Node) {
        const flamePatterns = [
            '🔥  🔥  🔥  🔥  🔥',
            ' 🔥  🔥  🔥  🔥 ',
            '🔥   🔥   🔥   🔥',
            '  🔥  🔥  🔥  ',
        ];
        
        let patternIndex = 0;
        this.schedule(() => {
            const label = flameNode.getComponent(Label);
            if (label) {
                label.string = flamePatterns[patternIndex];
                patternIndex = (patternIndex + 1) % flamePatterns.length;
            }
            
            tween(flameNode)
                .to(0.1, { position: new Vec3(0, -98 + Math.random() * 4, 0) })
                .start();
        }, 0.2);
    }
    
    /**
     * 验证食物是否可以打包（教程模式用）
     * @returns { valid: boolean, reason: string, dialogKey: string }
     */
    private validateFoodForPacking(food: FoodItem): { valid: boolean, reason: string, dialogKey: string } {
        console.log('[CookingControllerV2] 🔍 验证食物是否可打包...');
        console.log(`  - 状态: ${food.state}`);
        console.log(`  - 鸡蛋数: ${food.eggCount}`);
        console.log(`  - 有酱料: ${food.hasSauce}`);
        console.log(`  - 食材: ${JSON.stringify(food.addedIngredients)}`);
        
        // 检查是否烧焦
        if (food.state === DoughState.BURNT) {
            return { valid: false, reason: '食物烧焦了！扔掉重做！', dialogKey: 'verify_burnt' };
        }
        
        // 检查是否有鸡蛋
        if (food.eggCount === 0) {
            return { valid: false, reason: '没打鸡蛋！加个蛋再打包！', dialogKey: 'verify_no_egg' };
        }
        
        // 检查是否有酱料
        if (!food.hasSauce) {
            return { valid: false, reason: '没刷酱料！刷了酱再打包！', dialogKey: 'verify_no_sauce' };
        }
        
        // 检查调料数量（至少2种不同的调料）
        const uniqueCondiments = new Set<IngredientType>();
        for (const ing of food.addedIngredients) {
            if (ing === IngredientType.CHILI || ing === IngredientType.SUGAR || ing === IngredientType.VINEGAR) {
                uniqueCondiments.add(ing);
            }
        }
        
        if (uniqueCondiments.size < 2) {
            return { valid: false, reason: '调料不够！至少加2种调料！', dialogKey: 'verify_no_condiments' };
        }
        
        // 验证通过
        console.log('[CookingControllerV2] ✅ 食物验证通过！');
        return { valid: true, reason: '', dialogKey: '' };
    }

    /**
     * 确保TimeManager回调已注册
     */
    private ensureTimeManagerCallbacks() {
        if (this.singleDishMode) return;
        const timeManager = TimeManager.instance;
        if (!timeManager) {
            console.error('[CookingControllerV2] ❌ TimeManager未找到，将在1秒后重试');
            setTimeout(() => this.ensureTimeManagerCallbacks(), 1000);
            return;
        }

        console.log('[CookingControllerV2] ✅ TimeManager已找到，重新注册回调');
        this.setupTimeManager();
        if (!timeManager.isBusinessOpen()) {
            timeManager.startDay();
            console.log('[CookingControllerV2] 自动开始营业（TimeManager 已就绪）');
        }
    }

    // 当前鼠标位置（用于实时跟随）
    private _currentMousePos: Vec2 = new Vec2();
    private _isMouseFollowing: boolean = false;
    private _uiHitTestDisabled: boolean = false;
    private _blockedHitTests: Map<Node, Function> = new Map();
    
    update(dt: number) {
        // 教程模式下不更新烹饪状态（不会烤焦）
        // 🔧 调试：如果 debugPauseBurning 为 true，也暂停烤焦
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        this.ensureTimeProgress(dt);
        
        if (!inTutorial && !this.debugPauseBurning) {
            // 更新所有面饼的烹饪状态
            this.foodItems.forEach(food => food.update(dt));
        } else {
            // 教程/调试暂停时仍更新外观，确保面饼可见
            this.foodItems.forEach(food => food.updateVisualState());
        }
        
        // 更新香肠烤制状态（教程和非教程都烤制）
        if (this.sausages.length > 0) {
            this.updateSausageCooking(dt);
        }
        
        // 🖱️ 实时更新 mouseFollower 位置（每帧更新，确保跟随流畅）
        if (this._isMouseFollowing && this.mouseFollower && this.currentHandItem) {
            this.updateMouseFollowerFromCache();
        }

        this.updateUiHitTestState();
        
    }

    private updateUiHitTestState(): void {
        // 刷酱模式由 BrushSauceController 单独接管 hitTest，避免互相覆盖
        if (this.brushSauceController?.isActive) {
            this.enableUiHitTest();
            return;
        }

        const shouldDisable = !!this.currentHandItem || this.isDragging || this._isMouseFollowing;
        if (shouldDisable) {
            this.disableUiHitTest();
        } else {
            this.enableUiHitTest();
        }
    }

    private disableUiHitTest(): void {
        if (this._uiHitTestDisabled) return;
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;

        const keepSet = this.buildUiHitTestKeepSet(canvas);
        this._uiHitTestDisabled = true;
        for (const child of canvas.children) {
            if (keepSet.has(child)) continue;
            this.disableNodeAndChildrenHitTest(child, keepSet);
        }
    }

    private enableUiHitTest(): void {
        if (!this._uiHitTestDisabled) return;
        for (const [node, originalHitTest] of this._blockedHitTests) {
            if (node && node.isValid) {
                const transform = node.getComponent(UITransform);
                if (transform) {
                    transform.hitTest = originalHitTest as any;
                }
            }
        }
        this._blockedHitTests.clear();
        this._uiHitTestDisabled = false;
    }

    private disableNodeAndChildrenHitTest(node: Node, keepSet: Set<Node>): void {
        if (keepSet.has(node)) return;
        const transform = node.getComponent(UITransform);
        if (transform && !this._blockedHitTests.has(node)) {
            this._blockedHitTests.set(node, transform.hitTest.bind(transform));
            transform.hitTest = () => false;
        }
        for (const child of node.children) {
            this.disableNodeAndChildrenHitTest(child, keepSet);
        }
    }

    private buildUiHitTestKeepSet(canvas: Node): Set<Node> {
        const keep = new Set<Node>();
        const addNodeAndParents = (node: Node | null) => {
            let current = node;
            while (current) {
                keep.add(current);
                if (current === canvas) break;
                current = current.parent;
            }
        };
        const add = (node?: Node | null) => {
            if (node && node.isValid) {
                addNodeAndParents(node);
            }
        };

        // 关键交互节点：制作按钮/铁板/打包/垃圾桶/跟随物
        add(this.grillArea);
        add(this.foodContainer);
        add(this.mouseFollower);
        add(this.trashBin);
        add(this.serveButton?.node);
        add(this.packingBox1);
        add(this.packingBox2);
        add(this.packingBox3);
        add(this.doughBtn);
        add(this.eggBtn);
        add(this.onionBtn);
        add(this.cilantroBtn);
        add(this.sausageBtn);
        add(this.sauceBtn?.node);
        add(this.chiliBtn?.node);
        add(this.sugarBtn?.node);
        add(this.vinegarBtn?.node);
        add(this.oilBtn?.node);
        add(this.waterBtn?.node);
        add(this.spatulaBtn?.node);

        // 兜底：按名称查找（避免绑定缺失导致误禁）
        add(find('Canvas/IngredientsPanel'));
        add(find('Canvas/GrillArea'));
        add(find('Canvas/GrillArea/FoodContainer'));
        add(find('Canvas/MouseFollower'));
        add(find('Canvas/HandItem'));
        add(find('Canvas/BrushSauceSystem'));
        add(find('Canvas/Brush'));
        add(find('Canvas/TrashBin'));
        add(find('Canvas/ServeButton'));
        add(find('Canvas/PackingBox1'));
        add(find('Canvas/PackingBox2'));
        add(find('Canvas/PackingBox3'));
        add(find('Canvas/OilBtn'));
        add(find('Canvas/WaterBtn'));
        add(find('Canvas/SpatulaBtn'));
        add(find('Canvas/SauceBtn'));
        add(find('Canvas/ChiliBtn'));
        add(find('Canvas/SugarBtn'));
        add(find('Canvas/VinegarBtn'));

        return keep;
    }
    
    private ensureTimeProgress(dt: number): void {
        if (this.singleDishMode) return;
        const timeManager = TimeManager.instance;
        if (!timeManager) return;
        if (this.tutorialManager?.isInTutorial()) return;

        if (!this.manualTimeTick) {
            const hour = timeManager.getCurrentHour();
            const minute = timeManager.getCurrentMinute();
            if (hour === this.lastTimeHour && minute === this.lastTimeMinute) {
                this.timeFreezeTimer += dt;
                if (this.timeFreezeTimer >= 1.5) {
                    this.manualTimeTick = true;
                    if (!timeManager.isBusinessOpen()) {
                        timeManager.forceRestart();
                    }
                }
            } else {
                this.lastTimeHour = hour;
                this.lastTimeMinute = minute;
                this.timeFreezeTimer = 0;
            }
        }

        if (this.manualTimeTick && timeManager.isBusinessOpen()) {
            timeManager.update(dt);
            this.lastTimeHour = timeManager.getCurrentHour();
            this.lastTimeMinute = timeManager.getCurrentMinute();
        }
    }
    
    /**
     * 从缓存的鼠标位置更新 mouseFollower
     * 
     * 坐标系说明：
     * - _currentMousePos 已经是 Canvas 本地坐标（由 onMouseMove 转换）
     * - 直接使用即可
     */
    private updateMouseFollowerFromCache() {
        if (!this.mouseFollower) return;
        
        // _currentMousePos 已经是 Canvas 本地坐标，直接使用
        this.mouseFollower.setPosition(this._currentMousePos.x, this._currentMousePos.y, 0);
        
        // 🔥 持续确保层级最高，防止被其他元素遮挡
        this.mouseFollower.setSiblingIndex(9999);
    }

    /**
     * 设置鼠标跟随
     */
    private setupMouseFollower() {
        if (!this.mouseFollower) {
            console.warn('[CookingControllerV2] ⚠️ MouseFollower节点未绑定！');
            return;
        }

        console.log('[CookingControllerV2] ✅ MouseFollower节点已绑定');
        
        this.mouseFollower.active = false;

        // 确保锚点在中心，使鼠标在食材中心
        const uiTransform = this.mouseFollower.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setAnchorPoint(0.5, 0.5);
        }
        
        // 确保有Label组件
        let label = this.mouseFollower.getComponent(Label);
        if (!label) {
            console.log('[CookingControllerV2] 创建Label组件');
            label = this.mouseFollower.addComponent(Label);
            label.fontSize = 60;
            label.horizontalAlign = 1; // CENTER
            label.verticalAlign = 1; // CENTER
            label.color = new Color(255, 255, 255, 255);
        }

        // 监听鼠标移动和右键点击
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        
        // 🔥 使用原生 canvas 事件监听，绕过 UI 元素的拦截
        this.setupNativeMouseListener();
    }
    
    // 🔥 原生鼠标事件监听器引用（用于移除）
    private _nativeMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
    
    /**
     * 🔥 设置原生 canvas 鼠标监听（绕过 Cocos UI 事件系统）
     */
    private setupNativeMouseListener() {
        // 尝试多种方式获取 canvas
        let canvas = game.canvas;
        if (!canvas) {
            canvas = document.querySelector('canvas') as HTMLCanvasElement;
        }
        if (!canvas) return;
        
        // 移除旧的监听器
        if (this._nativeMouseMoveHandler) {
            window.removeEventListener('mousemove', this._nativeMouseMoveHandler);
        }
        
        this._nativeMouseMoveHandler = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            
            // 检查鼠标是否在 canvas 区域内
            if (e.clientX < rect.left || e.clientX > rect.right ||
                e.clientY < rect.top || e.clientY > rect.bottom) {
                return;
            }
            
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const nativeX = (e.clientX - rect.left) * scaleX;
            const nativeY = (e.clientY - rect.top) * scaleY;
            
            const designSize = view.getDesignResolutionSize();
            const uiX = nativeX * designSize.width / canvas.width;
            const uiY = designSize.height - (nativeY * designSize.height / canvas.height);
            
            // 更新缓存的鼠标位置
            if (this.mouseFollower && this.mouseFollower.parent) {
                const parentTransform = this.mouseFollower.parent.getComponent(UITransform);
                if (parentTransform) {
                    const canvasSize = parentTransform.contentSize;
                    const scaleToCanvas = canvasSize.width / designSize.width;
                    this._currentMousePos.set(
                        uiX * scaleToCanvas - canvasSize.width / 2,
                        uiY * scaleToCanvas - canvasSize.height / 2
                    );
                    
                    // 🔥 立即更新 mouseFollower 位置（不等 update）
                    if (this._isMouseFollowing && this.mouseFollower.active) {
                        this.mouseFollower.setPosition(this._currentMousePos.x, this._currentMousePos.y, 0);
                    }
                }
            }
        };
        
        window.addEventListener('mousemove', this._nativeMouseMoveHandler);
    }
    
    /**
     * 🔥 移除原生鼠标监听
     */
    private removeNativeMouseListener() {
        if (this._nativeMouseMoveHandler) {
            window.removeEventListener('mousemove', this._nativeMouseMoveHandler);
            this._nativeMouseMoveHandler = null;
        }
    }
    
    /**
     * 🔥 从 Cocos 事件更新鼠标位置缓存
     */
    private updateMousePosFromEvent(event: EventTouch | EventMouse) {
        if (!this.mouseFollower || !this.mouseFollower.parent) return;
        
        const uiPos = event.getUILocation();
        const parentTransform = this.mouseFollower.parent.getComponent(UITransform);
        if (!parentTransform) return;
        
        const designSize = view.getDesignResolutionSize();
        const canvasSize = parentTransform.contentSize;
        const scaleToCanvas = canvasSize.width / designSize.width;
        
        this._currentMousePos.set(
            uiPos.x * scaleToCanvas - canvasSize.width / 2,
            uiPos.y * scaleToCanvas - canvasSize.height / 2
        );
    }

    /**
     * 设置垃圾桶
     */
    private setupTrashBin() {
        if (!this.trashBin) {
            console.warn('[CookingControllerV2] 垃圾桶节点未绑定');
            return;
        }

        // 获取垃圾桶的Sprite组件
        this._trashBinSprite = this.trashBin.getComponent(Sprite);
        if (!this._trashBinSprite) {
            // 尝试从子节点获取
            const spriteNode = this.trashBin.getChildByName('Sprite') || this.trashBin.children[0];
            if (spriteNode) {
                this._trashBinSprite = spriteNode.getComponent(Sprite);
            }
        }
        
        // 初始化为关闭状态
        this._isTrashOpen = false;
        this.setTrashBinState(false);
        
        console.log('[CookingControllerV2] 🗑️ 垃圾桶已设置（拖动交互）');
    }
    
    /**
     * 🗑️ 设置垃圾桶状态（打开/关闭）
     */
    private setTrashBinState(open: boolean) {
        if (!this._trashBinSprite) return;
        
        const uuid = open ? TRASH_IMAGE_UUIDS.OPEN : TRASH_IMAGE_UUIDS.CLOSED;
        if (!uuid) {
            console.warn('[CookingControllerV2] ⚠️ 垃圾桶图片UUID未配置');
            return;
        }
        
        assetManager.loadAny({ uuid: uuid }, (err, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame && this._trashBinSprite && this._trashBinSprite.isValid) {
                this._trashBinSprite.spriteFrame = spriteFrame;
            }
        });
    }
    
    /**
     * 🗑️ 播放垃圾桶打开动画
     */
    private openTrashBin() {
        if (this._isTrashOpen) return;
        this._isTrashOpen = true;
        
        // 切换到打开状态图片
        this.setTrashBinState(true);
        
        // 打开动画：轻微放大（缩小幅度）
        if (this.trashBin) {
            const originalScale = this.trashBin.scale.clone();
            tween(this.trashBin)
                .to(0.1, { scale: new Vec3(originalScale.x * 1.03, originalScale.y * 1.03, 1) })
                .start();
        }
        
        console.log('[CookingControllerV2] 🗑️ 垃圾桶打开');
    }
    
    /**
     * 🗑️ 播放垃圾桶关闭动画
     */
    private closeTrashBin() {
        if (!this._isTrashOpen) return;
        this._isTrashOpen = false;
        
        // 切换到关闭状态图片
        this.setTrashBinState(false);
        
        // 关闭动画：恢复原大小
        if (this.trashBin) {
            const originalScale = this.trashBin.scale.clone();
            tween(this.trashBin)
                .to(0.15, { scale: new Vec3(originalScale.x / 1.03, originalScale.y / 1.03, 1) })
                .start();
        }
        
        console.log('[CookingControllerV2] 🗑️ 垃圾桶关闭');
    }

    /**
     * 设置顾客系统
     */
    private setupCustomers() {
        if (!this.customerArea) {
            console.warn('[CookingControllerV2] 顾客区域未绑定');
            return;
        }

        // 查找所有顾客节点
        const customerNodes: Node[] = [];
        for (let i = 1; i <= 3; i++) {
            const customerNode = this.customerArea.getChildByName(`Customer${i}`);
            if (customerNode) {
                customerNodes.push(customerNode);
                // 初始时隐藏所有顾客
                customerNode.active = false;
                
                // 🔥 同时隐藏CustomerIcon，防止后续显示时闪烁
                const customerIconNode = customerNode.getChildByName('CustomerIcon');
                if (customerIconNode) {
                    customerIconNode.active = false;
                }
                
                // 🔥 设置初始顾客姓名
                const customerLabelNode = customerNode.getChildByName('CustomerLabel');
                if (customerLabelNode) {
                    const label = customerLabelNode.getComponent(Label);
                    if (label) {
                        // 获取随机顾客姓名
                        const customerNames = ['张大爷', '李阿姨', '王师傅', '赵小姐', '刘先生', 
                                              '陈大哥', '孙妹妹', '周老板', '吴大娘', '郑小伙'];
                        const randomName = customerNames[Math.floor(Math.random() * customerNames.length)];
                        label.string = randomName;
                        console.log(`[CookingControllerV2] 顾客${i}初始姓名设置为: ${randomName}`);
                    }
                }
            }
        }

        // 初始化顾客列表
        this.customers = customerNodes.map(node => ({
            node: node,
            order: null,
            orderLabel: null
        }));

        console.log(`[CookingControllerV2] 找到 ${this.customers.length} 个顾客节点（已隐藏并设置姓名）`);
    }
    
    /**
     * 🎯 显示制作挑战交付目标
     */
    public showProductionDeliveryTarget(targetCount: number, senderName: string, senderIcon: string) {
        // 如果已存在，先隐藏
        if (this.productionDeliveryTarget) {
            this.productionDeliveryTarget.destroy();
            this.productionDeliveryTarget = null;
        }
        
        // 创建交付目标节点
        this.productionDeliveryTarget = new Node('ProductionDeliveryTarget');
        
        // 添加到顾客区域（如果存在）或Canvas
        if (this.customerArea) {
            this.customerArea.addChild(this.productionDeliveryTarget);
            // 放在顾客区域中间位置
            this.productionDeliveryTarget.setPosition(0, 0, 0);
        } else {
            const canvas = find('Canvas');
            if (canvas) {
                canvas.addChild(this.productionDeliveryTarget);
                this.productionDeliveryTarget.setPosition(300, 150, 0);
            }
        }
        
        // 设置UITransform
        const transform = this.productionDeliveryTarget.addComponent(UITransform);
        transform.setContentSize(200, 160);
        
        // 背景
        const bgNode = new Node('Background');
        this.productionDeliveryTarget.addChild(bgNode);
        const bgGraphics = bgNode.addComponent(Graphics);
        bgGraphics.fillColor = new Color(60, 60, 80, 230);
        bgGraphics.roundRect(-100, -80, 200, 160, 15);
        bgGraphics.fill();
        bgGraphics.strokeColor = new Color(255, 200, 100, 255);
        bgGraphics.lineWidth = 3;
        bgGraphics.roundRect(-100, -80, 200, 160, 15);
        bgGraphics.stroke();
        
        // 发送人图标（大号表情）
        const iconNode = new Node('Icon');
        this.productionDeliveryTarget.addChild(iconNode);
        iconNode.setPosition(0, 35, 0);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = senderIcon || '📦';
        iconLabel.fontSize = 48;
        
        // 发送人名字
        const nameNode = new Node('Name');
        this.productionDeliveryTarget.addChild(nameNode);
        nameNode.setPosition(0, -5, 0);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = senderName || '订单';
        nameLabel.fontSize = 18;
        nameLabel.color = new Color(255, 255, 255, 255);
        
        // 提示文字
        const tipNode = new Node('Tip');
        this.productionDeliveryTarget.addChild(tipNode);
        tipNode.setPosition(0, -35, 0);
        const tipLabel = tipNode.addComponent(Label);
        tipLabel.string = `拖到这里交付`;
        tipLabel.fontSize = 14;
        tipLabel.color = new Color(255, 220, 100, 255);
        
        // 目标数量提示
        const countNode = new Node('Count');
        this.productionDeliveryTarget.addChild(countNode);
        countNode.setPosition(0, -55, 0);
        const countLabel = countNode.addComponent(Label);
        countLabel.string = `目标: ${targetCount}份`;
        countLabel.fontSize = 12;
        countLabel.color = new Color(200, 200, 200, 255);
        
        // 入场动画
        this.productionDeliveryTarget.setScale(0, 0, 1);
        tween(this.productionDeliveryTarget)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        
        // 呼吸动画提示可交互
        tween(this.productionDeliveryTarget)
            .repeatForever(
                tween()
                    .to(1.0, { scale: new Vec3(1.05, 1.05, 1) })
                    .to(1.0, { scale: new Vec3(1.0, 1.0, 1) })
            )
            .start();
        
        console.log(`[CookingControllerV2] 🎯 制作挑战交付目标已显示: ${senderName} ${senderIcon}`);
    }
    
    /**
     * 🎯 隐藏制作挑战交付目标
     */
    public hideProductionDeliveryTarget() {
        if (this.productionDeliveryTarget) {
            // 退场动画后销毁
            tween(this.productionDeliveryTarget)
                .to(0.2, { scale: new Vec3(0, 0, 1) })
                .call(() => {
                    if (this.productionDeliveryTarget) {
                        this.productionDeliveryTarget.destroy();
                        this.productionDeliveryTarget = null;
                    }
                })
                .start();
            
            console.log('[CookingControllerV2] 🎯 制作挑战交付目标已隐藏');
        }
    }

    /**
     * 清理所有订单和顾客显示
     */
    private clearAllOrders() {
        console.log('[CookingControllerV2] 🧹 开始清理所有订单和顾客...');
        
        this.customers.forEach((customer, index) => {
            // 隐藏顾客
            if (customer.node) {
                customer.node.active = false;
                console.log(`[CookingControllerV2] 隐藏顾客${index + 1}`);
            }
            
            // 销毁订单标签
            if (customer.orderLabel) {
                if (customer.orderLabel.isValid) {
                    customer.orderLabel.destroy();
                    console.log(`[CookingControllerV2] 销毁顾客${index + 1}的订单标签`);
                }
                customer.orderLabel = null;
            }
            
            // 清空订单数据
            customer.order = null;
        });
        
        console.log('[CookingControllerV2] ✅ 所有订单和顾客已清理');
    }

    /**
     * 清理所有油渍
     */
    private clearAllOilMarks() {
        console.log('[CookingControllerV2] 🧹 清理所有油渍...');
        
        this.oilMarks.forEach((oilMark, index) => {
            if (oilMark && oilMark.isValid) {
                oilMark.destroy();
                console.log(`[CookingControllerV2] 销毁位置${index}的油渍`);
            }
        });
        
        // 重置数组
        this.oilMarks = [null, null, null];
        
        console.log('[CookingControllerV2] ✅ 所有油渍已清理');
    }

    /**
     * 为所有顾客生成订单（根据时间和差评数量决定显示多少个顾客）
     */
    private generateOrdersForAllCustomers() {
        // 教程模式下不生成顾客（老王是唯一的教程顾客）
        if (this.tutorialManager && this.tutorialManager.isInTutorial()) {
            console.log('[CookingControllerV2] 📚 教程模式，跳过顾客生成');
            return;
        }
        
        console.log('[CookingControllerV2] 🎯 为所有顾客生成新订单...');
        
        // 获取时间进度（0-1，0=12:00，1=22:00）
        const timeManager = TimeManager.instance;
        let timeProgress = 0;
        if (timeManager) {
            timeProgress = timeManager.getBusinessProgress();
        }
        
        // 计算总评价数
        const totalReviews = this.superGoodReviews + this.goodReviews + this.badReviews;
        
        // 计算差评率
        let badReviewRatio = 0;
        if (totalReviews > 0) {
            badReviewRatio = this.badReviews / totalReviews;
        }
        
        // 1. 根据时间进度决定基础顾客数量（循序渐进）
        // 0%进度（12:00）= 1个顾客
        // 50%进度（17:00）= 2个顾客
        // 100%进度（22:00）= 3个顾客
        let baseCustomerCount = 1;  // 起始1个顾客
        if (timeProgress >= 0.75) {
            baseCustomerCount = 3;  // 75%进度后，最多3个顾客
        } else if (timeProgress >= 0.4) {
            baseCustomerCount = 2;  // 40%进度后，2个顾客
        } else {
            baseCustomerCount = 1;  // 40%进度前，1个顾客
        }
        
        // 2. 根据差评率调整顾客数量（差评率越高，顾客越少）
        let activeCustomerCount = baseCustomerCount;
        if (badReviewRatio >= 0.5) {
            // 差评率 >= 50%：减少2个顾客（最少1个）
            activeCustomerCount = Math.max(1, baseCustomerCount - 2);
            console.log(`[CookingControllerV2] ⚠️ 差评率${(badReviewRatio * 100).toFixed(0)}%，顾客数-2`);
        } else if (badReviewRatio >= 0.3) {
            // 差评率 >= 30%：减少1个顾客
            activeCustomerCount = Math.max(1, baseCustomerCount - 1);
            console.log(`[CookingControllerV2] ⚠️ 差评率${(badReviewRatio * 100).toFixed(0)}%，顾客数-1`);
        }
        
        // 确保不超过3个顾客
        activeCustomerCount = Math.min(3, activeCustomerCount);
        
        console.log(`[CookingControllerV2] ⏰ 时间进度: ${(timeProgress * 100).toFixed(0)}% | 基础顾客数: ${baseCustomerCount} | 差评率: ${(badReviewRatio * 100).toFixed(0)}% | 最终顾客数: ${activeCustomerCount}`);
        
        // 为每个顾客生成订单，但只显示前activeCustomerCount个
        this.customers.forEach((customer, index) => {
            if (customer.node) {
                if (index < activeCustomerCount) {
                    // 显示顾客并生成订单（传入顾客索引以决定难度）
                    const order = this.generateNewOrder(index);
                    customer.order = order;
                    
                    // 🔥 先隐藏CustomerIcon，防止闪烁
                    const customerIconNode = customer.node.getChildByName('CustomerIcon');
                    if (customerIconNode) {
                        customerIconNode.active = false;
                    }
                    
                    // 显示顾客（有订单就显示）
                    customer.node.active = true;
                    console.log(`[CookingControllerV2] 顾客${index + 1}显示`);
                    
                    // 创建订单UI（显示在顾客头顶，会加载新图片后再显示CustomerIcon）
                    this.createOrderUI(customer, index);
                    console.log(`[CookingControllerV2] 顾客${index + 1}订单UI已创建`);
                    
                    // 【重要】立即检查是否有提前做好的食物（同步执行，不延迟）
                    // 应用场景：玩家提前烤好食物，顾客刚来时立即检测支付
                    console.log(`[CookingControllerV2] 🔍 检查顾客${index + 1}是否需要立即支付...`);
                    console.log(`[CookingControllerV2] 🔍 packedFoods: ${this.packedFoods.map((f, i) => f ? `盒${i + 1}:有食物` : `盒${i + 1}:空`).join(', ')}`);
                    console.log(`[CookingControllerV2] 🔍 paidBoxes: ${Array.from(this.paidBoxes).join(',') || '无'}`);
                    
                    const hasAnyFood = this.packedFoods.some(food => food !== null);
                    if (hasAnyFood && !this.paidBoxes.has(index)) {
                        console.log(`[CookingControllerV2] 📦 新顾客${index + 1}到达，立即检测到已有食物打包，触发支付`);
                        this.triggerCustomerPayment(customer, index);
                    } else {
                        console.log(`[CookingControllerV2] ⚠️ 顾客${index + 1}不符合立即支付条件 (hasFood: ${hasAnyFood}, alreadyPaid: ${this.paidBoxes.has(index)})`);
                    }
                } else {
                    // 隐藏多余的顾客
                    customer.node.active = false;
                    customer.order = null;
                    if (customer.orderLabel) {
                        if (customer.orderLabel.isValid) {
                            customer.orderLabel.destroy();
                        }
                        customer.orderLabel = null;
                    }
                    console.log(`[CookingControllerV2] 顾客${index + 1}隐藏（差评影响）`);
                }
            }
        });
        
        console.log(`[CookingControllerV2] ✅ 订单生成完成，显示${activeCustomerCount}个顾客（总评价: ${totalReviews}, 差评: ${this.badReviews}）`);
    }
    
    /**
     * 根据时间进度动态调整顾客数量（不重新生成订单，只显示/隐藏顾客）
     */
    private adjustCustomerCountByTime() {
        // 🎲 事件清场阶段不调整顾客数量（让玩家处理完现有顾客）
        if (this.eventState.customerClearing || this.eventState.isEventPhase) {
            console.log('[CookingControllerV2] 🚫 事件阶段，不调整顾客数量');
            return;
        }
        
        // 获取时间进度
        const timeManager = TimeManager.instance;
        let timeProgress = 0;
        if (timeManager) {
            timeProgress = timeManager.getBusinessProgress();
        }
        
        // 计算差评率
        const totalReviews = this.superGoodReviews + this.goodReviews + this.badReviews;
        let badReviewRatio = 0;
        if (totalReviews > 0) {
            badReviewRatio = this.badReviews / totalReviews;
        }
        
        // 计算应该显示的顾客数量（与generateOrdersForAllCustomers逻辑相同）
        let baseCustomerCount = 1;
        if (timeProgress >= 0.75) {
            baseCustomerCount = 3;
        } else if (timeProgress >= 0.4) {
            baseCustomerCount = 2;
        } else {
            baseCustomerCount = 1;
        }
        
        let activeCustomerCount = baseCustomerCount;
        if (badReviewRatio >= 0.5) {
            activeCustomerCount = Math.max(1, baseCustomerCount - 2);
        } else if (badReviewRatio >= 0.3) {
            activeCustomerCount = Math.max(1, baseCustomerCount - 1);
        }
        activeCustomerCount = Math.min(3, activeCustomerCount);
        
        // 检查当前显示的顾客数量
        let currentActiveCount = 0;
        this.customers.forEach(customer => {
            if (customer.node && customer.node.active && customer.order) {
                currentActiveCount++;
            }
        });
        
        // 如果需要调整顾客数量
        if (currentActiveCount !== activeCustomerCount) {
            console.log(`[CookingControllerV2] 🔄 时间进度变化，调整顾客数量: ${currentActiveCount} -> ${activeCustomerCount}`);
            
            // 如果需要的顾客数增加，为新顾客生成订单
            if (activeCustomerCount > currentActiveCount) {
                this.customers.forEach((customer, index) => {
                    if (index < activeCustomerCount && (!customer.node.active || !customer.order)) {
                        // 显示顾客并生成新订单（传入顾客索引以决定难度）
                        const order = this.generateNewOrder(index);
                        customer.order = order;
                        
                        // 🔥 先隐藏CustomerIcon，防止闪烁
                        const customerIconNode = customer.node.getChildByName('CustomerIcon');
                        if (customerIconNode) {
                            customerIconNode.active = false;
                        }
                        
                        customer.node.active = true;
                        this.createOrderUI(customer, index);
                        console.log(`[CookingControllerV2] ✅ 顾客${index + 1}因时间进度而显示`);
                        
                        // 【重要】立即检查是否有提前做好的食物
                        console.log(`[CookingControllerV2] 🔍 (时间变化)检查顾客${index + 1}是否需要立即支付...`);
                        const hasAnyFood = this.packedFoods.some(food => food !== null);
                        if (hasAnyFood && !this.paidBoxes.has(index)) {
                            console.log(`[CookingControllerV2] 📦 顾客${index + 1}(时间变化)到达时，检测到已有食物打包，触发支付`);
                            this.triggerCustomerPayment(customer, index);
                        } else {
                            console.log(`[CookingControllerV2] ⚠️ 顾客${index + 1}(时间变化)不符合立即支付条件 (hasFood: ${hasAnyFood}, alreadyPaid: ${this.paidBoxes.has(index)})`);
                        }
                    // 在时间进度变化时也检查提前做好的食物
                    }
                });
            }
            // 如果需要的顾客数减少，隐藏多余的顾客
            else if (activeCustomerCount < currentActiveCount) {
                this.customers.forEach((customer, index) => {
                    if (index >= activeCustomerCount && customer.node.active) {
                        // 隐藏顾客（但不销毁订单，等待完成后自然处理）
                        customer.node.active = false;
                        console.log(`[CookingControllerV2] ⚠️ 顾客${index + 1}因时间/差评而隐藏`);
                    }
                });
            }
        }
    }

    /**
     * 更新顾客外观（角色图片和情绪）
     */
    private updateCustomerAppearance(customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}, index: number) {
        const customerIconNode = customer.node.getChildByName('CustomerIcon');
        if (!customerIconNode) {
            console.warn(`[CookingControllerV2] 顾客${index + 1}没有CustomerIcon节点`);
            return;
        }

        const sprite = customerIconNode.getComponent(Sprite);
        if (!sprite) {
            console.warn(`[CookingControllerV2] 顾客${index + 1}的CustomerIcon没有Sprite组件`);
            return;
        }

        // 获取角色管理器
        const characterManager = CustomerCharacterManager.getInstance();
        
        // 获取随机可用角色类型
        const characterType = characterManager.getRandomAvailableCharacter();
        if (!characterType) {
            console.warn(`[CookingControllerV2] 没有可用的角色类型`);
            return;
        }

        // 激活角色类型
        characterManager.activateCharacterType(characterType);
        
        // 获取角色配置
        const characterConfig = characterManager.getCharacterConfig(characterType);
        if (!characterConfig) {
            console.warn(`[CookingControllerV2] 无法获取角色配置: ${characterType}`);
            return;
        }

        // 设置等待状态的精灵图
        const waitingSpriteUUID = characterConfig.spriteFrameUUIDs[CustomerMood.WAITING];
        if (waitingSpriteUUID) {
            // 🔥 先隐藏顾客图标，防止闪烁
            customerIconNode.active = false;
            
            // 通过 assetManager 使用 UUID 加载精灵帧
            assetManager.loadAny({ uuid: waitingSpriteUUID }, (err: Error | null, spriteFrame: SpriteFrame) => {
                if (err) {
                    console.error(`[CookingControllerV2] 加载顾客精灵失败: ${err}`);
                    // 加载失败也要显示节点
                    if (customerIconNode && customerIconNode.isValid) {
                        customerIconNode.active = true;
                    }
                    return;
                }
                
                if (sprite && sprite.isValid) {
                    sprite.spriteFrame = spriteFrame;
                    
                    // 🔥 调整大小 - 不做额外缩放，让顾客以原始大小显示
                    // 直接使用 scale = 1，让角色保持原始大小
                    customerIconNode.setScale(1, 1, 1);
                    
                    // 更新 UITransform 的大小以匹配图片
                    const transform = customerIconNode.getComponent(UITransform);
                    if (transform && characterConfig.size) {
                        transform.setContentSize(characterConfig.size.width, characterConfig.size.height);
                    }
                    
                    // 🔥 图片加载完成后再显示顾客图标
                    customerIconNode.active = true;
                    
                    console.log(`[CookingControllerV2] 顾客${index + 1}外观更新为: ${characterConfig.name} (原始大小: ${characterConfig.size?.width}x${characterConfig.size?.height})`);
                }
            });
        }

        // 保存角色信息到顾客数据中（用于后续情绪更新）
        if (customer.order) {
            (customer.order as any).characterType = characterType;
            (customer.order as any).characterConfig = characterConfig;
            (customer.order as any).currentMood = CustomerMood.WAITING;
        }
    }

    /**
     * 更新顾客情绪（根据等待时间）
     */
    private updateCustomerMood(customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}, index: number) {
        if (!customer.order) return;

        const customerIconNode = customer.node.getChildByName('CustomerIcon');
        if (!customerIconNode) return;

        const sprite = customerIconNode.getComponent(Sprite);
        if (!sprite) return;

        const characterType = (customer.order as any).characterType;
        const characterConfig = (customer.order as any).characterConfig;
        const currentMood = (customer.order as any).currentMood || CustomerMood.WAITING;

        if (!characterType || !characterConfig) return;

        // 根据等待时间决定情绪（使用订单创建时间计算）
        const currentTime = Date.now();
        const orderTime = (customer.order as any).createTime || currentTime;
        const waitTime = (currentTime - orderTime) / 1000; // 转换为秒
        let newMood = CustomerMood.WAITING;

        if (waitTime > 30) {
            newMood = CustomerMood.ANGRY;  // 等待超过30秒变生气
        } else if (waitTime > 15) {
            // 15-30秒之间保持等待状态，但可能显示不耐烦
            newMood = CustomerMood.WAITING;
        }

        // 如果情绪发生变化，更新精灵图
        if (newMood !== currentMood) {
            const newSpriteUUID = characterConfig.spriteFrameUUIDs[newMood];
            if (newSpriteUUID) {
                assetManager.loadAny({ uuid: newSpriteUUID }, (err: Error | null, spriteFrame: SpriteFrame) => {
                    if (!err && sprite && sprite.isValid) {
                        sprite.spriteFrame = spriteFrame;
                        (customer.order as any).currentMood = newMood;
                        console.log(`[CookingControllerV2] 顾客${index + 1}情绪更新为: ${newMood}`);
                    }
                });
            }
        }
    }

    /**
     * 创建订单UI（显示在顾客头顶）
     */
    private createOrderUI(customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}, index: number) {
        if (!customer.order) {
            console.log(`[CookingControllerV2] 顾客${index + 1}没有订单，跳过UI创建`);
            return;
        }

        // 先销毁旧的订单标签（如果存在）
        if (customer.orderLabel) {
            if (customer.orderLabel.isValid) {
                console.log(`[CookingControllerV2] 销毁顾客${index + 1}的旧订单标签`);
                customer.orderLabel.destroy();
            }
            customer.orderLabel = null;
        }

        console.log(`[CookingControllerV2] 开始为顾客${index + 1}创建新订单UI`);

        // 更新顾客角色图片和姓名
        this.updateCustomerAppearance(customer, index);
        
        // 更新顾客姓名标签（从"顾客1"改为真实姓名）
        const customerLabelNode = customer.node.getChildByName('CustomerLabel');
        if (customerLabelNode) {
            const label = customerLabelNode.getComponent(Label);
            if (label) {
                // 获取随机顾客姓名
                const customerNames = ['张大爷', '李阿姨', '王师傅', '赵小姐', '刘先生', 
                                      '陈大哥', '孙妹妹', '周老板', '吴大娘', '郑小伙'];
                const randomName = customerNames[Math.floor(Math.random() * customerNames.length)];
                label.string = randomName;
                console.log(`[CookingControllerV2] 顾客${index + 1}姓名更新为: ${randomName}`);
            }
        }

        // ?? 生成对话文本内容（纯汉字，无emoji）
        const orderRecipe = this.getOrderRecipe(customer.order);
        const useRecipeView = orderRecipe && !this.isGrilledNoodleRecipe(orderRecipe);
        let dialogParts: string[] = [];
        let flavorText = '';
        let excludeText = '';

        if (useRecipeView) {
            flavorText = orderRecipe?.name || '订单';
            dialogParts.push('标准份');
        } else {
            // 口味是必选的，放在开头
            switch (customer.order.flavor) {
                case FlavorType.SWEET_SPICY:
                    flavorText = '甜辣口味';
                    break;
                case FlavorType.SOUR_SWEET_SPICY:
                    flavorText = '酸甜辣口味';
                    break;
                case FlavorType.SOUR_SWEET:
                    flavorText = '酸甜口味';
                    break;
            }

            // 鸡蛋数量（2个或3个才显示）
            if (customer.order.eggCount !== null && customer.order.eggCount >= 2) {
                dialogParts.push(`${customer.order.eggCount}个蛋`);
            }

            // 香肠数量（2根或3根才显示）
            if (customer.order.sausageCount !== null && customer.order.sausageCount >= 2) {
                dialogParts.push(`${customer.order.sausageCount}根肠`);
            }

            // 多放的食材
            if (customer.order.extraIngredients.length > 0) {
                customer.order.extraIngredients.forEach(ing => {
                    const ingredient = INGREDIENT_CONFIG.get(ing);
                    if (ingredient) {
                        dialogParts.push(`加${ingredient.name}`);
                    }
                });
            }

            // 多加的调料
            if (customer.order.extraCondiments.length > 0) {
                customer.order.extraCondiments.forEach(ing => {
                    const ingredient = INGREDIENT_CONFIG.get(ing);
                    if (ingredient) {
                        dialogParts.push(`加${ingredient.name}`);
                    }
                });
            }

            // 不要的食材
            if (customer.order.excludes.length > 0) {
                const excludeNames = customer.order.excludes.map(ing => {
                    const ingredient = INGREDIENT_CONFIG.get(ing);
                    return ingredient ? ingredient.name : '';
                }).filter(e => e).join('、');
                if (excludeNames) {
                    excludeText = `不要${excludeNames}`;
                }
            }
        }

        // ?? 创建简单的矩形气泡对话框
        const bubbleContainer = new Node(`BubbleContainer_${index}`);
        bubbleContainer.layer = Layers.Enum.UI_2D;
        
        // 气泡尺寸配置
        const bubbleWidth = 150;
        const bubbleHeight = 70;
        const radius = 8;      // 圆角半径
        
        // 添加 UITransform 组件
        const containerTransform = bubbleContainer.addComponent(UITransform);
        containerTransform.setContentSize(bubbleWidth, bubbleHeight);
        containerTransform.anchorX = 0.5;
        containerTransform.anchorY = 0;
        
        // 🔥 创建气泡背景
        const bubbleBg = new Node('BubbleBg');
        bubbleBg.layer = Layers.Enum.UI_2D;
        const bgTransform = bubbleBg.addComponent(UITransform);
        bgTransform.setContentSize(bubbleWidth, bubbleHeight);
        
        const graphics = bubbleBg.addComponent(Graphics);
        
        // 🎨 简洁白色背景 + 浅灰边框
        graphics.fillColor = new Color(255, 255, 255, 240);  // 白色背景
        graphics.strokeColor = new Color(160, 160, 160, 255);  // 浅灰边框
        graphics.lineWidth = 2;
        
        // 🔥 绘制简单圆角矩形
        graphics.roundRect(-bubbleWidth / 2, 0, bubbleWidth, bubbleHeight, radius);
        graphics.fill();
        graphics.stroke();
        
        bubbleBg.setPosition(0, 0, 0);
        bubbleContainer.addChild(bubbleBg);
        
        // 🔥 创建对话文本 - 两行布局
        // 第一行：口味
        const flavorNode = new Node('FlavorLabel');
        flavorNode.layer = Layers.Enum.UI_2D;
        const flavorLabel = flavorNode.addComponent(Label);
        const flavorTransform = flavorNode.getComponent(UITransform);
        
        flavorLabel.string = flavorText;
        flavorLabel.fontSize = 22;
        flavorLabel.color = new Color(180, 80, 20, 255);  // 橙红色，突出口味
        flavorLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        flavorLabel.verticalAlign = Label.VerticalAlign.CENTER;
        flavorLabel.isBold = true;
        if (flavorTransform) {
            flavorTransform.setContentSize(bubbleWidth - 20, 28);
        }
        flavorNode.setPosition(0, bubbleHeight - 25, 0);
        bubbleContainer.addChild(flavorNode);
        
        // 第二行：其他要求（纯汉字）
        if (dialogParts.length > 0 || excludeText) {
            const detailNode = new Node('DetailLabel');
            detailNode.layer = Layers.Enum.UI_2D;
            const detailLabel = detailNode.addComponent(Label);
            const detailTransform = detailNode.getComponent(UITransform);
            
            let detailText = dialogParts.join(' ');
            if (excludeText) {
                detailText += (detailText ? ' ' : '') + excludeText;
            }
            
            detailLabel.string = detailText;
            detailLabel.fontSize = 16;
            detailLabel.color = new Color(80, 80, 80, 255);  // 深灰色
            detailLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            detailLabel.verticalAlign = Label.VerticalAlign.CENTER;
            if (detailTransform) {
                detailTransform.setContentSize(bubbleWidth - 10, 24);
            }
            detailNode.setPosition(0, 25, 0);
            bubbleContainer.addChild(detailNode);
        }
        
        // 🔥 设置气泡位置（在顾客头顶上方）
        bubbleContainer.setPosition(50, 350, 0);  // 顾客头顶右上方
        
        // 添加到顾客节点
        customer.node.addChild(bubbleContainer);
        customer.orderLabel = bubbleContainer;  // 保存容器节点
        
        // 保存气泡背景的 Graphics 组件引用，用于后续改变颜色
        (bubbleContainer as any)._bubbleGraphics = graphics;
        (bubbleContainer as any)._bubbleParams = { bubbleWidth, bubbleHeight, radius };
        
        // 添加拖动事件监听（支付后可以拖动）
        this.setupOrderDragEvents(bubbleContainer, customer, index);
        
        console.log(`[CookingControllerV2] 💬 为顾客${index + 1}创建思考气泡: ${flavorText}`);
        
        // 【调试】在创建UI后立即检查状态
        setTimeout(() => {
            if (customer.orderLabel && customer.orderLabel.isValid) {
                console.log(`[CookingControllerV2] 🔍 顾客${index + 1}气泡对话创建完成`);
            }
        }, 100);
    }
    
    /**
     * 🔥 辅助方法：绘制圆角矩形
     */
    private drawRoundRect(graphics: Graphics, x: number, y: number, width: number, height: number, radius: number) {
        const r = Math.min(radius, width / 2, height / 2);
        graphics.moveTo(x + r, y);
        graphics.lineTo(x + width - r, y);
        graphics.arc(x + width - r, y + r, r, -Math.PI / 2, 0, false);
        graphics.lineTo(x + width, y + height - r);
        graphics.arc(x + width - r, y + height - r, r, 0, Math.PI / 2, false);
        graphics.lineTo(x + r, y + height);
        graphics.arc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false);
        graphics.lineTo(x, y + r);
        graphics.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
        graphics.close();
    }
    
    /**
     * 设置订单拖动事件
     */
    private setupOrderDragEvents(orderNode: Node, customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}, index: number) {
        let isDragging = false;
        let dragStartPos = new Vec3();
        
        orderNode.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
            // 🔥 检查订单是否已支付
            // 方法1：检查paidBoxes集合
            const isPaidBySet = this.paidBoxes.has(index);
            
            // 方法2：检查气泡的 _isPaid 标记
            const isPaidByMark = (orderNode as any)._isPaid === true;
            
            const isPaid = isPaidBySet || isPaidByMark;
            
            if (!isPaid) {
                console.log(`[CookingControllerV2] 气泡${index + 1}未支付，不能拖动 (Set: ${isPaidBySet}, Mark: ${isPaidByMark})`);
                return;
            }
            
            console.log(`[CookingControllerV2] 气泡${index + 1}已支付，开始拖动 (Set: ${isPaidBySet}, Mark: ${isPaidByMark})`);
            
            isDragging = true;
            this.draggingOrder = {customer, index};
            
            // 获取订单当前位置（在顾客节点坐标系下）
            dragStartPos.set(orderNode.position);
            
            // 获取订单在Canvas下的世界位置
            const canvas = this.node.parent;
            if (canvas) {
                const orderWorldPos = new Vec3();
                orderNode.getWorldPosition(orderWorldPos);
                
                const canvasWorldPos = new Vec3();
                canvas.getWorldPosition(canvasWorldPos);
                
                this.orderDragStartPos.set(
                    orderWorldPos.x - canvasWorldPos.x,
                    orderWorldPos.y - canvasWorldPos.y,
                    0
                );
                
                console.log(`[CookingControllerV2] 开始拖动订单${index + 1}，起始位置：${this.orderDragStartPos.toString()}`);
            }
            
            // 阻止事件传播
            event.propagationStopped = true;
        }, this);
        
        orderNode.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
            if (!isDragging || !this.draggingOrder || this.draggingOrder.index !== index) return;
            
            // 获取触摸位置的增量
            const delta = event.getDelta();
            
            // 更新订单位置（直接在当前父节点坐标系下移动）
            const currentPos = orderNode.position.clone();
            currentPos.x += delta.x;
            currentPos.y += delta.y;
            orderNode.setPosition(currentPos);
            
            console.log(`[CookingControllerV2] 拖动订单${index + 1}，位置：${currentPos.toString()}`);
            
            // 阻止事件传播
            event.propagationStopped = true;
        }, this);
        
        const onDragEnd = (event: EventTouch) => {
            if (!isDragging || !this.draggingOrder || this.draggingOrder.index !== index) return;
            
            isDragging = false;
            this.onOrderDragEnd(event, orderNode, customer, index, dragStartPos);
            
            // 阻止事件传播
            event.propagationStopped = true;
        };
        
        orderNode.on(Node.EventType.TOUCH_END, onDragEnd, this);
        orderNode.on(Node.EventType.TOUCH_CANCEL, onDragEnd, this);
    }
    
    /**
     * 订单拖动结束
     */
    private onOrderDragEnd(event: EventTouch, orderNode: Node, customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}, customerIndex: number, dragStartPos: Vec3) {
        if (!this.draggingOrder || this.draggingOrder.index !== customerIndex) return;
        
        console.log(`[CookingControllerV2] 订单拖动结束`);
        
        // 检查订单是否放到任意一个有食物的打包盒上
        let targetBoxIndex = -1;
        let minDistance = 150;  // 最小距离阈值
        
        const orderWorldPos = new Vec3();
        orderNode.getWorldPosition(orderWorldPos);
        
        // 遍历所有3个打包盒，找到有食物且最近的一个
        for (let i = 0; i < 3; i++) {
            // 检查该打包盒是否有食物
            if (this.packedFoods[i] === null) {
                continue;  // 没有食物，跳过
            }
            
            const packingBox = this.getPackingBox(i);
            if (!packingBox || !packingBox.active) {
                continue;  // 打包盒不存在或未显示，跳过
            }
            
            // 计算订单到该打包盒的距离
            const boxWorldPos = new Vec3();
            packingBox.getWorldPosition(boxWorldPos);
            const distance = Vec3.distance(orderWorldPos, boxWorldPos);
            
            console.log(`[CookingControllerV2] 检查打包盒${i + 1}，距离: ${distance.toFixed(0)}，有食物: true`);
            
            // 如果距离小于阈值且是目前最近的
            if (distance < minDistance) {
                minDistance = distance;
                targetBoxIndex = i;
            }
        }
        
        if (targetBoxIndex !== -1) {
            // 找到了有食物的打包盒，开始交付
            const packingBox = this.getPackingBox(targetBoxIndex);
            console.log(`[CookingControllerV2] ✅ 订单已贴到打包盒${targetBoxIndex + 1}上（有食物）`);
            // 关键修复：传递customerIndex（顾客索引）而不是targetBoxIndex（打包盒索引）
            this.deliverOrderToCustomer(customer, customerIndex, targetBoxIndex, orderNode, packingBox);
        } else {
            // 没有找到符合条件的打包盒，退回原位
            console.log(`[CookingControllerV2] 订单未贴到任何有食物的打包盒上`);
            this.returnOrderToOriginalPos(orderNode, dragStartPos);
        }
        
        this.draggingOrder = null;
    }
    
    /**
     * 将订单退回原位置
     */
    private returnOrderToOriginalPos(orderNode: Node, originalPos: Vec3) {
        tween(orderNode)
            .to(0.2, {position: originalPos})
            .start();
    }

    private ensureServeButton(): Button | null {
        if (this.serveButton && this.serveButton.node && this.serveButton.node.isValid) {
            return this.serveButton;
        }

        const canvasNode = director.getScene()?.getChildByName('Canvas');
        const parentNode = canvasNode || this.node;
        if (!parentNode) {
            return null;
        }

        const existing = parentNode.getChildByName('ServeButton');
        if (existing) {
            const existingButton = existing.getComponent(Button) || existing.addComponent(Button);
            this.serveButton = existingButton;
            return existingButton;
        }

        const serveNode = new Node('ServeButton');
        const transform = serveNode.addComponent(UITransform);
        transform.setContentSize(180, 145);

        const label = serveNode.addComponent(Label);
        label.string = '摆放打包盒';
        label.fontSize = 24;
        label.lineHeight = 28;
        label.color = new Color(20, 20, 20, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        const button = serveNode.addComponent(Button);
        button.transition = Button.Transition.NONE;

        parentNode.addChild(serveNode);
        serveNode.setPosition(720, -42, 0);
        serveNode.setScale(1.522, 1.522, 1.522);

        this.serveButton = button;
        return button;
    }

    /**
     * 设置摆放打包盒按钮（原出餐按钮）
     */
    private setupServeButton() {
        if (this.shouldDisableCookingInputs()) {
            return;
        }
        const serveBtn = this.ensureServeButton();
        const serveNode = serveBtn?.node;
        if (!serveBtn || !serveNode) {
            console.warn('[CookingControllerV2] ⚠️ 摆放打包盒按钮未绑定或节点无效');
            return;
        }

        // 初始状态禁用，需要开始营业后才能使用
        serveBtn.interactable = false;
        
        // 修改按钮文字（如果有Label子节点）
        const label = serveNode.getComponentInChildren(Label);
        if (label) {
            label.string = '摆放打包盒';
        }
        
        // 隐藏所有打包盒（初始状态）
        if (this.packingBox1) this.packingBox1.active = false;
        if (this.packingBox2) this.packingBox2.active = false;
        if (this.packingBox3) this.packingBox3.active = false;
        
        // 监听点击事件
        serveNode.on(Button.EventType.CLICK, this.onServeButtonClick, this);
        
        console.log('[CookingControllerV2] ✅ 摆放打包盒按钮已设置（初始禁用）');
    }

    /**
     * 设置时间管理器回调
     */
    private setupTimeManager() {
        if (this.singleDishMode) return;
        const timeManager = TimeManager.instance;
        if (!timeManager) {
            console.warn('[CookingControllerV2] ⚠️ TimeManager未找到，时间系统不可用');
            return;
        }

        console.log('[CookingControllerV2] 🔧 开始注册TimeManager回调...');

        // 注册一天开始回调
        timeManager.onDayStart(() => {
            console.log('[CookingControllerV2] 🔔 收到营业开始回调！');
            this.showMessage('🏪 营业开始！12:00 - 22:00');
            
            // 重置游戏状态
            this.resetDailyState();
            
            // 启用营业功能
            console.log('[CookingControllerV2] 准备调用 setBusinessState(true)...');
            this.setBusinessState(true);
            console.log('[CookingControllerV2] setBusinessState(true) 调用完成');
        });
        console.log('[CookingControllerV2] ✅ 已注册 onDayStart 回调');

        // 注册一天结束回调
        timeManager.onDayEnd(() => {
            console.log('[CookingControllerV2] 🌙 营业结束！');
            this.showMessage('🌙 营业结束！开始结算...');
            
            // 禁用所有功能
            this.setBusinessState(false);
            
            // 结算今天的收入
            this.endDaySettlement();
        });
        console.log('[CookingControllerV2] ✅ 已注册 onDayEnd 回调');

        // 注册时间更新回调（动态调整顾客数量 + 事件触发检测）
        timeManager.onTimeUpdate((hour: number, minute: number) => {
            // 🎲 检查是否需要触发随机事件
            this.checkEventTrigger(hour, minute);
            
            // 每15分钟检查一次，动态调整顾客数量
            if (minute % 15 === 0) {
                const timeStr = timeManager.getTimeString();
                console.log(`[CookingControllerV2] ⏰ 当前时间: ${timeStr}`);
                
                // 动态调整顾客数量（根据时间进度和差评率）- 事件阶段不调整
                if (!this.eventState.isEventPhase && !this.eventState.customerClearing) {
                    this.adjustCustomerCountByTime();
                }
                
                // 快结束时提醒
                if (hour >= 19) {
                    this.showMessage(`⏰ 注意时间：${timeStr}，快打烊了！`);
                }
            }
        });
        console.log('[CookingControllerV2] ✅ 已注册 onTimeUpdate 回调（含事件检测）');

        console.log('[CookingControllerV2] ✅ 时间管理器所有回调已设置完成');
    }

    /**
     * 重置每日状态
     */
    private resetDailyState() {
        // 清空所有面饼
        this.foodItems.forEach(food => {
            const bgNode = food.node.parent;
            if (bgNode) {
                bgNode.destroy();
            }
        });
        this.foodItems = [];

        // 清空打包盒
        this.packedFoods = [null, null, null];
        this.boxUsedCount = 0;
        this.waitingToPackFoods = [];  // 🔥 清空等待打包列表

        // 隐藏所有打包盒
        if (this.packingBox1) this.packingBox1.active = false;
        if (this.packingBox2) this.packingBox2.active = false;
        if (this.packingBox3) this.packingBox3.active = false;

        // 重新启用摆放按钮
        if (this.serveButton) {
            this.serveButton.interactable = true;
        }
        
        // 重置评价（保留金币）
        this.superGoodReviews = 0;
        this.goodReviews = 0;
        this.badReviews = 0;
        this.reviewHistory = [];  // 清空评价历史
        this.updateReviewDisplay();

        // 🎲 重置每日事件状态
        this.resetDailyEventState();
        
        // 🎲 新事件系统V2每日结算
        if (this.useEventSystemV2 && this.eventSystemV2) {
            const settlement = this.eventSystemV2.dailySettlement();
            if (settlement.money !== 0) {
                this.totalMoney += settlement.money;
                this.updateMoneyDisplay();
                this.showMessage(`📅 链式事件结算: ${settlement.money > 0 ? '+' : ''}${settlement.money}金币`);
            }
            if (settlement.heat !== 0) {
                this.shopHeat = Math.max(0, Math.min(100, this.shopHeat + settlement.heat));
                this.showMessage(`📅 链式事件结算: ${settlement.heat > 0 ? '+' : ''}${settlement.heat}热度`);
            }
            this.eventSystemV2.resetDailyState();
        }

        console.log('[CookingControllerV2] ✅ 每日状态已重置');
    }
    
    // 🔥 注：手机面板相关函数已移至文件末尾（iOS风格版本）
    
    /**
     * 更新评价列表内容
     */
    private updateReviewListContent() {
        const reviewListContainer = this.phonePanel.getChildByName('ReviewListContainer');
        if (!reviewListContainer) {
            this.initPhonePanel();
            return;
        }
        
        // 清空评价项
        reviewListContainer.removeAllChildren();
        
        if (this.reviewHistory.length === 0) {
            const emptyLabel = new Node('EmptyLabel');
            const label = emptyLabel.addComponent(Label);
            label.string = '👍 暂无评价\n继续努力！';
            label.fontSize = 20;
            label.color = new Color(120, 120, 120, 255);
            label.horizontalAlign = 1;
            label.verticalAlign = 1;
            const labelTransform = emptyLabel.getComponent(UITransform);
            if (labelTransform) {
                labelTransform.setContentSize(340, 100);
            }
            emptyLabel.setPosition(0, 0, 0);
            reviewListContainer.addChild(emptyLabel);
            return;
        }
        
        // 显示评价（使用配置）
        const cfg = PHONE_CONFIG;
        const startY = cfg.item.startY;
        const itemHeight = cfg.item.height;
        const spacing = cfg.item.spacing;
        
        this.reviewHistory.forEach((review, index) => {
            if (index >= 20) return;
            
            const reviewItem = new Node(`ReviewItem_${index}`);
            const itemGraphics = reviewItem.addComponent(Graphics);
            
            const itemColor = index % 2 === 0 
                ? new Color(248, 248, 248, 255)
                : new Color(255, 255, 255, 255);
            itemGraphics.fillColor = itemColor;
            itemGraphics.rect(
                -cfg.item.width / 2, 
                cfg.item.rectOffsetY, 
                cfg.item.width, 
                itemHeight
            );
            itemGraphics.fill();
            
            const yPos = startY - (index * (itemHeight + spacing));
            reviewItem.setPosition(0, yPos, 0);
            
            let typeEmoji = '';
            let textColor = new Color(60, 60, 60, 255);
            
            if (review.type === 'super') {
                typeEmoji = '⭐';
                textColor = new Color(255, 140, 0, 255);
            } else if (review.type === 'good') {
                typeEmoji = '👍';
                textColor = new Color(46, 125, 50, 255);
            } else {
                typeEmoji = '👎';
                textColor = new Color(211, 47, 47, 255);
            }
            
            const labelNode = new Node('ReviewLabel');
            const label = labelNode.addComponent(Label);
            label.string = `${typeEmoji} ${review.text}`;
            label.fontSize = cfg.text.fontSize;
            label.color = textColor;
            label.overflow = Label.Overflow.CLAMP;
            label.enableWrapText = true;
            label.horizontalAlign = 0;
            label.verticalAlign = 1;
            label.lineHeight = cfg.text.lineHeight;
            
            const labelTransform = labelNode.getComponent(UITransform);
            if (labelTransform) {
                labelTransform.setContentSize(
                    cfg.text.width, 
                    itemHeight - cfg.text.heightPadding
                );
            }
            labelNode.setPosition(cfg.text.positionX, 0, 0);
            reviewItem.addChild(labelNode);
            
            reviewListContainer.addChild(reviewItem);
        });
    }
    
    // 🔥 setupPhoneBackground, setupPhoneTitle, setupPhoneCloseButton 函数已移至文件末尾（iOS风格版本）
    
    /**
     * 彩票站金币变化回调
     */
    private onLotteryMoneyChanged() {
        console.log('[CookingControllerV2] 收到彩票站金币变化通知');
        this.updateMoneyDisplay();
    }
    
    /**
     * 更新金币显示（右上角显示当日收入）
     */
    private updateMoneyDisplay() {
        if (this.moneyLabel) {
            this.moneyLabel.string = `💰 今日: ${this.totalMoney}`;
        }
        // 🔥 同时更新手机界面（钱包显示累计总金币）
        this.updatePhoneMainScreenData();
        this.checkDemoGoalReached();
    }

    /**
     * Demo 目标达成提示（仅第一关）
     */
    private checkDemoGoalReached() {
        if (this.demoGoalNotified) return;
        if (!GameConfig.DEMO_ONLY_LEVEL1) return;

        const levelId = this.getCurrentLevelId();
        if (levelId > GameConfig.DEMO_LEVEL_CAP) return;

        const levelConfig = GameConfig.LEVELS.find((level) => level.levelId === levelId);
        if (!levelConfig) return;

        if (this.totalMoney >= levelConfig.targetMoney) {
            this.demoGoalNotified = true;
            this.showMessage(GameConfig.DEMO_TARGET_HINT);
            this.showDemoCompletePanel(levelConfig.targetMoney);
        }
    }

    private showDemoCompletePanel(targetMoney: number) {
        if (!GameConfig.DEMO_ONLY_LEVEL1) return;
        if (this.demoCompletePanel && this.demoCompletePanel.isValid) {
            this.demoCompletePanel.active = true;
            return;
        }

        const { root } = this.createModalPanel(
            'DemoCompletePanel',
            '🎉 Demo 目标达成',
            `今日收入已达到目标 ${targetMoney} 元。\n${GameConfig.DEMO_TARGET_HINT}`,
            '返回主菜单',
            '继续练习',
            () => {
                try {
                    SaveManager.autoSave(SaveManager.buildCurrentSaveData());
                } catch (e) {
                    console.warn('[CookingControllerV2] ⚠️ Demo结束存档失败', e);
                }
                SceneRouteService.goMainMenu();
            },
            () => {
                if (this.demoCompletePanel && this.demoCompletePanel.isValid) {
                    this.demoCompletePanel.active = false;
                }
            }
        );

        this.demoCompletePanel = root;
        root.active = true;
    }

    private tryShowOutOfStockPrompt(message: string) {
        if (this.tutorialManager?.isInTutorial()) {
            // 教程模式自动补货
            this.ensureTutorialInventory();
            return;
        }

        const now = Date.now();
        if (now < this.outOfStockPromptCooldown) return;
        this.outOfStockPromptCooldown = now + 3000;

        if (this.outOfStockPrompt && this.outOfStockPrompt.isValid) {
            this.outOfStockPrompt.active = true;
            return;
        }

        const { root } = this.createModalPanel(
            'OutOfStockPrompt',
            '食材不足',
            `${message}\n是否进入下一天补货？\n选择“继续等待”将等到收摊时间自动结束。`,
            '进入下一天',
            '继续等待',
            () => {
                if (this.outOfStockPrompt && this.outOfStockPrompt.isValid) {
                    this.outOfStockPrompt.active = false;
                }
                this.endDaySettlement();
            },
            () => {
                if (this.outOfStockPrompt && this.outOfStockPrompt.isValid) {
                    this.outOfStockPrompt.active = false;
                }
            }
        );

        this.outOfStockPrompt = root;
        root.active = true;
    }

    private createModalPanel(
        name: string,
        titleText: string,
        contentText: string,
        okText: string,
        cancelText: string,
        onOk: () => void,
        onCancel: () => void
    ): { root: Node } {
        const canvas = find('Canvas') || this.node;
        const root = new Node(name);
        canvas.addChild(root);
        root.setPosition(0, 0, 0);
        root.setSiblingIndex(9999);

        const mask = new Node('Mask');
        const maskTransform = mask.getComponent(UITransform) || mask.addComponent(UITransform);
        maskTransform.setContentSize(2000, 2000);
        const maskGraphics = mask.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 160);
        maskGraphics.rect(-1000, -1000, 2000, 2000);
        maskGraphics.fill();
        mask.addComponent(BlockInputEvents);
        root.addChild(mask);

        const panel = new Node('Panel');
        const panelTransform = panel.getComponent(UITransform) || panel.addComponent(UITransform);
        panelTransform.setContentSize(720, 360);
        const panelGraphics = panel.addComponent(Graphics);
        panelGraphics.fillColor = new Color(30, 30, 30, 235);
        panelGraphics.roundRect(-360, -180, 720, 360, 18);
        panelGraphics.fill();
        panel.setPosition(0, 0, 0);
        root.addChild(panel);

        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = titleText;
        titleLabel.fontSize = 26;
        titleLabel.color = new Color(255, 255, 255, 255);
        titleLabel.isBold = true;
        titleNode.setPosition(0, 120, 0);
        panel.addChild(titleNode);

        const contentNode = new Node('Content');
        const contentLabel = contentNode.addComponent(Label);
        contentLabel.string = contentText;
        contentLabel.fontSize = 20;
        contentLabel.color = new Color(230, 230, 230, 255);
        contentLabel.lineHeight = 28;
        contentLabel.enableWrapText = true;
        contentLabel.overflow = Label.Overflow.CLAMP;
        const contentTransform = contentNode.getComponent(UITransform) || contentNode.addComponent(UITransform);
        contentTransform.setContentSize(640, 160);
        contentNode.setPosition(0, 20, 0);
        panel.addChild(contentNode);

        const createButton = (label: string, x: number, y: number, color: Color, onClick: () => void) => {
            const btnNode = new Node(`${label}Btn`);
            const btnTransform = btnNode.getComponent(UITransform) || btnNode.addComponent(UITransform);
            btnTransform.setContentSize(220, 54);
            const btnGraphics = btnNode.addComponent(Graphics);
            btnGraphics.fillColor = color;
            btnGraphics.roundRect(-110, -27, 220, 54, 10);
            btnGraphics.fill();
            btnNode.addComponent(Button);
            btnNode.setPosition(x, y, 0);
            btnNode.on(Button.EventType.CLICK, onClick);

            const btnLabelNode = new Node('Label');
            const btnLabel = btnLabelNode.addComponent(Label);
            btnLabel.string = label;
            btnLabel.fontSize = 20;
            btnLabel.color = new Color(255, 255, 255, 255);
            btnLabelNode.setPosition(0, 0, 0);
            btnNode.addChild(btnLabelNode);

            panel.addChild(btnNode);
        };

        createButton(okText, -140, -110, new Color(46, 204, 113, 255), onOk);
        createButton(cancelText, 140, -110, new Color(52, 152, 219, 255), onCancel);

        return { root };
    }

    private ensureTutorialInventory() {
        if (!this.tutorialManager?.isInTutorial()) return;
        const inventory = InventoryManager.instance;
        if (!inventory) return;

        const refillTargets: IngredientType[] = [
            IngredientType.DOUGH,
            IngredientType.EGG,
            IngredientType.SAUSAGE,
            IngredientType.ONION,
            IngredientType.CILANTRO,
            IngredientType.GRILLED_NOODLE_SAUCE,
            IngredientType.CHILI,
            IngredientType.SUGAR,
            IngredientType.VINEGAR,
            IngredientType.OIL
        ];

        for (const type of refillTargets) {
            const available = inventory.getAvailableCount(type);
            const target = 30;
            if (available < target) {
                inventory.adjustProcessedIngredient(type, target - available);
            }
        }

        this.updateIngredientCountLabels();
    }
    
    /**
     * 更新评价显示
     */
    private updateReviewDisplay() {
        if (this.reviewLabel) {
            this.reviewLabel.string = `🌟: ${this.superGoodReviews} | 😊: ${this.goodReviews} | 😢: ${this.badReviews}`;
        }
    }

    /**
     * 设置营业状态（启用/禁用所有游戏功能）
     */
    public setBusinessState(isOpen: boolean) {
        console.log(`[CookingControllerV2] 🔧 setBusinessState 被调用，参数: ${isOpen}`);
        console.log(`[CookingControllerV2] 当前 isBusinessOpen: ${this.isBusinessOpen}`);
        
        this.isBusinessOpen = isOpen;
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        const enableInputs = isOpen || inTutorial;
        console.log(`[CookingControllerV2] 设置后 isBusinessOpen: ${this.isBusinessOpen}`);
        console.log(`[CookingControllerV2] ${isOpen ? '✅ 启用' : '❌ 禁用'}所有游戏功能`);
        
        // 🔥 关闭营业时显示提示（通常是时间到了自动结束）
        if (!isOpen && !this.singleDishMode && !inTutorial) {
            this.scheduleOnce(() => {
                this.showMessage('🌙 营业结束！点击"重新开始"可以重玩此关卡');
            }, 0.5);
        }
        
        // 控制食材按钮（包括油壶）- Node 类型
        const ingredientNodeButtons = [
            this.doughBtn,
            this.eggBtn,
            this.cilantroBtn,
            this.onionBtn,
            this.sausageBtn
        ];
        // Button 类型
        const ingredientBtnButtons = [
            this.sauceBtn,
            this.chiliBtn,
            this.sugarBtn,
            this.vinegarBtn,
            this.oilBtn,  // 🔥 添加油壶按钮
            this.waterBtn,
            this.spatulaBtn
        ];
        
        let enabledCount = 0;
        // 处理 Node 类型按钮
        ingredientNodeButtons.forEach((node) => {
            if (node) {
                const clickArea = node.getChildByName('ClickArea') || node;
                const btn = clickArea.getComponent(Button);
                if (btn) {
                    btn.interactable = enableInputs;
                }
                enabledCount++;
            }
        });
        // 处理 Button 类型按钮
        ingredientBtnButtons.forEach((btn) => {
            if (btn) {
                btn.interactable = enableInputs;
                enabledCount++;
            }
        });
        console.log(`[CookingControllerV2] 已${enableInputs ? '启用' : '禁用'} ${enabledCount} 个食材按钮`);
        
        // 控制摆放打包盒按钮
        if (this.serveButton) {
            this.serveButton.interactable = enableInputs;
            console.log(`[CookingControllerV2] 摆放打包盒按钮已${enableInputs ? '启用' : '禁用'}`);
        }
        
        // 🔥 控制铁板区域的触摸事件
        if (this.grillArea) {
            if (!enableInputs) {
                this.grillArea.off(Node.EventType.TOUCH_END, this.onGrillClick, this);
                console.log('[CookingControllerV2] 铁板触摸事件已移除');
            } else {
                // 重新绑定（先移除再添加，避免重复）
                this.grillArea.off(Node.EventType.TOUCH_END, this.onGrillClick, this);
                this.grillArea.on(Node.EventType.TOUCH_END, this.onGrillClick, this);
                console.log('[CookingControllerV2] 铁板触摸事件已绑定');
            }
        }

        if (this.singleDishMode) {
            if (this.customerArea) {
                this.customerArea.active = false;
            }
            if (!isOpen) {
                this.clearAllOilMarks();
                this.foodItems.forEach(food => {
                    const bgNode = food.node.parent;
                    if (bgNode && bgNode.isValid) {
                        bgNode.destroy();
                    }
                });
                this.foodItems = [];
            }
            console.log('[CookingControllerV2] 单份料理模式：跳过顾客/订单流程');
            console.log(`[CookingControllerV2] ✅ 营业状态已${isOpen ? '开启' : '关闭'}，isBusinessOpen = ${this.isBusinessOpen}`);
            return;
        }
        
        // 控制顾客显示
        if (isOpen) {
            // 营业开始，显示顾客区域
            if (this.customerArea) {
                this.customerArea.active = true;
                console.log('[CookingControllerV2] 顾客区域已显示');
            }
            
            // 先清理旧订单，再生成新顾客和订单
            console.log('[CookingControllerV2] 清理旧订单...');
            this.clearAllOrders();
            
            console.log('[CookingControllerV2] 开始生成顾客和订单...');
            this.generateOrdersForAllCustomers();
        } else {
            // 营业结束，隐藏顾客区域
            if (this.customerArea) {
                this.customerArea.active = false;
                console.log('[CookingControllerV2] 顾客区域已隐藏');
            }
            
            // 隐藏所有顾客并清理订单
            console.log('[CookingControllerV2] 营业结束，清理所有顾客和订单...');
            this.clearAllOrders();
            
            // 教程中不清理油渍/面饼，避免流程中途被清空
            if (!inTutorial) {
                // 清理所有油渍
                this.clearAllOilMarks();
                
                // 清理铁板上的所有食物
                this.foodItems.forEach(food => {
                    const bgNode = food.node.parent;
                    if (bgNode && bgNode.isValid) {
                        bgNode.destroy();
                    }
                });
                this.foodItems = [];
                console.log('[CookingControllerV2] 铁板上的食物已清理');
            }
        }
        
        console.log(`[CookingControllerV2] ✅ 营业状态已${isOpen ? '开启' : '关闭'}，isBusinessOpen = ${this.isBusinessOpen}`);
    }

    /**
     * 结算今天的收入
     */
    private endDaySettlement() {
        const timeManager = TimeManager.instance;
        if (!timeManager) return;

        // 停止时间
        timeManager.pauseTime();

        // 计算今日收入
        const todayMoney = this.totalMoney;
        const todaySuperGood = this.superGoodReviews;
        const todayGood = this.goodReviews;
        const todayBad = this.badReviews;
        
        // 同步到库存系统
        const inventory = InventoryManager.instance;
        if (inventory && inventory.currentLevel) {
            console.log(`[CookingControllerV2] 库存系统 - 当前金钱: ${inventory.currentMoney}, 差评: ${inventory.currentLevel.badReviewCount}`);
        }
        
        // 检查关卡失败条件
        const progressManager = GameProgressManager.instance;
        const levelConfig = progressManager?.currentLevelConfig;
        const isFailed = levelConfig && todayBad >= levelConfig.maxBadReviews;
        
        // 记录今日数据到进度管理器
        if (progressManager) {
            console.log(`[CookingControllerV2] 💰 结算前累计金币: ${progressManager.progress.totalMoney}`);
            progressManager.endDay(todayMoney, this.customers.length, {
                superGood: todaySuperGood,
                good: todayGood,
                bad: todayBad
            });
            console.log(`[CookingControllerV2] 💰 结算后累计金币: ${progressManager.progress.totalMoney}`);
        } else {
            console.error('[CookingControllerV2] ❌ GameProgressManager不存在！无法保存进度');
        }
        
        console.log(`[CookingControllerV2] ✅ 今日结算完成，收益: ${todayMoney}`);
        this.showMessage(`📊 今日结算：收益${todayMoney}`);

        // 自动存档
        try {
            SaveManager.autoSave(SaveManager.buildCurrentSaveData());
        } catch (e) {
            console.warn('[CookingControllerV2] ⚠️ 自动存档失败', e);
        }

        this.handleAutoSettlement(isFailed);
    }

    /**
     * 自动结算流程：成功进入下一天，失败回到商店重开
     */
    private handleAutoSettlement(isFailed: boolean) {
        if (isFailed) {
            console.log('[CookingControllerV2] ❌ 营业失败，返回商店重开');
            this.showMessage('😵 营业失败，返回商店重开');
            SceneRouteService.goShop();
            return;
        }

        console.log('[CookingControllerV2] ☀️ 进入下一天 → 前往购买食材');
        const progressManager = GameProgressManager.instance;
        if (progressManager) {
            progressManager.nextDay();
        }
        SceneRouteService.goShop();
    }
    
    /**
     * 自动开始营业（下一天时调用）
     */
    private autoStartBusiness() {
        const timeManager = TimeManager.instance;
        if (timeManager) {
            // 开始营业（会触发 onDayStart 回调）
            timeManager.startDay();
            console.log('[CookingControllerV2] ☀️ 自动开始营业');
        }
        
        // 设置营业状态
        this.setBusinessState(true);
        
        this.showMessage('☀️ 新的一天开始了！');
    }
    
    
    /**
     * 重置每日数据
     */
    private resetDailyData() {
        // 重置收入和评价
        this.totalMoney = 0;
        this.superGoodReviews = 0;
        this.goodReviews = 0;
        this.badReviews = 0;
        
        // 🔥 立即更新UI显示（今日收入清零）
        this.updateMoneyDisplay();
        this.updateReviewDisplay();
        
        // 清理顾客
        this.clearAllCustomers();
        
        // 清理烤盘上的食物
        this.clearAllFood();
        
        // 重置打包盒
        this.resetPackingBoxes();
        
        // 重置营业状态
        this.setBusinessState(false);
        
        // 重置时间
        const timeManager = TimeManager.instance;
        if (timeManager) {
            timeManager.resetTime();
        }
        
        console.log('[CookingControllerV2] 🔄 每日数据已重置，今日收入: 0');
    }
    
    /**
     * 清理所有顾客（隐藏并清除订单，不销毁节点）
     */
    private clearAllCustomers() {
        this.customers.forEach(customer => {
            if (customer.node) {
                customer.node.active = false;
                // 清除订单UI
                if (customer.orderLabel) {
                    customer.orderLabel.destroy();
                    customer.orderLabel = null;
                }
                customer.order = null;
            }
        });
        // 注意：不清空 customers 数组，保留节点引用
        console.log('[CookingControllerV2] 🧹 所有顾客已隐藏并清除订单');
    }
    
    /**
     * 清理烤盘上的所有食物
     */
    private clearAllFood() {
        this.foodItems.forEach(food => {
            if (food.node) {
                food.node.destroy();
            }
        });
        this.foodItems = [];
    }
    
    /**
     * 重置打包盒
     */
    private resetPackingBoxes() {
        // 重置打包盒位置和状态
        if (this.packingBox1) {
            this.packingBox1.active = false;
            if (this.packingBoxInitialPositions[0]) {
                this.packingBox1.setPosition(this.packingBoxInitialPositions[0]);
            }
        }
        if (this.packingBox2) {
            this.packingBox2.active = false;
            if (this.packingBoxInitialPositions[1]) {
                this.packingBox2.setPosition(this.packingBoxInitialPositions[1]);
            }
        }
        if (this.packingBox3) {
            this.packingBox3.active = false;
            if (this.packingBoxInitialPositions[2]) {
                this.packingBox3.setPosition(this.packingBoxInitialPositions[2]);
            }
        }
    }

    /**
     * 点击摆放打包盒按钮（新逻辑：一次性显示所有3个打包盒）
     */
    private onServeButtonClick() {
        if (!this.serveButton) {
            console.error('[CookingControllerV2] ❌ 摆放打包盒按钮未绑定！');
            return;
        }
        
        // 检查是否在教程模式
        const inTutorial = this.tutorialManager && this.tutorialManager.isInTutorial();
        
        // 检查是否已开始营业（教程模式跳过此检查）
        if (!inTutorial && !this.isBusinessOpen) {
            this.showMessage('⚠️ 请先点击"开始营业"！');
            return;
        }
        
        // 检查是否有打包盒节点绑定
        if (!this.packingBox1 || !this.packingBox2 || !this.packingBox3) {
            this.showMessage('⚠️ 请先在编辑器中绑定3个打包盒！');
            console.error('[CookingControllerV2] ❌ 打包盒节点未完全绑定！');
            return;
        }

        console.log('[CookingControllerV2] 摆放打包盒...');
        
        // 教程模式下，显示打包盒并播放降落动画
        if (inTutorial) {
            // 🔥 播放降落动画显示打包盒
            this.playPackingBoxDropAnimation([0, 1, 2]);
            console.log('[CookingControllerV2] 📦 教程模式：打包盒降落动画播放中');
            
            // 触发教程事件
            this.triggerTutorialAction('place_packing_box');
            // 禁用按钮，防止重复点击
            this.serveButton.interactable = false;
            this.showMessage(`📦 打包盒已摆放！`);
            return;
        }
        
        // 非教程模式的正常逻辑
        // 检查有多少个打包盒可以补充（已隐藏的）
        const hiddenBoxes: number[] = [];
        const box1Hidden = !this.packingBox1.active;
        const box2Hidden = !this.packingBox2.active;
        const box3Hidden = !this.packingBox3.active;
        
        if (box1Hidden) hiddenBoxes.push(0);
        if (box2Hidden) hiddenBoxes.push(1);
        if (box3Hidden) hiddenBoxes.push(2);
        
        // 如果没有隐藏的打包盒，说明已经都摆放了，提示用户
        if (hiddenBoxes.length === 0) {
            this.showMessage('⚠️ 打包盒已全部摆放，请先使用或清空！');
            return;
        }
        
        // 🔥 播放降落动画显示隐藏的打包盒
        this.playPackingBoxDropAnimation(hiddenBoxes);
        
        this.showMessage(`📦 已补充 ${hiddenBoxes.length} 个打包盒！`);
        console.log(`[CookingControllerV2] ✅ ${hiddenBoxes.length}个打包盒已补充`);
        
        // 禁用按钮，防止重复点击
        this.serveButton.interactable = false;
    }
    
    /**
     * 🔥 播放打包盒降落动画
     * @param boxIndices 要显示的打包盒索引数组
     */
    private playPackingBoxDropAnimation(boxIndices: number[]) {
        const dropHeight = 100;  // 降落高度（Y轴）
        const dropOffsetX = 80;  // 右侧偏移（X轴）
        const dropDuration = 0.15;  // 单个盒子降落时间（快速）
        const staggerDelay = 0.08;  // 盒子之间的延迟
        const targetScale = 1;  // 🔥 缩放倍数（1倍尺寸）
        const finalYOffset = 18;  // 🔥 最终Y轴偏移
        
        for (let i = 0; i < boxIndices.length; i++) {
            const boxIndex = boxIndices[i];
            const packingBox = this.getPackingBox(boxIndex);
            if (!packingBox) continue;
            
            // 🔥 使用保存的初始位置（如果没有则使用当前位置作为备用）
            let originalX: number, originalY: number, originalZ: number;
            const initialPos = this.packingBoxInitialPositions[boxIndex];
            if (initialPos) {
                originalX = initialPos.x;
                originalY = initialPos.y;
                originalZ = initialPos.z;
            } else {
                console.warn(`[CookingControllerV2] ⚠️ 打包盒${boxIndex + 1}没有保存初始位置，使用当前位置`);
                originalX = packingBox.position.x;
                originalY = packingBox.position.y;
                originalZ = packingBox.position.z;
            }
            const finalY = originalY + finalYOffset;  // 最终位置Y轴+18
            
            // 设置初始位置（在最终位置右上方）和缩放（一开始就是1.5倍）
            packingBox.setPosition(originalX + dropOffsetX, finalY + dropHeight, originalZ);
            packingBox.setScale(targetScale, targetScale, 1);  // 🔥 一开始就是1.5倍
            packingBox.active = true;
            
            // 清空数据
            this.packedFoods[boxIndex] = null;
            this.updatePackingBoxDisplay(boxIndex);
            
            // 延迟播放动画（错开时间）
            const isLastBox = (i === boxIndices.length - 1);
            this.scheduleOnce(() => {
                // 从右上方降落到最终位置
                tween(packingBox)
                    .to(dropDuration, { 
                        position: new Vec3(originalX, finalY, originalZ)
                    }, {
                        easing: 'bounceOut'  // 弹跳效果，模拟放到桌上的感觉
                    })
                    .call(() => {
                        console.log(`[CookingControllerV2] 📦 打包盒${boxIndex + 1}降落完成`);
                        // 🔥 最后一个打包盒降落完成后，检查是否有等待打包的食物
                        if (isLastBox) {
                            this.scheduleOnce(() => {
                                this.checkWaitingFoods();
                            }, 0.1);
                        }
                    })
                    .start();
            }, i * staggerDelay);
        }
    }

    /**
     * 将食物送到指定顾客（新系统：添加打包盒索引参数）
     */
    private serveFoodToCustomer(food: FoodItem, customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}, boxIndex?: number) {
        if (!customer.order) {
            this.showMessage('❌ 该顾客没有订单！');
            return;
        }

        const bgNode = food.node.parent;
        if (!bgNode) {
            console.error('[CookingControllerV2] ❌ 打包食物节点不存在！');
            return;
        }
        
        // 确保食物节点可见（现在打包后就是可见的）
        bgNode.active = true;
        
        // 确定出餐位置（将顾客节点位置转换为Canvas本地坐标）
        const canvas = this.node.parent;
        if (!canvas) {
            console.error('[CookingControllerV2] ❌ Canvas不存在！');
            return;
        }
        
        // 获取顾客节点的世界坐标
        const customerWorldPos = new Vec3();
        customer.node.getWorldPosition(customerWorldPos);
        
        // 转换为Canvas本地坐标
        const canvasWorldPos = new Vec3();
        canvas.getWorldPosition(canvasWorldPos);
        const servePosition = new Vec3(
            customerWorldPos.x - canvasWorldPos.x,
            customerWorldPos.y - canvasWorldPos.y + 30,  // 稍微高一点
            0
        );
        
        // 播放出餐动画：从打包盒移动到顾客位置
        tween(bgNode)
            .to(0.5, {
                position: servePosition,
                scale: new Vec3(0.8, 0.8, 1)
            })
            .call(() => {
                console.log(`[CookingControllerV2] 🎬 送餐动画完成`);
                
                // 动画完成后，评估订单并结算（这会生成新订单）
                this.evaluateOrderForCustomer(food, customer);
                
                // 获取食物的位置索引（用于清除油渍）
                const posIndex = (food as any).positionIndex;
                
                // 清除对应位置的油渍（如果存在）
                if (posIndex !== undefined && this.oilMarks[posIndex]) {
                    this.oilMarks[posIndex].destroy();
                    this.oilMarks[posIndex] = null;
                    console.log(`[CookingControllerV2] 🧹 清除位置${posIndex}的油渍（食物已送餐）`);
                }
                
                // 销毁食物背景节点（仅在这里销毁一次）
                if (bgNode && bgNode.isValid) {
                    bgNode.destroy();
                    console.log(`[CookingControllerV2] 🗑️ 食物背景节点已销毁（serveFoodToCustomer）`);
                }
                
                // 更新打包盒显示（如果提供了打包盒索引）
                if (boxIndex !== undefined) {
                    this.updatePackingBoxDisplay(boxIndex);
                }
            })
            .start();
        
        this.showMessage('📦 出餐中...');
    }

    /**
     * 丢弃食物
     */
    private throwAwayFood(food: FoodItem) {
        const bgNode = food.node.parent;
        if (!bgNode) return;

        // 获取食物的位置索引（用于清除油渍）
        const posIndex = (food as any).positionIndex;

        // 🗑️ 打开垃圾桶
        this.openTrashBin();

        // 播放丢弃动画
        tween(bgNode)
            .to(0.3, { 
                position: this.trashBin.position.clone(), 
                scale: new Vec3(0.3, 0.3, 1) 
            })
            .call(() => {
                // 从列表中移除
                const index = this.foodItems.indexOf(food);
                if (index > -1) {
                    this.foodItems.splice(index, 1);
                }
                bgNode.destroy();

                // 清除对应位置的油渍（如果存在）
                if (posIndex !== undefined && this.oilMarks[posIndex]) {
                    this.oilMarks[posIndex].destroy();
                    this.oilMarks[posIndex] = null;
                    console.log(`[CookingControllerV2] 🧹 清除位置${posIndex}的油渍（食物已丢弃）`);
                }

                // 不重新排列面饼，保持原位

                this.selectedFood = null;
                this.updateServeButton();
                this.showMessage('🗑️ 食物已丢弃！');
                
                // 🗑️ 延迟关闭垃圾桶
                this.scheduleOnce(() => this.closeTrashBin(), 0.2);
            })
            .start();
    }
    
    /**
     * 🗑️ 丢弃打包盒中的食物
     */
    private throwAwayPackedFood(boxIndex: number, packingBox: Node, originalPos: Vec3) {
        const food = this.packedFoods[boxIndex];
        if (!food) {
            // 没有食物，直接返回原位
            tween(packingBox)
                .to(0.2, { position: originalPos })
                .start();
            return;
        }
        
        // 打开垃圾桶
        this.openTrashBin();
        
        // 播放丢弃动画
        tween(packingBox)
            .to(0.3, { 
                position: this.trashBin.position.clone(), 
                scale: new Vec3(0.5, 0.5, 1) 
            })
            .call(() => {
                // 清空打包盒中的食物
                this.packedFoods[boxIndex] = null;
                
                // 从foodItems列表中移除
                const foodIndex = this.foodItems.indexOf(food);
                if (foodIndex > -1) {
                    this.foodItems.splice(foodIndex, 1);
                }
                
                // 销毁打包盒中的食物显示
                const foodDisplay = packingBox.getChildByName('PackedFoodDisplay');
                if (foodDisplay) {
                    foodDisplay.destroy();
                }
                
                // 清除口味标签
                const flavorLabel = packingBox.getChildByName('FlavorLabel');
                if (flavorLabel) {
                    flavorLabel.destroy();
                }
                
                // 隐藏打包盒
                packingBox.active = false;
                packingBox.setScale(1, 1, 1);
                
                this.showMessage('🗑️ 打包食物已丢弃！');
                
                // 延迟关闭垃圾桶
                this.scheduleOnce(() => this.closeTrashBin(), 0.2);
            })
            .start();
    }

    /**
     * 将食物打包到指定盒子（新逻辑：放入后不直接交付，等待顾客支付）
     */
    private packFoodItem(food: FoodItem, boxIndex: number) {
        // 检查打包盒索引是否有效
        if (boxIndex < 0 || boxIndex >= 3) {
            console.error(`[CookingControllerV2] ❌ 打包盒索引无效: ${boxIndex}`);
            return;
        }

        // 获取对应的打包盒节点
        const packingBox = this.getPackingBox(boxIndex);
        if (!packingBox) {
            console.error(`[CookingControllerV2] ❌ 打包盒${boxIndex + 1}未绑定！`);
            this.showMessage(`⚠️ 打包盒${boxIndex + 1}未设置！`);
            const bgNode = food.node.parent;
            if (bgNode) {
                this.returnToOriginalPosition(bgNode);
            }
            return;
        }

        // 检查打包盒是否已摆放（是否active）
        if (!packingBox.active) {
            this.showMessage('⚠️ 请先点击摆放打包盒！');
            const bgNode = food.node.parent;
            if (bgNode) {
                this.returnToOriginalPosition(bgNode);
            }
            return;
        }

        // 检查该打包盒是否已有食物
        if (this.packedFoods[boxIndex] !== null) {
            this.showMessage(`⚠️ 打包盒${boxIndex + 1}已有食物！`);
            const bgNode = food.node.parent;
            if (bgNode) {
                this.returnToOriginalPosition(bgNode);
            }
            return;
        }
        
        console.log(`[CookingControllerV2] 📦 打包食物到盒子${boxIndex + 1}`);

        const bgNode = food.node.parent;
        if (!bgNode) return;

        // 🔥 立即标记盒子为占用，防止多个食物同时打包到同一个盒子
        this.packedFoods[boxIndex] = food;
        
        // 从铁板上移除
        const index = this.foodItems.indexOf(food);
        if (index > -1) {
            this.foodItems.splice(index, 1);
        }

        // 移除拖动事件，防止打包后还能拖动
        bgNode.off(Node.EventType.TOUCH_START);
        bgNode.off(Node.EventType.TOUCH_MOVE);
        bgNode.off(Node.EventType.TOUCH_END);
        bgNode.off(Node.EventType.TOUCH_CANCEL);
        
        // 🎯 方案D：弧线滑入动画
        const startPos = bgNode.position.clone();
        const endPos = packingBox.position.clone();
        
        // 动画参数
        const duration = 0.4;  // 总时长
        const arcHeight = 50;  // 弧线高度
        let elapsed = 0;
        
        // 添加UIOpacity用于淡出效果
        let opacity = bgNode.getComponent(UIOpacity);
        if (!opacity) {
            opacity = bgNode.addComponent(UIOpacity);
        }
        opacity.opacity = 255;
        
        // 记录初始缩放
        const startScale = bgNode.scale.clone();
        
        const updateAnim = (dt: number) => {
            elapsed += dt;
            const t = Math.min(elapsed / duration, 1);
            
            // quadOut缓动：先快后慢
            const easeT = 1 - Math.pow(1 - t, 2);
            
            // 计算弧线位置（贝塞尔曲线）
            const midX = (startPos.x + endPos.x) / 2;
            const midY = Math.max(startPos.y, endPos.y) + arcHeight;
            
            // 二次贝塞尔曲线
            const oneMinusT = 1 - easeT;
            const x = oneMinusT * oneMinusT * startPos.x + 2 * oneMinusT * easeT * midX + easeT * easeT * endPos.x;
            const y = oneMinusT * oneMinusT * startPos.y + 2 * oneMinusT * easeT * midY + easeT * easeT * endPos.y;
            
            bgNode.setPosition(x, y, startPos.z);
            
            // 缩小效果（从1缩到0.3）
            const scale = startScale.x * (1 - easeT * 0.7);
            bgNode.setScale(scale, scale, 1);
            
            // 轻微旋转
            const rotation = easeT * 15;
            bgNode.setRotationFromEuler(0, 0, -rotation);
            
            // 后半段淡出
            if (t > 0.7) {
                const fadeT = (t - 0.7) / 0.3;
                opacity.opacity = 255 * (1 - fadeT);
            }
            
            // 动画完成
            if (t >= 1) {
                this.unschedule(updateAnim);
                
                // 隐藏原节点
                bgNode.active = false;
                bgNode.setRotationFromEuler(0, 0, 0);
                bgNode.setScale(startScale.x, startScale.y, startScale.z);
                
                // 更新打包盒显示
                this.updatePackingBoxDisplay(boxIndex);
                
                // 显示消息
                const stateText = food.state === DoughState.BURNT ? '（已烧焦）' : '';
                this.showMessage(`📦 食物已装入盒子${boxIndex + 1}${stateText}！`);
                
                // 触发教程动作
                this.triggerTutorialAction('packed', food);
                
                // 检查支付
                this.checkAndTriggerPayments();
            }
        };
        
        this.schedule(updateAnim, 0);
    }
    
    /**
     * 检查并触发所有有订单顾客的支付
     */
    private checkAndTriggerPayments() {
        // 检查是否有任意打包盒有食物
        const hasAnyFood = this.packedFoods.some(food => food !== null);
        
        if (!hasAnyFood) {
            console.log('[CookingControllerV2] 📦 所有打包盒都是空的，不触发支付');
            return;
        }
        
        console.log('[CookingControllerV2] 📦 检测到打包盒有食物，检查所有顾客...');
        
        // 遍历所有3个顾客位置（固定3个），为有订单且未支付的顾客触发支付
        // 注意：this.customers始终保持3个元素，即使某些顾客被隐藏（差评影响）
        for (let i = 0; i < Math.min(3, this.customers.length); i++) {
            const customer = this.customers[i];
            
            // 检查顾客是否存在、显示、有订单、且未支付
            if (customer && customer.node && customer.node.active && customer.order && !this.paidBoxes.has(i)) {
                console.log(`[CookingControllerV2] 💰 顾客${i + 1}检测到有食物打包，触发支付`);
                
                // 延迟触发支付（给动画和UI更新时间）
                // 用闭包保存i的值，防止异步回调时值被改变
                const customerIndex = i;
                setTimeout(() => {
                    // 再次检查，确保顾客还存在且有订单且未支付
                    if (customer && customer.node && customer.node.active && customer.order && !this.paidBoxes.has(customerIndex)) {
                        console.log(`[CookingControllerV2] 💰 顾客${customerIndex + 1}触发支付（500ms延迟后）`);
                        this.triggerCustomerPayment(customer, customerIndex);
                    }
                }, 500);
            } else if (customer && customer.node && customer.node.active && customer.order && this.paidBoxes.has(i)) {
                // 顾客已支付，订单已可拖动，无需再触发
                console.log(`[CookingControllerV2] 💳 顾客${i + 1}已支付，等待拖动订单`);
            }
        }
    }
    
    /**
     * 触发顾客支付（不需要对应打包盒有食物）
     */
    private triggerCustomerPayment(customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}, customerIndex: number) {
        console.log(`[CookingControllerV2] 💰 顾客${customerIndex + 1}开始支付...`);
        console.log(`[CookingControllerV2] 🔍 customer.node.active: ${customer.node?.active}, customer.order: ${!!customer.order}`);
        
        if (!customer.order) {
            console.error(`[CookingControllerV2] ❌ 顾客${customerIndex + 1}没有订单！`);
            return;
        }
        
        // 找到任意一个有食物的打包盒进行评估
        console.log(`[CookingControllerV2] 🔍 开始查找打包盒中的食物...`);
        let foodForEval: FoodItem | null = null;
        for (let i = 0; i < this.packedFoods.length; i++) {
            const food = this.packedFoods[i];
            console.log(`[CookingControllerV2] 🔍 打包盒${i + 1}: ${food ? '有食物' : '空'}`);
            if (food !== null) {
                foodForEval = food;
                break;
            }
        }
        
        if (!foodForEval) {
            console.error(`[CookingControllerV2] ❌ 没有找到打包的食物！`);
            return;
        }
        
        console.log(`[CookingControllerV2] ✅ 找到食物，开始评估订单...`);
        
        // 评估订单（计算得分和收益）
        const evaluation = this.checkOrder(foodForEval, customer.order);
        
        // 播放支付音效（预留接口）
        // TODO: 播放收款音频
        console.log('[CookingControllerV2] 🔊 TODO: 播放收款音效');
        
        // 显示收款提示
        const moneyEarned = evaluation.money;
        this.totalMoney += moneyEarned;
        
        // 同步到库存系统
        this.addMoneyToInventory(moneyEarned);
        
        this.showMessage(`💰 顾客${customerIndex + 1}收款：+${moneyEarned}金币！请将订单拖动到打包盒上`);
        console.log(`[CookingControllerV2] 💰 顾客${customerIndex + 1}支付${moneyEarned}金币，总金币：${this.totalMoney}`);
        
        // ⚠️ 重要修改：不在支付时生成评价，而是在交付后生成
        // 将评价信息保存到顾客对象中，等待交付时使用
        (customer as any).pendingReview = {
            evaluation: evaluation,
            moneyEarned: moneyEarned
        };
        console.log(`[CookingControllerV2] 📋 评价信息已保存，等待交付后生成`);
        
        this.updateMoneyDisplay();
        
        // 标记该顾客已支付，订单可以拖动
        this.paidBoxes.add(customerIndex);
        console.log(`[CookingControllerV2] 💳 已将顾客${customerIndex + 1}标记为已支付，paidBoxes: ${Array.from(this.paidBoxes).join(',')}`);
        
        // 🔥 更改气泡背景颜色，提示可以拖动（重新绘制气泡）
        const updateBubbleColor = () => {
            if (customer.orderLabel && customer.orderLabel.isValid) {
                const bubbleContainer = customer.orderLabel;
                const graphics = (bubbleContainer as any)._bubbleGraphics as Graphics;
                const params = (bubbleContainer as any)._bubbleParams;
                
                if (graphics && params) {
                    const { bubbleWidth, bubbleHeight, radius } = params;
                    
                    // 清除旧的绘制
                    graphics.clear();
                    
                    // 🔥 使用浅绿色填充表示已支付
                    graphics.fillColor = new Color(220, 255, 220, 255);  // 浅绿色背景
                    graphics.strokeColor = new Color(100, 200, 100, 255);  // 绿色边框
                    graphics.lineWidth = 2;
                    
                    // 🔥 绘制简单圆角矩形
                    graphics.roundRect(-bubbleWidth / 2, 0, bubbleWidth, bubbleHeight, radius);
                    graphics.fill();
                    graphics.stroke();
                    
                    // 标记气泡为已支付状态
                    (bubbleContainer as any)._isPaid = true;
                    
                    console.log(`[CookingControllerV2] 🎨 顾客${customerIndex + 1}气泡已变为绿色（已支付）`);
                    return true;
                } else {
                    console.warn(`[CookingControllerV2] ⚠️ 顾客${customerIndex + 1}气泡Graphics未找到`);
                    return false;
                }
            } else {
                console.warn(`[CookingControllerV2] ⚠️ 顾客${customerIndex + 1}的orderLabel还未创建或无效，将延迟再试...`);
                return false;
            }
        };
        
        // 尝试立即更新颜色
        if (!updateBubbleColor()) {
            // 如果失败，延迟50ms再试
            setTimeout(() => {
                if (!updateBubbleColor()) {
                    // 如果还是失败，再延迟100ms最后一次尝试
                    setTimeout(() => {
                        updateBubbleColor();
                    }, 100);
                }
            }, 50);
        }
        
        console.log(`[CookingControllerV2] ✅ 顾客${customerIndex + 1}已支付，等待玩家拖动订单到打包盒上`);
    }
    
    /**
     * 将订单和食物一起交付给顾客
     * @param customer 顾客对象
     * @param customerIndex 顾客索引（0, 1, 2）
     * @param boxIndex 打包盒索引（0, 1, 2）
     * @param orderNode 订单节点
     * @param packingBox 打包盒节点
     */
    private deliverOrderToCustomer(customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}, customerIndex: number, boxIndex: number, orderNode: Node, packingBox: Node) {
        console.log(`[CookingControllerV2] 📦 开始交付给顾客${customerIndex + 1}（打包盒${boxIndex + 1}）`);
        
        const food = this.packedFoods[boxIndex];
        if (!food || !food.node || !food.node.parent) {
            console.error(`[CookingControllerV2] ❌ 打包盒${boxIndex + 1}没有食物！`);
            return;
        }
        
        const foodBgNode = food.node.parent;
        
        // 获取顾客位置
        const canvas = this.node.parent;
        if (!canvas) {
            console.error('[CookingControllerV2] ❌ Canvas不存在！');
            return;
        }
        
        const customerWorldPos = new Vec3();
        customer.node.getWorldPosition(customerWorldPos);
        
        const canvasWorldPos = new Vec3();
        canvas.getWorldPosition(canvasWorldPos);
        const customerPos = new Vec3(
            customerWorldPos.x - canvasWorldPos.x,
            customerWorldPos.y - canvasWorldPos.y,
            0
        );
        
        // 先将订单吸附到打包盒上
        tween(orderNode)
            .to(0.2, { 
                position: packingBox.position.clone().add(new Vec3(0, 20, 0)),
                scale: new Vec3(0.6, 0.6, 1)
            })
            .call(() => {
                // 订单和食物一起移动到顾客身上
                console.log(`[CookingControllerV2] 📫 订单和食物一起移动到顾客身上`);
                
                // 食物移动
                tween(foodBgNode)
                    .to(0.5, {
                        position: customerPos,
                        scale: new Vec3(0.5, 0.5, 1)
                    })
                    .start();
                
                // 订单移动
                tween(orderNode)
                    .to(0.5, {
                        position: customerPos.clone().add(new Vec3(0, 30, 0)),
                        scale: new Vec3(0.5, 0.5, 1)
                    })
                    .call(() => {
                        // 交付完成，清理并生成新订单
                        // 传递customerIndex和boxIndex
                        this.completeDeliveryAndRefresh(customer, customerIndex, boxIndex, foodBgNode, packingBox);
                    })
                    .start();
            })
            .start();
    }
    
    /**
     * 完成交付并刷新（清理顾客、打包盒、食物，生成新订单）
     * @param customer 顾客对象
     * @param customerIndex 顾客索引（0, 1, 2）- 用于生成新订单和检查paidBoxes
     * @param boxIndex 打包盒索引（0, 1, 2）- 用于清空打包盒数据
     */
    private completeDeliveryAndRefresh(customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}, customerIndex: number, boxIndex: number, foodBgNode: Node, packingBox: Node) {
        console.log(`[CookingControllerV2] ✅ 交付完成，开始清理和刷新（顾客${customerIndex + 1}，打包盒${boxIndex + 1}）`);
        
        // 销毁订单标签
        if (customer.orderLabel && customer.orderLabel.isValid) {
            customer.orderLabel.destroy();
            customer.orderLabel = null;
        }
        
        // 销毁食物节点
        if (foodBgNode && foodBgNode.isValid) {
            foodBgNode.destroy();
            console.log('[CookingControllerV2] 🗑️ 食物节点已销毁');
        }
        
        // 隐藏打包盒
        packingBox.active = false;
        console.log(`[CookingControllerV2] 📦 打包盒${boxIndex + 1}已隐藏`);
        
        // 清空打包盒数据
        this.packedFoods[boxIndex] = null;
        // 注意：不要删除paidBoxes中的customerIndex！
        // this.paidBoxes.delete(boxIndex); // 这是错误的！boxIndex是打包盒索引，不是顾客索引
        // paidBoxes会在交付完成后自然清除，不需要在这里删除
        console.log(`[CookingControllerV2] 📦 打包盒${boxIndex + 1}数据已清空，但不删除paidBoxes状态`);
        console.log(`[CookingControllerV2] 🔍 当前paidBoxes: ${Array.from(this.paidBoxes).join(',') || '无'}`);
        
        // 检查是否需要重新启用摆放按钮（有打包盒被隐藏）
        this.checkAndHideEmptyBoxes();
        
        // 隐藏顾客（模拟离开）
        customer.node.active = false;
        
        // ✅ 关键修改：在顾客拿到食物后生成评价
        const pendingReview = (customer as any).pendingReview;
        if (pendingReview) {
            const { evaluation, moneyEarned } = pendingReview;
            
            // 生成评价文本
            let reviewText = '';
            if (evaluation.review === 'super') {
                this.superGoodReviews++;
                reviewText = `🌟 超级好评! +${moneyEarned}💰`;
            } else if (evaluation.review === 'good') {
                this.goodReviews++;
                reviewText = `😊 好评! +${moneyEarned}💰`;
            } else {
                this.badReviews++;
                const reason = evaluation.reason || '食材错';
                reviewText = `😠 差评! (${reason}) +${moneyEarned}💰`;
                console.log(`[CookingControllerV2] 😢 差评！原因: ${reason}, 当前差评数: ${this.badReviews}`);
                
                // 同步差评到库存系统
                this.addBadReviewToInventory();
            }
            
            console.log(`[CookingControllerV2] 📋 顾客${customerIndex + 1}交付后生成评价: ${reviewText}`);
            
            // 添加到评价历史（按时间顺序）
            const reviewScore = evaluation.review === 'super' ? 5.0 : (evaluation.review === 'good' ? 4.5 : 2.0);
            this.reviewHistory.unshift({
                type: evaluation.review as 'super' | 'good' | 'bad',
                text: reviewText,
                score: reviewScore,
                timestamp: Date.now()
            });
            
            console.log(`[CookingControllerV2] 📋 评价历史长度: ${this.reviewHistory.length}, 最新: ${this.reviewHistory[0].text}`);
            
            // 限制历史记录数量
            if (this.reviewHistory.length > 50) {
                this.reviewHistory = this.reviewHistory.slice(0, 50);
            }
            
            // 更新ReviewLabel显示
            this.updateReviewDisplay();
            
            // 清除待处理的评价
            delete (customer as any).pendingReview;
        }
        
        // 🔧 关键修复：清除该顾客的支付状态，允许新顾客重新触发支付
        this.paidBoxes.delete(customerIndex);
        console.log(`[CookingControllerV2] 💳 已清除顾客${customerIndex + 1}的支付状态，paidBoxes: ${Array.from(this.paidBoxes).join(',') || '无'}`);
        
        customer.order = null;
        
        // 延迟1秒后，新顾客到达并生成新订单
        setTimeout(() => {
            console.log(`[CookingControllerV2] 🆕 新顾客${customerIndex + 1}到达！`);
            
            // 再次确认清理旧订单标签
            if (customer.orderLabel && customer.orderLabel.isValid) {
                customer.orderLabel.destroy();
                customer.orderLabel = null;
            }
            
            // 检查差评率，决定是否显示这个顾客
            const totalReviews = this.superGoodReviews + this.goodReviews + this.badReviews;
            let badReviewRatio = 0;
            if (totalReviews > 0) {
                badReviewRatio = this.badReviews / totalReviews;
            }
            
            let activeCustomerCount = 3;
            if (badReviewRatio >= 0.5) {
                activeCustomerCount = 1;
            } else if (badReviewRatio >= 0.3) {
                activeCustomerCount = 2;
            }
            
            // 只有在前activeCustomerCount个顾客位置时，才显示并生成订单
            if (customerIndex < activeCustomerCount) {
                // 🔥 先隐藏CustomerIcon，防止闪烁
                const customerIconNode = customer.node.getChildByName('CustomerIcon');
                if (customerIconNode) {
                    customerIconNode.active = false;
                }
                
                customer.node.active = true;
                const newOrder = this.generateNewOrder(customerIndex);
                customer.order = newOrder;
                this.createOrderUI(customer, customerIndex);
                console.log(`[CookingControllerV2] ✅ 顾客${customerIndex + 1}新订单已生成`);
                
                // 【重要】检查是否有其他打包盒中有食物（提前准备好的）
                console.log(`[CookingControllerV2] 🔍 (交付刷新)检查顾客${customerIndex + 1}是否需要立即支付...`);
                const hasAnyFood = this.packedFoods.some(food => food !== null);
                if (hasAnyFood && !this.paidBoxes.has(customerIndex)) {
                    console.log(`[CookingControllerV2] 📦 新顾客${customerIndex + 1}(交付后)到达时，检测到已有食物打包，触发支付`);
                    this.triggerCustomerPayment(customer, customerIndex);
                } else {
                    console.log(`[CookingControllerV2] ⚠️ 顾客${customerIndex + 1}(交付后)不符合立即支付条件 (hasFood: ${hasAnyFood}, alreadyPaid: ${this.paidBoxes.has(customerIndex)})`);
                }
            } else {
                customer.node.active = false;
                customer.order = null;
                console.log(`[CookingControllerV2] ⚠️ 顾客${customerIndex + 1}因差评率过高而隐藏`);
            }
        }, 1000);
    }

    /**
     * 获取指定索引的打包盒节点
     */
    private getPackingBox(index: number): Node | null {
        switch (index) {
            case 0: return this.packingBox1;
            case 1: return this.packingBox2;
            case 2: return this.packingBox3;
            default: return null;
        }
    }

    /**
     * 检查是否有空的打包盒位置（任何一个用完就启用按钮）
     */
    private checkAndHideEmptyBoxes() {
        // 检查是否有任何一个打包盒已经隐藏（用完）
        const box1Hidden = !this.packingBox1 || !this.packingBox1.active;
        const box2Hidden = !this.packingBox2 || !this.packingBox2.active;
        const box3Hidden = !this.packingBox3 || !this.packingBox3.active;
        
        if (box1Hidden || box2Hidden || box3Hidden) {
            console.log('[CookingControllerV2] 有打包盒已用完，启用摆放按钮');
            
            // 重新启用摆放打包盒按钮（允许单独补充）
            if (this.serveButton) {
                this.serveButton.interactable = true;
            }
            
            const hiddenCount = (box1Hidden ? 1 : 0) + (box2Hidden ? 1 : 0) + (box3Hidden ? 1 : 0);
            this.showMessage(`📦 有 ${hiddenCount} 个打包盒可以补充！`);
        }
    }

    /**
     * 更新打包盒显示（新系统：更新指定打包盒）
     */
    private updatePackingBoxDisplay(boxIndex: number) {
        const packingBox = this.getPackingBox(boxIndex);
        if (!packingBox) return;

        // 🔥 获取或创建口味标签节点
        let labelNode = packingBox.getChildByName('_FlavorLabel');
        let label: Label | null = null;
        
        if (!labelNode) {
            // 创建新的 Label 节点
            labelNode = new Node('_FlavorLabel');
            labelNode.parent = packingBox;
            labelNode.addComponent(UITransform);
            label = labelNode.addComponent(Label);
            label.fontSize = 20;
            label.lineHeight = 24;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.color = new Color(60, 40, 20, 255);  // 深棕色文字
            label.enableOutline = true;
            label.outlineColor = new Color(255, 255, 255, 200);
            label.outlineWidth = 2;
        } else {
            label = labelNode.getComponent(Label);
        }
        
        // 🔥 每次都更新位置（使用可配置的偏移量）
        if (labelNode) {
            labelNode.setPosition(this.flavorLabelOffsetX, this.flavorLabelOffsetY, 0);
        }
        
        const sprite = packingBox.getComponent(Sprite);

        const food = this.packedFoods[boxIndex];
        if (food) {
            // 🔥 生成口味描述
            const flavorText = this.getFlavorText(food);
            const eggText = food.eggCount > 0 ? `${food.eggCount}个蛋` : '';
            
            // 显示食物信息
            if (label) {
                const stateText = food.state === DoughState.BURNT ? '🔥烧焦' : '';
                label.string = `${flavorText}\n${eggText}${stateText}`;
                label.fontSize = 18;
                labelNode!.active = true;
            }
            
            // 切换到装满的打包盒图片
            if (sprite) {
                assetManager.loadAny({uuid: '4857d103-68b1-4e3c-87fc-44f13e0d95f1'}, (err: Error | null, imageAsset: ImageAsset) => {
                    if (err) {
                        console.error('[CookingControllerV2] 加载 packing_box_full 失败:', err);
                        return;
                    }
                    if (imageAsset && sprite.isValid) {
                        const spriteFrame = new SpriteFrame();
                        const texture = new Texture2D();
                        texture.image = imageAsset;
                        spriteFrame.texture = texture;
                        sprite.spriteFrame = spriteFrame;
                        console.log(`[CookingControllerV2] 📦 打包盒${boxIndex + 1}切换到装满状态`);
                    }
                });
            }
            
            // 🔥 为打包盒添加拖动功能
            this.setupPackingBoxDrag(packingBox, boxIndex);
        } else {
            // 空盒子 - 隐藏标签
            if (labelNode) {
                labelNode.active = false;
            }
            
            // 切换到空打包盒图片
            if (sprite) {
                assetManager.loadAny({uuid: '3d15ad02-2978-4620-88c1-41a5ba0239db'}, (err: Error | null, imageAsset: ImageAsset) => {
                    if (err) {
                        console.error('[CookingControllerV2] 加载 packing_box 失败:', err);
                        return;
                    }
                    if (imageAsset && sprite.isValid) {
                        const spriteFrame = new SpriteFrame();
                        const texture = new Texture2D();
                        texture.image = imageAsset;
                        spriteFrame.texture = texture;
                        sprite.spriteFrame = spriteFrame;
                        console.log(`[CookingControllerV2] 📦 打包盒${boxIndex + 1}切换到空状态`);
                    }
                });
            }
            
            // 移除拖动事件
            packingBox.off(Node.EventType.TOUCH_START);
            packingBox.off(Node.EventType.TOUCH_MOVE);
            packingBox.off(Node.EventType.TOUCH_END);
            packingBox.off(Node.EventType.TOUCH_CANCEL);
        }
    }
    
    /**
     * 🔥 根据食物的调料生成口味文本
     */
    private getFlavorText(food: FoodItem): string {
        const customLabel = (food as any).customFlavorLabel as string | undefined;
        if (customLabel) {
            return customLabel;
        }

        const hasVinegar = food.addedIngredients.indexOf(IngredientType.VINEGAR) >= 0;  // 酸
        const hasSugar = food.addedIngredients.indexOf(IngredientType.SUGAR) >= 0;      // 甜
        const hasChili = food.addedIngredients.indexOf(IngredientType.CHILI) >= 0;      // 辣
        
        const flavors: string[] = [];
        if (hasVinegar) flavors.push('酸');
        if (hasSugar) flavors.push('甜');
        if (hasChili) flavors.push('辣');
        
        if (flavors.length === 0) {
            return '原味';
        }
        return flavors.join('');
    }
    
    /**
     * 🔥 为打包盒设置拖动功能（参考刷子的拖动逻辑）
     */
    private setupPackingBoxDrag(packingBox: Node, boxIndex: number) {
        // 先移除旧事件
        packingBox.off(Node.EventType.TOUCH_START);
        packingBox.off(Node.EventType.TOUCH_MOVE);
        packingBox.off(Node.EventType.TOUCH_END);
        packingBox.off(Node.EventType.TOUCH_CANCEL);
        
        let isDragging = false;
        let originalPos = new Vec3();
        
        packingBox.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
            if (this.packedFoods[boxIndex] === null) return;  // 空盒子不可拖动
            
            isDragging = true;
            originalPos.set(packingBox.position);
            
            // 提高层级
            packingBox.setSiblingIndex(999);
            console.log(`[CookingControllerV2] 📦 开始拖动打包盒${boxIndex + 1}`);
            
            // 立即更新位置到触摸点
            this.updateBoxPositionToTouch(packingBox, event);
        }, this);
        
        packingBox.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
            if (!isDragging) return;
            
            // 使用触摸位置直接设置盒子位置（紧跟鼠标）
            this.updateBoxPositionToTouch(packingBox, event);
        }, this);
        
        packingBox.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            if (!isDragging) return;
            isDragging = false;
            
            // 🗑️ 检查是否拖到了垃圾桶（优先判断）
            if (this.trashBin && this.trashBin.active) {
                const boxWorldPos = new Vec3();
                packingBox.getWorldPosition(boxWorldPos);
                
                const trashWorldPos = new Vec3();
                this.trashBin.getWorldPosition(trashWorldPos);
                
                const distance = Vec3.distance(boxWorldPos, trashWorldPos);
                if (distance < 100) {  // 在垃圾桶范围内
                    console.log(`[CookingControllerV2] 🗑️ 打包盒${boxIndex + 1}拖到垃圾桶，丢弃食物`);
                    this.throwAwayPackedFood(boxIndex, packingBox, originalPos);
                    return;
                }
            }
            
            // 检查是否拖到了顾客身上
            const deliveredCustomer = this.checkPackingBoxDelivery(packingBox, boxIndex);
            
            if (!deliveredCustomer) {
                // 没有交付成功，返回原位
                tween(packingBox)
                    .to(0.2, { position: originalPos })
                    .start();
            }
        }, this);
        
        packingBox.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => {
            if (!isDragging) return;
            isDragging = false;
            
            // 返回原位
            tween(packingBox)
                .to(0.2, { position: originalPos })
                .start();
        }, this);
    }
    
    /**
     * 🔥 更新盒子位置到触摸点（参考刷子逻辑，紧跟鼠标）
     */
    private updateBoxPositionToTouch(packingBox: Node, event: EventTouch) {
        const parent = packingBox.parent;
        if (!parent) return;
        
        const parentUITransform = parent.getComponent(UITransform);
        if (!parentUITransform) return;
        
        // 获取触摸的UI坐标
        const uiPos = event.getUILocation();
        
        // 转换为父节点的本地坐标
        const designSize = view.getDesignResolutionSize();
        const canvasSize = parentUITransform.contentSize;
        const scaleToCanvas = canvasSize.width / designSize.width;
        const localX = uiPos.x * scaleToCanvas - canvasSize.width / 2;
        const localY = uiPos.y * scaleToCanvas - canvasSize.height / 2;
        
        // 设置盒子位置（中心对准鼠标）
        packingBox.setPosition(localX, localY, 0);
    }
    
    /**
     * 🔥 检查打包盒是否拖到了顾客身上并完成交付
     */
    private checkPackingBoxDelivery(packingBox: Node, boxIndex: number): boolean {
        const food = this.packedFoods[boxIndex];
        if (!food) return false;
        
        const boxWorldPos = new Vec3();
        packingBox.getWorldPosition(boxWorldPos);
        
        // 🎯 优先检查制作挑战交付目标
        if (this.productionDeliveryTarget && this.productionDeliveryTarget.active) {
            const targetWorldPos = new Vec3();
            this.productionDeliveryTarget.getWorldPosition(targetWorldPos);
            const distance = Vec3.distance(boxWorldPos, targetWorldPos);
            console.log(`[CookingControllerV2] 检查制作挑战目标距离: ${distance.toFixed(0)}`);
            
            if (distance < 180) {  // 交付距离阈值
                // 交付给制作挑战目标
                this.deliverToProductionTarget(food, boxIndex, packingBox);
                return true;
            }
        }
        
        // 检查是否在任意顾客范围内
        for (let i = 0; i < this.customers.length; i++) {
            const customer = this.customers[i];
            if (!customer.node || !customer.node.active || !customer.order) continue;
            
            const customerWorldPos = new Vec3();
            customer.node.getWorldPosition(customerWorldPos);
            
            const distance = Vec3.distance(boxWorldPos, customerWorldPos);
            console.log(`[CookingControllerV2] 检查顾客${i + 1}距离: ${distance.toFixed(0)}`);
            
            if (distance < 150) {  // 交付距离阈值
                // 交付给该顾客（传入顾客索引用于检查是否已付款）
                this.deliverFoodToCustomer(food, customer, boxIndex, packingBox, i);
                return true;
            }
        }
        
        // 根据当前状态显示不同提示
        if (this.useEventSystemV2 && this.eventSystemV2 && this.eventSystemV2.isInProductionChallenge()) {
            this.showMessage('⚠️ 请拖到订单目标处交付！');
        } else {
            this.showMessage('⚠️ 请拖到顾客身上交付！');
        }
        return false;
    }
    
    /**
     * 🎯 交付食物到制作挑战目标
     */
    private deliverToProductionTarget(food: FoodItem, boxIndex: number, packingBox: Node) {
        console.log(`[CookingControllerV2] 🎯 交付食物到制作挑战目标`);
        
        // 通知事件系统制作完成
        if (this.useEventSystemV2 && this.eventSystemV2) {
            this.eventSystemV2.onFoodCompleted();
        }
        
        // 清空打包盒
        this.packedFoods[boxIndex] = null;
        
        // 清除对应位置的油渍（如果存在）
        const posIndex = (food as any).positionIndex;
        if (posIndex !== undefined && this.oilMarks[posIndex]) {
            this.oilMarks[posIndex].destroy();
            this.oilMarks[posIndex] = null;
            console.log(`[CookingControllerV2] 🧹 清除位置${posIndex}的油渍`);
        }
        
        // 重置打包盒外观
        this.updatePackingBoxDisplay(boxIndex);
        
        // 播放交付动画
        const originalScale = packingBox.scale.clone();
        tween(packingBox)
            .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
            .to(0.1, { scale: originalScale })
            .start();
        
        this.showMessage('✅ 订单已交付！');
    }
    
    /**
     * 🔥 将食物交付给顾客并评价
     * @param customerIndex 顾客索引，用于检查是否已付款
     */
    private deliverFoodToCustomer(food: FoodItem, customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}, boxIndex: number, packingBox: Node, customerIndex: number) {
        if (!customer.order) return;
        
        console.log(`[CookingControllerV2] 📦 交付食物给顾客${customerIndex + 1}，开始评价...`);
        
        // 🎲 通知事件系统V2制作完成（用于制作挑战）
        if (this.useEventSystemV2 && this.eventSystemV2 && this.eventSystemV2.isInProductionChallenge()) {
            this.eventSystemV2.onFoodCompleted();
        }
        
        // 🍜 检查是否有待交付任务（如拾荒老人等事件）
        if (this.useEventSystemV2 && this.eventSystemV2 && this.eventSystemV2.hasPendingDelivery()) {
            const deliveryResult = this.eventSystemV2.completeDelivery();
            if (deliveryResult.isComplete) {
                this.showMessage(deliveryResult.message);
                console.log(`[CookingControllerV2] 🍜 事件交付完成: ${deliveryResult.message}`);
            } else {
                console.log(`[CookingControllerV2] 🍜 事件交付进度: ${deliveryResult.message}`);
            }
        }
        
        const orderRecipe = this.getOrderRecipe(customer.order);
        const isGrilledOrder = !orderRecipe || this.isGrilledNoodleRecipe(orderRecipe);

        // ?? 计算食物价格（基础8元已含1蛋1肠，额外的才加钱）
        let reward = 0;
        if (isGrilledOrder) {
            const basePrice = this.PRICING.BASE_PRICE;  // 8元包含1个蛋+1个肠
            const extraEggs = Math.max(0, food.eggCount - 1);  // 额外的蛋（超过1个的部分）
            const eggPrice = extraEggs * this.PRICING.EGG_PRICE;
            const sausageCount = food.addedIngredients.filter(i => i === IngredientType.SAUSAGE).length;
            const extraSausages = Math.max(0, sausageCount - 1);  // 额外的肠（超过1个的部分）
            const sausagePrice = extraSausages * this.PRICING.SAUSAGE_PRICE;
            reward = basePrice + eggPrice + sausagePrice;
            console.log('[CookingControllerV2] ?? 定价: 基础' + basePrice + '(含1蛋1肠) + 额外蛋' + eggPrice + ' + 额外肠' + sausagePrice + ' = ' + reward + '元');
        } else if (orderRecipe) {
            reward = orderRecipe.price;
            console.log('[CookingControllerV2] ?? 定价: 菜品' + orderRecipe.name + ' = ' + reward + '元');
        }
        
        // 评价食物（返回详细信息）
        const evaluation = this.evaluateFood(food, customer.order);
        const rating = evaluation.rating;
        
        // 🔥 评价只影响热度，不影响价格（价格固定）
        let ratingText = '';
        let heatChange = 0;
        switch (rating) {
            case 'excellent':
                ratingText = '⭐⭐⭐ 特别好评！';
                heatChange = 5;  // 热度+5
                this.superGoodReviews++;
                break;
            case 'good':
                ratingText = '⭐⭐ 好评！';
                heatChange = 2;  // 热度+2
                this.goodReviews++;
                break;
            case 'bad':
                ratingText = '⭐ 差评...';
                heatChange = -8;  // 热度-8
                this.badReviews++;
                break;
        }
        
        // 🔥 更新店铺热度
        this.updateShopHeat(heatChange);
        
        // 🔥 检查顾客是否已付款，未付款则在此添加金币（避免双重支付）
        if (!this.paidBoxes.has(customerIndex)) {
            this.totalMoney += reward;
            this.addMoneyToInventory(reward);
            this.updateMoneyDisplay();
            console.log(`[CookingControllerV2] 💰 顾客${customerIndex + 1}未预付款，交付时结算: +${reward}元，总金币: ${this.totalMoney}`);
            this.showMessage(`${ratingText} +${reward}元`);
        } else {
            console.log(`[CookingControllerV2] 💰 顾客${customerIndex + 1}已预付款，不重复结算`);
            this.showMessage(`${ratingText}`);
        }
        
        // 🔥 使用新的评价文本生成（带随机性格和具体问题说明）
        const reviewType: 'super' | 'good' | 'bad' = rating === 'excellent' ? 'super' : (rating === 'good' ? 'good' : 'bad');
        const reviewText = this.generateReviewText(rating, evaluation.reason, evaluation.details);
        
        // 🔥 计算评分（超级好评5分，好评4.5分，差评0-4分）
        const score = this.calculateScore(rating, evaluation.reason);
        this.addScore(score);
        
        this.reviewHistory.unshift({
            type: reviewType,
            text: reviewText,
            score: score,
            timestamp: Date.now()
        });
        
        // 限制历史记录数量
        if (this.reviewHistory.length > 50) {
            this.reviewHistory = this.reviewHistory.slice(0, 50);
        }
        
        console.log(`[CookingControllerV2] 📝 添加评价: ${reviewType} - ${reviewText} (${score}分, 平均${this.averageScore.toFixed(1)}分)`);
        
        // 🔥 立即隐藏盒子
        packingBox.active = false;
        
        // 清空打包盒数据
        this.packedFoods[boxIndex] = null;
        
        // 🔥 恢复打包盒到初始位置（桌上原位置），而不是当前位置
        const initialPos = this.packingBoxInitialPositions[boxIndex];
        if (initialPos) {
            packingBox.setPosition(initialPos);
            console.log(`[CookingControllerV2] 📦 打包盒${boxIndex + 1}已重置到初始位置: (${initialPos.x.toFixed(0)}, ${initialPos.y.toFixed(0)})`);
        }
        packingBox.setScale(1, 1, 1);
        
        // 更新打包盒显示（切换到空状态）
        this.updatePackingBoxDisplay(boxIndex);
        
        // 🔥 顾客离开动画（使用传入的顾客索引）
        this.customerLeaveAfterDelivery(customerIndex, rating);
        
        // 触发教程事件
        this.triggerTutorialAction('delivered', { rating, food });
        EventManager.Instance.emit(GameEvents.ORDER_COMPLETE, { levelId: this.getCurrentLevelId() });
        
        console.log(`[CookingControllerV2] ✅ 交付完成，评价: ${rating}, 奖励: ${reward}`);
    }
    
    /**
     * 🔥 顾客收到食物后离开（支持多顾客独立动画）
     */
    private customerLeaveAfterDelivery(customerIndex: number, rating: string) {
        if (customerIndex < 0 || customerIndex >= this.customers.length) return;
        
        const customer = this.customers[customerIndex];
        if (!customer || !customer.node) return;
        
        // 记录原始位置用于复位
        const originalPos = new Vec3();
        originalPos.set(customer.node.position);
        
        // 隐藏订单气泡
        if (customer.orderLabel) {
            customer.orderLabel.active = false;
        }
        
        // 清除订单
        customer.order = null;
        
        // 顾客满意/不满意的表情
        const emoji = rating === 'bad' ? '😞' : (rating === 'excellent' ? '😍' : '😊');
        
        // 🔥 为每个顾客创建独立的离开动画
        const customerNode = customer.node;
        
        tween(customerNode)
            .to(0.2, { scale: new Vec3(1.15, 1.15, 1) })  // 开心跳起
            .to(0.4, { 
                position: new Vec3(originalPos.x + 400, originalPos.y + 50, 0),
                scale: new Vec3(0.7, 0.7, 1)
            }, { easing: 'quadOut' })
            .call(() => {
                // 隐藏顾客
                customerNode.active = false;
                // 复位位置和缩放，等待下次使用
                customerNode.setPosition(originalPos);
                customerNode.setScale(1, 1, 1);
                console.log(`[CookingControllerV2] 👋 顾客${customerIndex + 1}离开 ${emoji}`);
                
                // 🔥 顾客离开后立即检查是否需要补充新顾客
                this.scheduleOnce(() => {
                    this.refillCustomers();
                }, 0.5);  // 0.5秒后补充新顾客
            })
            .start();
    }
    
    /**
     * 🔥 根据热度获取最大同时在场顾客数 (public供调试用)
     */
    public getMaxCustomersByHeat(): number {
        // 热度 0-30: 1个顾客
        // 热度 31-60: 2个顾客
        // 热度 61-100: 3个顾客
        if (this.shopHeat >= 61) return 3;
        if (this.shopHeat >= 31) return 2;
        return 1;
    }
    
    /**
     * 🔥 补充顾客（保证店铺不断客）
     */
    private refillCustomers() {
        // 🎲 事件阶段不补充顾客
        if (this.eventState.customerClearing || this.eventState.isEventPhase) {
            console.log('[CookingControllerV2] 🚫 事件阶段，不补充顾客');
            return;
        }
        
        // 🎲 检查是否到达事件触发时间（提前阻止生成新顾客）
        if (this.isAtEventTriggerTime()) {
            console.log('[CookingControllerV2] 🚫 即将触发事件，不补充顾客');
            return;
        }
        
        // 🔥 使用统一的目标顾客数计算（考虑时间进度和差评率）
        const targetCount = this.getTargetCustomerCount();
        
        // 统计当前活跃顾客数
        let activeCount = 0;
        for (const customer of this.customers) {
            if (customer.node && customer.node.active && customer.order) {
                activeCount++;
            }
        }
        
        console.log(`[CookingControllerV2] 🔄 补充顾客检查: 当前${activeCount}人, 目标${targetCount}人`);
        
        // 补充顾客到目标数量（spawnCustomerAt会再次检查是否应该生成）
        if (activeCount < targetCount) {
            for (let i = 0; i < this.customers.length && activeCount < targetCount; i++) {
                const customer = this.customers[i];
                if (customer.node && !customer.node.active) {
                    this.spawnCustomerAt(i);
                    // 只有在顾客确实被激活时才增加计数
                    if (customer.node.active) {
                        activeCount++;
                        console.log(`[CookingControllerV2] ➕ 补充顾客${i + 1}`);
                    }
                }
            }
        }
    }
    
    /**
     * 🔥 更新店铺热度
     */
    private updateShopHeat(change: number) {
        const oldHeat = this.shopHeat;
        this.shopHeat = Math.max(0, Math.min(100, this.shopHeat + change));
        console.log(`[CookingControllerV2] 🔥 店铺热度: ${oldHeat} → ${this.shopHeat} (${change > 0 ? '+' : ''}${change})`);
        // 同时更新手机界面
        this.updatePhoneMainScreenData();
        
        // 🔥 热度变化后检查是否需要补充顾客（热度提升可能增加最大顾客数）
        if (change > 0) {
            this.scheduleOnce(() => {
                this.refillCustomers();
            }, 0.3);
        }
    }
    
    /**
     * 🔥 获取当前顾客生成间隔（根据热度调整）
     * 注意：热度再低也保证至少有顾客（间隔上限45秒）
     */
    private getCustomerSpawnInterval(): number {
        // 热度越高，顾客来得越快
        // 热度100: 间隔5秒，热度50: 间隔17.5秒，热度0: 间隔30秒
        const minInterval = 5;
        const maxInterval = 30;  // 最慢30秒来一个，保证不断客
        const interval = maxInterval - (this.shopHeat / 100) * (maxInterval - minInterval);
        return interval;
    }
    
    /**
     * 🔥 确保至少有一个顾客（热度再低也不断客）
     */
    private ensureMinimumCustomer() {
        // 🎲 事件阶段不生成顾客
        if (this.eventState.customerClearing || this.eventState.isEventPhase) {
            return;
        }
        
        // 检查是否有任何活跃顾客
        let hasActiveCustomer = false;
        for (const customer of this.customers) {
            if (customer.node && customer.node.active && customer.order) {
                hasActiveCustomer = true;
                break;
            }
        }
        
        // 如果没有活跃顾客，强制生成一个
        if (!hasActiveCustomer) {
            console.log('[CookingControllerV2] 🔥 没有活跃顾客，强制生成一个');
            this.trySpawnCustomer();
        }
    }
    
    /**
     * 🔥 尝试生成顾客（找到空闲位置）
     */
    private trySpawnCustomer() {
        // 🎲 事件清场阶段不生成新顾客
        if (this.eventState.customerClearing || this.eventState.isEventPhase) {
            return;
        }
        
        for (let i = 0; i < this.customers.length; i++) {
            const customer = this.customers[i];
            if (customer.node && !customer.node.active) {
                // 找到空闲位置，生成顾客
                this.spawnCustomerAt(i);
                break;
            }
        }
    }
    
    /**
     * 🔥 计算当前应该显示的最大顾客数量（根据时间进度和差评率）
     */
    private getTargetCustomerCount(): number {
        // 获取时间进度
        const timeManager = TimeManager.instance;
        let timeProgress = 0;
        if (timeManager) {
            timeProgress = timeManager.getBusinessProgress();
        }
        
        // 计算差评率
        const totalReviews = this.superGoodReviews + this.goodReviews + this.badReviews;
        let badReviewRatio = 0;
        if (totalReviews > 0) {
            badReviewRatio = this.badReviews / totalReviews;
        }
        
        // 计算基础顾客数量
        let baseCustomerCount = 1;
        if (timeProgress >= 0.75) {
            baseCustomerCount = 3;
        } else if (timeProgress >= 0.4) {
            baseCustomerCount = 2;
        } else {
            baseCustomerCount = 1;
        }
        
        // 根据差评率调整
        let targetCount = baseCustomerCount;
        if (badReviewRatio >= 0.5) {
            targetCount = Math.max(1, baseCustomerCount - 2);
        } else if (badReviewRatio >= 0.3) {
            targetCount = Math.max(1, baseCustomerCount - 1);
        }
        
        return Math.min(3, targetCount);
    }
    
    /**
     * 🔥 在指定位置生成顾客 (public供调试用)
     */
    public spawnCustomerAt(index: number) {
        const customer = this.customers[index];
        if (!customer || !customer.node) return;
        
        // 🎲 事件阶段或即将触发事件时不生成顾客
        if (this.eventState.customerClearing || this.eventState.isEventPhase || this.isAtEventTriggerTime()) {
            console.log('[CookingControllerV2] 🚫 事件相关阶段，跳过生成顾客');
            return;
        }
        
        // 🔥 检查该顾客位置是否应该显示（根据差评率和时间进度）
        const targetCount = this.getTargetCustomerCount();
        if (index >= targetCount) {
            console.log(`[CookingControllerV2] 🚫 顾客${index + 1}因差评率/时间限制不生成（目标数量: ${targetCount}）`);
            return;
        }
        
        // 生成订单
        const order = this.generateNewOrder(index);
        customer.order = order;
        
        // 🔥 先隐藏CustomerIcon，防止闪烁（在显示顾客节点之前）
        const customerIconNode = customer.node.getChildByName('CustomerIcon');
        if (customerIconNode) {
            customerIconNode.active = false;
        }
        
        // 显示顾客
        customer.node.active = true;
        
        // 创建订单UI（内部会加载新角色图片后再显示CustomerIcon）
        this.createOrderUI(customer, index);
        
        console.log(`[CookingControllerV2] 👤 顾客${index + 1}来了！`);
    }
    
    /**
     * 🔥 获取店铺热度等级描述
     */
    private getShopHeatLevel(): { level: string, color: Color, emoji: string } {
        if (this.shopHeat >= 80) {
            return { level: '火爆', color: new Color(255, 59, 48, 255), emoji: '🔥🔥🔥' };
        } else if (this.shopHeat >= 60) {
            return { level: '热门', color: new Color(255, 149, 0, 255), emoji: '🔥🔥' };
        } else if (this.shopHeat >= 40) {
            return { level: '正常', color: new Color(52, 199, 89, 255), emoji: '🔥' };
        } else if (this.shopHeat >= 20) {
            return { level: '冷清', color: new Color(90, 200, 250, 255), emoji: '❄️' };
        } else {
            return { level: '萧条', color: new Color(142, 142, 147, 255), emoji: '💀' };
        }
    }
    
    private getCurrentLevelId(): number {
        const progressLevel = GameProgressManager.instance?.progress?.currentLevel;
        if (progressLevel) return progressLevel;

        const inventoryLevel = InventoryManager.instance?.currentLevel?.levelId;
        if (inventoryLevel) return inventoryLevel;

        const gameLevel = GameManager.Instance?.currentLevel?.levelId;
        if (gameLevel) return gameLevel;

        return 1;
    }

    private getCurrentLevelRecipes(): RecipeData[] {
        const levelId = this.getCurrentLevelId();
        const levelConfig = GameConfig.LEVELS.find((level) => level.levelId === levelId);
        if (levelConfig && levelConfig.recipes && levelConfig.recipes.length > 0) {
            return levelConfig.recipes;
        }
        return [];
    }

    private pickRecipeForCurrentLevel(): RecipeData | null {
        const recipes = this.getCurrentLevelRecipes();
        if (!recipes.length) return null;
        return recipes[Math.floor(Math.random() * recipes.length)];
    }

    private getRecipeById(recipeId?: string): RecipeData | null {
        if (!recipeId) return null;
        for (const level of GameConfig.LEVELS) {
            const recipe = level.recipes.find((item) => item.id === recipeId);
            if (recipe) return recipe;
        }
        return null;
    }

    private isGrilledNoodleRecipe(recipe: RecipeData | null): boolean {
        if (!recipe) return true;
        return recipe.id === GameConfig.RECIPE_GRILLED_COLD_NOODLE.id ||
            recipe.id === GameConfig.RECIPE_TUTORIAL.id;
    }

    private getOrderRecipe(order: CustomerOrder): RecipeData | null {
        return this.getRecipeById(order.recipeId);
    }

    private evaluateGenericFood(food: FoodItem, recipe: RecipeData): { rating: 'excellent' | 'good' | 'bad', reason: string, details: string[] } {
        const details: string[] = [];
        if (food.state === DoughState.BURNT) {
            return { rating: 'bad', reason: 'burnt', details: ['烧焦了'] };
        }

        const quality = food.getQuality();
        if (quality >= 90) return { rating: 'excellent', reason: 'quality', details };
        if (quality >= 60) return { rating: 'good', reason: 'quality', details };
        return { rating: 'bad', reason: 'quality', details: ['品质不佳'] };
    }

    /**
     * ?? 评价食物（根据订单和食物状态）- 严格匹配，返回详细信息
     */
    private evaluateFood(food: FoodItem, order: CustomerOrder): { rating: 'excellent' | 'good' | 'bad', reason: string, details: string[] } {
        const details: string[] = [];

        const orderRecipe = this.getOrderRecipe(order);
        if (orderRecipe && !this.isGrilledNoodleRecipe(orderRecipe)) {
            return this.evaluateGenericFood(food, orderRecipe);
        }

        // ?? 烧焦的一定是差评
        if (food.state === DoughState.BURNT) {
            return { rating: 'bad', reason: 'burnt', details: ['烧焦了'] };
        }

        // ?? 检查是否有不要的食材
        for (const exclude of order.excludes) {
            if (food.addedIngredients.indexOf(exclude) >= 0) {
                const excludeName = this.getIngredientName(exclude);
                details.push(`不要${excludeName}却加了`);
            }
        }
        if (details.length > 0) {
            return { rating: 'bad', reason: 'excluded', details };
        }

        // ?? 检查口味是否匹配
        const hasVinegar = food.addedIngredients.indexOf(IngredientType.VINEGAR) >= 0;
        const hasSugar = food.addedIngredients.indexOf(IngredientType.SUGAR) >= 0;
        const hasChili = food.addedIngredients.indexOf(IngredientType.CHILI) >= 0;

        let flavorMatch = false;
        const flavorProblems: string[] = [];

        switch (order.flavor) {
            case FlavorType.SWEET_SPICY:  // 甜辣：要糖和辣，不要醋
                if (!hasSugar) flavorProblems.push('没加糖');
                if (!hasChili) flavorProblems.push('没加辣');
                if (hasVinegar) flavorProblems.push('加了醋');
                flavorMatch = hasSugar && hasChili && !hasVinegar;
                break;
            case FlavorType.SOUR_SWEET:   // 酸甜：要醋和糖，不要辣
                if (!hasVinegar) flavorProblems.push('没加醋');
                if (!hasSugar) flavorProblems.push('没加糖');
                if (hasChili) flavorProblems.push('加了辣');
                flavorMatch = hasVinegar && hasSugar && !hasChili;
                break;
            case FlavorType.SOUR_SWEET_SPICY:  // 酸甜辣：要醋糖辣
                if (!hasVinegar) flavorProblems.push('没加醋');
                if (!hasSugar) flavorProblems.push('没加糖');
                if (!hasChili) flavorProblems.push('没加辣');
                flavorMatch = hasVinegar && hasSugar && hasChili;
                break;
        }

        if (!flavorMatch) {
            return { rating: 'bad', reason: 'flavor', details: flavorProblems };
        }

        // ?? 检查鸡蛋数量
        const expectedEggs = order.eggCount || 1;
        const eggMatch = food.eggCount === expectedEggs;

        if (!eggMatch) {
            const eggProblem = food.eggCount < expectedEggs
                ? `要${expectedEggs}个蛋只加了${food.eggCount}个`
                : `要${expectedEggs}个蛋加了${food.eggCount}个`;
            return { rating: 'bad', reason: 'egg', details: [eggProblem] };
        }

        // 完全匹配，根据喷水加成和随机决定是否特别好评
        if (food.waterBonusChance > 0 && Math.random() < food.waterBonusChance) {
            return { rating: 'excellent', reason: 'water_bonus', details: [] };
        }

        if (Math.random() < 0.3) {
            return { rating: 'excellent', reason: 'random', details: [] };
        }

        return { rating: 'good', reason: 'match', details: [] };
    }
    
    /**
     * 🔥 获取食材名称
     */
    private getIngredientName(type: IngredientType): string {
        switch (type) {
            case IngredientType.VINEGAR: return '醋';
            case IngredientType.SUGAR: return '糖';
            case IngredientType.CHILI: return '辣椒';
            case IngredientType.ONION: return '洋葱';
            case IngredientType.CILANTRO: return '香菜';
            case IngredientType.SAUSAGE: return '香肠';
            case IngredientType.EGG: return '鸡蛋';
            default: return '未知';
        }
    }
    
    /**
     * 🔥 生成随机性格的评价文本
     */
    private generateReviewText(rating: 'excellent' | 'good' | 'bad', reason: string, details: string[]): string {
        // 随机性格类型
        const personalities = ['温和', '暴躁', '挑剔', '随和', '幽默'];
        const personality = personalities[Math.floor(Math.random() * personalities.length)];
        
        if (rating === 'excellent') {
            const texts: { [key: string]: string[] } = {
                '温和': ['非常满意，谢谢老板~', '做得真好吃，下次还来！', '完美的味道，太棒了！'],
                '暴躁': ['就这样！终于做对了！', '哼，这还差不多！', '早该这样做！'],
                '挑剔': ['嗯...勉强达到我的标准', '这次做得还行', '总算是合格了'],
                '随和': ['挺好的呀~', '好吃好吃！', '老板手艺不错嘛'],
                '幽默': ['这味道，绝绝子！', '我的味蕾在跳舞~', '五星好评，不接受反驳！']
            };
            const list = texts[personality] || texts['温和'];
            return list[Math.floor(Math.random() * list.length)];
        }
        
        if (rating === 'good') {
            const texts: { [key: string]: string[] } = {
                '温和': ['味道不错，挺好的', '还可以，下次再来', '嗯，挺香的'],
                '暴躁': ['行吧行吧', '凑合吧', '还行'],
                '挑剔': ['一般般吧', '中规中矩', '普通水平'],
                '随和': ['挺好吃的~', '不错不错', '可以的'],
                '幽默': ['嗯，能吃', '及格线上徘徊', '还行吧，没翻车']
            };
            const list = texts[personality] || texts['温和'];
            return list[Math.floor(Math.random() * list.length)];
        }
        
        // 差评：需要说明问题
        const problemText = details.join('，');
        const texts: { [key: string]: string[] } = {
            '温和': [`不太对呢...${problemText}`, `这个有点问题...${problemText}`, `下次注意一下哦，${problemText}`],
            '暴躁': [`搞什么啊！${problemText}！`, `气死我了！${problemText}！`, `不会做就别做！${problemText}！`],
            '挑剔': [`完全不行，${problemText}`, `太差了，${problemText}`, `不可接受，${problemText}`],
            '随和': [`有点可惜，${problemText}`, `下次改进吧，${problemText}`, `没关系，${problemText}`],
            '幽默': [`大哥你认真的吗？${problemText}`, `这是什么黑暗料理...${problemText}`, `我点的不是这个啊喂！${problemText}`]
        };
        const list = texts[personality] || texts['温和'];
        return list[Math.floor(Math.random() * list.length)];
    }
    
    /**
     * 🔥 计算评分（超级好评5分，好评4.5分，差评0-4分）
     */
    private calculateScore(rating: 'excellent' | 'good' | 'bad', reason: string): number {
        if (rating === 'excellent') {
            return 5.0;  // 超级好评 5分
        }
        if (rating === 'good') {
            return 4.5;  // 好评 4.5分
        }
        // 差评根据原因给分 0-4分
        switch (reason) {
            case 'burnt':
                return 0;    // 烧焦 0分
            case 'excluded':
                return 1.5;  // 加了不要的食材 1.5分
            case 'flavor':
                return 2.0;  // 口味不对 2分
            case 'egg':
                return 3.0;  // 鸡蛋数量不对 3分
            default:
                return 2.0;  // 其他问题 2分
        }
    }
    
    /**
     * 🔥 添加评分并更新平均分
     */
    private addScore(score: number) {
        this.allScores.push(score);
        this.totalScore += score;
        this.averageScore = this.totalScore / this.allScores.length;
        
        console.log(`[CookingControllerV2] ⭐ 评分: ${score}分, 总计${this.allScores.length}单, 平均${this.averageScore.toFixed(2)}分`);
        
        // 更新手机界面显示
        this.updatePhoneMainScreenData();
    }
    
    /**
     * 🔥 获取平均评分
     */
    public getAverageScore(): number {
        return this.averageScore;
    }
    
    // 删除旧的部分匹配逻辑
    private evaluateFoodOld_UNUSED(flavorMatch: boolean, eggMatch: boolean): string {
        if (flavorMatch || eggMatch) {
            return 'good';  // 部分匹配
        }
        
        return 'bad';  // 完全不匹配
    }
    
    /**
     * 🔥 清除顾客订单
     */
    private clearCustomerOrder(customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}) {
        customer.order = null;
        if (customer.orderLabel) {
            customer.orderLabel.active = false;
        }
        // 可以在这里添加顾客离开动画
    }

    // ========== 拖动系统 ==========

    /**
     * 开始拖动面饼
     */
    private onFoodDragStart(event: EventTouch, food: FoodItem) {
        // 🔥 阻止事件传播
        event.propagationStopped = true;
        
        console.log(`[Debug] 🔥🔥🔥 onFoodDragStart 被调用！面饼=${food.node.name}, positionIndex=${food.positionIndex}, 状态=${food.state}`);
        console.log(`[Debug] 当前手持物品: ${this.currentHandItem || '无'}`);
        console.log(`[Debug] 刷酱控制器状态: ${this.brushSauceController?.isActive ? '激活' : '未激活'}`);
        
        // 关键修复：如果手上拿着食材，优先添加食材，不启动拖动
        if (this.currentHandItem) {
            // 🍴 铲子特殊处理：执行翻面/卷切操作
            if (this.currentHandItem === IngredientType.SPATULA) {
                // 🔥 如果铲子动画正在播放中，忽略操作
                if (this._isSpatulaAnimating) {
                    console.log('[CookingControllerV2] 🍴 铲子动画播放中，忽略操作');
                    return;
                }
                
                console.log(`[CookingControllerV2] 🍴 用铲子操作面饼 positionIndex=${food.positionIndex}, 状态=${food.state}`);
                this._handlingFoodClick = true;
                
                if (food.state === DoughState.EGG_ADDED && !food.isFlipped) {
                    // 翻面
                    console.log('[CookingControllerV2] 🍴 用铲子翻面');
                    this._spatulaOperationPhase = 'flip';  // 设置当前阶段
                    this.flipFood(food);
                    this.showMessage('✅ 翻面成功！');
                    // 🔥 延迟检查，等待铲子动画播放完成 (0.5秒)
                    this.scheduleOnce(() => this.checkAndPutDownSpatula(), 0.6);
                } else if (food.state === DoughState.FLIPPED) {
                    // 检查是否满足卷起条件
                    if (!food.hasSauce) {
                        this.showMessage('⚠️ 请先刷酱料！点击酱料瓶拿起刷子！');
                    } else {
                        const hasChili = food.addedIngredients.some(i => i === IngredientType.CHILI);
                        const hasSugar = food.addedIngredients.some(i => i === IngredientType.SUGAR);
                        const hasVinegar = food.addedIngredients.some(i => i === IngredientType.VINEGAR);
                        if (!hasChili && !hasSugar && !hasVinegar) {
                            this.showMessage('⚠️ 请先添加调料（辣椒/白糖/醋）！');
                        } else {
                            const hasSausage = food.addedIngredients.some(i => i === IngredientType.SAUSAGE);
                            if (!hasSausage) {
                                this.showMessage('⚠️ 请先添加香肠再卷起！香肠是必加品！');
                            } else {
                                // 用铲子卷起
                                console.log('[CookingControllerV2] 🍴 用铲子卷起！');
                                this._spatulaOperationPhase = 'roll';  // 设置当前阶段
                                this.rollFood(food);
                                this.showMessage('✅ 卷起成功！');
                                // 🔥 延迟检查，等待铲子动画播放完成
                                this.scheduleOnce(() => this.checkAndPutDownSpatula(), 0.6);
                            }
                        }
                    }
                } else if (food.state === DoughState.ROLLED) {
                    // 🌯 卷好后需要先刷酱才能切块
                    if (!food.hasRollSauce) {
                        this.showMessage('⚠️ 请先刷酱料再切块！');
                        console.log('[CookingControllerV2] ⚠️ 卷好的面饼需要先刷酱');
                    } else {
                        // 🔪 用铲子切一刀（新逻辑：每次点击切一刀）
                        console.log('[CookingControllerV2] 🔪 用铲子切一刀');
                        this._spatulaOperationPhase = 'cut';
                        this.cutFoodOnce(food);
                        // 不立即检查放下铲子，由 cutFoodOnce 内部处理
                    }
                } else if (food.state === DoughState.CUT) {
                    // 🔪 切好的面饼，点击打包
                    console.log('[CookingControllerV2] 📦 点击切好的面饼打包');
                    this.packCutFood(food);
                } else {
                    this.showMessage('⚠️ 当前状态无法使用铲子！');
                }
                
                this.scheduleOnce(() => { this._handlingFoodClick = false; }, 0.1);
                return;
            }
            
            // 🌯 刷子特殊处理：对卷好的面饼启动快速刷酱模式
            if (this.currentHandItem === IngredientType.GRILLED_NOODLE_SAUCE) {
                if (food.state === DoughState.ROLLED && !food.hasRollSauce) {
                    console.log('[CookingControllerV2] 🖌️ 对卷好的面饼启动快速刷酱');
                    this._handlingFoodClick = true;
                    
                    // 启动快速刷酱模式（进度条很快刷满）
                    const bgNode = food.node.parent;
                    if (bgNode && this.brushSauceController) {
                        this.brushSauceController.startQuickBrushingMode(bgNode, () => {
                            // 刷酱完成回调
                            this.applyRollSauce(food);
                            
                            // 🔥 检查是否还有未刷酱的卷好面饼
                            const hasMoreRolledDough = this.foodItems.some(f => 
                                f.state === DoughState.ROLLED && !f.hasRollSauce
                            );
                            
                            if (hasMoreRolledDough) {
                                // 还有未刷酱的面饼，继续持有刷子
                                console.log('[CookingControllerV2] 🖌️ 还有未刷酱的面饼，继续持有刷子');
                                this.showMessage('🖌️ 还有面饼需要刷酱，继续点击！');
                            } else {
                                // 所有面饼都刷完了，放下刷子
                                console.log('[CookingControllerV2] 🖌️ 所有面饼都刷完酱了，放下刷子');
                                this.currentHandItem = null;
                                this.handItemCount = 0;
                                this.updateHandDisplay();
                                this.showBrushOnSauceButton();
                                // 🔥 移除原生鼠标监听
                                this.removeNativeMouseListener();
                            }
                        });
                    }
                    
                    this.scheduleOnce(() => { this._handlingFoodClick = false; }, 0.1);
                    return;
                }
            }
            
            console.log(`[CookingControllerV2] 手上有食材(${this.currentHandItem})，添加到面饼 positionIndex=${food.positionIndex}`);
            // 🔥 标记正在处理面饼点击，防止 onGrillClick 重复处理
            this._handlingFoodClick = true;
            this.addIngredientToFood(food);
            // 延迟重置标记
            this.scheduleOnce(() => { this._handlingFoodClick = false; }, 0.1);
            return;
        }
        
        // 🔪 切好的面饼（CUT状态），点击直接打包（无论是否拿着铲子）
        if (food.state === DoughState.CUT) {
            console.log('[CookingControllerV2] 📦 点击切好的面饼打包（空手）');
            this._handlingFoodClick = true;
            this.packCutFood(food);
            this.scheduleOnce(() => { this._handlingFoodClick = false; }, 0.1);
            return;
        }
        
        // 🔥 打完鸡蛋后才能拖动（EGG_ADDED 及之后的状态都可以拖动）
        // NEED_OIL 和 RAW 状态不能拖动（还没打鸡蛋）
        if (food.state === DoughState.NEED_OIL || food.state === DoughState.RAW) {
            console.log(`[CookingControllerV2] 面饼状态为 ${food.state}，需要先打鸡蛋才能拖动`);
            return;
        }
        
        const bgNode = food.node.parent;
        if (!bgNode) return;

        this.draggingFood = food;
        this.dragStartPos.set(bgNode.position);  // 🔥 记录原始父节点下的位置（用于返回）
        this.isDragging = true;
        
        // 🔥 暂停抖动动画
        food.isDragging = true;

        // 🔥 记录原始父节点，拖动时临时移到 Canvas 下
        this.dragOriginalParent = bgNode.parent;
        
        // 获取 Canvas
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;
        
        // 🔥 先记录世界位置
        const worldPos = bgNode.worldPosition.clone();
        
        // 🔥 移到 Canvas 下
        bgNode.parent = canvas;
        bgNode.setSiblingIndex(9999);
        
        // 🔥 转换为 Canvas 本地坐标并设置位置
        const canvasTransform = canvas.getComponent(UITransform);
        if (canvasTransform) {
            const localPos = canvasTransform.convertToNodeSpaceAR(worldPos);
            bgNode.setPosition(localPos);
            this.dragStartPosCanvas.set(localPos);  // 🔥 记录 Canvas 下的位置（用于判断点击）
        }

        // 高亮显示
        this.highlightFood(food);
        
        console.log('[CookingControllerV2] 🎯 开始拖动面饼...');
    }

    /**
     * 拖动面饼移动
     * 🔥 面饼已移到 Canvas 下，使用和刷子完全相同的坐标转换
     */
    private onFoodDragMove(event: EventTouch, food: FoodItem) {
        if (!this.isDragging || this.draggingFood !== food) return;

        const bgNode = food.node.parent;
        if (!bgNode) return;
        
        // 🔥 完全和刷子一样：面饼现在在 Canvas 下，用 Canvas 的 UITransform
        const canvas = bgNode.parent;  // 现在 bgNode.parent 就是 Canvas
        if (!canvas) return;
        
        const canvasTransform = canvas.getComponent(UITransform);
        if (!canvasTransform) return;
        
        const uiPos = event.getUILocation();
        const designSize = view.getDesignResolutionSize();
        const canvasSize = canvasTransform.contentSize;
        const scaleToCanvas = canvasSize.width / designSize.width;
        
        // 和刷子完全相同的坐标转换
        const localX = uiPos.x * scaleToCanvas - canvasSize.width / 2;
        const localY = uiPos.y * scaleToCanvas - canvasSize.height / 2;
        
        // 直接设置位置（面饼中心跟随鼠标）
        bgNode.setPosition(localX, localY, 0);
    }

    /**
     * 结束拖动面饼（恢复局部监听器方式）
     */
    private onFoodDragEnd(event: EventTouch, food: FoodItem) {
        if (!this.isDragging || this.draggingFood !== food) {
            return;
        }

        const bgNode = food.node.parent;

        // 立即重置拖动状态
        this.isDragging = false;
        this.draggingFood = null;
        this.dragOffset.set(0, 0, 0);
        
        // 🔥 注意：不在这里恢复抖动，由 returnToOriginalPosition 或成功操作后恢复

        if (!bgNode) {
            food.isDragging = false;  // 异常情况恢复
            return;
        }

        // 获取触摸位置并转换为 Canvas 本地坐标
        // 坐标转换说明：见 docs/CoordinateConversion.md
        let uiPos = event.getUILocation();
        console.log(`[Debug] 📍 原始UI坐标: (${uiPos.x.toFixed(0)}, ${uiPos.y.toFixed(0)})`);
        
        // 🔥 如果 UI 坐标为 (0,0)，尝试使用触摸点位置
        if (uiPos.x === 0 && uiPos.y === 0) {
            const touch = event.touch;
            if (touch) {
                uiPos = touch.getUILocation();
                console.log(`[Debug] 📍 使用 touch.getUILocation(): (${uiPos.x.toFixed(0)}, ${uiPos.y.toFixed(0)})`);
            }
        }
        
        const designSize = view.getDesignResolutionSize();
        // 🔥 修复：直接查找场景中的 Canvas 节点
        const scene = director.getScene();
        let canvasNode: Node = null;
        if (scene) {
            canvasNode = scene.getChildByName('Canvas');
        }
        
        let localX = 0, localY = 0;
        if (canvasNode) {
            const canvasTransform = canvasNode.getComponent(UITransform);
            if (canvasTransform) {
                const canvasSize = canvasTransform.contentSize;
                const scaleToCanvas = canvasSize.width / designSize.width;
                localX = uiPos.x * scaleToCanvas - canvasSize.width / 2;
                localY = uiPos.y * scaleToCanvas - canvasSize.height / 2;
                console.log(`[Debug] Canvas=${canvasNode.name}, 大小=${canvasSize.width}x${canvasSize.height}, 缩放=${scaleToCanvas.toFixed(2)}`);
            } else {
                console.log(`[Debug] ❌ canvasTransform 不存在`);
            }
        } else {
            console.log(`[Debug] ❌ canvasNode 不存在，scene=${scene?.name}`);
        }
        const touchLocalPos = new Vec2(localX, localY);
        
        console.log(`[Debug] 📍 松手位置(本地): (${localX.toFixed(0)}, ${localY.toFixed(0)})`);
        console.log(`[Debug] 垃圾桶: ${this.trashBin ? '绑定✅' : '未绑定❌'}`);

        // 1. 检查是否在垃圾桶上（允许所有食物丢弃，包括教程模式）
        if (this.trashBin && this.trashBin.active) {
            console.log(`[Debug] 开始检测垃圾桶...`);
            const inTrash = this.checkNodeContainsPoint(this.trashBin, touchLocalPos);
            if (inTrash) {
                console.log(`[Debug] ✅✅✅ 检测到垃圾桶！`);
                this.showMessage('🗑️ 丢弃食物，重新制作吧！');
                this.throwAwayFood(food);
                return;
            }
        }

        // 2. 检查是否在3个打包盒上（新系统）
        for (let i = 0; i < 3; i++) {
            const packingBox = this.getPackingBox(i);
            if (!packingBox) continue;
            
            // 只检测active的打包盒
            if (!packingBox.active) continue;
            
            const inPackingBox = this.checkNodeContainsPoint(packingBox, touchLocalPos);
            if (inPackingBox) {
                console.log(`[Debug] ✅✅✅ 检测到打包盒${i + 1}！准备打包...`);
                
                // 🔥 只有DONE状态才能打包
                if (food.state !== DoughState.DONE) {
                    this.showMessage('⚠️ 食物还没做好，不能打包！');
                    this.returnToOriginalPosition(bgNode, food);
                    return;
                }
                
                // 🔥 教程模式下：打包前验证食物是否合格
                if (this.tutorialManager && this.tutorialManager.isInTutorial()) {
                    const validationResult = this.validateFoodForPacking(food);
                    if (!validationResult.valid) {
                        // 不合格，阻止打包，提示原因
                        this.showMessage(`❌ ${validationResult.reason}`);
                        if (this.tutorialManager) {
                            this.tutorialManager.showNPCDialogue(validationResult.dialogKey);
                        }
                        this.returnToOriginalPosition(bgNode, food);
                        return;
                    }
                }
                
                this.packFoodItem(food, i);
                return;
            }
        }

        console.log(`[Debug] ❌ 不在任何目标区域，检查是否需要操作\n`);
        
        // 3. 检查是否是点击操作（移动距离小）
        // 🔥 使用 Canvas 下的起始位置来判断
        const distanceMoved = Math.sqrt(
            Math.pow(bgNode.position.x - this.dragStartPosCanvas.x, 2) +
            Math.pow(bgNode.position.y - this.dragStartPosCanvas.y, 2)
        );
        
        // 🔥 点击操作：移动距离小于10像素时执行对应状态的操作
        if (distanceMoved < 10) {
            // 🔥 阻止事件传播，避免 onGrillClick 重复处理
            event.propagationStopped = true;
            // 🔥 先移回原始父节点
            this.moveBackToOriginalParent(bgNode);
            food.isDragging = false;  // 恢复抖动
            this.handleFoodClick(food);
            return;
        }
        
        // 4. 回到原位
        this.returnToOriginalPosition(bgNode, food);
    }

    /**
     * 检查屏幕坐标点是否在节点内（新方法，更可靠）
     */
    /**
     * 检查拖动是否到达目标节点（使用精确的坐标检测）
     * @param node 目标节点
     * @param localPos Canvas 本地坐标（已经转换好的）
     */
    private checkNodeContainsPoint(node: Node, localPos: Vec2): boolean {
        if (!node) {
            console.log(`[Debug] ❌ 节点为null`);
            return false;
        }
        
        if (!node.active) {
            console.log(`[Debug] ❌ 节点 ${node.name} 未激活`);
            console.log(`[Debug] 节点层级: ${node.getSiblingIndex()}, 父节点: ${node.parent?.name || 'null'}`);
            return false;
        }
        
        const uiTransform = node.getComponent(UITransform);
        if (!uiTransform) {
            console.warn(`[CookingControllerV2] ❌ 节点 ${node.name} 没有UITransform`);
            return false;
        }
        
        // localPos 已经是 Canvas 本地坐标，直接使用
        // 获取节点位置和大小
        const nodePos = node.position;
        const size = uiTransform.contentSize;
        
        // 计算偏移
        const dx = localPos.x - nodePos.x;
        const dy = localPos.y - nodePos.y;
        
        // 精确矩形检测（必须在框内，使用0.5倍，严格在框内）
        const halfW = size.width * 0.5;
        const halfH = size.height * 0.5;
        const inRect = Math.abs(dx) < halfW && Math.abs(dy) < halfH;
        
        console.log(`\n[Debug] 🎯 检查节点 ${node.name}:`);
        console.log(`  📍 本地坐标: (${localPos.x.toFixed(0)}, ${localPos.y.toFixed(0)})`);
        console.log(`  📍 节点位置: (${nodePos.x.toFixed(0)}, ${nodePos.y.toFixed(0)})`);
        console.log(`  📦 节点大小: ${size.width.toFixed(0)}x${size.height.toFixed(0)}`);
        console.log(`  📏 偏移: dx=${dx.toFixed(0)}px, dy=${dy.toFixed(0)}px`);
        console.log(`  🟦 矩形检测: |dx|<${halfW.toFixed(0)}px && |dy|<${halfH.toFixed(0)}px → ${inRect ? '✅' : '❌'}`);
        console.log(`  ${inRect ? '✅✅✅ 在范围内！' : '❌ 超出范围（必须拖到框内）'}`);
        
        return inRect;
    }
    
    /**
     * 检查位置是否在节点内（保留旧方法）
     */
    private isPositionInNode(uiPos: Vec2, targetNode: Node): boolean {
        return this.checkNodeContainsPoint(targetNode, uiPos);
    }
    
    /**
     * 🔥 把面饼从 Canvas 移回原始父节点
     */
    private moveBackToOriginalParent(bgNode: Node) {
        if (this.dragOriginalParent) {
            // 记录当前世界位置
            const worldPos = bgNode.worldPosition.clone();
            
            // 移回原始父节点
            bgNode.parent = this.dragOriginalParent;
            
            // 转换为原始父节点的本地坐标
            const parentTransform = this.dragOriginalParent.getComponent(UITransform);
            if (parentTransform) {
                const localPos = parentTransform.convertToNodeSpaceAR(worldPos);
                bgNode.setPosition(localPos);
            }
            
            this.dragOriginalParent = null;
        }
    }

    /**
     * 返回到原始位置
     * 🔥 需要先把面饼从 Canvas 移回原始父节点
     */
    private returnToOriginalPosition(bgNode: Node, food?: FoodItem) {
        // 🔥 如果有 food 参数，在动画期间保持暂停抖动
        if (food) {
            food.isDragging = true;
        }
        
        // 🔥 先把面饼移回原始父节点
        this.moveBackToOriginalParent(bgNode);
        
        tween(bgNode)
            .to(0.2, { position: this.dragStartPos }, { easing: 'backOut' })
            .call(() => {
                // 🔥 动画结束后恢复抖动
                if (food) {
                    food.isDragging = false;
                }
            })
            .start();
    }

    // ========== 拖动系统结束 ==========

    /**
     * 鼠标移动事件 - 只缓存位置，由 update 实时更新
     */
    private onMouseMove(event: EventMouse) {
        // 获取 UI 坐标（设计分辨率下的坐标）
        const uiPos = event.getUILocation();
        
        // 获取设计分辨率
        const designSize = view.getDesignResolutionSize();
        
        // 使用 mouseFollower 的父节点（Canvas）来获取实际大小
        if (this.mouseFollower && this.mouseFollower.parent) {
            const canvasTransform = this.mouseFollower.parent.getComponent(UITransform);
            if (canvasTransform) {
                const canvasSize = canvasTransform.contentSize;
                // UI坐标按比例缩放到 Canvas 大小，然后减去 Canvas 中心
                const scaleToCanvas = canvasSize.width / designSize.width;
                this._currentMousePos.set(
                    uiPos.x * scaleToCanvas - canvasSize.width / 2,
                    uiPos.y * scaleToCanvas - canvasSize.height / 2
                );
            }
        }
    }

    /**
     * 显示教程提示
     */
    private showTutorial() {
        console.log('[CookingControllerV2] 🎯 游戏流程:');
        console.log('1. 点击 [面饼] 放到铁板上(最多3个)');
        console.log('2. 拖动油壶到面饼上喷油(第一步: 喷油)');
        console.log('3. 薪添加鸡蛋(1-3个), 薪添鸡蛋前不能添加其他食材');
        console.log('4. 鸡蛋熟后, 点击面饼翻面');
        console.log('5. 翻面后可以添加其他食材(香菜, 洋著, 香肠等)');
        console.log('6. 根据顾客口味添加配料:');
        console.log('   - 甜辣: 辣椒 + 白糖 + 烤冷面酉');
        console.log('   - 酸甜辣: 醷 + 白糖 + 辣椒 + 烤冷面酉');
        console.log('   - 酸甜: 醷 + 白糖 + 烤冷面酉');
        console.log('7. 注意面饼会逐渐变色, 时间太长会烤焦!');
        console.log('8. 完成后拖动到打包盒, 点击出餐按钮');
    }

    /**
     * 设置按钮事件
     */
    private setupButtons() {
        console.log('[CookingControllerV2] 🔧 开始设置所有按钮...');
        
        const bindClickArea = (target: Node | null, label: string, handler: (event: EventTouch) => void, logClickArea: boolean = false) => {
            if (!target) {
                console.warn(`[CookingControllerV2] Missing ${label} binding`);
                return;
            }
            const clickArea = target.getChildByName('ClickArea') || target;
            if (!clickArea) {
                console.warn(`[CookingControllerV2] ${label} ClickArea not found`);
                return;
            }
            if (logClickArea) {
                console.log(`[setupButtons] ${label} ClickArea: ${clickArea.name}`);
            }
            clickArea.on(Node.EventType.TOUCH_END, handler, this);
        };

        // 绑定点击事件到 ClickArea 子节点
        bindClickArea(this.doughBtn, 'DoughBtn', (event: EventTouch) => {
            console.log('[setupButtons] ? DoughBtn 被点击');
            this.onIngredientClickWithEvent(IngredientType.DOUGH, event);
        }, true);
        bindClickArea(this.eggBtn, 'EggBtn', (event: EventTouch) => {
            console.log('[setupButtons] ? EggBtn 被点击');
            this.onIngredientClickWithEvent(IngredientType.EGG, event);
        }, true);
        bindClickArea(this.cilantroBtn, 'CilantroBtn', (event: EventTouch) => {
            this.onIngredientClickWithEvent(IngredientType.CILANTRO, event);
        });
        bindClickArea(this.onionBtn, 'OnionBtn', (event: EventTouch) => {
            this.onIngredientClickWithEvent(IngredientType.ONION, event);
        });
        bindClickArea(this.sausageBtn, 'SausageBtn', (event: EventTouch) => {
            this.onSausageButtonClick(event);
        });
        // 烤冷面酱按钮（使用sauceBtn）
        const sauceNode = this.sauceBtn?.node;
        if (sauceNode) {
            sauceNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onIngredientClickWithEvent(IngredientType.GRILLED_NOODLE_SAUCE, event), this);
        }

        // 新配料按钮
        const chiliNode = this.chiliBtn?.node;
        if (chiliNode) {
            chiliNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onIngredientClickWithEvent(IngredientType.CHILI, event), this);
        }
        const sugarNode = this.sugarBtn?.node;
        if (sugarNode) {
            sugarNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onIngredientClickWithEvent(IngredientType.SUGAR, event), this);
        }
        const vinegarNode = this.vinegarBtn?.node;
        if (vinegarNode) {
            vinegarNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onIngredientClickWithEvent(IngredientType.VINEGAR, event), this);
        }

        // 油壶按钮
        const oilNode = this.oilBtn?.node;
        if (oilNode) {
            oilNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onOilButtonClick(event), this);
            console.log('[CookingControllerV2] ✅ 油壶按钮事件已绑定');
        } else {
            console.warn('[CookingControllerV2] ⚠️ 油壶按钮未绑定！尝试自动查找...');
            // 尝试自动查找油壶按钮
            const oilBtnNode = this.node.parent?.getChildByPath('IngredientsPanel/OilBtn') ||
                              this.node.parent?.getChildByPath('OilBtn') ||
                              this.node.getChildByPath('IngredientsPanel/OilBtn') ||
                              this.node.getChildByPath('OilBtn');
            
            if (oilBtnNode) {
                const btnComponent = oilBtnNode.getComponent(Button);
                if (btnComponent) {
                    this.oilBtn = btnComponent;
                    this.oilBtn.node.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onOilButtonClick(event), this);
                    console.log('[CookingControllerV2] ✅ 自动找到油壶按钮并绑定成功！');
                } else {
                    console.warn('[CookingControllerV2] ❌ 找到OilBtn节点但没有Button组件！');
                }
            } else {
                console.warn('[CookingControllerV2] ❌ 未找到OilBtn节点，请在编辑器中创建并绑定！');
            }
        }

        // 水壶按钮
        const waterNode = this.waterBtn?.node;
        if (waterNode) {
            waterNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onWaterButtonClick(event), this);
            console.log('[CookingControllerV2] ✅ 水壶按钮事件已绑定');
        } else {
            console.log('[CookingControllerV2] 🔎 水壶按钮未绑定，尝试自动查找...');
            const waterBtnNode = this.node.parent?.getChildByPath('IngredientsPanel/WaterBtn') ||
                              this.node.parent?.getChildByPath('WaterBtn') ||
                              this.node.getChildByPath('IngredientsPanel/WaterBtn') ||
                              this.node.getChildByPath('WaterBtn') ||
                              this.node.scene?.getChildByPath('Canvas/WaterBtn') ||
                              this.node.scene?.getChildByPath('Canvas/IngredientsPanel/WaterBtn') ||
                              this.node.scene?.getChildByPath('Canvas/ToolsPanel/WaterBtn') ||
                              find('Canvas/WaterBtn', this.node.scene) ||
                              find('Canvas/IngredientsPanel/WaterBtn', this.node.scene) ||
                              find('Canvas/ToolsPanel/WaterBtn', this.node.scene);
            
            if (waterBtnNode) {
                const btnComponent = waterBtnNode.getComponent(Button);
                if (btnComponent) {
                    this.waterBtn = btnComponent;
                    this.waterBtn.node.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onWaterButtonClick(event), this);
                    console.log('[CookingControllerV2] ✅ 自动找到水壶按钮并绑定成功！');
                } else {
                    console.error('[CookingControllerV2] ❌ 找到WaterBtn节点但没有Button组件！');
                }
            } else {
                console.warn('[CookingControllerV2] ⚠️ 未找到WaterBtn节点，水壶功能暂不可用');
            }
        }

        // 铲子按钮
        const spatulaNode = this.spatulaBtn?.node;
        if (spatulaNode) {
            spatulaNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onSpatulaButtonClick(event), this);
            console.log('[CookingControllerV2] ✅ 铲子按钮事件已绑定');
        } else {
            console.log('[CookingControllerV2] 🔎 铲子按钮未绑定，尝试自动查找...');
            // 尝试自动查找铲子按钮（铲子可能在 Canvas 下或 IngredientsPanel 下）
            const spatulaBtnNode = this.node.getChildByName('SpatulaBtn') ||
                              this.node.getChildByPath('IngredientsPanel/SpatulaBtn') ||
                              this.node.parent?.getChildByName('SpatulaBtn') ||
                              this.node.parent?.getChildByPath('SpatulaBtn') ||
                              this.node.scene?.getChildByPath('Canvas/SpatulaBtn') ||
                              this.node.scene?.getChildByPath('Canvas/IngredientsPanel/SpatulaBtn') ||
                              this.node.scene?.getChildByPath('Canvas/ToolsPanel/SpatulaBtn') ||
                              find('Canvas/SpatulaBtn', this.node.scene) ||
                              find('Canvas/IngredientsPanel/SpatulaBtn', this.node.scene) ||
                              find('Canvas/ToolsPanel/SpatulaBtn', this.node.scene);
            
            if (spatulaBtnNode) {
                const btnComponent = spatulaBtnNode.getComponent(Button);
                if (btnComponent) {
                    this.spatulaBtn = btnComponent;
                    this.spatulaBtn.node.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onSpatulaButtonClick(event), this);
                    console.log('[CookingControllerV2] ✅ 自动找到铲子按钮并绑定成功！');
                } else {
                    console.error('[CookingControllerV2] ❌ 找到SpatulaBtn节点但没有Button组件！');
                }
            } else {
                console.warn('[CookingControllerV2] ⚠️ 未找到SpatulaBtn节点，铲子功能暂不可用');
            }
        }

        // 铁板区域点击事件
        if (this.grillArea) {
            this.grillArea.on(Node.EventType.TOUCH_END, this.onGrillClick, this);
        }
        
        // 注：油壶、水壶、打包盒的视觉层级已在场景中设置好（在铁板下面）
        // 点击事件通过 checkAndForwardToButton 在铁板点击时转发
    }
    
    /**
     * 调整油壶和水壶的视觉层级
     * 
     * Cocos Creator 3.x 中 UI 节点渲染顺序严格按照 siblingIndex
     * 所以我们把油壶水壶移到铁板之前（视觉上在下面）
     * 然后在铁板的点击事件中检测并转发点击到油壶/水壶
     */
    private adjustVisualLayerForButtons() {
        const oilBtnNode = this.oilBtn?.node;
        const waterBtnNode = this.waterBtn?.node;
        const grillAreaNode = this.grillArea;
        const serveButtonNode = this.serveButton?.node;
        const spatulaBtnNode = this.spatulaBtn?.node;
        
        if (!grillAreaNode) return;
        
        const grillIndex = grillAreaNode.getSiblingIndex();
        
        // 把打包盒移到最前面（视觉上最下面）
        if (serveButtonNode) {
            serveButtonNode.setSiblingIndex(grillIndex - 3);
            console.log(`[CookingControllerV2] 📦 打包盒 siblingIndex=${serveButtonNode.getSiblingIndex()}`);
        }
        
        // 把油壶移到铁板之前（视觉上在铁板下面）
        if (oilBtnNode) {
            oilBtnNode.setSiblingIndex(grillIndex - 2);
            console.log(`[CookingControllerV2] 🛢️ 油壶 siblingIndex=${oilBtnNode.getSiblingIndex()}`);
        }
        
        // 把水壶移到铁板之前（视觉上在铁板下面）
        if (waterBtnNode) {
            waterBtnNode.setSiblingIndex(grillIndex - 1);
            console.log(`[CookingControllerV2] 💧 水壶 siblingIndex=${waterBtnNode.getSiblingIndex()}`);
        }
        
        // 🔥 把铲子按钮移到铁板之后（视觉上在铁板上面），确保可点击
        if (spatulaBtnNode) {
            spatulaBtnNode.setSiblingIndex(grillIndex + 2);
            console.log(`[CookingControllerV2] 🍴 铲子按钮 siblingIndex=${spatulaBtnNode.getSiblingIndex()}`);
        }
        
        console.log(`[CookingControllerV2] 🍳 铁板 siblingIndex=${grillAreaNode.getSiblingIndex()}`);
    }
    
    /**
     * 检测点击是否在油壶/水壶/打包盒区域，如果是则转发点击事件
     * @returns true 如果点击被转发，false 如果不在这些按钮区域
     */
    private checkAndForwardToButton(event: EventTouch): boolean {
        const touchPos = event.getUILocation();
        
        // 检查油壶
        if (this.oilBtn?.node) {
            if (this.isPointInNode(touchPos, this.oilBtn.node)) {
                console.log('[CookingControllerV2] 🛢️ 点击转发到油壶');
                this.onOilButtonClick(event);
                return true;
            }
        }
        
        // 检查水壶
        if (this.waterBtn?.node) {
            if (this.isPointInNode(touchPos, this.waterBtn.node)) {
                console.log('[CookingControllerV2] 💧 点击转发到水壶');
                this.onWaterButtonClick(event);
                return true;
            }
        }
        
        // 检查打包盒
        if (this.serveButton?.node) {
            if (this.isPointInNode(touchPos, this.serveButton.node)) {
                console.log('[CookingControllerV2] 📦 点击转发到打包盒');
                this.onServeButtonClick();
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 检测点是否在节点范围内
     */
    private isPointInNode(touchPos: Vec2, node: Node): boolean {
        const uiTransform = node.getComponent(UITransform);
        if (!uiTransform) return false;
        
        // 将触摸点转换到节点的本地坐标系
        const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));
        
        // 检测是否在节点范围内
        const size = uiTransform.contentSize;
        const halfWidth = size.width / 2;
        const halfHeight = size.height / 2;
        
        return Math.abs(localPos.x) <= halfWidth && Math.abs(localPos.y) <= halfHeight;
    }

    /**
     * 检查点击是否在按钮的多边形点击区域内
     * @param btnNode 按钮节点
     * @param event 触摸事件
     * @returns 是否在多边形区域内
     */
    private isClickInPolygon(btnNode: Node, event: EventTouch): boolean {
        const clickAreaPolygon = btnNode.getComponent(ClickAreaPolygon);
        if (!clickAreaPolygon) {
            return true;  // 没有组件，默认允许
        }
        return clickAreaPolygon.containsTouch(event);
    }

    /**
     * 点击食材按钮（带事件，可以获取触摸位置）
     * 连续点击逻辑：
     * 1. 调料（白糖、醋、辣椒、酱料）：点击拿起，再次点击原位放回（不计数，因为可以无限加）
     * 2. 实体食材（鸡蛋、洋葱、香菜、香肠）：点击增加数量（鸡蛋max2，其他max3）
     */
    private onIngredientClickWithEvent(type: IngredientType, event: EventTouch) {
        // NPC 对话式教程：不限制操作
        
        // 检查是否已开始营业（教程中跳过检查）
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) {
            this.showMessage('⚠️ 请先点击"开始营业"！');
            return;
        }
        
        const ingredient = INGREDIENT_CONFIG.get(type);
        if (!ingredient) return;

        console.log(`[CookingControllerV2] 点击食材: ${ingredient.name}`);

        // 如果是面饼，直接放到铁板上
        if (type === IngredientType.DOUGH) {
            if (this.foodItems.length >= this.maxFoodItems) {
                this.showMessage('⚠️ 铁板上最多只能放3个面饼！');
                return;
            }
            this.placeDoughOnGrill();
            return;
        }

        // 判断是否是调料（包括调料包）
        const isCondiment = type === IngredientType.CHILI || 
                          type === IngredientType.SUGAR || 
                          type === IngredientType.VINEGAR || 
                          type === IngredientType.GRILLED_NOODLE_SAUCE ||
                          type === IngredientType.SEASONING_PACK;

        // 如果手里拿着别的，先放回去（使用正确的放下方法）
        if (this.currentHandItem !== null && this.currentHandItem !== type) {
            const oldType = this.currentHandItem;
            const oldIngredient = INGREDIENT_CONFIG.get(oldType);
            console.log(`[CookingControllerV2] 🔄 切换工具: ${oldIngredient?.name} -> ${INGREDIENT_CONFIG.get(type)?.name}`);
            
            // 🔥 根据工具类型使用正确的放下方法
            if (oldType === IngredientType.SPATULA) {
                this.putDownSpatula();
            } else if (oldType === IngredientType.GRILLED_NOODLE_SAUCE) {
                this.putDownBrush();
            } else if (oldType === IngredientType.OIL || oldType === IngredientType.WATER || 
                       oldType === IngredientType.VINEGAR || oldType === IngredientType.CHILI || 
                       oldType === IngredientType.SUGAR) {
                this.putDownTool(oldType);
            } else if (oldType === IngredientType.EGG) {
                // 🥚 鸡蛋放回 - 释放预留
                this.releaseHandItemReservation(oldType);
                this.currentHandItem = null;
                this.handItemCount = 0;
                this.hideEggImage();
                if (this.mouseFollower) this.mouseFollower.active = false;
                this.stopMouseFollowing();
            } else if (oldType === IngredientType.ONION) {
                // 🧅 洋葱放回 - 释放预留
                this.releaseHandItemReservation(oldType);
                this.currentHandItem = null;
                this.handItemCount = 0;
                this.hideOnionImage();
                if (this.mouseFollower) this.mouseFollower.active = false;
                this.stopMouseFollowing();
            } else if (oldType === IngredientType.CILANTRO) {
                // 🌿 香菜放回 - 释放预留
                this.releaseHandItemReservation(oldType);
                this.currentHandItem = null;
                this.handItemCount = 0;
                this.hideCilantroImage();
                if (this.mouseFollower) this.mouseFollower.active = false;
                this.stopMouseFollowing();
            } else if (oldType === IngredientType.SAUSAGE) {
                // 🌭 烤肠放回 - 释放预留
                this.releaseHandItemReservation(oldType);
                this.currentHandItem = null;
                this.handItemCount = 0;
                this.hideSausageImage();
                if (this.mouseFollower) this.mouseFollower.active = false;
                this.stopMouseFollowing();
            } else {
                // 其他食材 - 释放预留
                this.releaseHandItemReservation(oldType);
                this.currentHandItem = null;
                this.handItemCount = 0;
                if (this.mouseFollower) this.mouseFollower.active = false;
                this.stopMouseFollowing();
            }
        }

        // 酱料特殊处理：显示刷子
        if (type === IngredientType.GRILLED_NOODLE_SAUCE) {
            if (this.currentHandItem === type) {
                // 再次点击 = 放回
                console.log(`[CookingControllerV2] 放回刷子`);
                this.currentHandItem = null;
                this.handItemCount = 0;
                if (this.mouseFollower) {
                    this.mouseFollower.active = false;
                }
                this.stopMouseFollowing();
                // 隐藏刷子图片
                this.hideBrushImage();
                // 显示刷子在酱料按钮上方
                this.showBrushOnSauceButton();
                // 🔥 重置刷酱控制器（清理所有数据）
                if (this.brushSauceController) {
                    this.brushSauceController.reset();
                    // 🔥 恢复其他 UI 元素的触摸检测
                    this.brushSauceController.enableAllUIElements();
                }
                // 🔥 移除原生鼠标监听
                this.removeNativeMouseListener();
                this.showMessage(`✅ 刷子已放回！`);
            } else {
                // 🔥 如果手上拿着其他工具，先放下
                if (this.currentHandItem === IngredientType.SPATULA) {
                    this.putDownSpatula();
                } else if (this.currentHandItem === IngredientType.OIL) {
                    this.putDownTool(IngredientType.OIL);
                } else if (this.currentHandItem === IngredientType.WATER) {
                    this.putDownTool(IngredientType.WATER);
                } else if (this.currentHandItem === IngredientType.VINEGAR) {
                    this.putDownTool(IngredientType.VINEGAR);
                } else if (this.currentHandItem === IngredientType.CHILI) {
                    this.putDownTool(IngredientType.CHILI);
                } else if (this.currentHandItem === IngredientType.SUGAR) {
                    this.putDownTool(IngredientType.SUGAR);
                }
                
                // 拿起刷子
                this.currentHandItem = type;
                this.handItemCount = 1;
                console.log(`[CookingControllerV2] 拿起刷子`);
                // 隐藏酱料按钮上的刷子
                this.hideBrushOnSauceButton();
                
                // 🔥 先从事件更新鼠标位置缓存，确保 brushSauceController 能获取正确位置
                this.updateMousePosFromEvent(event);
                
                // 使用 mouseFollower 显示
                this.updateMouseFollowerPosition(event);
                this.updateHandDisplay();
                this.triggerTutorialAction('sauce_picked');
                
                // 🔥 禁用其他 UI 元素，防止拦截鼠标（只排除酱料按钮）
                if (this.brushSauceController) {
                    this.brushSauceController.disableUIElements(['SauceBtn']);
                }
                
                // 🔥 设置原生鼠标监听（拿起刷子时）
                this.setupNativeMouseListener();
                
                // 🔥 自动启动刷酱模式：为所有翻面且未刷酱的面饼显示进度条
                this.startBrushingModeForFlippedDoughs();
            }
            return;
        }
        
        // 其他调料逻辑
        if (isCondiment) {
            if (this.currentHandItem === type) {
                // 再次点击调料按钮 = 放回
                console.log(`[CookingControllerV2] 放回调料: ${ingredient.name}`);
                // 🔥 使用通用放下方法（醋、辣椒、糖）
                if (type === IngredientType.VINEGAR || type === IngredientType.CHILI || type === IngredientType.SUGAR) {
                    this.putDownTool(type);
                } else {
                    this.currentHandItem = null;
                    this.handItemCount = 0;
                    if (this.mouseFollower) {
                        this.mouseFollower.active = false;
                    }
                    this.stopMouseFollowing();
                }
                this.showMessage(`✅ ${ingredient.emoji} ${ingredient.name} 已放回！`);
            } else {
                // 🔥 检查调料库存
                if (!this.hasIngredientStock(type)) {
                    this.showMessage(`⚠️ ${ingredient.emoji}${ingredient.name}库存不足！请先去购买！`);
                    return;
                }
                
                // 🔥 如果手上拿着其他工具，先放下
                if (this.currentHandItem === IngredientType.SPATULA) {
                    this.putDownSpatula();
                } else if (this.currentHandItem === IngredientType.GRILLED_NOODLE_SAUCE) {
                    this.putDownBrush();
                } else if (this.currentHandItem === IngredientType.OIL) {
                    this.putDownTool(IngredientType.OIL);
                } else if (this.currentHandItem === IngredientType.WATER) {
                    this.putDownTool(IngredientType.WATER);
                } else if (this.currentHandItem === IngredientType.VINEGAR) {
                    this.putDownTool(IngredientType.VINEGAR);
                } else if (this.currentHandItem === IngredientType.CHILI) {
                    this.putDownTool(IngredientType.CHILI);
                } else if (this.currentHandItem === IngredientType.SUGAR) {
                    this.putDownTool(IngredientType.SUGAR);
                }
                
                // 拿起调料
                this.currentHandItem = type;
                this.handItemCount = 1; // 调料只需标识拿着即可
                console.log(`[CookingControllerV2] 拿起调料: ${ingredient.name}`);
                // 立即更新显示
                this.updateMouseFollowerPosition(event);
                // 🔥 醋、辣椒、糖显示工具图片并隐藏原位按钮
                if (type === IngredientType.VINEGAR) {
                    this.hideToolButtonImage(IngredientType.VINEGAR);
                    this.showToolImage('vinegar', 'hold');
                } else if (type === IngredientType.CHILI) {
                    this.hideToolButtonImage(IngredientType.CHILI);
                    this.showToolImage('chili', 'hold');
                } else if (type === IngredientType.SUGAR) {
                    this.hideToolButtonImage(IngredientType.SUGAR);
                    this.showToolImage('sugar', 'hold');
                } else {
                    this.updateHandDisplay();
                }
                this.showMessage(`✋ 拿起了 ${ingredient.emoji} ${ingredient.name}，最多添加3次！再次点击放回。`);
            }
            return;
        }

        // 实体食材逻辑（支持连续点击）
        // 教程模式下鸡蛋只能拿1个
        const inTutorialMode = this.tutorialManager?.isInTutorial() ?? false;
        // 🔥 鸡蛋、洋葱、香菜最多拿3个，其他5个
        let maxCount = 5;
        if (type === IngredientType.EGG) {
            maxCount = inTutorialMode ? 1 : 3;
        } else if (type === IngredientType.ONION || type === IngredientType.CILANTRO) {
            maxCount = 3;
        }

        // 🔥 检查库存是否足够
        if (!this.hasIngredientStock(type)) {
            this.showMessage(`⚠️ ${ingredient.emoji}${ingredient.name}库存不足！请先去购买！`);
            return;
        }

        // 拿起食材（如果铁板没面饼，也可以拿着）
        if (this.currentHandItem === type) {
            // 已经拿着这个食材，增加数量
            if (this.handItemCount < maxCount) {
                // 🔥 检查库存是否足够再拿一个，并预留
                const inventory = InventoryManager.instance;
                if (inventory && !inventory.reserveIngredient(type, 1)) {
                    const availableCount = inventory.getAvailableCount(type);
                    this.showMessage(`⚠️ ${ingredient.emoji}${ingredient.name}库存只有${availableCount}个！`);
                    return;
                }
                
                this.handItemCount++;
                console.log(`[CookingControllerV2] 增加数量: ${this.handItemCount}`);
                this.updateMouseFollowerPosition(event); // 更新位置和显示
                this.updateHandDisplay(); // 立即更新显示
                this.updateIngredientCountLabels(); // 🔥 更新显示
                this.showMessage(`✋ 拿了 ${this.handItemCount} 份 ${ingredient.emoji}${ingredient.name}`);
            } else {
                this.showMessage(`⚠️ 最多拿 ${maxCount} 份 ${ingredient.emoji}${ingredient.name}！`);
            }
        } else {
            // 第一次拿起 - 预留1个
            const inventory = InventoryManager.instance;
            if (inventory && !inventory.reserveIngredient(type, 1)) {
                this.showMessage(`⚠️ ${ingredient.emoji}${ingredient.name}库存不足！`);
                return;
            }
            
            this.currentHandItem = type;
            this.handItemCount = 1;
            console.log(`[CookingControllerV2] 第一次拿起: ${ingredient.name}`);
            this.updateMouseFollowerPosition(event);
            this.updateHandDisplay(); // 立即更新显示
            this.updateIngredientCountLabels(); // 🔥 更新显示
            this.showMessage(`✋ 拿了 1 份 ${ingredient.emoji}${ingredient.name}`);
            
            // 触发教程动作（实体食材）
            if (type === IngredientType.EGG) {
                this.triggerTutorialAction('egg_picked');
            } else if (type === IngredientType.SAUSAGE) {
                this.triggerTutorialAction('sausage_picked');
            } else if (type === IngredientType.ONION) {
                this.triggerTutorialAction('onion_picked');
            } else if (type === IngredientType.CILANTRO) {
                this.triggerTutorialAction('cilantro_picked');
            }
            // 注：调料（包括GRILLED_NOODLE_SAUCE）的教程触发在上面isCondiment块中处理
        }
    }

    /**
     * 更新跟随鼠标的节点位置和显示 - 启动实时跟随
     * 
     * 坐标转换说明：见 docs/CoordinateConversion.md
     * - UI坐标 (getUILocation) 是基于设计分辨率 (1280x720)
     * - Canvas 实际大小可能不同 (1920x1080)
     * - 需要将 UI 坐标缩放到 Canvas 大小，再减去 Canvas 中心
     */
    private updateMouseFollowerPosition(event: EventTouch) {
        if (!this.mouseFollower || !this.currentHandItem) return;

        const uiPos = event.getUILocation();
        const designSize = view.getDesignResolutionSize();
        
        const parent = this.mouseFollower.parent;
        if (parent) {
            const parentTransform = parent.getComponent(UITransform);
            if (parentTransform) {
                const canvasSize = parentTransform.contentSize;
                const scaleToCanvas = canvasSize.width / designSize.width;
                this._currentMousePos.set(
                    uiPos.x * scaleToCanvas - canvasSize.width / 2,
                    uiPos.y * scaleToCanvas - canvasSize.height / 2
                );
            }
        }
        
        // 启动实时跟随
        this._isMouseFollowing = true;
        
        // 立即更新一次位置
        this.updateMouseFollowerFromCache();
        
        this.mouseFollower.active = true;
        
        // 确保显示层级最高
        this.mouseFollower.setSiblingIndex(9999);
        
        this.updateHandDisplay();
    }
    
    /**
     * 停止鼠标跟随
     */
    private stopMouseFollowing() {
        this._isMouseFollowing = false;
    }

    /**
     * 隐藏工具按钮上的图片
     */
    private hideToolButtonImage(toolType: IngredientType) {
        let btn: Button = null;
        if (toolType === IngredientType.OIL) btn = this.oilBtn;
        else if (toolType === IngredientType.WATER) btn = this.waterBtn;
        else if (toolType === IngredientType.VINEGAR) btn = this.vinegarBtn;
        else if (toolType === IngredientType.CHILI) btn = this.chiliBtn;
        else if (toolType === IngredientType.SUGAR) btn = this.sugarBtn;
        
        if (btn?.node) {
            const sprite = btn.node.getComponent(Sprite);
            if (sprite) sprite.enabled = false;
        }
    }
    
    /**
     * 显示工具按钮上的图片
     */
    private showToolButtonImage(toolType: IngredientType) {
        let btn: Button = null;
        if (toolType === IngredientType.OIL) btn = this.oilBtn;
        else if (toolType === IngredientType.WATER) btn = this.waterBtn;
        else if (toolType === IngredientType.VINEGAR) btn = this.vinegarBtn;
        else if (toolType === IngredientType.CHILI) btn = this.chiliBtn;
        else if (toolType === IngredientType.SUGAR) btn = this.sugarBtn;
        
        if (btn?.node) {
            const sprite = btn.node.getComponent(Sprite);
            if (sprite) sprite.enabled = true;
        }
    }
    
    /**
     * 放下工具（油水醋糖辣椒通用）
     */
    private putDownTool(toolType: IngredientType) {
        console.log(`[CookingControllerV2] 放下工具: ${toolType}`);
        this.currentHandItem = null;
        this.handItemCount = 0;
        this.hideToolImage();
        this.showToolButtonImage(toolType);
        if (this.mouseFollower) {
            this.mouseFollower.active = false;
        }
        this.stopMouseFollowing();
        // 恢复其他 UI 元素
        if (this.brushSauceController) {
            this.brushSauceController.enableAllUIElements();
        }
    }

    /**
     * 油壶按钮点击 - 拿起/放下油壶（和水壶一样的逻辑）
     */
    private onOilButtonClick(event: EventTouch) {
        console.log('[CookingControllerV2] 🛢️ 油壶按钮被点击！');
        
        // 检查是否已开始营业（教程中跳过检查）
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) {
            console.log('[CookingControllerV2] ⚠️ 营业未开始，不能操作油壶');
            this.showMessage('⚠️ 请先点击"开始营业"！');
            return;
        }
        
        // 如果已经拿着油壶，放下
        if (this.currentHandItem === IngredientType.OIL) {
            this.putDownTool(IngredientType.OIL);
            this.showMessage('✅ 油壶已放回！');
        } else {
            // 🔥 如果手上拿着其他工具，先放下
            if (this.currentHandItem === IngredientType.SPATULA) {
                this.putDownSpatula();
            } else if (this.currentHandItem === IngredientType.GRILLED_NOODLE_SAUCE) {
                this.putDownBrush();
            } else if (this.currentHandItem === IngredientType.WATER) {
                this.putDownTool(IngredientType.WATER);
            } else if (this.currentHandItem === IngredientType.VINEGAR) {
                this.putDownTool(IngredientType.VINEGAR);
            } else if (this.currentHandItem === IngredientType.CHILI) {
                this.putDownTool(IngredientType.CHILI);
            } else if (this.currentHandItem === IngredientType.SUGAR) {
                this.putDownTool(IngredientType.SUGAR);
            }
            
            // 拿起油壶
            this.currentHandItem = IngredientType.OIL;
            this.handItemCount = 1;
            console.log('[CookingControllerV2] 🛢️ 拿起油壶');
            this.hideToolButtonImage(IngredientType.OIL);
            this.updateMouseFollowerPosition(event);
            this.showToolImage('oil', 'hold');
            this.showMessage('🛢️ 拿起油壶，点击铁板喷油！');
        }
    }

    /**
     * 显示喷水特效 + 面饼掀开动画
     */
    private showWaterEffect(food: FoodItem) {
        // 🔥 对整个背景节点（包含面饼图片）进行动画
        const bgNode = food.node.parent;
        if (!bgNode) return;
        
        // 保存原始状态
        const originalScale = bgNode.scale.clone();
        const originalPosition = bgNode.position.clone();
        
        // 🔥 面饼掀开动画：使用缩放Y模拟掀开效果（2D更明显）
        // 阶段1：掀开（0.2秒）- 向上移动 + Y轴压缩模拟透视
        tween(bgNode)
            .to(0.2, { 
                scale: new Vec3(originalScale.x * 1.05, originalScale.y * 0.7, originalScale.z),
                position: new Vec3(originalPosition.x, originalPosition.y + 25, originalPosition.z)
            }, { easing: 'quadOut' })
            // 阶段2：保持掀开状态（0.4秒）
            .delay(0.4)
            // 阶段3：放下（0.3秒）- 弹跳效果
            .to(0.15, { 
                scale: new Vec3(originalScale.x * 1.02, originalScale.y * 1.1, originalScale.z),
                position: new Vec3(originalPosition.x, originalPosition.y - 5, originalPosition.z)
            }, { easing: 'quadIn' })
            .to(0.1, { 
                scale: new Vec3(originalScale.x * 0.98, originalScale.y * 0.95, originalScale.z),
                position: new Vec3(originalPosition.x, originalPosition.y + 3, originalPosition.z)
            })
            .to(0.1, { 
                scale: originalScale,
                position: originalPosition
            }, { easing: 'quadOut' })
            .call(() => {
                // 🔥 放下后开始剧烈抖动（水蒸气挥发）
                this.startWaterBoilingShake(food, bgNode);
            })
            .start();
        
        // 🔥 水蒸气/水滴特效：从面饼下方喷出
        this.scheduleOnce(() => {
            this.createWaterSteamEffect(bgNode.parent!, bgNode);
        }, 0.15);
    }
    
    /**
     * 喷水后的剧烈抖动效果（水蒸气挥发）
     */
    private startWaterBoilingShake(food: FoodItem, bgNode: Node) {
        const originalPos = bgNode.position.clone();
        let shakeTime = 0;
        const shakeDuration = 2.5;  // 抖动持续2.5秒
        const maxIntensity = 3;     // 最大抖动幅度
        
        // 使用 schedule 实现持续抖动
        const shakeCallback = (dt: number) => {
            shakeTime += dt;
            
            if (shakeTime >= shakeDuration) {
                // 抖动结束，恢复原位
                bgNode.setPosition(originalPos);
                this.unschedule(shakeCallback);
                return;
            }
            
            // 抖动强度随时间衰减
            const progress = shakeTime / shakeDuration;
            const intensity = maxIntensity * (1 - progress * progress);  // 二次衰减
            
            // 快速随机抖动
            const offsetX = (Math.random() - 0.5) * intensity * 2;
            const offsetY = (Math.random() - 0.5) * intensity * 1.5;
            
            bgNode.setPosition(
                originalPos.x + offsetX,
                originalPos.y + offsetY,
                originalPos.z
            );
        };
        
        this.schedule(shakeCallback, 0.016);  // 约60fps
    }
    
    /**
     * 创建水蒸气特效
     */
    private createWaterSteamEffect(parentNode: Node, foodNode: Node) {
        // 创建多个水滴/蒸汽粒子
        const particleCount = 5;
        const foodPos = foodNode.position;
        
        for (let i = 0; i < particleCount; i++) {
            const steam = new Node('WaterSteam');
            steam.parent = parentNode;
            
            // 随机位置在面饼下方
            const offsetX = (Math.random() - 0.5) * 60;
            const offsetY = -20 + Math.random() * 10;
            steam.setPosition(foodPos.x + offsetX, foodPos.y + offsetY, 0);
            
            const label = steam.addComponent(Label);
            // 随机选择水滴或蒸汽图标
            label.string = Math.random() > 0.5 ? '💧' : '💨';
            label.fontSize = 20 + Math.random() * 15;
            label.color = new Color(150, 220, 255, 255);
            
            // 动画：向上飘动 + 淡出
            const targetY = foodPos.y + 40 + Math.random() * 30;
            const duration = 0.4 + Math.random() * 0.3;
            const delay = i * 0.05;
            
            tween(steam)
                .delay(delay)
                .to(duration, { 
                    position: new Vec3(foodPos.x + offsetX + (Math.random() - 0.5) * 20, targetY, 0)
                }, { easing: 'quadOut' })
                .call(() => {
                    steam.destroy();
                })
                .start();
        }
    }

    /**
     * 水壶按钮点击 - 拿起/放下水壶
     */
    private onWaterButtonClick(event: EventTouch) {
        console.log('[CookingControllerV2] 💧 水壶按钮被点击！');
        
        // 检查是否已开始营业（教程中跳过检查）
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) {
            this.showMessage('⚠️ 请先点击"开始营业"！');
            return;
        }
        
        // 如果已经拿着水壶，放下
        if (this.currentHandItem === IngredientType.WATER) {
            this.putDownTool(IngredientType.WATER);
            this.showMessage('✅ 水壶已放回！');
        } else {
            // 🔥 如果手上拿着其他工具，先放下
            if (this.currentHandItem === IngredientType.SPATULA) {
                this.putDownSpatula();
            } else if (this.currentHandItem === IngredientType.GRILLED_NOODLE_SAUCE) {
                this.putDownBrush();
            } else if (this.currentHandItem === IngredientType.OIL) {
                this.putDownTool(IngredientType.OIL);
            } else if (this.currentHandItem === IngredientType.VINEGAR) {
                this.putDownTool(IngredientType.VINEGAR);
            } else if (this.currentHandItem === IngredientType.CHILI) {
                this.putDownTool(IngredientType.CHILI);
            } else if (this.currentHandItem === IngredientType.SUGAR) {
                this.putDownTool(IngredientType.SUGAR);
            }
            
            // 拿起水壶
            this.currentHandItem = IngredientType.WATER;
            this.handItemCount = 1;
            console.log('[CookingControllerV2] 💧 拿起水壶');
            this.hideToolButtonImage(IngredientType.WATER);
            this.updateMouseFollowerPosition(event);
            this.showToolImage('water', 'hold');
            this.showMessage('💧 拿起水壶，点击面饼喷水！');
        }
    }

    /**
     * 铲子按钮点击 - 拿起/放下铲子
     */
    private onSpatulaButtonClick(event: EventTouch) {
        console.log('[CookingControllerV2] 🍴 铲子按钮被点击！');
        
        // 检查是否已开始营业（教程中跳过检查）
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) {
            this.showMessage('⚠️ 请先点击"开始营业"！');
            return;
        }
        
        // 如果已经拿着铲子，放下
        if (this.currentHandItem === IngredientType.SPATULA) {
            console.log('[CookingControllerV2] 🍴 放下铲子');
            this.currentHandItem = null;
            this.handItemCount = 0;
            this._spatulaOperationPhase = null;  // 重置阶段
            // 隐藏跟随鼠标的铲子图片
            this.hideSpatulaImage();
            if (this.mouseFollower) {
                this.mouseFollower.active = false;
            }
            this.stopMouseFollowing();
            // 显示铲子在架子上
            this.showSpatulaOnRack();
            // 🔥 重置铲子动画标志，防止卡住
            this.setSpatulaAnimating(false);
            // 🔥 恢复其他 UI 元素
            if (this.brushSauceController) {
                this.brushSauceController.enableAllUIElements();
            }
            this.showMessage('✅ 铲子已放回！');
        } else {
            // 🔥 如果手上拿着其他工具，先放下
            if (this.currentHandItem === IngredientType.GRILLED_NOODLE_SAUCE) {
                this.putDownBrush();
            } else if (this.currentHandItem === IngredientType.OIL) {
                this.putDownTool(IngredientType.OIL);
            } else if (this.currentHandItem === IngredientType.WATER) {
                this.putDownTool(IngredientType.WATER);
            } else if (this.currentHandItem === IngredientType.VINEGAR) {
                this.putDownTool(IngredientType.VINEGAR);
            } else if (this.currentHandItem === IngredientType.CHILI) {
                this.putDownTool(IngredientType.CHILI);
            } else if (this.currentHandItem === IngredientType.SUGAR) {
                this.putDownTool(IngredientType.SUGAR);
            }
            
            // 拿起铲子
            this.currentHandItem = IngredientType.SPATULA;
            this.handItemCount = 1;
            console.log('[CookingControllerV2] 🍴 拿起铲子');
            this.updateMouseFollowerPosition(event);
            
            // 🔪 检查是否有可切割的面饼，决定使用哪种铲子图片
            const hasCuttableFood = this.foodItems.some(food => 
                food.state === DoughState.ROLLED && food.hasRollSauce && !food.isCutComplete()
            );
            
            if (hasCuttableFood) {
                // 进入切割模式，使用切割铲子图片
                this.showCutSpatulaImage();
                this.showMessage('🔪 拿起切割铲子，点击面饼切块！');
            } else {
                // 普通铲子模式
                this.updateHandDisplay();
                this.showMessage('🍴 拿起铲子，点击面饼翻面或卷切！');
            }
            
            // 隐藏架子上的铲子
            this.hideSpatulaOnRack();
        }
    }
    
    /**
     * 放下刷子
     */
    private putDownBrush() {
        console.log(`[CookingControllerV2] 放回刷子`);
        this.currentHandItem = null;
        this.handItemCount = 0;
        if (this.mouseFollower) {
            this.mouseFollower.active = false;
        }
        this.stopMouseFollowing();
        // 隐藏刷子图片
        this.hideBrushImage();
        // 显示刷子在酱料按钮上方
        this.showBrushOnSauceButton();
        // 🔥 重置铲子动画标志，防止卡住
        this.setSpatulaAnimating(false);
        // 🔥 重置刷酱控制器（清理所有数据）
        if (this.brushSauceController) {
            this.brushSauceController.reset();
            // 🔥 恢复其他 UI 元素的触摸检测
            this.brushSauceController.enableAllUIElements();
        }
        // 🔥 移除原生鼠标监听
        this.removeNativeMouseListener();
    }

    // 记录当前铲子操作的阶段：'flip' | 'roll' | 'cut' | null
    private _spatulaOperationPhase: 'flip' | 'roll' | 'cut' | null = null;

    /**
     * 检查是否所有面饼都完成了当前铲子操作阶段，如果是则自动放下铲子
     * 铲子操作分三个阶段：翻面、卷起、切块
     * 只有当所有面饼都完成了同一阶段的操作，才自动放下铲子
     */
    private checkAndPutDownSpatula() {
        if (this.foodItems.length === 0) {
            // 没有面饼，放下铲子
            this.putDownSpatula();
            return;
        }

        // 统计当前阶段需要操作的面饼数量
        let needOperationCount = 0;

        for (const food of this.foodItems) {
            if (this._spatulaOperationPhase === 'flip') {
                // 翻面阶段：检查是否还有需要翻面的
                if (food.state === DoughState.EGG_ADDED && !food.isFlipped) {
                    needOperationCount++;
                }
            } else if (this._spatulaOperationPhase === 'roll') {
                // 卷起阶段：检查是否还有需要卷起的（FLIPPED 且满足条件）
                if (food.state === DoughState.FLIPPED) {
                    needOperationCount++;
                }
            } else if (this._spatulaOperationPhase === 'cut') {
                // 切块阶段：检查是否还有需要切块的
                if (food.state === DoughState.ROLLED) {
                    needOperationCount++;
                }
            }
        }

        console.log(`[CookingControllerV2] 🍴 铲子状态检查: 阶段=${this._spatulaOperationPhase}, 还需操作=${needOperationCount}`);

        // 如果当前阶段没有面饼需要操作，放下铲子
        if (needOperationCount === 0) {
            console.log('[CookingControllerV2] 🍴 当前阶段所有面饼都完成了操作，自动放下铲子');
            this.putDownSpatula();
            this.showMessage('🎉 操作完成，铲子已放回！');
        }
    }

    /**
     * 放下铲子
     */
    private putDownSpatula() {
        this.currentHandItem = null;
        this.handItemCount = 0;
        this._spatulaOperationPhase = null;  // 重置阶段
        // 隐藏跟随鼠标的铲子图片
        this.hideSpatulaImage();
        if (this.mouseFollower) {
            this.mouseFollower.active = false;
        }
        this.stopMouseFollowing();
        // 显示铲子在架子上
        this.showSpatulaOnRack();
        // 🔥 恢复其他 UI 元素
        if (this.brushSauceController) {
            this.brushSauceController.enableAllUIElements();
        }
        console.log('[CookingControllerV2] 🍴 铲子已放下');
    }

    // 铲子架子的两个图片
    private _spatulaRackSpriteFrame: SpriteFrame = null;   // 带铲子的架子
    private _spatulaEmptySpriteFrame: SpriteFrame = null;  // 空架子
    // 场景中的铲子图片节点（在架子上）
    private _spatulaImageOnRack: Node = null;

    /**
     * 显示铲子在架子上（放回铲子时）
     * 切换架子背景为带铲子的图片
     */
    private showSpatulaOnRack() {
        if (!this.spatulaBtn) return;
        
        // 切换架子背景为带铲子的图片
        const sprite = this.spatulaBtn.node.getComponent(Sprite);
        if (sprite) {
            if (this._spatulaRackSpriteFrame) {
                sprite.spriteFrame = this._spatulaRackSpriteFrame;
            } else {
                const spatulaRackUUID = '1b277080-fa99-4ba6-9b61-2d5424be090d@f9941';
                assetManager.loadAny({ uuid: spatulaRackUUID }, (err, spriteFrame: SpriteFrame) => {
                    if (!err && spriteFrame && sprite.isValid) {
                        this._spatulaRackSpriteFrame = spriteFrame;
                        sprite.spriteFrame = spriteFrame;
                    }
                });
            }
        }
        console.log('[CookingControllerV2] 🍴 铲子已放回架子上');
    }

    /**
     * 隐藏架子上的铲子（拿起铲子时）
     * 切换架子背景为空架子
     */
    private hideSpatulaOnRack() {
        if (!this.spatulaBtn) return;
        
        // 切换架子背景为空架子
        const sprite = this.spatulaBtn.node.getComponent(Sprite);
        if (sprite) {
            if (this._spatulaEmptySpriteFrame) {
                sprite.spriteFrame = this._spatulaEmptySpriteFrame;
            } else {
                const spatulaEmptyUUID = '5d2b0de9-b30a-4a36-a906-ce4a25879bb8@f9941';
                assetManager.loadAny({ uuid: spatulaEmptyUUID }, (err, spriteFrame: SpriteFrame) => {
                    if (!err && spriteFrame && sprite.isValid) {
                        this._spatulaEmptySpriteFrame = spriteFrame;
                        sprite.spriteFrame = spriteFrame;
                    }
                });
            }
        }
        console.log('[CookingControllerV2] 🍴 铲子已从架子上拿起');
    }

    /**
     * 初始化铲子图片
     * 查找场景中的铲子节点（用于读取缩放和角度），预加载架子图片和跟随鼠标的铲子图片
     */
    private initSpatulaSpriteFrames() {
        if (!this.spatulaBtn) {
            console.warn('[CookingControllerV2] ⚠️ 铲子按钮未找到，无法初始化铲子图片');
            return;
        }

        // 查找场景中的铲子图片节点（用于读取缩放和角度，不控制显示隐藏）
        this._spatulaImageOnRack = this.spatulaBtn.node.getChildByName('SpatulaImage');
        if (this._spatulaImageOnRack) {
            console.log('[CookingControllerV2] 🍴 找到场景中的铲子节点，用于读取缩放和角度');
        }

        // 预加载带铲子的架子图片
        const spatulaRackUUID = '1b277080-fa99-4ba6-9b61-2d5424be090d@f9941';
        assetManager.loadAny({ uuid: spatulaRackUUID }, (err, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame) {
                this._spatulaRackSpriteFrame = spriteFrame;
                console.log('[CookingControllerV2] 🍴 已加载带铲子架子图片');
            }
        });

        // 预加载空架子图片
        const spatulaEmptyUUID = '5d2b0de9-b30a-4a36-a906-ce4a25879bb8@f9941';
        assetManager.loadAny({ uuid: spatulaEmptyUUID }, (err, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame) {
                this._spatulaEmptySpriteFrame = spriteFrame;
                console.log('[CookingControllerV2] 🍴 已加载空架子图片');
            }
        });

        // 加载铲子图片（跟随鼠标用）
        const spatulaUUID = 'fa2d1177-c53a-4fcf-8ffc-8ed555a176f4@f9941';
        assetManager.loadAny({ uuid: spatulaUUID }, (err, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame) {
                this._spatulaSpriteFrame = spriteFrame;
                console.log('[CookingControllerV2] 🍴 已加载铲子图片');
            } else {
                console.warn('[CookingControllerV2] ⚠️ 加载铲子图片失败');
            }
        });
    }

    /**
    private onIngredientClick(type: IngredientType) {
        // 这个方法现在不再使用，但保留以兼容面饼按钮
        if (type === IngredientType.DOUGH) {
            if (this.foodItems.length >= this.maxFoodItems) {
                this.showMessage('⚠️ 铁板上最多只能放3个面饼！');
                return;
            }
            this.placeDoughOnGrill();
        }
    }

    /**
     * 点击铁板（用于添加食材或翻面）
     */
    private onGrillClick(event: EventTouch) {
        this._lastGrillTouchTime = Date.now();
        // 🔥 如果正在处理面饼点击，直接返回，避免重复处理
        if (this._handlingFoodClick) {
            console.log(`[Debug] onGrillClick: 正在处理面饼点击，跳过`);
            return;
        }
        
        // 🔥 检测是否点击到了油壶/水壶区域（它们视觉上在铁板下面，但需要响应点击）
        if (this.checkAndForwardToButton(event)) {
            return;  // 已转发到按钮，不继续处理铁板点击
        }
        
        // 检查是否已开始营业（教程中跳过检查）
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) {
            this.showMessage('⚠️ 请先点击"开始营业"！');
            return;
        }
        
        // 🔥 使用 UITransform.convertToNodeSpaceAR 进行精确的坐标转换
        const touchPos = event.getUILocation();
        
        console.log(`[Debug] 点击铁板，检查 ${this.foodItems.length} 个面饼, 触摸UI坐标: (${touchPos.x.toFixed(0)}, ${touchPos.y.toFixed(0)})`);
        
        for (const food of this.foodItems) {
            const bgNode = food.node.parent;
            if (!bgNode) continue;
            
            const uiTransform = bgNode.getComponent(UITransform);
            if (!uiTransform) continue;
            
            // 🔥 将触摸点转换到面饼节点的本地坐标系
            const localPos = uiTransform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));
            
            // 检测是否在面饼范围内（只扩大 20%，不要太大）
            const size = uiTransform.contentSize;
            const halfWidth = size.width * 0.6;  // 60% 的半宽
            const halfHeight = size.height * 0.6;
            
            const inRange = Math.abs(localPos.x) <= halfWidth && Math.abs(localPos.y) <= halfHeight;
            
            console.log(`[Debug] 面饼${food.positionIndex}: 状态=${food.state}, 本地坐标=(${localPos.x.toFixed(0)}, ${localPos.y.toFixed(0)}), 范围=±${halfWidth.toFixed(0)}, ±${halfHeight.toFixed(0)}, 命中=${inRange}`);
            
            if (inRange) {
                console.log(`[Debug] ✅ 找到面饼！状态=${food.state}, 食材数=${food.addedIngredients.length}`);
                
                // 如果没有拿食材，根据状态执行不同操作
                console.log(`[Debug] 手持物品: ${this.currentHandItem}, 面饼状态: ${food.state}`);
                
                // 🍴 拿着铲子时：翻面或卷切
                if (this.currentHandItem === IngredientType.SPATULA) {
                    if (food.state === DoughState.EGG_ADDED && !food.isFlipped) {
                        // 翻面
                        console.log('[CookingControllerV2] 🍴 用铲子翻面');
                        this.flipFood(food);
                        // 翻面后放下铲子
                        this.currentHandItem = null;
                        this.handItemCount = 0;
                        if (this.mouseFollower) {
                            this.mouseFollower.active = false;
                        }
                        this.stopMouseFollowing();
                        return;
                    } else if (food.state === DoughState.FLIPPED) {
                        // 检查是否满足卷起条件
                        if (!food.hasSauce) {
                            this.showMessage('⚠️ 请先刷酱料！点击酱料瓶拿起刷子！');
                            return;
                        }
                        const hasChili = food.addedIngredients.some(i => i === IngredientType.CHILI);
                        const hasSugar = food.addedIngredients.some(i => i === IngredientType.SUGAR);
                        const hasVinegar = food.addedIngredients.some(i => i === IngredientType.VINEGAR);
                        if (!hasChili && !hasSugar && !hasVinegar) {
                            this.showMessage('⚠️ 请先添加调料（辣椒/白糖/醋）！');
                            return;
                        }
                        const hasSausage = food.addedIngredients.some(i => i === IngredientType.SAUSAGE);
                        if (!hasSausage) {
                            this.showMessage('⚠️ 请先添加香肠再卷起！香肠是必加品！');
                            return;
                        }
                        // 用铲子卷起
                        console.log('[CookingControllerV2] 🍴 用铲子卷起！');
                        this.rollFood(food);
                        // 卷起后放下铲子
                        this.currentHandItem = null;
                        this.handItemCount = 0;
                        if (this.mouseFollower) {
                            this.mouseFollower.active = false;
                        }
                        this.stopMouseFollowing();
                        return;
                    } else if (food.state === DoughState.ROLLED) {
                        // 🌯 卷好后需要先刷酱才能切块
                        if (!food.hasRollSauce) {
                            this.showMessage('⚠️ 请先刷酱料再切块！');
                            console.log('[CookingControllerV2] ⚠️ 卷好的面饼需要先刷酱');
                            return;
                        }
                        // 🔪 用铲子切一刀
                        console.log('[CookingControllerV2] 🔪 用铲子切一刀');
                        this.cutFoodOnce(food);
                        // 不立即放下铲子，由 cutFoodOnce 内部处理
                        return;
                    } else if (food.state === DoughState.CUT) {
                        // 🔪 切好的面饼，点击打包
                        console.log('[CookingControllerV2] 📦 点击切好的面饼打包');
                        this.packCutFood(food);
                        return;
                    } else {
                        this.showMessage('⚠️ 当前状态无法使用铲子！');
                        return;
                    }
                }
                
                if (!this.currentHandItem) {
                    if (food.state === DoughState.EGG_ADDED && !food.isFlipped) {
                        // 需要铲子翻面
                        this.showMessage('🍴 请先拿起铲子再翻面！');
                        console.log('[CookingControllerV2] ⚠️ 需要铲子才能翻面');
                        return;
                    } else if (food.state === DoughState.FLIPPED) {
                        // 🔥 翻面后需要按顺序完成：刷酱料 → 加调料 → 加洋葱香菜 → 加香肠 → 卷起
                        // 1. 检查是否已刷酱料
                        if (!food.hasSauce) {
                            this.showMessage('⚠️ 请先刷酱料！点击酱料瓶拿起刷子！');
                            console.log('[CookingControllerV2] ⚠️ 未刷酱料，无法卷起');
                            return;
                        }
                        // 2. 检查是否添加了调料（至少需要根据口味添加）
                        const hasChili = food.addedIngredients.some(i => i === IngredientType.CHILI);
                        const hasSugar = food.addedIngredients.some(i => i === IngredientType.SUGAR);
                        const hasVinegar = food.addedIngredients.some(i => i === IngredientType.VINEGAR);
                        if (!hasChili && !hasSugar && !hasVinegar) {
                            this.showMessage('⚠️ 请先添加调料（辣椒/白糖/醋）！');
                            console.log('[CookingControllerV2] ⚠️ 未添加调料，无法卷起');
                            return;
                        }
                        // 3. 检查是否添加了香肠（必加品）
                        const hasSausage = food.addedIngredients.some(i => i === IngredientType.SAUSAGE);
                        if (!hasSausage) {
                            this.showMessage('⚠️ 请先添加香肠再卷起！香肠是必加品！');
                            console.log('[CookingControllerV2] ⚠️ 未添加香肠，无法卷起');
                            return;
                        }
                        // 需要铲子卷起
                        this.showMessage('🍴 请先拿起铲子再卷起！');
                        console.log('[CookingControllerV2] ⚠️ 需要铲子才能卷起');
                        return;
                    } else if (food.state === DoughState.ROLLED) {
                        // 需要铲子切块
                        this.showMessage('🍴 请先拿起铲子再切块！');
                        console.log('[CookingControllerV2] ⚠️ 需要铲子才能切块');
                        return;
                    } else if (food.state === DoughState.CUT) {
                        // 完成（自动卷起后不会走到这里）
                        console.log('[CookingControllerV2] 🍱 点击面饼完成');
                        this.finishFood(food);
                        return;
                    } else if (food.state === DoughState.DONE) {
                        // 已完成，提示拖动打包
                        this.showMessage('✅ 烤冷面已完成！拖到打包盒打包！');
                        return;
                    } else {
                        console.log(`[Debug] 面饼状态 ${food.state} 无法操作`);
                        this.showMessage('💡 请先拿起食材再添加');
                        return;
                    }
                }
                
                // 如果拿着食材，添加到面饼
                this.addIngredientToFood(food);
                return;
            }
        }
        
        console.log(`[Debug] 未找到面饼，当前有 ${this.foodItems.length} 个面饼`);
        
        // 🛢️ 如果拿着油壶，在铁板上喷油
        if (this.currentHandItem === IngredientType.OIL) {
            // 🔥 先检查是否有空位可以喷油
            const usedPositions = new Set<number>();
            this.foodItems.forEach((food) => {
                if (food.positionIndex !== undefined) {
                    usedPositions.add(food.positionIndex);
                }
            });
            let hasEmptyPosition = false;
            for (let i = 0; i < this.maxFoodItems; i++) {
                if (!usedPositions.has(i) && !this.oilMarks[i]) {
                    hasEmptyPosition = true;
                    break;
                }
            }
            
            if (!hasEmptyPosition) {
                this.showMessage('⚠️ 所有位置都已喷油或有面饼了！');
                return;
            }
            
            console.log('[CookingControllerV2] 🛢️ 拿着油壶点击铁板，喷油');
            // 切换到倒油状态图片
            this.switchToolState('pouring');
            // 执行喷油
            this.sprayOilOnGrill(event);
            // 延迟切换回手持状态
            this.scheduleOnce(() => {
                if (this.currentHandItem === IngredientType.OIL) {
                    this.switchToolState('hold');
                }
            }, 0.3);
            return;
        }
        
        if (this.currentHandItem) {
            this.showMessage('💡 点击面饼来添加食材');
        }
    }
    
    /**
     * 处理面饼点击（根据状态执行不同操作）
     */
    private handleFoodClick(food: FoodItem) {
        // 🔥 检查营业状态
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) {
            this.showMessage('⚠️ 营业已结束，无法操作！');
            return;
        }
        
        console.log(`[CookingControllerV2] 处理面饼点击，状态=${food.state}, 手持=${this.currentHandItem}`);
        
        // 🍴 拿着铲子时：翻面、卷起或切块
        if (this.currentHandItem === IngredientType.SPATULA) {
            if (food.state === DoughState.EGG_ADDED && !food.isFlipped) {
                // 用铲子翻面
                console.log('[CookingControllerV2] 🍴 用铲子翻面');
                this.flipFood(food);
                // 🔥 延迟放下铲子，等动画播放完毕
                this.scheduleOnce(() => {
                    this.currentHandItem = null;
                    this.handItemCount = 0;
                    this.hideSpatulaImage();
                    this.showSpatulaOnRack();
                    if (this.mouseFollower) {
                        this.mouseFollower.active = false;
                    }
                    this.stopMouseFollowing();
                    // 恢复其他 UI 元素
                    if (this.brushSauceController) {
                        this.brushSauceController.enableAllUIElements();
                    }
                }, 0.5);  // 等待铲子动画完成
            } else if (food.state === DoughState.FLIPPED) {
                // 检查卷起条件
                if (!food.hasSauce) {
                    this.showMessage('⚠️ 请先刷酱料！');
                    return;
                }
                const hasChili = food.addedIngredients.some(i => i === IngredientType.CHILI);
                const hasSugar = food.addedIngredients.some(i => i === IngredientType.SUGAR);
                const hasVinegar = food.addedIngredients.some(i => i === IngredientType.VINEGAR);
                if (!hasChili && !hasSugar && !hasVinegar) {
                    this.showMessage('⚠️ 请先添加调料！');
                    return;
                }
                const hasSausage = food.addedIngredients.some(i => i === IngredientType.SAUSAGE);
                if (!hasSausage) {
                    this.showMessage('⚠️ 请先添加香肠！');
                    return;
                }
                // 用铲子卷起
                console.log('[CookingControllerV2] 🍴 用铲子卷起！');
                this.rollFood(food);
                // 卷起后放下铲子
                this.currentHandItem = null;
                this.handItemCount = 0;
                if (this.mouseFollower) {
                    this.mouseFollower.active = false;
                }
                this.stopMouseFollowing();
            } else if (food.state === DoughState.ROLLED) {
                // 🌯 卷好后需要先刷酱才能切块
                if (!food.hasRollSauce) {
                    this.showMessage('⚠️ 请先刷酱料再切块！');
                    console.log('[CookingControllerV2] ⚠️ 卷好的面饼需要先刷酱');
                    return;
                }
                // 🔪 用铲子切一刀
                console.log('[CookingControllerV2] 🔪 用铲子切一刀');
                this.cutFoodOnce(food);
                // 不立即放下铲子，由 cutFoodOnce 内部处理
            } else if (food.state === DoughState.CUT) {
                // 🔪 切好的面饼，点击打包
                console.log('[CookingControllerV2] 📦 点击切好的面饼打包');
                this.packCutFood(food);
            } else {
                this.showMessage('⚠️ 当前状态无法使用铲子！');
            }
            return;
        }
        
        if (food.state === DoughState.EGG_ADDED && !food.isFlipped) {
            // 需要铲子翻面
            this.showMessage('🍴 请先拿起铲子再翻面！');
            console.log('[CookingControllerV2] ⚠️ 需要铲子才能翻面');
        } else if (food.state === DoughState.FLIPPED) {
            // 🔥 翻面后需要按顺序完成：刷酱料 → 加调料 → 加洋葱香菜 → 加香肠 → 卷起
            // 1. 检查是否已刷酱料
            if (!food.hasSauce) {
                this.showMessage('⚠️ 请先刷酱料！点击酱料瓶拿起刷子！');
                console.log('[CookingControllerV2] ⚠️ 未刷酱料，无法卷起');
                return;
            }
            // 2. 检查是否添加了调料（至少需要根据口味添加）
            const hasChili = food.addedIngredients.some(i => i === IngredientType.CHILI);
            const hasSugar = food.addedIngredients.some(i => i === IngredientType.SUGAR);
            const hasVinegar = food.addedIngredients.some(i => i === IngredientType.VINEGAR);
            if (!hasChili && !hasSugar && !hasVinegar) {
                this.showMessage('⚠️ 请先添加调料（辣椒/白糖/醋）！');
                console.log('[CookingControllerV2] ⚠️ 未添加调料，无法卷起');
                return;
            }
            // 3. 检查是否添加了香肠（必加品）
            const hasSausage = food.addedIngredients.some(i => i === IngredientType.SAUSAGE);
            if (!hasSausage) {
                this.showMessage('⚠️ 请先添加香肠再卷起！香肠是必加品！');
                console.log('[CookingControllerV2] ⚠️ 未添加香肠，无法卷起');
                return;
            }
            // 需要铲子卷起
            this.showMessage('🍴 请先拿起铲子再卷起！');
            console.log('[CookingControllerV2] ⚠️ 需要铲子才能卷起');
        } else if (food.state === DoughState.ROLLED) {
            // 需要铲子切块
            this.showMessage('🍴 请先拿起铲子再切块！');
            console.log('[CookingControllerV2] ⚠️ 需要铲子才能切块');
        } else if (food.state === DoughState.CUT) {
            // 完成
            console.log('[CookingControllerV2] 🍱 点击面饼完成');
            this.finishFood(food);
        } else if (food.state === DoughState.DONE) {
            this.showMessage('✅ 烤冷面已完成！拖到打包盒打包！');
        } else {
            console.log(`[CookingControllerV2] 面饼状态 ${food.state} 暂不支持点击操作`);
        }
    }
    
    /**
     * 在铁板上喷油（拿着油壶点击铁板时执行）
     */
    private sprayOilOnGrill(event: EventTouch) {
        // 🔥 检查营业状态
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) {
            this.showMessage('⚠️ 营业已结束，无法操作！');
            return;
        }
        
        // 🔥 检查油的库存
        if (!this.consumeIngredient(IngredientType.OIL)) {
            this.showMessage('⚠️ 食用油库存不足！请先去购买！');
            return;
        }
        
        console.log('[CookingControllerV2] 在铁板上喷油');

        // 先收集所有被面饼占用的位置（不管什么状态，有面饼就不能喷油）
        const usedPositions = new Set<number>();
        this.foodItems.forEach((food) => {
            if (food.positionIndex !== undefined) {
                usedPositions.add(food.positionIndex);
            }
        });
        
        console.log(`[CookingControllerV2] 已被面饼占用的位置: ${Array.from(usedPositions).join(', ')}`);
        console.log(`[CookingControllerV2] 已有油渍的位置: ${this.oilMarks.map((m, i) => m ? i : -1).filter(i => i >= 0).join(', ')}`);

        // 在空闲位置生成油渍（没有面饼且没有油渍的位置）
        
        // 找到第一个未使用的位置（0-2）
        let posIndex = -1;
        for (let i = 0; i < this.maxFoodItems; i++) {
            if (!usedPositions.has(i) && !this.oilMarks[i]) {
                posIndex = i;
                break;
            }
        }

        // 如果没有空闲位置
        if (posIndex === -1) {
            this.showMessage('⚠️ 所有位置都已喷油或有面饼了！');
            return;
        }

        // 获取油渍位置（优先使用编辑器配置的节点位置）
        const positionNodes = [this.oilPosition1, this.oilPosition2, this.oilPosition3];
        let x: number, y: number;
        
        if (positionNodes[posIndex] && positionNodes[posIndex].isValid) {
            // 使用编辑器中配置的位置
            const pos = positionNodes[posIndex].position;
            x = pos.x;
            y = pos.y;
            console.log(`[CookingControllerV2] 使用编辑器配置的油渍位置${posIndex + 1}: (${x}, ${y})`);
        } else {
            // 回退到默认计算位置（间距140像素，整体偏左）
            const xOffset = posIndex * 140;
            x = xOffset - 200;
            y = -75;
            console.log(`[CookingControllerV2] 使用默认油渍位置${posIndex + 1}: (${x}, ${y})`);
        }
        
        // 创建油渍标记节点（使用图片）
        const oilMarkNode = new Node('OilMark_' + posIndex);
        const oilSprite = oilMarkNode.addComponent(Sprite);
        oilSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        
        // 设置UITransform尺寸
        const oilTransform = oilMarkNode.getComponent(UITransform);
        if (oilTransform) {
            oilTransform.setContentSize(80, 80);  // 油渍大小
        }
        
        // 油渍图片UUID（9张图随机选择）
        const oilImageUUIDs = [
            '00c78a2c-3587-41c6-9017-a27b786bdbe8@f9941',  // oil_stain_01
            'ab74db33-6ea8-4f33-8e59-79c1d51602d8@f9941',  // oil_stain_02
            '28e05132-da37-4ce9-ae0f-218ffa208632@f9941',  // oil_stain_03
            '82197776-4279-4948-b38d-d1e8e8aebf9d@f9941',  // oil_stain_04
            '5c7a6122-39cf-4713-b8f7-82bc4b3432d7@f9941',  // oil_stain_05
            '75bf2342-6f3d-44c5-9d02-43304794d554@f9941',  // 06oil_stain_06
            'ca1e4f28-ea09-4232-9000-84eeb7b18d26@f9941',  // oil_mark_left
            '32c61b85-7308-424a-b199-e5e97b4c030a@f9941',  // oil_mark_center
            '0a98ca18-62e6-44b2-8007-c9408147eced@f9941'   // oil_mark_right
        ];
        
        // 随机选择一张油渍图片
        const randomIndex = Math.floor(Math.random() * oilImageUUIDs.length);
        
        // 加载随机选择的油渍图片
        assetManager.loadAny({uuid: oilImageUUIDs[randomIndex]}, (err: Error | null, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame && oilSprite.isValid) {
                oilSprite.spriteFrame = spriteFrame;
            }
        });
        
        oilMarkNode.setPosition(x, y, 0);
        this.foodContainer.addChild(oilMarkNode);
        
        // 保存到油渍数组
        this.oilMarks[posIndex] = oilMarkNode;
        
        // 添加出现动画
        oilMarkNode.setScale(0.3, 0.3, 1);
        tween(oilMarkNode)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        
        this.showMessage(`✅ 已在位置${posIndex + 1}喷油！现在可以放面饼了！`);
        
        // 触发教程动作
        this.triggerTutorialAction('oil_applied');
        
        // 🔥 检查是否所有位置都已喷油或有面饼，自动放下油壶
        this.scheduleOnce(() => {
            if (this.currentHandItem === IngredientType.OIL) {
                let hasEmptyPosition = false;
                for (let i = 0; i < this.maxFoodItems; i++) {
                    const hasFood = this.foodItems.some(f => f.positionIndex === i);
                    if (!hasFood && !this.oilMarks[i]) {
                        hasEmptyPosition = true;
                        break;
                    }
                }
                if (!hasEmptyPosition) {
                    console.log('[CookingControllerV2] 🛢️ 所有位置都已喷油或有面饼，自动放下油壶');
                    this.putDownTool(IngredientType.OIL);
                    this.showMessage('✅ 所有位置都已喷油，油壶已放回！');
                }
            }
        }, 0.5);
    }


    /**
     * 高亮选中的面饼
     */
    private highlightFood(food: FoodItem) {
        // 清除所有高亮
        this.foodItems.forEach(f => {
            const bgNode = f.node.parent;
            if (bgNode) {
                const sprite = bgNode.getComponent(Sprite);
                if (sprite) {
                    sprite.color = new Color(255, 228, 196, 255);  // 恢复原色
                }
            }
        });

        // 高亮选中的
        const bgNode = food.node.parent;
        if (bgNode) {
            const sprite = bgNode.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(255, 255, 100, 255);  // 黄色高亮
            }
        }
    }

    /**
     * 将面饼放到铁板上（只能放到已喷油的位置）
     */
    private placeDoughOnGrill() {
        // 🔥 检查营业状态
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) {
            this.showMessage('⚠️ 营业已结束，无法操作！');
            return;
        }
        
        // 🔥 先检查库存是否足够（不消耗）
        if (!this.hasIngredientStock(IngredientType.DOUGH)) {
            this.showMessage('⚠️ 面饼库存不足！请先去购买！');
            return;
        }
        
        console.log('[CookingControllerV2] 将面饼放到铁板上');

        // 🔥 先找到有油渍的位置索引（在消耗之前检查）
        let oiledPosIndex = -1;
        for (let i = 0; i < this.maxFoodItems; i++) {
            if (this.oilMarks[i]) {
                oiledPosIndex = i;
                break;
            }
        }

        // 🔥 如果没有油渍位置，提示先喷油（不消耗面饼）
        if (oiledPosIndex === -1) {
            this.showMessage('⚠️ 请先点击油壶喷油！');
            return;
        }
        
        // 🔥 确认可以放置后，才消耗面饼
        if (!this.consumeIngredient(IngredientType.DOUGH)) {
            this.showMessage('⚠️ 面饼库存不足！');
            return;
        }

        const posIndex = oiledPosIndex;

        // 创建面饼背景节点（初始状态为NEED_OIL，还没喷油）
        const doughBg = new Node('DoughBg_' + posIndex);
        const bgSprite = doughBg.addComponent(Sprite);
        bgSprite.color = new Color(255, 228, 196, 255);
        bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;  // 使用自定义尺寸，不随图片变化
        
        // 获取Sprite自动创建的UITransform组件（不要重复添加）
        const bgTransform = doughBg.getComponent(UITransform);
        if (bgTransform) {
            bgTransform.setContentSize(this.doughSize, this.doughSize);
        }

        // 创建面饼Label节点作为子节点
        const doughNode = new Node('Dough_' + posIndex);
        const doughLabel = doughNode.addComponent(Label);
        doughLabel.string = '';
        doughLabel.fontSize = 60;
        doughNode.setPosition(0, 0, 0);
        
        doughBg.addChild(doughNode);

        // 获取面饼位置（优先使用编辑器配置的节点位置）
        const positionNodes = [this.oilPosition1, this.oilPosition2, this.oilPosition3];
        let doughX: number, doughY: number;
        
        if (positionNodes[posIndex] && positionNodes[posIndex].isValid) {
            const pos = positionNodes[posIndex].position;
            doughX = pos.x;
            doughY = pos.y;
        } else {
            // 间距140像素，整体偏左
            const xOffset = posIndex * 140;
            doughX = xOffset - 200;
            doughY = -75;
        }
        doughBg.setPosition(doughX, doughY, 0);

        this.foodContainer.addChild(doughBg);

        // 创建FoodItem对象（使用Label节点而不是背景节点，传入可调参数）
        // 初始状态为NEED_OIL（需要喷油）
        const foodItem = new FoodItem(doughNode, this.maxCookTime, this.burnWarningThreshold, this.almostBurntThreshold);
        // 保存位置索引到食物对象（用于清除油渍和选择正确透视的图片）
        foodItem.positionIndex = posIndex;
        this.foodItems.push(foodItem);

        // 如果该位置有油渍，清除它并自动给面饼喷油
        if (this.oilMarks[posIndex]) {
            this.oilMarks[posIndex].destroy();
            this.oilMarks[posIndex] = null;
            console.log(`[CookingControllerV2] 清除位置${posIndex}的油渍`);
            
            // 自动给面饼喷油（从NEED_OIL转换到RAW状态）
            foodItem.sprayOil();
            console.log(`[CookingControllerV2] ✅ 面饼已自动喷油（放到有油渍的位置）`);
        }

        // 添加拖动事件监听（恢复完整的事件监听）
        doughBg.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.onFoodDragStart(event, foodItem), this);
        doughBg.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => this.onFoodDragMove(event, foodItem), this);
        doughBg.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onFoodDragEnd(event, foodItem), this);
        doughBg.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => this.onFoodDragEnd(event, foodItem), this);

        // 动画效果
        doughBg.setScale(0, 0, 1);
        tween(doughBg)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        this.showMessage(`✅ 面饼已放到位置${posIndex + 1}！已自动喷油！`);
        this.updateServeButton();
        
        // 触发教程动作
        this.triggerTutorialAction('dough_placed');
    }

    /**
     * 添加食材到食物上（根据手持数量添加）
     */
    private addIngredientToFood(food: FoodItem) {
        if (!this.currentHandItem) return;
        
        // 🔥 检查营业状态
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) {
            this.showMessage('⚠️ 营业已结束，无法操作！');
            return;
        }

        const ingredient = INGREDIENT_CONFIG.get(this.currentHandItem);
        if (!ingredient) return;
        
        // 🔥 水壶喷水处理
        if (this.currentHandItem === IngredientType.WATER) {
            if (food.sprayWater()) {
                // 切换到倒水状态图片
                this.switchToolState('pouring');
                const bonus = Math.round(food.waterBonusChance * 100);
                this.showMessage(`💧 喷水成功！第${food.totalWaterSprays}次喷水，好评几率+${bonus}%！`);
                console.log(`[CookingControllerV2] 💧 面饼${food.positionIndex}喷水成功，总次数=${food.totalWaterSprays}`);
                // 显示喷水特效
                this.showWaterEffect(food);
                // 延迟切换回手持状态或自动放下
                this.scheduleOnce(() => {
                    if (this.currentHandItem === IngredientType.WATER) {
                        // 🔥 检查是否所有面饼都喷过水了
                        const allSprayed = this.foodItems.every(f => f.hasWaterInCurrentState());
                        if (allSprayed && this.foodItems.length > 0) {
                            console.log('[CookingControllerV2] 💧 所有面饼都已喷水，自动放下水壶');
                            this.putDownTool(IngredientType.WATER);
                            this.showMessage('✅ 所有面饼都已喷水，水壶已放回！');
                        } else {
                            this.switchToolState('hold');
                        }
                    }
                }, 0.5);
            } else if (food.hasWaterInCurrentState()) {
                this.showMessage('⚠️ 当前阶段已经喷过水了！等状态变化后再喷！');
            } else {
                this.showMessage('⚠️ 无法对这个面饼喷水！');
            }
            return;
        }
        
        // 判断是否是调料
        const isCondiment = this.currentHandItem === IngredientType.CHILI || 
                          this.currentHandItem === IngredientType.SUGAR || 
                          this.currentHandItem === IngredientType.VINEGAR || 
                          this.currentHandItem === IngredientType.GRILLED_NOODLE_SAUCE;
        
        // 检查是否可以添加该食材
        if (!food.canAddIngredient(this.currentHandItem)) {
            if (this.currentHandItem === IngredientType.EGG) {
                if (food.eggCount >= food.maxEggCount) {
                    this.showMessage(`⚠️ 鸡蛋最多只能加${food.maxEggCount}个！`);
                } else if (!food.hasOil) {
                    this.showMessage(`⚠️ 请先拿油壶给它喷油！`);
                } else {
                    this.showMessage(`⚠️ 当前状态不能添加鸡蛋！`);
                }
            } else {
                if (food.state === DoughState.RAW || food.state === DoughState.EGG_ADDED) {
                    this.showMessage(`⚠️ 请先打鸡蛋并翻面后再添加其他食材！`);
                } else if ((food.state === DoughState.FLIPPED || food.state === DoughState.BURNT) && !food.hasSauce) {
                    // 翻面后必须先刷酱料
                    this.showMessage(`⚠️ 翻面后要先刷酱料！点击酱料瓶！`);
                } else {
                    this.showMessage(`⚠️ 当前状态不能添加${ingredient.name}！`);
                }
            }
            return;
        }

        // 如果是酱料，已经在刷酱模式中，不需要额外处理
        if (this.currentHandItem === IngredientType.GRILLED_NOODLE_SAUCE) {
            // 刷酱模式下点击面饼不做特殊处理，直接在面饼上刷即可
            return;
        }
        
        // 如果是其他调料，一次添加一份（最多3次）
        if (isCondiment) {
            // 计算当前已添加的数量
            const currentCount = food.addedIngredients.filter(ing => ing === this.currentHandItem).length;
            const maxCondimentCount = 3; // 每种调料最多加3次
            
            if (currentCount >= maxCondimentCount) {
                this.showMessage(`⚠️ ${ingredient.emoji}${ingredient.name}最多只能加${maxCondimentCount}次！`);
                return;
            }
            
            // 🔥 消耗调料库存
            if (!this.consumeIngredient(this.currentHandItem)) {
                this.showMessage(`⚠️ ${ingredient.emoji}${ingredient.name}库存不足！`);
                return;
            }
            
            this.addSingleIngredient(food, this.currentHandItem);
            this.showMessage(`✅ 添加了 1份 ${ingredient.emoji}${ingredient.name} (${currentCount + 1}/${maxCondimentCount})`);
            return;
        }

        // 实体食材：鸡蛋 - 点一下加一个
        if (this.currentHandItem === IngredientType.EGG) {
            if (food.eggCount >= food.maxEggCount) {
                this.showMessage(`⚠️ 鸡蛋最多只能加${food.maxEggCount}个！`);
                return;
            }
            
            // 🔥 确认消耗已预留的鸡蛋
            if (!this.confirmReservedIngredient(IngredientType.EGG, 1)) {
                this.showMessage(`⚠️ 🥚鸡蛋库存不足！`);
                return;
            }
            
            // 🥚 播放鸡蛋碎开动画
            const bgNode = food.node.parent;
            if (bgNode) {
                const worldPos = bgNode.getComponent(UITransform)?.convertToWorldSpaceAR(new Vec3(0, 0, 0));
                if (worldPos) {
                    // 🔥 先隐藏手持鸡蛋，避免与碎蛋动画重叠
                    this.hideEggImage();
                    this.playEggCrackAnimation(worldPos);
                }
            }
            
            // 只添加一个鸡蛋
            this.addSingleIngredient(food, this.currentHandItem);
            this.handItemCount--;
            
            this.showMessage(`✅ 添加了 1个 🥚鸡蛋 (面饼${food.eggCount}/${food.maxEggCount}个)，手上还剩${this.handItemCount}个`);
            
            if (this.handItemCount === 0) {
                this.currentHandItem = null;
                this.hideEggImage();
                if (this.mouseFollower) this.mouseFollower.active = false;
                this.stopMouseFollowing();
            } else {
                // 🔥 延迟显示手持鸡蛋，等碎蛋动画播放完
                this.scheduleOnce(() => {
                    this.updateHandDisplay();
                }, 0.45);  // 动画时长 0.15 + 0.15 + 0.15 = 0.45s
            }
            return;
        }

        // 其他实体食材（洋葱、香菜、香肠）- 点一下加一份
        // 计算当前已添加的数量
        const currentCount = food.addedIngredients.filter(ing => ing === this.currentHandItem).length;
        
        // 🔥 洋葱香菜最多加 2 份
        if ((this.currentHandItem === IngredientType.ONION || this.currentHandItem === IngredientType.CILANTRO) && currentCount >= 2) {
            this.showMessage(`⚠️ ${ingredient.emoji}${ingredient.name}最多只能加 2 份！`);
            return;
        }
        
        // 🔥 香肠特殊处理：库存已在放到烤盘时消耗，这里不需要再确认
        if (this.currentHandItem === IngredientType.SAUSAGE) {
            // 香肠库存已在 addSausageToGrill() 中消耗，直接添加即可
            console.log('[CookingControllerV2] 🌭 添加烤熟的香肠到面饼（库存已在烤制时消耗）');
        } else {
            // 🔥 确认消耗已预留的食材（洋葱、香菜等）
            if (!this.confirmReservedIngredient(this.currentHandItem, 1)) {
                this.showMessage(`⚠️ ${ingredient.emoji}${ingredient.name}库存不足！`);
                return;
            }
        }
        
        // 只添加1份
        this.addSingleIngredient(food, this.currentHandItem);
        this.handItemCount--;
        
        if (this.handItemCount === 0) {
            // 全部用完
            this.showMessage(`✅ 添加了 1份 ${ingredient.emoji}${ingredient.name} (面饼上共${currentCount + 1}份)`);
            this.currentHandItem = null;
            if (this.mouseFollower) this.mouseFollower.active = false;
            this.stopMouseFollowing();
        } else {
            // 还有剩余
            this.showMessage(`✅ 添加了 1份 ${ingredient.emoji}${ingredient.name} (面饼上共${currentCount + 1}份)，手上还剩 ${this.handItemCount}份`);
            this.updateHandDisplay();
        }
    }

    // 📦 可叠加食材配置已移至 ./Config/CookingConfig.ts (STACKABLE_INGREDIENT_CONFIG)

    /**
     * 添加单个食材的实现（UI和数据）
     * 注意：库存消耗在调用此方法之前已经处理
     * 🔥 支持图片叠加：洋葱、香菜、烤肠、醋、糖、辣椒
     */
    private addSingleIngredient(food: FoodItem, type: IngredientType) {
        const ingredient = INGREDIENT_CONFIG.get(type);
        if (!ingredient) return;

        console.log(`[CookingControllerV2] 添加 ${ingredient.name} 到面饼上`);

        // 🔥 检查是否是可叠加的图片食材
        const config = STACKABLE_INGREDIENT_CONFIG.get(type);
        
        if (config) {
            // 🔥 计算当前是第几次添加（0-indexed）
            const currentCount = food.addedIngredients.filter(ing => ing === type).length;
            const addIndex = Math.min(currentCount, config.maxCount - 1);
            
            // 🔥 根据面饼位置选择图片 (0=左, 1=中, 2=右)
            const posIndex = food.positionIndex;
            const imageUuid = config.images[addIndex]?.[posIndex];
            
            if (imageUuid) {
                this.addStackableIngredientImage(food, type, imageUuid, addIndex);
            } else {
                console.warn(`[CookingControllerV2] ⚠️ 未找到食材图片: ${type}, addIndex=${addIndex}, posIndex=${posIndex}`);
                this.addIngredientEmoji(food, type);
            }
        } else if (type === IngredientType.EGG) {
            // 🥚 鸡蛋使用面饼状态图片显示（food_dough_egg1/egg2），不需要 emoji
            console.log(`[CookingControllerV2] 🥚 鸡蛋使用面饼图片显示，不添加 emoji`);
        } else {
            // 🔥 使用 emoji 显示（老方式）
            this.addIngredientEmoji(food, type);
        }

        food.addIngredient(type);
        
        // 触发教程动作
        if (type === IngredientType.EGG) {
            this.triggerTutorialAction('egg_added');
        } else if (type === IngredientType.SAUSAGE) {
            this.triggerTutorialAction('sausage_added');
        } else if (type === IngredientType.ONION) {
            this.triggerTutorialAction('onion_added');
        } else if (type === IngredientType.CILANTRO) {
            this.triggerTutorialAction('cilantro_added');
        } else if (type === IngredientType.GRILLED_NOODLE_SAUCE) {
            food.addSauce();  // 标记已刷酱料
            this.triggerTutorialAction('sauce_applied');
        } else if (type === IngredientType.CHILI) {
            // 🔥 切换到挤压状态图片
            this.switchToolState('pouring');
            // 延迟切换回手持状态或自动放下
            this.scheduleOnce(() => {
                if (this.currentHandItem === IngredientType.CHILI) {
                    // 检查是否所有翻面的面饼都已添加辣椒
                    const allAdded = this.foodItems.filter(f => f.state === DoughState.FLIPPED)
                        .every(f => f.addedIngredients.indexOf(IngredientType.CHILI) !== -1);
                    const flippedCount = this.foodItems.filter(f => f.state === DoughState.FLIPPED).length;
                    if (allAdded && flippedCount > 0) {
                        console.log('[CookingControllerV2] 🌶️ 所有面饼都已添加辣椒，自动放下');
                        this.putDownTool(IngredientType.CHILI);
                        this.showMessage('✅ 所有面饼都已添加辣椒，辣椒已放回！');
                    } else {
                        this.switchToolState('hold');
                    }
                }
            }, 0.3);
            this.triggerTutorialAction('chili_added');
        } else if (type === IngredientType.SUGAR) {
            // 🔥 切换到挤压状态图片
            this.switchToolState('pouring');
            // 延迟切换回手持状态或自动放下
            this.scheduleOnce(() => {
                if (this.currentHandItem === IngredientType.SUGAR) {
                    // 检查是否所有翻面的面饼都已添加糖
                    const allAdded = this.foodItems.filter(f => f.state === DoughState.FLIPPED)
                        .every(f => f.addedIngredients.indexOf(IngredientType.SUGAR) !== -1);
                    const flippedCount = this.foodItems.filter(f => f.state === DoughState.FLIPPED).length;
                    if (allAdded && flippedCount > 0) {
                        console.log('[CookingControllerV2] 🍬 所有面饼都已添加糖，自动放下');
                        this.putDownTool(IngredientType.SUGAR);
                        this.showMessage('✅ 所有面饼都已添加糖，糖已放回！');
                    } else {
                        this.switchToolState('hold');
                    }
                }
            }, 0.3);
            this.triggerTutorialAction('sugar_added');
        } else if (type === IngredientType.VINEGAR) {
            // 🔥 切换到倒醋状态图片
            this.switchToolState('pouring');
            // 延迟切换回手持状态或自动放下
            this.scheduleOnce(() => {
                if (this.currentHandItem === IngredientType.VINEGAR) {
                    // 检查是否所有翻面的面饼都已添加醋
                    const allAdded = this.foodItems.filter(f => f.state === DoughState.FLIPPED)
                        .every(f => f.addedIngredients.indexOf(IngredientType.VINEGAR) !== -1);
                    const flippedCount = this.foodItems.filter(f => f.state === DoughState.FLIPPED).length;
                    if (allAdded && flippedCount > 0) {
                        console.log('[CookingControllerV2] 🍾 所有面饼都已添加醋，自动放下');
                        this.putDownTool(IngredientType.VINEGAR);
                        this.showMessage('✅ 所有面饼都已添加醋，醋已放回！');
                    } else {
                        this.switchToolState('hold');
                    }
                }
            }, 0.3);
            this.triggerTutorialAction('vinegar_added');
        }

        // 🔥 鸡蛋使用图片显示，不需要 emoji 文字
        // 隐藏面饼上的 Label（因为使用图片显示状态）
        if (type === IngredientType.EGG) {
            const doughLabel = food.node.getComponent(Label);
            if (doughLabel) {
                doughLabel.string = '';  // 清空 emoji
            }
        }
    }

    /**
     * 🔥 添加可叠加的食材图片（洋葱、香菜、烤肠、醋、糖、辣椒）
     * 后添加的食材图片会显示在先添加的上面
     * 对于同类食材多次添加（如洋葱第2次），会替换之前的图片
     * @param addIndex 添加次数索引（0=第1次，1=第2次）
     */
    private addStackableIngredientImage(food: FoodItem, type: IngredientType, imageUuid: string, addIndex: number = 0) {
        // 获取或创建食材叠加容器 - 使用唯一名称避免冲突
        const containerName = `IngredientContainer_${food.positionIndex}`;
        let ingredientContainer = food.node.parent?.getChildByName(containerName);
        if (!ingredientContainer) {
            ingredientContainer = new Node(containerName);
            const containerTransform = ingredientContainer.addComponent(UITransform);
            containerTransform.setContentSize(200, 200);
            containerTransform.setAnchorPoint(0.5, 0.5);
            ingredientContainer.setPosition(0, 0, 0);
            food.node.parent?.addChild(ingredientContainer);
            // 确保容器在面饼图片上方
            ingredientContainer.setSiblingIndex(999);
            console.log(`[CookingControllerV2] 🆕 创建食材容器: ${containerName}`);
        }
        console.log(`[CookingControllerV2] 📦 食材容器 ${containerName} 子节点数: ${ingredientContainer.children.length}`);

        // 🔥 使用固定节点名称，便于替换
        const nodeName = `Ingredient_${type}`;
        
        // 🔥 如果是多次添加的食材（如洋葱第2次），替换之前的图片
        let existingNode = ingredientContainer.getChildByName(nodeName);
        if (existingNode && addIndex > 0) {
            // 销毁旧节点
            existingNode.destroy();
            existingNode = null;
        }

        // 创建食材图片节点
        const ingredientNode = new Node(nodeName);
        const sprite = ingredientNode.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.TRIMMED;  // 保持原图比例
        
        const uiTransform = ingredientNode.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setAnchorPoint(0.5, 0.5);
        }

        // 添加到容器（自动在最上层）
        ingredientContainer.addChild(ingredientNode);
        
        // 设置位置（居中，稍微往上偏移）
        ingredientNode.setPosition(0, 5, 0);
        
        // 🔥 缩放比例：面饼显示尺寸(120) / 原图尺寸(601) ≈ 0.2
        // 食材图片和面饼图片原图尺寸一致，使用相同缩放比例
        let scale = this.doughSize / 601;
        
        // 🔥 烤肠特殊处理：使用铁板上相同的缩放和旋转
        if (type === IngredientType.SAUSAGE) {
            // 使用和铁板上烤肠一样的缩放（sausageSize / 60）
            const baseSize = 60;
            scale = this.sausageSize / baseSize;
            
            // 根据位置旋转：左边向右转，中间不变，右边向左转
            const posIndex = food.positionIndex;
            let rotation = 0;
            if (posIndex === 0) {
                rotation = -20;  // 左边向右转（负值是顺时针）
            } else if (posIndex === 2) {
                rotation = 20;  // 右边向左转（正值是逆时针）
            }
            ingredientNode.setRotationFromEuler(0, 0, rotation);
        }
        
        ingredientNode.setScale(0, 0, 0);  // 初始缩放为0，用于动画

        // 加载图片
        assetManager.loadAny({ uuid: imageUuid }, (err, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame && sprite && sprite.isValid) {
                sprite.spriteFrame = spriteFrame;
                console.log(`[CookingControllerV2] ✅ 食材图片加载成功: ${type}, addIndex=${addIndex}`);
                
                // 播放出现动画
                tween(ingredientNode)
                    .to(0.2, { scale: new Vec3(scale, scale, 1) }, { easing: 'backOut' })
                    .start();
            } else {
                console.warn(`[CookingControllerV2] ⚠️ 食材图片加载失败: ${type}`);
            }
        });
    }

    /**
     * 🔥 添加食材 emoji（老方式，用于没有图片的食材）
     */
    private addIngredientEmoji(food: FoodItem, type: IngredientType) {
        const ingredient = INGREDIENT_CONFIG.get(type);
        if (!ingredient) return;

        // 创建食材节点
        const ingredientNode = new Node(`Ingredient_${type}_${Date.now()}`);
        const ingredientLabel = ingredientNode.addComponent(Label);
        ingredientLabel.string = ingredient.emoji;
        ingredientLabel.fontSize = 40;
        ingredientLabel.color = new Color(255, 255, 255, 255);

        const uiTransform = ingredientNode.getComponent(UITransform);
        if (uiTransform) {
            uiTransform.setContentSize(60, 60);
        }

        // 根据已添加的食材数量调整位置
        const count = food.addedIngredients.length;
        const baseOffsetY = count * 35 - 30;
        const randomX = (Math.random() - 0.5) * 20;
        ingredientNode.setPosition(randomX, baseOffsetY, 0);

        food.node.addChild(ingredientNode);

        // 添加动画效果
        ingredientNode.setScale(0, 0, 0);
        tween(ingredientNode)
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    /**
     // 添加油壶UI(显示在面饼前面，可拖动来喷油）
     this.createOilDropUI(foodItem, doughBg);
    private createOilDropUI(food: FoodItem, doughBg: Node) {
        // 创建油壶容器
        const oilDropContainer = new Node(`OilDrop_${Date.now()}`);
        const oilLabel = oilDropContainer.addComponent(Label);
        oilLabel.string = '🫖';  // 油壶表情
        oilLabel.fontSize = 50;
        oilLabel.color = new Color(255, 200, 0, 255);  // 金黄色
            
        // 设置位置（在面饼左前方）
        oilDropContainer.setPosition(-60, 20, 0);
            
        // 添加拖动事件监听
        oilDropContainer.on(Node.EventType.TOUCH_START, (event: EventTouch) => this.onOilDropDragStart(event, food, oilDropContainer), this);
        oilDropContainer.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => this.onOilDropDragMove(event, oilDropContainer), this);
        oilDropContainer.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onOilDropDragEnd(event, food, oilDropContainer, doughBg), this);
        oilDropContainer.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => this.onOilDropDragEnd(event, food, oilDropContainer, doughBg), this);
            
        // 添加到面饼背景作为子节点
        doughBg.addChild(oilDropContainer);
            
        // 保存油壶节点的引用
        food.oilDropNode = oilDropContainer;
            
        console.log('[CookingControllerV2] 🫖 为面饼创建油壶UI');
    }
        
    /**
     * 油壶拖动开始
     */
    private onOilDropDragStart(event: EventTouch, food: FoodItem, oilDropNode: Node) {
        if (food.hasOil) {
            this.showMessage('⚠️ 已经喷过油了！');
            return;
        }
            
        console.log('[CookingControllerV2] 🫖 开始拖动油壶');
    }
        
    /**
     * 油壶拖动中
     */
    private onOilDropDragMove(event: EventTouch, oilDropNode: Node) {
        // 获取触摸位置
        const touch = event.getUILocation();
        const canvas = this.node.parent;
        if (!canvas) return;
            
        const uiTransform = canvas.getComponent(UITransform);
        if (!uiTransform) return;
            
        // 转换到本地坐标
        const canvasSize = uiTransform.contentSize;
        const localX = touch.x - canvasSize.width / 2;
        const localY = touch.y - canvasSize.height / 2;
            
        // 油壶跟随鼠标
        const parent = oilDropNode.parent;
        if (parent) {
            const parentTransform = parent.getComponent(UITransform);
            if (parentTransform) {
                const parentSize = parentTransform.contentSize;
                const parentX = parent.position.x;
                const parentY = parent.position.y;
                    
                // 计算相对于父节点的位置
                const relativeX = localX - parentX;
                const relativeY = localY - parentY;
                    
                oilDropNode.setPosition(relativeX, relativeY, 0);
            }
        }
    }
        
    /**
     * 油壶拖动结束
     */
    private onOilDropDragEnd(event: EventTouch, food: FoodItem, oilDropNode: Node, doughBg: Node) {
        if (food.hasOil) {
            return;  // 已喷过油，不再处理
        }
            
        // 检查油壶是否在面饼上（通过hitTest）
        const doughNode = food.node;
        if (!doughNode) return;
            
        const doughTransform = doughNode.getComponent(UITransform);
        const oilTransform = oilDropNode.getComponent(UITransform);
            
        if (doughTransform && oilTransform) {
            // 计算两个节点之间的距离
            const doughWorldPos = doughNode.getWorldPosition();
            const oilWorldPos = oilDropNode.getWorldPosition();
                
            const dx = doughWorldPos.x - oilWorldPos.x;
            const dy = doughWorldPos.y - oilWorldPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
                
            // 如果油壶在面饼附近（距离 < 100），则触发喷油
            if (distance < 100) {
                this.sprayOilOnFood(food, oilDropNode);
                return;
            }
        }
            
        // 如果未喷到面饼上，油壶回到原位
        this.resetOilDropPosition(oilDropNode);
    }
        
    /**
     * 喷油（面饼状态转换，隐藏油壶）
     */
    private sprayOilOnFood(food: FoodItem, oilDropNode: Node) {
        if (!food.sprayOil()) {
            this.showMessage('⚠️ 当前状态不能喷油！');
            return;
        }
            
        console.log('[CookingControllerV2] 🫖 已喷油，面饼进入RAW状态');
            
        // 隐藏油壶
        oilDropNode.active = false;
            
        // 显示提示消息
        this.showMessage('✅ 喷油完成！现在可以添加鸡蛋了！');
            
        // 更新面饼显示（添加油的视觉反馈）
        const doughLabel = food.node.getComponent(Label);
        if (doughLabel) {
            doughLabel.string = '🍞\n🫖';
        }
    }
        
    /**
     * 重置油壶位置
     */
    private resetOilDropPosition(oilDropNode: Node) {
        tween(oilDropNode)
            .to(0.3, { position: new Vec3(-60, 20, 0) }, { easing: 'backOut' })
            .start();
    }
    
    /**
     * 翻面（点击面饼时调用）- 带翻面动画和铲子动画
     */
    private flipFood(food: FoodItem) {
        if (food.flip()) {
            const bgNode = food.node.parent;
            if (bgNode) {
                const label = food.node.getComponent(Label);
                const originalPos = bgNode.position.clone();
                
                // 🍴 铲子翻铲动画
                this.playSpatulaFlipAnimation();
                
                // 🔥 翻面动画：模拟真实的翻面效果
                // 使用scaleX模拟水平翻转，更自然
                tween(bgNode)
                    // 第一阶段：轻微上升 + 开始翻转
                    .to(0.12, { 
                        position: new Vec3(originalPos.x, originalPos.y + 20, originalPos.z),
                        scale: new Vec3(0.6, 1.05, 1)  // X轴收缩模拟翻转中
                    }, { easing: 'sineOut' })
                    // 第二阶段：到达最高点，完全侧面
                    .to(0.08, { 
                        position: new Vec3(originalPos.x, originalPos.y + 30, originalPos.z),
                        scale: new Vec3(0.1, 1.1, 1)  // 几乎看不见（侧面）
                    }, { easing: 'sineInOut' })
                    .call(() => {
                        // 在动画中间更新显示内容（切换到翻面后的图片）
                        if (label) {
                            label.string = '';  // 清空文字，使用图片显示
                        }
                        // 强制更新视觉状态以加载翻面后的图片
                        food.updateVisualState();
                    })
                    // 第三阶段：翻转后展开
                    .to(0.08, { 
                        position: new Vec3(originalPos.x, originalPos.y + 20, originalPos.z),
                        scale: new Vec3(0.6, 1.05, 1)  // 开始展开
                    }, { easing: 'sineInOut' })
                    // 第四阶段：落下
                    .to(0.12, { 
                        position: new Vec3(originalPos.x, originalPos.y, originalPos.z),
                        scale: new Vec3(1, 1, 1)  // 恢复正常
                    }, { easing: 'sineIn' })
                    // 第五阶段：轻微弹跳
                    .to(0.06, { scale: new Vec3(1.05, 0.95, 1) })
                    .to(0.06, { scale: new Vec3(0.98, 1.02, 1) })
                    .to(0.04, { scale: new Vec3(1, 1, 1) })
                    .start();
            }
            // UI文字提示翻面成功
            this.showMessage('✅ 已翻面！请添加香肠🌭（必加）、酱料和其他食材，然后点击卷起');
            
            // 触发教程动作
            this.triggerTutorialAction('flipped');
            return true;
        }
        return false;
    }

    /**
     * 播放铲子翻铲动画
     */
    private playSpatulaFlipAnimation() {
        if (!this._spatulaSpriteNode || !this._spatulaSpriteNode.isValid) return;
        
        // 保存原始旋转角度
        const originalZ = this._spatulaSpriteNode.eulerAngles.z;
        
        // 🔥 设置动画播放中标志（带超时保护）
        this.setSpatulaAnimating(true, 1500);
        
        // 翻铲动画：快速向上翻转然后回来
        tween(this._spatulaSpriteNode)
            // 准备动作：稍微向下
            .to(0.05, { eulerAngles: new Vec3(0, 0, originalZ - 15) })
            // 快速向上翻
            .to(0.15, { eulerAngles: new Vec3(0, 0, originalZ + 60) }, { easing: 'sineOut' })
            // 稍作停顿后回落
            .delay(0.1)
            .to(0.2, { eulerAngles: new Vec3(0, 0, originalZ) }, { easing: 'sineIn' })
            // 确保最终角度正确
            .call(() => {
                if (this._spatulaSpriteNode && this._spatulaSpriteNode.isValid) {
                    this._spatulaSpriteNode.setRotationFromEuler(new Vec3(0, 0, originalZ));
                }
                // 🔥 动画结束，清除标志
                this.setSpatulaAnimating(false);
            })
            .start();
        
        console.log('[CookingControllerV2] 🍴 播放铲子翻铲动画，原始角度:', originalZ);
    }
    
    /**
     * 卷起（点击面饼时调用）- 播放卷起动画，卷好后需要刷酱才能切块
     */
    private rollFood(food: FoodItem) {
        // 教程模式下检查是否满足调料要求（酱料+至少2种调料）
        if (this.tutorialManager && this.tutorialManager.isInTutorial()) {
            if (!this.tutorialManager.canRoll()) {
                console.log('[CookingControllerV2] 教程模式：调料不足，无法卷起');
                return false;
            }
        }
        
        if (food.roll()) {
            const label = food.node.getComponent(Label);
            if (label) {
                label.string = '';  // 隐藏文字，显示图片
            }
            this.showMessage('✅ 正在卷起...');
            
            // 🔥 设置动画播放中标志（带超时保护）
            this.setSpatulaAnimating(true, 2000);
            
            // 🌯 播放卷起动画（3帧）
            this.playRollAnimation(food, () => {
                // 卷起完成
                food.hasRollSauce = false;  // 重置刷酱状态
                this.showMessage('✅ 卷好了！请刷酱料！');
                this.triggerTutorialAction('rolled');
                // 🔥 动画结束，清除标志
                this.setSpatulaAnimating(false);
            });
            return true;
        }
        return false;
    }
    
    /**
     * 🌯 播放卷起动画
     */
    private playRollAnimation(food: FoodItem, onComplete?: () => void) {
        const bgNode = food.node.parent;
        if (!bgNode) {
            onComplete?.();
            return;
        }
        
        const sprite = bgNode.getComponent(Sprite);
        if (!sprite) {
            onComplete?.();
            return;
        }
        
        // 🔥 确保 Sprite 组件启用（刷酱完成时可能被禁用了）
        sprite.enabled = true;
        
        // 🔥 隐藏所有子节点（酱料层、食材层、Label等）
        const childCount = bgNode.children.length;
        for (let i = 0; i < childCount; i++) {
            const child = bgNode.children[i];
            if (child && child.isValid) {
                child.active = false;
                console.log(`[playRollAnimation] 隐藏子节点: ${child.name}`);
            }
        }
        
        // 🔥 明确隐藏 _SauceLayer（以防万一）
        const sauceLayer = bgNode.getChildByName('_SauceLayer');
        if (sauceLayer) {
            sauceLayer.active = false;
            console.log('[playRollAnimation] 明确隐藏 _SauceLayer');
        }
        
        // 🔥 清空当前图片（避免旧图片遮挡）
        sprite.spriteFrame = null;
        
        // 🔥 切换为 TRIMMED 模式，保持原始图片比例（之前是 CUSTOM 会拉伸）
        sprite.sizeMode = Sprite.SizeMode.TRIMMED;
        
        // 🔥 重置sprite颜色为纯白色
        sprite.color = Color.WHITE.clone();
        console.log(`[playRollAnimation] 设置颜色为白色，sizeMode改为TRIMMED`);
        
        const posIdx = Math.min(Math.max(food.positionIndex, 0), 2);
        const isRightPos = posIdx === 2;  // 右侧位置需要翻转
        
        // 播放3帧动画
        let frameIndex = 1;
        const frameInterval = 0.25;  // 每帧间隔
        
        const playNextFrame = () => {
            if (frameIndex > 3) {
                onComplete?.();
                return;
            }
            
            const frameUUIDs = FoodItem.rollImageUUIDs[frameIndex];
            if (!frameUUIDs) {
                onComplete?.();
                return;
            }
            
            const uuid = frameUUIDs[posIdx];
            if (!uuid) {
                frameIndex++;
                this.scheduleOnce(playNextFrame, frameInterval);
                return;
            }
            
            assetManager.loadAny({ uuid: uuid }, (err, spriteFrame: SpriteFrame) => {
                if (!err && spriteFrame && sprite && sprite.isValid) {
                    sprite.spriteFrame = spriteFrame;
                    // 🔥 每帧都确保颜色是白色
                    sprite.color = Color.WHITE.clone();
                    // 🔥 每帧都确保 _SauceLayer 隐藏
                    const sl = bgNode.getChildByName('_SauceLayer');
                    if (sl) sl.active = false;
                    
                    // 🔥 计算缩放比例，使图片适应原来面饼大小
                    const originalWidth = spriteFrame.originalSize.width;
                    const originalHeight = spriteFrame.originalSize.height;
                    const targetSize = 160;  // 卷好面饼大小
                    const scaleRatio = targetSize / Math.max(originalWidth, originalHeight);
                    
                    // 右侧位置水平翻转
                    if (isRightPos) {
                        bgNode.setScale(-scaleRatio, scaleRatio, 1);
                    } else {
                        bgNode.setScale(scaleRatio, scaleRatio, 1);
                    }
                }
                frameIndex++;
                if (frameIndex <= 3) {
                    this.scheduleOnce(playNextFrame, frameInterval);
                } else {
                    onComplete?.();
                }
            });
        };
        
        playNextFrame();
    }
    
    /**
     * 🌯 卷好后刷酱（酱料覆盖层）
     */
    private applyRollSauce(food: FoodItem): boolean {
        if (food.state !== DoughState.ROLLED) {
            return false;
        }
        
        if (food.hasRollSauce) {
            this.showMessage('⚠️ 已经刷过酱了！');
            return false;
        }
        
        const bgNode = food.node.parent;
        if (!bgNode) return false;
        
        const posIdx = Math.min(Math.max(food.positionIndex, 0), 2);
        const isRightPos = posIdx === 2;
        
        // 创建或获取酱料覆盖层
        let sauceLayer = bgNode.getChildByName('_RollSauceLayer');
        if (!sauceLayer) {
            sauceLayer = new Node('_RollSauceLayer');
            sauceLayer.parent = bgNode;
            sauceLayer.addComponent(UITransform);
            const sauceSprite = sauceLayer.addComponent(Sprite);
            sauceSprite.sizeMode = Sprite.SizeMode.TRIMMED;
        }
        
        const sauceSprite = sauceLayer.getComponent(Sprite);
        const uuid = FoodItem.rollSauceImageUUIDs[posIdx];
        
        if (uuid && sauceSprite) {
            assetManager.loadAny({ uuid: uuid }, (err, spriteFrame: SpriteFrame) => {
                if (!err && spriteFrame && sauceSprite && sauceSprite.isValid) {
                    sauceSprite.spriteFrame = spriteFrame;
                    sauceLayer.active = true;
                    
                    // 🔥 获取 bgNode 当前的缩放比例
                    const bgScaleX = bgNode.scale.x;  // 可能是负数（翻转）
                    const bgScaleY = bgNode.scale.y;
                    
                    // 🔥 酱料图片需要和卷起图片一样大小
                    // bgNode 的 sprite 已经被缩放到 targetSize=160
                    // 酱料图片作为子节点，需要计算相对缩放
                    const sauceOriginalWidth = spriteFrame.originalSize.width;
                    const sauceOriginalHeight = spriteFrame.originalSize.height;
                    const targetSize = 160;  // 和卷起面饼一样的目标大小
                    
                    // 计算酱料图片需要的缩放比例（相对于 bgNode 的缩放）
                    const sauceScaleRatio = targetSize / Math.max(sauceOriginalWidth, sauceOriginalHeight);
                    // bgNode 已经缩放了 bgScaleX，酱料层需要的本地缩放 = sauceScaleRatio / |bgScaleX|
                    const localScale = sauceScaleRatio / Math.abs(bgScaleX);
                    
                    // 🔥 根据位置调整酱料层位置和旋转
                    if (posIdx === 0) {
                        // 左侧：Position (-7.157, 46.391), Rotation -2.905
                        sauceLayer.setPosition(-7.157, 46.391, 0);
                        sauceLayer.setRotationFromEuler(0, 0, -2.905);
                    } else if (isRightPos) {
                        // 右侧：使用左侧的镜像值（bgNode已翻转）
                        sauceLayer.setPosition(-7.157, 46.391, 0);
                        sauceLayer.setRotationFromEuler(0, 0, 2.905);
                    } else {
                        // 中间：Position (6, 19), Rotation 0
                        sauceLayer.setPosition(6, 19, 0);
                        sauceLayer.setRotationFromEuler(0, 0, 0);
                    }
                    
                    // 设置酱料层缩放
                    sauceLayer.setScale(localScale, localScale, 1);
                }
            });
        }
        
        food.hasRollSauce = true;
        this.showMessage('✅ 酱料刷好了！点击铲子切块！');
        console.log('[CookingControllerV2] 🌯 卷好的面饼刷酱完成');
        return true;
    }
    
    /**
     * 🔪 切一刀（新切割逻辑：每次点击切一刀，切3刀完成）
     */
    private cutFoodOnce(food: FoodItem) {
        const cutCount = food.cutOnce();
        if (cutCount === 0) {
            return false;
        }
        
        const label = food.node.getComponent(Label);
        if (label) {
            label.string = '';  // 隐藏文字
        }
        
        // 🔥 设置动画播放中标志
        this.setSpatulaAnimating(true, 600);
        
        // 🔪 播放铲子向下切的动画
        this.playSpatulaCutAnimation();
        
        // 🔪 延迟更新切割图片（等铲子动画播放一半时更新）
        this.scheduleOnce(() => {
            this.updateCutImage(food);
            
            // 显示切割进度消息
            if (food.isCutComplete()) {
                this.showMessage('✅ 切块完成！点击面饼打包！');
                this.triggerTutorialAction('cut');
            } else {
                this.showMessage(`🔪 切了第${cutCount}刀（共3刀）`);
            }
        }, 0.15);
        
        // 🔥 延迟清除标志
        this.scheduleOnce(() => {
            this.setSpatulaAnimating(false);
            // 🔪 检查是否所有面饼都切完，自动放下铲子
            this.checkAllCutComplete();
        }, 0.4);
        
        return true;
    }
    
    // 🔪 切割图片 UUID 映射表 - 已移至 CookingConfig.ts (CUT_IMAGE_UUIDS)
    
    /**
     * 🔪 更新切割图片（根据切割次数显示对应图片）
     */
    private updateCutImage(food: FoodItem) {
        const bgNode = food.node.parent;
        if (!bgNode) return;
        
        const sprite = bgNode.getComponent(Sprite);
        if (!sprite) return;
        
        const posIdx = food.positionIndex;
        const cutCount = food.cutCount;
        
        // 🔪 隐藏酱料层（第一次切割时隐藏）
        if (cutCount === 1) {
            const sauceLayer = bgNode.getChildByName('_RollSauceLayer');
            if (sauceLayer) {
                sauceLayer.active = false;
                console.log('[CookingControllerV2] 🔪 隐藏酱料层');
            }
        }
        
        // 右侧(posIdx=2)使用左侧(posIdx=0)图片并镜像
        const imgPosIdx = posIdx === 2 ? 0 : posIdx;
        
        // 获取 UUID
        if (imgPosIdx >= CUT_IMAGE_UUIDS.length || cutCount < 1 || cutCount > 3) {
            console.warn(`[CookingControllerV2] ⚠️ 无效的切割参数: pos${posIdx} cut${cutCount}`);
            return;
        }
        
        const uuid = CUT_IMAGE_UUIDS[imgPosIdx][cutCount - 1];
        
        assetManager.loadAny({ uuid: uuid }, (err, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame && sprite.isValid) {
                sprite.spriteFrame = spriteFrame;
                // 右侧需要镜像
                if (posIdx === 2) {
                    bgNode.setScale(-Math.abs(bgNode.scale.x), bgNode.scale.y, bgNode.scale.z);
                }
                console.log(`[CookingControllerV2] 🔪 切割图片已更新: pos${posIdx} cut${cutCount}`);
            } else {
                console.warn(`[CookingControllerV2] ⚠️ 切割图片加载失败: uuid=${uuid}`);
            }
        });
    }
    
    /**
     * 🔪 检查是否所有面饼都切完（用于自动放下铲子）
     */
    private checkAllCutComplete() {
        // 检查是否有正在切割中的面饼（ROLLED且已刷酱但未切完）
        const hasCuttingFood = this.foodItems.some(food => 
            food.state === DoughState.ROLLED && food.hasRollSauce && !food.isCutComplete()
        );
        
        // 检查是否有切完但未打包的面饼
        const hasCutFood = this.foodItems.some(food => 
            food.state === DoughState.CUT
        );
        
        // 如果没有正在切割的，也没有切完待打包的，放下铲子
        if (!hasCuttingFood && !hasCutFood) {
            console.log('[CookingControllerV2] 🔪 所有面饼都已处理，铲子自动回到架子');
            this.putDownSpatula();
        } else if (!hasCuttingFood && hasCutFood) {
            console.log('[CookingControllerV2] 🔪 切割完成，等待打包');
        }
    }
    
    /**
     * 🔪 点击切好的面饼，飞入打包盒
     */
    private packCutFood(food: FoodItem) {
        if (food.state !== DoughState.CUT) {
            return false;
        }
        
        // 🔪 先检查是否有空的打包盒
        let hasEmptyBox = false;
        for (let i = 0; i < 3; i++) {
            const packingBox = this.getPackingBox(i);
            if (packingBox && packingBox.active && this.packedFoods[i] === null) {
                hasEmptyBox = true;
                break;
            }
        }
        
        if (!hasEmptyBox) {
            // 🔪 检查是否有未摆放的打包盒
            let hasInactiveBox = false;
            for (let i = 0; i < 3; i++) {
                const packingBox = this.getPackingBox(i);
                if (packingBox && !packingBox.active) {
                    hasInactiveBox = true;
                    break;
                }
            }
            
            if (hasInactiveBox) {
                this.showMessage('⚠️ 请先点击摆放打包盒！');
            } else {
                this.showMessage('⚠️ 所有打包盒都已装满！请先交付顾客！');
            }
            return false;
        }
        
        // 🔥 设置动画播放中标志
        this.setSpatulaAnimating(true, 1000);
        
        this.showMessage('📦 正在打包...');
        
        // 直接调用打包
        this.autoPackFood(food);
        
        // 🔥 延迟清除标志并检查是否需要放下铲子
        this.scheduleOnce(() => {
            this.setSpatulaAnimating(false);
            this.checkAllCutComplete();
        }, 0.5);
        
        return true;
    }
    
    /**
     * 切块（兼容旧代码，直接切满）
     * @deprecated 使用 cutFoodOnce 替代
     */
    private cutFood(food: FoodItem) {
        if (food.cut()) {
            const label = food.node.getComponent(Label);
            if (label) {
                label.string = '';
            }
            
            this.setSpatulaAnimating(true, 1000);
            this.playCutAnimation(food);
            
            this.showMessage('✅ 切块完成！');
            this.triggerTutorialAction('cut');
            
            this.scheduleOnce(() => {
                this.setSpatulaAnimating(false);
            }, 0.3);
            
            this.scheduleOnce(() => {
                this.autoPackFood(food);
            }, 0.5);
            
            return true;
        }
        return false;
    }
    
    /**
     * 🔥 自动打包食物到空的打包盒
     * 优先选择与面饼位置对应的盒子
     */
    private autoPackFood(food: FoodItem) {
        // 📦 优先选择与面饼位置对应的盒子
        const posIdx = food.positionIndex;  // 0=左, 1=中, 2=右
        let targetBoxIndex = -1;
        
        // 先检查对应位置的盒子
        const preferredBox = this.getPackingBox(posIdx);
        if (preferredBox && preferredBox.active && this.packedFoods[posIdx] === null) {
            targetBoxIndex = posIdx;
        } else {
            // 对应盒子不可用，找其他空盒子
            for (let i = 0; i < 3; i++) {
                if (i === posIdx) continue;  // 跳过已检查的
                const packingBox = this.getPackingBox(i);
                if (packingBox && packingBox.active && this.packedFoods[i] === null) {
                    targetBoxIndex = i;
                    break;
                }
            }
        }
        
        if (targetBoxIndex === -1) {
            // 🔥 没有空打包盒，加入等待列表
            if (this.waitingToPackFoods.indexOf(food) === -1) {
                this.waitingToPackFoods.push(food);
            }
            this.showMessage('⚠️ 没有空的打包盒！请点击添加打包盒！');
            console.log(`[CookingControllerV2] 📦 食物加入等待打包列表，当前等待: ${this.waitingToPackFoods.length}`);
            return;
        }
        
        console.log(`[CookingControllerV2] 📦 面饼位置${posIdx} → 打包盒${targetBoxIndex}`);
        // 打包到找到的空盒子
        this.packFoodItem(food, targetBoxIndex);
    }
    
    /**
     * 🔥 检查并打包等待中的食物
     */
    private checkWaitingFoods() {
        if (this.waitingToPackFoods.length === 0) return;
        
        console.log(`[CookingControllerV2] 📦 检查等待打包的食物，数量: ${this.waitingToPackFoods.length}`);
        
        // 尝试打包等待列表中的食物
        while (this.waitingToPackFoods.length > 0) {
            // 找空的打包盒
            let emptyBoxIndex = -1;
            for (let i = 0; i < 3; i++) {
                const packingBox = this.getPackingBox(i);
                if (packingBox && packingBox.active && this.packedFoods[i] === null) {
                    emptyBoxIndex = i;
                    break;
                }
            }
            
            if (emptyBoxIndex === -1) {
                // 没有空打包盒了
                console.log(`[CookingControllerV2] 📦 没有更多空打包盒，剩余等待: ${this.waitingToPackFoods.length}`);
                break;
            }
            
            // 取出第一个等待的食物
            const food = this.waitingToPackFoods.shift();
            if (food && food.node && food.node.isValid) {
                console.log(`[CookingControllerV2] 📦 自动打包等待中的食物到盒子${emptyBoxIndex + 1}`);
                this.packFoodItem(food, emptyBoxIndex);
            }
        }
    }
    
    /**
     * 🔪 播放切块动画（显示切好的图片）
     */
    private playCutAnimation(food: FoodItem) {
        const bgNode = food.node.parent;
        if (!bgNode) return;
        
        const sprite = bgNode.getComponent(Sprite);
        if (!sprite) return;
        
        const posIdx = Math.min(Math.max(food.positionIndex, 0), 2);
        const isRightPos = posIdx === 2;
        
        // 🔥 隐藏酱料层
        const sauceLayer = bgNode.getChildByName('_RollSauceLayer');
        if (sauceLayer) {
            sauceLayer.active = false;
        }
        
        // 🔥 清空当前图片，准备加载切好的图片
        sprite.spriteFrame = null;
        sprite.sizeMode = Sprite.SizeMode.TRIMMED;
        sprite.color = Color.WHITE.clone();
        
        // 加载切好的图片
        const uuid = FoodItem.cutImageUUIDs[posIdx];
        if (uuid) {
            assetManager.loadAny({ uuid: uuid }, (err, spriteFrame: SpriteFrame) => {
                if (!err && spriteFrame && sprite && sprite.isValid) {
                    sprite.spriteFrame = spriteFrame;
                    sprite.color = Color.WHITE.clone();
                    
                    // 🔥 计算缩放比例，和卷起面饼一样大小
                    const originalWidth = spriteFrame.originalSize.width;
                    const originalHeight = spriteFrame.originalSize.height;
                    const targetSize = 160;  // 和卷起面饼一样的目标大小
                    const scaleRatio = targetSize / Math.max(originalWidth, originalHeight);
                    
                    // 右侧位置水平翻转
                    if (isRightPos) {
                        bgNode.setScale(-scaleRatio, scaleRatio, 1);
                    } else {
                        bgNode.setScale(scaleRatio, scaleRatio, 1);
                    }
                    
                    console.log(`[CookingControllerV2] 🔪 切块图片加载完成: 位置${posIdx}, 缩放${scaleRatio.toFixed(3)}`);
                }
            });
        }
    }
    
    /**
     * 完成（点击面饼时调用，准备打包）
     */
    private finishFood(food: FoodItem) {
        if (food.finish()) {
            const label = food.node.getComponent(Label);
            if (label) {
                label.string = '🍱\n✅可打包';
            }
            this.showMessage('✅ 烤冷面完成！拖到打包盒打包！');
            this.triggerTutorialAction('packed');
            return true;
        }
        return false;
    }

    /**
     * 更新手持物品显示
     */
    private updateHandDisplay() {
        if (!this.mouseFollower) {
            console.warn('[CookingControllerV2] ⚠️ mouseFollower未绑定！');
            return;
        }
        
        if (!this.currentHandItem) {
            this.mouseFollower.active = false;
            this.stopMouseFollowing();
            // 隐藏刷子、铲子、工具图片子节点
            this.hideBrushImage();
            this.hideSpatulaImage();
            this.hideToolImage();
            console.log('[CookingControllerV2] ❌ 隐藏mouseFollower（无手持物品）');
            return;
        }
        
        // 酱料使用图片显示刷子
        if (this.currentHandItem === IngredientType.GRILLED_NOODLE_SAUCE) {
            this.hideToolImage();
            this.showBrushImage();
            return;
        }
        
        // 铲子使用图片显示
        if (this.currentHandItem === IngredientType.SPATULA) {
            this.hideToolImage();
            this.hideEggImage();
            this.showSpatulaImage();
            return;
        }
        
        // 🥚 鸡蛋使用图片显示
        if (this.currentHandItem === IngredientType.EGG) {
            this.hideToolImage();
            this.hideSausageImage();
            this.showEggImage();
            return;
        }
        
        // 🌭 烤肠使用图片显示
        if (this.currentHandItem === IngredientType.SAUSAGE) {
            this.hideToolImage();
            this.hideEggImage();
            this.showSausageImage();
            return;
        }
        
        // 🧅 洋葱使用图片显示
        if (this.currentHandItem === IngredientType.ONION) {
            this.hideToolImage();
            this.hideEggImage();
            this.hideSausageImage();
            this.showOnionImage();
            return;
        }
        
        // 🌿 香菜使用图片显示
        if (this.currentHandItem === IngredientType.CILANTRO) {
            this.hideToolImage();
            this.hideEggImage();
            this.hideSausageImage();
            this.showCilantroImage();
            return;
        }
        
        // 其他物品使用 Label 显示 emoji
        // 先隐藏刷子、铲子、工具、鸡蛋、烤肠、洋葱、香菜图片子节点
        this.hideBrushImage();
        this.hideSpatulaImage();
        this.hideToolImage();
        this.hideEggImage();
        this.hideSausageImage();
        this.hideOnionImage();
        this.hideCilantroImage();
        
        let label = this.mouseFollower.getComponent(Label);
        if (!label) {
            console.log('[CookingControllerV2] 创建Label组件');
            label = this.mouseFollower.addComponent(Label);
            label.horizontalAlign = 1; // CENTER
            label.verticalAlign = 1; // CENTER
        }
        label.enabled = true;
        
        if (label) {
            const ingredient = INGREDIENT_CONFIG.get(this.currentHandItem);
            if (ingredient) {
                // 调料和工具不显示数量，实体食材显示数量
                // 注意：铲子和酱料刷子已在前面用图片显示，这里不会执行到
                const isCondiment = this.currentHandItem === IngredientType.CHILI || 
                                  this.currentHandItem === IngredientType.SUGAR || 
                                  this.currentHandItem === IngredientType.VINEGAR;
                const isTool = this.currentHandItem === IngredientType.OIL ||
                              this.currentHandItem === IngredientType.WATER;
                
                if (isCondiment || isTool) {
                    label.string = `${ingredient.emoji}`;
                    label.fontSize = 60;
                } else {
                    // 实体食材显示数量，并根据数量调整字体大小
                    label.string = `${ingredient.emoji} x${this.handItemCount}`;
                    label.fontSize = 50;  // 稍微小一点以容纳数量显示
                }
                
                // 确保颜色可见
                label.color = new Color(255, 255, 255, 255);
                
                console.log(`[CookingControllerV2] 🎨 显示: ${label.string}, fontSize=${label.fontSize}`);
            }
        }
        
        // 确保显示层级最高并激活
        this.mouseFollower.setSiblingIndex(9999);
        this.mouseFollower.active = true;
        
        console.log(`[CookingControllerV2] ✅ mouseFollower已激活，位置=(${this.mouseFollower.position.x.toFixed(0)}, ${this.mouseFollower.position.y.toFixed(0)})`);
    }
    
    // 刷子图片子节点
    private _brushSpriteNode: Node = null;
    
    /**
     * 显示刷子图片
     */
    private showBrushImage() {
        if (!this.mouseFollower) return;
        
        // 隐藏 Label
        const label = this.mouseFollower.getComponent(Label);
        if (label) label.enabled = false;
        
        // 创建或获取刷子图片子节点（因为 Sprite 和 Label 冲突）
        if (!this._brushSpriteNode || !this._brushSpriteNode.isValid) {
            this._brushSpriteNode = new Node('BrushSprite');
            this._brushSpriteNode.parent = this.mouseFollower;
            // 🔥 刷子往右20，往上25
            this._brushSpriteNode.setPosition(20, 25, 0);
            
            // 添加 UITransform - 从场景中的 Brush 节点读取尺寸
            const uiTransform = this._brushSpriteNode.addComponent(UITransform);
            uiTransform.setContentSize(120, 160);  // 与场景中 Brush 节点一致
            
            // 添加 Sprite
            const sprite = this._brushSpriteNode.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.type = Sprite.Type.SIMPLE;
            
            // 设置角度 - 与场景中 Brush 节点一致
            this._brushSpriteNode.setRotationFromEuler(new Vec3(0, 0, 6.305));
        }
        
        this._brushSpriteNode.active = true;
        
        // 加载刷子图片
        const brushUUID = '36ee3baa-05c0-4404-b2ea-b9a4a6de73ba@f9941';
        const sprite = this._brushSpriteNode.getComponent(Sprite);
        
        assetManager.loadAny({ uuid: brushUUID }, (err, spriteFrame: SpriteFrame) => {
            if (err) {
                console.error(`[CookingControllerV2] ❌ 加载刷子图片失败:`, err);
                return;
            }
            if (spriteFrame && sprite && sprite.isValid) {
                sprite.spriteFrame = spriteFrame;
                console.log(`[CookingControllerV2] ✅ 刷子图片加载成功`);
            }
        });
        
        // 确保显示层级最高并激活
        this.mouseFollower.setSiblingIndex(9999);
        this.mouseFollower.active = true;
        
        console.log(`[CookingControllerV2] 🖌️ 显示刷子图片`);
    }
    
    /**
     * 隐藏刷子图片，显示 Label
     */
    private hideBrushImage() {
        // 隐藏刷子图片子节点
        if (this._brushSpriteNode && this._brushSpriteNode.isValid) {
            this._brushSpriteNode.active = false;
        }
        // 显示 Label
        const label = this.mouseFollower?.getComponent(Label);
        if (label) label.enabled = true;
    }

    // 工具图片节点（油壶、水壶、醋瓶跟随鼠标）
    private _toolSpriteNode: Node = null;
    private _currentToolType: string = null;  // 当前工具类型
    private _currentToolState: string = null;  // 当前工具状态 (hold/pouring)
    
    // 📦 工具图片UUID配置已移至 ./Config/CookingConfig.ts
    
    // 鸡蛋图片节点（容器，可放多个鸡蛋）
    private _eggSpriteNode: Node = null;
    private _eggSpriteNodes: Node[] = [];  // 多个鸡蛋节点
    
    // 🌭 烤肠图片节点（手持状态，支持多个）
    private _sausageSpriteNode: Node = null;  // 容器节点
    private _sausageSpriteNodes: Node[] = [];  // 多个烤肠节点
    
    // 🧅 洋葱/香菜图片节点
    private _onionSpriteNode: Node = null;
    private _cilantroSpriteNode: Node = null;
    
    /**
     * 显示工具图片（油壶、水壶、醋瓶、辣椒、糖）
     * @param toolType 工具类型: 'oil' | 'water' | 'vinegar' | 'chili' | 'sugar'
     * @param state 状态: 'hold' | 'pouring'
     */
    private showToolImage(toolType: string, state: string) {
        if (!this.mouseFollower) return;
        
        // 隐藏 Label
        const label = this.mouseFollower.getComponent(Label);
        if (label) {
            label.string = '';
            label.enabled = false;
        }
        
        // 隐藏其他图片
        this.hideBrushImage();
        this.hideSpatulaImage();
        
        // 创建或获取工具图片节点
        if (!this._toolSpriteNode || !this._toolSpriteNode.isValid) {
            this._toolSpriteNode = new Node('ToolSprite');
            this._toolSpriteNode.parent = this.mouseFollower;
            // 🔥 图片往下偏移，让点击位置在图片上部，操作更舒适
            this._toolSpriteNode.setPosition(0, -40, 0);
            
            // 添加 UITransform - 🔥 设置锚点为顶部中心，使旋转围绕鼠标位置
            const uiTransform = this._toolSpriteNode.addComponent(UITransform);
            uiTransform.setAnchorPoint(0.5, 1);  // 锚点在顶部中心
            
            // 添加 Sprite - 使用 TRIMMED 模式保持原始比例
            const sprite = this._toolSpriteNode.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.TRIMMED;
            sprite.type = Sprite.Type.SIMPLE;
        }
        
        this._toolSpriteNode.active = true;
        this._currentToolType = toolType;
        this._currentToolState = state;
        
        // 🔥 根据工具类型设置偏移
        const isLongTool = (toolType === 'oil' || toolType === 'water' || toolType === 'vinegar');
        const holdYOffset = isLongTool ? 60 : 20;  // 油/水/醋+60，辣椒/糖+20
        
        if (state === 'pouring') {
            // 🔥 倾倒状态：旋转90度
            this._toolSpriteNode.setRotationFromEuler(new Vec3(0, 0, 90));
            this._toolSpriteNode.setPosition(0, holdYOffset, 0);
        } else {
            // 🔥 手持状态
            this._toolSpriteNode.setRotationFromEuler(new Vec3(0, 0, 0));
            this._toolSpriteNode.setPosition(0, holdYOffset, 0);
        }
        
        // 获取对应的 UUID
        const toolConfig = TOOL_IMAGE_UUIDS[toolType];
        if (!toolConfig) {
            console.warn(`[CookingControllerV2] ⚠️ 未知的工具类型: ${toolType}`);
            return;
        }
        
        const uuid = toolConfig[state as keyof typeof toolConfig];
        if (!uuid) {
            console.warn(`[CookingControllerV2] ⚠️ 未知的工具状态: ${state}`);
            return;
        }
        
        // 加载工具图片
        const sprite = this._toolSpriteNode.getComponent(Sprite);
        assetManager.loadAny({ uuid: uuid }, (err, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame && sprite && sprite.isValid) {
                sprite.spriteFrame = spriteFrame;
                // 🔥 设置缩放让图片大小合适（原图太大）
                const scale = 0.6;
                this._toolSpriteNode.setScale(scale, scale, 1);
                console.log(`[CookingControllerV2] ✅ 工具图片加载成功: ${toolType} - ${state}`);
            }
        });
        
        // 确保显示层级最高并激活
        this.mouseFollower.setSiblingIndex(9999);
        this.mouseFollower.active = true;
    }
    
    /**
     * 切换工具状态（从 hold 切换到 pouring 或反之）
     */
    private switchToolState(state: string) {
        if (this._currentToolType && this._toolSpriteNode && this._toolSpriteNode.isValid) {
            this.showToolImage(this._currentToolType, state);
        }
    }
    
    /**
     * 隐藏工具图片
     */
    private hideToolImage() {
        if (this._toolSpriteNode && this._toolSpriteNode.isValid) {
            this._toolSpriteNode.active = false;
        }
        this._currentToolType = null;
        this._currentToolState = null;
        
        // 显示 Label
        const label = this.mouseFollower?.getComponent(Label);
        if (label) label.enabled = true;
    }

    // 铲子图片子节点（跟随鼠标）
    private _spatulaSpriteNode: Node = null;
    private _spatulaSpriteFrame: SpriteFrame = null;  // 铲子图片（跟随鼠标用-翻面/卷起）
    private _spatulaCutSpriteFrame: SpriteFrame = null;  // 🔪 铲子切割图片（正视图）
    private _isSpatulaAnimating: boolean = false;  // 🔥 铲子动画播放中标志
    private _spatulaAnimationTimeout: number = 0;  // 🔥 动画超时保护计时器
    private _isCutMode: boolean = false;  // 🔪 是否处于切割模式
    
    /**
     * 🔥 安全地设置铲子动画标志（带超时保护）
     */
    private setSpatulaAnimating(isAnimating: boolean, timeoutMs: number = 2000) {
        this._isSpatulaAnimating = isAnimating;
        
        // 清除之前的超时计时器
        if (this._spatulaAnimationTimeout) {
            clearTimeout(this._spatulaAnimationTimeout);
            this._spatulaAnimationTimeout = 0;
        }
        
        // 如果设置为 true，添加超时保护
        if (isAnimating && timeoutMs > 0) {
            this._spatulaAnimationTimeout = setTimeout(() => {
                if (this._isSpatulaAnimating) {
                    console.warn('[CookingControllerV2] ⚠️ 铲子动画超时，自动重置标志');
                    this._isSpatulaAnimating = false;
                }
                this._spatulaAnimationTimeout = 0;
            }, timeoutMs) as unknown as number;
        }
    }

    /**
     * 显示铲子图片（跟随鼠标）
     */
    private showSpatulaImage() {
        if (!this.mouseFollower) return;
        
        // 隐藏 Label（清空文字并禁用）
        const label = this.mouseFollower.getComponent(Label);
        if (label) {
            label.string = '';
            label.enabled = false;
        }
        
        // 隐藏其他图片
        this.hideBrushImage();
        this.hideToolImage();
        this.hideEggImage();
        this.hideSausageImage();
        this.hideOnionImage();
        this.hideCilantroImage();
        
        // 创建或获取铲子图片节点
        if (!this._spatulaSpriteNode || !this._spatulaSpriteNode.isValid) {
            this._spatulaSpriteNode = new Node('SpatulaSprite');
            this._spatulaSpriteNode.parent = this.mouseFollower;
            // 🔥 铲子往右偏移70，往上偏移10
            this._spatulaSpriteNode.setPosition(70, 10, 0);
            
            // 添加 UITransform（使用图片原始尺寸）
            this._spatulaSpriteNode.addComponent(UITransform);
            
            // 添加 Sprite - 使用 TRIMMED 模式保持原始比例
            const sprite = this._spatulaSpriteNode.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.TRIMMED;  // 使用裁剪后的尺寸
            sprite.type = Sprite.Type.SIMPLE;
        }
        
        // 从场景中的 SpatulaImage 节点读取缩放和角度（不控制它的显示隐藏）
        if (this._spatulaImageOnRack && this._spatulaImageOnRack.isValid) {
            const scale = this._spatulaImageOnRack.scale.clone();
            const rotation = this._spatulaImageOnRack.eulerAngles.clone();
            this._spatulaSpriteNode.setScale(scale);
            this._spatulaSpriteNode.setRotationFromEuler(rotation);
        } else {
            // 默认缩放和角度
            this._spatulaSpriteNode.setScale(0.15, 0.15, 1);
            this._spatulaSpriteNode.setRotationFromEuler(new Vec3(0, 0, -30));
        }
        
        this._spatulaSpriteNode.active = true;
        
        // 加载铲子图片
        const sprite = this._spatulaSpriteNode.getComponent(Sprite);
        if (this._spatulaSpriteFrame && sprite) {
            sprite.spriteFrame = this._spatulaSpriteFrame;
        } else {
            // 使用 UUID 加载铲子图片
            const spatulaUUID = 'fa2d1177-c53a-4fcf-8ffc-8ed555a176f4@f9941';
            assetManager.loadAny({ uuid: spatulaUUID }, (err, spriteFrame: SpriteFrame) => {
                if (!err && spriteFrame) {
                    this._spatulaSpriteFrame = spriteFrame;
                    if (sprite && sprite.isValid) {
                        sprite.spriteFrame = spriteFrame;
                    }
                    console.log('[CookingControllerV2] 🍴 铲子图片加载成功');
                } else {
                    console.warn('[CookingControllerV2] ⚠️ 铲子图片加载失败');
                }
            });
        }
        
        // 确保显示层级最高并激活
        this.mouseFollower.setSiblingIndex(9999);
        this.mouseFollower.active = true;
        
        console.log('[CookingControllerV2] 🍴 显示铲子图片');
    }

    /**
     * 隐藏铲子图片
     */
    private hideSpatulaImage() {
        if (this._spatulaSpriteNode && this._spatulaSpriteNode.isValid) {
            this._spatulaSpriteNode.active = false;
        }
        this._isCutMode = false;  // 🔪 重置切割模式
    }
    
    /**
     * 🔪 显示切割铲子图片（正视图，用于切割操作）
     */
    private showCutSpatulaImage() {
        if (!this.mouseFollower) return;
        
        // 隐藏 Label
        const label = this.mouseFollower.getComponent(Label);
        if (label) {
            label.string = '';
            label.enabled = false;
        }
        
        // 隐藏其他图片
        this.hideBrushImage();
        this.hideToolImage();
        this.hideEggImage();
        this.hideSausageImage();
        this.hideOnionImage();
        this.hideCilantroImage();
        
        // 创建或获取铲子图片节点
        if (!this._spatulaSpriteNode || !this._spatulaSpriteNode.isValid) {
            this._spatulaSpriteNode = new Node('SpatulaSprite');
            this._spatulaSpriteNode.parent = this.mouseFollower;
            this._spatulaSpriteNode.setPosition(0, 0, 0);  // 🔪 切割铲子居中
            this._spatulaSpriteNode.addComponent(UITransform);
            const sprite = this._spatulaSpriteNode.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.TRIMMED;
            sprite.type = Sprite.Type.SIMPLE;
        }
        
        // 🔪 设置切割铲子的缩放和旋转
        this._spatulaSpriteNode.setScale(0.2, 0.2, 1);  // 1倍大小
        this._spatulaSpriteNode.setRotationFromEuler(new Vec3(0, 0, 90));  // 逆时针旋转90度
        this._spatulaSpriteNode.setPosition(0, 50, 0);  // 往上偏移
        
        this._spatulaSpriteNode.active = true;
        
        // 加载切割铲子图片
        const sprite = this._spatulaSpriteNode.getComponent(Sprite);
        if (this._spatulaCutSpriteFrame && sprite) {
            sprite.spriteFrame = this._spatulaCutSpriteFrame;
        } else {
            // 🔪 使用 UUID 加载 spatula_cut.png
            const spatulaCutUUID = 'deb1281c-97a1-4d7f-a9c9-d45afa2661a2@f9941';
            assetManager.loadAny({ uuid: spatulaCutUUID }, (err, spriteFrame: SpriteFrame) => {
                if (!err && spriteFrame) {
                    this._spatulaCutSpriteFrame = spriteFrame;
                    if (sprite && sprite.isValid) {
                        sprite.spriteFrame = spriteFrame;
                    }
                    console.log('[CookingControllerV2] 🔪 切割铲子图片加载成功');
                } else {
                    console.warn('[CookingControllerV2] ⚠️ 切割铲子图片加载失败，尝试使用普通铲子');
                    // 回退使用普通铲子
                    if (this._spatulaSpriteFrame && sprite && sprite.isValid) {
                        sprite.spriteFrame = this._spatulaSpriteFrame;
                    }
                }
            });
        }
        
        // 设置切割模式
        this._isCutMode = true;
        
        // 确保显示层级最高
        this.mouseFollower.setSiblingIndex(9999);
        this.mouseFollower.active = true;
        
        console.log('[CookingControllerV2] 🔪 显示切割铲子图片（切割模式）');
    }
    
    /**
     * 🔪 播放铲子向下切的动画
     */
    private playSpatulaCutAnimation() {
        if (!this._spatulaSpriteNode || !this._spatulaSpriteNode.isValid) return;
        
        // 记录原始位置
        const originalY = this._spatulaSpriteNode.position.y;
        const cutDistance = 60;  // 向下移动距离
        
        // 停止之前的动画
        tween(this._spatulaSpriteNode).stop();
        
        // 向下切一刀的动画
        tween(this._spatulaSpriteNode)
            .to(0.1, { position: new Vec3(0, originalY - cutDistance, 0) }, { easing: 'quadOut' })  // 快速向下
            .to(0.2, { position: new Vec3(0, originalY, 0) }, { easing: 'quadIn' })  // 缓慢回来
            .start();
        
        console.log('[CookingControllerV2] 🔪 播放切割动画');
    }
    
    /**
     * 🥚 显示鸡蛋图片（拿起状态，根据数量显示多个）
     */
    private showEggImage() {
        if (!this.mouseFollower) return;
        
        // 隐藏 Label
        const label = this.mouseFollower.getComponent(Label);
        if (label) {
            label.string = '';
            label.enabled = false;
        }
        
        // 隐藏其他图片
        this.hideBrushImage();
        this.hideSpatulaImage();
        this.hideToolImage();
        
        // 创建或获取鸡蛋容器节点
        if (!this._eggSpriteNode || !this._eggSpriteNode.isValid) {
            this._eggSpriteNode = new Node('EggContainer');
            this._eggSpriteNode.parent = this.mouseFollower;
            // 🔥 容器往下偏移，点击位置在图片上部
            this._eggSpriteNode.setPosition(0, -30, 0);
            this._eggSpriteNode.addComponent(UITransform);
            this._eggSpriteNodes = [];
        }
        
        this._eggSpriteNode.active = true;
        
        const uuid = EGG_IMAGE_UUIDS.whole;
        if (!uuid) {
            console.warn('[CookingControllerV2] ⚠️ 鸡蛋图片UUID未配置');
            if (label) {
                label.string = '🥚'.repeat(this.handItemCount);
                label.enabled = true;
            }
            return;
        }
        
        // 根据 handItemCount 显示对应数量的鸡蛋（最多3个）
        const eggCount = Math.min(this.handItemCount, 3);
        const eggScale = 0.12;  // 缩小尺寸
        
        // 鸡蛋位置偏移配置（分散堆叠效果）
        const positions = [
            { x: 0, y: -5 },          // 第1个：中间偏下
            { x: -25, y: 18 },        // 第2个：左上
            { x: 25, y: 18 }          // 第3个：右上
        ];
        
        // 清理多余的鸡蛋节点
        while (this._eggSpriteNodes.length > eggCount) {
            const node = this._eggSpriteNodes.pop();
            if (node && node.isValid) node.destroy();
        }
        
        // 创建或更新鸡蛋节点
        for (let i = 0; i < eggCount; i++) {
            let eggNode = this._eggSpriteNodes[i];
            
            if (!eggNode || !eggNode.isValid) {
                eggNode = new Node(`Egg_${i}`);
                eggNode.parent = this._eggSpriteNode;
                eggNode.addComponent(UITransform);
                
                const sprite = eggNode.addComponent(Sprite);
                sprite.sizeMode = Sprite.SizeMode.TRIMMED;
                sprite.type = Sprite.Type.SIMPLE;
                
                // 加载图片
                assetManager.loadAny({ uuid: uuid }, (err, spriteFrame: SpriteFrame) => {
                    if (!err && spriteFrame && sprite && sprite.isValid) {
                        sprite.spriteFrame = spriteFrame;
                    }
                });
                
                this._eggSpriteNodes[i] = eggNode;
            }
            
            // 设置位置和缩放
            eggNode.setPosition(positions[i].x, positions[i].y, 0);
            eggNode.setScale(eggScale, eggScale, 1);
            eggNode.active = true;
        }
        
        console.log(`[CookingControllerV2] 🥚 显示 ${eggCount} 个鸡蛋`);
        
        // 确保显示层级最高并激活
        this.mouseFollower.setSiblingIndex(9999);
        this.mouseFollower.active = true;
    }
    
    /**
     * 🥚 隐藏鸡蛋图片
     */
    private hideEggImage() {
        if (this._eggSpriteNode && this._eggSpriteNode.isValid) {
            this._eggSpriteNode.active = false;
        }
        // 隐藏所有鸡蛋子节点
        for (const node of this._eggSpriteNodes) {
            if (node && node.isValid) {
                node.active = false;
            }
        }
    }
    
    /**
     * 🌭 显示烤肠图片（手持状态，根据数量显示多个）
     */
    private showSausageImage() {
        if (!this.mouseFollower) return;
        
        // 隐藏 Label
        const label = this.mouseFollower.getComponent(Label);
        if (label) {
            label.string = '';
            label.enabled = false;
        }
        
        // 隐藏其他图片
        this.hideBrushImage();
        this.hideSpatulaImage();
        this.hideToolImage();
        this.hideEggImage();
        this.hideOnionImage();
        this.hideCilantroImage();
        
        // 创建或获取烤肠容器节点
        if (!this._sausageSpriteNode || !this._sausageSpriteNode.isValid) {
            this._sausageSpriteNode = new Node('SausageContainer');
            this._sausageSpriteNode.parent = this.mouseFollower;
            this._sausageSpriteNode.setPosition(0, -20, 0);  // 往下偏移
            this._sausageSpriteNode.addComponent(UITransform);
            this._sausageSpriteNodes = [];
        }
        
        this._sausageSpriteNode.active = true;
        
        // 根据 handItemCount 显示对应数量的烤肠（最多3个）
        const sausageCount = Math.min(this.handItemCount, 3);
        const sausageScale = 0.12;  // 缩小尺寸
        
        // 烤肠位置偏移配置（分散堆叠效果，略微倾斜）
        const positions = [
            { x: 0, y: 0, rotation: -15 },       // 第1个：中间
            { x: -30, y: 15, rotation: 10 },    // 第2个：左上
            { x: 30, y: 15, rotation: -30 }     // 第3个：右上
        ];
        
        // 清理多余的烤肠节点
        while (this._sausageSpriteNodes.length > sausageCount) {
            const node = this._sausageSpriteNodes.pop();
            if (node && node.isValid) node.destroy();
        }
        
        // 创建或更新烤肠节点
        for (let i = 0; i < sausageCount; i++) {
            let sausageNode = this._sausageSpriteNodes[i];
            
            if (!sausageNode || !sausageNode.isValid) {
                sausageNode = new Node(`Sausage_${i}`);
                sausageNode.parent = this._sausageSpriteNode;
                sausageNode.addComponent(UITransform);
                
                const sprite = sausageNode.addComponent(Sprite);
                sprite.sizeMode = Sprite.SizeMode.TRIMMED;
                sprite.type = Sprite.Type.SIMPLE;
                
                // 加载烤肠图片
                assetManager.loadAny({ uuid: SAUSAGE_IMAGE_UUID }, (err, spriteFrame: SpriteFrame) => {
                    if (!err && spriteFrame && sprite && sprite.isValid) {
                        sprite.spriteFrame = spriteFrame;
                        sprite.color = new Color(255, 255, 255, 255);
                    }
                });
                
                this._sausageSpriteNodes[i] = sausageNode;
            }
            
            // 设置位置、缩放和旋转
            sausageNode.setPosition(positions[i].x, positions[i].y, 0);
            sausageNode.setScale(sausageScale, sausageScale, 1);
            sausageNode.setRotationFromEuler(0, 0, positions[i].rotation);
            sausageNode.active = true;
        }
        
        console.log(`[CookingControllerV2] 🌭 显示 ${sausageCount} 个烤肠`);
        
        this.mouseFollower.setSiblingIndex(9999);
        this.mouseFollower.active = true;
    }
    
    /**
     * 🌭 隐藏烤肠图片
     */
    private hideSausageImage() {
        if (this._sausageSpriteNode && this._sausageSpriteNode.isValid) {
            this._sausageSpriteNode.active = false;
        }
        // 隐藏所有烤肠子节点
        for (const node of this._sausageSpriteNodes) {
            if (node && node.isValid) {
                node.active = false;
            }
        }
    }
    
    /**
     * 🧅 显示洋葱图片（根据数量选择图片）
     */
    private showOnionImage() {
        if (!this.mouseFollower) return;
        
        const label = this.mouseFollower.getComponent(Label);
        if (label) {
            label.string = '';
            label.enabled = false;
        }
        
        this.hideBrushImage();
        this.hideSpatulaImage();
        this.hideToolImage();
        this.hideEggImage();
        this.hideSausageImage();
        this.hideCilantroImage();
        
        if (!this._onionSpriteNode || !this._onionSpriteNode.isValid) {
            this._onionSpriteNode = new Node('OnionSprite');
            this._onionSpriteNode.parent = this.mouseFollower;
            this._onionSpriteNode.setPosition(0, -30, 0);
            this._onionSpriteNode.addComponent(UITransform);
            const sprite = this._onionSpriteNode.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.TRIMMED;
            sprite.type = Sprite.Type.SIMPLE;
        }
        
        this._onionSpriteNode.active = true;
        this._onionSpriteNode.setScale(0.3, 0.3, 1);  // 放大一倍
        
        // 根据数量选择图片
        const count = Math.min(this.handItemCount, 3);
        const uuid = ONION_HOLD_UUIDS[count - 1];
        
        const sprite = this._onionSpriteNode.getComponent(Sprite);
        assetManager.loadAny({ uuid: uuid }, (err, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame && sprite && sprite.isValid) {
                sprite.spriteFrame = spriteFrame;
                console.log(`[CookingControllerV2] 🧅 洋葱图片加载成功 (${count}份)`);
            }
        });
        
        this.mouseFollower.setSiblingIndex(9999);
        this.mouseFollower.active = true;
    }
    
    /**
     * 🧅 隐藏洋葱图片
     */
    private hideOnionImage() {
        if (this._onionSpriteNode && this._onionSpriteNode.isValid) {
            this._onionSpriteNode.active = false;
        }
    }
    
    /**
     * 🌿 显示香菜图片（根据数量选择图片）
     */
    private showCilantroImage() {
        if (!this.mouseFollower) return;
        
        const label = this.mouseFollower.getComponent(Label);
        if (label) {
            label.string = '';
            label.enabled = false;
        }
        
        this.hideBrushImage();
        this.hideSpatulaImage();
        this.hideToolImage();
        this.hideEggImage();
        this.hideSausageImage();
        this.hideOnionImage();
        
        if (!this._cilantroSpriteNode || !this._cilantroSpriteNode.isValid) {
            this._cilantroSpriteNode = new Node('CilantroSprite');
            this._cilantroSpriteNode.parent = this.mouseFollower;
            this._cilantroSpriteNode.setPosition(0, -30, 0);
            this._cilantroSpriteNode.addComponent(UITransform);
            const sprite = this._cilantroSpriteNode.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.TRIMMED;
            sprite.type = Sprite.Type.SIMPLE;
        }
        
        this._cilantroSpriteNode.active = true;
        this._cilantroSpriteNode.setScale(0.3, 0.3, 1);  // 放大一倍
        
        // 根据数量选择图片
        const count = Math.min(this.handItemCount, 3);
        const uuid = CILANTRO_HOLD_UUIDS[count - 1];
        
        const sprite = this._cilantroSpriteNode.getComponent(Sprite);
        assetManager.loadAny({ uuid: uuid }, (err, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame && sprite && sprite.isValid) {
                sprite.spriteFrame = spriteFrame;
                console.log(`[CookingControllerV2] 🌿 香菜图片加载成功 (${count}份)`);
            }
        });
        
        this.mouseFollower.setSiblingIndex(9999);
        this.mouseFollower.active = true;
    }
    
    /**
     * 🌿 隐藏香菜图片
     */
    private hideCilantroImage() {
        if (this._cilantroSpriteNode && this._cilantroSpriteNode.isValid) {
            this._cilantroSpriteNode.active = false;
        }
    }
    
    /**
     * 🥚 播放鸡蛋碎开动画（打到面饼上时）
     * @param worldPos 世界坐标位置
     */
    private playEggCrackAnimation(worldPos: Vec3) {
        const uuid = EGG_IMAGE_UUIDS.cracked;
        if (!uuid) {
            console.warn('[CookingControllerV2] ⚠️ 碎鸡蛋图片UUID未配置');
            return;
        }
        
        // 创建临时的碎鸡蛋节点
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;
        
        const crackNode = new Node('EggCrack');
        crackNode.parent = canvas;
        crackNode.setSiblingIndex(9999);
        
        // 转换为 Canvas 坐标
        const canvasTransform = canvas.getComponent(UITransform);
        const localPos = canvasTransform.convertToNodeSpaceAR(worldPos);
        crackNode.setPosition(localPos.x, localPos.y + 40, 0);  // 向上偏移40像素
        
        // 添加组件
        const uiTransform = crackNode.addComponent(UITransform);
        const sprite = crackNode.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.TRIMMED;
        sprite.type = Sprite.Type.SIMPLE;
        
        // 初始缩放
        crackNode.setScale(0, 0, 1);
        
        // 加载碎鸡蛋图片
        assetManager.loadAny({ uuid: uuid }, (err, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame && sprite && sprite.isValid) {
                sprite.spriteFrame = spriteFrame;
                
                // 播放动画：放大 -> 保持 -> 缩小消失
                tween(crackNode)
                    .to(0.15, { scale: new Vec3(0.15, 0.15, 1) }, { easing: 'backOut' })
                    .delay(0.15)
                    .to(0.15, { scale: new Vec3(0.08, 0.08, 1), position: new Vec3(localPos.x, localPos.y + 10, 0) })
                    .call(() => {
                        crackNode.destroy();
                    })
                    .start();
                    
                console.log('[CookingControllerV2] 🥚💥 鸡蛋碎开动画播放');
            } else {
                crackNode.destroy();
            }
        });
    }
    
    // 酱料按钮上方的刷子节点
    private _brushOnSauceNode: Node = null;
    
    /**
     * 显示刷子在酱料按钮上方（放回刷子时）
     */
    private showBrushOnSauceButton() {
        if (!this.sauceBtn) return;
        
        const btnNode = this.sauceBtn.node;
        
        // 创建或获取刷子节点
        if (!this._brushOnSauceNode || !this._brushOnSauceNode.isValid) {
            this._brushOnSauceNode = new Node('BrushOnSauce');
            this._brushOnSauceNode.parent = btnNode;
            this._brushOnSauceNode.setPosition(30, 80, 0);  // 在按钮上方偏右
            
            // 添加 UITransform - 与场景中 Brush 节点一致
            const uiTransform = this._brushOnSauceNode.addComponent(UITransform);
            uiTransform.setContentSize(120, 160);  // 与场景中 Brush 节点一致
            
            // 添加 Sprite
            const sprite = this._brushOnSauceNode.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.type = Sprite.Type.SIMPLE;
            
            // 设置角度 - 与场景中 Brush 节点一致
            this._brushOnSauceNode.setRotationFromEuler(new Vec3(0, 0, 6.305));
            
            // 加载刷子图片
            const brushUUID = '36ee3baa-05c0-4404-b2ea-b9a4a6de73ba@f9941';
            assetManager.loadAny({ uuid: brushUUID }, (err, spriteFrame: SpriteFrame) => {
                if (!err && spriteFrame && sprite && sprite.isValid) {
                    sprite.spriteFrame = spriteFrame;
                }
            });
        }
        
        this._brushOnSauceNode.active = true;
        console.log(`[CookingControllerV2] 🖌️ 刷子已放回酱料按钮上方`);
    }
    
    /**
     * 隐藏酱料按钮上方的刷子（拿起刷子时）
     */
    private hideBrushOnSauceButton() {
        if (this._brushOnSauceNode && this._brushOnSauceNode.isValid) {
            this._brushOnSauceNode.active = false;
        }
        console.log(`[CookingControllerV2] 🖌️ 刷子已从酱料按钮上拿起`);
    }
    
    /**
     * 为所有翻面且未刷酱的面饼启动刷酱模式（包括卷好后的二次刷酱）
     */
    private startBrushingModeForFlippedDoughs() {
        if (!this.brushSauceController) {
            this.showMessage(`🖌️ 拿起了刷子，在面饼上刷酱！`);
            return;
        }
        
        // 收集所有翻面且未刷酱的面饼节点（卷好的面饼单独处理，刷一下就完成）
        const flippedDoughNodes: Node[] = [];
        let hasRolledDough = false;
        
        for (const food of this.foodItems) {
            // 翻面状态且未刷酱
            if ((food.state === DoughState.FLIPPED || food.state === DoughState.BURNT) && !food.hasSauce) {
                const bgNode = food.node.parent;
                if (bgNode) {
                    flippedDoughNodes.push(bgNode);
                }
            }
            // 🌯 检查是否有卷好未刷酱的面饼（不加入列表，由点击处理）
            if (food.state === DoughState.ROLLED && !food.hasRollSauce) {
                hasRolledDough = true;
            }
        }
        
        if (flippedDoughNodes.length === 0 && !hasRolledDough) {
            this.showMessage(`🖌️ 拿起了刷子，没有需要刷酱的面饼！`);
            // 放下刷子
            this.currentHandItem = null;
            this.handItemCount = 0;
            this.updateHandDisplay();
            this.showBrushOnSauceButton();
            this.hideBrushImage();
            // 🔥 重置动画标志，防止卡住
            this.setSpatulaAnimating(false);
            // 🔥 恢复 UI 元素
            if (this.brushSauceController) {
                this.brushSauceController.enableAllUIElements();
            }
            // 🔥 移除原生鼠标监听
            this.removeNativeMouseListener();
            this.stopMouseFollowing();
            if (this.mouseFollower) {
                this.mouseFollower.active = false;
            }
            return;
        }
        
        // 🌯 如果只有卷好的面饼（没有翻面的），提示用户点击面饼刷酱
        if (flippedDoughNodes.length === 0 && hasRolledDough) {
            this.showMessage(`🖌️ 点击卷好的面饼刷酱！`);
            return;
        }
        
        // 隐藏 mouseFollower，使用 brushSauceController 的刷子
        this.hideBrushImage();
        if (this.mouseFollower) {
            this.mouseFollower.active = false;
        }
        this.stopMouseFollowing();
        
        // 🔥 传递当前鼠标位置给 brushSauceController，避免刷子出现在左下角
        this.brushSauceController.setInitialMousePosition(this._currentMousePos);
        
        // 启动刷酱模式
        this.brushSauceController.startBrushingMode(flippedDoughNodes, (completedDoughNode: Node) => {
            // 单个面饼刷酱完成回调
            const food = this.foodItems.find(f => f.node.parent === completedDoughNode);
            if (food) {
                // 🌯 区分翻面刷酱和卷好后刷酱
                if (food.state === DoughState.ROLLED) {
                    // 卷好后刷酱 - 使用酱料覆盖层
                    this.applyRollSauce(food);
                    this.showMessage(`✅ ${food.node.name} 卷好刷酱完成！可以切块了！`);
                } else {
                    // 翻面后刷酱 - 原有逻辑
                    food.addSauce();
                    food.addedIngredients.push(IngredientType.GRILLED_NOODLE_SAUCE);
                    this.showMessage(`✅ ${food.node.name} 刷酱完成！`);
                    this.triggerTutorialAction('sauce_applied');
                }
            }
            
            // 检查是否所有面饼都刷完了
            const pendingCount = this.brushSauceController.pendingCount;
            console.log(`[CookingControllerV2] 刷酱回调: pendingCount=${pendingCount}`);
            if (pendingCount === 0) {
                // 所有面饼刷完，放下刷子
                console.log(`[CookingControllerV2] 所有面饼刷完，放下刷子`);
                this.currentHandItem = null;
                this.handItemCount = 0;
                this.updateHandDisplay();
                this.showBrushOnSauceButton();
                this.showMessage(`🎉 所有面饼刷酱完成！`);
            }
        });
        
        this.showMessage(`🖌️ 在面饼上拖动刷子刷酱！（${flippedDoughNodes.length}个面饼）`);
    }

    /**
     * 更新上菜按钮状态（已废弃，现在使用serveButton）
     */
    private updateServeButton() {
        // 这个方法已经不再使用，保留是为了兼容性
        // 现在使用serveButton，由packFoodItem()控制
    }
    
    /**
     * 🔥 绑定测试按钮点击事件（按钮通过MCP在编辑器中创建）
     */
        private createTestButton() {
        // 查找Canvas节点
        const canvasNode = director.getScene()?.getChildByName('Canvas');
        if (!canvasNode) {
            console.warn('[CookingControllerV2] Canvas not found');
            return;
        }

        console.log(`[CookingControllerV2] Canvas children: ${canvasNode.children.map(c => c.name).join(', ')}`);

        // 查找MCP创建的测试按钮（支持 TestFoodButton-001 等）
        const testButtons = canvasNode.children.filter(child => child.name.startsWith('TestFoodButton'));
        if (testButtons.length === 0) {
            console.warn('[CookingControllerV2] TestFoodButton not found');
            return;
        }

        testButtons.forEach(testBtn => {
            testBtn.on(Node.EventType.TOUCH_END, () => {
                console.log(`[CookingControllerV2] ${testBtn.name} clicked`);
                this.generateTestFoodBox();
            }, this);

            const btnComp = testBtn.getComponent(Button);
            if (btnComp) {
                testBtn.on(Button.EventType.CLICK, () => {
                    console.log(`[CookingControllerV2] ${testBtn.name} click event`);
                    this.generateTestFoodBox();
                }, this);
            }
        });

        console.log(`[CookingControllerV2] Test buttons bound: ${testButtons.map(btn => btn.name).join(', ')}`);
    }

    private onGlobalTouchEnd(event: EventTouch) {
        if ((Date.now() - this._lastGrillTouchTime) < 80) return;
        if (this._handlingFoodClick) return;
        if (this.currentHandItem !== IngredientType.OIL) return;

        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) return;

        const touchPos = event.getUILocation();
        if (this.oilBtn?.node && this.isPointInNode(touchPos, this.oilBtn.node)) return;
        if (this.waterBtn?.node && this.isPointInNode(touchPos, this.waterBtn.node)) return;
        if (this.serveButton?.node && this.isPointInNode(touchPos, this.serveButton.node)) return;

        if (!this.grillArea || !this.isPointInNode(touchPos, this.grillArea)) return;
        this.sprayOilOnGrill(event);
    }

    private _debugPanelBound = false;

    private bindDebugEventPanelButtons() {
        if (this._debugPanelBound) return;
        const canvasNode = director.getScene()?.getChildByName('Canvas');
        if (!canvasNode) return;

        const debugPanel = canvasNode.getChildByName('DebugEventPanel');
        if (!debugPanel) return;

        const configs = [
            { name: 'LunchBtn', hour: 13, minute: 30, slot: 'lunch' },
            { name: 'AfternoonBtn', hour: 15, minute: 30, slot: 'afternoon' },
            { name: 'DinnerBtn', hour: 18, minute: 0, slot: 'dinner' },
            { name: 'NightBtn', hour: 20, minute: 30, slot: 'night' }
        ];

        let boundCount = 0;
        configs.forEach(config => {
            const btn = debugPanel.getChildByName(config.name);
            if (!btn) return;

            btn.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                if (event && typeof event.stopPropagation === 'function') {
                    event.stopPropagation();
                }
                this.debugJumpToEventTime(config.hour, config.minute, config.slot);
            }, this);

            const btnComp = btn.getComponent(Button);
            if (btnComp) {
                btn.on(Button.EventType.CLICK, () => {
                    this.debugJumpToEventTime(config.hour, config.minute, config.slot);
                }, this);
            }
            boundCount++;
        });

        const closeBtn = debugPanel.getChildByName('CloseBtn') || debugPanel.getChildByName('HideBtn');
        if (closeBtn) {
            closeBtn.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                if (event && typeof event.stopPropagation === 'function') {
                    event.stopPropagation();
                }
                debugPanel.active = false;
                console.log('[Debug] Debug panel hidden');
            }, this);

            const btnComp = closeBtn.getComponent(Button);
            if (btnComp) {
                closeBtn.on(Button.EventType.CLICK, () => {
                    debugPanel.active = false;
                    console.log('[Debug] Debug panel hidden');
                }, this);
            }
        }

        if (boundCount > 0) {
            this._debugPanelBound = true;
            console.log(`[Debug] Debug panel buttons bound: ${boundCount}`);
        }
    }/**
     * 🔥 生成测试用的做好的食材盒子
     */
    private generateTestFoodBox() {
        this.ensurePackingBoxesVisible();
        
        // 找到第一个空的打包盒
        let emptyBoxIndex = -1;
        for (let i = 0; i < 3; i++) {
            if (this.packedFoods[i] === null) {
                emptyBoxIndex = i;
                break;
            }
        }
        
        if (emptyBoxIndex === -1) {
            this.showMessage('⚠️ 所有打包盒都满了！');
            return;
        }
        
        // 创建一个模拟的完成食物
        const testNode = new Node('TestFood');
        const testFood = new FoodItem(testNode);
        testFood.state = DoughState.ROLLED;
        testFood.isFlipped = true;
        testFood.eggCount = 1;
        testFood.hasSauce = true;
        testFood.hasOil = true;
        testFood.addedIngredients = [IngredientType.SUGAR, IngredientType.CHILI];  // 甜辣口味
        
        // 放入打包盒
        this.packedFoods[emptyBoxIndex] = testFood;
        
        // 更新打包盒显示
        this.updatePackingBoxDisplay(emptyBoxIndex);
        
        // 显示消息
        this.showMessage(`🧪 测试食物已放入打包盒${emptyBoxIndex + 1}！(甜辣味)`);
        console.log(`[CookingControllerV2] 🧪 测试食物已生成到打包盒${emptyBoxIndex + 1}`);
    }

    /**
     * 📦 外部关卡食物打包（用于第二关等非烤冷面流程）
     */
    public packExternalFood(label: string, quality: number): boolean {
        this.ensurePackingBoxesVisible();

        let emptyBoxIndex = -1;
        for (let i = 0; i < 3; i++) {
            if (this.packedFoods[i] === null) {
                emptyBoxIndex = i;
                break;
            }
        }

        if (emptyBoxIndex === -1) {
            this.showMessage('⚠️ 所有打包盒都满了！');
            return false;
        }

        const foodNode = new Node('ExternalFood');
        const food = new FoodItem(foodNode);
        food.state = DoughState.DONE;
        food.isFlipped = true;
        food.eggCount = 1;
        food.hasSauce = true;
        food.addedIngredients = [];
        (food as any).customFlavorLabel = label;

        // 根据质量映射到 FoodItem 的 cookTime，供评价系统使用
        const maxCook = food.maxCookTime || 15;
        if (quality >= 90) {
            food.cookTime = maxCook * 0.7; // excellent
        } else if (quality >= 70) {
            food.cookTime = maxCook * 0.5; // good
        } else {
            food.cookTime = maxCook * 0.3; // ok
        }

        this.packedFoods[emptyBoxIndex] = food;
        this.updatePackingBoxDisplay(emptyBoxIndex);
        this.showMessage(`📦 ${label}已装入盒子${emptyBoxIndex + 1}！`);
        this.checkAndTriggerPayments();
        return true;
    }

    private ensurePackingBoxesVisible() {
        // 🔥 确保打包盒可见并重置到初始位置
        if (this.packingBox1 && !this.packingBox1.active) {
            if (this.packingBoxInitialPositions[0]) {
                this.packingBox1.setPosition(this.packingBoxInitialPositions[0]);
            }
            this.packingBox1.active = true;
        }
        if (this.packingBox2 && !this.packingBox2.active) {
            if (this.packingBoxInitialPositions[1]) {
                this.packingBox2.setPosition(this.packingBoxInitialPositions[1]);
            }
            this.packingBox2.active = true;
        }
        if (this.packingBox3 && !this.packingBox3.active) {
            if (this.packingBoxInitialPositions[2]) {
                this.packingBox3.setPosition(this.packingBoxInitialPositions[2]);
            }
            this.packingBox3.active = true;
        }
    }


    /**
     * 上菜
     */
    /**
     * 评估订单（为指定顾客）
     */
    private evaluateOrderForCustomer(food: FoodItem, customer: {node: Node, order: CustomerOrder | null, orderLabel: Node | null}) {
        if (!food || !customer.order) {
            console.error('[CookingControllerV2] ❌ evaluateOrderForCustomer: food或customer.order不存在');
            return;
        }

        console.log(`[CookingControllerV2] 📝 开始评估订单...`);

        // 检查订单（返回评价和金币）
        const result = this.checkOrder(food, customer.order);
        console.log(`[CookingControllerV2] ⭐ 评价: ${result.review}, 💰 金币: ${result.money}`);
        
        // 记录评价和金币
        let reviewText = '';
        if (result.review === 'super') {
            this.superGoodReviews++;
            reviewText = ReviewTexts.getRandomSuperGoodReview();
            console.log(`[CookingControllerV2] 🌟 超级好评！当前：${this.superGoodReviews}个`);
        } else if (result.review === 'good') {
            this.goodReviews++;
            reviewText = ReviewTexts.getRandomGoodReview();
            console.log(`[CookingControllerV2] 😊 好评！当前：${this.goodReviews}个`);
        } else {
            this.badReviews++;
            reviewText = ReviewTexts.getRandomBadReview();
            console.log(`[CookingControllerV2] 😢 差评！当前：${this.badReviews}个`);
            
            // 同步差评到库存系统
            this.addBadReviewToInventory();
        }
        
        // 添加到评价历史（最新的在最前面）
        const reviewScore = result.review === 'super' ? 5.0 : (result.review === 'good' ? 4.5 : 2.0);
        this.reviewHistory.unshift({
            type: result.review as 'super' | 'good' | 'bad',
            text: reviewText,
            score: reviewScore,
            timestamp: Date.now()
        });
        
        // 限制历史记录数量（最多保留50条）
        if (this.reviewHistory.length > 50) {
            this.reviewHistory = this.reviewHistory.slice(0, 50);
        }
        
        // 更新金币
        this.totalMoney += result.money;
        console.log(`[CookingControllerV2] 💰 获得金币: ${result.money}, 总金币: ${this.totalMoney}`);

        // 世界流程：记录顾客订单与剧情任务进度
        let completedStoryTaskIds: string[] = [];
        if (result.money > 0) {
            const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
            const mapId = world.progress.currentMapId;
            const npcId = (customer.order as any)?.customerId || customer.node?.name || 'guest';
            world.recordOrder(npcId, mapId);
            completedStoryTaskIds = WorldStoryTaskManager.recordCompletedOrder({
                mapId,
                flavorTags: this.extractFlavorTags(food)
            });
        }
        this.worldStoryTaskHud?.refresh(completedStoryTaskIds);
        
        // 更新UI
        this.updateMoneyDisplay();
        this.updateReviewDisplay();
        
        // 显示消息
        if (result.money > 0) {
            this.showMessage(`✅ 出餐完成！获得 ${result.money} 金币`);
        } else {
            this.showMessage(`😢 差评，没有获得金币...`);
        }
        
        // 清除该顾客的订单
        customer.order = null;
        
        // 销毁旧订单标签
        if (customer.orderLabel) {
            if (customer.orderLabel.isValid) {
                customer.orderLabel.destroy();
                console.log(`[CookingControllerV2] ✅ 已销毁旧订单标签`);
            }
            customer.orderLabel = null;
        }
        
        // 暂时隐藏顾客（订单完成后离开）
        customer.node.active = false;
        
        console.log(`[CookingControllerV2] 👋 顾客离开...`);
        
        // 延迟1秒后，新顾客到达并生成新订单
        setTimeout(() => {
            console.log(`[CookingControllerV2] 🔄 新顾客到达！`);
            
            // 再次确认清理旧订单标签（双重保险）
            if (customer.orderLabel) {
                if (customer.orderLabel.isValid) {
                    customer.orderLabel.destroy();
                    console.log(`[CookingControllerV2] 🧹 清理残留的订单标签`);
                }
                customer.orderLabel = null;
            }
            
            // 检查差评率，决定是否显示这个顾客
            const totalReviews = this.superGoodReviews + this.goodReviews + this.badReviews;
            let badReviewRatio = 0;
            if (totalReviews > 0) {
                badReviewRatio = this.badReviews / totalReviews;
            }
            
            // 根据差评率决定显示多少个顾客
            let activeCustomerCount = 3;
            if (badReviewRatio >= 0.5) {
                activeCustomerCount = 1;
            } else if (badReviewRatio >= 0.3) {
                activeCustomerCount = 2;
            }
            
            const customerIndex = this.customers.indexOf(customer);
            
            // 只有在前activeCustomerCount个顾客位置时，才显示并生成订单
            if (customerIndex < activeCustomerCount) {
                // 🔥 先隐藏CustomerIcon，防止闪烁
                const customerIconNode = customer.node.getChildByName('CustomerIcon');
                if (customerIconNode) {
                    customerIconNode.active = false;
                }
                
                // 显示顾客
                customer.node.active = true;
                
                // 为该顾客生成新订单
                const newOrder = this.generateNewOrder(customerIndex);
                customer.order = newOrder;
                
                console.log(`[CookingControllerV2] 📋 新订单生成完成，顾客索引: ${customerIndex}`);
                
                // 创建新订单UI（createOrderUI内部会再次检查并销毁旧标签）
                this.createOrderUI(customer, customerIndex);
                
                console.log(`[CookingControllerV2] ✅ 订单更新完成！`);
            } else {
                // 差评率太高，这个顾客位置不应该显示
                customer.node.active = false;
                customer.order = null;
                console.log(`[CookingControllerV2] ⚠️ 顾客${customerIndex + 1}因差评率过高而隐藏（差评率: ${(badReviewRatio * 100).toFixed(0)}%）`);
            }
        }, 1000);  // 1秒延迟，模拟新顾客到达
    }

    private extractFlavorTags(food: FoodItem): string[] {
        const tags = new Set<string>();
        const list = food?.addedIngredients || [];
        if (list.includes(IngredientType.SAUSAGE) || list.includes(IngredientType.PORK_BELLY) || list.includes(IngredientType.PORK)) {
            tags.add('meat');
        }
        if (list.includes(IngredientType.ONION) || list.includes(IngredientType.CILANTRO) || list.includes(IngredientType.LETTUCE)) {
            tags.add('fresh');
        }
        if (list.includes(IngredientType.CHILI) || list.includes(IngredientType.SUGAR) || list.includes(IngredientType.VINEGAR)) {
            tags.add('special');
        }
        if (list.includes(IngredientType.PORK_BELLY)) {
            tags.add('premium');
        }
        return Array.from(tags);
    }

    /**
     * 重新排列面饼
     */
    private rearrangeFoodItems() {
        this.foodItems.forEach((food, index) => {
            const bgNode = food.node.parent;
            if (bgNode) {
                const xOffset = index * 150;
                tween(bgNode)
                    .to(0.3, { position: new Vec3(xOffset - 150, -50, 0) })
                    .start();
            }
        });
    }

    /**
     * 检查订单（返回评价类型、金币和原因）
     * @returns {review: 'super' | 'good' | 'bad', money: number, reason?: string}
     */
    private checkOrder(food: FoodItem, order: CustomerOrder): {review: string, money: number, reason?: string} {
        if (!order) {
            console.log('[CookingControllerV2] ❌ checkOrder: 订单为空，返回0元');
            return {review: 'bad', money: 0};
        }

        const orderRecipe = this.getOrderRecipe(order);
        if (orderRecipe && !this.isGrilledNoodleRecipe(orderRecipe)) {
            const quality = food.getQuality();
            const review = quality >= 90 ? 'super' : (quality >= 60 ? 'good' : 'bad');
            const money = orderRecipe.price;
            const reason = review === 'bad' ? '品质不佳' : undefined;
            return { review, money, reason };
        }


        let isCorrect = true;  // 食材是否正确
        let isBurnt = food.state === DoughState.BURNT;  // 是否烤焦
        let baseMoney = 8;  // 🔥 基础8元（含1蛋1肠）
        
        console.log(`[CookingControllerV2] 💰 checkOrder开始: 基础金额=${baseMoney}元`);

        // 1. 检查鸡蛋数量
        const expectedEggCount = order.eggCount !== null ? order.eggCount : 1;  // 默认1个
        if (food.eggCount !== expectedEggCount) {
            isCorrect = false;
            this.showMessage(`😢 客人：鸡蛋数量不对！要${expectedEggCount}个，做了${food.eggCount}个！`);
        }

        // 🔥 计算金币：基础8元（含1蛋1肠）+ 额外鸡蛋每个+1元
        if (food.eggCount > 1) {
            baseMoney += (food.eggCount - 1);  // 每多一个蛋+1元
        }

        // 2. 检查口味（必须包含烤冷面酱）
        const hasSauce = food.addedIngredients.indexOf(IngredientType.GRILLED_NOODLE_SAUCE) !== -1;
        if (!hasSauce) {
            isCorrect = false;
            this.showMessage('😢 客人：没有烤冷面酱！');
        }

        // 3. 检查口味是否正确
        const hasChili = food.addedIngredients.indexOf(IngredientType.CHILI) !== -1;
        const hasSugar = food.addedIngredients.indexOf(IngredientType.SUGAR) !== -1;
        const hasVinegar = food.addedIngredients.indexOf(IngredientType.VINEGAR) !== -1;

        let flavorCorrect = false;
        switch (order.flavor) {
            case FlavorType.SWEET_SPICY:
                flavorCorrect = hasChili && hasSugar && !hasVinegar;
                break;
            case FlavorType.SOUR_SWEET_SPICY:
                flavorCorrect = hasChili && hasSugar && hasVinegar;
                break;
            case FlavorType.SOUR_SWEET:
                flavorCorrect = hasVinegar && hasSugar && !hasChili;
                break;
        }
        
        if (!flavorCorrect) {
            isCorrect = false;
            this.showMessage('😐 客人：口味不对！');
        }

        // 4. 检查默认食材（洋葱、香菜、香肠）是否都有至少1份
        // 注意：香肠是必放的，即使订单说"不要香肠"也要放（但订单生成时不会生成"不要香肠"）
        const hasOnion = food.addedIngredients.indexOf(IngredientType.ONION) !== -1;
        const hasCilantro = food.addedIngredients.indexOf(IngredientType.CILANTRO) !== -1;
        const hasSausage = food.addedIngredients.indexOf(IngredientType.SAUSAGE) !== -1;
        
        // 检查香肠（必放）
        if (!hasSausage) {
            isCorrect = false;
            this.showMessage('😐 客人：好像少了香肠...');
        }
        
        // 检查洋葱和香菜（如果订单没有说"不要"）
        const dontWantOnion = order.excludes.indexOf(IngredientType.ONION) !== -1;
        const dontWantCilantro = order.excludes.indexOf(IngredientType.CILANTRO) !== -1;
        
        // 如果订单要洋葱但食物里没有，或订单不要洋葱但食物里有，都算错
        if (!dontWantOnion && !hasOnion) {
            isCorrect = false;
            this.showMessage('😐 客人：好像少了洋葱...');
        }
        
        if (!dontWantCilantro && !hasCilantro) {
            isCorrect = false;
            this.showMessage('😐 客人：好像少了香菜...');
        }

        // 5. 检查香肠数量（如果订单指定了）
        const expectedSausageCount = order.sausageCount !== null ? order.sausageCount : 1;  // 默认1根
        const actualSausageCount = food.addedIngredients.filter(i => i === IngredientType.SAUSAGE).length;
        if (actualSausageCount !== expectedSausageCount) {
            isCorrect = false;
            this.showMessage(`😢 客人：香肠数量不对！要${expectedSausageCount}根，做了${actualSausageCount}根！`);
        }
        
        // 6. 检查额外食材（多加的）- 洋葱、香菜（香肠已单独检查）
        if (order.extraIngredients && order.extraIngredients.length > 0) {
            for (const ing of order.extraIngredients) {
                const count = food.addedIngredients.filter(i => i === ing).length;
                if (count < 2) {  // 默认1份 + 额外1份 = 至少2份
                    isCorrect = false;
                    this.showMessage('😐 客人：额外食材不够！');
                    break;
                }
            }
        }

        // 7. 检查额外调料（多加的）
        if (order.extraCondiments && order.extraCondiments.length > 0) {
            for (const ing of order.extraCondiments) {
                const count = food.addedIngredients.filter(i => i === ing).length;
                if (count < 2) {
                    isCorrect = false;
                    this.showMessage('😐 客人：调料不够味！');
                    break;
                }
            }
        }

        // 8. 检查是否有不要的食材
        for (let i = 0; i < order.excludes.length; i++) {
            if (food.addedIngredients.indexOf(order.excludes[i]) !== -1) {
                isCorrect = false;
                this.showMessage('😢 客人：我不要这个！');
                break;
            }
        }

        // 🔥 计算额外香肠金币：基础含1肠，额外每根+1元
        const sausageCount = food.addedIngredients.filter(i => i === IngredientType.SAUSAGE).length;
        if (sausageCount > 1) {
            baseMoney += (sausageCount - 1);  // 每多一根香肠+1元
        }

        // 决定评价和原因
        let review = 'bad';  // 默认差评
        let reason = '';  // 评价原因
        if (isCorrect) {
            // 食材都对
            if (!isBurnt) {
                review = 'super';  // 超级好评：食材对 + 没烤焦
                reason = '完美！';
                this.showMessage('🌟 客人：太完美了！超级好评！');
            } else {
                review = 'good';  // 好评：食材对 + 烤焦了
                reason = '有点焦';
                this.showMessage('😊 客人：味道不错，就是有点焦...');
            }
        } else {
            // 食材不对，差评 - 按检查优先级确定原因
            if (isBurnt) {
                reason = '烤焦了';
            } else if (!hasSauce) {
                reason = '没有烤冷面酱';
            } else if (!flavorCorrect) {
                reason = '口味不对';
            } else if (food.eggCount !== expectedEggCount) {
                reason = `鸡蛋数错(要${expectedEggCount}个，做了${food.eggCount}个)`;
            } else if (!hasSausage) {
                reason = '少香肠';
            } else if (actualSausageCount !== expectedSausageCount) {
                reason = `香肠数错(要${expectedSausageCount}根，做了${actualSausageCount}根)`;
            } else if (!dontWantOnion && !hasOnion) {
                reason = '少洋葱';
            } else if (!dontWantCilantro && !hasCilantro) {
                reason = '少香菜';
            } else if (order.extraIngredients && order.extraIngredients.length > 0) {
                // 检查哪个额外食材不够
                for (const ing of order.extraIngredients) {
                    const count = food.addedIngredients.filter(i => i === ing).length;
                    if (count < 2) {
                        const ingConfig = INGREDIENT_CONFIG.get(ing);
                        reason = `${ingConfig?.name || '额外食材'}不够`;
                        break;
                    }
                }
                if (!reason) reason = '额外食材不足';
            } else if (order.extraCondiments && order.extraCondiments.length > 0) {
                // 检查哪个额外调料不够
                for (const ing of order.extraCondiments) {
                    const count = food.addedIngredients.filter(i => i === ing).length;
                    if (count < 2) {
                        const ingConfig = INGREDIENT_CONFIG.get(ing);
                        reason = `${ingConfig?.name || '调料'}不足`;
                        break;
                    }
                }
                if (!reason) reason = '调料不足';
            } else {
                // 不要的食材
                for (let i = 0; i < order.excludes.length; i++) {
                    if (food.addedIngredients.indexOf(order.excludes[i]) !== -1) {
                        const ingConfig = INGREDIENT_CONFIG.get(order.excludes[i]);
                        reason = `不该有${ingConfig?.name || '这个食材'}`;
                        break;
                    }
                }
                if (!reason) reason = '食材不对';
            }
            this.showMessage('😢 客人：这个不对啊...');
        }
        
        // 🔥 无论评价好坏，都给予金币（按实际制作计算）
        // baseMoney = 基础8元（含1蛋1肠）+ 额外蛋每个+1元 + 额外肠每根+1元
        
        console.log(`[CookingControllerV2] 💰 checkOrder结束: 评价=${review}, 金额=${baseMoney}元, 原因=${reason || '无'}`);

        return {review, money: baseMoney, reason};
    }


    /**
     * 生成新订单（返回订单对象，订单难度根据顾客位置和游戏时间动态调整）
     * @param customerIndex 顾客索引（0, 1, 2），用于决定订单难度
     */
    private generateNewOrder(customerIndex: number = 0): CustomerOrder {
        this.orderIdCounter++;

        // 获取时间进度（0-1）
        const timeManager = TimeManager.instance;
        let timeProgress = 0;
        if (timeManager) {
            timeProgress = timeManager.getBusinessProgress();
        }
        
        // 记录订单创建时间
        const createTime = Date.now();

        const recipe = this.pickRecipeForCurrentLevel();
        if (recipe && !this.isGrilledNoodleRecipe(recipe)) {
            const order: CustomerOrder = {
                id: this.orderIdCounter,
                recipeId: recipe.id,
                recipeName: recipe.name,
                eggCount: null,
                sausageCount: null,
                extraIngredients: [],
                extraCondiments: [],
                flavor: FlavorType.SWEET_SPICY,
                excludes: [],
                reward: recipe.price,
                timeLimit: 60,
                patience: 100,
                createTime: createTime
            };

            console.log(`[CookingControllerV2] 新订单(菜品)：${recipe.name}`, order);
            return order;
        }

        const grilledRecipe = recipe && this.isGrilledNoodleRecipe(recipe)
            ? recipe
            : GameConfig.RECIPE_GRILLED_COLD_NOODLE;

        // 计算当前活跃顾客数量
        let activeCustomerCount = 0;
        this.customers.forEach(customer => {
            if (customer.node && customer.node.active) {
                activeCustomerCount++;
            }
        });
        // 如果还没有顾客显示，使用时间进度估算
        if (activeCustomerCount === 0) {
            if (timeProgress >= 0.75) activeCustomerCount = 3;
            else if (timeProgress >= 0.4) activeCustomerCount = 2;
            else activeCustomerCount = 1;
        }
        
        // 根据顾客位置和数量决定难度系数（0.0-1.0）
        // customerIndex越小，难度越低
        let difficultyMultiplier = 0;
        if (activeCustomerCount === 1) {
            // 1个顾客：随时间慢慢变复杂（0.0 -> 1.0）
            difficultyMultiplier = timeProgress;
        } else if (activeCustomerCount === 2) {
            // 2个顾客：顾客0简单(0.0-0.5)，顾客1复杂(0.5-1.0)
            difficultyMultiplier = customerIndex === 0 ? timeProgress * 0.5 : 0.5 + timeProgress * 0.5;
        } else {
            // 3个顾客：顾客0简单(0.0-0.33)，顾客1中等(0.33-0.66)，顾客2复杂(0.66-1.0)
            if (customerIndex === 0) {
                difficultyMultiplier = timeProgress * 0.33;
            } else if (customerIndex === 1) {
                difficultyMultiplier = 0.33 + timeProgress * 0.33;
            } else {
                difficultyMultiplier = 0.66 + timeProgress * 0.34;
            }
        }
        
        // 根据难度系数调整订单特殊要求的概率
        // 1. 鸡蛋数量（难度越高，特殊要求概率越高）
        const eggSpecifyProbability = 0.2 + difficultyMultiplier * 0.6;  // 20% -> 80%
        const eggCount: number | null = Math.random() < eggSpecifyProbability 
            ? (Math.random() < (0.2 + difficultyMultiplier * 0.5) ? 2 : 1)  // 难度越高，更可能是2个蛋
            : null;

        // 随机口味（必须）
        const flavors = [FlavorType.SWEET_SPICY, FlavorType.SOUR_SWEET_SPICY, FlavorType.SOUR_SWEET];
        const flavor = flavors[Math.floor(Math.random() * flavors.length)];

        // 2. 香肠数量（跟鸡蛋一样，显示数量）
        // 根据难度系数调整概率：10% -> 60%
        const sausageSpecifyProbability = 0.1 + difficultyMultiplier * 0.5;
        const sausageCount: number | null = Math.random() < sausageSpecifyProbability 
            ? (Math.random() < (0.2 + difficultyMultiplier * 0.5) ? 2 : 2)  // 目前只支持2根，后期可以扩展到3根
            : null;
        
        // 3. 额外食材（多放的）- 洋葱、香菜（香肠不在这里）
        // 根据难度系数调整概率：10% -> 60%
        const extraIngredientProbability = 0.1 + difficultyMultiplier * 0.5;
        const extraIngredients: IngredientType[] = [];
        if (Math.random() < extraIngredientProbability) {
            const possibleExtras = [IngredientType.ONION, IngredientType.CILANTRO];  // 移除了香肠
            extraIngredients.push(possibleExtras[Math.floor(Math.random() * possibleExtras.length)]);
            
            // 高难度（difficultyMultiplier >= 0.6）可能有多个额外食材
            if (difficultyMultiplier >= 0.6 && Math.random() < (0.2 + difficultyMultiplier * 0.3)) {
                const remaining = possibleExtras.filter(ing => !extraIngredients.some(e => e === ing));
                if (remaining.length > 0) {
                    extraIngredients.push(remaining[Math.floor(Math.random() * remaining.length)]);
                }
            }
        }

        // 4. 额外调料（多加的）- 辣椒、白糖、醋
        // 根据难度系数调整概率：5% -> 50%
        const extraCondimentProbability = 0.05 + difficultyMultiplier * 0.45;
        const extraCondiments: IngredientType[] = [];
        if (Math.random() < extraCondimentProbability) {
            // 根据口味决定可以多加什么
            const possibleCondiments: IngredientType[] = [];
            // 甜辣：可以多加辣、糖
            if (flavor === FlavorType.SWEET_SPICY) {
                possibleCondiments.push(IngredientType.CHILI, IngredientType.SUGAR);
            }
            // 酸甜辣：都可以多加
            else if (flavor === FlavorType.SOUR_SWEET_SPICY) {
                possibleCondiments.push(IngredientType.CHILI, IngredientType.SUGAR, IngredientType.VINEGAR);
            }
            // 酸甜：可以多加酸、糖
            else if (flavor === FlavorType.SOUR_SWEET) {
                possibleCondiments.push(IngredientType.VINEGAR, IngredientType.SUGAR);
            }
            
            if (possibleCondiments.length > 0) {
                extraCondiments.push(possibleCondiments[Math.floor(Math.random() * possibleCondiments.length)]);
                
                // 高难度（difficultyMultiplier >= 0.7）可能有多个额外调料
                if (difficultyMultiplier >= 0.7 && Math.random() < (0.3 + difficultyMultiplier * 0.2) && possibleCondiments.length > 1) {
                    const remaining = possibleCondiments.filter(ing => !extraCondiments.some(e => e === ing));
                    if (remaining.length > 0) {
                        extraCondiments.push(remaining[Math.floor(Math.random() * remaining.length)]);
                    }
                }
            }
        }

        // 5. 可以"不要"的食材（洋葱、香菜）
        // 注意：香肠是必放的，不允许"不要香肠"
        // 根据难度系数调整"不要"的概率和数量：5% -> 50%
        const excludeBaseProbability = 0.05 + difficultyMultiplier * 0.45;
        const excludableIngredients = [
            IngredientType.ONION,
            IngredientType.CILANTRO
        ];

        const excludes: IngredientType[] = [];
        if (Math.random() < excludeBaseProbability) {
            // 随机选择1-2个"不要"的食材
            // 高难度更可能有2个
            const excludeCount = (difficultyMultiplier >= 0.5 && Math.random() < difficultyMultiplier) ? 2 : 1;
            const shuffled = excludableIngredients.sort(() => Math.random() - 0.5);
            excludes.push(...shuffled.slice(0, excludeCount));
        }

        const order: CustomerOrder = {
            id: this.orderIdCounter,
            recipeId: grilledRecipe.id,
            recipeName: grilledRecipe.name,
            eggCount: eggCount,
            sausageCount: sausageCount,  // 添加香肠数量
            extraIngredients: extraIngredients,
            extraCondiments: extraCondiments,
            flavor: flavor,
            excludes: excludes,
            reward: 100,
            timeLimit: 60,
            patience: 100,
            createTime: createTime  // 添加创建时间用于情绪计算
        };

        console.log('[CookingControllerV2] 新订单：', order);
        return order;
    }


    /**
     * 显示消息 - 使用 MessageSystem 组件
     */
    private showMessage(msg: string, duration: number = 2) {
        if (this.messageSystem) {
            this.messageSystem.show(msg, duration);
        } else {
            console.log(`[CookingControllerV2] ${msg}`);
        }

        if (msg.includes('库存不足')) {
            this.tryShowOutOfStockPrompt(msg);
        }
    }
    
    /**
     * 创建老王 NPC 角色（包括头像和对话框）
     */
    private createLaowangNPC() {
        // 创建老王容器
        const laowangContainer = new Node('LaowangNPC');
        this.node.addChild(laowangContainer);
        laowangContainer.setPosition(280, 180, 0);  // 顾客区域位置
        laowangContainer.setSiblingIndex(9999);
        
        // 创建老王头像
        const avatarNode = new Node('Avatar');
        const avatarLabel = avatarNode.addComponent(Label);
        avatarLabel.string = '👨‍🍳';
        avatarLabel.fontSize = 60;
        avatarLabel.horizontalAlign = 1;  // CENTER
        avatarLabel.verticalAlign = 1;    // CENTER
        avatarNode.setPosition(0, -40, 0);
        laowangContainer.addChild(avatarNode);
        
        // 创建名字标签
        const nameNode = new Node('Name');
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = '王师傅';
        nameLabel.fontSize = 20;
        nameLabel.color = new Color(255, 255, 255, 255);  // 白字
        nameLabel.horizontalAlign = 1;
        nameLabel.enableOutline = true;
        nameLabel.outlineColor = new Color(0, 0, 0, 200);  // 黑边
        nameLabel.outlineWidth = 2;
        nameNode.setPosition(0, -80, 0);
        laowangContainer.addChild(nameNode);
        
        // 创建对话气泡
        this.npcDialogBox = new Node('DialogBubble');
        const bubbleTransform = this.npcDialogBox.addComponent(UITransform);
        bubbleTransform.setContentSize(280, 100);
        
        // 气泡背景 - 深色半透明
        const bubbleBg = this.npcDialogBox.addComponent(Sprite);
        bubbleBg.color = new Color(40, 40, 40, 220);
        
        // 对话文字 - 白字黑边
        const textNode = new Node('Text');
        this.npcDialogLabel = textNode.addComponent(Label);
        this.npcDialogLabel.fontSize = 20;
        this.npcDialogLabel.lineHeight = 26;
        this.npcDialogLabel.color = new Color(255, 255, 255, 255);  // 白字
        this.npcDialogLabel.overflow = 2;  // CLAMP
        this.npcDialogLabel.horizontalAlign = 0;  // LEFT
        this.npcDialogLabel.enableOutline = true;
        this.npcDialogLabel.outlineColor = new Color(0, 0, 0, 180);  // 黑边
        this.npcDialogLabel.outlineWidth = 1;
        // Label 会自动添加 UITransform，不需要手动添加
        const textTransform = textNode.getComponent(UITransform);
        if (textTransform) {
            textTransform.setContentSize(230, 80);
        }
        textNode.setPosition(0, 0, 0);
        this.npcDialogBox.addChild(textNode);
        
        // 对话框位置（头像上方）
        this.npcDialogBox.setPosition(0, 50, 0);
        laowangContainer.addChild(this.npcDialogBox);
        
        console.log('[CookingControllerV2] ✅ 创建老王 NPC 角色');
    }
    
    /**
     * 隐藏老王 NPC（教程完成后调用）
     */
    public hideLaowangNPC() {
        console.log('[CookingControllerV2] 👋 隐藏老王 NPC');
        
        // 销毁老王订单节点
        if (this.laowangOrderNode) {
            this.laowangOrderNode.destroy();
            this.laowangOrderNode = null;
        }
        
        // 隐藏老王容器
        const laowangContainer = this.node.getChildByName('LaowangNPC');
        if (laowangContainer) {
            laowangContainer.destroy();
            console.log('[CookingControllerV2] ✅ 老王已离开');
        }
        
        // 清空对话框引用
        this.npcDialogBox = null;
        this.npcDialogLabel = null;
    }
    
    /**
     * 启动顾客系统（教程完成后调用）
     * 使用和"继续游戏"相同的方式启动
     */
    public startCustomerSystem() {
        console.log('[CookingControllerV2] 🎉 教程完成，启动正式营业！');
        
        // 显示顾客区域
        if (this.customerArea) {
            this.customerArea.active = true;
        }
        
        // 使用 setBusinessState 统一启动，和"继续游戏"一样
        this.setBusinessState(true);
        
        // 显示欢迎消息
        this.showMessage('🎊 恭喜完成教程！正式开始营业！');
    }
    
    /**
     * 显示 NPC 对话（用于教程）
     * @param text 对话内容
     * @param duration 显示时间（秒），0表示一直显示
     */
    public showNPCDialogue(text: string, duration: number = -1) {
        // 如果没有老王角色节点，动态创建
        if (!this.npcDialogBox) {
            this.createLaowangNPC();
        }
        
        if (!this.npcDialogLabel) {
            this.npcDialogLabel = this.npcDialogBox.getComponentInChildren(Label);
        }
        
        // 显示对话（不需要前缀，已有头像和名字）
        this.npcDialogLabel.string = text;
        this.npcDialogBox.active = true;
        
        // 显示整个老王容器
        const laowangContainer = this.npcDialogBox.parent;
        if (laowangContainer) {
            laowangContainer.active = true;
        }
        
        // 动画效果
        this.npcDialogBox.setScale(0.8, 0.8, 1);
        tween(this.npcDialogBox)
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        
        // 根据字数计算显示时间：每个字 0.15 秒，最少 2 秒，最多 8 秒
        let displayTime = duration;
        if (duration < 0) {
            // 自动计算
            displayTime = Math.max(2, Math.min(8, text.length * 0.15 + 1));
        }
        
        // 如果有持续时间，自动隐藏（0 表示一直显示）
        if (displayTime > 0) {
            this.unschedule(this.hideNPCDialogueCallback);
            this.scheduleOnce(this.hideNPCDialogueCallback, displayTime);
        }
    }
    
    /**
     * 隐藏对话框的回调
     */
    private hideNPCDialogueCallback = () => {
        if (this.npcDialogBox) {
            tween(this.npcDialogBox)
                .to(0.2, { scale: new Vec3(0.8, 0.8, 1) })
                .call(() => { this.npcDialogBox.active = false; })
                .start();
        }
    };
    
    /**
     * 隐藏 NPC 对话
     */
    public hideNPCDialogue() {
        if (this.npcDialogBox && this.npcDialogBox.active) {
            tween(this.npcDialogBox)
                .to(0.2, { scale: new Vec3(0.8, 0.8, 1) })
                .call(() => { this.npcDialogBox.active = false; })
                .start();
        }
    }
    
    // 老王考核模式标记
    private isLaowangTestMode: boolean = false;
    
    /**
     * 开始老王考核模式
     */
    public startLaowangTest() {
        console.log('[CookingControllerV2] 🎓 开始老王考核模式！');
        this.isLaowangTestMode = true;
        
        // 开启营业状态（允许操作）
        this.setBusinessState(true);
    }
    
    /**
     * 检查老王考核结果
     */
    public checkLaowangTestResult(food: FoodItem): boolean {
        if (!this.isLaowangTestMode) return false;
        
        // 检查是否符合标准订单
        const hasEgg = food.eggCount >= 1;
        const hasSausage = food.addedIngredients.indexOf(IngredientType.SAUSAGE) !== -1;
        const hasOnion = food.addedIngredients.indexOf(IngredientType.ONION) !== -1;
        const hasCilantro = food.addedIngredients.indexOf(IngredientType.CILANTRO) !== -1;
        const hasSauce = food.addedIngredients.indexOf(IngredientType.GRILLED_NOODLE_SAUCE) !== -1;
        
        const isPerfect = hasEgg && hasSausage && hasOnion && hasCilantro && hasSauce;
        
        if (isPerfect) {
            this.showNPCDialogue('太棒了！完美的烤冷面！你已经出师了！现在可以正式接待顾客了！', 5);
            this.isLaowangTestMode = false;
            
            // 显示所有 UI，正式开始游戏
            this.scheduleOnce(() => {
                this.showMessage('🎉 恭喜通过王师傅的考核！');
            }, 2);
        } else {
            let missing = [];
            if (!hasEgg) missing.push('鸡蛋');
            if (!hasSausage) missing.push('香肠');
            if (!hasOnion) missing.push('洋葱');
            if (!hasCilantro) missing.push('香菜');
            if (!hasSauce) missing.push('酱料');
            
            this.showNPCDialogue(`还差一点！缺少：${missing.join('、')}`, 3);
        }
        
        return isPerfect;
    }

    /**
     * 鼠标点击事件（用于右键放下食材）
     */
    private onMouseDown(event: EventMouse) {
        // 检查是否是右键点击
        if (event.getButton() === EventMouse.BUTTON_RIGHT) {
            if (this.currentHandItem) {
                const ingredient = INGREDIENT_CONFIG.get(this.currentHandItem);
                
                // 如果是刷子，显示在酱料按钮上方并停止刷酱模式
                if (this.currentHandItem === IngredientType.GRILLED_NOODLE_SAUCE) {
                    this.hideBrushImage();
                    this.showBrushOnSauceButton();
                    // 🔥 重置铲子动画标志，防止卡住
                    this.setSpatulaAnimating(false);
                    // 🔥 停止刷酱模式并恢复 UI
                    if (this.brushSauceController) {
                        this.brushSauceController.reset();
                        this.brushSauceController.enableAllUIElements();
                    }
                    // 🔥 移除原生鼠标监听
                    this.removeNativeMouseListener();
                    this.currentHandItem = null;
                    this.handItemCount = 0;
                    this.stopMouseFollowing();
                    if (this.mouseFollower) {
                        this.mouseFollower.active = false;
                    }
                    this.showMessage(`✅ 刷子已放回！`);
                } else if (this.currentHandItem === IngredientType.SPATULA) {
                    // 如果是铲子，放回架子上
                    this.hideSpatulaImage();
                    this.showSpatulaOnRack();
                    this._spatulaOperationPhase = null;
                    // 🔥 重置铲子动画标志，防止卡住
                    this.setSpatulaAnimating(false);
                    // 🔥 恢复其他 UI 元素
                    if (this.brushSauceController) {
                        this.brushSauceController.enableAllUIElements();
                    }
                    this.currentHandItem = null;
                    this.handItemCount = 0;
                    this.stopMouseFollowing();
                    if (this.mouseFollower) {
                        this.mouseFollower.active = false;
                    }
                    this.showMessage(`✅ 铲子已放回！`);
                } else if (this.currentHandItem === IngredientType.OIL ||
                           this.currentHandItem === IngredientType.WATER ||
                           this.currentHandItem === IngredientType.VINEGAR ||
                           this.currentHandItem === IngredientType.CHILI ||
                           this.currentHandItem === IngredientType.SUGAR) {
                    // 🔥 工具类使用 putDownTool 正确处理
                    const toolType = this.currentHandItem;
                    this.putDownTool(toolType);
                    this.showMessage(`✅ ${ingredient?.emoji}${ingredient?.name}已放回！`);
                } else if (this.currentHandItem === IngredientType.SAUSAGE) {
                    // 🌭 烤肠放回铁板
                    this.putBackSausage();
                } else if (this.currentHandItem === IngredientType.EGG) {
                    // 🥚 鸡蛋放回 - 释放预留
                    this.releaseHandItemReservation(IngredientType.EGG);
                    this.hideEggImage();
                    this.currentHandItem = null;
                    this.handItemCount = 0;
                    this.stopMouseFollowing();
                    if (this.mouseFollower) this.mouseFollower.active = false;
                    this.showMessage(`✅ 鸡蛋已放回！`);
                } else if (this.currentHandItem === IngredientType.ONION) {
                    // 🧅 洋葱放回 - 释放预留
                    this.releaseHandItemReservation(IngredientType.ONION);
                    this.hideOnionImage();
                    this.currentHandItem = null;
                    this.handItemCount = 0;
                    this.stopMouseFollowing();
                    if (this.mouseFollower) this.mouseFollower.active = false;
                    this.showMessage(`✅ 洋葱已放回！`);
                } else if (this.currentHandItem === IngredientType.CILANTRO) {
                    // 🌿 香菜放回 - 释放预留
                    this.releaseHandItemReservation(IngredientType.CILANTRO);
                    this.hideCilantroImage();
                    this.currentHandItem = null;
                    this.handItemCount = 0;
                    this.stopMouseFollowing();
                    if (this.mouseFollower) this.mouseFollower.active = false;
                    this.showMessage(`✅ 香菜已放回！`);
                } else {
                    // 其他食材 - 释放预留
                    if (this.currentHandItem) {
                        this.releaseHandItemReservation(this.currentHandItem);
                    }
                    this.currentHandItem = null;
                    this.handItemCount = 0;
                    this.stopMouseFollowing();
                    if (this.mouseFollower) {
                        this.mouseFollower.active = false;
                    }
                    this.showMessage(`✋ 放下了 ${ingredient?.emoji}${ingredient?.name}`);
                }
            }
        }
    }

    // ========== 打包系统已重构为3个独立打包盒 ==========
    // 不再需要拖动重新排序功能

    // ==================== 香肠烤制系统 ====================
    
    /** 点击香肠按钮 */
    private onSausageButtonClick(event: EventTouch) {
        console.log('[CookingControllerV2] 🌭 香肠按钮被点击！');
        
        // NPC 对话式教程：不限制操作
        
        // 检查是否已开始营业（教程中跳过检查）
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) {
            this.showMessage('⚠️ 请先点击"开始营业"！');
            return;
        }
        
        this.addSausageToGrill();
    }
    
    /** 创建香肠容器 */
    private createSausageContainer() {
        if (!this.sausageContainer && this.foodContainer) {
            this.sausageContainer = new Node('SausageContainer');
            this.sausageContainer.setPosition(0, 0, 0);  // 容器在原点，位置由各个位置节点决定
            this.foodContainer.parent.addChild(this.sausageContainer);
            console.log(`[CookingControllerV2] ✅ 香肠容器已创建，共${this.sausagePositions.length}个位置`);
        }
    }
    
    // 烤肠图片UUID - 已移至 CookingConfig.ts (SAUSAGE_IMAGE_UUID)
    
    /** 获取烤肠位置和旋转（从位置节点读取） */
    private getSausageTransform(index: number): { x: number, y: number, rotation: number } {
        // 如果有对应的位置节点，使用节点的位置和旋转
        if (index < this.sausagePositions.length && this.sausagePositions[index]?.isValid) {
            const posNode = this.sausagePositions[index];
            const pos = posNode.position;
            const euler = posNode.eulerAngles;
            return { x: pos.x, y: pos.y, rotation: euler.z };
        }
        
        // 没有位置节点时使用默认位置（3列排列）
        const col = index % 3;
        const row = Math.floor(index / 3);
        return { 
            x: col * 50 - 50, 
            y: row * -50 + 25,
            rotation: 0 
        };
    }
    
    /** 添加香肠到烤盘（点击香肠按钮时调用） */
    private addSausageToGrill() {
        // 🔥 检查营业状态
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (!this.isBusinessOpen && !inTutorial) {
            this.showMessage('⚠️ 营业已结束，无法操作！');
            return;
        }
        
        // 最大烤肠数量 = 位置节点数量（如果没有配置则默认6个）
        const maxSausages = this.sausagePositions.length > 0 ? this.sausagePositions.length : 6;
        if (this.sausages.length >= maxSausages) {
            this.showMessage(`⚠️ 最多只能烤${maxSausages}个香肠！`);
            return;
        }
        
        // 🔥 放到烤盘时消耗库存（而不是添加到面饼时）
        if (!this.consumeIngredient(IngredientType.SAUSAGE)) {
            this.showMessage('⚠️ 🌭香肠库存不足！请先去购买！');
            return;
        }
        
        const sausageNode = new Node('Sausage_' + Date.now());
        const sprite = sausageNode.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.TRIMMED;  // 使用原始尺寸，等比缩放
        sprite.color = new Color(255, 180, 180, 255);  // 粉色（生的）
        
        // 通过scale控制大小，保持等比
        const baseSize = 60;  // 基准大小
        const scaleFactor = this.sausageSize / baseSize;
        sausageNode.setScale(scaleFactor, scaleFactor, 1);
        
        // 加载烤肠图片
        assetManager.loadAny({uuid: SAUSAGE_IMAGE_UUID}, (err: Error | null, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame && sprite.isValid) {
                sprite.spriteFrame = spriteFrame;
            }
        });
        
        // 获取位置和旋转（从位置节点读取）
        const index = this.sausages.length;
        const transform = this.getSausageTransform(index);
        sausageNode.setPosition(transform.x, transform.y, 0);
        sausageNode.setRotationFromEuler(0, 0, transform.rotation);
        
        this.sausageContainer.addChild(sausageNode);
        
        // 动画（从0放大到目标scale）
        const targetScale = scaleFactor;
        sausageNode.setScale(0, 0, 1);
        tween(sausageNode)
            .to(0.3, { scale: new Vec3(targetScale, targetScale, 1) }, { easing: 'backOut' })
            .start();
        
        const sausageData = {
            node: sausageNode,
            cookProgress: 0,
            isCooked: false,
            targetScale: targetScale  // 保存目标缩放值
        };
        this.sausages.push(sausageData);
        
        // 添加点击事件
        sausageNode.on(Node.EventType.TOUCH_END, () => this.onSausageNodeClick(sausageData), this);
        
        this.showMessage(`🌭 香肠放到烤盘了！(${this.sausages.length}/${this.MAX_SAUSAGES})`);
        this.triggerTutorialAction('sausage_placed');
    }
    
    /** 更新所有香肠的烤制状态（在update中调用） */
    private updateSausageCooking(dt: number) {
        for (const sausage of this.sausages) {
            if (sausage.isCooked || !sausage.node.isValid) continue;
            
            sausage.cookProgress += dt / this.SAUSAGE_COOK_TIME;
            
            // 每秒打印一次进度
            if (Math.floor(sausage.cookProgress * 10) % 10 === 0) {
                console.log(`[香肠烤制] 进度: ${(sausage.cookProgress * 100).toFixed(0)}%`);
            }
            
            // 颜色渐变：粉色 -> 正常色（烤熟）
            const sprite = sausage.node.getComponent(Sprite);
            if (sprite) {
                const p = Math.min(sausage.cookProgress, 1);
                // 从粉色(255,180,180)渐变到正常白色(255,255,255)
                const r = 255;
                const g = Math.floor(180 + p * 75);  // 180 -> 255
                const b = Math.floor(180 + p * 75);  // 180 -> 255
                sprite.color = new Color(r, g, b, 255);
            }
            
            // 抖动效果
            if (Math.random() > 0.8) {
                const shake = (Math.random() - 0.5) * 2;
                const pos = sausage.node.position;
                sausage.node.setPosition(pos.x + shake, pos.y, 0);
            }
            
            // 烤熟
            if (sausage.cookProgress >= 1 && !sausage.isCooked) {
                sausage.isCooked = true;
                
                // 烤熟动画（使用保存的目标缩放值）
                const ts = (sausage as any).targetScale || 1;
                tween(sausage.node)
                    .to(0.15, { scale: new Vec3(ts * 1.2, ts * 1.2, 1) })
                    .to(0.15, { scale: new Vec3(ts, ts, 1) })
                    .start();
                
                this.showMessage('✅ 香肠烤熟了！点击它拿起！');
                this.triggerTutorialAction('sausage_cooked');
            }
        }
    }
    
    /** 点击烤熟的香肠拿起（支持连续点击拿多个，最多3个） */
    private onSausageNodeClick(sausage: { node: Node, cookProgress: number, isCooked: boolean }) {
        // 🔥 如果手上有其他食材（非香肠），不允许点击烤肠
        if (this.currentHandItem !== null && this.currentHandItem !== IngredientType.SAUSAGE) {
            this.showMessage(`⚠️ 请先放下手中的${INGREDIENT_CONFIG.get(this.currentHandItem)?.name || '物品'}！`);
            return;
        }
        
        if (!sausage.isCooked) {
            this.showMessage('⏳ 香肠还没烤熟，请等待变成棕色！');
            return;
        }
        
        // 🔥 检查是否已经拿着香肠且达到上限
        const maxSausageCount = 3;
        if (this.currentHandItem === IngredientType.SAUSAGE && this.handItemCount >= maxSausageCount) {
            this.showMessage(`⚠️ 最多拿 ${maxSausageCount} 个烤肠！`);
            return;
        }
        
        // 移除香肠
        const index = this.sausages.indexOf(sausage);
        if (index !== -1) {
            this.sausages.splice(index, 1);
        }
        sausage.node.destroy();
        
        // 拿起香肠（支持连续增加）
        if (this.currentHandItem === IngredientType.SAUSAGE) {
            // 已经拿着香肠，增加数量
            this.handItemCount++;
            this.showMessage(`✋ 拿起了 ${this.handItemCount} 个烤熟的香肠！`);
        } else {
            // 第一次拿起
            this.currentHandItem = IngredientType.SAUSAGE;
            this.handItemCount = 1;
            this.showMessage('✋ 拿起了烤熟的香肠，点击面饼添加！右键放回。');
            this.triggerTutorialAction('sausage_picked');
        }
        
        // 🔥 启动鼠标跟随
        this._isMouseFollowing = true;
        if (this.mouseFollower) {
            this.mouseFollower.active = true;
            this.mouseFollower.setSiblingIndex(9999);
        }
        this.updateHandDisplay();
    }
    
    /**
     * 🌭 放回烤肠到铁板（右键或点击原位）- 一次放回所有烤肠到不同位置
     */
    private putBackSausage() {
        if (this.currentHandItem !== IngredientType.SAUSAGE) return;
        
        const countToReturn = this.handItemCount;
        if (countToReturn <= 0) return;
        
        // 检查烤盘是否有足够的空位
        const maxSausages = this.sausagePositions.length > 0 ? this.sausagePositions.length : 6;
        
        // 🔥 找到所有空位置（检查哪些位置已经被占用）
        const usedPositions = new Set<number>();
        for (const sausage of this.sausages) {
            if (sausage.node && sausage.node.isValid) {
                // 根据位置找到对应的索引
                const pos = sausage.node.position;
                for (let i = 0; i < this.sausagePositions.length; i++) {
                    const posNode = this.sausagePositions[i];
                    if (posNode && posNode.isValid) {
                        const nodePos = posNode.position;
                        if (Math.abs(pos.x - nodePos.x) < 5 && Math.abs(pos.y - nodePos.y) < 5) {
                            usedPositions.add(i);
                            break;
                        }
                    }
                }
            }
        }
        
        // 收集所有空位置
        const emptyIndices: number[] = [];
        for (let i = 0; i < maxSausages; i++) {
            if (!usedPositions.has(i)) {
                emptyIndices.push(i);
            }
        }
        
        if (emptyIndices.length === 0) {
            this.showMessage('⚠️ 没有空位放回烤肠！');
            return;
        }
        
        // 🔥 一次放回所有烤肠，每个放到不同位置
        const actualReturnCount = Math.min(countToReturn, emptyIndices.length);
        for (let i = 0; i < actualReturnCount; i++) {
            this.addCookedSausageAtPosition(emptyIndices[i]);
        }
        
        // 🔥 清除手持状态
        this.currentHandItem = null;
        this.handItemCount = 0;
        this.hideSausageImage();
        this._isMouseFollowing = false;
        if (this.mouseFollower) this.mouseFollower.active = false;
        
        if (actualReturnCount < countToReturn) {
            this.showMessage(`🌭 放回了${actualReturnCount}根烤肠，烤盘已满！`);
        } else {
            this.showMessage(`🌭 ${actualReturnCount}根烤肠已放回铁板！`);
        }
    }
    
    /**
     * 🌭 在指定位置添加已烤熟的烤肠
     */
    private addCookedSausageAtPosition(positionIndex: number) {
        if (!this.sausageContainer) {
            this.createSausageContainer();
        }
        
        const sausageNode = new Node('Sausage_Cooked');
        sausageNode.addComponent(UITransform);
        
        const sprite = sausageNode.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.TRIMMED;
        
        const baseSize = 60;
        const scaleFactor = this.sausageSize / baseSize;
        sausageNode.setScale(scaleFactor, scaleFactor, 1);
        
        // 加载烤肠图片 - 🔥 加载完成后设置为白色，让图片正常显示烤熟的颜色
        assetManager.loadAny({uuid: SAUSAGE_IMAGE_UUID}, (err: Error | null, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame && sprite.isValid) {
                sprite.spriteFrame = spriteFrame;
                sprite.color = new Color(255, 255, 255, 255);  // 🔥 白色让图片原色显示
            }
        });
        
        // 使用指定位置
        const transform = this.getSausageTransform(positionIndex);
        sausageNode.setPosition(transform.x, transform.y, 0);
        sausageNode.setRotationFromEuler(0, 0, transform.rotation);
        
        this.sausageContainer.addChild(sausageNode);
        
        const sausageData = {
            node: sausageNode,
            cookProgress: 1,  // 已烤熟
            isCooked: true,
            targetScale: scaleFactor
        };
        this.sausages.push(sausageData);
        
        // 添加点击事件
        sausageNode.on(Node.EventType.TOUCH_END, () => this.onSausageNodeClick(sausageData), this);
    }

    // ==================== 老王订单系统（教程用）====================
    
    private laowangOrderNode: Node = null;  // 老王订单节点
    
    /**
     * 创建老王的订单UI（显示在老王头上）
     */
    public createLaowangOrderUI(order: { text: string, requirements: any }) {
        console.log('[CookingControllerV2] 创建老王订单UI:', order.text);
        
        // 如果已有订单，先销毁
        if (this.laowangOrderNode) {
            this.laowangOrderNode.destroy();
        }
        
        // 获取老王容器（如果不存在则先创建）
        let laowangContainer = this.node.getChildByName('LaowangNPC');
        if (!laowangContainer) {
            console.log('[CookingControllerV2] 老王容器不存在，先创建');
            this.createLaowangNPC();
            laowangContainer = this.node.getChildByName('LaowangNPC');
            if (!laowangContainer) {
                console.error('[CookingControllerV2] ❌ 创建老王容器失败');
                return;
            }
        }
        
        // 创建订单节点（小票样式：白底黑字）
        this.laowangOrderNode = new Node('LaowangOrder');
        const orderTransform = this.laowangOrderNode.addComponent(UITransform);
        orderTransform.setContentSize(180, 80);
        
        // 订单背景（白色，模仿小票）
        const orderBg = this.laowangOrderNode.addComponent(Sprite);
        orderBg.color = new Color(255, 255, 255, 255);  // 纯白背景
        
        // 订单标题
        const titleNode = new Node('OrderTitle');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '📋 王师傅的订单';
        titleLabel.fontSize = 16;
        titleLabel.color = new Color(100, 100, 100, 255);  // 灰色标题
        titleLabel.horizontalAlign = 1;  // CENTER
        titleNode.setPosition(0, 22, 0);
        this.laowangOrderNode.addChild(titleNode);
        
        // 订单内容（黑字，加粗效果）
        const textNode = new Node('OrderText');
        const orderLabel = textNode.addComponent(Label);
        orderLabel.string = order.text;
        orderLabel.fontSize = 22;
        orderLabel.isBold = true;
        orderLabel.color = new Color(30, 30, 30, 255);  // 黑色文字
        orderLabel.overflow = 2;
        orderLabel.horizontalAlign = 1;  // CENTER
        const textTransform = textNode.getComponent(UITransform);
        if (textTransform) {
            textTransform.setContentSize(170, 40);
        }
        textNode.setPosition(0, -8, 0);
        this.laowangOrderNode.addChild(textNode);
        
        // 拖动提示
        const hintNode = new Node('DragHint');
        const hintLabel = hintNode.addComponent(Label);
        hintLabel.string = '👆 拖到打包盒交付';
        hintLabel.fontSize = 12;
        hintLabel.color = new Color(150, 150, 150, 255);  // 浅灰色提示
        hintLabel.horizontalAlign = 1;
        hintNode.setPosition(0, -30, 0);
        this.laowangOrderNode.addChild(hintNode);
        
        // 位置（老王头上）
        this.laowangOrderNode.setPosition(0, 140, 0);
        laowangContainer.addChild(this.laowangOrderNode);
        
        // 添加拖动功能
        this.laowangOrderNode.on(Node.EventType.TOUCH_START, this.onLaowangOrderDragStart, this);
        this.laowangOrderNode.on(Node.EventType.TOUCH_MOVE, this.onLaowangOrderDragMove, this);
        this.laowangOrderNode.on(Node.EventType.TOUCH_END, this.onLaowangOrderDragEnd, this);
        this.laowangOrderNode.on(Node.EventType.TOUCH_CANCEL, this.onLaowangOrderDragEnd, this);
        
        // 入场动画
        this.laowangOrderNode.setScale(0, 0, 1);
        tween(this.laowangOrderNode)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }
    
    private laowangOrderDragStartPos: Vec3 = new Vec3();
    
    private onLaowangOrderDragStart(event: EventTouch) {
        if (!this.laowangOrderNode) return;
        this.laowangOrderDragStartPos = this.laowangOrderNode.position.clone();
        console.log('[CookingControllerV2] 开始拖动老王订单');
    }
    
    private onLaowangOrderDragMove(event: EventTouch) {
        if (!this.laowangOrderNode) return;
        const delta = event.getDelta();
        const pos = this.laowangOrderNode.position;
        this.laowangOrderNode.setPosition(pos.x + delta.x, pos.y + delta.y, 0);
    }
    
    private onLaowangOrderDragEnd(event: EventTouch) {
        if (!this.laowangOrderNode) return;
        
        // 检查是否拖到了打包盒上
        const orderWorldPos = new Vec3();
        this.laowangOrderNode.getWorldPosition(orderWorldPos);
        
        console.log('[CookingControllerV2] 订单拖放结束，位置:', orderWorldPos.x.toFixed(0), orderWorldPos.y.toFixed(0));
        
        // 检查三个打包盒
        const packingBoxes = [this.packingBox1, this.packingBox2, this.packingBox3];
        let delivered = false;
        
        for (let i = 0; i < packingBoxes.length; i++) {
            const box = packingBoxes[i];
            if (!box) {
                console.log(`[CookingControllerV2] 打包盒${i + 1}: 不存在`);
                continue;
            }
            if (!box.active) {
                console.log(`[CookingControllerV2] 打包盒${i + 1}: 未激活`);
                continue;
            }
            
            // 检查这个打包盒里是否有食物
            const hasFood = this.packedFoods[i] !== null;
            console.log(`[CookingControllerV2] 打包盒${i + 1}: 激活, 有食物: ${hasFood}`);
            
            if (!hasFood) continue;
            
            const boxWorldPos = new Vec3();
            box.getWorldPosition(boxWorldPos);
            const distance = Vec3.distance(orderWorldPos, boxWorldPos);
            
            console.log(`[CookingControllerV2] 打包盒${i + 1} 距离: ${distance.toFixed(0)}`);
            
            if (distance < 150) {  // 增大检测范围
                // 交付成功
                console.log('[CookingControllerV2] ✅ 老王订单交付到打包盒', i + 1);
                delivered = true;
                
                // 清空打包盒
                this.packedFoods[i] = null;
                this.updatePackingBoxDisplay(i);
                
                // 销毁订单节点
                this.laowangOrderNode.destroy();
                this.laowangOrderNode = null;
                
                // 触发教程事件
                this.triggerTutorialAction('delivered');
                
                this.showMessage('✅ 交付成功！王师傅收到了！');
                break;
            }
        }
        
        // 如果没有交付成功，退回原位并提示
        if (!delivered) {
            console.log('[CookingControllerV2] 交付失败，退回原位');
            this.showMessage('⚠️ 请把订单拖到有食物的打包盒上！');
            tween(this.laowangOrderNode)
                .to(0.3, { position: this.laowangOrderDragStartPos })
                .start();
        }
    }

    onDestroy() {
        if (input?.off) {
            input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
            input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
            input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
            input.off(Input.EventType.TOUCH_END, this.onGlobalTouchEnd, this);
        }
        
        this.enableUiHitTest();
        
        // 🔥 移除 window 鼠标监听
        this.removeNativeMouseListener();
        this.worldStoryTaskHud?.dispose();
        this.worldStoryTaskHud = null;
    }
    
    // ==================== 库存系统 ====================
    
    /**
     * 初始化库存系统
     */
    private initInventorySystem() {
        console.log('[CookingControllerV2] 📦 开始初始化库存系统...');
        
        const inventory = InventoryManager.instance;
        if (!inventory) {
            console.warn('[CookingControllerV2] ⚠️ InventoryManager 未初始化，使用无限库存模式');
            this.useInventorySystem = false;
            return;
        }

        this.seedPreviewInventory(inventory);
        
        console.log(`[CookingControllerV2] 📦 InventoryManager 存在，currentLevel = ${inventory.currentLevel ? '有' : '无'}`);
        
        // 检查是否有当前关卡
        if (!inventory.currentLevel) {
            console.warn('[CookingControllerV2] ⚠️ 未初始化关卡，使用无限库存模式');
            this.useInventorySystem = false;
            return;
        }
        
        this.useInventorySystem = true;
        console.log('[CookingControllerV2] ✅ 库存系统已启用！');

        if (this.tutorialManager?.isInTutorial()) {
            this.ensureTutorialInventory();
        }
        
        // 打印当前库存
        const allInventory = inventory.getAllInventory();
        if (allInventory) {
            allInventory.forEach((item, type) => {
                if (item.rawCount > 0 || item.processedCount > 0) {
                    console.log(`[CookingControllerV2] 📦 ${type}: 原始=${item.rawCount}, 已加工=${item.processedCount}`);
                }
            });
        }
        
        // 🔥 在食材按钮上创建余量标签
        this.createIngredientCountLabels();
        
        // 创建库存显示面板
        this.createInventoryPanel();
        
        // 更新库存显示
        this.updateInventoryDisplay();
        
        // 🔥 更新按钮上的余量显示
        this.updateIngredientCountLabels();
    }

    private seedPreviewInventory(inventory: InventoryManager): void {
        if (!(PREVIEW || EDITOR || DEV)) return;
        const sceneName = this.node.scene?.name ?? '';
        if (sceneName !== 'Level1CookingScene') return;

        if (!inventory.currentLevel || inventory.currentLevel.levelId !== 1) {
            inventory.initLevel(1);
        }
        inventory.debugSeedLevel1InventoryIfEmpty();
    }
    
    /**
     * 🔥 在食材按钮上创建余量标签（包括调料）
     */
    private createIngredientCountLabels() {
        const buttonConfigs: { btn: Node | null, type: IngredientType }[] = [
            { btn: this.doughBtn, type: IngredientType.DOUGH },
            { btn: this.eggBtn, type: IngredientType.EGG },
            { btn: this.onionBtn, type: IngredientType.ONION },
            { btn: this.cilantroBtn, type: IngredientType.CILANTRO },
            { btn: this.sausageBtn, type: IngredientType.SAUSAGE },
            // 🔥 添加调料按钮的余量显示
            { btn: this.sauceBtn?.node ?? null, type: IngredientType.GRILLED_NOODLE_SAUCE },
            { btn: this.chiliBtn?.node ?? null, type: IngredientType.CHILI },
            { btn: this.sugarBtn?.node ?? null, type: IngredientType.SUGAR },
            { btn: this.vinegarBtn?.node ?? null, type: IngredientType.VINEGAR },
            { btn: this.oilBtn?.node ?? null, type: IngredientType.OIL }
        ];
        
        for (const config of buttonConfigs) {
            if (!config.btn) continue;
            
            // 检查是否已存在标签
            let countLabelNode = config.btn.getChildByName('CountLabel');
            if (!countLabelNode) {
                countLabelNode = new Node('CountLabel');
                const label = countLabelNode.addComponent(Label);
                label.string = '0';
                label.fontSize = 18;
                label.color = new Color(255, 255, 255, 255);
                label.isBold = true;
                label.enableOutline = true;
                label.outlineColor = new Color(0, 0, 0, 200);
                label.outlineWidth = 2;
                
                // 设置位置（右下角）
                const btnTransform = config.btn.getComponent(UITransform);
                const btnWidth = btnTransform?.contentSize.width ?? 80;
                const btnHeight = btnTransform?.contentSize.height ?? 80;
                countLabelNode.setPosition(btnWidth / 2 - 15, -btnHeight / 2 + 15, 0);
                
                config.btn.addChild(countLabelNode);
                this.ingredientCountLabels.set(config.type, label);
                
                console.log(`[CookingControllerV2] 📊 创建余量标签: ${config.type}`);
            } else {
                const label = countLabelNode.getComponent(Label);
                if (label) {
                    this.ingredientCountLabels.set(config.type, label);
                }
            }
        }
    }
    
    /**
     * 🔥 更新食材按钮上的余量显示
     */
    private updateIngredientCountLabels() {
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        
        this.ingredientCountLabels.forEach((label, type) => {
            // 🔥 无限使用的食材显示 ∞
            if (this.isInfiniteIngredient(type)) {
                label.string = '∞';
                label.color = new Color(100, 200, 255, 255);  // 淡蓝色 - 无限
                return;
            }
            
            const count = inventory.getAvailableCount(type);
            label.string = `${count}`;
            
            // 根据库存量改变颜色
            if (count <= 0) {
                label.color = new Color(255, 80, 80, 255);  // 红色 - 无库存
            } else if (count <= 3) {
                label.color = new Color(255, 200, 80, 255);  // 橙色 - 库存不足
            } else {
                label.color = new Color(255, 255, 255, 255);  // 白色 - 正常
            }
        });
    }
    
    /**
     * 创建库存显示面板
     */
    private createInventoryPanel() {
        if (this.inventoryPanel) {
            // 已有面板，直接使用
            this.setupInventoryLabels();
            return;
        }
        
        // 动态创建库存面板
        const canvas = this.node.parent;
        if (!canvas) return;
        
        this.inventoryPanel = new Node('InventoryPanel');
        const panelSprite = this.inventoryPanel.addComponent(Sprite);
        panelSprite.color = new Color(40, 40, 60, 200);
        
        const panelTransform = this.inventoryPanel.getComponent(UITransform);
        if (panelTransform) {
            panelTransform.setContentSize(200, 300);
        }
        
        // 放置在左上角
        this.inventoryPanel.setPosition(-550, 250, 0);
        canvas.addChild(this.inventoryPanel);
        
        // 标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '📦 库存';
        titleLabel.fontSize = 20;
        titleLabel.color = new Color(255, 215, 0, 255);
        titleNode.setPosition(0, 130, 0);
        this.inventoryPanel.addChild(titleNode);
        
        // 创建各食材标签
        this.setupInventoryLabels();
        
        console.log('[CookingControllerV2] 📦 库存面板已创建');
    }
    
    /**
     * 设置库存标签
     */
    private setupInventoryLabels() {
        if (!this.inventoryPanel) return;
        
        const items = [
            { type: IngredientType.DOUGH, emoji: '🍞', name: '面饼' },
            { type: IngredientType.EGG, emoji: '🥚', name: '鸡蛋' },
            { type: IngredientType.SAUSAGE, emoji: '🌭', name: '香肠' },
            { type: IngredientType.ONION, emoji: '🧅', name: '洋葱' },
            { type: IngredientType.CILANTRO, emoji: '🌿', name: '香菜' },
            { type: IngredientType.GRILLED_NOODLE_SAUCE, emoji: '🥫', name: '酱料' },
            { type: IngredientType.OIL, emoji: '🛢️', name: '油' }
        ];
        
        let yOffset = 100;
        
        for (const item of items) {
            // 检查是否已存在
            let labelNode = this.inventoryPanel.getChildByName(`Inv_${item.type}`);
            
            if (!labelNode) {
                labelNode = new Node(`Inv_${item.type}`);
                const label = labelNode.addComponent(Label);
                label.string = `${item.emoji} ${item.name}: 0`;
                label.fontSize = 16;
                label.color = new Color(255, 255, 255, 255);
                labelNode.setPosition(0, yOffset, 0);
                this.inventoryPanel.addChild(labelNode);
                this.inventoryLabels.set(item.type, label);
            } else {
                const label = labelNode.getComponent(Label);
                if (label) {
                    this.inventoryLabels.set(item.type, label);
                }
            }
            
            yOffset -= 30;
        }
    }
    
    /**
     * 更新库存显示
     */
    private updateInventoryDisplay() {
        if (!this.useInventorySystem) return;
        
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        
        this.inventoryLabels.forEach((label, type) => {
            const count = inventory.getAvailableCount(type);
            const config = INGREDIENT_CONFIG.get(type);
            if (config && label) {
                label.string = `${config.emoji} ${config.name}: ${count}`;
                
                // 库存不足时变红
                if (count <= 0) {
                    label.color = new Color(255, 100, 100, 255);
                } else if (count <= 5) {
                    label.color = new Color(255, 200, 100, 255);
                } else {
                    label.color = new Color(255, 255, 255, 255);
                }
            }
        });
    }
    
    // 🔥 无限使用的食材类型 - 已移至 CookingConfig.ts (INFINITE_INGREDIENTS)
    
    /**
     * 检查食材是否为无限使用类型
     */
    private isInfiniteIngredient(type: IngredientType): boolean {
        return INFINITE_INGREDIENTS.has(type);
    }
    
    /**
     * 消耗食材（使用库存系统时调用）
     * @returns 是否成功消耗
     */
    private consumeIngredient(type: IngredientType, count: number = 1): boolean {
        const inTutorial = this.tutorialManager?.isInTutorial() ?? false;
        if (inTutorial && type === IngredientType.OIL) {
            return true;
        }
        if (!this.useInventorySystem) {
            // 无限库存模式，直接返回成功
            return true;
        }
        
        // 🔥 无限使用的食材不消耗库存
        if (this.isInfiniteIngredient(type)) {
            return true;
        }
        
        const inventory = InventoryManager.instance;
        if (!inventory) return true;
        
        // 检查库存
        if (inventory.getAvailableCount(type) < count) {
            this.showMessage(`⚠️ ${INGREDIENT_CONFIG.get(type)?.name || '食材'}库存不足！`);
            return false;
        }
        
        // 消耗库存
        const success = inventory.consumeIngredient(type, count);
        
        if (success) {
            // 更新显示
            this.updateInventoryDisplay();
            // 🔥 更新按钮上的余量显示
            this.updateIngredientCountLabels();
        }
        
        return success;
    }
    
    /**
     * 检查食材是否有库存
     */
    private hasIngredientStock(type: IngredientType): boolean {
        if (!this.useInventorySystem) {
            return true;  // 无限库存模式
        }
        
        // 🔥 无限使用的食材永远有库存
        if (this.isInfiniteIngredient(type)) {
            return true;
        }
        
        const inventory = InventoryManager.instance;
        if (!inventory) return true;
        
        return inventory.getAvailableCount(type) > 0;
    }
    
    /**
     * 🔥 释放手持食材的预留（放下时调用）
     */
    private releaseHandItemReservation(type: IngredientType) {
        if (!this.useInventorySystem) return;
        if (this.handItemCount <= 0) return;
        
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.releaseReservedIngredient(type, this.handItemCount);
            this.updateIngredientCountLabels();
        }
    }
    
    /**
     * 🔥 确认消耗预留的食材（实际使用时调用）
     * @returns 是否成功消耗
     */
    private confirmReservedIngredient(type: IngredientType, count: number = 1): boolean {
        if (!this.useInventorySystem) {
            return true;  // 无限库存模式
        }
        
        const inventory = InventoryManager.instance;
        if (!inventory) return true;
        
        const success = inventory.confirmReservedIngredient(type, count);
        
        if (success) {
            this.updateInventoryDisplay();
            this.updateIngredientCountLabels();
        }
        
        return success;
    }
    
    /**
     * 添加金钱到库存系统
     */
    private addMoneyToInventory(amount: number) {
        if (!this.useInventorySystem) return;
        
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.addMoney(amount);
        }
    }
    
    /**
     * 添加差评到库存系统
     */
    private addBadReviewToInventory() {
        if (!this.useInventorySystem) return;
        
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.addBadReview();
        }
    }
    
    // ========================================
    // 手机面板相关方法
    // ========================================
    
    /**
     * 🔧 验证手机按钮图片配置
     */
    private verifyPhoneButtonSprite() {
        if (!this.phoneButton) {
            console.warn('[CookingControllerV2] ⚠️ PhoneButton未绑定');
            return;
        }
        
        // 获取Sprite组件
        const sprite = this.phoneButton.getComponent(Sprite);
        if (!sprite) {
            console.warn('[CookingControllerV2] ⚠️ PhoneButton没有Sprite组件');
            return;
        }
        
        // 输出调试信息
        console.log('[CookingControllerV2] 📱 PhoneButton配置验证:', {
            name: this.phoneButton.name,
            active: this.phoneButton.active,
            position: this.phoneButton.position,
            spriteFrame: sprite.spriteFrame ? '已设置' : '未设置',
            spriteName: sprite.spriteFrame?.name || 'null',
        });
        
        if (!sprite.spriteFrame) {
            console.error('[CookingControllerV2] ❌ PhoneButton的spriteFrame为null，图片无法显示');
            console.log('[CookingControllerV2] 💡 请检查场景文件中PhoneButton的Sprite组件配置');
        } else {
            console.log('[CookingControllerV2] ✅ PhoneButton spriteFrame配置正常');
        }
    }
    
    /**
     * 手机按钮点击
     */
    private onPhoneButtonClick() {
        if (!this.phonePanel) {
            console.warn('[CookingControllerV2] ⚠️ 手机面板未绑定！');
            return;
        }
        
        // 切换手机面板显示/隐藏
        this.phonePanel.active = !this.phonePanel.active;
        console.log(`[CookingControllerV2] 📱 手机面板：${this.phonePanel.active ? '打开' : '关闭'}`);
        
        // 🔥 打开手机时暂停时间，关闭时恢复
        const timeManager = TimeManager.instance;
        if (timeManager) {
            if (this.phonePanel.active) {
                timeManager.pauseTime();
                console.log('[CookingControllerV2] ⏸️ 手机打开，时间暂停');
            } else {
                timeManager.resumeTime();
                console.log('[CookingControllerV2] ▶️ 手机关闭，时间恢复');
            }
        }
        
        // 如果打开面板，更新显示
        if (this.phonePanel.active) {
            this.updatePhonePanelDisplay();
        }
    }
    
    private updatePhonePanelDisplay() {
        if (!this.phonePanel) return;
        
        console.log('[CookingControllerV2] 📱 更新手机面板');
        
        // 清除所有子节点
        this.phonePanel.removeAllChildren();
        
        // 使用原有初始化
        this.initPhonePanel();
        
        // 默认显示主界面
        this.showPhoneScreen('main');
        
        // 启动时间更新调度器
        this.schedule(this.updatePhoneTimeDisplay, 1.0);
    }
    
    /**
     * 初始化手机面板结构
     */
    private initPhonePanel() {
        console.log('[CookingControllerV2] 📱 === 开始初始化手机面板 ===');
        this.phonePanel.removeAllChildren();
        this.phonePanel.setSiblingIndex(9999);
        
        console.log('[CookingControllerV2] 📱 设置背景...');
        // 设置背景
        this.setupPhoneBackground();
        
        console.log('[CookingControllerV2] 📱 设置标题栏...');
        // 设置标题栏
        this.setupPhoneTitle();
        
        console.log('[CookingControllerV2] 📱 设置主界面...');
        // 设置主界面
        this.setupPhoneMainScreen();
        
        console.log('[CookingControllerV2] 📱 设置评价界面...');
        this.setupPhoneReviewScreen();
        
        console.log('[CookingControllerV2] 📱 设置消息界面...');
        this.setupPhoneMessageScreen();
        
        console.log('[CookingControllerV2] 📱 设置设置界面...');
        this.setupPhoneSettingsScreen();
        
        console.log('[CookingControllerV2] 📱 设置重新开始界面...');
        this.setupPhoneRestartScreen();
        
        console.log('[CookingControllerV2] 📱 设置关闭按钮...');
        // 设置关闭按钮
        this.setupPhoneCloseButton();
        
        console.log('[CookingControllerV2] 📱 === 手机面板初始化完成 ===');
        console.log('[CookingControllerV2] 📱 最终子节点数量:', this.phonePanel.children.length);
    }
    
    /**
     * 设置手机背景
     */
    private setupPhoneBackground() {
        const cfg = PHONE_CONFIG.background;
        const bgNode = new Node('PhoneBackground');
        const graphics = bgNode.addComponent(Graphics);
        
        // 绘制手机背景
        graphics.fillColor = cfg.color;
        graphics.rect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height);
        graphics.fill();
        
        bgNode.setPosition(0, cfg.positionY, 0);
        this.phonePanel.addChild(bgNode);
        bgNode.setSiblingIndex(0);
        
        const phoneTransform = this.phonePanel.getComponent(UITransform);
        if (phoneTransform) {
            phoneTransform.setContentSize(cfg.width, cfg.height);
        }
    }
    
    /**
     * 设置手机标题栏（iOS扁平风格状态栏）
     */
    private setupPhoneTitle() {
        const bgWidth = PHONE_CONFIG.background.width;
        const statusBarHeight = 44;
        
        // 状态栏容器
        const statusBar = new Node('StatusBar');
        statusBar.setPosition(0, 320, 0);  // 适配1.5倍放大
        this.phonePanel.addChild(statusBar);
        statusBar.setSiblingIndex(1);
        
        // 状态栏背景（iOS风格：纯白或透明）
        const bgNode = new Node('StatusBarBg');
        const bgGraphics = bgNode.addComponent(Graphics);
        bgGraphics.fillColor = new Color(255, 255, 255, 255);
        bgGraphics.rect(-bgWidth / 2, -statusBarHeight / 2, bgWidth, statusBarHeight);
        bgGraphics.fill();
        statusBar.addChild(bgNode);
        
        // 左侧：时间（显示游戏时间）
        const timeLabel = new Node('TimeLabel');
        const timeLabelComp = timeLabel.addComponent(Label);
        // 获取游戏时间
        const timeManager = TimeManager.instance;
        let timeStr = '06:00';
        if (timeManager) {
            const gameHours = timeManager.getCurrentHour();
            const gameMinutes = timeManager.getCurrentMinute();
            timeStr = `${gameHours < 10 ? '0' + gameHours : gameHours}:${gameMinutes < 10 ? '0' + gameMinutes : gameMinutes}`;
        }
        timeLabelComp.string = timeStr;
        timeLabelComp.fontSize = 16;
        timeLabelComp.color = new Color(0, 0, 0, 255);
        timeLabelComp.isBold = true;
        timeLabel.setPosition(-bgWidth / 2 + 30, 0, 0);
        statusBar.addChild(timeLabel);
        
        // 右侧：信号图标（iOS风格：4格信号，从高到低排列）
        const signalNode = new Node('SignalIcon');
        const signalGraphics = signalNode.addComponent(Graphics);
        signalGraphics.fillColor = new Color(0, 0, 0, 255);
        // 绘制4格信号条（水平翻转：从高到低）
        for (let i = 0; i < 4; i++) {
            const barHeight = 13 - i * 3;  // 从高到低
            signalGraphics.rect(-30 + i * 5, -barHeight / 2, 3, barHeight);
        }
        signalGraphics.fill();
        signalNode.setPosition(bgWidth / 2 - 80, 0, 0);
        statusBar.addChild(signalNode);
        
        // 右侧：电量图标（iOS风格：电池图标）
        const batteryNode = new Node('BatteryIcon');
        const batteryGraphics = batteryNode.addComponent(Graphics);
        // 电池外框
        batteryGraphics.strokeColor = new Color(0, 0, 0, 255);
        batteryGraphics.lineWidth = 1.5;
        batteryGraphics.roundRect(-12, -5, 22, 10, 2);
        batteryGraphics.stroke();
        // 电池头
        batteryGraphics.fillColor = new Color(0, 0, 0, 255);
        batteryGraphics.rect(10, -3, 3, 6);
        batteryGraphics.fill();
        // 电量填充（绿色，80%电量）
        batteryGraphics.fillColor = new Color(52, 199, 89, 255);  // iOS绿色
        batteryGraphics.roundRect(-10, -3, 16, 6, 1);
        batteryGraphics.fill();
        batteryNode.setPosition(bgWidth / 2 - 35, 0, 0);
        statusBar.addChild(batteryNode);
        
        // 电量百分比文字
        const batteryLabel = new Node('BatteryLabel');
        const batteryLabelComp = batteryLabel.addComponent(Label);
        batteryLabelComp.string = '80%';
        batteryLabelComp.fontSize = 12;
        batteryLabelComp.color = new Color(0, 0, 0, 255);
        batteryLabel.setPosition(bgWidth / 2 - 70, 0, 0);
        statusBar.addChild(batteryLabel);
    }
    
    /**
     * 设置手机关闭按钮（iOS风格）
     */
    private setupPhoneCloseButton() {
        const closeBtn = new Node('CloseButton');
        const graphics = closeBtn.addComponent(Graphics);
        
        // iOS风格：灰色圆形背景
        graphics.fillColor = new Color(142, 142, 147, 255);  // iOS灰色
        graphics.circle(0, 0, 22);
        graphics.fill();
        
        closeBtn.setPosition(0, -320, 0);  // 适配1.5倍放大
        this.phonePanel.addChild(closeBtn);
        closeBtn.setSiblingIndex(3);
        
        // 添加关闭图标（iOS风格X）
        const closeLabel = new Node('CloseLabel');
        const label = closeLabel.addComponent(Label);
        label.string = '✕';
        label.fontSize = 18;
        label.color = new Color(255, 255, 255, 255);
        label.isBold = true;
        closeLabel.setPosition(0, 0, 0);
        closeBtn.addChild(closeLabel);
        
        // 添加点击事件
        const buttonComp = closeBtn.addComponent(Button);
        closeBtn.on(Node.EventType.TOUCH_END, () => {
            if (this.phonePanel) {
                this.phonePanel.active = false;
                // 🔥 关闭手机时恢复时间
                const timeManager = TimeManager.instance;
                if (timeManager) {
                    timeManager.resumeTime();
                    console.log('[CookingControllerV2] ▶️ 手机关闭，时间恢复');
                }
            }
        });
    }
    
    /**
     * 🏠 设置手机主界面（现代iOS风格设计）
     */
    private setupPhoneMainScreen() {
        const mainScreen = new Node('MainScreen');
        mainScreen.active = false;
        
        // 创建卡片容器（功能按钮）
        const cardArea = new Node('CardArea');
        cardArea.setPosition(0, -70, 0);  // 整体下移70像素
        mainScreen.addChild(cardArea);
        
        // 🔥 布局配置 - 2x3网格 + 底部状态栏
        const cardWidth = 170;
        const cardHeight = 75;
        const gridSpacingX = 180;
        const gridSpacingY = 105;
        const gridStartY = 260;
        
        // 第一行：好评管理 | 消息中心
        const scoreText = this.allScores.length > 0 ? `${this.averageScore.toFixed(1)}分` : '暂无';
        const reviewCard = this.createPhoneGridCard('⭐', '好评管理', scoreText, -gridSpacingX/2, gridStartY, () => this.showPhoneScreen('review'));
        reviewCard.name = 'ReviewCard';
        cardArea.addChild(reviewCard);
        
        const messageCard = this.createPhoneGridCard('💬', '消息中心', '查看消息', gridSpacingX/2, gridStartY, () => this.showPhoneScreen('message'));
        messageCard.name = 'MessageCard';
        cardArea.addChild(messageCard);
        
        // 第二行：重新开始 | 游戏设置
        const restartCard = this.createPhoneGridCard('🔄', '重新开始', '新游戏', -gridSpacingX/2, gridStartY - gridSpacingY, () => this.onPhoneRestartClick());
        cardArea.addChild(restartCard);
        
        const settingsCard = this.createPhoneGridCard('⚙️', '游戏设置', '调整参数', gridSpacingX/2, gridStartY - gridSpacingY, () => this.showPhoneScreen('settings'));
        cardArea.addChild(settingsCard);
        
        // 第三行：存档 | 返回标题
        const saveCard = this.createPhoneGridCard('💾', '存档', '保存进度', -gridSpacingX/2, gridStartY - gridSpacingY * 2, () => this.onPhoneSaveClick());
        cardArea.addChild(saveCard);
        
        const exitCard = this.createPhoneGridCard('🏠', '返回标题', '退出游戏', gridSpacingX/2, gridStartY - gridSpacingY * 2, () => this.onPhoneExitClick());
        cardArea.addChild(exitCard);
        
        // 底部状态栏（钱包和热度）
        const statusBar = new Node('StatusBar');
        mainScreen.addChild(statusBar);
        
        // 🔥 店铺热度（左下）
        const heatLevel = this.getShopHeatLevel();
        const heatDisplay = this.createStatusDisplay(heatLevel.emoji, '热度', `${this.shopHeat}%`, -gridSpacingX/2, -200);
        heatDisplay.name = 'ShopHeatDisplay';
        statusBar.addChild(heatDisplay);
        
        // 💰 我的钱包（右下）- 显示全局钱包余额（InventoryManager）
        const inventory = InventoryManager.instance;
        let walletBalance = 1000; // 默认值
        if (inventory) {
            walletBalance = inventory.globalWallet;
        }
        console.log(`[CookingControllerV2] 📱 钱包显示 - 全局钱包: ${walletBalance}, 今日收入: ${this.totalMoney}`);
        const moneyDisplay = this.createStatusDisplay('💰', '钱包', `${walletBalance}元`, gridSpacingX/2, -200);
        moneyDisplay.name = 'MoneyDisplay';
        statusBar.addChild(moneyDisplay);
        
        this.phonePanel.addChild(mainScreen);
    }
    
    /**
     * 📱 创建手机网格按钮（精致玻璃风格）
     */
    private createPhoneGridCard(icon: string, title: string, subtitle: string, x: number, y: number, callback?: () => void): Node {
        const card = new Node(`${title}Card`);
        card.setPosition(x, y, 0);
        
        const cardWidth = 160;
        const cardHeight = 85;
        
        const transform = card.addComponent(UITransform);
        transform.setContentSize(cardWidth, cardHeight);
        
        // 背景
        const bg = card.addComponent(Graphics);
        
        // 多层阴影效果
        bg.fillColor = new Color(0, 0, 0, 6);
        bg.roundRect(-cardWidth/2 + 4, -cardHeight/2 - 4, cardWidth, cardHeight, 16);
        bg.fill();
        bg.fillColor = new Color(0, 0, 0, 10);
        bg.roundRect(-cardWidth/2 + 2, -cardHeight/2 - 2, cardWidth, cardHeight, 15);
        bg.fill();
        
        // 白色卡片背景
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 14);
        bg.fill();
        
        // 边框
        bg.strokeColor = new Color(226, 232, 240, 255);
        bg.lineWidth = 1;
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 14);
        bg.stroke();
        
        // 图标
        const iconNode = new Node('Icon');
        card.addChild(iconNode);
        iconNode.setPosition(0, 18, 0);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = icon;
        iconLabel.fontSize = 28;
        
        // 标题（深色文字）
        const titleNode = new Node('Title');
        card.addChild(titleNode);
        titleNode.setPosition(0, -12, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 14;
        titleLabel.color = new Color(30, 41, 59, 255);
        titleLabel.isBold = true;
        
        // 副标题
        const subtitleNode = new Node('Subtitle');
        card.addChild(subtitleNode);
        subtitleNode.setPosition(0, -30, 0);
        const subtitleLabel = subtitleNode.addComponent(Label);
        subtitleLabel.string = subtitle;
        subtitleLabel.fontSize = 11;
        subtitleLabel.color = new Color(100, 116, 139, 255);
        
        // 点击事件
        if (callback) {
            card.on(Node.EventType.TOUCH_START, () => {
                tween(card).to(0.08, { scale: new Vec3(0.96, 0.96, 1) }).start();
            });
            card.on(Node.EventType.TOUCH_END, () => {
                tween(card).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
                callback();
            });
            card.on(Node.EventType.TOUCH_CANCEL, () => {
                tween(card).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            });
        }
        
        return card;
    }
    
    /**
     * 📊 创建状态显示（带色块头部）
     */
    private createStatusDisplay(icon: string, title: string, value: string, x: number, y: number): Node {
        const display = new Node('StatusDisplay');
        display.setPosition(x, y, 0);
        
        const transform = display.addComponent(UITransform);
        transform.setContentSize(160, 70);
        
        // 背景
        const bg = display.addComponent(Graphics);
        
        // 阴影
        bg.fillColor = new Color(0, 0, 0, 10);
        bg.roundRect(-78, -37, 160, 70, 12);
        bg.fill();
        
        // 白色背景
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-80, -35, 160, 70, 12);
        bg.fill();
        
        // 边框
        bg.strokeColor = new Color(226, 232, 240, 255);
        bg.lineWidth = 1;
        bg.roundRect(-80, -35, 160, 70, 12);
        bg.stroke();
        
        // 图标
        const iconNode = new Node('Icon');
        display.addChild(iconNode);
        iconNode.setPosition(-50, 0, 0);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = icon;
        iconLabel.fontSize = 24;
        
        // 标题
        const titleNode = new Node('Title');
        display.addChild(titleNode);
        titleNode.setPosition(20, 12, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 12;
        titleLabel.color = new Color(100, 116, 139, 255);
        
        // 数值
        const valueNode = new Node('Value');
        display.addChild(valueNode);
        valueNode.setPosition(20, -12, 0);
        const valueLabel = valueNode.addComponent(Label);
        valueLabel.string = value;
        valueLabel.fontSize = 16;
        valueLabel.color = new Color(30, 41, 59, 255);
        valueLabel.isBold = true;
        
        return display;
    }
    
    /**
     * 🔥 更新手机界面的钱包和热度显示
     */
    private updatePhoneMainScreenData() {
        if (!this.phonePanel) return;
        
        const mainScreen = this.phonePanel.getChildByName('MainScreen');
        if (!mainScreen) return;
        
        // 更新顶部状态栏
        const statusBar = mainScreen.getChildByName('StatusBar');
        if (statusBar) {
            // 更新热度显示
            const heatDisplay = statusBar.getChildByName('ShopHeatDisplay');
            if (heatDisplay) {
                const heatLevel = this.getShopHeatLevel();
                const iconNode = heatDisplay.getChildByName('Icon');
                if (iconNode) {
                    const iconLabel = iconNode.getComponent(Label);
                    if (iconLabel) iconLabel.string = heatLevel.emoji;
                }
                const valueNode = heatDisplay.getChildByName('Value');
                if (valueNode) {
                    const valueLabel = valueNode.getComponent(Label);
                    if (valueLabel) valueLabel.string = `${this.shopHeat}%`;
                }
            }
            
            // 更新钱包显示（全局钱包余额）
            const moneyDisplay = statusBar.getChildByName('MoneyDisplay');
            if (moneyDisplay) {
                const valueNode = moneyDisplay.getChildByName('Value');
                if (valueNode) {
                    const valueLabel = valueNode.getComponent(Label);
                    if (valueLabel) {
                        const inventory = InventoryManager.instance;
                        let walletBalance = 1000;
                        if (inventory) {
                            walletBalance = inventory.globalWallet;
                        }
                        valueLabel.string = `${walletBalance}元`;
                    }
                }
            }
        }
        
        // 更新好评管理卡片的评分显示
        const cardArea = mainScreen.getChildByName('CardArea');
        if (cardArea) {
            const reviewCard = cardArea.getChildByName('ReviewCard');
            if (reviewCard) {
                const subtitle = reviewCard.getChildByName('Subtitle');
                if (subtitle) {
                    const label = subtitle.getComponent(Label);
                    if (label) {
                        label.string = this.allScores.length > 0 ? `总评分 ${this.averageScore.toFixed(1)}分` : '暂无评分';
                    }
                }
            }
        }
    }
    
    /**
     * 创建iOS风格卡片（1.5倍放大）- 委托给 PhoneUIComponents
     */
    private createModernCard(icon: string, title: string, subtitle: string, x: number, y: number, callback?: () => void): Node {
        return PhoneUIComponents.createModernCard(icon, title, subtitle, x, y, callback);
    }
    
    /**
     * 显示指定手机界面
     */
    private showPhoneScreen(screenName: string) {
        if (!this.phonePanel) return;
        
        // 隐藏所有界面
        const mainScreen = this.phonePanel.getChildByName('MainScreen');
        const reviewScreen = this.phonePanel.getChildByName('ReviewScreen');
        const settingsScreen = this.phonePanel.getChildByName('SettingsScreen');
        const messageScreen = this.phonePanel.getChildByName('MessageScreen');
        const restartScreen = this.phonePanel.getChildByName('RestartScreen');
        
        if (mainScreen) mainScreen.active = false;
        if (reviewScreen) reviewScreen.active = false;
        if (settingsScreen) settingsScreen.active = false;
        if (messageScreen) messageScreen.active = false;
        if (restartScreen) restartScreen.active = false;
        
        // 显示指定界面
        switch (screenName) {
            case 'main':
                if (mainScreen) {
                    mainScreen.active = true;
                }
                break;
            case 'review':
                if (reviewScreen) {
                    reviewScreen.active = true;
                    this.updatePhoneReviewContent();
                }
                break;
            case 'settings':
                if (settingsScreen) {
                    settingsScreen.active = true;
                    this.updatePhoneSettingsContent();
                }
                break;
            case 'message':
                if (messageScreen) {
                    messageScreen.active = true;
                    this.updatePhoneMessageContent();
                }
                break;
            case 'restart':
                if (restartScreen) {
                    restartScreen.active = true;
                }
                break;
        }
        
        // 控制背景时间显示（只在主界面显示）
        const backgroundTimeLabel = this.phonePanel.getChildByName('BackgroundTimeLabel');
        const backgroundTimeShadow = this.phonePanel.getChildByName('BackgroundTimeShadow');
        
        if (screenName === 'main') {
            if (backgroundTimeLabel) backgroundTimeLabel.active = true;
            if (backgroundTimeShadow) backgroundTimeShadow.active = true;
        } else {
            if (backgroundTimeLabel) backgroundTimeLabel.active = false;
            if (backgroundTimeShadow) backgroundTimeShadow.active = false;
        }
    }
    
    /**
     * 更新手机时间显示（使用游戏时间）
     */
    private updatePhoneTimeDisplay() {
        if (!this.phonePanel || !this.phonePanel.active) return;
        
        // 更新状态栏时间（使用游戏时间）
        const statusBar = this.phonePanel.getChildByName('StatusBar');
        if (statusBar) {
            const timeLabel = statusBar.getChildByName('TimeLabel');
            if (timeLabel) {
                const label = timeLabel.getComponent(Label);
                if (label) {
                    const timeManager = TimeManager.instance;
                    if (timeManager) {
                        const hours = timeManager.getCurrentHour();
                        const minutes = timeManager.getCurrentMinute();
                        label.string = `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`;
                    }
                }
            }
        }
    }
    
    /**
     * 📱 手机重新开始按钮点击
     */
    private onPhoneRestartClick() {
        console.log('[CookingControllerV2] 📱 手机重新开始');
        this.showPhoneScreen('restart');
    }
    
    /**
     * 💾 手机存档按钮点击
     */
    private onPhoneSaveClick() {
        console.log('[CookingControllerV2] 📱 手机存档');
        const saveName = `手动存档 - ${new Date().toLocaleString('zh-CN')}`;
        try {
            SaveManager.createSave(saveName, 'manual', SaveManager.buildCurrentSaveData());
            console.log('[CookingControllerV2] 存档成功:', saveName);
            this.showPhoneSaveSuccess();
        } catch (e) {
            console.error('[CookingControllerV2] 存档失败:', e);
        }
    }
    
    /**
     * 显示存档成功提示
     */
    private showPhoneSaveSuccess() {
        // 创建提示弹窗
        const toast = new Node('SaveToast');
        toast.addComponent(UITransform).setContentSize(200, 50);
        const toastBg = toast.addComponent(Graphics);
        toastBg.fillColor = new Color(40, 167, 69, 230);
        toastBg.roundRect(-100, -25, 200, 50, 10);
        toastBg.fill();
        
        const toastLabel = new Node('Label');
        const label = toastLabel.addComponent(Label);
        label.string = '✓ 存档成功';
        label.fontSize = 18;
        label.color = new Color(255, 255, 255, 255);
        toast.addChild(toastLabel);
        
        toast.setPosition(0, 100, 0);
        this.phonePanel.addChild(toast);
        
        // 2秒后消失
        tween(toast)
            .delay(1.5)
            .to(0.3, { scale: new Vec3(0, 0, 1) })
            .call(() => toast.destroy())
            .start();
    }
    
    /**
     * 🏠 手机返回标题按钮点击
     */
    private onPhoneExitClick() {
        console.log('[CookingControllerV2] 📱 返回标题');
        
        // 显示确认弹窗
        this.showExitConfirmPanel();
    }
    
    /**
     * 显示退出确认弹窗
     */
    private showExitConfirmPanel() {
        const confirmPanel = new Node('ExitConfirmPanel');
        confirmPanel.addComponent(UITransform).setContentSize(300, 180);
        this.phonePanel.addChild(confirmPanel);
        confirmPanel.setPosition(0, 50, 0);
        
        // 背景
        const bg = confirmPanel.addComponent(Graphics);
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-150, -90, 300, 180, 16);
        bg.fill();
        bg.strokeColor = new Color(200, 200, 200, 255);
        bg.lineWidth = 1;
        bg.roundRect(-150, -90, 300, 180, 16);
        bg.stroke();
        
        // 标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '返回标题';
        titleLabel.fontSize = 18;
        titleLabel.color = new Color(33, 37, 41, 255);
        titleLabel.isBold = true;
        titleNode.setPosition(0, 55, 0);
        confirmPanel.addChild(titleNode);
        
        // 提示文字
        const msgNode = new Node('Message');
        const msgLabel = msgNode.addComponent(Label);
        msgLabel.string = '确定要返回主菜单吗？\n未保存的进度将丢失';
        msgLabel.fontSize = 14;
        msgLabel.color = new Color(108, 117, 125, 255);
        msgLabel.lineHeight = 22;
        msgNode.setPosition(0, 10, 0);
        confirmPanel.addChild(msgNode);
        
        // 取消按钮
        const cancelBtn = new Node('CancelBtn');
        cancelBtn.addComponent(UITransform).setContentSize(100, 40);
        const cancelBg = cancelBtn.addComponent(Graphics);
        cancelBg.fillColor = new Color(233, 236, 239, 255);
        cancelBg.roundRect(-50, -20, 100, 40, 8);
        cancelBg.fill();
        const cancelLabel = new Node('Label');
        const cancelText = cancelLabel.addComponent(Label);
        cancelText.string = '取消';
        cancelText.fontSize = 14;
        cancelText.color = new Color(73, 80, 87, 255);
        cancelBtn.addChild(cancelLabel);
        cancelBtn.setPosition(-60, -50, 0);
        cancelBtn.addComponent(Button);
        cancelBtn.on(Node.EventType.TOUCH_END, () => confirmPanel.destroy());
        confirmPanel.addChild(cancelBtn);
        
        // 确认按钮
        const confirmBtn = new Node('ConfirmBtn');
        confirmBtn.addComponent(UITransform).setContentSize(100, 40);
        const confirmBg = confirmBtn.addComponent(Graphics);
        confirmBg.fillColor = new Color(220, 53, 69, 255);
        confirmBg.roundRect(-50, -20, 100, 40, 8);
        confirmBg.fill();
        const confirmLabel = new Node('Label');
        const confirmText = confirmLabel.addComponent(Label);
        confirmText.string = '确定';
        confirmText.fontSize = 14;
        confirmText.color = new Color(255, 255, 255, 255);
        confirmBtn.addChild(confirmLabel);
        confirmBtn.setPosition(60, -50, 0);
        confirmBtn.addComponent(Button);
        confirmBtn.on(Node.EventType.TOUCH_END, () => {
            confirmPanel.destroy();
            try {
                SaveManager.autoSave(SaveManager.buildCurrentSaveData());
            } catch (e) {
                console.warn('[CookingControllerV2] ⚠️ 返回主菜单自动存档失败', e);
            }
            SceneRouteService.goMainMenu();
        });
        confirmPanel.addChild(confirmBtn);
    }
    
    /**
     * 🔄 设置手机重新开始界面（与其他界面风格一致）
     */
    private setupPhoneRestartScreen() {
        const restartScreen = new Node('RestartScreen');
        const restartTransform = restartScreen.addComponent(UITransform);
        restartTransform.setContentSize(PHONE_CONFIG.background.width, PHONE_CONFIG.background.height);
        restartScreen.active = false;
        const bgWidth = PHONE_CONFIG.background.width;
        const bgHeight = PHONE_CONFIG.background.height;
        
        // 界面背景（iOS浅灰色）
        const screenBg = new Node('ScreenBg');
        const screenBgGraphics = screenBg.addComponent(Graphics);
        screenBgGraphics.fillColor = new Color(242, 242, 247, 255);
        screenBgGraphics.roundRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 20);
        screenBgGraphics.fill();
        restartScreen.addChild(screenBg);
        
        // 顶部标题栏
        const titleBar = new Node('TitleBar');
        const titleBg = new Node('TitleBg');
        const titleBgGraphics = titleBg.addComponent(Graphics);
        titleBgGraphics.fillColor = new Color(255, 255, 255, 255);
        titleBgGraphics.rect(-bgWidth / 2, -25, bgWidth, 50);
        titleBgGraphics.fill();
        titleBar.addChild(titleBg);
        
        // 返回按钮
        const backBtn = new Node('BackBtn');
        const backLabel = backBtn.addComponent(Label);
        backLabel.string = '‹ 返回';
        backLabel.fontSize = 16;
        backLabel.color = new Color(0, 122, 255, 255);
        backBtn.setPosition(-bgWidth / 2 + 40, 0, 0);
        backBtn.addComponent(Button);
        backBtn.on(Node.EventType.TOUCH_END, () => this.showPhoneScreen('main'));
        titleBar.addChild(backBtn);
        
        // 标题
        const titleLabel = new Node('Title');
        const titleComp = titleLabel.addComponent(Label);
        titleComp.string = '重新开始';
        titleComp.fontSize = 18;
        titleComp.color = new Color(0, 0, 0, 255);
        titleComp.isBold = true;
        titleBar.addChild(titleLabel);
        
        titleBar.setPosition(0, 280, 0);
        restartScreen.addChild(titleBar);
        
        // 内容区域
        const contentArea = new Node('ContentArea');
        
        // 说明文字
        const descLabel = new Node('DescLabel');
        const desc = descLabel.addComponent(Label);
        desc.string = '选择要开始的阶段';
        desc.fontSize = 14;
        desc.color = new Color(142, 142, 147, 255);
        descLabel.setPosition(0, 180, 0);
        contentArea.addChild(descLabel);
        
        // 购买阶段卡片
        const shopCard = this.createRestartOptionCard('🛒', '购买阶段', '回到商店选购食材', new Color(52, 199, 89, 255), 0, 80);
        shopCard.on(Node.EventType.TOUCH_END, () => this.restartFromPhase('shop'));
        contentArea.addChild(shopCard);
        
        // 制作阶段卡片
        const cookingCard = this.createRestartOptionCard('🍳', '制作阶段', '重新开始制作煎饼', new Color(0, 122, 255, 255), 0, -20);
        cookingCard.on(Node.EventType.TOUCH_END, () => this.restartFromPhase('cooking'));
        contentArea.addChild(cookingCard);
        
        restartScreen.addChild(contentArea);
        
        this.phonePanel.addChild(restartScreen);
        restartScreen.setSiblingIndex(2);
    }
    
    /**
     * 创建重新开始选项卡片 - 委托给 PhoneUIComponents
     */
    private createRestartOptionCard(icon: string, title: string, subtitle: string, accentColor: Color, x: number, y: number): Node {
        return PhoneUIComponents.createRestartOptionCard(icon, title, subtitle, accentColor, x, y);
    }
    
    /**
     * 从指定阶段重新开始
     */
    private restartFromPhase(phase: 'shop' | 'cooking') {
        console.log(`[CookingControllerV2] 📱 从${phase === 'shop' ? '购买' : '制作'}阶段重新开始`);
        
        // 关闭手机面板
        if (this.phonePanel) {
            this.phonePanel.active = false;
        }
        
        // 执行重新开始逻辑
        if (phase === 'shop') {
            SceneRouteService.goShop();
        } else if (phase === 'cooking') {
            // 重置当前场景
            this.resetGame();
        }
    }
    
    /**
     * 重置游戏
     */
    private resetGame() {
        // 清理顾客
        this.customers.forEach(customer => {
            if (customer.node && customer.node.isValid) {
                customer.node.destroy();
            }
        });
        this.customers = [];
        
        // 重置金钱和评价
        this.totalMoney = 0;
        this.reviewHistory = [];
        this.updateMoneyDisplay();
        this.updateReviewDisplay();
        
        // 重置库存
        if (this.useInventorySystem) {
            const inventory = InventoryManager.instance;
            if (inventory) {
                inventory.resetInEditor();
            }
        }
        
        // 重置角色管理器
        CustomerCharacterManager.forceRecreateInstance();
        
        // 恢复时间
        const timeManager = TimeManager.instance;
        if (timeManager) {
            timeManager.resetTime();
            timeManager.resumeTime();
        }
        
        console.log('[CookingControllerV2] 📱 游戏已重置');
    }
    
    /**
     * 创建手机按钮 - 委托给 PhoneUIComponents
     */
    private createPhoneButton(text: string, x: number, y: number, callback: () => void): Node {
        return PhoneUIComponents.createPhoneButton(text, x, y, callback);
    }
    
    /**
     * 📋 设置手机评价界面（美团风格）
     */
    private setupPhoneReviewScreen() {
        const reviewScreen = new Node('ReviewScreen');
        const reviewTransform = reviewScreen.addComponent(UITransform);
        reviewTransform.setContentSize(PHONE_CONFIG.background.width, PHONE_CONFIG.background.height);
        reviewScreen.active = false;
        const bgWidth = PHONE_CONFIG.background.width;
        const bgHeight = PHONE_CONFIG.background.height;
        
        // 界面背景（iOS浅灰色）
        const screenBg = new Node('ScreenBg');
        const screenBgGraphics = screenBg.addComponent(Graphics);
        screenBgGraphics.fillColor = new Color(242, 242, 247, 255);
        screenBgGraphics.roundRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 20);
        screenBgGraphics.fill();
        reviewScreen.addChild(screenBg);
        
        // 顶部标题栏
        const titleBar = new Node('TitleBar');
        const titleBg = new Node('TitleBg');
        const titleBgGraphics = titleBg.addComponent(Graphics);
        titleBgGraphics.fillColor = new Color(255, 255, 255, 255);
        titleBgGraphics.rect(-bgWidth / 2, -25, bgWidth, 50);
        titleBgGraphics.fill();
        titleBar.addChild(titleBg);
        
        // 返回按钮
        const backBtn = new Node('BackBtn');
        const backLabel = backBtn.addComponent(Label);
        backLabel.string = '‹ 返回';
        backLabel.fontSize = 16;
        backLabel.color = new Color(0, 122, 255, 255);
        backBtn.setPosition(-bgWidth / 2 + 40, 0, 0);
        backBtn.addComponent(Button);
        backBtn.on(Node.EventType.TOUCH_END, () => this.showPhoneScreen('main'));
        titleBar.addChild(backBtn);
        
        // 标题
        const titleLabel = new Node('Title');
        const titleComp = titleLabel.addComponent(Label);
        titleComp.string = '顾客评价';
        titleComp.fontSize = 18;
        titleComp.color = new Color(0, 0, 0, 255);
        titleComp.isBold = true;
        titleBar.addChild(titleLabel);
        
        titleBar.setPosition(0, 280, 0);
        reviewScreen.addChild(titleBar);
        
        // 美团风格评分总览区
        const scoreOverview = new Node('ScoreOverview');
        const scoreOverviewBg = new Node('ScoreOverviewBg');
        const scoreOverviewGraphics = scoreOverviewBg.addComponent(Graphics);
        scoreOverviewGraphics.fillColor = new Color(255, 255, 255, 255);
        scoreOverviewGraphics.roundRect(-bgWidth / 2 + 10, -40, bgWidth - 20, 80, 10);
        scoreOverviewGraphics.fill();
        scoreOverview.addChild(scoreOverviewBg);
        
        // 总评分（大字）- 使用平均分系统
        const totalScoreLabel = new Node('TotalScore');
        const totalScoreComp = totalScoreLabel.addComponent(Label);
        const displayScore = this.allScores.length > 0 ? this.averageScore.toFixed(1) : '-';
        totalScoreComp.string = displayScore;
        totalScoreComp.fontSize = 40;
        totalScoreComp.color = new Color(255, 149, 0, 255);  // 美团橙色
        totalScoreComp.isBold = true;
        totalScoreLabel.setPosition(-bgWidth / 2 + 60, 0, 0);
        scoreOverview.addChild(totalScoreLabel);
        
        // 评分标签
        const scoreText = new Node('ScoreText');
        const scoreTextComp = scoreText.addComponent(Label);
        scoreTextComp.string = this.allScores.length > 0 ? `平均分 (${this.allScores.length}单)` : '暂无评分';
        scoreTextComp.fontSize = 12;
        scoreTextComp.color = new Color(142, 142, 147, 255);
        scoreText.setPosition(-bgWidth / 2 + 60, -25, 0);
        scoreOverview.addChild(scoreText);
        
        // 评价数量统计
        const statsText = new Node('StatsText');
        const statsTextComp = statsText.addComponent(Label);
        const totalReviews = this.superGoodReviews + this.goodReviews + this.badReviews;
        statsTextComp.string = `共${totalReviews}条评价`;
        statsTextComp.fontSize = 14;
        statsTextComp.color = new Color(0, 0, 0, 255);
        statsText.setPosition(50, 10, 0);
        scoreOverview.addChild(statsText);
        
        // 分类统计
        const categoryStats = new Node('CategoryStats');
        const categoryText = categoryStats.addComponent(Label);
        categoryText.string = `好评${this.superGoodReviews + this.goodReviews} | 差评${this.badReviews}`;
        categoryText.fontSize = 12;
        categoryText.color = new Color(142, 142, 147, 255);
        categoryStats.setPosition(50, -10, 0);
        scoreOverview.addChild(categoryStats);
        
        scoreOverview.setPosition(0, 200, 0);
        reviewScreen.addChild(scoreOverview);
        
        // 评价列表区域
        const reviewList = new Node('ReviewList');
        reviewList.setPosition(0, -20, 0);
        
        // 显示最近评价（从reviewHistory中获取）
        const visibleReviews = this.reviewHistory.slice(0, 5);  // 最近5条（已按时间倒序）
        
        // 如果没有评价，显示友好提示
        if (visibleReviews.length === 0) {
            // 空状态卡片
            const emptyCard = new Node('EmptyCard');
            const emptyCardBg = new Node('EmptyCardBg');
            const emptyCardGraphics = emptyCardBg.addComponent(Graphics);
            emptyCardGraphics.fillColor = new Color(255, 255, 255, 255);
            emptyCardGraphics.roundRect(-150, -80, 300, 160, 12);
            emptyCardGraphics.fill();
            emptyCard.addChild(emptyCardBg);
            
            // 空状态图标
            const emptyIcon = new Node('EmptyIcon');
            const emptyIconLabel = emptyIcon.addComponent(Label);
            emptyIconLabel.string = '📝';
            emptyIconLabel.fontSize = 48;
            emptyIcon.setPosition(0, 30, 0);
            emptyCard.addChild(emptyIcon);
            
            // 空状态提示文字
            const emptyTip = new Node('EmptyTip');
            const emptyLabel = emptyTip.addComponent(Label);
            emptyLabel.string = '暂无顾客评价';
            emptyLabel.fontSize = 16;
            emptyLabel.color = new Color(0, 0, 0, 255);
            emptyLabel.isBold = true;
            emptyTip.setPosition(0, -20, 0);
            emptyCard.addChild(emptyTip);
            
            // 空状态副标题
            const emptySubtip = new Node('EmptySubtip');
            const emptySubLabel = emptySubtip.addComponent(Label);
            emptySubLabel.string = '完成订单后将收到顾客评价';
            emptySubLabel.fontSize = 12;
            emptySubLabel.color = new Color(142, 142, 147, 255);
            emptySubtip.setPosition(0, -45, 0);
            emptyCard.addChild(emptySubtip);
            
            emptyCard.setPosition(0, 20, 0);
            reviewList.addChild(emptyCard);
        } else {
            // 有评价时显示列表
            visibleReviews.forEach((review, index) => {
                const reviewItem = this.createMeituanReviewItem(review, index);
                reviewItem.setPosition(0, 100 - index * 70, 0);
                reviewList.addChild(reviewItem);
            });
        }
        
        reviewScreen.addChild(reviewList);
        
        this.phonePanel.addChild(reviewScreen);
        reviewScreen.setSiblingIndex(2);  // 确保在背景和状态栏之上
    }
    
    /**
     * 💬 设置手机消息界面（事件相关消息）
     */
    private setupPhoneMessageScreen() {
        const messageScreen = new Node('MessageScreen');
        const messageTransform = messageScreen.addComponent(UITransform);
        messageTransform.setContentSize(PHONE_CONFIG.background.width, PHONE_CONFIG.background.height);
        messageScreen.active = false;
        const bgWidth = PHONE_CONFIG.background.width;
        const bgHeight = PHONE_CONFIG.background.height;
        
        // 界面背景
        const screenBg = new Node('ScreenBg');
        const screenBgGraphics = screenBg.addComponent(Graphics);
        screenBgGraphics.fillColor = new Color(242, 242, 247, 255);
        screenBgGraphics.roundRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 20);
        screenBgGraphics.fill();
        messageScreen.addChild(screenBg);
        
        // 顶部标题栏
        const titleBar = new Node('TitleBar');
        const titleBg = new Node('TitleBg');
        const titleBgGraphics = titleBg.addComponent(Graphics);
        titleBgGraphics.fillColor = new Color(255, 255, 255, 255);
        titleBgGraphics.rect(-bgWidth / 2, -25, bgWidth, 50);
        titleBgGraphics.fill();
        titleBar.addChild(titleBg);
        
        // 返回按钮
        const backBtn = new Node('BackBtn');
        const backLabel = backBtn.addComponent(Label);
        backLabel.string = '‹ 返回';
        backLabel.fontSize = 16;
        backLabel.color = new Color(0, 122, 255, 255);
        backBtn.setPosition(-bgWidth / 2 + 40, 0, 0);
        backBtn.addComponent(Button);
        backBtn.on(Node.EventType.TOUCH_END, () => this.showPhoneScreen('main'));
        titleBar.addChild(backBtn);
        
        // 标题
        const titleLabel = new Node('Title');
        const titleComp = titleLabel.addComponent(Label);
        titleComp.string = '消息中心';
        titleComp.fontSize = 18;
        titleComp.color = new Color(0, 0, 0, 255);
        titleComp.isBold = true;
        titleBar.addChild(titleLabel);
        
        titleBar.setPosition(0, bgHeight / 2 - 60, 0);
        messageScreen.addChild(titleBar);
        
        // 消息列表容器
        const messageList = new Node('MessageList');
        messageList.setPosition(0, 0, 0);
        messageScreen.addChild(messageList);
        
        this.phonePanel.addChild(messageScreen);
        messageScreen.setSiblingIndex(2);
    }
    
    /**
     * 💬 更新消息中心内容
     */
    private updatePhoneMessageContent() {
        const messageScreen = this.phonePanel?.getChildByName('MessageScreen');
        if (!messageScreen) return;
        
        const messageList = messageScreen.getChildByName('MessageList');
        if (!messageList) return;
        
        messageList.removeAllChildren();
        
        const bgWidth = PHONE_CONFIG.background.width;
        
        if (this.eventMessages.length === 0) {
            // 空状态
            const emptyCard = new Node('EmptyCard');
            const emptyCardBg = new Node('EmptyCardBg');
            const emptyCardGraphics = emptyCardBg.addComponent(Graphics);
            emptyCardGraphics.fillColor = new Color(255, 255, 255, 255);
            emptyCardGraphics.roundRect(-150, -80, 300, 160, 12);
            emptyCardGraphics.fill();
            emptyCard.addChild(emptyCardBg);
            
            const emptyIcon = new Node('EmptyIcon');
            const emptyIconLabel = emptyIcon.addComponent(Label);
            emptyIconLabel.string = '💬';
            emptyIconLabel.fontSize = 48;
            emptyIcon.setPosition(0, 30, 0);
            emptyCard.addChild(emptyIcon);
            
            const emptyTip = new Node('EmptyTip');
            const emptyLabel = emptyTip.addComponent(Label);
            emptyLabel.string = '暂无消息';
            emptyLabel.fontSize = 16;
            emptyLabel.color = new Color(0, 0, 0, 255);
            emptyLabel.isBold = true;
            emptyTip.setPosition(0, -20, 0);
            emptyCard.addChild(emptyTip);
            
            const emptySubtip = new Node('EmptySubtip');
            const emptySubLabel = emptySubtip.addComponent(Label);
            emptySubLabel.string = '处理事件后会收到相关消息';
            emptySubLabel.fontSize = 12;
            emptySubLabel.color = new Color(142, 142, 147, 255);
            emptySubtip.setPosition(0, -45, 0);
            emptyCard.addChild(emptySubtip);
            
            emptyCard.setPosition(0, 20, 0);
            messageList.addChild(emptyCard);
        } else {
            // 显示消息列表
            const itemHeight = 80;
            let yPos = 200;
            
            for (let i = 0; i < Math.min(this.eventMessages.length, 8); i++) {
                const msg = this.eventMessages[i];
                const msgItem = this.createMessageItem(msg, i);
                msgItem.setPosition(0, yPos - i * itemHeight, 0);
                messageList.addChild(msgItem);
            }
        }
    }
    
    /**
     * 💬 创建消息项 - 委托给 PhoneUIItems
     */
    private createMessageItem(msg: {id: string, sender: string, senderIcon: string, content: string, time: string, isRead: boolean}, index: number): Node {
        return PhoneUIItems.createMessageItem(msg, index);
    }
    
    /**
     * 💬 添加事件消息
     */
    public addEventMessage(sender: string, senderIcon: string, content: string, eventId: string) {
        console.log(`[CookingControllerV2] 💬 addEventMessage被调用: ${sender}`);
        
        const timeManager = TimeManager.instance;
        const minute = timeManager ? timeManager.getCurrentMinute() : 0;
        const timeStr = timeManager ? `${timeManager.getCurrentHour()}:${minute < 10 ? '0' + minute : minute}` : '12:00';
        
        const newMessage = {
            id: `msg_${Date.now()}`,
            sender,
            senderIcon,
            content,
            time: timeStr,
            eventId,
            isRead: false
        };
        
        this.eventMessages.unshift(newMessage);
        
        // 限制消息数量
        if (this.eventMessages.length > 50) {
            this.eventMessages.pop();
        }
        
        // 更新消息按钮上的未读数
        this.updateMessageBadge();
        
        console.log(`[CookingControllerV2] 💬 消息已添加，当前消息数: ${this.eventMessages.length}`);
        console.log(`[CookingControllerV2] 💬 消息内容: ${sender} - ${content.substring(0, 50)}`);
    }
    
    /**
     * 💬 更新消息按钮未读数标记
     */
    private updateMessageBadge() {
        const unreadCount = this.eventMessages.filter(m => !m.isRead).length;
        const mainScreen = this.phonePanel?.getChildByName('MainScreen');
        if (!mainScreen) return;
        
        const cardArea = mainScreen.getChildByName('CardArea');
        if (!cardArea) return;
        
        const messageCard = cardArea.getChildByName('MessageCard');
        if (!messageCard) return;
        
        // 更新或创建未读标记
        let badge = messageCard.getChildByName('Badge');
        if (unreadCount > 0) {
            if (!badge) {
                badge = new Node('Badge');
                messageCard.addChild(badge);
                badge.setPosition(60, 30, 0);
                const badgeGraphics = badge.addComponent(Graphics);
                badgeGraphics.fillColor = new Color(255, 59, 48, 255);
                badgeGraphics.circle(0, 0, 10);
                badgeGraphics.fill();
                
                const badgeLabel = new Node('BadgeLabel');
                badge.addChild(badgeLabel);
                const label = badgeLabel.addComponent(Label);
                label.fontSize = 10;
                label.color = new Color(255, 255, 255, 255);
            }
            const badgeLabel = badge.getChildByName('BadgeLabel')?.getComponent(Label);
            if (badgeLabel) {
                badgeLabel.string = unreadCount > 9 ? '9+' : `${unreadCount}`;
            }
            badge.active = true;
        } else if (badge) {
            badge.active = false;
        }
    }
    
    /**
     * 创建美团风格评价项 - 委托给 PhoneUIItems
     */
    private createMeituanReviewItem(review: {type: 'super' | 'good' | 'bad', text: string, timestamp: number}, index: number): Node {
        return PhoneUIItems.createMeituanReviewItem(review, index, (r) => this.showReviewDetail(r));
    }
    
    /**
     * 显示评价详情弹窗 - 委托给 PhoneUIItems
     */
    private showReviewDetail(review: {type: 'super' | 'good' | 'bad', text: string, timestamp: number}) {
        const bgWidth = PHONE_CONFIG.background.width;
        const detailPopup = PhoneUIItems.createReviewDetailPopup(review, bgWidth, () => {
            detailPopup.destroy();
        });
        this.phonePanel.addChild(detailPopup);
    }
    
    /**
     * 更新手机评价内容
     */
    private updatePhoneReviewContent() {
        // 重建评价界面以更新数据
        const reviewScreen = this.phonePanel.getChildByName('ReviewScreen');
        if (reviewScreen) {
            reviewScreen.destroy();
            this.setupPhoneReviewScreen();
            // 重新获取并激活新创建的界面
            const newReviewScreen = this.phonePanel.getChildByName('ReviewScreen');
            if (newReviewScreen) {
                newReviewScreen.active = true;
            }
        }
        console.log('[CookingControllerV2] 📱 更新评价内容');
    }
    
    // 设置状态
    private phoneSettingsLanguage: string = 'zh';
    private phoneSettingsBGMVolume: number = 50;
    private phoneSettingsSFXVolume: number = 80;
    
    /**
     * ⚙️ 设置手机设置界面（与MainMenuUI一致：语言+音量，可交互）
     */
    private setupPhoneSettingsScreen() {
        const settingsScreen = new Node('SettingsScreen');
        const settingsTransform = settingsScreen.addComponent(UITransform);
        settingsTransform.setContentSize(PHONE_CONFIG.background.width, PHONE_CONFIG.background.height);
        settingsScreen.active = false;
        const bgWidth = PHONE_CONFIG.background.width;
        const bgHeight = PHONE_CONFIG.background.height;
        
        // 加载保存的设置
        this.loadPhoneSettings();
        
        // 界面背景（iOS浅灰色）
        const screenBg = new Node('ScreenBg');
        const screenBgGraphics = screenBg.addComponent(Graphics);
        screenBgGraphics.fillColor = new Color(242, 242, 247, 255);
        screenBgGraphics.roundRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 20);
        screenBgGraphics.fill();
        settingsScreen.addChild(screenBg);
        
        // 顶部标题栏
        const titleBar = new Node('TitleBar');
        const titleBg = new Node('TitleBg');
        const titleBgGraphics = titleBg.addComponent(Graphics);
        titleBgGraphics.fillColor = new Color(255, 255, 255, 255);
        titleBgGraphics.rect(-bgWidth / 2, -25, bgWidth, 50);
        titleBgGraphics.fill();
        titleBar.addChild(titleBg);
        
        // 返回按钮
        const backBtn = new Node('BackBtn');
        const backLabel = backBtn.addComponent(Label);
        backLabel.string = '‹ 返回';
        backLabel.fontSize = 16;
        backLabel.color = new Color(0, 122, 255, 255);
        backBtn.setPosition(-bgWidth / 2 + 40, 0, 0);
        backBtn.addComponent(Button);
        backBtn.on(Node.EventType.TOUCH_END, () => this.showPhoneScreen('main'));
        titleBar.addChild(backBtn);
        
        // 标题
        const titleLabel = new Node('Title');
        const titleComp = titleLabel.addComponent(Label);
        titleComp.string = '游戏设置';
        titleComp.fontSize = 18;
        titleComp.color = new Color(0, 0, 0, 255);
        titleComp.isBold = true;
        titleBar.addChild(titleLabel);
        
        titleBar.setPosition(0, 280, 0);
        settingsScreen.addChild(titleBar);
        
        // 设置项区域
        const settingsArea = new Node('SettingsArea');
        
        // 语言设置区块
        const langSection = this.createSettingsSection('语言设置', 0, 200);
        settingsArea.addChild(langSection);
        
        // 语言选择项（可切换）
        const langItem = this.createLanguageToggleItem(0, 150);
        settingsArea.addChild(langItem);
        
        // 音量设置区块
        const soundSection = this.createSettingsSection('音量设置', 0, 80);
        settingsArea.addChild(soundSection);
        
        // 背景音乐（可调节）
        const bgmItem = this.createInteractiveVolumeItem('背景音乐', 'bgm', this.phoneSettingsBGMVolume, 0, 30);
        settingsArea.addChild(bgmItem);
        
        // 音效（可调节）
        const sfxItem = this.createInteractiveVolumeItem('游戏音效', 'sfx', this.phoneSettingsSFXVolume, 0, -40);
        settingsArea.addChild(sfxItem);
        
        // 其他设置区块
        const otherSection = this.createSettingsSection('其他', 0, -110);
        settingsArea.addChild(otherSection);
        
        // 版本信息
        const versionItem = this.createSettingsItem('版本', 'v1.0.0', 0, -160);
        settingsArea.addChild(versionItem);
        
        settingsScreen.addChild(settingsArea);
        
        this.phonePanel.addChild(settingsScreen);
        settingsScreen.setSiblingIndex(2);  // 确保在背景和状态栏之上
    }
    
    /**
     * 创建语言切换项 - 委托给 PhoneUIItems
     */
    private createLanguageToggleItem(x: number, y: number): Node {
        return PhoneUIItems.createLanguageToggleItem(x, y, this.phoneSettingsLanguage, (lang) => this.togglePhoneLanguage(lang));
    }
    
    /**
     * 创建可交互音量设置项（拖动滑块）
     */
    private createInteractiveVolumeItem(title: string, type: 'bgm' | 'sfx', volume: number, x: number, y: number): Node {
        const item = new Node(`${title}VolumeItem`);
        const itemWidth = 320;
        const itemHeight = 44;
        
        // 背景
        const bg = new Node('Background');
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(255, 255, 255, 255);
        bgGraphics.strokeColor = new Color(220, 220, 220, 255);
        bgGraphics.lineWidth = 0.5;
        bgGraphics.roundRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, 10);
        bgGraphics.fill();
        bgGraphics.stroke();
        item.addChild(bg);
        
        // 标题
        const titleLabel = new Node('Title');
        const titleComp = titleLabel.addComponent(Label);
        titleComp.string = title;
        titleComp.fontSize = 15;
        titleComp.color = new Color(0, 0, 0, 255);
        titleLabel.setPosition(-itemWidth / 2 + 50, 0, 0);
        item.addChild(titleLabel);
        
        // 音量显示
        const volumeLabel = new Node('VolumeLabel');
        const volumeComp = volumeLabel.addComponent(Label);
        volumeComp.string = volume + '%';
        volumeComp.fontSize = 14;
        volumeComp.color = new Color(71, 85, 105, 255);
        volumeLabel.setPosition(itemWidth / 2 - 35, 0, 0);
        item.addChild(volumeLabel);
        
        // 拖动滑块
        const sliderWidth = 120;
        const slider = new Node('Slider');
        slider.addComponent(UITransform).setContentSize(sliderWidth, 24);
        slider.setPosition(30, 0, 0);
        item.addChild(slider);
        
        // 滑轨背景
        const track = new Node('Track');
        track.addComponent(UITransform).setContentSize(sliderWidth, 6);
        const trackGraphics = track.addComponent(Graphics);
        trackGraphics.fillColor = new Color(203, 213, 225, 255);
        trackGraphics.roundRect(-sliderWidth/2, -3, sliderWidth, 6, 3);
        trackGraphics.fill();
        slider.addChild(track);
        
        // 进度条
        const fill = new Node('Fill');
        fill.addComponent(UITransform).setContentSize(sliderWidth, 6);
        const fillGraphics = fill.addComponent(Graphics);
        slider.addChild(fill);
        
        // 手柄
        const handle = new Node('Handle');
        handle.addComponent(UITransform).setContentSize(20, 20);
        const handleGraphics = handle.addComponent(Graphics);
        slider.addChild(handle);
        
        // 绘制函数
        const drawFill = (ratio: number) => {
            fillGraphics.clear();
            fillGraphics.fillColor = new Color(100, 116, 139, 255);
            const fillWidth = sliderWidth * ratio;
            if (fillWidth > 0) {
                fillGraphics.roundRect(-sliderWidth/2, -3, fillWidth, 6, 3);
                fillGraphics.fill();
            }
        };
        
        const drawHandle = (ratio: number) => {
            const handleX = -sliderWidth/2 + sliderWidth * ratio;
            handleGraphics.clear();
            handleGraphics.fillColor = new Color(0, 0, 0, 20);
            handleGraphics.circle(1, -1, 10);
            handleGraphics.fill();
            handleGraphics.fillColor = new Color(255, 255, 255, 255);
            handleGraphics.circle(0, 0, 10);
            handleGraphics.fill();
            handleGraphics.strokeColor = new Color(100, 116, 139, 255);
            handleGraphics.lineWidth = 2;
            handleGraphics.circle(0, 0, 10);
            handleGraphics.stroke();
            handle.setPosition(handleX, 0, 0);
        };
        
        // 初始绘制
        let currentValue = volume / 100;
        drawFill(currentValue);
        drawHandle(currentValue);
        
        // 触摸区域
        const touchArea = new Node('TouchArea');
        touchArea.addComponent(UITransform).setContentSize(sliderWidth, 24);
        touchArea.addComponent(Button);
        slider.addChild(touchArea);
        
        // 使用增量拖动
        touchArea.on(Node.EventType.TOUCH_START, (event: any) => {
            event.propagationStopped = true;
        });
        
        touchArea.on(Node.EventType.TOUCH_MOVE, (event: any) => {
            event.propagationStopped = true;
            const delta = event.getDelta();
            const deltaRatio = delta.x / sliderWidth;
            currentValue = Math.max(0, Math.min(1, currentValue + deltaRatio));
            drawFill(currentValue);
            drawHandle(currentValue);
            volumeComp.string = Math.round(currentValue * 100) + '%';
            
            // 更新并保存
            if (type === 'bgm') {
                this.phoneSettingsBGMVolume = Math.round(currentValue * 100);
            } else {
                this.phoneSettingsSFXVolume = Math.round(currentValue * 100);
            }
            this.savePhoneSettings();
        });
        
        touchArea.on(Node.EventType.TOUCH_END, (event: any) => {
            event.propagationStopped = true;
        });
        
        touchArea.on(Node.EventType.TOUCH_CANCEL, (event: any) => {
            event.propagationStopped = true;
        });
        
        item.setPosition(x, y, 0);
        return item;
    }
    
    /**
     * 切换语言
     */
    private togglePhoneLanguage(lang: string) {
        this.phoneSettingsLanguage = lang;
        this.savePhoneSettings();
        
        // 重建设置界面以刷新显示
        const settingsScreen = this.phonePanel.getChildByName('SettingsScreen');
        if (settingsScreen) {
            settingsScreen.destroy();
            this.setupPhoneSettingsScreen();
            // 重新获取并激活新创建的界面
            const newSettingsScreen = this.phonePanel.getChildByName('SettingsScreen');
            if (newSettingsScreen) {
                newSettingsScreen.active = true;
            }
        }
        
        console.log(`[CookingControllerV2] 📱 语言切换为: ${lang === 'zh' ? '中文' : 'English'}`);
    }
    
    /**
     * 调整音量
     */
    private adjustPhoneVolume(type: 'bgm' | 'sfx', delta: number) {
        if (type === 'bgm') {
            this.phoneSettingsBGMVolume = Math.max(0, Math.min(100, this.phoneSettingsBGMVolume + delta));
        } else {
            this.phoneSettingsSFXVolume = Math.max(0, Math.min(100, this.phoneSettingsSFXVolume + delta));
        }
        
        this.savePhoneSettings();
        
        // 重建设置界面以刷新显示
        const settingsScreen = this.phonePanel.getChildByName('SettingsScreen');
        if (settingsScreen) {
            settingsScreen.destroy();
            this.setupPhoneSettingsScreen();
            // 重新获取并激活新创建的界面
            const newSettingsScreen = this.phonePanel.getChildByName('SettingsScreen');
            if (newSettingsScreen) {
                newSettingsScreen.active = true;
            }
        }
        
        console.log(`[CookingControllerV2] 📱 ${type === 'bgm' ? '背景音乐' : '音效'}音量: ${type === 'bgm' ? this.phoneSettingsBGMVolume : this.phoneSettingsSFXVolume}%`);
    }
    
    /**
     * 保存设置到本地存储（与MainMenuUI共用game_settings）
     */
    private savePhoneSettings() {
        const settings = {
            language: this.phoneSettingsLanguage,
            bgmVolume: this.phoneSettingsBGMVolume / 100,  // 转换为0-1范围
            sfxVolume: this.phoneSettingsSFXVolume / 100   // 转换为0-1范围
        };
        sys.localStorage.setItem('game_settings', JSON.stringify(settings));
    }
    
    /**
     * 从本地存储加载设置（与MainMenuUI共用game_settings）
     */
    private loadPhoneSettings() {
        const saved = sys.localStorage.getItem('game_settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.phoneSettingsLanguage = settings.language || 'zh';
                // bgmVolume/sfxVolume 可能是0-1范围或0-100范围，需要兼容
                const bgm = settings.bgmVolume ?? 0.5;
                const sfx = settings.sfxVolume ?? 0.8;
                this.phoneSettingsBGMVolume = bgm <= 1 ? Math.round(bgm * 100) : bgm;
                this.phoneSettingsSFXVolume = sfx <= 1 ? Math.round(sfx * 100) : sfx;
            } catch (e) {
                console.warn('[CookingControllerV2] 设置加载失败');
            }
        }
    }
    
    /**
     * 创建设置区块标题 - 委托给 PhoneUIComponents
     */
    private createSettingsSection(title: string, x: number, y: number): Node {
        return PhoneUIComponents.createSettingsSection(title, x - 120, y);
    }
    
    /**
     * 创建设置项 - 委托给 PhoneUIComponents
     */
    private createSettingsItem(title: string, value: string, x: number, y: number): Node {
        return PhoneUIComponents.createSettingsItem(title, value, x, y);
    }
    
    /**
     * 更新手机设置内容
     */
    private updatePhoneSettingsContent() {
        console.log('[CookingControllerV2] 📱 更新设置内容');
    }

    private getCurrentLevelId(): number {
        return GameProgressManager.instance?.progress?.currentLevel
            ?? InventoryManager.instance?.currentLevel?.levelId
            ?? 1;
    }

    private getCurrentWallet(): number {
        return InventoryManager.instance?.globalWallet ?? this.totalMoney;
    }

    private getMainIngredientType(): IngredientType {
        const levelId = this.getCurrentLevelId();
        const levelConfig = GameConfig.LEVELS.find(level => level.levelId === levelId);
        const recipe = levelConfig?.recipes?.[0];
        const type = recipe?.ingredients?.[0]?.type;
        return type ?? IngredientType.NOODLE;
    }

    private getMainIngredientAvailableCount(): number {
        const inventory = InventoryManager.instance;
        if (!inventory) return 0;
        return inventory.getAvailableCount(this.getMainIngredientType());
    }

    private applySpecialEventMoneyDelta(delta: number): boolean {
        if (delta === 0) return true;
        const inventory = InventoryManager.instance;
        if (inventory) {
            if (delta > 0) {
                inventory.addMoney(delta);
                this.totalMoney += delta;
                this.updateMoneyDisplay();
                return true;
            }
            const ok = inventory.spendMoney(-delta);
            if (ok) {
                this.totalMoney += delta;
                this.updateMoneyDisplay();
            }
            return ok;
        }
        if (this.totalMoney + delta < 0) return false;
        this.totalMoney += delta;
        this.updateMoneyDisplay();
        return true;
    }

    private applySpecialEventMainIngredientDelta(delta: number): boolean {
        const inventory = InventoryManager.instance;
        if (!inventory) return false;
        const mainType = this.getMainIngredientType();
        const ok = inventory.adjustProcessedIngredient(mainType, delta);
        if (ok) {
            this.updateInventoryDisplay();
            this.updateIngredientCountLabels();
        }
        return ok;
    }

    private areCustomersCleared(): boolean {
        for (const customer of this.customers) {
            if (customer.node && customer.node.active && customer.order) {
                return false;
            }
        }
        return true;
    }
    // ========================================
    // 🎲 随机事件系统方法
    // ========================================

    /**
     * 🎲 检查是否需要触发随机事件
     */
    private checkEventTrigger(hour: number, minute: number) {
        if (this.useSpecialEventSystem && this.specialEventSystem) {
            if (this.specialEventSystem.checkTrigger(hour, minute)) {
                return;
            }
            return;
        }
        // 🎲 使用新事件系统V2
        if (this.useEventSystemV2 && this.eventSystemV2) {
            this.eventSystemV2.checkEventTrigger(hour, minute);
            return;
        }
        
        // ===== 旧事件系统逻辑（保留兼容） =====
        // 已经在事件阶段或清场中，不触发新事件
        if (this.eventState.isEventPhase || this.eventState.customerClearing) {
            return;
        }

        // 计算当前时间（小时.分钟）
        const currentTime = hour + minute / 60;

        // 检查是否到达事件触发时间点
        for (const triggerTime of this.eventState.eventTriggerTimes) {
            // 已经触发过这个时间点的事件
            const triggerId = `time_${triggerTime}`;
            if (this.eventState.triggeredToday.indexOf(triggerId) !== -1) {
                continue;
            }

            // 到达触发时间（允许5分钟误差）
            if (currentTime >= triggerTime && currentTime < triggerTime + 0.1) {
                console.log(`[RandomEvent] 🎲 到达事件触发时间 ${triggerTime}:00`);
                this.eventState.triggeredToday.push(triggerId);
                this.prepareEventTrigger(triggerTime);
                break;
            }
        }
    }

    /**
     * 🎲 准备触发事件（开始清场）
     */
    private prepareEventTrigger(triggerTime: number) {
        // 确定时段
        let timeSlot: TimeSlot;
        if (triggerTime < 14) {
            timeSlot = 'lunch';
        } else if (triggerTime < 17) {
            timeSlot = 'afternoon';
        } else if (triggerTime < 20) {
            timeSlot = 'dinner';
        } else {
            timeSlot = 'night';
        }

        // 从事件池随机选取事件
        const event = getRandomEvent(timeSlot, this.eventState.triggeredToday);
        if (!event) {
            console.log('[RandomEvent] ⚠️ 没有可用的事件');
            return;
        }

        console.log(`[RandomEvent] 🎲 准备触发事件: ${event.name}`);
        this.eventState.pendingEvent = event;
        this.eventState.customerClearing = true;

        // 显示提示
        this.showMessage(`⚠️ 有情况发生！等待当前顾客离开...`);

        // 停止生成新顾客
        this.stopCustomerSpawn();

        // 检查是否已经没有顾客
        this.checkCustomerCleared();
    }

    /**
     * 🎲 停止生成新顾客
     */
    private stopCustomerSpawn() {
        // 设置一个标志阻止新顾客生成
        this.eventState.customerClearing = true;
        console.log('[RandomEvent] 🚫 停止生成新顾客');
    }

    /**
     * 🎲 检查顾客是否已清场
     */
    private checkCustomerCleared() {
        // 检查是否还有活跃顾客
        let hasActiveCustomer = false;
        for (const customer of this.customers) {
            if (customer.node && customer.node.active && customer.order) {
                hasActiveCustomer = true;
                break;
            }
        }

        if (!hasActiveCustomer) {
            // 顾客已清场，触发事件
            console.log('[RandomEvent] ✅ 顾客已清场，触发事件！');
            this.triggerEvent();
        } else {
            // 还有顾客，等待1秒后再检查
            this.scheduleOnce(() => {
                this.checkCustomerCleared();
            }, 1);
        }
    }

    /**
     * 🎲 触发事件（显示事件弹窗）
     */
    private triggerEvent() {
        const event = this.eventState.pendingEvent;
        if (!event) return;

        this.eventState.currentEvent = event;
        this.eventState.pendingEvent = null;
        this.eventState.isEventPhase = true;
        this.eventState.customerClearing = false;

        console.log(`[RandomEvent] 🎭 触发事件: ${event.name}`);

        // 创建事件弹窗
        this.createEventPanel(event);
    }

    /**
     * 🎲 创建事件弹窗UI - 委托给 RandomEventUI
     */
    private createEventPanel(event: RandomEvent) {
        if (this.eventPanel) {
            this.eventPanel.destroy();
        }
        const canvas = find('Canvas');
        if (!canvas) return;
        
        this.eventPanel = RandomEventUI.createEventPanel(
            event,
            () => this.selectEventOption(event, event.optionA, 'A'),
            () => this.selectEventOption(event, event.optionB, 'B')
        );
        canvas.addChild(this.eventPanel);
    }

    /**
     * 🎲 创建事件选项按钮 - 委托给 RandomEventUI
     */
    private createEventButton(option: EventOption, x: number, y: number, color: Color, callback: () => void): Node {
        return RandomEventUI.createEventButton(option, x, y, color, callback);
    }

    /**
     * 🎲 选择事件选项
     */
    private selectEventOption(event: RandomEvent, option: EventOption, choice: 'A' | 'B') {
        console.log(`[RandomEvent] 🎯 选择了选项${choice}: ${option.text}`);

        // 计算结果
        let success = true;
        let finalCost = option.cost;
        let finalHeat = option.heatChange;

        // 如果有成功率，进行判定
        if (option.successRate !== undefined && option.successRate < 100) {
            success = Math.random() * 100 < option.successRate;
            if (!success) {
                console.log(`[RandomEvent] ❌ 判定失败！成功率: ${option.successRate}%`);
                finalCost = option.failCost !== undefined ? option.failCost : 0;
                finalHeat = option.failHeatChange !== undefined ? option.failHeatChange : 0;
            } else {
                console.log(`[RandomEvent] ✅ 判定成功！`);
            }
        }

        // 应用金币变化
        if (finalCost !== 0) {
            this.totalMoney += finalCost;
            this.updateMoneyDisplay();
            console.log(`[RandomEvent] 💰 金币变化: ${finalCost > 0 ? '+' : ''}${finalCost}`);
        }

        // 应用热度变化
        if (finalHeat !== 0) {
            this.updateShopHeat(finalHeat);
            console.log(`[RandomEvent] 🔥 热度变化: ${finalHeat > 0 ? '+' : ''}${finalHeat}, 当前: ${this.shopHeat}`);
        }

        // 处理特殊效果
        if (success && option.effect) {
            this.applyEventEffect(option.effect);
        }

        // 显示结果
        this.showEventResult(event, option, success, finalCost, finalHeat);
    }

    /**
     * 🎲 应用事件特殊效果
     */
    private applyEventEffect(effect: string) {
        console.log(`[RandomEvent] ⚡ 应用特殊效果: ${effect}`);
        // TODO: 根据effect类型应用不同效果
        // 如: SPEED_UP_30, PRICE_UP_1, VIRAL_BOOST 等
    }

    /**
     * 🎲 显示事件结果 - 委托给 RandomEventUI
     */
    private showEventResult(event: RandomEvent, option: EventOption, success: boolean, cost: number, heat: number) {
        RandomEventUI.showEventResult(this.eventPanel, option, success, cost, heat, () => this.closeEventPanel());
    }

    /**
     * 🎲 关闭事件面板 - 委托给 RandomEventUI
     */
    private closeEventPanel() {
        RandomEventUI.closePanel(this.eventPanel, () => {
            this.eventPanel = null;
        });

        // 重置事件状态
        this.eventState.currentEvent = null;
        this.eventState.isEventPhase = false;
        this.eventState.customerClearing = false;

        // 恢复顾客生成
        this.showMessage('📢 继续营业！');
        console.log('[RandomEvent] ✅ 事件结束，恢复营业');
    }

    /**
     * 🎲 重置每日事件状态
     */
    private resetDailyEventState() {
        this.eventState.currentEvent = null;
        this.eventState.pendingEvent = null;
        this.eventState.triggeredToday = [];
        this.eventState.isEventPhase = false;
        this.eventState.customerClearing = false;
        console.log('[RandomEvent] 🔄 每日事件状态已重置');
    }

    // ========================================
    // 🧪 调试功能：事件时间跳转按钮
    // ========================================
    
    /**
     * 🧪 创建调试按钮面板（跳转到事件时间）- 简化版用Graphics
     */
    private createDebugEventButtons() {
        const canvas = this.node.parent;
        if (!canvas) return;

        // 创建调试面板容器
        const debugPanel = new Node('DebugEventPanel');
        canvas.addChild(debugPanel);
        debugPanel.setPosition(-350, 250, 0);
        
        // 用Graphics绘制背景（自带UITransform）
        const graphics = debugPanel.addComponent(Graphics);
        graphics.fillColor = new Color(30, 30, 40, 220);
        graphics.roundRect(-90, -140, 180, 280, 8);
        graphics.fill();

        // 标题
        const titleNode = new Node('Title');
        debugPanel.addChild(titleNode);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '🧪 事件调试';
        titleLabel.fontSize = 18;
        titleLabel.color = new Color(255, 255, 0, 255);
        titleNode.setPosition(0, 115, 0);

        // 事件时间点配置
        const eventTimes = [
            { label: '🍜 午餐 13:30', hour: 13, minute: 30, slot: 'lunch' },
            { label: '☕ 下午 15:30', hour: 15, minute: 30, slot: 'afternoon' },
            { label: '🍽️ 晚餐 18:00', hour: 18, minute: 0, slot: 'dinner' },
            { label: '🌙 夜市 20:30', hour: 20, minute: 30, slot: 'night' }
        ];

        // 创建按钮
        eventTimes.forEach((config, index) => {
            const btn = this.createDebugTimeButton(config.label, config.hour, config.minute, config.slot);
            debugPanel.addChild(btn);
            btn.setPosition(0, 70 - index * 50, 0);
        });

        // 关闭按钮
        const closeBtn = new Node('CloseBtn');
        debugPanel.addChild(closeBtn);
        closeBtn.setPosition(0, -110, 0);
        
        const closeGraphics = closeBtn.addComponent(Graphics);
        closeGraphics.fillColor = new Color(100, 100, 100, 255);
        closeGraphics.roundRect(-70, -17, 140, 35, 4);
        closeGraphics.fill();

        const closeLabel = new Node('Label');
        closeBtn.addChild(closeLabel);
        const closeLabelComp = closeLabel.addComponent(Label);
        closeLabelComp.string = '❌ 隐藏面板';
        closeLabelComp.fontSize = 16;
        closeLabelComp.color = new Color(255, 255, 255, 255);

        closeBtn.on(Node.EventType.TOUCH_END, () => {
            debugPanel.active = false;
            console.log('[Debug] 调试面板已隐藏，按 D 键重新显示');
        });

        // 保存引用
        this._debugEventPanel = debugPanel;
        console.log('[Debug] 🧪 事件调试面板已创建');
    }

    private _debugEventPanel: Node | null = null;

    /**
     * 🧪 创建单个时间跳转按钮
     */
    private createDebugTimeButton(label: string, hour: number, minute: number, slot: string): Node {
        const btn = new Node('TimeBtn');
        
        // 用Graphics绘制背景
        const graphics = btn.addComponent(Graphics);
        graphics.fillColor = new Color(60, 120, 180, 255);
        graphics.roundRect(-80, -20, 160, 40, 4);
        graphics.fill();

        const labelNode = new Node('Label');
        btn.addChild(labelNode);
        const labelComp = labelNode.addComponent(Label);
        labelComp.string = label;
        labelComp.fontSize = 16;
        labelComp.color = new Color(255, 255, 255, 255);

        btn.on(Node.EventType.TOUCH_END, () => {
            this.debugJumpToEventTime(hour, minute, slot);
        });

        return btn;
    }

    /**
     * 🧪 跳转到指定事件时间并触发事件
     */
    private debugJumpToEventTime(hour: number, minute: number, slot: string) {
        const timeManager = TimeManager.instance;
        if (!timeManager) {
            console.error('[Debug] TimeManager 不存在');
            return;
        }

        // 确保在营业中
        if (!timeManager.isBusinessOpen()) {
            console.log('[Debug] 未营业，先启动营业');
            timeManager.forceRestart();
        }

        // 重置事件状态（避免重复触发限制）
        this.eventState.triggeredToday = [];
        this.eventState.isEventPhase = false;
        this.eventState.customerClearing = false;
        this.eventState.pendingEvent = null;
        this.eventState.currentEvent = null;

        // 重置V2系统状态
        if (this.useEventSystemV2 && this.eventSystemV2) {
            const manager = this.eventSystemV2.getEventManager();
            if (manager) {
                manager.getState().triggeredToday = [];
                manager.getState().isEventPhase = false;
                manager.getState().productionChallenge = null;
            }
        }

        // 跳转到事件时间前2分钟
        const adjustedMinute = minute > 2 ? minute - 2 : minute;
        timeManager.setTime(hour, adjustedMinute);
        
        this.showMessage(`🧪 跳转到${hour}:${adjustedMinute < 10 ? '0' + adjustedMinute : adjustedMinute}`);
        console.log(`[Debug] 🧪 时间跳转到 ${hour}:${adjustedMinute}（事件将在${minute}分触发）`);
        
        // 先生成顾客
        this.scheduleOnce(() => {
            // 确保营业状态
            this.setBusinessState(true);
            
            // 生成顾客
            const maxCustomers = this.getMaxCustomersByHeat();
            let generated = 0;
            for (let i = 0; i < Math.min(maxCustomers, this.customers.length); i++) {
                const customer = this.customers[i];
                if (customer.node && !customer.node.active) {
                    this.spawnCustomerAt(i);
                    generated++;
                }
            }
            console.log(`[Debug] 🧪 生成了${generated}个顾客，等待事件触发...`);
        }, 0.3);
    }

}

























