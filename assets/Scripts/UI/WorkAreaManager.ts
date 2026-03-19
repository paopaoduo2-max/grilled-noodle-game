import { _decorator, Component, Node, Sprite, Label, Color, UITransform, SpriteFrame, resources, Vec3 } from 'cc';
import { WorkAreaLayout, CookingAssets } from '../Config/GameUIAssets';
import { UIColors } from '../Config/UIStyleConfig';

const { ccclass, property } = _decorator;

/**
 * 工作区域类型
 */
export enum WorkAreaType {
    GRILL = 'grill',
    INGREDIENT_TRAY = 'ingredientTray',
    CONDIMENT_AREA = 'condimentArea',
    PACKING_AREA = 'packingArea',
    SERVING_AREA = 'servingArea',
    ORDER_PANEL = 'orderPanel',
}

/**
 * 工作区域配置
 */
interface AreaConfig {
    name: string;
    emoji: string;
    bgColor: Color;
    borderColor: Color;
    labelColor: Color;
}

const AREA_CONFIGS: Record<WorkAreaType, AreaConfig> = {
    [WorkAreaType.GRILL]: {
        name: '🔥 烤盘',
        emoji: '🔥',
        bgColor: new Color(60, 40, 30, 240),
        borderColor: new Color(255, 100, 50, 255),
        labelColor: new Color(255, 200, 150, 255),
    },
    [WorkAreaType.INGREDIENT_TRAY]: {
        name: '🥗 食材',
        emoji: '🥗',
        bgColor: new Color(40, 50, 40, 240),
        borderColor: new Color(100, 180, 100, 255),
        labelColor: new Color(200, 255, 200, 255),
    },
    [WorkAreaType.CONDIMENT_AREA]: {
        name: '🧂 调料',
        emoji: '🧂',
        bgColor: new Color(50, 40, 50, 240),
        borderColor: new Color(180, 100, 180, 255),
        labelColor: new Color(255, 200, 255, 255),
    },
    [WorkAreaType.PACKING_AREA]: {
        name: '📦 打包',
        emoji: '📦',
        bgColor: new Color(50, 45, 35, 240),
        borderColor: new Color(200, 180, 100, 255),
        labelColor: new Color(255, 240, 200, 255),
    },
    [WorkAreaType.SERVING_AREA]: {
        name: '🍽️ 出餐',
        emoji: '🍽️',
        bgColor: new Color(45, 45, 55, 240),
        borderColor: new Color(100, 150, 200, 255),
        labelColor: new Color(200, 220, 255, 255),
    },
    [WorkAreaType.ORDER_PANEL]: {
        name: '📋 订单',
        emoji: '📋',
        bgColor: new Color(40, 35, 30, 240),
        borderColor: new Color(255, 200, 100, 255),
        labelColor: new Color(255, 230, 180, 255),
    },
};

/**
 * 工作区域管理器
 * 负责创建和管理制作阶段的各个工作区域
 */
@ccclass('WorkAreaManager')
export class WorkAreaManager extends Component {
    
    private areas: Map<WorkAreaType, Node> = new Map();
    private areaContents: Map<WorkAreaType, Node> = new Map();
    
    /**
     * 初始化所有工作区域
     */
    public initWorkAreas(parent: Node) {
        // 创建各个工作区域
        this.createArea(parent, WorkAreaType.GRILL, WorkAreaLayout.grill);
        this.createArea(parent, WorkAreaType.INGREDIENT_TRAY, WorkAreaLayout.ingredientTray);
        this.createArea(parent, WorkAreaType.CONDIMENT_AREA, WorkAreaLayout.condimentArea);
        this.createArea(parent, WorkAreaType.PACKING_AREA, WorkAreaLayout.packingArea);
        this.createArea(parent, WorkAreaType.SERVING_AREA, WorkAreaLayout.servingArea);
        this.createArea(parent, WorkAreaType.ORDER_PANEL, WorkAreaLayout.orderPanel);
        
        console.log('[WorkAreaManager] ✅ 工作区域初始化完成');
    }
    
    /**
     * 创建单个工作区域
     */
    private createArea(parent: Node, type: WorkAreaType, layout: any) {
        const config = AREA_CONFIGS[type];
        
        // 创建区域容器
        const areaNode = new Node(`Area_${type}`);
        parent.addChild(areaNode);
        areaNode.setPosition(layout.x, layout.y, 0);
        
        // 背景
        const bgNode = new Node('Background');
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.color = config.bgColor;
        const bgTransform = bgNode.getComponent(UITransform);
        if (bgTransform) {
            bgTransform.setContentSize(layout.width, layout.height);
        }
        areaNode.addChild(bgNode);
        
        // 边框效果（用4条细线模拟）
        this.createBorder(areaNode, layout.width, layout.height, config.borderColor);
        
        // 区域标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = config.name;
        titleLabel.fontSize = 14;
        titleLabel.color = config.labelColor;
        titleLabel.isBold = true;
        titleNode.setPosition(0, layout.height / 2 - 12, 0);
        areaNode.addChild(titleNode);
        
        // 内容容器
        const contentNode = new Node('Content');
        areaNode.addChild(contentNode);
        
        // 保存引用
        this.areas.set(type, areaNode);
        this.areaContents.set(type, contentNode);
        
        // 尝试加载背景图片
        this.loadAreaBackground(type, bgSprite);
    }
    
    /**
     * 创建边框
     */
    private createBorder(parent: Node, width: number, height: number, color: Color) {
        const borderWidth = 2;
        
        // 上边框
        const topBorder = this.createBorderLine(width, borderWidth, color);
        topBorder.setPosition(0, height / 2 - borderWidth / 2, 0);
        parent.addChild(topBorder);
        
        // 下边框
        const bottomBorder = this.createBorderLine(width, borderWidth, color);
        bottomBorder.setPosition(0, -height / 2 + borderWidth / 2, 0);
        parent.addChild(bottomBorder);
        
        // 左边框
        const leftBorder = this.createBorderLine(borderWidth, height, color);
        leftBorder.setPosition(-width / 2 + borderWidth / 2, 0, 0);
        parent.addChild(leftBorder);
        
        // 右边框
        const rightBorder = this.createBorderLine(borderWidth, height, color);
        rightBorder.setPosition(width / 2 - borderWidth / 2, 0, 0);
        parent.addChild(rightBorder);
        
        // 角落装饰
        this.createCornerDecorations(parent, width, height, color);
    }
    
    /**
     * 创建边框线
     */
    private createBorderLine(width: number, height: number, color: Color): Node {
        const line = new Node('BorderLine');
        const sprite = line.addComponent(Sprite);
        sprite.color = color;
        const transform = line.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(width, height);
        }
        return line;
    }
    
    /**
     * 创建角落装饰
     */
    private createCornerDecorations(parent: Node, width: number, height: number, color: Color) {
        const cornerSize = 8;
        const positions = [
            { x: -width / 2 + cornerSize / 2, y: height / 2 - cornerSize / 2 },   // 左上
            { x: width / 2 - cornerSize / 2, y: height / 2 - cornerSize / 2 },    // 右上
            { x: -width / 2 + cornerSize / 2, y: -height / 2 + cornerSize / 2 },  // 左下
            { x: width / 2 - cornerSize / 2, y: -height / 2 + cornerSize / 2 },   // 右下
        ];
        
        positions.forEach((pos, index) => {
            const corner = new Node(`Corner_${index}`);
            const sprite = corner.addComponent(Sprite);
            sprite.color = color;
            const transform = corner.getComponent(UITransform);
            if (transform) {
                transform.setContentSize(cornerSize, cornerSize);
            }
            corner.setPosition(pos.x, pos.y, 0);
            parent.addChild(corner);
        });
    }
    
    /**
     * 加载区域背景图片
     */
    private loadAreaBackground(type: WorkAreaType, sprite: Sprite) {
        const assetPath = this.getAreaAssetPath(type);
        if (!assetPath) return;
        
        resources.load(assetPath + '/spriteFrame', SpriteFrame, (err, spriteFrame) => {
            if (!err && spriteFrame) {
                sprite.spriteFrame = spriteFrame;
                sprite.color = Color.WHITE;
                console.log(`[WorkAreaManager] ✅ 加载区域背景: ${type}`);
            }
        });
    }
    
    /**
     * 获取区域资源路径
     */
    private getAreaAssetPath(type: WorkAreaType): string {
        const paths: Record<WorkAreaType, string> = {
            [WorkAreaType.GRILL]: CookingAssets.workAreas.grill.background,
            [WorkAreaType.INGREDIENT_TRAY]: CookingAssets.workAreas.ingredientTray.background,
            [WorkAreaType.CONDIMENT_AREA]: CookingAssets.workAreas.condimentArea.background,
            [WorkAreaType.PACKING_AREA]: CookingAssets.workAreas.packingArea.background,
            [WorkAreaType.SERVING_AREA]: CookingAssets.workAreas.servingArea.background,
            [WorkAreaType.ORDER_PANEL]: CookingAssets.ui.orderPanel,
        };
        return paths[type] || '';
    }
    
    /**
     * 获取区域节点
     */
    public getArea(type: WorkAreaType): Node | null {
        return this.areas.get(type) || null;
    }
    
    /**
     * 获取区域内容容器
     */
    public getAreaContent(type: WorkAreaType): Node | null {
        return this.areaContents.get(type) || null;
    }
    
    /**
     * 高亮区域
     */
    public highlightArea(type: WorkAreaType, highlight: boolean) {
        const area = this.areas.get(type);
        if (!area) return;
        
        const bg = area.getChildByName('Background');
        if (bg) {
            const sprite = bg.getComponent(Sprite);
            if (sprite) {
                const config = AREA_CONFIGS[type];
                if (highlight) {
                    // 高亮时使用边框颜色
                    sprite.color = new Color(
                        Math.min(255, config.bgColor.r + 30),
                        Math.min(255, config.bgColor.g + 30),
                        Math.min(255, config.bgColor.b + 30),
                        255
                    );
                } else {
                    sprite.color = config.bgColor;
                }
            }
        }
    }
    
    /**
     * 显示区域提示
     */
    public showAreaHint(type: WorkAreaType, hint: string) {
        const area = this.areas.get(type);
        if (!area) return;
        
        let hintNode = area.getChildByName('Hint');
        if (!hintNode) {
            hintNode = new Node('Hint');
            const label = hintNode.addComponent(Label);
            label.fontSize = 12;
            label.color = new Color(255, 255, 200, 255);
            hintNode.setPosition(0, -20, 0);
            area.addChild(hintNode);
        }
        
        const label = hintNode.getComponent(Label);
        if (label) {
            label.string = hint;
        }
    }
    
    /**
     * 隐藏区域提示
     */
    public hideAreaHint(type: WorkAreaType) {
        const area = this.areas.get(type);
        if (!area) return;
        
        const hintNode = area.getChildByName('Hint');
        if (hintNode) {
            hintNode.destroy();
        }
    }
}
