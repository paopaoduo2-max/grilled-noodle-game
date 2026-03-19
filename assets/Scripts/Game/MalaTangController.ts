import { _decorator, Node, Label, Button, Vec3, Vec2, instantiate, find, EventTouch, UITransform, Camera, Canvas, director, Graphics, Color, input, Input, EventMouse } from 'cc';
import { PREVIEW, EDITOR, DEV } from 'cc/env';
import { IngredientType, GameConfig, MALATANG_VEG_TYPES, MALATANG_MEAT_TYPES } from '../Data/GameConfig';
import { InventoryManager } from '../Manager/InventoryManager';
import { TimeManager } from '../Manager/TimeManager';
import { BaseCookingController } from './Base/BaseCookingController';
import { RingTossController } from './GamblingShops/RingToss/RingTossController';
import { PhonePanelUI, PhonePanelDataProvider } from './Systems/PhonePanelUI';

const { ccclass, property } = _decorator;

type QualityType = 'good' | 'ok' | 'bad';
type CondimentType = 'sesame' | 'sugar' | 'scallion' | 'cilantro';
type BasketStage = 'meat' | 'veg';
type BasketKind = 'mix' | 'meat' | 'veg';
type BasketState = 'pending' | 'weighing' | 'weighed' | 'cooking' | 'cooked' | 'souped';

interface OrderTicket {
    id: number;
    meatWeight: number;
    vegWeight: number;
    meatPricePer100g: number;
    vegPricePer100g: number;
    totalWeight: number;
    totalPrice: number;
    meatCookTime: number;
    vegCookTime: number;
    meatCookElapsed?: number;
    vegCookElapsed?: number;
    soupAdded: boolean;
    vegTypes: IngredientType[];
    meatTypes: IngredientType[];
    complexityScore: number;
    createdAt: number;
    cookedAt?: number;
    deliveredAt?: number;
    cookPenalty: number;
}

interface ReadyDish {
    order: OrderTicket;
    quality: QualityType;
    tags: string[];
}

interface PotSlot {
    node: Node;
    label: Label | null;
    order: OrderTicket | null;
    stage: BasketStage | null;
    cookElapsed: number;
    basket: BasketEntry | null;
    progress: Graphics | null;
    progressNode: Node | null;
    baseSiblingIndex: number;
}

interface DeliveryButton {
    node: Node;
    label: Label | null;
    button: Button | null;
    index: number;
}

interface BasketEntry {
    node: Node;
    label: Label | null;
    order: OrderTicket;
    kind: BasketKind;
    state: BasketState;
    hookIndex: number | null;
}

interface HeldBasket {
    entry: BasketEntry;
    originParent: Node | null;
    originPos: Vec3;
    originSiblingIndex: number;
}

interface SoupBowl {
    node: Node;
    label: Label | null;
    graphics: Graphics | null;
    orderId: number | null;
    fill: number;
    meatReady: boolean;
    vegReady: boolean;
}

interface ScaleTask {
    order: OrderTicket;
    duration: number;
    elapsed: number;
    basket: BasketEntry;
}

interface SelectionTask {
    duration: number;
    elapsed: number;
}

@ccclass('MalaTangController')
export class MalaTangController extends BaseCookingController implements PhonePanelDataProvider {
    @property(Node)
    uiRoot: Node | null = null;

    private heatLabel: Label | null = null;
    private waitCountLabel: Label | null = null;
    private queueCountLabel: Label | null = null;
    private readyCountLabel: Label | null = null;
    private serverStatusLabel: Label | null = null;

    private scaleLabel: Label | null = null;
    private scaleQueueLabel: Label | null = null;
    private scalePanel: Node | null = null;
    private selectionPanel: Node | null = null;
    private selectionProgressLabel: Label | null = null;
    private selectionInfoLabel: Label | null = null;

    private rawRack: Node | null = null;
    private cookedRack: Node | null = null;
    private queueRack: Node | null = null;
    private basketTemplate: Node | null = null;
    private potCircleArea: Node | null = null;
    private soupArea: Node | null = null;
    private bowlsRoot: Node | null = null;
    private bowlTemplate: Node | null = null;
    private bowlStackBtn: Node | null = null;

    private potSlotsContainer: Node | null = null;
    private potSlotTemplate: Node | null = null;
    private deliveryContainer: Node | null = null;
    private deliveryButtonTemplate: Node | null = null;

    private hireServerBtn: Node | null = null;
    private ringTossBtn: Node | null = null;
    private ladleBtn: Node | null = null;
    private ladleBtnLabel: Label | null = null;

    private condimentLabels: Map<CondimentType, Label> = new Map();
    private condimentButtons: Map<CondimentType, Node> = new Map();
    private phoneUI: PhonePanelUI | null = null;

    private readonly WAIT_CAP = 24;
    private readonly QUEUE_CAP = 18;
    private readonly POT_SLOT_CAP = 10;
    private readonly DELIVERY_VISIBLE_CAP = 6;

    private readonly HEAT_MIN_INTERVAL = 2.0;
    private readonly HEAT_MAX_INTERVAL = 10.0;
    private readonly HEAT_DEFAULT = 50;
    private readonly TARGET_ACTIVE_ORDERS = 6;
    private readonly ACTIVE_ORDER_MIN = 4;
    private readonly ACTIVE_ORDER_MAX = 9;
    private readonly ACTIVE_ORDER_HARD_CAP = 12;

    private readonly CONDIMENT_MAX = 100;
    private readonly CONDIMENT_THRESHOLD = 15;

    private readonly VEG_PRICE_PER_100G = 3;
    private readonly MEAT_PRICE_PER_100G = 6;

    private readonly VEG_WEIGHT_MIN = 180;
    private readonly VEG_WEIGHT_MAX = 420;
    private readonly MEAT_WEIGHT_MIN = 160;
    private readonly MEAT_WEIGHT_MAX = 360;

    private readonly VEG_COOK_TIME_BASE = 9.0;
    private readonly VEG_COOK_TIME_VARIANCE = 2.0;
    private readonly MEAT_COOK_TIME_BASE = 18.0;
    private readonly MEAT_COOK_TIME_VARIANCE = 3.0;

    private readonly SCALE_MIN_SECONDS = 1.0;
    private readonly SCALE_MAX_SECONDS = 2.0;
    private readonly SELECTION_MIN_SECONDS = 2.0;
    private readonly SELECTION_MAX_SECONDS = 3.5;

    private readonly SPEED_BASE_TIME = 26;
    private readonly SPEED_PER_COMPLEXITY = 2.5;
    private readonly SPEED_PER_100G = 1.2;

    private readonly SERVER_UNLOCKS = [
        { heat: 0, orders: 0 },
        { heat: 55, orders: 8 },
        { heat: 65, orders: 18 },
        { heat: 75, orders: 30 },
    ];

    private readonly vegetableTypes: IngredientType[] = MALATANG_VEG_TYPES;

    private readonly meatTypes: IngredientType[] = MALATANG_MEAT_TYPES;

    private readonly stockDefaults: { type: IngredientType; amount: number }[] = [
        ...MALATANG_VEG_TYPES.map(type => ({ type, amount: 1200 })),
        ...MALATANG_MEAT_TYPES.map(type => ({ type, amount: 900 }))
    ];

    private potSlots: PotSlot[] = [];
    private deliveryButtons: DeliveryButton[] = [];

    private basketEntries: Map<string, BasketEntry> = new Map();
    private currentScale: ScaleTask | null = null;
    private cookQueue: BasketEntry[] = [];
    private readyOrders: ReadyDish[] = [];
    private cookedOrders: Map<number, ReadyDish> = new Map();
    private selectionQueue: SelectionTask[] = [];
    private currentSelection: SelectionTask | null = null;

    private draggingBasket: BasketEntry | null = null;
    private basketDragStartPos: Vec3 = new Vec3();
    private basketDragStartParent: Node | null = null;
    private basketDragOffset: Vec3 = new Vec3();
    private basketDragStartWorld: Vec3 = new Vec3();
    private heldBaskets: HeldBasket[] = [];
    private readonly MAX_HELD_BASKETS = 2;
    private readonly HELD_BASKET_OFFSETS: Vec3[] = [
        new Vec3(60, -60, 0),
        new Vec3(120, -90, 0)
    ];
    private lastBasketPointerWorld: Vec3 | null = null;
    private basketFollowBound: boolean = false;
    private canvasCamera: Camera | null = null;
    private bowls: SoupBowl[] = [];
    private ladleFollower: Node | null = null;
    private ladleUnits: number = 0;
    private holdingLadle: boolean = false;
    private ladleInputBound: boolean = false;
    private potCircleHitTestBound: boolean = false;
    private manualTimeTick: boolean = false;
    private timeFreezeTimer: number = 0;
    private lastTimeHour: number = -1;
    private lastTimeMinute: number = -1;

    private ticketSeq: number = 1;
    private spawnTimer: number = 0;
    private serverLevel: 0 | 1 | 2 | 3 = 0;
    private serverTimer: number = 0;
    private serverBurstCooldown: number = 0;
    private completedOrders: number = 0;

    private condimentLevels: Record<CondimentType, number> = {
        sesame: 100,
        sugar: 100,
        scallion: 100,
        cilantro: 100
    };

    private businessElapsed: number = 0;
    private readonly SPAWN_RAMP_SECONDS = 90;
    private readonly DRAG_CLICK_THRESHOLD = 8;
    private readonly MIN_ACTIVE_ORDERS = 1;
    private readonly QUEUE_HOOK_OFFSET = new Vec3(0, -28, 0);
    private readonly LADLE_MAX_UNITS = 3;
    private readonly LADLE_UNIT_FILL = 1;
    private readonly MAX_BOWLS = 6;

    protected getRecipe(): any {
        return { levelId: 4, name: '麻辣烫', ingredients: [] };
    }

    protected initCookingArea(): void {
        this.ensureNodes();
        this.ensureInitialStock();
        this.resetRackNodes();
        this.buildPotSlots();
        this.buildDeliveryButtons();
        this.bindControls();
        this.resetHeat();
        this.updateAllDisplays();
        this.ensureMinimumOrders();
        this.showMessage('麻辣烫营业开始：先选菜→称重→下锅，肉先菜后，出锅去加汤再报号');
    }

    protected onIngredientClick(_ingredientType: IngredientType): void {
        // 本关不使用点击食材按钮流程
    }

    protected checkFoodComplete(): any | null {
        return null;
    }

    protected calculateFoodQuality(): number {
        return 0;
    }

    public updateMoneyDisplay(): void {
        const wallet = InventoryManager.instance?.globalWallet ?? this.totalMoney;
        if (this.moneyLabel) {
            this.moneyLabel.string = `￥${wallet}`;
        }
        this.phoneUI?.updateMainScreenData();
    }

    public updateReviewDisplay(): void {
        const heat = this.reviewSystem.shopHeat;
        if (this.heatLabel) {
            this.heatLabel.string = `热度: ${heat}`;
        }
        this.phoneUI?.updateMainScreenData();
    }

    public onPhoneButtonClick(): void {
        if (!this.phonePanel) {
            this.phonePanel = this.node.scene?.getChildByName('PhonePanel') || null;
        }
        if (!this.phonePanel) {
            console.warn('[MalaTangController] 手机面板未绑定');
            return;
        }

        this.phonePanel.active = !this.phonePanel.active;

        const timeManager = TimeManager.instance;
        if (timeManager) {
            if (this.phonePanel.active) {
                timeManager.pauseTime();
            } else {
                timeManager.resumeTime();
            }
        }

        if (this.phonePanel.active) {
            this.updatePhonePanelDisplay();
        } else {
            this.unschedule(this.updatePhoneTimeDisplay);
        }
    }

    update(dt: number): void {
        if (!this.isBusinessOpen) return;
        this.ensureTimeProgress(dt);

        this.spawnTimer += dt;
        this.businessElapsed += dt;
        this.serverBurstCooldown = Math.max(0, this.serverBurstCooldown - dt);

        const interval = this.getSpawnInterval();
        if (!Number.isFinite(interval)) {
            this.spawnTimer = 0;
        } else if (this.spawnTimer >= interval) {
            this.spawnTimer -= interval;
            this.trySpawnOrder();
        }

        this.updateSelectionProcess(dt);
        this.updateScaleProcess(dt);
        this.updatePotCooking(dt);
        this.updateServerDelivery(dt);
        this.ensureMinimumOrders();
    }

    private ensureTimeProgress(dt: number): void {
        const timeManager = TimeManager.instance;
        if (!timeManager) return;

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

        if (this.manualTimeTick) {
            timeManager.update(dt);
            this.lastTimeHour = timeManager.getCurrentHour();
            this.lastTimeMinute = timeManager.getCurrentMinute();
        }
    }

    protected onDestroy(): void {
        this.unschedule(this.updatePhoneTimeDisplay);
        if (this.ladleInputBound) {
            input.off(Input.EventType.MOUSE_MOVE, this.onLadlePointerMove, this);
            input.off(Input.EventType.TOUCH_MOVE, this.onLadlePointerMove, this);
        }
        if (this.basketFollowBound) {
            input.off(Input.EventType.MOUSE_MOVE, this.onBasketPointerMove, this);
            input.off(Input.EventType.TOUCH_MOVE, this.onBasketPointerMove, this);
        }
    }

    private ensureNodes(): void {
        const canvas = this.uiRoot || this.node.scene?.getChildByName('Canvas');
        this.uiRoot = canvas || null;
        if (canvas) {
            this.moneyLabel = this.moneyLabel || canvas.getChildByName('MoneyLabel')?.getComponent(Label) || null;
            this.heatLabel = this.heatLabel || canvas.getChildByName('ReviewLabel')?.getComponent(Label) || null;
        }
        if (!this.phonePanel) {
            this.phonePanel = this.node.scene?.getChildByName('PhonePanel') || null;
        }

        this.waitCountLabel = this.getLabel('Canvas/MalaTangUI/StatsPanel/WaitCountLabel');
        this.queueCountLabel = this.getLabel('Canvas/MalaTangUI/StatsPanel/QueueCountLabel');
        this.readyCountLabel = this.getLabel('Canvas/MalaTangUI/StatsPanel/ReadyCountLabel');
        this.serverStatusLabel = this.getLabel('Canvas/MalaTangUI/ControlsPanel/ServerStatusLabel');

        this.scaleLabel = this.getLabel('Canvas/MalaTangUI/ScalePanel/ScaleLabel');
        this.scaleQueueLabel = this.getLabel('Canvas/MalaTangUI/ScalePanel/ScaleQueueLabel');
        this.scalePanel = this.getNode('Canvas/MalaTangUI/ScalePanel');
        this.selectionPanel = this.getNode('Canvas/MalaTangUI/SelectionPanel');
        this.selectionProgressLabel = this.getLabel('Canvas/MalaTangUI/SelectionPanel/SelectionProgressLabel');
        this.selectionInfoLabel = this.getLabel('Canvas/MalaTangUI/SelectionPanel/SelectionInfoLabel');

        this.rawRack = this.getNode('Canvas/MalaTangUI/BasketRack/RawRack');
        this.cookedRack = this.getNode('Canvas/MalaTangUI/BasketRack/CookedRack');
        this.queueRack = this.getNode('Canvas/MalaTangUI/QueueRack');
        this.basketTemplate = this.getNode('Canvas/MalaTangUI/BasketRack/RawRack/BasketTemplate');
        this.potCircleArea = this.getNode('Canvas/MalaTangUI/PotCircleArea');
        this.soupArea = this.getNode('Canvas/MalaTangUI/SoupArea');
        this.bowlsRoot = this.getNode('Canvas/MalaTangUI/SoupArea/BowlsRoot');
        this.bowlTemplate = this.getNode('Canvas/MalaTangUI/SoupArea/BowlsRoot/BowlTemplate');
        this.bowlStackBtn = this.getNode('Canvas/MalaTangUI/SoupArea/BowlStackBtn');

        this.potSlotsContainer = this.getNode('Canvas/MalaTangUI/PotSlotsPanel');
        this.potSlotTemplate = this.getNode('Canvas/MalaTangUI/PotSlotsPanel/PotSlotTemplate');
        this.deliveryContainer = this.getNode('Canvas/MalaTangUI/DeliveryPanel');
        this.deliveryButtonTemplate = this.getNode('Canvas/MalaTangUI/DeliveryPanel/DeliveryButtonTemplate');

        this.hireServerBtn = this.getNode('Canvas/MalaTangUI/ControlsPanel/HireServerBtn');
        this.ringTossBtn = this.getNode('Canvas/MalaTangUI/ControlsPanel/RingTossBtn')
            || this.getNode('Canvas/MalaTangUI/RingTossBtn');
        this.ladleBtn = this.getNode('Canvas/MalaTangUI/ControlsPanel/LadleBtn');
        this.ladleBtnLabel = this.ladleBtn?.getComponent(Label) ?? this.ladleBtn?.getComponentInChildren(Label) ?? null;

        this.bindCondimentNode('sesame', 'Sesame');
        this.bindCondimentNode('sugar', 'Sugar');
        this.bindCondimentNode('scallion', 'Scallion');
        this.bindCondimentNode('cilantro', 'Cilantro');

        if (this.selectionInfoLabel) {
            this.selectionInfoLabel.node.active = false;
        }
        this.ensureLadleFollower();
    }

    private updatePhonePanelDisplay(): void {
        if (!this.phonePanel) return;
        if (!this.phonePanel.getComponent(UITransform)) {
            this.phonePanel.addComponent(UITransform);
        }
        if (!this.phoneUI) {
            this.phoneUI = new PhonePanelUI(this.phonePanel, this);
        }
        this.phoneUI.init();
        this.phoneUI.updateMainScreenData();
        this.phoneUI.updateMessageBadge();
        this.phoneUI.updateTimeDisplay();
        this.phoneUI.showScreen('main');
        this.unschedule(this.updatePhoneTimeDisplay);
        this.schedule(this.updatePhoneTimeDisplay, 1.0);
    }

    private updatePhoneTimeDisplay(): void {
        this.phoneUI?.updateTimeDisplay();
    }

    public getSuperGoodReviews(): number {
        return this.reviewSystem.superGoodReviews;
    }

    public getGoodReviews(): number {
        return this.reviewSystem.goodReviews;
    }

    public getBadReviews(): number {
        return this.reviewSystem.badReviews;
    }

    public getAverageScore(): number {
        const summary = this.getScoreSummary();
        if (summary.count === 0) return 0;
        return summary.total / summary.count;
    }

    public getAllScoresCount(): number {
        return this.getScoreSummary().count;
    }

    public getReviewHistory(): Array<{type: 'super' | 'good' | 'bad', text: string, score: number, timestamp: number}> {
        const history = this.reviewSystem.reviewHistory.slice().reverse();
        return history.map((record) => {
            const type = record.type === 'super_good' ? 'super' : record.type;
            const score = typeof record.score === 'number' ? record.score : this.getReviewScore(record.type);
            return {
                type,
                text: record.content || '',
                score,
                timestamp: record.timestamp
            };
        });
    }

    public getShopHeat(): number {
        return this.reviewSystem.shopHeat;
    }

    public getShopHeatLevel(): { emoji: string, level: string } {
        const heat = this.reviewSystem.shopHeat;
        if (heat >= 80) {
            return { level: '火爆', emoji: '\uD83D\uDD25\uD83D\uDD25\uD83D\uDD25' };
        }
        if (heat >= 60) {
            return { level: '热门', emoji: '\uD83D\uDD25\uD83D\uDD25' };
        }
        if (heat >= 40) {
            return { level: '正常', emoji: '\uD83D\uDD25' };
        }
        if (heat >= 20) {
            return { level: '冷清', emoji: '\u2744\uFE0F' };
        }
        return { level: '萧条', emoji: '\uD83D\uDC80' };
    }

    public getTotalMoney(): number {
        const inventory = InventoryManager.instance;
        if (inventory) return inventory.globalWallet;
        return this.totalMoney;
    }

    public getEventMessages(): Array<{id: string, sender: string, senderIcon: string, content: string, time: string, eventId?: string, isRead: boolean}> {
        return [];
    }

    public onResetGame(): void {
        if (this.phonePanel) {
            this.phonePanel.active = false;
        }
        director.loadScene('Level4CookingScene');
    }

    private getScoreSummary(): { total: number; count: number } {
        let total = 0;
        let count = 0;
        for (const record of this.reviewSystem.reviewHistory) {
            const score = typeof record.score === 'number' ? record.score : this.getReviewScore(record.type);
            total += score;
            count += 1;
        }
        return { total, count };
    }

    private getReviewScore(type: 'super_good' | 'good' | 'bad'): number {
        if (type === 'super_good') return 5;
        if (type === 'good') return 4;
        return 2;
    }

    private bindCondimentNode(type: CondimentType, prefix: string): void {
        const label = this.getLabel(`Canvas/MalaTangUI/CondimentPanel/${prefix}Label`);
        const buttonNode = this.getNode(`Canvas/MalaTangUI/CondimentPanel/${prefix}Btn`);
        if (label) this.condimentLabels.set(type, label);
        if (buttonNode) this.condimentButtons.set(type, buttonNode);
    }

    private getNode(path: string): Node | null {
        const node = find(path);
        return node ?? null;
    }

    private getLabel(path: string): Label | null {
        const node = this.getNode(path);
        return node ? node.getComponent(Label) : null;
    }

    private ensureLadleFollower(): void {
        if (this.ladleFollower && this.ladleFollower.isValid) return;
        const canvas = this.uiRoot || this.node.scene?.getChildByName('Canvas');
        if (!canvas) return;
        const existing = canvas.getChildByName('LadleFollower');
        if (existing) {
            this.ladleFollower = existing;
            if (!existing.getComponent(UITransform)) {
                existing.addComponent(UITransform);
            }
            if (!existing.getComponent(Label)) {
                const label = existing.addComponent(Label);
                label.fontSize = 32;
                label.lineHeight = 34;
            }
            existing.active = false;
            return;
        }
        const node = new Node('LadleFollower');
        if (!node.getComponent(UITransform)) {
            node.addComponent(UITransform);
        }
        const label = node.addComponent(Label);
        label.string = '🥄';
        label.fontSize = 32;
        label.lineHeight = 34;
        node.active = false;
        node.setParent(canvas);
        this.ladleFollower = node;
    }

    private ensureInitialStock(): void {
        const inventory = InventoryManager.instance;
        if (!inventory) return;

        if (inventory.currentLevel?.levelId !== 4) {
            inventory.initLevel(4);
        }

        const hasAny = this.stockDefaults.some(cfg => inventory.getAvailableCount(cfg.type) > 0);
        if ((PREVIEW || EDITOR || DEV) && !hasAny) {
            for (const cfg of this.stockDefaults) {
                inventory.adjustProcessedIngredient(cfg.type, cfg.amount);
            }
        }

        inventory.debugSeedMalaTangInventoryIfEmpty();
    }

    private resetRackNodes(): void {
        this.basketEntries.clear();
        this.currentScale = null;
        this.cookQueue = [];
        this.readyOrders = [];
        this.cookedOrders.clear();
        this.selectionQueue = [];
        this.currentSelection = null;
        this.releaseAllHeldBaskets(false);
        this.resetBowls();
        this.clearRackBaskets(this.rawRack);
        this.clearRackBaskets(this.cookedRack);
        this.clearRackBaskets(this.queueRack);
        if (this.basketTemplate) {
            this.basketTemplate.active = false;
        }
    }

    private clearRackBaskets(rack: Node | null): void {
        if (!rack) return;
        for (const child of rack.children.slice()) {
            if (child.name.startsWith('Basket_')) {
                child.destroy();
            }
        }
    }

    private resetBowls(): void {
        this.bowls = [];
        this.ladleUnits = 0;
        this.holdingLadle = false;
        if (this.ladleFollower) {
            this.ladleFollower.active = false;
        }
        if (!this.bowlsRoot) return;
        for (const child of this.bowlsRoot.children.slice()) {
            if (child.name.startsWith('Bowl_')) {
                child.destroy();
            }
        }
        if (this.bowlTemplate) {
            this.bowlTemplate.active = false;
        }
        this.updateLadleDisplay();
    }

    private buildPotSlots(): void {
        if (!this.potSlotsContainer || !this.potSlotTemplate) return;
        this.potSlots = [];
        this.potSlotsContainer.removeAllChildren();
        this.potSlotsContainer.addChild(this.potSlotTemplate);
        this.potSlotTemplate.active = false;
        const circleInfo = this.getPotCircleInfo();
        const useCircle = circleInfo !== null;
        const cols = 5;
        const spacingX = 140;
        const spacingY = 60;
        const startX = -((cols - 1) * spacingX) / 2;
        const startY = 40;

        for (let i = 0; i < this.POT_SLOT_CAP; i++) {
            const node = instantiate(this.potSlotTemplate);
            node.active = true;
            node.name = `PotSlot${i + 1}`;
            node.setParent(this.potSlotsContainer);
            if (useCircle && circleInfo) {
                const angle = (Math.PI * 2 * i) / this.POT_SLOT_CAP - Math.PI / 2;
                node.setPosition(new Vec3(
                    circleInfo.center.x + Math.cos(angle) * circleInfo.radius,
                    circleInfo.center.y + Math.sin(angle) * circleInfo.radius,
                    0
                ));
            } else {
                const col = i % cols;
                const row = Math.floor(i / cols);
                node.setPosition(new Vec3(startX + col * spacingX, startY - row * spacingY, 0));
            }

            const label = node.getComponent(Label) || node.getComponentInChildren(Label);
            const progressNode = node.getChildByName('ProgressBar');
            const progress = progressNode?.getComponent(Graphics) ?? null;
            if (label) {
                label.string = `空位 ${i + 1}`;
            }

            const button = node.getComponent(Button);
            if (button) {
                node.on(Button.EventType.CLICK, () => this.onPotSlotClick(i), this);
            }

            this.potSlots.push({
                node,
                label: label || null,
                order: null,
                stage: null,
                cookElapsed: 0,
                basket: null,
                progress,
                progressNode: progressNode || null,
                baseSiblingIndex: node.getSiblingIndex()
            });
        }
    }

    private buildDeliveryButtons(): void {
        if (!this.deliveryContainer || !this.deliveryButtonTemplate) return;
        this.deliveryButtons = [];
        this.deliveryContainer.removeAllChildren();
        this.deliveryContainer.addChild(this.deliveryButtonTemplate);
        this.deliveryButtonTemplate.active = false;

        const cols = 3;
        const spacingX = 140;
        const spacingY = 60;
        const startX = -((cols - 1) * spacingX) / 2;
        const startY = 40;

        for (let i = 0; i < this.DELIVERY_VISIBLE_CAP; i++) {
            const node = instantiate(this.deliveryButtonTemplate);
            node.active = true;
            node.name = `DeliveryBtn${i + 1}`;
            node.setParent(this.deliveryContainer);
            const col = i % cols;
            const row = Math.floor(i / cols);
            node.setPosition(new Vec3(startX + col * spacingX, startY - row * spacingY, 0));

            const label = node.getComponent(Label) || node.getComponentInChildren(Label);
            if (label) {
                label.string = '--';
            }

            const button = node.getComponent(Button);
            if (button) {
                node.on(Button.EventType.CLICK, () => this.onDeliveryClick(i), this);
            }

            this.deliveryButtons.push({
                node,
                label: label || null,
                button: button || null,
                index: i
            });
        }
    }

    private bindControls(): void {
        if (this.hireServerBtn) {
            this.hireServerBtn.on(Button.EventType.CLICK, () => this.upgradeServer(), this);
        }
        if (this.ringTossBtn) {
            this.ringTossBtn.on(Button.EventType.CLICK, () => this.onRingToss(), this);
        }
        if (this.ladleBtn) {
            this.ladleBtn.on(Button.EventType.CLICK, () => this.toggleLadle(), this);
        }
        if (this.bowlStackBtn) {
            this.bowlStackBtn.on(Button.EventType.CLICK, () => this.spawnBowl(), this);
        }
        if (this.selectionPanel) {
            this.selectionPanel.on(Node.EventType.MOUSE_ENTER, () => this.setSelectionInfoVisible(true), this);
            this.selectionPanel.on(Node.EventType.MOUSE_LEAVE, () => this.setSelectionInfoVisible(false), this);
        }
        if (this.potCircleArea) {
            this.potCircleArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onPotCircleTouch(event), this);
        }
        if (this.soupArea) {
            this.soupArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onSoupAreaTouch(event), this);
        }

        this.condimentButtons.forEach((node, type) => {
            node.on(Button.EventType.CLICK, () => this.refillCondiment(type), this);
        });

        this.bindLadleInput();
        this.configurePotCircleHitTest();
    }

    private resetHeat(): void {
        this.reviewSystem.setHeat(this.HEAT_DEFAULT);
        this.updateReviewDisplay();
    }

    private updateAllDisplays(): void {
        this.updateMoneyDisplay();
        this.updateReviewDisplay();
        this.updateCounts();
        this.updateCondimentDisplay();
        this.updateServerStatus();
        this.refreshDeliveryButtons();
        this.updatePotSlotLabels();
        this.updateScaleDisplay();
        this.updateSelectionDisplay();
        this.updateLadleDisplay();
    }

    private updateCounts(): void {
        const waitingCount = this.getWaitingCount();
        const selectionCount = this.getSelectionCount();
        const queueBasketCount = this.getQueueBasketCount();
        if (this.waitCountLabel) {
            this.waitCountLabel.string = `选菜: ${selectionCount}  待称重: ${waitingCount}/${this.WAIT_CAP}`;
        }
        if (this.queueCountLabel) {
            this.queueCountLabel.string = `待下锅: ${queueBasketCount}`;
        }
        if (this.readyCountLabel) {
            const soupPending = this.cookedOrders.size;
            const deliverable = this.readyOrders.length;
            this.readyCountLabel.string = `待报号: ${deliverable} / 待加汤: ${soupPending}`;
        }
    }

    private getWaitingCount(): number {
        let count = 0;
        this.basketEntries.forEach((entry) => {
            if (entry.kind === 'mix' && (entry.state === 'pending' || entry.state === 'weighing')) {
                count += 1;
            }
        });
        return count;
    }

    private getSelectionCount(): number {
        return this.selectionQueue.length + (this.currentSelection ? 1 : 0);
    }

    private bindLadleInput(): void {
        if (this.ladleInputBound) return;
        this.ladleInputBound = true;
        input.on(Input.EventType.MOUSE_MOVE, this.onLadlePointerMove, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onLadlePointerMove, this);
    }

    private onLadlePointerMove(event: EventMouse | EventTouch): void {
        if (!this.holdingLadle || !this.ladleFollower) return;
        const camera = this.getCanvasCamera();
        if (!camera) return;
        const screenPos = event.getLocation();
        const worldPos = camera.screenToWorld(new Vec3(screenPos.x, screenPos.y, 0));
        this.ladleFollower.setWorldPosition(worldPos);
    }

    private bindBasketFollowInput(): void {
        if (this.basketFollowBound) return;
        this.basketFollowBound = true;
        input.on(Input.EventType.MOUSE_MOVE, this.onBasketPointerMove, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onBasketPointerMove, this);
    }

    private onBasketPointerMove(event: EventMouse | EventTouch): void {
        if (this.heldBaskets.length === 0) return;
        const camera = this.getCanvasCamera();
        if (!camera) return;
        const screenPos = event.getLocation();
        const worldPos = camera.screenToWorld(new Vec3(screenPos.x, screenPos.y, 0));
        if (!this.lastBasketPointerWorld) {
            this.lastBasketPointerWorld = new Vec3(worldPos.x, worldPos.y, worldPos.z);
        } else {
            this.lastBasketPointerWorld.set(worldPos);
        }
        this.updateHeldBasketPositions(worldPos);
    }

    private updateHeldBasketPositions(worldPos: Vec3): void {
        for (let i = 0; i < this.heldBaskets.length; i++) {
            const held = this.heldBaskets[i];
            const offset = this.HELD_BASKET_OFFSETS[Math.min(i, this.HELD_BASKET_OFFSETS.length - 1)];
            held.entry.node.setWorldPosition(
                worldPos.x + offset.x,
                worldPos.y + offset.y,
                worldPos.z + offset.z
            );
        }
    }

    private refreshHeldBasketPositions(): void {
        if (!this.lastBasketPointerWorld) return;
        this.updateHeldBasketPositions(this.lastBasketPointerWorld);
    }

    private isBasketHeld(entry: BasketEntry): boolean {
        return this.heldBaskets.some(held => held.entry === entry);
    }

    private holdBasket(entry: BasketEntry, event?: EventTouch): boolean {
        if (this.isBasketHeld(entry)) return true;
        if (this.heldBaskets.length >= this.MAX_HELD_BASKETS) {
            this.showMessage('手里最多只能拿2份');
            return false;
        }

        this.draggingBasket = null;
        const originParent = entry.node.parent;
        const originPos = new Vec3(entry.node.position.x, entry.node.position.y, entry.node.position.z);
        const originSiblingIndex = entry.node.getSiblingIndex();

        const worldPos = new Vec3();
        entry.node.getWorldPosition(worldPos);
        const canvas = this.uiRoot || this.node.scene?.getChildByName('Canvas');
        if (canvas) {
            entry.node.setParent(canvas);
            entry.node.setWorldPosition(worldPos);
        }
        if (!event) {
            if (!this.lastBasketPointerWorld) {
                this.lastBasketPointerWorld = new Vec3(worldPos.x, worldPos.y, worldPos.z);
            } else {
                this.lastBasketPointerWorld.set(worldPos);
            }
        }

        this.heldBaskets.push({
            entry,
            originParent,
            originPos,
            originSiblingIndex
        });

        this.bindBasketFollowInput();
        if (event) {
            this.onBasketPointerMove(event);
        } else {
            this.refreshHeldBasketPositions();
        }
        return true;
    }

    private toggleHoldBasket(entry: BasketEntry, event?: EventTouch): void {
        if (this.isBasketHeld(entry)) {
            this.releaseHeldBasket(entry, true);
            return;
        }
        this.holdBasket(entry, event);
    }

    private releaseHeldBasket(entry: BasketEntry, restoreToOrigin: boolean): void {
        const index = this.heldBaskets.findIndex(held => held.entry === entry);
        if (index < 0) return;
        const held = this.heldBaskets[index];
        this.heldBaskets.splice(index, 1);

        if (restoreToOrigin && held.originParent && held.originParent.isValid) {
            held.entry.node.setParent(held.originParent);
            held.entry.node.setPosition(held.originPos);
            const maxIndex = held.originParent.children.length - 1;
            if (held.originSiblingIndex >= 0 && maxIndex >= 0) {
                held.entry.node.setSiblingIndex(Math.min(held.originSiblingIndex, maxIndex));
            }
            this.arrangeRack(held.originParent);
        }

        if (this.heldBaskets.length === 0) {
            this.lastBasketPointerWorld = null;
        } else {
            this.refreshHeldBasketPositions();
        }
    }

    private releaseAllHeldBaskets(restoreToOrigin: boolean): void {
        const entries = this.heldBaskets.map(held => held.entry);
        for (const entry of entries) {
            this.releaseHeldBasket(entry, restoreToOrigin);
        }
        this.lastBasketPointerWorld = null;
    }

    private getHeldBasketByState(state: BasketState): BasketEntry | null {
        for (const held of this.heldBaskets) {
            if (held.entry.state === state) return held.entry;
        }
        return null;
    }

    private onSoupAreaTouch(event: EventTouch): void {
        if (this.holdingLadle) return;
        const entry = this.getHeldBasketByState('cooked');
        if (!entry) return;
        if (this.applySoup(entry)) {
            event.propagationStopped = true;
        }
    }

    private toggleLadle(): void {
        this.holdingLadle = !this.holdingLadle;
        if (this.ladleFollower) {
            this.ladleFollower.active = this.holdingLadle;
        }
        this.updateLadleDisplay();
    }

    private updateLadleDisplay(): void {
        if (this.ladleBtnLabel) {
            const suffix = this.holdingLadle ? `(${this.ladleUnits}/${this.LADLE_MAX_UNITS})` : '';
            this.ladleBtnLabel.string = `🥄盛汤${suffix}`;
        }
        if (this.ladleFollower) {
            const label = this.ladleFollower.getComponent(Label);
            if (label) {
                label.string = this.holdingLadle ? `🥄${this.ladleUnits}` : '🥄';
            }
        }
    }

    private configurePotCircleHitTest(): void {
        if (this.potCircleHitTestBound) return;
        if (!this.potCircleArea) return;
        const transform = this.potCircleArea.getComponent(UITransform);
        if (!transform) return;
        const originalHitTest = transform.hitTest.bind(transform);
        const self = this;
        transform.hitTest = function(screenPoint: Vec2, windowId?: number): boolean {
            if (!self.holdingLadle) return false;
            return originalHitTest(screenPoint, windowId);
        };
        this.potCircleHitTestBound = true;
    }

    private onPotCircleTouch(event: EventTouch): void {
        if (!this.holdingLadle) return;
        if (this.ladleUnits >= this.LADLE_MAX_UNITS) {
            this.showMessage('勺子已满');
            return;
        }
        this.ladleUnits += 1;
        this.updateLadleDisplay();
        event.propagationStopped = true;
    }

    private spawnBowl(): void {
        if (!this.bowlTemplate || !this.bowlsRoot) return;
        if (this.bowls.length >= this.MAX_BOWLS) {
            this.showMessage('碗已满（最多6个）');
            return;
        }
        const node = instantiate(this.bowlTemplate);
        node.active = true;
        node.name = `Bowl_${this.bowls.length + 1}`;
        node.setParent(this.bowlsRoot);

        const label = this.ensureBowlLabel(node);
        const graphics = node.getComponent(Graphics) ?? null;
        const bowl: SoupBowl = {
            node,
            label,
            graphics,
            orderId: null,
            fill: 0,
            meatReady: false,
            vegReady: false
        };

        node.on(Node.EventType.TOUCH_END, (event: EventTouch) => this.onBowlTouch(bowl, event), this);
        this.bowls.push(bowl);
        this.updateBowlDisplay(bowl);
        this.arrangeBowls();
    }

    private arrangeBowls(): void {
        if (!this.bowlsRoot) return;
        const cols = 3;
        const spacingX = 110;
        const spacingY = 80;
        const startX = -((cols - 1) * spacingX) / 2;
        const startY = 40;

        for (let i = 0; i < this.bowls.length; i++) {
            const bowl = this.bowls[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            bowl.node.setPosition(new Vec3(startX + col * spacingX, startY - row * spacingY, 0));
        }
    }

    private updateBowlDisplay(bowl: SoupBowl): void {
        if (bowl.label) {
            if (bowl.orderId == null) {
                bowl.label.string = '空碗';
            } else {
                const meatTag = bowl.meatReady ? '肉✓' : '肉×';
                const vegTag = bowl.vegReady ? '菜✓' : '菜×';
                const percent = Math.floor(Math.min(1, bowl.fill) * 100);
                bowl.label.string = `#${bowl.orderId}\n${meatTag} ${vegTag}\n汤:${percent}%`;
            }
        }
        this.drawBowl(bowl);
    }

    private ensureBowlLabel(node: Node): Label | null {
        let labelNode = node.getChildByName('BowlLabel');
        if (!labelNode) {
            labelNode = new Node('BowlLabel');
            labelNode.setParent(node);
            labelNode.setPosition(0, 0, 0);
            labelNode.layer = node.layer;
        }
        let label = labelNode.getComponent(Label);
        if (!label) {
            if (!labelNode.getComponent(UITransform)) {
                labelNode.addComponent(UITransform);
            }
            label = labelNode.addComponent(Label);
            label.fontSize = 18;
            label.lineHeight = 20;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.useSystemFont = true;
        }
        label.color = new Color(30, 30, 30, 255);
        return label;
    }

    private drawBowl(bowl: SoupBowl): void {
        if (!bowl.graphics) return;
        const transform = bowl.node.getComponent(UITransform);
        const width = transform?.contentSize.width ?? 80;
        const height = transform?.contentSize.height ?? 60;
        const radius = 8;

        const g = bowl.graphics;
        g.clear();
        g.fillColor = new Color(255, 255, 255, 220);
        g.roundRect(-width / 2, -height / 2, width, height, radius);
        g.fill();
        g.strokeColor = new Color(200, 200, 200, 255);
        g.lineWidth = 2;
        g.roundRect(-width / 2, -height / 2, width, height, radius);
        g.stroke();

        const fillHeight = (height - 8) * Math.max(0, Math.min(1, bowl.fill));
        if (fillHeight > 0) {
            g.fillColor = new Color(230, 126, 34, 220);
            g.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, fillHeight, 6);
            g.fill();
        }
    }

    private getOrAssignBowl(orderId: number): SoupBowl | null {
        const existing = this.bowls.find(bowl => bowl.orderId === orderId);
        if (existing) return existing;
        const empty = this.bowls.find(bowl => bowl.orderId == null);
        if (!empty) return null;
        empty.orderId = orderId;
        empty.fill = 0;
        empty.meatReady = false;
        empty.vegReady = false;
        this.updateBowlDisplay(empty);
        return empty;
    }

    private onBowlTouch(bowl: SoupBowl, event: EventTouch): void {
        if (!this.holdingLadle) {
            this.showMessage('先拿勺子');
            return;
        }
        if (this.ladleUnits <= 0) {
            this.showMessage('先从锅里盛汤');
            return;
        }
        if (bowl.orderId == null) {
            this.showMessage('空碗无法加汤');
            return;
        }
        if (bowl.fill >= 1) {
            this.showMessage('已加汤');
            return;
        }

        bowl.fill = 1;
        this.ladleUnits = Math.max(0, this.ladleUnits - 1);
        this.updateBowlDisplay(bowl);
        this.updateLadleDisplay();
        this.tryCompleteSoup(bowl);
        event.propagationStopped = true;
    }

    private tryCompleteSoup(bowl: SoupBowl): void {
        if (bowl.orderId == null) return;
        if (bowl.fill < 1) return;
        if (!bowl.meatReady || !bowl.vegReady) return;
        const ready = this.cookedOrders.get(bowl.orderId);
        if (!ready) return;

        ready.order.soupAdded = true;
        this.cookedOrders.delete(bowl.orderId);
        this.readyOrders.push(ready);
        this.removeBowl(bowl);
        this.refreshDeliveryButtons();
        this.updateCounts();
        this.showMessage(`#${ready.order.id} 加汤完成，可报号`);
    }

    private removeBowl(bowl: SoupBowl): void {
        const index = this.bowls.indexOf(bowl);
        if (index >= 0) {
            this.bowls.splice(index, 1);
        }
        bowl.node.destroy();
        this.arrangeBowls();
    }

    private getBasketKey(orderId: number, kind: BasketKind): string {
        return `${orderId}_${kind}`;
    }

    private registerBasket(entry: BasketEntry): void {
        this.basketEntries.set(this.getBasketKey(entry.order.id, entry.kind), entry);
    }

    private removeBasket(entry: BasketEntry): void {
        this.basketEntries.delete(this.getBasketKey(entry.order.id, entry.kind));
    }

    private getBasketEntry(orderId: number, kind: BasketKind): BasketEntry | null {
        return this.basketEntries.get(this.getBasketKey(orderId, kind)) ?? null;
    }

    private getBasketsByOrder(orderId: number): BasketEntry[] {
        const result: BasketEntry[] = [];
        this.basketEntries.forEach((entry) => {
            if (entry.order.id === orderId) {
                result.push(entry);
            }
        });
        return result;
    }

    private getQueueBasketCount(): number {
        let count = 0;
        this.basketEntries.forEach((entry) => {
            if (entry.kind !== 'mix' && entry.state === 'weighed') count += 1;
        });
        return count;
    }

    private getQueueOrderCount(): number {
        const orderSet = new Set<number>();
        this.basketEntries.forEach((entry) => {
            if (entry.kind !== 'mix' && entry.state === 'weighed') {
                orderSet.add(entry.order.id);
            }
        });
        return orderSet.size;
    }

    private getActiveOrderCount(): number {
        let count = this.getSelectionCount();
        count += this.getWaitingCount();
        count += this.getQueueBasketCount();
        count += this.readyOrders.length;
        count += this.cookedOrders.size;
        for (const slot of this.potSlots) {
            if (slot.order) count += 1;
        }
        return count;
    }

    private isMinigameActive(): boolean {
        const ringPanel = find('Canvas/RingTossPanel');
        return !!ringPanel && ringPanel.active;
    }

    private ensureMinimumOrders(): void {
        if (this.isMinigameActive()) return;
        if (this.getActiveOrderCount() >= this.MIN_ACTIVE_ORDERS) return;
        if (this.getWaitingCount() + this.getSelectionCount() >= this.WAIT_CAP) return;
        if (this.getQueueOrderCount() >= this.QUEUE_CAP) return;
        this.enqueueSelection();
        this.updateCounts();
    }

    private updateScaleDisplay(): void {
        if (this.scaleQueueLabel) {
            this.scaleQueueLabel.string = '拖动菜篮到称重台';
        }

        if (!this.scaleLabel) return;

        if (!this.currentScale) {
            this.scaleLabel.string = '称重台: 空闲';
            return;
        }

        const remain = Math.max(0, this.currentScale.duration - this.currentScale.elapsed);
        this.scaleLabel.string = `称重中 #${this.currentScale.order.id} ${remain.toFixed(1)}s`;
    }

    private updateCondimentDisplay(): void {
        this.condimentLabels.forEach((label, type) => {
            const value = Math.round(this.condimentLevels[type]);
            label.string = `${this.getCondimentName(type)}: ${value}`;
        });
    }
    
    private updateSelectionDisplay(): void {
        if (!this.selectionProgressLabel) return;
        if (!this.currentSelection) {
            const pending = this.selectionQueue.length;
            this.selectionProgressLabel.string = pending > 0 ? `选菜队列: ${pending}` : '选菜区: 空闲';
            if (this.selectionInfoLabel?.node.active) {
                this.selectionInfoLabel.string = this.getSelectionInfoText();
            }
            return;
        }
        const percent = Math.min(100, Math.floor((this.currentSelection.elapsed / this.currentSelection.duration) * 100));
        const pending = this.selectionQueue.length;
        const suffix = pending > 0 ? ` | 排队 ${pending}` : '';
        this.selectionProgressLabel.string = `选菜中 ${percent}%${suffix}`;
        if (this.selectionInfoLabel?.node.active) {
            this.selectionInfoLabel.string = this.getSelectionInfoText();
        }
    }

    private setSelectionInfoVisible(visible: boolean): void {
        if (!this.selectionInfoLabel) return;
        if (visible) {
            this.selectionInfoLabel.string = this.getSelectionInfoText();
            this.selectionInfoLabel.node.active = true;
        } else {
            this.selectionInfoLabel.node.active = false;
        }
    }

    private updateServerStatus(): void {
        if (!this.serverStatusLabel) return;
        if (this.serverLevel === 0) {
            const unlock = this.getServerUnlockInfo(1);
            const cost = this.getServerHireCost(1);
            if (this.canUnlockServer(1)) {
                this.serverStatusLabel.string = `服务员: 可雇佣 Lv1 (￥${cost})`;
            } else {
                this.serverStatusLabel.string = `服务员: 未雇佣 (热度${this.reviewSystem.shopHeat}/${unlock.heat}, 订单${this.completedOrders}/${unlock.orders})`;
            }
            return;
        }

        if (this.serverLevel < 3) {
            const next = (this.serverLevel + 1) as 1 | 2 | 3;
            const unlock = this.getServerUnlockInfo(next);
            this.serverStatusLabel.string = `服务员: Lv${this.serverLevel} (下级需热度${unlock.heat}, 订单${unlock.orders})`;
            return;
        }

        this.serverStatusLabel.string = '服务员: Lv3 (满级)';
    }

    private getCondimentName(type: CondimentType): string {
        switch (type) {
            case 'sesame': return '芝麻酱';
            case 'sugar': return '白糖';
            case 'scallion': return '葱花';
            case 'cilantro': return '香菜';
        }
    }

    private getIngredientName(type: IngredientType): string {
        const data = GameConfig.INGREDIENTS_CONFIG[type];
        return data?.name ?? `${type}`;
    }

    private getSelectionInfoText(): string {
        const inventory = InventoryManager.instance;
        if (!inventory) return '库存未就绪';

        const vegLines = this.vegetableTypes
            .map(type => `${this.getIngredientName(type)}: ${inventory.getAvailableCount(type)}`)
            .join('\n');
        const meatLines = this.meatTypes
            .map(type => `${this.getIngredientName(type)}: ${inventory.getAvailableCount(type)}`)
            .join('\n');

        return `蔬菜库存:\n${vegLines}\n肉类库存:\n${meatLines}`;
    }

    private trySpawnOrder(): void {
        const waitingCount = this.getWaitingCount();
        const selectionCount = this.getSelectionCount();
        if (waitingCount + selectionCount >= this.WAIT_CAP) return;
        if (this.getQueueOrderCount() >= this.QUEUE_CAP) return;

        this.enqueueSelection();
        this.updateCounts();
    }

    private enqueueSelection(): void {
        const task: SelectionTask = {
            duration: this.randomFloat(this.SELECTION_MIN_SECONDS, this.SELECTION_MAX_SECONDS),
            elapsed: 0
        };
        this.selectionQueue.push(task);
        this.updateSelectionDisplay();
    }

    private updateSelectionProcess(dt: number): void {
        if (!this.currentSelection && this.selectionQueue.length > 0) {
            this.currentSelection = this.selectionQueue.shift() || null;
        }

        if (!this.currentSelection) {
            this.updateSelectionDisplay();
            return;
        }

        this.currentSelection.elapsed += dt;
        if (this.currentSelection.elapsed >= this.currentSelection.duration) {
            const order = this.createOrder();
            if (order && this.createBasketForOrder(order)) {
                this.updateCounts();
            } else {
                this.showMessage('库存不足，选菜失败');
            }
            this.currentSelection = null;
        }

        this.updateSelectionDisplay();
    }

    private createOrder(): OrderTicket | null {
        const inventory = InventoryManager.instance;
        if (!inventory) return null;

        const vegAvailable = this.getTotalAvailable(this.vegetableTypes);
        const meatAvailable = this.getTotalAvailable(this.meatTypes);
        if (vegAvailable < this.VEG_WEIGHT_MIN || meatAvailable < this.MEAT_WEIGHT_MIN) {
            return null;
        }

        const vegWeight = this.randomInt(this.VEG_WEIGHT_MIN, Math.min(this.VEG_WEIGHT_MAX, vegAvailable));
        const meatWeight = this.randomInt(this.MEAT_WEIGHT_MIN, Math.min(this.MEAT_WEIGHT_MAX, meatAvailable));

        const vegDeduct = this.deductRandomWeight(this.vegetableTypes, vegWeight);
        if (!vegDeduct) return null;

        const meatDeduct = this.deductRandomWeight(this.meatTypes, meatWeight);
        if (!meatDeduct) {
            this.restoreDeductions(vegDeduct);
            return null;
        }

        const totalWeight = vegWeight + meatWeight;
        const totalPrice = Math.round((vegWeight / 100) * this.VEG_PRICE_PER_100G + (meatWeight / 100) * this.MEAT_PRICE_PER_100G);
        const vegTypes = vegDeduct.map(item => item.type);
        const meatTypes = meatDeduct.map(item => item.type);
        const complexityScore = vegTypes.length + meatTypes.length;
        const order: OrderTicket = {
            id: this.ticketSeq++,
            meatWeight,
            vegWeight,
            meatPricePer100g: this.MEAT_PRICE_PER_100G,
            vegPricePer100g: this.VEG_PRICE_PER_100G,
            totalWeight,
            totalPrice,
            meatCookTime: this.getCookTime(this.MEAT_COOK_TIME_BASE, this.MEAT_COOK_TIME_VARIANCE),
            vegCookTime: this.getCookTime(this.VEG_COOK_TIME_BASE, this.VEG_COOK_TIME_VARIANCE),
            soupAdded: false,
            vegTypes,
            meatTypes,
            complexityScore,
            createdAt: this.businessElapsed,
            cookPenalty: 0
        };

        return order;
    }

    private getTotalAvailable(types: IngredientType[]): number {
        const inventory = InventoryManager.instance;
        if (!inventory) return 0;
        return types.reduce((sum, type) => sum + Math.max(0, inventory.getAvailableCount(type)), 0);
    }

    private deductRandomWeight(types: IngredientType[], weight: number): { type: IngredientType; weight: number }[] | null {
        const inventory = InventoryManager.instance;
        if (!inventory) return null;

        let remaining = weight;
        const availableTypes = types.filter(type => inventory.getAvailableCount(type) > 0);
        const shuffled = this.shuffle(availableTypes);
        const deductions: { type: IngredientType; weight: number }[] = [];

        for (let i = 0; i < shuffled.length && remaining > 0; i++) {
            const type = shuffled[i];
            const available = inventory.getAvailableCount(type);
            if (available <= 0) continue;

            let take = Math.min(available, remaining);
            if (remaining < available && i < shuffled.length - 1) {
                const minTake = Math.min(take, Math.max(60, Math.floor(remaining * 0.4)));
                take = this.randomInt(minTake, take);
            }

            if (!inventory.adjustProcessedIngredient(type, -take)) {
                this.restoreDeductions(deductions);
                return null;
            }

            deductions.push({ type, weight: take });
            remaining -= take;
        }

        if (remaining > 0) {
            this.restoreDeductions(deductions);
            return null;
        }

        return deductions;
    }

    private restoreDeductions(deductions: { type: IngredientType; weight: number }[]): void {
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        for (const item of deductions) {
            inventory.adjustProcessedIngredient(item.type, item.weight);
        }
    }

    private createBasketNode(order: OrderTicket, kind: BasketKind, state: BasketState, parent: Node | null): BasketEntry | null {
        if (!this.basketTemplate || !parent) {
            this.showMessage('菜篮模板缺失');
            return null;
        }

        const node = instantiate(this.basketTemplate);
        node.active = true;
        node.name = `Basket_${order.id}_${kind}`;
        node.setParent(parent);

        const label = node.getComponent(Label) || node.getComponentInChildren(Label);
        if (label) {
            label.string = this.getBasketLabel(order, state, kind);
        }

        const entry: BasketEntry = {
            node,
            label: label || null,
            order,
            kind,
            state,
            hookIndex: null
        };

        this.setupBasketDrag(entry);
        return entry;
    }

    private createBasketForOrder(order: OrderTicket): boolean {
        const entry = this.createBasketNode(order, 'mix', 'pending', this.rawRack);
        if (!entry) return false;

        this.registerBasket(entry);
        this.arrangeRack(this.rawRack);
        return true;
    }

    private setupBasketDrag(entry: BasketEntry): void {
        const node = entry.node;
        node.off(Node.EventType.TOUCH_START);
        node.off(Node.EventType.TOUCH_MOVE);
        node.off(Node.EventType.TOUCH_END);
        node.off(Node.EventType.TOUCH_CANCEL);

        node.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
            if (this.isBasketHeld(entry)) {
                this.releaseHeldBasket(entry, true);
                event.propagationStopped = true;
                return;
            }
            if (entry.state === 'cooked') {
                if (entry.order.soupAdded) return;
                this.toggleHoldBasket(entry, event);
                event.propagationStopped = true;
                return;
            }
            if (entry.kind === 'mix') {
                if (entry.state !== 'pending') return;
            } else {
                if (entry.state !== 'weighed') return;
            }
            if (entry.state === 'pending' && this.currentScale) {
                this.showMessage('称重台忙碌中');
                return;
            }

            this.draggingBasket = entry;
            this.basketDragStartParent = node.parent;
            this.basketDragStartPos.set(node.position);
            node.getWorldPosition(this.basketDragStartWorld);

            const camera = this.getCanvasCamera();
            if (camera) {
                const screenPos = event.getLocation();
                const worldPos = camera.screenToWorld(new Vec3(screenPos.x, screenPos.y, 0));
                this.basketDragOffset.set(
                    this.basketDragStartWorld.x - worldPos.x,
                    this.basketDragStartWorld.y - worldPos.y,
                    this.basketDragStartWorld.z - worldPos.z
                );
            } else {
                this.basketDragOffset.set(0, 0, 0);
            }
            event.propagationStopped = true;
        }, this);

        node.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
            if (!this.draggingBasket || this.draggingBasket.order.id !== entry.order.id) return;
            const camera = this.getCanvasCamera();
            if (!camera) {
                const delta = event.getDelta();
                node.setPosition(node.position.x + delta.x, node.position.y + delta.y, 0);
            } else {
                const screenPos = event.getLocation();
                const worldPos = camera.screenToWorld(new Vec3(screenPos.x, screenPos.y, 0));
                node.setWorldPosition(
                    worldPos.x + this.basketDragOffset.x,
                    worldPos.y + this.basketDragOffset.y,
                    worldPos.z + this.basketDragOffset.z
                );
            }
            event.propagationStopped = true;
        }, this);

        const onDragEnd = (event: EventTouch) => {
            if (!this.draggingBasket || this.draggingBasket.order.id !== entry.order.id) return;
            this.onBasketDragEnd(entry, event);
            event.propagationStopped = true;
        };

        node.on(Node.EventType.TOUCH_END, onDragEnd, this);
        node.on(Node.EventType.TOUCH_CANCEL, onDragEnd, this);
    }

    private onBasketDragEnd(entry: BasketEntry, event?: EventTouch): void {
        const node = entry.node;
        if (this.draggingBasket?.order.id !== entry.order.id) return;
        this.draggingBasket = null;

        const endWorld = new Vec3();
        node.getWorldPosition(endWorld);
        const movedDistance = Vec3.distance(endWorld, this.basketDragStartWorld);

        if (entry.kind === 'mix' && entry.state === 'pending' && !this.currentScale && this.isDropOnScale(node)) {
            this.startScale(entry);
            return;
        }

        if (entry.state === 'weighed') {
            const targetSlot = this.getPotSlotUnder(node);
            if (targetSlot && this.tryStartCooking(entry, targetSlot)) {
                return;
            }
            if (this.isDropInPotArea(node)) {
                const nearestSlot = this.getNearestPotSlot(node);
                if (this.tryStartCooking(entry, nearestSlot)) {
                    return;
                }
            }
            if (movedDistance <= this.DRAG_CLICK_THRESHOLD) {
                if (this.holdBasket(entry, event)) {
                    return;
                }
            }
        }
        
        if (entry.state === 'cooked') {
            if (this.isDropOnSoupArea(node)) {
                if (this.applySoup(entry)) {
                    return;
                }
                this.holdBasket(entry);
                return;
            }
        }

        if (this.basketDragStartParent && this.basketDragStartParent.isValid) {
            node.setParent(this.basketDragStartParent);
        }
        node.setPosition(this.basketDragStartPos);
        this.arrangeRack(this.basketDragStartParent);
    }

    private applySoup(entry: BasketEntry): boolean {
        if (entry.state !== 'cooked') return false;
        const bowl = this.getOrAssignBowl(entry.order.id);
        if (!bowl) {
            this.showMessage('先取碗再放食材');
            return false;
        }
        if (entry.kind === 'meat') {
            bowl.meatReady = true;
        } else {
            bowl.vegReady = true;
        }
        this.updateBowlDisplay(bowl);
        if (bowl.fill >= 1) {
            this.tryCompleteSoup(bowl);
        }
        if (this.isBasketHeld(entry)) {
            this.releaseHeldBasket(entry, false);
        }
        this.destroyBasketEntry(entry);
        this.updateCounts();
        this.showMessage(`#${entry.order.id} ${entry.kind === 'meat' ? '肉' : '菜'}入碗`);
        return true;
    }

    private isDropOnScale(node: Node): boolean {
        if (!this.scalePanel) return false;
        const transform = this.scalePanel.getComponent(UITransform);
        if (!transform) return false;
        const box = transform.getBoundingBoxToWorld();
        const worldPos = new Vec3();
        node.getWorldPosition(worldPos);
        return box.contains(new Vec2(worldPos.x, worldPos.y));
    }

    private isDropOnSoupArea(node: Node): boolean {
        if (!this.soupArea) return false;
        const transform = this.soupArea.getComponent(UITransform);
        if (!transform) return false;
        const box = transform.getBoundingBoxToWorld();
        const worldPos = new Vec3();
        node.getWorldPosition(worldPos);
        return box.contains(new Vec2(worldPos.x, worldPos.y));
    }

    private getPotCircleInfo(): { center: Vec3; radius: number } | null {
        if (!this.potCircleArea || !this.potSlotsContainer) return null;
        const transform = this.potCircleArea.getComponent(UITransform);
        if (!transform) return null;

        const areaWorld = new Vec3();
        this.potCircleArea.getWorldPosition(areaWorld);
        const containerWorld = new Vec3();
        this.potSlotsContainer.getWorldPosition(containerWorld);

        const radius = Math.min(transform.contentSize.width, transform.contentSize.height) / 2;
        const center = new Vec3(areaWorld.x - containerWorld.x, areaWorld.y - containerWorld.y, 0);
        return { center, radius };
    }

    private isDropInPotArea(node: Node): boolean {
        const circle = this.getPotCircleInfo();
        if (!circle || !this.potSlotsContainer) return false;
        const worldPos = new Vec3();
        node.getWorldPosition(worldPos);
        const containerWorld = new Vec3();
        this.potSlotsContainer.getWorldPosition(containerWorld);
        const local = new Vec3(worldPos.x - containerWorld.x, worldPos.y - containerWorld.y, 0);
        return Vec3.distance(local, circle.center) <= circle.radius;
    }

    private getPotSlotUnder(node: Node): PotSlot | null {
        const worldPos = new Vec3();
        node.getWorldPosition(worldPos);
        for (const slot of this.potSlots) {
            if (slot.order) continue;
            const transform = slot.node.getComponent(UITransform);
            if (!transform) continue;
            const box = transform.getBoundingBoxToWorld();
            if (box.contains(new Vec2(worldPos.x, worldPos.y))) {
                return slot;
            }
        }
        return null;
    }

    private getNearestPotSlot(node: Node): PotSlot | null {
        const worldPos = new Vec3();
        node.getWorldPosition(worldPos);
        let nearest: PotSlot | null = null;
        let nearestDistance = Number.POSITIVE_INFINITY;
        for (const slot of this.potSlots) {
            if (slot.order) continue;
            const slotWorld = new Vec3();
            slot.node.getWorldPosition(slotWorld);
            const distance = Vec3.distance(worldPos, slotWorld);
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearest = slot;
            }
        }
        return nearest;
    }

    private findEmptyPotSlot(): PotSlot | null {
        for (const slot of this.potSlots) {
            if (!slot.order) return slot;
        }
        return null;
    }

    private removeFromCookQueue(entry: BasketEntry): void {
        const index = this.cookQueue.findIndex(item => item === entry);
        if (index >= 0) {
            this.cookQueue.splice(index, 1);
        }
    }

    private isBasketCookable(entry: BasketEntry): boolean {
        if (entry.state !== 'weighed') return false;
        if (entry.kind === 'meat') {
            return entry.order.meatCookElapsed == null;
        }
        if (entry.kind === 'veg') {
            return entry.order.vegCookElapsed == null;
        }
        return false;
    }

    private dequeueCookableBasket(): BasketEntry | null {
        for (let i = 0; i < this.cookQueue.length; i++) {
            const entry = this.cookQueue[i];
            if (this.isBasketCookable(entry)) {
                this.cookQueue.splice(i, 1);
                return entry;
            }
        }
        return null;
    }

    private tryStartCooking(entry: BasketEntry, slot: PotSlot | null): boolean {
        const target = slot ?? this.findEmptyPotSlot();
        if (!target) {
            this.showMessage('锅位已满');
            return false;
        }

        if (entry.kind === 'mix') {
            this.showMessage('请先称重');
            return false;
        }
        if (entry.kind === 'meat' && entry.order.meatCookElapsed != null) {
            this.showMessage('肉已煮好');
            return false;
        }
        if (entry.kind === 'veg' && entry.order.vegCookElapsed != null) {
            this.showMessage('菜已煮好');
            return false;
        }

        target.order = entry.order;
        target.stage = entry.kind === 'veg' ? 'veg' : 'meat';
        target.basket = entry;
        target.cookElapsed = 0;
        this.removeFromCookQueue(entry);

        entry.state = 'cooking';
        this.updateBasketLabel(entry);
        entry.node.active = false;
        this.moveBasketToRack(entry, this.queueRack || this.rawRack);

        this.updateCounts();
        this.updatePotSlotLabels();
        return true;
    }

    private startScale(entry: BasketEntry): void {
        if (!this.scalePanel || this.currentScale) return;
        if (entry.kind !== 'mix') return;
        entry.state = 'weighing';
        this.updateBasketLabel(entry);

        entry.node.setParent(this.scalePanel);
        entry.node.setPosition(0, 0, 0);
        this.arrangeRack(this.rawRack);

        this.currentScale = {
            order: entry.order,
            duration: this.randomFloat(this.SCALE_MIN_SECONDS, this.SCALE_MAX_SECONDS),
            elapsed: 0,
            basket: entry
        };

        this.updateCounts();
        this.updateScaleDisplay();
    }

    private updateBasketLabel(entry: BasketEntry): void {
        if (!entry.label) return;
        entry.label.string = this.getBasketLabel(entry.order, entry.state, entry.kind);
    }

    private getBasketLabel(order: OrderTicket, state: BasketState, kind: BasketKind): string {
        const status = this.getBasketStateLabel(order, state, kind);
        return `#${order.id}\n${this.getWeightLine(order, kind)}\n${status}`;
    }

    private getBasketStateLabel(order: OrderTicket, state: BasketState, kind: BasketKind): string {
        switch (state) {
            case 'pending':
                return '待称重';
            case 'weighing':
                return '称重中';
            case 'weighed':
                if (kind === 'meat') return '待下肉';
                if (kind === 'veg') return '待下菜';
                return '待下锅';
            case 'cooking':
                return '煮制中';
            case 'cooked':
                return '待加汤';
            case 'souped':
                return '待报号';
        }
    }

    private getWeightLine(order: OrderTicket, kind: BasketKind | BasketStage = 'mix'): string {
        if (kind === 'meat') return `肉${order.meatWeight}g`;
        if (kind === 'veg') return `素${order.vegWeight}g`;
        return `素${order.vegWeight}g  |  肉${order.meatWeight}g`;
    }

    private moveBasketToRack(entry: BasketEntry, rack: Node | null): void {
        if (!rack) return;
        const previousParent = entry.node.parent;
        entry.node.setParent(rack);
        this.arrangeRack(previousParent);
        this.arrangeRack(rack);
    }

    private arrangeRack(rack: Node | null): void {
        if (!rack) return;
        if (rack === this.queueRack) {
            this.arrangeQueueRack(rack);
            return;
        }
        this.arrangeRackGrid(rack);
    }

    private arrangeQueueRack(rack: Node): void {
        const baskets = rack.children.filter(child => child.name.startsWith('Basket_') && child.active);
        const meatHooks = this.getQueueHooks(rack, 'MeatHook_');
        const vegHooks = this.getQueueHooks(rack, 'VegHook_');
        if (meatHooks.length === 0 && vegHooks.length === 0) {
            this.arrangeRackGrid(rack, baskets);
            return;
        }

        const meatEntries: BasketEntry[] = [];
        const vegEntries: BasketEntry[] = [];
        const overflow: Node[] = [];

        for (const node of baskets) {
            const entry = this.getBasketEntryByNode(node);
            if (!entry) {
                overflow.push(node);
            } else if (entry.kind === 'meat') {
                meatEntries.push(entry);
            } else if (entry.kind === 'veg') {
                vegEntries.push(entry);
            } else {
                overflow.push(node);
            }
        }

        this.arrangeHookEntries(meatEntries, meatHooks, overflow);
        this.arrangeHookEntries(vegEntries, vegHooks, overflow);

        if (overflow.length > 0) {
            const hookYs = [...meatHooks, ...vegHooks].map(node => node.position.y);
            const minHookY = hookYs.length ? Math.min(...hookYs) : 0;
            const startY = minHookY + this.QUEUE_HOOK_OFFSET.y - 60;
            this.arrangeRackGrid(rack, overflow, startY);
        }
    }

    private arrangeHookEntries(entries: BasketEntry[], hooks: Node[], overflow: Node[]): void {
        if (hooks.length === 0) {
            for (const entry of entries) {
                overflow.push(entry.node);
            }
            return;
        }

        const used = new Set<number>();
        for (const entry of entries) {
            const index = entry.hookIndex;
            if (index == null || index < 0 || index >= hooks.length || used.has(index)) {
                entry.hookIndex = null;
            } else {
                used.add(index);
            }
        }

        const available: number[] = [];
        for (let i = 0; i < hooks.length; i++) {
            if (!used.has(i)) {
                available.push(i);
            }
        }

        for (const entry of entries) {
            if (entry.hookIndex == null) {
                const next = available.shift();
                if (next == null) {
                    overflow.push(entry.node);
                    continue;
                }
                entry.hookIndex = next;
            }
            const hook = hooks[entry.hookIndex];
            if (!hook) {
                overflow.push(entry.node);
                continue;
            }
            const hookPos = hook.getPosition();
            entry.node.setPosition(new Vec3(
                hookPos.x + this.QUEUE_HOOK_OFFSET.x,
                hookPos.y + this.QUEUE_HOOK_OFFSET.y,
                0
            ));
        }
    }

    private placeBasketsOnHooks(baskets: Node[], hooks: Node[], overflow: Node[]): void {
        for (let i = 0; i < baskets.length; i++) {
            const node = baskets[i];
            const hook = hooks[i];
            if (!hook) {
                overflow.push(node);
                continue;
            }
            const hookPos = hook.getPosition();
            node.setPosition(new Vec3(
                hookPos.x + this.QUEUE_HOOK_OFFSET.x,
                hookPos.y + this.QUEUE_HOOK_OFFSET.y,
                0
            ));
        }
    }

    private getQueueHooks(rack: Node, prefix: string): Node[] {
        const hooks = rack.children.filter(child => child.name.startsWith(prefix));
        hooks.sort((a, b) => this.getHookIndex(a.name) - this.getHookIndex(b.name));
        return hooks;
    }

    private getHookIndex(name: string): number {
        const match = name.match(/_(\d+)/);
        return match ? Number.parseInt(match[1], 10) : 0;
    }

    private getBasketEntryByNode(node: Node): BasketEntry | null {
        for (const entry of this.basketEntries.values()) {
            if (entry.node === node) return entry;
        }
        return null;
    }

    private arrangeRackGrid(rack: Node, baskets?: Node[], startY: number = 20): void {
        const items = baskets ?? rack.children.filter(child => child.name.startsWith('Basket_') && child.active);
        const cols = 4;
        const spacingX = 140;
        const spacingY = 60;
        const startX = -((cols - 1) * spacingX) / 2;

        for (let i = 0; i < items.length; i++) {
            const node = items[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            node.setPosition(new Vec3(startX + col * spacingX, startY - row * spacingY, 0));
        }
    }

    private updateScaleProcess(dt: number): void {
        if (this.currentScale) {
            this.currentScale.elapsed += dt;
            if (this.currentScale.elapsed >= this.currentScale.duration) {
                this.finishScale(this.currentScale.order);
                this.currentScale = null;
            }
        }

        this.updateCounts();
        this.updateScaleDisplay();
    }

    private finishScale(order: OrderTicket): void {
        const basketEntry = this.currentScale?.basket ?? this.getBasketEntry(order.id, 'mix');
        if (basketEntry && basketEntry.kind === 'mix') {
            this.removeBasket(basketEntry);
            basketEntry.kind = 'meat';
            basketEntry.state = 'weighed';
            basketEntry.hookIndex = null;
            basketEntry.node.name = `Basket_${order.id}_meat`;
            this.registerBasket(basketEntry);
            this.updateBasketLabel(basketEntry);
            this.moveBasketToRack(basketEntry, this.queueRack || this.rawRack);
            this.cookQueue.push(basketEntry);

            const vegEntry = this.createBasketNode(order, 'veg', 'weighed', this.queueRack || this.rawRack);
            if (vegEntry) {
                this.registerBasket(vegEntry);
                this.cookQueue.push(vegEntry);
            }
            this.arrangeRack(this.queueRack);
        } else if (basketEntry) {
            basketEntry.state = 'weighed';
            this.updateBasketLabel(basketEntry);
            this.moveBasketToRack(basketEntry, this.queueRack || this.rawRack);
            this.cookQueue.push(basketEntry);
        }
        this.updateCounts();
        this.showMessage(`#${order.id} 称重完成`);
    }

    private onPotSlotClick(index: number): void {
        const slot = this.potSlots[index];
        if (!slot) return;

        if (!slot.order) {
            const held = this.getHeldBasketByState('weighed');
            if (held && this.tryStartCooking(held, slot)) {
                this.releaseHeldBasket(held, false);
                return;
            }

            const next = this.dequeueCookableBasket();
            if (!next) {
                this.showMessage('待下锅队列为空');
                return;
            }
            if (this.tryStartCooking(next, slot)) {
                return;
            }
        }

        if (!slot.order || !slot.stage) return;

        const required = slot.stage === 'meat' ? slot.order.meatCookTime : slot.order.vegCookTime;
        if (slot.cookElapsed < required) {
            this.showMessage(slot.stage === 'meat' ? '肉还没熟' : '菜还没熟');
            return;
        }

        this.finishCookingSlot(slot);
    }

    private finishCookingSlot(slot: PotSlot): void {
        if (!slot.order || !slot.stage) return;

        const order = slot.order;
        const entry = slot.basket;
        if (slot.stage === 'meat') {
            order.meatCookElapsed = slot.cookElapsed;
            this.showMessage(`#${order.id} 肉篮出锅`);
        } else {
            order.vegCookElapsed = slot.cookElapsed;
            this.showMessage(`#${order.id} 菜篮出锅`);
        }

        if (entry) {
            entry.state = 'cooked';
            entry.node.active = true;
            this.updateBasketLabel(entry);
            this.moveBasketToRack(entry, this.cookedRack || this.queueRack || this.rawRack);
            this.holdBasket(entry);
        }

        if (order.meatCookElapsed != null && order.vegCookElapsed != null && !this.cookedOrders.has(order.id)) {
            const ready = this.evaluateQuality(order);
            this.cookedOrders.set(order.id, ready);
            order.cookedAt = this.businessElapsed;
        }

        slot.order = null;
        slot.stage = null;
        slot.cookElapsed = 0;
        slot.basket = null;
        this.updateCounts();
        this.updatePotSlotLabels();
    }

    private destroyBasketEntry(entry: BasketEntry): void {
        if (this.isBasketHeld(entry)) {
            this.releaseHeldBasket(entry, false);
        }
        this.removeFromCookQueue(entry);
        this.removeBasket(entry);
        entry.node.destroy();
        this.arrangeRack(this.queueRack);
        this.arrangeRack(this.rawRack);
        this.arrangeRack(this.cookedRack);
    }

    private evaluateQuality(order: OrderTicket): ReadyDish {
        const tags: string[] = [];
        let penalty = 0;

        const meatResult = this.getStageQuality(order.meatCookElapsed ?? 0, order.meatCookTime);
        if (meatResult.tag) {
            tags.push(`肉${meatResult.tag}`);
            penalty += meatResult.penalty;
        }

        const vegResult = this.getStageQuality(order.vegCookElapsed ?? 0, order.vegCookTime);
        if (vegResult.tag) {
            tags.push(`菜${vegResult.tag}`);
            penalty += vegResult.penalty;
        }

        let quality: QualityType = 'good';
        if (penalty === 1) quality = 'ok';
        if (penalty >= 2) quality = 'bad';

        order.soupAdded = false;
        order.cookPenalty = penalty;
        return { order, quality, tags };
    }

    private getStageQuality(elapsed: number, target: number): { tag: string | null; penalty: number } {
        if (target <= 0) return { tag: null, penalty: 0 };
        const ratio = elapsed / target;
        if (ratio < 0.8) {
            return { tag: '欠熟', penalty: 1 };
        }
        if (ratio > 1.25) {
            return { tag: '过火', penalty: 1 };
        }
        return { tag: null, penalty: 0 };
    }

    private applyServiceEvaluation(ready: ReadyDish): void {
        const order = ready.order;
        const elapsed = Math.max(0, this.businessElapsed - order.createdAt);
        order.deliveredAt = this.businessElapsed;

        const target = this.getTargetServeTime(order);
        let penalty = order.cookPenalty || 0;

        const ratio = target > 0 ? elapsed / target : 1;
        if (ratio > 1.35) {
            penalty += 2;
            ready.tags.push('超慢');
        } else if (ratio > 1.15) {
            penalty += 1;
            ready.tags.push('偏慢');
        } else if (ratio < 0.7) {
            ready.tags.push('手快');
        }

        if (order.complexityScore >= 6) {
            ready.tags.unshift('复杂');
        }

        ready.quality = this.getQualityByPenalty(penalty);
    }

    private getTargetServeTime(order: OrderTicket): number {
        return this.SPEED_BASE_TIME
            + order.complexityScore * this.SPEED_PER_COMPLEXITY
            + (order.totalWeight / 100) * this.SPEED_PER_100G;
    }

    private getQualityByPenalty(penalty: number): QualityType {
        if (penalty <= 0) return 'good';
        if (penalty === 1) return 'ok';
        return 'bad';
    }

    private onDeliveryClick(index: number): void {
        const ready = this.readyOrders[index];
        if (!ready) return;
        this.readyOrders.splice(index, 1);
        this.completeDelivery(ready);
        this.refreshDeliveryButtons();
    }

    private completeDelivery(ready: ReadyDish): void {
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.addMoney(ready.order.totalPrice);
        } else {
            this.totalMoney += ready.order.totalPrice;
        }
        this.updateMoneyDisplay();
        this.completedOrders += 1;
        this.destroyBasketsByOrder(ready.order.id);
        this.applyServiceEvaluation(ready);
        const delta = this.getHeatDelta(ready) + this.getCondimentPenalty();
        if (delta !== 0) {
            this.reviewSystem.adjustHeat(delta);
        }
        this.consumeCondiments();
        this.updateReviewDisplay();
        this.updateCondimentDisplay();
        this.updateCounts();
        this.updateServerStatus();
    }

    private destroyBasketsByOrder(orderId: number): void {
        const entries = this.getBasketsByOrder(orderId);
        if (entries.length === 0) return;
        for (const entry of entries) {
            this.removeFromCookQueue(entry);
            this.removeBasket(entry);
            entry.node.destroy();
        }
        this.arrangeRack(this.cookedRack);
        this.arrangeRack(this.rawRack);
        this.arrangeRack(this.queueRack);
    }

    private getHeatDelta(ready: ReadyDish): number {
        const quality = ready.quality;
        let delta = 0;
        if (quality === 'good') delta = 2;
        if (quality === 'ok') delta = 1;
        if (quality === 'bad') delta = -2;
        if (ready.order.complexityScore >= 6 && quality === 'good') {
            delta += 1;
        }
        return delta;
    }

    private getCondimentPenalty(): number {
        for (const type of Object.keys(this.condimentLevels) as CondimentType[]) {
            if (this.condimentLevels[type] < this.CONDIMENT_THRESHOLD) {
                return -1;
            }
        }
        return 0;
    }

    private consumeCondiments(): void {
        const types = this.pickRandomCondiments();
        for (const type of types) {
            const reduction = this.randomInt(10, 25);
            this.condimentLevels[type] = Math.max(0, this.condimentLevels[type] - reduction);
        }
    }

    private pickRandomCondiments(): CondimentType[] {
        const pool: CondimentType[] = ['sesame', 'sugar', 'scallion', 'cilantro'];
        const count = this.randomInt(1, 2);
        return this.shuffle(pool).slice(0, count);
    }

    private updatePotCooking(dt: number): void {
        for (const slot of this.potSlots) {
            if (!slot.order) continue;
            slot.cookElapsed += dt;
        }
        this.updatePotSlotLabels();
    }

    private updatePotSlotLabels(): void {
        for (let i = 0; i < this.potSlots.length; i++) {
            const slot = this.potSlots[i];
            if (!slot.label) continue;

            if (!slot.order) {
                slot.label.string = `空位 ${i + 1}`;
                this.updatePotSlotProgress(slot);
                this.setPotSlotFocus(slot, false);
                continue;
            }

            if (slot.stage === 'meat') {
                const ready = slot.cookElapsed >= slot.order.meatCookTime;
                const status = ready ? '可出锅' : '煮肉中';
                slot.label.string = `#${slot.order.id}\n${this.getWeightLine(slot.order, 'meat')}\n${status}`;
                this.updatePotSlotProgress(slot);
                this.setPotSlotFocus(slot, ready);
                continue;
            }

            if (slot.stage === 'veg') {
                const ready = slot.cookElapsed >= slot.order.vegCookTime;
                const status = ready ? '可出锅' : '煮菜中';
                slot.label.string = `#${slot.order.id}\n${this.getWeightLine(slot.order, 'veg')}\n${status}`;
                this.updatePotSlotProgress(slot);
                this.setPotSlotFocus(slot, ready);
            }
        }
    }

    private setPotSlotFocus(slot: PotSlot, ready: boolean): void {
        if (!slot.node) return;
        if (ready) {
            slot.node.setScale(1.08, 1.08, 1);
            if (this.potSlotsContainer) {
                slot.node.setSiblingIndex(this.potSlotsContainer.children.length - 1);
            }
        } else {
            slot.node.setScale(1, 1, 1);
            if (this.potSlotsContainer) {
                const maxIndex = this.potSlotsContainer.children.length - 1;
                const targetIndex = Math.min(slot.baseSiblingIndex, maxIndex);
                slot.node.setSiblingIndex(targetIndex);
            }
        }
    }

    private updatePotSlotProgress(slot: PotSlot): void {
        if (!slot.progress || !slot.progressNode) return;
        const transform = slot.progressNode.getComponent(UITransform);
        const width = transform?.contentSize.width ?? 80;
        const height = transform?.contentSize.height ?? 8;
        const radius = height / 2;

        slot.progress.clear();
        slot.progress.fillColor = new Color(40, 40, 40, 180);
        slot.progress.roundRect(-width / 2, -height / 2, width, height, radius);
        slot.progress.fill();

        if (!slot.order || !slot.stage) {
            return;
        }

        const target = slot.stage === 'meat' ? slot.order.meatCookTime : slot.order.vegCookTime;
        const ratio = target > 0 ? slot.cookElapsed / target : 0;
        const fill = Math.max(0, Math.min(1, ratio));
        const color = this.getCookBarColor(ratio);
        slot.progress.fillColor = color;
        slot.progress.roundRect(-width / 2, -height / 2, width * fill, height, radius);
        slot.progress.fill();
    }

    private getCookBarColor(ratio: number): Color {
        if (ratio < 0.8) {
            return new Color(231, 76, 60, 255);
        }
        if (ratio < 1.0) {
            return new Color(241, 196, 15, 255);
        }
        if (ratio <= 1.25) {
            return new Color(46, 204, 113, 255);
        }
        return new Color(127, 140, 141, 255);
    }

    private refreshDeliveryButtons(): void {
        for (let i = 0; i < this.deliveryButtons.length; i++) {
            const button = this.deliveryButtons[i];
            const ready = this.readyOrders[i];
            if (!ready) {
                button.node.active = false;
                continue;
            }
            button.node.active = true;
            const tags = ready.tags.length ? `(${ready.tags.join('/')})` : '';
            if (button.label) {
                button.label.string = `报号 #${ready.order.id} ${tags}`;
            }
            if (button.button) {
                button.button.interactable = true;
            }
        }
        this.updateCounts();
    }


    private getSpawnInterval(): number {
        const heat = this.reviewSystem.shopHeat;
        const heatFactor = Math.max(0, Math.min(1, heat / 100));
        const ramp = Math.min(1, this.businessElapsed / this.SPAWN_RAMP_SECONDS);
        const rampFactor = 0.25 + 0.75 * ramp;
        const effective = heatFactor * rampFactor;
        const baseInterval = this.HEAT_MAX_INTERVAL - effective * (this.HEAT_MAX_INTERVAL - this.HEAT_MIN_INTERVAL);
        const active = this.getActiveOrderCount();
        if (active >= this.ACTIVE_ORDER_HARD_CAP) {
            return Number.POSITIVE_INFINITY;
        }
        let loadFactor = 1.0;
        if (active <= this.ACTIVE_ORDER_MIN) {
            loadFactor = 0.7;
        } else if (active <= this.TARGET_ACTIVE_ORDERS) {
            loadFactor = 1.0;
        } else if (active <= this.ACTIVE_ORDER_MAX) {
            loadFactor = 1.35;
        } else {
            loadFactor = 1.8;
        }
        return baseInterval * loadFactor;
    }

    private refillCondiment(type: CondimentType): void {
        this.condimentLevels[type] = this.CONDIMENT_MAX;
        this.updateCondimentDisplay();
        this.showMessage(`${this.getCondimentName(type)}已补满`);
    }

    private upgradeServer(): void {
        if (this.serverLevel >= 3) {
            this.showMessage('服务员已满级');
            return;
        }

        const nextLevel = (this.serverLevel + 1) as 1 | 2 | 3;
        if (!this.canUnlockServer(nextLevel)) {
            const unlock = this.getServerUnlockInfo(nextLevel);
            this.showMessage(`解锁条件未达成：热度${this.reviewSystem.shopHeat}/${unlock.heat}，订单${this.completedOrders}/${unlock.orders}`);
            return;
        }

        const cost = this.getServerHireCost(nextLevel);
        const inventory = InventoryManager.instance;
        if (inventory && !inventory.spendMoney(cost)) {
            this.showMessage('金币不足，无法雇佣');
            return;
        }

        this.serverLevel = nextLevel;
        this.serverTimer = 0;
        this.serverBurstCooldown = 0;
        this.updateMoneyDisplay();
        this.updateServerStatus();
        this.showMessage(`服务员升级到 Lv${this.serverLevel}`);
    }

    private canUnlockServer(level: 1 | 2 | 3): boolean {
        const unlock = this.getServerUnlockInfo(level);
        return this.reviewSystem.shopHeat >= unlock.heat && this.completedOrders >= unlock.orders;
    }

    private getServerUnlockInfo(level: 1 | 2 | 3): { heat: number; orders: number } {
        return this.SERVER_UNLOCKS[level];
    }

    private getServerHireCost(level: 1 | 2 | 3): number {
        if (level === 1) return 120;
        if (level === 2) return 200;
        return 280;
    }

    private updateServerDelivery(dt: number): void {
        if (this.serverLevel === 0 || this.readyOrders.length === 0) return;
        this.serverTimer += dt;

        const interval = this.getServerInterval();
        if (this.serverLevel >= 2 && this.readyOrders.length >= 4 && this.serverBurstCooldown <= 0) {
            this.serverBurstCooldown = this.serverLevel >= 3 ? 4 : 6;
            const deliverCount = Math.min(2, this.readyOrders.length);
            for (let i = 0; i < deliverCount; i++) {
                const ready = this.readyOrders.shift();
                if (ready) this.completeDelivery(ready);
            }
            this.serverTimer = 0;
            this.refreshDeliveryButtons();
            return;
        }

        if (this.serverTimer >= interval) {
            this.serverTimer = 0;
            const ready = this.readyOrders.shift();
            if (ready) {
                this.completeDelivery(ready);
                this.refreshDeliveryButtons();
            }
        }
    }

    private getServerInterval(): number {
        if (this.serverLevel === 1) return 1.5;
        if (this.serverLevel === 2) return 0.9;
        if (this.serverLevel === 3) return 0.6;
        return 999;
    }

    private onRingToss(): void {
        const ringNode = find('Canvas/RingTossStation');
        const controller = ringNode?.getComponent(RingTossController);
        if (controller) {
            controller.open();
            return;
        }
        this.showMessage('套圈摊未就绪');
    }

    private getCanvasCamera(): Camera | null {
        if (this.canvasCamera && this.canvasCamera.isValid) {
            return this.canvasCamera;
        }
        const scene = director.getScene();
        const canvasNode = scene?.getChildByName('Canvas');
        if (!canvasNode) return null;
        const canvasComp = canvasNode.getComponent(Canvas);
        this.canvasCamera = canvasComp?.cameraComponent || null;
        return this.canvasCamera;
    }

    private getCookTime(base: number, variance: number): number {
        const min = Math.max(1, base - variance);
        const max = base + variance;
        return this.randomFloat(min, max);
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private randomFloat(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }

    private shuffle<T>(list: T[]): T[] {
        const arr = list.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
}
