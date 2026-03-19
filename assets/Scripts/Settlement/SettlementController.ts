import { _decorator, Component, Node, Label, Button, Color, tween, Vec3 } from 'cc';
import { InventoryManager } from '../Manager/InventoryManager';
import { LevelManager, GamePhase } from '../Manager/LevelManager';
import { getLevelData } from '../Data/ShopData';
import { SaveManager } from '../Manager/SaveManager';
import { SceneRouteService } from '../Manager/SceneRouteService';

const { ccclass, property } = _decorator;

/**
 * 结算界面控制器
 */
@ccclass('SettlementController')
export class SettlementController extends Component {
    @property(Label)
    titleLabel: Label = null;
    
    @property(Label)
    resultLabel: Label = null;
    
    @property(Label)
    earnedLabel: Label = null;
    
    @property(Label)
    targetLabel: Label = null;
    
    @property(Label)
    reviewLabel: Label = null;
    
    @property(Button)
    retryButton: Button = null;
    
    @property(Button)
    nextButton: Button = null;
    
    @property(Button)
    menuButton: Button = null;
    
    private isSuccess: boolean = false;
    
    onLoad() {
        this.setupButtons();
    }
    
    start() {
        this.showSettlement();
    }
    
    private setupButtons() {
        if (this.retryButton) {
            this.retryButton.node.on(Button.EventType.CLICK, this.onRetry, this);
        }
        if (this.nextButton) {
            this.nextButton.node.on(Button.EventType.CLICK, this.onNextLevel, this);
        }
        if (this.menuButton) {
            this.menuButton.node.on(Button.EventType.CLICK, this.onBackToMenu, this);
        }
    }
    
    /**
     * 显示结算结果
     */
    private showSettlement() {
        const inventory = InventoryManager.instance;
        if (!inventory || !inventory.currentLevel) {
            console.error('[SettlementController] 无法获取关卡数据');
            return;
        }
        
        const levelData = getLevelData(inventory.currentLevel.levelId);
        if (!levelData) return;
        
        const result = inventory.checkLevelComplete();
        this.isSuccess = result.success;
        
        // 标题
        if (this.titleLabel) {
            if (this.isSuccess) {
                this.titleLabel.string = '🎉 恭喜通关！';
                this.titleLabel.color = new Color(255, 215, 0, 255);
            } else {
                this.titleLabel.string = '😢 挑战失败';
                this.titleLabel.color = new Color(255, 100, 100, 255);
            }
        }
        
        // 结果说明
        if (this.resultLabel) {
            this.resultLabel.string = result.reason;
        }
        
        // 赚取金额
        if (this.earnedLabel) {
            this.earnedLabel.string = `💰 赚取: ${inventory.currentLevel.earnedMoney} 元`;
        }
        
        // 目标金额
        if (this.targetLabel) {
            this.targetLabel.string = `🎯 目标: ${levelData.targetMoney} 元`;
        }
        
        // 评价统计
        if (this.reviewLabel) {
            this.reviewLabel.string = `😢 差评: ${inventory.currentLevel.badReviewCount} / ${levelData.maxBadReviews}`;
        }
        
        // 按钮显示
        if (this.retryButton) {
            this.retryButton.node.active = !this.isSuccess;
        }
        if (this.nextButton) {
            this.nextButton.node.active = this.isSuccess;
        }
        
        // 如果成功，完成关卡
        if (this.isSuccess) {
            inventory.completeLevel();
        }
    }
    
    /**
     * 重试当前关卡
     */
    private onRetry() {
        const inventory = InventoryManager.instance;
        if (inventory && inventory.currentLevel) {
            inventory.resetLevel();
            SceneRouteService.goShop();
        }
    }
    
    /**
     * 进入下一关
     */
    private onNextLevel() {
        const inventory = InventoryManager.instance;
        
        if (inventory && inventory.currentLevel) {
            const nextLevelId = inventory.currentLevel.levelId + 1;
            inventory.initLevel(nextLevelId);
            SceneRouteService.goShop();
        }
    }
    
    /**
     * 返回主菜单
     */
    private onBackToMenu() {
        try {
            SaveManager.autoSave(SaveManager.buildCurrentSaveData());
        } catch (e) {
            console.warn('[SettlementController] ⚠️ 返回主菜单自动存档失败', e);
        }
        SceneRouteService.goMainMenu();
    }
}
