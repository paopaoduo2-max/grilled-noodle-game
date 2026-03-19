import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;
import { StepType } from '../Data/GameConfig';
import { RiceBundleConfig } from '../Data/RiceBundleConfig';

/**
 * 东北饭包准备阶段系统
 * 独立的准备阶段组件，不影响现有PreparePhaseUI
 */
@ccclass('RiceBundlePrepareSystem')
export class RiceBundlePrepareSystem extends Component {
    private _currentTaskIndex: number = 0;
    private _taskProgress: number = 0;
    private _isTaskActive: boolean = false;
    private _sequenceClicks: number = 0;
    private _holdTime: number = 0;
    private _completedTasks: Set<string> = new Set();
    
    // 事件回调
    private _onTaskComplete?: (taskId: string) => void;
    private _onAllTasksComplete?: () => void;
    private _onProgressUpdate?: (progress: number, taskName: string) => void;

    /**
     * 初始化准备系统
     */
    public init() {
        this._currentTaskIndex = 0;
        this._taskProgress = 0;
        this._isTaskActive = false;
        this._sequenceClicks = 0;
        this._holdTime = 0;
        this._completedTasks.clear();
        
        console.log('[RiceBundlePrepareSystem] 初始化完成');
    }

    /**
     * 开始准备任务
     */
    public startPrepareTasks(): boolean {
        if (this._isTaskActive) {
            console.warn('[RiceBundlePrepareSystem] 任务已在进行中');
            return false;
        }

        this.init();
        this._isTaskActive = true;
        console.log('[RiceBundlePrepareSystem] 开始准备任务');
        
        // 开始第一个任务
        this.startCurrentTask();
        return true;
    }

    /**
     * 更新准备进度
     */
    public update(deltaTime: number) {
        if (!this._isTaskActive) return;

        const currentTask = this.getCurrentTask();
        if (!currentTask) return;

        // 处理不同时序类型的任务
        switch (currentTask.type) {
            case StepType.HOLD:
                this.updateHoldTask(deltaTime);
                break;
            case StepType.SEQUENCE:
                this.updateSequenceTask(deltaTime);
                break;
            case StepType.CLICK:
                // 点击类型等待用户操作
                break;
        }

        // 更新进度显示
        if (this._onProgressUpdate) {
            this._onProgressUpdate(this._taskProgress, currentTask.name);
        }
    }

    /**
     * 处理用户输入
     */
    public handleUserInput(inputType: string, data?: any): boolean {
        if (!this._isTaskActive) return false;

        const currentTask = this.getCurrentTask();
        if (!currentTask) return false;

        let success = false;

        switch (currentTask.type) {
            case StepType.CLICK:
                if (inputType === 'click') {
                    success = this.completeCurrentTask();
                }
                break;
                
            case StepType.HOLD:
                if (inputType === 'hold_start') {
                    this._holdTime = 0;
                } else if (inputType === 'hold_update') {
                    this._holdTime += data?.deltaTime || 0;
                    this._taskProgress = Math.min(this._holdTime / currentTask.duration, 1);
                    
                    if (this._holdTime >= currentTask.duration) {
                        success = this.completeCurrentTask();
                    }
                }
                break;
                
            case StepType.SEQUENCE:
                if (inputType === 'click') {
                    success = this.handleSequenceClick();
                }
                break;
        }

        return success;
    }

    /**
     * 开始当前任务
     */
    private startCurrentTask() {
        const tasks = RiceBundleConfig.PREPARE_TASKS;
        if (this._currentTaskIndex >= tasks.length) {
            this.completeAllTasks();
            return;
        }

        const task = tasks[this._currentTaskIndex];
        this._taskProgress = 0;
        this._sequenceClicks = 0;
        this._holdTime = 0;
        
        console.log(`[RiceBundlePrepareSystem] 开始任务 ${this._currentTaskIndex + 1}: ${task.name}`);
    }

    /**
     * 完成当前任务
     */
    private completeCurrentTask(): boolean {
        const tasks = RiceBundleConfig.PREPARE_TASKS;
        const task = tasks[this._currentTaskIndex];
        
        console.log(`[RiceBundlePrepareSystem] 完成任务: ${task.name}`);
        
        this._completedTasks.add(task.taskId);
        this._currentTaskIndex++;
        this._taskProgress = 1;
        
        // 触发任务完成事件
        if (this._onTaskComplete) {
            this._onTaskComplete(task.taskId);
        }
        
        // 开始下一个任务
        this.startCurrentTask();
        return true;
    }

    /**
     * 更新长按任务
     */
    private updateHoldTask(deltaTime: number) {
        // 长按任务在handleUserInput中处理
    }

    /**
     * 更新连续点击任务
     */
    private updateSequenceTask(deltaTime: number) {
        // 连续点击任务需要用户主动点击
        // 这里可以添加超时逻辑
    }

    /**
     * 处理连续点击
     */
    private handleSequenceClick(): boolean {
        const currentTask = this.getCurrentTask();
        if (!currentTask || currentTask.type !== StepType.SEQUENCE) return false;

        this._sequenceClicks++;
        this._taskProgress = this._sequenceClicks / (currentTask.targetValue || 1);
        
        console.log(`[RiceBundlePrepareSystem] 连续点击: ${this._sequenceClicks}/${currentTask.targetValue}`);
        
        if (this._sequenceClicks >= (currentTask.targetValue || 1)) {
            return this.completeCurrentTask();
        }
        
        return false;
    }

    /**
     * 完成所有任务
     */
    private completeAllTasks() {
        this._isTaskActive = false;
        console.log('[RiceBundlePrepareSystem] 所有准备任务完成!');
        
        if (this._onAllTasksComplete) {
            this._onAllTasksComplete();
        }
    }

    /**
     * 获取当前任务
     */
    private getCurrentTask() {
        const tasks = RiceBundleConfig.PREPARE_TASKS;
        return tasks[this._currentTaskIndex];
    }

    /**
     * 获取准备进度
     */
    public getProgress(): number {
        const tasks = RiceBundleConfig.PREPARE_TASKS;
        const totalTasks = tasks.length;
        return (this._currentTaskIndex + this._taskProgress) / totalTasks;
    }

    /**
     * 获取当前任务信息
     */
    public getCurrentTaskInfo() {
        return this.getCurrentTask();
    }

    /**
     * 是否在进行任务
     */
    public isTaskActive(): boolean {
        return this._isTaskActive;
    }

    /**
     * 获取已完成的任务数量
     */
    public getCompletedTaskCount(): number {
        return this._completedTasks.size;
    }

    /**
     * 获取总任务数量
     */
    public getTotalTaskCount(): number {
        return RiceBundleConfig.PREPARE_TASKS.length;
    }

    /**
     * 设置事件回调
     */
    public setCallbacks(onTaskComplete?: (taskId: string) => void, 
                       onAllTasksComplete?: () => void,
                       onProgressUpdate?: (progress: number, taskName: string) => void) {
        this._onTaskComplete = onTaskComplete;
        this._onAllTasksComplete = onAllTasksComplete;
        this._onProgressUpdate = onProgressUpdate;
    }

    /**
     * 重置准备状态
     */
    public reset() {
        this._currentTaskIndex = 0;
        this._taskProgress = 0;
        this._isTaskActive = false;
        this._sequenceClicks = 0;
        this._holdTime = 0;
        this._completedTasks.clear();
        console.log('[RiceBundlePrepareSystem] 重置完成');
    }

    /**
     * 跳过当前任务（调试用）
     */
    public skipCurrentTask(): boolean {
        if (!this._isTaskActive) return false;
        
        console.log('[RiceBundlePrepareSystem] 跳过当前任务');
        return this.completeCurrentTask();
    }

    /**
     * 销毁
     */
    protected onDestroy() {
        this.reset();
    }
}
