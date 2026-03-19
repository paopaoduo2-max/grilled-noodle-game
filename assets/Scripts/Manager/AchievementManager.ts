import { _decorator, Component, sys } from 'cc';

const { ccclass } = _decorator;

/**
 * 成就类型
 */
export enum AchievementType {
    STORY = 'story',              // 剧情成就
    CUSTOMER = 'customer',        // 客户相关
    QUALITY = 'quality',          // 品质相关
    SPEED = 'speed',              // 速度相关
    MONEY = 'money',              // 金币相关
    REVIEW = 'review',            // 评价相关
    HIDDEN = 'hidden'             // 隐藏成就
}

/**
 * 成就数据
 */
export interface AchievementData {
    id: string;
    name: string;
    description: string;
    type: AchievementType;
    icon: string;
    unlocked: boolean;
    progress: number;             // 当前进度
    target: number;               // 目标值
    reward?: string;              // 奖励描述
}

/**
 * 成就管理器
 * 负责跟踪和管理玩家成就
 */
@ccclass('AchievementManager')
export class AchievementManager extends Component {
    private static _instance: AchievementManager = null;

    public static get Instance(): AchievementManager {
        return this._instance;
    }

    private achievements: Map<string, AchievementData> = new Map();

    onLoad() {
        if (AchievementManager._instance === null) {
            AchievementManager._instance = this;
        }

        this.initAchievements();
        this.loadProgress();
        console.log('[AchievementManager] 成就系统初始化');
    }

    /**
     * 初始化所有成就
     */
    private initAchievements() {
        const achievementList: AchievementData[] = [
            // 剧情成就
            {
                id: 'first_step',
                name: '🏆 初出茅庐',
                description: '完成教程关卡',
                type: AchievementType.STORY,
                icon: '🎓',
                unlocked: false,
                progress: 0,
                target: 1
            },
            {
                id: 'chapter_1',
                name: '🏆 烤冷面大师',
                description: '完成第一关',
                type: AchievementType.STORY,
                icon: '🍜',
                unlocked: false,
                progress: 0,
                target: 1
            },
            {
                id: 'master_chef',
                name: '🏆 东北料理王',
                description: '完成全部7个关卡',
                type: AchievementType.STORY,
                icon: '👑',
                unlocked: false,
                progress: 0,
                target: 7
            },

            // 客户相关
            {
                id: 'serve_100',
                name: '🏆 料理学徒',
                description: '累计服务100位客户',
                type: AchievementType.CUSTOMER,
                icon: '👥',
                unlocked: false,
                progress: 0,
                target: 100
            },
            {
                id: 'serve_500',
                name: '🏆 料理大师',
                description: '累计服务500位客户',
                type: AchievementType.CUSTOMER,
                icon: '👨‍🍳',
                unlocked: false,
                progress: 0,
                target: 500
            },
            {
                id: 'vip_10',
                name: '🏆 VIP专家',
                description: '服务10位VIP客户',
                type: AchievementType.CUSTOMER,
                icon: '💎',
                unlocked: false,
                progress: 0,
                target: 10
            },

            // 品质相关
            {
                id: 'perfect_100',
                name: '🏆 完美主义者',
                description: '获得100次完美品质',
                type: AchievementType.QUALITY,
                icon: '✨',
                unlocked: false,
                progress: 0,
                target: 100
            },
            {
                id: 'all_perfect',
                name: '🏆 完美通关',
                description: '单局所有订单都是完美品质',
                type: AchievementType.QUALITY,
                icon: '🌟',
                unlocked: false,
                progress: 0,
                target: 1
            },

            // 速度相关
            {
                id: 'combo_20',
                name: '🏆 速度之王',
                description: '单局连击20次',
                type: AchievementType.SPEED,
                icon: '⚡',
                unlocked: false,
                progress: 0,
                target: 20
            },
            {
                id: 'fast_service',
                name: '🏆 闪电服务',
                description: '5秒内完成一个订单',
                type: AchievementType.SPEED,
                icon: '💨',
                unlocked: false,
                progress: 0,
                target: 1
            },

            // 评价相关
            {
                id: 'reviews_20',
                name: '🏆 口碑王者',
                description: '单局获得20个好评',
                type: AchievementType.REVIEW,
                icon: '👍',
                unlocked: false,
                progress: 0,
                target: 20
            },
            {
                id: 'zero_negative',
                name: '🏆 零差评传说',
                description: '连续5关零差评通关',
                type: AchievementType.REVIEW,
                icon: '🛡️',
                unlocked: false,
                progress: 0,
                target: 5
            },
            {
                id: 'remove_50',
                name: '🏆 危机公关',
                description: '累计消除50个差评',
                type: AchievementType.REVIEW,
                icon: '🧹',
                unlocked: false,
                progress: 0,
                target: 50
            },

            // 金币相关
            {
                id: 'earn_10000',
                name: '🏆 小富即安',
                description: '累计赚取10000金币',
                type: AchievementType.MONEY,
                icon: '💰',
                unlocked: false,
                progress: 0,
                target: 10000
            },

            // 隐藏成就
            {
                id: 'bankruptcy',
                name: '🎖️ 破产重生',
                description: '金币归零后仍然通关',
                type: AchievementType.HIDDEN,
                icon: '💸',
                unlocked: false,
                progress: 0,
                target: 1
            },
            {
                id: 'extreme_multitask',
                name: '🎖️ 极限操作',
                description: '同时制作5份不同菜品',
                type: AchievementType.HIDDEN,
                icon: '🔥',
                unlocked: false,
                progress: 0,
                target: 1
            }
        ];

        for (const achievement of achievementList) {
            this.achievements.set(achievement.id, achievement);
        }
    }

    /**
     * 更新成就进度
     */
    updateProgress(achievementId: string, increment: number = 1) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement || achievement.unlocked) return;

        achievement.progress += increment;

        if (achievement.progress >= achievement.target) {
            this.unlockAchievement(achievementId);
        }

        this.saveProgress();
    }

    /**
     * 解锁成就
     */
    private unlockAchievement(achievementId: string) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement || achievement.unlocked) return;

        achievement.unlocked = true;
        achievement.progress = achievement.target;

        console.log(`[AchievementManager] 🏆 成就解锁: ${achievement.name}`);
        
        // 触发事件通知UI
        this.node.emit('achievement-unlocked', achievement);

        this.saveProgress();
    }

    /**
     * 获取所有成就
     */
    getAllAchievements(): AchievementData[] {
        return Array.from(this.achievements.values());
    }

    /**
     * 获取已解锁成就
     */
    getUnlockedAchievements(): AchievementData[] {
        return Array.from(this.achievements.values()).filter(a => a.unlocked);
    }

    /**
     * 获取成就完成度
     */
    getCompletionRate(): number {
        const total = this.achievements.size;
        const unlocked = this.getUnlockedAchievements().length;
        return (unlocked / total) * 100;
    }

    /**
     * 保存进度到本地
     */
    private saveProgress() {
        const data: any = {};
        this.achievements.forEach((achievement, id) => {
            data[id] = {
                unlocked: achievement.unlocked,
                progress: achievement.progress
            };
        });

        sys.localStorage.setItem('achievements', JSON.stringify(data));
    }

    /**
     * 从本地加载进度
     */
    private loadProgress() {
        const dataStr = sys.localStorage.getItem('achievements');
        if (!dataStr) return;

        try {
            const data = JSON.parse(dataStr);
            for (const id in data) {
                const achievement = this.achievements.get(id);
                if (achievement) {
                    achievement.unlocked = data[id].unlocked;
                    achievement.progress = data[id].progress;
                }
            }
            console.log('[AchievementManager] 成就进度已加载');
        } catch (e) {
            console.error('[AchievementManager] 加载成就进度失败:', e);
        }
    }

    /**
     * 重置所有成就（开发测试用）
     */
    resetAllAchievements() {
        this.achievements.forEach(achievement => {
            achievement.unlocked = false;
            achievement.progress = 0;
        });
        this.saveProgress();
        console.log('[AchievementManager] 所有成就已重置');
    }
}

