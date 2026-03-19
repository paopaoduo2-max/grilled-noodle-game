import { _decorator, Component, Node, Label, Sprite, Button, UITransform, Color } from 'cc';
const { ccclass, property } = _decorator;
import { RiceBundleConfig } from '../Data/RiceBundleConfig';

/**
 * 东北饭包UI扩展组件
 * 独立的UI扩展组件，可以附加到现有UI上
 */
@ccclass('RiceBundleUIExtension')
export class RiceBundleUIExtension extends Component {
    @property(Label)
    public stepTitleLabel: Label = null;

    @property(Label)
    public stepInstructionLabel: Label = null;

    @property(Sprite)
    public progressBarSprite: Sprite = null;

    @property(Button)
    public actionButton: Button = null;

    @property(Node)
    public ingredientIconsNode: Node = null;

    private _currentStepIndex: number = 0;
    private _stepProgress: number = 0;
    private _actionButtonCallback?: () => void;

    /**
     * 初始化UI扩展
     */
    public init() {
        this._currentStepIndex = 0;
        this._stepProgress = 0;
        this.setupActionButton();
        this.updateStepDisplay();
        
        console.log('[RiceBundleUIExtension] UI扩展初始化完成');
    }

    /**
     * 设置操作按钮
     */
    private setupActionButton() {
        if (this.actionButton) {
            this.actionButton.node.on(Button.EventType.CLICK, this.onActionButtonClick, this);
        }
    }

    /**
     * 操作按钮点击事件
     */
    private onActionButtonClick() {
        if (this._actionButtonCallback) {
            this._actionButtonCallback();
        }
    }

    /**
     * 更新步骤显示
     */
    public updateStepDisplay() {
        const recipe = RiceBundleConfig.RECIPE_DONGBEI_RICE_BUNDLE;
        const step = recipe.steps[this._currentStepIndex];
        
        if (!step) {
            this.showCompletionMessage();
            return;
        }

        // 更新标题
        if (this.stepTitleLabel) {
            this.stepTitleLabel.string = `${this._currentStepIndex + 1}. ${step.name}`;
        }

        // 更新说明
        if (this.stepInstructionLabel) {
            this.stepInstructionLabel.string = step.instruction;
        }

        // 更新进度条
        this.updateProgressBar();

        // 更新操作按钮
        this.updateActionButton(step);

        // 更新食材图标
        this.updateIngredientIcons();

        console.log(`[RiceBundleUIExtension] 更新步骤显示: ${step.name}`);
    }

    /**
     * 更新进度条
     */
    private updateProgressBar() {
        if (this.progressBarSprite) {
            const recipe = RiceBundleConfig.RECIPE_DONGBEI_RICE_BUNDLE;
            const totalSteps = recipe.steps.length;
            const overallProgress = (this._currentStepIndex + this._stepProgress) / totalSteps;
            
            // 这里可以设置进度条的宽度或颜色
            // 由于是扩展组件，我们通过事件来更新进度
            this.node.emit('progress-update', overallProgress, this._stepProgress);
        }
    }

    /**
     * 更新操作按钮
     */
    private updateActionButton(step: any) {
        if (!this.actionButton) return;

        let buttonText = '';
        let buttonEnabled = true;

        switch (step.type) {
            case 'click':
                buttonText = '点击完成';
                break;
            case 'timing':
                buttonText = '确认时机';
                buttonEnabled = false; // 时机按钮需要特殊处理
                break;
            case 'hold':
                buttonText = '长按操作';
                break;
            case 'sequence':
                buttonText = `连续点击 (0/${step.targetValue || 1})`;
                break;
            case 'drag':
                buttonText = '拖拽完成';
                break;
            default:
                buttonText = '继续';
        }

        const buttonLabel = this.actionButton.getComponentInChildren(Label);
        if (buttonLabel) {
            buttonLabel.string = buttonText;
        }

        this.actionButton.enabled = buttonEnabled;
    }

    /**
     * 更新食材图标显示
     */
    private updateIngredientIcons() {
        if (!this.ingredientIconsNode) return;

        // 清除现有图标
        this.ingredientIconsNode.removeAllChildren();

        const recipe = RiceBundleConfig.RECIPE_DONGBEI_RICE_BUNDLE;
        const step = recipe.steps[this._currentStepIndex];
        
        if (!step) return;

        // 根据步骤类型显示相应的食材图标
        switch (step.type) {
            case 'drag':
                this.createIngredientIcons(recipe.ingredients);
                break;
            case 'sequence':
                this.createSequenceIcons(step.targetValue || 1);
                break;
            case 'timing':
                this.createTimingIcon();
                break;
            default:
                this.createDefaultIcon();
        }
    }

    /**
     * 创建食材图标
     */
    private createIngredientIcons(ingredients: any[]) {
        ingredients.forEach((ingredient, index) => {
            const iconNode = new Node(`Ingredient_${index}`);
            const transform = iconNode.addComponent(UITransform);
            transform.setContentSize(40, 40);
            
            const sprite = iconNode.addComponent(Sprite);
            sprite.color = this.getIngredientColor(ingredient.type);
            
            iconNode.setPosition(index * 50 - 100, 0, 0);
            this.ingredientIconsNode.addChild(iconNode);
        });
    }

    /**
     * 创建连续点击图标
     */
    private createSequenceIcons(count: number) {
        for (let i = 0; i < count; i++) {
            const iconNode = new Node(`Sequence_${i}`);
            const transform = iconNode.addComponent(UITransform);
            transform.setContentSize(30, 30);
            
            const sprite = iconNode.addComponent(Sprite);
            sprite.color = new Color(128, 128, 128, 255); // 灰色
            
            iconNode.setPosition(i * 40 - (count - 1) * 20, 0, 0);
            this.ingredientIconsNode.addChild(iconNode);
        }
    }

    /**
     * 创建时机图标
     */
    private createTimingIcon() {
        const iconNode = new Node('Timing_Icon');
        const transform = iconNode.addComponent(UITransform);
        transform.setContentSize(50, 50);
        
        const sprite = iconNode.addComponent(Sprite);
        sprite.color = new Color(255, 215, 0, 255); // 金色
        
        this.ingredientIconsNode.addChild(iconNode);
    }

    /**
     * 创建默认图标
     */
    private createDefaultIcon() {
        const iconNode = new Node('Default_Icon');
        const transform = iconNode.addComponent(UITransform);
        transform.setContentSize(40, 40);
        
        const sprite = iconNode.addComponent(Sprite);
        sprite.color = new Color(100, 100, 100, 255); // 灰色
        
        this.ingredientIconsNode.addChild(iconNode);
    }

    /**
     * 获取食材颜色
     */
    private getIngredientColor(ingredientType: string): Color {
        const colors: { [key: string]: Color } = {
            'rice': new Color(255, 255, 255, 255),
            'egg': new Color(255, 215, 0, 255),
            'green_onion': new Color(144, 238, 144, 255),
            'potato': new Color(222, 184, 135, 255),
            'lettuce': new Color(127, 255, 0, 255),
            'cilantro': new Color(144, 238, 144, 255)
        };
        
        return colors[ingredientType] || new Color(128, 128, 128, 255);
    }

    /**
     * 显示完成消息
     */
    private showCompletionMessage() {
        if (this.stepTitleLabel) {
            this.stepTitleLabel.string = '制作完成! 🎉';
        }
        
        if (this.stepInstructionLabel) {
            this.stepInstructionLabel.string = '东北饭包制作完成，可以出售给客户了！';
        }

        if (this.actionButton) {
            const buttonLabel = this.actionButton.getComponentInChildren(Label);
            if (buttonLabel) {
                buttonLabel.string = '完成';
            }
        }
    }

    /**
     * 更新步骤进度
     */
    public updateStepProgress(progress: number) {
        this._stepProgress = Math.max(0, Math.min(1, progress));
        this.updateProgressBar();
    }

    /**
     * 进入下一步
     */
    public nextStep() {
        this._currentStepIndex++;
        this._stepProgress = 0;
        this.updateStepDisplay();
    }

    /**
     * 设置操作按钮回调
     */
    public setActionButtonCallback(callback: () => void) {
        this._actionButtonCallback = callback;
    }

    /**
     * 获取当前步骤索引
     */
    public getCurrentStepIndex(): number {
        return this._currentStepIndex;
    }

    /**
     * 获取步骤进度
     */
    public getStepProgress(): number {
        return this._stepProgress;
    }

    /**
     * 重置UI
     */
    public reset() {
        this._currentStepIndex = 0;
        this._stepProgress = 0;
        this.updateStepDisplay();
    }

    /**
     * 销毁
     */
    protected onDestroy() {
        if (this.actionButton) {
            this.actionButton.node.off(Button.EventType.CLICK, this.onActionButtonClick, this);
        }
    }
}
