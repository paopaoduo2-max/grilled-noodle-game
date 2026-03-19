import { _decorator, Component, Graphics, Color, Vec2 } from 'cc';
import { CelShadingColors } from '../Config/GachaUIConfig';

const { ccclass, property } = _decorator;

/**
 * 赛璐璐渲染基类
 * 封装赛璐璐风格的通用绘制逻辑（粗描边、硬阴影、分层着色）
 */
@ccclass('CelShadingRenderer')
export class CelShadingRenderer extends Component {
    protected graphics: Graphics = null!;

    onLoad() {
        this.graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
    }

    /**
     * 绘制赛璐璐风格矩形（三层着色 + 粗描边）
     * @param x, y, w, h - 矩形位置和尺寸
     * @param radius - 圆角半径
     * @param colors - 三层着色颜色
     * @param shadowOffset - 阴影偏移（右下），默认(6, -6)
     */
    protected drawCelRect(
        x: number,
        y: number,
        w: number,
        h: number,
        radius: number,
        colors: CelShadingColors,
        shadowOffset: Vec2 = new Vec2(6, -6)
    ) {
        // 1. Shadow Layer（右下偏移，硬阴影无渐变）
        this.graphics.fillColor = colors.shadowColor;
        this.graphics.roundRect(
            x + shadowOffset.x,
            y + shadowOffset.y,
            w,
            h,
            radius
        );
        this.graphics.fill();

        // 2. Base Layer（原位置基础色）
        this.graphics.fillColor = colors.baseColor;
        this.graphics.roundRect(x, y, w, h, radius);
        this.graphics.fill();

        // 3. Outline Layer（粗描边4-5px）
        this.graphics.strokeColor = colors.outlineColor;
        this.graphics.lineWidth = 4;
        this.graphics.stroke();

        // 4. Highlight Layer（左上三角形高光）
        this.drawHighlightTriangle(x, y, w, h, radius, colors.highlightColor);
    }

    /**
     * 绘制赛璐璐风格圆形
     * @param x, y - 圆心位置
     * @param radius - 半径
     * @param colors - 三层着色颜色
     * @param shadowOffset - 阴影偏移，默认(5, -5)
     */
    protected drawCelCircle(
        x: number,
        y: number,
        radius: number,
        colors: CelShadingColors,
        shadowOffset: Vec2 = new Vec2(5, -5)
    ) {
        // 1. Shadow Layer（右下偏移）
        this.graphics.circle(x + shadowOffset.x, y + shadowOffset.y, radius);
        this.graphics.fillColor = colors.shadowColor;
        this.graphics.fill();

        // 2. Base Layer（原位置基础色）
        this.graphics.circle(x, y, radius);
        this.graphics.fillColor = colors.baseColor;
        this.graphics.fill();

        // 3. Outline Layer（粗描边）
        this.graphics.strokeColor = colors.outlineColor;
        this.graphics.lineWidth = 4;
        this.graphics.stroke();

        // 4. Highlight Layer（左上月牙形高光）
        this.drawCrescentHighlight(x, y, radius, colors.highlightColor);
    }

    /**
     * 绘制左上三角形高光
     */
    private drawHighlightTriangle(
        x: number,
        y: number,
        w: number,
        h: number,
        radius: number,
        color: Color
    ) {
        this.graphics.fillColor = color;
        // 左上角三角形高光（占据矩形约1/4）
        this.graphics.moveTo(x + radius, y + h - radius * 2);
        this.graphics.lineTo(x + radius, y + radius);
        this.graphics.lineTo(x + w - radius * 2, y + h - radius);
        this.graphics.close();
        this.graphics.fill();
    }

    /**
     * 绘制左上月牙形高光（用于圆形）
     */
    private drawCrescentHighlight(
        centerX: number,
        centerY: number,
        radius: number,
        color: Color
    ) {
        this.graphics.fillColor = color;
        // 10点钟方向的弯月形高光
        const highlightRadius = radius * 0.7;
        this.graphics.moveTo(centerX, centerY);
        this.graphics.arc(
            centerX,
            centerY,
            highlightRadius,
            220 * Math.PI / 180,
            280 * Math.PI / 180,
            false
        );
        this.graphics.lineTo(centerX, centerY);
        this.graphics.fill();
    }

    /**
     * 绘制赛璐璐风格胶囊（由两个半圆组成）
     * @param x, y - 中心位置
     * @param radius - 胶囊半径
     * @param topColor - 上半球颜色
     * @param bottomColor - 下半球颜色
     * @param outlineWidth - 描边宽度
     */
    protected drawCelCapsule(
        x: number,
        y: number,
        radius: number,
        topColor: Color,
        bottomColor: Color,
        outlineWidth: number = 2
    ) {
        // 上半球（彩色）
        this.graphics.moveTo(x - radius, y);
        this.graphics.arc(x, y, radius, 180, 0, false);
        this.graphics.lineTo(x - radius, y);
        this.graphics.fillColor = topColor;
        this.graphics.fill();

        // 上半球高光
        this.graphics.fillColor = new Color(255, 255, 255, 100);
        this.graphics.arc(x - 3, y - 3, radius * 0.3, 0, 360, false);
        this.graphics.fill();

        // 下半球（白色）
        this.graphics.moveTo(x - radius, y);
        this.graphics.arc(x, y, radius, 180, 0, true);
        this.graphics.lineTo(x - radius, y);
        this.graphics.fillColor = bottomColor;
        this.graphics.fill();

        // 描边
        this.graphics.strokeColor = Color.BLACK;
        this.graphics.lineWidth = outlineWidth;
        this.graphics.circle(x, y, radius);
        this.graphics.stroke();
    }

    /**
     * 绘制赛璐璐风格铆钉（小圆形三层着色）
     * @param x, y - 中心位置
     * @param radius - 铆钉半径
     */
    protected drawCelRivet(
        x: number,
        y: number,
        radius: number = 5
    ) {
        // Shadow
        this.graphics.circle(x + 2, y - 2, radius);
        this.graphics.fillColor = new Color(128, 128, 128, 255); // 深灰阴影
        this.graphics.fill();

        // Base（银色）
        this.graphics.circle(x, y, radius);
        this.graphics.fillColor = new Color(192, 192, 192, 255); // 银色基础
        this.graphics.fill();

        // Outline
        this.graphics.strokeColor = Color.BLACK;
        this.graphics.lineWidth = 1;
        this.graphics.stroke();

        // Highlight（小月牙）
        this.graphics.fillColor = new Color(255, 255, 255, 150);
        this.graphics.moveTo(x, y);
        this.graphics.arc(x, y, radius * 0.5, 180, 270, false);
        this.graphics.fill();
    }

    /**
     * 清除绘制内容
     */
    protected clearGraphics() {
        this.graphics.clear();
    }
}
