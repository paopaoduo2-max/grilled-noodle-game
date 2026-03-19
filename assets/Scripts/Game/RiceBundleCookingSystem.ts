import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;
import { RecipeData, StepType } from '../Data/GameConfig';
import { RiceBundleConfig } from '../Data/RiceBundleConfig';

/**
 * 东北饭包制作系统
 * 独立的制作系统组件，不影响现有CookingSystem
 */
@ccclass('RiceBundleCookingSystem')
export class RiceBundleCookingSystem extends Component {
    private _currentStep: number = 0;
    private _stepProgress: number = 0;
    private _isCooking: boolean = false;
    private _cookingTime: number = 0;
    private _maxCookingTime: number = 0;
    private _sequenceClicks: number = 0;
    private _dragItems: Set<string> = new Set();
    
    // 事件回调
    private _onStepComplete?: (stepId: number) => void;
    private _onCookingComplete?: () => void;
    private _onProgressUpdate?: (progress: number, stepName: string) => void;

    /**
     * 初始化制作系统
     */
    public init(recipe: RecipeData) {
        this._currentStep = 0;
        this._stepProgress = 0;
        this._isCooking = false;
        this._cookingTime = 0;
        this._maxCookingTime = recipe.cookTime;
        this._sequenceClicks = 0;
        this._dragItems.clear();
        
        console.log('[RiceBundleCookingSystem] 初始化完成:', recipe.name);
    }

    /**
     * 开始制作
     */
    public startCooking(recipe: RecipeData): boolean {
        if (this._isCooking) {
            console.warn('[RiceBundleCookingSystem] 已在制作中');
            return false;
        }

        this.init(recipe);
        this._isCooking = true;
        console.log('[RiceBundleCookingSystem] 开始制作:', recipe.name);
        
        // 开始第一步
        this.startCurrentStep();
        return true;
    }

    /**
     * 更新制作进度
     */
    public update(deltaTime: number) {
        if (!this._isCooking) return;

        const currentStep = this.getCurrentStep();
        if (!currentStep) return;

        // 处理不同时序类型的步骤
        switch (currentStep.type) {
            case StepType.TIMING:
                this.updateTimingStep(deltaTime);
                break;
            case StepType.HOLD:
                this.updateHoldStep(deltaTime);
                break;
            case StepType.SEQUENCE:
                this.updateSequenceStep(deltaTime);
                break;
            case StepType.DRAG:
                this.updateDragStep(deltaTime);
                break;
            case StepType.CLICK:
                // 点击类型等待用户操作
                break;
        }

        // 更新进度显示
        if (this._onProgressUpdate) {
            this._onProgressUpdate(this._stepProgress, currentStep.name);
        }
    }

    /**
     * 处理用户输入
     */
    public handleUserInput(inputType: string, data?: any): boolean {
        if (!this._isCooking) return false;

        const currentStep = this.getCurrentStep();
        if (!currentStep) return false;

        let success = false;

        switch (currentStep.type) {
            case StepType.CLICK:
                if (inputType === 'click') {
                    success = this.completeCurrentStep();
                }
                break;
                
            case StepType.TIMING:
                if (inputType === 'timing_click') {
                    success = this.checkTimingAccuracy(data?.timing || 0);
                }
                break;
                
            case StepType.HOLD:
                if (inputType === 'hold_complete') {
                    success = this.completeCurrentStep();
                }
                break;
                
            case StepType.SEQUENCE:
                if (inputType === 'click') {
                    success = this.handleSequenceClick();
                }
                break;
                
            case StepType.DRAG:
                if (inputType === 'drag_drop') {
                    success = this.handleDragDrop(data?.itemId);
                }
                break;
        }

        return success;
    }

    /**
     * 开始当前步骤
     */
    private startCurrentStep() {
        const recipe = RiceBundleConfig.RECIPE_DONGBEI_RICE_BUNDLE;
        if (this._currentStep >= recipe.steps.length) {
            this.completeCooking();
            return;
        }

        const step = recipe.steps[this._currentStep];
        this._stepProgress = 0;
        this._sequenceClicks = 0;
        this._dragItems.clear();
        
        console.log(`[RiceBundleCookingSystem] 开始步骤 ${this._currentStep + 1}: ${step.name}`);
    }

    /**
     * 完成当前步骤
     */
    private completeCurrentStep(): boolean {
        const recipe = RiceBundleConfig.RECIPE_DONGBEI_RICE_BUNDLE;
        const step = recipe.steps[this._currentStep];
        
        console.log(`[RiceBundleCookingSystem] 完成步骤: ${step.name}`);
        
        this._currentStep++;
        this._stepProgress = 1;
        
        // 触发步骤完成事件
        if (this._onStepComplete) {
            this._onStepComplete(step.stepId);
        }
        
        // 开始下一步
        this.startCurrentStep();
        return true;
    }

    /**
     * 更新时机步骤
     */
    private updateTimingStep(deltaTime: number) {
        this._cookingTime += deltaTime;
        this._stepProgress = Math.min(this._cookingTime / 10, 1); // 10秒超时
        
        // 自动完成（如果超时）
        if (this._cookingTime >= 10) {
            this.completeCurrentStep();
        }
    }

    /**
     * 检查时机准确性
     */
    private checkTimingAccuracy(timing: number): boolean {
        const currentStep = this.getCurrentStep();
        if (!currentStep || currentStep.type !== StepType.TIMING) return false;

        const window = currentStep.perfectWindow;
        if (!window) return false;

        const isPerfect = timing >= window.start && timing <= window.end;
        console.log(`[RiceBundleCookingSystem] 时机检查: ${timing}, 完美窗口: ${window.start}-${window.end}, 结果: ${isPerfect ? '完美' : '一般'}`);
        
        return this.completeCurrentStep();
    }

    /**
     * 更新长按步骤
     */
    private updateHoldStep(deltaTime: number) {
        this._stepProgress += deltaTime / 2; // 2秒完成
        this._stepProgress = Math.min(this._stepProgress, 1);
        
        if (this._stepProgress >= 1) {
            this.completeCurrentStep();
        }
    }

    /**
     * 更新连续点击步骤
     */
    private updateSequenceStep(deltaTime: number) {
        // 连续点击步骤需要用户主动点击
        // 这里可以添加超时逻辑
    }

    /**
     * 处理连续点击
     */
    private handleSequenceClick(): boolean {
        const currentStep = this.getCurrentStep();
        if (!currentStep || currentStep.type !== StepType.SEQUENCE) return false;

        this._sequenceClicks++;
        this._stepProgress = this._sequenceClicks / (currentStep.targetValue || 1);
        
        console.log(`[RiceBundleCookingSystem] 连续点击: ${this._sequenceClicks}/${currentStep.targetValue}`);
        
        if (this._sequenceClicks >= (currentStep.targetValue || 1)) {
            return this.completeCurrentStep();
        }
        
        return false;
    }

    /**
     * 更新拖拽步骤
     */
    private updateDragStep(deltaTime: number) {
        // 拖拽步骤需要用户主动操作
        // 这里可以添加超时逻辑
    }

    /**
     * 处理拖拽放置
     */
    private handleDragDrop(itemId: string): boolean {
        const currentStep = this.getCurrentStep();
        if (!currentStep || currentStep.type !== StepType.DRAG) return false;

        if (!this._dragItems.has(itemId)) {
            this._dragItems.add(itemId);
            this._stepProgress = this._dragItems.size / 6; // 6个食材
            
            console.log(`[RiceBundleCookingSystem] 拖拽完成: ${itemId}, 进度: ${this._stepProgress}`);
            
            if (this._dragItems.size >= 6) {
                return this.completeCurrentStep();
            }
        }
        
        return false;
    }

    /**
     * 完成制作
     */
    private completeCooking() {
        this._isCooking = false;
        console.log('[RiceBundleCookingSystem] 制作完成!');
        
        if (this._onCookingComplete) {
            this._onCookingComplete();
        }
    }

    /**
     * 获取当前步骤
     */
    private getCurrentStep() {
        const recipe = RiceBundleConfig.RECIPE_DONGBEI_RICE_BUNDLE;
        return recipe.steps[this._currentStep];
    }

    /**
     * 获取制作进度
     */
    public getProgress(): number {
        const recipe = RiceBundleConfig.RECIPE_DONGBEI_RICE_BUNDLE;
        const totalSteps = recipe.steps.length;
        return (this._currentStep + this._stepProgress) / totalSteps;
    }

    /**
     * 获取当前步骤信息
     */
    public getCurrentStepInfo() {
        return this.getCurrentStep();
    }

    /**
     * 是否在制作中
     */
    public isCooking(): boolean {
        return this._isCooking;
    }

    /**
     * 设置事件回调
     */
    public setCallbacks(onStepComplete?: (stepId: number) => void, 
                       onCookingComplete?: () => void,
                       onProgressUpdate?: (progress: number, stepName: string) => void) {
        this._onStepComplete = onStepComplete;
        this._onCookingComplete = onCookingComplete;
        this._onProgressUpdate = onProgressUpdate;
    }

    /**
     * 重置制作状态
     */
    public reset() {
        this._currentStep = 0;
        this._stepProgress = 0;
        this._isCooking = false;
        this._cookingTime = 0;
        this._sequenceClicks = 0;
        this._dragItems.clear();
        console.log('[RiceBundleCookingSystem] 重置完成');
    }

    /**
     * 销毁
     */
    protected onDestroy() {
        this.reset();
    }
}
