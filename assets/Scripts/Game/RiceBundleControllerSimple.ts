import { _decorator, Component, Node, Button, Label, Sprite, UITransform, Color, Vec3 } from 'cc';
import { IngredientType } from '../Data/GameConfig';
import { InventoryManager } from '../Manager/InventoryManager';

const { ccclass, property } = _decorator;

/**
 * 东北饭包制作阶段
 */
export enum RiceBundlePhase {
    IDLE = 'idle',
    STEAMING_POTATO = 'steaming_potato',
    POTATO_READY = 'potato_ready',
    STEAMING_RICE = 'steaming_rice',
    RICE_READY = 'rice_ready',
    MIXING = 'mixing',
    MIXED = 'mixed',
    ON_LEAF = 'on_leaf',
    ROLLING = 'rolling',
    PACKED = 'packed'
}

/**
 * 🍚 东北饭包控制器 - 第二关（简化版，不继承抽象类）
 *
 * 制作流程：
 * 1. 蒸土豆（点击土豆按钮，等待进度）
 * 2. 蒸大米（点击大米按钮，等待进度）
 * 3. 搅拌（土豆和大米都完成后，点击搅拌区域）
 * 4. 铺菜叶（点击生菜按钮）
 * 5. 卷起（连点5次完成卷制）
 * 6. 打包（添加香菜，完成）
 */
@ccclass('RiceBundleControllerSimple')
export class RiceBundleControllerSimple extends Component {

    // ==================== 场景节点绑定 ====================

    // 蒸锅区域
    @property(Node)
    steamerArea: Node = null!;

    @property(Node)
    potatoProgress: Node = null!;

    @property(Node)
    riceProgress: Node = null!;

    // 搅拌盆区域
    @property(Node)
    mixingBowlArea: Node = null!;

    @property(Node)
    mixProgress: Node = null!;

    // 菜叶区域
    @property(Node)
    cabbageLeafArea: Node = null!;

    @property(Node)
    rollProgress: Node = null!;

    // 食材按钮
    @property(Button)
    riceBtn: Button = null!;

    @property(Button)
    potatoBtn: Button = null!;

    @property(Button)
    eggBtn: Button = null!;

    @property(Button)
    greenOnionBtn: Button = null!;

    @property(Button)
    lettuceBtn: Button = null!;

    @property(Button)
    cilantroBtn: Button = null!;

    // 状态显示
    @property(Label)
    instructionLabel: Label = null!;

    @property(Label)
    moneyLabel: Label = null!;

    @property(Label)
    reviewLabel: Label = null!;

    @property(Node)
    phonePanel: Node = null!;

    // 🔥 手持物品显示
    @property(Node)
    handItemLabel: Node = null!;

    // ==================== 游戏状态 ====================

    private currentPhase: RiceBundlePhase = RiceBundlePhase.IDLE;
    private potatoSteamed: boolean = false;
    private riceSteamed: boolean = false;
    private mixed: boolean = false;
    private rollCount: number = 0;
    private requiredRolls: number = 5;
    private totalMoney: number = 0;
    private goodReviews: number = 0;
    private badReviews: number = 0;

    // 🔥 手持物品系统
    private currentHandItem: IngredientType | null = null;

    // 进度相关
    private steamProgress: number = 0;
    private mixProgressValue: number = 0;
    private readonly STEAM_TIME: number = 3;
    private readonly MIX_TIME: number = 2;

    // ==================== 生命周期 ====================

    protected onLoad() {
        console.log('[RiceBundleControllerSimple] 🍚 第二关东北饭包加载');
        this.bindIngredientButtons();
        this.bindAreaEvents();
    }

    protected start() {
        this.currentPhase = RiceBundlePhase.IDLE;
        this.updateInstruction('点击土豆或大米开始蒸制');
        this.updateProgressDisplay();
    }

    // ==================== 按钮绑定 ====================

    private bindIngredientButtons() {
        if (this.riceBtn) {
            this.riceBtn.node.on(Button.EventType.CLICK, () => this.handleRiceClick(), this);
        }
        if (this.potatoBtn) {
            this.potatoBtn.node.on(Button.EventType.CLICK, () => this.handlePotatoClick(), this);
        }
        if (this.eggBtn) {
            this.eggBtn.node.on(Button.EventType.CLICK, () => this.showMessage('鸡蛋已在准备阶段处理好'), this);
        }
        if (this.greenOnionBtn) {
            this.greenOnionBtn.node.on(Button.EventType.CLICK, () => this.showMessage('大葱已在准备阶段处理好'), this);
        }
        if (this.lettuceBtn) {
            this.lettuceBtn.node.on(Button.EventType.CLICK, () => this.handleLettuceClick(), this);
        }
        if (this.cilantroBtn) {
            this.cilantroBtn.node.on(Button.EventType.CLICK, () => this.handleCilantroClick(), this);
        }
    }

    private bindAreaEvents() {
        if (this.mixingBowlArea) {
            this.mixingBowlArea.on(Node.EventType.TOUCH_END, () => this.handleMixingClick(), this);
        }
        if (this.cabbageLeafArea) {
            this.cabbageLeafArea.on(Node.EventType.TOUCH_END, () => this.handleRollClick(), this);
        }
    }

    // ==================== 制作流程 ====================

    private handlePotatoClick(): void {
        if (this.potatoSteamed) {
            this.showMessage('土豆已经蒸好了');
            return;
        }
        if (this.currentPhase === RiceBundlePhase.STEAMING_RICE) {
            this.showMessage('正在蒸大米，请等待完成');
            return;
        }

        this.currentPhase = RiceBundlePhase.STEAMING_POTATO;
        this.consumeIngredient(IngredientType.POTATO, 1);
        this.updateInstruction('正在蒸土豆...');
        this.startSteamingPotato();
    }

    private startSteamingPotato(): void {
        this.steamProgress = 0;
        const deltaTime = 0.1;

        this.schedule(() => {
            this.steamProgress += deltaTime;
            this.updatePotatoProgress(this.steamProgress / this.STEAM_TIME);

            if (this.steamProgress >= this.STEAM_TIME) {
                this.potatoSteamed = true;
                this.currentPhase = RiceBundlePhase.POTATO_READY;
                this.updateInstruction('土豆蒸好了！可以开始蒸大米或直接搅拌');
                this.showMessage('🥔 土豆蒸制完成！');
                this.unschedule(this.startSteamingPotato);
            }
        }, deltaTime, this.STEAM_TIME / deltaTime);
    }

    private updatePotatoProgress(progress: number): void {
        if (this.potatoProgress) {
            const transform = this.potatoProgress.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(60 * Math.max(0.05, progress), 10);
            }
            const sprite = this.potatoProgress.getComponent(Sprite);
            if (sprite) {
                sprite.color = progress >= 1 ? new Color(100, 200, 100) : new Color(200, 200, 100);
            }
        }
    }

    private handleRiceClick(): void {
        if (this.riceSteamed) {
            this.showMessage('大米已经蒸好了');
            return;
        }
        if (this.currentPhase === RiceBundlePhase.STEAMING_POTATO) {
            this.showMessage('正在蒸土豆，请等待完成');
            return;
        }

        this.currentPhase = RiceBundlePhase.STEAMING_RICE;
        this.consumeIngredient(IngredientType.RICE, 1);
        this.updateInstruction('正在蒸大米...');
        this.startSteamingRice();
    }

    private startSteamingRice(): void {
        this.steamProgress = 0;
        const deltaTime = 0.1;

        this.schedule(() => {
            this.steamProgress += deltaTime;
            this.updateRiceProgress(this.steamProgress / this.STEAM_TIME);

            if (this.steamProgress >= this.STEAM_TIME) {
                this.riceSteamed = true;
                this.currentPhase = RiceBundlePhase.RICE_READY;
                this.updateInstruction('大米蒸好了！');
                this.showMessage('🍚 大米蒸制完成！');
                this.checkMixingReady();
                this.unschedule(this.startSteamingRice);
            }
        }, deltaTime, this.STEAM_TIME / deltaTime);
    }

    private updateRiceProgress(progress: number): void {
        if (this.riceProgress) {
            const transform = this.riceProgress.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(60 * Math.max(0.05, progress), 10);
            }
            const sprite = this.riceProgress.getComponent(Sprite);
            if (sprite) {
                sprite.color = progress >= 1 ? new Color(100, 200, 100) : new Color(200, 200, 100);
            }
        }
    }

    private checkMixingReady(): void {
        if (this.potatoSteamed && this.riceSteamed && !this.mixed) {
            this.updateInstruction('点击搅拌盆开始搅拌');
        }
    }

    private handleMixingClick(): void {
        if (!this.potatoSteamed || !this.riceSteamed) {
            this.showMessage('需要先蒸好土豆和大米');
            return;
        }
        if (this.mixed) {
            this.showMessage('已经搅拌好了');
            return;
        }

        this.currentPhase = RiceBundlePhase.MIXING;
        this.updateInstruction('正在搅拌...');
        this.startMixing();
    }

    private startMixing(): void {
        this.mixProgressValue = 0;
        const deltaTime = 0.1;

        this.schedule(() => {
            this.mixProgressValue += deltaTime;
            this.updateMixProgress(this.mixProgressValue / this.MIX_TIME);

            if (this.mixProgressValue >= this.MIX_TIME) {
                this.mixed = true;
                this.currentPhase = RiceBundlePhase.MIXED;
                this.updateInstruction('搅拌完成！点击生菜铺菜叶');
                this.showMessage('🥣 搅拌完成！');
                this.unschedule(this.startMixing);
            }
        }, deltaTime, this.MIX_TIME / deltaTime);
    }

    private updateMixProgress(progress: number): void {
        if (this.mixProgress) {
            const transform = this.mixProgress.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(80 * Math.max(0.05, progress), 10);
            }
            const sprite = this.mixProgress.getComponent(Sprite);
            if (sprite) {
                sprite.color = progress >= 1 ? new Color(100, 200, 100) : new Color(200, 150, 100);
            }
        }
    }

    private handleLettuceClick(): void {
        if (!this.mixed) {
            this.showMessage('需要先完成搅拌');
            return;
        }
        if (this.currentPhase === RiceBundlePhase.ON_LEAF || this.currentPhase === RiceBundlePhase.ROLLING) {
            this.showMessage('菜叶已经铺好了，点击菜叶区域进行卷制');
            return;
        }

        this.consumeIngredient(IngredientType.LETTUCE, 1);
        this.currentPhase = RiceBundlePhase.ON_LEAF;
        this.rollCount = 0;
        this.updateInstruction('菜叶铺好！连点菜叶区域5次完成卷制');
        this.updateRollProgress();
        this.showMessage('🥬 菜叶铺好了！');
    }

    private handleRollClick(): void {
        if (this.currentPhase !== RiceBundlePhase.ON_LEAF && this.currentPhase !== RiceBundlePhase.ROLLING) {
            return;
        }

        if (this.currentPhase === RiceBundlePhase.ON_LEAF) {
            this.currentPhase = RiceBundlePhase.ROLLING;
        }

        this.rollCount++;
        this.updateRollProgress();

        if (this.rollCount >= this.requiredRolls) {
            this.currentPhase = RiceBundlePhase.PACKED;
            this.updateInstruction('卷制完成！点击香菜完成打包');
            this.showMessage('🌯 卷制完成！');
        } else {
            this.updateInstruction(`继续卷制... (${this.rollCount}/${this.requiredRolls})`);
        }
    }

    private updateRollProgress(): void {
        if (this.rollProgress) {
            const progress = this.rollCount / this.requiredRolls;
            const transform = this.rollProgress.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(80 * Math.max(0.05, progress), 10);
            }
            const sprite = this.rollProgress.getComponent(Sprite);
            if (sprite) {
                sprite.color = progress >= 1 ? new Color(100, 200, 100) : new Color(200, 200, 100);
            }
        }
    }

    private handleCilantroClick(): void {
        if (this.currentPhase !== RiceBundlePhase.PACKED) {
            this.showMessage('需要先完成卷制');
            return;
        }

        this.consumeIngredient(IngredientType.CILANTRO, 1);
        this.showMessage('🌿 东北饭包制作完成！+¥12');

        // 增加收入和评价
        this.addMoney(12);
        this.addReview('good');

        // 重置状态准备下一份
        this.resetForNextOrder();
    }

    // ==================== 辅助方法 ====================

    private consumeIngredient(type: IngredientType, count: number): boolean {
        const inventory = InventoryManager.instance;
        if (!inventory) return true;
        return inventory.consumeIngredient(type, count);
    }

    private hasIngredientStock(type: IngredientType): boolean {
        const inventory = InventoryManager.instance;
        if (!inventory) return true;
        return inventory.getAvailableCount(type) > 0;
    }

    private addMoney(amount: number) {
        this.totalMoney += amount;
        this.updateMoneyDisplay();
    }

    private addReview(type: 'good' | 'bad') {
        if (type === 'good') {
            this.goodReviews++;
        } else {
            this.badReviews++;
        }
        this.updateReviewDisplay();
    }

    private resetForNextOrder(): void {
        this.currentPhase = RiceBundlePhase.IDLE;
        this.potatoSteamed = false;
        this.riceSteamed = false;
        this.mixed = false;
        this.rollCount = 0;
        this.steamProgress = 0;
        this.mixProgressValue = 0;

        this.updateInstruction('准备制作下一份饭包');
        this.updateProgressDisplay();
    }

    private updateProgressDisplay(): void {
        this.updatePotatoProgress(this.potatoSteamed ? 1 : 0);
        this.updateRiceProgress(this.riceSteamed ? 1 : 0);
        this.updateMixProgress(this.mixed ? 1 : 0);
        this.updateRollProgress();
    }

    private updateInstruction(text: string): void {
        if (this.instructionLabel) {
            this.instructionLabel.string = text;
        }
    }

    private updateMoneyDisplay(): void {
        if (this.moneyLabel) {
            this.moneyLabel.string = `💰 金币: ${this.totalMoney}`;
        }
    }

    private updateReviewDisplay(): void {
        if (this.reviewLabel) {
            this.reviewLabel.string = `⭐ 好评: ${this.goodReviews} | 差评: ${this.badReviews}`;
        }
    }

    private showMessage(message: string): void {
        console.log(`[RiceBundleControllerSimple] 💬 ${message}`);
    }

    protected onDestroy(): void {
        this.unscheduleAllCallbacks();
    }
}
