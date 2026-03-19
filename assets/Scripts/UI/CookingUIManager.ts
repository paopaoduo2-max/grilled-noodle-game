import { _decorator, Component, Node, Sprite, Label, Color, UITransform, SpriteFrame, resources, Vec3, tween, Button } from 'cc';
import { CookingAssets, WorkAreaLayout } from '../Config/GameUIAssets';
import { UIColors } from '../Config/UIStyleConfig';
import { FrameAnimator } from './FrameAnimator';
import { WorkAreaManager, WorkAreaType } from './WorkAreaManager';
import { IngredientType } from '../Data/GameConfig';

const { ccclass, property } = _decorator;

/**
 * 制作阶段UI管理器
 * 负责创建和管理制作阶段的所有UI元素和动画
 */
@ccclass('CookingUIManager')
export class CookingUIManager extends Component {
    
    // 工作区域管理器
    private workAreaManager: WorkAreaManager = null;
    
    // UI节点引用
    private backgroundNode: Node = null;
    private grillSlotsNode: Node = null;
    private ingredientButtonsNode: Node = null;
    private condimentButtonsNode: Node = null;
    private handItemNode: Node = null;
    
    // 动画器
    private flameAnimator: FrameAnimator = null;
    private handAnimator: FrameAnimator = null;
    
    // 烤盘槽位
    private grillSlots: Node[] = [];
    
    /**
     * 初始化制作UI
     */
    public initUI(parent: Node): Node {
        const container = new Node('CookingUI');
        parent.addChild(container);
        
        // 创建背景
        this.createBackground(container);
        
        // 初始化工作区域管理器
        this.workAreaManager = container.addComponent(WorkAreaManager);
        this.workAreaManager.initWorkAreas(container);
        
        // 创建烤盘槽位
        this.createGrillSlots(container);
        
        // 创建火焰动画
        this.createFlameEffect(container);
        
        // 创建食材按钮
        this.createIngredientButtons(container);
        
        // 创建调料按钮
        this.createCondimentButtons(container);
        
        // 创建手持物品显示
        this.createHandItemDisplay(container);
        
        // 创建信息面板
        this.createInfoPanel(container);
        
        console.log('[CookingUIManager] ✅ 制作UI初始化完成');
        return container;
    }
    
    /**
     * 创建背景
     */
    private createBackground(parent: Node) {
        this.backgroundNode = new Node('Background');
        const sprite = this.backgroundNode.addComponent(Sprite);
        sprite.color = new Color(45, 40, 35, 255);  // 厨房色调
        
        const transform = this.backgroundNode.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(1280, 720);
        }
        
        parent.addChild(this.backgroundNode);
        this.backgroundNode.setSiblingIndex(0);
        
        // 尝试加载背景图
        resources.load(CookingAssets.background + '/spriteFrame', SpriteFrame, (err, sf) => {
            if (!err && sf) {
                sprite.spriteFrame = sf;
                sprite.color = Color.WHITE;
            }
        });
    }
    
    /**
     * 创建烤盘槽位
     */
    private createGrillSlots(parent: Node) {
        const grillArea = this.workAreaManager?.getAreaContent(WorkAreaType.GRILL);
        if (!grillArea) return;
        
        this.grillSlotsNode = new Node('GrillSlots');
        grillArea.addChild(this.grillSlotsNode);
        
        const layout = WorkAreaLayout.grill;
        const slotWidth = 140;
        const startX = -(layout.slots - 1) * layout.slotSpacing / 2;
        
        for (let i = 0; i < layout.slots; i++) {
            const slot = this.createGrillSlot(i);
            slot.setPosition(startX + i * layout.slotSpacing, -20, 0);
            this.grillSlotsNode.addChild(slot);
            this.grillSlots.push(slot);
        }
    }
    
    /**
     * 创建单个烤盘槽位
     */
    private createGrillSlot(index: number): Node {
        const slot = new Node(`GrillSlot_${index}`);
        
        // 槽位背景
        const bg = new Node('SlotBg');
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.color = new Color(80, 60, 50, 200);
        
        const bgTransform = bg.getComponent(UITransform);
        if (bgTransform) {
            bgTransform.setContentSize(130, 130);
        }
        slot.addChild(bg);
        
        // 槽位边框
        const border = new Node('Border');
        const borderSprite = border.addComponent(Sprite);
        borderSprite.color = new Color(150, 100, 50, 255);
        
        const borderTransform = border.getComponent(UITransform);
        if (borderTransform) {
            borderTransform.setContentSize(134, 134);
        }
        border.setSiblingIndex(0);
        slot.addChild(border);
        
        // 槽位编号
        const numNode = new Node('Number');
        const numLabel = numNode.addComponent(Label);
        numLabel.string = `${index + 1}`;
        numLabel.fontSize = 12;
        numLabel.color = new Color(150, 150, 150, 150);
        numNode.setPosition(0, -55, 0);
        slot.addChild(numNode);
        
        // 食物显示区域
        const foodNode = new Node('Food');
        slot.addChild(foodNode);
        
        // 状态标签
        const statusNode = new Node('Status');
        const statusLabel = statusNode.addComponent(Label);
        statusLabel.string = '空';
        statusLabel.fontSize = 14;
        statusLabel.color = new Color(150, 150, 150, 200);
        statusNode.setPosition(0, 55, 0);
        slot.addChild(statusNode);
        
        return slot;
    }
    
    /**
     * 创建火焰效果
     */
    private createFlameEffect(parent: Node) {
        const grillArea = this.workAreaManager?.getAreaContent(WorkAreaType.GRILL);
        if (!grillArea) return;
        
        const flameNode = new Node('Flame');
        this.flameAnimator = flameNode.addComponent(FrameAnimator);
        
        const transform = flameNode.addComponent(UITransform);
        transform.setContentSize(500, 50);
        
        flameNode.setPosition(0, -100, 0);
        grillArea.addChild(flameNode);
        
        // 创建默认火焰显示
        const flameLabel = new Node('FlameEmoji');
        const label = flameLabel.addComponent(Label);
        label.string = '🔥🔥🔥🔥🔥';
        label.fontSize = 30;
        flameNode.addChild(flameLabel);
        
        // 加载火焰动画
        this.flameAnimator.loadFrames(CookingAssets.workAreas.grill.flame, () => {
            this.flameAnimator.setFrameRate(CookingAssets.workAreas.grill.flameRate);
            this.flameAnimator.play(true);
        });
    }
    
    /**
     * 创建食材按钮
     */
    private createIngredientButtons(parent: Node) {
        const trayArea = this.workAreaManager?.getAreaContent(WorkAreaType.INGREDIENT_TRAY);
        if (!trayArea) return;
        
        this.ingredientButtonsNode = new Node('IngredientButtons');
        trayArea.addChild(this.ingredientButtonsNode);
        
        const ingredients = [
            { type: IngredientType.DOUGH, emoji: '🍞', name: '面饼' },
            { type: IngredientType.EGG, emoji: '🥚', name: '鸡蛋' },
            { type: IngredientType.SAUSAGE, emoji: '🌭', name: '香肠' },
            { type: IngredientType.ONION, emoji: '🧅', name: '洋葱' },
            { type: IngredientType.CILANTRO, emoji: '🌿', name: '香菜' },
        ];
        
        const layout = WorkAreaLayout.ingredientTray;
        const buttonSize = 70;
        const spacing = 10;
        
        ingredients.forEach((ing, index) => {
            const col = index % layout.columns;
            const row = Math.floor(index / layout.columns);
            
            const x = (col - (layout.columns - 1) / 2) * (buttonSize + spacing);
            const y = 100 - row * (buttonSize + spacing);
            
            const btn = this.createIngredientButton(ing.type, ing.emoji, ing.name);
            btn.setPosition(x, y, 0);
            this.ingredientButtonsNode.addChild(btn);
        });
    }
    
    /**
     * 创建食材按钮
     */
    private createIngredientButton(type: IngredientType, emoji: string, name: string): Node {
        const btn = new Node(`Btn_${type}`);
        
        // 按钮背景
        const bg = btn.addComponent(Sprite);
        bg.color = new Color(70, 90, 70, 255);
        
        const transform = btn.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(70, 70);
        }
        
        // 食材图标
        const iconNode = new Node('Icon');
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = emoji;
        iconLabel.fontSize = 35;
        iconNode.setPosition(0, 8, 0);
        btn.addChild(iconNode);
        
        // 名称
        const nameNode = new Node('Name');
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = name;
        nameLabel.fontSize = 10;
        nameLabel.color = new Color(200, 200, 200, 255);
        nameNode.setPosition(0, -25, 0);
        btn.addChild(nameNode);
        
        // 数量显示
        const countNode = new Node('Count');
        const countLabel = countNode.addComponent(Label);
        countLabel.string = 'x0';
        countLabel.fontSize = 10;
        countLabel.color = new Color(255, 200, 100, 255);
        countNode.setPosition(25, 25, 0);
        btn.addChild(countNode);
        
        return btn;
    }
    
    /**
     * 创建调料按钮
     */
    private createCondimentButtons(parent: Node) {
        const condimentArea = this.workAreaManager?.getAreaContent(WorkAreaType.CONDIMENT_AREA);
        if (!condimentArea) return;
        
        this.condimentButtonsNode = new Node('CondimentButtons');
        condimentArea.addChild(this.condimentButtonsNode);
        
        const condiments = [
            { type: IngredientType.OIL, emoji: '🛢️', name: '油' },
            { type: IngredientType.GRILLED_NOODLE_SAUCE, emoji: '🫙', name: '酱' },
            { type: IngredientType.CHILI, emoji: '🌶️', name: '辣椒' },
            { type: IngredientType.SUGAR, emoji: '🍬', name: '糖' },
            { type: IngredientType.VINEGAR, emoji: '🍶', name: '醋' },
        ];
        
        const layout = WorkAreaLayout.condimentArea;
        const buttonSize = 55;
        const spacing = 8;
        
        condiments.forEach((cond, index) => {
            const col = index % layout.columns;
            const row = Math.floor(index / layout.columns);
            
            const x = (col - (layout.columns - 1) / 2) * (buttonSize + spacing);
            const y = 60 - row * (buttonSize + spacing);
            
            const btn = this.createCondimentButton(cond.type, cond.emoji, cond.name);
            btn.setPosition(x, y, 0);
            this.condimentButtonsNode.addChild(btn);
        });
    }
    
    /**
     * 创建调料按钮
     */
    private createCondimentButton(type: IngredientType, emoji: string, name: string): Node {
        const btn = new Node(`Btn_${type}`);
        
        // 按钮背景
        const bg = btn.addComponent(Sprite);
        bg.color = new Color(80, 60, 80, 255);
        
        const transform = btn.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(55, 55);
        }
        
        // 调料图标
        const iconNode = new Node('Icon');
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = emoji;
        iconLabel.fontSize = 28;
        iconNode.setPosition(0, 5, 0);
        btn.addChild(iconNode);
        
        // 名称
        const nameNode = new Node('Name');
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = name;
        nameLabel.fontSize = 9;
        nameLabel.color = new Color(200, 200, 200, 255);
        nameNode.setPosition(0, -20, 0);
        btn.addChild(nameNode);
        
        return btn;
    }
    
    /**
     * 创建手持物品显示
     */
    private createHandItemDisplay(parent: Node) {
        this.handItemNode = new Node('HandItem');
        this.handAnimator = this.handItemNode.addComponent(FrameAnimator);
        
        const transform = this.handItemNode.addComponent(UITransform);
        transform.setContentSize(80, 80);
        
        this.handItemNode.active = false;
        parent.addChild(this.handItemNode);
        
        // 手持物品图标
        const iconNode = new Node('Icon');
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = '';
        iconLabel.fontSize = 40;
        this.handItemNode.addChild(iconNode);
        
        // 数量显示
        const countNode = new Node('Count');
        const countLabel = countNode.addComponent(Label);
        countLabel.string = '';
        countLabel.fontSize = 16;
        countLabel.color = new Color(255, 255, 100, 255);
        countNode.setPosition(25, -25, 0);
        this.handItemNode.addChild(countNode);
    }
    
    /**
     * 创建信息面板
     */
    private createInfoPanel(parent: Node) {
        // 金钱显示
        const moneyNode = new Node('MoneyDisplay');
        const moneyLabel = moneyNode.addComponent(Label);
        moneyLabel.string = '💰 0';
        moneyLabel.fontSize = 20;
        moneyLabel.color = UIColors.textGold;
        moneyNode.setPosition(-550, 320, 0);
        parent.addChild(moneyNode);
        
        // 时间显示
        const timeNode = new Node('TimeDisplay');
        const timeLabel = timeNode.addComponent(Label);
        timeLabel.string = '⏰ 8:00';
        timeLabel.fontSize = 20;
        timeLabel.color = Color.WHITE;
        timeNode.setPosition(550, 320, 0);
        parent.addChild(timeNode);
        
        // 提示信息
        const hintNode = new Node('HintDisplay');
        const hintLabel = hintNode.addComponent(Label);
        hintLabel.string = '';
        hintLabel.fontSize = 16;
        hintLabel.color = new Color(255, 255, 200, 255);
        hintNode.setPosition(0, -330, 0);
        parent.addChild(hintNode);
    }
    
    // ==================== 动画控制方法 ====================
    
    /**
     * 播放拿起动画
     */
    public playPickupAnimation(type: IngredientType, emoji: string, count: number) {
        if (!this.handItemNode) return;
        
        this.handItemNode.active = true;
        
        // 设置图标
        const iconNode = this.handItemNode.getChildByName('Icon');
        if (iconNode) {
            const label = iconNode.getComponent(Label);
            if (label) label.string = emoji;
        }
        
        // 设置数量
        const countNode = this.handItemNode.getChildByName('Count');
        if (countNode) {
            const label = countNode.getComponent(Label);
            if (label) label.string = count > 1 ? `x${count}` : '';
        }
        
        // 播放拿起动画
        if (this.handAnimator) {
            this.handAnimator.loadFrames(CookingAssets.animations.pickup, () => {
                this.handAnimator.playOnce();
            });
        }
        
        // 缩放效果
        tween(this.handItemNode)
            .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }
    
    /**
     * 播放放下动画
     */
    public playPutdownAnimation(callback?: () => void) {
        if (!this.handItemNode) {
            callback?.();
            return;
        }
        
        // 播放放下动画
        if (this.handAnimator) {
            this.handAnimator.loadFrames(CookingAssets.animations.putdown, () => {
                this.handAnimator.playOnce(() => {
                    this.handItemNode.active = false;
                    callback?.();
                });
            });
        } else {
            // 简单缩放效果
            tween(this.handItemNode)
                .to(0.1, { scale: new Vec3(0.8, 0.8, 1) })
                .call(() => {
                    this.handItemNode.active = false;
                    callback?.();
                })
                .start();
        }
    }
    
    /**
     * 播放翻面动画
     */
    public playFlipAnimation(slotIndex: number, callback?: () => void) {
        const slot = this.grillSlots[slotIndex];
        if (!slot) {
            callback?.();
            return;
        }
        
        const foodNode = slot.getChildByName('Food');
        if (!foodNode) {
            callback?.();
            return;
        }
        
        // 翻转动画
        tween(foodNode)
            .to(0.15, { scale: new Vec3(1, 0, 1) })
            .to(0.15, { scale: new Vec3(1, 1, 1) })
            .call(() => callback?.())
            .start();
    }
    
    /**
     * 播放刷酱动画
     */
    public playBrushAnimation(slotIndex: number, callback?: () => void) {
        // 简单的抖动效果
        const slot = this.grillSlots[slotIndex];
        if (slot) {
            const originalPos = slot.position.clone();
            tween(slot)
                .to(0.05, { position: new Vec3(originalPos.x + 3, originalPos.y, 0) })
                .to(0.05, { position: new Vec3(originalPos.x - 3, originalPos.y, 0) })
                .to(0.05, { position: new Vec3(originalPos.x + 2, originalPos.y, 0) })
                .to(0.05, { position: new Vec3(originalPos.x, originalPos.y, 0) })
                .call(() => callback?.())
                .start();
        } else {
            callback?.();
        }
    }
    
    /**
     * 更新烤盘槽位显示
     */
    public updateGrillSlot(index: number, emoji: string, status: string, color?: Color) {
        const slot = this.grillSlots[index];
        if (!slot) return;
        
        // 更新食物显示
        const foodNode = slot.getChildByName('Food');
        if (foodNode) {
            let label = foodNode.getComponent(Label);
            if (!label) {
                label = foodNode.addComponent(Label);
            }
            label.string = emoji;
            label.fontSize = 50;
        }
        
        // 更新状态
        const statusNode = slot.getChildByName('Status');
        if (statusNode) {
            const label = statusNode.getComponent(Label);
            if (label) {
                label.string = status;
                if (color) label.color = color;
            }
        }
        
        // 更新背景颜色
        const bg = slot.getChildByName('SlotBg');
        if (bg && color) {
            const sprite = bg.getComponent(Sprite);
            if (sprite) {
                sprite.color = new Color(
                    Math.floor(color.r * 0.3),
                    Math.floor(color.g * 0.3),
                    Math.floor(color.b * 0.3),
                    200
                );
            }
        }
    }
    
    /**
     * 更新食材按钮数量
     */
    public updateIngredientCount(type: IngredientType, count: number) {
        if (!this.ingredientButtonsNode) return;
        
        const btn = this.ingredientButtonsNode.getChildByName(`Btn_${type}`);
        if (btn) {
            const countNode = btn.getChildByName('Count');
            if (countNode) {
                const label = countNode.getComponent(Label);
                if (label) {
                    label.string = `x${count}`;
                    label.color = count > 0 
                        ? new Color(100, 255, 100, 255) 
                        : new Color(255, 100, 100, 255);
                }
            }
        }
    }
    
    /**
     * 更新手持物品位置
     */
    public updateHandPosition(x: number, y: number) {
        if (this.handItemNode && this.handItemNode.active) {
            this.handItemNode.setPosition(x, y, 0);
        }
    }
    
    /**
     * 显示提示信息
     */
    public showHint(message: string) {
        const hintNode = this.node?.getChildByName('CookingUI')?.getChildByName('HintDisplay');
        if (hintNode) {
            const label = hintNode.getComponent(Label);
            if (label) {
                label.string = message;
            }
        }
    }
    
    /**
     * 高亮工作区域
     */
    public highlightArea(type: WorkAreaType, highlight: boolean) {
        this.workAreaManager?.highlightArea(type, highlight);
    }
    
    // ==================== 获取节点引用 ====================
    
    public getWorkAreaManager(): WorkAreaManager { return this.workAreaManager; }
    public getGrillSlots(): Node[] { return this.grillSlots; }
    public getIngredientButtons(): Node { return this.ingredientButtonsNode; }
    public getCondimentButtons(): Node { return this.condimentButtonsNode; }
    public getHandItem(): Node { return this.handItemNode; }
}
