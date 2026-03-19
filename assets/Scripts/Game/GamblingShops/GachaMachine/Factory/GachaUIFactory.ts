import { Node, Graphics, Color, Label, Button, UITransform } from 'cc';
import { GACHA_UI_CONFIG, CelShadingColors } from '../Config/GachaUIConfig';
import { GachaGlobe } from '../Components/GachaGlobe';
import { GachaBase } from '../Components/GachaBase';
import { GachaLever } from '../Components/GachaLever';

/**
 * 扭蛋机UI工厂类
 * 负责创建赛璐璐风格的扭蛋机UI组件
 */
export class GachaUIFactory {
    /**
     * 创建完整扭蛋机（组合所有组件）
     * @param tierId - 机器等级ID ('normal' | 'premium' | 'luxury')
     * @returns 扭蛋机节点
     */
    static createGachaMachine(tierId: string): Node {
        const machineNode = new Node('GachaMachine');
        const theme = GACHA_UI_CONFIG.themes[tierId];

        // 1. 玻璃球组件
        const globeNode = this.createGlobe(theme.globe);
        globeNode.setPosition(0, 110, 0);
        machineNode.addChild(globeNode);

        // 2. 底座组件
        const baseNode = this.createBase(theme.base);
        baseNode.setPosition(0, -95, 0);
        machineNode.addChild(baseNode);

        // 3. 摇杆组件
        const leverNode = this.createLever(theme.lever);
        leverNode.setPosition(150, 20, 0);
        machineNode.addChild(leverNode);

        return machineNode;
    }

    /**
     * 创建玻璃球组件
     * @param config - 玻璃球配置
     * @returns 玻璃球节点
     */
    static createGlobe(config: any): Node {
        const node = new Node('Globe');
        const globe = node.addComponent(GachaGlobe);
        globe.radius = config.radius;
        globe.capsuleCount = config.capsuleCount;
        // 组件会在 start() 生命周期中自动渲染
        return node;
    }

    /**
     * 创建底座组件
     * @param config - 底座配置
     * @returns 底座节点
     */
    static createBase(config: any): Node {
        const node = new Node('Base');
        const base = node.addComponent(GachaBase);
        base.width = config.dimensions.width;
        base.height = config.dimensions.height;
        // 先调用 render 缓存配置，组件会在 start() 中自动渲染
        base.render(config.colors);
        return node;
    }

    /**
     * 创建摇杆组件
     * @param config - 摇杆配置
     * @returns 摇杆节点
     */
    static createLever(config: any): Node {
        const node = new Node('Lever');
        const lever = node.addComponent(GachaLever);
        lever.length = config.length;
        lever.thickness = config.thickness;
        lever.ballRadius = config.ballRadius;
        // 先调用 render 缓存配置，组件会在 start() 中自动渲染
        lever.render(config.colors, config.ballColors);
        return node;
    }

    /**
     * 创建赛璐璐风格按钮
     * @param text - 按钮文字
     * @param colors - 三层着色颜色
     * @param width - 宽度
     * @param height - 高度
     * @returns 按钮节点
     */
    static createCelButton(
        text: string,
        colors: CelShadingColors,
        width: number,
        height: number,
        showHighlight: boolean = true
    ): Node {
        const node = new Node('Button');
        // 确保有 UITransform 组件
        let transform = node.getComponent(UITransform);
        if (!transform) {
            transform = node.addComponent(UITransform);
        }
        transform.setContentSize(width, height);

        // 绘制赛璐璐风格按钮背景
        const graphics = node.addComponent(Graphics);
        const radius = 15;
        const shadowOffset = { x: 6, y: -6 };

        // 1. Shadow Layer
        graphics.fillColor = colors.shadowColor;
        graphics.roundRect(
            -width / 2 + shadowOffset.x,
            -height / 2 + shadowOffset.y,
            width,
            height,
            radius
        );
        graphics.fill();

        // 2. Base Layer
        graphics.fillColor = colors.baseColor;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.fill();

        // 3. Outline Layer
        graphics.strokeColor = colors.outlineColor;
        graphics.lineWidth = 4;
        graphics.stroke();

        // 4. Highlight Layer
        if (showHighlight) {
            graphics.fillColor = colors.highlightColor;
            graphics.moveTo(-width / 2 + radius, height / 2 - radius * 2);
            graphics.lineTo(-width / 2 + radius, -height / 2 + radius);
            graphics.lineTo(width / 2 - radius * 2, height / 2 - radius);
            graphics.fill();
        }

        // 添加文字
        const labelNode = new Node('Label');
        const labelTransform = labelNode.addComponent(UITransform);
        labelTransform.setContentSize(width - 16, height - 10);
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 22;
        label.lineHeight = 26;
        label.isBold = true;
        label.color = Color.WHITE;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.enableOutline = true;
        label.outlineColor = Color.BLACK;
        label.outlineWidth = 2;
        node.addChild(labelNode);

        // 添加按钮组件
        const button = node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = 0.95;

        return node;
    }

    /**
     * 创建胶囊（用于动画）
     * @param colorHex - 胶囊颜色（十六进制）
     * @param radius - 半径
     * @returns 胶囊节点
     */
    static createCapsule(colorHex: string, radius: number = 25): Node {
        const node = new Node('Capsule');
        const graphics = node.addComponent(Graphics);

        const topColor = new Color().fromHEX(colorHex);
        const shade = (v: number, delta: number) => Math.min(255, Math.max(0, v + delta));
        const shadowColor = new Color(
            shade(topColor.r, -55),
            shade(topColor.g, -55),
            shade(topColor.b, -55),
            255
        );
        const midColor = new Color(
            shade(topColor.r, -20),
            shade(topColor.g, -20),
            shade(topColor.b, -20),
            255
        );
        const deg = Math.PI / 180;

        // 上半球（彩色）
        graphics.moveTo(-radius, 0);
        graphics.arc(0, 0, radius, 180 * deg, 0, false);
        graphics.lineTo(-radius, 0);
        graphics.fillColor = topColor;
        graphics.fill();

        // 下半球（阴影色）
        graphics.moveTo(-radius, 0);
        graphics.arc(0, 0, radius, 180 * deg, 0, true);
        graphics.lineTo(-radius, 0);
        graphics.fillColor = shadowColor;
        graphics.fill();

        // 中间分割线
        graphics.strokeColor = new Color(0, 0, 0, 140);
        graphics.lineWidth = 1.6;
        graphics.moveTo(-radius, 0);
        graphics.lineTo(radius, 0);
        graphics.stroke();

        // 高光弧线
        graphics.strokeColor = new Color(255, 255, 255, 170);
        graphics.lineWidth = 2;
        graphics.arc(-radius * 0.2, radius * 0.2, radius * 0.6, 210 * deg, 310 * deg, false);
        graphics.stroke();

        // 高光点
        graphics.fillColor = new Color(255, 255, 255, 150);
        graphics.circle(-radius * 0.3, radius * 0.25, radius * 0.18);
        graphics.fill();

        // 阴影弧线
        graphics.strokeColor = new Color(midColor.r, midColor.g, midColor.b, 130);
        graphics.lineWidth = 3;
        graphics.arc(radius * 0.2, -radius * 0.2, radius * 0.5, 320 * deg, 40 * deg, false);
        graphics.stroke();

        // 描边
        graphics.strokeColor = Color.BLACK;
        graphics.lineWidth = 2.2;
        graphics.circle(0, 0, radius);
        graphics.stroke();

        return node;
    }
}
