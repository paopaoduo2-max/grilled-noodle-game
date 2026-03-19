import { _decorator, Component, Node, Sprite, SpriteFrame, Color, resources, UITransform, tween, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 帧动画播放器
 * 支持从resources加载图片序列并播放动画
 */
@ccclass('FrameAnimator')
export class FrameAnimator extends Component {
    
    private sprite: Sprite = null;
    private frames: SpriteFrame[] = [];
    private currentFrame: number = 0;
    private isPlaying: boolean = false;
    private animInterval: any = null;
    private frameRate: number = 10;
    private loop: boolean = true;
    private onComplete: (() => void) | null = null;
    
    onLoad() {
        this.sprite = this.getComponent(Sprite);
        if (!this.sprite) {
            this.sprite = this.addComponent(Sprite);
        }
    }
    
    /**
     * 加载动画帧序列
     * @param framePaths 帧图片路径数组
     * @param callback 加载完成回调
     */
    public loadFrames(framePaths: string[], callback?: () => void) {
        this.frames = [];
        let loadedCount = 0;
        
        if (framePaths.length === 0) {
            callback?.();
            return;
        }
        
        framePaths.forEach((path, index) => {
            resources.load(path + '/spriteFrame', SpriteFrame, (err, spriteFrame) => {
                loadedCount++;
                
                if (!err && spriteFrame) {
                    this.frames[index] = spriteFrame;
                }
                
                if (loadedCount >= framePaths.length) {
                    this.frames = this.frames.filter(f => f != null);
                    console.log(`[FrameAnimator] ✅ 加载了 ${this.frames.length} 帧动画`);
                    callback?.();
                }
            });
        });
    }
    
    /**
     * 设置帧率
     */
    public setFrameRate(fps: number) {
        this.frameRate = fps;
    }
    
    /**
     * 播放动画
     * @param loop 是否循环
     * @param onComplete 播放完成回调（非循环时）
     */
    public play(loop: boolean = true, onComplete?: () => void) {
        if (this.frames.length === 0) {
            console.warn('[FrameAnimator] 没有加载动画帧');
            return;
        }
        
        this.stop();
        this.loop = loop;
        this.onComplete = onComplete || null;
        this.isPlaying = true;
        this.currentFrame = 0;
        
        // 显示第一帧
        this.showFrame(0);
        
        // 开始播放
        const interval = 1000 / this.frameRate;
        this.animInterval = setInterval(() => {
            this.currentFrame++;
            
            if (this.currentFrame >= this.frames.length) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.stop();
                    this.onComplete?.();
                    return;
                }
            }
            
            this.showFrame(this.currentFrame);
        }, interval);
    }
    
    /**
     * 播放一次动画
     */
    public playOnce(onComplete?: () => void) {
        this.play(false, onComplete);
    }
    
    /**
     * 停止动画
     */
    public stop() {
        if (this.animInterval) {
            clearInterval(this.animInterval);
            this.animInterval = null;
        }
        this.isPlaying = false;
    }
    
    /**
     * 暂停动画
     */
    public pause() {
        if (this.animInterval) {
            clearInterval(this.animInterval);
            this.animInterval = null;
        }
    }
    
    /**
     * 恢复动画
     */
    public resume() {
        if (!this.isPlaying || this.animInterval) return;
        
        const interval = 1000 / this.frameRate;
        this.animInterval = setInterval(() => {
            this.currentFrame++;
            
            if (this.currentFrame >= this.frames.length) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.stop();
                    this.onComplete?.();
                    return;
                }
            }
            
            this.showFrame(this.currentFrame);
        }, interval);
    }
    
    /**
     * 显示指定帧
     */
    public showFrame(index: number) {
        if (index >= 0 && index < this.frames.length && this.sprite) {
            this.sprite.spriteFrame = this.frames[index];
        }
    }
    
    /**
     * 设置静态图片
     */
    public setStaticImage(path: string, callback?: () => void) {
        resources.load(path + '/spriteFrame', SpriteFrame, (err, spriteFrame) => {
            if (!err && spriteFrame && this.sprite) {
                this.sprite.spriteFrame = spriteFrame;
                callback?.();
            }
        });
    }
    
    /**
     * 设置颜色
     */
    public setColor(color: Color) {
        if (this.sprite) {
            this.sprite.color = color;
        }
    }
    
    /**
     * 播放缩放动画效果
     */
    public playScaleEffect(scale: number = 1.2, duration: number = 0.1) {
        tween(this.node)
            .to(duration, { scale: new Vec3(scale, scale, 1) })
            .to(duration, { scale: new Vec3(1, 1, 1) })
            .start();
    }
    
    /**
     * 播放抖动效果
     */
    public playShakeEffect(intensity: number = 5, duration: number = 0.3) {
        const originalPos = this.node.position.clone();
        const shakeCount = 6;
        const shakeDuration = duration / shakeCount;
        
        let t = tween(this.node);
        for (let i = 0; i < shakeCount; i++) {
            const offsetX = (Math.random() - 0.5) * intensity * 2;
            const offsetY = (Math.random() - 0.5) * intensity * 2;
            t = t.to(shakeDuration, { 
                position: new Vec3(originalPos.x + offsetX, originalPos.y + offsetY, originalPos.z) 
            });
        }
        t.to(shakeDuration, { position: originalPos }).start();
    }
    
    onDestroy() {
        this.stop();
    }
}
