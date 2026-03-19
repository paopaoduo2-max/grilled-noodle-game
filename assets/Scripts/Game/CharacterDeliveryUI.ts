import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Vec3, tween, Sprite, SpriteFrame, resources } from 'cc';
import { getCharacterById, getCharacterDisplay, CharacterAssetConfig } from './EventCharacterAssets';

const { ccclass, property } = _decorator;

/**
 * 🎭 角色交付UI组件
 * 用于显示事件中的角色，并接收玩家拖动的食材
 */
@ccclass('CharacterDeliveryUI')
export class CharacterDeliveryUI extends Component {
    
    private characterNode: Node = null;
    private characterConfig: CharacterAssetConfig = null;
    private deliveryCallback: (itemType: string) => boolean = null;
    private requiredItem: string = '';          // 需要的食材类型
    private currentProgress: number = 0;        // 当前进度
    private targetProgress: number = 1;         // 目标进度
    private progressLabel: Label = null;
    private characterLabel: Label = null;
    
    /**
     * 初始化角色交付UI
     */
    public initialize(
        characterId: string, 
        requiredItem: string,
        targetCount: number,
        onDelivery: (itemType: string) => boolean
    ) {
        this.characterConfig = getCharacterById(characterId);
        this.requiredItem = requiredItem;
        this.targetProgress = targetCount;
        this.deliveryCallback = onDelivery;
        
        this.createUI();
    }
    
    /**
     * 创建UI
     */
    private createUI() {
        const container = new Node('CharacterContainer');
        this.node.addChild(container);
        
        const transform = container.addComponent(UITransform);
        transform.setContentSize(200, 280);
        
        // 背景
        const bg = container.addComponent(Graphics);
        bg.fillColor = new Color(255, 255, 255, 240);
        bg.roundRect(-100, -140, 200, 280, 16);
        bg.fill();
        bg.strokeColor = new Color(100, 180, 255, 255);
        bg.lineWidth = 3;
        bg.roundRect(-100, -140, 200, 280, 16);
        bg.stroke();
        
        // 角色显示区域
        this.characterNode = new Node('Character');
        container.addChild(this.characterNode);
        this.characterNode.setPosition(0, 50, 0);
        
        const charTransform = this.characterNode.addComponent(UITransform);
        charTransform.setContentSize(150, 180);
        
        // 显示角色（emoji或图片）
        const display = this.characterConfig ? 
            getCharacterDisplay(this.characterConfig.id) : 
            { type: 'emoji' as const, content: '❓' };
        
        if (display.type === 'emoji') {
            // 使用emoji显示
            this.characterLabel = this.characterNode.addComponent(Label);
            this.characterLabel.string = display.content;
            this.characterLabel.fontSize = 80;
        } else {
            // TODO: 使用图片显示（后续实现）
            // 目前先用emoji
            this.characterLabel = this.characterNode.addComponent(Label);
            this.characterLabel.string = this.characterConfig?.emoji || '❓';
            this.characterLabel.fontSize = 80;
        }
        
        // 角色名称
        const nameNode = new Node('Name');
        container.addChild(nameNode);
        nameNode.setPosition(0, -50, 0);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = this.characterConfig?.name || '未知角色';
        nameLabel.fontSize = 18;
        nameLabel.color = new Color(30, 30, 40, 255);
        nameLabel.isBold = true;
        
        // 需求提示
        const requireNode = new Node('Require');
        container.addChild(requireNode);
        requireNode.setPosition(0, -80, 0);
        const requireLabel = requireNode.addComponent(Label);
        requireLabel.string = `需要: ${this.requiredItem}`;
        requireLabel.fontSize = 14;
        requireLabel.color = new Color(80, 80, 90, 255);
        
        // 进度显示
        const progressNode = new Node('Progress');
        container.addChild(progressNode);
        progressNode.setPosition(0, -105, 0);
        this.progressLabel = progressNode.addComponent(Label);
        this.updateProgressDisplay();
        
        // 交付区域提示
        const dropZone = new Node('DropZone');
        container.addChild(dropZone);
        dropZone.setPosition(0, -130, 0);
        const dropLabel = dropZone.addComponent(Label);
        dropLabel.string = '👆 拖动食材到这里交付';
        dropLabel.fontSize = 12;
        dropLabel.color = new Color(100, 150, 200, 255);
        
        this.characterNode = container;
        
        // 入场动画
        container.setScale(0, 0, 1);
        tween(container)
            .to(0.4, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }
    
    /**
     * 更新进度显示
     */
    private updateProgressDisplay() {
        if (this.progressLabel) {
            this.progressLabel.string = `进度: ${this.currentProgress}/${this.targetProgress}`;
            this.progressLabel.fontSize = 16;
            
            if (this.currentProgress >= this.targetProgress) {
                this.progressLabel.color = new Color(50, 200, 100, 255);
            } else {
                this.progressLabel.color = new Color(255, 150, 50, 255);
            }
        }
    }
    
    /**
     * 尝试交付食材
     * @returns 是否交付成功
     */
    public tryDelivery(itemType: string): boolean {
        if (this.currentProgress >= this.targetProgress) {
            console.log('[CharacterDeliveryUI] 已完成交付，无需更多');
            return false;
        }
        
        // 检查是否是需要的食材
        if (itemType !== this.requiredItem) {
            this.showDeliveryFeedback(false, `需要 ${this.requiredItem}，不是 ${itemType}`);
            return false;
        }
        
        // 调用回调确认
        if (this.deliveryCallback && !this.deliveryCallback(itemType)) {
            return false;
        }
        
        // 更新进度
        this.currentProgress++;
        this.updateProgressDisplay();
        
        // 显示成功反馈
        this.showDeliveryFeedback(true, '+1');
        
        // 检查是否完成
        if (this.currentProgress >= this.targetProgress) {
            this.onDeliveryComplete();
        }
        
        return true;
    }
    
    /**
     * 显示交付反馈
     */
    private showDeliveryFeedback(success: boolean, message: string) {
        const feedbackNode = new Node('Feedback');
        this.node.addChild(feedbackNode);
        feedbackNode.setPosition(0, 80, 0);
        
        const label = feedbackNode.addComponent(Label);
        label.string = success ? `✅ ${message}` : `❌ ${message}`;
        label.fontSize = success ? 24 : 16;
        label.color = success ? new Color(50, 200, 100, 255) : new Color(255, 100, 100, 255);
        
        // 动画：上浮消失
        tween(feedbackNode)
            .to(0.5, { position: new Vec3(0, 130, 0) }, { easing: 'quadOut' })
            .to(0.3, { scale: new Vec3(0, 0, 1) })
            .call(() => feedbackNode.destroy())
            .start();
        
        // 成功时角色抖动
        if (success && this.characterNode) {
            tween(this.characterNode)
                .to(0.05, { position: new Vec3(5, this.characterNode.position.y, 0) })
                .to(0.05, { position: new Vec3(-5, this.characterNode.position.y, 0) })
                .to(0.05, { position: new Vec3(0, this.characterNode.position.y, 0) })
                .start();
        }
    }
    
    /**
     * 交付完成
     */
    private onDeliveryComplete() {
        console.log('[CharacterDeliveryUI] ✅ 交付完成！');
        
        // 显示完成动画
        const completeNode = new Node('Complete');
        this.node.addChild(completeNode);
        completeNode.setPosition(0, 0, 0);
        
        const label = completeNode.addComponent(Label);
        label.string = '🎉 交付完成！';
        label.fontSize = 28;
        label.color = new Color(50, 200, 100, 255);
        
        // 角色开心动画
        if (this.characterLabel) {
            // 切换到开心表情
            const happyEmoji = this.getHappyEmoji();
            this.characterLabel.string = happyEmoji;
        }
        
        tween(completeNode)
            .to(0.3, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
            .delay(1)
            .to(0.3, { scale: new Vec3(0, 0, 1) })
            .call(() => completeNode.destroy())
            .start();
    }
    
    /**
     * 获取开心表情
     */
    private getHappyEmoji(): string {
        if (!this.characterConfig) return '😊';
        
        // 根据角色类型返回对应的开心表情
        switch (this.characterConfig.id) {
            case 'kindergarten_teacher': return '👩‍🏫😊';
            case 'kindergarten_kid': return '😄';
            case 'delivery_rider': return '🛵👍';
            case 'office_worker': return '😊';
            case 'business_manager': return '👔😊';
            case 'elderly_neighbor': return '😄';
            case 'young_mother': return '🥰';
            case 'food_critic': return '🎩👏';
            default: return '😊';
        }
    }
    
    /**
     * 检查是否是有效的交付目标位置
     */
    public isValidDropPosition(worldPos: Vec3): boolean {
        if (!this.characterNode) return false;
        
        const transform = this.characterNode.getComponent(UITransform);
        if (!transform) return false;
        
        // 将世界坐标转换为本地坐标
        const localPos = this.characterNode.inverseTransformPoint(new Vec3(), worldPos);
        
        // 检查是否在角色范围内
        const halfWidth = transform.width / 2;
        const halfHeight = transform.height / 2;
        
        return Math.abs(localPos.x) < halfWidth && Math.abs(localPos.y) < halfHeight;
    }
    
    /**
     * 获取当前进度
     */
    public getProgress(): { current: number, target: number } {
        return { current: this.currentProgress, target: this.targetProgress };
    }
    
    /**
     * 是否已完成
     */
    public isComplete(): boolean {
        return this.currentProgress >= this.targetProgress;
    }
    
    /**
     * 销毁UI
     */
    public destroyUI() {
        if (this.characterNode) {
            tween(this.characterNode)
                .to(0.3, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
                .call(() => {
                    this.node.destroy();
                })
                .start();
        } else {
            this.node.destroy();
        }
    }
}
