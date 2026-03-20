import { _decorator, Component, Node, director, sys } from 'cc';
import {
    DeviceConfig,
    IngredientFlavorConfig,
    StoryLineType,
    StoryTaskConfig,
    WorldMapId,
    WorldProgress,
    WORLD_DEVICE_CONFIGS,
    WORLD_INGREDIENT_CONFIGS,
    WORLD_MAP_CONFIGS,
    WORLD_STORY_TASKS,
    getWorldDeviceConfig,
    getWorldDeviceUnlockPrice,
    getWorldIngredientConfig,
    getWorldMapConfig,
    getWorldStoryTask
} from '../Data/WorldRuntimeConfig';

const { ccclass } = _decorator;

interface StoryProgressState {
    mainlineUnlocked: string[];
    branchUnlocked: string[];
}

interface WorldDayState {
    dayIndex: number;
    mainTaskId: string | null;
    sideTaskId: string | null;
    taskProgress: Record<string, number>;
    completedTaskIds: string[];
}

export interface WorldProgressData extends WorldProgress {
    schemaVersion: number;
    lastSaveTime: number;
    currentDayState: WorldDayState;
    npcOrderStats: Record<string, number>;

    // 兼容字段（旧脚本仍在读）
    wallet: number;
    currentLocation: string;
    unlockedLocations: string[];
    storyState: StoryProgressState;
}

@ccclass('WorldProgressManager')
export class WorldProgressManager extends Component {
    private static _instance: WorldProgressManager | null = null;
    private static readonly SCHEMA_VERSION = 2;
    private static readonly STORAGE_KEY = 'world_mode_v2_progress';
    private static readonly LEGACY_BACKUP_KEY = 'world_mode_legacy_backup';
    private static readonly LEGACY_BACKUP_DONE_KEY = 'world_mode_v2_legacy_backed_up';

    private _progress: WorldProgressData | null = null;

    public static get instance(): WorldProgressManager | null {
        return WorldProgressManager._instance;
    }

    public static ensureInstance(): WorldProgressManager {
        if (WorldProgressManager._instance && WorldProgressManager._instance.isValid) {
            return WorldProgressManager._instance;
        }

        const scene = director.getScene();
        if (!scene) {
            throw new Error('WorldProgressManager 初始化失败：当前无场景');
        }

        const node = new Node('WorldProgressManager');
        scene.addChild(node);
        return node.addComponent(WorldProgressManager);
    }

    onLoad(): void {
        if (WorldProgressManager._instance && WorldProgressManager._instance !== this) {
            this.destroy();
            return;
        }
        WorldProgressManager._instance = this;
        director.addPersistRootNode(this.node);
        this.bootstrap();
    }

    public get progress(): WorldProgressData {
        if (!this._progress) {
            this.resetProgress();
        }
        return this._progress as WorldProgressData;
    }

    public applyProgress(progress: Partial<WorldProgressData>): void {
        if (!progress) return;
        if (!this._progress) this.resetProgress();
        this._progress = {
            ...(this._progress as WorldProgressData),
            ...progress
        };
        this.applyDefaults();
    }

    public resetProgress(): void {
        const initial: WorldProgressData = {
            schemaVersion: WorldProgressManager.SCHEMA_VERSION,
            totalMoney: 1000,
            currentMapId: 'street',
            unlockedMaps: ['street'],
            unlockedDevices: [],
            unlockedIngredients: [],
            storyFlags: {},
            dayIndex: 1,
            currentDayState: {
                dayIndex: 1,
                mainTaskId: null,
                sideTaskId: null,
                taskProgress: {},
                completedTaskIds: []
            },
            npcOrderStats: {},
            storyState: {
                mainlineUnlocked: [],
                branchUnlocked: []
            },
            wallet: 1000,
            currentLocation: 'street',
            unlockedLocations: ['street'],
            lastSaveTime: Date.now()
        };

        this._progress = initial;
        this.refreshMapUnlocksByMoney(false);
        this.saveProgress();
    }

    public addMoney(amount: number): void {
        if (amount <= 0) return;
        this.progress.totalMoney += amount;
        this.syncCompatFields();
        this.refreshMapUnlocksByMoney(false);
        this.saveProgress();
    }

    public spendMoney(amount: number): boolean {
        if (amount <= 0) return true;
        if (this.progress.totalMoney < amount) return false;
        this.progress.totalMoney -= amount;
        this.syncCompatFields();
        this.saveProgress();
        return true;
    }

    public nextDay(): void {
        this.progress.dayIndex += 1;
        this.resetCurrentDayState();
        this.saveProgress();
    }

    public resetCurrentDayState(): void {
        this.progress.currentDayState = {
            dayIndex: this.progress.dayIndex,
            mainTaskId: null,
            sideTaskId: null,
            taskProgress: {},
            completedTaskIds: []
        };
        this.saveProgress();
    }

    public assignDailyTask(lineType: StoryLineType, taskId: string | null): void {
        if (lineType === 'main') {
            this.progress.currentDayState.mainTaskId = taskId;
        } else {
            this.progress.currentDayState.sideTaskId = taskId;
        }
        this.saveProgress();
    }

    public increaseDailyTaskProgress(taskId: string, delta: number): number {
        if (!taskId || delta <= 0) return 0;
        const state = this.progress.currentDayState;
        state.taskProgress[taskId] = (state.taskProgress[taskId] || 0) + delta;
        this.saveProgress();
        return state.taskProgress[taskId];
    }

    public getDailyTaskProgress(taskId: string): number {
        if (!taskId) return 0;
        return this.progress.currentDayState.taskProgress[taskId] || 0;
    }

    public completeStoryTask(taskId: string): void {
        if (!taskId || this.isStoryTaskCompleted(taskId)) return;
        const task = getWorldStoryTask(taskId);
        if (!task) return;

        this.progress.storyFlags[`task.completed.${taskId}`] = true;
        if (!this.progress.currentDayState.completedTaskIds.includes(taskId)) {
            this.progress.currentDayState.completedTaskIds.push(taskId);
        }

        if (task.lineType === 'main' && !this.progress.storyState.mainlineUnlocked.includes(taskId)) {
            this.progress.storyState.mainlineUnlocked.push(taskId);
        }
        if (task.lineType === 'side' && !this.progress.storyState.branchUnlocked.includes(taskId)) {
            this.progress.storyState.branchUnlocked.push(taskId);
        }

        this.applyTaskRewards(task);
        this.saveProgress();
    }

    public isStoryTaskCompleted(taskId: string): boolean {
        return this.progress.storyFlags[`task.completed.${taskId}`] === true;
    }

    public getStoryFlag(flag: string): boolean {
        if (!flag) return false;
        return this.progress.storyFlags[flag] === true;
    }

    public setStoryFlag(flag: string, value: boolean = true): void {
        if (!flag) return;
        this.progress.storyFlags[flag] = value;
        this.saveProgress();
    }

    public unlockDevice(deviceId: string, spendMoney: boolean = true): boolean {
        if (!deviceId) return false;
        if (this.progress.unlockedDevices.includes(deviceId)) return true;
        const config = getWorldDeviceConfig(deviceId);
        if (!config) return false;

        if (!this.meetsDeviceCondition(config)) return false;
        const unlockPrice = getWorldDeviceUnlockPrice(deviceId);
        if (spendMoney && unlockPrice > 0 && !this.spendMoney(unlockPrice)) return false;

        this.progress.unlockedDevices.push(deviceId);
        this.saveProgress();
        return true;
    }

    public unlockIngredient(ingredientId: string, spendMoney: boolean = true): boolean {
        if (!ingredientId) return false;
        if (this.progress.unlockedIngredients.includes(ingredientId)) return true;
        const config = getWorldIngredientConfig(ingredientId);
        if (!config) return false;

        if (!this.meetsIngredientCondition(config)) return false;
        if (spendMoney && !this.spendMoney(config.price)) return false;

        this.progress.unlockedIngredients.push(ingredientId);
        this.saveProgress();
        return true;
    }

    public isMapUnlocked(mapId: string): boolean {
        return this.progress.unlockedMaps.includes(mapId as WorldMapId);
    }

    public enterMap(mapId: string): boolean {
        if (!this.isMapUnlocked(mapId)) return false;
        this.progress.currentMapId = mapId as WorldMapId;
        this.syncCompatFields();
        this.saveProgress();
        return true;
    }

    public refreshMapUnlocksByMoney(save: boolean = true): void {
        let changed = false;
        WORLD_MAP_CONFIGS.forEach((config) => {
            if (this.progress.totalMoney >= config.unlockMoney && !this.progress.unlockedMaps.includes(config.mapId)) {
                this.progress.unlockedMaps.push(config.mapId);
                changed = true;
            }
        });
        if (!this.progress.unlockedMaps.includes(this.progress.currentMapId)) {
            this.progress.currentMapId = this.progress.unlockedMaps[0] || 'street';
            changed = true;
        }
        if (changed) {
            this.syncCompatFields();
            if (save) this.saveProgress();
        }
    }

    public recordOrder(npcId: string, mapId?: string): void {
        if (!npcId) return;
        const key = `${mapId || this.progress.currentMapId}:${npcId}`;
        this.progress.npcOrderStats[key] = (this.progress.npcOrderStats[key] || 0) + 1;
        this.saveProgress();
    }

    public getNpcOrderCount(npcId: string, mapId?: string): number {
        const key = `${mapId || this.progress.currentMapId}:${npcId}`;
        return this.progress.npcOrderStats[key] || 0;
    }

    // 兼容旧接口
    public unlockLocation(locationId: any, cost: number): boolean {
        const mapId = String(locationId);
        if (this.isMapUnlocked(mapId)) return true;
        if (cost > 0 && !this.spendMoney(cost)) return false;
        this.progress.unlockedMaps.push(mapId as WorldMapId);
        this.syncCompatFields();
        this.saveProgress();
        return true;
    }

    public isLocationUnlocked(locationId: any): boolean {
        return this.isMapUnlocked(String(locationId));
    }

    public enterLocation(locationId: any): boolean {
        return this.enterMap(String(locationId));
    }

    public unlockMainline(storyId: string): void {
        if (!storyId) return;
        if (!this.progress.storyState.mainlineUnlocked.includes(storyId)) {
            this.progress.storyState.mainlineUnlocked.push(storyId);
        }
        this.progress.storyFlags[storyId] = true;
        this.saveProgress();
    }

    public unlockBranch(branchId: string): void {
        if (!branchId) return;
        if (!this.progress.storyState.branchUnlocked.includes(branchId)) {
            this.progress.storyState.branchUnlocked.push(branchId);
        }
        this.progress.storyFlags[branchId] = true;
        this.saveProgress();
    }

    public canAdvanceStory(storyId: string): boolean {
        const task = WORLD_STORY_TASKS.find((item) => item.taskId === storyId);
        if (!task) return false;
        const progress = this.progress.currentDayState.taskProgress[storyId] || 0;
        return progress >= task.orderRequirements.orderCount;
    }

    public getAvailableDevices(): DeviceConfig[] {
        return WORLD_DEVICE_CONFIGS.filter((config) => this.meetsDeviceCondition(config));
    }

    public getAvailableIngredients(): IngredientFlavorConfig[] {
        return WORLD_INGREDIENT_CONFIGS.filter((config) => this.meetsIngredientCondition(config));
    }

    public getAvailableStoryTasks(lineType: StoryLineType): StoryTaskConfig[] {
        return WORLD_STORY_TASKS.filter((task) => {
            if (task.lineType !== lineType) return false;
            if (this.isStoryTaskCompleted(task.taskId)) return false;
            if (task.triggerWindow.mapId && task.triggerWindow.mapId !== this.progress.currentMapId) return false;
            if (task.triggerWindow.dayFrom && this.progress.dayIndex < task.triggerWindow.dayFrom) return false;
            if (task.triggerWindow.dayTo && this.progress.dayIndex > task.triggerWindow.dayTo) return false;
            return true;
        });
    }

    public getCurrentMapConfig() {
        return getWorldMapConfig(this.progress.currentMapId);
    }

    private bootstrap(): void {
        this.backupLegacySavesIfNeeded();
        this.loadProgress();
    }

    private backupLegacySavesIfNeeded(): void {
        if (sys.localStorage.getItem(WorldProgressManager.LEGACY_BACKUP_DONE_KEY) === '1') return;

        const legacyKeys = [
            'world_mode_v1_progress',
            'cooking_game_progress',
            'grilled_noodle_save',
            'grilled_noodle_level_state',
            'grilled_noodle_wallet',
            'grilled_noodle_daily',
            'cooking_game_save_index'
        ];

        const legacyData: Record<string, string> = {};
        legacyKeys.forEach((key) => {
            const value = sys.localStorage.getItem(key);
            if (value !== null) {
                legacyData[key] = value;
            }
        });

        if (Object.keys(legacyData).length > 0 && !sys.localStorage.getItem(WorldProgressManager.LEGACY_BACKUP_KEY)) {
            const payload = {
                backupAt: Date.now(),
                data: legacyData
            };
            sys.localStorage.setItem(WorldProgressManager.LEGACY_BACKUP_KEY, JSON.stringify(payload));
        }

        sys.localStorage.setItem(WorldProgressManager.LEGACY_BACKUP_DONE_KEY, '1');
    }

    private loadProgress(): void {
        try {
            const raw = sys.localStorage.getItem(WorldProgressManager.STORAGE_KEY);
            if (!raw) {
                this.resetProgress();
                return;
            }
            this._progress = JSON.parse(raw) as WorldProgressData;
            this.applyDefaults();
        } catch (error) {
            console.error('[WorldProgressManager] 读取进度失败，已重置', error);
            this.resetProgress();
        }
    }

    private saveProgress(): void {
        if (!this._progress) return;
        this._progress.lastSaveTime = Date.now();
        this.syncCompatFields();
        try {
            sys.localStorage.setItem(WorldProgressManager.STORAGE_KEY, JSON.stringify(this._progress));
        } catch (error) {
            console.error('[WorldProgressManager] 保存进度失败', error);
        }
    }

    private applyDefaults(): void {
        if (!this._progress) return;

        if (!this._progress.schemaVersion || this._progress.schemaVersion < WorldProgressManager.SCHEMA_VERSION) {
            this._progress.schemaVersion = WorldProgressManager.SCHEMA_VERSION;
        }
        if (typeof this._progress.totalMoney !== 'number') this._progress.totalMoney = 1000;
        if (!this._progress.currentMapId) this._progress.currentMapId = 'street';
        if (!Array.isArray(this._progress.unlockedMaps) || this._progress.unlockedMaps.length === 0) {
            this._progress.unlockedMaps = ['street'];
        }
        if (!Array.isArray(this._progress.unlockedDevices)) this._progress.unlockedDevices = [];
        if (!Array.isArray(this._progress.unlockedIngredients)) this._progress.unlockedIngredients = [];
        if (!this._progress.storyFlags) this._progress.storyFlags = {};
        if (!this._progress.npcOrderStats) this._progress.npcOrderStats = {};
        if (!this._progress.storyState) {
            this._progress.storyState = { mainlineUnlocked: [], branchUnlocked: [] };
        }
        if (!this._progress.currentDayState) {
            this._progress.currentDayState = {
                dayIndex: this._progress.dayIndex || 1,
                mainTaskId: null,
                sideTaskId: null,
                taskProgress: {},
                completedTaskIds: []
            };
        } else {
            this._progress.currentDayState.dayIndex = this._progress.currentDayState.dayIndex || (this._progress.dayIndex || 1);
            this._progress.currentDayState.taskProgress = this._progress.currentDayState.taskProgress || {};
            this._progress.currentDayState.completedTaskIds = this._progress.currentDayState.completedTaskIds || [];
        }
        if (!this._progress.dayIndex || this._progress.dayIndex < 1) this._progress.dayIndex = 1;

        this.refreshMapUnlocksByMoney(false);
        this.syncCompatFields();
        this.saveProgress();
    }

    private syncCompatFields(): void {
        if (!this._progress) return;
        this._progress.wallet = this._progress.totalMoney;
        this._progress.currentLocation = this._progress.currentMapId;
        this._progress.unlockedLocations = [...this._progress.unlockedMaps];
    }

    private meetsDeviceCondition(config: DeviceConfig): boolean {
        if (config.unlockCondition.mapId && !this.progress.unlockedMaps.includes(config.unlockCondition.mapId)) {
            return false;
        }
        if (typeof config.unlockCondition.minMoney === 'number' && this.progress.totalMoney < config.unlockCondition.minMoney) {
            return false;
        }
        return true;
    }

    private meetsIngredientCondition(config: IngredientFlavorConfig): boolean {
        if (config.unlockCondition.mapId && !this.progress.unlockedMaps.includes(config.unlockCondition.mapId)) {
            return false;
        }
        if (typeof config.unlockCondition.minMoney === 'number' && this.progress.totalMoney < config.unlockCondition.minMoney) {
            return false;
        }
        return true;
    }

    private applyTaskRewards(task: StoryTaskConfig): void {
        if (task.rewards.money && task.rewards.money > 0) {
            this.progress.totalMoney += task.rewards.money;
        }
        if (task.rewards.unlockDeviceIds?.length) {
            task.rewards.unlockDeviceIds.forEach((deviceId) => {
                if (!this.progress.unlockedDevices.includes(deviceId)) {
                    this.progress.unlockedDevices.push(deviceId);
                }
            });
        }
        if (task.rewards.unlockIngredientIds?.length) {
            task.rewards.unlockIngredientIds.forEach((ingredientId) => {
                if (!this.progress.unlockedIngredients.includes(ingredientId)) {
                    this.progress.unlockedIngredients.push(ingredientId);
                }
            });
        }
        if (task.rewards.setStoryFlags?.length) {
            task.rewards.setStoryFlags.forEach((flag) => {
                this.progress.storyFlags[flag] = true;
            });
        }
        this.refreshMapUnlocksByMoney(false);
        this.syncCompatFields();
    }
}
