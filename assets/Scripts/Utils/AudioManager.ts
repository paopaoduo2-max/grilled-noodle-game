import { _decorator, Component, AudioSource, AudioClip, director, Node } from 'cc';
import { AudioConfig } from '../Config/AudioConfig';
import { ResourceManager } from './ResourceManager';
const { ccclass, property } = _decorator;

/**
 * 音频管理器
 * 统一管理背景音乐和音效播放
 */
@ccclass('AudioManager')
export class AudioManager extends Component {
    private static _instance: AudioManager = null;

    // 音频源
    private _bgmSource: AudioSource = null;
    private _sfxSource: AudioSource = null;

    // 音量设置
    private _masterVolume: number = AudioConfig.DEFAULT_VOLUME.MASTER;
    private _bgmVolume: number = AudioConfig.DEFAULT_VOLUME.BGM;
    private _sfxVolume: number = AudioConfig.DEFAULT_VOLUME.SFX;

    // 当前播放的 BGM
    private _currentBGM: string = '';

    // 是否静音
    private _isMuted: boolean = false;

    public static get Instance(): AudioManager {
        return this._instance;
    }

    onLoad() {
        if (AudioManager._instance === null) {
            AudioManager._instance = this;
            const scene = director.getScene();
            if (scene && this.node.parent !== scene) {
                this.node.removeFromParent();
                scene.addChild(this.node);
            }
            if (this.node.parent === scene) {
                director.addPersistRootNode(this.node);
            }
            this.initAudioSources();
            this.loadSettings();
        } else {
            this.node.destroy();
        }
    }

    /**
     * 初始化音频源
     */
    private initAudioSources() {
        // BGM 音频源
        const bgmNode = new Node('BGM');
        bgmNode.parent = this.node;
        this._bgmSource = bgmNode.addComponent(AudioSource);
        this._bgmSource.loop = true;

        // SFX 音频源
        const sfxNode = new Node('SFX');
        sfxNode.parent = this.node;
        this._sfxSource = sfxNode.addComponent(AudioSource);
        this._sfxSource.loop = false;
    }

    /**
     * 从本地存储加载音量设置
     */
    private loadSettings() {
        // TODO: 从 SettingsManager 加载设置
    }

    // ==================== 背景音乐 ====================

    /**
     * 播放背景音乐
     * @param path 音乐资源路径
     * @param fadeIn 是否淡入
     */
    public async playBGM(path: string, fadeIn: boolean = true): Promise<void> {
        if (this._currentBGM === path && this._bgmSource.playing) {
            return;
        }

        try {
            const clip = await ResourceManager.Instance.loadAudio(path);
            
            if (fadeIn && this._bgmSource.playing) {
                await this.fadeOutBGM(0.5);
            }

            this._bgmSource.clip = clip;
            this._bgmSource.volume = this._isMuted ? 0 : this._bgmVolume * this._masterVolume;
            this._bgmSource.play();
            this._currentBGM = path;

            if (fadeIn) {
                this.fadeInBGM(0.5);
            }

            console.log(`[AudioManager] 播放BGM: ${path}`);
        } catch (err) {
            console.error(`[AudioManager] 播放BGM失败: ${path}`, err);
        }
    }

    /**
     * 停止背景音乐
     */
    public stopBGM(): void {
        this._bgmSource.stop();
        this._currentBGM = '';
    }

    /**
     * 暂停背景音乐
     */
    public pauseBGM(): void {
        this._bgmSource.pause();
    }

    /**
     * 恢复背景音乐
     */
    public resumeBGM(): void {
        this._bgmSource.play();
    }

    /**
     * BGM 淡入
     */
    private fadeInBGM(duration: number): void {
        const targetVolume = this._bgmVolume * this._masterVolume;
        this._bgmSource.volume = 0;
        // TODO: 使用 tween 实现淡入
    }

    /**
     * BGM 淡出
     */
    private fadeOutBGM(duration: number): Promise<void> {
        return new Promise((resolve) => {
            // TODO: 使用 tween 实现淡出
            this._bgmSource.stop();
            resolve();
        });
    }

    // ==================== 音效 ====================

    /**
     * 播放音效
     * @param path 音效资源路径
     * @param volumeScale 音量缩放（0-1）
     */
    public async playSFX(path: string, volumeScale: number = 1): Promise<void> {
        if (this._isMuted) return;

        try {
            const clip = await ResourceManager.Instance.loadAudio(path);
            this._sfxSource.playOneShot(clip, this._sfxVolume * this._masterVolume * volumeScale);
        } catch (err) {
            // 音效加载失败不阻塞游戏
            console.warn(`[AudioManager] 音效加载失败: ${path}`);
        }
    }

    /**
     * 播放按钮点击音效
     */
    public playButtonClick(): void {
        this.playSFX(AudioConfig.SFX_UI.BUTTON_CLICK);
    }

    /**
     * 播放烹饪相关音效
     */
    public playCookingSound(soundKey: keyof typeof AudioConfig.SFX_COOKING): void {
        const path = AudioConfig.SFX_COOKING[soundKey];
        this.playSFX(path);
    }

    // ==================== 音量控制 ====================

    /**
     * 设置主音量
     */
    public setMasterVolume(volume: number): void {
        this._masterVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }

    /**
     * 设置 BGM 音量
     */
    public setBGMVolume(volume: number): void {
        this._bgmVolume = Math.max(0, Math.min(1, volume));
        this.updateVolumes();
    }

    /**
     * 设置音效音量
     */
    public setSFXVolume(volume: number): void {
        this._sfxVolume = Math.max(0, Math.min(1, volume));
    }

    /**
     * 设置静音
     */
    public setMute(muted: boolean): void {
        this._isMuted = muted;
        this.updateVolumes();
    }

    /**
     * 切换静音状态
     */
    public toggleMute(): boolean {
        this._isMuted = !this._isMuted;
        this.updateVolumes();
        return this._isMuted;
    }

    /**
     * 更新音量
     */
    private updateVolumes(): void {
        if (this._isMuted) {
            this._bgmSource.volume = 0;
        } else {
            this._bgmSource.volume = this._bgmVolume * this._masterVolume;
        }
    }

    // ==================== Getters ====================

    public get masterVolume(): number { return this._masterVolume; }
    public get bgmVolume(): number { return this._bgmVolume; }
    public get sfxVolume(): number { return this._sfxVolume; }
    public get isMuted(): boolean { return this._isMuted; }
}
