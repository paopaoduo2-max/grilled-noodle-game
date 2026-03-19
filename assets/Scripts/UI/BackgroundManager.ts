import { _decorator, Component, Node, Sprite, SpriteFrame, resources, Color, UITransform, tween, Vec3 } from 'cc';
import { UIColors } from '../Config/UIStyleConfig';

const { ccclass, property } = _decorator;

/**
 * 背景管理器
 * 支持静态背景、动态背景（帧动画）、渐变背景
 */
@ccclass('BackgroundManager')
export class BackgroundManager extends Component {
    
    @property({ tooltip: '静态背景图路径（resources下）' })
    staticImagePath: string = '';
    
    @property({ tooltip: '是否使用动态背景' })
    useAnimation: boolean = false;
    
    @property({ tooltip: '动态背景帧路径前缀' })
    framePathPrefix: string = '';
    
    @property({ tooltip: '动态背景帧数' })
    frameCount: number = 4;
    
    @property({ tooltip: '动画帧率' })
    frameRate: number = 8;
    
    @property({ tooltip: '是否循环播放' })
    loop: boolean = true;
    
    @property({ tooltip: '默认背景颜色（无图片时使用）' })
    defaultColor: Color = new Color(45, 35, 30, 255);
    
    @property({ tooltip: '是否启用呼吸效果' })
    enableBreathing: boolean = false;
    
    @property({ tooltip: '呼吸效果强度' })
    breathingIntensity: number = 0.02;
    
    private sprite: Sprite = null;
    private frames: SpriteFrame[] = [];
    private currentFrame: number = 0;
    private animationInterval: number = 0;
    private isPlaying: boolean = false;
    
    onLoad() {
        this.sprite = this.node.getComponent(Sprite);
        if (!this.sprite) {
            this.sprite = this.node.addComponent(Sprite);
        }
        
        // 设置默认颜色
        this.sprite.color = this.defaultColor;
        
        // 确保背景铺满
        this.setupFullScreen();
    }
    
    start() {
        if (this.useAnimation && this.framePathPrefix) {
            this.loadAnimationFrames();
        } else if (this.staticImagePath) {
            this.loadStaticImage();
        }
        
        if (this.enableBreathing) {
            this.startBreathingEffect();
        }
    }
    
    /**
     * 设置全屏
     */
    private setupFullScreen() {
        const transform = this.node.getComponent(UITransform);
        if (transform) {
            // 获取屏幕尺寸
            const canvas = this.node.parent;
            if (canvas) {
                const canvasTransform = canvas.getComponent(UITransform);
                if (canvasTransform) {
                    transform.setContentSize(canvasTransform.width, canvasTransform.height);
                }
            }
        }
    }
    
    /**
     * 加载静态背景图
     */
    public loadStaticImage(path?: string) {
        const imagePath = path || this.staticImagePath;
        if (!imagePath) return;
        
        resources.load(imagePath + '/spriteFrame', SpriteFrame, (err, spriteFrame) => {
            if (err) {
                console.warn(`[BackgroundManager] 加载背景图失败: ${imagePath}`, err);
                return;
            }
            
            if (this.sprite && spriteFrame) {
                this.sprite.spriteFrame = spriteFrame;
                this.sprite.color = Color.WHITE;
                console.log(`[BackgroundManager] ✅ 背景图已加载: ${imagePath}`);
            }
        });
    }
    
    /**
     * 加载动画帧序列
     */
    private loadAnimationFrames() {
        this.frames = [];
        let loadedCount = 0;
        
        for (let i = 0; i < this.frameCount; i++) {
            const frameNum = i + 1 < 10 ? `0${i + 1}` : `${i + 1}`;
            const framePath = `${this.framePathPrefix}_${frameNum}/spriteFrame`;
            
            resources.load(framePath, SpriteFrame, (err, spriteFrame) => {
                loadedCount++;
                
                if (!err && spriteFrame) {
                    this.frames[i] = spriteFrame;
                }
                
                // 所有帧加载完成后开始播放
                if (loadedCount >= this.frameCount) {
                    this.frames = this.frames.filter(f => f != null);
                    if (this.frames.length > 0) {
                        console.log(`[BackgroundManager] ✅ 动画帧已加载: ${this.frames.length}帧`);
                        this.playAnimation();
                    }
                }
            });
        }
    }
    
    /**
     * 播放帧动画
     */
    public playAnimation() {
        if (this.frames.length === 0 || this.isPlaying) return;
        
        this.isPlaying = true;
        this.currentFrame = 0;
        this.sprite.color = Color.WHITE;
        
        const interval = 1000 / this.frameRate;
        
        this.animationInterval = setInterval(() => {
            if (this.sprite && this.frames[this.currentFrame]) {
                this.sprite.spriteFrame = this.frames[this.currentFrame];
            }
            
            this.currentFrame++;
            if (this.currentFrame >= this.frames.length) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.stopAnimation();
                }
            }
        }, interval) as unknown as number;
    }
    
    /**
     * 停止动画
     */
    public stopAnimation() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = 0;
        }
        this.isPlaying = false;
    }
    
    /**
     * 呼吸效果（轻微缩放）
     */
    private startBreathingEffect() {
        const intensity = this.breathingIntensity;
        
        tween(this.node)
            .repeatForever(
                tween()
                    .to(2, { scale: new Vec3(1 + intensity, 1 + intensity, 1) }, { easing: 'sineInOut' })
                    .to(2, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
            )
            .start();
    }
    
    /**
     * 设置背景颜色（无图片时的纯色背景）
     */
    public setBackgroundColor(color: Color) {
        if (this.sprite) {
            this.sprite.spriteFrame = null;
            this.sprite.color = color;
        }
    }
    
    /**
     * 渐变切换背景
     */
    public fadeToImage(imagePath: string, duration: number = 0.5) {
        resources.load(imagePath + '/spriteFrame', SpriteFrame, (err, spriteFrame) => {
            if (err || !spriteFrame) return;
            
            // 创建临时节点做渐变
            const tempNode = new Node('TempBg');
            const tempSprite = tempNode.addComponent(Sprite);
            tempSprite.spriteFrame = spriteFrame;
            tempSprite.color = new Color(255, 255, 255, 0);
            
            const tempTransform = tempNode.getComponent(UITransform);
            const myTransform = this.node.getComponent(UITransform);
            if (tempTransform && myTransform) {
                tempTransform.setContentSize(myTransform.contentSize);
            }
            
            this.node.parent.addChild(tempNode);
            tempNode.setSiblingIndex(this.node.getSiblingIndex() + 1);
            
            // 渐变动画
            tween(tempSprite)
                .to(duration, { color: new Color(255, 255, 255, 255) })
                .call(() => {
                    this.sprite.spriteFrame = spriteFrame;
                    this.sprite.color = Color.WHITE;
                    tempNode.destroy();
                })
                .start();
        });
    }
    
    onDestroy() {
        this.stopAnimation();
    }
}
