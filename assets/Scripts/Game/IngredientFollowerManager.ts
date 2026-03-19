import { _decorator, Node, Label, Vec3, tween, UITransform } from 'cc';
import { IngredientType } from '../Data/GameConfig';
import { HandItem } from '../Data/SteamerTypes';

const { ccclass } = _decorator;

/**
 * 食材跟随管理器 - 管理手持食材的鼠标跟随
 * 复用第一关的mouseFollower机制
 */
@ccclass('IngredientFollowerManager')
export class IngredientFollowerManager {
    private _mouseFollower: Node;           // 鼠标跟随节点
    private _currentHandItem: HandItem | null = null;  // 当前手持物品
    private _isFollowing: boolean = false;   // 是否正在跟随

    // 食材emoji映射
    private readonly INGREDIENT_EMOJIS: Map<IngredientType, string> = new Map([
        [IngredientType.RICE, '🍚'],
        [IngredientType.POTATO, '🥔'],
        [IngredientType.COOKED_RICE, '🍚'],
        [IngredientType.POTATO_MASH, '🥔']
    ]);

    // 食材名称映射
    private readonly INGREDIENT_NAMES: Map<IngredientType, string> = new Map([
        [IngredientType.RICE, '大米'],
        [IngredientType.POTATO, '土豆'],
        [IngredientType.COOKED_RICE, '熟大米'],
        [IngredientType.POTATO_MASH, '土豆泥']
    ]);

    /**
     * 构造函数
     * @param mouseFollower 鼠标跟随节点（从第一关复用）
     */
    constructor(mouseFollower: Node) {
        if (!mouseFollower) {
            console.error('[IngredientFollowerManager] ❌ mouseFollower节点未设置');
            return;
        }

        this._mouseFollower = mouseFollower;
        this._mouseFollower.active = false;
        console.log('[IngredientFollowerManager] ✅ 食材跟随管理器已初始化');
    }

    /**
     * 拿起食材
     */
    public pickupIngredient(type: IngredientType, count: number, sourceSlot?: number): void {
        this._currentHandItem = {
            type,
            count,
            sourceSlot
        };

        this._isFollowing = true;

        // 更新mouseFollower显示
        this.updateFollowerDisplay();

        // 激活节点
        this._mouseFollower.active = true;
        this._mouseFollower.setSiblingIndex(9999);

        // 播放拿起动画
        this.playPickupAnimation();

        console.log(`[IngredientFollowerManager] ✋ 拿起了 ${count}份${this.getIngredientName(type)}`);
    }

    /**
     * 追加同类型食材到手持
     */
    public addToCurrent(type: IngredientType, count: number): boolean {
        if (!this._currentHandItem || this._currentHandItem.type !== type) {
            return false;
        }
        this._currentHandItem.count += count;
        this.updateFollowerDisplay();
        return true;
    }

    /**
     * 设置手持数量（<=0 则清空）
     */
    public setCurrentCount(count: number): void {
        if (!this._currentHandItem) return;
        this._currentHandItem.count = count;
        if (this._currentHandItem.count <= 0) {
            this.clear();
            return;
        }
        this.updateFollowerDisplay();
    }

    /**
     * 放下食材
     */
    public putDownIngredient(): HandItem | null {
        if (!this._currentHandItem) {
            return null;
        }

        const item = { ...this._currentHandItem };

        // 播放放下动画
        this.playPutDownAnimation(() => {
            // 动画完成后隐藏节点
            this._mouseFollower.active = false;
        });

        console.log(`[IngredientFollowerManager] 🔽 放下了 ${item.count}份${this.getIngredientName(item.type)}`);

        this._currentHandItem = null;
        this._isFollowing = false;

        return item;
    }

    /**
     * 更新鼠标位置（从原生鼠标事件调用）
     */
    public updateMousePosition(worldPos: Vec3): void {
        if (!this._isFollowing || !this._mouseFollower) return;

        // 设置位置（使用父节点的本地坐标）
        const parent = this._mouseFollower.parent;
        if (parent) {
            this._mouseFollower.setWorldPosition(worldPos);
        }
    }

    /**
     * 更新跟随节点显示
     */
    private updateFollowerDisplay(): void {
        if (!this._currentHandItem) return;

        let label = this._mouseFollower.getComponent(Label);

        // 如果没有Label组件，添加一个
        if (!label) {
            label = this._mouseFollower.addComponent(Label);
            label.fontSize = 40;
            label.lineHeight = 45;
        }

        // 显示emoji和数量
        const emoji = this.getIngredientEmoji(this._currentHandItem.type);
        label.string = this._currentHandItem.count > 1
            ? `${emoji}${this._currentHandItem.count}`
            : emoji;
    }

    /**
     * 播放拿起动画
     */
    private playPickupAnimation(): void {
        // 缩放动画
        this._mouseFollower.setScale(0.5, 0.5, 1);

        tween(this._mouseFollower)
            .to(0.15, { scale: new Vec3(1.2, 1.2, 1) }, { easing: 'backOut' })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /**
     * 播放放下动画
     */
    private playPutDownAnimation(callback?: () => void): void {
        tween(this._mouseFollower)
            .to(0.1, { scale: new Vec3(1.2, 1.2, 1) })
            .to(0.15, { scale: new Vec3(0.3, 0.3, 1) }, { easing: 'backIn' })
            .call(() => {
                if (callback) callback();
            })
            .start();
    }

    /**
     * 获取食材emoji
     */
    private getIngredientEmoji(type: IngredientType): string {
        return this.INGREDIENT_EMOJIS.get(type) || '❓';
    }

    /**
     * 获取食材名称
     */
    private getIngredientName(type: IngredientType): string {
        return this.INGREDIENT_NAMES.get(type) || '未知食材';
    }

    // ========== 状态访问器 ==========

    /**
     * 是否正在跟随
     */
    public isFollowing(): boolean {
        return this._isFollowing;
    }

    /**
     * 获取当前手持物品
     */
    public getCurrentHandItem(): HandItem | null {
        return this._currentHandItem;
    }

    /**
     * 获取mouseFollower节点
     */
    public getMouseFollower(): Node {
        return this._mouseFollower;
    }

    /**
     * 清空状态（用于重置）
     */
    public clear(): void {
        this._currentHandItem = null;
        this._isFollowing = false;
        this._mouseFollower.active = false;
        this._mouseFollower.setScale(1, 1, 1);
    }
}
