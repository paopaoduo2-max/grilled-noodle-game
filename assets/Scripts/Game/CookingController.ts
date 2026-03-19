import { _decorator, Component, Node, Label, Button, Sprite, Color, tween, Vec3, find, SpriteFrame, resources, UITransform } from 'cc';
import { TutorialManager } from '../Tutorial/TutorialManager';
import { IngredientType } from '../Data/GameConfig';  // 🔥 从GameConfig统一导入
const { ccclass, property } = _decorator;

// 🔥 IngredientType 已移至 GameConfig.ts 统一定义

/**
 * 烹饪阶段
 */
export enum CookingPhase {
    IDLE = 'idle',                   // 空闲
    OIL_APPLIED = 'oil_applied',     // 已刷油
    DOUGH_PLACED = 'dough_placed',   // 面饼已放
    EGG_ADDED = 'egg_added',         // 鸡蛋已加（等待点击翻面）
    FLIPPED = 'flipped',             // 已翻面
    SAUCE_APPLIED = 'sauce_applied', // 已刷酱
    TOPPINGS_ADDED = 'toppings_added', // 配料已加完
    ROLLED = 'rolled',               // 已卷起
    CUT = 'cut',                     // 已切块
    PACKED = 'packed'                // 已打包
}

/**
 * 单个香肠数据
 */
interface SausageData {
    node: Node;
    cookProgress: number;  // 0-1 烤制进度
    isCooked: boolean;
}

/**
 * 食材配置
 */
interface IngredientConfig {
    type: IngredientType;
    name: string;
    spriteKey: string;  // 用于后期加载图片的key
}

/**
 * 烤冷面控制器
 * 完整流程：刷油→放面饼→打蛋→翻面→刷酱→加配料(香肠/洋葱/香菜)→卷起→切块→打包
 */
@ccclass('CookingController')
export class CookingController extends Component {
    // ==================== 节点引用 ====================
    @property(Node)
    grillArea: Node = null;

    @property(Node)
    foodContainer: Node = null;

    @property(Node)
    sausageContainer: Node = null;  // 香肠烤制区域

    @property(Node)
    handItemLabel: Node = null;

    // ==================== 按钮引用 ====================
    @property(Button)
    oilBtn: Button = null;

    @property(Button)
    doughBtn: Button = null;

    @property(Button)
    eggBtn: Button = null;

    @property(Button)
    sauceBtn: Button = null;

    @property(Button)
    sausageBtn: Button = null;

    @property(Button)
    onionBtn: Button = null;

    @property(Button)
    cilantroBtn: Button = null;

    // ==================== 配置 ====================
    private readonly MAX_SAUSAGES = 6;           // 最大香肠数量
    private readonly SAUSAGE_COOK_TIME = 3;      // 香肠烤制时间（秒）
    private readonly REQUIRED_TOPPINGS = [       // 必需的配料
        IngredientType.SAUSAGE,
        IngredientType.ONION,
        IngredientType.CILANTRO
    ];

    // 食材配置表
    private ingredientConfigs: Map<IngredientType, IngredientConfig> = new Map([
        [IngredientType.DOUGH, { type: IngredientType.DOUGH, name: '面饼', spriteKey: 'dough' }],
        [IngredientType.EGG, { type: IngredientType.EGG, name: '鸡蛋', spriteKey: 'egg' }],
        [IngredientType.CILANTRO, { type: IngredientType.CILANTRO, name: '香菜', spriteKey: 'cilantro' }],
        [IngredientType.ONION, { type: IngredientType.ONION, name: '洋葱', spriteKey: 'onion' }],
        [IngredientType.OIL, { type: IngredientType.OIL, name: '油', spriteKey: 'oil' }],
        [IngredientType.SAUSAGE, { type: IngredientType.SAUSAGE, name: '香肠', spriteKey: 'sausage' }],
        [IngredientType.SAUCE, { type: IngredientType.SAUCE, name: '酱料', spriteKey: 'sauce' }],
    ]);

    // ==================== 状态 ====================
    private cookingPhase: CookingPhase = CookingPhase.IDLE;
    private currentHandItem: IngredientType | null = null;
    private foodOnGrill: Node | null = null;
    private addedToppings: IngredientType[] = [];  // 已添加的配料
    private isOilApplied: boolean = false;

    // 香肠管理
    private sausages: SausageData[] = [];
    private brushNode: Node | null = null;

    // 教程管理器
    private tutorialManager: TutorialManager = null;

    // ==================== 生命周期 ====================
    onLoad() {
        console.log('[CookingController] 初始化');
        this.setupButtons();
        this.createSausageContainer();
    }

    start() {
        // 在 start 中查找教程管理器，确保场景已完全加载
        this.findTutorialManager();
    }

    // ==================== 初始化 ====================
    private setupButtons() {
        // 油
        this.oilBtn?.node.on(Button.EventType.CLICK, this.onOilClick, this);
        // 面饼
        this.doughBtn?.node.on(Button.EventType.CLICK, this.onDoughClick, this);
        // 鸡蛋
        this.eggBtn?.node.on(Button.EventType.CLICK, this.onEggClick, this);
        // 酱料
        this.sauceBtn?.node.on(Button.EventType.CLICK, this.onSauceClick, this);
        // 香肠
        this.sausageBtn?.node.on(Button.EventType.CLICK, this.onSausageClick, this);
        // 洋葱
        this.onionBtn?.node.on(Button.EventType.CLICK, this.onOnionClick, this);
        // 香菜
        this.cilantroBtn?.node.on(Button.EventType.CLICK, this.onCilantroClick, this);
        // 铁板点击
        this.grillArea?.on(Node.EventType.TOUCH_END, this.onGrillClick, this);
    }

    private findTutorialManager() {
        // 尝试多种路径查找
        let tutorialPanel = find('Canvas/TutorialPanel');
        if (!tutorialPanel) {
            tutorialPanel = find('CookingScene/Canvas/TutorialPanel');
        }
        
        if (tutorialPanel) {
            this.tutorialManager = tutorialPanel.getComponent(TutorialManager);
            if (this.tutorialManager) {
                console.log('[CookingController] 找到教程管理器');
            } else {
                console.warn('[CookingController] TutorialPanel 找到了，但没有 TutorialManager 组件');
            }
        } else {
            console.warn('[CookingController] 未找到 TutorialPanel 节点');
        }
    }

    private createSausageContainer() {
        if (!this.sausageContainer && this.foodContainer) {
            this.sausageContainer = new Node('SausageContainer');
            this.sausageContainer.setPosition(120, -60, 0);
            this.foodContainer.parent.addChild(this.sausageContainer);
        }
    }

    // ==================== 按钮点击处理 ====================
    
    /** 点击油按钮 */
    private onOilClick() {
        if (this.isOilApplied) {
            this.showMessage('⚠️ 已经刷过油了！');
            return;
        }
        if (this.foodOnGrill) {
            this.showMessage('⚠️ 铁板上有食物，无法刷油！');
            return;
        }

        this.isOilApplied = true;
        this.cookingPhase = CookingPhase.OIL_APPLIED;
        this.showMessage('✅ 油刷好了！可以放面饼了！');
        this.triggerTutorialAction('oil_applied');
    }

    /** 点击面饼按钮 */
    private onDoughClick() {
        if (!this.isOilApplied) {
            this.showMessage('❌ 请先刷油！');
            return;
        }
        if (this.foodOnGrill) {
            this.showMessage('⚠️ 铁板上已经有面饼了！');
            return;
        }

        this.placeDough();
    }

    /** 点击鸡蛋按钮 */
    private onEggClick() {
        if (this.cookingPhase !== CookingPhase.DOUGH_PLACED) {
            this.showMessage('❌ 请先放面饼！');
            return;
        }

        this.currentHandItem = IngredientType.EGG;
        this.updateHandDisplay();
        this.showMessage('✋ 拿起了鸡蛋，点击面饼打蛋！');
        this.triggerTutorialAction('egg_picked');
    }

    /** 点击酱料按钮 */
    private onSauceClick() {
        if (this.cookingPhase !== CookingPhase.FLIPPED) {
            this.showMessage('❌ 请先翻面！');
            return;
        }

        this.currentHandItem = IngredientType.SAUCE;
        this.updateHandDisplay();
        this.showMessage('✋ 拿起了酱料刷子，点击面饼刷酱！');
        this.triggerTutorialAction('sauce_picked');
    }

    /** 点击香肠按钮 - 添加香肠到烤盘 */
    private onSausageClick() {
        // 添加新香肠到烤盘
        if (this.sausages.length >= this.MAX_SAUSAGES) {
            this.showMessage(`⚠️ 最多只能烤${this.MAX_SAUSAGES}个香肠！`);
            return;
        }

        if (!this.isOilApplied) {
            this.showMessage('❌ 请先刷油！');
            return;
        }

        this.addSausageToGrill();
    }

    /** 点击洋葱按钮 */
    private onOnionClick() {
        if (this.cookingPhase !== CookingPhase.SAUCE_APPLIED && 
            this.cookingPhase !== CookingPhase.TOPPINGS_ADDED) {
            this.showMessage('❌ 请先刷酱！');
            return;
        }

        this.currentHandItem = IngredientType.ONION;
        this.updateHandDisplay();
        this.showMessage('✋ 拿起了洋葱，点击面饼添加！');
        this.triggerTutorialAction('onion_picked');
    }

    /** 点击香菜按钮 */
    private onCilantroClick() {
        if (this.cookingPhase !== CookingPhase.SAUCE_APPLIED && 
            this.cookingPhase !== CookingPhase.TOPPINGS_ADDED) {
            this.showMessage('❌ 请先刷酱！');
            return;
        }

        this.currentHandItem = IngredientType.CILANTRO;
        this.updateHandDisplay();
        this.showMessage('✋ 拿起了香菜，点击面饼添加！');
        this.triggerTutorialAction('cilantro_picked');
    }

    // ==================== 铁板点击处理 ====================
    private onGrillClick() {
        // 根据当前阶段和手持物品决定操作
        switch (this.cookingPhase) {
            case CookingPhase.DOUGH_PLACED:
                // 手上有鸡蛋 -> 打蛋
                if (this.currentHandItem === IngredientType.EGG) {
                    this.addEgg();
                }
                break;

            case CookingPhase.EGG_ADDED:
                // 点击面饼 -> 翻面
                this.flipDough();
                break;

            case CookingPhase.FLIPPED:
                // 手上有酱料 -> 刷酱
                if (this.currentHandItem === IngredientType.SAUCE) {
                    this.applySauce();
                }
                break;

            case CookingPhase.SAUCE_APPLIED:
            case CookingPhase.TOPPINGS_ADDED:
                // 手上有配料 -> 添加配料
                if (this.currentHandItem && this.REQUIRED_TOPPINGS.indexOf(this.currentHandItem) !== -1) {
                    this.addTopping(this.currentHandItem);
                }
                break;

            case CookingPhase.ROLLED:
                // 点击 -> 切块
                this.cutFood();
                break;

            case CookingPhase.CUT:
                // 点击 -> 打包
                this.packFood();
                break;
        }

        // 检查是否配料添加完成，可以卷起
        if (this.cookingPhase === CookingPhase.TOPPINGS_ADDED && !this.currentHandItem) {
            if (this.isToppingsComplete()) {
                this.rollFood();
            }
        }
    }

    // ==================== 烹饪操作 ====================

    /** 放置面饼 */
    private placeDough() {
        this.foodOnGrill = this.createFoodNode('Dough', '🍞', 80);
        this.foodOnGrill.setPosition(0, 0, 0);
        this.foodContainer.addChild(this.foodOnGrill);

        // 动画
        this.foodOnGrill.setScale(0, 0, 1);
        tween(this.foodOnGrill)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        this.cookingPhase = CookingPhase.DOUGH_PLACED;
        this.showMessage('✅ 面饼放好了！点击鸡蛋打蛋！');
        this.triggerTutorialAction('dough_placed');
    }

    /** 打蛋 */
    private addEgg() {
        if (!this.foodOnGrill) return;

        const eggNode = this.createFoodNode('Egg', '🥚', 50);
        eggNode.setPosition(0, 20, 0);
        this.foodOnGrill.addChild(eggNode);

        // 动画
        eggNode.setScale(0, 0, 1);
        tween(eggNode)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();

        this.currentHandItem = null;
        this.updateHandDisplay();
        this.cookingPhase = CookingPhase.EGG_ADDED;
        this.showMessage('✅ 鸡蛋打好了！点击面饼翻面！');
        this.triggerTutorialAction('egg_added');
    }

    /** 翻面 */
    private flipDough() {
        if (!this.foodOnGrill) return;

        // 翻面动画
        tween(this.foodOnGrill)
            .to(0.15, { scale: new Vec3(1, 0, 1) })
            .call(() => {
                // 改变显示
                const label = this.foodOnGrill.getComponent(Label);
                if (label) {
                    label.string = '🍳';
                }
                // 清除子节点（鸡蛋翻到下面了）
                this.foodOnGrill.removeAllChildren();
            })
            .to(0.15, { scale: new Vec3(1, 1, 1) })
            .start();

        this.cookingPhase = CookingPhase.FLIPPED;
        this.showMessage('✅ 翻面成功！点击酱料刷酱！');
        this.triggerTutorialAction('flipped');
    }

    /** 刷酱 */
    private applySauce() {
        if (!this.foodOnGrill) return;

        // 创建刷子
        this.brushNode = this.createFoodNode('Brush', '🖌️', 40);
        this.brushNode.setPosition(-80, 40, 0);
        this.foodContainer.addChild(this.brushNode);

        // 刷酱动画
        tween(this.brushNode)
            .to(0.25, { position: new Vec3(80, 40, 0) })
            .to(0.25, { position: new Vec3(-80, 20, 0) })
            .to(0.25, { position: new Vec3(80, 20, 0) })
            .to(0.25, { position: new Vec3(-80, 0, 0) })
            .to(0.25, { position: new Vec3(80, 0, 0) })
            .call(() => {
                this.brushNode?.destroy();
                this.brushNode = null;
                this.finishApplySauce();
            })
            .start();

        this.currentHandItem = null;
        this.updateHandDisplay();
    }

    private finishApplySauce() {
        // 添加酱料效果
        const sauceEffect = this.createFoodNode('SauceEffect', '✨', 25);
        sauceEffect.setPosition(0, 15, 0);
        this.foodOnGrill?.addChild(sauceEffect);

        this.cookingPhase = CookingPhase.SAUCE_APPLIED;
        this.showMessage('✅ 酱刷好了！添加香肠、洋葱、香菜！');
        this.triggerTutorialAction('sauce_applied');
    }

    /** 添加配料 */
    private addTopping(type: IngredientType) {
        if (!this.foodOnGrill) return;
        if (this.addedToppings.indexOf(type) !== -1) {
            this.showMessage(`⚠️ ${this.ingredientConfigs.get(type)?.name}已经添加过了！`);
            return;
        }

        const config = this.ingredientConfigs.get(type);
        const emojis: { [key: string]: string } = {
            [IngredientType.SAUSAGE]: '🌭',
            [IngredientType.ONION]: '🧅',
            [IngredientType.CILANTRO]: '🌿'
        };

        const toppingNode = this.createFoodNode(config.name, emojis[type], 35);
        const index = this.addedToppings.length;
        toppingNode.setPosition(-30 + index * 30, 35, 0);
        this.foodOnGrill.addChild(toppingNode);

        // 动画
        toppingNode.setScale(0, 0, 1);
        tween(toppingNode)
            .to(0.2, { scale: new Vec3(1.2, 1.2, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();

        this.addedToppings.push(type);
        this.currentHandItem = null;
        this.updateHandDisplay();

        this.showMessage(`✅ ${config.name}已添加！`);
        this.triggerTutorialAction(`${type}_added`);

        // 检查配料是否完成
        if (this.isToppingsComplete()) {
            this.cookingPhase = CookingPhase.TOPPINGS_ADDED;
            this.showMessage('🎉 配料添加完成！点击面饼卷起！');
            this.triggerTutorialAction('toppings_added');
        }
    }

    /** 卷起 */
    private rollFood() {
        if (!this.foodOnGrill) return;

        tween(this.foodOnGrill)
            .to(0.2, { scale: new Vec3(0.8, 1.2, 1) })
            .to(0.3, { scale: new Vec3(0.5, 1.5, 1) })
            .call(() => {
                const label = this.foodOnGrill.getComponent(Label);
                if (label) {
                    label.string = '🌯';
                    label.fontSize = 80;
                }
                this.foodOnGrill.removeAllChildren();
            })
            .to(0.2, { scale: new Vec3(1, 1, 1) })
            .start();

        this.cookingPhase = CookingPhase.ROLLED;
        this.showMessage('✅ 卷好了！点击切块！');
        this.triggerTutorialAction('rolled');
    }

    /** 切块 */
    private cutFood() {
        if (!this.foodOnGrill) return;

        tween(this.foodOnGrill)
            .to(0.1, { scale: new Vec3(1.1, 0.9, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .to(0.1, { scale: new Vec3(1.1, 0.9, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .to(0.1, { scale: new Vec3(1.1, 0.9, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .call(() => {
                const label = this.foodOnGrill.getComponent(Label);
                if (label) {
                    label.string = '🍢🍢🍢';
                    label.fontSize = 45;
                }
            })
            .start();

        this.cookingPhase = CookingPhase.CUT;
        this.showMessage('✅ 切好了！点击打包！');
        this.triggerTutorialAction('cut');
    }

    /** 打包 */
    private packFood() {
        if (!this.foodOnGrill) return;

        tween(this.foodOnGrill)
            .to(0.3, { scale: new Vec3(0.8, 0.8, 1) })
            .call(() => {
                const label = this.foodOnGrill.getComponent(Label);
                if (label) {
                    label.string = '🍱';
                    label.fontSize = 80;
                }
            })
            .to(0.2, { scale: new Vec3(1, 1, 1) })
            .delay(0.5)
            .call(() => {
                this.cookingPhase = CookingPhase.PACKED;
                this.showMessage('🎉 打包完成！');
                this.triggerTutorialAction('packed');
                this.serveFood();
            })
            .start();
    }

    /** 上菜 */
    private serveFood() {
        if (!this.foodOnGrill) return;

        tween(this.foodOnGrill)
            .to(0.5, { position: new Vec3(300, 150, 0), scale: new Vec3(0.5, 0.5, 1) })
            .call(() => {
                this.showMessage('🎊 烤冷面制作完成！');
                this.triggerTutorialAction('served');
                this.resetGrill();
            })
            .start();
    }

    // ==================== 香肠管理 ====================

    /** 添加香肠到烤盘 */
    private addSausageToGrill() {
        const sausageNode = this.createFoodNode('Sausage', '🌭', 50);
        
        // 计算位置（6个位置排列在铁板右侧）
        const index = this.sausages.length;
        const col = index % 3;
        const row = Math.floor(index / 3);
        sausageNode.setPosition(col * 45 - 45, row * -40, 0);
        
        // 生香肠颜色（粉色）
        const label = sausageNode.getComponent(Label);
        if (label) {
            label.color = new Color(255, 180, 180, 255);
        }

        this.sausageContainer.addChild(sausageNode);

        // 动画
        sausageNode.setScale(0, 0, 1);
        tween(sausageNode)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        const sausageData: SausageData = {
            node: sausageNode,
            cookProgress: 0,
            isCooked: false
        };
        this.sausages.push(sausageData);

        // 添加点击事件 - 点击香肠拿起
        sausageNode.on(Node.EventType.TOUCH_END, () => this.onSausageNodeClick(sausageData), this);

        // 开始烤制
        this.schedule(() => this.updateSausageCooking(sausageData), 0.1);

        this.showMessage(`🌭 香肠放到烤盘了！(${this.sausages.length}/${this.MAX_SAUSAGES})`);
        this.triggerTutorialAction('sausage_placed');
    }

    /** 点击铁板上的香肠 */
    private onSausageNodeClick(sausage: SausageData) {
        if (!sausage.isCooked) {
            this.showMessage('⏳ 香肠还没烤熟，请等待变成棕色！');
            return;
        }

        // 只有在刷酱后才能拿起香肠
        if (this.cookingPhase !== CookingPhase.SAUCE_APPLIED && 
            this.cookingPhase !== CookingPhase.TOPPINGS_ADDED) {
            this.showMessage('❌ 请先完成翻面和刷酱！');
            return;
        }

        this.pickUpSausage(sausage);
    }

    /** 更新香肠烤制状态 */
    private updateSausageCooking(sausage: SausageData) {
        if (sausage.isCooked || !sausage.node.isValid) {
            return;
        }

        sausage.cookProgress += 0.1 / this.SAUSAGE_COOK_TIME;

        // 颜色渐变：粉色 -> 棕色
        const label = sausage.node.getComponent(Label);
        if (label) {
            const p = Math.min(sausage.cookProgress, 1);
            const r = Math.floor(255 - p * 115);  // 255 -> 140
            const g = Math.floor(180 - p * 110);  // 180 -> 70
            const b = Math.floor(180 - p * 140);  // 180 -> 40
            label.color = new Color(r, g, b, 255);
        }

        // 抖动效果
        if (Math.random() > 0.7) {
            const shake = (Math.random() - 0.5) * 3;
            const pos = sausage.node.position;
            sausage.node.setPosition(pos.x + shake, pos.y, 0);
        }

        // 烤熟
        if (sausage.cookProgress >= 1 && !sausage.isCooked) {
            sausage.isCooked = true;
            
            // 烤熟动画
            tween(sausage.node)
                .to(0.15, { scale: new Vec3(1.2, 1.2, 1) })
                .to(0.15, { scale: new Vec3(1, 1, 1) })
                .start();

            this.showMessage('✅ 香肠烤熟了！');
            this.triggerTutorialAction('sausage_cooked');
        }
    }

    /** 拿起烤熟的香肠 */
    private pickUpSausage(sausage: SausageData) {
        // 移除香肠
        const index = this.sausages.indexOf(sausage);
        if (index !== -1) {
            this.sausages.splice(index, 1);
        }
        sausage.node.destroy();

        this.currentHandItem = IngredientType.SAUSAGE;
        this.updateHandDisplay();
        this.showMessage('✋ 拿起了烤熟的香肠，点击面饼添加！');
        this.triggerTutorialAction('sausage_picked');
    }

    // ==================== 工具方法 ====================

    /** 创建食物节点（使用Label，后期可替换为Sprite） */
    private createFoodNode(name: string, emoji: string, fontSize: number): Node {
        const node = new Node(name);
        
        // 添加 UITransform 组件（用于接收点击事件）
        const uiTransform = node.addComponent(UITransform);
        uiTransform.contentSize.set(fontSize, fontSize);
        
        const label = node.addComponent(Label);
        label.string = emoji;
        label.fontSize = fontSize;
        label.color = Color.WHITE;
        // 后期可以在这里添加 Sprite 组件并加载图片
        // const sprite = node.addComponent(Sprite);
        // resources.load(`Cooking/${spriteKey}/spriteFrame`, SpriteFrame, (err, sf) => {
        //     if (!err) sprite.spriteFrame = sf;
        // });
        return node;
    }

    /** 检查配料是否完成 */
    private isToppingsComplete(): boolean {
        return this.REQUIRED_TOPPINGS.every(t => this.addedToppings.indexOf(t) !== -1);
    }

    /** 更新手持物品显示 */
    private updateHandDisplay() {
        if (!this.handItemLabel) return;

        const label = this.handItemLabel.getComponent(Label);
        if (!label) return;

        if (this.currentHandItem) {
            const config = this.ingredientConfigs.get(this.currentHandItem);
            const emojis: { [key: string]: string } = {
                [IngredientType.EGG]: '🥚',
                [IngredientType.SAUCE]: '🖌️',
                [IngredientType.SAUSAGE]: '🌭',
                [IngredientType.ONION]: '🧅',
                [IngredientType.CILANTRO]: '🌿'
            };
            label.string = `✋ ${emojis[this.currentHandItem] || ''}\n${config?.name || ''}`;
            this.handItemLabel.active = true;
        } else {
            this.handItemLabel.active = false;
        }
    }

    /** 重置铁板 */
    private resetGrill() {
        this.scheduleOnce(() => {
            // 清除食物
            this.foodOnGrill?.destroy();
            this.foodOnGrill = null;

            // 清除香肠
            this.sausages.forEach(s => s.node?.destroy());
            this.sausages = [];

            // 重置状态
            this.cookingPhase = CookingPhase.IDLE;
            this.currentHandItem = null;
            this.addedToppings = [];
            this.isOilApplied = false;

            this.brushNode?.destroy();
            this.brushNode = null;

            this.updateHandDisplay();
            this.showMessage('🍳 可以开始制作下一份烤冷面了！');
        }, 1);
    }

    /** 显示消息 */
    private showMessage(msg: string) {
        console.log(`[CookingController] ${msg}`);
        // TODO: 可以在这里添加UI消息显示
    }

    /** 触发教程动作 */
    private triggerTutorialAction(action: string) {
        if (this.tutorialManager) {
            this.tutorialManager.triggerAction(action);
        }
    }
}
