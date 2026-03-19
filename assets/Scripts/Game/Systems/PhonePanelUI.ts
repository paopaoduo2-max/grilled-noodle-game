import { _decorator, Node, Label, Button, Color, tween, Vec3, UITransform, Graphics, director, sys } from 'cc';
import { TimeManager } from '../../Manager/TimeManager';
import { InventoryManager } from '../../Manager/InventoryManager';
import { SaveManager } from '../../Manager/SaveManager';
import { SceneRouteService } from '../../Manager/SceneRouteService';

const { ccclass } = _decorator;

/**
 * 手机面板数据接口 - 用于从主控制器获取数据
 */
export interface PhonePanelDataProvider {
    // 评价数据
    getSuperGoodReviews(): number;
    getGoodReviews(): number;
    getBadReviews(): number;
    getAverageScore(): number;
    getAllScoresCount(): number;
    getReviewHistory(): Array<{type: 'super' | 'good' | 'bad', text: string, score: number, timestamp: number}>;
    
    // 店铺数据
    getShopHeat(): number;
    getShopHeatLevel(): { emoji: string, level: string };
    getTotalMoney(): number;
    
    // 消息数据
    getEventMessages(): Array<{id: string, sender: string, senderIcon: string, content: string, time: string, eventId?: string, isRead: boolean}>;
    
    // 回调方法
    onResetGame(): void;
    updateMoneyDisplay(): void;
    updateReviewDisplay(): void;
}

/**
 * 📱 手机面板UI系统
 * 负责手机面板的所有UI创建和交互
 */
@ccclass('PhonePanelUI')
export class PhonePanelUI {
    private phonePanel: Node = null;
    private dataProvider: PhonePanelDataProvider = null;
    
    // 手机面板布局配置
    private readonly PHONE_CONFIG = {
        background: {
            width: 405,
            height: 720,
            color: new Color(255, 255, 255, 255),
            positionY: 0
        },
        item: {
            height: 100,
            spacing: 12,
            startY: 220
        }
    };
    
    // 设置状态
    private settingsLanguage: string = 'zh';
    private settingsBGMVolume: number = 50;
    private settingsSFXVolume: number = 80;
    
    constructor(phonePanel: Node, dataProvider: PhonePanelDataProvider) {
        this.phonePanel = phonePanel;
        this.dataProvider = dataProvider;
    }
    
    /**
     * 初始化手机面板
     */
    public init() {
        if (!this.phonePanel) {
            console.warn('[PhonePanelUI] 手机面板节点未设置');
            return;
        }
        
        console.log('[PhonePanelUI] 📱 === 开始初始化手机面板 ===');
        this.phonePanel.removeAllChildren();
        this.phonePanel.setSiblingIndex(9999);
        
        this.setupBackground();
        console.log('[PhonePanelUI] 📱 背景已创建');
        this.setupTitle();
        console.log('[PhonePanelUI] 📱 标题栏已创建');
        this.setupMainScreen();
        console.log('[PhonePanelUI] 📱 主界面已创建');
        this.setupReviewScreen();
        this.setupMessageScreen();
        this.setupSettingsScreen();
        this.setupRestartScreen();
        this.setupCloseButton();
        this.ensureOverlayOrder();
        
        // 确保主界面默认显示
        const mainScreen = this.phonePanel.getChildByName('MainScreen');
        if (mainScreen) {
            mainScreen.active = true;
            console.log('[PhonePanelUI] 📱 主界面已激活');
        }
        
        console.log('[PhonePanelUI] 📱 === 手机面板初始化完成，子节点数:', this.phonePanel.children.length, '===');
    }

    private ensureOverlayOrder() {
        const statusBar = this.phonePanel.getChildByName('StatusBar');
        const closeButton = this.phonePanel.getChildByName('CloseButton');
        let index = this.phonePanel.children.length - 1;
        if (statusBar) {
            statusBar.setSiblingIndex(Math.max(0, index));
            index -= 1;
        }
        if (closeButton && closeButton !== statusBar) {
            closeButton.setSiblingIndex(Math.max(0, index));
        }
    }
    
    /**
     * 显示指定界面
     */
    public showScreen(screenName: string) {
        if (!this.phonePanel) return;
        
        const screens = ['MainScreen', 'ReviewScreen', 'SettingsScreen', 'MessageScreen', 'RestartScreen'];
        screens.forEach(name => {
            const screen = this.phonePanel.getChildByName(name);
            if (screen) screen.active = false;
        });
        
        const targetScreen = this.phonePanel.getChildByName(screenName.charAt(0).toUpperCase() + screenName.slice(1) + 'Screen');
        if (targetScreen) {
            targetScreen.active = true;
            
            // 根据界面类型更新内容
            if (screenName === 'review') this.updateReviewContent();
            else if (screenName === 'settings') this.updateSettingsContent();
            else if (screenName === 'message') this.updateMessageContent();
        }
        this.ensureOverlayOrder();
    }
    
    /**
     * 更新主界面数据
     */
    public updateMainScreenData() {
        if (!this.phonePanel) return;
        
        const mainScreen = this.phonePanel.getChildByName('MainScreen');
        if (!mainScreen) return;
        
        const statusBar = mainScreen.getChildByName('StatusBar');
        if (statusBar) {
            // 更新热度
            const heatDisplay = statusBar.getChildByName('ShopHeatDisplay');
            if (heatDisplay) {
                const heatLevel = this.dataProvider.getShopHeatLevel();
                const iconNode = heatDisplay.getChildByName('Icon');
                if (iconNode) {
                    const iconLabel = iconNode.getComponent(Label);
                    if (iconLabel) iconLabel.string = heatLevel.emoji;
                }
                const valueNode = heatDisplay.getChildByName('Value');
                if (valueNode) {
                    const valueLabel = valueNode.getComponent(Label);
                    if (valueLabel) valueLabel.string = `${this.dataProvider.getShopHeat()}%`;
                }
            }
            
            // 更新钱包
            const moneyDisplay = statusBar.getChildByName('MoneyDisplay');
            if (moneyDisplay) {
                const valueNode = moneyDisplay.getChildByName('Value');
                if (valueNode) {
                    const valueLabel = valueNode.getComponent(Label);
                    if (valueLabel) {
                        const inventory = InventoryManager.instance;
                        const walletBalance = inventory ? inventory.globalWallet : 1000;
                        valueLabel.string = `${walletBalance}元`;
                    }
                }
            }
        }
        
        // 更新评分卡片
        const cardArea = mainScreen.getChildByName('CardArea');
        if (cardArea) {
            const reviewCard = cardArea.getChildByName('ReviewCard');
            if (reviewCard) {
                const subtitle = reviewCard.getChildByName('Subtitle');
                if (subtitle) {
                    const label = subtitle.getComponent(Label);
                    if (label) {
                        const count = this.dataProvider.getAllScoresCount();
                        label.string = count > 0 ? `总评分 ${this.dataProvider.getAverageScore().toFixed(1)}分` : '暂无评分';
                    }
                }
            }
        }
    }
    
    /**
     * 更新时间显示
     */
    public updateTimeDisplay() {
        if (!this.phonePanel || !this.phonePanel.active) return;
        
        const statusBar = this.phonePanel.getChildByName('StatusBar');
        if (statusBar) {
            const timeLabel = statusBar.getChildByName('TimeLabel');
            if (timeLabel) {
                const label = timeLabel.getComponent(Label);
                if (label) {
                    const timeManager = TimeManager.instance;
                    if (timeManager) {
                        const hours = timeManager.getCurrentHour();
                        const minutes = timeManager.getCurrentMinute();
                        label.string = `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`;
                    }
                }
            }
        }
    }
    
    /**
     * 更新消息徽章
     */
    public updateMessageBadge() {
        const messages = this.dataProvider.getEventMessages();
        const unreadCount = messages.filter(m => !m.isRead).length;
        
        const mainScreen = this.phonePanel?.getChildByName('MainScreen');
        if (!mainScreen) return;
        
        const cardArea = mainScreen.getChildByName('CardArea');
        if (!cardArea) return;
        
        const messageCard = cardArea.getChildByName('MessageCard');
        if (!messageCard) return;
        
        let badge = messageCard.getChildByName('Badge');
        if (unreadCount > 0) {
            if (!badge) {
                badge = new Node('Badge');
                messageCard.addChild(badge);
                badge.setPosition(60, 30, 0);
                const badgeGraphics = badge.addComponent(Graphics);
                badgeGraphics.fillColor = new Color(255, 59, 48, 255);
                badgeGraphics.circle(0, 0, 10);
                badgeGraphics.fill();
                
                const badgeLabel = new Node('BadgeLabel');
                badge.addChild(badgeLabel);
                const label = badgeLabel.addComponent(Label);
                label.fontSize = 10;
                label.color = new Color(255, 255, 255, 255);
            }
            const badgeLabel = badge.getChildByName('BadgeLabel')?.getComponent(Label);
            if (badgeLabel) {
                badgeLabel.string = unreadCount > 9 ? '9+' : `${unreadCount}`;
            }
            badge.active = true;
        } else if (badge) {
            badge.active = false;
        }
    }
    
    // ==================== 私有方法：UI创建 ====================
    
    private setupBackground() {
        const cfg = this.PHONE_CONFIG.background;
        const bgNode = new Node('PhoneBackground');
        const graphics = bgNode.addComponent(Graphics);
        
        graphics.fillColor = cfg.color;
        graphics.rect(-cfg.width / 2, -cfg.height / 2, cfg.width, cfg.height);
        graphics.fill();
        
        bgNode.setPosition(0, cfg.positionY, 0);
        this.phonePanel.addChild(bgNode);
        bgNode.setSiblingIndex(0);
        
        const phoneTransform = this.phonePanel.getComponent(UITransform);
        if (phoneTransform) {
            phoneTransform.setContentSize(cfg.width, cfg.height);
        }
    }
    
    private setupTitle() {
        const bgWidth = this.PHONE_CONFIG.background.width;
        const statusBarHeight = 44;
        
        const statusBar = new Node('StatusBar');
        statusBar.setPosition(0, 320, 0);
        this.phonePanel.addChild(statusBar);
        statusBar.setSiblingIndex(1);
        
        // 状态栏背景
        const bgNode = new Node('StatusBarBg');
        const bgGraphics = bgNode.addComponent(Graphics);
        bgGraphics.fillColor = new Color(255, 255, 255, 255);
        bgGraphics.rect(-bgWidth / 2, -statusBarHeight / 2, bgWidth, statusBarHeight);
        bgGraphics.fill();
        statusBar.addChild(bgNode);
        
        // 时间
        const timeLabel = new Node('TimeLabel');
        const timeLabelComp = timeLabel.addComponent(Label);
        const timeManager = TimeManager.instance;
        let timeStr = '06:00';
        if (timeManager) {
            const gameHours = timeManager.getCurrentHour();
            const gameMinutes = timeManager.getCurrentMinute();
            timeStr = `${gameHours < 10 ? '0' + gameHours : gameHours}:${gameMinutes < 10 ? '0' + gameMinutes : gameMinutes}`;
        }
        timeLabelComp.string = timeStr;
        timeLabelComp.fontSize = 16;
        timeLabelComp.color = new Color(0, 0, 0, 255);
        timeLabelComp.isBold = true;
        timeLabel.setPosition(-bgWidth / 2 + 30, 0, 0);
        statusBar.addChild(timeLabel);
        
        // 信号图标
        const signalNode = new Node('SignalIcon');
        const signalGraphics = signalNode.addComponent(Graphics);
        signalGraphics.fillColor = new Color(0, 0, 0, 255);
        for (let i = 0; i < 4; i++) {
            const barHeight = 13 - i * 3;
            signalGraphics.rect(-30 + i * 5, -barHeight / 2, 3, barHeight);
        }
        signalGraphics.fill();
        signalNode.setPosition(bgWidth / 2 - 80, 0, 0);
        statusBar.addChild(signalNode);
        
        // 电量图标
        const batteryNode = new Node('BatteryIcon');
        const batteryGraphics = batteryNode.addComponent(Graphics);
        batteryGraphics.strokeColor = new Color(0, 0, 0, 255);
        batteryGraphics.lineWidth = 1.5;
        batteryGraphics.roundRect(-12, -5, 22, 10, 2);
        batteryGraphics.stroke();
        batteryGraphics.fillColor = new Color(0, 0, 0, 255);
        batteryGraphics.rect(10, -3, 3, 6);
        batteryGraphics.fill();
        batteryGraphics.fillColor = new Color(52, 199, 89, 255);
        batteryGraphics.roundRect(-10, -3, 16, 6, 1);
        batteryGraphics.fill();
        batteryNode.setPosition(bgWidth / 2 - 35, 0, 0);
        statusBar.addChild(batteryNode);
        
        // 电量百分比
        const batteryLabel = new Node('BatteryLabel');
        const batteryLabelComp = batteryLabel.addComponent(Label);
        batteryLabelComp.string = '80%';
        batteryLabelComp.fontSize = 12;
        batteryLabelComp.color = new Color(0, 0, 0, 255);
        batteryLabel.setPosition(bgWidth / 2 - 70, 0, 0);
        statusBar.addChild(batteryLabel);
    }
    
    private setupCloseButton() {
        const closeBtn = new Node('CloseButton');
        const graphics = closeBtn.addComponent(Graphics);
        
        graphics.fillColor = new Color(142, 142, 147, 255);
        graphics.circle(0, 0, 22);
        graphics.fill();
        
        closeBtn.setPosition(0, -320, 0);
        this.phonePanel.addChild(closeBtn);
        closeBtn.setSiblingIndex(3);
        
        const closeLabel = new Node('CloseLabel');
        const label = closeLabel.addComponent(Label);
        label.string = '✕';
        label.fontSize = 18;
        label.color = new Color(255, 255, 255, 255);
        label.isBold = true;
        closeBtn.addChild(closeLabel);
        
        closeBtn.addComponent(Button);
        closeBtn.on(Node.EventType.TOUCH_END, () => {
            if (this.phonePanel) {
                this.phonePanel.active = false;
                const timeManager = TimeManager.instance;
                if (timeManager) {
                    timeManager.resumeTime();
                }
            }
        });
    }
    
    private setupMainScreen() {
        const mainScreen = new Node('MainScreen');
        const mainTransform = mainScreen.addComponent(UITransform);
        mainTransform.setContentSize(this.PHONE_CONFIG.background.width, this.PHONE_CONFIG.background.height);
        mainScreen.active = false;
        
        // 主界面背景
        const screenBg = new Node('ScreenBg');
        const screenBgGraphics = screenBg.addComponent(Graphics);
        screenBgGraphics.fillColor = new Color(242, 242, 247, 255);
        screenBgGraphics.roundRect(-this.PHONE_CONFIG.background.width / 2, -this.PHONE_CONFIG.background.height / 2, 
            this.PHONE_CONFIG.background.width, this.PHONE_CONFIG.background.height, 20);
        screenBgGraphics.fill();
        mainScreen.addChild(screenBg);
        
        const cardArea = new Node('CardArea');
        cardArea.setPosition(0, -70, 0);
        mainScreen.addChild(cardArea);
        
        const gridSpacingX = 180;
        const gridSpacingY = 105;
        const gridStartY = 260;
        
        // 第一行
        const scoreText = this.dataProvider.getAllScoresCount() > 0 ? `${this.dataProvider.getAverageScore().toFixed(1)}分` : '暂无';
        const reviewCard = this.createGridCard('⭐', '好评管理', scoreText, -gridSpacingX/2, gridStartY, () => this.showScreen('review'));
        reviewCard.name = 'ReviewCard';
        cardArea.addChild(reviewCard);
        
        const messageCard = this.createGridCard('💬', '消息中心', '查看消息', gridSpacingX/2, gridStartY, () => this.showScreen('message'));
        messageCard.name = 'MessageCard';
        cardArea.addChild(messageCard);
        
        // 第二行
        const restartCard = this.createGridCard('🔄', '重新开始', '新游戏', -gridSpacingX/2, gridStartY - gridSpacingY, () => this.showScreen('restart'));
        cardArea.addChild(restartCard);
        
        const settingsCard = this.createGridCard('⚙️', '游戏设置', '调整参数', gridSpacingX/2, gridStartY - gridSpacingY, () => this.showScreen('settings'));
        cardArea.addChild(settingsCard);
        
        // 第三行
        const saveCard = this.createGridCard('💾', '存档', '保存进度', -gridSpacingX/2, gridStartY - gridSpacingY * 2, () => this.onSaveClick());
        cardArea.addChild(saveCard);
        
        const exitCard = this.createGridCard('🏠', '返回标题', '退出游戏', gridSpacingX/2, gridStartY - gridSpacingY * 2, () => this.onExitClick());
        cardArea.addChild(exitCard);
        
        // 底部状态栏
        const statusBar = new Node('StatusBar');
        mainScreen.addChild(statusBar);
        
        const heatLevel = this.dataProvider.getShopHeatLevel();
        const heatDisplay = this.createStatusDisplay(heatLevel.emoji, '热度', `${this.dataProvider.getShopHeat()}%`, -gridSpacingX/2, -200);
        heatDisplay.name = 'ShopHeatDisplay';
        statusBar.addChild(heatDisplay);
        
        const inventory = InventoryManager.instance;
        const walletBalance = inventory ? inventory.globalWallet : 1000;
        const moneyDisplay = this.createStatusDisplay('💰', '钱包', `${walletBalance}元`, gridSpacingX/2, -200);
        moneyDisplay.name = 'MoneyDisplay';
        statusBar.addChild(moneyDisplay);
        
        this.phonePanel.addChild(mainScreen);
    }
    
    private createGridCard(icon: string, title: string, subtitle: string, x: number, y: number, callback?: () => void): Node {
        const card = new Node(`${title}Card`);
        card.setPosition(x, y, 0);
        
        const cardWidth = 160;
        const cardHeight = 85;
        
        const transform = card.addComponent(UITransform);
        transform.setContentSize(cardWidth, cardHeight);
        
        const bg = card.addComponent(Graphics);
        bg.fillColor = new Color(0, 0, 0, 6);
        bg.roundRect(-cardWidth/2 + 4, -cardHeight/2 - 4, cardWidth, cardHeight, 16);
        bg.fill();
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 14);
        bg.fill();
        bg.strokeColor = new Color(226, 232, 240, 255);
        bg.lineWidth = 1;
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 14);
        bg.stroke();
        
        const iconNode = new Node('Icon');
        card.addChild(iconNode);
        iconNode.setPosition(0, 18, 0);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = icon;
        iconLabel.fontSize = 28;
        
        const titleNode = new Node('Title');
        card.addChild(titleNode);
        titleNode.setPosition(0, -12, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 14;
        titleLabel.color = new Color(30, 41, 59, 255);
        titleLabel.isBold = true;
        
        const subtitleNode = new Node('Subtitle');
        card.addChild(subtitleNode);
        subtitleNode.setPosition(0, -30, 0);
        const subtitleLabel = subtitleNode.addComponent(Label);
        subtitleLabel.string = subtitle;
        subtitleLabel.fontSize = 11;
        subtitleLabel.color = new Color(100, 116, 139, 255);
        
        // 添加Button组件以支持点击事件
        card.addComponent(Button);
        
        if (callback) {
            card.on(Node.EventType.TOUCH_START, () => {
                tween(card).to(0.08, { scale: new Vec3(0.96, 0.96, 1) }).start();
            });
            card.on(Node.EventType.TOUCH_END, () => {
                tween(card).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
                callback();
            });
            card.on(Node.EventType.TOUCH_CANCEL, () => {
                tween(card).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            });
        }
        
        return card;
    }
    
    private createStatusDisplay(icon: string, title: string, value: string, x: number, y: number): Node {
        const display = new Node('StatusDisplay');
        display.setPosition(x, y, 0);
        
        const transform = display.addComponent(UITransform);
        transform.setContentSize(160, 70);
        
        const bg = display.addComponent(Graphics);
        bg.fillColor = new Color(0, 0, 0, 10);
        bg.roundRect(-78, -37, 160, 70, 12);
        bg.fill();
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-80, -35, 160, 70, 12);
        bg.fill();
        bg.strokeColor = new Color(226, 232, 240, 255);
        bg.lineWidth = 1;
        bg.roundRect(-80, -35, 160, 70, 12);
        bg.stroke();
        
        const iconNode = new Node('Icon');
        display.addChild(iconNode);
        iconNode.setPosition(-50, 0, 0);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = icon;
        iconLabel.fontSize = 24;
        
        const titleNode = new Node('Title');
        display.addChild(titleNode);
        titleNode.setPosition(20, 12, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 12;
        titleLabel.color = new Color(100, 116, 139, 255);
        
        const valueNode = new Node('Value');
        display.addChild(valueNode);
        valueNode.setPosition(20, -12, 0);
        const valueLabel = valueNode.addComponent(Label);
        valueLabel.string = value;
        valueLabel.fontSize = 16;
        valueLabel.color = new Color(30, 41, 59, 255);
        valueLabel.isBold = true;
        
        return display;
    }
    
    // ==================== 评价界面 ====================
    
    private setupReviewScreen() {
        const reviewScreen = new Node('ReviewScreen');
        reviewScreen.addComponent(UITransform).setContentSize(this.PHONE_CONFIG.background.width, this.PHONE_CONFIG.background.height);
        reviewScreen.active = false;
        const bgWidth = this.PHONE_CONFIG.background.width;
        const bgHeight = this.PHONE_CONFIG.background.height;
        
        // 背景
        const screenBg = new Node('ScreenBg');
        const screenBgGraphics = screenBg.addComponent(Graphics);
        screenBgGraphics.fillColor = new Color(242, 242, 247, 255);
        screenBgGraphics.roundRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 20);
        screenBgGraphics.fill();
        reviewScreen.addChild(screenBg);
        
        // 标题栏
        this.addTitleBar(reviewScreen, '顾客评价', () => this.showScreen('main'));
        
        // 评分总览
        const scoreOverview = this.createScoreOverview();
        scoreOverview.setPosition(0, 200, 0);
        reviewScreen.addChild(scoreOverview);
        
        // 评价列表
        const reviewList = new Node('ReviewList');
        reviewList.setPosition(0, -20, 0);
        reviewScreen.addChild(reviewList);
        
        this.phonePanel.addChild(reviewScreen);
        reviewScreen.setSiblingIndex(2);
    }
    
    private createScoreOverview(): Node {
        const bgWidth = this.PHONE_CONFIG.background.width;
        const scoreOverview = new Node('ScoreOverview');
        
        const scoreOverviewBg = new Node('ScoreOverviewBg');
        const scoreOverviewGraphics = scoreOverviewBg.addComponent(Graphics);
        scoreOverviewGraphics.fillColor = new Color(255, 255, 255, 255);
        scoreOverviewGraphics.roundRect(-bgWidth / 2 + 10, -40, bgWidth - 20, 80, 10);
        scoreOverviewGraphics.fill();
        scoreOverview.addChild(scoreOverviewBg);
        
        const displayScore = this.dataProvider.getAllScoresCount() > 0 ? this.dataProvider.getAverageScore().toFixed(1) : '-';
        const totalScoreLabel = new Node('TotalScore');
        const totalScoreComp = totalScoreLabel.addComponent(Label);
        totalScoreComp.string = displayScore;
        totalScoreComp.fontSize = 40;
        totalScoreComp.color = new Color(255, 149, 0, 255);
        totalScoreComp.isBold = true;
        totalScoreLabel.setPosition(-bgWidth / 2 + 60, 0, 0);
        scoreOverview.addChild(totalScoreLabel);
        
        const scoreText = new Node('ScoreText');
        const scoreTextComp = scoreText.addComponent(Label);
        scoreTextComp.string = this.dataProvider.getAllScoresCount() > 0 ? `平均分 (${this.dataProvider.getAllScoresCount()}单)` : '暂无评分';
        scoreTextComp.fontSize = 12;
        scoreTextComp.color = new Color(142, 142, 147, 255);
        scoreText.setPosition(-bgWidth / 2 + 60, -25, 0);
        scoreOverview.addChild(scoreText);
        
        const totalReviews = this.dataProvider.getSuperGoodReviews() + this.dataProvider.getGoodReviews() + this.dataProvider.getBadReviews();
        const statsText = new Node('StatsText');
        const statsTextComp = statsText.addComponent(Label);
        statsTextComp.string = `共${totalReviews}条评价`;
        statsTextComp.fontSize = 14;
        statsTextComp.color = new Color(0, 0, 0, 255);
        statsText.setPosition(50, 10, 0);
        scoreOverview.addChild(statsText);
        
        const categoryStats = new Node('CategoryStats');
        const categoryText = categoryStats.addComponent(Label);
        categoryText.string = `好评${this.dataProvider.getSuperGoodReviews() + this.dataProvider.getGoodReviews()} | 差评${this.dataProvider.getBadReviews()}`;
        categoryText.fontSize = 12;
        categoryText.color = new Color(142, 142, 147, 255);
        categoryStats.setPosition(50, -10, 0);
        scoreOverview.addChild(categoryStats);
        
        return scoreOverview;
    }
    
    private updateReviewContent() {
        const reviewScreen = this.phonePanel?.getChildByName('ReviewScreen');
        if (!reviewScreen) return;
        
        const reviewList = reviewScreen.getChildByName('ReviewList');
        if (!reviewList) return;
        
        reviewList.removeAllChildren();
        
        const reviews = this.dataProvider.getReviewHistory().slice(0, 5);
        
        if (reviews.length === 0) {
            const emptyCard = this.createEmptyStateCard('📝', '暂无顾客评价', '完成订单后将收到顾客评价');
            emptyCard.setPosition(0, 20, 0);
            reviewList.addChild(emptyCard);
        } else {
            reviews.forEach((review, index) => {
                const reviewItem = this.createReviewItem(review, index);
                reviewItem.setPosition(0, 100 - index * 70, 0);
                reviewList.addChild(reviewItem);
            });
        }
    }
    
    private createReviewItem(review: {type: 'super' | 'good' | 'bad', text: string, timestamp: number}, index: number): Node {
        const item = new Node(`ReviewItem${index}`);
        const itemWidth = this.PHONE_CONFIG.background.width - 30;
        const itemHeight = 60;
        
        const bg = new Node('Background');
        const bgGraphics = bg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(255, 255, 255, 255);
        bgGraphics.roundRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, 8);
        bgGraphics.fill();
        bgGraphics.strokeColor = new Color(240, 240, 240, 255);
        bgGraphics.lineWidth = 1;
        bgGraphics.roundRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, 8);
        bgGraphics.stroke();
        item.addChild(bg);
        
        let icon = '😊', typeName = '好评', typeColor = new Color(52, 199, 89, 255);
        if (review.type === 'super') { icon = '😍'; typeName = '超赞'; typeColor = new Color(255, 149, 0, 255); }
        else if (review.type === 'bad') { icon = '😞'; typeName = '差评'; typeColor = new Color(255, 59, 48, 255); }
        
        const iconNode = new Node('Icon');
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = icon;
        iconLabel.fontSize = 24;
        iconNode.setPosition(-itemWidth / 2 + 25, 5, 0);
        item.addChild(iconNode);
        
        const typeNode = new Node('Type');
        const typeLabel = typeNode.addComponent(Label);
        typeLabel.string = typeName;
        typeLabel.fontSize = 12;
        typeLabel.color = typeColor;
        typeLabel.isBold = true;
        typeNode.setPosition(-itemWidth / 2 + 25, -15, 0);
        item.addChild(typeNode);
        
        const contentNode = new Node('Content');
        const contentLabel = contentNode.addComponent(Label);
        contentLabel.string = review.text.length > 15 ? review.text.substring(0, 15) + '...' : review.text;
        contentLabel.fontSize = 14;
        contentLabel.color = new Color(0, 0, 0, 255);
        contentNode.setPosition(20, 5, 0);
        item.addChild(contentNode);
        
        const timeNode = new Node('Time');
        const timeLabel = timeNode.addComponent(Label);
        const date = new Date(review.timestamp);
        const hours = date.getHours();
        const minutes = date.getMinutes();
        timeLabel.string = `${hours < 10 ? '0' + hours : hours}:${minutes < 10 ? '0' + minutes : minutes}`;
        timeLabel.fontSize = 11;
        timeLabel.color = new Color(142, 142, 147, 255);
        timeNode.setPosition(20, -15, 0);
        item.addChild(timeNode);
        
        return item;
    }
    
    // ==================== 消息界面 ====================
    
    private setupMessageScreen() {
        const messageScreen = new Node('MessageScreen');
        messageScreen.addComponent(UITransform).setContentSize(this.PHONE_CONFIG.background.width, this.PHONE_CONFIG.background.height);
        messageScreen.active = false;
        const bgWidth = this.PHONE_CONFIG.background.width;
        const bgHeight = this.PHONE_CONFIG.background.height;
        
        const screenBg = new Node('ScreenBg');
        const screenBgGraphics = screenBg.addComponent(Graphics);
        screenBgGraphics.fillColor = new Color(242, 242, 247, 255);
        screenBgGraphics.roundRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 20);
        screenBgGraphics.fill();
        messageScreen.addChild(screenBg);
        
        this.addTitleBar(messageScreen, '消息中心', () => this.showScreen('main'));
        
        const messageList = new Node('MessageList');
        messageScreen.addChild(messageList);
        
        this.phonePanel.addChild(messageScreen);
        messageScreen.setSiblingIndex(2);
    }
    
    private updateMessageContent() {
        const messageScreen = this.phonePanel?.getChildByName('MessageScreen');
        if (!messageScreen) return;
        
        const messageList = messageScreen.getChildByName('MessageList');
        if (!messageList) return;
        
        messageList.removeAllChildren();
        
        const messages = this.dataProvider.getEventMessages();
        
        if (messages.length === 0) {
            const emptyCard = this.createEmptyStateCard('💬', '暂无消息', '处理事件后会收到相关消息');
            emptyCard.setPosition(0, 20, 0);
            messageList.addChild(emptyCard);
        } else {
            const itemHeight = 80;
            let yPos = 200;
            for (let i = 0; i < Math.min(messages.length, 8); i++) {
                const msgItem = this.createMessageItem(messages[i], i);
                msgItem.setPosition(0, yPos - i * itemHeight, 0);
                messageList.addChild(msgItem);
            }
        }
    }
    
    private createMessageItem(msg: {sender: string, senderIcon: string, content: string, time: string, isRead: boolean}, index: number): Node {
        const item = new Node(`MsgItem${index}`);
        const itemWidth = this.PHONE_CONFIG.background.width - 30;
        const itemHeight = 70;
        
        item.addComponent(UITransform).setContentSize(itemWidth, itemHeight);
        
        const bg = item.addComponent(Graphics);
        bg.fillColor = msg.isRead ? new Color(255, 255, 255, 255) : new Color(240, 248, 255, 255);
        bg.roundRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, 10);
        bg.fill();
        bg.strokeColor = new Color(230, 230, 235, 255);
        bg.lineWidth = 1;
        bg.roundRect(-itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, 10);
        bg.stroke();
        
        const iconNode = new Node('Icon');
        item.addChild(iconNode);
        iconNode.setPosition(-itemWidth / 2 + 30, 0, 0);
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = msg.senderIcon;
        iconLabel.fontSize = 28;
        
        const senderNode = new Node('Sender');
        item.addChild(senderNode);
        senderNode.setPosition(-itemWidth / 2 + 80, 15, 0);
        const senderLabel = senderNode.addComponent(Label);
        senderLabel.string = msg.sender;
        senderLabel.fontSize = 14;
        senderLabel.color = new Color(30, 30, 40, 255);
        senderLabel.isBold = true;
        senderNode.addComponent(UITransform).anchorX = 0;
        
        const timeNode = new Node('Time');
        item.addChild(timeNode);
        timeNode.setPosition(itemWidth / 2 - 40, 15, 0);
        const timeLabel = timeNode.addComponent(Label);
        timeLabel.string = msg.time;
        timeLabel.fontSize = 11;
        timeLabel.color = new Color(142, 142, 147, 255);
        
        const contentNode = new Node('Content');
        item.addChild(contentNode);
        contentNode.setPosition(-itemWidth / 2 + 80, -10, 0);
        const contentLabel = contentNode.addComponent(Label);
        contentLabel.string = msg.content.length > 25 ? msg.content.substring(0, 25) + '...' : msg.content;
        contentLabel.fontSize = 12;
        contentLabel.color = new Color(100, 100, 110, 255);
        contentNode.addComponent(UITransform).anchorX = 0;
        
        if (!msg.isRead) {
            const unreadDot = new Node('UnreadDot');
            item.addChild(unreadDot);
            unreadDot.setPosition(itemWidth / 2 - 15, 0, 0);
            const dotGraphics = unreadDot.addComponent(Graphics);
            dotGraphics.fillColor = new Color(255, 59, 48, 255);
            dotGraphics.circle(0, 0, 5);
            dotGraphics.fill();
        }
        
        return item;
    }
    
    // ==================== 设置界面 ====================
    
    private setupSettingsScreen() {
        const settingsScreen = new Node('SettingsScreen');
        settingsScreen.addComponent(UITransform).setContentSize(this.PHONE_CONFIG.background.width, this.PHONE_CONFIG.background.height);
        settingsScreen.active = false;
        const bgWidth = this.PHONE_CONFIG.background.width;
        const bgHeight = this.PHONE_CONFIG.background.height;
        
        const screenBg = new Node('ScreenBg');
        const screenBgGraphics = screenBg.addComponent(Graphics);
        screenBgGraphics.fillColor = new Color(242, 242, 247, 255);
        screenBgGraphics.roundRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 20);
        screenBgGraphics.fill();
        settingsScreen.addChild(screenBg);
        
        this.addTitleBar(settingsScreen, '游戏设置', () => this.showScreen('main'));
        
        // 简单的设置提示
        const tipLabel = new Node('TipLabel');
        const tip = tipLabel.addComponent(Label);
        tip.string = '设置功能开发中...';
        tip.fontSize = 16;
        tip.color = new Color(142, 142, 147, 255);
        tipLabel.setPosition(0, 0, 0);
        settingsScreen.addChild(tipLabel);
        
        this.phonePanel.addChild(settingsScreen);
        settingsScreen.setSiblingIndex(2);
    }
    
    private updateSettingsContent() {
        // 设置内容更新逻辑
    }
    
    // ==================== 重新开始界面 ====================
    
    private setupRestartScreen() {
        const restartScreen = new Node('RestartScreen');
        restartScreen.addComponent(UITransform).setContentSize(this.PHONE_CONFIG.background.width, this.PHONE_CONFIG.background.height);
        restartScreen.active = false;
        const bgWidth = this.PHONE_CONFIG.background.width;
        const bgHeight = this.PHONE_CONFIG.background.height;
        
        const screenBg = new Node('ScreenBg');
        const screenBgGraphics = screenBg.addComponent(Graphics);
        screenBgGraphics.fillColor = new Color(242, 242, 247, 255);
        screenBgGraphics.roundRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 20);
        screenBgGraphics.fill();
        restartScreen.addChild(screenBg);
        
        this.addTitleBar(restartScreen, '重新开始', () => this.showScreen('main'));
        
        const contentArea = new Node('ContentArea');
        
        const descLabel = new Node('DescLabel');
        const desc = descLabel.addComponent(Label);
        desc.string = '选择要开始的阶段';
        desc.fontSize = 14;
        desc.color = new Color(142, 142, 147, 255);
        descLabel.setPosition(0, 180, 0);
        contentArea.addChild(descLabel);
        
        const shopCard = this.createRestartOptionCard('🛒', '购买阶段', '回到商店选购食材', new Color(52, 199, 89, 255), 0, 80);
        shopCard.on(Node.EventType.TOUCH_END, () => this.restartFromPhase('shop'));
        contentArea.addChild(shopCard);
        
        const cookingCard = this.createRestartOptionCard('🍳', '制作阶段', '重新开始制作煎饼', new Color(0, 122, 255, 255), 0, -20);
        cookingCard.on(Node.EventType.TOUCH_END, () => this.restartFromPhase('cooking'));
        contentArea.addChild(cookingCard);
        
        restartScreen.addChild(contentArea);
        
        this.phonePanel.addChild(restartScreen);
        restartScreen.setSiblingIndex(2);
    }
    
    private createRestartOptionCard(icon: string, title: string, subtitle: string, accentColor: Color, x: number, y: number): Node {
        const card = new Node('RestartCard');
        card.setPosition(x, y, 0);
        
        const cardWidth = 320;
        const cardHeight = 80;
        
        card.addComponent(UITransform).setContentSize(cardWidth, cardHeight);
        
        const bg = card.addComponent(Graphics);
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 16);
        bg.fill();
        bg.strokeColor = new Color(220, 220, 230, 255);
        bg.lineWidth = 1;
        bg.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 16);
        bg.stroke();
        
        // 左侧色条
        const colorBar = new Node('ColorBar');
        const colorBarGraphics = colorBar.addComponent(Graphics);
        colorBarGraphics.fillColor = accentColor;
        colorBarGraphics.roundRect(-cardWidth/2, -cardHeight/2, 6, cardHeight, 3);
        colorBarGraphics.fill();
        card.addChild(colorBar);
        
        const iconNode = new Node('Icon');
        card.addChild(iconNode);
        iconNode.setPosition(-cardWidth/2 + 45, 0, 0);
        iconNode.addComponent(Label).string = icon;
        iconNode.getComponent(Label).fontSize = 32;
        
        const titleNode = new Node('Title');
        card.addChild(titleNode);
        titleNode.setPosition(-cardWidth/2 + 120, 12, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 16;
        titleLabel.color = new Color(30, 30, 40, 255);
        titleLabel.isBold = true;
        const titleTransform = titleNode.getComponent(UITransform) || titleNode.addComponent(UITransform);
        titleTransform.anchorX = 0;
        
        const subtitleNode = new Node('Subtitle');
        card.addChild(subtitleNode);
        subtitleNode.setPosition(-cardWidth/2 + 120, -12, 0);
        const subtitleLabel = subtitleNode.addComponent(Label);
        subtitleLabel.string = subtitle;
        subtitleLabel.fontSize = 12;
        subtitleLabel.color = new Color(120, 120, 130, 255);
        const subtitleTransform = subtitleNode.getComponent(UITransform) || subtitleNode.addComponent(UITransform);
        subtitleTransform.anchorX = 0;
        
        const arrowNode = new Node('Arrow');
        card.addChild(arrowNode);
        arrowNode.setPosition(cardWidth/2 - 25, 0, 0);
        const arrowLabel = arrowNode.addComponent(Label);
        arrowLabel.string = '›';
        arrowLabel.fontSize = 24;
        arrowLabel.color = new Color(180, 180, 190, 255);
        
        card.on(Node.EventType.TOUCH_START, () => {
            tween(card).to(0.1, { scale: new Vec3(0.98, 0.98, 1) }).start();
        });
        card.on(Node.EventType.TOUCH_CANCEL, () => {
            tween(card).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
        });
        
        return card;
    }
    
    private restartFromPhase(phase: 'shop' | 'cooking') {
        if (this.phonePanel) {
            this.phonePanel.active = false;
        }
        
        if (phase === 'shop') {
            SceneRouteService.goShop();
        } else {
            this.dataProvider.onResetGame();
        }
    }
    
    // ==================== 辅助方法 ====================
    
    private addTitleBar(screen: Node, title: string, onBack: () => void) {
        const bgWidth = this.PHONE_CONFIG.background.width;
        
        const titleBar = new Node('TitleBar');
        const titleBg = new Node('TitleBg');
        const titleBgGraphics = titleBg.addComponent(Graphics);
        titleBgGraphics.fillColor = new Color(255, 255, 255, 255);
        titleBgGraphics.rect(-bgWidth / 2, -25, bgWidth, 50);
        titleBgGraphics.fill();
        titleBar.addChild(titleBg);
        
        const backBtn = new Node('BackBtn');
        const backLabel = backBtn.addComponent(Label);
        backLabel.string = '‹ 返回';
        backLabel.fontSize = 16;
        backLabel.color = new Color(0, 122, 255, 255);
        backBtn.setPosition(-bgWidth / 2 + 40, 0, 0);
        backBtn.addComponent(Button);
        backBtn.on(Node.EventType.TOUCH_END, onBack);
        titleBar.addChild(backBtn);
        
        const titleLabel = new Node('Title');
        const titleComp = titleLabel.addComponent(Label);
        titleComp.string = title;
        titleComp.fontSize = 18;
        titleComp.color = new Color(0, 0, 0, 255);
        titleComp.isBold = true;
        titleBar.addChild(titleLabel);
        
        titleBar.setPosition(0, 280, 0);
        screen.addChild(titleBar);
    }
    
    private createEmptyStateCard(icon: string, title: string, subtitle: string): Node {
        const emptyCard = new Node('EmptyCard');
        
        const emptyCardBg = new Node('EmptyCardBg');
        const emptyCardGraphics = emptyCardBg.addComponent(Graphics);
        emptyCardGraphics.fillColor = new Color(255, 255, 255, 255);
        emptyCardGraphics.roundRect(-150, -80, 300, 160, 12);
        emptyCardGraphics.fill();
        emptyCard.addChild(emptyCardBg);
        
        const emptyIcon = new Node('EmptyIcon');
        const emptyIconLabel = emptyIcon.addComponent(Label);
        emptyIconLabel.string = icon;
        emptyIconLabel.fontSize = 48;
        emptyIcon.setPosition(0, 30, 0);
        emptyCard.addChild(emptyIcon);
        
        const emptyTip = new Node('EmptyTip');
        const emptyLabel = emptyTip.addComponent(Label);
        emptyLabel.string = title;
        emptyLabel.fontSize = 16;
        emptyLabel.color = new Color(0, 0, 0, 255);
        emptyLabel.isBold = true;
        emptyTip.setPosition(0, -20, 0);
        emptyCard.addChild(emptyTip);
        
        const emptySubtip = new Node('EmptySubtip');
        const emptySubLabel = emptySubtip.addComponent(Label);
        emptySubLabel.string = subtitle;
        emptySubLabel.fontSize = 12;
        emptySubLabel.color = new Color(142, 142, 147, 255);
        emptySubtip.setPosition(0, -45, 0);
        emptyCard.addChild(emptySubtip);
        
        return emptyCard;
    }
    
    private onSaveClick() {
        const saveData = {
            totalMoney: this.dataProvider.getTotalMoney(),
            superGoodReviews: this.dataProvider.getSuperGoodReviews(),
            goodReviews: this.dataProvider.getGoodReviews(),
            badReviews: this.dataProvider.getBadReviews()
        };
        
        const saveName = `手动存档 - ${new Date().toLocaleString('zh-CN')}`;
        const saveId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        try {
            sys.localStorage.setItem('cooking_game_save_manual_' + saveId, JSON.stringify({
                saveId, saveName, timestamp: Date.now(), ...saveData
            }));
            
            const indexStr = sys.localStorage.getItem('cooking_game_save_index') || '{"auto":[],"manual":[]}';
            const index = JSON.parse(indexStr);
            index.manual.unshift(saveId);
            sys.localStorage.setItem('cooking_game_save_index', JSON.stringify(index));
            
            this.showSaveSuccess();
        } catch (e) {
            console.error('[PhonePanelUI] 存档失败:', e);
        }
    }
    
    private showSaveSuccess() {
        const toast = new Node('SaveToast');
        toast.addComponent(UITransform).setContentSize(200, 50);
        const toastBg = toast.addComponent(Graphics);
        toastBg.fillColor = new Color(40, 167, 69, 230);
        toastBg.roundRect(-100, -25, 200, 50, 10);
        toastBg.fill();
        
        const toastLabel = new Node('Label');
        const label = toastLabel.addComponent(Label);
        label.string = '✓ 存档成功';
        label.fontSize = 18;
        label.color = new Color(255, 255, 255, 255);
        toast.addChild(toastLabel);
        
        toast.setPosition(0, 100, 0);
        this.phonePanel.addChild(toast);
        
        tween(toast).delay(1.5).to(0.3, { scale: new Vec3(0, 0, 1) }).call(() => toast.destroy()).start();
    }
    
    private onExitClick() {
        this.showExitConfirmPanel();
    }
    
    private showExitConfirmPanel() {
        const confirmPanel = new Node('ExitConfirmPanel');
        confirmPanel.addComponent(UITransform).setContentSize(300, 180);
        this.phonePanel.addChild(confirmPanel);
        confirmPanel.setPosition(0, 50, 0);
        
        const bg = confirmPanel.addComponent(Graphics);
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-150, -90, 300, 180, 16);
        bg.fill();
        bg.strokeColor = new Color(200, 200, 200, 255);
        bg.lineWidth = 1;
        bg.roundRect(-150, -90, 300, 180, 16);
        bg.stroke();
        
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '返回标题';
        titleLabel.fontSize = 18;
        titleLabel.color = new Color(33, 37, 41, 255);
        titleLabel.isBold = true;
        titleNode.setPosition(0, 55, 0);
        confirmPanel.addChild(titleNode);
        
        const msgNode = new Node('Message');
        const msgLabel = msgNode.addComponent(Label);
        msgLabel.string = '确定要返回主菜单吗？\n未保存的进度将丢失';
        msgLabel.fontSize = 14;
        msgLabel.color = new Color(108, 117, 125, 255);
        msgLabel.lineHeight = 22;
        msgNode.setPosition(0, 10, 0);
        confirmPanel.addChild(msgNode);
        
        const cancelBtn = new Node('CancelBtn');
        cancelBtn.addComponent(UITransform).setContentSize(100, 40);
        const cancelBg = cancelBtn.addComponent(Graphics);
        cancelBg.fillColor = new Color(233, 236, 239, 255);
        cancelBg.roundRect(-50, -20, 100, 40, 8);
        cancelBg.fill();
        const cancelLabel = new Node('Label');
        cancelLabel.addComponent(Label).string = '取消';
        cancelLabel.getComponent(Label).fontSize = 14;
        cancelLabel.getComponent(Label).color = new Color(73, 80, 87, 255);
        cancelBtn.addChild(cancelLabel);
        cancelBtn.setPosition(-60, -50, 0);
        cancelBtn.addComponent(Button);
        cancelBtn.on(Node.EventType.TOUCH_END, () => confirmPanel.destroy());
        confirmPanel.addChild(cancelBtn);
        
        const confirmBtn = new Node('ConfirmBtn');
        confirmBtn.addComponent(UITransform).setContentSize(100, 40);
        const confirmBg = confirmBtn.addComponent(Graphics);
        confirmBg.fillColor = new Color(220, 53, 69, 255);
        confirmBg.roundRect(-50, -20, 100, 40, 8);
        confirmBg.fill();
        const confirmLabel = new Node('Label');
        confirmLabel.addComponent(Label).string = '确定';
        confirmLabel.getComponent(Label).fontSize = 14;
        confirmLabel.getComponent(Label).color = new Color(255, 255, 255, 255);
        confirmBtn.addChild(confirmLabel);
        confirmBtn.setPosition(60, -50, 0);
        confirmBtn.addComponent(Button);
        confirmBtn.on(Node.EventType.TOUCH_END, () => {
            confirmPanel.destroy();
            try {
                SaveManager.autoSave(SaveManager.buildCurrentSaveData());
            } catch (e) {
                console.warn('[PhonePanelUI] ⚠️ 返回主菜单自动存档失败', e);
            }
            SceneRouteService.goMainMenu();
        });
        confirmPanel.addChild(confirmBtn);
    }
}
