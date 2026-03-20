import { _decorator, Component, Node, Label, Button, Prefab, instantiate, ScrollView, Color, UITransform, Vec3, director, Graphics, Sprite } from 'cc';
import { SHOP_ITEMS, RICE_BUNDLE_SHOP_ITEMS, GUO_BAO_ROU_SHOP_ITEMS, RICE_BUNDLE_QUICK_BUY_CONFIG, GUO_BAO_ROU_QUICK_BUY_CONFIG, getRiceBundleQuickBuyTotalPrice, getGuoBaoRouQuickBuyTotalPrice, ShopItemData, getLevelData, QUICK_BUY_CONFIG, getQuickBuyTotalPrice } from '../Data/ShopData';
import { InventoryManager } from '../Manager/InventoryManager';
import { IngredientType } from '../Data/GameConfig';
import { GameConfig } from '../Data/GameConfig';
import { GameProgressManager } from '../Manager/GameProgressManager';
import { EventManager } from '../Utils/EventManager';
import { GuideEvents } from '../Tutorial/GuideEvents';
import { FeatureGate } from '../Manager/FeatureGate';
import { SceneRouteService } from '../Manager/SceneRouteService';
import { WorldProgressManager } from '../Manager/WorldProgressManager';
import {
    IngredientFlavorConfig,
    WORLD_DEVICE_CONFIGS,
    WORLD_INGREDIENT_CONFIGS,
    getWorldDeviceUnlockPrice,
    getWorldMapConfig
} from '../Data/WorldRuntimeConfig';

const { ccclass, property } = _decorator;

// 必需食材列表（必须购买才能开始营业）
// 🔥 注：酱料、调料、油、水为无限使用食材，不需要购买
const REQUIRED_INGREDIENTS = [
    IngredientType.DOUGH,
    IngredientType.EGG
];

// 商品分类
enum ShopCategory {
    ESSENTIAL = 'essential',   // 必需品
    TOPPINGS = 'toppings',     // 配料
    CONDIMENTS = 'condiments'  // 调料
}

// 🎨 iOS扁平风格配色方案 - 边框透明度60%
// 🔥 商品分类配置（无限食材已移除）
const CATEGORY_CONFIG = {
    [ShopCategory.ESSENTIAL]: {
        name: '⭐ 必需食材',
        color: new Color(255, 237, 213, 240),      // 淡橙色 94%透明
        borderColor: new Color(251, 191, 36, 153), // 橙色边框 60%透明
        items: [IngredientType.DOUGH, IngredientType.EGG]
    },
    [ShopCategory.TOPPINGS]: {
        name: '🥗 新鲜配料',
        color: new Color(220, 252, 231, 240),      // 淡绿色 94%透明
        borderColor: new Color(34, 197, 94, 153),  // 绿色边框 60%透明
        items: [IngredientType.SAUSAGE, IngredientType.ONION, IngredientType.CILANTRO]
    }
    // 🔥 调料分类已移除，酱料/调料/油/水为无限使用
};

// 📱 iOS扁平风格面板配置
const PANEL_CONFIG = {
    background: {
        color: new Color(248, 250, 252, 245),      // 浅灰白 96%透明
        width: 820,
        height: 580,
        radius: 16
    },
    header: {
        height: 50,
        color: new Color(59, 130, 246, 255),       // iOS蓝
        fontSize: 20
    },
    footer: {
        height: 70,
        color: new Color(241, 245, 249, 255)       // 浅灰
    },
    card: {
        bgColor: new Color(255, 255, 255, 250),    // 白色卡片
        borderColor: new Color(226, 232, 240, 153),// 灰色边框 60%透明
        radius: 10
    }
};

/**
 * 购物界面控制器 - 分类卡片式布局
 */
@ccclass('ShopController')
export class ShopController extends Component {
    @property(Label)
    moneyLabel: Label = null;
    
    @property(Label)
    targetLabel: Label = null;
    
    @property(Label)
    levelNameLabel: Label = null;
    
    @property(Node)
    itemContainer: Node = null;
    
    @property(Label)
    totalLabel: Label = null;
    
    @property(Button)
    confirmButton: Button = null;
    
    @property(Button)
    nextButton: Button = null;
    
    @property(Node)
    cartPanel: Node = null;
    
    @property(Label)
    hintLabel: Label = null;


    // 购物车
    private cart: Map<string, number> = new Map();
    private shopItemNodes: Map<string, Node> = new Map();

    // 快捷购买面板
    private quickBuyPanel: Node = null;

    // 页头金额标签引用
    private headerMoneyLabel: Label = null;

    // ==================== 世界模式（单营业主流程） ====================
    private worldMode: boolean = false;
    private worldRoot: Node | null = null;
    private worldWalletLabel: Label | null = null;
    private worldStatusLabel: Label | null = null;

    // ==================== 关卡相关配置 ====================

    /**
     * 🔥 获取当前关卡的ID
     * 优先从 GameProgressManager 获取（场景切换后仍保持正确值）
     */
    private get currentLevelId(): number {
        // 🔥 优先从 GameProgressManager 获取当前关卡
        const progressManager = GameProgressManager.instance;
        if (progressManager?.progress?.currentLevel) {
            return progressManager.progress.currentLevel;
        }
        // 回退到 InventoryManager
        const inventory = InventoryManager.instance;
        return inventory?._currentLevel?.levelId || 1;
    }

    /**
     * 🔥 获取当前关卡的商品列表
     */
    private get currentShopItems(): ShopItemData[] {
        if (this.currentLevelId === 2) {
            return RICE_BUNDLE_SHOP_ITEMS;
        }
        if (this.currentLevelId === 3) {
            return GUO_BAO_ROU_SHOP_ITEMS;
        }
        return SHOP_ITEMS;
    }

    /**
     * 🔥 获取当前关卡的必需食材列表
     */
    private get currentRequiredIngredients(): IngredientType[] {
        if (this.currentLevelId === 2) {
            return [IngredientType.RICE, IngredientType.POTATO, IngredientType.EGG];
        }
        if (this.currentLevelId === 3) {
            return [
                IngredientType.PORK,
                IngredientType.POTATO_STARCH,
                IngredientType.RADISH,
                IngredientType.GINGER,
                IngredientType.GREEN_ONION
            ];
        }
        return [IngredientType.DOUGH, IngredientType.EGG];
    }

    /**
     * 🔥 获取当前关卡的商品分类配置
     */
    private get currentCategoryConfig(): any {
        if (this.currentLevelId === 2) {
            return {
                essential: {
                    name: '⭐ 必需食材',
                    color: new Color(255, 237, 213, 240),
                    borderColor: new Color(251, 191, 36, 153),
                    items: [IngredientType.RICE, IngredientType.POTATO]
                },
                toppings: {
                    name: '🥗 新鲜配料',
                    color: new Color(220, 252, 231, 240),
                    borderColor: new Color(34, 197, 94, 153),
                    items: [IngredientType.EGG, IngredientType.GREEN_ONION, IngredientType.LETTUCE, IngredientType.CILANTRO]
                }
            };
        }
        if (this.currentLevelId === 3) {
            return {
                essential: {
                    name: '🥩 必需食材',
                    color: new Color(255, 237, 213, 240),
                    borderColor: new Color(251, 191, 36, 153),
                    items: [IngredientType.PORK, IngredientType.POTATO_STARCH]
                },
                toppings: {
                    name: '🥕 新鲜配料',
                    color: new Color(220, 252, 231, 240),
                    borderColor: new Color(34, 197, 94, 153),
                    items: [IngredientType.RADISH, IngredientType.GINGER, IngredientType.GREEN_ONION]
                }
            };
        }
        // 第一关配置
        return {
            essential: {
                name: '⭐ 必需食材',
                color: new Color(255, 237, 213, 240),
                borderColor: new Color(251, 191, 36, 153),
                items: [IngredientType.DOUGH, IngredientType.EGG]
            },
            toppings: {
                name: '🥗 新鲜配料',
                color: new Color(220, 252, 231, 240),
                borderColor: new Color(34, 197, 94, 153),
                items: [IngredientType.SAUSAGE, IngredientType.ONION, IngredientType.CILANTRO]
            }
        };
    }

    /**
     * 🔥 获取当前关卡的一键购买配置
     */
    private get currentQuickBuyConfig(): { [itemId: string]: number } {
        if (this.currentLevelId === 2) {
            return RICE_BUNDLE_QUICK_BUY_CONFIG;
        }
        if (this.currentLevelId === 3) {
            return GUO_BAO_ROU_QUICK_BUY_CONFIG;
        }
        return QUICK_BUY_CONFIG;
    }

    /**
     * 🔥 获取当前关卡的一键购买总价
     */
    private get currentQuickBuyTotal(): number {
        if (this.currentLevelId === 2) {
            return getRiceBundleQuickBuyTotalPrice();
        }
        if (this.currentLevelId === 3) {
            return getGuoBaoRouQuickBuyTotalPrice();
        }
        return getQuickBuyTotalPrice();
    }

    onLoad() {
        if (FeatureGate.ENABLE_WORLD_SINGLE_FLOW && FeatureGate.ENABLE_WORLD_SHOP) {
            this.worldMode = true;
            this.setupWorldShopMode();
            return;
        }
        this.setupUI();
        this.setupButtons();
    }
    
    start() {
        if (this.worldMode) {
            this.refreshWorldShopView();
            return;
        }
        console.log(`[ShopController] 🔥 ShopController.start() - 当前关卡ID: ${this.currentLevelId}`);
        console.log(`[ShopController] 🔥 商品列表长度: ${this.currentShopItems.length}`);
        console.log(`[ShopController] 🔥 商品列表: ${this.currentShopItems.map(i => i.name).join(', ')}`);
        this.refreshDisplay();
        EventManager.Instance.emit(GuideEvents.SHOP_ENTER);
    }
    
    private setupUI() {
        if (this.nextButton) {
            this.nextButton.node.active = false;
        }
        
        // 📱 初始化iOS风格面板
        this.initPanelStyle();
        
        // 创建分类式商品列表
        this.createCategoryShopUI();
        
        // 更新确认按钮
        if (this.confirmButton) {
            const label = this.confirmButton.node.getComponentInChildren(Label);
            if (label) {
                label.string = '🛒 购买并开始营业';
            }
        }
    }
    
    /**
     * 📱 初始化iOS风格面板 - 页头+内容+页尾
     */
    private initPanelStyle() {
        const shopPanel = this.node;
        const mainPanel = shopPanel.parent;
        if (!mainPanel) return;
        
        const cfg = PANEL_CONFIG.background;
        const headerCfg = PANEL_CONFIG.header;
        const footerCfg = PANEL_CONFIG.footer;
        
        // 创建面板背景
        let panelBg = mainPanel.getChildByName('PanelBg');
        if (!panelBg) {
            panelBg = new Node('PanelBg');
            mainPanel.addChild(panelBg);
            panelBg.setSiblingIndex(0);
        }
        
        let graphics = panelBg.getComponent(Graphics) || panelBg.addComponent(Graphics);
        graphics.clear();
        
        // 绘制主背景（带边框）
        graphics.fillColor = cfg.color;
        graphics.strokeColor = new Color(203, 213, 225, 255);
        graphics.lineWidth = 1;
        graphics.roundRect(-cfg.width/2, -cfg.height/2, cfg.width, cfg.height, cfg.radius);
        graphics.fill();
        graphics.stroke();
        
        // 绘制页头
        graphics.fillColor = headerCfg.color;
        graphics.roundRect(-cfg.width/2, cfg.height/2 - headerCfg.height, cfg.width, headerCfg.height, cfg.radius);
        graphics.rect(-cfg.width/2, cfg.height/2 - headerCfg.height, cfg.width, cfg.radius);
        graphics.fill();
        
        // 绘制页尾
        graphics.fillColor = footerCfg.color;
        graphics.roundRect(-cfg.width/2, -cfg.height/2, cfg.width, footerCfg.height, cfg.radius);
        graphics.rect(-cfg.width/2, -cfg.height/2 + cfg.radius, cfg.width, footerCfg.height - cfg.radius);
        graphics.fill();
        
        let transform = panelBg.getComponent(UITransform) || panelBg.addComponent(UITransform);
        transform.setContentSize(cfg.width, cfg.height);
        
        // 创建页头标题
        this.createHeader(panelBg, cfg, headerCfg);
        
        // 创建页尾按钮
        this.createFooter(panelBg, cfg, footerCfg);
        
        console.log('[ShopController] 📱 iOS风格面板初始化完成');
    }
    
    /**
     * 创建页头
     */
    private createHeader(parent: Node, cfg: any, headerCfg: any) {
        let header = parent.getChildByName('Header');
        if (!header) {
            header = new Node('Header');
            parent.addChild(header);
        }
        header.setPosition(0, cfg.height/2 - headerCfg.height/2, 0);
        
        // 标题文字
        let titleNode = header.getChildByName('Title');
        if (!titleNode) {
            titleNode = new Node('Title');
            header.addChild(titleNode);
        }
        let titleLabel = titleNode.getComponent(Label) || titleNode.addComponent(Label);
        titleLabel.string = '🛒 食材采购';
        titleLabel.fontSize = headerCfg.fontSize;
        titleLabel.color = new Color(255, 255, 255, 255);
        titleLabel.isBold = true;
        
        // 金额显示
        let moneyNode = header.getChildByName('Money');
        if (!moneyNode) {
            moneyNode = new Node('Money');
            header.addChild(moneyNode);
        }
        moneyNode.setPosition(cfg.width/2 - 100, 0, 0);
        let moneyLabel = moneyNode.getComponent(Label) || moneyNode.addComponent(Label);
        const inventory = InventoryManager.instance;
        // 使用全局钱包余额
        const money = inventory?.globalWallet ?? 1000;
        moneyLabel.string = `💰 ¥${money}`;
        // 保存引用以便实时更新
        this.headerMoneyLabel = moneyLabel;
        moneyLabel.fontSize = 16;
        moneyLabel.color = new Color(255, 255, 255, 255);
        moneyLabel.isBold = true;
    }
    
    /**
     * 创建页尾 - 购买按钮卡片
     */
    private createFooter(parent: Node, cfg: any, footerCfg: any) {
        let footer = parent.getChildByName('Footer');
        if (!footer) {
            footer = new Node('Footer');
            parent.addChild(footer);
        }
        footer.setPosition(0, -cfg.height/2 + footerCfg.height/2, 0);
        
        // 购买按钮卡片
        const btnWidth = cfg.width - 40;
        const btnHeight = 50;
        
        let buyBtn = footer.getChildByName('BuyButton');
        if (!buyBtn) {
            buyBtn = new Node('BuyButton');
            footer.addChild(buyBtn);
        }
        
        let btnGraphics = buyBtn.getComponent(Graphics) || buyBtn.addComponent(Graphics);
        btnGraphics.clear();
        // iOS风格绿色按钮
        btnGraphics.fillColor = new Color(34, 197, 94, 255);
        btnGraphics.strokeColor = new Color(22, 163, 74, 255);
        btnGraphics.lineWidth = 2;
        btnGraphics.roundRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 12);
        btnGraphics.fill();
        btnGraphics.stroke();
        
        let btnTransform = buyBtn.getComponent(UITransform) || buyBtn.addComponent(UITransform);
        btnTransform.setContentSize(btnWidth, btnHeight);
        
        // 按钮文字
        let btnLabel = buyBtn.getChildByName('Label');
        if (!btnLabel) {
            btnLabel = new Node('Label');
            buyBtn.addChild(btnLabel);
        }
        let label = btnLabel.getComponent(Label) || btnLabel.addComponent(Label);
        label.string = '� 购买并开始营业';
        label.fontSize = 18;
        label.color = new Color(255, 255, 255, 255);
        label.isBold = true;
        
        // 绑定点击事件
        buyBtn.off(Node.EventType.TOUCH_END);
        buyBtn.on(Node.EventType.TOUCH_END, this.onConfirmAndStart, this);
    }
    
    private setupButtons() {
        if (this.confirmButton) {
            this.confirmButton.node.on(Button.EventType.CLICK, this.onConfirmAndStart, this);
        }
    }
    
    /**
     * 🔥 获取食材库存数量
     */
    private getIngredientStock(ingredientType: IngredientType): number {
        const inventory = InventoryManager.instance;
        if (!inventory) return 0;
        
        const levelData = inventory.currentLevel;
        if (!levelData) return 0;
        
        const itemData = levelData.inventory.get(ingredientType);
        if (!itemData) return 0;
        
        // 返回可用数量（已购买未使用的）
        return itemData.rawCount + itemData.processedCount;
    }
    
    /**
     * 🎨 创建分类式商品UI - iOS扁平风格
     */
    private createCategoryShopUI() {
        if (!this.itemContainer) {
            console.error('[ShopController] ❌ 商品容器未绑定');
            return;
        }

        // 🔥 调试：打印当前关卡信息
        console.log(`[ShopController] 🔥 createCategoryShopUI - 当前关卡ID: ${this.currentLevelId}`);
        console.log(`[ShopController] 🔥 InventoryManager._currentLevel:`, InventoryManager.instance?._currentLevel);

        this.itemContainer.removeAllChildren();
        this.shopItemNodes.clear();
        
        const cfg = PANEL_CONFIG.background;
        const contentWidth = cfg.width - 40;  // 内容区域宽度
        
        let yOffset = 10;
        const categorySpacing = 12;
        
        // 按分类创建商品（🔥 CONDIMENTS已移除，无限食材不需要购买）
        const categoryConfig = this.currentCategoryConfig;

        // 创建必需食材分类
        const essentialItems = this.currentShopItems.filter(item =>
            categoryConfig.essential.items.indexOf(item.ingredientType) !== -1
        );
        if (essentialItems.length > 0) {
            const categoryNode = this.createCategoryBlock(
                categoryConfig.essential.name,
                categoryConfig.essential.color,
                categoryConfig.essential.borderColor,
                essentialItems,
                contentWidth
            );
            categoryNode.setPosition(0, -yOffset, 0);
            this.itemContainer.addChild(categoryNode);
            yOffset += 130 + categorySpacing;
        }

        // 创建配料分类
        const toppingsItems = this.currentShopItems.filter(item =>
            categoryConfig.toppings.items.indexOf(item.ingredientType) !== -1
        );
        if (toppingsItems.length > 0) {
            const categoryNode = this.createCategoryBlock(
                categoryConfig.toppings.name,
                categoryConfig.toppings.color,
                categoryConfig.toppings.borderColor,
                toppingsItems,
                contentWidth
            );
            categoryNode.setPosition(0, -yOffset, 0);
            this.itemContainer.addChild(categoryNode);
            yOffset += 130 + categorySpacing;
        }
        
        // 一键购买按钮 - 动态位置（紧随分类后）
        const quickBuyNode = this.createQuickBuyButton(contentWidth);
        quickBuyNode.setPosition(0, -yOffset - 25, 0);
        this.itemContainer.addChild(quickBuyNode);
        yOffset += 60;
        
        // 设置容器高度
        const containerTransform = this.itemContainer.getComponent(UITransform);
        if (containerTransform) {
            containerTransform.setContentSize(contentWidth, yOffset);
        }
        
        console.log(`[ShopController] ✅ iOS扁平风格UI创建完成`);
    }
    
    /**
     * 🎨 创建类目区块 - iOS扁平风格带边框
     */
    private createCategoryBlock(title: string, color: Color, borderColor: Color, items: ShopItemData[], contentWidth: number): Node {
        const block = new Node('CategoryBlock');
        
        const blockWidth = contentWidth;
        const blockHeight = 125;
        
        // 绘制圆角矩形背景 + 边框
        const graphics = block.addComponent(Graphics);
        graphics.fillColor = color;
        graphics.strokeColor = borderColor;
        graphics.lineWidth = 2;
        graphics.roundRect(-blockWidth/2, -blockHeight/2, blockWidth, blockHeight, 12);
        graphics.fill();
        graphics.stroke();
        
        const transform = block.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(blockWidth, blockHeight);
        }
        
        // 类目标题 - 左上角
        const titleLabel = new Node('TitleLabel');
        const label = titleLabel.addComponent(Label);
        label.string = title;
        label.fontSize = 15;
        label.color = new Color(55, 65, 81, 255);  // 深灰色
        label.isBold = true;
        titleLabel.setPosition(-330, blockHeight/2 - 18, 0);
        block.addChild(titleLabel);
        
        // 食材卡片
        const cardWidth = 175;
        const spacing = 10;
        const totalWidth = items.length * cardWidth + (items.length - 1) * spacing;
        const startX = -totalWidth / 2 + cardWidth / 2;
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const itemCard = this.createItemCard(item, color);
            itemCard.setPosition(startX + i * (cardWidth + spacing), -15, 0);
            block.addChild(itemCard);
            this.shopItemNodes.set(item.id, itemCard);
        }
        
        return block;
    }
    
    /**
     * 🎨 创建一键购买按钮
     */
    private createQuickBuyButton(contentWidth: number): Node {
        const node = new Node('QuickBuy');

        const btnWidth = contentWidth - 20;
        const btnHeight = 40;

        // iOS风格按钮
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = new Color(249, 250, 251, 255);
        graphics.strokeColor = new Color(209, 213, 219, 153);  // 60%透明边框
        graphics.lineWidth = 1;
        graphics.roundRect(-btnWidth/2, -btnHeight/2, btnWidth, btnHeight, 10);
        graphics.fill();
        graphics.stroke();

        const transform = node.getComponent(UITransform) || node.addComponent(UITransform);
        transform.setContentSize(btnWidth, btnHeight);

        // 🔥 按钮文字 - 使用当前关卡的配置计算总价
        const totalPrice = this.currentQuickBuyTotal;
        const label = new Node('Label');
        const labelComp = label.addComponent(Label);
        labelComp.string = `🛒 一键购买推荐食材 ¥${totalPrice}`;
        labelComp.fontSize = 14;
        labelComp.color = new Color(59, 130, 246, 255);  // iOS蓝
        labelComp.isBold = true;
        node.addChild(label);

        node.on(Node.EventType.TOUCH_END, this.onQuickBuyAll, this);

        return node;
    }

    /**
     * 一键购买推荐食材（根据配置购买足够一天的量）
     */
    private onQuickBuyAll() {
        let addedCount = 0;
        let totalItems = 0;

        // 🔥 使用当前关卡的商品列表
        for (const item of this.currentShopItems) {
            const recommendedCount = this.currentQuickBuyConfig[item.id] || 0;
            if (recommendedCount <= 0) continue;

            const currentCount = this.cart.get(item.id) || 0;
            if (currentCount < recommendedCount) {
                // 设置为推荐数量
                this.cart.set(item.id, recommendedCount);
                this.updateItemDisplay(item.id, recommendedCount);
                addedCount++;
                totalItems += recommendedCount;
            }
        }

        this.updateTotalDisplay();
        if (addedCount > 0) {
            // 🔥 使用当前关卡的配置计算总价
            const totalPrice = this.currentQuickBuyTotal;
            this.showHint(`✅ 已添加 ${addedCount} 种推荐食材，共 ¥${totalPrice}！`);
        } else {
            this.showHint('✅ 推荐食材已在购物车中！');
        }

        this.emitGuideCartChange();
        EventManager.Instance.emit(GuideEvents.SHOP_QUICK_BUY);
    }
    
    /**
     * 🎨 创建商品卡片 - iOS扁平风格带边框
     */
    private createItemCard(item: ShopItemData, categoryColor: Color): Node {
        const card = new Node(`Card_${item.id}`);
        
        const cardWidth = 170;
        const cardHeight = 85;
        const cardCfg = PANEL_CONFIG.card;
        
        // iOS风格白色卡片 + 边框
        const graphics = card.addComponent(Graphics);
        graphics.fillColor = cardCfg.bgColor;
        graphics.strokeColor = cardCfg.borderColor;
        graphics.lineWidth = 1;
        graphics.roundRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, cardCfg.radius);
        graphics.fill();
        graphics.stroke();
        
        const transform = card.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(cardWidth, cardHeight);
        }
        
        // 图标 - 左侧
        const iconNode = new Node('Icon');
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = item.emoji;
        iconLabel.fontSize = 28;
        iconNode.setPosition(-55, 10, 0);
        card.addChild(iconNode);
        
        // 名称
        const nameNode = new Node('Name');
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = item.name;
        nameLabel.fontSize = 13;
        nameLabel.color = new Color(31, 41, 55, 255);  // 深灰色
        nameLabel.isBold = true;  // 加粗
        nameNode.setPosition(25, 30, 0);
        card.addChild(nameNode);
        
        // 价格 - iOS蓝色
        const priceNode = new Node('Price');
        const priceLabel = priceNode.addComponent(Label);
        priceLabel.string = `¥${item.price}`;
        priceLabel.fontSize = 14;
        priceLabel.color = new Color(59, 130, 246, 255);  // iOS蓝
        priceLabel.isBold = true;
        priceNode.setPosition(20, 10, 0);
        card.addChild(priceNode);
        
        // 数量信息
        const infoNode = new Node('Info');
        const infoLabel = infoNode.addComponent(Label);
        infoLabel.string = `${item.quantity}${item.unit}`;
        infoLabel.fontSize = 10;
        infoLabel.color = new Color(107, 114, 128, 255);  // 灰色
        infoNode.setPosition(20, -5, 0);
        card.addChild(infoNode);
        
        // 🔥 库存显示
        const stockNode = new Node('Stock');
        const stockLabel = stockNode.addComponent(Label);
        const stockCount = this.getItemStock(item.ingredientType);
        stockLabel.string = `库存: ${stockCount}`;
        stockLabel.fontSize = 9;
        stockLabel.color = stockCount > 0 ? new Color(34, 197, 94, 255) : new Color(156, 163, 175, 255);  // 有库存绿色，无库存灰色
        stockNode.setPosition(-55, -15, 0);
        card.addChild(stockNode);
        
        // 加工标记
        if (item.needsProcessing) {
            const tagNode = new Node('Tag');
            const tagLabel = tagNode.addComponent(Label);
            tagLabel.string = '🔪';
            tagLabel.fontSize = 10;
            tagNode.setPosition(70, 35, 0);
            card.addChild(tagNode);
        }
        
        // 底部控制栏
        const controlNode = new Node('Controls');
        controlNode.setPosition(0, -32, 0);
        card.addChild(controlNode);
        
        // 减少按钮 - iOS风格
        const minusNode = new Node('Minus');
        const minusGraphics = minusNode.addComponent(Graphics);
        minusGraphics.fillColor = new Color(243, 244, 246, 255);
        minusGraphics.strokeColor = new Color(209, 213, 219, 255);
        minusGraphics.lineWidth = 1;
        minusGraphics.roundRect(-14, -11, 28, 22, 6);
        minusGraphics.fill();
        minusGraphics.stroke();
        const minusTransform = minusNode.getComponent(UITransform);
        if (minusTransform) minusTransform.setContentSize(28, 22);
        const minusLabel = new Node('MinusLabel');
        const minusLabelComp = minusLabel.addComponent(Label);
        minusLabelComp.string = '−';
        minusLabelComp.fontSize = 16;
        minusLabelComp.color = new Color(55, 65, 81, 255);
        minusNode.addChild(minusLabel);
        minusNode.setPosition(-50, 0, 0);
        minusNode.on(Node.EventType.TOUCH_END, () => this.adjustCartItem(item.id, -1), this);
        controlNode.addChild(minusNode);
        
        // 数量显示
        const countNode = new Node('CountLabel');
        const countLabel = countNode.addComponent(Label);
        countLabel.string = '0';
        countLabel.fontSize = 14;
        countLabel.color = new Color(31, 41, 55, 255);
        countLabel.isBold = true;
        countNode.setPosition(0, 0, 0);
        controlNode.addChild(countNode);
        
        // 增加按钮 - iOS风格蓝色
        const plusNode = new Node('Plus');
        const plusGraphics = plusNode.addComponent(Graphics);
        plusGraphics.fillColor = new Color(59, 130, 246, 255);  // iOS蓝
        plusGraphics.roundRect(-14, -11, 28, 22, 6);
        plusGraphics.fill();
        const plusTransform = plusNode.getComponent(UITransform);
        if (plusTransform) plusTransform.setContentSize(28, 22);
        const plusLabel = new Node('PlusLabel');
        const plusLabelComp = plusLabel.addComponent(Label);
        plusLabelComp.string = '+';
        plusLabelComp.fontSize = 16;
        plusLabelComp.color = new Color(255, 255, 255, 255);  // 白色
        plusNode.addChild(plusLabel);
        plusNode.setPosition(50, 0, 0);
        plusNode.on(Node.EventType.TOUCH_END, () => this.adjustCartItem(item.id, 1), this);
        controlNode.addChild(plusNode);
        
        return card;
    }
    
    /**
     * 调整购物车商品数量
     */
    private adjustCartItem(itemId: string, delta: number) {
        const currentCount = this.cart.get(itemId) || 0;
        const newCount = Math.max(0, currentCount + delta);
        
        if (newCount === 0) {
            this.cart.delete(itemId);
        } else {
            this.cart.set(itemId, newCount);
        }
        
        // 更新显示
        this.updateItemDisplay(itemId, newCount);
        this.updateTotalDisplay();
        this.emitGuideCartChange();
        
        console.log(`[ShopController] 购物车: ${itemId} x${newCount}`);
    }
    
    /**
     * 更新商品项显示
     */
    private updateItemDisplay(itemId: string, count: number) {
        const itemNode = this.shopItemNodes.get(itemId);
        if (!itemNode) {
            console.warn(`[ShopController] ⚠️ 找不到商品节点: ${itemId}`);
            return;
        }
        
        console.log(`[ShopController] 更新显示: ${itemId} = ${count}`);
        
        // 新布局：CountLabel 在 Controls 子节点下
        const controlsNode = itemNode.getChildByName('Controls');
        const countNode = controlsNode ? controlsNode.getChildByName('CountLabel') : itemNode.getChildByName('CountLabel');
        
        if (countNode) {
            const label = countNode.getComponent(Label);
            if (label) {
                label.string = count.toString();
                // 绿色表示已选中，黑色表示未选
                label.color = count > 0 ? new Color(0, 150, 0, 255) : new Color(0, 0, 0, 255);
                console.log(`[ShopController] ✅ 标签已更新: ${count}`);
            }
        } else {
            console.warn(`[ShopController] ⚠️ 找不到 CountLabel 节点`);
        }
    }
    
    /**
     * 更新总价显示
     */
    private updateTotalDisplay() {
        let total = 0;
        
        this.cart.forEach((count, itemId) => {
            const item = this.currentShopItems.find(i => i.id === itemId);
            if (item) {
                total += item.price * count;
            }
        });
        
        if (this.totalLabel) {
            this.totalLabel.string = `总计: 💰${total}元`;
            
            // 检查是否超出预算
            const inventory = InventoryManager.instance;
            if (inventory && total > inventory.currentMoney) {
                this.totalLabel.color = new Color(255, 100, 100, 255);
            } else {
                this.totalLabel.color = new Color(255, 215, 0, 255);
            }
        }
    }
    
    /**
     * 刷新显示
     */
    private refreshDisplay() {
        const inventory = InventoryManager.instance;
        if (!inventory) return;
        
        // 更新金钱显示（全局钱包）
        if (this.moneyLabel) {
            this.moneyLabel.string = `💰 ${inventory.globalWallet} 元`;
        }
        
        // 更新页头金额显示（全局钱包）
        if (this.headerMoneyLabel) {
            this.headerMoneyLabel.string = `💰 ¥${inventory.globalWallet}`;
        }
        
        // 更新目标显示
        const levelData = inventory.currentLevelData;
        if (levelData) {
            if (this.targetLabel) {
                this.targetLabel.string = `🎯 目标: ${levelData.targetMoney} 元`;
            }
            if (this.levelNameLabel) {
                this.levelNameLabel.string = levelData.levelName;
            }
        }
        
        this.updateTotalDisplay();
    }
    
    /**
     * 合并的购买并开始按钮
     */
    private onConfirmAndStart() {
        const inventory = InventoryManager.instance;
        if (!inventory) {
            console.error('[ShopController] ❌ InventoryManager 未初始化');
            this.showHint('❌ 系统错误，请重试');
            return;
        }
        
        // 1. 🔥 先检查必需食材（包括购物车中的和已有库存）
        const missingIngredients = this.checkRequiredIngredientsWithCart();
        if (missingIngredients.length > 0) {
            this.showHint(`⚠️ 还需要购买: ${missingIngredients.join('、')}`);
            // 🔥 不清空购物车，保持已选择的商品
            return;
        }
        
        // 2. 检查购物车是否为空（如果库存已经足够，可以直接开始）
        const hasEnoughInventory = this.hasEnoughInventoryWithoutCart();
        if (this.cart.size === 0 && !hasEnoughInventory) {
            this.showHint('⚠️ 请先选择要购买的商品！');
            return;
        }
        
        // 3. 计算总价
        let total = 0;
        this.cart.forEach((count, itemId) => {
            const item = this.currentShopItems.find(i => i.id === itemId);
            if (item) {
                total += item.price * count;
            }
        });
        
        // 4. 检查金钱是否足够
        if (total > inventory.globalWallet) {
            this.showHint(`⚠️ 金钱不足！需要 ${total} 元，当前只有 ${inventory.globalWallet} 元`);
            return;
        }
        
        // 5. 执行购买（只有通过所有检查才执行）
        if (this.cart.size > 0) {
            let success = true;
            console.log('[ShopController] 开始执行购买...');
            this.cart.forEach((count, itemId) => {
                const item = this.currentShopItems.find(i => i.id === itemId);
                if (item && count > 0) {
                    console.log(`[ShopController] 购买 ${item.name} x${count}, needsProcessing=${item.needsProcessing}`);
                    if (!inventory.buyItem(item, count)) {
                        success = false;
                    }
                }
            });
            
            if (!success) {
                this.showHint('❌ 购买失败，请重试');
                return;
            }
            
            console.log('[ShopController] ✅ 购买成功！');
            
            // 打印购买后的库存状态
            const allInv = inventory.getAllInventory();
            if (allInv) {
                console.log('[ShopController] 购买后库存状态:');
                allInv.forEach((inv, type) => {
                    if (inv.rawCount > 0 || inv.processedCount > 0) {
                        console.log(`  ${type}: raw=${inv.rawCount}, processed=${inv.processedCount}`);
                    }
                });
            }
        }
        
        // 6. 进入下一阶段
        EventManager.Instance.emit(GuideEvents.SHOP_CONFIRM);
        this.goToNextPhase();
    }
    
    /**
     * 🔥 检查必需食材（包括购物车中的）
     */
    private checkRequiredIngredientsWithCart(): string[] {
        const inventory = InventoryManager.instance;
        if (!inventory) return ['所有食材'];
        
        const missing: string[] = [];
        const allInventory = inventory.getAllInventory();
        
        if (!allInventory) return ['所有食材'];

        // 🔥 仅检查需要购买的食材（无限食材已移除）
        const ingredientNames: { [key: string]: string } = {
            [IngredientType.DOUGH]: '面饼',
            [IngredientType.EGG]: '鸡蛋',
            [IngredientType.RICE]: '大米',
            [IngredientType.POTATO]: '土豆'
        };

        for (const type of this.currentRequiredIngredients) {
            const item = allInventory.get(type);
            const currentStock = item ? (item.processedCount + item.rawCount) : 0;

            // 检查购物车中是否有该食材
            let cartCount = 0;
            this.cart.forEach((count, itemId) => {
                const shopItem = this.currentShopItems.find(i => i.id === itemId);
                if (shopItem && shopItem.ingredientType === type) {
                    cartCount += shopItem.quantity * count;
                }
            });

            // 如果库存 + 购物车都没有，则缺少
            if (currentStock + cartCount <= 0) {
                missing.push(ingredientNames[type] || type);
            }
        }
        
        return missing;
    }
    
    /**
     * 🔥 检查当前库存是否足够（不包括购物车）
     */
    private hasEnoughInventoryWithoutCart(): boolean {
        const inventory = InventoryManager.instance;
        if (!inventory) return false;
        
        const allInventory = inventory.getAllInventory();
        if (!allInventory) return false;
        
        for (const type of this.currentRequiredIngredients) {
            const item = allInventory.get(type);
            if (!item || (item.processedCount + item.rawCount) <= 0) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * 🔥 获取指定食材的库存数量
     */
    private getItemStock(ingredientType: IngredientType): number {
        const inventory = InventoryManager.instance;
        if (!inventory) return 0;
        
        const allInventory = inventory.getAllInventory();
        if (!allInventory) return 0;
        
        const item = allInventory.get(ingredientType);
        if (!item) return 0;
        
        return item.processedCount + item.rawCount;
    }
    
    /**
     * 检查必需食材是否已购买
     * @returns 缺少的食材名称列表
     */
    private checkRequiredIngredients(): string[] {
        const inventory = InventoryManager.instance;
        if (!inventory) return ['所有食材'];
        
        const missing: string[] = [];
        const allInventory = inventory.getAllInventory();
        
        if (!allInventory) return ['所有食材'];
        
        // 🔥 检查每种必需食材（无限食材已移除）
        const ingredientNames: { [key: string]: string } = {
            [IngredientType.DOUGH]: '面饼',
            [IngredientType.EGG]: '鸡蛋'
        };
        
        for (const type of this.currentRequiredIngredients) {
            const item = allInventory.get(type);
            // 检查 processedCount（已加工/可用数量）
            if (!item || (item.processedCount <= 0 && item.rawCount <= 0)) {
                missing.push(ingredientNames[type] || type);
            }
        }
        
        return missing;
    }
    
    /**
     * 进入下一阶段（食材加工或营业）
     */
    private goToNextPhase() {
        if (this.worldMode) {
            const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
            const inventory = InventoryManager.instance;
            if (inventory) {
                inventory.setWallet(world.progress.totalMoney);
                inventory.saveLevelState();
            }
            SceneRouteService.goPrep();
            return;
        }

        const inventory = InventoryManager.instance;
        if (!inventory) return;

        // 🔥 保存关卡状态（用于场景切换）
        inventory.saveLevelState();

        console.log('[ShopController] ✅ 购买完成，进入备菜场景');
        SceneRouteService.goPrep();
    }
    
    /**
     * 显示提示信息
     */
    private showHint(message: string) {
        console.log(`[ShopController] ${message}`);
        if (this.hintLabel) {
            this.hintLabel.string = message;
        } else if (this.totalLabel) {
            // 临时使用总价标签显示提示
            this.totalLabel.string = message;
            this.totalLabel.color = new Color(255, 100, 100, 255);
            
            // 2秒后恢复
            this.scheduleOnce(() => {
                this.updateTotalDisplay();
            }, 2);
        }
    }
    
    /**
     * 获取购物车总价
     */
    public getCartTotal(): number {
        let total = 0;
        this.cart.forEach((count, itemId) => {
            const item = this.currentShopItems.find(i => i.id === itemId);
            if (item) {
                total += item.price * count;
            }
        });
        return total;
    }

    private emitGuideCartChange() {
        if (this.worldMode) return;
        const counts: Record<string, number> = {};
        this.cart.forEach((count, itemId) => {
            const item = this.currentShopItems.find(i => i.id === itemId);
            if (!item) return;
            const type = item.ingredientType;
            counts[type] = (counts[type] || 0) + item.quantity * count;
        });
        EventManager.Instance.emit(GuideEvents.SHOP_CART_CHANGE, { counts });
    }

    // ==================== 世界模式商店实现 ====================
    private setupWorldShopMode(): void {
        const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const inventory = InventoryManager.instance;
        if (inventory) {
            if (!inventory.currentLevel) {
                inventory.initLevel(1);
            }
            inventory.setWallet(world.progress.totalMoney);
            inventory.saveLevelState();
        }

        this.node.children.forEach((child) => {
            child.active = false;
        });

        this.worldRoot = new Node('WorldShopRoot');
        this.worldRoot.addComponent(UITransform).setContentSize(1280, 720);
        this.node.addChild(this.worldRoot);
        this.worldRoot.setPosition(0, 0, 0);

        const titleNode = this.createWorldLabel('地图摊位商店', 42, new Color(255, 236, 201, 255), 760, 56, true);
        titleNode.setPosition(0, 312, 0);
        this.worldRoot.addChild(titleNode);

        const walletNode = this.createWorldLabel('', 28, new Color(160, 255, 160, 255), 460, 42, true);
        walletNode.setPosition(-350, 262, 0);
        this.worldWalletLabel = walletNode.getComponent(Label);
        this.worldRoot.addChild(walletNode);

        const statusNode = this.createWorldLabel('', 20, new Color(255, 228, 186, 255), 900, 42);
        statusNode.setPosition(0, -302, 0);
        this.worldStatusLabel = statusNode.getComponent(Label);
        this.worldRoot.addChild(statusNode);

        const mapInfo = this.createWorldLabel('', 22, new Color(220, 232, 255, 255), 620, 40);
        mapInfo.name = 'MapInfoLabel';
        mapInfo.setPosition(220, 262, 0);
        this.worldRoot.addChild(mapInfo);

        const devicePanel = this.createWorldPanel('DevicePanel', 560, 450, new Color(247, 240, 226, 255));
        devicePanel.setPosition(-310, 6, 0);
        this.worldRoot.addChild(devicePanel);
        const deviceTitle = this.createWorldLabel('设备摊位', 28, new Color(84, 58, 38, 255), 220, 36, true);
        deviceTitle.setPosition(0, 192, 0);
        devicePanel.addChild(deviceTitle);

        const ingredientPanel = this.createWorldPanel('IngredientPanel', 560, 450, new Color(234, 243, 231, 255));
        ingredientPanel.setPosition(310, 6, 0);
        this.worldRoot.addChild(ingredientPanel);
        const ingredientTitle = this.createWorldLabel('食材风味摊位', 28, new Color(55, 84, 58, 255), 220, 36, true);
        ingredientTitle.setPosition(0, 192, 0);
        ingredientPanel.addChild(ingredientTitle);

        this.buildWorldShopDeviceButtons(devicePanel);
        this.buildWorldShopIngredientButtons(ingredientPanel);

        const nextBtn = this.createWorldButton('去备菜', new Color(62, 143, 85, 255), 180, 56, 24);
        nextBtn.setPosition(200, -244, 0);
        nextBtn.on(Button.EventType.CLICK, () => this.goToNextPhase(), this);
        this.worldRoot.addChild(nextBtn);

        const menuBtn = this.createWorldButton('返回主菜单', new Color(108, 117, 134, 255), 180, 56, 24);
        menuBtn.setPosition(0, -244, 0);
        menuBtn.on(Button.EventType.CLICK, () => SceneRouteService.goMainMenu(), this);
        this.worldRoot.addChild(menuBtn);

        const mapBtn = this.createWorldButton('回地图中枢', new Color(75, 130, 182, 255), 180, 56, 24);
        mapBtn.setPosition(-200, -244, 0);
        mapBtn.on(Button.EventType.CLICK, () => SceneRouteService.goMainMenu(), this);
        this.worldRoot.addChild(mapBtn);
    }

    private buildWorldShopDeviceButtons(panel: Node): void {
        const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const mapId = world.progress.currentMapId;
        const list = WORLD_DEVICE_CONFIGS.filter((config) => !config.unlockCondition.mapId || config.unlockCondition.mapId === mapId);
        list.forEach((config, index) => {
            const btn = this.createWorldButton('', new Color(187, 125, 70, 255), 470, 58, 19);
            btn.name = `Device_${config.deviceId}`;
            btn.setPosition(0, 116 - index * 72, 0);
            btn.on(Button.EventType.CLICK, () => this.onBuyDevice(config.deviceId), this);
            panel.addChild(btn);
        });
    }

    private buildWorldShopIngredientButtons(panel: Node): void {
        const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const mapId = world.progress.currentMapId;
        const baseItems = this.getWorldBaseShopItems(mapId);
        const flavorItems = this.getWorldFlavorConfigs(mapId);
        const totalList = baseItems.length > 0 ? baseItems : flavorItems;
        totalList.forEach((entry, index) => {
            const btn = this.createWorldButton('', new Color(89, 151, 101, 255), 470, 58, 19);
            if ('id' in entry) {
                btn.name = `BaseItem_${entry.id}`;
                btn.on(Button.EventType.CLICK, () => this.onBuyBaseShopItem(entry), this);
            } else {
                btn.name = `Ingredient_${entry.ingredientId}`;
                btn.on(Button.EventType.CLICK, () => this.onBuyIngredient(entry), this);
            }
            btn.setPosition(0, 116 - index * 72, 0);
            panel.addChild(btn);
        });
    }

    private onBuyDevice(deviceId: string): void {
        const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const deviceConfig = WORLD_DEVICE_CONFIGS.find((config) => config.deviceId === deviceId);
        if (world.progress.unlockedDevices.includes(deviceId)) {
            this.setWorldStatus('该设备已购买');
            return;
        }

        const ok = world.unlockDevice(deviceId, true);
        if (!ok) {
            this.setWorldStatus('购买失败：资金不足或未满足地图条件');
            return;
        }

        const unlockPrice = getWorldDeviceUnlockPrice(deviceId);
        this.syncInventoryWallet();
        const deviceName = deviceConfig?.name || deviceId;
        this.setWorldStatus(unlockPrice === 0 ? `设备已免费领取：${deviceName}` : `设备已购入：${deviceName}`);
        this.refreshWorldShopView();
    }

    private onBuyIngredient(config: IngredientFlavorConfig): void {
        const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const unlocked = world.progress.unlockedIngredients.includes(config.ingredientId);
        let ok = false;

        if (!unlocked) {
            ok = world.unlockIngredient(config.ingredientId, true);
        } else {
            ok = world.spendMoney(config.price);
        }

        if (!ok) {
            this.setWorldStatus('购买失败：资金不足或未满足地图条件');
            return;
        }

        const inventory = InventoryManager.instance;
        if (inventory) {
            if (!inventory.currentLevel) inventory.initLevel(1);
            inventory.adjustProcessedIngredient(config.ingredientType, 6);
        }
        this.syncInventoryWallet();
        this.setWorldStatus(`已补充食材：${config.name} +6`);
        this.refreshWorldShopView();
    }

    private onBuyBaseShopItem(item: ShopItemData): void {
        const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        if (!world.spendMoney(item.price)) {
            this.setWorldStatus('购买失败：资金不足');
            return;
        }

        const inventory = InventoryManager.instance;
        if (inventory) {
            if (!inventory.currentLevel) inventory.initLevel(1);
            this.applyBaseShopItemToInventory(inventory, item);
        }

        this.syncInventoryWallet();
        this.setWorldStatus(`已补货：${item.name} +${item.quantity}${item.needsProcessing ? '（待备菜）' : ''}`);
        this.refreshWorldShopView();
    }

    private syncInventoryWallet(): void {
        const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        const inventory = InventoryManager.instance;
        if (inventory) {
            inventory.setWallet(world.progress.totalMoney);
            inventory.saveLevelState();
        }
    }

    private refreshWorldShopView(): void {
        if (!this.worldMode || !this.worldRoot) return;
        const world = WorldProgressManager.instance || WorldProgressManager.ensureInstance();
        world.refreshMapUnlocksByMoney(false);

        if (this.worldWalletLabel) {
            this.worldWalletLabel.string = `💰 资金: ${world.progress.totalMoney}`;
        }

        const map = getWorldMapConfig(world.progress.currentMapId);
        const mapInfo = this.worldRoot.getChildByName('MapInfoLabel')?.getComponent(Label);
        if (mapInfo && map) {
            mapInfo.string = `当前地图：${map.mapName}（门槛 ${map.unlockMoney}）`;
        }

        const devicePanel = this.worldRoot.getChildByName('DevicePanel');
        if (devicePanel) {
            WORLD_DEVICE_CONFIGS.forEach((config) => {
                const btn = devicePanel.getChildByName(`Device_${config.deviceId}`);
                const label = btn?.getComponentInChildren(Label);
                if (!btn || !label) return;
                const bought = world.progress.unlockedDevices.includes(config.deviceId);
                const unlockPrice = getWorldDeviceUnlockPrice(config.deviceId);
                const priceLabel = unlockPrice === 0 ? '免费领取' : `${unlockPrice}`;
                label.string = bought ? `✅ ${config.name}（已购）` : `🛠 ${config.name} - ${priceLabel}`;
                const sprite = btn.getComponent(Sprite);
                if (sprite) {
                    sprite.color = bought ? new Color(124, 131, 140, 255) : new Color(187, 125, 70, 255);
                }
            });
        }

        const ingredientPanel = this.worldRoot.getChildByName('IngredientPanel');
        if (ingredientPanel) {
            const baseItems = this.getWorldBaseShopItems(world.progress.currentMapId);
            if (baseItems.length > 0) {
                baseItems.forEach((item) => {
                    const btn = ingredientPanel.getChildByName(`BaseItem_${item.id}`);
                    const label = btn?.getComponentInChildren(Label);
                    if (!btn || !label) return;
                    const stock = this.getItemStock(item.ingredientType);
                    const stockLabel = item.needsProcessing ? `原料 ${stock}` : `库存 ${stock}`;
                    label.string = `${item.emoji} ${item.name} x${item.quantity} - ${item.price} | ${stockLabel}`;
                });
            } else {
                this.getWorldFlavorConfigs(world.progress.currentMapId).forEach((config) => {
                    const btn = ingredientPanel.getChildByName(`Ingredient_${config.ingredientId}`);
                    const label = btn?.getComponentInChildren(Label);
                    if (!btn || !label) return;
                    const unlocked = world.progress.unlockedIngredients.includes(config.ingredientId);
                    const stock = this.getItemStock(config.ingredientType);
                    label.string = unlocked
                        ? `🥬 ${config.name}（补货 ${config.price}）| 库存 ${stock}`
                        : `🔓 ${config.name}（解锁 ${config.price}）| 库存 ${stock}`;
                });
            }
        }
    }

    private getWorldBaseShopItems(mapId: string): ShopItemData[] {
        if (mapId !== 'street') {
            return [];
        }
        const streetTypes: IngredientType[] = [
            IngredientType.DOUGH,
            IngredientType.EGG,
            IngredientType.SAUSAGE,
            IngredientType.ONION,
            IngredientType.CILANTRO
        ];
        return SHOP_ITEMS.filter((item) => streetTypes.includes(item.ingredientType));
    }

    private getWorldFlavorConfigs(mapId: string): IngredientFlavorConfig[] {
        return WORLD_INGREDIENT_CONFIGS.filter((config) => !config.unlockCondition.mapId || config.unlockCondition.mapId === mapId);
    }

    private applyBaseShopItemToInventory(inventory: InventoryManager, item: ShopItemData): void {
        const levelData = inventory.currentLevel;
        if (!levelData) {
            return;
        }

        let ingredient = levelData.inventory.get(item.ingredientType);
        if (!ingredient) {
            ingredient = {
                ingredientType: item.ingredientType,
                rawCount: 0,
                processedCount: 0,
                reservedCount: 0
            };
            levelData.inventory.set(item.ingredientType, ingredient);
        }

        if (item.needsProcessing) {
            ingredient.rawCount += item.quantity;
        } else {
            ingredient.processedCount += item.quantity;
        }
        inventory.saveLevelState();
    }

    private setWorldStatus(text: string): void {
        if (this.worldStatusLabel) {
            this.worldStatusLabel.string = text;
        }
    }

    private createWorldPanel(name: string, width: number, height: number, color: Color): Node {
        const node = new Node(name);
        node.addComponent(UITransform).setContentSize(width, height);
        const sprite = node.addComponent(Sprite);
        sprite.color = color;
        return node;
    }

    private createWorldLabel(
        text: string,
        fontSize: number,
        color: Color,
        width: number,
        height: number,
        isBold: boolean = false
    ): Node {
        const node = new Node('Label');
        node.addComponent(UITransform).setContentSize(width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.color = color;
        label.isBold = isBold;
        label.enableWrapText = true;
        return node;
    }

    private createWorldButton(text: string, color: Color, width: number, height: number, fontSize: number): Node {
        const node = this.createWorldPanel('Button', width, height, color);
        node.addComponent(Button);
        const label = this.createWorldLabel(text, fontSize, new Color(255, 255, 255, 255), width - 18, height - 8, true);
        label.setPosition(0, 0, 0);
        node.addChild(label);
        return node;
    }
}
