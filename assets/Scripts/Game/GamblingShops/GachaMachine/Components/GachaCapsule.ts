import { _decorator, Component, Color, Graphics } from 'cc';
import { GACHA_UI_CONFIG } from '../Config/GachaUIConfig';

const { ccclass, property } = _decorator;

/**
 * 胶囊组件
 * 负责绘制扭蛋胶囊（上半部彩色+下半部白色）
 */
@ccclass('GachaCapsule')
export class GachaCapsule extends Component {
    @property
    radius: number = 25;

    private capsuleColor: string = '#FF5E5E'; // 默认红色

    onLoad() {
        // 随机选择胶囊颜色
        const colors = GACHA_UI_CONFIG.capsuleColors;
        this.capsuleColor = colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * 渲染胶囊
     */
    render() {
        // 添加Graphics组件
        let graphics = this.getComponent(Graphics);
        if (!graphics) {
            graphics = this.addComponent(Graphics);
        }

        const r = this.radius;
        const topColor = new Color().fromHEX(this.capsuleColor);
        const bottomColor = Color.WHITE;

        // 上半球（彩色）
        graphics.moveTo(-r, 0);
        graphics.arc(0, 0, r, 180, 0, false);
        graphics.lineTo(-r, 0);
        graphics.fillColor = topColor;
        graphics.fill();

        // 高光点
        graphics.fillColor = new Color(255, 255, 255, 100);
        graphics.arc(-3, -3, r * 0.3, 0, 360, false);
        graphics.fill();

        // 下半球（白色）
        graphics.moveTo(-r, 0);
        graphics.arc(0, 0, r, 180, 0, true);
        graphics.lineTo(-r, 0);
        graphics.fillColor = bottomColor;
        graphics.fill();

        // 描边
        graphics.strokeColor = Color.BLACK;
        graphics.lineWidth = 2;
        graphics.circle(0, 0, r);
        graphics.stroke();
    }

    /**
     * 设置胶囊颜色
     */
    setColor(colorHex: string) {
        this.capsuleColor = colorHex;
    }

    /**
     * 获取胶囊颜色
     */
    getColor(): string {
        return this.capsuleColor;
    }
}
