/**
 * LotteryStationController.ts
 * 彩票站主控制器 - 独立组件，不依赖 CookingControllerV2
 * 
 * 刮刮乐玩法：
 * 1. 选择档位购买彩票
 * 2. 用鼠标在刮刮卡上持续拖动，刮开银色涂层
 * 3. 刮开70%以上面积后，自动显示最终奖励
 */

import { _decorator, Component, Node, Label, Button, Color, tween, Tween, Vec3, UITransform, Graphics, EventTouch, UIOpacity, view, input, Input, EventMouse, director, BlockInputEvents, Animation, Sprite, SpriteFrame, ImageAsset, Texture2D, assetManager, resources } from 'cc';
import { EDITOR, PREVIEW } from 'cc/env';
import { InventoryManager } from '../../../Manager/InventoryManager';
import { GameProgressManager } from '../../../Manager/GameProgressManager';
import { TimeManager } from '../../../Manager/TimeManager';
import { LOTTERY_CONFIG, getTierConfig, getAllTierKeys, LotteryTier } from './LotteryConfig';
import { SpecialEventVoucherManager } from '../../SpecialEvents/SpecialEventVoucherManager';

const { ccclass, property } = _decorator;
type ScratchRegion = 'number' | 'amount' | 'winning';

// 刮刮卡常量
const SCRATCH_BRUSH_RADIUS_MIN = 20;
const SCRATCH_BRUSH_RADIUS_MAX = 60;
const SCRATCH_STEP_MIN = 2;
const NUMBER_DEFAULT_COLOR = new Color(45, 45, 45, 255);
const NUMBER_MATCH_COLOR = new Color(200, 120, 40, 255);
const AMOUNT_DEFAULT_COLOR = new Color(140, 90, 50, 255);
const AMOUNT_MATCH_COLOR = new Color(244, 194, 79, 255);
const CARD_BG_COLOR = new Color(248, 243, 231, 255);
const CARD_BORDER_COLOR = new Color(0, 0, 0, 255);
const CARD_INNER_BORDER_COLOR = new Color(215, 170, 90, 255);
const CARD_PATTERN_COLOR = new Color(255, 255, 255, 28);
const WIN_BAR_COLOR = new Color(255, 227, 166, 255);
const WIN_BAR_BORDER_COLOR = new Color(90, 70, 48, 255);
const WIN_BAR_HIGHLIGHT = new Color(255, 255, 255, 120);
const CELL_BG_COLOR = new Color(244, 235, 221, 255);
const CELL_BORDER_COLOR = new Color(176, 138, 96, 255);
const NUMBER_AREA_COLOR = new Color(255, 246, 232, 255);
const AMOUNT_AREA_COLOR = new Color(242, 230, 210, 255);
const DIVIDER_COLOR = new Color(198, 164, 123, 255);
const LEGEND_BG_COLOR = new Color(239, 227, 208, 255);
const LEGEND_BORDER_COLOR = new Color(176, 138, 96, 255);
const STAMP_COLOR = new Color(201, 92, 92, 200);

/**
 * 刮刮卡数据
 */
interface ScratchCellData {
    number: number;
    amount: number;
    matched: boolean;
    numberRevealed: boolean;
    amountRevealed: boolean;
}

interface ScratchCardData {
    tier: string;
    winningNumber: number;
    cells: ScratchCellData[];
    isRainbow: boolean;
    isComplete: boolean;
}

@ccclass('LotteryStationController')
export class LotteryStationController extends Component {
    
    @property(Node)
    shopButton: Node = null;      // 入口按钮（场景中的彩票站图标）
    
    @property(Node)
    shopPanel: Node = null;       // 弹窗面板

    // 赌石店铺面板（仅用于第3关）
    private stoneShopPanel: Node = null;
    
    // 运行时状态
    private currentCard: ScratchCardData | null = null;
    private loseStreak: number = 0;           // 连续不中奖次数
    private isScratching: boolean = false;    // 是否正在刮
    private scratchRegion: ScratchRegion | null = null;
    private lastScratchLocalPos: Vec3 | null = null;
    
    // UI节点引用
    private panelContainer: Node = null;
    private cardContainer: Node = null;
    private numberMaskContainer: Node = null;
    private amountMaskContainer: Node = null;
    private winningMaskContainer: Node = null;
    private winningNumberLabel: Label = null;
    private numberLabels: Label[] = [];
    private amountLabels: Label[] = [];
    private invalidStampNodes: Node[] = [];
    private numberTagNodes: Node[] = [];
    private amountTagNodes: Node[] = [];
    private cardBuiltTier: string | null = null;
    private numberScratched: number[] = [];
    private amountScratched: number[] = [];
    private numberTotals: number[] = [];
    private amountTotals: number[] = [];
    private totalNumberBlocks: number = 0;
    private totalAmountBlocks: number = 0;
    private totalNumberScratched: number = 0;
    private totalAmountScratched: number = 0;
    private winningScratched: number = 0;
    private winningTotal: number = 0;
    private maskResetStep: number = 0;
    private revealedNumberCount: number = 0;
    private revealedAmountCount: number = 0;
    private winningRevealed: boolean = false;
    private walletLabel: Label = null;
    private shopTimeLabel: Label = null;
    private streakLabel: Label = null;
    private resultLabel: Label = null;
    private modalBlocker: Node = null;
    private gridBounds: { left: number; right: number; top: number; bottom: number } | null = null;
    private winningBounds: { left: number; right: number; top: number; bottom: number } | null = null;
    private cardWidth: number = 0;
    private cardHeight: number = 0;
    private cardAreaPosition: Vec3 = new Vec3(0, 30, 0);
    private tierLayout = { startX: -200, startY: 210, spacingY: 200 };
    private scratchCursor: Node = null;
    private resultShown: boolean = false;
    private rewardGranted: boolean = false;
    private lastTierKey: string | null = null;
    private nextCardButton: Node = null;
    private nextCardButtonGfx: Graphics = null;
    private nextCardButtonLabel: Label = null;
    private helpIcon: Node = null;
    private helpTooltip: Node = null;
    private helpTooltipVisible: boolean = false;
    private loseHintShown: boolean = false;
    private allowNext: boolean = false;
    private cardBuilt: boolean = false;
    private cardPickLayer: Node = null;
    private cardPickCards: Node[] = [];
    private cardPickButtons: Button[] = [];
    private cardPickHintLabel: Label = null;
    private isPickingCard: boolean = false;
    private pendingTierKey: string | null = null;
    private pendingPickIndex: number | null = null;
    private pendingCardReady: boolean = false;
    private prebuiltTierKey: string | null = null;
    private prebuiltCardData: ScratchCardData | null = null;
    private prebuiltCardReady: boolean = false;
    private cardDataCache: Record<string, ScratchCardData | null> = {};
    private cacheWarming: boolean = false;
    private templateBuilding: boolean = false;
    private pendingCardToShow: ScratchCardData | null = null;
    private loadingHintNode: Node = null;
    private loadingHintLabel: Label = null;
    private loadingHintDotsRoot: Node = null;
    private loadingHintDots: Node[] = [];
    private pendingLoadingHintText: string | null = null;
    private loadingHintUseChars: boolean = false;
    private loadingHintCharNodes: Node[] = [];
    private loadingHintCharBasePositions: Vec3[] = [];
    private shopPrepared: boolean = false;
    private cardCoverNode: Node = null;
    
    
    onLoad() {
        this.prepareShopInBackground();
    }

    start() {
        if (this.shopPanel) {
            this.shopPanel.active = false;
        }
        
        if (this.shopButton) {
            this.shopButton.on(Node.EventType.TOUCH_END, this.openShop, this);
        }
        if (this.isStoneShopScene()) {
            const panel = this.resolveStoneShopPanel();
            if (panel) {
                panel.active = false;
            }
        }
        
        // 使用Cocos的input模块注册全局鼠标事件
        input.on(Input.EventType.MOUSE_DOWN, this.onCocosMouseDown, this);
        input.on(Input.EventType.MOUSE_MOVE, this.onCocosMouseMove, this);
        input.on(Input.EventType.MOUSE_UP, this.onCocosMouseUp, this);
        this.prebuildCardAtSceneStart();
        this.scheduleOnce(() => {
            this.prebuildCardAtSceneStart();
        }, 0);
        
        console.log('[LotteryStation] ✅ 彩票站初始化完成，已注册Cocos input事件');
    }
    
    private prebuildCardAtSceneStart() {
        const scene = director.getScene();
        const sceneName = scene?.name ?? '';
        if (!scene || !sceneName.includes('Level1CookingScene')) {
            return;
        }
        this.prepareShopInBackground(true);
        this.warmCardDataCache();
        this.ensureCardTemplate();
    }

    private ensureCardTemplate() {
        if (!this.cardContainer || this.cardBuilt || this.templateBuilding) {
            return;
        }
        const tierKeys = getAllTierKeys();
        const tierKey = tierKeys.includes('bronze') ? 'bronze' : tierKeys[0];
        if (!tierKey) return;
        const cached = this.cardDataCache[tierKey];
        const card = cached ?? this.buildScratchCardData(tierKey);
        if (!card) return;
        this.templateBuilding = true;
        this.showLoadingHint('老板正在取卡');
        this.scheduleOnce(() => {
            const pending = this.pendingCardToShow ?? card;
            const showAfter = this.pendingCardToShow !== null;
            this.pendingCardToShow = null;
            this.applyCardData(pending);
            this.renderScratchCard();
            if (showAfter) {
                this.setCardCoverVisible(false);
                this.setCardContainerVisible(true);
                this.refreshOverlayOrder();
            } else {
                this.currentCard = null;
                this.setCardCoverVisible(true);
                this.setCardContainerVisible(false);
            }
            this.templateBuilding = false;
            this.hideLoadingHint();
        }, 0.05);
    }

    private warmCardDataCache() {
        if (this.cacheWarming) {
            return;
        }
        const tierKeys = getAllTierKeys();
        const missing = tierKeys.filter((key) => !this.cardDataCache[key]);
        if (!missing.length) {
            return;
        }
        this.cacheWarming = true;
        missing.forEach((tierKey, index) => {
            this.scheduleOnce(() => {
                if (!this.cardDataCache[tierKey]) {
                    const card = this.buildScratchCardData(tierKey);
                    if (card) {
                        this.cardDataCache[tierKey] = card;
                    }
                }
                if (index === missing.length - 1) {
                    this.cacheWarming = false;
                }
            }, index * 0.02);
        });
    }

    private ensureLoadingHint() {
        if (this.loadingHintNode || !this.panelContainer) return;
        const searchRoot = this.shopPanel?.parent ?? this.panelContainer ?? this.shopPanel;
        const existing = this.findNodeRecursive(searchRoot ?? null, 'CardLoadingHint');
        if (existing) {
            this.loadingHintNode = existing;
            if (this.loadingHintNode.parent !== this.panelContainer) {
                this.panelContainer.addChild(this.loadingHintNode);
            }
        } else {
            this.loadingHintNode = new Node('CardLoadingHint');
            this.panelContainer.addChild(this.loadingHintNode);
        }
        this.loadingHintNode.setPosition(this.cardAreaPosition);
        this.ensureUITransform(this.loadingHintNode, 360, 64);
        const hintChars = this.loadingHintNode.getChildByName('HintChars');
        this.loadingHintUseChars = !!hintChars;
        if (hintChars) {
            this.cacheLoadingHintChars(hintChars);
        }
        const labelNode = this.loadingHintNode.getChildByName('HintLabel')
            ?? this.loadingHintNode.getChildByName('Label')
            ?? new Node('HintLabel');
        if (!labelNode.parent) {
            labelNode.parent = this.loadingHintNode;
        }
        labelNode.setPosition(0, 10, 0);
        this.ensureUITransform(labelNode, 360, 26);
        this.loadingHintLabel = labelNode.getComponent(Label) || labelNode.addComponent(Label);
        this.loadingHintLabel.string = '刮刮卡准备中...';
        this.loadingHintLabel.fontSize = 18;
        this.loadingHintLabel.color = new Color(245, 236, 220, 255);
        this.loadingHintLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.loadingHintLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.loadingHintLabel.enableOutline = true;
        this.loadingHintLabel.outlineColor = Color.BLACK;
        this.loadingHintLabel.outlineWidth = 2;

        if (this.loadingHintUseChars) {
            labelNode.active = false;
            const dotsNode = this.loadingHintNode.getChildByName('Dots');
            if (dotsNode) {
                dotsNode.active = false;
            }
            this.loadingHintDotsRoot = dotsNode;
            this.loadingHintDots = [];
        } else {
            labelNode.active = true;
            this.loadingHintDotsRoot = this.loadingHintNode.getChildByName('Dots') ?? new Node('Dots');
            if (!this.loadingHintDotsRoot.parent) {
                this.loadingHintDotsRoot.parent = this.loadingHintNode;
            }
            this.loadingHintDotsRoot.setPosition(0, -12, 0);
            this.ensureUITransform(this.loadingHintDotsRoot, 72, 12);
            this.loadingHintDots = [];
            for (let i = 0; i < 3; i++) {
                const dotName = `Dot${i + 1}`;
                const dot = this.loadingHintDotsRoot.getChildByName(dotName) ?? new Node(dotName);
                if (!dot.parent) {
                    dot.parent = this.loadingHintDotsRoot;
                }
                dot.setPosition((i - 1) * 14, 0, 0);
                this.ensureUITransform(dot, 8, 8);
                if (!dot.getComponent(Label)) {
                    const dotLabel = dot.addComponent(Label);
                    dotLabel.string = '.';
                    dotLabel.fontSize = 22;
                    dotLabel.color = new Color(245, 236, 220, 255);
                    dotLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
                    dotLabel.verticalAlign = Label.VerticalAlign.CENTER;
                }
                (dot.getComponent(UIOpacity) || dot.addComponent(UIOpacity)).opacity = 180;
                this.loadingHintDots.push(dot);
            }
        }

        (this.loadingHintNode.getComponent(UIOpacity) || this.loadingHintNode.addComponent(UIOpacity)).opacity = 255;
        this.loadingHintNode.setSiblingIndex(9996);
        this.loadingHintNode.active = false;
    }

    private refreshLoadingHintMode() {
        if (!this.loadingHintNode) return;
        const hintChars = this.loadingHintNode.getChildByName('HintChars');
        const useChars = !!hintChars && hintChars.children.length > 0;
        this.loadingHintUseChars = useChars;
        if (useChars && hintChars) {
            this.cacheLoadingHintChars(hintChars);
        }
    }

    private showLoadingHint(text: string) {
        this.ensureLoadingHint();
        if (!this.loadingHintNode || !this.loadingHintLabel) return;
        if (!this.shopPanel?.active) {
            this.pendingLoadingHintText = text;
            return;
        }
        this.pendingLoadingHintText = null;
        this.refreshLoadingHintMode();
        const centerPos = this.getCardCenterPosition();
        this.loadingHintNode.setPosition(centerPos);
        this.loadingHintNode.setSiblingIndex(9999);
        this.loadingHintLabel.string = text;
        const hintChars = this.loadingHintNode.getChildByName('HintChars');
        const useChars = !!hintChars && this.loadingHintUseChars;
        if (useChars && hintChars) {
            hintChars.active = true;
            if (this.loadingHintLabel?.node) {
                this.loadingHintLabel.node.active = false;
            }
            if (this.loadingHintDotsRoot) {
                this.loadingHintDotsRoot.active = false;
            }
            this.stopLoadingHintWave();
            this.playLoadingHintWave();
        } else if (this.loadingHintDotsRoot) {
            if (hintChars) {
                hintChars.active = false;
            }
            this.loadingHintDotsRoot.active = true;
            if (this.loadingHintLabel?.node) {
                this.loadingHintLabel.node.active = true;
            }
        }
        this.loadingHintNode.active = true;
        const opacity = this.loadingHintNode.getComponent(UIOpacity) || this.loadingHintNode.addComponent(UIOpacity);
        opacity.opacity = 255;
        Tween.stopAllByTarget(this.loadingHintNode);
        Tween.stopAllByTarget(opacity);
        this.loadingHintNode.setScale(1, 1, 1);
        if (!useChars) {
            tween(this.loadingHintNode)
                .repeatForever(
                    tween()
                        .to(0.3, { scale: new Vec3(1.03, 1.03, 1) })
                        .to(0.3, { scale: new Vec3(1, 1, 1) })
                )
                .start();
            tween(opacity)
                .repeatForever(
                    tween()
                        .to(0.3, { opacity: 210 })
                        .to(0.3, { opacity: 255 })
                )
                .start();
            this.playLoadingHintDots();
        }
        const animation = this.loadingHintNode.getComponent(Animation);
        if (animation) {
            animation.stop();
            if (!useChars) {
                animation.play();
            }
        }
    }

    private hideLoadingHint() {
        if (!this.loadingHintNode) return;
        const animation = this.loadingHintNode.getComponent(Animation);
        if (animation) {
            animation.stop();
        }
        this.stopLoadingHintWave();
        Tween.stopAllByTarget(this.loadingHintNode);
        const opacity = this.loadingHintNode.getComponent(UIOpacity);
        if (opacity) {
            Tween.stopAllByTarget(opacity);
            opacity.opacity = 255;
        }
        this.pendingLoadingHintText = null;
        this.stopLoadingHintDots();
        const hintChars = this.loadingHintNode.getChildByName('HintChars');
        if (hintChars) {
            hintChars.active = false;
        }
        if (this.loadingHintDotsRoot) {
            this.loadingHintDotsRoot.active = false;
        }
        this.loadingHintNode.setScale(1, 1, 1);
        this.loadingHintNode.active = false;
    }

    private playLoadingHintDots() {
        if (this.loadingHintUseChars) return;
        if (!this.loadingHintDots || !this.loadingHintDots.length) return;
        this.loadingHintDots.forEach((dot, index) => {
            if (!dot) return;
            const opacity = dot.getComponent(UIOpacity) || dot.addComponent(UIOpacity);
            opacity.opacity = 120;
            Tween.stopAllByTarget(opacity);
            const sequence = tween()
                .delay(index * 0.15)
                .to(0.25, { opacity: 255 })
                .to(0.25, { opacity: 120 });
            tween(opacity).repeatForever(sequence).start();
        });
    }

    private stopLoadingHintDots() {
        if (this.loadingHintUseChars) return;
        if (!this.loadingHintDots || !this.loadingHintDots.length) return;
        this.loadingHintDots.forEach((dot) => {
            if (!dot) return;
            const opacity = dot.getComponent(UIOpacity);
            if (opacity) {
                Tween.stopAllByTarget(opacity);
                opacity.opacity = 180;
            }
        });
    }

    private getCardCenterPosition(): Vec3 {
        if (!this.cardContainer || !this.panelContainer) {
            return this.cardAreaPosition?.clone() ?? new Vec3();
        }
        const panelTransform = this.panelContainer.getComponent(UITransform);
        if (!panelTransform) {
            return this.cardContainer.getPosition();
        }
        const worldPos = this.cardContainer.getWorldPosition();
        return panelTransform.convertToNodeSpaceAR(worldPos);
    }

    private cacheLoadingHintChars(hintChars: Node) {
        const nodes = hintChars.children.slice();
        nodes.sort((a, b) => a.name.localeCompare(b.name));
        this.loadingHintCharNodes = nodes;
        this.loadingHintCharBasePositions = nodes.map((node) => node.getPosition().clone());
    }

    private playLoadingHintWave() {
        if (!this.loadingHintCharNodes.length) return;
        const baseCount = this.loadingHintCharBasePositions.length;
        if (baseCount !== this.loadingHintCharNodes.length) {
            const hintChars = this.loadingHintNode?.getChildByName('HintChars');
            if (hintChars) {
                this.cacheLoadingHintChars(hintChars);
            }
        }
        const rise = 10;
        const upTime = 0.22;
        const downTime = 0.22;
        const delayStep = 0.07;
        this.loadingHintCharNodes.forEach((node, index) => {
            const base = this.loadingHintCharBasePositions[index] ?? node.getPosition();
            node.setPosition(base);
            node.setScale(1, 1, 1);
            Tween.stopAllByTarget(node);
            const up = new Vec3(base.x, base.y + rise, base.z);
            const down = new Vec3(base.x, base.y, base.z);
            const upScale = new Vec3(1.06, 1.06, 1);
            const downScale = new Vec3(1, 1, 1);
            const sequence = tween()
                .to(upTime, { position: up, scale: upScale }, { easing: 'sineOut' })
                .to(downTime, { position: down, scale: downScale }, { easing: 'sineIn' });
            tween(node)
                .delay(index * delayStep)
                .repeatForever(sequence)
                .start();
        });
    }

    private stopLoadingHintWave() {
        if (!this.loadingHintCharNodes.length) return;
        this.loadingHintCharNodes.forEach((node, index) => {
            Tween.stopAllByTarget(node);
            const base = this.loadingHintCharBasePositions[index];
            if (base) {
                node.setPosition(base);
            }
            node.setScale(1, 1, 1);
        });
    }

    private onCocosMouseDown(event: EventMouse) {
        console.log('[LotteryStation] ??? Cocos MOUSE_DOWN');
        
        if (this.isPickingCard || !this.shopPanel?.active || !this.currentCard) {
            return;
        }
        
        // 获取鼠标位置并尝试开始刮涂
        const pos = event.getUILocation();
        console.log('[LotteryStation] 鼠标UI位置:', pos.x, pos.y);
        this.updateScratchCursor(pos.x, pos.y);
        this.beginScratch(pos.x, pos.y);
    }
    
    private onCocosMouseMove(event: EventMouse) {
        const pos = event.getUILocation();
        this.updateScratchCursor(pos.x, pos.y);
        if (this.isPickingCard || !this.isScratching || !this.shopPanel?.active || !this.currentCard) {
            return;
        }
        this.continueScratch(pos.x, pos.y);
    }
    
    private onCocosMouseUp(event: EventMouse) {
        if (this.isPickingCard) {
            return;
        }
        if (this.isScratching) {
            this.endScratch();
            console.log('[LotteryStation] ??? 停止刮');
        }
        this.hideScratchCursor();
    }

    onDestroy() {
        // 清理Cocos input事件
        if (input?.off) {
            input.off(Input.EventType.MOUSE_DOWN, this.onCocosMouseDown, this);
            input.off(Input.EventType.MOUSE_MOVE, this.onCocosMouseMove, this);
            input.off(Input.EventType.MOUSE_UP, this.onCocosMouseUp, this);
        }
        this.endScratch();
        this.stopTimeTicker();
        if (this.modalBlocker && this.modalBlocker.isValid) {
            this.modalBlocker.destroy();
        }
        if (this.scratchCursor && this.scratchCursor.isValid) {
            this.scratchCursor.destroy();
        }
    }

    private isInCardAreaByUIPos(uiX: number, uiY: number): boolean {
        if (!this.cardContainer) return false;
        
        const transform = this.cardContainer.getComponent(UITransform);
        if (!transform) return false;
        
        // UI坐标转世界坐标（UI坐标原点在左下角）
        const viewSize = view.getVisibleSize();
        const worldX = uiX - viewSize.width / 2;
        const worldY = uiY - viewSize.height / 2;
        
        // 世界坐标转卡片本地坐标
        const localPos = transform.convertToNodeSpaceAR(new Vec3(worldX, worldY, 0));
        
        console.log('[LotteryStation] UI→World→Local:', 
            `(${uiX.toFixed(0)},${uiY.toFixed(0)})`,
            `→(${worldX.toFixed(0)},${worldY.toFixed(0)})`,
            `→(${localPos.x.toFixed(0)},${localPos.y.toFixed(0)})`);
        
        return Math.abs(localPos.x) <= this.cardWidth / 2 && Math.abs(localPos.y) <= this.cardHeight / 2;
    }
    
    // scratchAtUIPosition已移除，改用局部坐标刮涂
    
    private isInCardArea(clientX: number, clientY: number): boolean {
        if (!this.cardContainer) {
            console.log('[LotteryStation] ❌ cardContainer不存在');
            return false;
        }
        
        const canvas = document.querySelector('canvas');
        if (!canvas) {
            console.log('[LotteryStation] ❌ canvas不存在');
            return false;
        }
        
        const rect = canvas.getBoundingClientRect();
        const viewSize = view.getVisibleSize();
        
        console.log('[LotteryStation] canvas rect:', rect.left, rect.top, rect.width, rect.height);
        console.log('[LotteryStation] viewSize:', viewSize.width, viewSize.height);
        
        // DOM坐标 → Cocos世界坐标
        const scaleX = viewSize.width / rect.width;
        const scaleY = viewSize.height / rect.height;
        
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;
        
        const worldX = canvasX - viewSize.width / 2;
        const worldY = viewSize.height / 2 - canvasY;
        
        console.log('[LotteryStation] 坐标转换:', 
            `DOM(${clientX},${clientY})`,
            `→ canvas(${canvasX.toFixed(0)},${canvasY.toFixed(0)})`,
            `→ world(${worldX.toFixed(0)},${worldY.toFixed(0)})`);
        
        // 转换到卡片本地坐标
        const transform = this.cardContainer.getComponent(UITransform);
        if (!transform) {
            console.log('[LotteryStation] ❌ UITransform不存在');
            return false;
        }
        
        const localPos = transform.convertToNodeSpaceAR(new Vec3(worldX, worldY, 0));
        const cardWorldPos = this.cardContainer.getWorldPosition();
        
        console.log('[LotteryStation] cardContainer世界位置:', cardWorldPos.x.toFixed(0), cardWorldPos.y.toFixed(0));
        console.log('[LotteryStation] 本地坐标:', localPos.x.toFixed(0), localPos.y.toFixed(0));
        console.log('[LotteryStation] 卡片范围: ±', this.cardWidth / 2, '×', this.cardHeight / 2);
        
        // 检查是否在卡片范围内
        const inArea = Math.abs(localPos.x) <= this.cardWidth / 2 && Math.abs(localPos.y) <= this.cardHeight / 2;
        console.log('[LotteryStation] 在卡片内:', inArea);
        
        return inArea;
    }
    
    update(dt: number) {
        // 不再使用update轮询，改为直接在DOM mousemove中处理
    }

    openShop() {
        if (this.isStoneShopScene()) {
            this.openStoneShop();
            return;
        }
        console.log('[LotteryStation] ?? 打开彩票站');
        this.prepareShopInBackground(true);
        if (!this.shopPanel) {
            this.createShopPanel();
        }
        if (!this.shopPanel) {
            console.error('[LotteryStation] shopPanel is missing.');
            return;
        }
        this.warmCardDataCache();
        this.ensureCardTemplate();

        if (this.modalBlocker) {
            this.modalBlocker.active = true;
        }
        this.shopPanel.active = true;
        if (this.pendingLoadingHintText) {
            const hintText = this.pendingLoadingHintText;
            this.pendingLoadingHintText = null;
            this.showLoadingHint(hintText);
        }
        this.refreshOverlayOrder();
        this.setCardCoverVisible(!this.currentCard);
        this.setCardContainerVisible(!!this.currentCard);
        this.updateWalletDisplay();
        this.updateStreakDisplay();
        this.startTimeTicker();
        
        const opacity = this.shopPanel.getComponent(UIOpacity) || this.shopPanel.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.2, { opacity: 255 }).start();
    }

    closeShop() {
        if (this.isStoneShopScene()) {
            this.closeStoneShop();
            return;
        }
        console.log('[LotteryStation] ?? 关闭彩票站');
        
        // 重置状态
        this.endScratch();
        this.stopTimeTicker();
        this.hideNextCardButton();
        this.setHelpTooltipVisible(false);
        this.setCardContainerVisible(false);
        this.hideLoadingHint();
        this.isPickingCard = false;
        this.pendingTierKey = null;
        this.pendingPickIndex = null;
        this.pendingCardReady = false;
        if (this.cardPickLayer) {
            this.cardPickLayer.active = false;
        }
        
        // 通知全局金币已变化
        director.emit('LOTTERY_MONEY_CHANGED');
        
        if (this.shopPanel) {
            const opacity = this.shopPanel.getComponent(UIOpacity);
            if (opacity) {
                tween(opacity).to(0.2, { opacity: 0 }).call(() => {
                    this.shopPanel.active = false;
                    if (this.modalBlocker) {
                        this.modalBlocker.active = false;
                    }
                    this.hideScratchCursor();
                    this.currentCard = null;
                }).start();
            } else {
                this.shopPanel.active = false;
                if (this.modalBlocker) {
                    this.modalBlocker.active = false;
                }
                this.hideScratchCursor();
                this.currentCard = null;
            }
        }
    }

    private createShopPanel() {
        const scene = director.getScene();
        let canvas = scene?.getChildByName('Canvas');
        if (!canvas && scene && scene.children.length > 0) {
            canvas = scene.children[0];
        }

        const canvasTransform = canvas?.getComponent(UITransform);
        const viewSize = canvasTransform?.contentSize ?? view.getVisibleSize();

        this.shopPanel = new Node('LotteryShopPanel');
        this.shopPanel.addComponent(UITransform).setContentSize(viewSize.width, viewSize.height);
        this.shopPanel.addComponent(UIOpacity);
        this.shopPanel.addComponent(BlockInputEvents);
        if (canvas) {
            canvas.addChild(this.shopPanel);
        } else {
            this.node.addChild(this.shopPanel);
        }
        this.shopPanel.setSiblingIndex(9999);

        this.modalBlocker = new Node('LotteryModalBlocker');
        this.modalBlocker.addComponent(UITransform).setContentSize(viewSize.width, viewSize.height);
        const modalBg = new Node('ModalBg');
        modalBg.parent = this.modalBlocker;
        modalBg.addComponent(UITransform).setContentSize(viewSize.width, viewSize.height);
        const modalSprite = modalBg.addComponent(Sprite);
        modalSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        modalSprite.color = Color.WHITE;
        this.loadLotteryBackground(modalSprite);
        const modalDim = new Node('ModalDim');
        modalDim.parent = this.modalBlocker;
        modalDim.addComponent(UITransform).setContentSize(viewSize.width, viewSize.height);
        const blockerGfx = modalDim.addComponent(Graphics);
        blockerGfx.fillColor = new Color(0, 0, 0, 120);
        blockerGfx.rect(-viewSize.width / 2, -viewSize.height / 2, viewSize.width, viewSize.height);
        blockerGfx.fill();

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
        this.ensureUITransform(walletLabelNode, 220, 40);
        this.walletLabel = walletLabelNode.addComponent(Label);
        this.walletLabel.fontSize = 26;
        this.walletLabel.isBold = true;
        this.walletLabel.color = new Color(255, 230, 140, 255);
        this.walletLabel.horizontalAlign = Label.HorizontalAlign.RIGHT;
        this.walletLabel.enableOutline = true;
        this.walletLabel.outlineColor = Color.BLACK;
        this.walletLabel.outlineWidth = 3;

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
        this.ensureUITransform(timeLabelNode, 220, 40);
        this.shopTimeLabel = timeLabelNode.addComponent(Label);
        this.shopTimeLabel.fontSize = 24;
        this.shopTimeLabel.isBold = true;
        this.shopTimeLabel.color = Color.WHITE;
        this.shopTimeLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.shopTimeLabel.enableOutline = true;
        this.shopTimeLabel.outlineColor = Color.BLACK;
        this.shopTimeLabel.outlineWidth = 3;

        this.modalBlocker.addComponent(Button);
        this.modalBlocker.addComponent(BlockInputEvents);
        this.modalBlocker.on(Node.EventType.TOUCH_START, (event: EventTouch) => event.propagationStopped = true);
        this.modalBlocker.on(Node.EventType.TOUCH_END, (event: EventTouch) => event.propagationStopped = true);
        if (this.shopPanel.parent) {
            this.shopPanel.parent.addChild(this.modalBlocker);
            this.modalBlocker.setSiblingIndex(this.shopPanel.getSiblingIndex());
            this.shopPanel.setSiblingIndex(this.modalBlocker.getSiblingIndex() + 1);
        }
        this.modalBlocker.active = false;

        const cfg = LOTTERY_CONFIG.ui;
        const w = cfg.panelWidth;
        const h = cfg.panelHeight;
        const panelPadding = 36;
        const leftColumnWidth = 480;
        const rightColumnWidth = 210;
        const leftColumnX = -w / 2 + panelPadding + leftColumnWidth / 2;
        const rightColumnX = w / 2 - panelPadding - rightColumnWidth / 2;
        const headerHeight = 64;
        const headerY = h / 2 - 46;
        const footerHeight = 86;

        this.cardAreaPosition = new Vec3(leftColumnX, 10, 0);
        this.tierLayout = { startX: rightColumnX, startY: 150, spacingY: 120 };

        this.panelContainer = new Node('PanelContainer');
        this.ensureUITransform(this.panelContainer, w, h);
        this.shopPanel.addChild(this.panelContainer);
        this.ensureScratchCursor();
        this.attachNextCardButton(rightColumnX, -h / 2 + 126);
        this.attachHelpIcon(leftColumnX, headerY - 72);

        const panelBg = new Node('PanelBg');
        this.ensureUITransform(panelBg, w, h);
        const panelGraphics = panelBg.addComponent(Graphics);
        panelGraphics.fillColor = new Color(cfg.backgroundColor.r, cfg.backgroundColor.g, cfg.backgroundColor.b, cfg.backgroundColor.a);
        panelGraphics.roundRect(-w / 2, -h / 2, w, h, 24);
        panelGraphics.fill();
        panelGraphics.strokeColor = new Color(0, 0, 0, 255);
        panelGraphics.lineWidth = 4;
        panelGraphics.roundRect(-w / 2, -h / 2, w, h, 24);
        panelGraphics.stroke();
        panelGraphics.strokeColor = new Color(255, 215, 120, 255);
        panelGraphics.lineWidth = 2;
        panelGraphics.roundRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 20);
        panelGraphics.stroke();
        panelGraphics.fillColor = new Color(255, 255, 255, 36);
        panelGraphics.roundRect(-w / 2 + 16, h / 2 - 68, w - 32, 22, 11);
        panelGraphics.fill();
        this.panelContainer.addChild(panelBg);
        const panelOpacity = panelBg.getComponent(UIOpacity) || panelBg.addComponent(UIOpacity);
        panelOpacity.opacity = 255;
        panelBg.addComponent(Button);
        panelBg.on(Node.EventType.TOUCH_END, (e: EventTouch) => e.propagationStopped = true);

        const header = new Node('Header');
        this.ensureUITransform(header, w - 24, headerHeight);
        const headerGraphics = header.addComponent(Graphics);
        headerGraphics.fillColor = new Color(20, 28, 34, 255);
        headerGraphics.roundRect(-w / 2 + 12, h / 2 - 78, w - 24, headerHeight, 16);
        headerGraphics.fill();
        this.panelContainer.addChild(header);

        const titleNode = new Node('Title');
        this.panelContainer.addChild(titleNode);
        titleNode.setPosition(0, headerY, 0);
        this.ensureUITransform(titleNode, 360, 40);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = LOTTERY_CONFIG.shopName;
        titleLabel.fontSize = 30;
        titleLabel.color = new Color(cfg.titleColor.r, cfg.titleColor.g, cfg.titleColor.b, cfg.titleColor.a);
        titleLabel.isBold = true;
        titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        titleLabel.enableOutline = true;
        titleLabel.outlineColor = Color.BLACK;
        titleLabel.outlineWidth = 2;

        const descNode = new Node('Description');
        this.panelContainer.addChild(descNode);
        descNode.setPosition(0, headerY - 36, 0);
        this.ensureUITransform(descNode, 520, 30);
        const descLabel = descNode.addComponent(Label);
        descLabel.string = LOTTERY_CONFIG.shopDescription;
        descLabel.fontSize = 16;
        descLabel.color = new Color(200, 200, 200, 255);
        descLabel.horizontalAlign = Label.HorizontalAlign.CENTER;

        const backBtn = this.createBackButton('返回摊位', w / 2 - 120, headerY, 140, 42, () => this.closeShop());
        this.panelContainer.addChild(backBtn);

        const tipNode = new Node('Tips');
        this.panelContainer.addChild(tipNode);
        tipNode.setPosition(leftColumnX, headerY - 72, 0);
        this.ensureUITransform(tipNode, 380, 24);
        const tipLabel = tipNode.addComponent(Label);
        const luckyThreshold = LOTTERY_CONFIG.specialMechanics.luckyStreak.threshold;
        const rainbowRate = Math.round(LOTTERY_CONFIG.specialMechanics.rainbowCard.rate * 100);
        const rainbowMultiplier = LOTTERY_CONFIG.specialMechanics.rainbowCard.multiplier;
        tipLabel.string = `连不中${luckyThreshold}次必小奖 · 彩虹卡${rainbowRate}%奖励x${rainbowMultiplier}`;
        tipLabel.fontSize = 14;
        tipLabel.color = new Color(180, 200, 220, 255);
        tipLabel.horizontalAlign = Label.HorizontalAlign.LEFT;

        this.createTierButtons();
        this.createCardArea();

        const footer = new Node('Footer');
        this.ensureUITransform(footer, w - 24, footerHeight);
        const footerGraphics = footer.addComponent(Graphics);
        footerGraphics.fillColor = new Color(25, 35, 42, 255);
        footerGraphics.roundRect(-w / 2 + 12, -h / 2 + 12, w - 24, footerHeight, 16);
        footerGraphics.fill();
        this.panelContainer.addChild(footer);

        const streakNode = new Node('Streak');
        this.panelContainer.addChild(streakNode);
        streakNode.setPosition(leftColumnX, -h / 2 + 54, 0);
        this.ensureUITransform(streakNode, 320, 30);
        this.streakLabel = streakNode.addComponent(Label);
        this.streakLabel.string = '连不中: 0/3';
        this.streakLabel.fontSize = 16;
        this.streakLabel.color = new Color(180, 180, 180, 255);
        this.streakLabel.horizontalAlign = Label.HorizontalAlign.CENTER;

        const resultNode = new Node('Result');
        this.panelContainer.addChild(resultNode);
        resultNode.setPosition(rightColumnX, -h / 2 + 54, 0);
        this.ensureUITransform(resultNode, 240, 30);
        this.resultLabel = resultNode.addComponent(Label);
        this.resultLabel.string = '';
        this.resultLabel.fontSize = 18;
        this.resultLabel.color = new Color(255, 255, 255, 255);
        this.resultLabel.isBold = true;
        this.resultLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.refreshOverlayOrder();
    }
    
    private createTierButtons() {
        const tierKeys = getAllTierKeys();
        const startX = this.tierLayout.startX;
        const startY = this.tierLayout.startY;
        const spacingY = this.tierLayout.spacingY;
        
        tierKeys.forEach((key, index) => {
            const tier = getTierConfig(key);
            if (!tier) return;
            
            const btn = this.createTierButton(key, tier, startX, startY - index * spacingY);
            this.panelContainer.addChild(btn);
        });
    }
    
    private createTierButton(tierKey: string, tier: LotteryTier, x: number, y: number): Node {
        const btn = new Node(`Tier_${tierKey}`);
        btn.setPosition(x, y, 0);
        
        const btnWidth = 200;
        const btnHeight = 110;
        
        this.ensureUITransform(btn, btnWidth, btnHeight);
        
        const tierColor = this.hexToColor(tier.color);
        const bg = new Node('Bg');
        this.ensureUITransform(bg, btnWidth, btnHeight);
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(22, 28, 34, 235);
        bgGraphics.roundRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
        bgGraphics.fill();
        bgGraphics.strokeColor = new Color(0, 0, 0, 255);
        bgGraphics.lineWidth = 3;
        bgGraphics.roundRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
        bgGraphics.stroke();
        bgGraphics.strokeColor = tierColor;
        bgGraphics.lineWidth = 2;
        bgGraphics.roundRect(-btnWidth/2 + 6, -btnHeight/2 + 6, btnWidth - 12, btnHeight - 12, 10);
        bgGraphics.stroke();
        bgGraphics.fillColor = tierColor;
        bgGraphics.roundRect(-btnWidth/2 + 8, btnHeight/2 - 32, btnWidth - 16, 22, 10);
        bgGraphics.fill();
        btn.addChild(bg);
        
        const titleNode = new Node('Title');
        btn.addChild(titleNode);
        titleNode.setPosition(0, btnHeight / 2 - 20, 0);
        this.ensureUITransform(titleNode, btnWidth - 20, 22);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = `${tier.name} ${tier.price}币`;
        titleLabel.fontSize = 16;
        titleLabel.color = Color.WHITE;
        titleLabel.isBold = true;
        titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        titleLabel.enableOutline = true;
        titleLabel.outlineColor = Color.BLACK;
        titleLabel.outlineWidth = 2;

        const iconNode = new Node('Icon');
        btn.addChild(iconNode);
        iconNode.setPosition(0, 10, 0);
        this.ensureUITransform(iconNode, 40, 40);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = tier.icon;
        iconLabel.fontSize = 26;

        const rateNode = new Node('Rate');
        btn.addChild(rateNode);
        rateNode.setPosition(0, -16, 0);
        this.ensureUITransform(rateNode, btnWidth - 20, 18);
        const rateLabel = rateNode.addComponent(Label);
        rateLabel.string = `中奖率 ${Math.round(tier.winRate * 100)}%`;
        rateLabel.fontSize = 14;
        rateLabel.color = new Color(210, 220, 230, 255);
        rateLabel.horizontalAlign = Label.HorizontalAlign.CENTER;

        const rewardNode = new Node('Reward');
        btn.addChild(rewardNode);
        rewardNode.setPosition(0, -36, 0);
        this.ensureUITransform(rewardNode, btnWidth - 20, 18);
        const maxReward = Math.max(...tier.rewards);
        const rewardLabel = rewardNode.addComponent(Label);
        rewardLabel.string = `最高 ${maxReward}币`;
        rewardLabel.fontSize = 14;
        rewardLabel.color = new Color(255, 220, 160, 255);
        rewardLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        
        btn.addComponent(Button);
        btn.on(Node.EventType.TOUCH_END, () => this.buyTicket(tierKey));
        
        return btn;
    }
    
    private createCardArea() {
        this.cardContainer = new Node('CardContainer');
        this.ensureUITransform(this.cardContainer, 560, 520);
        this.panelContainer.addChild(this.cardContainer);
        this.cardContainer.setPosition(this.cardAreaPosition);
        this.cardBuilt = false;
        this.cardBuiltTier = null;
        this.setCardContainerVisible(false);

        this.cardCoverNode = new Node('CardCover');
        this.cardContainer.addChild(this.cardCoverNode);
        this.ensureUITransform(this.cardCoverNode, 560, 520);
        const coverGfx = this.cardCoverNode.addComponent(Graphics);
        coverGfx.fillColor = new Color(20, 24, 30, 255);
        coverGfx.roundRect(-280, -260, 560, 520, 12);
        coverGfx.fill();
        coverGfx.strokeColor = new Color(255, 215, 120, 160);
        coverGfx.lineWidth = 2;
        coverGfx.roundRect(-270, -250, 540, 500, 10);
        coverGfx.stroke();
        this.cardCoverNode.addComponent(BlockInputEvents);

        const hintNode = new Node('Hint');
        this.cardCoverNode.addChild(hintNode);
        this.ensureUITransform(hintNode, 440, 30);
        const hintLabel = hintNode.addComponent(Label);
        hintLabel.string = '选择档位购买彩票 · 数字/金额任选起手';
        hintLabel.fontSize = 16;
        hintLabel.color = new Color(230, 230, 230, 255);
        hintLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.setCardCoverVisible(true);
    }

    private ensureCardPickLayer() {
        if (!this.panelContainer) return;
        if (this.cardPickLayer && this.cardPickLayer.isValid) return;

        this.cardPickLayer = new Node('CardPickLayer');
        this.ensureUITransform(this.cardPickLayer, 560, 520);
        this.cardPickLayer.addComponent(BlockInputEvents);
        this.cardPickLayer.setPosition(this.cardAreaPosition);
        this.panelContainer.addChild(this.cardPickLayer);
        this.cardPickLayer.setSiblingIndex(9997);

        const titleNode = new Node('PickTitle');
        titleNode.parent = this.cardPickLayer;
        this.ensureUITransform(titleNode, 220, 32);
        titleNode.setPosition(0, 228, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '挑一张刮刮卡';
        titleLabel.fontSize = 18;
        titleLabel.color = new Color(240, 230, 210, 255);
        titleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        titleLabel.enableOutline = true;
        titleLabel.outlineColor = Color.BLACK;
        titleLabel.outlineWidth = 2;
        this.cardPickHintLabel = titleLabel;

        this.cardPickCards = [];
        this.cardPickButtons = [];
        const cols = 3;
        const rows = 2;
        const cardW = 140;
        const cardH = 180;
        const gapX = 18;
        const gapY = 20;
        const startX = -((cols - 1) * (cardW + gapX)) / 2;
        const startY = ((rows - 1) * (cardH + gapY)) / 2 - 8;
        for (let i = 0; i < rows * cols; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
            const cardNode = new Node(`PickCard_${i}`);
            cardNode.parent = this.cardPickLayer;
            cardNode.setPosition(startX + col * (cardW + gapX), startY - row * (cardH + gapY), 0);
            this.ensureUITransform(cardNode, cardW, cardH);
            const button = cardNode.addComponent(Button);
            button.interactable = true;
            cardNode.on(Node.EventType.TOUCH_END, () => this.onPickCardSelected(i), this);

            const cardGfx = cardNode.addComponent(Graphics);
            cardGfx.fillColor = new Color(230, 220, 200, 255);
            cardGfx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);
            cardGfx.fill();
            cardGfx.strokeColor = new Color(60, 45, 30, 255);
            cardGfx.lineWidth = 2;
            cardGfx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);
            cardGfx.stroke();

            const labelNode = new Node('CardLabel');
            labelNode.parent = cardNode;
            this.ensureUITransform(labelNode, cardW - 20, 28);
            const label = labelNode.addComponent(Label);
            label.string = '刮';
            label.fontSize = 24;
            label.color = new Color(255, 245, 220, 255);
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.enableOutline = true;
            label.outlineColor = Color.BLACK;
            label.outlineWidth = 2;

            this.cardPickCards.push(cardNode);
            this.cardPickButtons.push(button);
        }

        this.cardPickLayer.active = false;
    }

    private updateCardPickTheme(tierKey: string) {
        const theme = this.getTierTheme(tierKey);
        const cardW = 140;
        const cardH = 180;
        this.cardPickCards.forEach((card) => {
            const gfx = card.getComponent(Graphics);
            if (!gfx) return;
            gfx.clear();
            gfx.fillColor = new Color(theme.cardBg);
            gfx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);
            gfx.fill();
            gfx.strokeColor = new Color(theme.cardBorder);
            gfx.lineWidth = 2;
            gfx.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 10);
            gfx.stroke();
            gfx.strokeColor = new Color(theme.cardInner);
            gfx.lineWidth = 1;
            gfx.roundRect(-cardW / 2 + 6, -cardH / 2 + 6, cardW - 12, cardH - 12, 8);
            gfx.stroke();
        });
    }

    private showCardPickLayer(tierKey: string) {
        this.ensureCardPickLayer();
        this.updateCardPickTheme(tierKey);
        if (this.cardPickLayer) {
            this.cardPickLayer.active = true;
            this.cardPickLayer.setSiblingIndex(9997);
        }
        this.isPickingCard = true;
        this.pendingTierKey = tierKey;
        this.pendingPickIndex = null;
        const canUsePrebuilt = this.prebuiltCardData !== null
            && this.prebuiltTierKey === tierKey
            && this.cardBuilt
            && this.cardBuiltTier === tierKey;
        this.pendingCardReady = canUsePrebuilt;
        this.setCardCoverVisible(false);
        this.setCardContainerVisible(false);
        if (this.cardPickHintLabel) {
            this.cardPickHintLabel.string = '挑一张刮刮卡';
        }
        this.showResult('挑一张卡片', new Color(220, 220, 220, 255));
        if (!canUsePrebuilt) {
            this.preparePendingCard(tierKey);
        }
    }

    private isStoneShopScene() {
        const sceneName = director.getScene()?.name ?? '';
        return sceneName.includes('Level3CookingScene');
    }

    private resolveStoneShopPanel() {
        if (this.stoneShopPanel && this.stoneShopPanel.isValid) {
            return this.stoneShopPanel;
        }
        const scene = director.getScene();
        let canvas = scene?.getChildByName('Canvas');
        if (!canvas && scene && scene.children.length > 0) {
            canvas = scene.children[0];
        }
        const panel = canvas?.getChildByName('StoneShopPanel') ?? scene?.getChildByName('StoneShopPanel');
        if (panel) {
            this.stoneShopPanel = panel;
        }
        return this.stoneShopPanel;
    }

    private openStoneShop() {
        let panel = this.resolveStoneShopPanel();
        if (!panel) {
            this.createStoneShopPanel();
            panel = this.stoneShopPanel;
        }
        if (!panel) {
            console.error('[StoneShop] 面板创建失败');
            return;
        }
        panel.active = true;
        panel.setSiblingIndex(9999);
        const opacity = panel.getComponent(UIOpacity) || panel.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.2, { opacity: 255 }).start();
    }

    private closeStoneShop() {
        const panel = this.resolveStoneShopPanel();
        if (!panel) return;
        const opacity = panel.getComponent(UIOpacity);
        if (opacity) {
            tween(opacity).to(0.2, { opacity: 0 }).call(() => {
                panel.active = false;
            }).start();
        } else {
            panel.active = false;
        }
    }

    private createStoneShopPanel() {
        const scene = director.getScene();
        let canvas = scene?.getChildByName('Canvas');
        if (!canvas && scene && scene.children.length > 0) {
            canvas = scene.children[0];
        }

        const canvasTransform = canvas?.getComponent(UITransform);
        const viewSize = canvasTransform?.contentSize ?? view.getVisibleSize();

        this.stoneShopPanel = new Node('StoneShopPanel');
        this.stoneShopPanel.addComponent(UITransform).setContentSize(viewSize.width, viewSize.height);
        this.stoneShopPanel.addComponent(UIOpacity);
        this.stoneShopPanel.addComponent(BlockInputEvents);
        if (canvas) {
            canvas.addChild(this.stoneShopPanel);
        } else {
            this.node.addChild(this.stoneShopPanel);
        }
        this.stoneShopPanel.setSiblingIndex(9999);

        const bgNode = new Node('StoneShopBackground');
        const bgTransform = bgNode.addComponent(UITransform);
        bgTransform.setContentSize(viewSize.width, viewSize.height);
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.stoneShopPanel.addChild(bgNode);

        resources.load('Gacha/dushi', SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.warn('[StoneShop] 背景加载失败', err);
                return;
            }
            if (!bgNode.isValid) return;
            bgSprite.spriteFrame = spriteFrame;
        });

        const backdrop = new Node('Backdrop');
        backdrop.addComponent(UITransform).setContentSize(viewSize.width, viewSize.height);
        const backdropGfx = backdrop.addComponent(Graphics);
        backdropGfx.fillColor = new Color(10, 10, 10, 90);
        backdropGfx.rect(-viewSize.width / 2, -viewSize.height / 2, viewSize.width, viewSize.height);
        backdropGfx.fill();
        this.stoneShopPanel.addChild(backdrop);

        const panel = new Node('Panel');
        const panelTransform = panel.addComponent(UITransform);
        panelTransform.setContentSize(900, 560);
        const panelGfx = panel.addComponent(Graphics);
        panelGfx.fillColor = new Color(34, 44, 36, 245);
        panelGfx.strokeColor = new Color(20, 20, 20, 255);
        panelGfx.lineWidth = 4;
        panelGfx.rect(-450, -280, 900, 560);
        panelGfx.fill();
        panelGfx.stroke();
        panel.setPosition(0, 0, 0);
        this.stoneShopPanel.addChild(panel);

        const titleNode = new Node('Title');
        titleNode.addComponent(UITransform).setContentSize(400, 60);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '赌石店';
        titleLabel.fontSize = 36;
        titleLabel.color = new Color(255, 235, 200, 255);
        titleLabel.isBold = true;
        titleNode.setPosition(0, 210, 0);
        panel.addChild(titleNode);

        const descNode = new Node('Desc');
        descNode.addComponent(UITransform).setContentSize(720, 80);
        const descLabel = descNode.addComponent(Label);
        descLabel.string = '进入赌石玩法（UI待接入，后续完全还原原型）';
        descLabel.fontSize = 20;
        descLabel.color = new Color(230, 220, 200, 255);
        descNode.setPosition(0, 150, 0);
        panel.addChild(descNode);

        const hintNode = new Node('Hint');
        hintNode.addComponent(UITransform).setContentSize(760, 120);
        const hintLabel = hintNode.addComponent(Label);
        hintLabel.string = '流程：选石 → 开窗 → 全切。';
        hintLabel.fontSize = 22;
        hintLabel.color = new Color(200, 255, 210, 255);
        hintNode.setPosition(0, 60, 0);
        panel.addChild(hintNode);

        const closeBtn = new Node('CloseButton');
        closeBtn.addComponent(UITransform).setContentSize(160, 52);
        const closeGfx = closeBtn.addComponent(Graphics);
        closeGfx.fillColor = new Color(236, 212, 170, 255);
        closeGfx.strokeColor = new Color(20, 20, 20, 255);
        closeGfx.lineWidth = 3;
        closeGfx.rect(-80, -26, 160, 52);
        closeGfx.fill();
        closeGfx.stroke();
        const closeLabelNode = new Node('CloseLabel');
        closeLabelNode.addComponent(UITransform).setContentSize(140, 40);
        const closeLabel = closeLabelNode.addComponent(Label);
        closeLabel.string = '返回摊位';
        closeLabel.fontSize = 20;
        closeLabel.color = new Color(30, 20, 15, 255);
        closeLabelNode.setPosition(0, 0, 0);
        closeBtn.addChild(closeLabelNode);
        closeBtn.setPosition(320, -220, 0);
        closeBtn.on(Node.EventType.TOUCH_END, this.closeStoneShop, this);
        panel.addChild(closeBtn);

        this.stoneShopPanel.active = false;
    }

    private preparePendingCard(tierKey: string) {
        if (!this.pendingTierKey || this.pendingTierKey !== tierKey) return;
        if (this.pendingCardReady) return;
        this.generateCard(tierKey);
        this.renderScratchCard();
        this.pendingCardReady = true;
        if (this.pendingPickIndex !== null) {
            this.finalizeCardPick();
        }
    }

    private onPickCardSelected(index: number) {
        if (!this.pendingTierKey) return;
        this.pendingPickIndex = index;
        if (!this.pendingCardReady) {
            this.showResult('正在揭卡...', new Color(200, 200, 200, 255));
            this.preparePendingCard(this.pendingTierKey);
            return;
        }
        this.finalizeCardPick();
    }

    private finalizeCardPick() {
        if (this.cardPickLayer) {
            this.cardPickLayer.active = false;
        }
        this.isPickingCard = false;
        if (!this.currentCard && this.prebuiltCardData && this.prebuiltTierKey === this.pendingTierKey) {
            this.currentCard = this.prebuiltCardData;
            this.prebuiltCardData = null;
            this.prebuiltCardReady = false;
            this.prebuiltTierKey = null;
        }
        this.pendingTierKey = null;
        this.pendingPickIndex = null;
        this.setCardContainerVisible(true);
        this.refreshOverlayOrder();
    }

    private setCardContainerVisible(visible: boolean) {
        if (this.cardContainer) {
            const opacity = this.cardContainer.getComponent(UIOpacity) || this.cardContainer.addComponent(UIOpacity);
            opacity.opacity = visible ? 255 : 0;
            this.cardContainer.active = true;
        }
    }

    public prewarmInBackground() {
        this.prepareShopInBackground(true);
    }

    private prepareShopInBackground(force = false) {
        if (!force && EDITOR && !PREVIEW) {
            return;
        }
        if (!force && this.shopPrepared) {
            return;
        }
        this.shopPrepared = true;
        if (!this.shopPanel) {
            this.createShopPanel();
        }
        if (this.shopPanel) {
            this.shopPanel.active = false;
        }
        if (this.modalBlocker) {
            this.modalBlocker.active = false;
        }
    }

    private updateCardCoverSize(width: number, height: number) {
        if (!this.cardCoverNode) return;
        const transform = this.cardCoverNode.getComponent(UITransform) || this.cardCoverNode.addComponent(UITransform);
        transform.setContentSize(width, height);
        const gfx = this.cardCoverNode.getComponent(Graphics);
        if (!gfx) return;
        gfx.clear();
        gfx.fillColor = new Color(20, 24, 30, 255);
        gfx.roundRect(-width / 2, -height / 2, width, height, 12);
        gfx.fill();
        gfx.strokeColor = new Color(255, 215, 120, 160);
        gfx.lineWidth = 2;
        gfx.roundRect(-width / 2 + 10, -height / 2 + 10, width - 20, height - 20, 10);
        gfx.stroke();
    }

    private setCardCoverVisible(visible: boolean) {
        if (this.cardCoverNode) {
            this.cardCoverNode.active = visible;
        }
    }

    private prewarmScratchCardLayout() {
        this.warmCardDataCache();
        this.ensureCardTemplate();
        this.allowNext = false;
        this.hideNextCardButton();
    }

    private attachNextCardButton(x: number, y: number) {
        if (!this.panelContainer) return;
        const scene = director.getScene();
        const canvas = scene?.getChildByName('Canvas') ?? scene?.children[0];
        let button = this.findNodeRecursive(canvas ?? null, 'LotteryNextButton');
        if (!button) {
            button = new Node('LotteryNextButton');
        }
        if (button.parent !== this.panelContainer) {
            this.panelContainer.addChild(button);
        }
        button.setPosition(x, y, 0);
        this.ensureUITransform(button, 160, 44);
        button.active = false;
        this.nextCardButton = button;
        this.nextCardButton.setSiblingIndex(9999);

        const bgNode = button.getChildByName('Bg') ?? new Node('Bg');
        if (!bgNode.parent) {
            button.addChild(bgNode);
        }
        this.ensureUITransform(bgNode, 160, 44);
        this.nextCardButtonGfx = bgNode.getComponent(Graphics) || bgNode.addComponent(Graphics);

        const labelNode = button.getChildByName('Label') ?? new Node('Label');
        if (!labelNode.parent) {
            button.addChild(labelNode);
        }
        this.ensureUITransform(labelNode, 150, 36);
        this.nextCardButtonLabel = labelNode.getComponent(Label) || labelNode.addComponent(Label);
        this.nextCardButtonLabel.fontSize = 18;
        this.nextCardButtonLabel.isBold = true;
        this.nextCardButtonLabel.color = Color.WHITE;
        this.nextCardButtonLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.nextCardButtonLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.nextCardButtonLabel.enableOutline = true;
        this.nextCardButtonLabel.outlineColor = Color.BLACK;
        this.nextCardButtonLabel.outlineWidth = 2;
        this.updateNextCardLabel();

        button.getComponent(Button) || button.addComponent(Button);
        button.off(Node.EventType.TOUCH_END, this.onNextCardClicked, this);
        button.on(Node.EventType.TOUCH_END, this.onNextCardClicked, this);
        this.drawNextCardButton(false);
    }

    private drawNextCardButton(highlight: boolean) {
        if (!this.nextCardButtonGfx || !this.nextCardButton) return;
        const size = this.nextCardButton.getComponent(UITransform)?.contentSize;
        if (!size) return;
        const width = size.width;
        const height = size.height;
        const gfx = this.nextCardButtonGfx;
        gfx.clear();
        gfx.fillColor = highlight ? new Color(255, 214, 130, 255) : new Color(28, 36, 44, 235);
        gfx.roundRect(-width / 2, -height / 2, width, height, 12);
        gfx.fill();
        gfx.strokeColor = Color.BLACK;
        gfx.lineWidth = 3;
        gfx.roundRect(-width / 2, -height / 2, width, height, 12);
        gfx.stroke();
        gfx.strokeColor = highlight ? new Color(140, 90, 40, 255) : new Color(255, 210, 130, 255);
        gfx.lineWidth = 2;
        gfx.roundRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, 10);
        gfx.stroke();
        gfx.fillColor = new Color(255, 255, 255, highlight ? 110 : 50);
        gfx.roundRect(-width / 2 + 10, height / 2 - 18, width - 20, 8, 4);
        gfx.fill();
        if (this.nextCardButtonLabel) {
            this.nextCardButtonLabel.color = highlight ? new Color(60, 30, 10, 255) : Color.WHITE;
        }
    }

    private updateNextCardLabel() {
        if (!this.nextCardButtonLabel) return;
        if (!this.lastTierKey) {
            this.nextCardButtonLabel.string = '下一张';
            return;
        }
        const tier = getTierConfig(this.lastTierKey);
        this.nextCardButtonLabel.string = tier ? `下一张 ${tier.price}币` : '下一张';
    }

    private showNextCardButton(highlight: boolean) {
        if (!this.nextCardButton) return;
        this.nextCardButton.active = true;
        this.updateNextCardLabel();
        this.drawNextCardButton(highlight);
        this.setNextButtonHighlight(highlight);
        this.refreshOverlayOrder();
    }

    private hideNextCardButton() {
        if (!this.nextCardButton) return;
        Tween.stopAllByTarget(this.nextCardButton);
        this.nextCardButton.setScale(1, 1, 1);
        this.nextCardButton.active = false;
    }

    private setNextButtonHighlight(enabled: boolean) {
        if (!this.nextCardButton) return;
        Tween.stopAllByTarget(this.nextCardButton);
        this.nextCardButton.setScale(1, 1, 1);
        this.drawNextCardButton(enabled);
        if (!enabled) return;
        tween(this.nextCardButton)
            .repeatForever(
                tween()
                    .to(0.25, { scale: new Vec3(1.06, 1.06, 1) })
                    .to(0.25, { scale: new Vec3(1, 1, 1) })
            )
            .start();
    }

    private onNextCardClicked(event?: EventTouch) {
        if (event) {
            event.propagationStopped = true;
        }
        if (!this.lastTierKey) {
            this.showResult('请先选择档位', new Color(255, 200, 100, 255));
            return;
        }
        if (this.currentCard && !this.currentCard.isComplete && !this.allowNext) {
            this.showResult('请先刮完当前彩票！', new Color(255, 200, 100, 255));
            return;
        }
        if (this.nextCardButton) {
            this.nextCardButton.active = false;
        }
        this.buyTicket(this.lastTierKey);
    }

    private attachHelpIcon(x: number, y: number) {
        if (!this.panelContainer) return;
        const scene = director.getScene();
        const canvas = scene?.getChildByName('Canvas') ?? scene?.children[0];
        let icon = this.findNodeRecursive(canvas ?? null, 'LotteryHelpIcon');
        if (!icon) {
            icon = new Node('LotteryHelpIcon');
        }
        if (icon.parent !== this.panelContainer) {
            this.panelContainer.addChild(icon);
        }
        icon.setPosition(x, y, 0);
        this.ensureUITransform(icon, 34, 34);
        icon.active = true;
        this.helpIcon = icon;
        this.helpIcon.setSiblingIndex(9998);

        const iconGfx = icon.getComponent(Graphics) || icon.addComponent(Graphics);
        iconGfx.clear();
        iconGfx.fillColor = new Color(255, 245, 220, 240);
        iconGfx.circle(0, 0, 15);
        iconGfx.fill();
        iconGfx.strokeColor = new Color(80, 60, 40, 255);
        iconGfx.lineWidth = 2;
        iconGfx.circle(0, 0, 15);
        iconGfx.stroke();

        const labelNode = icon.getChildByName('Label') ?? new Node('Label');
        if (!labelNode.parent) {
            icon.addChild(labelNode);
        }
        this.ensureUITransform(labelNode, 28, 28);
        const label = labelNode.getComponent(Label) || labelNode.addComponent(Label);
        label.string = '?';
        label.fontSize = 18;
        label.color = new Color(60, 40, 20, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableOutline = true;
        label.outlineColor = Color.WHITE;
        label.outlineWidth = 1;

        icon.getComponent(Button) || icon.addComponent(Button);
        icon.off(Node.EventType.MOUSE_ENTER);
        icon.off(Node.EventType.MOUSE_LEAVE);
        icon.off(Node.EventType.TOUCH_END);
        icon.on(Node.EventType.MOUSE_ENTER, () => this.setHelpTooltipVisible(true), this);
        icon.on(Node.EventType.MOUSE_LEAVE, () => this.setHelpTooltipVisible(false), this);
        icon.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            this.toggleHelpTooltip();
        }, this);

        this.ensureHelpTooltip();
        this.updateHelpIconPosition();
    }

    private ensureHelpTooltip() {
        if (!this.panelContainer) return;
        if (this.helpTooltip && this.helpTooltip.isValid) return;
        const tooltip = new Node('LotteryHelpTooltip');
        this.ensureUITransform(tooltip, 260, 132);
        const tooltipGfx = tooltip.addComponent(Graphics);
        tooltipGfx.fillColor = new Color(255, 247, 226, 245);
        tooltipGfx.roundRect(-130, -66, 260, 132, 12);
        tooltipGfx.fill();
        tooltipGfx.strokeColor = new Color(80, 60, 40, 255);
        tooltipGfx.lineWidth = 2;
        tooltipGfx.roundRect(-130, -66, 260, 132, 12);
        tooltipGfx.stroke();

        const illustration = new Node('Illustration');
        illustration.parent = tooltip;
        illustration.setPosition(-70, 0, 0);
        this.ensureUITransform(illustration, 90, 70);
        const illGfx = illustration.addComponent(Graphics);
        illGfx.fillColor = new Color(250, 242, 226, 255);
        illGfx.roundRect(-45, -35, 90, 70, 8);
        illGfx.fill();
        illGfx.strokeColor = new Color(120, 90, 60, 255);
        illGfx.lineWidth = 2;
        illGfx.roundRect(-45, -35, 90, 70, 8);
        illGfx.stroke();
        illGfx.fillColor = new Color(255, 227, 166, 255);
        illGfx.roundRect(-36, 12, 72, 16, 4);
        illGfx.fill();
        illGfx.strokeColor = new Color(150, 120, 80, 255);
        illGfx.lineWidth = 1;
        illGfx.moveTo(-30, -2);
        illGfx.lineTo(30, -2);
        illGfx.stroke();
        illGfx.moveTo(-30, -18);
        illGfx.lineTo(30, -18);
        illGfx.stroke();
        illGfx.moveTo(-30, -2);
        illGfx.lineTo(-30, -30);
        illGfx.stroke();
        illGfx.moveTo(0, -2);
        illGfx.lineTo(0, -30);
        illGfx.stroke();
        illGfx.moveTo(30, -2);
        illGfx.lineTo(30, -30);
        illGfx.stroke();

        const textNode = new Node('TipText');
        textNode.parent = tooltip;
        textNode.setPosition(45, 0, 0);
        this.ensureUITransform(textNode, 150, 90);
        const textLabel = textNode.addComponent(Label);
        textLabel.string = '刮出中奖号\n对照相同#\n领取对应$';
        textLabel.fontSize = 14;
        textLabel.color = new Color(60, 45, 25, 255);
        textLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        textLabel.verticalAlign = Label.VerticalAlign.CENTER;
        textLabel.lineHeight = 18;

        tooltip.active = false;
        this.panelContainer.addChild(tooltip);
        tooltip.setSiblingIndex(9999);
        this.helpTooltip = tooltip;
        this.refreshOverlayOrder();
    }

    private setHelpTooltipVisible(visible: boolean) {
        if (!this.helpTooltip) return;
        this.helpTooltipVisible = visible;
        this.helpTooltip.active = visible;
    }

    private toggleHelpTooltip() {
        this.setHelpTooltipVisible(!this.helpTooltipVisible);
    }

    private updateHelpIconPosition() {
        if (!this.helpIcon || !this.panelContainer) return;
        const iconX = -352.795;
        const iconY = 324.049;
        this.helpIcon.setPosition(iconX, iconY, 0);
        if (this.helpTooltip) {
            this.helpTooltip.setPosition(iconX + 150, iconY - 110, 0);
        }
    }

    private refreshOverlayOrder() {
        if (!this.panelContainer) return;
        if (this.nextCardButton) {
            this.nextCardButton.setSiblingIndex(9999);
        }
        if (this.helpIcon) {
            this.helpIcon.setSiblingIndex(9998);
        }
        if (this.helpTooltip) {
            this.helpTooltip.setSiblingIndex(9999);
        }
        if (this.scratchCursor) {
            this.scratchCursor.setSiblingIndex(9999);
        }
    }

    private promoteTagNodes() {
        if (!this.cardContainer) return;
        const topIndex = this.cardContainer.children.length - 1;
        this.numberTagNodes.forEach((node, index) => {
            node.setSiblingIndex(Math.max(0, topIndex - 2 - index));
        });
        this.amountTagNodes.forEach((node, index) => {
            node.setSiblingIndex(Math.max(0, topIndex - 1 - index));
        });
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

    private getTierTheme(tierKey: string) {
        switch (tierKey) {
            case 'silver':
                return {
                    cardBg: new Color(236, 240, 245, 255),
                    cardBorder: new Color(60, 70, 80, 255),
                    cardInner: new Color(160, 180, 200, 255),
                    pattern: new Color(255, 255, 255, 18),
                    winBar: new Color(214, 226, 238, 255),
                    winBorder: new Color(90, 105, 120, 255),
                    winHighlight: new Color(255, 255, 255, 140),
                    cellBg: new Color(228, 234, 240, 255),
                    cellBorder: new Color(135, 155, 175, 255),
                    numberArea: new Color(244, 248, 252, 255),
                    amountArea: new Color(230, 236, 242, 255),
                    divider: new Color(160, 180, 200, 255),
                    legendBg: new Color(222, 230, 238, 255),
                    legendBorder: new Color(135, 155, 175, 255),
                    tagNumberBg: new Color(235, 242, 250, 255),
                    tagAmountBg: new Color(220, 230, 240, 255),
                    tagBorder: new Color(120, 140, 160, 255),
                    tagText: new Color(60, 70, 85, 255)
                };
            case 'gold':
                return {
                    cardBg: new Color(255, 244, 220, 255),
                    cardBorder: new Color(110, 80, 30, 255),
                    cardInner: new Color(228, 180, 90, 255),
                    pattern: new Color(255, 255, 255, 26),
                    winBar: new Color(255, 224, 150, 255),
                    winBorder: new Color(140, 95, 35, 255),
                    winHighlight: new Color(255, 255, 255, 150),
                    cellBg: new Color(255, 236, 205, 255),
                    cellBorder: new Color(196, 150, 80, 255),
                    numberArea: new Color(255, 248, 232, 255),
                    amountArea: new Color(246, 228, 200, 255),
                    divider: new Color(210, 170, 110, 255),
                    legendBg: new Color(248, 232, 205, 255),
                    legendBorder: new Color(196, 150, 80, 255),
                    tagNumberBg: new Color(255, 238, 205, 255),
                    tagAmountBg: new Color(245, 224, 190, 255),
                    tagBorder: new Color(160, 120, 70, 255),
                    tagText: new Color(70, 45, 20, 255)
                };
            default:
                return {
                    cardBg: new Color(248, 243, 231, 255),
                    cardBorder: new Color(90, 65, 40, 255),
                    cardInner: new Color(215, 170, 90, 255),
                    pattern: new Color(255, 255, 255, 24),
                    winBar: new Color(255, 227, 166, 255),
                    winBorder: new Color(110, 78, 50, 255),
                    winHighlight: new Color(255, 255, 255, 130),
                    cellBg: new Color(244, 235, 221, 255),
                    cellBorder: new Color(176, 138, 96, 255),
                    numberArea: new Color(255, 246, 232, 255),
                    amountArea: new Color(242, 230, 210, 255),
                    divider: new Color(198, 164, 123, 255),
                    legendBg: new Color(239, 227, 208, 255),
                    legendBorder: new Color(176, 138, 96, 255),
                    tagNumberBg: new Color(255, 236, 204, 255),
                    tagAmountBg: new Color(239, 226, 206, 255),
                    tagBorder: new Color(150, 110, 70, 255),
                    tagText: new Color(70, 45, 20, 255)
                };
        }
    }

    private getTierDisplayName(tierKey: string): string {
        switch (tierKey) {
            case 'silver':
                return '银卡';
            case 'gold':
                return '金卡';
            default:
                return '铜卡';
        }
    }

    private addTierMotif(cardBg: Node, width: number, height: number, theme: any, tierKey: string) {
        const motif = new Node('TierMotif');
        this.ensureUITransform(motif, width, height);
        const gfx = motif.addComponent(Graphics);
        this.drawTierMotif(gfx, width, height, theme, tierKey);

        cardBg.addChild(motif);
    }

    private drawTierMotif(gfx: Graphics, width: number, height: number, theme: any, tierKey: string) {
        gfx.clear();
        const motifColor = new Color(theme.cardInner);
        motifColor.a = 140;
        gfx.lineWidth = 2;

        if (tierKey === 'bronze') {
            gfx.strokeColor = motifColor;
            const stripeCount = 6;
            const startX = -width / 2 + 20;
            const startY = -height / 2 + 30;
            for (let i = 0; i < stripeCount; i++) {
                const x = startX + i * 14;
                gfx.moveTo(x, startY);
                gfx.lineTo(x + 80, startY + 80);
            }
            gfx.stroke();
        } else if (tierKey === 'silver') {
            gfx.fillColor = motifColor;
            for (let y = -height / 2 + 24; y < height / 2 - 24; y += 26) {
                for (let x = width / 2 - 140; x < width / 2 - 20; x += 26) {
                    gfx.circle(x, y, 2);
                    gfx.fill();
                }
            }
        } else {
            gfx.strokeColor = motifColor;
            const corner = 24;
            const offset = 18;
            const corners = [
                { x: -width / 2 + offset, y: height / 2 - offset },
                { x: width / 2 - offset, y: height / 2 - offset },
                { x: -width / 2 + offset, y: -height / 2 + offset },
                { x: width / 2 - offset, y: -height / 2 + offset }
            ];
            corners.forEach((c) => {
                const dx = c.x > 0 ? -corner : corner;
                const dy = c.y > 0 ? -corner : corner;
                gfx.moveTo(c.x, c.y);
                gfx.lineTo(c.x + dx, c.y);
                gfx.lineTo(c.x, c.y + dy);
            });
            gfx.stroke();
        }
    }
    
    buyTicket(tierKey: string) {
        const tier = getTierConfig(tierKey);
        if (!tier) return;
        if (this.isPickingCard) {
            this.showResult('正在挑选卡片', new Color(220, 220, 220, 255));
            return;
        }
        
        // 如果有未完成的卡片，不允许购买（允许直接下一张时放行）
        if (this.currentCard && !this.currentCard.isComplete && !this.allowNext) {
            this.showResult('请先刮完当前彩票！', new Color(255, 200, 100, 255));
            return;
        }
        this.allowNext = false;
        this.setCardContainerVisible(false);

        this.unschedule(this.resetCardArea);
        this.hideNextCardButton();
        this.lastTierKey = tierKey;
        this.updateNextCardLabel();
        this.setHelpTooltipVisible(false);
        const wallet = InventoryManager.instance?.globalWallet || 0;
        let cost = tier.price;
        let usedVoucher = false;
        if (SpecialEventVoucherManager.instance.getValidCount('lottery', tierKey) > 0) {
            usedVoucher = SpecialEventVoucherManager.instance.consumeVoucher('lottery', tierKey);
            if (usedVoucher) {
                cost = 0;
            }
        }

        if (wallet < cost) {
            this.showResult('金币不足！', new Color(255, 100, 100, 255));
            return;
        }

        // 从钱包扣除
        if (InventoryManager.instance && cost > 0) {
            InventoryManager.instance.setWallet(wallet - cost);
        }
        this.updateWalletDisplay();
        director.emit('LOTTERY_MONEY_CHANGED');  // 通知全局金币变化

        console.log(`[LotteryStation] 🎫 购买${tier.name}，花费${cost}币${usedVoucher ? ' (使用免费票)' : ''}`);
        
        this.showResult('', new Color(200, 200, 200, 255));
        this.isPickingCard = false;
        this.pendingTierKey = null;
        this.pendingPickIndex = null;
        this.pendingCardReady = false;
        if (this.cardPickLayer) {
            this.cardPickLayer.active = false;
        }
        this.showCardForTier(tierKey);
    }

    private showCardForTier(tierKey: string) {
        const card = this.consumeCachedCard(tierKey);
        if (!card) {
            return;
        }
        if (this.templateBuilding) {
            this.pendingCardToShow = card;
            this.showLoadingHint('老板正在取卡');
            return;
        }
        if (!this.cardBuilt) {
            this.pendingCardToShow = card;
            this.showLoadingHint('老板正在取卡');
            this.ensureCardTemplate();
            return;
        }
        this.showLoadingHint('老板正在取卡');
        this.scheduleOnce(() => {
            this.applyCardData(card);
            this.renderScratchCard();
            this.setCardCoverVisible(false);
            this.setCardContainerVisible(true);
            this.refreshOverlayOrder();
            this.hideLoadingHint();
        }, 0);
    }

    private consumeCachedCard(tierKey: string): ScratchCardData | null {
        const luckyConfig = LOTTERY_CONFIG.specialMechanics.luckyStreak;
        const cached = this.cardDataCache[tierKey];
        if (cached && luckyConfig.enabled && this.loseStreak >= luckyConfig.threshold) {
            const hasMatch = cached.cells.some((cell) => cell.matched);
            if (!hasMatch) {
                this.cardDataCache[tierKey] = null;
            }
        }
        const card = this.cardDataCache[tierKey] ?? this.buildScratchCardData(tierKey);
        this.cardDataCache[tierKey] = null;
        this.warmCardDataCache();
        return card;
    }

    private buildScratchCardData(tierKey: string): ScratchCardData | null {
        const tier = getTierConfig(tierKey);
        if (!tier) return null;
        const layout = LOTTERY_CONFIG.cardLayout;
        const rules = LOTTERY_CONFIG.scratchRules;
        const totalCells = layout.rows * layout.cols;
        const winningNumber = this.getDailyWinningNumber(tierKey);

        const luckyConfig = LOTTERY_CONFIG.specialMechanics.luckyStreak;
        const forceWin = luckyConfig.enabled && this.loseStreak >= luckyConfig.threshold;

        const rainbowConfig = LOTTERY_CONFIG.specialMechanics.rainbowCard;
        const isRainbow = rainbowConfig.enabled && Math.random() < rainbowConfig.rate;

        const won = forceWin || Math.random() < tier.winRate;
        const matchCount = won ? (Math.random() < 0.25 ? 2 : 1) : 0;
        const matchIndices: Set<number> = new Set();
        while (matchIndices.size < Math.min(matchCount, totalCells)) {
            matchIndices.add(Math.floor(Math.random() * totalCells));
        }

        const cells: ScratchCellData[] = [];
        for (let i = 0; i < totalCells; i++) {
            const matched = matchIndices.has(i);
            const number = matched
                ? winningNumber
                : this.rollNumberExcluding(winningNumber, rules.numberMin, rules.numberMax);
            const preferHigh = !matched && Math.random() < 0.18;
            const amount = this.rollAmount(tier, preferHigh);
            cells.push({
                number,
                amount,
                matched,
                numberRevealed: false,
                amountRevealed: false
            });
        }

        return {
            tier: tierKey,
            winningNumber,
            cells,
            isRainbow,
            isComplete: false
        };
    }

    private applyCardData(card: ScratchCardData) {
        this.currentCard = card;
        this.resultShown = false;
        this.rewardGranted = false;
        this.allowNext = false;
        this.loseHintShown = false;
    }
    
    private generateCard(tierKey: string) {
        const card = this.buildScratchCardData(tierKey);
        if (!card) return;
        this.applyCardData(card);
        const matchCount = card.cells.filter((cell) => cell.matched).length;
        console.log(`[LotteryStation] 生成刮刮卡: 中奖号=${card.winningNumber}, 命中=${matchCount}, 彩虹卡=${card.isRainbow}`);
    }
    
    private renderScratchCard() {
        if (!this.currentCard || !this.cardContainer) return;
        this.hideNextCardButton();
        this.loseHintShown = false;
        this.allowNext = false;
        
        const card = this.currentCard;
        const theme = this.getTierTheme(card.tier);
        const layout = LOTTERY_CONFIG.cardLayout;
        const grid = LOTTERY_CONFIG.scratchMaskGrid;

        const rows = layout.rows;
        const cols = layout.cols;
        const totalCells = rows * cols;
        const gridWidth = cols * layout.cellSize + (cols - 1) * layout.gap;
        const gridHeight = rows * layout.cellSize + (rows - 1) * layout.gap;
        const cardWidth = gridWidth + layout.padding * 2;
        const cardHeight = gridHeight + layout.winningAreaHeight + layout.padding * 2 + layout.gap;
        this.cardWidth = cardWidth;
        this.cardHeight = cardHeight;
        this.updateHelpIconPosition();

        const containerTransform = this.cardContainer.getComponent(UITransform);
        if (containerTransform) {
            containerTransform.setContentSize(cardWidth, cardHeight);
        }
        this.updateCardCoverSize(cardWidth, cardHeight);

        const canReuse = this.cardBuilt
            && this.numberMaskContainer
            && this.amountMaskContainer
            && this.winningMaskContainer
            && this.numberLabels.length === totalCells
            && this.amountLabels.length === totalCells
            && this.invalidStampNodes.length === totalCells;

        if (canReuse) {
            if (this.cardBuiltTier !== card.tier) {
                this.applyCardTheme(card.tier, cardWidth, cardHeight, gridWidth);
                this.cardBuiltTier = card.tier;
            }
            this.resetScratchRuntimeState(totalCells);
            this.updateCardContent();
            this.resetScratchMasksStaggered();
            this.showResult('', new Color(255, 255, 255, 255));
            this.setCardCoverVisible(false);
            this.promoteTagNodes();
            return;
        }

        if (this.cardCoverNode && this.cardCoverNode.parent === this.cardContainer) {
            this.cardCoverNode.removeFromParent();
        }
        this.cardContainer.removeAllChildren();
        this.resetScratchState();
        this.cardBuilt = true;
        this.cardBuiltTier = card.tier;

        const cardBg = new Node('CardBg');
        this.ensureUITransform(cardBg, cardWidth, cardHeight);
        const bgGraphics = cardBg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(theme.cardBg);
        bgGraphics.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
        bgGraphics.fill();
        bgGraphics.strokeColor = new Color(theme.cardBorder);
        bgGraphics.lineWidth = 3;
        bgGraphics.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
        bgGraphics.stroke();
        bgGraphics.strokeColor = new Color(theme.cardInner);
        bgGraphics.lineWidth = 2;
        bgGraphics.roundRect(-cardWidth / 2 + 6, -cardHeight / 2 + 6, cardWidth - 12, cardHeight - 12, 10);
        bgGraphics.stroke();
        bgGraphics.fillColor = new Color(255, 255, 255, 40);
        bgGraphics.roundRect(-cardWidth / 2 + 12, cardHeight / 2 - 32, cardWidth - 24, 16, 8);
        bgGraphics.fill();
        this.cardContainer.addChild(cardBg);

        const cardPattern = new Node('CardPattern');
        this.ensureUITransform(cardPattern, cardWidth, cardHeight);
        const patternGfx = cardPattern.addComponent(Graphics);
        patternGfx.lineWidth = 1;
        patternGfx.strokeColor = new Color(theme.pattern);
        const patternStep = 18;
        for (let x = -cardWidth; x < cardWidth; x += patternStep) {
            patternGfx.moveTo(x, -cardHeight / 2);
            patternGfx.lineTo(x + cardHeight, cardHeight / 2);
        }
        patternGfx.stroke();
        cardBg.addChild(cardPattern);
        this.addTierMotif(cardBg, cardWidth, cardHeight, theme, card.tier);

        const winningCenterY = cardHeight / 2 - layout.padding - layout.winningAreaHeight / 2;
        const winningLeft = -gridWidth / 2;
        const winningRight = gridWidth / 2;
        const winningTop = winningCenterY + layout.winningAreaHeight / 2;
        const winningBottom = winningCenterY - layout.winningAreaHeight / 2;
        this.winningBounds = { left: winningLeft, right: winningRight, top: winningTop, bottom: winningBottom };

        const winningArea = new Node('WinningArea');
        this.ensureUITransform(winningArea, gridWidth, layout.winningAreaHeight);
        const winningGfx = winningArea.addComponent(Graphics);
        winningGfx.fillColor = new Color(theme.winBar);
        winningGfx.roundRect(winningLeft, winningBottom, gridWidth, layout.winningAreaHeight, 8);
        winningGfx.fill();
        winningGfx.strokeColor = new Color(theme.winBorder);
        winningGfx.lineWidth = 2;
        winningGfx.roundRect(winningLeft, winningBottom, gridWidth, layout.winningAreaHeight, 8);
        winningGfx.stroke();
        winningGfx.fillColor = new Color(theme.winHighlight);
        winningGfx.roundRect(winningLeft + 6, winningTop - 14, gridWidth - 12, 8, 4);
        winningGfx.fill();
        this.cardContainer.addChild(winningArea);

        const winningBadge = new Node('WinningBadge');
        winningBadge.parent = this.cardContainer;
        winningBadge.setPosition(-gridWidth / 2 + 26, winningCenterY + 16, 0);
        this.ensureUITransform(winningBadge, 18, 18);
        const badgeGfx = winningBadge.addComponent(Graphics);
        badgeGfx.fillColor = new Color(255, 244, 210, 255);
        badgeGfx.circle(0, 0, 8);
        badgeGfx.fill();
        badgeGfx.strokeColor = new Color(theme.winBorder);
        badgeGfx.lineWidth = 2;
        badgeGfx.circle(0, 0, 8);
        badgeGfx.stroke();

        const winningTitle = new Node('WinningTitle');
        winningTitle.parent = this.cardContainer;
        winningTitle.setPosition(0, winningCenterY + 18, 0);
        this.ensureUITransform(winningTitle, 120, 28);
        const winningTitleLabel = winningTitle.addComponent(Label);
        winningTitleLabel.string = '中奖号';
        winningTitleLabel.fontSize = 20;
        winningTitleLabel.isBold = false;
        winningTitleLabel.color = new Color(50, 30, 10, 255);
        winningTitleLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        winningTitleLabel.enableOutline = true;
        winningTitleLabel.outlineColor = Color.BLACK;
        winningTitleLabel.outlineWidth = 1;

        const winningNumberNode = new Node('WinningNumber');
        winningNumberNode.parent = this.cardContainer;
        winningNumberNode.setPosition(0, winningCenterY - 10, 0);
        this.ensureUITransform(winningNumberNode, 120, 40);
        this.winningNumberLabel = winningNumberNode.addComponent(Label);
        this.winningNumberLabel.string = this.formatNumber(card.winningNumber);
        this.winningNumberLabel.fontSize = 34;
        this.winningNumberLabel.isBold = false;
        this.winningNumberLabel.color = new Color(120, 70, 30, 255);
        this.winningNumberLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.winningNumberLabel.enableOutline = true;
        this.winningNumberLabel.outlineColor = Color.BLACK;
        this.winningNumberLabel.outlineWidth = 1;

        const tierBadge = new Node('TierBadge');
        tierBadge.parent = this.cardContainer;
        tierBadge.setPosition(gridWidth / 2 - 52, winningCenterY + 18, 0);
        this.ensureUITransform(tierBadge, 72, 22);
        const tierBadgeGfx = tierBadge.addComponent(Graphics);
        tierBadgeGfx.fillColor = new Color(theme.cardInner);
        tierBadgeGfx.roundRect(-36, -11, 72, 22, 8);
        tierBadgeGfx.fill();
        tierBadgeGfx.strokeColor = new Color(theme.winBorder);
        tierBadgeGfx.lineWidth = 2;
        tierBadgeGfx.roundRect(-36, -11, 72, 22, 8);
        tierBadgeGfx.stroke();
        const tierBadgeLabelNode = new Node('Label');
        tierBadgeLabelNode.parent = tierBadge;
        this.ensureUITransform(tierBadgeLabelNode, 72, 22);
        const tierBadgeLabel = tierBadgeLabelNode.addComponent(Label);
        tierBadgeLabel.string = this.getTierDisplayName(card.tier);
        tierBadgeLabel.fontSize = 14;
        tierBadgeLabel.color = new Color(theme.tagText);
        tierBadgeLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        tierBadgeLabel.verticalAlign = Label.VerticalAlign.CENTER;

        const rainbowNode = new Node('Rainbow');
        rainbowNode.parent = this.cardContainer;
        rainbowNode.setPosition(gridWidth / 2 - 30, winningCenterY - 14, 0);
        this.ensureUITransform(rainbowNode, 80, 24);
        const rainbowLabel = rainbowNode.addComponent(Label);
        rainbowLabel.string = '彩虹 x2';
        rainbowLabel.fontSize = 16;
        rainbowLabel.color = new Color(255, 170, 90, 255);
        rainbowNode.active = card.isRainbow;

        const gridTop = winningBottom - layout.gap;
        const gridLeft = -gridWidth / 2;
        this.gridBounds = {
            left: gridLeft,
            right: gridLeft + gridWidth,
            top: gridTop,
            bottom: gridTop - gridHeight
        };

        this.numberTagNodes = [];
        this.amountTagNodes = [];
        const tagX = -243;
        for (let row = 0; row < rows; row++) {
            const rowTop = gridTop - row * (layout.cellSize + layout.gap);

            const numberTag = new Node(`NumberTag_${row}`);
            numberTag.parent = this.cardContainer;
            numberTag.setPosition(tagX, rowTop - layout.cellSize / 4, 0);
            this.ensureUITransform(numberTag, 46, 18);
            const numberTagGfx = numberTag.addComponent(Graphics);
            numberTagGfx.fillColor = new Color(theme.tagNumberBg);
            numberTagGfx.roundRect(-23, -9, 46, 18, 6);
            numberTagGfx.fill();
            numberTagGfx.strokeColor = new Color(theme.tagBorder);
            numberTagGfx.lineWidth = 2;
            numberTagGfx.roundRect(-23, -9, 46, 18, 6);
            numberTagGfx.stroke();
            const numberTagLabelNode = new Node('Label');
            numberTagLabelNode.parent = numberTag;
            this.ensureUITransform(numberTagLabelNode, 46, 18);
            const numberTagLabel = numberTagLabelNode.addComponent(Label);
            numberTagLabel.string = '#';
            numberTagLabel.fontSize = 12;
            numberTagLabel.color = new Color(theme.tagText);
            numberTagLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            numberTagLabel.verticalAlign = Label.VerticalAlign.CENTER;
            this.numberTagNodes.push(numberTag);

            const amountTag = new Node(`AmountTag_${row}`);
            amountTag.parent = this.cardContainer;
            amountTag.setPosition(tagX, rowTop - layout.cellSize * 3 / 4, 0);
            this.ensureUITransform(amountTag, 46, 18);
            const amountTagGfx = amountTag.addComponent(Graphics);
            amountTagGfx.fillColor = new Color(theme.tagAmountBg);
            amountTagGfx.roundRect(-23, -9, 46, 18, 6);
            amountTagGfx.fill();
            amountTagGfx.strokeColor = new Color(theme.tagBorder);
            amountTagGfx.lineWidth = 2;
            amountTagGfx.roundRect(-23, -9, 46, 18, 6);
            amountTagGfx.stroke();
            const amountTagLabelNode = new Node('Label');
            amountTagLabelNode.parent = amountTag;
            this.ensureUITransform(amountTagLabelNode, 46, 18);
            const amountTagLabel = amountTagLabelNode.addComponent(Label);
            amountTagLabel.string = '$';
            amountTagLabel.fontSize = 12;
            amountTagLabel.color = new Color(theme.tagText);
            amountTagLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
            amountTagLabel.verticalAlign = Label.VerticalAlign.CENTER;
            this.amountTagNodes.push(amountTag);
        }

        this.numberLabels = [];
        this.amountLabels = [];
        this.invalidStampNodes = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const idx = row * cols + col;
                const cell = card.cells[idx];
                const cellCenterX = gridLeft + col * (layout.cellSize + layout.gap) + layout.cellSize / 2;
                const cellCenterY = gridTop - row * (layout.cellSize + layout.gap) - layout.cellSize / 2;

                const cellNode = new Node(`Cell_${idx}`);
                cellNode.parent = this.cardContainer;
                cellNode.setPosition(cellCenterX, cellCenterY, 0);
                cellNode.addComponent(UITransform).setContentSize(layout.cellSize, layout.cellSize);

                const cellBg = cellNode.addComponent(Graphics);
                cellBg.fillColor = new Color(theme.cellBg);
                cellBg.roundRect(-layout.cellSize / 2, -layout.cellSize / 2, layout.cellSize, layout.cellSize, 6);
                cellBg.fill();
                cellBg.strokeColor = new Color(theme.cellBorder);
                cellBg.lineWidth = 2;
                cellBg.roundRect(-layout.cellSize / 2, -layout.cellSize / 2, layout.cellSize, layout.cellSize, 6);
                cellBg.stroke();
                cellBg.fillColor = new Color(255, 255, 255, 50);
                cellBg.roundRect(-layout.cellSize / 2 + 6, layout.cellSize / 2 - 14, layout.cellSize - 12, 6, 3);
                cellBg.fill();

                const areaInset = 8;
                const areaWidth = layout.cellSize - areaInset * 2;
                const areaHeight = layout.cellSize / 2 - areaInset;

                const numberArea = new Node('NumberAreaBg');
                numberArea.parent = cellNode;
                numberArea.setPosition(0, layout.cellSize / 4, 0);
                this.ensureUITransform(numberArea, areaWidth, areaHeight);
                const numberAreaGfx = numberArea.addComponent(Graphics);
                numberAreaGfx.fillColor = new Color(theme.numberArea);
                numberAreaGfx.roundRect(-areaWidth / 2, -areaHeight / 2, areaWidth, areaHeight, 4);
                numberAreaGfx.fill();

                const amountArea = new Node('AmountAreaBg');
                amountArea.parent = cellNode;
                amountArea.setPosition(0, -layout.cellSize / 4, 0);
                this.ensureUITransform(amountArea, areaWidth, areaHeight);
                const amountAreaGfx = amountArea.addComponent(Graphics);
                amountAreaGfx.fillColor = new Color(theme.amountArea);
                amountAreaGfx.roundRect(-areaWidth / 2, -areaHeight / 2, areaWidth, areaHeight, 4);
                amountAreaGfx.fill();

                const divider = new Node('AreaDivider');
                divider.parent = cellNode;
                divider.setPosition(0, 0, 0);
                this.ensureUITransform(divider, areaWidth, 2);
                const dividerGfx = divider.addComponent(Graphics);
                dividerGfx.strokeColor = new Color(theme.divider);
                dividerGfx.lineWidth = 2;
                dividerGfx.moveTo(-areaWidth / 2, 0);
                dividerGfx.lineTo(areaWidth / 2, 0);
                dividerGfx.stroke();

                const numberNode = new Node('Number');
                numberNode.parent = cellNode;
                numberNode.setPosition(0, 18, 0);
                this.ensureUITransform(numberNode, 80, 32);
                const numberLabel = numberNode.addComponent(Label);
                numberLabel.string = this.formatNumber(cell.number);
                numberLabel.fontSize = 28;
                numberLabel.isBold = false;
                numberLabel.color = new Color(NUMBER_DEFAULT_COLOR);
                numberLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
                numberLabel.enableOutline = true;
                numberLabel.outlineColor = Color.BLACK;
                numberLabel.outlineWidth = 1;
                numberLabel.node.active = false;
                this.numberLabels[idx] = numberLabel;

                const amountNode = new Node('Amount');
                amountNode.parent = cellNode;
                amountNode.setPosition(0, -20, 0);
                this.ensureUITransform(amountNode, 80, 28);
                const amountLabel = amountNode.addComponent(Label);
                amountLabel.string = this.formatAmount(cell.amount);
                amountLabel.fontSize = 24;
                amountLabel.isBold = false;
                amountLabel.color = new Color(AMOUNT_DEFAULT_COLOR);
                amountLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
                amountLabel.enableOutline = true;
                amountLabel.outlineColor = Color.BLACK;
                amountLabel.outlineWidth = 1;
                amountLabel.node.active = false;
                this.amountLabels[idx] = amountLabel;

                const invalidNode = new Node('InvalidStamp');
                invalidNode.parent = cellNode;
                invalidNode.setPosition(0, 0, 0);
                invalidNode.angle = -15;
                this.ensureUITransform(invalidNode, 60, 24);
                const invalidLabel = invalidNode.addComponent(Label);
                invalidLabel.string = '未中';
                invalidLabel.fontSize = 18;
                invalidLabel.isBold = true;
                invalidLabel.color = new Color(STAMP_COLOR);
                invalidLabel.enableOutline = true;
                invalidLabel.outlineColor = Color.BLACK;
                invalidLabel.outlineWidth = 2;
                invalidNode.active = false;
                this.invalidStampNodes[idx] = invalidNode;
            }
        }

        this.numberMaskContainer = new Node('NumberMask');
        this.numberMaskContainer.addComponent(UITransform).setContentSize(cardWidth, cardHeight);
        this.cardContainer.addChild(this.numberMaskContainer);

        this.amountMaskContainer = new Node('AmountMask');
        this.amountMaskContainer.addComponent(UITransform).setContentSize(cardWidth, cardHeight);
        this.cardContainer.addChild(this.amountMaskContainer);

        this.winningMaskContainer = new Node('WinningMask');
        this.winningMaskContainer.addComponent(UITransform).setContentSize(cardWidth, cardHeight);
        this.cardContainer.addChild(this.winningMaskContainer);

        this.numberScratched = new Array(rows * cols).fill(0);
        this.amountScratched = new Array(rows * cols).fill(0);
        this.numberTotals = new Array(rows * cols).fill(0);
        this.amountTotals = new Array(rows * cols).fill(0);
        this.totalNumberBlocks = 0;
        this.totalAmountBlocks = 0;

        const numberCols = grid.numberColsPerCell;
        const numberRows = grid.numberRowsPerCell;
        const amountCols = grid.amountColsPerCell;
        const amountRows = grid.amountRowsPerCell;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const idx = row * cols + col;
                const cellLeft = gridLeft + col * (layout.cellSize + layout.gap);
                const cellTop = gridTop - row * (layout.cellSize + layout.gap);
                const cellCenterY = cellTop - layout.cellSize / 2;

                const numberAreaTop = cellTop;
                const numberAreaBottom = cellCenterY;
                const numberAreaHeight = numberAreaTop - numberAreaBottom;
                const nBlockW = layout.cellSize / numberCols;
                const nBlockH = numberAreaHeight / numberRows;
                for (let r = 0; r < numberRows; r++) {
                    for (let c = 0; c < numberCols; c++) {
                        const block = new Node(`N_${idx}_${r}_${c}`);
                        const x = cellLeft + nBlockW / 2 + c * nBlockW;
                        const y = numberAreaTop - nBlockH / 2 - r * nBlockH;
                        block.setPosition(x, y, 0);
                        block.addComponent(UITransform).setContentSize(nBlockW + 1, nBlockH + 1);
                        const g = block.addComponent(Graphics);
                        g.fillColor = new Color(210, 210, 220, 255);
                        g.rect(-nBlockW / 2, -nBlockH / 2, nBlockW + 1, nBlockH + 1);
                        g.fill();
                        this.numberMaskContainer.addChild(block);
                        this.numberTotals[idx]++;
                        this.totalNumberBlocks++;
                    }
                }

                const amountAreaTop = cellCenterY;
                const amountAreaBottom = cellTop - layout.cellSize;
                const amountAreaHeight = amountAreaTop - amountAreaBottom;
                const aBlockW = layout.cellSize / amountCols;
                const aBlockH = amountAreaHeight / amountRows;
                for (let r = 0; r < amountRows; r++) {
                    for (let c = 0; c < amountCols; c++) {
                        const block = new Node(`A_${idx}_${r}_${c}`);
                        const x = cellLeft + aBlockW / 2 + c * aBlockW;
                        const y = amountAreaTop - aBlockH / 2 - r * aBlockH;
                        block.setPosition(x, y, 0);
                        block.addComponent(UITransform).setContentSize(aBlockW + 1, aBlockH + 1);
                        const g = block.addComponent(Graphics);
                        g.fillColor = new Color(185, 180, 190, 255);
                        g.rect(-aBlockW / 2, -aBlockH / 2, aBlockW + 1, aBlockH + 1);
                        g.fill();
                        this.amountMaskContainer.addChild(block);
                        this.amountTotals[idx]++;
                        this.totalAmountBlocks++;
                    }
                }
            }
        }

        this.winningScratched = 0;
        this.winningTotal = 0;
        const winCols = grid.winningCols;
        const winRows = grid.winningRows;
        const winBlockW = gridWidth / winCols;
        const winBlockH = layout.winningAreaHeight / winRows;
        for (let r = 0; r < winRows; r++) {
            for (let c = 0; c < winCols; c++) {
                const block = new Node(`W_${r}_${c}`);
                const x = winningLeft + winBlockW / 2 + c * winBlockW;
                const y = winningTop - winBlockH / 2 - r * winBlockH;
                block.setPosition(x, y, 0);
                block.addComponent(UITransform).setContentSize(winBlockW + 1, winBlockH + 1);
                const g = block.addComponent(Graphics);
                g.fillColor = new Color(200, 200, 210, 255);
                g.rect(-winBlockW / 2, -winBlockH / 2, winBlockW + 1, winBlockH + 1);
                g.fill();
                this.winningMaskContainer.addChild(block);
                this.winningTotal++;
            }
        }
        const legendNode = new Node('Legend');
        legendNode.parent = this.cardContainer;
        legendNode.setPosition(0, -cardHeight / 2 + layout.padding / 2 + 2, 0);
        this.ensureUITransform(legendNode, cardWidth - 20, 22);
        const legendBg = new Node('LegendBg');
        legendBg.parent = legendNode;
        this.ensureUITransform(legendBg, cardWidth - 20, 22);
        const legendGfx = legendBg.addComponent(Graphics);
        legendGfx.fillColor = new Color(theme.legendBg);
        legendGfx.roundRect(-(cardWidth - 20) / 2, -11, cardWidth - 20, 22, 8);
        legendGfx.fill();
        legendGfx.strokeColor = new Color(theme.legendBorder);
        legendGfx.lineWidth = 2;
        legendGfx.roundRect(-(cardWidth - 20) / 2, -11, cardWidth - 20, 22, 8);
        legendGfx.stroke();
        const legendLabel = legendNode.addComponent(Label);
        legendLabel.string = '中奖号=开奖数字  #=你的号码  $=对应奖励';
        legendLabel.fontSize = 13;
        legendLabel.color = new Color(90, 90, 90, 255);
        legendLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        legendLabel.verticalAlign = Label.VerticalAlign.CENTER;

        const touchLayer = new Node('TouchLayer');
        touchLayer.addComponent(UITransform).setContentSize(cardWidth + 60, cardHeight + 60);
        touchLayer.addComponent(Button);
        this.cardContainer.addChild(touchLayer);

        touchLayer.on(Node.EventType.TOUCH_START, (event: EventTouch) => {
            event.propagationStopped = true;
            if (this.currentCard) {
                const pos = event.getUILocation();
                this.updateScratchCursor(pos.x, pos.y);
                this.beginScratch(pos.x, pos.y);
            }
        });

        touchLayer.on(Node.EventType.TOUCH_MOVE, (event: EventTouch) => {
            event.propagationStopped = true;
            if (this.isScratching && this.currentCard) {
                const pos = event.getUILocation();
                this.updateScratchCursor(pos.x, pos.y);
                this.continueScratch(pos.x, pos.y);
            }
        });

        touchLayer.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            this.endScratch();
            this.hideScratchCursor();
        });

        touchLayer.on(Node.EventType.TOUCH_CANCEL, (event: EventTouch) => {
            event.propagationStopped = true;
            this.endScratch();
            this.hideScratchCursor();
        });

        if (this.cardCoverNode) {
            this.cardContainer.addChild(this.cardCoverNode);
            this.cardCoverNode.setSiblingIndex(9999);
        }

        this.promoteTagNodes();
        this.showResult('', new Color(255, 255, 255, 255));
        this.setCardCoverVisible(false);
    }

    private applyCardTheme(tierKey: string, cardWidth: number, cardHeight: number, gridWidth: number) {
        if (!this.cardContainer) return;
        const layout = LOTTERY_CONFIG.cardLayout;
        const theme = this.getTierTheme(tierKey);

        const cardBg = this.cardContainer.getChildByName('CardBg');
        if (cardBg) {
            const bgGraphics = cardBg.getComponent(Graphics);
            if (bgGraphics) {
                bgGraphics.clear();
                bgGraphics.fillColor = new Color(theme.cardBg);
                bgGraphics.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
                bgGraphics.fill();
                bgGraphics.strokeColor = new Color(theme.cardBorder);
                bgGraphics.lineWidth = 3;
                bgGraphics.roundRect(-cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 12);
                bgGraphics.stroke();
                bgGraphics.strokeColor = new Color(theme.cardInner);
                bgGraphics.lineWidth = 2;
                bgGraphics.roundRect(-cardWidth / 2 + 6, -cardHeight / 2 + 6, cardWidth - 12, cardHeight - 12, 10);
                bgGraphics.stroke();
                bgGraphics.fillColor = new Color(255, 255, 255, 40);
                bgGraphics.roundRect(-cardWidth / 2 + 12, cardHeight / 2 - 32, cardWidth - 24, 16, 8);
                bgGraphics.fill();
            }

            const cardPattern = cardBg.getChildByName('CardPattern');
            if (cardPattern) {
                const patternGfx = cardPattern.getComponent(Graphics);
                if (patternGfx) {
                    patternGfx.clear();
                    patternGfx.lineWidth = 1;
                    patternGfx.strokeColor = new Color(theme.pattern);
                    const patternStep = 18;
                    for (let x = -cardWidth; x < cardWidth; x += patternStep) {
                        patternGfx.moveTo(x, -cardHeight / 2);
                        patternGfx.lineTo(x + cardHeight, cardHeight / 2);
                    }
                    patternGfx.stroke();
                }
            }

            this.updateTierMotif(cardBg, cardWidth, cardHeight, theme, tierKey);
        }

        const winningCenterY = cardHeight / 2 - layout.padding - layout.winningAreaHeight / 2;
        const winningLeft = -gridWidth / 2;
        const winningTop = winningCenterY + layout.winningAreaHeight / 2;
        const winningBottom = winningCenterY - layout.winningAreaHeight / 2;

        const winningArea = this.cardContainer.getChildByName('WinningArea');
        if (winningArea) {
            const winningGfx = winningArea.getComponent(Graphics);
            if (winningGfx) {
                winningGfx.clear();
                winningGfx.fillColor = new Color(theme.winBar);
                winningGfx.roundRect(winningLeft, winningBottom, gridWidth, layout.winningAreaHeight, 8);
                winningGfx.fill();
                winningGfx.strokeColor = new Color(theme.winBorder);
                winningGfx.lineWidth = 2;
                winningGfx.roundRect(winningLeft, winningBottom, gridWidth, layout.winningAreaHeight, 8);
                winningGfx.stroke();
                winningGfx.fillColor = new Color(theme.winHighlight);
                winningGfx.roundRect(winningLeft + 6, winningTop - 14, gridWidth - 12, 8, 4);
                winningGfx.fill();
            }
        }

        const winningBadge = this.cardContainer.getChildByName('WinningBadge');
        if (winningBadge) {
            const badgeGfx = winningBadge.getComponent(Graphics);
            if (badgeGfx) {
                badgeGfx.clear();
                badgeGfx.fillColor = new Color(255, 244, 210, 255);
                badgeGfx.circle(0, 0, 8);
                badgeGfx.fill();
                badgeGfx.strokeColor = new Color(theme.winBorder);
                badgeGfx.lineWidth = 2;
                badgeGfx.circle(0, 0, 8);
                badgeGfx.stroke();
            }
        }

        const tierBadge = this.cardContainer.getChildByName('TierBadge');
        if (tierBadge) {
            const badgeGfx = tierBadge.getComponent(Graphics);
            if (badgeGfx) {
                badgeGfx.clear();
                badgeGfx.fillColor = new Color(theme.cardInner);
                badgeGfx.roundRect(-36, -11, 72, 22, 8);
                badgeGfx.fill();
                badgeGfx.strokeColor = new Color(theme.winBorder);
                badgeGfx.lineWidth = 2;
                badgeGfx.roundRect(-36, -11, 72, 22, 8);
                badgeGfx.stroke();
            }
            const badgeLabel = tierBadge.getChildByName('Label')?.getComponent(Label);
            if (badgeLabel) {
                badgeLabel.string = this.getTierDisplayName(tierKey);
                badgeLabel.color = new Color(theme.tagText);
            }
        }

        const legendNode = this.cardContainer.getChildByName('Legend');
        if (legendNode) {
            const legendBg = legendNode.getChildByName('LegendBg');
            const legendGfx = legendBg?.getComponent(Graphics);
            if (legendGfx) {
                const width = cardWidth - 20;
                legendGfx.clear();
                legendGfx.fillColor = new Color(theme.legendBg);
                legendGfx.roundRect(-width / 2, -11, width, 22, 8);
                legendGfx.fill();
                legendGfx.strokeColor = new Color(theme.legendBorder);
                legendGfx.lineWidth = 2;
                legendGfx.roundRect(-width / 2, -11, width, 22, 8);
                legendGfx.stroke();
            }
        }

        this.numberTagNodes.forEach((node) => {
            const gfx = node.getComponent(Graphics);
            if (gfx) {
                gfx.clear();
                gfx.fillColor = new Color(theme.tagNumberBg);
                gfx.roundRect(-23, -9, 46, 18, 6);
                gfx.fill();
                gfx.strokeColor = new Color(theme.tagBorder);
                gfx.lineWidth = 2;
                gfx.roundRect(-23, -9, 46, 18, 6);
                gfx.stroke();
            }
            const label = node.getChildByName('Label')?.getComponent(Label);
            if (label) {
                label.color = new Color(theme.tagText);
            }
        });

        this.amountTagNodes.forEach((node) => {
            const gfx = node.getComponent(Graphics);
            if (gfx) {
                gfx.clear();
                gfx.fillColor = new Color(theme.tagAmountBg);
                gfx.roundRect(-23, -9, 46, 18, 6);
                gfx.fill();
                gfx.strokeColor = new Color(theme.tagBorder);
                gfx.lineWidth = 2;
                gfx.roundRect(-23, -9, 46, 18, 6);
                gfx.stroke();
            }
            const label = node.getChildByName('Label')?.getComponent(Label);
            if (label) {
                label.color = new Color(theme.tagText);
            }
        });

        const cellSize = layout.cellSize;
        const areaInset = 8;
        const areaWidth = cellSize - areaInset * 2;
        const areaHeight = cellSize / 2 - areaInset;
        for (let i = 0; i < this.numberLabels.length; i++) {
            const cellNode = this.numberLabels[i]?.node?.parent;
            if (!cellNode) continue;
            const cellGfx = cellNode.getComponent(Graphics);
            if (cellGfx) {
                cellGfx.clear();
                cellGfx.fillColor = new Color(theme.cellBg);
                cellGfx.roundRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 6);
                cellGfx.fill();
                cellGfx.strokeColor = new Color(theme.cellBorder);
                cellGfx.lineWidth = 2;
                cellGfx.roundRect(-cellSize / 2, -cellSize / 2, cellSize, cellSize, 6);
                cellGfx.stroke();
                cellGfx.fillColor = new Color(255, 255, 255, 50);
                cellGfx.roundRect(-cellSize / 2 + 6, cellSize / 2 - 14, cellSize - 12, 6, 3);
                cellGfx.fill();
            }
            const numberArea = cellNode.getChildByName('NumberAreaBg');
            const numberAreaGfx = numberArea?.getComponent(Graphics);
            if (numberAreaGfx) {
                numberAreaGfx.clear();
                numberAreaGfx.fillColor = new Color(theme.numberArea);
                numberAreaGfx.roundRect(-areaWidth / 2, -areaHeight / 2, areaWidth, areaHeight, 4);
                numberAreaGfx.fill();
            }
            const amountArea = cellNode.getChildByName('AmountAreaBg');
            const amountAreaGfx = amountArea?.getComponent(Graphics);
            if (amountAreaGfx) {
                amountAreaGfx.clear();
                amountAreaGfx.fillColor = new Color(theme.amountArea);
                amountAreaGfx.roundRect(-areaWidth / 2, -areaHeight / 2, areaWidth, areaHeight, 4);
                amountAreaGfx.fill();
            }
            const divider = cellNode.getChildByName('AreaDivider');
            const dividerGfx = divider?.getComponent(Graphics);
            if (dividerGfx) {
                dividerGfx.clear();
                dividerGfx.strokeColor = new Color(theme.divider);
                dividerGfx.lineWidth = 2;
                dividerGfx.moveTo(-areaWidth / 2, 0);
                dividerGfx.lineTo(areaWidth / 2, 0);
                dividerGfx.stroke();
            }
        }
    }

    private updateTierMotif(cardBg: Node, width: number, height: number, theme: any, tierKey: string) {
        let motif = cardBg.getChildByName('TierMotif');
        if (!motif) {
            this.addTierMotif(cardBg, width, height, theme, tierKey);
            return;
        }
        this.ensureUITransform(motif, width, height);
        const gfx = motif.getComponent(Graphics) || motif.addComponent(Graphics);
        this.drawTierMotif(gfx, width, height, theme, tierKey);
    }

    // 刮涂控制
    private beginScratch(uiX: number, uiY: number) {
        if (this.isScratching) return;
        if (this.isPickingCard) return;
        if (!this.cardContainer || !this.currentCard) return;

        const localPos = this.uiToCardLocal(uiX, uiY);
        if (!localPos) return;

        const region = this.getScratchRegion(localPos);
        if (!region) return;

        this.isScratching = true;
        this.scratchRegion = region;
        this.lastScratchLocalPos = localPos;
        this.eraseAtLocal(localPos, region);
    }

    private continueScratch(uiX: number, uiY: number) {
        if (!this.isScratching || !this.scratchRegion || !this.currentCard) return;

        const localPos = this.uiToCardLocal(uiX, uiY);
        if (!localPos) return;

        if (!this.isInScratchRegion(localPos, this.scratchRegion)) {
            return;
        }

        const from = this.lastScratchLocalPos ?? localPos;
        this.eraseAlongPath(from, localPos, this.scratchRegion);
        this.lastScratchLocalPos = localPos;
    }

    private endScratch() {
        this.isScratching = false;
        this.scratchRegion = null;
        this.lastScratchLocalPos = null;
    }

    private uiToCardLocal(uiX: number, uiY: number): Vec3 | null {
        if (!this.cardContainer) return null;
        const canvasTransform = this.getCanvasTransform();
        const cardTransform = this.cardContainer.getComponent(UITransform);
        if (!canvasTransform || !cardTransform) return null;

        const canvasLocal = this.getCanvasLocal(uiX, uiY);
        if (!canvasLocal) return null;
        const worldPos = canvasTransform.convertToWorldSpaceAR(canvasLocal);
        return cardTransform.convertToNodeSpaceAR(worldPos);
    }

    private uiToPanelLocal(uiX: number, uiY: number): Vec3 | null {
        if (!this.shopPanel) return null;
        const canvasTransform = this.getCanvasTransform();
        const panelTransform = this.shopPanel.getComponent(UITransform);
        if (!canvasTransform || !panelTransform) return null;

        const canvasLocal = this.getCanvasLocal(uiX, uiY);
        if (!canvasLocal) return null;
        const worldPos = canvasTransform.convertToWorldSpaceAR(canvasLocal);
        return panelTransform.convertToNodeSpaceAR(worldPos);
    }

    private cardToPanelLocal(cardLocal: Vec3): Vec3 | null {
        if (!this.cardContainer || !this.shopPanel) return null;
        const cardTransform = this.cardContainer.getComponent(UITransform);
        const panelTransform = this.shopPanel.getComponent(UITransform);
        if (!cardTransform || !panelTransform) return null;
        const worldPos = cardTransform.convertToWorldSpaceAR(cardLocal);
        return panelTransform.convertToNodeSpaceAR(worldPos);
    }

    private getCanvasTransform(): UITransform | null {
        const canvasNode = this.shopPanel?.parent ?? director.getScene()?.getChildByName('Canvas');
        return canvasNode?.getComponent(UITransform) ?? null;
    }

    private getCanvasLocal(uiX: number, uiY: number): Vec3 | null {
        const canvasTransform = this.getCanvasTransform();
        if (!canvasTransform) return null;
        const designSize = view.getDesignResolutionSize();
        const canvasSize = canvasTransform.contentSize;
        const scaleToCanvas = canvasSize.width / designSize.width;
        return new Vec3(
            uiX * scaleToCanvas - canvasSize.width / 2,
            uiY * scaleToCanvas - canvasSize.height / 2,
            0
        );
    }

    private getScratchRegion(localPos: Vec3): ScratchRegion | null {
        if (this.winningBounds && this.isInBounds(localPos, this.winningBounds)) {
            return 'winning';
        }

        const cellInfo = this.getCellInfoAt(localPos);
        if (!cellInfo) return null;

        return localPos.y >= cellInfo.cellCenterY ? 'number' : 'amount';
    }

    private isInScratchRegion(localPos: Vec3, region: ScratchRegion): boolean {
        if (region === 'winning') {
            return !!(this.winningBounds && this.isInBounds(localPos, this.winningBounds));
        }

        const cellInfo = this.getCellInfoAt(localPos);
        if (!cellInfo) return false;

        const dividerPadding = 10;
        return region === 'number'
            ? localPos.y >= cellInfo.cellCenterY - dividerPadding
            : localPos.y < cellInfo.cellCenterY + dividerPadding;
    }

    private eraseAlongPath(from: Vec3, to: Vec3, region: ScratchRegion) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= 0.01) {
            this.eraseAtLocal(to, region);
            return;
        }

        const baseSize = region === 'winning'
            ? LOTTERY_CONFIG.cardLayout.winningAreaHeight
            : LOTTERY_CONFIG.cardLayout.cellSize;
        const brushRadius = this.getScratchBrushRadius(baseSize);
        const step = Math.max(SCRATCH_STEP_MIN, brushRadius * 0.15);
        const steps = Math.max(1, Math.ceil(distance / step));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const pos = new Vec3(from.x + dx * t, from.y + dy * t, 0);
            if (this.isInScratchRegion(pos, region)) {
                this.eraseAtLocal(pos, region);
            }
        }
    }

    private eraseAtLocal(localPos: Vec3, region: ScratchRegion) {
        if (!this.cardContainer || !this.currentCard || !this.gridBounds) return;
        const rules = LOTTERY_CONFIG.scratchRules;

        if (region === 'winning') {
            if (!this.winningBounds || !this.isInBounds(localPos, this.winningBounds)) return;
            this.eraseWinningAt(localPos);
            this.checkCardCompletion();
            return;
        }

        let cellInfo = this.getCellInfoAt(localPos);
        let scratchPos = localPos;
        if (!cellInfo && this.gridBounds) {
            scratchPos = new Vec3(
                Math.min(this.gridBounds.right - 0.01, Math.max(this.gridBounds.left + 0.01, scratchPos.x)),
                Math.min(this.gridBounds.top - 0.01, Math.max(this.gridBounds.bottom + 0.01, scratchPos.y)),
                scratchPos.z
            );
            cellInfo = this.getCellInfoAt(scratchPos);
        }
        if (!cellInfo) return;
        const cell = this.currentCard.cells[cellInfo.index];

        if (region === 'number') {
            this.eraseNumberAt(cellInfo, scratchPos);
        } else if (region === 'amount') {
            this.eraseAmountAt(cellInfo, scratchPos);
        }

        this.checkCardCompletion();
    }

    private resetScratchState() {
        this.numberMaskContainer = null;
        this.amountMaskContainer = null;
        this.scratchRegion = null;
        this.lastScratchLocalPos = null;
        this.isScratching = false;
        this.winningMaskContainer = null;
        this.winningNumberLabel = null;
        this.numberLabels = [];
        this.amountLabels = [];
        this.invalidStampNodes = [];
        this.numberTagNodes = [];
        this.amountTagNodes = [];
        this.numberScratched = [];
        this.amountScratched = [];
        this.numberTotals = [];
        this.amountTotals = [];
        this.totalNumberBlocks = 0;
        this.totalAmountBlocks = 0;
        this.totalNumberScratched = 0;
        this.totalAmountScratched = 0;
        this.winningScratched = 0;
        this.winningTotal = 0;
        this.revealedNumberCount = 0;
        this.revealedAmountCount = 0;
        this.winningRevealed = false;
        this.gridBounds = null;
        this.winningBounds = null;
    }

    private resetScratchRuntimeState(totalCells: number) {
        const grid = LOTTERY_CONFIG.scratchMaskGrid;
        const blocksPerNumber = grid.numberColsPerCell * grid.numberRowsPerCell;
        const blocksPerAmount = grid.amountColsPerCell * grid.amountRowsPerCell;
        this.scratchRegion = null;
        this.lastScratchLocalPos = null;
        this.isScratching = false;
        this.numberScratched = new Array(totalCells).fill(0);
        this.amountScratched = new Array(totalCells).fill(0);
        this.numberTotals = new Array(totalCells).fill(blocksPerNumber);
        this.amountTotals = new Array(totalCells).fill(blocksPerAmount);
        this.totalNumberBlocks = totalCells * blocksPerNumber;
        this.totalAmountBlocks = totalCells * blocksPerAmount;
        this.totalNumberScratched = 0;
        this.totalAmountScratched = 0;
        this.winningScratched = 0;
        this.winningTotal = grid.winningCols * grid.winningRows;
        this.revealedNumberCount = 0;
        this.revealedAmountCount = 0;
        this.winningRevealed = false;
    }

    private updateCardContent() {
        if (!this.currentCard) return;
        const card = this.currentCard;
        if (this.winningNumberLabel) {
            this.winningNumberLabel.string = this.formatNumber(card.winningNumber);
        }
        for (let i = 0; i < card.cells.length; i++) {
            const cell = card.cells[i];
            const numberLabel = this.numberLabels[i];
            if (numberLabel) {
                numberLabel.string = this.formatNumber(cell.number);
                numberLabel.color = new Color(NUMBER_DEFAULT_COLOR);
                numberLabel.node.active = false;
            }
            const amountLabel = this.amountLabels[i];
            if (amountLabel) {
                amountLabel.string = this.formatAmount(cell.amount);
                amountLabel.color = new Color(AMOUNT_DEFAULT_COLOR);
                amountLabel.node.active = false;
            }
            const invalidNode = this.invalidStampNodes[i];
            if (invalidNode) {
                invalidNode.active = false;
            }
        }
        const rainbowNode = this.cardContainer?.getChildByName('Rainbow');
        if (rainbowNode) {
            rainbowNode.active = card.isRainbow;
        }
    }

    private resetScratchMasksStaggered() {
        this.maskResetStep = 0;
        this.unschedule(this.resetScratchMasksStep);
        this.schedule(this.resetScratchMasksStep, 0.01, 2);
    }

    private resetScratchMasksStep() {
        if (this.maskResetStep === 0 && this.numberMaskContainer) {
            this.numberMaskContainer.children.forEach((child) => child.active = true);
        } else if (this.maskResetStep === 1 && this.amountMaskContainer) {
            this.amountMaskContainer.children.forEach((child) => child.active = true);
        } else if (this.maskResetStep === 2 && this.winningMaskContainer) {
            this.winningMaskContainer.children.forEach((child) => child.active = true);
        }
        this.maskResetStep++;
    }

    private resetScratchMasks() {
        if (this.numberMaskContainer) {
            this.numberMaskContainer.children.forEach((child) => child.active = true);
        }
        if (this.amountMaskContainer) {
            this.amountMaskContainer.children.forEach((child) => child.active = true);
        }
        if (this.winningMaskContainer) {
            this.winningMaskContainer.children.forEach((child) => child.active = true);
        }
    }

    private getCurrentDay(): number {
        const progress = GameProgressManager.instance?.progress;
        return progress?.currentDay ?? 1;
    }

    private getDailyWinningNumber(tierKey: string): number {
        return this.rollNumber(LOTTERY_CONFIG.scratchRules.numberMin, LOTTERY_CONFIG.scratchRules.numberMax);
    }

    private rollNumber(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private rollNumberExcluding(exclude: number, min: number, max: number): number {
        let value = this.rollNumber(min, max);
        let guard = 0;
        while (value === exclude && guard < 10) {
            value = this.rollNumber(min, max);
            guard++;
        }
        return value === exclude ? min : value;
    }

    private rollAmount(tier: LotteryTier, preferHigh: boolean): number {
        const rewards = tier.rewards.filter((value) => value > 0);
        const pool = rewards.length ? rewards : [tier.price];
        const t = preferHigh ? 1 - Math.random() * Math.random() : Math.random() * Math.random();
        const index = Math.min(pool.length - 1, Math.floor(t * pool.length));
        const base = pool[index];
        return Math.max(1, Math.round(base * (0.85 + Math.random() * 0.4)));
    }

    private formatNumber(value: number): string {
        return value.toString().padStart(2, '0');
    }

    private formatAmount(value: number): string {
        return `+${value}`;
    }

    private isInBounds(pos: Vec3, bounds: { left: number; right: number; top: number; bottom: number }): boolean {
        const epsilon = 0.5;
        return pos.x >= bounds.left - epsilon
            && pos.x <= bounds.right + epsilon
            && pos.y >= bounds.bottom - epsilon
            && pos.y <= bounds.top + epsilon;
    }

    private getCellInfoAt(localPos: Vec3): { index: number; row: number; col: number; cellLeft: number; cellTop: number; cellCenterY: number } | null {
        if (!this.gridBounds) return null;
        const layout = LOTTERY_CONFIG.cardLayout;
        if (!this.isInBounds(localPos, this.gridBounds)) return null;

        const cellSpan = layout.cellSize + layout.gap;
        const col = Math.floor((localPos.x - this.gridBounds.left) / cellSpan);
        const row = Math.floor((this.gridBounds.top - localPos.y) / cellSpan);
        if (col < 0 || col >= layout.cols || row < 0 || row >= layout.rows) return null;

        const cellLeft = this.gridBounds.left + col * cellSpan;
        const cellTop = this.gridBounds.top - row * cellSpan;
        const localX = localPos.x - cellLeft;
        const localY = cellTop - localPos.y;
        const epsilon = 0.5;
        if (localX < -epsilon || localX > layout.cellSize + epsilon || localY < -epsilon || localY > layout.cellSize + epsilon) return null;

        const cellCenterY = cellTop - layout.cellSize / 2;
        return { index: row * layout.cols + col, row, col, cellLeft, cellTop, cellCenterY };
    }

    private getScratchBrushRadius(baseSize: number): number {
        const radius = Math.max(SCRATCH_BRUSH_RADIUS_MIN, baseSize * 0.3);
        return Math.min(radius, SCRATCH_BRUSH_RADIUS_MAX);
    }

    private eraseBlocksInCircle(
        container: Node,
        rowMin: number,
        rowMax: number,
        colMin: number,
        colMax: number,
        blockW: number,
        blockH: number,
        localX: number,
        localY: number,
        radius: number,
        getName: (row: number, col: number) => string,
        onErase: () => void
    ) {
        const radiusSq = radius * radius;
        for (let r = rowMin; r <= rowMax; r++) {
            const centerY = (r + 0.5) * blockH;
            const dy = centerY - localY;
            if (dy * dy > radiusSq) continue;
            for (let c = colMin; c <= colMax; c++) {
                const centerX = (c + 0.5) * blockW;
                const dx = centerX - localX;
                if (dx * dx + dy * dy > radiusSq) continue;
                const block = container.getChildByName(getName(r, c));
                if (block && block.active) {
                    block.active = false;
                    onErase();
                }
            }
        }
    }

    private eraseNumberAt(info: { index: number; cellLeft: number; cellTop: number }, localPos: Vec3) {
        if (!this.numberMaskContainer) return;
        const layout = LOTTERY_CONFIG.cardLayout;
        const grid = LOTTERY_CONFIG.scratchMaskGrid;
        const nCols = grid.numberColsPerCell;
        const nRows = grid.numberRowsPerCell;
        const numberAreaHeight = layout.cellSize / 2;
        const blockW = layout.cellSize / nCols;
        const blockH = numberAreaHeight / nRows;
        const localX = Math.max(0, Math.min(layout.cellSize - 0.01, localPos.x - info.cellLeft));
        const localY = Math.max(0, Math.min(numberAreaHeight - 0.01, info.cellTop - localPos.y));
        const brushRadius = this.getScratchBrushRadius(layout.cellSize);
        const rowMin = Math.max(0, Math.floor((localY - brushRadius) / blockH));
        const rowMax = Math.min(nRows - 1, Math.floor((localY + brushRadius) / blockH));
        const colMin = Math.max(0, Math.floor((localX - brushRadius) / blockW));
        const colMax = Math.min(nCols - 1, Math.floor((localX + brushRadius) / blockW));
        this.eraseBlocksInCircle(this.numberMaskContainer, rowMin, rowMax, colMin, colMax, blockW, blockH, localX, localY, brushRadius, (row, col) => {
            return `N_${info.index}_${row}_${col}`;
        }, () => {
            this.numberScratched[info.index]++;
            this.totalNumberScratched++;
        });
        this.updateNumberReveal(info.index);
    }

    private eraseAmountAt(info: { index: number; cellLeft: number; cellTop: number }, localPos: Vec3) {
        if (!this.amountMaskContainer) return;
        const layout = LOTTERY_CONFIG.cardLayout;
        const grid = LOTTERY_CONFIG.scratchMaskGrid;
        const aCols = grid.amountColsPerCell;
        const aRows = grid.amountRowsPerCell;
        const amountAreaHeight = layout.cellSize / 2;
        const blockW = layout.cellSize / aCols;
        const blockH = amountAreaHeight / aRows;
        const localX = Math.max(0, Math.min(layout.cellSize - 0.01, localPos.x - info.cellLeft));
        const localY = Math.max(0, Math.min(layout.cellSize - 0.01, info.cellTop - localPos.y));
        const localYInAmount = Math.max(0, localY - layout.cellSize / 2);
        const brushRadius = this.getScratchBrushRadius(layout.cellSize);
        const rowMin = Math.max(0, Math.floor((localYInAmount - brushRadius) / blockH));
        const rowMax = Math.min(aRows - 1, Math.floor((localYInAmount + brushRadius) / blockH));
        const colMin = Math.max(0, Math.floor((localX - brushRadius) / blockW));
        const colMax = Math.min(aCols - 1, Math.floor((localX + brushRadius) / blockW));
        this.eraseBlocksInCircle(this.amountMaskContainer, rowMin, rowMax, colMin, colMax, blockW, blockH, localX, localYInAmount, brushRadius, (row, col) => {
            return `A_${info.index}_${row}_${col}`;
        }, () => {
            this.amountScratched[info.index]++;
            this.totalAmountScratched++;
        });
        this.updateAmountReveal(info.index);
    }

    private eraseWinningAt(localPos: Vec3) {
        if (!this.winningMaskContainer || !this.winningBounds) return;
        const layout = LOTTERY_CONFIG.cardLayout;
        const grid = LOTTERY_CONFIG.scratchMaskGrid;
        const blockW = (this.winningBounds.right - this.winningBounds.left) / grid.winningCols;
        const blockH = layout.winningAreaHeight / grid.winningRows;
        const localX = Math.max(0, Math.min((this.winningBounds.right - this.winningBounds.left) - 0.01, localPos.x - this.winningBounds.left));
        const localY = Math.max(0, Math.min(layout.winningAreaHeight - 0.01, this.winningBounds.top - localPos.y));
        const brushRadius = this.getScratchBrushRadius(layout.winningAreaHeight);
        const rowMin = Math.max(0, Math.floor((localY - brushRadius) / blockH));
        const rowMax = Math.min(grid.winningRows - 1, Math.floor((localY + brushRadius) / blockH));
        const colMin = Math.max(0, Math.floor((localX - brushRadius) / blockW));
        const colMax = Math.min(grid.winningCols - 1, Math.floor((localX + brushRadius) / blockW));
        this.eraseBlocksInCircle(this.winningMaskContainer, rowMin, rowMax, colMin, colMax, blockW, blockH, localX, localY, brushRadius, (row, col) => {
            return `W_${row}_${col}`;
        }, () => {
            this.winningScratched++;
        });

        if (!this.winningRevealed && this.winningTotal > 0) {
            const progress = this.winningScratched / this.winningTotal;
            if (progress >= LOTTERY_CONFIG.scratchRules.winningRevealThreshold) {
                this.winningRevealed = true;
                this.applyMatchedNumberHighlight();
            }
        }
    }

    private updateNumberReveal(index: number) {
        const card = this.currentCard;
        if (!card) return;
        const cell = card.cells[index];
        if (cell.numberRevealed || this.numberTotals[index] <= 0) return;
        const progress = this.numberScratched[index] / this.numberTotals[index];
        if (progress >= LOTTERY_CONFIG.scratchRules.numberRevealThreshold) {
            cell.numberRevealed = true;
            this.revealedNumberCount++;
            const label = this.numberLabels[index];
            if (label) {
                label.node.active = true;
                label.color = this.winningRevealed && cell.matched
                    ? new Color(NUMBER_MATCH_COLOR)
                    : new Color(NUMBER_DEFAULT_COLOR);
            }
        }
    }

    private updateAmountReveal(index: number) {
        const card = this.currentCard;
        if (!card) return;
        const cell = card.cells[index];
        if (cell.amountRevealed || this.amountTotals[index] <= 0) return;
        const progress = this.amountScratched[index] / this.amountTotals[index];
        if (progress >= LOTTERY_CONFIG.scratchRules.amountRevealThreshold) {
            cell.amountRevealed = true;
            this.revealedAmountCount++;
            const label = this.amountLabels[index];
            if (label) {
                label.node.active = true;
            }
        }
    }

    private applyMatchedNumberHighlight() {
        if (!this.currentCard || !this.winningRevealed) return;
        this.currentCard.cells.forEach((cell, index) => {
            const label = this.numberLabels[index];
            if (!label || !cell.numberRevealed) return;
            label.color = cell.matched ? new Color(NUMBER_MATCH_COLOR) : new Color(NUMBER_DEFAULT_COLOR);
        });
    }

    private checkCardCompletion() {
        if (!this.currentCard || this.currentCard.isComplete) return;
        const totalCells = this.currentCard.cells.length;
        const allNumbersRevealed = this.revealedNumberCount >= totalCells;
        const allAmountsRevealed = this.revealedAmountCount >= totalCells;
        const numberProgress = this.totalNumberBlocks > 0 ? this.totalNumberScratched / this.totalNumberBlocks : 0;
        const amountProgress = this.totalAmountBlocks > 0 ? this.totalAmountScratched / this.totalAmountBlocks : 0;
        const winningProgress = this.winningTotal > 0 ? this.winningScratched / this.winningTotal : 0;
        const hasMatch = this.currentCard.cells.some((cell) => cell.matched);
        let matchedTotal = 0;
        let matchedNumbersRevealed = 0;
        let matchedAmountsRevealed = 0;
        this.currentCard.cells.forEach((cell) => {
            if (!cell.matched) return;
            matchedTotal++;
            if (cell.numberRevealed) matchedNumbersRevealed++;
            if (cell.amountRevealed) matchedAmountsRevealed++;
        });

        if (this.winningRevealed && !this.resultShown) {
            if (allNumbersRevealed
                && hasMatch
                && matchedTotal > 0
                && matchedNumbersRevealed >= matchedTotal
                && matchedAmountsRevealed >= matchedTotal) {
                this.revealResult();
                return;
            }
            if (!hasMatch && allNumbersRevealed) {
                if (!this.loseHintShown) {
                    this.showResult('好像没中奖，继续刮金额', new Color(150, 150, 150, 255));
                    this.loseHintShown = true;
                }
                if (!this.allowNext) {
                    this.allowNext = true;
                    this.showNextCardButton(true);
                }
            }
        }
        if (allNumbersRevealed
            && allAmountsRevealed
            && numberProgress >= LOTTERY_CONFIG.scratchRules.completeNumberProgress
            && amountProgress >= LOTTERY_CONFIG.scratchRules.completeAmountProgress
            && winningProgress >= LOTTERY_CONFIG.scratchRules.completeWinningProgress) {
            this.revealResult();
        }
    }
    
    // 碎渣粒子效果（保留备用）
    private createDebrisParticles(worldPos: Vec3) {
        const layer = this.numberMaskContainer ?? this.amountMaskContainer;
        if (!layer) return;
        
        const localPos = layer.getComponent(UITransform)?.convertToNodeSpaceAR(worldPos) || new Vec3();
        
        // 创建5-8个小碎渣
        const debrisCount = 5 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < debrisCount; i++) {
            const debris = new Node('Debris');
            this.ensureUITransform(debris, 8, 8);
            const g = debris.addComponent(Graphics);
            
            // 不规则小碎渣形状
            const size = 1 + Math.random() * 2;
            g.fillColor = new Color(160 + Math.random() * 30, 160 + Math.random() * 30, 170, 255);
            
            // 随机形状：小方块或小三角
            if (Math.random() > 0.5) {
                g.rect(-size/2, -size/2, size, size);
            } else {
                g.moveTo(0, size);
                g.lineTo(-size, -size/2);
                g.lineTo(size, -size/2);
                g.close();
            }
            g.fill();
            
            // 起始位置（略微偏移）
            const startX = localPos.x + (Math.random() - 0.5) * 8;
            const startY = localPos.y + (Math.random() - 0.5) * 8;
            debris.setPosition(startX, startY, 0);
            layer.addChild(debris);
            
            // 随机向上弹出方向
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.2;  // 大致向上
            const speed = 20 + Math.random() * 25;
            const targetX = startX + Math.cos(angle) * speed;
            const targetY = startY + Math.sin(angle) * speed;
            
            // 下落终点
            const fallY = startY - 10 - Math.random() * 15;
            
            const debrisOpacity = debris.addComponent(UIOpacity);
            
            // 动画：向上弹出 → 下落 → 消失
            const duration = 0.15 + Math.random() * 0.1;
            tween(debris)
                .to(duration, { position: new Vec3(targetX, targetY, 0) }, { easing: 'quadOut' })
                .to(duration * 1.5, { position: new Vec3(targetX, fallY, 0) }, { easing: 'quadIn' })
                .call(() => debris.destroy())
                .start();
            
            // 同时旋转
            tween(debris)
                .by(duration * 2.5, { eulerAngles: new Vec3(0, 0, 180 + Math.random() * 360) })
                .start();
            
            // 淡出
            tween(debrisOpacity)
                .delay(duration * 1.5)
                .to(duration, { opacity: 0 })
                .start();
        }
    }
    
    // triggerNeighborDissolve已移除（橡皮擦模式不需要）

    private revealResult() {
        if (!this.currentCard || this.currentCard.isComplete || this.resultShown) return;
        this.currentCard.isComplete = true;
        this.resultShown = true;

        const card = this.currentCard;
        const rainbowConfig = LOTTERY_CONFIG.specialMechanics.rainbowCard;
        let totalReward = 0;
        let matchCount = 0;

        card.cells.forEach((cell, index) => {
            if (cell.matched) {
                matchCount++;
                totalReward += cell.amount;
                const amountLabel = this.amountLabels[index];
                if (amountLabel) {
                    amountLabel.color = new Color(AMOUNT_MATCH_COLOR);
                }
            } else {
                const stamp = this.invalidStampNodes[index];
                if (stamp) stamp.active = true;
            }
        });

        if (matchCount > 0 && card.isRainbow) {
            totalReward = Math.round(totalReward * rainbowConfig.multiplier);
        }

        const hasReward = matchCount > 0 && totalReward > 0;
        if (hasReward) {
            if (!this.rewardGranted && InventoryManager.instance) {
                InventoryManager.instance.addMoney(totalReward);
                this.rewardGranted = true;
            }
            this.updateWalletDisplay();
            director.emit('LOTTERY_MONEY_CHANGED');
            this.showResult(`已中奖 +${totalReward}币`, new Color(255, 180, 0, 255));
            this.playCoinFly(totalReward);
            this.loseStreak = 0;
            console.log(`[LotteryStation] 中奖！命中${matchCount}格，奖励${totalReward}币`);
        } else {
            this.showResult('未中奖', new Color(150, 150, 150, 255));
            this.loseStreak++;
            console.log(`[LotteryStation] 未中奖，连续${this.loseStreak}次`);
        }

        this.updateStreakDisplay();
        this.allowNext = true;
        this.showNextCardButton(!hasReward);
    }

    private playCoinFly(totalReward: number) {
        if (!this.panelContainer || !this.walletLabel || !this.cardContainer) return;
        if (totalReward <= 0) return;
        const panelTransform = this.panelContainer.getComponent(UITransform);
        const cardTransform = this.cardContainer.getComponent(UITransform);
        const walletTransform = this.walletLabel.node.getComponent(UITransform);
        if (!panelTransform || !cardTransform || !walletTransform) return;

        const startWorld = cardTransform.convertToWorldSpaceAR(new Vec3(0, -this.cardHeight / 2 + 40, 0));
        const targetWorld = walletTransform.convertToWorldSpaceAR(new Vec3());
        const startLocal = panelTransform.convertToNodeSpaceAR(startWorld);
        const targetLocal = panelTransform.convertToNodeSpaceAR(targetWorld);
        const coinCount = Math.min(8, Math.max(4, Math.floor(totalReward / 20)));

        for (let i = 0; i < coinCount; i++) {
            const coin = new Node('CoinFly');
            this.ensureUITransform(coin, 16, 16);
            const gfx = coin.addComponent(Graphics);
            gfx.fillColor = new Color(255, 214, 120, 255);
            gfx.circle(0, 0, 7);
            gfx.fill();
            gfx.strokeColor = new Color(120, 80, 40, 255);
            gfx.lineWidth = 2;
            gfx.circle(0, 0, 7);
            gfx.stroke();
            coin.addComponent(UIOpacity).opacity = 255;
            coin.setPosition(startLocal.x, startLocal.y, 0);
            this.panelContainer.addChild(coin);
            coin.setSiblingIndex(9999);

            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 20;
            const mid = new Vec3(startLocal.x + offsetX, startLocal.y + 50 + offsetY, 0);
            const end = new Vec3(targetLocal.x, targetLocal.y, 0);
            const delay = Math.random() * 0.08;
            tween(coin)
                .delay(delay)
                .to(0.2, { position: mid }, { easing: 'quadOut' })
                .to(0.35, { position: end }, { easing: 'quadIn' })
                .call(() => coin.destroy())
                .start();
            const opacity = coin.getComponent(UIOpacity);
            if (opacity) {
                tween(opacity)
                    .delay(delay + 0.25)
                    .to(0.2, { opacity: 0 })
                    .start();
            }
        }

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

    private showResult(text: string, color: Color) {
        if (this.resultLabel) {
            this.resultLabel.string = text;
            this.resultLabel.color = color;
        }
    }

    private resetCardArea() {
        this.currentCard = null;
        this.resultShown = false;
        this.rewardGranted = false;
        this.allowNext = false;
        this.loseHintShown = false;
        if (this.cardBuilt) {
            const totalCells = LOTTERY_CONFIG.cardLayout.rows * LOTTERY_CONFIG.cardLayout.cols;
            this.resetScratchRuntimeState(totalCells);
            this.resetScratchMasksStaggered();
        }
        this.showResult('', new Color(255, 255, 255, 255));
        this.setCardCoverVisible(true);
        this.setCardContainerVisible(false);
    }
    
    private updateWalletDisplay() {
        if (this.walletLabel) {
            const wallet = InventoryManager.instance?.globalWallet || 0;
            this.walletLabel.string = `钱包 ${wallet}`;
        }
    }
    
    private updateStreakDisplay() {
        if (this.streakLabel) {
            const threshold = LOTTERY_CONFIG.specialMechanics.luckyStreak.threshold;
            const remain = Math.max(threshold - this.loseStreak, 0);
            const status = this.loseStreak >= threshold ? '保底就绪' : `再来${remain}次`;
            this.streakLabel.string = `连不中: ${this.loseStreak}/${threshold}（${status}）`;
            this.streakLabel.color = this.loseStreak >= threshold 
                ? new Color(255, 200, 100, 255) 
                : new Color(180, 180, 180, 255);
        }
    }

    private startTimeTicker() {
        this.updateShopTimeLabel();
        this.unschedule(this.updateShopTimeLabel);
        this.schedule(this.updateShopTimeLabel, 1);
    }

    private stopTimeTicker() {
        this.unschedule(this.updateShopTimeLabel);
    }

    private updateShopTimeLabel() {
        if (!this.shopTimeLabel) return;
        const timeManager = TimeManager.instance;
        if (!timeManager) {
            this.shopTimeLabel.string = '时间 --:--';
            this.shopTimeLabel.color = Color.WHITE;
            return;
        }
        const hour = timeManager.getCurrentHour();
        this.shopTimeLabel.string = `时间 ${timeManager.getTimeString()}`;
        if (hour >= 18) {
            this.shopTimeLabel.color = new Color(255, 165, 0);
        } else if (hour >= 15) {
            this.shopTimeLabel.color = new Color(255, 255, 0);
        } else {
            this.shopTimeLabel.color = new Color(255, 255, 255);
        }
    }

    private ensureScratchCursor() {
        if (this.scratchCursor && this.scratchCursor.isValid) return;
        if (!this.shopPanel) return;

        this.scratchCursor = new Node('ScratchCursor');
        this.scratchCursor.addComponent(UITransform).setContentSize(48, 48);
        const gfx = this.scratchCursor.addComponent(Graphics);
        gfx.fillColor = new Color(255, 208, 90, 230);
        gfx.circle(0, 0, 18);
        gfx.fill();
        gfx.strokeColor = new Color(90, 70, 40, 255);
        gfx.lineWidth = 2;
        gfx.circle(0, 0, 18);
        gfx.stroke();
        gfx.fillColor = new Color(255, 255, 255, 140);
        gfx.circle(-6, 6, 7);
        gfx.fill();
        gfx.strokeColor = new Color(255, 255, 255, 120);
        gfx.lineWidth = 1;
        gfx.circle(0, 0, 24);
        gfx.stroke();

        this.scratchCursor.active = false;
        this.shopPanel.addChild(this.scratchCursor);
        this.scratchCursor.setSiblingIndex(9999);
    }

    private updateScratchCursor(uiX: number, uiY: number) {
        if (this.isPickingCard) {
            this.hideScratchCursor();
            return;
        }
        if (!this.shopPanel?.active || !this.currentCard) {
            this.hideScratchCursor();
            return;
        }
        if (!this.scratchCursor || !this.scratchCursor.isValid) {
            this.ensureScratchCursor();
        }
        const localPos = this.uiToCardLocal(uiX, uiY);
        if (!localPos || this.cardWidth <= 0 || this.cardHeight <= 0) {
            this.hideScratchCursor();
            return;
        }
        const padding = this.getScratchBrushRadius(LOTTERY_CONFIG.cardLayout.cellSize) * 1.4;
        const nearCard = Math.abs(localPos.x) <= this.cardWidth / 2 + padding
            && Math.abs(localPos.y) <= this.cardHeight / 2 + padding;
        if (!nearCard) {
            this.hideScratchCursor();
            return;
        }
        const clampedLocal = new Vec3(
            Math.max(-this.cardWidth / 2 + 6, Math.min(this.cardWidth / 2 - 6, localPos.x)),
            Math.max(-this.cardHeight / 2 + 6, Math.min(this.cardHeight / 2 - 6, localPos.y)),
            0
        );
        const panelLocal = this.cardToPanelLocal(clampedLocal) || this.uiToPanelLocal(uiX, uiY);
        if (!panelLocal) {
            this.hideScratchCursor();
            return;
        }
        this.scratchCursor.setPosition(panelLocal.x, panelLocal.y, 0);
        this.scratchCursor.active = true;
    }

    private hideScratchCursor() {
        if (this.scratchCursor && this.scratchCursor.isValid) {
            this.scratchCursor.active = false;
        }
    }

    private loadLotteryBackground(sprite: Sprite) {
        const applySpriteFrame = (spriteFrame: SpriteFrame | null) => {
            if (!spriteFrame) return;
            sprite.spriteFrame = spriteFrame;
            sprite.type = Sprite.Type.SIMPLE;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        };

        const spriteUuid = '5fad3f34-c1e6-4417-b61d-408e87b618ec@f9941';
        const imageUuid = '5fad3f34-c1e6-4417-b61d-408e87b618ec';

        resources.load('Gacha/LotteryStation_shop', SpriteFrame, (resErr, spriteFrame) => {
            if (!resErr && spriteFrame) {
                applySpriteFrame(spriteFrame);
                return;
            }

            assetManager.loadAny({ uuid: spriteUuid }, (err, asset) => {
                if (!err && asset instanceof SpriteFrame) {
                    applySpriteFrame(asset);
                    return;
                }

                assetManager.loadAny({ uuid: imageUuid }, (imgErr, imageAsset) => {
                    if (!imgErr && imageAsset instanceof ImageAsset) {
                        const texture = new Texture2D();
                        texture.image = imageAsset;
                        const fallbackFrame = new SpriteFrame();
                        fallbackFrame.texture = texture;
                        applySpriteFrame(fallbackFrame);
                        return;
                    }

                    console.warn('[LotteryStation] Background image not found for LotteryStation_shop');
                });
            });
        });
    }
    
    // ==================== 工具方法 ====================
    
    private createBackButton(text: string, x: number, y: number, width: number, height: number, callback: () => void): Node {
        const btn = new Node('BackButton');
        btn.setPosition(x, y, 0);
        this.ensureUITransform(btn, width, height);

        const bg = new Node('Bg');
        bg.parent = btn;
        this.ensureUITransform(bg, width, height);
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(24, 32, 40, 240);
        bgGraphics.roundRect(-width / 2, -height / 2, width, height, 12);
        bgGraphics.fill();
        bgGraphics.strokeColor = Color.BLACK;
        bgGraphics.lineWidth = 3;
        bgGraphics.roundRect(-width / 2, -height / 2, width, height, 12);
        bgGraphics.stroke();
        bgGraphics.strokeColor = new Color(255, 210, 130, 255);
        bgGraphics.lineWidth = 2;
        bgGraphics.roundRect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12, 10);
        bgGraphics.stroke();

        const labelNode = new Node('Label');
        labelNode.parent = btn;
        this.ensureUITransform(labelNode, width - 10, height - 6);
        const labelComp = labelNode.addComponent(Label);
        labelComp.string = text;
        labelComp.fontSize = 20;
        labelComp.isBold = true;
        labelComp.color = Color.WHITE;
        labelComp.horizontalAlign = Label.HorizontalAlign.CENTER;
        labelComp.enableOutline = true;
        labelComp.outlineColor = Color.BLACK;
        labelComp.outlineWidth = 2;

        btn.addComponent(Button);
        btn.on(Node.EventType.TOUCH_END, callback);

        return btn;
    }
    
    private hexToColor(hex: string): Color {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
            return new Color(
                parseInt(result[1], 16),
                parseInt(result[2], 16),
                parseInt(result[3], 16),
                255
            );
        }
        return new Color(255, 255, 255, 255);
    }

    private ensureUITransform(node: Node, width?: number, height?: number): UITransform {
        const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
        if (width !== undefined && height !== undefined) {
            transform.setContentSize(width, height);
        }
        return transform;
    }
}































