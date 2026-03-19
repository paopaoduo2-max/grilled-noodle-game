import { ResolutionPolicy, screen, sys, view } from 'cc';
import { EDITOR, PREVIEW } from 'cc/env';

const RESOLUTION_KEY = 'display_resolution';
const FULLSCREEN_KEY = 'display_fullscreen';

export interface DisplayResolution {
    width: number;
    height: number;
}

/**
 * 分辨率/全屏管理器（默认 1920x1080，SHOW_ALL）
 * - 支持后续接入设置界面
 * - 默认不自动切换全屏，避免干扰编辑器/试玩体验
 */
export class DisplayManager {
    private static _initialized = false;

    public static init(): void {
        if (this._initialized) return;
        this._initialized = true;

        const savedResolution = this.getSavedResolution();
        const resolution = savedResolution ?? { width: 1920, height: 1080 };
        this.applyResolution(resolution);

        if (!EDITOR && !PREVIEW) {
            const savedFullscreen = sys.localStorage.getItem(FULLSCREEN_KEY);
            if (savedFullscreen === 'true') {
                this.setFullscreen(true, false);
            }
        }
    }

    public static applyResolution(resolution: DisplayResolution): void {
        view.setDesignResolutionSize(
            resolution.width,
            resolution.height,
            ResolutionPolicy.SHOW_ALL
        );
        view.resizeWithBrowserSize(true);
    }

    public static setResolution(resolution: DisplayResolution, persist: boolean = true): void {
        this.applyResolution(resolution);
        if (persist) {
            sys.localStorage.setItem(RESOLUTION_KEY, JSON.stringify(resolution));
        }
    }

    public static async setFullscreen(enabled: boolean, persist: boolean = true): Promise<void> {
        if (EDITOR || PREVIEW) return;

        try {
            if (enabled) {
                await screen.requestFullScreen();
            } else {
                await screen.exitFullScreen();
            }
            if (persist) {
                sys.localStorage.setItem(FULLSCREEN_KEY, enabled ? 'true' : 'false');
            }
        } catch {
            // ignore
        }
    }

    public static getSavedResolution(): DisplayResolution | null {
        const raw = sys.localStorage.getItem(RESOLUTION_KEY);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            if (typeof parsed?.width === 'number' && typeof parsed?.height === 'number') {
                return { width: parsed.width, height: parsed.height };
            }
        } catch {
            // ignore invalid json
        }
        return null;
    }
}
