import { sys } from 'cc';
import { GameProgressManager } from './GameProgressManager';
import { InventoryManager, InventorySnapshot } from './InventoryManager';
import type { GameProgress } from './GameProgressManager';
import { WorldProgressManager } from './WorldProgressManager';
import type { WorldProgressData } from './WorldProgressManager';
import { GameSettings } from './SettingsManager';
import { SaveStorage } from './SaveStorage';

/**
 * 存档数据结构
 */
export interface SaveData {
    // 基本信息
    saveId: string;              // 存档ID
    saveName: string;            // 存档名称
    saveType: 'auto' | 'manual'; // 存档类型
    timestamp: number;           // 保存时间戳
    
    // 游戏进度
    playerData: {
        totalMoney: number;           // 总金币
        currentLevel: number;         // 当前关卡ID
        unlockedLevels: number[];     // 已解锁关卡
        completedLevels: number[];    // 已完成关卡
    };
    
    // 统计数据
    stats: {
        totalPlayTime: number;        // 总游戏时长（秒）
        totalOrders: number;          // 总订单数
        totalCustomers: number;       // 总顾客数
        superGoodReviews: number;
        goodReviews: number;
        badReviews: number;
    };
    
    // 成就数据
    achievements: {
        unlockedAchievements: string[];  // 已解锁成就ID
    };

    // 完整快照（用于读档恢复）
    snapshot?: SaveSnapshot;
}

export interface SaveSnapshot {
    progress?: GameProgress | null;
    inventory?: InventorySnapshot | null;
    world?: WorldProgressData | null;
}

/**
 * 存档索引（用于快速列表）
 */
interface SaveIndex {
    auto: string[];    // 自动存档ID列表
    manual: string[];  // 手动存档ID列表
}

/**
 * 存档管理器
 */
export class SaveManager {
    private static readonly STORAGE_PREFIX_AUTO = 'cooking_game_save_auto_';
    private static readonly STORAGE_PREFIX_MANUAL = 'cooking_game_save_manual_';
    private static readonly STORAGE_INDEX_KEY = 'cooking_game_save_index';
    private static readonly MAX_AUTO_SAVES = 5;
    private static readonly MAX_MANUAL_SAVES = 10;

    /**
     * 生成唯一ID
     */
    private static generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 获取存档索引
     */
    private static getIndex(): SaveIndex {
        if (SaveStorage.isFileBackend()) {
            const fileIndex = SaveStorage.readIndex();
            if (fileIndex) {
                return fileIndex;
            }
        }
        const localIndex = this.getIndexFromLocalStorage();
        if (SaveStorage.isFileBackend() && (localIndex.auto.length > 0 || localIndex.manual.length > 0)) {
            this.migrateLocalStorageSaves(localIndex);
            SaveStorage.writeIndex(localIndex);
        }
        return localIndex;
    }

    /**
     * 保存存档索引
     */
    private static saveIndex(index: SaveIndex): void {
        if (SaveStorage.isFileBackend()) {
            SaveStorage.writeIndex(index);
            return;
        }
        this.saveIndexToLocalStorage(index);
    }

    private static getIndexFromLocalStorage(): SaveIndex {
        try {
            const indexData = sys.localStorage.getItem(this.STORAGE_INDEX_KEY);
            if (indexData) {
                return JSON.parse(indexData) as SaveIndex;
            }
        } catch (e) {
            console.error('[SaveManager] 读取存档索引失败', e);
        }
        return { auto: [], manual: [] };
    }

    private static saveIndexToLocalStorage(index: SaveIndex): void {
        try {
            sys.localStorage.setItem(this.STORAGE_INDEX_KEY, JSON.stringify(index));
        } catch (e) {
            console.error('[SaveManager] 保存存档索引失败', e);
        }
    }

    /**
     * 创建存档
     */
    static createSave(name: string, type: 'auto' | 'manual', gameData?: Partial<SaveData>): SaveData {
        const saveId = this.generateId();
        const timestamp = Date.now();

        const saveData: SaveData = {
            saveId,
            saveName: name,
            saveType: type,
            timestamp,
            playerData: {
                totalMoney: 0,
                currentLevel: 1,
                unlockedLevels: [1],
                completedLevels: [],
                ...gameData?.playerData
            },
            stats: {
                totalPlayTime: 0,
                totalOrders: 0,
                totalCustomers: 0,
                superGoodReviews: 0,
                goodReviews: 0,
                badReviews: 0,
                ...gameData?.stats
            },
            achievements: {
                unlockedAchievements: [],
                ...gameData?.achievements
            },
            snapshot: gameData?.snapshot
        };

        // 保存存档数据
        const dataStr = JSON.stringify(saveData);
        if (SaveStorage.isFileBackend()) {
            try {
                SaveStorage.writeSave(type, saveId, dataStr);
            } catch (e) {
                console.error('[SaveManager] 保存存档失败', e);
                throw new Error('存档保存失败');
            }
        } else {
            const key = type === 'auto'
                ? this.STORAGE_PREFIX_AUTO + saveId
                : this.STORAGE_PREFIX_MANUAL + saveId;
            try {
                sys.localStorage.setItem(key, dataStr);
            } catch (e) {
                console.error('[SaveManager] 保存存档失败', e);
                throw new Error('存档保存失败');
            }
        }

        // 更新索引
        const index = this.getIndex();
        if (type === 'auto') {
            index.auto.unshift(saveId);
            // 限制自动存档数量
            if (index.auto.length > this.MAX_AUTO_SAVES) {
                const removedId = index.auto.pop();
                if (removedId) {
                    sys.localStorage.removeItem(this.STORAGE_PREFIX_AUTO + removedId);
                }
            }
        } else {
            index.manual.unshift(saveId);
            // 限制手动存档数量
            if (index.manual.length > this.MAX_MANUAL_SAVES) {
                console.warn('[SaveManager] 手动存档已达上限');
                return null;
            }
        }
        this.saveIndex(index);

        console.log(`[SaveManager] 创建${type === 'auto' ? '自动' : '手动'}存档: ${name}`);
        return saveData;
    }

    private static cloneProgress(progress?: GameProgress | null): GameProgress | null {
        if (!progress) return null;
        return JSON.parse(JSON.stringify(progress)) as GameProgress;
    }

    private static cloneWorldProgress(progress?: WorldProgressData | null): WorldProgressData | null {
        if (!progress) return null;
        return JSON.parse(JSON.stringify(progress)) as WorldProgressData;
    }

    /**
     * 构建当前游戏快照
     */
    static buildSnapshot(): SaveSnapshot | null {
        const progressManager = GameProgressManager.instance;
        const worldManager = WorldProgressManager.instance;
        const inventory = InventoryManager.instance;
        if (!progressManager && !inventory && !worldManager) return null;

        return {
            progress: this.cloneProgress(progressManager?.progress),
            inventory: inventory ? inventory.buildSnapshot() : null,
            world: this.cloneWorldProgress(worldManager?.progress)
        };
    }

    /**
     * 构建存档数据（用于创建存档）
     */
    static buildCurrentSaveData(): Partial<SaveData> {
        const progress = GameProgressManager.instance?.progress;
        const world = WorldProgressManager.instance?.progress;
        const inventory = InventoryManager.instance;
        const snapshot = this.buildSnapshot();

        const totalMoney = world?.totalMoney ?? inventory?.globalWallet ?? progress?.totalMoney ?? 0;
        const currentLevel = 1;
        const unlockedLevels = progress?.unlockedLevels ?? [1];
        const completedLevels = progress?.completedLevels ?? [];

        return {
            playerData: {
                totalMoney,
                currentLevel,
                unlockedLevels,
                completedLevels
            },
            stats: {
                totalPlayTime: 0,
                totalOrders: progress?.totalOrders ?? 0,
                totalCustomers: progress?.totalCustomers ?? 0,
                superGoodReviews: progress?.superGoodReviews ?? 0,
                goodReviews: progress?.goodReviews ?? 0,
                badReviews: progress?.badReviews ?? 0
            },
            achievements: {
                unlockedAchievements: []
            },
            snapshot: snapshot || undefined
        };
    }

    /**
     * 应用快照到当前游戏
     */
    static applySnapshot(snapshot?: SaveSnapshot | null): void {
        if (!snapshot) return;
        const progressManager = GameProgressManager.instance;
        if (progressManager && snapshot.progress) {
            progressManager.applyProgress(snapshot.progress);
        }

        if (snapshot.world) {
            const worldManager = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
            worldManager.applyProgress(snapshot.world);
        }

        const inventory = InventoryManager.instance;
        if (inventory && snapshot.inventory) {
            inventory.applySnapshot(snapshot.inventory);
        }
    }

    private static migrateLocalStorageSaves(index: SaveIndex): void {
        if (!SaveStorage.isFileBackend()) return;
        const migrate = (type: 'auto' | 'manual', ids: string[]) => {
            ids.forEach(id => {
                const key = type === 'auto'
                    ? this.STORAGE_PREFIX_AUTO + id
                    : this.STORAGE_PREFIX_MANUAL + id;
                const dataStr = sys.localStorage.getItem(key);
                if (dataStr) {
                    SaveStorage.writeSave(type, id, dataStr);
                }
            });
        };

        migrate('auto', index.auto);
        migrate('manual', index.manual);
    }

    /**
     * 加载存档
     */
    static loadSave(saveId: string): SaveData | null {
        try {
            // 尝试从自动存档加载
            let dataStr: string | null = null;
            if (SaveStorage.isFileBackend()) {
                dataStr = SaveStorage.readSave('auto', saveId);
            } else {
                const key = this.STORAGE_PREFIX_AUTO + saveId;
                dataStr = sys.localStorage.getItem(key);
            }
            
            // 如果不是自动存档，尝试手动存档
            if (!dataStr) {
                if (SaveStorage.isFileBackend()) {
                    dataStr = SaveStorage.readSave('manual', saveId);
                } else {
                    const key = this.STORAGE_PREFIX_MANUAL + saveId;
                    dataStr = sys.localStorage.getItem(key);
                }
            }

            // 兼容本地存储 -> 文件存档迁移
            if (!dataStr && SaveStorage.isFileBackend()) {
                const localAuto = sys.localStorage.getItem(this.STORAGE_PREFIX_AUTO + saveId);
                if (localAuto) {
                    SaveStorage.writeSave('auto', saveId, localAuto);
                    dataStr = localAuto;
                } else {
                    const localManual = sys.localStorage.getItem(this.STORAGE_PREFIX_MANUAL + saveId);
                    if (localManual) {
                        SaveStorage.writeSave('manual', saveId, localManual);
                        dataStr = localManual;
                    }
                }
            }

            if (dataStr) {
                const saveData = JSON.parse(dataStr) as SaveData;
                console.log('[SaveManager] 加载存档成功:', saveData.saveName);
                return saveData;
            }
        } catch (e) {
            console.error('[SaveManager] 加载存档失败', e);
        }
        return null;
    }

    /**
     * 删除存档
     */
    static deleteSave(saveId: string): boolean {
        const index = this.getIndex();
        
        // 从自动存档删除
        let autoIndex = index.auto.indexOf(saveId);
        if (autoIndex !== -1) {
            index.auto.splice(autoIndex, 1);
            if (SaveStorage.isFileBackend()) {
                SaveStorage.deleteSave('auto', saveId);
            } else {
                sys.localStorage.removeItem(this.STORAGE_PREFIX_AUTO + saveId);
            }
            this.saveIndex(index);
            console.log('[SaveManager] 删除自动存档:', saveId);
            return true;
        }

        // 从手动存档删除
        let manualIndex = index.manual.indexOf(saveId);
        if (manualIndex !== -1) {
            index.manual.splice(manualIndex, 1);
            if (SaveStorage.isFileBackend()) {
                SaveStorage.deleteSave('manual', saveId);
            } else {
                sys.localStorage.removeItem(this.STORAGE_PREFIX_MANUAL + saveId);
            }
            this.saveIndex(index);
            console.log('[SaveManager] 删除手动存档:', saveId);
            return true;
        }

        console.warn('[SaveManager] 存档不存在:', saveId);
        return false;
    }

    /**
     * 列出所有存档
     */
    static listSaves(): SaveData[] {
        const index = this.getIndex();
        const saves: SaveData[] = [];

        // 加载所有存档
        [...index.auto, ...index.manual].forEach(saveId => {
            const save = this.loadSave(saveId);
            if (save) {
                saves.push(save);
            }
        });

        // 按时间戳降序排序
        saves.sort((a, b) => b.timestamp - a.timestamp);

        return saves;
    }

    /**
     * 获取最新存档
     */
    static getLatestSave(): SaveData | null {
        const saves = this.listSaves();
        return saves.length > 0 ? saves[0] : null;
    }

    /**
     * 自动存档
     */
    static autoSave(gameData: Partial<SaveData>): SaveData {
        const name = `自动存档 ${new Date().toLocaleString('zh-CN')}`;
        return this.createSave(name, 'auto', gameData);
    }

    /**
     * 重命名存档
     */
    static renameSave(saveId: string, newName: string): boolean {
        const saveData = this.loadSave(saveId);
        if (!saveData) {
            console.warn('[SaveManager] 存档不存在:', saveId);
            return false;
        }

        saveData.saveName = newName;
        
        try {
            const dataStr = JSON.stringify(saveData);
            if (SaveStorage.isFileBackend()) {
                SaveStorage.writeSave(saveData.saveType, saveId, dataStr);
            } else {
                const key = saveData.saveType === 'auto'
                    ? this.STORAGE_PREFIX_AUTO + saveId
                    : this.STORAGE_PREFIX_MANUAL + saveId;
                sys.localStorage.setItem(key, dataStr);
            }
            console.log('[SaveManager] 重命名存档成功:', newName);
            return true;
        } catch (e) {
            console.error('[SaveManager] 重命名存档失败', e);
            return false;
        }
    }

    /**
     * 获取存档数量
     */
    static getSaveCount(): { auto: number; manual: number; total: number } {
        const index = this.getIndex();
        return {
            auto: index.auto.length,
            manual: index.manual.length,
            total: index.auto.length + index.manual.length
        };
    }

    /**
     * 清空所有存档（慎用！）
     */
    static clearAllSaves(): void {
        const index = this.getIndex();
        
        // 删除所有自动存档
        index.auto.forEach(id => {
            if (SaveStorage.isFileBackend()) {
                SaveStorage.deleteSave('auto', id);
            } else {
                sys.localStorage.removeItem(this.STORAGE_PREFIX_AUTO + id);
            }
        });
        
        // 删除所有手动存档
        index.manual.forEach(id => {
            if (SaveStorage.isFileBackend()) {
                SaveStorage.deleteSave('manual', id);
            } else {
                sys.localStorage.removeItem(this.STORAGE_PREFIX_MANUAL + id);
            }
        });

        // 清空索引
        this.saveIndex({ auto: [], manual: [] });
        console.log('[SaveManager] 已清空所有存档');
    }
}
