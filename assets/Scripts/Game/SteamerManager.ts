import { _decorator, Component, Node, Label, UITransform, tween, Vec3, Color, Sprite, macro, EventTouch } from 'cc';
import { IngredientType } from '../Data/GameConfig';
import { SteamerSlot, SteamerSlotState, SlotClickCallback, SteamingCompleteCallback, SteamerSaveData } from '../Data/SteamerTypes';

const { ccclass, property } = _decorator;

/**
 * 蒸锅管理器 - 管理6槽位蒸锅系统
 * 负责槽位状态、蒸制进度、食材放入/取出
 */
@ccclass('SteamerManager')
export class SteamerManager extends Component {
    // ========== 可配置属性 ==========

    @property(Node)
    steamerArea: Node = null;           // 蒸锅区域节点

    @property(Node)
    progressBar: Node = null;            // 进度条节点

    @property(Node)
    progressBarFill: Node = null;        // 进度条填充节点

    @property(Node)
    steamToggle: Node = null;            // 蒸锅开关节点

    // ========== 回调函数 ==========

    public onSlotClick: SlotClickCallback = null;
    public onSteamingComplete: SteamingCompleteCallback = null;

    // ========== 内部状态 ==========

    private _slots: SteamerSlot[] = [];           // 6个槽位
    private _isSteaming: boolean = false;         // 是否正在蒸制
    private _steamProgress: number = 0;           // 蒸制总进度 0-1
    private _steamDuration: number = 5.0;         // 蒸制时长（秒）
    private _updateInterval: number = 0.1;        // 更新间隔（秒）

    // 槽位位置配置（2行3列）
    private readonly SLOT_POSITIONS = [
        { x: -80, y: 40 },   // [0]
        { x: 0, y: 40 },     // [1]
        { x: 80, y: 40 },    // [2]
        { x: -80, y: -40 },  // [3]
        { x: 0, y: -40 },    // [4]
        { x: 80, y: -40 }    // [5]
    ];

    private readonly SLOT_RADIUS = 35;             // 槽位半径
    private readonly STEAMING_INTERVAL_KEY = 'steamer_update';

    // ========== 生命周期 ==========

    onLoad() {
        console.log('[SteamerManager] 蒸锅管理器已加载');
    }

    /**
     * 初始化6个槽位
     */
    public initSlots(): void {
        if (!this.steamerArea) {
            console.error('[SteamerManager] ? 蒸锅区域未设置');
            return;
        }

        this._slots = [];

        // 读取场景里已有的槽位节点
        for (let i = 0; i < 6; i++) {
            const slot = this.resolveSlotFromScene(i);
            if (slot) {
                this._slots.push(slot);
                // 初始化为空槽位显示，避免默认 Label 文本可见
                this.updateSlotDisplay(slot);
            }
        }

        console.log(`[SteamerManager] ? 初始化了${this._slots.length}个槽位`);
    }

    /**
     * 从场景中读取槽位节点
     */
    private resolveSlotFromScene(index: number): SteamerSlot | null {
        const slotName = `Slot_${index}`;
        const ingredientName = `Ingredient_${index}`;

        let slotNode = this.steamerArea.getChildByName(slotName);
        if (!slotNode) {
            console.warn(`[SteamerManager] ?? 未找到${slotName}，运行时创建临时节点`);
            slotNode = new Node(slotName);
            slotNode.parent = this.steamerArea;
        }

        // 设置位置
        const pos = this.SLOT_POSITIONS[index];
        slotNode.setPosition(pos.x, pos.y, 0);

        // 使用场景里已有的 UITransform
        const transform = slotNode.getComponent(UITransform) || slotNode.addComponent(UITransform);
        transform.setContentSize(this.SLOT_RADIUS * 2, this.SLOT_RADIUS * 2);

        // 添加点击事件
        slotNode.off(Node.EventType.TOUCH_END);
        slotNode.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            if (event && typeof event.stopPropagation === 'function') {
                event.stopPropagation();
            } else if (event && typeof (event as any).propagationStopped !== 'undefined') {
                (event as any).propagationStopped = true;
            }
            if (this.onSlotClick) {
                this.onSlotClick(this._slots[index]);
            }
        }, this);

        // 使用场景里已有的食材节点
        let ingredientNode = slotNode.getChildByName(ingredientName);
        if (!ingredientNode) {
            ingredientNode = new Node(ingredientName);
            ingredientNode.parent = slotNode;
            ingredientNode.setPosition(0, 0, 0);
        }

        const label = ingredientNode.getComponent(Label) || ingredientNode.addComponent(Label);
        label.fontSize = 28;
        label.lineHeight = 30;
        label.color = new Color(0, 0, 0, 255);

        return {
            index,
            state: SteamerSlotState.EMPTY,
            ingredientType: null,
            count: 0,
            progress: 0,
            slotNode,
            ingredientNode
        };
    }

    // ========== 食材操作 ==========

    /**
     * 添加食材到指定槽位
     */
    public addIngredientToSlot(slotIndex: number, ingredientType: IngredientType, count: number): boolean {
        if (slotIndex < 0 || slotIndex >= this._slots.length) {
            console.error(`[SteamerManager] ❌ 槽位索引 ${slotIndex} 超出范围`);
            return false;
        }

        const slot = this._slots[slotIndex];

        // 检查槽位状态
        // 允许 EMPTY 状态
        // 也允许 OCCUPIED 状态（如果是预留的，即 ingredientType 为 null）
        if (slot.state !== SteamerSlotState.EMPTY && slot.ingredientType !== null) {
            console.warn(`[SteamerManager] ⚠️ 槽位 ${slotIndex} 不是空槽位`);
            return false;
        }

        // 检查食材类型
        if (ingredientType !== IngredientType.RICE && ingredientType !== IngredientType.POTATO) {
            console.error(`[SteamerManager] ❌ 不支持的食材类型: ${ingredientType}`);
            return false;
        }

        // 更新槽位数据（蒸制中时直接加入进度）
        slot.ingredientType = ingredientType;
        slot.count = count;
        if (this._isSteaming) {
            slot.state = SteamerSlotState.STEAMING;
            slot.progress = this._steamProgress;
        } else {
            slot.state = SteamerSlotState.OCCUPIED;
            slot.progress = 0;
        }

        // 更新UI
        this.updateSlotDisplay(slot);

        console.log(`[SteamerManager] ✅ 槽位 ${slotIndex} 放入了 ${count}份${this.getIngredientName(ingredientType)}`);

        return true;
    }

    /**
     * 放回已蒸好的食材到槽位（保持完成状态）
     */
    public placeCompletedIngredient(slotIndex: number, ingredientType: IngredientType, count: number): boolean {
        if (slotIndex < 0 || slotIndex >= this._slots.length) {
            console.error(`[SteamerManager] ? 槽位索引 ${slotIndex} 超出范围`);
            return false;
        }

        const slot = this._slots[slotIndex];
        if (slot.state !== SteamerSlotState.EMPTY) {
            console.warn(`[SteamerManager] ?? 槽位 ${slotIndex} 不是空槽位`);
            return false;
        }

        if (ingredientType !== IngredientType.RICE && ingredientType !== IngredientType.POTATO) {
            console.error(`[SteamerManager] ? 不支持的食材类型: ${ingredientType}`);
            return false;
        }

        slot.ingredientType = ingredientType;
        slot.count = count;
        slot.state = SteamerSlotState.COMPLETED;
        slot.progress = 1;

        this.updateSlotDisplay(slot);

        console.log(`[SteamerManager] ? 槽位 ${slotIndex} 放回了 ${count}份${this.getIngredientName(ingredientType)}`);
        return true;
    }

    /**
     * 从槽位取出食材
     */
    public takeIngredientFromSlot(slotIndex: number): { type: IngredientType; count: number } | null {
        if (slotIndex < 0 || slotIndex >= this._slots.length) {
            return null;
        }

        const slot = this._slots[slotIndex];

        // 只能取出已完成的食材
        if (slot.state !== SteamerSlotState.COMPLETED) {
            console.warn(`[SteamerManager] ⚠️ 槽位 ${slotIndex} 的食材尚未完成`);
            return null;
        }

        if (!slot.ingredientType) {
            return null;
        }

        const result = {
            type: slot.ingredientType,
            count: slot.count
        };

        // 清空槽位
        slot.ingredientType = null;
        slot.count = 0;
        slot.progress = 0;
        slot.state = SteamerSlotState.EMPTY;

        // 更新UI
        this.updateSlotDisplay(slot);

        console.log(`[SteamerManager] ✅ 从槽位 ${slotIndex} 取出了 ${result.count}份${this.getIngredientName(result.type)}`);

        return result;
    }

    // ========== 蒸制控制 ==========

    /**
     * 开始蒸制
     */
    public startSteaming(): boolean {
        if (this._isSteaming) {
            console.warn('[SteamerManager] ⚠️ 正在蒸制中');
            return false;
        }

        // 检查是否有食材
        const occupiedSlots = this._slots.filter(slot =>
            slot.state === SteamerSlotState.OCCUPIED
        );

        if (occupiedSlots.length === 0) {
            console.warn('[SteamerManager] ⚠️ 没有需要蒸制的食材');
            return false;
        }

        // 开始蒸制
        this._isSteaming = true;
        this._steamProgress = 0;

        // 更新所有已占用槽位的状态
        occupiedSlots.forEach(slot => {
            slot.state = SteamerSlotState.STEAMING;
            this.updateSlotDisplay(slot);
        });

        // 启动定时器
        this.schedule(this.updateSteamProgress, this._updateInterval, macro.REPEAT_FOREVER, this.STEAMING_INTERVAL_KEY);

        console.log(`[SteamerManager] 🔥 开始蒸制 ${occupiedSlots.length} 个槽位的食材`);

        return true;
    }

    /**
     * 更新蒸制进度
     */
    private updateSteamProgress(): void {
        if (!this._isSteaming) return;

        // 增加进度
        this._steamProgress += this._updateInterval / this._steamDuration;

        // 更新进度条
        this.updateProgressBar();

        // 更新所有蒸制中的槽位
        const steamingSlots = this._slots.filter(slot =>
            slot.state === SteamerSlotState.STEAMING
        );

        steamingSlots.forEach(slot => {
            slot.progress = Math.min(this._steamProgress, 1.0);
            this.updateSlotDisplay(slot);
        });

        // 检查是否完成
        if (this._steamProgress >= 1.0) {
            this.completeSteaming();
        }
    }

    /**
     * 完成蒸制
     */
    private completeSteaming(): void {
        this._isSteaming = false;
        this.unschedule(this.STEAMING_INTERVAL_KEY);

        // 更新所有蒸制中的槽位为已完成
        const completedSlots = this._slots.filter(slot =>
            slot.state === SteamerSlotState.STEAMING
        );

        completedSlots.forEach(slot => {
            slot.state = SteamerSlotState.COMPLETED;
            slot.progress = 1.0;
            this.updateSlotDisplay(slot);
        });

        console.log(`[SteamerManager] ✅ 蒸制完成！${completedSlots.length} 个槽位的食材已就绪`);

        // 触发回调
        if (this.onSteamingComplete) {
            this.onSteamingComplete(completedSlots);
        }
    }

    // ========== UI更新 ==========

    /**
     * 更新槽位显示
     */
    private updateSlotDisplay(slot: SteamerSlot): void {
        if (!slot.ingredientNode) return;

        const label = slot.ingredientNode.getComponent(Label);

        if (slot.state === SteamerSlotState.EMPTY) {
            slot.ingredientNode.active = false;
            // 重置槽位背景颜色
            this.updateSlotBackgroundColor(slot, new Color(240, 240, 240, 180));
        } else {
            slot.ingredientNode.active = true;

            // 显示emoji和数量
            label.string = `${this.getIngredientEmoji(slot.ingredientType!)}${slot.count > 1 ? slot.count : ''}`;

            // 根据状态和进度更新颜色
            if (slot.state === SteamerSlotState.STEAMING) {
                const color = this.getSteamedColor(slot.ingredientType!, slot.progress);
                label.color = color;
                this.updateSlotBackgroundColor(slot, this.getSlotColor(slot.progress));
            } else if (slot.state === SteamerSlotState.COMPLETED) {
                const color = this.getSteamedColor(slot.ingredientType!, 1.0);
                label.color = color;
                this.updateSlotBackgroundColor(slot, new Color(200, 255, 200, 200)); // 绿色背景表示完成
            } else {
                label.color = new Color(0, 0, 0, 255);
                this.updateSlotBackgroundColor(slot, new Color(240, 240, 240, 180));
            }
        }
    }

    /**
     * 更新槽位背景颜色
     */
    private updateSlotBackgroundColor(slot: SteamerSlot, color: Color): void {
        // 使用素材替换背景，不在脚本里绘制
    }

    /**
     * 更新进度条
     */
    private updateProgressBar(): void {
        if (!this.progressBarFill) return;

        const transform = this.progressBarFill.getComponent(UITransform);
        if (!transform) return;

        const parentTransform = this.progressBarFill.parent?.getComponent(UITransform);
        if (!parentTransform) return;

        const maxWidth = parentTransform.contentSize.width;
        const currentWidth = maxWidth * this._steamProgress;

        transform.setContentSize(currentWidth, transform.contentSize.height);

        // 更新进度条颜色
        const color = this.getProgressBarColor(this._steamProgress);
        const sprite = this.progressBarFill.getComponent(Sprite);
        if (sprite) {
            sprite.color = color;
        }
    }

    // ========== 工具方法 ==========

    /**
     * 查找第一个空槽位
     */
    public findFirstEmptySlot(): SteamerSlot | null {
        return this._slots.find(slot => slot.state === SteamerSlotState.EMPTY) || null;
    }

    /**
     * 预留槽位（立即占用，防止连续点击时重复获取同一槽位）
     * 在动画开始前调用，确保槽位被标记为已占用
     */
    public reserveSlot(slotIndex: number): boolean {
        if (slotIndex < 0 || slotIndex >= this._slots.length) {
            console.error(`[SteamerManager] ❌ 槽位索引 ${slotIndex} 超出范围`);
            return false;
        }

        const slot = this._slots[slotIndex];

        // 只能预留空槽位
        if (slot.state !== SteamerSlotState.EMPTY) {
            console.warn(`[SteamerManager] ⚠️ 槽位 ${slotIndex} 不是空槽位，无法预留`);
            return false;
        }

        // 立即标记为已占用
        slot.state = SteamerSlotState.OCCUPIED;

        console.log(`[SteamerManager] 🔒 槽位 ${slotIndex} 已预留`);

        return true;
    }

    /**
     * 检查是否有食材
     */
    public hasIngredients(): boolean {
        return this._slots.some(slot => slot.state !== SteamerSlotState.EMPTY);
    }

    /**
     * 获取所有槽位
     */
    public getAllSlots(): SteamerSlot[] {
        return [...this._slots];
    }

    /**
     * 获取指定槽位
     */
    public getSlot(slotIndex: number): SteamerSlot | null {
        if (slotIndex < 0 || slotIndex >= this._slots.length) return null;
        return this._slots[slotIndex];
    }

    /**
     * 获取食材名称
     */
    private getIngredientName(type: IngredientType): string {
        switch (type) {
            case IngredientType.RICE:
                return '大米';
            case IngredientType.POTATO:
                return '土豆';
            default:
                return '未知食材';
        }
    }

    /**
     * 获取食材emoji
     */
    private getIngredientEmoji(type: IngredientType): string {
        switch (type) {
            case IngredientType.RICE:
                return '🍚';
            case IngredientType.POTATO:
                return '🥔';
            default:
                return '❓';
        }
    }

    /**
     * 获取蒸制后的颜色（生→熟渐变）
     */
    private getSteamedColor(type: IngredientType, progress: number): Color {
        if (type === IngredientType.POTATO) {
            // 土豆：生(浅黄) → 熟(深黄)
            return new Color(
                Math.floor(230 - progress * 50),
                Math.floor(200 - progress * 50),
                Math.floor(150 - progress * 50),
                255
            );
        } else if (type === IngredientType.RICE) {
            // 大米：生(白) → 熟(微黄)
            return new Color(
                Math.floor(255 - progress * 35),
                Math.floor(250 - progress * 40),
                Math.floor(220 - progress * 40),
                255
            );
        }
        return new Color(0, 0, 0, 255);
    }

    /**
     * 获取槽位背景颜色（蒸制进度）
     */
    private getSlotColor(progress: number): Color {
        // 从白色到淡黄色
        return new Color(
            Math.floor(240 + progress * 15),
            Math.floor(240 + progress * 10),
            Math.floor(240 - progress * 40),
            180
        );
    }

    /**
     * 获取进度条颜色（绿→黄→红）
     */
    private getProgressBarColor(progress: number): Color {
        if (progress < 0.5) {
            // 绿→黄
            const p = progress * 2;
            return new Color(
                Math.floor(100 + p * 155),
                200,
                50,
                255
            );
        } else {
            // 黄→红
            const p = (progress - 0.5) * 2;
            return new Color(
                255,
                Math.floor(200 - p * 100),
                Math.floor(50 + p * 50),
                255
            );
        }
    }

    // ========== 状态访问器 ==========

    public get isSteaming(): boolean {
        return this._isSteaming;
    }

    public get steamProgress(): number {
        return this._steamProgress;
    }

    public get steamDuration(): number {
        return this._steamDuration;
    }

    // ========== 序列化 ==========

    /**
     * 保存蒸锅状态
     */
    public saveState(): SteamerSaveData | null {
        const slotsData = this._slots.map(slot => ({
            index: slot.index,
            state: slot.state,
            ingredientType: slot.ingredientType,
            count: slot.count,
            progress: slot.progress
        }));

        return {
            slots: slotsData,
            isSteaming: this._isSteaming,
            steamProgress: this._steamProgress
        };
    }

    /**
     * 加载蒸锅状态
     */
    public loadState(data: SteamerSaveData): void {
        if (!data) return;

        // 停止当前蒸制
        if (this._isSteaming) {
            this._isSteaming = false;
            this.unschedule(this.STEAMING_INTERVAL_KEY);
        }

        // 恢复槽位
        data.slots.forEach((slotData, index) => {
            if (index < this._slots.length) {
                const slot = this._slots[index];
                slot.state = slotData.state;
                slot.ingredientType = slotData.ingredientType;
                slot.count = slotData.count;
                slot.progress = slotData.progress;
                this.updateSlotDisplay(slot);
            }
        });

        // 恢复蒸制状态
        this._steamProgress = data.steamProgress;
        this.updateProgressBar();

        if (data.isSteaming) {
            this.startSteaming();
        }

        console.log('[SteamerManager] ✅ 状态已恢复');
    }

    /**
     * 重置蒸锅
     */
    public reset(): void {
        // 停止蒸制
        if (this._isSteaming) {
            this._isSteaming = false;
            this.unschedule(this.STEAMING_INTERVAL_KEY);
        }

        // 重置所有槽位
        this._slots.forEach(slot => {
            slot.state = SteamerSlotState.EMPTY;
            slot.ingredientType = null;
            slot.count = 0;
            slot.progress = 0;
            this.updateSlotDisplay(slot);
        });

        // 重置进度
        this._steamProgress = 0;
        this.updateProgressBar();

        console.log('[SteamerManager] 🔄 蒸锅已重置');
    }

    onDestroy() {
        // 清理定时器
        this.unschedule(this.STEAMING_INTERVAL_KEY);
    }
}






