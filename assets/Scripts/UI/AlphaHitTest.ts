import { _decorator, Component, Sprite, UITransform, EventTouch, Node, Vec2, Vec3, SpriteFrame, ImageAsset, Texture2D, Button } from 'cc';
const { ccclass, property, requireComponent } = _decorator;

/**
 * 透明区域点击无效组件
 * 只有图片不透明的区域才能响应点击
 */
@ccclass('AlphaHitTest')
@requireComponent(Sprite)
export class AlphaHitTest extends Component {

    @property({
        tooltip: '透明度阈值（0-255），低于此值的区域不响应点击',
        range: [0, 255, 1],
        slide: true
    })
    alphaThreshold: number = 10;

    @property({
        tooltip: '启用透明检测'
    })
    enableAlphaHitTest: boolean = true;

    private _sprite: Sprite | null = null;
    private _uiTransform: UITransform | null = null;
    private _button: Button | null = null;
    private _imageData: Uint8Array | null = null;
    private _imageWidth: number = 0;
    private _imageHeight: number = 0;
    private _touchBlocked: boolean = false;

    onLoad() {
        this._sprite = this.getComponent(Sprite);
        this._uiTransform = this.getComponent(UITransform);
        this._button = this.getComponent(Button);

        if (this.enableAlphaHitTest) {
            // 在捕获阶段拦截触摸事件
            this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this, true);
            this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
            this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this, true);
        }

        // 尝试提取图片数据
        this.extractImageData();
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this, true);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this, true);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this, true);
    }

    /**
     * 提取图片像素数据
     */
    private extractImageData() {
        if (!this._sprite || !this._sprite.spriteFrame) {
            console.warn(`[AlphaHitTest] ${this.node.name} 没有 SpriteFrame`);
            return;
        }

        const spriteFrame = this._sprite.spriteFrame;
        const texture = spriteFrame.texture as Texture2D;
        
        if (!texture) {
            console.warn(`[AlphaHitTest] ${this.node.name} 没有 Texture`);
            return;
        }

        // 获取图片尺寸
        this._imageWidth = spriteFrame.width;
        this._imageHeight = spriteFrame.height;

        // 尝试读取像素数据
        try {
            const image = texture.image;
            if (image && 'data' in image && image.data) {
                // ImageAsset 有 data 属性
                const data = image.data;
                if (data instanceof ArrayBuffer) {
                    this._imageData = new Uint8Array(data);
                } else if (ArrayBuffer.isView(data)) {
                    this._imageData = new Uint8Array(data.buffer);
                }
                if (this._imageData) {
                    console.log(`[AlphaHitTest] ${this.node.name} 图片数据加载成功: ${this._imageWidth}x${this._imageHeight}`);
                }
            }
            
            // 如果上面的方法失败，尝试使用 getPixelFormat 等方法
            if (!this._imageData) {
                console.log(`[AlphaHitTest] ${this.node.name} 无法直接读取像素数据，将使用边界检测`);
            }
        } catch (e) {
            console.warn(`[AlphaHitTest] ${this.node.name} 无法读取图片数据:`, e);
        }
    }

    private onTouchStart(event: EventTouch) {
        this._touchBlocked = false;

        if (!this.enableAlphaHitTest) {
            return;
        }

        // 检测点击位置的透明度
        const isOpaque = this.checkAlphaAtTouch(event);

        if (!isOpaque) {
            // 透明区域，阻止事件
            this._touchBlocked = true;
            if (this._button) {
                this._button.interactable = false;
            }
            event.propagationStopped = true;
            event.propagationImmediateStopped = true;
            event.preventSwallow = true;
        } else {
            // 确保按钮可用
            if (this._button && !this._button.interactable) {
                this._button.interactable = true;
            }
        }
    }

    private onTouchEnd(event: EventTouch) {
        if (this._touchBlocked) {
            event.propagationStopped = true;
            event.propagationImmediateStopped = true;
            event.preventSwallow = true;
        }
        
        // 恢复按钮状态
        if (this._button && this._touchBlocked) {
            this.scheduleOnce(() => {
                if (this._button) {
                    this._button.interactable = true;
                }
            }, 0);
        }
        
        this._touchBlocked = false;
    }

    private onTouchCancel(event: EventTouch) {
        if (this._button && this._touchBlocked) {
            this._button.interactable = true;
        }
        this._touchBlocked = false;
    }

    /**
     * 检测触摸位置的透明度
     */
    private checkAlphaAtTouch(event: EventTouch): boolean {
        if (!this._uiTransform || !this._sprite || !this._sprite.spriteFrame) {
            return true; // 无法检测，允许点击
        }

        // 获取触摸的UI坐标
        const uiLocation = event.getUILocation();
        
        // 转换为节点本地坐标
        const worldPos = new Vec3(uiLocation.x, uiLocation.y, 0);
        const localPos = this._uiTransform.convertToNodeSpaceAR(worldPos);

        // 获取节点的 content size
        const contentSize = this._uiTransform.contentSize;
        const anchorPoint = this._uiTransform.anchorPoint;

        // 计算点击位置在图片上的相对位置 (0-1)
        const relX = (localPos.x / contentSize.width) + anchorPoint.x;
        const relY = (localPos.y / contentSize.height) + anchorPoint.y;

        // 检查是否在图片范围内
        if (relX < 0 || relX > 1 || relY < 0 || relY > 1) {
            return false; // 超出范围
        }

        // 如果有图片数据，检测透明度
        if (this._imageData && this._imageWidth > 0 && this._imageHeight > 0) {
            // 计算像素坐标（注意：图片Y轴可能需要翻转）
            const pixelX = Math.floor(relX * this._imageWidth);
            const pixelY = Math.floor((1 - relY) * this._imageHeight); // Y轴翻转

            // 计算像素索引（RGBA 格式，每像素4字节）
            const pixelIndex = (pixelY * this._imageWidth + pixelX) * 4;
            
            if (pixelIndex >= 0 && pixelIndex + 3 < this._imageData.length) {
                const alpha = this._imageData[pixelIndex + 3];
                const isOpaque = alpha >= this.alphaThreshold;
                
                // console.log(`[AlphaHitTest] ${this.node.name} 像素(${pixelX},${pixelY}) alpha=${alpha} ${isOpaque ? '✓' : '✗'}`);
                
                return isOpaque;
            }
        }

        // 无法检测像素，使用简单的边界检测
        return true;
    }
}
