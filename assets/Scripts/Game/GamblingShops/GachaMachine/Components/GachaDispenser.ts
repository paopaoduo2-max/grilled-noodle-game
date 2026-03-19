import { _decorator, Component, tween, Color } from 'cc';
import { GACHA_UI_CONFIG } from '../Config/GachaUIConfig';
import { CelShadingRenderer } from './CelShadingRenderer';

const { ccclass, property } = _decorator;

/**
 * 出货口组件
 * 负责绘制半圆形出货口和红白条纹帘幕
 */
@ccclass('GachaDispenser')
export class GachaDispenser extends CelShadingRenderer {
    @property
    width: number = 50;

    @property
    stripeCount: number = 5;

    private shouldRender: boolean = false;
    private isInitialized: boolean = false;

    onLoad() {
        super.onLoad();
        this.isInitialized = true;
        // 如果标记为需要渲染，立即渲染
        if (this.shouldRender) {
            this.performRender();
        }
    }

    /**
     * 渲染出货口
     */
    render() {
        // 如果还未初始化，标记为需要渲染
        if (!this.isInitialized) {
            this.shouldRender = true;
            return;
        }
        // 已初始化，直接渲染
        this.performRender();
    }

    /**
     * 实际执行渲染的方法
     */
    private performRender() {
        this.clearGraphics();

        // 1. 绘制半圆形开口（黑色深洞）
        this.drawOpening();

        // 2. 绘制出货口框架
        this.drawFrame();

        // 3. 绘制红白条纹帘幕
        this.drawStripedCurtain();
    }

    /**
     * 绘制半圆形开口
     */
    private drawOpening() {
        const r = this.width / 2;

        // 半圆形开口（向下）
        this.graphics.arc(0, 0, r, 0, 180, true);
        this.graphics.fillColor = Color.BLACK;
        this.graphics.fill();

        // 边框（银色描边）
        this.graphics.strokeColor = new Color(192, 192, 192);
        this.graphics.lineWidth = 3;
        this.graphics.stroke();
    }

    /**
     * 绘制出货口框架
     */
    private drawFrame() {
        const frameW = this.width + 12;
        const frameH = this.width * 0.6;

        this.graphics.roundRect(-frameW / 2, -frameH * 0.8, frameW, frameH, 8);
        this.graphics.fillColor = new Color(40, 48, 56, 255);
        this.graphics.fill();

        this.graphics.strokeColor = Color.BLACK;
        this.graphics.lineWidth = 3;
        this.graphics.stroke();
    }

    /**
     * 绘制红白条纹帘幕
     */
    private drawStripedCurtain() {
        const stripeWidth = this.width / this.stripeCount;
        const curtainHeight = this.width / 2;

        for (let i = 0; i < this.stripeCount; i++) {
            // 计算条纹位置
            const leftX = (i - this.stripeCount / 2) * stripeWidth;
            const rightX = leftX + stripeWidth;

            // 条纹路径（梯形：上窄下宽）
            this.graphics.moveTo(leftX, -curtainHeight);
            this.graphics.lineTo(rightX - stripeWidth * 0.2, -curtainHeight);
            this.graphics.lineTo(rightX, 0);
            this.graphics.lineTo(leftX, 0);
            this.graphics.close();

            // 填充色（红白相间，硬阴影无渐变）
            const isRed = i % 2 === 0;
            this.graphics.fillColor = isRed ? Color.RED : Color.WHITE;
            this.graphics.fill();

            // 描边
            this.graphics.strokeColor = Color.BLACK;
            this.graphics.lineWidth = 1;
            this.graphics.stroke();
        }
    }

    /**
     * 出货动画（帘幕弹起）
     * @param onComplete - 动画完成回调
     */
    dispense(onComplete?: () => void) {
        // 帘幕向上弹起再落下
        tween(this.node)
            .to(0.15, { position: { x: 0, y: 20, z: 0 } }, { easing: 'backOut' })
            .to(0.1, { position: { x: 0, y: 0, z: 0 } }, { easing: 'bounceOut' })
            .call(() => {
                if (onComplete) onComplete();
            })
            .start();
    }
}
