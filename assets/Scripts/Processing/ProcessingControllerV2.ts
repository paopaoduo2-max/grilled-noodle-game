import { _decorator, Component, Node, Label, Button, Sprite, SpriteFrame, Color, UITransform, Vec3, tween, EventTouch, director, Tween, resources, Graphics } from 'cc';
import { IngredientType, GameConfig } from '../Data/GameConfig';
import { InventoryManager } from '../Manager/InventoryManager';
import { GameProgressManager } from '../Manager/GameProgressManager';
import { getProcessingItems, ShopItemData } from '../Data/ShopData';
import { SceneRouteService } from '../Manager/SceneRouteService';

const { ccclass, property } = _decorator;

/**
 * 交互状态
 */
enum InteractionState {
    IDLE = 0,           // 空闲状态
    HOLDING_KNIFE = 1,  // 手持刀具
}

/**
 * 蔬菜数据
 */
interface VegetableData {
    type: IngredientType;
    name: string;
    emoji: string;
    rawCount: number;      // 生的数量（从库存读取）
    processedCount: number; // 已加工数量
    node?: Node;           // UI节点引用
}

/**
 * 桌面上的蔬菜
 */
interface TableVegetable {
    type: IngredientType;
    node: Node;
    chopProgress: number;  // 切割进度 0-100
    isComplete: boolean;
}

/**
 * 食材加工控制器 V2 - 新交互模式
 * 
 * 玩法流程：
 * 1. 左侧显示可选蔬菜列表（带数量）
 * 2. 点击蔬菜 → 放到桌面上
 * 3. 点击刀具 → 手持刀具（刀具跟随手指）
 * 4. 手持刀具时点击桌面蔬菜 → 切割
 * 5. 切割完成 → 数量减少，加工数量增加
 */
@ccclass('ProcessingControllerV2')
export class ProcessingControllerV2 extends Component {
    
    // ==================== 场景节点引用 ====================
    @property(Node)
    choppingBoard: Node = null;
    
    @property(Node)
    knifeNode: Node = null;
    
    @property(Sprite)
    knifeSprite: Sprite = null;
    
    @property(Button)
    nextButton: Button = null;
    
    @property(Label)
    hintLabel: Label = null;
    
    @property(Label)
    titleLabel: Label = null;
    
    // ==================== 动态创建的容器 ====================
    private vegetablePanel: Node = null;      // 左侧蔬菜选择面板
    private tableArea: Node = null;           // 桌面区域（放置蔬菜）
    private toolArea: Node = null;            // 工具区域（刀具）
    private statusLabel: Label = null;        // 状态提示
    
    // ==================== 数据 ====================
    private vegetables: Map<IngredientType, VegetableData> = new Map();
    private tableVegetables: TableVegetable[] = [];  // 桌面上的蔬菜
    private currentState: InteractionState = InteractionState.IDLE;
    
    // ==================== 刀具相关 ====================
    private knifeOriginalPos: Vec3 = new Vec3();
    private isKnifeFollowing: boolean = false;
    private knifeTween: Tween<Node> = null;
    
    // ==================== 配置 ====================
    private readonly CHOP_PROGRESS_PER_CLICK = 35;  // 每次点击增加的进度
    private readonly MAX_TABLE_VEGETABLES = 3;       // 桌面最多放几个蔬菜
    
    onLoad() {
        this.setupUI();
        this.setupEvents();
    }
    
    start() {
        this.scheduleOnce(() => {
            this.loadVegetablesFromInventory();
            this.updateVegetablePanel();
            this.updateHint();
        }, 0.1);
    }
    
    // ==================== UI 创建 ====================
    
    private setupUI() {
        const canvas = this.node.parent;
        if (!canvas) return;
        
        // 创建左侧蔬菜选择面板
        this.createVegetablePanel(canvas);
        
        // 创建中间桌面区域
        this.createTableArea();
        
        // 创建右侧工具区域（刀具）
        this.createToolArea(canvas);
        
        // 创建状态提示
        this.createStatusLabel(canvas);
        
        // 更新标题
        if (this.titleLabel) {
            this.titleLabel.string = '🔪 食材准备';
        }
        
        console.log('[ProcessingControllerV2] ✅ UI初始化完成');
    }
    
    /**
     * 创建左侧蔬菜选择面板
     */
    private createVegetablePanel(parent: Node) {
        this.vegetablePanel = new Node('VegetablePanel');
        
        // 面板背景
        const panelBg = this.vegetablePanel.addComponent(Graphics);
        panelBg.fillColor = new Color(40, 45, 60, 230);
        panelBg.roundRect(-80, -200, 160, 400, 12);
        panelBg.fill();
        
        // 边框
        panelBg.strokeColor = new Color(80, 100, 140, 200);
        panelBg.lineWidth = 2;
        panelBg.roundRect(-80, -200, 160, 400, 12);
        panelBg.stroke();
        
        const transform = this.vegetablePanel.getComponent(UITransform) || this.vegetablePanel.addComponent(UITransform);
        transform.setContentSize(160, 400);
        
        this.vegetablePanel.setPosition(-480, 0, 0);
        parent.addChild(this.vegetablePanel);
        
        // 面板标题
        const titleNode = new Node('PanelTitle');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '📦 食材库存';
        titleLabel.fontSize = 16;
        titleLabel.color = new Color(255, 255, 255, 255);
        titleNode.setPosition(0, 170, 0);
        this.vegetablePanel.addChild(titleNode);
    }
    
    /**
     * 创建桌面区域
     */
    private createTableArea() {
        if (!this.choppingBoard) return;
        
        // 在砧板上创建放置蔬菜的区域
        this.tableArea = new Node('TableArea');
        const tableTransform = this.tableArea.addComponent(UITransform);
        tableTransform.setContentSize(350, 200);
        this.tableArea.setPosition(0, 0, 0);
        this.choppingBoard.addChild(this.tableArea);
        
        // 提示区域
        const hintNode = new Node('TableHint');
        const hintLabel = hintNode.addComponent(Label);
        hintLabel.string = '点击左侧蔬菜放到这里';
        hintLabel.fontSize = 14;
        hintLabel.color = new Color(200, 200, 200, 150);
        hintNode.setPosition(0, 0, 0);
        this.tableArea.addChild(hintNode);
    }
    
    /**
     * 创建工具区域（刀具）
     */
    private createToolArea(parent: Node) {
        this.toolArea = new Node('ToolArea');
        
        // 工具区背景
        const toolBg = this.toolArea.addComponent(Graphics);
        toolBg.fillColor = new Color(50, 45, 40, 230);
        toolBg.roundRect(-70, -100, 140, 200, 12);
        toolBg.fill();
        
        // 边框
        toolBg.strokeColor = new Color(120, 100, 80, 200);
        toolBg.lineWidth = 2;
        toolBg.roundRect(-70, -100, 140, 200, 12);
        toolBg.stroke();
        
        const transform = this.toolArea.getComponent(UITransform) || this.toolArea.addComponent(UITransform);
        transform.setContentSize(140, 200);
        
        this.toolArea.setPosition(480, 50, 0);
        parent.addChild(this.toolArea);
        
        // 工具区标题
        const titleNode = new Node('ToolTitle');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '🔧 工具';
        titleLabel.fontSize = 16;
        titleLabel.color = new Color(255, 255, 255, 255);
        titleNode.setPosition(0, 80, 0);
        this.toolArea.addChild(titleNode);
        
        // 创建刀具节点（如果没有从场景获取）
        if (!this.knifeNode) {
            this.createKnifeNode();
        } else {
            // 将现有刀具移动到工具区
            this.knifeNode.setParent(this.toolArea);
            this.knifeNode.setPosition(0, 0, 0);
        }
        
        this.knifeOriginalPos = this.knifeNode.position.clone();
    }
    
    /**
     * 创建刀具节点
     */
    private createKnifeNode() {
        this.knifeNode = new Node('Knife');
        
        const knifeTransform = this.knifeNode.addComponent(UITransform);
        knifeTransform.setContentSize(80, 100);
        
        // 先用emoji显示，之后可以替换为图片
        const knifeLabel = new Node('KnifeEmoji');
        const label = knifeLabel.addComponent(Label);
        label.string = '🔪';
        label.fontSize = 60;
        this.knifeNode.addChild(knifeLabel);
        
        // 添加Sprite组件用于显示图片（可选）
        this.knifeSprite = this.knifeNode.addComponent(Sprite);
        this.knifeSprite.enabled = false; // 默认使用emoji
        
        this.knifeNode.setPosition(0, 0, 0);
        this.toolArea.addChild(this.knifeNode);
        
        // 提示文字
        const tipNode = new Node('KnifeTip');
        const tipLabel = tipNode.addComponent(Label);
        tipLabel.string = '点击拿起';
        tipLabel.fontSize = 12;
        tipLabel.color = new Color(180, 180, 180, 200);
        tipNode.setPosition(0, -60, 0);
        this.toolArea.addChild(tipNode);
    }
    
    /**
     * 创建状态提示标签
     */
    private createStatusLabel(parent: Node) {
        const statusNode = new Node('StatusLabel');
        this.statusLabel = statusNode.addComponent(Label);
        this.statusLabel.string = '';
        this.statusLabel.fontSize = 20;
        this.statusLabel.color = new Color(255, 220, 100, 255);
        statusNode.setPosition(0, 280, 0);
        parent.addChild(statusNode);
    }
    
    // ==================== 数据加载 ====================
    
    /**
     * 从库存加载蔬菜数据
     */
    private loadVegetablesFromInventory() {
        const inventory = InventoryManager.instance;
        if (!inventory) {
            console.error('[ProcessingControllerV2] ❌ InventoryManager 未初始化');
            return;
        }
        
        this.vegetables.clear();
        
        const processingItems = getProcessingItems();
        console.log(`[ProcessingControllerV2] 加载蔬菜: ${processingItems.map(i => i.name).join(', ')}`);
        
        for (const shopItem of processingItems) {
            const count = inventory.getIngredientCount(shopItem.ingredientType);
            
            if (count.raw > 0 || count.processed > 0) {
                this.vegetables.set(shopItem.ingredientType, {
                    type: shopItem.ingredientType,
                    name: shopItem.name,
                    emoji: shopItem.emoji,
                    rawCount: count.raw,
                    processedCount: count.processed
                });
                
                console.log(`[ProcessingControllerV2] ${shopItem.name}: 生=${count.raw}, 加工=${count.processed}`);
            }
        }
        
        console.log(`[ProcessingControllerV2] ✅ 加载了 ${this.vegetables.size} 种蔬菜`);
    }
    
    // ==================== UI 更新 ====================
    
    /**
     * 更新蔬菜选择面板
     */
    private updateVegetablePanel() {
        if (!this.vegetablePanel) return;
        
        // 清除旧的蔬菜按钮（保留标题）
        const children = this.vegetablePanel.children.slice();
        for (const child of children) {
            if (child.name.startsWith('VegBtn_')) {
                child.destroy();
            }
        }
        
        let yOffset = 120;
        const btnHeight = 70;
        
        this.vegetables.forEach((vegData, type) => {
            if (vegData.rawCount <= 0) return;
            
            const btnNode = this.createVegetableButton(vegData);
            btnNode.name = `VegBtn_${type}`;
            btnNode.setPosition(0, yOffset, 0);
            this.vegetablePanel.addChild(btnNode);
            
            vegData.node = btnNode;
            yOffset -= btnHeight;
        });
    }
    
    /**
     * 创建蔬菜按钮
     */
    private createVegetableButton(vegData: VegetableData): Node {
        const btnNode = new Node('VegButton');
        
        // 按钮背景
        const btnBg = btnNode.addComponent(Graphics);
        btnBg.fillColor = new Color(60, 70, 90, 255);
        btnBg.roundRect(-65, -28, 130, 56, 8);
        btnBg.fill();
        
        // 边框
        btnBg.strokeColor = new Color(100, 120, 160, 200);
        btnBg.lineWidth = 2;
        btnBg.roundRect(-65, -28, 130, 56, 8);
        btnBg.stroke();
        
        const transform = btnNode.getComponent(UITransform) || btnNode.addComponent(UITransform);
        transform.setContentSize(130, 56);
        
        // 蔬菜图标
        const emojiNode = new Node('Emoji');
        const emojiLabel = emojiNode.addComponent(Label);
        emojiLabel.string = vegData.emoji;
        emojiLabel.fontSize = 30;
        emojiNode.setPosition(-35, 0, 0);
        btnNode.addChild(emojiNode);
        
        // 数量显示
        const countNode = new Node('Count');
        const countLabel = countNode.addComponent(Label);
        countLabel.string = `×${vegData.rawCount}`;
        countLabel.fontSize = 18;
        countLabel.color = new Color(255, 255, 100, 255);
        countNode.setPosition(20, 0, 0);
        btnNode.addChild(countNode);
        
        // 点击事件 - 放到桌面
        btnNode.on(Node.EventType.TOUCH_END, () => {
            this.onVegetableSelect(vegData);
        }, this);
        
        return btnNode;
    }
    
    /**
     * 更新提示信息
     */
    private updateHint() {
        if (!this.hintLabel) return;
        
        switch (this.currentState) {
            case InteractionState.IDLE:
                if (this.tableVegetables.length === 0) {
                    this.hintLabel.string = '👆 点击左侧蔬菜放到桌面';
                } else {
                    this.hintLabel.string = '👆 点击右侧刀具开始切菜';
                }
                break;
            case InteractionState.HOLDING_KNIFE:
                this.hintLabel.string = '🔪 点击桌面上的蔬菜进行切割';
                break;
        }
    }
    
    /**
     * 更新状态显示
     */
    private updateStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
            
            // 动画效果
            tween(this.statusLabel.node)
                .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
            
            // 3秒后清除
            this.scheduleOnce(() => {
                if (this.statusLabel && this.statusLabel.string === text) {
                    this.statusLabel.string = '';
                }
            }, 3);
        }
    }
    
    // ==================== 事件处理 ====================
    
    private setupEvents() {
        // 刀具点击事件
        if (this.knifeNode) {
            this.knifeNode.on(Node.EventType.TOUCH_END, this.onKnifeClick, this);
        }
        
        // 下一步按钮
        if (this.nextButton) {
            this.nextButton.node.on(Button.EventType.CLICK, this.onNextPhase, this);
            this.nextButton.interactable = false;
        }
        
        // 全局触摸事件（用于放下刀具）
        this.node.on(Node.EventType.TOUCH_END, this.onGlobalTouch, this);
    }
    
    /**
     * 蔬菜被选中 - 放到桌面
     */
    private onVegetableSelect(vegData: VegetableData) {
        if (this.currentState === InteractionState.HOLDING_KNIFE) {
            // 手持刀具时不能选择蔬菜
            this.updateStatus('⚠️ 请先放下刀具');
            return;
        }
        
        if (vegData.rawCount <= 0) {
            this.updateStatus('⚠️ 该蔬菜库存不足');
            return;
        }
        
        if (this.tableVegetables.length >= this.MAX_TABLE_VEGETABLES) {
            this.updateStatus(`⚠️ 桌面最多放${this.MAX_TABLE_VEGETABLES}个`);
            return;
        }
        
        // 创建桌面上的蔬菜
        this.addVegetableToTable(vegData);
        
        this.updateHint();
    }
    
    /**
     * 添加蔬菜到桌面
     */
    private addVegetableToTable(vegData: VegetableData) {
        if (!this.tableArea) return;
        
        const vegNode = new Node(`TableVeg_${vegData.type}`);
        
        // 蔬菜背景（可点击区域）
        const vegBg = vegNode.addComponent(Graphics);
        vegBg.fillColor = new Color(80, 120, 80, 200);
        vegBg.roundRect(-40, -40, 80, 80, 10);
        vegBg.fill();
        
        const transform = vegNode.getComponent(UITransform) || vegNode.addComponent(UITransform);
        transform.setContentSize(80, 80);
        
        // 蔬菜显示
        const emojiNode = new Node('Emoji');
        const emojiLabel = emojiNode.addComponent(Label);
        emojiLabel.string = vegData.emoji;
        emojiLabel.fontSize = 45;
        vegNode.addChild(emojiNode);
        
        // 进度条背景
        const progressBg = new Node('ProgressBg');
        const pbgGraphics = progressBg.addComponent(Graphics);
        pbgGraphics.fillColor = new Color(30, 30, 30, 200);
        pbgGraphics.roundRect(-35, -3, 70, 6, 3);
        pbgGraphics.fill();
        progressBg.setPosition(0, -35, 0);
        vegNode.addChild(progressBg);
        
        // 进度条
        const progressBar = new Node('ProgressBar');
        const pbGraphics = progressBar.addComponent(Graphics);
        pbGraphics.fillColor = new Color(100, 200, 100, 255);
        pbGraphics.roundRect(-35, -3, 0, 6, 3);
        pbGraphics.fill();
        progressBar.setPosition(0, -35, 0);
        vegNode.addChild(progressBar);
        
        // 计算位置（横向排列）
        const xPos = -100 + this.tableVegetables.length * 100;
        vegNode.setPosition(xPos, 20, 0);
        
        this.tableArea.addChild(vegNode);
        
        // 添加到数组
        const tableVeg: TableVegetable = {
            type: vegData.type,
            node: vegNode,
            chopProgress: 0,
            isComplete: false
        };
        this.tableVegetables.push(tableVeg);
        
        // 点击事件 - 切割
        vegNode.on(Node.EventType.TOUCH_END, () => {
            this.onTableVegetableClick(tableVeg);
        }, this);
        
        // 入场动画
        vegNode.setScale(0, 0, 1);
        tween(vegNode)
            .to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
        
        console.log(`[ProcessingControllerV2] 添加 ${vegData.name} 到桌面`);
    }
    
    /**
     * 刀具被点击
     */
    private onKnifeClick(event: EventTouch) {
        event.propagationStopped = true;
        
        if (this.currentState === InteractionState.IDLE) {
            // 拿起刀具
            this.pickUpKnife();
        } else {
            // 放下刀具
            this.putDownKnife();
        }
    }
    
    /**
     * 拿起刀具
     */
    private pickUpKnife() {
        this.currentState = InteractionState.HOLDING_KNIFE;
        
        // 刀具动画 - 放大并跟随
        if (this.knifeNode) {
            tween(this.knifeNode)
                .to(0.15, { scale: new Vec3(1.3, 1.3, 1) })
                .start();
            
            // 改变颜色提示
            const emojiNode = this.knifeNode.getChildByName('KnifeEmoji');
            if (emojiNode) {
                const label = emojiNode.getComponent(Label);
                if (label) {
                    label.color = new Color(255, 255, 100, 255);
                }
            }
        }
        
        this.updateStatus('🔪 已拿起刀具');
        this.updateHint();
        
        console.log('[ProcessingControllerV2] 拿起刀具');
    }
    
    /**
     * 放下刀具
     */
    private putDownKnife() {
        this.currentState = InteractionState.IDLE;
        
        // 刀具动画 - 恢复
        if (this.knifeNode) {
            tween(this.knifeNode)
                .to(0.15, { 
                    scale: new Vec3(1, 1, 1),
                    position: this.knifeOriginalPos 
                })
                .start();
            
            // 恢复颜色
            const emojiNode = this.knifeNode.getChildByName('KnifeEmoji');
            if (emojiNode) {
                const label = emojiNode.getComponent(Label);
                if (label) {
                    label.color = new Color(255, 255, 255, 255);
                }
            }
        }
        
        this.updateHint();
        
        console.log('[ProcessingControllerV2] 放下刀具');
    }
    
    /**
     * 桌面蔬菜被点击
     */
    private onTableVegetableClick(tableVeg: TableVegetable) {
        if (tableVeg.isComplete) return;
        
        if (this.currentState !== InteractionState.HOLDING_KNIFE) {
            this.updateStatus('👆 请先点击刀具拿起');
            return;
        }
        
        // 切割蔬菜
        this.chopVegetable(tableVeg);
    }
    
    /**
     * 切割蔬菜
     */
    private chopVegetable(tableVeg: TableVegetable) {
        tableVeg.chopProgress += this.CHOP_PROGRESS_PER_CLICK;
        
        // 播放切割动画
        this.playChopAnimation(tableVeg);
        
        // 更新进度条
        this.updateVegetableProgress(tableVeg);
        
        // 检查是否完成
        if (tableVeg.chopProgress >= 100) {
            this.completeVegetable(tableVeg);
        }
    }
    
    /**
     * 播放切割动画
     */
    private playChopAnimation(tableVeg: TableVegetable) {
        // 刀具切下动画
        if (this.knifeNode) {
            if (this.knifeTween) {
                this.knifeTween.stop();
            }
            
            const originalPos = this.knifeNode.position.clone();
            
            this.knifeTween = tween(this.knifeNode)
                .to(0.05, { 
                    position: new Vec3(originalPos.x, originalPos.y - 30, 0),
                    angle: -15
                })
                .to(0.1, { 
                    position: originalPos,
                    angle: 0
                })
                .start();
        }
        
        // 蔬菜抖动
        if (tableVeg.node) {
            tween(tableVeg.node)
                .to(0.03, { scale: new Vec3(1.15, 0.85, 1) })
                .to(0.03, { scale: new Vec3(0.9, 1.1, 1) })
                .to(0.04, { scale: new Vec3(1, 1, 1) })
                .start();
            
            // 切割特效
            this.playChopEffect(tableVeg.node);
        }
    }
    
    /**
     * 播放切割特效
     */
    private playChopEffect(vegNode: Node) {
        const effectNode = new Node('ChopEffect');
        const effectLabel = effectNode.addComponent(Label);
        effectLabel.string = '✨';
        effectLabel.fontSize = 25;
        effectLabel.color = new Color(255, 255, 200, 255);
        
        effectNode.setPosition(
            (Math.random() - 0.5) * 40,
            20 + Math.random() * 20,
            0
        );
        vegNode.addChild(effectNode);
        
        tween(effectNode)
            .to(0.3, {
                position: new Vec3(
                    effectNode.position.x + (Math.random() - 0.5) * 30,
                    effectNode.position.y + 40,
                    0
                ),
                scale: new Vec3(0.3, 0.3, 1)
            })
            .call(() => effectNode.destroy())
            .start();
    }
    
    /**
     * 更新蔬菜进度条
     */
    private updateVegetableProgress(tableVeg: TableVegetable) {
        const progressBar = tableVeg.node.getChildByName('ProgressBar');
        if (progressBar) {
            const graphics = progressBar.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
                const width = 70 * (tableVeg.chopProgress / 100);
                graphics.fillColor = new Color(100, 200, 100, 255);
                graphics.roundRect(-35, -3, width, 6, 3);
                graphics.fill();
            }
        }
    }
    
    /**
     * 完成蔬菜加工
     */
    private completeVegetable(tableVeg: TableVegetable) {
        tableVeg.isComplete = true;
        
        // 更新库存
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.processIngredient(tableVeg.type, 1);
        }
        
        // 更新本地数据
        const vegData = this.vegetables.get(tableVeg.type);
        if (vegData) {
            vegData.rawCount--;
            vegData.processedCount++;
        }
        
        // 完成动画
        if (tableVeg.node) {
            const emojiNode = tableVeg.node.getChildByName('Emoji');
            if (emojiNode) {
                const label = emojiNode.getComponent(Label);
                if (label) {
                    label.string = '✅';
                }
            }
            
            // 背景变绿
            const graphics = tableVeg.node.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
                graphics.fillColor = new Color(50, 150, 50, 200);
                graphics.roundRect(-40, -40, 80, 80, 10);
                graphics.fill();
            }
            
            // 延迟移除
            this.scheduleOnce(() => {
                this.removeTableVegetable(tableVeg);
            }, 0.8);
        }
        
        this.updateStatus(`✅ ${vegData?.name || '蔬菜'} 切好了！`);
        this.updateVegetablePanel();
        
        console.log(`[ProcessingControllerV2] ✅ ${vegData?.name} 加工完成`);
        
        // 检查是否全部完成
        this.checkAllComplete();
    }
    
    /**
     * 从桌面移除蔬菜
     */
    private removeTableVegetable(tableVeg: TableVegetable) {
        // 移除动画
        if (tableVeg.node) {
            tween(tableVeg.node)
                .to(0.2, { scale: new Vec3(0, 0, 1) })
                .call(() => {
                    tableVeg.node.destroy();
                })
                .start();
        }
        
        // 从数组移除
        const index = this.tableVegetables.indexOf(tableVeg);
        if (index > -1) {
            this.tableVegetables.splice(index, 1);
        }
        
        // 重新排列剩余蔬菜
        this.scheduleOnce(() => {
            this.rearrangeTableVegetables();
        }, 0.25);
        
        this.updateHint();
    }
    
    /**
     * 重新排列桌面蔬菜
     */
    private rearrangeTableVegetables() {
        this.tableVegetables.forEach((veg, index) => {
            if (veg.node && veg.node.isValid) {
                const xPos = -100 + index * 100;
                tween(veg.node)
                    .to(0.2, { position: new Vec3(xPos, 20, 0) })
                    .start();
            }
        });
    }
    
    /**
     * 全局触摸事件
     */
    private onGlobalTouch(event: EventTouch) {
        // 点击空白区域放下刀具
        if (this.currentState === InteractionState.HOLDING_KNIFE) {
            // 检查是否点击在有效区域外
            // 这里简单处理：不做任何操作，让用户通过再次点击刀具来放下
        }
    }
    
    /**
     * 检查是否全部完成
     */
    private checkAllComplete() {
        let hasRaw = false;
        this.vegetables.forEach(veg => {
            if (veg.rawCount > 0) {
                hasRaw = true;
            }
        });
        
        if (!hasRaw && this.tableVegetables.length === 0) {
            this.onAllComplete();
        }
    }
    
    /**
     * 全部加工完成
     */
    private onAllComplete() {
        console.log('[ProcessingControllerV2] 🎉 全部食材加工完成！');
        
        if (this.nextButton) {
            this.nextButton.interactable = true;
        }
        
        if (this.hintLabel) {
            this.hintLabel.string = '🎉 全部食材准备完成！点击开始营业';
            this.hintLabel.color = new Color(100, 255, 100, 255);
        }
        
        this.updateStatus('🎉 太棒了！全部切好了！');
        
        // 放下刀具
        if (this.currentState === InteractionState.HOLDING_KNIFE) {
            this.putDownKnife();
        }
    }
    
    /**
     * 进入下一阶段
     */
    private onNextPhase() {
        console.log('[ProcessingControllerV2] 进入烹饪阶段');

        // 🆕 从关卡配置读取场景名称
        const progressManager = GameProgressManager.instance;
        const inventory = InventoryManager.instance;
        let levelId = inventory?.currentLevel?.levelId || 1;
        if (progressManager?.progress?.currentLevel) {
            levelId = progressManager.progress.currentLevel;
        }

        console.log(`[ProcessingControllerV2] 关卡 ${levelId} -> 跳转单营业主场景`);
        SceneRouteService.goBusiness();
    }
    
    /**
     * 设置刀具图片
     */
    public setKnifeSpriteFrame(spriteFrame: SpriteFrame) {
        if (this.knifeSprite && spriteFrame) {
            this.knifeSprite.spriteFrame = spriteFrame;
            this.knifeSprite.enabled = true;
            
            // 隐藏emoji
            const emojiNode = this.knifeNode?.getChildByName('KnifeEmoji');
            if (emojiNode) {
                emojiNode.active = false;
            }
        }
    }
}
