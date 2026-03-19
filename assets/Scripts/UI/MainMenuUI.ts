import { _decorator, Component, Node, Label, Button, Color, UITransform, Sprite, SpriteFrame, ScrollView, Layout, UIOpacity, tween, Vec3, sys, game, Slider, director, resources, Widget, Graphics, ScrollBar, Mask, view, screen } from 'cc';
import { GameManager } from '../Manager/GameManager';
import { GameConfig, LevelData } from '../Data/GameConfig';
import { SaveManager, SaveData } from '../Manager/SaveManager';
import { InventoryManager } from '../Manager/InventoryManager';
import { UIColors, UIFonts } from '../Config/UIStyleConfig';
import { MainMenuAssets } from '../Config/UIAssetConfig';
import { GradientBackground } from './GradientBackground';
import { GameProgressManager, LEVEL_CONFIGS } from '../Manager/GameProgressManager';
import { DisplayManager, DisplayResolution } from '../Utils/DisplayManager';
import { SceneRouteService } from '../Manager/SceneRouteService';
import { WorldProgressManager } from '../Manager/WorldProgressManager';
import { FeatureGate } from '../Manager/FeatureGate';
const { ccclass, property } = _decorator;

/**
 * 主菜单UI控制器
 * 重构版：移除LevelPanel，增加设置和存档功能
 */
@ccclass('MainMenuUI')
export class MainMenuUI extends Component {
    // UI元素引用
    @property(Label)
    titleLabel: Label = null;
    
    @property(Button)
    startBtn: Button = null;
    
    @property(Button)
    continueBtn: Button = null;
    
    @property(Button)
    loadSaveBtn: Button = null;
    
    @property(Button)
    settingsBtn: Button = null;
    
    @property(Button)
    quitBtn: Button = null;
    
    // 语言面板
    @property(Node)
    settingsPanel: Node = null;
    
    @property(Node)
    saveListPanel: Node = null;
    
    @property(Node)
    saveListContent: Node = null;

    private _screenWidth: number = 1280;
    private _screenHeight: number = 720;
    private mainMenuNodes: Node[] = [];
    private currentLanguage: 'zh' | 'en' = 'zh';
    private readonly languageStorageKey = 'main_menu_language';
    private readonly languageActiveColor = new Color(228, 228, 228, 255);
    private readonly languageInactiveColor = new Color(255, 255, 255, 255);
    private languageZhBtn: Button = null;
    private languageEnBtn: Button = null;
    private languageZhBg: Sprite = null;
    private languageEnBg: Sprite = null;
    
    // 音量控制
    private bgmSlider: Slider = null;
    private sfxSlider: Slider = null;
    private bgmValueLabel: Label = null;
    private sfxValueLabel: Label = null;
    private bgmVolume: number = 0.5;
    private sfxVolume: number = 0.8;
    private readonly volumeStorageKey = 'game_volume_settings';
    private mainMenuRoot: Node | null = null;
    private overlayRoot: Node | null = null;
    private mainTitleArtNode: Node | null = null;
    private subTitleArtNode: Node | null = null;
    private readonly resolutionOptions: DisplayResolution[] = [
        { width: 1280, height: 720 },
        { width: 1600, height: 900 },
        { width: 1920, height: 1080 }
    ];

    onLoad() {
        console.log('[MainMenuUI] onLoad开始');
        
        // 🔥 重置状态标记（每次进入主菜单时重置）
        this.isLoadingScene = false;
        this.isNewGame = false;
        
        // 获取屏幕尺寸
        const canvas = this.node as any;
        if (canvas.parent && canvas.parent.getComponent(UITransform)) {
            const canvasTransform = canvas.parent.getComponent(UITransform);
            this._screenWidth = canvasTransform.width;
            this._screenHeight = canvasTransform.height;
        }
        
        console.log('[MainMenuUI] 节点查找完成');
        // 先加载偏好设置，再初始化UI
        this.loadLanguagePreference();
        this.loadVolumeSettings();
        this.resolveSceneReferences();
        this.initUI();
        this.initBackground();  // 初始化背景
        this.setupButtons();
        this.cacheMainMenuNodes();
        this.initLanguagePanel();
        this.initVolumePanel();
        this.updateLanguageVisuals();
        this.applyLanguageTexts();
        this.updateContinueButton();
    }
    
    /**
     * 初始化背景（Canvas适配 + 渐变效果）
     */
    private initBackground() {
        const bgParent = this.findNodeByPaths(['MainMenuRoot/BackgroundRoot']) ?? this.node;
        if (!bgParent) return;
        
        let bgNode = this.findNodeByPaths(['MainMenuRoot/BackgroundRoot/Background', 'Background']);
        if (!bgNode) {
            // 创建背景节点
            bgNode = new Node('Background');
            bgParent.addChild(bgNode);
        }
        
        // 确保背景在最底层
        bgNode.setSiblingIndex(0);
        
        // 添加Widget组件实现Canvas适配
        let widget = bgNode.getComponent(Widget);
        if (!widget) {
            widget = bgNode.addComponent(Widget);
        }
        
        // 设置Widget适配所有边缘
        widget.isAlignTop = true;
        widget.isAlignBottom = true;
        widget.isAlignLeft = true;
        widget.isAlignRight = true;
        widget.top = 0;
        widget.bottom = 0;
        widget.left = 0;
        widget.right = 0;
        
        // 检查是否要使用图片背景
        const bgConfig = MainMenuAssets.background;
        
        if (bgConfig.useAnimation && bgConfig.frames.length > 0) {
            // 动态背景
            this.loadAnimatedBackground(bgNode, bgConfig.frames, bgConfig.frameRate);
        } else if (bgConfig.static) {
            // 静态背景
            this.loadStaticBackground(bgNode, bgConfig.static);
        } else {
            // 使用渐变背景
            this.createGradientBackground(bgNode);
        }
        
        console.log('[MainMenuUI] 背景初始化完成（Canvas适配）');
    }
    
    /**
     * 创建渐变背景
     */
    private createGradientBackground(bgNode: Node) {
        // 移除可能存在的Sprite组件
        const existingSprite = bgNode.getComponent(Sprite);
        if (existingSprite) {
            bgNode.removeComponent(existingSprite);
        }
        
        // 添加渐变背景组件
        let gradientBg = bgNode.getComponent(GradientBackground);
        if (!gradientBg) {
            gradientBg = bgNode.addComponent(GradientBackground);
        }
        
        // 设置美食主题渐变色
        gradientBg.topColor = UIColors.gradientTop;
        gradientBg.bottomColor = UIColors.gradientBottom;
        gradientBg.enableAnimation = true;
        
        console.log('[MainMenuUI] ✅ 渐变背景已创建');
    }
    
    /**
     * 加载静态背景
     */
    private loadStaticBackground(bgNode: Node, imagePath: string) {
        resources.load(imagePath + '/spriteFrame', SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.log(`[MainMenuUI] 背景图未找到，使用默认颜色: ${imagePath}`);
                return;
            }
            
            const sprite = bgNode.getComponent(Sprite);
            if (sprite && spriteFrame) {
                sprite.spriteFrame = spriteFrame;
                sprite.color = Color.WHITE;
                console.log(`[MainMenuUI] ✅ 背景图已加载: ${imagePath}`);
            }
        });
    }
    
    /**
     * 加载动态背景（帧动画）
     */
    private loadAnimatedBackground(bgNode: Node, framePaths: string[], frameRate: number) {
        const frames: SpriteFrame[] = [];
        let loadedCount = 0;
        
        framePaths.forEach((path, index) => {
            resources.load(path + '/spriteFrame', SpriteFrame, (err, spriteFrame) => {
                loadedCount++;
                
                if (!err && spriteFrame) {
                    frames[index] = spriteFrame;
                }
                
                // 所有帧加载完成后开始播放
                if (loadedCount >= framePaths.length) {
                    const validFrames = frames.filter(f => f != null);
                    if (validFrames.length > 0) {
                        this.playBackgroundAnimation(bgNode, validFrames, frameRate);
                        console.log(`[MainMenuUI] ✅ 动态背景已加载: ${validFrames.length}帧`);
                    }
                }
            });
        });
    }
    
    /**
     * 播放背景帧动画
     */
    private backgroundAnimInterval: any = null;
    private playBackgroundAnimation(bgNode: Node, frames: SpriteFrame[], frameRate: number) {
        const sprite = bgNode.getComponent(Sprite);
        if (!sprite || frames.length === 0) return;
        
        sprite.color = Color.WHITE;
        let currentFrame = 0;
        
        this.backgroundAnimInterval = setInterval(() => {
            sprite.spriteFrame = frames[currentFrame];
            currentFrame = (currentFrame + 1) % frames.length;
        }, 1000 / frameRate);
    }
    
    onDestroy() {
        if (this.backgroundAnimInterval) {
            clearInterval(this.backgroundAnimInterval);
        }
    }

    private findNodeByPath(path: string, root: Node | null = this.node): Node | null {
        if (!root || !path) {
            return null;
        }

        let current: Node | null = root;
        for (const segment of path.split('/').filter(Boolean)) {
            current = current?.getChildByName(segment) ?? null;
            if (!current) {
                return null;
            }
        }
        return current;
    }

    private findNodeByPaths(paths: string[]): Node | null {
        for (const path of paths) {
            const node = this.findNodeByPath(path);
            if (node) {
                return node;
            }
        }
        return null;
    }

    private resolveSceneReferences() {
        this.mainMenuRoot = this.findNodeByPaths(['MainMenuRoot']) ?? null;
        this.overlayRoot = this.findNodeByPaths(['MainMenuRoot/OverlayRoot']) ?? null;
        this.mainTitleArtNode = this.findNodeByPaths(['MainMenuRoot/TitleRoot/Title_MainTitle', 'TitleRoot/Title_MainTitle']) ?? null;
        this.subTitleArtNode = this.findNodeByPaths(['MainMenuRoot/TitleRoot/Title_SubTitle', 'TitleRoot/Title_SubTitle']) ?? null;

        if (!this.titleLabel) {
            const legacyTitleNode = this.findNodeByPaths(['MainMenuRoot/TitleRoot/LegacyTitle', 'Title']);
            this.titleLabel = legacyTitleNode?.getComponent(Label) ?? null;
        }

        if (!this.startBtn) {
            this.startBtn = this.findNodeByPaths(['MainMenuRoot/MenuRoot/StartButton', 'MenuRoot/StartButton', 'StartButton'])?.getComponent(Button) ?? null;
        }

        if (!this.continueBtn) {
            this.continueBtn = this.findNodeByPaths(['MainMenuRoot/MenuRoot/ContinueButton', 'MenuRoot/ContinueButton', 'ContinueButton'])?.getComponent(Button) ?? null;
        }

        if (!this.settingsBtn) {
            this.settingsBtn = this.findNodeByPaths([
                'MainMenuRoot/TopRightRoot/SettingsButton',
                'TopRightRoot/SettingsButton',
                'ButtonGroup/SettingsButton',
                'SettingsButton'
            ])?.getComponent(Button) ?? null;
        }

        if (!this.quitBtn) {
            this.quitBtn = this.findNodeByPaths(['MainMenuRoot/MenuRoot/QuitButton', 'MenuRoot/QuitButton', 'QuitButton'])?.getComponent(Button) ?? null;
        }

        if (!this.settingsPanel) {
            this.settingsPanel = this.findNodeByPaths(['MainMenuRoot/OverlayRoot/SettingsPanel', 'OverlayRoot/SettingsPanel', 'SettingsPanel']);
        }
    }

    private getOverlayHost(): Node {
        return this.overlayRoot ?? this.node;
    }

    start() {
        console.log('[MainMenuUI] start开始');
        // 不再创建关卡按钮
        console.log('[MainMenuUI] start完成');
    }

    /**
     * 初始化UI
     */
    private initUI() {
        this.resolveSceneReferences();
        console.log('[MainMenuUI] initUI开始, titleLabel存在:', !!this.titleLabel);
        const hasBrandTitleArt = !!this.mainTitleArtNode && !!this.subTitleArtNode;
        if (hasBrandTitleArt && this.titleLabel?.node) {
            this.titleLabel.node.active = false;
        } else if (this.titleLabel) {
            // 使用统一的UI风格配置
            const fontSize = this._screenWidth < 768 ? UIFonts.titleMedium : UIFonts.titleLarge;
            this.titleLabel.fontSize = fontSize;
            this.titleLabel.color = UIColors.textGold;  // 金色标题
            this.titleLabel.isBold = true;
            this.titleLabel.enableOutline = true;
            this.titleLabel.outlineColor = new Color(80, 40, 0, 255);
            this.titleLabel.outlineWidth = 3;
            console.log('[MainMenuUI] 标题Label已就绪, 字体:', fontSize);
        } else {
            console.error('[MainMenuUI] titleLabel为null！');
        }
        
        // 隐藏面板
        if (this.settingsPanel) {
            this.settingsPanel.active = false;
        }
        if (this.saveListPanel) {
            this.saveListPanel.active = false;
        }
        
        // 应用统一的按钮样式
        this.applyButtonStyles();
        
        console.log('[MainMenuUI] UI初始化完成');
    }
    
    /**
     * 应用统一的按钮样式
     */
    private applyButtonStyles() {
        const applyMenuButtonStyle = (btn: Button | null, text: string) => {
            if (!btn) return;

            const sprite = btn.node.getComponent(Sprite);
            if (sprite) {
                sprite.color = Color.WHITE;
            }

            const transform = btn.node.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(286, 76);
            }

            const labelNode = btn.node.getChildByName('Label');
            const label = labelNode?.getComponent(Label);
            if (label) {
                label.string = text;
                label.fontSize = 28;
                label.color = new Color(122, 74, 56, 255);
                label.isBold = true;
                label.enableOutline = false;
            }
        };

        applyMenuButtonStyle(this.startBtn, '开始游戏');
        applyMenuButtonStyle(this.continueBtn, '继续游戏');
        applyMenuButtonStyle(this.quitBtn, '退出游戏');
        
        if (this.settingsBtn) {
            const sprite = this.settingsBtn.node.getComponent(Sprite);
            if (sprite) {
                sprite.color = Color.WHITE;
            }
            
            const transform = this.settingsBtn.node.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(148, 72);
            }
            
            const labelNode = this.settingsBtn.node.getChildByName('Label');
            if (labelNode) {
                labelNode.active = false;
            }
        }
    }

    /**
     * 设置按钮事件
     */
    private setupButtons() {
        console.log('[MainMenuUI] setupButtons开始');

        const bindButtonClick = (btn: Button | null, handler: () => void) => {
            if (!btn?.node) return;
            btn.node.off(Button.EventType.CLICK, handler, this);
            btn.node.on(Button.EventType.CLICK, handler, this);
        };

        console.log('[MainMenuUI] 绑定startBtn事件');
        bindButtonClick(this.startBtn, this.onStartGame);
        bindButtonClick(this.continueBtn, this.onContinueGame);
        bindButtonClick(this.loadSaveBtn, this.onOpenSaveList);

        if (!this.settingsBtn) {
            this.settingsBtn = this.findNodeByPaths([
                'MainMenuRoot/TopRightRoot/SettingsButton',
                'TopRightRoot/SettingsButton',
                'ButtonGroup/SettingsButton',
                'SettingsButton'
            ])?.getComponent(Button) ?? null;
        }
        bindButtonClick(this.settingsBtn, this.onOpenSettings);

        console.log('[MainMenuUI] 绑定quitBtn事件');
        bindButtonClick(this.quitBtn, this.onQuitGame);
        
        console.log('[MainMenuUI] setupButtons完成');
    }

    /**
     * 更新继续游戏按钮状态
     */
    private updateContinueButton() {
        if (!this.continueBtn) return;

        const hasSave = SaveManager.listSaves().length > 0;
        this.continueBtn.interactable = hasSave;

        const opacity = this.continueBtn.node.getComponent(UIOpacity) || this.continueBtn.node.addComponent(UIOpacity);
        opacity.opacity = hasSave ? 255 : 150;
    }

    // 防止重复点击
    private isLoadingScene: boolean = false;
    
    // 标记是否是新游戏（从"开始游戏"进入）
    private isNewGame: boolean = false;
    
    /**
     * 开始游戏（显示关卡选择界面）
     */
    public onStartGame() {
        if (this.isLoadingScene) return;
        this.isLoadingScene = true;

        if (FeatureGate.ENABLE_WORLD_SINGLE_FLOW) {
            const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
            world.resetProgress();

            const inventory = InventoryManager.instance;
            if (inventory) {
                inventory.setWallet(world.progress.totalMoney);
                inventory.initLevel(1);
                inventory.saveLevelState();
            }

            this.scheduleOnce(() => SceneRouteService.goShop(), 0.2);
            return;
        }

        console.log('[MainMenuUI] 开始游戏 - 显示关卡选择');
        this.isNewGame = true;  // 标记为新游戏
        this.showLevelSelectPanel();
    }
    
    /**
     * 继续游戏（显示存档选择）
     */
    public onContinueGame() {
        console.log('[MainMenuUI] 继续游戏 - 显示存档选择');

        const saves = SaveManager.listSaves();
        if (saves.length === 0) {
            if (FeatureGate.ENABLE_WORLD_SINGLE_FLOW) {
                this.continueFromProgress();
            } else {
                this.updateContinueButton();
            }
            return;
        }

        this.showSaveSelectPanel();
    }
    
    /**
     * 创建默认存档（第一关自动存档）
     */
    private createDefaultSave() {
        const defaultSaveData = {
            playerData: {
                totalMoney: 1000,
                currentLevel: 1,
                unlockedLevels: [1],
                completedLevels: []
            },
            stats: {
                totalPlayTime: 0,
                totalOrders: 0,
                totalCustomers: 0,
                superGoodReviews: 0,
                goodReviews: 0,
                badReviews: 0
            }
        };
        SaveManager.createSave('第一关 - 新开始', 'auto', defaultSaveData);
        console.log('[MainMenuUI] 已创建默认存档');
    }
    
    /**
     * 显示继续确认面板
     */
    private showContinueConfirmPanel() {
        const progressManager = GameProgressManager.instance;
        if (!progressManager) {
            this.showLevelSelectPanel();
            return;
        }
        
        const config = progressManager.currentLevelConfig;
        const progress = progressManager.progress;
        
        // 直接显示关卡选择，让玩家选择是继续还是重新开始
        this.showLevelSelectPanel();
    }
    
    /**
     * 从进度继续游戏
     */
    private continueFromProgress() {
        if (this.isLoadingScene) return;
        this.isLoadingScene = true;

        if (FeatureGate.ENABLE_WORLD_SINGLE_FLOW) {
            const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
            const inventory = InventoryManager.instance;
            if (inventory) {
                inventory.setWallet(world.progress.totalMoney);
                inventory.initLevel(1);
                inventory.saveLevelState();
            }
            this.scheduleOnce(() => SceneRouteService.goShop(), 0.2);
            return;
        }

        const progressManager = GameProgressManager.instance;
        if (progressManager) {
            console.log(`[MainMenuUI] 继续游戏 - 关卡${progressManager.progress.currentLevel} 第${progressManager.progress.currentDay}天`);
            SceneRouteService.goShop();
        }
    }
    
    /**
     * 打开存档列表
     */
    public onOpenSaveList() {
        if (this.saveListPanel) {
            this.saveListPanel.active = true;
            this.refreshSaveList();
        }
    }
    
    // 动态创建的设置面板
    private dynamicSettingsPanel: Node = null;
    
    /**
     * 打开设置面板（使用动态创建的扁平化面板）
     */
    public onOpenSettings() {
        console.log('[MainMenuUI] onOpenSettings被调用');
        this.showDynamicSettingsPanel();
    }
    
    /**
     * 显示动态设置面板
     */
    private showDynamicSettingsPanel() {
        if (!this.dynamicSettingsPanel) {
            this.createDynamicSettingsPanel();
        }
        this.dynamicSettingsPanel.active = true;
        this.dynamicSettingsPanel.setSiblingIndex(999);
        this.updateResolutionButtons();
        this.updateFullscreenButtons();
        
        // 淡入动画
        const opacity = this.dynamicSettingsPanel.getComponent(UIOpacity) || this.dynamicSettingsPanel.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.2, { opacity: 255 }).start();
    }
    
    /**
     * 隐藏动态设置面板
     */
    private hideDynamicSettingsPanel() {
        if (this.dynamicSettingsPanel) {
            const opacity = this.dynamicSettingsPanel.getComponent(UIOpacity);
            if (opacity) {
                tween(opacity).to(0.2, { opacity: 0 }).call(() => {
                    this.dynamicSettingsPanel.active = false;
                }).start();
            } else {
                this.dynamicSettingsPanel.active = false;
            }
        }
    }
    
    /**
     * 创建动态设置面板（现代配色设计）
     */
    private createDynamicSettingsPanel() {
        const canvas = this.getOverlayHost();
        if (!canvas) return;
        
        const panelWidth = 420;
        const panelHeight = 480;
        
        // 高级灰配色
        const colors = {
            panelBg: new Color(248, 250, 252, 255),     // 浅灰背景
            titleBar: new Color(71, 85, 105, 255),      // 深灰标题栏
            titleText: new Color(255, 255, 255, 255),   // 白色标题
            sectionBg: new Color(255, 255, 255, 255),
            textPrimary: new Color(30, 41, 59, 255),
            textSecondary: new Color(100, 116, 139, 255),
            accent: new Color(100, 116, 139, 255),      // 灰色强调
            border: new Color(226, 232, 240, 255),
            closeBtn: new Color(255, 255, 255, 200)
        };
        
        // 创建面板容器
        this.dynamicSettingsPanel = new Node('DynamicSettingsPanel');
        this.dynamicSettingsPanel.addComponent(UITransform).setContentSize(panelWidth, panelHeight);
        this.dynamicSettingsPanel.addComponent(UIOpacity);
        canvas.addChild(this.dynamicSettingsPanel);
        this.dynamicSettingsPanel.setPosition(0, 0, 0);
        
        // 半透明遮罩
        const mask = new Node('Mask');
        mask.addComponent(UITransform).setContentSize(2000, 2000);
        const maskGraphics = mask.addComponent(Graphics);
        maskGraphics.fillColor = new Color(15, 23, 42, 180);
        maskGraphics.rect(-1000, -1000, 2000, 2000);
        maskGraphics.fill();
        mask.addComponent(Button);
        mask.on(Node.EventType.TOUCH_END, () => this.hideDynamicSettingsPanel());
        this.dynamicSettingsPanel.addChild(mask);
        
        // 面板阴影
        const shadowNode = new Node('Shadow');
        shadowNode.addComponent(UITransform).setContentSize(panelWidth + 16, panelHeight + 16);
        const shadowGraphics = shadowNode.addComponent(Graphics);
        shadowGraphics.fillColor = new Color(0, 0, 0, 25);
        shadowGraphics.roundRect(-(panelWidth+16)/2, -(panelHeight+16)/2, panelWidth+16, panelHeight+16, 20);
        shadowGraphics.fill();
        shadowNode.setPosition(3, -3, 0);
        this.dynamicSettingsPanel.addChild(shadowNode);
        
        // 主面板背景（阻止点击穿透）
        const panelBg = new Node('PanelBg');
        panelBg.addComponent(UITransform).setContentSize(panelWidth, panelHeight);
        const bgGraphics = panelBg.addComponent(Graphics);
        bgGraphics.fillColor = colors.panelBg;
        bgGraphics.roundRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 16);
        bgGraphics.fill();
        bgGraphics.strokeColor = colors.border;
        bgGraphics.lineWidth = 1;
        bgGraphics.roundRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 16);
        bgGraphics.stroke();
        // 阻止点击穿透到遮罩
        panelBg.addComponent(Button);
        panelBg.on(Node.EventType.TOUCH_START, (e: any) => e.propagationStopped = true);
        panelBg.on(Node.EventType.TOUCH_END, (e: any) => e.propagationStopped = true);
        this.dynamicSettingsPanel.addChild(panelBg);
        
        // 蓝色标题栏
        const titleBar = new Node('TitleBar');
        titleBar.addComponent(UITransform).setContentSize(panelWidth, 50);
        const titleBarGraphics = titleBar.addComponent(Graphics);
        titleBarGraphics.fillColor = colors.titleBar;
        titleBarGraphics.roundRect(-panelWidth/2, -25, panelWidth, 50, 0);
        titleBarGraphics.fill();
        titleBar.setPosition(0, panelHeight/2 - 25, 0);
        this.dynamicSettingsPanel.addChild(titleBar);
        
        // 标题文字（白色）
        const titleLabel = new Node('TitleLabel');
        const title = titleLabel.addComponent(Label);
        title.string = '⚙️ 设置';
        title.fontSize = 20;
        title.color = colors.titleText;
        title.isBold = true;
        titleBar.addChild(titleLabel);
        
        // 关闭按钮（白色X）
        const closeBtnNode = new Node('CloseBtn');
        closeBtnNode.addComponent(UITransform).setContentSize(36, 36);
        const closeBtnLabel = closeBtnNode.addComponent(Label);
        closeBtnLabel.string = '✕';
        closeBtnLabel.fontSize = 18;
        closeBtnLabel.color = colors.closeBtn;
        closeBtnNode.addComponent(Button);
        closeBtnNode.setPosition(panelWidth/2 - 30, 0, 0);
        closeBtnNode.on(Node.EventType.TOUCH_END, () => this.hideDynamicSettingsPanel());
        titleBar.addChild(closeBtnNode);
        
        // 内容区域
        let yPos = panelHeight/2 - 80;
        
        // ========== 语言设置 ==========
        const langSection = this.createSettingsSection('🌐 语言设置', panelWidth - 40, 80);
        langSection.setPosition(0, yPos, 0);
        this.dynamicSettingsPanel.addChild(langSection);
        
        // 语言按钮容器
        const langBtnContainer = new Node('LangBtnContainer');
        langBtnContainer.setPosition(0, -15, 0);
        langSection.addChild(langBtnContainer);
        
        // 中文按钮
        const zhBtn = this.createFlatButton('中文', -50, 0, 80, 36, new Color(0, 123, 255, 255));
        zhBtn.name = 'ZhBtn';
        zhBtn.on(Node.EventType.TOUCH_END, () => this.onDynamicSelectLanguage('zh'));
        langBtnContainer.addChild(zhBtn);
        
        // English按钮
        const enBtn = this.createFlatButton('English', 50, 0, 80, 36, new Color(233, 236, 239, 255));
        enBtn.name = 'EnBtn';
        const enLabel = enBtn.getChildByName('Label')?.getComponent(Label);
        if (enLabel) enLabel.color = new Color(33, 37, 41, 255);
        enBtn.on(Node.EventType.TOUCH_END, () => this.onDynamicSelectLanguage('en'));
        langBtnContainer.addChild(enBtn);
        
        yPos -= 100;
        
        // ========== 音量设置 ==========
        const volumeSection = this.createSettingsSection('🔊 音量设置', panelWidth - 40, 140);
        volumeSection.setPosition(0, yPos, 0);
        this.dynamicSettingsPanel.addChild(volumeSection);
        
        // BGM行
        const bgmRow = new Node('BGMRow');
        bgmRow.setPosition(0, 20, 0);
        volumeSection.addChild(bgmRow);
        
        const bgmLabel = new Node('BGMLabel');
        const bgmLabelComp = bgmLabel.addComponent(Label);
        bgmLabelComp.string = '背景音乐';
        bgmLabelComp.fontSize = 14;
        bgmLabelComp.color = new Color(30, 41, 59, 255);
        bgmLabel.setPosition(-130, 0, 0);
        bgmRow.addChild(bgmLabel);
        
        // BGM 数值显示
        const bgmValue = new Node('BGMValue');
        const bgmValueLabel = bgmValue.addComponent(Label);
        bgmValueLabel.string = Math.round(this.bgmVolume * 100) + '%';
        bgmValueLabel.fontSize = 14;
        bgmValueLabel.color = new Color(71, 85, 105, 255);
        bgmValue.setPosition(130, 0, 0);
        bgmRow.addChild(bgmValue);
        
        // BGM 滑块
        this.createDragSlider(bgmRow, 0, 0, this.bgmVolume, (value: number) => {
            this.bgmVolume = value;
            bgmValueLabel.string = Math.round(value * 100) + '%';
            this.saveSettings();
        });
        
        // SFX行
        const sfxRow = new Node('SFXRow');
        sfxRow.setPosition(0, -30, 0);
        volumeSection.addChild(sfxRow);
        
        const sfxLabel = new Node('SFXLabel');
        const sfxLabelComp = sfxLabel.addComponent(Label);
        sfxLabelComp.string = '音效';
        sfxLabelComp.fontSize = 14;
        sfxLabelComp.color = new Color(30, 41, 59, 255);
        sfxLabel.setPosition(-130, 0, 0);
        sfxRow.addChild(sfxLabel);
        
        // SFX 数值显示
        const sfxValue = new Node('SFXValue');
        const sfxValueLabel = sfxValue.addComponent(Label);
        sfxValueLabel.string = Math.round(this.sfxVolume * 100) + '%';
        sfxValueLabel.fontSize = 14;
        sfxValueLabel.color = new Color(71, 85, 105, 255);
        sfxValue.setPosition(130, 0, 0);
        sfxRow.addChild(sfxValue);
        
        // SFX 滑块
        this.createDragSlider(sfxRow, 0, 0, this.sfxVolume, (value: number) => {
            this.sfxVolume = value;
            sfxValueLabel.string = Math.round(value * 100) + '%';
            this.saveSettings();
        });

        yPos -= 170;

        // ========== 显示设置 ==========
        const displaySection = this.createSettingsSection('🖥️ 显示设置', panelWidth - 40, 120);
        displaySection.name = 'DisplaySection';
        displaySection.setPosition(0, yPos, 0);
        this.dynamicSettingsPanel.addChild(displaySection);

        // 分辨率行
        const resolutionRow = new Node('ResolutionRow');
        resolutionRow.setPosition(0, 20, 0);
        displaySection.addChild(resolutionRow);

        const resLabel = new Node('ResolutionLabel');
        const resLabelComp = resLabel.addComponent(Label);
        resLabelComp.string = '分辨率';
        resLabelComp.fontSize = 14;
        resLabelComp.color = new Color(30, 41, 59, 255);
        resLabel.setPosition(-130, 0, 0);
        resolutionRow.addChild(resLabel);

        const resBtnContainer = new Node('ResolutionBtnContainer');
        resBtnContainer.setPosition(40, 0, 0);
        resolutionRow.addChild(resBtnContainer);

        const buttonSpacing = 100;
        const startX = -buttonSpacing;
        this.resolutionOptions.forEach((opt, index) => {
            const label = `${opt.width}x${opt.height}`;
            const btn = this.createFlatButton(label, startX + index * buttonSpacing, 0, 90, 32, new Color(233, 236, 239, 255));
            btn.name = `Res_${opt.width}x${opt.height}`;
            btn.on(Node.EventType.TOUCH_END, () => {
                DisplayManager.setResolution({ width: opt.width, height: opt.height });
                this.updateResolutionButtons();
            });
            resBtnContainer.addChild(btn);
        });

        // 全屏行
        const fullscreenRow = new Node('FullscreenRow');
        fullscreenRow.setPosition(0, -30, 0);
        displaySection.addChild(fullscreenRow);

        const fsLabel = new Node('FullscreenLabel');
        const fsLabelComp = fsLabel.addComponent(Label);
        fsLabelComp.string = '全屏';
        fsLabelComp.fontSize = 14;
        fsLabelComp.color = new Color(30, 41, 59, 255);
        fsLabel.setPosition(-130, 0, 0);
        fullscreenRow.addChild(fsLabel);

        const fsBtnContainer = new Node('FullscreenBtnContainer');
        fsBtnContainer.setPosition(40, 0, 0);
        fullscreenRow.addChild(fsBtnContainer);

        const windowBtn = this.createFlatButton('窗口', -50, 0, 80, 32, new Color(233, 236, 239, 255));
        windowBtn.name = 'WindowBtn';
        windowBtn.on(Node.EventType.TOUCH_END, () => {
            void DisplayManager.setFullscreen(false);
            this.updateFullscreenButtons();
        });
        fsBtnContainer.addChild(windowBtn);

        const fullscreenBtn = this.createFlatButton('全屏', 50, 0, 80, 32, new Color(233, 236, 239, 255));
        fullscreenBtn.name = 'FullscreenBtn';
        fullscreenBtn.on(Node.EventType.TOUCH_END, () => {
            void DisplayManager.setFullscreen(true);
            this.updateFullscreenButtons();
        });
        fsBtnContainer.addChild(fullscreenBtn);
        
        // 默认隐藏
        this.dynamicSettingsPanel.active = false;
        
        // 更新语言按钮状态
        this.updateDynamicLanguageButtons();
        this.updateResolutionButtons();
        this.updateFullscreenButtons();
    }
    
    /**
     * 创建拖动滑块（使用增量方式）
     */
    private createDragSlider(parent: Node, x: number, y: number, initialValue: number, onChange: (value: number) => void) {
        const sliderWidth = 120;
        const sliderHeight = 24;
        
        const slider = new Node('Slider');
        slider.addComponent(UITransform).setContentSize(sliderWidth, sliderHeight);
        slider.setPosition(x, y, 0);
        parent.addChild(slider);
        
        // 滑轨背景
        const track = new Node('Track');
        track.addComponent(UITransform).setContentSize(sliderWidth, 6);
        const trackGraphics = track.addComponent(Graphics);
        trackGraphics.fillColor = new Color(203, 213, 225, 255);
        trackGraphics.roundRect(-sliderWidth/2, -3, sliderWidth, 6, 3);
        trackGraphics.fill();
        slider.addChild(track);
        
        // 进度条
        const fill = new Node('Fill');
        fill.addComponent(UITransform).setContentSize(sliderWidth, 6);
        const fillGraphics = fill.addComponent(Graphics);
        slider.addChild(fill);
        
        // 手柄
        const handle = new Node('Handle');
        handle.addComponent(UITransform).setContentSize(20, 20);
        const handleGraphics = handle.addComponent(Graphics);
        slider.addChild(handle);
        
        // 绘制函数
        const drawFill = (ratio: number) => {
            fillGraphics.clear();
            fillGraphics.fillColor = new Color(100, 116, 139, 255);
            const fillWidth = sliderWidth * ratio;
            if (fillWidth > 0) {
                fillGraphics.roundRect(-sliderWidth/2, -3, fillWidth, 6, 3);
                fillGraphics.fill();
            }
        };
        
        const drawHandle = (ratio: number) => {
            const handleX = -sliderWidth/2 + sliderWidth * ratio;
            handleGraphics.clear();
            // 阴影
            handleGraphics.fillColor = new Color(0, 0, 0, 20);
            handleGraphics.circle(1, -1, 10);
            handleGraphics.fill();
            // 主体
            handleGraphics.fillColor = new Color(255, 255, 255, 255);
            handleGraphics.circle(0, 0, 10);
            handleGraphics.fill();
            handleGraphics.strokeColor = new Color(100, 116, 139, 255);
            handleGraphics.lineWidth = 2;
            handleGraphics.circle(0, 0, 10);
            handleGraphics.stroke();
            handle.setPosition(handleX, 0, 0);
        };
        
        // 初始绘制
        let currentValue = initialValue;
        drawFill(currentValue);
        drawHandle(currentValue);
        
        // 触摸区域覆盖整个滑块
        const touchArea = new Node('TouchArea');
        touchArea.addComponent(UITransform).setContentSize(sliderWidth, sliderHeight);
        touchArea.addComponent(Button);
        slider.addChild(touchArea);
        
        // 使用增量拖动
        touchArea.on(Node.EventType.TOUCH_START, (event: any) => {
            event.propagationStopped = true;
        });
        
        touchArea.on(Node.EventType.TOUCH_MOVE, (event: any) => {
            event.propagationStopped = true;
            const delta = event.getDelta();
            // 计算增量比例
            const deltaRatio = delta.x / sliderWidth;
            currentValue = Math.max(0, Math.min(1, currentValue + deltaRatio));
            drawFill(currentValue);
            drawHandle(currentValue);
            onChange(currentValue);
        });
        
        touchArea.on(Node.EventType.TOUCH_END, (event: any) => {
            event.propagationStopped = true;
        });
        
        touchArea.on(Node.EventType.TOUCH_CANCEL, (event: any) => {
            event.propagationStopped = true;
        });
    }
    
    /**
     * 创建音量加减按钮（备用）
     */
    private createVolumeButton(text: string, x: number, y: number, onClick: () => void): Node {
        const btn = new Node('VolumeBtn');
        btn.addComponent(UITransform).setContentSize(36, 36);
        btn.setPosition(x, y, 0);
        
        // 按钮背景节点
        const bgNode = new Node('Bg');
        bgNode.addComponent(UITransform).setContentSize(36, 36);
        const graphics = bgNode.addComponent(Graphics);
        graphics.fillColor = new Color(241, 245, 249, 255);
        graphics.roundRect(-18, -18, 36, 36, 8);
        graphics.fill();
        graphics.strokeColor = new Color(203, 213, 225, 255);
        graphics.lineWidth = 1;
        graphics.roundRect(-18, -18, 36, 36, 8);
        graphics.stroke();
        btn.addChild(bgNode);
        
        // 按钮文字节点
        const labelNode = new Node('Label');
        labelNode.addComponent(UITransform).setContentSize(36, 36);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 20;
        label.color = new Color(71, 85, 105, 255);
        label.isBold = true;
        btn.addChild(labelNode);
        
        // 点击事件
        btn.addComponent(Button);
        btn.on(Node.EventType.TOUCH_START, (e: any) => {
            e.propagationStopped = true;
            graphics.clear();
            graphics.fillColor = new Color(226, 232, 240, 255);
            graphics.roundRect(-18, -18, 36, 36, 8);
            graphics.fill();
            graphics.strokeColor = new Color(203, 213, 225, 255);
            graphics.lineWidth = 1;
            graphics.roundRect(-18, -18, 36, 36, 8);
            graphics.stroke();
        });
        btn.on(Node.EventType.TOUCH_END, (e: any) => {
            e.propagationStopped = true;
            graphics.clear();
            graphics.fillColor = new Color(241, 245, 249, 255);
            graphics.roundRect(-18, -18, 36, 36, 8);
            graphics.fill();
            graphics.strokeColor = new Color(203, 213, 225, 255);
            graphics.lineWidth = 1;
            graphics.roundRect(-18, -18, 36, 36, 8);
            graphics.stroke();
            onClick();
        });
        btn.on(Node.EventType.TOUCH_CANCEL, (e: any) => {
            e.propagationStopped = true;
            graphics.clear();
            graphics.fillColor = new Color(241, 245, 249, 255);
            graphics.roundRect(-18, -18, 36, 36, 8);
            graphics.fill();
            graphics.strokeColor = new Color(203, 213, 225, 255);
            graphics.lineWidth = 1;
            graphics.roundRect(-18, -18, 36, 36, 8);
            graphics.stroke();
        });
        
        return btn;
    }
    
    /**
     * 更新音量显示
     */
    private updateVolumeDisplay(type: 'bgm' | 'sfx') {
        if (!this.dynamicSettingsPanel) return;
        
        // 遍历所有子节点查找BGMRow或SFXRow
        const rowName = type === 'bgm' ? 'BGMRow' : 'SFXRow';
        const valueName = type === 'bgm' ? 'BGMValue' : 'SFXValue';
        
        const findNode = (parent: Node, name: string): Node | null => {
            for (const child of parent.children) {
                if (child.name === name) return child;
                const found = findNode(child, name);
                if (found) return found;
            }
            return null;
        };
        
        const row = findNode(this.dynamicSettingsPanel, rowName);
        if (!row) return;
        
        const valueNode = row.getChildByName(valueName);
        if (!valueNode) return;
        
        const label = valueNode.getComponent(Label);
        if (label) {
            const value = type === 'bgm' ? this.bgmVolume : this.sfxVolume;
            label.string = Math.round(value * 100) + '%';
        }
    }
    
    /**
     * 创建设置区块（浅色优雅设计）
     */
    private createSettingsSection(title: string, width: number, height: number): Node {
        const section = new Node('Section');
        section.addComponent(UITransform).setContentSize(width, height);
        
        // 白色背景带边框
        const bg = section.addComponent(Graphics);
        bg.fillColor = new Color(255, 255, 255, 255);
        bg.roundRect(-width/2, -height/2, width, height, 10);
        bg.fill();
        bg.strokeColor = new Color(226, 232, 240, 255);
        bg.lineWidth = 1;
        bg.roundRect(-width/2, -height/2, width, height, 10);
        bg.stroke();
        
        // 标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 13;
        titleLabel.color = new Color(100, 116, 139, 255);
        titleNode.setPosition(0, height/2 - 18, 0);
        section.addChild(titleNode);
        
        return section;
    }
    
    /**
     * 创建交互式音量滑块（纯Graphics绘制）
     */
    private createVolumeSlider(type: string, initialValue: number, onChange: (value: number) => void): Node {
        const sliderWidth = 140;
        const sliderHeight = 30;
        
        const sliderNode = new Node(`${type}Slider`);
        const sliderTransform = sliderNode.addComponent(UITransform);
        sliderTransform.setContentSize(sliderWidth, sliderHeight);
        
        // 绘制滑轨和进度
        const graphics = sliderNode.addComponent(Graphics);
        
        const drawSlider = (ratio: number) => {
            graphics.clear();
            // 滑轨背景（灰色）
            graphics.fillColor = new Color(203, 213, 225, 255);
            graphics.roundRect(-sliderWidth/2, -3, sliderWidth, 6, 3);
            graphics.fill();
            // 进度条（深灰）
            if (ratio > 0) {
                graphics.fillColor = new Color(100, 116, 139, 255);
                graphics.roundRect(-sliderWidth/2, -3, sliderWidth * ratio, 6, 3);
                graphics.fill();
            }
            // 手柄（圆形）
            const handleX = -sliderWidth/2 + sliderWidth * ratio;
            graphics.fillColor = new Color(255, 255, 255, 255);
            graphics.circle(handleX, 0, 10);
            graphics.fill();
            graphics.strokeColor = new Color(100, 116, 139, 255);
            graphics.lineWidth = 2;
            graphics.circle(handleX, 0, 10);
            graphics.stroke();
        };
        
        drawSlider(initialValue);
        
        // 添加Button使其可点击
        sliderNode.addComponent(Button);
        
        let currentValue = initialValue;
        
        const calculateRatio = (event: any): number => {
            const touch = event.touch;
            const uiPos = touch.getUILocation();
            const worldPos = sliderNode.worldPosition;
            const localX = uiPos.x - worldPos.x;
            let ratio = (localX + sliderWidth/2) / sliderWidth;
            return Math.max(0, Math.min(1, ratio));
        };
        
        sliderNode.on(Node.EventType.TOUCH_START, (event: any) => {
            event.propagationStopped = true;
            const ratio = calculateRatio(event);
            currentValue = ratio;
            drawSlider(ratio);
            onChange(ratio);
        });
        
        sliderNode.on(Node.EventType.TOUCH_MOVE, (event: any) => {
            event.propagationStopped = true;
            const ratio = calculateRatio(event);
            currentValue = ratio;
            drawSlider(ratio);
            onChange(ratio);
        });
        
        sliderNode.on(Node.EventType.TOUCH_END, (event: any) => {
            event.propagationStopped = true;
        });
        
        sliderNode.on(Node.EventType.TOUCH_CANCEL, (event: any) => {
            event.propagationStopped = true;
        });
        
        return sliderNode;
    }
    
    /**
     * 保存设置
     */
    private saveSettings() {
        try {
            const settings = {
                bgmVolume: this.bgmVolume,
                sfxVolume: this.sfxVolume,
                language: this.currentLanguage
            };
            sys.localStorage.setItem('game_settings', JSON.stringify(settings));
        } catch (e) {
            console.error('[MainMenuUI] 保存设置失败:', e);
        }
    }
    
    /**
     * 动态语言选择
     */
    private onDynamicSelectLanguage(lang: 'zh' | 'en') {
        this.currentLanguage = lang;
        this.saveLanguagePreference();
        this.applyLanguageTexts();
        this.updateDynamicLanguageButtons();
        console.log('[MainMenuUI] 语言切换为:', lang === 'zh' ? '中文' : 'English');
    }
    
    /**
     * 更新动态语言按钮状态
     */
    private updateDynamicLanguageButtons() {
        if (!this.dynamicSettingsPanel) return;
        
        const langSection = this.dynamicSettingsPanel.children.find(c => c.name === 'Section');
        if (!langSection) return;
        
        const langBtnContainer = langSection.getChildByName('LangBtnContainer');
        if (!langBtnContainer) return;
        
        const zhBtn = langBtnContainer.getChildByName('ZhBtn');
        const enBtn = langBtnContainer.getChildByName('EnBtn');
        
        if (zhBtn) {
            const graphics = zhBtn.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
                const color = this.currentLanguage === 'zh' ? new Color(0, 123, 255, 255) : new Color(233, 236, 239, 255);
                graphics.fillColor = color;
                graphics.roundRect(-40, -18, 80, 36, 6);
                graphics.fill();
                (zhBtn as any).__baseColor = color;
            }
            const label = zhBtn.getChildByName('Label')?.getComponent(Label);
            if (label) {
                label.color = this.currentLanguage === 'zh' ? new Color(255, 255, 255, 255) : new Color(33, 37, 41, 255);
            }
        }
        
        if (enBtn) {
            const graphics = enBtn.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
                const color = this.currentLanguage === 'en' ? new Color(0, 123, 255, 255) : new Color(233, 236, 239, 255);
                graphics.fillColor = color;
                graphics.roundRect(-40, -18, 80, 36, 6);
                graphics.fill();
                (enBtn as any).__baseColor = color;
            }
            const label = enBtn.getChildByName('Label')?.getComponent(Label);
            if (label) {
                label.color = this.currentLanguage === 'en' ? new Color(255, 255, 255, 255) : new Color(33, 37, 41, 255);
            }
        }
    }

    public hideSettingsPanel() {
        if (!this.settingsPanel) return;
        const bg = this.settingsPanel.getChildByName('Background');
        const panel = this.settingsPanel.getChildByName('Panel');
        if (bg) {
            const bgOpacity = bg.getComponent(UIOpacity) || bg.addComponent(UIOpacity);
            tween(bgOpacity).to(0.2, { opacity: 0 }).start();
        }
        if (panel) {
            const pOpacity = panel.getComponent(UIOpacity) || panel.addComponent(UIOpacity);
            tween(panel).to(0.2, { scale: new Vec3(0.9, 0.9, 1) }, { easing: 'quadIn' }).start();
            tween(pOpacity)
                .to(0.2, { opacity: 0 }, { easing: 'quadIn' })
                .call(() => {
                    this.settingsPanel.active = false;
                    this.toggleMainMenuNodes(true);
                    panel.setScale(new Vec3(1, 1, 1));
                    pOpacity.opacity = 255;
                })
                .start();
        } else {
            this.settingsPanel.active = false;
            this.toggleMainMenuNodes(true);
        }
    }

    /**
     * 刷新存档列表
     */
    private refreshSaveList() {
        if (!this.saveListContent) return;
        
        // 清空旧列表
        this.saveListContent.removeAllChildren();
        
        // 获取所有存档
        const saves = SaveManager.listSaves();
        
        if (saves.length === 0) {
            // 显示无存档提示
            const emptyNode = new Node('Empty');
            const label = emptyNode.addComponent(Label);
            label.string = this.t('save.empty', '暂无存档', 'No saved games');
            label.fontSize = 24;
            label.color = Color.GRAY;
            this.saveListContent.addChild(emptyNode);
            return;
        }
        
        // 创建存档项
        saves.forEach(save => {
            const saveItem = this.createSaveListItem(save);
            this.saveListContent.addChild(saveItem);
        });
    }
    
    /**
     * 创建存档列表项
     */
    private createSaveListItem(save: SaveData): Node {
        const itemNode = new Node('SaveItem_' + save.saveId);
        const transform = itemNode.addComponent(UITransform);
        transform.setContentSize(600, 100);
        
        // 背景
        const bgSprite = itemNode.addComponent(Sprite);
        bgSprite.color = save.saveType === 'auto' ? new Color(200, 200, 255, 255) : new Color(200, 255, 200, 255);
        
        // 存档名称
        const nameNode = new Node('Name');
        const nameLabel = nameNode.addComponent(Label);
        const autoPrefix = save.saveType === 'auto'
            ? this.t('save.autoPrefix', '🔄 自动 - ', '🔄 Auto - ')
            : this.t('save.manualPrefix', '💾 手动 - ', '💾 Manual - ');
        nameLabel.string = autoPrefix + save.saveName;
        nameLabel.fontSize = 18;
        nameLabel.color = Color.BLACK;
        nameNode.setPosition(-200, 30, 0);
        itemNode.addChild(nameNode);
        
        // 存档信息
        const infoNode = new Node('Info');
        const infoLabel = infoNode.addComponent(Label);
        const date = new Date(save.timestamp);
        if (this.currentLanguage === 'zh') {
            infoLabel.string = `💰 ${save.playerData.totalMoney} | 关卡 ${save.playerData.currentLevel} | ${date.toLocaleString('zh-CN')}`;
        } else {
            infoLabel.string = `💰 ${save.playerData.totalMoney} | Level ${save.playerData.currentLevel} | ${date.toLocaleString('en-US')}`;
        }
        infoLabel.fontSize = 14;
        infoLabel.color = new Color(50, 50, 50, 255);
        infoNode.setPosition(-200, 0, 0);
        itemNode.addChild(infoNode);
        
        // 加载按钮
        const loadBtnNode = new Node('LoadBtn');
        const loadBtnTransform = loadBtnNode.addComponent(UITransform);
        loadBtnTransform.setContentSize(100, 40);
        const loadBtnSprite = loadBtnNode.addComponent(Sprite);
        loadBtnSprite.color = new Color(100, 200, 100, 255);
        const loadBtn = loadBtnNode.addComponent(Button);
        loadBtn.node.on(Button.EventType.CLICK, () => {
            this.loadGameFromSave(save);
        }, this);
        
        const loadBtnLabel = new Node('Label');
        const loadBtnText = loadBtnLabel.addComponent(Label);
        loadBtnText.string = this.t('save.load', '加载', 'Load');
        loadBtnText.fontSize = 16;
        loadBtnText.color = Color.WHITE;
        loadBtnNode.addChild(loadBtnLabel);
        loadBtnNode.setPosition(150, 0, 0);
        itemNode.addChild(loadBtnNode);
        
        return itemNode;
    }
    
    /**
     * 从存档加载游戏
     */
    private loadGameFromSave(save: SaveData) {
        console.log('[MainMenuUI] 加载存档:', save.saveName);
        
        // TODO: 将存档数据应用到游戏
        const gameManager = GameManager.Instance;
        if (gameManager) {
            gameManager.startLevel(save.playerData.currentLevel);
        }
        
        // 关闭存档列表
        if (this.saveListPanel) {
            this.saveListPanel.active = false;
        }
    }

    /**
     * 缓存主菜单节点（排除设置面板和背景）
     */
    private cacheMainMenuNodes() {
        const root = this.mainMenuRoot ?? this.node;
        if (!root) return;
        this.mainMenuNodes = [];
        for (const child of root.children) {
            if (child.name !== 'OverlayRoot' && child.name !== 'BackgroundRoot') {
                this.mainMenuNodes.push(child);
            }
        }
        console.log('[MainMenuUI] 缓存主菜单节点数量:', this.mainMenuNodes.length);
    }

    /**
     * 切换主菜单节点显示/隐藏
     */
    private toggleMainMenuNodes(visible: boolean) {
        if (!this.mainMenuNodes || this.mainMenuNodes.length === 0) {
            this.cacheMainMenuNodes();
        }
        this.mainMenuNodes.forEach(node => {
            if (node && node !== this.settingsPanel) {
                node.active = visible;
            }
        });
    }
    
    /**
     * 退出游戏
     */
    public onQuitGame() {
        console.log('[MainMenuUI] 退出游戏');
        const platform = sys.platform;
        if (platform === sys.Platform.EDITOR_PAGE || platform === sys.Platform.EDITOR_CORE) {
            console.log('[MainMenuUI] 编辑器环境下不执行退出');
            return;
        }

        try {
            SaveManager.autoSave(SaveManager.buildCurrentSaveData());
            console.log('[MainMenuUI] 💾 退出前自动存档完成');
        } catch (e) {
            console.warn('[MainMenuUI] ⚠️ 退出前自动存档失败', e);
        }

        if (sys.isNative) {
            game.end();
        } else if (typeof window !== 'undefined' && (window as any).close) {
            (window as any).close();
        } else {
            console.log('[MainMenuUI] 当前平台不支持直接退出游戏');
        }
    }
    
    // ==================== 关卡选择面板 ====================
    private levelSelectPanel: Node = null;
    
    /**
     * 显示关卡选择面板
     */
    private showLevelSelectPanel() {
        if (!this.levelSelectPanel) {
            this.createLevelSelectPanel();
        }
        this.levelSelectPanel.active = true;
        this.updateLevelCards();
        
        // 淡入动画
        const opacity = this.levelSelectPanel.getComponent(UIOpacity) || this.levelSelectPanel.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.2, { opacity: 255 }).start();
    }
    
    /**
     * 隐藏关卡选择面板
     */
    private hideLevelSelectPanel() {
        if (this.levelSelectPanel) {
            const opacity = this.levelSelectPanel.getComponent(UIOpacity);
            if (opacity) {
                tween(opacity).to(0.2, { opacity: 0 }).call(() => {
                    this.levelSelectPanel.active = false;
                }).start();
            } else {
                this.levelSelectPanel.active = false;
            }
        }
    }
    
    /**
     * 创建关卡选择面板（现代配色设计）
     */
    private createLevelSelectPanel() {
        const canvas = this.getOverlayHost();
        if (!canvas) return;
        
        const panelWidth = 750;
        const panelHeight = 520;
        
        // 高级灰配色
        const colors = {
            panelBg: new Color(248, 250, 252, 255),     // 浅灰背景
            titleBar: new Color(71, 85, 105, 255),      // 深灰标题栏
            titleText: new Color(255, 255, 255, 255),   // 白色标题文字
            cardBg: new Color(255, 255, 255, 255),      // 白色卡片
            cardBorder: new Color(226, 232, 240, 255),  // 浅灰边框
            accent: new Color(100, 116, 139, 255),      // 灰色强调
            closeBtn: new Color(255, 255, 255, 200),    // 白色关闭
            shadow: new Color(0, 0, 0, 30)              // 淡阴影
        };
        
        // 创建面板容器
        this.levelSelectPanel = new Node('LevelSelectPanel');
        this.levelSelectPanel.addComponent(UITransform).setContentSize(panelWidth, panelHeight);
        this.levelSelectPanel.addComponent(UIOpacity);
        canvas.addChild(this.levelSelectPanel);
        this.levelSelectPanel.setPosition(0, 0, 0);
        this.levelSelectPanel.setSiblingIndex(999);
        
        // 半透明遮罩
        const mask = new Node('Mask');
        mask.addComponent(UITransform).setContentSize(2000, 2000);
        const maskGraphics = mask.addComponent(Graphics);
        maskGraphics.fillColor = new Color(15, 23, 42, 180);
        maskGraphics.rect(-1000, -1000, 2000, 2000);
        maskGraphics.fill();
        mask.addComponent(Button);
        mask.on(Node.EventType.TOUCH_END, () => this.hideLevelSelectPanel());
        this.levelSelectPanel.addChild(mask);
        
        // 面板阴影
        const shadowNode = new Node('Shadow');
        shadowNode.addComponent(UITransform).setContentSize(panelWidth + 20, panelHeight + 20);
        const shadowGraphics = shadowNode.addComponent(Graphics);
        shadowGraphics.fillColor = new Color(0, 0, 0, 25);
        shadowGraphics.roundRect(-(panelWidth+20)/2, -(panelHeight+20)/2, panelWidth+20, panelHeight+20, 24);
        shadowGraphics.fill();
        shadowNode.setPosition(4, -4, 0);
        this.levelSelectPanel.addChild(shadowNode);
        
        // 主面板背景（阻止点击穿透）
        const panelBg = new Node('PanelBg');
        panelBg.addComponent(UITransform).setContentSize(panelWidth, panelHeight);
        const bgGraphics = panelBg.addComponent(Graphics);
        bgGraphics.fillColor = colors.panelBg;
        bgGraphics.roundRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 20);
        bgGraphics.fill();
        // 边框
        bgGraphics.strokeColor = colors.cardBorder;
        bgGraphics.lineWidth = 1;
        bgGraphics.roundRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 20);
        bgGraphics.stroke();
        // 阻止点击穿透
        panelBg.addComponent(Button);
        panelBg.on(Node.EventType.TOUCH_START, (e: any) => e.propagationStopped = true);
        panelBg.on(Node.EventType.TOUCH_END, (e: any) => e.propagationStopped = true);
        this.levelSelectPanel.addChild(panelBg);
        
        // 蓝色标题栏
        const titleBar = new Node('TitleBar');
        titleBar.addComponent(UITransform).setContentSize(panelWidth, 60);
        const titleBarGraphics = titleBar.addComponent(Graphics);
        titleBarGraphics.fillColor = colors.titleBar;
        titleBarGraphics.roundRect(-panelWidth/2, -30, panelWidth, 60, 0);
        titleBarGraphics.fill();
        titleBar.setPosition(0, panelHeight/2 - 30, 0);
        this.levelSelectPanel.addChild(titleBar);
        
        // 标题文字
        const titleLabel = new Node('TitleLabel');
        const title = titleLabel.addComponent(Label);
        title.string = '🎮 选择关卡';
        title.fontSize = 20;
        title.color = colors.titleText;
        title.isBold = true;
        titleBar.addChild(titleLabel);
        
        // 关闭按钮（白色X）
        const closeBtnNode = new Node('CloseBtn');
        closeBtnNode.addComponent(UITransform).setContentSize(36, 36);
        const closeBtnLabel = closeBtnNode.addComponent(Label);
        closeBtnLabel.string = '✕';
        closeBtnLabel.fontSize = 20;
        closeBtnLabel.color = colors.closeBtn;
        closeBtnNode.addComponent(Button);
        closeBtnNode.setPosition(panelWidth/2 - 35, 0, 0);
        closeBtnNode.on(Node.EventType.TOUCH_END, () => this.hideLevelSelectPanel());
        titleBar.addChild(closeBtnNode);
        
        // 底部状态栏（浅灰色）
        const bottomBar = new Node('BottomBar');
        bottomBar.addComponent(UITransform).setContentSize(panelWidth, 45);
        const bottomBarGraphics = bottomBar.addComponent(Graphics);
        bottomBarGraphics.fillColor = new Color(241, 245, 249, 255);
        bottomBarGraphics.roundRect(-panelWidth/2, -22, panelWidth, 45, 0);
        bottomBarGraphics.fill();
        // 顶部分隔线
        bottomBarGraphics.strokeColor = new Color(226, 232, 240, 255);
        bottomBarGraphics.lineWidth = 1;
        bottomBarGraphics.moveTo(-panelWidth/2, 22);
        bottomBarGraphics.lineTo(panelWidth/2, 22);
        bottomBarGraphics.stroke();
        bottomBar.setPosition(0, -panelHeight/2 + 22, 0);
        this.levelSelectPanel.addChild(bottomBar);
        
        // 底部提示文字
        const tipLabel = new Node('TipLabel');
        const tip = tipLabel.addComponent(Label);
        tip.string = '💡 完成当前关卡解锁下一关';
        tip.fontSize = 13;
        tip.color = new Color(100, 116, 139, 255);
        bottomBar.addChild(tipLabel);
        
        // 创建关卡卡片容器
        const cardsContainer = new Node('CardsContainer');
        cardsContainer.name = 'CardsContainer';
        this.levelSelectPanel.addChild(cardsContainer);
        cardsContainer.setPosition(0, -30, 0);
        
        // 3x2 布局
        const cardWidth = 200;
        const cardHeight = 140;
        const spacingX = 30;
        const spacingY = 25;
        const cols = 3;
        const startX = -(cols - 1) * (cardWidth + spacingX) / 2;
        const startY = (cardHeight + spacingY) / 2;
        
        for (let i = 0; i < LEVEL_CONFIGS.length; i++) {
            const config = LEVEL_CONFIGS[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            
            const x = startX + col * (cardWidth + spacingX);
            const y = startY - row * (cardHeight + spacingY);
            
            const card = this.createLevelCard(config, x, y, cardWidth, cardHeight);
            card.name = `LevelCard_${config.levelId}`;
            cardsContainer.addChild(card);
        }
        
        // 默认隐藏
        this.levelSelectPanel.active = false;
    }
    
    /**
     * 创建单个关卡卡片（精致浅色设计）
     */
    private createLevelCard(config: any, x: number, y: number, width: number, height: number): Node {
        const card = new Node(`Level${config.levelId}Card`);
        card.setPosition(x, y, 0);
        
        const transform = card.addComponent(UITransform);
        transform.setContentSize(width, height);
        
        // 难度对应的强调色（更鲜艳）
        const difficultyColors = [
            new Color(16, 185, 129, 255),   // 1星 - 翡翠绿
            new Color(59, 130, 246, 255),   // 2星 - 蓝色
            new Color(139, 92, 246, 255),   // 3星 - 紫罗兰
            new Color(245, 158, 11, 255),   // 4星 - 琥珀黄
            new Color(249, 115, 22, 255),   // 5星 - 橙色
            new Color(239, 68, 68, 255)     // 6星 - 红色
        ];
        const accentColor = difficultyColors[config.difficulty - 1];
        
        // 卡片背景（精致阴影）
        const bg = card.addComponent(Graphics);
        // 多层阴影效果
        bg.fillColor = new Color(0, 0, 0, 8);
        bg.roundRect(-width/2 + 3, -height/2 - 3, width, height, 14);
        bg.fill();
        bg.fillColor = new Color(0, 0, 0, 12);
        bg.roundRect(-width/2 + 1, -height/2 - 1, width, height, 13);
        bg.fill();
        
        // 主背景
        bg.fillColor = config.levelId === 1 ? new Color(255, 255, 255, 255) : new Color(248, 250, 252, 255);
        bg.roundRect(-width/2, -height/2, width, height, 12);
        bg.fill();
        
        // 边框
        bg.strokeColor = config.levelId === 1 ? new Color(226, 232, 240, 255) : new Color(203, 213, 225, 255);
        bg.lineWidth = 1;
        bg.roundRect(-width/2, -height/2, width, height, 12);
        bg.stroke();
        
        // 左侧色条（全高）
        bg.fillColor = config.levelId === 1 ? accentColor : new Color(203, 213, 225, 255);
        bg.roundRect(-width/2, -height/2, 5, height, 2);
        bg.fill();
        
        // 浅色主题文字颜色
        const textPrimary = new Color(30, 41, 59, 255);    // 主要深色文字
        const textSecondary = new Color(100, 116, 139, 255); // 次要灰文字
        const textLocked = new Color(148, 163, 184, 255);  // 锁定浅灰文字
        
        // ========== 已解锁内容容器 ==========
        const unlockedContent = new Node('UnlockedContent');
        card.addChild(unlockedContent);
        
        // 关卡编号
        const levelNum = new Node('LevelNum');
        const levelNumLabel = levelNum.addComponent(Label);
        levelNumLabel.string = `第${config.levelId}关`;
        levelNumLabel.fontSize = 12;
        levelNumLabel.color = textSecondary;
        levelNum.setPosition(0, 45, 0);
        unlockedContent.addChild(levelNum);
        
        // 关卡名称
        const levelName = new Node('LevelName');
        const levelNameLabel = levelName.addComponent(Label);
        levelNameLabel.string = config.levelName;
        levelNameLabel.fontSize = 20;
        levelNameLabel.color = textPrimary;
        levelNameLabel.isBold = true;
        levelName.setPosition(0, 18, 0);
        unlockedContent.addChild(levelName);
        
        // 难度星星
        const stars = new Node('Stars');
        const starsLabel = stars.addComponent(Label);
        starsLabel.string = '★'.repeat(config.difficulty) + '☆'.repeat(6 - config.difficulty);
        starsLabel.fontSize = 12;
        starsLabel.color = accentColor;
        stars.setPosition(0, -8, 0);
        unlockedContent.addChild(stars);
        
        // 天数和解锁信息
        const info = new Node('Info');
        const infoLabel = info.addComponent(Label);
        infoLabel.string = `${config.totalDays}天 · 目标${config.unlockMoney}元`;
        infoLabel.fontSize = 10;
        infoLabel.color = textSecondary;
        info.setPosition(0, -28, 0);
        unlockedContent.addChild(info);
        
        // 解锁状态
        const unlockInfo = new Node('UnlockInfo');
        const unlockLabel = unlockInfo.addComponent(Label);
        unlockLabel.string = '可挑战';
        unlockLabel.fontSize = 11;
        unlockLabel.color = new Color(0, 184, 148, 255);  // 青绿色
        unlockInfo.setPosition(0, -48, 0);
        unlockedContent.addChild(unlockInfo);
        
        // ========== 锁定内容容器 ==========
        const lockedContent = new Node('LockedContent');
        card.addChild(lockedContent);
        
        // 锁定关卡编号
        const lockedLevelNum = new Node('LockedLevelNum');
        const lockedLevelNumLabel = lockedLevelNum.addComponent(Label);
        lockedLevelNumLabel.string = `第${config.levelId}关`;
        lockedLevelNumLabel.fontSize = 12;
        lockedLevelNumLabel.color = textLocked;
        lockedLevelNum.setPosition(0, 35, 0);
        lockedContent.addChild(lockedLevelNum);
        
        // 锁定图标
        const lockIcon = new Node('LockIcon');
        const lockIconLabel = lockIcon.addComponent(Label);
        lockIconLabel.string = '🔒';
        lockIconLabel.fontSize = 36;
        lockIcon.setPosition(0, -5, 0);
        lockedContent.addChild(lockIcon);
        
        // 锁定提示
        const lockedHint = new Node('LockedHint');
        const lockedHintLabel = lockedHint.addComponent(Label);
        lockedHintLabel.string = '???';
        lockedHintLabel.fontSize = 14;
        lockedHintLabel.color = textLocked;
        lockedHint.setPosition(0, -45, 0);
        lockedContent.addChild(lockedHint);
        
        // 默认第一关显示解锁内容，其他关显示锁定内容
        unlockedContent.active = config.levelId === 1;
        lockedContent.active = config.levelId !== 1;
        
        // 添加按钮和点击效果
        card.addComponent(Button);
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
        if (!this.levelSelectPanel) return;
        
        const cardsContainer = this.levelSelectPanel.getChildByName('CardsContainer');
        if (!cardsContainer) return;
        
        const progressManager = GameProgressManager.instance;
        
        for (let i = 0; i < LEVEL_CONFIGS.length; i++) {
            const config = LEVEL_CONFIGS[i];
            const card = cardsContainer.getChildByName(`LevelCard_${config.levelId}`);
            if (!card) continue;
            
            const demoLocked = GameConfig.DEMO_ONLY_LEVEL1 && config.levelId > GameConfig.DEMO_LEVEL_CAP;
            const isUnlocked = (progressManager ? progressManager.isLevelUnlocked(config.levelId) : config.levelId === 1) && !demoLocked;
            const isCompleted = progressManager ? progressManager.isLevelCompleted(config.levelId) : false;
            
            // 切换解锁/锁定内容显示
            const unlockedContent = card.getChildByName('UnlockedContent');
            const lockedContent = card.getChildByName('LockedContent');
            if (unlockedContent) unlockedContent.active = isUnlocked;
            if (lockedContent) lockedContent.active = !isUnlocked;
            
            // 更新左侧色条颜色
            const graphics = card.getComponent(Graphics);
            if (graphics && isUnlocked) {
                const difficultyColors = [
                    new Color(40, 167, 69, 255),
                    new Color(23, 162, 184, 255),
                    new Color(0, 123, 255, 255),
                    new Color(255, 193, 7, 255),
                    new Color(253, 126, 20, 255),
                    new Color(220, 53, 69, 255)
                ];
                // 重绘卡片背景和色条
                const width = 200, height = 140;
                graphics.clear();
                graphics.fillColor = new Color(255, 255, 255, 255);
                graphics.roundRect(-width/2, -height/2, width, height, 12);
                graphics.fill();
                graphics.fillColor = difficultyColors[config.difficulty - 1];
                graphics.roundRect(-width/2, -height/2, 6, height, 3);
                graphics.fill();
            }
            
            // 更新解锁信息
            const unlockInfo = unlockedContent?.getChildByName('UnlockInfo');
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
                        label.string = `需要${config.unlockMoney ?? config.initialMoney}元`;
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

        const demoLocked = GameConfig.DEMO_ONLY_LEVEL1 && levelId > GameConfig.DEMO_LEVEL_CAP;
        const isUnlocked = (progressManager ? progressManager.isLevelUnlocked(levelId) : levelId === 1) && !demoLocked;

        if (!isUnlocked) {
            console.log(`[MainMenuUI] 关卡 ${levelId} 未解锁`);
            return;
        }

        if (this.isLoadingScene) return;
        this.isLoadingScene = true;

        // 🔥 如果是新游戏，重置钱包
        if (this.isNewGame) {
            const progressManager = GameProgressManager.instance;
            if (progressManager) {
                // 新游戏需要清空进度（包含 tutorialCompleted）
                progressManager.resetProgress();
                console.log('[MainMenuUI] 🆕 新游戏 - 进度已重置');
            }
            const inventory = InventoryManager.instance;
            if (inventory) {
                inventory.resetToDefault();
                console.log('[MainMenuUI] 💰 新游戏 - 钱包已重置为1000');
            }
            this.isNewGame = false;  // 重置标记
        }

        // 🔥 每次选择关卡都必须调用 initLevel 初始化关卡库存
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.initLevel(levelId);
            console.log(`[MainMenuUI] 🔥 初始化关卡 ${levelId} 完成`);
        }

        // 开始关卡
        if (progressManager) {
            progressManager.startLevel(levelId);
        }

        console.log(`[MainMenuUI] 开始关卡 ${levelId}`);
        this.hideLevelSelectPanel();

        this.scheduleOnce(() => {
            SceneRouteService.goShop();
        }, 0.3);
    }
    
    // ==================== 存档选择面板 ====================
    private saveSelectPanel: Node = null;
    
    /**
     * 显示存档选择面板
     */
    private showSaveSelectPanel() {
        if (!this.saveSelectPanel) {
            this.createSaveSelectPanel();
        }
        this.saveSelectPanel.active = true;
        this.updateSaveList();
        
        // 淡入动画
        const opacity = this.saveSelectPanel.getComponent(UIOpacity) || this.saveSelectPanel.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(opacity).to(0.2, { opacity: 255 }).start();
    }
    
    /**
     * 隐藏存档选择面板
     */
    private hideSaveSelectPanel() {
        if (this.saveSelectPanel) {
            const opacity = this.saveSelectPanel.getComponent(UIOpacity);
            if (opacity) {
                tween(opacity).to(0.2, { opacity: 0 }).call(() => {
                    this.saveSelectPanel.active = false;
                }).start();
            } else {
                this.saveSelectPanel.active = false;
            }
        }
    }
    
    /**
     * 创建存档选择面板（扁平化设计）
     */
    private createSaveSelectPanel() {
        const canvas = this.getOverlayHost();
        if (!canvas) return;
        
        const panelWidth = 500;
        const panelHeight = 450;
        
        this.saveSelectPanel = new Node('SaveSelectPanel');
        this.saveSelectPanel.addComponent(UITransform).setContentSize(panelWidth, panelHeight);
        this.saveSelectPanel.addComponent(UIOpacity);
        canvas.addChild(this.saveSelectPanel);
        this.saveSelectPanel.setPosition(0, 0, 0);
        
        // 遮罩
        const mask = new Node('Mask');
        mask.addComponent(UITransform).setContentSize(2000, 2000);
        const maskGraphics = mask.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 180);
        maskGraphics.rect(-1000, -1000, 2000, 2000);
        maskGraphics.fill();
        mask.addComponent(Button);
        mask.on(Node.EventType.TOUCH_END, () => this.hideSaveSelectPanel());
        this.saveSelectPanel.addChild(mask);
        
        // 面板背景
        const panelBg = new Node('PanelBg');
        panelBg.addComponent(UITransform).setContentSize(panelWidth, panelHeight);
        const bgGraphics = panelBg.addComponent(Graphics);
        bgGraphics.fillColor = new Color(248, 249, 250, 255);
        bgGraphics.roundRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 20);
        bgGraphics.fill();
        this.saveSelectPanel.addChild(panelBg);
        
        // 标题栏
        const titleBar = new Node('TitleBar');
        const titleBarGraphics = titleBar.addComponent(Graphics);
        titleBarGraphics.fillColor = new Color(255, 255, 255, 255);
        titleBarGraphics.roundRect(-panelWidth/2, 0, panelWidth, 50, 0);
        titleBarGraphics.fill();
        titleBar.setPosition(0, panelHeight/2 - 25, 0);
        this.saveSelectPanel.addChild(titleBar);
        
        // 标题
        const titleLabel = new Node('TitleLabel');
        const title = titleLabel.addComponent(Label);
        title.string = '💾 选择存档';
        title.fontSize = 22;
        title.color = new Color(33, 37, 41, 255);
        title.isBold = true;
        titleBar.addChild(titleLabel);
        
        // 关闭按钮
        const closeBtn = this.createFlatButton('✕', panelWidth/2 - 35, 0, 36, 36, new Color(220, 53, 69, 255));
        closeBtn.on(Node.EventType.TOUCH_END, () => this.hideSaveSelectPanel());
        titleBar.addChild(closeBtn);
        
        // ========== 滚动视图 ==========
        const scrollViewHeight = panelHeight - 80;  // 减去标题栏高度
        const scrollViewWidth = panelWidth - 40;
        
        // ScrollView节点
        const scrollViewNode = new Node('ScrollView');
        scrollViewNode.addComponent(UITransform).setContentSize(scrollViewWidth, scrollViewHeight);
        scrollViewNode.setPosition(0, -40, 0);
        this.saveSelectPanel.addChild(scrollViewNode);
        
        // 添加ScrollView组件
        const scrollView = scrollViewNode.addComponent(ScrollView);
        scrollView.horizontal = false;
        scrollView.vertical = true;
        scrollView.bounceDuration = 0.3;
        scrollView.brake = 0.75;
        
        // 添加Mask裁剪内容
        scrollViewNode.addComponent(Mask);
        
        // 内容容器
        const content = new Node('Content');
        const contentTransform = content.addComponent(UITransform);
        contentTransform.setContentSize(scrollViewWidth, scrollViewHeight);
        contentTransform.anchorX = 0.5;
        contentTransform.anchorY = 1;  // 锚点在顶部
        content.setPosition(0, scrollViewHeight/2, 0);
        scrollViewNode.addChild(content);
        
        scrollView.content = content;
        
        // ========== 右侧滚动条 ==========
        const scrollBarNode = new Node('VerticalScrollBar');
        scrollBarNode.addComponent(UITransform).setContentSize(8, scrollViewHeight - 20);
        scrollBarNode.setPosition(scrollViewWidth/2 + 8, 0, 0);
        scrollViewNode.addChild(scrollBarNode);
        
        // 滚动条背景
        const barBgGraphics = scrollBarNode.addComponent(Graphics);
        barBgGraphics.fillColor = new Color(220, 220, 220, 255);
        barBgGraphics.roundRect(-4, -(scrollViewHeight-20)/2, 8, scrollViewHeight - 20, 4);
        barBgGraphics.fill();
        
        // 滚动条滑块
        const barHandle = new Node('Handle');
        barHandle.addComponent(UITransform).setContentSize(8, 60);
        const barHandleSprite = barHandle.addComponent(Sprite);
        barHandleSprite.color = new Color(150, 150, 150, 255);
        barHandleSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        scrollBarNode.addChild(barHandle);
        
        // 创建ScrollBar组件
        const scrollBar = scrollBarNode.addComponent(ScrollBar);
        scrollBar.direction = ScrollBar.Direction.VERTICAL;
        scrollBar.handle = barHandleSprite;
        scrollBar.enableAutoHide = false;
        
        scrollView.verticalScrollBar = scrollBar;
        
        this.saveSelectPanel.active = false;
    }
    
    /**
     * 更新存档列表（支持滚动）
     */
    private updateSaveList() {
        if (!this.saveSelectPanel) return;
        
        // 查找ScrollView下的Content节点
        const scrollViewNode = this.saveSelectPanel.getChildByName('ScrollView');
        if (!scrollViewNode) return;
        
        const content = scrollViewNode.getChildByName('Content');
        if (!content) return;
        
        content.removeAllChildren();
        
        const saves = SaveManager.listSaves();
        const itemHeight = 70;
        const spacing = 10;
        const scrollViewWidth = 460;
        
        if (saves.length === 0) {
            const emptyLabel = new Node('EmptyLabel');
            const label = emptyLabel.addComponent(Label);
            label.string = '暂无存档';
            label.fontSize = 18;
            label.color = new Color(108, 117, 125, 255);
            content.addChild(emptyLabel);
            return;
        }
        
        // 计算内容总高度
        const totalHeight = saves.length * (itemHeight + spacing) + spacing;
        const contentTransform = content.getComponent(UITransform);
        if (contentTransform) {
            contentTransform.setContentSize(scrollViewWidth, Math.max(totalHeight, 370));
        }
        
        // 创建存档项（从上往下排列）
        saves.forEach((save, index) => {
            const yPos = -spacing - itemHeight/2 - index * (itemHeight + spacing);
            const item = this.createSaveItem(save, 0, yPos);
            content.addChild(item);
        });
    }
    
    /**
     * 创建存档列表项
     */
    private createSaveItem(save: SaveData, x: number, y: number): Node {
        const item = new Node('SaveItem');
        item.setPosition(x, y, 0);
        
        const itemWidth = 420;
        const itemHeight = 65;
        
        item.addComponent(UITransform).setContentSize(itemWidth, itemHeight);
        
        // 背景
        const bg = item.addComponent(Graphics);
        const bgColor = save.saveType === 'auto' ? new Color(232, 244, 253, 255) : new Color(232, 253, 240, 255);
        bg.fillColor = bgColor;
        bg.roundRect(-itemWidth/2, -itemHeight/2, itemWidth, itemHeight, 10);
        bg.fill();
        
        // 存档名称
        const nameLabel = new Node('Name');
        const name = nameLabel.addComponent(Label);
        const icon = save.saveType === 'auto' ? '🔄' : '💾';
        name.string = `${icon} ${save.saveName}`;
        name.fontSize = 15;
        name.color = new Color(33, 37, 41, 255);
        name.isBold = true;
        nameLabel.setPosition(-itemWidth/2 + 120, 12, 0);
        item.addChild(nameLabel);
        
        // 存档信息
        const infoLabel = new Node('Info');
        const info = infoLabel.addComponent(Label);
        const date = new Date(save.timestamp);
        info.string = `💰${save.playerData.totalMoney} · 关卡${save.playerData.currentLevel} · ${date.toLocaleDateString('zh-CN')}`;
        info.fontSize = 11;
        info.color = new Color(108, 117, 125, 255);
        infoLabel.setPosition(-itemWidth/2 + 120, -12, 0);
        item.addChild(infoLabel);
        
        // 加载按钮
        const loadBtn = this.createFlatButton('加载', itemWidth/2 - 45, 0, 70, 35, new Color(40, 167, 69, 255));
        loadBtn.on(Node.EventType.TOUCH_END, () => {
            this.loadFromSave(save);
        });
        item.addChild(loadBtn);
        
        return item;
    }
    
    /**
     * 从存档加载
     */
    private loadFromSave(save: SaveData) {
        if (this.isLoadingScene) return;
        this.isLoadingScene = true;
        
        console.log('[MainMenuUI] 加载存档:', save.saveName);

        if (save.snapshot) {
            SaveManager.applySnapshot(save.snapshot);
        } else {
            // 兼容旧存档：仅应用基础字段
            const progressManager = GameProgressManager.instance;
            if (progressManager) {
                progressManager.progress.currentLevel = save.playerData.currentLevel;
                progressManager.progress.totalMoney = save.playerData.totalMoney;
                progressManager.progress.unlockedLevels = save.playerData.unlockedLevels;
                progressManager.progress.completedLevels = save.playerData.completedLevels;
                progressManager.saveProgress();
            }

            const inventory = InventoryManager.instance;
            if (inventory) {
                inventory.setWallet(save.playerData.totalMoney);
                inventory.initLevel(save.playerData.currentLevel);
                console.log(`[MainMenuUI] 💰 从存档加载钱包: ${save.playerData.totalMoney}, 关卡: ${save.playerData.currentLevel}`);
            }
        }

        if (FeatureGate.ENABLE_WORLD_SINGLE_FLOW) {
            const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
            world.progress.totalMoney = save.playerData.totalMoney;
            world.refreshMapUnlocksByMoney(false);
            world.enterMap(world.progress.currentMapId);

            const inventory = InventoryManager.instance;
            if (inventory) {
                inventory.setWallet(save.playerData.totalMoney);
                inventory.initLevel(1);
                inventory.saveLevelState();
            }
        }
        
        this.hideSaveSelectPanel();
        
        this.scheduleOnce(() => {
            SceneRouteService.goShop();
        }, 0.3);
    }
    
    /**
     * 创建扁平化按钮
     */
    private createFlatButton(text: string, x: number, y: number, width: number, height: number, color: Color): Node {
        const btn = new Node('FlatButton');
        btn.setPosition(x, y, 0);
        btn.addComponent(UITransform).setContentSize(width, height);
        
        const graphics = btn.addComponent(Graphics);
        (btn as any).__baseColor = color;
        this.redrawFlatButton(btn, color);
        
        const label = new Node('Label');
        const labelComp = label.addComponent(Label);
        labelComp.string = text;
        labelComp.fontSize = 14;
        labelComp.color = new Color(255, 255, 255, 255);
        labelComp.isBold = true;
        btn.addChild(label);
        
        btn.addComponent(Button);
        
        // 按压效果
        btn.on(Node.EventType.TOUCH_START, () => {
            const base = (btn as any).__baseColor as Color;
            this.redrawFlatButton(btn, new Color(base.r * 0.8, base.g * 0.8, base.b * 0.8, 255));
        });
        btn.on(Node.EventType.TOUCH_END, () => {
            const base = (btn as any).__baseColor as Color;
            this.redrawFlatButton(btn, base);
        });
        btn.on(Node.EventType.TOUCH_CANCEL, () => {
            const base = (btn as any).__baseColor as Color;
            this.redrawFlatButton(btn, base);
        });
        
        return btn;
    }

    private redrawFlatButton(btn: Node, color: Color) {
        const graphics = btn.getComponent(Graphics);
        const size = btn.getComponent(UITransform)?.contentSize;
        if (!graphics || !size) return;
        graphics.clear();
        graphics.fillColor = color;
        graphics.roundRect(-size.width / 2, -size.height / 2, size.width, size.height, 6);
        graphics.fill();
    }

    private setFlatButtonState(btn: Node, active: boolean) {
        const baseColor = active ? new Color(0, 123, 255, 255) : new Color(233, 236, 239, 255);
        (btn as any).__baseColor = baseColor;
        this.redrawFlatButton(btn, baseColor);
        const label = btn.getChildByName('Label')?.getComponent(Label);
        if (label) {
            label.color = active ? new Color(255, 255, 255, 255) : new Color(33, 37, 41, 255);
        }
    }

    private updateResolutionButtons() {
        if (!this.dynamicSettingsPanel) return;
        const displaySection = this.dynamicSettingsPanel.getChildByName('DisplaySection');
        if (!displaySection) return;
        const resRow = displaySection.getChildByName('ResolutionRow');
        const resContainer = resRow?.getChildByName('ResolutionBtnContainer');
        if (!resContainer) return;

        const saved = DisplayManager.getSavedResolution();
        const design = view.getDesignResolutionSize();
        const current = saved ?? { width: design.width, height: design.height };

        for (const btn of resContainer.children) {
            const match = btn.name === `Res_${current.width}x${current.height}`;
            this.setFlatButtonState(btn, match);
        }
    }

    private updateFullscreenButtons() {
        if (!this.dynamicSettingsPanel) return;
        const displaySection = this.dynamicSettingsPanel.getChildByName('DisplaySection');
        if (!displaySection) return;
        const fsRow = displaySection.getChildByName('FullscreenRow');
        const fsContainer = fsRow?.getChildByName('FullscreenBtnContainer');
        if (!fsContainer) return;

        const saved = sys.localStorage.getItem('display_fullscreen');
        const isFullscreen = saved ? saved === 'true' : screen.fullScreen;

        const windowBtn = fsContainer.getChildByName('WindowBtn');
        const fullscreenBtn = fsContainer.getChildByName('FullscreenBtn');
        if (windowBtn) this.setFlatButtonState(windowBtn, !isFullscreen);
        if (fullscreenBtn) this.setFlatButtonState(fullscreenBtn, isFullscreen);
    }

    /**
     * 初始化语言按钮和事件
     */
    private initLanguagePanel() {
        if (!this.settingsPanel) return;
        const panel = this.settingsPanel.getChildByName('Panel');
        const content = panel?.getChildByName('Content');
        const languageSection = content?.getChildByName('LanguageSection');
        const row = languageSection?.getChildByName('LanguageRow');
        if (row) {
            const zhNode = row.getChildByName('ZhButton');
            if (zhNode) {
                this.languageZhBtn = zhNode.getComponent(Button);
                this.languageZhBg = zhNode.getComponent(Sprite);
                this.languageZhBtn?.node.on(Button.EventType.CLICK, () => this.onSelectLanguage('zh'), this);
            }

            const enNode = row.getChildByName('EnButton');
            if (enNode) {
                this.languageEnBtn = enNode.getComponent(Button);
                this.languageEnBg = enNode.getComponent(Sprite);
                this.languageEnBtn?.node.on(Button.EventType.CLICK, () => this.onSelectLanguage('en'), this);
            }
        }

        const closeBtnNode = panel?.getChildByName('CloseButton');
        const closeBtn = closeBtnNode?.getComponent(Button);
        closeBtn?.node.on(Button.EventType.CLICK, this.hideSettingsPanel, this);
        const closeLabelNode = closeBtnNode?.getChildByName('Label');
        if (closeLabelNode) {
            const labelBtn = closeLabelNode.getComponent(Button) ?? closeLabelNode.addComponent(Button);
            labelBtn.target = closeBtnNode!;
            labelBtn.node.on(Button.EventType.CLICK, this.hideSettingsPanel, this);
        }
    }

    private onSelectLanguage(language: 'zh' | 'en') {
        this.currentLanguage = language;
        this.updateLanguageVisuals();
        this.saveLanguagePreference();
        // 立即应用语言变化到所有UI文本
        this.applyLanguageTexts();
        this.updateSettingsPanelTexts();
        console.log('[MainMenuUI] 语言已切换为:', language === 'zh' ? '中文' : 'English');
    }

    /**
     * 更新设置面板内的文本
     */
    private updateSettingsPanelTexts() {
        if (!this.settingsPanel) return;
        
        const panel = this.settingsPanel.getChildByName('Panel');
        if (!panel) return;

        // 更新标题
        const titleNode = panel.getChildByName('Title');
        if (titleNode) {
            const titleLabel = titleNode.getComponent(Label);
            if (titleLabel) {
                titleLabel.string = this.t('settings.title', '设置', 'Settings');
            }
        }

        // 更新关闭按钮
        const closeBtn = panel.getChildByName('CloseButton');
        const closeBtnLabel = closeBtn?.getChildByName('Label')?.getComponent(Label);
        if (closeBtnLabel) {
            closeBtnLabel.string = this.t('settings.close', '✕', '✕');
        }

        const content = panel.getChildByName('Content');
        
        // 更新语言区域
        const languageSection = content?.getChildByName('LanguageSection');
        
        // 语言标题
        const langTitle = languageSection?.getChildByName('LanguageTitle')?.getComponent(Label);
        if (langTitle) {
            langTitle.string = this.t('settings.language', '选择语言', 'Select Language');
        }

        // 语言提示
        const langHint = languageSection?.getChildByName('LanguageHint')?.getComponent(Label);
        if (langHint) {
            langHint.string = this.t('settings.languageHint', '切换语言后立即生效', 'Changes take effect immediately');
        }

        // 更新音量区域
        const volumeSection = content?.getChildByName('VolumeSection');
        
        // 音量标题
        const volTitle = volumeSection?.getChildByName('VolumeTitle')?.getComponent(Label);
        if (volTitle) {
            volTitle.string = this.t('settings.volume', '音量设置', 'Volume Settings');
        }

        // BGM 标签
        const bgmRow = volumeSection?.getChildByName('BGMRow');
        const bgmLabel = bgmRow?.getChildByName('BGMLabel')?.getComponent(Label);
        if (bgmLabel) {
            bgmLabel.string = this.t('settings.bgm', '背景音乐', 'Music');
        }

        // SFX 标签
        const sfxRow = volumeSection?.getChildByName('SFXRow');
        const sfxLabel = sfxRow?.getChildByName('SFXLabel')?.getComponent(Label);
        if (sfxLabel) {
            sfxLabel.string = this.t('settings.sfx', '音效', 'Sound FX');
        }
    }

    private updateLanguageVisuals() {
        if (this.languageZhBg) {
            this.languageZhBg.color = this.currentLanguage === 'zh' ? this.languageActiveColor : this.languageInactiveColor;
        }
        if (this.languageEnBg) {
            this.languageEnBg.color = this.currentLanguage === 'en' ? this.languageActiveColor : this.languageInactiveColor;
        }
    }

    private loadLanguagePreference() {
        const saved = sys.localStorage.getItem(this.languageStorageKey);
        this.currentLanguage = saved === 'en' ? 'en' : 'zh';
    }

    private saveLanguagePreference() {
        sys.localStorage.setItem(this.languageStorageKey, this.currentLanguage);
    }

    /**
     * 简单多语言工具
     */
    private t(key: string, zh: string, en: string): string {
        return this.currentLanguage === 'zh' ? zh : en;
    }

    /**
     * 应用主菜单文案（标题、按钮）- 使用统一UI风格
     */
    private applyLanguageTexts() {
        const isZh = this.currentLanguage === 'zh';

        const hasBrandTitleArt = !!this.mainTitleArtNode && !!this.subTitleArtNode;
        if (hasBrandTitleArt) {
            this.mainTitleArtNode!.active = true;
            this.subTitleArtNode!.active = true;
            if (this.titleLabel?.node) {
                this.titleLabel.node.active = false;
            }
        } else if (this.titleLabel) {
            this.titleLabel.node.active = true;
            this.titleLabel.string = '烤冷面物语\n冷面人生';
            this.titleLabel.color = UIColors.textGold;
            this.titleLabel.isBold = true;
        }

        // 工具函数：设置按钮上的 Label
        const setBtnLabel = (btn: Button | null, zh: string, en: string) => {
            if (!btn || !btn.node) return;
            const labelNode = btn.node.getChildByName('Label');
            const label = labelNode?.getComponent(Label);
            if (label) {
                label.string = isZh ? zh : en;
            }
        };

        setBtnLabel(this.startBtn, '开始游戏', 'Start Game');
        setBtnLabel(this.continueBtn, '继续游戏', 'Continue');
        setBtnLabel(this.loadSaveBtn, '存档', 'Saves');
        setBtnLabel(this.settingsBtn, '设置', 'Settings');
        setBtnLabel(this.quitBtn, '退出游戏', 'Quit');
    }

    /**
     * 初始化音量控制面板
     */
    private initVolumePanel() {
        if (!this.settingsPanel) return;
        
        const panel = this.settingsPanel.getChildByName('Panel');
        const content = panel?.getChildByName('Content');
        const volumeSection = content?.getChildByName('VolumeSection');
        
        if (!volumeSection) {
            console.warn('[MainMenuUI] VolumeSection not found');
            return;
        }

        // BGM 滑块
        const bgmRow = volumeSection.getChildByName('BGMRow');
        if (bgmRow) {
            const bgmSliderNode = bgmRow.getChildByName('BGMSlider');
            if (bgmSliderNode) {
                this.bgmSlider = bgmSliderNode.getComponent(Slider);
                if (this.bgmSlider) {
                    // 设置 handle 指向 Handle 节点的 Sprite 组件
                    const handleNode = bgmSliderNode.getChildByName('Handle');
                    if (handleNode) {
                        const handleSprite = handleNode.getComponent(Sprite);
                        if (handleSprite) {
                            this.bgmSlider.handle = handleSprite;
                        }
                    }
                    this.bgmSlider.progress = this.bgmVolume;
                    bgmSliderNode.on('slide', this.onBGMSliderChange, this);
                }
            }
            const bgmValueNode = bgmRow.getChildByName('BGMValue');
            if (bgmValueNode) {
                this.bgmValueLabel = bgmValueNode.getComponent(Label);
            }
        }

        // SFX 滑块
        const sfxRow = volumeSection.getChildByName('SFXRow');
        if (sfxRow) {
            const sfxSliderNode = sfxRow.getChildByName('SFXSlider');
            if (sfxSliderNode) {
                this.sfxSlider = sfxSliderNode.getComponent(Slider);
                if (this.sfxSlider) {
                    // 设置 handle 指向 Handle 节点的 Sprite 组件
                    const handleNode = sfxSliderNode.getChildByName('Handle');
                    if (handleNode) {
                        const handleSprite = handleNode.getComponent(Sprite);
                        if (handleSprite) {
                            this.sfxSlider.handle = handleSprite;
                        }
                    }
                    this.sfxSlider.progress = this.sfxVolume;
                    sfxSliderNode.on('slide', this.onSFXSliderChange, this);
                }
            }
            const sfxValueNode = sfxRow.getChildByName('SFXValue');
            if (sfxValueNode) {
                this.sfxValueLabel = sfxValueNode.getComponent(Label);
            }
        }

        this.updateVolumeLabels();
    }

    /**
     * BGM 滑块变化回调
     */
    private onBGMSliderChange(slider: Slider) {
        this.bgmVolume = slider.progress;
        this.updateVolumeLabels();
        this.saveVolumeSettings();
        console.log('[MainMenuUI] BGM音量:', Math.round(this.bgmVolume * 100) + '%');
    }

    /**
     * SFX 滑块变化回调
     */
    private onSFXSliderChange(slider: Slider) {
        this.sfxVolume = slider.progress;
        this.updateVolumeLabels();
        this.saveVolumeSettings();
        console.log('[MainMenuUI] SFX音量:', Math.round(this.sfxVolume * 100) + '%');
    }

    /**
     * 更新音量显示标签
     */
    private updateVolumeLabels() {
        if (this.bgmValueLabel) {
            this.bgmValueLabel.string = Math.round(this.bgmVolume * 100) + '%';
        }
        if (this.sfxValueLabel) {
            this.sfxValueLabel.string = Math.round(this.sfxVolume * 100) + '%';
        }
    }

    /**
     * 加载音量设置
     */
    private loadVolumeSettings() {
        const saved = sys.localStorage.getItem(this.volumeStorageKey);
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.bgmVolume = settings.bgm ?? 0.5;
                this.sfxVolume = settings.sfx ?? 0.8;
            } catch (e) {
                console.warn('[MainMenuUI] 音量设置解析失败');
            }
        }
    }

    /**
     * 保存音量设置
     */
    private saveVolumeSettings() {
        const settings = {
            bgm: this.bgmVolume,
            sfx: this.sfxVolume
        };
        sys.localStorage.setItem(this.volumeStorageKey, JSON.stringify(settings));
    }
}
