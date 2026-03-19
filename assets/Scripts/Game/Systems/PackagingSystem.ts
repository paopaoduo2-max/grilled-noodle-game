import { _decorator, Node, Label, Sprite, Color, Vec3, tween, UITransform } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 打包盒状态
 */
export enum PackageBoxState {
    EMPTY = 'empty',           // 空的
    HAS_FOOD = 'has_food',     // 有食物
    READY = 'ready'            // 准备好交付
}

/**
 * 打包盒数据
 */
export interface PackageBoxData {
    index: number;             // 盒子索引 0-2
    state: PackageBoxState;    // 状态
    foodData: any | null;      // 食物数据（具体类型由关卡定义）
    node: Node | null;         // 盒子节点
}

/**
 * 📦 打包系统
 * 管理打包盒、食物放置、交付逻辑
 * 可被所有关卡的烹饪控制器使用
 */
@ccclass('PackagingSystem')
export class PackagingSystem {
    
    private static _instance: PackagingSystem | null = null;
    
    // 打包盒配置
    private readonly MAX_BOXES = 3;
    
    // 打包盒数据
    private _boxes: PackageBoxData[] = [];
    
    // 事件回调
    private _onFoodPlaced: ((boxIndex: number, foodData: any) => void) | null = null;
    private _onFoodRemoved: ((boxIndex: number) => void) | null = null;
    private _onFoodDelivered: ((boxIndex: number, foodData: any) => void) | null = null;
    
    public static get instance(): PackagingSystem {
        if (!PackagingSystem._instance) {
            PackagingSystem._instance = new PackagingSystem();
        }
        return PackagingSystem._instance;
    }
    
    constructor() {
        this.initBoxes();
    }
    
    // ==================== 初始化 ====================
    
    /**
     * 初始化打包盒
     */
    private initBoxes(): void {
        this._boxes = [];
        for (let i = 0; i < this.MAX_BOXES; i++) {
            this._boxes.push({
                index: i,
                state: PackageBoxState.EMPTY,
                foodData: null,
                node: null
            });
        }
    }
    
    /**
     * 绑定盒子节点
     */
    public bindBoxNodes(nodes: Node[]): void {
        for (let i = 0; i < Math.min(nodes.length, this.MAX_BOXES); i++) {
            this._boxes[i].node = nodes[i];
        }
        console.log(`[PackagingSystem] 📦 已绑定 ${nodes.length} 个打包盒节点`);
    }
    
    // ==================== Getters ====================
    
    public get boxes(): PackageBoxData[] { return this._boxes; }
    public get maxBoxes(): number { return this.MAX_BOXES; }
    
    /**
     * 获取空闲盒子数量
     */
    public get emptyBoxCount(): number {
        return this._boxes.filter(b => b.state === PackageBoxState.EMPTY).length;
    }
    
    /**
     * 获取有食物的盒子数量
     */
    public get filledBoxCount(): number {
        return this._boxes.filter(b => b.state !== PackageBoxState.EMPTY).length;
    }
    
    /**
     * 是否有空闲盒子
     */
    public get hasEmptyBox(): boolean {
        return this.emptyBoxCount > 0;
    }
    
    // ==================== 事件注册 ====================
    
    public onFoodPlaced(callback: (boxIndex: number, foodData: any) => void): void {
        this._onFoodPlaced = callback;
    }
    
    public onFoodRemoved(callback: (boxIndex: number) => void): void {
        this._onFoodRemoved = callback;
    }
    
    public onFoodDelivered(callback: (boxIndex: number, foodData: any) => void): void {
        this._onFoodDelivered = callback;
    }
    
    // ==================== 打包操作 ====================
    
    /**
     * 获取第一个空闲盒子索引
     */
    public getFirstEmptyBoxIndex(): number {
        for (let i = 0; i < this._boxes.length; i++) {
            if (this._boxes[i].state === PackageBoxState.EMPTY) {
                return i;
            }
        }
        return -1;
    }
    
    /**
     * 放置食物到指定盒子
     */
    public placeFood(boxIndex: number, foodData: any): boolean {
        if (boxIndex < 0 || boxIndex >= this.MAX_BOXES) {
            console.warn(`[PackagingSystem] ⚠️ 无效的盒子索引: ${boxIndex}`);
            return false;
        }
        
        const box = this._boxes[boxIndex];
        
        if (box.state !== PackageBoxState.EMPTY) {
            console.warn(`[PackagingSystem] ⚠️ 盒子 ${boxIndex} 不是空的`);
            return false;
        }
        
        box.state = PackageBoxState.HAS_FOOD;
        box.foodData = foodData;
        
        console.log(`[PackagingSystem] 📦 食物放入盒子 ${boxIndex}`);
        
        if (this._onFoodPlaced) {
            this._onFoodPlaced(boxIndex, foodData);
        }
        
        return true;
    }
    
    /**
     * 放置食物到第一个空闲盒子
     */
    public placeFoodToFirstEmpty(foodData: any): number {
        const index = this.getFirstEmptyBoxIndex();
        if (index === -1) {
            console.warn('[PackagingSystem] ⚠️ 没有空闲的打包盒');
            return -1;
        }
        
        this.placeFood(index, foodData);
        return index;
    }
    
    /**
     * 移除盒子中的食物
     */
    public removeFood(boxIndex: number): any | null {
        if (boxIndex < 0 || boxIndex >= this.MAX_BOXES) {
            return null;
        }
        
        const box = this._boxes[boxIndex];
        
        if (box.state === PackageBoxState.EMPTY) {
            return null;
        }
        
        const foodData = box.foodData;
        box.state = PackageBoxState.EMPTY;
        box.foodData = null;
        
        console.log(`[PackagingSystem] 📦 从盒子 ${boxIndex} 移除食物`);
        
        if (this._onFoodRemoved) {
            this._onFoodRemoved(boxIndex);
        }
        
        return foodData;
    }
    
    /**
     * 交付盒子中的食物
     */
    public deliverFood(boxIndex: number): any | null {
        if (boxIndex < 0 || boxIndex >= this.MAX_BOXES) {
            return null;
        }
        
        const box = this._boxes[boxIndex];
        
        if (box.state === PackageBoxState.EMPTY) {
            console.warn(`[PackagingSystem] ⚠️ 盒子 ${boxIndex} 是空的，无法交付`);
            return null;
        }
        
        const foodData = box.foodData;
        box.state = PackageBoxState.EMPTY;
        box.foodData = null;
        
        console.log(`[PackagingSystem] 🎁 从盒子 ${boxIndex} 交付食物`);
        
        if (this._onFoodDelivered) {
            this._onFoodDelivered(boxIndex, foodData);
        }
        
        return foodData;
    }
    
    // ==================== 查询操作 ====================
    
    /**
     * 获取盒子数据
     */
    public getBox(index: number): PackageBoxData | null {
        if (index < 0 || index >= this.MAX_BOXES) {
            return null;
        }
        return this._boxes[index];
    }
    
    /**
     * 获取盒子状态
     */
    public getBoxState(index: number): PackageBoxState {
        const box = this.getBox(index);
        return box ? box.state : PackageBoxState.EMPTY;
    }
    
    /**
     * 获取盒子中的食物
     */
    public getBoxFood(index: number): any | null {
        const box = this.getBox(index);
        return box ? box.foodData : null;
    }
    
    /**
     * 检查盒子是否为空
     */
    public isBoxEmpty(index: number): boolean {
        return this.getBoxState(index) === PackageBoxState.EMPTY;
    }
    
    // ==================== 批量操作 ====================
    
    /**
     * 清空所有盒子
     */
    public clearAllBoxes(): void {
        for (let i = 0; i < this.MAX_BOXES; i++) {
            if (this._boxes[i].state !== PackageBoxState.EMPTY) {
                this.removeFood(i);
            }
        }
        console.log('[PackagingSystem] 🧹 所有打包盒已清空');
    }
    
    /**
     * 重置系统
     */
    public reset(): void {
        this.initBoxes();
        console.log('[PackagingSystem] 🔄 打包系统已重置');
    }
    
    // ==================== 统计 ====================
    
    /**
     * 获取状态文本
     */
    public getStatusText(): string {
        const filled = this.filledBoxCount;
        const total = this.MAX_BOXES;
        return `📦 ${filled}/${total}`;
    }
}
