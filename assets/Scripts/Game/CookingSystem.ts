import { _decorator, Component } from 'cc';
import { RecipeData, IngredientType } from '../Data/GameConfig';
import { GameManager } from '../Manager/GameManager';
const { ccclass, property } = _decorator;

/**
 * 烹饪状态
 */
export enum CookingState {
    IDLE = 'idle',              // 空闲
    COOKING = 'cooking',        // 烹饪中
    DONE = 'done'               // 完成
}

/**
 * 烹饪任务
 */
export interface CookingTask {
    taskId: string;
    orderId: string;
    recipe: RecipeData;
    state: CookingState;
    progress: number;           // 0-1
    cookTime: number;           // 剩余时间
}

/**
 * 烹饪系统
 * 负责管理制作过程
 */
@ccclass('CookingSystem')
export class CookingSystem extends Component {
    private _activeTasks: CookingTask[] = [];
    private _taskIdCounter: number = 0;
    private _maxCookingSlots: number = 3;  // 最多同时制作3份

    /**
     * 初始化
     */
    public init(maxSlots: number = 3) {
        this._maxCookingSlots = maxSlots;
        this._activeTasks = [];
        console.log('[CookingSystem] 初始化完成');
    }

    /**
     * 更新
     */
    update(deltaTime: number) {
        for (let i = this._activeTasks.length - 1; i >= 0; i--) {
            const task = this._activeTasks[i];
            
            if (task.state === CookingState.COOKING) {
                task.cookTime -= deltaTime;
                task.progress = 1 - (task.cookTime / task.recipe.cookTime);

                // 烹饪完成
                if (task.cookTime <= 0) {
                    task.state = CookingState.DONE;
                    task.progress = 1;
                    console.log(`[CookingSystem] 烹饪完成: ${task.recipe.name}`);
                    
                    // 触发完成事件
                    this.node.emit('cooking-done', task);
                }
            }
        }
    }

    /**
     * 开始烹饪
     */
    public startCooking(orderId: string, recipe: RecipeData): { success: boolean, taskId?: string, message?: string } {
        // 检查是否有空位
        if (this._activeTasks.length >= this._maxCookingSlots) {
            return { success: false, message: '烹饪位已满，请等待当前菜品完成' };
        }

        // 检查食材是否足够
        const gameManager = GameManager.Instance;
        for (const ingredient of recipe.ingredients) {
            if (gameManager.getIngredientCount(ingredient.type) < ingredient.count) {
                const ingredientConfig = require('../Data/GameConfig').GameConfig.INGREDIENTS_CONFIG[ingredient.type];
                return { 
                    success: false, 
                    message: `食材不足: ${ingredientConfig.name}` 
                };
            }
        }

        // 消耗食材
        for (const ingredient of recipe.ingredients) {
            gameManager.useIngredient(ingredient.type, ingredient.count);
        }

        // 创建烹饪任务
        const task: CookingTask = {
            taskId: `task_${this._taskIdCounter++}`,
            orderId: orderId,
            recipe: recipe,
            state: CookingState.COOKING,
            progress: 0,
            cookTime: recipe.cookTime
        };

        this._activeTasks.push(task);
        console.log(`[CookingSystem] 开始烹饪: ${recipe.name}, 预计时间: ${recipe.cookTime}秒`);
        
        // 触发开始事件
        this.node.emit('cooking-started', task);

        return { success: true, taskId: task.taskId };
    }

    /**
     * 完成烹饪任务（取走菜品）
     */
    public finishTask(taskId: string): boolean {
        const taskIndex = this._activeTasks.findIndex(t => t.taskId === taskId);
        if (taskIndex === -1) {
            console.error('[CookingSystem] 任务不存在:', taskId);
            return false;
        }

        const task = this._activeTasks[taskIndex];
        if (task.state !== CookingState.DONE) {
            console.warn('[CookingSystem] 任务尚未完成:', taskId);
            return false;
        }

        // 移除任务
        this._activeTasks.splice(taskIndex, 1);
        console.log(`[CookingSystem] 菜品已取走: ${task.recipe.name}`);
        
        return true;
    }

    /**
     * 获取活跃任务列表
     */
    public getActiveTasks(): CookingTask[] {
        return [...this._activeTasks];
    }

    /**
     * 根据订单ID查找任务
     */
    public getTaskByOrderId(orderId: string): CookingTask | null {
        return this._activeTasks.find(t => t.orderId === orderId) || null;
    }

    /**
     * 清空所有任务
     */
    public clearAllTasks() {
        this._activeTasks = [];
    }
}

