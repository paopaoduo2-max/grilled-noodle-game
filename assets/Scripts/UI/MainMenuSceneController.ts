import { _decorator, Button, Color, Component, Label, Node, Slider, Sprite, UIOpacity, director } from 'cc';
import { GameProgressManager } from '../Manager/GameProgressManager';
import { InventoryManager } from '../Manager/InventoryManager';
import { SaveData, SaveManager } from '../Manager/SaveManager';
import { GameSettings, SettingsManager } from '../Manager/SettingsManager';
import { SceneRouteService } from '../Manager/SceneRouteService';

const { ccclass, property } = _decorator;

type DisplayMode = GameSettings['display']['mode'];
type ResolutionPreset = GameSettings['display']['resolution'];
type UIScalePreset = GameSettings['display']['uiScale'];
type QualityPreset = GameSettings['graphics']['quality'];
type FrameRatePreset = GameSettings['graphics']['frameRate'];
type LanguagePreset = GameSettings['game']['language'];

@ccclass('MainMenuSceneController')
export class MainMenuSceneController extends Component {
    @property(Label)
    mainTitleLabel: Label | null = null;

    @property(Label)
    subTitleLabel: Label | null = null;

    @property(Button)
    startButton: Button | null = null;

    @property(Button)
    continueButton: Button | null = null;

    @property(Button)
    quitButton: Button | null = null;

    @property(Button)
    settingsButton: Button | null = null;

    @property(Node)
    settingsPanel: Node | null = null;

    @property(Slider)
    bgmSlider: Slider | null = null;

    @property(Slider)
    sfxSlider: Slider | null = null;

    @property(Slider)
    mouseSensitivitySlider: Slider | null = null;

    @property(Label)
    bgmValueLabel: Label | null = null;

    @property(Label)
    sfxValueLabel: Label | null = null;

    @property(Label)
    mouseSensitivityValueLabel: Label | null = null;

    private settings: GameSettings | null = null;
    private isSceneLoading = false;

    private readonly displayModeButtons: Record<DisplayMode, Button | null> = {
        windowed: null,
        borderless: null,
        fullscreen: null
    };

    private readonly resolutionButtons: Record<ResolutionPreset, Button | null> = {
        '1280x720': null,
        '1600x900': null,
        '1920x1080': null
    };

    private readonly uiScaleButtons: Record<UIScalePreset, Button | null> = {
        small: null,
        medium: null,
        large: null
    };

    private readonly qualityButtons: Record<QualityPreset, Button | null> = {
        low: null,
        medium: null,
        high: null
    };

    private readonly frameRateButtons: Record<string, Button | null> = {
        '30': null,
        '60': null,
        '0': null
    };

    private readonly languageButtons: Record<LanguagePreset, Button | null> = {
        zh: null,
        en: null
    };

    private readonly toggleButtons: Record<string, Button | null> = {
        showFPS: null,
        autoSave: null,
        showTips: null,
        showHotkeys: null,
        touchFeedback: null
    };

    private applyButton: Button | null = null;
    private resetButton: Button | null = null;
    private closeButton: Button | null = null;

    onLoad() {
        this.resolveReferences();
        this.settings = SettingsManager.loadSettings();
        this.applyStaticTexts();
        this.bindButtons();
        this.applySettingsValues();
        this.refreshContinueButton();
    }

    private findNodeByPath(path: string): Node | null {
        if (!path) {
            return null;
        }

        const segments = path.split('/').filter(Boolean);
        let current: Node | null = this.node;
        for (const segment of segments) {
            current = current?.getChildByName(segment) ?? null;
            if (!current) {
                return null;
            }
        }
        return current;
    }

    private resolveReferences() {
        const find = (path: string) => this.findNodeByPath(path);
        const first = (paths: string[]) => {
            for (const path of paths) {
                const node = find(path);
                if (node) return node;
            }
            return null;
        };

        this.mainTitleLabel = first(['TitleRoot/MainTitle', 'TitleRoot/Title_Logo'])?.getComponent(Label) || null;
        this.subTitleLabel = first(['TitleRoot/SubTitle'])?.getComponent(Label) || null;

        this.startButton = first(['MenuRoot/StartButton'])?.getComponent(Button) || null;
        this.continueButton = first(['MenuRoot/ContinueButton'])?.getComponent(Button) || null;
        this.quitButton = first(['MenuRoot/QuitButton'])?.getComponent(Button) || null;
        this.settingsButton = first(['TopRightRoot/SettingsButton'])?.getComponent(Button) || null;
        this.settingsPanel = first(['OverlayRoot/SettingsPanel']) || null;

        this.bgmSlider = first(['OverlayRoot/SettingsPanel/Panel/AudioSection/BgmRow/BgmSlider'])?.getComponent(Slider) || null;
        this.sfxSlider = first(['OverlayRoot/SettingsPanel/Panel/AudioSection/SfxRow/SfxSlider'])?.getComponent(Slider) || null;
        this.mouseSensitivitySlider = first(['OverlayRoot/SettingsPanel/Panel/AssistSection/MouseSensitivityRow/MouseSensitivitySlider'])?.getComponent(Slider) || null;

        this.bgmValueLabel = first(['OverlayRoot/SettingsPanel/Panel/AudioSection/BgmRow/BgmValue'])?.getComponent(Label) || null;
        this.sfxValueLabel = first(['OverlayRoot/SettingsPanel/Panel/AudioSection/SfxRow/SfxValue'])?.getComponent(Label) || null;
        this.mouseSensitivityValueLabel = first(['OverlayRoot/SettingsPanel/Panel/AssistSection/MouseSensitivityRow/MouseSensitivityValue'])?.getComponent(Label) || null;

        this.displayModeButtons.windowed = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/DisplayModeRow/WindowOption'])?.getComponent(Button) || null;
        this.displayModeButtons.borderless = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/DisplayModeRow/BorderlessOption'])?.getComponent(Button) || null;
        this.displayModeButtons.fullscreen = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/DisplayModeRow/FullscreenOption'])?.getComponent(Button) || null;

        this.resolutionButtons['1280x720'] = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/ResolutionRow/Res720Option'])?.getComponent(Button) || null;
        this.resolutionButtons['1600x900'] = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/ResolutionRow/Res900Option'])?.getComponent(Button) || null;
        this.resolutionButtons['1920x1080'] = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/ResolutionRow/Res1080Option'])?.getComponent(Button) || null;

        this.uiScaleButtons.small = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/UIScaleRow/ScaleSmallOption'])?.getComponent(Button) || null;
        this.uiScaleButtons.medium = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/UIScaleRow/ScaleMediumOption'])?.getComponent(Button) || null;
        this.uiScaleButtons.large = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/UIScaleRow/ScaleLargeOption'])?.getComponent(Button) || null;

        this.qualityButtons.low = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/QualityRow/QualityLowOption'])?.getComponent(Button) || null;
        this.qualityButtons.medium = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/QualityRow/QualityMediumOption'])?.getComponent(Button) || null;
        this.qualityButtons.high = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/QualityRow/QualityHighOption'])?.getComponent(Button) || null;

        this.frameRateButtons['30'] = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/FrameRateRow/Fps30Option'])?.getComponent(Button) || null;
        this.frameRateButtons['60'] = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/FrameRateRow/Fps60Option'])?.getComponent(Button) || null;
        this.frameRateButtons['0'] = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/FrameRateRow/FpsUnlimitedOption'])?.getComponent(Button) || null;

        this.languageButtons.zh = first(['OverlayRoot/SettingsPanel/Panel/AudioSection/LanguageRow/LangZhOption'])?.getComponent(Button) || null;
        this.languageButtons.en = first(['OverlayRoot/SettingsPanel/Panel/AudioSection/LanguageRow/LangEnOption'])?.getComponent(Button) || null;

        this.toggleButtons.showFPS = first(['OverlayRoot/SettingsPanel/Panel/AssistSection/ShowFPSRow/ToggleButton'])?.getComponent(Button) || null;
        this.toggleButtons.autoSave = first(['OverlayRoot/SettingsPanel/Panel/AssistSection/AutoSaveRow/ToggleButton'])?.getComponent(Button) || null;
        this.toggleButtons.showTips = first(['OverlayRoot/SettingsPanel/Panel/AssistSection/ShowTipsRow/ToggleButton'])?.getComponent(Button) || null;
        this.toggleButtons.showHotkeys = first(['OverlayRoot/SettingsPanel/Panel/AssistSection/ShowHotkeysRow/ToggleButton'])?.getComponent(Button) || null;
        this.toggleButtons.touchFeedback = first(['OverlayRoot/SettingsPanel/Panel/AssistSection/TouchFeedbackRow/ToggleButton'])?.getComponent(Button) || null;

        this.applyButton = first(['OverlayRoot/SettingsPanel/Panel/DisplaySection/ApplyRow/ApplyButton'])?.getComponent(Button) || null;
        this.resetButton = first(['OverlayRoot/SettingsPanel/Panel/ActionRow/ResetButton'])?.getComponent(Button) || null;
        this.closeButton = first(['OverlayRoot/SettingsPanel/Panel/ActionRow/CloseButton'])?.getComponent(Button) || null;
    }

    private applyStaticTexts() {
        if (this.mainTitleLabel) {
            this.mainTitleLabel.string = '烤冷面物语';
        }
        if (this.subTitleLabel) {
            this.subTitleLabel.string = '冷面人生';
        }

        this.setButtonLabel(this.startButton, '开始游戏');
        this.setButtonLabel(this.continueButton, '继续游戏');
        this.setButtonLabel(this.quitButton, '退出游戏');
        this.setButtonLabel(this.settingsButton, '设置');

        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/SettingsPanel_Title', '设置');

        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/DisplaySection/SectionLabel', '显示');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/DisplaySection/DisplayModeRow/RowLabel', '显示模式');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/DisplaySection/ResolutionRow/RowLabel', '分辨率');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/DisplaySection/UIScaleRow/RowLabel', 'UI 缩放');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/DisplaySection/QualityRow/RowLabel', '画质');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/DisplaySection/FrameRateRow/RowLabel', '帧率');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/DisplaySection/ApplyRow/ApplyHint', '显示设置修改后统一点“应用”，若 10 秒内未确认则自动回退。');
        this.setButtonLabel(this.applyButton, '应用');

        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/AudioSection/SectionLabel', '音频与语言');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/AudioSection/BgmRow/RowLabel', '音乐');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/AudioSection/SfxRow/RowLabel', '音效');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/AudioSection/LanguageRow/RowLabel', '语言');

        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/AssistSection/SectionLabel', '辅助');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/AssistSection/ShowFPSRow/RowLabel', '显示 FPS');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/AssistSection/AutoSaveRow/RowLabel', '自动存档');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/AssistSection/ShowTipsRow/RowLabel', '新手提示');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/AssistSection/ShowHotkeysRow/RowLabel', '热键提示');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/AssistSection/MouseSensitivityRow/RowLabel', '鼠标灵敏度');
        this.setLabelByPath('OverlayRoot/SettingsPanel/Panel/AssistSection/TouchFeedbackRow/RowLabel', '触控反馈');

        this.setButtonLabel(this.displayModeButtons.windowed, '窗口');
        this.setButtonLabel(this.displayModeButtons.borderless, '无边框');
        this.setButtonLabel(this.displayModeButtons.fullscreen, '全屏');
        this.setButtonLabel(this.resolutionButtons['1280x720'], '1280×720');
        this.setButtonLabel(this.resolutionButtons['1600x900'], '1600×900');
        this.setButtonLabel(this.resolutionButtons['1920x1080'], '1920×1080');
        this.setButtonLabel(this.uiScaleButtons.small, '小');
        this.setButtonLabel(this.uiScaleButtons.medium, '中');
        this.setButtonLabel(this.uiScaleButtons.large, '大');
        this.setButtonLabel(this.qualityButtons.low, '低');
        this.setButtonLabel(this.qualityButtons.medium, '中');
        this.setButtonLabel(this.qualityButtons.high, '高');
        this.setButtonLabel(this.frameRateButtons['30'], '30');
        this.setButtonLabel(this.frameRateButtons['60'], '60');
        this.setButtonLabel(this.frameRateButtons['0'], '无限');
        this.setButtonLabel(this.languageButtons.zh, '简中');
        this.setButtonLabel(this.languageButtons.en, 'English');
        this.setButtonLabel(this.resetButton, '恢复默认');
        this.setButtonLabel(this.closeButton, '关闭');
    }

    private bindButtons() {
        this.bindClick(this.startButton, this.onStartGame);
        this.bindClick(this.continueButton, this.onContinueGame);
        this.bindClick(this.quitButton, this.onQuitGame);
        this.bindClick(this.settingsButton, this.onOpenSettings);
        this.bindClick(this.closeButton, this.onCloseSettings);
        this.bindClick(this.applyButton, this.onApplySettings);
        this.bindClick(this.resetButton, this.onResetSettings);

        this.bindOption(this.displayModeButtons.windowed, () => this.setDisplayMode('windowed'));
        this.bindOption(this.displayModeButtons.borderless, () => this.setDisplayMode('borderless'));
        this.bindOption(this.displayModeButtons.fullscreen, () => this.setDisplayMode('fullscreen'));

        this.bindOption(this.resolutionButtons['1280x720'], () => this.setResolution('1280x720'));
        this.bindOption(this.resolutionButtons['1600x900'], () => this.setResolution('1600x900'));
        this.bindOption(this.resolutionButtons['1920x1080'], () => this.setResolution('1920x1080'));

        this.bindOption(this.uiScaleButtons.small, () => this.setUIScale('small'));
        this.bindOption(this.uiScaleButtons.medium, () => this.setUIScale('medium'));
        this.bindOption(this.uiScaleButtons.large, () => this.setUIScale('large'));

        this.bindOption(this.qualityButtons.low, () => this.setQuality('low'));
        this.bindOption(this.qualityButtons.medium, () => this.setQuality('medium'));
        this.bindOption(this.qualityButtons.high, () => this.setQuality('high'));

        this.bindOption(this.frameRateButtons['30'], () => this.setFrameRate(30));
        this.bindOption(this.frameRateButtons['60'], () => this.setFrameRate(60));
        this.bindOption(this.frameRateButtons['0'], () => this.setFrameRate(0));

        this.bindOption(this.languageButtons.zh, () => this.setLanguage('zh'));
        this.bindOption(this.languageButtons.en, () => this.setLanguage('en'));

        this.bindOption(this.toggleButtons.showFPS, () => this.toggleBoolean('game', 'showFPS'));
        this.bindOption(this.toggleButtons.autoSave, () => this.toggleBoolean('game', 'autoSave'));
        this.bindOption(this.toggleButtons.showTips, () => this.toggleBoolean('game', 'showTips'));
        this.bindOption(this.toggleButtons.showHotkeys, () => this.toggleBoolean('controls', 'showHotkeys'));
        this.bindOption(this.toggleButtons.touchFeedback, () => this.toggleBoolean('controls', 'touchFeedback'));

        this.bgmSlider?.node.on('slide', this.onBgmSliderChanged, this);
        this.sfxSlider?.node.on('slide', this.onSfxSliderChanged, this);
        this.mouseSensitivitySlider?.node.on('slide', this.onMouseSensitivityChanged, this);
    }

    private refreshContinueButton() {
        if (!this.continueButton) return;
        const hasSave = SaveManager.listSaves().length > 0;
        this.continueButton.interactable = hasSave;

        const opacity = this.continueButton.node.getComponent(UIOpacity) || this.continueButton.node.addComponent(UIOpacity);
        opacity.opacity = hasSave ? 255 : 140;
    }

    private applySettingsValues() {
        if (!this.settings) return;

        if (this.settingsPanel) {
            this.settingsPanel.active = false;
        }

        if (this.bgmSlider) {
            this.bgmSlider.progress = this.settings.audio.bgmVolume / 100;
        }
        if (this.sfxSlider) {
            this.sfxSlider.progress = this.settings.audio.sfxVolume / 100;
        }
        if (this.mouseSensitivitySlider) {
            this.mouseSensitivitySlider.progress = (this.settings.controls.mouseSensitivity - 1) / 9;
        }

        this.syncValueLabels();
        this.refreshSelectionVisuals();
    }

    private refreshSelectionVisuals() {
        if (!this.settings) return;

        this.updateChoiceGroup(this.displayModeButtons, this.settings.display.mode);
        this.updateChoiceGroup(this.resolutionButtons, this.settings.display.resolution);
        this.updateChoiceGroup(this.uiScaleButtons, this.settings.display.uiScale);
        this.updateChoiceGroup(this.qualityButtons, this.settings.graphics.quality);
        this.updateChoiceGroup(this.frameRateButtons, String(this.settings.graphics.frameRate));
        this.updateChoiceGroup(this.languageButtons, this.settings.game.language);

        this.updateToggleButton(this.toggleButtons.showFPS, this.settings.game.showFPS);
        this.updateToggleButton(this.toggleButtons.autoSave, this.settings.game.autoSave);
        this.updateToggleButton(this.toggleButtons.showTips, this.settings.game.showTips);
        this.updateToggleButton(this.toggleButtons.showHotkeys, this.settings.controls.showHotkeys);
        this.updateToggleButton(this.toggleButtons.touchFeedback, this.settings.controls.touchFeedback);
    }

    private syncValueLabels() {
        const bgm = this.bgmSlider ? Math.round(this.bgmSlider.progress * 100) : (this.settings?.audio.bgmVolume ?? 70);
        const sfx = this.sfxSlider ? Math.round(this.sfxSlider.progress * 100) : (this.settings?.audio.sfxVolume ?? 80);
        const sensitivity = this.mouseSensitivitySlider
            ? Math.round(this.mouseSensitivitySlider.progress * 9) + 1
            : (this.settings?.controls.mouseSensitivity ?? 5);

        if (this.bgmValueLabel) {
            this.bgmValueLabel.string = `${bgm}%`;
        }
        if (this.sfxValueLabel) {
            this.sfxValueLabel.string = `${sfx}%`;
        }
        if (this.mouseSensitivityValueLabel) {
            this.mouseSensitivityValueLabel.string = `${sensitivity}`;
        }
    }

    private bindClick(button: Button | null, handler: () => void) {
        button?.node.on(Button.EventType.CLICK, handler, this);
    }

    private bindOption(button: Button | null, handler: () => void) {
        button?.node.on(Button.EventType.CLICK, handler, this);
    }

    private updateChoiceGroup(group: Record<string, Button | null>, activeKey: string) {
        Object.entries(group).forEach(([key, button]) => {
            this.updateChoiceButton(button, key === activeKey);
        });
    }

    private updateChoiceButton(button: Button | null, active: boolean) {
        const node = button?.node;
        if (!button || !node || !node.isValid) return;
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = active ? new Color(247, 226, 190, 255) : new Color(124, 82, 61, 180);
        }
        const label = node.getChildByName('Label')?.getComponent(Label);
        if (label) {
            label.color = active ? new Color(111, 63, 49, 255) : new Color(255, 242, 228, 255);
        }
    }

    private updateToggleButton(button: Button | null, enabled: boolean) {
        const node = button?.node;
        if (!button || !node || !node.isValid) return;
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = enabled ? new Color(244, 194, 129, 255) : new Color(106, 70, 53, 210);
        }
        const label = node.getChildByName('Label')?.getComponent(Label);
        if (label) {
            label.string = enabled ? '开' : '关';
            label.color = enabled ? new Color(111, 63, 49, 255) : new Color(255, 242, 228, 255);
        }
    }

    private setButtonLabel(button: Button | null, text: string) {
        const node = button?.node;
        if (!button || !node || !node.isValid) {
            return;
        }
        const label = node.getChildByName('Label')?.getComponent(Label);
        if (label) {
            label.string = text;
        }
    }

    private setLabelByPath(path: string, text: string) {
        const label = this.findNodeByPath(path)?.getComponent(Label);
        if (label) {
            label.string = text;
        }
    }

    private setDisplayMode(mode: DisplayMode) {
        if (!this.settings) return;
        this.settings.display.mode = mode;
        this.refreshSelectionVisuals();
    }

    private setResolution(resolution: ResolutionPreset) {
        if (!this.settings) return;
        this.settings.display.resolution = resolution;
        this.refreshSelectionVisuals();
    }

    private setUIScale(scale: UIScalePreset) {
        if (!this.settings) return;
        this.settings.display.uiScale = scale;
        this.refreshSelectionVisuals();
    }

    private setQuality(quality: QualityPreset) {
        if (!this.settings) return;
        this.settings.graphics.quality = quality;
        this.refreshSelectionVisuals();
    }

    private setFrameRate(frameRate: FrameRatePreset) {
        if (!this.settings) return;
        this.settings.graphics.frameRate = frameRate;
        this.refreshSelectionVisuals();
    }

    private setLanguage(language: LanguagePreset) {
        if (!this.settings) return;
        this.settings.game.language = language;
        this.refreshSelectionVisuals();
    }

    private toggleBoolean(category: 'game' | 'controls', key: string) {
        if (!this.settings) return;
        (this.settings[category] as Record<string, boolean>)[key] = !(this.settings[category] as Record<string, boolean>)[key];
        this.refreshSelectionVisuals();
    }

    private onStartGame() {
        if (this.isSceneLoading) return;
        this.isSceneLoading = true;

        GameProgressManager.instance?.resetProgress();
        InventoryManager.instance?.resetToDefault();
        InventoryManager.instance?.initLevel(1);
        GameProgressManager.instance?.startLevel(1);

        const saveData = SaveManager.buildCurrentSaveData();
        SaveManager.createSave('第一关 - 新开始', 'auto', saveData);

        SceneRouteService.goShop();
    }

    private onContinueGame() {
        if (this.isSceneLoading) return;
        const saves = SaveManager.listSaves();
        if (saves.length === 0) {
            this.refreshContinueButton();
            return;
        }
        this.loadSaveAndEnter(saves[0]);
    }

    private loadSaveAndEnter(save: SaveData) {
        if (this.isSceneLoading) return;
        this.isSceneLoading = true;

        if (save.snapshot) {
            SaveManager.applySnapshot(save.snapshot);
        } else {
            const progressManager = GameProgressManager.instance;
            const baseProgress = progressManager?.progress;
            if (progressManager && baseProgress) {
                progressManager.applyProgress({
                    ...baseProgress,
                    currentLevel: save.playerData.currentLevel,
                    totalMoney: save.playerData.totalMoney,
                    unlockedLevels: save.playerData.unlockedLevels,
                    completedLevels: save.playerData.completedLevels,
                    lastSaveTime: Date.now()
                });
            }
            InventoryManager.instance?.setWallet(save.playerData.totalMoney);
            InventoryManager.instance?.initLevel(save.playerData.currentLevel);
        }

        SceneRouteService.goShop();
    }

    private onOpenSettings() {
        if (!this.settingsPanel) return;
        this.settingsPanel.active = true;
    }

    private onApplySettings() {
        if (!this.settings) return;
        this.collectSliderValues();
        SettingsManager.applySettings(this.settings);
        this.refreshSelectionVisuals();
    }

    private onResetSettings() {
        this.settings = SettingsManager.resetToDefault();
        this.applySettingsValues();
        if (this.settingsPanel) {
            this.settingsPanel.active = true;
        }
    }

    private onCloseSettings() {
        if (!this.settingsPanel || !this.settings) return;
        this.collectSliderValues();
        SettingsManager.applySettings(this.settings);
        this.settingsPanel.active = false;
    }

    private collectSliderValues() {
        if (!this.settings) return;
        if (this.bgmSlider) {
            this.settings.audio.bgmVolume = Math.round(this.bgmSlider.progress * 100);
        }
        if (this.sfxSlider) {
            this.settings.audio.sfxVolume = Math.round(this.sfxSlider.progress * 100);
        }
        if (this.mouseSensitivitySlider) {
            this.settings.controls.mouseSensitivity = Math.round(this.mouseSensitivitySlider.progress * 9) + 1;
        }
        this.syncValueLabels();
    }

    private onBgmSliderChanged() {
        this.collectSliderValues();
    }

    private onSfxSliderChanged() {
        this.collectSliderValues();
    }

    private onMouseSensitivityChanged() {
        this.collectSliderValues();
    }

    private onQuitGame() {
        director.end();
    }
}
