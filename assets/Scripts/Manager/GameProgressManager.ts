import { _decorator, Component, sys } from 'cc';
import { GameConfig } from '../Data/GameConfig';
const { ccclass, property } = _decorator;

/**
 * 游戏进度数据结构
 */
export interface GameProgress {
    // 当前关卡信息
    currentLevel: number;           // 当前关卡ID (1-6)
    currentDay: number;             // 累计天数（仅显示用，无上限）
    
    // 金币信息
    totalMoney: number;             // 累计总金币
    todayEarnings: number;          // 今日收入
    todayRevenue?: number;          // 今日营业额（毛收入）
    todayExpenses?: number;         // 今日成本（固定+包装+差评）
    todayNet?: number;              // 今日净收益
    
    // 关卡解锁状态
    unlockedLevels: number[];       // 已解锁的关卡ID列表
    completedLevels: number[];      // 已完成的关卡ID列表
    
    // 统计信息
    totalCustomers: number;         // 累计顾客数
    totalOrders: number;            // 累计订单数
    superGoodReviews: number;       // 特好评数
    goodReviews: number;            // 好评数
    badReviews: number;             // 差评数

    // 教程进度
    tutorialCompleted?: boolean;    // 是否已完成新手教程
    
    // 时间戳
    lastSaveTime: number;           // 最后保存时间
}

/**
 * 关卡配置数据
 */
export interface LevelConfig {
    levelId: number;                // 关卡ID
    levelName: string;              // 关卡名称
    foodType: string;               // 食物类型
    unlockMoney: number;            // 解锁下一关所需金额
    initialMoney: number;           // 初始资金
    maxBadReviews: number;          // 最大差评数
    difficulty: number;             // 难度等级 (1-6)
}

/**
 * 6关配置数据
 *
 * 数值平衡说明：
 * - 起始资金: 1000元
 * - 终点门槛: 20000元（盈利线性增长）
 * - 第二关解锁：第一关盈利 2000（总额 3000）
 */
export const LEVEL_CONFIGS: LevelConfig[] = [
    {
        levelId: 1,
        levelName: '烤冷面',
        foodType: 'grilled_noodle',
        unlockMoney: 2000,
        initialMoney: 1000,
        maxBadReviews: 5,
        difficulty: 1
    },
    {
        levelId: 2,
        levelName: '东北饭包',
        foodType: 'rice_bundle',
        unlockMoney: 4000,
        initialMoney: 1000,
        maxBadReviews: 4,
        difficulty: 2
    },
    {
        levelId: 3,
        levelName: '锅包肉',
        foodType: 'bbq',
        unlockMoney: 8000,
        initialMoney: 1000,
        maxBadReviews: 3,
        difficulty: 3
    },
    {
        levelId: 4,
        levelName: '麻辣烫',
        foodType: 'rice_wrap',
        unlockMoney: 14000,
        initialMoney: 1000,
        maxBadReviews: 3,
        difficulty: 4
    },
    {
        levelId: 5,
        levelName: '烧烤',
        foodType: 'guobaorou',
        unlockMoney: 20000,
        initialMoney: 1000,
        maxBadReviews: 2,
        difficulty: 5
    },
    {
        levelId: 6,
        levelName: '料理王比赛',
        foodType: 'bibimbap',
        unlockMoney: 20000,
        initialMoney: 1000,
        maxBadReviews: 2,
        difficulty: 6
    }
];

/**
 * 🎮 游戏进度管理器
 * 管理跨天/跨关卡的游戏进度
 */
@ccclass('GameProgressManager')
export class GameProgressManager extends Component {
    
    private static _instance: GameProgressManager = null;
    private static readonly STORAGE_KEY = 'cooking_game_progress';
    private static readonly DEBUG_UNLOCK_ALL_LEVELS: boolean = false;
    
    // 当前进度数据
    private _progress: GameProgress = null;
    
    public static get instance(): GameProgressManager {
        return GameProgressManager._instance;
    }
    
    onLoad() {
        if (GameProgressManager._instance && GameProgressManager._instance !== this) {
            this.destroy();
            return;
        }
        GameProgressManager._instance = this;

        // 加载保存的进度
        this.loadProgress();


        console.log('[GameProgressManager] ✅ 游戏进度管理器已初始化');
    }
    
    /**
     * 获取当前进度
     */
    public get progress(): GameProgress {
        return this._progress;
    }
    
    /**
     * 获取当前关卡配置
     */
    public get currentLevelConfig(): LevelConfig | null {
        return LEVEL_CONFIGS.find(c => c.levelId === this._progress.currentLevel) || null;
    }
    
    /**
     * 获取关卡配置
     */
    public getLevelConfig(levelId: number): LevelConfig | null {
        return LEVEL_CONFIGS.find(c => c.levelId === levelId) || null;
    }
    
    /**
     * 加载进度
     */
    public loadProgress(): void {
        try {
            const dataStr = sys.localStorage.getItem(GameProgressManager.STORAGE_KEY);
            if (dataStr) {
                this._progress = JSON.parse(dataStr);
                this.applyDefaults();
                console.log('[GameProgressManager] 📂 加载进度:', this._progress);
            } else {
                this.resetProgress();
            }
        } catch (e) {
            console.error('[GameProgressManager] ❌ 加载进度失败:', e);
            this.resetProgress();
        }
    }
    
    /**
     * 保存进度
     */
    public saveProgress(): void {
        try {
            this._progress.lastSaveTime = Date.now();
            sys.localStorage.setItem(GameProgressManager.STORAGE_KEY, JSON.stringify(this._progress));
            console.log('[GameProgressManager] 💾 保存进度成功');
        } catch (e) {
            console.error('[GameProgressManager] ❌ 保存进度失败:', e);
        }
    }

    /**
     * 应用存档进度
     */
    public applyProgress(progress: GameProgress): void {
        if (!progress) return;
        if (!this._progress) {
            this.resetProgress();
        }
        this._progress = {
            ...this._progress,
            ...progress,
            lastSaveTime: Date.now()
        };
        this.saveProgress();
    }
    
    /**
     * 重置进度（新游戏）
     */
    public resetProgress(): void {
        this._progress = {
            currentLevel: 1,
            currentDay: 1,
            totalMoney: LEVEL_CONFIGS[0].initialMoney,
            todayEarnings: 0,
            todayRevenue: 0,
            todayExpenses: 0,
            todayNet: 0,
            unlockedLevels: [1],
            completedLevels: [],
            totalCustomers: 0,
            totalOrders: 0,
            superGoodReviews: 0,
            goodReviews: 0,
            badReviews: 0,
            tutorialCompleted: false,
            lastSaveTime: Date.now()
        };
        this.saveProgress();
        console.log('[GameProgressManager] 🆕 创建新进度');
    }

    private applyDefaults() {
        if (!this._progress) return;
        if (typeof this._progress.tutorialCompleted !== 'boolean') {
            this._progress.tutorialCompleted = false;
        }
    }
    
    /**
     * 开始新关卡
     */
    public startLevel(levelId: number): boolean {
        if (!this.isLevelUnlocked(levelId)) {
            console.warn(`[GameProgressManager] ⚠️ 关卡 ${levelId} 未解锁`);
            return false;
        }
        
        const config = this.getLevelConfig(levelId);
        if (!config) {
            console.error(`[GameProgressManager] ❌ 关卡 ${levelId} 不存在`);
            return false;
        }
        
        this._progress.currentLevel = levelId;
        this._progress.currentDay = 1;
        this._progress.todayEarnings = 0;
        
        // 如果是新关卡（未完成过），使用初始资金
        if (this._progress.completedLevels.indexOf(levelId) === -1) {
            this._progress.totalMoney = config.initialMoney;
        }
        
        this.saveProgress();
        console.log(`[GameProgressManager] 🎮 开始关卡 ${levelId}: ${config.levelName}`);
        return true;
    }
    
    /**
     * 结束今日营业
     * @param earnings 今日收入
     * @param customers 今日顾客数
     * @param reviews 今日评价 {superGood, good, bad}
     */
    public endDay(
        earnings: number,
        customers: number,
        reviews: {superGood: number, good: number, bad: number},
        detail?: { revenue: number; expenses: number; net: number }
    ): void {
        this._progress.todayEarnings = earnings;
        if (detail) {
            this._progress.todayRevenue = detail.revenue;
            this._progress.todayExpenses = detail.expenses;
            this._progress.todayNet = detail.net;
        } else {
            this._progress.todayRevenue = earnings;
            this._progress.todayExpenses = 0;
            this._progress.todayNet = earnings;
        }
        this._progress.totalMoney += earnings;
        this._progress.totalCustomers += customers;
        this._progress.totalOrders += customers;
        this._progress.superGoodReviews += reviews.superGood;
        this._progress.goodReviews += reviews.good;
        this._progress.badReviews += reviews.bad;
        
        console.log(`[GameProgressManager] 🌙 第${this._progress.currentDay}天结束`);
        console.log(`  - 今日收入: ${earnings}元`);
        console.log(`  - 累计金币: ${this._progress.totalMoney}元`);
        
        this.saveProgress();
    }
    
    /**
     * 进入下一天（仅增加天数计数器，用于显示）
     */
    public nextDay(): void {
        this._progress.currentDay++;
        this._progress.todayEarnings = 0;
        this._progress.todayRevenue = 0;
        this._progress.todayExpenses = 0;
        this._progress.todayNet = 0;
        this.saveProgress();
        
        console.log(`[GameProgressManager] 🌅 进入第${this._progress.currentDay}天`);
    }
    
    /**
     * 完成当前关卡
     */
    public completeLevel(): boolean {
        const config = this.currentLevelConfig;
        if (!config) return false;
        
        // 标记为已完成
        if (this._progress.completedLevels.indexOf(config.levelId) === -1) {
            this._progress.completedLevels.push(config.levelId);
        }
        
        // 检查是否可以解锁下一关
        const nextLevelId = config.levelId + 1;
        if (!GameConfig.DEMO_ONLY_LEVEL1 && nextLevelId <= LEVEL_CONFIGS.length && this._progress.totalMoney >= config.unlockMoney) {
            this.unlockLevel(nextLevelId);
        }
        
        this.saveProgress();
        console.log(`[GameProgressManager] 🎉 关卡 ${config.levelId} 完成！`);
        return true;
    }
    
    /**
     * 解锁关卡
     */
    public unlockLevel(levelId: number): boolean {
        if (GameConfig.DEMO_ONLY_LEVEL1 && levelId > GameConfig.DEMO_LEVEL_CAP) {
            return false;
        }
        if (this._progress.unlockedLevels.indexOf(levelId) !== -1) {
            return true;
        }
        
        this._progress.unlockedLevels.push(levelId);
        this._progress.unlockedLevels.sort((a, b) => a - b);
        this.saveProgress();
        
        console.log(`[GameProgressManager] 🔓 解锁关卡 ${levelId}`);
        return true;
    }
    
    /**
     * 检查关卡是否已解锁
     */
    public isLevelUnlocked(levelId: number): boolean {
        if (GameProgressManager.DEBUG_UNLOCK_ALL_LEVELS) return true;
        if (GameConfig.DEMO_ONLY_LEVEL1 && levelId > GameConfig.DEMO_LEVEL_CAP) return false;
        return this._progress.unlockedLevels.indexOf(levelId) !== -1;
    }
    
    /**
     * 检查关卡是否已完成
     */
    public isLevelCompleted(levelId: number): boolean {
        return this._progress.completedLevels.indexOf(levelId) !== -1;
    }
    
    /**
     * 检查是否可以解锁下一关
     */
    public canUnlockNextLevel(): boolean {
        const config = this.currentLevelConfig;
        if (!config || config.levelId >= LEVEL_CONFIGS.length) return false;
        
        return this._progress.totalMoney >= config.unlockMoney;
    }
    
    /**
     * 获取解锁下一关还需要的金额
     */
    public getMoneyNeededForNextLevel(): number {
        const config = this.currentLevelConfig;
        if (!config || config.levelId >= LEVEL_CONFIGS.length) return 0;
        
        return Math.max(0, config.unlockMoney - this._progress.totalMoney);
    }
    
    /**
     * 添加金币
     */
    public addMoney(amount: number): void {
        this._progress.totalMoney += amount;
        this._progress.todayEarnings += amount;
        this.saveProgress();
    }
    
    /**
     * 扣除金币
     */
    public spendMoney(amount: number): boolean {
        if (this._progress.totalMoney < amount) {
            return false;
        }
        this._progress.totalMoney -= amount;
        this.saveProgress();
        return true;
    }
    
    /**
     * 获取当前天数显示文本
     */
    public getDayText(): string {
        return `第${this._progress.currentDay}天`;
    }
    
    /**
     * 获取关卡进度百分比
     */
    public getLevelProgress(): number {
        const config = this.currentLevelConfig;
        if (!config || config.unlockMoney === 0) return 100;
        return Math.min(100, Math.floor(this._progress.totalMoney / config.unlockMoney * 100));
    }

}



