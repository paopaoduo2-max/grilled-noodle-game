import { _decorator, Component, Node, Label, Button, Sprite, Color, UITransform, Vec3, tween, EventTouch, director, Tween } from 'cc';
import { IngredientType, GameConfig } from '../Data/GameConfig';
import { InventoryManager } from '../Manager/InventoryManager';
import { GameProgressManager } from '../Manager/GameProgressManager';
import { SHOP_ITEMS, getProcessingItems, ShopItemData } from '../Data/ShopData';
import { SceneRouteService } from '../Manager/SceneRouteService';

const { ccclass, property } = _decorator;

/**
 * 食材切碎状态
 */
enum ChopState {
    WHOLE = 0,      // 完整
    HALF = 1,       // 切半
    DICED = 2,      // 切块
    MINCED = 3      // 切碎（完成）
}

// 食材状态显示配置
const CHOP_STATE_CONFIG = {
    [IngredientType.ONION]: {
        [ChopState.WHOLE]: { emoji: '🧅', desc: '完整洋葱' },
        [ChopState.HALF]: { emoji: '🧅⚪', desc: '切半' },
        [ChopState.DICED]: { emoji: '⚪⚪⚪', desc: '切块' },
        [ChopState.MINCED]: { emoji: '✨', desc: '切碎完成' }
    },
    [IngredientType.CILANTRO]: {
        [ChopState.WHOLE]: { emoji: '🌿', desc: '完整香菜' },
        [ChopState.HALF]: { emoji: '🌿🍃', desc: '切段' },
        [ChopState.DICED]: { emoji: '🍃🍃🍃', desc: '切小段' },
        [ChopState.MINCED]: { emoji: '✨', desc: '切碎完成' }
    },
    // 第二关东北饭包食材
    [IngredientType.GREEN_ONION]: {
        [ChopState.WHOLE]: { emoji: '🧅', desc: '完整大葱' },
        [ChopState.HALF]: { emoji: '🧅⚪', desc: '切半' },
        [ChopState.DICED]: { emoji: '⚪⚪⚪', desc: '切葱花' },
        [ChopState.MINCED]: { emoji: '✨', desc: '切碎完成' }
    },
    [IngredientType.POTATO]: {
        [ChopState.WHOLE]: { emoji: '🥔', desc: '完整土豆' },
        [ChopState.HALF]: { emoji: '🥔⚪', desc: '切半' },
        [ChopState.DICED]: { emoji: '⚪⚪⚪', desc: '切丁' },
        [ChopState.MINCED]: { emoji: '✨', desc: '切碎完成' }
    }
};

/**
 * 加工中的单个食材
 */
interface ProcessingItem {
    type: IngredientType;
    name: string;
    baseEmoji: string;
    chopState: ChopState;
    progress: number;        // 当前进度 0-100
    isComplete: boolean;
}

/**
 * 食材加工控制器 - 连点加速版
 * 
 * 玩法：
 * 1. 长按菜板 = 默认速度切菜
 * 2. 快速连点 = 加速切菜（最高3倍速）
 * 3. 食材有4种状态：完整 → 切半 → 切块 → 切碎
 */
@ccclass('ProcessingController')
export class ProcessingController extends Component {
    @property(Node)
    choppingBoard: Node = null;
    
    @property(Label)
    ingredientLabel: Label = null;
    
    @property(Label)
    progressLabel: Label = null;
    
    @property(Node)
    progressBar: Node = null;
    
    @property(Node)
    progressBarBg: Node = null;
    
    @property(Node)
    knifeNode: Node = null;
    
    @property(Node)
    queueContainer: Node = null;
    
    @property(Node)
    completedContainer: Node = null;
    
    @property(Button)
    nextButton: Button = null;
    
    @property(Label)
    hintLabel: Label = null;
    
    // 速度显示
    private speedLabel: Label = null;
    private comboLabel: Label = null;
    
    // 加工队列
    private processingQueue: ProcessingItem[] = [];
    private currentItem: ProcessingItem | null = null;
    private completedCount: number = 0;
    
    // 食材选择面板
    private ingredientPanel: Node = null;
    private ingredientButtons: Map<string, Node> = new Map();
    
    // 长按状态
    private isHolding: boolean = false;
    
    // 连点加速系统 - 更激进的加速
    private clickTimes: number[] = [];           // 记录点击时间
    private readonly CLICK_WINDOW = 1200;        // 连点检测窗口(ms) - 1.2秒
    private readonly MAX_SPEED_MULTIPLIER = 8;   // 最大加速倍数（8倍！）
    private currentSpeedMultiplier: number = 1;  // 当前速度倍数
    private comboCount: number = 0;              // 连击数
    private targetSpeedMultiplier: number = 1;   // 目标速度（用于平滑过渡）
    
    // 配置 - 更明显的加速效果
    private readonly BASE_PROGRESS_SPEED = 25;   // 基础每秒进度（降低基础速度）
    private readonly CLICK_PROGRESS_BONUS = 12;  // 每次点击额外进度（增加点击奖励）
    private readonly PROGRESS_PER_STATE = 25;    // 每个状态需要的进度
    
    // 动画状态
    private knifeAnimating: boolean = false;
    private knifeTween: Tween<Node> | null = null;
    private lastChopTime: number = 0;            // 上次切菜时间
    
    onLoad() {
        this.setupUI();
        this.setupEvents();
    }
    
    start() {
        // 延迟一帧，确保 InventoryManager 已完全初始化
        this.scheduleOnce(() => {
            console.log('[ProcessingController] 延迟初始化开始');
            this.loadProcessingQueue();
            this.startNextItem();
        }, 0.1);
    }
    
    update(dt: number) {
        if (!this.currentItem || this.currentItem.isComplete) return;
        
        // 平滑过渡到目标速度
        if (this.currentSpeedMultiplier < this.targetSpeedMultiplier) {
            this.currentSpeedMultiplier = Math.min(
                this.targetSpeedMultiplier,
                this.currentSpeedMultiplier + dt * 8  // 快速加速
            );
            this.updateSpeedDisplay();
        }
        
        // 长按时自动增加进度
        if (this.isHolding) {
            const progressGain = this.BASE_PROGRESS_SPEED * this.currentSpeedMultiplier * dt;
            this.addProgress(progressGain);
            
            // 长按时也播放切菜动画（根据速度调整频率）
            const now = Date.now();
            const chopInterval = 180 / this.currentSpeedMultiplier;  // 速度越快，间隔越短
            if (now - this.lastChopTime > chopInterval) {
                this.lastChopTime = now;
                this.playChopAnimation();
            }
        }
        
        // 衰减速度倍数
        this.decaySpeedMultiplier(dt);
    }
    
    private setupUI() {
        const canvas = this.node.parent;
        if (!canvas) return;
        
        // ==================== 创建背景 ====================
        const bgNode = new Node('ProcessingBg');
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.color = new Color(60, 50, 45, 255);
        const bgTransform = bgNode.getComponent(UITransform);
        if (bgTransform) bgTransform.setContentSize(1280, 720);
        canvas.addChild(bgNode);
        bgNode.setSiblingIndex(0);
        
        // ==================== 工作区域标题 ====================
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '🔪 备菜';
        titleLabel.fontSize = 26;
        titleLabel.color = new Color(255, 200, 100, 255);
        titleNode.setPosition(0, 310, 0);
        canvas.addChild(titleNode);
        
        // ==================== 砧板区域 ====================
        if (this.choppingBoard) {
            // 砧板背景 - 木质纹理效果
            const sprite = this.choppingBoard.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(160, 120, 80, 255);
            }
            
            const transform = this.choppingBoard.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(450, 320);
            }
            
            // 砧板边框
            const boardBorder = new Node('BoardBorder');
            const borderSprite = boardBorder.addComponent(Sprite);
            borderSprite.color = new Color(100, 70, 40, 255);
            const borderTransform = boardBorder.getComponent(UITransform);
            if (borderTransform) borderTransform.setContentSize(460, 330);
            boardBorder.setPosition(0, 0, 0);
            this.choppingBoard.addChild(boardBorder);
            boardBorder.setSiblingIndex(0);
            
            // 木纹效果
            for (let i = 0; i < 6; i++) {
                const grain = new Node(`WoodGrain_${i}`);
                const grainSprite = grain.addComponent(Sprite);
                grainSprite.color = new Color(140, 100, 60, 80);
                const grainTransform = grain.getComponent(UITransform);
                if (grainTransform) grainTransform.setContentSize(430, 3);
                grain.setPosition(0, -130 + i * 50, 0);
                this.choppingBoard.addChild(grain);
            }
        }
        
        // ==================== 刀具 ====================
        if (!this.knifeNode && this.choppingBoard) {
            this.knifeNode = new Node('Knife');
            const knifeLabel = this.knifeNode.addComponent(Label);
            knifeLabel.string = '🔪';
            knifeLabel.fontSize = 100;
            this.knifeNode.setPosition(160, 100, 0);
            this.choppingBoard.addChild(this.knifeNode);
            
            // 刀光效果
            const glowNode = new Node('KnifeGlow');
            const glowLabel = glowNode.addComponent(Label);
            glowLabel.string = '✨';
            glowLabel.fontSize = 30;
            glowLabel.color = new Color(255, 255, 200, 0);
            glowNode.setPosition(0, 30, 0);
            this.knifeNode.addChild(glowNode);
        }
        
        // ==================== 食材显示区域 ====================
        const ingredientArea = new Node('IngredientArea');
        const ingredientBg = ingredientArea.addComponent(Sprite);
        ingredientBg.color = new Color(120, 90, 60, 150);
        const ingredientTransform = ingredientArea.getComponent(UITransform);
        if (ingredientTransform) ingredientTransform.setContentSize(180, 180);
        ingredientArea.setPosition(-80, 20, 0);
        this.choppingBoard?.addChild(ingredientArea);
        
        // ==================== 进度条 ====================
        if (!this.progressBarBg && this.choppingBoard) {
            // 进度条容器
            const progressContainer = new Node('ProgressContainer');
            progressContainer.setPosition(0, -180, 0);
            this.choppingBoard.addChild(progressContainer);
            
            // 进度条背景
            this.progressBarBg = new Node('ProgressBarBg');
            const bgSprite = this.progressBarBg.addComponent(Sprite);
            bgSprite.color = new Color(30, 25, 20, 255);
            const pbgTransform = this.progressBarBg.getComponent(UITransform);
            if (pbgTransform) {
                pbgTransform.setContentSize(360, 35);
            }
            progressContainer.addChild(this.progressBarBg);
            
            // 进度条边框
            const progressBorder = new Node('ProgressBorder');
            const pBorderSprite = progressBorder.addComponent(Sprite);
            pBorderSprite.color = new Color(80, 60, 40, 255);
            const pBorderTransform = progressBorder.getComponent(UITransform);
            if (pBorderTransform) pBorderTransform.setContentSize(366, 41);
            progressBorder.setSiblingIndex(0);
            progressContainer.addChild(progressBorder);
            
            // 进度条填充
            this.progressBar = new Node('ProgressBar');
            const barSprite = this.progressBar.addComponent(Sprite);
            barSprite.color = new Color(100, 200, 100, 255);
            const barTransform = this.progressBar.getComponent(UITransform);
            if (barTransform) {
                barTransform.setContentSize(0, 29);
                barTransform.anchorX = 0;
            }
            this.progressBar.setPosition(-177, 0, 0);
            progressContainer.addChild(this.progressBar);
            
            // 状态分隔线和标签
            const stateLabels = ['完整', '切半', '切块', '切碎'];
            for (let i = 0; i < 4; i++) {
                // 分隔线
                if (i > 0) {
                    const divider = new Node(`Divider_${i}`);
                    const divSprite = divider.addComponent(Sprite);
                    divSprite.color = new Color(60, 50, 40, 255);
                    const divTransform = divider.getComponent(UITransform);
                    if (divTransform) divTransform.setContentSize(3, 35);
                    divider.setPosition(-177 + 88 * i, 0, 0);
                    progressContainer.addChild(divider);
                }
                
                // 状态标签
                const stateLabel = new Node(`StateLabel_${i}`);
                const sLabel = stateLabel.addComponent(Label);
                sLabel.string = stateLabels[i];
                sLabel.fontSize = 10;
                sLabel.color = new Color(150, 140, 130, 200);
                stateLabel.setPosition(-133 + 88 * i, 25, 0);
                progressContainer.addChild(stateLabel);
            }
        }
        
        // ==================== 速度和连击显示 ====================
        if (this.choppingBoard) {
            // 速度显示（简化）
            const speedNode = new Node('SpeedLabel');
            this.speedLabel = speedNode.addComponent(Label);
            this.speedLabel.string = '⚡1.0x';
            this.speedLabel.fontSize = 18;
            this.speedLabel.color = new Color(255, 255, 255, 180);
            speedNode.setPosition(180, -150, 0);
            this.choppingBoard.addChild(speedNode);
            
            // 连击显示
            const comboNode = new Node('ComboLabel');
            this.comboLabel = comboNode.addComponent(Label);
            this.comboLabel.string = '';
            this.comboLabel.fontSize = 28;
            this.comboLabel.color = new Color(255, 200, 50, 255);
            comboNode.setPosition(0, 150, 0);
            this.choppingBoard.addChild(comboNode);
            
            // 提示文字（简化）
            const hintNode = new Node('HintLabel');
            this.hintLabel = hintNode.addComponent(Label);
            this.hintLabel.string = '点击切菜';
            this.hintLabel.fontSize = 14;
            this.hintLabel.color = new Color(180, 180, 160, 180);
            hintNode.setPosition(0, -220, 0);
            this.choppingBoard.addChild(hintNode);
        }
        
        console.log('[ProcessingController] ✅ 新版UI初始化完成');
    }
    
    /**
     * 创建食材选择面板
     */
    private createIngredientPanel() {
        const canvas = this.node.parent;
        if (!canvas) return;
        
        // 创建左侧面板
        this.ingredientPanel = new Node('IngredientPanel');
        const panelSprite = this.ingredientPanel.addComponent(Sprite);
        panelSprite.color = new Color(50, 50, 70, 230);
        
        // Sprite 会自动添加 UITransform，直接获取并设置
        const panelTransform = this.ingredientPanel.getComponent(UITransform);
        if (panelTransform) {
            panelTransform.setContentSize(140, 320);
        }
        this.ingredientPanel.setPosition(-300, 0, 0);
        
        // 标题（简化）
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '📦 待加工';
        titleLabel.fontSize = 15;
        titleLabel.color = new Color(255, 255, 255, 255);
        titleNode.setPosition(0, 140, 0);
        this.ingredientPanel.addChild(titleNode);
        
        canvas.addChild(this.ingredientPanel);
    }
    
    /**
     * 更新食材选择面板
     */
    private updateIngredientPanel() {
        if (!this.ingredientPanel) return;
        
        // 清除旧按钮
        this.ingredientButtons.forEach((btn) => btn.destroy());
        this.ingredientButtons.clear();
        
        // 统计每种食材的数量
        const ingredientCounts: Map<string, { name: string, emoji: string, total: number, done: number }> = new Map();
        
        for (const item of this.processingQueue) {
            const key = item.type;
            if (!ingredientCounts.has(key)) {
                ingredientCounts.set(key, {
                    name: item.name,
                    emoji: item.baseEmoji,
                    total: 0,
                    done: 0
                });
            }
            const count = ingredientCounts.get(key)!;
            count.total++;
            if (item.isComplete) count.done++;
        }
        
        // 创建按钮
        let yOffset = 100;
        ingredientCounts.forEach((info, type) => {
            const remaining = info.total - info.done;
            if (remaining <= 0) return;
            
            const btnNode = new Node(`Btn_${type}`);
            const btnSprite = btnNode.addComponent(Sprite);
            
            // 当前正在加工的高亮
            const isCurrentType = this.currentItem?.type === type;
            btnSprite.color = isCurrentType 
                ? new Color(100, 150, 100, 255) 
                : new Color(70, 70, 90, 255);
            
            // Sprite 会自动添加 UITransform，直接获取
            const btnTransform = btnNode.getComponent(UITransform);
            if (btnTransform) {
                btnTransform.setContentSize(130, 40);
            }
            btnNode.setPosition(0, yOffset, 0);
            
            // 食材信息（简化：图标+数量）
            const infoNode = new Node('Info');
            const infoLabel = infoNode.addComponent(Label);
            infoLabel.string = `${info.emoji} ${remaining}/${info.total}`;
            infoLabel.fontSize = 16;
            infoLabel.color = isCurrentType 
                ? new Color(255, 255, 100, 255) 
                : new Color(255, 255, 255, 255);
            infoNode.setPosition(0, 0, 0);
            btnNode.addChild(infoNode);
            
            // 点击事件
            btnNode.on(Node.EventType.TOUCH_END, () => {
                this.selectIngredient(type);
            });
            
            this.ingredientPanel.addChild(btnNode);
            this.ingredientButtons.set(type, btnNode);
            
            yOffset -= 50;
        });
    }
    
    /**
     * 选择要加工的食材
     */
    private selectIngredient(type: string) {
        // 找到该类型的第一个未完成的食材
        const nextItem = this.processingQueue.find(item => 
            item.type === type && !item.isComplete
        );
        
        if (nextItem && nextItem !== this.currentItem) {
            console.log(`[ProcessingController] 切换到加工: ${nextItem.name}`);
            this.currentItem = nextItem;
            this.currentItem.progress = 0;
            this.currentItem.chopState = ChopState.WHOLE;
            this.updateDisplay();
            this.updateIngredientPanel();
            this.showHint();
        }
    }
    
    private setupEvents() {
        if (this.choppingBoard) {
            this.choppingBoard.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.choppingBoard.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.choppingBoard.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        }
        
        if (this.nextButton) {
            this.nextButton.node.on(Button.EventType.CLICK, this.onNextPhase, this);
            this.nextButton.interactable = false;
        }
    }
    
    /**
     * 加载加工队列
     */
    private loadProcessingQueue() {
        const inventory = InventoryManager.instance;
        if (!inventory) {
            console.error('[ProcessingController] ❌ InventoryManager 未初始化');
            return;
        }

        console.log('[ProcessingController] 开始加载加工队列...');
        console.log(`[ProcessingController] currentLevel 存在: ${!!inventory.currentLevel}`);

        this.processingQueue = [];
        this.completedCount = 0;

        // 🔥 优先从 GameProgressManager 获取关卡ID（场景切换后仍保持正确值）
        const progressManager = GameProgressManager.instance;
        let levelId = inventory.currentLevel?.levelId || 1;
        if (progressManager?.progress?.currentLevel) {
            levelId = progressManager.progress.currentLevel;
        }
        console.log(`[ProcessingController] 🔥 使用关卡ID: ${levelId}`);

        const processingItems = getProcessingItems(levelId);
        console.log(`[ProcessingController] 关卡${levelId}需要加工的商品类型: ${processingItems.map(i => i.name).join(', ')}`);

        for (const shopItem of processingItems) {
            const count = inventory.getIngredientCount(shopItem.ingredientType);
            console.log(`[ProcessingController] ${shopItem.name}: raw=${count.raw}, processed=${count.processed}`);

            for (let i = 0; i < count.raw; i++) {
                this.processingQueue.push({
                    type: shopItem.ingredientType,
                    name: shopItem.name,
                    baseEmoji: shopItem.emoji,
                    chopState: ChopState.WHOLE,
                    progress: 0,
                    isComplete: false
                });
            }
        }

        console.log(`[ProcessingController] ✅ 加载了 ${this.processingQueue.length} 个待加工食材`);

        // 创建食材选择面板
        this.createIngredientPanel();

        if (this.processingQueue.length === 0) {
            console.log('[ProcessingController] ⚠️ 没有待加工食材，直接完成');
            this.onAllComplete();
        }
    }
    
    private startNextItem() {
        this.currentItem = this.processingQueue.find(item => !item.isComplete) || null;
        
        if (this.currentItem) {
            this.currentItem.progress = 0;
            this.currentItem.chopState = ChopState.WHOLE;
            this.updateDisplay();
            this.updateIngredientPanel();
            this.showHint();
        } else {
            this.onAllComplete();
        }
    }
    
    private onTouchStart(event: EventTouch) {
        if (!this.currentItem || this.currentItem.isComplete) return;
        
        this.isHolding = true;
        
        // 记录点击时间用于连点检测
        const now = Date.now();
        this.clickTimes.push(now);
        
        // 清理过期的点击记录
        this.clickTimes = this.clickTimes.filter(t => now - t < this.CLICK_WINDOW);
        
        // 计算连点速度加成
        this.calculateSpeedBonus();
        
        // 每次点击给予额外进度
        this.addProgress(this.CLICK_PROGRESS_BONUS * this.currentSpeedMultiplier);
        
        // 播放切菜动画
        this.playChopAnimation();
    }
    
    private onTouchEnd(event: EventTouch) {
        this.isHolding = false;
    }
    
    /**
     * 计算连点速度加成 - v5 更激进的加速
     * 使用指数增长，让加速感更明显
     * 1次=1.5x, 2次=2x, 3次=2.8x, 4次=3.5x, 5次=4.5x, 6次=5.5x, 7次=6.5x, 8次=8x
     */
    private calculateSpeedBonus() {
        const clickCount = this.clickTimes.length;
        
        // 指数增长：加速感更明显
        let speed = 1.0;
        if (clickCount >= 1) speed = 1.5;
        if (clickCount >= 2) speed = 2.0;
        if (clickCount >= 3) speed = 2.8;
        if (clickCount >= 4) speed = 3.5;
        if (clickCount >= 5) speed = 4.5;
        if (clickCount >= 6) speed = 5.5;
        if (clickCount >= 7) speed = 6.5;
        if (clickCount >= 8) speed = 8.0;
        
        this.targetSpeedMultiplier = Math.min(this.MAX_SPEED_MULTIPLIER, speed);
        this.comboCount = clickCount;
        
        console.log(`[ProcessingController] 连点: ${clickCount} → 目标速度: ${this.targetSpeedMultiplier.toFixed(1)}x (v5)`);
    }
    
    /**
     * 速度倍数衰减 - 松手后缓慢降速
     */
    private decaySpeedMultiplier(dt: number) {
        if (!this.isHolding) {
            // 目标速度也要衰减
            this.targetSpeedMultiplier = Math.max(1, this.targetSpeedMultiplier - dt * 1.5);
            // 当前速度向目标速度靠拢
            if (this.currentSpeedMultiplier > this.targetSpeedMultiplier) {
                this.currentSpeedMultiplier = Math.max(
                    this.targetSpeedMultiplier,
                    this.currentSpeedMultiplier - dt * 3
                );
                this.updateSpeedDisplay();
            }
        }
    }
    
    private updateSpeedDisplay() {
        if (this.speedLabel) {
            const speedText = this.currentSpeedMultiplier.toFixed(1);
            this.speedLabel.string = `⚡ ${speedText}x`;
            
            // 根据速度变色（更多档位，更鲜艳）
            if (this.currentSpeedMultiplier >= 7) {
                this.speedLabel.color = new Color(255, 0, 255, 255);    // 亮紫色 - 神速
                this.speedLabel.fontSize = 32;
            } else if (this.currentSpeedMultiplier >= 5.5) {
                this.speedLabel.color = new Color(255, 50, 150, 255);   // 粉紫色 - 极速
                this.speedLabel.fontSize = 30;
            } else if (this.currentSpeedMultiplier >= 4) {
                this.speedLabel.color = new Color(255, 50, 50, 255);    // 红色 - 狂暴
                this.speedLabel.fontSize = 28;
            } else if (this.currentSpeedMultiplier >= 3) {
                this.speedLabel.color = new Color(255, 120, 50, 255);   // 橙色 - 快速
                this.speedLabel.fontSize = 26;
            } else if (this.currentSpeedMultiplier >= 2) {
                this.speedLabel.color = new Color(255, 200, 50, 255);   // 黄色 - 加速
                this.speedLabel.fontSize = 24;
            } else if (this.currentSpeedMultiplier >= 1.5) {
                this.speedLabel.color = new Color(200, 255, 100, 255);  // 黄绿色
                this.speedLabel.fontSize = 22;
            } else {
                this.speedLabel.color = new Color(255, 255, 255, 200);  // 白色
                this.speedLabel.fontSize = 20;
            }
        }
        
        if (this.comboLabel) {
            // 根据速度显示不同效果
            const speed = this.currentSpeedMultiplier;
            if (speed >= 7) {
                this.comboLabel.string = `🌟 神速切菜！！！`;
                this.comboLabel.color = new Color(255, 0, 255, 255);
            } else if (speed >= 5.5) {
                this.comboLabel.string = `💥 极速模式！！`;
                this.comboLabel.color = new Color(255, 50, 150, 255);
            } else if (speed >= 4) {
                this.comboLabel.string = `🔥 狂暴切菜！`;
                this.comboLabel.color = new Color(255, 80, 80, 255);
            } else if (speed >= 3) {
                this.comboLabel.string = `⚡ 快速切菜`;
                this.comboLabel.color = new Color(255, 150, 50, 255);
            } else if (speed >= 2) {
                this.comboLabel.string = `👍 加速中`;
                this.comboLabel.color = new Color(255, 220, 50, 255);
            } else if (speed >= 1.5) {
                this.comboLabel.string = `✨ 连击`;
                this.comboLabel.color = new Color(200, 255, 100, 255);
            } else {
                this.comboLabel.string = '';
            }
            
            // 连击动画 - 速度越快动画越明显
            if (speed >= 1.5) {
                const scaleBonus = 1 + (speed - 1) * 0.08;
                tween(this.comboLabel.node)
                    .to(0.03, { scale: new Vec3(scaleBonus, scaleBonus, 1) })
                    .to(0.06, { scale: new Vec3(1, 1, 1) })
                    .start();
            }
        }
    }
    
    /**
     * 增加进度
     */
    private addProgress(amount: number) {
        if (!this.currentItem || this.currentItem.isComplete) return;
        
        this.currentItem.progress += amount;
        
        // 检查状态变化
        const newState = Math.min(
            ChopState.MINCED,
            Math.floor(this.currentItem.progress / this.PROGRESS_PER_STATE)
        );
        
        if (newState > this.currentItem.chopState) {
            this.currentItem.chopState = newState;
            this.onStateChange(newState);
        }
        
        // 检查是否完成
        if (this.currentItem.progress >= this.PROGRESS_PER_STATE * 4) {
            this.completeCurrentItem();
        }
        
        this.updateDisplay();
    }
    
    /**
     * 状态变化时的反馈
     */
    private onStateChange(newState: ChopState) {
        if (!this.currentItem) return;
        
        const stateConfig = CHOP_STATE_CONFIG[this.currentItem.type];
        const stateInfo = stateConfig ? stateConfig[newState] : null;
        
        // 状态变化动画
        if (this.ingredientLabel) {
            tween(this.ingredientLabel.node)
                .to(0.1, { scale: new Vec3(1.3, 1.3, 1) })
                .to(0.15, { scale: new Vec3(1, 1, 1) })
                .start();
        }
        
        // 进度条颜色变化
        if (this.progressBar) {
            const sprite = this.progressBar.getComponent(Sprite);
            if (sprite) {
                switch (newState) {
                    case ChopState.HALF:
                        sprite.color = new Color(150, 220, 100, 255);
                        break;
                    case ChopState.DICED:
                        sprite.color = new Color(200, 230, 80, 255);
                        break;
                    case ChopState.MINCED:
                        sprite.color = new Color(255, 215, 0, 255);
                        break;
                }
            }
        }
        
        console.log(`[ProcessingController] 状态变化: ${stateInfo?.desc || newState}`);
    }
    
    private playChopAnimation() {
        if (!this.knifeNode) return;
        
        // 停止之前的动画
        if (this.knifeTween) {
            this.knifeTween.stop();
        }
        
        // 根据速度调整动画速度
        const animSpeed = 0.12 / this.currentSpeedMultiplier;
        const knifeStartY = 120;
        const knifeEndY = -30;
        
        this.knifeAnimating = true;
        
        // 刀具切下动画
        this.knifeTween = tween(this.knifeNode)
            .to(animSpeed * 0.3, { 
                position: new Vec3(160, knifeEndY, 0), 
                angle: -20 
            }, { easing: 'quadIn' })
            .call(() => {
                // 切中时的特效
                this.playChopEffect();
            })
            .to(animSpeed * 0.7, { 
                position: new Vec3(160, knifeStartY, 0), 
                angle: 5 
            }, { easing: 'quadOut' })
            .to(animSpeed * 0.2, { angle: 0 })
            .call(() => {
                this.knifeAnimating = false;
            })
            .start();
        
        // 食材抖动 - 更有弹性
        if (this.ingredientLabel && this.ingredientLabel.node) {
            const shakeIntensity = 0.15 + this.currentSpeedMultiplier * 0.08;
            tween(this.ingredientLabel.node)
                .to(0.02, { scale: new Vec3(1 + shakeIntensity, 1 - shakeIntensity, 1) })
                .to(0.03, { scale: new Vec3(1 - shakeIntensity * 0.6, 1 + shakeIntensity * 0.6, 1) })
                .to(0.02, { scale: new Vec3(1 + shakeIntensity * 0.3, 1 - shakeIntensity * 0.3, 1) })
                .to(0.03, { scale: new Vec3(1, 1, 1) })
                .start();
        }
    }
    
    /**
     * 播放切菜特效
     */
    private playChopEffect() {
        if (!this.choppingBoard) return;
        
        // 创建切菜火花/碎片特效
        const effectNode = new Node('ChopEffect');
        const effectLabel = effectNode.addComponent(Label);
        
        // 根据速度显示不同特效
        if (this.currentSpeedMultiplier >= 6) {
            effectLabel.string = '💥✨💥';
            effectLabel.fontSize = 35;
        } else if (this.currentSpeedMultiplier >= 4) {
            effectLabel.string = '⚡✨';
            effectLabel.fontSize = 30;
        } else if (this.currentSpeedMultiplier >= 2) {
            effectLabel.string = '✨';
            effectLabel.fontSize = 25;
        } else {
            effectLabel.string = '·';
            effectLabel.fontSize = 20;
        }
        
        effectLabel.color = new Color(255, 255, 200, 255);
        effectNode.setPosition(-80 + Math.random() * 40, -10 + Math.random() * 30, 0);
        this.choppingBoard.addChild(effectNode);
        
        // 特效动画：向上飘散并消失
        tween(effectNode)
            .to(0.3, { 
                position: new Vec3(
                    effectNode.position.x + (Math.random() - 0.5) * 60,
                    effectNode.position.y + 50 + Math.random() * 30,
                    0
                ),
                scale: new Vec3(0.3, 0.3, 1)
            })
            .call(() => effectNode.destroy())
            .start();
        
        // 刀光特效
        const glowNode = this.knifeNode?.getChildByName('KnifeGlow');
        if (glowNode) {
            const glowLabel = glowNode.getComponent(Label);
            if (glowLabel) {
                glowLabel.color = new Color(255, 255, 200, 255);
                tween(glowLabel)
                    .to(0.1, { color: new Color(255, 255, 200, 0) })
                    .start();
            }
        }
        
        // 砧板震动
        if (this.choppingBoard) {
            const originalPos = this.choppingBoard.position.clone();
            const shakeAmount = 2 + this.currentSpeedMultiplier * 0.5;
            tween(this.choppingBoard)
                .to(0.02, { position: new Vec3(originalPos.x + shakeAmount, originalPos.y, 0) })
                .to(0.02, { position: new Vec3(originalPos.x - shakeAmount, originalPos.y, 0) })
                .to(0.02, { position: originalPos })
                .start();
        }
    }
    
    private completeCurrentItem() {
        if (!this.currentItem) return;
        
        this.currentItem.isComplete = true;
        this.completedCount++;
        
        // 更新库存
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.processIngredient(this.currentItem.type, 1);
        }
        
        console.log(`[ProcessingController] ✅ ${this.currentItem.name} 加工完成！(${this.completedCount}/${this.processingQueue.length})`);
        
        // 更新食材选择面板
        this.updateIngredientPanel();
        
        // 完成动画
        if (this.ingredientLabel) {
            tween(this.ingredientLabel.node)
                .to(0.15, { scale: new Vec3(1.5, 1.5, 1) })
                .to(0.1, { scale: new Vec3(0, 0, 1) })
                .call(() => {
                    this.ingredientLabel.node.setScale(1, 1, 1);
                    this.startNextItem();
                })
                .start();
        } else {
            this.startNextItem();
        }
        
        this.updateQueueDisplay();
    }
    
    private updateDisplay() {
        if (!this.currentItem) return;
        
        // 更新食材显示
        if (this.ingredientLabel) {
            const stateConfig = CHOP_STATE_CONFIG[this.currentItem.type];
            if (stateConfig && stateConfig[this.currentItem.chopState]) {
                this.ingredientLabel.string = stateConfig[this.currentItem.chopState].emoji;
            } else {
                this.ingredientLabel.string = this.currentItem.baseEmoji;
            }
            this.ingredientLabel.fontSize = 70;
        }
        
        // 更新进度条
        if (this.progressBar) {
            const totalProgress = this.currentItem.progress / (this.PROGRESS_PER_STATE * 4);
            const transform = this.progressBar.getComponent(UITransform);
            if (transform) {
                transform.width = 314 * Math.min(1, totalProgress);
            }
        }
        
        // 更新进度文字
        if (this.progressLabel) {
            const stateConfig = CHOP_STATE_CONFIG[this.currentItem.type];
            const stateInfo = stateConfig ? stateConfig[this.currentItem.chopState] : null;
            const stateDesc = stateInfo?.desc || '';
            this.progressLabel.string = `${this.currentItem.name} - ${stateDesc} (${this.completedCount + 1}/${this.processingQueue.length})`;
        }
    }
    
    private showHint() {
        if (!this.hintLabel || !this.currentItem) return;
        
        const remaining = this.processingQueue.length - this.completedCount;
        this.hintLabel.string = `👆 长按切菜 | 连续点击可加速！\n剩余 ${remaining} 个 ${this.currentItem.name} 待处理`;
    }
    
    private updateQueueDisplay() {
        if (!this.queueContainer) return;
        
        this.queueContainer.removeAllChildren();
        
        let xOffset = 0;
        const maxShow = 8;
        
        // 显示已完成数量
        if (this.completedCount > 0) {
            const doneNode = new Node('Done');
            const doneLabel = doneNode.addComponent(Label);
            doneLabel.string = `✅×${this.completedCount}`;
            doneLabel.fontSize = 22;
            doneLabel.color = new Color(100, 255, 100, 255);
            doneNode.setPosition(xOffset, 0, 0);
            this.queueContainer.addChild(doneNode);
            xOffset += 70;
        }
        
        // 显示待处理
        const remaining = this.processingQueue.filter(item => !item.isComplete);
        for (let i = 0; i < Math.min(remaining.length, maxShow); i++) {
            const item = remaining[i];
            const node = new Node(`Queue_${i}`);
            const label = node.addComponent(Label);
            
            if (i === 0) {
                label.string = `${item.baseEmoji}🔪`;
                label.color = new Color(255, 255, 0, 255);
            } else {
                label.string = item.baseEmoji;
                label.color = new Color(180, 180, 180, 255);
            }
            
            label.fontSize = 24;
            node.setPosition(xOffset, 0, 0);
            this.queueContainer.addChild(node);
            xOffset += 40;
        }
        
        if (remaining.length > maxShow) {
            const moreNode = new Node('More');
            const moreLabel = moreNode.addComponent(Label);
            moreLabel.string = `+${remaining.length - maxShow}`;
            moreLabel.fontSize = 18;
            moreLabel.color = new Color(150, 150, 150, 255);
            moreNode.setPosition(xOffset, 0, 0);
            this.queueContainer.addChild(moreNode);
        }
    }
    
    private onAllComplete() {
        console.log('[ProcessingController] 🎉 所有食材加工完成！');
        
        this.isHolding = false;
        this.currentItem = null;
        
        if (this.ingredientLabel) {
            this.ingredientLabel.string = '🎉';
            this.ingredientLabel.fontSize = 80;
        }
        
        if (this.progressLabel) {
            this.progressLabel.string = `全部完成！共加工 ${this.completedCount} 个食材`;
        }
        
        if (this.hintLabel) {
            this.hintLabel.string = '✨ 食材准备完毕！点击下方按钮开始营业！';
        }
        
        if (this.speedLabel) {
            this.speedLabel.string = '准备就绪';
            this.speedLabel.color = new Color(100, 255, 100, 255);
        }
        
        if (this.comboLabel) {
            this.comboLabel.string = '';
        }
        
        // 进度条满
        if (this.progressBar) {
            const transform = this.progressBar.getComponent(UITransform);
            if (transform) {
                transform.width = 314;
            }
            const sprite = this.progressBar.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(255, 215, 0, 255);
            }
        }
        
        if (this.nextButton) {
            this.nextButton.interactable = true;
        }
        
        this.updateQueueDisplay();
    }
    
    private onNextPhase() {
        console.log('[ProcessingController] 进入营业阶段');

        // 🔥 保存关卡状态（用于场景切换）
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.saveLevelState();
        }

        // 🆕 从关卡配置读取场景名称
        const progressManager = GameProgressManager.instance;
        let levelId = inventory?.currentLevel?.levelId || 1;
        if (progressManager?.progress?.currentLevel) {
            levelId = progressManager.progress.currentLevel;
        }

        console.log(`[ProcessingController] 关卡 ${levelId} -> 跳转单营业主场景`);
        SceneRouteService.goBusiness();
    }
    
    public skipProcessing() {
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        
        for (const item of this.processingQueue) {
            if (!item.isComplete) {
                inventory.processIngredient(item.type, 1);
                item.isComplete = true;
                this.completedCount++;
            }
        }
        
        this.onAllComplete();
    }
    
    public getRemainingCount(): number {
        return this.processingQueue.filter(item => !item.isComplete).length;
    }
}
