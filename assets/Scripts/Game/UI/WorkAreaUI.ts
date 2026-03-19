/**
 * WorkAreaUI.ts
 * 工作区域UI系统
 * 从 CookingControllerV2.ts 提取
 */

import { Node, Label, Sprite, Color, UITransform, Vec3, tween, Component, SpriteFrame } from 'cc';

/**
 * 工作区域配置
 */
export interface WorkAreaConfig {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    bgColor: Color;
    borderColor: Color;
    titleColor: Color;
}

/**
 * 工作区域预设配置
 */
export const WORK_AREA_PRESETS: WorkAreaConfig[] = [
    // 烤盘区域（中央）
    {
        name: '🔥 烤盘区',
        x: 0, y: 45,
        width: 1170, height: 630,
        bgColor: new Color(70, 50, 40, 240),
        borderColor: new Color(255, 120, 50, 255),
        titleColor: new Color(255, 180, 100, 255)
    },
    // 食材区域（左侧）
    {
        name: '🥗 食材',
        x: -570, y: -75,
        width: 300, height: 570,
        bgColor: new Color(50, 70, 50, 240),
        borderColor: new Color(100, 200, 100, 255),
        titleColor: new Color(180, 255, 180, 255)
    },
    // 调料区域（右上）
    {
        name: '🧂 调料',
        x: 570, y: 150,
        width: 300, height: 330,
        bgColor: new Color(60, 50, 70, 240),
        borderColor: new Color(180, 120, 200, 255),
        titleColor: new Color(220, 180, 255, 255)
    },
    // 打包区域（右下）
    {
        name: '📦 打包',
        x: 570, y: -180,
        width: 300, height: 270,
        bgColor: new Color(60, 55, 45, 240),
        borderColor: new Color(200, 180, 100, 255),
        titleColor: new Color(255, 230, 150, 255)
    },
    // 出餐/顾客区域（底部）
    {
        name: '🍽️ 顾客等待区',
        x: 0, y: -420,
        width: 900, height: 180,
        bgColor: new Color(50, 50, 60, 240),
        borderColor: new Color(120, 150, 200, 255),
        titleColor: new Color(180, 200, 255, 255)
    },
    // 订单区域（顶部）
    {
        name: '📋 当前订单',
        x: 0, y: 435,
        width: 975, height: 150,
        bgColor: new Color(55, 45, 40, 240),
        borderColor: new Color(255, 200, 100, 255),
        titleColor: new Color(255, 220, 150, 255)
    }
];

/**
 * 工作区域UI管理类
 */
export class WorkAreaUI {
    private parentNode: Node = null;
    private workAreasNode: Node = null;
    private flameNode: Node = null;
    private scheduler: Component = null;
    
    constructor(parentNode: Node, scheduler?: Component) {
        this.parentNode = parentNode;
        this.scheduler = scheduler;
    }
    
    /**
     * 创建所有工作区域
     */
    setup(bgSpriteFrame?: SpriteFrame): Node {
        if (!this.parentNode) return null;
        
        // 创建工作区域容器（放在最底层）
        this.workAreasNode = new Node('WorkAreas');
        this.parentNode.addChild(this.workAreasNode);
        this.workAreasNode.setSiblingIndex(0);
        
        // 创建背景
        this.createBackground(bgSpriteFrame);
        
        // 创建所有工作区域
        for (const config of WORK_AREA_PRESETS) {
            this.createWorkArea(config);
        }
        
        // 创建火焰装饰
        this.createFlameDecoration();
        
        console.log('[WorkAreaUI] ✅ 工作区域UI初始化完成');
        return this.workAreasNode;
    }
    
    /**
     * 创建背景
     */
    private createBackground(bgSpriteFrame?: SpriteFrame) {
        console.log('[WorkAreaUI] 🎨 开始创建背景...');
        const bgNode = new Node('CookingBg');
        const bgSprite = bgNode.addComponent(Sprite);
        bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        bgSprite.type = Sprite.Type.SIMPLE;
        const bgTransform = bgNode.getComponent(UITransform);
        if (bgTransform) bgTransform.setContentSize(1920, 1080);
        this.workAreasNode.addChild(bgNode);
        
        if (bgSpriteFrame) {
            bgSprite.spriteFrame = bgSpriteFrame;
            bgSprite.color = Color.WHITE;
            console.log('[WorkAreaUI] ✅ 背景图片已绑定!');
        } else {
            bgSprite.color = new Color(50, 45, 40, 255);
            console.warn('[WorkAreaUI] ⚠️ 背景图片未绑定');
        }
    }
    
    /**
     * 创建单个工作区域
     */
    createWorkArea(config: WorkAreaConfig): Node {
        const areaNode = new Node(`Area_${config.name}`);
        areaNode.setPosition(config.x, config.y, 0);
        this.workAreasNode.addChild(areaNode);
        
        // 背景
        const bg = new Node('Bg');
        const bgSprite = bg.addComponent(Sprite);
        bgSprite.color = config.bgColor;
        const bgTransform = bg.getComponent(UITransform);
        if (bgTransform) bgTransform.setContentSize(config.width, config.height);
        areaNode.addChild(bg);
        
        // 边框
        this.createAreaBorder(areaNode, config.width, config.height, config.borderColor);
        
        // 标题
        const titleNode = new Node('Title');
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = config.name;
        titleLabel.fontSize = 14;
        titleLabel.color = config.titleColor;
        titleLabel.isBold = true;
        titleNode.setPosition(0, config.height / 2 - 14, 0);
        areaNode.addChild(titleNode);
        
        return areaNode;
    }
    
    /**
     * 创建区域边框
     */
    private createAreaBorder(parent: Node, width: number, height: number, color: Color) {
        const borderWidth = 2;
        
        // 四条边
        const positions = [
            { x: 0, y: height / 2, w: width, h: borderWidth },    // 上
            { x: 0, y: -height / 2, w: width, h: borderWidth },   // 下
            { x: -width / 2, y: 0, w: borderWidth, h: height },   // 左
            { x: width / 2, y: 0, w: borderWidth, h: height },    // 右
        ];
        
        positions.forEach((pos, i) => {
            const border = new Node(`Border_${i}`);
            const sprite = border.addComponent(Sprite);
            sprite.color = color;
            const transform = border.getComponent(UITransform);
            if (transform) transform.setContentSize(pos.w, pos.h);
            border.setPosition(pos.x, pos.y, 0);
            parent.addChild(border);
        });
        
        // 角落装饰
        const cornerSize = 10;
        const corners = [
            { x: -width / 2, y: height / 2 },
            { x: width / 2, y: height / 2 },
            { x: -width / 2, y: -height / 2 },
            { x: width / 2, y: -height / 2 },
        ];
        
        corners.forEach((pos, i) => {
            const corner = new Node(`Corner_${i}`);
            const sprite = corner.addComponent(Sprite);
            sprite.color = color;
            const transform = corner.getComponent(UITransform);
            if (transform) transform.setContentSize(cornerSize, cornerSize);
            corner.setPosition(pos.x, pos.y, 0);
            parent.addChild(corner);
        });
    }
    
    /**
     * 创建火焰装饰
     */
    private createFlameDecoration() {
        this.flameNode = new Node('Flames');
        const flameLabel = this.flameNode.addComponent(Label);
        flameLabel.string = '🔥  🔥  🔥  🔥  🔥';
        flameLabel.fontSize = 42;
        this.flameNode.setPosition(0, -150, 0);
        this.workAreasNode.addChild(this.flameNode);
        
        // 启动火焰动画
        if (this.scheduler) {
            this.startFlameAnimation();
        }
    }
    
    /**
     * 火焰动画
     */
    startFlameAnimation() {
        if (!this.flameNode || !this.scheduler) return;
        
        const flamePatterns = [
            '🔥  🔥  🔥  🔥  🔥',
            ' 🔥  🔥  🔥  🔥 ',
            '🔥   🔥   🔥   🔥',
            '  🔥  🔥  🔥  ',
        ];
        
        let patternIndex = 0;
        this.scheduler.schedule(() => {
            const label = this.flameNode?.getComponent(Label);
            if (label) {
                label.string = flamePatterns[patternIndex];
                patternIndex = (patternIndex + 1) % flamePatterns.length;
            }
            
            // 轻微上下浮动
            if (this.flameNode) {
                tween(this.flameNode)
                    .to(0.1, { position: new Vec3(0, -98 + Math.random() * 4, 0) })
                    .start();
            }
        }, 0.2);
    }
    
    /**
     * 获取工作区域容器
     */
    getWorkAreasNode(): Node {
        return this.workAreasNode;
    }
    
    /**
     * 获取火焰节点
     */
    getFlameNode(): Node {
        return this.flameNode;
    }
}
