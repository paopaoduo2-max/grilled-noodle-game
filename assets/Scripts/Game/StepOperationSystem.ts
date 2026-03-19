import { _decorator, Component, Node, Sprite, Label, ProgressBar, Color, UITransform, EventTouch, Vec3, Input, input } from 'cc';
import { RecipeStep, StepType, RecipeData } from '../Data/GameConfig';

const { ccclass, property } = _decorator;

/**
 * 步骤状态
 */
enum StepState {
    WAITING = 'waiting',      // 等待开始
    EXECUTING = 'executing',  // 执行中
    COMPLETED = 'completed',  // 已完成
    FAILED = 'failed'         // 失败
}

/**
 * 单个步骤的执行数据
 */
interface StepExecutionData {
    step: RecipeStep;
    state: StepState;
    quality: number;          // 品质分数 0-100
    startTime: number;
    endTime: number;
}

/**
 * 多步骤操作系统
 * 处理复杂的烹饪步骤操作
 */
@ccclass('StepOperationSystem')
export class StepOperationSystem extends Component {
    @property(Node)
    operationPanel: Node = null;

    @property(Label)
    stepNameLabel: Label = null;

    @property(Label)
    instructionLabel: Label = null;

    @property(ProgressBar)
    progressBar: ProgressBar = null;

    @property(Node)
    perfectZone: Node = null;  // 完美时机区域

    @property(Label)
    feedbackLabel: Label = null;  // 品质反馈文字

    private currentRecipe: RecipeData = null;
    private currentStepIndex: number = 0;
    private steps: RecipeStep[] = [];
    private stepResults: StepExecutionData[] = [];

    // 时机判定相关
    private timingValue: number = 0;
    private timingDirection: number = 1;  // 1正向，-1反向
    private isWaitingInput: boolean = false;

    // 长按相关
    private holdProgress: number = 0;
    private holdDuration: number = 0;

    // 连续点击相关
    private sequenceCount: number = 0;
    private sequenceTarget: number = 0;

    // 拖拽相关
    private isDragging: boolean = false;
    private dragStartPos: Vec3 = new Vec3();

    onLoad() {
        this.operationPanel?.active && (this.operationPanel.active = false);
        console.log('[StepOperationSystem] 多步骤操作系统初始化');
    }

    /**
     * 开始制作流程
     * @param recipe 菜谱数据
     */
    startCooking(recipe: RecipeData) {
        this.currentRecipe = recipe;
        this.steps = recipe.steps;
        this.currentStepIndex = 0;
        this.stepResults = [];

        if (this.operationPanel) {
            this.operationPanel.active = true;
        }

        console.log(`[StepOperationSystem] 开始制作: ${recipe.name}, 共${this.steps.length}个步骤`);

        // 开始第一个步骤
        this.startNextStep();
    }

    /**
     * 开始下一个步骤
     */
    private startNextStep() {
        if (this.currentStepIndex >= this.steps.length) {
            // 所有步骤完成
            this.finishCooking();
            return;
        }

        const step = this.steps[this.currentStepIndex];
        console.log(`[StepOperationSystem] 步骤 ${this.currentStepIndex + 1}/${this.steps.length}: ${step.name}`);

        // 更新UI
        if (this.stepNameLabel) {
            this.stepNameLabel.string = `步骤 ${this.currentStepIndex + 1}/${this.steps.length}: ${step.name}`;
        }
        if (this.instructionLabel) {
            this.instructionLabel.string = step.instruction;
        }

        // 清除反馈文字
        if (this.feedbackLabel) {
            this.feedbackLabel.string = '';
        }

        // 根据步骤类型设置操作
        switch (step.type) {
            case StepType.CLICK:
                this.setupClickOperation();
                break;
            case StepType.HOLD:
                this.setupHoldOperation(step.duration || 2);
                break;
            case StepType.TIMING:
                this.setupTimingOperation(step.perfectWindow || { start: 0.45, end: 0.55 });
                break;
            case StepType.SWIPE:
                this.setupSwipeOperation(step.direction || 'horizontal');
                break;
            case StepType.DRAG:
                this.setupDragOperation();
                break;
            case StepType.SEQUENCE:
                this.setupSequenceOperation(step.targetValue || 3);
                break;
        }
    }

    /**
     * 设置点击操作
     */
    private setupClickOperation() {
        this.isWaitingInput = true;
        // 监听点击
        if (this.operationPanel) {
            this.operationPanel.once(Node.EventType.TOUCH_END, this.onClickAction, this);
        }
    }

    /**
     * 设置长按操作
     */
    private setupHoldOperation(duration: number) {
        this.holdProgress = 0;
        this.holdDuration = duration;
        this.isWaitingInput = true;

        if (this.progressBar) {
            this.progressBar.progress = 0;
            this.progressBar.node.active = true;
        }

        // 监听按住
        if (this.operationPanel) {
            this.operationPanel.on(Node.EventType.TOUCH_START, this.onHoldStart, this);
            this.operationPanel.on(Node.EventType.TOUCH_END, this.onHoldEnd, this);
            this.operationPanel.on(Node.EventType.TOUCH_CANCEL, this.onHoldEnd, this);
        }
    }

    /**
     * 设置时机判定操作
     */
    private setupTimingOperation(perfectWindow: { start: number, end: number }) {
        this.timingValue = 0;
        this.timingDirection = 1;
        this.isWaitingInput = true;

        if (this.progressBar) {
            this.progressBar.node.active = true;
            this.progressBar.progress = 0;
        }

        // 显示完美区域
        if (this.perfectZone) {
            this.perfectZone.active = true;
            // 设置完美区域位置（简化版，用进度条的一部分表示）
        }

        // 开始循环移动进度条
        this.schedule(this.updateTiming, 0.016);

        // 监听点击
        if (this.operationPanel) {
            this.operationPanel.once(Node.EventType.TOUCH_END, this.onTimingAction, this);
        }
    }

    /**
     * 更新时机判定进度
     */
    private updateTiming() {
        this.timingValue += 0.02 * this.timingDirection;

        // 来回移动
        if (this.timingValue >= 1) {
            this.timingValue = 1;
            this.timingDirection = -1;
        } else if (this.timingValue <= 0) {
            this.timingValue = 0;
            this.timingDirection = 1;
        }

        if (this.progressBar) {
            this.progressBar.progress = this.timingValue;
        }
    }

    /**
     * 设置滑动操作
     */
    private setupSwipeOperation(direction: string) {
        this.isWaitingInput = true;
        // 监听滑动
        if (this.operationPanel) {
            this.operationPanel.on(Node.EventType.TOUCH_START, this.onSwipeStart, this);
            this.operationPanel.on(Node.EventType.TOUCH_MOVE, this.onSwipeMove, this);
            this.operationPanel.on(Node.EventType.TOUCH_END, this.onSwipeEnd, this);
        }
    }

    /**
     * 设置拖拽操作
     */
    private setupDragOperation() {
        this.isWaitingInput = true;
        this.isDragging = false;
        // 监听拖拽
        if (this.operationPanel) {
            this.operationPanel.on(Node.EventType.TOUCH_START, this.onDragStart, this);
            this.operationPanel.on(Node.EventType.TOUCH_MOVE, this.onDragMove, this);
            this.operationPanel.on(Node.EventType.TOUCH_END, this.onDragEnd, this);
        }
    }

    /**
     * 设置连续点击操作
     */
    private setupSequenceOperation(targetCount: number) {
        this.sequenceCount = 0;
        this.sequenceTarget = targetCount;
        this.isWaitingInput = true;

        if (this.instructionLabel) {
            this.instructionLabel.string += ` (${this.sequenceCount}/${this.sequenceTarget})`;
        }

        // 监听连续点击
        if (this.operationPanel) {
            this.operationPanel.on(Node.EventType.TOUCH_END, this.onSequenceClick, this);
        }
    }

    // ========== 操作回调 ==========

    private onClickAction() {
        if (!this.isWaitingInput) return;
        this.completeStep(100);  // 点击操作默认完美
    }

    private isHolding: boolean = false;

    private onHoldStart() {
        this.isHolding = true;
        this.schedule(this.updateHoldProgress, 0.016);
    }

    private onHoldEnd() {
        if (!this.isHolding) return;
        this.isHolding = false;
        this.unschedule(this.updateHoldProgress);

        // 判断是否完成
        if (this.holdProgress >= 0.95) {
            this.completeStep(100);  // 完美完成
        } else if (this.holdProgress >= 0.7) {
            this.completeStep(80);   // 良好
        } else {
            this.completeStep(40);   // 不够长
        }
    }

    private updateHoldProgress() {
        if (!this.isHolding) return;

        this.holdProgress += 0.016 / this.holdDuration;
        if (this.holdProgress > 1) this.holdProgress = 1;

        if (this.progressBar) {
            this.progressBar.progress = this.holdProgress;
        }

        // 自动完成
        if (this.holdProgress >= 1) {
            this.onHoldEnd();
        }
    }

    private onTimingAction() {
        if (!this.isWaitingInput) return;

        this.unschedule(this.updateTiming);

        // 获取当前步骤的完美窗口
        const step = this.steps[this.currentStepIndex];
        const perfectWindow = step.perfectWindow || { start: 0.45, end: 0.55 };

        // 计算品质
        let quality = 0;
        if (this.timingValue >= perfectWindow.start && this.timingValue <= perfectWindow.end) {
            quality = 100;  // 完美
        } else {
            // 根据偏离度计算
            const center = (perfectWindow.start + perfectWindow.end) / 2;
            const deviation = Math.abs(this.timingValue - center);
            if (deviation < 0.15) {
                quality = 80;  // 良好
            } else if (deviation < 0.3) {
                quality = 60;  // 合格
            } else {
                quality = 30;  // 失败
            }
        }

        this.completeStep(quality);
    }

    private swipeStartPos: Vec3 = new Vec3();

    private onSwipeStart(event: EventTouch) {
        const uiPos = event.getUILocation();
        this.swipeStartPos.set(uiPos.x, uiPos.y, 0);
    }

    private onSwipeMove(event: EventTouch) {
        // 可以显示滑动轨迹
    }

    private onSwipeEnd(event: EventTouch) {
        if (!this.isWaitingInput) return;

        const uiPos = event.getUILocation();
        const endPos = new Vec3(uiPos.x, uiPos.y, 0);
        const delta = endPos.subtract(this.swipeStartPos);

        // 计算滑动距离和方向
        const distance = delta.length();
        const direction = this.steps[this.currentStepIndex].direction || 'horizontal';

        let quality = 0;
        if (distance > 100) {  // 滑动距离足够
            // 检查方向是否正确
            const isCorrectDirection = 
                (direction === 'horizontal' && Math.abs(delta.x) > Math.abs(delta.y)) ||
                (direction === 'vertical' && Math.abs(delta.y) > Math.abs(delta.x)) ||
                direction === 'circle' ||
                direction === 'up' && delta.y > 0 ||
                direction === 'down' && delta.y < 0;

            quality = isCorrectDirection ? 100 : 60;
        } else {
            quality = 40;  // 滑动距离不够
        }

        this.completeStep(quality);
    }

    private onDragStart(event: EventTouch) {
        this.isDragging = true;
        const uiPos = event.getUILocation();
        this.dragStartPos.set(uiPos.x, uiPos.y, 0);
    }

    private onDragMove(event: EventTouch) {
        if (!this.isDragging) return;
        // 可以显示拖拽物体跟随
    }

    private onDragEnd(event: EventTouch) {
        if (!this.isWaitingInput || !this.isDragging) return;
        this.isDragging = false;

        const uiPos = event.getUILocation();
        const endPos = new Vec3(uiPos.x, uiPos.y, 0);
        const distance = endPos.subtract(this.dragStartPos).length();

        // 简单判断：拖拽距离足够就算成功
        const quality = distance > 50 ? 100 : 60;
        this.completeStep(quality);
    }

    private onSequenceClick() {
        if (!this.isWaitingInput) return;

        this.sequenceCount++;

        if (this.instructionLabel) {
            const step = this.steps[this.currentStepIndex];
            this.instructionLabel.string = step.instruction + ` (${this.sequenceCount}/${this.sequenceTarget})`;
        }

        if (this.sequenceCount >= this.sequenceTarget) {
            // 完成连续点击
            this.completeStep(100);
        }
    }

    /**
     * 完成当前步骤
     */
    private completeStep(quality: number) {
        if (!this.isWaitingInput) return;
        this.isWaitingInput = false;

        const step = this.steps[this.currentStepIndex];

        // 记录步骤结果
        const stepData: StepExecutionData = {
            step,
            state: quality >= 60 ? StepState.COMPLETED : StepState.FAILED,
            quality,
            startTime: Date.now(),
            endTime: Date.now()
        };
        this.stepResults.push(stepData);

        // 显示品质反馈
        this.showQualityFeedback(quality);

        // 清理事件监听
        this.cleanupCurrentStep();

        // 1秒后进入下一步
        this.scheduleOnce(() => {
            this.currentStepIndex++;
            this.startNextStep();
        }, 1);
    }

    /**
     * 显示品质反馈
     */
    private showQualityFeedback(quality: number) {
        if (!this.feedbackLabel) return;

        let text = "";
        let colorHex = "#FFFFFF";

        if (quality >= 100) {
            text = "Perfect! 完美！";
            colorHex = "#FFD700";  // 金色
        } else if (quality >= 80) {
            text = "Good! 不错！";
            colorHex = "#32CD32";  // 绿色
        } else if (quality >= 60) {
            text = "OK 还行";
            colorHex = "#FFA500";  // 橙色
        } else {
            text = "Bad... 糟糕";
            colorHex = "#FF0000";  // 红色
        }

        this.feedbackLabel.string = text;
        const color = new Color();
        color.fromHEX(colorHex);
        this.feedbackLabel.color = color;

        console.log(`[StepOperationSystem] ${text} (品质: ${quality})`);
    }

    /**
     * 清理当前步骤的监听
     */
    private cleanupCurrentStep() {
        this.unscheduleAllCallbacks();

        if (this.operationPanel) {
            this.operationPanel.off(Node.EventType.TOUCH_END);
            this.operationPanel.off(Node.EventType.TOUCH_START);
            this.operationPanel.off(Node.EventType.TOUCH_MOVE);
            this.operationPanel.off(Node.EventType.TOUCH_CANCEL);
        }

        if (this.progressBar) {
            this.progressBar.node.active = false;
        }

        if (this.perfectZone) {
            this.perfectZone.active = false;
        }
    }

    /**
     * 完成整个制作流程
     */
    private finishCooking() {
        console.log('[StepOperationSystem] 制作完成！');

        // 计算整体品质
        const avgQuality = this.calculateAverageQuality();

        if (this.operationPanel) {
            this.operationPanel.active = false;
        }

        // 触发完成事件
        this.node.emit('cooking-finished', {
            recipe: this.currentRecipe,
            quality: avgQuality,
            stepResults: this.stepResults
        });
    }

    /**
     * 计算平均品质
     */
    private calculateAverageQuality(): number {
        if (this.stepResults.length === 0) return 0;

        const sum = this.stepResults.reduce((acc, result) => acc + result.quality, 0);
        return Math.round(sum / this.stepResults.length);
    }

    /**
     * 取消制作
     */
    cancelCooking() {
        this.cleanupCurrentStep();
        if (this.operationPanel) {
            this.operationPanel.active = false;
        }
        console.log('[StepOperationSystem] 制作已取消');
    }
}

