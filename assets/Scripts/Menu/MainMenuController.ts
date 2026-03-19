import { _decorator, Component, Node, Label, Button, Color } from 'cc';
import { InventoryManager } from '../Manager/InventoryManager';
import { LevelManager, GamePhase } from '../Manager/LevelManager';
import { LEVEL_DATA, getLevelData } from '../Data/ShopData';
import { GameConfig } from '../Data/GameConfig';
import { SceneRouteService } from '../Manager/SceneRouteService';

const { ccclass, property } = _decorator;

/**
 * 主菜单控制器
 */
@ccclass('MainMenuController')
export class MainMenuController extends Component {
    @property(Label)
    titleLabel: Label = null;
    
    @property(Node)
    levelButtonContainer: Node = null;
    
    @property(Button)
    tutorialButton: Button = null;
    
    @property(Label)
    progressLabel: Label = null;
    
    onLoad() {
        this.setupUI();
        this.setupButtons();
    }
    
    start() {
        this.refreshDisplay();
    }
    
    private setupUI() {
        if (this.titleLabel) {
            this.titleLabel.string = '🍜 烤冷面大师';
        }
    }
    
    private setupButtons() {
        if (this.tutorialButton) {
            this.tutorialButton.node.on(Button.EventType.CLICK, this.onTutorial, this);
        }
        
        // 创建关卡按钮
        this.createLevelButtons();
    }
    
    /**
     * 创建关卡选择按钮
     */
    private createLevelButtons() {
        if (!this.levelButtonContainer) return;
        
        this.levelButtonContainer.removeAllChildren();
        
        const inventory = InventoryManager.instance;
        const unlockedLevel = inventory?.unlockedLevel ?? 1;
        
        let yOffset = 0;
        
        for (const level of LEVEL_DATA) {
            const demoLocked = GameConfig.DEMO_ONLY_LEVEL1 && level.levelId > GameConfig.DEMO_LEVEL_CAP;
            const isUnlocked = level.levelId <= unlockedLevel && !demoLocked;
            
            // 创建按钮节点
            const btnNode = new Node(`Level_${level.levelId}`);
            const btn = btnNode.addComponent(Button);
            const sprite = btnNode.addComponent('cc.Sprite');
            
            // 创建标签
            const labelNode = new Node('Label');
            const label = labelNode.addComponent(Label);
            label.string = isUnlocked ? level.levelName : `🔒 ${level.levelName}`;
            label.fontSize = 24;
            label.color = isUnlocked ? new Color(255, 255, 255, 255) : new Color(150, 150, 150, 255);
            btnNode.addChild(labelNode);
            
            // 设置位置
            btnNode.setPosition(0, -yOffset, 0);
            
            // 绑定事件
            if (isUnlocked) {
                const levelId = level.levelId;
                btnNode.on(Button.EventType.CLICK, () => this.onLevelSelect(levelId), this);
            }
            
            this.levelButtonContainer.addChild(btnNode);
            yOffset += 60;
        }
    }
    
    /**
     * 刷新显示
     */
    private refreshDisplay() {
        const inventory = InventoryManager.instance;
        
        if (this.progressLabel && inventory) {
            this.progressLabel.string = `已解锁: 第${inventory.unlockedLevel}关 | 累计收入: ${inventory.totalMoney}元`;
        }
        
        // 刷新关卡按钮状态
        this.createLevelButtons();
    }
    
    /**
     * 选择关卡
     */
    private onLevelSelect(levelId: number) {
        if (GameConfig.DEMO_ONLY_LEVEL1 && levelId > GameConfig.DEMO_LEVEL_CAP) {
            console.log('[MainMenuController] Demo仅开放第一关');
            return;
        }
        console.log(`[MainMenuController] 选择关卡 ${levelId}`);
        
        const levelManager = LevelManager.instance;
        if (levelManager) {
            levelManager.startLevel(levelId);
        } else {
            // 如果没有 LevelManager，直接初始化并跳转
            const inventory = InventoryManager.instance;
            if (inventory) {
                inventory.initLevel(levelId);
                SceneRouteService.goShop();
            }
        }
    }
    
    /**
     * 进入教程（也需要初始化关卡）
     */
    private onTutorial() {
        console.log('[MainMenuController] 进入教程/快速开始');
        
        // 初始化第1关
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.initLevel(1);
        }
        
        // 跳转到商店场景（正常流程）
        SceneRouteService.goShop();
    }
}
