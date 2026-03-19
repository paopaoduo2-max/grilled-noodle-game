import { _decorator, Component, Node } from 'cc';
const { ccclass } = _decorator;
import { RiceBundleCookingSystem } from '../Game/RiceBundleCookingSystem';
import { RiceBundlePrepareSystem } from '../Game/RiceBundlePrepareSystem';
import { RiceBundleUIExtension } from '../UI/RiceBundleUIExtension';
import { RiceBundleConfig } from '../Data/RiceBundleConfig';

/**
 * 东北饭包管理器
 * 统一管理东北饭包关卡的所有组件和流程
 */
@ccclass('RiceBundleManager')
export class RiceBundleManager extends Component {
    private static _instance: RiceBundleManager = null;
    private _cookingSystem: RiceBundleCookingSystem = null;
    private _prepareSystem: RiceBundlePrepareSystem = null;
    private _uiExtension: RiceBundleUIExtension = null;
    private _isInitialized: boolean = false;
    private _currentPhase: 'prepare' | 'cooking' | 'complete' = 'prepare';

    /**
     * 获取单例实例
     */
    public static getInstance(): RiceBundleManager {
        if (!RiceBundleManager._instance) {
            console.warn('[RiceBundleManager] 实例未创建，请先调用init()');
        }
        return RiceBundleManager._instance;
    }

    /**
     * 初始化管理器
     */
    public static init(): RiceBundleManager {
        if (RiceBundleManager._instance) {
            console.log('[RiceBundleManager] 管理器已存在，返回现有实例');
            return RiceBundleManager._instance;
        }

        const managerNode = new Node('RiceBundleManager');
        const manager = managerNode.addComponent(RiceBundleManager);
        RiceBundleManager._instance = manager;
        
        console.log('[RiceBundleManager] 管理器初始化完成');
        return manager;
    }

    /**
     * 启动东北饭包关卡
     */
    public startLevel(): boolean {
        if (this._isInitialized) {
            console.warn('[RiceBundleManager] 关卡已在运行中');
            return false;
        }

        console.log('[RiceBundleManager] 启动东北饭包关卡');
        
        // 初始化各个系统
        this.initCookingSystem();
        this.initPrepareSystem();
        this.initUIExtension();
        
        this._isInitialized = true;
        this._currentPhase = 'prepare';
        
        // 开始准备阶段
        this.startPreparePhase();
        
        return true;
    }

    /**
     * 初始化制作系统
     */
    private initCookingSystem() {
        if (!this._cookingSystem) {
            const cookingNode = new Node('RiceBundleCookingSystem');
            this.node.addChild(cookingNode);
            this._cookingSystem = cookingNode.addComponent(RiceBundleCookingSystem);
            
            // 设置事件回调
            this._cookingSystem.setCallbacks(
                this.onCookingStepComplete.bind(this),
                this.onCookingComplete.bind(this),
                this.onCookingProgressUpdate.bind(this)
            );
            
            console.log('[RiceBundleManager] 制作系统初始化完成');
        }
    }

    /**
     * 初始化准备系统
     */
    private initPrepareSystem() {
        if (!this._prepareSystem) {
            const prepareNode = new Node('RiceBundlePrepareSystem');
            this.node.addChild(prepareNode);
            this._prepareSystem = prepareNode.addComponent(RiceBundlePrepareSystem);
            
            // 设置事件回调
            this._prepareSystem.setCallbacks(
                this.onPrepareTaskComplete.bind(this),
                this.onPrepareAllTasksComplete.bind(this),
                this.onPrepareProgressUpdate.bind(this)
            );
            
            console.log('[RiceBundleManager] 准备系统初始化完成');
        }
    }

    /**
     * 初始化UI扩展
     */
    private initUIExtension() {
        if (!this._uiExtension) {
            const uiNode = new Node('RiceBundleUIExtension');
            this.node.addChild(uiNode);
            this._uiExtension = uiNode.addComponent(RiceBundleUIExtension);
            this._uiExtension.init();
            
            console.log('[RiceBundleManager] UI扩展初始化完成');
        }
    }

    /**
     * 开始准备阶段
     */
    private startPreparePhase() {
        console.log('[RiceBundleManager] 开始准备阶段');
        this._currentPhase = 'prepare';
        
        if (this._prepareSystem) {
            this._prepareSystem.startPrepareTasks();
        }
    }

    /**
     * 开始制作阶段
     */
    private startCookingPhase() {
        console.log('[RiceBundleManager] 开始制作阶段');
        this._currentPhase = 'cooking';
        
        if (this._cookingSystem) {
            const recipe = RiceBundleConfig.RECIPE_DONGBEI_RICE_BUNDLE;
            this._cookingSystem.startCooking(recipe);
        }
    }

    /**
     * 处理用户输入
     */
    public handleUserInput(inputType: string, data?: any): boolean {
        if (!this._isInitialized) {
            console.warn('[RiceBundleManager] 管理器未初始化');
            return false;
        }

        let success = false;

        switch (this._currentPhase) {
            case 'prepare':
                success = this._prepareSystem?.handleUserInput(inputType, data) || false;
                break;
            case 'cooking':
                success = this._cookingSystem?.handleUserInput(inputType, data) || false;
                break;
            default:
                console.warn('[RiceBundleManager] 未知阶段:', this._currentPhase);
        }

        return success;
    }

    /**
     * 更新管理器
     */
    public update(deltaTime: number) {
        if (!this._isInitialized) return;

        switch (this._currentPhase) {
            case 'prepare':
                this._prepareSystem?.update(deltaTime);
                break;
            case 'cooking':
                this._cookingSystem?.update(deltaTime);
                break;
        }
    }

    /**
     * 准备任务完成回调
     */
    private onPrepareTaskComplete(taskId: string) {
        console.log(`[RiceBundleManager] 准备任务完成: ${taskId}`);
        this.node.emit('prepare-task-complete', taskId);
    }

    /**
     * 所有准备任务完成回调
     */
    private onPrepareAllTasksComplete() {
        console.log('[RiceBundleManager] 所有准备任务完成');
        this.node.emit('prepare-all-tasks-complete');
        
        // 延迟1秒后开始制作阶段
        this.delayedCall(() => {
            this.startCookingPhase();
        }, 1.0);
    }

    /**
     * 准备进度更新回调
     */
    private onPrepareProgressUpdate(progress: number, taskName: string) {
        console.log(`[RiceBundleManager] 准备进度: ${progress}, 任务: ${taskName}`);
        this.node.emit('prepare-progress-update', progress, taskName);
    }

    /**
     * 制作步骤完成回调
     */
    private onCookingStepComplete(stepId: number) {
        console.log(`[RiceBundleManager] 制作步骤完成: ${stepId}`);
        this.node.emit('cooking-step-complete', stepId);
    }

    /**
     * 制作完成回调
     */
    private onCookingComplete() {
        console.log('[RiceBundleManager] 制作完成');
        this._currentPhase = 'complete';
        this.node.emit('cooking-complete');
    }

    /**
     * 制作进度更新回调
     */
    private onCookingProgressUpdate(progress: number, stepName: string) {
        console.log(`[RiceBundleManager] 制作进度: ${progress}, 步骤: ${stepName}`);
        this.node.emit('cooking-progress-update', progress, stepName);
    }

    /**
     * 获取当前阶段
     */
    public getCurrentPhase(): string {
        return this._currentPhase;
    }

    /**
     * 获取制作进度
     */
    public getCookingProgress(): number {
        return this._cookingSystem?.getProgress() || 0;
    }

    /**
     * 获取准备进度
     */
    public getPrepareProgress(): number {
        return this._prepareSystem?.getProgress() || 0;
    }

    /**
     * 是否在制作中
     */
    public isCooking(): boolean {
        return this._cookingSystem?.isCooking() || false;
    }

    /**
     * 是否在准备中
     */
    public isPreparing(): boolean {
        return this._prepareSystem?.isTaskActive() || false;
    }

    /**
     * 重置关卡
     */
    public resetLevel() {
        console.log('[RiceBundleManager] 重置关卡');
        
        this._currentPhase = 'prepare';
        this._cookingSystem?.reset();
        this._prepareSystem?.reset();
        this._uiExtension?.reset();
        
        this.startPreparePhase();
    }

    /**
     * 定时执行（简化版）
     */
    private delayedCall(callback: () => void, delay: number) {
        setTimeout(callback, delay * 1000);
    }

    /**
     * 销毁时清理
     */
    protected onDestroy() {
        console.log('[RiceBundleManager] 组件销毁');
        this._cookingSystem = null;
        this._prepareSystem = null;
        this._uiExtension = null;
        this._isInitialized = false;
        this._currentPhase = 'prepare';
        RiceBundleManager._instance = null;
    }
}
