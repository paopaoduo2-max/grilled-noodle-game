/**
 * CookingScene UI 资源加载器
 * 负责加载图片资源，如果资源不存在则使用占位颜色
 */

import { _decorator, Component, Node, Sprite, SpriteFrame, resources, Color, UITransform, Label } from 'cc';
import { COOKING_UI_ASSETS, AssetConfig, getAllAssetConfigs } from '../Config/CookingUIAssets';

const { ccclass, property } = _decorator;

@ccclass('CookingUILoader')
export class CookingUILoader extends Component {
    
    private static _instance: CookingUILoader = null;
    
    public static get instance(): CookingUILoader {
        return CookingUILoader._instance;
    }
    
    // 缓存已加载的资源
    private loadedAssets: Map<string, SpriteFrame> = new Map();
    
    // 加载状态
    private isLoading: boolean = false;
    private loadedCount: number = 0;
    private totalCount: number = 0;
    
    onLoad() {
        CookingUILoader._instance = this;
    }
    
    /**
     * 预加载所有资源
     */
    public async preloadAllAssets(): Promise<void> {
        if (this.isLoading) {
            console.warn('[CookingUILoader] 正在加载中，请稍候...');
            return;
        }
        
        const configs = getAllAssetConfigs();
        this.totalCount = configs.length;
        this.loadedCount = 0;
        this.isLoading = true;
        
        console.log(`[CookingUILoader] 开始预加载 ${this.totalCount} 个资源...`);
        
        const promises = configs.map(config => this.loadAsset(config));
        await Promise.all(promises);
        
        this.isLoading = false;
        console.log(`[CookingUILoader] ✅ 预加载完成！成功: ${this.loadedCount}/${this.totalCount}`);
    }
    
    /**
     * 加载单个资源
     */
    private loadAsset(config: AssetConfig): Promise<void> {
        return new Promise((resolve) => {
            const path = config.path + '/spriteFrame';
            
            resources.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    // 资源不存在，使用占位符
                    console.log(`[CookingUILoader] ⚠️ ${config.path} 未找到，使用占位颜色`);
                } else {
                    // 缓存资源
                    this.loadedAssets.set(config.path, spriteFrame);
                    this.loadedCount++;
                    console.log(`[CookingUILoader] ✅ 加载成功: ${config.path}`);
                }
                resolve();
            });
        });
    }
    
    /**
     * 应用资源到 Sprite
     * @param sprite 目标 Sprite 组件
     * @param config 资源配置
     * @param useSize 是否应用尺寸
     */
    public applyAsset(sprite: Sprite, config: AssetConfig, useSize: boolean = true): void {
        if (!sprite) {
            console.warn('[CookingUILoader] Sprite 为空');
            return;
        }
        
        const cachedAsset = this.loadedAssets.get(config.path);
        
        if (cachedAsset) {
            // 使用加载的资源
            sprite.spriteFrame = cachedAsset;
            sprite.color = Color.WHITE;
        } else {
            // 使用占位颜色
            sprite.spriteFrame = null;
            sprite.color = config.placeholderColor;
        }
        
        // 应用尺寸
        if (useSize) {
            const transform = sprite.node.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(config.size.width, config.size.height);
            }
        }
    }
    
    /**
     * 创建带资源的节点
     */
    public createAssetNode(name: string, config: AssetConfig): Node {
        const node = new Node(name);
        const sprite = node.addComponent(Sprite);
        this.applyAsset(sprite, config, true);
        return node;
    }
    
    /**
     * 获取资源配置
     */
    public getConfig(category: string, key: string): AssetConfig | null {
        const categoryObj = (COOKING_UI_ASSETS as any)[category];
        if (categoryObj && categoryObj[key]) {
            return categoryObj[key];
        }
        return null;
    }
    
    /**
     * 快捷方法：获取背景配置
     */
    public get backgrounds() {
        return COOKING_UI_ASSETS.backgrounds;
    }
    
    /**
     * 快捷方法：获取区域配置
     */
    public get areas() {
        return COOKING_UI_ASSETS.areas;
    }
    
    /**
     * 快捷方法：获取烤盘配置
     */
    public get grill() {
        return COOKING_UI_ASSETS.grill;
    }
    
    /**
     * 快捷方法：获取按钮配置
     */
    public get buttons() {
        return COOKING_UI_ASSETS.buttons;
    }
    
    /**
     * 快捷方法：获取食物配置
     */
    public get food() {
        return COOKING_UI_ASSETS.food;
    }
    
    /**
     * 快捷方法：获取元素配置
     */
    public get elements() {
        return COOKING_UI_ASSETS.elements;
    }
    
    /**
     * 快捷方法：获取装饰配置
     */
    public get decorations() {
        return COOKING_UI_ASSETS.decorations;
    }
    
    /**
     * 检查资源是否已加载
     */
    public hasAsset(path: string): boolean {
        return this.loadedAssets.has(path);
    }
    
    /**
     * 获取加载进度
     */
    public getProgress(): number {
        if (this.totalCount === 0) return 0;
        return this.loadedCount / this.totalCount;
    }
    
    /**
     * 打印加载状态
     */
    public printStatus(): void {
        console.log('=== CookingUILoader 状态 ===');
        console.log(`加载进度: ${this.loadedCount}/${this.totalCount} (${(this.getProgress() * 100).toFixed(1)}%)`);
        console.log('已加载资源:');
        this.loadedAssets.forEach((_, path) => {
            console.log(`  ✅ ${path}`);
        });
        
        const configs = getAllAssetConfigs();
        const missing = configs.filter(c => !this.loadedAssets.has(c.path));
        if (missing.length > 0) {
            console.log('缺失资源 (使用占位颜色):');
            missing.forEach(c => {
                console.log(`  ⚠️ ${c.path} - ${c.description}`);
            });
        }
    }
}
