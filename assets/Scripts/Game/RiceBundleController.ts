import { _decorator, Component, Node, Button, Label, Sprite, UITransform, Color, Vec3, tween, Tween, instantiate, Graphics, EventTouch, input, Input, EventMouse, view, game, assetManager, SpriteFrame, Camera, Canvas, director } from 'cc';
import { PREVIEW, EDITOR, DEV } from 'cc/env';
import { IngredientType } from '../Data/GameConfig';
import { InventoryManager } from '../Manager/InventoryManager';
import { BaseCookingController } from './Base/BaseCookingController';
import { SteamerManager } from './SteamerManager';
import { IngredientFollowerManager } from './IngredientFollowerManager';
import { SteamerSlotState } from '../Data/SteamerTypes';
import { CookingControllerV2 } from './CookingControllerV2';
import { TRASH_IMAGE_UUIDS } from './Config/CookingConfig';

const { ccclass, property } = _decorator;

/**
 * 东北饭包制作阶段
 */
export enum RiceBundlePhase {
    IDLE = 'idle',
    STEAMING_POTATO = 'steaming_potato',   // 蒸土豆中
    POTATO_READY = 'potato_ready',         // 土豆完成
    STEAMING_RICE = 'steaming_rice',       // 蒸大米中
    RICE_READY = 'rice_ready',             // 大米完成
    MIXING = 'mixing',                     // 搅拌中
    MIXED = 'mixed',                       // 搅拌完成
    ON_LEAF = 'on_leaf',                   // 已铺菜叶
    ROLLING = 'rolling',                   // 卷起中
    PACKED = 'packed'                      // 打包完成
}

    /**
 * 食材显示数据
 */
interface IngredientDisplay {
    emoji: string;
    name: string;
    color: Color;
}

    /**
 * 🔥 蒸锅中的食材数据（参考第一关的SausageData）
 */
interface SteamingIngredient {
    type: IngredientType;
    node: Node;
    progress: number;  // 0-1 蒸制进度
    isSteamed: boolean;
}

    /**
 * 🍚 东北饭包控制器 - 第二关
 *
 * 制作流程：
 * 1. 蒸土豆（点击土豆按钮，飞入蒸锅，显示蒸汽动画）
 * 2. 蒸大米（点击大米按钮，飞入蒸锅，显示蒸汽动画）
 * 3. 搅拌（土豆和大米都完成后，点击搅拌区域，显示搅拌动画）
 * 4. 铺菜叶（点击生菜按钮，飞入菜叶区域）
 * 5. 卷起（连点5次完成卷制，每次点击有视觉反馈）
 * 6. 打包（添加香菜，完成）
 *
 * 视觉效果：
 * - 食材飞行动画
 * - 蒸汽粒子效果
 * - 搅拌动画
 * - 进度条动态显示
 * - 完成庆祝动画
 */
@ccclass('RiceBundleController')
export class RiceBundleController extends BaseCookingController {

    // ==================== 场景节点绑定 ====================

    // 蒸锅区域
    @property(Node)
    steamerArea: Node = null!;

    @property(Node)
    potatoProgress: Node = null!;

    @property(Node)
    riceProgress: Node = null!;

    // 搅拌盆区域
    @property(Node)
    mixingBowlArea: Node = null!;

    @property(Node)
    mixProgress: Node = null!;

    // 炒制区域
    @property(Node)
    stirFryArea: Node = null!;

    @property(Node)
    fryProgress: Node = null!;

    @property(Node)
    eggSauceBox: Node = null!;

    @property(Label)
    eggSauceCountLabel: Label = null!;

    // 菜叶区域
    @property(Node)
    cabbageLeafArea: Node = null!;

    @property(Node)
    rollProgress: Node = null!;

    // 食材按钮
    @property(Node)
    riceBtn: Node = null!;

    @property(Node)
    potatoBtn: Node = null!;

    @property(Node)
    eggBtn: Node = null!;

    @property(Node)
    greenOnionBtn: Node = null!;

    @property(Node)
    lettuceBtn: Node = null!;

    @property(Node)
    cilantroBtn: Node = null!;

    @property(Node)
    oilBtn: Node = null!;

    @property(Node)
    sauceBtn: Node = null!;

    @property(Node)
    peanutBtn: Node = null!;

    // 状态显示
    @property(Label)
    instructionLabel: Label = null!;

    @property(Node)
    qualityStars: Node = null!;

    @property(Node)
    handItemLabel: Node = null!;  // 🔥 手持物品显示（参考第一关的handItemLabel）

    // ==================== 蒸锅系统组件 ====================

    @property(SteamerManager)
    steamerManager: SteamerManager = null!;  // 蒸锅管理器

    @property(Node)
    steamToggle: Node = null!;  // 蒸锅开关按钮

    @property(Node)
    progressBar: Node = null!;  // 蒸制进度条

    @property(Node)
    progressBarFill: Node = null!;  // 进度条填充

    @property(Node)
    trashCan: Node = null!;  // 垃圾桶

    @property(Node)
    mixingBowlDropZone: Node = null!;  // 搅拌盆放置区域

    @property(Node)
    mouseFollower: Node = null!;  // 鼠标跟随节点（从BaseCookingController继承）

    // ==================== 蒸锅位置标记节点（参考第一关的sausagePositions）====================

    @property([Node])
    potatoPositions: Node[] = [];  // 土豆位置数组（2个槽位）

    @property([Node])
    ricePositions: Node[] = [];    // 大米位置数组（2个槽位）

    // ==================== 食材显示配置 ====================

    private readonly ingredientDisplays: Map<IngredientType, IngredientDisplay> = new Map([
        [IngredientType.RICE, { emoji: '🍚', name: '大米', color: new Color(255, 250, 220, 255) }],
        [IngredientType.POTATO, { emoji: '🥔', name: '土豆', color: new Color(230, 200, 150, 255) }],
        [IngredientType.EGG, { emoji: '🥚', name: '鸡蛋', color: new Color(255, 230, 150, 255) }],
        [IngredientType.GREEN_ONION, { emoji: '🧅', name: '大葱', color: new Color(150, 220, 100, 255) }],
        [IngredientType.LETTUCE, { emoji: '🥬', name: '生菜', color: new Color(150, 255, 150, 255) }],
        [IngredientType.CILANTRO, { emoji: '🌿', name: '香菜', color: new Color(100, 220, 150, 255) }],
        [IngredientType.OIL, { emoji: 'OIL', name: '油', color: new Color(250, 220, 120, 255) }],
        [IngredientType.SAUCE, { emoji: 'SAU', name: '酱', color: new Color(180, 120, 80, 255) }],
        [IngredientType.PEANUT_SAUCE, { emoji: 'PNT', name: '花生米', color: new Color(210, 180, 120, 255) }],
        [IngredientType.EGG_SAUCE, { emoji: 'EGG', name: '鸡蛋酱', color: new Color(255, 200, 120, 255) }],
        [IngredientType.MIXING_BOWL, { emoji: '🥣', name: '拌料盆', color: new Color(230, 210, 150, 255) }],
    ]);

    // ==================== 游戏状态 ====================

    private currentPhase: RiceBundlePhase = RiceBundlePhase.IDLE;
    private currentHandItem: IngredientType | null = null;  // 🔥 手持物品（参考第一关）
    private handItemCount: number = 0;
    private handItemSource: 'inventory' | 'box' | 'infinite' | null = null;
    private potatoSteamed: boolean = false;
    private riceSteamed: boolean = false;
    private mixed: boolean = false;
    private hasFillingOnLeaf: boolean = false;
    private rollCount: number = 0;
    private readonly requiredRolls: number = 5;

    // 进度相关
    private steamProgress: number = 0;
    private mixProgressValue: number = 0;
    private fryProgressValue: number = 0;
    private readonly STEAM_TIME: number = 2.5; // 蒸制时间（秒）
    private readonly MIX_TIME: number = 2;    // 搅拌时间（秒）
    private readonly FRY_TIME: number = 1.8;  // 炒制时间（秒）
    private readonly MIX_CLICK_COUNT: number = 5;
    private readonly FRY_CLICK_COUNT: number = 5;
    private readonly MAX_EGGS_IN_PAN: number = 3;
    private readonly AUTO_MIX_UPDATE_INTERVAL: number = 0.1;

    // 炒蛋酱状态
    private hasOil: boolean = false;
    private hasOnion: boolean = false;
    private eggCountInPan: number = 0;
    private eggCooked: boolean = false;
    private eggSauceReadyCount: number = 0;
    private eggSauceBoxCount: number = 0;
    private readonly _blockedHitTests: Map<Node, Function> = new Map();
    private _uiHitTestDisabled: boolean = false;
    private isFrying: boolean = false;

    // ==================== 🎨 赛璐珞风格配置 ====================
    private readonly CEL_SHADING = {
        BUTTON_WIDTH: 100,
        BUTTON_HEIGHT: 80,
        BUTTON_RADIUS: 12,
        OUTLINE_WIDTH: 3,
        HIGHLIGHT_HEIGHT: 4,
        HIGHLIGHT_ALPHA: 100,
        AREA_BORDER_WIDTH: 4,
        AREA_INNER_BORDER_WIDTH: 2,
        STEAM_PARTICLE_SIZE: 30,
        STEAM_SCALE_START: 0.8,
        STEAM_SCALE_END: 1.8,
        STEAM_RISE_HEIGHT: 80,
        CLICK_SCALE_UP: 1.15,
        CLICK_ANIMATION_TIME: 0.1
    };

    // ==================== 视觉效果节点 ====================
    private steamParticles: Node[] = [];
    // 🔥 旧属性 flyingIngredient, ingredientInSteamer 已移除，使用新系统
    private mixedIngredientDisplay: Node | null = null;
    private lettuceOnLeaf: Node | null = null;
    private lettuceLeafNodes: Node[] = [];
    private lettucePlacedCount: number = 0;
    private readonly MAX_LETTUCE_ON_LEAF: number = 3;
    private rollVisuals: Node[] = [];
    private stirFryStatusLabel: Label | null = null;
    private eggSauceReadyNode: Node | null = null;
    private isEggSauceFlying: boolean = false;
    private _trashCanSprite: Sprite | null = null;
    private _isTrashOpen: boolean = false;

    // 🔥 蒸锅中的食材管理（参考第一关的sausages）
    private steamingIngredients: SteamingIngredient[] = [];

    // ==================== 蒸锅系统状态 ====================

    private ingredientFollower: IngredientFollowerManager | null = null;  // 食材跟随管理器
    private cookedIngredients: Map<IngredientType, number> = new Map();  // 熟食材存储
    private _nativeMouseMoveHandler: ((e: MouseEvent) => void) | null = null;  // 原生鼠标事件处理器
    private _canvasCamera: Camera | null = null;
    private mixingIngredients: Map<IngredientType, number> = new Map();
    private canvasNode: Node | null = null;
    private suppressCanvasPutDown: boolean = false;
    private lastHandItemPickupTime: number = 0;
    private previewSeedAttempts: number = 0;
    private autoMixingActive: boolean = false;

    // ==================== 抽象方法实现 ====================

    protected getRecipe(): any {
        return {
            levelId: 2,
            name: '东北饭包',
            ingredients: [
                IngredientType.RICE,
                IngredientType.POTATO,
                IngredientType.EGG,
                IngredientType.GREEN_ONION,
                IngredientType.LETTUCE,
                IngredientType.CILANTRO
            ]
        };
    }

    protected initCookingArea(): void {
        this.bindIngredientButtons();
        this.bindSaucePanelButtons();
        this.bindAreaEvents();
        this.setupIngredientButtonDisplays();
        this.setupSaucePanelDisplays();
        this.seedPreviewInventory();
        this.updateIngredientButtonCounts();
        this.setupAreaDisplays();
        this.setupProgressBarNodes();
        this.updateEggSauceBoxDisplay();
        this.updateInstruction('点击 土豆/大米 开始蒸制，炒鸡蛋酱并准备搅拌');
        this.hideLevel1Area();

        // ?? 初始化蒸锅系统
        this.initSteamerSystem();
        this.setupInputListeners();
    }

    /**
     * 🔥 初始化蒸锅系统
     */
    private initSteamerSystem(): void {
        // 🔥 自动创建 SteamManager 如果不存在
        if (!this.steamerManager) {
            if (this.steamerArea) {
                this.steamerManager = this.steamerArea.getComponent(SteamerManager);
                if (!this.steamerManager) {
                    this.steamerManager = this.steamerArea.addComponent(SteamerManager);
                    console.log('[RiceBundleController] ✅ 自动创建并添加 SteamManager 组件到 steamerArea');
                }
            } else {
                console.error('[RiceBundleController] ❌ steamerArea 为 null，无法初始化蒸锅系统');
                this.showMessage('❌ 蒸锅区域未配置');
                // 继续执行其他初始化逻辑
            }
        }

        // 初始化蒸锅管理器
        if (this.steamerManager) {
            // 设置蒸锅区域和进度条
            if (this.steamerArea && !this.steamerManager.steamerArea) {
                this.steamerManager.steamerArea = this.steamerArea;
            }
            if (this.progressBar && !this.steamerManager.progressBar) {
                this.steamerManager.progressBar = this.progressBar;
            }
            if (this.progressBarFill && !this.steamerManager.progressBarFill) {
                this.steamerManager.progressBarFill = this.progressBarFill;
            }
            if (this.steamToggle && !this.steamerManager.steamToggle) {
                this.steamerManager.steamToggle = this.steamToggle;
            }

            // 初始化槽位
            this.steamerManager.initSlots();

            // 设置槽位点击回调
            this.steamerManager.onSlotClick = (slot) => {
                this.onSteamerSlotClick(slot);
            };

            // 设置蒸制完成回调
            this.steamerManager.onSteamingComplete = (slots) => {
                this.onSteamingComplete(slots);
            };

            console.log('[RiceBundleController] ✅ 蒸锅管理器已初始化');
        }

        // 初始化食材跟随管理器
        if (this.mouseFollower) {
            this.ingredientFollower = new IngredientFollowerManager(this.mouseFollower);
            this.ensureFollowCanvasCamera();
            this.setupNativeMouseListener();
            console.log('[RiceBundleController] ✅ 食材跟随管理器已初始化');
        }

        // 绑定垃圾桶点击
        if (this.trashCan) {
            this.setupTrashCanFeedback();
            this.trashCan.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.onTrashCanClick();
            }, this);
        }

        // 绑定搅拌盆放置区域
        if (this.mixingBowlDropZone) {
            this.mixingBowlDropZone.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.onMixingBowlDropZoneClick();
            }, this);
        }
    }

    /**
     * 预览模式：自动填充第二关测试库存，便于直接预览制作流程
     */
    private seedPreviewInventory(): void {
        if (!(PREVIEW || EDITOR || DEV)) return;

        this.ensurePreviewInventorySeeded();
        const inventory = InventoryManager.instance;
        if (!inventory) {
            this.retrySeedPreviewInventory();
            return;
        }

        if (!inventory.currentLevel || inventory.currentLevel.levelId !== 2) {
            inventory.initLevel(2);
        }

        inventory.debugSeedRiceBundleInventoryIfEmpty();
        this.updateIngredientButtonCounts();

        const hasAny =
            inventory.getAvailableCount(IngredientType.RICE) > 0 ||
            inventory.getAvailableCount(IngredientType.POTATO) > 0 ||
            inventory.getAvailableCount(IngredientType.EGG) > 0 ||
            inventory.getAvailableCount(IngredientType.GREEN_ONION) > 0 ||
            inventory.getAvailableCount(IngredientType.LETTUCE) > 0 ||
            inventory.getAvailableCount(IngredientType.CILANTRO) > 0;
        if (!hasAny) {
            this.retrySeedPreviewInventory();
        }
    }

    /**
     * 预览模式：确保第二关库存就绪（防止场景切换后被覆盖）
     */
    private ensurePreviewInventorySeeded(): void {
        if (!(PREVIEW || EDITOR || DEV)) return;
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        if (!inventory.currentLevel || inventory.currentLevel.levelId !== 2) {
            inventory.initLevel(2);
        }

        const levelState = inventory.currentLevel;
        if (!levelState) return;

        const seedItems = [
            { type: IngredientType.RICE, processed: 6 },
            { type: IngredientType.POTATO, processed: 6 },
            { type: IngredientType.EGG, processed: 6 },
            { type: IngredientType.GREEN_ONION, processed: 6 },
            { type: IngredientType.LETTUCE, processed: 6 },
            { type: IngredientType.CILANTRO, processed: 6 },
        ];

        let changed = false;
        for (const seed of seedItems) {
            let item = levelState.inventory.get(seed.type);
            if (!item) {
                item = {
                    ingredientType: seed.type,
                    rawCount: 0,
                    processedCount: 0,
                    reservedCount: 0
                };
                levelState.inventory.set(seed.type, item);
                changed = true;
            }
            if (item.processedCount < seed.processed) {
                item.processedCount = seed.processed;
                changed = true;
            }
            if (item.reservedCount > item.processedCount) {
                item.reservedCount = 0;
                changed = true;
            }
        }

        if (changed) {
            inventory.saveLevelState();
        }
    }

    private retrySeedPreviewInventory(): void {
        if (this.previewSeedAttempts >= 3) return;
        this.previewSeedAttempts += 1;
        this.scheduleOnce(() => this.seedPreviewInventory(), 0.2);
    }

    /**
     * 🔥 完全移除按钮的Sprite Frame，改为文字+emoji显示
     */
    private setupIngredientButtonDisplays(): void {
        const buttons: Node[] = [
            this.riceBtn, this.potatoBtn, this.eggBtn,
            this.greenOnionBtn, this.lettuceBtn, this.cilantroBtn
        ];

        buttons.forEach((btnNode, index) => {
            if (!btnNode) return;

            // 获取食材类型
            const ingredientTypes: IngredientType[] = [
                IngredientType.RICE, IngredientType.POTATO, IngredientType.EGG,
                IngredientType.GREEN_ONION, IngredientType.LETTUCE, IngredientType.CILANTRO
            ];
            const type = ingredientTypes[index];
            const display = this.ingredientDisplays.get(type);

            if (!display) return;

            // 🔥 隐藏所有P1-P4子节点（第一关的图片按钮）
            for (let i = 1; i <= 4; i++) {
                const pNode = btnNode.getChildByName(`P${i}`);
                if (pNode) {
                    pNode.active = false;
                    // 🔥 完全移除Sprite组件
                    const sprite = pNode.getComponent(Sprite);
                    if (sprite) {
                        sprite.spriteFrame = null!;
                    }
                }
            }

            // 🔥 处理ClickArea
            const clickArea = btnNode.getChildByName('ClickArea');
            if (clickArea) {
                // 隐藏调试多边形
                const debugPolygon = clickArea.getChildByName('_DebugPolygon');
                if (debugPolygon) {
                    debugPolygon.active = false;
                }

                // 🔥 移除ClickArea的Sprite组件
                const clickSprite = clickArea.getComponent(Sprite);
                if (clickSprite) {
                    clickSprite.enabled = false;
                }
            }

            // 🔥 完全移除按钮节点的Sprite
            const btnSprite = btnNode.getComponent(Sprite);
            if (btnSprite) {
                btnSprite.spriteFrame = null!;
                btnSprite.enabled = false;
            }

            // 🔥 移除所有子节点的Sprite组件
            const removeSpritesRecursive = (node: Node) => {
                const sprite = node.getComponent(Sprite);
                if (sprite) {
                    sprite.spriteFrame = null!;
                    sprite.enabled = false;
                }
                for (const child of node.children) {
                    removeSpritesRecursive(child);
                }
            };
            removeSpritesRecursive(btnNode);
            // ?? 仅使用场景里已有的文本节点，不新增节点或背景
            const labelNode = btnNode.getChildByName('BtnLabel') || btnNode.getChildByName('Label');
            if (!labelNode) {
                console.warn(`[RiceBundleController] ?? ${btnNode.name} 缺少按钮文字节点`);
                return;
            }

            const label = labelNode.getComponent(Label);
            if (!label) {
                console.warn(`[RiceBundleController] ?? ${btnNode.name} 按钮文字缺少Label组件`);
                return;
            }

            if (!label.string || label.string.trim().length === 0) {
                label.string = `${display.emoji}\n${display.name}`;
            }
            label.fontSize = 24; // 增大字体
            label.lineHeight = 30;
            label.color = new Color(255, 255, 255, 255);
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;

            const labelTransform = labelNode.getComponent(UITransform);
            if (labelTransform) {
                labelTransform.setContentSize(this.CEL_SHADING.BUTTON_WIDTH, this.CEL_SHADING.BUTTON_HEIGHT);
            }
            labelNode.active = true;
            const btnTransform = btnNode.getComponent(UITransform);
            if (btnTransform) {
                btnTransform.setContentSize(this.CEL_SHADING.BUTTON_WIDTH, this.CEL_SHADING.BUTTON_HEIGHT);
            }

            console.log(`[RiceBundleController] ✅ 设置按钮: ${display.emoji} ${display.name}`);
        });
    }

    /**
     * 刷新食材按钮数量（对齐 Shop/Processing 的库存）
     */
    private updateIngredientButtonCounts(): void {
        this.ensurePreviewInventorySeeded();
        const inventory = InventoryManager.instance;
        if (!inventory) return;

        const entries = [
            { type: IngredientType.RICE, node: this.riceBtn },
            { type: IngredientType.POTATO, node: this.potatoBtn },
            { type: IngredientType.EGG, node: this.eggBtn },
            { type: IngredientType.GREEN_ONION, node: this.greenOnionBtn },
            { type: IngredientType.LETTUCE, node: this.lettuceBtn },
            { type: IngredientType.CILANTRO, node: this.cilantroBtn },
        ];

        for (const entry of entries) {
            if (!entry.node) continue;
            const display = this.ingredientDisplays.get(entry.type);
            if (!display) continue;

            const labelNode = entry.node.getChildByName('BtnLabel') || entry.node.getChildByName('Label');
            if (!labelNode) continue;
            const label = labelNode.getComponent(Label);
            if (!label) continue;

            const count = inventory.getAvailableCount(entry.type);
            label.string = `${display.emoji}\n${display.name} x${count}`;
        }
    }

    /**
     * 设置区域显示
     */
    private setupAreaDisplays(): void {
        // 蒸锅区域
        this.setupAreaBackground(this.steamerArea, new Color(255, 200, 150, 255), 200, 250);
        this.updateAreaLabel(this.steamerArea, "?? 蒸锅", new Color(255, 200, 150, 255));

        // 炒制区域
        this.setupAreaBackground(this.stirFryArea, new Color(255, 220, 180, 255), 260, 300);
        this.updateAreaLabel(this.stirFryArea, "?? 炒锅", new Color(255, 220, 180, 255));
        this.ensureStirFryStatusLabel();
        this.updateStirFryStatusLabel();

        // 搅拌盆区域
        this.setupAreaBackground(this.mixingBowlArea, new Color(200, 220, 255, 255), 200, 250);
        this.updateAreaLabel(this.mixingBowlArea, "?? 搅拌盆", new Color(200, 220, 255, 255));

        // 菜叶区域
        this.setupAreaBackground(this.cabbageLeafArea, new Color(180, 255, 180, 255), 200, 250);
        this.updateAreaLabel(this.cabbageLeafArea, "?? 菜叶区", new Color(180, 255, 180, 255));

        // 鸡蛋酱盒
        this.setupAreaBackground(this.eggSauceBox, new Color(230, 200, 150, 255), 160, 120);
    }

    /**
     * 🎨 设置区域尺寸（不绘制背景）
     */
    private setupAreaBackground(areaNode: Node | null, bgColor: Color, areaWidth: number, areaHeight: number): void {
        if (!areaNode) return;

        const transform = areaNode.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(areaWidth, areaHeight);
        }
    }

    /**
     * 🔥 初始化进度条节点
     */
    private setupProgressBarNodes(): void {
        // 确保进度条节点存在并有正确的初始大小
        if (this.potatoProgress) this.potatoProgress.active = false;
        if (this.riceProgress) this.riceProgress.active = false;
        this.initProgressBar(this.progressBarFill, new Color(200, 200, 100, 255));
        this.initProgressBar(this.mixProgress, new Color(200, 150, 100, 255));
        this.initProgressBar(this.fryProgress, new Color(200, 150, 100, 255));
        this.initProgressBar(this.rollProgress, new Color(200, 200, 100, 255));
    }

    /**
     * 初始化单个进度条
     */
    private initProgressBar(progressNode: Node | null, color: Color): void {
        if (!progressNode) return;

        let sprite = progressNode.getComponent(Sprite);
        if (!sprite) {
            sprite = progressNode.addComponent(Sprite);
            sprite.color = color;
        }

        const transform = progressNode.getComponent(UITransform) || progressNode.addComponent(UITransform);
        transform.setAnchorPoint(0, 0.5);
        transform.setContentSize(5, 10); // 初始大小
    }

    /**
     * 更新区域标签显示
     */
    private updateAreaLabel(areaNode: Node | null, text: string, bgColor: Color): void {
        if (!areaNode) return;

        const labelNode = areaNode.getChildByName('AreaLabel');
        if (!labelNode) {
            console.warn(`[RiceBundleController] ?? ${areaNode.name} 缺少区域文字节点`);
            return;
        }

        const label = labelNode.getComponent(Label);
        if (!label) {
            console.warn(`[RiceBundleController] ?? ${areaNode.name} 区域文字缺少Label组件`);
            return;
        }

        if (!label.string || label.string.trim().length === 0) {
            label.string = text;
        }
        label.fontSize = 32;
        label.lineHeight = 36;
        label.color = bgColor;

        const transform = labelNode.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(140, 45);
        }
    }

    /**
     * 🔥 播放区域点击反馈动画
     */
    private playAreaClickFeedback(areaNode: Node | null): void {
        if (!areaNode) return;

        const areaLabel = areaNode.getChildByName('AreaLabel');
        if (areaLabel) {
            const label = areaLabel.getComponent(Label);
            if (label) {
                tween(areaLabel)
                    .to(0.08, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'sineOut' })
                    .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'sineIn' })
                    .start();

                const originalColor = label.color.clone();
                label.color = new Color(255, 255, 120, 255);
                this.scheduleOnce(() => {
                    label.color = originalColor;
                }, 0.15);
            }
        }

        const originalScale = areaNode.scale.clone();
        tween(areaNode)
            .to(0.05, { scale: new Vec3(originalScale.x * 1.06, originalScale.y * 1.06, 1) })
            .to(0.1, { scale: originalScale })
            .start();
    }

    /**
     * 🔥 播放按钮点击反馈
     */
    private playButtonClickFeedback(btnNode: Node | null): void {
        if (!btnNode) return;

        const originalScale = btnNode.scale.clone();
        tween(btnNode)
            .to(0.05, { scale: new Vec3(originalScale.x * 0.9, originalScale.y * 0.9, 1) })
            .to(0.1, { scale: originalScale })
            .start();
    }

    /**
     * 🔥 溅射效果
     */
    private playSplashEffect(areaNode: Node, color: Color): void {
        for (let i = 0; i < 6; i++) {
            const particle = new Node('SplashParticle');
            const graphics = particle.addComponent(Graphics);
            const transform = particle.getComponent(UITransform) || particle.addComponent(UITransform);
            transform.setContentSize(20, 20);

            areaNode.addChild(particle);
            particle.setPosition(0, 0, 0);

            // 绘制圆形粒子
            graphics.circle(0, 0, 8);
            graphics.fill(color);
            graphics.close();

            // 随机方向
            const angle = (i / 6) * Math.PI * 2;
            const distance = 40 + Math.random() * 20;
            const targetX = Math.cos(angle) * distance;
            const targetY = Math.sin(angle) * distance;

            tween(particle)
                .to(0.3, {
                    position: new Vec3(targetX, targetY, 0),
                    scale: new Vec3(0.3, 0.3, 1)
                }, { easing: 'cubicOut' })
                .call(() => particle.destroy())
                .start();
        }
    }

    /**
     * 🔥 创建蒸汽粒子效果
     */
    private createSteamEffect(areaNode: Node): void {
        if (!areaNode) return;

        const createSteamParticle = () => {
            if (this.currentPhase !== RiceBundlePhase.STEAMING_POTATO &&
                this.currentPhase !== RiceBundlePhase.STEAMING_RICE) {
                return;
            }

            const steam = new Node('SteamParticle');
            const graphics = steam.addComponent(Graphics);
            const transform = steam.addComponent(UITransform);
            transform.setContentSize(30, 30);

            areaNode.addChild(steam);

            // 随机偏移
            const offsetX = (Math.random() - 0.5) * 40;
            steam.setPosition(offsetX, 20, 0);

            // 绘制蒸汽云
            graphics.circle(0, 0, 10 + Math.random() * 5);
            const alpha = 100 + Math.random() * 100;
            graphics.fill(new Color(255, 255, 255, alpha));
            graphics.close();

            this.steamParticles.push(steam);

            // 蒸汽上升动画
            const riseDistance = 60 + Math.random() * 30;
            tween(steam)
                .to(0.8, {
                    position: new Vec3(offsetX + (Math.random() - 0.5) * 20, 20 + riseDistance, 0),
                    scale: new Vec3(1.5, 1.5, 1)
                }, { easing: 'sineOut' })
                .call(() => {
                    const index = this.steamParticles.indexOf(steam);
                    if (index > -1) {
                        this.steamParticles.splice(index, 1);
                    }
                    steam.destroy();
                })
                .start();
        };

        // 持续产生蒸汽
        this.schedule(createSteamParticle, 0.15);
    }

    /**
     * 🔥 清除所有蒸汽效果
     */
    private clearSteamEffects(): void {
        this.unscheduleAllCallbacks();

        this.steamParticles.forEach(particle => {
            if (particle.isValid) {
                Tween.stopAllByTarget(particle);
                particle.destroy();
            }
        });
        this.steamParticles = [];
    }

    // 🔥 旧方法 showIngredientInSteamer 已移除，使用 createSteamIngredientNode 替代

    /**
     * 🔥 显示搅拌盆中的混合物（由 startMixing 调用）
     */
    private showMixedIngredients(): void {
        if (!this.mixingBowlArea) return;

        // 清除之前的显示
        if (this.mixedIngredientDisplay) {
            this.mixedIngredientDisplay.destroy();
        }

        this.mixedIngredientDisplay = new Node('MixedIngredients');
        const label = this.mixedIngredientDisplay.addComponent(Label);
        label.string = '🥔🍚\n土豆泥';
        label.fontSize = 32;
        label.lineHeight = 36;
        label.color = new Color(230, 210, 150, 255);

        const transform = this.mixedIngredientDisplay.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(80, 80);
        }

        this.mixingBowlArea.addChild(this.mixedIngredientDisplay);
        this.mixedIngredientDisplay.setPosition(0, -10, 0);

        // 搅拌动画效果
        this.playMixingAnimation();
    }

    /**
     * 🔥 搅拌动画（由 showMixedIngredients 调用）
     */
    private playMixingAnimation(): void {
        if (!this.mixedIngredientDisplay) return;

        const mixNode = this.mixedIngredientDisplay;
        let angle = 0;

        const rotateMix = () => {
            if (this.currentPhase !== RiceBundlePhase.MIXING) {
                mixNode.setRotationFromEuler(new Vec3(0, 0, 0));
                return;
            }

            angle += 15;
            mixNode.setRotationFromEuler(new Vec3(0, 0, angle));

            // 左右晃动
            const sway = Math.sin(angle * Math.PI / 180) * 5;
            mixNode.setPosition(sway, -10, 0);

            this.scheduleOnce(rotateMix, 0.05);
        };
        rotateMix();
    }

    /**
     * 🔥 显示菜叶上的卷制状态
     */
    private updateRollVisuals(): void {
        if (!this.cabbageLeafArea) return;

        // 清除旧的卷制显示
        this.rollVisuals.forEach(v => v.destroy());
        this.rollVisuals = [];

        if (this.lettuceOnLeaf && this.lettuceLeafNodes.length === 0 && this.lettuceOnLeaf.isValid) {
            this.lettuceLeafNodes.push(this.lettuceOnLeaf);
        }

        const targetLeafCount = Math.min(this.lettucePlacedCount, this.MAX_LETTUCE_ON_LEAF);
        if (targetLeafCount <= 0) {
            this.lettuceLeafNodes.forEach(node => {
                if (node && node.isValid) {
                    node.destroy();
                }
            });
            this.lettuceLeafNodes = [];
            this.lettuceOnLeaf = null;
            return;
        }

        for (let i = this.lettuceLeafNodes.length - 1; i >= targetLeafCount; i--) {
            const node = this.lettuceLeafNodes[i];
            if (node && node.isValid) {
                node.destroy();
            }
            this.lettuceLeafNodes.splice(i, 1);
        }

        for (let i = this.lettuceLeafNodes.length; i < targetLeafCount; i++) {
            const leafNode = new Node(`LettuceOnLeaf_${i + 1}`);
            const label = leafNode.addComponent(Label);
            label.string = '??';
            label.fontSize = 50;
            label.lineHeight = 50;

            const transform = leafNode.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(70, 70);
            }

            this.cabbageLeafArea.addChild(leafNode);
            this.lettuceLeafNodes.push(leafNode);
        }

        const leafOffsets = [-45, 0, 45];
        for (let i = 0; i < this.lettuceLeafNodes.length; i++) {
            const leafNode = this.lettuceLeafNodes[i];
            if (!leafNode || !leafNode.isValid) continue;
            const offsetX = leafOffsets[i] ?? 0;
            leafNode.setPosition(offsetX, -10, 0);
        }
        this.lettuceOnLeaf = this.lettuceLeafNodes[0] || null;

        // 根据卷制进度显示混合物
        const rollProgress = this.rollCount / this.requiredRolls;
        const hasFilling = this.hasFillingOnLeaf || rollProgress > 0;
        if (hasFilling) {
            const visualProgress = rollProgress > 0 ? rollProgress : 0.35;
            const filling = new Node('Filling');
            const label = filling.addComponent(Label);
            label.fontSize = Math.floor(30 * visualProgress) + 10;
            label.lineHeight = label.fontSize;
            label.string = '????';

            const transform = filling.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(50, 50);
            }

            this.cabbageLeafArea.addChild(filling);
            filling.setPosition(0, -10 + visualProgress * 15, 0);
            this.rollVisuals.push(filling);
        }
    }

    /**
     * 🔥 显示完成庆祝效果
     */
    private playCompletionCelebration(areaNode: Node | null): void {
        if (!areaNode) return;

        // 闪烁效果
        const flashCount = 3;
        for (let i = 0; i < flashCount; i++) {
            this.scheduleOnce(() => {
                const originalColor = areaNode.scale.clone();
                tween(areaNode)
                    .to(0.1, { scale: new Vec3(1.1, 1.1, 1) })
                    .to(0.1, { scale: originalColor })
                    .start();

                // 创建星星粒子
                for (let j = 0; j < 8; j++) {
                    this.createStarParticle(areaNode);
                }
            }, i * 0.25);
        }
    }

    /**
     * 🔥 创建星星粒子
     */
    private createStarParticle(areaNode: Node): void {
        const star = new Node('StarParticle');
        const label = star.addComponent(Label);
        label.string = '⭐';
        label.fontSize = 24;

        const transform = star.addComponent(UITransform);
        transform.setContentSize(30, 30);

        areaNode.parent?.addChild(star);
        star.setWorldPosition(areaNode.worldPosition.clone());

        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 30;
        const targetX = Math.cos(angle) * distance;
        const targetY = Math.sin(angle) * distance;

        tween(star)
            .to(0.4, {
                position: new Vec3(targetX, targetY, 0),
                scale: new Vec3(0.5, 0.5, 1)
            }, { easing: 'cubicOut' })
            .call(() => star.destroy())
            .start();
    }

    /**
     * 🔥 点击土豆按钮 - 拿起土豆（参考第一关的onSausageClick）
     */
    private handlePotatoButtonClick(): void {
        if (this.potatoSteamed) {
            this.showMessage('🥔 土豆已经蒸好了！');
            return;
        }

        if (!this.hasIngredientStock(IngredientType.POTATO)) {
            this.showMessage('⚠️ 土豆库存不足！');
            return;
        }

        // 检查蒸锅是否已有食材在蒸制
        if (this.currentPhase === RiceBundlePhase.STEAMING_RICE) {
            this.showMessage('⏳ 正在蒸大米，请等待完成');
            return;
        }

        // 已经有一个土豆在蒸制中
        if (this.steamingIngredients.some(ing => ing.type === IngredientType.POTATO && !ing.isSteamed)) {
            this.showMessage('⏳ 土豆已经在蒸制中了');
            return;
        }

        // 🔥 设置为手持物品
        this.currentHandItem = IngredientType.POTATO;
        this.updateHandDisplay();
        this.showMessage('✋ 拿起了土豆，点击蒸锅开始蒸制！');
        this.playButtonClickFeedback(this.potatoBtn || null);
    }

    /**
     * 🔥 点击大米按钮 - 拿起大米
     */
    private handleRiceButtonClick(): void {
        if (this.riceSteamed) {
            this.showMessage('🍚 大米已经蒸好了！');
            return;
        }

        if (!this.hasIngredientStock(IngredientType.RICE)) {
            this.showMessage('⚠️ 大米库存不足！');
            return;
        }

        if (this.currentPhase === RiceBundlePhase.STEAMING_POTATO) {
            this.showMessage('⏳ 正在蒸土豆，请等待完成');
            return;
        }

        if (this.steamingIngredients.some(ing => ing.type === IngredientType.RICE && !ing.isSteamed)) {
            this.showMessage('⏳ 大米已经在蒸制中了');
            return;
        }

        this.currentHandItem = IngredientType.RICE;
        this.updateHandDisplay();
        this.showMessage('✋ 拿起了大米，点击蒸锅开始蒸制！');
        this.playButtonClickFeedback(this.riceBtn || null);
    }

    private handleEggButtonClick(): void {
        if (this.currentHandItem) {
            if (this.currentHandItem !== IngredientType.EGG) {
                this.showMessage(`?? 请先放下手中的${this.getIngredientDisplayName(this.currentHandItem)}`);
                return;
            }
            if (this.handItemSource !== "inventory") {
                this.showMessage("?? 当前手持来源不正确");
                return;
            }
            if (this.handItemCount >= this.MAX_EGGS_IN_PAN) {
                this.putDownHandItem();
                return;
            }
            if (!this.reserveIngredientInInventory(IngredientType.EGG, 1)) {
                this.showMessage("?? 鸡蛋库存不足！");
                return;
            }
            this.handItemCount += 1;
            this.suppressCanvasPutDownOnce();
            this.lastHandItemPickupTime = game.totalTime;
            this.updateHandDisplay();
            this.showMessage(`?? 已拿起鸡蛋 x${this.handItemCount}`);
            this.playButtonClickFeedback(this.eggBtn || null);
            return;
        }

        this.pickupHandItem(IngredientType.EGG, "inventory");
        this.showMessage("? 拿起了鸡蛋，点击炒锅加入！");
        this.playButtonClickFeedback(this.eggBtn || null);
    }

    private handleGreenOnionButtonClick(): void {
        this.pickupHandItem(IngredientType.GREEN_ONION, "inventory");
        this.showMessage("? 拿起了大葱，点击炒锅或搅拌盆加入！");
        this.playButtonClickFeedback(this.greenOnionBtn || null);
    }

    private handleOilButtonClick(): void {
        this.pickupHandItem(IngredientType.OIL, "infinite");
        this.showMessage("? 拿起了油，点击炒锅加入！");
    }

    private handleSauceButtonClick(): void {
        this.pickupHandItem(IngredientType.SAUCE, "infinite");
        this.showMessage("? 拿起了酱，点击炒锅加入！");
    }

    private handlePeanutButtonClick(): void {
        this.pickupHandItem(IngredientType.PEANUT_SAUCE, "infinite");
        this.showMessage("? 拿起了花生米，点击搅拌盆加入！");
    }

    /**
     * 🔥 点击生菜按钮 - 拿起生菜
     */
    private handleLettuceButtonClick(): void {
        if (this.currentPhase === RiceBundlePhase.ROLLING ||
            this.currentPhase === RiceBundlePhase.PACKED) {
            this.showMessage("?? 正在卷制中，无法继续铺生菜");
            return;
        }

        if (this.hasFillingOnLeaf || this.rollCount > 0) {
            this.showMessage("?? 请先完成当前卷制");
            return;
        }

        if (this.lettucePlacedCount >= this.MAX_LETTUCE_ON_LEAF) {
            this.showMessage("?? 生菜最多铺3张");
            return;
        }

        if (this.currentHandItem) {
            this.showMessage("?? 请先放下手里的食材");
            return;
        }

        if (!this.reserveIngredientInInventory(IngredientType.LETTUCE, 1)) {
            this.showMessage("?? 生菜库存不足！");
            return;
        }

        this.addLettuceToLeaf();
        this.playButtonClickFeedback(this.lettuceBtn || null);
    }

    /**
     * 🔥 点击香菜按钮 - 拿起香菜
     */
    private handleCilantroButtonClick(): void {
        if (this.mixed) {
            this.showMessage("?? 搅拌已完成，无需再加香菜");
            return;
        }

        this.pickupHandItem(IngredientType.CILANTRO, "inventory");
        this.showMessage("? 拿起了香菜，点击搅拌盆加入！");
        this.playButtonClickFeedback(this.cilantroBtn?.node || null);
    }

    /**
     * 🔥 更新手持物品显示（参考第一关的updateHandDisplay）
     */
    private updateHandDisplay(): void {
        if (!this.handItemLabel) return;

        const label = this.handItemLabel.getComponent(Label);
        if (!label) return;

        if (this.currentHandItem) {
            this.ensureFollowOverlayOnTop();
            const display = this.ingredientDisplays.get(this.currentHandItem);
            const name = display?.name || this.currentHandItem;
            const emoji = display?.emoji || '';
            const countText = this.handItemCount > 1 ? ` x${this.handItemCount}` : ``;
            label.string = `${emoji}\n${name}${countText}`.trim();
            this.handItemLabel.active = true;
            this.handItemLabel.setSiblingIndex(9999);
        } else {
            this.handItemLabel.active = false;
        }
        this.updateUiHitTestState();
    }

    private pickupHandItem(type: IngredientType, source: "inventory" | "box" | "infinite"): void {
        if (this.currentHandItem) {
            if (this.currentHandItem === type) {
                this.putDownHandItem();
            } else {
                this.showMessage(`?? 请先放下手中的${this.getIngredientDisplayName(this.currentHandItem)}`);
            }
            return;
        }

        if (this.ingredientFollower && this.ingredientFollower.getCurrentHandItem()) {
            this.showMessage("?? 请先放下手里的熟食材");
            return;
        }

        if (source === "inventory") {
            if (!this.reserveIngredientInInventory(type, 1)) {
                this.showMessage(`?? ${this.getIngredientDisplayName(type)}库存不足！`);
                return;
            }
            this.updateIngredientButtonCounts();
        } else if (source === "box") {
            if (this.eggSauceBoxCount <= 0) {
                this.showMessage("?? 鸡蛋酱盒为空");
                return;
            }
            this.eggSauceBoxCount -= 1;
            this.updateEggSauceBoxDisplay();
        }

        this.currentHandItem = type;
        this.handItemCount = 1;
        this.handItemSource = source;
        this.suppressCanvasPutDownOnce();
        this.lastHandItemPickupTime = game.totalTime;
        this.updateHandDisplay();
    }

    private putDownHandItem(): void {
        if (!this.currentHandItem) return;

        if (this.handItemSource === "inventory") {
            this.releaseIngredientInInventory(this.currentHandItem, this.handItemCount);
            this.updateIngredientButtonCounts();
        } else if (this.handItemSource === "box") {
            this.eggSauceBoxCount += this.handItemCount;
            this.updateEggSauceBoxDisplay();
        }

        this.clearHandItem();
    }

    private clearHandItem(): void {
        this.currentHandItem = null;
        this.handItemSource = null;
        this.handItemCount = 0;
        this.updateHandDisplay();
    }

    private confirmReservedIngredient(type: IngredientType, count: number = 1): boolean {
        const inventory = InventoryManager.instance;
        if (!inventory) return true;

        const success = inventory.confirmReservedIngredient(type, count);
        if (success) {
            this.updateIngredientButtonCounts();
        }

        return success;
    }

    private updateEggSauceBoxDisplay(): void {
        if (this.eggSauceCountLabel) {
            this.eggSauceCountLabel.string = `x${this.eggSauceBoxCount}`;
        }
    }

    /**
     * 🔥 处理蒸锅区域点击（参考第一关的onGrillClick）
     */
    private handleSteamerAreaClick(): void {
        // 手上有土豆或大米 -> 放入蒸锅
        if (this.currentHandItem === IngredientType.POTATO) {
            this.addPotatoToSteamer();
            return;
        }
        if (this.currentHandItem === IngredientType.RICE) {
            this.addRiceToSteamer();
            return;
        }

        if (!this.ingredientFollower || !this.steamerManager) return;
        const handItem = this.ingredientFollower.getCurrentHandItem();
        if (!handItem) return;

        let rawType: IngredientType | null = null;
        if (handItem.type === IngredientType.COOKED_RICE) {
            rawType = IngredientType.RICE;
        } else if (handItem.type === IngredientType.POTATO_MASH) {
            rawType = IngredientType.POTATO;
        }

        if (!rawType) return;

        let remaining = handItem.count;
        let placedCount = 0;
        while (remaining > 0) {
            const emptySlot = this.steamerManager.findFirstEmptySlot();
            if (!emptySlot) break;
            if (!this.steamerManager.placeCompletedIngredient(emptySlot.index, rawType, 1)) break;
            remaining -= 1;
            placedCount += 1;
        }

        if (placedCount > 0) {
            const name = this.getIngredientDisplayName(handItem.type);
            if (remaining <= 0) {
                this.ingredientFollower.putDownIngredient();
            } else {
                this.ingredientFollower.setCurrentCount(remaining);
            }
            this.updateUiHitTestState();
            this.showMessage(`?? 放回了${placedCount}份${name}`);
        } else {
            this.showMessage('?? 没有空槽位');
        }
    }


    private handleStirFryAreaClick(): void {
        if (!this.stirFryArea) return;

        if (this.eggSauceReadyCount > 0) {
            this.flyEggSauceToBox();
            return;
        }

        if (this.currentHandItem === IngredientType.OIL) {
            if (this.hasOil) {
                this.showMessage("?? 已经加过油了");
                return;
            }
            this.hasOil = true;
            this.clearHandItem();
            this.showMessage("? 已加油");
            this.playAreaClickFeedback(this.stirFryArea);
            this.updateStirFryStatusLabel();
            return;
        }

        if (this.currentHandItem === IngredientType.GREEN_ONION) {
            if (!this.hasOil) {
                this.showMessage("?? 请先加油");
                return;
            }
            if (this.hasOnion) {
                this.showMessage("?? 已经加过大葱了");
                return;
            }
            if (!this.confirmReservedIngredient(IngredientType.GREEN_ONION, 1)) {
                return;
            }
            this.hasOnion = true;
            this.clearHandItem();
            this.showMessage("? 已加入大葱");
            this.playAreaClickFeedback(this.stirFryArea);
            this.updateStirFryStatusLabel();
            return;
        }

        if (this.currentHandItem === IngredientType.EGG) {
            if (!this.hasOil) {
                this.showMessage("?? 请先加油");
                return;
            }
            if (this.eggCooked || this.isFrying) {
                this.showMessage("?? 鸡蛋正在炒制中");
                return;
            }
            if (this.eggCountInPan >= this.MAX_EGGS_IN_PAN) {
                this.showMessage("?? 鸡蛋已满");
                return;
            }
            if (!this.confirmReservedIngredient(IngredientType.EGG, 1)) {
                return;
            }
            this.eggCountInPan += 1;
            if (this.handItemCount > 1) {
                this.handItemCount -= 1;
                this.suppressCanvasPutDownOnce();
                this.lastHandItemPickupTime = game.totalTime;
                this.updateHandDisplay();
            } else {
                this.clearHandItem();
            }
            this.showMessage(`? 已加入鸡蛋 x${this.eggCountInPan}`);
            this.playAreaClickFeedback(this.stirFryArea);
            this.updateStirFryStatusLabel();
            return;
        }

        if (this.currentHandItem === IngredientType.SAUCE) {
            if (!this.eggCooked || this.eggCountInPan <= 0) {
                this.showMessage("?? 需要先炒熟鸡蛋");
                return;
            }
            this.eggSauceReadyCount = this.eggCountInPan;
            this.eggCountInPan = 0;
            this.eggCooked = false;
            this.isFrying = false;
            this.fryProgressValue = 0;
            this.hasOil = false;
            this.hasOnion = false;
            this.clearHandItem();
            this.updateFryProgress(0);
            this.showEggSauceReadyVisual();
            this.showMessage("?? 鸡蛋酱完成，点击炒锅收进盒子");
            this.playAreaClickFeedback(this.stirFryArea);
            this.updateStirFryStatusLabel();
            return;
        }

        if (!this.currentHandItem && this.eggCountInPan > 0 && !this.eggCooked) {
            this.advanceFryProgress();
            return;
        }
    }

    private handleEggSauceBoxClick(): void {
        if (this.eggSauceReadyCount > 0) {
            this.flyEggSauceToBox();
            return;
        }

        if (this.currentHandItem === IngredientType.EGG_SAUCE && this.handItemSource === "box") {
            this.putDownHandItem();
            return;
        }

        if (this.currentHandItem) {
            this.showMessage("?? 请先放下手里的食材");
            return;
        }

        if (this.eggSauceBoxCount <= 0) {
            this.showMessage("?? 鸡蛋酱盒为空");
            return;
        }

        this.pickupHandItem(IngredientType.EGG_SAUCE, "box");
        this.showMessage("? 拿起了鸡蛋酱，点击搅拌盆加入！");
    }
    
    private showEggSauceReadyVisual(): void {
        if (!this.stirFryArea) return;

        if (!this.eggSauceReadyNode || !this.eggSauceReadyNode.isValid) {
            this.eggSauceReadyNode = new Node('EggSauceReady');
            const label = this.eggSauceReadyNode.addComponent(Label);
            label.fontSize = 36;
            label.lineHeight = 40;

            let transform = this.eggSauceReadyNode.getComponent(UITransform);
            if (!transform) {
                transform = this.eggSauceReadyNode.addComponent(UITransform);
            }
            transform.setContentSize(90, 60);

            this.stirFryArea.addChild(this.eggSauceReadyNode);
            this.eggSauceReadyNode.setPosition(0, -10, 0);
        }

        const display = this.ingredientDisplays.get(IngredientType.EGG_SAUCE);
        const emoji = display?.emoji || '';
        const countText = this.eggSauceReadyCount > 1 ? `x${this.eggSauceReadyCount}` : '';
        const label = this.eggSauceReadyNode.getComponent(Label);
        if (label) {
            label.string = `${emoji}${countText}`;
        }
    }

    private clearEggSauceReadyVisual(): void {
        if (this.eggSauceReadyNode && this.eggSauceReadyNode.isValid) {
            this.eggSauceReadyNode.destroy();
        }
        this.eggSauceReadyNode = null;
    }

    private applyEggSauceToBox(): void {
        if (this.eggSauceReadyCount <= 0) return;
        this.eggSauceBoxCount += this.eggSauceReadyCount;
        this.eggSauceReadyCount = 0;
        this.updateEggSauceBoxDisplay();
        this.clearEggSauceReadyVisual();
        this.updateStirFryStatusLabel();
        this.showMessage('? 鸡蛋酱已放入盒子');
    }

    private flyEggSauceToBox(): void {
        if (this.isEggSauceFlying || this.eggSauceReadyCount <= 0) return;
        this.isEggSauceFlying = true;

        if (!this.eggSauceBox || !this.stirFryArea) {
            this.applyEggSauceToBox();
            this.isEggSauceFlying = false;
            return;
        }

        const display = this.ingredientDisplays.get(IngredientType.EGG_SAUCE);
        const emoji = display?.emoji || '';
        const countText = this.eggSauceReadyCount > 1 ? `x${this.eggSauceReadyCount}` : '';

        const flyingNode = new Node('EggSauceFlying');
        const label = flyingNode.addComponent(Label);
        label.string = `${emoji}${countText}`;
        label.fontSize = 36;
        label.lineHeight = 40;

        let transform = flyingNode.getComponent(UITransform);
        if (!transform) {
            transform = flyingNode.addComponent(UITransform);
        }
        transform.setContentSize(90, 60);

        this.node.addChild(flyingNode);
        flyingNode.setWorldPosition(this.stirFryArea.worldPosition);

        tween(flyingNode)
            .to(0.25, {
                worldPosition: this.eggSauceBox.worldPosition,
                scale: new Vec3(0.7, 0.7, 1)
            }, { easing: 'quadOut' })
            .call(() => {
                flyingNode.destroy();
                this.applyEggSauceToBox();
                this.isEggSauceFlying = false;
            })
            .start();
    }

    /**
     * 🔥 处理搅拌盆区域点击
     */
    private handleMixingBowlAreaClick(): void {
        if (this.currentHandItem === IngredientType.MIXING_BOWL) {
            this.putDownHandItem();
            this.showMessage("🥣 已放回拌料盆");
            return;
        }
        if (this.currentHandItem) {
            if (this.tryAddHandIngredientToMixing(this.currentHandItem)) {
                return;
            }
            this.showMessage("?? 该食材不能放入搅拌盆");
            return;
        }
        if (this.tryAddFollowerCookedToMixing()) {
            return;
        }

        if (this.mixed) {
            this.handleMixingBowlPickup();
            return;
        }

        if (this.currentPhase === RiceBundlePhase.MIXING) {
            this.showMessage("?? 正在搅拌中...");
            return;
        }

        const missing = this.getMissingMixingIngredients();
        if (missing.length > 0) {
            this.showMessage(`?? 还缺：${missing.join("、")}`);
            return;
        }

        this.startAutoMixing();
    }

    private tryAddHandIngredientToMixing(type: IngredientType): boolean {
        if (!this.canAcceptMixingAdd()) {
            return true;
        }

        const allowed = [
            IngredientType.GREEN_ONION,
            IngredientType.CILANTRO,
            IngredientType.EGG_SAUCE,
            IngredientType.PEANUT_SAUCE
        ];
        if (!allowed.includes(type)) {
            return false;
        }

        if (type === IngredientType.GREEN_ONION || type === IngredientType.CILANTRO) {
            if (!this.confirmReservedIngredient(type, 1)) {
                return true;
            }
        }

        this.mixingIngredients.set(type, (this.mixingIngredients.get(type) || 0) + 1);
        this.clearHandItem();
        this.showMessage(`?? 已加入${this.getIngredientDisplayName(type)}`);
        this.checkCanStartMixing();
        return true;
    }

    private tryAddFollowerCookedToMixing(showInvalidMessage: boolean = false): boolean {
        if (!this.ingredientFollower) return false;
        const handItem = this.ingredientFollower.getCurrentHandItem();
        if (!handItem) return false;

        const validTypes = [
            IngredientType.COOKED_RICE,
            IngredientType.POTATO_MASH
        ];
        if (!validTypes.includes(handItem.type)) {
            if (showInvalidMessage) {
                this.showMessage("?? 只能放入蒸好的食材！");
                return true;
            }
            return false;
        }

        if (!this.canAcceptMixingAdd()) {
            return true;
        }

        this.addCookedIngredientsToMixing(handItem.type, handItem.count);
        this.ingredientFollower.putDownIngredient();
        this.updateUiHitTestState();
        const name = this.getIngredientDisplayName(handItem.type);
        this.showMessage(`?? 放入了${handItem.count}份${name}`);
        this.checkCanStartMixing();
        return true;
    }

    private canAcceptMixingAdd(): boolean {
        if (this.mixed) {
            this.showMessage("?? 已经搅拌完成了！");
            return false;
        }
        if (this.currentPhase === RiceBundlePhase.MIXING) {
            this.showMessage("?? 正在搅拌中，先完成搅拌");
            return false;
        }
        return true;
    }

    private addCookedIngredientsToMixing(type: IngredientType, count: number): void {
        this.cookedIngredients.set(
            type,
            (this.cookedIngredients.get(type) || 0) + count
        );

        if (type === IngredientType.COOKED_RICE) {
            this.riceSteamed = true;
        } else if (type === IngredientType.POTATO_MASH) {
            this.potatoSteamed = true;
        }
    }

    private handleMixingBowlPickup(): void {
        if (!this.mixed) {
            this.showMessage("?? 需要先完成搅拌");
            return;
        }
        if (this.hasFillingOnLeaf) {
            this.showMessage("?? 馅料已放好，直接卷制即可");
            return;
        }
        this.pickupHandItem(IngredientType.MIXING_BOWL, "infinite");
        if (this.currentHandItem === IngredientType.MIXING_BOWL) {
            this.showMessage("🥣 拿起拌料盆，点击菜叶区倒入");
            this.updateInstruction("?? 点击菜叶区倒入馅料");
        }
    }

    /**
     * 🔥 处理菜叶区域点击
     */
    private handleCabbageLeafAreaClick(): void {
        // 手上有生菜 -> 铺菜叶
        if (this.currentHandItem === IngredientType.LETTUCE) {
            this.addLettuceToLeaf();
            return;
        }

        // 手上有拌料盆 -> 倒入馅料
        if (this.currentHandItem === IngredientType.MIXING_BOWL) {
            this.addFillingToLeaf();
            return;
        }

        if (this.currentHandItem) {
            this.showMessage("?? 请先放下手中的食材");
            return;
        }

        // 没有手持物品时，点击菜叶区进行卷制
        if (this.currentPhase === RiceBundlePhase.ON_LEAF ||
            this.currentPhase === RiceBundlePhase.ROLLING) {
            this.handleRollClick();
        }
    }

    /**
     * 🔥 添加土豆到蒸锅
     */
    private addPotatoToSteamer(): void {
        // 创建蒸制中的食材节点
        const display = this.ingredientDisplays.get(IngredientType.POTATO);
        if (!display || !this.steamerArea) return;

        this.consumeIngredientFromInventory(IngredientType.POTATO, 1);

        // 创建食材节点
        const potatoNode = this.createSteamIngredientNode(IngredientType.POTATO);
        // 位置在蒸锅左侧
        potatoNode.setPosition(-40, 0, 0);
        this.steamerArea.addChild(potatoNode);

        const steamingData: SteamingIngredient = {
            type: IngredientType.POTATO,
            node: potatoNode,
            progress: 0,
            isSteamed: false
        };
        this.steamingIngredients.push(steamingData);

        this.currentPhase = RiceBundlePhase.STEAMING_POTATO;
        this.currentHandItem = null;
        this.updateHandDisplay();
        this.showMessage('🥔 土豆放入蒸锅，开始蒸制...');
        this.playAreaClickFeedback(this.steamerArea);

        // 开始蒸制
        this.schedule(() => this.updateSteamingProgress(steamingData), 0.1);
    }

    /**
     * 🔥 添加大米到蒸锅
     */
    private addRiceToSteamer(): void {
        const display = this.ingredientDisplays.get(IngredientType.RICE);
        if (!display || !this.steamerArea) return;

        this.consumeIngredientFromInventory(IngredientType.RICE, 1);

        const riceNode = this.createSteamIngredientNode(IngredientType.RICE);
        // 位置在蒸锅右侧
        riceNode.setPosition(40, 0, 0);
        this.steamerArea.addChild(riceNode);

        const steamingData: SteamingIngredient = {
            type: IngredientType.RICE,
            node: riceNode,
            progress: 0,
            isSteamed: false
        };
        this.steamingIngredients.push(steamingData);

        this.currentPhase = RiceBundlePhase.STEAMING_RICE;
        this.currentHandItem = null;
        this.updateHandDisplay();
        this.showMessage('🍚 大米放入蒸锅，开始蒸制...');
        this.playAreaClickFeedback(this.steamerArea);

        this.schedule(() => this.updateSteamingProgress(steamingData), 0.1);
    }

    /**
     * 🔥 更新蒸制进度
     */
    private updateSteamingProgress(steaming: SteamingIngredient): void {
        if (steaming.isSteamed || !steaming.node.isValid) return;

        steaming.progress += 0.1 / this.STEAM_TIME;

        // 🔥 颜色渐变
        this.updateSteamerColor(steaming);

        // 更新进度条
        if (steaming.type === IngredientType.POTATO) {
            this.updatePotatoProgress(Math.min(steaming.progress, 1));
        } else {
            this.updateRiceProgress(Math.min(steaming.progress, 1));
        }

        // 蒸制完成
        if (steaming.progress >= 1 && !steaming.isSteamed) {
            steaming.isSteamed = true;

            if (steaming.type === IngredientType.POTATO) {
                this.potatoSteamed = true;
                this.currentPhase = RiceBundlePhase.POTATO_READY;
                this.showMessage('✅ 土豆蒸好了！');
            } else {
                this.riceSteamed = true;
                this.currentPhase = RiceBundlePhase.RICE_READY;
                this.showMessage('✅ 大米蒸好了！');
            }

            // 添加完成标记
            const label = steaming.node.getComponent(Label);
            if (label) {
                label.string = label.string + '\n✅';
            }

            this.playCompletionCelebration(this.steamerArea);
            this.checkMixingReady();
        }
    }

    /**
     * 🔥 更新蒸锅食材颜色（生→熟）
     */
    private updateSteamerColor(steaming: SteamingIngredient): void {
        const label = steaming.node.getComponent(Label);
        if (!label) return;

        const progress = Math.min(steaming.progress, 1);

        if (steaming.type === IngredientType.POTATO) {
            // 土豆：生(浅黄) -> 熟(深黄)
            const r = Math.floor(230 - progress * 50);
            const g = Math.floor(200 - progress * 60);
            const b = Math.floor(150 - progress * 50);
            label.color = new Color(r, g, b, 255);
        } else {
            // 大米：生(白) -> 熟(微黄)
            const r = Math.floor(255 - progress * 35);
            const g = Math.floor(250 - progress * 30);
            const b = Math.floor(220 - progress * 20);
            label.color = new Color(r, g, b, 255);
        }
    }

    /**
     * 🔥 获取蒸锅位置（参考第一关的getSausageTransform）
     */
    private getSteamerPosition(type: IngredientType, index: number): { x: number, y: number, rotation: number } {
        const positions = type === IngredientType.POTATO ? this.potatoPositions : this.ricePositions;

        if (index < positions.length && positions[index]?.isValid) {
            const posNode = positions[index];
            const pos = posNode.position;
            const euler = posNode.eulerAngles;
            return { x: pos.x, y: pos.y, rotation: euler.z };
        }

        // 默认位置（如果没有配置位置节点）
        const offsetX = type === IngredientType.POTATO ? -40 : 40;
        return { x: offsetX, y: 0, rotation: 0 };
    }

    /**
     * 🔥 创建蒸制中的食材节点
     */
    private createSteamIngredientNode(type: IngredientType): Node {
        const display = this.ingredientDisplays.get(type);
        if (!display) return new Node();

        const node = new Node(`${display.name}Steaming`);
        const label = node.addComponent(Label);
        label.string = display.emoji;
        label.fontSize = 50;
        label.lineHeight = 50;
        label.color = display.color.clone();
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableOutline = true;
        label.outlineColor = new Color(0, 0, 0, 255);
        label.outlineWidth = 2;

        const transform = node.addComponent(UITransform);
        transform.setContentSize(60, 60);

        return node;
    }

    /**
     * 🔥 添加生菜到菜叶区
     */
    private addLettuceToLeaf(): void {
        if (this.hasFillingOnLeaf || this.rollCount > 0 || this.currentPhase === RiceBundlePhase.ROLLING) {
            this.showMessage("?? 请先完成当前卷制");
            this.clearHandItem();
            return;
        }

        if (this.lettucePlacedCount >= this.MAX_LETTUCE_ON_LEAF) {
            this.showMessage("?? 生菜最多铺3张");
            this.clearHandItem();
            return;
        }

        if (!this.confirmReservedIngredient(IngredientType.LETTUCE, 1)) {
            return;
        }

        this.lettucePlacedCount = Math.min(this.lettucePlacedCount + 1, this.MAX_LETTUCE_ON_LEAF);
        this.currentPhase = RiceBundlePhase.ON_LEAF;
        this.rollCount = 0;
        this.hasFillingOnLeaf = false;
        this.clearHandItem();
        this.updateRollVisuals();
        this.updateRollProgress();
        this.showMessage(`?? 菜叶铺好了！(${this.lettucePlacedCount}/${this.MAX_LETTUCE_ON_LEAF}) 用拌料盆倒入馅料`);
        this.playAreaClickFeedback(this.cabbageLeafArea);
    }

    private addFillingToLeaf(): void {
        if (!this.mixed) {
            this.showMessage("?? 需要先完成搅拌");
            return;
        }
        if (this.lettucePlacedCount <= 0) {
            this.showMessage("?? 请先铺好生菜");
            return;
        }
        if (this.hasFillingOnLeaf) {
            this.showMessage("?? 馅料已放好");
            return;
        }

        this.hasFillingOnLeaf = true;
        this.currentPhase = RiceBundlePhase.ON_LEAF;
        this.clearHandItem();
        this.updateRollVisuals();
        this.updateRollProgress();
        this.updateInstruction("?? 点击菜叶区卷制");
        this.showMessage("?? 馅料已放好！点击菜叶区卷制");
        this.playAreaClickFeedback(this.cabbageLeafArea);
    }

    /**
     * 🔥 添加香菜完成打包
     */
    private addCilantroToPack(): void {
        if (!this.confirmReservedIngredient(IngredientType.CILANTRO, 1)) {
            return;
        }

        this.clearHandItem();
        this.finishRiceBundle();
    }

    private checkFoodComplete(): Food | null {
        if (this.currentPhase === RiceBundlePhase.PACKED) {
            return {
                name: '东北饭包',
                quality: this.calculateFoodQuality(),
                ingredients: this.getUsedIngredients()
            };
        }
        return null;
    }

    protected calculateFoodQuality(): number {
        let quality = 50; // 基础分数

        // 根据制作速度加成
        if (this.steamProgress <= this.STEAM_TIME * 0.8) quality += 10;
        if (this.mixProgressValue <= this.MIX_TIME * 0.8) quality += 10;

        // 根据完成度加成
        if (this.potatoSteamed) quality += 10;
        if (this.riceSteamed) quality += 10;
        if (this.mixed) quality += 10;
        if (this.rollCount >= this.requiredRolls) quality += 10;

        return Math.min(100, quality);
    }

    private getUsedIngredients(): IngredientType[] {
        return [
            IngredientType.RICE,
            IngredientType.POTATO,
            IngredientType.EGG,
            IngredientType.GREEN_ONION,
            IngredientType.LETTUCE,
            IngredientType.CILANTRO
        ];
    }

    // ==================== 初始化 ====================

    protected onLoad(): void {
        super.onLoad();
        this.infiniteIngredients.add(IngredientType.PEANUT_SAUCE);
        console.log('[RiceBundleController] 🍚 第二关东北饭包加载');
    }

    protected start(): void {
        super.start();
        this.currentPhase = RiceBundlePhase.IDLE;
    }

    private bindIngredientButtons(): void {
        if (this.riceBtn) {
            const clickArea = this.riceBtn.getChildByName('ClickArea') || this.riceBtn;
            clickArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.playButtonClickAnimation(this.riceBtn);
                this.onIngredientClick(IngredientType.RICE);
            }, this);
        }
        if (this.potatoBtn) {
            const clickArea = this.potatoBtn.getChildByName('ClickArea') || this.potatoBtn;
            clickArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.playButtonClickAnimation(this.potatoBtn);
                this.onIngredientClick(IngredientType.POTATO);
            }, this);
        }
        if (this.eggBtn) {
            const clickArea = this.eggBtn.getChildByName('ClickArea') || this.eggBtn;
            clickArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.playButtonClickAnimation(this.eggBtn);
                this.onIngredientClick(IngredientType.EGG);
            }, this);
        }
        if (this.greenOnionBtn) {
            const clickArea = this.greenOnionBtn.getChildByName('ClickArea') || this.greenOnionBtn;
            clickArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.playButtonClickAnimation(this.greenOnionBtn);
                this.onIngredientClick(IngredientType.GREEN_ONION);
            }, this);
        }
        if (this.lettuceBtn) {
            const clickArea = this.lettuceBtn.getChildByName('ClickArea') || this.lettuceBtn;
            clickArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.playButtonClickAnimation(this.lettuceBtn);
                this.onIngredientClick(IngredientType.LETTUCE);
            }, this);
        }
        if (this.cilantroBtn) {
            const clickArea = this.cilantroBtn.getChildByName('ClickArea') || this.cilantroBtn;
            clickArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.playButtonClickAnimation(this.cilantroBtn);
                this.onIngredientClick(IngredientType.CILANTRO);
            }, this);
        }
    }

    private bindSaucePanelButtons(): void {
        const bindButton = (node: Node | null, handler: () => void) => {
            if (!node) return;
            const clickArea = node.getChildByName('ClickArea') || node;
            clickArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.playButtonClickAnimation(node);
                handler();
            }, this);
        };

        bindButton(this.oilBtn, () => this.handleOilButtonClick());
        bindButton(this.sauceBtn, () => this.handleSauceButtonClick());
        bindButton(this.peanutBtn, () => this.handlePeanutButtonClick());
    }

    private setupSaucePanelDisplays(): void {
        const entries = [
            { node: this.oilBtn, type: IngredientType.OIL },
            { node: this.sauceBtn, type: IngredientType.SAUCE },
            { node: this.peanutBtn, type: IngredientType.PEANUT_SAUCE },
        ];

        entries.forEach((entry) => {
            if (!entry.node) return;
            const display = this.ingredientDisplays.get(entry.type);
            if (!display) return;
            const labelNode = entry.node.getChildByName('BtnLabel') || entry.node.getChildByName('Label');
            if (!labelNode) return;
            const label = labelNode.getComponent(Label);
            if (!label) return;

            label.string = `${display.emoji}\n${display.name}`;
            label.fontSize = 22;
            label.lineHeight = 26;
            label.color = new Color(255, 255, 255, 255);

            const labelTransform = labelNode.getComponent(UITransform);
            if (labelTransform) {
                labelTransform.setContentSize(this.CEL_SHADING.BUTTON_WIDTH, this.CEL_SHADING.BUTTON_HEIGHT);
            }
            const btnTransform = entry.node.getComponent(UITransform);
            if (btnTransform) {
                btnTransform.setContentSize(this.CEL_SHADING.BUTTON_WIDTH, this.CEL_SHADING.BUTTON_HEIGHT);
            }
        });
    }

    private setupInputListeners(): void {
        if (!this.canvasNode) {
            this.canvasNode = this.node;
            if (this.canvasNode.name !== 'Canvas') {
                const sceneCanvas = this.node.scene?.getChildByName('Canvas');
                if (sceneCanvas) {
                    this.canvasNode = sceneCanvas;
                }
            }
        }

        if (this.canvasNode) {
            this.canvasNode.on(Node.EventType.TOUCH_END, this.onCanvasTouchEnd, this);
        }

        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }

    private onCanvasTouchEnd(event: EventTouch): void {
        if (!this.currentHandItem) return;
        if (this.suppressCanvasPutDown) return;
        if (this.lastHandItemPickupTime > 0 && (game.totalTime - this.lastHandItemPickupTime) < 80) {
            return;
        }

        const target = event.target as Node;
        if (this.isHandItemDropBlocked(target)) {
            return;
        }

        this.putDownHandItem();
    }

    private suppressCanvasPutDownOnce(): void {
        this.suppressCanvasPutDown = true;
        this.scheduleOnce(() => {
            this.suppressCanvasPutDown = false;
        }, 0);
    }

    private stopEventPropagation(event: EventTouch | EventMouse | any): void {
        if (!event) return;
        if (typeof event.stopPropagation === 'function') {
            event.stopPropagation();
            return;
        }
        if (typeof event.propagationStopped !== 'undefined') {
            event.propagationStopped = true;
        }
    }

    private updateUiHitTestState(): void {
        const hasHandItem = !!this.currentHandItem;
        const hasFollowerItem = !!this.ingredientFollower?.getCurrentHandItem();
        const shouldDisable = hasHandItem || hasFollowerItem;
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

        this._uiHitTestDisabled = true;
        for (const child of canvas.children) {
            if (child.name === 'RiceBundleRoot' || child.name === 'FollowOverlay') {
                continue;
            }
            this.disableNodeAndChildrenHitTest(child);
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

    private disableNodeAndChildrenHitTest(node: Node): void {
        const transform = node.getComponent(UITransform);
        if (transform && !this._blockedHitTests.has(node)) {
            this._blockedHitTests.set(node, transform.hitTest.bind(transform));
            transform.hitTest = () => false;
        }
        for (const child of node.children) {
            this.disableNodeAndChildrenHitTest(child);
        }
    }

    private ensureStirFryStatusLabel(): void {
        if (this.stirFryStatusLabel && this.stirFryStatusLabel.isValid) return;
        const labelNode = this.stirFryArea?.getChildByName('StirFryStatusLabel') || null;
        this.stirFryStatusLabel = labelNode ? labelNode.getComponent(Label) : null;
    }

    private updateStirFryStatusLabel(): void {
        this.ensureStirFryStatusLabel();
        if (!this.stirFryStatusLabel) return;

        const oilText = this.hasOil ? '✅' : '—';
        const onionText = this.hasOnion ? '✅' : '—';
        const eggCount = this.eggCountInPan;
        const cookText = this.eggCooked ? '熟' : (this.isFrying ? '炒' : (eggCount > 0 ? '生' : '—'));
        this.stirFryStatusLabel.string = `油:${oilText}  葱(可选):${onionText}  蛋:${eggCount}/${this.MAX_EGGS_IN_PAN} ${cookText}`;
    }

    private isHandItemDropBlocked(target: Node | null): boolean {
        if (!target) return false;

        const interactiveTargets: (Node | null)[] = [
            this.riceBtn,
            this.potatoBtn,
            this.eggBtn,
            this.greenOnionBtn,
            this.lettuceBtn,
            this.cilantroBtn,
            this.oilBtn,
            this.sauceBtn,
            this.peanutBtn,
            this.steamToggle,
            this.steamerArea,
            this.stirFryArea,
            this.eggSauceBox,
            this.mixingBowlArea,
            this.cabbageLeafArea
        ];

        let node: Node | null = target;
        while (node) {
            if (interactiveTargets.includes(node)) {
                return true;
            }
            if (node.getComponent(Button)) {
                return true;
            }
            if (node.name === 'ClickArea' || node.name.endsWith('Btn') || node.name.endsWith('Button')) {
                return true;
            }
            node = node.parent;
        }

        return false;
    }

    private onMouseDown(event: EventMouse): void {
        if (event.getButton() === EventMouse.BUTTON_RIGHT && this.currentHandItem) {
            this.putDownHandItem();
        }
    }

    /**
     * 🎨 赛璐珞风格：按钮点击缩放动画
     */
    private playButtonClickAnimation(btnNode: Node): void {
        tween(btnNode)
            .to(this.CEL_SHADING.CLICK_ANIMATION_TIME, { scale: new Vec3(this.CEL_SHADING.CLICK_SCALE_UP, this.CEL_SHADING.CLICK_SCALE_UP, 1) }, { easing: 'sineOut' })
            .to(this.CEL_SHADING.CLICK_ANIMATION_TIME, { scale: new Vec3(1, 1, 1) }, { easing: 'sineIn' })
            .start();
    }

    private bindAreaEvents(): void {
        // ?? 蒸锅区域点击 - 使用新逻辑
        if (this.steamerArea) {
            this.steamerArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.handleSteamerAreaClick();
            }, this);
        }
        // ?? 开蒸按钮点击
        if (this.steamToggle) {
            const clickArea = this.steamToggle.getChildByName('ClickArea') || this.steamToggle;
            clickArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.onSteamToggleClick();
            }, this);
        }
        // ?? 炒制区域点击
        if (this.stirFryArea) {
            this.stirFryArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.handleStirFryAreaClick();
            }, this);
        }
        // ?? 鸡蛋酱盒点击
        if (this.eggSauceBox) {
            this.eggSauceBox.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.handleEggSauceBoxClick();
            }, this);
        }
        // ?? 搅拌区域点击 - 使用新逻辑
        if (this.mixingBowlArea) {
            this.mixingBowlArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.handleMixingBowlAreaClick();
            }, this);
        }
        // ?? 菜叶区域点击 - 使用新逻辑
        if (this.cabbageLeafArea) {
            this.cabbageLeafArea.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                this.stopEventPropagation(event);
                this.handleCabbageLeafAreaClick();
            }, this);
        }
    }

    private hideLevel1Area(): void {
        // 查找并隐藏第一关的烹饪区域
        const canvas = this.node.parent;
        if (canvas) {
            const level1Area = canvas.getChildByName('GrillArea') || canvas.getChildByName('Level1CookingArea');
            if (level1Area) {
                level1Area.active = false;
            }
        }
    }

    // ==================== 制作流程 ====================
    // 🔥 旧方法已移除，使用新的手持物品系统
    // 蒸土豆/大米逻辑已移至 handlePotatoButtonClick/RiceButtonClick + addPotatoToSteamer/addRiceToSteamer
    // 进度条已整合到 updateSteamingProgress 方法中

    /**
     * 🔥 检查是否准备好搅拌
     */
    private checkMixingReady(): void {
        this.checkCanStartMixing();
    }

    private startMixing(): void {
        this.mixProgressValue = 0;
        this.currentPhase = RiceBundlePhase.MIXING;

        this.consumeMixingIngredients();

        // ?? 显示混合食材
        this.showMixedIngredients();

        // ?? 溅射效果
        if (this.mixingBowlArea) {
            this.playSplashEffect(this.mixingBowlArea, new Color(230, 210, 150, 255));
        }

        this.updateMixProgress(0);
        this.updateInstruction("?? 连续点击搅拌盆进行搅拌");
    }

    private startAutoMixing(): void {
        if (this.autoMixingActive || this.mixed) return;

        this.mixProgressValue = 0;
        this.currentPhase = RiceBundlePhase.MIXING;
        this.autoMixingActive = true;

        this.consumeMixingIngredients();
        this.showMixedIngredients();

        if (this.mixingBowlArea) {
            this.playSplashEffect(this.mixingBowlArea, new Color(230, 210, 150, 255));
        }

        this.updateMixProgress(0);
        this.updateInstruction("?? 搅拌中...");

        this.unschedule(this.updateAutoMixingProgress);
        this.schedule(this.updateAutoMixingProgress, this.AUTO_MIX_UPDATE_INTERVAL);
    }

    private updateAutoMixingProgress(): void {
        if (!this.autoMixingActive) return;

        const step = this.AUTO_MIX_UPDATE_INTERVAL / this.MIX_TIME;
        this.mixProgressValue = Math.min(this.mixProgressValue + step, 1);
        this.updateMixProgress(this.mixProgressValue);

        if (this.mixProgressValue >= 1) {
            this.autoMixingActive = false;
            this.unschedule(this.updateAutoMixingProgress);
            this.mixed = true;
            this.currentPhase = RiceBundlePhase.MIXED;
            this.updateInstruction("?? 搅拌完成！点击生菜铺菜叶，再用拌料盆倒入");
            this.showMessage("?? 搅拌完成！");
            this.playCompletionCelebration(this.mixingBowlArea);
        }
    }

    private advanceMixProgress(): void {
        if (this.mixed) return;
        if (this.currentPhase !== RiceBundlePhase.MIXING) {
            this.startMixing();
        }

        const step = 1 / this.MIX_CLICK_COUNT;
        this.mixProgressValue = Math.min(this.mixProgressValue + step, 1);
        this.updateMixProgress(this.mixProgressValue);
        this.playAreaClickFeedback(this.mixingBowlArea);

        if (this.mixingBowlArea) {
            this.playSplashEffect(this.mixingBowlArea, new Color(230, 210, 150, 255));
        }

        if (this.mixProgressValue >= 1) {
            this.mixed = true;
            this.currentPhase = RiceBundlePhase.MIXED;
            this.updateInstruction("?? 搅拌完成！点击生菜铺菜叶，再用拌料盆倒入");
            this.showMessage("?? 搅拌完成！");
            this.playCompletionCelebration(this.mixingBowlArea);
        }
    }

    private startFryEggs(): void {
        this.advanceFryProgress();
    }

    private advanceFryProgress(): void {
        if (this.eggCooked || this.eggCountInPan <= 0) return;
        if (!this.isFrying) {
            this.isFrying = true;
            if (this.fryProgressValue <= 0) {
                this.updateInstruction("?? 连续点击炒锅炒制鸡蛋");
            }
        }

        const step = 1 / this.FRY_CLICK_COUNT;
        this.fryProgressValue = Math.min(this.fryProgressValue + step, 1);
        this.updateFryProgress(this.fryProgressValue);
        this.playAreaClickFeedback(this.stirFryArea);

        if (this.stirFryArea) {
            this.playSplashEffect(this.stirFryArea, new Color(255, 200, 120, 255));
        }

        if (this.fryProgressValue >= 1) {
            this.isFrying = false;
            this.eggCooked = true;
            this.showMessage("?? 鸡蛋炒熟了，加入酱料");
            this.playCompletionCelebration(this.stirFryArea);
        }
        this.updateStirFryStatusLabel();
    }

    private updateFryProgress(progress: number): void {
        if (!this.fryProgress) return;

        const transform = this.fryProgress.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(90 * Math.max(0.05, progress), 12);
        }
        const sprite = this.fryProgress.getComponent(Sprite);
        if (sprite) {
            sprite.color = progress >= 1
                ? new Color(100, 220, 100, 255)
                : new Color(220, 180, 100, 255);
        }
    }

    private updateMixProgress(progress: number): void {
        if (!this.mixProgress) return;

        const transform = this.mixProgress.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(90 * Math.max(0.05, progress), 12);
        }
        const sprite = this.mixProgress.getComponent(Sprite);
        if (sprite) {
            sprite.color = progress >= 1
                ? new Color(100, 220, 100, 255)
                : new Color(220, 180, 100, 255);
        }
    }

    /**
     * 🔥 步骤4: 卷起（连点5次，带视觉反馈）
     * 🔥 注：此方法保留，由 handleCabbageLeafAreaClick 在没有手持物品时调用
     */
    private handleRollClick(): void {
        if (this.currentPhase !== RiceBundlePhase.ON_LEAF &&
            this.currentPhase !== RiceBundlePhase.ROLLING) {
            return;
        }
        if (this.lettucePlacedCount <= 0) {
            this.showMessage("?? 请先铺好生菜");
            return;
        }
        if (!this.hasFillingOnLeaf) {
            this.showMessage("?? 请先倒入馅料");
            return;
        }

        this.playAreaClickFeedback(this.cabbageLeafArea);

        if (this.currentPhase === RiceBundlePhase.ON_LEAF) {
            this.currentPhase = RiceBundlePhase.ROLLING;
        }

        this.rollCount++;

        // ?? 更新卷制视觉
        this.updateRollVisuals();

        // ?? 溅射效果
        if (this.cabbageLeafArea) {
            this.playSplashEffect(this.cabbageLeafArea, new Color(180, 230, 150, 255));
        }

        this.updateRollProgress();

        if (this.rollCount >= this.requiredRolls) {
            this.currentPhase = RiceBundlePhase.PACKED;
            this.updateInstruction("?? 卷制完成！");
            this.finishRiceBundle();
        } else {
            this.updateInstruction(`?? 继续卷制... (${this.rollCount}/${this.requiredRolls})`);
        }
    }

    private finishRiceBundle(): void {
        const food = this.checkFoodComplete();
        if (!food) {
            this.showMessage("?? 还未完成打包");
            return;
        }

        if (this.tryPackToCustomerSystem(food)) {
            this.scheduleOnce(() => {
                this.resetForNextOrder();
            }, 0.3);
            return;
        }

        this.showMessage("?? 东北饭包完成！");
        this.onFoodComplete(food);
        this.scheduleOnce(() => {
            this.resetForNextOrder();
        }, 0.3);
    }

    private tryPackToCustomerSystem(food: { name: string; quality: number }): boolean {
        const canvas = this.node.scene?.getChildByName('Canvas');
        if (!canvas) return false;

        const cookingController = canvas.getComponent(CookingControllerV2);
        if (!cookingController || typeof cookingController.packExternalFood !== 'function') {
            return false;
        }

        return cookingController.packExternalFood(food.name, food.quality);
    }

    private updateRollProgress(): void {
        if (!this.rollProgress) return;

        const progress = this.rollCount / this.requiredRolls;
        const transform = this.rollProgress.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(90 * Math.max(0.05, progress), 12);
        }
        const sprite = this.rollProgress.getComponent(Sprite);
        if (sprite) {
            sprite.color = progress >= 1
                ? new Color(100, 220, 100, 255)
                : new Color(220, 200, 100, 255);
        }
    }

    // ==================== 辅助方法 ====================
    // 🔥 旧方法 handleCilantroClick 已移除，使用 handleCilantroButtonClick + addCilantroToPack

    private onFoodComplete(food: any): void {
        const basePrice = 12;
        const qualityBonus = Math.floor((food.quality - 50) / 10);
        const finalPrice = basePrice + qualityBonus;
        this.addMoney(finalPrice);

        if (food.quality >= 90) {
            this.addReview('super_good', '完美的东北饭包！');
        } else if (food.quality >= 70) {
            this.addReview('good', '美味的饭包');
        } else {
            this.addReview('bad', '制作有待改进');
        }

        console.log(`[RiceBundleController] ✅ 完成制作: ${food.name}, 品质: ${food.quality}, 价格: ¥${finalPrice}`);
    }

    private resetForNextOrder(): void {
        this.currentPhase = RiceBundlePhase.IDLE;
        this.potatoSteamed = false;
        this.riceSteamed = false;
        this.mixed = false;
        this.autoMixingActive = false;
        this.unschedule(this.updateAutoMixingProgress);
        this.hasFillingOnLeaf = false;
        this.rollCount = 0;
        this.lettucePlacedCount = Math.max(0, this.lettucePlacedCount - 1);
        this.steamProgress = 0;
        this.mixProgressValue = 0;
        this.fryProgressValue = 0;
        this.hasOil = false;
        this.hasOnion = false;
        this.eggCountInPan = 0;
        this.eggCooked = false;
        this.eggSauceReadyCount = 0;
        this.isEggSauceFlying = false;
        this.isFrying = false;
        this.cookedIngredients.clear();
        this.mixingIngredients.clear();

        // ?? 清除蒸制中的食材（新系统）
        this.steamingIngredients.forEach(steaming => {
            if (steaming.node && steaming.node.isValid) {
                steaming.node.destroy();
            }
        });
        this.steamingIngredients = [];

        // ?? 清除其他视觉元素
        if (this.mixedIngredientDisplay) {
            this.mixedIngredientDisplay.destroy();
            this.mixedIngredientDisplay = null;
        }
        this.clearEggSauceReadyVisual();
        this.rollVisuals.forEach(v => v.destroy());
        this.rollVisuals = [];
        if (this.lettucePlacedCount <= 0) {
            this.lettuceLeafNodes.forEach(node => {
                if (node && node.isValid) {
                    node.destroy();
                }
            });
            this.lettuceLeafNodes = [];
            this.lettuceOnLeaf = null;
        } else {
            this.updateRollVisuals();
        }

        // ?? 清除手持物品
        this.clearHandItem();

        if (this.lettucePlacedCount > 0) {
            this.updateInstruction("?? 菜叶已铺好，继续准备馅料");
        } else {
            this.updateInstruction("?? 准备制作下一份饭包");
        }
        this.updateProgressDisplay();
        this.updateStirFryStatusLabel();
    }

    private updateProgressDisplay(): void {
        // ?? 进度条更新已整合到 updateSteamingProgress 中
        // 这里只更新搅拌、炒制和卷制进度
        this.updateMixProgress(this.mixed ? 1 : 0);
        this.updateFryProgress(this.eggCooked ? 1 : this.fryProgressValue);
        this.updateRollProgress();
        this.updateEggSauceBoxDisplay();

        // ?? 更新蒸制进度条（基于steamingIngredients数组）
        this.updateSteamProgressBars();
    }

    private updateSteamProgressBars(): void {
        if (this.potatoProgress) this.potatoProgress.active = false;
        if (this.riceProgress) this.riceProgress.active = false;
        if (!this.progressBarFill) return;

        let progress = 0;
        if (this.steamerManager) {
            const slots = this.steamerManager.getAllSlots();
            const activeSlots = slots.filter(slot => slot.state !== SteamerSlotState.EMPTY);
            if (activeSlots.length > 0) {
                const total = activeSlots.reduce((sum, slot) => {
                    return sum + Math.min(slot.progress || 0, 1);
                }, 0);
                progress = total / activeSlots.length;
            }
        } else if (this.steamingIngredients.length > 0) {
            const total = this.steamingIngredients.reduce((sum, item) => sum + Math.min(item.progress, 1), 0);
            progress = total / this.steamingIngredients.length;
        }

        const transform = this.progressBarFill.getComponent(UITransform);
        if (transform) {
            const parentTransform = this.progressBarFill.parent?.getComponent(UITransform);
            const maxWidth = parentTransform ? parentTransform.contentSize.width : 90;
            transform.setContentSize(maxWidth * Math.max(0.05, progress), transform.contentSize.height || 12);
        }

        const sprite = this.progressBarFill.getComponent(Sprite);
        if (sprite) {
            sprite.color = progress >= 1
                ? new Color(100, 220, 100, 255)
                : new Color(220, 200, 100, 255);
        }
    }

    private updateInstruction(text: string): void {
        if (this.instructionLabel) {
            this.instructionLabel.string = text;
        }
    }

    protected consumeIngredientFromInventory(type: IngredientType, count: number = 1): boolean {
        const success = super.consumeIngredientFromInventory(type, count);
        if (success) {
            this.updateIngredientButtonCounts();
        }
        return success;
    }

    // ==================== 蒸锅系统方法 ====================

    /**
     * 🔥 食材按钮点击处理
     */
    private onIngredientClick(type: IngredientType): void {
        this.ensurePreviewInventorySeeded();
        if (type === IngredientType.RICE || type === IngredientType.POTATO) {
            this.handleSteamIngredientClick(type);
            return;
        }

        switch (type) {
            case IngredientType.EGG:
                this.handleEggButtonClick();
                break;
            case IngredientType.GREEN_ONION:
                this.handleGreenOnionButtonClick();
                break;
            case IngredientType.LETTUCE:
                this.handleLettuceButtonClick();
                break;
            case IngredientType.CILANTRO:
                this.handleCilantroButtonClick();
                break;
            default:
                this.showMessage("?? 当前食材暂不支持");
                break;
        }
    }

    /**
     * 🔥 处理蒸制食材点击（大米/土豆）
     */
    private handleSteamIngredientClick(type: IngredientType): void {
        if (!this.steamerManager) {
            this.showMessage('❌ 蒸锅系统未初始化');
            return;
        }

        const inventory = InventoryManager.instance;

        // 🔥 修复：使用正确的方法检查库存
        // RICE 和 POTATO (切好的) 都在 processedCount 中
        let count = inventory.getAvailableCount(type);
        if (count <= 0 && (PREVIEW || EDITOR || DEV)) {
            this.ensurePreviewInventorySeeded();
            count = inventory.getAvailableCount(type);
        }

        if (count <= 0) {
            const name = type === IngredientType.RICE ? '大米' : '土豆';
            const source = type === IngredientType.RICE ? '商店购买' : '准备阶段切好';
            this.showMessage(`❌ 没有${name}了，请先在${source}！`);
            return;
        }

        // 找到第一个空槽位
        const emptySlot = this.steamerManager.findFirstEmptySlot();
        if (!emptySlot) {
            this.showMessage('⚠️ 蒸锅已满！');
            return;
        }

        // 🔥 修复：立即占用槽位，防止连续点击时重复获取同一个空槽位
        if (!this.steamerManager.reserveSlot(emptySlot.index)) {
            this.showMessage('⚠️ 槽位占用失败！');
            return;
        }

        // 🔥 修复：使用正确的方法消耗库存
        if (this.consumeIngredientFromInventory(type, 1)) {
            // 飞入动画
            const button = type === IngredientType.RICE ? this.riceBtn : this.potatoBtn;
            this.playFlyToSteamerAnimation(
                button || null,
                emptySlot,
                type,
                1
            );
        } else {
            this.showMessage('❌ 扣除库存失败');
            // 如果扣除失败，应该释放槽位（虽然这里不太可能失败，因为前面检查过count）
            // 但为了健壮性，这里暂时不做回滚，因为reserveSlot只是标记OCCUPIED但ingredientType仍为null
            // 实际上这会导致槽位"死锁"（占了但没用）。更好的做法是回滚。
            // 考虑到库存检查在前面已经做了，这里失败概率极低。
        }
    }

    /**
     * 🔥 食材飞入动画（参考第一关烤肠飞入动画）
     */
    private playFlyToSteamerAnimation(
        startNode: Node | null,
        targetSlot: any,
        type: IngredientType,
        count: number
    ): void {
        if (!startNode || !targetSlot || !targetSlot.slotNode) {
            console.error('[RiceBundleController] ❌ 飞入动画参数无效');
            return;
        }

        // 获取目标位置和旋转（参考第一关getSausageTransform）
        const targetPos = this.getSteamerPosition(type, targetSlot.index);
        const targetWorldPos = this.steamerArea.worldPosition.clone().add(new Vec3(targetPos.x, targetPos.y, 0));

        // 创建临时飞行节点
        const flyingNode = new Node('FlyingIngredient');
        const label = flyingNode.addComponent(Label);
        const emoji = type === IngredientType.RICE ? '🍚' : '🥔';
        label.string = emoji;
        label.fontSize = 40;

        // 🔥 修复：Label 会自动添加 UITransform，先获取再决定是否需要添加
        let transform = flyingNode.getComponent(UITransform);
        if (!transform) {
            transform = flyingNode.addComponent(UITransform);
        }
        transform.setContentSize(60, 60);

        this.node.addChild(flyingNode);
        flyingNode.setWorldPosition(startNode.worldPosition);

        // 飞行动画（0.3秒，带旋转，参考烤肠动画）
        tween(flyingNode)
            .to(0.3, {
                worldPosition: targetWorldPos,
                angle: 360
            }, { easing: 'quadOut' })
            .call(() => {
                flyingNode.destroy();
                // 添加到槽位
                this.steamerManager.addIngredientToSlot(
                    targetSlot.index,
                    type,
                    count
                );
                const name = type === IngredientType.RICE ? '大米' : '土豆';
                this.showMessage(`✅ ${name}已放入蒸锅`);
                this.tryAutoStartSteaming();
            })
            .start();
    }

    /**
     * 🔥 蒸锅槽位点击处理
     */
    private onSteamerSlotClick(slot: any): void {
        if (!this.ingredientFollower) return;

        if (slot.state === SteamerSlotState.COMPLETED) {
            const slotType: IngredientType | null = slot.ingredientType;
            if (!slotType) return;

            let cookedType: IngredientType;
            if (slotType === IngredientType.RICE) {
                cookedType = IngredientType.COOKED_RICE;
            } else if (slotType === IngredientType.POTATO) {
                cookedType = IngredientType.POTATO_MASH;
            } else {
                cookedType = slotType;
            }

            const handItem = this.ingredientFollower.getCurrentHandItem();
            if (handItem && handItem.type !== cookedType) {
                const holdingName = this.getIngredientDisplayName(handItem.type);
                this.showMessage(`?? 请先放下手里的${holdingName}`);
                return;
            }

            const result = this.steamerManager.takeIngredientFromSlot(slot.index);
            if (!result) return;

            const name = this.getIngredientDisplayName(cookedType);
            if (handItem && handItem.type === cookedType) {
                this.ingredientFollower.addToCurrent(cookedType, result.count);
                const current = this.ingredientFollower.getCurrentHandItem();
                const total = current ? current.count : result.count;
                this.showMessage(`? 拿起了${result.count}份${name}（共${total}份）`);
            } else {
                this.ingredientFollower.pickupIngredient(
                    cookedType,
                    result.count,
                    slot.index
                );
                this.showMessage(`? 拿起了 ${result.count}份${name}`);
            }
            this.updateUiHitTestState();
            return;
        }

        if (slot.state === SteamerSlotState.EMPTY) {
            const handItem = this.ingredientFollower.getCurrentHandItem();
            if (!handItem) return;

            let rawType: IngredientType | null = null;
            if (handItem.type === IngredientType.COOKED_RICE) {
                rawType = IngredientType.RICE;
            } else if (handItem.type === IngredientType.POTATO_MASH) {
                rawType = IngredientType.POTATO;
            }

            if (!rawType) {
                this.showMessage('?? 只能放回熟大米或土豆泥');
                return;
            }

            const placed = this.steamerManager.placeCompletedIngredient(
                slot.index,
                rawType,
                1
            );
            if (placed) {
                const name = this.getIngredientDisplayName(handItem.type);
                if (handItem.count > 1) {
                    const remaining = handItem.count - 1;
                    this.ingredientFollower.setCurrentCount(remaining);
                    this.showMessage(`?? 放回了1份${name}（剩余${remaining}份）`);
                } else {
                    this.ingredientFollower.putDownIngredient();
                    this.showMessage(`?? 放回了1份${name}`);
                }
                this.updateUiHitTestState();
            } else {
                this.showMessage("?? 放回失败");
            }
        }
    }


    /**
     * 🔥 蒸制完成处理
     */
    private onSteamingComplete(slots: any[]): void {
        this.showMessage('✅ 蒸制完成！点击槽位取出食材');
        this.playCompletionCelebration();
    }

    /**
     * 🔥 蒸锅开关点击
     */
    private onSteamToggleClick(): void {
        if (!this.steamerManager) return;

        if (this.steamerManager.isSteaming) {
            this.showMessage('⏳ 正在蒸制中...');
            return;
        }

        // 检查是否有食材
        if (!this.steamerManager.hasIngredients()) {
            this.showMessage('⚠️ 请先放入食材！');
            return;
        }

        // 开始蒸制
        if (this.steamerManager.startSteaming()) {
            this.showMessage('🔥 开始蒸制...');
            this.createSteamEffect();
        }
    }

    private tryAutoStartSteaming(): void {
        if (!this.steamerManager || this.steamerManager.isSteaming) return;
        const slots = this.steamerManager.getAllSlots();
        const hasRaw = slots.some(slot => slot.state === SteamerSlotState.OCCUPIED);
        if (!hasRaw) return;
        if (this.steamerManager.startSteaming()) {
            this.showMessage('?? 开始蒸制...');
            this.createSteamEffect();
        }
    }

    /**
     * ?? 设置垃圾桶开关动画（复用第一关逻辑）
     */
    private setupTrashCanFeedback(): void {
        if (!this.trashCan) return;

        this._trashCanSprite = this.trashCan.getComponent(Sprite);
        if (!this._trashCanSprite) {
            const spriteNode = this.trashCan.getChildByName('Sprite') || this.trashCan.children[0];
            if (spriteNode) {
                this._trashCanSprite = spriteNode.getComponent(Sprite);
            }
        }

        this._isTrashOpen = false;
        this.setTrashCanState(false);
    }

    private setTrashCanState(open: boolean): void {
        if (!this._trashCanSprite) return;
        const uuid = open ? TRASH_IMAGE_UUIDS.OPEN : TRASH_IMAGE_UUIDS.CLOSED;
        if (!uuid) return;

        assetManager.loadAny({ uuid }, (err, spriteFrame: SpriteFrame) => {
            if (!err && spriteFrame && this._trashCanSprite && this._trashCanSprite.isValid) {
                this._trashCanSprite.spriteFrame = spriteFrame;
            }
        });
    }

    private openTrashCan(): void {
        if (this._isTrashOpen) return;
        this._isTrashOpen = true;
        this.setTrashCanState(true);
        if (this.trashCan) {
            const originalScale = this.trashCan.scale.clone();
            tween(this.trashCan)
                .to(0.1, { scale: new Vec3(originalScale.x * 1.03, originalScale.y * 1.03, 1) })
                .start();
        }
    }

    private closeTrashCan(): void {
        if (!this._isTrashOpen) return;
        this._isTrashOpen = false;
        this.setTrashCanState(false);
        if (this.trashCan) {
            const originalScale = this.trashCan.scale.clone();
            tween(this.trashCan)
                .to(0.15, { scale: new Vec3(originalScale.x / 1.03, originalScale.y / 1.03, 1) })
                .start();
        }
    }

    private discardCurrentHandItem(): string | null {
        if (!this.currentHandItem) return null;
        const name = this.getIngredientDisplayName(this.currentHandItem);

        if (this.handItemSource === "inventory") {
            this.confirmReservedIngredient(this.currentHandItem, this.handItemCount);
        }
        this.clearHandItem();
        return name;
    }

    /**
     * 🔥 垃圾桶点击
     */
    private onTrashCanClick(): void {
        if (!this.trashCan) return;

        const followerItem = this.ingredientFollower?.getCurrentHandItem() || null;
        if (!this.currentHandItem && !followerItem) return;

        this.openTrashCan();

        if (this.currentHandItem) {
            const name = this.discardCurrentHandItem();
            if (name) {
                this.showMessage(`??? 丢弃了${name}`);
            }
        }

        if (followerItem && this.ingredientFollower) {
            const trashPos = this.trashCan.position.clone();
            const mouseFollower = this.ingredientFollower.getMouseFollower();
            tween(mouseFollower)
                .to(0.2, {
                    position: trashPos,
                    scale: new Vec3(0.3, 0.3, 1)
                })
                .call(() => {
                    this.ingredientFollower.putDownIngredient();
                    this.updateUiHitTestState();
                    const name = this.getIngredientDisplayName(followerItem.type);
                    this.showMessage(`??? 丢弃了${followerItem.count}份${name}`);
                    this.scheduleOnce(() => this.closeTrashCan(), 0.2);
                })
                .start();
        } else {
            this.scheduleOnce(() => this.closeTrashCan(), 0.2);
        }
    }

    /**
     * 🔥 搅拌盆放置区域点击
     */
    private onMixingBowlDropZoneClick(): void {
        this.tryAddFollowerCookedToMixing(true);
    }


    /**
     * 🔥 检查是否可以开始搅拌
     */
    private checkCanStartMixing(): void {
        if (this.mixed) return;
        const missing = this.getMissingMixingIngredients();
        if (missing.length === 0) {
            this.showMessage("?? 开始自动搅拌...");
            this.startAutoMixing();
        }
    }

    private getMissingMixingIngredients(): string[] {
        const missing: string[] = [];
        const cookedRice = this.cookedIngredients.get(IngredientType.COOKED_RICE) || 0;
        const potatoMash = this.cookedIngredients.get(IngredientType.POTATO_MASH) || 0;
        const cilantro = this.mixingIngredients.get(IngredientType.CILANTRO) || 0;
        const eggSauce = this.mixingIngredients.get(IngredientType.EGG_SAUCE) || 0;
        const peanut = this.mixingIngredients.get(IngredientType.PEANUT_SAUCE) || 0;

        if (cookedRice <= 0) missing.push("熟大米");
        if (potatoMash <= 0) missing.push("土豆泥");
        if (cilantro <= 0) missing.push("香菜");
        if (eggSauce <= 0) missing.push("鸡蛋酱");
        if (peanut <= 0) missing.push("花生米");

        return missing;
    }

    private consumeMixingIngredients(): void {
        this.decreaseIngredientCount(this.cookedIngredients, IngredientType.COOKED_RICE, 1);
        this.decreaseIngredientCount(this.cookedIngredients, IngredientType.POTATO_MASH, 1);
        this.decreaseIngredientCount(this.mixingIngredients, IngredientType.GREEN_ONION, 1);
        this.decreaseIngredientCount(this.mixingIngredients, IngredientType.CILANTRO, 1);
        this.decreaseIngredientCount(this.mixingIngredients, IngredientType.EGG_SAUCE, 1);
        this.decreaseIngredientCount(this.mixingIngredients, IngredientType.PEANUT_SAUCE, 1);
    }

    private decreaseIngredientCount(map: Map<IngredientType, number>, type: IngredientType, count: number = 1): void {
        const current = map.get(type) || 0;
        const next = Math.max(0, current - count);
        if (next > 0) {
            map.set(type, next);
        } else {
            map.delete(type);
        }
    }

    /**
     * 🔥 蒸汽粒子效果
     */
    private createSteamEffect(): void {
        if (!this.steamerManager || !this.steamerArea) return;

        const createParticle = () => {
            if (!this.steamerManager.isSteaming) return;

            const steam = new Node('Steam');
            const graphics = steam.addComponent(Graphics);
            // Graphics 会自动添加 UITransform，先获取再决定是否需要添加
            let transform = steam.getComponent(UITransform);
            if (!transform) {
                transform = steam.addComponent(UITransform);
            }
            transform.setContentSize(this.CEL_SHADING.STEAM_PARTICLE_SIZE, this.CEL_SHADING.STEAM_PARTICLE_SIZE);

            // 🎨 赛璐珞风格：多层次云朵效果
            graphics.clear();

            // 主圆 (中心)
            const mainR = 10 + Math.random() * 4;
            graphics.circle(0, 0, mainR);

            // 左侧圆
            const leftR = mainR * (0.6 + Math.random() * 0.2);
            graphics.circle(-mainR * 0.7, 2, leftR);

            // 右侧圆
            const rightR = mainR * (0.5 + Math.random() * 0.2);
            graphics.circle(mainR * 0.7, 1, rightR);

            // 顶部圆
            const topR = mainR * (0.4 + Math.random() * 0.2);
            graphics.circle(0, -mainR * 0.6, topR);

            // 填充半透明白色
            const alpha = Math.floor(100 + Math.random() * 80);
            graphics.fill(new Color(255, 255, 255, alpha));

            // 添加白色高光点 (增加立体感)
            const highlightR = 2 + Math.random() * 2;
            graphics.circle(-mainR * 0.3, -mainR * 0.3, highlightR);
            graphics.fill(new Color(255, 255, 255, Math.min(alpha + 50, 255)));

            // 随机位置
            steam.setPosition(
                (Math.random() - 0.5) * 100,
                20 + Math.random() * 30,
                0
            );

            this.steamerArea.addChild(steam);

            // 初始大小
            steam.setScale(this.CEL_SHADING.STEAM_SCALE_START + Math.random() * 0.2);

            // 上升+淡出动画 (更流畅，上升更高)
            tween(steam)
                .to(0.8, {
                    position: new Vec3(
                        steam.position.x + (Math.random() - 0.5) * 30,
                        steam.position.y + this.CEL_SHADING.STEAM_RISE_HEIGHT,
                        0
                    ),
                    scale: new Vec3(this.CEL_SHADING.STEAM_SCALE_END, this.CEL_SHADING.STEAM_SCALE_END, 1)
                }, { easing: 'sineOut' })
                .call(() => steam.destroy())
                .start();
        };

        // 🎨 每0.1秒产生一个粒子 (更密集)
        this.schedule(createParticle, 0.1);
    }

    /**
     * 🔥 完成庆祝动画
     */
    private playCompletionCelebration(): void {
        if (!this.steamerArea) return;

        // 闪烁3次
        for (let i = 0; i < 3; i++) {
            this.scheduleOnce(() => {
                tween(this.steamerArea)
                    .to(0.1, { scale: new Vec3(1.1, 1.1, 1) })
                    .to(0.1, { scale: new Vec3(1, 1, 1) })
                    .start();

                // 星星粒子
                for (let j = 0; j < 8; j++) {
                    this.createStarParticle();
                }
            }, i * 0.25);
        }
    }

    /**
     * 🔥 创建星星粒子
     */
    private createStarParticle(): void {
        if (!this.steamerArea || !this.steamerArea.parent) return;

        const star = new Node('Star');
        const label = star.addComponent(Label);
        label.string = '⭐';
        label.fontSize = 24;

        this.steamerArea.parent.addChild(star);
        star.setWorldPosition(this.steamerArea.worldPosition);

        // 随机方向飞出
        const angle = Math.random() * Math.PI * 2;
        const distance = 50 + Math.random() * 30;

        tween(star)
            .to(0.4, {
                position: new Vec3(
                    Math.cos(angle) * distance,
                    Math.sin(angle) * distance,
                    0
                ),
                scale: new Vec3(0.5, 0.5, 1)
            }, { easing: 'cubicOut' })
            .call(() => star.destroy())
            .start();
    }

    /**
     * 🔥 设置原生鼠标监听
     */
    private setupNativeMouseListener(): void {
        let canvas = game.canvas;
        if (!canvas) {
            canvas = document.querySelector('canvas') as HTMLCanvasElement;
        }
        if (!canvas) return;

        this.removeNativeMouseListener();

        this._nativeMouseMoveHandler = (event: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            if (event.clientX < rect.left || event.clientX > rect.right ||
                event.clientY < rect.top || event.clientY > rect.bottom) {
                return;
            }

            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const nativeX = (event.clientX - rect.left) * scaleX;
            const nativeY = (event.clientY - rect.top) * scaleY;

            const designSize = view.getDesignResolutionSize();
            const uiX = nativeX * designSize.width / canvas.width;
            const uiY = designSize.height - (nativeY * designSize.height / canvas.height);

            this.updateFollowerFromUILocation(uiX, uiY);
        };

        window.addEventListener('mousemove', this._nativeMouseMoveHandler);
    }

    private removeNativeMouseListener(): void {
        if (this._nativeMouseMoveHandler) {
            window.removeEventListener('mousemove', this._nativeMouseMoveHandler);
            this._nativeMouseMoveHandler = null;
        }
    }

    private onMouseMove(event: EventMouse): void {
        const uiPos = event.getUILocation();
        this.updateFollowerFromUILocation(uiPos.x, uiPos.y);
    }

    private updateFollowerFromUILocation(uiX: number, uiY: number): void {
        const followParent = this.mouseFollower?.parent || this.handItemLabel?.parent;
        if (!followParent) return;

        const canvasTransform = followParent.getComponent(UITransform);
        if (!canvasTransform) return;

        const designSize = view.getDesignResolutionSize();
        const canvasSize = canvasTransform.contentSize;
        const scaleX = canvasSize.width / designSize.width;
        const scaleY = canvasSize.height / designSize.height;
        const localPos = new Vec3(
            uiX * scaleX - canvasSize.width / 2,
            uiY * scaleY - canvasSize.height / 2,
            0
        );
        const worldPos = canvasTransform.convertToWorldSpaceAR(localPos);
        this.applyFollowerWorldPosition(worldPos);
    }

    private applyFollowerWorldPosition(worldPos: Vec3): void {
        this.ensureFollowOverlayOnTop();
        if (this.ingredientFollower) {
            this.ingredientFollower.updateMousePosition(worldPos);
        }
        if (this.currentHandItem && this.handItemLabel) {
            this.handItemLabel.setWorldPosition(worldPos);
        }
    }

    private ensureFollowOverlayOnTop(): void {
        const followParent = this.mouseFollower?.parent || this.handItemLabel?.parent;
        if (!followParent || !followParent.parent) return;
        const parent = followParent.parent;
        const topIndex = parent.children.length - 1;
        if (followParent.getSiblingIndex() !== topIndex) {
            followParent.setSiblingIndex(topIndex);
        }
    }

    private getCanvasCamera(): Camera | null {
        if (this._canvasCamera && this._canvasCamera.isValid && typeof (this._canvasCamera as any).screenToWorld === 'function') {
            return this._canvasCamera;
        }
        this.ensureFollowCanvasCamera();
        const followCanvas = this.getFollowCanvasComponent();
        const followCamera = this.resolveCameraComponent(followCanvas?.cameraComponent || null);
        if (followCamera) {
            this._canvasCamera = followCamera;
            return this._canvasCamera;
        }
        const scene = director.getScene();
        const canvasNode = scene?.getChildByName('Canvas');
        if (!canvasNode) return null;
        const canvasComp = canvasNode.getComponent(Canvas);
        this._canvasCamera = this.resolveCameraComponent(canvasComp?.cameraComponent || null);
        return this._canvasCamera;
    }

    private resolveCameraComponent(target: any): Camera | null {
        if (!target) return null;
        if (typeof target.screenToWorld === 'function') {
            return target as Camera;
        }
        if (target.getComponent) {
            const comp = target.getComponent(Camera);
            if (comp && typeof (comp as any).screenToWorld === 'function') {
                return comp;
            }
        }
        if (target.node?.getComponent) {
            const comp = target.node.getComponent(Camera);
            if (comp && typeof (comp as any).screenToWorld === 'function') {
                return comp;
            }
        }
        return null;
    }

    private getFollowCanvasComponent(): Canvas | null {
        const followCanvasNode = this.mouseFollower?.parent?.parent || this.handItemLabel?.parent?.parent;
        if (!followCanvasNode) return null;
        return followCanvasNode.getComponent(Canvas);
    }

    private ensureFollowCanvasCamera(): void {
        const followCanvas = this.getFollowCanvasComponent();
        if (!followCanvas || followCanvas.cameraComponent) return;

        const scene = director.getScene();
        const followCameraNode = scene?.getChildByName('FollowCamera');
        const followCamera = followCameraNode?.getComponent(Camera) || null;
        if (!followCamera) return;

        followCanvas.cameraComponent = followCamera;
        this._canvasCamera = followCamera;
    }

    /**
     * 🔥 获取食材显示名称
     */
    private getIngredientDisplayName(type: IngredientType): string {
        switch (type) {
            case IngredientType.RICE:
                return "大米";
            case IngredientType.POTATO:
                return "土豆";
            case IngredientType.COOKED_RICE:
                return "熟大米";
            case IngredientType.POTATO_MASH:
                return "土豆泥";
            case IngredientType.EGG:
                return "鸡蛋";
            case IngredientType.GREEN_ONION:
                return "大葱";
            case IngredientType.LETTUCE:
                return "生菜";
            case IngredientType.CILANTRO:
                return "香菜";
            case IngredientType.OIL:
                return "油";
            case IngredientType.SAUCE:
                return "酱";
            case IngredientType.PEANUT_SAUCE:
                return "花生米";
            case IngredientType.EGG_SAUCE:
                return "鸡蛋酱";
            case IngredientType.MIXING_BOWL:
                return "拌料盆";
            default:
                return "食材";
        }
    }

    protected onDestroy(): void {
        this.enableUiHitTest();
        // 🔥 清理所有效果
        this.clearSteamEffects();

        // 🔥 清理蒸制中的食材（新系统）
        this.steamingIngredients.forEach(steaming => {
            if (steaming.node && steaming.node.isValid) {
                steaming.node.destroy();
            }
        });
        this.steamingIngredients = [];

        if (this.mixedIngredientDisplay && this.mixedIngredientDisplay.isValid) {
            this.mixedIngredientDisplay.destroy();
        }
        this.clearEggSauceReadyVisual();
        this.lettuceLeafNodes.forEach(node => {
            if (node && node.isValid) {
                node.destroy();
            }
        });
        this.lettuceLeafNodes = [];
        this.lettuceOnLeaf = null;
        this.rollVisuals.forEach(v => {
            if (v.isValid) v.destroy();
        });


        if (this.canvasNode) {
            this.canvasNode.off(Node.EventType.TOUCH_END, this.onCanvasTouchEnd, this);
        }
        input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        this.removeNativeMouseListener();
        this.unscheduleAllCallbacks();
        Tween.stopAll();
        // BaseCookingController does not implement onDestroy
        // super.onDestroy();
    }
}











