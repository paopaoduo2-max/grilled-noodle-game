import { _decorator, Component, Node, Label, Sprite, Button, UITransform, Color, Size, Vec3, tween, UIOpacity } from 'cc';
import { UIColors, UISizes, UIFonts, UIAnimations, getButtonStyle } from '../Config/UIStyleConfig';

const { ccclass, property } = _decorator;

/**
 * UI 工厂类
 * 用于创建统一风格的 UI 组件
 */
@ccclass('UIFactory')
export class UIFactory {
    
    /**
     * 创建标题文字
     */
    static createTitle(text: string, size: 'large' | 'medium' | 'small' = 'large'): Node {
        const node = new Node('Title');
        const label = node.addComponent(Label);
        
        label.string = text;
        label.color = UIColors.textGold;
        label.fontSize = size === 'large' ? UIFonts.titleLarge : 
                         size === 'medium' ? UIFonts.titleMedium : UIFonts.titleSmall;
        label.isBold = true;
        
        return node;
    }
    
    /**
     * 创建普通文字
     */
    static createLabel(text: string, options?: {
        size?: 'large' | 'medium' | 'small',
        color?: Color,
        bold?: boolean
    }): Node {
        const node = new Node('Label');
        const label = node.addComponent(Label);
        
        const size = options?.size || 'medium';
        label.string = text;
        label.color = options?.color || UIColors.textLight;
        label.fontSize = size === 'large' ? UIFonts.bodyLarge : 
                         size === 'medium' ? UIFonts.bodyMedium : UIFonts.bodySmall;
        if (options?.bold) label.isBold = true;
        
        return node;
    }
    
    /**
     * 创建按钮
     */
    static createButton(text: string, options?: {
        type?: 'primary' | 'secondary' | 'danger' | 'ghost',
        size?: 'large' | 'medium' | 'small',
        emoji?: string,
        onClick?: () => void
    }): Node {
        const type = options?.type || 'primary';
        const size = options?.size || 'medium';
        const style = getButtonStyle(type);
        
        const buttonSize = size === 'large' ? UISizes.buttonLarge :
                          size === 'medium' ? UISizes.buttonMedium : UISizes.buttonSmall;
        
        // 按钮节点
        const node = new Node('Button');
        const sprite = node.addComponent(Sprite);
        sprite.color = style.bgColor;
        
        const transform = node.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(buttonSize);
        }
        
        // 按钮组件
        const button = node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = UIAnimations.scalePress;
        
        // 文字
        const labelNode = new Node('Label');
        const label = labelNode.addComponent(Label);
        const displayText = options?.emoji ? `${options.emoji} ${text}` : text;
        label.string = displayText;
        label.color = style.textColor;
        label.fontSize = size === 'large' ? UIFonts.bodyLarge : 
                        size === 'medium' ? UIFonts.bodyMedium : UIFonts.bodySmall;
        label.isBold = true;
        node.addChild(labelNode);
        
        // 点击事件
        if (options?.onClick) {
            node.on(Button.EventType.CLICK, options.onClick);
        }
        
        return node;
    }
    
    /**
     * 创建图标按钮
     */
    static createIconButton(emoji: string, options?: {
        size?: number,
        bgColor?: Color,
        onClick?: () => void
    }): Node {
        const size = options?.size || 60;
        
        const node = new Node('IconButton');
        const sprite = node.addComponent(Sprite);
        sprite.color = options?.bgColor || UIColors.bgMedium;
        
        const transform = node.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(size, size);
        }
        
        const button = node.addComponent(Button);
        button.transition = Button.Transition.SCALE;
        button.zoomScale = UIAnimations.scalePress;
        
        // 图标
        const iconNode = new Node('Icon');
        const iconLabel = iconNode.addComponent(Label);
        iconLabel.string = emoji;
        iconLabel.fontSize = size * 0.5;
        node.addChild(iconNode);
        
        if (options?.onClick) {
            node.on(Button.EventType.CLICK, options.onClick);
        }
        
        return node;
    }
    
    /**
     * 创建面板
     */
    static createPanel(options?: {
        size?: Size,
        color?: Color,
        title?: string
    }): Node {
        const panelSize = options?.size || UISizes.panelMedium;
        
        const node = new Node('Panel');
        const sprite = node.addComponent(Sprite);
        sprite.color = options?.color || UIColors.bgMedium;
        
        const transform = node.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(panelSize);
        }
        
        // 标题
        if (options?.title) {
            const titleNode = UIFactory.createTitle(options.title, 'medium');
            titleNode.setPosition(0, panelSize.height / 2 - 40, 0);
            node.addChild(titleNode);
        }
        
        return node;
    }
    
    /**
     * 创建卡片
     */
    static createCard(options?: {
        size?: Size,
        color?: Color
    }): Node {
        const cardSize = options?.size || UISizes.cardMedium;
        
        const node = new Node('Card');
        const sprite = node.addComponent(Sprite);
        sprite.color = options?.color || UIColors.bgLight;
        
        const transform = node.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(cardSize);
        }
        
        return node;
    }
    
    /**
     * 创建分隔线
     */
    static createDivider(width: number = 200, color?: Color): Node {
        const node = new Node('Divider');
        const sprite = node.addComponent(Sprite);
        sprite.color = color || new Color(255, 255, 255, 50);
        
        const transform = node.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(width, 2);
        }
        
        return node;
    }
    
    /**
     * 创建遮罩层
     */
    static createOverlay(onClick?: () => void): Node {
        const node = new Node('Overlay');
        const sprite = node.addComponent(Sprite);
        sprite.color = UIColors.bgOverlay;
        
        const transform = node.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(2000, 2000);
        }
        
        if (onClick) {
            node.on(Node.EventType.TOUCH_END, onClick);
        }
        
        return node;
    }
    
    /**
     * 创建金币显示
     */
    static createCoinDisplay(amount: number): Node {
        const node = new Node('CoinDisplay');
        
        const bg = node.addComponent(Sprite);
        bg.color = new Color(0, 0, 0, 120);
        
        const transform = node.getComponent(UITransform);
        if (transform) {
            transform.setContentSize(120, 40);
        }
        
        const labelNode = new Node('Label');
        const label = labelNode.addComponent(Label);
        label.string = `💰 ${amount}`;
        label.fontSize = UIFonts.bodyMedium;
        label.color = UIColors.gold;
        node.addChild(labelNode);
        
        return node;
    }
    
    /**
     * 创建进度条
     */
    static createProgressBar(width: number = 200, height: number = 20): { 
        container: Node, 
        bar: Node,
        setProgress: (value: number) => void 
    } {
        const container = new Node('ProgressBar');
        const bgSprite = container.addComponent(Sprite);
        bgSprite.color = new Color(40, 40, 40, 200);
        
        const bgTransform = container.getComponent(UITransform);
        if (bgTransform) {
            bgTransform.setContentSize(width, height);
        }
        
        const bar = new Node('Fill');
        const barSprite = bar.addComponent(Sprite);
        barSprite.color = UIColors.secondary;
        
        const barTransform = bar.addComponent(UITransform);
        barTransform.setContentSize(0, height - 4);
        barTransform.anchorX = 0;
        bar.setPosition(-width / 2 + 2, 0, 0);
        container.addChild(bar);
        
        const setProgress = (value: number) => {
            const clampedValue = Math.max(0, Math.min(1, value));
            barTransform.setContentSize((width - 4) * clampedValue, height - 4);
        };
        
        return { container, bar, setProgress };
    }
    
    // ==================== 动画效果 ====================
    
    /**
     * 弹出动画
     */
    static popIn(node: Node, duration: number = UIAnimations.durationNormal) {
        node.setScale(0, 0, 1);
        tween(node)
            .to(duration, { scale: new Vec3(1.1, 1.1, 1) })
            .to(duration * 0.3, { scale: new Vec3(1, 1, 1) })
            .start();
    }
    
    /**
     * 淡入动画
     */
    static fadeIn(node: Node, duration: number = UIAnimations.durationNormal) {
        let opacity = node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = node.addComponent(UIOpacity);
        }
        opacity.opacity = 0;
        tween(opacity)
            .to(duration, { opacity: 255 })
            .start();
    }
    
    /**
     * 淡出动画
     */
    static fadeOut(node: Node, duration: number = UIAnimations.durationNormal, onComplete?: () => void) {
        let opacity = node.getComponent(UIOpacity);
        if (!opacity) {
            opacity = node.addComponent(UIOpacity);
        }
        tween(opacity)
            .to(duration, { opacity: 0 })
            .call(() => {
                if (onComplete) onComplete();
            })
            .start();
    }
    
    /**
     * 按钮点击效果
     */
    static buttonPressEffect(node: Node) {
        tween(node)
            .to(0.08, { scale: new Vec3(0.95, 0.95, 1) })
            .to(0.08, { scale: new Vec3(1, 1, 1) })
            .start();
    }
}
