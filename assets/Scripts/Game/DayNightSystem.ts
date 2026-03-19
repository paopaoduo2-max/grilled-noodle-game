import { _decorator, Component, Node, Sprite, SpriteFrame, UIOpacity, UITransform, Color } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 🌅 白天/夜晚切换系统
 * 渐进式切换：从transitionStartHour开始渐变，到nightStartHour完成
 */
@ccclass('DayNightSystem')
export class DayNightSystem extends Component {
    
    // === 远景背景图 ===
    @property({ type: SpriteFrame, tooltip: '远景-白天' })
    farNoon: SpriteFrame = null;
    
    @property({ type: SpriteFrame, tooltip: '远景-夜晚' })
    farNight: SpriteFrame = null;
    
    // === 近景背景图 ===
    @property({ type: SpriteFrame, tooltip: '近景-白天' })
    nearNoon: SpriteFrame = null;
    
    @property({ type: SpriteFrame, tooltip: '近景-夜晚' })
    nearNight: SpriteFrame = null;
    
    // === 节点引用 ===
    @property({ type: Node, tooltip: '远景节点' })
    backgroundFar: Node = null;
    
    @property({ type: Node, tooltip: '近景节点' })
    backgroundNear: Node = null;
    
    // === 时间配置 ===
    @property({ tooltip: '渐变开始时间（小时）' })
    transitionStartHour: number = 18;
    
    @property({ tooltip: '夜晚完成时间（小时）' })
    nightStartHour: number = 19;
    
    // 当前时间（小时）
    private currentHour: number = 12;
    
    // Sprite引用（白天层）
    private farSprite: Sprite = null;
    private nearSprite: Sprite = null;
    
    // 夜晚叠加层节点
    private farNightNode: Node = null;
    private nearNightNode: Node = null;
    private farNightSprite: Sprite = null;
    private nearNightSprite: Sprite = null;
    private farNightOpacity: UIOpacity = null;
    private nearNightOpacity: UIOpacity = null;
    
    // 是否已初始化夜晚层
    private nightLayersCreated: boolean = false;
    
    onLoad() {
        console.log('[DayNightSystem] 🌅 渐进式白天/夜晚切换系统初始化');
        
        // 获取白天层Sprite组件
        if (this.backgroundFar) {
            this.farSprite = this.backgroundFar.getComponent(Sprite);
        }
        if (this.backgroundNear) {
            this.nearSprite = this.backgroundNear.getComponent(Sprite);
        }
        
        // 创建夜晚叠加层
        this.createNightLayers();
    }
    
    start() {
        // 初始更新
        this.updateLighting(this.currentHour);
    }
    
    /**
     * 创建夜晚叠加层（放在白天层上方，通过透明度渐变实现过渡）
     */
    private createNightLayers() {
        if (this.nightLayersCreated) return;
        
        // 创建远景夜晚层
        if (this.backgroundFar && this.farNight) {
            this.farNightNode = this.createOverlayNode('FarNightOverlay', this.backgroundFar, this.farNight);
            this.farNightSprite = this.farNightNode.getComponent(Sprite);
            this.farNightOpacity = this.farNightNode.getComponent(UIOpacity);
            this.farNightOpacity.opacity = 0;
        }
        
        // 创建近景夜晚层
        if (this.backgroundNear && this.nearNight) {
            this.nearNightNode = this.createOverlayNode('NearNightOverlay', this.backgroundNear, this.nearNight);
            this.nearNightSprite = this.nearNightNode.getComponent(Sprite);
            this.nearNightOpacity = this.nearNightNode.getComponent(UIOpacity);
            this.nearNightOpacity.opacity = 0;
        }
        
        this.nightLayersCreated = true;
        console.log('[DayNightSystem] ✅ 夜晚叠加层已创建');
    }
    
    /**
     * 创建叠加节点
     */
    private createOverlayNode(name: string, baseNode: Node, spriteFrame: SpriteFrame): Node {
        const node = new Node(name);
        const parent = baseNode.parent;
        parent.addChild(node);
        
        // 设置在基础节点之后（层级更高）
        const baseIndex = baseNode.getSiblingIndex();
        node.setSiblingIndex(baseIndex + 1);
        
        // 复制位置和大小
        node.setPosition(baseNode.position.clone());
        
        // 添加UITransform
        const baseTransform = baseNode.getComponent(UITransform);
        const transform = node.addComponent(UITransform);
        if (baseTransform) {
            transform.setContentSize(baseTransform.contentSize);
            transform.setAnchorPoint(baseTransform.anchorPoint);
        }
        
        // 先添加UIOpacity并设为0（确保Sprite添加后不会显示）
        const opacity = node.addComponent(UIOpacity);
        opacity.opacity = 0;
        
        // 添加Sprite
        const sprite = node.addComponent(Sprite);
        sprite.spriteFrame = spriteFrame;
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.color = new Color(255, 255, 255, 255);
        
        console.log(`[DayNightSystem] 创建叠加层 ${name}, 初始透明度: ${opacity.opacity}`);
        
        return node;
    }
    
    /**
     * 🔄 更新光影效果（根据当前时间）
     * @param hour 当前时间（小时，支持小数）
     */
    public updateLighting(hour: number) {
        this.currentHour = hour;
        
        // 计算夜晚透明度（0-255）
        let nightOpacity = 0;
        
        if (hour < this.transitionStartHour) {
            // 白天：完全透明
            nightOpacity = 0;
        } else if (hour >= this.nightStartHour) {
            // 夜晚：完全不透明
            nightOpacity = 255;
        } else {
            // 渐变中：根据时间计算透明度
            const transitionDuration = this.nightStartHour - this.transitionStartHour;
            const progress = (hour - this.transitionStartHour) / transitionDuration;
            nightOpacity = Math.round(255 * progress);
        }
        
        // 更新远景夜晚层透明度
        if (this.farNightOpacity) {
            this.farNightOpacity.opacity = nightOpacity;
        }
        
        // 更新近景夜晚层透明度
        if (this.nearNightOpacity) {
            this.nearNightOpacity.opacity = nightOpacity;
        }
        
        // 每分钟输出一次日志（在渐变期间）
        if (hour >= this.transitionStartHour && hour <= this.nightStartHour) {
            console.log(`[DayNightSystem] 🌅 ${hour.toFixed(2)}:00 - 夜晚透明度: ${Math.round(nightOpacity / 255 * 100)}% (开始:${this.transitionStartHour}, 结束:${this.nightStartHour})`);
        }
    }
    
    /**
     * 获取当前时间
     */
    public getCurrentHour(): number {
        return this.currentHour;
    }
    
    /**
     * 获取夜晚进度（0-1）
     */
    public getNightProgress(): number {
        if (this.currentHour < this.transitionStartHour) return 0;
        if (this.currentHour >= this.nightStartHour) return 1;
        return (this.currentHour - this.transitionStartHour) / (this.nightStartHour - this.transitionStartHour);
    }
}
