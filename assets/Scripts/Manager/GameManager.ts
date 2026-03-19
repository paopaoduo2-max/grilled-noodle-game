import { _decorator, Component, director, sys, input, Camera, Director, assetManager, game, Game } from 'cc';
import { GameConfig, GamePhase, LevelData, IngredientData, IngredientType } from '../Data/GameConfig';
import { CameraManager } from './CameraManager';
import { SHOP_ITEMS, RICE_BUNDLE_SHOP_ITEMS, GUO_BAO_ROU_SHOP_ITEMS, MALATANG_SHOP_ITEMS, ShopItemData } from '../Data/ShopData';
import { SaveManager } from './SaveManager';
import { LogManager } from '../Utils/LogManager';
import { DisplayManager } from '../Utils/DisplayManager';
import { SceneRouteService } from './SceneRouteService';
import { FeatureGate } from './FeatureGate';
const { ccclass, property } = _decorator;

/**
 * 游戏管理器 - 单例模式
 * 负责管理游戏整体流程、数据存储、场景切换等
 */
@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager = null;
    private _pointerPatchAttempts: number = 0;

    // 当前游戏状态
    private _currentLevel: LevelData = null;           // 当前关卡
    private _currentPhase: GamePhase = GamePhase.PREPARE;  // 当前阶段
    private _playerMoney: number = 0;                  // 玩家金币
    private _ingredients: Map<IngredientType, number> = new Map();  // 食材库存
    private _completedCustomers: number = 0;           // 完成的客户数
    private _totalScore: number = 0;                   // 总评分

    // 游戏统计
    private _sessionStats = {
        ordersCompleted: 0,
        ordersTimeout: 0,
        totalEarned: 0,
        totalSpent: 0
    };
    
    // 教程控制
    private _skipTutorial: boolean = false;  // 是否跳过教程

    public static get Instance(): GameManager {
        return this._instance;
    }

    onLoad() {
        if (GameManager._instance === null) {
            GameManager._instance = this;
            LogManager.init();
            DisplayManager.init();
            const scene = director.getScene();
            if (scene && this.node.parent !== scene) {
                this.node.removeFromParent();
                scene.addChild(this.node);
            }
            if (this.node.parent === scene) {
                director.addPersistRootNode(this.node);
            }
            this.patchPointerDispatcher();
            this.initGame();
            director.on(Director.EVENT_AFTER_SCENE_LAUNCH, this.ensureLevelForScene, this);
            this.ensureLevelForScene();
            game.on(Game.EVENT_HIDE, this.onAppPause, this);
        } else {
            this.node.destroy();
        }
    }

    private ensureLevelForScene() {
        if (this._currentLevel) return;
        const sceneName = director.getScene()?.name || '';
        const match = sceneName.match(/Level(\d+)/i);
        if (!match) return;
        const levelId = parseInt(match[1], 10);
        const level = GameConfig.LEVELS.find(l => l.levelId === levelId);
        if (!level) return;
        this._currentLevel = level;
        this._playerMoney = level.initialMoney;
    }

    private patchPointerDispatcher() {
        const inputAny = input as any;
        const dispatcher = inputAny._pointerEventDispatcher || inputAny._eventDispatcher || inputAny._touchDispatcher;
        if (!dispatcher) {
            if (this._pointerPatchAttempts < 10) {
                this._pointerPatchAttempts++;
                this.scheduleOnce(() => this.patchPointerDispatcher(), 0);
            }
            return;
        }
        const target = dispatcher?.constructor?.prototype || dispatcher;
        if (!target || target.__patchedSort) return;
        const original = target._sortPointerEventProcessorList;
        if (typeof original !== 'function') return;
        target._sortPointerEventProcessorList = function () {
            if (!this._isListDirty) return;
            const list = this._pointerEventProcessorList || [];
            for (let i = list.length - 1; i >= 0; i--) {
                const processor = list[i];
                if (!processor) continue;
                const node = processor.node;
                if (node && node._uiProps) {
                    const trans = node._getUITransformComp ? node._getUITransformComp() : null;
                    processor.cachedCameraPriority = trans ? trans.cameraPriority : 0;
                }
            }
            list.sort(this._sortByPriority);
            this._isListDirty = false;
        };
        target.__patchedSort = true;
    }

    /**
     * 初始化游戏
     */
    private initGame() {
        console.log('[GameManager] 游戏初始化');
        this.loadGameData();
    }

    /**
     * 加载游戏数据
     */
    private loadGameData() {
        // 从本地存储加载数据
        const savedData = sys.localStorage.getItem('dongbei_cooking_game_data');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                // TODO: 加载关卡解锁状态等
                console.log('[GameManager] 加载存档数据', data);
            } catch (e) {
                console.error('[GameManager] 加载存档失败', e);
            }
        }
    }

    /**
     * 保存游戏数据
     */
    public saveGameData() {
        const data = {
            levels: GameConfig.LEVELS,
            // 可以添加更多需要保存的数据
        };
        sys.localStorage.setItem('dongbei_cooking_game_data', JSON.stringify(data));
        console.log('[GameManager] 游戏数据已保存');
    }

    onDestroy() {
        if (GameManager._instance === this) {
            director.off(Director.EVENT_AFTER_SCENE_LAUNCH, this.ensureLevelForScene, this);
            game.off(Game.EVENT_HIDE, this.onAppPause, this);
            GameManager._instance = null;
        }
    }

    private autoSaveNow(reason: string) {
        try {
            SaveManager.autoSave(SaveManager.buildCurrentSaveData());
            console.log(`[GameManager] 💾 自动存档(${reason})完成`);
        } catch (e) {
            console.warn('[GameManager] ⚠️ 自动存档失败', e);
        }
    }

    private onAppPause() {
        this.autoSaveNow('app_pause');
    }

    /**
     * 开始关卡
     * @param levelId 关卡ID
     * @param skipTutorial 是否跳过教程（继续游戏时为true）
     */
    public startLevel(levelId: number, skipTutorial: boolean = false) {
        if (FeatureGate.ENABLE_WORLD_SINGLE_FLOW && !FeatureGate.ENABLE_LEGACY_LEVEL_ENTRY && levelId > 1) {
            console.warn(`[GameManager] 旧关卡入口已下线: Level${levelId}`);
            return;
        }

        this._currentLevel = GameConfig.LEVELS.find(l => l.levelId === levelId);
        if (!this._currentLevel) {
            console.error('[GameManager] 关卡不存在:', levelId);
            return;
        }

        if (!this._currentLevel.unlocked) {
            console.warn('[GameManager] 关卡未解锁:', levelId);
            return;
        }
        
        // 设置教程跳过标志
        this._skipTutorial = skipTutorial;
        console.log('[GameManager] 开始关卡:', this._currentLevel.levelName, '跳过教程:', skipTutorial);
        
        // 初始化关卡数据
        this._playerMoney = this._currentLevel.initialMoney;
        this._completedCustomers = 0;
        this._totalScore = 0;
        this._ingredients.clear();
        this._sessionStats = {
            ordersCompleted: 0,
            ordersTimeout: 0,
            totalEarned: 0,
            totalSpent: 0
        };

        // 进入准备阶段
        this.enterPreparePhase();
    }

    /**
     * 进入准备阶段
     */
    public enterPreparePhase() {
        this._currentPhase = GamePhase.PREPARE;
        console.log('[GameManager] 进入准备阶段');

        if (FeatureGate.ENABLE_WORLD_SINGLE_FLOW) {
            SceneRouteService.goPrep();
            return;
        }

        const cameraManager = CameraManager.getInstance();
        if (cameraManager) {
            cameraManager.switchToPrepare();
        } else {
            console.warn('[GameManager] CameraManager不存在，回退到场景切换');
            SceneRouteService.goPrep();
        }
    }

    /**
     * 进入制作阶段
     * 从关卡配置读取场景名称
     */
    public enterCookingPhase() {
        this._currentPhase = GamePhase.COOKING;
        console.log('[GameManager] 进入制作阶段');

        if (FeatureGate.ENABLE_WORLD_SINGLE_FLOW) {
            SceneRouteService.goBusiness();
            return;
        }

        // 🆕 从关卡配置读取场景名称
        const levelConfig = GameConfig.LEVELS.find(l => l.levelId === this._currentLevel.levelId);
        const sceneName = levelConfig?.sceneName || SceneRouteService.SCENES.business;

        console.log(`[GameManager] 关卡 ${this._currentLevel?.levelId} -> 加载场景: ${sceneName}`);

        // 🆕 Level2及以上关卡UI布局独立，不使用CameraManager
        if (this._currentLevel?.levelId >= 2) {
            director.loadScene(sceneName);
            return;
        }

        // Level1使用CameraManager（如果有）
        const cameraManager = CameraManager.getInstance();
        if (cameraManager) {
            cameraManager.switchToCooking();
        } else {
            console.warn('[GameManager] CameraManager不存在，回退到场景切换');
            director.loadScene(sceneName);
        }
    }

    /**
     * 进入结算阶段
     */
    public enterResultPhase() {
        this._currentPhase = GamePhase.RESULT;
        console.log('[GameManager] 进入结算阶段');
        this.calculateResult();
        
        const cameraManager = CameraManager.getInstance();
        if (cameraManager) {
            cameraManager.switchToResult();
        } else {
            console.warn('[GameManager] CameraManager不存在，回退到场景切换');
            const mainBundle = assetManager.main;
            const hasResultScene = !!mainBundle?.getSceneInfo('ResultScene');
            if (!hasResultScene) {
                console.warn('[GameManager] ResultScene未加入构建列表，预览模式跳过切换');
                return;
            }
            director.loadScene('ResultScene');
        }
    }

    /**
     * 购买食材
     */
    public buyIngredient(type: IngredientType, count: number): boolean {
        const ingredientConfig = GameConfig.INGREDIENTS_CONFIG[type];
        if (!ingredientConfig) {
            console.error('[GameManager] 食材配置不存在:', type);
            return false;
        }

        const totalCost = ingredientConfig.price * count;
        if (this._playerMoney < totalCost) {
            console.warn('[GameManager] 金币不足，需要:', totalCost, '当前:', this._playerMoney);
            return false;
        }

        // 扣除金币
        this._playerMoney -= totalCost;
        this._sessionStats.totalSpent += totalCost;

        // 增加食材
        const currentCount = this._ingredients.get(type) || 0;
        this._ingredients.set(type, currentCount + count);

        console.log(`[GameManager] 购买食材: ${ingredientConfig.name} x${count}, 花费: ${totalCost}`);
        return true;
    }

    /**
     * 使用食材
     */
    public useIngredient(type: IngredientType, count: number): boolean {
        const currentCount = this._ingredients.get(type) || 0;
        if (currentCount < count) {
            console.warn('[GameManager] 食材不足:', type, '需要:', count, '当前:', currentCount);
            return false;
        }

        this._ingredients.set(type, currentCount - count);
        return true;
    }

    /**
     * 完成订单
     */
    public completeOrder(earnMoney: number, score: number) {
        this._playerMoney += earnMoney;
        this._completedCustomers++;
        this._totalScore += score;
        this._sessionStats.ordersCompleted++;
        this._sessionStats.totalEarned += earnMoney;

        console.log(`[GameManager] 订单完成! 赚取: ${earnMoney}, 评分: ${score}`);
    }

    /**
     * 增加或减少金币
     */
    public addMoney(amount: number) {
        this._playerMoney += amount;
        if (amount < 0) {
            this._sessionStats.totalSpent += Math.abs(amount);
        } else {
            this._sessionStats.totalEarned += amount;
        }
        console.log(`[GameManager] 金币变化: ${amount}, 当前: ${this._playerMoney}`);
    }

    /**
     * 订单超时
     */
    public orderTimeout() {
        this._sessionStats.ordersTimeout++;
        console.log('[GameManager] 订单超时!');
    }

    /**
     * 计算结算结果
     */
    private calculateResult() {
        const isPassed = this._playerMoney >= this._currentLevel.targetMoney &&
                        this._completedCustomers >= this._currentLevel.targetCustomers;

        console.log('[GameManager] 关卡结算:');
        console.log('- 是否通过:', isPassed);
        console.log('- 金币:', this._playerMoney, '/', this._currentLevel.targetMoney);
        console.log('- 客户数:', this._completedCustomers, '/', this._currentLevel.targetCustomers);
        console.log('- 总评分:', this._totalScore);
        console.log('- 完成订单:', this._sessionStats.ordersCompleted);
        console.log('- 超时订单:', this._sessionStats.ordersTimeout);

        if (isPassed) {
            // 解锁下一关
            if (this._currentLevel.levelId < GameConfig.LEVELS.length) {
                GameConfig.LEVELS[this._currentLevel.levelId].unlocked = true;
                this.saveGameData();
            }
        }
    }

    /**
     * 返回主菜单
     */
    public returnToMenu() {
        console.log('[GameManager] 返回主菜单');
        this.autoSaveNow('return_menu');
        
        const cameraManager = CameraManager.getInstance();
        if (cameraManager) {
            cameraManager.switchToMenu();
        } else {
            console.warn('[GameManager] CameraManager不存在，回退到场景切换');
            SceneRouteService.goMainMenu();
        }
    }

    // ============ 教程模式控制 ============
    private _isTutorialMode: boolean = false;
    
    /**
     * 设置教程模式
     * @param enabled 是否启用教程模式
     */
    public setTutorialMode(enabled: boolean) {
        this._isTutorialMode = enabled;
        this._skipTutorial = !enabled;
        console.log(`[GameManager] 教程模式: ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 获取是否为教程模式
     */
    public get isTutorialMode(): boolean {
        return this._isTutorialMode;
    }

    // ============ Getters ============
    public get currentLevel(): LevelData { return this._currentLevel; }
    public get currentPhase(): GamePhase { return this._currentPhase; }
    public get playerMoney(): number { return this._playerMoney; }
    public get completedCustomers(): number { return this._completedCustomers; }
    public get totalScore(): number { return this._totalScore; }
    public get sessionStats() { return { ...this._sessionStats }; }
    public get skipTutorial(): boolean { return this._skipTutorial; }

    /**
     * 获取食材数量
     */
    public getIngredientCount(type: IngredientType): number {
        return this._ingredients.get(type) || 0;
    }

    /**
     * 检查是否有足够的食材制作菜品
     */
    public hasEnoughIngredients(recipeId: string): boolean {
        const recipe = this._currentLevel.recipes.find(r => r.id === recipeId);
        if (!recipe) return false;

        for (const ingredient of recipe.ingredients) {
            const currentCount = this.getIngredientCount(ingredient.type);
            if (currentCount < ingredient.count) {
                return false;
            }
        }
        return true;
    }

    // ============ 第二关支持 ============

    /**
     * 获取当前关卡的商店商品列表
     */
    public getShopItems(): ShopItemData[] {
        if (!this._currentLevel) return SHOP_ITEMS;

        // 🆕 优先使用关卡专属配置
        if (this._currentLevel.shopItems) {
            // 如果是字符串标记，返回对应的商品列表
            if (typeof this._currentLevel.shopItems === 'string') {
                if (this._currentLevel.shopItems === 'RICE_BUNDLE_SHOP_ITEMS') {
                    return RICE_BUNDLE_SHOP_ITEMS;
                }
                if (this._currentLevel.shopItems === 'GUO_BAO_ROU_SHOP_ITEMS') {
                    return GUO_BAO_ROU_SHOP_ITEMS;
                }
                if (this._currentLevel.shopItems === 'MALATANG_SHOP_ITEMS') {
                    return MALATANG_SHOP_ITEMS;
                }
            }
            // 如果是数组，直接返回
            else if (Array.isArray(this._currentLevel.shopItems)) {
                return this._currentLevel.shopItems;
            }
        }

        // 默认商品列表
        return SHOP_ITEMS;
    }

    /**
     * 获取当前关卡的烹饪控制器名称
     * 从关卡配置读取
     */
    public getCookingControllerName(): string {
        if (!this._currentLevel) return 'CookingController';

        // 🆕 从关卡配置读取控制器名称
        const levelConfig = GameConfig.LEVELS.find(l => l.levelId === this._currentLevel.levelId);
        if (levelConfig && levelConfig.controllerName) {
            return levelConfig.controllerName;
        }

        return 'CookingController';
    }

    /**
     * 检查是否需要加工阶段
     */
    public requiresProcessing(): boolean {
        if (!this._currentLevel) return false;

        const levelConfig = GameConfig.LEVELS.find(l => l.levelId === this._currentLevel.levelId);
        return levelConfig?.requiresProcessing || false;
    }

    /**
     * 获取当前关卡的加工配置
     */
    public getProcessingConfig(): any | null {
        if (!this._currentLevel) return null;

        const levelConfig = GameConfig.LEVELS.find(l => l.levelId === this._currentLevel.levelId);
        return levelConfig?.processingConfig || null;
    }

}
