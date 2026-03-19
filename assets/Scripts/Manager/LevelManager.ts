import { _decorator, Component } from 'cc';
import { FeatureGate } from './FeatureGate';
import { SceneRouteService } from './SceneRouteService';
import { WorldProgressManager } from './WorldProgressManager';

const { ccclass } = _decorator;

export enum GamePhase {
    MENU = 'menu',
    SHOP = 'shop',
    PROCESSING = 'processing',
    COOKING = 'cooking',
    SETTLEMENT = 'settlement'
}

@ccclass('LevelManager')
export class LevelManager extends Component {
    private static _instance: LevelManager | null = null;
    private _currentPhase: GamePhase = GamePhase.MENU;

    public static get instance(): LevelManager | null {
        return LevelManager._instance;
    }

    onLoad(): void {
        if (LevelManager._instance && LevelManager._instance !== this) {
            this.destroy();
            return;
        }
        LevelManager._instance = this;
    }

    public startLevel(levelId: number): boolean {
        if (!FeatureGate.ENABLE_WORLD_SINGLE_FLOW) {
            this.enterPhase(GamePhase.SHOP);
            return true;
        }

        if (!FeatureGate.ENABLE_LEGACY_LEVEL_ENTRY && levelId > 1) {
            console.warn(`[LevelManager] 旧关卡入口已下线：Level${levelId}`);
            return false;
        }

        this.enterPhase(GamePhase.SHOP);
        return true;
    }

    public enterPhase(phase: GamePhase): void {
        this._currentPhase = phase;
        switch (phase) {
        case GamePhase.MENU:
            SceneRouteService.goMainMenu();
            break;
        case GamePhase.SHOP:
            SceneRouteService.goShop();
            break;
        case GamePhase.PROCESSING:
            SceneRouteService.goPrep();
            break;
        case GamePhase.COOKING:
            SceneRouteService.goBusiness();
            break;
        case GamePhase.SETTLEMENT:
            this.handleSettlement();
            break;
        default:
            break;
        }
    }

    public nextPhase(): void {
        switch (this._currentPhase) {
        case GamePhase.MENU:
            this.enterPhase(GamePhase.SHOP);
            break;
        case GamePhase.SHOP:
            this.enterPhase(GamePhase.PROCESSING);
            break;
        case GamePhase.PROCESSING:
            this.enterPhase(GamePhase.COOKING);
            break;
        case GamePhase.COOKING:
            this.enterPhase(GamePhase.SETTLEMENT);
            break;
        case GamePhase.SETTLEMENT:
            this.enterPhase(GamePhase.SHOP);
            break;
        default:
            break;
        }
    }

    public endBusiness(): void {
        this.enterPhase(GamePhase.SETTLEMENT);
    }

    public restartLevel(): void {
        this.enterPhase(GamePhase.SHOP);
    }

    public get currentPhase(): GamePhase {
        return this._currentPhase;
    }

    public get currentLevelId(): number {
        // 新架构固定单营业场景，对外保持兼容
        return 1;
    }

    private handleSettlement(): void {
        const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        world.nextDay();
        this.enterPhase(GamePhase.SHOP);
    }
}

