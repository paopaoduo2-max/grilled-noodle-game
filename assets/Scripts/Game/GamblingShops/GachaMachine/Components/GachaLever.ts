import { _decorator, Component, tween, Vec3, Color } from 'cc';
import { GACHA_UI_CONFIG } from '../Config/GachaUIConfig';
import { CelShadingRenderer } from './CelShadingRenderer';
import { CelShadingColors } from '../Config/GachaUIConfig';

const { ccclass, property } = _decorator;

/**
 * 摇杆组件
 * 负责绘制可动画的摇杆（柱体+红色球头）
 */
@ccclass('GachaLever')
export class GachaLever extends CelShadingRenderer {
    @property
    length: number = 60;

    @property
    thickness: number = 12;

    @property
    ballRadius: number = 10;

    private cachedColors: CelShadingColors | null = null;
    private cachedBallColors: CelShadingColors | null = null;
    private isInitialized: boolean = false;

    onLoad() {
        super.onLoad();
        this.isInitialized = true;
        // 如果已经有缓存的配置，立即渲染
        if (this.cachedColors && this.cachedBallColors) {
            this.performRender(this.cachedColors, this.cachedBallColors);
        }
    }

    /**
     * 渲染摇杆
     * @param colors - 柱体三层着色颜色
     * @param ballColors - 球头三层着色颜色
     */
    render(colors: CelShadingColors, ballColors: CelShadingColors) {
        // 如果还未初始化，缓存配置
        if (!this.isInitialized) {
            this.cachedColors = colors;
            this.cachedBallColors = ballColors;
            return;
        }
        // 已初始化，直接渲染
        this.performRender(colors, ballColors);
    }

    /**
     * 实际执行渲染的方法
     */
    private performRender(colors: CelShadingColors, ballColors: CelShadingColors) {
        this.clearGraphics();

        // 1. 绘制柱体（赛璐璐矩形）
        this.drawLeverBody(colors);

        // 2. 绘制摇杆底座
        this.drawLeverBase(colors);

        // 3. 绘制球头（赛璐璐圆形）
        this.drawLeverBall(ballColors);
    }

    /**
     * 绘制摇杆柱体
     */
    private drawLeverBody(colors: CelShadingColors) {
        const halfW = this.thickness / 2;
        const halfH = this.length / 2;
        const radius = 6; // 圆角半径
        const shadowOffset = GACHA_UI_CONFIG.themes.normal.base.shadowOffset;

        // 1. Shadow Layer
        this.graphics.fillColor = colors.shadowColor;
        this.graphics.roundRect(
            -halfW + shadowOffset.x,
            -halfH + shadowOffset.y,
            this.thickness,
            this.length,
            radius
        );
        this.graphics.fill();

        // 2. Base Layer
        this.graphics.fillColor = colors.baseColor;
        this.graphics.roundRect(
            -halfW,
            -halfH,
            this.thickness,
            this.length,
            radius
        );
        this.graphics.fill();

        // 3. Outline Layer
        this.graphics.strokeColor = colors.outlineColor;
        this.graphics.lineWidth = 3;
        this.graphics.stroke();

        // 4. Highlight Layer（左侧高光条）
        this.graphics.fillColor = colors.highlightColor;
        this.graphics.moveTo(-halfW + 2, halfH - 10);
        this.graphics.lineTo(-halfW + 2, -halfH + 10);
        this.graphics.lineTo(-halfW + 6, halfH - 10);
        this.graphics.fill();
    }

    /**
     * 绘制摇杆球头（红色）
     */
    private drawLeverBall(colors: CelShadingColors) {
        const ballY = this.length / 2;
        const r = this.ballRadius;
        const shadowOffset = { x: 3, y: -3 };

        // 1. Shadow Layer
        this.graphics.circle(
            ballY + shadowOffset.x,
            shadowOffset.y,
            r
        );
        this.graphics.fillColor = colors.shadowColor;
        this.graphics.fill();

        // 2. Base Layer（红色球体）
        this.graphics.circle(0, ballY, r);
        this.graphics.fillColor = colors.baseColor;
        this.graphics.fill();

        // 3. Outline Layer
        this.graphics.strokeColor = colors.outlineColor;
        this.graphics.lineWidth = 3;
        this.graphics.stroke();

        // 4. Highlight Layer（左上月牙高光）
        this.graphics.fillColor = colors.highlightColor;
        this.graphics.moveTo(0, ballY);
        this.graphics.arc(
            0,
            ballY,
            r * 0.6,
            90 * Math.PI / 180,
            180 * Math.PI / 180,
            false
        );
        this.graphics.fill();
    }

    /**
     * 绘制摇杆底座
     */
    private drawLeverBase(colors: CelShadingColors) {
        const baseR = Math.max(8, this.thickness * 0.9);
        const baseY = -this.length / 2 + baseR * 0.2;

        this.drawCelCircle(0, baseY, baseR, {
            baseColor: colors.shadowColor,
            shadowColor: colors.shadowColor,
            highlightColor: new Color(255, 255, 255, 100),
            outlineColor: colors.outlineColor
        });
    }

    /**
     * 摇杆拉下动画
     * @param onComplete - 动画完成回调
     */
    pull(onComplete?: () => void) {
        const duration = GACHA_UI_CONFIG.animation.leverPullDuration;

        // 向下拉动30度
        tween(this.node)
            .to(duration * 0.5, { angle: -30 }, { easing: 'sineOut' })
            .to(duration * 0.3, { angle: 10 }, { easing: 'sineIn' })
            .to(duration * 0.2, { angle: 0 }, { easing: 'sineInOut' })
            .call(() => {
                if (onComplete) onComplete();
            })
            .start();
    }
}
