import { _decorator, Component, sys } from 'cc';
import { PREVIEW, EDITOR, DEV } from 'cc/env';
import { IngredientType, MALATANG_VEG_TYPES, MALATANG_MEAT_TYPES } from '../Data/GameConfig';
import { SHOP_ITEMS, RICE_BUNDLE_SHOP_ITEMS, GUO_BAO_ROU_SHOP_ITEMS, MALATANG_SHOP_ITEMS, ShopItemData, getLevelData, LevelTargetData } from '../Data/ShopData';
import { GameConfig } from '../Data/GameConfig';

const { ccclass, property } = _decorator;

/**
 * 库存项数据
*/
export interface InventoryItem {
    ingredientType: IngredientType;
    rawCount: number;        // 原始数量（未加工）
    processedCount: number;  // 已加工数量（可直接使用）
    reservedCount: number;   // ?? 预留数量（拿在手上但未使用）
}

/**
 * 关卡状态
*/
export interface LevelState {
    levelId: number;
    currentMoney: number;
    earnedMoney: number;      // 本关卡赚取的金额
    inventory: Map<IngredientType, InventoryItem>;
    isCompleted: boolean;
    badReviewCount: number;
}

export interface InventoryItemSnapshot {
    type: string;
    rawCount: number;
    processedCount: number;
    reservedCount: number;
}

export interface LevelStateSnapshot {
    levelId: number;
    currentMoney: number;
    earnedMoney: number;
    isCompleted: boolean;
    badReviewCount: number;
    inventory: InventoryItemSnapshot[];
}

export interface InventorySnapshot {
    globalWallet: number;
    unlockedLevel: number;
    totalMoney: number;
    dailyEarnings: number;
    lastPlayDate: string;
    currentLevel?: LevelStateSnapshot | null;
}

/**
 * 库存管理器 - 单例模式
 * 管理玩家的金钱、库存、关卡状态
*/
@ccclass('InventoryManager')
export class InventoryManager extends Component {
    private static _instance: InventoryManager = null;

    // 测试阶段：不限制关卡解锁
    private readonly DEBUG_UNLOCK_ALL_LEVELS: boolean = false;
    
    public static get instance(): InventoryManager {
        return InventoryManager._instance;
    }
    
    // 当前关卡状态
    private _currentLevel: LevelState = null;
    
    // 存储键
    private readonly SAVE_KEY = 'grilled_noodle_save';
    private readonly LEVEL_STATE_KEY = 'grilled_noodle_level_state';
    private readonly WALLET_KEY = 'grilled_noodle_wallet';
    private readonly DAILY_KEY = 'grilled_noodle_daily';  // 每日进度
    private readonly SLOT_PREFIX = 'grilled_noodle_slot_'; // 存档槽位前缀
    
    // 全局进度
    private _unlockedLevel: number = 1;  // 已解锁的最高关卡
    private _totalMoney: number = 0;     // 累计赚取的金钱
    
    // ?? 全局钱包
    private _globalWallet: number = 1000;  // 全局钱包余额，初始1000元
    
    // ?? 每日进度
    private _lastPlayDate: string = '';   // 上次游玩日期
    private _dailyEarnings: number = 0;   // 当日收益
    private _currentSlot: number = 1;     // 当前存档槽位 (1-3)
    
    onLoad() {
        console.log(`[InventoryManager] onLoad 开始，旧实例存在: ${!!InventoryManager._instance}`);

        InventoryManager._instance = this;

        // 加载存档和钱包
        this.loadProgress();
        this.loadWallet();
        this.checkDailyReset();


        // ?? 始终从 localStorage 恢复关卡状态（确保获取最新购买数据）
        console.log('[InventoryManager] 尝试从 localStorage 恢复关卡状态...');
        this.loadLevelState();
        
        // 打印当前库存状态
        if (this._currentLevel) {
            console.log(`[InventoryManager] ? 库存管理器已初始化，当前关卡: ${this._currentLevel.levelId}`);
            this._currentLevel.inventory.forEach((item, type) => {
                if (item.rawCount > 0 || item.processedCount > 0) {
                    console.log(`[InventoryManager] 库存: ${type} raw=${item.rawCount}, processed=${item.processedCount}`);
                }
            });
        } else {
            console.log('[InventoryManager] ?? 库存管理器已初始化，但没有关卡状态');
        }
    }

    start() {
        if (PREVIEW || EDITOR || DEV) {
            this.scheduleOnce(() => {
                this._globalWallet = 1000;
                this.saveWallet();
                console.log('[InventoryManager] 预览模式二次重置钱包: 1000');
            }, 0);
        }
    }
    
    /**
     * 初始化关卡
    */
    public initLevel(levelId: number): boolean {
        console.log(`[InventoryManager] ?? initLevel 被调用: levelId=${levelId}, 当前_unlockedLevel=${this._unlockedLevel}`);

        const levelData = getLevelData(levelId);
        if (!levelData) {
            console.error(`[InventoryManager] ? 关卡 ${levelId} 不存在`);
            return false;
        }

        // 检查是否已解锁
        if (!this.DEBUG_UNLOCK_ALL_LEVELS && levelId > this._unlockedLevel) {
            console.error(`[InventoryManager] ? 关卡 ${levelId} 未解锁`);
            return false;
        }

        // 创建新的关卡状态
        this._currentLevel = {
            levelId: levelId,
            currentMoney: levelData.initialMoney,
            earnedMoney: 0,
            inventory: new Map(),
            isCompleted: false,
            badReviewCount: 0
        };

        console.log(`[InventoryManager] ?? 已创建关卡状态对象，levelId=${this._currentLevel.levelId}`);

        // ?? 从关卡配置获取商品列表
        const levelConfig = GameConfig.LEVELS.find(l => l.levelId === levelId);
        let shopItems = SHOP_ITEMS; // 默认商品列表

        if (levelConfig?.shopItems) {
            // 如果是字符串标记，使用对应的商品列表
            if (typeof levelConfig.shopItems === 'string') {
                if (levelConfig.shopItems === 'RICE_BUNDLE_SHOP_ITEMS') {
                    shopItems = RICE_BUNDLE_SHOP_ITEMS;
                } else if (levelConfig.shopItems === 'GUO_BAO_ROU_SHOP_ITEMS') {
                    shopItems = GUO_BAO_ROU_SHOP_ITEMS;
                } else if (levelConfig.shopItems === 'MALATANG_SHOP_ITEMS') {
                    shopItems = MALATANG_SHOP_ITEMS;
                }
            }
            // 如果是数组，直接使用
            else if (Array.isArray(levelConfig.shopItems)) {
                shopItems = levelConfig.shopItems;
            }
        }

        console.log(`[InventoryManager] 使用商品列表: 共${shopItems.length}个商品`);

        // 初始化空库存（从商品列表）
        for (const item of shopItems) {
            this._currentLevel.inventory.set(item.ingredientType, {
                ingredientType: item.ingredientType,
                rawCount: 0,
                processedCount: 0,
                reservedCount: 0
            });
        }
        
        // ?? 确保调料类型也被初始化（调料包购买时会增加这些库存）
        const condimentTypes = [
            IngredientType.CHILI,
            IngredientType.SUGAR,
            IngredientType.VINEGAR,
            IngredientType.SALT,
            IngredientType.SOY_SAUCE,
            IngredientType.PEPPER_POWDER
        ];
        for (const type of condimentTypes) {
            if (!this._currentLevel.inventory.has(type)) {
                this._currentLevel.inventory.set(type, {
                    ingredientType: type,
                    rawCount: 0,
                    processedCount: 0,
                    reservedCount: 0
                });
            }
        }
        
        // ?? 保存关卡状态到 localStorage（确保场景切换后能恢复）
        this.saveLevelState();
        
        console.log(`[InventoryManager] ? 关卡 ${levelId} 已初始化，初始资金: ${levelData.initialMoney}`);
        return true;
    }

    /**
     * 🧪 预览模式：填充第一关测试库存（避免直进烹饪场景无食材）
     */
    public debugSeedLevel1InventoryIfEmpty(): void {
        if (!(PREVIEW || EDITOR || DEV)) return;
        if (!this._currentLevel || this._currentLevel.levelId !== 1) return;

        let hasAny = false;
        this._currentLevel.inventory.forEach((item) => {
            if (item.rawCount > 0 || item.processedCount > 0) {
                hasAny = true;
            }
        });
        if (hasAny) return;

        const seedItems = [
            { type: IngredientType.DOUGH, processed: 12 },
            { type: IngredientType.EGG, processed: 12 },
            { type: IngredientType.SAUSAGE, processed: 8 },
            { type: IngredientType.ONION, processed: 12 },
            { type: IngredientType.CILANTRO, processed: 12 },
        ];

        for (const seed of seedItems) {
            let item = this._currentLevel.inventory.get(seed.type);
            if (!item) {
                item = {
                    ingredientType: seed.type,
                    rawCount: 0,
                    processedCount: 0,
                    reservedCount: 0
                };
                this._currentLevel.inventory.set(seed.type, item);
            }
            item.processedCount = seed.processed;
            item.reservedCount = 0;
        }

        this.saveLevelState();
        console.log('[InventoryManager] ✅ 预览模式已填充第一关测试库存');
    }

    /**
     * ?? 预览模式：填充第二关测试库存（避免直进烹饪场景无食材）
     */
    public debugSeedRiceBundleInventoryIfEmpty(): void {
        if (!(PREVIEW || EDITOR || DEV)) return;
        if (!this._currentLevel || this._currentLevel.levelId !== 2) return;

        let hasAny = false;
        this._currentLevel.inventory.forEach((item) => {
            if (item.rawCount > 0 || item.processedCount > 0) {
                hasAny = true;
            }
        });
        if (hasAny) return;

        const seedItems = [
            { type: IngredientType.RICE, processed: 6 },
            { type: IngredientType.POTATO, processed: 6 },
            { type: IngredientType.EGG, processed: 6 },
            { type: IngredientType.GREEN_ONION, processed: 6 },
            { type: IngredientType.LETTUCE, processed: 6 },
            { type: IngredientType.CILANTRO, processed: 6 },
        ];

        for (const seed of seedItems) {
            let item = this._currentLevel.inventory.get(seed.type);
            if (!item) {
                item = {
                    ingredientType: seed.type,
                    rawCount: 0,
                    processedCount: 0,
                    reservedCount: 0
                };
                this._currentLevel.inventory.set(seed.type, item);
            }
            item.processedCount = seed.processed;
            item.reservedCount = 0;
        }

        this.saveLevelState();
        console.log('[InventoryManager] ✅ 预览模式已填充第二关测试库存');
    }

    /**
     * 🧪 预览模式：填充第三关测试库存（避免直进烹饪场景无食材）
     */
    public debugSeedGuoBaoRouInventoryIfEmpty(): void {
        if (!(PREVIEW || EDITOR || DEV)) return;
        if (!this._currentLevel || this._currentLevel.levelId !== 3) return;

        const seedItems = [
            { type: IngredientType.PORK, processed: 16 },
            { type: IngredientType.RADISH, processed: 10 },
            { type: IngredientType.GINGER, processed: 10 },
            { type: IngredientType.GREEN_ONION, processed: 10 },
            { type: IngredientType.POTATO_STARCH, processed: 8 },
        ];

        let updated = false;
        for (const seed of seedItems) {
            let item = this._currentLevel.inventory.get(seed.type);
            if (!item) {
                item = {
                    ingredientType: seed.type,
                    rawCount: 0,
                    processedCount: 0,
                    reservedCount: 0
                };
                this._currentLevel.inventory.set(seed.type, item);
                updated = true;
            }
            if (item.processedCount < seed.processed) {
                item.processedCount = seed.processed;
                updated = true;
            }
            if (item.reservedCount !== 0) {
                item.reservedCount = 0;
                updated = true;
            }
        }

        if (updated) {
            this.saveLevelState();
            console.log('[InventoryManager] ? 预览模式已补充第三关测试库存');
        }
    }

    /**
     * ?? 预览模式：填充第四关测试库存（麻辣烫）
     */
    public debugSeedMalaTangInventoryIfEmpty(): void {
        if (!(PREVIEW || EDITOR || DEV)) return;
        if (!this._currentLevel || this._currentLevel.levelId !== 4) return;

        const seedItems = [
            ...MALATANG_VEG_TYPES.map(type => ({ type, processed: 1200 })),
            ...MALATANG_MEAT_TYPES.map(type => ({ type, processed: 900 }))
        ];

        let updated = false;
        for (const seed of seedItems) {
            let item = this._currentLevel.inventory.get(seed.type);
            if (!item) {
                item = {
                    ingredientType: seed.type,
                    rawCount: 0,
                    processedCount: 0,
                    reservedCount: 0
                };
                this._currentLevel.inventory.set(seed.type, item);
                updated = true;
            }
            if (item.processedCount < seed.processed) {
                item.processedCount = seed.processed;
                updated = true;
            }
            if (item.reservedCount !== 0) {
                item.reservedCount = 0;
                updated = true;
            }
        }

        if (updated) {
            this.saveLevelState();
            console.log('[InventoryManager] ? 预览模式已补充第四关测试库存');
        }
    }
    
    /**
     * 获取当前关卡状态
    */
    public get currentLevel(): LevelState | null {
        return this._currentLevel;
    }
    
    /**
     * 获取当前金钱（使用全局钱包）
    */
    public get currentMoney(): number {
        return this._globalWallet;
    }
    
    /**
     * ?? 获取全局钱包余额
    */
    public get globalWallet(): number {
        return this._globalWallet;
    }
    
    /**
     * 获取当前关卡数据
    */
    public get currentLevelData(): LevelTargetData | null {
        if (!this._currentLevel) return null;
        return getLevelData(this._currentLevel.levelId);
    }
    
    /**
     * 购买商品
    */
    public buyItem(shopItem: ShopItemData, count: number = 1): boolean {
        if (!this._currentLevel) {
            console.error('[InventoryManager] ? 未初始化关卡');
            return false;
        }
        
        const totalCost = shopItem.price * count;
        
        // 检查全局钱包是否足够
        if (this._globalWallet < totalCost) {
            console.warn(`[InventoryManager] ?? 钱包余额不足！需要 ${totalCost}，当前 ${this._globalWallet}`);
            return false;
        }
        
        // 从全局钱包扣除金钱
        this._globalWallet -= totalCost;
        this.saveWallet();
        
        // ?? 调料包特殊处理：同时增加辣椒粉、白糖、醋
        if (shopItem.ingredientType === IngredientType.SEASONING_PACK) {
            const addAmount = shopItem.quantity * count;
            
            // 增加辣椒粉库存
            const chiliInventory = this._currentLevel.inventory.get(IngredientType.CHILI);
            if (chiliInventory) {
                chiliInventory.processedCount += addAmount;
            }
            
            // 增加白糖库存
            const sugarInventory = this._currentLevel.inventory.get(IngredientType.SUGAR);
            if (sugarInventory) {
                sugarInventory.processedCount += addAmount;
            }
            
            // 增加醋库存
            const vinegarInventory = this._currentLevel.inventory.get(IngredientType.VINEGAR);
            if (vinegarInventory) {
                vinegarInventory.processedCount += addAmount;
            }
            
            console.log(`[InventoryManager] ? 购买调料包 x${count}份，辣椒粉/白糖/醋各增加${addAmount}份`);
            console.log(`[InventoryManager] ?? 花费 ${totalCost}元，剩余金钱 ${this._currentLevel.currentMoney}`);
            // ?? 保存库存状态
            this.saveLevelState();
            return true;
        }
        
        // 普通商品处理
        const inventory = this._currentLevel.inventory.get(shopItem.ingredientType);
        if (inventory) {
            const addAmount = shopItem.quantity * count;
            if (shopItem.needsProcessing) {
                // 需要加工的食材，加到原始数量
                inventory.rawCount += addAmount;
                console.log(`[InventoryManager] ? 购买 ${shopItem.name} x${count}份(${addAmount}个)，需加工，rawCount=${inventory.rawCount}`);
            } else {
                // 不需要加工的食材，直接加到已加工数量
                inventory.processedCount += addAmount;
                console.log(`[InventoryManager] ? 购买 ${shopItem.name} x${count}份(${addAmount}个)，无需加工，processedCount=${inventory.processedCount}`);
            }
        }
        
        // ?? 保存库存状态（确保场景切换后数据不丢失）
        this.saveLevelState();
        
        console.log(`[InventoryManager] ?? 花费 ${totalCost}元，剩余金钱 ${this._currentLevel.currentMoney}`);
        return true;
    }
    
    /**
     * 加工食材（将原始食材转换为已加工食材）
     * @param type 食材类型
     * @param count 加工数量（原料数量，默认1）
     * @returns 加工是否成功
    */
    public processIngredient(type: IngredientType, count: number = 1): boolean {
        if (!this._currentLevel) return false;
        
        const inventory = this._currentLevel.inventory.get(type);
        if (!inventory) return false;
        
        if (inventory.rawCount < count) {
            console.warn(`[InventoryManager] ?? 原始食材不足！需要 ${count}，当前 ${inventory.rawCount}`);
            return false;
        }
        
        // ?? 查找加工产出倍数
        const shopItem = SHOP_ITEMS.find(item => item.ingredientType === type);
        const yieldMultiplier = shopItem?.processingYield || 1;
        
        // 转换：1个原料 → yieldMultiplier份成品
        inventory.rawCount -= count;
        inventory.processedCount += count * yieldMultiplier;
        
        // ?? 保存状态到 localStorage（确保场景切换后能恢复）
        this.saveLevelState();
        
        console.log(`[InventoryManager] ? 加工 ${type} x${count} → 产出 ${count * yieldMultiplier}份，剩余原始: ${inventory.rawCount}，已加工: ${inventory.processedCount}`);
        return true;
    }
    
    /**
     * ?? 获取食材的加工产出倍数
    */
    public getProcessingYield(type: IngredientType): number {
        const shopItem = SHOP_ITEMS.find(item => item.ingredientType === type);
        return shopItem?.processingYield || 1;
    }
    
    /**
     * 消耗食材（游戏中使用）
    */
    public consumeIngredient(type: IngredientType, count: number = 1): boolean {
        if (!this._currentLevel) return false;
        
        const inventory = this._currentLevel.inventory.get(type);
        if (!inventory) return false;
        
        if (inventory.processedCount < count) {
            console.warn(`[InventoryManager] ?? 已加工食材不足！需要 ${count}，当前 ${inventory.processedCount}`);
            return false;
        }
        
        inventory.processedCount -= count;
        
        // ?? 保存状态到 localStorage
        this.saveLevelState();
        
        console.log(`[InventoryManager] 消耗 ${type} x${count}，剩余: ${inventory.processedCount}`);
        return true;
    }

    /**
     * ?? 调整已加工食材数量（允许正负）
     */
    public adjustProcessedIngredient(type: IngredientType, delta: number): boolean {
        if (!this._currentLevel) return false;
        if (delta === 0) return true;

        let inventory = this._currentLevel.inventory.get(type);
        if (!inventory) {
            if (delta < 0) return false;
            inventory = {
                ingredientType: type,
                rawCount: 0,
                processedCount: 0,
                reservedCount: 0
            };
            this._currentLevel.inventory.set(type, inventory);
        }

        const nextCount = inventory.processedCount + delta;
        if (nextCount < 0) {
            console.warn(`[InventoryManager] ?? 调整失败：${type} 数量不足`);
            return false;
        }
        if (nextCount < inventory.reservedCount) {
            console.warn(`[InventoryManager] ?? 调整失败：${type} 低于预留数量`);
            return false;
        }

        inventory.processedCount = nextCount;
        if (inventory.reservedCount > inventory.processedCount) {
            inventory.reservedCount = inventory.processedCount;
        }

        this.saveLevelState();
        console.log(`[InventoryManager] ?? 调整 ${type} ${delta > 0 ? '+' : ''}${delta}，剩余: ${inventory.processedCount}`);
        return true;
    }
    
    /**
     * 获取食材数量
    */
    public getIngredientCount(type: IngredientType): { raw: number, processed: number } {
        if (!this._currentLevel) return { raw: 0, processed: 0 };
        
        const inventory = this._currentLevel.inventory.get(type);
        if (!inventory) return { raw: 0, processed: 0 };
        
        return {
            raw: inventory.rawCount,
            processed: inventory.processedCount
        };
    }
    
    /**
     * 获取可用食材数量（已加工的 - 预留的）
    */
    public getAvailableCount(type: IngredientType): number {
        if (!this._currentLevel) return 0;
        const inventory = this._currentLevel.inventory.get(type);
        if (!inventory) return 0;
        // ?? 可用数量 = 已加工 - 预留
        return Math.max(0, inventory.processedCount - inventory.reservedCount);
    }
    
    /**
     * ?? 预留食材（拿起时调用，不实际消耗）
     * @returns 是否成功预留
    */
    public reserveIngredient(type: IngredientType, count: number = 1): boolean {
        if (!this._currentLevel) return false;
        
        const inventory = this._currentLevel.inventory.get(type);
        if (!inventory) return false;
        
        const available = inventory.processedCount - inventory.reservedCount;
        if (available < count) {
            console.warn(`[InventoryManager] ?? 可用食材不足！需要 ${count}，可用 ${available}`);
            return false;
        }
        
        inventory.reservedCount += count;
        console.log(`[InventoryManager] ?? 预留 ${type} x${count}，预留总数: ${inventory.reservedCount}，剩余可用: ${inventory.processedCount - inventory.reservedCount}`);
        return true;
    }
    
    /**
     * ?? 确认消耗预留的食材（实际使用时调用）
     * @returns 是否成功消耗
    */
    public confirmReservedIngredient(type: IngredientType, count: number = 1): boolean {
        if (!this._currentLevel) return false;
        
        const inventory = this._currentLevel.inventory.get(type);
        if (!inventory) return false;
        
        if (inventory.reservedCount < count) {
            console.warn(`[InventoryManager] ?? 预留数量不足！需要 ${count}，预留 ${inventory.reservedCount}`);
            return false;
        }
        
        // 从预留和已加工中同时扣除
        inventory.reservedCount -= count;
        inventory.processedCount -= count;
        
        this.saveLevelState();
        console.log(`[InventoryManager] ? 确认消耗 ${type} x${count}，剩余: ${inventory.processedCount}`);
        return true;
    }
    
    /**
     * ?? 释放预留的食材（放下不用时调用）
     * @returns 是否成功释放
    */
    public releaseReservedIngredient(type: IngredientType, count: number = 1): boolean {
        if (!this._currentLevel) return false;
        
        const inventory = this._currentLevel.inventory.get(type);
        if (!inventory) return false;
        
        if (inventory.reservedCount < count) {
            // 释放的数量不能超过预留的
            count = inventory.reservedCount;
        }
        
        inventory.reservedCount -= count;
        console.log(`[InventoryManager] ?? 释放预留 ${type} x${count}，预留剩余: ${inventory.reservedCount}`);
        return true;
    }
    
    /**
     * ?? 清除所有预留（场景切换或异常时调用）
    */
    public clearAllReservations() {
        if (!this._currentLevel) return;
        
        this._currentLevel.inventory.forEach((item, type) => {
            if (item.reservedCount > 0) {
                console.log(`[InventoryManager] ?? 清除预留 ${type}: ${item.reservedCount}`);
                item.reservedCount = 0;
            }
        });
    }
    
    /**
     * 添加金钱到全局钱包（卖出食物获得）
    */
    public addMoney(amount: number) {
        this._globalWallet += amount;
        this._dailyEarnings += amount;  // 记录每日收益
        this.saveWallet();
        this.saveDailyProgress();
        
        // 同时记录本关卡赚取的金额
        if (this._currentLevel) {
            this._currentLevel.earnedMoney += amount;
        }
        
        // 检查是否解锁新关卡
        this.checkUnlockLevels();
        
        console.log(`[InventoryManager] ?? 获得 ${amount} 元，钱包余额: ${this._globalWallet}`);
    }

    /**
     * ?? 扣除全局钱包余额（用于功能消耗）
     */
    public spendMoney(amount: number): boolean {
        if (amount <= 0) return true;
        if (this._globalWallet < amount) {
            console.warn(`[InventoryManager] ?? 钱包余额不足！需要 ${amount}，当前 ${this._globalWallet}`);
            return false;
        }
        this._globalWallet -= amount;
        this.saveWallet();
        console.log(`[InventoryManager] ?? 扣除 ${amount} 元，钱包余额: ${this._globalWallet}`);
        return true;
    }

    /**
     * ?? 支付经营成本（允许余额不足时扣到0）
     */
    public applyExpense(amount: number, reason: string = 'daily_cost'): number {
        if (amount <= 0) return 0;
        const actual = Math.min(amount, this._globalWallet);
        this._globalWallet -= actual;
        this.saveWallet();
        console.log(`[InventoryManager] ?? 成本支出(${reason}): -${actual} 元，钱包余额: ${this._globalWallet}`);
        return actual;
    }
    
    /**
     * ?? 设置钱包金额（用于加载存档）
    */
    public setWallet(amount: number) {
        this._globalWallet = amount;
        this.saveWallet();
        console.log(`[InventoryManager] ?? 钱包已设置为: ${this._globalWallet}`);
    }
    
    /**
     * ?? 保存全局钱包
    */
    private saveWallet() {
        sys.localStorage.setItem(this.WALLET_KEY, this._globalWallet.toString());
        console.log(`[InventoryManager] ?? 钱包已保存: ${this._globalWallet}`);
    }
    
    /**
     * ?? 加载全局钱包
    */
    private loadWallet() {
        if (PREVIEW || EDITOR || DEV) {
            this._globalWallet = 1000;
            this.saveWallet();
            console.log('[InventoryManager] 预览模式重置钱包: 1000');
            return;
        }
        const walletStr = sys.localStorage.getItem(this.WALLET_KEY);
        if (walletStr) {
            this._globalWallet = parseInt(walletStr) || 1000;
        } else {
            this._globalWallet = 1000;  // 初始1000元
        }
        console.log(`[InventoryManager] ?? 钱包已加载: ${this._globalWallet}`);
    }
    
    /**
     * ?? 检查并解锁关卡（根据钱包余额）
    */
    private checkUnlockLevels() {
        if (GameConfig.DEMO_ONLY_LEVEL1) return;
        for (const level of GameConfig.LEVELS) {
            const threshold = level.unlockThreshold ?? 0;
            if (this._globalWallet >= threshold && level.levelId > this._unlockedLevel) {
                // 解锁关卡（只解锁下一关，不跳关）
                if (level.levelId === this._unlockedLevel + 1) {
                    this._unlockedLevel = level.levelId;
                    this.saveProgress();
                    console.log(`[InventoryManager] ?? 解锁关卡 ${level.levelId}: ${level.levelName}`);
                }
            }
        }
    }
    
    /**
     * ?? 检查关卡是否已解锁
    */
    public isLevelUnlocked(levelId: number): boolean {
        if (this.DEBUG_UNLOCK_ALL_LEVELS) return true;
        if (GameConfig.DEMO_ONLY_LEVEL1 && levelId > GameConfig.DEMO_LEVEL_CAP) return false;
        const level = GameConfig.LEVELS.find(l => l.levelId === levelId);
        if (!level) return false;
        
        const threshold = level.unlockThreshold ?? 0;
        return this._globalWallet >= threshold || levelId <= this._unlockedLevel;
    }
    
    /**
     * 添加差评
    */
    public addBadReview() {
        if (!this._currentLevel) return;
        
        this._currentLevel.badReviewCount++;
        console.log(`[InventoryManager] ?? 差评 +1，当前差评数: ${this._currentLevel.badReviewCount}`);
    }
    
    /**
     * 检查关卡是否完成
    */
    public checkLevelComplete(): { success: boolean, reason: string } {
        if (!this._currentLevel) {
            return { success: false, reason: '未初始化关卡' };
        }
        
        const levelData = getLevelData(this._currentLevel.levelId);
        if (!levelData) {
            return { success: false, reason: '关卡数据不存在' };
        }
        
        // 检查差评数
        if (this._currentLevel.badReviewCount > levelData.maxBadReviews) {
            return { success: false, reason: `差评过多（${this._currentLevel.badReviewCount}/${levelData.maxBadReviews}）` };
        }
        
        // 检查目标金额
        if (this._currentLevel.earnedMoney < levelData.targetMoney) {
            return { 
                success: false, 
                reason: `未达到目标金额（${this._currentLevel.earnedMoney}/${levelData.targetMoney}）` 
            };
        }
        
        return { success: true, reason: '恭喜通关！' };
    }
    
    /**
     * 完成关卡
    */
    public completeLevel(): boolean {
        const result = this.checkLevelComplete();
        
        if (result.success) {
            this._currentLevel.isCompleted = true;
            
            // 解锁下一关（Demo 不解锁）
            if (!GameConfig.DEMO_ONLY_LEVEL1) {
                if (this._currentLevel.levelId >= this._unlockedLevel) {
                    this._unlockedLevel = this._currentLevel.levelId + 1;
                }
            }
            
            // 累计金钱
            this._totalMoney += this._currentLevel.earnedMoney;
            
            // 保存进度
            this.saveProgress();
            
            console.log(`[InventoryManager] ?? 关卡 ${this._currentLevel.levelId} 完成！`);
            return true;
        }
        
        console.log(`[InventoryManager] ? 关卡未完成: ${result.reason}`);
        return false;
    }
    
    /**
     * 重置当前关卡
    */
    public resetLevel() {
        if (!this._currentLevel) return;
        
        const levelId = this._currentLevel.levelId;
        this.initLevel(levelId);
        
        console.log(`[InventoryManager] ?? 关卡 ${levelId} 已重置`);
    }
    
    /**
     * 保存进度
    */
    private saveProgress() {
        const saveData = {
            unlockedLevel: this._unlockedLevel,
            totalMoney: this._totalMoney
        };
        
        sys.localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
        console.log('[InventoryManager] ?? 进度已保存');
    }
    
    /**
     * 加载进度
    */
    private loadProgress() {
        const saveStr = sys.localStorage.getItem(this.SAVE_KEY);
        if (saveStr) {
            try {
                const saveData = JSON.parse(saveStr);
                this._unlockedLevel = saveData.unlockedLevel || 1;
                this._totalMoney = saveData.totalMoney || 0;
                console.log(`[InventoryManager] ?? 进度已加载，已解锁关卡: ${this._unlockedLevel}`);
            } catch (e) {
                console.error('[InventoryManager] ? 加载进度失败', e);
            }
        }
    }
    
    /**
     * 保存关卡状态（用于场景切换）
    */
    public saveLevelState() {
        if (!this._currentLevel) {
            console.warn('[InventoryManager] ?? 无法保存：当前关卡为空');
            return;
        }
        
        // 将 Map 转换为数组以便序列化
        const inventoryArray: any[] = [];
        this._currentLevel.inventory.forEach((item, type) => {
            inventoryArray.push({
                type: type,
                rawCount: item.rawCount,
                processedCount: item.processedCount
            });
            if (item.rawCount > 0 || item.processedCount > 0) {
                console.log(`[InventoryManager] 保存库存: ${type} raw=${item.rawCount}, processed=${item.processedCount}`);
            }
        });
        
        const stateData = {
            levelId: this._currentLevel.levelId,
            currentMoney: this._currentLevel.currentMoney,
            earnedMoney: this._currentLevel.earnedMoney,
            inventory: inventoryArray,
            isCompleted: this._currentLevel.isCompleted,
            badReviewCount: this._currentLevel.badReviewCount
        };
        
        const jsonStr = JSON.stringify(stateData);
        sys.localStorage.setItem(this.LEVEL_STATE_KEY, jsonStr);
        console.log(`[InventoryManager] ?? 关卡状态已保存，key=${this.LEVEL_STATE_KEY}, 长度=${jsonStr.length}`);
        
        // 验证保存是否成功
        const verify = sys.localStorage.getItem(this.LEVEL_STATE_KEY);
        console.log(`[InventoryManager] 验证保存: ${verify ? '成功' : '失败'}`);
        if (verify) {
            console.log(`[InventoryManager] 保存内容前100字符: ${verify.substring(0, 100)}...`);
        }
    }
    
    /**
     * 加载关卡状态（用于场景切换）
    */
    private loadLevelState() {
        console.log(`[InventoryManager] loadLevelState 调用，key=${this.LEVEL_STATE_KEY}`);
        
        const stateStr = sys.localStorage.getItem(this.LEVEL_STATE_KEY);
        console.log(`[InventoryManager] localStorage 数据: ${stateStr ? stateStr.substring(0, 100) + '...' : 'null'}`);
        
        if (!stateStr) {
            console.log('[InventoryManager] ?? 没有保存的关卡状态');
            return;
        }
        
        try {
            const stateData = JSON.parse(stateStr);
            console.log(`[InventoryManager] 解析成功，关卡ID: ${stateData.levelId}, 库存项数: ${stateData.inventory?.length}`);
            
            // 恢复关卡状态
            this._currentLevel = {
                levelId: stateData.levelId,
                currentMoney: stateData.currentMoney,
                earnedMoney: stateData.earnedMoney,
                inventory: new Map(),
                isCompleted: stateData.isCompleted,
                badReviewCount: stateData.badReviewCount
            };
            
            // 恢复库存
            for (const item of stateData.inventory) {
                this._currentLevel.inventory.set(item.type, {
                    ingredientType: item.type,
                    rawCount: item.rawCount,
                    processedCount: item.processedCount,
                    reservedCount: item.reservedCount || 0  // ?? 兼容旧存档
                });
                if (item.rawCount > 0 || item.processedCount > 0) {
                    console.log(`[InventoryManager] 恢复库存: ${item.type} raw=${item.rawCount}, processed=${item.processedCount}`);
                }
            }
            
            console.log(`[InventoryManager] ?? 关卡状态已恢复，关卡: ${stateData.levelId}`);
        } catch (e) {
            console.error('[InventoryManager] ? 加载关卡状态失败', e);
        }
    }
    
    /**
     * 清除关卡状态（关卡结束时调用）
    */
    public clearLevelState() {
        sys.localStorage.removeItem(this.LEVEL_STATE_KEY);
        console.log('[InventoryManager] ??? 关卡状态已清除');
    }
    
    /**
     * 获取已解锁的最高关卡
    */
    public get unlockedLevel(): number {
        return this._unlockedLevel;
    }
    
    /**
     * 获取累计金钱
    */
    public get totalMoney(): number {
        return this._totalMoney;
    }
    
    /**
     * 检查食材是否有库存
    */
    public hasIngredient(type: IngredientType): boolean {
        return this.getAvailableCount(type) > 0;
    }
    
    /**
     * 获取所有库存信息（用于UI显示）
    */
    public getAllInventory(): Map<IngredientType, InventoryItem> | null {
        return this._currentLevel?.inventory ?? null;
    }
    
    // ==================== ?? 每日进度系统 ====================
    
    /**
     * 获取今日日期字符串
    */
    private getTodayString(): string {
        const now = new Date();
        const month = (now.getMonth() + 1).toString();
        const day = now.getDate().toString();
        return `${now.getFullYear()}-${month.length < 2 ? '0' + month : month}-${day.length < 2 ? '0' + day : day}`;
    }
    
    /**
     * 检查并执行每日重置
    */
    private checkDailyReset() {
        const today = this.getTodayString();
        const dailyStr = sys.localStorage.getItem(this.DAILY_KEY);
        
        if (dailyStr) {
            try {
                const dailyData = JSON.parse(dailyStr);
                this._lastPlayDate = dailyData.lastPlayDate || '';
                this._dailyEarnings = dailyData.dailyEarnings || 0;
                
                // 如果是新的一天，重置每日收益
                if (this._lastPlayDate !== today) {
                    console.log(`[InventoryManager] ?? 新的一天！上次: ${this._lastPlayDate}, 今天: ${today}`);
                    this._dailyEarnings = 0;
                    this._lastPlayDate = today;
                    this.saveDailyProgress();
                }
            } catch (e) {
                this._lastPlayDate = today;
                this._dailyEarnings = 0;
            }
        } else {
            this._lastPlayDate = today;
            this._dailyEarnings = 0;
            this.saveDailyProgress();
        }
        
        console.log(`[InventoryManager] ?? 当日收益: ${this._dailyEarnings}`);
    }
    
    /**
     * 保存每日进度
    */
    private saveDailyProgress() {
        const dailyData = {
            lastPlayDate: this._lastPlayDate,
            dailyEarnings: this._dailyEarnings
        };
        sys.localStorage.setItem(this.DAILY_KEY, JSON.stringify(dailyData));
    }
    
    /**
     * 添加每日收益（卖出食物时调用）
    */
    public addDailyEarnings(amount: number) {
        this._dailyEarnings += amount;
        this.saveDailyProgress();
    }
    
    /**
     * 获取当日收益
    */
    public get dailyEarnings(): number {
        return this._dailyEarnings;
    }
    
    /**
     * 获取上次游玩日期
    */
    public get lastPlayDate(): string {
        return this._lastPlayDate;
    }
    
    // ==================== ?? 多存档槽位系统 ====================
    
    /**
     * 获取当前存档槽位
    */
    public get currentSlot(): number {
        return this._currentSlot;
    }
    
    /**
     * 切换存档槽位
    */
    public switchSlot(slotId: number): boolean {
        if (slotId < 1 || slotId > 3) {
            console.error(`[InventoryManager] ? 无效的存档槽位: ${slotId}`);
            return false;
        }
        
        // 保存当前槽位
        this.saveToSlot(this._currentSlot);
        
        // 切换槽位
        this._currentSlot = slotId;
        
        // 加载新槽位
        this.loadFromSlot(slotId);
        
        console.log(`[InventoryManager] ?? 已切换到存档槽位 ${slotId}`);
        return true;
    }
    
    /**
     * 保存到指定槽位
    */
    public saveToSlot(slotId: number) {
        const slotData = {
            unlockedLevel: this._unlockedLevel,
            totalMoney: this._totalMoney,
            globalWallet: this._globalWallet,
            dailyEarnings: this._dailyEarnings,
            lastPlayDate: this._lastPlayDate,
            savedAt: new Date().toISOString()
        };
        
        const key = `${this.SLOT_PREFIX}${slotId}`;
        sys.localStorage.setItem(key, JSON.stringify(slotData));
        console.log(`[InventoryManager] ?? 已保存到槽位 ${slotId}`);
    }
    
    /**
     * 从指定槽位加载
    */
    public loadFromSlot(slotId: number): boolean {
        const key = `${this.SLOT_PREFIX}${slotId}`;
        const slotStr = sys.localStorage.getItem(key);
        
        if (!slotStr) {
            console.log(`[InventoryManager] ?? 槽位 ${slotId} 为空，使用默认值`);
            this.resetToDefault();
            return false;
        }
        
        try {
            const slotData = JSON.parse(slotStr);
            this._unlockedLevel = slotData.unlockedLevel || 1;
            this._totalMoney = slotData.totalMoney || 0;
            this._globalWallet = slotData.globalWallet || 1000;
            this._dailyEarnings = slotData.dailyEarnings || 0;
            this._lastPlayDate = slotData.lastPlayDate || '';
            
            console.log(`[InventoryManager] ?? 已从槽位 ${slotId} 加载存档`);
            return true;
        } catch (e) {
            console.error(`[InventoryManager] ? 加载槽位 ${slotId} 失败`, e);
            return false;
        }
    }
    
    /**
     * 获取槽位信息（用于UI显示）
    */
    public getSlotInfo(slotId: number): { exists: boolean, savedAt?: string, wallet?: number, level?: number } {
        const key = `${this.SLOT_PREFIX}${slotId}`;
        const slotStr = sys.localStorage.getItem(key);
        
        if (!slotStr) {
            return { exists: false };
        }
        
        try {
            const slotData = JSON.parse(slotStr);
            return {
                exists: true,
                savedAt: slotData.savedAt,
                wallet: slotData.globalWallet,
                level: slotData.unlockedLevel
            };
        } catch (e) {
            return { exists: false };
        }
    }
    
    /**
     * 删除指定槽位存档
    */
    public deleteSlot(slotId: number) {
        const key = `${this.SLOT_PREFIX}${slotId}`;
        sys.localStorage.removeItem(key);
        console.log(`[InventoryManager] ??? 已删除槽位 ${slotId} 的存档`);
    }
    
    // ==================== ?? 存档管理 ====================
    
    /**
     * 重置为默认值
    */
    public resetToDefault() {
        // 默认仅解锁第一关
        this._unlockedLevel = 1;
        this._totalMoney = 0;
        this._globalWallet = 1000;
        this._dailyEarnings = 0;
        this._lastPlayDate = this.getTodayString();
        this._currentLevel = null;

        // ?? 保存到 localStorage，确保场景切换后能读取到
        this.saveWallet();
        this.saveProgress();
        this.saveDailyProgress();

        console.log('[InventoryManager] ?? 已重置为默认值，钱包: 1000，关卡解锁: 1');
    }
    
    /**
     * 清除所有存档（完全重置）
    */
    public clearAllSaves() {
        // 清除主存档
        sys.localStorage.removeItem(this.SAVE_KEY);
        sys.localStorage.removeItem(this.LEVEL_STATE_KEY);
        sys.localStorage.removeItem(this.WALLET_KEY);
        sys.localStorage.removeItem(this.DAILY_KEY);
        
        // 清除所有槽位
        for (let i = 1; i <= 3; i++) {
            sys.localStorage.removeItem(`${this.SLOT_PREFIX}${i}`);
        }
        
        // 重置为默认值
        this.resetToDefault();
        
        // 保存默认状态
        this.saveProgress();
        this.saveWallet();
        this.saveDailyProgress();
        
        console.log('[InventoryManager] ??? 所有存档已清除');
    }
    
    /**
     * 重置当前存档（保留其他槽位）
    */
    public resetCurrentSave() {
        this.resetToDefault();
        this.saveProgress();
        this.saveWallet();
        this.saveDailyProgress();
        this.clearLevelState();
        
        console.log('[InventoryManager] ?? 当前存档已重置');
    }
    
    /**
     * 获取存档统计信息
    */
    public getSaveStats(): {
        currentSlot: number,
        globalWallet: number,
        unlockedLevel: number,
        totalMoney: number,
        dailyEarnings: number,
        lastPlayDate: string
    } {
        return {
            currentSlot: this._currentSlot,
            globalWallet: this._globalWallet,
            unlockedLevel: this._unlockedLevel,
            totalMoney: this._totalMoney,
            dailyEarnings: this._dailyEarnings,
            lastPlayDate: this._lastPlayDate
        };
    }

    /**
     * 导出完整快照（用于存档）
     */
    public buildSnapshot(): InventorySnapshot {
        return {
            globalWallet: this._globalWallet,
            unlockedLevel: this._unlockedLevel,
            totalMoney: this._totalMoney,
            dailyEarnings: this._dailyEarnings,
            lastPlayDate: this._lastPlayDate,
            currentLevel: this.getLevelStateSnapshot()
        };
    }

    /**
     * 应用完整快照（用于读档）
     */
    public applySnapshot(snapshot: InventorySnapshot): void {
        if (!snapshot) return;
        this._globalWallet = snapshot.globalWallet ?? this._globalWallet;
        this._unlockedLevel = snapshot.unlockedLevel ?? this._unlockedLevel;
        this._totalMoney = snapshot.totalMoney ?? this._totalMoney;
        this._dailyEarnings = snapshot.dailyEarnings ?? this._dailyEarnings;
        this._lastPlayDate = snapshot.lastPlayDate ?? this._lastPlayDate;

        if (snapshot.currentLevel) {
            this.applyLevelStateSnapshot(snapshot.currentLevel);
            this.saveLevelState();
        } else {
            this._currentLevel = null;
            this.clearLevelState();
        }

        this.saveProgress();
        this.saveWallet();
        this.saveDailyProgress();
    }

    private getLevelStateSnapshot(): LevelStateSnapshot | null {
        if (!this._currentLevel) return null;
        const inventoryArray: InventoryItemSnapshot[] = [];
        this._currentLevel.inventory.forEach((item, type) => {
            inventoryArray.push({
                type: type as string,
                rawCount: item.rawCount,
                processedCount: item.processedCount,
                reservedCount: item.reservedCount
            });
        });

        return {
            levelId: this._currentLevel.levelId,
            currentMoney: this._currentLevel.currentMoney,
            earnedMoney: this._currentLevel.earnedMoney,
            isCompleted: this._currentLevel.isCompleted,
            badReviewCount: this._currentLevel.badReviewCount,
            inventory: inventoryArray
        };
    }

    private applyLevelStateSnapshot(snapshot: LevelStateSnapshot): void {
        this._currentLevel = {
            levelId: snapshot.levelId,
            currentMoney: snapshot.currentMoney ?? 0,
            earnedMoney: snapshot.earnedMoney ?? 0,
            inventory: new Map(),
            isCompleted: snapshot.isCompleted ?? false,
            badReviewCount: snapshot.badReviewCount ?? 0
        };

        for (const item of snapshot.inventory || []) {
            const type = item.type as IngredientType;
            this._currentLevel.inventory.set(type, {
                ingredientType: type,
                rawCount: item.rawCount ?? 0,
                processedCount: item.processedCount ?? 0,
                reservedCount: item.reservedCount ?? 0
            });
        }
    }
    
    /**
     * 导出存档为JSON字符串（用于备份）
    */
    public exportSave(): string {
        const exportData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            data: this.getSaveStats(),
            levelState: this._currentLevel ? {
                levelId: this._currentLevel.levelId,
                earnedMoney: this._currentLevel.earnedMoney,
                badReviewCount: this._currentLevel.badReviewCount
            } : null
        };
        return JSON.stringify(exportData);
    }
    
    /**
     * 从JSON字符串导入存档
    */
    public importSave(jsonStr: string): boolean {
        try {
            const importData = JSON.parse(jsonStr);
            if (importData.version !== 1) {
                console.error('[InventoryManager] ? 存档版本不兼容');
                return false;
            }
            
            const data = importData.data;
            this._globalWallet = data.globalWallet || 1000;
            this._unlockedLevel = data.unlockedLevel || 1;
            this._totalMoney = data.totalMoney || 0;
            this._dailyEarnings = data.dailyEarnings || 0;
            this._lastPlayDate = data.lastPlayDate || this.getTodayString();
            
            // 保存导入的数据
            this.saveProgress();
            this.saveWallet();
            this.saveDailyProgress();
            
            console.log('[InventoryManager] ? 存档导入成功');
            return true;
        } catch (e) {
            console.error('[InventoryManager] ? 存档导入失败', e);
            return false;
        }
    }
}


