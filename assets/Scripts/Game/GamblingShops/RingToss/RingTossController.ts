import { _decorator, Component, Node, Label, Button, UITransform, UIOpacity, Vec3, Color, Graphics, tween, EventTouch, EventMouse, Camera, Canvas, director } from 'cc';
import { IngredientType } from '../../../Data/GameConfig';
import { InventoryManager } from '../../../Manager/InventoryManager';
import { ReviewSystem } from '../../Systems';
import { AudioManager } from '../../../Utils/AudioManager';
import { RING_TOSS_CONFIG, RingTossTargetConfig } from './RingTossConfig';

const { ccclass, property } = _decorator;

interface RuntimeTarget {
    config: RingTossTargetConfig;
    node: Node;
    label: Label | null;
    body: Node;
    groundPos: Vec3;
}

interface RewardResult {
    summary: string;
    detail?: string;
    isJackpot: boolean;
    isPack: boolean;
    cash?: number;
}

interface RewardEntry {
    node: Node;
    label: Label;
    isPack: boolean;
    detail?: string;
}

interface HitCandidate {
    target: RuntimeTarget;
    edgeRatio: number;
    overlap: 'contained' | 'hook';
}

@ccclass('RingTossController')
export class RingTossController extends Component {
    @property(Node)
    panelRoot: Node | null = null;

    @property
    hitSfxPath = '';

    @property
    missSfxPath = '';

    @property
    jackpotSfxPath = '';

    private panel: Node | null = null;
    private container: Node | null = null;
    private topBar: Node | null = null;
    private stageRoot: Node | null = null;
    private sideRoot: Node | null = null;
    private playArea: Node | null = null;
    private targetsRoot: Node | null = null;
    private ringsRoot: Node | null = null;
    private aimRoot: Node | null = null;

    private statusLabel: Label | null = null;
    private walletLabel: Label | null = null;
    private roundLabel: Label | null = null;
    private resultLabel: Label | null = null;
    private titleLabel: Label | null = null;
    private hintLabel: Label | null = null;
    private windLabel: Label | null = null;
    private windBar: Node | null = null;
    private windFill: Node | null = null;

    private selectGroup: Node | null = null;
    private selectButtons: Node[] = [];
    private selectButtonComps: Button[] = [];
    private selectButtonLabels: Label[] = [];
    private startButton: Button | null = null;
    private startButtonLabel: Label | null = null;
    private closeButton: Button | null = null;

    private aimLine: Graphics | null = null;
    private trajectoryGfx: Graphics | null = null;
    private isDragging = false;
    private isThrowing = false;
    private selectedCount = 1;
    private remainingThrows = 0;
    private currentPower = 0;
    private chargeLocked = false;
    private currentAimLocal = new Vec3();
    private currentLandingLocal: Vec3 | null = null;

    private powerBar: Node | null = null;
    private powerFill: Node | null = null;
    private rewardListRoot: Node | null = null;
    private rewardEntries: RewardEntry[] = [];
    private rewardTitleLabel: Label | null = null;
    private tooltipNode: Node | null = null;
    private tooltipLabel: Label | null = null;
    private hoverEntry: RewardEntry | null = null;
    private hoverTimer: (() => void) | null = null;
    private tooltipVisible = false;
    private pointerLocal = new Vec3();

    private targets: RuntimeTarget[] = [];
    private boundEvents = false;
    private canvasCamera: Camera | null = null;
    private heatBoostRemaining = 0;
    private heatBoostActive = false;
    private playScale = 1;
    private lastPlayScale = 1;
    private missStreak = 0;
    private windStrength = 0.2;
    private windTargetStrength = 0.2;
    private windDir = 1;
    private windDirLabel = '东风';
    private windTime = 0;
    private windSeed = Math.random() * 10;
    private ringBaseRadius = 18;

    private readonly vegetableTypes: IngredientType[] = [
        IngredientType.LETTUCE,
        IngredientType.CABBAGE_LEAF,
        IngredientType.POTATO,
        IngredientType.EGGPLANT,
        IngredientType.GREEN_BEAN,
    ];

    private readonly meatTypes: IngredientType[] = [
        IngredientType.MEATBALL,
        IngredientType.BEEF,
        IngredientType.PORK,
        IngredientType.CHICKEN,
        IngredientType.SAUSAGE,
    ];

    onLoad(): void {
        this.ensurePanel();
        this.initWind();
    }

    onDestroy(): void {
        this.stopHeatBoost();
    }

    update(dt: number): void {
        if (!this.panel || !this.panel.active) return;
        this.windTime += dt;
        const speed = 1.2;
        this.windStrength = this.lerp(this.windStrength, this.windTargetStrength, Math.min(1, dt * speed));
        this.updateWindBar();
        if (this.isDragging && this.canThrow()) {
            const duration = Math.max(0.15, RING_TOSS_CONFIG.chargeDuration ?? 1.15);
            if (!this.chargeLocked) {
                this.currentPower = Math.min(1, this.currentPower + dt / duration);
                if (this.currentPower >= 0.999) {
                    this.chargeLocked = true;
                }
            }
            this.refreshAimVisuals();
        }
    }

    public open(): void {
        this.ensurePanel();
        if (!this.panel) return;
        this.panel.active = true;
        this.panel.setSiblingIndex(9999);
        this.missStreak = 0;
        this.currentPower = 0;
        this.chargeLocked = false;
        this.resetRewardList();
        this.updateStatus();
        this.updateWallet();
        this.updateRound();
        this.updateSelectionVisuals();
        this.updateStartButtonState();
        this.setResult('');
        this.updateHint('拖拽调整方向，按住蓄力，松手投出（力度存在甜蜜点）');
    }

    public close(): void {
        if (!this.panel) return;
        this.panel.active = false;
        this.isDragging = false;
        this.chargeLocked = false;
        this.clearAim();
        this.hideTooltip();
    }

    private ensurePanel(): void {
        if (!this.panelRoot || !this.panelRoot.isValid) {
            const canvas = this.node.scene?.getChildByName('Canvas');
            this.panelRoot = canvas?.getChildByName('RingTossPanel') ?? null;
        }
        this.panel = this.panelRoot;
        if (!this.panel || !this.panel.isValid) return;

        this.container = this.panel.getChildByName('Container') ?? null;
        this.playArea = this.findNodeRecursive(this.container, 'PlayArea');
        this.targetsRoot = this.playArea?.getChildByName('TargetsRoot') ?? null;
        this.ringsRoot = this.playArea?.getChildByName('RingsRoot') ?? null;
        this.aimRoot = this.playArea?.getChildByName('AimRoot') ?? null;

        this.statusLabel = this.findNodeRecursive(this.container, 'StatusLabel')?.getComponent(Label) ?? null;
        this.walletLabel = this.findNodeRecursive(this.container, 'WalletLabel')?.getComponent(Label) ?? null;
        this.roundLabel = this.findNodeRecursive(this.container, 'RoundLabel')?.getComponent(Label) ?? null;
        this.resultLabel = this.findNodeRecursive(this.container, 'ResultLabel')?.getComponent(Label) ?? null;
        this.titleLabel = this.findNodeRecursive(this.container, 'TitleLabel')?.getComponent(Label) ?? null;
        this.hintLabel = this.findNodeRecursive(this.container, 'HintLabel')?.getComponent(Label) ?? null;

        this.selectGroup = this.findNodeRecursive(this.container, 'SelectGroup');
        if (this.selectGroup && this.selectButtons.length === 0) {
            const select1 = this.selectGroup.getChildByName('Select1Btn');
            const select3 = this.selectGroup.getChildByName('Select3Btn');
            const select5 = this.selectGroup.getChildByName('Select5Btn');
            this.selectButtons = [select1, select3, select5].filter(Boolean) as Node[];
            this.selectButtonComps = this.selectButtons.map(node => node.getComponent(Button)).filter(Boolean) as Button[];
            this.selectButtonLabels = this.selectButtons
                .map(node => node.getChildByName('Label')?.getComponent(Label))
                .filter(Boolean) as Label[];
        }

        const startNode = this.container?.getChildByName('StartBtn') ?? null;
        this.startButton = startNode?.getComponent(Button) ?? null;
        this.startButtonLabel = startNode?.getChildByName('Label')?.getComponent(Label) ?? null;

        const closeNode = this.container?.getChildByName('CloseBtn') ?? null;
        this.closeButton = closeNode?.getComponent(Button) ?? null;

        this.ensureLayoutNodes();
        this.applyLayout();
        this.drawPanelVisuals();
        this.bindEvents();
        this.ensureTargets();
        this.updateSelectionTexts();
    }

    private bindEvents(): void {
        if (this.boundEvents) return;
        this.boundEvents = true;

        const counts = [1, 3, 5];
        this.selectButtons.forEach((node, index) => {
            const count = counts[index] ?? 1;
            node.on(Button.EventType.CLICK, () => this.selectCount(count), this);
        });

        if (this.startButton?.node) {
            this.startButton.node.on(Button.EventType.CLICK, this.startRound, this);
        }
        if (this.closeButton?.node) {
            this.closeButton.node.on(Button.EventType.CLICK, this.close, this);
        }
        if (this.playArea) {
            this.playArea.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.playArea.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            this.playArea.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.playArea.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        }
        if (this.panel) {
            this.panel.on(Node.EventType.MOUSE_MOVE, this.onPanelMouseMove, this);
            this.panel.on(Node.EventType.MOUSE_LEAVE, this.onPanelMouseLeave, this);
        }
    }

    private drawPanelVisuals(): void {
        if (!this.panel) return;
        const dimNode = this.panel.getChildByName('Dim');
        const dimGfx = dimNode?.getComponent(Graphics);
        if (dimGfx) {
            dimGfx.clear();
            dimGfx.fillColor = new Color(0, 0, 0, 200);
            dimGfx.rect(-960, -540, 1920, 1080);
            dimGfx.fill();
        }

        const panelGfx = this.container?.getComponent(Graphics);
        if (panelGfx && this.container) {
            const size = this.container.getComponent(UITransform)?.contentSize;
            if (size) {
                panelGfx.clear();
                panelGfx.fillColor = new Color(35, 30, 24, 235);
                panelGfx.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, 18);
                panelGfx.fill();
                panelGfx.strokeColor = new Color(120, 90, 60, 255);
                panelGfx.lineWidth = 3;
                panelGfx.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, 18);
                panelGfx.stroke();
            }
        }

        const topBarGfx = this.topBar?.getComponent(Graphics) || this.topBar?.addComponent(Graphics);
        if (topBarGfx && this.topBar) {
            const size = this.topBar.getComponent(UITransform)?.contentSize;
            if (size) {
                this.drawRoundedRectGfx(topBarGfx, size.width, size.height, 14, new Color(48, 40, 32, 255), new Color(20, 15, 10, 255), 2);
            }
        }
        const stageGfx = this.stageRoot?.getComponent(Graphics) || this.stageRoot?.addComponent(Graphics);
        if (stageGfx && this.stageRoot) {
            const size = this.stageRoot.getComponent(UITransform)?.contentSize;
            if (size) {
                this.drawRoundedRectGfx(stageGfx, size.width, size.height, 16, new Color(40, 34, 28, 235), new Color(120, 90, 60, 200), 2);
            }
        }
        const sideGfx = this.sideRoot?.getComponent(Graphics) || this.sideRoot?.addComponent(Graphics);
        if (sideGfx && this.sideRoot) {
            const size = this.sideRoot.getComponent(UITransform)?.contentSize;
            if (size) {
                this.drawRoundedRectGfx(sideGfx, size.width, size.height, 14, new Color(44, 38, 32, 240), new Color(110, 90, 70, 200), 2);
            }
        }
        const rewardGfx = this.rewardListRoot?.getComponent(Graphics) || this.rewardListRoot?.addComponent(Graphics);
        if (rewardGfx && this.rewardListRoot) {
            const size = this.rewardListRoot.getComponent(UITransform)?.contentSize;
            if (size) {
                this.drawRoundedRectGfx(rewardGfx, size.width, size.height, 10, new Color(32, 26, 22, 200), new Color(90, 70, 50, 200), 1);
            }
        }

        const playGfx = this.playArea?.getComponent(Graphics) || this.playArea?.addComponent(Graphics);
        if (playGfx && this.playArea) {
            const size = this.playArea.getComponent(UITransform)?.contentSize;
            if (size) {
                playGfx.clear();
                playGfx.strokeColor = new Color(160, 120, 80, 180);
                playGfx.lineWidth = 2;
                playGfx.rect(-size.width / 2, -size.height / 2, size.width, size.height);
                playGfx.stroke();
            }
        }

        this.selectButtons.forEach((button, index) => {
            const count = [1, 3, 5][index] ?? 1;
            this.drawButton(button, this.selectedCount === count, false);
        });
        this.updateStartButtonState();
        if (this.closeButton?.node) {
            this.drawButton(this.closeButton.node, false, false);
        }
    }

    private drawButton(node: Node | null, active: boolean, disabled: boolean): void {
        if (!node) return;
        const gfx = node.getComponent(Graphics);
        const size = node.getComponent(UITransform)?.contentSize;
        if (!gfx || !size) return;
        gfx.clear();
        const fillColor = disabled
            ? new Color(80, 80, 80, 200)
            : active
                ? new Color(210, 160, 90, 255)
                : new Color(70, 55, 40, 255);
        gfx.fillColor = fillColor;
        gfx.strokeColor = new Color(20, 15, 10, 255);
        gfx.lineWidth = 2;
        gfx.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, 10);
        gfx.fill();
        gfx.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, 10);
        gfx.stroke();
    }

    private ensureLayoutNodes(): void {
        if (!this.container) return;
        this.topBar = this.container.getChildByName('TopBar') ?? new Node('TopBar');
        if (!this.topBar.parent) {
            this.container.addChild(this.topBar);
        }
        this.stageRoot = this.container.getChildByName('Stage') ?? new Node('Stage');
        if (!this.stageRoot.parent) {
            this.container.addChild(this.stageRoot);
        }
        this.sideRoot = this.container.getChildByName('SidePanel') ?? new Node('SidePanel');
        if (!this.sideRoot.parent) {
            this.container.addChild(this.sideRoot);
        }
        this.ensureUITransform(this.topBar);
        this.ensureUITransform(this.stageRoot);
        this.ensureUITransform(this.sideRoot);

        if (!this.titleLabel) {
            const titleNode = new Node('TitleLabel');
            this.titleLabel = titleNode.addComponent(Label);
            this.titleLabel.string = '套圈摊';
            this.titleLabel.fontSize = 26;
            this.titleLabel.color = new Color(255, 230, 180, 255);
            this.titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            this.titleLabel.verticalAlign = Label.VerticalAlign.CENTER;
            this.ensureUITransform(titleNode, 240, 32);
            this.topBar.addChild(titleNode);
        } else {
            this.titleLabel.node.parent = this.topBar;
        }
        if (!this.windLabel) {
            const windNode = new Node('WindLabel');
            this.windLabel = windNode.addComponent(Label);
            this.windLabel.string = '风力 东风';
            this.windLabel.fontSize = 14;
            this.windLabel.color = new Color(200, 185, 160, 255);
            this.windLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            this.windLabel.verticalAlign = Label.VerticalAlign.CENTER;
            this.ensureUITransform(windNode, 200, 20);
            this.topBar.addChild(windNode);
        } else {
            this.windLabel.node.parent = this.topBar;
        }

        this.windBar = this.topBar.getChildByName('WindBar') ?? new Node('WindBar');
        if (!this.windBar.parent) {
            this.topBar.addChild(this.windBar);
        }
        this.windFill = this.windBar.getChildByName('Fill') ?? new Node('Fill');
        if (!this.windFill.parent) {
            this.windBar.addChild(this.windFill);
        }
        this.ensureUITransform(this.windBar);
        this.ensureUITransform(this.windFill);
        this.updateWindLabel();
        if (this.walletLabel?.node) {
            this.walletLabel.node.parent = this.topBar;
        }
        if (this.closeButton?.node) {
            this.closeButton.node.parent = this.topBar;
        }

        if (this.playArea) {
            this.playArea.parent = this.stageRoot;
        }
        if (!this.hintLabel) {
            const hintNode = new Node('HintLabel');
            this.hintLabel = hintNode.addComponent(Label);
            this.hintLabel.string = '拖拽调整方向，按住蓄力，松手投出';
            this.hintLabel.fontSize = 16;
            this.hintLabel.color = new Color(220, 200, 170, 255);
            this.hintLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            this.hintLabel.verticalAlign = Label.VerticalAlign.CENTER;
            this.ensureUITransform(hintNode, 420, 24);
            this.stageRoot.addChild(hintNode);
        } else {
            this.hintLabel.node.parent = this.stageRoot;
        }

        if (this.selectGroup) {
            this.selectGroup.parent = this.sideRoot;
        }
        if (this.statusLabel?.node) {
            this.statusLabel.node.parent = this.sideRoot;
        }
        if (this.roundLabel?.node) {
            this.roundLabel.node.parent = this.sideRoot;
        }
        if (this.resultLabel?.node) {
            this.resultLabel.node.parent = this.sideRoot;
        }
        if (this.startButton?.node) {
            this.startButton.node.parent = this.sideRoot;
        }

        this.rewardListRoot = this.sideRoot.getChildByName('RewardList') ?? new Node('RewardList');
        if (!this.rewardListRoot.parent) {
            this.sideRoot.addChild(this.rewardListRoot);
        }
        this.ensureUITransform(this.rewardListRoot);

        const rewardTitleNode = this.sideRoot.getChildByName('RewardTitle') ?? new Node('RewardTitle');
        if (!rewardTitleNode.parent) {
            this.sideRoot.addChild(rewardTitleNode);
        }
        this.ensureUITransform(rewardTitleNode, 200, 24);
        this.rewardTitleLabel = rewardTitleNode.getComponent(Label) || rewardTitleNode.addComponent(Label);
        this.rewardTitleLabel.string = '奖励记录';
        this.rewardTitleLabel.fontSize = 14;
        this.rewardTitleLabel.color = new Color(200, 185, 160, 255);
        this.rewardTitleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.rewardTitleLabel.verticalAlign = Label.VerticalAlign.CENTER;

        this.powerBar = this.stageRoot.getChildByName('PowerBar') ?? new Node('PowerBar');
        if (!this.powerBar.parent) {
            this.stageRoot.addChild(this.powerBar);
        }
        this.powerFill = this.powerBar.getChildByName('Fill') ?? new Node('Fill');
        if (!this.powerFill.parent) {
            this.powerBar.addChild(this.powerFill);
        }
        this.ensureUITransform(this.powerBar);
        this.ensureUITransform(this.powerFill);

        this.ensureTooltip();
    }

    private applyLayout(): void {
        if (!this.container || !this.topBar || !this.stageRoot || !this.sideRoot) return;
        const panelSize = this.container.getComponent(UITransform)?.contentSize;
        if (!panelSize) return;

        const padding = 24;
        const topPadding = 18;
        const bottomPadding = 20;
        const topBarHeight = 64;
        const gap = 20;
        const usableWidth = panelSize.width - padding * 2;
        const sideWidth = Math.min(300, Math.round(usableWidth * 0.32));
        const stageWidth = Math.max(720, usableWidth - sideWidth - gap);
        const stageTop = panelSize.height / 2 - topBarHeight - topPadding;
        const stageBottom = -panelSize.height / 2 + bottomPadding;
        const stageHeight = Math.max(360, stageTop - stageBottom);
        const stageCenterY = (stageTop + stageBottom) / 2;

        this.ensureUITransform(this.topBar, panelSize.width - padding * 2, topBarHeight);
        this.topBar.setPosition(0, panelSize.height / 2 - topBarHeight / 2 - topPadding, 0);

        this.ensureUITransform(this.stageRoot, stageWidth, stageHeight);
        this.stageRoot.setPosition(-(sideWidth + gap) / 2, stageCenterY, 0);

        this.ensureUITransform(this.sideRoot, sideWidth, stageHeight);
        this.sideRoot.setPosition((stageWidth + gap) / 2, stageCenterY, 0);

        if (this.playArea) {
            const playWidth = stageWidth - 36;
            const playHeight = stageHeight - 70;
            this.ensureUITransform(this.playArea, playWidth, playHeight);
            this.playArea.setPosition(0, -10, 0);
        }
        this.updatePlayScale();
        this.refreshTargetsScale();

        if (this.targetsRoot) {
            this.targetsRoot.setPosition(0, 0, 0);
        }
        if (this.ringsRoot) {
            this.ringsRoot.setPosition(0, 0, 0);
        }
        if (this.aimRoot) {
            this.aimRoot.setPosition(0, 0, 0);
        }

        const topBarSize = this.topBar.getComponent(UITransform)?.contentSize;
        if (this.titleLabel?.node) {
            this.titleLabel.string = '套圈摊';
            this.titleLabel.fontSize = 26;
            this.titleLabel.node.setPosition(0, 0, 0);
        }
        if (this.windLabel?.node && topBarSize) {
            this.windLabel.node.setPosition(40, -20, 0);
        }
        if (this.windBar && this.windFill) {
            this.ensureUITransform(this.windBar, 140, 12);
            this.windBar.setPosition(110, -20, 0);
            this.updateWindBar();
        }
        if (this.walletLabel?.node && topBarSize) {
            this.walletLabel.node.setPosition(-topBarSize.width / 2 + 90, 0, 0);
        }
        if (this.closeButton?.node && topBarSize) {
            this.closeButton.node.setPosition(topBarSize.width / 2 - 44, 0, 0);
        }

        const sideSize = this.sideRoot.getComponent(UITransform)?.contentSize;
        if (sideSize) {
            const topY = sideSize.height / 2 - 26;
            if (this.statusLabel?.node) {
                this.statusLabel.node.setPosition(0, topY, 0);
            }
            if (this.roundLabel?.node) {
                this.roundLabel.node.setPosition(0, topY - 26, 0);
            }
            if (this.selectGroup) {
                this.selectGroup.setPosition(0, topY - 90, 0);
            }
            if (this.rewardListRoot) {
                this.ensureUITransform(this.rewardListRoot, sideSize.width - 24, 180);
                this.rewardListRoot.setPosition(0, 10, 0);
            }
            if (this.rewardTitleLabel?.node) {
                this.rewardTitleLabel.node.setPosition(0, 110, 0);
            }
            if (this.startButton?.node) {
                this.startButton.node.setPosition(0, -sideSize.height / 2 + 76, 0);
            }
            if (this.resultLabel?.node) {
                this.resultLabel.node.setPosition(0, -sideSize.height / 2 + 30, 0);
            }
        }

        const stageSize = this.stageRoot.getComponent(UITransform)?.contentSize;
        if (stageSize && this.hintLabel?.node) {
            this.hintLabel.node.setPosition(0, stageSize.height / 2 - 22, 0);
            this.hintLabel.fontSize = 16;
        }

        this.ensurePowerBarLayout();
        this.layoutRewardEntries();
    }

    private ensurePowerBarLayout(): void {
        if (!this.stageRoot || !this.powerBar || !this.powerFill) return;
        const stageSize = this.stageRoot.getComponent(UITransform)?.contentSize;
        if (!stageSize) return;
        this.ensureUITransform(this.powerBar, 140, 16);
        this.powerBar.setPosition(-stageSize.width / 2 + 90, -stageSize.height / 2 + 30, 0);
        this.ensureUITransform(this.powerFill, 8, 10);
        this.powerFill.setPosition(-66, 0, 0);
        this.updatePowerBar(0);
    }

    private updatePowerBar(power: number): void {
        if (!this.powerBar || !this.powerFill) return;
        const barSize = this.powerBar.getComponent(UITransform)?.contentSize;
        if (!barSize) return;
        const fillWidth = Math.max(6, (barSize.width - 6) * power);
        this.ensureUITransform(this.powerFill, fillWidth, barSize.height - 6);
        this.powerFill.setPosition(-barSize.width / 2 + fillWidth / 2 + 3, 0, 0);
        const bgGfx = this.powerBar.getComponent(Graphics) || this.powerBar.addComponent(Graphics);
        this.drawRoundedRectGfx(bgGfx, barSize.width, barSize.height, 8, new Color(25, 20, 16, 200), new Color(110, 90, 70, 220), 2);
        const minPower = RING_TOSS_CONFIG.minPower;
        const sweetPower = RING_TOSS_CONFIG.difficulty.sweetSpot ?? 0.55;
        const sweet = (sweetPower - minPower) / Math.max(0.001, 1 - minPower);
        const zoneHalf = 0.06 / Math.max(0.001, 1 - minPower);
        const left = Math.max(0, sweet - zoneHalf);
        const right = Math.min(1, sweet + zoneHalf);
        const zoneX = -barSize.width / 2 + left * barSize.width;
        const zoneW = Math.max(10, (right - left) * barSize.width);
        bgGfx.fillColor = new Color(255, 220, 150, 70);
        bgGfx.roundRect(zoneX, -barSize.height / 2 + 3, zoneW, barSize.height - 6, 6);
        bgGfx.fill();
        bgGfx.strokeColor = new Color(255, 240, 200, 130);
        bgGfx.lineWidth = 1;
        bgGfx.roundRect(zoneX, -barSize.height / 2 + 3, zoneW, barSize.height - 6, 6);
        bgGfx.stroke();
        const fillGfx = this.powerFill.getComponent(Graphics) || this.powerFill.addComponent(Graphics);
        const fillColor = new Color(255, 200 - Math.round(80 * power), 120, 230);
        this.drawRoundedRectGfx(fillGfx, fillWidth, barSize.height - 6, 6, fillColor);
    }

    private drawRoundedRectGfx(gfx: Graphics, width: number, height: number, radius: number, fill: Color, stroke?: Color, lineWidth: number = 0): void {
        gfx.clear();
        gfx.fillColor = fill;
        if (stroke && lineWidth > 0) {
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

    private ensureTargets(): void {
        if (!this.targetsRoot || this.targets.length > 0) return;
        this.updateRingBaseRadius();
        RING_TOSS_CONFIG.targets.forEach((config) => {
            const node = new Node(`Target_${config.id}`);
            const groundPos = new Vec3(config.position.x, config.position.y, 0);
            const screenPos = this.projectToScreen(groundPos);
            const size = this.getTargetScreenSize(config, groundPos);
            node.setPosition(screenPos);
            this.ensureUITransform(node, size.width, size.height);
            const body = new Node('Body');
            this.ensureUITransform(body, size.width, size.height);
            const gfx = body.addComponent(Graphics);
            this.drawTarget(gfx, config, size);
            node.addChild(body);

            const labelNode = new Node('Label');
            this.ensureUITransform(labelNode, Math.max(80, size.width + 10), 26);
            const label = labelNode.addComponent(Label);
            label.string = config.label;
            const labelScale = this.getDepthScale(groundPos.y) * this.playScale;
            label.fontSize = Math.max(14, Math.round(18 * labelScale));
            label.lineHeight = Math.max(18, Math.round(22 * labelScale));
            label.color = Color.WHITE;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            labelNode.setPosition(0, -size.height / 2 - 14, 0);
            node.addChild(labelNode);

            this.targetsRoot?.addChild(node);
            this.targets.push({ config, node, label, body, groundPos });
        });
        this.lastPlayScale = this.playScale;
    }

    private updatePlayScale(): void {
        if (!this.playArea) return;
        const size = this.playArea.getComponent(UITransform)?.contentSize;
        if (!size) return;
        const perspective = RING_TOSS_CONFIG.perspective;
        const bounds = perspective.groundBounds;
        const nearScale = perspective.nearScale;
        const screenHeight = Math.abs(perspective.screenFarY - perspective.screenNearY);
        const screenWidth = Math.abs(bounds.xMax - bounds.xMin) * nearScale;
        const scaleX = size.width / screenWidth;
        const scaleY = size.height / screenHeight;
        this.playScale = Math.min(1, scaleX, scaleY);
    }

    private refreshTargetsScale(): void {
        if (!this.targets.length) return;
        if (Math.abs(this.lastPlayScale - this.playScale) < 0.001) return;
        this.lastPlayScale = this.playScale;
        this.targets.forEach((target) => {
            const size = this.getTargetScreenSize(target.config, target.groundPos);
            target.node.setPosition(this.projectToScreen(target.groundPos));
            this.ensureUITransform(target.node, size.width, size.height);
            this.ensureUITransform(target.body, size.width, size.height);
            const gfx = target.body.getComponent(Graphics);
            if (gfx) {
                this.drawTarget(gfx, target.config, size);
            }
            if (target.label?.node) {
                target.label.node.setPosition(0, -size.height / 2 - 14, 0);
                const labelScale = this.getDepthScale(target.groundPos.y) * this.playScale;
                target.label.fontSize = Math.max(14, Math.round(18 * labelScale));
                target.label.lineHeight = Math.max(18, Math.round(22 * labelScale));
            }
        });
    }

    private ensureTooltip(): void {
        if (!this.container) return;
        this.tooltipNode = this.container.getChildByName('RewardTooltip') ?? new Node('RewardTooltip');
        if (!this.tooltipNode.parent) {
            this.container.addChild(this.tooltipNode);
        }
        this.ensureUITransform(this.tooltipNode, 260, 68);
        const gfx = this.tooltipNode.getComponent(Graphics) || this.tooltipNode.addComponent(Graphics);
        this.drawRoundedRectGfx(gfx, 260, 68, 10, new Color(30, 24, 20, 240), new Color(120, 90, 60, 240), 2);
        const labelNode = this.tooltipNode.getChildByName('Label') ?? new Node('Label');
        if (!labelNode.parent) {
            this.tooltipNode.addChild(labelNode);
        }
        this.ensureUITransform(labelNode, 240, 56);
        this.tooltipLabel = labelNode.getComponent(Label) || labelNode.addComponent(Label);
        this.tooltipLabel.string = '';
        this.tooltipLabel.fontSize = 14;
        this.tooltipLabel.lineHeight = 18;
        this.tooltipLabel.color = new Color(255, 240, 210, 255);
        this.tooltipLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.tooltipLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.tooltipLabel.enableWrapText = true;
        labelNode.setPosition(0, 0, 0);
        this.tooltipNode.active = false;
    }

    private resetRewardList(): void {
        if (!this.rewardListRoot) return;
        this.rewardEntries.forEach(entry => entry.node.destroy());
        this.rewardEntries = [];
        this.layoutRewardEntries();
        this.hideTooltip();
    }

    private addRewardEntry(text: string, options: { isPack?: boolean; detail?: string; highlight?: boolean } = {}): void {
        if (!this.rewardListRoot) return;
        const listSize = this.rewardListRoot.getComponent(UITransform)?.contentSize;
        if (!listSize) return;
        const entry = new Node(`RewardEntry${this.rewardEntries.length + 1}`);
        this.ensureUITransform(entry, listSize.width - 12, 30);
        const gfx = entry.addComponent(Graphics);
        const fill = options.highlight ? new Color(70, 55, 35, 220) : new Color(28, 22, 18, 200);
        this.drawRoundedRectGfx(gfx, listSize.width - 12, 30, 8, fill, new Color(90, 70, 50, 200), 1);

        const labelNode = new Node('Label');
        entry.addChild(labelNode);
        this.ensureUITransform(labelNode, listSize.width - 24, 28);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 14;
        label.lineHeight = 18;
        label.color = options.highlight ? new Color(255, 220, 160, 255) : new Color(230, 220, 200, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;

        this.rewardListRoot.addChild(entry);
        const rewardEntry: RewardEntry = { node: entry, label, isPack: !!options.isPack, detail: options.detail };
        this.rewardEntries.unshift(rewardEntry);
        const maxEntries = 6;
        while (this.rewardEntries.length > maxEntries) {
            const removed = this.rewardEntries.pop();
            removed?.node.destroy();
        }
        if (rewardEntry.isPack) {
            entry.on(Node.EventType.MOUSE_ENTER, (event: EventMouse) => {
                if (!rewardEntry.detail) return;
                this.updatePointerFromEvent(event);
                this.queueTooltip(rewardEntry);
            }, this);
            entry.on(Node.EventType.MOUSE_LEAVE, () => {
                if (this.hoverEntry === rewardEntry) {
                    this.hideTooltip();
                }
            }, this);
        }
        this.layoutRewardEntries();
    }

    private layoutRewardEntries(): void {
        if (!this.rewardListRoot) return;
        const listSize = this.rewardListRoot.getComponent(UITransform)?.contentSize;
        if (!listSize) return;
        const top = listSize.height / 2 - 16;
        const gap = 6;
        this.rewardEntries.forEach((entry, index) => {
            const y = top - index * (30 + gap);
            entry.node.setPosition(0, y, 0);
        });
    }

    private queueTooltip(entry: RewardEntry): void {
        this.clearTooltipTimer();
        this.hoverEntry = entry;
        this.hoverTimer = () => {
            if (this.hoverEntry !== entry) return;
            this.showTooltip(entry.detail ?? '');
        };
        this.scheduleOnce(this.hoverTimer, 0.2);
    }

    private clearTooltipTimer(): void {
        if (!this.hoverTimer) return;
        this.unschedule(this.hoverTimer);
        this.hoverTimer = null;
    }

    private showTooltip(text: string): void {
        if (!this.tooltipNode || !this.tooltipLabel) return;
        if (!text) return;
        this.tooltipLabel.string = text;
        this.tooltipNode.active = true;
        this.tooltipNode.setSiblingIndex(9999);
        this.tooltipVisible = true;
        this.positionTooltip(this.pointerLocal);
    }

    private hideTooltip(): void {
        this.clearTooltipTimer();
        this.hoverEntry = null;
        if (this.tooltipNode) {
            this.tooltipNode.active = false;
        }
        this.tooltipVisible = false;
    }

    private onPanelMouseMove(event: EventMouse): void {
        this.updatePointerFromEvent(event);
        if (this.tooltipVisible) {
            this.positionTooltip(this.pointerLocal);
        }
    }

    private onPanelMouseLeave(): void {
        this.hideTooltip();
    }

    private updatePointerFromEvent(event: EventMouse): void {
        if (!this.container) return;
        const location = event.getLocation();
        const local = this.screenToLocal(this.container, location.x, location.y);
        if (local) {
            this.pointerLocal = local;
        }
    }

    private positionTooltip(localPos: Vec3): void {
        if (!this.tooltipNode || !this.container) return;
        const tooltipSize = this.tooltipNode.getComponent(UITransform)?.contentSize;
        const panelSize = this.container.getComponent(UITransform)?.contentSize;
        if (!tooltipSize || !panelSize) return;
        const offset = 18;
        let x = localPos.x + offset;
        let y = localPos.y + offset;
        const halfW = panelSize.width / 2;
        const halfH = panelSize.height / 2;
        x = Math.min(halfW - tooltipSize.width / 2 - 6, Math.max(-halfW + tooltipSize.width / 2 + 6, x));
        y = Math.min(halfH - tooltipSize.height / 2 - 6, Math.max(-halfH + tooltipSize.height / 2 + 6, y));
        this.tooltipNode.setPosition(x, y, 0);
    }

    private updateHint(text: string): void {
        if (!this.hintLabel) return;
        this.hintLabel.string = text;
    }

    private drawTarget(gfx: Graphics, config: RingTossTargetConfig, size: { width: number; height: number }): void {
        gfx.clear();
        const mainColor = this.getTargetColor(config);
        const width = size.width;
        const height = size.height;
        const radius = Math.min(width, height) * 0.2;
        gfx.fillColor = new Color(mainColor.r, mainColor.g, mainColor.b, 120);
        gfx.strokeColor = mainColor;
        gfx.lineWidth = 3;
        gfx.roundRect(-width / 2, -height / 2, width, height, radius);
        gfx.fill();
        gfx.roundRect(-width / 2, -height / 2, width, height, radius);
        gfx.stroke();
        gfx.strokeColor = new Color(255, 255, 255, 120);
        gfx.lineWidth = 1;
        gfx.roundRect(-width / 2 + 6, -height / 2 + 6, width - 12, height * 0.35, radius * 0.6);
        gfx.stroke();
        const capHeight = height * 0.22;
        gfx.fillColor = new Color(
            Math.min(255, mainColor.r + 40),
            Math.min(255, mainColor.g + 40),
            Math.min(255, mainColor.b + 40),
            160
        );
        gfx.roundRect(-width / 2 + 6, height / 2 - capHeight - 4, width - 12, capHeight, radius * 0.6);
        gfx.fill();
    }

    private getTargetColor(config: RingTossTargetConfig): Color {
        switch (config.rewardType) {
            case 'jackpot':
                return new Color(245, 190, 255, 255);
            case 'cash_large':
                return new Color(255, 210, 140, 255);
            case 'cash_mid':
                return new Color(230, 190, 120, 255);
            case 'cash_small':
                return new Color(200, 180, 150, 255);
            case 'mix_large':
                return new Color(130, 190, 200, 255);
            case 'mix_mid':
                return new Color(110, 180, 160, 255);
            case 'meat_mid':
                return new Color(200, 120, 100, 255);
            case 'veg_small':
                return new Color(120, 200, 140, 255);
            default:
                return new Color(200, 200, 200, 255);
        }
    }

    private getTargetBaseSize(config: RingTossTargetConfig): { width: number; height: number } {
        const base = config.radius;
        const jackpotScale = config.rewardType === 'jackpot' ? 0.85 : 1;
        return {
            width: base * 0.95 * jackpotScale,
            height: config.rewardType === 'jackpot' ? 132 : 120,
        };
    }

    private getTargetGroundRadius(config: RingTossTargetConfig): number {
        const size = this.getTargetBaseSize(config);
        const hitScale = 0.95;
        return (size.width * hitScale) / 2;
    }

    private getTargetScreenSize(config: RingTossTargetConfig, groundPos: Vec3): { width: number; height: number } {
        const base = this.getTargetBaseSize(config);
        const depthScale = this.getDepthScale(groundPos.y);
        const scale = depthScale * this.playScale;
        return {
            width: base.width * scale,
            height: base.height * scale,
        };
    }

    private updateRingBaseRadius(): void {
        const maxWidth = RING_TOSS_CONFIG.targets.reduce((acc, config) => {
            const size = this.getTargetBaseSize(config);
            return Math.max(acc, size.width);
        }, 0);
        const ringWidthFactor = 2.4;
        const safeRatio = 1.2;
        this.ringBaseRadius = Math.max(18, (maxWidth * safeRatio) / ringWidthFactor) * 1.2;
    }

    private selectCount(count: number): void {
        if (this.remainingThrows > 0 || this.isThrowing) {
            this.setResult('本轮进行中，无法切换圈数', new Color(200, 170, 120, 255));
            return;
        }
        this.selectedCount = count;
        this.updateStatus();
        this.updateSelectionVisuals();
        this.updateStartButtonState();
        this.setResult('已选择圈数，点击开始投圈');
    }

    private startRound(): void {
        if (this.remainingThrows > 0 || this.isThrowing) {
            return;
        }
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        const totalCost = this.getPackCost(this.selectedCount);
        if (!inventory.spendMoney(totalCost)) {
            this.setResult('金币不足，无法投圈', new Color(200, 120, 120, 255));
            this.updateWallet();
            this.updateStatus();
            return;
        }

        this.remainingThrows = this.selectedCount;
        this.updateWallet();
        this.updateRound();
        this.updateStatus();
        this.updateSelectionVisuals();
        this.updateStartButtonState();
        this.setResult('开始投圈！拖拽瞄准，按住蓄力投掷', new Color(240, 220, 200, 255));
        this.updateHint('拖拽调整方向，按住蓄力，松手投出（甜蜜点更稳）');
    }

    private updateSelectionVisuals(): void {
        const counts = [1, 3, 5];
        const wallet = this.getWallet();
        this.selectButtons.forEach((button, index) => {
            const active = this.selectedCount === counts[index];
            const cost = this.getPackCost(counts[index]);
            const disabled = this.remainingThrows > 0 || this.isThrowing || wallet < cost;
            this.drawButton(button, active, disabled);
            const btnComp = this.selectButtonComps[index];
            if (btnComp) {
                btnComp.interactable = !disabled;
            }
        });
    }

    private updateStartButtonState(): void {
        if (this.startButton) {
            const canAfford = this.getWallet() >= this.getPackCost(this.selectedCount);
            const disabled = this.remainingThrows > 0 || this.isThrowing || !canAfford;
            this.startButton.interactable = !disabled;
            this.drawButton(this.startButton.node, true, disabled);
        }
        if (this.startButtonLabel) {
            if (this.remainingThrows > 0) {
                this.startButtonLabel.string = '投圈中';
            } else if (this.getWallet() < this.getPackCost(this.selectedCount)) {
                this.startButtonLabel.string = '余额不足';
            } else {
                this.startButtonLabel.string = '开始投圈';
            }
        }
    }

    private onTouchStart(event: EventTouch): void {
        if (!this.canThrow()) return;
        this.isDragging = true;
        this.currentPower = 0;
        this.chargeLocked = false;
        this.updateAimFromEvent(event);
        this.updateHint('按住蓄力，松手投出（力度甜蜜点更稳）');
    }

    private onTouchMove(event: EventTouch): void {
        if (!this.isDragging || !this.canThrow()) return;
        this.updateAimFromEvent(event);
    }

    private onTouchEnd(event: EventTouch): void {
        if (!this.isDragging || !this.canThrow()) return;
        this.updateAimFromEvent(event);
        this.isDragging = false;
        this.chargeLocked = false;
        this.throwRing();
    }

    private onTouchCancel(event: EventTouch): void {
        if (!this.isDragging) return;
        this.isDragging = false;
        this.chargeLocked = false;
        this.clearAim();
        this.updateHint('拖拽调整方向，按住蓄力，松手投出');
    }

    private updateAimFromEvent(event: EventTouch | EventMouse): void {
        if (!this.playArea) return;
        const location = event.getLocation();
        const local = this.screenToLocal(this.playArea, location.x, location.y);
        if (!local) return;
        const ground = this.unprojectToGround(local);
        const launch = new Vec3(RING_TOSS_CONFIG.launchLocal.x, RING_TOSS_CONFIG.launchLocal.y, 0);
        const drag = new Vec3(ground.x - launch.x, ground.y - launch.y, 0);
        const dist = Math.max(1, Math.sqrt(drag.x * drag.x + drag.y * drag.y));
        const maxDist = RING_TOSS_CONFIG.maxDragDistance;
        const clampRatio = Math.min(dist, maxDist) / dist;
        const aim = new Vec3(launch.x + drag.x * clampRatio, launch.y + drag.y * clampRatio, 0);
        this.currentAimLocal = aim;
        this.refreshAimVisuals();
    }

    private drawAimLine(start: Vec3, end: Vec3, landing: Vec3, power: number): void {
        if (!this.aimRoot) return;
        if (!this.aimLine) {
            this.aimLine = this.aimRoot.getComponent(Graphics) || this.aimRoot.addComponent(Graphics);
        }
        const gfx = this.aimLine;
        const startScreen = this.projectToScreen(start);
        const endScreen = this.projectToScreen(end);
        const landingScreen = this.projectToScreen(landing);
        const rowScale = this.getRowDifficultyScale(end.y);
        const windJitter = this.getWindOffset(true, rowScale);
        const distanceFactor = Math.min(1, power * 1.2);
        const endScale = this.getDepthScale(end.y) * this.playScale;
        const jitterStrength = (3 + 10 * distanceFactor) * (0.35 + this.windStrength * 0.6) * endScale;
        const jitterX = windJitter.x * endScale * (0.6 + distanceFactor)
            + Math.sin(this.windTime * 8 + this.windSeed) * jitterStrength;
        const jitterY = Math.cos(this.windTime * 6 + this.windSeed) * jitterStrength * 0.6;
        const endJitter = new Vec3(
            endScreen.x + jitterX,
            endScreen.y + jitterY,
            0
        );
        gfx.clear();
        gfx.lineWidth = 3;
        gfx.strokeColor = new Color(255, 220, 160, 220);
        gfx.moveTo(startScreen.x, startScreen.y);
        gfx.lineTo(endJitter.x, endJitter.y);
        gfx.stroke();
        gfx.fillColor = new Color(255, 220, 160, 120);
        gfx.circle(endJitter.x, endJitter.y, 8 + power * 6);
        gfx.fill();
        this.drawTrajectory(startScreen, landingScreen, power, landing.y);
    }

    private clearAim(): void {
        if (this.aimLine) {
            this.aimLine.clear();
        }
        if (this.trajectoryGfx) {
            this.trajectoryGfx.clear();
        }
        this.updatePowerBar(0);
        this.currentLandingLocal = null;
    }

    private computeLanding(start: Vec3, aim: Vec3, power: number, useJitter: boolean = false): Vec3 {
        const dir = new Vec3(aim.x - start.x, aim.y - start.y, 0);
        const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        if (dist <= 0.1) {
            return start.clone();
        }
        const norm = new Vec3(dir.x / dist, dir.y / dist, 0);
        const clampedPower = Math.max(power, RING_TOSS_CONFIG.minPower);
        const minRange = RING_TOSS_CONFIG.minRange;
        const maxRange = RING_TOSS_CONFIG.maxRange;
        const range = minRange + clampedPower * (maxRange - minRange);
        let landing = new Vec3(start.x + norm.x * range, start.y + norm.y * range, 0);
        if (useJitter) {
            const difficulty = RING_TOSS_CONFIG.difficulty;
            const depthT = this.getDepthT(landing.y);
            const deviation = this.getPowerDeviation01(clampedPower);
            const devCurve = Math.pow(deviation, 1 + (difficulty.jitterCurve ?? 0.6));
            const baseRangeNoise = 1.2 + 7 * depthT;
            const rangeNoise = (Math.random() * 2 - 1) * baseRangeNoise * (0.2 + 0.8 * devCurve);
            landing = new Vec3(landing.x + norm.x * rangeNoise, landing.y + norm.y * rangeNoise, 0);
            landing = this.applyLandingJitter(landing, clampedPower);
        }
        return this.clampToGround(landing);
    }

    private drawTrajectory(start: Vec3, landing: Vec3, power: number, landingGroundY: number): void {
        if (!this.aimRoot) return;
        if (!this.trajectoryGfx) {
            const node = this.aimRoot.getChildByName('Trajectory') ?? new Node('Trajectory');
            if (!node.parent) {
                this.aimRoot.addChild(node);
            }
            this.trajectoryGfx = node.getComponent(Graphics) || node.addComponent(Graphics);
        }
        const gfx = this.trajectoryGfx;
        gfx.clear();
        const depthScale = this.getDepthScale(landingGroundY) * this.playScale;
        const arcHeight = (RING_TOSS_CONFIG.arcHeightMin * depthScale)
            + power * ((RING_TOSS_CONFIG.arcHeightMax - RING_TOSS_CONFIG.arcHeightMin) * depthScale);
        const control = new Vec3(
            (start.x + landing.x) * 0.5,
            (start.y + landing.y) * 0.5 + arcHeight,
            0
        );
        const rowScale = this.getRowDifficultyScale(landingGroundY);
        const windJitter = this.getWindOffset(true, rowScale);
        const jitter = new Vec3(
            windJitter.x * 0.2 + Math.sin(this.windTime * 6 + this.windSeed) * 4 * depthScale,
            Math.cos(this.windTime * 4 + this.windSeed) * 3 * depthScale,
            0
        );
        gfx.fillColor = new Color(255, 220, 160, 160);
        const steps = 12;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const inv = 1 - t;
            const x = inv * inv * start.x + 2 * inv * t * control.x + t * t * landing.x + jitter.x * t;
            const y = inv * inv * start.y + 2 * inv * t * control.y + t * t * landing.y + jitter.y * t;
            gfx.circle(x, y, i === steps ? 6 : 3.2);
            gfx.fill();
        }
    }

    private refreshAimVisuals(): void {
        if (!this.playArea || !this.isDragging) return;
        const launch = new Vec3(RING_TOSS_CONFIG.launchLocal.x, RING_TOSS_CONFIG.launchLocal.y, 0);
        const throwPower = this.getThrowPower();
        const baseLanding = this.computeLanding(launch, this.currentAimLocal, throwPower, false);
        const previewLanding = this.clampToGround(this.applyWindOffset(baseLanding, true));
        this.currentLandingLocal = previewLanding;
        this.drawAimLine(launch, this.currentAimLocal, previewLanding, throwPower);
        this.updatePowerBar(this.currentPower);
    }

    private throwRing(): void {
        if (!this.playArea || !this.ringsRoot) return;
        if (this.remainingThrows <= 0 || this.isThrowing) {
            this.clearAim();
            return;
        }
        const launch = new Vec3(RING_TOSS_CONFIG.launchLocal.x, RING_TOSS_CONFIG.launchLocal.y, 0);
        const dir = new Vec3(this.currentAimLocal.x - launch.x, this.currentAimLocal.y - launch.y, 0);
        const dist = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
        if (dist <= 0.1) {
            this.clearAim();
            return;
        }
        const power = this.getThrowPower();
        const baseLanding = this.computeLanding(launch, this.currentAimLocal, power, true);
        const landing = this.clampToGround(this.applyWindOffset(baseLanding, true));
        const landingScreen = this.projectToScreen(landing);
        const ringScale = this.getRingScale(landing.y, power);
        const ringRadiusScreen = Math.max(12, this.ringBaseRadius) * ringScale;
        const ringGroundRadius = this.getRingGroundRadius(landing.y);
        this.currentPower = 0;
        this.chargeLocked = false;

        this.remainingThrows -= 1;
        this.updateRound();
        this.updateStartButtonState();
        this.clearAim();
        this.isThrowing = true;
        this.updateHint('飞行中...');

        this.animateRingThrow(launch, landing, power, (ring, landingScreen) => {
            this.isThrowing = false;
            const candidate = this.pickHitTarget(landing, landingScreen, ringGroundRadius, ringRadiusScreen);
            let nextHint = '';
            if (candidate?.overlap === 'contained') {
                const hitQuality = this.getHitQuality(candidate);
                const isJackpotTarget = candidate.target.config.rewardType === 'jackpot';
                if (this.shouldEdgeSlip(candidate, hitQuality, power)) {
                    this.setResult('晃了两下又滑落', new Color(200, 175, 140, 255));
                    this.addRewardEntry('晃了两下又滑落');
                    nextHint = `${this.getPowerAdvice(power)}，手感已经很接近了`;
                    this.highlightTarget(candidate.target.node);
                    this.playHitImpact(ring, false, true);
                    this.playEdgeSlip(ring, landingScreen, isJackpotTarget);
                    this.playSfx(this.missSfxPath);
                    this.missStreak += 1;
                }
                else {
                    const reward = this.applyRewardByType(candidate.target.config);
                    const qualityLabel = hitQuality === 'perfect' ? '稳稳套中' : hitQuality === 'edge' ? '边缘套中' : '套中';
                    if (reward.isPack) {
                        this.setResult(`命中${candidate.target.config.label}（${qualityLabel}，移到礼包上查看内容）`, new Color(230, 210, 190, 255));
                    } else {
                        this.setResult(`命中${candidate.target.config.label}：${reward.summary}（${qualityLabel}）`, reward.isJackpot ? new Color(255, 220, 170, 255) : undefined);
                    }
                    const entryText = reward.isPack ? reward.summary : reward.summary;
                    this.addRewardEntry(entryText, { isPack: reward.isPack, detail: reward.detail, highlight: reward.isJackpot });
                    if (reward.cash) {
                        this.playMoneyGain(landingScreen, reward.cash);
                    }
                    this.highlightTarget(candidate.target.node);
                    this.playHitImpact(ring, reward.isJackpot, true);
                    this.playHitSettle(ring, hitQuality, reward.isJackpot);
                    if (reward.isJackpot) {
                        this.showJackpotFlash();
                        this.playSfx(this.jackpotSfxPath);
                    } else {
                        this.playSfx(this.hitSfxPath);
                    }
                    this.missStreak = 0;
                }
            } else {
                if (candidate?.overlap === 'hook') {
                    const nearMiss = candidate.edgeRatio <= 0.35;
                    if (nearMiss) {
                        this.setResult('差一点就中', new Color(210, 185, 150, 255));
                        this.addRewardEntry('差一点就中');
                        nextHint = `${this.getPowerAdvice(power)}，就差一点`;
                    } else {
                        this.setResult('擦边挂住又滑落', new Color(200, 175, 140, 255));
                        this.addRewardEntry('擦边挂住又滑落');
                        nextHint = `${this.getPowerAdvice(power)}，再稳一点`;
                    }
                    this.playMissBounce(ring, landingScreen, true, nearMiss ? 'near' : 'graze');
                } else if (candidate) {
                    this.setResult('擦边滑落', new Color(190, 170, 140, 255));
                    this.addRewardEntry('擦边滑落');
                    nextHint = `${this.getPowerAdvice(power)}，再调一点方向`;
                    this.playMissBounce(ring, landingScreen, true, 'graze');
                } else {
                    this.setResult('差得有点远', new Color(170, 160, 150, 255));
                    this.addRewardEntry('差得有点远');
                    nextHint = `${this.getPowerAdvice(power)}，注意风力条`;
                    this.playMissBounce(ring, landingScreen, false, 'far');
                }
                this.playSfx(this.missSfxPath);
                this.missStreak += 1;
            }
            this.updateWallet();
            this.updateStatus();
            this.checkRoundEnd();
            if (this.remainingThrows > 0) {
                this.updateHint(nextHint || '继续拖拽瞄准，按住蓄力投下一圈');
            }
        });
    }

    private animateRingThrow(start: Vec3, landing: Vec3, power: number, onComplete: (ring: Node, landingScreen: Vec3) => void): void {
        if (!this.ringsRoot) return;
        const startScreen = this.projectToScreen(start);
        const landingScreen = this.projectToScreen(landing);
        const startScale = this.getRingScale(start.y, power);
        const endScale = this.getRingScale(landing.y, power);
        const ring = new Node('Ring');
        const ringRadius = Math.max(18, this.ringBaseRadius);
        const ringSize = ringRadius * 2 + 12;
        this.ensureUITransform(ring, ringSize, ringSize);
        const gfx = ring.addComponent(Graphics);
        gfx.lineWidth = 4;
        gfx.strokeColor = new Color(255, 220, 160, 255);
        gfx.ellipse(0, 0, ringRadius * 1.2, ringRadius * 0.7);
        gfx.stroke();
        gfx.strokeColor = new Color(120, 80, 40, 255);
        gfx.lineWidth = 2;
        gfx.ellipse(0, 0, ringRadius * 1.2, ringRadius * 0.7);
        gfx.stroke();
        ring.addComponent(UIOpacity).opacity = 255;
        ring.setPosition(startScreen);
        ring.setScale(startScale, startScale * 0.92, 1);
        this.ringsRoot.addChild(ring);

        const arcHeight = (RING_TOSS_CONFIG.arcHeightMin * endScale)
            + power * ((RING_TOSS_CONFIG.arcHeightMax - RING_TOSS_CONFIG.arcHeightMin) * endScale);
        const mid = new Vec3(
            (startScreen.x + landingScreen.x) * 0.5,
            (startScreen.y + landingScreen.y) * 0.5 + arcHeight,
            0
        );
        const landingBounce = new Vec3(landingScreen.x, landingScreen.y + 6 * endScale, 0);
        tween(ring)
            .to(0.18, { position: mid, scale: new Vec3(startScale * 1.02, startScale * 0.98, 1) }, { easing: 'quadOut' })
            .to(0.22, { position: landingScreen, scale: new Vec3(endScale, endScale, 1) }, { easing: 'quadIn' })
            .to(0.06, { position: landingBounce, scale: new Vec3(endScale * 1.02, endScale * 0.98, 1) }, { easing: 'quadOut' })
            .to(0.08, { position: landingScreen, scale: new Vec3(endScale, endScale, 1) }, { easing: 'quadIn' })
            .call(() => onComplete(ring, landingScreen))
            .start();
    }

    private pickHitTarget(landingGround: Vec3, landingScreen: Vec3, ringGroundRadius: number, ringRadiusScreen: number): HitCandidate | null {
        let bestContained: HitCandidate | null = null;
        let bestHook: HitCandidate | null = null;
        let bestAxis: HitCandidate | null = null;
        let bestContainedDist = Number.POSITIVE_INFINITY;
        let bestContainedValue = -1;
        let bestHookRatio = Number.POSITIVE_INFINITY;
        let bestHookValue = -1;
        let bestAxisDist = Number.POSITIVE_INFINITY;
        let bestAxisValue = -1;

        const ringRx = ringRadiusScreen * 1.2;
        const ringRy = ringRadiusScreen * 0.7;
        const containRx = ringRx * 1.1;
        const containRy = ringRy * 1.1;
        const baseAxisThreshold = ringRadiusScreen * 0.18;
        if (ringRx <= 0 || ringRy <= 0) return null;

        this.targets.forEach((target) => {
            const targetRadius = this.getTargetGroundRadius(target.config);
            const dxGround = landingGround.x - target.groundPos.x;
            const dyGround = landingGround.y - target.groundPos.y;
            const distGround = Math.sqrt(dxGround * dxGround + dyGround * dyGround);
            const containThreshold = ringGroundRadius - targetRadius;

            const center = this.projectToScreen(target.groundPos);
            const size = this.getTargetScreenSize(target.config, target.groundPos);
            const hitScale = 0.95;
            const halfW = (size.width * hitScale) / 2;
            const halfH = (size.height * hitScale) / 2;
            const axisThreshold = Math.max(3, Math.min(baseAxisThreshold, halfW * 0.25));
            const tier = this.getTargetTier(target.config);
            const axisContainFactor = tier === 'easy' ? 0.78 : tier === 'mid' ? 0.62 : tier === 'hard' ? 0.52 : 0.42;
            const axisContainThreshold = axisThreshold * axisContainFactor;
            const axisTop = new Vec3(center.x, center.y + halfH, 0);
            const axisDx = landingScreen.x - axisTop.x;
            const axisDy = landingScreen.y - axisTop.y;
            const axisDist = Math.sqrt(axisDx * axisDx + axisDy * axisDy);
            if (axisDist <= axisThreshold) {
                const value = target.config.value;
                if (axisDist <= axisContainThreshold && (tier !== 'jackpot' || distGround <= containThreshold)) {
                    const edgeRatio = Math.min(1, axisDist / Math.max(axisContainThreshold, 1));
                    if (axisDist < bestAxisDist - 0.5) {
                        bestAxis = { target, edgeRatio, overlap: 'contained' };
                        bestAxisDist = axisDist;
                        bestAxisValue = value;
                    } else if (Math.abs(axisDist - bestAxisDist) <= 0.5 && value > bestAxisValue) {
                        bestAxis = { target, edgeRatio, overlap: 'contained' };
                        bestAxisDist = axisDist;
                        bestAxisValue = value;
                    }
                } else {
                    const overlapRatio = Math.min(1, axisDist / Math.max(axisThreshold, 1));
                    const edgeRatio = overlapRatio;
                    if (overlapRatio < bestHookRatio - 0.02) {
                        bestHook = { target, edgeRatio, overlap: 'hook' };
                        bestHookRatio = overlapRatio;
                        bestHookValue = value;
                    } else if (Math.abs(overlapRatio - bestHookRatio) <= 0.02 && value > bestHookValue) {
                        bestHook = { target, edgeRatio, overlap: 'hook' };
                        bestHookRatio = overlapRatio;
                        bestHookValue = value;
                    }
                }
            }

            if (distGround <= containThreshold) {
                const edgeRatio = containThreshold <= 0 ? 0 : Math.min(1, distGround / containThreshold);
                const value = target.config.value;
                if (target.config.rewardType === 'jackpot' && axisDist > axisContainThreshold) {
                    // Jackpot requires closer axis alignment; otherwise treat as hook.
                } else {
                if (distGround < bestContainedDist - 0.5) {
                    bestContained = { target, edgeRatio, overlap: 'contained' };
                    bestContainedDist = distGround;
                    bestContainedValue = value;
                    return;
                }
                if (Math.abs(distGround - bestContainedDist) <= 0.5 && value > bestContainedValue) {
                    bestContained = { target, edgeRatio, overlap: 'contained' };
                    bestContainedDist = distGround;
                    bestContainedValue = value;
                }
                return;
                }
            }

            const corners = [
                { x: center.x - halfW, y: center.y - halfH },
                { x: center.x + halfW, y: center.y - halfH },
                { x: center.x - halfW, y: center.y + halfH },
                { x: center.x + halfW, y: center.y + halfH },
            ];
            let maxCornerRatio = 0;
            for (const corner of corners) {
                const dx = corner.x - landingScreen.x;
                const dy = corner.y - landingScreen.y;
                const ratio = (dx * dx) / (containRx * containRx) + (dy * dy) / (containRy * containRy);
                if (ratio > maxCornerRatio) {
                    maxCornerRatio = ratio;
                }
            }
            if (maxCornerRatio <= 1) {
                const edgeRatio = Math.min(1, Math.sqrt(maxCornerRatio));
                const value = target.config.value;
                const overlapRatio = 0;
                if (overlapRatio < bestHookRatio - 0.02) {
                    bestHook = { target, edgeRatio, overlap: 'hook' };
                    bestHookRatio = overlapRatio;
                    bestHookValue = value;
                    return;
                }
                if (Math.abs(overlapRatio - bestHookRatio) <= 0.02 && value > bestHookValue) {
                    bestHook = { target, edgeRatio, overlap: 'hook' };
                    bestHookRatio = overlapRatio;
                    bestHookValue = value;
                }
                return;
            }

            const rectMinX = center.x - halfW;
            const rectMaxX = center.x + halfW;
            const rectMinY = center.y - halfH;
            const rectMaxY = center.y + halfH;
            const closestX = Math.max(rectMinX, Math.min(rectMaxX, landingScreen.x));
            const closestY = Math.max(rectMinY, Math.min(rectMaxY, landingScreen.y));
            const dx = closestX - landingScreen.x;
            const dy = closestY - landingScreen.y;
            const overlapRatio = (dx * dx) / (ringRx * ringRx) + (dy * dy) / (ringRy * ringRy);
            if (overlapRatio > 1) return;

            const edgeRatio = Math.min(1, Math.sqrt(overlapRatio));
            const value = target.config.value;
            if (overlapRatio < bestHookRatio - 0.02) {
                bestHook = { target, edgeRatio, overlap: 'hook' };
                bestHookRatio = overlapRatio;
                bestHookValue = value;
                return;
            }
            if (Math.abs(overlapRatio - bestHookRatio) <= 0.02 && value > bestHookValue) {
                bestHook = { target, edgeRatio, overlap: 'hook' };
                bestHookRatio = overlapRatio;
                bestHookValue = value;
            }
        });

        return bestAxis ?? bestContained ?? bestHook;
    }

    private highlightTarget(node: Node): void {
        tween(node)
            .to(0.08, { scale: new Vec3(1.08, 1.08, 1) })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private getHitQuality(candidate: HitCandidate): 'perfect' | 'solid' | 'edge' {
        if (candidate.edgeRatio <= 0.3) return 'perfect';
        if (candidate.edgeRatio >= 0.75) return 'edge';
        return 'solid';
    }

    private shouldEdgeSlip(candidate: HitCandidate, quality: 'perfect' | 'solid' | 'edge', power: number): boolean {
        if (quality !== 'edge') return false;
        const tier = this.getTargetTier(candidate.target.config);
        if (tier === 'easy') return false;
        const depthT = this.getDepthT(candidate.target.groundPos.y);
        const deviation = this.getPowerDeviation01(power);
        const edge = Math.max(0, Math.min(1, candidate.edgeRatio));
        const base = tier === 'mid' ? 0.18 : tier === 'hard' ? 0.32 : 0.55;
        const chance = base * (0.55 + 0.55 * depthT) * (0.65 + 0.75 * deviation) * (0.6 + 0.6 * edge);
        const pity = Math.min(0.22, this.missStreak * 0.06);
        return Math.random() < Math.max(0, chance - pity);
    }

    private playEdgeSlip(ring: Node, landing: Vec3, isJackpot: boolean): void {
        const ringOpacity = ring.getComponent(UIOpacity) || ring.addComponent(UIOpacity);
        const basePos = ring.getPosition().clone();
        const baseScale = ring.scale.clone();
        const wobble = isJackpot ? 30 : 22;
        const hold = 0.1;
        const offsetX = (Math.random() > 0.5 ? 1 : -1) * ((14 + Math.random() * 8) * this.playScale);
        const offsetY = -(10 + Math.random() * 8) * this.playScale;
        tween(ring)
            .to(0.1, {
                position: new Vec3(basePos.x, basePos.y + 5 * this.playScale, 0),
                scale: new Vec3(baseScale.x * 1.02, baseScale.y * 0.98, 1),
            }, { easing: 'quadOut' })
            .delay(hold)
            .by(0.12, { eulerAngles: new Vec3(0, 0, wobble) }, { easing: 'quadInOut' })
            .by(0.14, { eulerAngles: new Vec3(0, 0, -wobble * 1.15) }, { easing: 'quadInOut' })
            .to(0.22, { position: new Vec3(basePos.x + offsetX, basePos.y + offsetY, 0), scale: new Vec3(baseScale.x * 0.98, baseScale.y * 0.98, 1) }, { easing: 'quadIn' })
            .start();
        tween(ringOpacity)
            .delay(hold + 0.28)
            .to(0.18, { opacity: 0 })
            .call(() => ring.destroy())
            .start();
    }

    private getTargetTier(config: RingTossTargetConfig): 'easy' | 'mid' | 'hard' | 'jackpot' {
        switch (config.rewardType) {
            case 'cash_small':
            case 'veg_small':
                return 'easy';
            case 'cash_mid':
            case 'meat_mid':
            case 'mix_mid':
                return 'mid';
            case 'cash_large':
            case 'mix_large':
                return 'hard';
            case 'jackpot':
            default:
                return 'jackpot';
        }
    }

    private getRowTier(groundY: number): 'front' | 'middle' | 'back' {
        const t = this.getDepthT(groundY);
        if (t < 0.34) return 'front';
        if (t < 0.67) return 'middle';
        return 'back';
    }

    private getRowDifficultyScale(groundY: number): number {
        const tier = this.getRowTier(groundY);
        const scaleMap = RING_TOSS_CONFIG.difficulty.rowDifficultyScale;
        return scaleMap?.[tier] ?? 1;
    }

    private playHitImpact(ring: Node, isJackpot: boolean, keepRing: boolean = false): void {
        const impact = new Node('Impact');
        const impactSize = Math.max(60, 80 * this.playScale);
        const impactRadius = Math.max(14, 18 * this.playScale);
        this.ensureUITransform(impact, impactSize, impactSize);
        const gfx = impact.addComponent(Graphics);
        const color = isJackpot ? new Color(255, 215, 140, 255) : new Color(255, 230, 190, 255);
        gfx.strokeColor = color;
        gfx.lineWidth = isJackpot ? 4 : 3;
        gfx.circle(0, 0, impactRadius);
        gfx.stroke();
        const opacity = impact.addComponent(UIOpacity);
        opacity.opacity = 220;
        impact.setPosition(ring.getPosition());
        this.ringsRoot?.addChild(impact);

        tween(impact)
            .to(0.2, { scale: new Vec3(1.6, 1.6, 1) }, { easing: 'quadOut' })
            .call(() => impact.destroy())
            .start();
        tween(opacity)
            .to(0.2, { opacity: 0 })
            .start();

        if (keepRing) {
            return;
        }

        const ringOpacity = ring.getComponent(UIOpacity) || ring.addComponent(UIOpacity);
        tween(ring)
            .to(0.12, { scale: new Vec3(0.92, 0.92, 1) })
            .start();
        tween(ringOpacity)
            .delay(0.25)
            .to(0.2, { opacity: 0 })
            .call(() => ring.destroy())
            .start();
    }

    private playHitSettle(ring: Node, quality: 'perfect' | 'solid' | 'edge', isJackpot: boolean): void {
        const ringOpacity = ring.getComponent(UIOpacity) || ring.addComponent(UIOpacity);
        const baseScale = ring.scale.clone();
        const basePos = ring.getPosition().clone();
        const lift = (quality === 'perfect' ? 6 : 4) * this.playScale;
        const scaleUp = quality === 'perfect' ? 1.06 : quality === 'edge' ? 1.02 : 1.04;
        const wobble = quality === 'edge' ? 20 : 10;
        const hold = quality === 'perfect' ? 0.45 : 0.32;

        tween(ring)
            .to(0.08, {
                position: new Vec3(basePos.x, basePos.y + lift, 0),
                scale: new Vec3(baseScale.x * scaleUp, baseScale.y * scaleUp, 1),
            }, { easing: 'quadOut' })
            .to(0.12, { position: basePos, scale: baseScale }, { easing: 'quadIn' })
            .start();

        tween(ring)
            .by(0.12, { eulerAngles: new Vec3(0, 0, wobble) }, { easing: 'quadInOut' })
            .by(0.14, { eulerAngles: new Vec3(0, 0, -wobble * 0.8) }, { easing: 'quadInOut' })
            .start();

        tween(ringOpacity)
            .delay(hold + (isJackpot ? 0.08 : 0))
            .to(0.22, { opacity: 0 })
            .call(() => ring.destroy())
            .start();
    }

    private playMoneyGain(landing: Vec3, amount: number): void {
        if (!this.container || !this.walletLabel || !this.playArea) return;
        const containerTransform = this.container.getComponent(UITransform);
        const playTransform = this.playArea.getComponent(UITransform);
        const walletTransform = this.walletLabel.node.getComponent(UITransform);
        if (!containerTransform || !playTransform || !walletTransform) return;

        const worldStart = playTransform.convertToWorldSpaceAR(landing);
        const worldEnd = walletTransform.convertToWorldSpaceAR(new Vec3());
        const startLocal = containerTransform.convertToNodeSpaceAR(worldStart);
        const endLocal = containerTransform.convertToNodeSpaceAR(worldEnd);

        const fly = new Node('MoneyFly');
        this.ensureUITransform(fly, 120, 30);
        const label = fly.addComponent(Label);
        label.string = `+￥${amount}`;
        label.fontSize = 18;
        label.color = new Color(255, 220, 150, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        const opacity = fly.addComponent(UIOpacity);
        opacity.opacity = 255;
        fly.setPosition(startLocal);
        this.container.addChild(fly);
        fly.setSiblingIndex(9998);

        const mid = new Vec3(
            (startLocal.x + endLocal.x) * 0.5,
            Math.max(startLocal.y, endLocal.y) + 60,
            0
        );
        tween(fly)
            .to(0.2, { position: mid }, { easing: 'quadOut' })
            .to(0.25, { position: endLocal }, { easing: 'quadIn' })
            .call(() => fly.destroy())
            .start();
        tween(opacity)
            .delay(0.25)
            .to(0.2, { opacity: 0 })
            .start();
        this.pulseWallet();
    }

    private pulseWallet(): void {
        const walletNode = this.walletLabel?.node?.parent;
        if (!walletNode) return;
        tween(walletNode)
            .to(0.08, { scale: new Vec3(1.06, 1.06, 1) })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private playMissBounce(ring: Node, landing: Vec3, isSlide: boolean = false, tier: 'near' | 'graze' | 'far' = 'graze'): void {
        const base = tier === 'far' ? 16 : tier === 'near' ? 5 : 10;
        const amp = tier === 'far' ? 12 : tier === 'near' ? 4 : 6;
        const lift = (tier === 'near' ? 5 : 4) * this.playScale;
        const offsetX = (Math.random() > 0.5 ? 1 : -1) * ((base + Math.random() * amp) * this.playScale);
        const offsetY = -(base + Math.random() * amp) * this.playScale;
        const ringOpacity = ring.getComponent(UIOpacity) || ring.addComponent(UIOpacity);
        tween(ring)
            .to(0.08, { position: new Vec3(landing.x + offsetX * 0.2, landing.y + lift, 0) }, { easing: 'quadOut' })
            .delay(tier === 'near' ? 0.08 : 0)
            .to(tier === 'far' ? 0.2 : 0.22, { position: new Vec3(landing.x + offsetX, landing.y + offsetY, 0) }, { easing: 'quadIn' })
            .start();
        if (isSlide || tier === 'near') {
            tween(ring)
                .by(0.18, { eulerAngles: new Vec3(0, 0, 80 + Math.random() * 100) })
                .start();
        }
        tween(ringOpacity)
            .delay(tier === 'near' ? 0.3 : 0.22)
            .to(0.18, { opacity: 0 })
            .call(() => ring.destroy())
            .start();
    }

    private showJackpotFlash(): void {
        if (!this.container) return;
        const size = this.container.getComponent(UITransform)?.contentSize;
        if (!size) return;
        const flash = new Node('JackpotFlash');
        this.ensureUITransform(flash, size.width, size.height);
        const gfx = flash.addComponent(Graphics);
        gfx.fillColor = new Color(255, 220, 140, 60);
        gfx.rect(-size.width / 2, -size.height / 2, size.width, size.height);
        gfx.fill();
        gfx.strokeColor = new Color(255, 240, 200, 140);
        gfx.lineWidth = 4;
        gfx.rect(-size.width / 2 + 12, -size.height / 2 + 12, size.width - 24, size.height - 24);
        gfx.stroke();
        const opacity = flash.addComponent(UIOpacity);
        opacity.opacity = 0;
        flash.setPosition(0, 0, 0);
        this.container.addChild(flash);
        flash.setSiblingIndex(9998);
        tween(opacity)
            .to(0.08, { opacity: 220 })
            .to(0.25, { opacity: 0 })
            .call(() => flash.destroy())
            .start();
    }

    private playSfx(path: string): void {
        if (!path) return;
        const audio = AudioManager.Instance;
        if (!audio) return;
        void audio.playSFX(path);
    }

    private initWind(): void {
        this.unschedule(this.randomizeWind);
        this.randomizeWind();
        this.scheduleNextWindChange();
    }

    private scheduleNextWindChange(): void {
        const interval = 4 + Math.random() * 4;
        this.scheduleOnce(this.randomizeWind, interval);
    }

    private randomizeWind(): void {
        this.windTargetStrength = 0.25 + Math.random() * 0.75;
        this.windDir = Math.random() < 0.5 ? -1 : 1;
        this.windDirLabel = this.windDir > 0 ? '东风' : '西风';
        this.updateWindLabel();
        this.scheduleNextWindChange();
    }

    private updateWindLabel(): void {
        if (!this.windLabel) return;
        this.windLabel.string = `今日风力 ${this.windDirLabel}`;
    }

    private updateWindBar(): void {
        if (!this.windBar || !this.windFill) return;
        const barSize = this.windBar.getComponent(UITransform)?.contentSize;
        if (!barSize) return;
        const gust = Math.sin(this.windTime * 2 + this.windSeed) * 0.12;
        const strength = Math.max(0.05, Math.min(1, this.windStrength + gust));
        const fillWidth = Math.max(6, (barSize.width - 6) * strength);
        this.ensureUITransform(this.windFill, fillWidth, barSize.height - 4);
        this.windFill.setPosition(-barSize.width / 2 + fillWidth / 2 + 2, 0, 0);
        const barGfx = this.windBar.getComponent(Graphics) || this.windBar.addComponent(Graphics);
        this.drawRoundedRectGfx(barGfx, barSize.width, barSize.height, 6, new Color(22, 18, 14, 210), new Color(90, 70, 50, 200), 1);
        const fillGfx = this.windFill.getComponent(Graphics) || this.windFill.addComponent(Graphics);
        const color = new Color(140 + Math.round(80 * strength), 170 + Math.round(40 * strength), 190, 230);
        this.drawRoundedRectGfx(fillGfx, fillWidth, barSize.height - 4, 5, color);
    }

    private getWindOffset(includeGust: boolean, scale: number = 1): Vec3 {
        const maxWind = RING_TOSS_CONFIG.difficulty.windMax;
        const windFactor = 0.6;
        const base = this.windDir * this.windStrength * maxWind * scale * windFactor;
        if (!includeGust) {
            return new Vec3(base, 0, 0);
        }
        const gust = Math.sin(this.windTime * 3 + this.windSeed) * 0.35;
        const jitter = base * gust;
        return new Vec3(base + jitter, 0, 0);
    }

    private applyWindOffset(base: Vec3, includeGust: boolean): Vec3 {
        const rowScale = this.getRowDifficultyScale(base.y);
        const offset = this.getWindOffset(includeGust, rowScale);
        return new Vec3(base.x + offset.x, base.y + offset.y, 0);
    }

    private startHeatBoost(seconds: number): void {
        this.heatBoostRemaining += seconds;
        if (this.heatBoostActive) return;
        this.heatBoostActive = true;
        this.schedule(this.tickHeatBoost, 1);
    }

    private tickHeatBoost(): void {
        if (this.heatBoostRemaining <= 0) {
            this.stopHeatBoost();
            return;
        }
        ReviewSystem.instance.adjustHeat(1);
        this.heatBoostRemaining -= 1;
    }

    private stopHeatBoost(): void {
        this.unschedule(this.tickHeatBoost);
        this.heatBoostActive = false;
    }

    private applyRewardByType(config: RingTossTargetConfig): RewardResult {
        switch (config.rewardType) {
            case 'cash_small':
                return this.applyCashRange(20, 50);
            case 'cash_mid':
                return this.applyCashRange(80, 150);
            case 'cash_large':
                return this.applyCashRange(300, 500);
            case 'veg_small':
                return this.applyVegPack(2, 3, 100);
            case 'meat_mid':
                return this.applyMeatPack(1, 2, 120);
            case 'mix_mid':
                return this.applyMixPack(80, '混合礼包');
            case 'mix_large':
                return this.applyMixPack(200, '大混合礼包');
            case 'jackpot':
                return this.applyJackpotReward();
            default:
                return { summary: '谢谢参与', isJackpot: false, isPack: false };
        }
    }

    private applyCashRange(min: number, max: number): RewardResult {
        const amount = this.randomInt(min, max);
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.addMoney(amount);
        }
        return { summary: `+￥${amount}`, cash: amount, isJackpot: false, isPack: false };
    }

    private applyVegPack(minCount: number, maxCount: number, amount: number): RewardResult {
        const inventory = InventoryManager.instance;
        if (!inventory) return { summary: '库存异常', isJackpot: false, isPack: false };
        const count = this.randomInt(minCount, maxCount);
        const picks = this.pickRandomUnique(this.vegetableTypes, count);
        picks.forEach(type => inventory.adjustProcessedIngredient(type, amount));
        const detail = picks.map(type => `${this.getIngredientName(type)}+${amount}g`).join(' ');
        return { summary: '素菜礼包', detail, isJackpot: false, isPack: true };
    }

    private applyMeatPack(minCount: number, maxCount: number, amount: number): RewardResult {
        const inventory = InventoryManager.instance;
        if (!inventory) return { summary: '库存异常', isJackpot: false, isPack: false };
        const count = this.randomInt(minCount, maxCount);
        const picks = this.pickRandomUnique(this.meatTypes, count);
        picks.forEach(type => inventory.adjustProcessedIngredient(type, amount));
        const detail = picks.map(type => `${this.getIngredientName(type)}+${amount}g`).join(' ');
        return { summary: '肉类礼包', detail, isJackpot: false, isPack: true };
    }

    private applyMixPack(amount: number, summary: string): RewardResult {
        const inventory = InventoryManager.instance;
        if (!inventory) return { summary: '库存异常', isJackpot: false, isPack: false };
        const veg = this.vegetableTypes[this.randomInt(0, this.vegetableTypes.length - 1)];
        const meat = this.meatTypes[this.randomInt(0, this.meatTypes.length - 1)];
        inventory.adjustProcessedIngredient(veg, amount);
        inventory.adjustProcessedIngredient(meat, amount);
        const detail = `${this.getIngredientName(veg)}+${amount}g ${this.getIngredientName(meat)}+${amount}g`;
        return { summary, detail, isJackpot: false, isPack: true };
    }

    private applyJackpotReward(): RewardResult {
        const inventory = InventoryManager.instance;
        const cash = this.randomInt(1000, 1400);
        if (inventory) {
            inventory.addMoney(cash);
        }
        const useBoost = Math.random() < 0.5;
        let heatText = '';
        if (useBoost) {
            this.startHeatBoost(60);
            heatText = '客流暴涨60s';
        } else {
            ReviewSystem.instance.adjustHeat(20);
            heatText = '热度+20';
        }
        return { summary: `终极大奖 +￥${cash} · ${heatText}`, cash, isJackpot: true, isPack: false };
    }

    private checkRoundEnd(): void {
        if (this.remainingThrows > 0) return;
        this.updateSelectionVisuals();
        this.updateStartButtonState();
        this.updateHint('本轮结束，可继续选择圈数');
    }

    private updateStatus(): void {
        if (!this.statusLabel) return;
        const totalCost = this.getPackCost(this.selectedCount);
        const discount = this.getDiscountLabel(this.selectedCount);
        const discountText = discount ? `（${discount}）` : '';
        this.statusLabel.string = `选择 ${this.selectedCount} 圈，费用 ￥${totalCost}${discountText}`;
    }

    private updateWallet(): void {
        if (!this.walletLabel) return;
        const wallet = this.getWallet();
        this.walletLabel.string = `钱包 ￥${wallet}`;
        this.updateSelectionVisuals();
        this.updateStartButtonState();
    }

    private updateRound(): void {
        if (!this.roundLabel) return;
        const value = this.remainingThrows > 0 ? `${this.remainingThrows}` : '--';
        this.roundLabel.string = `剩余 ${value} 圈`;
    }

    private setResult(text: string, color?: Color): void {
        if (!this.resultLabel) return;
        this.resultLabel.string = text || '投圈看看手气吧！';
        this.resultLabel.color = color ?? new Color(240, 220, 200, 255);
    }

    private getPackCost(count: number): number {
        const discount = this.getDiscount(count);
        return Math.round(RING_TOSS_CONFIG.singleCost * count * discount);
    }

    private getDiscount(count: number): number {
        return (RING_TOSS_CONFIG.packDiscounts as Record<number, number>)[count] ?? 1;
    }

    private getDiscountLabel(count: number): string {
        const discount = this.getDiscount(count);
        if (discount >= 0.999) return '';
        const display = (discount * 10).toFixed(1).replace(/\.0$/, '');
        return `${display}折`;
    }

    private updateSelectionTexts(): void {
        const counts = [1, 3, 5];
        this.selectButtonLabels.forEach((label, index) => {
            const count = counts[index] ?? 1;
            const cost = this.getPackCost(count);
            const discount = this.getDiscountLabel(count);
            const price = discount ? `￥${cost} ${discount}` : `￥${cost}`;
            label.string = `${count}圈\n${price}`;
            label.fontSize = 20;
            label.lineHeight = 24;
            label.enableWrapText = true;
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;
        });
    }

    private applyLandingJitter(landing: Vec3, power: number): Vec3 {
        const difficulty = RING_TOSS_CONFIG.difficulty;
        const depthT = this.getDepthT(landing.y);
        const deviation = this.getPowerDeviation01(power);
        const devCurve = Math.pow(deviation, 1 + (difficulty.jitterCurve ?? 0.6));
        const jitterBase = RING_TOSS_CONFIG.maxJitter * (0.2 + 0.8 * devCurve);
        const rowScale = this.getRowDifficultyScale(landing.y);
        const depthFactor = 1 + depthT * (difficulty.depthPenalty ?? 0.28);
        const jitter = jitterBase * 0.32 * rowScale * depthFactor;
        return new Vec3(
            landing.x + (Math.random() * 2 - 1) * jitter,
            landing.y + (Math.random() * 2 - 1) * jitter,
            0
        );
    }

    private clampToGround(pos: Vec3): Vec3 {
        const bounds = RING_TOSS_CONFIG.perspective.groundBounds;
        const margin = RING_TOSS_CONFIG.playAreaMargin;
        return new Vec3(
            Math.max(bounds.xMin + margin, Math.min(bounds.xMax - margin, pos.x)),
            Math.max(bounds.yMin + margin, Math.min(bounds.yMax - margin, pos.y)),
            0
        );
    }

    private canThrow(): boolean {
        return this.remainingThrows > 0 && !this.isThrowing;
    }

    private getThrowPower(charge01: number = this.currentPower): number {
        const minPower = RING_TOSS_CONFIG.minPower;
        const clamped = Math.max(0, Math.min(1, charge01));
        return minPower + clamped * (1 - minPower);
    }

    private getPowerDeviation01(power: number): number {
        const sweet = RING_TOSS_CONFIG.difficulty.sweetSpot ?? 0.55;
        const denom = Math.max(0.001, Math.max(sweet, 1 - sweet));
        return Math.max(0, Math.min(1, Math.abs(power - sweet) / denom));
    }

    private getPowerAdvice(power: number): string {
        const sweet = RING_TOSS_CONFIG.difficulty.sweetSpot ?? 0.55;
        const zoneHalf = 0.06;
        const delta = power - sweet;
        if (Math.abs(delta) <= zoneHalf) {
            return '力度在黄条附近';
        }
        if (delta < 0) {
            return '力度偏小（黄条更稳）';
        }
        return '力度偏大（黄条更稳）';
    }

    private getWallet(): number {
        return InventoryManager.instance?.globalWallet ?? 0;
    }

    private screenToLocal(node: Node, screenX: number, screenY: number): Vec3 | null {
        const camera = this.getCanvasCamera();
        if (!camera) return null;
        const world = camera.screenToWorld(new Vec3(screenX, screenY, 0));
        const uiTransform = node.getComponent(UITransform);
        return uiTransform ? uiTransform.convertToNodeSpaceAR(world) : null;
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

    private getDepthT(groundY: number): number {
        const perspective = RING_TOSS_CONFIG.perspective;
        const t = (groundY - perspective.groundNearY) / (perspective.groundFarY - perspective.groundNearY);
        return Math.max(0, Math.min(1, t));
    }

    private getDepthScale(groundY: number): number {
        const perspective = RING_TOSS_CONFIG.perspective;
        const t = this.getDepthT(groundY);
        const curve = perspective.depthCurve ?? 1;
        const tScaled = Math.pow(t, Math.max(0.1, curve));
        return this.lerp(perspective.nearScale, perspective.farScale, tScaled);
    }

    private getRingScale(groundY: number, power: number): number {
        const base = this.getDepthScale(groundY);
        return base * this.getRingDepthScaleFactor(groundY) * this.playScale;
    }

    private getRingGroundRadius(groundY: number): number {
        return Math.max(8, this.ringBaseRadius * this.getRingDepthScaleFactor(groundY));
    }

    private getRingDepthScaleFactor(groundY: number): number {
        const t = this.getDepthT(groundY);
        const tCurve = Math.pow(t, 1.1);
        return this.lerp(1.3, 0.4, tCurve);
    }

    private projectToScreen(groundPos: Vec3): Vec3 {
        const perspective = RING_TOSS_CONFIG.perspective;
        const t = this.getDepthT(groundPos.y);
        const scale = this.getDepthScale(groundPos.y) * this.playScale;
        const screenY = this.lerp(perspective.screenNearY, perspective.screenFarY, t) * this.playScale;
        return new Vec3(groundPos.x * scale, screenY, 0);
    }

    private unprojectToGround(screenPos: Vec3): Vec3 {
        const perspective = RING_TOSS_CONFIG.perspective;
        const screenY = screenPos.y / this.playScale;
        const t = (screenY - perspective.screenNearY) / (perspective.screenFarY - perspective.screenNearY);
        const clampedT = Math.max(0, Math.min(1, t));
        const groundY = this.lerp(perspective.groundNearY, perspective.groundFarY, clampedT);
        const scale = this.getDepthScale(groundY) * this.playScale;
        const groundX = scale <= 0.001 ? 0 : screenPos.x / scale;
        return new Vec3(groundX, groundY, 0);
    }

    private findNodeRecursive(root: Node | null, name: string): Node | null {
        if (!root) return null;
        if (root.name === name) return root;
        for (const child of root.children) {
            const found = this.findNodeRecursive(child, name);
            if (found) return found;
        }
        return null;
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private ensureUITransform(node: Node, width?: number, height?: number): UITransform {
        const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
        if (width !== undefined && height !== undefined) {
            transform.setContentSize(width, height);
        }
        return transform;
    }

    private randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private pickRandomUnique<T>(list: T[], count: number): T[] {
        const pool = list.slice();
        const picks: T[] = [];
        const target = Math.min(count, pool.length);
        for (let i = 0; i < target; i++) {
            const idx = this.randomInt(0, pool.length - 1);
            picks.push(pool.splice(idx, 1)[0]);
        }
        return picks;
    }

    private getIngredientName(type: IngredientType): string {
        switch (type) {
            case IngredientType.LETTUCE:
                return '生菜';
            case IngredientType.CABBAGE_LEAF:
                return '白菜叶';
            case IngredientType.POTATO:
                return '土豆';
            case IngredientType.EGGPLANT:
                return '茄子';
            case IngredientType.GREEN_BEAN:
                return '豆角';
            case IngredientType.MEATBALL:
                return '肉丸';
            case IngredientType.BEEF:
                return '牛肉';
            case IngredientType.PORK:
                return '里脊肉';
            case IngredientType.CHICKEN:
                return '鸡柳';
            case IngredientType.SAUSAGE:
                return '香肠';
            default:
                return '食材';
        }
    }
}
