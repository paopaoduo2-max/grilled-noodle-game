import { _decorator, Component, Color } from 'cc';
import { GACHA_UI_CONFIG } from '../Config/GachaUIConfig';
import { CelShadingRenderer } from './CelShadingRenderer';
import { CelShadingColors } from '../Config/GachaUIConfig';

const { ccclass, property } = _decorator;

/**
 * 底座组件
 * 负责绘制梯形底座、铆钉、投币口
 */
@ccclass('GachaBase')
export class GachaBase extends CelShadingRenderer {
    @property
    width: number = 160;

    @property
    height: number = 120;

    private cachedColors: CelShadingColors | null = null;
    private isInitialized: boolean = false;

    onLoad() {
        super.onLoad();
        this.isInitialized = true;
        // 如果已经有缓存的配置，立即渲染
        if (this.cachedColors) {
            this.performRender(this.cachedColors);
        }
    }

    /**
     * 渲染底座
     * @param colors - 赛璐璐三层着色颜色
     */
    render(colors: CelShadingColors) {
        // 如果还未初始化，缓存配置
        if (!this.isInitialized) {
            this.cachedColors = colors;
            return;
        }
        // 已初始化，直接渲染
        this.performRender(colors);
    }

    /**
     * 实际执行渲染的方法
     */
    private performRender(colors: CelShadingColors) {
        this.clearGraphics();

        // 1. 绘制梯形路径
        this.drawTrapezoid(colors);

        // 2. 绘制底座裙边
        this.drawBaseSkirt(colors);

        // 3. 绘制铆钉
        this.drawRivets();

        // 4. 绘制展示窗
        this.drawFrontWindow();

        // 5. 绘制投币口
        this.drawCoinSlot();
    }

    /**
     * 绘制赛璐璐风格梯形底座
     */
    private drawTrapezoid(colors: CelShadingColors) {
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        const topNarrow = 22; // 顶部收窄量

        // 定义梯形四个顶点
        // 顺序：左上 -> 右上 -> 右下 -> 左下
        const points = [
            { x: -halfW + topNarrow, y: -halfH },  // 左上
            { x: halfW - topNarrow, y: -halfH },   // 右上
            { x: halfW, y: halfH },                // 右下
            { x: -halfW, y: halfH }                // 左下
        ];

        // 1. Shadow Layer（右下偏移）
        const shadowOffset = GACHA_UI_CONFIG.themes.normal.base.shadowOffset;
        this.graphics.fillColor = colors.shadowColor;
        this.drawTrapezoidPath(
            points[0].x + shadowOffset.x,
            points[0].y + shadowOffset.y,
            points[1].x + shadowOffset.x,
            points[1].y + shadowOffset.y,
            points[2].x + shadowOffset.x,
            points[2].y + shadowOffset.y,
            points[3].x + shadowOffset.x,
            points[3].y + shadowOffset.y
        );
        this.graphics.fill();

        // 2. Base Layer（原位置）
        this.graphics.fillColor = colors.baseColor;
        this.drawTrapezoidPath(
            points[0].x, points[0].y,
            points[1].x, points[1].y,
            points[2].x, points[2].y,
            points[3].x, points[3].y
        );
        this.graphics.fill();

        // 3. Outline Layer（粗描边）
        this.graphics.strokeColor = colors.outlineColor;
        this.graphics.lineWidth = 4;
        this.graphics.stroke();

        // 4. Highlight Layer（左侧垂直高光条）
        this.graphics.fillColor = colors.highlightColor;
        this.graphics.moveTo(
            points[3].x + 8,
            points[3].y - 20
        );
        this.graphics.lineTo(
            points[0].x + 8,
            points[0].y + 20
        );
        this.graphics.lineTo(
            points[0].x + 30,
            points[3].y - 20
        );
        this.graphics.fill();
    }

    /**
     * 辅助方法：绘制梯形路径
     */
    private drawTrapezoidPath(
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number
    ) {
        this.graphics.moveTo(x0, y0);
        this.graphics.lineTo(x1, y1);
        this.graphics.lineTo(x2, y2);
        this.graphics.lineTo(x3, y3);
        this.graphics.close();
    }

    /**
     * 绘制铆钉（左右各3个）
     */
    private drawRivets() {
        const halfW = this.width / 2;
        const rivetY = 0;
        const spacing = 30; // 铆钉垂直间距

        // 左侧铆钉
        for (let dy = -30; dy <= 30; dy += spacing) {
            this.drawCelRivet(-halfW + 12, rivetY + dy);
        }

        // 右侧铆钉
        for (let dy = -30; dy <= 30; dy += spacing) {
            this.drawCelRivet(halfW - 12, rivetY + dy);
        }
    }

    /**
     * 绘制底座裙边（加重底部体积）
     */
    private drawBaseSkirt(colors: CelShadingColors) {
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        const skirtH = Math.max(26, this.height * 0.28);
        const skirtColors: CelShadingColors = {
            baseColor: new Color(
                Math.max(colors.baseColor.r - 25, 0),
                Math.max(colors.baseColor.g - 25, 0),
                Math.max(colors.baseColor.b - 25, 0),
                255
            ),
            shadowColor: colors.shadowColor,
            highlightColor: new Color(255, 255, 255, 120),
            outlineColor: colors.outlineColor
        };

        this.drawCelRect(
            -halfW + 10,
            halfH - skirtH,
            this.width - 20,
            skirtH,
            12,
            skirtColors
        );
    }

    /**
     * 绘制展示窗
     */
    private drawFrontWindow() {
        const windowW = this.width * 0.42;
        const windowH = this.height * 0.22;
        const y = -this.height * 0.02;

        this.graphics.roundRect(-windowW / 2, y - windowH / 2, windowW, windowH, 10);
        this.graphics.fillColor = new Color(30, 40, 48, 200);
        this.graphics.fill();

        this.graphics.strokeColor = Color.BLACK;
        this.graphics.lineWidth = 3;
        this.graphics.stroke();

        this.graphics.fillColor = new Color(255, 255, 255, 80);
        this.graphics.roundRect(-windowW / 2 + 6, y + windowH / 2 - 14, windowW - 12, 8, 6);
        this.graphics.fill();
    }

    /**
     * 绘制投币口
     */
    private drawCoinSlot() {
        const slotW = 36;
        const slotH = 10;
        const slotY = -26;

        // 投币口（黑色圆角矩形）
        this.graphics.roundRect(-slotW / 2, slotY, slotW, slotH, 4);
        this.graphics.fillColor = new Color(10, 10, 10, 255);
        this.graphics.fill();

        // 投币口边框（银色）
        this.graphics.strokeColor = new Color(192, 192, 192);
        this.graphics.lineWidth = 2;
        this.graphics.stroke();
    }
}
