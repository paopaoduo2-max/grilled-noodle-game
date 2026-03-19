/**
 * CookingTypes.ts
 * 烹饪系统类型定义
 * 从 CookingControllerV2.ts 提取的纯类型定义
 */

import { Node, Sprite } from 'cc';
import { IngredientType } from '../../Data/GameConfig';
import { CustomerType } from '../CustomerCharacter';

/**
 * 面饼状态
 */
export enum DoughState {
    NEED_OIL = 'need_oil',    // 需要喷油（第一步）
    RAW = 'raw',              // 生的（已喷油，未加鸡蛋）
    EGG_ADDED = 'egg_added',  // 已加鸡蛋（未翻面）
    FLIPPED = 'flipped',      // 已翻面（可以加其他食材）
    ROLLED = 'rolled',        // 已卷起
    CUT = 'cut',              // 已切块
    BURNT = 'burnt',          // 烤焦了
    DONE = 'done'             // 完成（可打包）
}

/**
 * 口味类型
 */
export enum FlavorType {
    SWEET_SPICY = 'sweet_spicy',           // 甜辣：辣椒 + 白糖 + 烤冷面酱
    SOUR_SWEET_SPICY = 'sour_sweet_spicy', // 酸甜辣：醋 + 白糖 + 辣椒 + 烤冷面酱
    SOUR_SWEET = 'sour_sweet'              // 酸甜：醋 + 白糖 + 烤冷面酱
}

/**
 * 顾客表情状态
 */
export enum CustomerMood {
    WAITING = 'wait',    // 等待状态
    HAPPY = 'happy',     // 满意状态
    ANGRY = 'angry'      // 不满意状态
}

/**
 * 食材数据
 */
export interface IngredientData {
    type: IngredientType;
    emoji: string;
    name: string;
}

/**
 * 顾客订单
 */
export interface CustomerOrder {
    id: number;
    recipeId?: string;           // 菜谱ID（非烤冷面订单使用）
    recipeName?: string;         // 菜谱名称（用于显示）
    eggCount: number | null;       // 鸡蛋数量（1或2），null表示未指定（默认1个）
    sausageCount: number | null;   // 香肠数量（1或2），null表示未指定（默认1根）
    extraIngredients: IngredientType[]; // 多放的食材（洋葱、香菜）- 额外加1份（香肠不在这里）
    extraCondiments: IngredientType[];  // 多加的调料（辣椒、白糖、醋）- 额外加1份
    flavor: FlavorType;            // 口味（甜辣、酸甜辣、酸甜）- 必须
    excludes: IngredientType[];    // 不要的食材（洋葱、香菜）- 香肠是必放的
    reward: number;
    timeLimit: number;
    patience: number;
    createTime?: number;           // 订单创建时间（用于情绪计算）
}

/**
 * 顾客数据结构（扩展支持状态和头像）
 */
export interface CustomerData {
    node: Node;
    order: CustomerOrder | null;
    orderLabel: Node | null;
    sprite: Sprite | null;
    mood: CustomerMood;
    characterType?: CustomerType;  // 顾客类型（对应不同外观）
    waitingTime: number;           // 等待时间（用于超时变生气）
}

/**
 * 评价历史记录
 */
export interface ReviewHistoryItem {
    type: 'super' | 'good' | 'bad';
    text: string;
    score: number;
    timestamp: number;
}

/**
 * 事件消息
 */
export interface EventMessage {
    id: string;
    sender: string;
    senderIcon: string;
    content: string;
    time: string;
    eventId: string;
    isRead: boolean;
}
