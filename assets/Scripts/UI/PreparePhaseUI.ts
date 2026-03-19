import { _decorator, Component, Node, Label, Button, Prefab, instantiate, Color, UITransform, Sprite, Layout } from 'cc';
import { GameManager } from '../Manager/GameManager';
import { GameConfig, IngredientType, ItemData, ItemType } from '../Data/GameConfig';
const { ccclass, property } = _decorator;

/**
 * 准备阶段UI控制器
 */
@ccclass('PreparePhaseUI')
export class PreparePhaseUI extends Component {
    @property(Node)
    ingredientPanel: Node = null;  // 食材面板

    @property(Node)
    itemShopPanel: Node = null;    // 道具商店面板

    @property(Node)
    infoPanel: Node = null;        // 信息面板

    @property(Label)
    moneyLabel: Label = null;      // 金币显示

    @property(Label)
    timerLabel: Label = null;      // 计时器显示

    @property(Label)
    levelNameLabel: Label = null;  // 关卡名称

    @property(Button)
    startCookingBtn: Button = null; // 开始营业按钮

    private _remainTime: number = 0;  // 剩余准备时间
    private _ingredientItems: Map<IngredientType, Node> = new Map();
    private _purchasedItems: Set<string> = new Set();  // 已购买的道具

    onLoad() {
        // 自动查找节点（如果属性没有绑定）
        if (!this.ingredientPanel) {
            this.ingredientPanel = this.node.getChildByPath('IngredientPanel');
        }
        
        if (!this.levelNameLabel) {
            const labelNode = this.node.getChildByPath('TopPanel/LevelNameLabel');
            if (labelNode) this.levelNameLabel = labelNode.getComponent(Label);
        }
        
        if (!this.moneyLabel) {
            const labelNode = this.node.getChildByPath('TopPanel/MoneyLabel');
            if (labelNode) this.moneyLabel = labelNode.getComponent(Label);
        }
        
        if (!this.timerLabel) {
            const labelNode = this.node.getChildByPath('TopPanel/TimerLabel');
            if (labelNode) this.timerLabel = labelNode.getComponent(Label);
        }
        
        if (!this.startCookingBtn) {
            const btnNode = this.node.getChildByPath('StartCookingBtn');
            if (btnNode) this.startCookingBtn = btnNode.getComponent(Button);
        }
        
        this.initUI();
        this.setupButtons();
    }

    start() {
        const gameManager = GameManager.Instance;
        if (!gameManager || !gameManager.currentLevel) {
            console.error('[PreparePhaseUI] GameManager或当前关卡不存在');
            return;
        }

        this._remainTime = gameManager.currentLevel.prepareTime;
        this.updateLevelInfo();
        this.createIngredientShop();
        this.createItemShop();
    }

    update(deltaTime: number) {
        // 更新计时器
        if (this._remainTime > 0) {
            this._remainTime -= deltaTime;
            if (this._remainTime < 0) this._remainTime = 0;
            this.updateTimer();
        }

        // 更新金币显示
        this.updateMoneyDisplay();
    }

    /**
     * 初始化UI
     */
    private initUI() {
        console.log('[PreparePhaseUI] 初始化UI');
    }

    /**
     * 设置按钮事件
     */
    private setupButtons() {
        if (this.startCookingBtn) {
            this.startCookingBtn.node.on(Button.EventType.CLICK, this.onStartCooking, this);
        }
    }

    /**
     * 更新关卡信息
     */
    private updateLevelInfo() {
        const gameManager = GameManager.Instance;
        const level = gameManager.currentLevel;

        if (this.levelNameLabel) {
            this.levelNameLabel.string = level.levelName;
        }
    }

    /**
     * 创建食材商店
     */
    private createIngredientShop() {
        if (!this.ingredientPanel) {
            console.error('[PreparePhaseUI] 食材面板不存在');
            return;
        }

        const gameManager = GameManager.Instance;
        const level = gameManager.currentLevel;

        // 获取当前关卡需要的食材类型
        const requiredIngredients = new Set<IngredientType>();
        for (const recipe of level.recipes) {
            for (const ingredient of recipe.ingredients) {
                requiredIngredients.add(ingredient.type);
            }
        }

        // 为每种食材创建购买按钮
        requiredIngredients.forEach(ingredientType => {
            const ingredientConfig = GameConfig.INGREDIENTS_CONFIG[ingredientType];
            const itemNode = this.createIngredientItem(ingredientType, ingredientConfig.name, ingredientConfig.price, ingredientConfig.color);
            this._ingredientItems.set(ingredientType, itemNode);
            this.ingredientPanel.addChild(itemNode);
        });

        console.log(`[PreparePhaseUI] 创建了 ${requiredIngredients.size} 种食材`);
    }

    /**
     * 创建食材项
     */
    private createIngredientItem(type: IngredientType, name: string, price: number, color: string): Node {
        const itemNode = new Node(`Ingredient_${type}`);
        const transform = itemNode.addComponent(UITransform);
        transform.setContentSize(150, 120);

        // 背景
        const bgSprite = itemNode.addComponent(Sprite);
        bgSprite.color = Color.WHITE;
        bgSprite.type = Sprite.Type.SLICED;

        // 食材显示块（用纯色代替）
        const iconNode = new Node('Icon');
        const iconTransform = iconNode.addComponent(UITransform);
        iconTransform.setContentSize(80, 80);
        const iconSprite = iconNode.addComponent(Sprite);
        iconSprite.color = new Color().fromHEX(color);
        iconNode.setPosition(0, 20, 0);
        itemNode.addChild(iconNode);

        // 名称标签
        const nameNode = new Node('Name');
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = name;
        nameLabel.fontSize = 18;
        nameLabel.color = Color.BLACK;
        nameNode.setPosition(0, -30, 0);
        itemNode.addChild(nameNode);

        // 价格标签
        const priceNode = new Node('Price');
        const priceLabel = priceNode.addComponent(Label);
        priceLabel.string = `¥${price}`;
        priceLabel.fontSize = 16;
        priceLabel.color = new Color(200, 150, 0, 255);
        priceNode.setPosition(-35, -50, 0);
        itemNode.addChild(priceNode);

        // 数量标签
        const countNode = new Node('Count');
        const countLabel = countNode.addComponent(Label);
        countLabel.string = `x0`;
        countLabel.fontSize = 16;
        countLabel.color = Color.BLACK;
        countNode.setPosition(35, -50, 0);
        itemNode.addChild(countNode);

        // 购买按钮
        const btnNode = new Node('BuyBtn');
        const btnTransform = btnNode.addComponent(UITransform);
        btnTransform.setContentSize(120, 35);
        const btnSprite = btnNode.addComponent(Sprite);
        btnSprite.color = new Color(100, 200, 100, 255);
        const btnButton = btnNode.addComponent(Button);
        btnNode.setPosition(0, -75, 0);
        
        const btnLabelNode = new Node('Label');
        const btnLabel = btnLabelNode.addComponent(Label);
        btnLabel.string = '购买 x1';
        btnLabel.fontSize = 16;
        btnLabel.color = Color.WHITE;
        btnNode.addChild(btnLabelNode);
        
        // 按钮点击事件
        btnButton.node.on(Button.EventType.CLICK, () => {
            this.onBuyIngredient(type, 1);
        }, this);

        itemNode.addChild(btnNode);

        return itemNode;
    }

    /**
     * 购买食材
     */
    private onBuyIngredient(type: IngredientType, count: number) {
        const gameManager = GameManager.Instance;
        const success = gameManager.buyIngredient(type, count);
        
        if (success) {
            console.log(`[PreparePhaseUI] 购买成功: ${type} x${count}`);
            this.updateIngredientCount(type);
        } else {
            console.warn('[PreparePhaseUI] 购买失败，金币不足');
            // TODO: 显示提示消息
        }
    }

    /**
     * 更新食材数量显示
     */
    private updateIngredientCount(type: IngredientType) {
        const itemNode = this._ingredientItems.get(type);
        if (!itemNode) return;

        const countNode = itemNode.getChildByName('Count');
        if (countNode) {
            const countLabel = countNode.getComponent(Label);
            if (countLabel) {
                const gameManager = GameManager.Instance;
                const count = gameManager.getIngredientCount(type);
                countLabel.string = `x${count}`;
            }
        }
    }

    /**
     * 更新金币显示
     */
    private updateMoneyDisplay() {
        if (this.moneyLabel) {
            const gameManager = GameManager.Instance;
            if (gameManager && gameManager.playerMoney !== undefined) {
                this.moneyLabel.string = `金币: ${gameManager.playerMoney}`;
            } else {
                this.moneyLabel.string = `金币: 0`;
            }
        }
    }

    /**
     * 更新计时器
     */
    private updateTimer() {
        if (this.timerLabel) {
            const minutes = Math.floor(this._remainTime / 60);
            const seconds = Math.floor(this._remainTime % 60);
            const secondsStr = seconds < 10 ? '0' + seconds : seconds.toString();
            this.timerLabel.string = `准备时间: ${minutes}:${secondsStr}`;
        }
    }

    /**
     * 开始营业
     */
    private onStartCooking() {
        console.log('[PreparePhaseUI] 点击开始营业');
        const gameManager = GameManager.Instance;
        gameManager.enterCookingPhase();
    }

    /**
     * 创建道具商店
     */
    private createItemShop() {
        if (!this.itemShopPanel) {
            console.warn('[PreparePhaseUI] 道具商店面板不存在，跳过创建');
            return;
        }

        const gameManager = GameManager.Instance;
        const currentLevel = gameManager.currentLevel;

        // 获取当前关卡可用的道具
        const availableItems = GameConfig.ITEMS.filter(item => item.unlockLevel <= currentLevel.levelId);

        if (availableItems.length === 0) {
            console.log('[PreparePhaseUI] 当前关卡无可用道具');
            return;
        }

        // 为每个道具创建购买按钮
        availableItems.forEach(item => {
            const itemNode = this.createItemShopItem(item);
            this.itemShopPanel.addChild(itemNode);
        });

        console.log(`[PreparePhaseUI] 创建了 ${availableItems.length} 个道具`);
    }

    /**
     * 创建道具商店项
     */
    private createItemShopItem(item: ItemData): Node {
        const itemNode = new Node(`Item_${item.itemId}`);
        const transform = itemNode.addComponent(UITransform);
        transform.setContentSize(160, 140);

        // 背景
        const bgSprite = itemNode.addComponent(Sprite);
        bgSprite.color = new Color().fromHEX(item.color);

        // 图标（用表情符号或颜色块）
        const iconNode = new Node('Icon');
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = item.icon || '📦';
        iconLabel.fontSize = 48;
        iconNode.setPosition(0, 30, 0);
        itemNode.addChild(iconNode);

        // 名称
        const nameNode = new Node('Name');
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = item.name;
        nameLabel.fontSize = 16;
        nameLabel.color = Color.WHITE;
        nameLabel.overflow = Label.Overflow.SHRINK;
        const nameTransform = nameNode.getComponent(UITransform);
        if (nameTransform) {
            nameTransform.setContentSize(140, 30);
        }
        nameNode.setPosition(0, -10, 0);
        itemNode.addChild(nameNode);

        // 描述
        const descNode = new Node('Desc');
        const descLabel = descNode.addComponent(Label);
        descLabel.string = item.description;
        descLabel.fontSize = 11;
        descLabel.color = new Color(230, 230, 230, 255);
        descLabel.overflow = Label.Overflow.SHRINK;
        const descTransform = descNode.getComponent(UITransform);
        if (descTransform) {
            descTransform.setContentSize(140, 30);
        }
        descNode.setPosition(0, -35, 0);
        itemNode.addChild(descNode);

        // 购买按钮
        const btnNode = new Node('BuyBtn');
        const btnTransform = btnNode.addComponent(UITransform);
        btnTransform.setContentSize(130, 30);
        const btnSprite = btnNode.addComponent(Sprite);
        btnSprite.color = new Color(255, 200, 0, 255);
        const button = btnNode.addComponent(Button);
        btnNode.setPosition(0, -60, 0);
        itemNode.addChild(btnNode);

        // 按钮文字
        const btnTextNode = new Node('Text');
        const btnLabel = btnTextNode.addComponent(Label);
        btnLabel.string = `购买 💰${item.price}`;
        btnLabel.fontSize = 14;
        btnLabel.color = Color.BLACK;
        btnNode.addChild(btnTextNode);

        // 按钮事件
        button.node.on(Button.EventType.CLICK, () => {
            this.onBuyItem(item, button, btnLabel);
        }, this);

        return itemNode;
    }

    /**
     * 购买道具
     */
    private onBuyItem(item: ItemData, button: Button, btnLabel: Label) {
        const gameManager = GameManager.Instance;

        // 检查GameManager是否存在
        if (!gameManager || gameManager.playerMoney === undefined) {
            console.warn('[PreparePhaseUI] GameManager不存在或未初始化');
            return;
        }

        // 检查是否已购买
        if (this._purchasedItems.has(item.itemId)) {
            console.log(`[PreparePhaseUI] 道具已购买: ${item.name}`);
            return;
        }

        // 检查金币
        if (gameManager.playerMoney < item.price) {
            console.log(`[PreparePhaseUI] 金币不足，无法购买: ${item.name}`);
            return;
        }

        // 扣除金币
        gameManager.addMoney(-item.price);

        // 记录购买
        this._purchasedItems.add(item.itemId);

        // 应用道具效果（保存到GameManager，在CookingScene中生效）
        if (!gameManager['purchasedItems']) {
            gameManager['purchasedItems'] = new Set();
        }
        gameManager['purchasedItems'].add(item.itemId);

        // 更新按钮状态
        button.interactable = false;
        btnLabel.string = '✓ 已购买';
        btnLabel.color = new Color(100, 100, 100, 255);

        console.log(`[PreparePhaseUI] 购买道具: ${item.name}`);
    }
}

