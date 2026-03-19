import { _decorator, Component, resources, Asset, SpriteFrame, AudioClip, Prefab, JsonAsset } from 'cc';
const { ccclass } = _decorator;

/**
 * 资源管理器
 * 统一管理游戏资源的加载、缓存和释放
 */
@ccclass('ResourceManager')
export class ResourceManager {
    private static _instance: ResourceManager = null;
    
    // 资源缓存
    private _cache: Map<string, Asset> = new Map();
    
    // 加载中的资源（防止重复加载）
    private _loading: Map<string, Promise<Asset>> = new Map();

    public static get Instance(): ResourceManager {
        if (!this._instance) {
            this._instance = new ResourceManager();
        }
        return this._instance;
    }

    /**
     * 加载单个资源
     * @param path 资源路径（相对于 resources 目录）
     * @param type 资源类型
     */
    public load<T extends Asset>(path: string, type: new () => T): Promise<T> {
        // 检查缓存
        if (this._cache.has(path)) {
            return Promise.resolve(this._cache.get(path) as T);
        }

        // 检查是否正在加载
        if (this._loading.has(path)) {
            return this._loading.get(path) as Promise<T>;
        }

        // 开始加载
        const loadPromise = new Promise<T>((resolve, reject) => {
            resources.load(path, type, (err, asset) => {
                this._loading.delete(path);
                
                if (err) {
                    console.error(`[ResourceManager] 加载资源失败: ${path}`, err);
                    reject(err);
                    return;
                }

                this._cache.set(path, asset);
                console.log(`[ResourceManager] 资源加载成功: ${path}`);
                resolve(asset);
            });
        });

        this._loading.set(path, loadPromise);
        return loadPromise;
    }

    /**
     * 批量加载资源
     * @param paths 资源路径数组
     * @param type 资源类型
     */
    public loadBatch<T extends Asset>(paths: string[], type: new () => T): Promise<T[]> {
        return Promise.all(paths.map(path => this.load(path, type)));
    }

    /**
     * 加载精灵帧
     */
    public loadSprite(path: string): Promise<SpriteFrame> {
        return this.load(`${path}/spriteFrame`, SpriteFrame);
    }

    /**
     * 加载音频
     */
    public loadAudio(path: string): Promise<AudioClip> {
        return this.load(path, AudioClip);
    }

    /**
     * 加载预制体
     */
    public loadPrefab(path: string): Promise<Prefab> {
        return this.load(path, Prefab);
    }

    /**
     * 加载 JSON 配置
     */
    public loadJson(path: string): Promise<JsonAsset> {
        return this.load(path, JsonAsset);
    }

    /**
     * 预加载资源（后台加载，不阻塞）
     */
    public preload(paths: string[], type: new () => Asset): void {
        paths.forEach(path => {
            this.load(path, type).catch(() => {
                // 预加载失败不影响游戏
            });
        });
    }

    /**
     * 释放单个资源
     */
    public release(path: string): void {
        const asset = this._cache.get(path);
        if (asset) {
            resources.release(path);
            this._cache.delete(path);
            console.log(`[ResourceManager] 资源已释放: ${path}`);
        }
    }

    /**
     * 释放多个资源
     */
    public releaseBatch(paths: string[]): void {
        paths.forEach(path => this.release(path));
    }

    /**
     * 释放所有缓存资源
     */
    public releaseAll(): void {
        this._cache.forEach((_, path) => {
            resources.release(path);
        });
        this._cache.clear();
        console.log('[ResourceManager] 所有资源已释放');
    }

    /**
     * 检查资源是否已缓存
     */
    public isCached(path: string): boolean {
        return this._cache.has(path);
    }

    /**
     * 获取缓存资源数量
     */
    public getCacheSize(): number {
        return this._cache.size;
    }
}
