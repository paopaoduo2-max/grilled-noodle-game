import { _decorator, Component, Node, Label, Color, Graphics, UITransform, Vec2, Vec3, view, UIOpacity, Sprite, SpriteFrame, resources, BlockInputEvents, Button, EventTouch, EventMouse, Input, input, tween, Canvas, Camera, director, Tween } from 'cc';
import { InventoryManager } from '../../../Manager/InventoryManager';
import { SpecialEventVoucherManager } from '../../SpecialEvents/SpecialEventVoucherManager';

const { ccclass, property } = _decorator;
const OPEN_FEE = 20;
const CUT_FEE = 50;

interface StoneData {
    grade: string;
    size: string;
    skin: string;
    cracks: string;
    texture: string;
    luster: string;
    stoneCost: number;
    openCost: number;
    cutCost: number;
    quality: number;
    baseColor: Color;
    glowColor: Color;
    purchased: boolean;
}

@ccclass('StoneShopController')
export class StoneShopController extends Component {
    @property(SpriteFrame)
    backgroundSprite: SpriteFrame | null = null;

    private built: boolean = false;
    private walletLabel: Label | null = null;
    private rulesButton: Node | null = null;
    private backButton: Node | null = null;
    private rulesPanel: Node | null = null;
    private stoneCards: { node: Node; gfx: Graphics; title: Label; tag: Label }[] = [];
    private stoneDataList: StoneData[] = [];
    private selectedStoneIndex: number = -1;
    private currentStone: StoneData | null = null;
    private stoneDisplay: Node | null = null;
    private stoneDisplayGfx: Graphics | null = null;
    private stoneShadow: Node | null = null;
    private stoneWindow: Node | null = null;
    private stoneWindowGfx: Graphics | null = null;
    private stoneGlow: Node | null = null;
    private stoneGlowGfx: Graphics | null = null;
    private windowSpark: Node | null = null;
    private windowSparkGfx: Graphics | null = null;
    private stoneHit: Node | null = null;
    private cutLine: Node | null = null;
    private cutLineGfx: Graphics | null = null;
    private cutFlash: Node | null = null;
    private cutFlashGfx: Graphics | null = null;
    private cutSeam: Node | null = null;
    private cutSeamGfx: Graphics | null = null;
    private cutSeamPulseActive: boolean = false;
    private lastCutSuccess: boolean | null = null;
    private cutStart: Vec3 | null = null;
    private openBtn: Node | null = null;
    private cutBtn: Node | null = null;
    private abandonBtn: Node | null = null;
    private adviceBtn: Node | null = null;
    private detailLabels: Label[] = [];
    private openCostLabel: Label | null = null;
    private cutCostLabel: Label | null = null;
    private stoneCostLabel: Label | null = null;
    private buyBtn: Node | null = null;
    private previewLabel: Label | null = null;
    private finalLabel: Label | null = null;
    private statusLabel: Label | null = null;
    private advisorLabel: Label | null = null;
    private gemPreview: Node | null = null;
    private mode: 'idle' | 'open' | 'cut' = 'idle';
    private hasWindow: boolean = false;
    private hasCut: boolean = false;
    private windowPos: Vec3 | null = null;
    private cutEnd: Vec3 | null = null;
    private stoneSplitLeft: Node | null = null;
    private stoneSplitRight: Node | null = null;
    private mouseMoveBound: boolean = false;
    private tooltipPanel: Node | null = null;
    private tooltipLabel: Label | null = null;
    private tooltipPendingText: string | null = null;
    private tooltipHovering: boolean = false;
    private windowPulseActive: boolean = false;
    private stoneFloatActive: boolean = false;
    private stoneFloatBasePos: Vec3 | null = null;
    private adviceBonusActive: boolean = false;
    private adviceBonusValue: number = 0;
    private sessionDiscount: { tier: string; rate: number; used: boolean; stoneIndex: number } | null = null;

    onLoad() {
        this.ensureRoot();
        this.buildStaticLayout();
        this.refreshWallet();
    }

    onEnable() {
        this.refreshWallet();
        this.bindMouseEvents();
        this.node.setSiblingIndex(9999);
        this.initSessionDiscount();
    }

    onDisable() {
        this.unbindMouseEvents();
        this.stopStoneFloat();
        this.sessionDiscount = null;
    }

    private ensureRoot() {
        const viewSize = this.getCanvasSize();
        const transform = this.ensureUITransform(this.node, viewSize.width, viewSize.height);
        transform.setAnchorPoint(0.5, 0.5);
        this.node.setPosition(0, 0, 0);
        if (!this.node.getComponent(UIOpacity)) {
            this.node.addComponent(UIOpacity);
        }
        if (!this.node.getComponent(BlockInputEvents)) {
            this.node.addComponent(BlockInputEvents);
        }
    }

    private buildStaticLayout() {
        if (this.built) return;
        this.built = true;

        const viewSize = this.getCanvasSize();
        const root = this.node;

        // Background
        const bgNode = new Node('Background');
        bgNode.parent = root;
        this.ensureUITransform(bgNode, viewSize.width, viewSize.height);
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.type = Sprite.Type.SIMPLE;
        bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        if (this.backgroundSprite) {
            bgSprite.spriteFrame = this.backgroundSprite;
        } else {
            resources.load('Gacha/dushi', SpriteFrame, (err, spriteFrame) => {
                if (!err && spriteFrame && bgNode.isValid) {
                    bgSprite.spriteFrame = spriteFrame;
                }
            });
        }

        const backdrop = this.createRect('Backdrop', viewSize.width, viewSize.height, new Color(10, 10, 10, 80));
        backdrop.parent = root;

        // Top bar
        const topBarY = viewSize.height / 2 - 50;
        const chipSize = { w: 180, h: 44 };
        const heatSize = { w: 140, h: 44 };
        const titleSize = { w: 300, h: 52 };
        const leftChip = this.createRoundedRect('WalletChip', chipSize.w, chipSize.h, 10, new Color(28, 24, 20, 255));
        leftChip.parent = root;
        leftChip.setPosition(-viewSize.width / 2 + 140, topBarY, 0);
        this.walletLabel = this.createLabel('WalletLabel', '钱包 320', 16, new Color(255, 240, 210, 255));
        this.walletLabel.node.parent = leftChip;
        this.walletLabel.node.setPosition(0, 0, 0);

        const titleBlock = this.createRoundedRect('TitleBlock', titleSize.w, titleSize.h, 12, new Color(42, 60, 48, 255));
        titleBlock.parent = root;
        titleBlock.setPosition(0, topBarY, 0);
        const titleLabel = this.createLabel('TitleLabel', '赌石店', 28, new Color(255, 215, 160, 255));
        titleLabel.node.parent = titleBlock;
        titleLabel.node.setPosition(0, 4, 0);
        const subLabel = this.createLabel('SubLabel', '第3关 · 开窗 / 全切', 14, new Color(250, 235, 210, 255));
        subLabel.node.parent = titleBlock;
        subLabel.node.setPosition(0, -18, 0);

        const heatChip = this.createRoundedRect('HeatChip', heatSize.w, heatSize.h, 10, new Color(28, 24, 20, 255));
        heatChip.parent = root;
        heatChip.setPosition(viewSize.width / 2 - 120, topBarY, 0);
        const heatLabel = this.createLabel('HeatLabel', '热度 高', 14, new Color(255, 230, 180, 255));
        heatLabel.node.parent = heatChip;
        heatLabel.node.setPosition(0, 0, 0);

        // Stage panel
        const stageWidth = Math.min(1080, viewSize.width - 120);
        const stageHeight = Math.min(640, viewSize.height - 170);
        const stageNode = this.createRoundedRect('Stage', stageWidth, stageHeight, 18, new Color(36, 52, 42, 210), new Color(18, 18, 18, 255), 4);
        stageNode.parent = root;
        stageNode.setPosition(0, -40, 0);

        const stageTop = stageHeight / 2;
        const stageBottom = -stageHeight / 2;
        const headHeight = 58;
        const hintHeight = 30;
        const headNode = this.createRoundedRect('StageHead', stageWidth - 40, headHeight, 12, new Color(52, 70, 58, 255), new Color(18, 18, 18, 255), 3);
        headNode.parent = stageNode;
        headNode.setPosition(0, stageTop - headHeight / 2 - 12, 0);

        const shopSign = this.createLabel('ShopSign', '缅甸玉石铺', 20, new Color(255, 235, 200, 255));
        shopSign.node.parent = headNode;
        shopSign.node.setPosition(-stageWidth / 2 + 170, 0, 0);

        const rulesBtn = this.createButton('RulesButton', '规则', 70, 28);
        rulesBtn.parent = headNode;
        rulesBtn.setPosition(stageWidth / 2 - 140, 0, 0);
        this.rulesButton = rulesBtn;
        const backBtn = this.createButton('BackButton', '返回摊位', 96, 28);
        backBtn.parent = headNode;
        backBtn.setPosition(stageWidth / 2 - 50, 0, 0);
        this.backButton = backBtn;

        const hintNode = this.createRoundedRect('MarketHint', stageWidth - 40, hintHeight, 10, new Color(48, 64, 52, 255));
        hintNode.parent = stageNode;
        hintNode.setPosition(0, stageTop - headHeight - hintHeight / 2 - 22, 0);
        const rumorChip = this.createChip('RumorChip', '传闻 绿皮↑', new Vec3(-stageWidth / 2 + 160, 0, 0));
        rumorChip.parent = hintNode;
        const overturnChip = this.createChip('OverturnChip', '逆转 1%', new Vec3(40, 0, 0));
        overturnChip.parent = hintNode;

        // Arena
        const arenaTop = stageTop - headHeight - hintHeight - 36;
        const arenaBottom = stageBottom + 24;
        const arenaHeight = arenaTop - arenaBottom;
        const gap = 16;
        const leftWidth = Math.round(stageWidth * 0.68);
        const rightWidth = stageWidth - leftWidth - gap - 40;

        const leftX = -stageWidth / 2 + leftWidth / 2 + 20;
        const rightX = stageWidth / 2 - rightWidth / 2 - 20;

        const shelfHeight = 150;
        const cuttingHeight = arenaHeight - shelfHeight - 16;
        const shelfY = arenaTop - shelfHeight / 2;
        const cuttingY = arenaBottom + cuttingHeight / 2;

        const shelfNode = this.createNode('StoneShelf', leftWidth, shelfHeight);
        shelfNode.parent = stageNode;
        shelfNode.setPosition(leftX, shelfY, 0);
        this.createStoneCards(shelfNode, leftWidth, shelfHeight);

        const cuttingNode = this.createNode('CuttingZone', leftWidth, cuttingHeight);
        cuttingNode.parent = stageNode;
        cuttingNode.setPosition(leftX, cuttingY, 0);
        this.createCuttingZone(cuttingNode, leftWidth, cuttingHeight);

        const controlNode = this.createRoundedRect('ControlPanel', rightWidth, arenaHeight, 14, new Color(245, 236, 220, 255), new Color(18, 18, 18, 255), 3);
        controlNode.parent = stageNode;
        controlNode.setPosition(rightX, (arenaTop + arenaBottom) / 2, 0);
        this.createControlPanel(controlNode, rightWidth, arenaHeight);

        this.bindButtons();
        this.initStoneData();
        this.setupPreviewTooltip();
    }

    private createStoneCards(parent: Node, width: number, height: number) {
        const cardGap = 10;
        const cardWidth = (width - cardGap * 3) / 4;
        const cardHeight = height - 10;
        for (let i = 0; i < 4; i++) {
            const card = this.createRoundedRect(`StoneCard${i + 1}`, cardWidth, cardHeight, 10, new Color(242, 226, 200, 255), new Color(20, 16, 12, 255), 3);
            card.parent = parent;
            const x = -width / 2 + cardWidth / 2 + i * (cardWidth + cardGap);
            card.setPosition(x, 0, 0);
            const title = this.createLabel('CardTitle', `原石${i + 1}`, 13, new Color(35, 25, 20, 255));
            title.node.parent = card;
            title.node.setPosition(0, cardHeight / 2 - 16, 0);
            const tag = this.createLabel('CardTag', '皮色 · 纹理', 11, new Color(70, 50, 30, 255));
            tag.node.parent = card;
            tag.node.setPosition(0, -cardHeight / 2 + 18, 0);

            const gfx = card.getComponent(Graphics);
            if (gfx) {
                this.stoneCards.push({ node: card, gfx, title, tag });
            }
            card.on(Node.EventType.TOUCH_END, () => this.selectStone(i), this);
        }
    }

    private createCuttingZone(parent: Node, width: number, height: number) {
        const gap = 12;
        const stageWidth = Math.round(width * 0.6);
        const panelWidth = width - stageWidth - gap;
        const stageNode = this.createRoundedRect('StoneStage', stageWidth, height, 12, new Color(27, 40, 32, 255), new Color(18, 18, 18, 255), 3);
        stageNode.parent = parent;
        stageNode.setPosition(-(panelWidth / 2 + gap / 2), 0, 0);

        const display = this.createNode('StoneDisplay', stageWidth - 80, height - 80);
        const displayGfx = display.addComponent(Graphics);
        display.parent = stageNode;
        display.setPosition(0, 0, 0);
        this.stoneDisplay = display;
        this.stoneDisplayGfx = displayGfx;

        const displayTransform = display.getComponent(UITransform);
        const shadow = this.createNode('StoneShadow', 220, 80);
        const shadowGfx = shadow.addComponent(Graphics);
        shadowGfx.fillColor = new Color(0, 0, 0, 90);
        shadowGfx.ellipse(0, 0, 160, 36);
        shadowGfx.fill();
        shadow.parent = stageNode;
        const shadowOffset = -(displayTransform?.contentSize.height ?? 200) * 0.25;
        shadow.setPosition(0, shadowOffset, 0);
        this.stoneShadow = shadow;

        const glow = this.createNode('StoneGlow', 140, 140);
        const glowGfx = glow.addComponent(Graphics);
        glow.parent = display;
        glow.setPosition(0, 0, 0);
        glow.active = false;
        this.stoneGlow = glow;
        this.stoneGlowGfx = glowGfx;

        const spark = this.createNode('WindowSpark', 120, 120);
        const sparkGfx = spark.addComponent(Graphics);
        spark.parent = display;
        spark.setPosition(0, 0, 0);
        spark.active = false;
        this.windowSpark = spark;
        this.windowSparkGfx = sparkGfx;

        const window = this.createNode('StoneWindow', 90, 60);
        const windowGfx = window.addComponent(Graphics);
        window.parent = display;
        window.setPosition(0, 0, 0);
        window.active = false;
        this.stoneWindow = window;
        this.stoneWindowGfx = windowGfx;

        const hit = this.createNode('StoneHit', stageWidth, height);
        hit.parent = stageNode;
        hit.setPosition(0, 0, 0);
        this.stoneHit = hit;

        const cutLine = this.createNode('CutLine', displayTransform?.contentSize.width ?? stageWidth, displayTransform?.contentSize.height ?? height);
        const cutGfx = cutLine.addComponent(Graphics);
        cutLine.parent = display;
        cutLine.setPosition(0, 0, 0);
        cutLine.active = false;
        this.cutLine = cutLine;
        this.cutLineGfx = cutGfx;

        const cutFlash = this.createNode('CutFlash', 160, 80);
        const cutFlashGfx = cutFlash.addComponent(Graphics);
        cutFlash.parent = stageNode;
        cutFlash.setPosition(0, 0, 0);
        cutFlash.active = false;
        this.cutFlash = cutFlash;
        this.cutFlashGfx = cutFlashGfx;

        const seamWidth = displayTransform?.contentSize.width ?? stageWidth;
        const seamHeight = displayTransform?.contentSize.height ?? height;
        const cutSeam = this.createNode('CutSeam', seamWidth, seamHeight);
        const seamGfx = cutSeam.addComponent(Graphics);
        cutSeam.parent = stageNode;
        cutSeam.setPosition(display.getPosition());
        cutSeam.active = false;
        this.cutSeam = cutSeam;
        this.cutSeamGfx = seamGfx;

        const stamp = this.createLabel('ResultStamp', '爆绿', 18, new Color(255, 210, 120, 255));
        stamp.node.parent = stageNode;
        stamp.node.setPosition(stageWidth / 2 - 50, height / 2 - 24, 0);

        const resultPanel = this.createRoundedRect('ResultPanel', panelWidth, height, 12, new Color(250, 240, 225, 255), new Color(18, 18, 18, 255), 3);
        resultPanel.parent = parent;
        resultPanel.setPosition(stageWidth / 2 + gap / 2, 0, 0);

        const buyBtn = this.createButton('BuyBtn', '购买原石', 110, 30, new Color(245, 215, 120, 255));
        buyBtn.parent = resultPanel;
        buyBtn.setPosition(0, height / 2 - 26, 0);
        this.buyBtn = buyBtn;

        const previewLabel = this.createLabel('PreviewLabel', '开窗', 12, new Color(80, 70, 60, 255));
        previewLabel.node.parent = resultPanel;
        previewLabel.node.setPosition(-panelWidth / 2 + 40, height / 2 - 70, 0);
        const previewValue = this.createLabel('PreviewText', '未开窗', 16, new Color(30, 25, 20, 255));
        previewValue.node.parent = resultPanel;
        previewValue.node.setPosition(0, height / 2 - 92, 0);
        this.previewLabel = previewValue;

        const finalLabel = this.createLabel('FinalLabel', '全切', 12, new Color(80, 70, 60, 255));
        finalLabel.node.parent = resultPanel;
        finalLabel.node.setPosition(-panelWidth / 2 + 40, height / 2 - 120, 0);
        const finalValue = this.createLabel('FinalText', '等待决策', 16, new Color(30, 25, 20, 255));
        finalValue.node.parent = resultPanel;
        finalValue.node.setPosition(0, height / 2 - 142, 0);
        this.finalLabel = finalValue;

        const status = this.createLabel('StatusText', '先选原石', 13, new Color(120, 110, 100, 255));
        status.node.parent = resultPanel;
        status.node.setPosition(0, -height / 2 + 30, 0);
        this.statusLabel = status;

        const gem = this.createNode('GemPreview', 160, 120);
        gem.parent = this.node;
        gem.setPosition(-300, -164, 0);
        gem.active = false;
        this.gemPreview = gem;
    }

    private createControlPanel(parent: Node, width: number, height: number) {
        const rowWidth = width - 40;
        const rowX = -width / 2 + rowWidth / 2 + 20;
        const rowHeight = 28;

        const title = this.createLabel('PanelTitle', '当前原石', 23, new Color(40, 30, 20, 255));
        title.node.parent = parent;
        title.node.setPosition(0, height / 2 - 24, 0);
        title.enableOutline = true;
        title.outlineColor = new Color(255, 245, 220, 120);
        title.outlineWidth = 2;

        const divider = this.createRect('PanelDivider', rowWidth, 2, new Color(190, 160, 120, 120));
        divider.parent = parent;
        divider.setPosition(rowX, height / 2 - 44, 0);

        const detailStartY = height / 2 - 72;
        const detailGap = 32;
        const labels = ['档次', '皮色', '裂纹', '光泽'];
        this.detailLabels = [];
        labels.forEach((text, index) => {
            const rowPos = new Vec3(rowX, detailStartY - index * detailGap, 0);
        const label = this.createInfoRow(parent, `DetailRow${index}`, text, rowWidth, rowHeight, rowPos, undefined, 16);
            this.detailLabels.push(label);
        });

        const costY = detailStartY - labels.length * detailGap - 10;
        const stoneCost = this.createInfoRow(parent, 'StoneCostRow', '原石价', rowWidth, rowHeight, new Vec3(rowX, costY, 0), new Color(255, 241, 228, 255), 14);
        this.stoneCostLabel = stoneCost;
        const openCost = this.createInfoRow(parent, 'OpenCostRow', '开窗费', rowWidth, rowHeight, new Vec3(rowX, costY - 28, 0), new Color(255, 241, 228, 255), 14);
        this.openCostLabel = openCost;
        const cutCost = this.createInfoRow(parent, 'CutCostRow', '全切费', rowWidth, rowHeight, new Vec3(rowX, costY - 56, 0), new Color(255, 241, 228, 255), 14);
        this.cutCostLabel = cutCost;

        const actionY = costY - 96;
        const btnWidth = 90;
        const btnHeight = 30;
        const btnGapX = 16;
        const btnGapY = 12;
        const totalBtnWidth = btnWidth * 2 + btnGapX;
        const leftX = -totalBtnWidth / 2 + btnWidth / 2;
        const rightX = leftX + btnWidth + btnGapX;
        const topY = actionY;
        const bottomY = actionY - btnHeight - btnGapY;

        const openBtn = this.createButton('OpenBtn', '开窗', btnWidth, btnHeight);
        openBtn.parent = parent;
        openBtn.setPosition(leftX, topY, 0);
        this.openBtn = openBtn;
        const cutBtn = this.createButton('CutBtn', '全切', btnWidth, btnHeight, new Color(245, 185, 168, 255));
        cutBtn.parent = parent;
        cutBtn.setPosition(rightX, topY, 0);
        this.cutBtn = cutBtn;
        const abandonBtn = this.createButton('AbandonBtn', '放弃', btnWidth, btnHeight, new Color(235, 225, 210, 255));
        abandonBtn.parent = parent;
        abandonBtn.setPosition(leftX, bottomY, 0);
        this.abandonBtn = abandonBtn;
        const adviceBtn = this.createButton('AdviceBtn', '建议10', btnWidth, btnHeight, new Color(250, 240, 225, 255));
        adviceBtn.parent = parent;
        adviceBtn.setPosition(rightX, bottomY, 0);
        this.adviceBtn = adviceBtn;

        const advisor = this.createLabel('AdvisorText', '师傅：稳一点。', 13, new Color(60, 50, 40, 255));
        advisor.node.parent = parent;
        const advisorTransform = advisor.node.getComponent(UITransform);
        if (advisorTransform) {
            advisorTransform.setContentSize(width - 40, 90);
        }
        advisor.horizontalAlign = Label.HorizontalAlign.LEFT;
        advisor.verticalAlign = Label.VerticalAlign.TOP;
        advisor.lineHeight = 20;
        advisor.enableWrapText = true;
        advisor.overflow = Label.Overflow.RESIZE_HEIGHT;
        advisor.node.setPosition(0, -height / 2 + 60, 0);
        this.advisorLabel = advisor;
    }

    private bindButtons() {
        if (this.backButton) {
            this.backButton.on(Node.EventType.TOUCH_END, this.closeShop, this);
        }
        if (this.rulesButton) {
            this.rulesButton.on(Node.EventType.TOUCH_END, this.toggleRules, this);
        }
        if (this.openBtn) {
            this.openBtn.on(Node.EventType.TOUCH_END, this.onOpenClick, this);
        }
        if (this.cutBtn) {
            this.cutBtn.on(Node.EventType.TOUCH_END, this.onCutClick, this);
        }
        if (this.abandonBtn) {
            this.abandonBtn.on(Node.EventType.TOUCH_END, this.onAbandonClick, this);
        }
        if (this.adviceBtn) {
            this.adviceBtn.on(Node.EventType.TOUCH_END, this.onAdviceClick, this);
        }
        if (this.buyBtn) {
            this.buyBtn.on(Node.EventType.TOUCH_END, this.onBuyClick, this);
        }
        if (this.stoneHit) {
            this.stoneHit.on(Node.EventType.TOUCH_START, this.onStoneTouchStart, this);
            this.stoneHit.on(Node.EventType.TOUCH_MOVE, this.onStoneTouchMove, this);
            this.stoneHit.on(Node.EventType.TOUCH_END, this.onStoneTouchEnd, this);
            this.stoneHit.on(Node.EventType.TOUCH_CANCEL, this.onStoneTouchEnd, this);
            this.stoneHit.on(Node.EventType.MOUSE_MOVE, this.onStoneMouseMove, this);
            this.stoneHit.on(Node.EventType.MOUSE_LEAVE, this.onStoneMouseLeave, this);
        }
    }

    private bindMouseEvents() {
        if (this.mouseMoveBound) return;
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        this.mouseMoveBound = true;
    }

    private unbindMouseEvents() {
        if (!this.mouseMoveBound) return;
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        this.mouseMoveBound = false;
    }

    private closeShop() {
        this.node.active = false;
    }

    private toggleRules() {
        const panel = this.ensureRulesPanel();
        panel.active = !panel.active;
        if (panel.active) {
            panel.setSiblingIndex(9999);
        }
    }

    private ensureRulesPanel() {
        if (this.rulesPanel && this.rulesPanel.isValid) {
            return this.rulesPanel;
        }
        const panelWidth = 520;
        const panelHeight = 300;
        const panel = this.createRoundedRect('RulesPanel', panelWidth, panelHeight, 14, new Color(36, 52, 42, 255), new Color(18, 18, 18, 255), 3);
        panel.parent = this.node;
        panel.setPosition(0, 10, 0);

        const title = this.createLabel('RulesTitle', '赌石规则', 18, new Color(255, 235, 200, 255));
        title.node.parent = panel;
        title.node.setPosition(0, panelHeight / 2 - 26, 0);

        const bodyNode = new Node('RulesBody');
        const bodyTransform = this.ensureUITransform(bodyNode, panelWidth - 60, panelHeight - 90);
        bodyNode.parent = panel;
        bodyNode.setPosition(0, -10, 0);
        const bodyLabel = bodyNode.addComponent(Label);
        bodyLabel.string = '规则说明：\\n1. 选石购买后可直接全切，或先开窗再决定。\\n2. 开窗/全切为手工费，固定扣除。\\n3. 切线方向会影响结果，裂纹多时避开裂带。\\n4. 放弃仅限开窗后，放弃会刷新新石。';
        bodyLabel.fontSize = 14;
        bodyLabel.color = new Color(220, 210, 190, 255);
        bodyLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        bodyLabel.verticalAlign = Label.VerticalAlign.TOP;
        bodyLabel.lineHeight = 22;
        bodyLabel.enableWrapText = true;
        bodyLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
        bodyTransform.setAnchorPoint(0.5, 0.5);

        panel.active = false;
        this.rulesPanel = panel;
        return panel;
    }

    private initStoneData() {
        if (this.stoneCards.length === 0) return;
        this.stoneDataList = [];
        for (let i = 0; i < this.stoneCards.length; i++) {
            this.stoneDataList.push(this.generateStoneData());
            this.updateCardView(i);
        }
        this.updateCardSelection();
        this.selectedStoneIndex = -1;
        this.currentStone = null;
        this.lastCutSuccess = null;
        this.adviceBonusActive = false;
        this.adviceBonusValue = 0;
        this.resetStoneVisuals();
        this.updateStatus('先选原石');
        if (this.previewLabel) {
            this.previewLabel.string = '未开窗';
            this.previewLabel.color = new Color(30, 25, 20, 255);
        }
        if (this.finalLabel) {
            this.finalLabel.string = '等待决策';
            this.finalLabel.color = new Color(30, 25, 20, 255);
        }
        this.updateButtonsState();
    }

    private generateStoneData(): StoneData {
        const grades = [
            { name: '普通', quality: 0.35, open: 20, cut: 60, stone: 120 },
            { name: '中档', quality: 0.55, open: 35, cut: 90, stone: 170 },
            { name: '上档', quality: 0.75, open: 50, cut: 120, stone: 230 },
            { name: '精品', quality: 0.9, open: 70, cut: 160, stone: 300 },
        ];
        const skins = [
            { name: '青皮', color: new Color(90, 120, 100, 255), glow: new Color(150, 210, 170, 255) },
            { name: '黑乌沙', color: new Color(70, 72, 78, 255), glow: new Color(140, 190, 170, 255) },
            { name: '黄皮', color: new Color(150, 120, 90, 255), glow: new Color(200, 180, 140, 255) },
            { name: '灰青', color: new Color(100, 110, 125, 255), glow: new Color(160, 200, 205, 255) },
            { name: '绿皮', color: new Color(80, 110, 80, 255), glow: new Color(140, 210, 165, 255) },
        ];
        const sizes = ['小', '中', '大'];
        const cracks = ['少裂', '细裂', '明显裂'];
        const textures = ['细腻', '糯冰', '粗糙', '砂感'];

        const grade = grades[Math.floor(Math.random() * grades.length)];
        const skin = skins[Math.floor(Math.random() * skins.length)];
        const size = sizes[Math.floor(Math.random() * sizes.length)];
        const cracksValue = cracks[Math.floor(Math.random() * cracks.length)];
        const texture = textures[Math.floor(Math.random() * textures.length)];

        let quality = grade.quality + (Math.random() - 0.5) * 0.12;
        quality = Math.min(0.98, Math.max(0.2, quality));
        const luster = quality > 0.75 ? '强' : quality > 0.5 ? '中' : '弱';

        const sizeStone = size === '大' ? 25 : size === '中' ? 10 : 0;
        const openCost = OPEN_FEE;
        const cutCost = CUT_FEE;
        const stoneCost = Math.round(grade.stone + sizeStone);

        return {
            grade: grade.name,
            size,
            skin: skin.name,
            cracks: cracksValue,
            texture,
            luster,
            stoneCost,
            openCost,
            cutCost,
            quality,
            baseColor: skin.color,
            glowColor: skin.glow,
            purchased: false,
        };
    }

    private selectStone(index: number) {
        if (index < 0 || index >= this.stoneDataList.length) return;
        const stone = this.stoneDataList[index];
        this.selectedStoneIndex = index;
        this.currentStone = stone;
        this.mode = 'idle';
        this.hasWindow = false;
        this.hasCut = false;
        this.lastCutSuccess = null;
        this.adviceBonusActive = false;
        this.adviceBonusValue = 0;
        this.windowPos = null;
        this.cutStart = null;
        this.cutEnd = null;
        this.updateCardSelection();
        this.updateCardView(index);
        this.updateStoneDetail(this.currentStone);
        this.resetStoneVisuals();
        this.updateStatus(stone.purchased ? `已选择原石${index + 1}` : '已选中原石，请先购买');
        if (this.previewLabel) {
            this.previewLabel.string = '未开窗';
            this.previewLabel.color = new Color(30, 25, 20, 255);
        }
        if (this.finalLabel) {
            this.finalLabel.string = '等待决策';
            this.finalLabel.color = new Color(30, 25, 20, 255);
        }
        this.updateButtonsState();
    }

    private updateCardSelection() {
        this.stoneCards.forEach((card, index) => {
            const data = this.stoneDataList[index];
            const isSelected = index === this.selectedStoneIndex;
            const transform = card.node.getComponent(UITransform);
            if (!transform || !data) return;
            const baseFill = this.adjustColor(data.baseColor, 40);
            const fill = isSelected ? this.adjustColor(baseFill, 25) : baseFill;
            const stroke = isSelected ? new Color(255, 220, 170, 255) : new Color(20, 16, 12, 255);
            this.drawRoundedRectGfx(card.gfx, transform.contentSize.width, transform.contentSize.height, 10, fill, stroke, isSelected ? 4 : 3);
            Tween.stopAllByTarget(card.node);
            const targetScale = isSelected ? 1.04 : 1;
            tween(card.node).to(0.12, { scale: new Vec3(targetScale, targetScale, 1) }).start();
        });
    }

    private initSessionDiscount() {
        const best = SpecialEventVoucherManager.instance.getBestStoneDiscount();
        if (!best) {
            this.sessionDiscount = null;
            return;
        }
        const consumed = SpecialEventVoucherManager.instance.consumeVoucher('stone', best.tier);
        if (!consumed) {
            this.sessionDiscount = null;
            return;
        }
        this.sessionDiscount = { tier: best.tier, rate: best.rate, used: false, stoneIndex: -1 };
    }

    private getSessionDiscountRateForStone(index: number): number {
        if (!this.sessionDiscount) return 1;
        if (!this.sessionDiscount.used) return this.sessionDiscount.rate;
        return this.sessionDiscount.stoneIndex === index ? this.sessionDiscount.rate : 1;
    }

    private getSessionDiscountSuffix(rate: number): string {
        if (!this.sessionDiscount || rate >= 1) return '';
        return ' (' + this.sessionDiscount.tier + 'off)';
    }

    private updateCardView(index: number) {
        const card = this.stoneCards[index];
        const data = this.stoneDataList[index];
        if (!card || !data) return;
        card.title.string = `原石${index + 1}`;
        const priceTag = data.purchased ? '已购' : `价${data.stoneCost}`;
        card.tag.string = `${data.skin} · ${data.texture} · ${priceTag}`;
    }

    private updateStoneDetail(data: StoneData) {
        const values = [data.grade, data.skin, data.cracks, data.luster];
        this.detailLabels.forEach((label, index) => {
            if (!label) return;
            label.string = values[index] ?? '-';
        });
        const qualityColor = this.getQualityColor(data.quality);
        if (this.detailLabels[0]) this.detailLabels[0].color = qualityColor;
        if (this.detailLabels[1]) this.detailLabels[1].color = this.adjustColor(data.baseColor, 70, 255);
        if (this.detailLabels[2]) {
            const crackColor = data.cracks === '明显裂'
                ? new Color(210, 90, 70, 255)
                : data.cracks === '细裂'
                    ? new Color(210, 150, 90, 255)
                    : new Color(120, 200, 140, 255);
            this.detailLabels[2].color = crackColor;
        }
        if (this.detailLabels[3]) {
            const lusterColor = data.luster === '强'
                ? new Color(140, 220, 170, 255)
                : data.luster === '中'
                    ? new Color(200, 190, 120, 255)
                    : new Color(160, 150, 140, 255);
            this.detailLabels[3].color = lusterColor;
        }
        const discountRate = this.getSessionDiscountRateForStone(this.selectedStoneIndex);
        const discountSuffix = this.getSessionDiscountSuffix(discountRate);
        if (this.stoneCostLabel) {
            this.stoneCostLabel.string = `${Math.ceil(data.stoneCost * discountRate)}${discountSuffix}`;
            this.stoneCostLabel.color = new Color(165, 120, 80, 255);
        }
        if (this.openCostLabel) {
            this.openCostLabel.string = `${Math.ceil(data.openCost * discountRate)}${discountSuffix}`;
            this.openCostLabel.color = new Color(180, 140, 90, 255);
        }
        if (this.cutCostLabel) {
            this.cutCostLabel.string = `${Math.ceil(data.cutCost * discountRate)}${discountSuffix}`;
            this.cutCostLabel.color = new Color(180, 120, 90, 255);
        }
        if (this.advisorLabel) {
            this.advisorLabel.string = '师傅：先看开窗，再下刀。';
        }
        this.drawStoneSurface(data.baseColor);
    }

    private resetStoneVisuals() {
        this.clearSplitPieces();
        this.clearGemPreview();
        if (this.stoneDisplay) {
            this.stoneDisplay.active = true;
        }
        if (this.stoneShadow) {
            this.stoneShadow.active = true;
        }
        this.startStoneFloat();
        if (this.stoneWindow) {
            this.stoneWindow.active = false;
        }
        if (this.stoneGlow) {
            this.stoneGlow.active = false;
        }
        if (this.windowSpark) {
            this.windowSpark.active = false;
        }
        this.stopWindowPulse();
        if (this.cutFlash) {
            this.cutFlash.active = false;
        }
        if (this.cutSeam) {
            this.cutSeam.active = false;
        }
        this.stopCutSeamPulse();
        if (this.cutLineGfx) {
            this.cutLineGfx.clear();
        }
        if (this.cutLine) {
            this.cutLine.active = false;
        }
    }

    private updateStatus(text: string, color?: Color) {
        if (!this.statusLabel) return;
        this.statusLabel.string = text;
        if (color) {
            this.statusLabel.color = color;
        }
        const node = this.statusLabel.node;
        Tween.stopAllByTarget(node);
        node.setScale(1, 1, 1);
        tween(node)
            .to(0.1, { scale: new Vec3(1.06, 1.06, 1) })
            .to(0.15, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private updateButtonsState() {
        const hasStone = !!this.currentStone;
        const purchased = this.currentStone?.purchased ?? false;
        this.setButtonEnabled(this.openBtn, hasStone && purchased && !this.hasCut);
        this.setButtonEnabled(this.cutBtn, hasStone && purchased && !this.hasCut);
        this.setButtonEnabled(this.abandonBtn, hasStone && purchased && this.hasWindow && !this.hasCut);
        this.setButtonEnabled(this.adviceBtn, hasStone);
        if (this.buyBtn) {
            this.buyBtn.active = hasStone && !purchased;
            this.setButtonEnabled(this.buyBtn, hasStone && !purchased);
        }
    }

    private setupPreviewTooltip() {
        if (!this.previewLabel) return;
        const node = this.previewLabel.node;
        node.on(Node.EventType.MOUSE_ENTER, this.onPreviewHover, this);
        node.on(Node.EventType.MOUSE_LEAVE, this.onPreviewLeave, this);
    }

    private onPreviewHover() {
        if (!this.previewLabel || this.tooltipHovering) return;
        const text = this.buildPreviewTooltipText(this.previewLabel.string);
        if (!text) return;
        this.tooltipHovering = true;
        this.tooltipPendingText = text;
        this.scheduleOnce(this.showPreviewTooltip, 1);
    }

    private onPreviewLeave() {
        this.tooltipHovering = false;
        this.tooltipPendingText = null;
        this.unschedule(this.showPreviewTooltip);
        this.hideTooltip();
    }

    private showPreviewTooltip() {
        if (!this.tooltipHovering || !this.tooltipPendingText || !this.previewLabel) return;
        this.showTooltip(this.tooltipPendingText, this.previewLabel.node);
    }

    private buildPreviewTooltipText(text: string) {
        if (!text || text.indexOf('*') === -1) return null;
        const raw = text.replace(/\*/g, '');
        const parts = raw.split('/').map(item => item.trim()).filter(item => item.length > 0);
        const map: Record<string, string> = {
            '满绿': '满绿：通体绿，色均匀，价值高',
            '玻璃种': '玻璃种：通透度高，晶体细腻',
            '飘花': '飘花：色带飘浮，分布不均',
            '糯冰': '糯冰：半透明，细糯感强',
            '豆种': '豆种：颗粒粗，通透低',
            '棉絮': '棉絮：内含物明显，影响通透',
        };
        const lines: string[] = [];
        parts.forEach(part => {
            if (map[part]) {
                lines.push(map[part]);
            }
        });
        return lines.length > 0 ? lines.join('\\n') : null;
    }

    private ensureTooltip() {
        if (this.tooltipPanel && this.tooltipPanel.isValid && this.tooltipLabel) {
            return;
        }
        const panel = this.createRoundedRect('TooltipPanel', 260, 120, 10, new Color(32, 40, 36, 240), new Color(18, 18, 18, 255), 2);
        panel.parent = this.node;
        panel.active = false;
        panel.setSiblingIndex(9999);

        const labelNode = new Node('TooltipLabel');
        const labelTransform = this.ensureUITransform(labelNode, 230, 90);
        labelNode.parent = panel;
        labelNode.setPosition(0, -6, 0);
        const label = labelNode.addComponent(Label);
        label.fontSize = 12;
        label.color = new Color(230, 220, 200, 255);
        label.horizontalAlign = Label.HorizontalAlign.LEFT;
        label.verticalAlign = Label.VerticalAlign.TOP;
        label.lineHeight = 20;
        label.overflow = Label.Overflow.RESIZE_HEIGHT;
        label.enableWrapText = true;
        labelTransform.setAnchorPoint(0.5, 0.5);

        this.tooltipPanel = panel;
        this.tooltipLabel = label;
    }

    private showTooltip(text: string, anchorNode: Node) {
        this.ensureTooltip();
        if (!this.tooltipPanel || !this.tooltipLabel) return;
        this.tooltipLabel.string = text;
        this.positionTooltip(anchorNode);
        this.tooltipPanel.active = true;
    }

    private hideTooltip() {
        if (this.tooltipPanel) {
            this.tooltipPanel.active = false;
        }
    }

    private positionTooltip(anchorNode: Node) {
        if (!this.tooltipPanel) return;
        const worldPos = anchorNode.getWorldPosition();
        const rootTransform = this.node.getComponent(UITransform);
        if (!rootTransform) return;
        const localPos = rootTransform.convertToNodeSpaceAR(worldPos);
        this.tooltipPanel.setPosition(localPos.x + 120, localPos.y + 40, 0);
    }

    private setButtonEnabled(node: Node | null, enabled: boolean) {
        if (!node) return;
        const button = node.getComponent(Button);
        if (button) {
            button.interactable = enabled;
        }
        const opacity = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
        opacity.opacity = enabled ? 255 : 120;
    }

    private onOpenClick() {
        if (!this.currentStone) {
            this.updateStatus('先选原石', new Color(200, 150, 120, 255));
            return;
        }
        if (!this.currentStone.purchased) {
            this.updateStatus('请先购买原石', new Color(200, 150, 120, 255));
            return;
        }
        if (this.hasWindow) {
            this.updateStatus('已开窗，可全切或放弃');
            return;
        }
        this.mode = 'open';
        this.updateStatus('点击石头选择开窗位置', new Color(210, 200, 170, 255));
    }

    private onCutClick() {
        if (!this.currentStone) {
            this.updateStatus('先选原石');
            return;
        }
        if (!this.currentStone.purchased) {
            this.updateStatus('请先购买原石', new Color(200, 150, 120, 255));
            return;
        }
        if (this.hasCut) {
            this.updateStatus('已全切');
            return;
        }
        this.mode = 'cut';
        this.updateStatus('拖拽画出切线', new Color(210, 200, 170, 255));
        if (this.cutLine) {
            this.cutLine.active = true;
        }
    }

    private onAbandonClick() {
        if (!this.currentStone) {
            this.updateStatus('先选原石');
            return;
        }
        if (!this.currentStone.purchased) {
            this.updateStatus('未购买不可放弃', new Color(200, 150, 120, 255));
            return;
        }
        if (!this.hasWindow) {
            this.updateStatus('未开窗不能放弃', new Color(200, 150, 120, 255));
            return;
        }
        const index = this.selectedStoneIndex;
        if (index < 0) return;
        this.stoneDataList[index] = this.generateStoneData();
        this.currentStone = this.stoneDataList[index];
        this.hasWindow = false;
        this.hasCut = false;
        this.mode = 'idle';
        this.lastCutSuccess = null;
        this.adviceBonusActive = false;
        this.adviceBonusValue = 0;
        this.windowPos = null;
        this.cutStart = null;
        this.cutEnd = null;
        this.updateCardView(index);
        this.updateCardSelection();
        this.updateStoneDetail(this.currentStone);
        this.resetStoneVisuals();
        this.updateStatus('已放弃，刷新新原石');
        if (this.previewLabel) {
            this.previewLabel.string = '未开窗';
            this.previewLabel.color = new Color(30, 25, 20, 255);
        }
        if (this.finalLabel) {
            this.finalLabel.string = '等待决策';
            this.finalLabel.color = new Color(30, 25, 20, 255);
        }
        this.updateButtonsState();
    }

    private onAdviceClick() {
        if (!this.currentStone || !this.advisorLabel) return;
        const stone = this.currentStone;
        if (!stone.purchased) {
            this.advisorLabel.string = '建议：先买下这块，再决定开窗/全切。（灵感+）';
            return;
        }

        const suggestions: string[] = [];
        const baseSkin = stone.skin === '绿皮' ? '绿皮胆子大，但先试边角。'
            : stone.skin === '黑乌沙' ? '黑乌沙赌性强，务必小窗探路。'
            : stone.skin === '黄皮' ? '黄皮看色带，纹理密处先下手。'
            : '皮色一般，优先找纹理细密区。';
        const crack = stone.cracks === '明显裂' ? '裂多：切线绕裂，别压裂。'
            : stone.cracks === '细裂' ? '细裂：切线绕开裂带。'
            : '裂少：切线可更直。';
        const luster = stone.luster === '强' ? '光泽强：成色可能好，可稍放大切面。'
            : stone.luster === '中' ? '光泽一般：稳中求进。'
            : '光泽弱：保守开窗，小心成本。';

        if (!this.hasWindow || !this.windowPos) {
            suggestions.push(`建议：${baseSkin}`);
            suggestions.push(`补充：${crack}`);
            suggestions.push(`额外：${luster}`);
        } else if (!this.hasCut) {
            const hintX = this.windowPos.x >= 0 ? '右' : '左';
            const hintY = this.windowPos.y >= 0 ? '上' : '下';
            const cutDirX = this.windowPos.x >= 0 ? '左' : '右';
            const cutDirY = this.windowPos.y >= 0 ? '下' : '上';
            suggestions.push(`建议：开窗偏${hintX}${hintY}，从${cutDirX}${cutDirY}斜切。`);
            suggestions.push(`补充：${crack}`);
            suggestions.push(`额外：${luster}`);
        } else {
            const resultHint = this.lastCutSuccess === false ? '这刀切垮了，下次更小窗/绕裂。' : '这刀有效，保持当前切线思路。';
            const memory = this.windowPos ? `开窗在${this.windowPos.x >= 0 ? '右' : '左'}${this.windowPos.y >= 0 ? '上' : '下'}侧，下次还可参考。` : '';
            suggestions.push(`建议：${resultHint}`);
            if (memory) suggestions.push(`补充：${memory}`);
            suggestions.push(`额外：${luster}`);
        }

        // 组合多种形式（随机2-3条）
        const pickCount = Math.min(suggestions.length, 3);
        const shuffled = suggestions.sort(() => Math.random() - 0.5).slice(0, pickCount);
        this.advisorLabel.string = shuffled.join('\n');
        this.enableAdviceBonus();
    }

    private onBuyClick() {
        if (!this.currentStone) {
            this.updateStatus('先选原石');
            return;
        }
        if (this.currentStone.purchased) {
            this.updateStatus('已购买该原石');
            return;
        }
        const discountRate = this.getSessionDiscountRateForStone(this.selectedStoneIndex);
        const buyCost = Math.ceil(this.currentStone.stoneCost * discountRate);
        if (!this.spendWallet(buyCost, '原石价')) {
            this.updateStatus('钱包不足，无法购买原石', new Color(200, 150, 120, 255));
            return;
        }
        this.currentStone.purchased = true;
        if (this.sessionDiscount && !this.sessionDiscount.used) {
            this.sessionDiscount.used = true;
            this.sessionDiscount.stoneIndex = this.selectedStoneIndex;
        }
        this.updateStoneDetail(this.currentStone);
        if (this.selectedStoneIndex >= 0) {
            this.updateCardView(this.selectedStoneIndex);
        }
        this.updateStatus('购买成功，可开窗或全切', new Color(210, 200, 170, 255));
        this.refreshWallet();
        this.updateButtonsState();
    }

    private onStoneTouchStart(event: EventTouch) {
        const pos = this.getStonePosFromScreen(event.getLocation().x, event.getLocation().y);
        if (!pos || !this.isInsideDisplay(pos.local)) return;
        if (this.mode === 'open' && this.currentStone && !this.hasWindow) {
            this.updateWindowPreview(pos.local, pos.world);
            return;
        }
        if (this.mode !== 'cut' || !this.currentStone) return;
        const clamped = this.clampToDisplay(pos.local);
        if (!clamped) return;
        this.cutStart = clamped;
        this.cutEnd = clamped;
        this.updateCutLine(clamped, clamped, false);
    }

    private onStoneTouchMove(event: EventTouch) {
        const pos = this.getStonePosFromScreen(event.getLocation().x, event.getLocation().y);
        if (!pos) return;
        if (this.mode === 'open' && this.currentStone && !this.hasWindow) {
            if (!this.isInsideDisplay(pos.local)) {
                this.hideWindowPreview();
                return;
            }
            this.updateWindowPreview(pos.local, pos.world);
            return;
        }
        if (this.mode !== 'cut' || !this.currentStone || !this.cutStart) return;
        const clamped = this.clampToDisplay(pos.local);
        if (!clamped) return;
        this.cutEnd = clamped;
        this.updateCutLine(this.cutStart, clamped, false);
    }

    private onStoneTouchEnd(event: EventTouch) {
        if (!this.currentStone) return;
        const pos = this.getStonePosFromScreen(event.getLocation().x, event.getLocation().y);
        if (!pos) return;
        if (this.mode === 'open') {
            if (!this.isInsideDisplay(pos.local)) {
                this.updateStatus('开窗需点在石头内');
                return;
            }
            this.applyWindowAt(pos.local, pos.world);
            return;
        }
        if (this.mode === 'cut' && this.cutStart) {
            const clamped = this.clampToDisplay(pos.local);
            if (!clamped) {
                this.updateStatus('切线需在石头内');
                return;
            }
            this.cutEnd = clamped;
            this.finalizeCut(this.cutStart, clamped);
        }
    }

    private getStoneLocalPos(event: EventTouch) {
        const uiPos = event.getLocation();
        return this.uiToStoneLocal(uiPos.x, uiPos.y);
    }

    private isInsideDisplay(localPos: Vec3) {
        if (!this.stoneDisplay) return false;
        const transform = this.stoneDisplay.getComponent(UITransform);
        if (!transform) return false;
        const size = transform.contentSize;
        return Math.abs(localPos.x) <= size.width / 2 && Math.abs(localPos.y) <= size.height / 2;
    }

    private clampToDisplay(localPos: Vec3): Vec3 | null {
        if (!this.stoneDisplay) return null;
        const transform = this.stoneDisplay.getComponent(UITransform);
        if (!transform) return null;
        const halfW = transform.contentSize.width / 2;
        const halfH = transform.contentSize.height / 2;
        const padding = 6;
        return new Vec3(
            Math.max(-halfW + padding, Math.min(halfW - padding, localPos.x)),
            Math.max(-halfH + padding, Math.min(halfH - padding, localPos.y)),
            0
        );
    }

    private onMouseMove(event: EventMouse) {
        this.updatePreviewHoverFromMouse(event.getLocation().x, event.getLocation().y);
        if (this.mode !== 'open' || !this.currentStone || this.hasWindow) return;
        const uiPos = event.getLocation();
        const pos = this.getStonePosFromScreen(uiPos.x, uiPos.y);
        if (!pos || !this.isInsideDisplay(pos.local)) {
            this.hideWindowPreview();
            return;
        }
        this.updateWindowPreview(pos.local, pos.world);
    }

    private onStoneMouseMove(event: EventMouse) {
        if (this.mode !== 'open' || !this.currentStone || this.hasWindow) return;
        const uiPos = event.getLocation();
        const pos = this.getStonePosFromScreen(uiPos.x, uiPos.y);
        if (!pos || !this.isInsideDisplay(pos.local)) {
            this.hideWindowPreview();
            return;
        }
        this.updateWindowPreview(pos.local, pos.world);
    }

    private onStoneMouseLeave() {
        if (this.mode !== 'open' || this.hasWindow) return;
        this.hideWindowPreview();
    }

    private updatePreviewHoverFromMouse(uiX: number, uiY: number) {
        if (!this.previewLabel) return;
        const transform = this.previewLabel.node.getComponent(UITransform);
        const camera = this.getCanvasCamera();
        if (!transform || !camera) return;
        const worldPos = camera.screenToWorld(new Vec3(uiX, uiY, 0));
        const localPos = transform.convertToNodeSpaceAR(worldPos);
        const size = transform.contentSize;
        const inside = Math.abs(localPos.x) <= size.width / 2 && Math.abs(localPos.y) <= size.height / 2;
        if (inside) {
            this.onPreviewHover();
        } else if (this.tooltipHovering) {
            this.onPreviewLeave();
        }
    }

    private uiToStoneLocal(uiX: number, uiY: number): Vec3 | null {
        if (!this.stoneDisplay) return null;
        const displayTransform = this.stoneDisplay.getComponent(UITransform);
        const camera = this.getCanvasCamera();
        if (!displayTransform || !camera) return null;
        const worldPos = camera.screenToWorld(new Vec3(uiX, uiY, 0));
        return displayTransform.convertToNodeSpaceAR(worldPos);
    }

    private getStonePosFromScreen(uiX: number, uiY: number) {
        if (!this.stoneDisplay) return null;
        const displayTransform = this.stoneDisplay.getComponent(UITransform);
        const camera = this.getCanvasCamera();
        if (!displayTransform || !camera) return null;
        const worldPos = camera.screenToWorld(new Vec3(uiX, uiY, 0));
        const localPos = displayTransform.convertToNodeSpaceAR(worldPos);
        return { local: localPos, world: worldPos };
    }

    private getCanvasCamera(): Camera | null {
        const scene = director.getScene();
        const canvasNode = scene?.getChildByName('Canvas');
        if (!canvasNode) return null;
        const canvasComp = canvasNode.getComponent(Canvas);
        return canvasComp?.cameraComponent ?? null;
    }

    private getCanvasSize() {
        const scene = director.getScene();
        const canvasNode = scene?.getChildByName('Canvas');
        const transform = canvasNode?.getComponent(UITransform);
        return transform?.contentSize ?? view.getVisibleSize();
    }

    private applyWindowAt(localPos: Vec3, worldPos?: Vec3) {
        if (!this.currentStone || !this.stoneWindow || !this.stoneGlow) return;
        const discountRate = this.getSessionDiscountRateForStone(this.selectedStoneIndex);
        const openCost = Math.ceil(this.currentStone.openCost * discountRate);
        if (!this.spendWallet(openCost, '开窗费')) {
            this.updateStatus('钱包不足，无法开窗', new Color(200, 150, 120, 255));
            return;
        }
        this.mode = 'idle';
        this.hasWindow = true;
        this.windowPos = localPos;
        this.stoneWindow.active = true;
        if (worldPos) {
            this.stoneWindow.setWorldPosition(worldPos);
        } else {
            this.stoneWindow.setPosition(localPos);
        }
        this.drawWindowShape(this.currentStone.glowColor);
        this.drawCandleGlow(this.currentStone.glowColor);
        if (this.stoneGlow) {
            if (worldPos) {
                this.stoneGlow.setWorldPosition(worldPos);
            } else {
                this.stoneGlow.setPosition(localPos);
            }
            this.stoneGlow.active = true;
        }
        if (this.windowSpark) {
            this.windowSpark.active = false;
        }
        this.startWindowPulse();
        if (this.previewLabel) {
            const previewText = this.currentStone.quality > 0.75 ? '满绿* / 玻璃种*'
                : this.currentStone.quality > 0.55 ? '飘花* / 糯冰*'
                : '豆种* / 棉絮*';
            this.previewLabel.string = previewText;
            this.previewLabel.color = new Color(30, 25, 20, 255);
        }
        this.updateStatus('已开窗，可全切或放弃', new Color(210, 200, 170, 255));
        this.refreshWallet();
        this.updateButtonsState();
    }

    private updateWindowPreview(localPos: Vec3, worldPos?: Vec3) {
        if (!this.currentStone || !this.stoneWindow || !this.stoneGlow) return;
        this.stoneWindow.active = true;
        if (worldPos) {
            this.stoneWindow.setWorldPosition(worldPos);
        } else {
            this.stoneWindow.setPosition(localPos);
        }
        this.drawWindowShape(this.currentStone.glowColor);
        if (this.stoneGlow) {
            this.stoneGlow.active = false;
        }
        if (this.windowSpark) {
            this.windowSpark.active = false;
        }
        this.stopWindowPulse();
    }

    private hideWindowPreview() {
        if (this.hasWindow) return;
        if (this.stoneWindow) {
            this.stoneWindow.active = false;
        }
        if (this.stoneGlow) {
            this.stoneGlow.active = false;
        }
        if (this.windowSpark) {
            this.windowSpark.active = false;
        }
        this.stopWindowPulse();
    }

    private drawWindowShape(color: Color) {
        if (!this.stoneWindow || !this.stoneWindowGfx) return;
        const transform = this.stoneWindow.getComponent(UITransform);
        if (!transform) return;
        const size = transform.contentSize;
        const fill = this.adjustColor(color, 15, 200);
        const stroke = this.adjustColor(color, 35, 255);
        this.drawIrregularShape(this.stoneWindowGfx, size.width, size.height, fill, stroke, true);
    }

    private drawCandleGlow(color: Color) {
        if (!this.stoneGlow || !this.stoneGlowGfx) return;
        const transform = this.stoneGlow.getComponent(UITransform);
        if (!transform) return;
        const size = transform.contentSize;
        const radius = Math.min(size.width, size.height) / 2;
        this.stoneGlowGfx.clear();
        this.stoneGlowGfx.fillColor = this.adjustColor(color, 40, 80);
        this.stoneGlowGfx.circle(0, 0, radius * 0.6);
        this.stoneGlowGfx.fill();
        this.stoneGlowGfx.fillColor = this.adjustColor(color, 80, 60);
        this.stoneGlowGfx.circle(0, 0, radius * 0.35);
        this.stoneGlowGfx.fill();
    }

    private drawSpark(color: Color, intensity: number = 0.5) {
        if (!this.windowSpark || !this.windowSparkGfx) return;
        const transform = this.windowSpark.getComponent(UITransform);
        if (!transform) return;
        const size = transform.contentSize;
        this.windowSparkGfx.clear();
        const t = Math.min(1, Math.max(0.1, intensity));
        const count = 2 + Math.round(t * 18);
        const alpha = Math.round(80 + t * 180);
        this.windowSparkGfx.fillColor = this.adjustColor(color, 110, alpha);
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * size.width * 0.6;
            const y = (Math.random() - 0.5) * size.height * 0.6;
            const r = 2 + Math.random() * (4 + t * 9);
            this.windowSparkGfx.circle(x, y, r);
            this.windowSparkGfx.fill();
        }
    }

    private updateCutLine(start: Vec3, end: Vec3, glow: boolean) {
        if (!this.cutLineGfx) return;
        this.cutLineGfx.clear();
        if (glow) {
            this.cutLineGfx.strokeColor = new Color(255, 210, 160, 120);
            this.cutLineGfx.lineWidth = 10;
            this.cutLineGfx.moveTo(start.x, start.y);
            this.cutLineGfx.lineTo(end.x, end.y);
            this.cutLineGfx.stroke();
            this.cutLineGfx.strokeColor = new Color(255, 235, 200, 240);
            this.cutLineGfx.lineWidth = 3;
            this.cutLineGfx.moveTo(start.x, start.y);
            this.cutLineGfx.lineTo(end.x, end.y);
            this.cutLineGfx.stroke();
        } else {
            this.cutLineGfx.strokeColor = new Color(240, 200, 160, 200);
            this.cutLineGfx.lineWidth = 3;
            this.cutLineGfx.moveTo(start.x, start.y);
            this.cutLineGfx.lineTo(end.x, end.y);
            this.cutLineGfx.stroke();
        }
    }

    private flashCutGlow(start: Vec3, end: Vec3, color: Color) {
        if (!this.cutFlash || !this.cutFlashGfx || !this.stoneDisplay) return;
        const displayTransform = this.stoneDisplay.getComponent(UITransform);
        if (!displayTransform) return;
        const midLocal = new Vec3((start.x + end.x) / 2, (start.y + end.y) / 2, 0);
        const worldPos = displayTransform.convertToWorldSpaceAR(midLocal);
        this.cutFlash.setWorldPosition(worldPos);
        this.cutFlash.active = true;
        const w = this.cutFlash.getComponent(UITransform)?.contentSize.width ?? 160;
        const h = this.cutFlash.getComponent(UITransform)?.contentSize.height ?? 80;
        this.cutFlashGfx.clear();
        this.cutFlashGfx.fillColor = this.adjustColor(color, 120, 160);
        this.cutFlashGfx.ellipse(0, 0, w * 0.4, h * 0.2);
        this.cutFlashGfx.fill();
        const opacity = this.cutFlash.getComponent(UIOpacity) || this.cutFlash.addComponent(UIOpacity);
        opacity.opacity = 200;
        Tween.stopAllByTarget(this.cutFlash);
        Tween.stopAllByTarget(opacity);
        tween(opacity).to(0.25, { opacity: 0 }).call(() => {
            if (this.cutFlash) this.cutFlash.active = false;
        }).start();
    }

    private showCutSeam(start: Vec3, end: Vec3, color: Color) {
        if (!this.cutSeam || !this.cutSeamGfx) return;
        this.cutSeam.active = true;
        this.cutSeam.setSiblingIndex(9998);
        this.cutSeamGfx.clear();
        this.cutSeamGfx.strokeColor = this.adjustColor(color, 160, 255);
        this.cutSeamGfx.lineWidth = 10;
        this.cutSeamGfx.moveTo(start.x, start.y);
        this.cutSeamGfx.lineTo(end.x, end.y);
        this.cutSeamGfx.stroke();
        this.cutSeamGfx.strokeColor = new Color(255, 245, 220, 255);
        this.cutSeamGfx.lineWidth = 2;
        this.cutSeamGfx.moveTo(start.x, start.y);
        this.cutSeamGfx.lineTo(end.x, end.y);
        this.cutSeamGfx.stroke();
        this.startCutSeamPulse();
    }

    private startCutSeamPulse() {
        if (!this.cutSeam || this.cutSeamPulseActive) return;
        const opacity = this.cutSeam.getComponent(UIOpacity) || this.cutSeam.addComponent(UIOpacity);
        opacity.opacity = 200;
        this.cutSeamPulseActive = true;
        Tween.stopAllByTarget(this.cutSeam);
        Tween.stopAllByTarget(opacity);
        tween(opacity)
            .repeatForever(
                tween(opacity)
                    .to(0.6, { opacity: 255 })
                    .to(0.6, { opacity: 180 })
            )
            .start();
    }

    private stopCutSeamPulse() {
        if (!this.cutSeam) return;
        const opacity = this.cutSeam.getComponent(UIOpacity);
        Tween.stopAllByTarget(this.cutSeam);
        if (opacity) {
            Tween.stopAllByTarget(opacity);
        }
        this.cutSeamPulseActive = false;
    }

    private startWindowPulse() {
        if (!this.stoneGlow || this.windowPulseActive) return;
        const opacity = this.stoneGlow.getComponent(UIOpacity) || this.stoneGlow.addComponent(UIOpacity);
        opacity.opacity = 140;
        this.windowPulseActive = true;
        Tween.stopAllByTarget(this.stoneGlow);
        Tween.stopAllByTarget(opacity);
        tween(this.stoneGlow)
            .repeatForever(
                tween(this.stoneGlow)
                    .to(0.8, { scale: new Vec3(1.06, 1.06, 1) })
                    .to(0.8, { scale: new Vec3(1, 1, 1) })
            )
            .start();
        tween(opacity)
            .repeatForever(
                tween(opacity)
                    .to(0.8, { opacity: 170 })
                    .to(0.8, { opacity: 130 })
            )
            .start();
    }

    private stopWindowPulse() {
        if (!this.stoneGlow) return;
        const opacity = this.stoneGlow.getComponent(UIOpacity);
        Tween.stopAllByTarget(this.stoneGlow);
        if (opacity) {
            Tween.stopAllByTarget(opacity);
        }
        this.windowPulseActive = false;
    }

    private finalizeCut(start: Vec3, end: Vec3) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 40) {
            this.updateStatus('切线太短，重新画', new Color(200, 150, 120, 255));
            return;
        }
        if (!this.currentStone) return;
        const discountRate = this.getSessionDiscountRateForStone(this.selectedStoneIndex);
        const cutCost = Math.ceil(this.currentStone.cutCost * discountRate);
        if (!this.spendWallet(cutCost, '全切费')) {
            this.updateStatus('钱包不足，无法全切', new Color(200, 150, 120, 255));
            this.cutStart = null;
            this.cutEnd = null;
            if (this.cutLineGfx) {
                this.cutLineGfx.clear();
            }
            if (this.cutLine) {
                this.cutLine.active = false;
            }
            return;
        }
        this.mode = 'idle';
        this.hasCut = true;
        if (this.cutLine) {
            this.cutLine.active = true;
        }
        this.updateCutLine(start, end, true);
        this.flashCutGlow(start, end, this.currentStone.glowColor);
        this.showCutSeam(start, end, this.currentStone.glowColor);

        const len = Math.max(1, dist);
        const normal = new Vec2(-dy / len, dx / len);
        this.spawnSplitPieces(normal, this.currentStone.baseColor);
        this.spawnCutDebris(start, end, this.currentStone.baseColor, normal);

        const baseChance = this.currentStone.quality * 0.85;
        let bonus = 0;
        if (this.adviceBonusActive && Math.random() < 0.65) {
            bonus = this.adviceBonusValue;
        }
        this.adviceBonusActive = false;
        this.adviceBonusValue = 0;
        const success = Math.random() < Math.min(0.95, baseChance + bonus);
        this.lastCutSuccess = success;
        if (this.finalLabel) {
            this.finalLabel.string = success ? (this.currentStone.quality > 0.75 ? '大涨' : '小涨') : '切垮';
            this.finalLabel.color = new Color(30, 25, 20, 255);
        }
        if (success) {
            this.updateStatus('切开见绿，生成宝石', new Color(180, 230, 190, 255));
            this.spawnCutBurst(start, end, this.currentStone.glowColor);
        } else {
            this.updateStatus('切垮，石头变灰', new Color(180, 150, 150, 255));
        }
        let reward = 0;
        if (success) {
            reward = this.calculateGemValue(this.currentStone);
            InventoryManager.instance?.addMoney(reward);
        }
        this.spawnGemPreview(this.currentStone, success);
        if (!success) {
            this.tintSplitPieces(new Color(120, 120, 120, 255));
        }
        if (Math.random() < 0.45) {
            const tier = this.getQualityTier(this.currentStone.quality);
            const boost = this.adjustColor(this.currentStone.glowColor, tier.boost, 255);
            this.showCutSeam(start, end, boost);
            this.spawnCutBurst(start, end, boost);
            this.updateStatus(`切口透出：${tier.name}`, tier.statusColor);
        }
        if (success && reward > 0) {
            if (this.finalLabel) {
                this.finalLabel.string = `${this.finalLabel.string} +${reward}`;
            }
            this.updateStatus(`宝石卖出 +${reward}`, new Color(180, 230, 190, 255));
            this.showMoneyGain(reward);
        }
        this.refreshWallet();
        this.updateButtonsState();
    }

    private spendWallet(amount: number, label: string) {
        const wallet = InventoryManager.instance;
        if (!wallet) return false;
        const ok = wallet.spendMoney(amount);
        if (!ok) {
            this.updateStatus(`${label}不足`, new Color(200, 150, 120, 255));
        }
        return ok;
    }

    private spawnSplitPieces(normal: Vec2, color: Color) {
        if (!this.stoneDisplay) return;
        const displayTransform = this.stoneDisplay.getComponent(UITransform);
        if (!displayTransform) return;
        const width = displayTransform.contentSize.width;
        const height = displayTransform.contentSize.height;
        const parent = this.stoneDisplay.parent ?? this.node;
        const basePos = this.stoneDisplay.getPosition();

        this.clearSplitPieces();
        const pieceWidth = width * 0.45;
        const pieceHeight = height * 0.45;
        const left = this.createNode('StoneHalfLeft', pieceWidth, pieceHeight);
        const right = this.createNode('StoneHalfRight', pieceWidth, pieceHeight);
        const leftGfx = left.addComponent(Graphics);
        const rightGfx = right.addComponent(Graphics);
        this.drawIrregularShape(leftGfx, pieceWidth, pieceHeight, this.adjustColor(color, 10), new Color(50, 50, 50, 255));
        this.drawIrregularShape(rightGfx, pieceWidth, pieceHeight, this.adjustColor(color, -5), new Color(50, 50, 50, 255));

        left.parent = parent;
        right.parent = parent;
        left.setPosition(basePos);
        right.setPosition(basePos);
        this.stoneSplitLeft = left;
        this.stoneSplitRight = right;

        this.stopStoneFloat();
        if (this.stoneDisplay) {
            this.stoneDisplay.active = false;
        }
        if (this.stoneShadow) {
            this.stoneShadow.active = false;
        }
        if (this.stoneWindow) {
            this.stoneWindow.active = false;
        }
        if (this.stoneGlow) {
            this.stoneGlow.active = false;
        }

        const distance = 120;
        const leftTarget = new Vec3(basePos.x + normal.x * distance, basePos.y + normal.y * distance, 0);
        const rightTarget = new Vec3(basePos.x - normal.x * distance, basePos.y - normal.y * distance, 0);
        tween(left).to(0.35, { position: leftTarget }).start();
        tween(right).to(0.35, { position: rightTarget }).start();
    }

    private startStoneFloat() {
        if (!this.stoneDisplay || this.stoneFloatActive) return;
        this.stoneFloatBasePos = this.stoneDisplay.getPosition().clone();
        this.stoneFloatActive = true;
        Tween.stopAllByTarget(this.stoneDisplay);
        tween(this.stoneDisplay)
            .repeatForever(
                tween()
                    .to(1.2, { position: new Vec3(this.stoneFloatBasePos.x, this.stoneFloatBasePos.y + 8, 0) })
                    .to(1.2, { position: new Vec3(this.stoneFloatBasePos.x, this.stoneFloatBasePos.y, 0) })
            )
            .start();
        if (this.stoneShadow) {
            const opacity = this.stoneShadow.getComponent(UIOpacity) || this.stoneShadow.addComponent(UIOpacity);
            opacity.opacity = 180;
            Tween.stopAllByTarget(this.stoneShadow);
            Tween.stopAllByTarget(opacity);
            tween(this.stoneShadow)
                .repeatForever(
                    tween()
                        .to(1.2, { scale: new Vec3(0.92, 0.92, 1) })
                        .to(1.2, { scale: new Vec3(1, 1, 1) })
                )
                .start();
            tween(opacity)
                .repeatForever(
                    tween()
                        .to(1.2, { opacity: 140 })
                        .to(1.2, { opacity: 180 })
                )
                .start();
        }
    }

    private stopStoneFloat() {
        if (!this.stoneDisplay) return;
        Tween.stopAllByTarget(this.stoneDisplay);
        if (this.stoneFloatBasePos) {
            this.stoneDisplay.setPosition(this.stoneFloatBasePos);
        }
        this.stoneFloatActive = false;
        if (this.stoneShadow) {
            Tween.stopAllByTarget(this.stoneShadow);
            const opacity = this.stoneShadow.getComponent(UIOpacity);
            if (opacity) {
                Tween.stopAllByTarget(opacity);
                opacity.opacity = 180;
            }
            this.stoneShadow.setScale(1, 1, 1);
        }
    }

    private enableAdviceBonus() {
        this.adviceBonusActive = true;
        this.adviceBonusValue = 0.06 + Math.random() * 0.05;
    }

    private spawnCutDebris(start: Vec3, end: Vec3, color: Color, normal: Vec2) {
        if (!this.stoneDisplay) return;
        const parent = this.stoneDisplay.parent ?? this.node;
        const mid = new Vec3((start.x + end.x) / 2, (start.y + end.y) / 2, 0);
        const base = this.stoneDisplay.getPosition();
        const debrisCount = 12 + Math.floor(Math.random() * 6);
        for (let i = 0; i < debrisCount; i++) {
            const debris = this.createNode(`Debris${i}`, 10, 10);
            const gfx = debris.addComponent(Graphics);
            gfx.fillColor = this.adjustColor(color, -10, 220);
            const size = 3 + Math.random() * 4;
            gfx.moveTo(0, size);
            gfx.lineTo(-size, -size * 0.6);
            gfx.lineTo(size, -size * 0.4);
            gfx.close();
            gfx.fill();
            const jitter = new Vec3(
                (Math.random() - 0.5) * 24,
                (Math.random() - 0.5) * 16,
                0
            );
            debris.parent = parent;
            debris.setPosition(base.x + mid.x + jitter.x, base.y + mid.y + jitter.y, 0);
            const dirScale = 40 + Math.random() * 30;
            const target = new Vec3(
                debris.getPosition().x + normal.x * dirScale,
                debris.getPosition().y + normal.y * dirScale,
                0
            );
            const opacity = debris.addComponent(UIOpacity);
            opacity.opacity = 220;
            tween(debris)
                .to(0.25, { position: target }, { easing: 'quadOut' })
                .to(0.2, { position: new Vec3(target.x, target.y - 12, 0) }, { easing: 'quadIn' })
                .call(() => debris.destroy())
                .start();
            tween(opacity)
                .to(0.25, { opacity: 140 })
                .to(0.2, { opacity: 0 })
                .start();
        }
    }

    private spawnCutBurst(start: Vec3, end: Vec3, glow: Color) {
        if (!this.stoneDisplay) return;
        const parent = this.stoneDisplay.parent ?? this.node;
        const mid = new Vec3((start.x + end.x) / 2, (start.y + end.y) / 2, 0);
        const base = this.stoneDisplay.getPosition();
        for (let i = 0; i < 6; i++) {
            const burst = this.createNode(`CutBurst${i}`, 80, 80);
            const gfx = burst.addComponent(Graphics);
            gfx.strokeColor = this.adjustColor(glow, 120, 220);
            gfx.lineWidth = 2;
            const angle = (Math.PI * 2 * i) / 6;
            const len = 18 + Math.random() * 10;
            gfx.moveTo(0, 0);
            gfx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
            gfx.stroke();
            burst.parent = parent;
            burst.setPosition(base.x + mid.x, base.y + mid.y, 0);
            const opacity = burst.addComponent(UIOpacity);
            opacity.opacity = 220;
            tween(burst)
                .to(0.2, { scale: new Vec3(1.2, 1.2, 1) })
                .call(() => burst.destroy())
                .start();
            tween(opacity)
                .to(0.2, { opacity: 0 })
                .start();
        }
    }

    private clearSplitPieces() {
        if (this.stoneSplitLeft) {
            this.stoneSplitLeft.destroy();
            this.stoneSplitLeft = null;
        }
        if (this.stoneSplitRight) {
            this.stoneSplitRight.destroy();
            this.stoneSplitRight = null;
        }
    }

    private tintSplitPieces(color: Color) {
        const leftTransform = this.stoneSplitLeft?.getComponent(UITransform);
        const rightTransform = this.stoneSplitRight?.getComponent(UITransform);
        const leftGfx = this.stoneSplitLeft?.getComponent(Graphics);
        const rightGfx = this.stoneSplitRight?.getComponent(Graphics);
        if (leftTransform && leftGfx) {
            this.drawIrregularShape(leftGfx, leftTransform.contentSize.width, leftTransform.contentSize.height, color, new Color(60, 60, 60, 255));
        }
        if (rightTransform && rightGfx) {
            this.drawIrregularShape(rightGfx, rightTransform.contentSize.width, rightTransform.contentSize.height, color, new Color(60, 60, 60, 255));
        }
    }

    private spawnGemPreview(data: StoneData, success: boolean) {
        if (!this.gemPreview) return;
        this.clearGemPreview();
        if (!success) return;
        const gfx = this.gemPreview.addComponent(Graphics);
        gfx.clear();
        const baseSize = 40 + data.quality * 55;
        const jitter = 0.85 + Math.random() * 0.3;
        const size = Math.max(36, baseSize * jitter);
        const glowStrength = Math.round(140 + data.quality * 80);
        const fill = this.adjustColor(data.glowColor, 40, glowStrength);
        const stroke = this.adjustColor(data.glowColor, 70, 255);
        const halo = this.adjustColor(data.glowColor, 90, 110);
        gfx.fillColor = halo;
        gfx.circle(0, 0, size * 0.7);
        gfx.fill();
        gfx.fillColor = this.adjustColor(data.glowColor, 120, 80);
        gfx.circle(0, 0, size * 0.45);
        gfx.fill();
        this.drawGemShape(gfx, size, fill, stroke, false);
        const innerFill = this.adjustColor(data.glowColor, 100, Math.min(255, glowStrength + 40));
        this.drawGemShape(gfx, size * 0.55, innerFill, undefined, false);
        const opacity = this.gemPreview.getComponent(UIOpacity) || this.gemPreview.addComponent(UIOpacity);
        opacity.opacity = 240;
        this.gemPreview.setSiblingIndex(9997);
        Tween.stopAllByTarget(this.gemPreview);
        Tween.stopAllByTarget(opacity);
        tween(this.gemPreview)
            .repeatForever(
                tween()
                    .to(0.7, { scale: new Vec3(1.06, 1.06, 1) })
                    .to(0.7, { scale: new Vec3(1, 1, 1) })
            )
            .start();
        tween(opacity)
            .repeatForever(
                tween()
                    .to(0.7, { opacity: 255 })
                    .to(0.7, { opacity: 220 })
            )
            .start();
        this.gemPreview.active = true;
    }

    private clearGemPreview() {
        if (!this.gemPreview) return;
        const gfx = this.gemPreview.getComponent(Graphics);
        if (gfx) {
            gfx.clear();
            this.gemPreview.removeComponent(Graphics);
        }
        Tween.stopAllByTarget(this.gemPreview);
        const opacity = this.gemPreview.getComponent(UIOpacity);
        if (opacity) {
            Tween.stopAllByTarget(opacity);
        }
        this.gemPreview.active = false;
    }

    private drawStoneSurface(color: Color) {
        if (!this.stoneDisplay || !this.stoneDisplayGfx) return;
        const transform = this.stoneDisplay.getComponent(UITransform);
        if (!transform) return;
        const width = transform.contentSize.width;
        const height = transform.contentSize.height;
        this.drawIrregularShape(this.stoneDisplayGfx, width, height, color, new Color(50, 50, 50, 255));
        this.stoneDisplayGfx.fillColor = this.adjustColor(color, 20, 120);
        for (let i = 0; i < 10; i++) {
            const x = (Math.random() - 0.5) * width * 0.8;
            const y = (Math.random() - 0.5) * height * 0.6;
            const r = 6 + Math.random() * 10;
            this.stoneDisplayGfx.circle(x, y, r);
            this.stoneDisplayGfx.fill();
        }
        this.stoneDisplayGfx.strokeColor = this.adjustColor(color, -20, 120);
        this.stoneDisplayGfx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const startX = (Math.random() - 0.5) * width * 0.6;
            const startY = (Math.random() - 0.5) * height * 0.6;
            const endX = startX + (Math.random() - 0.5) * width * 0.3;
            const endY = startY + (Math.random() - 0.5) * height * 0.3;
            this.stoneDisplayGfx.moveTo(startX, startY);
            this.stoneDisplayGfx.lineTo(endX, endY);
            this.stoneDisplayGfx.stroke();
        }
    }

    private drawRoundedRectGfx(gfx: Graphics, width: number, height: number, radius: number, fill: Color, stroke?: Color, lineWidth: number = 0) {
        gfx.clear();
        gfx.fillColor = fill;
        if (stroke) {
            gfx.strokeColor = stroke;
            gfx.lineWidth = lineWidth;
        }
        gfx.roundRect(-width / 2, -height / 2, width, height, radius);
        gfx.fill();
        if (stroke && lineWidth > 0) {
            gfx.roundRect(-width / 2, -height / 2, width, height, radius);
            gfx.stroke();
        }
    }

    private drawIrregularShape(gfx: Graphics, width: number, height: number, fill: Color, stroke?: Color, clear: boolean = true) {
        if (clear) {
            gfx.clear();
        }
        gfx.fillColor = fill;
        if (stroke) {
            gfx.strokeColor = stroke;
            gfx.lineWidth = 2;
        }
        const points = 10;
        const rx = width / 2;
        const ry = height / 2;
        let firstX = 0;
        let firstY = 0;
        for (let i = 0; i < points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const jitter = 0.75 + Math.random() * 0.35;
            const x = Math.cos(angle) * rx * jitter;
            const y = Math.sin(angle) * ry * jitter;
            if (i === 0) {
                firstX = x;
                firstY = y;
                gfx.moveTo(x, y);
            } else {
                gfx.lineTo(x, y);
            }
        }
        gfx.lineTo(firstX, firstY);
        gfx.fill();
        if (stroke) {
            gfx.stroke();
        }
    }

    private drawGemShape(gfx: Graphics, size: number, fill: Color, stroke?: Color, clear: boolean = true) {
        if (clear) {
            gfx.clear();
        }
        const points = 8;
        const outer = size * 0.55;
        const inner = size * 0.35;
        gfx.fillColor = fill;
        if (stroke) {
            gfx.strokeColor = stroke;
            gfx.lineWidth = 2;
        }
        let firstX = 0;
        let firstY = 0;
        for (let i = 0; i < points; i++) {
            const angle = (Math.PI * 2 * i) / points - Math.PI / 2;
            const radius = i % 2 === 0 ? outer : inner;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                firstX = x;
                firstY = y;
                gfx.moveTo(x, y);
            } else {
                gfx.lineTo(x, y);
            }
        }
        gfx.lineTo(firstX, firstY);
        gfx.fill();
        if (stroke) {
            gfx.stroke();
            gfx.strokeColor = new Color(stroke.r, stroke.g, stroke.b, 140);
            gfx.lineWidth = 1;
            gfx.moveTo(-inner, 0);
            gfx.lineTo(inner, 0);
            gfx.stroke();
            gfx.moveTo(0, -inner);
            gfx.lineTo(0, inner);
            gfx.stroke();
        }
    }

    private adjustColor(color: Color, delta: number, alpha?: number) {
        const r = Math.min(255, Math.max(0, color.r + delta));
        const g = Math.min(255, Math.max(0, color.g + delta));
        const b = Math.min(255, Math.max(0, color.b + delta));
        const a = alpha ?? color.a;
        return new Color(r, g, b, a);
    }

    private getQualityColor(quality: number) {
        if (quality >= 0.8) return new Color(120, 220, 170, 255);
        if (quality >= 0.6) return new Color(170, 210, 130, 255);
        if (quality >= 0.4) return new Color(210, 180, 120, 255);
        return new Color(180, 150, 140, 255);
    }

    private getQualityTier(quality: number) {
        if (quality >= 0.85) {
            return { name: '极品', boost: 160, statusColor: new Color(120, 220, 170, 255) };
        }
        if (quality >= 0.7) {
            return { name: '上品', boost: 120, statusColor: new Color(160, 210, 140, 255) };
        }
        if (quality >= 0.5) {
            return { name: '中品', boost: 90, statusColor: new Color(200, 180, 120, 255) };
        }
        return { name: '普品', boost: 60, statusColor: new Color(170, 150, 140, 255) };
    }

    private calculateGemValue(stone: StoneData) {
        const invested = stone.stoneCost + stone.cutCost + (this.hasWindow ? stone.openCost : 0);
        const multiplier = 1.1 + stone.quality * 1.1 + Math.random() * 0.2;
        return Math.round(invested * multiplier);
    }

    private showMoneyGain(amount: number) {
        if (!this.walletLabel) return;
        const rootTransform = this.node.getComponent(UITransform);
        if (!rootTransform) return;
        const worldPos = this.walletLabel.node.getWorldPosition();
        const localPos = rootTransform.convertToNodeSpaceAR(worldPos);
        const label = this.createLabel('MoneyGain', `+${amount}`, 18, new Color(255, 226, 150, 255));
        label.node.parent = this.node;
        label.node.setPosition(localPos.x + 40, localPos.y + 10, 0);
        label.node.setSiblingIndex(9999);
        const opacity = label.node.addComponent(UIOpacity);
        opacity.opacity = 255;
        tween(label.node)
            .to(0.5, { position: new Vec3(localPos.x + 40, localPos.y + 60, 0) }, { easing: 'quadOut' })
            .call(() => label.node.destroy())
            .start();
        tween(opacity)
            .to(0.5, { opacity: 0 })
            .start();
        this.pulseWallet();
    }

    private pulseWallet() {
        const walletNode = this.walletLabel?.node?.parent;
        if (!walletNode) return;
        Tween.stopAllByTarget(walletNode);
        walletNode.setScale(1, 1, 1);
        tween(walletNode)
            .to(0.08, { scale: new Vec3(1.06, 1.06, 1) })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private createChip(name: string, text: string, offset: Vec3) {
        const chip = this.createRoundedRect(name, 140, 24, 10, new Color(250, 240, 220, 255), new Color(18, 18, 18, 255), 2);
        chip.setPosition(offset);
        const label = this.createLabel('Label', text, 11, new Color(60, 50, 40, 255));
        label.node.parent = chip;
        label.node.setPosition(0, 0, 0);
        return chip;
    }

    private createButton(name: string, text: string, width: number, height: number, color?: Color) {
        const btn = this.createRoundedRect(name, width, height, 10, color ?? new Color(245, 215, 120, 255), new Color(18, 18, 18, 255), 2);
        btn.addComponent(Button);
        const label = this.createLabel('Label', text, 12, new Color(30, 25, 20, 255));
        label.node.parent = btn;
        label.node.setPosition(0, 0, 0);
        return btn;
    }

    private createRect(name: string, width: number, height: number, color: Color) {
        const node = new Node(name);
        this.ensureUITransform(node, width, height);
        const gfx = node.addComponent(Graphics);
        gfx.fillColor = color;
        gfx.rect(-width / 2, -height / 2, width, height);
        gfx.fill();
        return node;
    }

    private createRoundedRect(name: string, width: number, height: number, radius: number, fill: Color, stroke?: Color, lineWidth: number = 0) {
        const node = new Node(name);
        this.ensureUITransform(node, width, height);
        const gfx = node.addComponent(Graphics);
        gfx.fillColor = fill;
        if (stroke) {
            gfx.strokeColor = stroke;
            gfx.lineWidth = lineWidth;
        }
        gfx.roundRect(-width / 2, -height / 2, width, height, radius);
        gfx.fill();
        if (stroke && lineWidth > 0) {
            gfx.roundRect(-width / 2, -height / 2, width, height, radius);
            gfx.stroke();
        }
        return node;
    }

    private createNode(name: string, width: number, height: number) {
        const node = new Node(name);
        this.ensureUITransform(node, width, height);
        return node;
    }

    private createLabel(name: string, text: string, fontSize: number, color: Color) {
        const node = new Node(name);
        const actualSize = fontSize + 2;
        this.ensureUITransform(node, 200, actualSize + 6);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = actualSize;
        label.color = color;
        label.isBold = true;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableOutline = false;
        label.outlineWidth = 0;
        label.enableShadow = false;
        return label;
    }

    private createInfoRow(parent: Node, name: string, text: string, width: number, height: number, position: Vec3, fill?: Color, fontSize: number = 12) {
        const row = this.createRoundedRect(name, width, height, 8, fill ?? new Color(255, 248, 233, 255), new Color(180, 150, 120, 120), 1);
        row.parent = parent;
        row.setPosition(position);
        const keyLabel = this.createLabel('KeyLabel', text, fontSize, new Color(45, 35, 30, 255));
        keyLabel.node.parent = row;
        const keyTransform = keyLabel.node.getComponent(UITransform);
        if (keyTransform) {
            keyTransform.setContentSize(width * 0.45, height);
            keyTransform.setAnchorPoint(0, 0.5);
        }
        keyLabel.node.setPosition(-width / 2 + 10, 0, 0);
        keyLabel.horizontalAlign = Label.HorizontalAlign.LEFT;

        const valueLabel = this.createLabel('ValueLabel', '-', fontSize, new Color(80, 70, 60, 255));
        valueLabel.node.parent = row;
        const valueTransform = valueLabel.node.getComponent(UITransform);
        if (valueTransform) {
            valueTransform.setContentSize(width * 0.45, height);
            valueTransform.setAnchorPoint(1, 0.5);
        }
        valueLabel.node.setPosition(width / 2 - 10, 0, 0);
        valueLabel.horizontalAlign = Label.HorizontalAlign.RIGHT;
        return valueLabel;
    }

    private ensureUITransform(node: Node, width?: number, height?: number) {
        const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
        if (width !== undefined && height !== undefined) {
            transform.setContentSize(width, height);
        }
        return transform;
    }

    private refreshWallet() {
        if (!this.walletLabel) return;
        const wallet = InventoryManager.instance?.globalWallet ?? 0;
        this.walletLabel.string = `钱包 ${wallet}`;
    }
}















