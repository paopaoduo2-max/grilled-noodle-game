import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Button, Vec3, tween, UIOpacity } from 'cc';
import { GameProgressManager, LEVEL_CONFIGS, LevelConfig } from '../Manager/GameProgressManager';
import { GameConfig } from '../Data/GameConfig';
import { SceneRouteService } from '../Manager/SceneRouteService';

const { ccclass, property } = _decorator;

/**
 * 🎮 关卡选择界面
 * 扁平化设计风格
 */
@ccclass('LevelSelectUI')
export class LevelSelectUI extends Component {
    
    @property(Node)
    levelPanel: Node = null;
    
    // 关卡卡片容器
    private levelCards: Node[] = [];
    
    // 面板尺寸
    private readonly PANEL_WIDTH = 800;
    private readonly PANEL_HEIGHT = 600;
    
    // 卡片尺寸
    private readonly CARD_WIDTH = 220;
    private readonly CARD_HEIGHT = 160;
    private readonly CARD_SPACING = 30;
    
    onLoad() {
        if (!this.levelPanel) {
            this.createLevelPanel();
        }
    }
    
    /**
     * 显示关卡选择界面
     */
    public show() {
        if (!this.levelPanel) {
            this.createLevelPanel();
        }
        this.levelPanel.active = true;
        this.updateLevelCards();
        
        // 淡入动画
        const opacity = this.levelPanel.getComponent(UIOpacity) || this.levelPanel.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.2, { opacity: 255 }).start();
    }
    
    /**
     * 隐藏关卡选择界面
     */
    public hide() {
        if (this.levelPanel) {
            const opacity = this.levelPanel.getComponent(UIOpacity);
            if (opacity) {
                tween(opacity).to(0.2, { opacity: 0 }).call(() => {
                    this.levelPanel.active = false;
                }).start();
            } else {
                this.levelPanel.active = false;
            }
        }
    }
    
    /**
     * 创建关卡选择面板
     */
    private createLevelPanel() {
        const canvas = this.node;
        
        // 创建面板容器
        this.levelPanel = new Node('LevelSelectPanel');
        this.levelPanel.addComponent(UITransform).setContentSize(this.PANEL_WIDTH, this.PANEL_HEIGHT);
        this.levelPanel.addComponent(UIOpacity);
        canvas.addChild(this.levelPanel);
        this.levelPanel.setPosition(0, 0, 0);
        
        // 半透明遮罩背景
        const mask = new Node('Mask');
        const maskTransform = mask.addComponent(UITransform);
        maskTransform.setContentSize(2000, 2000);
        const maskGraphics = mask.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 180);
        maskGraphics.rect(-1000, -1000, 2000, 2000);
        maskGraphics.fill();
        mask.addComponent(Button);
        mask.on(Node.EventType.TOUCH_END, () => this.hide());
        this.levelPanel.addChild(mask);
        
        // 主面板背景（扁平化白色圆角）
        const panelBg = new Node('PanelBg');
        const bgTransform = panelBg.addComponent(UITransform);
        bgTransform.setContentSize(this.PANEL_WIDTH, this.PANEL_HEIGHT);
        const bgGraphics = panelBg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(248, 249, 250, 255);
        bgGraphics.roundRect(-this.PANEL_WIDTH/2, -this.PANEL_HEIGHT/2, this.PANEL_WIDTH, this.PANEL_HEIGHT, 20);
        bgGraphics.fill();
        this.levelPanel.addChild(panelBg);
        
        // 标题栏
        const titleBar = new Node('TitleBar');
        const titleBarGraphics = titleBar.addComponent(Graphics);
        titleBarGraphics.fillColor = new Color(255, 255, 255, 255);
        titleBarGraphics.roundRect(-this.PANEL_WIDTH/2, 0, this.PANEL_WIDTH, 60, 0);
        titleBarGraphics.fill();
        titleBar.setPosition(0, this.PANEL_HEIGHT/2 - 30, 0);
        this.levelPanel.addChild(titleBar);
        
        // 标题文字
        const titleLabel = new Node('TitleLabel');
        const title = titleLabel.addComponent(Label);
        title.string = '选择关卡';
        title.fontSize = 24;
        title.color = new Color(33, 37, 41, 255);
        title.isBold = true;
        titleBar.addChild(titleLabel);
        
        // 关闭按钮
        const closeBtn = new Node('CloseBtn');
        const closeBtnTransform = closeBtn.addComponent(UITransform);
        closeBtnTransform.setContentSize(40, 40);
        const closeBtnGraphics = closeBtn.addComponent(Graphics);
        closeBtnGraphics.fillColor = new Color(220, 53, 69, 255);
        closeBtnGraphics.circle(0, 0, 18);
        closeBtnGraphics.fill();
        closeBtn.setPosition(this.PANEL_WIDTH/2 - 40, 0, 0);
        closeBtn.addComponent(Button);
        closeBtn.on(Node.EventType.TOUCH_END, () => this.hide());
        
        const closeLabel = new Node('CloseLabel');
        const closeText = closeLabel.addComponent(Label);
        closeText.string = '✕';
        closeText.fontSize = 18;
        closeText.color = new Color(255, 255, 255, 255);
        closeBtn.addChild(closeLabel);
        
        titleBar.addChild(closeBtn);
        
        // 创建关卡卡片
        this.createLevelCards();
        
        // 默认隐藏
        this.levelPanel.active = false;
    }
    
    /**
     * 创建关卡卡片
     */
    private createLevelCards() {
        const cardsContainer = new Node('CardsContainer');
        this.levelPanel.addChild(cardsContainer);
        cardsContainer.setPosition(0, -30, 0);
        
        // 3x2 布局
        const cols = 3;
        const rows = 2;
        const startX = -(cols - 1) * (this.CARD_WIDTH + this.CARD_SPACING) / 2;
        const startY = (rows - 1) * (this.CARD_HEIGHT + this.CARD_SPACING) / 2;
        
        for (let i = 0; i < LEVEL_CONFIGS.length; i++) {
            const config = LEVEL_CONFIGS[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            const x = startX + col * (this.CARD_WIDTH + this.CARD_SPACING);
            const y = startY - row * (this.CARD_HEIGHT + this.CARD_SPACING);
            
            const card = this.createLevelCard(config, x, y);
            cardsContainer.addChild(card);
            this.levelCards.push(card);
        }
    }
    
    /**
     * 创建单个关卡卡片
     */
    private createLevelCard(config: LevelConfig, x: number, y: number): Node {
        const card = new Node(`Level${config.levelId}Card`);
        card.setPosition(x, y, 0);
        
        const transform = card.addComponent(UITransform);
        transform.setContentSize(this.CARD_WIDTH, this.CARD_HEIGHT);
        
        // 卡片背景
        const bg = card.addComponent(Graphics);
        
        // 难度对应的颜色
        const difficultyColors = [
            new Color(40, 167, 69, 255),    // 1星 - 绿色
            new Color(23, 162, 184, 255),   // 2星 - 青色
            new Color(0, 123, 255, 255),    // 3星 - 蓝色
            new Color(255, 193, 7, 255),    // 4星 - 黄色
            new Color(253, 126, 20, 255),   // 5星 - 橙色
            new Color(220, 53, 69, 255)     // 6星 - 红色
        ];
        const accentColor = difficultyColors[config.difficulty - 1];
        
        // 绘制卡片背景
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-this.CARD_WIDTH/2, -this.CARD_HEIGHT/2, this.CARD_WIDTH, this.CARD_HEIGHT, 12);
        bg.fill();
        
        // 左侧色条
        bg.fillColor = accentColor;
        bg.roundRect(-this.CARD_WIDTH/2, -this.CARD_HEIGHT/2, 8, this.CARD_HEIGHT, 4);
        bg.fill();
        
        // 关卡编号
        const levelNum = new Node('LevelNum');
        const levelNumLabel = levelNum.addComponent(Label);
        levelNumLabel.string = `第${config.levelId}关`;
        levelNumLabel.fontSize = 14;
        levelNumLabel.color = new Color(108, 117, 125, 255);
        levelNum.setPosition(0, 50, 0);
        card.addChild(levelNum);
        
        // 关卡名称
        const levelName = new Node('LevelName');
        const levelNameLabel = levelName.addComponent(Label);
        levelNameLabel.string = config.levelName;
        levelNameLabel.fontSize = 22;
        levelNameLabel.color = new Color(33, 37, 41, 255);
        levelNameLabel.isBold = true;
        levelName.setPosition(0, 20, 0);
        card.addChild(levelName);
        
        // 难度星星
        const stars = new Node('Stars');
        const starsLabel = stars.addComponent(Label);
        starsLabel.string = '★'.repeat(config.difficulty) + '☆'.repeat(6 - config.difficulty);
        starsLabel.fontSize = 14;
        starsLabel.color = accentColor;
        stars.setPosition(0, -10, 0);
        card.addChild(stars);
        
        // 天数信息
        const daysInfo = new Node('DaysInfo');
        const daysLabel = daysInfo.addComponent(Label);
        daysLabel.string = `${config.totalDays}天`;
        daysLabel.fontSize = 12;
        daysLabel.color = new Color(108, 117, 125, 255);
        daysInfo.setPosition(0, -35, 0);
        card.addChild(daysInfo);
        
        // 解锁条件
        const unlockInfo = new Node('UnlockInfo');
        const unlockLabel = unlockInfo.addComponent(Label);
        const demoLocked = GameConfig.DEMO_ONLY_LEVEL1 && config.levelId > GameConfig.DEMO_LEVEL_CAP;
        if (demoLocked) {
            unlockLabel.string = 'Demo仅开放';
            unlockLabel.color = new Color(108, 117, 125, 255);
        } else if (config.levelId === 1) {
            unlockLabel.string = '已解锁';
            unlockLabel.color = new Color(40, 167, 69, 255);
        } else {
            unlockLabel.string = `需要 ${config.unlockMoney ?? config.initialMoney}元`;
            unlockLabel.color = new Color(108, 117, 125, 255);
        }
        unlockLabel.fontSize = 11;
        unlockInfo.setPosition(0, -55, 0);
        card.addChild(unlockInfo);
        
        // 锁定遮罩（默认显示，更新时根据状态控制）
        const lockMask = new Node('LockMask');
        const lockMaskTransform = lockMask.addComponent(UITransform);
        lockMaskTransform.setContentSize(this.CARD_WIDTH, this.CARD_HEIGHT);
        const lockMaskGraphics = lockMask.addComponent(Graphics);
        lockMaskGraphics.fillColor = new Color(0, 0, 0, 150);
        lockMaskGraphics.roundRect(-this.CARD_WIDTH/2, -this.CARD_HEIGHT/2, this.CARD_WIDTH, this.CARD_HEIGHT, 12);
        lockMaskGraphics.fill();
        
        const lockIcon = new Node('LockIcon');
        const lockIconLabel = lockIcon.addComponent(Label);
        lockIconLabel.string = '🔒';
        lockIconLabel.fontSize = 36;
        lockMask.addChild(lockIcon);
        
        card.addChild(lockMask);
        
        // 添加按钮组件
        card.addComponent(Button);
        
        // 点击效果
        card.on(Node.EventType.TOUCH_START, () => {
            tween(card).to(0.1, { scale: new Vec3(0.95, 0.95, 1) }).start();
        });
        card.on(Node.EventType.TOUCH_END, () => {
            tween(card).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
            this.onLevelCardClick(config.levelId);
        });
        card.on(Node.EventType.TOUCH_CANCEL, () => {
            tween(card).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
        });
        
        return card;
    }
    
    /**
     * 更新关卡卡片状态
     */
    private updateLevelCards() {
        const progressManager = GameProgressManager.instance;
        if (!progressManager) return;
        
        for (let i = 0; i < this.levelCards.length; i++) {
            const card = this.levelCards[i];
            const config = LEVEL_CONFIGS[i];
            const demoLocked = GameConfig.DEMO_ONLY_LEVEL1 && config.levelId > GameConfig.DEMO_LEVEL_CAP;
            const isUnlocked = progressManager.isLevelUnlocked(config.levelId) && !demoLocked;
            const isCompleted = progressManager.isLevelCompleted(config.levelId);
            
            // 更新锁定遮罩
            const lockMask = card.getChildByName('LockMask');
            if (lockMask) {
                lockMask.active = !isUnlocked;
            }
            
            // 更新解锁信息
            const unlockInfo = card.getChildByName('UnlockInfo');
            if (unlockInfo) {
                const label = unlockInfo.getComponent(Label);
                if (label) {
                    if (demoLocked) {
                        label.string = 'Demo仅开放';
                        label.color = new Color(108, 117, 125, 255);
                    } else if (isCompleted) {
                        label.string = '✓ 已通关';
                        label.color = new Color(40, 167, 69, 255);
                    } else if (isUnlocked) {
                        label.string = '可挑战';
                        label.color = new Color(0, 123, 255, 255);
                    } else {
                        label.string = `需要 ${config.unlockMoney ?? config.initialMoney}元`;
                        label.color = new Color(108, 117, 125, 255);
                    }
                }
            }
        }
    }
    
    /**
     * 关卡卡片点击事件
     */
    private onLevelCardClick(levelId: number) {
        const progressManager = GameProgressManager.instance;
        if (!progressManager) {
            console.error('[LevelSelectUI] GameProgressManager 未初始化');
            return;
        }
        
        const demoLocked = GameConfig.DEMO_ONLY_LEVEL1 && levelId > GameConfig.DEMO_LEVEL_CAP;
        if (!progressManager.isLevelUnlocked(levelId) || demoLocked) {
            console.log(`[LevelSelectUI] 关卡 ${levelId} 未解锁`);
            // TODO: 显示未解锁提示
            return;
        }
        
        // 开始关卡
        if (progressManager.startLevel(levelId)) {
            console.log(`[LevelSelectUI] 开始关卡 ${levelId}`);
            this.hide();
            
            // 切换到购物场景
            this.scheduleOnce(() => {
                SceneRouteService.goShop();
            }, 0.3);
        }
    }
}
