import { _decorator, Component, Node, Label, Button, Sprite, Color, UITransform, Graphics, Vec3 } from 'cc';
import { IngredientType } from '../../Data/GameConfig';
import { InventoryManager } from '../../Manager/InventoryManager';
import { TimeManager } from '../../Manager/TimeManager';
import { ReviewSystem, BusinessStateManager, PackagingSystem, CustomerData, CustomerMood, BaseOrder } from '../Systems';

const { ccclass, property } = _decorator;

/**
 * 🍳 烹饪控制器基类
 * 
 * 所有关卡的烹饪场景都继承此类，共享以下功能：
 * - 顾客系统（生成、等待、评价）
 * - 订单系统（队列、超时）
 * - 评价系统（好评、差评、热度）
 * - 手机面板（评价显示）
 * - 库存系统（食材消耗）
 * - 随机事件系统
 * - 金币系统
 * 
 * 子类只需实现：
 * - 食材处理逻辑（不同小吃的制作流程）
 * - 铁板/锅具的视觉表现
 * - 特定的食材按钮绑定
 * 
 * 🆕 已集成共享系统：
 * - ReviewSystem: 评价管理
 * - BusinessStateManager: 营业状态管理
 * - PackagingSystem: 打包盒管理
 */
@ccclass('BaseCookingController')
export abstract class BaseCookingController extends Component {
    
    // ==================== 共享系统 ====================
    protected reviewSystem: ReviewSystem = ReviewSystem.instance;
    protected businessManager: BusinessStateManager = BusinessStateManager.instance;
    protected packagingSystem: PackagingSystem = PackagingSystem.instance;
    
    // ==================== 通用UI绑定 ====================
    @property(Label)
    protected moneyLabel: Label = null!;
    
    @property(Label)
    protected reviewLabel: Label = null!;
    
    @property(Label)
    protected timeLabel: Label = null!;
    
    @property(Node)
    protected phonePanel: Node = null!;
    
    @property(Node)
    protected customerContainer: Node = null!;
    
    @property(Node)
    protected orderQueueContainer: Node = null!;
    
    @property([Node])
    protected packageBoxNodes: Node[] = [];  // 打包盒节点
    
    // ==================== 通用状态 ====================
    protected totalMoney: number = 0;
    protected customers: any[] = [];
    protected orderQueue: any[] = [];
    
    // ==================== 配置 ====================
    protected useInventorySystem: boolean = true;
    
    /**
     * 无限使用的食材类型（不消耗库存）
     * 子类可以覆盖此集合来定义自己的无限食材
     */
    protected infiniteIngredients: Set<IngredientType> = new Set([
        IngredientType.SAUCE,
        IngredientType.CHILI,
        IngredientType.VINEGAR,
        IngredientType.OIL,
        IngredientType.WATER,
        IngredientType.GRILLED_NOODLE_SAUCE,
        IngredientType.SUGAR,
    ]);
    
    // ==================== 营业状态 ====================
    protected isBusinessOpen: boolean = false;
    
    // ==================== 抽象方法（子类必须实现） ====================
    
    /**
     * 获取当前关卡的菜谱配置
     */
    protected abstract getRecipe(): any;
    
    /**
     * 初始化食材按钮和铁板/锅具
     */
    protected abstract initCookingArea(): void;
    
    /**
     * 处理食材点击事件
     * @param ingredientType 食材类型
     */
    protected abstract onIngredientClick(ingredientType: IngredientType): void;
    
    /**
     * 检查当前制作的食物是否完成
     * @returns 完成的食物数据，或null
     */
    protected abstract checkFoodComplete(): any | null;
    
    /**
     * 获取当前食物的品质评分
     * @returns 0-100的品质分数
     */
    protected abstract calculateFoodQuality(): number;
    
    // ==================== 通用方法 ====================
    
    protected onLoad() {
        this.initCommonSystems();
    }
    
    protected start() {
        this.initCookingArea();
        this.startBusiness();
    }
    
    /**
     * 初始化通用系统
     */
    protected initCommonSystems() {
        // 初始化手机面板
        if (this.phonePanel) {
            this.phonePanel.active = false;
        }
        
        // 初始化评价显示
        this.updateMoneyDisplay();
        this.updateReviewDisplay();
    }
    /**
     * 开始营业
     */
    protected startBusiness() {
        this.isBusinessOpen = true;
        console.log(`[BaseCookingController] ?? 开始营业`);
        const timeManager = TimeManager.instance;
        if (timeManager) {
            if (!timeManager.isBusinessOpen()) {
                timeManager.forceRestart();
            } else {
                timeManager.resumeTime();
            }
        }
    }

    /**
     * 结束营业
     */
    protected endBusiness() {
        this.isBusinessOpen = false;
        console.log(`[BaseCookingController] 🏪 结束营业`);
    }
    
    // ==================== 顾客系统 ====================
    
    /**
     * 生成顾客
     */
    protected spawnCustomer() {
        // 子类可以覆盖此方法来自定义顾客生成逻辑
        console.log(`[BaseCookingController] 👤 生成顾客`);
    }
    
    /**
     * 顾客离开
     */
    protected customerLeave(customer: CustomerData, satisfied: boolean) {
        console.log(`[BaseCookingController] 👤 顾客离开, 满意: ${satisfied}`);
    }
    
    // ==================== 订单系统 ====================
    
    /**
     * 添加订单到队列
     */
    protected addOrder(order: any) {
        this.orderQueue.push(order);
        this.updateOrderQueueDisplay();
    }
    
    /**
     * 完成订单
     */
    protected completeOrder(orderId: string) {
        const index = this.orderQueue.findIndex(o => o.id === orderId);
        if (index !== -1) {
            this.orderQueue.splice(index, 1);
            this.updateOrderQueueDisplay();
        }
    }
    
    /**
     * 更新订单队列显示
     */
    protected updateOrderQueueDisplay() {
        // 子类可以覆盖此方法来自定义订单显示
    }
    
    // ==================== 评价系统 ====================
    
    /**
     * 添加评价（使用共享ReviewSystem）
     */
    protected addReview(type: 'super_good' | 'good' | 'bad', content?: string) {
        // 使用共享评价系统
        this.reviewSystem.addReview(type);
        this.updateReviewDisplay();
    }
    
    // ==================== 库存系统 ====================
    
    /**
     * 检查食材是否为无限使用类型
     */
    protected isInfiniteIngredient(type: IngredientType): boolean {
        return this.infiniteIngredients.has(type);
    }
    
    /**
     * 检查是否有足够库存
     */
    protected hasIngredientStock(type: IngredientType): boolean {
        if (!this.useInventorySystem) return true;
        if (this.isInfiniteIngredient(type)) return true;
        
        const inventory = InventoryManager.instance;
        if (!inventory) return true;
        
        return inventory.getAvailableCount(type) > 0;
    }
    
    /**
     * 消耗食材
     */
    protected consumeIngredientFromInventory(type: IngredientType, count: number = 1): boolean {
        if (!this.useInventorySystem) return true;
        if (this.isInfiniteIngredient(type)) return true;
        
        const inventory = InventoryManager.instance;
        if (!inventory) return true;
        
        if (inventory.getAvailableCount(type) < count) {
            this.showMessage(`⚠️ 食材库存不足！`);
            return false;
        }
        
        return inventory.consumeIngredient(type, count);
    }
    
    /**
     * 预留食材（拿起时）
     */
    protected reserveIngredientInInventory(type: IngredientType, count: number = 1): boolean {
        if (!this.useInventorySystem) return true;
        if (this.isInfiniteIngredient(type)) return true;
        
        const inventory = InventoryManager.instance;
        if (!inventory) return true;
        
        return inventory.reserveIngredient(type, count);
    }
    
    /**
     * 释放预留（放回时）
     */
    protected releaseIngredientInInventory(type: IngredientType, count: number = 1): void {
        if (!this.useInventorySystem) return;
        if (this.isInfiniteIngredient(type)) return;
        
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        
        inventory.releaseReservedIngredient(type, count);
    }
    
    // ==================== 金币系统 ====================
    
    /**
     * 增加金币
     */
    protected addMoney(amount: number) {
        this.totalMoney += amount;
        this.updateMoneyDisplay();
    }
    
    /**
     * 扣除金币
     */
    protected deductMoney(amount: number): boolean {
        if (this.totalMoney < amount) {
            this.showMessage(`⚠️ 金币不足！`);
            return false;
        }
        this.totalMoney -= amount;
        this.updateMoneyDisplay();
        return true;
    }
    
    // ==================== UI更新 ====================
    
    protected updateMoneyDisplay() {
        if (this.moneyLabel) {
            this.moneyLabel.string = `💰 今日: ${this.totalMoney}`;
        }
    }
    
    protected updateReviewDisplay() {
        if (this.reviewLabel) {
            this.reviewLabel.string = this.reviewSystem.getStatsText();
        }
    }
    
    /**
     * 显示提示消息
     */
    protected showMessage(message: string) {
        console.log(`[BaseCookingController] 💬 ${message}`);
        // 子类可以覆盖此方法来显示UI提示
    }
    
    // ==================== 手机面板 ====================
    
    protected onPhoneButtonClick() {
        if (!this.phonePanel) return;
        
        this.phonePanel.active = !this.phonePanel.active;
        
        const timeManager = TimeManager.instance;
        if (timeManager) {
            if (this.phonePanel.active) {
                timeManager.pauseTime();
            } else {
                timeManager.resumeTime();
            }
        }
    }
}

