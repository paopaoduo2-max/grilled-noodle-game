import { _decorator, CCFloat, Component, Node, Label, Button, Sprite, SpriteFrame, Color, UITransform, Vec3, tween, EventTouch, director, Tween, resources, input, Input, EventMouse, view, game, Vec2, assetManager, Camera, Canvas, isValid } from 'cc';
import { PREVIEW, EDITOR, DEV } from 'cc/env';
import { IngredientType, GameConfig } from '../Data/GameConfig';
import { InventoryManager } from '../Manager/InventoryManager';
import { GameProgressManager } from '../Manager/GameProgressManager';
import { getProcessingItems } from '../Data/ShopData';
import { EventManager } from '../Utils/EventManager';
import { GuideEvents } from '../Tutorial/GuideEvents';
import { SceneRouteService } from '../Manager/SceneRouteService';

const { ccclass, property } = _decorator;

/**
 * 食材加工控制器 V3 - 场景节点版
 * 
 * 特点：
 * - 食材和刀具都是场景中的图片节点，可在编辑器中调整位置
 * - 拿着刀具时也可以选择蔬菜
 * - 点击食材 → 放到砧板 → 点击刀具拿起 → 点击砧板上的食材切割
 */
@ccclass('ProcessingControllerV3')
export class ProcessingControllerV3 extends Component {
    
    // ==================== 场景节点引用 ====================
    @property(Node)
    choppingBoard: Node = null;  // 砧板
    
    @property(Node)
    knifeNode: Node = null;  // 刀具节点（图片）

    @property(Node)
    knifeRack: Node = null;  // 刀具放回区域（透明点击区）

    // 🔥 第一关食材容器节点
    @property(Node)
    onionContainer: Node = null;  // 洋葱容器

    @property(Node)
    cilantroContainer: Node = null;  // 香菜容器（第一关使用，下方位置）

    // 🔥 第二关食材容器节点
    @property(Node)
    potatoContainer: Node = null;  // 土豆容器（复用洋葱位置）

    @property(Node)
    greenOnionContainer: Node = null;  // 大葱容器（复用香菜位置）

    // 🔥 第二关香菜容器（中间位置，向上偏移）
    @property(Node)
    level2CilantroContainer: Node = null;  // 第二关香菜容器

    @property(Button)
    nextButton: Button = null;

    @property(Label)
    hintLabel: Label = null;

    // ==================== 食材图片配置 ====================
    // 🔥 第一关食材图片
    @property(SpriteFrame)
    onionSpriteFrame: SpriteFrame = null;  // 洋葱图片

    @property(SpriteFrame)
    cilantroSpriteFrame: SpriteFrame = null;  // 香菜图片

    // 🔥 第二关食材图片（可选，如果没有则使用emoji）
    @property(SpriteFrame)
    potatoSpriteFrame: SpriteFrame = null;  // 土豆图片

    @property(SpriteFrame)
    greenOnionSpriteFrame: SpriteFrame = null;  // 大葱图片

    // 切好的食材图片（成堆碎屑）
    @property([SpriteFrame])
    onionHoldFrames: SpriteFrame[] = [];  // onion_hold_1/2/3

    @property([SpriteFrame])
    cilantroHoldFrames: SpriteFrame[] = [];  // cilantro_hold_1/2/3

    // 🔥 第二关碎屑图片（复用第一关）
    @property([SpriteFrame])
    potatoHoldFrames: SpriteFrame[] = [];  // potato_hold_1/2/3

    @property([SpriteFrame])
    greenOnionHoldFrames: SpriteFrame[] = [];  // green_onion_hold_1/2/3
    
    // 切好食材容器（右侧堆积区）
    @property(Node)
    choppedContainer: Node = null;
    
    // ==================== 碎屑堆位置配置 ====================
    // 洋葱区: 基于场景实际数据
    @property({ type: Vec2, tooltip: '洋葱碎屑堆1位置' })
    onionPile1Pos: Vec2 = new Vec2(60, 96);
    
    @property({ type: Vec2, tooltip: '洋葱碎屑堆2位置' })
    onionPile2Pos: Vec2 = new Vec2(100, 82);
    
    @property({ type: Vec2, tooltip: '洋葱碎屑堆3位置' })
    onionPile3Pos: Vec2 = new Vec2(67, 49);
    
    @property({ type: Vec2, tooltip: '洋葱碎屑堆4位置' })
    onionPile4Pos: Vec2 = new Vec2(114, 35);
    
    @property({ type: Vec2, tooltip: '洋葱碎屑堆5位置' })
    onionPile5Pos: Vec2 = new Vec2(82, 7);
    
    @property({ type: Vec2, tooltip: '洋葱碎屑堆6位置' })
    onionPile6Pos: Vec2 = new Vec2(61, 7);
    
    // 香菜区: 基于场景实际数据
    @property({ type: Vec2, tooltip: '香菜碎屑堆1位置' })
    cilantroPile1Pos: Vec2 = new Vec2(68, -105);

    @property({ type: Vec2, tooltip: '香菜碎屑堆2位置' })
    cilantroPile2Pos: Vec2 = new Vec2(104, -105);

    @property({ type: Vec2, tooltip: '香菜碎屑堆3位置' })
    cilantroPile3Pos: Vec2 = new Vec2(71, -145);

    @property({ type: Vec2, tooltip: '香菜碎屑堆4位置' })
    cilantroPile4Pos: Vec2 = new Vec2(113, -146);

    @property({ type: Vec2, tooltip: '香菜碎屑堆5位置' })
    cilantroPile5Pos: Vec2 = new Vec2(67, -190);

    @property({ type: Vec2, tooltip: '香菜碎屑堆6位置' })
    cilantroPile6Pos: Vec2 = new Vec2(104, -192);

    // 🔥 大葱区: 第二关大葱碎屑位置（左上区域 -190, 293 附近）
    @property({ type: Vec2, tooltip: '大葱碎屑堆1位置' })
    greenOnionPile1Pos: Vec2 = new Vec2(-190, 293);

    @property({ type: Vec2, tooltip: '大葱碎屑堆2位置' })
    greenOnionPile2Pos: Vec2 = new Vec2(-150, 293);

    @property({ type: Vec2, tooltip: '大葱碎屑堆3位置' })
    greenOnionPile3Pos: Vec2 = new Vec2(-190, 250);

    @property({ type: Vec2, tooltip: '大葱碎屑堆4位置' })
    greenOnionPile4Pos: Vec2 = new Vec2(-150, 250);

    @property({ type: Vec2, tooltip: '大葱碎屑堆5位置' })
    greenOnionPile5Pos: Vec2 = new Vec2(-170, 210);

    @property({ type: Vec2, tooltip: '大葱碎屑堆6位置' })
    greenOnionPile6Pos: Vec2 = new Vec2(-130, 210);
    
    @property({ type: CCFloat, tooltip: '碎屑缩放' })
    choppedScale: number = 0.7;
    
    @property({ type: CCFloat, tooltip: '每份食材图片大小' })
    ingredientSize: number = 80;
    
    @property({ type: CCFloat, tooltip: '食材图片间距' })
    ingredientSpacing: number = 10;
    
    @property({ type: CCFloat, tooltip: '洋葱缩放' })
    onionScale: number = 0.3;
    
    @property({ type: CCFloat, tooltip: '香菜缩放' })
    cilantroScale: number = 0.4;
    
    @property({ type: CCFloat, tooltip: '洋葱起始X' })
    onionStartX: number = -53;
    
    @property({ type: CCFloat, tooltip: '洋葱起始Y' })
    onionStartY: number = -103;
    
    @property({ type: CCFloat, tooltip: '香菜起始X' })
    cilantroStartX: number = -108;
    
    @property({ type: CCFloat, tooltip: '香菜起始Y' })
    cilantroStartY: number = -145;
    
    @property({ type: CCFloat, tooltip: '香菜旋转角度' })
    cilantroRotation: number = -59;
    
    // ==================== 数据 ====================
    private ingredientCounts: Map<string, { raw: number, processed: number }> = new Map();
    // 🔥 扩展 tableVegetable 结构，记录原始节点信息用于返回
    private tableVegetable: { 
        type: string, 
        node: Node, 
        progress: number,
        originalNode: Node | null,  // 原始食材节点（用于返回）
        originalPos: Vec3,          // 原始位置
        originalScale: Vec3         // 原始缩放
    } | null = null;
    private isHoldingKnife: boolean = false;
    private knifeOriginalPos: Vec3 = new Vec3();
    private knifeOriginalScale: Vec3 = new Vec3();
    private knifeOriginalParent: Node = null;
    
    // 食材图片节点列表
    private onionNodes: Node[] = [];
    private cilantroNodes: Node[] = [];
    // 🔥 第二关食材节点列表
    private potatoNodes: Node[] = [];
    private greenOnionNodes: Node[] = [];
    private level2CilantroNodes: Node[] = [];  // 第二关香菜节点（位置上移）
    
    // ==================== 鼠标跟随 ====================
    private _isMouseFollowing: boolean = false;
    private _currentMousePos: Vec2 = new Vec2();
    private _currentMouseWorldPos: Vec3 = new Vec3();
    private _nativeMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
    private _knifeSpriteNode: Node = null;  // 跟随鼠标的刀具图片节点
    private _knifeSprite: Sprite | null = null;
    private _canvasTransform: UITransform | null = null;
    private _canvasCamera: Camera | null = null;
    
    // 🔥 防止动画期间重复点击
    private _isAnimatingIngredient: boolean = false;
    
    // ==================== 配置 ====================
    private readonly CHOP_PROGRESS_PER_CLICK = 34;  // 每次点击增加的进度（3次切完）
    
    onLoad() {
        this.setupEvents();
    }
    
    start() {
        // 🔥 清空ChoppedContainer中的旧碎屑节点
        this.clearChoppedContainer();

        // 🔥 增加延迟，确保 InventoryManager 已完成加载
        this.scheduleOnce(() => {
            // 动态加载碎屑图片（如果未手动配置）
            this.loadHoldFrames();

            this.loadInventory();
            this.updateAllCounts();
            this.updateHint();
            this.checkAllComplete();

            // 保存刀具原始位置和父节点
            if (this.knifeNode) {
                this.knifeOriginalPos = this.knifeNode.position.clone();
                this.knifeOriginalScale = this.knifeNode.scale.clone();
                this.knifeOriginalParent = this.knifeNode.parent;
            }

            // 设置鼠标跟随
            this.setupMouseFollower();
        }, 0.3);  // 🔥 增加延迟到0.3秒，确保 InventoryManager 完成加载

        EventManager.Instance.emit(GuideEvents.PROCESSING_ENTER);
    }

    /**
     * 🔥 清空ChoppedContainer中的所有碎屑节点
     */
    private clearChoppedContainer() {
        if (!this.choppedContainer) return;

        const children = [...this.choppedContainer.children];
        children.forEach(child => {
            if (child.isValid) {
                child.destroy();
            }
        });

        // 重置碎屑计数
        this.choppedPileCount.clear();

        console.log(`[ProcessingControllerV3] ✅ 清空ChoppedContainer，移除${children.length}个旧节点`);
    }
    
    /**
     * 动态加载碎屑图片
     */
    private loadHoldFrames() {
        // 使用UUID直接加载（更可靠）
        const onionUUIDs = [
            '57be6261-358b-48d6-aa33-4a4c06d39baa@f9941',
            '389bb539-8bb6-47c0-bfd8-b65dfb231812@f9941',
            '156cd7b4-8346-4b29-aecb-79c7e5c97c61@f9941'
        ];
        const cilantroUUIDs = [
            '0765f0ea-798c-48de-af23-2fe493ad8a44@f9941',
            '808e0fd0-8390-4158-914c-4fcb0ae2698b@f9941',
            '42537f1f-172e-4952-bcee-3b00a789d971@f9941'
        ];
        
        // 加载洋葱碎屑
        if (this.onionHoldFrames.length === 0) {
            onionUUIDs.forEach((uuid, index) => {
                assetManager.loadAny({ uuid }, (err, asset) => {
                    if (!err && asset) {
                        this.onionHoldFrames.push(asset as SpriteFrame);
                        console.log(`[ProcessingControllerV3] 洋葱碎屑${index + 1}加载成功`);
                    } else {
                        console.warn(`[ProcessingControllerV3] 洋葱碎屑${index + 1}加载失败:`, err);
                    }
                });
            });
        }
        
        // 加载香菜碎屑
        if (this.cilantroHoldFrames.length === 0) {
            cilantroUUIDs.forEach((uuid, index) => {
                assetManager.loadAny({ uuid }, (err, asset) => {
                    if (!err && asset) {
                        this.cilantroHoldFrames.push(asset as SpriteFrame);
                        console.log(`[ProcessingControllerV3] 香菜碎屑${index + 1}加载成功`);
                    } else {
                        console.warn(`[ProcessingControllerV3] 香菜碎屑${index + 1}加载失败:`, err);
                    }
                });
            });
        }
    }
    
    update(dt: number) {
        // 实时更新刀具位置跟随鼠标
        if (this._isMouseFollowing && this.isHoldingKnife) {
            this.applyKnifeFollowPosition();
        }
    }
    
    onDestroy() {
        // 移除原生鼠标监听
        this.removeNativeMouseListener();
        if (input?.off) {
            input.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
            input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        }
    }
    
    // ==================== 初始化 ====================
    
    private setupEvents() {
        // 刀具点击事件
        if (this.knifeNode) {
            this.knifeNode.on(Node.EventType.TOUCH_END, this.onKnifeClick, this);
        }
        
        // 刀具放回区域点击事件
        if (this.knifeRack) {
            this.knifeRack.on(Node.EventType.TOUCH_END, this.onKnifeRackClick, this);
        }
        
        // 砧板点击事件
        if (this.choppingBoard) {
            this.choppingBoard.on(Node.EventType.TOUCH_END, this.onChoppingBoardClick, this);
        }
        
        // 下一步按钮
        if (this.nextButton) {
            this.nextButton.node.on(Button.EventType.CLICK, this.onNextPhase, this);
            this.nextButton.interactable = false;
        }
        
        // 右键点击放回刀具
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    }
    
    /**
     * 点击刀具放回区域
     */
    private onKnifeRackClick(event: EventTouch) {
        event.propagationStopped = true;
        
        if (this.isHoldingKnife) {
            console.log('[ProcessingControllerV3] 🔪 点击刀架放回刀具');
            this.putDownKnife();
            this.updateHint();
        } else {
            // 如果没拿刀具，点击刀架等同于点击刀具
            this.onKnifeClick(event);
        }
    }
    
    /**
     * 鼠标按下事件 - 处理右键放回刀具
     */
    private onMouseDown(event: EventMouse) {
        // 右键点击时放回刀具
        if (event.getButton() === 2 && this.isHoldingKnife) {
            console.log('[ProcessingControllerV3] 🔪 右键放回刀具');
            this.putDownKnife();
            this.updateHint();
        }
    }
    
    private loadInventory() {
        const inventory = InventoryManager.instance;
        this.ingredientCounts.clear();

        console.log(`[ProcessingControllerV3] 🔍 loadInventory 开始，InventoryManager存在: ${!!inventory}`);
        if (inventory) {
            console.log(`[ProcessingControllerV3] 🔍 currentLevel存在: ${!!inventory.currentLevel}`);
            // 🔥 打印InventoryManager中的所有库存
            if (inventory.currentLevel) {
                console.log(`[ProcessingControllerV3] 🔍 InventoryManager库存详情:`);
                inventory.currentLevel.inventory.forEach((item, type) => {
                    if (item.rawCount > 0 || item.processedCount > 0) {
                        console.log(`  - ${type}: raw=${item.rawCount}, processed=${item.processedCount}`);
                    }
                });
            }
        }

        // 🔥 优先从 GameProgressManager 获取关卡ID
        const progressManager = GameProgressManager.instance;
        let levelId = inventory?.currentLevel?.levelId || 1;
        if (progressManager?.progress?.currentLevel) {
            levelId = progressManager.progress.currentLevel;
        }
        console.log(`[ProcessingControllerV3] 🔥 使用关卡ID: ${levelId}`);

        const processingItems = getProcessingItems(levelId);
        console.log(`[ProcessingControllerV3] 需要加工的商品: ${processingItems.map(i => i.name).join(', ')}`);

        const isPreviewMode = PREVIEW || EDITOR || DEV;
        if (inventory && inventory.currentLevel && isPreviewMode && processingItems.length > 0) {
            let hasAnyRaw = false;
            for (const item of processingItems) {
                const count = inventory.getIngredientCount(item.ingredientType);
                if (count.raw > 0) {
                    hasAnyRaw = true;
                    break;
                }
            }

            if (!hasAnyRaw) {
                const seedRawCount = 6;
                for (const item of processingItems) {
                    let entry = inventory.currentLevel.inventory.get(item.ingredientType);
                    if (!entry) {
                        entry = { ingredientType: item.ingredientType, rawCount: 0, processedCount: 0, reservedCount: 0 };
                        inventory.currentLevel.inventory.set(item.ingredientType, entry);
                    }
                    entry.rawCount = Math.max(entry.rawCount, seedRawCount);
                    entry.reservedCount = 0;
                }
                inventory.saveLevelState();
                console.log(`[ProcessingControllerV3] 🧪 预览模式已填充备菜测试库存`);
            }
        }

        let totalRawCount = 0;
        let hasCurrentLevel = false;

        // 尝试从 InventoryManager 获取库存数据
        if (inventory && inventory.currentLevel) {
            hasCurrentLevel = true;
            console.log(`[ProcessingControllerV3] ✅ 有关卡数据，关卡ID: ${inventory.currentLevel.levelId}`);
            for (const item of processingItems) {
                const count = inventory.getIngredientCount(item.ingredientType);
                // 🔥 直接使用ingredientType作为key（它本身就是字符串如'onion'）
                this.ingredientCounts.set(item.ingredientType, {
                    raw: count.raw,
                    processed: count.processed
                });
                totalRawCount += count.raw;
                console.log(`[ProcessingControllerV3] ${item.name} (key="${item.ingredientType}"): 生=${count.raw}, 加工=${count.processed}`);
            }
            // 🔥 打印所有已加载的 key
            console.log(`[ProcessingControllerV3] 已加载的 ingredientCounts keys:`, Array.from(this.ingredientCounts.keys()));
        }
        
        // 🔥 只有在没有关卡数据时才生成测试数据（单独运行场景调试用）
        if (!hasCurrentLevel) {
            console.log(`[ProcessingControllerV3] ⚠️ 无关卡数据，检查原因...`);
            console.log(`[ProcessingControllerV3] - InventoryManager.instance: ${!!inventory}`);
            console.log(`[ProcessingControllerV3] - currentLevel: ${inventory ? !!inventory.currentLevel : 'N/A'}`);
            
            // 🔥 检查是否还没加载完，0.5秒后重试一次
            if (this._loadRetryCount < 2) {
                this._loadRetryCount++;
                console.log(`[ProcessingControllerV3] 🔄 第${this._loadRetryCount}次重试加载...`);
                this.scheduleOnce(() => {
                    this.loadInventory();
                    this.updateAllCounts();
                }, 0.5);
                return;
            }
            
            // 🔥 重试后仍然没有数据，使用测试数据（增加数量以便测试）
            console.log(`[ProcessingControllerV3] ?? 单独运行模式：生成测试数据`);
            const testRawCount = 6;
            processingItems.forEach((item) => {
                this.ingredientCounts.set(item.ingredientType, { raw: testRawCount, processed: 0 });
            });
            console.log(`[ProcessingControllerV3] ?? 测试数据: ${processingItems.map(i => `${i.ingredientType}=${testRawCount}`).join(', ')}`);
        } else {
            console.log(`[ProcessingControllerV3] ✅ 从库存加载数据，总原材料: ${totalRawCount}`);
        }
    }
    
    // 🔥 加载重试计数
    private _loadRetryCount: number = 0;
    
    private updateAllCounts() {
        // 🔥 打印当前 ingredientCounts 状态
        console.log(`[ProcessingControllerV3] updateAllCounts - ingredientCounts 内容:`);
        this.ingredientCounts.forEach((value, key) => {
            console.log(`  - "${key}": raw=${value.raw}, processed=${value.processed}`);
        });

        // 🔥 动态处理所有食材类型
        this.ingredientCounts.forEach((count, ingredientType) => {
            if (count.raw > 0) {
                const container = this.getContainerForIngredient(ingredientType);
                const nodeList = this.getNodeListForIngredient(ingredientType);
                if (container && nodeList) {
                    this.createIngredientImages(ingredientType, count.raw, container, nodeList);
                }
            }
        });
    }

    /**
     * 🔥 根据食材类型获取容器节点
     */
    private getContainerForIngredient(ingredientType: string): Node | null {
        // 检查是否为第二关
        const progressManager = GameProgressManager.instance;
        const inventory = InventoryManager.instance;
        let levelId = inventory?.currentLevel?.levelId || 1;
        if (progressManager?.progress?.currentLevel) {
            levelId = progressManager.progress.currentLevel;
        }
        const isLevel2 = levelId === 2;

        switch (ingredientType) {
            case 'onion': return this.onionContainer;
            case 'cilantro':
                // 第二关使用专门的容器（位置上移）
                if (isLevel2) {
                    return this.level2CilantroContainer || this.cilantroContainer;
                }
                return this.cilantroContainer;
            case 'potato': return this.potatoContainer || this.onionContainer;
            case 'green_onion': return this.greenOnionContainer || this.cilantroContainer;
            case 'pork': return this.potatoContainer || this.onionContainer;
            case 'radish': return this.onionContainer;
            case 'ginger': return this.cilantroContainer;
            default: return null;
        }
    }

    /**
     * 🔥 根据食材类型获取节点列表
     */
    private getNodeListForIngredient(ingredientType: string): Node[] {
        // 检查是否为第二关
        const progressManager = GameProgressManager.instance;
        const inventory = InventoryManager.instance;
        let levelId = inventory?.currentLevel?.levelId || 1;
        if (progressManager?.progress?.currentLevel) {
            levelId = progressManager.progress.currentLevel;
        }
        const isLevel2 = levelId === 2;

        switch (ingredientType) {
            case 'onion': return this.onionNodes;
            case 'cilantro':
                // 第二关使用专门的节点列表
                if (isLevel2) {
                    return this.level2CilantroNodes || this.cilantroNodes;
                }
                return this.cilantroNodes;
            case 'potato': return this.potatoNodes || this.onionNodes;
            case 'green_onion': return this.greenOnionNodes || this.cilantroNodes;
            case 'pork': return this.potatoNodes || this.onionNodes;
            case 'radish': return this.onionNodes;
            case 'ginger': return this.cilantroNodes;
            default: return [];
        }
    }

    /**
     * 🔥 根据食材类型获取SpriteFrame
     */
    private getSpriteFrameForIngredient(ingredientType: string): SpriteFrame | null {
        switch (ingredientType) {
            case 'onion': return this.onionSpriteFrame;
            case 'cilantro': return this.cilantroSpriteFrame;
            case 'potato': return this.potatoSpriteFrame;
            case 'green_onion': return this.greenOnionSpriteFrame;
            default: return null;
        }
    }

    /**
     * 🔥 根据食材类型获取emoji
     */
    private getEmojiForIngredient(ingredientType: string): string {
        switch (ingredientType) {
            case 'onion': return '🧅';
            case 'cilantro': return '🌿';
            case 'potato': return '🥔';
            case 'green_onion': return '🧅';
            case 'pork': return '🥩';
            case 'radish': return '🥕';
            case 'ginger': return '🫚';
            default: return '?';
        }
    }

    /**
     * ?? 根据食材类型获取碎屑图片
     */
    private getHoldFramesForIngredient(ingredientType: string): SpriteFrame[] {
        switch (ingredientType) {
            case 'onion': return this.onionHoldFrames;
            case 'cilantro': return this.cilantroHoldFrames;
            case 'potato': return this.potatoHoldFrames.length > 0 ? this.potatoHoldFrames : this.onionHoldFrames;
            case 'green_onion': return this.greenOnionHoldFrames.length > 0 ? this.greenOnionHoldFrames : this.cilantroHoldFrames;
            case 'pork': return this.potatoHoldFrames.length > 0 ? this.potatoHoldFrames : this.onionHoldFrames;
            case 'radish': return this.onionHoldFrames;
            case 'ginger': return this.cilantroHoldFrames;
            default: return [];
        }
    }

    /**
     * 创建食材图片节点
     */
    private createIngredientImages(ingredientType: string, count: number, container: Node, nodeList: Node[]) {
        // 收集预览节点的位置、缩放、旋转信息（只使用带数字后缀的节点如 001-005）
        const previewNodes: Node[] = [];
        container.children.forEach(child => {
            if (child.name.includes('Preview')) {
                child.active = false;  // 先隐藏所有预览节点
                // 只使用带数字后缀的节点（如 OnionPreview-001）
                if (child.name.includes('-')) {
                    previewNodes.push(child);
                }
            }
        });
        // 按名称排序
        previewNodes.sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`[ProcessingControllerV3] ${ingredientType} 预览节点数量: ${previewNodes.length}, 需要创建: ${count}`);
        
        // 🔥 安全检查：如果没有预览节点，无法创建
        if (previewNodes.length === 0) {
            console.error(`[ProcessingControllerV3] ❌ ${ingredientType} 没有找到预览节点！请检查场景配置`);
            return;
        }
        
        // 清除旧的动态节点
        nodeList.forEach(node => {
            if (node && node.isValid) {
                node.destroy();
            }
        });
        nodeList.length = 0;

        // 🔥 根据食材类型获取对应的图片和emoji
        const spriteFrame = this.getSpriteFrameForIngredient(ingredientType);
        const emoji = this.getEmojiForIngredient(ingredientType);
        console.log(`[ProcessingControllerV3] ${ingredientType} 使用 emoji: ${emoji}, spriteFrame: ${!!spriteFrame}`);

        // 🔥 创建所有食材（不再限制为预览节点数量）
        for (let i = 0; i < count; i++) {
            const node = new Node(`${ingredientType}_${i}`);
            
            // 优先使用Sprite图片，否则使用emoji
            if (spriteFrame) {
                const sprite = node.addComponent(Sprite);
                sprite.spriteFrame = spriteFrame;
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            } else {
                const label = node.addComponent(Label);
                label.string = emoji;
                label.fontSize = this.ingredientSize * 0.8;
                label.horizontalAlign = Label.HorizontalAlign.CENTER;
                label.verticalAlign = Label.VerticalAlign.CENTER;
            }
            
            // 🔥 计算位置：使用预览节点或自动计算
            let targetPos: Vec3;
            let targetRot: Vec3;
            let targetScale: Vec3;
            
            if (i < previewNodes.length) {
                // 使用预览节点的变换
                const previewNode = previewNodes[i];
                targetPos = previewNode.position.clone();
                targetRot = previewNode.eulerAngles.clone();
                targetScale = previewNode.scale.clone();
                
                // 从预览节点复制UITransform大小和锚点
                const previewTransform = previewNode.getComponent(UITransform);
                const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
                if (previewTransform) {
                    transform.setContentSize(previewTransform.contentSize);
                    transform.setAnchorPoint(previewTransform.anchorPoint);
                } else {
                    transform.setContentSize(this.ingredientSize, this.ingredientSize);
                }
            } else {
                // 🔥 超出预览节点数量时，堆叠在已有位置上（循环使用预览节点位置）
                const baseIndex = i % previewNodes.length;  // 循环使用预览节点位置
                const stackLevel = Math.floor(i / previewNodes.length);  // 堆叠层级
                const baseNode = previewNodes[baseIndex];
                const baseTransform = baseNode?.getComponent(UITransform);
                const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
                if (baseTransform) {
                    transform.setContentSize(baseTransform.contentSize);
                    transform.setAnchorPoint(baseTransform.anchorPoint);
                } else {
                    transform.setContentSize(this.ingredientSize, this.ingredientSize);
                }
                
                // 在基础位置上添加随机偏移和层级偏移
                const basePos = baseNode.position.clone();
                const offsetX = (Math.random() - 0.5) * 15;  // 随机X偏移 -7.5 ~ 7.5
                const offsetY = (Math.random() - 0.5) * 15 + stackLevel * 5;  // 随机Y偏移 + 层级向上偏移
                
                targetPos = new Vec3(basePos.x + offsetX, basePos.y + offsetY, 0);
                targetRot = new Vec3(0, 0, baseNode.eulerAngles.z + (Math.random() - 0.5) * 30);  // 基础旋转 + 随机旋转
                targetScale = baseNode.scale.clone();
            }
            
            console.log(`  创建 ${node.name}: pos=(${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)})`);
            
            // 先添加到容器
            container.addChild(node);
            
            // 设置变换
            node.position = targetPos;
            node.eulerAngles = targetRot;
            
            // 🔥 入场动画（从0.1开始，确保有点击区域）
            node.setScale(0.1, 0.1, 1);
            tween(node)
                .delay(i * 0.03)
                .to(0.15, { scale: targetScale }, { easing: 'backOut' })
                .start();
            
            // 点击事件
            node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
                event.propagationStopped = true;
                this.onIngredientImageClick(ingredientType, node);
            }, this);
            
            nodeList.push(node);
        }
        
        console.log(`[ProcessingControllerV3] 创建 ${count} 个 ${ingredientType} 图片`);
    }
    
    private updateHint() {
        const hintLabel = this.getHintLabel();
        if (!hintLabel) return;

        if (!this.tableVegetable) {
            hintLabel.string = '👆 点击食材放到砧板上';
        } else if (!this.isHoldingKnife) {
            hintLabel.string = '👆 点击刀具拿起，然后点击砧板切菜';
        } else {
            hintLabel.string = '🔪 点击砧板上的食材进行切割';
        }
    }

    private getHintLabel(): Label | null {
        if (!this.hintLabel) return null;
        if (!this.hintLabel.node || !isValid(this.hintLabel.node)) return null;
        return this.hintLabel;
    }
    
    // ==================== 交互事件 ====================
    
    /**
     * 点击食材图片（新版 - 多图片模式）
     */
    private onIngredientImageClick(ingredientType: string, clickedNode: Node) {
        // 🔥 防止动画期间重复点击
        if (this._isAnimatingIngredient) {
            console.log(`[ProcessingControllerV3] ⏳ 动画进行中，忽略点击`);
            return;
        }

        const count = this.ingredientCounts.get(ingredientType);
        const nodeList = this.getNodeListForIngredient(ingredientType);
        console.log(`[ProcessingControllerV3] 🖱️ 点击 ${ingredientType}，count=${JSON.stringify(count)}，nodeList长度=${nodeList.length}`);

        if (!count) {
            console.error(`[ProcessingControllerV3] ❌ 找不到 ${ingredientType} 的计数！所有keys:`, Array.from(this.ingredientCounts.keys()));
            return;
        }

        if (count.raw <= 0) {
            console.log(`[ProcessingControllerV3] ${ingredientType} 库存不足 (raw=${count.raw})`);
            return;
        }

        // 🔥 检查节点是否有效（可能已被销毁或隐藏）
        if (!clickedNode || !clickedNode.isValid || !clickedNode.active) {
            console.log(`[ProcessingControllerV3] 节点无效，忽略点击`);
            return;
        }

        // 🔥 如果砧板上已有食材
        if (this.tableVegetable) {
            // 如果是相同类型的食材，不做反应
            if (this.tableVegetable.type === ingredientType) {
                console.log(`[ProcessingControllerV3] 砧板上已有相同食材 ${ingredientType}，忽略点击`);
                return;
            }
            // 如果是不同类型的食材，替换（先移除旧的）
            console.log(`[ProcessingControllerV3] 替换砧板食材: ${this.tableVegetable.type} → ${ingredientType}`);
            this.removeTableVegetable();
        }
        
        // 播放食材飞向砧板的动画
        this.animateIngredientToBoard(clickedNode, ingredientType);
    }
    
    /**
     * 食材飞向砧板动画
     */
    private animateIngredientToBoard(ingredientNode: Node, ingredientType: string) {
        if (!this.choppingBoard) return;

        // 🔥 设置动画标志，防止重复点击
        this._isAnimatingIngredient = true;

        // 获取砧板世界坐标
        const boardWorldPos = this.choppingBoard.worldPosition.clone();
        const ingredientWorldPos = ingredientNode.worldPosition.clone();

        // 🔥 从预览节点获取原始缩放和大小 - 使用动态方法
        const container = this.getContainerForIngredient(ingredientType);
        let baseScale = 0.4;
        let contentWidth = this.ingredientSize;
        let contentHeight = this.ingredientSize;
        if (container) {
            for (const child of container.children) {
                if (child.name.includes('Preview') && child.name.includes('-')) {
                    baseScale = child.scale.x;
                    const childTransform = child.getComponent(UITransform);
                    if (childTransform) {
                        contentWidth = childTransform.contentSize.width;
                        contentHeight = childTransform.contentSize.height;
                    }
                    break;
                }
            }
        }
        const flyScale = baseScale * 1.2;  // 飞行时放大1.2倍
        
        // 创建飞行副本
        const flyNode = new Node('FlyIngredient');
        // 🔥 根据食材类型动态获取spriteFrame和emoji
        const spriteFrame = this.getSpriteFrameForIngredient(ingredientType);
        const emoji = this.getEmojiForIngredient(ingredientType);

        if (spriteFrame) {
            const sprite = flyNode.addComponent(Sprite);
            sprite.spriteFrame = spriteFrame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        } else {
            const label = flyNode.addComponent(Label);
            label.string = emoji;
            label.fontSize = this.ingredientSize * 0.8;
        }
        
        const transform = flyNode.getComponent(UITransform) || flyNode.addComponent(UITransform);
        transform.setContentSize(contentWidth, contentHeight);
        
        // 添加到 Canvas
        const canvas = this.node.parent;
        if (canvas) {
            flyNode.parent = canvas;
            flyNode.worldPosition = ingredientWorldPos;
            flyNode.setScale(baseScale, baseScale, 1);
            flyNode.setSiblingIndex(9999);
            
            // 飞行动画
            tween(flyNode)
                .to(0.3, { 
                    worldPosition: boardWorldPos,
                    scale: new Vec3(flyScale, flyScale, 1)
                }, { easing: 'quadIn' })
                .call(() => {
                    flyNode.destroy();
                    // 放到砧板上
                    this.placeOnChoppingBoard(ingredientType);
                    this.updateHint();
                    // 🔥 动画完成，清除标志
                    this._isAnimatingIngredient = false;
                })
                .start();
        } else {
            // 🔥 Canvas不存在时也要清除标志
            this._isAnimatingIngredient = false;
        }
        
        // 🔥 保存原节点信息（用于返回）
        const originalPos = ingredientNode.position.clone();
        const originalScale = ingredientNode.scale.clone();
        
        // 原节点隐藏动画（不销毁，用于返回）
        tween(ingredientNode)
            .to(0.15, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => {
                // 从列表中移除但不销毁
                const nodeList = this.getNodeListForIngredient(ingredientType);
                const index = nodeList.indexOf(ingredientNode);
                if (index > -1) {
                    nodeList.splice(index, 1);
                }
                // 🔥 隐藏而不是销毁
                ingredientNode.active = false;
            })
            .start();
        
        // 🔥 记录原始节点信息到临时变量，供 placeOnChoppingBoard 使用
        this._pendingOriginalNode = ingredientNode;
        this._pendingOriginalPos = originalPos;
        this._pendingOriginalScale = originalScale;
    }
    
    // 🔥 临时存储原始节点信息
    private _pendingOriginalNode: Node | null = null;
    private _pendingOriginalPos: Vec3 = new Vec3();
    private _pendingOriginalScale: Vec3 = new Vec3();
    
    /**
     * 点击刀具
     */
    private onKnifeClick(event: EventTouch) {
        event.propagationStopped = true;
        
        // 如果已经拿着刀具，点击刀具区域才放下（不是跟随中的点击）
        if (this.isHoldingKnife) {
            // 只有点击刀具原始位置附近才放下
            const clickPos = event.getUILocation();
            // 放下刀具 - 停止跟随，回到原位
            console.log('[ProcessingControllerV3] 🔪 放下刀具');
            this.putDownKnife();
        } else {
            // 拿起刀具 - 开始跟随鼠标
            console.log('[ProcessingControllerV3] 🔪 拿起刀具');
            this.isHoldingKnife = true;

            this.ensureKnifeFollower();
            this.toggleKnifeFollower(true);

            const followNode = this.getKnifeFollowNode();
            if (followNode) {
                // 放大 + 高亮 + 顺时针旋转90度
                tween(followNode)
                    .to(0.15, { 
                        scale: new Vec3(
                            this.knifeOriginalScale.x * 1.2,
                            this.knifeOriginalScale.y * 1.2,
                            1
                        ),
                        eulerAngles: new Vec3(0, 0, -90)  // 顺时针旋转90度
                    })
                    .start();

                const sprite = followNode.getComponent(Sprite);
                if (sprite) {
                    sprite.color = new Color(255, 255, 200, 255);
                }
            }
            
            // 启动鼠标跟随
            this.startMouseFollowing(event);
            
            // 禁用刀具触摸，防止跟随时误触
            this.knifeNode.off(Node.EventType.TOUCH_END, this.onKnifeClick, this);
        }
        
        this.updateHint();
    }
    
    /**
     * 放下刀具
     */
    private putDownKnife() {
        this.isHoldingKnife = false;
        this.stopMouseFollowing();

        this.toggleKnifeFollower(false);
        
        // 回到原始位置、缩放、旋转
        tween(this.knifeNode)
            .to(0.2, { 
                position: this.knifeOriginalPos,
                scale: this.knifeOriginalScale,
                eulerAngles: new Vec3(0, 0, 0)  // 恢复原始角度
            })
            .call(() => {
                // 动画完成后重新启用触摸事件
                this.knifeNode.on(Node.EventType.TOUCH_END, this.onKnifeClick, this);
            })
            .start();
        
        const sprite = this.getKnifeSprite();
        if (sprite) {
            sprite.color = new Color(255, 255, 255, 255);
        }
    }
    
    /**
     * 点击砧板
     */
    private onChoppingBoardClick(event: EventTouch) {
        if (!this.tableVegetable) return;
        
        if (!this.isHoldingKnife) {
            // 没拿刀具，提示
            const hintLabel = this.getHintLabel();
            if (hintLabel) {
                hintLabel.string = '⚠️ 请先点击刀具拿起！';
                this.scheduleOnce(() => this.updateHint(), 1.5);
            }
            return;
        }
        
        // 切菜
        this.chopVegetable();
    }
    
    // ==================== 核心逻辑 ====================
    
    /**
     * 放食材到砧板
     */
    private placeOnChoppingBoard(ingredientType: string) {
        if (!this.choppingBoard) return;

        // 创建砧板上的食材显示
        const vegNode = new Node('TableVegetable');

        // 🔥 根据食材类型动态获取spriteFrame和emoji
        const spriteFrame = this.getSpriteFrameForIngredient(ingredientType);
        const emoji = this.getEmojiForIngredient(ingredientType);
        const container = this.getContainerForIngredient(ingredientType);
        let baseScale = 0.4;
        let contentWidth = this.ingredientSize;
        let contentHeight = this.ingredientSize;
        if (container) {
            for (const child of container.children) {
                if (child.name.includes('Preview') && child.name.includes('-')) {
                    baseScale = child.scale.x;
                    const childTransform = child.getComponent(UITransform);
                    if (childTransform) {
                        contentWidth = childTransform.contentSize.width;
                        contentHeight = childTransform.contentSize.height;
                    }
                    break;
                }
            }
        }
        const boardScale = baseScale * 1.2;  // 砧板上放大1.2倍
        
        console.log(`[ProcessingControllerV3] 砧板食材: baseScale=${baseScale.toFixed(2)}, boardScale=${boardScale.toFixed(2)}, size=${contentWidth}x${contentHeight}`);
        
        // 优先使用Sprite图片
        if (spriteFrame) {
            const sprite = vegNode.addComponent(Sprite);
            sprite.spriteFrame = spriteFrame;
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        } else {
            // 🔥 使用动态获取的emoji
            const emojiLabel = vegNode.addComponent(Label);
            emojiLabel.string = emoji;
            emojiLabel.fontSize = 70;
        }
        
        // 设置大小（与预览节点相同）
        const transform = vegNode.getComponent(UITransform) || vegNode.addComponent(UITransform);
        transform.setContentSize(contentWidth, contentHeight);
        
        vegNode.setPosition(0, 0, 0);
        this.choppingBoard.addChild(vegNode);
        
        // 直接设置为放大后的尺寸（无动画）
        vegNode.setScale(boardScale, boardScale, 1);
        
        // 创建进度条
        this.createProgressBar(vegNode);
        
        this.tableVegetable = {
            type: ingredientType,
            node: vegNode,
            progress: 0,
            originalNode: this._pendingOriginalNode,
            originalPos: this._pendingOriginalPos.clone(),
            originalScale: this._pendingOriginalScale.clone()
        };
        
        // 清除临时变量
        this._pendingOriginalNode = null;
        
        console.log(`[ProcessingControllerV3] 放置 ${ingredientType} 到砧板`);
    }
    
    /**
     * 创建进度条（显示在食材上方）
     */
    private createProgressBar(parent: Node) {
        // 进度条容器 - 放在食材上方
        const containerNode = new Node('ProgressContainer');
        containerNode.setPosition(0, 80, 0);  // 上方
        parent.addChild(containerNode);
        
        // 进度文字（大号显示百分比）
        const textNode = new Node('ProgressText');
        const label = textNode.addComponent(Label);
        label.string = '0%';
        label.fontSize = 32;  // 放大字体
        label.color = new Color(255, 255, 255, 255);
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.enableOutline = true;
        label.outlineColor = new Color(0, 0, 0, 255);
        label.outlineWidth = 3;
        const textTransform = textNode.getComponent(UITransform) || textNode.addComponent(UITransform);
        textTransform.setContentSize(120, 40);
        textNode.setPosition(0, 0, 0);
        containerNode.addChild(textNode);
        
        // 进度条背景
        const bgNode = new Node('ProgressBg');
        const bgLabel = bgNode.addComponent(Label);
        bgLabel.string = '▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓';
        bgLabel.fontSize = 16;
        bgLabel.color = new Color(60, 60, 60, 200);
        bgLabel.overflow = Label.Overflow.CLAMP;
        const bgTransform = bgNode.getComponent(UITransform) || bgNode.addComponent(UITransform);
        bgTransform.setContentSize(120, 20);
        bgNode.setPosition(0, -35, 0);
        containerNode.addChild(bgNode);
        
        // 进度条填充
        const barNode = new Node('ProgressBar');
        const barLabel = barNode.addComponent(Label);
        barLabel.string = '▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓';
        barLabel.fontSize = 16;
        barLabel.color = new Color(76, 217, 100, 255);
        barLabel.overflow = Label.Overflow.CLAMP;
        barLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        const barTransform = barNode.getComponent(UITransform) || barNode.addComponent(UITransform);
        barTransform.setContentSize(0, 20);
        barTransform.anchorX = 0;
        barNode.setPosition(-60, -35, 0);
        containerNode.addChild(barNode);
    }
    
    /**
     * 切菜
     */
    private chopVegetable() {
        if (!this.tableVegetable) return;
        
        // 🔥 如果已经在完成切菜过程中，忽略点击
        if (this._isCompletingChop) {
            console.log(`[ProcessingControllerV3] ⚠️ 正在完成切菜，忽略点击`);
            return;
        }
        
        // 🔥 如果进度已经>=100，不再增加
        if (this.tableVegetable.progress >= 100) {
            console.log(`[ProcessingControllerV3] ⚠️ 进度已满，忽略点击`);
            return;
        }
        
        this.tableVegetable.progress += this.CHOP_PROGRESS_PER_CLICK;
        
        // 播放切菜动画
        this.playChopAnimation();
        
        // 更新进度条
        this.updateProgressBar();
        
        // 检查是否完成
        if (this.tableVegetable.progress >= 100) {
            this.completeChopping();
        }
    }
    
    /**
     * 播放切菜动画
     */
    private playChopAnimation() {
        // 刀具切下动画 - 保持-90度基础旋转
        const followNode = this.getKnifeFollowNode();
        if (followNode && this._isMouseFollowing) {
            const currentPos = followNode.position.clone();
            
            // 刀具快速下切 + 额外旋转
            tween(followNode)
                // 快速下切
                .to(0.05, { 
                    position: new Vec3(currentPos.x, currentPos.y - 50, 0),
                    eulerAngles: new Vec3(0, 0, -105)  // -90 - 15 = -105
                }, { easing: 'quadIn' })
                // 弹回 + 轻微抖动
                .to(0.08, { 
                    position: new Vec3(currentPos.x + 8, currentPos.y, 0),
                    eulerAngles: new Vec3(0, 0, -85)  // -90 + 5 = -85
                }, { easing: 'quadOut' })
                // 恢复到-90度
                .to(0.05, { 
                    position: new Vec3(this._currentMousePos.x, this._currentMousePos.y, 0),
                    eulerAngles: new Vec3(0, 0, -90)
                })
                .start();
        }
        
        // 食材抖动 - 保持原有缩放比例
        if (this.tableVegetable?.node) {
            const s = this.tableVegetable.node.scale.x;  // 当前缩放值
            tween(this.tableVegetable.node)
                .to(0.02, { scale: new Vec3(s * 1.15, s * 0.85, 1) })
                .to(0.02, { scale: new Vec3(s * 0.9, s * 1.1, 1) })
                .to(0.03, { scale: new Vec3(s * 1.05, s * 0.95, 1) })
                .to(0.03, { scale: new Vec3(s, s, 1) })
                .start();
        }
        
        // 切割特效
        this.playChopEffect();
    }
    
    /**
     * 切割特效 - 碎屑粒子
     */
    private playChopEffect() {
        if (!this.tableVegetable?.node) return;
        
        const ingredientType = this.tableVegetable.type;
        const parent = this.tableVegetable.node.parent;
        if (!parent) return;
        
        // 获取食材世界坐标
        const vegWorldPos = this.tableVegetable.node.worldPosition.clone();
        
        // 根据食材类型选择碎屑颜色
        const colors = ingredientType === 'onion' 
            ? [new Color(255, 240, 200), new Color(200, 180, 150), new Color(180, 160, 120)]  // 洋葱色
            : [new Color(50, 180, 80), new Color(80, 200, 100), new Color(100, 220, 120)];    // 香菜绿
        
        // 碎屑字符
        const debrisChars = ['●', '■', '▲', '◆', '○'];
        
        // 生成 8-12 个碎屑粒子
        const particleCount = 8 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < particleCount; i++) {
            const particle = new Node(`Debris_${i}`);
            const label = particle.addComponent(Label);
            
            // 随机选择碎屑形状和颜色
            label.string = debrisChars[Math.floor(Math.random() * debrisChars.length)];
            label.fontSize = 6 + Math.floor(Math.random() * 8);  // 6-14px
            label.color = colors[Math.floor(Math.random() * colors.length)];
            
            // 添加到砧板父节点
            parent.addChild(particle);
            particle.worldPosition = vegWorldPos;
            particle.setScale(1, 1, 1);
            
            // 随机飞散方向和距离
            const angle = (Math.random() * 180 - 90) * Math.PI / 180;  // -90° 到 90°（向上扇形）
            const distance = 60 + Math.random() * 80;  // 60-140px
            const targetX = vegWorldPos.x + Math.cos(angle) * distance;
            const targetY = vegWorldPos.y + Math.sin(angle) * distance + 30;  // 略向上偏移
            
            // 随机旋转
            const rotationSpeed = (Math.random() - 0.5) * 720;  // -360° 到 360°
            
            // 粒子动画：飞散 + 旋转 + 缩小消失
            const duration = 0.3 + Math.random() * 0.3;  // 0.3-0.6s
            tween(particle)
                .to(duration, {
                    worldPosition: new Vec3(targetX, targetY, 0),
                    scale: new Vec3(0.2, 0.2, 1),
                    eulerAngles: new Vec3(0, 0, rotationSpeed)
                }, { easing: 'quadOut' })
                .call(() => particle.destroy())
                .start();
        }
        
        // 额外添加切割线效果
        this.playSlashEffect();
    }
    
    /**
     * 切割线特效
     */
    private playSlashEffect() {
        if (!this.tableVegetable?.node) return;
        
        const slashNode = new Node('SlashLine');
        const label = slashNode.addComponent(Label);
        label.string = '━━━━';
        label.fontSize = 20;
        label.color = new Color(255, 255, 255, 200);
        
        slashNode.setPosition(0, 0, 0);
        slashNode.setScale(0.5, 1, 1);
        slashNode.eulerAngles = new Vec3(0, 0, -15 + Math.random() * 30);  // 随机角度
        this.tableVegetable.node.addChild(slashNode);
        
        // 切割线动画：快速出现并消失
        tween(slashNode)
            .to(0.05, { scale: new Vec3(1.5, 1, 1) })
            .to(0.15, { scale: new Vec3(0, 1, 1) }, { easing: 'quadIn' })
            .call(() => slashNode.destroy())
            .start();
    }
    
    /**
     * 更新进度条
     */
    private updateProgressBar() {
        if (!this.tableVegetable?.node) return;
        
        const container = this.tableVegetable.node.getChildByName('ProgressContainer');
        if (!container) return;
        
        const progress = Math.min(this.tableVegetable.progress, 100);
        
        // 更新进度条宽度
        const barNode = container.getChildByName('ProgressBar');
        if (barNode) {
            const transform = barNode.getComponent(UITransform);
            if (transform) {
                const targetWidth = 120 * (progress / 100);
                transform.width = targetWidth;
            }
            // 根据进度变色：绿->黄->橙
            const label = barNode.getComponent(Label);
            if (label) {
                if (progress < 50) {
                    label.color = new Color(76, 217, 100, 255);  // 绿色
                } else if (progress < 80) {
                    label.color = new Color(255, 204, 0, 255);   // 黄色
                } else {
                    label.color = new Color(255, 149, 0, 255);   // 橙色
                }
            }
        }
        
        // 更新进度文字
        const textNode = container.getChildByName('ProgressText');
        if (textNode) {
            const label = textNode.getComponent(Label);
            if (label) {
                label.string = `${Math.floor(progress)}%`;
            }
        }
    }
    
    // 🔥 防止重复调用 completeChopping 的标志
    private _isCompletingChop: boolean = false;
    
    /**
     * 完成切菜
     */
    private completeChopping() {
        if (!this.tableVegetable) return;
        
        // 🔥 防止重复调用（快速点击可能导致多次触发）
        if (this._isCompletingChop) {
            console.log(`[ProcessingControllerV3] ⚠️ completeChopping 正在执行中，忽略重复调用`);
            return;
        }
        this._isCompletingChop = true;
        
        const ingredientType = this.tableVegetable.type;
        
        // 🔥 切菜完成，销毁原始节点（不返回）
        if (this.tableVegetable.originalNode) {
            this.tableVegetable.originalNode.destroy();
            this.tableVegetable.originalNode = null;
        }
        
        // 更新库存
        const inventory = InventoryManager.instance;
        let yieldAmount = 1;
        if (inventory) {
            yieldAmount = inventory.getProcessingYield(ingredientType as IngredientType);
            inventory.processIngredient(ingredientType as IngredientType, 1);
        }
        
        // 更新本地计数（使用产出倍数）
        const count = this.ingredientCounts.get(ingredientType);
        if (count) {
            // 🔥 防止负数
            if (count.raw > 0) {
                count.raw--;
            } else {
                console.warn(`[ProcessingControllerV3] ⚠️ ${ingredientType} count.raw 已经是 ${count.raw}，无法再减少！`);
            }
            count.processed += yieldAmount;
        } else {
            console.error(`[ProcessingControllerV3] ❌ 找不到 ${ingredientType} 的计数！检查 ingredientCounts 的 key`);
            // 🔥 打印所有 key 帮助调试
            console.log(`[ProcessingControllerV3] ingredientCounts 的所有 key:`, Array.from(this.ingredientCounts.keys()));
        }
        
        console.log(`[ProcessingControllerV3] 🔪 切1个${ingredientType} → 产出${yieldAmount}份，剩余raw: ${count?.raw}`);
        
        // 完成动画 - 直接淡出消失
        const vegNode = this.tableVegetable.node;
        const remainingCount = count ? Math.max(0, count.raw) : 0;
        
        // 先生成右侧堆积的碎屑
        this.createChoppedPile(ingredientType);
        
        tween(vegNode)
            .to(0.2, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => {
                vegNode.destroy();
                this.tableVegetable = null;
                
                // 🔥 重置标志，允许下一次切菜
                this._isCompletingChop = false;
                
                // 如果同类食材还有剩余，自动放上下一个
                if (remainingCount > 0) {
                    this.autoPlaceNextIngredient(ingredientType);
                } else {
                    // 只移除已切完的那个食材节点，不刷新所有
                    this.removeOneIngredientNode(ingredientType);
                }
                
                this.updateHint();
                this.checkAllComplete();
            })
            .start();
        
        console.log(`[ProcessingControllerV3] ✅ ${ingredientType} 切好了！剩余: ${remainingCount}`);

        EventManager.Instance.emit(GuideEvents.PROCESSING_CHOP, { ingredientType });
    }
    
    /**
     * 移除砧板上的食材（返回原位）
     */
    private removeTableVegetable() {
        if (!this.tableVegetable) return;
        
        // 销毁砧板上的显示节点
        if (this.tableVegetable.node) {
            this.tableVegetable.node.destroy();
        }
        
        // 🔥 如果有原始节点，将其返回原位
        if (this.tableVegetable.originalNode) {
            const originalNode = this.tableVegetable.originalNode;
            const originalPos = this.tableVegetable.originalPos;
            const originalScale = this.tableVegetable.originalScale;
            const ingredientType = this.tableVegetable.type;
            
            // 重新显示并添加回列表
            originalNode.active = true;
            originalNode.setScale(0, 0, 1);  // 从0开始动画

            // 添加回节点列表
            const nodeList = this.getNodeListForIngredient(ingredientType);
            nodeList.push(originalNode);
            
            // 返回动画
            tween(originalNode)
                .to(0.2, { scale: originalScale }, { easing: 'backOut' })
                .start();
            
            console.log(`[ProcessingControllerV3] 🔄 食材 ${ingredientType} 返回原位`);
        }
        
        this.tableVegetable = null;
    }
    
    /**
     * 自动放置下一个同类食材
     */
    private autoPlaceNextIngredient(ingredientType: string) {
        const nodeList = this.getNodeListForIngredient(ingredientType);
        const count = this.ingredientCounts.get(ingredientType);
        const container = this.getContainerForIngredient(ingredientType);
        
        // 🔥 计算需要的节点数：count.raw - 1（因为1个要放到砧板上）
        const neededNodes = count ? Math.max(0, count.raw - 1) : 0;
        
        // 🔥 如果节点数不足，重新创建足够的节点
        if (nodeList.length < neededNodes && count && count.raw > 0 && container) {
            console.log(`[ProcessingControllerV3] 节点不足: 当前${nodeList.length}个，需要${neededNodes}个，重新创建`);
            // 创建 count.raw 个节点（包括要放到砧板上的那个）
            this.createIngredientImages(ingredientType, count.raw, container, nodeList);
        }
        
        if (nodeList.length > 0) {
            // 取第一个食材节点
            const nextNode = nodeList[0];
            // 播放飞向砧板的动画
            this.animateIngredientToBoard(nextNode, ingredientType);
            
            // 🔥 放置后再次检查：如果列表空了但还有剩余库存（不含砧板上的），创建节点供用户查看
            this.scheduleOnce(() => {
                const currentCount = this.ingredientCounts.get(ingredientType);
                const currentList = this.getNodeListForIngredient(ingredientType);
                // count.raw - 1 是因为1个在砧板上
                const remainingToShow = currentCount ? Math.max(0, currentCount.raw - 1) : 0;
                if (currentList.length === 0 && remainingToShow > 0 && container) {
                    console.log(`[ProcessingControllerV3] 放置后节点为空，还需显示${remainingToShow}个，重新创建`);
                    this.createIngredientImages(ingredientType, remainingToShow, container, currentList);
                }
            }, 0.2);
        }
    }
    
    /**
     * 移除一个食材节点（不刷新全部）
     */
    private removeOneIngredientNode(ingredientType: string) {
        const nodeList = this.getNodeListForIngredient(ingredientType);
        
        if (nodeList.length > 0) {
            const nodeToRemove = nodeList.shift();
            if (nodeToRemove) {
                tween(nodeToRemove)
                    .to(0.15, { scale: new Vec3(0, 0, 1) })
                    .call(() => nodeToRemove.destroy())
                    .start();
            }
        }
    }
    
    // 记录每种食材已处理的份数（用于计算堆位置）
    private choppedPileCount: Map<string, number> = new Map();
    
    /**
     * 生成右侧堆积的切好碎屑
     * 🔥 命名规则: Chopped_{type}_{row}_{col}
     * 位置规则: 每行4个位置，position = row * 4 + col
     * 例如: Chopped_onion_0_0 对应位置0，Chopped_onion_1_0 对应位置4
     */
    private createChoppedPile(ingredientType: string) {
        if (!this.choppedContainer) {
            console.warn('[ProcessingControllerV3] choppedContainer 未配置');
            return;
        }

        // 🔥 选择碎屑图片 - 根据食材类型
        const holdFrames = this.getHoldFramesForIngredient(ingredientType);
        // 🔥 土豆和大葱使用文字+emoji，其他使用图片
        const useTextMode = ingredientType === 'potato' || ingredientType === 'green_onion';
        const hasFrames = !useTextMode && holdFrames && holdFrames.length > 0;
        console.log(`[ProcessingControllerV3] 🍽️ 创建碎屑: ${ingredientType}, 使用文字模式: ${useTextMode}, 有图片: ${hasFrames}`);

        // 🔥 获取食材的emoji和中文名
        const emoji = this.getEmojiForIngredient(ingredientType);
        const ingredientNames: { [key: string]: string } = {
            'onion': '洋葱',
            'cilantro': '香菜',
            'potato': '土豆',
            'green_onion': '大葱'
        };
        const ingredientName = ingredientNames[ingredientType] || ingredientType;
        const displayText = `${emoji} ${ingredientName}`;
        console.log(`[ProcessingControllerV3] 📝 显示文字: ${displayText}`);

        // 获取当前堆的编号 (0-5循环，最多6堆)
        const currentPileNum = this.choppedPileCount.get(ingredientType) || 0;
        const pileIndex = currentPileNum % 6;  // 洋葱和香菜都是6堆

        // 🔥 计算行列号 (每行4个位置)
        const colsPerRow = 4;
        const row = Math.floor(pileIndex / colsPerRow);
        const col = pileIndex % colsPerRow;

        // 更新计数
        this.choppedPileCount.set(ingredientType, currentPileNum + 1);

        // 🔥 使用编辑器中配置的堆位置 - 根据食材类型
        let pilePos: Vec2;
        if (ingredientType === 'onion' || ingredientType === 'potato') {
            // 土豆复用洋葱位置
            const positions = [this.onionPile1Pos, this.onionPile2Pos, this.onionPile3Pos, this.onionPile4Pos, this.onionPile5Pos, this.onionPile6Pos];
            pilePos = positions[pileIndex];
        } else if (ingredientType === 'green_onion') {
            // 大葱使用独立位置（左上区域）
            const positions = [this.greenOnionPile1Pos, this.greenOnionPile2Pos, this.greenOnionPile3Pos, this.greenOnionPile4Pos, this.greenOnionPile5Pos, this.greenOnionPile6Pos];
            pilePos = positions[pileIndex];
        } else {
            // 香菜使用原位置
            const positions = [this.cilantroPile1Pos, this.cilantroPile2Pos, this.cilantroPile3Pos, this.cilantroPile4Pos, this.cilantroPile5Pos, this.cilantroPile6Pos];
            pilePos = positions[pileIndex];
        }

        const baseX = pilePos.x;
        const baseY = pilePos.y;

        // 每堆生成3-4个重叠的碎屑
        const debrisPerPile = 3 + Math.floor(Math.random() * 2);

        for (let i = 0; i < debrisPerPile; i++) {
            // 🔥 使用行列命名: Chopped_{type}_{row}_{col}_{debrisIndex}
            const debrisNode = new Node(`Chopped_${ingredientType}_${row}_${col}_${i}`);

            // 🔥 优先使用碎屑图片，否则使用文字+emoji
            if (hasFrames) {
                const sprite = debrisNode.addComponent(Sprite);
                sprite.spriteFrame = holdFrames[Math.floor(Math.random() * holdFrames.length)];
                sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            } else {
                // 使用文字+emoji显示
                const label = debrisNode.addComponent(Label);
                label.string = displayText;
                label.fontSize = 24;
                label.horizontalAlign = Label.HorizontalAlign.CENTER;
                label.verticalAlign = Label.VerticalAlign.CENTER;
                label.enableOutline = true;
                label.outlineColor = new Color(0, 0, 0, 255);
                label.outlineWidth = 2;
            }

            const transform = debrisNode.getComponent(UITransform) || debrisNode.addComponent(UITransform);
            transform.setContentSize(80, 80);

            // 🔥 随机偏移（位置变化）
            const offsetX = (Math.random() - 0.5) * 25;  // -12.5 到 +12.5
            const offsetY = (Math.random() - 0.5) * 25 + i * 5;  // 随机 + 堆叠偏移

            const endPos = new Vec3(baseX + offsetX, baseY + offsetY, 0);
            console.log(`[ProcessingControllerV3] 📍 碎屑${i}目标位置: (${endPos.x.toFixed(1)}, ${endPos.y.toFixed(1)}), 基础位置: (${baseX}, ${baseY})`);

            // 🔥 随机缩放和旋转
            const scale = this.choppedScale + (Math.random() - 0.5) * 0.15;
            const rotation = (Math.random() - 0.5) * 90;  // -45到45度随机旋转

            this.choppedContainer.addChild(debrisNode);

            // 入场动画：从砧板位置飞向堆积位置
            debrisNode.setPosition(-300, 0, 0);
            debrisNode.setScale(0.2, 0.2, 1);
            debrisNode.eulerAngles = new Vec3(0, 0, rotation);

            tween(debrisNode)
                .delay(i * 0.06)
                .to(0.35, {
                    position: endPos,
                    scale: new Vec3(scale, scale, 1)
                }, { easing: 'backOut' })
                .start();
        }

        console.log(`[ProcessingControllerV3] ✅ 生成 ${ingredientType} 碎屑堆 [${row},${col}] 位置${pileIndex} (${debrisPerPile}个), 基础位置: (${baseX}, ${baseY})`);
    }
    
    /**
     * 检查是否全部完成
     */
    private checkAllComplete() {
        let hasRaw = false;
        this.ingredientCounts.forEach(count => {
            if (count.raw > 0) hasRaw = true;
        });
        
        if (!hasRaw && !this.tableVegetable) {
            this.onAllComplete();
        }
    }
    
    /**
     * 全部完成
     */
    private onAllComplete() {
        console.log('[ProcessingControllerV3] 🎉 全部食材加工完成！');
        
        if (this.nextButton) {
            this.nextButton.interactable = true;
        }
        
        const hintLabel = this.getHintLabel();
        if (hintLabel) {
            hintLabel.string = '🎉 全部准备完成！点击开始营业';
            hintLabel.color = new Color(100, 255, 100, 255);
        }
        
        // 放下刀具
        if (this.isHoldingKnife) {
            this.putDownKnife();
        }

        EventManager.Instance.emit(GuideEvents.PROCESSING_COMPLETE);
    }
    
    /**
     * 进入下一阶段
     */
    private onNextPhase() {
        console.log('[ProcessingControllerV3] 进入烹饪阶段');

        // 🔥 保存关卡状态
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.saveLevelState();
        }

        // 🔥 根据关卡选择正确的烹饪场景
        const progressManager = GameProgressManager.instance;
        let levelId = inventory?.currentLevel?.levelId || 1;
        if (progressManager?.progress?.currentLevel) {
            levelId = progressManager.progress.currentLevel;
        }

        // 新主流程固定进入单营业主场景
        console.log(`[ProcessingControllerV3] 🔥 关卡 ${levelId} -> 跳转单营业主场景`);
        SceneRouteService.goBusiness();

        EventManager.Instance.emit(GuideEvents.PROCESSING_NEXT);
    }

    /**
     * 测试按钮：一键完成备菜
     */
    public onQuickPrepareButtonClick() {
        if (this._isAnimatingIngredient) {
            this.scheduleOnce(() => this.onQuickPrepareButtonClick(), 0.35);
            return;
        }

        const inventory = InventoryManager.instance;
        let processedAny = false;

        this.ingredientCounts.forEach((count, ingredientType) => {
            if (count.raw <= 0) return;
            processedAny = true;

            if (inventory) {
                inventory.processIngredient(ingredientType as IngredientType, count.raw);
                const updated = inventory.getIngredientCount(ingredientType as IngredientType);
                count.raw = updated.raw;
                count.processed = updated.processed;
            } else {
                count.processed += count.raw;
                count.raw = 0;
            }
        });

        this.cleanupTableVegetable();
        this.clearIngredientNodes();
        this.updateHint();
        this.checkAllComplete();

        EventManager.Instance.emit(GuideEvents.PROCESSING_COMPLETE);

        if (processedAny) {
            console.log('[ProcessingControllerV3] ⚡ 一键完成备菜');
        }
    }

    private cleanupTableVegetable() {
        if (this.tableVegetable?.node && this.tableVegetable.node.isValid) {
            this.tableVegetable.node.destroy();
        }
        if (this.tableVegetable?.originalNode && this.tableVegetable.originalNode.isValid) {
            this.tableVegetable.originalNode.destroy();
        }
        this.tableVegetable = null;

        if (this._pendingOriginalNode && this._pendingOriginalNode.isValid) {
            this._pendingOriginalNode.destroy();
        }
        this._pendingOriginalNode = null;
        this._isCompletingChop = false;
        this._isAnimatingIngredient = false;
    }

    private clearIngredientNodes() {
        const lists: Node[][] = [
            this.onionNodes,
            this.cilantroNodes,
            this.potatoNodes,
            this.greenOnionNodes,
            this.level2CilantroNodes
        ];

        lists.forEach(list => {
            list.forEach(node => {
                if (node && node.isValid) {
                    node.destroy();
                }
            });
            list.length = 0;
        });
    }
    
    // ==================== 鼠标跟随功能 ====================
    
    /**
     * 设置鼠标跟随监听
     */
    private setupMouseFollower() {
        // 监听鼠标移动
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        
        // 设置原生鼠标监听（更流畅）
        this.setupNativeMouseListener();
        
        console.log('[ProcessingControllerV3] ✅ 鼠标跟随已设置');
    }
    
    /**
     * 设置原生 canvas 鼠标监听（绕过 Cocos UI 事件系统，更流畅）
     */
    private setupNativeMouseListener() {
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
            if (!this._isMouseFollowing || !this.knifeNode) return;
            
            const rect = canvas.getBoundingClientRect();
            
            // 检查鼠标是否在 canvas 区域内
            if (e.clientX < rect.left || e.clientX > rect.right ||
                e.clientY < rect.top || e.clientY > rect.bottom) {
                return;
            }
            
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const screenX = (e.clientX - rect.left) * scaleX;
            const screenY = (rect.height - (e.clientY - rect.top)) * scaleY;

            this.updateKnifeFollowFromScreen(new Vec2(screenX, screenY));
        };
        
        window.addEventListener('mousemove', this._nativeMouseMoveHandler);
    }
    
    /**
     * 移除原生鼠标监听
     */
    private removeNativeMouseListener() {
        if (this._nativeMouseMoveHandler) {
            window.removeEventListener('mousemove', this._nativeMouseMoveHandler);
            this._nativeMouseMoveHandler = null;
        }
    }
    
    /**
     * Cocos 鼠标移动事件处理
     */
    private onMouseMove(event: EventMouse) {
        if (!this._isMouseFollowing || !this.knifeNode) return;

        this.updateKnifeFollowFromScreen(event.getLocation());
    }
    
    /**
     * 启动鼠标跟随
     */
    private startMouseFollowing(event: EventTouch) {
        this._isMouseFollowing = true;
        
        // 初始化鼠标位置
        this.updateKnifeFollowFromScreen(event.getLocation());
        this.applyKnifeFollowPosition();
        
        console.log('[ProcessingControllerV3] 🖱️ 开始鼠标跟随');
    }
    
    /**
     * 停止鼠标跟随
     */
    private stopMouseFollowing() {
        this._isMouseFollowing = false;
        console.log('[ProcessingControllerV3] 🖱️ 停止鼠标跟随');
    }

    private getKnifeSprite(): Sprite | null {
        if (this._knifeSprite && this._knifeSprite.isValid) {
            return this._knifeSprite;
        }
        if (!this.knifeNode) return null;
        this._knifeSprite = this.knifeNode.getComponent(Sprite);
        return this._knifeSprite;
    }

    private ensureKnifeFollower() {
        if (this._knifeSpriteNode && this._knifeSpriteNode.isValid) return;
        if (!this.knifeNode || !this.knifeNode.parent) return;

        const follower = new Node('KnifeFollower');
        const transform = follower.addComponent(UITransform);
        const originalTransform = this.knifeNode.getComponent(UITransform);
        if (originalTransform) {
            transform.setContentSize(originalTransform.contentSize);
        }

        const sprite = follower.addComponent(Sprite);
        const originalSprite = this.getKnifeSprite();
        if (originalSprite) {
            sprite.spriteFrame = originalSprite.spriteFrame;
            sprite.color = originalSprite.color.clone();
            sprite.sizeMode = originalSprite.sizeMode;
            sprite.type = originalSprite.type;
        }

        follower.setScale(this.knifeNode.scale);
        follower.active = false;
        this.knifeNode.parent.addChild(follower);
        this._knifeSpriteNode = follower;
    }

    private toggleKnifeFollower(active: boolean) {
        if (!this._knifeSpriteNode || !this._knifeSpriteNode.isValid) return;
        const originalSprite = this.getKnifeSprite();
        if (originalSprite) {
            originalSprite.enabled = !active;
        }
        this._knifeSpriteNode.active = active;
    }

    private getKnifeFollowNode(): Node | null {
        if (this._knifeSpriteNode && this._knifeSpriteNode.isValid && this._knifeSpriteNode.active) {
            return this._knifeSpriteNode;
        }
        return this.knifeNode;
    }

    /**
     * 根据 UI 坐标更新刀具跟随缓存（参考第一关的鼠标跟随逻辑）
     */
    private updateKnifeFollowFromScreen(screenPos: Vec2) {
        const camera = this.getCanvasCamera();
        if (!camera) return;

        const worldPos = camera.screenToWorld(new Vec3(screenPos.x, screenPos.y, 0));
        this._currentMouseWorldPos.set(worldPos);

        if (this._isMouseFollowing) {
            this.applyKnifeFollowPosition();
        }
    }

    private getCanvasTransform(): UITransform | null {
        if (this._canvasTransform && this._canvasTransform.isValid) {
            return this._canvasTransform;
        }
        const scene = director.getScene();
        const canvasNode = scene?.getChildByName('Canvas');
        if (!canvasNode) return null;
        this._canvasTransform = canvasNode.getComponent(UITransform);
        return this._canvasTransform;
    }

    private getCanvasCamera(): Camera | null {
        if (this._canvasCamera && this._canvasCamera.isValid) {
            return this._canvasCamera;
        }
        const scene = director.getScene();
        const canvasNode = scene?.getChildByName('Canvas');
        if (!canvasNode) return null;
        const canvasComp = canvasNode.getComponent(Canvas);
        this._canvasCamera = canvasComp?.cameraComponent || null;
        return this._canvasCamera;
    }

    private applyKnifeFollowPosition() {
        const followNode = this.getKnifeFollowNode();
        if (!followNode) return;
        followNode.setWorldPosition(this._currentMouseWorldPos);
        followNode.setSiblingIndex(9999);
    }
}




