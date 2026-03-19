import { Button, Label, Node, UITransform, find, instantiate, Color, Sprite, SpriteFrame } from 'cc';
import { IngredientConfig } from '../../Config/IngredientConfig';
import { BBQ_CONFIG } from '../model/BBQConfig';
import { BBQOrderState, BBQPlateItem, BBQState, BBQTool } from '../model/BBQTypes';
import { BBQOrderItemView } from './BBQOrderItemView';
import { BBQSlotView } from './BBQSlotView';
import { BBQFloatingText } from './BBQFloatingText';
import { IngredientType } from '../../Data/GameConfig';

export class BBQUIBinder {
    public readonly canvas: Node;
    public readonly bbqRoot: Node | null;
    public readonly slotNodes: Node[] = [];
    public readonly slotViews: BBQSlotView[] = [];
    public readonly floatingText: BBQFloatingText;

    public readonly fireButtons: Record<'hot' | 'mid' | 'warm', Node | null>;
    public readonly toolButtons: Record<'sauce' | 'spice' | 'fan', Node | null>;
    public readonly ingredientButtons: Map<IngredientType, Node> = new Map();

    public readonly serveButton: Node | null;
    public readonly mouseFollower: Node | null;

    private queueList: Node | null;
    private queueTemplate: Node | null;
    private deliveryList: Node | null;
    private deliveryTemplate: Node | null;
    private deliveryButtons: Node[] = [];
    private orderItemsList: Node | null = null;
    private packingItemsList: Node | null = null;
    private customerArea: Node | null = null;
    private queueTitle: Label | null = null;
    private plateLabel: Label | null = null;
    private plateRoot: Node | null = null;
    private moneyLabel: Label | null = null;
    private timeLabel: Label | null = null;
    private heatLabel: Label | null = null;
    private comboLabel: Label | null = null;
    private smokeLabel: Label | null = null;
    private plateSpriteFrame: SpriteFrame | null = null;
    private orderPickHandler: ((orderId: string, ingredient: IngredientType) => void) | null = null;
    private platePickHandler: ((index: number) => void) | null = null;
    private plateTableHandler: ((orderId: string) => void) | null = null;

    constructor(canvas: Node) {
        this.canvas = canvas;
        this.bbqRoot = find('BBQUI', canvas);
        this.queueList = find('BBQUI/QueuePanel/QueueList', canvas);
        this.queueTemplate = find('BBQUI/QueuePanel/QueueList/QueueItemTemplate', canvas);
        this.deliveryList = find('BBQUI/DeliveryPanel/DeliveryButtons', canvas);
        this.deliveryTemplate = find('BBQUI/DeliveryPanel/DeliveryButtons/DeliveryButtonTemplate', canvas);
        this.orderItemsList = find('BBQUI/OrderItemsPanel/ItemsList', canvas);
        this.packingItemsList = find('BBQUI/PackingInfoPanel/ItemsList', canvas);
        this.customerArea = find('BBQUI/CustomerArea', canvas);
        if (this.deliveryList) {
            this.deliveryButtons = this.deliveryList.children.filter((child) => child.name.startsWith('CallTable'));
        }
        this.queueTitle = find('BBQUI/QueuePanel/QueueTitle', canvas)?.getComponent(Label) ?? null;
        this.plateSpriteFrame = find('BBQUI/OrderItemsPanel', canvas)?.getComponent(Sprite)?.spriteFrame ?? null;

        this.fireButtons = {
            hot: find('BBQUI/ControlPanel/FireGroup/FireHotBtn', canvas),
            mid: find('BBQUI/ControlPanel/FireGroup/FireMidBtn', canvas),
            warm: find('BBQUI/ControlPanel/FireGroup/FireWarmBtn', canvas)
        };

        this.toolButtons = {
            sauce: find('BBQUI/ControlPanel/ActionGroup/SauceBtn', canvas),
            spice: find('BBQUI/ControlPanel/ActionGroup/SpiceBtn', canvas),
            fan: find('BBQUI/ControlPanel/ActionGroup/FanBtn', canvas)
        };

        this.serveButton = find('ServeButton', canvas);
        this.mouseFollower = find('MouseFollower', canvas);

        this.moneyLabel = find('MoneyLabel', canvas)?.getComponent(Label) ?? null;
        this.timeLabel = find('TimeLabel', canvas)?.getComponent(Label) ?? null;
        this.heatLabel = find('BBQUI/TopInfo/HeatLabel', canvas)?.getComponent(Label) ?? null;
        this.comboLabel = find('BBQUI/TopInfo/ComboLabel', canvas)?.getComponent(Label) ?? null;
        this.smokeLabel = find('BBQUI/TopInfo/SmokeLabel', canvas)?.getComponent(Label) ?? null;

        this.plateRoot = find('PackingBox1', canvas);
        const plateLabelNode = find('PackingBox1/Label', canvas);
        if (plateLabelNode) {
            this.plateLabel = plateLabelNode.getComponent(Label);
            plateLabelNode.active = true;
            plateLabelNode.parent.active = true;
        }

        this.floatingText = new BBQFloatingText(canvas);
    }

    public initSlots(slotCount: number): void {
        const grid = find('BBQUI/GrillRoot/GrillGrid/GridCells', this.canvas);
        if (!grid) return;
        const cells = [...grid.children].sort((a, b) => a.name.localeCompare(b.name));
        this.slotNodes.length = 0;
        this.slotViews.length = 0;
        for (const cell of cells.slice(0, slotCount)) {
            this.slotNodes.push(cell);
            this.slotViews.push(new BBQSlotView(cell));
        }
    }

    public setOrderPickHandler(handler: (orderId: string, ingredient: IngredientType) => void): void {
        this.orderPickHandler = handler;
    }

    public setPlatePickHandler(handler: (index: number) => void): void {
        this.platePickHandler = handler;
    }

    public setPlateTableHandler(handler: (orderId: string) => void): void {
        this.plateTableHandler = handler;
    }

    public bindButton(node: Node | null, handler: () => void): void {
        if (!node) return;
        const button = node.getComponent(Button);
        if (button) {
            node.off(Button.EventType.CLICK, handler, this);
            node.on(Button.EventType.CLICK, handler, this);
            return;
        }
        node.off(Node.EventType.TOUCH_END, handler, this);
        node.on(Node.EventType.TOUCH_END, handler, this);
    }

    public updateOrders(
        orders: BBQOrderState[],
        pageInfo?: { page: number; pages: number; total: number }
    ): void {
        if (!this.queueList || !this.queueTemplate) return;
        if (this.queueTitle) {
            if (pageInfo) {
                const page = Math.max(0, pageInfo.page);
                const pages = Math.max(1, pageInfo.pages);
                this.queueTitle.string = `订单 第${page + 1}/${pages}页（${pageInfo.total}桌）`;
            } else {
                this.queueTitle.string = `订单 ${orders.length}`;
            }
        }
        const template = this.queueTemplate;
        for (const child of [...this.queueList.children]) {
            if (child === template) continue;
            child.destroy();
        }
        template.active = false;
        for (const order of orders) {
            const item = instantiate(template);
            item.active = true;
            item.setParent(this.queueList);
            const transform = item.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(180, 72);
            }
            const labelNode = item.getChildByName('ItemLabel') ?? item;
            const label = labelNode.getComponent(Label) ?? item.getComponentInChildren(Label);
            BBQOrderItemView.update(label, order);
            if (labelNode !== item) {
                labelNode.setPosition(0, 22, 0);
            }
        }
    }

    public updateOrderItems(orders: BBQOrderState[]): void {
        if (!this.orderItemsList) return;
        this.orderItemsList.active = true;
        if (!this.plateSpriteFrame) {
            this.plateSpriteFrame = find('BBQUI/PackingInfoPanel', this.canvas)?.getComponent(Sprite)?.spriteFrame ?? null;
        }
        if (orders.length === 0) {
            if (this.orderItemsList.children.length > 0) {
                this.orderItemsList.children.forEach((child) => {
                    child.active = true;
                });
                return;
            }
        }
        this.orderItemsList.removeAllChildren();
        const rows = orders.slice(0, 5);
        const cols = 2;
        const tileWidth = 140;
        const tileHeight = 110;
        const spacingX = 170;
        const spacingY = 140;
        const startX = -(cols - 1) * spacingX * 0.5;
        const startY = 200;

        rows.forEach((order, index) => {
            const col = index % cols;
            const rowIndex = Math.floor(index / cols);
            const tile = new Node(`OrderPlate_${order.tableId}`);
            tile.addComponent(UITransform).setContentSize(tileWidth, tileHeight);
            const plateSprite = tile.addComponent(Sprite);
            plateSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            if (this.plateSpriteFrame) {
                plateSprite.spriteFrame = this.plateSpriteFrame;
            }
            plateSprite.color = new Color(230, 216, 188, 255);
            tile.setPosition(startX + col * spacingX, startY - rowIndex * spacingY, 0);
            this.orderItemsList!.addChild(tile);

            const title = new Node('TableLabel');
            title.addComponent(UITransform).setContentSize(80, 20);
            const titleLabel = title.addComponent(Label);
            titleLabel.string = `桌#${order.tableId}`;
            titleLabel.fontSize = 12;
            titleLabel.lineHeight = 14;
            titleLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
            titleLabel.verticalAlign = Label.VerticalAlign.CENTER;
            this.applyPlateLabelStyle(titleLabel);
            title.setPosition(-50, 40, 0);
            tile.addChild(title);

            const items = (order.pendingItems ?? []).filter((item) => item.count > 0);
            if (items.length === 0) {
                const done = new Node('DoneLabel');
                done.addComponent(UITransform).setContentSize(100, 20);
                const doneLabel = done.addComponent(Label);
                doneLabel.string = '待烤完成';
                doneLabel.fontSize = 12;
                doneLabel.lineHeight = 14;
                doneLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
                doneLabel.verticalAlign = Label.VerticalAlign.CENTER;
                this.applyPlateLabelStyle(doneLabel);
                done.setPosition(0, 0, 0);
                tile.addChild(done);
                return;
            }

            const itemSpacing = 46;
            const startItemX = -46;
            items.forEach((item, itemIndex) => {
                const node = new Node(`Item_${item.ingredient}_${itemIndex}`);
                node.addComponent(UITransform).setContentSize(44, 24);
                const label = node.addComponent(Label);
                label.string = `${IngredientConfig.getDisplayContent(item.ingredient)}x${item.count}`;
                label.fontSize = 13;
                label.lineHeight = 16;
                label.horizontalAlign = Label.HorizontalAlign.CENTER;
                label.verticalAlign = Label.VerticalAlign.CENTER;
                this.applyPlateLabelStyle(label);
                node.addComponent(Button);
                const rowOffset = Math.floor(itemIndex / 2);
                const colIndex = itemIndex % 2;
                node.setPosition(startItemX + colIndex * itemSpacing, 8 - rowOffset * 26, 0);
                tile.addChild(node);
                this.bindButton(node, () => {
                    this.orderPickHandler?.(order.id, item.ingredient);
                });
            });
        });
    }

    public updatePackingInfo(orders: BBQOrderState[], plate: BBQPlateItem[]): void {
        if (!this.packingItemsList) return;
        this.packingItemsList.active = true;
        if (!this.plateSpriteFrame) {
            this.plateSpriteFrame = find('BBQUI/OrderItemsPanel', this.canvas)?.getComponent(Sprite)?.spriteFrame ?? null;
        }
        if (orders.length === 0) {
            if (this.packingItemsList.children.length > 0) {
                this.packingItemsList.children.forEach((child) => {
                    child.active = true;
                });
                return;
            }
        }
        this.packingItemsList.removeAllChildren();
        const rows = orders.slice(0, 5);
        const cols = 2;
        const tileWidth = 140;
        const tileHeight = 110;
        const spacingX = 170;
        const spacingY = 140;
        const startX = -(cols - 1) * spacingX * 0.5;
        const startY = 200;

        rows.forEach((order, index) => {
            const col = index % cols;
            const rowIndex = Math.floor(index / cols);
            const tile = new Node(`PackingPlate_${order.tableId}`);
            tile.addComponent(UITransform).setContentSize(tileWidth, tileHeight);
            const tileSprite = tile.addComponent(Sprite);
            tileSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            if (this.plateSpriteFrame) {
                tileSprite.spriteFrame = this.plateSpriteFrame;
            }
            tileSprite.color = new Color(218, 210, 190, 255);
            tile.setPosition(startX + col * spacingX, startY - rowIndex * spacingY, 0);
            tile.addComponent(Button);
            this.packingItemsList!.addChild(tile);
            this.bindButton(tile, () => {
                this.plateTableHandler?.(order.id);
            });

            const tableNode = new Node('TableLabel');
            tableNode.addComponent(UITransform).setContentSize(80, 20);
            const tableLabel = tableNode.addComponent(Label);
            tableLabel.string = `桌#${order.tableId}`;
            tableLabel.fontSize = 12;
            tableLabel.lineHeight = 14;
            tableLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
            tableLabel.verticalAlign = Label.VerticalAlign.CENTER;
            this.applyPlateLabelStyle(tableLabel);
            tableNode.setPosition(-50, 40, 0);
            tile.addChild(tableNode);

            const plateArea = new Node('PlateArea');
            plateArea.addComponent(UITransform).setContentSize(120, 50);
            const plateSprite = plateArea.addComponent(Sprite);
            plateSprite.sizeMode = Sprite.SizeMode.CUSTOM;
            if (this.plateSpriteFrame) {
                plateSprite.spriteFrame = this.plateSpriteFrame;
            }
            plateSprite.color = new Color(196, 186, 165, 255);
            plateArea.setPosition(0, 8, 0);
            tile.addChild(plateArea);

            const platedItems = plate.filter((item) => item.orderId === order.id);
            if (platedItems.length > 0) {
                const itemSpacing = 20;
                const startIconX = -(platedItems.length - 1) * itemSpacing * 0.5;
                platedItems.forEach((item, itemIndex) => {
                    const iconNode = new Node(`PlateItem_${itemIndex}`);
                    iconNode.addComponent(UITransform).setContentSize(18, 18);
                    const iconLabel = iconNode.addComponent(Label);
                    iconLabel.string = IngredientConfig.getDisplayContent(item.ingredient);
                    iconLabel.fontSize = 13;
                    iconLabel.lineHeight = 15;
                    iconLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
                    iconLabel.verticalAlign = Label.VerticalAlign.CENTER;
                    this.applyPlateLabelStyle(iconLabel);
                    iconNode.setPosition(startIconX + itemIndex * itemSpacing, 0, 0);
                    plateArea.addChild(iconNode);
                });
            }

            const pendingNode = new Node('PendingLabel');
            pendingNode.addComponent(UITransform).setContentSize(120, 20);
            const pendingLabel = pendingNode.addComponent(Label);
            const parts = order.requirements
                .filter((item) => this.isGrillable(item.ingredient))
                .map((item) => {
                    const placed = platedItems.filter((plateItem) => plateItem.ingredient === item.ingredient).length;
                    const remain = Math.max(0, item.count - placed);
                    return remain > 0 ? `${this.getIngredientName(item.ingredient)}x${remain}` : '';
                })
                .filter((text) => text.length > 0);
            pendingLabel.string = parts.length > 0 ? parts.join(' ') : '无';
            pendingLabel.fontSize = 11;
            pendingLabel.lineHeight = 13;
            pendingLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            pendingLabel.verticalAlign = Label.VerticalAlign.CENTER;
            this.applyPlateLabelStyle(pendingLabel);
            pendingNode.setPosition(0, -36, 0);
            tile.addChild(pendingNode);
        });
    }

    public updateCustomers(orders: BBQOrderState[]): void {
        if (!this.customerArea) return;
        const orderMap = new Map<number, BBQOrderState>();
        orders.forEach((order) => orderMap.set(order.tableId, order));
        this.customerArea.active = true;
        for (let tableId = 1; tableId <= BBQ_CONFIG.maxActiveOrders; tableId += 1) {
            const tableNode = this.customerArea.getChildByName(`TableSlot_${tableId}`);
            if (!tableNode) continue;
            const order = orderMap.get(tableId);
            tableNode.active = !!order;
            if (!order) continue;
            const tableLabelNode = tableNode.getChildByName('TableLabel');
            const customerLabelNode = tableNode.getChildByName('CustomerLabel');
            const tableLabel = tableLabelNode?.getComponent(Label) ?? null;
            const customerLabel = customerLabelNode?.getComponent(Label) ?? null;
            if (tableLabel) {
                tableLabel.string = `桌#${tableId}`;
                this.applyPlateLabelStyle(tableLabel);
            }
            if (customerLabel) {
                customerLabel.string = `顾客x${order.customerCount ?? 2}`;
                this.applyPlateLabelStyle(customerLabel);
            }
        }
    }

    public updateDelivery(labels: string[], onClick: (index: number) => void): void {
        if (!this.deliveryList) return;
        const callButtons = this.deliveryList.children.filter((child) => child.name.startsWith('CallTable'));
        if (callButtons.length > 0) {
            this.deliveryButtons = callButtons;
            callButtons.forEach((node, index) => {
                const labelNode = node.getChildByName('Label') ?? node;
                const label = labelNode.getComponent(Label) ?? node.getComponentInChildren(Label);
                if (label) {
                    label.string = labels[index] ?? `叫号 桌${index + 1}`;
                }
                node.active = true;
                this.bindButton(node, () => onClick(index));
            });
            return;
        }

        if (!this.deliveryTemplate) return;
        const template = this.deliveryTemplate;
        for (const child of [...this.deliveryList.children]) {
            if (child === template) continue;
            child.destroy();
        }
        template.active = false;
        labels.forEach((text, index) => {
            const item = instantiate(template);
            item.active = true;
            item.setParent(this.deliveryList!);
            const labelNode = item.getChildByName('Label') ?? item;
            const label = labelNode.getComponent(Label) ?? item.getComponentInChildren(Label);
            if (label) {
                label.string = text;
            }
            this.bindButton(item, () => onClick(index));
        });
    }

    public updateSlots(state: BBQState, selectedIndex: number | null = null): void {
        state.slots.forEach((slot, index) => {
            const view = this.slotViews[index];
            if (!view) return;
            view.update(slot, selectedIndex === index);
        });
    }

    public updateTopInfo(state: BBQState): void {
        if (this.heatLabel) this.heatLabel.string = `火力 ${this.getHeatText(state.heatLevel)}`;
        if (this.comboLabel) this.comboLabel.string = `连击 ${state.combo}`;
        if (this.smokeLabel) this.smokeLabel.string = `烟雾 ${state.smoke}`;
    }

    public updateMoney(value: number): void {
        if (this.moneyLabel) {
            this.moneyLabel.string = `💰 今日: ${value}`;
        }
    }

    public updateTime(timeLeft: number): void {
        if (!this.timeLabel) return;
        const seconds = Math.max(0, Math.ceil(timeLeft));
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        this.timeLabel.string = `⏱ ${min}:${sec.toString().padStart(2, '0')}`;
    }

    public updatePlate(plate: BBQPlateItem[]): void {
        if (!this.plateLabel) return;
        if (plate.length === 0) {
            this.plateLabel.string = '盘子: 空';
            this.buildPlateItems([]);
            return;
        }
        const text = plate.map((item) => IngredientConfig.getDisplayContent(item.ingredient)).join(' ');
        this.plateLabel.string = `盘子: ${text}`;
        this.buildPlateItems(plate);
    }

    public updateHandDisplay(
        ingredient: IngredientType | null,
        tool: BBQTool | null,
        count: number = 0,
        overrideIcon: string | null = null
    ): void {
        if (!this.mouseFollower) return;
        const label = this.mouseFollower.getComponent(Label);
        if (!label) return;
        if (!ingredient && !tool) {
            this.mouseFollower.active = false;
            return;
        }
        const icon = overrideIcon ?? (ingredient ? IngredientConfig.getDisplayContent(ingredient) : this.getToolIcon(tool));
        label.string = count > 1 ? `${icon}x${count}` : icon;
        this.mouseFollower.active = true;
        this.mouseFollower.setSiblingIndex(9999);
    }

    public setButtonSelected(node: Node | null, selected: boolean): void {
        if (!node) return;
        node.setScale(selected ? 1.1 : 1, selected ? 1.1 : 1, 1);
    }

    public showMessage(text: string, color: Color = new Color(255, 255, 255, 255)): void {
        this.floatingText.show(text, color);
    }

    private getHeatText(level: string): string {
        if (level === 'hot') return '高温';
        if (level === 'warm') return '保温';
        return '中温';
    }

    private getToolIcon(tool: BBQTool | null): string {
        switch (tool) {
            case 'sauce':
                return '🥫';
            case 'spice':
                return '🧂';
            case 'fan':
                return '🌀';
            default:
                return '✋';
        }
    }

    private getIngredientName(type: IngredientType): string {
        switch (type) {
            case IngredientType.MEAT_SKEWER:
                return '肉串';
            case IngredientType.VEG_SKEWER:
                return '素串';
            case IngredientType.SAUSAGE:
                return '香肠';
            case IngredientType.BBQ_SAUCE:
                return '烧烤酱';
            case IngredientType.CUMIN:
                return '孜然';
            case IngredientType.CHILI_POWDER:
                return '辣椒粉';
            default:
                return `${type}`;
        }
    }

    private isGrillable(type: IngredientType): boolean {
        return type === IngredientType.MEAT_SKEWER
            || type === IngredientType.VEG_SKEWER
            || type === IngredientType.SAUSAGE;
    }

    private applyPlateLabelStyle(label: Label): void {
        label.color = new Color(255, 255, 255, 255);
        label.enableOutline = true;
        label.outlineColor = new Color(0, 0, 0, 255);
        label.outlineWidth = 2;
    }

    // order item buttons moved to OrderItemsPanel

    private buildPlateItems(plate: BBQPlateItem[]): void {
        if (!this.plateRoot) return;
        let container = this.plateRoot.getChildByName('PlateItems');
        if (!container) {
            container = new Node('PlateItems');
            container.setPosition(0, -24, 0);
            this.plateRoot.addChild(container);
        }
        container.removeAllChildren();

        if (plate.length === 0) {
            return;
        }

        const spacing = 40;
        const startX = -(plate.length - 1) * spacing * 0.5;
        plate.forEach((item, index) => {
            const node = new Node(`PlateItem_${index}`);
            node.addComponent(UITransform).setContentSize(32, 24);
            const label = node.addComponent(Label);
            label.string = IngredientConfig.getDisplayContent(item.ingredient);
            label.fontSize = 18;
            label.lineHeight = 20;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            this.applyPlateLabelStyle(label);
            node.addComponent(Button);
            node.setPosition(startX + index * spacing, 0, 0);
            container!.addChild(node);
            this.bindButton(node, () => {
                this.platePickHandler?.(index);
            });
        });
    }
}
