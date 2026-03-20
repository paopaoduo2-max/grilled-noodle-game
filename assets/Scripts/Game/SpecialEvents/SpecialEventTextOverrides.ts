import { _decorator, Asset, JsonAsset, TextAsset, resources } from 'cc';
import { EDITOR, PREVIEW } from 'cc/env';
import { SpecialEventTemplate } from './SpecialEventTypes';

const { ccclass } = _decorator;

type OverrideSender = { name?: string; icon?: string; role?: string };
type OverrideOption = { text?: string; emoji?: string };
type OverrideEntry = {
    description?: string;
    sender?: OverrideSender;
    optionA?: OverrideOption;
    optionB?: OverrideOption;
};

type OverrideFile = {
    version?: number;
    events?: Record<string, OverrideEntry>;
};

@ccclass('SpecialEventTextOverrides')
export class SpecialEventTextOverrides {
    private static _instance: SpecialEventTextOverrides | null = null;

    public static get instance(): SpecialEventTextOverrides {
        if (!this._instance) {
            this._instance = new SpecialEventTextOverrides();
        }
        return this._instance;
    }

    private loaded = false;
    private loading = false;
    private overrides: Record<string, OverrideEntry> = {};
    private lastLoadAt = 0;
    private lastAsset: Asset | null = null;
    private missingWarned = false;

    public ensureLoaded() {
        if (this.loaded || this.loading) return;
        this.loadInternal();
    }

    public tryReloadInEditor(throttleMs: number = 800) {
        if (!(EDITOR || PREVIEW)) return;
        const now = Date.now();
        if (now - this.lastLoadAt < throttleMs) return;
        this.loadInternal();
    }

    private loadInternal() {
        this.loading = true;
        this.lastLoadAt = Date.now();

        if (EDITOR || PREVIEW) {
            try {
                if (this.lastAsset) {
                    resources.release(this.lastAsset);
                    this.lastAsset = null;
                }
            } catch (e) {
                console.warn('[SpecialEventTextOverrides] 尝试释放旧覆写资源失败，将继续使用缓存', e);
            }
        }

        const path = 'SpecialEvents/special_event_overrides';
        const warnLoadFailure = () => {
            if (!this.missingWarned) {
                console.warn('[SpecialEventTextOverrides] 覆写文件未找到，使用默认模板');
                this.missingWarned = true;
            }
            // 将缺失视为可选降级，避免预览态重复刷屏
            this.loaded = true;
        };
        const applyOverrides = (json?: OverrideFile) => {
            this.overrides = json?.events ?? {};
            this.loaded = true;
            console.log('[SpecialEventTextOverrides] ✅ 已加载事件文案覆写表，条目数:', Object.keys(this.overrides).length);
        };

        resources.load(path, JsonAsset, (err, asset) => {
            if (!err && asset) {
                this.loading = false;
                this.lastAsset = asset;
                applyOverrides(asset.json as OverrideFile);
                return;
            }

            resources.load(path, TextAsset, (textErr, textAsset) => {
                this.loading = false;
                if (textErr || !textAsset) {
                    warnLoadFailure();
                    return;
                }
                this.lastAsset = textAsset;
                try {
                    const json = JSON.parse(textAsset.text) as OverrideFile;
                    applyOverrides(json);
                } catch (parseErr) {
                    warnLoadFailure();
                }
            });
        });
    }

    public apply(template: SpecialEventTemplate): SpecialEventTemplate {
        const entry = this.overrides[template.id];
        if (!entry) return template;

        const sender = entry.sender
            ? {
                  ...(template.sender ?? {}),
                  ...entry.sender
              }
            : template.sender;

        const optionA = entry.optionA
            ? {
                  ...template.optionA,
                  ...entry.optionA
              }
            : template.optionA;

        const optionB = entry.optionB
            ? {
                  ...template.optionB,
                  ...entry.optionB
              }
            : template.optionB;

        return {
            ...template,
            description: entry.description ?? template.description,
            sender,
            optionA,
            optionB
        };
    }
}
