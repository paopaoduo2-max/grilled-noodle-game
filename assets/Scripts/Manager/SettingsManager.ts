import { sys } from 'cc';

/**
 * 游戏设置数据结构
 */
export interface GameSettings {
    // 音效
    audio: {
        bgmEnabled: boolean;
        bgmVolume: number;      // 0-100
        sfxEnabled: boolean;
        sfxVolume: number;      // 0-100
    };
    
    // 画质
    graphics: {
        quality: 'low' | 'medium' | 'high';
        frameRate: 30 | 60 | 0;  // 0表示不限制
    };
    
    // 游戏
    game: {
        language: 'zh' | 'en';
        showFPS: boolean;
        autoSave: boolean;
        showTips: boolean;
    };
    
    // 控制
    controls: {
        mouseSensitivity: number;  // 1-10
        showHotkeys: boolean;
        touchFeedback: boolean;
    };
}

/**
 * 设置管理器
 * 负责游戏设置的加载、保存和应用
 */
export class SettingsManager {
    private static readonly STORAGE_KEY = 'cooking_game_settings';
    private static currentSettings: GameSettings | null = null;

    /**
     * 获取默认设置
     */
    private static getDefaultSettings(): GameSettings {
        return {
            audio: {
                bgmEnabled: true,
                bgmVolume: 70,
                sfxEnabled: true,
                sfxVolume: 80
            },
            graphics: {
                quality: 'medium',
                frameRate: 60
            },
            game: {
                language: 'zh',
                showFPS: false,
                autoSave: true,
                showTips: true
            },
            controls: {
                mouseSensitivity: 5,
                showHotkeys: true,
                touchFeedback: true
            }
        };
    }

    /**
     * 加载设置
     */
    static loadSettings(): GameSettings {
        if (this.currentSettings) {
            return this.currentSettings;
        }

        try {
            const savedData = sys.localStorage.getItem(this.STORAGE_KEY);
            if (savedData) {
                const settings = JSON.parse(savedData) as GameSettings;
                this.currentSettings = this.mergeWithDefaults(settings);
                console.log('[SettingsManager] 设置加载成功', this.currentSettings);
                return this.currentSettings;
            }
        } catch (e) {
            console.error('[SettingsManager] 设置加载失败', e);
        }

        // 返回默认设置
        this.currentSettings = this.getDefaultSettings();
        this.saveSettings(this.currentSettings);
        return this.currentSettings;
    }

    /**
     * 保存设置
     */
    static saveSettings(settings: GameSettings): void {
        try {
            sys.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
            this.currentSettings = settings;
            console.log('[SettingsManager] 设置保存成功');
        } catch (e) {
            console.error('[SettingsManager] 设置保存失败', e);
        }
    }

    /**
     * 重置为默认设置
     */
    static resetToDefault(): GameSettings {
        const defaultSettings = this.getDefaultSettings();
        this.saveSettings(defaultSettings);
        return defaultSettings;
    }

    /**
     * 应用设置
     */
    static applySettings(settings: GameSettings): void {
        // TODO: 在这里应用设置到游戏中
        // 例如：调整音量、切换画质、显示FPS等
        
        console.log('[SettingsManager] 应用设置:', settings);
        
        // 示例：应用音频设置
        // AudioManager.setBGMVolume(settings.audio.bgmVolume / 100);
        // AudioManager.setSFXVolume(settings.audio.sfxVolume / 100);
        
        this.saveSettings(settings);
    }

    /**
     * 获取当前设置
     */
    static getCurrentSettings(): GameSettings {
        if (!this.currentSettings) {
            return this.loadSettings();
        }
        return this.currentSettings;
    }

    /**
     * 合并设置与默认值（处理版本升级后新增的设置项）
     */
    private static mergeWithDefaults(settings: Partial<GameSettings>): GameSettings {
        const defaults = this.getDefaultSettings();
        
        return {
            audio: { ...defaults.audio, ...settings.audio },
            graphics: { ...defaults.graphics, ...settings.graphics },
            game: { ...defaults.game, ...settings.game },
            controls: { ...defaults.controls, ...settings.controls }
        };
    }

    /**
     * 更新单个设置项
     */
    static updateSetting(category: keyof GameSettings, key: string, value: any): void {
        const settings = this.getCurrentSettings();
        (settings[category] as any)[key] = value;
        this.saveSettings(settings);
    }
}
