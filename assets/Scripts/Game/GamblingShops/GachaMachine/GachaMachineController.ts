import { _decorator, Component, Node, Label, Color, Graphics, tween, Vec3, Vec2, director, UITransform, Sprite, Button, EventHandler, sys, Layers, instantiate, Prefab, view, BlockInputEvents, Tween, SpriteFrame, ImageAsset, Texture2D, resources, assetManager, UIOpacity } from 'cc';
import { InventoryManager } from '../../../Manager/InventoryManager';
import { GameProgressManager } from '../../../Manager/GameProgressManager';
import { TimeManager } from '../../../Manager/TimeManager';
import { AudioManager } from '../../../Utils/AudioManager';
import { GACHA_CONFIG, GachaRarity, GachaResult, GachaMachineTier } from './GachaConfig';
import { GachaUIFactory } from './Factory/GachaUIFactory';
import { GachaGlobe } from './Components/GachaGlobe';
import { GachaBase } from './Components/GachaBase';
import { GachaLever } from './Components/GachaLever';
import { GACHA_UI_CONFIG } from './Config/GachaUIConfig';
import { EventSystemIntegration } from '../../EventSystemIntegration';
import { SpecialEventVoucherManager } from '../../SpecialEvents/SpecialEventVoucherManager';

const { ccclass, property } = _decorator;

interface GachaMachineState {
    isSoldOut: boolean;
    soldOutDay: number;
    lastStockDay: number;
    remainingCapsules: number;
}

interface GachaSpendState {
    day: number;
    totalSpend: number;
    spendByMachine: Record<string, number>;
}

type MachineComponents = {
    globe: GachaGlobe;
    base: GachaBase | null;
    lever: GachaLever | null;
};

@ccclass('GachaMachineController')
export class GachaMachineController extends Component {
    @property(Node)
    shopButton: Node = null!;

    @property(Node)
    shopPanel: Node = null!;

    @property
    useLayeredSprites: boolean = false;

    @property(SpriteFrame)
    normalMachineBackSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    premiumMachineBackSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    luxuryMachineBackSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    normalGlassSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    premiumGlassSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    luxuryGlassSprite: SpriteFrame | null = null;

    @property(Vec3)
    machineBackOffset: Vec3 = new Vec3(0, 0, 0);

    @property
    machineBackScale: number = 1;

    @property(Vec3)
    glassFrontOffset: Vec3 = new Vec3(0, 0, 0);

    @property
    glassFrontScale: number = 1;

    @property
    hideVectorGlassWhenLayered: boolean = true;

    @property
    useMachineSprite: boolean = false;

    @property(SpriteFrame)
    normalMachineSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    premiumMachineSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    luxuryMachineSprite: SpriteFrame | null = null;

    @property
    hideVectorPartsWhenSprite: boolean = true;

    @property(Vec3)
    machineSpriteOffset: Vec3 = new Vec3(0, 0, 0);

    @property
    machineSpriteScale: number = 1;

    @property(SpriteFrame)
    normalMachineButtonSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    premiumMachineButtonSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    luxuryMachineButtonSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    normalMachineDoorSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    premiumMachineDoorSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    luxuryMachineDoorSprite: SpriteFrame | null = null;

    @property(Vec3)
    machineButtonOffset: Vec3 = new Vec3(0, 0, 0);

    @property
    machineButtonScale: number = 1;

    @property(Vec2)
    machineButtonPivot: Vec2 = new Vec2(0.5, 0.5);

    @property
    machineButtonBaseAngle: number = 0;

    @property
    machineButtonRotateAngle: number = -90;

    @property(Vec3)
    machineDoorOffset: Vec3 = new Vec3(0, 0, 0);

    @property
    machineDoorScale: number = 1;

    @property(Vec2)
    machineDoorPivot: Vec2 = new Vec2(0.5, 0.5);

    @property
    machineDoorClosedAngle: number = 0;

    @property
    machineDoorOpenAngle: number = -45;

    @property(Vec3)
    machineDoorOpenOffset: Vec3 = new Vec3(0, 0, 0);

    @property
    hideDoorWhenClosed: boolean = true;

    @property
    useButtonSpriteAsPullButton: boolean = false;

    @property
    useCenterDropSpawn: boolean = false;

    @property(Vec3)
    globeOffset: Vec3 = new Vec3(0, 110, 0);

    @property
    globeRadiusOverride: number = 0;

    @property(Vec3)
    glassLayerOffset: Vec3 = new Vec3(0, 0, 0);

    @property(Vec2)
    glassLayerScale: Vec2 = new Vec2(1, 1);

    @property(Vec3)
    capsuleLayerOffset: Vec3 = new Vec3(0, 0, 0);

    @property(Vec2)
    capsuleLayerScale: Vec2 = new Vec2(1, 1);

    @property
    useSquareGlobe: boolean = false;

    @property
    usePolygonGlobe: boolean = false;

    @property(Vec2)
    globeSquareSizeOverride: Vec2 = new Vec2(0, 0);

    @property
    useGlobeBoundsGuide: boolean = false;

    @property
    useGuideOffset: boolean = true;

    @property(Node)
    globeBoundsGuide: Node | null = null;

    @property
    hideGlobeGuideAtRuntime: boolean = true;

    @property
    panelBackgroundHeightOverride: number = 0;

    @property
    bgImageHeightOverride: number = 0;

    @property
    machineStageScaleOverride: number = 1;

    @property
    uiGlobalShiftY: number = 0;

    @property(Vec3)
    machineRootPosition: Vec3 = new Vec3(0, -20, 0);

    @property
    machineRootScale: number = 0.85;

    @property(Vec2)
    machineStageSizeOverride: Vec2 = new Vec2(0, 0);

    @property(Vec2)
    machineStageAnchorOverride: Vec2 = new Vec2(0.5, 0.5);

    @property
    usePullButtonPositionOverride: boolean = false;

    @property(Vec2)
    pullButtonPositionOverride: Vec2 = new Vec2(0, 0);

    @property
    headerRowYOffset: number = 0;

    @property
    useProbabilityIconPositionOverride: boolean = false;

    @property(Vec2)
    probabilityIconPositionOverride: Vec2 = new Vec2(0, 0);

    // Runtime state
    private isPanelOpen: boolean = false;
    private currentMachineId: string = 'normal';
    private isAnimating: boolean = false;
    private pityCounter: number = 0;
    private unluckyStreakCounter: number = 0;  // NEW: Unlucky streak counter
    private pullHistory: GachaResult[] = [];
    private totalPulls: number = 0;

    // UI Nodes created at runtime
    private contentNode: Node = null!;
    private fxLayer: Node = null!;
    private dropFxLayer: Node = null!;
    private modalBlocker: Node = null!;
    private resultNode: Node = null!;
    private batchResultNode: Node = null!; // NEW: Batch result display
    private machineNode: Node = null!;
    private tabsContainer: Node = null!;
    private uiRoot: Node = null!;
    private externalButtonStates: Map<Button, boolean> = new Map();
    private walletLabel: Label = null!;
    private pityLabel: Label = null!;
    private unluckyStreakLabel: Label = null!;  // NEW: Unlucky streak UI label
    private pityTitleLabel: Label = null!;
    private pitySegmentNodes: Node[] = [];
    private unluckyTitleLabel: Label = null!;
    private unluckySegmentNodes: Node[] = [];
    private shopTimeLabel: Label = null!;
    private pullButtons: Record<number, Node> = {};
    private buttonSpritePullNode: Node | null = null;
    private buttonSpriteGlowNode: Node | null = null;
    private closeButton: Node = null!;
    private lastResultRarity: GachaRarity | null = null;
    private hintLabel: Label = null!;
    private machineStage: Node = null!;
    private machineNodes: Record<string, Node> = {};
    private machineComponents: Record<string, MachineComponents> = {};
    private machineStates: Record<string, GachaMachineState> = {};
    private readonly RESET_SOLD_OUT_ON_BOOT: boolean = true;
    private readonly RESET_WALLET_ON_BOOT: boolean = true;
    private readonly WALLET_SNAPSHOT_KEY = 'gacha_wallet_snapshot';
    private spendState: GachaSpendState = {
        day: 0,
        totalSpend: 0,
        spendByMachine: { normal: 0, premium: 0, luxury: 0 }
    };
    private tooltipNode: Node = null!;
    private tooltipLabel: Label = null!;
    private tooltipBg: Graphics = null!;
    private tooltipBgTransform: UITransform = null!;
    private probabilityIcon: Node = null!;
    private probabilityIconGfx: Graphics = null!;
    private probabilityIconLabel: Label = null!;
    private currentGlobeOffset: Vec3 = new Vec3(0, 110, 0);
    private tooltipLinesNode: Node = null!;
    private tooltipLineRows: Array<{ root: Node; keyLabel: Label; valueLabel: Label }> = [];
    private shakeBoostActive: boolean = false;
    private shakeBoost: number = 0;
    private lastShakeBoostAt: number = 0;
    private shakeBoostBound: boolean = false;
    private shakeRuntimeActive: boolean = false;
    private shakeRuntimeTime: number = 0;
    private shakeRuntimeDuration: number = 0;
    private shakeRuntimeIntensity: number = 0;
    private shakeRuntimeAllowBoost: boolean = false;
    private shakeRuntimeFrequencyMultiplier: number = 1;
    private shakeRuntimeBasePos: Vec3 = new Vec3();
    private shakeRuntimeOnComplete: (() => void) | null = null;
    private buttonGlowPulseTime: number = 0;
    private readonly buttonGlowPulsePeriod: number = 1.6;

    // 赛璐璐风格组件引用（新增）
    private globeComponent: GachaGlobe = null!;
    private baseComponent: GachaBase = null!;
    private leverComponent: GachaLever = null!;

    private readonly SAVE_KEY = 'gacha_machine_progress';

    onLoad() {
        this.loadProgress();
        this.resetSoldOutStateOnBoot();
        this.restoreWalletSnapshot();
        this.tryLoadDefaultMachineSprites();

        if (!this.shopButton) {
            this.shopButton = this.node;
        }

        if (this.shopButton) {
            this.setupShopButton();
        }
    }

    start() {
        // Listen for wallet updates to refresh UI if open
        director.on('GACHA_MONEY_CHANGED', this.updateWalletDisplay, this);
    }

    update(dt: number) {
        this.updateButtonSpriteGlow(dt);
        if (!this.shakeRuntimeActive || !this.machineNode) return;
        this.shakeRuntimeTime += dt;
        const duration = Math.max(0.01, this.shakeRuntimeDuration);
        const progress = Math.min(1, this.shakeRuntimeTime / duration);
        const decay = 1 - progress * 0.75;
        const boost = this.shakeRuntimeAllowBoost ? this.shakeBoost : 0;
        const freqBase = 6 * this.shakeRuntimeFrequencyMultiplier;
        const freqBoost = 10 * boost;
        const freq = freqBase + freqBoost;
        const amp = Math.max(3, this.shakeRuntimeIntensity * 0.35) * (1 + boost * 0.4) * decay;
        const t = this.shakeRuntimeTime;
        const angleAmp = 2.2 * (1 + boost * 0.4) * decay;

        this.machineNode.setPosition(
            this.shakeRuntimeBasePos.x + Math.sin(t * freq * 6.283) * amp,
            this.shakeRuntimeBasePos.y + Math.cos(t * freq * 5.2) * amp * 0.35,
            0
        );
        this.machineNode.angle = Math.sin(t * freq * 7.1) * angleAmp;

        if (this.shakeRuntimeTime >= duration) {
            this.shakeRuntimeActive = false;
            this.machineNode.setPosition(this.shakeRuntimeBasePos);
            this.machineNode.angle = 0;
            const cb = this.shakeRuntimeOnComplete;
            this.shakeRuntimeOnComplete = null;
            if (cb) cb();
        }
    }

    onDestroy() {
        director.off('GACHA_MONEY_CHANGED', this.updateWalletDisplay, this);
        EventSystemIntegration.setGlobalSuppressed(false);
        // Stop all tweens
        Object.values(this.machineNodes).forEach(node => {
            if (node && node.isValid) tween(node).stop();
        });
        if (this.resultNode) tween(this.resultNode).stop();

        this.stopTimeTicker();
        // 清理面板（因为它不再是子节点，需要手动销毁）
        if (this.shopPanel && this.shopPanel.isValid) {
            this.shopPanel.destroy();
        }
        if (this.modalBlocker && this.modalBlocker.isValid) {
            this.modalBlocker.destroy();
        }
        this.setExternalButtonsInteractable(true);
    }

    private getMachineState(machineId: string = this.currentMachineId): GachaMachineState {
        if (!this.machineStates[machineId]) {
            this.machineStates[machineId] = {
                isSoldOut: false,
                soldOutDay: 0,
                lastStockDay: 0,
                remainingCapsules: 0
            };
        }
        return this.machineStates[machineId];
    }

    private resetSoldOutStateOnBoot() {
        if (!this.RESET_SOLD_OUT_ON_BOOT) return;
        const machineIds = Object.keys(GACHA_CONFIG.machines);
        machineIds.forEach((id) => {
            const state = this.getMachineState(id);
            state.isSoldOut = false;
            state.soldOutDay = 0;
            state.lastStockDay = 0;
            state.remainingCapsules = 0;
        });
        this.saveProgress();
    }

    private ensureWalletSnapshot() {
        if (!this.RESET_WALLET_ON_BOOT || !InventoryManager.instance) return;
        const existing = sys.localStorage.getItem(this.WALLET_SNAPSHOT_KEY);
        if (!existing) {
            const wallet = InventoryManager.instance.globalWallet;
            sys.localStorage.setItem(this.WALLET_SNAPSHOT_KEY, wallet.toString());
        }
    }

    private updateButtonSpriteGlow(dt: number) {
        const glowNode = this.buttonSpriteGlowNode;
        if (!glowNode || !glowNode.isValid) return;

        this.buttonGlowPulseTime += dt;
        const period = Math.max(0.4, this.buttonGlowPulsePeriod);
        const phase = (this.buttonGlowPulseTime % period) / period;
        const intensity = 0.5 + Math.sin(phase * Math.PI * 2) * 0.5;

        const opacity = glowNode.getComponent(UIOpacity) ?? glowNode.addComponent(UIOpacity);
        opacity.opacity = Math.round(60 + intensity * 120);
    }

    private restoreWalletSnapshot() {
        if (!this.RESET_WALLET_ON_BOOT || !InventoryManager.instance) return;
        const raw = sys.localStorage.getItem(this.WALLET_SNAPSHOT_KEY);
        if (!raw) return;
        const amount = parseInt(raw, 10);
        if (!Number.isNaN(amount)) {
            InventoryManager.instance.setWallet(amount);
        }
        sys.localStorage.removeItem(this.WALLET_SNAPSHOT_KEY);
    }

    private tryLoadDefaultMachineSprites() {
        const refreshIfOpen = () => {
            if (this.isPanelOpen) {
                this.refreshMachineVisuals();
            }
        };

        const loadSpriteFrame = (path: string, onLoaded: (sf: SpriteFrame) => void, label: string) => {
            resources.load(`${path}/spriteFrame`, SpriteFrame, (err, spriteFrame) => {
                if (!err && spriteFrame) {
                    onLoaded(spriteFrame);
                    return;
                }
                resources.load(path, SpriteFrame, (fallbackErr, fallbackFrame) => {
                    if (fallbackErr || !fallbackFrame) {
                        console.warn(`[GachaMachine] Missing ${label} sprite`);
                        return;
                    }
                    onLoaded(fallbackFrame);
                });
            });
        };

        if (!this.normalMachineSprite) {
            loadSpriteFrame('Gacha/Machines/normal/idle', (spriteFrame) => {
                this.normalMachineSprite = spriteFrame;
                refreshIfOpen();
            }, 'normal idle');
        }

        if (!this.normalMachineButtonSprite) {
            loadSpriteFrame('Gacha/Machines/normal/button', (spriteFrame) => {
                this.normalMachineButtonSprite = spriteFrame;
                refreshIfOpen();
            }, 'normal button');
        }

        if (!this.normalMachineDoorSprite) {
            loadSpriteFrame('Gacha/Machines/normal/door', (spriteFrame) => {
                this.normalMachineDoorSprite = spriteFrame;
                refreshIfOpen();
            }, 'normal door');
        }

        if (!this.premiumMachineSprite) {
            loadSpriteFrame('Gacha/Machines/premium/idle', (spriteFrame) => {
                this.premiumMachineSprite = spriteFrame;
                refreshIfOpen();
            }, 'premium idle');
        }

        if (!this.premiumMachineButtonSprite) {
            loadSpriteFrame('Gacha/Machines/premium/button', (spriteFrame) => {
                this.premiumMachineButtonSprite = spriteFrame;
                refreshIfOpen();
            }, 'premium button');
        }

        if (!this.premiumMachineDoorSprite) {
            loadSpriteFrame('Gacha/Machines/premium/door', (spriteFrame) => {
                this.premiumMachineDoorSprite = spriteFrame;
                refreshIfOpen();
            }, 'premium door');
        }

        if (!this.luxuryMachineSprite) {
            loadSpriteFrame('Gacha/Machines/luxury/idle', (spriteFrame) => {
                this.luxuryMachineSprite = spriteFrame;
                refreshIfOpen();
            }, 'luxury idle');
        }

        if (!this.luxuryMachineButtonSprite) {
            loadSpriteFrame('Gacha/Machines/luxury/button', (spriteFrame) => {
                this.luxuryMachineButtonSprite = spriteFrame;
                refreshIfOpen();
            }, 'luxury button');
        }

        if (!this.luxuryMachineDoorSprite) {
            loadSpriteFrame('Gacha/Machines/luxury/door', (spriteFrame) => {
                this.luxuryMachineDoorSprite = spriteFrame;
                refreshIfOpen();
            }, 'luxury door');
        }
    }

    private syncCurrentMachineState() {
        const state = this.getMachineState();
        if (this.globeComponent) {
            state.remainingCapsules = this.globeComponent.getRemainingCapsules();
        }
    }

    private resetSpendIfNewDay() {
        const currentDay = this.getCurrentDay();
        if (this.spendState.day !== currentDay) {
            this.spendState.day = currentDay;
            this.spendState.totalSpend = 0;
            this.spendState.spendByMachine = { normal: 0, premium: 0, luxury: 0 };
        }
    }

    private recordMachineSpend(amount: number) {
        this.resetSpendIfNewDay();
        const machineId = this.currentMachineId;
        this.spendState.totalSpend += amount;
        this.spendState.spendByMachine[machineId] =
            (this.spendState.spendByMachine[machineId] ?? 0) + amount;
    }

    private getSpendBiasMultiplier(): number {
        this.resetSpendIfNewDay();
        const total = Math.max(1, this.spendState.totalSpend);
        const ratio = (this.spendState.spendByMachine[this.currentMachineId] ?? 0) / total;
        const t = Math.min(1, Math.max(0, (ratio - 0.25) / 0.55));
        return 0.88 + (1.05 - 0.88) * t;
    }

    private layoutMachineNode(node: Node) {
        node.setScale(new Vec3(this.machineRootScale, this.machineRootScale, 1));
        node.setPosition(this.machineRootPosition);
    }

    private getResultAnchorPosition(): Vec3 {
        if (this.machineStage) {
            const base = this.machineStage.position;
            return new Vec3(base.x, base.y + 80, 0);
        }
        return new Vec3(0, 160, 0);
    }

    private getDoorOpenOffset(doorNode: Node): Vec3 {
        return this.machineDoorOpenOffset;
    }

    private openDoorForDrop(onOpened: () => void) {
        const doorNode = this.machineNode?.getChildByName('Door') ?? this.machineNode?.getChildByName('MachineDoorSprite');
        if (!doorNode) {
            onOpened();
            return;
        }
        const fadeDuration = 0.08;
        const doorAny = doorNode as any;
        const closedPos: Vec3 = (doorAny.__closedPos as Vec3) ?? doorNode.position.clone();
        const baseScale: Vec3 = (doorAny.__baseScale as Vec3) ?? doorNode.scale.clone();
        doorAny.__baseScale = baseScale;
        doorNode.active = true;
        doorNode.angle = 0;
        doorNode.setPosition(closedPos);
        doorNode.setScale(baseScale);
        const opacity = doorNode.getComponent(UIOpacity) ?? doorNode.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity)
            .to(fadeDuration, { opacity: 255 })
            .call(() => onOpened())
            .start();
    }

    private getDoorSpawnPositionLocal(): Vec3 {
        if (!this.dropFxLayer) return new Vec3(0, 140, 0);
        if (this.useCenterDropSpawn) {
            const globeNode = this.machineNode?.getChildByName('Globe') ?? null;
            if (globeNode) {
                const globeTransform = globeNode.getComponent(UITransform);
                const worldPos = globeTransform
                    ? globeTransform.convertToWorldSpaceAR(new Vec3(0, 0, 0))
                    : globeNode.getWorldPosition();
                const fxTransform = this.dropFxLayer.getComponent(UITransform);
                return fxTransform ? fxTransform.convertToNodeSpaceAR(worldPos) : this.dropFxLayer.position.clone();
            }
        }
        const doorNode = this.machineNode?.getChildByName('Door') ?? this.machineNode?.getChildByName('MachineDoorSprite');
        if (!doorNode) {
            return new Vec3(0, 140, 0);
        }
        const doorTransform = doorNode.getComponent(UITransform);
        const worldPos = doorTransform
            ? doorTransform.convertToWorldSpaceAR(new Vec3(0, doorTransform.contentSize.height * 0.5, 0))
            : doorNode.getWorldPosition();
        const fxTransform = this.dropFxLayer.getComponent(UITransform);
        return fxTransform ? fxTransform.convertToNodeSpaceAR(worldPos) : this.dropFxLayer.position.clone();
    }

    private getStageBottomPositionLocal(): Vec3 {
        if (!this.dropFxLayer) return new Vec3(0, -190, 0);
        const stageTransform = this.machineStage?.getComponent(UITransform);
        if (!stageTransform) {
            return new Vec3(0, -190, 0);
        }
        const worldPos = stageTransform.convertToWorldSpaceAR(new Vec3(0, -stageTransform.contentSize.height / 2 + 12, 0));
        const fxTransform = this.dropFxLayer.getComponent(UITransform);
        return fxTransform ? fxTransform.convertToNodeSpaceAR(worldPos) : new Vec3(0, -190, 0);
    }

    private getFrontPositionLocal(): Vec3 {
        if (!this.dropFxLayer) return new Vec3(0, -40, 0);
        const contentTransform = this.contentNode?.getComponent(UITransform);
        const fxTransform = this.dropFxLayer.getComponent(UITransform);
        if (!contentTransform || !fxTransform) {
            return new Vec3(0, -40, 0);
        }
        const worldPos = contentTransform.convertToWorldSpaceAR(this.getResultAnchorPosition());
        const local = fxTransform.convertToNodeSpaceAR(worldPos);
        return new Vec3(local.x, local.y - 60, 0);
    }

    private closeDoorAnimation(immediate: boolean = false) {
        const doorNode = this.machineNode?.getChildByName('Door') ?? this.machineNode?.getChildByName('MachineDoorSprite');
        if (!doorNode) return;
        const fadeDuration = 0.08;
        const doorAny = doorNode as any;
        const closedPos: Vec3 = (doorAny.__closedPos as Vec3) ?? doorNode.position.clone();
        const baseScale: Vec3 = (doorAny.__baseScale as Vec3) ?? doorNode.scale.clone();
        const opacity = doorNode.getComponent(UIOpacity) ?? doorNode.addComponent(UIOpacity);
        Tween.stopAllByTarget(doorNode);
        Tween.stopAllByTarget(opacity);

        if (immediate) {
            doorNode.setPosition(closedPos);
            doorNode.setScale(baseScale);
            opacity.opacity = 0;
            if (this.hideDoorWhenClosed) {
                doorNode.active = false;
            }
            return;
        }

        doorNode.active = true;
        tween(doorNode)
            .to(fadeDuration, { position: closedPos }, { easing: 'quadIn' })
            .call(() => {
                doorNode.setScale(baseScale);
                if (this.hideDoorWhenClosed) {
                    doorNode.active = false;
                }
            })
            .start();
        tween(opacity)
            .to(fadeDuration, { opacity: 0 })
            .start();
    }

    private spawnDoorFx() {
        if (!this.dropFxLayer || !this.machineNode) return;
        const doorNode = this.machineNode.getChildByName('Door') ?? this.machineNode.getChildByName('MachineDoorSprite');
        const sourceNode = doorNode ?? this.machineNode;
        const worldPos = sourceNode.getWorldPosition();
        const fxTransform = this.dropFxLayer.getComponent(UITransform);
        const localPos = fxTransform
            ? fxTransform.convertToNodeSpaceAR(worldPos)
            : this.dropFxLayer.position.clone();

        const fx = new Node('DoorFx');
        fx.parent = this.dropFxLayer;
        fx.setPosition(localPos);
        fx.setScale(new Vec3(0.4, 0.4, 1));
        const opacity = fx.addComponent(UIOpacity);
        opacity.opacity = 200;
        const gfx = fx.addComponent(Graphics);
        const glow = this.getRarityUIColor(this.lastResultRarity ?? GachaRarity.N);
        const core = new Color(glow.r, glow.g, glow.b, 200);
        gfx.fillColor = new Color(core.r, core.g, core.b, 160);
        gfx.circle(0, 0, 18);
        gfx.fill();
        gfx.fillColor = new Color(core.r, core.g, core.b, 80);
        gfx.circle(0, 0, 38);
        gfx.fill();
        gfx.strokeColor = new Color(255, 255, 255, 200);
        gfx.lineWidth = 2;
        gfx.circle(0, 0, 40);
        gfx.stroke();
        gfx.strokeColor = new Color(core.r, core.g, core.b, 180);
        gfx.lineWidth = 3;
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            const x = Math.cos(angle) * 46;
            const y = Math.sin(angle) * 46;
            gfx.moveTo(x * 0.6, y * 0.6);
            gfx.lineTo(x, y);
        }
        gfx.stroke();

        tween(fx)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'quadOut' })
            .to(0.22, { scale: new Vec3(1.5, 1.5, 1) }, { easing: 'quadIn' })
            .call(() => fx.destroy())
            .start();

        tween(opacity)
            .to(0.42, { opacity: 0 })
            .start();
    }

    private spawnRewardBurst(localPos: Vec3, rarity: GachaRarity) {
        if (!this.dropFxLayer) return;
        const burst = new Node('RewardBurst');
        burst.parent = this.dropFxLayer;
        burst.setPosition(localPos);
        const opacity = burst.addComponent(UIOpacity);
        opacity.opacity = 255;
        const gfx = burst.addComponent(Graphics);
        const glow = this.getRarityUIColor(rarity);
        gfx.fillColor = new Color(glow.r, glow.g, glow.b, 160);
        gfx.circle(0, 0, 26);
        gfx.fill();
        gfx.strokeColor = new Color(255, 255, 255, 200);
        gfx.lineWidth = 2;
        gfx.circle(0, 0, 48);
        gfx.stroke();
        gfx.strokeColor = new Color(glow.r, glow.g, glow.b, 180);
        gfx.lineWidth = 3;
        for (let i = 0; i < 8; i++) {
            const angle = (i * 45) * Math.PI / 180;
            const x = Math.cos(angle) * 56;
            const y = Math.sin(angle) * 56;
            gfx.moveTo(x * 0.5, y * 0.5);
            gfx.lineTo(x, y);
        }
        gfx.stroke();

        for (let i = 0; i < 6; i++) {
            const spark = new Node(`Spark_${i}`);
            spark.parent = burst;
            const sg = spark.addComponent(Graphics);
            sg.fillColor = new Color(255, 255, 255, 220);
            sg.circle(0, 0, 3);
            sg.fill();
            const angle = Math.random() * Math.PI * 2;
            const dist = 24 + Math.random() * 24;
            const target = new Vec3(Math.cos(angle) * dist, Math.sin(angle) * dist, 0);
            tween(spark)
                .to(0.25, { position: target, scale: new Vec3(0, 0, 1) }, { easing: 'quadOut' })
                .call(() => spark.destroy())
                .start();
        }

        tween(burst)
            .to(0.2, { scale: new Vec3(1.1, 1.1, 1) }, { easing: 'quadOut' })
            .to(0.22, { scale: new Vec3(1.45, 1.45, 1) }, { easing: 'quadIn' })
            .call(() => burst.destroy())
            .start();
        tween(opacity)
            .to(0.42, { opacity: 0 })
            .start();
    }

    private getMachineSpriteFrame(machineId: string): SpriteFrame | null {
        if (machineId === 'normal') return this.normalMachineSprite;
        if (machineId === 'premium') return this.premiumMachineSprite;
        if (machineId === 'luxury') return this.luxuryMachineSprite;
        return null;
    }

    private getMachineButtonSpriteFrame(machineId: string): SpriteFrame | null {
        if (machineId === 'normal') return this.normalMachineButtonSprite;
        if (machineId === 'premium') return this.premiumMachineButtonSprite;
        if (machineId === 'luxury') return this.luxuryMachineButtonSprite;
        return null;
    }

    private getMachineDoorSpriteFrame(machineId: string): SpriteFrame | null {
        if (machineId === 'normal') return this.normalMachineDoorSprite;
        if (machineId === 'premium') return this.premiumMachineDoorSprite;
        if (machineId === 'luxury') return this.luxuryMachineDoorSprite;
        return null;
    }

    private getMachineBackSpriteFrame(machineId: string): SpriteFrame | null {
        if (machineId === 'normal') return this.normalMachineBackSprite;
        if (machineId === 'premium') return this.premiumMachineBackSprite;
        if (machineId === 'luxury') return this.luxuryMachineBackSprite;
        return null;
    }

    private getGlassFrontSpriteFrame(machineId: string): SpriteFrame | null {
        if (machineId === 'normal') return this.normalGlassSprite;
        if (machineId === 'premium') return this.premiumGlassSprite;
        if (machineId === 'luxury') return this.luxuryGlassSprite;
        return null;
    }

    private ensureOverlaySprite(
        parent: Node,
        name: string,
        frame: SpriteFrame | null,
        offset: Vec3,
        scale: number,
        pivot: Vec2,
        siblingIndex: number
    ): Node | null {
        let node = parent.getChildByName(name);
        if (!frame) {
            if (node) node.active = false;
            return null;
        }
        if (!node) {
            node = new Node(name);
            node.layer = Layers.Enum.UI_2D;
            parent.addChild(node);
        }
        node.active = true;
        node.setPosition(offset);
        node.setScale(scale, scale, 1);
        const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.anchorX = pivot.x;
        transform.anchorY = pivot.y;
        const size: any = frame.originalSize ?? frame.rect;
        if (size) {
            transform.setContentSize(size.width ?? size.x, size.height ?? size.y);
        }
        node.setSiblingIndex(siblingIndex);
        return node;
    }

    private applySpriteToNode(
        node: Node | null,
        frame: SpriteFrame | null,
        offset: Vec3,
        scale: number,
        pivot: Vec2
    ): boolean {
        if (!node || !frame) return false;
        const nodeAny = node as any;
        if (!nodeAny.__originPos) {
            nodeAny.__originPos = node.position.clone();
        }
        const origin: Vec3 = nodeAny.__originPos ?? node.position.clone();
        node.setPosition(new Vec3(origin.x + offset.x, origin.y + offset.y, origin.z + offset.z));
        node.setScale(scale, scale, 1);

        const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.RAW;
        sprite.trim = false;
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.anchorX = pivot.x;
        transform.anchorY = pivot.y;
        const size: any = frame.originalSize ?? frame.rect;
        if (size) {
            transform.setContentSize(size.width ?? size.x, size.height ?? size.y);
        }
        return true;
    }

    private applySpriteToChildNode(
        parent: Node | null,
        name: string,
        frame: SpriteFrame | null,
        offset: Vec3,
        scale: number,
        pivot: Vec2
    ): Node | null {
        if (!parent || !frame) return null;
        let node = parent.getChildByName(name);
        if (!node) {
            node = new Node(name);
            node.layer = Layers.Enum.UI_2D;
            parent.addChild(node);
        }
        node.active = true;
        node.setPosition(offset);
        node.setScale(scale, scale, 1);

        const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
        sprite.spriteFrame = frame;
        sprite.sizeMode = Sprite.SizeMode.RAW;
        sprite.trim = false;
        const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        transform.anchorX = pivot.x;
        transform.anchorY = pivot.y;
        const size: any = frame.originalSize ?? frame.rect;
        if (size) {
            transform.setContentSize(size.width ?? size.x, size.height ?? size.y);
        }
        return node;
    }

    private ensureButtonSpritePullButton(buttonNode: Node) {
        this.buttonSpritePullNode = buttonNode;

        let glowNode = buttonNode.getChildByName('ButtonGlow');
        if (!glowNode) {
            glowNode = new Node('ButtonGlow');
            glowNode.layer = Layers.Enum.UI_2D;
            glowNode.setParent(buttonNode);
        }

        const transform = buttonNode.getComponent(UITransform);
        const width = transform ? transform.contentSize.width : 100;
        const height = transform ? transform.contentSize.height : 100;
        const radius = Math.max(width, height) * 0.6;

        glowNode.setPosition(0, 0, 0);
        glowNode.setScale(1.05, 1.05, 1);
        const gfx = glowNode.getComponent(Graphics) ?? glowNode.addComponent(Graphics);
        gfx.clear();
        gfx.fillColor = new Color(255, 255, 255, 160);
        gfx.circle(0, 0, radius);
        gfx.fill();

        const opacity = glowNode.getComponent(UIOpacity) ?? glowNode.addComponent(UIOpacity);
        opacity.opacity = 120;
        glowNode.setSiblingIndex(0);

        this.buttonSpriteGlowNode = glowNode;
    }

    private getBaseShakeProfile() {
        const duration = GACHA_UI_CONFIG.animation.shakeDuration * (0.9 + Math.random() * 0.2);
        const intensity = GACHA_UI_CONFIG.animation.shakeIntensity * (0.9 + Math.random() * 0.2);
        return { duration, intensity };
    }

    private getRareShakeProfile(rarity: GachaRarity) {
        switch (rarity) {
            case GachaRarity.SR:
                return { duration: 0.35, intensity: GACHA_UI_CONFIG.animation.shakeIntensity * 0.9, freq: 1.25 };
            case GachaRarity.SSR:
                return { duration: 0.45, intensity: GACHA_UI_CONFIG.animation.shakeIntensity * 1.05, freq: 1.45 };
            case GachaRarity.UR:
                return { duration: 0.55, intensity: GACHA_UI_CONFIG.animation.shakeIntensity * 1.2, freq: 1.65 };
            default:
                return null;
        }
    }

    private startInteractiveShake(duration: number, intensity: number, allowBoost: boolean, frequencyMultiplier: number = 1, onComplete?: () => void) {
        if (!this.machineNode) return;
        Tween.stopAllByTarget(this.machineNode);
        this.shakeRuntimeActive = true;
        this.shakeRuntimeTime = 0;
        this.shakeRuntimeDuration = duration;
        this.shakeRuntimeIntensity = intensity;
        this.shakeRuntimeAllowBoost = allowBoost;
        this.shakeRuntimeFrequencyMultiplier = frequencyMultiplier;
        this.shakeRuntimeBasePos = this.machineNode.position.clone();
        this.shakeRuntimeOnComplete = onComplete ?? null;
    }

    private beginShakeBoost() {
        this.shakeBoost = 0;
        this.shakeBoostActive = true;
        this.lastShakeBoostAt = 0;
    }

    private endShakeBoost() {
        this.shakeBoostActive = false;
    }

    private addShakeBoost(amount: number) {
        if (!this.shakeBoostActive) return;
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (now - this.lastShakeBoostAt < 80) return;
        this.lastShakeBoostAt = now;
        this.shakeBoost = Math.min(1, this.shakeBoost + amount);
    }

    private bindShakeBoostInputs(target: Node) {
        if (this.shakeBoostBound) return;
        this.shakeBoostBound = true;
        target.on(Node.EventType.MOUSE_DOWN, () => this.addShakeBoost(0.08), this);
        target.on(Node.EventType.MOUSE_MOVE, (event: any) => {
            if (!this.shakeBoostActive) return;
            const delta = event.getDelta ? event.getDelta() : null;
            if (!delta) return;
            const dist = Math.abs(delta.x) + Math.abs(delta.y);
            if (dist > 6) {
                this.addShakeBoost(Math.min(0.12, 0.02 + dist * 0.002));
            }
        }, this);
        target.on(Node.EventType.TOUCH_START, () => this.addShakeBoost(0.08), this);
        target.on(Node.EventType.TOUCH_MOVE, (event: any) => {
            if (!this.shakeBoostActive) return;
            const delta = event.getDelta ? event.getDelta() : null;
            if (!delta) return;
            const dist = Math.abs(delta.x) + Math.abs(delta.y);
            if (dist > 6) {
                this.addShakeBoost(Math.min(0.12, 0.02 + dist * 0.002));
            }
        }, this);
    }

    private applyShakeBoostToRates(rates: { N: number; R: number; SR: number; SSR: number; UR: number }, boost: number) {
        if (boost <= 0) return rates;
        const boostSR = 0.6 * boost;
        const boostSSR = 0.2 * boost;
        const boostUR = 0.05 * boost;
        const totalBoost = boostSR + boostSSR + boostUR;
        const baseNR = rates.N + rates.R;
        if (baseNR <= 0.01) {
            return rates;
        }
        const nShare = rates.N / baseNR;
        const rShare = rates.R / baseNR;
        return {
            N: Math.max(0, rates.N - totalBoost * nShare),
            R: Math.max(0, rates.R - totalBoost * rShare),
            SR: rates.SR + boostSR,
            SSR: rates.SSR + boostSSR,
            UR: rates.UR + boostUR
        };
    }

    private playMachineMechanism(onComplete: () => void) {
        const leverNode = this.machineNode?.getChildByName('Lever') ?? null;
        const buttonNode =
            leverNode?.getChildByName('ButtonSprite') ??
            this.machineNode?.getChildByName('MachineButtonSprite') ??
            null;

        if (buttonNode) {
            Tween.stopAllByTarget(buttonNode);
            buttonNode.angle = this.machineButtonBaseAngle;
            const pressDuration = Math.max(0.18, GACHA_UI_CONFIG.animation.leverPullDuration * 0.8);
            tween(buttonNode)
                .to(pressDuration, { angle: this.machineButtonBaseAngle + this.machineButtonRotateAngle }, { easing: 'quadOut' })
                .call(() => onComplete())
                .start();
        } else {
            onComplete();
        }
    }

    private ensureMachineNode(machineId: string) {
        const existing = this.machineNodes[machineId];
        const isNewNode = !(existing && existing.isValid);
        const node = isNewNode ? GachaUIFactory.createGachaMachine(machineId) : existing;
        if (isNewNode) {
            this.layoutMachineNode(node);
        }
        if (!node.parent) {
            if (this.machineStage) {
                this.machineStage.addChild(node);
            } else if (this.contentNode) {
                this.contentNode.addChild(node);
            }
        }

        const globeNode = node.getChildByPath('Globe');
        const baseNode = node.getChildByPath('Base');
        const leverNode = node.getChildByPath('Lever');
        const globe = globeNode?.getComponent(GachaGlobe) ?? null;
        let base = baseNode?.getComponent(GachaBase) ?? null;
        let lever = leverNode?.getComponent(GachaLever) ?? null;

        let resolvedGlobeOffset = this.globeOffset;
        let resolvedGlobeSquareSize = this.globeSquareSizeOverride;
        let resolvedPolygonPoints: Vec2[] = [];
        let resolvedPolygonWorldPoints: Vec3[] = [];
        if (this.useGlobeBoundsGuide && this.globeBoundsGuide) {
            if (this.usePolygonGlobe) {
                resolvedPolygonPoints = this.getPolygonGuidePoints(this.globeBoundsGuide);
                resolvedPolygonWorldPoints = this.globeBoundsGuide.children
                    .filter((child) => child.name.startsWith('P'))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((child) => child.getWorldPosition());
            } else {
                const guideTransform = this.globeBoundsGuide.getComponent(UITransform);
                if (guideTransform) {
                    const size = guideTransform.contentSize;
                    resolvedGlobeSquareSize = new Vec2(size.width, size.height);
                }
            }
            if (this.useGuideOffset && this.machineNode) {
                const worldPos = this.globeBoundsGuide.getWorldPosition();
                const nodeTransform = this.machineNode.getComponent(UITransform);
                if (nodeTransform) {
                    const localInNode = nodeTransform.convertToNodeSpaceAR(worldPos);
                    resolvedGlobeOffset = new Vec3(localInNode.x, localInNode.y, 0);
                } else if (this.machineNode.parent) {
                    const parentTransform = this.machineNode.parent.getComponent(UITransform);
                    if (parentTransform) {
                        const localInParent = parentTransform.convertToNodeSpaceAR(worldPos);
                        const scale = this.machineNode.scale;
                        resolvedGlobeOffset = new Vec3(
                            (localInParent.x - this.machineNode.position.x) / (scale.x || 1),
                            (localInParent.y - this.machineNode.position.y) / (scale.y || 1),
                            0
                        );
                    }
                }
            }
        }

        if (globeNode) {
            globeNode.setPosition(resolvedGlobeOffset);
        }
        this.currentGlobeOffset = resolvedGlobeOffset.clone();
        if (globe) {
            globe.usePolygonBounds = this.usePolygonGlobe && resolvedPolygonPoints.length >= 3;
            globe.useSquareBounds = !globe.usePolygonBounds && this.useSquareGlobe;
            if (globe.usePolygonBounds) {
                if (resolvedPolygonWorldPoints.length >= 3) {
                    const nodeTransform = this.machineNode?.getComponent(UITransform);
                    if (nodeTransform) {
                        globe.polygonPoints = resolvedPolygonWorldPoints.map((world) => {
                            const local = nodeTransform.convertToNodeSpaceAR(world);
                            return new Vec2(local.x - resolvedGlobeOffset.x, local.y - resolvedGlobeOffset.y);
                        });
                    } else {
                        globe.polygonPoints = resolvedPolygonPoints;
                    }
                } else {
                    globe.polygonPoints = resolvedPolygonPoints;
                }
            } else if (resolvedGlobeSquareSize.x > 0 && resolvedGlobeSquareSize.y > 0) {
                globe.squareSize = resolvedGlobeSquareSize;
            }
            if (!globe.usePolygonBounds && !this.useSquareGlobe && this.globeRadiusOverride > 0) {
                globe.radius = this.globeRadiusOverride;
            }
            globe.glassLayerOffset = this.glassLayerOffset;
            globe.glassLayerScale = this.glassLayerScale;
            globe.capsuleLayerOffset = this.capsuleLayerOffset;
            globe.capsuleLayerScale = this.capsuleLayerScale;
            globe.render();
            globe.settleCapsules();
        }

        if (this.useGlobeBoundsGuide && this.globeBoundsGuide) {
            if (this.usePolygonGlobe && resolvedPolygonPoints.length >= 3) {
                this.renderGlobePolygonGuide(resolvedPolygonPoints);
            } else {
                const guideSize = (resolvedGlobeSquareSize.x > 0 && resolvedGlobeSquareSize.y > 0)
                    ? resolvedGlobeSquareSize
                    : new Vec2(
                        Math.max(1, (this.globeRadiusOverride || globe?.radius || 100) * 2),
                        Math.max(1, (this.globeRadiusOverride || globe?.radius || 100) * 2)
                    );
                this.renderGlobeBoundsGuide(guideSize);
            }
            if (this.hideGlobeGuideAtRuntime) {
                this.globeBoundsGuide.active = false;
            }
        }

        const useLayered = this.useLayeredSprites;
        const backFrame = this.getMachineBackSpriteFrame(machineId);
        const glassFrame = this.getGlassFrontSpriteFrame(machineId);
        let layeredApplied = false;

        if (useLayered && (backFrame || glassFrame)) {
            layeredApplied = true;
            const backNodeName = 'MachineBackSprite';
            const glassNodeName = 'GlassFrontSprite';

            let backNode = node.getChildByName(backNodeName);
            if (backFrame) {
                if (!backNode) {
                    backNode = new Node(backNodeName);
                    backNode.layer = Layers.Enum.UI_2D;
                    node.addChild(backNode);
                }
                backNode.active = true;
                backNode.setPosition(this.machineBackOffset);
                backNode.setScale(this.machineBackScale, this.machineBackScale, 1);
                const sprite = backNode.getComponent(Sprite) ?? backNode.addComponent(Sprite);
                sprite.spriteFrame = backFrame;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                const spriteTransform = backNode.getComponent(UITransform) ?? backNode.addComponent(UITransform);
                const size: any = backFrame.originalSize ?? backFrame.rect;
                if (size) {
                    spriteTransform.setContentSize(size.width ?? size.x, size.height ?? size.y);
                }
                backNode.setSiblingIndex(0);
            } else if (backNode) {
                backNode.active = false;
            }

            let glassNode = node.getChildByName(glassNodeName);
            if (glassFrame) {
                if (!glassNode) {
                    glassNode = new Node(glassNodeName);
                    glassNode.layer = Layers.Enum.UI_2D;
                    node.addChild(glassNode);
                }
                glassNode.active = true;
                glassNode.setPosition(this.glassFrontOffset);
                glassNode.setScale(this.glassFrontScale, this.glassFrontScale, 1);
                const sprite = glassNode.getComponent(Sprite) ?? glassNode.addComponent(Sprite);
                sprite.spriteFrame = glassFrame;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                const spriteTransform = glassNode.getComponent(UITransform) ?? glassNode.addComponent(UITransform);
                const size: any = glassFrame.originalSize ?? glassFrame.rect;
                if (size) {
                    spriteTransform.setContentSize(size.width ?? size.x, size.height ?? size.y);
                }
                glassNode.setSiblingIndex(node.children.length - 1);
            } else if (glassNode) {
                glassNode.active = false;
            }

            if (this.hideVectorPartsWhenSprite) {
                if (baseNode) baseNode.active = false;
                if (leverNode) leverNode.active = false;
            }
            if (globe) {
                globe.showGlass = !(this.hideVectorGlassWhenLayered && !!glassFrame);
                globe.render();
            }
        } else {
            const backNode = node.getChildByName('MachineBackSprite');
            if (backNode) backNode.active = false;
            const glassNode = node.getChildByName('GlassFrontSprite');
            if (glassNode) glassNode.active = false;
            if (globe) {
                globe.showGlass = true;
                globe.render();
            }
        }

        const spriteFrame = this.getMachineSpriteFrame(machineId);
        if (!layeredApplied && this.useMachineSprite && spriteFrame) {
            let spriteNode = node.getChildByName('MachineSprite');
            if (!spriteNode) {
                spriteNode = new Node('MachineSprite');
                spriteNode.layer = Layers.Enum.UI_2D;
                node.addChild(spriteNode);
            }
            spriteNode.setPosition(this.machineSpriteOffset);
            spriteNode.setScale(this.machineSpriteScale, this.machineSpriteScale, 1);
            const sprite = spriteNode.getComponent(Sprite) ?? spriteNode.addComponent(Sprite);
            sprite.spriteFrame = spriteFrame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            const spriteTransform = spriteNode.getComponent(UITransform) ?? spriteNode.addComponent(UITransform);
            const size: any = spriteFrame.originalSize ?? spriteFrame.rect;
            if (size) {
                spriteTransform.setContentSize(size.width ?? size.x, size.height ?? size.y);
            }
            spriteNode.setSiblingIndex(0);

            if (this.hideVectorPartsWhenSprite) {
                if (baseNode) baseNode.active = false;
                if (leverNode) leverNode.active = false;
            }
        }
        const buttonFrame = this.getMachineButtonSpriteFrame(machineId);
        const doorFrame = this.getMachineDoorSpriteFrame(machineId);

        const idleNode = this.applySpriteToChildNode(
            baseNode ?? null,
            'IdleSprite',
            spriteFrame,
            this.machineSpriteOffset,
            this.machineSpriteScale,
            new Vec2(0.5, 0.5)
        );
        if (idleNode && baseNode) {
            const graphics = baseNode.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
            }
            if (base) {
                base.enabled = false;
            }
        }

        const buttonNode = this.applySpriteToChildNode(
            leverNode ?? null,
            'ButtonSprite',
            buttonFrame,
            this.machineButtonOffset,
            this.machineButtonScale,
            this.machineButtonPivot
        );
        if (buttonNode) {
            buttonNode.angle = this.machineButtonBaseAngle;
            if (this.useButtonSpriteAsPullButton) {
                this.ensureButtonSpritePullButton(buttonNode);
            }
        }
        if (!buttonNode && this.buttonSpritePullNode) {
            this.buttonSpritePullNode = null;
            this.buttonSpriteGlowNode = null;
        }
        if (leverNode) {
            const graphics = leverNode.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
            }
        }
        if (lever) {
            lever.enabled = false;
        }

        let doorNode = node.getChildByName('Door');
        if (doorFrame) {
            if (!doorNode) {
                doorNode = new Node('Door');
                doorNode.layer = Layers.Enum.UI_2D;
                node.addChild(doorNode);
            }
            doorNode.active = true;
            this.applySpriteToNode(
                doorNode,
                doorFrame,
                this.machineDoorOffset,
                this.machineDoorScale,
                this.machineDoorPivot
            );
            (doorNode as any).__closedPos = doorNode.position.clone();
            (doorNode as any).__baseScale = doorNode.scale.clone();
            doorNode.angle = this.machineDoorClosedAngle;
            if (this.hideDoorWhenClosed) {
                doorNode.active = false;
            }
            doorNode.setSiblingIndex(node.children.length - 1);
        } else if (doorNode) {
            doorNode.active = false;
        }

        if ((spriteFrame || buttonFrame || doorFrame) && this.hideVectorPartsWhenSprite) {
            if (baseNode) baseNode.active = !!spriteFrame;
            if (leverNode) leverNode.active = !!buttonFrame;
        }

        const oldButton = node.getChildByName('MachineButtonSprite');
        if (oldButton) oldButton.active = false;
        const oldDoor = node.getChildByName('MachineDoorSprite');
        if (oldDoor) oldDoor.active = false;
        const glassOverlay = node.getChildByName('GlassFrontSprite');
        if (glassOverlay && glassOverlay.active) {
            glassOverlay.setSiblingIndex(node.children.length - 1);
        }

        if (globe) {
            this.machineComponents[machineId] = { globe, base: base ?? null, lever: lever ?? null };
        } else {
            console.error('[GachaMachine] Failed to create machine components for', machineId);
        }

        this.machineNodes[machineId] = node;
    }

    private applyMachineState() {
        const state = this.getMachineState();
        if (!this.globeComponent) return;

        if (state.isSoldOut) {
            this.globeComponent.emptyCapsules();
            state.remainingCapsules = 0;
            return;
        }

        const currentCount = this.globeComponent.getRemainingCapsules();
        if (state.remainingCapsules > 0 && currentCount !== state.remainingCapsules) {
            this.globeComponent.resetCapsules(state.remainingCapsules);
        } else if (state.remainingCapsules === 0 && currentCount > 0) {
            state.remainingCapsules = currentCount;
        }
    }

    private activateMachine(machineId: string) {
        this.ensureMachineNode(machineId);
        Object.entries(this.machineNodes).forEach(([id, node]) => {
            if (node && node.isValid) {
                node.active = id === machineId;
            }
        });
        this.machineNode = this.machineNodes[machineId];
        const comps = this.machineComponents[machineId];
        if (comps) {
            this.globeComponent = comps.globe;
            this.baseComponent = comps.base;
            this.leverComponent = comps.lever;
        }

        const tier = GACHA_CONFIG.machines[machineId];
        if (this.globeComponent) {
            this.globeComponent.setRarityWeights(tier.dropRates);
        }

        this.applyMachineState();
        if (this.dropFxLayer && this.machineStage) {
            this.dropFxLayer.setPosition(this.machineStage.position);
        }
    }

    private setupShopButton() {
        // Beautify button with cel-shading style
        const hasSprite = !!this.shopButton.getComponent(Sprite);
        let graphics = this.shopButton.getComponent(Graphics);
        if (!graphics && !hasSprite) {
            graphics = this.shopButton.addComponent(Graphics);
        }
        if (!graphics) {
            return;
        }

        // Ensure button component exists
        let btnComp = this.shopButton.getComponent(Button);
        if (!btnComp) {
            btnComp = this.shopButton.addComponent(Button);
        }

        // Draw button background
        graphics.clear();
        const w = 100;
        const h = 80;

        // Shadow/Outline
        graphics.strokeColor = Color.BLACK;
        graphics.lineWidth = 4;
        graphics.fillColor = new Color(20, 160, 170, 255); // Teal base

        // Draw rounded rect
        graphics.roundRect(-w/2, -h/2, w, h, 15);
        graphics.fill();
        graphics.stroke();

        // Highlight
        graphics.fillColor = new Color(255, 255, 255, 50);
        graphics.roundRect(-w/2 + 5, h/2 - 25, w - 10, 15, 8);
        graphics.fill();

        // Add label if not exists
        let lblNode = this.shopButton.getChildByName('Label');
        if (!lblNode) {
            lblNode = new Node('Label');
            lblNode.parent = this.shopButton;
            const lbl = lblNode.addComponent(Label);
            lbl.string = "扭蛋";
            lbl.fontSize = 28;
            lbl.color = Color.WHITE;
            lbl.enableOutline = true;
            lbl.outlineColor = Color.BLACK;
            lbl.outlineWidth = 2;
        }

        // Bind click event
        this.shopButton.on(Node.EventType.TOUCH_END, this.toggleShopPanel, this);

        // Button animation on press
        this.shopButton.on(Node.EventType.TOUCH_START, () => {
            tween(this.shopButton).to(0.1, { scale: new Vec3(0.9, 0.9, 1) }).start();
        }, this);

        this.shopButton.on(Node.EventType.TOUCH_END, () => {
            tween(this.shopButton).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
        }, this);

        this.shopButton.on(Node.EventType.TOUCH_CANCEL, () => {
            tween(this.shopButton).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
        }, this);
    }

    private toggleShopPanel() {
        console.log('[GachaMachine] toggleShopPanel called, isPanelOpen:', this.isPanelOpen);
        if (this.isPanelOpen) {
            this.closeShopPanel();
        } else {
            this.openShopPanel();
        }
    }

    private openShopPanel() {
        console.log('[GachaMachine] openShopPanel called');
        if (this.isPanelOpen) return;
        this.isPanelOpen = true;
        EventSystemIntegration.setGlobalSuppressed(true);
        this.ensureWalletSnapshot();

        // Create panel if it doesn't exist
        if (!this.shopPanel) {
            console.log('[GachaMachine] Creating new shop panel');
            this.createShopPanel();
        }
        if (this.hideGlobeGuideAtRuntime && this.globeBoundsGuide) {
            this.globeBoundsGuide.active = false;
        }

        console.log('[GachaMachine] Setting panel active and animating');
        if (this.modalBlocker) {
            this.modalBlocker.active = true;
        }
        this.setExternalButtonsInteractable(false);
        this.shopPanel.active = true;
        this.setPanelInteractable(true);
        this.shopPanel.scale = new Vec3(0, 0, 1);
        tween(this.shopPanel)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        this.updateWalletDisplay();
        this.refreshMachineVisuals();
        this.startTimeTicker();
        console.log('[GachaMachine] openShopPanel completed');
    }

    private closeShopPanel() {
        if (!this.isPanelOpen) return;

        tween(this.shopPanel)
            .to(0.2, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => {
                this.isPanelOpen = false;
                EventSystemIntegration.setGlobalSuppressed(false);
                this.shopPanel.active = false;
                if (this.modalBlocker) {
                    this.modalBlocker.active = false;
                }
                this.hideTooltip();
                this.setExternalButtonsInteractable(true);
                this.stopTimeTicker();
                this.syncCurrentMachineState();
                this.saveProgress();
            })
            .start();
    }

    private createShopPanel() {
        // 1. Create Main Container
        this.shopPanel = new Node('GachaPanel');
        // 确保 UITransform 存在并设置尺寸
        let panelTransform = this.shopPanel.getComponent(UITransform);
        if (!panelTransform) {
            panelTransform = this.shopPanel.addComponent(UITransform);
        }
        panelTransform.setContentSize(GACHA_CONFIG.ui.panelWidth, GACHA_CONFIG.ui.panelHeight);

        // 查找 Canvas 节点作为面板的父节点
        let canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) {
            const scene = director.getScene();
            if (scene && scene.children.length > 0) {
                canvas = scene.children[0];
            }
        }

        if (canvas) {
            canvas.addChild(this.shopPanel);
        } else {
            this.node.addChild(this.shopPanel);
        }
        this.uiRoot = canvas ?? this.node;

        this.shopPanel.layer = Layers.Enum.UI_2D;
        this.shopPanel.setPosition(0, 0, 0);
        this.shopPanel.setSiblingIndex(9999);

        const w = GACHA_CONFIG.ui.panelWidth;
        const h = GACHA_CONFIG.ui.panelHeight;
        const bgHeight = this.panelBackgroundHeightOverride > 0 ? this.panelBackgroundHeightOverride : h;
        const bgImageHeight = this.bgImageHeightOverride > 0 ? this.bgImageHeightOverride : (h - 16);
        const uiShiftY = this.uiGlobalShiftY;
        const panelPadding = 36;
        const leftColumnWidth = 320;
        const leftColumnX = -w / 2 + panelPadding + leftColumnWidth / 2;
        const machineStageSize = {
            width: this.machineStageSizeOverride.x > 0 ? this.machineStageSizeOverride.x : 400,
            height: this.machineStageSizeOverride.y > 0 ? this.machineStageSizeOverride.y : 460
        };
        const machineStageX = 3.289;
        const machineStageY = 5.014;
        const machineStageScale = this.machineStageScaleOverride;
        const headerHeight = 60;
        const headerTopPadding = 10;
        const headerRowY = bgHeight / 2 - headerTopPadding - headerHeight / 2 + this.headerRowYOffset;
        const tabWidth = 140;
        const tabHeight = 40;
        const tabSpacing = 18;
        const stageWidth = machineStageSize.width * machineStageScale;
        const stageHeight = machineStageSize.height * machineStageScale;
        const highlightY = headerRowY + headerHeight / 2 - 20;

        // 2. Fullscreen input blocker (block outside UI)
        const canvasTransform = canvas?.getComponent(UITransform);
        const viewSize = canvasTransform?.contentSize ?? view.getVisibleSize();
        this.modalBlocker = new Node('GachaModalBlocker');
        this.modalBlocker.addComponent(UITransform).setContentSize(viewSize.width, viewSize.height);
        const modalBg = new Node('ModalBg');
        modalBg.parent = this.modalBlocker;
        const modalBgTransform = modalBg.addComponent(UITransform);
        modalBgTransform.setContentSize(viewSize.width, viewSize.height);
        const modalSprite = modalBg.addComponent(Sprite);
        modalSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        modalSprite.color = new Color(255, 255, 255, 255);
        this.loadGachaBackground(modalSprite);

        const modalDim = new Node('ModalDim');
        modalDim.parent = this.modalBlocker;
        const modalDimTransform = modalDim.addComponent(UITransform);
        modalDimTransform.setContentSize(viewSize.width, viewSize.height);
        const blockerGfx = modalDim.addComponent(Graphics);
        blockerGfx.fillColor = new Color(0, 0, 0, 120);
        blockerGfx.rect(-viewSize.width / 2, -viewSize.height / 2, viewSize.width, viewSize.height);
        blockerGfx.fill();
        this.modalBlocker.addComponent(Button);
        this.modalBlocker.addComponent(BlockInputEvents);
        this.modalBlocker.layer = Layers.Enum.UI_2D;
        this.modalBlocker.on(Node.EventType.TOUCH_START, (event) => event.propagationStopped = true);
        this.modalBlocker.on(Node.EventType.TOUCH_END, (event) => event.propagationStopped = true);
        if (this.shopPanel.parent) {
            this.shopPanel.parent.addChild(this.modalBlocker);
            this.modalBlocker.setSiblingIndex(this.shopPanel.getSiblingIndex());
            this.shopPanel.setSiblingIndex(this.modalBlocker.getSiblingIndex() + 1);
        }
        this.modalBlocker.active = false;

        // 3. Background (solid, no pattern)
        const bgNode = new Node('Background');
        bgNode.parent = this.shopPanel;
        bgNode.layer = Layers.Enum.UI_2D;
        // 确保 UITransform
        let bgTransform = bgNode.getComponent(UITransform);
        if (!bgTransform) {
            bgTransform = bgNode.addComponent(UITransform);
        }
        bgTransform.setContentSize(w, bgHeight);
        const bgGraphics = bgNode.addComponent(Graphics);
        const radius = GACHA_CONFIG.ui.cornerRadius;

        // Draw Black Outer Border
        bgGraphics.lineWidth = GACHA_CONFIG.ui.borderWidth;
        bgGraphics.strokeColor = Color.BLACK;
        const bgFill = new Color().fromHEX(GACHA_CONFIG.ui.colors.bgGradientStart);
        bgFill.a = 80;
        bgGraphics.fillColor = bgFill;
        bgGraphics.roundRect(-w/2, -bgHeight/2, w, bgHeight, radius);
        bgGraphics.fill();
        bgGraphics.stroke();

        // Draw Inner Neon Border
        bgGraphics.lineWidth = 2;
        bgGraphics.strokeColor = new Color().fromHEX(GACHA_CONFIG.ui.colors.innerBorder);
        bgGraphics.roundRect(-w/2 + 8, -bgHeight/2 + 8, w - 16, bgHeight - 16, radius - 8);
        bgGraphics.stroke();

        // Draw Top Highlight
        bgGraphics.fillColor = GACHA_CONFIG.ui.colors.highlight;
        bgGraphics.roundRect(-w/2 + 15, highlightY, w - 30, 30, 15);
        bgGraphics.fill();

        // 3. Stars in Corners（保持不变）
        this.drawStar(bgGraphics, -w/2 + 30, bgHeight/2 - 30, 15);
        this.drawStar(bgGraphics, w/2 - 30, bgHeight/2 - 30, 15);
        this.drawStar(bgGraphics, -w/2 + 30, -bgHeight/2 + 30, 10);
        this.drawStar(bgGraphics, w/2 - 30, -bgHeight/2 + 30, 10);

        // 3.2 Background tint (no image)
        const bgImageNode = new Node('BgImage');
        bgImageNode.parent = this.shopPanel;
        bgImageNode.layer = Layers.Enum.UI_2D;
        const bgImageTransform = bgImageNode.addComponent(UITransform);
        bgImageTransform.setContentSize(w - 16, bgImageHeight);
        const bgTint = bgImageNode.addComponent(Graphics);
        bgTint.fillColor = new Color(15, 20, 26, 80);
        bgTint.rect(-(w - 16) / 2, -(bgImageHeight) / 2, w - 16, bgImageHeight);
        bgTint.fill();

        // 3.5 Layers (content + fx)
        this.contentNode = new Node('ContentLayer');
        this.contentNode.addComponent(UITransform).setContentSize(w, h);
        this.shopPanel.addChild(this.contentNode);

        this.fxLayer = new Node('FxLayer');
        this.fxLayer.addComponent(UITransform).setContentSize(w, h);
        this.shopPanel.addChild(this.fxLayer);

        this.dropFxLayer = new Node('DropFxLayer');
        this.dropFxLayer.addComponent(UITransform).setContentSize(w, h);
        this.fxLayer.addChild(this.dropFxLayer);

        // 4. Header Bar
        const headerNode = new Node('HeaderBar');
        headerNode.parent = this.contentNode;
        const headerGfx = headerNode.addComponent(Graphics);
        headerGfx.fillColor = new Color(20, 28, 34, 255);
        headerGfx.roundRect(-w/2 + 10, headerRowY - headerHeight / 2, w - 20, headerHeight, 18);
        headerGfx.fill();

        // 5. Title
        const titleNode = new Node('Title');
        titleNode.parent = this.contentNode;
        titleNode.setPosition(-w / 2 + 190, headerRowY);
        const titleLbl = titleNode.addComponent(Label);
        titleLbl.string = GACHA_CONFIG.shopName;
        titleLbl.fontSize = 32;
        titleLbl.isBold = true;
        titleLbl.color = Color.WHITE;
        titleLbl.horizontalAlign = Label.HorizontalAlign.LEFT;
        titleLbl.enableOutline = true;
        titleLbl.outlineColor = Color.BLACK;
        titleLbl.outlineWidth = 3;

        // 6. Back Button
        this.closeButton = GachaUIFactory.createCelButton(
            '返回摊位',
            GACHA_UI_CONFIG.themes.normal.base.colors,
            140,
            42,
            false
        );
        this.closeButton.name = 'BackButton';
        this.closeButton.parent = this.contentNode;
        this.closeButton.setPosition(w / 2 - 120, headerRowY);
        this.closeButton.on(Node.EventType.TOUCH_END, this.closeShopPanel, this);

        // 7. Wallet Display
        const walletNode = new Node('Wallet');
        walletNode.parent = modalBg;
        walletNode.setPosition(viewSize.width / 2 - 150, viewSize.height / 2 - 40);
        const walletTransform = walletNode.addComponent(UITransform);
        walletTransform.setContentSize(240, 46);
        const walletGfx = walletNode.addComponent(Graphics);
        walletGfx.fillColor = new Color(10, 14, 20, 160);
        walletGfx.roundRect(-120, -23, 240, 46, 12);
        walletGfx.fill();
        walletGfx.strokeColor = Color.BLACK;
        walletGfx.lineWidth = 3;
        walletGfx.stroke();
        const walletLabelNode = new Node('WalletLabel');
        walletLabelNode.parent = walletNode;
        this.walletLabel = walletLabelNode.addComponent(Label);
        this.walletLabel.fontSize = 26;
        this.walletLabel.isBold = true;
        this.walletLabel.color = Color.YELLOW;
        this.walletLabel.horizontalAlign = Label.HorizontalAlign.RIGHT;
        this.walletLabel.enableOutline = true;
        this.walletLabel.outlineColor = Color.BLACK;
        this.walletLabel.outlineWidth = 3;

        // 7.2 Time Display
        const timeNode = new Node('ShopTime');
        timeNode.parent = modalBg;
        timeNode.setPosition(-viewSize.width / 2 + 150, viewSize.height / 2 - 40);
        const timeTransform = timeNode.addComponent(UITransform);
        timeTransform.setContentSize(240, 46);
        const timeGfx = timeNode.addComponent(Graphics);
        timeGfx.fillColor = new Color(10, 14, 20, 160);
        timeGfx.roundRect(-120, -23, 240, 46, 12);
        timeGfx.fill();
        timeGfx.strokeColor = Color.BLACK;
        timeGfx.lineWidth = 3;
        timeGfx.stroke();
        const timeLabelNode = new Node('TimeLabel');
        timeLabelNode.parent = timeNode;
        this.shopTimeLabel = timeLabelNode.addComponent(Label);
        this.shopTimeLabel.fontSize = 24;
        this.shopTimeLabel.isBold = true;
        this.shopTimeLabel.color = Color.WHITE;
        this.shopTimeLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.shopTimeLabel.enableOutline = true;
        this.shopTimeLabel.outlineColor = Color.BLACK;
        this.shopTimeLabel.outlineWidth = 3;

        // 7. Tabs Container
        this.tabsContainer = new Node('Tabs');
        this.tabsContainer.parent = this.contentNode;
        this.tabsContainer.setPosition(
            machineStageX - stageWidth / 2 - tabWidth / 2 - 16,
            machineStageY + stageHeight / 2 - tabHeight / 2 - 8
        );
        this.createTabs();

        // 8. 右上角扭蛋机视角区域
        this.machineStage = new Node('MachineStage');
        this.machineStage.parent = this.contentNode;
        this.machineStage.setPosition(machineStageX, machineStageY);
        if (machineStageScale !== 1) {
            this.machineStage.setScale(new Vec3(machineStageScale, machineStageScale, 1));
        }
        const stageTransform = this.machineStage.addComponent(UITransform);
        stageTransform.setContentSize(machineStageSize.width, machineStageSize.height);
        stageTransform.setAnchorPoint(this.machineStageAnchorOverride);
        const stageGfx = this.machineStage.addComponent(Graphics);
        stageGfx.fillColor = new Color(12, 18, 24, 200);
        stageGfx.roundRect(-machineStageSize.width / 2, -machineStageSize.height / 2, machineStageSize.width, machineStageSize.height, 18);
        stageGfx.fill();
        stageGfx.strokeColor = Color.BLACK;
        stageGfx.lineWidth = 4;
        stageGfx.roundRect(-machineStageSize.width / 2, -machineStageSize.height / 2, machineStageSize.width, machineStageSize.height, 18);
        stageGfx.stroke();
        stageGfx.strokeColor = new Color().fromHEX(GACHA_CONFIG.ui.colors.innerBorder);
        stageGfx.lineWidth = 2;
        stageGfx.roundRect(-machineStageSize.width / 2 + 6, -machineStageSize.height / 2 + 6, machineStageSize.width - 12, machineStageSize.height - 12, 14);
        stageGfx.stroke();

        this.bindShakeBoostInputs(this.machineStage);

        this.activateMachine(this.currentMachineId);
        if (this.dropFxLayer) {
            this.dropFxLayer.setPosition(this.machineStage.position);
        }

        // 9.5 Hint Label (status bar)
        const hintNode = new Node('Hint');
        hintNode.parent = this.contentNode;
        hintNode.setPosition(4.704, 190.088);
        this.hintLabel = hintNode.addComponent(Label);
        this.hintLabel.fontSize = 20;
        this.hintLabel.color = Color.WHITE;
        this.hintLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.hintLabel.enableOutline = true;
        this.hintLabel.outlineColor = Color.BLACK;
        this.hintLabel.outlineWidth = 2;

        // 9.6 Probability Icon (hover for rates)
        const probabilityNode = new Node('ProbabilityIcon');
        probabilityNode.parent = this.contentNode;
        const probabilityPos = this.useProbabilityIconPositionOverride
            ? this.probabilityIconPositionOverride
            : new Vec2(240, 190.088);
        probabilityNode.setPosition(probabilityPos.x, probabilityPos.y);
        probabilityNode.addComponent(BlockInputEvents);
        const probabilityTransform = probabilityNode.addComponent(UITransform);
        probabilityTransform.setContentSize(34, 34);
        this.probabilityIcon = probabilityNode;
        this.probabilityIconGfx = probabilityNode.addComponent(Graphics);
        const probLabelNode = new Node('Label');
        probLabelNode.parent = probabilityNode;
        this.probabilityIconLabel = probLabelNode.addComponent(Label);
        this.probabilityIconLabel.string = '%';
        this.probabilityIconLabel.fontSize = 18;
        this.probabilityIconLabel.isBold = true;
        this.probabilityIconLabel.color = Color.WHITE;
        this.probabilityIconLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.probabilityIconLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.probabilityIconLabel.enableOutline = true;
        this.probabilityIconLabel.outlineColor = Color.BLACK;
        this.probabilityIconLabel.outlineWidth = 2;
        this.bindTooltipDynamic(probabilityNode, () => this.getProbabilityTooltipText());

        // 10. Result Display Area
        this.resultNode = new Node('ResultDisplay');
        this.resultNode.parent = this.fxLayer;
        this.resultNode.setPosition(this.getResultAnchorPosition());
        this.resultNode.active = false;

        // 10.1 Batch Result Display Area
        this.batchResultNode = new Node('BatchResultDisplay');
        this.batchResultNode.parent = this.fxLayer;
        const batchPos = this.getResultAnchorPosition();
        this.batchResultNode.setPosition(new Vec3(batchPos.x, batchPos.y - 40, 0));
        this.batchResultNode.active = false;

        // 11. Status Bar
        const statusBar = new Node('StatusBar');
        statusBar.parent = this.contentNode;
        statusBar.setPosition(-1.762, -96.885 + uiShiftY);
        const statusGfx = statusBar.addComponent(Graphics);
        statusGfx.fillColor = new Color(22, 32, 38, 255);
        statusGfx.roundRect(-w/2 + 30, -h/2 + 130, w - 60, 56, 16);
        statusGfx.fill();

        // 12. Pity/Unlucky Vertical Bars (right side, mirror Tabs)
        const rightBarWidth = 90;
        const rightBarHeight = 170;
        const pityBarPos = new Vec2(337.705, -159.228);
        const unluckyBarPos = new Vec2(333.384, -311.946);

        const pityContainer = new Node('PityBar');
        pityContainer.parent = this.contentNode;
        pityContainer.setPosition(pityBarPos.x, pityBarPos.y);
        const pityTransform = pityContainer.addComponent(UITransform);
        pityTransform.setContentSize(rightBarWidth, rightBarHeight);
        const pityBg = pityContainer.addComponent(Graphics);
        pityBg.fillColor = new Color(26, 20, 14, 210);
        pityBg.roundRect(-rightBarWidth / 2, -rightBarHeight / 2, rightBarWidth, rightBarHeight, 12);
        pityBg.fill();
        pityBg.strokeColor = Color.BLACK;
        pityBg.lineWidth = 3;
        pityBg.stroke();

        const pityIcon = new Node('PityIcon');
        pityIcon.parent = pityContainer;
        pityIcon.setPosition(0, rightBarHeight / 2 - 20, 0);
        const pityIconGfx = pityIcon.addComponent(Graphics);
        pityIconGfx.fillColor = new Color(255, 206, 96, 255);
        pityIconGfx.circle(0, 0, 14);
        pityIconGfx.fill();
        pityIconGfx.strokeColor = Color.BLACK;
        pityIconGfx.lineWidth = 3;
        pityIconGfx.stroke();
        const pityIconLabelNode = new Node('PityIconLabel');
        pityIconLabelNode.parent = pityIcon;
        const pityIconLabel = pityIconLabelNode.addComponent(Label);
        pityIconLabel.string = '保';
        pityIconLabel.fontSize = 14;
        pityIconLabel.isBold = true;
        pityIconLabel.color = Color.BLACK;
        pityIconLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        pityIconLabel.verticalAlign = Label.VerticalAlign.CENTER;

        const pityTitleNode = new Node('PityTitle');
        pityTitleNode.parent = pityContainer;
        pityTitleNode.setPosition(0, rightBarHeight / 2 - 44, 0);
        this.pityTitleLabel = pityTitleNode.addComponent(Label);
        this.pityTitleLabel.string = '保底';
        this.pityTitleLabel.fontSize = 14;
        this.pityTitleLabel.isBold = true;
        this.pityTitleLabel.color = new Color(255, 230, 170);
        this.pityTitleLabel.enableOutline = true;
        this.pityTitleLabel.outlineColor = Color.BLACK;
        this.pityTitleLabel.outlineWidth = 2;

        const pitySegmentsNode = new Node('PitySegments');
        pitySegmentsNode.parent = pityContainer;
        pitySegmentsNode.setPosition(0, -6, 0);
        const hardPity = GACHA_CONFIG.pitySystem.hardPity;
        const segW = 10;
        const segH = 5;
        const segGap = 3;
        const segTotal = hardPity * segH + (hardPity - 1) * segGap;
        const segStartY = segTotal / 2;
        this.pitySegmentNodes = [];
        for (let i = 0; i < hardPity; i++) {
            const seg = new Node(`PitySeg_${i}`);
            seg.parent = pitySegmentsNode;
            seg.setPosition(0, segStartY - i * (segH + segGap), 0);
            const segGfx = seg.addComponent(Graphics);
            (seg as any).__seg = { type: 'rect', w: segW, h: segH, radius: 3 };
            segGfx.roundRect(-segW / 2, -segH / 2, segW, segH, 3);
            segGfx.fillColor = new Color(70, 70, 70, 255);
            segGfx.fill();
            segGfx.strokeColor = Color.BLACK;
            segGfx.lineWidth = 2;
            segGfx.stroke();
            this.pitySegmentNodes.push(seg);
        }

        const pityCountNode = new Node('PityCount');
        pityCountNode.parent = pityContainer;
        pityCountNode.setPosition(0, -rightBarHeight / 2 + 12, 0);
        this.pityLabel = pityCountNode.addComponent(Label);
        this.pityLabel.fontSize = 13;
        this.pityLabel.isBold = true;
        this.pityLabel.color = Color.WHITE;
        this.pityLabel.enableOutline = true;
        this.pityLabel.outlineColor = Color.BLACK;
        this.pityLabel.outlineWidth = 2;
        this.bindTooltip(pityContainer, '软保底：8抽起稀有率+2%，10抽必出SR+');

        const unluckyStreakContainer = new Node('UnluckyStreakDisplay');
        unluckyStreakContainer.parent = this.contentNode;
        unluckyStreakContainer.setPosition(unluckyBarPos.x, unluckyBarPos.y);
        const unluckyTransform = unluckyStreakContainer.addComponent(UITransform);
        unluckyTransform.setContentSize(rightBarWidth, rightBarHeight);
        const unluckyBg = unluckyStreakContainer.addComponent(Graphics);
        unluckyBg.fillColor = new Color(20, 16, 28, 210);
        unluckyBg.roundRect(-rightBarWidth / 2, -rightBarHeight / 2, rightBarWidth, rightBarHeight, 12);
        unluckyBg.fill();
        unluckyBg.strokeColor = Color.BLACK;
        unluckyBg.lineWidth = 3;
        unluckyBg.stroke();

        const unluckyIcon = new Node('UnluckyIcon');
        unluckyIcon.parent = unluckyStreakContainer;
        unluckyIcon.setPosition(0, rightBarHeight / 2 - 20, 0);
        const unluckyIconGfx = unluckyIcon.addComponent(Graphics);
        unluckyIconGfx.fillColor = new Color(170, 110, 220, 255);
        unluckyIconGfx.circle(0, 0, 14);
        unluckyIconGfx.fill();
        unluckyIconGfx.strokeColor = Color.BLACK;
        unluckyIconGfx.lineWidth = 3;
        unluckyIconGfx.stroke();
        const unluckyIconLabelNode = new Node('UnluckyIconLabel');
        unluckyIconLabelNode.parent = unluckyIcon;
        const unluckyIconLabel = unluckyIconLabelNode.addComponent(Label);
        unluckyIconLabel.string = '厄';
        unluckyIconLabel.fontSize = 14;
        unluckyIconLabel.isBold = true;
        unluckyIconLabel.color = Color.BLACK;
        unluckyIconLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        unluckyIconLabel.verticalAlign = Label.VerticalAlign.CENTER;

        const unluckyTitleNode = new Node('UnluckyTitle');
        unluckyTitleNode.parent = unluckyStreakContainer;
        unluckyTitleNode.setPosition(0, rightBarHeight / 2 - 44, 0);
        this.unluckyTitleLabel = unluckyTitleNode.addComponent(Label);
        this.unluckyTitleLabel.string = '厄运';
        this.unluckyTitleLabel.fontSize = 14;
        this.unluckyTitleLabel.isBold = true;
        this.unluckyTitleLabel.color = new Color(210, 170, 255);
        this.unluckyTitleLabel.enableOutline = true;
        this.unluckyTitleLabel.outlineColor = Color.BLACK;
        this.unluckyTitleLabel.outlineWidth = 2;

        const unluckySegmentsNode = new Node('UnluckySegments');
        unluckySegmentsNode.parent = unluckyStreakContainer;
        unluckySegmentsNode.setPosition(0, -6, 0);
        const unluckyThreshold = GACHA_CONFIG.pitySystem.unluckyStreakThreshold;
        const dotRadius = 4;
        const dotGap = 8;
        const dotTotal = unluckyThreshold * dotRadius * 2 + (unluckyThreshold - 1) * dotGap;
        const dotStartY = dotTotal / 2;
        this.unluckySegmentNodes = [];
        for (let i = 0; i < unluckyThreshold; i++) {
            const dot = new Node(`UnluckyDot_${i}`);
            dot.parent = unluckySegmentsNode;
            dot.setPosition(0, dotStartY - i * (dotRadius * 2 + dotGap), 0);
            const dotGfx = dot.addComponent(Graphics);
            (dot as any).__seg = { type: 'circle', r: dotRadius };
            dotGfx.circle(0, 0, dotRadius);
            dotGfx.fillColor = new Color(80, 70, 90, 255);
            dotGfx.fill();
            dotGfx.strokeColor = Color.BLACK;
            dotGfx.lineWidth = 2;
            dotGfx.stroke();
            this.unluckySegmentNodes.push(dot);
        }

        const unluckyCountNode = new Node('UnluckyCount');
        unluckyCountNode.parent = unluckyStreakContainer;
        unluckyCountNode.setPosition(0, -rightBarHeight / 2 + 12, 0);
        this.unluckyStreakLabel = unluckyCountNode.addComponent(Label);
        this.unluckyStreakLabel.fontSize = 13;
        this.unluckyStreakLabel.isBold = true;
        this.unluckyStreakLabel.color = new Color(210, 170, 255);
        this.unluckyStreakLabel.enableOutline = true;
        this.unluckyStreakLabel.outlineColor = Color.BLACK;
        this.unluckyStreakLabel.outlineWidth = 2;
        this.bindTooltip(unluckyStreakContainer, '3连不中SR+，下一抽必出SR');

        this.refreshMachineVisuals();
    }

    private drawStar(ctx: Graphics, x: number, y: number, r: number) {
        ctx.fillColor = new Color().fromHEX(GACHA_CONFIG.ui.colors.star);
        ctx.strokeColor = Color.BLACK;
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const angle = (i * 72 - 90) * Math.PI / 180;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);

            const angle2 = (i * 72 + 36 - 90) * Math.PI / 180;
            const px2 = x + Math.cos(angle2) * (r * 0.4);
            const py2 = y + Math.sin(angle2) * (r * 0.4);
            ctx.lineTo(px2, py2);
        }
        ctx.close();
        ctx.fill();
        ctx.stroke();
    }

    private renderSegment(node: Node, color: Color) {
        const gfx = node.getComponent(Graphics);
        if (!gfx) return;
        const meta = (node as any).__seg as { type: string; w?: number; h?: number; r?: number; radius?: number };
        gfx.clear();
        if (meta?.type === 'circle' && meta.r) {
            gfx.circle(0, 0, meta.r);
        } else if (meta?.w && meta.h) {
            gfx.roundRect(-meta.w / 2, -meta.h / 2, meta.w, meta.h, meta.radius ?? 3);
        } else {
            gfx.rect(-6, -3, 12, 6);
        }
        gfx.fillColor = color;
        gfx.fill();
        gfx.strokeColor = Color.BLACK;
        gfx.lineWidth = 2;
        gfx.stroke();
    }

    private renderGlobeBoundsGuide(size: Vec2) {
        if (!this.globeBoundsGuide) return;
        const guide = this.globeBoundsGuide;
        const parent = guide.parent;
        if (parent) {
            guide.setSiblingIndex(parent.children.length - 1);
        }
        let transform = guide.getComponent(UITransform);
        if (!transform) {
            transform = guide.addComponent(UITransform);
        }
        transform.setContentSize(size.x, size.y);
        let gfx = guide.getComponent(Graphics);
        if (!gfx) {
            gfx = guide.addComponent(Graphics);
        }
        gfx.clear();
        gfx.lineWidth = 2;
        gfx.strokeColor = new Color(70, 220, 255, 200);
        gfx.fillColor = new Color(70, 220, 255, 40);
        gfx.rect(-size.x / 2, -size.y / 2, size.x, size.y);
        gfx.fill();
        gfx.stroke();
    }

    private getPolygonGuidePoints(guide: Node): Vec2[] {
        const points = guide.children
            .filter((child) => child.name.startsWith('P'))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((child) => new Vec2(child.position.x, child.position.y));
        return points;
    }

    private renderGlobePolygonGuide(points: Vec2[]) {
        if (!this.globeBoundsGuide || points.length < 3) return;
        const guide = this.globeBoundsGuide;
        const parent = guide.parent;
        if (parent) {
            guide.setSiblingIndex(parent.children.length - 1);
        }
        let transform = guide.getComponent(UITransform);
        if (!transform) {
            transform = guide.addComponent(UITransform);
        }
        const bounds = this.getPolygonBounds(points);
        transform.setContentSize(bounds.width, bounds.height);
        let gfx = guide.getComponent(Graphics);
        if (!gfx) {
            gfx = guide.addComponent(Graphics);
        }
        gfx.clear();
        gfx.lineWidth = 2;
        gfx.strokeColor = new Color(70, 220, 255, 200);
        gfx.fillColor = new Color(70, 220, 255, 40);
        gfx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            gfx.lineTo(points[i].x, points[i].y);
        }
        gfx.close();
        gfx.fill();
        gfx.stroke();

        gfx.fillColor = new Color(255, 255, 255, 160);
        points.forEach((p) => {
            gfx.circle(p.x, p.y, 6);
            gfx.fill();
        });

        guide.children
            .filter((child) => child.name.startsWith('P'))
            .forEach((child) => this.renderGuidePointHandle(child));
    }

    private renderGuidePointHandle(node: Node) {
        let transform = node.getComponent(UITransform);
        if (!transform) {
            transform = node.addComponent(UITransform);
        }
        transform.setContentSize(16, 16);
        let gfx = node.getComponent(Graphics);
        if (!gfx) {
            gfx = node.addComponent(Graphics);
        }
        gfx.clear();
        gfx.lineWidth = 2;
        gfx.strokeColor = new Color(0, 0, 0, 200);
        gfx.fillColor = new Color(255, 255, 255, 220);
        gfx.circle(0, 0, 6);
        gfx.fill();
        gfx.stroke();
    }

    private getPolygonBounds(points: Vec2[]) {
        let minX = points[0].x;
        let maxX = points[0].x;
        let minY = points[0].y;
        let maxY = points[0].y;
        points.forEach((p) => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });
        return {
            minX,
            maxX,
            minY,
            maxY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    private drawStyledButton(ctx: Graphics, w: number, h: number, baseColor: Color) {
        ctx.clear();
        // Shadow/Outline
        ctx.lineWidth = 5;
        ctx.strokeColor = Color.BLACK;
        ctx.fillColor = baseColor;
        ctx.roundRect(-w/2, -h/2, w, h, 20);
        ctx.fill();
        ctx.stroke();

        // Glossy Highlight
        ctx.fillColor = new Color(255, 255, 255, 80);
        ctx.roundRect(-w/2 + 8, h/2 - 25, w - 16, 15, 10);
        ctx.fill();
    }

    private bindTooltip(target: Node, text: string) {
        if (!target) return;
        const show = () => this.showTooltip(text, target);
        const hide = () => this.hideTooltip();
        target.on(Node.EventType.MOUSE_ENTER, show, this);
        target.on(Node.EventType.MOUSE_LEAVE, hide, this);
        target.on(Node.EventType.TOUCH_START, show, this);
        target.on(Node.EventType.TOUCH_END, hide, this);
        target.on(Node.EventType.TOUCH_CANCEL, hide, this);
    }

    private bindTooltipDynamic(target: Node, getText: () => string) {
        if (!target) return;
        const show = () => this.showTooltip(getText(), target);
        const hide = () => this.hideTooltip();
        target.on(Node.EventType.MOUSE_ENTER, show, this);
        target.on(Node.EventType.MOUSE_LEAVE, hide, this);
        target.on(Node.EventType.TOUCH_START, show, this);
        target.on(Node.EventType.TOUCH_END, hide, this);
        target.on(Node.EventType.TOUCH_CANCEL, hide, this);
    }

    private getRewardRange(rarity: GachaRarity): { min: number; max: number } {
        const config = GACHA_CONFIG.rewards[rarity];
        const tierMultiplier = GACHA_CONFIG.machines[this.currentMachineId]?.rewardMultiplier ?? 1;
        return {
            min: Math.round(config.coinsMin * tierMultiplier),
            max: Math.round(config.coinsMax * tierMultiplier)
        };
    }

    private getProbabilityTooltipText(): string {
        const tier = GACHA_CONFIG.machines[this.currentMachineId];
        const pity = GACHA_CONFIG.pitySystem;
        if (!tier) return '概率信息未配置';
        const shortLeft = Math.max(pity.unluckyStreakThreshold - this.unluckyStreakCounter, 1);
        const hardLeft = Math.max(pity.hardPity - this.pityCounter, 1);
        return `${tier.name} ${tier.price}币\n短保底: ${shortLeft}抽必出SR\n硬保底: ${hardLeft}抽`;
    }

    private onPullClick(count: number = 1) {
        if (this.isAnimating) return;
        if (this.resultNode && this.resultNode.active) {
            this.closeResultEarly();
        }
        const state = this.getMachineState();
        if (state.isSoldOut) {
            this.showError('今日售罄，明日再来！');
            return;
        }
        if (this.globeComponent && this.globeComponent.getRemainingCapsules() <= 0) {
            this.markSoldOut();
            this.showError('今日售罄，明日再来！');
            return;
        }

        const tier = GACHA_CONFIG.machines[this.currentMachineId];
        const discount = GACHA_CONFIG.batchDiscount[count] ?? 1;
        let usedVoucher = false;
        if (count === 1) {
            const tierKey = this.currentMachineId;
            if (SpecialEventVoucherManager.instance.getValidCount('gacha', tierKey) > 0) {
                usedVoucher = SpecialEventVoucherManager.instance.consumeVoucher('gacha', tierKey);
            }
        }
        let cost = Math.ceil(tier.price * count * discount);
        if (usedVoucher) {
            cost = 0;
        }
        const wallet = InventoryManager.instance.globalWallet;

        if (wallet < cost) {
            this.showError("资金不足！");
            return;
        }

        // Deduct money
        if (cost > 0) {
            InventoryManager.instance.setWallet(wallet - cost);
        }
        director.emit('GACHA_MONEY_CHANGED');
        this.recordMachineSpend(cost);

        this.performSinglePull(tier);
    }

    private performSinglePull(tier: GachaMachineTier) {
        this.isAnimating = true;
        this.setPanelInteractable(false);
        this.totalPulls++;
        this.pityCounter++;

        // 2. 验证组件存在后再播放动画
        if (!this.globeComponent) {
            console.error('[GachaMachine] Missing components for animation!');
            this.isAnimating = false;
            this.setPanelInteractable(true);
            return;
        }

        // 3. Play Animations using component methods
        const hasButtonSprite = !!this.getMachineButtonSpriteFrame(this.currentMachineId);
        const runPull = () => {
            this.playMachineMechanism(() => {
                const baseProfile = this.getBaseShakeProfile();
                this.beginShakeBoost();
                this.startInteractiveShake(baseProfile.duration, baseProfile.intensity, true);
                this.globeComponent.shake(() => {
                    this.endShakeBoost();
                    const boostValue = this.shakeBoost;
                    this.shakeBoost = 0;
                    const result = this.calculateResult(tier, boostValue);
                    this.lastResultRarity = result.rarity;
                    this.pullHistory.unshift(result);
                    if (this.pullHistory.length > 10) this.pullHistory.pop();

                    const remaining = this.globeComponent.consumeCapsule(result.rarity);
                    const state = this.getMachineState();
                    state.remainingCapsules = remaining;
                    if (remaining <= 0) {
                        this.markSoldOut();
                    }

                    const finishDrop = () => {
                        this.globeComponent?.settleCapsules();
                        tween(this.node)
                            .delay(0.05)
                            .call(() => {
                                this.openDoorForDrop(() => {
                                    this.playDropAnimation(result.rarity, () => {
                                        this.globeComponent?.settleCapsules();
                                        this.revealResult(result);
                                    });
                                });
                            })
                            .start();
                    };

                    const rareProfile = this.getRareShakeProfile(result.rarity);
                    if (rareProfile) {
                        this.startInteractiveShake(rareProfile.duration, rareProfile.intensity, false);
                        this.globeComponent.shake(() => {
                            finishDrop();
                        }, { shakeNode: false, duration: rareProfile.duration, intensity: rareProfile.intensity });
                    } else {
                        finishDrop();
                    }
                }, { shakeNode: false, duration: baseProfile.duration, intensity: baseProfile.intensity });
            });
        };

        if (this.leverComponent && !hasButtonSprite) {
            this.leverComponent.pull(runPull);
        } else {
            runPull();
        }
    }

    private performBatchPull(tier: GachaMachineTier, count: number) {
        this.isAnimating = true;
        this.setPanelInteractable(false);
        const results: GachaResult[] = [];

        for (let i = 0; i < count; i++) {
            this.totalPulls++;
            this.pityCounter++;
            const res = this.calculateResult(tier);
            results.push(res);
        }

        this.lastResultRarity = results.length ? results[results.length - 1].rarity : null;

        const totalCoins = results.reduce((sum, r) => sum + r.rewardAmount, 0);
        InventoryManager.instance.addMoney(totalCoins);
        director.emit('GACHA_MONEY_CHANGED');

        results.forEach(r => this.pullHistory.unshift(r));
        if (this.pullHistory.length > 10) {
            this.pullHistory = this.pullHistory.slice(0, 10);
        }

        this.renderBatchResults(results, totalCoins);
    }

    private calculateResult(tier: GachaMachineTier, shakeBoost: number = 0): GachaResult {
        let rates = { ...tier.dropRates };
        const pity = GACHA_CONFIG.pitySystem;

        // Short-cycle pity: 3 misses -> guaranteed SR
        if (this.unluckyStreakCounter >= pity.unluckyStreakThreshold - 1) {
            return this.generateReward(pity.unluckyStreakGuaranteedRarity, true);
        }

        // Hard pity with weighted distribution
        if (this.pityCounter >= pity.hardPity) {
            const roll = Math.random() * 100;
            let acc = 0;
            const weights = pity.hardPityWeights;
            const order = [GachaRarity.SR, GachaRarity.SSR, GachaRarity.UR];
            for (const key of order) {
                acc += (weights as any)[key];
                if (roll < acc) {
                    return this.generateReward(key as GachaRarity, true);
                }
            }
            // Fallback
            return this.generateReward(GachaRarity.SR, true);
        }

        // Soft pity: start boosting SR rate
        if (this.pityCounter >= pity.softPityStart) {
            const extra = (this.pityCounter - pity.softPityStart + 1) * pity.softPityIncrement;
            const nReduction = Math.min(rates.N, extra);
            rates.N -= nReduction;
            rates.SR += extra;
        }

        rates = this.applyShakeBoostToRates(rates, shakeBoost);

        // Determine rarity
        const rand = Math.random() * 100;
        let cumulative = 0;

        cumulative += rates.UR;
        if (rand < cumulative) return this.generateReward(GachaRarity.UR, false);
        cumulative += rates.SSR;
        if (rand < cumulative) return this.generateReward(GachaRarity.SSR, false);
        cumulative += rates.SR;
        if (rand < cumulative) return this.generateReward(GachaRarity.SR, false);
        cumulative += rates.R;
        if (rand < cumulative) return this.generateReward(GachaRarity.R, false);
        return this.generateReward(GachaRarity.N, false);
    }
    private generateReward(rarity: GachaRarity, isPity: boolean): GachaResult {
        const config = GACHA_CONFIG.rewards[rarity];
        const raw = Math.floor(Math.random() * (config.coinsMax - config.coinsMin + 1)) + config.coinsMin;
        const multiplier = this.getSpendBiasMultiplier();
        const tierMultiplier = GACHA_CONFIG.machines[this.currentMachineId]?.rewardMultiplier ?? 1;
        const coins = Math.min(Math.max(1, Math.round(raw * multiplier * tierMultiplier)), GACHA_CONFIG.rewardCap ?? 1000);

        // Reset pity if good pull
        if (rarity === GachaRarity.SR || rarity === GachaRarity.SSR || rarity === GachaRarity.UR) {
            this.pityCounter = 0;
            this.unluckyStreakCounter = 0;  // NEW: Reset unlucky streak on good pulls
            console.log('[GachaMachine] ✨ SR+! Resetting pity and unlucky streak counters.');
        } else {
            // NEW: Increment unlucky streak for non-SR+ pulls
            this.unluckyStreakCounter++;
            console.log('[GachaMachine] 😢 Non-SR+ pull. Unlucky streak:', this.unluckyStreakCounter);
        }

        return {
            rarity: rarity,
            rewardAmount: coins,
            isPity: isPity,
            timestamp: Date.now()
        };
    }

    private playDropAnimation(rarity: GachaRarity, onComplete: () => void) {
        if (this.dropFxLayer) {
            this.dropFxLayer.removeAllChildren();
        }
        if (!this.dropFxLayer) {
            onComplete();
            return;
        }
        const dropDuration = Math.max(0.5, GACHA_UI_CONFIG.animation.dropDuration);
        const fallDuration = dropDuration * 0.35;
        const bounceDuration = dropDuration * 0.45;
        const settleDuration = dropDuration * 0.2;
        const capsule = GachaUIFactory.createCapsule(this.getCapsuleColorHex(rarity), 28);
        capsule.parent = this.dropFxLayer;
        const spawnPos = this.getDoorSpawnPositionLocal();
        const bottomPos = this.getStageBottomPositionLocal();
        const frontPos = this.getFrontPositionLocal();
        capsule.setPosition(spawnPos);

        tween(capsule)
            .to(fallDuration, { position: bottomPos, scale: new Vec3(1.05, 1.05, 1) }, { easing: 'quadIn' })
            .to(bounceDuration, { position: frontPos, scale: new Vec3(1.2, 1.2, 1) }, { easing: 'quadOut' })
            .to(settleDuration, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
            .call(() => {
                this.spawnRewardBurst(frontPos, rarity);
                capsule.destroy();
                onComplete();
            })
            .start();
    }

    private revealResult(result: GachaResult) {
        if (this.dropFxLayer) {
            this.dropFxLayer.removeAllChildren();
        }
        this.batchResultNode.active = false;
        this.resultNode.active = true;
        Tween.stopAllByTarget(this.resultNode);
        this.resultNode.removeAllChildren();
        this.resultNode.setPosition(this.getResultAnchorPosition());
        const resultTransform = this.resultNode.getComponent(UITransform) ?? this.resultNode.addComponent(UITransform);
        resultTransform.setContentSize(380, 260);
        this.isAnimating = false;
        this.setPanelInteractable(true);
        this.closeDoorAnimation();
        this.resetMachinePose(true);

        // Get rarity color
        let glowColor = GACHA_CONFIG.ui.colors.rarityN;
        switch(result.rarity) {
            case GachaRarity.N: glowColor = GACHA_CONFIG.ui.colors.rarityN; break;
            case GachaRarity.R: glowColor = GACHA_CONFIG.ui.colors.rarityR; break;
            case GachaRarity.SR: glowColor = GACHA_CONFIG.ui.colors.raritySR; break;
            case GachaRarity.SSR: glowColor = GACHA_CONFIG.ui.colors.raritySSR; break;
            case GachaRarity.UR: glowColor = GACHA_CONFIG.ui.colors.rarityUR; break;
        }

        // 1. Burst Rays
        const rays = new Node('Rays');
        rays.parent = this.resultNode;
        const raysGfx = rays.addComponent(Graphics);
        const rayCount = 12;
        const rayInner = 40;
        const rayOuter = 130;
        raysGfx.fillColor = new Color(glowColor.r, glowColor.g, glowColor.b, 140);
        for (let i = 0; i < rayCount; i++) {
            const a = (i / rayCount) * Math.PI * 2;
            const ax = Math.cos(a) * rayInner;
            const ay = Math.sin(a) * rayInner;
            const bx = Math.cos(a + 0.12) * rayOuter;
            const by = Math.sin(a + 0.12) * rayOuter;
            const cx = Math.cos(a - 0.12) * rayOuter;
            const cy = Math.sin(a - 0.12) * rayOuter;
            raysGfx.moveTo(ax, ay);
            raysGfx.lineTo(bx, by);
            raysGfx.lineTo(cx, cy);
            raysGfx.close();
            raysGfx.fill();
        }
        tween(rays).by(2.5, { angle: 360 }).repeatForever().start();

        // 2. Background Glow with spin
        const glow = new Node('Glow');
        glow.parent = this.resultNode;
        const gGfx = glow.addComponent(Graphics);
        gGfx.circle(0, 0, 90);
        glowColor.a = 140;
        gGfx.fillColor = glowColor;
        gGfx.fill();

        // Spin animation
        tween(glow).by(3, { angle: 360 }).repeatForever().start();

        // 3. Result Panel
        const panelNode = new Node('ResultPanel');
        panelNode.parent = this.resultNode;
        const panelGfx = panelNode.addComponent(Graphics);
        panelGfx.fillColor = new Color(20, 30, 36, 220);
        panelGfx.roundRect(-180, -110, 360, 220, 18);
        panelGfx.fill();
        panelGfx.strokeColor = Color.BLACK;
        panelGfx.lineWidth = 4;
        panelGfx.roundRect(-180, -110, 360, 220, 18);
        panelGfx.stroke();

        // 4. Particle Burst based on rarity
        this.spawnParticleBurst(result.rarity);

        // 5. Rarity Badge
        const badgeNode = new Node('Badge');
        badgeNode.parent = this.resultNode;
        badgeNode.setPosition(0, 58);
        const badgeLbl = badgeNode.addComponent(Label);
        badgeLbl.string = this.getRarityBadgeText(result.rarity);
        badgeLbl.fontSize = 38;
        badgeLbl.isBold = true;
        badgeLbl.color = glowColor;
        badgeLbl.enableOutline = true;
        badgeLbl.outlineWidth = 4;
        badgeLbl.outlineColor = Color.BLACK;

        // 6. Reward Text
        const infoNode = new Node('Info');
        infoNode.parent = this.resultNode;
        infoNode.setPosition(0, -12);
        const lbl = infoNode.addComponent(Label);
        lbl.string = `+${result.rewardAmount}金币`;
        lbl.fontSize = 32;
        lbl.isBold = true;
        lbl.color = Color.YELLOW;
        lbl.enableOutline = true;
        lbl.outlineWidth = 3;
        lbl.outlineColor = Color.BLACK;

        // 7. Stars for rarity level
        const starCount = this.getRarityStars(result.rarity);
        for (let i = 0; i < starCount; i++) {
            const starX = (i - (starCount - 1) / 2) * 35;
            const starNode = new Node('Star');
            starNode.parent = this.resultNode;
            starNode.setPosition(starX, -82);
            const starGfx = starNode.addComponent(Graphics);
            this.drawStar(starGfx, 0, 0, 12);
        }

        if (result.rarity === GachaRarity.SSR || result.rarity === GachaRarity.UR) {
            const basePos = this.resultNode.position.clone();
            tween(this.resultNode)
                .to(0.05, { position: new Vec3(basePos.x + 6, basePos.y + 2, 0) })
                .to(0.05, { position: new Vec3(basePos.x - 5, basePos.y - 2, 0) })
                .to(0.05, { position: basePos })
                .start();
        }

        // Add Coins to Wallet
        InventoryManager.instance.addMoney(result.rewardAmount);
        director.emit('GACHA_MONEY_CHANGED');
        this.saveProgress();

        // Pop-in animation for result
        this.resultNode.scale = new Vec3(0, 0, 1);
        const holdSeconds = result.rarity === GachaRarity.N || result.rarity === GachaRarity.R ? 1.5 : 2.2;
        tween(this.resultNode)
            .to(0.4, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .delay(holdSeconds)
            .call(() => {
                this.resultNode.active = false;
                this.isAnimating = false;
                this.resetMachinePose();
                this.setPanelInteractable(true);
                this.updatePityDisplay();
                this.updateUnluckyStreakDisplay();  // NEW: Update unlucky streak display
                this.updatePullButtons();
            })
            .start();
    }

    private renderBatchResults(results: GachaResult[], totalCoins: number) {
        if (this.dropFxLayer) {
            this.dropFxLayer.removeAllChildren();
        }
        this.resultNode.active = false;
        this.batchResultNode.active = true;
        this.batchResultNode.removeAllChildren();
        const batchPos = this.getResultAnchorPosition();
        this.batchResultNode.setPosition(new Vec3(batchPos.x, batchPos.y - 40, 0));

        const topRarity = this.getTopRarity(results);
        const counts = this.buildBatchSummary(results);

        const titleNode = new Node('BatchTitle');
        const titleLbl = titleNode.addComponent(Label);
        titleLbl.string = `${results.length}连结果 (${totalCoins} 金币)`;
        titleLbl.fontSize = 30;
        titleLbl.isBold = true;
        titleLbl.color = Color.WHITE;
        this.batchResultNode.addChild(titleNode);

        const summaryNode = new Node('BatchSummary');
        const summaryLbl = summaryNode.addComponent(Label);
        summaryLbl.string = `N:${counts.N}  R:${counts.R}  SR:${counts.SR}  SSR:${counts.SSR}  UR:${counts.UR}`;
        summaryLbl.fontSize = 22;
        summaryLbl.color = Color.YELLOW;
        summaryLbl.enableOutline = true;
        summaryLbl.outlineColor = Color.BLACK;
        summaryNode.setPosition(0, -40);
        this.batchResultNode.addChild(summaryNode);

        const highlightNode = new Node('BatchHighlight');
        const highlightLbl = highlightNode.addComponent(Label);
        highlightLbl.string = `最高：${this.getRarityBadgeText(topRarity)}`;
        highlightLbl.fontSize = 24;
        highlightLbl.isBold = true;
        highlightLbl.color = new Color().fromHEX('#FFD700');
        highlightNode.setPosition(0, -80);
        this.batchResultNode.addChild(highlightNode);

        this.saveProgress();
        this.updatePityDisplay();
        this.updateUnluckyStreakDisplay();
        this.updatePullButtons();

        tween(this.batchResultNode)
            .to(0.2, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'backOut' })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .delay(2.0)
            .call(() => {
                this.batchResultNode.active = false;
                this.isAnimating = false;
                this.setPanelInteractable(true);
            })
            .start();
    }

    private buildBatchSummary(results: GachaResult[]) {
        const counts = { N: 0, R: 0, SR: 0, SSR: 0, UR: 0 };
        results.forEach(r => {
            (counts as any)[r.rarity] += 1;
        });
        return counts;
    }

    private getTopRarity(results: GachaResult[]): GachaRarity {
        const order = [GachaRarity.UR, GachaRarity.SSR, GachaRarity.SR, GachaRarity.R, GachaRarity.N];
        for (const r of order) {
            if (results.some(item => item.rarity === r)) {
                return r;
            }
        }
        return GachaRarity.N;
    }

    private getRarityBadgeText(rarity: GachaRarity): string {
        switch(rarity) {
            case GachaRarity.N: return 'N球';
            case GachaRarity.R: return 'R球';
            case GachaRarity.SR: return 'SR球';
            case GachaRarity.SSR: return 'SSR球';
            case GachaRarity.UR: return 'UR球';
            default: return '?';
        }
    }

    private getRarityStars(rarity: GachaRarity): number {
        switch(rarity) {
            case GachaRarity.N: return 1;
            case GachaRarity.R: return 2;
            case GachaRarity.SR: return 3;
            case GachaRarity.SSR: return 4;
            case GachaRarity.UR: return 5;
            default: return 1;
        }
    }

    private getCapsuleColorHex(rarity: GachaRarity): string {
        switch(rarity) {
            case GachaRarity.R: return '#4169E1';
            case GachaRarity.SR: return '#8A2BE2';
            case GachaRarity.SSR: return '#FFD700';
            case GachaRarity.UR: return '#E53935';
            case GachaRarity.N:
            default:
                return '#C8C8C8';
        }
    }

    private spawnParticleBurst(rarity: GachaRarity) {
        const particleCount = this.getParticleCount(rarity);
        const colors = this.getParticleColors(rarity);

        for (let i = 0; i < particleCount; i++) {
            const particle = new Node('Particle');
            particle.parent = this.resultNode;

            const angle = (i / particleCount) * Math.PI * 2;
            const distance = 100 + Math.random() * 50;
            const targetX = Math.cos(angle) * distance;
            const targetY = Math.sin(angle) * distance;

            const pGfx = particle.addComponent(Graphics);
            const size = 8 + Math.random() * 8;
            const color = colors[Math.floor(Math.random() * colors.length)];

            // Draw different shapes based on rarity
            if (rarity === GachaRarity.SSR || rarity === GachaRarity.UR) {
                // Hearts for SSR/UR
                this.drawHeart(pGfx, 0, 0, size);
            } else if (rarity === GachaRarity.SR) {
                // Squares for SR
                pGfx.rect(-size/2, -size/2, size, size);
            } else {
                // Circles for others
                pGfx.circle(0, 0, size/2);
            }

            pGfx.fillColor = color;
            pGfx.fill();

            // Animate outward
            tween(particle)
                .to(0.6, { position: new Vec3(targetX, targetY, 0), scale: new Vec3(0, 0, 1) }, { easing: 'sineOut' })
                .call(() => particle.destroy())
                .start();
        }
    }

    private getParticleCount(rarity: GachaRarity): number {
        switch(rarity) {
            case GachaRarity.N: return 8;
            case GachaRarity.R: return 12;
            case GachaRarity.SR: return 20;
            case GachaRarity.SSR: return 30;
            case GachaRarity.UR: return 40;
            default: return 8;
        }
    }

    private getParticleColors(rarity: GachaRarity): Color[] {
        switch(rarity) {
            case GachaRarity.N:
                return [Color.GRAY, Color.WHITE];
            case GachaRarity.R:
                return [Color.BLUE, new Color(100, 149, 237), Color.WHITE];
            case GachaRarity.SR:
                return [new Color(138, 43, 226), new Color(186, 85, 211), Color.WHITE];
            case GachaRarity.SSR:
                return [new Color(255, 215, 0), new Color(255, 200, 80), Color.WHITE];
            case GachaRarity.UR:
                return [new Color(229, 57, 53), new Color(255, 120, 100), Color.WHITE, new Color(255, 215, 0)];
            default:
                return [Color.WHITE];
        }
    }

    private drawHeart(ctx: Graphics, x: number, y: number, r: number) {
        const hr = r / 2;
        ctx.moveTo(x, y + hr / 2);
        ctx.bezierCurveTo(x - r, y - r / 2, x - r, y - r, x, y - r / 2);
        ctx.bezierCurveTo(x + r, y - r, x + r, y - r / 2, x, y + hr / 2);
        ctx.fill();
    }

    private showError(msg: string) {
        const errNode = new Node('Error');
        errNode.parent = this.fxLayer ?? this.shopPanel;
        errNode.setPosition(0, 170, 0);

        const isSoldOut = msg.includes('售罄');
        const panelWidth = isSoldOut ? 360 : 280;
        const panelHeight = isSoldOut ? 68 : 58;

        const panel = new Node('ErrorPanel');
        panel.parent = errNode;
        const panelTransform = panel.addComponent(UITransform);
        panelTransform.setContentSize(panelWidth, panelHeight);
        const panelGfx = panel.addComponent(Graphics);
        panelGfx.fillColor = isSoldOut ? new Color(28, 22, 14, 210) : new Color(30, 14, 14, 210);
        panelGfx.roundRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 14);
        panelGfx.fill();
        panelGfx.strokeColor = Color.BLACK;
        panelGfx.lineWidth = 3;
        panelGfx.stroke();

        const labelNode = new Node('ErrorLabel');
        labelNode.parent = errNode;
        const lbl = labelNode.addComponent(Label);
        lbl.string = msg;
        lbl.fontSize = isSoldOut ? 26 : 24;
        lbl.isBold = true;
        lbl.color = isSoldOut ? new Color(255, 216, 130) : new Color(255, 120, 120);
        lbl.enableOutline = true;
        lbl.outlineColor = Color.BLACK;
        lbl.outlineWidth = 3;

        errNode.scale = new Vec3(0.92, 0.92, 1);
        tween(errNode)
            .to(0.2, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'backOut' })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .delay(1.1)
            .to(0.2, { position: new Vec3(0, 140, 0) })
            .call(() => errNode.destroy())
            .start();
    }

    // Persistence
    private loadProgress() {
        const raw = sys.localStorage.getItem(this.SAVE_KEY);
        if (raw) {
            try {
                const data = JSON.parse(raw);
                this.pityCounter = data.pityCounter || 0;
                this.unluckyStreakCounter = data.unluckyStreakCounter || 0;  // NEW: Load unlucky streak
                this.totalPulls = data.totalPulls || 0;
                if (data.machineStates) {
                    this.machineStates = data.machineStates;
                } else {
                    this.machineStates = {
                        normal: {
                            isSoldOut: false,
                            soldOutDay: data.soldOutDay || 0,
                            lastStockDay: data.lastStockDay || 0,
                            remainingCapsules: data.remainingCapsules || 0
                        }
                    };
                }
                if (data.spendState) {
                    this.spendState = data.spendState;
                }
                if (!this.spendState?.spendByMachine) {
                    this.spendState = {
                        day: this.getCurrentDay(),
                        totalSpend: 0,
                        spendByMachine: { normal: 0, premium: 0, luxury: 0 }
                    };
                }
            } catch (e) {
                console.error("Failed to load gacha data", e);
            }
        }
    }

    private saveProgress() {
        const data = {
            pityCounter: this.pityCounter,
            unluckyStreakCounter: this.unluckyStreakCounter,  // NEW: Save unlucky streak
            totalPulls: this.totalPulls,
            machineStates: this.machineStates,
            spendState: this.spendState,
            timestamp: Date.now()
        };
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(data));
    }
}














