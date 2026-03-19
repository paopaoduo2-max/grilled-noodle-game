import { _decorator, Component, Node, Sprite, Label, Color, UITransform, SpriteFrame, resources, Vec3, tween, Button } from 'cc';
import { ProcessingAssets } from '../Config/GameUIAssets';
import { UIColors } from '../Config/UIStyleConfig';
import { FrameAnimator } from './FrameAnimator';
import { IngredientType } from '../Data/GameConfig';

const { ccclass, property } = _decorator;

/**
 * 备菜阶段UI管理器
 * 负责创建和管理备菜阶段的所有UI元素
 */
@ccclass('ProcessingUIManager')
export class ProcessingUIManager extends Component {
    
    // UI节点引用
    private backgroundNode: Node = null;
    private choppingBoardNode: Node = null;
    private knifeNode: Node = null;
    private ingredientNode: Node = null;
    private progressBarNode: Node = null;
    private progressFillNode: Node = null;
    private queuePanelNode: Node = null;
    private completedPanelNode: Node = null;
    
    // 动画器
    private knifeAnimator: FrameAnimator = null;
    private ingredientAnimator: FrameAnimator = null;
    
    // 状态
    private isChopping: boolean = false;
    
    /**
     * 初始化备菜UI
     */
    public initUI(parent: Node): Node {
        const container = new Node('ProcessingUI');
        parent.addChild(container);
        
        // 创建背景
        this.createBackground(container);
        
        // 创建工作区域
        this.createWorkArea(container);
        
        // 创建砧板
        this.createChoppingBoard(container);
        
        // 创建刀具
        this.createKnife(container);
        
        // 创建食材显示
        this.createIngredientDisplay(container);
        
        // 创建进度条
        this.createProgressBar(container);
        
        // 创建队列面板
        this.createQueuePanel(container);
        
        // 创建完成面板
        this.createCompletedPanel(container);
        
        console.log('[ProcessingUIManager] ✅ 备菜UI初始化完成');
        return container;
    }
    
    /**
     * 创建背景
     */
    private createBackground(parent: Node) {
        this.backgroundNode = new Node('Background');
        const sprite = this.backgroundNode.addComponent(Sprite);
        sprite.color = new Color(60, 50, 45, 255);  // 木质色调
        
        const transform = this.backgroundNode.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(1280, 720);
        }
        
        parent.addChild(this.backgroundNode);
        this.backgroundNode.setSiblingIndex(0);
        
        // 尝试加载背景图
        resources.load(ProcessingAssets.background + '/spriteFrame', SpriteFrame, (err, sf) => {
            if (!err && sf) {
                sprite.spriteFrame = sf;
                sprite.color = Color.WHITE;
            }
        });
    }
    
    /**
     * 创建工作区域
     */
    private createWorkArea(parent: Node) {
        // 工作区域背景
        const workArea = new Node('WorkArea');
        const sprite = workArea.addComponent(Sprite);
        sprite.color = new Color(80, 65, 55, 240);
        
        const transform = workArea.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(600, 400);
        }
        
        workArea.setPosition(0, 20, 0);
        parent.addChild(workArea);
        
        // 区域标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '🔪 备菜工作台';
        titleLabel.fontSize = 24;
        titleLabel.color = UIColors.textGold;
        titleLabel.isBold = true;
        titleNode.setPosition(0, 220, 0);
        parent.addChild(titleNode);
    }
    
    /**
     * 创建砧板
     */
    private createChoppingBoard(parent: Node) {
        this.choppingBoardNode = new Node('ChoppingBoard');
        const sprite = this.choppingBoardNode.addComponent(Sprite);
        sprite.color = new Color(180, 140, 100, 255);  // 木质砧板色
        
        const transform = this.choppingBoardNode.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(300, 200);
        }
        
        this.choppingBoardNode.setPosition(0, 0, 0);
        parent.addChild(this.choppingBoardNode);
        
        // 砧板纹理（简单的线条）
        this.createBoardTexture(this.choppingBoardNode);
        
        // 尝试加载砧板图片
        resources.load(ProcessingAssets.choppingBoard.idle + '/spriteFrame', SpriteFrame, (err, sf) => {
            if (!err && sf) {
                sprite.spriteFrame = sf;
                sprite.color = Color.WHITE;
            }
        });
    }
    
    /**
     * 创建砧板纹理
     */
    private createBoardTexture(parent: Node) {
        // 横向木纹
        for (let i = 0; i < 5; i++) {
            const line = new Node(`WoodGrain_${i}`);
            const sprite = line.addComponent(Sprite);
            sprite.color = new Color(160, 120, 80, 100);
            
            const transform = line.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(280, 2);
            }
            
            line.setPosition(0, -80 + i * 40, 0);
            parent.addChild(line);
        }
    }
    
    /**
     * 创建刀具
     */
    private createKnife(parent: Node) {
        this.knifeNode = new Node('Knife');
        
        // 添加帧动画器
        this.knifeAnimator = this.knifeNode.addComponent(FrameAnimator);
        
        const transform = this.knifeNode.addComponent(UITransform);
        transform.setContentSize(80, 120);
        
        this.knifeNode.setPosition(100, 80, 0);
        parent.addChild(this.knifeNode);
        
        // 创建默认刀具显示
        const knifeLabel = new Node('KnifeEmoji');
        const label = knifeLabel.addComponent(Label);
        label.string = '🔪';
        label.fontSize = 60;
        this.knifeNode.addChild(knifeLabel);
        
        // 加载刀具动画帧
        this.knifeAnimator.loadFrames(ProcessingAssets.knife.chopFrames, () => {
            this.knifeAnimator.setFrameRate(ProcessingAssets.knife.frameRate);
        });
    }
    
    /**
     * 创建食材显示
     */
    private createIngredientDisplay(parent: Node) {
        this.ingredientNode = new Node('Ingredient');
        
        // 添加帧动画器
        this.ingredientAnimator = this.ingredientNode.addComponent(FrameAnimator);
        
        const transform = this.ingredientNode.addComponent(UITransform);
        transform.setContentSize(100, 100);
        
        this.ingredientNode.setPosition(-50, -20, 0);
        parent.addChild(this.ingredientNode);
        
        // 默认食材显示
        const ingredientLabel = new Node('IngredientEmoji');
        const label = ingredientLabel.addComponent(Label);
        label.string = '🧅';
        label.fontSize = 50;
        this.ingredientNode.addChild(ingredientLabel);
    }
    
    /**
     * 创建进度条
     */
    private createProgressBar(parent: Node) {
        const progressContainer = new Node('ProgressContainer');
        progressContainer.setPosition(0, -150, 0);
        parent.addChild(progressContainer);
        
        // 进度条背景
        this.progressBarNode = new Node('ProgressBg');
        const bgSprite = this.progressBarNode.addComponent(Sprite);
        bgSprite.color = new Color(50, 40, 35, 255);
        
        const bgTransform = this.progressBarNode.getComponent(UITransform);
        if (bgTransform) {
            bgTransform.setContentSize(400, 30);
        }
        progressContainer.addChild(this.progressBarNode);
        
        // 进度条填充
        this.progressFillNode = new Node('ProgressFill');
        const fillSprite = this.progressFillNode.addComponent(Sprite);
        fillSprite.color = new Color(100, 200, 100, 255);
        
        const fillTransform = this.progressFillNode.getComponent(UITransform);
        if (fillTransform) {
            fillTransform.setContentSize(0, 24);
            fillTransform.anchorX = 0;
        }
        this.progressFillNode.setPosition(-197, 0, 0);
        progressContainer.addChild(this.progressFillNode);
        
        // 进度文字
        const progressLabel = new Node('ProgressLabel');
        const label = progressLabel.addComponent(Label);
        label.string = '0%';
        label.fontSize = 16;
        label.color = Color.WHITE;
        progressLabel.setPosition(0, 0, 0);
        progressContainer.addChild(progressLabel);
        
        // 尝试加载进度条图片
        resources.load(ProcessingAssets.progressBar.background + '/spriteFrame', SpriteFrame, (err, sf) => {
            if (!err && sf) {
                bgSprite.spriteFrame = sf;
                bgSprite.color = Color.WHITE;
            }
        });
        
        resources.load(ProcessingAssets.progressBar.fill + '/spriteFrame', SpriteFrame, (err, sf) => {
            if (!err && sf) {
                fillSprite.spriteFrame = sf;
                fillSprite.color = Color.WHITE;
            }
        });
    }
    
    /**
     * 创建队列面板
     */
    private createQueuePanel(parent: Node) {
        this.queuePanelNode = new Node('QueuePanel');
        const sprite = this.queuePanelNode.addComponent(Sprite);
        sprite.color = new Color(50, 60, 50, 230);
        
        const transform = this.queuePanelNode.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(180, 350);
        }
        
        this.queuePanelNode.setPosition(-450, 0, 0);
        parent.addChild(this.queuePanelNode);
        
        // 标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '📦 待加工';
        titleLabel.fontSize = 18;
        titleLabel.color = UIColors.textGold;
        titleLabel.isBold = true;
        titleNode.setPosition(0, 155, 0);
        this.queuePanelNode.addChild(titleNode);
        
        // 内容容器
        const content = new Node('Content');
        this.queuePanelNode.addChild(content);
    }
    
    /**
     * 创建完成面板
     */
    private createCompletedPanel(parent: Node) {
        this.completedPanelNode = new Node('CompletedPanel');
        const sprite = this.completedPanelNode.addComponent(Sprite);
        sprite.color = new Color(50, 50, 60, 230);
        
        const transform = this.completedPanelNode.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(180, 350);
        }
        
        this.completedPanelNode.setPosition(450, 0, 0);
        parent.addChild(this.completedPanelNode);
        
        // 标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '✅ 已完成';
        titleLabel.fontSize = 18;
        titleLabel.color = new Color(100, 255, 100, 255);
        titleLabel.isBold = true;
        titleNode.setPosition(0, 155, 0);
        this.completedPanelNode.addChild(titleNode);
        
        // 内容容器
        const content = new Node('Content');
        this.completedPanelNode.addChild(content);
    }
    
    // ==================== 动画控制方法 ====================
    
    /**
     * 播放切菜动画
     */
    public playChopAnimation() {
        if (this.isChopping) return;
        this.isChopping = true;
        
        // 刀具动画
        if (this.knifeAnimator) {
            this.knifeAnimator.play(false, () => {
                this.isChopping = false;
            });
        }
        
        // 刀具移动动画
        if (this.knifeNode) {
            const originalY = this.knifeNode.position.y;
            tween(this.knifeNode)
                .to(0.05, { position: new Vec3(100, originalY - 30, 0) })
                .to(0.05, { position: new Vec3(100, originalY, 0) })
                .start();
        }
        
        // 食材抖动
        if (this.ingredientAnimator) {
            this.ingredientAnimator.playShakeEffect(3, 0.1);
        }
    }
    
    /**
     * 更新进度条
     */
    public updateProgress(progress: number) {
        if (!this.progressFillNode) return;
        
        const transform = this.progressFillNode.getComponent(UITransform);
        if (transform) {
            const maxWidth = 394;
            transform.setContentSize(maxWidth * (progress / 100), 24);
        }
        
        // 更新进度文字
        const container = this.progressFillNode.parent;
        if (container) {
            const labelNode = container.getChildByName('ProgressLabel');
            if (labelNode) {
                const label = labelNode.getComponent(Label);
                if (label) {
                    label.string = `${Math.floor(progress)}%`;
                }
            }
        }
        
        // 根据进度改变颜色
        const fillSprite = this.progressFillNode.getComponent(Sprite);
        if (fillSprite) {
            if (progress >= 100) {
                fillSprite.color = new Color(100, 255, 100, 255);  // 绿色
            } else if (progress >= 66) {
                fillSprite.color = new Color(200, 255, 100, 255);  // 黄绿
            } else if (progress >= 33) {
                fillSprite.color = new Color(255, 200, 100, 255);  // 橙色
            } else {
                fillSprite.color = new Color(255, 150, 100, 255);  // 红橙
            }
        }
    }
    
    /**
     * 设置当前食材
     */
    public setIngredient(type: IngredientType, state: number) {
        if (!this.ingredientNode) return;
        
        const labelNode = this.ingredientNode.getChildByName('IngredientEmoji');
        if (labelNode) {
            const label = labelNode.getComponent(Label);
            if (label) {
                // 根据类型和状态显示不同emoji
                const emojis = this.getIngredientEmojis(type);
                label.string = emojis[state] || emojis[0];
            }
        }
        
        // 尝试加载食材图片
        const assetPath = this.getIngredientAssetPath(type, state);
        if (assetPath && this.ingredientAnimator) {
            this.ingredientAnimator.setStaticImage(assetPath);
        }
    }
    
    /**
     * 获取食材emoji
     */
    private getIngredientEmojis(type: IngredientType): string[] {
        const emojis: Record<string, string[]> = {
            [IngredientType.ONION]: ['🧅', '🧅⚪', '⚪⚪⚪', '✨'],
            [IngredientType.CILANTRO]: ['🌿', '🌿🍃', '🍃🍃🍃', '✨'],
        };
        return emojis[type] || ['❓'];
    }
    
    /**
     * 获取食材资源路径
     */
    private getIngredientAssetPath(type: IngredientType, state: number): string {
        const states = ['whole', 'half', 'diced', 'minced'];
        const stateName = states[state] || 'whole';
        
        if (type === IngredientType.ONION) {
            return (ProcessingAssets.ingredients.onion as any)[stateName];
        } else if (type === IngredientType.CILANTRO) {
            return (ProcessingAssets.ingredients.cilantro as any)[stateName];
        }
        return '';
    }
    
    /**
     * 播放完成特效
     */
    public playCompleteEffect() {
        // 食材缩放动画
        if (this.ingredientNode) {
            tween(this.ingredientNode)
                .to(0.1, { scale: new Vec3(1.3, 1.3, 1) })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }
        
        // 显示完成文字
        const completeLabel = new Node('CompleteText');
        const label = completeLabel.addComponent(Label);
        label.string = '✨ 完成！';
        label.fontSize = 30;
        label.color = new Color(100, 255, 100, 255);
        completeLabel.setPosition(0, 50, 0);
        this.ingredientNode?.parent?.addChild(completeLabel);
        
        // 淡出并销毁
        tween(completeLabel)
            .to(0.5, { position: new Vec3(0, 100, 0) })
            .call(() => completeLabel.destroy())
            .start();
    }
    
    /**
     * 更新队列显示
     */
    public updateQueueDisplay(items: { type: IngredientType; count: number }[]) {
        if (!this.queuePanelNode) return;
        
        const content = this.queuePanelNode.getChildByName('Content');
        if (!content) return;
        
        // 清空现有内容
        content.removeAllChildren();
        
        // 添加食材项
        let yOffset = 120;
        items.forEach((item, index) => {
            const itemNode = new Node(`Item_${index}`);
            const label = itemNode.addComponent(Label);
            const emoji = item.type === IngredientType.ONION ? '🧅' : '🌿';
            label.string = `${emoji} x${item.count}`;
            label.fontSize = 16;
            label.color = Color.WHITE;
            itemNode.setPosition(0, yOffset, 0);
            content.addChild(itemNode);
            yOffset -= 35;
        });
    }
    
    /**
     * 更新完成显示
     */
    public updateCompletedDisplay(count: number, total: number) {
        if (!this.completedPanelNode) return;
        
        const content = this.completedPanelNode.getChildByName('Content');
        if (!content) return;
        
        // 清空现有内容
        content.removeAllChildren();
        
        // 显示完成数量
        const countNode = new Node('Count');
        const label = countNode.addComponent(Label);
        label.string = `${count} / ${total}`;
        label.fontSize = 24;
        label.color = new Color(100, 255, 100, 255);
        countNode.setPosition(0, 50, 0);
        content.addChild(countNode);
        
        // 进度描述
        const descNode = new Node('Desc');
        const descLabel = descNode.addComponent(Label);
        descLabel.string = count >= total ? '全部完成！' : '继续加油！';
        descLabel.fontSize = 14;
        descLabel.color = new Color(200, 200, 200, 255);
        descNode.setPosition(0, 20, 0);
        content.addChild(descNode);
    }
    
    // ==================== 获取节点引用 ====================
    
    public getChoppingBoard(): Node { return this.choppingBoardNode; }
    public getKnife(): Node { return this.knifeNode; }
    public getIngredient(): Node { return this.ingredientNode; }
    public getQueuePanel(): Node { return this.queuePanelNode; }
    public getCompletedPanel(): Node { return this.completedPanelNode; }
}
