import { Node, Sprite, Color } from 'cc';
import { IngredientType } from '../../Data/GameConfig';

/**
 * 🎮 共享类型定义
 * 所有关卡通用的数据类型
 */

/**
 * 顾客情绪
 */
export enum CustomerMood {
    HAPPY = 'happy',
    NORMAL = 'normal',
    IMPATIENT = 'impatient',
    ANGRY = 'angry'
}

/**
 * 口味类型（烤冷面专用，其他关卡可扩展）
 */
export enum FlavorType {
    SWEET_SPICY = 'sweet_spicy',           // 甜辣
    SOUR_SWEET_SPICY = 'sour_sweet_spicy', // 酸甜辣
    SOUR_SWEET = 'sour_sweet'              // 酸甜
}

/**
 * 食物评价结果
 */
export interface FoodEvaluation {
    isCorrect: boolean;           // 是否完全正确
    score: number;                // 评分 0-100
    rating: 'super_good' | 'good' | 'bad';  // 评级
    message: string;              // 评价消息
    bonusMoney: number;           // 额外奖励
}

/**
 * 基础订单接口（所有关卡共用）
 */
export interface BaseOrder {
    id: number;
    reward: number;               // 基础奖励
    timeLimit: number;            // 时间限制（秒）
    patience: number;             // 当前耐心值
    createdAt: number;            // 创建时间戳
}

/**
 * 烤冷面订单（继承基础订单）
 */
export interface GrilledNoodleOrder extends BaseOrder {
    eggCount: number | null;      // 鸡蛋数量
    sausageCount: number | null;  // 香肠数量
    extraIngredients: IngredientType[];  // 多放的食材
    extraCondiments: IngredientType[];   // 多加的调料
    flavor: FlavorType;           // 口味
    excludes: IngredientType[];   // 不要的食材
}

/**
 * 顾客数据
 */
export interface CustomerData {
    node: Node;
    order: BaseOrder | null;
    orderLabel: Node | null;
    sprite: Sprite | null;
    mood: CustomerMood;
    characterType?: number;       // 顾客外观类型
    waitingTime: number;          // 等待时间
}

/**
 * 评价记录
 */
export interface ReviewRecord {
    type: 'super_good' | 'good' | 'bad';
    content: string;
    timestamp: number;
    customerName?: string;
    score?: number;
}

/**
 * 每日统计
 */
export interface DailyStats {
    totalMoney: number;           // 今日总收入
    customerCount: number;        // 今日顾客数
    superGoodReviews: number;     // 特好评数
    goodReviews: number;          // 好评数
    badReviews: number;           // 差评数
    ordersCompleted: number;      // 完成订单数
    ordersFailed: number;         // 失败订单数
}

/**
 * 店铺状态
 */
export interface ShopState {
    isOpen: boolean;              // 是否营业中
    heat: number;                 // 热度 0-100
    todayStats: DailyStats;       // 今日统计
}

/**
 * 食材配置
 */
export interface IngredientConfig {
    type: IngredientType;
    emoji: string;
    name: string;
    isInfinite?: boolean;         // 是否无限使用
}

/**
 * 定价配置
 */
export interface PricingConfig {
    basePrice: number;            // 基础价格
    extras: Map<IngredientType, number>;  // 额外食材加价
}
