import { _decorator, Node, Button, Label, find, instantiate } from 'cc';
import { BaseCookingController } from './Base/BaseCookingController';
import { GameConfig, IngredientType } from '../Data/GameConfig';

const { ccclass, property } = _decorator;

type FireZone = 'hot' | 'mid' | 'warm';

interface BBQOrder {
    id: string;
    name: string;
    zone: FireZone;
    price: number;
}

@ccclass('BBQController')
export class BBQController extends BaseCookingController {
    @property(Node)
    uiRoot: Node | null = null;

    @property(Node)
    grillRoot: Node | null = null;
    @property(Node)
    grillGrid: Node | null = null;
    @property(Node)
    gridCells: Node | null = null;
    @property(Node)
    zoneHot: Node | null = null;
    @property(Node)
    zoneMid: Node | null = null;
    @property(Node)
    zoneWarm: Node | null = null;

    @property(Node)
    queuePanel: Node | null = null;
    @property(Node)
    queueList: Node | null = null;
    @property(Node)
    queueItemTemplate: Node | null = null;

    @property(Node)
    controlPanel: Node | null = null;
    @property(Node)
    fireHotBtn: Node | null = null;
    @property(Node)
    fireMidBtn: Node | null = null;
    @property(Node)
    fireWarmBtn: Node | null = null;
    @property(Node)
    sauceBtn: Node | null = null;
    @property(Node)
    spiceBtn: Node | null = null;
    @property(Node)
    fanBtn: Node | null = null;

    @property(Node)
    deliveryPanel: Node | null = null;
    @property(Node)
    deliveryButtons: Node | null = null;
    @property(Node)
    deliveryButtonTemplate: Node | null = null;

    @property(Label)
    heatLabel: Label | null = null;
    @property(Label)
    comboLabel: Label | null = null;
    @property(Label)
    smokeLabel: Label | null = null;

    private currentZone: FireZone = 'mid';
    private orderSeed = 0;
    private maxQueueSize = 3;
    private comboCount = 0;
    private smokeValue = 0;
    private basePrice = 20;

    protected onLoad(): void {
        this.ensureNodes();
        this.bindBaseNodes();
        this.bindButtons();
        this.bindPhoneButton();
        super.onLoad();
    }

    protected initCookingArea(): void {
        this.syncInitialMoney();
        this.initDeliveryButton();
        if (this.queueItemTemplate) {
            this.queueItemTemplate.active = false;
        }
        this.ensureQueue();
        this.updateTopInfo();
        this.schedule(this.ensureQueue, 2);
    }

    protected getRecipe(): any {
        return GameConfig.RECIPE_BBQ_SKEWER ?? GameConfig.RECIPE_FRIED_SKEWER;
    }

    protected onIngredientClick(_ingredientType: IngredientType): void {
        // 最小可跑通版本暂不处理具体食材
    }

    protected checkFoodComplete(): any | null {
        return null;
    }

    protected calculateFoodQuality(): number {
        return 80;
    }

    protected updateOrderQueueDisplay(): void {
        if (!this.queueList || !this.queueItemTemplate) return;
        const template = this.queueItemTemplate;
        for (const child of [...this.queueList.children]) {
            if (child === template) continue;
            child.destroy();
        }
        template.active = false;
        (this.orderQueue as BBQOrder[]).forEach((order, index) => {
            const item = instantiate(template);
            item.active = true;
            item.setParent(this.queueList);
            const labelNode = item.getChildByName('ItemLabel') ?? item;
            const label = labelNode.getComponent(Label) ?? item.getComponentInChildren(Label);
            if (label) {
                label.string = `${index + 1}. ${order.name}`;
            }
        });
    }

    private getCanvas(): Node | null {
        return this.uiRoot ?? this.node.scene?.getChildByName('Canvas') ?? null;
    }

    private findNode(path: string): Node | null {
        const root = this.getCanvas();
        if (!root) return null;
        return find(path, root);
    }

    private ensureNodes(): void {
        this.grillRoot = this.grillRoot ?? this.findNode('BBQUI/GrillRoot');
        this.grillGrid = this.grillGrid ?? this.findNode('BBQUI/GrillRoot/GrillGrid');
        this.gridCells = this.gridCells ?? this.findNode('BBQUI/GrillRoot/GrillGrid/GridCells');
        this.zoneHot = this.zoneHot ?? this.findNode('BBQUI/GrillRoot/GrillGrid/ZoneOverlay/ZoneHot');
        this.zoneMid = this.zoneMid ?? this.findNode('BBQUI/GrillRoot/GrillGrid/ZoneOverlay/ZoneMid');
        this.zoneWarm = this.zoneWarm ?? this.findNode('BBQUI/GrillRoot/GrillGrid/ZoneOverlay/ZoneWarm');

        this.queuePanel = this.queuePanel ?? this.findNode('BBQUI/QueuePanel');
        this.queueList = this.queueList ?? this.findNode('BBQUI/QueuePanel/QueueList');
        this.queueItemTemplate = this.queueItemTemplate ?? this.findNode('BBQUI/QueuePanel/QueueList/QueueItemTemplate');

        this.controlPanel = this.controlPanel ?? this.findNode('BBQUI/ControlPanel');
        this.fireHotBtn = this.fireHotBtn ?? this.findNode('BBQUI/ControlPanel/FireGroup/FireHotBtn');
        this.fireMidBtn = this.fireMidBtn ?? this.findNode('BBQUI/ControlPanel/FireGroup/FireMidBtn');
        this.fireWarmBtn = this.fireWarmBtn ?? this.findNode('BBQUI/ControlPanel/FireGroup/FireWarmBtn');
        this.sauceBtn = this.sauceBtn ?? this.findNode('BBQUI/ControlPanel/ActionGroup/SauceBtn');
        this.spiceBtn = this.spiceBtn ?? this.findNode('BBQUI/ControlPanel/ActionGroup/SpiceBtn');
        this.fanBtn = this.fanBtn ?? this.findNode('BBQUI/ControlPanel/ActionGroup/FanBtn');

        this.deliveryPanel = this.deliveryPanel ?? this.findNode('BBQUI/DeliveryPanel');
        this.deliveryButtons = this.deliveryButtons ?? this.findNode('BBQUI/DeliveryPanel/DeliveryButtons');
        this.deliveryButtonTemplate = this.deliveryButtonTemplate ?? this.findNode('BBQUI/DeliveryPanel/DeliveryButtons/DeliveryButtonTemplate');

        this.heatLabel = this.heatLabel ?? this.findNode('BBQUI/TopInfo/HeatLabel')?.getComponent(Label) ?? null;
        this.comboLabel = this.comboLabel ?? this.findNode('BBQUI/TopInfo/ComboLabel')?.getComponent(Label) ?? null;
        this.smokeLabel = this.smokeLabel ?? this.findNode('BBQUI/TopInfo/SmokeLabel')?.getComponent(Label) ?? null;
    }

    private bindBaseNodes(): void {
        const canvas = this.getCanvas();
        if (!canvas) return;
        this.moneyLabel = this.moneyLabel ?? find('MoneyLabel', canvas)?.getComponent(Label) ?? null;
        this.reviewLabel = this.reviewLabel ?? find('ReviewLabel', canvas)?.getComponent(Label) ?? null;
        this.timeLabel = this.timeLabel ?? find('TimeLabel', canvas)?.getComponent(Label) ?? null;
        this.phonePanel = this.phonePanel ?? find('PhonePanel', canvas);
        this.orderQueueContainer = this.orderQueueContainer ?? this.queueList ?? find('OrderPanel', canvas);
        if (!this.packageBoxNodes || this.packageBoxNodes.length === 0) {
            const boxes = [
                find('PackingBox1', canvas),
                find('PackingBox2', canvas),
                find('PackingBox3', canvas)
            ].filter(Boolean) as Node[];
            if (boxes.length > 0) {
                this.packageBoxNodes = boxes;
                this.packagingSystem.bindBoxNodes(boxes);
            }
        }
    }

    private bindButtons(): void {
        this.bindButton(this.fireHotBtn, this.onFireHotClick);
        this.bindButton(this.fireMidBtn, this.onFireMidClick);
        this.bindButton(this.fireWarmBtn, this.onFireWarmClick);
        this.bindButton(this.sauceBtn, this.onSauceClick);
        this.bindButton(this.spiceBtn, this.onSpiceClick);
        this.bindButton(this.fanBtn, this.onFanClick);
    }

    private bindPhoneButton(): void {
        const canvas = this.getCanvas();
        if (!canvas) return;
        const phoneButton = find('PhoneButton', canvas);
        if (!phoneButton) return;
        const btnComp = phoneButton.getComponent(Button);
        if (btnComp) {
            phoneButton.off(Button.EventType.CLICK, this.onPhoneButtonClick, this);
            phoneButton.on(Button.EventType.CLICK, this.onPhoneButtonClick, this);
            return;
        }
        phoneButton.off(Node.EventType.TOUCH_END, this.onPhoneButtonClick, this);
        phoneButton.on(Node.EventType.TOUCH_END, this.onPhoneButtonClick, this);
    }

    private bindButton(node: Node | null, handler: () => void): void {
        if (!node) return;
        const button = node.getComponent(Button);
        if (!button) return;
        node.off(Button.EventType.CLICK, handler, this);
        node.on(Button.EventType.CLICK, handler, this);
    }

    private initDeliveryButton(): void {
        const buttonNode = this.deliveryButtonTemplate ?? null;
        if (!buttonNode) return;
        buttonNode.active = true;
        const label = buttonNode.getComponentInChildren(Label);
        if (label) {
            label.string = '交付';
        }
        this.bindButton(buttonNode, this.onDeliverClick);
    }

    private syncInitialMoney(): void {
        const level = GameConfig.LEVELS.find((item) => item.sceneName === (this.node.scene?.name ?? '') || item.levelId === 5);
        if (level) {
            this.totalMoney = level.initialMoney;
            this.updateMoneyDisplay();
        }
    }

    private ensureQueue(): void {
        while (this.orderQueue.length < this.maxQueueSize) {
            const order = this.createOrder();
            this.addOrder(order);
        }
    }

    private createOrder(): BBQOrder {
        const zones: FireZone[] = ['hot', 'mid', 'warm'];
        const zone = zones[Math.floor(Math.random() * zones.length)];
        const orderName = this.formatOrderName(zone);
        return {
            id: `bbq_${++this.orderSeed}`,
            name: orderName,
            zone,
            price: this.basePrice
        };
    }

    private formatOrderName(zone: FireZone): string {
        const zoneText = this.getZoneText(zone);
        const variants = ['肉串', '蔬菜串', '混合串'];
        const variant = variants[Math.floor(Math.random() * variants.length)];
        return `${zoneText}${variant}`;
    }

    private onFireHotClick(): void {
        this.setFireLevel('hot');
    }

    private onFireMidClick(): void {
        this.setFireLevel('mid');
    }

    private onFireWarmClick(): void {
        this.setFireLevel('warm');
    }

    private onSauceClick(): void {
        this.showMessage('已刷酱');
    }

    private onSpiceClick(): void {
        this.showMessage('已撒料');
    }

    private onFanClick(): void {
        this.smokeValue = Math.max(0, this.smokeValue - 10);
        this.updateTopInfo();
        this.showMessage('扇风降烟');
    }

    private setFireLevel(level: FireZone): void {
        this.currentZone = level;
        this.showMessage(`选择${this.getZoneText(level)}烤制`);
    }

    private getZoneText(level: FireZone): string {
        switch (level) {
            case 'hot':
                return '高温区';
            case 'mid':
                return '中温区';
            case 'warm':
                return '保温区';
            default:
                return '';
        }
    }

    private onDeliverClick(): void {
        const order = this.orderQueue[0] as BBQOrder | undefined;
        if (!order) {
            this.showMessage('暂无订单');
            return;
        }
        this.completeOrder(order.id);
        const isMatch = order.zone === this.currentZone;
        if (isMatch) {
            this.comboCount += 1;
        } else {
            this.comboCount = 0;
        }
        const reviewType = isMatch ? (this.comboCount >= 3 ? 'super_good' : 'good') : 'bad';
        if (reviewType === 'bad') {
            this.reviewSystem.recordOrderFailed();
        } else {
            this.reviewSystem.recordOrderCompleted(order.price);
        }
        this.reviewSystem.recordCustomer();
        this.addReview(reviewType);
        this.addMoney(order.price);
        this.smokeValue = Math.min(100, this.smokeValue + 5);
        this.updateTopInfo();
        this.ensureQueue();
    }

    private updateTopInfo(): void {
        if (this.heatLabel) {
            this.heatLabel.string = `热度 ${this.reviewSystem.shopHeat}`;
        }
        if (this.comboLabel) {
            this.comboLabel.string = `连击 ${this.comboCount}`;
        }
        if (this.smokeLabel) {
            this.smokeLabel.string = `烟雾 ${this.smokeValue}`;
        }
    }
}
