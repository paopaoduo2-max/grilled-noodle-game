import { _decorator, Component, Node, Sprite, Color, UITransform, Material, renderer, gfx } from 'cc';
import { UIColors } from '../Config/UIStyleConfig';

const { ccclass, property } = _decorator;

/**
 * 渐变背景组件
 * 创建美观的渐变背景效果
 */
@ccclass('GradientBackground')
export class GradientBackground extends Component {
    
    @property({ tooltip: '顶部颜色' })
    topColor: Color = new Color(255, 200, 150, 255);
    
    @property({ tooltip: '底部颜色' })
    bottomColor: Color = new Color(200, 120, 80, 255);
    
    @property({ tooltip: '渐变方向（0=垂直，90=水平）' })
    angle: number = 0;
    
    @property({ tooltip: '是否启用动态效果' })
    enableAnimation: boolean = true;
    
    private sprite: Sprite = null;
    private animationTime: number = 0;
    
    onLoad() {
        this.sprite = this.node.getComponent(Sprite);
        if (!this.sprite) {
            this.sprite = this.node.addComponent(Sprite);
        }
        
        this.createGradientBackground();
    }
    
    start() {
        if (this.enableAnimation) {
            this.startColorAnimation();
        }
    }
    
    /**
     * 创建渐变背景
     */
    private createGradientBackground() {
        // 使用多个子节点模拟渐变效果
        this.createGradientLayers();
    }
    
    /**
     * 创建渐变层
     */
    private createGradientLayers() {
        // 清除现有子节点
        this.node.removeAllChildren();
        
        const layerCount = 20; // 渐变层数，越多越平滑
        const transform = this.node.getComponent(UITransform);
        if (!transform) return;
        
        const width = transform.width;
        const height = transform.height;
        const layerHeight = height / layerCount;
        
        for (let i = 0; i < layerCount; i++) {
            const layer = new Node(`GradientLayer_${i}`);
            const layerSprite = layer.addComponent(Sprite);
            
            // 计算当前层的颜色（线性插值）
            const ratio = i / (layerCount - 1);
            const layerColor = new Color();
            Color.lerp(layerColor, this.topColor, this.bottomColor, ratio);
            layerSprite.color = layerColor;
            
            // 设置层的尺寸和位置
            const layerTransform = layer.getComponent(UITransform);
            if (layerTransform) {
                layerTransform.setContentSize(width, layerHeight + 2); // +2防止缝隙
                layerTransform.anchorY = 1; // 顶部对齐
            }
            
            // 从顶部开始排列
            const yPos = height / 2 - i * layerHeight;
            layer.setPosition(0, yPos, 0);
            
            this.node.addChild(layer);
        }
        
        console.log(`[GradientBackground] ✅ 创建了 ${layerCount} 层渐变背景`);
    }
    
    /**
     * 启动颜色动画
     */
    private startColorAnimation() {
        // 轻微的颜色变化动画
        this.schedule(this.updateAnimation, 0.1);
    }
    
    /**
     * 更新动画
     */
    private updateAnimation() {
        if (!this.enableAnimation) return;
        
        this.animationTime += 0.1;
        
        // 轻微的颜色波动
        const wave = Math.sin(this.animationTime * 0.5) * 0.1;
        
        this.node.children.forEach((child, index) => {
            const sprite = child.getComponent(Sprite);
            if (sprite) {
                const ratio = index / (this.node.children.length - 1);
                const baseColor = new Color();
                Color.lerp(baseColor, this.topColor, this.bottomColor, ratio);
                
                // 添加轻微波动
                const animatedColor = new Color(
                    Math.min(255, baseColor.r + wave * 20),
                    Math.min(255, baseColor.g + wave * 15),
                    Math.min(255, baseColor.b + wave * 10),
                    baseColor.a
                );
                
                sprite.color = animatedColor;
            }
        });
    }
    
    /**
     * 设置渐变颜色
     */
    public setGradientColors(topColor: Color, bottomColor: Color) {
        this.topColor = topColor;
        this.bottomColor = bottomColor;
        this.createGradientLayers();
    }
    
    /**
     * 设置预设主题
     */
    public setTheme(theme: 'warm' | 'cool' | 'sunset' | 'forest') {
        switch (theme) {
            case 'warm':
                this.setGradientColors(
                    new Color(255, 200, 150, 255), // 暖橙
                    new Color(200, 120, 80, 255)   // 深橙
                );
                break;
            case 'cool':
                this.setGradientColors(
                    new Color(150, 200, 255, 255), // 浅蓝
                    new Color(80, 120, 200, 255)   // 深蓝
                );
                break;
            case 'sunset':
                this.setGradientColors(
                    new Color(255, 180, 100, 255), // 日落橙
                    new Color(180, 80, 120, 255)   // 日落紫
                );
                break;
            case 'forest':
                this.setGradientColors(
                    new Color(150, 220, 150, 255), // 浅绿
                    new Color(80, 150, 80, 255)    // 深绿
                );
                break;
        }
    }
    
    onDestroy() {
        this.unschedule(this.updateAnimation);
    }
}
