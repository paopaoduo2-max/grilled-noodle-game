import { _decorator, Component, Node, input, Input, EventMouse, EventTouch, Vec3, Camera, Canvas, UITransform, Color, Label } from 'cc';
import { IngredientType } from '../../Data/GameConfig';
import { TimeManager } from '../../Manager/TimeManager';
import { MessageSystem } from '../../Game/UI/MessageSystem';
import { BBQ_CONFIG, getLevelInitialMoney, getLevelTargetMoney } from '../model/BBQConfig';
import { createBBQState } from '../model/BBQState';
import { BBQGrillController } from './BBQGrillController';
import { BBQOrderController } from './BBQOrderController';
import { BBQServeController } from './BBQServeController';
import { BBQUIBinder } from '../presenter/BBQUIBinder';
import { CurrencyPort } from '../ports/CurrencyPort';
import { AudioPort } from '../ports/AudioPort';
import { BBQCookState, BBQHeatLevel, BBQSlotSnapshot, BBQState, BBQTool } from '../model/BBQTypes';
import { SettlementUI } from '../../Game/UI/SettlementUI';

const { ccclass, property } = _decorator;

@ccclass('BBQLevelController')
export class BBQLevelController extends Component {
    @property(Node)
    uiRoot: Node | null = null;

    private binder: BBQUIBinder | null = null;
    private state: BBQState | null = null;
    private orderController = new BBQOrderController();
    private grillController = new BBQGrillController();
    private serveController = new BBQServeController();
    private currencyPort = new CurrencyPort();
    private audioPort = new AudioPort();
    private messageSystem: MessageSystem | null = null;
    private settlementUI: SettlementUI | null = null;
    private canvasCamera: Camera | null = null;
    private timeManager: TimeManager | null = null;
    private timeManagerBound = false;
    private uiHitTestDisabled = false;
    private blockedHitTests = new Map<Node, Function>();
    private uiTick = 0;
    private isOver = false;
    private lastPointer: { x: number; y: number } | null = null;
    private readonly maxHandItems = 10;
    private trashSlotIndex: number | null = null;
    private lastSlotClickAt = 0;
    private manualTimeTick = false;
    private timeFreezeTimer = 0;
    private lastTimeHour = -1;
    private lastTimeMinute = -1;
    private unlockedTables = 2;
    private orderPageIndex = 0;
    private orderPageTimer = 0;
    private readonly orderPageSize = 5;

    protected onLoad(): void {
        const canvas = this.uiRoot ?? this.node.scene?.getChildByName('Canvas') ?? null;
        if (!canvas) return;

        this.binder = new BBQUIBinder(canvas);
        this.messageSystem = new MessageSystem(canvas);

        const currentMoney = this.currencyPort.getMoney();
        const startMoney = currentMoney > 0 ? currentMoney : getLevelInitialMoney();
        this.state = createBBQState(startMoney, BBQ_CONFIG.levelDuration);

        this.binder.initSlots(BBQ_CONFIG.slotCount);
        this.disableIngredientButtons();
        this.bindToolButtons();
        this.bindFireButtons();
        this.bindServeButton();
        this.bindGridSlots();
        this.bindGrillArea();
        this.bindTrashBin();
        this.bindPlateArea();
        this.binder.setOrderPickHandler((orderId, ingredient) => this.onOrderItemPick(orderId, ingredient));
        this.binder.setPlatePickHandler((index) => this.onPlateItemPick(index));
        this.binder.setPlateTableHandler((orderId) => this.onPlateTableClick(orderId));
        this.updateHandDisplay();

        this.canvasCamera = this.resolveCanvasCamera(canvas);
        this.setupFollowerInput();

        this.orderController.setMaxActiveTables(this.unlockedTables);
        this.orderController.ensureOrders(this.state);
        this.refreshAll();

        this.timeManager = this.resolveTimeManager();
        if (this.timeManager) {
            this.bindTimeLabel();
            this.timeManager.onDayEnd(() => this.finishLevel());
            this.timeManagerBound = true;
            if (!this.timeManager.isBusinessOpen()) {
                this.timeManager.forceRestart();
            } else {
                this.timeManager.resumeTime();
            }
            this.lastTimeHour = this.timeManager.getCurrentHour();
            this.lastTimeMinute = this.timeManager.getCurrentMinute();
        }
    }

    protected start(): void {
        this.ensureTimeManagerRunning();
        this.schedule(this.ensureTimeManagerRunning, 0.5, 6);
    }

    protected update(dt: number): void {
        if (!this.state || !this.binder || this.isOver) return;

        this.ensureTimeProgress(dt);

        this.updateOrderProgress(dt);
        const timedOut = this.orderController.tick(dt, this.state);
        if (timedOut.length > 0) {
            this.currencyPort.orderTimeout();
            this.state.combo = 0;
            this.state.badCount += timedOut.length;
            this.showMessage('订单超时！', true);
        }

        this.grillController.tick(dt, this.state);

        this.uiTick += dt;
        if (this.uiTick >= 0.2) {
            this.uiTick = 0;
            this.refreshAll();
        }
    }

    protected onDestroy(): void {
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.enableUiHitTest();
        this.messageSystem?.destroy();
    }

    private disableIngredientButtons(): void {
        if (!this.binder) return;
        const group = this.binder.canvas.getChildByPath('BBQUI/ControlPanel/IngredientGroup');
        if (group) {
            group.active = false;
        }
        this.binder.ingredientButtons.clear();
    }

    private bindToolButtons(): void {
        if (!this.binder || !this.state) return;
        this.binder.bindButton(this.binder.toolButtons.sauce, () => {
            this.audioPort.playButtonClick();
            this.toggleTool('sauce');
        });
        this.binder.bindButton(this.binder.toolButtons.spice, () => {
            this.audioPort.playButtonClick();
            this.toggleTool('spice');
        });
        this.binder.bindButton(this.binder.toolButtons.fan, () => {
            this.audioPort.playButtonClick();
            this.state!.smoke = Math.max(0, this.state!.smoke - 15);
            this.showMessage('扇风降烟');
            this.refreshTopInfo();
        });
    }

    private bindFireButtons(): void {
        if (!this.binder || !this.state) return;
        this.binder.bindButton(this.binder.fireButtons.hot, () => this.setHeatLevel('hot'));
        this.binder.bindButton(this.binder.fireButtons.mid, () => this.setHeatLevel('mid'));
        this.binder.bindButton(this.binder.fireButtons.warm, () => this.setHeatLevel('warm'));
        this.refreshHeatButtons();
    }

    private bindServeButton(): void {
        if (!this.binder) return;
        this.binder.bindButton(this.binder.serveButton, () => this.onServe());
    }

    private bindGridSlots(): void {
        if (!this.binder) return;
        this.binder.slotNodes.forEach((node, index) => {
            this.binder?.bindButton(node, () => this.onSlotClick(index));
        });
    }

    private bindGrillArea(): void {
        if (!this.binder) return;
        const grid = this.binder.canvas.getChildByPath('BBQUI/GrillRoot/GrillGrid');
        const background = this.binder.canvas.getChildByPath('BBQUI/GrillRoot/GrillBackground');
        this.binder.bindButton(grid ?? null, () => this.onGrillAreaClick());
        this.binder.bindButton(background ?? null, () => this.onGrillAreaClick());
    }

    private bindTrashBin(): void {
        if (!this.binder) return;
        const trash = this.binder.canvas.getChildByPath('TrashBin');
        this.binder.bindButton(trash ?? null, () => this.onTrashBinClick());
    }

    private bindPlateArea(): void {
        if (!this.binder) return;
        const panel = this.binder.canvas.getChildByPath('BBQUI/PackingInfoPanel');
        if (!panel) return;
    }

    private toggleIngredient(type: IngredientType): void {
        if (!this.state || !this.binder) return;
        if (this.state.hand.kind !== 'none') {
            this.showMessage('请先放下手上的物品', true);
            return;
        }
        this.state.hand = { kind: 'ingredient', ingredient: type };
        this.updateHandDisplay();
    }

    private toggleTool(tool: BBQTool): void {
        if (!this.state || !this.binder) return;
        if (this.state.hand.kind === 'tool' && this.state.hand.tool === tool) {
            this.state.hand = { kind: 'none' };
        } else if (this.state.hand.kind !== 'none') {
            this.showMessage('请先放下手上的物品', true);
            return;
        } else {
            this.state.hand = { kind: 'tool', tool };
        }
        this.updateHandDisplay();
    }

    private onSlotClick(index: number): void {
        if (!this.state || !this.binder) return;
        if (this.isOver) return;
        this.lastSlotClickAt = Date.now();

        if (this.state.hand.kind === 'trash') {
            this.showMessage('请将烤焦食材丢到垃圾桶', true);
            return;
        }

        if (this.state.hand.kind === 'ingredient') {
            const handItem = this.popHandItem();
            if (!handItem) {
                this.showMessage('请从订单区取串', true);
                return;
            }
            const result = this.grillController.placeIngredient(this.state, index, handItem.ingredient, handItem.orderId);
            if (!result.success) {
                this.restoreHandItem(handItem);
                this.showMessage(result.reason, true);
                return;
            }
            this.audioPort.playPlace();
            if (this.state.handItems.length === 0) {
                this.state.hand = { kind: 'none' };
            }
            this.updateHandDisplay();
            this.refreshSlot(index);
            return;
        }

        if (this.state.hand.kind === 'tool' && this.state.hand.tool) {
            const result = this.grillController.applyTool(this.state, index, this.state.hand.tool);
            if (!result.success) {
                this.showMessage(result.reason, true);
                return;
            }
            if (this.state.hand.tool === 'sauce') this.audioPort.playSauce();
            if (this.state.hand.tool === 'spice') this.audioPort.playSpice();
            this.refreshSlot(index);
            return;
        }

        if (this.state.hand.kind === 'grill' && this.state.handGrill) {
            const slot = this.state.slots[index];
            if (slot && slot.ingredient) {
                this.showMessage('该格位已被占用', true);
                return;
            }
            this.placeSnapshotToSlot(index, this.state.handGrill.snapshot);
            this.state.handGrill = null;
            this.state.hand = { kind: 'none' };
            this.updateHandDisplay();
            this.refreshSlot(index);
            return;
        }

        if (this.tryPickCookedFromSlot(index)) {
            return;
        }

        if (this.state.hand.kind === 'cooked') {
            this.showMessage('请将手上的食材放回盘子', true);
            return;
        }

        const slot = this.state.slots[index];
        if (slot && slot.cookState === 'burnt') {
            if (this.state.hand.kind !== 'none') {
                this.showMessage('请先放下手上的物品', true);
                return;
            }
            this.trashSlotIndex = index;
            this.state.hand = { kind: 'trash', ingredient: slot.ingredient ?? undefined };
            this.updateHandDisplay();
            this.showMessage('拿起烤焦食材，点垃圾桶丢弃');
            return;
        }

        if (slot && slot.ingredient) {
            if (this.state.hand.kind !== 'none') {
                this.showMessage('请先放下手上的物品', true);
                return;
            }
            const snapshot = this.createSlotSnapshot(slot);
            this.state.hand = { kind: 'grill', ingredient: slot.ingredient };
            this.state.handGrill = { fromIndex: index, snapshot };
            this.grillController.clearSlot(slot);
            this.updateHandDisplay();
            this.refreshSlot(index);
            this.showMessage('拿起食材，可换位置或点垃圾桶丢弃');
        }
    }

    private onGrillAreaClick(): void {
        if (!this.state || !this.binder) return;
        if (this.isOver) return;
        if (Date.now() - this.lastSlotClickAt < 80) return;
        if (this.state.hand.kind === 'trash') {
            this.showMessage('请将烤焦食材丢到垃圾桶', true);
            return;
        }
        if (this.state.hand.kind === 'cooked') {
            this.showMessage('请将手上的食材放回盘子', true);
            return;
        }
        if (this.state.hand.kind === 'grill' && this.state.handGrill) {
            const index = this.state.slots.findIndex((slot) => !slot.ingredient);
            if (index < 0) {
                this.showMessage('烤架已满', true);
                return;
            }
            this.placeSnapshotToSlot(index, this.state.handGrill.snapshot);
            this.state.handGrill = null;
            this.state.hand = { kind: 'none' };
            this.updateHandDisplay();
            this.refreshSlot(index);
            return;
        }
        if (this.state.hand.kind !== 'ingredient') return;
        const index = this.state.slots.findIndex((slot) => !slot.ingredient);
        if (index < 0) {
            this.showMessage('烤架已满', true);
            return;
        }
        const handItem = this.popHandItem();
        if (!handItem) {
            this.showMessage('请从订单区取串', true);
            return;
        }
        const result = this.grillController.placeIngredient(this.state, index, handItem.ingredient, handItem.orderId);
        if (!result.success) {
            this.restoreHandItem(handItem);
            this.showMessage(result.reason, true);
            return;
        }
        this.audioPort.playPlace();
        if (this.state.handItems.length === 0) {
            this.state.hand = { kind: 'none' };
        }
        this.updateHandDisplay();
        this.refreshSlot(index);
    }

    private onTrashBinClick(): void {
        if (!this.state) return;
        if (this.state.hand.kind === 'grill' && this.state.handGrill) {
            const snapshot = this.state.handGrill.snapshot;
            if (snapshot.orderId) {
                const order = this.state.orders.find((entry) => entry.id === snapshot.orderId);
                if (order) {
                    const pending = order.pendingItems?.find((entry) => entry.ingredient === snapshot.ingredient);
                    if (pending) {
                        pending.count += 1;
                    } else {
                        order.pendingItems = order.pendingItems ?? [];
                        order.pendingItems.push({ ingredient: snapshot.ingredient, count: 1 });
                    }
                }
            }
            this.state.handGrill = null;
            this.state.hand = { kind: 'none' };
            this.updateHandDisplay();
            this.showMessage('已丢弃食材', true);
            this.refreshOrders();
            return;
        }
        if (this.trashSlotIndex == null) return;
        const slot = this.state.slots[this.trashSlotIndex];
        if (!slot || slot.cookState !== 'burnt') {
            this.trashSlotIndex = null;
            this.state.hand = { kind: 'none' };
            this.updateHandDisplay();
            return;
        }
        if (slot.orderId) {
            const order = this.state.orders.find((entry) => entry.id === slot.orderId);
            if (order) {
                const pending = order.pendingItems?.find((entry) => entry.ingredient === slot.ingredient);
                if (pending) {
                    pending.count += 1;
                } else if (slot.ingredient) {
                    order.pendingItems = order.pendingItems ?? [];
                    order.pendingItems.push({ ingredient: slot.ingredient, count: 1 });
                }
            }
        }
        this.grillController.clearSlot(slot);
        this.state.smoke = Math.max(0, this.state.smoke - 5);
        const index = this.trashSlotIndex;
        this.trashSlotIndex = null;
        this.state.hand = { kind: 'none' };
        this.updateHandDisplay();
        this.showMessage('已丢弃烤焦食材', true);
        this.refreshSlot(index);
        this.refreshOrders();
    }

    private onPlateClick(): void {
        if (!this.state) return;
        if (this.isOver) return;
        if (this.state.hand.kind === 'cooked' && (this.state.handCooked || this.state.handCookedBatch.length > 0)) {
            const orderId = this.state.handCooked?.item.orderId ?? this.state.handCookedBatch[0]?.item.orderId ?? null;
            if (orderId) {
                this.onPlateTableClick(orderId);
                return;
            }
        }
        if (this.state.hand.kind === 'grill' && this.state.handGrill?.snapshot.orderId) {
            this.onPlateTableClick(this.state.handGrill.snapshot.orderId);
            return;
        }
        if (this.state.hand.kind === 'grill' && this.state.handGrill) {
            const snapshot = this.state.handGrill.snapshot;
            if (snapshot.cookState !== 'cooked') {
                this.showMessage('火候未到，不能装盘', true);
                return;
            }
            const item = {
                ingredient: snapshot.ingredient,
                orderId: snapshot.orderId ?? undefined,
                cookState: snapshot.cookState,
                cookProgress: Math.max(0, Math.min(1, snapshot.cookElapsed / Math.max(0.01, snapshot.cookDuration))),
                heatLevel: snapshot.heatLevel,
                hasSauce: snapshot.hasSauce,
                hasSpice: snapshot.hasSpice
            };
            const result = this.serveController.addItemToPlate(this.state, item);
            if (!result.success) {
                this.showMessage(result.reason, true);
                return;
            }
            this.state.handGrill = null;
            this.state.hand = { kind: 'none' };
            this.audioPort.playPlace();
            this.showMessage('装盘完成');
            this.updateHandDisplay();
            this.refreshPlate();
            this.refreshOrders();
            return;
        }
        if (this.state.hand.kind === 'cooked' && this.state.handCookedBatch.length > 0) {
            const batch = this.state.handCookedBatch[0];
            const result = this.serveController.addItemToPlate(this.state, batch.item);
            if (!result.success) {
                this.showMessage(result.reason, true);
                return;
            }
            this.state.handCookedBatch.shift();
            this.audioPort.playPlace();
            this.showMessage('装盘完成');
            if (this.state.handCookedBatch.length === 0) {
                this.state.hand = { kind: 'none' };
            } else {
                const last = this.state.handCookedBatch[this.state.handCookedBatch.length - 1];
                this.state.hand.ingredient = last.item.ingredient;
            }
            this.updateHandDisplay();
            this.refreshPlate();
            this.refreshOrders();
            return;
        }
        if (this.state.hand.kind === 'cooked' && this.state.handCooked) {
            const result = this.serveController.addItemToPlate(this.state, this.state.handCooked.item);
            if (!result.success) {
                this.showMessage(result.reason, true);
                return;
            }
            this.state.handCooked = null;
            this.state.hand = { kind: 'none' };
            this.audioPort.playPlace();
            this.showMessage('装盘完成');
            this.updateHandDisplay();
            this.refreshPlate();
            this.refreshOrders();
        }
    }

    private onPlateItemPick(index: number): void {
        if (!this.state) return;
        if (this.isOver) return;
        if (this.state.hand.kind !== 'none') {
            this.showMessage('请先放下手上的物品', true);
            return;
        }
        const result = this.serveController.removeFromPlate(this.state, index);
        if (!result.success || !result.item) {
            this.showMessage(result.reason, true);
            return;
        }
        this.state.hand = { kind: 'cooked', ingredient: result.item.ingredient };
        this.state.handCooked = {
            item: result.item,
            from: 'plate',
            plateIndex: index
        };
        this.updateHandDisplay();
        this.refreshPlate();
        this.refreshOrders();
    }

    private onServe(): void {
        if (!this.state) return;
        this.showMessage('请在叫号区选择桌号');
    }

    private onPlateTableClick(orderId: string): void {
        if (!this.state) return;
        if (this.isOver) return;

        if (this.state.hand.kind === 'grill' && this.state.handGrill) {
            const snapshot = this.state.handGrill.snapshot;
            if (snapshot.cookState !== 'cooked') {
                this.showMessage('火候未到，不能装盘', true);
                return;
            }
            if (snapshot.orderId && snapshot.orderId !== orderId) {
                this.showMessage('这串不是该桌的', true);
                return;
            }
            const item = {
                ingredient: snapshot.ingredient,
                orderId: orderId,
                cookState: snapshot.cookState,
                cookProgress: Math.max(0, Math.min(1, snapshot.cookElapsed / Math.max(0.01, snapshot.cookDuration))),
                heatLevel: snapshot.heatLevel,
                hasSauce: snapshot.hasSauce,
                hasSpice: snapshot.hasSpice
            };
            const result = this.serveController.addItemToPlate(this.state, item);
            if (!result.success) {
                this.showMessage(result.reason, true);
                return;
            }
            this.state.handGrill = null;
            this.state.hand = { kind: 'none' };
            this.audioPort.playPlace();
            this.showMessage('装盘完成');
            this.updateHandDisplay();
            this.refreshPlate();
            this.refreshOrders();
            return;
        }

        if (this.state.hand.kind === 'cooked' && this.state.handCookedBatch.length > 0) {
            const batch = this.state.handCookedBatch[0];
            if (batch.item.orderId && batch.item.orderId !== orderId) {
                this.showMessage('这串不是该桌的', true);
                return;
            }
            batch.item.orderId = orderId;
            const result = this.serveController.addItemToPlate(this.state, batch.item);
            if (!result.success) {
                this.showMessage(result.reason, true);
                return;
            }
            this.state.handCookedBatch.shift();
            if (this.state.handCookedBatch.length === 0) {
                this.state.hand = { kind: 'none' };
            } else {
                const last = this.state.handCookedBatch[this.state.handCookedBatch.length - 1];
                this.state.hand.ingredient = last.item.ingredient;
            }
            this.audioPort.playPlace();
            this.showMessage('装盘完成');
            this.updateHandDisplay();
            this.refreshPlate();
            this.refreshOrders();
            return;
        }

        if (this.state.hand.kind === 'cooked' && this.state.handCooked) {
            if (this.state.handCooked.item.orderId && this.state.handCooked.item.orderId !== orderId) {
                this.showMessage('这串不是该桌的', true);
                return;
            }
            this.state.handCooked.item.orderId = orderId;
            const result = this.serveController.addItemToPlate(this.state, this.state.handCooked.item);
            if (!result.success) {
                this.showMessage(result.reason, true);
                return;
            }
            this.state.handCooked = null;
            this.state.hand = { kind: 'none' };
            this.audioPort.playPlace();
            this.showMessage('装盘完成');
            this.updateHandDisplay();
            this.refreshPlate();
            this.refreshOrders();
            return;
        }

        this.showMessage('请先拿起熟食', true);
    }

    private refreshDelivery(): void {
        if (!this.state || !this.binder) return;
        const labels: string[] = [];
        for (let tableId = 1; tableId <= BBQ_CONFIG.maxActiveOrders; tableId += 1) {
            const order = this.state.orders.find((item) => item.tableId === tableId);
            labels.push(order ? `叫号 桌${tableId}` : `叫号 桌${tableId}（空）`);
        }
        this.binder.updateDelivery(labels, (index) => {
            const tableId = index + 1;
            this.callTable(tableId);
        });
    }

    private callTable(tableId: number): void {
        if (!this.state) return;
        if (this.state.hand.kind !== 'none') {
            this.showMessage('请先放下手上的物品', true);
            return;
        }
        const order = this.state.orders.find((item) => item.tableId === tableId);
        if (!order) {
            this.showMessage('该桌暂无订单', true);
            return;
        }
        const serve = this.serveController.tryServe(this.state, order.id);
        if (!serve.result) {
            this.showMessage('暂无订单', true);
            return;
        }
        if (!serve.result.success) {
            order.callCount += 1;
            order.heat = Math.max(0, order.heat - 10);
            this.state.combo = 0;
            this.state.badCount += 1;
            this.showMessage(`退餐：${serve.result.reason} 热度-10`, true);
            this.refreshAll();
            return;
        }

        const penalty = order.callCount * 10;
        const finalScore = Math.max(60, serve.result.score - penalty);
        const finalMoney = serve.result.money;

        this.state.totalServed += 1;
        if (finalScore >= 100) {
            this.state.superGoodCount += 1;
            this.state.combo += 1;
        } else if (finalScore >= 80) {
            this.state.goodCount += 1;
            this.state.combo += 1;
        } else {
            this.state.badCount += 1;
            this.state.combo = 0;
        }

        this.currencyPort.completeOrder(finalMoney, finalScore);
        this.audioPort.playServe();
        this.showMessage(`${serve.result.reason} +${finalMoney}`);
        this.orderController.queueNextOrder(tableId, finalScore);
        this.refreshAll();
    }

    private setHeatLevel(level: BBQHeatLevel): void {
        if (!this.state) return;
        this.state.heatLevel = level;
        for (const slot of this.state.slots) {
            if (slot.ingredient) {
                slot.heatLevel = level;
            }
        }
        this.showMessage(`火力切换：${level === 'hot' ? '高温' : level === 'warm' ? '保温' : '中温'}`);
        this.refreshHeatButtons();
        this.refreshTopInfo();
    }

    private createSlotSnapshot(slot: { ingredient: IngredientType | null; orderId: string | null; cookElapsed: number; cookDuration: number; cookState: BBQCookState; heatLevel: BBQHeatLevel; hasSauce: boolean; hasSpice: boolean }): BBQSlotSnapshot {
        return {
            ingredient: slot.ingredient!,
            orderId: slot.orderId,
            cookElapsed: slot.cookElapsed,
            cookDuration: slot.cookDuration,
            cookState: slot.cookState,
            heatLevel: slot.heatLevel,
            hasSauce: slot.hasSauce,
            hasSpice: slot.hasSpice
        };
    }

    private placeSnapshotToSlot(index: number, snapshot: BBQSlotSnapshot): void {
        if (!this.state) return;
        const slot = this.state.slots[index];
        if (!slot) return;
        slot.ingredient = snapshot.ingredient;
        slot.orderId = snapshot.orderId;
        slot.cookElapsed = snapshot.cookElapsed;
        slot.cookDuration = snapshot.cookDuration;
        slot.cookState = snapshot.cookState;
        slot.heatLevel = snapshot.heatLevel;
        slot.hasSauce = snapshot.hasSauce;
        slot.hasSpice = snapshot.hasSpice;
    }

    private updateOrderProgress(dt: number): void {
        if (!this.state) return;
        const earned = this.getEarnedMoney();
        const target = getLevelTargetMoney();
        const progress = target > 0 ? Math.max(0, Math.min(1, earned / target)) : 0;
        const avgHeat = this.state.orders.length > 0
            ? this.state.orders.reduce((sum, order) => sum + (order.heat ?? 100), 0) / this.state.orders.length
            : 100;
        const heatBonus = progress >= 0.25
            ? avgHeat >= 85 ? 2 : avgHeat >= 70 ? 1 : 0
            : 0;
        const desired = Math.min(
            BBQ_CONFIG.maxActiveOrders,
            2 + Math.floor(progress * 8) + heatBonus
        );
        if (desired > this.unlockedTables) {
            this.unlockedTables = desired;
        }
        this.orderController.setMaxActiveTables(this.unlockedTables);

        const total = this.state.orders.length;
        const pageCount = Math.max(1, Math.ceil(total / this.orderPageSize));
        if (this.orderPageIndex >= pageCount) {
            this.orderPageIndex = 0;
        }
        if (pageCount > 1) {
            this.orderPageTimer += dt;
            if (this.orderPageTimer >= 4) {
                this.orderPageTimer = 0;
                this.orderPageIndex = (this.orderPageIndex + 1) % pageCount;
            }
        } else {
            this.orderPageIndex = 0;
            this.orderPageTimer = 0;
        }
    }

    private refreshOrders(): void {
        if (!this.state || !this.binder) return;
        const orders = [...this.state.orders].sort((a, b) => a.tableId - b.tableId);
        this.binder.updateCustomers(orders);
        const total = orders.length;
        const pageCount = Math.max(1, Math.ceil(total / this.orderPageSize));
        if (this.orderPageIndex >= pageCount) {
            this.orderPageIndex = 0;
        }
        const start = this.orderPageIndex * this.orderPageSize;
        const visible = orders.slice(start, start + this.orderPageSize);
        this.binder.updateOrders(visible, {
            page: this.orderPageIndex,
            pages: pageCount,
            total
        });
        this.binder.updateOrderItems(visible);
        this.binder.updatePackingInfo(visible, this.state.plate);
    }

    private refreshAll(): void {
        if (!this.state || !this.binder) return;
        this.refreshOrders();
        this.binder.updateSlots(this.state);
        this.binder.updatePlate(this.state.plate);
        this.refreshTopInfo();
        this.binder.updateMoney(this.getEarnedMoney());
        this.refreshDelivery();
    }

    private refreshTopInfo(): void {
        if (!this.state || !this.binder) return;
        this.binder.updateTopInfo(this.state);
    }

    private refreshSlot(index: number): void {
        if (!this.state || !this.binder) return;
        this.binder.updateSlots(this.state, index);
    }

    private refreshPlate(): void {
        if (!this.state || !this.binder) return;
        this.binder.updatePlate(this.state.plate);
    }

    private refreshHeatButtons(): void {
        if (!this.state || !this.binder) return;
        this.binder.setButtonSelected(this.binder.fireButtons.hot, this.state.heatLevel === 'hot');
        this.binder.setButtonSelected(this.binder.fireButtons.mid, this.state.heatLevel === 'mid');
        this.binder.setButtonSelected(this.binder.fireButtons.warm, this.state.heatLevel === 'warm');
    }

    private ensureTimeManagerRunning(): void {
        const timeManager = this.resolveTimeManager();
        if (!timeManager) return;
        this.timeManager = timeManager;
        this.bindTimeLabel();
        if (!this.timeManagerBound) {
            timeManager.onDayEnd(() => this.finishLevel());
            this.timeManagerBound = true;
        }
        if (!timeManager.isBusinessOpen() && !this.isPhonePanelActive()) {
            timeManager.forceRestart();
        } else {
            timeManager.resumeTime();
        }
        if (timeManager.isBusinessOpen()) {
            this.unschedule(this.ensureTimeManagerRunning);
        }
    }

    private ensureTimeProgress(dt: number): void {
        const timeManager = this.timeManager ?? this.resolveTimeManager();
        if (!timeManager) return;
        this.timeManager = timeManager;

        if (!this.manualTimeTick) {
            const hour = timeManager.getCurrentHour();
            const minute = timeManager.getCurrentMinute();
            if (hour === this.lastTimeHour && minute === this.lastTimeMinute) {
                this.timeFreezeTimer += dt;
                if (this.timeFreezeTimer >= 1.5) {
                    this.manualTimeTick = true;
                    if (!timeManager.isBusinessOpen() && !this.isPhonePanelActive()) {
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
            if (!timeManager.isBusinessOpen() && !this.isPhonePanelActive()) {
                timeManager.forceRestart();
            }
            timeManager.update(dt);
            this.lastTimeHour = timeManager.getCurrentHour();
            this.lastTimeMinute = timeManager.getCurrentMinute();
        }
    }

    private resolveTimeManager(): TimeManager | null {
        const scene = this.node.scene;
        return scene?.getComponentInChildren(TimeManager) ?? TimeManager.instance;
    }

    private isPhonePanelActive(): boolean {
        const panel = this.binder?.canvas.getChildByPath('PhonePanel');
        return !!panel?.active;
    }

    private bindTimeLabel(): void {
        if (!this.timeManager || !this.binder) return;
        const labelNode = this.binder.canvas.getChildByPath('TopInfoPanel/TimerLabel')
            || this.binder.canvas.getChildByPath('BBQUI/TopInfo/TimerLabel');
        const label = labelNode?.getComponent(Label);
        if (label) {
            (this.timeManager as any).timeLabel = label;
        }
    }

    private updateHandDisplay(): void {
        if (!this.state || !this.binder) return;
        let ingredient: IngredientType | null = null;
        if (this.state.hand.kind === 'ingredient' || this.state.hand.kind === 'trash') {
            ingredient = this.state.hand.ingredient ?? null;
        } else if (this.state.hand.kind === 'cooked') {
            ingredient = this.state.handCooked?.item.ingredient ?? this.state.hand.ingredient ?? null;
        } else if (this.state.hand.kind === 'grill') {
            ingredient = this.state.handGrill?.snapshot.ingredient ?? this.state.hand.ingredient ?? null;
        }
        const tool = this.state.hand.kind === 'tool' ? this.state.hand.tool ?? null : null;
        const iconOverride = this.state.hand.kind === 'trash' ? '🗑️' : null;
        let count = 0;
        if (this.state.hand.kind === 'ingredient') {
            count = this.state.handItems.length;
        } else if (this.state.hand.kind === 'cooked' && this.state.handCookedBatch.length > 0) {
            count = this.state.handCookedBatch.length;
        }
        this.binder.updateHandDisplay(ingredient, tool, count, iconOverride);
        if (this.binder.mouseFollower?.active && this.lastPointer) {
            this.updateFollowerPosition(this.lastPointer.x, this.lastPointer.y);
        }
        this.refreshIngredientButtons();
        this.refreshToolButtons();
        this.updateUiHitTestState();
    }

    private refreshIngredientButtons(): void {
        if (!this.state || !this.binder) return;
        this.binder.ingredientButtons.forEach((node, type) => {
            const selected = this.state!.hand.kind === 'ingredient' && this.state!.hand.ingredient === type;
            this.binder?.setButtonSelected(node, selected);
        });
    }

    private refreshToolButtons(): void {
        if (!this.state || !this.binder) return;
        const selectedTool = this.state.hand.kind === 'tool' ? this.state.hand.tool : null;
        this.binder.setButtonSelected(this.binder.toolButtons.sauce, selectedTool === 'sauce');
        this.binder.setButtonSelected(this.binder.toolButtons.spice, selectedTool === 'spice');
    }

    private showMessage(text: string, isError: boolean = false): void {
        if (isError) {
            this.messageSystem?.show(`⚠️ ${text}`);
            return;
        }
        this.binder?.showMessage(text, new Color(255, 244, 200, 255));
    }

    private finishLevel(): void {
        if (!this.state || this.isOver) return;
        this.isOver = true;
        this.state.hand = { kind: 'none' };
        this.state.handItems = [];
        this.state.handCooked = null;
        this.state.handGrill = null;
        this.state.handCookedBatch = [];
        this.updateHandDisplay();
        const targetMoney = getLevelTargetMoney();
        const money = this.getEarnedMoney();
        const isFailed = money < targetMoney;
        const failReason = isFailed ? `目标金币未达成：${money}/${targetMoney}` : '';

        this.timeManager?.pauseTime();

        if (!this.settlementUI) {
            this.settlementUI = new SettlementUI();
        }

        this.settlementUI.show(
            {
                money,
                superGood: this.state.superGoodCount,
                good: this.state.goodCount,
                bad: this.state.badCount,
                isFailed,
                failReason
            },
            {
                onNextDay: () => this.onNextLevel(),
                onRetry: () => this.onRetry(),
                onReturnMenu: () => this.onReturnMenu()
            }
        );
    }

    private onRetry(): void {
        this.isOver = true;
        const gameManager = this.currencyPort.getManager();
        if (gameManager?.currentLevel) {
            gameManager.startLevel(gameManager.currentLevel.levelId);
        }
    }

    private onNextLevel(): void {
        this.isOver = true;
        const gameManager = this.currencyPort.getManager();
        if (gameManager?.currentLevel) {
            gameManager.startLevel(gameManager.currentLevel.levelId + 1);
        }
    }

    private onReturnMenu(): void {
        this.isOver = true;
        const gameManager = this.currencyPort.getManager();
        gameManager?.returnToMenu();
    }

    private setupFollowerInput(): void {
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
    }

    private onMouseMove(event: EventMouse): void {
        this.updatePointer(event.getLocation());
    }

    private onMouseDown(event: EventMouse): void {
        if (event.getButton() === EventMouse.BUTTON_RIGHT) {
            if (this.state?.hand.kind === 'trash') {
                this.trashSlotIndex = null;
                this.state.hand = { kind: 'none' };
                this.updateHandDisplay();
                return;
            }
            if (this.state?.hand.kind === 'tool') {
                this.state.hand = { kind: 'none' };
                this.updateHandDisplay();
                return;
            }
            if (this.state?.hand.kind === 'cooked') {
                if (this.dropCookedBatch()) return;
                if (this.dropCookedItem()) return;
            }
            if (this.state?.hand.kind === 'grill') {
                if (this.dropGrillItem()) return;
            }
            if (this.dropHandItems()) return;
        }
        this.updatePointer(event.getLocation());
    }

    private onTouchMove(event: EventTouch): void {
        this.updatePointer(event.getLocation());
    }

    private onTouchStart(event: EventTouch): void {
        this.updatePointer(event.getLocation());
    }

    private updatePointer(location: { x: number; y: number }): void {
        this.lastPointer = { x: location.x, y: location.y };
        this.updateFollowerPosition(location.x, location.y);
    }

    private onOrderItemPick(orderId: string, ingredient: IngredientType): void {
        if (!this.state) return;
        if (this.state.hand.kind === 'tool' || this.state.hand.kind === 'cooked' || this.state.hand.kind === 'trash' || this.state.hand.kind === 'grill') {
            this.showMessage('请先放下手上的物品', true);
            return;
        }
        if (this.state.handItems.length >= this.maxHandItems) {
            this.showMessage(`手上最多${this.maxHandItems}串`, true);
            return;
        }
        const order = this.state.orders.find((item) => item.id === orderId);
        if (!order) return;
        const entry = order.pendingItems?.find((item) => item.ingredient === ingredient);
        if (!entry || entry.count <= 0) {
            this.showMessage('该食材已取完', true);
            return;
        }
        entry.count -= 1;
        this.state.handItems.push({ ingredient, orderId });
        this.state.hand.kind = 'ingredient';
        this.state.hand.ingredient = ingredient;
        this.audioPort.playButtonClick();
        this.updateHandDisplay();
        this.refreshOrders();
    }

    private popHandItem(): { ingredient: IngredientType; orderId: string } | null {
        if (!this.state) return null;
        const item = this.state.handItems.pop() ?? null;
        if (!item) return null;
        if (this.state.handItems.length > 0) {
            const last = this.state.handItems[this.state.handItems.length - 1];
            this.state.hand.ingredient = last.ingredient;
        } else {
            this.state.hand.ingredient = undefined;
        }
        return item;
    }

    private restoreHandItem(item: { ingredient: IngredientType; orderId: string }): void {
        if (!this.state) return;
        const order = this.state.orders.find((entry) => entry.id === item.orderId);
        if (order) {
            const pending = order.pendingItems?.find((entry) => entry.ingredient === item.ingredient);
            if (pending) {
                pending.count += 1;
            } else {
                order.pendingItems = order.pendingItems ?? [];
                order.pendingItems.push({ ingredient: item.ingredient, count: 1 });
            }
        }
        this.state.handItems.push(item);
        this.state.hand.kind = 'ingredient';
        this.state.hand.ingredient = item.ingredient;
        this.refreshOrders();
    }

    private dropHandItems(): boolean {
        if (!this.state || this.state.handItems.length === 0) return false;
        for (const item of this.state.handItems) {
            const order = this.state.orders.find((entry) => entry.id === item.orderId);
            if (!order) continue;
            const pending = order.pendingItems?.find((entry) => entry.ingredient === item.ingredient);
            if (pending) {
                pending.count += 1;
            } else {
                order.pendingItems = order.pendingItems ?? [];
                order.pendingItems.push({ ingredient: item.ingredient, count: 1 });
            }
        }
        this.state.handItems = [];
        this.state.hand = { kind: 'none' };
        this.updateHandDisplay();
        this.refreshOrders();
        return true;
    }

    private dropGrillItem(): boolean {
        if (!this.state || !this.state.handGrill) return false;
        const snapshot = this.state.handGrill.snapshot;
        let targetIndex = this.state.handGrill.fromIndex;
        const original = this.state.slots[targetIndex];
        if (original && original.ingredient) {
            const fallback = this.state.slots.findIndex((slot) => !slot.ingredient);
            if (fallback < 0) {
                this.showMessage('烤架已满，无法放回', true);
                return true;
            }
            targetIndex = fallback;
        }
        this.placeSnapshotToSlot(targetIndex, snapshot);
        this.state.handGrill = null;
        this.state.hand = { kind: 'none' };
        this.updateHandDisplay();
        this.refreshSlot(targetIndex);
        return true;
    }

    private dropCookedItem(): boolean {
        if (!this.state || !this.state.handCooked) return false;
        const hand = this.state.handCooked;
        if (hand.from === 'grill') {
            if (hand.slotIndex == null || !hand.slotSnapshot) {
                return false;
            }
            const slot = this.state.slots[hand.slotIndex];
            if (!slot || slot.ingredient) {
                this.showMessage('原位被占用，无法放回', true);
                return true;
            }
            slot.ingredient = hand.slotSnapshot.ingredient;
            slot.orderId = hand.slotSnapshot.orderId;
            slot.cookElapsed = hand.slotSnapshot.cookElapsed;
            slot.cookDuration = hand.slotSnapshot.cookDuration;
            slot.cookState = hand.slotSnapshot.cookState;
            slot.heatLevel = hand.slotSnapshot.heatLevel;
            slot.hasSauce = hand.slotSnapshot.hasSauce;
            slot.hasSpice = hand.slotSnapshot.hasSpice;
            this.refreshSlot(hand.slotIndex);
        } else {
            const index = hand.plateIndex ?? this.state.plate.length;
            const insertIndex = Math.max(0, Math.min(this.state.plate.length, index));
            this.state.plate.splice(insertIndex, 0, hand.item);
            if (hand.item.orderId) {
                const order = this.state.orders.find((entry) => entry.id === hand.item.orderId);
                if (order) {
                    order.completedCount = Math.min(order.totalCount, order.completedCount + 1);
                }
            }
            this.refreshPlate();
        }
        this.state.handCooked = null;
        this.state.hand = { kind: 'none' };
        this.updateHandDisplay();
        this.refreshOrders();
        return true;
    }

    private dropCookedBatch(): boolean {
        if (!this.state || this.state.handCookedBatch.length === 0) return false;
        const emptySlots = this.state.slots.filter((slot) => !slot.ingredient).length;
        if (emptySlots < this.state.handCookedBatch.length) {
            this.showMessage('烤架已满，无法放回', true);
            return true;
        }
        const refreshed: number[] = [];
        for (const batch of this.state.handCookedBatch) {
            let targetIndex = batch.fromIndex;
            const targetSlot = this.state.slots[targetIndex];
            if (!targetSlot || targetSlot.ingredient) {
                targetIndex = this.state.slots.findIndex((slot) => !slot.ingredient);
            }
            if (targetIndex < 0) {
                this.showMessage('烤架已满，无法放回', true);
                return true;
            }
            this.placeSnapshotToSlot(targetIndex, batch.snapshot);
            refreshed.push(targetIndex);
        }
        this.state.handCookedBatch = [];
        this.state.hand = { kind: 'none' };
        this.updateHandDisplay();
        [...new Set(refreshed)].forEach((index) => this.refreshSlot(index));
        return true;
    }

    private tryPickCookedFromSlot(index: number): boolean {
        if (!this.state) return false;
        const slot = this.state.slots[index];
        if (!slot || !slot.ingredient || slot.cookState !== 'cooked') return false;

        const allowBatch = this.state.hand.kind === 'none'
            || (this.state.hand.kind === 'cooked' && !this.state.handCooked && this.state.handCookedBatch.length > 0);
        if (!allowBatch) {
            this.showMessage('请先放下手上的物品', true);
            return true;
        }

        if (this.state.handCookedBatch.length >= this.maxHandItems) {
            this.showMessage(`手上最多${this.maxHandItems}串`, true);
            return true;
        }

        const result = this.serveController.takeFromSlot(this.state, index);
        if (!result.success || !result.item || !result.snapshot) {
            this.showMessage(result.reason, true);
            return true;
        }

        this.state.handCookedBatch.push({ item: result.item, fromIndex: index, snapshot: result.snapshot });
        this.state.hand = { kind: 'cooked', ingredient: result.item.ingredient };
        this.grillController.clearSlot(slot);
        this.updateHandDisplay();
        this.refreshSlot(index);
        return true;
    }

    private updateFollowerPosition(x: number, y: number): void {
        if (!this.binder?.mouseFollower || !this.canvasCamera) return;
        if (!this.binder.mouseFollower.active) return;
        const world = new Vec3();
        this.canvasCamera.screenToWorld(new Vec3(x, y, 0), world);
        this.binder.mouseFollower.setWorldPosition(world);
    }

    private resolveCanvasCamera(canvas: Node): Camera | null {
        const canvasComp = canvas.getComponent(Canvas);
        if (canvasComp?.cameraComponent) return canvasComp.cameraComponent;
        const cameraNode = this.node.scene?.getChildByName('Main Camera');
        return cameraNode?.getComponent(Camera) ?? null;
    }

    private getEarnedMoney(): number {
        if (!this.state) return 0;
        return Math.max(0, this.currencyPort.getMoney() - this.state.money);
    }

    private updateUiHitTestState(): void {
        if (!this.state) return;
        const shouldDisable = this.state.hand.kind !== 'none';
        if (shouldDisable) {
            this.disableUiHitTest();
        } else {
            this.enableUiHitTest();
        }
    }

    private disableUiHitTest(): void {
        if (this.uiHitTestDisabled || !this.binder) return;
        const canvas = this.binder.canvas;
        this.uiHitTestDisabled = true;
        const allowNames = new Set([
            'GrillRoot',
            'PackingInfoPanel',
            'TrashBin',
            'MouseFollower',
            'HandItem'
        ]);
        for (const child of canvas.children) {
            if (child.name === 'BBQUI') {
                this.disableNodeHitTestExcept(child, allowNames);
                continue;
            }
            if (allowNames.has(child.name)) {
                continue;
            }
            this.disableNodeHitTest(child);
        }
    }

    private enableUiHitTest(): void {
        if (!this.uiHitTestDisabled) return;
        for (const [node, original] of this.blockedHitTests) {
            if (node && node.isValid) {
                const transform = node.getComponent(UITransform);
                if (transform) {
                    transform.hitTest = original as any;
                }
            }
        }
        this.blockedHitTests.clear();
        this.uiHitTestDisabled = false;
    }

    private disableNodeHitTest(node: Node): void {
        const transform = node.getComponent(UITransform);
        if (transform && !this.blockedHitTests.has(node)) {
            this.blockedHitTests.set(node, transform.hitTest.bind(transform));
            transform.hitTest = () => false;
        }
        for (const child of node.children) {
            this.disableNodeHitTest(child);
        }
    }

    private disableNodeHitTestExcept(node: Node, allowNames: Set<string>): void {
        if (allowNames.has(node.name)) return;
        const transform = node.getComponent(UITransform);
        if (transform && !this.blockedHitTests.has(node)) {
            this.blockedHitTests.set(node, transform.hitTest.bind(transform));
            transform.hitTest = () => false;
        }
        for (const child of node.children) {
            this.disableNodeHitTestExcept(child, allowNames);
        }
    }
}
