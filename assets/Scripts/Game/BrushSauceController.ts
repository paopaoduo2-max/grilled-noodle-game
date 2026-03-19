import { _decorator, Component, Node, Vec2, UITransform, input, Input, EventMouse, EventKeyboard, EventTouch, KeyCode, view, Graphics, Color, Layers, director, Sprite, SpriteFrame, UIOpacity, ImageAsset, Texture2D, assetManager, game } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 面饼刷酱数据
 */
interface DoughBrushData {
    node: Node;
    uiTransform: UITransform;
    sauceLayer: Node;           // 酱料图片节点
    sauceSprite: Sprite;        // 酱料图片精灵
    sauceOpacity: UIOpacity;    // 酱料透明度控制
    progressBar: Node;
    progressFill: Graphics;
    totalDistance: number;
    brushedArea: number;        // 已刷面积（用于计算显示比例）
    isCompleted: boolean;
    lastPos: Vec2;
    positionIndex: number;      // 面饼位置索引：0=左, 1=中, 2=右
}

/**
 * 刷酱控制器
 * 支持同时对多个面饼刷酱，拿起刷子后自动进入刷酱模式
 */
@ccclass('BrushSauceController')
export class BrushSauceController extends Component {
    
    @property({
        type: Node,
        displayName: "刷子节点",
        tooltip: "跟随鼠标的刷子图片节点"
    })
    brushNode: Node = null;
    
    // 🔥 酱料图片UUID（与翻面图片加载方式一致）
    // food_dough_sauced_left, _center, _right
    private static saucedImageUUIDs: string[] = [
        '82cbdd0b-e8c3-4152-9b1d-47bc2500f3c2',  // left
        '710ed5ae-bac8-46e4-afb9-8f7118dd1c5c',  // center
        'c87fbea4-71d6-4db0-9d9c-07290381b7d8'   // right
    ];
    
    @property({
        displayName: "完成所需面积比例",
        tooltip: "刷过的面积达到此比例后完成（0-1）",
        min: 0.1,
        max: 1.0,
        step: 0.05
    })
    requiredAreaRatio: number = 0.6;
    
    @property({
        displayName: "笔刷半径",
        tooltip: "刷酱时的笔刷半径"
    })
    brushRadius: number = 20;
    
    @property({
        displayName: "刷子X偏移",
        tooltip: "刷子图标相对于酱料位置的X偏移（正值=向右）"
    })
    brushOffsetX: number = 0;
    
    @property({
        displayName: "刷子Y偏移",
        tooltip: "刷子图标相对于酱料位置的Y偏移（正值=向上）"
    })
    brushOffsetY: number = 50;
    
    // ===== 左边面饼（位置0）绘制区域 =====
    @property({ displayName: "面饼0-左上X", group: { name: "面饼0(左)" } })
    d0_topLeftX: number = -40;
    @property({ displayName: "面饼0-左上Y", group: { name: "面饼0(左)" } })
    d0_topLeftY: number = 40;
    @property({ displayName: "面饼0-右上X", group: { name: "面饼0(左)" } })
    d0_topRightX: number = 40;
    @property({ displayName: "面饼0-右上Y", group: { name: "面饼0(左)" } })
    d0_topRightY: number = 40;
    @property({ displayName: "面饼0-左下X", group: { name: "面饼0(左)" } })
    d0_bottomLeftX: number = -55;
    @property({ displayName: "面饼0-左下Y", group: { name: "面饼0(左)" } })
    d0_bottomLeftY: number = -45;
    @property({ displayName: "面饼0-右下X", group: { name: "面饼0(左)" } })
    d0_bottomRightX: number = 55;
    @property({ displayName: "面饼0-右下Y", group: { name: "面饼0(左)" } })
    d0_bottomRightY: number = -45;
    
    // ===== 中间面饼（位置1）绘制区域 =====
    @property({ displayName: "面饼1-左上X", group: { name: "面饼1(中)" } })
    d1_topLeftX: number = -40;
    @property({ displayName: "面饼1-左上Y", group: { name: "面饼1(中)" } })
    d1_topLeftY: number = 40;
    @property({ displayName: "面饼1-右上X", group: { name: "面饼1(中)" } })
    d1_topRightX: number = 40;
    @property({ displayName: "面饼1-右上Y", group: { name: "面饼1(中)" } })
    d1_topRightY: number = 40;
    @property({ displayName: "面饼1-左下X", group: { name: "面饼1(中)" } })
    d1_bottomLeftX: number = -55;
    @property({ displayName: "面饼1-左下Y", group: { name: "面饼1(中)" } })
    d1_bottomLeftY: number = -45;
    @property({ displayName: "面饼1-右下X", group: { name: "面饼1(中)" } })
    d1_bottomRightX: number = 55;
    @property({ displayName: "面饼1-右下Y", group: { name: "面饼1(中)" } })
    d1_bottomRightY: number = -45;
    
    // ===== 右边面饼（位置2）绘制区域 =====
    @property({ displayName: "面饼2-左上X", group: { name: "面饼2(右)" } })
    d2_topLeftX: number = -40;
    @property({ displayName: "面饼2-左上Y", group: { name: "面饼2(右)" } })
    d2_topLeftY: number = 40;
    @property({ displayName: "面饼2-右上X", group: { name: "面饼2(右)" } })
    d2_topRightX: number = 40;
    @property({ displayName: "面饼2-右上Y", group: { name: "面饼2(右)" } })
    d2_topRightY: number = 40;
    @property({ displayName: "面饼2-左下X", group: { name: "面饼2(右)" } })
    d2_bottomLeftX: number = -55;
    @property({ displayName: "面饼2-左下Y", group: { name: "面饼2(右)" } })
    d2_bottomLeftY: number = -45;
    @property({ displayName: "面饼2-右下X", group: { name: "面饼2(右)" } })
    d2_bottomRightX: number = 55;
    @property({ displayName: "面饼2-右下Y", group: { name: "面饼2(右)" } })
    d2_bottomRightY: number = -45;
    
    // 私有状态
    private _doughDataMap: Map<Node, DoughBrushData> = new Map();
    private _isActive: boolean = false;
    private _isBrushing: boolean = false;
    private _currentBrushingDough: DoughBrushData = null;
    private _onCompleteCallback: (doughNode: Node) => void = null;
    private _lastMousePos: Vec2 = new Vec2();  // 🔥 记录最后鼠标位置，用于实时调整
    private _doughPositionCounter: number = 0;  // 面饼位置计数器
    private _excludeNodes: string[] = ['SauceBtn'];  // 禁用UI时要排除的节点名称
    
    /**
     * 获取指定位置面饼的绘制区域角点
     */
    private getDrawAreaCorners(positionIndex: number): { tl: Vec2, tr: Vec2, bl: Vec2, br: Vec2 } {
        switch (positionIndex) {
            case 0:  // 左边面饼
                return {
                    tl: new Vec2(this.d0_topLeftX, this.d0_topLeftY),
                    tr: new Vec2(this.d0_topRightX, this.d0_topRightY),
                    bl: new Vec2(this.d0_bottomLeftX, this.d0_bottomLeftY),
                    br: new Vec2(this.d0_bottomRightX, this.d0_bottomRightY)
                };
            case 1:  // 中间面饼
                return {
                    tl: new Vec2(this.d1_topLeftX, this.d1_topLeftY),
                    tr: new Vec2(this.d1_topRightX, this.d1_topRightY),
                    bl: new Vec2(this.d1_bottomLeftX, this.d1_bottomLeftY),
                    br: new Vec2(this.d1_bottomRightX, this.d1_bottomRightY)
                };
            case 2:  // 右边面饼
            default:
                return {
                    tl: new Vec2(this.d2_topLeftX, this.d2_topLeftY),
                    tr: new Vec2(this.d2_topRightX, this.d2_topRightY),
                    bl: new Vec2(this.d2_bottomLeftX, this.d2_bottomLeftY),
                    br: new Vec2(this.d2_bottomRightX, this.d2_bottomRightY)
                };
        }
    }
    
    // 🔥 保存被禁用节点的原始 hitTest 方法
    private _disabledNodes: Map<Node, Function> = new Map();
    
    onLoad() {
        if (this.brushNode) {
            // 🔥 初始化时把刷子移到屏幕外并隐藏
            this.brushNode.setPosition(-9999, -9999, 0);
            this.brushNode.active = false;
        }
        
        // 🔥 监听按键，按 P 键打印角点配置
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }
    
    onDestroy() {
        if (input?.off) {
            input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        }
        // 🔥 确保恢复所有被禁用的节点
        this.enableAllUIElements();
        // 🔥 移除原生事件监听
        this.removeNativeMouseListener();
    }
    
    // 🔥 原生鼠标事件监听器引用
    private _nativeMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
    
    /**
     * 🔥 设置原生 canvas 鼠标监听（绕过 Cocos UI 事件系统）
     */
    private setupNativeMouseListener() {
        const canvas = game.canvas;
        if (!canvas) return;
        
        // 如果已经有监听器，先移除
        this.removeNativeMouseListener();
        
        this._nativeMouseMoveHandler = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            
            const nativeX = (e.clientX - rect.left) * scaleX;
            const nativeY = (e.clientY - rect.top) * scaleY;
            
            const designSize = view.getDesignResolutionSize();
            const uiX = nativeX * designSize.width / canvas.width;
            const uiY = designSize.height - (nativeY * designSize.height / canvas.height);
            
            // 更新鼠标位置并更新刷子
            this._lastMousePos.set(uiX, uiY);
            this.updateBrushPosition(this._lastMousePos);
        };
        
        canvas.addEventListener('mousemove', this._nativeMouseMoveHandler);
        console.log('[BrushSauceController] 🔥 已设置原生 canvas 鼠标监听');
    }
    
    /**
     * 🔥 移除原生 canvas 鼠标监听
     */
    private removeNativeMouseListener() {
        if (this._nativeMouseMoveHandler && game.canvas) {
            game.canvas.removeEventListener('mousemove', this._nativeMouseMoveHandler);
            this._nativeMouseMoveHandler = null;
        }
    }
    
    /**
     * 🔥 禁用 UI 元素的触摸检测（防止它们拦截刷子的鼠标事件）
     * 公开方法，可由 CookingControllerV2 调用
     * @param excludeNodes 要排除的节点名称数组（这些节点不会被禁用）
     * @param additionalNodes 额外要禁用的节点名称数组
     */
    public disableUIElements(excludeNodes: string[] = ['SauceBtn'], additionalNodes: string[] = []) {
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return;
        
        // 保存排除列表
        this._excludeNodes = excludeNodes;
        
        // 需要禁用的节点名称（禁用所有可能阻挡的UI）
        const nodeNames = [
            'TrashBin',          // 垃圾桶
            'PackingBox1', 'PackingBox2', 'PackingBox3',  // 打包盒容器
            'ServeButton',       // 🔥 打包盒按钮（真正的打包盒）
            'CustomerOrderArea', // 顾客订单区域
            'EndDayBtn',         // 结束按钮
            'PhoneButton',       // 电话按钮
            'StartDayButton',    // 开始按钮
            'IngredientsPanel',  // 🔥 食材按钮面板
            'WaterBtn',          // 🔥 水壶按钮
            'OilBtn',            // 🔥 油壶按钮
            'SpatulaBtn',        // 🔥 铲子按钮
            'SauceBtn',          // 🔥 酱料按钮
            'Brush',             // 🔥 刷子节点
            ...additionalNodes   // 🔥 额外要禁用的节点
        ];
        
        for (const name of nodeNames) {
            // 🔥 使用 children 遍历查找，确保能找到非活跃节点
            const node = this.findNodeByName(canvas, name);
            if (node) {
                this.disableNodeAndAllChildren(node);
            }
        }
        
        console.log(`[BrushSauceController] 🔒 禁用了 ${this._disabledNodes.size} 个 UI 元素的触摸检测，排除: ${excludeNodes.join(', ')}`);
    }
    
    /**
     * 🔥 递归查找节点（包括非活跃节点）
     */
    private findNodeByName(parent: Node, name: string): Node | null {
        for (const child of parent.children) {
            if (child.name === name) {
                return child;
            }
        }
        return null;
    }
    
    /**
     * 🔥 递归禁用节点及其所有子孙节点的 hitTest
     */
    private disableNodeHitTest(parent: Node, name: string) {
        const node = parent.getChildByName(name);
        if (!node) return;
        
        this.disableNodeAndAllChildren(node);
    }
    
    /**
     * 🔥 递归禁用节点及其所有子孙节点（排除指定节点）
     */
    private disableNodeAndAllChildren(node: Node) {
        // 🔥 排除指定节点，让用户可以点击放下工具
        if (this._excludeNodes.indexOf(node.name) >= 0) {
            return;
        }
        
        const transform = node.getComponent(UITransform);
        if (transform && !this._disabledNodes.has(node)) {
            this._disabledNodes.set(node, transform.hitTest.bind(transform));
            transform.hitTest = () => false;
        }
        
        // 递归禁用所有子孙节点
        for (const child of node.children) {
            this.disableNodeAndAllChildren(child);
        }
    }
    
    /**
     * 🔥 恢复所有 UI 元素的触摸检测
     * 公开方法，可由 CookingControllerV2 调用
     */
    public enableAllUIElements() {
        for (const [node, originalHitTest] of this._disabledNodes) {
            if (node && node.isValid) {
                const transform = node.getComponent(UITransform);
                if (transform) {
                    transform.hitTest = originalHitTest as any;
                }
            }
        }
        
        const count = this._disabledNodes.size;
        this._disabledNodes.clear();
        
        if (count > 0) {
            console.log(`[BrushSauceController] 🔓 恢复了 ${count} 个 UI 元素的触摸检测`);
        }
    }
    
    /**
     * 按键事件：按 P 键打印角点配置
     */
    private onKeyDown(event: EventKeyboard) {
        if (event.keyCode === KeyCode.KEY_P) {
            this.printCornerValues();
        }
    }
    
    /**
     * 每帧更新
     */
    update(dt: number) {
        // 如果刷子激活，持续更新位置
        if (this._isActive && this.brushNode && this.brushNode.active) {
            this.updateBrushPosition(this._lastMousePos);
        }
    }
    
    /**
     * 🔥 打印当前所有角点配置到控制台（方便复制）
     * 在控制台调用：cc.find('Canvas/BrushSauceSystem').getComponent('BrushSauceController').printCornerValues()
     */
    public printCornerValues() {
        console.log('========== 绘制区域角点配置 ==========');
        console.log('// 面饼0(左)');
        console.log(`d0_topLeftX: ${this.d0_topLeftX}, d0_topLeftY: ${this.d0_topLeftY}`);
        console.log(`d0_topRightX: ${this.d0_topRightX}, d0_topRightY: ${this.d0_topRightY}`);
        console.log(`d0_bottomLeftX: ${this.d0_bottomLeftX}, d0_bottomLeftY: ${this.d0_bottomLeftY}`);
        console.log(`d0_bottomRightX: ${this.d0_bottomRightX}, d0_bottomRightY: ${this.d0_bottomRightY}`);
        console.log('');
        console.log('// 面饼1(中)');
        console.log(`d1_topLeftX: ${this.d1_topLeftX}, d1_topLeftY: ${this.d1_topLeftY}`);
        console.log(`d1_topRightX: ${this.d1_topRightX}, d1_topRightY: ${this.d1_topRightY}`);
        console.log(`d1_bottomLeftX: ${this.d1_bottomLeftX}, d1_bottomLeftY: ${this.d1_bottomLeftY}`);
        console.log(`d1_bottomRightX: ${this.d1_bottomRightX}, d1_bottomRightY: ${this.d1_bottomRightY}`);
        console.log('');
        console.log('// 面饼2(右)');
        console.log(`d2_topLeftX: ${this.d2_topLeftX}, d2_topLeftY: ${this.d2_topLeftY}`);
        console.log(`d2_topRightX: ${this.d2_topRightX}, d2_topRightY: ${this.d2_topRightY}`);
        console.log(`d2_bottomLeftX: ${this.d2_bottomLeftX}, d2_bottomLeftY: ${this.d2_bottomLeftY}`);
        console.log(`d2_bottomRightX: ${this.d2_bottomRightX}, d2_bottomRightY: ${this.d2_bottomRightY}`);
        console.log('==========================================');
    }
    
    
    /**
     * 开始刷酱模式（对多个面饼）
     * @param doughNodes 需要刷酱的面饼节点数组
     * @param onComplete 单个面饼完成时的回调
     */
    public startBrushingMode(doughNodes: Node[], onComplete?: (doughNode: Node) => void) {
        if (!doughNodes || doughNodes.length === 0) {
            console.warn('[BrushSauceController] 没有需要刷酱的面饼');
            return;
        }
        
        // 🔥 如果已经在刷酱模式，先移除旧的事件监听
        if (this._isActive) {
            input?.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
            input?.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
            input?.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        }
        
        this._onCompleteCallback = onComplete;
        this._isActive = true;
        this._doughPositionCounter = 0;  // 🔥 重置位置计数器
        
        // 为每个面饼创建酱料层和进度条
        for (const doughNode of doughNodes) {
            if (!doughNode || this._doughDataMap.has(doughNode)) continue;
            
            const data = this.createDoughBrushData(doughNode);
            if (data) {
                this._doughDataMap.set(doughNode, data);
            }
        }
        
        // 显示刷子
        this.showBrush();
        
        // 🔥 禁用其他 UI 元素的触摸检测，防止拦截刷子
        this.disableUIElements();
        
        // 注册鼠标事件（确保只注册一次）
        input.on(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        
        // 🔥 使用原生 canvas 事件监听，绕过 UI 元素的拦截
        this.setupNativeMouseListener();
        
        // 打印所有面饼信息
        let idx = 0;
        for (const [node, data] of this._doughDataMap) {
            console.log(`[BrushSauceController] 面饼${idx}: ${node.name}, 位置=(${node.position.x.toFixed(0)}, ${node.position.y.toFixed(0)})`);
            idx++;
        }
        console.log(`[BrushSauceController] 🖌️ 开始刷酱模式，${this._doughDataMap.size} 个面饼`);
    }
    
    /**
     * 添加单个面饼到刷酱模式
     */
    public addDoughToBrushMode(doughNode: Node) {
        if (!doughNode || this._doughDataMap.has(doughNode)) return;
        
        const data = this.createDoughBrushData(doughNode);
        if (data) {
            this._doughDataMap.set(doughNode, data);
            console.log(`[BrushSauceController] 添加面饼 ${doughNode.name} 到刷酱模式`);
        }
    }
    
    /**
     * 创建面饼刷酱数据
     * 🔥 完全仿照翻面图片的方式，在 bgNode 上叠加酱料图片
     */
    private createDoughBrushData(doughNode: Node): DoughBrushData {
        const uiTransform = doughNode.getComponent(UITransform);
        if (!uiTransform) return null;
        
        // 🔥 从节点名称提取位置索引（DoughBg_0, DoughBg_1, DoughBg_2）
        let positionIndex = 0;
        const nodeName = doughNode.name;
        const match = nodeName.match(/DoughBg_(\d+)/);
        if (match) {
            positionIndex = parseInt(match[1], 10) % 3;
        }
        console.log(`[BrushSauceController] 从节点名 ${nodeName} 提取位置索引: ${positionIndex}`);
        
        // 🔥 doughNode 就是 bgNode（DoughBg_X）
        // 注意：startBrushingMode 传入的是 food.node.parent，即 bgNode
        const bgSprite = doughNode.getComponent(Sprite);
        console.log(`[BrushSauceController] createDoughBrushData: doughNode=${doughNode.name}, bgSprite=${bgSprite ? 'exists' : 'null'}`);
        
        // 🔥 创建酱料图片节点，叠加在翻面图片上，通过透明度渐变显示
        const sauceLayer = new Node('_SauceLayer');
        sauceLayer.layer = doughNode.layer || Layers.Enum.UI_2D;
        sauceLayer.parent = doughNode;
        sauceLayer.setPosition(0, 0, 0);
        
        // 添加 UITransform（复制 doughNode 的设置）
        const bgTransform = doughNode.getComponent(UITransform);
        const sauceTrans = sauceLayer.addComponent(UITransform);
        if (bgTransform) {
            sauceTrans.setContentSize(bgTransform.contentSize.width, bgTransform.contentSize.height);
            sauceTrans.setAnchorPoint(bgTransform.anchorPoint.x, bgTransform.anchorPoint.y);
        }
        
        // 添加 Sprite
        const sauceSprite = sauceLayer.addComponent(Sprite);
        if (bgSprite) {
            sauceSprite.type = bgSprite.type;
            sauceSprite.sizeMode = bgSprite.sizeMode;
            sauceSprite.trim = bgSprite.trim;
        }
        
        // 🔥 使用和翻面图片完全相同的方式加载酱料图片
        const imageUUID = BrushSauceController.saucedImageUUIDs[positionIndex];
        if (imageUUID) {
            assetManager.loadAny({uuid: imageUUID}, (err: Error | null, imageAsset: ImageAsset) => {
                if (!err && imageAsset && sauceSprite.isValid) {
                    const spriteFrame = new SpriteFrame();
                    const texture = new Texture2D();
                    texture.image = imageAsset;
                    spriteFrame.texture = texture;
                    sauceSprite.spriteFrame = spriteFrame;
                    sauceSprite.color = Color.WHITE;
                    console.log(`[BrushSauceController] 🎨 酱料图片加载完成: 位置${positionIndex}`);
                }
            });
        }
        
        // 🔥 初始完全透明，刷的时候逐渐增加透明度
        const uiOpacity = sauceLayer.addComponent(UIOpacity);
        uiOpacity.opacity = 0;
        
        // 创建进度条（放在 doughNode 的父节点下）
        const progressBar = new Node('_ProgressBar');
        progressBar.layer = Layers.Enum.UI_2D;
        progressBar.parent = doughNode.parent || doughNode;
        
        const doughPos = doughNode.position;
        progressBar.setPosition(doughPos.x, doughPos.y + 100, 0);
        
        const barTrans = progressBar.addComponent(UITransform);
        barTrans.setContentSize(80, 8);
        barTrans.setAnchorPoint(0.5, 0.5);
        
        // 进度条背景
        const bgGraphics = progressBar.addComponent(Graphics);
        bgGraphics.fillColor = new Color(50, 50, 50, 180);
        bgGraphics.roundRect(-40, -4, 80, 8, 4);
        bgGraphics.fill();
        
        // 进度条填充
        const fillNode = new Node('_Fill');
        fillNode.layer = Layers.Enum.UI_2D;
        fillNode.parent = progressBar;
        fillNode.setPosition(0, 0, 0);
        
        const fillTrans = fillNode.addComponent(UITransform);
        fillTrans.setContentSize(80, 8);
        fillTrans.setAnchorPoint(0.5, 0.5);
        
        const progressFill = fillNode.addComponent(Graphics);
        
        // 计算绘制区域总面积（用于计算完成比例）
        const corners = this.getDrawAreaCorners(positionIndex);
        const areaWidth = Math.max(corners.tr.x, corners.br.x) - Math.min(corners.tl.x, corners.bl.x);
        const areaHeight = Math.max(corners.tl.y, corners.tr.y) - Math.min(corners.bl.y, corners.br.y);
        const totalArea = areaWidth * areaHeight;
        
        return {
            node: doughNode,
            uiTransform,
            sauceLayer,
            sauceSprite,
            sauceOpacity: uiOpacity,
            progressBar,
            progressFill,
            totalDistance: 0,
            brushedArea: 0,
            isCompleted: false,
            lastPos: new Vec2(),
            positionIndex
        };
    }
    
    /**
     * 更新进度条（基于透明度）
     */
    private updateProgressBar(data: DoughBrushData) {
        if (!data.progressFill || !data.progressFill.isValid) return;
        
        // 🔥 基于透明度计算进度
        const currentOpacity = data.sauceOpacity ? data.sauceOpacity.opacity : 0;
        const progress = Math.min(1, currentOpacity / 255);
        
        data.progressFill.clear();
        
        if (progress > 0) {
            const width = 76 * progress;
            const r = Math.floor(255 * (1 - progress) + 100 * progress);
            const g = Math.floor(100 * (1 - progress) + 200 * progress);
            const b = 100;
            data.progressFill.fillColor = new Color(r, g, b, 220);
            data.progressFill.roundRect(-38, -3, width, 6, 3);
            data.progressFill.fill();
        }
    }
    
    /**
     * 🔥 增加酱料透明度（刷一下增加一点）
     */
    private addSauceOpacity(data: DoughBrushData, amount: number) {
        if (!data.sauceOpacity) return;
        
        // 增加透明度
        const newOpacity = Math.min(255, data.sauceOpacity.opacity + amount);
        data.sauceOpacity.opacity = newOpacity;
        
        this.updateProgressBar(data);
    }
    
    /**
     * 绘制酱料点
     * 🔥 只在边界内有效，增加透明度
     */
    private drawMaskSpot(data: DoughBrushData, localX: number, localY: number) {
        // 🔥 检查点是否在边界内
        if (!this.isLocalPosInsideDrawAreaRaw(localX, localY, data.positionIndex)) {
            return;
        }
        
        // 增加透明度
        this.addSauceOpacity(data, 8);
    }
    
    /**
     * 绘制酱料线条
     * 🔥 根据移动距离增加透明度
     */
    private drawMaskLine(data: DoughBrushData, fromX: number, fromY: number, toX: number, toY: number) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 检查终点是否在边界内
        if (!this.isLocalPosInsideDrawAreaRaw(toX, toY, data.positionIndex)) {
            return;
        }
        
        // 根据距离增加透明度（距离越长增加越多，加快三分之一：0.3 * 4/3 = 0.4）
        const opacityIncrease = Math.min(20, distance * 0.4);
        this.addSauceOpacity(data, opacityIncrease);
    }
    
    /**
     * 鼠标移动事件
     */
    private onMouseMove(event: EventMouse) {
        if (!this._isActive) return;
        
        const uiPos = event.getUILocation();
        this._lastMousePos.set(uiPos.x, uiPos.y);  // 🔥 记录鼠标位置
        this.updateBrushPosition(uiPos);
        
        // 如果正在刷酱（鼠标按下状态）
        if (this._isBrushing) {
            // 🔥 查找当前鼠标所在的面饼，允许自由切换
            let targetData: DoughBrushData = null;
            for (const [node, data] of this._doughDataMap) {
                if (data.isCompleted) continue;
                if (this.isInsideDough(uiPos, data)) {
                    targetData = data;
                    break;
                }
            }
            
            // 如果切换到新面饼，更新起始位置
            if (targetData && targetData !== this._currentBrushingDough) {
                this._currentBrushingDough = targetData;
                const localPos = this.getLocalPos(uiPos, targetData);
                targetData.lastPos.set(localPos.x, localPos.y);
                // 🔥 只有在绘制区域内才绘制起始点
                if (this.isInsideDoughForDrawing(uiPos, targetData)) {
                    this.drawMaskSpot(targetData, localPos.x, localPos.y);
                }
            }
            
            // 在当前面饼上绘制
            if (this._currentBrushingDough && !this._currentBrushingDough.isCompleted) {
                const data = this._currentBrushingDough;
                const localPos = this.getLocalPos(uiPos, data);
                
                // 🔥 检查当前点是否在绘制区域内
                const isCurrentInside = this.isInsideDoughForDrawing(uiPos, data);
                
                // 🔥 关键：只有当前点在区域内才处理
                if (isCurrentInside) {
                    // 检查上一个点是否在绘制区域内
                    const isLastInside = this.isLocalPosInsideDrawArea(data.lastPos.x, data.lastPos.y, data.positionIndex);
                    
                    if (isLastInside) {
                        // 两点都在区域内，正常绘制
                        const dx = localPos.x - data.lastPos.x;
                        const dy = localPos.y - data.lastPos.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance > 2 && distance < 50) {
                            this.drawMaskLine(data, data.lastPos.x, data.lastPos.y, localPos.x, localPos.y);
                            data.totalDistance += distance;
                        }
                    } else {
                        // 上一个点在区域外，当前点在区域内 = 刚进入区域
                        // 绘制一个起始点
                        this.drawMaskSpot(data, localPos.x, localPos.y);
                    }
                    
                    // 🔥 只有在区域内才更新 lastPos
                    data.lastPos.set(localPos.x, localPos.y);
                    
                    // 🔥 检查是否完成（基于透明度）
                    if (data.sauceOpacity && data.sauceOpacity.opacity >= 255) {
                        this.completeDoughBrushing(data);
                    }
                }
                // 🔥 当前点在区域外时，不更新 lastPos，不绘制任何内容
                // 这样返回区域内时，会从新位置开始（因为 lastPos 还在区域外）
            }
        }
    }
    
    /**
     * 检查本地坐标是否在绘制区域内（收缩笔刷半径）
     * 🔥 用于绘制时的精确边界检测
     */
    private isLocalPosInsideDrawAreaRaw(localX: number, localY: number, positionIndex: number): boolean {
        const corners = this.getDrawAreaCorners(positionIndex);
        // 🔥 向内收缩笔刷半径，确保圆形不会超出边界
        const shrink = this.brushRadius;
        const shrunkCorners = {
            tl: new Vec2(corners.tl.x + shrink, corners.tl.y - shrink),
            tr: new Vec2(corners.tr.x - shrink, corners.tr.y - shrink),
            bl: new Vec2(corners.bl.x + shrink, corners.bl.y + shrink),
            br: new Vec2(corners.br.x - shrink, corners.br.y + shrink)
        };
        return this.isPointInQuad(localX, localY, shrunkCorners.tl, shrunkCorners.tr, shrunkCorners.br, shrunkCorners.bl);
    }
    
    /**
     * 检查本地坐标是否在绘制区域内（用于鼠标移动检测）
     */
    private isLocalPosInsideDrawArea(localX: number, localY: number, positionIndex: number): boolean {
        const corners = this.getDrawAreaCorners(positionIndex);
        return this.isPointInQuad(localX, localY, corners.tl, corners.tr, corners.br, corners.bl);
    }
    
    /**
     * 鼠标按下事件
     */
    private onMouseDown(event: EventMouse) {
        if (!this._isActive) return;
        
        const uiPos = event.getUILocation();
        const canvasLocal = this.uiToCanvasLocal(uiPos);
        
        console.log(`[BrushSauceController] 🖱️ 鼠标按下: UI坐标=(${uiPos.x.toFixed(0)}, ${uiPos.y.toFixed(0)}), Canvas本地坐标=(${canvasLocal.x.toFixed(0)}, ${canvasLocal.y.toFixed(0)})`);
        
        // 查找点击的是哪个面饼
        for (const [node, data] of this._doughDataMap) {
            if (data.isCompleted) continue;
            
            const doughPos = data.node.position;
            const doughWorldPos = data.node.worldPosition;
            const parentName = data.node.parent?.name || 'null';
            const doughSize = data.uiTransform.contentSize;
            console.log(`[BrushSauceController] 检查面饼 ${node.name}: 位置=(${doughPos.x.toFixed(0)}, ${doughPos.y.toFixed(0)}), 世界坐标=(${doughWorldPos.x.toFixed(0)}, ${doughWorldPos.y.toFixed(0)}), 父节点=${parentName}, 大小=${doughSize.width}x${doughSize.height}`);
            
            if (this.isInsideDough(uiPos, data)) {
                this._isBrushing = true;
                this._currentBrushingDough = data;
                
                const localPos = this.getLocalPos(uiPos, data);
                data.lastPos.set(localPos.x, localPos.y);
                // 🔥 只有在绘制区域内才绘制起始点
                if (this.isInsideDoughForDrawing(uiPos, data)) {
                    this.drawMaskSpot(data, localPos.x, localPos.y);
                }
                console.log(`[BrushSauceController] ✅ 命中面饼 ${node.name}，开始刷酱，本地坐标=(${localPos.x.toFixed(0)}, ${localPos.y.toFixed(0)})`);
                break;
            }
        }
        
        if (!this._isBrushing) {
            console.log(`[BrushSauceController] ❌ 未命中任何面饼`);
        }
    }
    
    /**
     * 鼠标抬起事件
     */
    private onMouseUp(event: EventMouse) {
        this._isBrushing = false;
        this._currentBrushingDough = null;
    }
    
    /**
     * 更新刷子位置
     * 🔥 刷子底部对准鼠标位置（酱料生成位置）
     */
    private updateBrushPosition(uiPos: Vec2) {
        if (!this.brushNode) return;
        
        const parent = this.brushNode.parent;
        if (!parent) return;
        
        const parentUITransform = parent.getComponent(UITransform);
        if (!parentUITransform) return;
        
        const designSize = view.getDesignResolutionSize();
        const canvasSize = parentUITransform.contentSize;
        const scaleToCanvas = canvasSize.width / designSize.width;
        const localX = uiPos.x * scaleToCanvas - canvasSize.width / 2;
        const localY = uiPos.y * scaleToCanvas - canvasSize.height / 2;
        
        // 🔥 刷子偏移，让刷子底部对准酱料生成位置
        this.brushNode.setPosition(localX + this.brushOffsetX, localY + this.brushOffsetY, 0);
    }
    
    /**
     * UI坐标转换为Canvas本地坐标
     */
    private uiToCanvasLocal(uiPos: Vec2): Vec2 {
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) return new Vec2();
        
        const canvasTransform = canvas.getComponent(UITransform);
        if (!canvasTransform) return new Vec2();
        
        const designSize = view.getDesignResolutionSize();
        const canvasSize = canvasTransform.contentSize;
        const scaleToCanvas = canvasSize.width / designSize.width;
        const localX = uiPos.x * scaleToCanvas - canvasSize.width / 2;
        const localY = uiPos.y * scaleToCanvas - canvasSize.height / 2;
        
        return new Vec2(localX, localY);
    }
    
    /**
     * 检查触摸点是否在面饼范围内（扩大范围以便点击）
     */
    private isInsideDough(touchPos: Vec2, data: DoughBrushData): boolean {
        return this.checkInsideDoughRect(touchPos, data, 1.0);  // 使用实际大小
    }
    
    /**
     * 检查触摸点是否在面饼绘制范围内
     * 🔥 使用四边形（透视梯形）检测
     */
    private isInsideDoughForDrawing(touchPos: Vec2, data: DoughBrushData): boolean {
        const canvasLocal = this.uiToCanvasLocal(touchPos);
        const doughWorldPos = data.node.worldPosition;
        
        // 计算相对于面饼中心的本地坐标
        const localX = canvasLocal.x - doughWorldPos.x;
        const localY = canvasLocal.y - doughWorldPos.y;
        
        // 获取该面饼的角点配置
        const corners = this.getDrawAreaCorners(data.positionIndex);
        
        const result = this.isPointInQuad(localX, localY, corners.tl, corners.tr, corners.br, corners.bl);
        
        return result;
    }
    
    /**
     * 检测点是否在四边形内（射线法）
     */
    private isPointInQuad(px: number, py: number, p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
        const points = [p1, p2, p3, p4];
        let inside = false;
        
        for (let i = 0, j = 3; i < 4; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            
            if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        
        return inside;
    }
    
    /**
     * 检查触摸点是否在面饼矩形范围内
     */
    private checkInsideDoughRect(touchPos: Vec2, data: DoughBrushData, scale: number): boolean {
        const canvasLocal = this.uiToCanvasLocal(touchPos);
        
        const doughWorldPos = data.node.worldPosition;
        const doughSize = data.uiTransform.contentSize;
        
        const halfWidth = (doughSize.width / 2) * scale;
        const halfHeight = (doughSize.height / 2) * scale;
        
        const dx = Math.abs(canvasLocal.x - doughWorldPos.x);
        const dy = Math.abs(canvasLocal.y - doughWorldPos.y);
        
        return dx <= halfWidth && dy <= halfHeight;
    }
    
    /**
     * 获取相对于面饼的本地坐标（用于绘制酱料）
     * 🔥 修复：使用世界坐标
     */
    private getLocalPos(touchPos: Vec2, data: DoughBrushData): Vec2 {
        const canvasLocal = this.uiToCanvasLocal(touchPos);
        
        // 🔥 使用世界坐标
        const doughWorldPos = data.node.worldPosition;
        
        return new Vec2(
            canvasLocal.x - doughWorldPos.x,
            canvasLocal.y - doughWorldPos.y
        );
    }
    
    /**
     * 完成单个面饼的刷酱
     */
    private completeDoughBrushing(data: DoughBrushData) {
        if (data.isCompleted) return;
        
        data.isCompleted = true;
        console.log(`[BrushSauceController] ✅ 面饼 ${data.node.name} 刷酱完成！`);
        
        // 🔥 确保透明度为 255（完全显示酱料图片）
        if (data.sauceOpacity) {
            data.sauceOpacity.opacity = 255;
        }
        
        // 🔥 隐藏原来的背景图片（翻面状态的图片），避免与酱料图片重叠
        const bgSprite = data.node.getComponent(Sprite);
        if (bgSprite) {
            bgSprite.enabled = false;
            console.log(`[BrushSauceController] 🔥 隐藏原背景图片，避免重叠`);
        }
        
        // 销毁进度条
        if (data.progressBar && data.progressBar.isValid) {
            data.progressBar.destroy();
        }
        
        // 执行回调
        if (this._onCompleteCallback) {
            this._onCompleteCallback(data.node);
        }
        
        // 发送完成事件
        this.node.emit('sauce-complete', data.node);
        
        // 检查是否所有面饼都完成了
        this.checkAllCompleted();
    }
    
    /**
     * 检查是否所有面饼都完成刷酱
     */
    private checkAllCompleted() {
        for (const [node, data] of this._doughDataMap) {
            if (!data.isCompleted) return;
        }
        
        console.log('[BrushSauceController] 🎉 所有面饼刷酱完成！');
        this.stopBrushing();
        this.node.emit('all-sauce-complete');
    }
    
    /**
     * 停止刷酱模式
     */
    public stopBrushing() {
        this._isActive = false;
        this._isBrushing = false;
        this._currentBrushingDough = null;
        
        input?.off(Input.EventType.MOUSE_MOVE, this.onMouseMove, this);
        input?.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
        input?.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
        
        // 隐藏刷子
        this.hideBrush();
        
        // 🔥 移除原生鼠标监听
        this.removeNativeMouseListener();
        
        // 🔥 恢复其他 UI 元素的触摸检测
        this.enableAllUIElements();
        
        console.log('[BrushSauceController] 停止刷酱模式');
    }
    
    /**
     * 显示刷子
     */
    public showBrush() {
        if (this.brushNode) {
            // 🔥 如果鼠标位置是 (0,0)（未初始化），先把刷子放到屏幕外
            if (this._lastMousePos.x === 0 && this._lastMousePos.y === 0) {
                this.brushNode.setPosition(-9999, -9999, 0);
            } else {
                this.updateBrushPosition(this._lastMousePos);
            }
            this.brushNode.active = true;
        }
    }
    
    /**
     * 隐藏刷子
     */
    public hideBrush() {
        if (this.brushNode) {
            this.brushNode.active = false;
        }
    }
    
    /**
     * 🔥 设置初始鼠标位置（避免刷子出现在左下角）
     * @param pos Canvas 本地坐标（已经过转换）
     */
    public setInitialMousePosition(pos: Vec2) {
        // 🔥 将 Canvas 本地坐标转换回 UI 坐标
        // Canvas 本地坐标 = uiPos * scaleToCanvas - canvasSize / 2
        // 所以 uiPos = (canvasLocal + canvasSize / 2) / scaleToCanvas
        const canvas = director.getScene()?.getChildByName('Canvas');
        if (!canvas) {
            this._lastMousePos.set(pos.x, pos.y);
            return;
        }
        
        const canvasTransform = canvas.getComponent(UITransform);
        if (!canvasTransform) {
            this._lastMousePos.set(pos.x, pos.y);
            return;
        }
        
        const designSize = view.getDesignResolutionSize();
        const canvasSize = canvasTransform.contentSize;
        const scaleToCanvas = canvasSize.width / designSize.width;
        
        // 反向转换：Canvas 本地坐标 -> UI 坐标
        const uiX = (pos.x + canvasSize.width / 2) / scaleToCanvas;
        const uiY = (pos.y + canvasSize.height / 2) / scaleToCanvas;
        
        this._lastMousePos.set(uiX, uiY);
        console.log(`[BrushSauceController] 设置初始鼠标位置: Canvas(${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}) -> UI(${uiX.toFixed(0)}, ${uiY.toFixed(0)})`);
    }
    
    /**
     * 重置刷酱状态
     */
    public reset() {
        this._isBrushing = false;
        this._currentBrushingDough = null;
        
        // 清理所有面饼数据
        for (const [node, data] of this._doughDataMap) {
            // 🔥 只销毁未完成刷酱的 sauceLayer（透明度 < 255）
            // 已完成的保留，让酱料图片继续显示
            if (data.sauceLayer && data.sauceLayer.isValid) {
                const opacity = data.sauceOpacity ? data.sauceOpacity.opacity : 0;
                if (opacity < 255) {
                    // 未完成，销毁
                    data.sauceLayer.destroy();
                }
                // 已完成的不销毁，保留酱料图片
            }
            // 进度条始终销毁
            if (data.progressBar && data.progressBar.isValid) {
                data.progressBar.destroy();
            }
        }
        this._doughDataMap.clear();
        
        // 停止刷酱模式
        if (this._isActive) {
            this.stopBrushing();
        }
    }
    
    /**
     * 检查面饼是否已完成刷酱
     */
    public isDoughCompleted(doughNode: Node): boolean {
        const data = this._doughDataMap.get(doughNode);
        return data ? data.isCompleted : false;
    }
    
    /**
     * 获取是否正在刷酱模式
     */
    public get isActive(): boolean {
        return this._isActive;
    }
    
    /**
     * 获取未完成刷酱的面饼数量
     */
    public get pendingCount(): number {
        let count = 0;
        for (const [node, data] of this._doughDataMap) {
            if (!data.isCompleted) count++;
        }
        return count;
    }
    
    /**
     * 🌯 快速刷酱模式（用于卷好的面饼，只需刷一下就完成）
     * @param doughNode 面饼节点
     * @param onComplete 完成回调
     */
    public startQuickBrushingMode(doughNode: Node, onComplete?: () => void) {
        if (!doughNode) {
            onComplete?.();
            return;
        }
        
        // 显示刷子
        this.showBrush();
        
        // 创建进度条（简化版，不创建酱料层，由 applyRollSauce 处理）
        const progressBar = new Node('_QuickProgressBar');
        progressBar.layer = Layers.Enum.UI_2D;
        progressBar.parent = doughNode.parent || doughNode;
        
        const doughPos = doughNode.position;
        progressBar.setPosition(doughPos.x, doughPos.y + 100, 0);
        
        const barTrans = progressBar.addComponent(UITransform);
        barTrans.setContentSize(80, 8);
        barTrans.setAnchorPoint(0.5, 0.5);
        
        // 进度条背景
        const bgGraphics = progressBar.addComponent(Graphics);
        bgGraphics.fillColor = new Color(50, 50, 50, 180);
        bgGraphics.roundRect(-40, -4, 80, 8, 4);
        bgGraphics.fill();
        
        // 进度条填充
        const fillNode = new Node('_Fill');
        fillNode.layer = Layers.Enum.UI_2D;
        fillNode.parent = progressBar;
        fillNode.setPosition(0, 0, 0);
        
        const fillTrans = fillNode.addComponent(UITransform);
        fillTrans.setContentSize(76, 4);
        fillTrans.setAnchorPoint(0.5, 0.5);
        
        const fillGraphics = fillNode.addComponent(Graphics);
        fillGraphics.fillColor = new Color(255, 180, 0, 255);
        
        // 初始进度为0
        let progress = 0;
        
        // 🔥 快速刷酱：鼠标移动就增加进度
        const onMouseMove = (event: EventMouse) => {
            // 每次移动增加20%进度（5次就满）
            progress += 0.2;
            if (progress > 1) progress = 1;
            
            // 更新进度条
            fillGraphics.clear();
            const fillWidth = 76 * progress;
            fillGraphics.fillColor = new Color(255, 180, 0, 255);
            fillGraphics.roundRect(-38, -2, fillWidth, 4, 2);
            fillGraphics.fill();
            
            // 完成
            if (progress >= 1) {
                input?.off(Input.EventType.MOUSE_MOVE, onMouseMove, this);
                
                // 清理进度条
                this.scheduleOnce(() => {
                    if (progressBar && progressBar.isValid) {
                        progressBar.destroy();
                    }
                }, 0.3);
                
                // 隐藏刷子
                this.hideBrush();
                
                // 🔥 恢复所有 UI 元素的触摸检测
                this.enableAllUIElements();
                
                onComplete?.();
            }
        };
        
        input.on(Input.EventType.MOUSE_MOVE, onMouseMove, this);
        console.log('[BrushSauceController] 🌯 启动快速刷酱模式');
    }
}
